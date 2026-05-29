import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from './auth';

const router = express.Router();

router.get('/forecast', authenticate, async (req: any, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'AI-модуль не настроен',
      hint: 'Добавьте GEMINI_API_KEY в файл .env для активации прогноза спроса',
    });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const [sales, stock] = await Promise.all([
      prisma.sale.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { variation: { include: { product: true } } } } },
      }),
      prisma.productVariation.findMany({
        include: { product: true },
        where: { stock: { lt: 10 } },
      }),
    ]);

    const salesContext = sales.map(s => ({
      date: s.createdAt,
      total: s.totalAmount,
      items: s.items.map(i => i.variation.product.name),
    }));

    const stockContext = stock.map(s => ({
      name: s.product.name,
      sku: s.sku,
      currentStock: s.stock,
    }));

    const prompt = `
      You are a high-level Retail Intelligence AI for "Vanguard Clothier".
      Analyze these recent sales and low stock items to provide:
      1. Demand Forecast for the next 7 days.
      2. 3 Specific Restock Recommendations.
      3. Anomaly detection (e.g. slowing sales in a category).

      Data Context:
      Recent Sales: ${JSON.stringify(salesContext.slice(0, 10))}
      Low Stock: ${JSON.stringify(stockContext)}

      Respond in clear, professional executive bullet points. Keep it concise.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    res.json({ insight: response.text, generatedAt: new Date() });
  } catch (error) {
    console.error('Intelligence Error:', error);
    res.status(500).json({ error: 'Retail intelligence engine offline' });
  }
});

export default router;
