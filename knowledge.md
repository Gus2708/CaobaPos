# CaobaPOS — Project Knowledge

## What This Is

CaobaPOS is a **point-of-sale (POS) application** for a small business. Built with **React Native (Expo SDK 54)**, targets **Android, iOS, and Web (PWA)**. UI is in **Spanish**. Backend is **Supabase (Postgres + REST API + Realtime)**.

## Key Files & Architecture

| Area | Location | Notes |
|------|----------|-------|
| Entry | `index.ts` → `App.tsx` → `app/MainApp.tsx` | Manual navigation (NOT Expo Router). `app/_layout.tsx` is unused. |
| Screens | `app/` (POSScreen, DashboardPanel, InventoryPanel, HistoryPanel, ClientsPanel) | 5 screens switched via `Screen` state type: `pos`, `dashboard`, `inventory`, `history`, `clients` |
| Components | `components/` (28 files) | GlassCard, Badge, Header, Toast, ProductButton, CartItem, CheckoutPanel, etc. |
| State | `store/cartStore.ts` (Zustand) | `useCartStore` (cart items, barcode) + `useSettingsStore` (IVA toggle, categories, persisted to AsyncStorage) |
| Animations | `store/uiStore.ts` | Shared `globalScrollY`, `headerTranslateY` for scroll-to-hide header |
| Data Fetching | `hooks/` (TanStack Query) | Key query keys: `products`, `categories`, `sales-history`, `clients_balances`, `client_payments`, `client_credit_sales` |
| Theme | `lib/designTokens.ts` | Dark glassmorphism — Mahogany (#B87B5A) & Sage (#6DB88A) palette. NEVER hardcode colors. |
| Responsive | `lib/responsive.ts` | `scale()`, `verticalScale()`, `moderateScale()` based on **375×812 guideline**. Never use raw px. Breakpoint: `width < 768` = mobile. |
| Supabase | `lib/supabase.ts` | Has self-healing URL/key parser for Vercel copy-paste typos |
| PDF/Receipts | `lib/pdfReportGenerator.ts`, `lib/receiptGenerator.ts` | Uses `expo-print` + `expo-sharing` |
| Brand Assets | `lib/brandAssets.ts` | Logo, company info for receipts |

## Commands

```bash
npm start           # Start Expo dev server
npm run android     # Run on Android
npm run ios         # Run on iOS
npm run web         # Run on web (PWA)
npm test            # Run all Jest tests
npm run build       # Export web build (`expo export --platform web`)
npx jest <path>     # Run single test file
eas build --profile preview   # APK build (internal)
eas build --profile production # Production APK
```

## Environment

Copy `.env.example` → `.env`. Required vars:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

App shows error screen if missing. For EAS builds, env vars are in `eas.json` per profile.

## Design Guidelines (from `docs/DESIGN_GUIDE.md`)

- **Dark glassmorphism** — use `tokens.colors.*` always, never hardcode colors
- **Typography**: Instrument Sans (body), JetBrains Mono (numbers/code). Use `components/Text.tsx` (`AppText`) instead of RN `Text`
- **Lists**: Always use `@shopify/flash-list` with `estimatedItemSize`, never `FlatList`
- **Loading states**: Use `SkeletonItem` component, never spinners/spinners
- **Borders over shadows**: Prefer subtle borders (`rgba(255,255,255,0.06)`) and linear gradients
- **Spacing**: Base unit = 4px. Tokens: xs(4), sm(8), md(12), lg(16), xl(24), xxl(32)
- **Radii**: card=20, btn=14, chip=12, pill=999

## Testing

- **Jest** with `jest-expo` preset (RNTL v14 — async render with `@testing-library/react-native`)
- **Setup**: `jest.setup.js` mocks Supabase, Expo modules, AsyncStorage, safe-area-context
- **Location**: `__tests__/` mirrors app structure
- **Commands**: `npm test` or `npx jest <path>`

## Gotchas

1. **Metro config** has 3 workarounds: (a) custom Babel transformer for `import.meta` polyfill, (b) blocklist for non-existent Gradle plugin dirs that crash Metro on Windows, (c) forced CommonJS `zustand` resolution to avoid ESM `import.meta.env` SyntaxError on web.
2. **`newArchEnabled: false`** in `app.json` — the New Architecture is NOT enabled.
3. **Supabase URL self-healing** — `lib/supabase.ts` auto-trims duplicated copy-paste URL typos.
4. **`app/_layout.tsx`** exists for Expo Router but is NOT used. Actual routing is manual in `MainApp.tsx`.
5. **Local `.env` ignored** by `.gitignore` — only `.env.example` is tracked.
6. **Zustand persistence** uses AsyncStorage (via `createJSONStorage`). Settings store is persisted; cart store is not.
7. **Sales support 4 payment methods**: `cash`, `card`, `transfer`, `credito` (credit sets `pending_payment` status).
8. **Database RPC**: `decrement_stock(p_product_id, p_quantity)` for stock management.
