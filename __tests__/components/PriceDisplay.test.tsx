import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { PriceDisplay } from '../../components/PriceDisplay';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn(() => ({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { currency: 'USD_VES', rate: 777.4161, source: 'bcv', is_current: true },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  },
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

describe('PriceDisplay component', () => {
  it('renders standard USD price correctly without Bs', async () => {
    await renderWithProviders(<PriceDisplay amount={25.5} />);
    expect(screen.getByText('$25.50')).toBeOnTheScreen();
  });

  it('renders dual USD and Bs price when showBs is true', async () => {
    await renderWithProviders(<PriceDisplay amount={10} showBs={true} />);
    expect(screen.getByText('$10.00')).toBeOnTheScreen();
    expect(screen.getByText('Bs. 7.774,16')).toBeOnTheScreen();
  });
});
