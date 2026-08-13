import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { generatePaymentMethodReport } from '../lib/pdfReportGenerator';
import { useToast } from './Toast';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface Sale {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

interface PaymentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  method: string | null;
  periodLabel: string;
  sales: Sale[];
  payments?: any[]; // Abonos
}

export function PaymentDetailsModal({ visible, onClose, method, periodLabel, sales, payments = [] }: PaymentDetailsModalProps) {
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  const methodIcons: Record<string, string> = {
    cash: 'money-bill',
    card: 'credit-card',
    transfer: 'mobile-alt',
    credito: 'user'
  };

  const methodLabels: Record<string, string> = {
    cash: 'Efectivo',
    card: 'Tarjeta',
    transfer: 'Transferencia',
    credito: 'Crédito'
  };

  const { showToast } = useToast();
  const totalSalesAmount = sales.reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalPaymentsAmount = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalAmount = totalSalesAmount + totalPaymentsAmount;

  const combinedMovements = [
    ...sales.map(s => ({ ...s, isPayment: false, amount: s.total_amount })),
    ...payments.map(p => ({ ...p, isPayment: true, amount: p.amount }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleDownload = async () => {
    try {
      if (sales.length === 0) {
        showToast('No hay ventas para este método de pago.', 'warning');
        return;
      }
      const label = method ? methodLabels[method] || method : 'Ventas';
      await generatePaymentMethodReport(sales, totalAmount, label, periodLabel);
      showToast('Reporte generado con éxito', 'success');
    } catch (error) {
      showToast('Error al generar el reporte', 'error');
      console.error(error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Icon name={method ? methodIcons[method] || 'receipt' : 'receipt'} size={26} color={tokens.colors.mahogany} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{method ? methodLabels[method] || method : 'Ventas'}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{periodLabel} • {combinedMovements.length} mov.</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleDownload} style={styles.downloadBtn}>
                 <Icon name="file-pdf" size={24} color={tokens.colors.mahogany} />
                <Text style={styles.downloadBtnText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                 <Icon name="times" size={26} color={tokens.colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total en {method ? methodLabels[method] || method : 'este método'}</Text>
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {combinedMovements.length === 0 ? (
              <Text style={styles.empty}>No hay movimientos registrados</Text>
            ) : (
              combinedMovements.map((item) => (
                <View key={item.id} style={styles.saleItem}>
                  <View style={styles.saleLeft}>
                    <Text style={[styles.saleAmount, item.isPayment && { color: tokens.colors.sage }]}>
                      {item.isPayment ? '+' : ''}${Number(item.amount).toFixed(2)}
                    </Text>
                    {item.isPayment && (
                      <Text style={styles.movementBadge}>Abono</Text>
                    )}
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleDate}>{formatDate(item.created_at)}</Text>
                    <Text style={styles.saleTime}>{formatTime(item.created_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: scale(20),
  },
  container: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.card,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    padding: scale(20),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  headerLeft: {
    flex: 1,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginRight: scale(8),
  },
  iconContainer: {
    width: scale(40),
    height: scale(40),
    borderRadius: tokens.radius.sm,
    backgroundColor: `${tokens.colors.mahogany}15`,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${tokens.colors.mahogany}25`,
  },
  title: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  subtitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.textSecondary,
    marginTop: verticalScale(2),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flexShrink: 0,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    height: verticalScale(34),
    paddingHorizontal: scale(12),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
    justifyContent: 'center',
  },
  downloadBtnText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: tokens.colors.mahogany,
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: verticalScale(34),
    height: verticalScale(34),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  totalContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.card,
    padding: scale(16),
    marginBottom: verticalScale(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  totalLabel: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
    marginBottom: verticalScale(4),
  },
  totalValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  list: {
    maxHeight: verticalScale(400),
  },
  saleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  saleLeft: {
    gap: verticalScale(4),
  },
  saleAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  saleRight: {
    alignItems: 'flex-end',
    gap: verticalScale(4),
  },
  saleDate: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    color: tokens.colors.textSecondary,
  },
  saleTime: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(11),
    color: tokens.colors.textMuted,
  },
  movementBadge: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(9),
    fontWeight: '800',
    color: tokens.colors.sage,
    backgroundColor: `${tokens.colors.sage}15`,
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: tokens.radius.pill,
    alignSelf: 'flex-start',
    marginTop: verticalScale(2),
    textTransform: 'uppercase',
  },
  empty: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(14),
    color: tokens.colors.textMuted,
    textAlign: 'center',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(20),
  },
});
