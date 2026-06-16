# Auth & Roles — CaobaPOS
**Fecha:** 2026-06-16  
**Estado:** Aprobado

## Resumen

Autenticación con Supabase Auth (email + contraseña) y dos roles: `admin` y `empleado`. Los roles se almacenan en `user_metadata` del usuario de Supabase — sin tablas extra. La sesión persiste entre cierres de la app vía AsyncStorage.

---

## Roles y permisos

| Pantalla       | Admin | Empleado              |
|:---------------|:-----:|:---------------------:|
| POS            | ✅    | ✅                    |
| Dashboard      | ✅    | ❌ (oculto del menú)  |
| Inventario     | ✅    | ✅ (con costo)        |
| Historial      | ✅ (con montos) | ✅ (sin montos) |
| Clientes       | ✅    | ✅ (con deudas)       |

---

## Arquitectura

### Flujo de la app

```
App.tsx
  └── AuthProvider
        ├── isLoading → splash mínimo (fondo negro, sin texto)
        ├── sin sesión → <LoginScreen />
        └── con sesión → <MainApp role={role} />
```

### Archivos nuevos

| Archivo | Responsabilidad |
|:--------|:----------------|
| `hooks/useAuth.ts` | Contexto de sesión: `session`, `user`, `role`, `signIn`, `signOut`, `isLoading` |
| `app/LoginScreen.tsx` | Pantalla de login — email + contraseña, estilo glassmorphism |

### Archivos modificados

| Archivo | Cambio |
|:--------|:-------|
| `lib/supabase.ts` | Agregar `AsyncStorage` al cliente para persistencia de sesión |
| `App.tsx` | Envolver en `AuthProvider`, decidir entre `LoginScreen` y `MainApp` |
| `components/Header.tsx` | Recibir `role` prop y filtrar `TABS` (ocultar `dashboard` para empleado) |
| `app/MainApp.tsx` | Pasar `role` a `Header`; bloquear navegación a `dashboard` si `role !== 'admin'` |
| `app/HistoryPanel.tsx` | Leer `role` del contexto y ocultar `total_amount` (mostrar `———`) para empleado |

---

## Detalles de implementación

### `hooks/useAuth.ts`
- Crea un `Context` de React con `AuthProvider`
- En `useEffect`, llama `supabase.auth.getSession()` al montar y suscribe a `onAuthStateChange`
- Lee `user.user_metadata.role` y lo tipifica como `'admin' | 'empleado'`
- Si `user_metadata.role` no existe o es inválido, trata al usuario como `'empleado'` (principio de mínimo privilegio)
- Expone `signIn(email, password)` y `signOut()`

### `app/LoginScreen.tsx`
- Logo de Caoba centrado
- Campo email (teclado `email-address`) + campo contraseña (toggle ver/ocultar)
- Botón "Iniciar sesión" con `ActivityIndicator` mientras carga
- Error inline debajo del botón si las credenciales fallan
- Sin opción de registro
- Usa `tokens.colors.*`, `InstrumentSans`, `scale()`/`verticalScale()`

### `lib/supabase.ts`
```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### `components/Header.tsx`
```ts
// Filtrar tabs según rol
const visibleTabs = TABS.filter(
  tab => role === 'admin' || tab.key !== 'dashboard'
);
```

### `app/HistoryPanel.tsx`
- Importar `useAuth` y leer `role`
- Donde se renderiza `total_amount` / totales: reemplazar por `'———'` si `role === 'empleado'`
- No ocultar filas ni secciones enteras — solo los valores monetarios

### `app/MainApp.tsx`
- Si `currentScreen === 'dashboard'` y `role !== 'admin'`, redirigir a `'pos'`
- Pasar `role` como prop al `Header`

---

## Configuración en Supabase Dashboard (sin SQL)

1. **Authentication → Providers → Email** — confirmar que esté habilitado (viene por defecto)
2. **Authentication → Users → Add user** — crear usuarios con su email y contraseña
3. En el campo **"User Metadata"** de cada usuario: `{"role": "admin"}` o `{"role": "empleado"}`

No se requieren tablas nuevas, migraciones SQL ni políticas RLS adicionales.

---

## Seguridad

- El rol en `user_metadata` es editable por el propio usuario via `supabase.auth.updateUser()`. Para este despliegue de tienda esto es aceptable (acceso interno, dispositivo controlado).
- Si en el futuro se requiere que el empleado no pueda auto-elevarse, migrar roles a `app_metadata` (solo modificable con `service_role`).

---

## Testing

- Login con credenciales correctas → redirige a MainApp
- Login con credenciales incorrectas → muestra error inline
- Usuario `admin` → ve las 5 tabs incluyendo Dashboard con montos completos
- Usuario `empleado` → no ve tab Dashboard; en Historial los montos aparecen como `———`
- Cerrar y reabrir la app → sesión persiste sin pedir login de nuevo
- Botón cerrar sesión → vuelve al LoginScreen
