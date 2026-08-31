# Security Best Practices & Hardening Audit Report — CaobaPOS

**Date:** 2026-08-27  
**Auditor:** Senior Architect (Antigravity)  
**Target Stack:** React Native / Expo 54, React Native Web, Supabase (Postgres/RLS/Auth), TanStack Query v5, Zustand v5, Vercel PWA.  
**Audited with Skills:**
- `better-auth-security-best-practices`
- `security-best-practices`
- `security-and-hardening`
- `test-driven-development`

---

## Executive Summary

Se ejecutó una auditoría exhaustiva de seguridad sobre el código base de CaobaPOS, cubriendo análisis de límites de confianza (STRIDE), prevención de inyecciones (OWASP Top 10), autenticación, autorización basada en roles (RBAC/RLS), cabeceras HTTP para despliegues web/PWA y dependencias transitivas (`npm audit`).

El análisis identificó **1 vulnerabilidad Crítica**, **2 de Severidad Alta**, **2 de Severidad Media** y **28 avisos de dependencias transitivas**. La vulnerabilidad más urgente es la falta de escape HTML en la generación de recibos PDF imprimibles ([lib/receiptGenerator.ts](file:///g:/Projects/CaobaPOS/CaobaPOS/lib/receiptGenerator.ts)), que permite ejecución de HTML/scripting arbitrario ante nombres de productos o empleados manipulados.

---

## Findings Matrix

| ID | Severidad | Categoría | Archivo / Líneas | Impacto Principal |
|---|---|---|---|---|
| **SEC-001** | **CRITICAL** | Stored XSS / Injection | `lib/receiptGenerator.ts:43-53, 143-146` | Inyección de scripts/HTML en impresión y visor de recibos. |
| **SEC-002** | **HIGH** | Security Misconfiguration | `vercel.json:6-69` | Vulnerabilidad a Clickjacking, MIME-sniffing y filtración de Referrer. |
| **SEC-003** | **HIGH** | Broken Access Control | `hooks/useAuth.tsx:70-73` | Riesgo de escalamiento de privilegios vía `user_metadata.role`. |
| **SEC-004** | **MEDIUM** | Input Validation / SSRF | `lib/imageCache.ts:40-45` | Carga de imágenes remotas sin validación estricta de esquema HTTPS. |
| **SEC-005** | **MEDIUM** | Vulnerable Dependencies | `package.json` / `node_modules` | 28 vulnerabilidades reportadas en dependencias transitivas (`ws`, `undici`). |

---

## Detailed Vulnerability Report

### [SEC-001] CRITICAL: Stored Cross-Site Scripting (XSS) en Generador de Recibos
- **Archivo:** [lib/receiptGenerator.ts](file:///g:/Projects/CaobaPOS/CaobaPOS/lib/receiptGenerator.ts#L43-L53) (Líneas 43–53, 143–146, 175)
- **Impacto:** Un atacante o usuario que introduzca caracteres `<script>` o etiquetas `<img>` con manejadores de error en el nombre de un producto, fecha o empleado logrará que el código se interprete al generar o compartir el ticket con `expo-print` en entornos web/móviles.
- **Evidencia en código:**
  ```typescript
  // lib/receiptGenerator.ts:46
  <div class="name">${item.name}</div>
  // lib/receiptGenerator.ts:143
  <div>FECHA: ${data.date}</div>
  // lib/receiptGenerator.ts:146
  ${data.employeeName ? `<div class="employee-info">ATENDIDO POR: <strong>${data.employeeName.toUpperCase()}</strong></div>` : ''}
  ```
- **Violación de Estándar:** `security-and-hardening` (OWASP A03 Injection & Output Encoding) y Regla de Arquitectura #5.
- **Remediación:** Crear e invocar una función utilitaria pura `escapeHtml(str: string): string` que codifique `&`, `<`, `>`, `"`, y `'` antes de interpolar cualquier dato externo o persistido en el template HTML.

---

### [SEC-002] HIGH: Ausencia de Cabeceras de Seguridad HTTP en `vercel.json`
- **Archivo:** [vercel.json](file:///g:/Projects/CaobaPOS/CaobaPOS/vercel.json#L6-L69) (Líneas 6–69)
- **Impacto:** CaobaPOS se despliega en Vercel como PWA. La ausencia de cabeceras de seguridad permite que un atacante monte un sitio falso e incruste CaobaPOS dentro de un `<iframe>` invisible (Clickjacking), induciendo a un operador a confirmar ventas o transferencias sin su consentimiento.
- **Evidencia en código:**
  `vercel.json` solo define cabeceras `Cache-Control` y `Content-Type` para estáticos y service worker; no tiene reglas para las rutas de aplicación (`/(.*)`).
- **Violación de Estándar:** `security-and-hardening` (Security Misconfiguration) y `better-auth-security-best-practices`.
- **Remediación:** Incorporar a `vercel.json` cabeceras estándar para todas las rutas HTML:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(self), microphone=(), geolocation=()`

---

### [SEC-003] HIGH: Riesgo de Escalamiento de Privilegios por Confianza en `user_metadata.role`
- **Archivo:** [hooks/useAuth.tsx](file:///g:/Projects/CaobaPOS/CaobaPOS/hooks/useAuth.tsx#L70-L73) (Líneas 70–73)
- **Impacto:** En Supabase Auth, `user_metadata` puede ser editado directamente por el propio usuario autenticado vía `supabase.auth.updateUser({ data: { role: 'admin' } })`. Si el cliente o alguna vista evalúa `role` basado en este fallback, un empleado puede autootorgarse rol `admin`.
- **Evidencia en código:**
  ```typescript
  const roleClaim =
    session?.user?.app_metadata?.role ?? session?.user?.user_metadata?.role;
  const role: Role = isDemoMode || roleClaim === 'admin' ? 'admin' : 'empleado';
  ```
- **Violación de Estándar:** `security-and-hardening` (Broken Access Control / STRIDE Elevation of Privilege).
- **Remediación:** Ignorar `user_metadata.role` y verificar únicamente `app_metadata.role` (modificable exclusivamente mediante la Service Role Key de Supabase en base de datos o edge functions). Asegurar que todas las mutaciones críticas estén protegidas por RLS en Postgres.

---

### [SEC-004] MEDIUM: Ausencia de Validación de Esquemas Seguros en URLs Remotas (`safeUrl.ts`)
- **Archivo:** [lib/imageCache.ts](file:///g:/Projects/CaobaPOS/CaobaPOS/lib/imageCache.ts#L40-L45) (Líneas 40–45)
- **Impacto:** Al descargar o cachear imágenes remotas de productos, no se valida que el esquema sea exclusivamente `https:`. Esquemas malformados o con prefijos locales podrían provocar comportamientos inesperados en `FileSystem.downloadAsync`.
- **Violación de Estándar:** `security-and-hardening` (SSRF / Input Validation).
- **Remediación:** Implementar `lib/safeUrl.ts` que valide protocolos seguros (`https:` o rutas locales validadas `file://` en mobile) y descartar URLs con esquemas peligrosos como `javascript:`, `data:` no autorizado, o URLs internas.

---

### [SEC-005] MEDIUM: Vulnerabilidades en Dependencias Transitivas (`npm audit`)
- **Archivo:** `package.json` / `node_modules`
- **Impacto:** 28 vulnerabilidades (2 críticas, 17 altas, 8 moderadas) detectadas en paquetes transitivos como `ws` (agotamiento de memoria DoS) y `undici` (inyección CRLF). La mayoría proviene del toolchain de desarrollo de Expo/Metro.
- **Remediación:** Ejecutar un audit fix cuidadoso para las librerías compatibles con Expo SDK 54 sin alterar versiones nativas bloqueadas por `expo-build-properties`.

---

## Next Steps & TDD Strategy

Siguiendo la skill `test-driven-development`, cada corrección debe seguir el ciclo estricto:
1. **RED:** Escribir el test que falle demostrando la vulnerabilidad (e.g. `escapeHtml('<script>')` o validación de URL).
2. **GREEN:** Implementar el código mínimo y seguro para pasar el test.
3. **REFACTOR:** Limpiar y verificar que la suite completa (`15/15` suites) continúe en verde.
