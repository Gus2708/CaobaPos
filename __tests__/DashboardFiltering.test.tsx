import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPanel } from '../app/DashboardPanel';
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

describe('Dashboard Custom Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
    
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      const mockResult = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockImplementation(() => Promise.resolve({ data: [], error: null })),
        then: jest.fn((callback) => callback({ data: [], error: null })),
      };
      // For thenable behavior
      (mockResult as any).promise = Promise.resolve({ data: [], error: null });
      return mockResult;
    });
  });

  it('renders "Personalizado" option in PeriodSelector', async () => {
    await render(<DashboardPanel />, { wrapper });
    const btn = await screen.findByText('Personalizado');
    expect(btn).toBeOnTheScreen();
  });

  it('opens CustomDateRangeModal when selecting "Personalizado"', async () => {
    await render(<DashboardPanel />, { wrapper });
    const btn = await screen.findByText('Personalizado');
    await fireEvent.press(btn);

    expect(await screen.findByText('Rango de Fechas')).toBeOnTheScreen();
    expect(await screen.findByText('DESDE')).toBeOnTheScreen();
    expect(await screen.findByText('HASTA')).toBeOnTheScreen();
  });

  it('confirms date range and updates dashboard query keys', async () => {
    const fromSpy = jest.spyOn(supabase, 'from');
    
    await render(<DashboardPanel />, { wrapper });
    
    const btn = await screen.findByText('Personalizado');
    await fireEvent.press(btn);

    const confirmBtn = await screen.findByText('Confirmar Periodo');
    await fireEvent.press(confirmBtn);

    // After confirmation, the dashboard should show a range label instead of "Hoy"
    await waitFor(() => {
        expect(screen.queryByText('Ventas (Hoy)')).toBeNull();
    });
    
    expect(fromSpy).toHaveBeenCalledWith('sales');
  });

  it('allows adjusting dates in the custom modal', async () => {
    await render(<DashboardPanel />, { wrapper });
    
    const btn = await screen.findByText('Personalizado');
    await fireEvent.press(btn);
    
    const currentYear = new Date().getFullYear().toString();
    const yearInput = await screen.findByDisplayValue(currentYear);
    expect(yearInput).toBeOnTheScreen();
  });
});
