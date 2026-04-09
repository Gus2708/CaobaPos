import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { FontNames } from '../lib/fontNames';
import { CartItem } from '../store/cartStore';
import { Icon } from './Icon';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('es-MX', {
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

  const generateReceiptHTML = () => {
    const itemsHTML = items
      .map(
        (item) => `
        <tr>
          <td>${item.name} x${item.quantity}</td>
          <td style="text-align: right;">$${Number(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Recibo - Caoba</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; margin: 0 auto; }
            h1 { font-size: 24px; text-align: center; margin-bottom: 5px; }
            .subtitle { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
            .divider { border-top: 1px dashed #ccc; margin: 15px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 5px 0; font-size: 14px; }
            .totals { margin-top: 15px; }
            .total-row { display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
            .receipt-id { text-align: center; font-size: 10px; color: #999; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h1>CAOBA</h1>
          <div class="subtitle">Punto de Venta</div>
          <div class="subtitle">${formatDate()}</div>
          
          <div class="divider"></div>
          
          <table>
            ${itemsHTML}
          </table>
          
          <div class="divider"></div>
          
          <div class="totals">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>IVA (16%):</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>TOTAL:</span>
              <span>$${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="divider"></div>
          
          <div style="text-align: center; margin-top: 15px;">
            <strong>Método de pago:</strong><br>
            ${getPaymentLabel(paymentMethod)}
          </div>
          
          <div class="receipt-id">Folio: ${saleId.slice(0, 8).toUpperCase()}</div>
          
          <div class="footer">
            ¡Gracias por su compra!<br>
            Vuelva pronto
          </div>
        </body>
      </html>
    `;
  };

  const sharePDF = async () => {
    try {
      setLoading(true);

      const html = generateReceiptHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir Recibo',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el recibo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>¡Venta Realizada!</Text>
            <Text style={styles.receiptId}>Folio: {saleId.slice(0, 8).toUpperCase()}</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.sectionTitle}>Resumen</Text>
            <View style={styles.divider} />

            {items.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>${Number(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.totalsSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>IVA (16%)</Text>
                <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>

            <View style={styles.paymentMethod}>
              <Text style={styles.paymentLabel}>Pago con: </Text>
              <Text style={styles.paymentValue}>{getPaymentLabel(paymentMethod)}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={sharePDF}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="file-pdf" size={22} color="#FFFFFF" />
                  <Text style={styles.shareButtonText}>Compartir PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#1E1E24',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#6DB88A',
    padding: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  receiptId: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '600',
    color: '#F0F0F2',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#F0F0F2',
    flex: 1,
  },
  itemQty: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 12,
    color: '#8A8A96',
    marginLeft: 8,
  },
  itemPrice: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    color: '#B87B5A',
  },
  totalsSection: {
    marginTop: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  totalLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#8A8A96',
  },
  totalValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    color: '#F0F0F2',
  },
  grandTotalLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 18,
    fontWeight: '700',
    color: '#F0F0F2',
  },
  grandTotalValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 20,
    fontWeight: '700',
    color: '#B87B5A',
  },
  paymentMethod: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  paymentLabel: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#8A8A96',
  },
  paymentValue: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    fontWeight: '600',
    color: '#F0F0F2',
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  shareButton: {
    backgroundColor: '#B87B5A',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  shareButtonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    backgroundColor: '#2a2a2e',
    paddingVertical: 31,
    alignItems: 'center',
  },
  closeButtonText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8A96',
  },
});