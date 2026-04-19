import { View, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, KeyboardAvoidingView, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import React, { useState, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { useCartStore, CartItem, useSettingsStore } from '../store/cartStore';
import { useCreateSale } from '../hooks/useProducts';
import { CartItemRow } from './CartItem';
import { PriceDisplay } from './PriceDisplay';
 import { SaleSummaryModal } from './SaleSummaryModal';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { useToast } from './Toast';
import { tokens } from '../lib/designTokens';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { ClientSelectorModal } from './ClientSelectorModal';
import { ClientBalance } from '../hooks/useClients';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

const TAX_RATE = 0.16;
const PAYMENT_METHODS = [
  { key: 'cash', label: 'Efectivo', icon: 'money-bill' },
  { key: 'card', label: 'Tarjeta', icon: 'credit-card' },
  { key: 'transfer', label: 'Transferencia', icon: 'mobile-alt' },
  { key: 'credito', label: 'Crédito', icon: 'user' },
] as const;

interface SaleResult {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
}

interface CheckoutPanelProps {
  onCloseMobile?: () => void;
}

export const CheckoutPanel = React.memo(function CheckoutPanel({ onCloseMobile }: CheckoutPanelProps) {
  const items = useCartStore((state) => state.items);
  const getTotal = useCartStore((state) => state.getTotal);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const ivaEnabled = useSettingsStore((state) => state.ivaEnabled);
  const toggleIva = useSettingsStore((state) => state.toggleIva);
  
  const [selectedPayment, setSelectedPayment] = useState<typeof PAYMENT_METHODS[number]['key'] | null>(null);
  const [completedSale, setCompletedSale] = useState<SaleResult | null>(null);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientBalance | null>(null);
  const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  const createSale = useCreateSale();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  
  const subtotal = getTotal();
  const tax = ivaEnabled ? parseFloat((subtotal * TAX_RATE).toFixed(2)) : 0;
  const total = parseFloat((subtotal + tax).toFixed(2));

  const confirmSale = useCallback(async () => {
    try {
      const saleItems = items.map((item: CartItem) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      await createSale.mutateAsync({
        totalAmount: total,
        paymentMethod: selectedPayment!,
        items: saleItems,
        clientId: selectedClient?.id,
        ivaEnabled,
        taxAmount: tax,
      });

      setCompletedSale({
        id: `temp-${Date.now()}`,
        items: [...items],
        subtotal,
        tax,
        total,
        paymentMethod: selectedPayment!,
      });

      clearCart();
      setSelectedPayment(null);
      setSelectedClient(null);
      setIsCalculatorVisible(false);
      showToast('Venta completada con éxito', 'success');
    } catch (error) {
      showToast('No se pudo completar la venta', 'error');
      console.error(error);
    }
  }, [items, total, selectedPayment, createSale, subtotal, tax, clearCart, showToast]);

  const handleCheckout = useCallback(async () => {
    if (!selectedPayment) {
      showToast('Selecciona método de pago', 'warning');
      return;
    }
    if (items.length === 0) {
      showToast('Carrito vacío', 'warning');
      return;
    }
    
    if (selectedPayment === 'credito' && !selectedClient) {
      setIsClientModalVisible(true);
      return;
    }

    if (selectedPayment === 'cash') {
      setIsCalculatorVisible(true);
    } else {
      await confirmSale();
    }
  }, [selectedPayment, items, selectedClient, confirmSale, showToast]);

  const handleCloseModal = useCallback(() => {
    setCompletedSale(null);
  }, []);

  const renderCartItem = useCallback((item: CartItem) => (
    <CartItemRow
      key={item.id}
      item={item}
      onIncrement={() => updateQuantity(item.id, item.quantity + 1)}
      onDecrement={() => updateQuantity(item.id, item.quantity - 1)}
      onRemove={() => removeItem(item.id)}
    />
  ), [updateQuantity, removeItem]);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[
        styles.container, 
        { paddingBottom: insets.bottom + verticalScale(8) }
      ]}>
  
        <View style={[
          styles.header, 
          { 
            paddingTop: Platform.OS === 'android' 
              ? Math.max(insets.top, StatusBar.currentHeight || 0) + (onCloseMobile ? verticalScale(14) : verticalScale(10))
              : insets.top + (onCloseMobile ? verticalScale(14) : verticalScale(10))
          }
        ]}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <View style={styles.iconContainer}>
              <Icon name="shopping-cart" size={20} color={tokens.colors.mahogany} />
            </View>
            <Text style={styles.title}>Carrito</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCount}>{items.length}</Text>
            </View>
            {onCloseMobile && (
              <TouchableOpacity onPress={onCloseMobile} style={styles.closeButton}>
                <Icon name="close" size={24} color={tokens.colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.itemsList} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.itemsContent}
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Icon name="cart" size={48} color="rgba(184, 123, 90, 0.6)" />
            </View>
            <Text style={styles.emptyText}>Carrito vacío</Text>
            <Text style={styles.emptySubtext}>Toca un producto para agregarlo</Text>
          </View>
        ) : (
          items.map(renderCartItem)
        )}
      </ScrollView>

      <View style={styles.summary}>
        <View style={[styles.summaryCard, { borderRadius: tokens.radius.xl }]}>
          <LinearGradient
            colors={['rgba(26, 26, 26, 0.8)', 'rgba(12, 12, 12, 0.5)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.ivaRow} 
            onPress={toggleIva}
            activeOpacity={0.7}
          >
            <View style={styles.ivaLabelContainer}>
              <View style={[styles.checkbox, ivaEnabled && styles.checkboxActive]}>
                {ivaEnabled && <Icon name="check" size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.ivaLabel}>IVA (16%)</Text>
            </View>
            <Text style={[styles.summaryValue, ivaEnabled && styles.taxValue]}>
              ${tax.toFixed(2)}
            </Text>
          </TouchableOpacity>
          <View style={styles.totalRow}>
            <View style={styles.totalLabelContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={[styles.totalBadge, { backgroundColor: tokens.colors.mahoganyDim }]}>
                <Text style={[styles.totalBadgeText, { color: tokens.colors.mahogany }]}>
                  {ivaEnabled ? 'IVA incl.' : 'Sin IVA'}
                </Text>
              </View>
            </View>
            <PriceDisplay amount={total} size="xl" />
          </View>
        </View>
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Método de pago</Text>
        <View style={styles.paymentChips}>
          {PAYMENT_METHODS.map((method) => {
            const isActive = selectedPayment === method.key;
            return (
              <TouchableOpacity
                key={method.key}
                style={[styles.paymentChip, isActive && styles.paymentChipActive]}
                onPress={() => setSelectedPayment(method.key)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.paymentChipIconCircle,
                  isActive && { backgroundColor: 'rgba(184, 123, 90, 0.2)' }
                ]}>
                  <Icon 
                    name={method.icon} 
                    size={18} 
                    color={isActive ? tokens.colors.mahogany : tokens.colors.textMuted} 
                  />
                </View>
                <Text style={[styles.paymentChipText, isActive && styles.paymentChipTextActive]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedPayment === 'credito' && (
          <View style={styles.clientSelectionBox}>
            {selectedClient ? (
              <View style={styles.selectedClientRow}>
                <View style={styles.selectedClientInfo}>
                  <Icon name="user" size={20} color={tokens.colors.text} />
                  <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsClientModalVisible(true)} style={styles.changeClientBtn}>
                  <Text style={styles.changeClientText}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.selectClientBtn} onPress={() => setIsClientModalVisible(true)}>
                <Icon name="user-plus" size={22} color="#B87B5A" />
                <Text style={styles.selectClientText}>Seleccionar Cliente</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.checkoutButton,
          (!selectedPayment || items.length === 0 || createSale.isPending) && styles.checkoutButtonDisabled,
        ]}
        onPress={handleCheckout}
        disabled={!selectedPayment || items.length === 0 || createSale.isPending}
        activeOpacity={0.85}
      >
        <View style={[
          styles.checkoutContent, 
          (!selectedPayment || items.length === 0) ? styles.checkoutContentDisabled : styles.checkoutContentActive
        ]}>
          <Icon name="check" size={22} color="#F0F0F2" />
          <Text style={styles.checkoutText}>
            {createSale.isPending ? 'Procesando...' : 'Completar Venta'}
          </Text>
        </View>
      </TouchableOpacity>

      {completedSale && (
        <SaleSummaryModal
          visible={true}
          saleId={completedSale.id}
          items={completedSale.items}
          total={completedSale.total}
          tax={completedSale.tax}
          subtotal={completedSale.subtotal}
          paymentMethod={completedSale.paymentMethod}
          onClose={handleCloseModal}
        />
      )}

      <ChangeCalculatorModal
        visible={isCalculatorVisible}
        total={total}
        onClose={() => setIsCalculatorVisible(false)}
        onConfirm={confirmSale}
      />

      <ClientSelectorModal
        visible={isClientModalVisible}
        onClose={() => setIsClientModalVisible(false)}
        onSelectClient={setSelectedClient}
      />
      </View>
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  itemCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  itemCount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: tokens.colors.textDim,
  },
  closeButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  itemsList: {
    flex: 1,
  },
  itemsContent: {
    padding: scale(12),
    paddingBottom: verticalScale(20),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(60),
  },
  emptyIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.textDim,
  },
  emptySubtext: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
    marginTop: verticalScale(4),
  },
  summary: {
    padding: scale(16),
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.xl,
    padding: scale(20),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
  },
  summaryLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textDim,
  },
  summaryValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  ivaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
    paddingVertical: verticalScale(4),
  },
  ivaLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: tokens.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  checkboxActive: {
    backgroundColor: tokens.colors.mahogany,
    borderColor: tokens.colors.mahogany,
  },
  ivaLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.textDim,
  },
  taxValue: {
    color: tokens.colors.mahogany,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(12),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderLight,
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  totalLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  totalBadge: {
    backgroundColor: 'rgba(109, 184, 138, 0.1)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(109, 184, 138, 0.2)',
  },
  totalBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(10),
    fontWeight: '800',
    color: tokens.colors.sage,
  },
  paymentSection: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  sectionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: tokens.colors.textDim,
    marginBottom: verticalScale(14),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  paymentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(10),
  },
  paymentChip: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    height: verticalScale(54),
    borderRadius: tokens.radius.lg,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    paddingHorizontal: scale(12),
  },
  paymentChipActive: {
    backgroundColor: tokens.colors.mahoganyDim,
    borderColor: tokens.colors.mahogany,
  },
  paymentChipIconCircle: {
     width: scale(32),
     height: scale(32),
     borderRadius: scale(16),
     backgroundColor: 'rgba(255, 255, 255, 0.05)',
     justifyContent: 'center',
     alignItems: 'center',
     borderWidth: 1,
     borderColor: tokens.colors.borderLight,
  },
  paymentChipText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.textDim,
  },
  paymentChipTextActive: {
    color: tokens.colors.text,
  },
  checkoutButton: {
    marginHorizontal: scale(20),
    marginBottom: verticalScale(20),
  },
  checkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(12),
    height: verticalScale(56),
    borderRadius: tokens.radius.pill,
  },
  checkoutContentActive: {
    backgroundColor: tokens.colors.mahogany,
    shadowColor: tokens.colors.mahogany,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  checkoutContentDisabled: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  checkoutButtonDisabled: {
    opacity: 0.5,
  },
  checkoutText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  clientSelectionBox: {
    marginTop: verticalScale(16),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    padding: scale(12),
  },
  selectClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    height: verticalScale(40),
  },
  selectClientText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.mahogany,
  },
  selectedClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  selectedClientName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  changeClientBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  changeClientText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: tokens.colors.text,
  },
});
