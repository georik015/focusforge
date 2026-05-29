import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Package,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

interface Variation {
  id: string;
  sku: string;
  size: string;
  color: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  lowStockThreshold: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  category: { id: string; name: string };
  brand: { id: string; name: string };
  variations: Variation[];
}

interface Category { id: string; name: string }
interface Brand { id: string; name: string }

type SortKey = 'name' | 'price_asc' | 'price_desc' | 'stock_desc';
type StockFilter = 'all' | 'in_stock' | 'low' | 'out';

const COLOR_HEX: Record<string, string> = {
  'чёрный': '#1e293b', 'черный': '#1e293b', 'black': '#1e293b',
  'белый': '#f8fafc', 'white': '#f8fafc',
  'серый': '#94a3b8', 'серый меланж': '#94a3b8', 'тёмно-серый': '#475569',
  'тёмно-синий': '#1e3a5f', 'синий': '#3b82f6', 'синий деним': '#4a7cb5', 'тёмный деним': '#2d3f5a',
  'бежевый': '#d4b896', 'молочный': '#f5f0e8',
  'хаки': '#6b7c45', 'оливковый': '#708238',
  'коричневый': '#92400e',
  'красный': '#dc2626', 'бордовый': '#881337', 'тёмно-бордовый': '#7f1d1d',
  'горчичный': '#ca8a04', 'жёлтый': '#eab308',
  'розовый': '#f472b6', 'пыльно-розовый': '#e9a0b8',
  'синяя клетка': '#3b5998', 'зелёная клетка': '#2d6a4f', 'красная клетка': '#8b1a1a',
  'голубой': '#60a5fa', 'светло-серый': '#cbd5e1',
};

function getColorHex(color: string): string {
  return COLOR_HEX[color.toLowerCase()] ?? '#94a3b8';
}

export function Catalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Product[]>('/products'),
      api.get<Category[]>('/products/categories'),
      api.get<Brand[]>('/products/brands'),
    ]).then(([prods, cats, brnds]) => {
      setProducts(prods);
      setCategories(cats);
      setBrands(brnds);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = products.filter(p => p.isActive);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.brand.name.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q) ||
        p.variations.some(v => v.sku.toLowerCase().includes(q))
      );
    }

    if (selectedCategory) list = list.filter(p => p.category.id === selectedCategory);
    if (selectedBrand) list = list.filter(p => p.brand.id === selectedBrand);

    if (stockFilter === 'in_stock') list = list.filter(p => p.variations.some(v => v.stock > 0));
    else if (stockFilter === 'low') list = list.filter(p => p.variations.some(v => v.stock > 0 && v.stock <= v.lowStockThreshold));
    else if (stockFilter === 'out') list = list.filter(p => p.variations.every(v => v.stock === 0));

    list = [...list].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sortKey === 'price_asc') return Math.min(...a.variations.map(v => v.salePrice)) - Math.min(...b.variations.map(v => v.salePrice));
      if (sortKey === 'price_desc') return Math.min(...b.variations.map(v => v.salePrice)) - Math.min(...a.variations.map(v => v.salePrice));
      if (sortKey === 'stock_desc') return b.variations.reduce((s, v) => s + v.stock, 0) - a.variations.reduce((s, v) => s + v.stock, 0);
      return 0;
    });

    return list;
  }, [products, search, selectedCategory, selectedBrand, stockFilter, sortKey]);

  const activeFilterCount = [selectedCategory, selectedBrand, stockFilter !== 'all' ? '1' : ''].filter(Boolean).length;

  const totalInStock = products.reduce((s, p) => s + p.variations.filter(v => v.stock > 0).length, 0);
  const totalLow = products.reduce((s, p) => s + p.variations.filter(v => v.stock > 0 && v.stock <= v.lowStockThreshold).length, 0);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="bg-white border border-retail-border animate-pulse">
            <div className="h-64 bg-slate-100" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-4 bg-slate-100 rounded" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-retail-blue shrink-0" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Каталог товаров</h2>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{filtered.length} позиций</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по названию, SKU, бренду..."
              className="w-full h-10 pl-9 pr-4 border border-retail-border bg-white text-sm font-medium focus:outline-none focus:border-retail-blue text-slate-800 placeholder:text-slate-400"
            />
          </div>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={cn(
              "h-10 px-3 border flex items-center gap-2 text-xs font-black uppercase tracking-wider transition-colors shrink-0",
              isFilterOpen ? "bg-retail-blue text-white border-retail-blue" : "bg-white border-retail-border text-slate-600 hover:border-retail-blue"
            )}
          >
            <SlidersHorizontal size={14} />
            Фильтр
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {isFilterOpen && (
        <div className="bg-white border border-retail-border p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Категория</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="w-full h-9 border border-retail-border bg-white text-xs font-bold text-slate-700 px-2 focus:outline-none focus:border-retail-blue">
              <option value="">Все категории</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Бренд</label>
            <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
              className="w-full h-9 border border-retail-border bg-white text-xs font-bold text-slate-700 px-2 focus:outline-none focus:border-retail-blue">
              <option value="">Все бренды</option>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Наличие</label>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value as StockFilter)}
              className="w-full h-9 border border-retail-border bg-white text-xs font-bold text-slate-700 px-2 focus:outline-none focus:border-retail-blue">
              <option value="all">Все</option>
              <option value="in_stock">В наличии</option>
              <option value="low">Мало остатков</option>
              <option value="out">Нет в наличии</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Сортировка</label>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
              className="w-full h-9 border border-retail-border bg-white text-xs font-bold text-slate-700 px-2 focus:outline-none focus:border-retail-blue">
              <option value="name">По названию А–Я</option>
              <option value="price_asc">Цена ↑</option>
              <option value="price_desc">Цена ↓</option>
              <option value="stock_desc">Остаток ↓</option>
            </select>
          </div>
          {activeFilterCount > 0 && (
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button onClick={() => { setSelectedCategory(''); setSelectedBrand(''); setStockFilter('all'); }}
                className="text-[10px] font-black text-red-500 uppercase tracking-wider flex items-center gap-1 hover:text-red-700">
                <X size={12} /> Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-retail-border p-3">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Позиций в каталоге</div>
          <div className="text-2xl font-black text-slate-900">{products.length}</div>
        </div>
        <div className="bg-white border border-retail-border p-3">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">SKU в наличии</div>
          <div className="text-2xl font-black text-emerald-600">{totalInStock}</div>
        </div>
        <div className="bg-white border border-retail-border p-3">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Критический остаток</div>
          <div className="text-2xl font-black text-red-500">{totalLow}</div>
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-retail-border p-16 text-center">
          <Package size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1} />
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Товары не найдены</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(product => (
            <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          products={filtered}
          onClose={() => setSelectedProduct(null)}
          onNavigate={setSelectedProduct}
        />
      )}
    </div>
  );
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const [imgError, setImgError] = useState(false);
  const totalStock = product.variations.reduce((s, v) => s + v.stock, 0);
  const prices = product.variations.map(v => v.salePrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const isLow = totalStock > 0 && product.variations.some(v => v.stock > 0 && v.stock <= v.lowStockThreshold);
  const isOut = totalStock === 0;
  const uniqueColors = [...new Set(product.variations.map(v => v.color))];
  const uniqueSizes = [...new Set(product.variations.map(v => v.size))].slice(0, 5);

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white border cursor-pointer group hover:shadow-lg transition-all duration-200 flex flex-col",
        isOut ? "border-red-200" : isLow ? "border-amber-200" : "border-retail-border hover:border-retail-blue"
      )}
    >
      {/* Product Image */}
      <div className="relative overflow-hidden bg-slate-50 aspect-[3/4]">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-4">
            <Package size={40} className="text-slate-200" strokeWidth={1} />
            <div className="flex gap-1 flex-wrap justify-center">
              {uniqueColors.slice(0, 6).map(color => (
                <div key={color} className="w-4 h-4 rounded-full border border-white shadow-sm"
                  style={{ backgroundColor: getColorHex(color) }} title={color} />
              ))}
            </div>
          </div>
        )}

        {/* Stock badge */}
        <div className="absolute top-2 left-2">
          {isOut ? (
            <span className="text-[8px] font-black bg-red-600 text-white px-2 py-0.5 uppercase tracking-wider">Нет</span>
          ) : isLow ? (
            <span className="text-[8px] font-black bg-amber-400 text-white px-2 py-0.5 uppercase tracking-wider">Мало</span>
          ) : null}
        </div>

        {/* Category badge */}
        <div className="absolute bottom-2 left-2">
          <span className="text-[7px] font-black bg-black/60 text-white px-1.5 py-0.5 uppercase tracking-wider backdrop-blur-sm">
            {product.category.name}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider leading-none">
          {product.brand.name}
        </div>
        <div className="font-black text-slate-900 text-[13px] leading-snug group-hover:text-retail-blue transition-colors line-clamp-2">
          {product.name}
        </div>

        {/* Colors */}
        <div className="flex gap-1 flex-wrap mt-0.5">
          {uniqueColors.slice(0, 6).map(color => (
            <div key={color} className="w-3.5 h-3.5 rounded-full border border-slate-200 shadow-sm"
              style={{ backgroundColor: getColorHex(color) }} title={color} />
          ))}
          {uniqueColors.length > 6 && (
            <span className="text-[8px] font-black text-slate-400">+{uniqueColors.length - 6}</span>
          )}
        </div>

        {/* Sizes preview */}
        <div className="flex gap-1 flex-wrap">
          {uniqueSizes.map(s => (
            <span key={s} className="text-[8px] font-black border border-slate-200 px-1 py-0.5 text-slate-500 uppercase">{s}</span>
          ))}
          {product.variations.length > uniqueSizes.length && (
            <span className="text-[8px] font-black text-slate-400 self-center">…</span>
          )}
        </div>

        {/* Price */}
        <div className="mt-auto pt-1 flex items-end justify-between">
          <div className="text-retail-blue font-black text-base leading-none">
            {minPrice === maxPrice
              ? `₽${minPrice.toLocaleString('ru')}`
              : `₽${minPrice.toLocaleString('ru')}+`}
          </div>
          <div className={cn("text-[10px] font-black", isOut ? "text-red-400" : isLow ? "text-amber-500" : "text-slate-400")}>
            {totalStock} ед.
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductModal({ product, products, onClose, onNavigate }: {
  product: Product;
  products: Product[];
  onClose: () => void;
  onNavigate: (p: Product) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const [activeTab, setActiveTab] = useState<'variations' | 'info'>('variations');
  const idx = products.indexOf(product);

  const totalStock = product.variations.reduce((s, v) => s + v.stock, 0);
  const prices = product.variations.map(v => v.salePrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const uniqueColors = [...new Set(product.variations.map(v => v.color))];
  const isOut = totalStock === 0;

  const goTo = (dir: -1 | 1) => {
    const next = products[idx + dir];
    if (next) { setImgError(false); setActiveTab('variations'); onNavigate(next); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Left — Image */}
        <div className="md:w-56 lg:w-72 shrink-0 bg-slate-50 relative">
          {product.imageUrl && !imgError ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-56 md:h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-56 md:h-full flex flex-col items-center justify-center gap-4 p-6">
              <Package size={56} className="text-slate-200" strokeWidth={1} />
              <div className="flex gap-2 flex-wrap justify-center">
                {uniqueColors.map(c => (
                  <div key={c} className="w-6 h-6 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: getColorHex(c) }} title={c} />
                ))}
              </div>
            </div>
          )}

          {/* Nav arrows */}
          <div className="absolute bottom-3 right-3 flex gap-1">
            <button onClick={() => goTo(-1)} disabled={idx <= 0}
              className="w-7 h-7 bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-colors">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => goTo(1)} disabled={idx >= products.length - 1}
              className="w-7 h-7 bg-black/50 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/70 transition-colors">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right — Info */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 flex items-start justify-between shrink-0">
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{product.brand.name} · {product.category.name}</div>
              <h3 className="text-lg font-black mt-1 leading-tight">{product.name}</h3>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="text-xl font-black text-white">
                  {minPrice === maxPrice ? `₽${minPrice.toLocaleString('ru')}` : `₽${minPrice.toLocaleString('ru')} – ₽${maxPrice.toLocaleString('ru')}`}
                </span>
                <span className={cn(
                  "text-[9px] font-black px-2 py-0.5 uppercase tracking-wider",
                  isOut ? "bg-red-900/50 text-red-400" : "bg-emerald-900/50 text-emerald-400"
                )}>
                  {isOut ? 'Нет в наличии' : `${totalStock} ед. на складе`}
                </span>
              </div>
              {/* Color dots */}
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {uniqueColors.map(c => (
                  <div key={c} title={c} className="w-4 h-4 rounded-full border border-slate-600"
                    style={{ backgroundColor: getColorHex(c) }} />
                ))}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors ml-3 shrink-0">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-retail-border shrink-0">
            {(['variations', 'info'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-colors",
                  activeTab === tab ? "border-b-2 border-retail-blue text-retail-blue" : "text-slate-400 hover:text-slate-600"
                )}>
                {tab === 'variations' ? 'Варианты' : 'О товаре'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'variations' && (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10">
                  <tr>
                    {['SKU', 'Размер', 'Цвет', 'Цена', 'Остаток'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-retail-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-retail-border">
                  {product.variations.map(v => {
                    const low = v.stock > 0 && v.stock <= v.lowStockThreshold;
                    const out = v.stock === 0;
                    return (
                      <tr key={v.id} className={cn("hover:bg-slate-50 transition-colors", out && "opacity-40")}>
                        <td className="px-3 py-2.5 font-mono text-[10px] text-slate-500">{v.sku}</td>
                        <td className="px-3 py-2.5 font-black text-xs">{v.size}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-200 shrink-0"
                              style={{ backgroundColor: getColorHex(v.color) }} />
                            <span className="text-xs font-medium text-slate-700 truncate max-w-[80px]">{v.color}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-black text-retail-blue text-xs">₽{v.salePrice.toLocaleString('ru')}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {out ? <AlertTriangle size={12} className="text-red-500" /> :
                             low ? <AlertTriangle size={12} className="text-amber-500" /> :
                             <CheckCircle size={12} className="text-emerald-500" />}
                            <span className={cn("font-black text-xs",
                              out ? "text-red-500" : low ? "text-amber-500" : "text-slate-800")}>
                              {v.stock}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'info' && (
              <div className="p-5 space-y-4">
                {product.description && (
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Описание</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{product.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Категория', value: product.category.name },
                    { label: 'Бренд', value: product.brand.name },
                    { label: 'Всего SKU', value: `${product.variations.length} вариаций` },
                    { label: 'На складе', value: `${totalStock} единиц` },
                    { label: 'Цена от', value: `₽${minPrice.toLocaleString('ru')}` },
                    { label: 'Размерный ряд', value: [...new Set(product.variations.map(v => v.size))].join(', ') },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 border border-retail-border p-3">
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</div>
                      <div className="font-black text-slate-900 text-sm mt-0.5">{item.value}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 border border-retail-border p-3">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Цвета</div>
                  <div className="flex gap-2 flex-wrap">
                    {uniqueColors.map(c => (
                      <div key={c} className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" style={{ backgroundColor: getColorHex(c) }} />
                        <span className="text-xs font-medium text-slate-600">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-retail-border bg-slate-50 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={11} /> {idx + 1} из {products.length}
              </span>
              <div className="flex gap-2">
                <button onClick={() => goTo(-1)} disabled={idx <= 0}
                  className="h-8 px-3 border border-retail-border bg-white text-xs font-black text-slate-600 disabled:opacity-30 hover:border-retail-blue flex items-center gap-1">
                  <ChevronLeft size={14} /> Пред.
                </button>
                <button onClick={() => goTo(1)} disabled={idx >= products.length - 1}
                  className="h-8 px-3 border border-retail-border bg-white text-xs font-black text-slate-600 disabled:opacity-30 hover:border-retail-blue flex items-center gap-1">
                  След. <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
