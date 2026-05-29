import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Download,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const CATEGORY_LABELS: Record<string, string> = {
  RENT: 'Аренда и ЖКХ',
  SALARY: 'Зарплата',
  MARKETING: 'Маркетинг',
  SUPPLY: 'Закупка товара',
  OTHER: 'Прочее',
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function Finances() {
  const { t } = useTranslation();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [plData, setPlData] = useState<any>(null);
  const [expenseStats, setExpenseStats] = useState<{ total: number; byCategory: Record<string, number> } | null>(null);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ amount: '', category: 'OTHER', description: '' });
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [editExpenseData, setEditExpenseData] = useState({ amount: '', category: 'OTHER', description: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [expData, pl, stats] = await Promise.all([
        api.get<any[]>('/finance/expenses'),
        api.get<any>('/finance/p-and-l'),
        api.get<any>('/finance/expenses/stats'),
      ]);
      setExpenses(expData);
      setPlData(pl);
      setExpenseStats(stats);
    } catch (err) {
      console.error('Failed to fetch financial data');
    } finally {
      setIsLoading(false);
    }
  };

  const openEdit = (expense: any) => {
    setEditingExpense(expense);
    setEditExpenseData({ amount: String(expense.amount), category: expense.category, description: expense.description ?? '' });
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    if (!editExpenseData.amount || parseFloat(editExpenseData.amount) <= 0) {
      setExpenseError('Введите корректную сумму');
      return;
    }
    try {
      await api.patch(`/finance/expenses/${editingExpense.id}`, editExpenseData);
      setEditingExpense(null);
      fetchData();
    } catch {
      setExpenseError('Ошибка при обновлении расхода');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Удалить этот расход?')) return;
    try {
      await api.delete(`/finance/expenses/${id}`);
      fetchData();
    } catch {
      setExpenseError('Ошибка при удалении расхода');
    }
  };

  const handleAddExpense = async () => {
    setExpenseError(null);
    if (!newExpense.amount || parseFloat(newExpense.amount) <= 0) {
      setExpenseError('Введите корректную сумму');
      return;
    }
    try {
      await api.post('/finance/expenses', newExpense);
      setIsAddingExpense(false);
      setNewExpense({ amount: '', category: 'OTHER', description: '' });
      fetchData();
    } catch {
      setExpenseError('Ошибка при добавлении расхода');
    }
  };

  const handleExportStatement = () => {
    if (!expenses.length) { setExpenseError('Нет данных для экспорта'); return; }

    const wb = XLSX.utils.book_new();

    // Sheet 1: P&L
    const plRows = [
      ['Показатель', 'Сумма (₽)'],
      ['Выручка', plData?.revenue ?? 0],
      ['Себестоимость продаж', plData?.cogs ?? 0],
      ['Валовая прибыль', plData?.grossProfit ?? 0],
      ['Операционные расходы', plData?.totalExpenses ?? 0],
      ['Чистая прибыль', plData?.netProfit ?? 0],
      ['Рентабельность (%)', plData ? parseFloat(plData.margin.toFixed(2)) : 0],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(plRows), 'P&L');

    // Sheet 2: Expenses log
    const expRows = [['Дата', 'Категория', 'Описание', 'Сумма (₽)']];
    expenses.forEach((e) => {
      expRows.push([
        new Date(e.date).toLocaleDateString('ru-RU'),
        CATEGORY_LABELS[e.category] ?? e.category,
        e.description ?? '—',
        e.amount,
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expRows), 'Расходы');

    // Sheet 3: Breakdown by category
    const catRows: any[][] = [['Категория', 'Сумма (₽)', 'Доля (%)']];
    const totalExp = expenseStats?.total ?? 0;
    Object.entries(expenseStats?.byCategory ?? {}).forEach(([cat, amount]) => {
      catRows.push([
        CATEGORY_LABELS[cat] ?? cat,
        amount as number,
        totalExp > 0 ? parseFloat(((amount as number / totalExp) * 100).toFixed(1)) : 0,
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), 'По категориям');

    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `vanguard-finances-${date}.xlsx`);
  };

  if (isLoading) return (
    <div className="p-8 text-slate-400 font-bold animate-pulse uppercase text-[10px] tracking-widest italic">
      ЗАГРУЗКА ФИНАНСОВЫХ ДАННЫХ...
    </div>
  );

  const currency = t('common.ru_currency', '₽');

  // Build pie data from real expense stats
  const pieData = Object.entries(expenseStats?.byCategory ?? {})
    .filter(([, v]) => (v as number) > 0)
    .map(([cat, value]) => ({ name: CATEGORY_LABELS[cat] ?? cat, value: value as number }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t('finances.title')}</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{t('finances.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsAddingExpense(true)}
            className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2"
          >
            <Plus size={18} /> {t('finances.record_expenditure')}
          </Button>
          <Button
            onClick={handleExportStatement}
            variant="outline"
            className="h-12 px-6 rounded-2xl border-slate-200 bg-white font-black text-xs uppercase tracking-widest gap-2"
          >
            <Download size={18} /> {t('finances.statement_export')}
          </Button>
        </div>
      </div>

      {/* P&L Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FinancialCard
          title={t('dashboard.revenue')}
          value={`${currency}${(plData?.revenue ?? 0).toLocaleString()}`}
          subtitle="Общий приток выручки"
          icon={<DollarSign size={24} />}
          color="indigo"
        />
        <FinancialCard
          title={t('finances.net_profit')}
          value={`${currency}${(plData?.netProfit ?? 0).toLocaleString()}`}
          subtitle={`Рентабельность: ${(plData?.margin ?? 0).toFixed(1)}%`}
          icon={<TrendingUp size={24} />}
          color="emerald"
          status={(plData?.netProfit ?? 0) >= 0 ? 'Профицит' : 'Дефицит'}
        />
        <FinancialCard
          title={t('finances.operating_costs')}
          value={`${currency}${(plData?.totalExpenses ?? 0).toLocaleString()}`}
          subtitle="Себестоимость + Опер. расходы"
          icon={<TrendingDown size={24} />}
          color="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expense log */}
        <div className="lg:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-6">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('finances.recent_transactions')}</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Журнал операционных расходов</p>
          </div>

          <div className="overflow-x-auto">
            {expenses.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
                РАСХОДЫ НЕ ЗАРЕГИСТРИРОВАНЫ
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.date')}</th>
                    <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('inventory.category')}</th>
                    <th className="text-left py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Описание</th>
                    <th className="text-right py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.amount')}</th>
                    <th className="w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {expenses.map((expense) => (
                    <tr key={expense.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-4 text-xs font-bold text-slate-500">
                        {new Date(expense.date).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase tracking-tighter">
                          {CATEGORY_LABELS[expense.category] ?? expense.category}
                        </span>
                      </td>
                      <td className="py-4 text-xs font-bold text-slate-900">{expense.description || '—'}</td>
                      <td className="py-4 text-right text-sm font-black text-rose-600">-{currency}{expense.amount.toLocaleString()}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => openEdit(expense)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Редактировать"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Breakdown + margin */}
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 space-y-8">
          <div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('finances.opex_breakdown')}</h3>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Структура расходов по статьям</p>
          </div>

          <div className="h-[240px] w-full">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`₽${Number(value ?? 0).toLocaleString()}`, 'Сумма']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest text-center">
                НЕТ ДАННЫХ О РАСХОДАХ
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Статус P&L</h4>
            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-indigo-600 uppercase">{t('finances.operating_margin')}</span>
                <span className="text-lg font-black text-indigo-700">{(plData?.margin ?? 0).toFixed(1)}%</span>
              </div>
              <div className="h-1.5 w-full bg-indigo-200/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, plData?.margin ?? 0))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {editingExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900">Редактировать расход</h3>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.amount')} ({currency})</label>
                  <Input
                    type="number"
                    value={editExpenseData.amount}
                    onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
                    className="h-14 text-lg font-bold border-slate-200 rounded-xl"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.category')}</label>
                  <select
                    value={editExpenseData.category}
                    onChange={(e) => setEditExpenseData({ ...editExpenseData, category: e.target.value })}
                    className="w-full h-14 bg-white border border-slate-200 rounded-xl px-4 font-bold text-sm focus:ring-0"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Описание</label>
                  <textarea
                    value={editExpenseData.description}
                    onChange={(e) => setEditExpenseData({ ...editExpenseData, description: e.target.value })}
                    className="w-full min-h-[80px] border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-0"
                  />
                </div>
                {expenseError && <p className="text-xs text-red-500 font-bold">{expenseError}</p>}
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setEditingExpense(null)} className="flex-1 h-14 rounded-xl border-slate-200 font-bold">{t('common.cancel')}</Button>
                  <Button onClick={handleUpdateExpense} className="flex-[1.5] h-14 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">{t('common.save')}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddingExpense && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900">{t('finances.record_expenditure')}</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Регистрация финансовой операции</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.amount')} ({currency})</label>
                  <Input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className="h-14 text-lg font-bold border-slate-200 rounded-xl"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('inventory.category')}</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    className="w-full h-14 bg-white border border-slate-200 rounded-xl px-4 font-bold text-sm focus:ring-0"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Описание</label>
                  <textarea
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full min-h-[80px] border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-0"
                    placeholder="Детали транзакции..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsAddingExpense(false)} className="flex-1 h-14 rounded-xl border-slate-200 font-bold">{t('common.cancel')}</Button>
                  <Button onClick={handleAddExpense} className="flex-[1.5] h-14 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">{t('common.save')}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinancialCard({ title, value, subtitle, icon, color, status }: any) {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <Card className="rounded-[40px] border-slate-100 shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-8">
        <div className="flex justify-between items-start mb-6">
          <div className={`p-4 rounded-2xl ${colors[color]}`}>{icon}</div>
          {status && (
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${status === 'Профицит' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              {status}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{title}</p>
          <h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 opacity-60">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}
