// CaobaPOS Design Tokens — 2026 System
// All spacing, colors, radii and typography scales derived from here.
import { scale, moderateScale } from './responsive';

export const GLOBAL_BG = '#0A0A0C';

export const tokens = {
  radius: {
    pill: 999,
    card: scale(20),
    chip: scale(12),
    btn: scale(14),
    icon: scale(10),
    sm: scale(8),
    xs: scale(6),
  },
  spacing: {
    xs: scale(4),
    sm: scale(8),
    md: scale(12),
    lg: scale(16),
    xl: scale(24),
    xxl: scale(32),
  },
  colors: {
    // Backgrounds
    bg: GLOBAL_BG,
    bgWarm: GLOBAL_BG,
    surface: GLOBAL_BG,
    surfaceElevated: GLOBAL_BG,
    surfaceWarm: GLOBAL_BG,

    // Borders
    border: 'rgba(255,255,255,0.06)',
    borderLight: 'rgba(255,255,255,0.04)',
    borderAccent: 'rgba(184,123,90,0.2)',
    borderAccentBright: 'rgba(184,123,90,0.35)',

    // Brand — Mahogany
    mahogany: '#B87B5A',
    mahoganyBright: '#D4956E',
    mahoganyDark: '#8B5A3C',
    mahoganyDim: 'rgba(184,123,90,0.15)',
    mahoganyGlow: 'rgba(184,123,90,0.08)',

    // Status — Sage (success)
    sage: '#6DB88A',
    sageDim: 'rgba(109,184,138,0.15)',
    sageGlow: 'rgba(109,184,138,0.08)',

    // Status — Coral (error/warning)
    coral: '#C96B6B',
    coralDim: 'rgba(201,107,107,0.15)',
    coralGlow: 'rgba(201,107,107,0.08)',

    // Status — Amber (warning)
    amber: '#E8B560',
    amberDim: 'rgba(232,181,96,0.15)',

    // Text
    text: '#F0F0F2',
    textSecondary: '#C8C8CC',
    textMuted: '#8A8A96',
    textDim: '#666672',

    // Glass/Transparency Effects
    glass: {
      bg: 'rgba(10, 10, 12, 0.65)',
      border: 'rgba(255, 255, 255, 0.08)',
      accent: 'rgba(184, 123, 90, 0.15)',
      heavy: 'rgba(10, 10, 12, 0.85)',
      light: 'rgba(255, 255, 255, 0.04)',
    }
  },
  typography: {
    // Sizes
    xs: moderateScale(10),
    sm: moderateScale(12),
    base: moderateScale(14),
    md: moderateScale(15),
    lg: moderateScale(16),
    xl: moderateScale(18),
    '2xl': moderateScale(20),
    '3xl': moderateScale(24),
    '4xl': moderateScale(28),
    // Weights (as string for RN)
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
    spring: { tension: 120, friction: 10 },
    springBounce: { tension: 180, friction: 12 },
  },
} as const;
