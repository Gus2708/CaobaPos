import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';
import { tokens } from '../lib/designTokens';
import { generateDailyReport } from '../lib/pdfReportGenerator';
import { useToast } from '../components/Toast';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface SaleItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
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
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: c.accent }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
});

export const DashboardPanel = memo(function DashboardPanel() {
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
        .select('product_id, quantity, unit_price, subtotal');
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

  const todaySales = useMemo(
    () => (sales ?? []).filter((s) => s.created_at >= today),
    [sales, today]
  );

  const weekSales = useMemo(
    () => (sales ?? []).filter((s) => s.created_at >= weekAgo),
    [sales, weekAgo]
  );

  const productMap = useMemo(() => {
    const map: Record<string, Product> = {};
    (products ?? []).forEach(p => { map[p.id] = p; });
    return map;
  }, [products]);

  const calculateMetrics = useMemo(() => {
    const revenue = (saleItems ?? []).reduce((acc, item) => acc + Number(item.subtotal), 0);
    const cost = (saleItems ?? []).reduce((acc, item) => {
      const product = productMap[item.product_id];
      return acc + (product ? Number(product.cost || 0) * item.quantity : 0);
    }, 0);
    const profit = revenue - cost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    return { revenue, cost, profit, margin };
  }, [saleItems, productMap]);

  const calculateMetricsForSales = useMemo(() => {
    return (saleList: Sale[]) => {
      const saleIds = new Set(saleList.map(s => s.id));
      const relevantItems = (saleItems ?? []).filter(item => {
        return true;
      });
      const revenue = saleList.reduce((acc, s) => acc + Number(s.total_amount), 0);
      const cost = (saleItems ?? []).reduce((acc, item) => {
        const product = productMap[item.product_id];
        return acc + (product ? Number(product.cost || 0) * item.quantity : 0);
      }, 0);
      const profit = revenue - cost;
      return { revenue, cost, profit };
    };
  }, [saleItems, productMap]);

  const todayMetrics = useMemo(() => calculateMetricsForSales(todaySales), [todaySales, calculateMetricsForSales]);
  const weekMetrics = useMemo(() => calculateMetricsForSales(weekSales), [weekSales, calculateMetricsForSales]);
  const totalMetrics = useMemo(() => calculateMetrics, [calculateMetrics]);

  const { showToast } = useToast();

  const handleDownloadPDF = async () => {
    try {
      if (todaySales.length === 0) {
        showToast('No hay ventas hoy para generar el reporte', 'warning');
        return;
      }
      await generateDailyReport(todaySales, todayMetrics);
      showToast('Reporte generado con éxito', 'success');
    } catch (error) {
      showToast('Error al generar el PDF', 'error');
      console.error(error);
    }
  };

  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, number> = { cash: 0, card: 0, transfer: 0 };
    (sales ?? []).forEach(s => {
      if (counts[s.payment_method] !== undefined) {
        counts[s.payment_method]++;
      }
    });
    return counts;
  }, [sales]);

  const lowStock = useMemo(
    () => (products ?? []).filter((p) => p.stock_quantity < 10).slice(0, 5),
    [products]
  );

  const topProducts = useMemo(() => {
    if (!saleItems || !products) return [];
    const sums: Record<string, number> = {};
    saleItems.forEach((it) => {
      sums[it.product_id] = (sums[it.product_id] ?? 0) + it.quantity;
    });
    return Object.entries(sums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, qty]) => ({
        name: products.find((p) => p.id === id)?.name ?? 'Desconocido',
        qty,
      }));
  }, [saleItems, products]);

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
      contentContainerStyle={styles.content}
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

      <View style={styles.statsGrid}>
        <StatCard 
          label="Ventas Hoy" 
          value={`${todaySales.length}`} 
          variant="accent"
          icon="receipt"
        />
        <StatCard 
          label="Ganancia Hoy" 
          value={`$${todayMetrics.profit.toFixed(2)}`}
          variant="success"
          icon="trending-up"
          subtitle={`Margen: ${todayMetrics.revenue > 0 ? ((todayMetrics.profit / todayMetrics.revenue) * 100).toFixed(1) : 0}%`}
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          label="Semana" 
          value={`$${weekMetrics.profit.toFixed(2)}`}
          variant="profit"
          icon="trending-up"
          subtitle={`Ventas: $${weekMetrics.revenue.toFixed(2)}`}
        />
        <StatCard 
          label="Ganancia Total" 
          value={`$${totalMetrics.profit.toFixed(2)}`}
          variant="success"
          icon="chart-line"
          subtitle={`Margen: ${totalMetrics.margin.toFixed(1)}%`}
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
            <Text style={styles.financialLabel}>Ventas Totales</Text>
            <Text style={styles.financialValue}>${totalMetrics.revenue.toFixed(2)}</Text>
          </View>
          <View style={styles.financialItem}>
            <Text style={styles.financialLabel}>Costos Totales</Text>
            <Text style={styles.financialValueCost}>-${totalMetrics.cost.toFixed(2)}</Text>
          </View>
          <View style={[styles.financialItem, styles.financialItemHighlight]}>
            <Text style={styles.financialLabelHighlight}>Ganancia Neta</Text>
            <Text style={styles.financialValueProfit}>${totalMetrics.profit.toFixed(2)}</Text>
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
          <View style={styles.paymentMethodItem}>
            <View style={styles.paymentMethodIcon}>
              <Icon name="money-bill" size={16} color="#B87B5A" />
            </View>
            <Text style={styles.paymentMethodLabel}>Efectivo</Text>
            <Text style={styles.paymentMethodValue}>{paymentBreakdown.cash}</Text>
          </View>
          <View style={styles.paymentMethodItem}>
            <View style={styles.paymentMethodIcon}>
              <Icon name="credit-card" size={16} color="#B87B5A" />
            </View>
            <Text style={styles.paymentMethodLabel}>Tarjeta</Text>
            <Text style={styles.paymentMethodValue}>{paymentBreakdown.card}</Text>
          </View>
          <View style={styles.paymentMethodItem}>
            <View style={styles.paymentMethodIcon}>
              <Icon name="mobile-alt" size={16} color="#B87B5A" />
            </View>
            <Text style={styles.paymentMethodLabel}>Transf.</Text>
            <Text style={styles.paymentMethodValue}>{paymentBreakdown.transfer}</Text>
          </View>
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
          {(sales ?? []).length === 0 && (
            <Text style={styles.empty}>Sin ventas registradas</Text>
          )}
        </View>
      </View>
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
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#8A8A96',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 26, 
    color: '#F0F0F2', 
    fontWeight: '800', 
    letterSpacing: 1,
  },
  headerTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  downloadBtnText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 11,
    fontWeight: '700',
    color: '#B87B5A',
    textTransform: 'uppercase',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 184, 138, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6DB88A',
  },
  headerBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 10,
    fontWeight: '600',
    color: '#6DB88A',
    textTransform: 'uppercase',
  },
  statsGrid: { 
    flexDirection: 'row', 
    marginBottom: 12, 
    gap: 12 
  },
  statCard: { 
    flex: 1, 
    position: 'relative',
    padding: 16,
    paddingTop: 18,
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  statAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    opacity: 0.85,
  },
  statBorder: {
    position: 'absolute',
    top: 3,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: { 
    fontFamily: FontNames.instrumentSans, 
    color: '#8A8A96', 
    fontSize: 11, 
    fontWeight: '600',
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
  },
  statValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: 22, 
    fontWeight: '800',
  },
  statSubtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 11,
    color: '#8A8A96',
    marginTop: 4,
  },
  statGlow: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.05,
  },
  section: { 
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 16, 
    color: '#F0F0F2', 
    fontWeight: '700',
  },
  sectionCard: { 
    backgroundColor: tokens.colors.bg,
    borderRadius: 20, 
    padding: 16,
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  financialGrid: {
    backgroundColor: tokens.colors.bg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  financialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  financialItemHighlight: {
    backgroundColor: 'rgba(109, 184, 138, 0.1)',
    marginHorizontal: -16,
    marginBottom: -16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 0,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  financialLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#8A8A96',
  },
  financialLabelHighlight: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    fontWeight: '600',
    color: '#6DB88A',
  },
  financialValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 16,
    fontWeight: '700',
    color: '#F0F0F2',
  },
  financialValueCost: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 16,
    fontWeight: '700',
    color: '#C96B6B',
  },
  financialValueProfit: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 20,
    fontWeight: '800',
    color: '#6DB88A',
  },
  listItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 12,
    fontWeight: '700',
    color: '#B87B5A',
  },
  listText: { 
    fontFamily: FontNames.instrumentSans, 
    color: '#F0F0F2', 
    fontSize: 14,
    flex: 1,
  },
  listValueContainer: {
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  listValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: '#B87B5A', 
    fontSize: 13, 
    fontWeight: '700',
  },
  saleItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 14,
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  saleLeft: {
    gap: 6,
  },
  saleAmount: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: '#F0F0F2', 
    fontSize: 16, 
    fontWeight: '700',
  },
  paymentBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  saleMethod: { 
    fontFamily: FontNames.instrumentSans, 
    color: '#8A8A96', 
    fontSize: 11,
    textTransform: 'capitalize',
  },
  saleRight: { 
    alignItems: 'flex-end',
    gap: 4,
  },
  saleDate: { 
    fontFamily: FontNames.instrumentSans, 
    color: '#F0F0F2', 
    fontSize: 13,
  },
  saleTime: { 
    fontFamily: FontNames.jetBrainsMono, 
    color: '#8A8A96', 
    fontSize: 11,
  },
  empty: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 14, 
    textAlign: 'center', 
    marginTop: 16,
    marginBottom: 8,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paymentMethodItem: {
    flexGrow: 1,
    minWidth: 100,
    backgroundColor: tokens.colors.bg,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  paymentMethodIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentMethodLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    color: '#8A8A96',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  paymentMethodValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 18,
    fontWeight: '700',
    color: '#F0F0F2',
  },
});
