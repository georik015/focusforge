import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Plus,
  Search,
  Edit,
  AlertCircle,
  Package2,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  Check,
} from 'lucide-react';
import { Product, ProductVariation, Category, Brand } from '../types';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';
import { BarcodeLabel } from '../components/BarcodeLabel';
import { useTranslation } from 'react-i18next';

interface VariationDraft {
  sku: string;
  size: string;
  color: string;
  purchasePrice: string;
  salePrice: string;
  stock: string;
  lowStockThreshold: string;
}

const emptyVariation = (): VariationDraft => ({
  sku: '',
  size: '',
  color: '',
  purchasePrice: '',
  salePrice: '',
  stock: '0',
  lowStockThreshold: '5',
});

export function Inventory() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [density, setDensity] = useState<'compact' | 'standard'>('compact');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Variation quick-edit modal
  const [editingVariation, setEditingVariation] = useState<ProductVariation | null>(null);
  const [varForm, setVarForm] = useState({ salePrice: '', purchasePrice: '', stock: '', lowStockThreshold: '' });
  const [varSaving, setVarSaving] = useState(false);
  const [varError, setVarError] = useState('');

  // Form state
  const [form, setForm] = useState({
    name: '',
    description: '',
    imageUrl: '',
    categoryId: '',
    brandId: '',
    newCategory: '',
    newBrand: '',
  });
  const [variations, setVariations] = useState<VariationDraft[]>([emptyVariation()]);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [productsData, catsData, brandsData] = await Promise.all([
        api.get<Product[]>('/products'),
        api.get<Category[]>('/products/categories'),
        api.get<Brand[]>('/products/brands'),
      ]);
      setProducts(productsData);
      setCategories(catsData);
      setBrands(brandsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditVariation = (v: ProductVariation) => {
    setEditingVariation(v);
    setVarForm({
      salePrice: String(v.salePrice),
      purchasePrice: String(v.purchasePrice),
      stock: String(v.stock),
      lowStockThreshold: String(v.lowStockThreshold),
    });
    setVarError('');
  };

  const saveVariation = async () => {
    if (!editingVariation) return;
    setVarSaving(true);
    setVarError('');
    try {
      await api.patch(`/products/variation/${editingVariation.id}`, {
        salePrice: Number(varForm.salePrice),
        purchasePrice: Number(varForm.purchasePrice),
        stock: Number(varForm.stock),
        lowStockThreshold: Number(varForm.lowStockThreshold),
      });
      setEditingVariation(null);
      await fetchAll();
    } catch (err: any) {
      setVarError(err?.message || 'Ошибка сохранения');
    } finally {
      setVarSaving(false);
    }
  };

  const openCreate = () => {
    setEditingProduct(null);
    setForm({ name: '', description: '', imageUrl: '', categoryId: '', brandId: '', newCategory: '', newBrand: '' });
    setVariations([emptyVariation()]);
    setSaveError('');
    setIsModalOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      categoryId: product.categoryId,
      brandId: product.brandId,
      newCategory: '',
      newBrand: '',
    });
    setVariations([]); // empty — only new variations to add
    setSaveError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
    setSaveError('');
  };

  const addVariation = () => setVariations(v => [...v, emptyVariation()]);
  const removeVariation = (i: number) => setVariations(v => v.filter((_, idx) => idx !== i));
  const updateVariation = (i: number, field: keyof VariationDraft, value: string) => {
    setVariations(v => v.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    setSaveError('');
    if (!form.name.trim()) return setSaveError('Укажите наименование товара');

    let categoryId = form.categoryId;
    let brandId = form.brandId;

    setSaving(true);
    try {
      if (form.newCategory.trim()) {
        const cat = await api.post<Category>('/products/categories', { name: form.newCategory.trim() });
        categoryId = cat.id;
        setCategories(prev => [...prev, cat]);
      }
      if (form.newBrand.trim()) {
        const br = await api.post<Brand>('/products/brands', { name: form.newBrand.trim() });
        brandId = br.id;
        setBrands(prev => [...prev, br]);
      }

      if (!categoryId) { setSaving(false); setSaveError('Выберите или создайте категорию'); return; }
      if (!brandId) { setSaving(false); setSaveError('Выберите или создайте бренд'); return; }

      if (editingProduct) {
        await api.put<Product>(`/products/${editingProduct.id}`, {
          name: form.name.trim(),
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim() || null,
          categoryId,
          brandId,
        });
        // Add new variations if any were defined
        for (const v of variations) {
          if (!v.sku.trim() || !v.size.trim() || !v.color.trim()) {
            setSaving(false);
            return setSaveError('Заполните Артикул, Размер и Цвет для каждой новой вариации');
          }
          await api.post(`/products/${editingProduct.id}/variations`, {
            sku: v.sku,
            size: v.size,
            color: v.color,
            purchasePrice: parseFloat(v.purchasePrice) || 0,
            salePrice: parseFloat(v.salePrice) || 0,
            stock: parseInt(v.stock) || 0,
            lowStockThreshold: parseInt(v.lowStockThreshold) || 5,
          });
        }
        await fetchAll();
      } else {
        if (variations.length === 0) return setSaveError('Добавьте хотя бы одну вариацию');
        for (const v of variations) {
          if (!v.sku.trim() || !v.size.trim() || !v.color.trim()) {
            return setSaveError('Заполните Артикул, Размер и Цвет для каждой вариации');
          }
        }
        const created = await api.post<Product>('/products', {
          name: form.name.trim(),
          description: form.description.trim(),
          imageUrl: form.imageUrl.trim() || null,
          categoryId,
          brandId,
          variations: variations.map(v => ({
            sku: v.sku,
            size: v.size,
            color: v.color,
            purchasePrice: parseFloat(v.purchasePrice) || 0,
            salePrice: parseFloat(v.salePrice) || 0,
            stock: parseInt(v.stock) || 0,
            lowStockThreshold: parseInt(v.lowStockThreshold) || 5,
          })),
        });
        setProducts(prev => [created, ...prev]);
      }

      closeModal();
    } catch (err: any) {
      setSaveError(err?.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Не удалось удалить товар. Возможно, он используется в продажах.');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.variations.some(v => v.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <InventorySkeleton t={t} />;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 border border-retail-border shadow-sm">
        <div>
          <h2 className="text-xl font-black tracking-tighter text-slate-900 uppercase">{t('inventory.title')}</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ДОСТУПНО: {filteredProducts.length} ПОЗИЦИЙ</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDensity(d => d === 'compact' ? 'standard' : 'compact')}
            className="h-10 px-4 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest border border-slate-200"
          >
            Вид: {density === 'compact' ? 'КОМПАКТНЫЙ' : 'СТАНДАРТНЫЙ'}
          </button>
          <button
            onClick={openCreate}
            className="h-10 px-6 bg-retail-blue text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-retail-blue/10 flex items-center gap-2"
          >
            <Plus size={16} /> ДОБАВИТЬ ТОВАР
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 shrink-0">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-3 text-slate-400" size={18} />
          <Input
            placeholder="ФИЛЬТР ПО АРТИКУЛУ, НАИМЕНОВАНИЮ, КАТЕГОРИИ..."
            className="pl-12 h-11 border-retail-border bg-white rounded-none text-xs font-bold uppercase"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-retail-border shadow-sm overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto custom-scrollbar max-h-[calc(100vh-280px)]">
          <table className="retail-table w-full">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="w-16">ФОТО</th>
                <th className="text-left min-w-[200px]">НАИМЕНОВАНИЕ</th>
                <th className="w-32">АРТИКУЛ</th>
                <th className="w-24">ХАР-КИ</th>
                <th className="w-24 text-right">ЦЕНА</th>
                <th className="w-32 text-center">ОСТАТОК</th>
                <th className="w-40">ШТРИХКОД</th>
                <th className="w-20 text-right pr-4">ДЕЙСТВИЯ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-retail-border">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    ТОВАРЫ НЕ НАЙДЕНЫ
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => (
                  <ProductRows
                    key={product.id}
                    product={product}
                    density={density}
                    onEdit={() => openEdit(product)}
                    onDelete={() => setDeleteConfirm(product.id)}
                    onEditVariation={openEditVariation}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 border border-retail-border shadow-2xl w-[360px]">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 mb-2">Подтвердите удаление</h3>
            <p className="text-xs text-slate-500 mb-6">Товар будет деактивирован. Историю продаж это не затронет.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 h-10 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest"
              >
                УДАЛИТЬ
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 h-10 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest"
              >
                ОТМЕНА
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-white w-full max-w-2xl border border-retail-border shadow-2xl mx-4">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b border-retail-border bg-slate-50">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                  {editingProduct ? 'РЕДАКТИРОВАТЬ ТОВАР' : 'ДОБАВИТЬ ТОВАР'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                  {editingProduct ? `ID: ${editingProduct.id.slice(0, 8).toUpperCase()}` : 'НОВАЯ ПОЗИЦИЯ В ИНВЕНТАРЕ'}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 hover:text-red-500 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {saveError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-bold px-4 py-3 uppercase">
                  {saveError}
                </div>
              )}

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Наименование *</label>
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Название товара"
                    className="h-10 rounded-none border-retail-border text-xs font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Описание</label>
                  <Input
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Краткое описание (необязательно)"
                    className="h-10 rounded-none border-retail-border text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Фото товара (URL)</label>
                  <div className="flex gap-2 items-start">
                    {form.imageUrl && (
                      <img src={form.imageUrl} alt="preview" className="w-12 h-14 object-cover border border-retail-border shrink-0" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    )}
                    <Input
                      value={form.imageUrl}
                      onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="h-10 rounded-none border-retail-border text-xs flex-1"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Категория *</label>
                  <select
                    className="w-full h-10 border border-retail-border bg-white px-3 text-xs font-bold rounded-none"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value, newCategory: '' }))}
                  >
                    <option value="">— выбрать —</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="mt-1.5">
                    <Input
                      value={form.newCategory}
                      onChange={e => setForm(f => ({ ...f, newCategory: e.target.value, categoryId: '' }))}
                      placeholder="или создать новую..."
                      className="h-8 rounded-none border-retail-border text-[10px]"
                    />
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Бренд *</label>
                  <select
                    className="w-full h-10 border border-retail-border bg-white px-3 text-xs font-bold rounded-none"
                    value={form.brandId}
                    onChange={e => setForm(f => ({ ...f, brandId: e.target.value, newBrand: '' }))}
                  >
                    <option value="">— выбрать —</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <div className="mt-1.5">
                    <Input
                      value={form.newBrand}
                      onChange={e => setForm(f => ({ ...f, newBrand: e.target.value, brandId: '' }))}
                      placeholder="или создать новый..."
                      className="h-8 rounded-none border-retail-border text-[10px]"
                    />
                  </div>
                </div>
              </div>

              {/* Variations — only on create */}
              {!editingProduct && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      ВАРИАЦИИ (размер / цвет / цена)
                    </span>
                    <button
                      onClick={addVariation}
                      className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-retail-blue hover:underline"
                    >
                      <Plus size={12} /> ДОБАВИТЬ СТРОКУ
                    </button>
                  </div>

                  <div className="border border-retail-border overflow-hidden">
                    <div className="grid grid-cols-7 bg-slate-50 border-b border-retail-border">
                      {['Артикул*', 'Размер*', 'Цвет*', 'Закуп.', 'Продажа', 'Остаток', ''].map(h => (
                        <div key={h} className="px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">{h}</div>
                      ))}
                    </div>
                    {variations.map((v, i) => (
                      <div key={i} className="grid grid-cols-7 border-b border-retail-border last:border-b-0">
                        {(['sku', 'size', 'color', 'purchasePrice', 'salePrice', 'stock'] as (keyof VariationDraft)[]).map(field => (
                          <input
                            key={field}
                            className="px-2 py-1.5 text-[10px] font-mono border-r border-retail-border last:border-r-0 bg-white focus:bg-blue-50 outline-none w-full"
                            value={v[field]}
                            onChange={e => updateVariation(i, field, e.target.value)}
                            placeholder={field === 'purchasePrice' || field === 'salePrice' ? '0' : ''}
                          />
                        ))}
                        <button
                          onClick={() => removeVariation(i)}
                          disabled={variations.length === 1}
                          className="flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors disabled:opacity-20"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editingProduct && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-retail-border px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Текущие вариации</p>
                    <div className="space-y-1">
                      {editingProduct.variations.map((v) => (
                        <div key={v.id} className="flex items-center justify-between bg-white border border-retail-border px-3 py-2">
                          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-700">
                            <span className="font-black">{v.sku}</span>
                            <span className="bg-slate-100 px-1">{v.size}</span>
                            <span className="bg-slate-100 px-1">{v.color}</span>
                            <span className="text-retail-blue font-black">₽{v.salePrice}</span>
                            <span className={cn('font-black', v.stock <= v.lowStockThreshold ? 'text-red-600' : 'text-emerald-600')}>
                              {v.stock} шт.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openEditVariation(v)}
                            className="flex items-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-retail-blue border border-retail-blue hover:bg-retail-blue hover:text-white transition-colors"
                          >
                            <Edit size={10} /> ИЗМЕНИТЬ
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border border-retail-border/60 px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Добавить новые вариации</p>
                      <button onClick={addVariation} className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-retail-blue hover:underline">
                        <Plus size={11} /> СТРОКУ
                      </button>
                    </div>
                    {variations.length > 0 && (
                      <div className="border border-retail-border overflow-hidden">
                        <div className="grid grid-cols-7 bg-slate-50 border-b border-retail-border">
                          {['Артикул*', 'Размер*', 'Цвет*', 'Закуп.', 'Продажа', 'Остаток', ''].map(h => (
                            <div key={h} className="px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400">{h}</div>
                          ))}
                        </div>
                        {variations.map((v, i) => (
                          <div key={i} className="grid grid-cols-7 border-b border-retail-border last:border-b-0">
                            {(['sku', 'size', 'color', 'purchasePrice', 'salePrice', 'stock'] as (keyof VariationDraft)[]).map(field => (
                              <input
                                key={field}
                                className="px-2 py-1.5 text-[10px] font-mono border-r border-retail-border last:border-r-0 bg-white focus:bg-blue-50 outline-none w-full"
                                value={v[field]}
                                onChange={e => updateVariation(i, field, e.target.value)}
                                placeholder={field === 'purchasePrice' || field === 'salePrice' ? '0' : ''}
                              />
                            ))}
                            <button onClick={() => removeVariation(i)} className="flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {variations.length === 0 && (
                      <p className="text-[9px] text-slate-400 font-bold">Нажмите «СТРОКУ» чтобы добавить новую вариацию к товару</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-retail-border bg-slate-50">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 h-11 bg-retail-blue text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <span className="animate-pulse">СОХРАНЕНИЕ...</span>
                ) : (
                  <><Check size={16} /> {editingProduct ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'СОЗДАТЬ ТОВАР'}</>
                )}
              </button>
              <button
                onClick={closeModal}
                className="px-6 h-11 bg-white border border-retail-border text-slate-500 text-[10px] font-black uppercase tracking-widest"
              >
                ОТМЕНА
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variation quick-edit modal */}
      {editingVariation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-retail-border w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest">Редактирование вариации</div>
                <div className="text-slate-400 text-[9px] font-mono mt-0.5">{editingVariation.sku} / {editingVariation.size} / {editingVariation.color}</div>
              </div>
              <button onClick={() => setEditingVariation(null)} className="p-1 hover:text-slate-300"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { label: 'Цена продажи (₽)', key: 'salePrice' },
                { label: 'Цена закупки (₽)', key: 'purchasePrice' },
                { label: 'Остаток (шт.)', key: 'stock' },
                { label: 'Порог тревоги (шт.)', key: 'lowStockThreshold' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">{field.label}</label>
                  <input
                    type="number"
                    min="0"
                    value={varForm[field.key as keyof typeof varForm]}
                    onChange={e => setVarForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="w-full border border-retail-border px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-retail-blue"
                  />
                </div>
              ))}
              {varError && <p className="text-[10px] text-red-600 font-bold">{varError}</p>}
            </div>
            <div className="flex gap-2 p-4 border-t border-retail-border bg-slate-50">
              <button
                onClick={saveVariation}
                disabled={varSaving}
                className="flex-1 h-10 bg-retail-blue text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <Check size={14} /> {varSaving ? 'СОХРАНЕНИЕ...' : 'СОХРАНИТЬ'}
              </button>
              <button
                onClick={() => setEditingVariation(null)}
                className="px-4 h-10 bg-white border border-retail-border text-slate-500 text-[10px] font-black uppercase tracking-widest"
              >
                ОТМЕНА
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductRows({
  product,
  density,
  onEdit,
  onDelete,
  onEditVariation,
}: {
  product: Product;
  density: 'compact' | 'standard';
  onEdit: () => void;
  onDelete: () => void;
  onEditVariation: (v: ProductVariation) => void;
}) {
  const { t } = useTranslation();
  const currency = t('common.ru_currency', '₽');

  return (
    <>
      <tr className="bg-slate-50/50">
        <td colSpan={8} className="px-3 py-1 font-black text-[9px] text-retail-blue uppercase tracking-widest border-b border-retail-border/50">
          {product.brand.name} // {product.category.name} // {product.name}
        </td>
      </tr>
      {product.variations.map((v) => (
        <tr key={v.id} className={cn('hover:bg-slate-50 transition-colors group', density === 'compact' ? 'h-8' : 'h-14')}>
          <td className="text-center">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-8 h-10 object-cover mx-auto border border-retail-border" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <Package2 size={14} className="mx-auto text-slate-300" />
            )}
          </td>
          <td className="font-bold text-slate-900 group-hover:text-retail-blue transition-colors truncate max-w-[200px]">
            {product.name}
          </td>
          <td className="font-mono text-[10px] font-bold text-slate-500 tabular-nums">{v.sku}</td>
          <td>
            <div className="flex gap-1">
              <span className="bg-slate-100 px-1 font-black text-[9px] uppercase">{v.size}</span>
              <span className="bg-slate-100 px-1 font-black text-[9px] uppercase">{v.color}</span>
            </div>
          </td>
          <td className="text-right font-black text-slate-900">
            {currency}{v.salePrice.toLocaleString()}
          </td>
          <td className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className={cn('font-black tabular-nums text-xs', v.stock <= v.lowStockThreshold ? 'text-red-600' : 'text-emerald-600')}>
                {v.stock}
              </span>
              {v.stock <= v.lowStockThreshold && <AlertCircle size={10} className="text-red-500 animate-pulse" />}
            </div>
          </td>
          <td>
            <div className="scale-75 origin-left">
              <BarcodeLabel sku={v.sku} name={product.name} price={v.salePrice} size={v.size} brand={product.brand.name} />
            </div>
          </td>
          <td className="text-right pr-4">
            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => onEditVariation(v)} className="p-1 hover:text-emerald-600 transition-colors" title="Изменить цену/остаток">
                <Edit size={14} />
              </button>
              <button onClick={onEdit} className="p-1 hover:text-retail-blue transition-colors" title="Редактировать товар">
                <Package2 size={14} />
              </button>
              <button onClick={onDelete} className="p-1 hover:text-red-500 transition-colors" title="Удалить">
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function InventorySkeleton({ t }: { t: any }) {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="p-4 text-slate-400 font-bold animate-pulse">{t('common.loading')}</div>
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="h-14 flex-1 rounded-2xl" />
        <Skeleton className="h-14 w-32 rounded-2xl" />
        <Skeleton className="h-14 w-32 rounded-2xl" />
      </div>
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-3xl" />)}
    </div>
  );
}
