import { create } from 'zustand';
import { Product } from './cartStore';
import { ClientBalance, ClientPayment } from '../hooks/useClients';
import { DEFAULT_BCV_RATE } from '../lib/offlineCache';

export interface DemoSale {
  id: string;
  total_amount: number;
  exchange_rate?: number;
  total_amount_bs?: number;
  payment_method: 'cash' | 'card' | 'transfer' | 'credito';
  client_id?: string | null;
  status: string;
  iva_enabled?: boolean;
  tax_amount?: number;
  created_by?: string | null;
  employee_name?: string | null;
  created_by_email?: string | null;
  created_at: string;
}

export interface DemoSaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
}

const INITIAL_DEMO_CATEGORIES: string[] = [
  'Cafetería',
  'Panadería',
  'Pastelería',
  'Bebidas',
];

const INITIAL_DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-prod-1',
    name: 'Café Espresso Doble',
    price: 2.50,
    cost: 0.60,
    stock_quantity: 45,
    categories: ['Cafetería'],
    barcode: '7591001001',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-2',
    name: 'Café Cappuccino Vainilla',
    price: 3.80,
    cost: 1.10,
    stock_quantity: 38,
    categories: ['Cafetería'],
    barcode: '7591001002',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-3',
    name: 'Croissant de Mantequilla',
    price: 3.20,
    cost: 0.95,
    stock_quantity: 24,
    categories: ['Panadería'],
    barcode: '7591001003',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-4',
    name: 'Pan de Jamón (Ración)',
    price: 5.50,
    cost: 2.10,
    stock_quantity: 18,
    categories: ['Panadería'],
    barcode: '7591001004',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-5',
    name: 'Cachito de Jamón y Queso',
    price: 2.80,
    cost: 0.85,
    stock_quantity: 30,
    categories: ['Panadería'],
    barcode: '7591001005',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-6',
    name: 'Torta Húmeda Tres Leches',
    price: 4.50,
    cost: 1.50,
    stock_quantity: 12,
    categories: ['Pastelería'],
    barcode: '7591001006',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-7',
    name: 'Cheesecake Frutos Rojos',
    price: 4.80,
    cost: 1.60,
    stock_quantity: 10,
    categories: ['Pastelería'],
    barcode: '7591001007',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-8',
    name: 'Galleta Choco-Chips',
    price: 1.50,
    cost: 0.40,
    stock_quantity: 50,
    categories: ['Pastelería'],
    barcode: '7591001008',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-9',
    name: 'Jugo Natural Naranja 500ml',
    price: 2.50,
    cost: 0.70,
    stock_quantity: 25,
    categories: ['Bebidas'],
    barcode: '7591001009',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-10',
    name: 'Té Helado Matcha Limón',
    price: 3.00,
    cost: 0.80,
    stock_quantity: 20,
    categories: ['Bebidas'],
    barcode: '7591001010',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
  {
    id: 'demo-prod-11',
    name: 'Agua Mineral 600ml',
    price: 1.00,
    cost: 0.30,
    stock_quantity: 4,
    categories: ['Bebidas'],
    barcode: '7591001011',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
  },
];

const INITIAL_DEMO_CLIENTS: ClientBalance[] = [
  {
    id: 'demo-client-1',
    name: 'Carlos Mendoza',
    phone: '+58 412-5551234',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    total_credit_sales: 75.50,
    total_paid: 40.00,
    balance_due: 35.50,
    is_active: true,
  },
  {
    id: 'demo-client-2',
    name: 'Valentina Gómez',
    phone: '+58 414-8889911',
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    total_credit_sales: 120.00,
    total_paid: 120.00,
    balance_due: 0.00,
    is_active: true,
  },
  {
    id: 'demo-client-3',
    name: 'Andrés Silva',
    phone: '+58 424-3334455',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    total_credit_sales: 18.00,
    total_paid: 0.00,
    balance_due: 18.00,
    is_active: true,
  },
];

function generateInitialDemoSales(rate: number = DEFAULT_BCV_RATE.rate) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const makeTime = (hour: number, minute: number) => {
    const d = new Date(today);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const sales: DemoSale[] = [
    {
      id: 'demo-sale-1',
      total_amount: 6.30,
      exchange_rate: rate,
      total_amount_bs: Number((6.30 * rate).toFixed(2)),
      payment_method: 'cash',
      client_id: null,
      status: 'paid',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: makeTime(8, 15),
    },
    {
      id: 'demo-sale-2',
      total_amount: 8.90,
      exchange_rate: rate,
      total_amount_bs: Number((8.90 * rate).toFixed(2)),
      payment_method: 'card',
      client_id: null,
      status: 'paid',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: makeTime(9, 45),
    },
    {
      id: 'demo-sale-3',
      total_amount: 14.00,
      exchange_rate: rate,
      total_amount_bs: Number((14.00 * rate).toFixed(2)),
      payment_method: 'transfer',
      client_id: null,
      status: 'paid',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: makeTime(12, 30),
    },
    {
      id: 'demo-sale-4',
      total_amount: 18.00,
      exchange_rate: rate,
      total_amount_bs: Number((18.00 * rate).toFixed(2)),
      payment_method: 'credito',
      client_id: 'demo-client-3',
      status: 'pending_payment',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: makeTime(14, 10),
    },
    {
      id: 'demo-sale-5',
      total_amount: 9.40,
      exchange_rate: rate,
      total_amount_bs: Number((9.40 * rate).toFixed(2)),
      payment_method: 'cash',
      client_id: null,
      status: 'paid',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: makeTime(16, 20),
    },
    {
      id: 'demo-sale-6',
      total_amount: 7.80,
      exchange_rate: rate,
      total_amount_bs: Number((7.80 * rate).toFixed(2)),
      payment_method: 'card',
      client_id: null,
      status: 'paid',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: makeTime(18, 5),
    },
    // Historical credit sales that back the outstanding balances of demo clients 1 and 2.
    {
      id: 'demo-sale-h1',
      total_amount: 75.50,
      exchange_rate: rate,
      total_amount_bs: Number((75.50 * rate).toFixed(2)),
      payment_method: 'credito',
      client_id: 'demo-client-1',
      status: 'pending_payment',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    },
    {
      id: 'demo-sale-h2',
      total_amount: 120.00,
      exchange_rate: rate,
      total_amount_bs: Number((120.00 * rate).toFixed(2)),
      payment_method: 'credito',
      client_id: 'demo-client-2',
      status: 'paid',
      iva_enabled: false,
      tax_amount: 0,
      employee_name: 'Evaluador Demo',
      created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    },
  ];

  const items: DemoSaleItem[] = [
    { id: 'demo-item-1a', sale_id: 'demo-sale-1', product_id: 'demo-prod-1', product_name: 'Café Espresso Doble', quantity: 1, unit_price: 2.50, unit_cost: 0.60, subtotal: 2.50 },
    { id: 'demo-item-1b', sale_id: 'demo-sale-1', product_id: 'demo-prod-2', product_name: 'Café Cappuccino Vainilla', quantity: 1, unit_price: 3.80, unit_cost: 1.10, subtotal: 3.80 },

    { id: 'demo-item-2a', sale_id: 'demo-sale-2', product_id: 'demo-prod-3', product_name: 'Croissant de Mantequilla', quantity: 2, unit_price: 3.20, unit_cost: 0.95, subtotal: 6.40 },
    { id: 'demo-item-2b', sale_id: 'demo-sale-2', product_id: 'demo-prod-9', product_name: 'Jugo Natural Naranja 500ml', quantity: 1, unit_price: 2.50, unit_cost: 0.70, subtotal: 2.50 },

    { id: 'demo-item-3a', sale_id: 'demo-sale-3', product_id: 'demo-prod-4', product_name: 'Pan de Jamón (Ración)', quantity: 2, unit_price: 5.50, unit_cost: 2.10, subtotal: 11.00 },
    { id: 'demo-item-3b', sale_id: 'demo-sale-3', product_id: 'demo-prod-10', product_name: 'Té Helado Matcha Limón', quantity: 1, unit_price: 3.00, unit_cost: 0.80, subtotal: 3.00 },

    { id: 'demo-item-4a', sale_id: 'demo-sale-4', product_id: 'demo-prod-6', product_name: 'Torta Húmeda Tres Leches', quantity: 4, unit_price: 4.50, unit_cost: 1.50, subtotal: 18.00 },

    { id: 'demo-item-5a', sale_id: 'demo-sale-5', product_id: 'demo-prod-5', product_name: 'Cachito de Jamón y Queso', quantity: 2, unit_price: 2.80, unit_cost: 0.85, subtotal: 5.60 },
    { id: 'demo-item-5b', sale_id: 'demo-sale-5', product_id: 'demo-prod-2', product_name: 'Café Cappuccino Vainilla', quantity: 1, unit_price: 3.80, unit_cost: 1.10, subtotal: 3.80 },

    { id: 'demo-item-6a', sale_id: 'demo-sale-6', product_id: 'demo-prod-7', product_name: 'Cheesecake Frutos Rojos', quantity: 1, unit_price: 4.80, unit_cost: 1.60, subtotal: 4.80 },
    { id: 'demo-item-6b', sale_id: 'demo-sale-6', product_id: 'demo-prod-10', product_name: 'Té Helado Matcha Limón', quantity: 1, unit_price: 3.00, unit_cost: 0.80, subtotal: 3.00 },

    { id: 'demo-item-h1a', sale_id: 'demo-sale-h1', product_id: 'demo-prod-6', product_name: 'Torta Húmeda Tres Leches', quantity: 10, unit_price: 4.50, unit_cost: 1.50, subtotal: 45.00 },
    { id: 'demo-item-h1b', sale_id: 'demo-sale-h1', product_id: 'demo-prod-7', product_name: 'Cheesecake Frutos Rojos', quantity: 5, unit_price: 4.80, unit_cost: 1.60, subtotal: 24.00 },
    { id: 'demo-item-h1c', sale_id: 'demo-sale-h1', product_id: 'demo-prod-1', product_name: 'Café Espresso Doble', quantity: 2, unit_price: 2.50, unit_cost: 0.60, subtotal: 5.00 },
    { id: 'demo-item-h1d', sale_id: 'demo-sale-h1', product_id: 'demo-prod-8', product_name: 'Galleta Choco-Chips', quantity: 1, unit_price: 1.50, unit_cost: 0.40, subtotal: 1.50 },

    { id: 'demo-item-h2a', sale_id: 'demo-sale-h2', product_id: 'demo-prod-7', product_name: 'Cheesecake Frutos Rojos', quantity: 25, unit_price: 4.80, unit_cost: 1.60, subtotal: 120.00 },
  ];

  return { sales, items };
}

const INITIAL_DEMO_PAYMENTS: ClientPayment[] = [
  {
    id: 'demo-pay-1',
    client_id: 'demo-client-1',
    sale_id: null,
    amount: 40.00,
    payment_method: 'cash',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'demo-pay-2',
    client_id: 'demo-client-2',
    sale_id: null,
    amount: 120.00,
    payment_method: 'transfer',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const INITIAL_SALES_BUNDLE = generateInitialDemoSales();

export interface DemoState {
  isDemoMode: boolean;
  demoExchangeRate: number;
  demoCategories: string[];
  demoProducts: Product[];
  demoClients: ClientBalance[];
  demoSales: DemoSale[];
  demoSaleItems: DemoSaleItem[];
  demoPayments: ClientPayment[];

  setDemoMode: (active: boolean) => void;
  toggleDemoMode: () => void;
  resetDemoData: () => void;
  syncDemoExchangeRate: (rate: number) => void;

  simulateCreateSale: (payload: {
    totalAmount: number;
    paymentMethod: 'cash' | 'card' | 'transfer' | 'credito';
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
    clientId?: string;
    ivaEnabled?: boolean;
    taxAmount?: number;
    exchangeRate?: number;
    totalAmountBs?: number;
    employeeName?: string;
  }) => DemoSale;

  simulateCreateClient: (payload: { name: string; phone?: string }) => ClientBalance;
  simulateAddPayment: (payload: {
    clientId: string;
    amount: number;
    paymentMethod: string;
    saleId?: string;
  }) => ClientPayment;

  simulateDeletePayment: (paymentId: string) => void;

  simulateDeleteSale: (saleId: string) => void;
  simulateUpdateSale: (payload: {
    saleId: string;
    items: Array<{
      product_id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      subtotal: number;
    }>;
    newTotal: number;
    ivaEnabled: boolean;
    taxAmount: number;
  }) => void;

  simulateAddProduct: (product: Omit<Product, 'id' | 'created_at'>) => Product;
  simulateUpdateProduct: (id: string, updates: Partial<Product>) => Product;
  simulateDeleteProduct: (id: string) => void;
}

export const useDemoStore = create<DemoState>((set, get) => ({
  isDemoMode: false,
  demoExchangeRate: DEFAULT_BCV_RATE.rate,
  demoCategories: [...INITIAL_DEMO_CATEGORIES],
  demoProducts: [...INITIAL_DEMO_PRODUCTS],
  demoClients: [...INITIAL_DEMO_CLIENTS],
  demoSales: [...INITIAL_SALES_BUNDLE.sales],
  demoSaleItems: [...INITIAL_SALES_BUNDLE.items],
  demoPayments: [...INITIAL_DEMO_PAYMENTS],

  setDemoMode: (active: boolean) => set({ isDemoMode: active }),

  toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),

  resetDemoData: () => {
    const freshSales = generateInitialDemoSales(get().demoExchangeRate);
    set({
      demoCategories: [...INITIAL_DEMO_CATEGORIES],
      demoProducts: [...INITIAL_DEMO_PRODUCTS],
      demoClients: [...INITIAL_DEMO_CLIENTS],
      demoSales: [...freshSales.sales],
      demoSaleItems: freshSales.items,
      demoPayments: [...INITIAL_DEMO_PAYMENTS],
    });
  },

  // Demo mode runs on the live BCV rate, so the seeded sales are repriced with it.
  syncDemoExchangeRate: (rate: number) => {
    if (!rate || isNaN(rate) || rate <= 0) return;
    const { demoExchangeRate: previousRate, demoSales } = get();
    if (previousRate === rate) return;
    set({
      demoExchangeRate: rate,
      demoSales: demoSales.map((sale) =>
        sale.exchange_rate === previousRate
          ? { ...sale, exchange_rate: rate, total_amount_bs: Number((sale.total_amount * rate).toFixed(2)) }
          : sale
      ),
    });
  },

  simulateCreateSale: (payload) => {
    const state = get();
    const newSaleId = 'demo-sale-' + Date.now();
    const status = payload.paymentMethod === 'credito' ? 'pending_payment' : 'paid';

    const newSale: DemoSale = {
      id: newSaleId,
      total_amount: payload.totalAmount,
      exchange_rate: payload.exchangeRate || state.demoExchangeRate,
      total_amount_bs: payload.totalAmountBs || (payload.totalAmount * (payload.exchangeRate || state.demoExchangeRate)),
      payment_method: payload.paymentMethod,
      client_id: payload.clientId || null,
      status,
      iva_enabled: payload.ivaEnabled || false,
      tax_amount: payload.taxAmount || 0,
      employee_name: payload.employeeName || 'Evaluador Demo',
      created_at: new Date().toISOString(),
    };

    const newItems: DemoSaleItem[] = payload.items.map((item, idx) => {
      const prod = state.demoProducts.find((p) => p.id === item.product_id);
      return {
        id: `demo-item-${Date.now()}-${idx}`,
        sale_id: newSaleId,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        unit_cost: prod?.cost || 0,
        subtotal: item.subtotal,
      };
    });

    const updatedProducts = state.demoProducts.map((prod) => {
      const soldItem = payload.items.find((i) => i.product_id === prod.id);
      if (soldItem) {
        return {
          ...prod,
          stock_quantity: Math.max(0, prod.stock_quantity - soldItem.quantity),
        };
      }
      return prod;
    });

    let updatedClients = state.demoClients;
    if (payload.paymentMethod === 'credito' && payload.clientId) {
      updatedClients = state.demoClients.map((c) => {
        if (c.id === payload.clientId) {
          const newCredit = c.total_credit_sales + payload.totalAmount;
          return {
            ...c,
            total_credit_sales: newCredit,
            balance_due: newCredit - c.total_paid,
          };
        }
        return c;
      });
    }

    set({
      demoSales: [newSale, ...state.demoSales],
      demoSaleItems: [...newItems, ...state.demoSaleItems],
      demoProducts: updatedProducts,
      demoClients: updatedClients,
    });

    return newSale;
  },

  simulateCreateClient: ({ name, phone }) => {
    const newClient: ClientBalance = {
      id: 'demo-client-' + Date.now(),
      name,
      phone: phone || null,
      created_at: new Date().toISOString(),
      total_credit_sales: 0,
      total_paid: 0,
      balance_due: 0,
      is_active: true,
    };

    set((state) => ({
      demoClients: [newClient, ...state.demoClients],
    }));

    return newClient;
  },

  simulateAddPayment: ({ clientId, amount, paymentMethod, saleId }) => {
    const state = get();
    const newPayment: ClientPayment = {
      id: 'demo-pay-' + Date.now(),
      client_id: clientId,
      sale_id: saleId || null,
      amount,
      payment_method: paymentMethod,
      created_at: new Date().toISOString(),
    };

    const updatedClients = state.demoClients.map((c) => {
      if (c.id === clientId) {
        const newPaid = c.total_paid + amount;
        return {
          ...c,
          total_paid: newPaid,
          balance_due: Math.max(0, c.total_credit_sales - newPaid),
        };
      }
      return c;
    });

    set({
      demoPayments: [newPayment, ...state.demoPayments],
      demoClients: updatedClients,
    });

    return newPayment;
  },

  simulateDeletePayment: (paymentId) => {
    set((state) => {
      const removed = state.demoPayments.find((p) => p.id === paymentId);
      const demoPayments = state.demoPayments.filter((p) => p.id !== paymentId);
      if (!removed) return { demoPayments };

      const demoClients = state.demoClients.map((c) => {
        if (c.id !== removed.client_id) return c;
        const newPaid = Math.max(0, c.total_paid - removed.amount);
        return {
          ...c,
          total_paid: newPaid,
          balance_due: Math.max(0, c.total_credit_sales - newPaid),
        };
      });

      return { demoPayments, demoClients };
    });
  },

  simulateDeleteSale: (saleId) => {
    set((state) => {
      const sale = state.demoSales.find((s) => s.id === saleId);
      if (!sale) return {};

      const removedItems = state.demoSaleItems.filter((i) => i.sale_id === saleId);

      // Mirror production behaviour: deleting a sale returns its units to stock.
      const demoProducts = state.demoProducts.map((prod) => {
        const restored = removedItems
          .filter((i) => i.product_id === prod.id)
          .reduce((sum, i) => sum + i.quantity, 0);
        return restored > 0
          ? { ...prod, stock_quantity: prod.stock_quantity + restored }
          : prod;
      });

      let demoClients = state.demoClients;
      if (sale.payment_method === 'credito' && sale.client_id) {
        demoClients = state.demoClients.map((c) => {
          if (c.id !== sale.client_id) return c;
          const newCredit = Math.max(0, c.total_credit_sales - sale.total_amount);
          return {
            ...c,
            total_credit_sales: newCredit,
            balance_due: Math.max(0, newCredit - c.total_paid),
          };
        });
      }

      return {
        demoSales: state.demoSales.filter((s) => s.id !== saleId),
        demoSaleItems: state.demoSaleItems.filter((i) => i.sale_id !== saleId),
        demoProducts,
        demoClients,
      };
    });
  },

  simulateUpdateSale: ({ saleId, items, newTotal, ivaEnabled, taxAmount }) => {
    const state = get();
    const sale = state.demoSales.find((s) => s.id === saleId);
    if (!sale) throw new Error('Venta no encontrada en demo');

    const oldItems = state.demoSaleItems.filter((i) => i.sale_id === saleId);

    // Restore the previous quantities before validating the new ones, so an edit
    // that keeps the same product never trips its own stock check.
    const restored = state.demoProducts.map((prod) => {
      const back = oldItems
        .filter((i) => i.product_id === prod.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      return back > 0 ? { ...prod, stock_quantity: prod.stock_quantity + back } : prod;
    });

    for (const item of items) {
      const prod = restored.find((p) => p.id === item.product_id);
      if (prod && prod.stock_quantity < item.quantity) {
        throw new Error(
          `Stock insuficiente para ${prod.name}. Disponible: ${prod.stock_quantity}`
        );
      }
    }

    const demoProducts = restored.map((prod) => {
      const sold = items
        .filter((i) => i.product_id === prod.id)
        .reduce((sum, i) => sum + i.quantity, 0);
      return sold > 0
        ? { ...prod, stock_quantity: Math.max(0, prod.stock_quantity - sold) }
        : prod;
    });

    const newItems: DemoSaleItem[] = items.map((item, idx) => ({
      id: `demo-item-${saleId}-${idx}`,
      sale_id: saleId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      unit_cost: restored.find((p) => p.id === item.product_id)?.cost ?? 0,
      subtotal: item.subtotal,
    }));

    let demoClients = state.demoClients;
    if (sale.payment_method === 'credito' && sale.client_id) {
      const delta = newTotal - sale.total_amount;
      demoClients = state.demoClients.map((c) => {
        if (c.id !== sale.client_id) return c;
        const newCredit = Math.max(0, c.total_credit_sales + delta);
        return {
          ...c,
          total_credit_sales: newCredit,
          balance_due: Math.max(0, newCredit - c.total_paid),
        };
      });
    }

    set({
      demoSales: state.demoSales.map((s) =>
        s.id === saleId
          ? { ...s, total_amount: newTotal, iva_enabled: ivaEnabled, tax_amount: taxAmount }
          : s
      ),
      demoSaleItems: [...state.demoSaleItems.filter((i) => i.sale_id !== saleId), ...newItems],
      demoProducts,
      demoClients,
    });
  },

  simulateAddProduct: (prod) => {
    const newProduct: Product = {
      ...prod,
      id: 'demo-prod-' + Date.now(),
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      demoProducts: [newProduct, ...state.demoProducts],
    }));

    return newProduct;
  },

  simulateUpdateProduct: (id, updates) => {
    const existing = get().demoProducts.find((p) => p.id === id);
    if (!existing) {
      throw new Error('Producto no encontrado en demo');
    }

    const updatedProduct: Product = { ...existing, ...updates };
    set((state) => ({
      demoProducts: state.demoProducts.map((p) => (p.id === id ? updatedProduct : p)),
    }));

    return updatedProduct;
  },

  simulateDeleteProduct: (id) => {
    set((state) => ({
      demoProducts: state.demoProducts.filter((p) => p.id !== id),
    }));
  },
}));

export const isDemoActive = (): boolean => {
  return useDemoStore.getState().isDemoMode;
};
