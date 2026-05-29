import React, { useState } from 'react';
import { Search, ShoppingBag, Heart, MapPin, User, Menu, X, ChevronDown, Phone, ScanLine } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCityStore } from '../../store/cityStore';

interface HeaderProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onOpenSearch: () => void;
  onOpenScanner: () => void;
  currentPage: string;
  currentSection?: string;
  customerInfo?: { name: string } | null;
}

const MAIN_CATEGORIES = [
  { label: 'Женское', params: { gender: 'FEMALE' }, icon: '👗' },
  { label: 'Мужское', params: { gender: 'MALE' }, icon: '👔' },
  { label: 'Детское', params: { gender: 'KIDS' }, icon: '🧒' },
  { label: 'Обувь', params: { category: 'Обувь' }, icon: '👟' },
  { label: 'Аксессуары', params: { category: 'Аксессуары' }, icon: '🎒' },
  { label: 'Новинки', params: { sort: 'newest' }, icon: '✨' },
  { label: 'Акции', params: { sort: 'price_asc' }, icon: '🏷️' },
];

const QUICK_LINKS = ['Кроссовки', 'Футболки', 'Толстовки', 'Брюки', 'Джинсы', 'Куртки', 'Пальто', 'Платья'];

export default function Header({ onNavigate, onOpenSearch, onOpenScanner, currentPage, currentSection, customerInfo }: HeaderProps) {
  const cartCount = useCartStore(s => s.count());
  const openCart = useCartStore(s => s.openCart);
  const wishlistCount = useWishlistStore(s => s.items.length);
  const { city, openModal } = useCityStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white">
      {/* Top bar */}
      <div className="bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-9 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <a href="tel:+78001234567" className="flex items-center gap-1 hover:text-gray-700 transition-colors">
              <Phone size={11} />
              8 800 123-45-67
            </a>
            <span className="hidden sm:inline text-gray-300">|</span>
            <button
              onClick={() => onNavigate('info', { section: 'delivery' })}
              className="hidden sm:inline hover:text-gray-700 transition-colors"
            >
              Доставка и оплата
            </button>
            <button
              onClick={() => onNavigate('stores')}
              className="hidden sm:inline hover:text-gray-700 transition-colors"
            >
              Магазины
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('info', { section: 'loyalty' })}
              className="hidden sm:inline hover:text-gray-700 transition-colors"
            >
              Карта лояльности
            </button>
            <button
              onClick={openModal}
              className="flex items-center gap-1 hover:text-gray-700 transition-colors font-medium text-gray-700"
            >
              <MapPin size={11} className="text-blue-500" />
              {city.name}
              <ChevronDown size={10} />
            </button>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="shrink-0 flex items-center gap-2 group"
          >
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-700 transition-colors">
              <span className="text-white font-black text-base tracking-tight">V</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-black text-gray-900 text-base leading-tight tracking-tight">VANGUARD</div>
              <div className="text-[9px] text-gray-400 font-medium tracking-widest uppercase leading-tight">Clothier</div>
            </div>
          </button>

          {/* Search */}
          <button
            onClick={onOpenSearch}
            className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-xl transition-all text-left"
          >
            <Search size={16} className="text-gray-400 shrink-0" />
            <span className="text-sm text-gray-400">Поиск товаров, брендов...</span>
          </button>

          {/* Barcode scanner */}
          <button
            onClick={onOpenScanner}
            className="shrink-0 p-2.5 rounded-xl hover:bg-gray-100 transition-colors group"
            title="Сканировать штрих-код"
          >
            <ScanLine size={20} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Wishlist */}
            <button
              onClick={() => onNavigate('profile', { section: 'wishlist' })}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors group"
              title="Избранное"
            >
              <Heart size={20} className={`transition-colors ${currentPage === 'profile' && currentSection === 'wishlist' ? 'text-red-500 fill-red-500' : 'text-gray-600 group-hover:text-red-500'}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </button>

            {/* Cart */}
            <button
              onClick={openCart}
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors group"
              title="Корзина"
            >
              <ShoppingBag size={20} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </button>

            {/* Profile */}
            <button
              onClick={() => onNavigate('profile')}
              className="hidden sm:flex items-center gap-1.5 p-2.5 rounded-xl hover:bg-gray-100 transition-colors group"
              title={customerInfo ? customerInfo.name : 'Личный кабинет'}
            >
              <User size={20} className={`transition-colors ${customerInfo ? 'text-blue-600' : currentPage === 'profile' ? 'text-blue-600' : 'text-gray-600 group-hover:text-blue-600'}`} />
              {customerInfo && (
                <span className="text-xs font-medium text-blue-600 max-w-[80px] truncate">{customerInfo.name.split(' ')[0]}</span>
              )}
            </button>

            {/* Mobile menu */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="sm:hidden p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              {mobileOpen ? <X size={20} className="text-gray-600" /> : <Menu size={20} className="text-gray-600" />}
            </button>
          </div>
        </div>
      </div>

      {/* Category nav */}
      <div className="hidden sm:block bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-11 gap-0.5 overflow-x-auto no-scrollbar">
            {MAIN_CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => onNavigate('catalog', cat.params)}
                className="shrink-0 px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap"
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick links strip */}
      <div className="hidden sm:block bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center h-9 gap-4 overflow-x-auto no-scrollbar">
            {QUICK_LINKS.map(link => (
              <button
                key={link}
                onClick={() => onNavigate('catalog', { search: link })}
                className="shrink-0 text-xs text-gray-500 hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                {link}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-1">
            {MAIN_CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => { onNavigate('catalog', cat.params); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors"
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
            <div className="pt-2 mt-2 border-t border-gray-100 space-y-1">
              <button
                onClick={() => { onNavigate('profile'); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                <User size={16} />
                Личный кабинет
              </button>
              <button
                onClick={() => { openModal(); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl"
              >
                <MapPin size={16} />
                {city.name}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
