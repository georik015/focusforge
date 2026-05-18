import React, { useState } from 'react';
import {
  Activity,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Scan,
  User as UserIcon,
  CreditCard,
  Map,
  Database,
  LayoutGrid,
  Tag,
  ClipboardList,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User, Role } from '../types';
import { motion, AnimatePresence } from 'motion/react';

import { useTranslation } from 'react-i18next';
import { LanguageSelector } from './LanguageSelector';

interface SidebarItem {
  icon: any;
  labelKey: string;
  id: string;
  roles: Role[];
}

const sidebarItems: SidebarItem[] = [
  { icon: Activity, labelKey: 'common.dashboard', id: 'dashboard', roles: ['ADMIN', 'SELLER', 'STOREKEEPER'] },
  { icon: LayoutGrid, labelKey: 'common.catalog', id: 'catalog', roles: ['ADMIN', 'SELLER', 'STOREKEEPER'] },
  { icon: ShoppingCart, labelKey: 'common.pos', id: 'pos', roles: ['ADMIN', 'SELLER'] },
  { icon: UserIcon, labelKey: 'common.crm', id: 'crm', roles: ['ADMIN', 'SELLER'] },
  { icon: ClipboardList, labelKey: 'common.orders', id: 'orders', roles: ['ADMIN', 'SELLER'] },
  { icon: Package, labelKey: 'common.inventory', id: 'inventory', roles: ['ADMIN', 'STOREKEEPER'] },
  { icon: Scan, labelKey: 'common.procurement', id: 'supplies', roles: ['ADMIN', 'STOREKEEPER'] },
  { icon: Tag, labelKey: 'common.brands', id: 'brands', roles: ['ADMIN'] },
  { icon: Map, labelKey: 'common.warehouses', id: 'warehouse', roles: ['ADMIN'] },
  { icon: CreditCard, labelKey: 'common.finances', id: 'finances', roles: ['ADMIN'] },
  { icon: Database, labelKey: 'common.analytics', id: 'reports', roles: ['ADMIN'] },
  { icon: Settings, labelKey: 'common.settings', id: 'settings', roles: ['ADMIN'] },
];

export function DashboardLayout({ 
  children, 
  activeTab, 
  setActiveTab,
  user,
  onLogout 
}: { 
  children: React.ReactNode; 
  activeTab: string; 
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}) {
  const { t } = useTranslation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredSidebarItems = sidebarItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  const handleTabClick = (id: string) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-800 overflow-hidden">
      {/* Industrial Sidebar */}
      <aside className={cn(
        "hidden md:flex bg-retail-dark transition-all duration-200 flex-col z-30 shrink-0",
        isSidebarOpen ? "w-56" : "w-14"
      )}>
        <div className="h-14 flex items-center gap-3 px-3 border-b border-white/10">
          <div className="w-8 h-8 bg-retail-blue flex items-center justify-center text-white font-black shrink-0">
            V
          </div>
          {isSidebarOpen && (
            <span className="font-black text-sm tracking-widest text-white uppercase opacity-80">
              Vanguard ERP
            </span>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto custom-scrollbar">
          {filteredSidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all group relative",
                activeTab === item.id 
                  ? "bg-retail-blue text-white" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {isSidebarOpen && <span>{t(item.labelKey)}</span>}
            </button>
          ))}
        </nav>

        <div className="p-2 border-t border-white/10">
          <button 
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-red-900/20 hover:text-red-400"
            onClick={onLogout}
          >
            <LogOut size={18} />
            {isSidebarOpen && <span>{t('common.logout')}</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="fixed inset-y-0 left-0 w-64 bg-retail-dark z-50 flex flex-col md:hidden"
            >
              <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-retail-blue flex items-center justify-center text-white font-black shrink-0">V</div>
                  <span className="font-black text-sm tracking-widest text-white uppercase opacity-80">Vanguard ERP</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-1.5 rounded hover:bg-white/10 text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto">
                {filteredSidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all",
                      activeTab === item.id ? "bg-retail-blue text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <item.icon size={18} className="shrink-0" />
                    <span>{t(item.labelKey)}</span>
                  </button>
                ))}
              </nav>
              <div className="p-2 border-t border-white/10">
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:bg-red-900/20 hover:text-red-400">
                  <LogOut size={18} />
                  <span>{t('common.logout')}</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Compact Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-20 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-1.5 md:hidden hover:bg-slate-100 rounded"
            >
              <Menu size={20} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hidden md:flex hover:bg-slate-100 rounded text-slate-400"
            >
              <Menu size={18} />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <h1 className="text-xs font-black uppercase tracking-widest text-slate-500 hidden sm:block">
              {t(sidebarItems.find(i => i.id === activeTab)?.labelKey || '')}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center px-3 py-1 bg-slate-100 border border-slate-200 rounded gap-2">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">{t('common.online')}</span>
            </div>
            
            <div className="p-1.5 relative hover:bg-slate-100 rounded text-slate-400 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-retail-blue rounded-full"></span>
            </div>

            <LanguageSelector />

            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

            <div className="flex items-center gap-3 pl-2">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-black text-slate-900 uppercase leading-none">{user?.name}</p>
                <p className="text-[9px] font-bold text-retail-blue mt-1 uppercase tracking-tighter">{user?.role}</p>
              </div>
              <div className="w-8 h-8 bg-slate-100 rounded flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200">
                <UserIcon size={16} />
              </div>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <div className="flex-1 overflow-auto bg-slate-100">
          <div className="max-w-full mx-auto min-h-full">
            <div className="p-4 md:p-6">
              {children}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
