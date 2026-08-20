import React from 'react';
import { View, StyleSheet, TextStyle, StyleProp, ViewStyle } from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { moderateScale, scale } from '../lib/responsive';
import { useExchangeRate, formatBs } from '../hooks/useExchangeRate';

interface PriceDisplayProps {
  amount: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showBs?: boolean;
  direction?: 'vertical' | 'horizontal';
  containerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<TextStyle>;
  bsStyle?: StyleProp<TextStyle>;
  color?: string;
  numberOfLines?: number;
}

export function PriceDisplay({
  amount,
  size = 'md',
  showBs = false,
  direction = 'vertical',
  containerStyle,
  style,
  bsStyle,
  color,
  numberOfLines = 1,
}: PriceDisplayProps) {
  const { rate, toBs } = useExchangeRate();

  const usdSizes = {
    xs: moderateScale(12),
    sm: moderateScale(14),
    md: moderateScale(18),
    lg: moderateScale(22),
    xl: moderateScale(28),
  };

  const bsSizes = {
    xs: moderateScale(10),
    sm: moderateScale(11),
    md: moderateScale(13),
    lg: moderateScale(15),
    xl: moderateScale(18),
  };

  const formattedUsd = `$${Number(amount || 0).toFixed(2)}`;
  const bsAmount = toBs(amount || 0);
  const formattedBs = formatBs(bsAmount);

  if (!showBs) {
    return (
      <Text
        style={[
          styles.usdText,
          {
            fontSize: usdSizes[size],
            color: color || tokens.colors.mahogany,
          },
          style,
        ]}
        numberOfLines={numberOfLines}
      >
        {formattedUsd}
      </Text>
    );
  }

  return (
    <View
      style={[
        direction === 'horizontal' ? styles.horizontalContainer : styles.verticalContainer,
        containerStyle,
      ]}
    >
      <Text
        style={[
          styles.usdText,
          {
            fontSize: usdSizes[size],
            color: color || tokens.colors.mahogany,
          },
          style,
        ]}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {formattedUsd}
      </Text>

      <Text
        style={[
          styles.bsText,
          {
            fontSize: bsSizes[size],
            color: tokens.colors.textMuted,
          },
          direction === 'horizontal' && { marginLeft: scale(6) },
          bsStyle,
        ]}
        numberOfLines={numberOfLines}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {formattedBs}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  verticalContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  usdText: {
    fontFamily: FontNames.jetBrainsMono,
    fontWeight: '700',
  },
  bsText: {
    fontFamily: FontNames.jetBrainsMono,
    fontWeight: '500',
    marginTop: moderateScale(2),
  },
});