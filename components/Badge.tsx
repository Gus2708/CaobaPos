import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text } from './Text';
import { tokens } from '../lib/designTokens';
import { scale, verticalScale, moderateScale } from '../lib/responsive';
import { Icon } from './Icon';
import { FontNames } from '../lib/fontNames';

export type BadgeVariant = 'neutral' | 'mahogany' | 'sage' | 'coral' | 'amber';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: string;
  showChevron?: boolean;
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
  showChevron,
  style, 
  textStyle 
}: BadgeProps) {
  const getValueStyles = () => {
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

  const vStyles = getValueStyles();

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
      {showChevron && (
        <View style={styles.rightIconContainer}>
          <Icon name="chevron-down" size={10} color={vStyles.text} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: tokens.radius.pill,
    borderWidth: 1,
  },
  iconContainer: {
    marginRight: scale(8),
  },
  rightIconContainer: {
    marginLeft: scale(6),
  },
  text: {
    fontSize: moderateScale(11),
    fontFamily: FontNames.jetBrainsMono,
    fontWeight: '700',
    letterSpacing: scale(0.3),
    textTransform: 'uppercase',
  },
});
