import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ClientDetailsModal } from '../../components/ClientDetailsModal';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the Supabase module globally
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Mock useToast
jest.mock('../../components/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));

// Mock the navigation context so that expo-router doesn't complain if used indirectly
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

describe('ClientDetailsModal - Debts Calculations', () => {
  it('correctly calculates and displays the debt and balance amounts', async () => {
    // 1. Arrange: Define a client with specific credit calculations
    const mockClient = {
      id: 'abc-123',
      name: 'Gustavo',
      phone: null,
      created_at: new Date().toISOString(),
      total_credit_sales: 15.50,
      total_paid: 5.50,
      balance_due: 10.00, // They owe $10
    };

    // 2. Act: Render the modal
    await renderWithProviders(
      <ClientDetailsModal visible={true} client={mockClient} onClose={jest.fn()} />
    );

    // 3. Assert: Check all calculated fields map correctly to the UI
    expect(screen.getByText('Deuda Total')).toBeOnTheScreen();
    // Assuming UI formatted as $15.50
    expect(screen.getByText('$15.50')).toBeOnTheScreen(); 

    expect(screen.getByText('Abonado')).toBeOnTheScreen();
    expect(screen.getByText('$5.50')).toBeOnTheScreen();

    expect(screen.getByText('Saldo Actual')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
  });

  it('displays NO active debt if fully paid', async () => {
    const mockClient = {
      id: 'abc-123',
      name: 'Gustavo',
      phone: null,
      created_at: new Date().toISOString(),
      total_credit_sales: 10.00,
      total_paid: 10.00,
      balance_due: 0.00, // fully paid
    };

    await renderWithProviders(
      <ClientDetailsModal visible={true} client={mockClient} onClose={jest.fn()} />
    );

    expect(screen.getByText('Deuda Total')).toBeOnTheScreen();
    expect(screen.getAllByText('$10.00')[0]).toBeOnTheScreen();

    // Saldo Actual should format down to $0.00
    expect(screen.getByText('Saldo Actual')).toBeOnTheScreen();
    expect(screen.getAllByText('$0.00')[0]).toBeOnTheScreen();
  });

  it('displays negative balance if overpaid', async () => {
    const mockClient = {
      id: 'abc-123',
      name: 'Gustavo',
      phone: null,
      created_at: new Date().toISOString(),
      total_credit_sales: 10.00,
      total_paid: 15.00,
      balance_due: -5.00, // overpaid
    };

    await renderWithProviders(
      <ClientDetailsModal visible={true} client={mockClient} onClose={jest.fn()} />
    );

    expect(screen.getByText('Deuda Total')).toBeOnTheScreen();
    expect(screen.getByText('$10.00')).toBeOnTheScreen();

    // Assuming negative is shown correctly
    expect(screen.getByText('$-5.00')).toBeOnTheScreen();
  });
});
