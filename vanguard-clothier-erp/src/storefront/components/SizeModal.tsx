import React, { useState } from 'react';
import { X, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

interface Variation {
  id: string;
  sku: string;
  size: string;
  color: string;
  salePrice: number;
  purchasePrice?: number;
  stock: number;
  lowStockThreshold?: number;
}

interface Product {
  id: string;
  name: string;
  imageUrl?: string | null;
  brand?: { name: string };
  discount?: number;
  variations: Variation[];
}

interface SizeModalProps {
  product: Product | null;
  onClose: () => void;
}

type SizeUnit = 'RU' | 'EUR' | 'CM';

const SIZE_CHART: Record<string, { RU: string; EUR: string; CM: string }> = {
  'XS': { RU: '40', EUR: '34', CM: '158–164' },
  'S':  { RU: '42–44', EUR: '36–38', CM: '164–170' },
  'M':  { RU: '46–48', EUR: '40–42', CM: '170–176' },
  'L':  { RU: '50–52', EUR: '44–46', CM: '176–182' },
  'XL': { RU: '54–56', EUR: '48–50', CM: '182–188' },
  'XXL':{ RU: '58–60', EUR: '52–54', CM: '188–194' },
};

export default function SizeModal({ product, onClose }: SizeModalProps) {
  const [unit, setUnit] = useState<SizeUnit>('RU');
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(false);
  const addItem = useCartStore(s => s.addItem);

  if (!product) return null;

  const colorGroups = product.variations.reduce<Record<string, Variation[]>>((acc, v) => {
    if (!acc[v.color]) acc[v.color] = [];
    acc[v.color].push(v);
    return acc;
  }, {});

  const selectedVariation = product.variations.find(v => v.id === selectedVariationId);

  const handleAddToCart = () => {
    if (!selectedVariation) return;
    const discount = product.discount ?? 0;
    const originalPrice = selectedVariation.salePrice;
    const finalPrice = discount > 0 ? Math.round(originalPrice * (1 - discount / 100)) : originalPrice;

    addItem({
      variationId: selectedVariation.id,
      productId: product.id,
      productName: product.name,
      imageUrl: product.imageUrl,
      sku: selectedVariation.sku,
      size: selectedVariation.size,
      color: selectedVariation.color,
      price: finalPrice,
      originalPrice: discount > 0 ? originalPrice : undefined,
      quantity: 1,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          {product.imageUrl && (
            <img src={product.imageUrl} alt={product.name} className="w-14 h-16 object-cover rounded-xl shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{product.brand?.name}</p>
            <h2 className="text-base font-semibold text-gray-900 leading-tight">{product.name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Size unit toggle */}
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Выберите размер</p>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              {(['RU', 'EUR', 'CM'] as SizeUnit[]).map(u => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${unit === u ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Sizes by color */}
          {Object.entries(colorGroups).map(([color, vars]) => (
            <div key={color}>
              <p className="text-xs text-gray-500 font-medium mb-2 uppercase tracking-wide">{color}</p>
              <div className="flex flex-wrap gap-2">
                {vars.map(v => {
                  const isSelected = selectedVariationId === v.id;
                  const outOfStock = v.stock === 0;
                  const displaySize = SIZE_CHART[v.size]?.[unit] ?? v.size;

                  return (
                    <button
                      key={v.id}
                      onClick={() => !outOfStock && setSelectedVariationId(v.id)}
                      disabled={outOfStock}
                      className={`relative px-3 py-2 text-sm font-medium border-2 rounded-xl transition-all min-w-[52px] text-center
                        ${isSelected ? 'border-blue-600 bg-blue-50 text-blue-700' : ''}
                        ${!isSelected && !outOfStock ? 'border-gray-200 text-gray-700 hover:border-blue-300' : ''}
                        ${outOfStock ? 'border-gray-100 text-gray-300 cursor-not-allowed line-through' : ''}
                      `}
                    >
                      {displaySize}
                      {v.stock > 0 && v.stock <= 3 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-orange-400 text-white text-[9px] font-bold px-1 rounded-full">
                          {v.stock}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Size chart toggle */}
          <button
            onClick={() => setShowChart(!showChart)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
          >
            {showChart ? 'Скрыть таблицу размеров' : 'Таблица размеров'}
          </button>

          {showChart && (
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-gray-500 font-medium">Размер</th>
                    <th className="px-3 py-2 text-center text-gray-500 font-medium">RU</th>
                    <th className="px-3 py-2 text-center text-gray-500 font-medium">EUR</th>
                    <th className="px-3 py-2 text-center text-gray-500 font-medium">Рост (см)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(SIZE_CHART).map(([size, vals]) => (
                    <tr key={size} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-900">{size}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{vals.RU}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{vals.EUR}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{vals.CM}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Price + CTA */}
          {selectedVariation && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <div>
                {product.discount && product.discount > 0 ? (
                  <>
                    <p className="text-xl font-bold text-blue-600">
                      {Math.round(selectedVariation.salePrice * (1 - product.discount / 100)).toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="text-sm text-gray-400 line-through">
                      {selectedVariation.salePrice.toLocaleString('ru-RU')} ₽
                    </p>
                  </>
                ) : (
                  <p className="text-xl font-bold text-gray-900">
                    {selectedVariation.salePrice.toLocaleString('ru-RU')} ₽
                  </p>
                )}
              </div>
              <button
                onClick={handleAddToCart}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                <ShoppingBag size={16} />
                В корзину
              </button>
            </div>
          )}

          {!selectedVariationId && (
            <p className="text-sm text-gray-400 text-center">Выберите размер для добавления в корзину</p>
          )}
        </div>
      </div>
    </div>
  );
}
