import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Plus,
  ChevronRight,
  Star,
  Phone,
  Mail,
  ArrowUpRight,
  X,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { Customer } from '../types';
import { motion } from 'motion/react';

export function CRM() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', cardId: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await api.get<Customer[]>('/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers');
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalCustomers = customers.length;
  const vipCustomers = customers.filter(c => c.loyaltyPoints > 1000).length;
  const atRiskCustomers = customers.filter(c => c.totalSpent === 0).length;

  const openModal = () => {
    setForm({ name: '', phone: '', email: '', cardId: '' });
    setSaveError('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setSaveError('Укажите имя клиента');
    setSaving(true);
    setSaveError('');
    try {
      const created = await api.post<Customer>('/customers', {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        cardId: form.cardId.trim() || undefined,
      });
      setCustomers(prev => [created, ...prev]);
      setIsModalOpen(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Ошибка регистрации');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">База клиентов</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Управление лояльностью и история покупок</p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={openModal}
            className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center gap-2 shadow-xl shadow-indigo-100"
          >
            <Plus size={18} /> Регистрация клиента
          </Button>
        </div>
      </div>

      {/* Real Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SegmentCard title="Всего клиентов" value={totalCustomers.toLocaleString()} color="indigo" icon={<Users />} />
        <SegmentCard title="VIP-сегмент" value={vipCustomers.toLocaleString()} color="emerald" icon={<Star />} />
        <SegmentCard title="Без покупок" value={atRiskCustomers.toLocaleString()} color="rose" icon={<ArrowUpRight />} />
      </div>

      {/* Workspace */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <Input
              placeholder="Поиск по ФИО, телефону или email..."
              className="h-12 pl-12 bg-slate-50 border-none rounded-xl font-bold text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg">
              Найдено: {filtered.length}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Информация о клиенте</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Программа лояльности</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Объем покупок</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Карта</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-16 text-slate-300 text-xs font-black uppercase tracking-widest">
                    КЛИЕНТЫ НЕ НАЙДЕНЫ
                  </td>
                </tr>
              ) : (
                filtered.map((customer) => (
                  <tr key={customer.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 tracking-tight">{customer.name}</div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              <Phone size={10} /> {customer.phone || '—'}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                              <Mail size={10} /> {customer.email || '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-16 h-10 bg-slate-50 rounded-xl flex flex-col items-center justify-center border border-slate-100">
                          <span className="text-[10px] font-black text-indigo-600 leading-none">{customer.loyaltyPoints}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase mt-0.5 tracking-tighter">Баллов</span>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest py-1 px-2 rounded-lg ${
                          customer.loyaltyPoints > 1000
                            ? 'bg-amber-50 text-amber-600'
                            : customer.loyaltyPoints > 200
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-50 text-slate-500'
                        }`}>
                          {customer.loyaltyPoints > 1000 ? 'Платиновый' : customer.loyaltyPoints > 200 ? 'Золотой' : 'Стандарт'}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-black text-slate-900">₽{customer.totalSpent.toLocaleString()}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">LTV (Всего покупок)</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-[10px] font-mono text-slate-400">
                        {customer.cardId || '—'}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
          <div className="bg-white w-full max-w-md border border-slate-100 shadow-2xl rounded-[32px] overflow-hidden mx-4">
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Регистрация клиента</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Новая карточка лояльности</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-8 space-y-4">
              {saveError && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-xs font-bold px-4 py-3 rounded-xl">
                  {saveError}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">ФИО / Имя *</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Иванов Иван Иванович"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Телефон</label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+7 (999) 000-00-00"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email</label>
                <Input
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="client@example.com"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Номер карты лояльности</label>
                <Input
                  value={form.cardId}
                  onChange={e => setForm(f => ({ ...f, cardId: e.target.value }))}
                  placeholder="VNG-000001 (необязательно)"
                  className="h-12 rounded-xl bg-slate-50 border-none font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex gap-3 p-8 pt-0">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm gap-2"
              >
                {saving ? (
                  <span className="animate-pulse">Сохранение...</span>
                ) : (
                  <><Check size={16} /> Зарегистрировать</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="px-6 h-12 rounded-xl border-slate-200 font-black text-sm"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentCard({ title, value, color, icon }: { title: string; value: string; color: string; icon: React.ReactNode }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-6">
      <div className={`w-14 h-14 ${colors[color]} rounded-2xl flex items-center justify-center shadow-sm`}>
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</div>
        <div className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{value}</div>
      </div>
    </div>
  );
}
