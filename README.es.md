<div align="center">

  <img src="https://github.com/user-attachments/assets/3f9e2a55-e9e6-4858-a101-8b42575fe68e" alt="Caoba POS Icon" width="96" height="96" style="border-radius: 20%;" />

  # Caoba POS

  <p align="center">
    [English](README.md) · [Español](README.es.md)
  </p>

  <p align="center">
    <strong>Sistema punto de venta (POS) y analítica en tiempo real optimizado para tablets y web.</strong><br>
    Diseñado con interfaz Glassmorphic Dark, renderizado a 60 FPS y sincronización reactiva con Supabase.
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Expo-SDK_54-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo SDK 54" />
    <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
    <img src="https://img.shields.io/badge/Supabase-Database-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Zustand-State_Manager-black?style=for-the-badge" alt="Zustand" />
    <img src="https://img.shields.io/badge/Sentry-Monitoring-362D59?style=for-the-badge&logo=sentry&logoColor=white" alt="Sentry" />
  </p>

  <br />

  <img src="https://github.com/user-attachments/assets/7ec0c305-bb6f-4235-b339-82491628c99c" alt="Caoba POS Tablet Interface" width="850" style="border-radius: 10px;" />

  <p align="center">
    <em>Arquitectura tablet-first optimizada para orientación horizontal (landscape) con soporte responsivo para móviles.</em>
  </p>

</div>

---


## 📱 Módulos de la Aplicación

La aplicación está estructurada en cinco paneles principales:

1. **Punto de Venta (POS) (`app/index.tsx`):** La pantalla principal para transacciones. Incluye una grilla del 60% de ancho para categorías y productos, y un panel de pago del 40% de ancho con resumen del carrito, escáner de código de barras y métodos de pago.
2. **Dashboard (`app/DashboardPanel.tsx`):** Analítica de negocio en tiempo real que incluye ventas brutas, utilidades, distribución por método de pago, conteo de transacciones y gráficos de popularidad de productos.
3. **Gestión de Inventario (`app/InventoryPanel.tsx`):** Agregar, actualizar y cambiar el estado activo de productos. Definir límites de stock, precios, códigos de barras y subir imágenes.
4. **Historial de Ventas (`app/HistoryPanel.tsx`):** Filtrar y buscar ventas completadas por método de pago o rango de fechas. Permite inspeccionar detalles de venta, generar recibos en PDF y cancelar transacciones (con restitución automática de inventario).
5. **Gestión de Clientes (`app/ClientsPanel.tsx`):** Seguimiento de clientes regulares, gestión de saldos pendientes/créditos, registro de pagos parciales e inspección de estados de cuenta individuales.

---

## 🛠️ Arquitectura y Tecnologías

### Punto de Entrada y Navegación
La app utiliza un patrón de **Conmutación Manual de Pantallas/Pestañas** gestionado por `app/MainApp.tsx` en lugar de enrutamiento basado en archivos, lo que garantiza alto rendimiento y compartición inmediata de estado entre pestañas.

* **Punto de entrada:** `index.ts` → `App.tsx` → `app/MainApp.tsx`

### Gestión de Estado
* **Zustand (`store/`):**
  * `useCartStore`: Gestiona ítems del carrito, estados de escaneo, descuentos e ítems personalizados.
  * `useUIStore`: Animaciones compartidas para ocultar el encabezado al hacer scroll.
  * `useSettingsStore`: Configuraciones locales de la aplicación (ej. porcentaje de IVA) persistidas en la memoria del dispositivo mediante `@react-native-async-storage/async-storage`.
* **TanStack Query (`hooks/`):** Maneja toda la sincronización asíncrona de datos con Supabase, almacenamiento en caché de consultas, actualizaciones optimistas de la interfaz e invalidación de caché.
* **Tiempo Real (`hooks/useRealtimeSync.ts`):** Escucha cambios de replicación en PostgreSQL desde Supabase para actualizaciones instantáneas de menú y stock en todos los dispositivos.

### Observabilidad y Monitoreo
* **Sentry (`@sentry/react-native`):** Monitoreo en tiempo real de excepciones, crashes nativos (Android/iOS), métricas de rendimiento y reproducción de sesiones (Session Replay) conectado a la organización `gusdev-y5`.

### Sistema de Escalado Adaptativo
Diseñado con enfoque Tablet-First, todos los márgenes, paddings y tamaños de fuente se calculan dinámicamente utilizando **`lib/responsive.ts`**:
* `scale()`: Escala el ancho dinámicamente.
* `verticalScale()`: Escala el alto dinámicamente.
* `moderateScale()`: Aplica un factor de escala (ideal para tamaños de texto).
* Punto de quiebre (Breakpoint): Un ancho `< 768` activa la distribución en columna única para teléfonos móviles.

---

## 🎨 Sistema de Diseño

Caoba POS está construido sobre las guías de interfaz **Glassmorphism Dark UI** ubicadas en [docs/DESIGN_GUIDE.md](file:///g:/Projects/CaobaPOS/CaobaPOS/docs/DESIGN_GUIDE.md).

### Colores
* **Deep Espresso (`#140906`):** Fondo base.
* **Graphite (`#1C110C`):** Tarjetas secundarias y hojas deslizantes.
* **Caoba Gold (`#CD9B46`):** Color primario de marca para llamadas a la acción (CTA).
* **Cream (`#EEDDC0`):** Texto secundario cálido.
* **Sage (`#6DB88A`):** Éxito, inventario activo y ganancias.
* **Coral (`#C96B6B`):** Peligro, eliminaciones e inventario agotado.

### Tipografía
* Texto de Interfaz: **Parkinsans** — la tipografía oficial de la marca (a través del componente `AppText` en `components/Text.tsx`).
* Números y Precios: **JetBrains Mono** (a través de `components/PriceDisplay.tsx`).

---

## 🚀 Instalación y Desarrollo Local

### Requisitos Previos
* Node.js (v18 o superior recomendado)
* Credenciales del proyecto en Supabase (configuradas en `.env`)

### Comandos de Configuración
1. Navega a este directorio:
   ```bash
   cd CaobaPOS
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Copia y llena las variables de entorno:
   ```bash
   cp .env.example .env
   ```
4. Ejecuta la aplicación:
   * **Web:** `npm run web` (o `npx expo start --web`)
   * **Android:** `npm run android`
   * **iOS:** `npm run ios`

---

## 🧪 Guía de Pruebas (Testing)

Este código utiliza **Jest** con la configuración predeterminada `jest-expo` para simular componentes nativos de la plataforma.

* **Ejecutar todas las pruebas:**
  ```bash
  npm test
  ```
* **Ejecutar un archivo de prueba específico:**
  ```bash
  npx jest __tests__/DashboardPanel.test.tsx
  ```

---

## 🚫 Antipatrones de Código e Interfaz

Para mantener la integridad arquitectónica de Caoba POS, se deben seguir estrictamente las siguientes reglas:
* ❌ **No usar el componente `Text` nativo de React Native.** Importar siempre `AppText` desde `components/Text` para asegurar el renderizado correcto de la tipografía de marca.
* ❌ **No usar `FlatList` nativo.** Todas las listas deben usar `@shopify/flash-list` con un `estimatedItemSize` definido para un rendimiento óptimo a 60 FPS.
* ❌ **No usar spinners/indicadores de actividad para cargas iniciales.** Usar esqueletos personalizados (`components/SkeletonItem.tsx`) que coincidan con la estructura visual final.
* ❌ **No usar tamaños de píxel fijos para métricas de layout/fuentes.** Envolver siempre las variables de tamaño en `scale()`, `verticalScale()` o `moderateScale()`.
