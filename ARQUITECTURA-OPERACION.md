# ARQUITECTURA-OPERACION.md — El hilo conductor del ERP Plein
_Documento de diseño. Congela el modelo acordado ANTES de tocar código. Última actualización: 2026-08-10 (§8 cerrada — las 4 decisiones abiertas quedaron resueltas). Estado: **MODELO APROBADO — listo para Fase 0**._

> **Regla de oro de este documento:** nada de lo que está aquí se construye hasta que Miguel dé el visto bueno al modelo completo. Este archivo es el acuerdo, no la implementación. La implementación va por fases con GATE+ENSAYO (ver §7).

---

## 1. El problema que resuelve

El ERP se armó por parches alrededor de la tabla `cargas`, que terminó siendo el cajón donde cabe **todo**: proveedor, cliente, PO, producto, embarque, entrega, cajas, modalidad. Consecuencias medibles hoy:

- **No existe un folio interno diseñado a propósito.** Se usa `cargas.folio` (P-XXX) como comodín para todo, aunque nació como "número de embarque".
- **CxP no cuadra entre pantallas.** El Inicio suma por "proveedor de encabezado" (`cargas.proveedor_id`); el módulo Cuentas por Pagar suma por "a quién le debes de verdad" (`carga_costos.contraparte_id`). Como en 32 de 85 cargas la materia prima está asignada a un tercero distinto del encabezado, los dos números no coinciden (diferencia observada: decenas de miles de USD en movimiento bruto).
- **Dos puentes venta↔carga duplicados** (`sales_order_cargas` Y `lote_ventas`) que hacen casi lo mismo.
- **`ordenes_compra` y `sales_orders` existen pero están vacías o son espejos** de la carga — la estructura "correcta" está ahí pero no se usa.
- **La operación real no es 1→1**, pero el ERP obliga a aplastar cada negocio en un registro `carga`. Cuando llega un caso que no encaja (1 compra para varios clientes, varias compras para un pedido), no hay dónde ponerlo → se mete "por la fuerza" en `carga_costos`.

**Caso testigo (real, P-011):** proveedor de encabezado = AGROFEPAC, pero a AGROFEPAC no se le debe nada. La materia prima ($10,871.32) es de Las Brisas Produce; el flete de BBA; la aduana de Suárez. AGROFEPAC quedó como "proveedor" por costumbre. Este es exactamente el bug de CxP, en un solo registro.

---

## 2. Los dos principios que Miguel pidió explícitamente

1. **Un folio manda (la OPERACIÓN, `OP-XXXX`).** Es el único número que el usuario captura, dice por teléfono, pone en los papeles del chofer, y que une TODAS las fases. Los "otros folios" (OC de compra, SO de venta) los genera el sistema solo como sub-etiquetas de la OP — el usuario no los teclea, y si nunca necesita separar compra de venta (caso 1→1), ni los nota.

2. **Herencia, no recaptura.** Cada dato se escribe UNA sola vez, en la fase donde nace. Las fases siguientes lo heredan (pre-llenado). Al avanzar venta→compra→embarque, el sistema ya sabe producto/cajas/cliente y solo pide lo nuevo de esa fase. Esto es lo que hace que "los siguientes pasos se creen prácticamente en automático".

**El PO del proveedor y el customer PO son etiquetas de referencia** (logística, "de quién viene"), nunca la llave que une la operación. La llave siempre es `OP`.

---

## 3. El modelo — cuatro capas colgando de la OP

```
                    OPERACIÓN (OP-XXXX)  ← única llave interna
                    nace al abrir el negocio
                    /                    \
        VENTA(S) (SO)                     COMPRA(S) (OC)
        compromiso comercial              compromiso con proveedor
        genera CxC                        genera CxP
                    \                    /
              EMBARQUE / LOTE (evento físico)
              cajas reales, chofer, flete, papeles
              genera costos logísticos, mueve inventario
                            |
                         DINERO
              CxC de las ventas · CxP de las compras
              se arma solo, cada peso a su contraparte real
```

### 3.1 OPERACIÓN (`operaciones`) — NUEVA
El hilo. Nace primero (casi siempre por la venta, según Miguel). Contiene lo mínimo común: folio interno `OP-XXXX`, estado del ciclo, producto/variedad principal, cajas objetivo, fechas clave, responsable. NO contiene proveedor ni cliente directamente — esos viven en sus capas (una OP puede tener varias ventas y varias compras).

### 3.2 VENTA (`ventas_op`, evoluciona de `sales_orders`) — puerta de entrada
Compromiso comercial: cliente, precio de venta, modalidad de ingreso (margen fijo / consignación / comisión), customer PO (etiqueta), días de crédito, incoterm. Genera el **CxC**. Una OP puede tener 1..N ventas.

### 3.3 COMPRA (`compras_op`, evoluciona de `ordenes_compra`) — a quién le debes
Compromiso con el proveedor: proveedor **real** (a quien SÍ le debes), costo de compra, PO del proveedor (etiqueta), días de crédito. Genera el **CxP de producto**. Una OP puede tener 1..N compras (multi-proveedor deja de ser un hack en `carga_costos`).

### 3.4 EMBARQUE / LOTE (`embarques_op`, evoluciona de `cargas`+`lotes`) — el evento físico
Cuando el producto **existe de verdad**: cajas, pallets, fecha de embarque, chofer, flete, aduana, QC. Genera los **costos logísticos** (cada uno a su proveedor de servicio real: BBA flete, Suárez aduana, etc.) y mueve inventario. Aquí vive la "bola de papeles" (expediente de documentos por embarque, `documentos.entidad='embarque'`). Una venta puede cumplirse en varios embarques; un embarque puede llevar producto de varias ventas — por eso NO se fusiona con la venta, pero cuelga de la misma OP.

### 3.5 Qué pasa con la modalidad (margen fijo / consignación / comisión)
La modalidad es un atributo de la **VENTA**, no de la operación entera, porque define **cuándo se reconoce el ingreso**:
- **margen fijo** → ingreso al embarque (entrega).
- **consignación** → ingreso al COBRO (el cliente liquida después de vender).
- **comisión pura** → Plein no compra (no hay capa COMPRA); ingreso = comisión capturada; costo 0 / margen 100% es correcto.

Esto respeta las reglas de negocio ya existentes sin cambiarlas — solo las coloca en la capa correcta.

---

## 4. Cómo se ve la captura diaria (flujo "por la venta")

1. **Llega el pedido.** Miguel abre "+ Nueva operación" → captura cliente, producto, cajas, precio, modalidad. El sistema crea `OP-0043` + su `VENTA` en un solo paso. (Si hubiera bodega, aquí se revisaría inventario primero.)
2. **Sale a comprar.** Desde la misma OP, botón "Agregar compra": producto y cajas **ya vienen heredados**; solo captura proveedor real + costo. Se crea la `COMPRA`. Puede agregar varias (multi-proveedor) sin hacks.
3. **Manda la OC al proveedor.** Export PDF de la compra (ya con folio OC interno + su PO como etiqueta).
4. **Proveedor confirma.** Cambia estado de la compra a "confirmada".
5. **Se arma el embarque físico.** Botón "Registrar embarque": producto/cantidad **heredados**; captura chofer, fecha, flete, aduana, QC — cada costo a su proveedor de servicio real. Nace el lote (inventario). Se adjuntan papeles al expediente de la OP.
6. **El dinero se arma solo.** CxC de la venta (a Papayas), CxP de cada compra y cada costo logístico (a Las Brisas, BBA, Suárez…). Cada peso a su contraparte real → las pantallas de CxP cuadran por construcción.

**Flujo "por la compra"** (menos común pero existe): igual, pero el paso 1 es "+ Nueva operación → compra primero" y la venta se agrega después. La OP y la herencia funcionan idéntico; solo cambia el orden de captura.

---

## 5. Qué se arregla, honestamente

- **El bug de CxP desaparece de raíz** (no se parcha): "proveedor" siempre significa "a quien le debo". Un proveedor de encabezado fantasma como AGROFEPAC en P-011 deja de existir; el CxP se suma una sola vez, por contraparte real, y las dos pantallas dan el mismo número por construcción.
- **Un solo folio** en todas las fases → se acaba la confusión de folio/PO/lote.
- **Cero recaptura** → menos errores de dedo, capturas más rápidas.
- **Los casos no-1→1 dejan de ser hacks** → multi-venta y multi-compra tienen su lugar natural.
- **Se retira un puente duplicado** (`lote_ventas` vs `sales_order_cargas` → una sola liga vía OP).

## 6. Qué cuesta, honestamente

- **Es la obra grande del ERP, no un parche.** Toca la columna vertebral: 85 cargas vivas, CxC/CxP, y el Cuadre.
- **Cambia la forma de capturar de todo el equipo.** Requiere que Miguel (y quien capture) aprendan el flujo nuevo.
- **La migración de las 85 cargas existentes es la parte delicada.** Hay que convertir cada carga actual en (OP + venta + compra(s) + embarque) sin mover un centavo del Cuadre.
- **No es de un fin de semana.** Va por fases, con red, y con posibilidad de rollback en cada una.

---

## 7. Plan de migración por fases (sin romper lo vivo)

**Criterio invariante en TODAS las fases:** al terminar cada fase, `Cuadre = 0.00`, `seg 0/0/0`, y CxC/CxP **idénticos** a antes de la fase (verificados en lectura fresca no-circular contra `v_anclas`). Si algo se mueve, se detiene y se revierte. Cada fase con GATE+ENSAYO. Modelo recomendado: **Opus 4.8** (riesgo al Cuadre).

### Fase 0 — Andamiaje (sin tocar nada vivo)
Crear la tabla `operaciones` VACÍA y las columnas de enlace (`operacion_id`) en `ventas`, `compras`, `embarques` como **nullable**, sin llenarlas. RLS + REVOKE + GRANT desde el minuto uno. El ERP sigue corriendo 100% sobre el modelo viejo. Reversible con un DROP. **Verificación:** anclas idénticas, cero filas nuevas con efecto.

### Fase 1 — Backfill retroactivo (generar OPs de lo que ya existe)
Por cada carga activa, crear 1 `operacion` y ligar su venta/compra/embarque existentes vía `operacion_id`. Las cargas 1→1 (la mayoría hoy) mapean directo. Los 32 casos con materia prima de tercero se convierten en OP con **compra al proveedor real** (Las Brisas, etc.), corrigiendo el encabezado fantasma. **Este es el paso que más hay que vigilar:** el CxP total NO debe cambiar, solo redistribuirse a la contraparte correcta. ENSAYO que compara CxP por contraparte antes/después, fila por fila.

### Fase 2 — Vistas nuevas leen del modelo OP (frontend aún no cambia)
Crear `v_operacion_*` que exponen la OP con sus capas. El frontend viejo sigue leyendo sus vistas viejas. Se comparan lado a lado (viejo vs nuevo) hasta confirmar que dan lo mismo. **Verificación:** `v_cxp_*` viejo = suma del modelo OP nuevo, al centavo.

### Fase 3 — Frontend migra pantalla por pantalla (Claude Code)
Puerta "+ Nueva operación", luego captura heredada, luego las pantallas de dinero leen del modelo OP. Cada pantalla se corta solo cuando su equivalente nuevo da el mismo número. Sigue el patrón "Operador estilo Silo" ya en curso.

### Fase 4 — Retiro del modelo viejo
Solo cuando TODO el frontend lee del modelo OP y las anclas cuadran por semanas, se retiran `sales_order_cargas`/`lote_ventas` duplicados y se congela `cargas` como tabla histórica (no editable). Nunca se borra dato — se marca inmutable.

---

## 8. Decisiones cerradas (2026-08-10)

- **Numeración OP:** secuencial nueva desde `OP-0001`. Backfill de las 85 cargas en orden de fecha de carga. Se conserva el folio viejo (`P-XXX`) como etiqueta histórica dentro de cada OP (campo `folio_carga_v1`), para no perder trazabilidad con el modelo anterior.

- **Consignación (CxC al cobro):** se modela como **estado de la venta**, no como excepción. La venta en consignación reconoce ingreso al cobro; margen fijo al embarque; comisión al capturar la comisión. La modalidad vive en la capa VENTA (ya estaba así en §3.5) — confirmado.

- **Comisión pura sin compra:** confirmado — una OP puede existir **sin capa de COMPRA** (Plein no compra, solo cobra comisión). Ninguna vista de CxP debe romperse cuando una OP no tiene compras; costo 0 / margen 100% sigue siendo correcto.

- **OP ↔ Proyecto: CONVIVEN, no se reemplazan.** El Proyecto (`proyectos_productor`, ej. PRJ-001 Akambarhu, PRJ-005 Santana) es el "préstamo de temporada": línea de crédito al productor (siembra financiada, Plein recupera margen + préstamo conforme se embarca y el cliente paga). La OP es cada operación individual de compra-venta. Una OP apunta **opcionalmente** a un `proyecto_id`: cuando pertenece a un proyecto, su embarque/cobro amortiza el préstamo de ese proyecto automáticamente (vía el mecanismo de amortización ya existente: `proyecto_amortizaciones` / `fn_registrar_amortizacion`). El modelo de préstamo **no se rehace** — la OP solo se cuelga de él. Esto refleja la operación real descrita por Miguel: _"son préstamos para que siembren con la condición de que nos entreguen todo, y nos vamos cobrando el margen + el préstamo conforme embarcamos y los clientes pagan"_.

---

## 9. Estado y siguiente paso

**Estado: MODELO APROBADO — listo para Fase 0.** Modelo conceptual aprobado por Miguel (sesión 2026-08-10, con ejemplo real P-011); las 4 decisiones de §8 quedaron cerradas ese mismo día.

**Próximo paso: GATE de Fase 0** (tabla `operaciones` vacía + columnas `operacion_id` nullable, reversible, anclas idénticas). Modelo recomendado: **Opus 4.8**.

_Numeración de decisiones backend en curso: última D-139. La primera decisión de esta arquitectura será D-140 (creación de tabla `operaciones`, Fase 0), cuando se apruebe._

---

## 10. CAMINO C · Fase O1 — Customer PO + Sales Order (2026-08-13, D-160/161/162)

El reinicio operativo "Camino C" (ver `PLAN-REINICIO-OPERATIVO-CAMINO-C.md`) arranca el Order-to-Cash reconstruido en un **namespace `op` nuevo**, aislado del histórico. **O1** entrega las dos primeras entidades y sus pantallas.

**Entidades (esquema `op`, cerrado fuera del API — D-160):** `op.customer_po`, `op.operaciones`, `op.sales_orders`, `op.so_lineas`. El esquema NO expone `USAGE` a `authenticated`/`anon` ni entra a `PGRST_DB_SCHEMAS`.

**Superficie pública (lo único que el frontend toca):**
- **Vistas (`public`, lectura):** `v_op_customer_po`, `v_op_sales_orders`, `v_op_so_lineas`, `v_op_so_tablero`.
- **RPCs (`public`, `SECURITY DEFINER`, escritura, capacidad `capturar`):** `fn_op_cpo_alta`, `fn_op_so_crear_desde_cpo`, `fn_op_so_confirmar`, `fn_op_so_set_estado`.

**Reglas de grain / folios:**
- La **OP nace con el Sales Order** (dentro de `fn_op_so_crear_desde_cpo`), no con el CPO — un CPO cancelado no deja OP huérfana (D-161). Grain **1 OP / 1 SO** en v1; se revisa en O3 con el fan-out multi-SO/PO. `op.operaciones` sin columna `modalidad` (el Sales Type vive en el SO).
- **Folios por secuencias** `op.fn_next_folio` (D-162): `CPO-2026-#####`, `SO-2026-#####`, `OP-2026-#####`, numérico continuo, año = etiqueta, independiente de `OP-0001…0088`. Adjunto del CPO = **referencia a Storage** (texto), no archivo en tabla.

**Frontend (E121, solo frontend):** `modulo-o1-cpo.js` (pantalla Customer PO, scope `.pantalla-o1-cpo`) y `modulo-o1-so.js` (pantalla Sales Orders + tablero Required/Allocated/Purchased/Open, scope `.pantalla-o1-so`), agrupados en un MARCO nuevo **"Camino C"** (riel `ti-route`). Allocated/Purchased se muestran en 0 y en gris ("llegan en O2/O3"). Detalle fino en `REPORTE-FRONTEND.md` (E121).

**Estado O1:** entregado a Miguel para prueba de aceptación (DoD: registrar un Customer PO real → generar y confirmar su Sales Order → verificar que se creó la OP y que el CPO pasó a "Convertido" → tablero con Required = Open).
