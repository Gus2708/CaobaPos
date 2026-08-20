import { useCallback } from 'react';
import { useSharedValue, useAnimatedStyle, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import { tokens } from '../lib/designTokens';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

interface PressAnimationOptions {
  scaleTo?: number;
  duration?: number;
}

/**
 * Reusable Reanimated scale-on-press hook running strictly on the UI thread.
 * Default 120ms with cubic-bezier(0.23, 1, 0.32, 1) and scale(0.97).
 */
export function usePressAnimation(options: PressAnimationOptions = {}) {
  const { scaleTo = tokens.animation.pressScale, duration = tokens.animation.press } = options;
  const targetScale = Math.max(0.95, Math.min(0.98, scaleTo));
  const scale = useSharedValue(1);
  const reducedMotion = useReducedMotion();

  const onPressIn = useCallback(() => {
    if (reducedMotion) return;
    scale.set(withTiming(targetScale, { duration, easing: EASE_OUT }));
  }, [scale, targetScale, duration, reducedMotion]);

  const onPressOut = useCallback(() => {
    if (reducedMotion) return;
    scale.set(withTiming(1, { duration, easing: EASE_OUT }));
  }, [scale, duration, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return { scale, onPressIn, onPressOut, animatedStyle };
}

