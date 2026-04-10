// CaobaPOS Design Tokens — 2026 System
// All spacing, colors, radii and typography scales derived from here.

export const GLOBAL_BG = '#0A0A0C';

export const tokens = {
  radius: {
    pill: 999,
    card: 20,
    chip: 12,
    btn: 14,
    icon: 10,
    sm: 8,
    xs: 6,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
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
  },
  typography: {
    // Sizes
    xs: 10,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
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
