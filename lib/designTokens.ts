// CaobaPOS Design Tokens — Standard 2026
// All spacing, colors, radii and typography scales derived from here.
import { scale, moderateScale } from './responsive';

export const GLOBAL_BG = '#140906';

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
    // Backgrounds — layered depth system (Brand Manual 2026)
    bg: GLOBAL_BG,                    // Deep Obsidian Espresso (#140906)
    surface: '#1C110C',               // Card surface (1st elevation)
    surfaceElevated: '#261812',       // Modal / elevated card (2nd elevation)
    surfaceHover: '#332119',          // Hover / pressed states
    surfaceWarm: '#2B1D16',           // Warm-tinted surface for placeholders

    // Borders — minimal, functional
    border: 'rgba(205, 155, 70, 0.12)',
    borderLight: 'rgba(205, 155, 70, 0.08)',
    borderMedium: 'rgba(205, 155, 70, 0.18)',
    borderAccent: 'rgba(205, 155, 70, 0.25)',
    borderAccentBright: 'rgba(205, 155, 70, 0.45)',

    // Brand — Caoba Gold (#CD9B46)
    // Note: `mahogany*` are legacy names kept for compatibility; prefer the `gold*` aliases below.
    mahogany: '#CD9B46',
    mahoganyBright: '#E5B865',
    mahoganyDark: '#9E722C',
    mahoganyDim: 'rgba(205, 155, 70, 0.15)',
    mahoganyGlow: 'rgba(205, 155, 70, 0.08)',

    // Brand — preferred semantic names
    gold: '#CD9B46',
    goldBright: '#E5B865',
    goldDark: '#9E722C',
    goldDim: 'rgba(205, 155, 70, 0.15)',
    goldGlow: 'rgba(205, 155, 70, 0.08)',

    // Text on top of a solid gold surface. Cream on gold is only 1.88:1 — never use it for text.
    onGold: '#140906',

    // Brand Neutral Cream (#EEDDC0)
    cream: '#EEDDC0',
    sand: '#EEDDC0',

    // Status — Sage (success)
    sage: '#6DB88A',
    sageDim: 'rgba(109, 184, 138, 0.12)',
    sageGlow: 'rgba(109, 184, 138, 0.06)',

    // Status — Coral (error/warning/low stock)
    coral: '#C96B6B',
    coralDim: 'rgba(201, 107, 107, 0.12)',
    coralGlow: 'rgba(201, 107, 107, 0.06)',

    // Status — Amber (critical warning / Caoba Gold)
    amber: '#CD9B46',
    amberDim: 'rgba(205, 155, 70, 0.15)',
    amberGold: '#CD9B46', // Premium Caoba Gold

    // Text — warm ramp tinted toward the brand hue.
    // Contrast against bg (#140906): 17.2 / 14.7 / 7.9 / 5.6 — every step clears WCAG AA (4.5:1),
    // including on surfaceElevated. Steps are ~1.4x apart so the hierarchy stays readable.
    text: '#F5EFE8',
    textSecondary: '#EEDDC0', // Warm cream contrast from brand manual
    textMuted: '#B3A294',
    textDim: '#98866F',

    // Glass/Transparency Effects — simplified
    glass: {
      bg: 'rgba(20, 9, 6, 0.96)',         // Solid dark base
      medium: 'rgba(28, 17, 12, 0.92)',
      heavy: 'rgba(38, 24, 18, 0.95)',
      
      // Liquid Glass specifics — focus on depth
      liquid: 'rgba(205, 155, 70, 0.04)', 
      liquidHighlight: 'rgba(205, 155, 70, 0.12)', // For top edges
      liquidShadow: 'rgba(0, 0, 0, 0.5)',           // For bottom edges
      
      border: 'rgba(205, 155, 70, 0.12)',
      borderStrong: 'rgba(205, 155, 70, 0.25)',
      borderLight: 'rgba(205, 155, 70, 0.06)',
      accent: 'rgba(205, 155, 70, 0.15)',
      light: 'rgba(205, 155, 70, 0.04)',
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
      // Tinted toward Caoba Gold so surfaces stay in the same warm family as the rest of the palette.
      backgroundColor: 'rgba(205, 155, 70, 0.03)',
      borderColor: 'rgba(205, 155, 70, 0.10)',
      borderWidth: 1,
      borderRadius: scale(24), // Premium XL radius
      // Reflections
      reflectionColors: ['rgba(238, 221, 192, 0.06)', 'transparent'] as const,
    }
  },
  animation: {
    // Exact Emil Kowalski durations (all UI animations under 300ms)
    press: 120,
    fast: 150,
    normal: 200,
    sheet: 300,
    slow: 400,

    // Physical scale standards
    pressScale: 0.97,
    enterInitialScale: 0.95,

    // Bezier curve definition strings
    curves: {
      easeOut: 'cubic-bezier(0.23, 1, 0.32, 1)',      // Strong ease-out for UI interactions
      easeInOut: 'cubic-bezier(0.77, 0, 0.175, 1)',   // On-screen movement / tabs
      drawer: 'cubic-bezier(0.32, 0.72, 0, 1)',       // iOS sheet / drawer curve
    },

    // Apple designer-friendly spring parameters { duration, dampingRatio }
    springs: {
      default: { duration: 300, dampingRatio: 1 },        // Critically damped default, no overshoot
      momentum: { duration: 300, dampingRatio: 0.8 },      // Subtle bounce for momentum flicks
      sheet: { duration: 300, dampingRatio: 0.8 },         // Bottom sheet settle
      press: { duration: 120, dampingRatio: 1 },           // Instant press feedback
      badgePop: { duration: 250, dampingRatio: 0.7 },      // Micro-bounce for badge updates
    },

    // Legacy compatibility aliases
    spring: { tension: 120, friction: 10 },
    springBounce: { tension: 180, friction: 12 },
    pressIn: { tension: 300, friction: 20 },
    pressOut: { tension: 240, friction: 14 },
    modalSpring: { tension: 140, friction: 12 },
    bump: { tension: 320, friction: 10 },
  },
} as const;

// Standalone worklet/reanimated helper constants
export const MOTION = {
  EASE_OUT_BEZIER: [0.23, 1, 0.32, 1] as const,
  EASE_IN_OUT_BEZIER: [0.77, 0, 0.175, 1] as const,
  EASE_DRAWER_BEZIER: [0.32, 0.72, 0, 1] as const,
} as const;

