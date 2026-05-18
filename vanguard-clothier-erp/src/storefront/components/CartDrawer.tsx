import React from 'react';
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

interface CartDrawerProps {
  onCheckout?: () => void;
}

export default function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { items, isOpen, closeCart, removeItem, updateQty, total, count } = useCartStore();

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={closeCart} />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-md z-50 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Корзина</h2>
            {count() > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">{count()}</span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={56} className="text-gray-200 mb-4" />
              <p className="text-gray-500 font-medium">Корзина пуста</p>
              <p className="text-sm text-gray-400 mt-1">Добавьте товары, чтобы продолжить</p>
              <button
                onClick={closeCart}
                className="mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                Перейти в каталог
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.variationId} className="flex gap-3">
                {/* Image */}
                <div className="w-20 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-100">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={20} className="text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.size && `Размер: ${item.size}`}
                    {item.size && item.color && ' · '}
                    {item.color && item.color}
                  </p>
                  <p className="text-xs text-gray-400">{item.sku}</p>

                  <div className="flex items-center justify-between mt-2">
                    {/* Qty controls */}
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg">
                      <button
                        onClick={() => updateQty(item.variationId, item.quantity - 1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors rounded-l-lg"
                      >
                        <Minus size={12} className="text-gray-600" />
                      </button>
                      <span className="text-sm font-medium text-gray-900 min-w-[20px] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.variationId, item.quantity + 1)}
                        className="p-1.5 hover:bg-gray-100 transition-colors rounded-r-lg"
                      >
                        <Plus size={12} className="text-gray-600" />
                      </button>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{(item.price * item.quantity).toLocaleString('ru-RU')} ₽</p>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <p className="text-xs text-gray-400 line-through">{(item.originalPrice * item.quantity).toLocaleString('ru-RU')} ₽</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.variationId)}
                  className="shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-start"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4 space-y-3">
            <div className="flex justify-between text-sm text-gray-500">
              <span>Товары ({count()} шт.)</span>
              <span>{total().toLocaleString('ru-RU')} ₽</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900">
              <span>Итого</span>
              <span className="text-blue-600">{total().toLocaleString('ru-RU')} ₽</span>
            </div>
            <button
              onClick={() => { onCheckout?.(); closeCart(); }}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
            >
              Оформить заказ
              <ArrowRight size={16} />
            </button>
            <p className="text-xs text-gray-400 text-center">Бесплатная доставка от 5 000 ₽</p>
          </div>
        )}
      </div>
    </>
  );
}
