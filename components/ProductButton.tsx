import React, { memo } from 'react';
import { CachedImage } from './CachedImage';
import { TouchableOpacity, StyleSheet, View, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { Product, useCartStore } from '../store/cartStore';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { Icon } from './Icon';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { usePressAnimation } from '../hooks/usePressAnimation';

interface ProductButtonProps {
  product: Product;
  onPress: () => void;
  compact?: boolean;  // tablet grid mode: vertical card
}

const isValidImageUrl = (url?: string): boolean => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

function ProductButtonComponent({ product, onPress, compact = false }: ProductButtonProps) {
  const isLowStock = product.stock_quantity < 5;
  const isOutOfStock = product.stock_quantity <= 0;
  const { scale: scaleAnim, onPressIn, onPressOut } = usePressAnimation({ scaleTo: 0.97 });

  // Zustand Store integrations for active selection and inline quantity management
  const cartItem = useCartStore((state) => state.items.find((item) => item.id === product.id));
  const quantityInCart = cartItem ? cartItem.quantity : 0;
  const updateQuantity = useCartStore((state) => state.updateQuantity);

  const hasQuantity = quantityInCart > 0;

  const handlePress = () => {
    if (isOutOfStock) return;
    onPress();
  };

  const stockColor = isOutOfStock
    ? tokens.colors.coral
    : isLowStock
    ? tokens.colors.amber
    : tokens.colors.sage;

  const gradientColors = tokens.styles.liquidCard.reflectionColors;

  if (compact) {
    // Tablet grid mode: vertical card
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%', flex: 1 }}>
        <View 
          style={[
            styles.cardContainer, 
            hasQuantity && styles.cardContainerActive,
            isOutOfStock && styles.containerDisabled
          ]}
        >
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          
          <TouchableOpacity
            style={styles.cardDetailsPressable}
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.85}
            disabled={isOutOfStock}
          >
            {/* Image or placeholder */}
            <View style={styles.cardImageWrapper}>
              {isValidImageUrl(product.image_url) ? (
                <CachedImage
                  remoteUri={product.image_url!}
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
              
              {/* Original stock badge */}
              <View style={[styles.stockBadge, { backgroundColor: `${stockColor}18` }]}>
                <Text style={[styles.stockText, { color: stockColor }]}>
                  {isOutOfStock ? '×' : product.stock_quantity}
                </Text>
              </View>

              {/* Floating premium quantity badge on top right */}
              {hasQuantity && (
                <View style={styles.cardQuantityBadge}>
                  <Text style={styles.cardQuantityBadgeText}>{quantityInCart}</Text>
                </View>
              )}
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

          {/* Bottom inline controls */}
          {hasQuantity && (
            <View style={styles.cardInlineControls}>
              <TouchableOpacity
                style={styles.cardControlBtn}
                onPress={() => updateQuantity(product.id, quantityInCart - 1)}
                activeOpacity={0.7}
              >
                <Icon name="minus" size={14} color={tokens.colors.text} />
              </TouchableOpacity>
              
              <Text style={styles.cardQuantityText}>{quantityInCart}</Text>

              <TouchableOpacity
                style={[styles.cardControlBtn, styles.cardControlBtnAdd]}
                onPress={handlePress}
                activeOpacity={0.7}
              >
                <Icon name="plus" size={14} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }

  // Mobile list mode: horizontal row — clean card
  if (hasQuantity) {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
        <View style={[styles.container, styles.containerActive, isOutOfStock && styles.containerDisabled]}>
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Left pressable details section */}
          <TouchableOpacity
            style={styles.detailsPressable}
            onPress={handlePress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            activeOpacity={0.85}
            disabled={isOutOfStock}
          >
            {/* Image or placeholder */}
            <View style={styles.imageWrapper}>
              {isValidImageUrl(product.image_url) ? (
                <CachedImage
                  remoteUri={product.image_url!}
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

            {/* Info */}
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
          </TouchableOpacity>

          {/* Right inline controls section */}
          <View style={styles.inlineControlsContainer}>
            <TouchableOpacity
              style={styles.controlBtn}
              onPress={() => updateQuantity(product.id, quantityInCart - 1)}
              activeOpacity={0.7}
            >
              <Icon name="minus" size={18} color={tokens.colors.text} />
            </TouchableOpacity>
            
            <Text style={styles.quantityText}>{quantityInCart}</Text>

            <TouchableOpacity
              style={[styles.controlBtn, styles.controlBtnAdd]}
              onPress={handlePress}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }

  // Default horizontal row when not in cart
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], width: '100%' }}>
      <TouchableOpacity
        style={[styles.container, isOutOfStock && styles.containerDisabled]}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
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
          {isValidImageUrl(product.image_url) ? (
            <CachedImage
              remoteUri={product.image_url!}
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
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius,
    padding: scale(16),
    borderWidth: tokens.styles.liquidCard.borderWidth,
    borderColor: tokens.styles.liquidCard.borderColor,
    gap: scale(14),
    minHeight: verticalScale(84),
    overflow: 'hidden',
  },
  containerActive: {
    borderColor: tokens.colors.mahogany,
    backgroundColor: 'rgba(184, 123, 90, 0.08)',
  },
  containerDisabled: {
    opacity: 0.4,
  },
  detailsPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
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
    flexWrap: 'wrap',
    gap: scale(10),
    rowGap: verticalScale(4),
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
    color: tokens.colors.amberGold, // Gold/Amber for premium feel
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
  inlineControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: scale(2),
  },
  controlBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlBtnAdd: {
    backgroundColor: tokens.colors.mahogany,
    borderColor: tokens.colors.mahoganyBright,
  },
  quantityText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: tokens.colors.text,
    minWidth: scale(18),
    textAlign: 'center',
  },

  // ─── Compact / Tablet Card (vertical) ──────────────────────────────
  cardContainer: {
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius,
    borderWidth: tokens.styles.liquidCard.borderWidth,
    borderColor: tokens.styles.liquidCard.borderColor,
    overflow: 'hidden',
    flex: 1,
    width: '100%',
  },
  cardContainerActive: {
    borderColor: tokens.colors.mahogany,
    backgroundColor: 'rgba(184, 123, 90, 0.08)',
  },
  cardDetailsPressable: {
    width: '100%',
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
    color: tokens.colors.amberGold,
  },
  stockBadge: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: tokens.radius.pill,
  },
  stockText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  cardQuantityBadge: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: tokens.colors.mahogany,
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  cardQuantityBadgeText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: '#FFFFFF',
  },
  cardInlineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(12),
    paddingBottom: verticalScale(12),
    marginTop: verticalScale(-4),
  },
  cardControlBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardControlBtnAdd: {
    backgroundColor: tokens.colors.mahogany,
    borderColor: tokens.colors.mahoganyBright,
  },
  cardQuantityText: {
    fontFamily: FontNames.jetBrainsMono,
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: tokens.colors.text,
    textAlign: 'center',
    flex: 1,
  },
});
