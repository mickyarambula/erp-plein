# BITÁCORA DE DECISIONES — ERP Plein

> **Para qué sirve este archivo.** La base de datos ya guarda *qué* cambió (log de
> `apply_migration` + tabla `bitacora_ediciones`). Lo que NO guarda es **por qué**, y ese
> criterio hoy vive únicamente en las conversaciones de backend. Si se pierde el hilo, se
> pierde el razonamiento y la siguiente sesión repite errores ya resueltos.
>
> **Regla:** al cerrar cada sesión de backend se agrega una entrada arriba. Nunca se borra
> ni se reescribe una entrada anterior; si una decisión se revierte, se escribe una entrada
> nueva que lo diga y que explique por qué cambió el criterio.
>
> Vive en la raíz de `~/Desktop/erp-plein`, junto a `PLAN-MAESTRO.md`, `CLAUDE.md` y
> `REPORTE-FRONTEND.md`.

---

## Índice de decisiones vigentes

| # | Decisión | Sesión | Estado |
|---|---|---|---|
| D-01 | El banco manda: Banco > V7 > ERP | E27 | Vigente |
| D-02 | JEAMS es préstamo de socio (pasivo), no capital | E15 | Vigente |
| D-03 | El cartón SÍ es costo | E39 | Vigente |
| D-04 | Consignación: no hay precio de venta hasta que el cliente liquida | E39 | Vigente |
| D-05 | El cuadre del balance debe ser 0.00 SIEMPRE | E37 | Vigente |
| D-06 | Meses cerrados son inmutables, con excepciones acotadas | E36 / E44 | Vigente |
| D-07 | Escritura solo por RPC `SECURITY DEFINER` | E43 | Vigente |
| D-08 | Fechas operativas por `fn_hoy()`, nunca `CURRENT_DATE` | E43 | Vigente |
| D-09 | Cotejar por P.O., nunca por folio | E43 | Vigente |
| D-10 | Existe una tercera modalidad: comisión pura | E44 | Vigente |
| D-11 | El ingreso de consignación declarado y no cobrado es un pasivo | E44 | Vigente |
| D-12 | Crystal Valley abona a cuenta → el FIFO ciego es correcto | E44 | Vigente |
| D-13 | Los anticipos a productores son activo recuperable en el balance | E44 | Vigente |
| D-14 | La línea de proyecto se registra aunque no haya crédito formal | E44 | Vigente |
| D-15 | El plan de flujo marca quién desembolsa cada renglón (plein/santana) | E44 | Vigente |
| D-16 | Plan de flujo y presupuesto son tablas distintas a propósito (Opción B) | E46 | Vigente |
| D-17 | Días de pago se miden desde `f_embarque`; gap = prom − contratado | E46 | Vigente |
| D-18 | PRJ-005 re-sembrado con modelo "3 contratos" (single-layer) | E46 | Vigente |
| D-19 | Dinero de bolsa de un socio = cuenta virtual + Pasivo, nunca JPM | E46 | Vigente |
| D-20 | El gap de Papayas & More NO es morosidad: es artefacto del trueque | E47 | Vigente |
| D-21 | Catálogo `programas_comerciales`: código = llave, `etiqueta` = identidad | E47 | Vigente |
| D-22 | `cargas.programa_id` no contable; match determinista, nunca por folio | E47 | Vigente |
| D-23 | El back-to-back tiene línea propia de Pasivo, separada de JEAMS | E47 | Vigente |
| D-24 | El TC de los 77,000 MXN de Samuel es 4,400.00 USD exactos (el banco manda) | E47 | Vigente |
| D-25 | Costo de banco sin carga identificada = tipo Proveedor, sin aplicar | E47 | Vigente |
| D-26 | Costatropical Papayas Inc (81) ≠ Papayas & More (40) | E47 | Vigente |
| D-27 | El proveedor de Alpine (coles) es Agrícola Omega (7), NO Paumar | E47 | Vigente |
| D-28 | Cobro/pago sin carga específica = abono a cuenta, aplicado FIFO | E47 | Vigente |
| D-29 | folio ERP ≠ id_v7: secuencias distintas, cotejar por P.O./id_v7 | E47 | Vigente |
| D-30 | AGROFEPAC (4) = Las Brisas Produce (67): fusión ejecutada, completa D-29 | E48 | Vigente |
| D-31 | `fn_aplicar_a_carga` con gate EDITAR (no capturar) | E48 | Vigente |
| D-32 | Dinero de José/JEAMS: dos cubetas distintas, ninguna es ingreso | E48 | Vigente |
| D-33 | Neutro sin par = ajuste bancario reconocido, línea propia | E49 | Vigente |
| D-34 | Liquidación de consignación independiente del estado logístico | E49 | Vigente |
| D-35 | La variedad se separa del nombre del producto | E54 | Vigente |
| D-36 | Las Brisas (67) = AGROFEPAC (4) también por RFC de persona física | E54 | Vigente |
| D-37 | Espárrago es 1 producto con variedades Convencional/Orgánico | E54 | Vigente |
| D-38 | Presentaciones: calibre flexible (tipo+valor texto) + marca/reempaque | E54 | Vigente |
| D-39 | Documentos oficiales leen de `v_documento_*`, no arman dirección a mano | E54 | Vigente |
| D-40 | Número oficial de OC/Quote se gana al enviar, serie anual (espejo de factura) | E55 | Vigente |
| D-41 | Espárrago orgánico y convencional son PRODUCTOS SEPARADOS (revierte D-37) | E55 | Vigente |
| D-42 | Trueque Papayas & More: 3 relaciones, Opción B, diferencial informativo | E56 | Vigente |
| D-43 | CxP por proveedor real — re-atribución en lectura (RESUELTA) | E56 | Vigente |
| D-44 | Variedad = cultivar botánico; color/calibre/grado/orgánico son de presentación | E57 | Vigente |
| D-45 | Modelo de Dos Ejes: Sales Order manda lo comercial, Lote manda el costeo | E57 | Vigente |
| D-46 | No reconstruir: poblar el esqueleto que ya existe (Plan A→B→C→D) | E57 | Vigente |
| D-47 | Excepción acotada en `fn_chk_periodo_cerrado` para `contraparte_id` | E59 | Vigente |
| D-48 | Alta de contraparte: Succar Farms (comisionista) | E60 | Vigente |
| D-49 | El "cajón de sastre" de AGROFEPAC: `proveedor_id` histórico incorrecto | E60 | Vigente |
| D-50 | Spec de socios "Revenue Models" = sub-bloque C.0; cada SO lleva Revenue Model obligatorio | E62 | Vigente |
| D-51 | Candado de seguridad: variedades/presentaciones/documento_serie cerradas (seg_auth=0) | E62 | Vigente |
| D-52 | Sincronización V8→ERP: 2 cargas nuevas + 6 movs; el banco manda sobre el V8 | E62 | Vigente |
| D-53 | Cierre honesto de líneas de costo residuales (228/253) y alias en vista CxP | E62 | Vigente |
| D-54 | Sales Order = documento padre; params del modelo como columnas; sin líneas propias | E65 | Vigente |
| D-55 | Numeración del SO: folio interno `SO-####` desde `parametros`, no `documento_serie` | E65 | Vigente |
| D-56 | Eventos de Carga (C.1b): bitácora tipificada append-only que registra, no ejecuta; el dinero se referencia por id | E66 | Vigente |
| D-57 | Módulo Presencia: actor auto-declarado (no fn_actor); objetos nacen cerrados | E68 | Vigente |
| D-58 | Corrección V8 P-082/083/084 (Otro→Materia prima + comisión, CxP +480); P-034 Rechazo = wash | E68 | Vigente |
| D-59 | Kabocha 370/372 no son préstamo, sólo sin aplicar; el adelanto excede el costo de la carga (anticipo a productor) | E69 | Vigente |
| D-60 | Backfill 73 cargas claras → 73 SO Borrador; FRONTERA = Materia prima + Comisión SIN logística; pct_comision=10 en consignación (RM-003) | E70 | Vigente |
| D-61 | Reconciliación V8 Fase 1 (Chase, 7 movs 375-381) + Fase 2 (conceptos): JPM→15,989.29, 0 cargas nuevas | E71 | Vigente |
| D-62 | Reconciliación V8 Fase 3 (montos): única corrección P-076; V8 CERRADA (captura directa Miguel en adelante) | E72 | Vigente |
| D-63 | Rumbo C.2: el LOTE es el eje de compra (no OC ni Carga); enlace Lote↔Orden de Venta con cantidades | E72 | Vigente |
| D-64 | Fase C.2 construida: entidad LOTE (eje de compra) + reparto Lote↔OV + rentabilidad por lote; dinero intacto | E73 | Vigente |
| D-65 | Re-ancla de costos: `carga_costos.lote_folio` reemplaza el puente como fuente de costo en las 3 vistas (alcance solo-costo); trigger + índice UNIQUE parcial; 0 discrepancias | E74 | Vigente |
| D-66 | Pricing (A1+B+C): `lote_ventas.precio_caja` + quitar UNIQUE(lote,SO)=multi-tranche; v_lote_rentabilidad revenue/utilidad del lote por formula_tipo; RPCs re-firmadas (fn_desasignar_venta_lote(p_id)); P&L a nivel lote; número-preservador | E74 | Vigente |
| D-67 | Fase C.2 · Estados de inventario por lote (estilo Silo Reconcile): tabla `lote_movimientos` (`merma|rts`, guard `Σ(vendido+merma+rts) ≤ cajas`, soft-delete) + `v_lote_inventario` (total/sold/waste/rts/on_hand/ats) + RPCs `fn_registrar_mov_lote` / `fn_anular_mov_lote`. MONEY-NEUTRAL (no toca CxC/CxP/Cuadre); número-preservador (0 discrepancias vs cajas_disponibles). `tipo` sin `ajuste`; una RPC parametrizada | E75 | Vigente |
| D-67b | `v_lote_movimientos` (vista detalle merma/rts por lote, GRANT authenticated) — habilita listar + anular por `id` en el frontend. Frontend "Inventario del lote" + ripple D-66 desplegados en `modulo-lotes.js` (gate de "Quitar" corregido a `editar`) | E75 | Vigente |
| D-68 | Auto-espejo de LOTE al alta de carga (peldaño 1 Dos Ejes): trigger AFTER INSERT `tg_cargas_crear_lote_espejo` crea `lotes`+`lote_items` base 1:1 con NEW.lote. Cierra frontera D-65. Money-neutral; biyección `ux_lotes_carga_folio` preservada; SET search_path + REVOKE PUBLIC/anon (advisor 0 menciones) | E76 | Vigente |
| D-69 | Factura-desde-SO (Fase C, aditivo end-state): `facturas.so_folio` (FK sales_orders) + `carga_folio` nullable + CHECK `facturas_ancla_chk`; RPC `fn_crear_factura_desde_so(p_so_folio,p_numero)` arma líneas desde `lote_ventas.precio_caja` (canónico D-66), bloquea `pct_venta`/`comision_por_caja`, exige SO Confirmada/Cerrada; `v_facturas` INNER→LEFT + `po`=COALESCE(carga,SO) + so_folio (18 cols). Ruta carga intacta. Documental, money-neutral | E76 | Vigente |
| D-70 | Liquidación al productor auto-poblada (Fase C): RPC `fn_crear_liquidacion_auto(productor,cargas[],comision_pct?,nota?)` computa bruto=Σ `cargas.ingreso_venta` y auto-pobla `liquidacion_ventas` desde la venta real; reusa `fn_crear_liquidacion` (comisión 10% default, deducciones auto excl. Materia prima+Comisión, anticipos=materia prima) + `fn_recalc`. Guard: consignación + ya liquidada + del productor. Money-neutral | E76 | Vigente |
| D-71 | Shipping / Embarque físico (Load) (Fase C): entidad logística que agrupa 1+ cargas (consolidación-ready) MX→USA. Tablas `loads`/`load_cargas`/`load_serie` (cerradas, folio `LD-YYYY-####`), campos logísticos TODOS opcionales; RPCs `fn_crear_load(+cargas[])`/`fn_asignar_carga_load`/`fn_desasignar_carga_load`/`fn_editar_load`/`fn_anular_load`; vistas `v_loads`/`v_load_cargas`; documentos entidad extendida a `load`. Money-neutral (flete sigue en carga_costos). Respaldo: investigación industria produce MX→USA + V8 no captura logística hoy | E76 | Vigente |
| D-82 | Flip venta→eje-SO: CxC y P&L reconocidos en el eje-SO (money-neutral) | E82 | Vigente |
| D-82b | Detector v_venta_ejes compara contra v_ingreso_reconocido (RM-001 cuota fija) | E82 | Vigente |
| D-83 | Vistas read-only relación programa↔cliente↔productor + bandera consistencia | E83 | Vigente |
| D-83b | Vista read-only de recencia por contraparte (última operación) | E83 | Vigente |

---
## E70 — 2026-07-31 · Backfill 73 cargas → Sales Orders

### D-60 (E70). Backfill 73 cargas claras → 73 SO Borrador; regla FRONTERA; pct_comision=10 en consignación

**Qué se decidió.** Se crearon **73 Sales Orders** (SO-0001..SO-0073), **1 SO por carga**, todas en estado **Borrador**, vía `fn_crear_so` + `fn_asignar_carga_so` (cajas_asignadas = carga.cajas, precio NULL). Mapeo por modalidad/costos: **RM-001** comisión = 13 (Alpine), **RM-003** consignación = 17 (incluye P-073/P-075, ya resueltas en E69), **RM-002** margen puro = 10, **RM-004** buy&resell = 33. En las 17 de consignación se fijó **`pct_comision = 10`** (regla firme: Plein siempre 10% del gross). Fuera del backfill: las **7 FRONTERA** (P-059/066/074/078/082/083/084, esperan D-50), **P-089** (flag) y **P-034** (wash). Total 82 ✓.

**Regla de clasificación (la que hay que recordar).** Una `margen_fijo` es **FRONTERA** (ambigua RM-002 vs RM-004, la decide D-50) **sólo si** tiene líneas `Materia prima` + `Comisión` y **NADA de logística**. Si además trae flete/aduana/etc. es **RM-004 clara** (buy&resell). Sólo `Materia prima` sin comisión → **RM-002**. Un primer intento marcó como FRONTERA a toda margen_fijo con línea `Comisión` y dio 33 (invertido con RM-004=7); **validar siempre los conteos contra el tablero E68 (13/10/17/33 + 7)** antes de escribir.

**Por qué esta solución y no otra.** El backfill de las 73 claras es **independiente de D-50** (D-50 sólo mueve las 7 FRONTERA), así que no había razón para esperar a socios. Se crean en Borrador con params NULL (salvo pct_comision) porque `tg_valida_so_params` sólo exige los params del modelo al **Confirmar/Cerrar**, no en Borrador — el layer comercial queda sembrado sin forzar precios que aún no se capturan.

**Consecuencia operativa permanente.** Toda carga clara ya tiene su SO. Los SO **no tocan contabilidad** (CxC/CxP/Cuadre intactos: la creación de SO no mueve anclas de dinero). Al **confirmar** un SO, `tg_valida_so_params` exigirá los params de su modelo (comision_por_caja / pct_comision / precios). Las 7 FRONTERA siguen sin SO hasta D-50.

---

## E69 — 2026-07-31 · Kabocha 370/372 aplicados (ejecución de D-59)

**Qué se ejecutó.** Se aplicaron los dos movimientos que estaban **sin aplicar** (no eran préstamo — ver D-59) a las cargas Kabocha: **mov 370** (Akambarhu −10,000, adelanto) → **3,250 a P-073** (completa el costo proveedor: el flete pendiente; pagado 8,697 → 11,947 = costo total); **mov 372** (CRI +8,000) → **7,562 a P-073** (completa la venta liquidada) **+ 438 a P-075** (remanente CRI, deja 372 consumido al 100%). El **sobrante de 370 ($6,750)** quedó **PARKEADO sin aplicar** como *anticipo a productor Akambarhu*, con nota explícita en el movimiento para que no vuelva a saltar como "sin aplicar", hasta que se capture **PO 1003 / P-089**.

**Efecto en anclas.** CxC 595,807.09 → **587,807.09** (−8,000, cobros aplicados) · CxP 510,595.14 → **507,345.14** (−3,250, pago aplicado) · aplicaciones 186 → **189** · Cuadre **0.00** intacto · seg 0/0/0. Los tres montos calzaron **exactos** en los topes del trigger `chk_aplicacion` (guardas de sobre-cobro/sobre-pago ±0.005). Resultado: P-073 queda proveedor y cliente al 100% (lista para liquidar consignación cuando toque); P-075 con 438 cobrado de 4,312 (falta 3,874).

**Nota de reconciliación.** Esto cierra las viejas hipótesis TAR-0001/0003 sobre movs "Adelanto Kabocha": el adelanto de Akambarhu es más grande que el costo de la carga 1001, y el remanente es anticipo a productor, no préstamo PRJ-001.

---

## E65 — 2026-07-31 · C.1 Orden de Venta (sales_orders)

### D-54 (E65). Sales Order = documento padre; params del modelo como columnas; sin líneas propias

**Qué se decidió.** La Orden de Venta (`sales_orders`) se construye como el **documento padre** del
flujo comercial, con un **Revenue Model obligatorio** (FK a `revenue_models`). Los parámetros
económicos de cada modelo se guardan como **columnas nullables** en la propia tabla
(`comision_por_caja`, `pct_comision`, `precio_compra_caja`, `precio_venta_caja`), validadas por
trigger según el `formula_tipo` del modelo. El SO **no tiene líneas de producto propias**: sus
"líneas" son las asignaciones a embarques en la capa m:n `sales_order_cargas` (`cajas_asignadas` =
Cantidad Asignada de ERP_1), que cubre los tres escenarios E1 (1 SO–1 SPO), E2 (1 SO–N proveedores)
y E3 (1 carga repartida entre varios SO).

**Por qué.** Los tres docs de socios (ERP_1 relación SO↔Supplier PO, ERP_2 Revenue Models, ERP_PP
order-to-cash) coinciden en que el SO es el documento interno central del que cuelga todo lo demás.
Al leer los datos reales, las ligas 1:1 tentativas (`cotizaciones.carga_folio`,
`ordenes_compra.carga_folio`) estaban **vacías** (0 filas), así que el SO nace como padre sin migrar
nada existente.

**Por qué esta solución y no otra.**
- *Params como columnas* (vs. tabla key-value o JSON): con solo 4 modelos y campos numéricos
  simples, columnas nullables + validación por trigger son más legibles, indexables y fáciles de
  calcular en vistas que un EAV o JSONB.
- *Sin líneas propias* (vs. `sales_order_items`): la reconciliación "pedida vs. surtida" NO es
  requisito central en los docs (backorder es solo un estatus en ERP_PP, no una conciliación de
  cantidades). Las cajas ya viven en `cargas`; duplicarlas en items crea una segunda fuente de
  verdad. `sales_order_items` queda documentado como capa opcional futura.
- *SO como padre* (vs. colgar de carga/cotización): un embarque puede repartirse entre clientes
  (E3) y un SO puede abarcar varios embarques (E2); solo un documento padre m:n modela eso.

**Consecuencia operativa permanente.** Toda venta se ancla en un SO. Las cajas de un embarque se
reparten vía `fn_asignar_carga_so` con guard de sobre-asignación (Σ cajas_asignadas ≤ cargas.cajas).
La utilidad de cada SO se derivará de su Revenue Model, no de un precio capturado a mano.

### D-55 (E65). Numeración del Sales Order: folio interno `SO-####` desde `parametros`

**Qué se decidió.** El folio del SO es **interno**, formato `SO-####`, generado al crear desde el
contador `parametros.folio_max_sales_order` (clona la convención de `OC-####`). **No** usa
`documento_serie` ni lleva año en el folio. El SO no tiene número oficial separado.

**Por qué.** La convención del ERP separa dos identificadores: (a) **folio interno de trabajo**
—desde `parametros`, sin año, asignado al crear— y (b) **número oficial enviado** —desde
`documento_serie`, con año, que se *gana al enviar* (PO-AAAA-####, QT-AAAA-####, ver D-40). El SO es
un documento **interno que nunca se envía al cliente** (ERP_PP) → le corresponde un folio interno,
no un número oficial.

**Por qué esta solución y no otra.** Usar `documento_serie` con año (SO-AAAA-####) —la redacción que
se manejó tentativamente al inicio— obligaba a extender la función compartida
`fn_siguiente_numero_doc` (mayor radio de impacto sobre OC/Quote) y sobrecargaba la semántica de
"número oficial enviado" en un documento que no se envía. El contador en `parametros` es la ruta de
menor riesgo y coherente con la convención ya establecida. El año queda registrado en `capturado_ts`.

**Consecuencia operativa permanente.** Los SO se numeran SO-0001, SO-0002, … de corrido, sin
reinicio anual. `documento_serie` se reserva exclusivamente para números oficiales que se envían
(PO/QT).

**Trampa de implementación confirmada (E65).** En RPCs con `RETURNS TABLE`, las columnas de salida
(`folio`, `estado`, `so_folio`, `carga_folio`, `cajas_asignadas`, `anulado`) **sombrean** columnas
de tabla del mismo nombre y disparan `42702 column reference ... is ambiguous`. Regla: **calificar
toda columna de tabla** (aliasear: `s.folio`, `soc.cajas_asignadas`) en SELECT/UPDATE/DELETE/WHERE,
igual que ya lo hace `fn_cambiar_estado_orden`.

> **Nota de numeración.** E63 y E64 no dejaron entradas en esta bitácora (el archivo salta de E62 a
> E65). Por eso las decisiones de E65 toman los números **D-54 y D-55**, los siguientes disponibles.
> Si más adelante se documentan decisiones de E63/E64 desde sus transcripts, se agregarán con los
> números disponibles en ese momento (append-only: el número sigue el orden de escritura, no el de
> sesión).

---

## E67–E68 — 2026-07-31 · Análisis D-50, módulo Presencia, corrección V8, diagnóstico Kabocha

### D-59 (E68→E69). Kabocha/Akambarhu 370-372: no son préstamo, sólo estaban sin aplicar
Los movimientos 370 (Akambarhu −$10,000) y 372 (CRI +$8,000) tienen el `tipo` correcto (Proveedor/Cliente) desde antes; **NO son préstamo**. El único pendiente era que quedaron SIN APLICAR a la carga 1001 (P-073). Confirmado contra V8 Chase (comentarios "Adelanto Kabocha carga 1001"). **Hallazgo que explica por qué rebotaba en cada chat:** el adelanto ($10,000) es mayor que el costo total de la carga 1001 ($11,462 s/V8 Cargas) → sólo caben $3,250 en P-073 (completa costo proveedor: pagado 8,697 de 11,947) y $7,562 del lado cliente (venta liquidada); el resto ($6,750 y $438) es adelanto que corre por delante de lo liquidado (anticipo a productor / remanente a P-075). Ejecución en E69: aplicar lo que cabe con `fn_aplicar_a_carga` + parkear el sobrante, con nota explícita para que no vuelva a saltar. **Regla reforzada:** si un movimiento es préstamo del proyecto, el comentario/tipo lo dice; si dice "carga X", va aplicado a la carga.

### D-58 (E68). Corrección de datos vía V8: P-082/083/084 y P-034
Con el V8 (Chase + Cargas) como fuente y cotejando por P.O.: P-082/083/084 (Crystal Valley/espárrago, prov. Pampa Store) tenían el costo del producto mal etiquetado como `Otro` y sin la comisión. Corregido con `fn_editar_costo` (`Otro`→`Materia prima`, mismo monto) + `fn_agregar_costo` (`Comisión` $150/$90/$240). Cuadre 0.00, sentinelas 0/0/0, **CxP +$480 → 510,595.14** (costo real que faltaba). Efecto: pasan a `Materia prima + Comisión` = patrón FRONTERA → la decisión D-50 ahora mueve **7** cargas, no 4; REVISAR queda en 0. **P-034** (PO 7568, "Rechazo"): pago + devolución, neto cero (wash); se deja sin costo y fuera del backfill. Folio-drift V8↔ERP en 2 de ellas (se cotejó por P.O., nunca por folio).

### D-57 (E68). Módulo Presencia / En línea
Saber quién está conectado al ERP (como el Drive). Diseño: actor **auto-declarado** desde el frontend (selector "¿Quién eres?" + localStorage), **NO** `fn_actor()`, porque hoy todos entran con la sesión compartida de PP04-MA (todas las capturas salen PP04-MA). Backend nace cerrado (RLS + sin SELECT a authenticated; `fn_latido` sin EXECUTE a anon): tablas `presencia`/`presencia_log`, RPC `fn_latido`, vistas `v_presencia_online`/`v_presencia_historial`. Frontend `modulo-presencia.js` en prod. Parqueado: migrar a `fn_actor()` cuando haya login por usuario (adopción de Samuel); limpiar `presencia_log` (>90 días). El repo quedó bajo git por primera vez (local, sin remoto).

### E67 (read-only). Análisis para el GATE de socios D-50
Sin escrituras. Se analizaron las 51 cargas margen_fijo vivas para el split RM-002 (Margin, sólo producto) vs RM-004 (Buy & Resell, con logística prorrateable). Resultado en Excel `D-50_split_margen_fijo.xlsx`. La línea `Comisión` es el único punto gris (decisión de socios). Tras la corrección D-58 el tablero queda: 10 RM-002 · 33 RM-004 · 7 FRONTERA (P-059/066/074/078/082/083/084) · P-034 fuera (wash). Backfill de las 73 claras listo, bloqueado por D-50.

---

## E62 — 2026-07-30 · Candado de seguridad, sync V8, cierre de residuales, Revenue Models

### D-56 (E66). Eventos de Carga (C.1b): bitácora tipificada que REGISTRA, no ejecuta

**Qué se decidió.** `eventos_carga` es un log append-only, tipificado por catálogo (`evento_tipos`,
5 tipos: EV-RECHAZO / EV-REEMPAQUE / EV-AJUSTE_PRECIO / EV-REEMBOLSO / EV-REASIGNACION) que registra
las 5 variantes feas de E57. **Sólo REGISTRA:** el dinero sigue por las RPCs existentes (movimiento de
tesorería, línea de `carga_costos`, `fn_editar_carga`, `fn_asignar/desasignar_carga_so`) y el evento
las **referencia por id** (`ref_movimiento_folio` / `ref_carga_costo_id` / `ref_aplicacion_id`). Fase D
leerá estos eventos para armar el asiento.

**Por qué.** Mismo principio que D-54 (el SO no tiene líneas propias porque las cajas viven en `cargas`):
el evento no tiene contabilidad propia porque el dinero vive en `movimientos`/`carga_costos`. Un evento
nunca es una fuga → **blinda el Cuadre=0.00 por construcción** y evita una segunda fuente de verdad del
dinero. Un evento que auto-postea sería un segundo motor contable: eso es Fase D.

**Por qué esta solución y no otra.** (a) Catálogo, no enum — ERP_2 exige "agregar modelos sin modificar
la estructura"; añadir "merma"/"bonificación" es un INSERT, no DDL. (b) Ancla en `carga_folio` obligatorio
+ SO/asignación opcionales → funciona con 0 SOs (backfill pendiente). (c) Inmutable como `liquidaciones`
(sólo se anula). (d) Validación por banderas (`exige_cajas/monto/contraparte/so_destino`) como
`trg_valida_so_params`. Signos: reembolso y costo de reempaque negativos; ajuste_precio = delta con signo.

**Hallazgo.** Los 3 docx de socios (ERP_1/ERP_2/ERP_PP) **no definen los eventos** — definen el marco
(SO<->SPO, Revenue Models, order-to-cash). Los 5 tipos vienen del descubrimiento de E57.

**Consecuencia permanente.** Toda anomalía post-embarque se registra tipificada y trazable, lista para
que Fase D la contabilice. Objetos: tablas `evento_tipos`/`eventos_carga`, vistas `v_evento_tipos`/
`v_eventos_carga`, RPCs `fn_registrar_evento_carga`/`fn_anular_evento_carga`, triggers `trg_evento_valida`/
`trg_evento_inmutable`. Frontend (UI de eventos) pendiente para Claude Code.

### D-50 (E62). Spec de socios "Revenue Models" — ubicación en el plan y decisiones pendientes

**Qué se decidió.** El documento "Plein Produce ERP — Revenue Models" (especificación funcional
de los socios, 30-jul-2026) se ubica como sub-bloque **C.0** de la Fase C de la Reestructura
(NO es un frente nuevo). Formaliza que cada Sales Order lleva un **Revenue Model obligatorio**
que determina el cálculo de ingreso/utilidad sin alterar el flujo operativo.

**Por qué.** El doc mapea casi 1:1 con las 3 modalidades ya existentes y con el trabajo de
atribución por línea de E60/E62. No introduce arquitectura nueva: aterriza la Fase C que ya
estaba planeada (tablas de flujo documental vacías).

**Decisiones de negocio PENDIENTES (requieren GATE de socios antes de programar C.0):**
1. **¿`margen_fijo` se parte en dos?** El doc separa "Margin per Box" (solo compra/venta) de
   "Buy & Resell" (compra + inventario + todos los costos). El ERP hoy los une en `margen_fijo`.
2. **`Percentage of Sale` es modelo nuevo.** Hoy la regla "comisión consignación = 10% del gross"
   se calcula a mano; con el catálogo pasaría a ser un Revenue Model formal. Confirmar alcance.
3. **Catálogo vs enum.** El doc exige "agregar modelos sin modificar la estructura" → los Revenue
   Models van como TABLA catálogo (`revenue_models`), no como enum rígido de `modalidad`. Las 3
   modalidades actuales se vuelven un subconjunto mapeado.

**Consecuencia operativa permanente.** Cuando arranque Fase C, el primer paso es C.0 (catálogo
`revenue_models` + `sales_orders.revenue_model_id` obligatorio). El Revenue Model es también el
que determinará el asiento en Fase D. No programar C.0 sin resolver las 3 decisiones de arriba.

### D-51 (E62). Candado de seguridad: variedades/presentaciones/documento_serie cerradas

**Qué se decidió.** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `REVOKE ALL` (anon/PUBLIC/
authenticated) sobre `variedades`, `presentaciones` y `documento_serie`. El centinela
`v_seguridad_auth` bajó de 3 a 0 filas.

**Por qué.** Nacieron en E54–E55 sin el candado completo (RLS off + legibles por authenticated),
violando la regla de arquitectura. El frontend NO se afectó: lee por `v_catalogo_variedades`
(security definer), verificado antes del DDL.

**Consecuencia operativa permanente.** Toda tabla nueva debe nacer con RLS on + REVOKE ALL; el
centinela `v_seguridad_auth` debe dar 0 al cierre de cada sesión (junto con anon/escritura).

### D-52 (E62). Sincronización V8→ERP: 2 cargas nuevas, 6 movs; banco manda sobre el V8

**Qué se decidió.** Se capturaron las 2 cargas nuevas del V8 (P-088 = PO 36522 Carrifoods→CRI
Habanero consignación; P-089 = PO 1003 Akambarhu→CRI Kabocha consignación, nace flagged), alta de
contraparte BAJA PLANTS (id 89), y los 6 movimientos Chase 369–374. Aplicaciones: reempaque
Costatropical→P-077, reparto Pampas 30,000→P-074/P-078/P-082/P-083. JPM baja de 41,214.93 a
6,875.93; CxP de 534,578.14 a 510,115.14; CxC sin cambio.

**Por qué.** El ERP replica el Chase al centavo (268 movs, neto 6,875.93). El encabezado del V8
"Bancos $5,875.93" NO cuadra con sus propias 268 filas (dif exacta $1,000 = fórmula de rango
desactualizada en la hoja de Samuel). Regla banco-manda: el ERP está bien, Samuel debe revisar
esa celda.

**Mov 373 Baja Plants reclasificado.** De "Financiamiento externo" a "Anticipo a productor" +
registrado como 2ª disposición de PRJ-005 (Santana Baby Broccoli). Nomenclatura aclarada por
Miguel: "0.75 CV, 2 RF" = distribución del préstamo entre contratos del proyecto (CV = Crystal
Valley, RF = River Fresh), es tema del productor pero Plein lo financia. PRJ-005 dispuesto: 6,180
→ 8,350.

**Consecuencia operativa permanente.** El enredo Akambarhu queda confirmado y PARQUEADO
(TAR-0001/0003): los movs 356/357/370 ("adelantos Kabocha carga 1001") + cobro 372 + aduana 368
NO se aplican a P-073, porque P-073 ya tiene pagado 8,697 de un costo de 11,947 — aplicarlos
sobre-pagaría. Fuerte hipótesis: son disposiciones del préstamo Akambarhu (PRJ-001/002), no costo
de carga. Espera decisión de Samuel.

### D-53 (E62). Cierre honesto de líneas de costo residuales (228/253) y alias en vista CxP

**Qué se decidió.** De las líneas de `carga_costos` sin proveedor: **8 atribuidas con dato duro
del V8** (cruce por P.O., criterio E60) — P-033/P-076 MP→Las Brisas(67), P-088 MP→Carrifoods(12),
P-082/P-083/P-084 MP espárrago→Pampas(39), P-022 reempaque→Lam(33), P-077 reempaque→
Costatropical(81). Universo: **228/253 atribuidas**.

**25 NO atribuibles, todas marcadas con motivo en `nota` (ninguna silenciosa):**
- 17 Cartón ($32,262.24) → cargo interno Plein ($1.90/caja, tarifa Samuel, sin factura externa).
- 4 Comisión AGROFEPAC P-01..P-04 ($7,661.02) → sin línea de comisión en V8 para esa PO.
- 2 Comisión P-073/P-075 ($7,400.00) → FLAGGED enredo Akambarhu, no atribuir hasta resolver.
- 2 staging FRX P-046/P-054 ($4,813.50) → carga anulada, no existe en V8.

**Por qué.** Cierre honesto por instrucción de Miguel: atribuir solo con dato real, marcar el
resto con motivo, no forzar 100%. El cartón (mayoría de lo pendiente) es hallazgo real, no hueco:
genuinamente no tiene proveedor externo.

**Alias en `v_cxp_proveedor_atribuido`.** Se agregaron columnas `pagado`/`saldo_cxp` (= alias de
`pagado_estimado`/`saldo_estimado`) para que el frontend pueda migrar de la vieja
`v_cxp_proveedor_real` cambiando SOLO el nombre de la vista, sin tocar nombres de columna. No
cambia datos ni anclas. **Cierre del ciclo (mismo E62):** el frontend (`modulo-pagos.js`) migró a
`v_cxp_proveedor_atribuido` (Claude Code, con ⓘ de "estimado por prorrateo", desplegado y verificado
por curl), y acto seguido se ejecutó `DROP VIEW v_cxp_proveedor_real` (cero dependencias en BD). El
parche E56 queda retirado por completo.

**Consecuencia operativa permanente.** Las 25 líneas sin proveedor están documentadas — no
re-perseguirlas como si fueran error. El cartón es cargo interno por diseño. Migrar el frontend a
la vista atribuida CAMBIARÁ los números en pantalla (AGROFEPAC deja de ser el "cajón de sastre",
aparecen Las Brisas/BBA/Suárez/Agricooling como proveedores reales) — es correcto, avisar a Miguel.

## E57–E61 (cierre) — 2026-07-30 · REESTRUCTURA: descubrimiento, dos ejes, regla de variedad y atribución de proveedores

### D-44 (E57). Variedad = cultivar botánico; color/calibre/grado/orgánico son de presentación

**Qué se decidió.** Variedad significa **cultivar botánico** (ej. Maradol, Tainung, Intenzza,
Vegas en papaya). Color, calibre, grado y orgánico **NO son variedad** — son atributos de
**PRESENTACIÓN**. Descubrimiento adicional de la sesión: la operación de Plein **no maneja
calibre/SKU por carga** hoy — el V8 de Samuel solo registra producto+color (ej. "Habanero
Rojo"). Las 45 presentaciones cargadas en el catálogo son de **referencia**, no captura
obligatoria por carga todavía.

**Por qué.** Mezclar color/calibre dentro de "variedad" (como ya había pasado con el espárrago,
ver D-37/D-41) genera productos/variedades ficticias que no reflejan cómo compra y vende Plein
en la práctica.

**Efecto.** Regla aplicable de aquí en adelante en toda alta de variedad/presentación. Bell
Pepper/Coco/Habanero siguen con su color capturado como variedad (herencia histórica) hasta que
se migren a presentación real — pendiente de datos de Samuel.

### D-45 (E57). Modelo de "Dos Ejes": Sales Order manda lo comercial, Lote manda el costeo

**Qué se decidió.** El modelo objetivo de la REESTRUCTURA (GATE de socios aprobado 30-jul-2026)
tiene **DOS EJES** independientes que se cruzan en la **Carga**: el **Sales Order** (documento
comercial central — qué se vendió, a quién, en qué términos) y el **Lote** (qué costó, de qué
proveedor, en qué presentación). La Carga es el punto de cruce operativo entre ambos ejes.

**Por qué.** Las sesiones de descubrimiento (E57, junta de socios recorriendo cargas reales:
FMU01 multi-proveedor, trueque P&M, consignación, comisión pura) mostraron que forzar todo
dentro de una sola entidad "Carga" (el modelo actual) no representa negocios reales — cada uno
rompe el supuesto de "1 carga = 1 proveedor = 1 cliente = 1 costo".

**Efecto.** Define la arquitectura de las Fases B y C que siguen (partir la Carga; flujo
documental Sales Order → OC → Envío → Factura → Liquidación). Ver `PLAN-MAESTRO.md`, sección
"REESTRUCTURA".

### D-46 (E57). No reconstruir: poblar el esqueleto que ya existe (Plan A→B→C→D)

**Qué se decidió.** La REESTRUCTURA **no reconstruye** el ERP desde cero. El esqueleto de
tablas para el modelo de Dos Ejes **YA EXISTE** de sesiones anteriores; el plan es poblarlo en 4
fases secuenciales: A (catálogo de 3 niveles, COMPLETA), B (partir la Carga, en curso), C
(flujo documental, tablas vacías, no empezada), D (contabilidad automática, no empezada).

**Por qué.** Evita la trampa de "reescribir todo" cuando el trabajo real es completar y conectar
piezas ya construidas — menor riesgo y aprovecha meses de captura ya hecha.

**Efecto.** Cualquier sesión futura de backend debe primero verificar qué existe antes de
proponer tablas nuevas.

### D-47 (E59). Excepción acotada en `fn_chk_periodo_cerrado` para `contraparte_id` de `carga_costos`

**Qué se decidió.** Se agregó una 3ª excepción al guardián de periodos cerrados
(`fn_chk_periodo_cerrado`): un `UPDATE` en `carga_costos` que SOLO toca `contraparte_id` (nunca
`concepto` ni `monto`) se permite en meses ya cerrados. Mismo patrón que las excepciones de E36
(cajas) y E44 (texto de movimientos). Probado en vivo que sigue bloqueando cualquier cambio de
monto.

**Por qué.** La atribución de proveedores por línea (E60) necesitaba corregir el
`contraparte_id` de líneas de costo en cargas de meses ya cerrados, sin reabrir el mes ni tocar
montos.

**Efecto.** Precedente reutilizable: cualquier corrección futura de metadatos (no montos) en
meses cerrados debe seguir este mismo patrón de excepción acotada, nunca un candado genérico.

### D-48 (E60). Alta de contraparte: Succar Farms (comisionista)

**Qué se decidió.** Alta de Succar Farms como contraparte comisionista, necesaria para la
atribución masiva de proveedores por línea. Luis Alvarez **ya existía** en el catálogo (id 84)
— no se dio de alta de nuevo, solo se re-atribuyeron líneas de costo hacia él.

**Por qué.** La atribución por línea (220/251, 88%) exigía que todas las contrapartes reales de
cada línea de costo existieran en el catálogo antes de re-asignar `contraparte_id`.

**Efecto.** Ninguno contable — solo catálogo. Contrapartes 70→71.

### D-49 (E60). El "cajón de sastre" de AGROFEPAC: `proveedor_id` histórico incorrecto

**Qué se decidió.** Se confirmó que `cargas.proveedor_id` era, en la práctica, un **cajón de
sastre**: muchas cargas tenían a AGROFEPAC (id 4) como proveedor cuando la materia prima real
venía de Papayas & More o de Las Brisas. La atribución de proveedores por **línea** de costo (no
por carga completa) corrigió el error: cada línea (materia prima, fletes, aduanas, in&out,
comisión, cartón) ahora apunta a su proveedor real vía `carga_costos.contraparte_id`,
resolviendo 220 de 251 líneas (88%). Método: Fletes→BBA(9), Aduanas→Suárez(49),
In&Out→Agricooling(3) (inequívocos, sin cruce); Materia prima/Comisión/Cartón vía puente
`id_v7`→V8 (cruce por `id_v7`, **NUNCA por folio**: 22 embarques tienen folio≠id_v7). Caso
ejemplo: FMU01 (P-025) tenía 4 proveedores reales distintos en una sola carga (Las Brisas
materia prima, BBA fletes, Suárez aduanas, P&M cartón) — todos atribuidos correctamente.

**Por qué.** El campo `cargas.proveedor_id` (singular, a nivel carga) nunca pudo representar
embarques multi-proveedor; el negocio real siempre tuvo varios proveedores por embarque, pero el
esquema anterior forzaba uno solo.

**Efecto.** `v_cxp_proveedor_atribuido` (E61) es la fuente de verdad de CxP por proveedor real.
AGROFEPAC pasa de una CxP inflada (~245.8k) a su saldo real (~55.6k) — mismo hallazgo que ya
había asomado en E56 con `v_cxp_proveedor_real`, ahora resuelto en la raíz (por línea, no
re-atribuido solo en lectura). Pendiente: 31 líneas de costo residuales (E62).

---

## E56 (cierre) — 2026-07-29 · Trueque Papayas & More desenredado y re-atribución de CxP

### D-42 (E56). Trueque Papayas & More: 3 relaciones, Opcion B, diferencial informativo
P&M (id 40) tiene 3 relaciones de dinero con Plein: (1) Yaka como cliente margen fijo -> nos
debe 377,567.70; (2) papaya como proveedor -> le debemos 159,982.00; (3) reembolso de la
logistica del Jack Fruit (P&M es agente pagador de flete+in&out+aduanas+carton de SUS cargas)
-> le debemos 169,221.80; mas su participacion 50/50 de la ganancia (comision) -> 21,014.57.
DIFERENCIAL NETO: P&M nos debe 27,349.33. Se maneja Opcion B (bruto + informativo, sin netear
en libros, no toca anclas), vive en v_papm_diferencial. El Jack Fruit lo surte AGROFEPAC (id 4,
solo materia prima), NO P&M. Pendiente Samuel para Opcion A: gap V7 Yaka 31,000 (P-079/P-080 en
transito) y arrastre papaya 2025 31,294.44.

### D-43 (RESUELTA E56). CxP por proveedor real — re-atribucion en lectura
Vista v_cxp_proveedor_real: re-atribuye en tiempo de lectura el costo no-materia-prima de las
cargas Jack Fruit destino P&M (logistica+carton+comision = 190,236.37) de AGROFEPAC(4) a P&M(40).
NO muta datos: el UPDATE a carga_costos quedaba bloqueado por el guardian de periodos cerrados,
asi que la re-atribucion se hace via CASE en la vista. Total reconcilia a CxP 534,578.14; Cuadre
a salvo. AGROFEPAC 245,803.60 -> 55,567.23 (solo materia prima). Cerrados de paso: el Δ 908.57 de
materia prima (3a carga AGROFEPAC no-P&M, solo MP) y los 12,900 (flete BBA/Suarez de FreshMex,
Plein operacion directa). Frontend ya apunta a la vista real (modulo-pagos.js).

---

## E55 (cierre) — 2026-07-29 · Espárrago separado, numeración oficial de OC/Quote y limpieza de pruebas

### D-41. Espárrago orgánico y convencional son PRODUCTOS SEPARADOS (revierte D-37)  [E55]
Qué se decidió. El espárrago orgánico y el convencional NO se mezclan: son dos productos distintos,
no dos variedades del mismo. Corrección directa de Miguel. El catálogo ya los tiene separados:
producto 9 "Espárrago" (= convencional) y producto 10 "Esparrago Organico". Se retiró la variedad
"Orgánico" que había quedado colgada del producto 9 en el experimento de E54 (estaba sin uso en
cargas; P-058 quedó intacta en variedad "Convencional").
Por qué. Comercialmente son productos diferentes (certificación, precio, comprador). REVIERTE D-37,
que los trataba como un producto con variedades Convencional/Orgánico.
Pendiente opcional (Miguel): quitar también la variedad "Convencional" del producto 9 y renombrar a
"Espárrago Convencional" / "Espárrago Orgánico". Solo si Miguel lo pide.

### D-40. Número oficial de OC/Quote se gana al enviar, serie anual (espejo de factura)  [E55]
Qué se decidió. OC y Quote conservan su folio de trabajo (OC-/COT-, asignado al alta) y ganan un
numero oficial anual (PO-AAAA-####, QT-AAAA-####) al pasar Borrador->Enviada, vía tabla unificada
documento_serie + fn_siguiente_numero_doc. No se reasigna; los borradores no consumen número.
Por qué. Consistencia con el patrón factura (factura_serie + numero al emitir) y para que el PDF deje
de decir "BORRADOR". Alternativas descartadas: el folio como número (gasta números en borradores, sin
año); auto-numerar al alta (rompía folios ya referenciados por items FK).

---

## E54 (cierre) — 2026-07-28 · Variedad de producto, Espárrago, Las Brisas/RFC y Presentaciones

### D-35. La variedad se separa del nombre del producto

**Qué se decidió.** Los productos dejan de cargar la variedad en su propio nombre (ej. un
producto llamado "Habanero Rojo"). Se separan en producto base ("Habanero") + variedad ("Rojo")
vía la tabla nueva `variedades` (producto_id, nombre), con selector dependiente en captura y
edición de carga.

**Por qué.** Un nombre de producto que mezcla la variedad impide agrupar/comparar el mismo
cultivo entre variedades en reportes (margen, rotación, KPIs) y duplica productos que en
realidad son el mismo producto con distinta presentación varietal.

**Efecto.** Los productos existentes que ya mezclaban variedad en el nombre quedan para
separarse caso por caso (no se tocó nomenclatura retroactiva en E54); toda captura nueva usa el
selector de variedad. D-37 (Espárrago) es el primer caso trabajado con este criterio.

### D-36. Las Brisas (67) = AGROFEPAC (4) también por RFC de persona física

**Qué se decidió.** El RFC de persona física `CACL830825NR7` (asociado hasta ahora a "Las
Brisas") se movió a la contraparte AGROFEPAC (id 4); id 67 (Las Brisas) sigue retirada (soft,
sin borrar el registro).

**Por qué.** Refuerza con evidencia de RFC la fusión ya ejecutada en D-30/E48 (que se basó en
duplicado de nombre/operación): ahora también el identificador fiscal coincide, cerrando
cualquier duda de que fueran dos entidades distintas.

**Efecto.** Ninguno sobre montos (la fusión de saldos ya ocurrió en D-30); es evidencia
adicional que confirma que la fusión fue correcta.

### D-37. Espárrago es 1 producto con variedades Convencional/Orgánico

**Qué se decidió.** Espárrago pasa a ser un único producto en el catálogo, con dos variedades:
Convencional y Orgánico. P-058 quedó confirmada como variedad Convencional.

**Por qué.** Es el mismo cultivo vendido en dos variedades, no dos productos distintos —
aplicación directa del criterio de D-35.

**Efecto.** La fusión histórica de las 7 cargas de espárrago orgánico queda **PENDIENTE**:
P-059 (24-jun-2026) cae en un periodo ya cerrado (junio), y reclasificar ahí exige reabrir el
mes — desproporcionado por ahora para 7 cargas. Pendiente para una sesión donde se decida
reabrir junio, o se acumule más volumen que lo justifique.

### D-38. Presentaciones: calibre flexible (tipo + valor texto) + marca/reempaque

**Qué se decidió.** La tabla nueva `presentaciones` modela el calibre con dos campos:
`calibre_tipo` (conteo / talla / peso / grado) + `calibre_valor` (texto libre), más `marca` y
`es_reempaque` para el caso de reempaque bajo la marca del cliente.

**Por qué.** El calibre de fruta/verdura no es un solo tipo de dato: unos productos se califican
por conteo (ej. 40/50/60 por caja), otros por talla (S/M/L), otros por peso, otros por grado de
calidad — un campo numérico único no alcanza para las 21 líneas de producto del catálogo FRX.
`marca`/`es_reempaque` existen porque parte del negocio reempaca con la marca del cliente
(patrón de trazabilidad GS1/PTI del sector).

**Efecto.** Tabla creada pero **NO enganchada todavía** a ningún flujo de captura — es el
siguiente bloque grande del plan (ver PLAN-MAESTRO.md), pendiente de las imágenes del "silo" de
Miguel para terminar de modelar los valores reales de calibre por producto antes de diseñar la
captura.

### D-39. Documentos oficiales leen de `v_documento_*`, no arman dirección a mano

**Qué se decidió.** Invoice, Purchase Order y Quote (frontend) leen de las vistas nuevas
`v_documento_invoice`, `v_documento_po`, `v_documento_quote` — que ya traen la dirección de la
contraparte desglosada campo por campo (`bill_to_*` / `proveedor_*`, herencia directa de la
captura de direcciones de contraparte de E53) — en vez de reconstruir el bloque de dirección a
mano o dejarlo como texto libre.

**Por qué.** Antes de E53 no existía dirección estructurada de contraparte; estas vistas son las
primeras en explotarla para armar BILL TO / SHIP TO / VENDOR sin inventar ni pedir texto libre
donde ya hay datos capturados.

**Efecto.** El membrete de los 3 documentos comparte un único bloque de código
(`ERP.membreteOficial`/`pieOficial`/`tablaLineasDoc` en `exportar.js`, ver REPORTE-FRONTEND.md):
header claro + logo + dirección fija de Plein + leyenda PACA (en Invoice, jalada de `v_config`,
no reescrita). Los 3 quedaron desplegados y verificados el 2026-07-28.

---

## E48 (cierre) — 2026-07-27 · Gestor de Aplicaciones, fusión AGROFEPAC/Las Brisas y aclaración JEAMS/José

### D-30. AGROFEPAC (4) = Las Brisas Produce (67): fusión ejecutada, completa D-29

**Qué se decidió.** Se confirmó que AGROFEPAC (id 4) y Las Brisas Produce (id 67) son el
**mismo proveedor real** (Yaca/Thai) bajo dos registros de catálogo. Se ejecutó la fusión en
E48: las cargas P-079/P-080 se reasignaron de `proveedor_id` 67 a 4, y la contraparte 67 quedó
**neutralizada** (no usable).

**Por qué.** El hallazgo A-03 de la auditoría (Fable) encontró operación viva **partida** entre
los dos ids: las cargas tenían `proveedor_id=67` mientras los pagos que las liquidan (mov 355,
mov 365) tenían `contraparte_id=4` — la misma exposición real al proveedor aparecía repartida
en dos renglones de `v_cxp_proveedor`, subestimando la cartera de cualquiera de los dos por
separado.

**Por qué esta solución y no otra.** D-29 (E47) ya había investigado la numeración de folios
detrás de este caso y concluyó que P-079/P-080 SÍ eran de Las Brisas/Yaca, cerrando A-03 como
"duplicado de catálogo, no accionable". Esa conclusión quedó **incompleta**: confirmar que las
cargas pertenecen al proveedor correcto no resuelve que el proveedor esté partido en dos ids.
Se evaluó dejarlo documentado sin fusionar, por ser de bajo impacto directo en dinero. Se
descartó: mientras el catálogo tenga dos ids para la misma entidad, cualquier lectura de
cartera/aging por proveedor seguirá partida, y el riesgo crece con cada carga o pago nuevo que
se capture bajo el id equivocado.

**Consecuencia operativa permanente.** D-29 queda **complementada, no revertida**: su hallazgo
de folios (P-079/P-080 son de Las Brisas/Yaca) sigue siendo correcto; lo que cambió es que
"duplicado no accionable" pasó a "duplicado fusionado". A-03 se marca RESUELTO en
`AUDITORIA.md`. Antes de dar de alta una contraparte nueva, buscar por alias cruzado y
nombre-como-alias (el método que encontró este caso), no solo por nombre exacto.

---

### D-31. `fn_aplicar_a_carga` con gate EDITAR (no capturar)

**Qué se decidió.** El nuevo `fn_aplicar_a_carga` (y `fn_desaplicar`) quedaron con gate
**`editar`**, no `capturar`.

**Por qué.** Aplicar un movimiento a una carga mueve saldos de CxC/CxP — es la misma clase de
operación que `fn_aplicar_fifo`, que ya exige `editar`. Gatearlo a `capturar` habría creado la
misma asimetría de permisos que A-15 marcó en `fn_editar_factura` (una capacidad más baja que
la que en realidad requiere la operación).

**Por qué esta solución y no otra.** Se evaluó dejarlo en `capturar` para que Samuel/Chanes
(rol captura) pudieran aplicar pagos sin esperar a un editor, ya que la captura diaria de
movimientos sí es de su rol. Se descartó: aplicar (a diferencia de capturar el movimiento en
sí) mueve el saldo de una carga específica, con el mismo riesgo sobre CxC/CxP que ya justificó
el gate `editar` de `fn_aplicar_fifo` — tratarlas distinto por tener nombres distintos habría
sido exactamente el tipo de inconsistencia de contrato que ya obligó a documentar las "Trampas
de API" en CLAUDE.md.

**Consecuencia operativa permanente.** Toda futura RPC que mueva saldos de CxC/CxP (aplicar,
desaplicar, reclasificar) gatea por defecto en **editar**, no `capturar` — `capturar` es para
crear/registrar, `editar` es para mover lo ya registrado.

---

### D-32. Dinero de José/JEAMS: dos cubetas distintas, ninguna es ingreso

**Qué se decidió.** Se documentó la distinción entre dos formas en que el capital de José
entra al negocio: **(1) cuenta virtual JEAMS** (folios 9001-9008) = pagos directos a proveedor
que NUNCA pasaron por el banco real; **(2) movimientos JPM tipo "Inversión"** (folios 107-118,
359-360; el 112 es un **retiro**, no aportación) = capital que SÍ se depositó al banco — son
las "Aportaciones" de la pestaña V7-Traspasos. Ambas son préstamo de socio (pasivo), ninguna es
ingreso.

**Por qué.** Sin esta distinción documentada, una sesión futura podría confundir las dos
cubetas —o peor, contar el mismo capital dos veces (una vez como JEAMS virtual, otra como
depósito bancario)— o tratar una aportación de capital como si fuera ingreso operativo,
inflando la utilidad.

**Por qué esta solución y no otra.** Se evaluó fusionar ambas en una sola cuenta virtual
JEAMS. Se descartó: la cuenta JEAMS existe específicamente para dinero que NUNCA tocó el banco
(D-19 aplica el mismo criterio a la cuenta SAMUEL) — fusionar ahí el capital que SÍ pasó por
JPM rompería la conciliación bancaria al centavo que se mantiene desde E39/E43, exactamente el
mismo riesgo que D-19 ya evitó para Samuel.

**Consecuencia operativa permanente.** Al capturar o revisar dinero que José aporta: si nunca
tocó el banco → cuenta JEAMS (9001-9008). Si sí se depositó a JPM → tipo "Inversión" (folios
107-118, 359-360; **ojo con el 112, que es retiro, no aportación**). Ambas son pasivo
(préstamo de socio, D-02), nunca ingreso.

### D-33. Los neutros sin par son "ajuste bancario reconocido", no "partidas por aplicar" (E49)
**Qué se decidió.** El residuo neto de movimientos del grupo `neutro` sin espejo (+21.81 = mov 297 amarre de saldo de Samuel +21.60 + mov 199 reembolso del dominio +0.21) sale de la línea de Patrimonio "Partidas por aplicar" de v_balance y se reconoce en línea propia "Ajuste bancario reconocido (sin par)". En v_balance_partidas esos renglones cambian su `destino` de "Neutro (se cancela)" a "Ajuste bancario reconocido (sin par)".
**Por qué.** "Partidas por aplicar" = dinero de banco que falta aplicar a un embarque (debe tender a 0). Los neutros sin par nunca irán a una carga: son conciliaciones/reembolsos, dinero real ya en JPM. Mezclarlos impedía que la línea llegara a cero y la etiqueta "se cancela" mentía. Reclasificar los movimientos estaba descartado (enero y junio cerrados; reabrir por $21.81 es desproporcionado) → arreglo 100% de vista.
**Efecto.** Partidas por aplicar queda en −3,300.00 (BBA+Suarez, tenderá a 0). Nueva línea +21.81. TOTAL PATRIMONIO intacto −720.33, Cuadre 0.00. v_balance 16→17 filas. Cierra A-04 de AUDITORIA.md.

### D-34. La liquidación de consignación es independiente del estado logístico (E49)
**Qué se decidió.** fn_liquidar_consignacion acepta p_estado_final = NULL = capturar la venta (ingreso_venta) SIN tocar el estado logístico. Se mantienen 'Entregada'/'Cerrada' para cuando sí quieran avanzar; NULL = dejar el estado como esté (En Camino, en bodega, etc.).
**Por qué.** En consignación el precio de venta se asigna cuando se consigue comprador — antes de salir, en tránsito o ya en bodega — hecho COMERCIAL independiente del LOGÍSTICO (estado=logística, modalidad=comercial). La versión anterior obligaba a mover a Entregada/Cerrada al liquidar, forzando a fingir una entrega/cierre que no ocurrió. Capturar la venta declara la CxC (pasivo "declarado no reconocido" hasta cobrar, D-11); el ingreso se reconoce al cobrar (D-04).
**Efecto.** Habilita el flujo real de captura de consignación desde la UI sin distorsionar el pipeline logístico. Firma sin cambio (NULL antes nuleaba el estado; ahora es valor válido y seguro). Auditado en flag_log como antes.
**Addendum (guarda anti sobre-cobro).** fn_liquidar_consignacion ahora rechaza p_ingreso_real < cobrado_actual de la carga (dejaria CxC negativa). Cierra el hueco que abria la precarga "corregir venta" del frontend: re-liquidar una consignación ya cobrada a un monto menor. Contención previa (candado de mes cerrado en las históricas) reforzada con validación explícita en la RPC.

---

## E47 (cierre) — 2026-07-26 · Programas comerciales, días de crédito reales, back-to-back con tasa y correcciones de captura del 24-jul

### D-20. El gap de Papayas & More NO es morosidad: es artefacto del trueque

**Qué se decidió.** Se capturaron días de crédito reales por cliente desde el panorama
comercial: Northgate 30 (21 + cheque), Crystal Valley 21 (pick&pack), CRI 15 (wire), Alpine
15. Al revisar el gap resultante, se determinó explícitamente que el ~123 días observado en
Papayas & More **no es morosidad**.

**Por qué.** Papayas & More opera con Plein bajo **trueque**: el producto se netea contra
producto, nunca cae al banco como un cobro en efectivo con fecha propia. Medir "días hasta el
cobro" contra un cliente que estructuralmente nunca cobra en efectivo produce un gap gigante
que no representa ningún riesgo real de cartera — es un artefacto de cómo se mide, no del
comportamiento de pago del cliente.

**Por qué esta solución y no otra.** Se evaluó dejar el gap tal cual, con el mismo semáforo
que el resto de los clientes. Se descartó: mezclar un artefacto de neteo con la morosidad real
de otros clientes contamina cualquier lectura agregada del gap de cartera — un lector rápido
del panel vería "123 días de gap" y asumiría el peor cliente de la cartera, cuando en realidad
es el único que nunca debería aparecer ahí.

**Consecuencia operativa permanente.** Ninguna sesión futura (backend, frontend o de negocio)
debe leer el gap de Papayas & More como cartera vencida. Queda pendiente en backend separar el
neteo del trueque del cálculo de aging (anotado en `PLAN-MAESTRO.md`, SIGUIENTE E48).

---

### D-21. Catálogo `programas_comerciales`: el código es la llave, `etiqueta` es la identidad

**Qué se decidió.** Se creó `programas_comerciales`: una fila por cliente × producto ×
proveedor × modalidad (13 filas hoy, PC-001..PC-013, mapeando los 7 bloques del panorama
comercial). Se agregó la modalidad `trueque` al catálogo de modalidades de programa. El
código `PC-###` es **llave estable** — no cambia nunca, no rompe bitácora ni chips —; el
nombre legible vive en la columna `etiqueta`, editable libremente desde la UI.

**Por qué.** El panorama comercial de Plein no es una lista de embarques sueltos: son
acuerdos **recurrentes** (mismo cliente, mismo producto, mismo proveedor, misma forma de
cobrar) que se repiten carga tras carga. Sin un catálogo propio no había forma de proyectar
cuántas cargas equivalentes por semana representa cada acuerdo, ni de detectar cuándo un
programa activo lleva semanas sin generar carga (la regla 8 de agenda, `programa_sin_carga`).

**Por qué esta solución y no otra.** Se evaluó derivar los "programas" dinámicamente,
agrupando en tiempo de consulta las cargas existentes por cliente+producto+proveedor, sin
tabla propia. Se descartó: un programa puede existir comercialmente (pactado) antes de tener
ninguna carga todavía — justo el caso que la regla de agenda necesita detectar —, y agrupar
solo por cargas existentes nunca vería ese caso porque no habría filas de las cuales agrupar.

**Consecuencia operativa permanente.** El número (PC-###) es matrícula: nunca se reutiliza ni
se reordena, y todo el frontend (chips de Embarques/Expediente, navegación, bitácora) lo usa
como llave técnica. El nombre es identidad: se edita sin miedo, no rompe nada aguas abajo. "El
número es matrícula, el nombre es identidad."

---

### D-22. `cargas.programa_id` es columna NO CONTABLE; match determinista, nunca por folio

**Qué se decidió.** Columna `cargas.programa_id`, marcada explícitamente como no contable. El
backfill inicial (66 de 80 cargas vivas) y el trigger `tg_cargas_programa` (auto-liga cargas
nuevas) usan `fn_match_programa`: coincidencia por cliente + proveedor + producto (+ ventana
de temporada), **nunca por folio**. Si hay más de un candidato posible, el campo se deja NULL.

**Por qué.** Ligar una carga al programa equivocado no rompe ningún ancla contable (de ahí "no
contable"), pero sí ensucia la proyección y el conteo de "cargas ligadas" de cada programa. Un
match por folio —que es simplemente consecutivo, sin relación de negocio— habría sido una
adivinanza, no una coincidencia real, con el mismo riesgo que ya se blindó en D-09 (cotejar
por P.O., nunca por folio, entre ERP y V7).

**Por qué esta solución y no otra.** Se evaluó forzar "el primer candidato" cuando hay
ambigüedad, para dejar las 80 cargas ligadas al 100%. Se descartó: es el mismo patrón que el
proyecto ya rechazó en otros lados — adivinar una liga ambigua es peor que dejarla visible
como pendiente. Las cargas sin match (14 de 80) quedan como trabajo pendiente explícito, no
como un dato silenciosamente incorrecto.

**Consecuencia operativa permanente.** Un `programa_id` NULL en una carga no es un error de
captura: puede ser ambigüedad genuina (más de un programa candidato) o que la carga
sencillamente no pertenezca a ningún programa recurrente. No completar a mano sin verificar
cuál candidato es el correcto.

---

### D-23. El back-to-back tiene línea propia de Pasivo, separada de la deuda JEAMS

**Qué se decidió.** El financiamiento back-to-back gana su propia línea de Pasivo en
`v_balance`: "Financiamiento externo (back-to-back, con tasa)", separada de "Deuda JEAMS
(préstamo socio, sin interés)". `v_balance` pasa de 15 a **16 filas**. La tasa (6.2% anual,
vigente desde el 24-jul-2026) vive en `PRJ-001.tasa_anual`.

**Por qué.** JEAMS es un préstamo de socio **sin** interés (D-02); el back-to-back **sí**
causa interés. Mezclarlos en la misma línea de pasivo escondería que una de las dos deudas
crece con el tiempo y la otra no — cualquier lectura seria del balance necesita poder
distinguir cuál pasivo es cuál.

**Por qué esta solución y no otra.** Se evaluó anotar la tasa como una nota informativa sobre
la misma línea de JEAMS. Se descartó: una nota no participa en ninguna aritmética ni alimenta
ninguna vista futura de devengo de interés; una línea propia sí lo hace, y habría que
separarla de JEAMS de todas formas el día que se calcule el interés acumulado — mejor hacerlo
ahora que remendarlo después.

**Consecuencia operativa permanente.** El devengo del interés del back-to-back queda
**pendiente de diseño** (anotado en `PLAN-MAESTRO.md`, SIGUIENTE E48) — hoy solo la tasa está
fijada; el monto de interés acumulado todavía no se calcula ni se refleja en ningún lado.

---

### D-24. El TC de los 77,000 MXN de Samuel es 4,400.00 USD exactos, no 4,405.03

**Qué se decidió.** Los 77,000 MXN que Samuel frontea a Akambarhu se registran como **4,400.00
USD exactos** (TC 17.50), reemplazando el 4,405.03 (TC 17.48) que se había usado antes.

**Por qué.** La aritmética del propio banco lo confirma: José pidió 25,000 al productor y el
wire que efectivamente salió fue de 20,600 — la diferencia (4,400 exactos) es el número que
cuadra contra el movimiento real, no una conversión genérica de tipo de cambio de mercado.

**Por qué esta solución y no otra.** Se evaluó mantener el TC de mercado del día (17.48 →
4,405.03) por ser la fuente "más objetiva". Se descartó, en aplicación directa de D-01 ("el
banco manda: Banco > V7 > ERP"): cuando la aritmética del banco da un número exacto y limpio
que cuadra con los movimientos reales, ese número es la verdad — no una cifra de mercado que
no coincide con lo que de verdad se movió.

**Consecuencia operativa permanente.** "El banco manda" (D-01) aplica también al **tipo de
cambio**, no solo a montos y fechas: ante un conflicto entre un TC de mercado y la aritmética
exacta de un movimiento bancario real, gana el banco.

---

### D-25. Costo de banco sin carga identificada = tipo Proveedor, sin aplicar

**Qué se decidió.** Un costo ya pagado desde el banco cuya carga todavía **no** se ha
identificado se captura con tipo `Proveedor` y **sin aplicar** a ninguna carga. Cae en
"Partidas por aplicar" del balance y no toca el P&L hasta que se asigne. Caso concreto: flete
BBA (3,250) y aduana Suárez (50).

**Por qué.** El dinero ya salió del banco — no capturarlo dejaría el banco desconciliado.
Pero aplicarlo a una carga adivinada (o parquearlo en el cajón genérico de "Otros gastos")
ensuciaría la utilidad de un embarque que quizás no es el correcto — el mismo tipo de error
que D-12/TAR-0004 ya identificó como caro de deshacer después.

**Por qué esta solución y no otra.** Se evaluó aplicarlo directo al embarque más probable por
fecha/monto aproximado. Se descartó: "más probable" no es "confirmado", y una aplicación
equivocada infla o desinfla la rentabilidad de un embarque específico de forma silenciosa —
exactamente el patrón de error que ya motivó D-22 (nunca adivinar una liga ambigua).

**Consecuencia operativa permanente.** La línea "Partidas por aplicar" del balance (hoy
−3,278.19) DEBE tender a cero conforme se identifican las cargas correctas — no es un saldo
normal, es trabajo pendiente visible. Ver `PLAN-MAESTRO.md`, SIGUIENTE E48, para el estado de
estos dos casos puntuales.

---

### D-26. Costatropical Papayas Inc (81) NO es Papayas & More (40)

**Qué se decidió.** Se dio de alta Costatropical Papayas Inc (id 81, clase `operativo`) como
entidad separada de Papayas & More (id 40, clase comercial). Se corrigió la atribución del
pago de 32,950 MXN del 24-jul, que estaba cargado a la contraparte equivocada.

**Por qué.** Son roles de negocio distintos aunque el nombre se parezca: Costatropical
**presta el servicio** de reempaque y envío (proveedor operativo); Papayas & More es cliente
**y** proveedor de fruta (comercial, con su propio trueque — ver D-20). Atribuirle a Papayas &
More un pago que en realidad era de Costatropical habría distorsionado el neteo de trueque de
Papayas & More.

**Por qué esta solución y no otra.** Se evaluó registrar el pago bajo Papayas & More con una
nota aclaratoria ("en realidad es de Costatropical"). Se descartó: una nota no evita que el
pago siga sumando al saldo/aging de la contraparte equivocada en todas las vistas que agregan
por contraparte — la única forma de que el dato sea correcto en todas partes es que viva bajo
la contraparte correcta desde el origen.

**Consecuencia operativa permanente.** Al dar de alta una contraparte con nombre parecido a
una ya existente, confirmar el **rol de negocio** (cliente/proveedor de fruta vs. proveedor de
servicio) antes de asumir que es la misma entidad o una variante de nombre.

---

### D-27. El proveedor de Alpine (coles) es Agrícola Omega (7), NO Paumar

**Qué se decidió.** Se confirmó y corrigió: el proveedor real de las cargas AX de Alpine
Fresh (coles) es **Agrícola Omega (id 7)**. Paumar (id 2) quedó mal marcado en su momento como
comercial-solo-cliente; a Paumar no se le compra directo. Se resolvió P-085 (AX0013)
reasignándole el proveedor correcto, bajando la flag que llevaba parqueada la duda.

**Por qué.** El V7 de Samuel confirma **15 de 15 cargas** de Alpine bajo Omega — no hay una
sola carga real de Alpine cuyo proveedor sea Paumar. La discrepancia Paumar-vs-Omega venía
parqueada como duda sin resolver (flag en P-085); el cotejo contra el V7 la cierra en
definitiva.

**Por qué esta solución y no otra.** Se evaluó dejar la flag abierta hasta que Miguel o
Samuel confirmaran manualmente carga por carga. Se descartó: el V7 ya trae la evidencia
completa (15/15 sin excepción) y no hay ninguna carga que contradiga el patrón — no hacía
falta más verificación para resolverlo con confianza.

**Consecuencia operativa permanente.** Toda carga AX de Alpine debe tener a Agrícola Omega
(id 7) como proveedor. Si aparece una nueva carga de Alpine con Paumar como proveedor, es
sospechosa por default — revisar contra el V7 antes de capturarla así. Sistema en **0 flags
abiertas** tras esta resolución (aplicaciones: 180).

---

### D-28. Un cobro/pago sin carga específica es abono a cuenta, se aplica FIFO

**Qué se decidió.** Se corrigió el pago Yaca de 10,000 (mov 365): estaba aplicado directo a
P-080; se quitó de ahí y se aplicó **FIFO** a la deuda más vieja de Las Brisas primero
(salda P-079 del 15-jul; el resto va a P-080).

**Por qué.** Miguel confirmó que es un abono a cuenta del proveedor, no un pago dirigido a
una carga específica. El memo del wire decía *"CARGA 1492"*, pero esa referencia es solo
texto documental del banco, no una instrucción de aplicación — el criterio correcto es FIFO
(la más vieja primero), el mismo ya establecido para Crystal Valley (D-12).

**Por qué esta solución y no otra.** Se evaluó dejarlo aplicado a P-080 tal cual sugería el
memo. Se descartó tras confirmar con Miguel: aplicar por memo en vez de por antigüedad habría
dejado la carga más vieja (P-079) con saldo abierto de forma artificial, mientras una más
nueva quedaba saldada de más — exactamente el riesgo que D-12 ya identificó para cualquier
contraparte que abona a cuenta.

**Consecuencia operativa permanente.** Un memo de wire con una referencia a una carga NO es
instrucción de aplicación por sí sola — confirmar con el pagador/cobrador si es abono a
cuenta (FIFO) o pago dirigido antes de aplicar. Mismo criterio ya vigente para Crystal Valley
(D-12), ahora extendido a Las Brisas/Yaca.

---

### D-29. folio ERP ≠ id_v7: secuencias distintas, cotejar por P.O./id_v7

**Qué se decidió.** Se confirmó que P-079/P-080 SÍ son de Las Brisas/Yaca — el folio del ERP
(P-079) y el id_v7 (P-074) son secuencias **distintas y no alineadas**, y esa diferencia de
número NO es un error de datos. El hallazgo A-03 de la auditoría (Fable) es un duplicado de
catálogo, no una mala atribución.

**Por qué.** Un número de folio distinto entre ERP y V7 podía leerse como señal de que la
carga estaba mal capturada. Se confirmó que no: es exactamente el patrón ya documentado en
D-09 / CLAUDE.md regla 11 (28 de 70 embarques con folios no coincidentes) — folios distintos
entre sistemas es la norma, no la excepción.

**Por qué esta solución y no otra.** Se evaluó seguir investigando si había una mala
atribución real detrás del hallazgo A-03. Se descartó: el cotejo por P.O./id_v7 (la llave
correcta, D-09) confirma que P-079/P-080 sí pertenecen a Las Brisas/Yaca — perseguir el
número de folio como si fuera la llave habría sido repetir el error que D-09 ya previene.

**Consecuencia operativa permanente.** Reafirma D-09: cotejar SIEMPRE por P.O./id_v7, JAMÁS
asumir que folio ERP = folio V7. A-03 queda cerrado como falso positivo de auditoría
(duplicado de catálogo) — **no re-perseguir**.

---

## E46 (cierre) — 2026-07-25 · Plan de flujo vs presupuesto, días de pago, PRJ-005 y cuenta virtual Samuel

### D-16. Plan de flujo y presupuesto son tablas distintas a propósito

**Qué se decidió.** `proyecto_flujo_plan` (plan de flujo, sembrado en E44) y `presupuesto`
(lo que consume la pantalla "Presupuesto del proyecto") **NO se unifican**. Se construyeron
`v_proyecto_flujo` y `v_proyecto_flujo_pico` directamente sobre `proyecto_flujo_plan`, sin
mover ni un renglón hacia `presupuesto`. Opción B, de las dos evaluadas.

**Por qué.** Son dos preguntas de negocio distintas. El plan de flujo es la **exposición de
tesorería** del proyecto mes a mes (cuánto desembolsa y recupera Plein, con su pico y su
cruce a positivo) — vive y muere con la línea de crédito. El presupuesto es el gasto **blando
y discrecional** del proyecto (viáticos, QC en campo, asesoría, legal) — se captura aparte y
no tiene curva acumulada ni pico. Fusionarlos habría mezclado un pasivo financiero con un
gasto operativo bajo una sola tabla, complicando ambos.

**Por qué esta solución y no otra.** Se evaluó la Opción A: migrar las 110 filas de
`proyecto_flujo_plan` a `presupuesto` y que una sola pantalla/tabla sirviera para todo. Se
descartó porque `presupuesto` no tiene columnas para curva acumulada por capa, pico ni cruce
a positivo — habría requerido ampliar su esquema para un uso que no le corresponde, y habría
perdido la separación conceptual entre "cuánto le debo a la línea" y "cuánto gasto en
operar el proyecto".

**Consecuencia operativa permanente.** La ficha de Proyectos muestra dos secciones
separadas y con subtítulo aclaratorio ("Presupuesto de gastos del proyecto... Es distinto
del plan de flujo de arriba") para que nadie confunda una `presupuesto` vacía con un plan de
flujo faltante. Si en el futuro se necesita presupuesto POR MES capturado contra el mismo
plan de flujo, es una tabla/vista nueva, no una migración de esta.

---

### D-17. Días de pago se miden desde `f_embarque`; gap = prom − contratado

**Qué se decidió.** Vista nueva `v_dias_pago_observado`: por cliente, sobre embarques
**cobrados completos** (saldo_cxc = 0), calcula `dias_prom`/`dias_mediana`/`dias_min`/
`dias_max` de días transcurridos **desde `f_embarque`** hasta el cobro, y los compara contra
`dias_contratado`. `gap = dias_prom - dias_contratado` (positivo = paga más lento que lo
contratado).

**Por qué.** Es el insumo del futuro flujo proyectado 30/60/90: hoy TODOS los clientes están
capturados con 15 días de crédito provisionales, que no reflejan la realidad de cobro. Sin
un dato observado real por cliente, cualquier proyección de flujo futuro es una suposición.
Medir desde `f_embarque` (no desde fecha de factura ni de entrega) mantiene consistencia con
el resto del sistema: la antigüedad de CxC ya se cuenta desde el embarque, no desde otro hito.

**Por qué esta solución y no otra.** Se consideró medir desde la fecha de emisión de
factura. Se descartó porque la serie de facturas es reciente (E32) y no cubre el histórico
completo de embarques cobrados que sí tiene `f_embarque`; medir desde ahí habría dejado la
muestra demasiado chica para ser confiable.

**Consecuencia operativa permanente.** El gap por cliente (con semáforo: ≤0 gris, 1-29
ámbar, ≥30 rojo) es ahora la referencia real de cuánto tarda cada cliente en pagar, y
reemplaza la suposición uniforme de 15 días el día que se construya el flujo 30/60/90.

---

### D-18. PRJ-005 re-sembrado con modelo "3 contratos" (single-layer)

**Qué se decidió.** Se re-sembró el plan de flujo de PRJ-005 (Santana — Baby Broccoli 8oz
SBB 26/27) con un modelo de **3 contratos**, sin partición entre capas: nuevo pico de
exposición **−78,820**.

**Por qué.** El modelo original (D-15, E44) separaba el desembolso en dos capas —
`plein` (lo que Plein pone y recupera) y `santana` (el gasto de campo que corre por cuenta
del productor) — para no atribuirle a Plein el pico total del modelo (−118,619) cuando su
exposición real era menor (−41,937). Al revisar el modelo de 3 contratos contra la realidad
operativa del proyecto, esa partición resultó ser el error: el desembolso real no se reparte
así entre Plein y el productor, así que separar capas inventaba una distinción que no existe
en este proyecto.

**Por qué esta solución y no otra.** Se evaluó corregir solo los montos de la partición
plein/santana manteniendo el modelo de dos capas. Se descartó: si la separación en sí es
conceptualmente incorrecta para este proyecto, remendar los números encima solo iba a
producir otro re-siembro cuando se detectara el siguiente desajuste. Re-sembrar single-layer
desde cero con el modelo correcto (3 contratos) es más limpio y no deja arrastre del modelo
descartado.

**Consecuencia operativa permanente.** Hoy **ningún proyecto usa una segunda capa** (`santana_acum`
= 0 en todos los meses de todos los proyectos). El frontend ya se ajustó para reflejar esto:
el toggle Plein/Productor/Total de la ficha de Proyectos se calcula de la serie
(`santana_acum != 0` en algún mes) y se oculta por completo cuando el proyecto es
single-layer, en vez de mostrar un chip con capa vacía o con el nombre de un productor
específico como si fuera una etiqueta genérica.

---

### D-19. Dinero que un socio pone de su bolsa = cuenta virtual + Pasivo, nunca JPM

**Qué se decidió.** Cuenta virtual nueva **SAMUEL**, excluida del banco real en `v_balance`
(mismo patrón que ya existía para JEAMS). Cuando un socio financia algo del negocio con
dinero de su propio bolsillo, se registra en esta cuenta virtual + un renglón de Pasivo (deuda
al socio) — nunca como si hubiera salido de JPM/Chase.

**Por qué.** Si ese desembolso se registrara como salida de JPM, el saldo de la cuenta real
dejaría de cuadrar contra el estado de cuenta de Chase — rompería la conciliación bancaria
que se mantiene al centavo desde E39/E43. El dinero nunca tocó el banco real, así que no
puede vivir en la cuenta que representa al banco real.

**Por qué esta solución y no otra.** Se evaluó registrarlo directo como un ajuste al saldo
de JPM con una nota aclaratoria. Se descartó: un ajuste manual al saldo bancario es
exactamente el tipo de atajo que ya causó fugas de balance en sesiones anteriores (E39/E43)
— la cuenta virtual + Pasivo es el mismo patrón ya probado con JEAMS, que blinda el cuadre
sin tocar el saldo del banco real.

**Consecuencia operativa permanente.** Ancla al cierre de E46: **deuda a Samuel 6,726.84**.
Cualquier aportación futura de un socio con dinero propio sigue este patrón — cuenta virtual
del socio + Pasivo, nunca un ajuste directo a JPM.

---

## E44 (cierre) — 2026-07-24 · Hallazgos de la revisión de la pantalla de Proyectos

### Pendiente P-01 (backend + frontend). El plan sembrado y la pantalla leen tablas distintas

Al revisar la ficha de PRJ-005 en el ERP, la sección **"Presupuesto del proyecto"** dice
**"Sin presupuesto capturado"** a pesar de que E44 sembró 110 filas de plan de flujo.

**Causa:** son dos tablas distintas.
- El plan sembrado (110 filas del modelo SBB) vive en **`proyecto_flujo_plan`**.
- La pantalla ("+ Línea de presupuesto", `fn_capturar_presupuesto`) y la vista
  `v_proyecto_presupuesto` leen/escriben en **`presupuesto`** (con `categoria_id` y `absorbe`).

No se ven entre sí. **Decisión pendiente para E45:** unificar. Recomendación inicial: mover el
plan a `presupuesto` (que ya tiene frontend de lectura y escritura, y el campo `absorbe` que
equivale a la marca plein/santana) y retirar el uso de `proyecto_flujo_plan`, O que el módulo
lea de `proyecto_flujo_plan`. Elegir uno; hoy hay plan en un lado y formulario en el otro.

**Nota de seguridad para Miguel:** el modal "+ Línea de presupuesto" es seguro de usar mientras
tanto — escribe a `presupuesto`, NO toca contabilidad ni el balance. Solo no se cruza aún con
las 110 filas sembradas.

### Pendiente P-02 (frontend, RESUELTO en E44). Folio de movimiento no posicionaba en Tesorería

El clic en un folio de movimiento (Libro de la línea / Movimientos ligados) navegaba a
Tesorería pero caía en la lista completa sin ubicar el movimiento. **Resuelto por Claude Code
el 2026-07-24:** `render(cont, parametro)` acepta `'mov:361'`, fuerza la cuenta y limpia
filtros, hace scroll + resalte temporal de 2.5s, toast si el folio no existe. Puro frontend,
ningún cambio de backend. Ver REPORTE-FRONTEND.md.

---

## E44 (continuación) — 2026-07-24 · Proyecto PRJ-005

### D-13. Los anticipos a productores son activo recuperable en el balance

**Qué se decidió.** Se agregó a `v_balance` un renglón de Activo *"Anticipos a productores
(líneas de proyecto)"* = suma de `saldo_vivo` (dispuesto − recuperado) de todos los
proyectos. El tipo de movimiento `Anticipo a productor` (grupo `financiamiento`,
`afecta_pl = false`) ya existía desde E40 pero **nunca estuvo cableado al balance**.

**Por qué.** Cuando Plein adelanta dinero a un productor (semilla, insumos), ese dinero es un
**activo recuperable**, no un gasto: se recupera al liquidar las cargas del proyecto. Sin el
renglón, cada disposición salía del banco (−) sin contrapeso en el activo, y rompía el
centinela por su monto exacto. Es el patrón "JEAMS al revés": JEAMS es pasivo (dinero que
entra y hay que devolver); el anticipo es activo (dinero que sale y hay que recuperar).

**Se descubrió al capturar PRJ-005:** el ensayo dio cuadre −6,180 (el monto de la semilla)
justo porque este renglón faltaba. Se agregó y el cuadre volvió a 0.00.

### D-14. La línea de un proyecto se registra aunque no haya crédito formal comprometido

**Qué se decidió.** PRJ-005 se creó con `monto_linea = 10,349.86` = **semilla total
presupuestada de las dos mitades** según el modelo SBB 26/27, aunque no exista una línea de
crédito formal firmada. El desembolso real de 6,180 quedó como primera disposición, dejando
4,169.86 disponibles.

**Por qué esta solución y no otra.** `fn_registrar_amortizacion` valida que la disposición no
exceda la línea, así que con línea 0 rechazaba el registro. Se evaluó dejar la semilla fuera
de la mecánica de línea (opción B), pero eso perdía el tablero "dispuesto vs. disponible" del
módulo Proyectos. Amarrar la línea al presupuesto de semilla del modelo (no al primer pago)
es más fiel: muestra cuánto falta por pagar de semilla, y se sube con `fn_editar_proyecto`
cuando José defina cuánto capital de trabajo más va a fondear.

**Dato de riesgo que quedó en la nota del proyecto:** salieron 6,180 a SEED COMPANY ARUBA pero
José solo fondeó 5,200 (movs 359/360). Los **980 de diferencia los puso Plein de su caja** —
con JPM en ~1,000, no es trivial.

### D-15. El plan de flujo de un proyecto marca quién desembolsa cada renglón

**Qué se decidió.** Se sembraron 110 filas en `proyecto_flujo_plan` para PRJ-005 desde el
modelo SBB 26/27 (12 meses, jul→jun, dos mitades: Crystal confirmada + "sin contrato"). Cada
renglón lleva en su `nota` **quién lo desembolsa**: `plein` o `santana`.

**Por qué.** El modelo mezcla dos capas de capital de trabajo: el gasto de campo (renta,
cosecha, plántula) que corre por cuenta del **productor Santana**, y lo que **Plein** pone
(semilla, empaque, maquila, fletes, aduanas) y recupera (cobro de Crystal). Sin la marca, el
ERP creería que Plein está expuesto al pico total del modelo (−118,619 en diciembre), cuando
su exposición real es mucho menor.

**El número que importa:** la exposición acumulada SOLO de Plein toca su **pico en diciembre
2026: −41,937**, no −118,619. Cruza a positivo en mayo 2027 y termina en **+13,782** de
utilidad para Plein. Ese −41,937 de diciembre es la alerta de tesorería real: es lo que Plein
debe tener disponible ese mes o conseguir fondeado.

**La mitad "sin contrato"** se sembró con los mismos costos de campo y semilla pero **sin
cobro** — refleja el riesgo de sembrar al doble sin comprador para la segunda mitad. Prospecto
anotado: Crystal Valley Foods.

**Pendiente que generó (backend + frontend):** la tabla está sembrada pero NO hay vista
(`v_proyecto_flujo`) ni pantalla que la muestre. Hoy solo se ve consultando la base directo.
Falta la vista con curva acumulada y filtro por capa (plein/santana/total), y la pantalla en
el módulo Proyectos.

---

## E44 — 2026-07-24

### D-10. Existe una tercera modalidad de negocio: comisión pura

**Qué se decidió.** Se agregó `comision` al CHECK de `cargas.modalidad`, junto a
`margen_fijo` y `consignacion`. Se marcaron con ella las **11 cargas de Alpine Fresh**
(P-038, P-048, P-050, P-055, P-056, P-057, P-062, P-063, P-064, P-065, P-085).

**Por qué.** En esas cargas Plein **no compra el producto**: solo cobra una comisión. Por lo
tanto **costo 0 y margen 100% son CORRECTOS**, no un dato faltante. El ingreso registrado
*es* la comisión. Como el ERP solo modelaba dos modalidades, `v_placeholders` las marcaba
como patología "COSTO 0 — margen 100%" y bloqueaba el cierre de junio.

**Consecuencia operativa permanente:** **NUNCA pedirle a Miguel ni a Samuel "el costo
faltante" de una carga de comisión.** No existe.

**Qué NO se tocó y por qué.** El brief de la sesión pedía marcar también como comisión las
Kabocha de CRI (PO 1001/1002) y Carrifoods (PO 24). **Se rechazó** porque la evidencia del
mayor lo contradice: esas cargas tienen costo pagado por banco (materia prima a AKAMBARHU
por mov 318 y 331, aduanas, fletes, comisión de pick & pack). Si Plein le pagó la fruta al
productor, no es comisión: es compra. Quedaron como consignación pendiente de liquidación
real, parqueadas en TAR-0004.

**Detalle técnico que ahorra trabajo a futuro:** `v_estado_resultados` no necesitó cambio.
Su filtro ya era `IS DISTINCT FROM 'consignacion'`, así que `comision` cayó sola en la pierna
devengada (ingreso al embarque). Lo mismo `v_pl_mes_detalle` y `v_carga_detalle`. Se
revisaron las 10 vistas y 6 funciones que mencionan modalidad: ninguna clasifica mal la
comisión. `fn_crear_carga` sí requirió ampliar su whitelist.

---

### D-11. El ingreso de consignación declarado y no cobrado es un pasivo

**Qué se decidió.** Renglón nuevo en `v_balance`, sección Pasivo:
*"Ingreso de consignación declarado, no reconocido"*, calculado como la suma de
`saldo_cxc` de las cargas con `modalidad = 'consignacion'`.

**Por qué — y este es el punto importante.** El descuadre de 19,395.20 **no lo causaba la
modalidad faltante**. Lo causaba una inconsistencia estructural entre dos vistas:

- `v_cxc` **devenga**: cuenta como cuenta por cobrar cualquier carga con `ingreso_venta <> 0`,
  sin importar modalidad.
- `v_estado_resultados` para consignación reconoce **por cobro**, no por venta declarada.

Resultado: toda consignación con venta declarada y pendiente de cobro sube el activo (CxC)
sin subir el patrimonio (utilidad) → el centinela se rompe. Se verificó numéricamente: el
saldo CxC de las consignaciones no cobradas era **19,395.20 exacto**, el descuadre al centavo.
El cuadre estaba en 0.00 en E40 solo porque en ese momento todas estaban cobradas — era
suerte, no salud.

**Por qué esta solución y no otra.** Se evaluó cambiar `v_estado_resultados` para que
consignación reconociera al declarar la venta. **Se descartó:** movería 103,624.50 de ingreso
a marzo (cerrado) y otros ~82k entre abril y mayo. El renglón de pasivo logra el mismo cuadre
**sin reescribir un solo mes**, y además blinda el centinela hacia adelante: la próxima
consignación con venta declarada y sin cobrar ya no lo romperá.

**Verificación de que se auto-cancela:** cuando el cliente paga → baja CxC, sube banco (activo
neutro), baja el pasivo diferido y sube la utilidad reconocida → el cuadre se mantiene en 0.00.

---

### D-06 (ampliación). Excepción acotada de GATE 4 para `movimientos`

**Qué se decidió.** `fn_chk_periodo_cerrado` ahora permite un `UPDATE` en `movimientos` en
mes cerrado **si y solo si** lo único que cambia es `descripcion` y/o `nota`. Cualquier otra
columna (`fecha`, `tipo`, `ingreso`, `egreso`, `contraparte_id`, `cuenta_id`, `anulado`,
`proyecto_id`, `contrato_id`) mantiene el gate operando normal.

**Por qué.** Es espejo de la excepción que ya existía para `cargas` desde E36. `descripcion` y
`nota` son texto documental: por definición no pueden mover un ancla.

**Consecuencia práctica que hay que recordar:** `tipo` quedó **fuera** de la excepción a
propósito, porque cambiar el tipo sí puede mover el P&L. Por eso **reclasificar movimientos
de meses cerrados exige reabrir el mes**. Esto no es un descuido: es la razón por la que
limpiar el cajón de sastre "Otros gastos" (50 movimientos repartidos en 7 meses cerrados)
**no es barato** y se decidió no hacerlo como proyecto aparte.

---

### D-12. Crystal Valley abona a cuenta

**Qué se decidió.** No se construye `fn_aplicar_dirigido`. El FIFO ciego de `fn_aplicar_fifo`
es el comportamiento correcto para este cliente.

**Por qué.** Confirmado por Miguel: Crystal Valley **abona a cuenta**, no paga factura por
factura. `fn_aplicar_fifo` reparte por antigüedad (`f_embarque ASC, folio ASC`) sobre las
cargas del cliente con saldo > 0 y sin flag, que es exactamente lo que corresponde a un abono
a cuenta.

**Cuándo revisar esta decisión:** si aparece un cliente que sí paga contra factura específica.
Ahí el FIFO pondría el dinero en el embarque equivocado — los saldos totales quedarían bien,
pero la antigüedad por embarque y el aging quedarían mal. Ese día se construye la aplicación
dirigida.

---

### Hallazgos de E44 que quedaron abiertos (no son decisiones, son pendientes con dueño)

- **Movs 356 (−6,000) y 357 (−2,500):** capturados hoy como costo de P-075 y P-073, pero el V7
  los describe como *"Adelanto Kabocha"* y en E41 quedaron como hipótesis fuerte de ser las dos
  primeras disposiciones del préstamo de 150,000 a Akambarhu (PRJ-001). **No pueden ser las dos
  cosas.** Si son disposiciones: son activo recuperable, P-073 baja de 11,947 a 9,447, P-075 de
  10,797 a 4,797, y la pérdida de las dos Kabocha baja de −10,870 a −2,370. → TAR-0001.
- **Mov 318:** descripción del V7 dice *"Pick & pack Kabocha"* pero está capturado como concepto
  `Materia prima`. → TAR-0002.
- **P-075:** su `ingreso_venta` declarado (4,312.00) es idéntico a su materia prima. Huele a
  placeholder venta=costo, no a liquidación real de CRI. → TAR-0003.
- **Movs 334 (−990, "Flete carton Kabocha") y 304 (−288, "Pago fito de cocos carri foods"):**
  capturados como "Otros gastos" (indirecto) siendo **costo directo** de embarques, y sin aplicar
  a ninguna carga. Inflan el gasto operativo y hacen ver esos embarques más rentables de lo que
  son. El 334 cae en julio (abierto); el 304 en junio (cerrado). → TAR-0004.

---

## Cómo se agrega una entrada nueva

Al cierre de cada sesión de backend, arriba de este archivo:

```
## E<N> — <fecha>

### D-<nn>. <Título de la decisión en una línea>

**Qué se decidió.** <El cambio concreto: tablas, vistas, RPCs, filas afectadas.>

**Por qué.** <El razonamiento. Si hubo evidencia numérica, va aquí con las cifras.>

**Por qué esta solución y no otra.** <Las alternativas que se evaluaron y por qué se
descartaron. Esta sección es la que más valor tiene dentro de seis meses.>

**Consecuencia operativa permanente.** <Qué hay que recordar o dejar de preguntar.>
```

Y se actualiza el índice de arriba.


---

## E71–E72 — 2026-07-31 · Reconciliación V8 (Fases 1-3) y rumbo de C.2 (Lote)

### D-61 (E71). Reconciliación V8, Fase 1 (Chase) + Fase 2 (conceptos)
- El pivote Chase del V8 = suma cruda EXACTA (846,879.60 / −830,890.31 / 15,989.29); sin wash
  interno en la pestaña Chase (a diferencia del FRX histórico).
- ERP JPM (107-374) y V8 (107-941) contiguos, sin huecos. Solape 268: folios **363-368 son un
  REORDEN de folio** (mismo conjunto de montos, cero impacto — confirma "cotejar por contraparte,
  nunca por folio"); 28 Types distintos V8↔ERP = reclasificaciones ya decididas y horneadas en
  anclas (Hanna, viáticos Samuel, wash AJUSTE, cartón, anticipos), NO son errores.
- "Bloque nuevo" 375-941 = **560 filas 100% vacías (padding de la hoja)** + **7 movimientos reales
  (375-381)**, que netean +9,113.36 = exactamente 15,989.29 − 6,875.93. Capturados: 375 Akambarhu
  −15,000 Anticipo→PRJ-001 (dispuesto 25k→40k) · 376 JEAMS +15,000 Financiamiento externo (back-to-back
  6.2%) · 377 P&M +10,000 Cliente (a carga 1491/P-079 consignación, **SIN aplicar**) · 378 Samuel
  −415.37 Viáticos · 379 Costatropical −300 Fletes · 380 ClickUp −65.94 Otros gastos · 381 Seed Aruba
  −105.33 Anticipo→PRJ-005 (8,350→8,455.33).
- **Hallazgo de proceso:** un `Anticipo a productor` como movimiento suelto FUGA el Cuadre (el activo
  se reconoce por `proyecto_amortizaciones`, no por el movimiento). El ENSAYO lo detectó (−15,105.33)
  ANTES de escribir. Corregido ligando las disposiciones vía `fn_registrar_amortizacion` (375→PRJ-001,
  381→PRJ-005). Regla incorporada a CLAUDE.md (Trampas de API).
- Fase 2 cerrada de facto: ningún tipo nuevo ni DDL (Type "Prestamo" mapea a Financiamiento externo /
  Anticipo a productor). Diagnóstico Fase 3-Cargas: **0 cargas nuevas reales** (V8 1495 = ERP P-076,
  mismo embarque 960 cajas/8-jul → evitado un doble de ~15k).

### D-62 (E72). Reconciliación V8, Fase 3 (montos carga-por-carga) — CERRADA
- Cruce por P.O. de 82 cargas vivas ERP vs 85 filas V8: **81 casan, 4 solo-V8 (sin dinero),
  1 solo-ERP.** Confirma D-61: **0 cargas nuevas reales.**
- **Única corrección de monto real: P-076** (folio ERP, PO 1490 = V8 PO 1495, mismo embarque 960
  cajas/8-jul, Las Brisas). venta 15,000→15,254.73 (`fn_editar_carga`, COALESCE) + Comisión id 331
  462.99→358.85 (`fn_editar_costo`, COALESCE). Julio ABIERTO → sin reabrir. ENSAYO que revierte
  confirmó Cuadre 0.00 antes del write real. Efecto: **CxC +254.73, CxP −104.14, utilidad +358.87.**
- Deltas restantes = **NO accionables** (verificados contra la utilidad del V8): P-077 (NGM247514)
  "Otro" 160 y P-089 (1003) Aduanas 50 **reconcilian la utilidad del V8** → ERP correcto; P-05 (101)
  venta Δ −0.03 inmaterial; P-034 (7568 Rechazo) V8 asienta venta=MP=9,540 neto 0 vs ERP en Rechazo
  sin nada (igual neto) → no inflar CxC/CxP con un rechazo.
- Solo-V8 (4): 1495=P-076 (ya cubierto); AX002/AX005 rechazos $0; CUC-0526 consig. $0. Ninguna se carga.
- Diff de estados: Alpine AX007-012 (ERP Cerrada vs V8 Entregada) → ERP MÁS adelante, dejar. Las
  entregas P-079/P-083/P-084 que el V8 marca "Entregada" tienen **fecha de entrega estimada futura**
  (5/15/20-ago = embarque+21d; hoy 31-jul) → aún en tránsito, NO entregar hasta fecha real. P-035
  (7569 Candy Fresh): V8 Rechazo con ingreso 7,808.69 y pérdida −1,201.31 vs ERP Entregada → conflicto.
- **DECISIÓN DE PROCESO (Miguel, E72): la reconciliación V8 se CIERRA aquí.** De aquí en adelante
  Miguel captura las actualizaciones directo en el ERP y verifica Cuadre=0; casos especiales (anticipos
  vía `fn_registrar_amortizacion`, liquidaciones de consignación) puntuales. NO se reconcilia más por
  sesión. Captura directa / puntual (operación normal, NO parkeados en plan): entregas reales
  P-079/P-083/P-084; liquidación P-079 + mov 377 (P&M 10,000; arrastra trueque D-42); Kabocha
  P-073/P-075 (Akambarhu/D-59); conflicto P-035 Candy Fresh; flete mov 379 → P-077. Pestañas
  Ingresos/Egresos/Traspasos/Nómina: diff no abierto (grueso ya en Fase 1); si se necesita, chat dedicado.

**ANCLAS E72:** CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · JPM 15,989.29 · JEAMS −52,872.00 ·
movs_jpm 275 · folio_max_jpm 381 · fecha_max_jpm 2026-07-31 · aplicaciones 189 · cargas 82 vivas
(89 tot) · flags 1 · revenue_models 4 · sales_orders 74 · sales_order_cargas 73 · seg 0/0/0 ·
anticipos 48,455.33 · finext 45,000 · PRJ-001 dispuesto 40,000 · PRJ-005 dispuesto 8,455.33.

### D-63 (E72). Rumbo de C.2 redefinido: el LOTE es el eje de compra, no la OC ni la Carga (build pendiente)
- **Descubrimiento con socios (Miguel, E72), leyendo ERP_1 + capturas del ERP en vivo:** el ancla del
  lado-compra NO puede ser la OC/PO del proveedor (a veces NO llega PO) ni la Carga actual (tiene un
  solo `cliente_id`/`producto_id` → no representa "1 carga física repartida a varias ventas"). El ancla
  estable es el **Lote**, que ya se autogenera como `LOTE-2026-####` (`lote_serie` + `cargas.lote`,
  visible en prod).
- **Caso que lo obliga (Miguel):** mismo producto, una sola carga física (ej. 20 palets en un camión),
  **dos ventas** — 10 palets a un cliente y 10 a otro. El split es **por cantidad**, no por producto.
  La carga "1 cliente/1 producto" de hoy no lo modela.
- **Decisión (aprobada):** promover el **Lote a entidad de compra propia = nuestra OC** (una sola
  entidad): auto-ID `LOTE-####`, `proveedor_id`, cajas/palets recibidos, **PO del proveedor OPCIONAL**
  (dato, no ancla), soporte de **varias líneas de producto** (caso base 1). Los **costos cuelgan del
  Lote** (no del cliente). El enlace comercial es **`lote_ventas` = Lote ↔ sales_orders con
  cajas/palets asignados** (m:n) — ahí viven los 10+10. La utilidad por venta sale del reparto ×
  Revenue Model del SO.
- **Es el Modelo de Dos Ejes ya aprobado (D-45):** "el Lote manda el costeo, la Orden de Venta manda
  lo comercial". No es cambio de rumbo — es separar lo que la Carga hoy tiene aplastado.
- **Construcción ESCALONADA (acordado):** paso 1 = Lote + `lote_ventas` **conviviendo** con el modelo
  actual (la carga conserva su `cliente_id`/`venta` por ahora); la migración fina del lado-venta fuera
  de la carga viene DESPUÉS, con el modelo nuevo ya probado. Cuadre 0.00 intacto en cada paso.
- **Primera decisión del build:** tabla `lotes` nueva (recomendado — reusa `lote_serie` y migra los
  `cargas.lote` existentes) vs reusar `ordenes_compra` (carga semántica de documento-a-enviar que no
  calza con "lote físico recibido"). Lean: tabla `lotes` nueva; `ordenes_compra` queda como el PDF-PO
  opcional al proveedor.
- **Reemplaza el diseño previo de C.2 "SO↔OC vía carga" y el "puente directo SO↔OC"** — ambos anclaban
  mal. C.1/C.1b intactos.


### D-64 (E73). Fase C.2 construida: entidad LOTE (eje de compra) + reparto Lote↔OV + rentabilidad por lote

Rumbo D-63 construido de punta a punta (backend + datos + frontend). Dinero intacto (anclas = E72).

BACKEND (4 DDL + 2 DML, cada una con ENSAYO que revierte + verificación no-circular; seg 0/0/0 y
Cuadre 0.00 tras cada paso):
- Tablas `lotes` / `lote_items` (multi-producto) / `lote_ventas` (reparto m:n). Nacen cerradas
  (RLS + REVOKE, patrón `sales_order_cargas`).
- Contador compartido: `fn_siguiente_lote()` (owner-only) extraído de `tg_asignar_lote`; el trigger
  ahora DELEGA en él → un solo mecanismo carga+lote (`LOTE-YYYY-####` por año, mismo advisory lock).
- RPCs (gate capturar/editar, EXECUTE solo `authenticated`): `fn_crear_lote`, `fn_agregar_item_lote`
  (guard Σ items ≤ cajas), `fn_asignar_venta_lote` (guard Σ cajas ≤ cajas del lote, probado en vivo),
  `fn_desasignar_venta_lote`, `fn_anular_lote` (rechaza si hay repartos).
- Vistas: `v_lotes`, `v_lote_items`, `v_lote_ventas`.

PUENTE TRANSITORIO `lotes.carga_folio` (COMMENT en la columna): sólo para derivar costo del lote desde
`carga_costos` mientras conviven modelos (A1). Se ELIMINA en la re-ancla (`carga_costos.lote_id`). No
construir lógica estructural permanente sobre él.

MIGRACIÓN (89 lotes espejo 1:1 de las cargas): proveedor/cajas/pallets/fecha/carga_folio desde la
carga + 89 `lote_items` base. Las 7 anuladas migradas con `anulado=true` (decisión deliberada: 1:1
completo, sin folios huérfanos). `lote_serie` intacto (86/2026), reusó los strings existentes.

B2 — backfill de `lote_ventas` (73 filas): espejo 1:1 de `sales_order_cargas` (cajas_asignadas fieles).
73 lotes vivos con venta / 9 sin (FRONTERA+P-089+P-034, sin SO). Cross-check: `carga_cliente_id` vs
`so_cliente_id` = 0 discrepancias (el eje-venta concuerda 100% con el cliente legacy de la carga).

`v_lote_cadena`: Lote→reparto→OV→RevenueModel en una fila (grano = reparto; lotes sin venta via LEFT
JOIN). 89 filas.

`v_lote_rentabilidad`: rentabilidad por lote REUSANDO el reconocimiento ya vetado de `v_carga_detalle`
(consignación sin liquidar => utilidad "—"; comisión => costo 0/margen 100; margen_fijo => real).
Cross-check: util vivos 54,653.94 (com 12,259.24 / con 5,562.37 / mf 36,832.33), costo 1,210,817.31 —
idénticos a `v_carga_detalle`. Grano = lote (NO profit por-SO; el precio vive en la SO → fase pricing).

FRONTEND (Claude Code, 2026-07-31, SOLO frontend): `modulo-lotes.js` (ruta lotes, "Lotes"),
`index.html` + `estilos.css` (chip `.lote-estado`), sección "Lote" espejo en `modulo-cargas.js`/
`modulo-expediente.js` (`ERP.montarLoteCarga`). Consume las 5 vistas + 5 RPCs. Verificado node --check +
arnés navegador. NO desplegado (Miguel corre `npx vercel --prod`). `REPORTE-FRONTEND.md` actualizado.

COMPARACIÓN SILO (validación externa): la columna vertebral (PO=OC, Lot=lote, Lot Sales=reparto,
Lot Expenses=costos, PAS=consignación) coincide con Silo. Silo va adelante en: costos pegados al lote
(= nuestra re-ancla), estados de inventario por lote (ATS/sold/waste/on-hand/RTS), profit por-SO con
precio (= fase pricing). No son correcciones de rumbo, son los siguientes pasos del mismo rumbo.

PARQUEADO (próximas sesiones, arquitectura):
 1. Re-ancla de costos: `carga_costos.lote_id` + quitar puente `carga_folio` + índice UNIQUE parcial
    `lotes.carga_folio WHERE carga_folio IS NOT NULL` (evita doble-lote por el picker de puente).
 2. Fase pricing: precio en `lote_ventas` → `v_lote_rentabilidad` por-SO real (estilo Silo lot_sales);
    decidir dónde vive el P&L (lote vs item) para multi-producto.
 3. Estados de inventario por lote (estilo Silo Reconcile).

ANCLAS AL CIERRE E73 (= E72 en dinero): CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · JPM 15,989.29 ·
JEAMS -52,872.00 · seg 0/0/0. NUEVO C.2: lotes 89 (82 viv/7 anul) · lote_items 89 · lote_ventas 73 ·
lote_serie 2026=86.


---
## E74 — 2026-08-01 · Re-ancla de costos + Pricing (A1+B+C)

### D-65 (E74). Re-ancla de costos: el costo del lote sale de `carga_costos.lote_folio`, no del puente

**Qué se decidió.** Se agregó **`carga_costos.lote_folio`** (text FK→`lotes.folio`) y se hizo **backfill 1:1** de las **257** líneas de costo (biyección estricta cargas↔lotes: `cc_sin_lote=0`, 89 `carga_folio` distintos, 0 duplicados). Las **3 vistas** `v_lotes` / `v_lote_cadena` / `v_lote_rentabilidad` computan `costo_total` por `lote_folio` en lugar del puente `lotes.carga_folio`.

**Alcance = SOLO costo.** El puente hace dos trabajos en las vistas: (1) fuente de costo — **reanclado**; (2) atributos comerciales de la carga (`carga_po`, `modalidad`, `cliente`) y el P&L de venta (`ingreso/cobrado/saldo/pagado`) — **intactos**, siguen por `l.carga_folio` hasta la fase pricing. El puente `lotes.carga_folio` **sobrevive como columna** (con su índice UNIQUE parcial), ya no como fuente de costo.

**Número-preservador.** `Σ carga_costos.monto = 1,215,630.81` (idéntico tres formas: total / vía puente / con lote mapeable); **0 discrepancias** costo-por-lote vía `lote_folio` vs vía puente; Cuadre `0.00`; seg `0/0/0`; dinero E73/E72 intacto (CxC 588,061.82 · CxP 507,241.00 · JPM 15,989.29 · JEAMS −52,872.00).

**Objetos.** `carga_costos.lote_folio` + FK + `idx_carga_costos_lote_folio` · trigger `tg_carga_costos_set_lote` (BEFORE INSERT: auto-liga el costo nuevo al lote espejo no anulado; **RPCs contables intactas**; función con `REVOKE ALL FROM PUBLIC/anon`) · `ux_lotes_carga_folio` UNIQUE parcial (`WHERE carga_folio IS NOT NULL`).

**Proceso.** El ENSAYO detectó y corrigió `EXECUTE` a PUBLIC en la función de trigger **antes** del apply (seg 1→0): recordatorio de que toda función nueva nace con EXECUTE a PUBLIC y hay que revocarla.

**Frontera abierta (parqueada).** `tg_cargas_lote`→`tg_asignar_lote` sólo hace `NEW.lote := fn_siguiente_lote(...)` (rellena `cargas.lote`, **NO** inserta en `lotes`): una carga nueva **no** genera lote espejo. El trigger cubre los 89 actuales; a futuro la captura debe ser lote-first (`fn_crear_lote`) o crear el espejo al alta de carga.

### D-66 (E74). Pricing por-SO real: precio a nivel renglón (lote_ventas), P&L a nivel lote

**Qué se decidió (A1+B+C).**
- **A1 — precio a nivel renglón + multi-tranche.** `lote_ventas.precio_caja` (numeric, nullable) y se **ELIMINÓ el UNIQUE(lote_folio, so_folio)**. Razón: en Silo el **mismo lote se vende en varios renglones a precio distinto** (ej. `4-BEL-2` $19×224 y $12×672). El guard `Σcajas ≤ cajas del lote` sigue vigente. Ripple: `fn_desasignar_venta_lote` pasa a operar por **`id`** de renglón (firma nueva `fn_desasignar_venta_lote(p_id bigint)`; antes por lote+SO); `fn_asignar_venta_lote` gana `p_precio_caja`.
- **B — backfill número-preservador.** 43/73 renglones (solo **RM-002 margen** y **RM-004 buy_resell** con venta>0): `precio_caja = ingreso_venta / cajas`. **RM-001 comisión** (13) y **RM-003 consignación** (17, 4 sin liquidar) → `precio_caja` **NULL** (su revenue no es precio de venta; se reconoce como hoy). Los 73 renglones tienen **reparto completo** (Σcajas = cajas de la carga) → revenue por lote **idéntico al centavo** vs `v_carga_detalle` (**0 discrepancias**).
- **C — P&L a nivel LOTE.** Hoy **0 lotes multi-item** → el lote es efectivamente producto-nivel (como Silo). `v_lote_rentabilidad` reescrita con `CASE` por `formula_tipo`: RM-002/004 = `round(Σ(precio_caja×cajas),2) − costo_lote`; RM-001 = comisión (costo 0/margen 100); RM-003 = "—" hasta liquidar. P&L por item **diferido** hasta que exista multi-producto real.

**Objetos.** `lote_ventas.precio_caja` (43 poblados) · UNIQUE(lote,SO) **eliminada** · `v_lote_rentabilidad` reescrita (revenue/utilidad/margen del lote; `ingreso_venta` casteado a `numeric(14,2)`) · `v_lote_ventas` expone `precio_caja` + `importe` · `fn_asignar_venta_lote(...,p_precio_caja,...)` y `fn_desasignar_venta_lote(p_id)` (ambas con `REVOKE PUBLIC/anon` + `GRANT EXECUTE authenticated`).

**Verificación.** Cuadre `0.00` · seg `0/0/0` · 43 renglones con precio · 0 UNIQUE restante · `disc_costo=0` · `disc_ingreso=0` · dinero E73/E72 intacto. Muestra: LOTE-2026-0053 (margen) ingreso 65,280 / costo 61,920 / util 3,360 / 5.15% ; LOTE-2026-0040 (comisión) ingreso 1,063.8 / margen 100% ; LOTE-2026-0016 (consignación liquidada) util 0.

**Ripple de frontend (OBLIGATORIO antes de desplegar `modulo-lotes.js`).** `fn_desasignar_venta_lote` cambió de firma → el frontend debe llamar por `id` (`v_lote_ventas.id`); `fn_asignar_venta_lote` debe mandar `p_precio_caja`. Como `modulo-lotes.js` aún no está desplegado, no hay nada roto en prod.

**Parqueado.** `fn_editar_venta_lote(id, precio/cajas)` (opcional, no hecho) · estados de inventario por lote (estilo Silo Reconcile) · captura futura lote-first (ver D-65).

---
## E75 — 2026-08-02 · Estados de inventario por lote (C.2, Silo Reconcile) + deploy frontend

### D-67 (E75). Fase C.2 · Estados de inventario por lote — capa física money-neutral

**Qué se decidió (GATE con Miguel: B + money-neutral + frontera parqueada).** Cierra la trilogía del lote (costo → precio → **inventario**), paso 3 parqueado de D-64. Se construyó la capa física de inventario estilo Silo Reconcile (ATS/sold/waste/rts/on-hand), **sin tocar contabilidad**.

**Objetos.**
- **Tabla `lote_movimientos`** (nace cerrada: RLS on + `REVOKE ALL FROM PUBLIC,anon,authenticated`; patrón `lote_ventas`): `id`, `lote_folio`→`lotes.folio`, `tipo` CHECK `('merma','rts')`, `cajas` CHECK `>0`, `fecha` DEFAULT `fn_hoy()`, `motivo` NOT NULL, `nota`, auditoría (`capturado_por` DEFAULT `fn_actor()` / `capturado_ts`), soft-delete (`anulado` + motivo/por/ts). Índice parcial `idx_lote_movimientos_lote WHERE NOT anulado`.
- **Vista `v_lote_inventario`** (GRANT authenticated, anon cerrado): `folio, proveedor, po_proveedor, carga_folio, carga_po, productos, total, sold, waste, rts, on_hand, ats, anulado`. `on_hand = total − sold − merma − rts`; `ats = on_hand` (sin "hold" aún). `total/on_hand/ats` **NULL** cuando el lote no tiene cajas capturadas (1 lote) → pintar "—", nunca 0.
- **Vista `v_lote_movimientos`** (D-67b; GRANT authenticated): passthrough de la tabla para **listar** y **anular por `id`** desde el frontend (la tabla no es legible por authenticated).
- **RPCs** (SECURITY DEFINER, `SET search_path='public'`, `REVOKE PUBLIC/anon` + `GRANT authenticated`): `fn_registrar_mov_lote(p_lote_folio, p_tipo['merma'|'rts'], p_cajas, p_motivo, p_fecha DEFAULT null, p_nota DEFAULT null)` → gate `capturar`, **guard `Σ(vendido+merma+rts)+p_cajas ≤ cajas del lote`**, devuelve `on_hand`; `fn_anular_mov_lote(p_id, p_motivo)` → gate `editar`, soft-delete.

**Regla de negocio confirmada — MONEY-NEUTRAL.** Merma y RTS son eventos **físicos**: NO tocan CxC/CxP/Cuadre. En margen fijo el costo ya se reconoció al embarque, así que la merma no cambia el P&L. Si alguna vez una devolución al proveedor debe bajar CxP, es contabilidad y se hará aparte con las RPCs contables existentes, en su propio GATE — **no** entró en D-67. (Parqueado.)

**Refinamientos de diseño (avisados a Miguel).** (1) `tipo` SIN `ajuste`: un ajuste positivo rompería la invariante `Σ≤total`; unidades "encontradas" = corrección al conteo del lote, no un movimiento. (2) UNA sola RPC parametrizada por `p_tipo` en vez de dos verbos → la invariante vive en un solo lugar (DRY); el frontend pone dos botones que llaman la misma RPC.

**Verificación (ENSAYO que revierte + post-apply no-circular).** El ENSAYO probó en vivo (y revirtió): crear todo, `fn_registrar_mov_lote` merma+rts, el **guard** de sobre-ajuste (bloqueó 1200 sobre LOTE-2026-0068), la vista (`on_hand 1050`, `waste 100`, `rts 50`), y **anular** (waste volvió a 100). Post-apply: seg **0/0/0** · Cuadre **0.00** · CxC 588,061.82 / CxP 507,241.00 / JPM 15,989.29 / JEAMS −52,872.00 / cargas 82 **idénticos a E74** · `lote_movimientos` 0 filas · `v_lote_inventario` 89 filas (sold 74,810 / waste 0 / rts 0 / on_hand 5,899) · **`disc_vs_vlotes = 0`** (el `on_hand` reproduce exacto el `cajas_disponibles` de `v_lotes` mientras no hay movimientos — número-preservador). Advisor de Supabase: los objetos nuevos caen en el patrón de la casa (`rls_enabled_no_policy` INFO en la tabla; `security_definer_view` en la vista como las 124 vistas; `authenticated_security_definer_function_executable` en las RPCs como las ~95) — **cero categoría nueva**; NO aparecen en `anon_*` ni en `function_search_path_mutable`.

### D-67b (E75). `v_lote_movimientos` + deploy del frontend de lotes

**Vista detalle** (arriba) agregada al detectar el call-site: sin ella el frontend no podía listar movimientos ni obtener el `id` para anular.

**Frontend (Claude Code, SOLO frontend, 2026-08-02).** Dos piezas en `modulo-lotes.js`, verificadas con `node --check` + arnés de navegador, y **DESPLEGADAS a prod** (`npx vercel --prod`, Miguel):
1. **Sección "Inventario del lote"** en la ficha (después de "Reparto a ventas", sin tocarla): 6 indicadores (Total/Vendido/Merma/Devuelto a proveedor/On-hand/Disponible ATS, "—" en NULL) + formulario merma/RTS (Tipo, Cajas, Fecha **local** —no UTC—, Motivo obligatorio, Nota) gateado a lote vivo + `capturar` + lista de movimientos con chip `.mov-tipo` y "Anular" por fila gateado a `editar`. Lote anulado oculta todo.
2. **Ripple D-66** en "Reparto a ventas": `fn_asignar_venta_lote` ahora manda `p_precio_caja` (opcional, vacío→null) en el orden correcto; tabla con columnas Precio/caja e Importe; **"Quitar" por `id` de renglón** (`fn_desasignar_venta_lote(p_id)`) — crítico para multi-tranche (mismo SO en varios renglones). **Bug corregido de paso:** "Quitar" estaba gateado por `capturar` pero el gate real de la RPC es `editar` → separado (**Asignar = capturar, Quitar = editar**).

**Anclas al cierre E75 (= E74 en dinero).** CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · JPM 15,989.29 · JEAMS −52,872.00 · seg 0/0/0. **Nuevo C.2:** `lote_movimientos` 0 filas · `v_lote_inventario` · `v_lote_movimientos` · `fn_registrar_mov_lote` · `fn_anular_mov_lote`. Frontend `modulo-lotes.js` DESPLEGADO.

**Parqueado.** Captura lote-first (D-65, es el GATE de la siguiente tarea Fase C documental) · ajuste de CxP por RTS si algún día debe mover dinero (hoy money-neutral) · columnas On-hand/ATS en la LISTA de lotes (fase 2 frontend) · `fn_editar_venta_lote` (opcional).

---
## E76 — 2026-08-02 · Fase C documental COMPLETA (auto-espejo + factura-desde-SO + liquidación + shipping)

Sesión de cierre de Fase C (backend). Cuatro migraciones, **todas money-neutral y advisor-limpias**
(cero categoría nueva: los objetos caen en `authenticated_security_definer_function_executable`,
`security_definer_view`, `rls_enabled_no_policy` — baseline de la casa; ninguno en
`function_search_path_mutable` ni en listas anon). Anclas de dinero **EXACTAS a E75**.

### D-68 (E76). Auto-espejo de LOTE al alta de carga — cierra la frontera D-65
**Qué se decidió (GATE con Miguel: Opción A auto-espejo, parqueando lote-first Opción B).**
Hasta E75, `tg_asignar_lote` (BEFORE INSERT) sólo ponía `cargas.lote` (string) — **NO** insertaba en
`lotes`. La próxima carga capturada habría nacido huérfana (sin fila en `lotes`, sin `lote_items`, y
`fn_carga_costos_set_lote` no habría encontrado lote espejo → costo sin anclar). Se agregó trigger
**AFTER INSERT `tg_cargas_crear_lote_espejo`** (función `fn_cargas_crear_lote_espejo`, SET search_path,
REVOKE PUBLIC/anon) que crea la fila espejo en `lotes` (folio=NEW.lote, proveedor/cajas/pallets/fecha,
carga_folio=NEW.folio, provenance=NEW.capturado_por) + `lote_items` base 1 producto. Es el **peldaño 1**
del end-state Dos Ejes (insumo directo de peldaños 5-6). **Verificación:** ENSAYO probó carga nueva →
1 lote espejo + 1 item, Cuadre 0.00, seg 0/0/0; post-apply anclas idénticas a E75. **Parqueado:**
lote-first real (Opción B) para cuando aparezca multi-producto o carga física repartida en captura.

### D-69 (E76). Factura-desde-SO — la factura se ancla a la Orden de Venta
**Qué se decidió (aditivo end-state; `facturas` tenía 0 filas → sin migración de datos).**
`facturas.carga_folio` pasó a **nullable**, se agregó **`facturas.so_folio`** (FK `sales_orders`) y CHECK
`facturas_ancla_chk` (≥1 ancla). RPC **`fn_crear_factura_desde_so(p_so_folio, p_numero)`** arma las líneas
desde **`lote_ventas.precio_caja`** (fuente canónica de precio, D-66; `sales_order_cargas.precio_caja`
está 100% NULL) vía lote→carga→producto. **Guards:** exige SO `Confirmada`/`Cerrada`; **bloquea** `pct_venta`
(consignación → se factura al liquidar) y `comision_por_caja` (comisión → Plein factura su comisión). La
ruta legacy `fn_crear_factura(carga)` queda **intacta**. `v_facturas` se reescribió INNER→**LEFT JOIN**
(para que la factura SO sin carga aparezca) + `po`=COALESCE(carga.po, SO.customer_po) + `so_folio` al final
(17→18 cols). Documental, **money-neutral** (la factura no mueve CxC; el ingreso vive en cargas/cobros).
**Verificación:** ENSAYO facturó SO-0001 → factura anclada al SO, carga_folio NULL, línea desde precio real,
aparece en `v_facturas`, Cuadre 0.00, seg 0/0/0. **Pendiente frontend (Claude Code):** cablear el botón +
mostrar `so_folio`; y los 74 SO están en Borrador → confirmar antes de facturar.

### D-70 (E76). Liquidación al productor auto-poblada desde la venta real
**Qué se decidió (GATE con Miguel — modelo de negocio confirmado, se trabaja con los números tal como salieron).**
El módulo PACA ya existía y ya encodeaba las reglas correctas (comisión 10% default; excluye `Comisión`
—Plein/Hanna— y `Materia prima` de deducciones; materia prima → `anticipos`; auto-carga deducciones desde
`carga_costos`). Lo único manual era el gross. Se agregó **`fn_crear_liquidacion_auto(p_productor_id,
p_cargas[], p_comision_pct?, p_nota?)`** que: (1) computa **bruto = Σ `cargas.ingreso_venta`** (la venta de
consignación vive ahí, NO en `lote_ventas` que es NULL en consignación por D-66); (2) reusa
`fn_crear_liquidacion` (toda la lógica de comisión/deducciones/anticipos, DRY); (3) auto-pobla
`liquidacion_ventas` (1 línea/carga: producto, lote, unidades=cajas, precio_unit=ingreso/cajas,
monto=ingreso); (4) `fn_recalc`. **Guard:** consignación + ya liquidada (`ingreso_venta>0`) + del productor.
**Money-neutral** (account-of-sales, no toca CxC/CxP/Cuadre). **Ejemplo Cornejos {P-019,P-021,P-043,P-047}:**
bruto 125,195.70 / comisión 12,519.57 (10%) / deducciones 15,709.04 / neto 96,967.09 / anticipos 83,492.99.
**Aviso operativo:** al liquidar de verdad, P-019 (historial LQ-0001) y P-043/P-047 (Akambarhu D-59) traen
banderas — revisar antes de emitir.

### D-71 (E76). Shipping / Embarque físico (Load) — cierra Fase C
**Qué se decidió (GATE con Miguel + investigación de industria produce MX→USA).**
Hallazgo del V8: Plein **no captura NINGÚN dato de logística hoy** (la hoja de Cargas es 100%
comercial/financiera). La industria de produce modela el **"Load"** (camión/contenedor que cruza,
consolida 1+ órdenes/lotes) con Carta Porte/CCP, cadena de frío y cruces (Nogales/Otay/Laredo). Decisión:
entidad nueva **Embarque físico / Load** (NO campos sueltos en la carga; y `envios` ya está ocupado por la
bitácora de correo). Tablas `loads` (folio `LD-YYYY-####`, campos logísticos **TODOS opcionales**:
transportista, contenedor/placas, booking, cruce, fecha_cruce, temperatura_c, recorder, BOL/Carta Porte,
pallets, estado `en_origen→en_cruce→en_transito→entregado`), `load_cargas` (m:n load↔carga,
consolidación-ready) y `load_serie` (numeración) — **nacen cerradas** (RLS + REVOKE). RPCs `fn_crear_load`
(+p_cargas[])/`fn_asignar_carga_load`/`fn_desasignar_carga_load`/`fn_editar_load` (COALESCE)/`fn_anular_load`.
Vistas `v_loads` (n_cargas, cajas_total, cargas) / `v_load_cargas`. **Documentos:** entidad extendida a
`load` (BOL/packing list/fitosanitario/FDA vía el módulo existente). **Money-neutral** (el flete sigue como
costo en `carga_costos`; el load es registro logístico, no financiero). **Verificación:** ENSAYO consolidó
2 cargas (P-021+P-076 → cajas_total 2403) en LD-2026-0001, editar/desasignar/anular OK, doc `load` OK,
Cuadre 0.00, seg 0/0/0. **Opcional parqueado:** Packing List / BOL imprimible (plantilla frontend).

**Anclas al cierre E76 (= E75 en dinero).** CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · JPM 15,989.29 ·
JEAMS −52,872.00 · aplicaciones 189 · cargas 82 · flags 1 · RM 4 · SO 74 (Borrador) · SO_cargas 73 ·
seg 0/0/0 · lotes 89 (82v) · lote_ventas 73 (precio 43) · carga_costos 257 (Σ 1,215,630.81) ·
lote_movimientos 0 · **facturas 0 · liquidaciones 1 (anulada) · loads 0** (nuevos). Advisor: search_path_mutable
10 (sin cambio) · authenticated_secdef 102 · security_definer_view 127 · rls_enabled_no_policy 64 · anon 1.

**FASE C DOCUMENTAL = COMPLETA (backend).** Flujo SO→OC→Lote→Envío(Load)→Factura→Liquidación→Profit entero.
Siguiente hito (fuera de C): peldaño 3 (costo nativo al lote) → re-anclaje de la venta al SO (money-mover).


### D-72 (E77): Costo nativo al lote - carga_costos.lote_folio NOT NULL
- El lote es el padre OBLIGATORIO del costo: `lote_folio SET NOT NULL` (257/257 poblado; toda carga viva
  tiene lote espejo vivo; fn_crear_carga inserta carga->lote espejo [D-68] antes de los costos).
- `fn_carga_costos_set_lote` endurecido (+SET search_path='public', RAISE COSTO_SIN_LOTE si no resuelve).
- `v_cxp_proveedor_atribuido` re-anclado VIA LOTE (filtro anulado + grano por lote_folio->lotes);
  identico al centavo (1,170,414.05 = 1,170,414.05; 0 desalineado). Contrato 8 cols intacto.
- `v_cxp_lote` nueva (CxP por lote x proveedor).
- P3.2 (soltar carga_folio NOT NULL) POSPUESTO a peldano 6 (captura lote-first + barrido de lectores).
- Money-neutral (Cuadre 0.00, dinero = E76). Advisor: search_path 10->9, secdef_view 127->128.

### D-73 (E78): Detector venta por ejes (peldano 4a)
- `v_venta_ejes` (por carga: ingreso eje-carga vs eje-SO/lote + delta + estado_reancla) + `v_venta_ejes_resumen`.
- estado_reancla: CONCILIADO (SO con precio) / ESPEJO (comision/consignacion, sin precio de lote) /
  SIN_SO / DIVERGE (alarma abs(delta)>0.005).
- Hallazgo: delta 0 POR-CARGA en las 82 - el eje-SO es espejo exacto del eje-carga. El flip 4b (CxC al
  eje-SO) espera captura lote-first + SO confirmadas. Money-neutral. Advisor secdef_view 128->130.

### D-74 (E79): Clasificador determinista de Revenue Model - RESUELVE D-50 SIN SOCIOS
- Regla: comision->RM-001 . consignacion->RM-003 . margen solo-producto->RM-002 . margen con costo extra
  (logistica o comision pagada)->RM-004. Vista `v_rm_sugerido_carga`.
- Hallazgo clave: los 73 SO existentes YA cumplen la regla (A_CORREGIR=0). Ratifica todo y asigna los 9 SIN_SO.
- RM-002<->RM-004 = mismo P&L en v_lote_rentabilidad -> clasificar es money-neutral y reversible (etiqueta, no dinero).
- FRONTERA (7, producto+comision) -> RM-004: la comision pagada es costo aterrizado, no modelo hibrido.

### D-75 (E79): Backfill 7 SO FRONTERA
- P-059/066/074/078/082/083/084 (Crystal Valley, esparrago, programa 9, $36/caja exacto).
  fn_crear_so (RM-004) + fn_asignar_carga_so + fn_asignar_venta_lote -> SO-0075..0081 (Borrador).
- Detector: SIN_SO 9->2, CONCILIADO 43->50, delta 0. Money-neutral.
- Excepciones fuera del backfill: P-034 (wash, D-58) y P-089 (flag abierto) - con motivo.

### D-76 (E79): Reconocimiento de ingreso por modelo (spec del flip 4b) + rename de RM
- Tres mecanicas de ingreso: (1) Margen/Buy&Resell = precio(lote) x cajas al embarcar; (2) Fixed Fee (Alpine)
  = cuota FIJA por embarque (NO per-caja), a la venta; (3) Consignacion (CRI) = Plein es el FRENTE, cobra el
  GROSS COMPLETO del reporte del cliente AL LIQUIDAR (timing), costos por acuerdo con el productor via
  contraparte_id por linea, el 10% es utilidad OBJETIVO no formula.
- Confirmado por Miguel: en CRI el ingreso registrado ES el gross completo de Plein (margen ~15-20%, varia
  por acuerdo y FX). `ingreso_venta` actual = CORRECTO. Money-neutral, nada que corregir en dinero.
- Rename (formula_tipo INTACTO): RM-001 -> 'Fixed Fee per Shipment'; RM-003 -> 'Margin (Consignment Timing)'.
  descripcion de ambos actualizada con la spec. Money-neutral (ingreso eje-lote 1,224,484.40 sin cambio).
- Pendiente socios (solo taxonomia, no dinero): validar estos dos nombres.

### D-77 (E80): Higiene de seguridad — REVOKE EXECUTE en 5 funciones de trigger (cierra anon_security_definer)
- get_advisors destapo anon_security_definer_function_executable=1: `tg_asignar_lote()` (SECURITY DEFINER)
  ejecutable por anon via /rest/v1/rpc/. Al barrer, 5 funciones de trigger tenian EXECUTE a PUBLIC heredado
  del default (nunca se les hizo REVOKE al crearlas): tg_asignar_lote (definer), tg_evento_carga_inmutable,
  tg_evento_valida, tg_liq_hijas_inmutables, tg_liquidacion_inmutable (las 4 invoker).
- Fix: REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated en las 5. Las funciones de trigger se disparan por
  la maquinaria del trigger, NO por el EXECUTE del llamador -> los triggers siguen funcionando identicos.
- Money-neutral (REVOKE puro). ENSAYO revertido: anon_exec f/f/f/f/f, Cuadre 0.00, seg 0/0/0.
- Advisor: anon_secdef 1->0; authenticated_secdef 102->101; search_path 9 y secdef_view 131 SIN cambio.
- No era de E80 (frontend); venia de E73/E66/P-B. Baseline E79 no rastreaba esta categoria.

### D-78 (E80): A-12 resuelto — etiqueta [VENTA=COSTO CONFIRMADO] en P-019 + excepcion de gate para nota_revision
- Diagnostico: P-019 (consignacion, RODRIGUEZ PRODUCE, marzo, Cerrada) tiene venta = costo = 21,948.00
  exactos -> margen 0 REAL. La nota [E26] "margen 672" quedo STALE: en E60 se atribuyeron Aduanas Suarez
  530.73 + In&Out Agricooling 141.27 = 672 exactos, que consumieron ese margen. Costos banco-atribuidos:
  MP Cornejos 11,141.27 + Comision Luis Alvarez 5,334.73 + Fletes BBA 4,800 + Aduanas 530.73 + In&Out 141.27.
- CORRECCION de premisa: A-12 NO destrababa julio. fn_cerrar_periodo lee SOLO el renglon del mes; P-019
  cuenta en MARZO (su embarque). Julio placeholders=0 (bloqueado por 5 consig sin liquidar + 5 cargas sin
  cerrar + 4 movs). A-12 limpia el UNICO placeholder del sistema y deja marzo cerrable=true.
- Mecanismo: marzo cerrado congelaba nota_revision. Se DESCARTO reabrir/recerrar (fn_cerrar_periodo reescribe
  el snapshot con v_anclas de HOY -> corromperia el historico de marzo). Se anadio excepcion acotada al gate:
  quitar el congelado de nota_revision en la rama `cargas` (texto, nunca contable) -> habilita las etiquetas
  de confirmacion D-39 en meses cerrados. Patron E44/E59.
- ENSAYO revertido: nota_revision pasa; un cambio de ingreso_venta en mes cerrado SIGUE bloqueado; Cuadre
  0.00; seg 0/0/0.
- Resultado: v_placeholders 1->0; marzo cerrable=true; dinero EXACTO (CxC 588,061.82 / CxP 507,241.00 /
  Cuadre 0.00). Money-neutral. Advisor sin cambio (gate sigue SECURITY DEFINER con search_path=public, anon
  sin EXECUTE) -> baseline 9 / 131 / anon_secdef 0.
- PARQUEADO (fuera de A-12, para criterio de Miguel): la comision Luis Alvarez de 5,334.73 (24% del bruto) es
  lo que deja a Plein en margen 0 en esta consignacion. Si algun dia se revisa esa clasificacion, es reabrir
  marzo + mover dinero -> decision aparte.

### D-79 (E80): Confirmados 57/80 SO + SO-0074 cancelado; 23 (RM-001/RM-002) parqueados por params
- fn_confirmar_so solo checa >=1 carga, PERO el trigger tg_valida_so_params exige params del modelo al pasar
  a Confirmada: RM-001->comision_por_caja . RM-002->precio_compra+venta_caja . RM-003->pct_comision . RM-004->nada.
  (El ENSAYO lo destapo antes de tocar nada.)
- Backfill E70 dejo pct_comision=10 a los 17 RM-003, pero NUNCA cargo comision/precios a RM-001(13)/RM-002(10).
- Confirmados 57 (RM-003 17 + RM-004 40). SO-0074 (RM-001, Northgate, sin carga, capturado por PP02-JM el
  31-jul = prueba de Juan) cancelado con fn_cancelar_so (soft, serie intacta). Money-neutral (SO no tocan
  contabilidad, D-60): CxC 588,061.82 / CxP 507,241.00 / Cuadre 0.00 EXACTOS, seg 0/0/0.
- PARQUEADO (sub-paso 3b): poblar params de los 23 y confirmarlos. RM-002: precio_compra=costo/cajas,
  precio_venta=venta/cajas (derivable). RM-001: OJO D-76 lo reetiqueto "Fixed Fee per Shipment" (cuota FIJA
  por embarque, NO por caja) pero el param sigue siendo comision_por_caja (per box) + formula_tipo
  'comision_por_caja' -> tension de diseno a resolver ANTES de poblar. Requiere criterio + GATE.


---

### D-80 (E81) — RM-001 modelado como "Fixed Fee per Shipment" (cuota_fija_embarque)

**Hallazgo (con datos):** la comisión de Alpine es una **cuota FIJA por embarque**, no por caja
(misma cuota $1,095.20 en 712 y en 1,700 cajas; $764.52 en 1,912 y 1,356). El param `comision_por_caja`
(por-caja) tenía la forma equivocada. Confirma la tensión de diseño anotada en D-76.

**Decisión (Opción A1, GATE aprobado):**
- Nueva columna `sales_orders.cuota_fija_embarque numeric`.
- `tg_valida_so_params`: RM-001 (formula `comision_por_caja`) ahora **exige `cuota_fija_embarque`** al confirmar
  (ya no `comision_por_caja`); nuevo cross-guard: `cuota_fija_embarque` solo aplica a RM-001.
- `fn_crear_so`: +param final `p_cuota_fija_embarque` (DROP+CREATE, 14 args; REVOKE PUBLIC/anon + GRANT authenticated/service_role).
- `v_sales_orders`: +columna `cuota_fija_embarque` al final.
- **`formula_tipo` intacto** ('comision_por_caja' = etiqueta-máquina legacy; nombre humano ya es "Fixed Fee per
  Shipment"). NO se tocó `chk_rm_formula` ni el bloqueo de facturación de `fn_crear_factura_desde_so`.
  Blast radius = 4 objetos. `comision_por_caja` = deprecado-pero-legal para RM-001. Rename completo → A2 diferido.

**Poblado + confirmado:** 13 RM-001 (`cuota_fija_embarque` = `ingreso_venta` de la carga) + 10 RM-002
(`precio_compra_caja` = costo/cajas, `precio_venta_caja` = `lote_ventas.precio_caja` canónico D-66);
confirmados los 23 vía `fn_confirmar_so` → **80/80 SO Confirmada, 0 Borrador**.

**Verificación:** money-neutral (CxC 588,061.82 · CxP 507,241.00 · JPM 15,989.29 · Cuadre 0.00 exactos a E80);
seg 0/0/0; advisor baseline sin cambio. ENSAYO-que-revierte pasó los 2 tests negativos (confirmar RM-001 sin
cuota → rechazado; cuota en RM-002 → rechazado).

**P-035/Candy Fresh:** confirmado (sin duda abierta: sin flag, `nota_revision` NULL, fuera de FRONTERA/wash).
Muestra pérdida real (costo 9,010 > venta 7,808.69) — embarque de mal margen, no error.

**Ripple frontend** (pintarParams RM-001) → PENDIENTES-BACKEND.md para Claude Code.

---

### D-81 (E81) — Paso 4 Dos Ejes: captura lote-first (soltar carga_costos.carga_folio NOT NULL)

**Invariantes verificadas (datos):** `carga_costos.carga_folio` 100% redundante con `lotes.carga_folio`
(0 inconsistentes / 257) y siempre derivable (89 lotes, 0 con carga NULL). Soltar el NOT NULL no pierde info.

**Diseño (Opción B, mínimo blast radius):** en vez de dropear la columna (habría reescrito ~31 lectores),
se mantiene `carga_folio` como **espejo denormalizado auto-mantenido**:
- `ALTER TABLE carga_costos ALTER COLUMN carga_folio DROP NOT NULL`.
- Se **extiende** el trigger existente `fn_carga_costos_set_lote()` (BEFORE INSERT, D-72) a derivación
  **simétrica**: carga→lote (conservado) + **lote→carga (nuevo)** + guard de consistencia (si vienen ambos
  y no coinciden con el lote → RECHAZA) + guard "carga resolvable" (si el lote no tiene carga → RECHAZA,
  para que los lectores keyed-on-carga sigan correctos).

**Alcance (Opción A elegida):** solo peldaño 5 (habilitación esquema+trigger). La RPC/UX lote-first
(`fn_agregar_costo_lote` + pantalla) = peldaño 6, follow-on cuando el frontend la necesite. `fn_agregar_costo`
sigue carga-first sin cambios; las demás RPCs (fn_desglosar_carga, fn_crear_liquidacion, etc.) siguen carga-first
y pasan el guard.

**Verificación:** ENSAYO-que-revierte OK — insert solo-lote deriva carga (P-084) · insert carga inconsistente
RECHAZADO · insert solo-carga deriva lote (D-72 intacto) · hash y por_carga_hash idénticos · los 31 lectores
sin cambio. Post-apply: carga_folio nullable ✓, CxC 588,061.82 · CxP 507,241.00 · JPM 15,989.29 · Cuadre 0.00,
seg 0/0/0. Money-neutral, cero cambio de datos. Advisor baseline sin cambio.

---

### D-82 (E82) — Paso 5 Dos Ejes: FLIP venta→eje-SO (CxC + P&L reconocidos en el SO)

**Contexto.** Hasta E81 la CxC y el P&L nacían en `cargas.ingreso_venta` (eje-carga). Spec D-76 pide reconocer
la venta en el eje-SO. Peldaños 1/3/4a/5 ya hechos; este es el último (4b), el money-MOVER.

**Prueba de neutralidad (no-circular, desde tablas base).** Por carga, eje-carga ≡ eje-SO al centavo:
RM-001 12,259.24 · RM-002 245,226.03 · RM-003 157,849.20 · RM-004 809,149.93 = **1,224,484.40**. 0 divergencias
en 80/80 cargas con SO; las 2 SIN_SO (P-034 wash, P-089 flag) en 0 por ambos ejes.

**Diseño (Scope A, GATE aprobado).** Vista nueva `v_ingreso_reconocido` (ingreso eje-SO por `formula_tipo`,
fallback BLINDADO a `ingreso_venta`): RM-002/004 → `Σ lote_ventas.precio_caja×cajas`; RM-001 → `cuota_fija_embarque`;
RM-003 (pct_venta, reconoce al liquidar) + SIN_SO → `ingreso_venta`. Re-apuntadas SOLO `v_cxc` (ingreso + filtro
`<>0`) y la rama no-consignación de `v_estado_resultados`; la rama consignación (cobros) INTACTA. Ambas con
`COALESCE(vir, ingreso_venta)` → money-neutral por construcción. NO se tocó ni un dato; `cargas.ingreso_venta`
queda como espejo operativo. Blast radius = 1 vista nueva + 2 reescritas (columnas idénticas → los 6 dependientes
de v_cxc y el frontend intactos). Objeto nuevo: REVOKE ALL PUBLIC/anon + GRANT SELECT authenticated.

**Verificación.** ENSAYO: vir_rows=82 · CxC 588,061.82 (=old) · ER ingresos 1,220,160.40 (=old) · ER utilidad
bruta 60,938.78 (=old) · diverg_carga 0 · diverg_mes 0. Post-apply idéntico; RM-001 13/13 leyendo cuota_fija.
v_anclas CxC 588,061.82 / CxP 507,241.00 / JPM 15,989.29 / JEAMS −52,872.00 / flags 1; Cuadre 0.00; seg 0/0/0.
Advisor: secdef_view 131→132 (vista nueva, mitigada: anon sin acceso, anon_secdef 0); search_path 9 /
rls_no_policy 64 / auth_secdef 101 sin cambio.

**Resultado.** DOS EJES COMPLETOS — venta y CxC en el eje-SO, costo en el lote (D-81). Reversible (restaurar
defs previas de v_cxc/v_estado_resultados, guardadas en el chat E82). Migración `e82_flip_venta_eje_so_4b`.
Parqueado: end-state Scope B (`ingreso_venta` espejo derivado por trigger + re-apuntar las ~24 lectoras vía
`v_carga_detalle`).

### D-82b (E82) — Detector v_venta_ejes lee el eje-SO canónico

Cierra cabo de D-82: `v_venta_ejes` ahora compara contra `v_ingreso_reconocido` (antes leía
`v_lote_rentabilidad`, que para RM-001 caía a `ingreso_venta` y nunca probaba la cuota fija). Ahora RM-001 se
prueba contra `cuota_fija_embarque`. DIVERGE=0 hoy; flageará si algún eje se separa a futuro. CREATE OR REPLACE
(sin objeto nuevo). Cuadre 0.00, seg 0/0. Migración `e82b_detector_venta_ejes_lee_ingreso_reconocido`.

### D-83 (E83) — Relación programa ↔ cliente ↔ productor (read-only)

Hallazgo: `programas_comerciales` YA tiene `proveedor_id` estructurado, poblado en 11/13 y consistente con las
cargas → el "Escalón 2" (productor estructurado) ya existía; solo faltaba surtirlo. 2 vistas nuevas read-only:
- `v_programa_relacion(codigo, etiqueta, estado, producto, modalidad, via, cliente, proveedor_declarado,
  proveedor_via_cargas, n_cargas, cajas_total, ultimo_embarque, consistencia)`. `consistencia='diverge'` caza
  cuando el proveedor declarado ≠ el embarcado.
- `v_contraparte_programas(contraparte, rol[Compra/Abastece], codigo, etiqueta, producto, estado, n_cargas)`,
  llaveada por `nombre_canonico` (para la ficha del directorio).
Ambas REVOKE ALL + GRANT authenticated. secdef_view 132→134, anon_secdef 0, Cuadre 0.00.

**FLAG DE DATO — PC-013 (Alpine · Coles de Bruselas):** declara AGRÍCOLA PAUMAR pero embarcó AGRÍCOLA OMEGA.
Resuelto por **D-27 (vigente): el proveedor de Alpine coles es Agrícola Omega, NO Paumar** → el `proveedor_id`
del programa está mal; corregir a Omega desde "Editar programa" en la UI (Miguel, sin backend). Migración
`e83_vistas_programa_relacion`.

### D-83b (E83) — Recencia por contraparte (read-only)

`v_contraparte_recencia(contraparte, ultima_operacion, dias_desde, n_ops)`: `max(f_embarque)` de las cargas
donde la contraparte es cliente o proveedor. Alimenta la línea "última operación" del directorio (ámbar si
`es_cliente` y `dias_desde>30` = "cuenta enfriándose"). REVOKE ALL + GRANT authenticated. secdef_view 134→135,
anon_secdef 0, Cuadre 0.00. Migración `e83b_vista_contraparte_recencia`.


---

# SESIÓN E84 (2026-08-04) — HARDENING DE AUDITORÍA + LIMPIEZA CON REAPERTURA

> Todas las escrituras con GATE + ENSAYO-que-revierte + verificación no-circular.
> Anclas de dinero al cierre EXACTAS vs. arranque: CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · JPM 15,989.29 · JEAMS −52,872.00 · seg 0/0/0.
> Única ancla que cambió (por diseño): carga_costos 257→**255** / Σ 1,215,630.81→**1,210,817.31** (−4,813.50, A-09).

### D-84 (E84) — A-05: sello de captura en `aplicaciones`
Se agregaron `aplicaciones.capturado_por text` y `capturado_ts timestamptz`, ambas **NULLABLE sin default** (forward-only: las 189 aplicaciones históricas quedan NULL = pre-instrumentación, no se inventa autor/fecha). El sellado lo hace el trigger BEFORE `trg_aplicacion_sella_captura` → `fn_aplicaciones_sella_captura()` (INVOKER, search_path='public', REVOKE ALL de PUBLIC/anon/authenticated) con `COALESCE(NEW.x, fn_actor()/now())`. Se eligió trigger para no tocar `fn_aplicar_fifo` (regla dura). Convive con chk_aplicacion y el gate de periodo.

### D-85 (E84) — A-06 + A-06b: gate de mes cerrado invertido a WHITELIST
`fn_chk_periodo_cerrado` (SECURITY DEFINER, trigger IUD) pasó de **lista negra** (toda columna nueva se colaba) a **whitelist dinámica** (compara `to_jsonb(NEW)` vs `OLD`; permite editar mes cerrado solo si TODA clave cambiada ∈ whitelist). Whitelists:
- **cargas** (22 cols operativas): nota_revision, cajas, cajas_origen, cajas_pu_carton, cajas_nota, pallets, f_entrega, f_entrega_real, entrega_nota, entrega_por, entrega_ts, origen_operativo, id_v7, responsable, proyecto_id, contrato_id, programa_id, lote, lote_productor, f_cosecha, variedad_id, presentacion_id. **`venta_esperada` SALE de la whitelist (Opción A de Miguel) → inmutable en mes cerrado.**
- **movimientos**: {descripcion, nota}.
- **carga_costos**: {contraparte_id, nota, lote_folio} (`id` pasa a protegido).
Efecto: comportamiento preservado + **toda columna futura nace protegida** por default.

### D-86 (E84) — A-15 + A-15b: `fn_editar_factura` no cambia estado ni numero
La edición ya NO cambia `estado` (guarda que rechaza p_estado distinto del actual) ni `numero` (guarda que rechaza p_numero distinto). Emitir/cancelar/numero-oficial viven solo en fn_emitir_factura/fn_cancelar_factura. Firma idéntica (sin overload); authenticated conserva EXECUTE. 0 facturas en tabla (hueco nunca explotado).

### D-87 (E84) — A-11: `fn_editar_movimiento` deja de borrar texto en silencio
`descripcion`/`nota` ahora usan `COALESCE(param, actual)`: **NULL = "no tocar", '' = limpiar**. Antes un NULL las BORRABA. La bitácora se ajustó para no registrar borrados fantasma (compara el valor COALESCE'd). La lógica de montos/signos/tipo/aplicaciones queda IGUAL.
**Cambio de contrato (anotar en CLAUDE.md):** para esos 2 textos, NULL ya NO limpia; usar '' para limpiar.

### D-88 (E84) — A-10: concepto fuera de catálogo normalizado (reapertura marzo)
`carga_costos.id=282` (P-022, carga viva), concepto "Otros gastos" → **"Otro"** (mismo monto 3,701.00; conserva la nota/decisión Miguel 13-jul). Como P-022 está en 2026-03 (cerrado) y `concepto` no está en la whitelist de carga_costos, se **reabrió marzo** (fn_reabrir_periodo con motivo), se renombró, y se **re-cerró** (fn_cerrar_periodo). Money-neutral.

### D-89 (E84) — A-09: basura de staging FRX borrada (reapertura junio)
`carga_costos.id=42` (P-046, 2,293.50) y `id=46` (P-054, 2,520.00), concepto "Costo total (staging FRX)", ambas en **cargas ANULADAS**, mes 2026-06, $0 en vistas → **DELETE** (total 4,813.50). Sin FKs hacia carga_costos (borrado seguro). Se **reabrió junio**, se borraron, se **re-cerró**. Cuadre/CxC/CxP EXACTOS; baja el ancla carga_costos 257→255 / Σ −4,813.50 (correcto por diseño).

### D-90 (E84) — A-09/A-10 prevención: FK concepto→catálogo
`ALTER TABLE carga_costos ADD CONSTRAINT fk_carga_costos_concepto_catalogo FOREIGN KEY (concepto) REFERENCES conceptos_costo(nombre)`. `nombre` es UNIQUE (por eso el FK es válido). ON DELETE/UPDATE RESTRICT (protege el catálogo). Se aplicó DESPUÉS de limpiar las 3 filas legadas (fuera_catalogo=0), así validó limpio. Blindaje: ningún costo puede volver a nacer con concepto fuera de los 7 (Materia prima · Comision · Aduanas · In & Out QC · Fletes · Carton · Otro).

### D-91 (E84) — A-03 cola: contraparte 67 (Las Brisas) retirada
El tráfico ya estaba consolidado en AGROFEPAC (id 4): 0 cargas / 0 movs en 67. `contrapartes` no tiene columna `activo`, así que se retiró de selectores con **es_proveedor=false, es_cliente=false** + nota "FUSIONADA en AGROFEPAC (id 4). No usar." Money-neutral.

### D-92 (E84) — corrección de ancla: security_definer_view = 140 (no 135)
El ancla NORTE decía 135; el valor real es **140**. No lo causó ninguna escritura: las 5 vistas read-only de E82–E83b (v_ingreso_reconocido, v_venta_ejes, v_programa_relacion, v_contraparte_programas, v_contraparte_recencia) son security-definer **por diseño** (135+5=140). Se corrige el ancla; los demás advisors sin cambio.


---

## CIERRE E85 (2026-08-04)

### D-93 · E85 · A-07 guarda: declarar venta de consignación exige nota fuente
Se cerraron ambas puertas de escritura que permitían declarar ingreso de consignación sin fuente documentada.
- `fn_editar_carga`: guard tras el check de anulado — si `p_ingreso_venta>0` y modalidad (nueva o actual) = 'consignacion' y no hay nota (ni `p_nota_revision` ni `nota_revision` existente) → RAISE. Manda `p_nota_revision` con la fuente o usa `fn_liquidar_consignacion`.
- `fn_crear_carga`: guard antes del advisory lock — si modalidad='consignacion' e `ingreso_venta>0` → RAISE (una consignación se crea sin liquidar).
- `fn_liquidar_consignacion` y `fn_desglosar_carga` ya blindadas (exigen `p_resolucion`).
Técnica: `pg_get_functiondef` + `replace(src, ancla, guard)` con tags de dollar-quote distintos. Migración `e85_d93_guarda_a07_editar_crear_carga`. Money-neutral (anclas = E84). Pendiente: dato de Samuel para notas de P-071 y P-075.

### D-94 · E85 · PC-013 proveedor Paumar → Omega
`fn_editar_programa(p_codigo=>'PC-013', p_proveedor_id=>7, ...)`: AGRICOLA PAUMAR (id 2, `es_proveedor=false`) → Agricola Omega (id 7). Money-neutral. Resultado: 0 programas en diverge. Cosmético pendiente: etiqueta/nota aún dicen "Paumar".

### D-95 · E85 · A-14 ligar PC-006 al producto Bell Pepper (modelo producto+variedad)
El modelo es producto + variedades. "Bell Pepper Rojo" = producto Bell Pepper (id 4, `codigo_item ID-06`) + variedad Rojo. `variedades` NO lleva codigo_item; el FRX vive a nivel producto. `programas.producto_ids` referencia `productos.id`. Acciones: Miguel agregó por UI la variedad Rojo (`variedades.id=22`); `fn_editar_programa(PC-006, producto_ids=>ARRAY[4])`. Resultado: PC-006.producto_ids=[4], 0 sin producto, 0 en diverge, money-neutral.

### D-96 · E85 · P-035 rechazo Candy Fresh (PO 7569) — corregido en la capa lote_ventas
Rechazo puro (sin venta). Candy Fresh (cp 11) recibió 9,010 y devuelve por partes; reembolsos 6,505, deuda viva 2,505. La carga arrastraba "venta fantasma" 7,808.69 + estado Entregada → v_cxc reportaba 1,303.69 en vez de 2,505.
HALLAZGO CLAVE: editar `cargas.ingreso_venta` NO corrige el saldo. Para RM-002 (margen), `v_ingreso_reconocido` toma `venta_lote = Σ(lote_ventas.precio_caja × cajas)`. La venta fantasma vivía en `lote_ventas` id 95 (SO-0028, LOTE-2026-0032, espejo 1:1 del backfill C.2/E73), precio 7.0988×1100=7,808.69.
Decisión (Opción A): (1) `lote_ventas` 95 precio_caja → 9010/1100 = 8.19090909 (venta_lote=9,010, margen 0); (2) `SO-0028.precio_venta_caja` alineado; (3) `cargas.ingreso_venta` → 9,010, estado → Rechazo, nota `[VENTA=COSTO CONFIRMADO]` (2 llamadas a fn_editar_carga + p_forzar); (4) mayo reabierto → corregido → re-cerrado limpio.
Persistente: saldo_cxc P-035=2,505.00, estado Rechazo, Cuadre 0.00, seg 0/0/0, **CxC 588,061.82 → 589,263.13 (+1,201.31)**, CxP 507,241 sin cambio. Money-neutral en Cuadre. Abrió el hallazgo de espejos backfill (auditar de un jalón) → auditado y cerrado en E86 como **A-16** (D-97).


---

## CIERRE E86 (2026-08-04)

### D-97 · E86 · A-16 auditoría espejos lote_ventas — CERRADA, 0 mismatches
Barrido 100% lectura (sin GATE) sobre TODAS las cargas margen/buy_resell con lote_ventas:
comparado round(venta_lote,2) vs round(cargas.ingreso_venta,2) reusando la lógica exacta de
v_ingreso_reconocido (vlote = Σ lote_ventas.precio_caja×cajas_asignadas de lotes no anulados;
formula_tipo del revenue_model de la SO). Universo auditado = 50 cargas margen/buy_resell (de
80 con lote_ventas; las otras 30 son consignación/comisión donde venta_lote NO es la fuente de
reconocimiento → fuera de alcance por diseño). Resultado: 50/50 cuadran exacto, 0 mismatches.
P-035 (D-96) confirmado como caso único; los espejos del backfill C.2/E73 están internamente
sanos. Money-neutral (anclas E86 = E85). Cierra el candidato A-16 (NOTA: en borradores E85/E86 se le llamó A-15 por error; el A-15 real es fn_editar_factura, resuelto E84/D-86). NO se abrió lote de
correcciones. BASE declarada CERRADA / lista para uso real (Cuadre 0.00, seg 0/0/0,
placeholders 0, sin ventas fantasma, periodos correctos dic25–jun26 cerrados + julio abierto,
CxC/CxP confiables).

### D-98 · E86 · Primera liquidación PACA real emitida (LQ-2026-0002) + fix frontend fmt0
Prueba de uso real del módulo de liquidaciones (Miguel capturando en UI, no backend).
- Liquidación automática CORNEJOS HORTICOLA (proveedor 17), embarques P-019+P-021 (consignación,
  ingreso reconocido). Bruto 103,624.50 · comisión 10% = 10,362.45 (del programa; corregido vs
  LQ-0001) · deducciones 10,944.00 (Fletes 9,600 / Aduanas 788.73 / In&Out QC 555.27, precargadas
  de los costos; SIN Hanna) · neto 82,318.05 · anticipos 68,854.03 (= Materia prima) · saldo a
  pagar 13,464.02 · descuadre 0.00. Emitida → LQ-2026-0002 (id 10), inmutable, PDF account-of-sales
  con membrete de la familia.
- BUG FRONTEND encontrado en la prueba (arnés con fixtures no lo cachó): modulo-liquidaciones.js
  línea 17 no destructuraba `fmt0` de ERP (helper de comun.js, número 0-decimales) → ReferenceError
  al pintar líneas Gross Sales (usado en líneas 559/753) → ficha colgada en "Cargando…". Fix vía
  Claude Code: agregar fmt0 a la destructuración. node --check limpio, verificado en navegador,
  desplegado por Miguel (npx vercel --prod). Solo modulo-liquidaciones.js.
- Verificación post-emisión (money-mover): Cuadre 0.00 · seg 0/0/0 · CxC 589,263.13 y CxP
  507,241.00 SIN CAMBIO vs E85 → emitir liquidación de consignación es money-neutral (resume
  hechos ya en el mayor, no crea asientos). placeholders 0.

### D-99 · E86 · Regla de agenda "liquidar_productor" (aviso de liquidación PACA pendiente)
Nueva rama en v_agenda_operativa: dispara por carga de consignación con ingreso_venta>0 (cliente
ya pagó) que NO está en ninguna liquidación viva (liquidacion_cargas → liquidaciones
estado<>'anulada'). Severidad ámbar; rojo si >15 días desde COALESCE(f_entrega_real,f_entrega,
f_embarque). Money-neutral (solo lectura). Técnica: pg_get_viewdef + replace en ancla única
'WHERE p.ultima IS NULL' (preserva cuerpo byte-por-byte) → CREATE OR REPLACE VIEW; reloptions
vacías preservadas (seguridad intacta). ENSAYO-que-revierte OK (11 alertas, cuadre 0.00,
seg 0/0/0); aplicado con aserciones-red. Verificación fresca: cuadre 0.00, seg 0/0/0, CxC
589,263.13 / CxP 507,241.00 sin cambio. Auto-limpieza al crear borrador/emitir (P-019/P-021 ya
no aparecen tras LQ-2026-0002). Migración e86_d99_agenda_regla_liquidar_productor.
Backlog al cierre: Carrifoods 6 (ojo modalidad), Akambarhu 2, Agrofepac P-071 1, Cornejos
P-043/P-047 2. Todas en rojo (>15 días).

### D-100 · E86 · Akambarhu — cierre definitivo del "loophole" del préstamo
Modelo confirmado por Miguel (dueño del negocio): los préstamos/financiamiento a Akambarhu viven
en el módulo PROYECTOS (financiamiento al productor: siembra esperando cosecha), NO se ligan a
ninguna carga. Aparte, Akambarhu es proveedor normal → cargas de consignación como cualquier otra.
Verificación (carga_costos de P-073/P-075/P-043/P-047): solo costos normales (materia prima,
comisión, aduanas, fletes, QC, cartón), CERO préstamo. Las notas de P-073/P-075 ya traían el
cierre desde E63: "enredo resuelto = consignacion normal, no prestamo". El item seguía como
"pendiente Samuel" solo por arrastre de docs/memoria. Cerrado y removido de parqueados.
Consecuencia: las 4 cargas son liquidables normal (aparecen en agenda 'liquidar_productor').
NOTA DE CONTINUIDAD: "Anticipo a productor" = disposición de proyecto (mismo esquema back-to-back,
tipo Akambarhu). Ver D-101 y pendiente de feature Anticipo/Proyecto.

### D-101 · E86 · Vista v_liquidaciones_pendientes (agrupada por productor)
Vista nueva para surfacear la señal de "listo para liquidar" en varias superficies del frontend.
Misma lógica que la regla de agenda D-99: consignación + ingreso_venta>0 + NO en liquidación viva
(estado<>'anulada') + no anulada, agrupada por productor. Columnas: productor_id, productor,
n_cargas, bruto_total, folios, dias_max, severidad (rojo>15d). Money-neutral. REVOKE ALL +
GRANT SELECT a authenticated (anon sin acceso, verificado). ENSAYO-que-revierte OK (4 prod / 11
cargas / bruto 54,224.70 / cuadre 0.00 / seg 0/0/0); aplicado, verificación fresca idéntica.
Migración e86_d101_vista_liquidaciones_pendientes.
FRONTEND (Claude Code, desplegado por Miguel): señal en 4 superficies —
(1) agenda 'liquidar_productor' (D-99); (2) panel "Listas para liquidar" arriba del módulo
Liquidaciones (cards por productor, botón "Liquidación automática" que reusa nuevaLiquidacionAuto()
con preselección de productor+folios); (3) badge en el menú lateral (patrón badgeFlags, suma
n_cargas); (4) chip "Lista para liquidar al productor" en la ficha de carga (modulo-cargas.js y
modulo-expediente.js, lee v_agenda_operativa por folio). Archivos: modulo-liquidaciones.js,
index.html, app.js, modulo-cargas.js, modulo-expediente.js. node --check limpio.

### Nota E86 · Regla real de comisión/deducciones en fn_crear_liquidacion (para no confundir)
Leído en E86 (no es decisión nueva, es documentación de cómo funciona):
- COMISIÓN: si p_comision_pct es NULL, toma el % del PROGRAMA de la 1ª carga (programas_comerciales
  con ingreso_base='pct_venta', usa ingreso_valor); si no hay, fallback 10%. v_com = bruto × %.
- DEDUCCIONES: Σ carga_costos WHERE concepto NOT IN ('Materia prima','Comision').
- ANTICIPOS: Σ carga_costos WHERE concepto = 'Materia prima'.
- "Comision" (concepto de costo) se EXCLUYE por completo (ni deduce ni usa). Ojo: la "Comision"
  de P-043 (cp 84 = LUIS ALVAREZ, tercero) hoy se ignora. Con proveedores viejos (consignación de
  resultado variable, sin esquema real de 10%) hay discrepancias ESPERADAS con el modelo — no
  forzar; Miguel revisa cada borrador antes de emitir. Regla de negocio de Miguel: "todos los
  costos del producto se le pasan al productor al final" (se le adelantan por servicio/liquidez y
  se descuentan en la liquidación) — puede requerir agregar deducciones a mano o afinar la regla
  de exclusión de "Comision" a futuro.


---

## E87 (2026-08-05)

### D-102 — Feature "Anticipo a productor / disposición de proyecto" (backend + frontend)
Hallazgo: la línea de un proyecto la descuenta `proyecto_amortizaciones` (tipo='disposicion'),
NO `movimientos.proyecto_id` (ese es solo enlace de reporte para v_proyecto_movimientos).
`anticipos` en v_balance = Σ v_proyectos.saldo_vivo. El tipo 'Anticipo a productor' es
grupo='financiamiento' → el movimiento pega solo en `banco`; la disposición crea el activo
compensatorio → el PAR es Cuadre-neutro, cada mitad sola rompe Cuadre ⇒ debe ser atómico.
Creado **fn_anticipo_productor(p_proyecto,p_productor,p_monto,p_cuenta='JPM',p_fecha,p_descripcion,
p_nota)** RETURNS (folio_asignado,proyecto,saldo_vivo,linea_disponible,advertencia): en 1 tx encadena
fn_capturar_mov → fn_registrar_amortizacion('disposicion', guarda de límite adentro) →
fn_ligar_movimiento_proyecto. SECURITY DEFINER, REVOKE anon/public + GRANT authenticated.
ENSAYO OK (PRJ-005 +100: saldo 8,455.33→8,555.33, Cuadre 0.00, guarda de exceso rechaza).
Backfill money-neutral del proyecto_id de 4 anticipos viejos (movs 366/375/373/381) vía
fn_ligar_movimiento_proyecto (derivando el proyecto desde proyecto_amortizaciones). Front (Claude
Code): puerta "Anticipo a productor" en Tesorería y en la ficha de Proyecto (captura-rapida.js →
ERP.capturarAnticipoProductor, SIN FIFO, selector v_proyectos activos con línea, cuenta JPM/JEAMS/
SAMUEL). Nota: paso 3 (fn_ligar) exige permiso 'editar'; usuarios 'operacion' lo tienen.
+ Fix zona horaria hoyISO() (usaba toISOString()/UTC, adelantaba el día de noche en Sonora UTC-7):
corregido a fecha LOCAL en 6 archivos (captura-rapida, modulo-tesoreria, modulo-cargas,
modulo-proyectos, modulo-ordenes, modulo-expediente — este último además arreglaba la validación
"no puede ser fecha futura").

### D-103 — Permisos de usuarios + panel self-service (backend + frontend)
Modelo (leído): usuarios_erp(socio_codigo PK, nombre, email UNIQUE, rol FK→roles_erp, activo);
roles_erp(rol PK, puede_ver/capturar/editar/administrar, descripcion). fn_actor() resuelve por JWT
email; SIN JWT cae a 'PP04-MA' (contexto MCP). fn_actor_puede(cap) lee las banderas del rol.
Diagnóstico: solo 'admin' tiene editar (por eso solo Miguel editaba); crear_carga/fn_capturar_mov
exigen 'capturar' (no 'editar') → si el front gateaba por 'editar' era el bloqueo de Samuel.
Decisión: rol nuevo **'operacion'** = ver+capturar+editar, sin administrar. Reasignados
PP01-SI/PP02-JM/PP03-JA → operacion; ALTA **PP05-FP Fer Palacios** (accounting@pleinproduce.com)
operacion (su cuenta de Supabase Auth ya existía desde 28-jul; solo faltaba la fila en usuarios_erp).
3 RPCs admin (gate 'administrar', SECURITY DEFINER, REVOKE anon/public + GRANT authenticated):
fn_admin_listar_usuarios(), fn_admin_listar_roles(), fn_admin_guardar_usuario(socio_codigo,nombre,
email,rol,activo) — con ANTI-LOCKOUT (no auto-degradarse admin, no dejar el sistema sin admin
activo). ENSAYO OK (alta/edición/guardas rebotan). Front (Claude Code): modulo-usuarios.js
(ruta usuarios, VISIBLE solo admin), tabla con chips de capacidad, alta/edición, errores del
backend tal cual. Money-neutral (Cuadre 0.00, seg 0/0/0). NOTA E88: Miguel quiere permisos
GRANULARES (matriz por-usuario de capacidades + módulos visibles) y rediseño visual — el diseño
actual no le gusta.

### D-104 — Diagnóstico CxP: dos modelos + vista de detalle atribuido (backend + frontend)
CxP se calcula de DOS formas: **DIRECTO** (v_cxp / v_cxp_proveedor / v_cxp_detalle_proveedor:
amontona todos los costos de una carga sobre carga.proveedor_id; es lo ASENTADO y lo que alimenta
v_anclas.cxp_total y el Cuadre) vs **ATRIBUIDO** (v_cxp_proveedor_atribuido: reparte cada línea
carga_costos por su contraparte_id y prorratea pagos; ESTIMADO; lo usa la pantalla CxP desde
28-jul con tooltip). NO hay dinero perdido: los costos de servicio (flete/aduana/QC) SÍ están en
libros, bajo el productor de fruta. Integridad: única carga margen sin costo = P-034 (Rechazo, venta
0, correcto); consignación 100% costeada; comisión correctamente en 0. Inconsistencia UI: lista
usaba atribuido, cajón usaba directo → proveedores de servicio (BBA/Las Brisas/AGRICOOLING/LAM/
SUAREZ) salían vacíos al picar. AGROFEPAC 235k en directo y 0 en atribuido = sus líneas de
consignación traen contraparte_id NULL (excluidas del atribuido) — PARKED: decidir si esos costos
son CxP normal o van por liquidación. Creada **v_cxp_detalle_proveedor_atribuido** (mismo prorrateo,
por carga+contraparte; REVOKE anon/public + GRANT authenticated; reconcilia con el agregado ±4¢).
Front (Claude Code): modulo-pagos.js verProveedor() → cajón lee el atribuido, filtra por
contraparte_id, mismo tooltip; el directo intacto en el resto. Money-neutral.
El ancla CxP bajó 506,941.00→496,368.03 durante la sesión = 5 pagos a proveedor de Miguel en la UI
(movs 382/384, Σ 10,572.97), Cuadre 0.00. JPM cerró en −9,584.71 (arrancó 15,989.29) por esos pagos
→ CONFIRMAR vs estado de cuenta (banco manda).

---
## E88 — Permisos granulares + Conciliación V8↔ERP (Paso 1 Banco)

### D-105 — Permisos GRANULARES (backend + frontend). Money-neutral.
Modelo de 2 capas: rol = default, usuario = override tri-estado (hereda/sí/no), para capacidades Y módulos.
Backend: tablas `modulos_erp` (catálogo 25 = claves data-modulo del menú), `rol_modulos` (default por rol; sembrado
seguro: todos ven lo que hoy ven, 'usuarios' solo admin), `usuario_capacidades` y `usuario_modulos` (overrides, vacías).
Las 4 con RLS on + sin grant a authenticated (solo definer/owner). `fn_usuario_puede(socio,cap)`=COALESCE(override,
rol,false); `fn_actor_puede` delega. Invariante probada: 0 cambios de permiso para los 5 usuarios sin overrides.
`v_mi_perfil` v2: banderas efectivas + array `modulos` (retrocompatible). 5 RPCs admin (`fn_admin_listar_modulos`,
`fn_admin_capacidades_usuario`, `fn_admin_modulos_usuario`, `fn_admin_set_capacidad`, `fn_admin_set_modulo`) con gate
'administrar' + anti-lockout reforzado (≥1 admin efectivo; no auto-quitarse admin ni auto-ocultarse 'usuarios'), probado
que muerde. Frontend (Claude Code, desplegado por Miguel): menú dinámico por perfil.modulos (comun.js/app.js); matriz por
usuario en modulo-usuarios.js (botón "Permisos", selects tri-estado, autoguardado por celda, reversión en error, mensajes
del backend verbatim). Advisors: solo patrón conocido, nada nuevo. **REGLA NUEVA DURA: toda tabla nueva → ENABLE RLS.**

### D-106 — Conciliación Banco: anulado mov JPM f383 (duplicado). Money-mover (−15,000 fuera).
f383 (−15,000 "segundo pago financiamiento" Akambarhu, PRJ-001, capturado en web) = DUPLICADO confirmado por Miguel; el
V8/drive trae solo un pago a Akambarhu (f375 "Semilla Bell Pepper", ya en ERP). Anulado (v_saldo_banco filtra NOT anulado)
+ borrada disposición PRJ-001 (proyecto_amortizaciones id 23). Cuadre 0.00. Saldo JPM → 5,415.29. ENSAYO-que-revierte OK.

### D-107 — Conciliación Banco: capturados 3 movimientos que el V8 tenía y el ERP no. Money-movers.
Vía fn_capturar_mov (auto-folio = max+1; sin aplicar quedan en "partidas por aplicar" → Cuadre-neutro): f385 viáticos San
Antonio Samuel −400 (Otros gastos); f386-erp cobro Crystal Valley +9,600 (V8 f387; aplicación a P-083/P-082 PARKEADA);
f387-erp reempaque Costatropical −1,000 (V8 f388; NGM248545 no es carga → PARKEADA). Saldo JPM → 13,615.29. Cuadre 0.00.

### D-108 — Conciliación Banco: capturado reembolso Samuel + PASO 1 CERRADO. Money-mover.
f388-erp (V8 f386): reembolso a Samuel −6,318, tipo 'Pasivo a socio' (NO P&L). Cubre 2 préstamos de bolsa de Samuel:
Akambarhu 4,400 (ya en cta SAMUEL mov 9009) + Costatropical 1,918 (=6,318−4,400). Liquidación contra cta virtual SAMUEL
PARKEADA (falta registrar 1,918 como deuda a Samuel; revisar FX 32,950 MXN).
**PASO 1 BANCO CERRADO:** saldo JPM 7,297.29 = neto Chase V8 al centavo; 281 movs activos = 281 del V8; Cuadre 0.00; seg
0/0/0. Notas: v_anclas.movs_jpm ahora 282 (281 activos + 1 anulado). Folios ERP 385/386/387/388 = V8 385/387/388/386
(cotejar por concepto/monto, NUNCA por folio). Diagnóstico previo: la brecha −9,584.71 vs +7,297.29 (16,882) se explicó al
100% = 15,000 (duplicado) + 1,882 (neto de los 4 faltantes). El bloque de folios 363–368 era corrimiento de numeración
documentado, 0 diferencia de dinero.


### D-109 · E88 · Paso 2 CARGAS — cubeta "sin acción" documentada (0 escrituras)
9 cargas cuya diferencia vs V8 NO es error, sino el modelo correcto del ERP: 6 consignación
(P-073/075/079/080/081/088 — ERP reconoce al COBRO, V8 al embarque); 2 rechazo (P-034 wash;
P-035 Candy Fresh saldo_cxc 2,505 correcto, V8 desactualizado); 1 cosmético (P-058 venta ERP 65,280
vs V8 65,640, Δ360, ambas saldadas). Documentadas, sin tocar.

### D-110 · E88 · Paso 2 CARGAS — CxC re-repartida (money-mover, Cuadre-neutro)
Hallazgo: Crystal Valley paga por DEPÓSITO ESPECÍFICO por P.O. (~27.8% por carga, etiquetado por PX en
V8), NO abono-a-cuenta; el ERP los había repartido FIFO a cargas viejas. Desaplicadas ids 87/210/273/
276/277/278 y re-aplicadas por depósito según V8 (f314→P-058 26,400+P-059 4,800; f335→P-066 7,200;
f346→P-074 12,000; f364→P-058 38,880+P-078 4,800) + cobros parqueados (f386 Crystal 9,600→P-082 6,000
+P-083 3,600; f377 P&M 10,000→P-011). ENSAYO limpio, aplicado, verificado. **CxC 589,263.13→570,023.13
(−19,240)**, Cuadre 0.00, seg 0/0/0. Saldos finales = V8 exacto. Residuo: crédito Crystal 360 sin
aplicar (= brecha cosmética venta P-058, parqueado).

### D-111 · E88 · Paso 2 CARGAS — CxP conciliada: ERP ya correcto (0 escrituras)
Vista por proveedor (ERP CxP vs V8, mismas 82 cargas): match EXACTO en PAMPAS/CARRIFOODS/ROGUGO/EF/
Omega/Candy/Tierra. Diferencias (total +1,976.07) sólo en 4, todas DELIBERADAS y documentadas en las
notas de los propios movimientos: CORNEJOS +4,182 (P-013 aduana Suárez 475 = LICENCIA ANUAL admin no
carga, E18; P-043/P-047 cartón 1,853.52 c/u = Celulosa a granel sin amarrar, E9/E37); AKAMBARHU −3,250
(flete BBA, ver D-112); AGROFEPAC +1,344 (los 2 reembolsos de 672, movs 123/125, E38, atribuidos
distinto); P&M −300 (P-077). La "comisión a P&M" grande del V8 = agrupación de flete+aduana+in&out+
cartón+comisión en una línea; el ERP los itemiza por proveedor real (MISMO costo total). El hueco
grande vs V8 = las 3 cargas faltantes (66,861). Decisión: NO forzar el match (reabriría 6 meses
cerrados para reintroducir imprecisiones ya corregidas; viola "no forzar el modelo bueno"). El ERP es
MÁS correcto que el V8 en estos puntos.

### D-112 · E88 · Flete BBA (f367 3,250) → P-073. Money-neutral.
Instrucción de Miguel: el flete BBA parqueado va a la 1era Kabocha de Akambarhu (P-073/1001), como dice
la descripción del mov. Todo en julio (abierto). Desaplicada id 301 (mov 370 Akambarhu 3,250 que cubría
el flete) → aplicado f367 (BBA 3,250) a P-073. P-073 cxp 0 (sin cambio); mov 370 queda 10,000 completo
= anticipo Akambarhu puro (Proyectos); f367 deja de flotar. Cierra el −3,250 de Akambarhu. Anclas sin
cambio (CxC 570,023.13 · CxP 496,368.03 · Cuadre 0.00 · seg 0/0/0).

### D-113 · E88 · Corrección masiva de id_v7 (relación V8↔ERP). Money-neutral (metadata).
La captura de Miguel mostró el campo V7 (id_v7) mal relacionado en muchas cargas. Diff contra el ID
real del V8 (hoja Cargas, ID↔P.O., únicos): 35 cargas vivas + 2 anuladas con id_v7 cruzado
(ej. P-077 era P-075→correcto P-078; P-073 era P-067→P-064). Fix: NULL a todas y reasignar el ID del V8
por P.O. a las 85 con match (2 pasos por el UNIQUE; las anuladas también bloqueaban); 4 anuladas sin
P.O. en V8 (1124/1125/161/162) quedan NULL. Resultado: 82 vivas con id_v7 correcto, 85 únicos. El join
de conciliación siempre fue por P.O., así que esto no altera nada financiero (Cuadre/seg sin cambio);
sólo corrige la referencia cruzada ERP↔V8.

### D-114 · E88 · Barrido de clasificación no-carga (Egresos/Ingresos/Traspasos/Nómina). 0 escrituras.
Cotejo hoja por hoja del V8 contra movimientos ERP (por folio + total):
- Egresos no-carga: 46/46 presentes y clasificados. El aparente descuadre f365 (V8 Akambarhu 20,600 vs
  ERP AGROFEPAC 10,000) = desfase de numeración de folio del ~362+ (V8 f365 = ERP f366, Akambarhu 20,600
  Anticipo a productor). No es dinero.
- Ingresos no-carga: 8/8 al centavo (incl. ajuste Cornejos 4,638.96 y devolución Familia Productora
  8,827.89).
- Nómina: 35,000 exacto (Samuel 17,500, Juan 17,500). ERP con más movimientos (pagos parciales); total
  por persona y global coincide.
- Traspasos: aportaciones y retiro (21,000) cuadran; único suelto = aportación "programa operativo"
  424.67 (E49) = entrada gross del V8 (aportación+compra netean a cero); ERP la lleva neto. NO se agrega
  (rompería JPM=Chase). Explicado, deja de ser pendiente.
Conclusión: todo el Drive fuera de cargas está capturado y bien clasificado. **Conciliación Drive↔ERP
COMPLETA salvo las 3 cargas En Camino.** Anclas sin cambio: CxC 570,023.13 · CxP 496,368.03 · Cuadre
0.00 · seg 0/0/0.

---
**CIERRE E88 — CONCILIACIÓN DRIVE↔ERP COMPLETA.** El ERP es la fuente de verdad; el Drive se jubila en
cuanto se capturen las 3 cargas En Camino (NGM248545, PX-72306, PX-72715 — dato de Samuel). Siguiente
fase: FRONTEND (rediseño visual profesional + flujos operativos). Ver NORTE.md (Actualización E88 FINAL).

## Sesión E101 (2026-08-08) — CxP espejo del Drive + fixes de captura + auditorías
- D-115 — CxP REAL por proveedor (piloto Las Brisas). Capa aditiva `cxp_pago_linea`(carga_folio, contraparte_id, pagado) poblada del V8; `v_cxp_proveedor_atribuido` y `v_cxp_detalle_proveedor_atribuido` reescritas con fallback pago-real→prorrateo. Las Brisas 96,013.94→13,965.16 (P-051 5,478.53 + P-076 8,486.63). Cuadre 0.00, seg 0/0/0, directo intacto, sin reabrir meses.
- D-116 — Lam Produce →0 (capa aditiva).
- D-117 — Modo ESPEJO del Drive: columna `cxp_pago_linea.costo` (override); vistas atribuido reescritas con UNION de pares (ERP ∪ capa) y COALESCE(costo_drive, costo_erp)/COALESCE(pago_drive, prorrateo). Poblados 9 proveedores desde hoja Egresos del V8. 7 exactos vs Drive; 4 parciales (Papayas/Pampa/Succar/Costa) faltan por las 3 cargas En Camino sin capturar. Cuadre-neutral.
- D-118 — `v_carga_costos_det` expone `id` + `contraparte_id` → frontend conectó `fn_editar_costo`/`fn_eliminar_costo` (editar/eliminar línea de costo sin anular la carga). Vista de lectura, seg 0/0/0.
- D-119 — `fn_anular_movimiento(p_folio, p_motivo)`: anula movimiento de banco, desaplica sus aplicaciones, Cuadre-neutral, respeta el guard de periodo cerrado (rechaza meses cerrados con instrucciones). REVOKE anon + GRANT authenticated. seg 0/0/0.
- FIFO auditado — `fn_aplicar_fifo` es SECUENCIAL (más viejo primero, LEAST por carga) y ON-DEMAND (0 triggers, 0 funciones lo llaman). El "reparto" percibido era el prorrateo de pantalla, ya corregido. No requiere fix. Manual ya lo tiene: `fn_aplicar_a_carga` + `fn_desaplicar`.
- Flujo SO diagnosticado — contabilidad OK: `v_ingreso_reconocido` (por carga_folio: ingreso_reconocido) da los importes reales (SO-0075/0078 = 17,280; SO-0083 = 12,690). Los "ceros" eran de pantalla (calculaba cajas×precio de sales_order_cargas, NULL). Deuda estructural: doble liga sales_order_cargas/lote_ventas.
- ANCLAS al cierre E101: Cuadre 0.00 · seg 0/0/0 · CxP directo 496,368.03 · CxC directo 570,023.13 · JPM ~79,261 (con cobro Crystal mov 389 +70k). CxP atribuido (pantalla) espeja el Drive por proveedor.
## Sesión E102-E106 (2026-08-09) — Autosuficiencia (Tema 2 + P1 + P2 + Fase 1/2a/2b/2c/3)
Objetivo: que lo rutinario (captura + catálogos) se opere 100% desde el sistema, sin depender de
que el chat de backend lo haga a mano, dejando el motor contable protegido. Plan CERRADO Y
DESPLEGADO. Detalle vivo en `PENDIENTES-BACKEND.md`/`MAPA-CAPTURA.md`.

### Tema 2 — Línea de proyecto + socios
- D-120 — `fn_ajustar_linea_proyecto(p_proyecto, p_nueva_linea, p_motivo)`: ajusta el monto de la línea de crédito de un proyecto. Money-neutral, candado backend ≥ dispuesto (no se puede bajar la línea por debajo de lo ya dispuesto). Frontend: botón "Ajustar línea" en ficha de Proyecto.
- D-121 — `fn_registrar_aportacion_socio(...)`: RPC genérica para las 3 naturalezas de aportación (préstamo sin interés / financiamiento con tasa / custodia), reemplaza captura ad-hoc por backend. Frontend: "+ Aportación de socio" en Tesorería/Proyecto.
- D-122 — Origen de fondeo opcional en `fn_anticipo_productor` (retrocompatible, NULL = sin cambio de comportamiento). Frontend: selector Origen en el panel de Anticipo.
- D-123 — Balance "Deuda a socios" generalizado (antes solo cubría un caso) + vista `v_deuda_socios`.
- D-124 — Verificación end-to-end: Miguel ya opera línea de proyecto + aportación de socio + anticipo con origen él solo (folio 397, PRJ-005).

### P1 — Directorio autosuficiente
- D-125 — `contrapartes.recibe_pagos` (bool) + `capturado_por`/`capturado_ts` (rastro de quién/cuándo dio de alta cada contraparte).
- D-126 — Picker de "Registrar gasto" desacoplado de `clase`: antes solo mostraba clase='gasto', ahora cualquier contraparte con `recibe_pagos=true` puede recibir un gasto tipo Sueldo (Samuel/Juan ya salen, sin ser clase='gasto').
- D-127 — `fn_alta_contraparte`/`fn_editar_contraparte` ganan el parámetro `recibe_pagos` + guardan el rastro de captura.
- D-128 — Vista `v_directorio_contrapartes` (fuente para el panel de gestión de Catálogos → Directorio).

### P2 — Catálogos autoservibles
- D-129 — Conceptos de costo autoservibles: `fn_alta_concepto_costo`/`fn_editar_concepto_costo` + tabla/vista de catálogo. Antes el selector de "+ Agregar costo" en la ficha de carga dependía de una lista fija.
- D-130 — Cuentas: columna `tipo` (`banco`|`virtual`) para distinguir cuentas de banco real de bolsas virtuales de socio (JEAMS, SAMUEL).
- D-131 — `fn_alta_cuenta`/`fn_editar_cuenta`: solo permiten crear/editar cuentas `tipo='banco'` (las virtuales se gestionan aparte, tocan balance directo).
- D-132 — Balance "Banco" recalculado por `tipo='banco'` en vez de una lista hardcoded de ids de cuenta.

### Fase 1 — Puerta única de captura
- D-133 — `fn_traspaso(p_origen, p_destino, p_monto, p_fecha, p_nota=null)` saneado: gate de permiso (`capturar`), `fn_actor()` para el rastro, folios asignados por rango dedicado. Frontend: los 4 botones sueltos de Tesorería (+ Movimiento / + Registrar gasto / + Anticipo / + Aportación) se reemplazan por un botón único "+ Registrar" que abre un chooser de intención (Cobro/pago de carga · Gasto de operación · Anticipo a productor · Aportación de socio · Traspaso entre cuentas) y enruta al panel correspondiente — ninguno de los 4 paneles cambió, solo el punto de entrada, más el panel nuevo de Traspaso.

### Fase 2a — Categoría de deducción
- D-134 — Tabla `categorias_deduccion` + `fn_alta_categoria_deduccion(p_codigo, p_nombre)` (el código se normaliza en backend a minúsculas_con_guiones) + `fn_editar_categoria_deduccion(p_id, p_nombre=null, p_activo=null, p_orden=null)` + vistas `v_categorias_deduccion`/`_admin`. `liquidacion_deducciones.categoria` pasó de CHECK fijo (7 valores) a FK al catálogo. Frontend: pestaña de gestión en Catálogos + el selector de "+ Agregar deducción" en Liquidaciones ahora lee la vista.

### Fase 2b — Categorías de gasto
- D-135 — `tipos_movimiento.activo` (columna nueva) + `fn_alta_categoria_gasto(p_nombre, p_grupo='gasto_operativo')` (clona el comportamiento contable del grupo elegido — `gasto_operativo` o `gasto_financiero`, candado impide crear tipos estructurales como 'Cliente'/'Proveedor') + `fn_editar_categoria_gasto(p_tipo, p_activo)` (solo activa/desactiva, `tipo` es la llave, sin rename) + vistas `v_categorias_gasto`/`_admin`. Frontend: pestaña de gestión + "Registrar gasto" lee el catálogo en vez del hardcode `TIPOS_GASTO`.

### Fase 2c — Editar productos/variedades
- D-136 — `fn_editar_producto(p_id, p_nombre=null, p_codigo_item=null, p_activo=null)` / `fn_editar_variedad(p_id, p_nombre=null, p_activo=null)`. NULL=no tocar. Rechazan nombre/código duplicado con mensaje claro.
- D-137 — Permisos de las 5 RPCs de producto/variedad (alta+editar de ambos, más una quinta) unificados a `capturar` — 2 de ellas no tenían gate explícito antes (hueco cerrado). Frontend: botón "Editar" en Catálogos → Productos/Variedades + gate del módulo alineado a `capturar`. **✅ Confirmado en producción por Miguel** (capturas de pantalla, 2026-08-09): el botón existe y funciona (nombre, código de ítem, Activo, "Guardar cambios").

### Fase 3 — limpieza
- Moneda (USD/MXN) centralizada en `ERP.MONEDAS` (comun.js) — antes duplicada literal en 3 archivos frontend (modulo-ventas.js, modulo-comercial.js, modulo-ordenes.js). No numerada como D-## (limpieza de frontend, no cambio de backend).
- Seeds de categorías de documento/evento/presupuesto confirmados como enums de sistema — no requieren panel de gestión de usuario.
- Estado de Load (`en_origen|en_cruce|en_transito|entregado`) decidido como enum fijo — no es catálogo de usuario, queda igual.

**ANCLAS al cierre E102-E106:** Cuadre 0.00 · seg 0/0/0 · CxC 565,985.13 · CxP 526,469.78 · JPM ~50,308.54 (antes de capturas de Miguel post-sesión) · cargas 85 · folio_max ~401.

## Sesión post-autosuficiencia (2026-08-09) — Tema 1 (D-138) + consolidación fn_alta_producto (D-139)
- D-138 — Tema 1, filtro de "Aplicar a carga" (backend + frontend, cerrado y desplegado): vista nueva `v_carga_contrapartes` (folio_carga, contraparte_id, contraparte_nombre, rol['cliente'|'proveedor'|'costo']) — una fila por combinación carga↔contraparte↔rol, une el cliente/proveedor de ENCABEZADO con las contrapartes de línea de costo (proveedores de SERVICIO: flete/comisión/reempaque, ej. SUAREZ BROKERAGE en P-076, que antes nunca aparecían porque solo viven en `carga_costos.contraparte_id`). `modulo-tesoreria.js` → `editarMovimiento()`: el selector "Aplicar a carga" ahora filtra por **ID** contra esta vista en vez de por nombre contra el encabezado (`v_carga_detalle`). Verificado en vivo (4 casos: proveedor de servicio, regresión con proveedor normal, fallback sin contraparte_id, toggle "Ver todas"), `node --check` limpio. Commit `04e8be3` (Claude Code, solo `.md` aparte del código).
- D-139 — Consolidar `fn_alta_producto` (backend): unificada a una sola firma `(p_nombre, p_codigo_item)` con detección de duplicado exacto (RAISE) y de "parecido" (warning en `data[0].advertencia`). Antes había 2 firmas vivas: la de 1-arg (con la validación de "parecido", pero sin call-site en el frontend) y la de 2-arg (la que sí usaba `modulo-catalogos.js`, SIN esa validación) — el aviso de "parecido a uno existente" nunca se mostraba en producción porque el frontend esperaba `data[0].advertencia` y la función viva no la mandaba. La fusión corrige ese bug mudo sin tocar frontend (el front ya esperaba esa forma de respuesta).
- `documentos.entidad='load'` — confirmado que el CHECK constraint de la tabla `documentos` SÍ incluye `'load'` desde D-71 (E76); ya estaba soportado, solo faltaba documentarlo (la incertidumbre vivía en un comentario de `modulo-loads.js`, nunca fue un hueco real de backend).
- Backlog de liquidación actualizado: 4 productores / 11 cargas / $54,224.70 → **4 productores / 10 cargas / $44,224.70** (Cornejos P-043, $10,000, ya se liquidó; queda Cornejos P-047 $11,571.20, Carrifoods 6 $20,329.50, Akambarhu P-073/075 $11,874, Agrofepac P-071 $450).

**ANCLAS al cierre de esta sesión:** Cuadre 0.00 · seg 0/0/0 · CxC 565,985.13 · CxP 526,469.78 · JPM 46,808.54 · cargas 85 · folio_max 400.

## Sesión E111 (2026-08-12) — Fase 0 del modelo-OP: tabla `operaciones` + backfill + vistas de lectura (D-140..D-146) + pantalla "Operaciones (OP)"
- D-140 — Tabla `operaciones` nueva (Fase 0 de `ARQUITECTURA-OPERACION.md`, el "hilo conductor" que en fases siguientes conecta VENTA/COMPRA/EMBARQUE vía `operacion_id`). Numeración secuencial nueva desde OP-0001; conserva el folio viejo (P-XXX) como etiqueta histórica en el campo `folio_carga_v1` — no se pierde trazabilidad con el modelo anterior.
- D-141 — Whitelist de `operacion_id` en periodo cerrado: candado que permite poblar la columna nueva durante el backfill sin reabrir a escritura general los meses ya cerrados.
- D-142 — Backfill retroactivo: las 85 cargas vivas existentes se convirtieron en 85 OPs (OP-0001..OP-0085), en orden de fecha de carga.
- D-143 / D-144 / D-145 / D-146 — 4 vistas de lectura nuevas: `v_operacion` (encabezado completo por OP), `v_operacion_resumen` (folio_op/carga/po/modalidad/cliente/estado_carga/ingreso_venta/costo_total/margen_bruto — margen_bruto NULL en consignación sin liquidar), `v_operacion_costos` (detalle por línea con `contraparte_real` vs `proveedor_encabezado` y `sin_contraparte`), `v_operacion_cxp` (costo por OP y contraparte real). Contrato completo en `MAPA-CAPTURA.md` y `REPORTE-FRONTEND.md` E111. Fase 0 es andamiaje puro — no migra datos vivos: backend reportó Cuadre/seg/CxC/CxP sin cambio.
- Frontend (Claude Code, E111): pantalla nueva de solo lectura "Operaciones (OP)" (`modulo-operaciones.js`) — lista en tarjetas por OP (filtro por modalidad + buscador) y detalle con desglose de costos por contraparte real, resaltando el caso "fantasma" (proveedor de servicio cuya contraparte real es distinta del proveedor del encabezado — caso testigo OP-0011/AGROFEPAC verificado en harness). Ver `REPORTE-FRONTEND.md` E111 para el detalle completo y las pruebas.
- **Hueco encontrado (pasa a `PENDIENTES-BACKEND.md`):** la clave de módulo `'operaciones'` es nueva y no existe todavía en el catálogo `modulos_erp` (D-105) — el ítem de menú "Operaciones (OP)" queda oculto para todos los usuarios hasta que el chat de backend lo dé de alta y lo conceda al menos al rol admin/operación.

**ANCLAS:** sin cambio reportado por backend tras Fase 0 (Cuadre 0.00 · seg 0/0/0 · CxC/CxP intactas) — este chat es frontend y no tiene acceso a Supabase para reverificar en vivo; confirmar en el chat de backend antes de cerrar Fase 0 formalmente.

## Sesión E113 (2026-08-12) — Rediseño OP: Fase 1a backfill cerrado, alta de módulo, diseño + Fase 3a/3b (D-147..D-149)
_Precisión adicional sobre D-140/D-141 (Sesión E111 arriba, sin duplicar): D-140 — la tabla `operaciones` se creó **vacía**, más columnas `operacion_id` **nullable** en `cargas`, `sales_orders` y `ordenes_compra` (andamiaje reversible, Fase 0). RLS habilitado + REVOKE ALL/GRANT explícito (seg 0/0/0). D-141 — `operacion_id` se agregó a la lista blanca de **`fn_chk_periodo_cerrado`**: es una columna de puro enlace (no toca dinero), así que no debilita la inmutabilidad de meses cerrados que esa función protege._

- D-142 — Backfill Fase 1a (cerrado): 85 operaciones (OP-0001..OP-0085), numeradas en orden de `f_embarque`, `folio_carga_v1` = folio histórico P-XXX, `proyecto_id` heredado de la carga origen. Enlazadas 85 cargas + 81 ventas (sales_orders). Money-neutral: CxC/CxP idénticos antes/después.
- **Alta de módulo 'operaciones'** en `modulos_erp` (orden 26, icono 🧵) + concedido a los 4 roles en `rol_modulos` — **desbloquea la pantalla "Operaciones (OP)"** (cierra el hueco anotado en la Sesión E111 arriba y en `PENDIENTES-BACKEND.md`: el ítem de menú ya no debería estar oculto tras el próximo deploy).
- D-147 — Diseño del flujo "+ Nueva operación" (el "deber ser", sin código todavía): la OC es **siempre** documento formal cuando hay compra (folio interno + número oficial); la venta se confirma **antes** del embarque (hueco soportado por diseño, no un error); relación **1-a-muchos** disponible — una OP puede tener varias ventas/compras/embarques.
- D-148 — `fn_abrir_operacion(p_proyecto_id, p_nota)` → reserva folio OP-XXXX nuevo (secuencia `seq_operaciones_num`, arranca en 86 — sigue después del backfill de 85). SECURITY DEFINER, permiso `capturar`, REVOKE anon/GRANT authenticated. Money-neutral.
- D-149 — `fn_op_agregar_venta(p_folio_op, ...)` → cuelga una venta (SO) de una OP existente, reusando `fn_crear_so` (mismos parámetros) + setea `operacion_id`. Money-neutral.

**ANCLAS:** sin cambio reportado por backend tras Fase 1a/2/3a/3b (Cuadre 0.00 · seg 0/0/0 · CxC/CxP idénticos) — este chat es de documentación y no tiene acceso a Supabase para reverificar en vivo; confirmar en el chat de backend.

## Sesión E113 (2026-08-12) — Slice 1 del rediseño OP: decisión de UI para "+ Nueva operación"
- **Decisión de UI:** el drawer de "+ Nueva operación" reusa el `.form-erp` legacy (mismo componente que Registrar traspaso/Registrar gasto/Crear embarque) en vez de un componente "modal" nuevo — consistente con la regla del sistema de diseño de no inventar componentes cuando ya hay uno que cumple el rol (SISTEMA-DISENO.md §12). El botón "+ Nueva operación" en la LISTA (fuera del drawer, dentro de `.pantalla-operaciones`) sí usa el negro nuevo `var(--btn)`/`#14231A`; el botón "Crear operación" DENTRO del drawer usa el verde legacy de siempre — mismo patrón que todos los demás formularios de captura de la app (los drawers viven fuera del scope de tokens nuevos, decisión ya tomada en E89-E95).
- **Decisión de UX — encadenado no-atómico protegido contra duplicados:** `fn_abrir_operacion` y `fn_op_agregar_venta` no son atómicas (confirmado por el contrato del backend). El frontend guarda el `folio_op` devuelto por la primera llamada en una variable de módulo ANTES de intentar la segunda; si la venta falla, un reintento reusa ese mismo folio en vez de volver a abrir la operación — evita que un reintento genere una OP huérfana duplicada. Si el usuario intenta cerrar el formulario con una OP ya creada pero sin venta, se le advierte con un `confirm()` antes de dejarlo salir. La atomicidad real (si hace falta) queda para que el backend la resuelva más adelante — no se implementó en frontend (fuera de alcance de este slice, según instrucción explícita de la tarea).
- Campos de precio/comisión (`p_comision_por_caja`, `p_cuota_fija_embarque`, `p_pct_comision`, `p_precio_compra_caja`, `p_precio_venta_caja`) se leen del DOM SOLO si pertenecen a la modalidad activa en el momento de guardar — los demás se mandan `null` explícito, incluso si el campo tiene texto sin borrar de una modalidad anterior. Validación de campos requeridos por modalidad se deja al RAISE del backend (mensaje mostrado tal cual, sin traducir) — el frontend solo valida Cliente/Modalidad (selección obligatoria de un combo/select).
- Ver `REPORTE-FRONTEND.md` E113 para el detalle completo, contratos exactos de `fn_abrir_operacion`/`fn_op_agregar_venta` y las pruebas.

**ANCLAS:** sin cambio reportado por backend en este slice (solo frontend + 2 RPCs ya money-verificadas por el chat de backend, D-148/D-149) — este chat es frontend y no tiene acceso a Supabase para reverificar en vivo.

## Sesión E114 (2026-08-12) — Fase 3c/3d del rediseño OP CERRADAS (D-150/D-151) — backend completo
_Registrado desde el chat frontend (corrección de desincronización: el backend ya había aplicado y verificado estas dos decisiones, pero no habían quedado escritas en la bitácora todavía)._

- **D-150 — `fn_op_agregar_compra` (Fase 3c).** Wrapper OP-céntrico sobre `fn_crear_orden_compra`: verifica la OP, llama la base (genera folio interno OC-XXXX + inserta en `ordenes_compra`), setea `operacion_id` y guarda el número oficial del proveedor en `ordenes_compra.numero`. **Comisión pura** (OP con ≥1 venta activa y TODAS RM-001 `comision_por_caja`) = **AVISO** (`RAISE NOTICE`), **NO candado**: la RPC permite la compra igual — la verdad contable se cuida en el embarque, no aquí. Money-neutral: `v_cxp` se arma de `cargas`+`carga_costos`, no de `ordenes_compra`, así que esta RPC no mueve ningún ancla de dinero. ENSAYO OK, anclas idénticas, seg 0/0/0.
- **D-151 — `fn_op_agregar_embarque` (Fase 3d, cierra Fase 3).** Wrapper sobre `fn_crear_carga`: verifica la OP, **herencia SIN recaptura** desde la venta única de la OP (PO←`customer_po`, cliente←cliente de la venta, modalidad←`revenue_model`), llama `fn_crear_carga` (folio P-XXX + costos desglosados), setea `operacion_id`, y **auto-liga carga↔venta** vía `fn_asignar_carga_so` si hay exactamente 1 venta y `p_auto_ligar_venta=true`. Modalidad derivada = default *override-able*, NO candado — mapa validado contra las 81 cargas existentes: `comision_por_caja`→comisión, `pct_venta`→consignación, margen/`buy_resell`→margen_fijo. Devuelve `TABLE(folio, con_flag, advertencias, ligada_a_so)`. ENSAYO OK (ΔCxP=1,000=costo, ΔCxC=1,000=ingreso, Cuadre 0.00, secuencia restaurada), anclas idénticas post-apply, seg 0/0/0.
- **Con D-150/D-151, el backend del rediseño OP queda COMPLETO** (Fase 0 → 3d, D-140..D-151). Lo único pendiente es el frontend de captura: Slice 1 "+ Nueva operación" ya cerrado (E113); Slice 2 "Agregar compra" y Slice 3 "Registrar embarque" siguen en `PENDIENTES-BACKEND.md` como trabajo de frontend, NO de backend — no hay que reabrir nada en la base para completarlos.

**ANCLAS vigentes (2026-08-12, post D-150/D-151):** Cuadre 0.00 · seg 0/0/0 · cargas 85 · flags 1 · aplicaciones 212 · CxC 565,985.13 · CxP 504,869.78 · JPM 43,308.54 · folio_max JPM 401.

## Sesión E115 (2026-08-12) — Slice 2 del rediseño OP: decisión de UI para "Agregar compra"
- **Decisión de UI:** el editor de líneas de "Agregar compra" (`modulo-operaciones.js`) reusa el mismo patrón ya probado en `modulo-ordenes.js` (`nuevaOrden()`) — misma tabla `.fact-lineas`, mismos nombres de campo por línea (`producto_id`/`descripcion`/`cantidad`/`unidad`/`precio_unitario`), mismo botón "+ Línea"/"✕ quitar" — en vez de construir un componente nuevo. Consistente con la regla de "reusar el que ya cumple el rol" (SISTEMA-DISENO.md §12) y con la decisión ya tomada en el Slice 1 (E113) de reusar `.form-erp` en vez de inventar un "modal".
- **Decisión de alcance:** NO se implementó el `confirm()` opcional de "comisión pura" (nice-to-have de la tarea) porque hubiera exigido leer `sales_orders` directo (tabla base) solo para replicar una advertencia cosmética que el backend YA decide permitir sin bloquear (`RAISE NOTICE`, D-150). Se prefirió no leer una tabla base para un aviso no bloqueante — la decisión de negocio ya vive en el backend, que es la autoridad; el frontend no necesita duplicarla.
- Ver `REPORTE-FRONTEND.md` E114 para el detalle completo, contrato exacto de `fn_op_agregar_compra` y las pruebas (camino feliz con 3 líneas mixtas, validaciones, RAISE, quitar línea).

**ANCLAS:** sin cambio en este slice (solo frontend + 1 RPC ya money-verificada por el chat de backend, D-150) — este chat es frontend y no tiene acceso a Supabase para reverificar en vivo.

## Sesión E117 (2026-08-12) — Fixes de lectura al modelo-OP: D-152 (v_operacion_compras) y D-153 (LEFT JOIN cargas)
- **D-152 — Vista de lectura `v_operacion_compras`.** Expone las OCs colgadas de una OP: `folio_op`, `oc_folio`, `numero_proveedor`, `proveedor`, `proveedor_id`, `moneda`, `estado`, `dias_credito`, `f_entrega_est`, `total`, `f_captura`, `n_items`. Resuelve que la compra agregada por el Slice 2 ("Agregar compra") no se veía en ningún lado del detalle de la OP — `v_operacion_costos`/`v_operacion_cxp` se arman de `carga_costos`, que nace hasta el embarque (Slice 3), no en la compra. Money-neutral, seg 0/0/0. La consume la sección "Compras (OC)" del detalle de la OP (frontend E115).
- **D-153 — `v_operacion` y `v_operacion_resumen`: INNER→LEFT JOIN `cargas`.** El flujo de captura nuevo (la OP nace por la venta vía `fn_abrir_operacion`/`fn_op_agregar_venta`, sin carga hasta el embarque/Slice 3) chocaba con estas 2 vistas: al hacer INNER JOIN a `cargas`, una OP recién creada quedaba invisible en la lista y en el detalle hasta tener embarque — rompiendo el flujo end-to-end justo donde el frontend (E113-E116) más lo necesitaba. Fix: INNER→LEFT JOIN `cargas` + venta ligada por `operacion_id` (LATERAL, 1 fila representativa) + `COALESCE(dato-de-carga, dato-de-venta)` para `po`/`cliente`/`modalidad` (modalidad derivada del `revenue_model`, mismo mapa de D-151: `comision_por_caja`→comisión, `pct_venta`→consignación, margen/`buy_resell`→margen_fijo). Preserva EXACTO las 85 OPs que ya tenían carga (EXCEPT bidireccional 0/0 en ambas vistas, antes/después idénticas) y agrega las OPs sin carga todavía con los datos de su venta. `v_operacion_costos`/`v_operacion_cxp` NO se tocaron (siguen dependiendo de `carga_costos`, correcto — esos SÍ nacen con el embarque). Money-neutral, anclas idénticas, seg 0/0/0. `CREATE OR REPLACE` con grants preservados.
- Con D-152/D-153 el backend queda alineado 100% con el frontend de captura ya desplegado (Slices 1→3, E113-E116): una OP creada por "+ Nueva operación" aparece de inmediato en la lista y el detalle de Operaciones (OP), sin esperar al embarque, y sus compras se ven en cuanto se agregan.

**ANCLAS:** sin cambio (money-neutral, ambos fixes son de lectura) — reportado por el chat de backend, verificado en vivo por ellos (EXCEPT bidireccional 0/0, seg 0/0/0). Este chat es de cierre/docs y no tiene acceso a Supabase para reverificar.

## Sesión E118 (2026-08-12) — Fix D-154: "column reference folio is ambiguous" en fn_op_agregar_embarque
- **D-154 — Fix de ambigüedad de columna en `fn_op_agregar_embarque`.** El `UPDATE` que liga la carga recién creada a la OP (`WHERE folio = v_folio`) chocaba con la columna de salida `folio` de la `RETURNS TABLE` de la propia función — PostgreSQL no podía resolver a cuál `folio` se refería (la columna de la tabla `cargas` o la columna de salida de la función) y rechazaba el embarque completo. **Fix:** calificar la referencia como `WHERE cargas.folio = v_folio`. Sin cambio de lógica ni de dinero.
- **Lección de proceso (por qué el ENSAYO de D-151 no lo detectó):** el ENSAYO original de D-151 probó la lógica **inlineada en un bloque `DO $$ ... $$`**, que no tiene `RETURNS TABLE` — ahí `folio` no era ambiguo, así que el ensayo pasó limpio. El ENSAYO de D-154 llamó **la función real** (`fn_op_agregar_embarque` tal cual queda desplegada) y ahí sí reprodujo el error, lo corrigió y lo volvió a probar: creó una carga real (ΔCxP=25,000, ΔCxC=27,000), la ligó a la OP y a la venta correctamente, Cuadre 0.00, y se revirtió (ENSAYO-que-revierte). **Regla para la próxima:** wrappers que declaran `RETURNS TABLE` con columnas que puedan chocar con nombres de columna de las tablas que tocan deben probarse llamando la función real, no una versión inlineada en `DO` — un `DO` block no tiene el mismo contexto de resolución de nombres que una función con `RETURNS TABLE`.
- Este fix es lo que permitió que la prueba real de Miguel en producción del Slice 3 ("Registrar embarque", E116) funcionara — antes de D-154, cualquier intento real de embarcar desde la pantalla nueva habría fallado con ese error de ambigüedad.

**ANCLAS:** sin cambio (money-neutral, fix de sintaxis SQL) — reportado y verificado por el chat de backend (ENSAYO OK con la función real, Cuadre 0.00, revertido). Este chat es de cierre/docs y no tiene acceso a Supabase para reverificar en vivo.

## Sesión E119 (2026-08-12) — Anular operación/movimiento desde la UI (D-155/D-156)
- **D-155 — Filtrar cargas anuladas en `v_operacion`/`v_operacion_resumen`** (+ ocultar OPs totalmente anuladas). La carga de prueba de la sesión anterior (OP-0086, anulada tras el ENSAYO real de D-151/D-154) seguía inflando la lista y el header de Operaciones (OP) aunque ya estuviera anulada. Fix: `WHERE` que excluye cargas con `anulado=true` y OPs cuyo hilo completo quedó anulado. Preserva EXACTO las 85 OPs vivas (EXCEPT bidireccional 0/0 en ambas vistas). Money-neutral, seg 0/0/0.
- **D-156 — `fn_anular_operacion(p_folio_op, p_motivo)`.** Orquestador atómico que anula TODO el hilo de una OP (carga(s)+compra(s)+venta(s)) de un jalón, reusando `fn_anular_carga`/`fn_anular_orden`/`fn_cancelar_so` en vez de reimplementar la lógica de cada uno. Requiere permiso `administrar`, motivo obligatorio, y propaga el bloqueo de cualquiera de las 3 funciones internas — si alguna carga ya tiene cobros/pagos aplicados, hace RAISE y no se puede anular desde la web (hay que desaplicar primero). `RETURNS TABLE(folio_op, cargas_anuladas, compras_anuladas, ventas_anuladas, resultado)`. **ENSAYO real:** creó una OP completa (venta+embarque, CxP +25k/CxC +27k) y la anuló de punta a punta → anclas de vuelta exactas al estado previo.
- **Frontend (E119):** botón **"Anular operación"** (rojo/peligro, zona-peligro al final del detalle) en `verOperacion()` de `modulo-operaciones.js`, gateado por `ERP.puede('administrar')` — confirm + prompt de motivo obligatorio (mismo patrón que `anularMovimiento()`, D-119), llama `fn_anular_operacion`, toast con `data[0].resultado` tal cual lo arma el backend, cierra el drawer y refresca (D-155 ya filtra la OP anulada fuera de la lista). Cualquier RAISE se muestra tal cual, sin traducir, y el drawer se queda abierto para que Miguel decida el siguiente paso (ej. ir a desaplicar en Tesorería).
- **"Anular movimiento" en Tesorería YA EXISTÍA** (D-119, sesión mucho anterior — botón `#edAnular` en `editarMovimiento()`, función `anularMovimiento()`): mismo patrón confirm+prompt+motivo obligatorio, ya gateado por `ERP.puede('editar')`. Solo se ajustó una línea para que el toast use `data[0].resultado` (el contrato nuevo lo trae listo) en vez del mensaje armado a mano con `aplicaciones_revertidas` — con fallback a ese mensaje viejo si `resultado` no viniera.

**ANCLAS:** sin cambio (money-neutral: D-155 es filtro de lectura, D-156 es reversión atómica de operaciones ya existentes) — reportado y verificado por el chat de backend (EXCEPT 0/0, ENSAYO real revertido, seg 0/0/0). Este chat es frontend/docs y no tiene acceso a Supabase para reverificar en vivo.

## Sesión E120 (2026-08-13) — Herencia compra→embarque en fn_op_agregar_embarque (D-157/158/159)
_Cierra el ajuste A del backlog de ajustes del flujo OP (anotado en `PENDIENTES-BACKEND.md`, sesión E118): antes, "Registrar embarque" recapturaba proveedor y materia prima a mano aunque la OP ya tuviera una compra (OC) con ese mismo dato — doble captura del mismo costo._

- **D-157 — Herencia condicional de proveedor + materia prima.** Si la OP tiene ≥1 orden de compra VIVA (`ordenes_compra` con `operacion_id = folio_op` y no anulada), `fn_op_agregar_embarque` IGNORA `p_materia_prima` y `p_proveedor` aunque se manden (con advertencia) — proveedor y materia prima se heredan de la(s) OC(s). Si la OP tiene 0 OC vivas, se mantiene el comportamiento anterior (se capturan a mano). Los demás conceptos (fletes, aduanas, QC, cartón, otro, comisión) SIEMPRE se siguen capturando igual, con o sin OC.
- **D-158 — Atribución por línea, encabezado = OC de mayor total.** Con OC(s) vivas, se inserta **1 línea de "Materia prima" por OC**, cada una atribuida a su proveedor real (entra a CxP correctamente, sin quedar "interno/sin contraparte") — y el encabezado de la carga queda en el proveedor de la OC de mayor total.
- **D-159 — Columna `advertencias` con el aviso de herencia.** La función ya devolvía `advertencias` (D-151); ahora ese texto incluye el aviso de herencia cuando aplica (ej. "Materia prima ($X) y proveedor heredados de N OC(s): OC-XXXX...").
- **Frontend (E120):** `abrirRegistrarEmbarque()` en `modulo-operaciones.js` detecta OCs vivas de la OP leyendo `v_operacion_compras` (mismo criterio "viva" que `estadoDe()` en `modulo-ordenes.js`: `estado !== 'Cancelada'`). Con OC(s) viva(s): el form deja de pedir Proveedor y Materia prima — en su lugar muestra un bloque read-only "Heredado de: OC-XXXX $monto (proveedor), ..." + el encabezado calculado (OC de mayor total) + el total de materia prima heredada; `p_proveedor`/`p_materia_prima` se mandan `null` (por construcción: el combo/input ni se instancia/renderiza, así que las lecturas ya defensivas del código — `comboProveedorEmb && ...`, `(document.getElementById(id) || {}).value` — resuelven solo a `null`, sin lógica adicional). Sin OC vivas: el form queda exactamente como antes (Proveedor + Materia prima editables). El aviso de herencia que regresa la RPC ya se mostraba de forma prominente desde D-151/E116 (bloque ámbar con `data[0].advertencias`) — sin cambios ahí.

**ANCLAS:** sin cambio (money-neutral en el sentido de que no cambia ningún ancla estructural; sí cambia CÓMO se atribuye la materia prima a CxP cuando hay OC, corrigiendo un hueco de atribución) — reportado por el chat de backend. Este chat es frontend/docs y no tiene acceso a Supabase para reverificar en vivo.

## Sesión E121 (2026-08-13) — CAMINO C · Fase O1: Customer PO + Sales Order (D-160/161/162)
_Arranque del reinicio operativo "Camino C" (ver `PLAN-REINICIO-OPERATIVO-CAMINO-C.md`). O1 = las dos primeras entidades del Order-to-Cash reconstruido, en un **namespace `op` nuevo**, independiente del histórico. **Backend aplicado por el chat de backend; este chat es SOLO frontend** (2 pantallas nuevas + cableado del MARCO). Los contratos que siguen los documentó/aplicó el backend; el frontend los consume._

- **D-160 — `op` cerrado fuera del API, frontend por vistas+RPCs en `public`.** El esquema `op` (customer_po, operaciones, sales_orders, so_lineas) NO tiene `USAGE` a `anon`/`authenticated` y NO se agregó a `PGRST_DB_SCHEMAS`. El frontend LEE por vistas en `public` (`v_op_*`, en modo `security_invoker` por defecto → leen `op` con los permisos del dueño de la vista) y ESCRIBE por RPCs `SECURITY DEFINER` en `public` (`fn_op_*`) que nombran `op.tabla` explícitamente con `search_path=pg_catalog`. Resultado: la superficie pública es exactamente el set de vistas+RPCs de O1, nada más; `seg 0/0/0` verificado por backend.
- **D-161 — La OP nace con el Sales Order, no con el CPO.** `op.operaciones` (espinazo OP) se crea DENTRO de `fn_op_so_crear_desde_cpo`, no en el alta del CPO — así un CPO cancelado no deja una OP huérfana. Grain **1 OP / 1 SO** en v1 (se revisa en O3 con el fan-out multi-SO/PO). `op.operaciones` NO tiene columna `modalidad`: el Sales Type vive en el SO (`revenue_model_id`).
- **D-162 — Folios por secuencias en `op`.** `seq_cpo`/`seq_so`/`seq_op` vía `op.fn_next_folio`: numérico continuo, el año es solo etiqueta (`CPO-2026-#####`, `SO-2026-#####`, `OP-2026-#####`), namespace independiente del histórico `OP-0001…0088`. El adjunto del CPO es una **referencia a Storage** (ruta/URL en texto), no un archivo en tabla.

**Frontend (E121) — 2 módulos nuevos + grupo de MARCO "Camino C":**
- `modulo-o1-cpo.js` (ruta `o1-cpo`, scope `.pantalla-o1-cpo`): tira de KPIs (Abiertos/Convertidos/del mes), tabla desde `v_op_customer_po`, alta vía `fn_op_cpo_alta` (cliente desde `v_catalogo_clientes`, adjunto = referencia de texto), y acción "Generar Sales Order" en CPOs Abiertos.
- `modulo-o1-so.js` (ruta `o1-so`, scope `.pantalla-o1-so`): alta desde un CPO vía `fn_op_so_crear_desde_cpo` (Sales Type = `v_revenue_models`; líneas producto/cantidad/uom/precio, precio opcional = comisión pura correcta), tabla desde `v_op_sales_orders`, ficha con **tablero** `v_op_so_tablero` (Required/Allocated/Purchased/Open — Allocated y Purchased en 0 y en gris, "llegan en O2/O3"; Open resaltado), botón **Confirmar** (`fn_op_so_confirmar`) en Draft y cambios de estado vía `fn_op_so_set_estado`.
- Cableado: `<script>` de ambos en `index.html` antes de `app.js`; grupo `camino-c` en el riel (`.icrail`, ícono `ti-route`), en el menú agrupado (`nav.lateral`) y en `GRUPO_META` de `app.js`. Respeta D-105: el menú se pinta por `ERP.perfil.modulos`; si el backend aún no registró las claves `o1-cpo`/`o1-so` en `modulos_erp`, los ítems se ocultan pero el router permite llegar por URL (`#/o1-cpo`, `#/o1-so`).
- Catálogos reusados (vistas ya vivas del ERP, NO se inventaron nombres): clientes `v_catalogo_clientes`, productos `v_catalogo_productos`, modelos de venta `v_revenue_models`. `p_actor` = `ERP.perfil.socio_codigo` (o null).

**ANCLAS:** sin cambio en las anclas de dinero — O1 es un namespace nuevo vacío; no toca Cuadre/CxC/CxP/JPM ni el histórico. Frontend money-neutral. Este chat es frontend/docs y no reverifica en vivo (Supabase MCP no autenticado en esta sesión); la prueba de aceptación (DoD O1) la corre Miguel en producción.

## Sesión E125 (2026-08-13) — CAMINO C · Incremento B: "Leer PO con IA" (D-169/170/171)
_Slice final de O1 — el reinicio operativo Order-to-Cash queda con captura asistida por IA sobre
el mismo par de RPCs manuales ya probado (D-160/161/162). **D-169/170/171 son decisiones de
BACKEND** (esquema, extensión, Edge Function, RPCs de sugerencia) — aplicadas por el chat de
backend; **este chat es frontend** y consume el contrato ya desplegado ("INFRA VIVA"), no lo
verifica en vivo (Supabase MCP no autenticado en esta sesión). Se documentan aquí porque este chat
cierra el incremento end-to-end._

- **D-169 — `pg_trgm` en el schema `extensions`** (no en `public`): habilita similitud de texto
  (`word_similarity`) para el mapeo de la IA contra catálogo (cliente/producto), sin ensuciar el
  namespace público con objetos de extensión.
- **D-170 — Edge Function `extraer-po`** (`verify_jwt=false`, valida el JWT/capacidad `capturar`
  DENTRO de la función, no vía el gate nativo de Supabase): dos rutas — "ping" (health-check) y
  "extracción" real (descarga el PDF de `cpo-adjuntos` por `ruta`, lo manda a Claude). Modelo
  primario **Haiku 4.5**, con **Sonnet 5 de respaldo** si Haiku falla o el JSON no es válido.
  Contrato de respuesta/errores fijo (ver INFRA VIVA abajo) — invocada por el frontend con
  `supabase.functions.invoke('extraer-po', {body:{ruta}})`, que adjunta el JWT de sesión solo.
- **D-171 — `fn_op_sugerir_contraparte`/`fn_op_sugerir_producto`** (RPCs de solo lectura,
  `SECURITY DEFINER`, nacen **cerradas** — sin GRANT a `anon`; consumidas SOLO desde dentro de
  `extraer-po`, no expuestas directo al frontend). Umbral de coincidencia **0.3** vía
  `word_similarity` (pg_trgm, D-169); por debajo del umbral, `sugerencia:null` — el frontend
  obliga a elegir manual (D-167 ya documentado en la sesión de O1 original: nunca se crea
  contraparte/producto nuevo desde este flujo).

**Contrato consumido por el frontend (INFRA VIVA, ya viva — no se re-creó):**
- `supabase.functions.invoke('extraer-po', {body:{ruta}})` — `ruta` = ruta del objeto DENTRO de
  `cpo-adjuntos`, SIN el prefijo `storage:cpo-adjuntos/`.
- Éxito 200: `{ok:true, modelo_usado, extraccion:{numero_po,fecha,moneda}, mapeo:{cliente:{texto,
  sugerencia,alternativas}, lineas:[{producto_texto,cantidad,uom,precio,sugerencia,alternativas}]}}`.
  `sugerencia`/cada item de `alternativas` = `{id, etiqueta|nombre, ..., score, es_sugerencia:true}`.
- Errores (`ok:false,error`): 400 `falta_ruta` · 401 `sin_sesion`/`auth_error` · 403
  `sin_permiso_capturar` · 404 `descarga_falla` · 502 `anthropic_falla`/`json_invalido`.

**Frontend (E125) — `modulo-o1-cpo.js` (sin archivo nuevo; extiende el flujo de alta de CPO):**
- Botón **"Leer PO con IA"** (ícono `ti-sparkles`) en el form "Nuevo Customer PO", habilitado solo
  tras subir un PDF/imagen a `cpo-adjuntos` (reusa el `adjuntoSubido` del Incremento A/E122). Al
  click: estado "Leyendo…" con spinner (`ti-loader-2.ti-spin`), invoca `extraer-po` con
  `{ruta: parseStorageRef(adjuntoSubido).ruta}` (prefijo `storage:cpo-adjuntos/` quitado en
  frontend, nunca se manda a la función). Errores mapeados a español por código (D-170).
- **Pantalla de revisión** (`abrirRevisionIA`, mismo panel/drawer global `#panelBody`): aviso
  ámbar fijo "La IA sugiere… Nada se guarda hasta que confirmes"; encabezado editable (N° PO,
  fecha, moneda — `select` de `ERP.MONEDAS`, no texto libre, para no mandarle a la RPC una moneda
  inválida); **Cliente** — combo buscable sobre `v_catalogo_clientes` (mismo catálogo que el alta
  manual), preseleccionado con `combo.seleccionar()` si hay `sugerencia.es_cliente`, badge de
  score (verde ≥70%, ámbar ≥30%, rojo <30%, gris "sin sugerencia"), chips de `alternativas`
  (filtradas a `es_cliente`) que reseleccionan el combo al click; sin sugerencia → combo vacío,
  **Confirmar bloquea** hasta elegir manual (D-167, verificado). **Sales Type** — `select` de
  `v_revenue_models` activos, SIEMPRE vacío al abrir (la IA nunca lo sugiere), obligatorio.
  **Líneas** — tabla editable, un combo de producto POR FILA sobre `v_catalogo_productos`
  (`permitirNuevo:false` en cliente y producto — D-167: nunca se crea catálogo nuevo desde aquí),
  mismo patrón de badge/alternativas/preselección que cliente; cantidad/UOM/precio editables,
  precio vacío = comisión pura (correcto, igual que el flujo manual); agregar/quitar filas.
- **"Confirmar y guardar"** (botón primario NEGRO — `var(--btn)/var(--btnT)`, dark-aware): reusa
  **EXACTAMENTE** los 2 RPCs y el shape de `p_lineas` del flujo manual (`fn_op_cpo_alta` →
  `fn_op_so_crear_desde_cpo`, mismo `{producto_id,cantidad,uom,precio_unitario}` que
  `lineasPayload()` de `modulo-o1-so.js`); `p_actor:null` en ambos (lo resuelve el server por
  JWT); `p_adjunto_ref` = el mismo `adjuntoSubido` ya construido por el Incremento A. **Guardia
  anti-huérfano:** si el paso A (CPO) tiene éxito y el paso B (SO) falla, el CPO NO se reintenta
  en un segundo click (se guarda `customer_po_id` localmente) — solo se reintenta la SO; el aviso
  de error explica exactamente qué se creó y qué falló, con instrucción de reintento o de generar
  la SO a mano desde la lista de Customer PO. **Cancelar** no escribe nada.

**Verificación (Chrome DevTools MCP, flujo real con mocks de red — sin sesión Supabase real):**
red mockeada a nivel `fetch` (catálogos, `extraer-po`, ambas RPCs) para poder ejercitar el código
de PRODUCCIÓN sin aproximarlo — clicks reales sobre el DOM real, subida de archivo real
(`File`/`DataTransfer` + evento `change` real → `onArchivoCPO` real). Confirmado:
1. Botón deshabilitado hasta subir archivo; habilitado tras subida real.
2. `invoke` recibe `{ruta}` SIN el prefijo `storage:`.
3. Pantalla de revisión prellenada exacta (cliente 100%, línea 92% + línea "sin sugerencia" con
   combo vacío y precio vacío intacto).
4. Chip de alternativa reselecciona el combo correctamente.
5. Confirmar sin Sales Type → bloquea con mensaje claro; línea sin producto elegido → bloquea con
   mensaje claro (D-167).
6. Payload real capturado en ambas RPCs: `p_cliente_id`/`p_lineas`/`p_actor:null` exactos,
   `p_adjunto_ref` con el formato `storage:cpo-adjuntos/<ruta>` correcto.
7. **Caso CPO-creado/SO-falla:** primer intento crea CPO (1 llamada) y la SO falla (aviso claro);
   reintento NO duplica el CPO (sigue en 1 llamada) y la SO se reintenta (2ª llamada) hasta éxito.
8. Claro y oscuro verificados por screenshot — "Confirmar y guardar" negro/blanco correcto en
   ambos temas (`var(--btn)/var(--btnT)`, dark-aware desde E123).

**Archivos tocados:** `modulo-o1-cpo.js` (único `.js` tocado), `estilos.css` (bloque nuevo,
sin scope de pantalla — vive en `#panelBody`). Ningún cambio a `tokens.css` ni a otros módulos.

**ANCLAS:** sin cambio — mismo flujo O1 money-neutral (D-160..162); la IA solo prellena, el
guardado real sigue siendo el mismo par de RPCs ya auditados. Este chat no reverifica `v_anclas`/
`v_seguridad_auth` en vivo (sin acceso a Supabase MCP en esta sesión) — la lectura de sanidad
pedida (CxC/CxP/JPM sin mover, `v_seguridad_auth` 0/0/0) la corre el chat de backend o Miguel.

## Sesión E127 (2026-08-13) — CAMINO C · O2a/O2b: Inventario + Asignación + Gasto de entrada (D-177..180)
_Cierre de FRONTEND para O2 (Inventario + Lots + Allocation). **Backend O2a/O2b ya estaba HECHO Y
PROBADO** (motor CxP con ENSAYO ok) — este chat es frontend y consumió el contrato **verificado en
vivo por Miguel/backend en esta misma sesión** (Supabase MCP autorizado a pedido de este chat,
justo para esto: no quiso adivinar firmas de RPC). D-177 es el entregable de frontend; D-178/179/180
son las decisiones de implementación de backend que quedaron pendientes de registrar._

- **D-177 — Frontend O2a + O2b entregado.** 3 archivos tocados/nuevos, `node --check` limpio,
  verificado end-to-end con red mockeada al contrato exacto (Chrome DevTools MCP, clicks reales
  sobre el DOM real — mismo método que E121-E126):
  - **`modulo-o1-inventario.js` (nuevo, ruta `o1-inventario`, grupo "Camino C").** Lista de lotes
    desde `v_op_inventario` (KPIs Lotes/Disponible total/Ubicaciones) + **"Recibir inventario"**
    (`fn_op_lot_recibir`): producto (combo sobre `v_catalogo_productos`, `permitirNuevo:false`),
    ubicación (combo derivado de `v_op_inventario` — sin vista dedicada de ubicaciones todavía,
    ver limitación abajo — con "+ Nueva ubicación" inline que llama `fn_op_location_alta` y
    preselecciona la ubicación recién creada), cantidad, UOM (default CAJA), proveedor de origen
    (opcional), referencia de origen, fecha. Un lote se recibe SIN ligar a ninguna operación ni
    venta (`op.lots` es standalone).
  - **`modulo-o1-so.js` (extendido).** El tablero de la ficha de Sales Order (Required/Allocated/
    Purchased/Open) gana una acción **"Asignar"** por línea (solo si `open > 0` y `capacidad
    capturar`): abre un panel con el lote elegible (filtrado a `producto_id` de la línea +
    `disponible > 0`, desde `v_op_inventario`) y cantidad; llama `fn_op_alloc_crear(p_so_linea_id,
    p_lot_id, p_cantidad)`, con guardas de UI (cantidad ≤ disponible del lote Y ≤ open de la
    línea — el backend es la autoridad, esto es solo guía). Si no hay lote disponible del
    producto, ofrece un atajo directo a "Recibir inventario nuevo" con el producto prellenado.
    Allocated dejó de mostrarse en gris (ya no es "futuro"): sube en vivo al asignar.
  - **`modulo-operaciones.js` (extendido).** Botón **"Agregar gasto de entrada"** en la ficha de
    OP (`verOperacion`), junto a "Agregar compra"/"Registrar embarque": concepto (select
    restringido en frontend a los 3 conceptos de recepción — In & Out QC/Fletes/Aduanas — de
    `v_catalogo_conceptos_costo`, con red de seguridad si el nombre vivo cambiara), monto,
    contraparte real (combo opcional sobre `v_directorio_contrapartes&es_proveedor=true`), nota.
    Llama `fn_op_costo_entrada` (que NO acepta `p_actor`, a diferencia de las RPCs de Camino C —
    confirmado no mandarlo). `p_op_lot_id` se manda SIEMPRE `null` desde esta pantalla — deliberado
    (ver D-178). **La LECTURA no necesitó código nuevo:** `v_operacion_costos`/`v_operacion_cxp`
    ya traen la capa `'op'` vía UNION (D-179) — un gasto capturado aquí aparece solo en "Costos
    por línea"/"Costo por contraparte real (CxP)" del mismo drawer al recargar.
  - **Limitación conocida (anotada, no bloqueante):** no hay vista dedicada de ubicaciones — el
    picker de `modulo-o1-inventario.js` se arma por-dedupe de `v_op_inventario`, así que una
    ubicación recién creada solo aparece "de forma persistente" (entre sesiones) hasta que tenga
    al menos un lote. Dentro de la MISMA sesión de captura queda disponible de inmediato (se
    agrega al array en memoria al crearla). Suficiente para el flujo real; una vista
    `v_op_locations` sería la mejora natural si el catálogo de ubicaciones crece.
  - **Sin "liberar" en esta pasada:** `fn_op_alloc_liberar(p_allocation_id)` existe y quedó fuera
    del alcance de esta pantalla — no hay vista que exponga IDs de allocation individuales (solo
    agregados vía `v_op_so_tablero`), así que no hay forma segura de ofrecer "liberar" sin
    inventar una consulta. Parqueado para cuando exista esa vista.

- **D-178 — O2b anclado a `public.operaciones` (stack VIVO), no a `op.lots`/`op.operaciones`
  (Camino C).** `op.op_costos.operacion_id` → `public.operaciones(folio_op)` — el motor de gasto
  de entrada vive del lado del modelo OP en producción (`OP-00xx`), no del namespace nuevo de O1
  (`OP-2026-#####`, hoy vacío). Consecuencia directa para frontend: el botón de captura vive en
  `modulo-operaciones.js` (la ficha OP legacy, ya en uso real por Miguel), no en `modulo-o1-so.js`.
  `op.lots` tampoco tiene `operacion_id` — por eso `p_op_lot_id` se deja siempre `null` desde
  "Agregar gasto de entrada": no hay cross-check que impida ligar un lote que no corresponda a
  esa OP, y ofrecer el campo sin esa validación invitaría un error silencioso de captura. Cuando
  Camino C migre el negocio real (O1 deje de estar vacío), hay que migrar la FK de `op.op_costos`
  + las vistas junto con cargas/Sales Orders — pendiente parqueado, no de esta sesión.
- **D-179 — Columna `capa` en `v_operacion_cxp`/`v_operacion_costos` (UNION `'contable'|'op'`).**
  Ambas vistas ya usadas por `modulo-operaciones.js` desde antes de O2 ahora combinan filas del
  modelo contable histórico y de `op.op_costos` en una sola fuente — el frontend de lectura NO
  necesitó ningún cambio: el UNION resuelve la coexistencia de los dos stacks de forma
  transparente para la pantalla que ya existía.
- **D-180 — `v_anclas.cxp_total` pliega `op.op_costos` (NOT anulado).** Una sola fuente de CxP
  para el ancla global — un gasto de entrada capturado vía O2b mueve el ancla `cxp_total` igual
  que cualquier otro costo del modelo contable histórico, sin una segunda cuenta paralela.

**Verificación (Chrome DevTools MCP, red mockeada al contrato exacto, flujo real):**
1. O2b: picker de concepto correctamente restringido a 3/6 conceptos mockeados (Aduanas/In & Out
   QC/Fletes); payload capturado en `fn_op_costo_entrada` exacto (`p_operacion_id:"OP-0088"`,
   `p_concepto:"Fletes"`, `p_monto:850.5`, `p_contraparte_id:22`, `p_op_lot_id:null`, nota — SIN
   `p_actor`); tras guardar, vuelve a `verOperacion()` (recarga de lectura).
2. O2a recibir: producto + "Nueva ubicación" inline (`fn_op_location_alta` con
   `{p_codigo:"NGL-01",p_nombre:"Bodega Nogales"}`, preselección automática de la ubicación
   creada) + proveedor + cantidad → `fn_op_lot_recibir` con payload exacto
   (`p_producto_id:3,p_location_id:501,p_on_hand:300,p_uom:"CAJA",p_proveedor_id:22,
   p_origen_ref:"OC-0123",p_fecha:"2026-08-13"`).
3. O2a asignar: tablero con línea Open=200 → "Asignar" → lote filtrado por producto+disponible
   mostrado correctamente → validación de exceso sobre Open (200) probada y bloqueada antes de
   probar con cantidad válida (150) → `fn_op_alloc_crear` con payload exacto
   (`p_so_linea_id:55,p_lot_id:9001,p_cantidad:150`) → vuelve al tablero actualizado.
4. Caso "sin lote disponible": mensaje correcto + atajo "Recibir inventario nuevo" que prellena
   el producto de la línea (verificado: combo de producto llega con "PAPAYA" ya seleccionado).
5. Modo oscuro verificado por color computado (mismo triple-selector `.pantalla-o1-cpo/so/
   inventario` extendido de E121, sin selectores nuevos sin verificar).

**Archivos:** `modulo-o1-inventario.js` (nuevo), `modulo-o1-so.js` + `modulo-operaciones.js`
(extendidos), `index.html` (script + nav "Camino C"), `estilos.css` (scope `.pantalla-o1-
inventario` extendiendo el bloque triple-selector de E121). Ningún cambio a `tokens.css`.

**ANCLAS:** O2a (recibir/asignar) es money-neutral por diseño — `op.lots`/`op.inventory_
allocations` no mueven CxC/CxP/JPM. O2b SÍ mueve `cxp_total` (D-180) — cada gasto de entrada
capturado es un costo real nuevo, exactamente como capturar un costo por el flujo contable
histórico ya existente; no es un movimiento "extra" ni duplicado. Este chat no corrió la lectura
de sanidad post-cambio (`v_anclas`/`v_seguridad_auth`) — la pidió a Miguel/backend antes de dar
por cerrada la sesión, ya que este chat es frontend y su verificación de Supabase MCP en esta
sesión fue solo para leer firmas, no para escribir ni para correr la lectura de sanidad final.

## Sesión E128 (2026-08-14) — CAMINO C · Módulo Catálogos (frontend, Parte B) + contrato backend
_Módulo maestro de catálogos del reinicio Camino C. **División de trabajo (regla de dos chats):** este
chat (frontend) redactó el contrato de backend y construyó la Parte B; el **DDL (Parte A) lo aplica el
chat de backend** con `SPEC-CATALOGOS-BACKEND.md`. Las decisiones D-## del schema `cat.*` las numera y
registra el chat de backend al aplicar; aquí se registra la decisión de arquitectura frontend + el
hand-off._

- **Decisión (frontend/arquitectura):** el modelo nuevo (SKUs/`listas_valores`/vínculos/contactos/
  papelera) vive en un **schema `cat.*` aislado** (nace cerrado, mismo patrón que `op.*`), expuesto por
  `public.v_cat_*` (lectura) + `public.fn_cat_*` (escritura). **NO** se toca el `modulo-catalogos.js`
  viejo (Directorio Comercial) ni sus tablas vivas `productos`/`contrapartes` — el módulo nuevo es un
  stack paralelo en el grupo Camino C (`modulo-catalogos-c.js`, ruta `catalogos-c`). Migrar/retirar el
  viejo se decide cuando el nuevo esté probado.
- **Contrato entregado:** `SPEC-CATALOGOS-BACKEND.md` (8 tablas, 11 vistas, ~30 RPCs, seed de listas,
  papelera vía `deleted_at`, regla archivar-si-tiene-movimientos, `v_seguridad_auth 0/0/0`). Commit
  `1943904`.
- **Frontend E128:** `modulo-catalogos-c.js` — master-detail 3 pestañas, ficha de producto (con armador
  de SKU desde listas + "＋ otro" al vuelo + preview en vivo, tarjetas/matriz, linklines de clientes),
  ficha de contraparte (badges, correo/WhatsApp, fiscal, términos, contactos, SKUs), vínculos
  bidireccionales por picker, altas, import de Excel (parseo real XLSX + auto-mapeo + preview + confirmar),
  papelera y pantalla de Listas. Portado de `catalogos-completo.html` a tokens reales (dark-aware). Detalle
  y verificación (red mockeada al contrato, claro/oscuro) en `REPORTE-FRONTEND.md` (E128).
- **Construido ANTES del backend** (Miguel autorizó): enlaza directo cuando el chat de backend aplique
  `cat.*`; hasta entonces el módulo muestra un aviso pidiendo aplicar la spec. Si el backend renombra
  algo, se re-sincronizan unos identificadores del frontend.

**ANCLAS:** sin cambio — frontend money-neutral; el schema `cat.*` es nuevo y vacío; no toca Cuadre/CxC/
CxP/JPM ni el histórico. La verificación de seguridad (`v_seguridad_auth 0/0/0`) y el DDL los corre el
chat de backend al aplicar `SPEC-CATALOGOS-BACKEND.md`.

## Sesión E129 (2026-08-17) — CAMINO C · O1 frontend: picker cliente-scoped, fix de paneles,
editar/eliminar CPO+SO (D-181..183)
_Backend O1 ya realineado a `cat.*` a nivel SKU (E128, `efaf7f3`). `fn_cat_sugerir_sku` ya ampliado
con `p_contraparte_id`/`p_solo_vinculados`/`es_vinculado` antes de esta sesión (backend). Esta sesión
(frontend, Claude Code, sin acceso a Supabase MCP) cerró los 4 pendientes marcados [Claude Code] en
`PENDIENTES-BACKEND.md` para poder correr el checkpoint real de O1._

- **D-181 (frontend/UX):** `ERP.crearPickerSku` pasa a ser cliente-scoped por defecto — si se le da
  `contraparteId`, arranca mostrando solo los SKU vinculados a ese cliente (`p_solo_vinculados=true`),
  con toggle a "ver todos". Selección se muestra como chip de etiqueta completa (root cause del
  truncamiento: `<table>` angosta + `.combo-item .txt` con ellipsis heredado de `crearCombo` — se
  separó con CSS propio del picker). `o1-cpo.js`/`o1-so.js` mandan el `cliente_id` del CPO a cada
  picker de línea; el flujo IA además auto-matchea por texto leído+cliente y preselecciona si
  `score>=0.7`. Commits `f988913` + hoy. **Por qué importa:** sin esto, capturar una línea de SO
  obligaba a buscar entre TODOS los SKU del catálogo (152) en vez de solo los ~5-10 que ese cliente
  realmente compra — el auto-match además deja la línea pre-mapeada tras leer el PO con IA, el
  usuario solo confirma.
- **D-182 (frontend/bug):** fix de "paneles montados uno sobre otro" — `ERP.abrirPanel()` no
  re-dispara la transición de entrada si el drawer ya estaba `'abierto'`, así que saltar de una
  ficha a otra (ej. CPO→generar SO, o IA→SO) sin cerrar antes se veía como contenido superpuesto.
  Fix: `ERP.cerrarPanel()` al inicio de toda función que abre un panel lógicamente nuevo (mismo tick
  que el `abrirPanel()` siguiente → sin parpadeo). Aplicado a los 9 entry points de `o1-cpo.js` +
  `o1-so.js` (lista completa en `REPORTE-FRONTEND.md` E129). Commits `8209ff0` + hoy.
- **D-183 (frontend, RPCs YA existían en backend):** botones Editar/Eliminar en las fichas de CPO y
  SO, sobre `fn_op_cpo_editar`/`fn_op_cpo_eliminar` (CPO, gateado a estado Abierto) y
  `fn_op_so_editar`/`fn_op_so_eliminar` (SO, solo header — no líneas — gateado a estado Draft).
  **Nota de riesgo:** esta sesión no tuvo Supabase MCP para confirmar los nombres exactos de
  parámetro; se usó `p_so_id` para SO (mismo patrón que `fn_op_so_confirmar`/`fn_op_so_set_estado`,
  ya en uso y confirmado en el propio archivo) y `p_customer_po_id` para CPO (único patrón visible en
  `fn_op_cpo_alta`). **Pide al backend que confirme estos 4 nombres de parámetro en vivo** — si algún
  nombre no coincide, el primer intento de editar/eliminar tira el error exacto de Postgres (falla
  ruidosa, no silenciosa) y se corrige en una línea.
  **RESUELTO (mismo día, 2ª pasada, commit `337dee4`):** backend confirmó las 4 firmas reales — los
  4 RPCs usan `p_id` (no `p_customer_po_id`/`p_so_id` como se había inferido; corregido). Además
  llegaron 2 campos que no estaban contemplados: `fn_op_cpo_editar` también recibe `p_adjunto_ref` y
  `p_cliente_id` (cliente editable solo si el CPO aún no tiene Sales Order); `fn_op_so_editar`
  también recibe `p_revenue_model_id` (Sales Type editable solo en Draft). Payload de los 4 RPCs
  verificado exacto en navegador (contexto sin caché). Eliminar SO ahora avisa explícito que reabre
  el CPO a 'Abierto'; eliminar CPO avisa que borra su SO en cascada si ya tiene una.

**ANCLAS:** sin cambio — sesión 100% frontend, `op.*` sigue vacío (0 CPO/SO/OP), no toca Cuadre/CxC/
CxP/JPM. **Pendiente real para cerrar O1:** correr el checkpoint (D-181 §9 de
`DISENO-O1-REALINEAMIENTO.md`) — registrar un Customer PO real → generar y confirmar su Sales Order →
ver tablero Required/Open. Esto lo hace el chat de backend/Miguel con Supabase MCP, no este chat.

## Sesión (2026-08-18) — fix centralizado de "paneles montados" (D-184)
_Miguel siguió viendo el overlap en producción después de D-182 (commits 8209ff0/37ea21e/337dee4),
que solo cubrió los entry points de O1. Frontend (Claude Code) — sin acceso a Supabase MCP._

- **D-184 (frontend/bug, fix centralizado):** D-182 parcheó `ERP.cerrarPanel()` en los ~9 puntos de
  entrada de `modulo-o1-cpo.js`/`modulo-o1-so.js`, pero ~25 módulos MÁS comparten el mismo drawer
  (`#panel`/`#panelOv`) y ninguno llamaba `cerrarPanel()` antes de encadenar a otro panel (cargas,
  cobranza, pagos, tesorería, facturas, ventas, lotes, loads, liquidaciones, órdenes...) — parchar
  módulo por módulo nunca iba a cerrar el hueco completo. Fix real: nueva `desmontarPanel()` en
  `comun.js` que **remueve nodo por nodo** el contenido anterior de `#panelBody` (no solo lo oculta
  con la clase CSS `abierto` ni depende de que el próximo `innerHTML=` lo pise a tiempo), llamada
  tanto al inicio de `abrirPanel()` (así ningún módulo necesita acordarse de `cerrarPanel()` primero)
  como dentro de `cerrarPanel()`. Un solo lugar, cubre los ~30 módulos que usan el drawer.
  **Nota de honestidad:** el bug NO se reprodujo visualmente en ningún intento (Chrome DevTools,
  latencia realista simulada, doble apertura simultánea) — este es un endurecimiento preventivo de
  la causa más probable (contenido viejo vivo en el DOM bajo ciertas condiciones de timing), no una
  reproducción-y-cura puntual. Verificado con hard-refresh en 2 módulos no tocados en sesiones
  previas (`modulo-usuarios.js`, `modulo-o1-inventario.js`): cada transición de panel deja
  `panelBody` con exactamente 1 hijo (cero residuo), cierre deja 0 hijos, nunca más de 1 `#panel`/
  `#panelOv` en el DOM. `node --check` limpio.

**ANCLAS:** sin cambio — frontend, no toca `op.*`/Cuadre/CxC/CxP/JPM. **Si Miguel lo sigue viendo
tras desplegar y hard-refresh:** pedir captura de pantalla — sin eso, seguir adivinando el mecanismo
visual exacto ya no es productivo.

## Sesión (2026-08-18, continuación) — Catálogos: editar contacto, purgar papelera, cache-busting (D-185)
_4 RPCs nuevos ya en backend (`fn_cat_contacto_editar`, `fn_cat_*_purgar` ×5). Frontend (Claude
Code) — sin acceso a Supabase MCP._

- **D-185 (frontend, RPCs YA existían en backend):** (a) ícono Editar en cada contacto de la ficha
  de contraparte → `fn_cat_contacto_editar(p_id, p_nombre, p_rol, p_email, p_telefono_whatsapp)`,
  firma verificada con payload en navegador; (b) botón "Eliminar definitivo" en Papelera junto a
  Restaurar, por tipo (`fn_cat_producto/sku/variedad/contraparte/contacto_purgar`), con `confirm()`
  explícito de irreversibilidad — si el backend bloquea por dependencias (EXCEPTION), el mensaje se
  muestra tal cual en un toast de 9s (verificado con el caso real: "tiene 3 SKU(s) y 1 variedad(es)
  asociados..."); (c) folio: sin hardcode del formato viejo en UI, solo se corrigió un comentario
  interno de `CPO-2026-#####` a `CPO-26-001`.
- **Hallazgo colateral importante (explica D-184):** mientras probaba (b), reproduje EN VIVO —
  con la Performance API del navegador (`transferSize:0` en el `<script>` original vs. `87639` en un
  `fetch(...,{cache:'no-store'})` manual al mismo archivo) — que el navegador sirve `modulo-*.js`
  desde caché **incluso con una navegación `ignoreCache:true` sobre un contexto ya usado**. Esto
  confirma empíricamente que la causa más probable de "el fix no se ve en prod" (D-184 y anteriores)
  es caché del navegador, no el código. Fix aplicado: **cache-busting real** — `?v=20260818` en los
  32 `<script src>` y 2 `<link rel=stylesheet>` **locales** de `index.html` (CDNs sin tocar). De aquí
  en adelante, cada vez que se despliegue código con cambios notables, bump del `?v=` en `index.html`
  para forzar que el navegador de Miguel traiga los archivos nuevos sin depender de que el hard
  refresh funcione perfecto.

**ANCLAS:** sin cambio — frontend, no toca `op.*`/`cat.*`/Cuadre/CxC/CxP/JPM.
