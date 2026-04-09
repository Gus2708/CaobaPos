import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Product } from '../store/cartStore';
import { Icon } from './Icon';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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

interface SaleDetailModalProps {
  visible: boolean;
  sale: Sale;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (items: SaleItem[], total: number) => void;
  isDeleting: boolean;
  isUpdating: boolean;
}

export function SaleDetailModal({
  visible,
  sale,
  onClose,
  onDelete,
  onUpdate,
  isDeleting,
  isUpdating,
}: SaleDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<SaleItem[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  const { data: productsData } = useQuery<Product[]>({
    queryKey: ['inventory-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (productsData) setProducts(productsData);
  }, [productsData]);

  useEffect(() => {
    if (sale.sale_items) {
      setEditedItems([...sale.sale_items]);
    }
  }, [sale]);

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

  const calculateTotals = () => {
    const subtotal = editedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * 0.16;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const updateItemQuantity = (index: number, newQty: number) => {
    if (newQty < 1) {
      const newItems = editedItems.filter((_, i) => i !== index);
      setEditedItems(newItems);
      return;
    }
    const updated = [...editedItems];
    updated[index] = {
      ...updated[index],
      quantity: newQty,
      subtotal: updated[index].unit_price * newQty,
    };
    setEditedItems(updated);
  };

  const addItem = (product: Product) => {
    const existingIndex = editedItems.findIndex((item) => item.product_id === product.id);
    if (existingIndex >= 0) {
      updateItemQuantity(existingIndex, editedItems[existingIndex].quantity + 1);
    } else {
      setEditedItems([
        ...editedItems,
        {
          id: `temp-${Date.now()}`,
          sale_id: sale.id,
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          subtotal: product.price,
        },
      ]);
    }
  };

  const { subtotal, tax, total } = calculateTotals();

  const generateReceiptHTML = () => {
    const itemsHTML = editedItems
      .map(
        (item) => `
        <tr>
          <td>${item.product_name} x${item.quantity}</td>
          <td style="text-align: right;">$${item.subtotal.toFixed(2)}</td>
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
          <div class="subtitle">${formatDate(sale.created_at)}</div>
          
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
            ${getPaymentLabel(sale.payment_method)}
          </div>
          
          <div class="receipt-id">Folio: ${sale.id.slice(0, 8).toUpperCase()}</div>
          
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
      setLoadingPdf(true);
      const html = generateReceiptHTML();
      const { uri } = await Print.printToFileAsync({ html });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir Recibo',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setLoadingPdf(false);
    }
  };

  const handleSave = () => {
    if (editedItems.length === 0) {
      Alert.alert('Error', 'Debe haber al menos un producto');
      return;
    }
    onUpdate(editedItems, total);
    setIsEditing(false);
  };

  const handleClose = () => {
    setIsEditing(false);
    setEditedItems(sale.sale_items || []);
    onClose();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Venta',
      '¿Eliminar esta venta? El stock será restaurado.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const availableProducts = products.filter(
    (p) => !editedItems.some((item) => item.product_id === p.id && p.id !== '')
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Venta #{sale.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.headerDate}>{formatDate(sale.created_at)}</Text>
            </View>
            <View style={styles.paymentBadge}>
              <Text style={styles.paymentText}>{getPaymentLabel(sale.payment_method)}</Text>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Productos</Text>
            
            {editedItems.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemPrice}>${item.unit_price.toFixed(2)} c/u</Text>
                </View>
                {isEditing ? (
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateItemQuantity(index, item.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateItemQuantity(index, item.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                )}
                <Text style={styles.itemSubtotal}>${item.subtotal.toFixed(2)}</Text>
              </View>
            ))}

            {isEditing && availableProducts.length > 0 && (
              <View style={styles.addSection}>
                <Text style={styles.addSectionTitle}>Agregar producto</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availableProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.addProductBtn}
                      onPress={() => addItem(product)}
                    >
                      <Text style={styles.addProductText}>+ {product.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

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
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.pdfBtn} onPress={sharePDF} disabled={loadingPdf}>
              {loadingPdf ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <View style={styles.btnIcon}>
                    <Icon name="file-pdf" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.btnText}>Descargar PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.actionRow}>
              {isEditing ? (
                <>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => {
                      setIsEditing(false);
                      setEditedItems(sale.sale_items || []);
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.saveBtn}
                    onPress={handleSave}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveBtnText}>Guardar</Text>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={isDeleting}>
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <View style={styles.btnIcon}>
                          <Icon name="trash-alt" size={16} color="#FFFFFF" />
                        </View>
                        <Text style={styles.btnText}>Eliminar</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditing(true)}>
                    <>
                      <View style={styles.btnIcon}>
                        <Icon name="edit" size={16} color="#FFFFFF" />
                      </View>
                      <Text style={styles.btnText}>Editar</Text>
                    </>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
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
    maxWidth: 420,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#18181C',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 16,
    fontWeight: '700',
    color: '#B87B5A',
  },
  headerDate: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    color: '#8A8A96',
    marginTop: 2,
  },
  paymentBadge: {
    backgroundColor: 'rgba(184, 123, 90, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  paymentText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 13,
    color: '#B87B5A',
    fontWeight: '600',
  },
  content: {
    padding: 20,
    maxHeight: 400,
  },
  sectionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A96',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemInfo: { flex: 1 },
  itemName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 14,
    color: '#F0F0F2',
  },
  itemPrice: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 11,
    color: '#8A8A96',
    marginTop: 2,
  },
  itemQty: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    color: '#8A8A96',
    marginHorizontal: 12,
  },
  itemSubtotal: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    color: '#B87B5A',
    fontWeight: '600',
    minWidth: 70,
    textAlign: 'right',
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#2a2a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 18,
    color: '#F0F0F2',
    fontWeight: '600',
  },
  qtyValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 16,
    color: '#F0F0F2',
    marginHorizontal: 12,
    minWidth: 30,
    textAlign: 'center',
  },
  addSection: { marginTop: 16 },
  addSectionTitle: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    color: '#8A8A96',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addProductBtn: {
    backgroundColor: 'rgba(109, 184, 138, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(109, 184, 138, 0.3)',
  },
  addProductText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: 12,
    color: '#6DB88A',
    fontWeight: '600',
  },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 16 },
  totalsSection: { marginTop: 8 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalLabel: { fontFamily: FontNames.instrumentSans, fontSize: 14, color: '#8A8A96' },
  totalValue: { fontFamily: FontNames.jetBrainsMono, fontSize: 14, color: '#F0F0F2' },
  grandTotalLabel: { fontFamily: FontNames.instrumentSans, fontSize: 18, fontWeight: '700', color: '#F0F0F2' },
  grandTotalValue: { fontFamily: FontNames.jetBrainsMono, fontSize: 20, fontWeight: '700', color: '#B87B5A' },
  actions: { paddingHorizontal: 20 },
  pdfBtn: {
    backgroundColor: '#B87B5A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    flexDirection: 'row',
  },
  actionRow: { flexDirection: 'row' },
  editBtn: { flex: 1, backgroundColor: '#2a2a2e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8, flexDirection: 'row' },
  deleteBtn: { flex: 1, backgroundColor: 'rgba(201,107,107,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  saveBtn: { flex: 1, backgroundColor: '#6DB88A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#2a2a2e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontFamily: FontNames.instrumentSans, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  cancelBtnText: { fontFamily: FontNames.instrumentSans, fontSize: 15, fontWeight: '600', color: '#8A8A96' },
  btnText: { fontFamily: FontNames.instrumentSans, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  btnIcon: { marginRight: 8 },
  closeButton: { backgroundColor: '#141418', paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  closeButtonText: { fontFamily: FontNames.instrumentSans, fontSize: 15, fontWeight: '600', color: '#8A8A96' },
});
