import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useKey } from 'react-use';

interface CommandItem {
  id: string;
  name: string;
  icon: any;
  category: string;
  action: () => void;
  shortcut?: string;
}

interface CommandPaletteProps {
  onNavigate: (page: any) => void;
  userRole?: string;
}

const ALL_ITEMS = [
  { id: 'dash',      name: 'Перейти к дашборду',     icon: LayoutDashboard, category: 'Навигация',   tab: 'dashboard', shortcut: 'G D', roles: ['ADMIN','SELLER','STOREKEEPER'] },
  { id: 'pos',       name: 'Открыть кассу (POS)',     icon: ShoppingCart,    category: 'Торговля',    tab: 'pos',       shortcut: 'G P', roles: ['ADMIN','SELLER'] },
  { id: 'inv',       name: 'Управление товарами',     icon: Package,         category: 'Навигация',   tab: 'inventory', shortcut: 'G I', roles: ['ADMIN','STOREKEEPER'] },
  { id: 'crm',       name: 'CRM — Клиенты',           icon: Users,           category: 'Навигация',   tab: 'crm',       shortcut: 'G C', roles: ['ADMIN','SELLER'] },
  { id: 'reports',   name: 'Отчёты и аналитика',      icon: BarChart3,       category: 'Управление',  tab: 'reports',                    roles: ['ADMIN','STOREKEEPER'] },
  { id: 'warehouse', name: 'Управление складом',       icon: Truck,           category: 'Навигация',   tab: 'warehouse',                  roles: ['ADMIN','STOREKEEPER'] },
  { id: 'settings',  name: 'Настройки системы',        icon: Settings,        category: 'Управление',  tab: 'settings',                   roles: ['ADMIN'] },
] as const;

export function CommandPalette({ onNavigate, userRole }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const toggle = useCallback(() => setIsOpen(open => !open), []);

  useKey((e) => (e.metaKey || e.ctrlKey) && e.key === 'k', (e) => {
    e.preventDefault();
    toggle();
  });

  useKey('Escape', () => setIsOpen(false));

  const items: CommandItem[] = ALL_ITEMS
    .filter(item => !userRole || item.roles.includes(userRole as any))
    .map(item => ({ ...item, action: () => onNavigate(item.tab) }));

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[60vh]"
      >
        <div className="flex items-center px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <Search className="text-slate-400 mr-4" size={20} />
          <input 
            autoFocus
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent border-none outline-none text-lg font-medium text-slate-900 placeholder:text-slate-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
            ESC to close
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => { item.action(); setIsOpen(false); }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all ${index === selectedIndex ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${index === selectedIndex ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                   <item.icon size={20} />
                </div>
                <div className="text-left">
                  <div className={`text-sm font-black ${index === selectedIndex ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${index === selectedIndex ? 'text-white/60' : 'text-slate-400'}`}>{item.category}</div>
                </div>
              </div>
              {item.shortcut && (
                <div className={`text-[10px] font-black px-2 py-1 rounded-md ${index === selectedIndex ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  {item.shortcut}
                </div>
              )}
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto">
                <Zap size={32} />
              </div>
              <p className="text-slate-400 font-bold text-sm">No commands found matching "{search}"</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-500 shadow-sm">↑↓</kbd>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Navigate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-500 shadow-sm">Enter</kbd>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Ready</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
