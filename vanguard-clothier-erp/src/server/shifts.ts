import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from './auth';

const router = Router();

// Get all shifts (for Reports page)
router.get('/', authenticate, authorize(['ADMIN', 'SELLER', 'STOREKEEPER']), async (req: any, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { sales: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(shifts);
  } catch {
    res.status(500).json({ error: 'Не удалось загрузить смены' });
  }
});

// Get current open shift for user — MUST be before /:id/sales to avoid route conflict
router.get('/current', authenticate, async (req: any, res) => {
  try {
    const shift = await prisma.shift.findFirst({
      where: { userId: req.user.id, status: 'OPEN' }
    });
    res.json(shift);
  } catch {
    res.status(500).json({ error: 'Failed to fetch current shift' });
  }
});

// Get sales for a specific shift (for Z-report)
router.get('/:id/sales', authenticate, async (req: any, res) => {
  try {
    const sales = await prisma.sale.findMany({
      where: { shiftId: req.params.id },
      include: {
        items: { include: { variation: { include: { product: { select: { name: true } } } } } },
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(sales);
  } catch {
    res.status(500).json({ error: 'Не удалось загрузить продажи смены' });
  }
});

// Open new shift
router.post('/open', authenticate, async (req: any, res) => {
  const { openingBalance } = req.body;
  const balance = parseFloat(openingBalance ?? 0);
  if (isNaN(balance) || balance < 0) return res.status(400).json({ error: 'openingBalance должен быть неотрицательным числом' });
  try {
    // Check if user already has an open shift
    const existing = await prisma.shift.findFirst({
      where: { userId: req.user.id, status: 'OPEN' }
    });
    if (existing) return res.status(400).json({ error: 'Shift already open' });

    const shift = await prisma.shift.create({
      data: {
        userId: req.user.id,
        openingBalance: balance,
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

