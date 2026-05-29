import React from 'react';
import { CheckCircle, Package, Home, User } from 'lucide-react';

interface OrderSuccessPageProps {
  orderId: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function OrderSuccessPage({ orderId, onNavigate }: OrderSuccessPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Заказ оформлен!</h1>
        <p className="text-gray-500 mb-2">Ваш заказ успешно принят в обработку</p>
        <div className="bg-gray-50 rounded-2xl px-6 py-4 mb-6 inline-block">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Номер заказа</p>
          <p className="text-lg font-bold text-gray-900 font-mono">#{orderId.slice(-8).toUpperCase()}</p>
        </div>
        <div className="space-y-3 text-left mb-8">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Подтверждение</p>
              <p className="text-xs text-gray-500">Мы свяжемся с вами в течение 30 минут</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Отправка</p>
              <p className="text-xs text-gray-500">Трек-номер придёт по SMS или email</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">3</div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Доставка</p>
              <p className="text-xs text-gray-500">Курьер доставит в указанные сроки</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onNavigate('profile', { section: 'orders' })}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-colors"
          >
            <User size={16} />
            Мои заказы
          </button>
          <button
            onClick={() => onNavigate('catalog')}
            className="w-full flex items-center justify-center gap-2 py-3.5 border border-gray-200 text-gray-700 font-medium rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <Package size={16} />
            Продолжить покупки
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            <Home size={14} />
            На главную
          </button>
        </div>
      </div>
    </div>
  );
}
