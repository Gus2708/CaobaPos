import React, { useState, useMemo, useCallback } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList, ScrollView, Platform, KeyboardAvoidingView, Alert, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Text } from './Text';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useClientPayments, useClientCreditSales, useAddPayment, useDeletePayment, useDeleteClient, ClientBalance } from '../hooks/useClients';
import { useToast } from './Toast';
import { SaleDetailModal } from './SaleDetailModal';
import { supabase } from '../lib/supabase';

interface ClientDetailsModalProps {
  visible: boolean;
  client: ClientBalance | null;
  onClose: () => void;
}

export const ClientDetailsModal = React.memo(function ClientDetailsModal({ visible, client, onClose }: ClientDetailsModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'history' | 'payment'>('history');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [loadingSaleDetail, setLoadingSaleDetail] = useState(false);
  
  const { data: payments, isLoading: loadsPayments } = useClientPayments(client?.id ?? null);
  const { data: sales, isLoading: loadsSales } = useClientCreditSales(client?.id ?? null);
  const addPayment = useAddPayment();
  const deletePayment = useDeletePayment();
  const deleteClient = useDeleteClient();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const deleteSaleMutation = useMutation({
    mutationFn: async (sale: any) => {
      // 1. Revert stock
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

      // 2. Clear payments linked to this sale
      await supabase
        .from('client_payments')
        .delete()
        .eq('sale_id', sale.id);

      // 3. Delete sale items
      await supabase
        .from('sale_items')
        .delete()
        .eq('sale_id', sale.id);

      // 4. Delete the sale itself
      const { error: saleError } = await supabase
        .from('sales')
        .delete()
        .eq('id', sale.id);
      if (saleError) throw saleError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
      if (client?.id) {
        queryClient.invalidateQueries({ queryKey: ['client_credit_sales', client.id] });
        queryClient.invalidateQueries({ queryKey: ['client_payments', client.id] });
      }
      setSelectedSale(null);
      showToast('Venta eliminada y stock restaurado', 'success');
    },
    onError: () => showToast('No se pudo eliminar la venta', 'error'),
  });

  const updateSaleMutation = useMutation({
    mutationFn: async ({ saleId, items, newTotal, ivaEnabled, taxAmount }: { 
      saleId: string; 
      items: any[]; 
      newTotal: number;
      ivaEnabled: boolean;
      taxAmount: number;
    }) => {
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

      // 4. Insert new items and decrement stock
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

      // 5. Update sale total and IVA fields
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['clients_balances'] });
      if (client?.id) {
        queryClient.invalidateQueries({ queryKey: ['client_credit_sales', client.id] });
      }
      setSelectedSale(null);
      showToast('Venta actualizada', 'success');
    },
    onError: (e: any) => showToast(e.message || 'No se pudo actualizar la venta', 'error'),
  });

  const handleOpenSaleDetail = async (saleId: string, saleData: any) => {
    try {
      setLoadingSaleDetail(true);
      const { data: items, error } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', saleId);
      if (error) throw error;
      setSelectedSale({ ...saleData, sale_items: items ?? [] });
    } catch (e) {
      showToast('No se pudieron cargar los detalles', 'error');
    } finally {
      setLoadingSaleDetail(false);
    }
  };

  const saleBalances = useMemo(() => {
    if (!sales || !payments) return new Map();
    
    // Sort chronologically (oldest first)
    const sortedSales = [...sales].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const sortedPayments = [...payments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    const balances = new Map();
    sortedSales.forEach(s => {
      balances.set(s.id, { 
        total: Number(s.total_amount), 
        paid: 0, 
        remaining: Number(s.total_amount) 
      });
    });

    let generalPool = 0;

    // Apply specific payments first
    sortedPayments.forEach(p => {
      const amount = Number(p.amount);
      if (p.sale_id && balances.has(p.sale_id)) {
        const b = balances.get(p.sale_id);
        const overpayment = Math.max(0, (b.paid + amount) - b.total);
        const applied = amount - overpayment;
        
        b.paid += applied;
        b.remaining = Math.max(0, b.total - b.paid);
        
        // Overflow goes to general pool
        generalPool += overpayment;
      } else {
        generalPool += amount;
      }
    });

    // Apply general pool FIFO
    if (generalPool > 0.001) {
      sortedSales.forEach(s => {
        const b = balances.get(s.id);
        if (b.remaining > 0.001 && generalPool > 0.001) {
          const applied = Math.min(b.remaining, generalPool);
          b.paid += applied;
          b.remaining = Math.max(0, b.total - b.paid);
          generalPool -= applied;
        }
      });
    }

    return balances;
  }, [sales, payments]);

  if (!client) return null;

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Ingresa un monto válido', 'warning');
      return;
    }
    
    if (amount > client.balance_due + 0.01) {
      showToast(`El saldo es de $${client.balance_due.toFixed(2)}`, 'warning');
      return;
    }

    try {
      // Simplificado: Creamos un solo registro de abono a la cuenta general.
      // La lógica FIFO del frontend se encarga de distribuirlo entre las deudas.
      await addPayment.mutateAsync({
        clientId: client.id,
        amount: amount,
        paymentMethod: 'cash',
        // No enviamos saleId para que sea un abono general a la cuenta
      });

      showToast('Abono registrado con éxito', 'success');
      setPaymentAmount('');
      setActiveTab('history');
    } catch (e) {
      console.error(e);
      showToast('Error al registrar abono', 'error');
    }
  };

  const handleSaldarSale = async (sale: any, balance: any) => {
    try {
      await addPayment.mutateAsync({
        clientId: client.id,
        amount: balance.remaining,
        paymentMethod: 'cash',
        saleId: sale.id,
      });
      showToast('Venta saldada con éxito', 'success');
    } catch (e) {
      showToast('Error al saldar venta', 'error');
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    Alert.alert(
      'Eliminar Abono',
      '¿Estás seguro de que deseas eliminar este abono? Esto afectará el saldo del cliente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deletePayment.mutateAsync({ paymentId, clientId: client.id });
              showToast('Abono eliminado', 'success');
            } catch (e) {
              showToast('Error al eliminar abono', 'error');
            }
          } 
        },
      ]
    );
  };
  const handleDeleteClient = () => {
    if (client.balance_due > 0) {
      Alert.alert(
        'No se puede eliminar',
        'Este cliente tiene una deuda pendiente. Debes saldar la cuenta antes de eliminarlo.'
      );
      return;
    }

    Alert.alert(
      'Eliminar Cliente',
      `¿Estás seguro de que deseas eliminar a "${client.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await deleteClient.mutateAsync(client.id);
              showToast('Cliente eliminado', 'success');
              onClose();
            } catch (e) {
              showToast('Error al eliminar cliente', 'error');
            }
          } 
        },
      ]
    );
  };

  const renderHistoryItem = ({ item, isPayment = false }: { item: any, isPayment?: boolean }) => {
    const date = new Date(item.created_at).toLocaleDateString('es-MX', { 
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });

    const accentColor = isPayment ? tokens.colors.sage : tokens.colors.mahogany;
    const borderColor = isPayment ? tokens.colors.sageDim : tokens.colors.mahoganyDim;
    const gradientColors = ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)'] as const;

    const balance = !isPayment ? saleBalances.get(item.id) : null;
    const isPaid = balance && balance.remaining <= 0.01;
    const isPartial = balance && balance.paid > 0 && balance.remaining > 0.01;

    const statusLabel = isPaid ? 'Pagada' : isPartial ? 'Parcial' : 'Pendiente';
    const statusColor = isPaid ? tokens.colors.sage : isPartial ? '#F59E0B' : '#EF4444';

    const content = (
      <View style={[styles.historyCard, { borderColor: isPaid ? tokens.colors.border : (isPayment ? tokens.colors.sageDim : statusColor + '40'), opacity: isPaid ? 0.7 : 1 }]}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.historyCardInner}>
          {/* Section Left: Icon */}
          <View style={[styles.historyIcon, { backgroundColor: `${isPayment ? accentColor : statusColor}08`, borderColor: `${isPayment ? accentColor : statusColor}15` }]}>
            <Icon name={isPayment ? 'money-bill' : 'shopping-cart'} size={20} color={isPayment ? accentColor : statusColor} />
          </View>

          {/* Section Center: Info */}
          <View style={styles.historyInfo}>
            <View style={styles.historyHeaderRow}>
              <Text style={styles.historyTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{isPayment ? 'Abono realizado' : 'Venta a crédito'}</Text>
            </View>
            <Text style={styles.historyDate}>{date}</Text>
            {!isPayment && !isPaid && (
              <View style={styles.remainingBadge}>
                <Text style={styles.remainingText}>
                  Resta: <Text style={styles.remainingValue}>${balance.remaining.toFixed(2)}</Text>
                </Text>
              </View>
            )}
          </View>

          {/* Section Right: Value & Actions */}
          <View style={styles.historyRight}>
            <Text style={[styles.historyAmount, isPayment ? styles.historyAmountPayment : isPaid ? styles.historyAmountPaid : styles.historyAmountSale]}>
              {isPayment ? '+' : '-'}${parseFloat(item.amount || item.total_amount).toFixed(2)}
            </Text>
            
            <View style={styles.historyActionsRow}>
              {!isPayment && (
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15`, marginRight: scale(4) }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor, fontSize: moderateScale(9) }]}>{statusLabel}</Text>
                </View>
              )}
              
              {isPayment ? (
                <TouchableOpacity onPress={() => handleDeletePayment(item.id)} style={styles.miniActionBtn}>
                  <Icon name="trash" size={16} color={tokens.colors.coral} />
                </TouchableOpacity>
              ) : (
                <>
                  {!isPaid && (
                    <TouchableOpacity style={styles.settleButtonCompact} onPress={() => handleSaldarSale(item, balance)}>
                      <Text style={styles.settleButtonTextSmall}>Saldar</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleOpenSaleDetail(item.id, item)} style={styles.miniActionBtn}>
                    <Icon name="chevron-right" size={16} color={tokens.colors.mahogany} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    );

    return content;
  };

  const isLoading = loadsPayments || loadsSales;
  
  // Interleave and sort both histories
  const combinedHistory = [
    ...(payments?.map(p => ({ ...p, isPayment: true })) || []),
    ...(sales?.map(s => ({ ...s, isPayment: false })) || [])
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <View style={[
            styles.modalContainer, 
            { 
              paddingTop: Platform.OS === 'android' ? Math.max(insets.top, StatusBar.currentHeight || 0) + verticalScale(8) : 0,
              paddingBottom: Math.max(insets.bottom, verticalScale(16)) 
            }
          ]}>
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.title}>{client.name}</Text>
                <Text style={styles.subtitle}>{client.phone || 'Sin número registrado'}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={handleDeleteClient} 
                style={styles.deleteClientButton}
                activeOpacity={0.7}
              >
                 <Icon name="trash" size={20} color={tokens.colors.coral} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
                <Icon name="close" size={24} color={tokens.colors.textDim} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Balance Overview */}
          <View style={styles.balanceContainer}>
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Deuda Total</Text>
              <Text style={styles.balanceAmount}>${client.total_credit_sales.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Abonado</Text>
              <Text style={styles.balanceAmountPaid}>${client.total_paid.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceBox}>
              <Text style={styles.balanceLabel}>Saldo Actual</Text>
              <Text style={[styles.balanceAmountNet, client.balance_due > 0 ? styles.amountRed : styles.amountGreen]}>
                ${client.balance_due.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>Historial</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'payment' && styles.tabActive]}
              onPress={() => setActiveTab('payment')}
            >
              <Text style={[styles.tabText, activeTab === 'payment' && styles.tabTextActive]}>Abonar</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.contentContainer}>
            {activeTab === 'history' ? (
              isLoading ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={tokens.colors.mahogany} />
                </View>
              ) : (
                <FlatList
                  data={combinedHistory}
                  keyExtractor={(item, index) => item.id || `hist-${index}`}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => renderHistoryItem({ item, isPayment: item.isPayment })}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>Sin movimientos recientes</Text>
                    </View>
                  }
                />
              )
            ) : (
              <ScrollView contentContainerStyle={styles.paymentContainer}>
                <Text style={styles.paymentInstruction}>Ingresa el monto a abonar en la cuenta:</Text>
                
                <View style={styles.paymentInputWrapper}>
                  <Text style={styles.paymentCurrency}>$</Text>
                  <TextInput
                    style={styles.paymentInput}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    autoFocus
                  />
                </View>

                {client.balance_due > 0 && (
                  <View style={styles.quickAmounts}>
                    <TouchableOpacity 
                      style={styles.quickAmountBtn}
                      onPress={() => setPaymentAmount(client.balance_due.toFixed(2))}
                    >
                      <Text style={styles.quickAmountText}>Saldar deuda completa</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <TouchableOpacity 
                  style={[styles.submitButton, addPayment.isPending && styles.submitButtonDisabled]}
                  onPress={handleAddPayment}
                  disabled={addPayment.isPending || !paymentAmount}
                >
                  {addPayment.isPending ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Registrar Abono</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Sale detail nested modal */}
      {selectedSale && (
        <SaleDetailModal
          visible={!!selectedSale}
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onDelete={() => deleteSaleMutation.mutate(selectedSale)}
          onUpdate={(items, total, ivaEnabled, taxAmount: number) => 
            updateSaleMutation.mutate({ 
              saleId: selectedSale.id, 
              items, 
              newTotal: total,
              ivaEnabled,
              taxAmount
            })
          }
          isDeleting={deleteSaleMutation.isPending}
          isUpdating={updateSaleMutation.isPending}
          readOnly={false}
        />
      )}

      {/* Loading overlay while fetching sale items */}
      {loadingSaleDetail && (
        <Modal visible transparent animationType="fade">
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={tokens.colors.mahogany} />
          </View>
        </Modal>
      )}
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: tokens.colors.bg,
    borderTopLeftRadius: tokens.radius.modal,
    borderTopRightRadius: tokens.radius.modal,
    height: '92%',
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingTop: scale(12),
    paddingBottom: scale(16),
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  avatarCircle: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  avatarText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  subtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textDim,
    marginTop: verticalScale(2),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  deleteClientButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  closeButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: tokens.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  balanceContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    marginHorizontal: scale(20),
    marginVertical: verticalScale(16),
    borderRadius: tokens.radius.lg,
    padding: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  balanceBox: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: '60%',
    backgroundColor: tokens.colors.borderLight,
  },
  balanceLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: tokens.colors.textDim,
    textTransform: 'uppercase',
    marginBottom: verticalScale(4),
  },
  balanceAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
    color: tokens.colors.text,
    fontWeight: '700',
  },
  balanceAmountPaid: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
    color: tokens.colors.sage,
    fontWeight: '700',
  },
  balanceAmountNet: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(18),
    fontWeight: '800',
  },
  amountRed: { color: tokens.colors.coral },
  amountGreen: { color: tokens.colors.sage },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(10),
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  tabActive: {
    backgroundColor: tokens.colors.mahogany,
    borderColor: tokens.colors.mahogany,
  },
  tabText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.textDim,
  },
  tabTextActive: {
    color: '#FFF',
  },
  contentContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: scale(20),
    paddingBottom: verticalScale(100),
  },
   historyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: verticalScale(12),
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    padding: scale(12),
    overflow: 'hidden',
  },
  historyCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIcon: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(11),
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: scale(10),
    borderWidth: 1,
  },
  historyInfo: {
    flex: 1,
  },
   historyTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  historyDate: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textDim,
    marginTop: verticalScale(2),
  },
   historyAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: verticalScale(4),
  },
  historyAmountPayment: { color: tokens.colors.sage },
  historyAmountSale: { color: tokens.colors.coral },
  historyAmountPaid: {
    color: tokens.colors.sage,
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: tokens.radius.pill,
  },
  statusBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(10),
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  deleteAction: {
    padding: scale(8),
  },
   historyActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: scale(6),
  },
  miniActionBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleButtonCompact: {
    backgroundColor: tokens.colors.sage,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
  },
  settleButtonTextSmall: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: '#FFF',
  },
  remainingBadge: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
    marginTop: verticalScale(4),
  },
  paymentContainer: {
    padding: scale(24),
  },
  paymentInstruction: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textDim,
    textAlign: 'center',
    marginBottom: verticalScale(24),
  },
  paymentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(32),
  },
  paymentCurrency: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(32),
    fontWeight: '800',
    color: tokens.colors.mahogany,
    marginRight: scale(8),
  },
  paymentInput: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(42),
    fontWeight: '800',
    color: tokens.colors.text,
    minWidth: scale(150),
    textAlign: 'center',
  },
  quickAmounts: {
    marginBottom: verticalScale(32),
  },
  quickAmountBtn: {
    backgroundColor: tokens.colors.mahoganyDim,
    paddingVertical: verticalScale(14),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
    alignItems: 'center',
  },
  quickAmountText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  submitButton: {
    backgroundColor: tokens.colors.mahogany,
    paddingVertical: verticalScale(16),
    borderRadius: tokens.radius.pill,
    alignItems: 'center',
    shadowColor: tokens.colors.mahogany,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#FFF',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: verticalScale(40),
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textDim,
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  remainingText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textDim,
    marginTop: verticalScale(2),
  },
  remainingValue: {
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  historyRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: verticalScale(8),
  },
});
