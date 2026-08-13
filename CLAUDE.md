# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CaobaPOS is a point-of-sale application for a small business built with React Native (Expo SDK 54), targeting Android, iOS, and web. The UI is in Spanish. Backend is Supabase (Postgres + REST API).

## Commands

- **Dev server**: `npx expo start` (or `npm start`)
- **Android**: `npx expo run:android`
- **iOS**: `npx expo run:ios`
- **Web**: `npx expo start --web`
- **Run all tests**: `npm test`
- **Run single test**: `npx jest __tests__/DashboardPanel.test.tsx`
- **Build (EAS)**: `eas build --profile preview` (APK), `eas build --profile production`

## Environment Setup

Copy `.env.example` to `.env` and fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The app shows an error screen if these are missing. For EAS builds, env vars are configured per profile in `eas.json`.

## Architecture

### Entry Point & Navigation

The app uses a **manual navigation pattern** (not Expo Router for screens). `index.ts` → `App.tsx` → `app/MainApp.tsx`. MainApp renders a `Header` with tab navigation and switches between five screens via a `Screen` state type: `pos`, `dashboard`, `inventory`, `history`, `clients`. There is an `app/_layout.tsx` for Expo Router but the actual screen rendering is handled by MainApp's switch statement.

### State Management

- **Zustand** (`store/cartStore.ts`): Two stores — `useCartStore` (cart items, barcode state) and `useSettingsStore` (IVA toggle, categories list, persisted to AsyncStorage).
- **TanStack Query** (`hooks/`): All Supabase data fetching. Products fetched once and filtered client-side. Key query keys: `products`, `categories`, `sales-history`, `clients_balances`, `client_payments`, `client_credit_sales`.
- **Animated values** (`store/uiStore.ts`): Shared `globalScrollY` and `headerTranslateY` for scroll-to-hide header animation. Initialized in MainApp, consumed by POSScreen.

### Supabase Schema (key tables/views)

- `products` — with `product_categories` join table → `categories`
- `sales` → `sale_items` (with `unit_cost` snapshot)
- `clients` → `client_payments`; `client_balances` (database view)
- RPC: `decrement_stock(p_product_id, p_quantity)`
- Sales support four payment methods: `cash`, `card`, `transfer`, `credito` (credit creates `pending_payment` status)

### Responsive Scaling System

`lib/responsive.ts` provides `scale()`, `verticalScale()`, and `moderateScale()` based on a 375×812 guideline. All layout dimensions and font sizes must use these functions — never use raw pixel values. Breakpoint: `width < 768` = mobile layout.

### Design System

Defined in `lib/designTokens.ts` and documented in `docs/DESIGN_GUIDE.md`. Key rules:

- **Brand palette** (Caoba brand manual): `#140906` deep espresso, `#CD9B46` Caoba Gold, `#EEDDC0` cream. Use `tokens.colors.*` for all colors, never hardcode. Text on a solid gold surface must be `tokens.colors.onGold` — cream on gold is only 1.88:1
- **Typography**: Parkinsans (brand font, all UI text) and JetBrains Mono (numbers/code). Use `components/Text.tsx` (`AppText`) instead of RN's `Text` — its `fontMap` is the single source of truth for what actually renders, and it overrides any `fontFamily` passed via style
- **Brand marks**: render espiral/flor/logo motifs through `components/BrandMark.tsx`. They are SVG data URIs, and RN's `Image` cannot decode SVG on iOS/Android — `BrandMark` routes them through `expo-image`, which can
- **Lists**: Always use `@shopify/flash-list` with `estimatedItemSize`, never `FlatList`
- **Loading states**: Use `SkeletonItem` component, never spinners or empty screens
- **Borders over shadows**: Prefer subtle borders (`rgba(255,255,255,0.06)`) and linear gradients over shadows

### Testing

Jest with `jest-expo` preset. Setup in `jest.setup.js` mocks Supabase, Expo modules (fonts, image, gradient), vector icons, AsyncStorage, and safe-area-context. Tests live in `__tests__/` mirroring the app structure.
