import { View, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Text';
import { useState, memo, useCallback } from 'react';
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

export const CheckoutPanel = memo(function CheckoutPanel({ onCloseMobile }: CheckoutPanelProps) {
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
      <View style={[styles.container, { paddingBottom: insets.bottom + verticalScale(8) }]}>
  
        <View style={[styles.header, { paddingTop: insets.top + (onCloseMobile ? verticalScale(14) : verticalScale(10)) }]}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <View style={styles.iconContainer}>
              <Icon name="shopping-cart" size={18} color={tokens.colors.mahogany} />
            </View>
            <Text style={styles.title}>Carrito</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCount}>{items.length}</Text>
            </View>
            {onCloseMobile && (
              <TouchableOpacity onPress={onCloseMobile} style={styles.closeButton}>
                <Icon name="close" size={20} color={tokens.colors.text} />
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
              <Icon name="cart" size={32} color="rgba(184, 123, 90, 0.6)" />
            </View>
            <Text style={styles.emptyText}>Carrito vacío</Text>
            <Text style={styles.emptySubtext}>Toca un producto para agregarlo</Text>
          </View>
        ) : (
          items.map(renderCartItem)
        )}
      </ScrollView>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
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
                {ivaEnabled && <Icon name="check" size={12} color="#FFFFFF" />}
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
              <View style={styles.totalBadge}>
                <Text style={styles.totalBadgeText}>
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
                <Icon name={method.icon} size={14} color={isActive ? tokens.colors.mahogany : tokens.colors.textMuted} />
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
                  <Icon name="user" size={14} color={tokens.colors.text} />
                  <Text style={styles.selectedClientName}>{selectedClient.name}</Text>
                </View>
                <TouchableOpacity onPress={() => setIsClientModalVisible(true)} style={styles.changeClientBtn}>
                  <Text style={styles.changeClientText}>Cambiar</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.selectClientBtn} onPress={() => setIsClientModalVisible(true)}>
                <Icon name="user-plus" size={16} color="#B87B5A" />
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
        <LinearGradient
          colors={(!selectedPayment || items.length === 0) 
            ? ['rgba(184, 123, 90, 0.45)', 'rgba(184, 123, 90, 0.35)']
            : ['#C48B68', '#8B5A3C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.checkoutGradient}
        />
        <View style={styles.checkoutContent}>
          <Icon name="check" size={18} color="#F0F0F2" />
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
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    paddingBottom: Platform.OS === 'android' ? verticalScale(40) : verticalScale(34),
  },
  leftBorder: {},
  topGlow: {},
  header: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  iconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: tokens.colors.text,
    letterSpacing: scale(0.5),
  },
  itemCountBadge: {
    backgroundColor: 'rgba(184, 123, 90, 0.2)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  itemCount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#B87B5A',
  },
  closeButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  itemsList: {
    flex: 1,
  },
  itemsContent: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: verticalScale(60),
    gap: scale(10),
  },
  emptyIconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(184,123,90,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(184,123,90,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: tokens.colors.textMuted,
  },
  emptySubtext: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: '#666',
  },
  summary: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  summaryCard: {
    backgroundColor: tokens.colors.glass.bg,
    borderRadius: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: tokens.colors.glass.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  summaryLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: '#8A8A96',
  },
  summaryValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.text,
  },
  taxValue: {
    color: tokens.colors.mahogany,
  },
  ivaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
    paddingVertical: verticalScale(6),
  },
  ivaLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  checkbox: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(6),
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  checkboxActive: {
    backgroundColor: 'rgba(184, 123, 90, 0.8)',
    borderColor: 'rgba(184, 123, 90, 0.6)',
  },
  ivaLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: '#8A8A96',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(10),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(184, 123, 90, 0.15)',
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  totalLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#F0F0F2',
  },
  totalBadge: {
    backgroundColor: 'rgba(109, 184, 138, 0.15)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  totalBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: '#6DB88A',
  },
  paymentSection: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(12),
  },
  sectionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#8A8A96',
    marginBottom: verticalScale(10),
    textTransform: 'uppercase',
    letterSpacing: scale(0.8),
  },
  paymentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  paymentChip: {
    flexGrow: 1,
    flexBasis: '47%', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    height: verticalScale(44),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  paymentChipActive: {
    backgroundColor: 'rgba(184,123,90,0.15)',
    borderColor: 'rgba(184,123,90,0.4)',
  },
  paymentChipText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#8A8A96',
  },
  paymentChipTextActive: {
    color: '#F0F0F2',
  },
  checkoutButton: {
    position: 'relative',
    marginHorizontal: scale(16),
    marginTop: verticalScale(8),
    marginBottom: verticalScale(16),
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  checkoutGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  checkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(16),
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#F0F0F2',
    letterSpacing: scale(0.5),
  },
  clientSelectionBox: {
    marginTop: verticalScale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: scale(12),
  },
  selectClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: verticalScale(8),
  },
  selectClientText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#B87B5A',
  },
  selectedClientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedClientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  selectedClientName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#F0F0F2',
  },
  changeClientBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(6),
  },
  changeClientText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: '#F0F0F2',
  },
});
