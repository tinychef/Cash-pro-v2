# Despliegue — Cash Pro v2 (enfoque Cloudflare)

Guía para poner la app en vivo. El stack es **portable** (Postgres estándar, Docker,
S3-compatible), así que estas piezas se pueden mover entre proveedores sin tocar el código.

> El despliegue debe ejecutarse **desde tu cuenta** (login de Cloudflare / proveedor).
> Este repo deja la configuración y el checklist listos.

## Arquitectura recomendada

| Pieza | Recomendación Cloudflare | Por qué |
|---|---|---|
| **Web (Next.js 16)** | **Cloudflare Pages** vía `@opennextjs/cloudflare` | Adaptador soportado para Next en el runtime de Workers. |
| **API (Hono)** | **Contenedor** (Render/Fly/Railway) *ahora*, con ruta a **Workers + Hyperdrive** después | La API usa `@hono/node-server` + `postgres-js`. Como contenedor corre sin cambios; Workers requiere portar la capa de DB (ver abajo). |
| **PostgreSQL** | **Neon** o **Supabase**, accedido por **Hyperdrive** desde Workers | Postgres estándar; Hyperdrive agrega pooling/cache desde el edge. |
| **Almacenamiento** | **R2** (logos, adjuntos — Fase 1) | S3-compatible, sin egress. |
| **Auth** | **Clerk** (Organizations = multi-tenant) | Funciona en cualquier runtime. |

### Honestidad sobre "todo en Cloudflare"
Hono corre nativo en Workers (`export default app`), pero **la capa de datos no es
drop-in**: hoy usa `postgres-js` sobre TCP del runtime de Node. Para Workers hay que:
1. Crear un **Hyperdrive** apuntando al Postgres gestionado.
2. Leer la cadena de conexión desde el binding de Hyperdrive (no `process.env`).
3. Validar `drizzle-orm/postgres-js` sobre `cloudflare:sockets` (o cambiar a un driver
   HTTP como `@neondatabase/serverless`).

Por eso el camino rápido y de bajo riesgo es **Web en Pages + API en contenedor**, y
migrar la API a Workers como mejora posterior. Ambos quedan detrás de Cloudflare.

## Paso a paso (camino rápido)

### 1. Base de datos
```bash
# Crear Postgres en Neon o Supabase y exportar su cadena
export DATABASE_URL="postgresql://USER:PASS@HOST/DB?sslmode=require"
pnpm --filter @cash-pro/db migrate
# (opcional, hardening multi-tenant en DB)
psql "$DATABASE_URL" -f packages/db/rls.sql
```

### 2. API (contenedor)
- Imagen: `docker/api.Dockerfile` (ya existe, runtime tsx/node).
- Variables: `DATABASE_URL`, `CLERK_SECRET_KEY`, `WEB_ORIGIN=https://TU_DOMINIO`, `PORT=8080`.
- Desplegar en Render / Fly / Railway. Anota la URL pública (p. ej. `https://api.tudominio.com`).

### 3. Web (Cloudflare Pages)
```bash
pnpm --filter @cash-pro/web add -D @opennextjs/cloudflare wrangler
# Configura el adaptador OpenNext (genera el worker de Pages)
# Build command:   npx @opennextjs/cloudflare build
# Variables de entorno (Pages → Settings → Environment):
#   NEXT_PUBLIC_API_URL=https://api.tudominio.com
#   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
#   CLERK_SECRET_KEY=sk_live_...
```
Conecta el repo a Pages o despliega con `wrangler pages deploy`.

### 4. Clerk (producción)
- Crea la app en Clerk, activa **Organizations**.
- Apunta los dominios (`https://TU_DOMINIO`) y copia las llaves *live* a Web y API.
- Verifica el flujo: registro → crea organización → la API resuelve la empresa por el token.

### 5. Dominio + verificación
- Dominio propio en Cloudflare (DNS), HTTPS automático.
- Smoke test: `GET https://api.tudominio.com/health` → `{ "status": "ok" }`.
- Crea un producto, una cotización, conviértela en factura, registra un pago.

## Camino "todo Workers" (mejora posterior)
1. `pnpm --filter @cash-pro/api add wrangler -D` + `wrangler.toml` con binding Hyperdrive.
2. Añadir un entrypoint Workers: `export default { fetch: app.fetch }` (Hono ya es compatible).
3. Resolver la conexión desde `env.HYPERDRIVE.connectionString` y crear el `Database` por request.
4. Probar migraciones/consultas contra Hyperdrive; ajustar el driver si hace falta.

## Checklist de secretos
- [ ] `DATABASE_URL` (Neon/Supabase)
- [ ] `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (live)
- [ ] `WEB_ORIGIN` (API) / `NEXT_PUBLIC_API_URL` (Web)
- [ ] R2: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` (Fase 1)
