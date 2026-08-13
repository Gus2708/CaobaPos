import React, { memo, useState, useCallback, useMemo, useEffect, useRef, createContext, useContext } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Product } from '../store/cartStore';
import { Icon } from './Icon';
import { shareReceiptPDF, ReceiptData } from '../lib/receiptGenerator';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { tokens } from '../lib/designTokens';
import { Badge } from './Badge';

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
  iva_enabled?: boolean;
  tax_amount?: number;
  client_id?: string;
  sale_items?: SaleItem[];
}

interface SaleDetailModalProps {
  visible: boolean;
  sale: Sale;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (items: any[], total: number, ivaEnabled: boolean, taxAmount: number) => void;
  isDeleting: boolean;
  isUpdating: boolean;
  readOnly?: boolean;
}

export const SaleDetailModal = memo(function SaleDetailModal({
  visible,
  sale,
  onClose,
  onDelete,
  onUpdate,
  isDeleting,
  isUpdating,
  readOnly = false,
}: SaleDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<SaleItem[]>([]);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [ivaEnabled, setIvaEnabled] = useState(sale.iva_enabled ?? true);
  
  const { data: productsData } = useQuery<Product[]>({
    queryKey: ['sale-detail-all-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data ?? [];
    },
  });

  const products = productsData || [];


  useEffect(() => {
    if (sale.sale_items) {
      setEditedItems([...sale.sale_items]);
    }
    setIvaEnabled(sale.iva_enabled ?? true);
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
      credito: 'Crédito',
    };
    return labels[method] || method;
  };

  const calculateTotals = () => {
    const subtotal = editedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = ivaEnabled ? (subtotal * 0.16) : 0;
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


  const sharePDF = async () => {
    try {
      setLoadingPdf(true);
      
      const receiptData: ReceiptData = {
        saleId: sale.id,
        date: formatDate(sale.created_at),
        items: editedItems.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          price: item.unit_price,
          subtotal: item.subtotal,
        })),
        subtotal,
        tax,
        total,
        paymentMethod: sale.payment_method,
      };

      await shareReceiptPDF(receiptData);
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
    // Pass back updated values including IVA
    onUpdate(editedItems, total, ivaEnabled, tax);
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

  const availableProducts = (products || []).filter(
    (p) => !editedItems.some((item) => item.product_id === p.id && p.id !== '')
  );

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return 'money-bill-wave';
      case 'card': return 'credit-card';
      case 'transfer': return 'exchange-alt';
      default: return 'receipt';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.methodCircle}>
                 <Icon name={getMethodIcon(sale.payment_method)} size={20} color={tokens.colors.mahogany} />
              </View>
              <View style={styles.headerInfo}>
                <Text style={styles.headerTitle} numberOfLines={1}>Venta {sale.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.headerDate}>{formatDate(sale.created_at)}</Text>
              </View>
              <TouchableOpacity style={styles.closeIconButton} onPress={handleClose} activeOpacity={0.7}>
                <Icon name="close" size={24} color={tokens.colors.textDim} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.headerBadges}>
              <Badge variant={ivaEnabled ? "mahogany" : "neutral"}>
                {ivaEnabled ? "Con IVA" : "Sin IVA"}
              </Badge>
              <Badge variant="mahogany">
                {getPaymentLabel(sale.payment_method)}
              </Badge>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>Productos</Text>
            
            {editedItems.map((item, index) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemIconCircle}>
                   <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: tokens.colors.textMuted }}>
                      {item.product_name.charAt(0).toUpperCase()}
                   </Text>
                </View>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.product_name}</Text>
                  <Text style={styles.itemMeta}>${item.unit_price.toFixed(2)} c/u</Text>
                </View>
                {isEditing ? (
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateItemQuantity(index, item.quantity - 1)}
                    >
                      <Icon name="minus" size={12} color={tokens.colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateItemQuantity(index, item.quantity + 1)}
                    >
                      <Icon name="plus" size={12} color={tokens.colors.text} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={[styles.itemMeta, { marginRight: scale(12) }]}>x{item.quantity}</Text>
                )}
                <Text style={styles.itemSubtotal}>${item.subtotal.toFixed(2)}</Text>
              </View>
            ))}

            {isEditing && availableProducts.length > 0 && (
              <View style={styles.addSection}>
                <Text style={styles.sectionTitle}>Agregar producto</Text>
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

            <View style={styles.summaryCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.totalRow}
                onPress={() => isEditing && setIvaEnabled(!ivaEnabled)}
                activeOpacity={isEditing ? 0.7 : 1}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                  {isEditing && (
                    <View style={[styles.miniCheckbox, ivaEnabled && styles.miniCheckboxActive]}>
                       {ivaEnabled && <Icon name="check" size={10} color="#FFF" />}
                    </View>
                  )}
                  <Text style={styles.totalLabel}>IVA (16%)</Text>
                </View>
                <Text style={[styles.totalValue, ivaEnabled && { color: tokens.colors.mahogany }]}>
                  ${tax.toFixed(2)}
                </Text>
              </TouchableOpacity>

              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>Total</Text>
                <Text style={styles.grandTotalValue} numberOfLines={1} adjustsFontSizeToFit>${total.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.pdfBtn} onPress={sharePDF} disabled={loadingPdf} activeOpacity={0.8}>
              {loadingPdf ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="file-pdf" size={22} color="#FFFFFF" />
                  <Text style={styles.btnText}>Descargar PDF</Text>
                </>
              )}
            </TouchableOpacity>

            {!readOnly && (
              <View style={styles.actionRow}>
                {isEditing ? (
                  <>
                    <TouchableOpacity
                      style={[styles.mainActionBtn, styles.cancelBtn]}
                      onPress={() => {
                        setIsEditing(false);
                        setEditedItems(sale.sale_items || []);
                      }}
                    >
                      <Text style={[styles.btnText, styles.btnTextMuted]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.mainActionBtn, styles.saveBtn]}
                      onPress={handleSave}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.btnText}>Guardar</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={[styles.mainActionBtn, styles.deleteBtn]} onPress={handleDelete} disabled={isDeleting}>
                      {isDeleting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Icon name="trash" size={18} color="#FFFFFF" />
                          <Text style={styles.btnText}>Eliminar</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.mainActionBtn, styles.editBtn]} onPress={() => setIsEditing(true)}>
                      <Icon name="edit" size={18} color={tokens.colors.mahogany} />
                      <Text style={[styles.btnText, { color: tokens.colors.mahogany }]}>Editar</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}
          </View>

        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 7, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modal: {
    width: '100%',
    maxWidth: scale(420),
    maxHeight: '90%',
    borderRadius: tokens.radius.modal,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
  },
  header: {
    padding: scale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  headerBadges: {
    flexDirection: 'row',
    gap: scale(8),
  },
  closeIconButton: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  methodCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  headerDate: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(13),
    color: tokens.colors.textMuted,
    marginTop: verticalScale(1),
  },
  content: {
    padding: scale(20),
    maxHeight: verticalScale(380),
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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  itemIconCircle: {
     width: scale(38),
     height: scale(38),
     borderRadius: scale(11),
     backgroundColor: tokens.colors.surface,
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: scale(12),
     borderWidth: 1,
     borderColor: tokens.colors.borderLight,
  },
  itemMain: { flex: 1 },
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
  itemSubtotal: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.text,
    textAlign: 'right',
    minWidth: scale(70),
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: tokens.radius.pill,
    padding: scale(2),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    marginRight: scale(8),
  },
  qtyBtn: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyValue: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: tokens.colors.text,
    marginHorizontal: scale(8),
  },
  addSection: { 
    marginTop: verticalScale(20),
    paddingBottom: verticalScale(10),
  },
  addProductBtn: {
    backgroundColor: tokens.colors.mahoganyDim,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(8),
    borderRadius: tokens.radius.pill,
    marginRight: scale(8),
    borderWidth: 1,
    borderColor: tokens.colors.mahogany,
  },
  addProductText: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(12),
    color: tokens.colors.mahogany,
    fontWeight: '700',
  },
  divider: { 
    height: 1, 
    backgroundColor: tokens.colors.borderLight, 
    marginVertical: verticalScale(20) 
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
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
    color: tokens.colors.textSecondary 
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
    fontSize: moderateScale(17), 
    fontWeight: '700', 
    color: tokens.colors.text 
  },
  grandTotalValue: { 
    fontFamily: FontNames.jetBrainsMono, 
    fontSize: moderateScale(22), 
    fontWeight: '800', 
    color: tokens.colors.mahogany,
    lineHeight: moderateScale(28),
  },
  actions: { 
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  pdfBtn: {
    backgroundColor: tokens.colors.mahogany,
    borderRadius: tokens.radius.pill,
    height: verticalScale(54),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: verticalScale(12),
    flexDirection: 'row',
    gap: scale(10),
  },
  actionRow: { 
    flexDirection: 'row', 
    gap: scale(12) 
  },
  mainActionBtn: {
    flex: 1,
    height: verticalScale(54),
    borderRadius: tokens.radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    borderWidth: 1,
  },
  editBtn: { 
    backgroundColor: tokens.colors.surface, 
    borderColor: tokens.colors.borderLight,
  },
  deleteBtn: { 
    backgroundColor: tokens.colors.coralDim, 
    borderColor: tokens.colors.coral,
  },
  saveBtn: { 
    backgroundColor: tokens.colors.sage, 
    borderColor: tokens.colors.sage,
  },
  cancelBtn: { 
    backgroundColor: tokens.colors.surface, 
    borderColor: tokens.colors.borderLight,
  },
  btnText: { 
    fontFamily: FontNames.parkinsans, 
    fontSize: moderateScale(14), 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },
  btnTextMuted: {
    color: tokens.colors.textMuted,
  },
  closeButton: { 
    paddingVertical: verticalScale(16), 
    alignItems: 'center',
  },
  closeButtonText: { 
    fontFamily: FontNames.parkinsans, 
    fontSize: moderateScale(14), 
    fontWeight: '700', 
    color: tokens.colors.textDim 
  },
  miniCheckbox: {
    width: scale(18),
    height: scale(18),
    borderRadius: scale(4),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniCheckboxActive: {
    backgroundColor: tokens.colors.mahogany,
    borderColor: tokens.colors.mahogany,
  },
});

