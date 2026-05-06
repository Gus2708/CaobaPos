import { useRef, useCallback } from 'react';
import { Animated } from 'react-native';
import { tokens } from '../lib/designTokens';

interface PressAnimationOptions {
  scaleTo?: number;
  spring?: { tension: number; friction: number };
}

/**
 * Reusable scale-on-press animation for any touchable.
 *
 * Usage:
 *   const { scale, onPressIn, onPressOut } = usePressAnimation();
 *   <Animated.View style={{ transform: [{ scale }] }}>
 *     <TouchableOpacity onPressIn={onPressIn} onPressOut={onPressOut}>...</TouchableOpacity>
 *   </Animated.View>
 */
export function usePressAnimation(options: PressAnimationOptions = {}) {
  const { scaleTo = 0.96, spring = tokens.animation.springBounce } = options;
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      ...spring,
    }).start();
  }, [scale, scaleTo, spring]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      ...spring,
    }).start();
  }, [scale, spring]);

  return { scale, onPressIn, onPressOut };
}
