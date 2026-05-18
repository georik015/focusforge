import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from './auth';

const router = Router();

// Get current open shift for user
router.get('/current', authenticate, async (req: any, res) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: {
        userId: req.user.id,
        status: 'OPEN'
      }
    });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch current shift' });
  }
});

// Open new shift
router.post('/open', authenticate, async (req: any, res) => {
  const { openingBalance } = req.body;
  try {
    // Check if user already has an open shift
    const existing = await prisma.shift.findFirst({
      where: { userId: req.user.id, status: 'OPEN' }
    });
    if (existing) return res.status(400).json({ error: 'Shift already open' });

    const shift = await prisma.shift.create({
      data: {
        userId: req.user.id,
        openingBalance,
        status: 'OPEN'
      }
    });
    res.json(shift);
  } catch (error) {
    res.status(400).json({ error: 'Failed to open shift' });
  }
});

// Close shift (Z-Report Generation)
router.post('/close', authenticate, async (req: any, res) => {
  const { closingBalance, notes } = req.body;
  try {
    const shift = await prisma.shift.findFirst({
      where: { userId: req.user.id, status: 'OPEN' },
      include: { sales: true }
    });

    if (!shift) return res.status(404).json({ error: 'No open shift found' });

    const totalSales = shift.sales.reduce((acc, sale) => acc + sale.totalAmount, 0);
    const expectedBalance = shift.openingBalance + totalSales;

    const closedShift = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closingBalance,
        expectedBalance,
        notes
      }
    });

    res.json(closedShift);
  } catch (error) {
    res.status(400).json({ error: 'Failed to close shift' });
  }
});

export default router;

