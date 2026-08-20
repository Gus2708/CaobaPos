import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  useReducedMotion,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';
import { memo, useEffect } from 'react';
import { CartItem as CartItemType } from '../store/cartStore';
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { PressableScale } from './PressableScale';
import { BrandMark } from './BrandMark';
import { useExchangeRate } from '../hooks/useExchangeRate';

interface CartItemProps {
  item: CartItemType;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

/**
 * Modern CartItem: glassmorphism surface with subtle gradients and clean typography.
 * Emil Kowalski standards: Reanimated UI thread badge pop, subtle 0.97 scale feedback.
 */
export const CartItemRow = memo(function CartItemRow({ 
  item, 
  onIncrement, 
  onDecrement, 
  onRemove 
}: CartItemProps) {
  const totalPrice = (item.price * item.quantity).toFixed(2);
  const qtyScale = useSharedValue(1);
  const reducedMotion = useReducedMotion();
  const { formatBs } = useExchangeRate();

  useEffect(() => {
    if (!reducedMotion) {
      qtyScale.set(
        withSequence(
          withSpring(1.2, { duration: 120, dampingRatio: 0.7 }),
          withSpring(1, { duration: 180, dampingRatio: 0.8 })
        )
      );
    }
  }, [item.quantity, reducedMotion]);

  const qtyAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: qtyScale.get() }],
  }));

  const handleIncrement = () => {
    Haptics.selectionAsync();
    onIncrement();
  };

  const handleDecrement = () => {
    Haptics.selectionAsync();
    onDecrement();
  };

  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemove();
  };

  return (
    <View style={styles.container}>
      <View style={styles.itemIconCircle}>
        <BrandMark motif="flor2" style={styles.itemIconFlorWatermark} />
        <Text style={styles.itemInitial}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.unitPrice} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>${item.price.toFixed(2)} • {formatBs(item.price)}</Text>
      </View>
      
      <View style={styles.rightSection}>
        <View style={styles.controls}>
          <PressableScale
            style={styles.button}
            onPress={handleDecrement}
            scaleTo={0.97}
            accessibilityLabel={`Disminuir ${item.name}`}
          >
            <Icon name="minus" size={14} color={tokens.colors.text} />
          </PressableScale>

          <View style={styles.quantityContainer}>
            <Animated.View style={qtyAnimatedStyle}>
              <Text style={styles.quantity}>{item.quantity}</Text>
            </Animated.View>
          </View>

          <PressableScale
            style={styles.button}
            onPress={handleIncrement}
            scaleTo={0.97}
            accessibilityLabel={`Aumentar ${item.name}`}
          >
            <Icon name="plus" size={14} color={tokens.colors.text} />
          </PressableScale>
        </View>

        <View style={styles.totalAndAction}>
          <View style={styles.totalPriceContainer}>
            <Text style={styles.total}>${totalPrice}</Text>
            <Text style={styles.totalBs} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{formatBs(item.price * item.quantity)}</Text>
          </View>
          <PressableScale
            style={styles.removeButton}
            onPress={handleRemove}
            scaleTo={0.97}
            accessibilityLabel={`Eliminar ${item.name} del carrito`}
          >
            <Icon name="trash" size={18} color={tokens.colors.coral} />
          </PressableScale>
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
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  itemIconCircle: {
    width: scale(52),
    height: scale(52),
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.mahoganyDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
  },
  itemIconFlorWatermark: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    opacity: 0.18,
  },
  itemInitial: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  info: {
    flex: 1,
    marginRight: scale(8),
  },
  name: {
    fontFamily: FontNames.parkinsans,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  unitPrice: {
    fontFamily: FontNames.parkinsans,
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
    backgroundColor: tokens.colors.bg,
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
    textAlign: 'right',
  },
  totalBs: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: tokens.colors.textMuted,
    textAlign: 'right',
  },
  totalPriceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: verticalScale(1),
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

