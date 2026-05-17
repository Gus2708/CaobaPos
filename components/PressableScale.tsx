import React from 'react';
import { Animated, TouchableOpacity, TouchableOpacityProps, ViewStyle, StyleProp } from 'react-native';
import { usePressAnimation } from '../hooks/usePressAnimation';

interface PressableScaleProps extends TouchableOpacityProps {
  scaleTo?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Drop-in TouchableOpacity replacement that adds a subtle scale-on-press
 * spring animation. Pass `scaleTo` to control the squeeze depth (0.94 default).
 */
export function PressableScale({
  scaleTo = 0.96,
  containerStyle,
  onPressIn,
  onPressOut,
  children,
  activeOpacity = 0.85,
  ...rest
}: PressableScaleProps) {
  const { scale, onPressIn: animIn, onPressOut: animOut } = usePressAnimation({ scaleTo });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, containerStyle]}>
      <TouchableOpacity
        {...rest}
        activeOpacity={activeOpacity}
        onPressIn={(e) => {
          animIn();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          animOut();
          onPressOut?.(e);
        }}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}
