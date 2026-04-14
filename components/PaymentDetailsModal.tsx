import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Text } from './Text';
import { BlurView } from 'expo-blur';
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
}

export function PaymentDetailsModal({ visible, onClose, method, periodLabel, sales }: PaymentDetailsModalProps) {
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
  const totalAmount = sales.reduce((acc, s) => acc + Number(s.total_amount), 0);

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
        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <Icon name={method ? methodIcons[method] || 'receipt' : 'receipt'} size={20} color="#B87B5A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{method ? methodLabels[method] || method : 'Ventas'}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{periodLabel} • {sales.length} ventas</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={handleDownload} style={styles.downloadBtn}>
                <Icon name="file-pdf" size={18} color="#B87B5A" />
                <Text style={styles.downloadBtnText}>PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Icon name="times" size={20} color="#8A8A96" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total en {method ? methodLabels[method] || method : 'este método'}</Text>
            <Text style={styles.totalValue}>${totalAmount.toFixed(2)}</Text>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {sales.length === 0 ? (
              <Text style={styles.empty}>No hay ventas registradas</Text>
            ) : (
              sales.map((sale) => (
                <View key={sale.id} style={styles.saleItem}>
                  <View style={styles.saleLeft}>
                    <Text style={styles.saleAmount}>${Number(sale.total_amount).toFixed(2)}</Text>
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleDate}>{formatDate(sale.created_at)}</Text>
                    <Text style={styles.saleTime}>{formatTime(sale.created_at)}</Text>
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
    backgroundColor: 'rgba(10, 10, 12, 0.7)',
    padding: scale(20),
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: 'rgba(15, 15, 18, 0.95)',
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: verticalScale(10) },
    shadowOpacity: 0.5,
    shadowRadius: scale(20),
    elevation: 10,
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
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(184, 123, 90, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  title: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#F0F0F2',
  },
  subtitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: '#8A8A96',
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
    height: moderateScale(34),
    paddingHorizontal: scale(10),
    borderRadius: scale(10),
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
    justifyContent: 'center',
  },
  downloadBtnText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#B87B5A',
    textTransform: 'uppercase',
  },
  closeBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalContainer: {
    backgroundColor: 'rgba(184, 123, 90, 0.1)',
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: verticalScale(20),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.2)',
  },
  totalLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: '#8A8A96',
    textTransform: 'uppercase',
    letterSpacing: scale(0.5),
    marginBottom: verticalScale(4),
  },
  totalValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: '#B87B5A',
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
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  saleLeft: {
    gap: verticalScale(4),
  },
  saleAmount: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#F0F0F2',
  },
  saleRight: {
    alignItems: 'flex-end',
    gap: verticalScale(4),
  },
  saleDate: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(13),
    color: '#F0F0F2',
  },
  saleTime: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(11),
    color: '#8A8A96',
  },
  empty: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    color: '#8A8A96',
    textAlign: 'center',
    marginTop: verticalScale(20),
    marginBottom: verticalScale(20),
  },
});
