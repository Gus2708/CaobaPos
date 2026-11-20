import { computeDashboardMetrics, resolveItemUnitCost } from '../../lib/dashboardMetrics';
import { fetchAllPages, fetchByChunkedIn } from '../../lib/supabasePagination';

describe('resolveItemUnitCost', () => {
  const productMap = {
    p1: { id: 'p1', cost: 12.5, price: 20 },
    p2: { id: 'p2', cost: 0, price: 10 },
    p3: { id: 'p3', cost: null, price: 10 },
  };

  it('preserves positive unit_cost snapshot even when product catalog cost differs', () => {
    expect(resolveItemUnitCost({ product_id: 'p1', unit_cost: 9.75 }, productMap)).toBe(9.75);
  });

  it('falls back to product catalog cost when unit_cost is null, undefined, or 0', () => {
    expect(resolveItemUnitCost({ product_id: 'p1', unit_cost: null }, productMap)).toBe(12.5);
    expect(resolveItemUnitCost({ product_id: 'p1', unit_cost: undefined }, productMap)).toBe(12.5);
    expect(resolveItemUnitCost({ product_id: 'p1', unit_cost: 0 }, productMap)).toBe(12.5);
  });

  it('returns 0 when both snapshot and catalog cost are missing or non-positive', () => {
    expect(resolveItemUnitCost({ product_id: 'p2', unit_cost: 0 }, productMap)).toBe(0);
    expect(resolveItemUnitCost({ product_id: 'p3', unit_cost: null }, productMap)).toBe(0);
    expect(resolveItemUnitCost({ product_id: 'unknown', unit_cost: 0 }, productMap)).toBe(0);
  });
});

describe('computeDashboardMetrics', () => {
  it('computes revenue, cost, profit, and margin for paid sales without IVA', () => {
    const metrics = computeDashboardMetrics({
      sales: [
        { id: 's1', total_amount: 100, payment_method: 'cash', tax_amount: 0 },
        { id: 's2', total_amount: 50, payment_method: 'transfer', tax_amount: 0 },
      ],
      saleItems: [
        { sale_id: 's1', product_id: 'p1', quantity: 2, unit_cost: 30 },
        { sale_id: 's2', product_id: 'p2', quantity: 5, unit_cost: 6 },
      ],
      payments: [],
      products: [
        { id: 'p1', cost: 30, price: 50 },
        { id: 'p2', cost: 6, price: 10 },
      ],
    });

    expect(metrics.revenue).toBeCloseTo(150, 2);
    expect(metrics.netRevenue).toBeCloseTo(150, 2);
    expect(metrics.tax).toBeCloseTo(0, 2);
    expect(metrics.cost).toBeCloseTo(90, 2);
    expect(metrics.profit).toBeCloseTo(60, 2);
    expect(metrics.margin).toBeCloseTo(40, 2);
    expect(metrics.receivedMoney).toBeCloseTo(100, 2);
    expect(metrics.bsRevenue).toBeCloseTo(50, 2);
    expect(metrics.missingCostProductCount).toBe(0);
  });

  it('excludes IVA (tax_amount) from profit and margin for paid sales and abonos', () => {
    const metrics = computeDashboardMetrics({
      sales: [
        { id: 's1', total_amount: 116, payment_method: 'cash', iva_enabled: true, tax_amount: 16 },
      ],
      saleItems: [
        { sale_id: 's1', product_id: 'p1', quantity: 2, unit_cost: 25 },
      ],
      payments: [
        { id: 'pay1', client_id: 'c1', sale_id: 's_cred', amount: 58, payment_method: 'transfer' },
      ],
      products: [{ id: 'p1', cost: 25, price: 50 }],
      creditSales: [
        { id: 's_cred', client_id: 'c1', total_amount: 116, payment_method: 'credito', tax_amount: 16 },
      ],
      creditSaleItems: [
        { sale_id: 's_cred', product_id: 'p1', quantity: 2, unit_cost: 25 },
      ],
    });

    // Cash sale: $116 total ($16 IVA, $100 net), $50 cost -> $50 profit
    // Abono: $58 (50% of $116 credit sale) -> $8 IVA, $25 cost -> $25 profit
    expect(metrics.revenue).toBeCloseTo(174, 2);
    expect(metrics.tax).toBeCloseTo(24, 2);
    expect(metrics.netRevenue).toBeCloseTo(150, 2);
    expect(metrics.cost).toBeCloseTo(75, 2);
    expect(metrics.profit).toBeCloseTo(75, 2);
    expect(metrics.margin).toBeCloseTo(50, 2);
  });

  it('excludes unpaid credit sales from revenue/cost and applies exact & weighted cost ratios to abonos', () => {
    const metrics = computeDashboardMetrics({
      sales: [
        // Credit sale created in same period must only count in pendingCredit, not paid profit
        { id: 'cs_same_period', client_id: 'c1', total_amount: 100, payment_method: 'credito', tax_amount: 0 },
      ],
      saleItems: [
        { sale_id: 'cs_same_period', product_id: 'p1', quantity: 1, unit_cost: 60 },
      ],
      payments: [
        // Specific payment on cs_same_period (40% of $100)
        { id: 'pay_exact', client_id: 'c1', sale_id: 'cs_same_period', amount: 40, payment_method: 'cash' },
        // General payment (no sale_id) for client c2 with two credit sales:
        // cs2a: $100 (cost $50) + cs2b: $100 (cost $90) => weighted ratio = 140 / 200 = 0.70
        { id: 'pay_general', client_id: 'c2', sale_id: null, amount: 100, payment_method: 'card' },
      ],
      products: [
        { id: 'p1', cost: 60 },
        { id: 'p2', cost: 90 },
      ],
      creditSales: [
        { id: 'cs_same_period', client_id: 'c1', total_amount: 100, payment_method: 'credito', tax_amount: 0 },
        { id: 'cs2a', client_id: 'c2', total_amount: 100, payment_method: 'credito', tax_amount: 0 },
        { id: 'cs2b', client_id: 'c2', total_amount: 100, payment_method: 'credito', tax_amount: 0 },
      ],
      creditSaleItems: [
        { sale_id: 'cs_same_period', product_id: 'p1', quantity: 1, unit_cost: 60 },
        { sale_id: 'cs2a', product_id: 'p1', quantity: 1, unit_cost: 50 },
        { sale_id: 'cs2b', product_id: 'p2', quantity: 1, unit_cost: 90 },
      ],
    });

    // Abono 1: $40 * 0.60 = $24 cost; Abono 2: $100 * 0.70 = $70 cost => total cost = $94
    expect(metrics.pendingCredit).toBeCloseTo(100, 2);
    expect(metrics.revenue).toBeCloseTo(140, 2);
    expect(metrics.cost).toBeCloseTo(94, 2);
    expect(metrics.profit).toBeCloseTo(46, 2);
    expect(metrics.receivedMoney).toBeCloseTo(40, 2);
    expect(metrics.bsRevenue).toBeCloseTo(100, 2);
  });

  it('reconciles split partial abonos to the exact total credit sale cost and profit', () => {
    const metrics = computeDashboardMetrics({
      sales: [],
      saleItems: [],
      payments: [
        { id: 'p1', client_id: 'c1', sale_id: 'cs1', amount: 30, payment_method: 'cash' },
        { id: 'p2', client_id: 'c1', sale_id: 'cs1', amount: 70, payment_method: 'transfer' },
      ],
      products: [{ id: 'prod1', cost: 65 }],
      creditSales: [
        { id: 'cs1', client_id: 'c1', total_amount: 100, payment_method: 'credito', tax_amount: 0 },
      ],
      creditSaleItems: [
        { sale_id: 'cs1', product_id: 'prod1', quantity: 1, unit_cost: 65 },
      ],
    });

    expect(metrics.revenue).toBeCloseTo(100, 2);
    expect(metrics.cost).toBeCloseTo(65, 2);
    expect(metrics.profit).toBeCloseTo(35, 2);
  });

  it('preserves negative profit on loss-making credit sales without clamping costRatio to 1', () => {
    const metrics = computeDashboardMetrics({
      sales: [],
      saleItems: [],
      payments: [
        { id: 'p1', client_id: 'c1', sale_id: 'cs_loss', amount: 50, payment_method: 'cash' },
      ],
      products: [{ id: 'prod_loss', cost: 120 }],
      creditSales: [
        { id: 'cs_loss', client_id: 'c1', total_amount: 100, payment_method: 'credito', tax_amount: 0 },
      ],
      creditSaleItems: [
        { sale_id: 'cs_loss', product_id: 'prod_loss', quantity: 1, unit_cost: 120 },
      ],
    });

    // 50% of a $100 sale that cost $120 => $50 revenue - $60 cost = -$10 profit
    expect(metrics.cost).toBeCloseTo(60, 2);
    expect(metrics.profit).toBeCloseTo(-10, 2);
  });

  it('counts unique sold products with $0 resolved cost across paid sales and paid-off credit sales', () => {
    const metrics = computeDashboardMetrics({
      sales: [
        { id: 's1', total_amount: 20, payment_method: 'cash' },
        { id: 's_unpaid_credit', client_id: 'c_unpaid', total_amount: 20, payment_method: 'credito' },
      ],
      saleItems: [
        { sale_id: 's1', product_id: 'p_missing_1', quantity: 2, unit_cost: 0 },
        { sale_id: 's1', product_id: 'p_missing_1', quantity: 1, unit_cost: null },
        { sale_id: 's1', product_id: 'p_has_catalog', quantity: 1, unit_cost: 0 },
        { sale_id: 's_unpaid_credit', product_id: 'p_unpaid_only', quantity: 1, unit_cost: 0 },
      ],
      payments: [
        { id: 'pay1', client_id: 'c_paid', sale_id: 'cs_paid', amount: 15, payment_method: 'cash' },
      ],
      products: [
        { id: 'p_missing_1', cost: 0 },
        { id: 'p_has_catalog', cost: 5 },
        { id: 'p_missing_2', cost: null },
        { id: 'p_unpaid_only', cost: 0 },
      ],
      creditSales: [
        { id: 'cs_paid', client_id: 'c_paid', total_amount: 15, payment_method: 'credito' },
      ],
      creditSaleItems: [
        { sale_id: 'cs_paid', product_id: 'p_missing_2', quantity: 1, unit_cost: 0 },
      ],
    });

    // Only p_missing_1 (in paid sale) and p_missing_2 (in paid-off credit sale) count
    expect(metrics.missingCostProductCount).toBe(2);
  });
});

describe('supabasePagination helpers', () => {
  it('fetchAllPages paginates across 1,000-row pages until a partial page arrives', async () => {
    const totalRows = 1250;
    const allItems = Array.from({ length: totalRows }, (_, i) => ({ id: `row-${i}` }));
    const rangeCalls: Array<[number, number]> = [];

    const result = await fetchAllPages<{ id: string }>(() => ({
      range: jest.fn(async (from: number, to: number) => {
        rangeCalls.push([from, to]);
        return { data: allItems.slice(from, to + 1), error: null };
      }),
    }));

    expect(result).toHaveLength(totalRows);
    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('fetchAllPages falls back to single await when .range() is not present on mock', async () => {
    const result = await fetchAllPages<{ id: string }>(() =>
      Promise.resolve({ data: [{ id: '1' }, { id: '2' }], error: null })
    );
    expect(result).toEqual([{ id: '1' }, { id: '2' }]);
  });

  it('fetchByChunkedIn deduplicates values and splits >100 IDs into chunks', async () => {
    const ids = Array.from({ length: 205 }, (_, i) => `id-${i}`);
    // Add duplicate and empty entries
    const input = [...ids, 'id-0', 'id-1', ''];
    const chunksReceived: string[][] = [];

    const result = await fetchByChunkedIn<{ id: string }>(input, (chunk) => {
      chunksReceived.push(chunk);
      return Promise.resolve({ data: chunk.map(id => ({ id })), error: null });
    });

    expect(chunksReceived.map(c => c.length)).toEqual([100, 100, 5]);
    expect(result).toHaveLength(205);
  });

  it('fetchByChunkedIn returns empty array immediately without querying when values are empty', async () => {
    const builder = jest.fn();
    const result = await fetchByChunkedIn([], builder);
    expect(result).toEqual([]);
    expect(builder).not.toHaveBeenCalled();
  });
});
