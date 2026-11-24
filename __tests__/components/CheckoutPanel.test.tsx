import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutPanel } from '../../components/CheckoutPanel';
import { ToastProvider } from '../../components/Toast';
import { useCartStore } from '../../store/cartStore';

const mockMutateAsync = jest.fn();

jest.mock('../../hooks/useProducts', () => ({
  useCreateSale: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  getEmployeeDisplayName: () => 'Cajero Test',
}));

jest.mock('../../hooks/useExchangeRate', () => ({
  formatBs: (bs: number) => `Bs. ${bs.toFixed(2).replace('.', ',')}`,
  useExchangeRate: () => ({
    rate: 100,
    rateData: { currency: 'USD_VES', source: 'bcv', rate: 100, updated_at: '2026-01-01T00:00:00.000Z' },
    isFallbackRate: false,
    isRateUnconfirmed: false,
    formatBs: (usd: number) => `Bs. ${(usd * 100).toFixed(2).replace('.', ',')}`,
    formatBsDirect: (bs: number) => `Bs. ${bs.toFixed(2).replace('.', ',')}`,
    toBs: (usd: number) => Number((usd * 100).toFixed(2)),
    toUsd: (bs: number) => Number((bs / 100).toFixed(2)),
  }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1', email: 'cajero@caoba.test' },
    role: 'admin',
    session: null,
    isLoading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  }),
}));

jest.mock('../../components/SaleSummaryModal', () => ({
  SaleSummaryModal: () => null,
}));

jest.mock('../../components/ChangeCalculatorModal', () => ({
  ChangeCalculatorModal: () => null,
}));

jest.mock('../../components/ClientSelectorModal', () => ({
  ClientSelectorModal: () => null,
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
};

const seedCart = () => {
  useCartStore.getState().clearCart();
  useCartStore.getState().addItem({
    id: 'prod-1',
    name: 'Lays 80g',
    price: 2.5,
    cost: 1.5,
    stock_quantity: 10,
    categories: ['Snacks'],
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
  });
};

describe('CheckoutPanel mixed payment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ id: 'sale-1' });
    seedCart();
  });

  afterEach(() => {
    useCartStore.getState().clearCart();
  });

  it('parses comma decimals in mixed payment (2 cash + 0,50 card = 2.50 total)', async () => {
    await render(<CheckoutPanel />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByRole('radio', { name: 'Pago Mixto' }));

    const cashInput = await screen.findByTestId('mix-input-cash');
    const cardInput = screen.getByTestId('mix-input-card');

    await fireEvent.changeText(cashInput, '2');
    await fireEvent.changeText(cardInput, '0,50');

    await fireEvent.press(screen.getByRole('button', { name: 'Completar venta' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAmount: 2.5,
        paymentMethod: 'mixto',
        paymentDetails: { cash: 2, card: 0.5, transfer: 0 },
      })
    );
  });

  it('parses dot decimals in mixed payment (2 cash + 0.50 card = 2.50 total)', async () => {
    await render(<CheckoutPanel />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByRole('radio', { name: 'Pago Mixto' }));

    const cashInput = await screen.findByTestId('mix-input-cash');
    const cardInput = screen.getByTestId('mix-input-card');

    await fireEvent.changeText(cashInput, '2');
    await fireEvent.changeText(cardInput, '0.50');

    await fireEvent.press(screen.getByRole('button', { name: 'Completar venta' }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        totalAmount: 2.5,
        paymentMethod: 'mixto',
        paymentDetails: { cash: 2, card: 0.5, transfer: 0 },
      })
    );
  });
});
