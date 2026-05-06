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
  const defaultBlurAmount = intensity === 'strong' ? 30 : intensity === 'medium' ? 20 : 15;
  const finalBlurAmount = blurAmount ?? defaultBlurAmount;

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
      <AppBlurView
        tint="dark"
        intensity={finalBlurAmount}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.03)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.innerBorder} />
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
  innerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    opacity: 0.5,
  },
});

const intensityStyles = StyleSheet.create({
  subtle: {
    backgroundColor: 'transparent',
    borderColor: tokens.colors.border,
  },
  medium: {
    backgroundColor: 'transparent',
    borderColor: tokens.colors.borderMedium,
  },
  strong: {
    backgroundColor: 'transparent',
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

