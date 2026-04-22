import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HistoryPanel } from '../app/HistoryPanel';
import { supabase } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock Toast
jest.mock('../components/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, gcTime: 0 } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const MOCK_SALES = [
  { id: 'sale-1', total_amount: 100, payment_method: 'cash', created_at: new Date().toISOString() },
  { id: 'sale-2', total_amount: 200, payment_method: 'card', created_at: new Date().toISOString() },
];

describe('HistoryPanel Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    
    (supabase.from as jest.Mock).mockImplementation(() => {
      let filterMethod: string | null = null;
      const query = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        eq: jest.fn().mockImplementation((col: string, val: string) => {
          if (col === 'payment_method') filterMethod = val;
          return query;
        }),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockImplementation(() => {
          const data = filterMethod 
            ? MOCK_SALES.filter(s => s.payment_method === filterMethod)
            : MOCK_SALES;
          return Promise.resolve({ data, error: null });
        }),
      };
      return query;
    });
  });

  it('renders correctly and shows the "Todos" filter badge initially', async () => {
    await render(<HistoryPanel />, { wrapper });
    expect(await screen.findByText('Historial')).toBeOnTheScreen();
    expect(await screen.findByText('Todos')).toBeOnTheScreen();
  });

  it('opens the payment method filter menu when the badge is pressed', async () => {
    await render(<HistoryPanel />, { wrapper });
    const filterBadge = await screen.findByText('Todos');
    await fireEvent.press(filterBadge);

    expect(await screen.findByText('Filtrar por pago')).toBeOnTheScreen();
    expect(screen.getByText('Efectivo')).toBeOnTheScreen();
    expect(screen.getByText('Tarjeta')).toBeOnTheScreen();
    expect(screen.getByText('Transf.')).toBeOnTheScreen();
    expect(screen.getByText('Crédito')).toBeOnTheScreen();
  });

  it('filters results when a payment method is selected', async () => {
    await render(<HistoryPanel />, { wrapper });
    
    // Initial state: 2 sales
    expect(await screen.findByText('2')).toBeOnTheScreen();

    // Select cash
    await fireEvent.press(screen.getByText('Todos'));
    await fireEvent.press(screen.getByText('Efectivo'));

    // Should now show 1 sale (sale-1 is cash)
    await waitFor(() => {
      expect(screen.getByText('1')).toBeOnTheScreen();
    });
    
    // Verify badge text changed to "Efectivo"
    expect(screen.getByText('Efectivo')).toBeOnTheScreen();
  });

  it('filters results by time period', async () => {
    await render(<HistoryPanel />, { wrapper });
    
    // Initial state: Historical
    expect(await screen.findByText('Histórico')).toBeOnTheScreen();

    // Open period filter
    await fireEvent.press(screen.getByText('Histórico'));
    expect(await screen.findByText('Filtrar tiempo')).toBeOnTheScreen();

    // Select "Hoy"
    await fireEvent.press(screen.getByText('Hoy'));

    // Verify badge changed
    await waitFor(() => {
      expect(screen.getByText('Hoy')).toBeOnTheScreen();
    });
  });

  it('opens custom date range modal when selecting "Personalizado"', async () => {
    await render(<HistoryPanel />, { wrapper });
    
    await fireEvent.press(screen.getByText('Histórico'));
    await fireEvent.press(screen.getByText('Personalizado'));

    // Should show "Rango de Fechas" (from the custom modal)
    expect(await screen.findByText('Rango de Fechas')).toBeOnTheScreen();
  });
});
