import React, { memo, useRef, useCallback } from 'react';
import { CachedImage } from './CachedImage';
import { TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Product } from '../store/cartStore';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';

interface ProductButtonProps {
  product: Product;
  onPress: () => void;
  compact?: boolean;  // tablet grid mode: vertical card
}

function ProductButtonComponent({ product, onPress, compact = false }: ProductButtonProps) {
  const isLowStock = product.stock_quantity < 5;
  const isOutOfStock = product.stock_quantity <= 0;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (isOutOfStock) return;
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        ...tokens.animation.spring,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...tokens.animation.spring,
      }),
    ]).start();
    onPress();
  }, [isOutOfStock, onPress, scaleAnim]);

  const stockColor = isOutOfStock
    ? tokens.colors.coral
    : isLowStock
    ? tokens.colors.amber
    : tokens.colors.sage;

  const gradientColors = ['rgba(255, 255, 255, 0.05)', 'transparent'] as const;

  if (compact) {
    // Tablet grid mode: vertical card
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.cardContainer, isOutOfStock && styles.containerDisabled]}
          onPress={handlePress}
          activeOpacity={0.85}
          disabled={isOutOfStock}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Image or placeholder */}
          <View style={styles.cardImageWrapper}>
            {product.image_url ? (
              <CachedImage 
                remoteUri={product.image_url} 
                style={styles.cardImage} 
                contentFit="cover"
              />
            ) : (
              <View style={styles.cardPlaceholder}>
                <Text style={[styles.placeholderText, isOutOfStock && styles.placeholderTextDisabled]}>
                  {product.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={[styles.stockBadge, { backgroundColor: `${stockColor}18` }]}>
              <Text style={[styles.stockText, { color: stockColor }]}>
                {isOutOfStock ? '×' : product.stock_quantity}
              </Text>
            </View>
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, isOutOfStock && styles.nameDisabled]} numberOfLines={2} adjustsFontSizeToFit>
              {product.name}
            </Text>
            <Text style={[styles.cardPrice, isOutOfStock && styles.priceDisabled]}>
              ${product.price.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // Mobile list mode: horizontal row — clean card
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.container, isOutOfStock && styles.containerDisabled]}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityLabel={`${product.name}, $${product.price.toFixed(2)}, ${product.stock_quantity} en stock`}
        accessibilityRole="button"
        disabled={isOutOfStock}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {/* Left — image or placeholder */}
        <View style={styles.imageWrapper}>
          {product.image_url ? (
            <CachedImage 
              remoteUri={product.image_url} 
              style={styles.image} 
              contentFit="cover"
            />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: tokens.colors.mahoganyDim }]}>
              <Text
                style={[
                  styles.placeholderText,
                  { color: tokens.colors.mahogany },
                  isOutOfStock && styles.placeholderTextDisabled,
                ]}
              >
                {product.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Right — info */}
        <View style={styles.info}>
          <Text
            style={[styles.name, isOutOfStock && styles.nameDisabled]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {product.name}
          </Text>
          <View style={styles.itemMeta}>
            <Text style={[styles.price, isOutOfStock && styles.priceDisabled]}>
              ${product.price.toFixed(2)}
            </Text>
            <View style={[
              styles.stockDotRow, 
              { backgroundColor: product.stock_quantity < 10 ? tokens.colors.coralDim : 'rgba(255,255,255,0.05)' }
            ]}>
               <View style={[styles.stockDot, { backgroundColor: stockColor }]} />
               <Text style={[styles.itemStockText, { color: product.stock_quantity < 10 ? tokens.colors.coral : tokens.colors.textSecondary }]}>
                 {product.stock_quantity} uds
               </Text>
            </View>
          </View>
        </View>

        {/* Action Icon */}
        <View style={styles.actionSection}>
          {!isOutOfStock && (
            <View style={styles.addBtn}>
              <Icon name="plus" size={24} color="rgba(255, 255, 255, 0.7)" />
            </View>
          )}
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
}

export const ProductButton = memo(ProductButtonComponent, (prev, next) =>
  prev.product.id === next.product.id &&
  prev.product.name === next.product.name &&
  prev.product.price === next.product.price &&
  prev.product.stock_quantity === next.product.stock_quantity &&
  prev.product.image_url === next.product.image_url &&
  prev.compact === next.compact
);

const styles = StyleSheet.create({
  // ─── Mobile List Row ───────────────────────────────────────────────
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.xl,
    padding: scale(14),
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    gap: scale(14),
    minHeight: verticalScale(84),
    overflow: 'hidden',
  },
  containerDisabled: {
    opacity: 0.4,
  },
  imageWrapper: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    overflow: 'hidden',
    flexShrink: 0,
    backgroundColor: tokens.colors.bg,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(20),
    fontWeight: '800',
  },
  placeholderTextDisabled: {
    color: tokens.colors.textDim,
  },
  info: {
    flex: 1,
    gap: verticalScale(4),
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  stockDotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  stockDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
  },
  itemStockText: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(11),
    fontWeight: '800',
  },
  name: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  nameDisabled: {
    color: tokens.colors.textMuted,
  },
  actionSection: {
    marginLeft: scale(4),
  },
  price: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  priceDisabled: {
    color: tokens.colors.textDim,
  },
  addBtn: {
    width: scale(44),
    height: scale(44),
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Compact / Tablet Card (vertical) ──────────────────────────────
  cardContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.borderLight,
    overflow: 'hidden',
    flex: 1,
  },
  cardImageWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1,
    backgroundColor: tokens.colors.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.mahoganyDim,
  },
  cardInfo: {
    padding: scale(12),
    gap: verticalScale(6),
  },
  cardName: {
    fontFamily: FontNames.instrumentSans,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: tokens.colors.text,
  },
  cardPrice: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: tokens.colors.mahogany,
  },
  stockBadge: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: tokens.radius.pill,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stockText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
});

