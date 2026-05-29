import { useEffect, useState, useCallback } from 'react';
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react';
import ProductCard, { StorefrontProduct } from '../components/ProductCard';

interface CatalogPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onAddToCart: (product: StorefrontProduct) => void;
  initialParams?: Record<string, string>;
}

interface Category { id: string; name: string; }
interface Brand { id: string; name: string; }

const SORT_OPTIONS = [
  { value: 'newest', label: 'Новинки' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' },
  { value: 'name', label: 'По названию' },
];

const GENDER_OPTIONS = [
  { value: 'ALL', label: 'Все' },
  { value: 'FEMALE', label: 'Женское' },
  { value: 'MALE', label: 'Мужское' },
  { value: 'UNISEX', label: 'Унисекс' },
  { value: 'KIDS', label: 'Детское' },
];

interface FilterPanelProps {
  search: string; setSearch: (v: string) => void;
  gender: string; setGender: (v: string) => void;
  category: string; setCategory: (v: string) => void; categories: Category[];
  brand: string; setBrand: (v: string) => void; brands: Brand[];
  inStock: boolean; setInStock: (v: boolean) => void;
  minPrice: string; setMinPrice: (v: string) => void;
  maxPrice: string; setMaxPrice: (v: string) => void;
  hasFilters: boolean; clearFilters: () => void;
}

function FilterPanel({ search, setSearch, gender, setGender, category, setCategory, categories, brand, setBrand, brands, inStock, setInStock, minPrice, setMinPrice, maxPrice, setMaxPrice, hasFilters, clearFilters }: FilterPanelProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Поиск</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Название, бренд..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Раздел</label>
        <div className="flex flex-wrap gap-1.5">
          {GENDER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setGender(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${gender === opt.value ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Категория</label>
        <div className="space-y-1">
          <button onClick={() => setCategory('')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>Все категории</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setCategory(cat.name === category ? '' : cat.name)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === cat.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>{cat.name}</button>
          ))}
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Бренд</label>
          <div className="space-y-1">
            <button onClick={() => setBrand('')} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!brand ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>Все бренды</button>
            {brands.map(b => (
              <button key={b.id} onClick={() => setBrand(b.name === brand ? '' : b.name)} className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${brand === b.name ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>{b.name}</button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Цена, ₽</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={minPrice}
            onChange={e => setMinPrice(e.target.value)}
            placeholder="От"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-400 shrink-0">—</span>
          <input
            type="number"
            min="0"
            value={maxPrice}
            onChange={e => setMaxPrice(e.target.value)}
            placeholder="До"
            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setInStock(!inStock)} className={`relative w-10 h-5.5 rounded-full transition-colors ${inStock ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-transform ${inStock ? 'translate-x-4.5' : ''}`} />
          </div>
          <span className="text-sm text-gray-700 select-none">Только в наличии</span>
        </label>
      </div>

      {hasFilters && (
        <button onClick={clearFilters} className="w-full py-2.5 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          Сбросить фильтры
        </button>
      )}
    </div>
  );
}

export default function CatalogPage({ onNavigate, onAddToCart, initialParams }: CatalogPageProps) {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(initialParams?.search ?? '');
  const [gender, setGender] = useState(initialParams?.gender ?? 'ALL');
  const [category, setCategory] = useState(initialParams?.category ?? '');
  const [brand, setBrand] = useState('');
  const [sort, setSort] = useState(initialParams?.sort ?? 'newest');
  const [inStock, setInStock] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [fetchError, setFetchError] = useState(false);

  const fetchProducts = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setFetchError(false);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (gender && gender !== 'ALL') params.set('gender', gender);
      if (category) params.set('category', category);
      if (brand) params.set('brand', brand);
      if (sort !== 'newest') params.set('sort', sort);
      if (inStock) params.set('inStock', 'true');
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);

      const res = await fetch(`/api/public/products?${params}`, { signal });
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setFetchError(true);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [search, gender, category, brand, sort, inStock, minPrice, maxPrice]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  useEffect(() => {
    fetch('/api/public/categories')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setCategories(data); })
      .catch(() => {});
    fetch('/api/public/brands')
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setBrands(data); })
      .catch(() => {});
  }, []);

  const clearFilters = () => {
    setSearch(''); setGender('ALL'); setCategory(''); setBrand(''); setSort('newest'); setInStock(false); setMinPrice(''); setMaxPrice('');
  };
  const hasFilters = search || (gender !== 'ALL') || category || brand || inStock || sort !== 'newest' || minPrice || maxPrice;

  const filteredProducts = products.filter(p => {
    const price = (p.variations ?? []).length > 0
      ? Math.min(...(p.variations ?? []).map(v => {
          const disc = p.discount ?? 0;
          return disc > 0 ? Math.round(v.salePrice * (1 - disc / 100)) : v.salePrice;
        }))
      : 0;
    if (minPrice && price < Number(minPrice)) return false;
    if (maxPrice && price > Number(maxPrice)) return false;
    return true;
  });

  const filterProps: FilterPanelProps = {
    search, setSearch, gender, setGender, category, setCategory, categories,
    brand, setBrand, brands, inStock, setInStock,
    minPrice, setMinPrice, maxPrice, setMaxPrice,
    hasFilters: !!hasFilters, clearFilters,
  };

  const genderLabel = GENDER_OPTIONS.find(o => o.value === gender)?.label;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <button onClick={() => onNavigate('home')} className="hover:text-blue-600 transition-colors">Главная</button>
          <span>›</span>
          {gender !== 'ALL' && <><span className="text-gray-900 font-medium">{genderLabel}</span><span>›</span></>}
          <span className="text-gray-900 font-medium">{category || 'Каталог'}</span>
          {search && <><span>›</span><span className="text-gray-900">«{search}»</span></>}
        </div>

        <div className="flex gap-6">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 sticky top-36">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold text-gray-900">Фильтры</h2>
                {hasFilters && (
                  <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700">
                    Сбросить
                  </button>
                )}
              </div>
              <FilterPanel {...filterProps} />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-3 mb-5">
              <button
                onClick={() => setFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-400 transition-colors"
              >
                <SlidersHorizontal size={15} />
                Фильтры
                {hasFilters && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
              </button>

              <div className="flex-1 text-sm text-gray-500">
                {loading ? '...' : `${filteredProducts.length} товаров`}
              </div>

              <div className="relative">
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Active filter pills */}
            {hasFilters && (
              <div className="flex flex-wrap gap-2 mb-4">
                {gender !== 'ALL' && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-full">
                    {genderLabel}
                    <button onClick={() => setGender('ALL')}><X size={11} /></button>
                  </span>
                )}
                {category && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {category}
                    <button onClick={() => setCategory('')}><X size={11} /></button>
                  </span>
                )}
                {brand && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    {brand}
                    <button onClick={() => setBrand('')}><X size={11} /></button>
                  </span>
                )}
                {search && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                    «{search}»
                    <button onClick={() => setSearch('')}><X size={11} /></button>
                  </span>
                )}
                {inStock && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full">
                    В наличии
                    <button onClick={() => setInStock(false)}><X size={11} /></button>
                  </span>
                )}
                {(minPrice || maxPrice) && (
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded-full">
                    {minPrice ? `от ${Number(minPrice).toLocaleString('ru-RU')} ₽` : ''}{minPrice && maxPrice ? ' ' : ''}{maxPrice ? `до ${Number(maxPrice).toLocaleString('ru-RU')} ₽` : ''}
                    <button onClick={() => { setMinPrice(''); setMaxPrice(''); }}><X size={11} /></button>
                  </span>
                )}
              </div>
            )}

            {/* Grid */}
            {fetchError && !loading ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <p className="text-gray-500 mb-4">Не удалось загрузить товары. Проверьте соединение и попробуйте снова.</p>
                <button onClick={clearFilters} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  Попробовать снова
                </button>
              </div>
            ) : loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                    <div className="aspect-[3/4] bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded" />
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Ничего не найдено</h3>
                <p className="text-gray-500 mb-6">Попробуйте изменить параметры поиска</p>
                <button onClick={clearFilters} className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  Сбросить фильтры
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredProducts.map(p => (
                  <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} onNavigate={onNavigate} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {filtersOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setFiltersOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Фильтры</h2>
              <button onClick={() => setFiltersOpen(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5">
              <FilterPanel {...filterProps} />
            </div>
            <div className="p-5 border-t border-gray-100">
              <button
                onClick={() => setFiltersOpen(false)}
                className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Показать {filteredProducts.length} товаров
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
