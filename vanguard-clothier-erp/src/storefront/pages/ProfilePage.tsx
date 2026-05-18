import React, { useState } from 'react';
import {
  User, ShoppingBag, RotateCcw, Bell, Tag, Heart, GitCompare,
  History, MapPin, Settings, ChevronRight, Star, Package, LogIn
} from 'lucide-react';
import { useWishlistStore } from '../../store/wishlistStore';
import SizeModal from '../components/SizeModal';
import ProductCard, { StorefrontProduct } from '../components/ProductCard';

interface CustomerInfo {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  loyaltyPoints: number;
}

interface ProfilePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onAddToCart: (product: StorefrontProduct) => void;
  customerInfo?: CustomerInfo | null;
  onLogout?: () => void;
}

type Section = 'main' | 'orders' | 'returns' | 'wishlist' | 'notifications' | 'discounts' | 'addresses' | 'settings';

const MENU_ITEMS = [
  { id: 'orders' as Section, icon: ShoppingBag, label: 'Мои заказы', desc: '3 активных заказа' },
  { id: 'returns' as Section, icon: RotateCcw, label: 'Возвраты', desc: '0 открытых возвратов' },
  { id: 'notifications' as Section, icon: Bell, label: 'Уведомления', desc: '2 новых' },
  { id: 'discounts' as Section, icon: Tag, label: 'Скидки и промокоды', desc: 'Персональные предложения' },
  { id: 'wishlist' as Section, icon: Heart, label: 'Избранное', desc: '' },
  { id: 'addresses' as Section, icon: MapPin, label: 'Мои адреса', desc: '1 сохранённый адрес' },
  { id: 'settings' as Section, icon: Settings, label: 'Настройки', desc: 'Профиль и безопасность' },
];

const MOCK_ORDERS = [
  { id: '24510', date: '15 мая 2024', status: 'Доставляется', statusColor: 'text-blue-600 bg-blue-50', total: 8990, items: 2 },
  { id: '24102', date: '2 мая 2024', status: 'Получен', statusColor: 'text-green-600 bg-green-50', total: 12400, items: 3 },
  { id: '23891', date: '20 апреля 2024', status: 'Получен', statusColor: 'text-green-600 bg-green-50', total: 4500, items: 1 },
];

export default function ProfilePage({ onNavigate, onAddToCart, customerInfo, onLogout }: ProfilePageProps) {
  const [section, setSection] = useState<Section>('main');
  const wishlistItems = useWishlistStore(s => s.items);
  const removeWishlist = useWishlistStore(s => s.removeItem);

  const isGuest = !customerInfo;

  if (isGuest && section === 'main') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={36} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Личный кабинет</h2>
          <p className="text-gray-500 mb-8">Войдите, чтобы получить доступ к заказам, избранному и персональным предложениям</p>
          <div className="space-y-3">
            <button
              onClick={() => onNavigate('login')}
              className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-2xl hover:bg-blue-700 transition-colors"
            >
              Войти
            </button>
            <p className="text-sm text-gray-500">
              Нет аккаунта?{' '}
              <button onClick={() => onNavigate('register')} className="text-blue-600 font-medium hover:underline">
                Зарегистрироваться
              </button>
            </p>
          </div>

          {/* Wishlist preview even as guest */}
          {wishlistItems.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Heart size={15} className="text-red-500 fill-red-500" />
                Избранное ({wishlistItems.length})
              </p>
              <div className="grid grid-cols-3 gap-2">
                {wishlistItems.slice(0, 3).map(item => (
                  <div key={item.productId} className="aspect-[3/4] rounded-xl overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full bg-gray-100" />}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSection('wishlist')}
                className="mt-3 text-sm text-blue-600 font-medium hover:text-blue-700"
              >
                Смотреть всё →
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {section !== 'main' && (
          <button
            onClick={() => setSection('main')}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
          >
            ← Назад
          </button>
        )}

        {section === 'main' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile card */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User size={32} className="text-white" />
                </div>
                <h2 className="font-bold text-gray-900 text-lg">{customerInfo ? customerInfo.name : 'Гость'}</h2>
                <p className="text-sm text-gray-500">{customerInfo ? (customerInfo.email || customerInfo.phone || '') : 'Войдите в аккаунт'}</p>

                <div className="mt-5 p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 justify-center mb-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-gray-900">{customerInfo ? customerInfo.loyaltyPoints : 0} баллов</span>
                  </div>
                  <p className="text-xs text-gray-500">Карта лояльности VANGUARD</p>
                </div>

                {customerInfo ? (
                  <button
                    onClick={onLogout}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Выйти из аккаунта
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate('login')}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    <LogIn size={14} />
                    Войти
                  </button>
                )}
              </div>
            </div>

            {/* Menu */}
            <div className="md:col-span-2 space-y-2">
              {MENU_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                    <item.icon size={18} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    {item.id === 'wishlist'
                      ? <p className="text-xs text-gray-500">{wishlistItems.length} товаров</p>
                      : <p className="text-xs text-gray-500">{item.desc}</p>
                    }
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {section === 'orders' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Мои заказы</h2>
            <div className="space-y-4">
              {MOCK_ORDERS.map(order => (
                <div key={order.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-semibold text-gray-900">Заказ №{order.id}</span>
                      <span className="text-sm text-gray-400 ml-3">от {order.date}</span>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${order.statusColor}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{order.items} товара</span>
                    <span className="font-bold text-gray-900">{order.total.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button className="text-xs text-blue-600 font-medium hover:underline">Подробнее</button>
                    {order.status === 'Получен' && (
                      <button className="text-xs text-gray-500 font-medium hover:underline ml-4">Оформить возврат</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'wishlist' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">
              Избранное
              {wishlistItems.length > 0 && <span className="text-gray-400 font-normal ml-2 text-lg">({wishlistItems.length})</span>}
            </h2>
            {wishlistItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Heart size={56} className="text-gray-200 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">Список пуст</h3>
                <p className="text-gray-500 mb-6">Добавляйте понравившиеся товары в избранное</p>
                <button
                  onClick={() => onNavigate('catalog')}
                  className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Перейти в каталог
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {wishlistItems.map(item => (
                  <div key={item.productId} className="group relative bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="aspect-[3/4] bg-gray-50">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full bg-gray-100" />}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.productName}</p>
                      <p className="text-base font-bold text-gray-900 mt-1">{item.price.toLocaleString('ru-RU')} ₽</p>
                      <button
                        onClick={() => removeWishlist(item.productId)}
                        className="mt-2 text-xs text-red-500 hover:text-red-600"
                      >
                        Удалить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === 'discounts' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Скидки и промокоды</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Tag size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Войдите в аккаунт, чтобы просматривать персональные скидки и промокоды</p>
              <button
                onClick={() => onNavigate('login')}
                className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                Войти
              </button>
            </div>
          </div>
        )}

        {section === 'addresses' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Мои адреса</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start gap-4 pb-4 border-b border-gray-100">
                <MapPin size={18} className="text-blue-500 shrink-0 mt-1" />
                <div>
                  <p className="font-semibold text-gray-900">Москва, ул. Ленина, 10, кв. 5</p>
                  <p className="text-sm text-gray-500">Основной адрес</p>
                </div>
              </div>
              <button className="mt-4 text-sm text-blue-600 font-medium hover:underline">+ Добавить адрес</button>
            </div>
          </div>
        )}

        {section === 'settings' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Настройки</h2>
            <div className="space-y-4">
              {[
                { label: 'Имя', value: 'Гость' },
                { label: 'Email', value: 'Не указан' },
                { label: 'Телефон', value: 'Не указан' },
              ].map(field => (
                <div key={field.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">{field.label}</p>
                    <p className="font-medium text-gray-900">{field.value}</p>
                  </div>
                  <button className="text-sm text-blue-600 font-medium hover:underline">Изменить</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'notifications' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Уведомления</h2>
            <div className="space-y-3">
              {[
                { title: 'Ваш заказ №24510 в пути', time: '2 часа назад', unread: true },
                { title: 'Акция: скидка 25% на трикотаж', time: '1 день назад', unread: true },
                { title: 'Заказ №24102 доставлен', time: '3 дня назад', unread: false },
              ].map((n, i) => (
                <div key={i} className={`bg-white rounded-2xl border p-4 ${n.unread ? 'border-blue-200' : 'border-gray-100'}`}>
                  <div className="flex items-start gap-3">
                    {n.unread && <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 shrink-0" />}
                    <div>
                      <p className={`text-sm ${n.unread ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === 'returns' && (
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-6">Возвраты</h2>
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
              <Package size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-900 mb-2">Нет активных возвратов</p>
              <p className="text-sm text-gray-500">Оформить возврат можно в разделе «Мои заказы»</p>
              <button
                onClick={() => setSection('orders')}
                className="mt-6 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                К заказам
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
