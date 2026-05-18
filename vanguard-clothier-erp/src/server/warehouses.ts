import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from './auth';

const router = Router();

router.get('/', authenticate, async (_req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      include: {
        _count: {
          select: { users: true, stock: true }
        }
      }
    });
    res.json(warehouses);
  } catch (error) {
    res.status(500).json({ error: 'Warehouse fetch failed' });
  }
});

router.post('/', authenticate, authorize(['ADMIN']), async (req, res) => {
  const { name, location, isMain } = req.body;
  try {
    const warehouse = await prisma.warehouse.create({
      data: { name, location, isMain: isMain || false }
    });
    res.status(201).json(warehouse);
  } catch (error) {
    res.status(400).json({ error: 'Creation failed' });
  }
});

// GET stock for a specific warehouse
router.get('/:id/stock', authenticate, async (req, res) => {
  try {
    const stock = await prisma.warehouseStock.findMany({
      where: { warehouseId: req.params.id },
      include: {
        variation: {
          include: { product: { include: { category: true, brand: true } } },
        },
      },
      orderBy: { quantity: 'desc' },
    });
    res.json(stock);
  } catch {
    res.status(500).json({ error: 'Failed to fetch warehouse stock' });
  }
});

// POST transfer stock between warehouses
router.post('/transfer', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: any, res) => {
  const { fromWarehouseId, toWarehouseId, variationId, quantity } = req.body;
  if (!fromWarehouseId || !toWarehouseId || !variationId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid transfer parameters' });
  }
  if (fromWarehouseId === toWarehouseId) {
    return res.status(400).json({ error: 'Source and destination must differ' });
  }
  try {
    await prisma.$transaction(async (tx) => {
      const fromStock = await tx.warehouseStock.findUnique({
        where: { warehouseId_variationId: { warehouseId: fromWarehouseId, variationId } },
      });
      if (!fromStock || fromStock.quantity < quantity) {
        throw new Error('Insufficient stock in source warehouse');
      }
      // Decrement source
      await tx.warehouseStock.update({
        where: { warehouseId_variationId: { warehouseId: fromWarehouseId, variationId } },
        data: { quantity: { decrement: quantity } },
      });
      // Increment or create destination
      await tx.warehouseStock.upsert({
        where: { warehouseId_variationId: { warehouseId: toWarehouseId, variationId } },
        update: { quantity: { increment: quantity } },
        create: { warehouseId: toWarehouseId, variationId, quantity },
      });
      // Log movement
      await tx.stockMovement.create({
        data: { variationId, fromWarehouseId, toWarehouseId, quantity, type: 'TRANSFER' },
      });
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Transfer failed' });
  }
});

router.get('/movements', authenticate, async (_req, res) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      include: {
        variation: {
          include: { product: true }
        },
        fromWarehouse: true,
        toWarehouse: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Movement logs fetch failed' });
  }
});

export default router;

