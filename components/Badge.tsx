import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text } from './Text';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { Icon } from './Icon';

export type BadgeVariant = 'neutral' | 'mahogany' | 'sage' | 'coral' | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Standardized Badge/Tag component for CaobaPOS.
 * Migrated from the "category span" style to ensure global UI consistency.
 */
export function Badge({ 
  children, 
  variant = 'neutral', 
  icon, 
  style, 
  textStyle 
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'mahogany':
        return {
          bg: tokens.colors.mahoganyDim,
          border: tokens.colors.borderAccent,
          text: tokens.colors.mahogany,
        };
      case 'sage':
        return {
          bg: tokens.colors.sageDim,
          border: tokens.colors.sageGlow,
          text: tokens.colors.sage,
        };
      case 'coral':
        return {
          bg: tokens.colors.coralDim,
          border: tokens.colors.coralGlow,
          text: tokens.colors.coral,
        };
      case 'amber':
        return {
          bg: tokens.colors.amberDim,
          border: tokens.colors.amberDim,
          text: tokens.colors.amber,
        };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.04)',
          border: tokens.colors.border,
          text: tokens.colors.textSecondary,
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <View style={[
      styles.badge, 
      { backgroundColor: vStyles.bg, borderColor: vStyles.border },
      style
    ]}>
      {icon && (
        <View style={styles.iconContainer}>
          <Icon name={icon} size={12} color={vStyles.text} />
        </View>
      )}
      <Text style={[
        styles.text, 
        { color: vStyles.text },
        textStyle
      ]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: tokens.radius.chip, // 12px
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: scale(6),
  },
  text: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    letterSpacing: scale(0.2),
  },
});
