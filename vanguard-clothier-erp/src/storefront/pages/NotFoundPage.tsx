import React from 'react';
import { Home, Search } from 'lucide-react';

interface NotFoundPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export default function NotFoundPage({ onNavigate }: NotFoundPageProps) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl font-black text-gray-200 select-none mb-4">404</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Страница не найдена</h1>
      <p className="text-gray-500 max-w-sm mb-8">
        Запрашиваемая страница не существует или была перемещена.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Home size={16} />
          На главную
        </button>
        <button
          onClick={() => onNavigate('catalog')}
          className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
        >
          <Search size={16} />
          В каталог
        </button>
      </div>
    </div>
  );
}
