import { Router, Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'vanguard-dev-secret-2026';

// ── Helpers ──────────────────────────────────────────────────────────────────

function enrichProduct(p: any, i: number) {
  return {
    ...p,
    discount: [0, 0, 15, 20, 0, 25, 0, 30, 0, 0, 20, 0, 15, 0, 40, 0, 25, 0, 35, 0, 10, 0, 0, 20, 0, 15, 30, 0, 25, 0][i % 30],
    rating: parseFloat((3.8 + Math.round((Math.sin(i * 7.3) + 1) * 6) / 10).toFixed(1)),
    reviewCount: 12 + Math.floor(Math.abs(Math.sin(i * 3.7)) * 340),
  };
}

function authenticateCustomer(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    if (payload.type !== 'CUSTOMER') return null;
    return payload.sub;
  } catch {
    return null;
  }
}

// ── Public Products ───────────────────────────────────────────────────────────

router.get('/products', async (req, res) => {
  try {
    const { category, brand, search, sort, inStock, gender } = req.query;
    const where: any = { isActive: true };

    if (gender && gender !== 'ALL') where.gender = String(gender);
    if (category) where.category = { name: { contains: String(category) } };
    if (brand) where.brand = { name: { contains: String(brand) } };
    if (search) {
      where.OR = [
        { name: { contains: String(search) } },
        { description: { contains: String(search) } },
        { brand: { name: { contains: String(search) } } },
        { category: { name: { contains: String(search) } } },
      ];
    }
    if (inStock === 'true') {
      where.variations = { some: { stock: { gt: 0 } } };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        brand: true,
        variations: {
          select: { id: true, sku: true, size: true, color: true, salePrice: true, stock: true, lowStockThreshold: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    type P = typeof products[0];
    let sorted = products;
    if (sort === 'price_asc') {
      sorted = products.sort((a: P, b: P) =>
        Math.min(...a.variations.map((v) => v.salePrice)) - Math.min(...b.variations.map((v) => v.salePrice))
      );
    } else if (sort === 'price_desc') {
      sorted = products.sort((a: P, b: P) =>
        Math.min(...b.variations.map((v) => v.salePrice)) - Math.min(...a.variations.map((v) => v.salePrice))
      );
    } else if (sort === 'name') {
      sorted = products.sort((a: P, b: P) => a.name.localeCompare(b.name, 'ru'));
    }

    res.json(sorted.map((p: P, i: number) => enrichProduct(p, i)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Single product by ID
router.get('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id, isActive: true },
      include: { category: true, brand: true, variations: true },
    });
    if (!product) return res.status(404).json({ error: 'Not found' });

    // Find index for consistent enrichment
    const all = await prisma.product.findMany({ where: { isActive: true }, select: { id: true }, orderBy: { createdAt: 'desc' } });
    const idx = all.findIndex((p: { id: string }) => p.id === product.id);

    res.json(enrichProduct(product, idx >= 0 ? idx : 0));
  } catch {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Find product by SKU (for barcode scanner)
router.get('/sku/:sku', async (req, res) => {
  try {
    const variation = await prisma.productVariation.findUnique({
      where: { sku: req.params.sku.toUpperCase() },
      include: {
        product: {
          include: { category: true, brand: true, variations: true },
        },
      },
    });
    if (!variation || !variation.product.isActive) return res.status(404).json({ error: 'Not found' });

    const all = await prisma.product.findMany({ where: { isActive: true }, select: { id: true }, orderBy: { createdAt: 'desc' } });
    const idx = all.findIndex(p => p.id === variation.product.id);

    res.json({ product: enrichProduct(variation.product, idx >= 0 ? idx : 0), variation });
  } catch {
    res.status(500).json({ error: 'Failed to fetch by SKU' });
  }
});

// Categories and brands
router.get('/categories', async (_req, res) => {
  try {
    const cats = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    res.json(cats);
  } catch {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

router.get('/brands', async (_req, res) => {
  try {
    const brands = await prisma.brand.findMany({ orderBy: { name: 'asc' } });
    res.json(brands);
  } catch {
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

// ── Customer Auth ─────────────────────────────────────────────────────────────

// Register (no invite needed — anyone can register as customer)
router.post('/auth/register', async (req, res) => {
  const { name, email, phone, password } = req.body;

  if (!name?.trim()) return res.status(400).json({ error: 'Имя обязательно' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  if (!email?.trim() && !phone?.trim()) return res.status(400).json({ error: 'Укажите email или телефон' });

  try {
    const existingEmail = email ? await prisma.customer.findUnique({ where: { email: email.trim().toLowerCase() } }) : null;
    if (existingEmail) return res.status(400).json({ error: 'Email уже зарегистрирован' });

    const existingPhone = phone ? await prisma.customer.findUnique({ where: { phone: phone.trim() } }) : null;
    if (existingPhone) return res.status(400).json({ error: 'Телефон уже зарегистрирован' });

    const passwordHash = await bcrypt.hash(password, 10);

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        email: email?.trim().toLowerCase() || null,
        phone: phone?.trim() || null,
        passwordHash,
        emailVerified: false,
      },
    });

    const token = jwt.sign({ sub: customer.id, type: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints },
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

// Login
router.post('/auth/login', async (req, res) => {
  const { email, phone, password } = req.body;

  if (!password) return res.status(400).json({ error: 'Пароль обязателен' });
  if (!email && !phone) return res.status(400).json({ error: 'Укажите email или телефон' });

  try {
    const customer = email
      ? await prisma.customer.findUnique({ where: { email: email.trim().toLowerCase() } })
      : await prisma.customer.findUnique({ where: { phone: phone.trim() } });

    if (!customer || !customer.passwordHash) {
      return res.status(401).json({ error: 'Неверные данные' });
    }

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Неверный пароль' });

    const token = jwt.sign({ sub: customer.id, type: 'CUSTOMER' }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      customer: { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone, loyaltyPoints: customer.loyaltyPoints },
    });
  } catch {
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// Get current customer
router.get('/auth/me', async (req, res) => {
  const customerId = authenticateCustomer(req);
  if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, email: true, phone: true, loyaltyPoints: true, emailVerified: true, totalSpent: true },
    });
    if (!customer) return res.status(404).json({ error: 'Not found' });
    res.json(customer);
  } catch {
    res.status(500).json({ error: 'Failed' });
  }
});

// ── Customer Orders ───────────────────────────────────────────────────────────

router.get('/my-orders', async (req, res) => {
  const customerId = authenticateCustomer(req);
  if (!customerId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const orders = await prisma.storefrontOrder.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            variation: {
              include: { product: { select: { name: true, imageUrl: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders);
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// ── Checkout / Orders ─────────────────────────────────────────────────────────

router.post('/orders', async (req, res) => {
  const {
    items, // [{variationId, quantity, price}]
    name, email, phone, address, city,
    paymentType, comment,
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Корзина пуста' });
  if (!name?.trim()) return res.status(400).json({ error: 'Укажите имя' });
  if (!phone?.trim() && !email?.trim()) return res.status(400).json({ error: 'Укажите контакт' });
  if (!address?.trim()) return res.status(400).json({ error: 'Укажите адрес доставки' });

  for (const item of items) {
    const qty = Number(item.quantity);
    if (!item.variationId || typeof item.variationId !== 'string' || item.variationId.trim().length === 0) {
      return res.status(400).json({ error: 'Неверные данные товара' });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      return res.status(400).json({ error: 'Неверное количество товара' });
    }
  }

  const customerId = authenticateCustomer(req);

  try {
    // Fetch actual prices from DB — never trust client-provided price
    const variationIds = items.map((i: any) => String(i.variationId));
    const variations = await prisma.productVariation.findMany({
      where: { id: { in: variationIds }, product: { isActive: true } },
      select: { id: true, salePrice: true, stock: true },
    });
    if (variations.length !== variationIds.length) {
      return res.status(400).json({ error: 'Один или несколько товаров недоступны' });
    }
    const varMap = new Map(variations.map(v => [v.id, v]));

    for (const item of items) {
      const v = varMap.get(item.variationId)!;
      if (v.stock < Number(item.quantity)) {
        return res.status(400).json({ error: 'Недостаточно товара на складе' });
      }
    }

    const total = items.reduce((sum: number, item: any) => {
      return sum + varMap.get(item.variationId)!.salePrice * Number(item.quantity);
    }, 0);

    const order = await prisma.storefrontOrder.create({
      data: {
        customerId: customerId || null,
        guestName: name.trim(),
        guestEmail: email?.trim() || null,
        guestPhone: phone?.trim() || null,
        address: address.trim(),
        city: city || 'Москва',
        paymentType: paymentType || 'CARD',
        comment: comment?.trim() || null,
        total,
        items: {
          create: items.map((item: any) => ({
            variationId: item.variationId,
            quantity: Number(item.quantity),
            priceAtSale: varMap.get(item.variationId)!.salePrice,
          })),
        },
      },
      include: { items: true },
    });

    // Update loyalty points if registered customer
    if (customerId) {
      const points = Math.floor(total / 10);
      await prisma.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: { increment: points }, totalSpent: { increment: total } },
      });
    }

    res.status(201).json({ orderId: order.id, total: order.total, status: order.status });
  } catch (err: any) {
    console.error('ORDER_CREATE_ERROR:', err?.message || err);
    const isInvalidRef = err?.message?.includes('foreign key') || err?.message?.includes('Unique constraint') || err?.code === 'P2003';
    res.status(500).json({
      error: isInvalidRef
        ? 'Один или несколько товаров больше недоступны. Обновите корзину и попробуйте снова.'
        : 'Ошибка оформления заказа'
    });
  }
});

export default router;
