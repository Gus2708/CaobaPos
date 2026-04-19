import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, TextInput, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { SkeletonItem } from '../components/SkeletonItem';
import { Badge } from '../components/Badge';
import { Text } from '../components/Text';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { Icon } from '../components/Icon';
import { useToast } from '../components/Toast';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

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
  const insets = useSafeAreaInsets();

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

  const getPaymentLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
    };
    return labels[method] || method;
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
    >
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
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const { showToast } = useToast();

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
    queryKey: ['sales-history'],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
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

  const deleteMutation = useMutation({
    mutationFn: async (sale: Sale) => {
      const { data: items, error: itemsError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', sale.id);

      if (itemsError) throw itemsError;

      if (items && items.length > 0) {
        for (const item of items) {
          await supabase.rpc('increment_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });
        }
      }

      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', sale.id);
      if (deleteError) throw deleteError;

      // 2. Automatically clear any payments associated with this specific sale
      // link to help keep client balances consistent. This MUST happen before
      // deleting the sale due to foreign key constraints.
      await supabase
        .from('client_payments')
        .delete()
        .eq('sale_id', sale.id);

      // 3. Delete the sale itself
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);
      if (saleError) throw saleError;
    },
    onSuccess: (_, sale) => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }); // Refresh analytics
      if (sale.payment_method === 'credito') {
        queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
        if (sale.client_id) {
          queryClient.invalidateQueries({ queryKey: ['client_credit_sales', sale.client_id] });
          queryClient.invalidateQueries({ queryKey: ['client_payments', sale.client_id] });
        }
      }
      setShowDetail(false);
      setSelectedSale(null);
      showToast('Venta eliminada y stock restaurado', 'success');
    },
    onError: () => showToast('No se pudo eliminar la venta', 'error'),
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ saleId, items, newTotal }: { saleId: string; items: SaleItem[]; newTotal: number }) => {
      // 1. Recover old items to revert their stock
      const { data: oldItems, error: fetchError } = await supabase
        .from('sale_items')
        .select('product_id, quantity')
        .eq('sale_id', saleId);
      
      if (fetchError) throw fetchError;

      // 2. Revert old stock
      if (oldItems) {
        for (const item of oldItems) {
          await supabase.rpc('increment_stock', {
            p_product_id: item.product_id,
            p_quantity: item.quantity,
          });
        }
      }

      // 3. Delete old items
      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);
      if (deleteError) throw deleteError;

      // 4. Pre-check new stock availability
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

      // 5. Insert new items and decrement stock
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

      // 5. Update sale total
      const { error: updateError } = await supabase
        .from('sales')
        .update({ total_amount: newTotal })
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

  const handleDelete = useCallback((sale: Sale) => {
    Alert.alert(
      'Eliminar Venta',
      `¿Eliminar venta #${sale.id.slice(0, 8).toUpperCase()}? El stock será restaurado.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(sale) },
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

  return (
    <View style={[
      styles.container,
      { paddingTop: Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight || 0) + verticalScale(8) : insets.top }
    ]}>
      <LinearGradient
        colors={['rgba(10, 10, 12, 0.98)', 'rgba(10, 10, 12, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerIconCircle}>
            <Icon name="history" size={24} color={tokens.colors.mahogany} />
          </View>
          <Text style={styles.title}>Historial</Text>
        </View>
        <Badge variant="mahogany">
          {filteredSales.length} ventas
        </Badge>
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
          />
        </View>
      </View>

        <FlashList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: verticalScale(32) + insets.bottom }]}
          // @ts-ignore
          estimatedItemSize={scale(120)}
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
          onDelete={() => handleDelete(selectedSale)}
          onUpdate={(items, total) => updateSaleMutation.mutate({ saleId: selectedSale.id, items, newTotal: total })}
          isDeleting={deleteMutation.isPending}
          isUpdating={updateSaleMutation.isPending}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: tokens.colors.bg,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: verticalScale(24),
    paddingHorizontal: scale(20),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  headerIconCircle: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(28), 
    color: tokens.colors.text, 
    fontWeight: '800',
    lineHeight: moderateScale(34),
  },
  searchRow: { 
    marginBottom: verticalScale(24),
    paddingHorizontal: scale(20),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.pill,
    paddingHorizontal: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    gap: scale(12),
    height: verticalScale(48),
  },
  searchInput: { 
    flex: 1,
    color: tokens.colors.text, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(14),
    fontWeight: '600',
    height: '100%',
  },
  list: { 
    paddingHorizontal: scale(20),
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
});

