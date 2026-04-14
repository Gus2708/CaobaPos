import { TextProps } from 'react-native';
import { Text } from './Text';
import { FontNames } from '../lib/fontNames';
import { tokens } from '../lib/designTokens';
import { moderateScale } from '../lib/responsive';

interface PriceDisplayProps extends TextProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PriceDisplay({ amount, size = 'md', style, ...props }: PriceDisplayProps) {
  const sizes = {
    sm: moderateScale(14),
    md: moderateScale(18),
    lg: moderateScale(24),
    xl: moderateScale(36),
  };

  return (
    <Text
      style={[
        {
          fontFamily: FontNames.jetBrainsMono,
          fontWeight: '700',
          color: tokens.colors.mahogany,
          fontSize: sizes[size],
        },
        style,
      ]}
      {...props}
    >
      ${amount.toFixed(2)}
    </Text>
  );
}