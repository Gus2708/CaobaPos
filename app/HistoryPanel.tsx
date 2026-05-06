import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput, Platform, StatusBar, Modal, ScrollView, Animated, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { globalScrollY } from '../store/uiStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { SkeletonItem } from '../components/SkeletonItem';
import { Badge } from '../components/Badge';
import { Text } from '../components/Text';

import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { DashboardPeriod } from '../components/PeriodSelector';
import { CustomDateRangeModal } from '../components/CustomDateRangeModal';

// Create animated component at module level to avoid remount on every render
const AnimatedFlashList = Animated.createAnimatedComponent(FlashList) as unknown as typeof FlashList;

interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  iva_enabled?: boolean;
  tax_amount?: number;
  client_id?: string;
  sale_items?: SaleItem[];
}

const SaleCard = React.memo(function SaleCard({ 
  item, 
  onView, 
  onDelete 
}: { 
  item: Sale; 
  onView: () => void; 
  onDelete: () => void;
}) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return 'money-bill';
      case 'card': return 'credit-card';
      case 'transfer': return 'mobile-alt';
      case 'credito': return 'user';
      default: return 'receipt';
    }
  };

  return (
    <TouchableOpacity 
      style={styles.saleCard} 
      onPress={onView} 
      activeOpacity={0.7}
      onLongPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel={`Venta de ${Number(item.total_amount).toFixed(2)} pesos, realizada el ${formatDate(item.created_at)}. Pulsa para ver detalles, mantén pulsado para eliminar.`}
    >
      <BlurView
        tint="dark"
        intensity={20}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.saleContent}>
        <View style={[styles.methodIconCircle, { backgroundColor: tokens.colors.mahoganyDim }]}>
          <Icon name={getPaymentIcon(item.payment_method)} size={20} color={tokens.colors.mahogany} />
        </View>

        <View style={styles.saleInfo}>
          <Text style={styles.saleTotal} numberOfLines={1} adjustsFontSizeToFit>${Number(item.total_amount).toFixed(2)}</Text>
          <Text style={styles.saleDate}>{formatDate(item.created_at)}</Text>
        </View>

        <View style={styles.saleChevron}>
          <Icon name="chevron-right" size={22} color={tokens.colors.textDim} />
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const HistoryPanel = React.memo(function HistoryPanel() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const HEADER_HEIGHT = verticalScale(50) + insets.top;
  const TOTAL_NAV_HEIGHT = HEADER_HEIGHT;

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [methodModalVisible, setMethodModalVisible] = useState(false);
  const [period, setPeriod] = useState<DashboardPeriod | 'todo'>('todo');
  const [periodModalVisible, setPeriodModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);

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

  const periodLabels: Record<string, string> = {
    todo: 'Histórico',
    dia: 'Hoy',
    semana: 'Semana',
    mes: 'Mes',
    personalizado: 'Pers.',
  };

  const periodOptions = [
    { value: 'todo', label: 'Todo el tiempo', icon: 'history' },
    { value: 'dia', label: 'Hoy', icon: 'calendar-day' },
    { value: 'semana', label: 'Esta Semana', icon: 'calendar-week' },
    { value: 'mes', label: 'Este Mes', icon: 'calendar-alt' },
    { value: 'personalizado', label: 'Personalizado', icon: 'cog' },
  ];

  const dateRange = useMemo(() => {
    if (period === 'todo') return { start: null, end: null };
    if (period === 'personalizado') return { start: startDate, end: endDate };
    if (period === 'dia') return { start: today, end: null };
    if (period === 'semana') return { start: weekAgo, end: null };
    if (period === 'mes') return { start: monthAgo, end: null };
    return { start: null, end: null };
  }, [period, today, weekAgo, monthAgo, startDate, endDate]);

  const { showToast } = useToast();

  const paymentMethods = [
    { value: null, label: 'Todos', icon: 'list' },
    { value: 'cash', label: 'Efectivo', icon: 'money-bill' },
    { value: 'card', label: 'Tarjeta', icon: 'credit-card' },
    { value: 'transfer', label: 'Transf.', icon: 'mobile-alt' },
    { value: 'credito', label: 'Crédito', icon: 'user' },
  ];

  const PAGE_SIZE = 20;

  const { 
    data, 
    isLoading, 
    refetch, 
    isRefetching, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = useInfiniteQuery({
    queryKey: ['sales-history', selectedMethod, period, dateRange],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let query = supabase.from('sales').select('*');
      
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }
      if (selectedMethod) {
        query = query.eq('payment_method', selectedMethod);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);
        
      if (error) throw error;
      return data ?? [];
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined;
    },
  });

  const sales = useMemo(() => data?.pages.flat() ?? [], [data]);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    if (!search.trim()) return sales;
    return sales.filter((s) =>
      s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.payment_method.toLowerCase().includes(search.toLowerCase())
    );
  }, [sales, search]);

  const { data: totalSum, isLoading: loadingTotal } = useQuery({
    queryKey: ['sales-history-total', selectedMethod, period, dateRange],
    queryFn: async () => {
      let query = supabase.from('sales').select('total_amount');
      
      if (dateRange.start) {
        query = query.gte('created_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lte('created_at', dateRange.end);
      }
      if (selectedMethod) {
        query = query.eq('payment_method', selectedMethod);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data?.reduce((acc, sale) => acc + (sale.total_amount || 0), 0) ?? 0;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (sale: Sale) => {
      try {
        // 1. Get items to restore stock
        const { data: items, error: itemsError } = await supabase
          .from('sale_items')
          .select('product_id, quantity')
          .eq('sale_id', sale.id);

        if (itemsError) throw itemsError;

        // 2. Restore stock using RPC
        if (items && items.length > 0) {
          for (const item of items) {
            const { error: rpcError } = await supabase.rpc('increment_stock', {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            });
            if (rpcError) throw new Error(`Error al restaurar stock: ${rpcError.message}`);
          }
        }

        // 3. Delete linked payments (explicit until cascade is applied)
        await supabase
          .from('client_payments')
          .delete()
          .eq('sale_id', sale.id);

        // 4. Delete the sale (cascades to sale_items)
        const { error: saleError } = await supabase
          .from('sales')
          .delete()
          .eq('id', sale.id);

        if (saleError) throw saleError;
        
        return { success: true };
      } catch (error: any) {
        console.error('Delete mutation error:', error);
        throw error;
      }
    },
    onSuccess: (_, deletedSale) => {
      // 1. Actualizar el cache de la consulta infinita manualmente para respuesta instantánea
      queryClient.setQueriesData({ queryKey: ['sales-history'] }, (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => 
            page.filter((sale: any) => sale.id !== deletedSale.id)
          )
        };
      });

      // 2. Invalidar para asegurar sincronización con DB
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); 
      
      if (deletedSale.payment_method === 'credito') {
        queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
        if (deletedSale.client_id) {
          queryClient.invalidateQueries({ queryKey: ['client_credit_sales', deletedSale.client_id] });
          queryClient.invalidateQueries({ queryKey: ['client_payments', deletedSale.client_id] });
        }
      }

      setShowDetail(false);
      setSelectedSale(null);
      showToast('Venta eliminada y stock restaurado', 'success');
    },
    onError: () => showToast('No se pudo eliminar la venta', 'error'),
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ saleId, items, newTotal, ivaEnabled, taxAmount }: { 
      saleId: string; 
      items: SaleItem[]; 
      newTotal: number;
      ivaEnabled: boolean;
      taxAmount: number;
    }) => {
      const { data: oldItems, error: fetchError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId);
      
      if (fetchError) throw fetchError;

      if (oldItems) {
        for (const item of oldItems) {
          await supabase.rpc('increment_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });
        }
      }

      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);
      if (deleteError) throw deleteError;

      const productIds = items.map(i => i.product_id);
      const { data: dbProducts, error: stockCheckError } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .in('id', productIds);
      
      if (stockCheckError) throw stockCheckError;

      for (const item of items) {
        const dbProduct = dbProducts?.find(p => p.id === item.product_id);
        if (dbProduct && dbProduct.stock_quantity < item.quantity) {
          throw new Error(`Stock insuficiente para ${dbProduct.name}. Disponible: ${dbProduct.stock_quantity}`);
        }
      }

      for (const item of items) {
        const { error: insertError } = await supabase.from('sale_items').insert({
          sale_id: saleId,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: item.subtotal,
        });
        if (insertError) throw insertError;

        await supabase.rpc('decrement_stock', {
          p_product_id: item.product_id,
          p_quantity: item.quantity,
        });
      }

      const { error: updateError } = await supabase
        .from('sales')
        .update({ 
          total_amount: newTotal,
          iva_enabled: ivaEnabled,
          tax_amount: taxAmount
        })
        .eq('id', saleId);
      if (updateError) throw updateError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      if (selectedSale?.payment_method === 'credito') {
        queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
        if (selectedSale?.client_id) {
          queryClient.invalidateQueries({ queryKey: ['client_credit_sales', selectedSale.client_id] });
        }
      }
      setShowDetail(false);
      setSelectedSale(null);
      showToast('Venta actualizada', 'success');
    },
    onError: () => showToast('No se pudo actualizar la venta', 'error'),
  });

  const handleDelete = useCallback((sale: Sale, skipConfirm = false) => {
    const executeDelete = () => deleteMutation.mutate(sale);

    if (skipConfirm) {
      executeDelete();
      return;
    }

    Alert.alert(
      'Eliminar Venta',
      `¿Eliminar venta #${sale.id.slice(0, 8).toUpperCase()}? El stock será restaurado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: executeDelete },
      ]
    );
  }, [deleteMutation]);

  const handleView = useCallback(async (sale: Sale) => {
    try {
      const { data: items, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale.id);

      if (error) throw error;
      setSelectedSale({ ...sale, sale_items: items ?? [] });
      setShowDetail(true);
    } catch (error) {
      showToast('No se pudieron cargar los detalles', 'error');
    }
  }, [showToast]);

  const renderItem = useCallback(({ item }: { item: Sale }) => (
    <SaleCard 
      item={item} 
      onView={() => handleView(item)} 
      onDelete={() => handleDelete(item)} 
    />
  ), [handleView, handleDelete]);

  const ListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconCircle}>
            <Icon name="history" size={24} color={tokens.colors.mahogany} />
          </View>
          <View style={{ flex: 1, gap: scale(4), marginRight: scale(12) }}>
            <Text style={styles.headerLabel}>Actividad reciente</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), flexWrap: 'wrap' }}>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>Historial</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{filteredSales.length}</Text>
              </View>
            </View>
          </View>

          <View style={styles.headerRight}>
            <View style={styles.headerStats}>
              <Text style={styles.statsLabel}>Total ventas</Text>
              {loadingTotal ? (
                <ActivityIndicator size="small" color={tokens.colors.mahogany} />
              ) : (
                <Text style={styles.statsValue} numberOfLines={1} adjustsFontSizeToFit>
                  $ {totalSum?.toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.filterSection}>
        <Text style={styles.sectionLabel}>Filtrar resultados</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity onPress={() => setPeriodModalVisible(true)}>
            <Badge 
              variant={period !== 'todo' ? 'mahogany' : 'neutral'} 
              icon={periodOptions.find(o => o.value === period)?.icon}
              showChevron={true}
            >
              {periodLabels[period]}
            </Badge>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMethodModalVisible(true)}>
            <Badge 
              variant={selectedMethod ? 'mahogany' : 'neutral'} 
              icon={paymentMethods.find(m => m.value === selectedMethod)?.icon}
              showChevron={true}
            >
              {paymentMethods.find(m => m.value === selectedMethod)?.label}
            </Badge>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={22} color="#8A8A96" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por folio o método..."
            placeholderTextColor="#6A6A72"
            value={search}
            onChangeText={setSearch}
            accessibilityRole="search"
            accessibilityLabel="Campo de búsqueda de historial"
          />
        </View>
      </View>
    </View>
  ), [filteredSales.length, loadingTotal, totalSum, period, selectedMethod, search]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[tokens.colors.bg, tokens.colors.bg]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      {/* @ts-ignore */}
      <AnimatedFlashList
        ListHeaderComponent={ListHeader}
        data={filteredSales}
        keyExtractor={(item: Sale) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.list, 
          { 
            paddingTop: TOTAL_NAV_HEIGHT + verticalScale(12), 
            paddingBottom: insets.bottom + verticalScale(100) 
          }
        ]}
        estimatedItemSize={100}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ gap: verticalScale(12) }}>
              <SkeletonItem layout="row" count={8} />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="document" size={64} color="rgba(184, 123, 90, 0.3)" />
              <Text style={styles.empty}>Sin ventas registradas</Text>
            </View>
          )
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => 
          isFetchingNextPage ? (
            <View style={{ paddingVertical: verticalScale(20) }}>
              <ActivityIndicator color={tokens.colors.mahogany} />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: globalScrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={tokens.colors.mahogany}
            progressBackgroundColor={tokens.colors.glass.heavy}
          />
        }
      />

      {selectedSale && (
        <SaleDetailModal
          visible={showDetail}
          sale={selectedSale}
          onClose={() => {
            setShowDetail(false);
            setSelectedSale(null);
          }}
          onDelete={() => handleDelete(selectedSale, true)}
          onUpdate={(items, total, ivaEnabled, taxAmount) => 
            updateSaleMutation.mutate({ 
              saleId: selectedSale.id, 
              items, 
              newTotal: total,
              ivaEnabled,
              taxAmount
            })
          }
          isDeleting={deleteMutation.isPending}
          isUpdating={updateSaleMutation.isPending}
        />
      )}

      <Modal
        visible={methodModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMethodModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setMethodModalVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.dropdownGradient}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Filtrar por pago</Text>
                <TouchableOpacity 
                  onPress={() => setMethodModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Icon name="times" size={16} color={tokens.colors.textMuted} />
                </TouchableOpacity>
              </View>
              {paymentMethods.map((m) => (
                <TouchableOpacity
                  key={m.label}
                  style={[
                    styles.dropdownItem,
                    selectedMethod === m.value && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    setSelectedMethod(m.value);
                    setMethodModalVisible(false);
                  }}
                >
                  <View style={[
                    styles.methodIconSmall,
                    { backgroundColor: selectedMethod === m.value ? tokens.colors.mahogany : 'rgba(255,255,255,0.05)' }
                  ]}>
                    <Icon 
                      name={m.icon} 
                      size={14} 
                      color={selectedMethod === m.value ? '#FFF' : tokens.colors.textDim} 
                    />
                  </View>
                  <Text style={[
                    styles.dropdownItemText,
                    selectedMethod === m.value && styles.dropdownItemTextActive
                  ]}>
                    {m.label}
                  </Text>
                  {selectedMethod === m.value && (
                    <Icon name="check" size={16} color={tokens.colors.mahogany} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={periodModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setPeriodModalVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            <BlurView tint="dark" intensity={50} style={StyleSheet.absoluteFill} />
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.02)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.dropdownGradient}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Filtrar tiempo</Text>
                <TouchableOpacity 
                  onPress={() => setPeriodModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Icon name="times" size={16} color={tokens.colors.textMuted} />
                </TouchableOpacity>
              </View>
              {periodOptions.map((o) => (
                <TouchableOpacity
                  key={o.value}
                  style={[
                    styles.dropdownItem,
                    period === o.value && styles.dropdownItemActive
                  ]}
                  onPress={() => {
                    if (o.value === 'personalizado') {
                      setPeriodModalVisible(false);
                      setCustomModalVisible(true);
                      setPeriod('personalizado');
                    } else {
                      setPeriod(o.value as any);
                      setPeriodModalVisible(false);
                    }
                  }}
                >
                  <View style={[
                    styles.methodIconSmall,
                    { backgroundColor: period === o.value ? tokens.colors.mahogany : 'rgba(255,255,255,0.05)' }
                  ]}>
                    <Icon 
                      name={o.icon} 
                      size={14} 
                      color={period === o.value ? '#FFF' : tokens.colors.textDim} 
                    />
                  </View>
                  <Text style={[
                    styles.dropdownItemText,
                    period === o.value && styles.dropdownItemTextActive
                  ]}>
                    {o.label}
                  </Text>
                  {period === o.value && (
                    <Icon name="check" size={16} color={tokens.colors.mahogany} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <CustomDateRangeModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onConfirm={(start, end) => {
          setStartDate(start);
          setEndDate(end);
          setCustomModalVisible(false);
        }}
        initialStartDate={startDate}
        initialEndDate={endDate}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: tokens.colors.bg,
  },
  header: { 
    marginBottom: verticalScale(28),
    paddingHorizontal: scale(4),
  },
  headerLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  countText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    color: tokens.colors.text,
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: verticalScale(28),
  },
  sectionLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
    fontWeight: '600',
    marginBottom: verticalScale(12),
    paddingHorizontal: scale(4),
  },
  filterScroll: {
    paddingHorizontal: scale(4),
    gap: scale(12),
    flexDirection: 'row',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
  },
  headerIconCircle: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  headerStats: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: scale(90),
  },
  statsLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(9),
    color: tokens.colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: verticalScale(2),
  },
  statsValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    color: tokens.colors.sage,
    fontWeight: '800',
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(32), 
    color: tokens.colors.text, 
    fontWeight: '800',
    letterSpacing: scale(-0.5),
  },
  searchRow: { 
    marginBottom: verticalScale(32),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: scale(12),
    height: verticalScale(54),
  },
  searchInput: { 
    flex: 1,
    color: tokens.colors.text, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  list: { 
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(32),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(100),
    gap: verticalScale(16),
  },
  empty: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(16),
    fontWeight: '700',
    textAlign: 'center', 
  },
  saleCard: {
    position: 'relative',
    borderRadius: tokens.radius.xl, 
    marginBottom: verticalScale(16), 
    borderWidth: 1, 
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
    minHeight: verticalScale(84),
    justifyContent: 'center',
  },
  saleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    gap: scale(14),
  },
  methodIconCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  saleInfo: {
    flex: 1,
    gap: verticalScale(4),
  },
  saleTotal: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(18), 
    color: tokens.colors.text, 
    fontWeight: '800',
    lineHeight: moderateScale(22),
  },
  saleDate: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(12), 
    color: tokens.colors.textMuted,
    fontWeight: '600',
  },
  saleChevron: {
    marginLeft: scale(4),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  dropdownContainer: {
    width: '100%',
    maxWidth: scale(280),
    borderRadius: tokens.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  dropdownGradient: {
    padding: scale(16),
    backgroundColor: 'transparent',
  },
  dropdownTitle: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: tokens.colors.textDim,
    marginBottom: verticalScale(16),
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(16),
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: -scale(4),
    padding: scale(8),
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(12),
    borderRadius: tokens.radius.lg,
    gap: scale(12),
    marginBottom: verticalScale(4),
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
  },
  methodIconSmall: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemText: {
    flex: 1,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  dropdownItemTextActive: {
    color: tokens.colors.text,
    fontWeight: '700',
  },
});
