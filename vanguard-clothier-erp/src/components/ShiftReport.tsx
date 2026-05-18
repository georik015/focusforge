import React from 'react';
import { useTranslation } from 'react-i18next';

interface ShiftReportProps {
  shift: any;
  sales: any[];
}

export const ShiftReport = React.forwardRef<HTMLDivElement, ShiftReportProps>(({ shift, sales }, ref) => {
  const { t } = useTranslation();
  const currency = t('common.ru_currency', '₽');

  const totalSalesCount = sales.length;
  const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
  const cashSales = sales.filter(s => s.paymentType === 'CASH').reduce((acc, s) => acc + s.totalAmount, 0);
  const cardSales = sales.filter(s => s.paymentType === 'CARD').reduce((acc, s) => acc + s.totalAmount, 0);

  return (
    <div ref={ref} className="p-12 bg-white text-slate-900 font-sans max-w-[800px] mx-auto border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">VANGUARD <span className="text-indigo-600">SHIFT REPORT</span></h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Operational Z-Report | Terminal 01</p>
        </div>
        <div className="text-right">
          <p className="font-black text-slate-900">{new Date().toLocaleDateString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cycle Reference: {shift?.id?.toUpperCase() || 'N/A'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Shift Metrics</h3>
          <div className="space-y-4">
            <MetricRow label="Opened At" value={new Date(shift?.openedAt).toLocaleString()} />
            <MetricRow label="Closed At" value={shift?.closedAt ? new Date(shift?.closedAt).toLocaleString() : 'IN PROGRESS'} />
            <MetricRow label="Operator" value={shift?.user?.name || 'N/A'} />
            <MetricRow label="Status" value={shift?.status || 'OPEN'} highlight />
          </div>
        </div>
        <div className="space-y-6">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Liquidity Summary</h3>
          <div className="space-y-4">
            <MetricRow label="Opening Balance" value={`${currency}${shift?.openingBalance?.toLocaleString()}`} />
            <MetricRow label="Total Revenue" value={`${currency}${totalRevenue?.toLocaleString()}`} />
            <MetricRow label="Cash in Drawer" value={`${currency}${(shift?.openingBalance + cashSales)?.toLocaleString()}`} highlight />
            <MetricRow label="Card Terminals" value={`${currency}${cardSales?.toLocaleString()}`} />
          </div>
        </div>
      </div>

      <div className="mb-12">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-4">Transaction Log</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-slate-400 font-bold border-b border-slate-50 text-left">
              <th className="py-2">Sale ID</th>
              <th className="py-2 text-center">Type</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-slate-50">
                <td className="py-2 font-mono text-[10px]">{sale.id.slice(-12).toUpperCase()}</td>
                <td className="py-2 text-center font-bold text-slate-600">{sale.paymentType}</td>
                <td className="py-2 text-right font-black">{currency}{sale.totalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-black text-slate-900 border-t-2 border-slate-900">
              <td colSpan={2} className="py-4">TOTAL REVENUE GENERATED</td>
              <td className="py-4 text-right">{currency}{totalRevenue.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-between items-end pt-12 border-t border-slate-100 italic text-slate-400 text-[10px]">
        <div>
           <p>Certified by Vanguard ERP | Shift Audit Completed</p>
           <p className="mt-1">Generated: {new Date().toLocaleString()}</p>
        </div>
        <div className="text-right border-t border-slate-400 w-48 pt-2">
           <p className="font-bold uppercase text-slate-900 not-italic">Operator Signature</p>
        </div>
      </div>
    </div>
  );
});

function MetricRow({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-500 font-bold">{label}</span>
      <span className={`font-black ${highlight ? 'text-indigo-600' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}
