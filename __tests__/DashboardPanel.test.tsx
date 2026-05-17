import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPanel } from '../app/DashboardPanel';
import { supabase } from '../lib/supabase';

// Supabase is mocked in jest.setup.js

// Mock Toast to avoid context errors
jest.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

const NOW = new Date();
const TODAY_STR = NOW.toISOString();
const PAST_DATE = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(); // 10 days ago

const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Product 1', cost: 10, price: 20, stock_quantity: 100 },
];

const MOCK_SALES = [
  { id: 's1', total_amount: 40, payment_method: 'cash', created_at: TODAY_STR }, // Today sale
  { id: 's2', total_amount: 100, payment_method: 'card', created_at: PAST_DATE }, // Past sale
];

const MOCK_SALE_ITEMS = [
  { sale_id: 's1', product_id: 'p1', quantity: 2, unit_price: 20, unit_cost: 10, subtotal: 40, sales: { created_at: TODAY_STR } }, // Cost: 2 * 10 = 20
  { sale_id: 's2', product_id: 'p1', quantity: 5, unit_price: 20, unit_cost: 10, subtotal: 100, sales: { created_at: PAST_DATE } }, // Cost: 5 * 10 = 50
];

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('DashboardPanel Metrics', () => {
  beforeEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
    
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      let filteredData: any[] = [];
      if (table === 'sales') filteredData = [...MOCK_SALES];
      else if (table === 'sale_items') filteredData = [...MOCK_SALE_ITEMS];
      else if (table === 'products') filteredData = [...MOCK_PRODUCTS];

      const mockChain: any = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockImplementation((col, val) => {
          filteredData = filteredData.filter(d => (d.created_at || d.sales?.created_at) >= val);
          return mockChain;
        }),
        lte: jest.fn().mockImplementation((col, val) => {
          filteredData = filteredData.filter(d => (d.created_at || d.sales?.created_at) <= val);
          return mockChain;
        }),
        in: jest.fn().mockImplementation((col, vals) => {
          if (col === 'sale_id') {
            filteredData = filteredData.filter(d => vals.includes(d.sale_id));
          }
          return mockChain;
        }),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      };

      mockChain.then = jest.fn((callback) => {
        return Promise.resolve(callback({ data: filteredData, error: null }));
      });
      
      return mockChain;
    });
  });

  it('calculates properly isolated metrics for Ganancia Hoy and Ganancia Total', async () => {
    await render(<DashboardPanel />, { wrapper });

    // Wait until loading indicator is gone and main text appears
    const ventashoy = await screen.findByText(/Ventas \(Hoy\)/);
    expect(ventashoy).toBeOnTheScreen();
    
    // Profit Hoy: Should find $20.00 (could be formatted with spaces or different dots)
    const profitElements = await screen.findAllByText(/\$?\s*20[.,]00/);
    expect(profitElements.length).toBeGreaterThanOrEqual(1);

    // Switch to "Mes"
    const btnMes = await screen.findByText('Mes');
    fireEvent.press(btnMes);

    // Now it should show "Ventas (Este Mes)"
    expect(await screen.findByText(/Ventas \(Este Mes\)/)).toBeOnTheScreen();
    
    // Total profit for both mock products is $70.00
    const totalProfitElements = await screen.findAllByText(/\$?\s*70[.,]00/);
    expect(totalProfitElements.length).toBeGreaterThanOrEqual(1);

    // Check modal interaction
    const btnCash = await screen.findByText('Efectivo');
    fireEvent.press(btnCash);

    // Our modal should pop up showing 'Total en Efectivo'
    expect(await screen.findByText('Total en Efectivo')).toBeOnTheScreen();
    // And exactly $40.00 (the single cash sale)
    const cashElements = await screen.findAllByText(/\$?\s*40[.,]00/);
    expect(cashElements.length).toBeGreaterThanOrEqual(1);
  }, 20000);
});
