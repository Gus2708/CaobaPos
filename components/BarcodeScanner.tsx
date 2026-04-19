import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput, Alert, StatusBar, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { tokens } from '../lib/designTokens';

interface ScannedItem {
  barcode: string;
  productName: string;
  quantity: number;
  price: number;
  productId: string;
  image_url?: string;
}

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (items: ScannedItem[]) => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  barcode: string | null;
  image_url?: string | null;
}

const ScannedItemRow = memo(function ScannedItemRow({ 
  item, 
  onIncrement, 
  onDecrement, 
  onRemove,
  onQuantityChange 
}: { 
  item: ScannedItem; 
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onQuantityChange: (qty: number) => void;
}) {
  return (
    <View style={localStyles.itemCard}>
      <View style={localStyles.itemInfo}>
        <Text style={localStyles.itemName} numberOfLines={1}>{item.productName}</Text>
        <Text style={localStyles.itemBarcode}>{item.barcode || 'Sin codigo'}</Text>
      </View>
      <View style={localStyles.itemControls}>
        <TouchableOpacity style={localStyles.qtyBtn} onPress={onDecrement}>
          <Icon name="minus" size={12} color="#F0F0F2" />
        </TouchableOpacity>
        <TextInput
          style={localStyles.qtyInput}
          value={String(item.quantity)}
          onChangeText={(text) => {
            const qty = parseInt(text) || 1;
            onQuantityChange(Math.max(1, qty));
          }}
          keyboardType="number-pad"
          selectTextOnFocus
        />
        <TouchableOpacity style={localStyles.qtyBtn} onPress={onIncrement}>
          <Icon name="plus" size={12} color="#F0F0F2" />
        </TouchableOpacity>
      </View>
      <View style={localStyles.itemRight}>
        <Text style={localStyles.itemSubtotal}>${(item.price * item.quantity).toFixed(2)}</Text>
        <TouchableOpacity style={localStyles.removeBtn} onPress={onRemove}>
          <Icon name="close" size={12} color="#C96B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );
});

export function BarcodeScanner({ visible, onClose, onConfirm }: BarcodeScannerProps) {
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setScannedItems([]);
      setBarcodeInput('');
    }
  }, [visible]);

  const { data: products } = useQuery<Product[]>({
    queryKey: ['products-for-scan'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, cost, barcode, image_url')
        .eq('is_active', true);
      if (error) throw error;
      return data ?? [];
    },
    enabled: visible,
  });

  const addProductByBarcode = useCallback((barcode: string) => {
    const trimmedBarcode = barcode.trim();
    if (!trimmedBarcode) return;

    const product = products?.find(p => p.barcode === trimmedBarcode);
    
    if (product) {
      setScannedItems(prev => {
        const existing = prev.find(item => item.barcode === trimmedBarcode);
        if (existing) {
          return prev.map(item => 
            item.barcode === trimmedBarcode 
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [...prev, {
          barcode: trimmedBarcode,
          productName: product.name,
          price: product.price,
          quantity: 1,
          productId: product.id,
          image_url: product.image_url || undefined,
        }];
      });
    } else {
      Alert.alert('Codigo no encontrado', `No hay producto con codigo "${trimmedBarcode}"`);
    }
    
    setBarcodeInput('');
  }, [products]);

  const handleBarcodeSubmit = useCallback(() => {
    addProductByBarcode(barcodeInput);
  }, [barcodeInput, addProductByBarcode]);

  useEffect(() => {
    if (barcodeInput.endsWith('\n') || barcodeInput.endsWith('\r')) {
      addProductByBarcode(barcodeInput);
    }
  }, [barcodeInput, addProductByBarcode]);

  const updateQuantity = useCallback((barcode: string, delta: number) => {
    setScannedItems(prev => 
      prev.map(item => {
        if (item.barcode === barcode) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : item;
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  }, []);

  const setQuantity = useCallback((barcode: string, qty: number) => {
    if (qty <= 0) {
      setScannedItems(prev => prev.filter(item => item.barcode !== barcode));
    } else {
      setScannedItems(prev => 
        prev.map(item => 
          item.barcode === barcode ? { ...item, quantity: qty } : item
        )
      );
    }
  }, []);

  const removeItem = useCallback((barcode: string) => {
    setScannedItems(prev => prev.filter(item => item.barcode !== barcode));
  }, []);

  const handleConfirm = useCallback(() => {
    if (scannedItems.length === 0) {
      Alert.alert('Carrito vacio', 'Agrega al menos un producto');
      return;
    }
    onConfirm(scannedItems);
    setScannedItems([]);
    onClose();
  }, [scannedItems, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    if (scannedItems.length > 0) {
      Alert.alert(
        'Descartar cambios',
        '¿Salir sin agregar los productos?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Descartar', 
            style: 'destructive',
            onPress: () => {
              setScannedItems([]);
              Keyboard.dismiss();
              onClose();
            }
          },
        ]
      );
    } else {
      Keyboard.dismiss();
      onClose();
    }
  }, [scannedItems, onClose]);

  const totalItems = scannedItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = scannedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <StatusBar barStyle="light-content" />
      <View style={[localStyles.container, { paddingTop: insets.top }]}>
        <View style={localStyles.header}>
          <TouchableOpacity style={localStyles.closeBtn} onPress={handleClose}>
            <Icon name="close" size={24} color="#F0F0F2" />
          </TouchableOpacity>
          <Text style={localStyles.headerTitle}>Agregar Productos</Text>
          <View style={localStyles.placeholder} />
        </View>

        <View style={localStyles.inputSection}>
          <Text style={localStyles.inputLabel}>Escanea o escribe el codigo:</Text>
          <View style={localStyles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={localStyles.input}
              value={barcodeInput}
              onChangeText={setBarcodeInput}
              onSubmitEditing={handleBarcodeSubmit}
              placeholder="Codigo de barras..."
              placeholderTextColor="#6A6A72"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
            />
            <TouchableOpacity 
              style={[localStyles.addBtn, !barcodeInput.trim() && localStyles.addBtnDisabled]} 
              onPress={handleBarcodeSubmit}
              disabled={!barcodeInput.trim()}
            >
              <Icon name="plus" size={20} color="#F0F0F2" />
            </TouchableOpacity>
          </View>
          <Text style={localStyles.inputHint}>
            Usa el lector Bluetooth o escribe el código manualmente
          </Text>
        </View>

        <View style={localStyles.divider} />

        <View style={localStyles.itemsHeader}>
          <Text style={localStyles.itemsTitle}>Productos ({scannedItems.length})</Text>
        </View>

        <FlatList
          data={scannedItems}
          keyExtractor={(item) => item.barcode}
          renderItem={({ item }) => (
            <ScannedItemRow
              item={item}
              onIncrement={() => updateQuantity(item.barcode, 1)}
              onDecrement={() => updateQuantity(item.barcode, -1)}
              onRemove={() => removeItem(item.barcode)}
              onQuantityChange={(qty) => setQuantity(item.barcode, qty)}
            />
          )}
          contentContainerStyle={localStyles.list}
          ListEmptyComponent={
            <View style={localStyles.emptyList}>
              <Icon name="barcode" size={48} color="rgba(184, 123, 90, 0.3)" />
              <Text style={localStyles.emptyText}>Sin productos agregados</Text>
              <Text style={localStyles.emptyHint}>Escanea codigos con el lector Bluetooth</Text>
            </View>
          }
        />

        <View style={[localStyles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={localStyles.summary}>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>Articulos:</Text>
              <Text style={localStyles.summaryValue}>{totalItems}</Text>
            </View>
            <View style={localStyles.summaryRow}>
              <Text style={localStyles.summaryLabel}>Total:</Text>
              <Text style={localStyles.summaryTotal}>${totalPrice.toFixed(2)}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[localStyles.confirmBtn, scannedItems.length === 0 && localStyles.confirmBtnDisabled]} 
            onPress={handleConfirm}
            disabled={scannedItems.length === 0}
          >
            <LinearGradient
              colors={scannedItems.length === 0 
                ? ['rgba(184, 123, 90, 0.5)', 'rgba(184, 123, 90, 0.4)']
                : ['rgba(184, 123, 90, 0.95)', 'rgba(139, 90, 60, 0.9)']}
              style={localStyles.confirmBtnGradient}
            />
            <View style={localStyles.confirmBtnContent}>
              <Icon name="check" size={20} color="#F0F0F2" />
              <Text style={localStyles.confirmBtnText}>Confirmar ({totalItems})</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  closeBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  headerTitle: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.text,
    fontSize: moderateScale(18),
    fontWeight: '700',
  },
  placeholder: {
    width: scale(44),
  },
  inputSection: {
    padding: scale(20),
  },
  inputLabel: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.textSecondary,
    fontSize: moderateScale(15),
    fontWeight: '600',
    marginBottom: verticalScale(12),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.borderAccent,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: tokens.colors.text,
    fontSize: moderateScale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    fontFamily: FontNames.jetBrainsMono,
  },
  addBtn: {
    backgroundColor: tokens.colors.mahogany,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: tokens.colors.mahoganyDim,
    opacity: 0.5,
  },
  inputHint: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.textMuted,
    fontSize: moderateScale(12),
    marginTop: verticalScale(8),
  },
  divider: {
    height: 1,
    backgroundColor: tokens.colors.borderLight,
  },
  itemsHeader: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  itemsTitle: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.textMuted,
    fontSize: moderateScale(14),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(20),
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: tokens.radius.xl,
    padding: scale(12),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.text,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: verticalScale(2),
  },
  itemBarcode: {
    color: tokens.colors.textMuted,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(10),
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: tokens.radius.pill,
    marginHorizontal: scale(8),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  qtyBtn: {
    width: scale(32),
    height: scale(32),
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: scale(32),
    height: scale(32),
    color: tokens.colors.text,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '700',
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemSubtotal: {
    color: tokens.colors.text,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '700',
    marginBottom: verticalScale(4),
  },
  removeBtn: {
    padding: scale(4),
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: verticalScale(60),
    gap: verticalScale(12),
  },
  emptyText: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.textSecondary,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  emptyHint: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.textMuted,
    fontSize: moderateScale(13),
  },
  footer: {
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: tokens.colors.borderLight,
    backgroundColor: tokens.colors.bg,
  },
  summary: {
    marginBottom: verticalScale(16),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(4),
  },
  summaryLabel: {
    fontFamily: FontNames.instrumentSans,
    color: tokens.colors.textMuted,
    fontSize: moderateScale(14),
  },
  summaryValue: {
    color: tokens.colors.text,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  summaryTotal: {
    color: tokens.colors.mahogany,
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(28),
    fontWeight: '800',
  },
  confirmBtn: {
    position: 'relative',
    borderRadius: tokens.radius.pill,
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: tokens.radius.pill,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
    paddingVertical: verticalScale(16),
  },
  confirmBtnText: {
    fontFamily: FontNames.instrumentSans,
    color: '#F0F0F2',
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
});
