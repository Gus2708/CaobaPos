import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale } from '../lib/responsive';

interface SkeletonItemProps {
  layout: 'card' | 'row';
  count?: number;
}

/**
 * Modern Skeleton loader using a subtle breathing animation.
 * Follows the layered surface design system.
 */
export function SkeletonItem({ layout, count = 1 }: SkeletonItemProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
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
        <View key={index} style={styles.card}>
          <Animated.View style={[styles.cardImage, { opacity }]} />
          <View style={styles.cardContent}>
            <Animated.View style={[styles.title, { width: '80%', opacity }]} />
            <Animated.View style={[styles.subtitle, { width: '40%', opacity }]} />
          </View>
        </View>
      );
    }

    return (
      <View key={index} style={styles.row}>
        <Animated.View style={[styles.rowImage, { opacity }]} />
        <View style={styles.rowContent}>
          <Animated.View style={[styles.title, { width: '60%', opacity }]} />
          <Animated.View style={[styles.subtitle, { width: '30%', opacity }]} />
        </View>
        <Animated.View style={[styles.rowPrice, { opacity }]} />
      </View>
    );
  };

  return <>{items.map((_, i) => renderItem(_, i))}</>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.card,
    aspectRatio: 1,
    padding: scale(8),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  cardImage: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: tokens.radius.sm,
    marginBottom: verticalScale(8),
  },
  cardContent: {
    gap: verticalScale(6),
    paddingHorizontal: scale(4),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radius.card,
    padding: scale(12),
    marginHorizontal: scale(16),
    marginBottom: verticalScale(8),
    borderWidth: 1,
    borderColor: tokens.colors.border,
    minHeight: verticalScale(76),
  },
  rowImage: {
    width: scale(52),
    height: scale(52),
    borderRadius: tokens.radius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rowContent: {
    flex: 1,
    marginLeft: scale(12),
    gap: verticalScale(6),
  },
  rowPrice: {
    width: scale(60),
    height: verticalScale(24),
    borderRadius: tokens.radius.xs,
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
