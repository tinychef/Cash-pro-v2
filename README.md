<p align="center">
  <img src="https://img.shields.io/badge/Turborepo-monorepo-EF4444?style=for-the-badge&logo=turborepo" />
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/Hono-4-E36002?style=for-the-badge&logo=hono" />
  <img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-336791?style=for-the-badge&logo=postgresql" />
</p>

# 💰 Cash Pro v2

> **ERP migrable, offline-first, con UX tipo Uber/Rappi.** Factura en segundos, controla inventario y costos, y sabe **cuánto ganas realmente** — sin atarte a ningún proveedor cloud.

---

## ✨ Características

| Módulo | Descripción |
|--------|-------------|
| 📊 **Dashboard** | KPIs en tiempo real: ventas del día, utilidad, cuentas por cobrar, flujo de caja neto + gráfico ingresos vs gastos. |
| ⚡ **Facturación rápida** | Factura en <30s con búsqueda de productos y **margen/utilidad en vivo**. Descuenta inventario automáticamente. |
| 📦 **Productos** | Precio de **compra vs venta** separados; margen y ganancia/unidad calculados en la base de datos (columnas GENERATED). Alertas de stock bajo. |
| 👥 **Clientes / Proveedores** | CRUD completo; balance de cuentas por cobrar por cliente. |
| 💳 **Pagos** | Estados automáticos (pendiente → parcial → pagada → vencida) al registrar pagos. |
| 💸 **Gastos** | Registro por categoría que alimenta el P&L y el flujo de caja. |
| 📈 **Reportes** | Estado de resultados (P&L), flujo de efectivo acumulado y márgenes, por rango de fechas. |
| 🧾 **PDF** | Generación de facturas en PDF en el navegador (offline-capable). |
| ⚙️ **Configuración** | Nombre de empresa, moneda e impuesto por defecto. |

## 🏗️ Arquitectura (monorepo Turborepo + pnpm)

```
apps/
  web/    Next.js 14 PWA (TanStack Query + shadcn/ui)
  api/    Hono 4 + Clerk + Drizzle (Dockerizable, Cloud Run-ready)
  mobile/ Expo (fase siguiente)
packages/
  core/   tipos + lógica de negocio pura (márgenes, P&L, totales) + Zod  ·  9 tests
  db/     schema Drizzle (17 tablas) + migraciones SQL puras
  sync/   PowerSync (fase siguiente)
  ui/     primitivas compartidas
  config/ presets tsconfig/eslint/prettier
docker/   api/web Dockerfiles + docker-compose
```

**Principios:** PostgreSQL estándar (portable a Supabase/Cloud SQL/RDS/Neon), auth con Clerk,
storage S3-compatible (R2), un solo paquete de lógica para web/mobile/api, Docker desde el día 1.

## 🛠️ Stack

```
Web        Next.js 16 · React 19 · TypeScript · Tailwind · shadcn/ui · TanStack Query · Recharts · @react-pdf/renderer
API        Hono 4 · Drizzle ORM 0.45 · Clerk · Zod
DB         PostgreSQL 16 (sin features propietarias)
Tooling    Turborepo · pnpm · Vitest · GitHub Actions CI
```

## 🚀 Desarrollo local

```bash
pnpm install

# Opción A — todo con Docker (postgres + api + web)
docker compose -f docker/docker-compose.yml up

# Opción B — manual
#  1) Postgres (docker o local) y aplicar migraciones
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cashpro pnpm --filter @cash-pro/db migrate
#  2) API (modo dev sin Clerk → usa header x-company-id; el front lo gestiona)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cashpro pnpm --filter @cash-pro/api dev
#  3) Web
pnpm --filter @cash-pro/web dev   # http://localhost:3000
```

> En modo dev (sin `CLERK_SECRET_KEY`), la web crea automáticamente una empresa demo con datos
> de ejemplo vía `POST /dev/bootstrap`. Con Clerk configurado, la Organización resuelve la empresa.

## 📜 Scripts (raíz)

| Comando | Descripción |
|---------|-------------|
| `pnpm dev` | Levanta todas las apps (turbo) |
| `pnpm build` | Build de todo el workspace |
| `pnpm typecheck` | Typecheck de todos los paquetes |
| `pnpm test` | Tests (Vitest) |
| `pnpm db:generate` / `pnpm db:migrate` | Migraciones Drizzle |

## 🗺️ Roadmap

- ✅ Monorepo portable · core/db/api · web cableada a API · Docker · CI · PDF
- ⏳ App móvil (Expo) + **offline real** con PowerSync (`packages/sync`)
- ⏳ Compras a proveedores + cuentas por pagar · roles/multi-usuario · facturación fiscal (DIAN/SAT)

Ver `docs/PLAN.md`, `docs/STACK.md`, `docs/ARCHITECTURE.md`, `docs/RISKS.md`.

## 📄 Licencia

MIT © [tinychef](https://github.com/tinychef)
