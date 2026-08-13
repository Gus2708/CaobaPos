import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { AppBlurView as BlurView } from './AppBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { CartItem } from '../store/cartStore';
import { Icon } from './Icon';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { shareReceiptPDF, ReceiptData } from '../lib/receiptGenerator';
import { BrandMark } from './BrandMark';

interface SaleSummaryModalProps {
  visible: boolean;
  saleId: string;
  items: CartItem[];
  total: number;
  tax: number;
  subtotal: number;
  paymentMethod: string;
  onClose: () => void;
}

export function SaleSummaryModal({
  visible,
  saleId,
  items,
  total,
  tax,
  subtotal,
  paymentMethod,
  onClose,
}: SaleSummaryModalProps) {
  const [loading, setLoading] = useState(false);

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'credito': return 'Crédito';
      default: return method;
    }
  };

  const sharePDF = async () => {
    try {
      setLoading(true);

      const receiptData: ReceiptData = {
        saleId,
        date: `${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
        items: items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
        })),
        subtotal,
        tax,
        total,
        paymentMethod: getPaymentLabel(paymentMethod),
      };

      await shareReceiptPDF(receiptData);
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el recibo PDF');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <BrandMark
              motif="flor1"
              style={{ position: 'absolute', left: scale(20), top: verticalScale(20), width: scale(28), height: scale(28), opacity: 0.5 }}
            />
            <BrandMark
              motif="flor2"
              style={{ position: 'absolute', right: scale(20), top: verticalScale(20), width: scale(28), height: scale(28), opacity: 0.5 }}
            />
            <View style={styles.iconCircle}>
               <Icon name="check-circle" size={32} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>¡Venta Realizada!</Text>
            <Text style={styles.receiptId}>Folio: {saleId.slice(0, 8).toUpperCase()}</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Resumen de Venta</Text>
            
            <View style={styles.itemsList}>
              {items.map((item, index) => (
                <View key={`${item.id}-${index}`} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.itemMeta}>${item.price.toFixed(2)} x{item.quantity}</Text>
                  </View>
                  <Text style={styles.itemPrice}>${Number(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
              </View>
              {tax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>IVA (16%)</Text>
                  <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>TOTAL</Text>
                <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.paymentMethod}>
              <View style={styles.badge}>
                <Icon name="credit-card" size={14} color={tokens.colors.mahogany} />
                <Text style={styles.paymentValue}>{getPaymentLabel(paymentMethod)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={sharePDF}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="file-pdf" size={22} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Compartir Recibo</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Finalizar y Volver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modal: {
    width: '100%',
    maxWidth: scale(380),
    borderRadius: tokens.radius.modal,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: tokens.colors.sage,
    paddingVertical: verticalScale(32),
    alignItems: 'center',
    gap: verticalScale(12),
  },
  iconCircle: {
     width: scale(64),
     height: scale(64),
     borderRadius: scale(32),
     backgroundColor: tokens.colors.surface,
     justifyContent: 'center',
     alignItems: 'center',
     borderWidth: 2,
     borderColor: '#FFFFFF',
  },
  headerTitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: scale(-0.5),
  },
  receiptId: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    color: '#FFFFFF',
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(2),
    borderRadius: tokens.radius.pill,
  },
  content: {
    padding: scale(24),
  },
  sectionTitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: tokens.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: scale(0.8),
    marginBottom: verticalScale(16),
  },
  itemsList: {
    maxHeight: verticalScale(180),
    marginBottom: verticalScale(20),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.text,
  },
  itemMeta: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.textMuted,
    marginTop: verticalScale(2),
  },
  itemPrice: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  summaryCard: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    padding: scale(16),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    marginBottom: verticalScale(20),
  },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: verticalScale(10) 
  },
  totalLabel: { 
    fontFamily: FontNames.parkinsans, 
    fontSize: moderateScale(14), 
    color: tokens.colors.textMuted 
  },
  totalValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(14), 
    color: tokens.colors.text 
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: verticalScale(4),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderLight,
  },
  grandTotalLabel: { 
    fontFamily: FontNames.parkinsans, 
    fontSize: moderateScale(16), 
    fontWeight: '800', 
    color: tokens.colors.text 
  },
  grandTotalValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(22), 
    fontWeight: '800', 
    color: tokens.colors.mahogany 
  },
  paymentMethod: {
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  paymentValue: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: tokens.colors.mahogany,
  },
  actions: {
    paddingHorizontal: scale(24),
    paddingBottom: verticalScale(16),
  },
  shareButton: {
    backgroundColor: tokens.colors.mahogany,
    borderRadius: tokens.radius.pill,
    height: verticalScale(54),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: verticalScale(12),
  },
  shareButtonText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeButton: {
    height: verticalScale(50),
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.textDim,
  },
});
