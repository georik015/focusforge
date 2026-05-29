import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from './auth';
import { sendOrderStatusUpdate } from './email';

const router = Router();

router.get('/stats', authenticate, authorize(['ADMIN', 'SELLER', 'STOREKEEPER']), async (_req, res) => {
  try {
    const statuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    const counts = await Promise.all(
      statuses.map(s => prisma.storefrontOrder.count({ where: { status: s } }))
    );
    const result: Record<string, number> = { ALL: 0 };
    statuses.forEach((s, i) => {
      result[s] = counts[i];
      result.ALL += counts[i];
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticate, authorize(['ADMIN', 'SELLER', 'STOREKEEPER']), async (req, res) => {
  try {
    const { status, page = '1', limit = '30' } = req.query;
    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') where.status = String(status);

    const take = Math.min(100, Math.max(1, parseInt(String(limit)) || 30));
    const skip = (Math.max(1, parseInt(String(page)) || 1) - 1) * take;

    const [orders, total] = await Promise.all([
      prisma.storefrontOrder.findMany({
        where,
        include: {
          customer: { select: { name: true, phone: true } },
          items: {
            include: {
              variation: {
                include: { product: { select: { name: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.storefrontOrder.count({ where }),
    ]);

    res.json({ orders, total, page: parseInt(String(page)), limit: take });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticate, authorize(['ADMIN', 'SELLER', 'STOREKEEPER']), async (req, res) => {
  try {
    const order = await prisma.storefrontOrder.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        items: {
          include: {
            variation: {
              include: { product: { include: { category: true, brand: true } } },
            },
          },
        },
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', authenticate, authorize(['ADMIN', 'SELLER', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { status } = req.body;
  const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус' });
  }

  try {
    const order = await prisma.storefrontOrder.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const updated = await prisma.storefrontOrder.update({
      where: { id: req.params.id },
      data: { status },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'ORDER_STATUS_UPDATED',
        details: `Заказ #${req.params.id.slice(-8).toUpperCase()}: ${order.status} → ${status}`,
      },
    });

    // Fire-and-forget email to customer
    sendOrderStatusUpdate({
      id: updated.id,
      guestEmail: updated.guestEmail,
      guestName: updated.guestName,
      status: updated.status,
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/cancel', authenticate, authorize(['ADMIN', 'SELLER', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  try {
    const order = await prisma.storefrontOrder.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { variation: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'CANCELLED') return res.status(400).json({ error: 'Заказ уже отменён' });
    if (order.status === 'DELIVERED') return res.status(400).json({ error: 'Нельзя отменить доставленный заказ' });

    await prisma.$transaction(async (tx) => {
      await tx.storefrontOrder.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });

      // Восстанавливаем сток только если заказ был подтверждён (CONFIRMED/SHIPPED)
      if (order.status === 'CONFIRMED' || order.status === 'SHIPPED') {
        const mainWarehouse = await tx.warehouse.findFirst({ where: { isMain: true } });
        for (const item of order.items) {
          await tx.productVariation.update({
            where: { id: item.variationId },
            data: { stock: { increment: item.quantity } },
          });
          if (mainWarehouse) {
            await tx.warehouseStock.upsert({
              where: { warehouseId_variationId: { warehouseId: mainWarehouse.id, variationId: item.variationId } },
              update: { quantity: { increment: item.quantity } },
              create: { warehouseId: mainWarehouse.id, variationId: item.variationId, quantity: item.quantity },
            });
          }
          await tx.stockMovement.create({
            data: {
              variationId: item.variationId,
              toWarehouseId: mainWarehouse?.id,
              quantity: item.quantity,
              type: 'RETURN',
              reason: `Отмена онлайн-заказа #${order.id.slice(-8).toUpperCase()}`,
            },
          });
        }
      }

      await tx.activityLog.create({
        data: {
          userId: req.user!.id,
          action: 'ORDER_CANCELLED',
          details: `Заказ #${req.params.id.slice(-8).toUpperCase()} отменён`,
        },
      });
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
