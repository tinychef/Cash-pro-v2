# Plan de Auditoría — Cash Pro v2

## Contexto
Cash Pro v2 es un ERP multi-tenant (monorepo: `apps/web` Next.js, `apps/api` Hono,
`packages/{core,db}`). Antes de salir a producción y manejar datos financieros de
múltiples empresas, se requiere una auditoría de **seguridad, corrección financiera,
calidad y preparación para producción**. Este documento define el alcance, la
metodología, los hallazgos ya conocidos (priorizados) y el formato de entrega.

## Alcance
1. **Seguridad** (foco principal): aislamiento multi-tenant, autenticación/autorización, validación de entrada, exposición de datos, dependencias.
2. **Corrección financiera**: cálculos de dinero, impuestos, inventario, estados de factura/compra.
3. **Calidad y mantenibilidad**: tipado, cobertura de pruebas, manejo de errores.
4. **Rendimiento y escalabilidad**: paginación, índices, consultas.
5. **Infra / DevOps**: CI, Docker, manejo de secretos, migraciones.

## Metodología
- **Revisión manual** guiada por OWASP ASVS / Top 10, archivo por archivo en `apps/api` (superficie de ataque) y `packages/db` (modelo de datos).
- **Análisis estático**: `pnpm -r exec tsc --noEmit` (strict ya activo), ESLint con `eslint-plugin-security`, y opcional `semgrep --config p/owasp-top-ten`.
- **Dependencias**: `pnpm audit --prod` + revisión de versiones desactualizadas.
- **Pruebas dinámicas**: levantar `docker compose` y ejercitar la API con tokens de dos tenants distintos para probar fugas entre empresas; fuzz básico de payloads.
- **Cada hallazgo** se registra con: ubicación (`archivo:línea`), severidad (Crítica/Alta/Media/Baja), impacto, evidencia y remediación propuesta.

## Checklist por área

### A. Seguridad
- [ ] **Aislamiento multi-tenant**: confirmar que *toda* consulta filtra por `companyId` (revisar `apps/api/src/lib/crud.ts`, `routes/{invoices,payments,purchases,reports,settings}.ts`). Probar con 2 tenants que A no pueda leer/editar/borrar recursos de B por id.
- [ ] **Bypass de auth**: verificar que con `CLERK_SECRET_KEY` activo, el header `x-company-id` y `/dev/bootstrap` quedan **inertes** (`apps/api/src/middleware/tenant.ts`, `routes/dev.ts`).
- [ ] **RBAC**: los roles `owner/admin/member/viewer` existen en el schema pero **no se aplican** — definir qué acciones requieren qué rol y agregar middleware de autorización.
- [ ] **Mass assignment**: en `crud.ts` se hace `...input` hacia insert/update; confirmar que Zod (objetos planos en `packages/core/src/validations`) descarta claves desconocidas y que `companyId/id/syncStatus/deletedAt` no son asignables por el cliente.
- [ ] **Rate limiting / headers / tamaño de body**: ausente en `apps/api/src/app.ts` — añadir límite de tasa, límite de tamaño de payload y cabeceras de seguridad.
- [ ] **CORS**: revisar el fallback `origin: "*"` en `app.ts`; restringir a orígenes conocidos en producción.
- [ ] **Fuga en errores**: `app.onError` devuelve `err.message` al cliente — sanitizar en producción (log interno, mensaje genérico).
- [ ] **Secretos**: confirmar que no hay claves reales commiteadas (solo `.env.example` y defaults de `docker/docker-compose.yml`).
- [ ] **Dependencias**: `pnpm audit`; revisar `@react-pdf/renderer`, `@clerk/*`, `drizzle-kit`.
- [ ] **Token web**: revisar obtención de token Clerk en `apps/web/src/lib/api.ts` (no persistir en storage).

### B. Corrección financiera
- [ ] **Precisión monetaria**: los totales se calculan con `number` (float) en `packages/core/src/calculations/index.ts` y se almacenan como `numeric`. Evaluar drift de centavos y migrar a redondeo determinista (o enteros en centavos).
- [ ] **Stock negativo**: `routes/invoices.ts` no impide vender por debajo de 0 — definir política (bloquear / permitir backorder) y validar.
- [ ] **Numeración de documentos**: factura/OC usan conteo + índice único; falta **reintento** ante colisión concurrente → usar secuencia por empresa o reintento.
- [ ] **Consistencia de soft-delete**: confirmar que listados, reportes y agregados filtran `deletedAt IS NULL` de forma uniforme.
- [ ] **Impuestos y márgenes**: validar con casos límite (tasa 0, precio 0) — ya cubiertos parcialmente por los 9 tests de `core`.
- [ ] **Zonas horarias**: comparaciones por fecha usan `slice(0,10)` sobre ISO; revisar consistencia UTC vs local.

### C. Calidad / mantenibilidad
- [ ] **Cobertura de pruebas**: hoy solo `packages/core` (9 tests). Añadir tests de integración de la API (CRUD + aislamiento de tenant) y e2e mínimos de la web.
- [ ] **Uso de `any`**: acotado a `crud.ts` y `serialize.ts`; documentar o tipar.
- [ ] **Manejo de errores en mutaciones web**: ya usa toasts; revisar estados de carga/vacío.

### D. Rendimiento / escalabilidad
- [ ] **Paginación**: listados y reportes cargan todo sin límite — añadir paginación/keyset.
- [ ] **Índices**: validar planes de consulta (EXPLAIN) para `companyId` + filtros de estado/fecha.

### E. Infra / DevOps
- [ ] **CI** (`.github/workflows/ci.yml`): añadir lint, prueba de migración (aplicar `drizzle-kit migrate` contra Postgres efímero) y tests de integración.
- [ ] **Docker**: la API corre vía `tsx` en producción; evaluar build compilado/bundle para arranque y tamaño.
- [ ] **Migraciones**: definir estrategia de despliegue (migrate en release, no en runtime).
- [ ] **Observabilidad**: logging estructurado, health checks (web), métricas.

## Severidad inicial de gaps conocidos (a confirmar en la auditoría)
| Gap | Severidad estimada |
|-----|--------------------|
| RBAC no aplicado | **Alta** |
| Sin rate limiting / límite de payload | **Alta** |
| Precisión monetaria en float | **Alta** |
| Errores crudos al cliente | Media |
| CORS `*` por defecto | Media |
| Numeración sin reintento concurrente | Media |
| Stock negativo permitido | Media |
| Sin RLS en DB (solo capa app) | Media |
| Sin tests de API/integración | Media |
| Sin paginación | Baja→Media (según volumen) |

## Entregables
1. `docs/AUDIT-REPORT.md` con hallazgos (severidad, evidencia `archivo:línea`, remediación).
2. Lista priorizada de tareas de remediación (Crítica/Alta primero).
3. PRs de corrección para los hallazgos Críticos/Altos.

## Verificación
- Estática: `pnpm turbo typecheck lint`, `pnpm audit`.
- Aislamiento tenant: script que crea 2 empresas y verifica 403/404 cruzados en todos los recursos.
- Migración: `drizzle-kit migrate` limpio sobre Postgres 16 efímero.
- Regresión: `pnpm turbo test` verde tras cada remediación.
