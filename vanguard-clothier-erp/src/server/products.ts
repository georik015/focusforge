import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from './auth';

const router = Router();

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

router.get('/categories', authenticate, async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.post('/categories', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Category name is required' });
  try {
    const category = await prisma.category.create({ data: { name: name.trim() } });
    res.status(201).json(category);
  } catch {
    res.status(400).json({ error: 'Category already exists' });
  }
});

// ─── BRANDS ──────────────────────────────────────────────────────────────────

router.get('/brands', authenticate, async (_req, res) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    res.json(brands);
  } catch {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

router.post('/brands', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { name, logoUrl, description, country } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Brand name is required' });
  try {
    const brand = await prisma.brand.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl?.trim() || null,
        description: description?.trim() || null,
        country: country?.trim() || null,
      },
    });
    res.status(201).json(brand);
  } catch {
    res.status(400).json({ error: 'Brand already exists' });
  }
});

router.put('/brands/:id', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { name, logoUrl, description, country, isActive } = req.body;
  try {
    const brand = await prisma.brand.update({
      where: { id: req.params.id },
      data: {
        name: name?.trim(),
        logoUrl: logoUrl !== undefined ? (logoUrl?.trim() || null) : undefined,
        description: description !== undefined ? (description?.trim() || null) : undefined,
        country: country !== undefined ? (country?.trim() || null) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });
    res.json(brand);
  } catch {
    res.status(400).json({ error: 'Failed to update brand' });
  }
});

router.delete('/brands/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res) => {
  try {
    await prisma.brand.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Failed to deactivate brand' });
  }
});

// ─── PRODUCTS ────────────────────────────────────────────────────────────────

router.get('/', authenticate, async (_req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true, brand: true, variations: true },
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch {
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

router.get('/variations', authenticate, async (_req, res) => {
  try {
    const variations = await prisma.productVariation.findMany({
      include: { product: { select: { name: true, category: true, brand: true } } },
      where: { product: { isActive: true } },
      orderBy: { sku: 'asc' },
    });
    res.json(variations);
  } catch {
    res.status(500).json({ error: 'Failed to fetch variants' });
  }
});

router.post('/', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { name, description, imageUrl, categoryId, brandId, gender, variations } = req.body;

  if (!name?.trim() || !categoryId || !brandId) {
    return res.status(400).json({ error: 'Name, categoryId and brandId are required' });
  }

  const validGenders = ['MALE', 'FEMALE', 'UNISEX', 'KIDS'];

  try {
    const product = await prisma.product.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl?.trim() || null,
        categoryId,
        brandId,
        gender: validGenders.includes(gender) ? gender : 'UNISEX',
        variations: variations?.length
          ? {
              create: variations.map((v: any) => ({
                sku: v.sku.trim().toUpperCase(),
                size: v.size.trim().toUpperCase(),
                color: v.color.trim(),
                purchasePrice: Number(v.purchasePrice),
                salePrice: Number(v.salePrice),
                stock: Number(v.stock) || 0,
                lowStockThreshold: Number(v.lowStockThreshold) || 5,
              })),
            }
          : undefined,
      },
      include: { category: true, brand: true, variations: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'PRODUCT_CREATED',
        details: `Created product: ${product.name} (${product.variations.length} variations)`,
      },
    });

    res.status(201).json(product);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: 'Failed to create product' });
  }
});

router.put('/:id', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { name, description, imageUrl, categoryId, brandId } = req.body;

  try {
    const product = await prisma.product.update({
      where: { id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        imageUrl: imageUrl !== undefined ? (imageUrl?.trim() || null) : undefined,
        categoryId,
        brandId,
      },
      include: { category: true, brand: true, variations: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'PRODUCT_UPDATED',
        details: `Updated product: ${product.name}`,
      },
    });

    res.json(product);
  } catch {
    res.status(400).json({ error: 'Failed to update product' });
  }
});

router.delete('/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'PRODUCT_DELETED',
        details: `Deactivated product ID: ${id}, name: ${product.name}`,
      },
    });

    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Failed to delete product' });
  }
});

// ─── VARIATIONS ──────────────────────────────────────────────────────────────

router.post('/:productId/variations', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { productId } = req.params;
  const { sku, size, color, purchasePrice, salePrice, stock, lowStockThreshold } = req.body;

  if (!sku || !size || !color) {
    return res.status(400).json({ error: 'SKU, size and color are required' });
  }

  try {
    const variation = await prisma.productVariation.create({
      data: {
        productId,
        sku: sku.trim().toUpperCase(),
        size: size.trim().toUpperCase(),
        color: color.trim(),
        purchasePrice: Number(purchasePrice),
        salePrice: Number(salePrice),
        stock: Number(stock) || 0,
        lowStockThreshold: Number(lowStockThreshold) || 5,
      },
    });
    res.status(201).json(variation);
  } catch (err: any) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'SKU already exists' });
    res.status(500).json({ error: 'Failed to create variation' });
  }
});

router.patch('/variation/:id', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  const { stock, reason, salePrice, purchasePrice, lowStockThreshold } = req.body;

  try {
    const data: any = {};
    if (stock !== undefined && Number(stock) >= 0) data.stock = Number(stock);
    if (salePrice !== undefined && Number(salePrice) >= 0 && !isNaN(Number(salePrice))) data.salePrice = Number(salePrice);
    if (purchasePrice !== undefined && Number(purchasePrice) >= 0 && !isNaN(Number(purchasePrice))) data.purchasePrice = Number(purchasePrice);
    if (lowStockThreshold !== undefined) data.lowStockThreshold = Number(lowStockThreshold);

    const variation = await prisma.productVariation.update({ where: { id }, data });

    await prisma.activityLog.create({
      data: {
        userId: req.user!.id,
        action: 'STOCK_ADJUSTMENT',
        details: `Adjusted variation ${variation.sku}. Reason: ${reason || 'Not specified'}`,
      },
    });

    res.json(variation);
  } catch {
    res.status(400).json({ error: 'Failed to update variation' });
  }
});

router.delete('/variation/:id', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res) => {
  const { id } = req.params;
  try {
    await prisma.productVariation.delete({ where: { id } });
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Failed to delete variation' });
  }
});

export default router;

