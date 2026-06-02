# ARCHITECTURE.md — Cash Pro v2

## Estructura del monorepo

```
cash-pro/
├── apps/
│   ├── web/   Next.js PWA (MVP migrado)
│   ├── mobile/ Expo Android (fase siguiente)
│   └── api/   Hono + Clerk + Drizzle
├── packages/
│   ├── core/  tipos, cálculos puros, validaciones Zod, formato
│   ├── db/    schema Drizzle (17 tablas) + migraciones SQL
│   ├── sync/  PowerSync (fase siguiente)
│   ├── ui/    primitivas compartidas (fase siguiente)
│   └── config/ presets tsconfig/eslint/prettier
├── docker/    Dockerfiles + docker-compose
└── .github/workflows/ CI
```

## Flujo de datos

```
[Web PWA] ──HTTP/JSON──┐
                       ├─▶ [API Hono] ──Drizzle──▶ [PostgreSQL]
[Mobile (SQLite)] ─────┘                              ▲
        │                                             │
        └──────── PowerSync (Postgres ↔ SQLite) ──────┘
```

- **Multi-tenant**: cada fila lleva `company_id`. La Organización de Clerk
  resuelve la empresa en el middleware `tenant` de la API.
- **Lógica de negocio única**: márgenes, totales de factura, P&L, cuentas
  por cobrar y flujo de caja viven en `@cash-pro/core` y los consumen API,
  web y mobile por igual.
- **Aggregados consistentes**: la API calcula totales/COGS/utilidad con
  `@cash-pro/core` al escribir; `products.profit_per_unit` y `profit_margin`
  son columnas Postgres `GENERATED STORED`.
- **Offline-first**: cada tabla incluye `local_id`, `sync_status`,
  `last_modified_at`, `deleted_at` (soft delete) para reconciliación.
- **Log unificado**: `transactions_log` registra cada evento de dinero/
  inventario (venta, pago, compra, gasto, ajuste).

## Capacidad de migración (objetivo < 1 día)
Cambiar `DATABASE_URL` a otro Postgres y redeployar los contenedores. Auth
(Clerk) y storage (S3-compatible) no cambian. PowerSync tiene edición
self-hostable si se quiere salir del servicio gestionado.
