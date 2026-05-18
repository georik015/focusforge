import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  ShoppingCart,
  User,
  CreditCard,
  Banknote,
  Plus,
  Minus,
  Keyboard,
  Zap,
  Lock,
  ChevronRight,
  History,
  X,
  RefreshCw,
  RotateCcw,
  UserCheck,
  UserX,
  Star,
} from 'lucide-react';
import { Input } from '../components/ui/Input';
import { ProductVariation, SaleItem, Customer } from '../types';
import { api } from '../lib/api';
import { AnimatePresence } from 'motion/react';
import { useKey } from 'react-use';
import { Receipt } from '../components/Receipt';
import { useReactToPrint } from 'react-to-print';
import debounce from 'lodash.debounce';
import { useTranslation } from 'react-i18next';

interface CartItem extends Partial<SaleItem> {
  variation: ProductVariation;
  quantity: number;
  tempId: string;
}

export function POS() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [products, setProducts] = useState<ProductVariation[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'CASH' | 'CARD'>('CASH');
  const [discount, setDiscount] = useState(0);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Customer search
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);

  // Return modal
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [returnSaleId, setReturnSaleId] = useState('');
  const [returnSale, setReturnSale] = useState<any>(null);
  const [returnSaleLoading, setReturnSaleLoading] = useState(false);
  const [returnSaleError, setReturnSaleError] = useState('');
  const [returnItemQtys, setReturnItemQtys] = useState<Record<string, number>>({});
  const [returnProcessing, setReturnProcessing] = useState(false);
  const [storeConfig, setStoreConfig] = useState<{ storeName?: string; storeAddress?: string; storePhone?: string }>({});

  const searchInputRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const scanSoundRef = useRef<HTMLAudioElement | null>(null);
  
  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
  });

  const debouncedSetSearch = useMemo(
    () => debounce((value: string) => setDebouncedSearch(value), 100),
    []
  );

  useEffect(() => {
    debouncedSetSearch(search);
  }, [search]);

  useEffect(() => {
    const handleStatusChange = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);
    
    const queue = JSON.parse(localStorage.getItem('vanguard_offline_sales') || '[]');
    setPendingSyncCount(queue.length);

    scanSoundRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');

    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []);

  const syncOfflineSales = async () => {
    if (!isOnline || isSyncing) return;
    const queue = JSON.parse(localStorage.getItem('vanguard_offline_sales') || '[]');
    if (queue.length === 0) return;

    setIsSyncing(true);
    const remainingQueue = [];
    for (const sale of queue) {
      try {
        await api.post('/sales', sale);
      } catch (err) {
        remainingQueue.push(sale);
      }
    }
    localStorage.setItem('vanguard_offline_sales', JSON.stringify(remainingQueue));
    setPendingSyncCount(remainingQueue.length);
    setIsSyncing(false);
  };

  // Customer search handlers
  const searchCustomers = async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomerSearchResults([]); return; }
    setCustomerSearchLoading(true);
    try {
      const results = await api.get<Customer[]>(`/customers/search?q=${encodeURIComponent(q)}`);
      setCustomerSearchResults(results);
    } catch { /* ignore */ } finally {
      setCustomerSearchLoading(false);
    }
  };

  const attachCustomer = (c: Customer) => {
    setCustomer(c);
    setIsCustomerSearchOpen(false);
    setCustomerSearch('');
    setCustomerSearchResults([]);
  };

  const openCustomerSearch = () => {
    setCustomerSearch('');
    setCustomerSearchResults([]);
    setIsCustomerSearchOpen(true);
  };

  // Return handlers
  const lookupSaleForReturn = async () => {
    if (!returnSaleId.trim()) return;
    setReturnSaleLoading(true);
    setReturnSaleError('');
    setReturnSale(null);
    try {
      const sale = await api.get<any>(`/sales/${returnSaleId.trim()}`);
      setReturnSale(sale);
      const initQtys: Record<string, number> = {};
      sale.items.forEach((item: any) => { initQtys[item.id] = 0; });
      setReturnItemQtys(initQtys);
    } catch {
      setReturnSaleError('Чек не найден. Проверьте ID продажи.');
    } finally {
      setReturnSaleLoading(false);
    }
  };

  const processReturn = async () => {
    const itemsToReturn = returnSale.items
      .filter((item: any) => (returnItemQtys[item.id] ?? 0) > 0)
      .map((item: any) => ({
        variationId: item.variationId,
        quantity: returnItemQtys[item.id],
        refundPrice: item.priceAtSale,
      }));

    if (!itemsToReturn.length) { alert('Выберите товары для возврата'); return; }
    setReturnProcessing(true);
    try {
      await api.post('/sales/returns', { saleId: returnSale.id, items: itemsToReturn });
      alert(`Возврат оформлен. Сумма: ₽${itemsToReturn.reduce((s: number, i: any) => s + i.quantity * i.refundPrice, 0).toLocaleString()}`);
      setIsReturnOpen(false);
      setReturnSale(null);
      setReturnSaleId('');
    } catch {
      alert('Ошибка при оформлении возврата');
    } finally {
      setReturnProcessing(false);
    }
  };

  useKey('F1', (e) => { e.preventDefault(); searchInputRef.current?.focus(); });
  useKey('F2', (e) => { e.preventDefault(); if (currentShift) setIsCheckoutOpen(true); });
  useKey('Escape', () => { setIsCheckoutOpen(false); });
  
  useEffect(() => {
    const initialize = async () => {
      await checkShift();
      fetchProducts();
      setIsLoading(false);
    };
    initialize();
    api.get<{ storeName: string; storeAddress: string; storePhone: string }>('/config/public')
      .then(cfg => setStoreConfig({ storeName: cfg.storeName, storeAddress: cfg.storeAddress, storePhone: cfg.storePhone }))
      .catch(() => {});
    const cache = localStorage.getItem('vanguard_product_cache');
    if (cache) setProducts(JSON.parse(cache));
  }, []);

  const checkShift = async () => {
    try {
      const shift = await api.get('/shifts/current');
      setCurrentShift(shift);
      if (!shift) setShowShiftModal(true);
    } catch (err) {
      console.error('Failed to check shift');
    }
  };

  const handleOpenShift = async () => {
    try {
      const shift = await api.post('/shifts/open', { openingBalance: parseFloat(openingBalance) });
      setCurrentShift(shift);
      setShowShiftModal(false);
      searchInputRef.current?.focus();
    } catch (err) {
      alert('Failed to open shift');
    }
  };

  const handleCloseShift = async () => {
    const balance = prompt(t('pos.enter_drawer_balance'));
    if (balance === null) return;
    try {
      await api.post('/shifts/close', { 
        closingBalance: parseFloat(balance),
        notes: t('pos.shift_notes')
      });
      setCurrentShift(null);
      setShowShiftModal(true);
    } catch (err) {
      alert(t('pos.error_close_shift'));
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await api.get<ProductVariation[]>('/products/variations');
      setProducts(data);
      localStorage.setItem('vanguard_product_cache', JSON.stringify(data));
    } catch (err) {
      console.error('Offline mode');
    }
  };

  const addToCart = (variation: ProductVariation) => {
    if (!currentShift) {
      setShowShiftModal(true);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.variation.id === variation.id);
      if (scanSoundRef.current) {
        scanSoundRef.current.currentTime = 0;
        scanSoundRef.current.play().catch(() => {});
      }
      if (existing) {
        return prev.map(item => 
          item.variation.id === variation.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { variation, quantity: 1, tempId: Math.random().toString(), priceAtSale: variation.salePrice }];
    });
    setSearch('');
    searchInputRef.current?.focus();
  };

  const updateQuantity = (tempId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (tempId: string) => {
    setCart(prev => prev.filter(item => item.tempId !== tempId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.variation.salePrice * item.quantity), 0);
  const total = Math.max(0, subtotal - discount);

  const handleCheckout = async () => {
    const saleData = {
      items: cart.map(item => ({
        variationId: item.variation.id,
        quantity: item.quantity,
        priceAtSale: item.variation.salePrice
      })),
      totalAmount: total,
      paymentType,
      customerId: customer?.id,
      discount,
      shiftId: currentShift?.id
    };

    try {
      await api.post('/sales', saleData);
      handlePrint();
      completeSale();
    } catch (err) {
      const queue = JSON.parse(localStorage.getItem('vanguard_offline_sales') || '[]');
      queue.push({ ...saleData, offlineId: Date.now() });
      localStorage.setItem('vanguard_offline_sales', JSON.stringify(queue));
      setPendingSyncCount(prev => prev + 1);
      handlePrint();
      completeSale();
    }
  };

  const completeSale = () => {
    setCart([]);
    setCustomer(null);
    setDiscount(0);
    setIsCheckoutOpen(false);
  };

  useEffect(() => {
    if (search.length >= 8) {
      const match = products.find(p => p.sku === search);
      if (match) addToCart(match);
    }
  }, [search, products]);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-slate-200 overflow-hidden font-mono retail-density">
      <div className="hidden">
        <Receipt
          ref={receiptRef}
          sale={{ totalAmount: total, discount, paymentType, id: 'temp-id' }}
          items={cart}
          storeName={storeConfig.storeName}
          storeAddress={storeConfig.storeAddress}
          storePhone={storeConfig.storePhone}
        />
      </div>

      {/* Industrial Top Bar */}
      <div className="bg-retail-dark text-white px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-retail-blue flex items-center justify-center text-white font-black text-[10px]">V</div>
            <span className="font-black text-[10px] tracking-widest uppercase opacity-70">КАССОВЫЙ ТЕРМИНАЛ №1 // {currentShift?.user?.name || t('common.ready')}</span>
          </div>
          
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1"><Keyboard size={12} /> F1 {t('common.search')}</span>
            <span className="flex items-center gap-1 text-emerald-400"><Zap size={12} /> {t('pos.scanner_active')}</span>
            
            {pendingSyncCount > 0 ? (
              <button 
                onClick={syncOfflineSales}
                className="text-amber-400 flex items-center gap-1"
              >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} /> {pendingSyncCount} {t('pos.pending_sync')}
              </button>
            ) : (
              <span className={isOnline ? "text-emerald-500" : "text-red-400"}>
                {isOnline ? t('common.online') : t('common.offline')}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {currentShift ? (
            <button 
              onClick={handleCloseShift}
              className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-600/30 text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all"
            >
              {t('pos.close_shift')}
            </button>
          ) : (
            <button 
              onClick={() => setShowShiftModal(true)}
              className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest"
            >
              {t('pos.open_shift')}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Inventory Selection */}
        <div className="flex-1 flex flex-col p-2 space-y-2 overflow-hidden">
          <div className="relative group shrink-0">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <Input 
              ref={searchInputRef}
              placeholder={t('pos.search_placeholder')} 
              className="h-10 pl-10 bg-white border-retail-border rounded-none text-sm font-black uppercase placeholder:opacity-30 focus:ring-retail-blue"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 overflow-y-auto pr-1 pb-2 custom-scrollbar">
            {products.filter(p => 
              p.product?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
              p.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
            ).map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white p-3 border border-retail-border hover:border-retail-blue transition-all text-left flex flex-col h-fit group relative"
              >
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 pt-1 border-t border-slate-50">{product.sku}</div>
                <div className="font-bold text-slate-800 text-[11px] leading-tight flex-1 uppercase h-8 overflow-hidden">{product.product?.name}</div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="font-black text-retail-blue text-xs tracking-tighter">₽{product.salePrice.toLocaleString()}</div>
                  <div className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 text-slate-500 uppercase">
                    STK: {product.stock}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dense Cart Checkout */}
        <div className="w-[480px] bg-white border-l border-retail-border flex flex-col z-20 overflow-hidden">
          <div className="h-10 px-4 bg-slate-100 border-b border-retail-border flex items-center justify-between shrink-0 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <div className="flex items-center gap-2">
              <ShoppingCart size={14} /> {t('pos.active_basket')}
            </div>
            <span>{cart.length} {t('pos.units')}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="retail-table w-full">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  <th className="text-left py-2 font-black uppercase">{t('inventory.product')}</th>
                  <th className="text-center py-2 font-black uppercase">{t('receipt.qty')}</th>
                  <th className="text-right py-2 font-black uppercase">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <tr key={item.tempId} className="hover:bg-slate-50 group">
                    <td className="py-2 px-3">
                      <div className="text-[10px] font-black text-slate-900 leading-none uppercase">{item.variation.product?.name}</div>
                      <div className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{item.variation.sku} // {item.variation.size}</div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                         <button onClick={() => updateQuantity(item.tempId, -1)} className="text-slate-300 hover:text-red-500">
                            <Minus size={12} />
                         </button>
                         <span className="font-black text-xs text-retail-blue">{item.quantity}</span>
                         <button onClick={() => updateQuantity(item.tempId, 1)} className="text-slate-300 hover:text-retail-blue">
                            <Plus size={12} />
                         </button>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right font-black text-slate-900 text-[11px]">
                      <div className="flex items-center justify-end gap-2">
                        <span>₽{(item.variation.salePrice * item.quantity).toLocaleString()}</span>
                        <button
                          onClick={() => removeFromCart(item.tempId)}
                          className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale">
                 <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-slate-400 mb-2">
                    <History size={32} />
                 </div>
                 <p className="text-[10px] font-black uppercase tracking-widest">{t('pos.idling')}</p>
              </div>
            )}
          </div>

          {/* Giant Operation Control */}
          <div className="p-4 bg-retail-dark space-y-4">
            {/* Customer badge */}
            {customer && (
              <div className="flex items-center justify-between bg-emerald-900/30 border border-emerald-700/40 px-3 py-2">
                <div className="flex items-center gap-2">
                  <UserCheck size={12} className="text-emerald-400" />
                  <span className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">{customer.name}</span>
                  <span className="text-[9px] text-emerald-500">· {customer.loyaltyPoints} баллов</span>
                </div>
                <button onClick={() => setCustomer(null)} className="text-emerald-600 hover:text-red-400 transition-colors">
                  <UserX size={12} />
                </button>
              </div>
            )}
             <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={openCustomerSearch}
                  className="h-10 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 flex items-center justify-center gap-2 transition-colors"
                >
                  <User size={14} /> {customer ? 'СМЕНИТЬ КЛИЕНТА' : t('pos.add_customer')}
                </button>
                <button
                  onClick={() => { setReturnSale(null); setReturnSaleId(''); setReturnSaleError(''); setIsReturnOpen(true); }}
                  className="h-10 bg-white/5 hover:bg-amber-900/30 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-white/10 hover:border-amber-700/40 flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw size={14} /> ВОЗВРАТ
                </button>
             </div>

             <div className="space-y-1 py-1 border-t border-white/10">
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                   <span className="text-4xl font-black text-retail-blue tracking-tighter leading-none italic">{t('common.total')}</span>
                   <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-50 mb-1">СУММА К ОПЛАТЕ</div>
                      <div className="text-6xl font-black text-white tracking-tighter leading-none">
                        ₽{total.toLocaleString()}
                      </div>
                   </div>
                </div>
             </div>

             <button 
               disabled={cart.length === 0}
               onClick={() => setIsCheckoutOpen(true)}
               className="w-full h-16 bg-retail-blue hover:bg-[#0066cc] disabled:bg-slate-700 disabled:opacity-50 text-white font-black text-2xl flex items-center justify-center gap-4 transition-all"
             >
               {t('pos.checkout')}
               <ChevronRight size={32} />
             </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-retail-dark/95 backdrop-blur-sm">
            <div className="w-full max-w-xl bg-white border border-retail-border shadow-2xl p-8 space-y-8">
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t('pos.finalize')}</h2>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">{t('pos.select_payment')}</p>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="text-slate-400"><X /></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PaymentOption active={paymentType === 'CASH'} onClick={() => setPaymentType('CASH')} icon={Banknote} label={t('pos.cash')} />
                <PaymentOption active={paymentType === 'CARD'} onClick={() => setPaymentType('CARD')} icon={CreditCard} label={t('pos.card')} />
              </div>

              <div className="bg-slate-900 p-8 text-white">
                 <div className="flex justify-between items-end">
                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('common.total')}</span>
                    <span className="text-6xl font-black text-retail-blue">₽{total.toLocaleString()}</span>
                 </div>
              </div>

              <div className="flex gap-4">
                <button 
                  className="flex-1 h-14 border-2 border-slate-200 text-slate-500 font-black uppercase text-xs tracking-widest"
                  onClick={() => setIsCheckoutOpen(false)}
                >
                  {t('common.cancel')}
                </button>
                <button 
                  className="flex-[2] h-14 bg-retail-blue text-white font-black uppercase text-sm tracking-widest shadow-xl shadow-retail-blue/20"
                  onClick={handleCheckout}
                >
                  {t('pos.complete_and_print')}
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Customer Search Modal ───────────────────────────────────── */}
      {isCustomerSearchOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-retail-dark/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md border border-retail-border shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="text-sm font-black uppercase tracking-widest">ПОИСК КЛИЕНТА</h3>
              <button onClick={() => setIsCustomerSearchOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <Input
                  autoFocus
                  placeholder="Имя, телефон или номер карты..."
                  value={customerSearch}
                  onChange={(e) => searchCustomers(e.target.value)}
                  className="h-10 pl-10 rounded-none border-retail-border text-sm font-bold"
                />
              </div>

              <div className="min-h-[120px]">
                {customerSearchLoading && (
                  <div className="py-8 text-center text-[10px] font-black text-slate-400 uppercase animate-pulse">ПОИСК...</div>
                )}
                {!customerSearchLoading && customerSearch.length >= 2 && customerSearchResults.length === 0 && (
                  <div className="py-8 text-center text-[10px] font-black text-slate-300 uppercase">КЛИЕНТ НЕ НАЙДЕН</div>
                )}
                {customerSearchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => attachCustomer(c)}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 border-b border-retail-border text-left transition-colors"
                  >
                    <div>
                      <div className="text-[11px] font-black text-slate-900 uppercase">{c.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 mt-0.5">{c.phone ?? c.email ?? '—'}</div>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-black text-amber-500">
                      <Star size={10} className="fill-amber-500" /> {c.loyaltyPoints} баллов
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Modal ─────────────────────────────────────────────── */}
      {isReturnOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-retail-dark/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white w-full max-w-2xl border border-retail-border shadow-2xl my-4">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest">ОФОРМЛЕНИЕ ВОЗВРАТА</h3>
                <p className="text-[9px] text-slate-400 mt-0.5">Введите ID продажи из чека</p>
              </div>
              <button onClick={() => setIsReturnOpen(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="p-6 space-y-4">
              {/* Sale ID lookup */}
              <div className="flex gap-2">
                <Input
                  autoFocus
                  placeholder="ID продажи (напр. clxyz123...)"
                  value={returnSaleId}
                  onChange={(e) => setReturnSaleId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookupSaleForReturn()}
                  className="flex-1 h-10 rounded-none border-retail-border text-sm font-bold font-mono"
                />
                <button
                  onClick={lookupSaleForReturn}
                  disabled={returnSaleLoading}
                  className="h-10 px-5 bg-retail-blue text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                >
                  {returnSaleLoading ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />} НАЙТИ
                </button>
              </div>

              {returnSaleError && (
                <p className="text-xs font-bold text-red-500">{returnSaleError}</p>
              )}

              {returnSale && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-retail-border px-4 py-2 flex gap-6 text-[10px] font-bold text-slate-500">
                    <span>Дата: {new Date(returnSale.createdAt).toLocaleString('ru-RU')}</span>
                    <span>Продавец: {returnSale.seller?.name}</span>
                    {returnSale.customer && <span>Клиент: {returnSale.customer.name}</span>}
                    <span className="font-black text-slate-900">Итого: ₽{returnSale.totalAmount.toLocaleString()}</span>
                  </div>

                  <table className="w-full border border-retail-border">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-[9px] font-black text-slate-400 uppercase">Товар</th>
                        <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 uppercase w-20">Куплено</th>
                        <th className="px-3 py-2 text-center text-[9px] font-black text-slate-400 uppercase w-24">Вернуть</th>
                        <th className="px-3 py-2 text-right text-[9px] font-black text-slate-400 uppercase w-28">К возврату</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-retail-border">
                      {returnSale.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2">
                            <div className="text-[10px] font-black text-slate-900 uppercase">{item.variation.product.name}</div>
                            <div className="text-[9px] text-slate-400">{item.variation.sku} · {item.variation.size}</div>
                          </td>
                          <td className="px-3 py-2 text-center text-[10px] font-black text-slate-600">{item.quantity}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={returnItemQtys[item.id] ?? 0}
                              onChange={(e) => setReturnItemQtys(prev => ({ ...prev, [item.id]: Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0)) }))}
                              className="w-16 h-8 text-center border border-retail-border text-xs font-black focus:ring-retail-blue focus:border-retail-blue mx-auto block"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-[10px] font-black text-rose-600">
                            {(returnItemQtys[item.id] ?? 0) > 0 ? `-₽${((returnItemQtys[item.id] ?? 0) * item.priceAtSale).toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Сумма возврата: <span className="text-rose-600 text-sm">
                        ₽{returnSale.items.reduce((s: number, item: any) => s + (returnItemQtys[item.id] ?? 0) * item.priceAtSale, 0).toLocaleString()}
                      </span>
                    </span>
                    <button
                      onClick={processReturn}
                      disabled={returnProcessing}
                      className="h-10 px-6 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-50 transition-colors"
                    >
                      {returnProcessing ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />} ОФОРМИТЬ ВОЗВРАТ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showShiftModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-retail-dark/98 backdrop-blur-xl">
            <div className="bg-white max-w-md w-full border border-retail-border p-12 text-center space-y-8 shadow-2xl">
              <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center mx-auto mb-4">
                 <Lock size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t('pos.open_shift')}</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Ожидание подтверждения остатка в кассе</p>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left">{t('pos.opening_balance')} (RUB)</label>
                 <Input 
                   type="number"
                   value={openingBalance}
                   onChange={(e) => setOpeningBalance(e.target.value)}
                   className="h-16 text-3xl font-black text-center bg-slate-50 border-retail-border rounded-none"
                   placeholder="0.00"
                 />
                 <button 
                   onClick={handleOpenShift}
                   className="w-full h-16 bg-retail-blue text-white font-black text-lg uppercase tracking-widest shadow-xl"
                 >
                   {t('pos.confirm_shift')}
                 </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentOption({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`h-24 flex flex-col items-center justify-center gap-2 border-2 transition-all ${active ? 'border-retail-blue bg-retail-blue/5 text-retail-blue' : 'border-slate-100 text-slate-400'}`}
    >
      <Icon size={24} />
      <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>
    </button>
  );
}
