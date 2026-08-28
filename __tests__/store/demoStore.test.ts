import { act } from '@testing-library/react-native';
import { useDemoStore, isDemoActive } from '../../store/demoStore';

describe('Demo Store & Zero-Trust Sandbox', () => {
  beforeEach(() => {
    act(() => {
      useDemoStore.getState().resetDemoData();
      useDemoStore.getState().setDemoMode(false);
    });
  });

  it('starts with isDemoMode as false and isDemoActive returning false', () => {
    expect(useDemoStore.getState().isDemoMode).toBe(false);
    expect(isDemoActive()).toBe(false);
  });

  it('toggles and sets demo mode correctly', () => {
    act(() => {
      useDemoStore.getState().setDemoMode(true);
    });
    expect(useDemoStore.getState().isDemoMode).toBe(true);
    expect(isDemoActive()).toBe(true);

    act(() => {
      useDemoStore.getState().toggleDemoMode();
    });
    expect(useDemoStore.getState().isDemoMode).toBe(false);
    expect(isDemoActive()).toBe(false);
  });

  it('contains pre-seeded realistic products, clients, categories and sales', () => {
    const state = useDemoStore.getState();
    expect(state.demoCategories.length).toBeGreaterThan(0);
    expect(state.demoProducts.length).toBeGreaterThanOrEqual(10);
    expect(state.demoClients.length).toBeGreaterThanOrEqual(3);
    expect(state.demoSales.length).toBeGreaterThanOrEqual(5);
    expect(state.demoSaleItems.length).toBeGreaterThanOrEqual(5);
  });

  it('simulates sale creation and correctly decrements product stock in memory', () => {
    const state = useDemoStore.getState();
    const product = state.demoProducts[0];
    const initialStock = product.stock_quantity;

    let createdSale: any;
    act(() => {
      createdSale = useDemoStore.getState().simulateCreateSale({
        totalAmount: product.price * 2,
        paymentMethod: 'cash',
        items: [
          {
            product_id: product.id,
            product_name: product.name,
            quantity: 2,
            unit_price: product.price,
            subtotal: product.price * 2,
          },
        ],
      });
    });

    expect(createdSale.id).toContain('demo-sale-');
    expect(createdSale.payment_method).toBe('cash');
    expect(createdSale.status).toBe('paid');

    const updatedState = useDemoStore.getState();
    const updatedProduct = updatedState.demoProducts.find((p) => p.id === product.id);
    expect(updatedProduct?.stock_quantity).toBe(initialStock - 2);

    expect(updatedState.demoSales[0].id).toBe(createdSale.id);
    expect(updatedState.demoSaleItems.some((i) => i.sale_id === createdSale.id)).toBe(true);
  });

  it('simulates credit sale and updates client balance', () => {
    const state = useDemoStore.getState();
    const client = state.demoClients[0];
    const initialDue = client.balance_due;
    const initialCredit = client.total_credit_sales;

    act(() => {
      useDemoStore.getState().simulateCreateSale({
        totalAmount: 20.00,
        paymentMethod: 'credito',
        clientId: client.id,
        items: [
          {
            product_id: state.demoProducts[0].id,
            product_name: state.demoProducts[0].name,
            quantity: 1,
            unit_price: 20.00,
            subtotal: 20.00,
          },
        ],
      });
    });

    const updatedClient = useDemoStore.getState().demoClients.find((c) => c.id === client.id);
    expect(updatedClient?.total_credit_sales).toBe(initialCredit + 20.00);
    expect(updatedClient?.balance_due).toBe(initialDue + 20.00);
  });

  it('simulates client payment and reduces balance due', () => {
    const state = useDemoStore.getState();
    const clientWithDebt = state.demoClients.find((c) => c.balance_due > 0)!;
    const initialDue = clientWithDebt.balance_due;
    const initialPaid = clientWithDebt.total_paid;

    act(() => {
      useDemoStore.getState().simulateAddPayment({
        clientId: clientWithDebt.id,
        amount: 10.00,
        paymentMethod: 'cash',
      });
    });

    const updatedClient = useDemoStore.getState().demoClients.find((c) => c.id === clientWithDebt.id);
    expect(updatedClient?.total_paid).toBe(initialPaid + 10.00);
    expect(updatedClient?.balance_due).toBe(Math.max(0, initialDue - 10.00));
  });

  it('keeps seed data internally consistent: totals, prices and client balances', () => {
    const state = useDemoStore.getState();

    // Every sale total must equal the sum of its item subtotals.
    for (const sale of state.demoSales) {
      const items = state.demoSaleItems.filter((i) => i.sale_id === sale.id);
      expect(items.length).toBeGreaterThan(0);
      const sum = items.reduce((acc, i) => acc + i.subtotal, 0);
      expect(sum).toBeCloseTo(sale.total_amount, 2);
    }

    // Every seeded item must price and cost the product at its catalog value.
    for (const item of state.demoSaleItems) {
      const product = state.demoProducts.find((p) => p.id === item.product_id);
      expect(product).toBeDefined();
      expect(item.unit_price).toBeCloseTo(product!.price, 2);
      expect(item.unit_cost).toBeCloseTo(product!.cost ?? 0, 2);
      expect(item.subtotal).toBeCloseTo(item.unit_price * item.quantity, 2);
      expect(item.id).toBeTruthy();
    }

    // Client balances must be backed by real credit sales and real payments.
    for (const client of state.demoClients) {
      const credit = state.demoSales
        .filter((s) => s.client_id === client.id && s.payment_method === 'credito')
        .reduce((acc, s) => acc + s.total_amount, 0);
      const paid = state.demoPayments
        .filter((p) => p.client_id === client.id)
        .reduce((acc, p) => acc + p.amount, 0);

      expect(credit).toBeCloseTo(client.total_credit_sales, 2);
      expect(paid).toBeCloseTo(client.total_paid, 2);
      expect(client.balance_due).toBeCloseTo(Math.max(0, credit - paid), 2);
    }
  });

  it('restores the full payment seed on reset (not just the first payment)', () => {
    act(() => {
      useDemoStore.getState().simulateDeletePayment('demo-pay-2');
    });
    expect(useDemoStore.getState().demoPayments).toHaveLength(1);

    act(() => {
      useDemoStore.getState().resetDemoData();
    });

    const ids = useDemoStore.getState().demoPayments.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(['demo-pay-1', 'demo-pay-2']));
  });

  it('recalculates the client balance when a payment is deleted', () => {
    const before = useDemoStore.getState().demoClients.find((c) => c.id === 'demo-client-1')!;

    act(() => {
      useDemoStore.getState().simulateDeletePayment('demo-pay-1');
    });

    const after = useDemoStore.getState().demoClients.find((c) => c.id === 'demo-client-1')!;
    expect(after.total_paid).toBeCloseTo(before.total_paid - 40.0, 2);
    expect(after.balance_due).toBeCloseTo(after.total_credit_sales - after.total_paid, 2);
  });

  it('restores stock and reverts credit when a sale is deleted', () => {
    const state = useDemoStore.getState();
    const torta = state.demoProducts.find((p) => p.id === 'demo-prod-6')!;
    const client = state.demoClients.find((c) => c.id === 'demo-client-3')!;
    const stockBefore = torta.stock_quantity;

    act(() => {
      useDemoStore.getState().simulateDeleteSale('demo-sale-4');
    });

    const after = useDemoStore.getState();
    expect(after.demoSales.some((s) => s.id === 'demo-sale-4')).toBe(false);
    expect(after.demoSaleItems.some((i) => i.sale_id === 'demo-sale-4')).toBe(false);
    expect(after.demoProducts.find((p) => p.id === 'demo-prod-6')!.stock_quantity).toBe(
      stockBefore + 4
    );

    const updatedClient = after.demoClients.find((c) => c.id === 'demo-client-3')!;
    expect(updatedClient.total_credit_sales).toBeCloseTo(client.total_credit_sales - 18.0, 2);
    expect(updatedClient.balance_due).toBeCloseTo(0, 2);
  });

  it('keeps unit_cost and rebalances stock when a sale is edited', () => {
    const stockBefore = useDemoStore
      .getState()
      .demoProducts.find((p) => p.id === 'demo-prod-6')!.stock_quantity;

    act(() => {
      useDemoStore.getState().simulateUpdateSale({
        saleId: 'demo-sale-4',
        items: [
          {
            product_id: 'demo-prod-6',
            product_name: 'Torta Húmeda Tres Leches',
            quantity: 2,
            unit_price: 4.5,
            subtotal: 9.0,
          },
        ],
        newTotal: 9.0,
        ivaEnabled: false,
        taxAmount: 0,
      });
    });

    const after = useDemoStore.getState();
    const items = after.demoSaleItems.filter((i) => i.sale_id === 'demo-sale-4');
    expect(items).toHaveLength(1);
    expect(items[0].unit_cost).toBeCloseTo(1.5, 2);
    expect(items[0].id).toBeTruthy();

    // 4 units returned, 2 taken back out.
    expect(after.demoProducts.find((p) => p.id === 'demo-prod-6')!.stock_quantity).toBe(
      stockBefore + 2
    );
    expect(after.demoSales.find((s) => s.id === 'demo-sale-4')!.total_amount).toBeCloseTo(9.0, 2);
    expect(after.demoClients.find((c) => c.id === 'demo-client-3')!.balance_due).toBeCloseTo(9.0, 2);
  });

  it('rejects an edit that exceeds available stock', () => {
    expect(() =>
      useDemoStore.getState().simulateUpdateSale({
        saleId: 'demo-sale-4',
        items: [
          {
            product_id: 'demo-prod-6',
            product_name: 'Torta Húmeda Tres Leches',
            quantity: 9999,
            unit_price: 4.5,
            subtotal: 44995.5,
          },
        ],
        newTotal: 44995.5,
        ivaEnabled: false,
        taxAmount: 0,
      })
    ).toThrow(/Stock insuficiente/);
  });

  it('throws instead of mutating state when updating a missing product', () => {
    const before = useDemoStore.getState().demoProducts;
    expect(() =>
      useDemoStore.getState().simulateUpdateProduct('demo-prod-inexistente', { price: 1 })
    ).toThrow(/no encontrado/i);
    expect(useDemoStore.getState().demoProducts).toBe(before);
  });

  it('simulates product CRUD operations without throwing', () => {
    let newProd: any;
    act(() => {
      newProd = useDemoStore.getState().simulateAddProduct({
        name: 'Producto Test Demo',
        price: 9.99,
        cost: 3.00,
        stock_quantity: 15,
        categories: ['Cafetería'],
        is_active: true,
      });
    });

    expect(newProd.id).toContain('demo-prod-');
    expect(useDemoStore.getState().demoProducts.some((p) => p.id === newProd.id)).toBe(true);

    act(() => {
      useDemoStore.getState().simulateUpdateProduct(newProd.id, {
        price: 12.50,
      });
    });

    const edited = useDemoStore.getState().demoProducts.find((p) => p.id === newProd.id);
    expect(edited?.price).toBe(12.50);

    act(() => {
      useDemoStore.getState().simulateDeleteProduct(newProd.id);
    });

    expect(useDemoStore.getState().demoProducts.some((p) => p.id === newProd.id)).toBe(false);
  });
});
