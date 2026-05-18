import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from './auth';

const router = Router();

router.get('/dashboard', authenticate, async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const [totalRevenue, lowStockItems, recentActivity, salesData, dailyStats, supplyCount, warehouseStock] = await Promise.all([
      prisma.sale.aggregate({ _sum: { totalAmount: true } }),
      prisma.productVariation.findMany({
        where: { stock: { lte: 5 } },
        include: { product: true },
        take: 10
      }),
      prisma.activityLog.findMany({
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 12
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true, totalAmount: true }
      }),
      prisma.sale.aggregate({
        where: { createdAt: { gte: today } },
        _count: { id: true },
        _sum: { totalAmount: true }
      }),
      prisma.supply.count(),
      prisma.productVariation.aggregate({
        _sum: { stock: true },
        _count: { id: true }
      })
    ]);

    // Aggregate sales by day for chart
    const salesByDay = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i + 1);
      const dateStr = date.toISOString().split('T')[0];
      const daySales = salesData
        .filter(s => s.createdAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum, s) => sum + s.totalAmount, 0);
      
      return { date: dateStr, amount: daySales };
    });

    const totalStock = warehouseStock._sum.stock ?? 0;
    const totalSkus = warehouseStock._count.id ?? 0;

    res.json({
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      dailyRevenue: dailyStats._sum.totalAmount || 0,
      dailySalesCount: dailyStats._count.id || 0,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      recentActivity: recentActivity.map(log => ({
        ...log,
        details: log.details || 'System operation executed'
      })),
      salesByDay,
      supplyCount,
      totalStock,
      totalSkus,
    });
  } catch (error) {
    console.error('ANALYTICS_SRV_ERROR:', error);
    res.status(500).json({ error: 'Failed to generate operational analytics' });
  }
});

router.get('/reports', authenticate, async (_req, res) => {
  try {
    const [totalRevenue, totalSales, totalCustomers, topSKUs] = await Promise.all([
      prisma.sale.aggregate({ _sum: { totalAmount: true } }),
      prisma.sale.count(),
      prisma.customer.count(),
      prisma.saleItem.groupBy({
        by: ['variationId'],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      })
    ]);

    const enrichedTopSKUs = await Promise.all(topSKUs.map(async (item) => {
      const variation = await prisma.productVariation.findUnique({
        where: { id: item.variationId },
        include: { product: true }
      });
      return {
        sku: variation?.sku,
        name: variation?.product.name,
        quantity: item._sum.quantity
      };
    }));

    res.json({
      revenue: totalRevenue._sum.totalAmount || 0,
      salesCount: totalSales,
      customerCount: totalCustomers,
      avgTicket: totalSales > 0 ? (totalRevenue._sum.totalAmount || 0) / totalSales : 0,
      topSKUs: enrichedTopSKUs
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report intelligence' });
  }
});

export default router;

