# STACK.md — Cash Pro v2

Versiones estables verificadas (junio 2026). Principio rector: **estándares abiertos, cero vendor lock-in, containerizable**.

| Capa | Tecnología | Versión | Por qué |
|------|------------|---------|---------|
| Monorepo | Turborepo + pnpm | turbo 2.9, pnpm 9.12 | Caché de tareas, workspaces, builds incrementales |
| Web | Next.js (App Router) | 14.2 → plan 16.x | PWA, output `standalone` para Docker/Cloud Run |
| Mobile | Expo SDK | 56 (plan) | RN 0.85, Expo Router, EAS Build (Android-first, iOS gratis) |
| API | Hono | 4.x | Edge-ready, mínimo, corre en Node/Docker/Cloud Run/Workers |
| ORM | Drizzle ORM | 0.36 | Type-safe, **migraciones SQL puras**, sin features propietarias |
| DB | PostgreSQL | 16 | Estándar; Supabase ahora → Cloud SQL/RDS/Neon después |
| Auth | Clerk (Organizations) | backend 1.x | Multi-tenant nativo, portable web+mobile |
| Offline | PowerSync | (plan) | Sync Postgres↔SQLite; edición self-hostable = escape de lock-in |
| Storage | Cloudflare R2 | vía `@aws-sdk/client-s3` | S3-compatible → portable a cualquier object store |
| Estado web | Zustand + TanStack Query | 5.x | UI state + server cache (offline-friendly) |
| Validación | Zod | 3.x | Esquemas compartidos api + clientes |
| Gráficos | Recharts (web) / Victory Native (mobile) | — | — |

## Portabilidad (reglas duras)
- Solo PostgreSQL estándar. Columnas `GENERATED ... STORED` soportadas por Supabase/Cloud SQL/RDS/Neon.
- Storage vía SDK S3-compatible, nunca APIs propietarias.
- Auth en Clerk (no Supabase Auth).
- Dockerfile por app desde el día 1.
- Sync (PowerSync) aislado en `packages/sync`; el schema no depende de él.
