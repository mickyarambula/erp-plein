# CIERRE E67–E68 — ERP Plein
_Anexo de estado. Adjuntar al chat nuevo junto con los .md históricos. Cuando quieras, funde esto en PLAN-MAESTRO.md / BITACORA-DECISIONES.md._

Fecha de cierre: 2026-07-31

---

## 1. ANCLAS AL CIERRE (⚠️ CxP cambió)

| Ancla | Valor | Cambio |
|---|---|---|
| CxC total | 595,807.09 | sin cambio |
| **CxP total** | **510,595.14** | **+480 vs E66** (3 comisiones reales agregadas) |
| Cuadre | 0.00 | sin cambio |
| seg anon / escritura / auth | 0 / 0 / 0 | sin cambio |
| JPM | 6,875.93 | sin cambio |
| JEAMS | −52,872.00 | sin cambio |
| movs_jpm | 268 | sin cambio |
| folio_max_jpm | 374 | sin cambio |
| aplicaciones | 186 | sin cambio (E69 lo mueve) |
| cargas vivas | 82 | sin cambio |
| flags | 1 (P-089) | sin cambio |
| revenue_models | 4 | sin cambio |
| sales_orders / sales_order_cargas | 0 / 0 | sin cambio (backfill pendiente) |
| evento_tipos / eventos_carga | 5 / 0 | sin cambio |

**El único número que hay que actualizar en los docs históricos es CxP → 510,595.14.**

---

## 2. INFRA NUEVA — Módulo Presencia (E68, en producción)

Backend (Supabase, nace cerrado, sentinelas 0/0/0):
- Tablas `presencia` (actor PK, ultimo_latido, pagina, capturado_ts) y `presencia_log` (append-only: id, actor, ts, pagina). RLS activado, sin SELECT a authenticated.
- RPC `fn_latido(p_actor text, p_pagina text)` — valida actor contra `usuarios_erp`, upsert + log. EXECUTE solo authenticated.
- Vistas `v_presencia_online` (actor, email, ultimo_latido, pagina, segundos_desde, online<60s) y `v_presencia_historial` (por actor/día). SELECT solo authenticated.

Frontend (Claude Code, en prod, `erp-plein-dashboard.vercel.app`):
- `modulo-presencia.js` (nuevo): selector "¿Quién eres?" (localStorage), latido cada 30s con auto-inhibición en pestaña oculta, indicador 🟢 en el header desde `v_presencia_online`.
- Tocados: `index.html` (anclas header + script), `app.js` (init en `sesionActiva()`), `estilos.css` (bloque presencia + regla móvil).

Diseño: usa actor auto-declarado (no `fn_actor()`) porque hoy todos entran como PP04-MA. PARQUEADO: migrar a `fn_actor()` cuando haya login por usuario (adopción de Samuel) y limpiar `presencia_log` (>90 días) en unos meses.

Git: el repo `~/Desktop/erp-plein` quedó bajo control de versiones por primera vez (git init local, sin remoto, .gitignore con node_modules/.vercel/.env). Commit inicial: "Commit inicial: ERP Plein (estado actual en produccion)".

---

## 3. CORRECCIONES DE DATOS (aplicadas, vía V8)

Fuente: `Plein_produce_LLC_V8` (Chase + Cargas). Cotejo por P.O.

- **P-082 (PO PX-72589)**, **P-083 (PO PX-72648)**, **P-084 (PO PX-72650)** — Crystal Valley / Espárrago Orgánico (prov. Pampa Store):
  - Estaban con 1 línea `Otro` (costo del producto mal etiquetado) y les faltaba la comisión.
  - CORREGIDO: `Otro`→`Materia prima` (mismo monto) + agregada línea `Comisión` ($150 / $90 / $240). Vía `fn_editar_costo` + `fn_agregar_costo`. Cuadre 0.00, sentinelas 0/0/0. CxP +$480.
  - EFECTO: ahora son `Materia prima + Comisión` → mismo patrón FRONTERA que P-059/066/074/078.
  - Ojo folio-drift V8↔ERP: PO PX-72589 = P-080 en V8 / P-082 en ERP; PO PX-72650 = P-085 en V8 / P-084 en ERP. Se cotejó por P.O.
- **P-034 (PO 7568, Tierra Selecta, Coco)** — Estado "Rechazo": hubo pago + devolución, neto cero para Plein (wash de entrada/salida). SE DEJÓ sin costo, fuera del backfill. Pendiente menor: revisar que los movs entrada/salida estén bien en tesorería (no urge).

---

## 4. D-50 — split margen_fijo (decisión de socios, PENDIENTE)

Tras las correcciones, el tablero de las 51 margen_fijo vivas quedó:
- **RM-002 (Margin, solo producto): 10**
- **RM-004 (Buy & Resell, con logística): 33**
- **FRONTERA (Materia prima + Comisión): 7** — P-059, P-066, P-074, P-078, **P-082, P-083, P-084**. Estas dependen del A/B de socios.
- REVISAR: 0 · SIN COSTOS: P-034 (wash, fuera).

**La decisión de socios (D-50):** ¿la línea `Comisión` en margen_fijo prorratea (→RM-004) o no (→RM-002)? Mueve exactamente esas 7. Excel entregado: `D-50_split_margen_fijo.xlsx` (regenerar con FRONTERA=7 si se va a junta).

También pendiente socios: `Otros gastos` (concepto fuera del catálogo de 7, en P-022) — ¿fusionar con `Otro` o formalizar?

---

## 5. BACKFILL 82 cargas → Sales Orders (listo, bloqueado por D-50)

Mecanismo: 1 SO por carga. `fn_crear_so(cliente_id, revenue_model_id, customer_po=PO, …)` + `fn_asignar_carga_so(so_folio, carga_folio, cajas)`. `revenue_model_id` en `sales_orders`.

Mapeo:
- comisión (13, Alpine) → RM-001
- consignación (17, sin P-089) → RM-003
- margen_fijo solo producto (10) → RM-002
- margen_fijo con logística (33) → RM-004
- **73 claras listas.** Fuera: 7 FRONTERA (esperan D-50) + P-089 + P-034.

Defaults propuestos: estado `borrador`, precios NULL, cajas = carga.cajas.
Confirmaciones pendientes de Miguel: ¿`pct_comisión = 10%` en las de consignación? ¿incluir P-073/P-075 (revenue-clear pero antes parqueadas por Akambarhu — ya resuelto en E69)?

---

## 6. KABOCHA / AKAMBARHU (diagnóstico cerrado; ejecución = E69)

Movimientos 370 (Akambarhu −$10,000) y 372 (CRI +$8,000): **NO son préstamos** (tipo ya correcto: Proveedor/Cliente). Solo estaban **sin aplicar** a la carga 1001 (P-073). Confirmado contra V8 Chase (comentarios "Adelanto Kabocha carga 1001").

Hallazgo clave: el adelanto ($10,000) es MÁS GRANDE que el costo total de la carga 1001 ($11,462 s/V8). Solo caben:
- 370 → P-073: **$3,250** (completa costo proveedor; faltaban 8,697→11,947). Sobran **$6,750** (anticipo a productor, parkear).
- 372 → P-073: **$7,562** (completa venta liquidada). Sobran **$438** (→ P-075, que tiene $4,312 sin cobrar).

Ejecutar en E69 con ENSAYO + nota explícita para que no vuelva a saltar.

---

## 7. PENDIENTES VIGENTES (dueño)
- **E69 (Claude):** aplicar 370/372 (arriba). Confirmar sobrante con Miguel.
- **D-50 (socios):** A/B de `Comisión` + `Otros gastos`.
- **Backfill 73 (Claude):** tras D-50 + confirmaciones.
- **P-089:** espera liq. CRI + captura de cajas. Ignorar por ahora.
- **Adopción de Samuel** como usuario activo (login propio → habilita presencia por `fn_actor()`).
