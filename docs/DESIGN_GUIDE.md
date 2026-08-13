# CaobaPOS Design System — Standard 2026

## Overview
Sistema de diseño para CaobaPOS, derivado del manual de marca Caoba. Superficies oscuras cálidas, acento en Caoba Gold y tipografía Parkinsans, optimizado para alto rendimiento (60 FPS) y jerarquía visual clara.

---

## 🎨 Color Palette

Los tres colores del manual de marca son la base de todo el sistema:

| Color | Hex | Uso |
|---|---|---|
| Deep Espresso | `#140906` | Fondo base de la app |
| Caoba Gold | `#CD9B46` | Acción principal, acentos, marca |
| Cream | `#EEDDC0` | Texto secundario, contraste cálido |

### Surface & Depth
Capas de profundidad para organizar la información:
```typescript
GLOBAL_BG: '#140906'       // Nivel 0: Fondo base
surface: '#1C110C'         // Nivel 1: Contenedores secundarios, cards
surfaceElevated: '#261812' // Nivel 2: Modales, inputs activos
surfaceHover: '#332119'    // Estados hover / pressed
```

### Brand — Caoba Gold
```typescript
gold: '#CD9B46'            // Acción principal, acentos
goldDim: 'rgba(205, 155, 70, 0.15)'  // Fondos de botones/badges
borderAccent: 'rgba(205, 155, 70, 0.25)' // Bordes de marca
onGold: '#140906'          // Único color de texto válido sobre dorado sólido
```

> ⚠️ Crema sobre dorado da **1.88:1**. Nunca usarlo para texto — sobre una superficie dorada el texto va en `onGold`.

### Texto
Rampa cálida, todos los pasos superan WCAG AA (4.5:1) sobre `bg` y sobre `surfaceElevated`:

| Token | Hex | Contraste sobre `bg` |
|---|---|---|
| `text` | `#F5EFE8` | 17.2:1 |
| `textSecondary` | `#EEDDC0` | 14.7:1 |
| `textMuted` | `#B3A294` | 7.9:1 |
| `textDim` | `#98866F` | 5.6:1 |

### Status & Feedback
- **Sage (`#6DB88A`)**: Éxito, stock suficiente, ganancias.
- **Coral (`#C96B6B`)**: Error, eliminación, stock agotado.
- **Amber (`#CD9B46`)**: Advertencia, stock bajo.

---

## 🔤 Tipografía

**Parkinsans** es la tipografía oficial de marca y se usa en todo el texto de la app. **JetBrains Mono** queda reservado para números y códigos.

Pesos disponibles: `regular` (400), `medium`/`semiBold` (600), `bold` (700), `extraBold` (800). Parkinsans no tiene 500, por eso `medium` resuelve a 600.

El mapa de fuentes de `components/Text.tsx` es la **única fuente de verdad** de lo que se renderiza: toma las claves del loader en `hooks/useFonts.tsx` y descarta cualquier `fontFamily` que le llegue por estilo. Cambiar tokens de fuente en otro lado no tiene ningún efecto.

---

## 🌺 Marcas de marca

Los motivos del manual (espiral, flor 1, flor 2, isotipo, logotipo) se renderizan **siempre** con `components/BrandMark.tsx`:

```tsx
<BrandMark motif="flor2" style={styles.watermark} />
```

Son SVG en `data:` URI, y el `Image` de `react-native` **no puede decodificar SVG en iOS ni Android** — no falla, simplemente no dibuja nada. `BrandMark` los pasa por `expo-image`, que sí los soporta en las tres plataformas.

Sin `accessibilityLabel` la marca se trata como decorativa: se oculta de lectores de pantalla y no intercepta toques.

---

## 📐 Layout & Spacing

### Grid
- **Base Unit**: 4px. Todos los márgenes y paddings deben ser múltiplos de 4.
- **Tokens**: `xs (4)`, `sm (8)`, `md (12)`, `lg (16)`, `xl (24)`.

### Border Radius
- **Card**: `20px` (Radio principal para contenedores).
- **Chip/Badge**: `12px` (Usado en etiquetas y categorías).
- **Button**: `14px`.
- **Pill**: `999px` (Para elementos circulares o de búsqueda).

---

## ✨ Superficies

Bordes de 1px con baja opacidad y gradientes lineales, todo teñido hacia el dorado de marca — nunca blanco puro, que rompe la familia cálida de la paleta:

```tsx
// Estándar de Card Premium
<View style={styles.card}>
  <LinearGradient
    colors={['rgba(238, 221, 192, 0.06)', 'transparent']}
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
- **Gold**: Categorías, métodos de pago.
- **Sage/Coral**: Estados de stock y éxito/error.

### 2. SkeletonItem (`components/SkeletonItem.tsx`)
**NUNCA** mostrar una pantalla vacía o un spinner central si se conoce la estructura de los datos. Use skeletons que imiten la forma final de los cards.

### 3. Icon (`components/Icon.tsx`)
- UI: `search`, `plus`, `trash`, `edit`, `barcode`.
- Navigation: `cart`, `archive`, `chart-bar`.
- Brand: Usar `tokens.colors.gold` o tokens de texto muted.

---

## 🚫 Anti-Patterns
- ❌ No usar colores fuera de `designTokens.ts`.
- ❌ No usar `FlatList` nativo para listas largas.
- ❌ No usar sombras pesadas (preferir bordes sutiles y gradientes).
- ❌ No usar `Text` nativo (usar `components/Text.tsx`, que aplica Parkinsans).
- ❌ No renderizar los SVG de marca con el `Image` de `react-native` (usar `components/BrandMark.tsx`).
- ❌ No usar crema ni ningún tono claro para texto sobre superficies doradas (usar `tokens.colors.onGold`).
