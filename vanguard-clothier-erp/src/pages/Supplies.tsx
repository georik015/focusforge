import { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  Package,
  X,
  ChevronDown,
  ChevronRight,
  Check,
  RefreshCw,
  Building2,
  Calendar,
  Hash,
  Boxes,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
  address?: string;
}

interface SupplyItem {
  variationId: string;
  sku: string;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  costPrice: number;
}

interface Supply {
  id: string;
  createdAt: string;
  totalCost: number;
  supplier: Supplier;
  items: {
    id: string;
    quantity: number;
    costPrice: number;
    variation: {
      sku: string;
      size: string;
      color: string;
      product: { name: string };
    };
  }[];
}

interface ProductVariation {
  id: string;
  sku: string;
  size: string;
  color: string;
  purchasePrice: number;
  stock: number;
  product: { name: string };
}

export function Supplies() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [cartItems, setCartItems] = useState<SupplyItem[]>([]);
  const [itemSearch, setItemSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProductVariation[]>([]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [supplyList, supplierList, variationList] = await Promise.all([
        api.get<Supply[]>('/supplies'),
        api.get<Supplier[]>('/supplies/suppliers'),
        api.get<ProductVariation[]>('/products/variations'),
      ]);
      setSupplies(supplyList);
      setSuppliers(supplierList);
      setVariations(variationList);
    } catch (err) {
      console.error('Failed to load supplies data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Item search filtering
  useEffect(() => {
    if (itemSearch.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const q = itemSearch.toLowerCase();
    setSearchResults(
      variations
        .filter(
          (v) =>
            v.sku.toLowerCase().includes(q) ||
            v.product.name.toLowerCase().includes(q) ||
            v.color.toLowerCase().includes(q)
        )
        .slice(0, 8)
    );
  }, [itemSearch, variations]);

  const addItemToCart = (v: ProductVariation) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.variationId === v.id);
      if (existing) {
        return prev.map((i) =>
          i.variationId === v.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          variationId: v.id,
          sku: v.sku,
          productName: v.product.name,
          size: v.size,
          color: v.color,
          quantity: 1,
          costPrice: v.purchasePrice,
        },
      ];
    });
    setItemSearch('');
    setSearchResults([]);
  };

  const updateItem = (variationId: string, field: 'quantity' | 'costPrice', value: number) => {
    setCartItems((prev) =>
      prev.map((i) => (i.variationId === variationId ? { ...i, [field]: value } : i))
    );
  };

  const removeItem = (variationId: string) => {
    setCartItems((prev) => prev.filter((i) => i.variationId !== variationId));
  };

  const openModal = () => {
    setSelectedSupplierId('');
    setNewSupplierName('');
    setIsCreatingSupplier(false);
    setCartItems([]);
    setItemSearch('');
    setSearchResults([]);
    setIsModalOpen(true);
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;
    try {
      const supplier = await api.post<Supplier>('/supplies/suppliers', { name: newSupplierName.trim() });
      setSuppliers((prev) => [...prev, supplier]);
      setSelectedSupplierId(supplier.id);
      setIsCreatingSupplier(false);
      setNewSupplierName('');
    } catch {
      alert('Поставщик с таким названием уже существует');
    }
  };

  const totalCost = cartItems.reduce((sum, i) => sum + i.quantity * i.costPrice, 0);

  const handleSubmit = async () => {
    if (!selectedSupplierId) { alert('Выберите поставщика'); return; }
    if (!cartItems.length) { alert('Добавьте хотя бы один товар'); return; }

    setIsSaving(true);
    try {
      await api.post('/supplies', {
        supplierId: selectedSupplierId,
        items: cartItems.map((i) => ({
          variationId: i.variationId,
          quantity: i.quantity,
          costPrice: i.costPrice,
        })),
      });
      setIsModalOpen(false);
      await fetchAll();
    } catch {
      alert('Ошибка при создании поставки');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-[10px] font-black uppercase tracking-widest text-slate-400 animate-pulse italic">
        ЗАГРУЗКА ДАННЫХ О ПОСТАВКАХ...
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12 retail-density animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-retail-border p-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">
            Управление поставками
          </h2>
          <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-0.5">
            Приёмка товара и обновление складских остатков
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchAll}
            variant="outline"
            className="h-10 px-4 rounded-none border-retail-border font-black text-[10px] uppercase tracking-widest gap-2"
          >
            <RefreshCw size={14} /> ОБНОВИТЬ
          </Button>
          <Button
            onClick={openModal}
            className="h-10 bg-retail-blue hover:bg-[#0066cc] text-white px-6 rounded-none font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
          >
            <Plus size={14} /> СОЗДАТЬ ПОСТАВКУ
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-retail-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-retail-blue text-white flex items-center justify-center">
            <Truck size={18} />
          </div>
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Всего поставок</div>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">{supplies.length}</div>
          </div>
        </div>
        <div className="bg-white border border-retail-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 text-slate-500 flex items-center justify-center">
            <Building2 size={18} />
          </div>
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Поставщиков</div>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">{suppliers.length}</div>
          </div>
        </div>
        <div className="bg-white border border-retail-border p-4 flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 text-slate-500 flex items-center justify-center">
            <Boxes size={18} />
          </div>
          <div>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Позиций принято</div>
            <div className="text-2xl font-black text-slate-900 tracking-tighter">
              {supplies.reduce((sum, s) => sum + s.items.length, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Supply list */}
      <div className="bg-white border border-retail-border">
        <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest">История поставок</h3>
          <span className="text-[9px] font-bold text-slate-400">{supplies.length} записей</span>
        </div>

        {supplies.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center opacity-20 gap-4">
            <Truck size={48} strokeWidth={1} />
            <p className="text-[10px] font-black uppercase tracking-widest">ПОСТАВКИ ОТСУТСТВУЮТ</p>
          </div>
        ) : (
          <div className="divide-y divide-retail-border">
            {supplies.map((supply) => (
              <div key={supply.id}>
                <button
                  onClick={() => setExpandedId(expandedId === supply.id ? null : supply.id)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-slate-100 flex items-center justify-center">
                      {expandedId === supply.id
                        ? <ChevronDown size={14} className="text-retail-blue" />
                        : <ChevronRight size={14} className="text-slate-400" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-slate-900 uppercase">
                          {supply.supplier.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 font-mono">
                          #{supply.id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-0.5">
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Calendar size={9} />
                          {new Date(supply.createdAt).toLocaleString('ru-RU')}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                          <Hash size={9} />
                          {supply.items.length} позиций
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-900 italic">
                      ₽{supply.totalCost.toLocaleString('ru-RU')}
                    </div>
                    <div className="text-[8px] font-black text-slate-400 uppercase">СУММА ЗАКУПКИ</div>
                  </div>
                </button>

                {expandedId === supply.id && (
                  <div className="border-t border-retail-border bg-slate-50 px-4 py-3">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Артикул</th>
                          <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">Товар</th>
                          <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Размер</th>
                          <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Цвет</th>
                          <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Кол-во</th>
                          <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Цена закупки</th>
                          <th className="pb-2 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Итого</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {supply.items.map((item) => (
                          <tr key={item.id} className="hover:bg-white transition-colors">
                            <td className="py-2 font-mono text-[10px] font-bold text-retail-blue">{item.variation.sku}</td>
                            <td className="py-2 text-[10px] font-bold text-slate-900 uppercase">{item.variation.product.name}</td>
                            <td className="py-2 text-[10px] font-bold text-slate-600 text-center">{item.variation.size}</td>
                            <td className="py-2 text-[10px] font-bold text-slate-600 text-center">{item.variation.color}</td>
                            <td className="py-2 text-[10px] font-black text-emerald-600 text-right">+{item.quantity}</td>
                            <td className="py-2 text-[10px] font-bold text-slate-700 text-right">₽{item.costPrice.toLocaleString()}</td>
                            <td className="py-2 text-[10px] font-black text-slate-900 text-right">₽{(item.quantity * item.costPrice).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Supply Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-3xl border border-retail-border shadow-2xl my-4">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">НОВАЯ ПОСТАВКА</h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                  Приёмка товара — остатки обновятся автоматически
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Supplier selection */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Поставщик *
                </label>
                {!isCreatingSupplier ? (
                  <div className="flex gap-2">
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="flex-1 h-10 px-3 border border-retail-border text-sm font-bold bg-white focus:ring-retail-blue focus:border-retail-blue"
                    >
                      <option value="">— выберите поставщика —</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setIsCreatingSupplier(true)}
                      className="h-10 px-4 border border-retail-border text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-colors whitespace-nowrap flex items-center gap-2"
                    >
                      <Plus size={12} /> Новый
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Название поставщика"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateSupplier()}
                      className="flex-1 h-10 rounded-none border-retail-border text-sm font-bold"
                      autoFocus
                    />
                    <button
                      onClick={handleCreateSupplier}
                      className="h-10 px-4 bg-retail-blue text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <Check size={12} /> Создать
                    </button>
                    <button
                      onClick={() => setIsCreatingSupplier(false)}
                      className="h-10 px-3 border border-retail-border text-slate-400 hover:bg-slate-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Item search */}
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Добавить товар (поиск по артикулу или названию)
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                  <Input
                    placeholder="Введите артикул или название..."
                    value={itemSearch}
                    onChange={(e) => setItemSearch(e.target.value)}
                    className="h-10 pl-10 rounded-none border-retail-border text-sm font-bold"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 bg-white border border-retail-border shadow-xl max-h-64 overflow-y-auto">
                      {searchResults.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => addItemToCart(v)}
                          className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 text-left transition-colors border-b border-retail-border last:border-0"
                        >
                          <div>
                            <div className="text-[10px] font-black text-slate-900 uppercase">{v.product.name}</div>
                            <div className="text-[9px] font-bold text-slate-400 mt-0.5">
                              {v.sku} · {v.size} · {v.color}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-black text-retail-blue">₽{v.purchasePrice}</div>
                            <div className="text-[9px] text-slate-400">ост. {v.stock}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Cart */}
              {cartItems.length > 0 && (
                <div className="border border-retail-border">
                  <div className="bg-slate-100 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    Позиции поставки ({cartItems.length})
                  </div>
                  <table className="w-full">
                    <thead className="border-b border-retail-border">
                      <tr>
                        <th className="px-4 py-2 text-left text-[9px] font-black text-slate-400 uppercase">Товар</th>
                        <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase text-center w-24">Кол-во</th>
                        <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase text-right w-32">Цена закупки</th>
                        <th className="px-3 py-2 text-[9px] font-black text-slate-400 uppercase text-right w-28">Сумма</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-retail-border">
                      {cartItems.map((item) => (
                        <tr key={item.variationId} className="hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <div className="text-[10px] font-black text-slate-900 uppercase leading-none">{item.productName}</div>
                            <div className="text-[9px] font-bold text-slate-400 mt-0.5">{item.sku} · {item.size} · {item.color}</div>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateItem(item.variationId, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-20 h-8 text-center border border-retail-border text-xs font-black focus:ring-retail-blue focus:border-retail-blue mx-auto block"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={item.costPrice}
                              onChange={(e) => updateItem(item.variationId, 'costPrice', parseFloat(e.target.value) || 0)}
                              className="w-28 h-8 text-right border border-retail-border text-xs font-black focus:ring-retail-blue focus:border-retail-blue ml-auto block pr-2"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-[11px] font-black text-slate-900">
                            ₽{(item.quantity * item.costPrice).toLocaleString('ru-RU', { minimumFractionDigits: 0 })}
                          </td>
                          <td className="pr-3">
                            <button onClick={() => removeItem(item.variationId)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                              <X size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-retail-border">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          ИТОГО К ОПЛАТЕ ПОСТАВЩИКУ
                        </td>
                        <td className="px-3 py-3 text-right text-lg font-black text-slate-900 italic">
                          ₽{totalCost.toLocaleString('ru-RU')}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {cartItems.length === 0 && (
                <div className="border border-dashed border-retail-border h-24 flex items-center justify-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    <Package size={14} className="inline mr-2 opacity-50" />
                    Добавьте товары через поиск выше
                  </p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-retail-border flex justify-between items-center bg-slate-50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-10 px-6 border border-retail-border font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-colors"
              >
                ОТМЕНА
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving || !selectedSupplierId || cartItems.length === 0}
                className={cn(
                  'h-10 px-8 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-colors',
                  isSaving || !selectedSupplierId || cartItems.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-retail-blue text-white hover:bg-[#0066cc]'
                )}
              >
                {isSaving
                  ? <><RefreshCw size={12} className="animate-spin" /> СОХРАНЕНИЕ...</>
                  : <><Check size={12} /> ПРИНЯТЬ ПОСТАВКУ</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
