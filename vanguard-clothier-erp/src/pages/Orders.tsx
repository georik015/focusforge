import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag, Clock, CheckCircle, Truck, Package, XCircle,
  ChevronRight, RefreshCw, X,
} from 'lucide-react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

type OrderStatus = 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtSale: number;
  variation: {
    sku: string;
    size: string;
    color: string;
    product: { name: string };
  };
}

interface Order {
  id: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  address: string | null;
  city: string;
  paymentType: string;
  status: string;
  total: number;
  comment: string | null;
  createdAt: string;
  customer: { name: string; phone: string | null } | null;
  items: OrderItem[];
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:   { label: 'Новый',       color: 'text-amber-600 bg-amber-50 border-amber-200',      icon: Clock },
  CONFIRMED: { label: 'Подтверждён', color: 'text-blue-600 bg-blue-50 border-blue-200',         icon: CheckCircle },
  SHIPPED:   { label: 'Отправлен',   color: 'text-violet-600 bg-violet-50 border-violet-200',   icon: Truck },
  DELIVERED: { label: 'Выдан',       color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: Package },
  CANCELLED: { label: 'Отменён',     color: 'text-red-600 bg-red-50 border-red-200',             icon: XCircle },
};

const PAYMENT_LABELS: Record<string, string> = {
  CARD: 'Карта', CASH: 'Наличные', SBP: 'СБП',
};

const TABS: { key: OrderStatus; label: string }[] = [
  { key: 'ALL',       label: 'Все' },
  { key: 'PENDING',   label: 'Новые' },
  { key: 'CONFIRMED', label: 'Подтверждены' },
  { key: 'SHIPPED',   label: 'Отправлены' },
  { key: 'DELIVERED', label: 'Выданы' },
  { key: 'CANCELLED', label: 'Отменены' },
];

export function Orders() {
  const [activeTab, setActiveTab] = useState<OrderStatus>('ALL');
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.get<Record<string, number>>('/orders/stats');
      setStats(data);
    } catch { /* non-critical, don't block UI */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const qs = activeTab !== 'ALL' ? `?status=${activeTab}` : '';
      const data = await api.get<{ orders: Order[] }>(`/orders${qs}`);
      setOrders(data.orders);
    } catch (err: any) {
      setActionError(err?.message || 'Не удалось загрузить заказы');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [fetchOrders, fetchStats]);

  const handleRefresh = () => { setActionError(''); fetchOrders(); fetchStats(); };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    setActionError('');
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      await Promise.all([fetchOrders(), fetchStats()]);
      setSelectedOrder(prev => prev?.id === orderId ? { ...prev, status: newStatus } : prev);
    } catch (err: any) {
      setActionError(err?.message || 'Не удалось изменить статус');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Отменить заказ? Это действие нельзя отменить.')) return;
    setCancelling(true);
    setActionError('');
    try {
      await api.post(`/orders/${orderId}/cancel`, {});
      await Promise.all([fetchOrders(), fetchStats()]);
      setSelectedOrder(prev => prev?.id === orderId ? { ...prev, status: 'CANCELLED' } : prev);
    } catch (err: any) {
      setActionError(err?.message || 'Не удалось отменить заказ');
    } finally {
      setCancelling(false);
    }
  };

  const getName = (o: Order) => o.customer?.name ?? o.guestName ?? 'Аноним';
  const getPhone = (o: Order) => o.customer?.phone ?? o.guestPhone ?? '—';

  return (
    <div className="space-y-4 pb-12">
      {actionError && (
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 font-medium">
          <span>{actionError}</span>
          <button onClick={() => setActionError('')} className="ml-4 text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-900 uppercase tracking-widest">Онлайн-заказы</h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Управление заказами из интернет-витрины</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 bg-white rounded hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={13} /> Обновить
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'PENDING',   label: 'Новые',      icon: Clock },
          { key: 'CONFIRMED', label: 'Подтвержд.', icon: CheckCircle },
          { key: 'SHIPPED',   label: 'Отправлены', icon: Truck },
          { key: 'DELIVERED', label: 'Выданы',     icon: Package },
          { key: 'CANCELLED', label: 'Отменены',   icon: XCircle },
        ].map(s => {
          const Icon = s.icon;
          const meta = STATUS_META[s.key];
          return (
            <div key={s.key} className="bg-white border border-slate-200 rounded p-3 flex items-center gap-3">
              <Icon size={18} className={meta.color.split(' ')[0]} />
              <div>
                <div className="text-xl font-black text-slate-900">{stats[s.key] ?? 0}</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-[11px] font-black uppercase tracking-wider shrink-0 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
              {stats[tab.key] != null && (
                <span className="ml-1.5 text-[9px] bg-slate-200 text-slate-600 rounded px-1.5 py-0.5 font-black">
                  {stats[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400 font-bold animate-pulse uppercase tracking-widest">
            Загрузка данных...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-14 text-center">
            <ShoppingBag size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">Заказов нет</p>
            <p className="text-xs text-slate-300 mt-1">Как только покупатель оформит заказ — он появится здесь</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Заказ', 'Клиент', 'Город', 'Сумма', 'Статус', 'Дата', ''].map((h, i) => (
                    <th
                      key={i}
                      className={`text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider ${
                        i === 1 ? 'hidden sm:table-cell' : i === 2 ? 'hidden md:table-cell' : i === 5 ? 'hidden lg:table-cell' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const meta = STATUS_META[order.status] ?? STATUS_META.PENDING;
                  const Icon = meta.icon;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="font-black text-sm text-slate-900">#{order.id.slice(-8).toUpperCase()}</span>
                        <div className="text-[10px] text-slate-400">{order.items.length} поз.</div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="text-sm font-bold text-slate-800">{getName(order)}</div>
                        <div className="text-[10px] text-slate-400">{getPhone(order)}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-sm text-slate-600">{order.city}</td>
                      <td className="px-4 py-3 font-black text-slate-900 whitespace-nowrap">
                        ₽{order.total.toLocaleString('ru-RU')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black whitespace-nowrap ${meta.color}`}>
                          <Icon size={10} /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-400 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={14} className="text-slate-300" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col"
            >
              {/* Panel header */}
              <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200 bg-slate-50 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="font-black text-slate-900 text-sm">
                    #{selectedOrder.id.slice(-8).toUpperCase()}
                  </span>
                  {(() => {
                    const meta = STATUS_META[selectedOrder.status] ?? STATUS_META.PENDING;
                    const Icon = meta.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-black ${meta.color}`}>
                        <Icon size={10} /> {meta.label}
                      </span>
                    );
                  })()}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-400 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Panel body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Покупатель</h3>
                  <div className="space-y-2 text-sm">
                    <Row label="Имя" value={getName(selectedOrder)} />
                    <Row label="Телефон" value={getPhone(selectedOrder)} />
                    {selectedOrder.guestEmail && <Row label="Email" value={selectedOrder.guestEmail} />}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Доставка</h3>
                  <div className="space-y-2 text-sm">
                    <Row label="Город" value={selectedOrder.city} />
                    <Row label="Адрес" value={selectedOrder.address ?? '—'} />
                    <Row label="Оплата" value={PAYMENT_LABELS[selectedOrder.paymentType] ?? selectedOrder.paymentType} />
                  </div>
                  {selectedOrder.comment && (
                    <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <span className="font-bold">Комментарий: </span>{selectedOrder.comment}
                    </div>
                  )}
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Состав заказа</h3>
                  <div className="space-y-2">
                    {selectedOrder.items.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded">
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="text-sm font-bold text-slate-900 truncate">{item.variation.product.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {item.variation.sku} · {item.variation.size} · {item.variation.color}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-slate-900">
                            ₽{(item.priceAtSale * item.quantity).toLocaleString('ru-RU')}
                          </div>
                          <div className="text-[10px] text-slate-400">×{item.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-slate-200 font-black text-slate-900 text-sm">
                    <span>Итого</span>
                    <span>₽{selectedOrder.total.toLocaleString('ru-RU')}</span>
                  </div>
                </section>
              </div>

              {/* Status actions */}
              <div className="shrink-0 p-5 border-t border-slate-200 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Сменить статус</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(STATUS_META)
                    .filter(([key]) => key !== selectedOrder.status && key !== 'CANCELLED')
                    .map(([key, meta]) => {
                      const Icon = meta.icon;
                      return (
                        <button
                          key={key}
                          disabled={updatingStatus || cancelling}
                          onClick={() => handleStatusChange(selectedOrder.id, key)}
                          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-[11px] font-black transition-opacity ${meta.color} hover:opacity-75 disabled:opacity-40`}
                        >
                          <Icon size={12} /> {meta.label}
                        </button>
                      );
                    })}
                </div>
                {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'DELIVERED' && (
                  <button
                    disabled={cancelling || updatingStatus}
                    onClick={() => handleCancelOrder(selectedOrder.id)}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded border text-[11px] font-black transition-opacity text-red-600 bg-red-50 border-red-200 hover:bg-red-100 disabled:opacity-40"
                  >
                    <XCircle size={12} /> {cancelling ? 'Отмена...' : 'Отменить заказ (с откатом стока)'}
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-900 text-right max-w-[220px]">{value}</span>
    </div>
  );
}
