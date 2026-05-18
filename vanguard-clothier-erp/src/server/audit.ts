import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from './auth';

const router = express.Router();

// Get all audit logs (Admin only)
router.get('/', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

export default router;

