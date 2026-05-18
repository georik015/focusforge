import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  productId: string;
  variationId?: string;
  productName: string;
  imageUrl?: string | null;
  price: number;
  size?: string;
  color?: string;
}

interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (productId: string) => void;
  has: (productId: string) => boolean;
  toggle: (item: WishlistItem) => void;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        if (!get().has(item.productId)) {
          set(s => ({ items: [...s.items, item] }));
        }
      },

      removeItem: (productId) =>
        set(s => ({ items: s.items.filter(i => i.productId !== productId) })),

      has: (productId) => get().items.some(i => i.productId === productId),

      toggle: (item) => {
        if (get().has(item.productId)) {
          get().removeItem(item.productId);
        } else {
          get().addItem(item);
        }
      },

      clear: () => set({ items: [] }),
    }),
    { name: 'vanguard-wishlist' }
  )
);
