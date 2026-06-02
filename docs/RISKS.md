# RISKS.md — Cash Pro v2

| # | Riesgo | Impacto | Mitigación |
|---|--------|---------|------------|
| 1 | PowerSync es un servicio gestionado (vs "cero lock-in") | Medio | Usar su **edición self-hostable**; todos los datos viven en Postgres estándar; el sync está aislado en `packages/sync` y es reemplazable sin tocar el schema |
| 2 | Upgrade Next 14 → 16 + React 19 rompe pantallas | Medio | Hacerlo en su propio commit, validar cada ruta; el MVP ya compila bajo Next 14 en el monorepo |
| 3 | Alcance enorme (23 módulos / 4 fases) | Alto | Esta sesión entrega la **base portable + web + API**; mobile/offline/PDF/roles quedan secuenciados |
| 4 | Columnas `GENERATED` no idénticas en todo Postgres | Bajo | Supabase/Cloud SQL/RDS/Neon soportan `GENERATED ... STORED`; verificado en PostgreSQL 16 |
| 5 | `numeric` se serializa como string (postgres-js) | Bajo | La API coacciona a número en reportes; el wiring web hará lo mismo en lectura |
| 6 | Resolución de conflictos offline | Medio (fase mobile) | Last-write-wins por `last_modified_at` + cola; PowerSync provee el motor |
| 7 | Facturación fiscal (DIAN/SAT) fuera de alcance | Bajo ahora | Schema deja espacio; se añade como módulo cuando se requiera legalmente |
| 8 | Costos de servicios gestionados al crecer | Medio | Etapa 2 del plan: migrar web/api a Cloud Run (Docker) y DB a Cloud SQL |

## Estado de verificación (esta entrega)
- `pnpm turbo typecheck` ✅  ·  `pnpm turbo test` ✅ (9 tests core)  ·  `pnpm turbo build` ✅
- API probada end-to-end contra PostgreSQL 16: columnas generadas, totales
  de factura, transiciones de estado por pago, reportes P&L/dashboard. ✅
