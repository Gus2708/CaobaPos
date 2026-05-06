---
name: rn-liquid-glass-architect
description: Especialista en implementar efectos avanzados de Liquid Glass y Glassmorphism en React Native y Expo. Úsalo cuando el usuario pida crear interfaces translúcidas, difuminados (blur), refracciones de luz, aberración cromática o componentes de cristal dinámicos.
version: 1.1.0
tags: [react-native, expo, ui, glassmorphism, liquid-glass, skia, reanimated, blur]
---

### React Native Liquid Glass Architect Skill

#### Objetivo
Diseñar e implementar componentes con efectos visuales de "cristal líquido" (Liquid Glass) o cristal esmerilado (Glassmorphism) en React Native, garantizando 60-120 FPS mediante aceleración por GPU, y asegurando que las interfaces cumplan con los requisitos de contraste y accesibilidad.

#### 1. Árbol de Decisión de Librerías (Obligatorio)
Antes de escribir código, analiza la petición del usuario y el entorno, y elige la librería correcta:

*   **Para Blur y Liquid Glass (Recomendado):** Usa `@sbaiahmed1/react-native-blur`. Es la solución más completa con 6 componentes especializados:
    *   `BlurView`: Blur nativo estándar. **Recomendado para uso general multiplataforma** (más estable en Android).
    *   `LiquidGlassView`: Efectos de cristal líquido para iOS 26+. *Nota: Puede mostrar advertencias en Android; usa BlurView si buscas paridad total sin logs.*
    *   `LiquidGlassContainer`: Agrupación de elementos de cristal con espaciado configurable (iOS 26+).
    *   `ProgressiveBlurView`: Blur variable/gradiente (iOS y Android).
    *   `VibrancyView`: Efectos de vibrancia (solo iOS).
    *   `BlurSwitch`: Botón switch con blur (Android nativo).
*   **Para máxima fidelidad multiplataforma (Refracción, AGSL/Metal):** Usa `@uginy/react-native-liquid-glass` si se requiere refracción real en Android 33+ e iOS 15+.
*   **Para personalización extrema:** Usa `react-native-skia` + `react-native-reanimated` para shaders personalizados y SDFs.

#### 2. Reglas de Diseño UI/UX y Accesibilidad
*   **Uso Moderado:** No apliques efectos a fondos completos. Úsalo en modales, tarjetas o botones.
*   **Contraste:** Asegura legibilidad sobre el cristal. Usa bordes sutiles (strokes) para dar ilusión de profundidad.
*   **Fallbacks:** Configura siempre `reducedTransparencyFallbackColor` para usuarios con accesibilidad activada o dispositivos no compatibles.
*   **Plataformas:** 
    *   iOS 26+ es necesario para `UIGlassEffect` real.
    *   Android requiere AGP 8.9.1+ y usa hardware acceleration (`QmBlurView`).

#### 3. Guía de Implementación (@sbaiahmed1/react-native-blur)

**Blur Estándar:**
```tsx
import { BlurView } from '@sbaiahmed1/react-native-blur';

<BlurView 
  blurType="systemMaterial" 
  blurAmount={20} 
  style={styles.absolute}
>
  <Text>Contenido</Text>
</BlurView>
```

**Liquid Glass (iOS 26+):**
```tsx
import { LiquidGlassView, LiquidGlassContainer } from '@sbaiahmed1/react-native-blur';

<LiquidGlassContainer spacing={20}>
  <LiquidGlassView glassType="regular" glassTintColor="#007AFF" glassOpacity={0.8}>
    <Text>Glass Element</Text>
  </LiquidGlassView>
</LiquidGlassContainer>
```

**Progressive Blur (Gradiente):**
```tsx
<ProgressiveBlurView
  blurType="light"
  direction="blurredTopClearBottom"
  blurAmount={30}
  style={{ height: 200 }}
/>
```

#### 4. Optimización de Rendimiento
*   **Overdraw:** No superpongas más de 2 capas de blur.
*   **Android:** La librería usa `RenderEffectBlur` en Android 12+ y `RenderScriptBlur` en 10-11 automáticamente.
*   **Interactividad:** En iOS 26+, `LiquidGlassView` soporta `isInteractive={true}` para reaccionar al tacto.

