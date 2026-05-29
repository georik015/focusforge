import { useState, useEffect, useRef, useMemo } from 'react';
import { flushSync } from 'react-dom';
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
  const [paymentType, setPaymentType] = useState<'CASH' | 'CARD' | 'LOYALTY'>('CASH');
  const [discount, setDiscount] = useState(0);
  const [currentShift, setCurrentShift] = useState<any>(null);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [pickerProduct, setPickerProduct] = useState<ProductVariation[] | null>(null);
  const [pickerColor, setPickerColor] = useState('');

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
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [isShiftOpening, setIsShiftOpening] = useState(false);
  const [storeConfig, setStoreConfig] = useState<{ storeName?: string; storeAddress?: string; storePhone?: string }>({});
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [closingBalanceInput, setClosingBalanceInput] = useState('0');
  const [isShiftClosing, setIsShiftClosing] = useState(false);
  const [completedSaleId, setCompletedSaleId] = useState('');

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

  const groupedProducts = useMemo(() => {
    const map = new Map<string, ProductVariation[]>();
    products.forEach(v => {
      if (!map.has(v.productId)) map.set(v.productId, []);
      map.get(v.productId)!.push(v);
    });
    return Array.from(map.values());
  }, [products]);

  const handleProductCardClick = (group: ProductVariation[]) => {
    const available = group.filter(v => v.stock > 0);
    if (available.length === 0) return;
    if (available.length === 1) { addToCart(available[0]); return; }
    const colors = [...new Set(available.map(v => v.color))];
    setPickerColor(colors[0]);
    setPickerProduct(group);
  };

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
    const remainingQueue: any[] = [];
    let successCount = 0;
    const errors: string[] = [];

    for (const sale of queue) {
      try {
        await api.post('/sales', sale);
        successCount++;
      } catch (err: any) {
        remainingQueue.push(sale);
        const msg = err?.message || 'Ошибка сервера';
        errors.push(msg);
      }
    }

    localStorage.setItem('vanguard_offline_sales', JSON.stringify(remainingQueue));
    setPendingSyncCount(remainingQueue.length);
    setIsSyncing(false);

    if (errors.length > 0) {
      alert(`Синхронизация: отправлено ${successCount}, ошибок ${errors.length}.\n\nПричины:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...ещё ${errors.length - 3}` : ''}`);
    } else if (successCount > 0) {
      alert(`Синхронизация завершена: ${successCount} продаж отправлено успешно.`);
    }
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
    if (!returnSale) return;
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
    if (isShiftOpening) return;
    setIsShiftOpening(true);
    try {
      const shift = await api.post('/shifts/open', { openingBalance: parseFloat(openingBalance) });
      setCurrentShift(shift);
      setShowShiftModal(false);
      searchInputRef.current?.focus();
    } catch (err) {
      alert('Не удалось открыть смену. Попробуйте ещё раз.');
    } finally {
      setIsShiftOpening(false);
    }
  };

  const handleCloseShift = () => {
    setClosingBalanceInput('0');
    setShowCloseShiftModal(true);
  };

  const confirmCloseShift = async () => {
    if (isShiftClosing) return;
    setIsShiftClosing(true);
    try {
      await api.post('/shifts/close', {
        closingBalance: parseFloat(closingBalanceInput) || 0,
        notes: t('pos.shift_notes'),
      });
      setCurrentShift(null);
      setShowCloseShiftModal(false);
      setShowShiftModal(true);
    } catch (err) {
      alert(t('pos.error_close_shift'));
    } finally {
      setIsShiftClosing(false);
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
        const newQty = Math.max(1, Math.min(item.variation.stock, item.quantity + delta));
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
    if (isCheckoutProcessing) return;
    setIsCheckoutProcessing(true);
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
      const saved = await api.post<{ id: string }>('/sales', saleData);
      flushSync(() => setCompletedSaleId(saved.id));
      handlePrint();
      completeSale();
    } catch (err) {
      const queue = JSON.parse(localStorage.getItem('vanguard_offline_sales') || '[]');
      queue.push({ ...saleData, offlineId: Date.now() });
      localStorage.setItem('vanguard_offline_sales', JSON.stringify(queue));
      setPendingSyncCount(prev => prev + 1);
      flushSync(() => setCompletedSaleId(`offline-${Date.now()}`));
      handlePrint();
      completeSale();
    } finally {
      setIsCheckoutProcessing(false);
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
          sale={{ totalAmount: total, discount, paymentType, id: completedSaleId || 'SALE' }}
          items={cart}
          storeName={storeConfig.storeName}
          storeAddress={storeConfig.storeAddress}
          storePhone={storeConfig.storePhone}
          cashierName={currentShift?.user?.name}
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
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100">
          {/* Search bar */}
          <div className="px-3 pt-3 pb-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                ref={searchInputRef}
                placeholder={t('pos.search_placeholder')}
                className="w-full h-12 pl-10 pr-10 bg-white border border-slate-300 text-sm font-semibold focus:outline-none focus:border-retail-blue focus:ring-1 focus:ring-retail-blue"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => { setSearch(''); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Category filter tabs */}
          <div className="px-3 pb-2 shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar">
            {['', ...Array.from(new Set(products.map(p => p.product?.category?.name).filter(Boolean)))].map((cat) => (
              <button
                key={cat || 'all'}
                onClick={() => setCategoryFilter(cat as string)}
                className={`shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-all ${
                  categoryFilter === cat
                    ? 'bg-retail-blue text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {cat || 'Все'}
              </button>
            ))}
          </div>

          {/* Product grid — one card per product */}
          <div className="flex-1 overflow-y-auto px-3 pb-3 custom-scrollbar">
            {(() => {
              const filteredGroups = groupedProducts.filter(group => {
                const p = group[0].product;
                const matchSearch =
                  p?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                  group.some(v => v.sku.toLowerCase().includes(debouncedSearch.toLowerCase()));
                const matchCat = !categoryFilter || p?.category?.name === categoryFilter;
                return matchSearch && matchCat;
              });

              if (filteredGroups.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <Search size={32} className="mb-2 opacity-30" />
                    <p className="text-sm font-bold uppercase">Товары не найдены</p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                  {filteredGroups.map((group) => {
                    const product = group[0].product;
                    const totalStock = group.reduce((s, v) => s + v.stock, 0);
                    const minPrice = Math.min(...group.map(v => v.salePrice));
                    const maxPrice = Math.max(...group.map(v => v.salePrice));
                    const uniqueSizes = [...new Set(group.map(v => v.size))].filter(Boolean);
                    const uniqueColors = [...new Set(group.map(v => v.color))].filter(Boolean);
                    const outOfStock = totalStock === 0;
                    const lowStock = totalStock > 0 && totalStock <= 5;

                    return (
                      <button
                        key={group[0].productId}
                        onClick={() => handleProductCardClick(group)}
                        disabled={outOfStock}
                        className={`bg-white border-2 p-3 text-left flex flex-col gap-1 transition-all active:scale-95 ${
                          outOfStock
                            ? 'border-slate-100 opacity-40 cursor-not-allowed'
                            : 'border-slate-200 hover:border-retail-blue hover:shadow-md cursor-pointer'
                        }`}
                      >
                        <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 min-h-[40px]">
                          {product?.name}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {uniqueSizes.slice(0, 5).map(s => (
                            <span key={s} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 font-mono">{s}</span>
                          ))}
                          {uniqueSizes.length > 5 && (
                            <span className="text-[10px] text-slate-400">+{uniqueSizes.length - 5}</span>
                          )}
                        </div>

                        {uniqueColors.length > 0 && (
                          <p className="text-[11px] text-slate-500 truncate">
                            {uniqueColors.slice(0, 3).join(', ')}{uniqueColors.length > 3 ? ` +${uniqueColors.length - 3}` : ''}
                          </p>
                        )}

                        <div className="mt-auto pt-2 flex items-center justify-between">
                          <span className="text-base font-black text-retail-blue">
                            {minPrice === maxPrice
                              ? `₽${minPrice.toLocaleString()}`
                              : `₽${minPrice.toLocaleString()}+`}
                          </span>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            outOfStock ? 'bg-red-100 text-red-500'
                            : lowStock ? 'bg-amber-100 text-amber-600'
                            : 'bg-emerald-100 text-emerald-600'
                          }`}>
                            {outOfStock ? 'Нет' : `${totalStock} шт`}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Cart Panel */}
        <div className="w-[420px] bg-white border-l border-retail-border flex flex-col z-20 overflow-hidden">
          <div className="h-11 px-4 bg-slate-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <ShoppingCart size={16} /> {t('pos.active_basket')}
            </div>
            <span className="text-xs font-black text-slate-400 uppercase">{cart.length} {t('pos.units')}</span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
                <History size={40} />
                <p className="text-sm font-bold uppercase tracking-widest">{t('pos.idling')}</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.tempId} className="flex items-center gap-3 px-3 py-3 hover:bg-slate-50 group">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 leading-tight truncate">{item.variation.product?.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {[item.variation.sku, item.variation.size, item.variation.color].filter(Boolean).join(' · ')}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div className="flex items-center gap-1 border border-slate-200 bg-white">
                    <button
                      onClick={() => updateQuantity(item.tempId, -1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center text-sm font-black text-retail-blue">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.tempId, 1)}
                      className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-retail-blue hover:bg-blue-50 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  {/* Price */}
                  <div className="text-right w-24 shrink-0">
                    <p className="text-sm font-black text-slate-900">₽{(item.variation.salePrice * item.quantity).toLocaleString()}</p>
                    {item.quantity > 1 && (
                      <p className="text-[10px] text-slate-400">×₽{item.variation.salePrice.toLocaleString()}</p>
                    )}
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeFromCart(item.tempId)}
                    className="text-slate-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))
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
                {/* Discount field */}
                <div className="flex items-center gap-2 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{t('pos.discount')} ₽</span>
                  <input
                    type="number"
                    min={0}
                    max={subtotal}
                    value={discount || ''}
                    onChange={(e) => setDiscount(Math.min(subtotal, Math.max(0, parseFloat(e.target.value) || 0)))}
                    placeholder="0"
                    className="flex-1 h-8 bg-white/10 border border-white/20 text-white text-sm font-black text-right px-2 focus:outline-none focus:border-retail-blue"
                  />
                  {discount > 0 && (
                    <button onClick={() => setDiscount(0)} className="text-slate-500 hover:text-red-400 transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
                <div className="flex justify-between items-end border-b border-white/5 pb-2">
                   <span className="text-4xl font-black text-retail-blue tracking-tighter leading-none italic">{t('common.total')}</span>
                   <div className="text-right">
                      {discount > 0 && (
                        <div className="text-[10px] font-black text-slate-400 line-through opacity-50">₽{subtotal.toLocaleString()}</div>
                      )}
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

              <div className="grid grid-cols-3 gap-3">
                <PaymentOption active={paymentType === 'CASH'} onClick={() => setPaymentType('CASH')} icon={Banknote} label={t('pos.cash')} />
                <PaymentOption active={paymentType === 'CARD'} onClick={() => setPaymentType('CARD')} icon={CreditCard} label={t('pos.card')} />
                <PaymentOption
                  active={paymentType === 'LOYALTY'}
                  onClick={() => customer ? setPaymentType('LOYALTY') : undefined}
                  icon={Star}
                  label="БАЛЛЫ"
                  disabled={!customer}
                  subtitle={customer ? `${customer.loyaltyPoints} баллов` : 'нет клиента'}
                  insufficient={paymentType === 'LOYALTY' && !!customer && customer.loyaltyPoints < Math.ceil(total)}
                />
              </div>
              {paymentType === 'LOYALTY' && customer && customer.loyaltyPoints < Math.ceil(total) && (
                <div className="px-3 py-2 bg-red-900/30 border border-red-700/40 text-red-400 text-[10px] font-bold">
                  Недостаточно баллов: нужно {Math.ceil(total)}, доступно {customer.loyaltyPoints}
                </div>
              )}

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
                  className="flex-[2] h-14 bg-retail-blue text-white font-black uppercase text-sm tracking-widest shadow-xl shadow-retail-blue/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleCheckout}
                  disabled={isCheckoutProcessing || (paymentType === 'LOYALTY' && !!customer && customer.loyaltyPoints < Math.ceil(total))}
                >
                  {isCheckoutProcessing ? '...' : t('pos.complete_and_print')}
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

      {/* ── Variation Picker Modal ───────────────────────────────── */}
      {pickerProduct && (() => {
        const product = pickerProduct[0].product;
        const uniqueColors = [...new Set(pickerProduct.map(v => v.color).filter(Boolean))];
        const sizesForColor = pickerProduct.filter(v => v.color === pickerColor || !pickerColor);

        return (
          <div
            className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-slate-900/70 backdrop-blur-sm"
            onClick={() => setPickerProduct(null)}
          >
            <div
              className="bg-white w-full max-w-lg shadow-2xl border border-slate-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <p className="font-black text-slate-900 text-base leading-tight">{product?.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{product?.category?.name} · Выберите размер</p>
                </div>
                <button onClick={() => setPickerProduct(null)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Color selector */}
                {uniqueColors.length > 1 && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Цвет</p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setPickerColor(color)}
                          className={`px-3 py-1.5 text-sm font-semibold border-2 transition-all ${
                            pickerColor === color
                              ? 'border-retail-blue bg-retail-blue text-white'
                              : 'border-slate-200 text-slate-700 hover:border-retail-blue'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size grid */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Размер</p>
                  <div className="grid grid-cols-4 gap-2">
                    {sizesForColor.map(v => {
                      const outOfStock = v.stock === 0;
                      const lowStock = v.stock > 0 && v.stock <= 3;
                      return (
                        <button
                          key={v.id}
                          disabled={outOfStock}
                          onClick={() => { addToCart(v); setPickerProduct(null); }}
                          className={`flex flex-col items-center justify-center py-3 border-2 transition-all font-bold text-sm ${
                            outOfStock
                              ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                              : 'border-slate-200 text-slate-800 hover:border-retail-blue hover:bg-blue-50 active:scale-95'
                          }`}
                        >
                          <span className="text-base">{v.size || '—'}</span>
                          <span className={`text-[10px] font-bold mt-0.5 ${
                            outOfStock ? 'text-red-400'
                            : lowStock ? 'text-amber-500'
                            : 'text-emerald-500'
                          }`}>
                            {outOfStock ? 'нет' : `${v.stock} шт`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price */}
                {(() => {
                  const availPrices = sizesForColor.filter(v => v.stock > 0).map(v => v.salePrice);
                  const pMin = availPrices.length > 0 ? Math.min(...availPrices) : (sizesForColor[0]?.salePrice ?? 0);
                  const pMax = availPrices.length > 0 ? Math.max(...availPrices) : pMin;
                  return (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Цена</span>
                      <span className="text-xl font-black text-retail-blue">
                        {pMin === pMax ? `₽${pMin.toLocaleString()}` : `от ₽${pMin.toLocaleString()}`}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}

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
                   disabled={isShiftOpening}
                   className="w-full h-16 bg-retail-blue text-white font-black text-lg uppercase tracking-widest shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                 >
                   {t('pos.confirm_shift')}
                 </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCloseShiftModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-retail-dark/98 backdrop-blur-xl">
            <div className="bg-white max-w-md w-full border border-retail-border p-12 text-center space-y-8 shadow-2xl">
              <div className="w-16 h-16 bg-red-600 text-white flex items-center justify-center mx-auto mb-4">
                <Lock size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t('pos.close_shift')}</h2>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-2">Введите фактический остаток наличных в кассе</p>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-left">{t('pos.closing_balance')} (RUB)</label>
                <input
                  type="number"
                  value={closingBalanceInput}
                  onChange={(e) => setClosingBalanceInput(e.target.value)}
                  className="w-full h-16 text-3xl font-black text-center bg-slate-50 border border-slate-200 outline-none focus:border-retail-blue"
                  placeholder="0.00"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCloseShiftModal(false)}
                    className="flex-1 h-14 border border-slate-200 text-slate-600 font-black text-sm uppercase tracking-widest hover:bg-slate-50"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={confirmCloseShift}
                    disabled={isShiftClosing}
                    className="flex-1 h-14 bg-red-600 text-white font-black text-sm uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed hover:bg-red-700"
                  >
                    {t('pos.confirm_close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentOption({ active, onClick, icon: Icon, label, disabled, subtitle, insufficient }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`h-24 flex flex-col items-center justify-center gap-1 border-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
        insufficient ? 'border-red-500 bg-red-50 text-red-500'
        : active ? 'border-retail-blue bg-retail-blue/5 text-retail-blue'
        : 'border-slate-100 text-slate-400'
      }`}
    >
      <Icon size={22} />
      <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>
      {subtitle && <span className="text-[9px] opacity-70">{subtitle}</span>}
    </button>
  );
}
