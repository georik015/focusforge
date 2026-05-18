import React from 'react';
import { MapPin, Phone, Clock, ArrowLeft } from 'lucide-react';

interface StoresPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

const STORES = [
  {
    name: 'ТЦ «Авиапарк»',
    address: 'Ходынский б-р, 4, 3 этаж',
    city: 'Москва',
    phone: '+7 (495) 123-45-67',
    hours: 'Пн–Вс 10:00–22:00',
    metro: 'ЦСКА',
    isMain: true,
  },
  {
    name: 'ТЦ «Мега Белая Дача»',
    address: 'Косинское шоссе, 12',
    city: 'Москва',
    phone: '+7 (495) 987-65-43',
    hours: 'Пн–Вс 10:00–22:00',
    metro: 'Котельники',
    isMain: false,
  },
  {
    name: 'ТЦ «Галерея»',
    address: 'Лиговский пр., 30А',
    city: 'Санкт-Петербург',
    phone: '+7 (812) 456-78-90',
    hours: 'Пн–Вс 10:00–22:00',
    metro: 'Площадь Восстания',
    isMain: false,
  },
];

export default function StoresPage({ onNavigate }: StoresPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft size={14} />
          На главную
        </button>

        <h1 className="text-2xl font-black text-gray-900 mb-6">Наши магазины</h1>

        <div className="space-y-4">
          {STORES.map(store => (
            <div key={store.name} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-base font-bold text-gray-900">{store.name}</h2>
                    {store.isMain && (
                      <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">Главный</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{store.city}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-blue-500 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-gray-900">{store.address}</p>
                    <p className="text-gray-400">м. {store.metro}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Phone size={15} className="text-blue-500 shrink-0" />
                  <a href={`tel:${store.phone}`} className="text-sm text-gray-700 hover:text-blue-600 transition-colors">
                    {store.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={15} className="text-blue-500 shrink-0" />
                  <p className="text-sm text-gray-700">{store.hours}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
