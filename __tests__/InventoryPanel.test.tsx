import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { InventoryPanel } from '../app/InventoryPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../components/Toast';
import { supabase } from '../lib/supabase';

// Create a clean QueryClient for each test
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
};

describe('InventoryPanel', () => {
  it('renders correctly and wait for data', async () => {
    await render(<InventoryPanel readOnly={true} />, { wrapper: AllTheProviders });

    // Wait for initial render, then re-query to avoid stale references after FlashList re-renders
    await screen.findByText('Inventario');
    await waitFor(() => {
      expect(screen.getByText('Inventario')).toBeOnTheScreen();
      expect(screen.getByRole('search', { name: 'Buscar productos' })).toBeOnTheScreen();
    });
  });

  it('toggles the add form using accessibility roles', async () => {
    await render(<InventoryPanel readOnly={false} />, { wrapper: AllTheProviders });

    // Wait for the button to appear, then re-query to avoid stale reference before press
    await screen.findByRole('button', { name: 'Agregar nuevo producto' });
    fireEvent.press(screen.getByRole('button', { name: 'Agregar nuevo producto' }));
    
    await waitFor(() => {
      expect(screen.getByTestId('add-form')).toBeOnTheScreen();
    }, { timeout: 10000 });
    
    // Verify that the button label changed to "Cerrar..."
    expect(await screen.findByRole('button', { name: 'Cerrar formulario de agregar' })).toBeOnTheScreen();
  }, 15000);

  it('shows error state when supabase fails', async () => {
    const mockSupabase = supabase.from as jest.Mock;
    mockSupabase.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: null, error: new Error('Network Error') })
      })
    }));

    await render(<InventoryPanel readOnly={true} />, { wrapper: AllTheProviders });
    
    expect(await screen.findByText('Error al cargar productos')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Reintentar cargar productos' })).toBeOnTheScreen();
  });

  it('disables the "Crear" button if required fields are empty', async () => {
    await render(<InventoryPanel readOnly={false} />, { wrapper: AllTheProviders });

    // Re-query after findByRole to avoid pressing a stale reference
    await screen.findByRole('button', { name: 'Agregar nuevo producto' });
    fireEvent.press(screen.getByRole('button', { name: 'Agregar nuevo producto' }));
    
    await waitFor(() => {
      expect(screen.getByTestId('add-form')).toBeOnTheScreen();
    }, { timeout: 10000 });
    
    const createBtn = screen.getByText('Crear Producto');
    expect(createBtn).toBeDisabled();
  }, 15000);
});
