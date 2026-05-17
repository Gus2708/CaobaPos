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
          { backgroundColor: tokens.colors.surface }
        ]} 
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

