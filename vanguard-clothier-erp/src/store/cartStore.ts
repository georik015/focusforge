import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  variationId: string;
  productId: string;
  productName: string;
  imageUrl?: string | null;
  sku: string;
  size: string;
  color: string;
  price: number;
  originalPrice?: number;
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (item: CartItem) => void;
  removeItem: (variationId: string) => void;
  updateQty: (variationId: string, qty: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: () => number;
  count: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (item) => {
        const existing = get().items.find(i => i.variationId === item.variationId);
        if (existing) {
          set(s => ({
            items: s.items.map(i =>
              i.variationId === item.variationId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            ),
          }));
        } else {
          set(s => ({ items: [...s.items, item] }));
        }
        set({ isOpen: true });
      },

      removeItem: (variationId) =>
        set(s => ({ items: s.items.filter(i => i.variationId !== variationId) })),

      updateQty: (variationId, qty) => {
        if (qty <= 0) {
          get().removeItem(variationId);
          return;
        }
        set(s => ({
          items: s.items.map(i => i.variationId === variationId ? { ...i, quantity: qty } : i),
        }));
      },

      clearCart: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      count: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'vanguard-cart' }
  )
);
