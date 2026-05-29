import React from 'react';
import { Phone, Mail, MapPin, Instagram, Send } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  onStaffLogin?: () => void;
}

export default function Footer({ onNavigate, onStaffLogin }: FooterProps) {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-base">V</span>
            </div>
            <div>
              <div className="font-black text-white text-base">VANGUARD</div>
              <div className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Clothier</div>
            </div>
          </div>
          <p className="text-sm leading-relaxed mb-4">
            Качественная одежда и аксессуары для современного городского жителя
          </p>
          <div className="flex items-center gap-3">
            <a href="https://instagram.com/vanguardclothier" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-blue-600 transition-colors">
              <Instagram size={16} className="text-gray-400" />
            </a>
            <a href="https://t.me/vanguardclothier" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-blue-500 transition-colors">
              <Send size={16} className="text-gray-400" />
            </a>
          </div>
        </div>

        {/* Catalog */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Каталог</h3>
          <ul className="space-y-2.5">
            {['Женское', 'Мужское', 'Верхняя одежда', 'Трикотаж', 'Брюки и джинсы', 'Обувь', 'Аксессуары'].map(cat => (
              <li key={cat}>
                <button
                  onClick={() => onNavigate('catalog', { category: cat })}
                  className="text-sm hover:text-white transition-colors"
                >
                  {cat}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Information */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Информация</h3>
          <ul className="space-y-2.5">
            {[
              { label: 'О компании', section: 'about' },
              { label: 'Доставка и оплата', section: 'delivery' },
              { label: 'Возврат и обмен', section: 'returns' },
              { label: 'Самовывоз', section: 'pickup' },
              { label: 'FAQ', section: 'faq' },
              { label: 'Контакты', section: 'contacts' },
            ].map(item => (
              <li key={item.section}>
                <button
                  onClick={() => onNavigate('info', { section: item.section })}
                  className="text-sm hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Contacts */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-4">Контакты</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-2.5 text-sm">
              <Phone size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div className="text-white font-medium">8 800 123-45-67</div>
                <div className="text-xs text-gray-500">Бесплатно, пн–вс 9:00–21:00</div>
              </div>
            </li>
            <li className="flex items-center gap-2.5 text-sm">
              <Mail size={14} className="text-blue-500 shrink-0" />
              <a href="mailto:help@vanguard.ru" className="hover:text-white transition-colors">help@vanguard.ru</a>
            </li>
            <li className="flex items-start gap-2.5 text-sm">
              <MapPin size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <div>ТЦ «Авиапарк», Ходынский б-р, 4</div>
                <button
                  onClick={() => onNavigate('stores')}
                  className="text-blue-400 text-xs hover:text-blue-300 transition-colors mt-0.5"
                >
                  Все магазины →
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-600">© 2026 Vanguard Clothier. Все права защищены.</p>
            {onStaffLogin && (
              <button
                onClick={onStaffLogin}
                className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors border border-gray-700 rounded px-2 py-0.5"
              >
                Панель сотрудника
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('info', { section: 'privacy' })}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Политика конфиденциальности
            </button>
            <button
              onClick={() => onNavigate('info', { section: 'terms' })}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              Пользовательское соглашение
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
