import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

type FontWeight = 'regular' | 'medium' | 'semiBold' | 'bold';
type FontFamily = 'sans' | 'mono';

interface AppTextProps extends RNTextProps {
  weight?: FontWeight;
  family?: FontFamily;
}

const fontMap: Record<FontFamily, Record<FontWeight, any>> = {
  sans: {
    regular: require('@expo-google-fonts/instrument-sans').InstrumentSans_400Regular,
    medium: require('@expo-google-fonts/instrument-sans').InstrumentSans_500Medium,
    semiBold: require('@expo-google-fonts/instrument-sans').InstrumentSans_600SemiBold,
    bold: require('@expo-google-fonts/instrument-sans').InstrumentSans_700Bold,
  },
  mono: {
    regular: require('@expo-google-fonts/jetbrains-mono').JetBrainsMono_400Regular,
    medium: require('@expo-google-fonts/jetbrains-mono').JetBrainsMono_500Medium,
    semiBold: require('@expo-google-fonts/jetbrains-mono').JetBrainsMono_600SemiBold,
    bold: require('@expo-google-fonts/jetbrains-mono').JetBrainsMono_700Bold,
  },
};

export function AppText({ weight = 'regular', family = 'sans', style, ...props }: AppTextProps) {
  return (
    <RNText
      {...props}
      style={[{ fontFamily: fontMap[family][weight] }, style]}
    />
  );
}

export { AppText as Text };