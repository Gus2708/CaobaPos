# CaobaPOS Design System

## Overview
Sistema de diseño para CaobaPOS - POS para cafetería/heladería con tema oscuro glassmorphism.

---

## Color Palette

### Background
```
#0A0A0C        — GLOBAL_BG (fondo principal)
```

### Brand - Mahogany (color primario)
```
#B87B5A        — mahogany (principal)
#D4956E        — mahoganyBright (hover/activo)
#8B5A3C        — mahoganyDark (presionado)
rgba(184,123,90,0.15) — mahoganyDim (fondos sutiles)
rgba(184,123,90,0.08) — mahoganyGlow (resplandor)
```

### Status Colors
```
#6DB88A        — sage (éxito, profit, stock OK)
#C96B6B        — coral (error, stock bajo, eliminar)
#E8B560        — amber (advertencia, stock crítico)
#5A82C8        — blue (info, enlaces)
```

### Text
```
#F0F0F2        — text (principal)
#C8C8CC        — textSecondary (secundario)
#8A8A96        — textMuted (deshabilitado, hints)
#666672        — textDim (placeholders)
```

### Borders
```
rgba(255,255,255,0.06)   — border (separadores sutiles)
rgba(255,255,255,0.04)   — borderLight (más sutil)
rgba(184,123,90,0.2)     — borderAccent (bordes mahogany)
rgba(184,123,90,0.35)    — borderAccentBright (borde activo)
```

---

## Typography

### Font Families
```typescript
'instrumentSans'  // Textos, UI, títulos
'JetBrainsMono'  // Números, precios, códigos
```

### Font Sizes (usar tokens)
```
xs: 10    — labels pequeños, badges
sm: 12    — texto secundario, hints
base: 14  — cuerpo de texto
md: 15    — texto principal
lg: 16    — títulos pequeños
xl: 18    — títulos de sección
2xl: 20   — títulos de modal
3xl: 24   — títulos de página
4xl: 28   — números grandes
```

### Font Weights
```
regular: '400'    — texto normal
medium: '500'     — énfasis
semibold: '600'    — labels, botones
bold: '700'        — títulos
extrabold: '800'   — números, valores
```

---

## Spacing

```
xs: 4   — entre elementos muy cercanos
sm: 8   — padding interno de chips
md: 12  — padding de inputs
lg: 16  — padding de cards
xl: 24  — separación entre secciones
xxl: 32 — márgenes de pantalla
```

---

## Border Radius

```
pill: 999   — botones pill, chips
card: 20     — cards principales
chip: 12    — chips, badges
btn: 14     — botones
icon: 10    — iconos en círculos
sm: 8       — elementos pequeños
xs: 6       — elementos muy pequeños
```

---

## Glassmorphism Pattern

Para aplicar glassmorphism en backgrounds de cards/modales:

```tsx
// Background oscuro con transparencia
backgroundColor: 'rgba(30, 30, 36, 0.6)'

// Gradiente sutil de arriba a abajo
<LinearGradient
  colors={['rgba(30, 30, 36, 0.6)', 'rgba(20, 20, 26, 0.3)']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
/>

// Borde sutil
borderWidth: 1
borderColor: 'rgba(255, 255, 255, 0.06)'

// Sombra
shadowColor: '#000'
shadowOffset: { width: 0, height: 6 }
shadowOpacity: 0.25
shadowRadius: 12
elevation: 6
```

---

## Component Patterns

### Card Base
```tsx
<View style={styles.card}>
  <LinearGradient
    colors={['rgba(30, 30, 36, 0.6)', 'rgba(20, 20, 26, 0.3)']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={StyleSheet.absoluteFill}
  />
  <View style={styles.innerBorder} />
  {/* contenido */}
</View>

// Styles
card: {
  backgroundColor: 'rgba(30, 30, 36, 0.6)',
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.06)',
  overflow: 'hidden',
}
innerBorder: {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.04)',
}
```

### Button Primary
```tsx
<TouchableOpacity style={styles.btn} activeOpacity={0.8}>
  <LinearGradient
    colors={['rgba(184, 123, 90, 0.9)', 'rgba(139, 90, 60, 0.85)']}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={StyleSheet.absoluteFill}
  />
  <Text style={styles.btnText}>Texto</Text>
</TouchableOpacity>

// Styles
btn: {
  backgroundColor: '#B87B5A',
  borderRadius: 14,
  paddingVertical: 14,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: 'rgba(184, 123, 90, 0.4)',
}
btnText: {
  fontFamily: 'InstrumentSans',
  fontSize: 16,
  fontWeight: '700',
  color: '#F0F0F2',
}
```

### Button Secondary/Danger
```tsx
// Secondary
backgroundColor: 'rgba(255, 255, 255, 0.03)'
borderColor: 'rgba(255, 255, 255, 0.06)'
color: '#8A8A96'

// Danger
backgroundColor: 'rgba(201, 107, 107, 0.15)'
borderColor: 'rgba(201, 107, 107, 0.3)'
color: '#C96B6B'
```

### Input Field
```tsx
<View style={styles.inputContainer}>
  <TextInput
    style={styles.input}
    placeholderTextColor="#6A6A72"
  />
</View>

// Styles
inputContainer: {
  backgroundColor: 'rgba(20, 20, 26, 0.8)',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(184, 123, 90, 0.3)',
}
input: {
  color: '#F0F0F2',
  fontSize: 16,
  paddingHorizontal: 14,
  paddingVertical: 14,
}
```

### Badge/Tag
```tsx
<View style={styles.badge}>
  <Text style={styles.badgeText}>Texto</Text>
</View>

// Styles
badge: {
  backgroundColor: 'rgba(184, 123, 90, 0.15)',
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'rgba(184, 123, 90, 0.2)',
}
badgeText: {
  fontFamily: 'JetBrainsMono',
  fontSize: 12,
  fontWeight: '600',
  color: '#B87B5A',
}
```

### Modal Overlay
```tsx
<Modal visible={visible} transparent animationType="fade">
  <TouchableOpacity style={styles.overlay} activeOpacity={1}>
    <View style={styles.modal}>
      {/* contenido */}
    </View>
  </TouchableOpacity>
</Modal>

// Styles
overlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
}
modal: {
  backgroundColor: 'rgba(30, 30, 40, 0.98)',
  borderRadius: 20,
  padding: 20,
  width: '100%',
  maxWidth: 360,
  borderWidth: 1,
  borderColor: 'rgba(184, 123, 90, 0.3)',
}
```

---

## Icons

Usar el componente `Icon` de `../components/Icon` con los nombres:
- UI: `close`, `check`, `plus`, `minus`, `trash`, `edit`, `search`
- Navigation: `cart`, `chart-bar`, `archive`, `clock`, `bars`
- Payment: `money-bill`, `credit-card`, `mobile-alt`
- Status: `trending-up`, `exclamation-triangle`, `check-circle`

```tsx
<Icon name="cart" size={20} color="#B87B5A" />
```

---

## Animations

```tsx
// Fast (150ms) — hover effects, toggles
// Normal (250ms) — standard transitions
// Slow (400ms) — page transitions, modals

// Spring para elementos que "rebotan"
spring: { tension: 120, friction: 10 }
springBounce: { tension: 180, friction: 12 }
```

---

## Stock Status Colors

```tsx
// Stock OK (>= 5)
backgroundColor: 'rgba(109, 184, 138, 0.6)'
borderColor: 'rgba(109, 184, 138, 0.5)'
textColor: '#6DB88A'

// Stock Low (< 5)
backgroundColor: 'rgba(232, 181, 96, 0.6)'
borderColor: 'rgba(232, 181, 96, 0.5)'
textColor: '#E8B560'

// Stock Out (<= 0)
backgroundColor: 'rgba(201, 107, 107, 0.6)'
borderColor: 'rgba(201, 107, 107, 0.5)'
textColor: '#C96B6B'
opacity: 0.5
```

---

## Usage in Components

```tsx
import { tokens } from '../lib/designTokens';
import { FontNames } from '../lib/fontNames';
import { Icon } from '../components/Icon';

// Usar tokens para consistencia
style={{
  padding: tokens.spacing.lg,
  borderRadius: tokens.radius.card,
  borderColor: tokens.colors.borderAccent,
  fontFamily: FontNames.instrumentSans,
  fontSize: tokens.typography.base,
}}
```

---

## Anti-Patterns

❌ NO usar colores hardcodeados fuera de la paleta  
❌ NO usar tamaños de fuente arbitrarios  
❌ NO usar espaciados que no sean múltiplos de 4  
❌ NO usar LinearGradient con colores fuera de la paleta  
❌ NO usar sombras de colores que no sean negro o brand  
❌ NO crear componentes sin usar los tokens definidos  
