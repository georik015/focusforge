import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from './auth';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res) => {
  const { items, paymentType, customerId, discount } = req.body;
  const sellerId = req.user!.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Список товаров пуст' });
  }
  const validPaymentTypes = ['CASH', 'CARD'];
  if (!validPaymentTypes.includes(paymentType)) {
    return res.status(400).json({ error: 'Неверный тип оплаты' });
  }
  for (const item of items) {
    const qty = Number(item.quantity);
    const price = Number(item.priceAtSale);
    if (!item.variationId || typeof item.variationId !== 'string' ||
        !Number.isInteger(qty) || qty < 1 || isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Неверные данные позиции товара' });
    }
  }
  if (discount !== undefined && (isNaN(Number(discount)) || Number(discount) < 0)) {
    return res.status(400).json({ error: 'Неверная скидка' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let totalAmount = 0;
      const user = await tx.user.findUnique({ where: { id: sellerId } });
      const warehouseId = user?.warehouseId;

      if (!warehouseId) {
        throw new Error('Seller must be assigned to a warehouse to process sales');
      }

      // 1. Calculate total and check stock
      for (const item of items) {
        const variation = await tx.productVariation.findUnique({
          where: { id: item.variationId },
          include: { warehouseStock: { where: { warehouseId } } }
        });

        const currentStock = variation?.warehouseStock[0]?.quantity || 0;

        if (!variation || currentStock < item.quantity) {
          throw new Error(`Insufficient stock in current warehouse for SKU: ${variation?.sku || 'unknown'}`);
        }

        totalAmount += item.priceAtSale * item.quantity;

        // 2. Decrement Local Warehouse Stock
        await tx.warehouseStock.update({
          where: { warehouseId_variationId: { warehouseId, variationId: item.variationId } },
          data: { quantity: { decrement: item.quantity } }
        });

        // 3. Update Global Cache Stock
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stock: { decrement: item.quantity } }
        });

        // 4. Log Movement
        await tx.stockMovement.create({
          data: {
            variationId: item.variationId,
            fromWarehouseId: warehouseId,
            quantity: item.quantity,
            type: 'SALE',
            reason: `Order Sale`
          }
        });
      }

      const finalAmount = Math.max(0, totalAmount - (discount || 0));

      // 5. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          totalAmount: finalAmount,
          discount: discount || 0,
          paymentType,
          sellerId,
          customerId,
          shiftId: req.body.shiftId || null,
          items: {
            create: items.map((item: any) => ({
              variationId: item.variationId,
              quantity: item.quantity,
              priceAtSale: item.priceAtSale
            }))
          }
        },
        include: { items: true, customer: true }
      });

      // 6. Loyalty Points Logic
      if (customerId) {
        const pointsEarned = Math.floor(finalAmount);
        await tx.customer.update({
          where: { id: customerId },
          data: { 
            loyaltyPoints: { increment: pointsEarned },
            totalSpent: { increment: finalAmount }
          }
        });
      }

      // 7. Log activity
      await tx.activityLog.create({
        data: {
          userId: sellerId,
          action: 'SALE_COMPLETED',
          details: `Transaction #${sale.id} finalized at Terminal. Total: $${finalAmount}`
        }
      });

      return sale;
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Sale Transaction Error:', error);
    res.status(400).json({ error: error.message });
  }
});

// GET sales history — must be declared BEFORE /:id to avoid route conflict
router.get('/history', authenticate, async (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1')));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '50'))));
  try {
    const sales = await prisma.sale.findMany({
      include: {
        seller: { select: { name: true } },
        customer: { select: { name: true } },
        items: { include: { variation: { include: { product: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

// GET single sale (for return lookup)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: req.params.id },
      include: {
        seller: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
        items: {
          include: {
            variation: { include: { product: true } }
          }
        },
        returns: { include: { items: true } }
      }
    });
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch {
    res.status(500).json({ error: 'Failed to fetch sale' });
  }
});

// POST return
router.post('/returns', authenticate, async (req: AuthRequest, res) => {
  const { saleId, reason, items } = req.body as {
    saleId: string;
    reason?: string;
    items: { variationId: string; quantity: number; refundPrice: number }[];
  };

  if (!saleId || !items?.length) {
    return res.status(400).json({ error: 'saleId and items are required' });
  }

  try {
    const existingSale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        returns: { include: { items: true } },
      },
    });
    if (!existingSale) return res.status(404).json({ error: 'Продажа не найдена' });

    // Проверяем каждый товар в возврате
    for (const returnItem of items) {
      const saleItem = existingSale.items.find(si => si.variationId === returnItem.variationId);
      if (!saleItem) {
        return res.status(400).json({
          error: `Товар ${returnItem.variationId} не найден в данной продаже`,
        });
      }

      const alreadyReturned = existingSale.returns
        .flatMap(r => r.items)
        .filter(ri => ri.variationId === returnItem.variationId)
        .reduce((sum, ri) => sum + ri.quantity, 0);

      if (returnItem.quantity + alreadyReturned > saleItem.quantity) {
        return res.status(400).json({
          error: `Превышено количество для возврата: куплено ${saleItem.quantity}, уже возвращено ${alreadyReturned}, запрошено ${returnItem.quantity}`,
        });
      }

      if (returnItem.quantity <= 0) {
        return res.status(400).json({ error: 'Количество возврата должно быть больше 0' });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const totalRefund = items.reduce((sum, i) => sum + i.quantity * i.refundPrice, 0);

      const ret = await tx.return.create({
        data: {
          saleId,
          reason,
          totalRefund,
          items: {
            create: items.map((i) => ({
              variationId: i.variationId,
              quantity: i.quantity,
              refundPrice: i.refundPrice,
            })),
          },
        },
        include: { items: true }
      });

      // Find cashier's warehouse for stock restore
      const cashier = await tx.user.findUnique({
        where: { id: req.user!.id },
        select: { warehouseId: true },
      });
      const warehouseId = cashier?.warehouseId ?? null;

      // Restore stock for each returned item
      for (const item of items) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stock: { increment: item.quantity } },
        });

        if (warehouseId) {
          await tx.warehouseStock.upsert({
            where: { warehouseId_variationId: { warehouseId, variationId: item.variationId } },
            update: { quantity: { increment: item.quantity } },
            create: { warehouseId, variationId: item.variationId, quantity: item.quantity },
          });
        }

        await tx.stockMovement.create({
          data: {
            variationId: item.variationId,
            toWarehouseId: warehouseId ?? undefined,
            quantity: item.quantity,
            type: 'RETURN',
            reason: `Возврат по чеку #${saleId.slice(-6).toUpperCase()}`,
          },
        });
      }

      await tx.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'RETURN_PROCESSED',
          details: `Возврат по чеку #${saleId.slice(-6).toUpperCase()}, сумма ₽${totalRefund}`,
        },
      });

      return ret;
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error('Return error:', err);
    res.status(500).json({ error: 'Failed to process return' });
  }
});

export default router;

