import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../lib/designTokens';
import { scale } from '../lib/responsive';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: 'subtle' | 'medium' | 'strong';
  variant?: 'default' | 'elevated' | 'inset';
}

/**
 * Clean dark card component with layered depth.
 * Optimized for 2026 aesthetics: Glassmorphism gradients + refined borders.
 */
export function GlassCard({ 
  children, 
  intensity = 'medium', 
  variant = 'default', 
  style, 
  ...props 
}: GlassCardProps) {
  const gradientColors = intensity === 'strong' 
    ? ['rgba(40, 40, 48, 0.7)', 'rgba(25, 25, 32, 0.4)'] as const
    : ['rgba(30, 30, 36, 0.6)', 'rgba(20, 20, 26, 0.3)'] as const;

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
      <LinearGradient
        colors={gradientColors}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
});

const variantStyles = StyleSheet.create({
  default: {
    borderRadius: tokens.radius.card,
  },
  elevated: {
    borderRadius: tokens.radius.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  inset: {
    borderRadius: tokens.radius.chip,
  },
});

