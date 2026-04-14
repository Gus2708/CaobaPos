import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Text } from '../components/Text';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  sale_items?: SaleItem[];
}

const SaleCard = memo(function SaleCard({ 
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

  const getPaymentLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
    };
    return labels[method] || method;
  };

  return (
    <View style={styles.saleCard}>
      <LinearGradient
        colors={['rgba(10, 10, 12, 0.5)', 'rgba(10, 10, 12, 0.3)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topBorder} />
      
      <View style={styles.saleHeader}>
        <View style={styles.saleInfo}>
          <View style={styles.idContainer}>
            <Text style={styles.saleId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
          </View>
          <Text style={styles.saleDate}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.totalContainer}>
          <Text style={styles.saleTotal}>${Number(item.total_amount).toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.saleFooter}>
        <View style={styles.paymentBadge}>
          <Icon name="credit-card" size={14} color={tokens.colors.mahogany} />
          <Text style={styles.paymentText}>{getPaymentLabel(item.payment_method)}</Text>
        </View>
        <View style={styles.saleActions}>
          <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.7}>
            <Text style={styles.btnText}>Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
            <Icon name="trash" size={14} color={tokens.colors.coral} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export const HistoryPanel = memo(function HistoryPanel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const { showToast } = useToast();

  const { data: sales, isLoading, refetch, isRefetching } = useQuery<Sale[]>({
    queryKey: ['sales-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

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
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(10, 10, 12, 0.98)', 'rgba(10, 10, 12, 0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.titleIcon}>
            <Icon name="document" size={20} color="#B87B5A" />
          </View>
          <Text style={styles.title}>Historial</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.count}>{filteredSales.length} ventas</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={18} color="#8A8A96" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por folio o método..."
            placeholderTextColor="#6A6A72"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.colors.mahogany} />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="document" size={48} color="rgba(184, 123, 90, 0.3)" />
              <Text style={styles.empty}>Sin ventas registradas</Text>
            </View>
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
      )}

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
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    padding: scale(16),
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: verticalScale(16),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  titleIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(22), 
    color: tokens.colors.text, 
    fontWeight: '700', 
    letterSpacing: scale(1),
  },
  countBadge: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  count: { 
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(13), 
    color: tokens.colors.mahogany,
    fontWeight: '600',
  },
  searchRow: { 
    marginBottom: verticalScale(16),
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    borderRadius: scale(14),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(4),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.15)',
    gap: scale(10),
  },
  searchInput: { 
    flex: 1,
    color: tokens.colors.text, 
    paddingVertical: verticalScale(14), 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(15),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: verticalScale(12),
  },
  loadingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
  },
  list: { 
    paddingBottom: verticalScale(20),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(80),
    gap: verticalScale(12),
  },
  empty: { 
    color: tokens.colors.textMuted, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(16),
    fontWeight: '600',
    textAlign: 'center', 
    marginTop: verticalScale(8) 
  },
  saleCard: {
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    padding: scale(16), 
    borderRadius: scale(20), 
    marginBottom: verticalScale(12), 
    borderWidth: 1, 
    borderColor: 'rgba(184, 123, 90, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  saleHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: verticalScale(12),
  },
  saleInfo: {
    flex: 1,
  },
  idContainer: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    alignSelf: 'flex-start',
    marginBottom: verticalScale(6),
  },
  saleId: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(13), 
    color: tokens.colors.mahogany, 
    fontWeight: '600',
    letterSpacing: scale(0.5),
  },
  saleDate: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(12), 
    color: tokens.colors.textMuted,
  },
  totalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  saleTotal: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(20), 
    color: tokens.colors.text, 
    fontWeight: '700',
  },
  saleFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
  },
  paymentBadge: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(184, 123, 90, 0.15)', 
    paddingHorizontal: scale(12), 
    paddingVertical: verticalScale(8), 
    borderRadius: scale(10), 
    borderWidth: 1, 
    borderColor: 'rgba(184, 123, 90, 0.2)',
    gap: scale(6),
  },
  paymentText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(12), 
    color: tokens.colors.mahogany, 
    fontWeight: '600',
  },
  saleActions: { 
    flexDirection: 'row',
    gap: scale(8),
  },
  viewBtn: { 
    backgroundColor: 'rgba(184, 123, 90, 0.8)', 
    paddingHorizontal: scale(18), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(12),
    minWidth: scale(70),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.4)',
  },
  deleteBtn: { 
    backgroundColor: 'rgba(201, 107, 107, 0.2)', 
    paddingHorizontal: scale(14), 
    paddingVertical: verticalScale(10), 
    borderRadius: scale(12), 
    minWidth: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.3)',
  },
  btnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: moderateScale(13), 
    fontWeight: '600', 
    color: tokens.colors.text, 
    textAlign: 'center' 
  },
});

