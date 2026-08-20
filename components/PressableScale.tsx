import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { tokens } from '../lib/designTokens';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  activeOpacity?: number; // legacy compatibility
}

/**
 * Standard Emil Kowalski Pressable:
 * 120ms cubic-bezier(0.23, 1, 0.32, 1) transition to scale(0.97).
 * Uses 48dp touch target hitSlop on Android / 44pt on iOS, and pressRetentionOffset.
 * Respects prefers-reduced-motion.
 */
export function PressableScale({
  scaleTo = tokens.animation.pressScale,
  style,
  containerStyle,
  onPress,
  onPressIn,
  onPressOut,
  children,
  hitSlop = 12,
  pressRetentionOffset = 16,
  disabled,
  ...rest
}: PressableScaleProps) {
  const targetScale = Math.max(0.95, Math.min(0.98, scaleTo));
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const handlePressIn = useCallback(
    (e: any) => {
      if (!disabled && !reducedMotion) {
        scale.set(withTiming(targetScale, { duration: tokens.animation.press, easing: EASE_OUT }));
      }
      onPressIn?.(e);
    },
    [disabled, reducedMotion, targetScale, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      if (!reducedMotion) {
        scale.set(withTiming(1, { duration: tokens.animation.press, easing: EASE_OUT }));
      }
      onPressOut?.(e);
    },
    [reducedMotion, onPressOut]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      hitSlop={hitSlop}
      pressRetentionOffset={pressRetentionOffset}
      disabled={disabled}
      style={containerStyle}
      {...rest}
    >
      <Animated.View style={[animatedStyle, style]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}


