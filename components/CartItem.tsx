import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { memo, useCallback } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { CartItem as CartItemType } from '../store/cartStore';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface CartItemProps {
  item: CartItemType;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export const CartItemRow = memo(function CartItemRow({ 
  item, 
  onIncrement, 
  onDecrement, 
  onRemove 
}: CartItemProps) {
  const totalPrice = (item.price * item.quantity).toFixed(2);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(30, 30, 36, 0.4)', 'rgba(30, 30, 36, 0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.topBorder} />
      
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.unitPrice}>${item.price.toFixed(2)} × {item.quantity}</Text>
        </View>
      </View>
      
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.button} 
          onPress={onDecrement}
          activeOpacity={0.7}
          accessibilityLabel="Disminuir cantidad"
        >
          <Icon name="minus" size={16} color={tokens.colors.text} />
        </TouchableOpacity>
        
        <View style={styles.quantityContainer}>
          <Text style={styles.quantity}>{item.quantity}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={onIncrement}
          activeOpacity={0.7}
          accessibilityLabel="Aumentar cantidad"
        >
          <Icon name="plus" size={16} color={tokens.colors.text} />
        </TouchableOpacity>
      </View>
      
      <View style={styles.totalContainer}>
        <Text style={styles.total}>${totalPrice}</Text>
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={onRemove}
          activeOpacity={0.7}
          accessibilityLabel="Eliminar producto"
        >
          <Icon name="trash" size={18} color={tokens.colors.coral} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(10),
    marginVertical: verticalScale(4),
    borderRadius: scale(14),
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  topBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  info: {
    flex: 1,
    marginRight: scale(10),
  },
  name: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: tokens.colors.text,
    marginBottom: verticalScale(4),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitPrice: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(11),
    color: tokens.colors.textMuted,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  button: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: scale(36),
  },
  quantityContainer: {
    minWidth: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#F0F0F2',
  },
  totalContainer: {
    alignItems: 'flex-end',
    marginLeft: scale(10),
    gap: verticalScale(6),
  },
  total: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.mahogany,
  },
  removeButton: {
    padding: scale(10),
    borderRadius: scale(12),
    backgroundColor: 'rgba(201, 107, 107, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201, 107, 107, 0.2)',
  },
});
