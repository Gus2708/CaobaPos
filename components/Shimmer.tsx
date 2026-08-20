import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, Dimensions, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  useReducedMotion,
  SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../lib/designTokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShimmerContextType {
  shimmerX: SharedValue<number>;
  reducedMotion: boolean;
}

const ShimmerContext = createContext<ShimmerContextType | null>(null);

export function ShimmerProvider({
  duration = 1500,
  children,
}: {
  duration?: number;
  children: React.ReactNode;
}) {
  const shimmerX = useSharedValue(-1);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!reducedMotion) {
      shimmerX.set(
        withRepeat(
          withTiming(1, { duration, easing: Easing.linear }),
          -1,
          false
        )
      );
    }
  }, [duration, reducedMotion, shimmerX]);

  const value = useMemo(
    () => ({ shimmerX, reducedMotion: !!reducedMotion }),
    [shimmerX, reducedMotion]
  );

  return <ShimmerContext.Provider value={value}>{children}</ShimmerContext.Provider>;
}

export function useShimmer() {
  return useContext(ShimmerContext);
}

export interface ShimmerRectProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * ShimmerRect: Atomic placeholder rectangular/pill block with synchronized GPU light sweep.
 */
export function ShimmerRect({
  width = '100%',
  height = 16,
  borderRadius = 6,
  style,
}: ShimmerRectProps) {
  const context = useShimmer();
  const localReduced = useReducedMotion();
  const localX = useSharedValue(-1);

  useEffect(() => {
    if (!context && !localReduced) {
      localX.set(
        withRepeat(
          withTiming(1, { duration: 1500, easing: Easing.linear }),
          -1,
          false
        )
      );
    }
  }, [context, localReduced, localX]);

  const activeSharedX = context ? context.shimmerX : localX;
  const isReduced = context ? context.reducedMotion : localReduced;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: activeSharedX.get() * SCREEN_WIDTH * 1.5 }],
  }));

  return (
    <View
      style={[
        styles.rectBase,
        { width, height, borderRadius },
        style,
      ]}
    >
      {!isReduced && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(255, 255, 255, 0.14)',
              'rgba(255, 255, 255, 0.05)',
              'rgba(255, 255, 255, 0)',
            ]}
            locations={[0, 0.35, 0.5, 0.65, 1]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[StyleSheet.absoluteFill, { width: SCREEN_WIDTH * 1.5 }]}
          />
        </Animated.View>
      )}
    </View>
  );
}

export interface ShimmerBlockProps {
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/**
 * ShimmerBlock: Container wrapper that applies shimmer effect over composite structural layouts.
 */
export function ShimmerBlock({
  borderRadius = 12,
  style,
  children,
}: ShimmerBlockProps) {
  return (
    <View style={[styles.blockBase, { borderRadius }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  rectBase: {
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    overflow: 'hidden',
    position: 'relative',
  },
  blockBase: {
    backgroundColor: tokens.styles.liquidCard.backgroundColor,
    borderWidth: tokens.styles.liquidCard.borderWidth,
    borderColor: tokens.styles.liquidCard.borderColor,
    overflow: 'hidden',
  },
});
