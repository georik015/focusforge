import express from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from './auth';

const router = express.Router();

// Get all expenses
router.get('/expenses', authenticate, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Add expense
router.get('/expenses/stats', authenticate, async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany();
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const byCategory = expenses.reduce((acc: any, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    
    res.json({ total, byCategory });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expense stats' });
  }
});

router.post('/expenses', authenticate, async (req, res) => {
  const { amount, category, description, date } = req.body;
  try {
    const expense = await prisma.expense.create({
      data: {
        amount: parseFloat(amount),
        category,
        description,
        date: date ? new Date(date) : new Date(),
      },
    });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Profit and Loss Analytics
router.get('/p-and-l', authenticate, async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
       include: { items: { include: { variation: true } } }
    });
    
    const expenses = await prisma.expense.findMany();
    
    const revenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const cogs = sales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + (item.variation.purchasePrice * item.quantity), 0);
    }, 0);
    
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - totalExpenses;
    
    res.json({
      revenue,
      cogs,
      grossProfit,
      totalExpenses,
      netProfit,
      margin: revenue > 0 ? (grossProfit / revenue) * 100 : 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate P&L' });
  }
});

export default router;

