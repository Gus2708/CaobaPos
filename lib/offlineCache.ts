import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../store/cartStore';
import { ClientBalance } from '../hooks/useClients';

const KEYS = {
  PRODUCTS: '@caobapos_cache_products_v1',
  CATEGORIES: '@caobapos_cache_categories_v1',
  CLIENTS: '@caobapos_cache_clients_v1',
  SALES: '@caobapos_cache_sales_v1',
};

// In-memory cache for ultra-fast synchronous or quick async access
let inMemoryProducts: Product[] | null = null;
let inMemoryCategories: string[] | null = null;
let inMemoryClients: ClientBalance[] | null = null;
let inMemorySales: any[] | null = null;

// --- PRODUCTS ---
export async function getCachedProducts(): Promise<Product[]> {
  if (inMemoryProducts !== null) return inMemoryProducts;
  try {
    const json = await AsyncStorage.getItem(KEYS.PRODUCTS);
    inMemoryProducts = json ? JSON.parse(json) : [];
  } catch (e) {
    inMemoryProducts = [];
  }
  return inMemoryProducts || [];
}

export async function saveCachedProducts(products: Product[]): Promise<void> {
  inMemoryProducts = products;
  try {
    await AsyncStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
  } catch (e) {
    console.error('[OfflineCache] Error saving products:', e);
  }
}

export async function applyOfflineStockDecrement(
  items: Array<{ product_id: string; quantity: number }>
): Promise<void> {
  const products = await getCachedProducts();
  const updated = products.map((p) => {
    const item = items.find((i) => i.product_id === p.id);
    if (item) {
      return {
        ...p,
        stock_quantity: Math.max(0, p.stock_quantity - item.quantity),
      };
    }
    return p;
  });
  await saveCachedProducts(updated);
}

// --- CATEGORIES ---
export async function getCachedCategories(): Promise<string[]> {
  if (inMemoryCategories !== null) return inMemoryCategories;
  try {
    const json = await AsyncStorage.getItem(KEYS.CATEGORIES);
    inMemoryCategories = json ? JSON.parse(json) : [];
  } catch (e) {
    inMemoryCategories = [];
  }
  return inMemoryCategories || [];
}

export async function saveCachedCategories(categories: string[]): Promise<void> {
  inMemoryCategories = categories;
  try {
    await AsyncStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
  } catch (e) {
    console.error('[OfflineCache] Error saving categories:', e);
  }
}

// --- CLIENTS ---
export async function getCachedClients(): Promise<ClientBalance[]> {
  if (inMemoryClients !== null) return inMemoryClients;
  try {
    const json = await AsyncStorage.getItem(KEYS.CLIENTS);
    inMemoryClients = json ? JSON.parse(json) : [];
  } catch (e) {
    inMemoryClients = [];
  }
  return inMemoryClients || [];
}

export async function saveCachedClients(clients: ClientBalance[]): Promise<void> {
  inMemoryClients = clients;
  try {
    await AsyncStorage.setItem(KEYS.CLIENTS, JSON.stringify(clients));
  } catch (e) {
    console.error('[OfflineCache] Error saving clients:', e);
  }
}

export async function addOfflineClient(client: ClientBalance): Promise<void> {
  const clients = await getCachedClients();
  const exists = clients.some((c) => c.id === client.id);
  const updated = exists
    ? clients.map((c) => (c.id === client.id ? client : c))
    : [client, ...clients];
  await saveCachedClients(updated);
}

export async function addOfflinePayment(
  clientId: string,
  amount: number
): Promise<void> {
  const clients = await getCachedClients();
  const updated = clients.map((c) => {
    if (c.id === clientId) {
      const newPaid = (c.total_paid || 0) + amount;
      const newBalance = Math.max(0, (c.balance_due || 0) - amount);
      return {
        ...c,
        total_paid: newPaid,
        balance_due: newBalance,
      };
    }
    return c;
  });
  await saveCachedClients(updated);
}

// --- SALES ---
export async function getCachedSales(): Promise<any[]> {
  if (inMemorySales !== null) return inMemorySales;
  try {
    const json = await AsyncStorage.getItem(KEYS.SALES);
    inMemorySales = json ? JSON.parse(json) : [];
  } catch (e) {
    inMemorySales = [];
  }
  return inMemorySales || [];
}

export async function saveCachedSales(sales: any[]): Promise<void> {
  inMemorySales = sales;
  try {
    await AsyncStorage.setItem(KEYS.SALES, JSON.stringify(sales));
  } catch (e) {
    console.error('[OfflineCache] Error saving sales:', e);
  }
}

export async function addOfflineSale(sale: any): Promise<void> {
  const sales = await getCachedSales();
  const updated = [sale, ...sales];
  await saveCachedSales(updated);
}
