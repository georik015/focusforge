import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  Zap,
  Target,
  Box,
  Truck,
  ShoppingBag,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

export function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [dashError, setDashError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get('/analytics/dashboard');
        setStats(data);
      } catch (err) {
        setDashError(true);
      }
    };
    const fetchPendingOrders = async () => {
      try {
        const data = await api.get<{ orders: any[] }>('/orders?status=PENDING&limit=5');
        setPendingOrders(data.orders);
      } catch { /* silent */ }
    };
    fetchStats();
    fetchPendingOrders();
  }, []);

  if (dashError) return (
    <div className="p-8 flex flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle size={36} className="text-red-400" />
      <p className="text-slate-600 font-semibold">Не удалось загрузить данные дашборда</p>
      <button onClick={() => { setDashError(false); setStats(null); window.location.reload(); }} className="px-4 py-2 bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors">
        Обновить страницу
      </button>
    </div>
  );

  if (!stats) return <div className="p-8 text-slate-400 font-bold animate-pulse uppercase text-xs tracking-widest italic">ЗАГРУЗКА ДАННЫХ ПРЕДПРИЯТИЯ...</div>;

  const currency = t('common.ru_currency', '₽');

  return (
    <div className="space-y-4 pb-12 retail-density">
      {/* Real-time Ticker */}
      <div className="flex items-center gap-4 bg-retail-dark text-white px-4 py-2 border-b border-retail-blue/30 overflow-hidden shrink-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
           <Zap size={14} className="text-retail-blue" />
           <span className="text-[10px] font-black uppercase tracking-widest leading-none">VANGUARD_ERP_V1</span>
        </div>
        <div className="h-4 w-[1px] bg-white/20" />
        <div className="flex-1 text-[10px] font-bold uppercase tracking-widest animate-marquee whitespace-nowrap opacity-60">
          ФИЛИАЛ: ЦЕНТРАЛЬНЫЙ // СТАТУС: {(stats.dailySalesCount ?? 0) > 0 ? 'АКТИВЕН' : 'ОЖИДАНИЕ'} // СИНХРОНИЗАЦИЯ: ВЫПОЛНЕНА // ПРЕДУПРЕЖДЕНИЯ: {stats.lowStockCount ?? 0} // ВЫРУЧКА 24Ч: ₽{(stats.dailyRevenue ?? 0).toLocaleString()} // КАССА: СТАБИЛЬНО
        </div>
      </div>

      {/* Industrial KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title={t('dashboard.revenue')} 
          value={`${currency}${(stats.dailyRevenue ?? 0).toLocaleString()}`}
          trend="ОНЛАЙН ПРОВЕРКА" 
          isUp={stats.dailyRevenue > 0} 
          icon={<TrendingUp size={20} />} 
          color="blue" 
        />
        <StatCard 
          title={t('dashboard.sales')} 
          value={(stats.dailySalesCount ?? 0).toString()}
          trend="ОПЕРАЦИИ В БАЗЕ" 
          isUp={stats.dailySalesCount > 0} 
          icon={<Users size={20} />} 
          color="gray" 
        />
        <StatCard 
          title="ID Терминала" 
          value="POS-01" 
          trend="СВЯЗЬ АКТИВНА" 
          isUp={true} 
          icon={<Target size={20} />} 
          color="gray" 
        />
        <StatCard 
          title="Товары под угрозой" 
          value={stats.lowStockCount} 
          trend="ТРЕБУЕТСЯ ЗАКАЗ" 
          isUp={stats.lowStockCount === 0} 
          icon={<AlertTriangle size={20} />} 
          color={stats.lowStockCount > 10 ? "red" : "gray"} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Performance Chart */}
        <div className="lg:col-span-2 bg-white border border-retail-border p-6 space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3 border border-retail-border">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Продажи за неделю</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Динамика оборота по дням</p>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-emerald-500 uppercase">● БД_ПОДКЛЮЧЕНА</span>
            </div>
          </div>
          
          <div className="h-[280px] w-full flex items-center justify-center">
            {stats.salesByDay?.some((d: any) => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.salesByDay}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0059B2" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0059B2" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#121A26', color: 'white', borderRadius: '0', border: 'none', fontSize: '10px', fontWeight: '900' }}
                  />
                  <Area type="stepAfter" dataKey="amount" stroke="#0059B2" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center space-y-2 opacity-50">
                 <Box size={48} className="mx-auto text-slate-300" strokeWidth={1} />
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">NO_SALES_DATA_REGISTERED_FOR_PERIOD</p>
              </div>
            )}
          </div>
        </div>

        {/* Operational Status Monitor (Real Feed) */}
        <div className="bg-white border border-retail-border flex flex-col overflow-hidden">
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Журнал операций</h3>
            <span className="text-[9px] text-emerald-400 font-black">АКТИВЕН</span>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar p-0">
             {stats.recentActivity.length > 0 ? (
               <div className="divide-y divide-retail-border">
                  {stats.recentActivity.map((log: any) => (
                    <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-retail-blue uppercase tracking-widest">{log.action}</span>
                        <span className="text-[8px] font-bold text-slate-400">{new Date(log.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-900 leading-tight">
                        {log.user?.name ?? 'Система'}: {log.details}
                      </p>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-30">
                  <Package size={32} className="mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">СИСТЕМА ОЖИДАЕТ СОБЫТИЙ</p>
               </div>
             )}
          </div>

          <div className="p-4 bg-slate-50 border-t border-retail-border">
             <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Уведомления склада</span>
                <span className={cn("text-[10px] font-black px-2 py-0.5", stats.lowStockCount > 0 ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                  {stats.lowStockCount} ПОЗИЦИЙ_КРИТИЧНО
                </span>
             </div>
          </div>
        </div>
      </div>

      {/* Operational Widgets — real data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <OperationCard
          icon={<Truck size={18} />}
          title="ВСЕГО ПОСТАВОК"
          subtitle="Зарегистрировано в системе"
          value={String(stats.supplyCount ?? 0)}
        />
        <OperationCard
          icon={<Box size={18} />}
          title="ЕДИНИЦ НА СКЛАДЕ"
          subtitle={`${stats.totalSkus ?? 0} SKU в каталоге`}
          value={String(stats.totalStock ?? 0)}
        />
        <OperationCard
          icon={<TrendingUp size={18} />}
          title="КРИТИЧЕСКИХ ПОЗИЦИЙ"
          subtitle="Остаток ≤ 5 единиц"
          value={String(stats.lowStockCount)}
          alert={stats.lowStockCount > 0}
        />
      </div>

      {/* Pending online orders */}
      <div className="bg-white border border-retail-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-retail-border bg-slate-50">
          <div className="flex items-center gap-3">
            <ShoppingBag size={16} className="text-retail-blue" />
            <div>
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Новые онлайн-заказы</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Требуют подтверждения</p>
            </div>
          </div>
          {pendingOrders.length > 0 && (
            <span className="text-[10px] font-black bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
              {pendingOrders.length} ОЖИДАЮТ
            </span>
          )}
        </div>

        {pendingOrders.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">НЕТ НОВЫХ ЗАКАЗОВ</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-amber-50 border border-amber-200 flex items-center justify-center">
                    <Clock size={13} className="text-amber-600" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-slate-900">
                      #{order.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">
                      {order.customer?.name ?? order.guestName ?? 'Аноним'} · {order.items?.length ?? 0} поз.
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black text-slate-900">
                    ₽{order.total.toLocaleString('ru-RU')}
                  </span>
                  <ChevronRight size={12} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, trend, isUp, icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-retail-blue text-white',
    gray: 'bg-slate-100 text-slate-500',
    red: 'bg-red-600 text-white'
  };

  return (
    <div className="bg-white border border-retail-border p-4 space-y-2 group hover:border-retail-blue transition-colors">
      <div className="flex justify-between items-start">
        <div className={`p-2 ${colorMap[color]} shrink-0`}>{icon}</div>
        <div className={`flex items-center gap-1 text-[9px] font-black ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          {trend}
        </div>
      </div>
      <div>
        <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest leading-none mb-1">{title}</div>
        <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{value}</div>
      </div>
    </div>
  );
}

function OperationCard({ icon, title, subtitle, value, alert }: any) {
  return (
    <div className={cn(
      "bg-white border p-4 flex items-center justify-between group hover:bg-slate-50 transition-colors",
      alert ? "border-red-200" : "border-retail-border"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-10 h-10 flex items-center justify-center font-bold",
          alert ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"
        )}>
          {icon}
        </div>
        <div>
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">{title}</h4>
          <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tight leading-none">{subtitle}</p>
        </div>
      </div>
      <div className={cn(
        "text-lg font-black tracking-tighter italic",
        alert ? "text-red-500" : "text-retail-blue"
      )}>{value}</div>
    </div>
  );
}
