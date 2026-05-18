import { useState, useEffect } from 'react';
import { Plus, Edit, ToggleLeft, ToggleRight, Globe, X, Check, Tag, Search, Image } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface Brand {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  country: string | null;
  isActive: boolean;
  _count?: { products: number };
}

interface BrandForm {
  name: string;
  logoUrl: string;
  description: string;
  country: string;
}

const EMPTY_FORM: BrandForm = { name: '', logoUrl: '', description: '', country: '' };

export function Brands() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [form, setForm] = useState<BrandForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const data = await api.get<Brand[]>('/products/brands');
      // Get product counts
      const withCounts = await api.get<Brand[]>('/products/brands?withCount=1').catch(() => data);
      setBrands(Array.isArray(withCounts) ? withCounts : data);
    } catch {
      setBrands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSaveError('');
    setModalOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setForm({
      name: brand.name,
      logoUrl: brand.logoUrl ?? '',
      description: brand.description ?? '',
      country: brand.country ?? '',
    });
    setSaveError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setSaveError('Название бренда обязательно');
    setSaving(true);
    setSaveError('');
    try {
      const body = {
        name: form.name.trim(),
        logoUrl: form.logoUrl.trim() || null,
        description: form.description.trim() || null,
        country: form.country.trim() || null,
      };
      if (editing) {
        const updated = await api.put<Brand>(`/products/brands/${editing.id}`, body);
        setBrands(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
      } else {
        const created = await api.post<Brand>('/products/brands', body);
        setBrands(prev => [created, ...prev]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (brand: Brand) => {
    try {
      await api.put<Brand>(`/products/brands/${brand.id}`, { isActive: !brand.isActive });
      setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, isActive: !brand.isActive } : b));
    } catch {
      console.error('Failed to toggle brand');
    }
  };

  const filtered = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.country ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const active = brands.filter(b => b.isActive).length;
  const inactive = brands.filter(b => !b.isActive).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Бренды</h2>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">
            Управление портфелем брендов
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-indigo-600 text-white rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <Plus size={16} /> Добавить бренд
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Всего брендов" value={brands.length} color="text-slate-900" />
        <StatCard label="Активных" value={active} color="text-emerald-600" />
        <StatCard label="Архивных" value={inactive} color="text-red-500" />
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по бренду или стране..."
          className="w-full pl-10 pr-4 h-10 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Brands grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-slate-100 animate-pulse rounded-3xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-300">
          <Tag size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-black text-xs uppercase tracking-widest">
            {search ? 'Ничего не найдено' : 'Бренды отсутствуют'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map(brand => (
              <motion.div
                key={brand.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`bg-white rounded-3xl border p-6 group transition-all hover:shadow-md ${brand.isActive ? 'border-slate-100' : 'border-dashed border-slate-200 opacity-60'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  {/* Logo or initial */}
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-contain p-1" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ) : (
                      <span className="font-black text-lg text-slate-400">{brand.name.charAt(0)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={() => openEdit(brand)}
                      className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Редактировать"
                    >
                      <Edit size={15} />
                    </button>
                    <button
                      onClick={() => handleToggle(brand)}
                      className={`p-2 rounded-xl transition-colors ${brand.isActive ? 'hover:bg-red-50 text-emerald-500 hover:text-red-500' : 'hover:bg-emerald-50 text-slate-300 hover:text-emerald-500'}`}
                      title={brand.isActive ? 'Архивировать' : 'Восстановить'}
                    >
                      {brand.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-slate-900 text-sm">{brand.name}</h3>
                    {!brand.isActive && (
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg bg-red-50 text-red-400">Архив</span>
                    )}
                  </div>
                  {brand.country && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mb-2">
                      <Globe size={11} />
                      {brand.country}
                    </div>
                  )}
                  {brand.description && (
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{brand.description}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-md border border-slate-100 shadow-2xl rounded-[32px] overflow-hidden"
          >
            <div className="flex items-center justify-between p-8 border-b border-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {editing ? 'Редактировать бренд' : 'Новый бренд'}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {editing ? editing.name : 'Добавить в каталог'}
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:text-red-500 transition-colors">
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
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Название бренда *</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nike, Zara, H&M..."
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5"><Image size={11} /> URL логотипа</span>
                </label>
                <Input
                  value={form.logoUrl}
                  onChange={e => setForm(f => ({ ...f, logoUrl: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold text-xs"
                />
                {form.logoUrl && (
                  <div className="mt-2 w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden">
                    <img src={form.logoUrl} alt="preview" className="w-full h-full object-contain p-2"
                      onError={e => { (e.target as HTMLImageElement).src = ''; }} />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  <span className="flex items-center gap-1.5"><Globe size={11} /> Страна производства</span>
                </label>
                <Input
                  value={form.country}
                  onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="Россия, Италия, Турция..."
                  className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Описание</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Краткое описание бренда..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 rounded-xl text-sm font-bold text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div className="flex gap-3 p-8 pt-0">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-sm gap-2"
              >
                {saving
                  ? <span className="animate-pulse">Сохранение...</span>
                  : <><Check size={16} /> {editing ? 'Сохранить' : 'Создать бренд'}</>
                }
              </Button>
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="px-6 h-12 rounded-xl border-slate-200 font-black text-sm"
              >
                Отмена
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6">
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-3xl font-black ${color}`}>{value}</div>
    </div>
  );
}
