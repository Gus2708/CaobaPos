import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { moderateScale } from '../lib/responsive';
import * as Font from 'expo-font';

type FontWeight = 'regular' | 'medium' | 'semiBold' | 'bold';
type FontFamily = 'sans' | 'mono';

interface AppTextProps extends RNTextProps {
  weight?: FontWeight;
  family?: FontFamily;
}

const fontMap: Record<FontFamily, Record<FontWeight, string>> = {
  sans: {
    regular: 'InstrumentSans_400Regular',
    medium: 'InstrumentSans_500Medium',
    semiBold: 'InstrumentSans_600SemiBold',
    bold: 'InstrumentSans_700Bold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semiBold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  },
};

function mapWeight(weight?: string | number): FontWeight {
  if (!weight) return 'regular';
  const w = weight.toString().toLowerCase();
  if (w === '500' || w === 'medium') return 'medium';
  if (w === '600' || w === 'semibold' || w === '600semibold' || w === 'semi-bold') return 'semiBold';
  if (w === '700' || w === '800' || w === '900' || w === 'bold' || w === 'extrabold' || w === '800extrabold') return 'bold';
  return 'regular';
}

function mapFamily(family?: string): FontFamily {
  if (!family) return 'sans';
  const f = family.toLowerCase();
  if (f.includes('mono') || f.includes('jetbrains')) {
    return 'mono';
  }
  return 'sans';
}

export function AppText({ weight = 'regular', family = 'sans', style, ...props }: AppTextProps) {
  // Flatten and scale font size if it exists in styles
  const flattenedStyle = StyleSheet.flatten(style) || {};
  const scaledStyle = { ...flattenedStyle };
  
  // Resolve family and weight
  let resolvedFamily: FontFamily = family;
  let resolvedWeight: FontWeight = weight;

  if (scaledStyle.fontFamily) {
    resolvedFamily = mapFamily(scaledStyle.fontFamily);
  }

  if (scaledStyle.fontWeight) {
    resolvedWeight = mapWeight(scaledStyle.fontWeight);
  }

  // Get target custom font string name
  const targetFont = fontMap[resolvedFamily][resolvedWeight];

  // Safely check if font is loaded; if not, fall back to undefined (system default)
  const isLoaded = Font.isLoaded(targetFont);
  const resolvedFontFamily = isLoaded ? targetFont : undefined;

  // Clean up native properties to prevent font resolver crash / double-styling
  delete scaledStyle.fontFamily;
  delete scaledStyle.fontWeight;

  // Apply responsive font scaling
  if (scaledStyle.fontSize) {
    scaledStyle.fontSize = moderateScale(scaledStyle.fontSize);
  } else {
    // Default size is 14 scaled
    scaledStyle.fontSize = moderateScale(14);
  }

  return (
    <RNText
      {...props}
      style={[
        { 
          fontFamily: resolvedFontFamily,
        }, 
        scaledStyle
      ]}
    />
  );
}

export { AppText as Text };