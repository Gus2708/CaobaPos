import React, { useMemo, memo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../components/Text';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';
import { tokens } from '../lib/designTokens';
import { generateReport } from '../lib/pdfReportGenerator';
import { useToast } from '../components/Toast';
import { PeriodSelector, DashboardPeriod } from '../components/PeriodSelector';
import { PaymentDetailsModal } from '../components/PaymentDetailsModal';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
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
}

const StatCard = memo(function StatCard({ label, value, variant = 'default', icon, subtitle }: StatCardProps) {
  const bgColors = {
    default: { bg: tokens.colors.bg, accent: '#B87B5A' },
    accent: { bg: tokens.colors.bg, accent: '#B87B5A' },
    success: { bg: tokens.colors.bg, accent: '#6DB88A' },
    warning: { bg: tokens.colors.bg, accent: '#C96B6B' },
    profit: { bg: tokens.colors.bg, accent: '#6DB88A' },
  };
  const c = bgColors[variant];

  return (
    <View style={[styles.statCard, { backgroundColor: c.bg }]}>
      {/* Top accent stripe */}
      <View style={[styles.statAccentBar, { backgroundColor: c.accent }]} />
      <View style={styles.statBorder} />
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: `${c.accent}22` }]}>
          <Icon name={icon} size={16} color={c.accent} />
        </View>
        <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: c.accent }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
});

export const DashboardPanel = memo(function DashboardPanel() {
  const [period, setPeriod] = useState<DashboardPeriod>('dia');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const { data: sales, isLoading: loadingSales } = useQuery<Sale[]>({
    queryKey: ['dashboard', 'sales'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: saleItems } = useQuery<SaleItem[]>({
    queryKey: ['dashboard', 'sale_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_items')
        .select('sale_id, product_id, quantity, unit_price, unit_cost, subtotal');
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

  const { data: allPayments } = useQuery<ClientPayment[]>({
    queryKey: ['dashboard', 'client_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_payments')
        .select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const monthAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const filteredSales = useMemo(() => {
    if (period === 'dia') return (sales ?? []).filter((s) => s.created_at >= today);
    if (period === 'semana') return (sales ?? []).filter((s) => s.created_at >= weekAgo);
    if (period === 'mes') return (sales ?? []).filter((s) => s.created_at >= monthAgo);
    return sales ?? [];
  }, [sales, period, today, weekAgo, monthAgo]);

  const periodLabel = period === 'dia' ? 'Hoy' : period === 'semana' ? 'Esta Semana' : 'Este Mes';
  const pdfTitleLabel = period === 'dia' ? 'Resumen Financiero Diario' : period === 'semana' ? 'Resumen Financiero Semanal' : 'Resumen Financiero Mensual';

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    (products ?? []).forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  const calculateMetricsForSales = useMemo(() => {
    return (saleList: Sale[], paymentList: ClientPayment[]) => {
      const saleIds = new Set(saleList.map(s => s.id));
      const relevantItems = (saleItems ?? []).filter(item => saleIds.has(item.sale_id));
      
      const revenue = saleList.reduce((acc, s) => acc + Number(s.total_amount), 0);
      
      // Breakdown by payment readiness
      const pendingCredit = saleList
        .filter(s => s.payment_method === 'credito')
        .reduce((acc, s) => acc + Number(s.total_amount), 0);
      
      // Real Cash Flow = (Cash from immediate sales) + (Payments received today for past debts)
      const cashFromSales = revenue - pendingCredit;
      const totalAbonos = paymentList.reduce((acc, p) => acc + Number(p.amount), 0);
      
      const receivedMoney = cashFromSales + totalAbonos;

      // Use persisted cost if available, fallback to current product cost for old items
      const cost = relevantItems.reduce((acc, item) => {
        const itemCost = item.unit_cost !== undefined ? Number(item.unit_cost) : (productMap[item.product_id]?.cost || 0);
        return acc + (itemCost * item.quantity);
      }, 0);

      const profit = revenue - cost;
      return { revenue, cost, profit, pendingCredit, receivedMoney };
    };
  }, [saleItems, productMap]);

  const currentMetrics = useMemo(() => {
    const periodPayments = (allPayments ?? []).filter(p => {
      if (period === 'dia') return p.created_at >= today;
      if (period === 'semana') return p.created_at >= weekAgo;
      if (period === 'mes') return p.created_at >= monthAgo;
      return true;
    });

    const m = calculateMetricsForSales(filteredSales, periodPayments);
    const margin = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0;
    return { ...m, margin };
  }, [filteredSales, allPayments, calculateMetricsForSales, period, today, weekAgo, monthAgo]);

  const insets = useSafeAreaInsets();
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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  if (loadingSales) {
    return (
      <View style={styles.loading}>
        <LinearGradient
          colors={['rgba(10, 10, 12, 0.8)', 'rgba(10, 10, 12, 0.9)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#B87B5A" />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: verticalScale(32) + insets.bottom }]}
    >
      <LinearGradient
        colors={['rgba(10, 10, 12, 0.95)', 'rgba(10, 10, 12, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Dashboard</Text>
          <View style={styles.headerBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.headerBadgeText}>En vivo</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.downloadBtn}
          onPress={handleDownloadPDF}
          activeOpacity={0.7}
        >
          <Icon name="file-pdf" size={14} color="#B87B5A" />
          <Text style={styles.downloadBtnText}>PDF</Text>
        </TouchableOpacity>
      </View>

      <PeriodSelector selected={period} onSelect={setPeriod} />

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
          variant="success"
          icon="trending-up"
          subtitle={`Margen: ${currentMetrics.margin.toFixed(1)}%`}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: 'rgba(109, 184, 138, 0.15)' }]}>
            <Icon name="chart-pie" size={18} color="#6DB88A" />
          </View>
          <Text style={styles.sectionTitle}>Resumen Financiero</Text>
        </View>
        <View style={styles.financialGrid}>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Ingreso Bruto (Ventas)</Text>
            <Text style={styles.financialValue}>${currentMetrics.revenue.toFixed(2)}</Text>
          </View>
          <View style={styles.financialItem}>
            <View style={styles.labelWithBadge}>
              <Text style={styles.financialLabel}>Efectivo/Caja Real</Text>
              <View style={styles.receivedBadge}>
                <Text style={styles.receivedBadgeText}>Recibido</Text>
              </View>
            </View>
            <Text style={styles.financialValueReceived}>${currentMetrics.receivedMoney.toFixed(2)}</Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Crédito Pendiente</Text>
            <Text style={styles.financialValuePending}>${currentMetrics.pendingCredit.toFixed(2)}</Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Costos Totales</Text>
            <Text style={styles.financialValueCost}>-${currentMetrics.cost.toFixed(2)}</Text>
          </View>
          <View style={[styles.financialItem, styles.financialItemHighlight]}>
            <Text style={styles.financialLabelHighlight}>Ganancia Estimada</Text>
            <Text style={styles.financialValueProfit}>${currentMetrics.profit.toFixed(2)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Icon name="credit-card" size={18} color="#B87B5A" />
          </View>
          <Text style={styles.sectionTitle}>Metodos de Pago</Text>
        </View>
        <View style={styles.paymentMethodsGrid}>
          <TouchableOpacity 
            style={styles.paymentMethodItem}
            activeOpacity={0.7}
            onPress={() => { setSelectedMethod('cash'); setMethodModalVisible(true); }}
          >
            <View style={styles.paymentMethodIcon}>
              <Icon name="money-bill" size={16} color="#B87B5A" />
            </View>
            <Text style={styles.paymentMethodLabel}>Efectivo</Text>
            <Text style={styles.paymentMethodValue}>{paymentBreakdown.cash}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.paymentMethodItem}
            activeOpacity={0.7}
            onPress={() => { setSelectedMethod('card'); setMethodModalVisible(true); }}
          >
            <View style={styles.paymentMethodIcon}>
              <Icon name="credit-card" size={16} color="#B87B5A" />
            </View>
            <Text style={styles.paymentMethodLabel}>Tarjeta</Text>
            <Text style={styles.paymentMethodValue}>{paymentBreakdown.card}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.paymentMethodItem}
            activeOpacity={0.7}
            onPress={() => { setSelectedMethod('transfer'); setMethodModalVisible(true); }}
          >
            <View style={styles.paymentMethodIcon}>
              <Icon name="mobile-alt" size={16} color="#B87B5A" />
            </View>
            <Text style={styles.paymentMethodLabel}>Transf.</Text>
            <Text style={styles.paymentMethodValue}>{paymentBreakdown.transfer}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.paymentMethodItem}
            activeOpacity={0.7}
            onPress={() => { setSelectedMethod('credito'); setMethodModalVisible(true); }}
          >
            <View style={styles.paymentMethodIcon}>
              <Icon name="user" size={16} color="#B87B5A" />
            </View>
            <Text style={styles.paymentMethodLabel}>Créditos</Text>
            <Text style={styles.paymentMethodValue}>{paymentBreakdown.credito}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Icon name="cart" size={18} color="#B87B5A" />
          </View>
          <Text style={styles.sectionTitle}>Top Productos</Text>
        </View>
        <View style={styles.sectionCard}>
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
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(201, 107, 107, 0.15)' }]}>
              <Icon name="exclamation-triangle" size={18} color="#C96B6B" />
            </View>
            <Text style={[styles.sectionTitle, { color: '#C96B6B' }]}>Stock Bajo</Text>
          </View>
          <View style={styles.sectionCard}>
            {lowStock.map((p, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={[styles.rankBadge, { backgroundColor: 'rgba(201, 107, 107, 0.15)' }]}>
                    <Icon name="box" size={12} color="#C96B6B" />
                  </View>
                  <Text style={styles.listText}>{p.name}</Text>
                </View>
                <View style={[styles.listValueContainer, { backgroundColor: 'rgba(201, 107, 107, 0.1)' }]}>
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
          <View style={styles.sectionIcon}>
            <Icon name="clock" size={18} color="#B87B5A" />
          </View>
          <Text style={styles.sectionTitle}>Ventas Recientes</Text>
        </View>
        <View style={styles.sectionCard}>
          {(sales ?? []).slice(0, 10).map((sale) => (
            <View key={sale.id} style={styles.saleItem}>
              <View style={styles.saleLeft}>
                <Text style={styles.saleAmount}>${Number(sale.total_amount).toFixed(2)}</Text>
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
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    position: 'relative',
    backgroundColor: tokens.colors.bg,
  },
  content: {
    padding: scale(16),
    paddingBottom: verticalScale(32),
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingContent: {
    alignItems: 'center',
    gap: verticalScale(12),
  },
  loadingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: '#8A8A96',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(26), 
    color: '#F0F0F2', 
    fontWeight: '800', 
    letterSpacing: scale(1),
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: scale(12),
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(10),
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  downloadBtnText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#B87B5A',
    textTransform: 'uppercase',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 184, 138, 0.1)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(8),
    gap: scale(4),
  },
  statusDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: '#6DB88A',
  },
  headerBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#6DB88A',
    textTransform: 'uppercase',
  },
  statsGrid: { 
    flexDirection: 'row', 
    marginBottom: verticalScale(12), 
    gap: scale(12) 
  },
  statCard: { 
    flex: 1, 
    position: 'relative',
    padding: scale(16),
    paddingTop: verticalScale(18),
    borderRadius: scale(20), 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  statAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: verticalScale(3),
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    opacity: 0.85,
  },
  statBorder: {
    position: 'absolute',
    top: verticalScale(3),
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(10),
  },
  statIconContainer: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: { 
    flex: 1,
    fontFamily: FontNames.instrumentSans, 
    color: '#8A8A96', 
    fontSize: moderateScale(11), 
    fontWeight: '600',
    textTransform: 'uppercase', 
    letterSpacing: scale(0.5),
  },
  statValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(22), 
    fontWeight: '800',
  },
  statSubtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    color: '#8A8A96',
    marginTop: verticalScale(4),
  },
  statGlow: {
    position: 'absolute',
    bottom: verticalScale(-20),
    right: scale(-20),
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    opacity: 0.05,
  },
  section: { 
    marginTop: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  sectionIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(16), 
    color: '#F0F0F2', 
    fontWeight: '700',
  },
  sectionCard: { 
    backgroundColor: tokens.colors.bg,
    borderRadius: scale(20), 
    padding: scale(16),
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  financialGrid: {
    backgroundColor: tokens.colors.bg,
    borderRadius: scale(20),
    padding: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: verticalScale(12),
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(10),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  financialItemHighlight: {
    backgroundColor: 'rgba(109, 184, 138, 0.1)',
    marginHorizontal: scale(-16),
    marginBottom: verticalScale(-16),
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 0,
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },
  financialLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: '#8A8A96',
  },
  financialLabelHighlight: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#6DB88A',
  },
  financialValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#F0F0F2',
  },
  financialValueCost: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#C96B6B',
  },
  financialValueProfit: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#6DB88A',
  },
  financialValueReceived: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  financialValuePending: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#F59E0B',
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  receivedBadge: {
    backgroundColor: 'rgba(109, 184, 138, 0.1)',
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  receivedBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(9),
    fontWeight: '700',
    color: '#6DB88A',
    textTransform: 'uppercase',
  },
  listItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    flex: 1,
  },
  rankBadge: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: tokens.colors.mahogany,
  },
  listText: { 
    fontFamily: FontNames.instrumentSans, 
    color: tokens.colors.text, 
    fontSize: moderateScale(14),
    flex: 1,
  },
  listValueContainer: {
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  listValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.mahogany, 
    fontSize: moderateScale(13), 
    fontWeight: '700',
  },
  saleItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  saleLeft: {
    gap: verticalScale(6),
  },
  saleAmount: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.text, 
    fontSize: moderateScale(16), 
    fontWeight: '700',
  },
  paymentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  saleMethod: { 
    fontFamily: FontNames.instrumentSans, 
    color: tokens.colors.textMuted, 
    fontSize: moderateScale(11),
    textTransform: 'capitalize',
  },
  saleRight: { 
    alignItems: 'flex-end',
    gap: verticalScale(4),
  },
  saleDate: { 
    fontFamily: FontNames.instrumentSans, 
    color: tokens.colors.text, 
    fontSize: moderateScale(13),
  },
  saleTime: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: tokens.colors.textMuted, 
    fontSize: moderateScale(11),
  },
  empty: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(14), 
    textAlign: 'center', 
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  paymentMethodItem: {
    flexGrow: 1,
    minWidth: scale(100),
    backgroundColor: tokens.colors.bg,
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  paymentMethodIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  paymentMethodLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: '#8A8A96',
    marginBottom: verticalScale(6),
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
  },
  paymentMethodValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: tokens.colors.text,
  },
});
