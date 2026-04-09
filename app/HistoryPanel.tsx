import React, { useState, useMemo, memo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { Icon } from '../components/Icon';

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
        colors={['rgba(30, 30, 36, 0.5)', 'rgba(20, 20, 26, 0.3)']}
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
          <Icon name="credit-card" size={14} color="#B87B5A" />
          <Text style={styles.paymentText}>{getPaymentLabel(item.payment_method)}</Text>
        </View>
        <View style={styles.saleActions}>
          <TouchableOpacity style={styles.viewBtn} onPress={onView} activeOpacity={0.7}>
            <Text style={styles.btnText}>Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
            <Icon name="trash" size={14} color="#C96B6B" />
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

      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);
      if (saleError) throw saleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setShowDetail(false);
      setSelectedSale(null);
      Alert.alert('Éxito', 'Venta eliminada y stock restaurado');
    },
    onError: () => Alert.alert('Error', 'No se pudo eliminar la venta'),
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ saleId, items, newTotal }: { saleId: string; items: SaleItem[]; newTotal: number }) => {
      const { error: deleteError } = await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', saleId);
      if (deleteError) throw deleteError;

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
      }

      const { error: updateError } = await supabase
        .from('sales')
        .update({ total_amount: newTotal })
        .eq('id', saleId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      setShowDetail(false);
      setSelectedSale(null);
      Alert.alert('Éxito', 'Venta actualizada');
    },
    onError: () => Alert.alert('Error', 'No se pudo actualizar la venta'),
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
      Alert.alert('Error', 'No se pudieron cargar los detalles');
    }
  }, []);

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
        colors={['rgba(20, 20, 26, 0.98)', 'rgba(10, 10, 12, 0.95)']}
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
          <ActivityIndicator size="large" color="#B87B5A" />
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
              tintColor="#B87B5A"
              progressBackgroundColor="rgba(30, 30, 36, 0.8)"
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
    padding: 16,
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  title: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 22, 
    color: '#F0F0F2', 
    fontWeight: '700', 
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  count: { 
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 13, 
    color: '#B87B5A',
    fontWeight: '600',
  },
  searchRow: { 
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 36, 0.5)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.15)',
    gap: 10,
  },
  searchInput: { 
    flex: 1,
    color: '#F0F0F2', 
    paddingVertical: 14, 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#8A8A96',
  },
  list: { 
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  empty: { 
    color: '#8A8A96', 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center', 
    marginTop: 8 
  },
  saleCard: {
    position: 'relative',
    backgroundColor: 'rgba(30, 30, 36, 0.5)',
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12, 
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
    marginBottom: 12,
  },
  saleInfo: {
    flex: 1,
  },
  idContainer: {
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  saleId: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: 13, 
    color: '#B87B5A', 
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  saleDate: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 12, 
    color: '#8A8A96',
  },
  totalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  saleTotal: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: 20, 
    color: '#F0F0F2', 
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
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: 'rgba(184, 123, 90, 0.2)',
    gap: 6,
  },
  paymentText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 12, 
    color: '#B87B5A', 
    fontWeight: '600',
  },
  saleActions: { 
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: { 
    backgroundColor: 'rgba(184, 123, 90, 0.8)', 
    paddingHorizontal: 18, 
    paddingVertical: 10, 
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.4)',
  },
  deleteBtn: { 
    backgroundColor: 'rgba(201, 107, 107, 0.2)', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 12, 
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.3)',
  },
  btnText: { 
    fontFamily: FontNames.instrumentSans, 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#F0F0F2', 
    textAlign: 'center' 
  },
});
