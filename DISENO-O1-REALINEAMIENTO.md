# DISEÑO — REALINEAMIENTO DE O1 SOBRE EL CATÁLOGO `cat.*`
### Customer PO + Sales Order · Camino C · ERP Plein
**Estado: PROPUESTA para revisión de Miguel. No se construye nada hasta tu aprobación.**

---

## 1. Objetivo (en una frase)

O1 ya está construido, pero apunta al **catálogo viejo** y trabaja a **nivel producto**.
Este realineamiento lo mueve al **catálogo nuevo `cat.*`**, a **nivel SKU**, con **marca por
línea de pedido** — sin tocar nada de lo que está vivo.

---

## 2. Qué encontró la auditoría (estado actual)

- **O1 sí existe** en el backend: 8 tablas en `op.*`, 11 vistas, 14 RPCs (CPO, Sales Orders,
  Inventario/Lotes, Compras, Costos). **Todo vacío** (0 registros) y **seguro** (seg 0/0/0).
- **El frontend O1 existe**: `modulo-o1-cpo`, `modulo-o1-so`, `modulo-o1-inventario`.
- **El problema — ambos hablan el "idioma viejo":**
  - El Customer PO guarda el cliente como `cliente_id` **integer → `public.contrapartes`** (viejo).
    El frontend lee `v_catalogo_clientes` / `v_catalogo_productos` (viejos).
  - La línea de venta guarda `producto_id` **integer → `public.productos`**, o sea a **nivel
    producto**. **No hay `sku_id` ni `marca`.**
  - No usan `cat.*`, no usan el picker de SKU, no usan `sku_id`.
- **Ventaja:** como todo está vacío, alinearlo es de **bajo riesgo** — cero migración de datos.

---

## 3. Principios que respeta (del documento norte)

1. **Reutilizar, no recrear.** Las tablas de `op.*` vacías **son** el espacio limpio → se
   **alinean**, no se rehacen de cero.
2. **No se elimina nada.** El catálogo viejo y el motor financiero **siguen vivos**; se
   congelan como historia de solo-lectura **después** del go-live.
3. **1 CPO → 1 SO** (versión 1). Estados del SO: Draft → Confirmed → In Progress →
   Partially Sourced → Sourced/Ready.
4. **Sales Type → `revenue_models`** (RM-001 Comisión/Cuota fija · RM-002 Margen por caja ·
   RM-003 Consignación · RM-004 Compra-reventa con costo atribuido).
5. **Disciplina:** GATE + ENSAYO-que-revierte por cada DDL · seguridad 0/0/0 · objetos que
   nacen cerrados · un solo escritor · split backend/frontend.

---

## 4. Cambios de DATOS (tablas y campos)

| Tabla | Hoy | Cambio propuesto |
|---|---|---|
| `op.customer_po.cliente_id` | integer → `public.contrapartes` | **bigint → `cat.contrapartes`** (solo `es_cliente`) |
| `op.so_lineas.producto_id` | integer → `public.productos` (nivel producto) | **reemplazar por `sku_id` bigint → `cat.skus`** (nivel SKU). El producto se deriva del SKU. |
| `op.so_lineas.marca` | *no existe* | **agregar** `marca` text (Plein Produce / Genérica / Private Label, de la lista `marca`) |
| `op.so_lineas.marca_privada` | *no existe* | **agregar** `marca_privada` text (nombre de la marca del cliente, solo si es Private Label) |

Como todo está vacío, las llaves foráneas se re-apuntan directo (sin migrar).

---

## 5. Cambios de RPCs (backend — este chat)

- **`fn_op_cpo_alta`**: `p_cliente_id` integer → **bigint** (valida que sea `es_cliente` en `cat.*`);
  genera el folio interno **CPO-2026-#####** (el número del cliente se guarda aparte, no es el interno).
- **`fn_op_so_crear_desde_cpo`**: las líneas (`p_lineas jsonb`) ahora traen **`sku_id` + cantidad +
  precio + marca (+ marca_privada)**; se insertan en `so_lineas` a nivel SKU.
- **`fn_op_so_confirmar` / `fn_op_so_set_estado`**: sin cambios (operan sobre ids internos).
- **Sugeridores**: la línea del SO usa **`fn_cat_sugerir_sku`** (ya construido). Para el cliente del
  CPO se usa `cat.contrapartes` filtrado por `es_cliente` (vista/pequeño sugeridor de `cat.*`).
  Los sugeridores viejos (`fn_op_sugerir_producto/contraparte`, que leen legacy) quedan en desuso
  para O1.

---

## 6. Cambios de VISTAS

- `v_op_customer_po`: join a `cat.contrapartes` para mostrar el nombre del cliente.
- `v_op_so_lineas`: join a `v_catc_sku_etiqueta` para mostrar la **etiqueta completa del SKU**
  (producto · variedad · empaque · tamaño · calibre · peso) + la marca de la línea.
- `v_op_sales_orders` / `v_op_so_tablero`: el tablero **Required / Allocated / Purchased / Open**
  se calcula a nivel SKU (Allocated y Purchased llegan en O2/O3; en O1 se ve Required/Open).

---

## 7. Frontend (Claude Code)

- **CPO**: elegir cliente desde `cat.contrapartes` (`es_cliente`); quitar `v_catalogo_clientes/productos`.
- **Líneas del SO**: usar **`crearPickerSku`** (ya construido) para elegir el SKU; agregar el
  **selector de marca** (lista `marca`) + campo de marca privada; quitar el nivel producto viejo.
- Leer las vistas `v_op_*` actualizadas.

---

## 8. Orden de trabajo (fases chicas, cada una con checkpoint)

1. **Datos**: re-apuntar `cliente_id` a `cat.contrapartes` + agregar `sku_id`/`marca`/`marca_privada`
   a `so_lineas`. *(DDL · ENSAYO · seg 0/0/0)*
2. **RPCs**: actualizar `fn_op_cpo_alta` + `fn_op_so_crear_desde_cpo`. *(DDL · ENSAYO)*
3. **Vistas**: actualizar `v_op_customer_po` / `v_op_so_lineas` / tablero.
4. **Frontend (Claude Code)**: CPO con cliente `cat.*`, líneas del SO con picker + marca.
5. **Prueba end-to-end**: registrar un CPO real → generar y confirmar su SO → ver tablero Required/Open.

---

## 9. Checkpoint de O1 (cuándo está listo)

Registrar un **Customer PO real** de un cliente de `cat.*`, generar su **Sales Order** con líneas a
**nivel SKU** (elegidas con el picker) + su **marca**, **confirmarlo**, y ver el **tablero
Required/Open**. Con eso O1 cierra y recién ahí se abre O2 (Inventario/Lots/Allocation).

---

## 10. Decisiones que necesito de ti antes de construir

- **(a) Línea a nivel SKU:** ¿reemplazamos `producto_id` por `sku_id` (mi recomendación — la línea
  es la presentación exacta), o quieres mantener ambos?
- **(b) Folio del CPO:** ¿formato **CPO-2026-#####** (año + consecutivo)? ¿el consecutivo reinicia
  cada año?
- **(c) Precio en la línea:** ¿el precio se captura al crear el SO, o queda abierto y se define
  después/por pedido? (el plan dice "el precio se define en cada pedido").
- **(d) Marca por defecto del cliente (Private Label):** ¿agregamos ya un campo de marca por
  defecto en la ficha del cliente (`cat.contrapartes`), o lo dejamos para más adelante?
  (recomiendo: campo opcional ahora, se llena cuando aplique).

---

*Documento de propuesta. Al aprobarse, se registra la decisión (D-XXX) en la bitácora y se
construye por fases con GATE + ENSAYO. Nada se toca hasta tu OK.*
