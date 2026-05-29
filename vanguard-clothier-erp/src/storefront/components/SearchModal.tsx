import React, { useState, useEffect, useRef } from 'react';
import { X, Search, TrendingUp, ArrowRight } from 'lucide-react';

interface SearchProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
  brand?: { name: string };
  variations: { salePrice: number }[];
  discount?: number;
}

interface SearchModalProps {
  onClose: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const POPULAR_QUERIES = [
  'Куртка', 'Джинсы', 'Пальто', 'Худи', 'Рубашка', 'Кеды', 'Свитер', 'Брюки',
];

export default function SearchModal({ onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/products?search=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(Array.isArray(data) ? data.slice(0, 6) : []);
        }
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleSelect = (product: SearchProduct) => {
    onNavigate('product', { productId: product.id });
    onClose();
  };

  const handlePopular = (q: string) => {
    onNavigate('catalog', { search: q });
    onClose();
  };

  const handleSearch = () => {
    if (query.trim()) {
      onNavigate('catalog', { search: query });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Поиск товаров, брендов, категорий..."
            className="flex-1 text-base text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
              <X size={16} className="text-gray-400" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 ml-1">
            Отмена
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {!query && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-gray-400" />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Популярные запросы</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {POPULAR_QUERIES.map(q => (
                  <button
                    key={q}
                    onClick={() => handlePopular(q)}
                    className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Ничего не найдено по запросу «{query}»</p>
              <p className="text-sm text-gray-400 mt-1">Попробуйте другой запрос</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="space-y-1">
              {results.map(p => {
                const minPrice = p.variations.length > 0 ? Math.min(...p.variations.map(v => v.salePrice)) : 0;
                const finalPrice = p.discount ? Math.round(minPrice * (1 - p.discount / 100)) : minPrice;
                return (
                  <button
                    key={p.id}
                    onClick={() => handleSelect(p)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-12 h-14 shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-100" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.brand?.name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{finalPrice.toLocaleString('ru-RU')} ₽</p>
                      {p.discount && p.discount > 0 && (
                        <p className="text-xs text-green-600 font-medium">−{p.discount}%</p>
                      )}
                    </div>
                  </button>
                );
              })}

              {query && (
                <button
                  onClick={handleSearch}
                  className="w-full flex items-center justify-center gap-2 py-3 mt-2 text-blue-600 text-sm font-medium hover:bg-blue-50 rounded-xl transition-colors"
                >
                  Все результаты для «{query}»
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
