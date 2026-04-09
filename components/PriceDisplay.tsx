import { Text, TextProps } from 'react-native';
import { FontNames } from '../lib/fontNames';

interface PriceDisplayProps extends TextProps {
  amount: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PriceDisplay({ amount, size = 'md', style, ...props }: PriceDisplayProps) {
  const sizes = {
    sm: 14,
    md: 18,
    lg: 24,
    xl: 36,
  };

  return (
    <Text
      style={[
        {
          fontFamily: FontNames.jetBrainsMono,
          fontWeight: '700',
          color: '#B87B5A',
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