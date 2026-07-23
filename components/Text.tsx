import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, Platform } from 'react-native';
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

  // Determine font family and weight dynamically by platform
  let resolvedFontFamily: string | undefined = undefined;
  let resolvedFontWeight: '400' | '500' | '600' | '700' | undefined = undefined;

  if (Platform.OS === 'web') {
    // Web: Use the exact loaded local font name as primary, with fallback to standard system/CDN fonts
    const targetFont = fontMap[resolvedFamily][resolvedWeight];
    resolvedFontFamily = resolvedFamily === 'mono' 
      ? `${targetFont}, "JetBrains Mono", monospace` 
      : `${targetFont}, "Instrument Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    
    if (resolvedWeight === 'regular') resolvedFontWeight = '400';
    else if (resolvedWeight === 'medium') resolvedFontWeight = '500';
    else if (resolvedWeight === 'semiBold') resolvedFontWeight = '600';
    else if (resolvedWeight === 'bold') resolvedFontWeight = '700';
  } else {
    // Native (iOS/Android): Use bundled Expo Font keys
    const targetFont = fontMap[resolvedFamily][resolvedWeight];
    const isLoaded = Font.isLoaded(targetFont);
    resolvedFontFamily = isLoaded ? targetFont : undefined;
  }

  // Clean up native properties to prevent font resolver crash / double-styling
  delete scaledStyle.fontFamily;
  delete scaledStyle.fontWeight;

  // Ensure font size is defined, avoiding double-scaling if already calculated in stylesheets
  if (!scaledStyle.fontSize) {
    scaledStyle.fontSize = moderateScale(14);
  }

  return (
    <RNText
      allowFontScaling={true}
      maxFontSizeMultiplier={1.35}
      {...props}
      style={[
        { 
          fontFamily: resolvedFontFamily,
          fontWeight: resolvedFontWeight,
        }, 
        scaledStyle
      ]}
    />
  );
}

export { AppText as Text };