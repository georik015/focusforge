import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from './auth';
import { calcTotal, calcLoyaltyPoints, checkStock } from '../lib/business-logic.js';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res) => {
  const { items, paymentType, customerId, discount } = req.body;
  const sellerId = req.user!.id;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Список товаров пуст' });
  }
  const validPaymentTypes = ['CASH', 'CARD', 'LOYALTY'];
  if (!validPaymentTypes.includes(paymentType)) {
    return res.status(400).json({ error: 'Неверный тип оплаты' });
  }
  if (paymentType === 'LOYALTY' && !req.body.customerId) {
    return res.status(400).json({ error: 'Для оплаты баллами необходимо выбрать клиента' });
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
      const verifiedPrices = new Map<string, number>();
      const user = await tx.user.findUnique({ where: { id: sellerId } });
      const warehouseId = user?.warehouseId;

      if (!warehouseId) {
        throw new Error('Seller must be assigned to a warehouse to process sales');
      }

      // 1. Verify stock and collect prices from DB (client prices are ignored)
      for (const item of items) {
        const variation = await tx.productVariation.findUnique({
          where: { id: item.variationId },
          include: { warehouseStock: { where: { warehouseId } } }
        });

        if (!variation) {
          throw new Error(`SKU not found: ${item.variationId}`);
        }

        const currentStock = variation.warehouseStock[0]?.quantity ?? 0;
        checkStock(currentStock, item.quantity); // throws if insufficient

        verifiedPrices.set(item.variationId, variation.salePrice);

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

      // 2. Calculate total from verified DB prices (not client-submitted prices)
      const totalAmount = calcTotal(items, verifiedPrices);
      const discountAmount = discount || 0; // absolute ₽ amount, not percent
      if (discountAmount > totalAmount) {
        throw new Error(`Скидка (${discountAmount}₽) превышает сумму чека (${totalAmount}₽)`);
      }
      const finalAmount = totalAmount - discountAmount;

      // 5. Create Sale Record
      const sale = await tx.sale.create({
        data: {
          totalAmount: finalAmount,
          discount: discountAmount,
          paymentType,
          sellerId,
          customerId,
          shiftId: req.body.shiftId || null,
          items: {
            create: items.map((item: any) => ({
              variationId: item.variationId,
              quantity: item.quantity,
              priceAtSale: verifiedPrices.get(item.variationId) ?? item.priceAtSale
            }))
          }
        },
        include: { items: true, customer: true }
      });

      // 6. Loyalty Points Logic
      if (paymentType === 'LOYALTY') {
        // Pay entirely with loyalty points (1 point = 1 ₽)
        const pointsNeeded = Math.ceil(finalAmount);
        const cust = await tx.customer.findUnique({ where: { id: customerId! }, select: { loyaltyPoints: true } });
        if (!cust || cust.loyaltyPoints < pointsNeeded) {
          throw new Error(`Недостаточно баллов: нужно ${pointsNeeded}, доступно ${cust?.loyaltyPoints ?? 0}`);
        }
        await tx.customer.update({
          where: { id: customerId! },
          data: {
            loyaltyPoints: { decrement: pointsNeeded },
            totalSpent: { increment: finalAmount },
          },
        });
      } else if (customerId) {
        // Regular payment — earn 1 point per 10₽ (consistent with online storefront)
        const pointsEarned = calcLoyaltyPoints(finalAmount);
        await tx.customer.update({
          where: { id: customerId },
          data: {
            loyaltyPoints: { increment: pointsEarned },
            totalSpent: { increment: finalAmount },
          },
        });
      }

      // 7. Log activity
      await tx.activityLog.create({
        data: {
          userId: sellerId,
          action: 'SALE_COMPLETED',
          details: `Продажа #${sale.id.slice(-6).toUpperCase()} завершена. Сумма: ₽${finalAmount}`
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

// POST return — declared BEFORE /:id to avoid route conflict
router.post('/returns', authenticate, async (req: AuthRequest, res) => {
  const { saleId, reason, items } = req.body as {
    saleId: string;
    reason?: string;
    items: { variationId: string; quantity: number }[];
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
      // Цена берётся из оригинальной продажи (не от клиента) — защита от подмены цены
      const totalRefund = items.reduce((sum, i) => {
        const saleItem = existingSale.items.find(si => si.variationId === i.variationId)!;
        return sum + i.quantity * saleItem.priceAtSale;
      }, 0);

      // Load sale to get customerId for loyalty adjustment
      const sale = await tx.sale.findUnique({ where: { id: saleId }, select: { customerId: true, totalAmount: true } });

      const ret = await tx.return.create({
        data: {
          saleId,
          reason,
          totalRefund,
          items: {
            create: items.map((i) => {
              const saleItem = existingSale.items.find(si => si.variationId === i.variationId)!;
              return {
                variationId: i.variationId,
                quantity: i.quantity,
                refundPrice: saleItem.priceAtSale, // цена из оригинальной продажи
              };
            }),
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

      // Deduct loyalty points proportionally if sale had a customer (1 point per 10₽)
      if (sale?.customerId) {
        const pointsToDeduct = Math.floor(totalRefund / 10);
        if (pointsToDeduct > 0) {
          const customer = await tx.customer.findUnique({ where: { id: sale.customerId }, select: { loyaltyPoints: true } });
          const safeDeduct = Math.min(pointsToDeduct, customer?.loyaltyPoints ?? 0);
          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              loyaltyPoints: { decrement: safeDeduct },
              totalSpent: { decrement: totalRefund },
            },
          });
        }
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

// GET single sale — declared AFTER /returns and /history to avoid route conflicts
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

export default router;

