import { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  RefreshCw,
  ArrowRightLeft,
  Plus,
  X,
  Package,
  Search,
  Check,
  ChevronDown,
  ChevronRight,
  Boxes,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { api } from '../lib/api';
import { Warehouse } from '../types';
import { cn } from '../lib/utils';
import { Input } from '../components/ui/Input';

interface StockEntry {
  id: string;
  quantity: number;
  variation: {
    id: string;
    sku: string;
    size: string;
    color: string;
    salePrice: number;
    product: { name: string; category: { name: string }; brand: { name: string } };
  };
}

export function Warehouses() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Обзор (stock modal)
  const [stockWarehouse, setStockWarehouse] = useState<Warehouse | null>(null);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockSearch, setStockSearch] = useState('');

  // Перевод (transfer modal)
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [transferVariationId, setTransferVariationId] = useState('');
  const [transferQty, setTransferQty] = useState(1);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState('');

  // Source warehouse stock for transfer dropdown
  const [fromStockEntries, setFromStockEntries] = useState<StockEntry[]>([]);
  const [fromStockSearch, setFromStockSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [wData, mData] = await Promise.all([
        api.get<Warehouse[]>('/warehouses'),
        api.get<any[]>('/warehouses/movements'),
      ]);
      setWarehouses(wData);
      setMovements(mData);
    } catch {
      console.error('Failed to fetch warehouse data');
    } finally {
      setLoading(false);
    }
  };

  const openStock = async (w: Warehouse) => {
    setStockWarehouse(w);
    setStockSearch('');
    setStockLoading(true);
    try {
      const data = await api.get<StockEntry[]>(`/warehouses/${w.id}/stock`);
      setStockEntries(data);
    } catch {
      setStockEntries([]);
    } finally {
      setStockLoading(false);
    }
  };

  const openTransfer = async (w: Warehouse) => {
    setTransferFrom(w.id);
    setTransferTo('');
    setTransferVariationId('');
    setTransferQty(1);
    setTransferError('');
    setFromStockSearch('');
    setTransferOpen(true);
    try {
      const data = await api.get<StockEntry[]>(`/warehouses/${w.id}/stock`);
      setFromStockEntries(data.filter((e) => e.quantity > 0));
    } catch {
      setFromStockEntries([]);
    }
  };

  const handleTransfer = async () => {
    if (!transferFrom || !transferTo || !transferVariationId || transferQty < 1) {
      setTransferError('Заполните все поля');
      return;
    }
    setTransferSaving(true);
    setTransferError('');
    try {
      await api.post('/warehouses/transfer', {
        fromWarehouseId: transferFrom,
        toWarehouseId: transferTo,
        variationId: transferVariationId,
        quantity: transferQty,
      });
      setTransferOpen(false);
      fetchData();
    } catch (err: any) {
      setTransferError(err?.message ?? 'Ошибка при перемещении');
    } finally {
      setTransferSaving(false);
    }
  };

  const filteredStock = stockEntries.filter((e) => {
    const q = stockSearch.toLowerCase();
    return (
      !q ||
      e.variation.sku.toLowerCase().includes(q) ||
      e.variation.product.name.toLowerCase().includes(q) ||
      e.variation.color.toLowerCase().includes(q)
    );
  });

  const filteredFromStock = fromStockEntries.filter((e) => {
    const q = fromStockSearch.toLowerCase();
    return (
      !q ||
      e.variation.sku.toLowerCase().includes(q) ||
      e.variation.product.name.toLowerCase().includes(q)
    );
  });

  const selectedVariation = fromStockEntries.find((e) => e.variation.id === transferVariationId);
  const maxQty = selectedVariation?.quantity ?? 0;

  if (loading) return (
    <div className="p-12 text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse italic">
      ЗАГРУЗКА ЛОГИСТИЧЕСКИХ ДАННЫХ...
    </div>
  );

  return (
    <div className="space-y-4 pb-12 retail-density animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-retail-border p-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Логистика и склады</h2>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">
            Управление товарными запасами сети
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchData}
            variant="outline"
            className="h-10 px-4 rounded-none border-retail-border font-black text-[10px] uppercase tracking-widest gap-2"
          >
            <RefreshCw size={14} /> ОБНОВИТЬ
          </Button>
        </div>
      </div>

      {/* Warehouse cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {warehouses.map((w) => (
          <div
            key={w.id}
            className="bg-white border border-retail-border p-6 space-y-4 relative group hover:border-retail-blue transition-colors"
          >
            {w.isMain && (
              <div className="absolute top-0 right-0 bg-retail-blue text-white px-3 py-1 text-[8px] font-black uppercase">
                ЦЕНТРАЛЬНЫЙ
              </div>
            )}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 text-slate-400 flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 leading-none uppercase">{w.name}</h3>
                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 mt-1 uppercase">
                  <MapPin size={9} /> {w.location || 'Геолокация не указана'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-50 pt-4">
              <div className="bg-slate-50 p-3 border border-slate-100 text-center">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Статус</div>
                <div className="text-[10px] font-black text-emerald-500 uppercase">В СЕТИ</div>
              </div>
              <div className="bg-slate-50 p-3 border border-slate-100 text-center">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Синхронизация</div>
                <div className="text-[10px] font-black text-slate-700 uppercase">ОК 99.9%</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openStock(w)}
                className="h-9 border border-retail-border text-[9px] font-black uppercase tracking-widest hover:bg-retail-blue hover:text-white hover:border-retail-blue transition-colors flex items-center justify-center gap-1"
              >
                <Boxes size={12} /> ОБЗОР
              </button>
              <button
                onClick={() => openTransfer(w)}
                className="h-9 border border-retail-border text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
              >
                <ArrowRightLeft size={12} /> ПЕРЕВОД
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Movements log */}
      <div className="bg-white border border-retail-border flex flex-col">
        <div className="flex justify-between items-center p-4 bg-slate-900 text-white">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest">Движение товаров</h3>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-tight">Логистические операции по всей сети</p>
          </div>
          <span className="text-[9px] font-bold text-slate-400">{movements.length} записей</span>
        </div>

        <div className="min-h-[300px]">
          {movements.length > 0 ? (
            <table className="retail-table w-full">
              <thead>
                <tr>
                  <th className="text-left">ТИП</th>
                  <th className="text-left">АРТИКУЛ</th>
                  <th className="text-left text-center">ОТКУДА</th>
                  <th className="text-left text-center">КУДА</th>
                  <th className="text-right">КОЛ-ВО</th>
                  <th className="text-right pr-6">ВРЕМЯ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-retail-border">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-0.5",
                        m.type === 'SALE' && 'text-retail-blue',
                        m.type === 'SUPPLY' && 'text-emerald-600',
                        m.type === 'TRANSFER' && 'text-amber-600',
                        m.type === 'RETURN' && 'text-rose-500',
                      )}>{m.type}</span>
                    </td>
                    <td className="font-bold text-slate-900">{m.variation.sku}</td>
                    <td className="text-center font-mono text-[9px] text-slate-400">{m.fromWarehouse?.name || 'EXTERNAL'}</td>
                    <td className="text-center font-mono text-[9px] text-slate-400">{m.toWarehouse?.name || 'EXTERNAL'}</td>
                    <td className={cn("text-right font-black", m.type === 'SALE' ? 'text-rose-500' : 'text-emerald-600')}>
                      {m.type === 'SALE' ? '-' : '+'}{m.quantity}
                    </td>
                    <td className="text-right pr-6 text-[10px] font-bold text-slate-400">
                      {new Date(m.createdAt).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center opacity-20">
              <RefreshCw size={48} strokeWidth={1} className="mb-4" />
              <p className="font-black text-sm uppercase tracking-widest text-center">ДАННЫЕ О ПЕРЕМЕЩЕНИЯХ<br />ОТСУТСТВУЮТ</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Stock Обзор Modal ─────────────────────────────────────────── */}
      {stockWarehouse && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl border border-retail-border shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">
                  СКЛАД: {stockWarehouse.name}
                </h3>
                <p className="text-[9px] text-slate-400 mt-0.5 uppercase">Остатки по всем SKU</p>
              </div>
              <button onClick={() => setStockWarehouse(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-retail-border">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <Input
                  autoFocus
                  placeholder="Поиск по артикулу, названию или цвету..."
                  value={stockSearch}
                  onChange={(e) => setStockSearch(e.target.value)}
                  className="h-9 pl-9 rounded-none border-retail-border text-sm font-bold"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {stockLoading ? (
                <div className="p-12 text-center text-[10px] font-black text-slate-400 uppercase animate-pulse">ЗАГРУЗКА...</div>
              ) : filteredStock.length === 0 ? (
                <div className="p-12 flex flex-col items-center opacity-20 gap-3">
                  <Package size={40} strokeWidth={1} />
                  <p className="text-[10px] font-black uppercase tracking-widest">ТОВАРОВ НЕТ</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-white border-b border-retail-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-[9px] font-black text-slate-400 uppercase">Товар</th>
                      <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 uppercase w-20">Размер</th>
                      <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 uppercase w-24">Цвет</th>
                      <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase w-24">Цена</th>
                      <th className="px-4 py-2 text-right text-[9px] font-black text-slate-400 uppercase w-24">Остаток</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-retail-border">
                    {filteredStock.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <div className="text-[10px] font-black text-slate-900 uppercase">{e.variation.product.name}</div>
                          <div className="text-[9px] font-bold text-slate-400 font-mono">{e.variation.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-600">{e.variation.size}</td>
                        <td className="px-3 py-2 text-center text-[10px] font-bold text-slate-600">{e.variation.color}</td>
                        <td className="px-3 py-2 text-right text-[10px] font-black text-retail-blue">₽{e.variation.salePrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">
                          <span className={cn(
                            "text-sm font-black",
                            e.quantity === 0 ? 'text-red-500' : e.quantity <= 3 ? 'text-amber-500' : 'text-emerald-600'
                          )}>
                            {e.quantity}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-3 border-t border-retail-border bg-slate-50 flex justify-between items-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase">
                Позиций: {filteredStock.length} · Единиц: {filteredStock.reduce((s, e) => s + e.quantity, 0)}
              </span>
              <button
                onClick={() => setStockWarehouse(null)}
                className="h-9 px-6 border border-retail-border text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                ЗАКРЫТЬ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer Modal ────────────────────────────────────────────── */}
      {transferOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg border border-retail-border shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">ПЕРЕМЕЩЕНИЕ ТОВАРА</h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Перевод между складами сети</p>
              </div>
              <button onClick={() => setTransferOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* From / To */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Откуда *</label>
                  <select
                    value={transferFrom}
                    onChange={(e) => { setTransferFrom(e.target.value); setTransferVariationId(''); }}
                    className="w-full h-10 px-3 border border-retail-border text-sm font-bold bg-white"
                  >
                    <option value="">— склад —</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Куда *</label>
                  <select
                    value={transferTo}
                    onChange={(e) => setTransferTo(e.target.value)}
                    className="w-full h-10 px-3 border border-retail-border text-sm font-bold bg-white"
                  >
                    <option value="">— склад —</option>
                    {warehouses.filter((w) => w.id !== transferFrom).map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Product search */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Товар *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <Input
                    placeholder="Поиск по артикулу или названию..."
                    value={fromStockSearch}
                    onChange={(e) => setFromStockSearch(e.target.value)}
                    className="h-10 pl-9 rounded-none border-retail-border text-sm font-bold"
                  />
                </div>
                {fromStockSearch && filteredFromStock.length > 0 && (
                  <div className="border border-retail-border max-h-40 overflow-y-auto">
                    {filteredFromStock.map((e) => (
                      <button
                        key={e.variation.id}
                        onClick={() => { setTransferVariationId(e.variation.id); setFromStockSearch(''); }}
                        className="w-full px-4 py-2 flex justify-between items-center hover:bg-slate-50 text-left border-b border-retail-border last:border-0"
                      >
                        <div>
                          <div className="text-[10px] font-black text-slate-900 uppercase">{e.variation.product.name}</div>
                          <div className="text-[9px] text-slate-400">{e.variation.sku} · {e.variation.size} · {e.variation.color}</div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600">{e.quantity} шт.</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedVariation && (
                  <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black text-emerald-800 uppercase">{selectedVariation.variation.product.name}</span>
                      <span className="text-[9px] text-emerald-600 ml-2">{selectedVariation.variation.sku}</span>
                    </div>
                    <button onClick={() => setTransferVariationId('')} className="text-emerald-400 hover:text-red-500">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Количество * {selectedVariation && <span className="text-slate-300">(макс. {maxQty})</span>}
                </label>
                <input
                  type="number"
                  min={1}
                  max={maxQty || undefined}
                  value={transferQty}
                  onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-10 px-3 border border-retail-border text-sm font-black text-center focus:ring-retail-blue focus:border-retail-blue"
                />
              </div>

              {transferError && (
                <p className="text-xs font-bold text-red-500">{transferError}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-retail-border flex justify-between items-center bg-slate-50">
              <button
                onClick={() => setTransferOpen(false)}
                className="h-10 px-6 border border-retail-border font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                ОТМЕНА
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferSaving || !transferFrom || !transferTo || !transferVariationId}
                className={cn(
                  "h-10 px-8 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors",
                  transferSaving || !transferFrom || !transferTo || !transferVariationId
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-retail-blue text-white hover:bg-[#0066cc]'
                )}
              >
                {transferSaving
                  ? <><RefreshCw size={12} className="animate-spin" /> ВЫПОЛНЕНИЕ...</>
                  : <><Check size={12} /> ПЕРЕМЕСТИТЬ</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
