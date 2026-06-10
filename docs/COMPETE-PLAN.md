# Cash Pro v2 — Plan para competir y ganar (vs Simple Invoice / Factura Gerente)

> Objetivo: pasar de "base sólida que corre en local" a **producto en vivo que un
> negocio real prefiera sobre Simple Invoice**. Este documento es el veredicto honesto
> del estado actual y el plan de acción por fases para llegar al 100%.

## Veredicto: ¿está listo?

**No al 100% todavía** — pero la base es fuerte y en varios frentes ya es **superior**.

- ✅ **Motor de negocio sólido y probado**: facturación rápida con margen/utilidad en vivo,
  inventario con descuento de stock, clientes/proveedores, pagos con estados automáticos,
  gastos, P&L y flujo de caja, PDF, multi-tenant, RBAC, 0 vulnerabilidades, CI verde.
- ✅ **Diferenciadores que Simple Invoice NO tiene**: costo vs precio de venta →
  **utilidad real**, inventario, compras y cuentas por pagar, contabilidad (P&L),
  portabilidad sin lock-in, español primero (mercado LatAm).
- ❌ **No está desplegado en vivo** — hoy solo corre en local. Sin URL pública no hay
  producto que la gente use. **Este es el bloqueante #1.**
- ❌ **Faltan "table-stakes" de facturación**: el bucle central de Simple Invoice es
  *crear → enviar → cobrar*. Hoy falta: **envío por email**, **link público de la factura**,
  **cotizaciones/presupuestos**, **link de pago online (Stripe)**, **recordatorios de
  vencimiento**, **logo/marca en la factura**, **multi-moneda por factura** y
  **facturas recurrentes**.

**Conclusión:** somos mejores en "saber cuánto ganas" y operación de negocio; perdemos hoy
en "enviar y cobrar fácil" y en estar disponible en vivo. El plan cierra exactamente esos huecos.

---

## Matriz competitiva (estado actual)

| Capacidad | Simple Invoice | Cash Pro hoy | Acción |
|---|:---:|:---:|---|
| Crear factura + PDF | ✅ | ✅ | — |
| Clientes / catálogo de productos | ✅ | ✅ | — |
| Pagos y pagos parciales | ✅ | ✅ | — |
| **Costo vs venta → utilidad real** | ❌ | ✅ | **ventaja** |
| **Inventario + movimientos de stock** | ❌ | ✅ | **ventaja** |
| **Compras / cuentas por pagar** | ❌ | ✅ | **ventaja** |
| **P&L / flujo de caja** | ❌ | ✅ | **ventaja** |
| Cotizaciones/presupuestos → factura | ✅ | ❌ | Fase 1 |
| Enviar por email + link público | ✅ | ❌ | Fase 1 |
| Link de pago online (Stripe) | ✅ | ❌ | Fase 1 |
| Recordatorios de vencimiento | ✅ | ⚠️ (estado overdue, sin envío) | Fase 1 |
| Logo / marca / plantillas | ✅ | ❌ | Fase 1 |
| Multi-moneda por factura | ✅ | ⚠️ (1 moneda global) | Fase 1/2 |
| Descuento e impuesto por línea | ✅ | ⚠️ (verificar nivel línea) | Fase 1 |
| Facturas recurrentes | ✅ | ❌ | Fase 2 |
| Import/Export CSV (migrar desde competencia) | ⚠️ | ❌ | Fase 2 |
| Multi-idioma (ES/EN) | ✅ | ⚠️ (ES) | Fase 2 |
| **Producto en vivo (URL pública)** | ✅ | ❌ | **Fase 0** |
| App móvil + offline | ✅ | ⏳ (base lista) | Fase 4 |

---

## Plan de acción por fases

### Fase 0 — Ponerla en vivo  *(bloqueante; ~0.5–1 día de config)*
Sin esto, nada más importa. Requiere cuentas/keys (las eliges tú).
- [ ] Postgres gestionado (Neon o Supabase) → `DATABASE_URL` + `migrate` + activar `rls.sql`.
- [ ] Desplegar **API** (contenedor `docker/api.Dockerfile`) en Cloud Run / Render / Fly.
- [ ] Desplegar **Web** en Vercel (o contenedor).
- [ ] Configurar **Clerk** producción (Organizations) y validar auth + aislamiento de tenant e2e.
- [ ] Dominio propio + HTTPS + secretos en el proveedor.
- **Hecho cuando:** existe una URL pública donde alguien se registra y factura.

### Fase 1 — "Enviar y cobrar" (paridad con lo esencial de Simple Invoice)  *(~1–2 semanas)*
- [ ] **Almacenamiento de archivos (R2 S3-compatible)** → subir logo de empresa.
- [x] **Marca en factura/PDF**: logo, color de acento, datos fiscales, nota al pie. *(logo inline; migra a R2 con keys)*
- [x] **Link público de factura** (token firmado HMAC) — ver/descargar sin login, payload sin costos/utilidad.
- [ ] **Envío por email** (Resend o Postmark) del PDF + link, detrás de env vars.
- [x] **Cotizaciones/Presupuestos**: módulo completo + **convertir a factura** atómico.
- [ ] **Link de pago online (Stripe Checkout)** + webhook → marca la factura como pagada.
- [ ] **Recordatorios de vencimiento** (email automático a facturas overdue).
- [x] **Descuento a nivel de línea** (aplicado antes del impuesto) · [ ] impuesto por línea editable en UI · [ ] moneda por factura.
- **Hecho cuando:** puedo crear una cotización, convertirla, enviarla por email con mi logo,
  y el cliente paga online y la factura se concilia sola.

### Fase 2 — Diferenciación (donde ganamos)  *(~1–2 semanas)*
- [ ] Empaquetar la narrativa **"conoce tu utilidad real"**: dashboards de margen por
  producto/cliente/periodo (ya tenemos los datos).
- [ ] **Facturas recurrentes / suscripciones**.
- [ ] **Import/Export CSV** (clientes, productos, facturas) para migrar desde la competencia.
- [ ] **Multi-idioma** (i18n ES/EN) y multi-moneda completa.
- **Hecho cuando:** un usuario de Simple Invoice puede importar sus datos en 5 min y ver de
  inmediato algo que su app no le daba: su ganancia real.

### Fase 3 — Pulido de producto y crecimiento  *(~1 semana)*
- [ ] **Onboarding** (wizard + datos demo opcionales) y estados vacíos accionables.
- [ ] **Monetización** (tier gratis + Stripe Billing) si va como SaaS.
- [ ] **Calidad**: tests e2e web (Playwright), accesibilidad, performance, monitoreo (Sentry).
- [ ] PWA instalable pulida.
- **Hecho cuando:** alguien sin contexto se registra, entiende el valor y configura su negocio solo.

### Fase 4 — Móvil + offline real  *(fase siguiente, base ya colocada)*
- [ ] App Expo (Android-first) + **PowerSync** (Postgres↔SQLite) sobre `packages/sync`.
- [ ] Resolución de conflictos y cola offline.

---

## Recomendación de secuencia
1. **Fase 0 primero** (necesito que elijas proveedores y me des las keys) — sin URL en vivo
   no competimos.
2. En paralelo puedo avanzar **Fase 1 en código** sin esperar cuentas (cotizaciones,
   descuentos/impuesto por línea, moneda por factura, scaffolding de email/pago tras env vars,
   subida de logo). Las integraciones externas (Stripe/Resend/R2) se "encienden" con sus keys.
3. Luego Fase 2 para abrir distancia con los diferenciadores, y Fase 3 para pulir y monetizar.
