import React, { useEffect, useState } from 'react';
import { ArrowRight, Truck, RotateCcw, CreditCard, Shield, ChevronRight } from 'lucide-react';
import ProductCard, { StorefrontProduct } from '../components/ProductCard';

interface HomePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onAddToCart: (product: StorefrontProduct) => void;
}

const HERO_SLIDES = [
  {
    title: 'Новая коллекция',
    subtitle: 'Весна — Лето 2026',
    description: 'Открывайте сезон с обновлённым гардеробом',
    cta: 'Смотреть коллекцию',
    badge: 'НОВИНКИ',
    bg: 'from-blue-900 to-indigo-800',
    category: 'Трикотаж',
  },
  {
    title: 'Верхняя одежда',
    subtitle: 'Скидки до 40%',
    description: 'Пальто, куртки и пуховики по специальным ценам',
    cta: 'В каталог',
    badge: 'АКЦИЯ',
    bg: 'from-slate-800 to-gray-700',
    category: 'Верхняя одежда',
  },
];

const CATEGORY_TILES = [
  { label: 'Верхняя одежда', emoji: '🧥', color: 'from-blue-500 to-blue-700', cat: 'Верхняя одежда' },
  { label: 'Трикотаж', emoji: '🧶', color: 'from-emerald-500 to-teal-700', cat: 'Трикотаж' },
  { label: 'Брюки и джинсы', emoji: '👖', color: 'from-indigo-500 to-blue-700', cat: 'Брюки и джинсы' },
  { label: 'Рубашки', emoji: '👔', color: 'from-sky-400 to-blue-600', cat: 'Рубашки' },
  { label: 'Обувь', emoji: '👟', color: 'from-orange-400 to-red-600', cat: 'Обувь' },
  { label: 'Аксессуары', emoji: '🎒', color: 'from-purple-500 to-indigo-700', cat: 'Аксессуары' },
];

const BENEFITS = [
  { icon: Truck, title: 'Бесплатная доставка', text: 'При заказе от 5 000 ₽' },
  { icon: RotateCcw, title: 'Возврат 30 дней', text: 'Без вопросов' },
  { icon: CreditCard, title: 'Удобная оплата', text: 'Карта, наличные, BNPL' },
  { icon: Shield, title: 'Гарантия качества', text: 'Только оригинальные товары' },
];

export default function HomePage({ onNavigate, onAddToCart }: HomePageProps) {
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/products', { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => { if (err?.name !== 'AbortError') setProducts([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSlide(s => (s + 1) % HERO_SLIDES.length), 5000);
    return () => clearInterval(timer);
  }, []);

  const featured = products.slice(0, 8);
  const discounted = products.filter(p => (p.discount ?? 0) > 0).slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className={`relative bg-gradient-to-r ${HERO_SLIDES[slide].bg} text-white overflow-hidden`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 flex items-center">
          <div className="max-w-xl relative z-10">
            <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4 tracking-widest">
              {HERO_SLIDES[slide].badge}
            </span>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-2">
              {HERO_SLIDES[slide].title}
            </h1>
            <p className="text-2xl sm:text-3xl font-semibold text-white/80 mb-3">
              {HERO_SLIDES[slide].subtitle}
            </p>
            <p className="text-white/70 mb-8 text-lg">
              {HERO_SLIDES[slide].description}
            </p>
            <button
              onClick={() => onNavigate('catalog', { category: HERO_SLIDES[slide].category })}
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-8 py-3.5 rounded-2xl hover:bg-gray-100 transition-colors shadow-lg"
            >
              {HERO_SLIDES[slide].cta}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* Slide dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`transition-all rounded-full ${i === slide ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40'}`}
            />
          ))}
        </div>

        {/* Decorative */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10">
          <div className="w-full h-full bg-white/10 blur-3xl" />
        </div>
      </div>

      {/* Category tiles */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-900">Категории</h2>
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            Весь каталог
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {CATEGORY_TILES.map(tile => (
            <button
              key={tile.cat}
              onClick={() => onNavigate('catalog', { category: tile.cat })}
              className={`bg-gradient-to-br ${tile.color} rounded-2xl p-4 text-white flex flex-col items-center gap-2 hover:scale-105 hover:shadow-lg transition-all`}
            >
              <span className="text-3xl">{tile.emoji}</span>
              <span className="text-xs font-semibold text-center leading-tight">{tile.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Benefits strip */}
      <div className="bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {BENEFITS.map(b => (
            <div key={b.title} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <b.icon size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{b.title}</p>
                <p className="text-xs text-gray-500">{b.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Discounted products */}
      {discounted.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900">Акции</h2>
              <p className="text-sm text-gray-500">Специальные предложения</p>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
            >
              Все акции
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {discounted.map(p => (
              <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      )}

      {/* Featured products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Популярное</h2>
            <p className="text-sm text-gray-500">Лучшие товары сезона</p>
          </div>
          <button
            onClick={() => onNavigate('catalog')}
            className="flex items-center gap-1 text-sm text-blue-600 font-medium hover:text-blue-700"
          >
            Смотреть всё
            <ChevronRight size={16} />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
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
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map(p => (
              <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} onNavigate={onNavigate} />
            ))}
          </div>
        )}
      </div>

      {/* Promo banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-3xl p-8 sm:p-12 text-white flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-blue-200 mb-2 uppercase tracking-wide">Карта лояльности</p>
            <h3 className="text-3xl font-black mb-2">Получите скидку 10%</h3>
            <p className="text-blue-200">Накапливайте баллы с каждой покупки</p>
          </div>
          <button
            onClick={() => onNavigate('profile')}
            className="shrink-0 bg-white text-blue-700 font-bold px-8 py-3.5 rounded-2xl hover:bg-blue-50 transition-colors shadow-lg whitespace-nowrap"
          >
            Оформить карту
          </button>
        </div>
      </div>
    </div>
  );
}
