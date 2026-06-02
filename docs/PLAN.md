# PLAN.md — Cash Pro v2 (ERP migrable, offline-first)

## Objetivo
Evolucionar el MVP (Next.js + Zustand/localStorage) a un ERP portable y
offline-first (Web PWA + Android) con **cero vendor lock-in**, reutilizando
el código existente.

## Decisiones (confirmadas con el usuario)
- Construir **hasta donde se pueda** en esta iteración.
- **Reutilizar** el MVP (lógica/tipos elevados a paquetes compartidos).
- Offline con **PowerSync** (edición self-hostable como escape de lock-in).
- **Sin** facturación fiscal por ahora (schema deja espacio).

Ver `STACK.md`, `ARCHITECTURE.md`, `RISKS.md` para detalle.

## Orden de implementación (cada paso = commit validable)
1. ✅ Reestructura a monorepo Turborepo + pnpm; MVP → `apps/web`.
2. ✅ `packages/config` (tsconfig/eslint/prettier).
3. ✅ `packages/core` (tipos, cálculos puros, Zod, formato) + tests.
4. ✅ `packages/db` (Drizzle, 17 tablas, columnas GENERATED, sync/multi-tenant) + migración SQL pura.
5. ✅ `apps/api` (Hono + Clerk + Drizzle) CRUD validado + reportes; probado e2e.
6. ✅ Docker (api/web Dockerfiles + compose) + CI (typecheck/test/build).
7. ⏳ `apps/web` → Next 16 + consumo de `@cash-pro/core` y API (TanStack Query) + Clerk.
8. ⏳ `packages/ui` (extraer primitivas shadcn).

## Fases siguientes (no en esta sesión)
- **Mobile**: app Expo SDK 56 (Android), Expo Router, NativeWind.
- **Offline real**: `packages/sync` con PowerSync, resolución de conflictos, 72h sin internet.
- **PDFs**: generación offline de facturas.
- **Roles/multi-usuario**, personalización, tests e2e ampliados.
- **Fiscal** (DIAN/SAT) cuando se requiera.

## Cómo correr (local)
```bash
pnpm install
# DB temporal + migración
DATABASE_URL=postgres://... pnpm --filter @cash-pro/db migrate
# API (modo dev sin Clerk: header x-company-id)
DATABASE_URL=postgres://... pnpm --filter @cash-pro/api dev
# Web
pnpm --filter @cash-pro/web dev
# Todo junto
docker compose -f docker/docker-compose.yml up
```

## Criterios de éxito (verificados)
- typecheck/test/build verdes en todo el workspace.
- API e2e contra PostgreSQL 16 correcta (márgenes, totales, estados, reportes).
