import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList, TextInput, Alert, StatusBar, Keyboard } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';

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
        .select('id, name, price, barcode, image_url')
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
            Usa el lector Bluetooth o escribe el codigo manualmente
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

        <View style={localStyles.footer}>
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
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#F0F0F2',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  inputSection: {
    padding: 20,
  },
  inputLabel: {
    color: '#F0F0F2',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 40, 50, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184, 123, 90, 0.3)',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    color: '#F0F0F2',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: FontNames.jetBrainsMono,
  },
  addBtn: {
    backgroundColor: '#B87B5A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: {
    backgroundColor: 'rgba(184, 123, 90, 0.3)',
  },
  inputHint: {
    color: '#6A6A72',
    fontSize: 12,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemsHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  itemsTitle: {
    color: '#8A8A96',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 40, 50, 0.6)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: '#F0F0F2',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemBarcode: {
    color: '#8A8A96',
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 10,
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 32,
    height: 32,
    color: '#F0F0F2',
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemSubtotal: {
    color: '#F0F0F2',
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  removeBtn: {
    padding: 4,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    color: '#8A8A96',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyHint: {
    color: '#6A6A72',
    fontSize: 13,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(20, 20, 26, 0.8)',
  },
  summary: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#8A8A96',
    fontSize: 14,
  },
  summaryValue: {
    color: '#F0F0F2',
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotal: {
    color: '#B87B5A',
    fontFamily: FontNames.jetBrainsMono,
    fontSize: 28,
    fontWeight: '800',
  },
  confirmBtn: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmBtnGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  confirmBtnText: {
    color: '#F0F0F2',
    fontSize: 16,
    fontWeight: '700',
  },
});
