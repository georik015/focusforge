import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from './auth';

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
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticate, authorize(['ADMIN', 'SELLER', 'STOREKEEPER']), async (req, res) => {
  try {
    const { status, page = '1', limit = '30' } = req.query;
    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') where.status = String(status);

    const take = parseInt(String(limit));
    const skip = (parseInt(String(page)) - 1) * take;

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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
