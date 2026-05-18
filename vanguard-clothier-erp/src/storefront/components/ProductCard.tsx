import React, { useState } from 'react';
import { Heart, ShoppingBag, Star } from 'lucide-react';
import { useWishlistStore } from '../../store/wishlistStore';

export interface StorefrontProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
  brand?: { name: string };
  category?: { name: string };
  variations: {
    id: string;
    sku: string;
    size: string;
    color: string;
    salePrice: number;
    stock: number;
    lowStockThreshold?: number;
  }[];
  discount?: number;
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
}

interface ProductCardProps {
  product: StorefrontProduct;
  onAddToCart: (product: StorefrontProduct) => void;
  onNavigate?: (page: string, params?: Record<string, string>) => void;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={11}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-gray-200 fill-gray-200'}
        />
      ))}
    </div>
  );
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const { has, toggle } = useWishlistStore();
  const isWishlisted = has(product.id);

  const inStock = product.variations.some(v => v.stock > 0);
  const minPrice = product.variations.length > 0
    ? Math.min(...product.variations.map(v => v.salePrice))
    : 0;
  const discount = product.discount ?? 0;
  const finalPrice = discount > 0 ? Math.round(minPrice * (1 - discount / 100)) : minPrice;

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle({
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      price: finalPrice,
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  const colors = [...new Set(product.variations.map(v => v.color))];

  return (
    <div
      onClick={() => onAddToCart(product)}
      className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Image area */}
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden">
        {!imgError && product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50">
            <ShoppingBag size={32} className="text-gray-300 mb-2" />
            <span className="text-xs text-gray-400">{product.brand?.name}</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          {discount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow">
              −{discount}%
            </span>
          )}
          {!inStock && (
            <span className="bg-gray-500 text-white text-xs font-medium px-2 py-0.5 rounded-lg">
              Нет в наличии
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <button
          onClick={handleWishlist}
          className="absolute top-2.5 right-2.5 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
        >
          <Heart
            size={15}
            className={isWishlisted ? 'text-red-500 fill-red-500' : 'text-gray-400 group-hover:text-gray-600'}
          />
        </button>

        {/* Add to cart overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl transition-colors shadow-lg
              ${inStock
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <ShoppingBag size={14} />
            В корзину
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        {/* Brand */}
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide truncate">
          {product.brand?.name}
        </p>

        {/* Name */}
        <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
          {product.name}
        </p>

        {/* Rating */}
        {product.rating !== undefined && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={product.rating} />
            <span className="text-[11px] text-gray-400 font-medium">
              {product.rating.toFixed(1)} ({product.reviewCount ?? 0})
            </span>
          </div>
        )}

        {/* Colors */}
        {colors.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            {colors.slice(0, 5).map((color, i) => (
              <div
                key={i}
                title={color}
                className="w-3.5 h-3.5 rounded-full border border-gray-200 shrink-0"
                style={{ backgroundColor: getColorHex(color) }}
              />
            ))}
            {colors.length > 5 && (
              <span className="text-[10px] text-gray-400">+{colors.length - 5}</span>
            )}
          </div>
        )}

        {/* Price */}
        <div className="mt-auto pt-1.5 flex items-center gap-2 flex-wrap">
          <span className="text-base font-bold text-gray-900">
            {finalPrice.toLocaleString('ru-RU')} ₽
          </span>
          {discount > 0 && (
            <span className="text-sm text-gray-400 line-through">
              {minPrice.toLocaleString('ru-RU')} ₽
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function getColorHex(name: string): string {
  const map: Record<string, string> = {
    'белый': '#FFFFFF', 'белая': '#FFFFFF', 'белое': '#FFFFFF',
    'чёрный': '#1a1a1a', 'чёрная': '#1a1a1a', 'чёрное': '#1a1a1a', 'черный': '#1a1a1a',
    'серый': '#9ca3af', 'серая': '#9ca3af', 'серое': '#9ca3af',
    'синий': '#3b82f6', 'синяя': '#3b82f6', 'синее': '#3b82f6',
    'тёмно-синий': '#1e3a5f', 'темно-синий': '#1e3a5f',
    'голубой': '#7dd3fc', 'голубая': '#7dd3fc',
    'красный': '#ef4444', 'красная': '#ef4444',
    'зелёный': '#22c55e', 'зеленый': '#22c55e', 'зелёная': '#22c55e',
    'хаки': '#8a9a5b', 'оливковый': '#6b7c3c',
    'коричневый': '#92400e', 'коричневая': '#92400e',
    'бежевый': '#d4b896', 'бежевая': '#d4b896', 'бежевое': '#d4b896',
    'кремовый': '#fffdd0',
    'жёлтый': '#facc15', 'желтый': '#facc15',
    'оранжевый': '#f97316',
    'розовый': '#f9a8d4', 'розовая': '#f9a8d4',
    'фиолетовый': '#a855f7',
    'бордовый': '#7f1d1d', 'марсала': '#7b3f3f',
    'терракот': '#c0614c', 'терракотовый': '#c0614c',
    'горчичный': '#d4a017',
    'мятный': '#98d8c8',
    'антрацит': '#3d3d3d', 'графит': '#6b6b6b',
    'молочный': '#f5f0e8', 'слоновая кость': '#fffff0',
    'джинс': '#4a6fa5', 'деним': '#4a6fa5',
  };
  const lower = name.toLowerCase().trim();
  for (const key in map) {
    if (lower.includes(key)) return map[key];
  }
  return '#d1d5db';
}
