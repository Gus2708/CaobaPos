# Caoba Obsidian & Lime — Design Spec 2026

Este documento define la estética modernizada para CaobaPOS, inspirada en interfaces minimalistas de alto rendimiento con contrastes vibrantes.

## 🎨 Paleta de Colores

### Bases (Obsidian)
- **Fondo Global (Root)**: `#090909`
- **Superficie de Card**: `rgba(26, 26, 26, 0.4)`
- **Superficie Elevada**: `rgba(32, 32, 32, 0.6)`
- **Borde Sutil**: `rgba(255, 255, 255, 0.05)`

### Acentos (Lime)
- **Lime Principal**: `#A3E635` (Verde Limón Eléctrico)
- **Lime High Contrast**: `#000000` (Texto sobre fondo Lime)
- **Lime Glow**: `rgba(163, 230, 53, 0.15)`

---

## 📐 Geometría y Espaciado

- **Radio de Card (XXL)**: `32px`
- **Radio de Chip/Pill**: `999px`
- **Espaciado Base**: `8px`

---

## ✨ Efectos de Material (Glassmorphism)

Para lograr el aspecto de la imagen:
1. **Desenfoque (Blur)**: Mínimo `20px` en `backdrop-filter`.
2. **Gradientes**:
   - Card: Linear gradient de `rgba(255,255,255, 0.03)` a `transparent` (45 grados).
   - Glow: Inset shadow de `1px` blanco con `0.05` de opacidad.

---

## 🍱 Componentes Clave

### 1. Badges de Estado
- **Forma**: Pill (999px).
- **Estilo**: Fondo sólido `#A3E635` con texto negro negrita.
- **Uso**: Fechas, totales críticos, estados "Live".

### 2. Contenedores
- **Fondo**: Translúcido oscuro sobre fondo negro puro.
- **Borde**: `0.5px` a `1px` máximo.

---

## 🚫 Directrices
- Evitar sombras paralelas pesadas.
- Priorizar el contraste de color Lima para la jerarquía visual.
- Mantener tipografía blanca/off-white para el cuerpo del texto.
