import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from './auth';

const router = express.Router();

router.get('/expenses', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (_req, res) => {
  try {
    const expenses = await prisma.expense.findMany({ orderBy: { date: 'desc' } });
    res.json(expenses);
  } catch {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

router.get('/expenses/stats', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (_req, res) => {
  try {
    const expenses = await prisma.expense.findMany();
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    res.json({ total, byCategory });
  } catch {
    res.status(500).json({ error: 'Failed to fetch expense stats' });
  }
});

router.post('/expenses', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req, res) => {
  const { amount, category, description, date } = req.body;
  const parsed = parseFloat(amount);
  if (!amount || isNaN(parsed) || parsed <= 0)
    return res.status(400).json({ error: 'amount должен быть положительным числом' });
  if (!category || !String(category).trim())
    return res.status(400).json({ error: 'category обязателен' });
  try {
    const expense = await prisma.expense.create({
      data: { amount: parsed, category, description, date: date ? new Date(date) : new Date() },
    });
    res.json(expense);
  } catch {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

router.patch('/expenses/:id', authenticate, authorize(['ADMIN', 'STOREKEEPER']), async (req, res) => {
  const { amount, category, description, date } = req.body;
  const data: any = {};
  if (amount !== undefined) {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0)
      return res.status(400).json({ error: 'amount должен быть положительным числом' });
    data.amount = parsed;
  }
  if (category !== undefined) {
    if (!String(category).trim()) return res.status(400).json({ error: 'category не может быть пустым' });
    data.category = category;
  }
  if (description !== undefined) data.description = description;
  if (date !== undefined) data.date = new Date(date);

  if (Object.keys(data).length === 0)
    return res.status(400).json({ error: 'Нет данных для обновления' });

  try {
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data });
    res.json(expense);
  } catch {
    res.status(404).json({ error: 'Расход не найден' });
  }
});

router.delete('/expenses/:id', authenticate, authorize(['ADMIN']), async (req, res) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Расход не найден' });
  }
});

router.get('/p-and-l', authenticate, authorize(['ADMIN']), async (_req, res) => {
  try {
    const [sales, expenses] = await Promise.all([
      prisma.sale.findMany({ include: { items: { include: { variation: true } } } }),
      prisma.expense.findMany(),
    ]);

    const revenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const cogs = sales.reduce((sum, s) =>
      sum + s.items.reduce((itemSum, item) => itemSum + item.variation.purchasePrice * item.quantity, 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      revenue, cogs, grossProfit, totalExpenses, netProfit,
      margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    });
  } catch {
    res.status(500).json({ error: 'Failed to calculate P&L' });
  }
});

export default router;
