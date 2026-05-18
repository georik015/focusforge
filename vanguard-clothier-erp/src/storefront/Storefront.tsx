import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import CartDrawer from './components/CartDrawer';
import CityModal from './components/CityModal';
import SearchModal from './components/SearchModal';
import CustomerAuthModal from './components/CustomerAuthModal';
import BarcodeScanner from './components/BarcodeScanner';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import ProfilePage from './pages/ProfilePage';
import InfoPage from './pages/InfoPage';
import StoresPage from './pages/StoresPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderSuccessPage from './pages/OrderSuccessPage';
import { StorefrontProduct } from './components/ProductCard';

type Page = 'home' | 'catalog' | 'product' | 'profile' | 'info' | 'stores' | 'wishlist' | 'checkout' | 'order-success';

interface NavState {
  page: Page;
  params: Record<string, string>;
}

interface CustomerInfo {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  loyaltyPoints: number;
}

interface StorefrontProps {
  onLogin?: () => void;
}

function loadCustomer(): CustomerInfo | null {
  try {
    const raw = localStorage.getItem('customerInfo');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function Storefront({ onLogin }: StorefrontProps) {
  const [nav, setNav] = useState<NavState>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('product');
    return productId
      ? { page: 'product' as Page, params: { productId } }
      : { page: 'home' as Page, params: {} as Record<string, string> };
  });

  const [searchOpen, setSearchOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');

  const [customerToken, setCustomerToken] = useState<string | null>(() => localStorage.getItem('customerToken'));
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(loadCustomer);

  const handleAuth = useCallback((token: string, customer: CustomerInfo) => {
    setCustomerToken(token);
    setCustomerInfo(customer);
    localStorage.setItem('customerToken', token);
    localStorage.setItem('customerInfo', JSON.stringify(customer));
    setAuthModalOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    setCustomerToken(null);
    setCustomerInfo(null);
    localStorage.removeItem('customerToken');
    localStorage.removeItem('customerInfo');
  }, []);

  const navigate = useCallback((page: string, params: Record<string, string> = {}) => {
    if ((page === 'login' || page === 'register') || (page === 'profile' && !customerToken)) {
      setAuthModalOpen(true);
      return;
    }
    setNav({ page: page as Page, params });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [customerToken]);

  const handleProductClick = useCallback((product: StorefrontProduct) => {
    navigate('product', { productId: product.id });
  }, [navigate]);

  const handleBarcodeScanFound = useCallback(async (sku: string) => {
    setScannerOpen(false);
    try {
      const res = await fetch(`/api/public/sku/${encodeURIComponent(sku)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.product?.id) navigate('product', { productId: data.product.id });
      }
    } catch { /* ignore */ }
  }, [navigate]);

  const handleCheckoutSuccess = useCallback((orderId: string) => {
    setSuccessOrderId(orderId);
    setNav({ page: 'order-success', params: { orderId } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const showFooter = nav.page !== 'checkout' && nav.page !== 'order-success';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onNavigate={navigate}
        onOpenSearch={() => setSearchOpen(true)}
        onOpenScanner={() => setScannerOpen(true)}
        currentPage={nav.page}
        customerInfo={customerInfo}
      />

      <main className="flex-1">
        {nav.page === 'home' && (
          <HomePage onNavigate={navigate} onAddToCart={handleProductClick} />
        )}
        {nav.page === 'catalog' && (
          <CatalogPage
            onNavigate={navigate}
            onAddToCart={handleProductClick}
            initialParams={nav.params}
          />
        )}
        {nav.page === 'product' && nav.params.productId && (
          <ProductPage
            productId={nav.params.productId}
            onNavigate={navigate}
            onBack={() => navigate('catalog')}
          />
        )}
        {nav.page === 'profile' && (
          <ProfilePage
            onNavigate={navigate}
            onAddToCart={handleProductClick}
            customerInfo={customerInfo}
            onLogout={handleLogout}
          />
        )}
        {nav.page === 'wishlist' && (
          <ProfilePage
            onNavigate={navigate}
            onAddToCart={handleProductClick}
            customerInfo={customerInfo}
            onLogout={handleLogout}
          />
        )}
        {nav.page === 'info' && (
          <InfoPage section={nav.params.section} onNavigate={navigate} />
        )}
        {nav.page === 'stores' && (
          <StoresPage onNavigate={navigate} />
        )}
        {nav.page === 'checkout' && (
          <CheckoutPage
            onBack={() => navigate('catalog')}
            onSuccess={handleCheckoutSuccess}
            customerToken={customerToken}
            customerName={customerInfo?.name}
            customerEmail={customerInfo?.email ?? undefined}
            customerPhone={customerInfo?.phone ?? undefined}
          />
        )}
        {nav.page === 'order-success' && (
          <OrderSuccessPage
            orderId={successOrderId || nav.params.orderId || ''}
            onNavigate={navigate}
          />
        )}
      </main>

      {showFooter && <Footer onNavigate={navigate} onStaffLogin={onLogin} />}

      {/* Overlays */}
      <CartDrawer onCheckout={() => navigate('checkout')} />
      <CityModal />
      {searchOpen && (
        <SearchModal
          onClose={() => setSearchOpen(false)}
          onNavigate={(page, params) => { navigate(page, params); setSearchOpen(false); }}
        />
      )}
      {scannerOpen && (
        <BarcodeScanner
          onClose={() => setScannerOpen(false)}
          onFound={handleBarcodeScanFound}
        />
      )}
      {authModalOpen && (
        <CustomerAuthModal
          onClose={() => setAuthModalOpen(false)}
          onAuth={handleAuth}
        />
      )}
    </div>
  );
}
