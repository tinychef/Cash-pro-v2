# Reporte de Auditoría — Cash Pro v2

Ejecución del plan en `docs/AUDIT.md`. Severidades: Crítica / Alta / Media / Baja.
Estado: **R** = remediado · **R\*** = remediado con salvedad (ver nota) · **P** = pendiente.

> **Rondas:** 1 (Alta) ✅ · 2 (robustez/corrección) ✅ · 3 (defensa en profundidad/infra) ✅ — **todas completadas**.

## Resumen
Se priorizaron y **remediaron los hallazgos de severidad Alta** y un hallazgo Media de
bajo costo. No se encontraron vulnerabilidades Críticas (el aislamiento multi-tenant ya
filtraba por `companyId` en todas las consultas; el bypass `x-company-id`/`/dev/bootstrap`
ya estaba correctamente desactivado cuando Clerk está configurado).

## Hallazgos

| # | Hallazgo | Sev. | Estado | Evidencia / Fix |
|---|----------|------|--------|-----------------|
| 1 | **RBAC definido pero no aplicado** (roles en schema, nunca verificados) | Alta | **R** | Rol resuelto en `apps/api/src/middleware/tenant.ts` (org role de Clerk → owner/admin/member/viewer; dev=owner) + `middleware/authz.ts` `requireWrite` bloquea escrituras para `viewer`. Montado en `app.ts`. |
| 2 | **Sin rate limiting / límite de payload / headers de seguridad** | Alta | **R** | `secureHeaders()`, `bodyLimit(1MB)` y `rateLimit(300/min)` en `app.ts`; nuevo `middleware/rate-limit.ts`. Headers verificados (CSP/HSTS/nosniff/frame-options). |
| 3 | **Precisión monetaria en float** (drift de centavos) | Alta | **R** | `round2()` determinista en `packages/core/src/calculations/index.ts`, aplicado a `invoiceTotals`, `purchaseTotal`, `profitAndLoss`, `netCashFlow`. +2 tests. |
| 4 | **Fuga de detalles de error al cliente** | Media | **R** | `app.onError` devuelve mensaje genérico en producción (log interno completo). |
| 5 | **Aislamiento multi-tenant** | — | OK | Todas las consultas filtran `companyId` (`lib/crud.ts`, rutas custom). Confirmado. |
| 6 | **Bypass de auth en prod** | — | OK | Con `CLERK_SECRET_KEY`, `tenant.ts` ignora `x-company-id`; `/dev/bootstrap` responde 403. |
| 7 | **Mass assignment** | — | OK | Zod (objetos planos) descarta claves desconocidas; `companyId/createdBy` se fijan tras el spread. |
| 8 | **CORS `*` por defecto** | Media | **R** | `app.ts`: allowlist desde `WEB_ORIGIN`; en producción nunca cae a `*` (bloquea y avisa si falta). |
| 9 | **Numeración de documentos sin reintento concurrente** | Media | **R** | `lib/retry.ts` `withUniqueRetry` envuelve la transacción de factura y compra; reintenta ante violación de índice único (23505). |
| 10 | **Stock negativo permitido en ventas** | Media | **R** | `routes/invoices.ts`: guarda de inventario (409 si insuficiente) salvo `settings.allowNegativeStock`. |
| 11 | **Sin RLS en PostgreSQL** (solo capa app) | Media | **R*** | `packages/db/rls.sql` habilita RLS + política `tenant_isolation` por `company_id` en las 15 tablas con tenant (verificado aplica limpio). **Opt-in**: requiere rol de app no-owner + GUC `app.current_company` por request (documentado en el propio script). |
| 12 | **Sin tests de API/integración** | Media | **R** | `apps/api/src/app.test.ts`: 5 tests (health, CRUD, **aislamiento de tenant**, guarda de stock 409, descuento de stock); gated por `DATABASE_URL`. |
| 13 | **Sin paginación en listados/reportes** | Baja→Media | **R** | `lib/paging.ts` (`?limit`/`?offset`, cap 500) aplicado a productos/clientes/proveedores/gastos/facturas/compras. |
| 14 | **CI sin lint ni prueba de migración** | Baja | **R** | `.github/workflows/ci.yml`: servicio **Postgres 16** + tests de integración (migra y ejercita aislamiento de tenant) + lint web + `pnpm audit`. |
| 15 | **Dependencias** | Baja | **R** | `pnpm audit --prod` integrado en CI. Resuelto: **Next 14→16 + React 19**, **drizzle-orm 0.36→0.45.2** (fix SQLi GHSA-gpj5-g38j-94v9) y override `postcss>=8.5.10`. Resultado: **0 vulnerabilidades** (antes 16, 6 *high*). |
| 16 | **Factura sin cliente rechazada (walk-in)** | Media | **R** | `invoiceInputSchema`: `clientId` opcional → permite ventas de mostrador. |

## Verificación de esta ronda
- `pnpm turbo typecheck test build` → **verde** (7/7).
- `@cash-pro/core`: **11 tests** (incluye redondeo monetario).
- API contra PostgreSQL 16: headers de seguridad presentes (HSTS, X-Content-Type-Options,
  X-Frame-Options, CSP/COOP/CORP); CRUD sin regresión (201/200); `requireWrite` activo.

## Estado final
Todos los hallazgos del plan quedan **remediados**. `pnpm audit --prod` → **0 vulnerabilidades**.
Stack actualizado a **Next 16 + React 19 + Drizzle 0.45**.

Salvedad única (no bloqueante):
- **RLS** (#11): provisto como hardening opt-in; activarlo en el despliegue productivo
  (rol no-owner + GUC por request).

Pendiente sólo lo marcado desde el inicio como fase futura del producto (no auditoría):
app móvil Expo + sincronización offline con PowerSync.
