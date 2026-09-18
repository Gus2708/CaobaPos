import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '../hooks/useHeaderInsets';
import { useDeviceSize } from '../hooks/useDeviceSize';
import { Text } from '../components/Text';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';
import { tokens } from '../lib/designTokens';
import { generateReport } from '../lib/pdfReportGenerator';
import { useToast } from '../components/Toast';
import { DashboardSkeleton } from '../components/DashboardSkeleton';
import AnimatedReanimated, { FadeIn, Easing as ReanimatedEasing, useReducedMotion } from 'react-native-reanimated';
import { PeriodSelector, DashboardPeriod } from '../components/PeriodSelector';
import { PaymentDetailsModal } from '../components/PaymentDetailsModal';
import { scale, verticalScale } from '../lib/responsive';
import { formatUsd } from '../lib/money';
import { CustomDateRangeModal } from '../components/CustomDateRangeModal';
import { globalScrollY } from '../store/uiStore';
import { isDemoActive, useDemoStore } from '../store/demoStore';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  iva_enabled?: boolean;
  tax_amount?: number;
  client_id?: string;
}

interface SaleItem {
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
}

interface ClientPayment {
  id: string;
  client_id: string;
  amount: number;
  created_at: string;
  payment_method: string;
}

interface Product {
  id: string;
  name: string;
  cost: number;
  price: number;
  stock_quantity: number;
}

export const DashboardPanel = React.memo(function DashboardPanel() {
  const [period, setPeriod] = useState<DashboardPeriod>('dia');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const { width } = useDeviceSize();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const HEADER_HEIGHT = useHeaderHeight();
  const TOTAL_NAV_HEIGHT = HEADER_HEIGHT;

  const { today, weekAgo, monthAgo, defaultStart } = useMemo(() => {
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const w = new Date(); w.setDate(w.getDate() - 7); w.setHours(0, 0, 0, 0);
    const m = new Date(); m.setMonth(m.getMonth() - 1); m.setHours(0, 0, 0, 0);
    const dStart = new Date(); dStart.setDate(dStart.getDate() - 30); dStart.setHours(0, 0, 0, 0);
    return {
      today: t.toISOString(),
      weekAgo: w.toISOString(),
      monthAgo: m.toISOString(),
      defaultStart: dStart.toISOString()
    };
  }, []);

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(new Date().toISOString());

  const limitDate = useMemo(() => {
    if (period === 'dia') return today;
    if (period === 'semana') return weekAgo;
    if (period === 'mes') return monthAgo;
    return null;
  }, [period, today, weekAgo, monthAgo]);

  const dateRange = useMemo(() => {
    if (period === 'personalizado') {
      return { start: startDate, end: endDate };
    }
    return { start: limitDate, end: null };
  }, [period, limitDate, startDate, endDate]);

  const isDemoMode = useDemoStore((s) => s.isDemoMode);

  const { data: sales, isLoading: loadingSales } = useQuery<Sale[]>({
    queryKey: ['dashboard', 'sales', period, dateRange, isDemoMode],
    queryFn: async () => {
      if (isDemoActive()) {
        const state = useDemoStore.getState();
        let list = [...state.demoSales];
        if (period === 'personalizado') {
          if (dateRange.start) list = list.filter(s => s.created_at >= dateRange.start!);
          if (dateRange.end) list = list.filter(s => s.created_at <= dateRange.end!);
        } else if (dateRange.start) {
          list = list.filter(s => s.created_at >= dateRange.start!);
        }
        return list;
      }
      let query = supabase.from('sales').select('*');
      if (period === 'personalizado') {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      } else if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: saleItems } = useQuery<SaleItem[]>({
    queryKey: ['dashboard', 'sale_items', period, dateRange, isDemoMode],
    queryFn: async () => {
      if (isDemoActive()) {
        // Resolve sale ids from the store (not from the `sales` closure) so a refetch
        // triggered right after a new demo sale cannot read a stale sales list.
        const state = useDemoStore.getState();
        const inRange = state.demoSales.filter(s => {
          if (dateRange.start && s.created_at < dateRange.start) return false;
          if (period === 'personalizado' && dateRange.end && s.created_at > dateRange.end) return false;
          return true;
        });
        const currentSaleIds = new Set(inRange.map(s => s.id));
        return state.demoSaleItems.filter(i => currentSaleIds.has(i.sale_id));
      }
      // PostgREST does not support dot-notation filters on joined tables via .gte().
      // Instead fetch sale_ids from the already-loaded sales and query items by those IDs.
      // This avoids a broken cross-table filter that silently returns all rows.
      let salesQuery = supabase.from('sales').select('id');
      if (period === 'personalizado') {
        salesQuery = salesQuery.gte('created_at', dateRange.start!).lte('created_at', dateRange.end!);
      } else if (dateRange.start) {
        salesQuery = salesQuery.gte('created_at', dateRange.start);
      }
      const { data: salesData, error: salesError } = await salesQuery;
      if (salesError) throw salesError;

      const saleIds = (salesData ?? []).map(s => s.id);
      if (saleIds.length === 0) return [];

      const { data, error } = await supabase
        .from('sale_items')
        .select('sale_id, product_id, quantity, unit_price, unit_cost, subtotal')
        .in('sale_id', saleIds);

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!sales, // wait until the sales query has resolved
  });

  const { data: allPayments } = useQuery<ClientPayment[]>({
    queryKey: ['dashboard', 'client_payments', period, dateRange, isDemoMode],
    queryFn: async () => {
      if (isDemoActive()) {
        const state = useDemoStore.getState();
        let list = [...state.demoPayments];
        if (period === 'personalizado') {
          if (dateRange.start) list = list.filter(p => p.created_at >= dateRange.start!);
          if (dateRange.end) list = list.filter(p => p.created_at <= dateRange.end!);
        } else if (dateRange.start) {
          list = list.filter(p => p.created_at >= dateRange.start!);
        }
        return list;
      }
      let query = supabase.from('client_payments').select('*');
      if (period === 'personalizado') {
        query = query.gte('created_at', dateRange.start).lte('created_at', dateRange.end);
      } else if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['dashboard', 'products', isDemoMode],
    queryFn: async () => {
      if (isDemoActive()) {
        return useDemoStore.getState().demoProducts;
      }
      const { data, error } = await supabase
        .from('products')
        .select('id, name, cost, price, stock_quantity');
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredSales = useMemo(() => sales ?? [], [sales]);

  const periodLabel = useMemo(() => {
    if (period === 'dia') return 'Hoy';
    if (period === 'semana') return 'Esta Semana';
    if (period === 'mes') return 'Este Mes';
    if (period === 'personalizado') {
      const d1 = new Date(startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      const d2 = new Date(endDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
      return `${d1} - ${d2}`;
    }
    return '';
  }, [period, startDate, endDate]);

  const pdfTitleLabel = useMemo(() => {
    if (period === 'dia') return 'Resumen Financiero Diario';
    if (period === 'semana') return 'Resumen Financiero Semanal';
    if (period === 'mes') return 'Resumen Financiero Mensual';
    return `Resumen Financiero (${periodLabel})`;
  }, [period, periodLabel]);

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    (products ?? []).forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  const currentMetrics = useMemo(() => {
    const saleList = filteredSales;
    const paymentList = allPayments ?? [];
    const saleIds = new Set(saleList.map(s => s.id));
    const items = saleItems ?? [];

    let rawRevenue = 0;
    let pendingCredit = 0;
    let cashFromSales = 0;
    let electronicSales = 0;

    saleList.forEach(s => {
      const amt = Number(s.total_amount) || 0;
      rawRevenue += amt;
      if (s.payment_method === 'credito') {
        pendingCredit += amt;
      } else if (s.payment_method === 'cash') {
        cashFromSales += amt;
      } else if (s.payment_method === 'card' || s.payment_method === 'transfer') {
        electronicSales += amt;
      }
    });

    let cashAbonos = 0;
    let electronicAbonos = 0;
    paymentList.forEach(p => {
      const amt = Number(p.amount) || 0;
      if (p.payment_method === 'cash') {
        cashAbonos += amt;
      } else {
        electronicAbonos += amt;
      }
    });

    const totalAbonos = cashAbonos + electronicAbonos;
    const receivedMoney = cashFromSales + cashAbonos;
    const bsRevenue = electronicSales + electronicAbonos;
    const effectiveRevenue = (rawRevenue - pendingCredit) + totalAbonos;

    const saleMap = new Map(saleList.map(s => [s.id, s]));

    let costOfPaidSales = 0;
    items.forEach(item => {
      if (saleIds.has(item.sale_id)) {
        const sale = saleMap.get(item.sale_id);
        if (sale && sale.payment_method !== 'credito') {
          const itemCost = item.unit_cost !== undefined ? Number(item.unit_cost) : (productMap[item.product_id]?.cost || 0);
          costOfPaidSales += (itemCost * item.quantity);
        }
      }
    });

    const profit = (rawRevenue - pendingCredit - costOfPaidSales) + totalAbonos;
    const margin = effectiveRevenue > 0 ? (profit / effectiveRevenue) * 100 : 0;

    return {
      revenue: effectiveRevenue,
      cost: costOfPaidSales,
      profit,
      pendingCredit,
      receivedMoney,
      bsRevenue,
      margin
    };
  }, [filteredSales, allPayments, saleItems, productMap]);

  const { showToast } = useToast();

  const handleDownloadPDF = async () => {
    try {
      if (filteredSales.length === 0) {
        showToast(`No hay ventas en este periodo para generar el reporte`, 'warning');
        return;
      }
      await generateReport(filteredSales, currentMetrics, pdfTitleLabel);
      showToast('Reporte generado con éxito', 'success');
    } catch (error) {
      showToast('Error al generar el PDF', 'error');
      console.error(error);
    }
  };

  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, number> = { cash: 0, card: 0, transfer: 0, credito: 0 };
    filteredSales.forEach(s => {
      if (counts[s.payment_method] !== undefined) {
        counts[s.payment_method]++;
      }
    });
    return counts;
  }, [filteredSales]);

  const paymentMethods = [
    { key: 'cash', label: 'Efectivo', count: paymentBreakdown.cash },
    { key: 'card', label: 'Tarjeta', count: paymentBreakdown.card },
    { key: 'transfer', label: 'Transferencia', count: paymentBreakdown.transfer },
    { key: 'credito', label: 'Crédito', count: paymentBreakdown.credito },
  ];

  const lowStock = useMemo(
    () => (products ?? []).filter((p) => p.stock_quantity < 10).slice(0, 5),
    [products]
  );

  const topProducts = useMemo(() => {
    if (!saleItems || !products) return [];
    const validSaleIds = new Set(filteredSales.map(s => s.id));
    const sums: Record<string, number> = {};
    saleItems.forEach((it) => {
      if (validSaleIds.has(it.sale_id)) {
        sums[it.product_id] = (sums[it.product_id] ?? 0) + it.quantity;
      }
    });
    return Object.entries(sums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, qty]) => ({
        name: products.find((p) => p.id === id)?.name ?? 'Desconocido',
        qty,
      }));
  }, [saleItems, products, filteredSales]);

  const reducedMotion = useReducedMotion();

  // Show high-fidelity 1-to-1 structural skeleton while any core query is loading
  const isLoading = loadingSales || !saleItems || !products;
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <AnimatedReanimated.View
      style={{ flex: 1 }}
      entering={reducedMotion ? undefined : FadeIn.duration(350).easing(ReanimatedEasing.bezier(0.23, 1, 0.32, 1))}
    >
      <View style={styles.container}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.bg }]} />

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: globalScrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: TOTAL_NAV_HEIGHT + verticalScale(12),
              paddingBottom: verticalScale(100) + insets.bottom
            }
          ]}
        >

        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Dashboard</Text>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleDownloadPDF}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Descargar reporte PDF del periodo actual"
          >
            <Icon name="file-pdf" size={16} color={tokens.colors.mahogany} />
            <Text style={styles.downloadBtnText} numberOfLines={1}>Reporte PDF</Text>
          </TouchableOpacity>
        </View>

        <PeriodSelector
          selected={period}
          onSelect={(p) => {
            if (p === 'personalizado') {
              setCustomModalVisible(true);
            } else {
              setPeriod(p);
            }
          }}
        />

        <View style={styles.moneySummary}>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>Ganancia</Text>
            <Text
              style={[styles.heroValue, currentMetrics.profit < 0 && styles.heroValueLoss]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatUsd(currentMetrics.profit)}
            </Text>
            <Text style={styles.heroCaption}>
              {`Margen ${currentMetrics.margin.toFixed(1).replace('.', ',')}% · ${filteredSales.length} ${filteredSales.length === 1 ? 'venta' : 'ventas'}`}
            </Text>
          </View>

          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel} numberOfLines={1}>Vendido (con IVA)</Text>
            <Text style={styles.moneyValue} numberOfLines={1}>{formatUsd(currentMetrics.revenue)}</Text>
          </View>

          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel} numberOfLines={1}>Efectivo en caja</Text>
            <Text style={styles.moneyValue} numberOfLines={1}>{formatUsd(currentMetrics.receivedMoney)}</Text>
          </View>

          <View style={styles.moneyRow}>
            <View>
              <Text style={styles.moneyLabel} numberOfLines={1}>Cobrado por banco</Text>
              <Text style={styles.moneyCaption} numberOfLines={1}>Tarjeta y transferencia</Text>
            </View>
            <Text style={styles.moneyValue} numberOfLines={1}>{formatUsd(currentMetrics.bsRevenue)}</Text>
          </View>

          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel} numberOfLines={1}>Crédito pendiente</Text>
            <Text style={[styles.moneyValue, { color: tokens.colors.coral }]} numberOfLines={1}>
              {formatUsd(currentMetrics.pendingCredit)}
            </Text>
          </View>

          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel} numberOfLines={1}>Costos</Text>
            <Text style={[styles.moneyValue, { color: tokens.colors.textMuted }]} numberOfLines={1}>
              -{formatUsd(currentMetrics.cost)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Métodos de pago</Text>
          <View style={styles.sectionCard}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
            {paymentMethods.map((m) => (
              <TouchableOpacity
                key={m.key}
                style={styles.paymentRow}
                onPress={() => { setSelectedMethod(m.key); setMethodModalVisible(true); }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Ver ventas con ${m.label}: ${m.count}`}
              >
                <Text style={styles.paymentLabel}>{m.label}</Text>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentCount}>{m.count}</Text>
                  <Icon name="chevron-right" size={18} color={tokens.colors.textDim} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top productos</Text>
          <View style={styles.sectionCard}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
            {topProducts.length === 0 ? (
              <Text style={styles.empty}>Sin datos</Text>
            ) : (
              topProducts.map((p, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <Text style={styles.rankText}>{i + 1}</Text>
                    <Text style={styles.listText}>{p.name}</Text>
                  </View>
                  <Text style={styles.listValue}>{p.qty} uds</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {lowStock.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: tokens.colors.coral }]}>Stock bajo</Text>
            <View style={styles.sectionCard}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
              {lowStock.map((p, i) => (
                <View key={i} style={styles.listItem}>
                  <Text style={[styles.listText, { color: tokens.colors.coral }]}>{p.name}</Text>
                  <Text style={[styles.listValue, { color: tokens.colors.coral }]}>{p.stock_quantity} uds</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <PaymentDetailsModal
          visible={methodModalVisible}
          onClose={() => setMethodModalVisible(false)}
          method={selectedMethod}
          periodLabel={periodLabel}
          sales={filteredSales.filter(s => s.payment_method === selectedMethod)}
          payments={(allPayments ?? []).filter(p => p.payment_method === selectedMethod)}
        />

        <CustomDateRangeModal
          visible={customModalVisible}
          onClose={() => setCustomModalVisible(false)}
          initialStartDate={startDate}
          initialEndDate={endDate}
          onConfirm={(s, e) => {
            setStartDate(s);
            setEndDate(e);
            setPeriod('personalizado');
            setCustomModalVisible(false);
          }}
        />
      </Animated.ScrollView>
      </View>
    </AnimatedReanimated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  content: {
    padding: scale(16),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
    gap: scale(8),
  },
  title: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography['4xl'],
    color: tokens.colors.text,
    fontWeight: '800',
    flexShrink: 1,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingVertical: verticalScale(6),
    flexShrink: 0,
  },
  downloadBtnText: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.sm,
    fontWeight: '700',
    color: tokens.colors.mahogany,
  },
  moneySummary: {
    marginTop: verticalScale(12),
  },
  hero: {
    alignItems: 'center',
    paddingVertical: verticalScale(20),
    gap: verticalScale(6),
  },
  heroLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.sm,
    fontWeight: '800',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography['4xl'],
    fontWeight: '800',
    color: tokens.colors.sage,
  },
  // A losing period must not read as green.
  heroValueLoss: {
    color: tokens.colors.coral,
  },
  heroCaption: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.sm,
    fontWeight: '600',
    color: tokens.colors.textMuted,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
    gap: scale(8),
  },
  moneyLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.base,
    fontWeight: '600',
    color: tokens.colors.textMuted,
  },
  moneyCaption: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.sm,
    fontWeight: '600',
    color: tokens.colors.textDim,
    marginTop: verticalScale(2),
  },
  moneyValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography.base,
    fontWeight: '800',
    color: tokens.colors.text,
    textAlign: 'right',
  },
  section: {
    marginTop: verticalScale(24),
  },
  sectionTitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.lg,
    color: tokens.colors.text,
    fontWeight: '800',
    marginBottom: tokens.spacing.lg,
  },
  sectionCard: {
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius,
    padding: tokens.spacing.lg,
    borderWidth: tokens.styles.liquidCard.borderWidth,
    borderColor: tokens.styles.liquidCard.borderColor,
    overflow: 'hidden',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: scale(44),
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
    gap: scale(8),
  },
  paymentLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.base,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  paymentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  paymentCount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography.base,
    fontWeight: '800',
    color: tokens.colors.textMuted,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
    flexWrap: 'nowrap',
    gap: scale(8),
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    flex: 1,
  },
  rankText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: tokens.typography.base,
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  listText: {
    fontFamily: FontNames.parkinsans,
    color: tokens.colors.text,
    fontSize: tokens.typography.base,
    fontWeight: '600',
    flex: 1,
  },
  listValue: {
    fontFamily: FontNames.jetBrainsMono,
    color: tokens.colors.text,
    fontSize: tokens.typography.base,
    fontWeight: '800',
  },
  empty: {
    color: tokens.colors.textMuted,
    fontFamily: FontNames.parkinsans,
    fontSize: tokens.typography.base,
    textAlign: 'center',
    marginVertical: verticalScale(24),
    fontWeight: '600',
  },
});
