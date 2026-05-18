import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from './auth';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res) => {
  const { items, paymentType, customerId, discount } = req.body;
  const sellerId = req.user!.id;

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

      // Restore stock for each returned item
      for (const item of items) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stock: { increment: item.quantity } },
        });
        await tx.stockMovement.create({
          data: {
            variationId: item.variationId,
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

router.get('/history', authenticate, async (_req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      include: {
        seller: { select: { name: true } },
        customer: { select: { name: true } },
        items: { include: { variation: { include: { product: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(sales);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales history' });
  }
});

export default router;

