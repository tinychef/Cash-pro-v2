# Reporte de Auditoría — Cash Pro v2

Ejecución del plan en `docs/AUDIT.md`. Severidades: Crítica / Alta / Media / Baja.
Estado: **R** = remediado en esta ronda · **P** = pendiente (siguiente ronda).

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
| 11 | **Sin RLS en PostgreSQL** (solo capa app) | Media | **P** | Evaluar políticas RLS por `company_id` como defensa en profundidad. |
| 12 | **Sin tests de API/integración** | Media | **R** | `apps/api/src/app.test.ts`: 5 tests (health, CRUD, **aislamiento de tenant**, guarda de stock 409, descuento de stock); gated por `DATABASE_URL`. |
| 13 | **Sin paginación en listados/reportes** | Baja→Media | **P** | Paginación keyset por `companyId + createdAt`. |
| 14 | **CI sin lint ni prueba de migración** | Baja | **P** | Añadir lint + servicio Postgres + `drizzle-kit migrate` + tests de integración en CI. |
| 15 | **Dependencias** | Baja | **P** | Ejecutar `pnpm audit --prod` periódicamente. |
| 16 | **Factura sin cliente rechazada (walk-in)** | Media | **R** | `invoiceInputSchema`: `clientId` opcional → permite ventas de mostrador. |

## Verificación de esta ronda
- `pnpm turbo typecheck test build` → **verde** (7/7).
- `@cash-pro/core`: **11 tests** (incluye redondeo monetario).
- API contra PostgreSQL 16: headers de seguridad presentes (HSTS, X-Content-Type-Options,
  X-Frame-Options, CSP/COOP/CORP); CRUD sin regresión (201/200); `requireWrite` activo.

## Siguiente ronda recomendada (Media)
Orden sugerido: #12 tests de integración → #9 numeración concurrente → #10 guardia de stock
→ #8 CORS estricto → #11 RLS → #13 paginación → #14 CI.
