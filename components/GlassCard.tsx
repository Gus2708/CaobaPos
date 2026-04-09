import { View, ViewProps, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: 'subtle' | 'medium' | 'strong';
  variant?: 'default' | 'elevated' | 'inset';
}

const INTENSITY_CONFIG = {
  subtle: {
    backgroundColor: 'rgba(30, 30, 36, 0.4)',
    borderOpacity: 0.06,
    blurIntensity: 10,
  },
  medium: {
    backgroundColor: 'rgba(30, 30, 36, 0.6)',
    borderOpacity: 0.1,
    blurIntensity: 20,
  },
  strong: {
    backgroundColor: 'rgba(30, 30, 36, 0.8)',
    borderOpacity: 0.15,
    blurIntensity: 30,
  },
};

const VARIANT_CONFIG = {
  default: {
    borderRadius: 24,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  elevated: {
    borderRadius: 28,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
  },
  inset: {
    borderRadius: 20,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
};

export function GlassCard({ 
  children, 
  intensity = 'medium', 
  variant = 'default', 
  style, 
  ...props 
}: GlassCardProps) {
  const intensityStyle = INTENSITY_CONFIG[intensity];
  const variantStyle = VARIANT_CONFIG[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: intensityStyle.backgroundColor,
          borderRadius: variantStyle.borderRadius,
          borderWidth: 1,
          borderColor: `rgba(184, 123, 90, ${intensityStyle.borderOpacity})`,
          shadowColor: '#000',
          shadowOffset: variantStyle.shadowOffset,
          shadowOpacity: variantStyle.shadowOpacity,
          shadowRadius: variantStyle.shadowRadius,
          elevation: variant === 'elevated' ? 12 : 6,
        },
        style,
      ]}
      {...props}
    >
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.highlight} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
});
