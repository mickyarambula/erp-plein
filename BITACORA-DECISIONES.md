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
