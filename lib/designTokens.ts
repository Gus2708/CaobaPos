// CaobaPOS Design Tokens — Standard 2026
// All spacing, colors, radii and typography scales derived from here.
import { scale, moderateScale } from './responsive';

export const GLOBAL_BG = '#0A0A0C';

export const tokens = {
  radius: {
    pill: 999,
    xl: scale(24),      // Contenedores grandes / Stats
    modal: scale(24),   // Modales premium
    lg: scale(20),      // Cards estándar
    card: scale(20),    // Alias para cards estándar
    btn: scale(14),     // Botones principales
    chip: scale(12),    // Categorías y badges
    md: scale(12),      // Alias para inputs y botones secundarios
    icon: scale(10),
    sm: scale(8),       // Micro-etiquetas
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
    // Backgrounds — layered depth system
    bg: GLOBAL_BG,                    // Deepest layer
    surface: '#141417',               // Card surface (1st elevation)
    surfaceElevated: '#1C1C1F',       // Modal / elevated card (2nd elevation)
    surfaceHover: '#222228',          // Hover / pressed states
    surfaceWarm: '#1A1814',           // Warm-tinted surface for placeholders

    // Borders — minimal, functional
    border: 'rgba(255, 255, 255, 0.06)',
    borderLight: 'rgba(255, 255, 255, 0.04)',
    borderMedium: 'rgba(255, 255, 255, 0.10)',
    borderAccent: 'rgba(184, 123, 90, 0.18)',
    borderAccentBright: 'rgba(184, 123, 90, 0.30)',

    // Brand — Mahogany
    mahogany: '#B87B5A',
    mahoganyBright: '#D4956E',
    mahoganyDark: '#8B5A3C',
    mahoganyDim: 'rgba(184, 123, 90, 0.12)',
    mahoganyGlow: 'rgba(184, 123, 90, 0.06)',

    // Status — Sage (success)
    sage: '#6DB88A',
    sageDim: 'rgba(109, 184, 138, 0.12)',
    sageGlow: 'rgba(109, 184, 138, 0.06)',



    // Status — Coral (error/warning/low stock)
    coral: '#C96B6B',
    coralDim: 'rgba(201, 107, 107, 0.12)',
    coralGlow: 'rgba(201, 107, 107, 0.06)',

    // Status — Amber (critical warning)
    amber: '#E8B560',
    amberDim: 'rgba(232, 181, 96, 0.12)',
    amberGold: '#CA8A04', // Premium gold accent for restaurant look

    // Text — cleaner hierarchy
    text: '#F0F0F2',
    textSecondary: '#B0B0B8',
    textMuted: '#7A7A86',
    textDim: '#55555E',

    // Glass/Transparency Effects — simplified
    glass: {
      bg: 'rgba(5, 5, 6, 0.96)',         // Solid dark base
      medium: 'rgba(8, 8, 10, 0.92)',
      heavy: 'rgba(12, 12, 14, 0.95)',
      
      // Liquid Glass specifics — focus on depth
      liquid: 'rgba(255, 255, 255, 0.03)', 
      liquidHighlight: 'rgba(255, 255, 255, 0.08)', // For top edges
      liquidShadow: 'rgba(0, 0, 0, 0.4)',           // For bottom edges
      
      border: 'rgba(255, 255, 255, 0.05)',
      borderStrong: 'rgba(255, 255, 255, 0.08)',
      borderLight: 'rgba(255, 255, 255, 0.02)',
      accent: 'rgba(184, 123, 90, 0.08)',
      light: 'rgba(255, 255, 255, 0.02)',
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
  layout: {
    gutter: scale(20),    // Standard horizontal padding
    cardGap: scale(12),   // Gap between cards
  },
  styles: {
    liquidCard: {
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      borderWidth: 1,
      borderRadius: scale(24), // Premium XL radius
      // Reflections
      reflectionColors: ['rgba(255, 255, 255, 0.05)', 'transparent'] as const,
    }
  },
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
    spring: { tension: 120, friction: 10 },
    springBounce: { tension: 180, friction: 12 },
    pressIn: { tension: 300, friction: 20 },
    pressOut: { tension: 240, friction: 14 },
    modalSpring: { tension: 140, friction: 12 },
    bump: { tension: 320, friction: 10 },
  },
} as const;
