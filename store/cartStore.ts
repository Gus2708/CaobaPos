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
}

interface CartStore {
  items: CartItem[];
  lastScannedBarcode: string | null;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setLastScannedBarcode: (barcode: string | null) => void;
  clearLastScannedBarcode: () => void;
}

// ── Pure derived selectors (memoized via Zustand equality check) ──
export const useCartTotal = () => useCartStore((state) =>
  state.items.reduce((total, item) => total + item.price * item.quantity, 0)
);

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
  lastScannedBarcode: null,
  
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
  
  clearCart: () => set({ items: [], lastScannedBarcode: null }),
  
  setLastScannedBarcode: (barcode: string | null) => {
    set({ lastScannedBarcode: barcode });
  },
  
  clearLastScannedBarcode: () => {
    set({ lastScannedBarcode: null });
  },
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