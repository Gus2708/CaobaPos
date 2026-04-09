import { TextStyle } from 'react-native';
import { fonts } from '../hooks/useFonts';

export const appFonts = {
  regular: fonts.instrumentSans.regular,
  medium: fonts.instrumentSans.medium,
  semiBold: fonts.instrumentSans.semiBold,
  bold: fonts.instrumentSans.bold,
};

export const monoFonts = {
  regular: fonts.jetBrainsMono.regular,
  medium: fonts.jetBrainsMono.medium,
  semiBold: fonts.jetBrainsMono.semiBold,
  bold: fonts.jetBrainsMono.bold,
};

export type FontFamily = 'sans' | 'mono';

export function getFont(family: FontFamily, weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular'): any {
  if (family === 'mono') {
    return monoFonts[weight];
  }
  return appFonts[weight];
}

export function textStyle(fontFamily: FontFamily, weight: 'regular' | 'medium' | 'semiBold' | 'bold' = 'regular', extra?: TextStyle): TextStyle {
  return {
    fontFamily: getFont(fontFamily, weight),
    ...extra,
  };
}