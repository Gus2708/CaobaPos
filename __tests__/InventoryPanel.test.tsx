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

describe('InventoryPanel product editing', () => {
  const defaultFromImpl = (supabase.from as jest.Mock).getMockImplementation();

  afterEach(() => {
    if (defaultFromImpl) {
      (supabase.from as jest.Mock).mockImplementation(defaultFromImpl);
    }
    jest.clearAllMocks();
  });

  function setupProductMocks(options: {
    updateResult: { data: any; error: any };
    onProductUpdate?: (updates: Record<string, any>) => void;
  }) {
    const productRow = {
      id: 'prod-lays-1',
      name: 'Lays 80g',
      price: 1.5,
      cost: 0.9,
      stock_quantity: 12,
      barcode: '',
      is_active: true,
      created_at: '2026-01-01T00:00:00.000Z',
      product_categories: [{ category: { name: 'Snacks' } }],
    };

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: jest.fn((cols: string) => {
            if (cols === 'name') {
              return {
                order: jest.fn().mockResolvedValue({ data: [{ name: 'Snacks' }], error: null }),
              };
            }
            return {
              in: jest.fn().mockResolvedValue({ data: [{ id: 'cat-snacks' }], error: null }),
            };
          }),
          upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      }

      if (table === 'product_categories') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({
              data: [{ category_id: 'cat-snacks' }],
              error: null,
            }),
          })),
          delete: jest.fn(() => ({
            eq: jest.fn(() => ({
              in: jest.fn().mockResolvedValue({ error: null }),
            })),
          })),
          upsert: jest.fn().mockResolvedValue({ error: null }),
        };
      }

      if (table === 'products') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              order: jest.fn(() => ({
                range: jest.fn().mockResolvedValue({ data: [productRow], error: null }),
              })),
              neq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
                })),
              })),
            })),
          })),
          update: jest.fn((updates: Record<string, any>) => {
            options.onProductUpdate?.(updates);
            return {
              eq: jest.fn(() => ({
                select: jest.fn(() => ({
                  maybeSingle: jest.fn().mockResolvedValue(options.updateResult),
                })),
              })),
            };
          }),
        };
      }

      return defaultFromImpl ? defaultFromImpl(table) : {};
    });
  }

  it('parses comma decimals for price and cost and confirms the updated row', async () => {
    let capturedUpdates: Record<string, any> | null = null;
    setupProductMocks({
      onProductUpdate: (updates) => {
        capturedUpdates = updates;
      },
      updateResult: {
        data: {
          id: 'prod-lays-1',
          name: 'Lays 80g',
          price: 2.5,
          cost: 1.25,
          stock_quantity: 12,
          is_active: true,
          created_at: '2026-01-01T00:00:00.000Z',
        },
        error: null,
      },
    });

    await render(<InventoryPanel readOnly={false} />, { wrapper: AllTheProviders });

    const row = await screen.findByRole('button', { name: 'Editar Lays 80g' }, { timeout: 5000 });
    await fireEvent.press(row);

    const priceInput = await screen.findByTestId('edit-input-price', {}, { timeout: 5000 });
    await fireEvent.changeText(priceInput, '2,50');
    const costInput = await screen.findByTestId('edit-input-cost', {}, { timeout: 5000 });
    await fireEvent.changeText(costInput, '1,25');

    expect(screen.getByTestId('edit-input-price').props.value).toBe('2,50');
    expect(screen.getByTestId('edit-input-cost').props.value).toBe('1,25');

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar Cambios' }));

    expect(await screen.findByText('Producto actualizado', {}, { timeout: 5000 })).toBeOnTheScreen();
    expect(capturedUpdates).toEqual(
      expect.objectContaining({
        name: 'Lays 80g',
        price: 2.5,
        cost: 1.25,
        stock_quantity: 12,
      })
    );
    await waitFor(() => {
      expect(screen.queryByTestId('edit-card')).toBeNull();
    });
  }, 15000);

  it('shows a permission error and keeps edit mode open when update affects 0 rows', async () => {
    setupProductMocks({
      updateResult: { data: null, error: null },
    });

    await render(<InventoryPanel readOnly={false} />, { wrapper: AllTheProviders });

    const row = await screen.findByRole('button', { name: 'Editar Lays 80g' }, { timeout: 5000 });
    await fireEvent.press(row);

    const priceInput = await screen.findByTestId('edit-input-price', {}, { timeout: 5000 });
    await fireEvent.changeText(priceInput, '3,00');
    const costInput = await screen.findByTestId('edit-input-cost', {}, { timeout: 5000 });
    await fireEvent.changeText(costInput, '1,80');

    await fireEvent.press(screen.getByRole('button', { name: 'Guardar Cambios' }));

    expect(
      await screen.findByText(
        'No se pudo actualizar el producto. Verifica que tengas permisos de administrador.',
        {},
        { timeout: 5000 }
      )
    ).toBeOnTheScreen();
    expect(screen.queryByText('Producto actualizado')).toBeNull();
    expect(screen.getByTestId('edit-card')).toBeOnTheScreen();
  }, 15000);

  it('does not open edit mode when readOnly is true', async () => {
    setupProductMocks({
      updateResult: { data: null, error: null },
    });

    await render(<InventoryPanel readOnly={true} />, { wrapper: AllTheProviders });

    const productLabel = await screen.findByText('Lays 80g', {}, { timeout: 5000 });
    await fireEvent.press(productLabel);

    expect(screen.queryByTestId('edit-card')).toBeNull();
  }, 15000);
});
