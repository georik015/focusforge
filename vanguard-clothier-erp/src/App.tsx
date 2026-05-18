import { useState, useEffect } from 'react';
import { Login } from './pages/Login';
import './i18n/config';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { POS } from './pages/POS';
import { Supplies } from './pages/Supplies';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { CRM } from './pages/CRM';
import { Warehouses } from './pages/Warehouses';
import { Finances } from './pages/Finances';
import { Catalog } from './pages/Catalog';
import { Brands } from './pages/Brands';
import { Orders } from './pages/Orders';
import { DashboardLayout } from './components/DashboardLayout';
import { CommandPalette } from './components/CommandPalette';
import Storefront from './storefront/Storefront';
import { User } from './types';
import { api } from './lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { ErrorBoundary } from './components/ErrorBoundary';

type AuthView = 'login' | 'register' | 'forgot';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [authView, setAuthView] = useState<AuthView>('login');

  useEffect(() => {
    if (token) {
      validateToken();
    } else {
      setIsInitializing(false);
    }
  }, [token]);

  const validateToken = async () => {
    try {
      const userData = await api.get<User>('/auth/me');
      setUser(userData);
    } catch {
      handleLogout();
    } finally {
      setTimeout(() => setIsInitializing(false), 300);
    }
  };

  const handleLogin = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(userData);
    setShowLogin(false);
    setAuthView('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setActiveTab('dashboard');
    setAuthView('login');
    setShowLogin(false);
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
        <div className="w-14 h-14 bg-blue-600 rounded-2xl animate-pulse flex items-center justify-center text-white font-black text-2xl shadow-xl">
          V
        </div>
      </div>
    );
  }

  // Guest / storefront view
  if (!token || !user) {
    if (showLogin) {
      return (
        <ErrorBoundary>
          <Login onLogin={handleLogin} initialView={authView} onBack={() => setShowLogin(false)} />
        </ErrorBoundary>
      );
    }
    return (
      <ErrorBoundary>
        <Storefront onLogin={() => setShowLogin(true)} />
      </ErrorBoundary>
    );
  }

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.99 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="w-full"
        >
          {(() => {
            switch (activeTab) {
              case 'dashboard': return <Dashboard />;
              case 'catalog': return <Catalog />;
              case 'brands': return <Brands />;
              case 'inventory': return <Inventory />;
              case 'pos': return <POS />;
              case 'supplies': return <Supplies />;
              case 'reports': return <Reports />;
              case 'settings': return <Settings />;
              case 'crm': return <CRM />;
              case 'orders': return <Orders />;
              case 'warehouse': return <Warehouses />;
              case 'finances': return <Finances />;
              default: return <Dashboard />;
            }
          })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <ErrorBoundary>
      <div className="relative">
        <CommandPalette onNavigate={setActiveTab} />
        <DashboardLayout
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          onLogout={handleLogout}
        >
          {renderContent()}
        </DashboardLayout>
      </div>
    </ErrorBoundary>
  );
}

export default App;
