<div align="center">

  <img src="https://github.com/user-attachments/assets/3f9e2a55-e9e6-4858-a101-8b42575fe68e" alt="Caoba POS Icon" width="96" height="96" style="border-radius: 20%;" />

  # Caoba POS

  <p align="center">
    [English](README.md) · [Español](README.es.md)
  </p>

  <p align="center">
    <strong>Real-time point of sale (POS) and analytics system optimized for tablets and web.</strong><br>
    Designed with a Dark Glassmorphic UI, 60 FPS rendering, and reactive synchronization with Supabase.
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
    <em>Tablet-first architecture optimized for landscape orientation with responsive mobile support.</em>
  </p>

</div>

---

## 📱 Application Modules

The application is structured into five core panels:

1. **Point of Sale (POS) (`app/index.tsx`):** The primary transaction screen. Features a 60% width grid for categories and products, and a 40% width checkout panel with cart summary, barcode scanning, and payment methods.
2. **Dashboard (`app/DashboardPanel.tsx`):** Real-time business analytics including gross sales, profits, payment method distribution, transaction counts, and product popularity charts.
3. **Inventory Management (`app/InventoryPanel.tsx`):** Add, update, and toggle active status of products. Set stock boundaries, prices, barcodes, and upload images.
4. **Sales History (`app/HistoryPanel.tsx`):** Filter and search completed sales by payment method or date ranges. Supports sale detail inspection, PDF receipt generation, and transaction cancellations (with automatic inventory restoration).
5. **Customer Management (`app/ClientsPanel.tsx`):** Track regular customers, manage unpaid balances/credits, register partial payments, and inspect individual account statements.

---

## 🛠️ Architecture & Technologies

### Entry Point & Navigation
The app utilizes a **Manual Tab/Screen Switching** pattern managed by `app/MainApp.tsx` instead of folder-based routing, which ensures high performance and immediate state sharing across tabs.

* **Entrypoint:** `index.ts` → `App.tsx` → `app/MainApp.tsx`

### State Management
* **Zustand (`store/`):**
  * `useCartStore`: Manages cart items, scanning states, discounts, and custom items.
  * `useUIStore`: Shared animations for hiding the header on scroll.
  * `useSettingsStore`: Local application configurations (e.g., IVA taxation percentage) persisted in device memory via `@react-native-async-storage/async-storage`.
* **TanStack Query (`hooks/`):** Handles all asynchronous data synchronization with Supabase, query caching, optimistic UI updates, and cache invalidation.
* **Realtime (`hooks/useRealtimeSync.ts`):** Listens to PostgreSQL replication changes in Supabase for real-time menu and stock updates across devices.

### Responsive Scaling System
Designed with a tablet-first mindset, all layout margins, paddings, and font sizes are dynamically calculated using **`lib/responsive.ts`**:
* `scale()`: Scales width dynamically.
* `verticalScale()`: Scales height dynamically.
* `moderateScale()`: Applies a scaling factor (ideal for text sizes).
* Breakpoint: Width `< 768` triggers the single-column portrait layout for phone screens.

---

## 🎨 Design System

Caoba POS is built around the **Glassmorphism Dark UI** guidelines located in [docs/DESIGN_GUIDE.md](file:///g:/Projects/CaobaPOS/CaobaPOS/docs/DESIGN_GUIDE.md).

### Colors
* **Deep Espresso (`#140906`):** Base background.
* **Graphite (`#1C110C`):** Secondary cards and sheets.
* **Caoba Gold (`#CD9B46`):** Call-to-action primary brand color.
* **Cream (`#EEDDC0`):** Warm secondary text.
* **Sage (`#6DB88A`):** Success, active inventory, and gains.
* **Coral (`#C96B6B`):** Danger, deletions, and empty inventory.

### Typography
* UI Copy: **Parkinsans** — the official brand typeface (via `components/Text.tsx` `AppText` component).
* Numbers & Prices: **JetBrains Mono** (via `components/PriceDisplay.tsx`).

---

## 🚀 Installation & Local Development

### Prerequisites
* Node.js (v18 or higher recommended)
* Supabase project credentials (configured in `.env`)

### Setup Commands
1. Navigate to this directory:
   ```bash
   cd CaobaPOS
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy and fill in the environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run the application:
   * **Web:** `npm run web` (or `npx expo start --web`)
   * **Android:** `npm run android`
   * **iOS:** `npm run ios`

---

## 🧪 Testing Guidelines

This codebase uses **Jest** with the `jest-expo` preset to mock native platform components.

* **Run all tests:**
  ```bash
  npm test
  ```
* **Run a specific test file:**
  ```bash
  npx jest __tests__/DashboardPanel.test.tsx
  ```

---

## 🚫 Code & UI Anti-Patterns

To maintain the architectural integrity of Caoba POS, developers must follow these strict rules:
* ❌ **Do not use native React Native `Text` components.** Always import `AppText` from `components/Text` to ensure proper font rendering.
* ❌ **Do not use native `FlatList`.** All lists must use `@shopify/flash-list` with a defined `estimatedItemSize` for optimal 60 FPS performance.
* ❌ **Do not use spinners/activity indicators for initial loading.** Use custom skeletons (`components/SkeletonItem.tsx`) to match the final visual structure.
* ❌ **Do not use raw pixel sizes for layout/font metrics.** Always wrap size variables in `scale()`, `verticalScale()`, or `moderateScale()`.
