import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface SaleItem {
  product_id: string;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
}

interface StatCardProps {
  label: string;
  value: string;
  variant?: 'default' | 'accent' | 'success' | 'warning';
  icon: string;
}

const StatCard = memo(function StatCard({ label, value, variant = 'default', icon }: StatCardProps) {
  const colors = {
    default: { bg: 'rgba(30, 30, 36, 0.6)', accent: '#B87B5A' },
    accent: { bg: 'rgba(184, 123, 90, 0.15)', accent: '#B87B5A' },
    success: { bg: 'rgba(109, 184, 138, 0.12)', accent: '#6DB88A' },
    warning: { bg: 'rgba(201, 107, 107, 0.12)', accent: '#C96B6B' },
  };

  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[colors[variant].bg, 'rgba(30, 30, 36, 0.3)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.statBorder} />
      <View style={styles.statHeader}>
        <View style={[styles.statIconContainer, { backgroundColor: `${colors[variant].accent}20` }]}>
          <Icon name={icon} size={18} color={colors[variant].accent} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: colors[variant].accent }]}>{value}</Text>
      <View style={[styles.statGlow, { backgroundColor: colors[variant].accent }]} />
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

  const { data: items } = useQuery<SaleItem[]>({
    queryKey: ['dashboard', 'sale_items'],
    queryFn: async () => {
      const { data, error } = await supabase.from('sale_items').select('product_id, quantity');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['dashboard', 'products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id,name,stock_quantity');
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

  const todayRevenue = todaySales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const weekRevenue = weekSales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalRevenue = (sales ?? []).reduce((acc, s) => acc + Number(s.total_amount), 0);

  const lowStock = useMemo(
    () => (products ?? []).filter((p) => p.stock_quantity < 10).slice(0, 5),
    [products]
  );

  const topProducts = useMemo(() => {
    if (!items || !products) return [];
    const sums: Record<string, number> = {};
    items.forEach((it) => {
      sums[it.product_id] = (sums[it.product_id] ?? 0) + it.quantity;
    });
    return Object.entries(sums)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, qty]) => ({
        name: products.find((p) => p.id === id)?.name ?? 'Desconocido',
        qty,
      }));
  }, [items, products]);

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
          colors={['rgba(30, 30, 36, 0.8)', 'rgba(10, 10, 12, 0.9)']}
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
        colors={['rgba(20, 20, 26, 0.95)', 'rgba(10, 10, 12, 0.98)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <View style={styles.headerBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.headerBadgeText}>En vivo</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          label="Hoy" 
          value={`$${todayRevenue.toFixed(2)}`} 
          variant="accent"
          icon="money-bill"
        />
        <StatCard 
          label="Esta Semana" 
          value={`$${weekRevenue.toFixed(2)}`} 
          variant="success"
          icon="folder"
        />
      </View>

      <View style={styles.statsGrid}>
        <StatCard 
          label="Total" 
          value={`$${totalRevenue.toFixed(2)}`} 
          variant="default"
          icon="cart"
        />
        <StatCard 
          label="Ventas" 
          value={`${(sales ?? []).length}`} 
          variant="default"
          icon="document"
        />
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
              <Icon name="trash" size={18} color="#C96B6B" />
            </View>
            <Text style={[styles.sectionTitle, { color: '#C96B6B' }]}>Stock Bajo</Text>
          </View>
          <View style={styles.sectionCard}>
            {lowStock.map((p, i) => (
              <View key={i} style={styles.listItem}>
                <View style={styles.listItemLeft}>
                  <View style={[styles.rankBadge, { backgroundColor: 'rgba(201, 107, 107, 0.15)' }]}>
                    <Icon name="trash" size={12} color="#C96B6B" />
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
            <Icon name="document" size={18} color="#B87B5A" />
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
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(109, 184, 138, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6DB88A',
  },
  headerBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    fontWeight: '600',
    color: '#6DB88A',
  },
  statsGrid: { 
    flexDirection: 'row', 
    marginBottom: 12, 
    gap: 12 
  },
  statCard: { 
    flex: 1, 
    position: 'relative',
    padding: 18, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: 'rgba(184, 123, 90, 0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  statBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: { 
    fontFamily: FontNames.instrumentSans, 
    color: '#8A8A96', 
    fontSize: 12, 
    fontWeight: '600',
    textTransform: 'uppercase', 
    letterSpacing: 0.5,
  },
  statValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: 24, 
    fontWeight: '800',
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
    backgroundColor: 'rgba(30, 30, 36, 0.5)',
    borderRadius: 20, 
    padding: 16,
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.06)',
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
    borderBottomColor: 'rgba(255,255,255,0.04)',
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
});
