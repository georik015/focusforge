import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { rateLimit } from 'express-rate-limit';

// Import modules
import authRoutes from "./src/server/auth_routes";
import productRoutes from "./src/server/products";
import salesRoutes from "./src/server/sales";
import analyticsRoutes from "./src/server/analytics";
import customerRoutes from "./src/server/customers";
import warehouseRoutes from "./src/server/warehouses";
import shiftRoutes from "./src/server/shifts";
import financeRoutes from "./src/server/finances";
import intelligenceRoutes from "./src/server/intelligence";
import auditRoutes from "./src/server/audit";
import userRoutes from "./src/server/users";
import supplyRoutes from "./src/server/supplies";
import publicRoutes from "./src/server/public";
import configRoutes from "./src/server/config";
import adminRoutes from "./src/server/admin";
import orderRoutes from "./src/server/orders";

import { prisma } from "./src/lib/prisma";

dotenv.config();

// Rate Limiting Policy
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
	standardHeaders: 'draft-7', // bpr: Draft-6: `RateLimit-*` headers; Draft-7: combined `RateLimit` header
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	limit: 10, // Limit each IP to 10 login attempts per hour.
	standardHeaders: 'draft-7',
	legacyHeaders: false,
  message: { error: 'Too many login attempts. Account protection active.' }
});

import { seedProductionData } from "./src/server/seed_data";

async function seed() {
  try {
    const adminExists = await prisma.user.findUnique({ where: { email: 'admin@vanguard.com' } });
    if (adminExists) {
      console.log('✅ System already initialized. Skipping seed.');
      return;
    }

    console.log('🌱 Seeding production-ready data...');
    await seedProductionData();
    console.log('🏁 Professional Seeding Complete.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  }
}

async function startServer() {
  await seed();
  const app = express();
  app.use(express.json());
  
  // Apply global rate limiting
  app.use('/api/', limiter);

  // API Routes
  app.use('/api/products', productRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/warehouses', warehouseRoutes);
  app.use('/api/shifts', shiftRoutes);
  app.use('/api/finance', financeRoutes);
  app.use('/api/intelligence', intelligenceRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/supplies', supplyRoutes);

  // Public storefront routes (no auth required)
  app.use('/api/public', publicRoutes);

  // Auth routes (login, register, invite, forgot/reset password)
  app.use('/api/auth', authLimiter, authRoutes);

  // Store config and admin tools
  app.use('/api/config', configRoutes);
  app.use('/api/admin', adminRoutes);

  // Storefront orders management
  app.use('/api/orders', orderRoutes);

  // Health Check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'operational', timestamp: new Date(), version: '1.0.0-PROD' });
  });

  // Global Error Handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('SERVER_ERROR:', err);
    res.status(500).json({ error: 'Enterprise system failure. Please contact administrator.' });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(3000, "0.0.0.0", () => {
    console.log(`🚀 Production Server Ready at http://0.0.0.0:3000`);
  });
}

startServer();
