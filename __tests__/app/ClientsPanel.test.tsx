import React from 'react';
import { render, screen } from '@testing-library/react-native';
import ClientsPanel from '../../app/ClientsPanel';
import * as useClientsHook from '../../hooks/useClients';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the hook entirely instead of real Supabase
jest.mock('../../hooks/useClients', () => ({
  useClients: jest.fn(),
}));

jest.mock('../../components/ClientDetailsModal', () => ({
  ClientDetailsModal: () => null,
}));

// Mock safe area insets
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithProviders = async (ui: React.ReactElement) => {
  return await render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('ClientsPanel - Global Debt Calculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calculates the Total por Cobrar combining only positive balances across all clients', async () => {
    // Arrange: Return a mixed set of clients
    (useClientsHook.useClients as jest.Mock).mockReturnValue({
      data: [
        { id: '1', name: 'John Doe', balance_due: 10.50 }, // Owes $10.50
        { id: '2', name: 'Jane Smith', balance_due: -5.00 }, // Overpaid, shouldn't reduce total debt
        { id: '3', name: 'Bob Jones', balance_due: 0.00 }, // Fully paid
        { id: '4', name: 'Alice', balance_due: 20.00 }, // Owes $20.00
      ],
      isLoading: false,
      error: null,
    });

    // Act
    await renderWithProviders(<ClientsPanel />);

    // Assert: Total should be 10.50 + 20.00 = 30.50
    expect(screen.getByText('Total por Cobrar')).toBeOnTheScreen();
    expect(screen.getByText('$30.50')).toBeOnTheScreen();
  });

  it('shows $0.00 when no clients have active debt', async () => {
    (useClientsHook.useClients as jest.Mock).mockReturnValue({
      data: [
        { id: '1', name: 'John Doe', balance_due: 0.00 }, 
        { id: '2', name: 'Jane Smith', balance_due: -5.00 }, 
      ],
      isLoading: false,
      error: null,
    });

    await renderWithProviders(<ClientsPanel />);

    expect(screen.getByText('Total por Cobrar')).toBeOnTheScreen();
    expect(screen.getAllByText('$0.00')[0]).toBeOnTheScreen();
  });
});
