import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { memo } from 'react';
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

/**
 * Modern CartItem: glassmorphism surface with subtle gradients and clean typography.
 */
export const CartItemRow = memo(function CartItemRow({ 
  item, 
  onIncrement, 
  onDecrement, 
  onRemove 
}: CartItemProps) {
  const totalPrice = (item.price * item.quantity).toFixed(2);
  const gradientColors = ['rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.01)'] as const;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.itemIconCircle}>
        <Text style={styles.itemInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.unitPrice}>${item.price.toFixed(2)} c/u</Text>
      </View>
      
      <View style={styles.rightSection}>
        <View style={styles.controls}>
          <TouchableOpacity 
            style={styles.button} 
            onPress={onDecrement}
            activeOpacity={0.7}
          >
            <Icon name="minus" size={12} color={tokens.colors.text} />
          </TouchableOpacity>
          
          <View style={styles.quantityContainer}>
            <Text style={styles.quantity}>{item.quantity}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={onIncrement}
            activeOpacity={0.7}
          >
            <Icon name="plus" size={12} color={tokens.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.totalAndAction}>
          <Text style={styles.total}>${totalPrice}</Text>
          <TouchableOpacity 
            style={styles.removeButton} 
            onPress={onRemove}
            activeOpacity={0.7}
          >
            <Icon name="trash" size={14} color={tokens.colors.coral} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(14),
    marginVertical: verticalScale(6),
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
  },
  itemIconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: tokens.radius.btn,
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  itemInitial: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  info: {
    flex: 1,
    marginRight: scale(8),
  },
  name: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  unitPrice: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(12),
    color: tokens.colors.textMuted,
    marginTop: verticalScale(2),
  },
  rightSection: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: verticalScale(8),
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: tokens.radius.pill,
    padding: scale(2),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  button: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityContainer: {
    minWidth: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  totalAndAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginTop: verticalScale(2),
  },
  total: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: tokens.colors.text,
  },
  removeButton: {
    width: scale(30),
    height: scale(30),
    borderRadius: tokens.radius.pill,
    backgroundColor: tokens.colors.coralDim,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.coral,
  },
});

