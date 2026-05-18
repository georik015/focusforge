import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize, AuthRequest } from './auth';

const router = Router();

async function getOrCreateConfig() {
  let config = await prisma.storeConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    config = await prisma.storeConfig.create({ data: { id: 'default' } });
  }
  return config;
}

router.get('/', authenticate, async (_req, res) => {
  try {
    res.json(await getOrCreateConfig());
  } catch {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Public endpoint — storefront and receipt need store name without auth
router.get('/public', async (_req, res) => {
  try {
    res.json(await getOrCreateConfig());
  } catch {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

router.patch('/', authenticate, authorize(['ADMIN']), async (req: AuthRequest, res) => {
  const { storeName, storeAddress, storePhone, storeEmail, currency, taxRate, city } = req.body;
  try {
    const config = await prisma.storeConfig.upsert({
      where: { id: 'default' },
      create: { id: 'default', storeName, storeAddress, storePhone, storeEmail, currency, taxRate, city },
      update: {
        ...(storeName !== undefined && { storeName }),
        ...(storeAddress !== undefined && { storeAddress }),
        ...(storePhone !== undefined && { storePhone }),
        ...(storeEmail !== undefined && { storeEmail }),
        ...(currency !== undefined && { currency }),
        ...(taxRate !== undefined && { taxRate: parseFloat(taxRate) || 0 }),
        ...(city !== undefined && { city }),
      },
    });
    res.json(config);
  } catch {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

export default router;
