import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  barcode?: string;
  stock_quantity: number;
  categories: string[];
  image_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface CartItem extends Product {
  quantity: number;
  note?: string;
}

interface CartStore {
  items: CartItem[];
  discountPercent: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemNote: (productId: string, note: string) => void;
  setDiscountPercent: (percent: number) => void;
  clearCart: () => void;
}

// ── Pure derived selectors (memoized via Zustand equality check) ──
export const useCartTotal = () => useCartStore((state) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0)
);

export const useCartDiscountAmount = () => useCartStore((state) => {
  const sub = state.items.reduce((total, item) => total + item.price * item.quantity, 0);
  const pct = Math.max(0, Math.min(100, state.discountPercent || 0));
  return parseFloat(((sub * pct) / 100).toFixed(2));
});

export const useCartItemCount = () => useCartStore((state) =>
  state.items.reduce((count, item) => count + item.quantity, 0)
);

interface SettingsStore {
  ivaEnabled: boolean;
  toggleIva: () => void;
  setIvaEnabled: (enabled: boolean) => void;
  categories: string[];
  addCategory: (category: string) => void;
  removeCategory: (category: string) => void;
  setCategories: (categories: string[]) => void;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  discountPercent: 0,
  
  addItem: (product: Product) => {
    set((state) => {
      const existingItem = state.items.find((item) => item.id === product.id);
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return { items: [...state.items, { ...product, quantity: 1 }] };
    });
  },
  
  removeItem: (productId: string) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    }));
  },
  
  updateQuantity: (productId: string, quantity: number) => {
    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      ),
    }));
  },

  updateItemNote: (productId: string, note: string) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId ? { ...item, note } : item
      ),
    }));
  },

  setDiscountPercent: (percent: number) => {
    const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
    set({ discountPercent: clamped });
  },
  
  clearCart: () => set({ items: [], discountPercent: 0 }),
}));

const DEFAULT_CATEGORIES = ['helados', 'cafe', 'snacks', 'bebidas'];

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ivaEnabled: false,
      toggleIva: () => set((state) => ({ ivaEnabled: !state.ivaEnabled })),
      setIvaEnabled: (enabled: boolean) => set({ ivaEnabled: enabled }),
      categories: DEFAULT_CATEGORIES,
      addCategory: (category: string) => set((state) => {
        const normalized = category.toLowerCase().trim();
        if (!normalized || state.categories.includes(normalized)) return state;
        return { categories: [...state.categories, normalized] };
      }),
      removeCategory: (category: string) => set((state) => {
        if (DEFAULT_CATEGORIES.includes(category)) return state;
        return { categories: state.categories.filter((c) => c !== category) };
      }),
      setCategories: (categories: string[]) => set((state) => {
        const unique = Array.from(new Set([
          ...DEFAULT_CATEGORIES,
          ...categories.map(c => c.toLowerCase().trim())
        ]));
        return { categories: unique };
      }),
    }),
    {
      name: 'caoba-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);