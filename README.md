# Caoba POS - Mobile & Web App

This directory contains the main Point of Sale (POS) application, built on **React Native** and **Expo (SDK 54)**. It is highly optimized for tablet layouts (landscape mode) and features a modern, premium **Dark Glassmorphic** UI.

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
