# CaobaPOS Design System — Standard 2026

## Overview
Sistema de diseño premium para CaobaPOS. Basado en una estética **Premium Dark Glassmorphism**, optimizado para alto rendimiento (60 FPS) y una jerarquía visual clara usando la paleta **Mahogany & Sage**.

---

## 🎨 Color Palette

### Surface & Depth
Nuestro sistema usa capas de profundidad para organizar la información:
```typescript
GLOBAL_BG: '#0A0A0C'       // Nivel 0: Fondo base
surface: '#141416'         // Nivel 1: Contenedores secundarios, cards
surfaceElevated: '#1C1C1E' // Nivel 2: Modales, inputs activos
glass.light: 'rgba(255, 255, 255, 0.03)' // Efecto traslúcido sutil
```

### Brand — Mahogany
```typescript
mahogany: '#B87B5A'        // Acción principal, acentos
mahoganyDim: 'rgba(184, 123, 90, 0.12)' // Fondos de botones/badges
borderAccent: 'rgba(184, 123, 90, 0.18)' // Bordes de marca
```

### Status & Feedback
- **Sage (`#6DB88A`)**: Éxito, stock suficiente, ganancias.
- **Coral (`#C96B6B`)**: Error, eliminación, stock agotado.
- **Amber (`#E8B560`)**: Advertencia, stock bajo.

---

## 📐 Layout & Spacing

### Grid
- **Base Unit**: 4px. Todos los márgenes y paddings deben ser múltiplos de 4.
- **Tokens**: `xs (4)`, `sm (8)`, `md (12)`, `lg (16)`, `xl (24)`.

### Border Radius
- **Card**: `16px` (Radio principal para contenedores).
- **Chip/Badge**: `12px` (Usado en etiquetas y categorías).
- **Button**: `14px`.
- **Pill**: `999px` (Para elementos circulares o de búsqueda).

---

## ✨ Glassmorphism Pattern

Para lograr el aspecto premium, se deben usar bordes de 1px con baja opacidad y gradientes lineales:

```tsx
// Estándar de Card Premium
<View style={styles.card}>
  <LinearGradient
    colors={['rgba(255, 255, 255, 0.05)', 'transparent']}
    style={StyleSheet.absoluteFill}
  />
  <View style={{ borderBottomWidth: 1, borderColor: tokens.colors.border }} />
</View>
```

---

## 🚀 Performance Standards (Crucial)

### FlashList vs FlatList
**MANDATORIO**: Usar `@shopify/flash-list` para todas las listas de productos o transacciones. 
- Siempre definir un `estimatedItemSize` preciso.
- Usar `memo()` en los componentes de renderizado de items.

### Paginación (Infinite Scroll)
La carga de datos debe ser **progresiva**. 
- Usar `useInfiniteQuery` de TanStack Query.
- Implementar paginación basada en `.range()` de Supabase (ej. 20-25 registros por página).

---

## 🍱 Core Components

### 1. Badge (`components/Badge.tsx`)
Todas las etiquetas ("spans"), estados y micro-información deben usar este componente.
- **Neutral**: Información secundaria, IDs.
- **Mahogany**: Categorías, métodos de pago.
- **Sage/Coral**: Estados de stock y éxito/error.

### 2. SkeletonItem (`components/SkeletonItem.tsx`)
**NUNCA** mostrar una pantalla vacía o un spinner central si se conoce la estructura de los datos. Use skeletons que imiten la forma final de los cards.

### 3. Icon (`components/Icon.tsx`)
- UI: `search`, `plus`, `trash`, `edit`, `barcode`.
- Navigation: `cart`, `archive`, `chart-bar`.
- Brand: Usar colores mahogany o tokens de texto muted.

---

## 🚫 Anti-Patterns
- ❌ No usar colores fuera de `designTokens.ts`.
- ❌ No usar `FlatList` nativo para listas largas.
- ❌ No usar sombras pesadas (preferir bordes sutiles y gradientes).
- ❌ No usar `Text` nativo (usar `components/Text.tsx` que respeta la tipografía `Instrument Sans`).
