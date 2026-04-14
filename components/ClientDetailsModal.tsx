import React, { useState } from 'react';
import { View, Modal, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, FlatList, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { Text } from './Text';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { useClientPayments, useClientCreditSales, useAddPayment, useDeletePayment, useDeleteClient, ClientBalance } from '../hooks/useClients';
import { useToast } from './Toast';
import { Alert } from 'react-native';

interface ClientDetailsModalProps {
  visible: boolean;
  client: ClientBalance | null;
  onClose: () => void;
}

export function ClientDetailsModal({ visible, client, onClose }: ClientDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'payment'>('history');
  const [paymentAmount, setPaymentAmount] = useState('');
  
  const { data: payments, isLoading: loadsPayments } = useClientPayments(client?.id ?? null);
  const { data: sales, isLoading: loadsSales } = useClientCreditSales(client?.id ?? null);
  const addPayment = useAddPayment();
  const deletePayment = useDeletePayment();
  const deleteClient = useDeleteClient();
  const { showToast } = useToast();

  if (!client) return null;

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showToast('Ingresa un monto válido', 'warning');
      return;
    }
    
    if (amount > client.balance_due + 0.01) { // 1 cent threshold for float noise
      showToast(`El saldo es de $${client.balance_due.toFixed(2)}`, 'warning');
      return;
    }

    try {
      // Auto-link to the most recent credit sale so if the user deletes it, the payment is also cleaned up
      const saleToLink = sales && sales.length > 0 ? sales[0].id : undefined;

      await addPayment.mutateAsync({
        clientId: client.id,
        amount,
        paymentMethod: 'cash', // Default to cash, could be expanded later
        saleId: saleToLink,
      });
      showToast('Abono registrado con éxito', 'success');
      setPaymentAmount('');
      setActiveTab('history');
    } catch (e) {
      console.error(e);
      showToast('Error al registrar abono', 'error');
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
    
    return (
      <View style={styles.historyItem}>
        <View style={[styles.historyIcon, isPayment ? styles.historyIconPayment : styles.historyIconSale]}>
          <Icon name={isPayment ? 'money-bill' : 'shopping-cart'} size={14} color={isPayment ? '#10B981' : '#F59E0B'} />
        </View>
        <View style={styles.historyInfo}>
          <Text style={styles.historyTitle}>{isPayment ? 'Abono realizado' : 'Venta a crédito'}</Text>
          <Text style={styles.historyDate}>{date}</Text>
        </View>
        <View style={styles.historyRight}>
          <Text style={[styles.historyAmount, isPayment ? styles.historyAmountPayment : styles.historyAmountSale]}>
            {isPayment ? '+' : '-'}${parseFloat(item.amount || item.total_amount).toFixed(2)}
          </Text>
          {isPayment && (
            <TouchableOpacity 
              onPress={() => handleDeletePayment(item.id)}
              style={styles.deleteAction}
            >
              <Icon name="trash" size={12} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
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
          <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{client.name}</Text>
              <Text style={styles.subtitle}>{client.phone || 'Sin teléfono'}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={handleDeleteClient} 
                style={[styles.actionButton, styles.deleteClientButton]}
              >
                <Icon name="trash" size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Icon name="close" size={24} color={tokens.colors.textSecondary} />
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: 'rgba(10, 10, 12, 0.95)',
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    height: '88%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  subtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  closeButton: {
    padding: scale(4),
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: scale(10),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  actionButton: {
    padding: scale(6),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteClientButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  balanceContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    margin: scale(16),
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  balanceBox: {
    flex: 1,
    alignItems: 'center',
  },
  balanceDivider: {
    width: 1,
    height: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  balanceLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    color: tokens.colors.textSecondary,
    marginBottom: verticalScale(4),
  },
  balanceAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    color: tokens.colors.text,
    fontWeight: '600',
  },
  balanceAmountPaid: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    color: '#10B981',
    fontWeight: '600',
  },
  balanceAmountNet: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  amountRed: { color: '#EF4444' },
  amountGreen: { color: '#10B981' },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(14),
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: tokens.colors.mahogany,
  },
  tabText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textSecondary,
  },
  tabTextActive: {
    color: tokens.colors.mahogany,
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
    padding: scale(16),
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  historyIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  historyIconPayment: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  historyIconSale: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: tokens.colors.text,
  },
  historyDate: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  historyAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  historyAmountPayment: {
    color: '#10B981',
  },
  historyAmountSale: {
    color: '#EF4444',
  },
  historyRight: {
    alignItems: 'flex-end',
    gap: verticalScale(4),
  },
  deleteAction: {
    padding: scale(4),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: scale(6),
  },
  emptyContainer: {
    padding: scale(40),
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: tokens.colors.textSecondary,
  },
  paymentContainer: {
    padding: scale(20),
    alignItems: 'center',
  },
  paymentInstruction: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    color: tokens.colors.text,
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  paymentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: verticalScale(20),
  },
  paymentCurrency: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(30),
    fontWeight: '700',
    color: tokens.colors.textSecondary,
    marginBottom: verticalScale(6),
    marginRight: scale(8),
  },
  paymentInput: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(48),
    fontWeight: '700',
    color: tokens.colors.mahoganyBright,
    minWidth: scale(120),
    textAlign: 'center',
    padding: 0,
  },
  quickAmounts: {
    marginBottom: verticalScale(30),
  },
  quickAmountBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  quickAmountText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#10B981',
  },
  submitButton: {
    backgroundColor: tokens.colors.mahogany,
    width: '100%',
    height: verticalScale(50),
    borderRadius: scale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
