# MAPA-CAPTURA.md — Fuente única de captura y catálogos (ERP Plein)
_Coordina el chat de BACKEND (Supabase) y Claude Code (frontend). Se construye sobre `INVENTARIO-CAPTURA-CATALOGOS.md` (inventario crudo) + el diseño acordado. Última actualización: E106, **plan completo Fase 1→3 CERRADO**._

## Para qué sirve
Antes de tocar cualquier captura o catálogo, los dos chats consultan este mapa. Define **qué lista va en qué cajón** (y por lo tanto quién la alimenta), cómo se organiza la captura, y qué huecos faltan. El objetivo: **todo lo rutinario se hace desde el sistema; el motor contable queda protegido.**

---

## La regla — 3 cajones

### 🟩 Cajón 1 — Catálogos que el usuario alimenta
Regla dura: **cada uno debe tener panel de gestión (alta/edición) Y estar conectado a su picker.**

| Catálogo | Panel de gestión | Conectado al picker | Estado |
|---|---|---|---|
| Contrapartes (cliente/proveedor/socio/gasto) | ✅ Directorio Comercial | ✅ | **Listo** (P1, D-125..128) |
| Cuentas de banco | ✅ Catálogos → Cuentas | ✅ | **Listo** (P2, D-130..132) |
| Conceptos de costo | ✅ Catálogos → Conceptos | ✅ | **Listo** (P2, D-129) |
| Categoría de deducción (liquidaciones) | ✅ Catálogos → Categorías de deducción | ✅ | **Listo** (Fase 2a, D-134) |
| Categorías de gasto | ✅ Catálogos → Categorías de gasto | ✅ | **Listo** (Fase 2b, D-135) |
| Productos | ✅ alta + editar | ✅ | **Backend listo** (Fase 2c, D-136/137) — front pendiente de correr |
| Variedades | ✅ alta + editar | ✅ | **Backend listo** (Fase 2c, D-136/137) — front pendiente de correr |

**Cajón 1 completo.** Todo lo que el usuario alimenta ya tiene su panel (backend). Falta un solo despliegue de frontend (2c).

### 🟦 Cajón 2 — Motor contable (protegido, nunca editable en UI)
- Tipos de movimiento estructurales: **Cliente, Proveedor, Inversión, Anticipo a productor, Financiamiento externo, Pasivo a socio, Traspaso, Comisión, Fletes, Aduanas, Materiales de empaque, Devolución, AJUSTE**.
- Enums de RPC atados a comportamiento contable: Naturaleza de aportación, Origen del fondeo, Tipo de movimiento de línea de proyecto, Tipo de movimiento de lote.

> Categorías de gasto (Cajón 1) SON tipos de movimiento del grupo `gasto_operativo/financiero`, pero agregar uno nuevo es seguro (clona el comportamiento del grupo, candado impide crear tipos estructurales — D-135).

### ⬜ Cajón 3 — Enums de comportamiento (reglas del sistema; no son catálogo de usuario)
Modalidad de carga, estados de carga/Load, Área/Prioridad/Estado de tarea, Absorbe/Fuente de fondeo, Modalidad/Ingreso base de programa, Revenue Model (4 sembrados), Moneda (ahora `ERP.MONEDAS` centralizado), categorías de documento/evento/presupuesto (confirmadas como CHECK de sistema, Fase 3). **Se quedan como están — confirmado, no son huecos.**

---

## La captura — puerta única "+ Registrar" (Fase 1, HECHA)
En Tesorería, un solo botón **"+ Registrar"** abre "¿Qué vas a registrar?":
1. **Cobro o pago de una carga** → `capturarMovimiento`
2. **Gasto de operación** → `formGasto` (tipo de gasto ahora lee `v_categorias_gasto`, contextual con beneficiario)
3. **Anticipo a productor** → `capturarAnticipoProductor`
4. **Aportación de socio** → `capturarAportacionSocio`
5. **Traspaso entre cuentas** → `formTraspaso` (`fn_traspaso`)

Atajos directos de Cobranza/CxC y Pagos/CxP (por fila) se conservan aparte.

**Principio transversal (aplicado):** pickers contextuales — "Registrar gasto" filtra beneficiario por tipo (Sueldo → solo `recibe_pagos`; Viáticos → mixto; resto → gasto/operativo).

---

## Plan de build — TODO CERRADO

| Fase | Qué | Backend | Frontend | Estado |
|---|---|---|---|---|
| **1** | Puerta "+ Registrar" + Traspaso | `fn_traspaso` saneado (D-133) | router + panel traspaso | ✅ **Hecho y probado** |
| **2a** | Categoría de deducción | tabla + RPCs + vista (D-134) | pestaña + Liquidaciones | ✅ **Hecho y probado** |
| **2b** | Categorías de gasto | `fn_alta_categoria_gasto` + vista (D-135) | pestaña + Registrar gasto | ✅ **Hecho y probado** |
| **2c** | Editar productos/variedades | `fn_editar_producto/variedad` + permisos (D-136/137) | botón Editar | ⏳ backend listo, **falta correr frontend** |
| **3** | Moneda centralizada + seeds confirmados | — | `ERP.MONEDAS` en comun.js | ✅ **Hecho y probado** |

## Contratos vivos (referencia rápida)
- `fn_traspaso(p_origen, p_destino, p_monto, p_fecha, p_nota=null)` → `(folio_egreso, folio_ingreso)`. Permiso `capturar`.
- `fn_alta_categoria_deduccion(p_codigo, p_nombre)` / `fn_editar_categoria_deduccion(p_id, p_nombre=null, p_activo=null, p_orden=null)`.
- `fn_alta_categoria_gasto(p_nombre, p_grupo='gasto_operativo')` / `fn_editar_categoria_gasto(p_tipo, p_activo)`. Candado: `p_grupo` solo `gasto_operativo`/`gasto_financiero`.
- `fn_editar_producto(p_id, p_nombre=null, p_codigo_item=null, p_activo=null)` / `fn_editar_variedad(p_id, p_nombre=null, p_activo=null)`. Permiso `capturar` (unificado, D-137).

## Siguiente (fuera de este plan, ya cerrado)
- **Tema 1** (filtro de cargas por contraparte de servicio) — pendiente, no forma parte de autosuficiencia.
- **Consolidar `fn_alta_producto` duplicada** — parqueado hasta lectura completa del repo.

---
_Numeración de decisiones backend: D-### (al cierre de esta sesión: D-137)._
