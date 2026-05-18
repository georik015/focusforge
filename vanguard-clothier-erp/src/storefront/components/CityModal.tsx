import React, { useState } from 'react';
import { X, MapPin, Search } from 'lucide-react';
import { useCityStore, CITIES } from '../../store/cityStore';

export default function CityModal() {
  const { showModal, closeModal, setCity, city } = useCityStore();
  const [search, setSearch] = useState('');

  if (!showModal) return null;

  const filtered = CITIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Выберите город</h2>
          <button onClick={closeModal} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск города..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-0.5 max-h-72 overflow-y-auto">
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => setCity(c)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-blue-50 transition-colors ${c.id === city.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'}`}
              >
                <MapPin size={15} className={c.id === city.id ? 'text-blue-500' : 'text-gray-400'} />
                <div>
                  <div className="text-sm font-medium">{c.name}</div>
                  {c.region && <div className="text-xs text-gray-400">{c.region}</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
