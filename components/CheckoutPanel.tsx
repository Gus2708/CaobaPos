import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from 'react-native';
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

const TAX_RATE = 0.16;
const PAYMENT_METHODS = [
  { key: 'cash', label: 'Efectivo', icon: 'money-bill' },
  { key: 'card', label: 'Tarjeta', icon: 'credit-card' },
  { key: 'transfer', label: 'Transferencia', icon: 'mobile-alt' },
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
  const createSale = useCreateSale();
  const { showToast } = useToast();
  
  const subtotal = getTotal();
  const tax = ivaEnabled ? subtotal * TAX_RATE : 0;
  const total = subtotal + tax;

  const handleCheckout = useCallback(async () => {
    if (!selectedPayment) {
      showToast('Selecciona método de pago', 'warning');
      return;
    }
    if (items.length === 0) {
      showToast('Carrito vacío', 'warning');
      return;
    }

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
        paymentMethod: selectedPayment,
        items: saleItems,
      });

      setCompletedSale({
        id: `temp-${Date.now()}`,
        items: [...items],
        subtotal,
        tax,
        total,
        paymentMethod: selectedPayment,
      });

      clearCart();
      setSelectedPayment(null);
      showToast('Venta completada con éxito', 'success');
    } catch (error) {
      showToast('No se pudo completar la venta', 'error');
      console.error(error);
    }
  }, [selectedPayment, items, total, subtotal, tax, createSale, clearCart, showToast]);

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
    <View style={styles.container}>

      
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleRow}>
            <View style={styles.iconContainer}>
              <Icon name="shopping-cart" size={18} color="#B87B5A" />
            </View>
            <Text style={styles.title}>Carrito</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCount}>{items.length}</Text>
            </View>
            {onCloseMobile && (
              <TouchableOpacity onPress={onCloseMobile} style={styles.closeButton}>
                <Icon name="close" size={20} color="#F0F0F2" />
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
                <Icon name={method.icon} size={14} color={isActive ? '#B87B5A' : '#8A8A96'} />
                <Text style={[styles.paymentChipText, isActive && styles.paymentChipTextActive]}>
                  {method.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
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
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: tokens.colors.bg,
    paddingBottom: Platform.OS === 'android' ? 40 : 34,
  },
  leftBorder: {},
  topGlow: {},
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 18,
    fontWeight: '700',
    color: '#F0F0F2',
    letterSpacing: 0.5,
  },
  itemCountBadge: {
    backgroundColor: 'rgba(184, 123, 90, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
  },
  itemCount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    fontWeight: '700',
    color: '#B87B5A',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemsList: {
    flex: 1,
  },
  itemsContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(184,123,90,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(184,123,90,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8A96',
  },
  emptySubtext: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 13,
    color: '#666',
  },
  summary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(10, 10, 12, 0.6)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#8A8A96',
  },
  summaryValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    fontWeight: '600',
    color: '#F0F0F2',
  },
  taxValue: {
    color: '#B87B5A',
  },
  ivaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 6,
  },
  ivaLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
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
    fontSize: 14,
    color: '#8A8A96',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184, 123, 90, 0.15)',
  },
  totalLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 18,
    fontWeight: '700',
    color: '#F0F0F2',
  },
  totalBadge: {
    backgroundColor: 'rgba(109, 184, 138, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  totalBadgeText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 10,
    fontWeight: '600',
    color: '#6DB88A',
  },
  paymentSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 11,
    fontWeight: '600',
    color: '#8A8A96',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  paymentChips: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  paymentChipActive: {
    backgroundColor: 'rgba(184,123,90,0.15)',
    borderColor: 'rgba(184,123,90,0.4)',
  },
  paymentChipText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8A96',
  },
  paymentChipTextActive: {
    color: '#F0F0F2',
  },
  checkoutButton: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
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
    gap: 10,
    paddingVertical: 16,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '700',
    color: '#F0F0F2',
    letterSpacing: 0.5,
  },
});
