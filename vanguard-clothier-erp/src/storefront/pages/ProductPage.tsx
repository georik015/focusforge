import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Heart, Share2, Star, ChevronLeft, ChevronRight,
  ShoppingBag, Check, ZoomIn, Package, Truck, RotateCcw, MessageSquare, ThumbsUp,
} from 'lucide-react';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCartStore } from '../../store/cartStore';

interface Variation {
  id: string;
  sku: string;
  size: string;
  color: string;
  salePrice: number;
  stock: number;
  lowStockThreshold?: number;
}

interface Product {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  extraImages?: string | null;
  specifications?: string | null;
  brand?: { name: string };
  category?: { name: string };
  variations: Variation[];
  discount?: number;
  rating?: number;
  reviewCount?: number;
}

interface ProductPageProps {
  productId: string;
  onBack: () => void;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <Star key={i} size={14} className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-sm text-gray-400">({count} отзывов)</span>}
    </div>
  );
}

const DEMO_REVIEWS = [
  { id: '1', author: 'Алина М.', rating: 5, date: '2026-04-12', text: 'Отличное качество! Материал приятный, размер точный. Уже заказала ещё одну вещь из этого бренда.', helpful: 12 },
  { id: '2', author: 'Дмитрий К.', rating: 4, date: '2026-03-28', text: 'Хорошая вещь за свои деньги. Немного отличается от фото по оттенку, но в целом доволен. Доставка быстрая.', helpful: 7 },
  { id: '3', author: 'Светлана П.', rating: 5, date: '2026-03-05', text: 'Покупаю уже третий раз. Качество стабильно высокое, доставка в срок. Рекомендую!', helpful: 21 },
];

export default function ProductPage({ productId, onBack, onNavigate }: ProductPageProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [shared, setShared] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // Reviews state
  const [reviews, setReviews] = useState(DEMO_REVIEWS);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const { has, toggle } = useWishlistStore();
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setSelectedColor(null);
    setSelectedSize(null);
    setGalleryIndex(0);
    fetch(`/api/public/products/${productId}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(r.status.toString())))
      .then(data => {
        setProduct(data);
        const uniqueColors = [...new Set((data.variations ?? []).map((v: any) => v.color))];
        if (uniqueColors.length === 1) setSelectedColor(uniqueColors[0] as string);
      })
      .catch(err => { if (err.name !== 'AbortError') setProduct(null); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [productId]);

  const allImages = React.useMemo(() => {
    if (!product) return [];
    let extra: string[] = [];
    try { extra = product.extraImages ? JSON.parse(product.extraImages) : []; } catch { /* ignore malformed JSON */ }
    return [product.imageUrl, ...extra].filter(Boolean) as string[];
  }, [product]);

  const specs = React.useMemo(() => {
    if (!product?.specifications) return null;
    try { return JSON.parse(product.specifications) as Record<string, string>; }
    catch { return null; }
  }, [product]);

  const colors = React.useMemo(() => {
    if (!product) return [];
    return [...new Set(product.variations.map(v => v.color))];
  }, [product]);

  const sizes = React.useMemo(() => {
    if (!product) return [];
    const filtered = selectedColor
      ? product.variations.filter(v => v.color === selectedColor)
      : product.variations;
    return [...new Set(filtered.map(v => v.size))];
  }, [product, selectedColor]);

  const getVariation = useCallback((color: string | null, size: string | null) => {
    if (!product || !color || !size) return null;
    return product.variations.find(v => v.color === color && v.size === size) ?? null;
  }, [product]);

  const isSizeAvailable = (size: string) => {
    if (!product) return false;
    return product.variations.some(v =>
      v.size === size &&
      v.stock > 0 &&
      (!selectedColor || v.color === selectedColor)
    );
  };

  const selectedVariation = getVariation(selectedColor, selectedSize);
  const discount = product?.discount ?? 0;
  const basePrice = selectedVariation
    ? selectedVariation.salePrice
    : product?.variations?.length
    ? Math.min(...product.variations.map(v => v.salePrice))
    : 0;
  const finalPrice = discount > 0 ? Math.round(basePrice * (1 - discount / 100)) : basePrice;

  const handleAddToCart = () => {
    if (!product || !selectedColor || !selectedSize || !selectedVariation) return;
    addItem({
      variationId: selectedVariation.id,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      sku: selectedVariation.sku,
      size: selectedVariation.size,
      color: selectedVariation.color,
      price: finalPrice,
      originalPrice: discount > 0 ? basePrice : undefined,
      quantity: 1,
      stock: selectedVariation.stock,
    });
    setAdded(true);
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?product=${productId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name ?? 'Товар', url });
      } else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 2500);
      }
    } catch { /* user cancelled */ }
  };

  const isWishlisted = has(product?.id ?? '');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Package size={48} className="text-gray-300 mb-4" />
        <p className="text-gray-600 font-medium mb-4">Товар не найден</p>
        <button onClick={onBack} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Назад</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button onClick={() => onNavigate('home')} className="hover:text-blue-600">Главная</button>
          <span>›</span>
          <button onClick={() => onNavigate('catalog', { category: product.category?.name ?? '' })} className="hover:text-blue-600">
            {product.category?.name}
          </button>
          <span>›</span>
          <span className="text-gray-800 truncate max-w-xs">{product.name}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* ── Gallery ── */}
          <div className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-[3/4] bg-gray-50 rounded-2xl overflow-hidden group">
              {allImages.length > 0 ? (
                <img
                  src={allImages[galleryIndex]}
                  alt={product.name}
                  className={`w-full h-full object-cover transition-transform duration-500 ${zoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in group-hover:scale-105'}`}
                  onClick={() => setZoomed(!zoomed)}
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package size={64} className="text-gray-300" /></div>
              )}

              {/* Discount badge */}
              {discount > 0 && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-xl">
                  −{discount}%
                </div>
              )}

              {/* Zoom hint */}
              <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn size={12} />
                Увеличить
              </div>

              {/* Navigation arrows */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setGalleryIndex(i => (i - 1 + allImages.length) % allImages.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                  >
                    <ChevronLeft size={18} className="text-gray-700" />
                  </button>
                  <button
                    onClick={() => setGalleryIndex(i => (i + 1) % allImages.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                  >
                    <ChevronRight size={18} className="text-gray-700" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`shrink-0 w-16 h-20 rounded-xl overflow-hidden border-2 transition-all ${i === galleryIndex ? 'border-blue-600 shadow-md' : 'border-gray-200 hover:border-gray-400'}`}
                  >
                    <img src={img} alt={`Фото ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Info Panel ── */}
          <div className="flex flex-col gap-5">
            {/* Brand + name */}
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{product.brand?.name}</p>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-tight">{product.name}</h1>
            </div>

            {/* Rating */}
            {product.rating !== undefined && (
              <StarRating rating={product.rating} count={product.reviewCount} />
            )}

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-gray-900">
                {finalPrice.toLocaleString('ru-RU')} ₽
              </span>
              {discount > 0 && (
                <>
                  <span className="text-xl text-gray-400 line-through">{basePrice.toLocaleString('ru-RU')} ₽</span>
                  <span className="bg-red-50 text-red-600 text-sm font-bold px-2.5 py-1 rounded-xl">−{discount}%</span>
                </>
              )}
            </div>

            {/* ── Color selector ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">
                  Цвет{selectedColor && <span className="text-gray-500 font-normal ml-2">— {selectedColor}</span>}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => { setSelectedColor(color === selectedColor ? null : color); setSelectedSize(null); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-sm transition-all ${selectedColor === color ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium' : 'border-gray-200 text-gray-700 hover:border-gray-400'}`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-gray-200 shrink-0"
                      style={{ backgroundColor: getColorHex(color) }}
                    />
                    {color}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Size selector ── */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-gray-900">Размер</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...new Set(product.variations.map(v => v.size))].map(size => {
                  const available = isSizeAvailable(size);
                  const isSelected = selectedSize === size;
                  const variation = selectedColor
                    ? product.variations.find(v => v.color === selectedColor && v.size === size)
                    : product.variations.find(v => v.size === size && v.stock > 0);
                  const lowStock = variation && variation.stock > 0 && variation.stock <= 3;

                  return (
                    <button
                      key={size}
                      onClick={() => available && setSelectedSize(size === selectedSize ? null : size)}
                      disabled={!available}
                      className={`relative min-w-[48px] px-3 py-2.5 text-sm font-medium rounded-xl border-2 transition-all
                        ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : ''}
                        ${!isSelected && available ? 'border-gray-200 text-gray-700 hover:border-blue-300' : ''}
                        ${!available ? 'border-gray-100 text-gray-300 line-through cursor-not-allowed' : ''}
                      `}
                    >
                      {size}
                      {lowStock && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-orange-400 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {variation?.stock}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedColor && sizes.length === 0 && (
                <p className="text-sm text-gray-400 mt-2">Нет доступных размеров для этого цвета</p>
              )}
            </div>

            {/* Add to cart + wishlist + share */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!selectedColor || !selectedSize || !selectedVariation || selectedVariation.stock === 0}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all
                  ${added ? 'bg-green-600 text-white' : ''}
                  ${!added && selectedColor && selectedSize && selectedVariation?.stock ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25' : ''}
                  ${!selectedColor || !selectedSize ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
                `}
              >
                {added ? <><Check size={18} /> Добавлено!</> : <><ShoppingBag size={18} /> В корзину</>}
              </button>
              <button
                onClick={() => product && toggle({ productId: product.id, productName: product.name, imageUrl: product.imageUrl, price: finalPrice })}
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center transition-all ${isWishlisted ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-red-300'}`}
              >
                <Heart size={20} className={isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-500'} />
              </button>
              <button
                onClick={handleShare}
                className="w-14 h-14 rounded-2xl border-2 border-gray-200 hover:border-blue-300 flex items-center justify-center transition-all relative"
                title="Поделиться"
              >
                {shared ? <Check size={18} className="text-green-500" /> : <Share2 size={18} className="text-gray-500" />}
                {shared && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                    Скопировано!
                  </span>
                )}
              </button>
            </div>

            {!selectedColor && (
              <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl">Выберите цвет и размер для добавления в корзину</p>
            )}
            {selectedColor && !selectedSize && (
              <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl">Выберите размер для добавления в корзину</p>
            )}

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              {[
                { icon: Truck, text: 'Доставка от 290 ₽' },
                { icon: RotateCcw, text: 'Возврат 30 дней' },
                { icon: Package, text: 'Гарантия качества' },
              ].map(b => (
                <div key={b.text} className="flex flex-col items-center gap-1.5 text-center p-2 bg-gray-50 rounded-xl">
                  <b.icon size={16} className="text-blue-500" />
                  <p className="text-[11px] text-gray-600 leading-tight">{b.text}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {product.description && (
              <div className="pt-2 border-t border-gray-100">
                <h3 className="text-base font-bold text-gray-900 mb-2">Описание</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Specifications */}
            {specs && (
              <div className="pt-2 border-t border-gray-100">
                <h3 className="text-base font-bold text-gray-900 mb-3">Характеристики</h3>
                <div className="space-y-0 rounded-xl overflow-hidden border border-gray-100">
                  {Object.entries(specs).map(([key, val], i) => (
                    <div key={key} className={`flex items-center px-4 py-2.5 ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                      <span className="text-sm text-gray-500 w-44 shrink-0">{key}</span>
                      <span className="text-sm text-gray-900 font-medium">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={16} className="text-blue-500" />
                  Отзывы покупателей
                  <span className="text-sm font-normal text-gray-400">({reviews.length})</span>
                </h3>
                {product.rating && <StarRating rating={product.rating} />}
              </div>

              <div className="space-y-4 mb-6">
                {reviews.map(review => (
                  <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">{review.author}</div>
                        <div className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                      </div>
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star key={i} size={12} className={i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{review.text}</p>
                    <button className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors">
                      <ThumbsUp size={11} /> Полезно ({review.helpful})
                    </button>
                  </div>
                ))}
              </div>

              {/* Review form */}
              {reviewSubmitted ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                  <Check size={16} /> Спасибо! Ваш отзыв отправлен на проверку.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-gray-700">Оставить отзыв</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(i => (
                      <button
                        key={i}
                        onMouseEnter={() => setReviewHover(i)}
                        onMouseLeave={() => setReviewHover(0)}
                        onClick={() => setReviewRating(i)}
                      >
                        <Star size={24} className={(reviewHover || reviewRating) >= i ? 'text-amber-400 fill-amber-400' : 'text-gray-300 fill-gray-300'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Поделитесь впечатлениями о товаре..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                  />
                  <button
                    onClick={() => {
                      if (!reviewRating || !reviewText.trim()) return;
                      setReviews(prev => [{ id: String(Date.now()), author: 'Вы', rating: reviewRating, date: new Date().toISOString().split('T')[0], text: reviewText.trim(), helpful: 0 }, ...prev]);
                      setReviewSubmitted(true);
                    }}
                    disabled={!reviewRating || !reviewText.trim()}
                    className="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    Отправить отзыв
                  </button>
                </div>
              )}
            </div>

            {/* SKU */}
            {selectedVariation && (
              <p className="text-xs text-gray-400">Артикул: {selectedVariation.sku}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getColorHex(name: string): string {
  const map: Record<string, string> = {
    'белый': '#FFFFFF', 'белая': '#FFFFFF', 'белое': '#FFFFFF',
    'чёрный': '#1a1a1a', 'чёрная': '#1a1a1a', 'чёрное': '#1a1a1a', 'черный': '#1a1a1a',
    'серый': '#9ca3af', 'серая': '#9ca3af', 'серый меланж': '#b8bfcc',
    'синий': '#3b82f6', 'синяя': '#3b82f6', 'тёмно-синий': '#1e3a5f',
    'голубой': '#7dd3fc', 'пыльно-голубой': '#a8c5da',
    'красный': '#ef4444', 'зелёный': '#22c55e', 'зеленый': '#22c55e',
    'хаки': '#8a9a5b', 'оливковый': '#6b7c3c', 'тёмно-зелёный': '#2d5016',
    'коричневый': '#92400e', 'бежевый': '#d4b896', 'молочный': '#fffdd0',
    'кремовый': '#fffdd0', 'горчичный': '#d4a017', 'оранжевый': '#f97316',
    'розовый': '#f9a8d4', 'пыльно-розовый': '#e8b4b8', 'бордовый': '#7f1d1d',
    'тёмно-бордовый': '#6b1515', 'марсала': '#7b3f3f', 'терракот': '#c0614c',
    'терракотовый': '#c0614c', 'мятный': '#98d8c8', 'фиолетовый': '#a855f7',
    'антрацит': '#3d3d3d', 'графит': '#6b6b6b', 'тёмно-серый': '#4b5563',
    'синий деним': '#4a6fa5', 'тёмный деним': '#2d3f5c', 'светлый деним': '#7ba3cc',
    'джинс': '#4a6fa5',
    'синяя клетка': '#4a6fa5', 'зелёная клетка': '#4a8f5b', 'красная клетка': '#8f4a4a',
    'золотистый': '#d4af37', 'серебристый': '#c0c0c0',
    'цветной микс': 'linear-gradient(45deg, #f00, #0f0, #00f)',
  };
  const lower = name.toLowerCase().trim();
  for (const key in map) {
    if (lower === key || lower.includes(key)) return map[key];
  }
  return '#d1d5db';
}
