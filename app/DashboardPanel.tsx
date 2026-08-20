import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Animated, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { CustomDateRangeModal } from '../components/CustomDateRangeModal';
import { GlassCard } from '../components/GlassCard';
import { globalScrollY } from '../store/uiStore';
import { BrandMark } from '../components/BrandMark';

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

interface StatCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'profit';
  icon: string;
  subtitle?: string;
  onPress?: () => void;
  style?: any;
}

const StatCard = React.memo(function StatCard({ label, value, variant = 'default', icon, subtitle, onPress, style }: StatCardProps) {
  const bgColors = {
    default: { surface: tokens.colors.surface, accent: tokens.colors.mahogany },
    accent: { surface: tokens.colors.surface, accent: tokens.colors.mahogany },
    success: { surface: tokens.colors.surface, accent: tokens.colors.sage },
    warning: { surface: tokens.colors.surface, accent: tokens.colors.coral },
    profit: { surface: tokens.colors.surface, accent: tokens.colors.sage },
  };
  const c = bgColors[variant];

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container 
      style={[styles.statCard, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={onPress ? `Ver detalles de ${label}: ${value}` : `${label}: ${value}`}
    >
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
      <View style={styles.statContent}>
        <View style={[styles.statIconCircle, { backgroundColor: tokens.colors.bg, borderColor: tokens.colors.borderLight }]}>
          <Icon name={icon} size={20} color={c.accent} />
        </View>
        <View style={styles.statInfo}>
          <Text style={styles.statLabel} numberOfLines={2} adjustsFontSizeToFit>{label}</Text>
          <Text 
            style={styles.statValue} 
            numberOfLines={1} 
            adjustsFontSizeToFit 
            minimumFontScale={0.7}
          >
            {value}
          </Text>
          {subtitle && (
            <Text style={styles.statSubtitle} numberOfLines={2}>{subtitle}</Text>
          )}
        </View>
        {onPress && (
          <View style={styles.statChevron}>
            <Icon name="chevron-right" size={22} color={tokens.colors.textDim} />
          </View>
        )}
      </View>
    </Container>
  );
});

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
};

export const DashboardPanel = React.memo(function DashboardPanel() {
  const [period, setPeriod] = useState<DashboardPeriod>('dia');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;
  const HEADER_HEIGHT = verticalScale(50) + insets.top;
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

  const { data: sales, isLoading: loadingSales } = useQuery<Sale[]>({
    queryKey: ['dashboard', 'sales', period, dateRange],
    queryFn: async () => {
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
    queryKey: ['dashboard', 'sale_items', period, dateRange],
    queryFn: async () => {
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
    queryKey: ['dashboard', 'client_payments', period, dateRange],
    queryFn: async () => {
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
    queryKey: ['dashboard', 'products'],
    queryFn: async () => {
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
          <View style={styles.headerTitleRow}>
            <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Dashboard</Text>
            <View style={styles.headerBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.headerBadgeText}>Live</Text>
            </View>
          </View>
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

        <View style={styles.statsGrid}>
          <StatCard 
            label={`Ventas (${periodLabel})`} 
            value={`${filteredSales.length}`} 
            variant="accent"
            icon="receipt"
          />
          <StatCard 
            label={`Ganancia (${periodLabel})`} 
            value={`$${currentMetrics.profit.toFixed(2)}`}
            variant="profit"
            icon="trending-up"
            subtitle={`Margen: ${currentMetrics.margin.toFixed(1)}%`}
          />
        </View>

        <View style={styles.statsGrid}>
          <StatCard 
            label={`Venta en BS (${periodLabel})`} 
            value={`$${currentMetrics.bsRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
            variant="default"
            icon="mobile-alt"
            subtitle="Ventas y Abonos (T/T)"
          />
          <StatCard 
            label={`Caja Real (${periodLabel})`} 
            value={`$${currentMetrics.receivedMoney.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
            variant="success"
            icon="money-bill"
            subtitle="Ventas y Abonos (Efectivo)"
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: tokens.colors.mahoganyDim, borderColor: tokens.colors.mahoganyDim }]}>
              <Icon name="balance-scale" size={20} color={tokens.colors.mahogany} />
            </View>
            <Text style={styles.sectionTitle}>Balance Financiero</Text>
          </View>

          <View style={styles.financialGrid}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
            <BrandMark motif="espiral" style={styles.cardWatermarkEspiral} />
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Total Facturado (con IVA)</Text>
              <Text style={styles.financialValue}>${(currentMetrics.revenue ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.financialItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <Text style={styles.financialLabel}>Efectivo (USD)</Text>
                <View style={[styles.receivedBadge, { backgroundColor: tokens.colors.sageDim, borderColor: tokens.colors.borderLight }]}>
                  <Text style={[styles.receivedBadgeText, { color: tokens.colors.sage }]}>Caja</Text>
                </View>
              </View>
              <Text style={styles.financialValueReceived}>${(currentMetrics.receivedMoney ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.financialItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                <Text style={styles.financialLabel}>Tarjeta / Transferencia (BS)</Text>
                <View style={[styles.receivedBadge, { backgroundColor: tokens.colors.mahoganyDim, borderColor: tokens.colors.borderLight }]}>
                  <Text style={[styles.receivedBadgeText, { color: tokens.colors.mahogany }]}>Banco</Text>
                </View>
              </View>
              <Text style={styles.financialValue}>${(currentMetrics.bsRevenue ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Crédito Pendiente</Text>
              <Text style={styles.financialValuePending}>${(currentMetrics.pendingCredit ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.financialItem}>
              <Text style={styles.financialLabel}>Costos Totales</Text>
              <Text style={styles.financialValueCost}>-${(currentMetrics.cost ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={[styles.financialItem, styles.financialItemHighlight]}>
              <Text style={styles.financialLabelHighlight}>Ganancia Estimada</Text>
              <Text style={styles.financialValueProfit}>${(currentMetrics.profit ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
             <View style={[styles.sectionIcon, { backgroundColor: tokens.colors.mahoganyDim, borderColor: tokens.colors.mahoganyDim }]}>
              <Icon name="credit-card" size={20} color={tokens.colors.mahogany} />
            </View>
            <Text style={styles.sectionTitle}>Métodos de Pago</Text>
          </View>
          <View style={styles.statsGrid}>
            <StatCard 
              label="Efectivo"
              value={paymentBreakdown.cash.toString()}
              icon="money-bill"
              onPress={() => { setSelectedMethod('cash'); setMethodModalVisible(true); }}
            />
            <StatCard 
              label="Tarjeta"
              value={paymentBreakdown.card.toString()}
              icon="credit-card"
              onPress={() => { setSelectedMethod('card'); setMethodModalVisible(true); }}
            />
          </View>
          <View style={styles.statsGrid}>
            <StatCard 
              label="Transf."
              value={paymentBreakdown.transfer.toString()}
              icon="mobile-alt"
              onPress={() => { setSelectedMethod('transfer'); setMethodModalVisible(true); }}
            />
            <StatCard 
              label="Créditos"
              value={paymentBreakdown.credito.toString()}
              icon="user"
              onPress={() => { setSelectedMethod('credito'); setMethodModalVisible(true); }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
             <View style={[styles.sectionIcon, { backgroundColor: tokens.colors.mahoganyDim, borderColor: tokens.colors.mahoganyDim }]}>
              <Icon name="shopping-bag" size={20} color={tokens.colors.mahogany} />
            </View>
            <Text style={styles.sectionTitle}>Top Productos</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
            {topProducts.length === 0 ? (
              <Text style={styles.empty}>Sin datos</Text>
            ) : (
              topProducts.map((p, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>{i + 1}</Text>
                    </View>
                    <Text style={styles.listText}>{p.name}</Text>
                  </View>
                  <View style={styles.listValueContainer}>
                    <Text style={styles.listValue}>{p.qty} uds</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {lowStock.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
               <View style={[styles.sectionIcon, { backgroundColor: tokens.colors.coralDim, borderColor: tokens.colors.coralDim }]}>
                <Icon name="exclamation-triangle" size={20} color={tokens.colors.coral} />
              </View>
              <Text style={[styles.sectionTitle, { color: tokens.colors.coral }]}>Stock Bajo</Text>
            </View>
            <View style={styles.sectionCard}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
              {lowStock.map((p, i) => (
                <View key={i} style={styles.listItem}>
                  <View style={styles.listItemLeft}>
                     <View style={[styles.rankBadge, { backgroundColor: tokens.colors.coralDim }]}>
                      <Icon name="box" size={16} color="#C96B6B" />
                    </View>
                    <Text style={styles.listText}>{p.name}</Text>
                  </View>
                  <View style={[styles.listValueContainer, { backgroundColor: tokens.colors.bg }]}>
                    <Text style={[styles.listValue, { color: '#C96B6B' }]}>
                      {p.stock_quantity} uds
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
             <View style={[styles.sectionIcon, { backgroundColor: tokens.colors.mahoganyDim, borderColor: tokens.colors.mahoganyDim }]}>
              <Icon name="history" size={20} color={tokens.colors.mahogany} />
            </View>
            <Text style={styles.sectionTitle}>Ventas Recientes</Text>
          </View>
          <View style={styles.sectionCard}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: tokens.colors.surface }]} />
            {(sales ?? []).slice(0, 10).map((sale) => (
              <View key={sale.id} style={styles.saleItem}>
                <View style={styles.saleLeft}>
                  <Text style={styles.saleAmount}>${Number(sale.total_amount ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Text>
                  <View style={styles.paymentBadge}>
                    <Text style={styles.saleMethod}>{sale.payment_method}</Text>
                  </View>
                </View>
                <View style={styles.saleRight}>
                  <Text style={styles.saleDate}>{formatDate(sale.created_at)}</Text>
                  <Text style={styles.saleTime}>{formatTime(sale.created_at)}</Text>
                </View>
              </View>
            ))}
            {(filteredSales ?? []).length === 0 && (
              <Text style={styles.empty}>Sin ventas registradas</Text>
            )}
          </View>
        </View>

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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: verticalScale(12),
  },
  loadingText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
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
    fontSize: moderateScale(22), 
    color: tokens.colors.text, 
    fontWeight: '800',
    flexShrink: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flex: 1,
    minWidth: 0,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    flexShrink: 0,
  },
  downloadBtnText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: tokens.colors.mahogany,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.sageDim,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
    gap: scale(6),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: tokens.colors.sage,
  },
  headerBadgeText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: tokens.colors.sage,
    textTransform: 'uppercase',
  },
  statsGrid: { 
    flexDirection: 'row', 
    marginBottom: verticalScale(12), 
    gap: scale(12) 
  },
  statCard: { 
    flex: 1, 
    padding: scale(12),
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius, 
    borderWidth: tokens.styles.liquidCard.borderWidth, 
    borderColor: tokens.styles.liquidCard.borderColor,
    justifyContent: 'center',
    minHeight: verticalScale(90),
    overflow: 'hidden',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statIconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: { 
    fontFamily: FontNames.parkinsans, 
    color: tokens.colors.textMuted, 
    fontSize: moderateScale(11), 
    fontWeight: '800',
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
    marginBottom: verticalScale(2),
  },
  statValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(20), 
    fontWeight: '800',
    color: tokens.colors.text,
    lineHeight: moderateScale(24),
  },
  statSubtitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: tokens.colors.textMuted,
    lineHeight: moderateScale(14),
    marginTop: verticalScale(4),
  },
  subtitleContainer: {
    marginTop: verticalScale(4),
    backgroundColor: tokens.colors.bg,
    paddingHorizontal: scale(4),
    paddingVertical: verticalScale(1),
    borderRadius: scale(4),
    alignSelf: 'stretch',
  },
  statChevron: {
    marginLeft: scale(4),
  },
  section: { 
    marginTop: verticalScale(24),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  sectionIcon: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  sectionTitle: { 
    fontFamily: FontNames.parkinsans, 
    fontSize: moderateScale(16), 
    color: tokens.colors.text, 
    fontWeight: '800',
  },
  sectionCard: { 
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius, 
    padding: tokens.spacing.lg,
    borderWidth: tokens.styles.liquidCard.borderWidth, 
    borderColor: tokens.styles.liquidCard.borderColor,
    overflow: 'hidden',
  },
  financialGrid: {
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius,
    padding: scale(16),
    borderWidth: tokens.styles.liquidCard.borderWidth,
    borderColor: tokens.styles.liquidCard.borderColor,
    gap: verticalScale(14),
    overflow: 'hidden',
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.glass.border,
    flexWrap: 'wrap',
    gap: scale(4),
  },
  financialItemHighlight: {
    backgroundColor: tokens.colors.surface,
    marginHorizontal: scale(-16),
    marginBottom: verticalScale(-16),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 0,
    borderBottomLeftRadius: tokens.radius.xl,
    borderBottomRightRadius: tokens.radius.xl,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderLight,
  },
  financialLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textMuted,
    flexShrink: 1,
  },
  financialLabelHighlight: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.sage,
  },
  financialValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.text,
    lineHeight: moderateScale(20),
  },
  financialValueCost: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.coral,
  },
  financialValueProfit: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: tokens.colors.sage,
  },
  financialValueReceived: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  financialValuePending: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.amber,
    lineHeight: moderateScale(20),
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  receivedBadge: {
    backgroundColor: tokens.colors.sageDim,
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  receivedBadgeText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(9),
    fontWeight: '800',
    color: tokens.colors.sage,
    textTransform: 'uppercase',
  },
  listItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1, 
    borderBottomColor: tokens.colors.borderLight,
    flexWrap: 'wrap',
    gap: scale(8),
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    flex: 1,
  },
  rankBadge: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  rankText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  listText: { 
    fontFamily: FontNames.parkinsans, 
    color: tokens.colors.text, 
    fontSize: moderateScale(14),
    fontWeight: '600',
    flex: 1,
  },
  listValueContainer: {
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  listValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.mahogany, 
    fontSize: moderateScale(13), 
    fontWeight: '800',
  },
  saleItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1, 
    borderBottomColor: tokens.colors.borderLight,
  },
  saleLeft: {
    gap: verticalScale(8),
  },
  saleAmount: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.text, 
    fontSize: moderateScale(16), 
    fontWeight: '800',
  },
  paymentBadge: {
    backgroundColor: tokens.colors.bg,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  saleMethod: { 
    fontFamily: FontNames.parkinsans, 
    color: tokens.colors.textMuted, 
    fontSize: moderateScale(11),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saleRight: { 
    alignItems: 'flex-end',
    gap: verticalScale(6),
  },
  saleDate: { 
    fontFamily: FontNames.parkinsans, 
    color: tokens.colors.text, 
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  saleTime: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.textMuted, 
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  empty: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.parkinsans, 
    fontSize: moderateScale(14), 
    textAlign: 'center', 
    marginVertical: verticalScale(24),
    fontWeight: '600',
  },
  cardWatermarkEspiral: {
    position: 'absolute',
    right: -scale(40),
    top: -scale(40),
    width: scale(220),
    height: scale(220),
    opacity: 0.07,
    pointerEvents: 'none',
  },
});
