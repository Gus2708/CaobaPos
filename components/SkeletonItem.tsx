import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, useWindowDimensions } from 'react-native';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale } from '../lib/responsive';

interface SkeletonItemProps {
  layout: 'card' | 'row';
  count?: number;
}

/**
 * Modern Skeleton loader using a subtle breathing animation.
 * Follows the Liquid Glass layered surface design system.
 */
export function SkeletonItem({ layout, count = 1 }: SkeletonItemProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const numColumns = isMobile ? 1 : 3;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  const items = Array.from({ length: count });

  const renderItem = (_: any, index: number) => {
    if (layout === 'card') {
      return (
        <View key={index} style={[styles.wrapper, !isMobile && { width: `${100 / numColumns}%` }]}>
          <View style={styles.card}>
            <Animated.View style={[styles.cardImage, { opacity }]} />
            <View style={styles.cardContent}>
              <Animated.View style={[styles.title, { width: '80%', opacity }]} />
              <Animated.View style={[styles.subtitle, { width: '40%', opacity }]} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={index} style={styles.wrapper}>
        <View style={styles.row}>
          <Animated.View style={[styles.rowImage, { opacity }]} />
          <View style={styles.rowContent}>
            <Animated.View style={[styles.title, { width: '60%', opacity }]} />
            <View style={styles.rowMeta}>
               <Animated.View style={[styles.subtitle, { width: scale(40), opacity }]} />
               <Animated.View style={[styles.subtitle, { width: scale(50), borderRadius: tokens.radius.pill, opacity }]} />
            </View>
          </View>
          <Animated.View style={[styles.rowAction, { opacity }]} />
        </View>
      </View>
    );
  };

  return <View style={layout === 'card' && !isMobile ? styles.grid : undefined}>{items.map((_, i) => renderItem(_, i))}</View>;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  wrapper: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(8),
  },
  card: {
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius,
    aspectRatio: 1,
    borderWidth: tokens.styles.liquidCard.borderWidth,
    borderColor: tokens.styles.liquidCard.borderColor,
    overflow: 'hidden',
  },
  cardImage: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderLight,
  },
  cardContent: {
    padding: scale(12),
    gap: verticalScale(6),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderRadius: tokens.styles.liquidCard.borderRadius,
    padding: scale(16),
    borderWidth: tokens.styles.liquidCard.borderWidth,
    borderColor: tokens.styles.liquidCard.borderColor,
    minHeight: verticalScale(84),
    gap: scale(14),
  },
  rowImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowContent: {
    flex: 1,
    gap: verticalScale(6),
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginTop: verticalScale(2),
  },
  rowAction: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    height: verticalScale(14),
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: scale(4),
  },
  subtitle: {
    height: verticalScale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: scale(4),
  },
});
