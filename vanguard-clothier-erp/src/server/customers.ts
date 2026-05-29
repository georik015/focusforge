import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from './auth';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { totalSpent: 'desc' },
      take: 200,
      select: { id: true, name: true, email: true, phone: true, loyaltyPoints: true, totalSpent: true, createdAt: true, cardId: true },
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/search', authenticate, async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 2) return res.json([]);
  try {
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { phone: { contains: q } },
          { cardId: { contains: q } },
          { email: { contains: q } },
        ]
      },
      take: 8,
      orderBy: { totalSpent: 'desc' }
    });
    res.json(customers);
  } catch {
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { name, phone, email } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Имя клиента обязательно' });
  try {
    const customer = await prisma.customer.create({
      data: { name, phone, email }
    });
    res.status(201).json(customer);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create customer' });
  }
});

export default router;

