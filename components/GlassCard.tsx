import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { AppBlurView } from './AppBlurView';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../lib/designTokens';
import { scale } from '../lib/responsive';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: 'subtle' | 'medium' | 'strong';
  variant?: 'default' | 'elevated' | 'inset';
  blurAmount?: number;
}

/**
 * Clean dark card component with layered depth.
 * Optimized for 2026 aesthetics: Liquid Glass blur + refined borders.
 */
export function GlassCard({ 
  children, 
  intensity = 'medium', 
  variant = 'default', 
  blurAmount,
  style, 
  ...props 
}: GlassCardProps) {
  const isElevated = variant === 'elevated';
  return (
    <View
      style={[
        styles.base,
        intensityStyles[intensity],
        variantStyles[variant],
        style,
      ]}
      {...props}
    >
      <View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: isElevated ? tokens.colors.surfaceElevated : tokens.colors.surface }
        ]} 
      />
      <LinearGradient
        colors={[tokens.colors.glass.liquidHighlight, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.3 }}
        style={styles.topHighlight}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: scale(28),
  },
});

const intensityStyles = StyleSheet.create({
  subtle: {
    borderColor: tokens.colors.borderLight,
  },
  medium: {
    borderColor: tokens.colors.borderMedium,
  },
  strong: {
    borderColor: tokens.colors.borderMedium,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    borderRadius: tokens.radius.card,
  },
  elevated: {
    borderRadius: tokens.radius.card,
    borderColor: tokens.colors.borderMedium,
  },
  inset: {
    borderRadius: tokens.radius.chip,
  },
});

