import { act } from '@testing-library/react-native';
import { useCartStore, useCartTotal, useCartItemCount } from '../../store/cartStore';
import type { Product } from '../../store/cartStore';

const MOCK_PRODUCT_1: Product = {
  id: 'p1',
  name: 'Producto 1',
  price: 25.50,
  cost: 10.00,
  barcode: '123456',
  stock_quantity: 50,
  categories: ['cafe'],
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};

const MOCK_PRODUCT_2: Product = {
  id: 'p2',
  name: 'Producto 2',
  price: 10.00,
  cost: 4.00,
  barcode: '789012',
  stock_quantity: 100,
  categories: ['snacks'],
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
};

// Helper: test selector logic directly from store state
function getCartTotal(): number {
  return useCartStore.getState().items.reduce(
    (total, item) => total + item.price * item.quantity, 0
  );
}

function getCartItemCount(): number {
  return useCartStore.getState().items.reduce(
    (count, item) => count + item.quantity, 0
  );
}

describe('Cart store - total calculation', () => {
  beforeEach(() => {
    act(() => useCartStore.setState({ items: [], lastScannedBarcode: null }));
  });

  it('returns 0 when cart is empty', () => {
    expect(getCartTotal()).toBe(0);
  });

  it('calculates total for single item', () => {
    act(() => useCartStore.getState().addItem(MOCK_PRODUCT_1));
    expect(getCartTotal()).toBe(25.50);
  });

  it('calculates total with quantity > 1', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
    });
    expect(getCartTotal()).toBe(51.00);
  });

  it('calculates total for multiple items', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
    });
    expect(getCartTotal()).toBe(35.50);
  });

  it('updates total after quantity change', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
      useCartStore.getState().updateQuantity('p1', 3);
    });
    expect(getCartTotal()).toBe(86.50);
  });

  it('updates total after item removal', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
      useCartStore.getState().removeItem('p1');
    });
    expect(getCartTotal()).toBe(10.00);
  });

  it('returns 0 after clearing cart', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().clearCart();
    });
    expect(getCartTotal()).toBe(0);
  });
});

describe('Cart store - item count calculation', () => {
  beforeEach(() => {
    act(() => useCartStore.setState({ items: [], lastScannedBarcode: null }));
  });

  it('returns 0 when cart is empty', () => {
    expect(getCartItemCount()).toBe(0);
  });

  it('counts total item quantity (not distinct items)', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
    });
    expect(getCartItemCount()).toBe(2);
  });

  it('counts accumulated quantities for same product', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
    });
    expect(getCartItemCount()).toBe(3);
  });

  it('counts correctly with mixed quantities', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
      useCartStore.getState().updateQuantity('p2', 5);
    });
    expect(getCartItemCount()).toBe(7);
  });

  it('updates after removal', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
      useCartStore.getState().removeItem('p1');
    });
    expect(getCartItemCount()).toBe(1);
  });

  it('updates after clear', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
      useCartStore.getState().clearCart();
    });
    expect(getCartItemCount()).toBe(0);
  });

  it('handles remove via updateQuantity to 0', () => {
    act(() => {
      useCartStore.getState().addItem(MOCK_PRODUCT_1);
      useCartStore.getState().addItem(MOCK_PRODUCT_2);
      useCartStore.getState().updateQuantity('p1', 0);
    });
    expect(getCartItemCount()).toBe(1);
  });
});

// Also verify the React hooks are importable (the selectors themselves)
describe('Derived selectors export sanity', () => {
  it('useCartTotal and useCartItemCount are functions', () => {
    expect(typeof useCartTotal).toBe('function');
    expect(typeof useCartItemCount).toBe('function');
  });
});
