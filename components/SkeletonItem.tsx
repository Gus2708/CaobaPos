import React, { useRef, useEffect } from 'react';
import { View, Animated, Easing, StyleSheet, useWindowDimensions, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale } from '../lib/responsive';

interface SkeletonItemProps {
  layout: 'card' | 'row';
  count?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * Shimmer skeleton: a translating highlight gradient sweeps across each
 * placeholder block. Runs on the native driver when possible.
 */
function Shimmer({ style }: { style: any }) {
  const translateAnim = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [translateAnim]);

  const translateX = translateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH],
  });

  return (
    <View style={[style, styles.shimmerContainer]}>
      <View style={styles.shimmerBase} />
      <AnimatedLinearGradient
        colors={[
          'rgba(255, 255, 255, 0)',
          'rgba(255, 255, 255, 0.06)',
          'rgba(255, 255, 255, 0.12)',
          'rgba(255, 255, 255, 0.06)',
          'rgba(255, 255, 255, 0)',
        ]}
        locations={[0, 0.35, 0.5, 0.65, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      />
    </View>
  );
}

export function SkeletonItem({ layout, count = 1 }: SkeletonItemProps) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const numColumns = isMobile ? 1 : 3;

  const items = Array.from({ length: count });

  const renderItem = (_: any, index: number) => {
    if (layout === 'card') {
      return (
        <View key={index} style={[styles.wrapper, !isMobile && { width: `${100 / numColumns}%` }]}>
          <View style={styles.card}>
            <Shimmer style={styles.cardImage} />
            <View style={styles.cardContent}>
              <Shimmer style={[styles.title, { width: '80%' }]} />
              <Shimmer style={[styles.subtitle, { width: '40%' }]} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={index} style={styles.wrapper}>
        <View style={styles.row}>
          <Shimmer style={styles.rowImage} />
          <View style={styles.rowContent}>
            <Shimmer style={[styles.title, { width: '60%' }]} />
            <View style={styles.rowMeta}>
              <Shimmer style={[styles.subtitle, { width: scale(40) }]} />
              <Shimmer style={[styles.subtitle, { width: scale(50), borderRadius: tokens.radius.pill }]} />
            </View>
          </View>
          <Shimmer style={styles.rowAction} />
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
  },
  title: {
    height: verticalScale(14),
    borderRadius: scale(4),
  },
  subtitle: {
    height: verticalScale(10),
    borderRadius: scale(4),
  },
  shimmerContainer: {
    overflow: 'hidden',
  },
  shimmerBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
});
