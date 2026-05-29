import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Users,
  RefreshCw,
  Target,
  Flame,
  Printer,
  Package,
  Download,
  Calendar,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { ShiftReport } from '../components/ShiftReport';
import { useReactToPrint } from 'react-to-print';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const PERIOD_PRESETS = [
  { label: 'Сегодня',   value: 'today' },
  { label: 'Неделя',    value: 'week' },
  { label: 'Месяц',     value: 'month' },
  { label: 'Всё время', value: 'all' },
];

function getPeriodDates(preset: string): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  if (preset === 'today') return { dateFrom: today, dateTo: today };
  if (preset === 'week') {
    const d = new Date(now); d.setDate(d.getDate() - 7);
    return { dateFrom: d.toISOString().split('T')[0], dateTo: today };
  }
  if (preset === 'month') {
    const d = new Date(now); d.setDate(d.getDate() - 30);
    return { dateFrom: d.toISOString().split('T')[0], dateTo: today };
  }
  return { dateFrom: '', dateTo: '' };
}

export function Reports() {
  const { t } = useTranslation();
  const [reportStats, setReportStats] = useState<any>(null);
  const [shifts, setShifts] = useState<any[]>([]);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [shiftSales, setShiftSales] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const reportRef = useRef<HTMLDivElement>(null);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      let dateFrom = '';
      let dateTo = '';
      if (period === 'custom') {
        dateFrom = customFrom;
        dateTo = customTo;
      } else {
        const p = getPeriodDates(period);
        dateFrom = p.dateFrom;
        dateTo = p.dateTo;
      }
      const params = new URLSearchParams();
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const [stats, shiftsData] = await Promise.all([
        api.get<any>(`/analytics/reports?${params}`),
        api.get<any[]>('/shifts')
      ]);
      setReportStats(stats);
      setShifts(shiftsData);
    } catch (err) {
      console.error('Failed to fetch reporting intelligence');
    } finally {
      setIsLoading(false);
    }
  }, [period, customFrom, customTo]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSelectShift = async (shift: any) => {
    setSelectedShift(shift);
    try {
      const data = await api.get<any[]>(`/shifts/${shift.id}/sales`);
      setShiftSales(data);
    } catch (err) {
      console.error('Failed to fetch shift sales');
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
  });

  const handleExportExcel = async () => {
    try {
      const [products, customers] = await Promise.all([
        api.get<any[]>('/products'),
        api.get<any[]>('/customers'),
      ]);

      const wb = XLSX.utils.book_new();

      // Sheet 1: KPI Summary
      const kpiData = [
        ['Показатель', 'Значение'],
        ['Общая выручка (₽)', reportStats?.revenue ?? 0],
        ['Количество продаж', reportStats?.salesCount ?? 0],
        ['Средний чек (₽)', Math.round(reportStats?.avgTicket ?? 0)],
        ['Клиентская база', reportStats?.customerCount ?? 0],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiData), 'KPI');

      // Sheet 2: Top SKUs
      const skuRows = [['#', 'Артикул', 'Наименование', 'Продано (шт.)']];
      (reportStats?.topSKUs ?? []).forEach((item: any, i: number) => {
        skuRows.push([String(i + 1), item.sku ?? '—', item.name ?? '—', String(item.quantity ?? 0)]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(skuRows), 'Топ товары');

      // Sheet 3: Inventory
      const invRows = [['Товар', 'Бренд', 'Категория', 'Артикул', 'Размер', 'Цвет', 'Цена продажи', 'Цена закупки', 'Остаток']];
      products.forEach((p: any) => {
        p.variations?.forEach((v: any) => {
          invRows.push([p.name, p.brand?.name, p.category?.name, v.sku, v.size, v.color, v.salePrice, v.purchasePrice, v.stock]);
        });
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invRows), 'Инвентарь');

      // Sheet 4: Customers
      const crmRows = [['Имя', 'Телефон', 'Email', 'Карта', 'Баллы', 'Сумма покупок (₽)']];
      customers.forEach((c: any) => {
        crmRows.push([c.name, c.phone ?? '—', c.email ?? '—', c.cardId ?? '—', c.loyaltyPoints, c.totalSpent]);
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(crmRows), 'Клиенты');

      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const date = new Date().toISOString().slice(0, 10);
      saveAs(new Blob([buf], { type: 'application/octet-stream' }), `vanguard-report-${date}.xlsx`);
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const currency = t('common.ru_currency', '₽');

  if (isLoading) return (
    <div className="p-12 text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse italic">
       ГЕНЕРАЦИЯ ОТЧЕТНОСТИ...
    </div>
  );

  return (
    <div className="space-y-4 pb-12 retail-density animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 bg-white border border-retail-border p-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Центр аналитики</h2>
            <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">Оперативная отчетность и аудит терминалов</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchInitialData}
              variant="outline"
              className="h-10 px-4 rounded-none border-retail-border font-black text-[10px] uppercase tracking-widest gap-2"
            >
              <RefreshCw size={14} /> ОБНОВИТЬ
            </Button>
            <Button
              onClick={handleExportExcel}
              className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white px-6 rounded-none font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
            >
              <Download size={14} /> ЭКСПОРТ EXCEL
            </Button>
          </div>
        </div>

        {/* Period filter */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-retail-border">
          <Calendar size={14} className="text-slate-400 shrink-0" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Период:</span>
          <div className="flex gap-1 flex-wrap">
            {PERIOD_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${period === p.value ? 'bg-retail-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPeriod('custom')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${period === 'custom' ? 'bg-retail-blue text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Свой период
            </button>
          </div>
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="border border-retail-border px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-retail-blue" />
              <span className="text-slate-400 text-xs">—</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="border border-retail-border px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:border-retail-blue" />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Общая выручка" 
          value={`${currency}${(reportStats?.revenue ?? 0).toLocaleString()}`}
          trend="ПОДТВЕРЖДЕНО" 
          icon={DollarSign} 
        />
        <KPICard
          title="Кол-во транзакций"
          value={(reportStats?.salesCount ?? 0).toLocaleString()}
          trend={period === 'today' ? 'СЕГОДНЯ' : period === 'week' ? 'ЗА 7 ДНЕЙ' : period === 'month' ? 'ЗА 30 ДНЕЙ' : 'ЗА ПЕРИОД'}
          icon={Target}
        />
        <KPICard 
          title="Средний чек" 
          value={`${currency}${(reportStats?.avgTicket ?? 0).toLocaleString()}`} 
          trend="СРЕДНЕЕ ЗНАЧ." 
          icon={ShoppingBag} 
        />
        <KPICard 
          title="База клиентов" 
          value={(reportStats?.customerCount ?? 0).toLocaleString()}
          trend="ЗАРЕГИСТРИРОВАНО" 
          icon={Users} 
        />
      </div>

      {/* Main Stats Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top SKUs */}
      <div className="lg:col-span-2 bg-white border border-retail-border flex flex-col min-h-[400px]">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-[10px] font-black uppercase tracking-widest">Лидеры продаж</h3>
            <Flame size={16} className="text-orange-500" />
          </div>
          <div className="flex-1 overflow-y-auto">
             {(reportStats?.topSKUs?.length ?? 0) > 0 ? (
               <div className="divide-y divide-retail-border">
                  {reportStats.topSKUs.map((item: any, idx: number) => (
                    <div key={item.sku} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                       <div className="flex items-center gap-4">
                          <div className="w-8 h-8 bg-slate-100 flex items-center justify-center font-black text-[10px] text-slate-400 font-mono">
                            {String(idx + 1).padStart(2, '0')}
                          </div>
                          <div>
                            <div className="text-[11px] font-black uppercase text-slate-900">{item.name}</div>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.sku}</div>
                          </div>
                       </div>
                       <div className="text-right">
                          <div className="text-sm font-black text-retail-blue italic">{item.quantity} ШТ.</div>
                          <div className="text-[8px] font-black text-slate-400 uppercase">ОБЪЕМ ПРОДАЖИ</div>
                       </div>
                    </div>
                  ))}
               </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center p-12 opacity-30">
                  <Package size={48} strokeWidth={1} className="mb-4 text-slate-400" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">ДАННЫЕ О ЛИДЕРАХ ПРОДАЖ ОТСУТСТВУЮТ</p>
               </div>
             )}
          </div>
        </div>

        {/* Shift Auditor */}
        <div className="bg-white border border-retail-border flex flex-col h-[400px]">
          <div className="p-4 bg-slate-100 border-b border-retail-border">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">Журнал смен</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
             {shifts.length > 0 ? shifts.map((shift) => (
               <button 
                 key={shift.id}
                 onClick={() => handleSelectShift(shift)}
                 className={cn(
                   "w-full p-3 text-left hover:bg-slate-50 transition-colors flex justify-between items-center group", 
                   selectedShift?.id === shift.id && "bg-slate-100 border-l-2 border-retail-blue"
                 )}
               >
                 <div>
                    <div className="text-[10px] font-black text-slate-900 uppercase leading-none mb-1">{shift.user?.name}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase">{new Date(shift.openedAt).toLocaleString()}</div>
                 </div>
                 <div className="text-right">
                    <div className="text-[10px] font-black text-retail-blue italic">₽{shift.openingBalance}</div>
                    <div className={cn("text-[8px] font-black uppercase", shift.status === 'OPEN' ? "text-emerald-500" : "text-slate-300")}>
                      {shift.status === 'OPEN' ? 'ОТКРЫТА' : 'ЗАКРЫТА'}
                    </div>
                 </div>
               </button>
             )) : (
               <div className="p-8 text-center text-[10px] font-black uppercase text-slate-300">
                 ДАННЫЕ О СМЕНАХ ОТСУТСТВУЮТ
               </div>
             )}
          </div>
          {selectedShift && (
            <div className="p-4 border-t border-retail-border">
               <button 
                 onClick={() => handlePrint()}
                 className="w-full h-10 bg-retail-blue text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-opacity-90 active:scale-[0.98] transition-all"
               >
                 <Printer size={14} /> СФОРМИРОВАТЬ Z-ОТЧЕТ
               </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden">
         <ShiftReport ref={reportRef} shift={selectedShift} sales={shiftSales} />
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, icon: Icon }: any) {
  return (
    <div className="bg-white p-4 border border-retail-border space-y-2 group hover:border-retail-blue transition-colors">
      <div className="flex justify-between items-start">
        <div className="p-2 bg-slate-100 text-slate-400 group-hover:bg-retail-blue group-hover:text-white transition-colors">
          <Icon size={20} />
        </div>
        <div className="text-[8px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 uppercase tracking-widest">
           {trend}
        </div>
      </div>
      <div>
        <div className="text-slate-400 font-bold text-[9px] uppercase tracking-widest leading-none mb-1">{title}</div>
        <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none italic">{value}</div>
      </div>
    </div>
  );
}
