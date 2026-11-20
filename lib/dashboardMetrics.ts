export interface SaleMetricInput {
  id: string;
  total_amount: number | string;
  payment_method: string;
  payment_details?: Record<string, number | string> | null;
  tax_amount?: number | string | null;
  iva_enabled?: boolean | null;
  client_id?: string | null;
}

export interface SaleItemMetricInput {
  sale_id: string;
  product_id: string;
  quantity: number | string;
  unit_price?: number | string | null;
  unit_cost?: number | string | null;
  subtotal?: number | string | null;
}

export interface PaymentMetricInput {
  id?: string;
  client_id?: string | null;
  sale_id?: string | null;
  amount: number | string;
  payment_method: string;
}

export interface ProductMetricInput {
  id: string;
  cost?: number | string | null;
  price?: number | string | null;
}

export interface DashboardMetrics {
  revenue: number;
  netRevenue: number;
  tax: number;
  cost: number;
  profit: number;
  pendingCredit: number;
  receivedMoney: number;
  cardRevenue: number;
  transferRevenue: number;
  bsRevenue: number;
  margin: number;
  missingCostProductCount: number;
}

interface RatioEntry {
  costRatio: number;
  taxRatio: number;
}

interface ClientTotalEntry {
  totalAmount: number;
  totalCost: number;
  totalTax: number;
  missingProductIds: Set<string>;
}

/**
 * Resolves the unit cost for a sale item, preserving positive historical
 * snapshots while falling back to the current product catalog cost when the
 * snapshot is missing, null, or 0.
 */
export function resolveItemUnitCost(
  item: Pick<SaleItemMetricInput, 'product_id' | 'unit_cost'>,
  productMap: Record<string, ProductMetricInput>
): number {
  const snapshot = Number(item.unit_cost);
  if (Number.isFinite(snapshot) && snapshot > 0) {
    return snapshot;
  }

  const fallback = Number(productMap[item.product_id]?.cost);
  if (Number.isFinite(fallback) && fallback > 0) {
    return fallback;
  }

  return 0;
}

function clampTax(taxAmount: number | string | null | undefined, totalAmount: number): number {
  const tax = Number(taxAmount);
  if (!Number.isFinite(tax) || tax <= 0 || totalAmount <= 0) {
    return 0;
  }
  return Math.min(tax, totalAmount);
}

/**
 * Computes dashboard revenue, collected tax, COGS, profit, and margin.
 * Credit sales are recognized on a cash basis as client payments (abonos) arrive,
 * with proportional cost and tax deductions derived from the underlying credit sales.
 */
export function computeDashboardMetrics(params: {
  sales: SaleMetricInput[];
  saleItems: SaleItemMetricInput[];
  payments: PaymentMetricInput[];
  products: ProductMetricInput[];
  creditSales?: SaleMetricInput[];
  creditSaleItems?: SaleItemMetricInput[];
}): DashboardMetrics {
  const {
    sales,
    saleItems,
    payments,
    products,
    creditSales = [],
    creditSaleItems = [],
  } = params;

  const productMap: Record<string, ProductMetricInput> = {};
  for (const product of products) {
    productMap[product.id] = product;
  }

  let rawRevenue = 0;
  let pendingCredit = 0;
  let cashFromSales = 0;
  let cardSales = 0;
  let transferSales = 0;
  let taxOfPaidSales = 0;

  const paidSaleIds = new Set<string>();
  const creditSaleById = new Map<string, SaleMetricInput>();

  for (const sale of sales) {
    const amt = Number(sale.total_amount) || 0;
    rawRevenue += amt;

    if (sale.payment_method === 'credito') {
      pendingCredit += amt;
      creditSaleById.set(sale.id, sale);
    } else {
      paidSaleIds.add(sale.id);
      if (sale.payment_method === 'mixto' && sale.payment_details) {
        cashFromSales += Number(sale.payment_details.cash) || 0;
        cardSales += Number(sale.payment_details.card) || 0;
        transferSales += Number(sale.payment_details.transfer) || 0;
      } else if (sale.payment_method === 'cash') {
        cashFromSales += amt;
      } else if (sale.payment_method === 'card') {
        cardSales += amt;
      } else if (sale.payment_method === 'transfer') {
        transferSales += amt;
      }
      taxOfPaidSales += clampTax(sale.tax_amount, amt);
    }
  }

  for (const creditSale of creditSales) {
    creditSaleById.set(creditSale.id, creditSale);
  }

  let costOfPaidSales = 0;
  const missingCostProductIds = new Set<string>();

  for (const item of saleItems) {
    if (!paidSaleIds.has(item.sale_id)) continue;

    const qty = Number(item.quantity) || 0;
    const unitCost = resolveItemUnitCost(item, productMap);
    if (qty > 0 && unitCost <= 0 && item.product_id) {
      missingCostProductIds.add(item.product_id);
    }
    costOfPaidSales += unitCost * qty;
  }

  // Group credit sale items without double-counting sales present in both
  // the current period's `saleItems` and `creditSaleItems`.
  const creditItemsBySaleId = new Map<string, SaleItemMetricInput[]>();
  const saleIdsWithDedicatedCreditItems = new Set<string>();

  for (const item of creditSaleItems) {
    saleIdsWithDedicatedCreditItems.add(item.sale_id);
    const list = creditItemsBySaleId.get(item.sale_id);
    if (list) {
      list.push(item);
    } else {
      creditItemsBySaleId.set(item.sale_id, [item]);
    }
  }

  for (const item of saleItems) {
    if (!creditSaleById.has(item.sale_id) || saleIdsWithDedicatedCreditItems.has(item.sale_id)) {
      continue;
    }
    const list = creditItemsBySaleId.get(item.sale_id);
    if (list) {
      list.push(item);
    } else {
      creditItemsBySaleId.set(item.sale_id, [item]);
    }
  }

  const saleRatiosById = new Map<string, RatioEntry>();
  const saleMissingCostProducts = new Map<string, Set<string>>();
  const clientTotalsById = new Map<string, ClientTotalEntry>();

  for (const [saleId, creditSale] of creditSaleById) {
    const saleTotal = Number(creditSale.total_amount) || 0;
    const saleTax = clampTax(creditSale.tax_amount, saleTotal);
    const items = creditItemsBySaleId.get(saleId) ?? [];

    let saleCost = 0;
    const missingForSale = new Set<string>();
    for (const item of items) {
      const qty = Number(item.quantity) || 0;
      const unitCost = resolveItemUnitCost(item, productMap);
      if (qty > 0 && unitCost <= 0 && item.product_id) {
        missingForSale.add(item.product_id);
      }
      saleCost += unitCost * qty;
    }
    saleMissingCostProducts.set(saleId, missingForSale);

    if (saleTotal > 0) {
      saleRatiosById.set(saleId, {
        costRatio: saleCost / saleTotal,
        taxRatio: saleTax / saleTotal,
      });

      if (creditSale.client_id) {
        const existing = clientTotalsById.get(creditSale.client_id);
        if (existing) {
          existing.totalAmount += saleTotal;
          existing.totalCost += saleCost;
          existing.totalTax += saleTax;
          for (const pid of missingForSale) {
            existing.missingProductIds.add(pid);
          }
        } else {
          clientTotalsById.set(creditSale.client_id, {
            totalAmount: saleTotal,
            totalCost: saleCost,
            totalTax: saleTax,
            missingProductIds: new Set(missingForSale),
          });
        }
      }
    }
  }

  const clientRatiosById = new Map<string, RatioEntry>();
  for (const [clientId, totals] of clientTotalsById) {
    if (totals.totalAmount > 0) {
      clientRatiosById.set(clientId, {
        costRatio: totals.totalCost / totals.totalAmount,
        taxRatio: totals.totalTax / totals.totalAmount,
      });
    }
  }

  let cashAbonos = 0;
  let cardAbonos = 0;
  let transferAbonos = 0;
  let costOfAbonos = 0;
  let taxOfAbonos = 0;

  for (const payment of payments) {
    const amt = Number(payment.amount) || 0;
    if (payment.payment_method === 'cash') {
      cashAbonos += amt;
    } else if (payment.payment_method === 'card') {
      cardAbonos += amt;
    } else if (payment.payment_method === 'transfer') {
      transferAbonos += amt;
    }

    let ratio: RatioEntry = { costRatio: 0, taxRatio: 0 };
    if (payment.sale_id && saleRatiosById.has(payment.sale_id)) {
      ratio = saleRatiosById.get(payment.sale_id)!;
      const missingForSale = saleMissingCostProducts.get(payment.sale_id);
      if (missingForSale) {
        for (const pid of missingForSale) {
          missingCostProductIds.add(pid);
        }
      }
    } else if (payment.client_id && clientRatiosById.has(payment.client_id)) {
      ratio = clientRatiosById.get(payment.client_id)!;
      const clientMissing = clientTotalsById.get(payment.client_id)?.missingProductIds;
      if (clientMissing) {
        for (const pid of clientMissing) {
          missingCostProductIds.add(pid);
        }
      }
    }

    costOfAbonos += amt * ratio.costRatio;
    taxOfAbonos += amt * ratio.taxRatio;
  }

  const totalAbonos = cashAbonos + cardAbonos + transferAbonos;
  const receivedMoney = cashFromSales + cashAbonos;
  const cardRevenue = cardSales + cardAbonos;
  const transferRevenue = transferSales + transferAbonos;
  const bsRevenue = cardRevenue + transferRevenue;
  const effectiveRevenue = (rawRevenue - pendingCredit) + totalAbonos;
  const totalTax = taxOfPaidSales + taxOfAbonos;
  const totalCost = costOfPaidSales + costOfAbonos;
  const netRevenue = effectiveRevenue - totalTax;
  const profit = netRevenue - totalCost;
  const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;

  return {
    revenue: effectiveRevenue,
    netRevenue,
    tax: totalTax,
    cost: totalCost,
    profit,
    pendingCredit,
    receivedMoney,
    cardRevenue,
    transferRevenue,
    bsRevenue,
    margin,
    missingCostProductCount: missingCostProductIds.size,
  };
}
