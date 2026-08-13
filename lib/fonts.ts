import { TextStyle } from 'react-native';
import { fonts } from '../hooks/useFonts';

export const brandFonts = {
  regular: fonts.parkinsans.regular,
  medium: fonts.parkinsans.semiBold,
  semiBold: fonts.parkinsans.semiBold,
  bold: fonts.parkinsans.bold,
  extraBold: fonts.parkinsans.extraBold,
};

export const appFonts = {
  regular: fonts.parkinsans.regular,
  medium: fonts.parkinsans.semiBold,
  semiBold: fonts.parkinsans.semiBold,
  bold: fonts.parkinsans.bold,
  extraBold: fonts.parkinsans.extraBold,
};

export const monoFonts = {
  regular: fonts.jetBrainsMono.regular,
  medium: fonts.jetBrainsMono.medium,
  semiBold: fonts.jetBrainsMono.semiBold,
  bold: fonts.jetBrainsMono.bold,
};

export type FontFamily = 'sans' | 'mono' | 'brand';

export function getFont(family: FontFamily, weight: 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold' = 'regular'): any {
  if (family === 'mono') {
    return monoFonts[weight === 'extraBold' ? 'bold' : weight];
  }
  return brandFonts[weight] || brandFonts.regular;
}

export function textStyle(fontFamily: FontFamily, weight: 'regular' | 'medium' | 'semiBold' | 'bold' | 'extraBold' = 'regular', extra?: TextStyle): TextStyle {
  return {
    fontFamily: getFont(fontFamily, weight),
    ...extra,
  };
}