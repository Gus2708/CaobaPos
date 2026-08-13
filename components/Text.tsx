import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, Platform } from 'react-native';
import { moderateScale } from '../lib/responsive';
import * as Font from 'expo-font';
import { fonts } from '../hooks/useFonts';

type FontWeight = 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold';
type FontFamily = 'sans' | 'mono';

interface AppTextProps extends RNTextProps {
  weight?: FontWeight;
  family?: FontFamily;
}

// Parkinsans is the official brand typeface (see the Caoba brand manual).
// Every AppText render resolves through this map, so it is the single source of truth
// for what the app actually renders — changing font tokens elsewhere has no effect
// unless this map changes too.
// Keys come straight from the loader in hooks/useFonts so a family can never be
// rendered without being registered — the two drifting apart is what left the app
// rendering Instrument Sans after the Parkinsans rebrand.
const fontMap: Record<FontFamily, Record<FontWeight, string>> = {
  sans: {
    regular: fonts.parkinsans.regular,
    // Parkinsans ships no 500; 600 is the nearest step up from regular.
    medium: fonts.parkinsans.semiBold,
    semiBold: fonts.parkinsans.semiBold,
    bold: fonts.parkinsans.bold,
    extraBold: fonts.parkinsans.extraBold,
  },
  mono: {
    regular: fonts.jetBrainsMono.regular,
    // No mono style in the app pairs with weight 500, so that file is not shipped.
    medium: fonts.jetBrainsMono.regular,
    semiBold: fonts.jetBrainsMono.semiBold,
    bold: fonts.jetBrainsMono.bold,
    // JetBrains Mono ships no 800; fall back to its heaviest weight.
    extraBold: fonts.jetBrainsMono.bold,
  },
};

function mapWeight(weight?: string | number): FontWeight {
  if (!weight) return 'regular';
  const w = weight.toString().toLowerCase();
  if (w === '500' || w === 'medium') return 'medium';
  if (w === '600' || w === 'semibold' || w === '600semibold' || w === 'semi-bold') return 'semiBold';
  if (w === '800' || w === '900' || w === 'extrabold' || w === '800extrabold') return 'extraBold';
  if (w === '700' || w === 'bold') return 'bold';
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
  let resolvedFontWeight: '400' | '500' | '600' | '700' | '800' | undefined = undefined;

  if (Platform.OS === 'web') {
    // Web: Use the exact loaded local font name as primary, with fallback to standard system/CDN fonts
    const targetFont = fontMap[resolvedFamily][resolvedWeight];
    resolvedFontFamily = resolvedFamily === 'mono'
      ? `${targetFont}, "JetBrains Mono", monospace`
      : `${targetFont}, Parkinsans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    
    if (resolvedWeight === 'regular') resolvedFontWeight = '400';
    else if (resolvedWeight === 'medium') resolvedFontWeight = '500';
    else if (resolvedWeight === 'semiBold') resolvedFontWeight = '600';
    else if (resolvedWeight === 'bold') resolvedFontWeight = '700';
    else if (resolvedWeight === 'extraBold') resolvedFontWeight = '800';
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