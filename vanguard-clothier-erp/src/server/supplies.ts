import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from './auth';
import { logActivity } from './logger';

const router = Router();

// ── Suppliers ──────────────────────────────────────────────────────────────

router.get('/suppliers', authenticate, async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { supplies: true } } },
    });
    res.json(suppliers);
  } catch {
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

router.post('/suppliers', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: any, res) => {
  const { name, contact, email, address } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Supplier name is required' });
  try {
    const supplier = await prisma.supplier.create({
      data: { name: name.trim(), contact, email, address },
    });
    await logActivity(req.user.id, 'CREATE_SUPPLIER', { name });
    res.status(201).json(supplier);
  } catch {
    res.status(400).json({ error: 'Supplier with this name already exists' });
  }
});

// ── Supplies ───────────────────────────────────────────────────────────────

router.get('/', authenticate, async (_req, res) => {
  try {
    const supplies = await prisma.supply.findMany({
      include: {
        supplier: true,
        items: {
          include: {
            variation: { include: { product: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(supplies);
  } catch {
    res.status(500).json({ error: 'Failed to fetch supplies' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const supply = await prisma.supply.findUnique({
      where: { id: req.params.id },
      include: {
        supplier: true,
        items: {
          include: {
            variation: { include: { product: true } },
          },
        },
      },
    });
    if (!supply) return res.status(404).json({ error: 'Supply not found' });
    res.json(supply);
  } catch {
    res.status(500).json({ error: 'Failed to fetch supply' });
  }
});

// POST /supplies — create supply, update stock, write stock movements
router.post('/', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: any, res) => {
  const { supplierId, items } = req.body as {
    supplierId: string;
    items: { variationId: string; quantity: number; costPrice: number }[];
  };

  if (!supplierId) return res.status(400).json({ error: 'Supplier is required' });
  if (!items?.length) return res.status(400).json({ error: 'Supply must have at least one item' });

  for (const item of items) {
    if (!item.variationId) return res.status(400).json({ error: 'variationId is required for each item' });
    if (item.quantity <= 0) return res.status(400).json({ error: 'Quantity must be positive' });
    if (item.costPrice < 0) return res.status(400).json({ error: 'Cost price cannot be negative' });
  }

  try {
    const totalCost = items.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);

    const supply = await prisma.$transaction(async (tx) => {
      // 1. Create supply record
      const newSupply = await tx.supply.create({
        data: {
          supplierId,
          totalCost,
          items: {
            create: items.map((i) => ({
              variationId: i.variationId,
              quantity: i.quantity,
              costPrice: i.costPrice,
            })),
          },
        },
        include: {
          supplier: true,
          items: { include: { variation: { include: { product: true } } } },
        },
      });

      // 2. Update stock + create stock movement per item
      for (const item of items) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stock: { increment: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            variationId: item.variationId,
            quantity: item.quantity,
            type: 'SUPPLY',
            reason: `Поставка #${newSupply.id.slice(-6).toUpperCase()} от ${newSupply.supplier.name}`,
          },
        });
      }

      return newSupply;
    });

    await logActivity(req.user.id, 'CREATE_SUPPLY', {
      supplierId,
      totalCost,
      itemCount: items.length,
    });

    res.status(201).json(supply);
  } catch (err) {
    console.error('Supply creation failed:', err);
    res.status(500).json({ error: 'Failed to create supply' });
  }
});

export default router;

