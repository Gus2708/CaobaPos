---
name: expo-ui-assets-manager
description: Experto en configurar, actualizar y solucionar problemas de App Icons y Splash Screens en proyectos de React Native administrados con Expo. Úsalo cuando el usuario pida cambiar el ícono de la app, el splash screen, o reporte que las imágenes no se actualizan en el simulador o dispositivo.
version: 1.0.0
tags: [react-native, expo, ui, assets, icons, splash-screen, debugging]
---

### Expo UI Assets Manager Skill

#### Objetivo
Configurar y actualizar correctamente los App Icons y Splash Screens para iOS y Android en una aplicación de React Native Expo, garantizando que los cambios se reflejen en los builds y manejando rigurosamente la limpieza de caché para prevenir regresiones visuales.

#### Instrucciones Paso a Paso
1. **Validación de Archivos (Imágenes):**
   - Asegúrate de que el usuario haya proporcionado imágenes de 1024x1024 píxeles en formato `.png` [10, 11].
   - Ubica las imágenes en el directorio correcto, preferiblemente en `./assets/` o `./assets/images/` [10].
   - El ícono adaptativo de Android no debe tener fondo en el diseño (el fondo se define por código) [12].

2. **Configuración en el Manifiesto:**
   - Verifica si el proyecto utiliza `app.json` o `app.config.ts/js`. Si existe `app.config.ts`, este sobrescribe a `app.json`, por lo que las modificaciones deben ir allí [9].
   - **Ícono Principal:** Configura la ruta bajo `expo.icon` [10].
   - **Splash Screen:** Configura `expo.splash.image`, `expo.splash.resizeMode` (ej. "contain" o "cover"), y `expo.splash.backgroundColor` [10, 13].
   - **Android:** Configura `expo.android.adaptiveIcon.foregroundImage` y `expo.android.adaptiveIcon.backgroundColor` [14, 15].
   - **iOS:** Configura `expo.ios.icon` y las rutas si usa variantes específicas (dark, light, tinted) [14].

3. **Ejecución y Aplicación de Cambios:**
   - **Limpieza de Caché:** Antes de iniciar la app, ejecuta `npx expo start -c` (para limpiar el caché de Metro Bundler) [16].
   - **Reconstrucción Nativa:** Ejecuta obligatoriamente el comando `npx expo prebuild --clean` si hubo cambios en los íconos o el splash screen. Esto es crucial porque regenera los directorios nativos (`/android` y `/ios`) e inyecta los nuevos assets [15-17].

#### Restricciones Críticas y Prevención de Errores
* **Límite de Expo Go:** ADVIERTE SIEMPRE al usuario que Expo Go tiene su propio Splash Screen que puede interferir con la visualización. Los resultados finales del Splash Screen *solo* deben probarse compilando la aplicación en standalone (vía `eas build` o usando `npx expo run:android` / `npx expo run:ios`) [11].
* **No confíes en el Hot Reloading para íconos:** Los cambios en `app.json` relacionados a íconos jamás se reflejan en tiempo real; el comando `prebuild --clean` es un requerimiento ineludible [15].
* **Resolución de superposición de círculos en Android:** Si el ícono no se muestra en Android, asume que excede los límites del "círculo" adaptativo y reajusta la configuración o avisa al usuario de reducir el logo [16, 18].
* **Prioridad de limpieza:** En caso de que el desarrollador use WSL2/Windows, aconséjale vaciar la caché de la app "Expo Go" directamente desde las configuraciones del teléfono y borrar las carpetas antiguas de `mipmap` en Android si el error persiste [19, 20].