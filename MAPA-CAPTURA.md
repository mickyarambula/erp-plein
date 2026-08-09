# MAPA-CAPTURA.md — Fuente única de captura y catálogos (ERP Plein)
_Coordina el chat de BACKEND (Supabase) y Claude Code (frontend). Se construye sobre `INVENTARIO-CAPTURA-CATALOGOS.md` (inventario crudo) + el diseño acordado. Última actualización: E104, Fase 1 hecha._

## Para qué sirve
Antes de tocar cualquier captura o catálogo, los dos chats consultan este mapa. Define **qué lista va en qué cajón** (y por lo tanto quién la alimenta), cómo se organiza la captura, y qué huecos faltan. El objetivo: **todo lo rutinario se hace desde el sistema; el motor contable queda protegido.**

---

## La regla — 3 cajones

Toda "lista" que aparece al capturar cae en uno de estos:

### 🟩 Cajón 1 — Catálogos que el usuario alimenta
Regla dura: **cada uno debe tener panel de gestión (alta/edición) Y estar conectado a su picker.**

| Catálogo | Panel de gestión | Conectado al picker | Estado |
|---|---|---|---|
| Contrapartes (cliente/proveedor/socio/gasto) | ✅ Directorio Comercial | ✅ | **Listo** (P1, D-125..128) |
| Cuentas de banco | ✅ Catálogos → Cuentas | ✅ | **Listo** (P2, D-130..132) |
| Conceptos de costo | ✅ Catálogos → Conceptos | ✅ (+Agregar costo en carga) | **Listo** (P2, D-129) |
| Productos | ⚠️ solo alta | ✅ | 🟠 falta EDITAR (Fase 2c) |
| Variedades | ⚠️ solo alta | ✅ | 🟠 falta EDITAR (Fase 2c) |
| **Categorías de gasto** (Sueldo, Viáticos…) | ❌ hardcoded (`TIPOS_GASTO`) | — | 🔴 falta panel (Fase 2b) |
| **Categoría de deducción** (liquidaciones) | ❌ ni tabla (`CATEGORIAS`) | — | 🔴 falta todo (Fase 2a) |

### 🟦 Cajón 2 — Motor contable (protegido, nunca editable en UI)
Cada tipo define cómo pega al balance/P&L. Se gestionan SOLO en backend con GATE+ENSAYO.
- Tipos de movimiento estructurales: **Cliente, Proveedor, Inversión, Anticipo a productor, Financiamiento externo, Pasivo a socio, Traspaso, Comisión, Fletes, Aduanas, Materiales de empaque, Devolución, AJUSTE**.
- Enums de RPC atados a comportamiento contable: **Naturaleza de aportación** (préstamo sin interés / con tasa / custodia), **Origen del fondeo** (propio/socio), **Tipo de movimiento de línea de proyecto**, **Tipo de movimiento de lote** (merma/rts).

> Nota: "Categorías de gasto" (Cajón 1) SON tipos de movimiento del grupo `gasto_operativo/financiero`, pero todas pegan igual al P&L → agregar una nueva es seguro (clona el comportamiento del grupo). Por eso viven en Cajón 1 con un candado que impide crear tipos estructurales.

### ⬜ Cajón 3 — Enums de comportamiento (reglas del sistema; no son catálogo de usuario)
Respaldados por CHECK constraints o config de negocio. Cambiarlos = cambio de programa, no de captura.
- Modalidad de carga (margen_fijo/consignación/comisión), estados de carga (`v_estados_carga`, con catálogo backend) y de Load (hardcoded, sin catálogo), Área/Prioridad/Estado de tarea, Absorbe / Fuente de fondeo / Costo financiero (proyecto), Modalidad/Ingreso base/Frecuencia/Vía/Término (programa), **Revenue Model** (4 modelos sembrados: Fixed Fee, Margin per Box, Margin Consignment, Buy & Resell), Moneda (USD/MXN).

---

## La captura — puerta única "+ Registrar" (Fase 1, HECHA)
En Tesorería, un solo botón **"+ Registrar"** abre "¿Qué vas a registrar?" con intención explícita:
1. **Cobro o pago de una carga** — entra de cliente / sale a proveedor, ligado a embarque (FIFO) → `capturarMovimiento`
2. **Gasto de operación** — sueldo, viáticos, renta… no ligado a carga → `formGasto`
3. **Anticipo a productor** — disposición de línea de proyecto → `capturarAnticipoProductor`
4. **Aportación de socio** — entra capital de socio → `capturarAportacionSocio`
5. **Traspaso entre cuentas** — mover entre JPM y bolsas de socio → `formTraspaso` (`fn_traspaso`)

Atajos directos de Cobranza/CxC y Pagos/CxP (por fila) se conservan aparte.

**Principio transversal:** pickers **contextuales** — muestran solo lo que aplica (ej. "Registrar gasto": tipo Sueldo → solo quien tiene `recibe_pagos`). Aplicar en todo lo que tenga sentido.

---

## Plan de build (fases)

| Fase | Qué | Backend | Frontend | Estado |
|---|---|---|---|---|
| **1** | Puerta "+ Registrar" + Traspaso | `fn_traspaso` saneado (D-133) | router + panel traspaso | ✅ **Hecho** |
| **2a** | Categoría de deducción autoservible | tabla + RPCs + vista | pestaña + Liquidaciones lee la vista | ⏳ siguiente |
| **2b** | Categorías de gasto autoservibles | `fn_alta_categoria_gasto` (clona grupo, con candado) + vista | pestaña + Registrar gasto lee la vista | ⏳ |
| **2c** | Editar productos/variedades | `fn_editar_producto` / `fn_editar_variedad` | botón Editar | ⏳ |
| **3** | Limpieza: moneda centralizada, estado de Load, confirmar seeds (documento/evento/presupuesto) | según toque | según toque | ⏳ |

## Contrato vivo — `fn_traspaso` (Fase 1)
`fn_traspaso(p_origen text, p_destino text, p_monto numeric, p_fecha date, p_nota text=null)` → `(folio_egreso int, folio_ingreso int)`. Permiso `capturar`. Cuadre-neutral (par egreso+ingreso tipo `Traspaso`/neutro). Rechaza misma cuenta y monto ≤ 0. Folios por rango de cuenta.

---
_Mantener este archivo al día conforme se cierran fases. Numeración de decisiones backend: D-### (al cierre de Fase 1: D-133)._
