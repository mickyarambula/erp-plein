# REPORTE DE ESTADO DEL FRONTEND — ERP Plein

## ✅ ACTUALIZACIÓN — 2026-07-30 (Módulo nuevo "Órdenes de Venta" / Sales Orders — Fase C.1, E65/E66)

Módulo nuevo `modulo-ventas.js` (ruta `ventas`, menú "🧾 Órdenes de Venta"), espejo estructural de
`modulo-ordenes.js`. Hace operativa la Fase C: crear Sales Orders eligiendo Revenue Model por orden
y repartir cajas de embarques. Documento **interno** — sin PDF ni correo, a propósito (ERP_PP/D-55).

- **Archivos tocados:** `modulo-ventas.js` (nuevo), `index.html` (nav + `<script>`), `estilos.css`
  (chip `.so-estado` borrador/confirmada/cerrada/cancelada), `modulo-expediente.js` y
  `modulo-cargas.js` (sección "Órdenes de venta" en la pestaña factura del Expediente y en la ficha
  clásica, vía `ERP.montarVentasCarga`).
- **Vistas consumidas (solo lectura):** `v_sales_orders`, `v_sales_order_cargas`, `v_revenue_models`,
  `v_catalogo_clientes`, `v_carga_detalle`. Todas verificadas en vivo antes de programar.
- **RPCs:** `fn_crear_so`, `fn_asignar_carga_so`, `fn_desasignar_carga_so`, `fn_confirmar_so`,
  `fn_cerrar_so`, `fn_cancelar_so` (firmas confirmadas en vivo).
- **Lista:** folio · cliente · Revenue Model (rm_codigo + nombre) · estado (chip) · customer_po ·
  n_cargas · cajas_asignadas_total · días crédito. Filtros estado/cliente/texto + export Excel/PDF.
- **Crear (modal):** cliente (combo `v_catalogo_clientes`, **prellena días de crédito del cliente**,
  editable) + Revenue Model (combo `v_revenue_models`). **Los inputs de parámetro se muestran/ocultan
  según `formula_tipo` del RM** (catálogo, no hardcodeado): `comision_por_caja`→"Comisión por caja";
  `margen`→"Precio compra/caja"+"Precio venta/caja"; `pct_venta`→"% comisión"; `buy_resell`→sin
  inputs (mensaje "la utilidad se deriva de los costos"); un tipo desconocido cae a un mensaje
  defensivo. Opcionales: customer_po, cotización (folio), moneda (USD/MXN), incoterm, nota. Solo el
  param del modelo elegido viaja con valor; el resto van null.
- **Ficha:** header solo-lectura (con nota visible "el encabezado no se edita — no hay `fn_editar_so`;
  para cambiar cliente/RM, cancelar y recrear"). Sección "Cargas asignadas" (`v_sales_order_cargas`):
  en Borrador, botón "Asignar carga" (picker de embarques de `v_carga_detalle` con cajas visibles +
  cajas + precio/caja opcional → `fn_asignar_carga_so`, muestra `cajas_restantes_carga`) y "Quitar"
  por fila (`fn_desasignar_carga_so`). Botones de estado gateados por estado + rol: Borrador→Confirmar,
  Confirmada→Cerrar, Borrador/Confirmada→Cancelar con motivo. Errores del backend se muestran tal cual.
- **Verificación:** `node --check` en los 3 JS tocados. **Flujo real en navegador** (arnés con
  `comun.js`+`modulo-ventas.js` reales, `ERP.q`/`ERP.rpc` interceptados): confirmado el toggle de
  params por los 4 `formula_tipo`, el prefill de días, el payload EXACTO de `fn_crear_so` (para margen
  solo viajan precio compra/venta), la ficha con params del modelo, y las 3 RPCs de acción
  (confirmar/asignar/desasignar) con sus argumentos exactos, más `montarVentasCarga` en el Expediente.
  Desplegado (`npx vercel --prod`) y verificado en producción vía `curl`.
- **Decisión / límite:** `p_programa_id` se manda **siempre null** — ninguna vista expone el id bigint
  del programa (`v_programas_comerciales` solo trae `codigo`/`etiqueta`), así que no se puede poblar
  sin adivinar. Omitido del modal y anotado en PENDIENTES-BACKEND.md (regla dura: dato faltante en
  vista → pendiente de backend, no lectura de tabla ni `.catch`).

---


## ✅ ACTUALIZACIÓN — 2026-07-30 (CxP por proveedor: migrado a v_cxp_proveedor_atribuido)

Resuelve el pendiente #1 de la entrada de abajo. `modulo-pagos.js:109` (dentro de `render()`) —
cambiado `q('v_cxp_proveedor_real')` por `q('v_cxp_proveedor_atribuido')`. Mismos alias de
columna (`proveedor`, `cargas`, `costo`, `pagado`, `saldo_cxp`, `contraparte_id`), verificados en
vivo antes de tocar código — **no cambió ningún nombre de columna ni la lógica de render**
(`pintarProveedores` sigue igual). Se agregó un ⓘ discreto en el encabezado "Saldo CxP" (mismo
patrón `.info-nota` / `ERP.cablearInfoNota` ya usado en Finanzas para las notas de `v_balance`),
con el texto: "Pagado y saldo por proveedor son ESTIMADOS por prorrateo: los pagos se registran
a nivel carga, no por línea de costo." — hover muestra el tooltip nativo, tap/Enter dispara un
toast (accesible por teclado).

**Los números en pantalla cambian respecto a antes — es esperado, no un bug:** AGROFEPAC deja de
ser el "cajón de sastre" (backend E60/E62, ver `BITACORA-DECISIONES.md` D-49) y aparecen los
proveedores reales por línea de costo (Las Brisas, BBA, Suárez, Agricooling, etc.).

`node --check` OK. Smoke test puro (6/6) de la generación del `<th>` con el ⓘ: clase
`info-nota` presente, `data-nota`/`title` con el texto exacto, ícono visible, accesible por
teclado (`role="button"` + `tabindex="0"`), sin romper la etiqueta. Desplegado
(`npx vercel --prod`) y verificado en producción vía `curl` — cero menciones de
`v_cxp_proveedor_real` en el archivo servido. **Backend puede borrar `v_cxp_proveedor_real` en
cuanto confirme este deploy.**

---

## ⏳ PENDIENTE — 2026-07-30 (tras REESTRUCTURA E57–E61, ningún trabajo de frontend hecho aún)

Nota de rutina de documentación (no hay código nuevo esta entrada): la sesión backend E57–E61
aprobó el GATE de la REESTRUCTURA (dos ejes, Fases A–D — detalle en `PLAN-MAESTRO.md` y
`CLAUDE.md`) y dejó dos pendientes de UI explícitos:

1. **Reapuntar `modulo-pagos.js:108`** de `v_cxp_proveedor_real` (parche de E56, re-atribuye
   solo en lectura) a **`v_cxp_proveedor_atribuido`** (E61, fuente real por línea vía
   `carga_costos.contraparte_id`, mismas columnas). **Aún no se hace**: el backend marca
   pagado/saldo de la vista nueva como ESTIMADOS por prorrateo (los pagos siguen capturados a
   nivel carga, no por línea) — falta que E62 atribuya pagos por línea antes de que el cambio
   sea un drop-in tan limpio como el de E56. Confirmar con Miguel antes de repuntar.
2. **Rediseño visual (Fase 3 de la REESTRUCTURA):** tokens + guía de componentes. Dirección
   acordada en E57 (mockup de Embarques como referencia). **Fase 3 NO inventa estilos nuevos** —
   usa los ya existentes del dashboard actual (paleta verde/ámbar/rojo, tipografía, densidad).
   Sin sesión de frontend asignada todavía.

---

## ACTUALIZACIÓN — 2026-07-29 (CxP por proveedor: corrección AGROFEPAC/Papayas & More)

`modulo-pagos.js:108` — cambiado `q('v_cxp_proveedor')` por `q('v_cxp_proveedor_real')` (drop-in
del backend, mismas columnas + `contraparte_id` opcional) en el resumen "Saldo por proveedor". No
se tocó `v_cxp_proximas` (línea 109, próximos vencimientos) ni ningún otro call site — era el
único. `node --check` OK. Desplegado (`npx vercel --prod`) y verificado en producción vía `curl`.

---

## ACTUALIZACIÓN — 2026-07-29 (Guía suave de producto por contraparte + "Nueva carga desde programa", E55)

Backend E55: `v_contraparte_productos(contraparte_id, contraparte, rol, producto_id, producto,
en_programa, en_historico)` y `v_programa_captura(codigo, etiqueta, modalidad,
termino_proveedor, venta_tipica_carga, cajas_tipicas_carga, cliente_*, proveedor_*,
producto_ids, productos[jsonb])`. Verificadas en vivo antes de programar.

- **`comun.js` — `ERP.crearCombo` ampliado** (componente compartido por TODO el ERP, cambio
  100% aditivo — ningún otro combo del sistema manda `destacado` hoy, así que su comportamiento
  no cambió):
  - `items` ahora acepta un flag opcional `destacado: true`; el combo los ordena primero
    (orden estable, no revuelve el resto) y los marca con ★ — nunca oculta ni deshabilita las
    demás opciones.
  - Método nuevo `actualizarItems(nuevos)`: reemplaza el catálogo del combo en caliente (sin
    recrearlo, sin perder lo que el usuario ya escribió) — la pieza que permite reordenar el
    dropdown de producto cuando cambia la contraparte elegida.
  - Método nuevo `seleccionar({id, nombre})`: selección programática (dispara `alCambiar` igual
    que si el usuario hubiera elegido de la lista) — la pieza que permite la precarga "desde
    programa".
- **TAREA 1 — Guía suave de producto por contraparte** (`modulo-cargas.js`, Nueva carga y
  Editar carga): al elegir cliente o proveedor, se destacan/ordenan primero los productos que
  esa contraparte ya mueve (`v_contraparte_productos`). **Nunca bloquea:** si el usuario elige
  otro producto de todos modos, se le avisa con un `<div class="aviso warn">` no bloqueante
  ("Este producto no está en el historial de {contraparte} — ¿combo nuevo?") y la selección se
  completa igual. Un fallo de red al pedir el historial cae a "sin destacar" — nunca rompe la
  captura.
- **TAREA 2 — "Nueva carga desde programa"** (`modulo-cargas.js`, solo Nueva carga): selector
  nuevo con la lista de `v_programas_comerciales` (código + etiqueta). Al elegir uno, lee
  `v_programa_captura` y precarga cliente, proveedor y modalidad (vía `combo.seleccionar()`); el
  producto se precarga directo si el programa trae uno solo, o se destaca entre varios para
  elegir (mismo mecanismo de destacado de la TAREA 1) si trae más. **Es precarga, no candado:**
  ningún campo queda deshabilitado, todo se puede corregir después. Días de crédito y
  direcciones (que `fn_crear_carga` no recibe como parámetro) se muestran como panel informativo
  de solo lectura debajo del selector — no se envían a ninguna RPC. Se agregó la opción
  **"Comisión"**, que faltaba en el `<select>` de modalidad de Nueva carga (ya existía en Editar
  carga) — sin ella, un programa de modalidad `comision` habría precargado un valor inválido en
  el select.

`node --check` OK en los 2 archivos JS; CSS balanceada. **Flujo real en navegador** (no solo
vista estática): arnés de prueba con `comun.js`/`modulo-cargas.js` reales cargados en una página
aparte, `ERP.q` interceptado con datos de prueba (sin backend real) — se confirmó por consola y
por lectura del DOM: (1) al elegir un cliente, sus 2 productos históricos suben al principio del
combo con ★; (2) elegir un producto fuera de ese historial dispara el aviso exacto y la
selección se completa sin bloqueo; (3) elegir un programa precarga cliente/proveedor/producto/
modalidad y pinta el panel informativo, con los 3 campos siguiendo editables (`disabled: false`
verificado). Desplegado (`npx vercel --prod`) y verificado en producción vía `curl`.

---

## ACTUALIZACIÓN — 2026-07-29 (Liquidación con membrete de familia + consolidación de PDF de Invoice)

Dos tareas, un solo deploy. Sin cambios de backend.

- **Liquidación al productor (`modulo-liquidaciones.js`) rediseñada al estilo de la familia:**
  `htmlImpresion` dejó de usar `ERP.encabezadoImpresion` (header viejo blanco+texto verde) y ahora
  usa `ERP.membreteOficial('LIQUIDACIÓN AL PRODUCTOR / ACCOUNT OF SALES', [FECHA, LIQ #, PRODUCTOR])`
  — mismo header claro+logo+acento salvia que Invoice/PO/Quote — y agrega `ERP.pieOficial()`
  (footer verde) al final, que antes no existía. `LIQ #` pasó de `'— borrador'` a `'BORRADOR'`
  (mismo formato que el resto de la familia). El bloque "PRODUCTOR" ahora usa el mismo patrón
  "omitir vacíos" que VENDOR/BILL TO (placeholder `— sin productor asociado —` si no hay nombre).
  La tabla CONCEPTO/NOTA/MONTO, GROSS SALES y las deducciones por categoría (DEDUCTIONS/CUSTOMS/
  DUTIES) **no cambiaron de contenido ni semántica** — ya usaban las clases compartidas
  (`.inv-items`/`.inv-box-h`) así que el estilo de familia ya les aplicaba. **Nuevo:** si
  `descuadre` es distinto de cero (mismo centinela `hayDescuadre()` que ya gatea "Emitir" en la
  ficha), el PDF ahora muestra una fila `⚠ DESCUADRE` en rojo — antes el PDF no lo mostraba en
  absoluto. Sin leyenda PACA (no aplica, solo Invoice la lleva). **Pendiente anotado en
  PENDIENTES-BACKEND.md:** `v_liquidaciones` no trae dirección del productor (solo nombre); el
  bloque PRODUCTOR se queda con lo que hay, no se inventó nada.
- **Invoice: un solo botón de PDF (`modulo-facturas.js`).** Se retiró el flujo viejo completo
  (`imprimir()`, `htmlImpresion()`, `filaLineaImpr()`, el botón "Imprimir / PDF" y su wiring) —
  basado en `v_facturas` + `ERP.encabezadoImpresion`, sin el membrete nuevo. Queda solo
  "Generar/Descargar Invoice (PDF)" (`v_documento_invoice` + membrete compartido). `enviarCorreo()`
  ahora dispara `generarInvoiceOficial(f.id)` en vez de la función eliminada. `leyendaPaca()` se
  conservó intacta (la sigue usando el flujo oficial). Sin referencias colgando verificado por
  grep antes de desplegar.

`node --check` OK en los 2 archivos. **Vista previa visual real en navegador** con la CSS de
producción antes de desplegar: Liquidación se ve como la familia (logo + dirección de Plein +
acento salvia + título verde + pie verde) en 3 casos (normal, con descuadre, sin productor); la
fila DESCUADRE solo aparece cuando corresponde. Ficha de Facturación confirmada con **un solo**
botón de PDF (captura del bloque de acciones). Desplegado (`npx vercel --prod`) y verificado en
producción vía `curl`.

---

## ACTUALIZACIÓN — 2026-07-29 (Numeración oficial de documentos — PO-2026-#### / QT-2026-####, E55)

Backend E55 agregó `numero` (formato `PO-2026-0001` / `QT-2026-0001`, NULL en Borrador, se llena
solo al pasar a "Enviada", nunca se reasigna) a `v_documento_po`, `v_documento_quote`,
`v_ordenes_compra` y `v_cotizaciones`. Verificado en vivo antes de programar. El frontend **solo
lee** `numero` — no lo genera ni lo calcula.

- **`modulo-ordenes.js` (Purchase Order oficial, `htmlPOOficial`):** la línea de meta "PO #"
  ahora muestra `po.numero || 'BORRADOR'` (antes mostraba el folio interno). Se agregó una fila
  "REF. INTERNA" con el folio de trabajo (`OC-0002`) para poder localizar el documento aunque
  siga en borrador — se muestra siempre, no solo mientras no tiene número oficial.
- **`modulo-comercial.js` (Quote oficial, `htmlQuoteOficial`):** mismo cambio en "QUOTE #"
  (`qt.numero || 'BORRADOR'`) + fila "REF. INTERNA" con el folio (`COT-0001`). El botón de PO en
  la ficha "orden" de este módulo ya usa `ERP.generarPOOficial` (compartido con Órdenes de
  Compra), así que quedó cubierto por el mismo cambio sin tocarlo aparte.
- **Columna "N° oficial" en las listas:** agregada junto a la columna de Folio existente (no la
  reemplaza) en la lista de Órdenes de Compra (`modulo-ordenes.js`, sobre `v_ordenes_compra`) y
  en la lista compartida de Comercial (`modulo-comercial.js`, sirve tanto la pestaña
  "cotización" sobre `v_cotizaciones` como la pestaña "orden" sobre `v_ordenes_compra`). Muestra
  `numero` o `—` si es NULL — nunca vacío ni la palabra "null".

`node --check` OK en los 2 archivos tocados. Smoke test puro (9/9): PO/Quote enviada muestran el
número oficial, borrador muestra "BORRADOR", la referencia interna siempre trae el folio, y la
columna de lista cae a "—" ante `numero` null o ausente (no revienta, no inventa texto). **Vista
previa visual real en navegador** con la CSS de producción antes de desplegar: PO y Quote en
Borrador muestran "BORRADOR" + "REF. INTERNA"; en Enviada muestran `PO-2026-0001`/`QT-2026-0001`
manteniendo la referencia interna visible — confirmado con captura de los 4 casos (PO borrador,
PO enviada, Quote borrador, Quote enviada). Desplegado (`npx vercel --prod`) y verificado en
producción vía `curl`.

---

## ✅ CIERRE DE SESIÓN — 2026-07-28 (E54): DESPLEGADO Y VERIFICADO EN PRODUCCIÓN

Sesión E54 (backend resuelto en el chat de trabajo de Miguel; frontend construido y desplegado
en esta sesión). Todo quedó **desplegado en producción** (`npx vercel --prod`, proyecto
`erp-plein-dashboard`) y **verificado vía `curl`** contra los archivos servidos. Dos entregables:

1. **Variedad de producto, de punta a punta:** selector de variedad dependiente del producto en
   Nueva carga y Editar carga (`modulo-cargas.js`), y mini-pantalla de catálogo con alta de
   producto/variedad (`modulo-catalogos.js`).
2. **Documentos oficiales con membrete real de Plein:** Invoice, Purchase Order y Quote, los tres
   compartiendo el mismo membrete/tabla de renglones/footer (nuevo bloque compartido en
   `exportar.js`), sin duplicar markup entre los tres módulos que los generan.

Detalle completo de cada uno en las secciones de abajo. Las decisiones de negocio detrás de esta
sesión (separar variedad del nombre del producto, Espárrago Convencional/Orgánico, fusión
Las Brisas=AGROFEPAC por RFC, modelo de calibre de Presentaciones) están documentadas en
`BITACORA-DECISIONES.md` (D-35 a D-39) — ese archivo es la fuente de verdad del *por qué*;
aquí solo se documenta el *qué* se construyó en el frontend.

---

## ACTUALIZACIÓN — 2026-07-28 (Variedad de producto: captura/edición en Embarques + catálogo, E54)

Backend E54 entregó las tablas `variedades`/`presentaciones`, las columnas `cargas.variedad_id` /
`productos.activo`, las RPCs `fn_alta_producto` / `fn_alta_variedad` / `fn_set_variedad_carga`, y
las vistas `v_catalogo_variedades` y `v_carga_detalle` ampliada (`variedad_id`, `variedad_nombre`).
Verificado en vivo antes de programar (patrón 42501=existe-protegida / PGRST202=no-existe).

- **`modulo-cargas.js` — selector de Variedad dependiente del producto**, en los dos flujos de
  captura:
  - **Nueva carga:** el selector solo se activa cuando se elige un producto EXISTENTE del
    catálogo (si el usuario escribe uno nuevo vía "+Nuevo", no hay `producto_id` que filtrar).
    Lee `v_catalogo_variedades` filtrando por `producto_id` — **nunca la tabla `variedades`**
    directo (regla dura: frontend solo consume vistas/RPCs). Al crear la carga, si se eligió
    variedad, se llama `fn_set_variedad_carga` como paso secundario (mismo patrón que
    `fn_asignar_responsable`: si falla, la carga ya quedó creada, se avisa sin revertir).
  - **Editar carga:** el selector **precarga** la variedad ya asignada (`d.variedad_id`, que
    `v_carga_detalle` ya expone). Al guardar, `fn_set_variedad_carga` solo se llama si el valor
    final **difiere** del inicial — evita llamadas innecesarias y, como el valor actual siempre
    está a la vista, no hay riesgo de borrar una variedad por accidente.
  - Guardia anti-carrera: si el usuario cambia de producto varias veces rápido, una respuesta
    tardía de `v_catalogo_variedades` ya no pisa la lista del producto actual (contador de
    petición por instancia del selector).
- **`modulo-catalogos.js` — mini-pantalla de catálogo** (extendida la pestaña "Productos" ya
  existente en Directorio Comercial, no se creó una pantalla nueva):
  - Alta de producto ahora acepta **"Código de ítem"** opcional → `fn_alta_producto(p_nombre,
    p_codigo_item)`.
  - Cada producto lista sus **variedades** (chips) con botón "+ Variedad" (solo admin) que abre
    un formulario y llama `fn_alta_variedad(p_producto_id, p_nombre)`.

`node --check` OK. Smoke test puro (10/10 en la iteración de precarga/diff + 9/9 en la primera
iteración de agrupación/gate): agrupación de variedades por producto, precarga marca la opción
correcta, el gate por diff no llama si no hay cambio real, sí llama en cambio/borrado/alta,
guardia anti-carrera no deja que una respuesta vieja pise la actual. Desplegado y verificado en
producción vía `curl` en cada iteración.

---

## ACTUALIZACIÓN — 2026-07-28 (Documentos oficiales: Invoice, Purchase Order y Quote con membrete Plein, E54)

Construidos en 3 iteraciones sobre el mismo backend (`v_documento_invoice`, `v_documento_po`,
`v_documento_quote`, las 3 verificadas en vivo antes de programar): primero el Invoice con banda
verde, luego el ajuste a header claro + leyenda PACA (feedback de Miguel), y por último Purchase
Order y Quote reutilizando el mismo membrete ya aprobado.

- **`exportar.js` — membrete compartido por los 3 documentos** (nuevo, para no duplicar):
  `ERP.membreteOficial(titulo, filasMeta)` (header claro: logo directo sobre fondo claro,
  dirección fija de Plein debajo, título en verde de marca `#196B24` a la derecha, acento salvia
  `#E4EFE7` tipo abanico decorativo en la esquina), `ERP.pieOficial()` (footer verde con contacto
  y "Thank you for your business!"), `ERP.tablaLineasDoc(lineas)` (tabla de renglones ITEM# /
  DESCRIPTION / QTY / UNIT PRICE / TOTAL, mismo formato `lineas` JSON en los 3), y
  `ERP.bloqueEmpresaPlein()` (bloque "Plein Produce LLC" + dirección, para el BILL TO fijo del PO).
- **`modulo-facturas.js` — Invoice**: botón "Generar/Descargar Invoice (PDF)" en la ficha de la
  factura (adicional al "Imprimir / PDF" ya existente, no lo reemplaza). BILL TO / SHIP TO se
  arman campo por campo desde `v_documento_invoice` (`bill_to_nombre/direccion/ciudad/pais/tel`),
  omitiendo los vacíos. TOTAL sale del campo `total` de la vista (no de recalcular); cualquier
  diferencia contra la suma de líneas se muestra como OTHER, nunca se oculta un descuadre (mismo
  criterio que el centinela de `v_balance`). Lleva la **leyenda PACA** (misma fuente que el PDF
  viejo, `v_config` clave `factura_leyenda_paca` — no se reescribió).
- **`modulo-ordenes.js` — Purchase Order**: botón "Generar PO (PDF)" en la ficha de la orden.
  Bloque de contraparte = **VENDOR** (proveedor, mismo patrón de omitir vacíos) + **BILL TO**
  fijo con los datos de Plein. Meta: DATE / PO# / TERMS (`condiciones` si existe, si no
  `NET {dias_credito}`, si no un guion) / ENTREGA EST. SUBTOTAL/TOTAL directos de
  `v_documento_po` (sin recalcular). Expuesto como `ERP.generarPOOficial` para que
  `modulo-comercial.js` lo reutilice sin duplicar código.
- **`modulo-comercial.js` — Quote**: botón "Generar Quote (PDF)" en la ficha de cotización.
  Bloque BILL TO del cliente (mismo patrón que Invoice). Meta: DATE / QUOTE# / VALID UNTIL.
  El mismo botón, en la ficha de "orden" de este mismo módulo (que apunta a la misma orden de
  compra que `modulo-ordenes.js`), llama a `ERP.generarPOOficial` — el PO se agregó a **las dos**
  pantallas donde una orden de compra es visible hoy, para no dejar ninguna sin el botón.
- **Bug de layout encontrado y corregido en `estilos.css`** (afectaba a los 3 documentos,
  incluido el Invoice ya deployado): `.inv-totals` (la tabla de totales) se auto-expandía a
  ~690px por su layout de tabla sin `table-layout:fixed`, dejando la caja de comentarios/
  condiciones de al lado en ~2px de ancho (invisible). Se encontró al hacer la vista previa
  visual del PO/Quote en navegador real, no en el Invoice original (donde pasó inadvertido).
  Fix: `width` fijo (no `min-width`) + `flex:0 0 auto` en `.inv-totals`, `min-width:0` en
  `.inv-comments`.

`node --check` OK en los 4 archivos JS tocados en cada iteración; CSS con llaves balanceadas.
Smoke test puro por iteración (13/13, luego 12/12 adicionales para PO/Quote): BILL TO/SHIP TO/
VENDOR omiten vacíos, BORRADOR cuando no hay número, TERMS con fallback, reconciliación de
totales sin ocultar descuadres. **Vista previa visual real en navegador** (Chrome DevTools) con
la CSS de producción antes de cada deploy — así se detectó el bug de `.inv-totals` y se corrigió
antes de dar el trabajo por bueno. Desplegado y verificado en producción vía `curl` en cada
iteración.

---

## ✅ CIERRE DE SESIÓN — 2026-07-28 (E52): DESPLEGADO Y VERIFICADO EN PRODUCCIÓN

Toda la sesión de hoy quedó **desplegada en producción** (`npx vercel --prod`, proyecto
`erp-plein-dashboard`, URL `erp-plein-dashboard.vercel.app`) y **verificada vía `curl`** contra los
archivos servidos. Entregables del día:
1. **Botón "Enviar por correo"** (mailto interino + descarga del PDF) en Facturación.
2. **Directorio comercial enriquecido:** alta y edición de contraparte con 11 campos nuevos agrupados
   (Contacto / Facturación / Direcciones).
3. **Ficha de detalle de contraparte** (solo lectura, todos los roles) con botón de correo.
4. **Estándar visual unificado de los documentos impresos** — verde de marca **#196B24**.
5. (Antes en el día) módulos **Inventario** y **Liquidaciones** (GROSS SALES + deducciones por
   categoría), **LOTE** y **leyenda PACA** al pie de la factura.

Contrato backend↔frontend vigente registrado en **CLAUDE.md** (sección "CONTRATO VIGENTE tras E52").
Sin cambios de backend desde este entorno; solo consumo de vistas/RPCs ya desplegadas.

---

## ACTUALIZACIÓN — 2026-07-28 (Botón "Enviar por correo" en Facturación + Directorio comercial enriquecido)

Dos tareas de frontend sobre backend E52 ya desplegado.

### TAREA A — Botón "Enviar por correo" (mailto) en Facturación
Se completó el botón que había quedado a medias en `modulo-facturas.js`: el listener
(`factEnviarCorreo → enviarCorreo(f)`) ya existía, faltaba la función. Se creó `enviarCorreo(f)` junto a
`imprimir()`:
- **Para:** `f.cliente_email` (que `v_facturas` ahora expone). Si es null, el helper avisa "el cliente no
  tiene email en el catálogo — captúralo en Directorio Comercial" y **no** aborta el resto.
- **Asunto:** `Plein Produce — Invoice {numero}`.
- **Cuerpo:** saludo + "Adjunto la factura {numero} por {total}. Términos: {terminos}." + firma.
- El botón solo aparece si `f.estado === 'emitida'` (los borradores no se envían).
- Usa el helper compartido `ERP.enviarPorCorreoDoc()`: abre el `mailto` con un `<a>` temporal (sin
  recargar la SPA) y, como el mailto **no adjunta archivos**, dispara la descarga del PDF (`imprimir(f.id)`)
  y muestra el aviso "Adjunta el PDF que se acaba de descargar antes de enviar".

### TAREA B — Alta/edición de cliente/proveedor enriquecidas + ficha de detalle
El registro de contrapartes era pobrísimo (solo nombre/clase/rol/alias/días/nota). Backend E52 amplió
las RPCs y la vista `v_catalogo_admin` (ahora 20 columnas, las 11 nuevas verificadas en vivo). Cambios en
`modulo-catalogos.js`:
- **11 campos nuevos** agrupados visualmente en **Contacto** (persona, teléfono/WhatsApp, correo general),
  **Facturación** (razón social, RFC/Tax ID, correo de facturación/AP, licencia PACA) y **Direcciones**
  (bill to, ship to, ciudad, país). Un único helper `camposExtendidos(pref, c)` genera el mismo bloque
  para el alta (prefijo `ct`, vacío) y la edición (prefijo `ed`, precargado desde la vista) — sin
  duplicar HTML. Definición única en `CAMPOS_EXT` `[sufijoId, columnaVista, paramRPC]`.
- **Alta** (`fn_alta_contraparte`): `leerExtendidosAlta('ct')` — vacío → null (no se setea).
- **Edición** (`fn_editar_contraparte`): `difExtendidosEdicion('ed', c)` respeta la convención
  **NULL = no tocar**: solo viaja lo que el usuario cambió respecto a la vista; si borró un campo que
  tenía valor, viaja `''` para limpiarlo. Se eliminó el bloque manual de direcciones (lo subsume el helper).
- **Ficha de detalle (solo lectura, TODOS los roles):** el nombre de cada fila ahora es un enlace que abre
  `fichaContraparte(c)` — un panel con la info agrupada (cada sección/línea se pinta solo si tiene dato,
  nunca en blanco engañoso) + **botón "Enviar correo"** (mailto a `email_facturacion` si existe, si no a
  `email`; deshabilitado si no hay ninguno) + botón "Editar" (solo admin, salta a la edición). Antes solo
  el admin podía ver algo de la contraparte (vía el botón Editar); ahora cualquiera consulta y contacta.

`node --check` OK en `modulo-catalogos.js`, `modulo-facturas.js`, `comun.js`. Smoke test puro de la lógica
del differ (11/11): sin cambios → todo null; email cambiado viaja; campo borrado → `''`; whitespace no
cuenta como cambio; alta vacío → null. Desplegado y verificado en producción vía `curl`
(`enviarCorreo`/`factEnviarCorreo` en facturas; `camposExtendidos`/`difExtendidosEdicion`/`fichaContraparte`/
`CAMPOS_EXT` en catálogos; `grupo-form`/`ficha-cp`/`cp-nombre-link` en el CSS).

---

## ACTUALIZACIÓN — 2026-07-28 (Estándar visual unificado de los documentos impresos — verde de marca #196B24)
Unificación de la familia visual de los documentos oficiales con los templates .docx de Plein. Los
**3 documentos DOM** (INVOICE, PURCHASE ORDER, ACCOUNT OF SALES/settlement) ya compartían el header
`ERP.encabezadoImpresion()` + las clases CSS `.inv-*`, así que el grueso se resolvió en esos dos
puntos y aplicó a los tres de un golpe.

- **Verde de marca #196B24** (antes #1E5B3A): cambiado SOLO en las reglas de impresión de `estilos.css`
  (`.inv-title`, `.inv-box-h`, `.inv-items th`, `.inv-grand`, y el nombre de empresa) — la variable
  `--verde` de la UI de la app **NO se tocó** (habría recoloreado toda la interfaz). También se alineó
  el verde de los PDF jsPDF (`exportar.js` ×7 y la cotización en `modulo-comercial.js`) a RGB
  `25,107,36` = #196B24, para consistencia de marca en todo lo que se imprime/exporta.
- **Header rediseñado** (`encabezadoImpresion`): **IZQUIERDA** = logo + bloque de empresa Plein
  (nombre + dirección + contacto); **DERECHA** = título del documento + tabla meta (número/fecha/
  términos). El nombre cae a la constante `EMPRESA` ('Plein Produce LLC', fuente única, en mayúsculas
  vía CSS). **Dirección/contacto son config-driven**: nuevo helper `ERP.empresaImpresion()` los lee de
  `v_config` (claves `empresa_direccion`/`empresa_contacto`, una lectura cacheada compartida por los 3
  docs) y **solo los pinta si existen — NUNCA inventa una dirección legal** (mismo criterio que la
  leyenda PACA). Threaded por los 3 documentos (fetch en `imprimir`, pasado a `htmlImpresion`).
- **Tabla de líneas del INVOICE**: `<colgroup>` con los anchos del template (19/34/10/19/19 %),
  header verde, **QTY y UNIT PRICE centrados** (clase `.ctr` nueva) y **TOTAL a la derecha** (`.num`).
  Cajas BILL TO / SHIP TO y "Comments" al pie sin cambios de estructura; la leyenda PACA sigue debajo
  de comentarios. Términos ya salían como "NET {dias}".

`node --check` OK en los 5 archivos + smoke test puro del header: layout (logo+empresa a la IZQ
antes del meta a la DER); nombre por defecto (`EMPRESA`) sin config; dirección/contacto pintados solo
si vienen (multilínea → `<br>`, sin inventar); parseo de `v_config` (nombre de config sobreescribe el
default; claves ausentes → default); `esc` no rompe con `&`/`<`. Desplegado y verificado en producción
(#196B24 en el CSS de print, `inv-head-left`/`inv-company`/`empresaImpresion`/`25,107,36` en
exportar.js, colgroup/empresa en invoice, threading en PO/settlement/cotización — todo vía `curl`).

**Dos cosas que señalo (no bloqueé por ellas):**
1. **`mainlogo_1.png` NO está en el repo** (solo `logo-plein.png` y `logo.png`). Usé `logo-plein.png`,
   que ya estaba cableado. Si el logo oficial es otro archivo, hay que subirlo a `assets/` y cambiar
   la ruta en `encabezadoImpresion` (una línea).
2. **La dirección/contacto de Plein no existe hoy** en código ni en `v_config` (solo el nombre). El
   bloque de empresa muestra el nombre y se auto-completa cuando se agreguen las claves
   `empresa_direccion`/`empresa_contacto` a `v_config` (via el futuro `fn_set_config` + pantalla de
   Ajustes). Anotado en PENDIENTES-BACKEND.md.
3. **La cotización (quote) usa jsPDF** (motor de dibujo por coordenadas), NO el template DOM `.inv-doc`.
   Se le alineó el verde de marca; un match visual 1:1 con el template DOM sería una reescritura del
   motor de esa pantalla, fuera del alcance de esta pasada (anotado). El número de factura se conserva
   como la serie oficial PP-AAAA-NNNN (no se reformateó a 7 dígitos crudos, que rompería la serie).

## ACTUALIZACIÓN — 2026-07-28 (Liquidaciones — deducciones por categoría estilo STESAN, E52)
Backend E52: `v_liquidacion_deducciones` gana `categoria` (valores `general · material · flete ·
in_out · customs · duties · otro`); `fn_agregar_deduccion_liquidacion` gana `p_categoria DEFAULT
'general'` AL FINAL. La precarga ya auto-clasifica (Aduanas→customs, Fletes→flete, Cartón→material,
In & Out QC→in_out; el resto general). Columna y firma verificadas contra Supabase en vivo.

- **Ficha (borrador)**: el form "+ Agregar deducción" tiene un `<select>` de **Categoría** (7
  opciones, default **General**), y `agregarDeduccion` manda `p_categoria`. La tabla de deducciones
  muestra la categoría como **chip** (`.pill gris`) en columna propia; `tfoot` colspan ajustado 2→3.
  Catálogo de categorías centralizado (`CATEGORIAS`/`CAT_LABEL`); una categoría desconocida (valor
  futuro) se muestra cruda, no rompe.
- **PDF (account of sales)**: el desglose se reorganizó en secciones agrupadas por categoría (modelo
  STESAN), en el orden pedido: Bruto → **Comisión Plein** (con %) → **DEDUCTIONS** (material/flete/
  in_out/general/otro) → **CUSTOMS** → **DUTIES** → NETO → −Anticipos → SALDO. Cada sección lleva su
  encabezado, sus líneas (concepto/nota/−monto) y su **subtotal**. Una categoría sin líneas **no
  pinta sección** (sin ruido vacío). **CUSTOMS/DUTIES van aparte; todo lo demás —incluidos NULL y
  cualquier categoría futura— cae en DEDUCTIONS**, así ninguna línea se pierde por una categoría no
  listada. Es solo presentación: el total de deducciones y el neto **no cambian** (todas restan
  igual).

`node --check` OK + smoke test puro: `catLabel` (etiquetas, default General, valor futuro crudo);
agrupación del PDF (CUSTOMS/DUTIES aparte; material/flete/in_out/general/NULL/categoría-inventada →
DEDUCTIONS); **invariante crítico verificado — la suma de los 3 subtotales = el total global de
deducciones** (1,847.00 en el escenario de prueba, todas restan igual); y que las secciones vacías
no se pintan. Desplegado y verificado en producción (`p_categoria`, `dedCategoria`, las 3 llamadas
`seccionDedPDF('DEDUCTIONS'/'CUSTOMS'/'DUTIES')` y la columna Categoría vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Liquidaciones — líneas de venta "Gross Sales" en el borrador, E52)
Backend E52: vista `v_liquidacion_ventas` (id, liquidacion_id, numero, producto, lote, unidades,
precio_unit, monto, orden) + 2 RPCs gate `capturar`, solo en borrador, que recalculan
**bruto/comisión/neto** solas: `fn_agregar_venta_liquidacion(p_liquidacion_id, p_producto, p_monto,
p_lote, p_unidades, p_precio_unit)` → id · `fn_quitar_venta_liquidacion(p_venta_id)`. Vista y firmas
verificadas contra Supabase en vivo antes de programar. Comportamiento clave: **cuando hay líneas,
el BRUTO = suma de las líneas** (el backend lo recalcula); el "Bruto de venta" del alta queda como
fallback para liquidaciones sin desglose.

En la ficha de una liquidación **en borrador** (`modulo-liquidaciones.js`), sección nueva **"Ventas
(Gross Sales)" ARRIBA de Deducciones**:
- **Tabla**: producto · lote · unidades · precio unit · monto + subtotal (bruto). Botón **✕** por
  fila (`.btn-cap`, `fn_quitar_venta_liquidacion`) con confirmación ligera + recarga.
- **"+ Agregar venta"**: producto (requerido) · monto (requerido, **≥ 0** — a diferencia de las
  deducciones que exigen > 0) · lote / unidades / precio unit (opcionales; vacío → `null`, negativos
  rechazados). `fn_agregar_venta_liquidacion` → recarga la ficha: **bruto, comisión, neto y descuadre
  llegan ya recalculados** de `v_liquidaciones`.
- **Gating idéntico a las deducciones**: `editable = estado==='borrador' && ERP.puede('capturar')`.
  En emitida/anulada NI se pintan la columna del ✕ ni el form; la tabla queda de solo lectura (el
  `<th>`/celda del ✕ y del `tfoot` son condicionales, sin columna vacía colgando). El fetch de
  `v_liquidacion_ventas` se agregó al `Promise.all` del `verLiquidacion`.
- Leyenda bajo el form: *"Si capturas líneas, el bruto se recalcula como la suma de las líneas
  (sobreescribe el bruto provisional del alta)."*
- Reusé el helper `numOpc` para los 3 opcionales numéricos (unidades/precio) — '' → `null`, `< 0` →
  error.

**PDF (account of sales):** si la liquidación tiene líneas, se pinta una sección **"GROSS SALES"**
ARRIBA del desglose (modelo STESAN) — tabla PRODUCT · LOT · UNITS · UNIT PRICE · AMOUNT + SUBTOTAL,
con las clases `.inv-items`/`.inv-grand` ya existentes. Sin líneas → no se pinta (el desglose usa el
"Bruto de venta" del alta como antes). `imprimir()` ahora trae `v_liquidacion_ventas` junto con las
deducciones y las pasa a `htmlImpresion(l, ventas, deducciones)`.

`node --check` OK + smoke test puro: visibilidad de controles (solo borrador + `capturar`); alta de
venta (producto/monto requeridos, **monto 0 válido**, negativo/no-numérico rechazados, opcionales
'' → null, lote con trim); subtotal = suma de líneas; y el gating del PDF (GROSS SALES solo con
líneas). Desplegado y verificado en producción (`fn_agregar_venta_liquidacion`,
`fn_quitar_venta_liquidacion`, `v_liquidacion_ventas`, "GROSS SALES", `data-quitar-vta` vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Leyenda legal PACA al pie del PDF de factura, E52)
Backend E52: vista `v_config` (pares clave/valor, GRANT SELECT authenticated) con la fila
`clave='factura_leyenda_paca'` → el texto legal PACA (~454 chars, inglés). Verificado contra
Supabase que la vista y la clave existan antes de programar. Cambio acotado a `modulo-facturas.js`,
**solo en el PDF/impresión** (no toca la ficha ni el autocompletado desde el cliente, que ya vive
en backend).

- **`leyendaPaca()`** (nuevo): lee `v_config` filtrando `clave=eq.factura_leyenda_paca&select=valor`.
  `ERP.q` cachea por URL → reimprimir no vuelve a pegarle al backend ("leer una vez"). Devuelve el
  `valor` **tal cual** (no se traduce ni se recorta — es requisito legal).
- **`imprimir(id)`** ahora hace `const leyenda = await leyendaPaca()` y lo pasa a `htmlImpresion(f,
  leyenda)`.
- **Pie en el PDF**: cuando hay leyenda, se agrega al final del `.inv-doc`, **en TODA factura**,
  separado del resto por una línea (`border-top`), en letra chica pero legible (`font-size:8.5px`,
  `line-height:1.35`), con `white-space:pre-wrap` para respetar cualquier salto de línea del texto
  legal. El texto se escapa con `esc()` (solo entidades HTML; no altera el sentido legal).
- **Sin fila / vacía / fetch falla → NO se inventa texto**: se **omite el pie** (mejor sin leyenda
  que con una mal escrita) y se deja un `console.warn`. Nunca se pinta un pie vacío.
- **No editable desde la factura**, es fijo (viene de config). *Futuro (no ahora):* cuando exista
  `fn_set_config(p_clave, p_valor, p_nota)` y una pantalla de Ajustes, la leyenda PACA y las demás
  claves se editarán ahí — anotado, sin construir.

`node --check` OK + smoke test puro: resolución del valor (fila presente → texto verbatim con el
mismo largo, sin recorte; sin filas / valor vacío / solo-espacios / null / fetch-falla → `null` =
se omite) y el pie (con leyenda → línea separadora + 8.5px + pre-wrap + el texto PACA íntegro con
"7 U.S.C. 499e(c)"; sin leyenda → string vacío, no un div vacío). Desplegado y verificado en
producción (`leyendaPaca`, `factura_leyenda_paca`, `leyendaPacaTxt` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Módulo nuevo "Inventario" — solo lectura, E52)
Backend E52: vista `v_inventario` (una fila por carga viva NO cerrada). Las 18 columnas verificadas
contra Supabase en vivo antes de programar. Módulo nuevo `modulo-inventario.js` (ruta `inventario`,
menú "📥 Inventario" entre Antigüedad de saldos y Cotiz. y órdenes). Solo lectura — no hay escritura
de inventario.

- **Dos semáforos de exposición arriba** (tarjetas `.hoy-card`, mismo estilo que las alertas de
  Inicio), **calculados sobre TODO el inventario, NO sobre lo filtrado** (buscar no debe ocultar el
  riesgo):
  - **"Capital parado"** (`comprado_sin_vender=true`): ámbar, con el total de `costo_total` de esas
    cargas y sus folios. Ya pagadas sin venta reportada — son las que esperan liquidación (hoy
    P-079/P-080/P-081). Si fueran 0 → tarjeta gris "Sin capital parado".
  - **"Exposición: vendido sin sourcing"** (`vendido_sin_comprar=true`): **rojo** cuando hay (riesgo
    operativo real: venta comprometida sin costo), con su total de venta. Hoy 0 → tarjeta gris "Sin
    exposición". Se pinta en rojo automáticamente en cuanto aparezca alguna.
- **Secciones por `bucket`, en el orden pedido:** En tránsito · **En piso** · Entregado (sin cerrar)
  · En proceso · Otro. Cada sección con su título + conteo + total costo/venta y una tabla de sus
  cargas (Folio clicable al Expediente · Lote —con lote_productor debajo si existe— · Producto ·
  Proveedor · Cliente · Cajas · Pallets · Costo · Venta · CxC · CxP).
  - **"En piso" se muestra SIEMPRE, aunque salga vacía** (a propósito: Plein no tiene bodega aún),
    con estado vacío *"Sin producto en piso — se activa cuando haya bodega."* No se esconde.
  - Los demás buckets canónicos se pintan solo si tienen cargas (no meten ruido vacío).
  - **Robustez de agrupado** (mismo criterio que v_balance/estados, sin hardcodear a ciegas): el
    grupo se casa con el `bucket` de la vista por comparación **normalizada** (tolera acentos/
    mayúsculas), y cualquier `bucket` que la vista traiga y NO esté en el orden canónico se pinta
    **al final** con su etiqueta cruda — nunca se pierde una carga.
- **Buscable** por lote / lote_productor / producto / proveedor / cliente / folio (filtra las
  secciones; los semáforos siguen globales). Conteo dinámico "N de M cargas".

`node --check` OK + smoke test puro: orden de secciones (canónico + "En piso" vacío visible + bucket
no-canónico al final; "Otro" vacío NO se pinta por no ser especial); el buscador filtra las secciones
pero "En piso" sigue visible y los semáforos NO cambian con el filtro (son globales); y el cálculo de
los dos semáforos (Capital parado = 3 cargas / total costo / ámbar; Vendido sin sourcing = 0 → gris,
y → rojo con su venta en cuanto aparece uno). El único "fallo" del test fue un artefacto de float en
la propia aserción (10877.34999…); el módulo muestra el total con `usd()`, que redondea a $10,877.35.
Desplegado y verificado en producción (`v_inventario`, registro del módulo, ambos semáforos, "En piso"
y el menú/script confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (LOTE en Embarques y Órdenes de Compra, E52)
Backend E52: `v_carga_detalle` expone al final `lote` (siempre presente, ej. "LOTE-2026-0042"),
`lote_productor` (opcional) y `f_cosecha` (opcional); `v_ordenes_compra` hereda `lote`/`lote_productor`
de la carga ligada (NULL si la OC no tiene carga). `fn_editar_carga` ganó 2 params opcionales AL
FINAL: `p_lote_productor`, `p_f_cosecha` (gate `administrar`, motivo obligatorio, NULL = no tocar).
El **lote interno (`cargas.lote`) lo asigna el backend solo — el frontend NUNCA lo manda.** Contrato
(3 columnas de `v_carga_detalle`, 2 de `v_ordenes_compra`, firma ampliada de `fn_editar_carga`)
verificado contra Supabase en vivo antes de programar.

**1) Embarques — lista (`modulo-cargas.js`):** columna **"Lote"** nueva (el interno), junto a V7 en
el bloque de identidad. `tfoot` colspan ajustado 9→10. El buscador ahora también matchea por `lote`
y `lote_productor` (traza PACA); placeholder actualizado.

**2) Embarques — ficha:** LOTE, lote productor y cosecha visibles (lectura) en el det-grid, tanto
en el **Expediente** (`modulo-expediente.js`, Resumen) como en la ficha clásica. La **edición** de
`lote_productor` (texto) y `f_cosecha` (fecha) vive en el modal **"Editar embarque"** (gate
`administrar`, motivo obligatorio, como el resto de la edición de carga), vía `fn_editar_carga`
ampliada. El lote interno se muestra ahí como **campo fijo no editable** ("Lo asigna el sistema").
Los 2 campos siguen el patrón solo-cambiados ya establecido: `lote_productor` como `p_po` (texto;
'' explícito lo limpia), `f_cosecha` como `p_f_embarque` (fecha; NULL = no tocar, con la misma
limitación conocida de no poder vaciarse desde la UI).

**3) Órdenes de Compra (`modulo-ordenes.js`):** columna **"Lote"** en la lista (lectura) y campo
**"Lote"** en la ficha (campo fijo, con `lote_productor` si existe y aclaración "heredado del
embarque; se edita en la ficha del embarque"). Solo lectura — la OC no edita el lote.

**4) Form de nueva carga:** nota en la leyenda: *"El lote se asignará automáticamente al crear la
carga (el lote del productor y la fecha de cosecha se capturan después, desde la ficha)."* — no se
agregó ningún campo de captura de lote en el alta.

`node --check` OK en los 3 archivos tocados + smoke test puro de la lógica de payload: `lote_productor`
(primera captura null→valor; sin cambio→null; mismo valor con espacios→null; cambio→valor; vaciar→''
explícito) y `f_cosecha` (primera captura; misma fecha timestamp-vs-date→null; cambio→fecha; vaciar→
null); y verificación de que **el lote interno nunca aparece en el payload**. Desplegado y verificado
en producción (`p_lote_productor`/`p_f_cosecha`/`eaLoteProd`/columna Lote en cargas; `d.lote_productor`
en Expediente; columna + `o.lote` en Órdenes — confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Liquidaciones — edición de deducciones en el borrador)
Backend E51 desplegó 2 RPCs nuevas (gate `capturar`, solo corren en borrador y recalculan el neto
solas): `fn_agregar_deduccion_liquidacion(p_liquidacion_id, p_concepto, p_monto, p_nota)` →
id · `fn_quitar_deduccion_liquidacion(p_deduccion_id)`. Firmas verificadas contra Supabase en vivo
antes de programar. Caso de uso: un embarque trae pick&pack real que SÍ se le cobra al productor y
no se precargó (el concepto "Comisión" ya no se precarga, por decisión de negocio).

En la ficha de una liquidación **en borrador** (`modulo-liquidaciones.js`, `cuerpoFicha`), bajo la
tabla de deducciones:
- **Renglón "+ Agregar deducción"** con inputs concepto (requerido) / monto USD (requerido, > 0) /
  nota (opcional) y botón. Llama `fn_agregar_deduccion_liquidacion`; al volver **recarga la ficha
  completa** (`verLiquidacion`) — el neto, el total de deducciones y el descuadre llegan ya
  recalculados de `v_liquidaciones`, no se computan en el cliente.
- **Botón ✕ "quitar"** en cada fila de deducción (clase `.btn-cap` ya existente, sin CSS nuevo) →
  `fn_quitar_deduccion_liquidacion(id)` (el `id` sale de `v_liquidacion_deducciones`), con
  confirmación ligera ("El neto y el descuadre se recalculan") y recarga.
- **Gating estricto:** ambos controles se calculan con `editable = estado==='borrador' &&
  ERP.puede('capturar')`. En **emitida/anulada NI se pintan** (ni la columna del ✕ ni el form) —
  la tabla queda de solo lectura; los triggers del backend igual lo impedirían, pero el usuario no
  ve un control que va a fallar. El `<th>` extra del ✕ y su celda del `tfoot` también son
  condicionales, así que la tabla no queda con una columna vacía en modo lectura.
- Errores del backend vía `ERP.avisarSiPermiso` (permiso) o toast/aviso (resto), tal cual el resto
  del módulo. `ERP.marcarDatosSucios()` tras cada escritura.

`node --check` OK + smoke test puro: visibilidad de los controles (solo borrador + `capturar`;
ocultos en emitida/anulada aunque haya capacidad) y el alta (concepto requerido, monto vacío ≠ 0
por accidente, monto ≤ 0 rechazado, no-numérico rechazado, decimal preservado, nota con trim → null)
+ el payload de quitar (id string del dataset → number). Desplegado y verificado en producción
(`fn_agregar_deduccion_liquidacion`, `fn_quitar_deduccion_liquidacion`, `data-quitar-ded`,
`dedAgregar` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Módulo nuevo "Liquidaciones al productor" + cierre de 2 pendientes E50)
Backend E51 desplegó el account of sales que PACA exige. Contrato verificado contra Supabase en
vivo antes de programar: las 2 vistas (`v_liquidaciones` 23 columnas, `v_liquidacion_deducciones`
7 columnas) y las 3 RPCs (`fn_crear_liquidacion`/`fn_emitir_liquidacion`/`fn_anular_liquidacion`,
con sus firmas exactas) existen tal cual.

**Prerrequisito — 2 pendientes de E50 (lecturas de tabla base → vista):**
- **`modulo-tesoreria.js`**: `q('tipos_movimiento')` → `q('v_cat_tipos')`. La tabla base `tipos_movimiento`
  daba 401 a authenticated (la regla es solo-vistas), así que el `<select>` de tipo en "Editar
  movimiento" salía vacío y reclasificar era imposible (hallazgo F-11 de la auditoría). Con la vista
  ya popula. Mismas columnas (`tipo`), swap drop-in.
- **`modulo-proyectos.js`**: `q('categorias_presupuesto')` → `q('v_cat_presupuesto')`. Igual: el
  `<select>` de categoría en "+ Línea de presupuesto" degradaba a solo "—". Mismas columnas
  (`orden`, `nombre`).

**Módulo nuevo `modulo-liquidaciones.js`** (ruta `liquidaciones`, menú "🧑‍🌾 Liquidaciones al
productor", tras Facturación) — espejo de Facturación (mismo flujo borrador→emitida→anulada, serie
al emitir):
- **Lista**: filtro por estado + búsqueda (número/productor), export Excel/PDF. Columnas Número ·
  Productor · Fecha · Estado (pill) · Bruto · Neto productor · Saldo a pagar · **Descuadre** · Emb.
- **Nueva liquidación** (gate `capturar`, `fn_crear_liquidacion`): combo de productor (contra
  `v_catalogo_proveedores`); al elegir productor se filtran sus embarques vivos de `v_carga_detalle`
  por `proveedor_id` (columna E49) y se muestran como checkboxes → `p_cargas` (text[] de folios);
  bruto de venta (requerido, ≥0), comisión % (opcional — vacío = el backend la toma del programa),
  nota. Se crea en borrador; el backend precarga deducciones desde `carga_costos`.
- **Ficha** (solo lectura + acciones): desglose completo en grid (bruto, comisión con su %,
  deducciones, **NETO PRODUCTOR** destacado, anticipos, saldo a pagar), tabla de deducciones
  (`v_liquidacion_deducciones`, concepto/nota/monto), lista de embarques, quién capturó/emitió.
- **Reglas duras de UI cumplidas:**
  - **Descuadre**: siempre pintado. Si `|descuadre| ≥ $0.01` → banner rojo *"DESCUADRE DE $X — no
    se puede emitir"* y el botón **Emitir queda `disabled`** (el backend igual lo rechaza, pero el
    usuario lo ve antes). Si cuadra → confirmación verde discreta.
  - **Tras emitir no se edita**: no existe RPC de edición (los triggers lo impiden); la ficha es de
    solo lectura siempre, solo Imprimir/Emitir/Anular según estado. Emitida/anulada ocultan Emitir.
  - **Saldo negativo = el productor debe a Plein**: se pinta en azul (#2A6098) con nota aclaratoria
    *"(el productor debe a Plein)"*, **nunca en rojo de error**. Positivo = normal.
  - Formato `$12,345.67` y fechas `DD-mmm-YYYY`.
- **Emitir** (gate `editar`, `fn_emitir_liquidacion`): confirmación, asigna serie LQ-AAAA-NNNN,
  toast con el número. **Anular** (gate `administrar`, `fn_anular_liquidacion`): motivo obligatorio
  vía prompt (mismo patrón que Facturación); banner de anulación con motivo.
- **PDF "LIQUIDACIÓN AL PRODUCTOR / ACCOUNT OF SALES"** vía `ERP.encabezadoImpresion()` +
  `ERP.imprimirArea()` (logo compartido, espera la carga de imagen). Desglose tipo cuenta de ventas:
  Bruto de venta → −Comisión Plein (con %) → cada deducción con su concepto/nota → **NETO AL
  PRODUCTOR** → −Anticipos → **SALDO A PAGAR**. Reusa las clases `.inv-doc`/`.inv-items`/`.inv-grand`
  del INVOICE, sin CSS nuevo. Es el documento que PACA exige.
- **Retornos RPC robustos**: `unwrap(data, key)` desempaqueta escalar / arreglo de filas / objeto
  sin asumir la forma (fn_crear devuelve `id` escalar, fn_emitir devuelve `numero` escalar).

`node --check` OK en los 3 archivos JS tocados/creados + smoke test puro: descuadre (0/residuo/≥1
centavo, y negativo, bloquea Emitir); saldo negativo → tratamiento distinto (no error); `unwrap` en
las 3 formas de retorno + null; embarques como arreglo o texto; `cargasDelProductor` (filtra por
`proveedor_id`, excluye anuladas, id string-vs-number, vacío sin productor); y el armado del payload
de creación (validaciones + comisión vacía → `null` = del programa + bruto 0 válido + nota con trim).
Desplegado y verificado en producción (módulo, menú, script y los 2 swaps E50 confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Capturar la venta de una consignación — liquidar consignación)
Nuevo flujo sobre `fn_liquidar_consignacion(p_folio, p_ingreso_real, p_resolucion,
p_estado_final)` (RPC ya desplegada, gate `editar`) — sin tocar SQL/backend ni la máquina de
estados. Cierra el hueco: las consignaciones salían con venta $0.00 y la UI las marcaba
"esperando liquidación", pero no dejaba capturar esa venta cuando se conseguía comprador.

- **Botón "+ Capturar venta (liquidar consignación)"** en la ficha clásica de embarque
  (`modulo-cargas.js`, `pintarFicha`), en una sección nueva **"Venta de consignación"** junto a
  las demás acciones de captura (Costos, Cobros y pagos). Visible SOLO si `modalidad='consignacion'
  && !anulado && ERP.puede('editar')` — la sección entera no se pinta en cargas que no son
  consignación. Vive en la ficha clásica (a la que el Expediente llega por "＋ Captura y
  acciones"), igual que el resto de la captura y que "Editar embarque".
- **Form desplegable** (mismo patrón toggle in-place que "Agregar costo"/"Registrar cobro/pago",
  sin modal aparte): monto de venta USD (requerido, ≥ 0 — se precarga con la venta previa si ya
  había una declarada, para poder corregirla); referencia de la liquidación (texto requerido);
  y selector **"¿Avanzar estado?"** con default **"Dejar igual (recomendado)"**, más "Marcar
  Entregada" / "Marcar Cerrada". Leyenda de ayuda autoexplicativa: *"Capturar la venta NO cambia
  dónde está el contenedor; solo registra el precio. Cámbialo solo si además ya se
  entregó/cerró."*
- **`p_estado_final`**: la opción "Dejar igual" manda **`null` explícito** (no cambia el estado
  logístico); solo "Entregada"/"Cerrada" lo avanzan — son los dos únicos valores que la RPC
  acepta (contrato fijo de la RPC, no el catálogo de estados abierto; se documenta así en el
  código).
- **Validación cliente** (el backend re-valida): monto requerido y ≥ 0 — se valida el string
  crudo para distinguir "vacío" de "0 capturado a propósito" (0 es válido, `Number('')` daría 0
  por accidente); referencia no vacía (con `trim`). Errores `PERMISO_DENEGADO`/"Sin permiso" →
  `ERP.avisarSiPermiso`; cualquier otro error del backend se muestra tal cual.
- **Al éxito**: `refrescarFicha(d.folio)` recarga la ficha → aparece la CxC (saldo por cobrar),
  el badge pasa de ámbar "esperando liquidación" a gris "venta declarada", y se ve el nuevo
  ingreso/utilidad. Toast con el `resultado` que devuelve la RPC (fallback local si viene vacío).
- Recordatorio contable (D-04/D-11, ya vigente): capturar la venta **declara la CxC**; el
  ingreso se reconoce al **COBRAR** (el cobro sigue por el flujo existente de "Cobros y pagos") —
  este botón solo cubre el paso de asignar el precio de venta.

Firma de la RPC verificada contra Supabase en vivo antes de programar (los 4 parámetros
resuelven, gate `editar`). `node --check` OK + smoke test puro: visibilidad del botón (solo
consignación viva + capacidad editar; oculto en anuladas/otras modalidades; modalidad NULL no
rompe) y armado del payload (`p_estado_final` NULL cuando "dejar igual", 'Entregada'/'Cerrada'
tal cual; monto vacío rechazado, monto 0 aceptado, negativo/no-numérico rechazados, referencia
vacía rechazada, trim aplicado). Desplegado y verificado en producción (`fn_liquidar_consignacion`,
`btnFormLiquidar`, textos del form confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Corrección — el badge de consignación se movió de VENTA a ESTADO)
Corrige el cambio del 2026-07-27 (ver entrada de abajo): el texto ámbar "En consignación —
esperando liquidación" quedó mal puesto dentro de la celda de **Venta** en la lista de
Embarques (`modulo-cargas.js`) — invadía la columna y parecía tapar el monto. La columna Venta
estaba bien; solo faltaba mostrar el concepto en otro lugar.

- **Celda de Venta**: vuelve a ser solo `${usd(c.ingreso_venta)}`, sin texto adicional.
- **Celda de Estado**: gana un **pill compacto** apilado debajo del badge de estado logístico
  (`ERP.badgeEstado(c.estado)`) — mismo mecanismo visual que el chip "PC-###" bajo el folio en
  la columna Carga (un `<span class="pill">` inline-block que envuelve a su propia línea en una
  celda angosta; no hay `<br>` ni bloque forzado). Texto siempre corto, **"Consignación"**; el
  detalle vive solo en el `title` (tooltip):
  - `modalidad='consignacion'` y `ingreso_venta=0` y `cobrado=0` → `.pill.ambar`, title
    *"Esperando liquidación — el ingreso se reconoce al liquidar, no al embarcar (D-04)"*.
  - `modalidad='consignacion'` y `ingreso_venta>0` → `.pill.gris`, title *"Venta ya declarada"*.
  - Nunca en cargas anuladas ni en otras modalidades — reutiliza las clases `.pill.ambar`/
    `.pill.gris` ya existentes (mismas que usa el resto de la app), sin CSS nuevo.
- **Función renombrada**: `etiquetaConsignacion` → `badgeConsignacion` (misma función, un solo
  sitio de verdad; ya no existe la versión anterior en el archivo).
- **Sin cambios** (por instrucción explícita): el chip/filtro "En consignación" de la barra de
  filtros, la tarjeta "Producto" del Expediente, y la máquina de estados (`estado` sigue siendo
  logística; esto es solo un badge visual por `modalidad`).

`node --check` OK + smoke test puro sobre `badgeConsignacion`: los 2 casos definidos (ámbar
venta=0/cobrado=0, gris venta>0, incluida la consignación ya liquidada que también cae en gris);
nunca en anuladas ni en otras modalidades; el caso borde no definido (venta=0, cobrado>0) sigue
sin pill, sin inventar una tercera regla; y el escenario pedido explícitamente — 16 consignaciones
vivas repartidas 3 ámbar + 13 gris — clasifica las 16 sin ninguna suelta. Desplegado y verificado
en producción (`badgeConsignacion` presente 2 veces —definición y único uso—, `pill ambar` y su
title confirmados vía `curl`; la celda de Venta vuelve a terminar en
`usd(c.ingreso_venta)}</td>` limpio).

## ACTUALIZACIÓN — 2026-07-28 (Producto en el Expediente + visibilidad de consignación en Embarques)
Dos cambios de solo lectura sobre `v_carga_detalle` (vista que el frontend ya consumía) — sin
tocar SQL, RPCs ni la máquina de estados.

**1) Tarjeta "Producto" en el Resumen del Expediente (`modulo-expediente.js`, `htmlResumen`).**
El listado de Embarques ya mostraba el producto, pero el modal Ver/Editar (Expediente, pestaña
"Resumen") no — la ficha clásica sí lo tenía. Se agregó la tarjeta `Producto` al `det-grid`,
junto a Proveedor/Cliente/Modalidad (mismo estilo `.det`/`.l`/`.v` que las demás), leyendo
`d.producto` con fallback a "—" cuando viene NULL.

**2) Visibilidad de cargas en consignación en Embarques (`modulo-cargas.js`) — por MODALIDAD, sin
tocar el `estado` (que sigue siendo logístico: Programada→En Camino→Entregada…).**
- **Chip nuevo "En consignación"** en la barra de filtros, mismo patrón single-select que los
  chips de estatus de cobro (Cobrado/Parcial/Vencido/Pendiente/Sin liquidar) y Anuladas. Cuenta
  `modalidad='consignacion' && !anulado` sobre `vivasRango`. Se implementó con el mismo prefijo
  de filtro que ya usan los chips de cobro (`filtroEstado = 'cobro:*'`), extendido a
  `'modalidad:*'`, para que `filtradas()` no lo confunda con un filtro de `estado` — sin este
  prefijo, `'consignacion'` a secas habría intentado matchear contra `c.estado` (que nunca vale
  eso) y el chip habría devuelto siempre cero filas.
  Colocado en su **propio grupo visual** (separado de los chips de cobro con `margin-left:12px`
  y tooltip propio), a propósito: la tarea marcó que "En consignación" (todas, liquidadas y no) y
  "Sin liquidar" (venta aún no reconocida) son conjuntos DISTINTOS — ponerlos pegados sin
  distinción visual habría invitado a leerlos como si debieran cuadrar.
- **Etiqueta condicional** (`etiquetaConsignacion`, chica, bajo el monto de Venta en la lista):
  *"En consignación — esperando liquidación"* SOLO si `ingreso_venta=0 Y cobrado=0`; *"En
  consignación"* (sin la coletilla) si `ingreso_venta>0` — para no mentir en consignaciones que
  ya declararon o liquidaron venta (P-071/P-073/P-075) ni en las ya cerradas (P-019). Nunca se
  pinta en cargas anuladas. Un caso no cubierto por el spec (`ingreso_venta=0` con `cobrado>0`,
  anómalo y no esperado en consignación per D-04) deliberadamente no cae en ninguna rama y no
  muestra etiqueta — no se inventó una tercera regla no pedida.
- Recordatorio de negocio (D-04, ya vigente): `ingreso_venta=0` en consignación NO es un dato
  faltante — es que la venta se reconoce al liquidar, no al embarcar. Estos dos cambios hacen
  visible esa regla en vez de dejar que un "$0.00" se lea como una carga sin venta.

`node --check` OK en ambos archivos + smoke test puro: `etiquetaConsignacion` (las 2 ramas
definidas + anulada nunca se muestra + modalidades distintas de consignación nunca la muestran +
el caso borde no definido no inventa una tercera etiqueta) y el filtro del chip (cuenta 3 vivas
sobre un set con 1 liquidada + 1 declarada-sin-cobrar + 1 sin-liquidar + 1 anulada-excluida +
otras modalidades; confirma que "En consignación" (3) y "Sin liquidar" (1) NO cuadran a
propósito). Desplegado y verificado en producción (`modalidad:consignacion`,
`etiquetaConsignacion` en modulo-cargas.js; tarjeta "Producto" en modulo-expediente.js
confirmadas vía `curl`).

## ACTUALIZACIÓN — 2026-07-27 (Sección "Aplicaciones" en el modal Editar movimiento de Tesorería)
Backend ya tenía `v_movimiento_aplicaciones` (una fila por aplicación, con el resumen del
movimiento repetido en cada fila) y las RPCs `fn_aplicar_a_carga(p_mov_folio, p_carga_folio,
p_monto, p_nota)` / `fn_desaplicar(p_aplicacion_id, p_motivo)`. Faltaba consumirlo desde la UI.
Verificado contra Supabase en vivo antes de programar (misma técnica de la auditoría): las 13
columnas de la vista y las 2 firmas de RPC existen tal cual las describe el contrato.

- **Nueva sección "Aplicaciones"** dentro del modal "Editar movimiento" (`modulo-tesoreria.js`,
  `editarMovimiento`), entre el formulario de edición y el "Historial de cambios". Se agregó al
  `Promise.all` existente (no es un fetch nuevo aislado).
- **Resumen del movimiento**: *"Aplicado $X de $Y — quedan $Z"*, con `mov_aplicado`/`mov_total`/
  `mov_sin_aplicar` (llegan repetidos en cada fila, se leen de la primera). El aviso se resalta en
  ámbar si `mov_sin_aplicar > 0`, en verde si ya quedó en cero.
- **Lista** (`pintarAplicaciones`): sentido (Cobro/Pago) · carga (folio clickeable a Expediente,
  reusando la clase `.chip-folio`/`ERP.verCarga` que este mismo archivo ya usa en el estado de
  cuenta) · **Cliente si Cobro, Proveedor si Pago** (mismo dato, columna que cambia de significado
  según el sentido) · producto · monto · fecha (`DD-mmm-YYYY` vía `ERP.fecha`) · nota ("—" si
  vacía). Si `carga_flag=true`, chip ámbar **"Carga en revisión"** junto al folio (recordatorio,
  no bloquea nada).
- **"Aplicar a carga"** (solo con capacidad `editar`): combo de carga reutilizando el mismo patrón
  de `comboCargasItems` de Órdenes de Compra (id=folio, buscable por folio/PO/cliente/proveedor/
  producto), monto (número > 0), nota (texto **obligatorio**) — sin fecha, la pone el backend.
  Llama `fn_aplicar_a_carga` en el orden exacto pedido. Éxito → `ERP.toast('ok', resultado)` +
  se limpia el formulario + se refresca **solo** la sección (resumen y lista), sin recargar el
  resto del modal.
- **"Desaplicar"** (botón por fila, mismo gate `editar`): pide motivo con `window.prompt` —
  **mismo patrón ya usado en este archivo** para el caso `MOV_CON_APLICACIONES` de "Editar
  movimiento" (`window.confirm`), así que no introduce un estilo de diálogo nuevo. Cancelar el
  prompt no hace nada; motivo vacío → toast de error sin llamar la RPC. Llama `fn_desaplicar`,
  refresca la sección, toast con `resultado`.
- **Errores del backend**: `MAPA_ERROR_APL`/`textoErrorApl` (mismo patrón ya usado por
  `MAPA_ERROR`/`textoError` de "Editar movimiento", diccionario separado para no mezclar
  contratos de error de dos RPCs distintas) traduce los códigos en MAYÚSCULAS
  (`PERMISO_DENEGADO`, `NOTA_REQUERIDA`, `MONTO_INVALIDO`, `MOV_ANULADO`, `CARGA_NO_EXISTE`); los
  mensajes ya legibles del backend ("...exceden el monto...", "SOBRE-COBRO/SOBRE-PAGO...",
  "GATE 4: periodo CERRADO...") se muestran tal cual, sin intentar traducirlos.
- **Manejo de errores sin enmascarar** (relevante tras la auditoría de esta misma semana): el
  fetch de `v_movimiento_aplicaciones` es primario para esta sección — si falla, NO cae a `[]`
  silencioso; guarda `{__error}` y `pintarAplicaciones` pinta su propio `errbox` dentro de
  `#edAplicaciones`. El catálogo de cargas para el combo (`v_carga_detalle`) sí degrada a `[]` si
  falla (es un enriquecimiento de un formulario de escritura), pero el botón "Aplicar a carga"
  queda deshabilitado con una nota visible explicando por qué — nunca un combo vacío sin
  explicación (el mismo patrón que la auditoría marcó como problema en Órdenes de Compra, F-13).
- **Gating**: la lista se ve siempre (solo lectura); el formulario "Aplicar a carga" y el botón
  "Desaplicar" solo se pintan con `ERP.puede('editar')`. Nota: hoy "Editar movimiento" solo es
  alcanzable desde un botón ya gateado por `editar`, así que el gating interno es defensivo/
  futuro-a-prueba más que operante hoy — no se amplió quién puede abrir el modal (fuera de
  alcance de esta tarea).

`node --check` OK + smoke test puro de `pintarAplicaciones` (error de fetch → errbox, no lista
vacía disfrazada; resumen resaltado en ámbar solo cuando `mov_sin_aplicar>0`; columna Cliente/
Proveedor cambia según `sentido`; chip de flag solo cuando `carga_flag=true`; nota vacía → "—";
botón Desaplicar ausente sin capacidad `editar`) y de `cargasComboItems` (cargas anuladas
excluidas, `id`=folio no un id numérico, nombre sin " · " colgando cuando falta PO/cliente,
alias cubre PO/cliente/proveedor/producto/folio). Desplegado y verificado en producción
(`fn_aplicar_a_carga`, `fn_desaplicar`, `v_movimiento_aplicaciones`, `edAplicaciones`,
`cargasComboItems` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-27 ("Editar embarque" — sostenibilidad de captura sobre fn_editar_carga)
Backend ya tenía `fn_editar_carga(p_folio, p_motivo, p_po, p_f_embarque, p_ingreso_venta,
p_modalidad, p_estado, p_cliente_id, p_proveedor_id, p_producto_id, p_nota_revision, p_forzar)` —
gate `administrar`, `COALESCE(param, actual)` (NULL = no tocar), valida clase de contraparte, deja
bitácora. Faltaba consumirlo desde la UI.

- **Botón "Editar embarque"** en la ficha clásica (`modulo-cargas.js`, junto a "Cambiar estado"),
  gateado con `ERP.puede('administrar')` y oculto en cargas anuladas (mismo criterio que el resto
  de la captura). **No se duplicó en el Expediente**: el Expediente ya delega TODA la captura a la
  ficha clásica vía "＋ Captura y acciones" (mismo patrón que "Anular carga" y "Cambiar estado",
  que tampoco viven ahí).
- **Modal** (`abrirEditarCarga`, patrón `modal-ov` ya usado por "Cambiar estado" en este mismo
  archivo): P.O., fecha de embarque, modalidad (`margen_fijo|consignacion|comision` — las 3 reales
  del negocio; `nuevaCarga()` solo ofrece 2 porque una carga nunca *nace* en comisión, pero al
  editar sí hay que poder dejar/mostrar la modalidad de las 13 cargas que ya la tienen), estado
  (del catálogo completo `ERP.catalogoEstados()`, sin el filtro de la matriz de transiciones — es
  un bypass de administrador, no el flujo guiado), cliente/proveedor/producto (combos contra
  `v_catalogo_clientes/proveedores/productos`, sin "+ Nuevo" — las 3 RPC piden id, no texto libre),
  ingreso de venta, y **Motivo obligatorio**.
- **Aviso de flag no resuelta**: si `d.revision_pendiente` es true, el modal muestra un aviso fijo
  arriba de los campos: *"Editar aquí no la cierra — resuélvela en Revisiones Pendientes"* (el
  backend advierte pero no baja el flag; este aviso es puramente informativo, no depende de la
  respuesta del RPC).
- **Solo se manda lo que cambió** (`armarPayloadEditarCarga`, función pura): texto/número con el
  patrón ya usado en Programas/Proyectos; P.O. sí soporta vaciarse a propósito (manda `''`
  explícito, distinto de `null`).
- **Cliente/proveedor/producto por NOMBRE, no por id** — limitación real, no capricho: `v_carga_
  detalle` NO expone `cliente_id`/`proveedor_id`/`producto_id` (solo los nombres), así que "¿cambió?"
  se decide comparando el nombre normalizado (`ERP.norm`) contra el original, igual que ya resuelve
  el propio combo un alias. Si el combo queda sin selección (preselección fallida), se manda `null`
  — nunca se adivina un id a partir de un nombre a medias. Pendiente anotado en
  `PENDIENTES-BACKEND.md`: pedir esas 3 columnas a `v_carga_detalle` para poder comparar por id
  directo y retirar el rodeo.
- `p_nota_revision` y `p_forzar` nunca los toca este modal (siempre `null`/`false`): la nota de
  revisión se administra en Revisiones Pendientes, y no hay UI de forzado aquí.

`node --check` OK + smoke test puro de `armarPayloadEditarCarga`: sin cambios reales → todos los
campos `null` salvo `p_folio`/`p_motivo`/`p_forzar` (este último siempre `false` por diseño, no por
"no tocar"); cambios puntuales (PO, venta, estado) no contaminan los demás campos; cliente con
distintas mayúsculas/acentos → no se manda (normalización correcta); cliente realmente distinto →
se manda su id; combo vacío por preselección fallida → `null`, nunca se adivina; fecha comparada
contra el ISO de 10 caracteres del original (timestamp completo vs. `<input type=date>`); PO vaciado
a propósito manda `''` explícito. Desplegado y verificado en producción (`fn_editar_carga`,
`btnEditarCarga`, `armarPayloadEditarCarga` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-27 (Bugfix — el filtro por bloque en Programas no devolvía nada)
**Causa confirmada:** `filtroBloque` se llena con `ch.dataset.bloque`, que el DOM entrega
SIEMPRE como string ("3"); `p.bloque` llega de PostgREST como number (3). El filtro comparaba
con `===` sin normalizar → "3" !== 3 → nunca coincidía → clic en cualquier chip de bloque dejaba
la lista vacía con "Ningún programa en este bloque", aunque el dato y los conteos de los chips
(esos sí comparaban number-vs-number entre sí) eran correctos.
- **Fix en `modulo-programas.js`**: dos funciones puras nuevas. `mismoBloque(a, b)` compara
  `String(a) === String(b)` (tolera number-vs-string sin cambiar el tipo del dato ni el del
  dataset). `coincideFiltroBloque(bloquePrograma, filtro)` = `filtro === 'todos' || mismoBloque(...)`
  — el caso especial `'todos'` se resuelve ANTES de la comparación normalizada, así nunca se cuela
  como si fuera "el bloque número todos" al decidir qué chip de bloque se ve activo.
  `pintarListaProgramas()` ahora filtra con `coincideFiltroBloque` y marca el chip de cada bloque
  como activo con `mismoBloque(b, filtroBloque)` (el chip "Todos" sigue comparando string-string
  como antes, sin cambio).
- **Revisado y descartado** el mismo patrón en "Proyección anual": `mesSeleccionadoProy` y `r.mes`
  ya se normalizan con `num()` en los tres puntos donde se comparan (selección por defecto, pintado
  de la fila activa, detalle de programas sin dato) — no tenía el bug, no requirió cambio.
- **Mejora de claridad (mismo pase):** los chips de bloque pasan de mostrarse como "3 6" (número
  pelón + conteo) a **"Bloque 3"** con el conteo en el mismo badge `.chip-n` ya usado por los
  chips de estado de Embarques — mismo patrón visual, más legible. El chip "Todos 13" no cambia.

`node --check` OK + smoke test puro con el escenario real reportado (13 programas repartidos
1/1/6/2/1/1/1 en bloques 1..7): filtro `'todos'` → 13; bloque `'3'` (string, como llega del
dataset) → los 6 de CRI (PC-003..PC-008); bloque `'4'` → los 2 espárragos (PC-009, PC-010);
bloque `'1'` → solo PC-001; bloque inexistente `'9'` → 0 filas sin tronar; y `mismoBloque(3,
'todos')` → false (el atajo "todos" no contamina la marca de chip activo). Desplegado y
verificado en producción.

## ACTUALIZACIÓN — 2026-07-27 (Etiqueta legible en Programas — el nombre manda, el código es la llave, E47-C)
Backend E47-C ya listo y probado: `v_programas_comerciales`/`v_programa_cargas` ganan columna `etiqueta`
AL FINAL; `v_cargas_programa` gana `programa_etiqueta` AL FINAL; `fn_crear_programa` acepta
`p_etiqueta` (opcional) y ahora devuelve `{codigo, etiqueta}`; `fn_editar_programa` acepta
`p_etiqueta` y también `p_bloque`/`p_cliente_id`/`p_producto` (antes ignorados por el backend —
el frontend ya los armaba desde E47-B, ahora sí llegan). Los códigos PC-### no cambian: son la
llave técnica; la etiqueta es el nombre legible que ahora manda visualmente.

- **Lista de Programas**: primera columna pasa de "Código" a **"Programa"** — muestra la `etiqueta`
  (o el código si por algún motivo viniera sin etiqueta) como texto principal clickeable, con el
  código debajo en gris pequeño (`.mono`, ~11px) — sigue siendo la llave visible y trazable, solo
  deja de ser lo primero que se lee.
- **Ficha de programa**: el título del panel pasa a ser la `etiqueta`; el subtítulo ahora es
  "PC-005 · Bloque 3 · cliente · producto · estado"; se agregó el campo **Código** (mono) a la
  grilla de detalle, arriba de Bloque. El botón "Editar X" también usa la etiqueta.
- **Formulario (alta y edición)**: campo nuevo **"Nombre del programa"**, ancho completo, primero
  de todos. En alta: opcional, placeholder "Se arma solo si lo dejas vacío" — **vacío manda `null`,
  nunca `''`**, para que el backend autogenere el nombre. En edición: precargado con la etiqueta
  vigente, entra en la lógica de solo-cambiados (`igualTxt`) igual que los demás campos de texto;
  a diferencia de nota/producto, **vaciarlo en edición también manda `null`** (no `''`) — por
  contrato explícito del backend la etiqueta nunca se borra desde aquí, solo se reemplaza.
- **Toast de alta**: ahora usa el nombre devuelto por `fn_crear_programa` — *"Programa
  <b>Kabocha (Akambarhu) — CRI · verano</b> creado (PC-014)."* — en vez de mostrar solo el código.
- **Bloque/Cliente/Producto ahora editables de verdad**: `armarPayloadEditar` ya los calculaba
  desde E47-B (`p_bloque`, `p_cliente_id`, `p_producto` con la lógica solo-cambiados) pero el
  backend los ignoraba; sin cambios de frontend, ahora se aplican.
- **Chip de programa en Embarques y Expediente**: sigue mostrando el código "PC-0XX" (el espacio
  es corto), pero el `title` del chip ahora es la `programa_etiqueta`/`estado.programaEtiqueta`
  (fallback defensivo al código si viene null). En Embarques, el mapa folio→programa pasó de
  guardar solo el código a guardar `{codigo, etiqueta}`; el clic sigue navegando por el **código**
  (`ERP.irModulo('programas', codigo)`), sin cambio de comportamiento.
- **Agenda de la semana** (tarjeta `programa_sin_carga`, ya trae el nombre legible en el título
  desde el backend): verificado que `.hoy-card`/`.hoy-card-titulo` no tienen `white-space:nowrap`
  ni recorte por altura fija — un título más largo simplemente envuelve a una segunda línea dentro
  de la tarjeta, no se corta. Sin cambios de CSS ni de frontend en la franja.

`node --check` OK en los 3 archivos tocados (`modulo-programas.js`, `modulo-cargas.js`,
`modulo-expediente.js`) + smoke test puro: etiqueta vacía/solo-espacios/ausente en alta → `null`
(nunca `''`); etiqueta sin cambios en edición (incluida con espacios extra) → `null`; etiqueta
cambiada en edición → el texto nuevo; etiqueta vaciada en edición → `null` (nunca borra el nombre);
título del chip de Embarques usa la etiqueta cuando existe y cae al código cuando viene `null`/`''`
(defensivo). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-25 (Captura desde la UI para Programas y Proyectos, E47-B)
Backend E47-B ya listo y probado: `v_programas_comerciales` ahora trae AL FINAL `venta_tipica_carga,
cajas_tipicas_carga, cliente_id, proveedor_id, producto_ids` (contrato previo intacto). El módulo
Programas (E47, solo lectura) y Proyectos (E42/E43, solo lectura salvo movimientos/presupuesto) pasan
a tener alta y edición completas, con el mismo gating por rol (`ERP.puede`) y manejo de errores
(`ERP.avisarSiPermiso`) que Facturas/Órdenes de Compra.

**1) Módulo Programas — captura nueva (`modulo-programas.js`):**
- **"+ Programa"** (capacidad `capturar`, botón junto al título de la lista): drawer (`ERP.abrirPanel`,
  mismo patrón de nuevaCarga por la cantidad de campos) con bloque, cliente/proveedor (autocompletar
  contra `v_catalogo_clientes`/`v_catalogo_proveedores`, **sin** "+ Nuevo" — `p_cliente_id`/`p_proveedor_id`
  son FK, no texto libre; si no aparece, se da de alta primero en Directorio Comercial), producto (texto
  libre con sugerencias de `v_catalogo_productos`, sí admite "+ Nuevo"), productos del catálogo
  (multi-select por checkboxes → `producto_ids`, opcional), modalidad (`margen_fijo|consignacion|
  comision|trueque|por_definir` — los dos últimos son EXCLUSIVOS del programa, no se tocó el enum de
  modalidad de Cargas), es_frente, ingreso_base+valor+retiene, frecuencia_valor+unidad+cargas_equiv_sem,
  todo_ano (checkbox que oculta/muestra mes_desde/mes_hasta), vía, término con proveedor, pick&pack,
  estado, nota. RPC `fn_crear_programa` → `{codigo}`; al crear se abre directo la ficha del programa
  nuevo (mismo patrón que nuevaCarga con `verCarga`) + toast con el código.
- **Fila de la lista clickeable** → ficha (drawer) de solo lectura con todos los campos + botón
  **"Editar programa"** (capacidad `editar`) que abre el mismo formulario precargado, más la sección
  "Datos de proyección" (venta_tipica_carga, cajas_tipicas_carga) y un campo **Motivo** obligatorio en
  la UI. RPC `fn_editar_programa` recibe **SOLO los campos que cambiaron** (el resto null = "no tocar",
  mismo contrato que `fn_editar_proyecto"); comparación por tipo (texto/número/booleano/conjunto) en
  funciones puras (`igualTxt/igualNum/igualBool/igualConjunto`) — probadas con smoke test aislado.
  Limitación conocida y aceptada (igual que Proyectos): un campo numérico/id no se puede vaciar a NULL
  desde la UI (vacío = "no tocar", nunca "bórralo"); texto y `producto_ids` sí soportan vaciarse
  (mandan `''`/`[]` explícito).
- **Ficha — cargas ligadas**: `v_cargas_programa` filtrada por `programa_codigo` (folio/P.O./id_v7,
  folio clickeable a Expediente). Acción **"Ligar embarque"** (input de folio, normalizado con
  `ERP.folioNormalizado`, nota opcional) y **"Desligar"** por fila (confirmación en modal ligero con
  nota opcional) → ambas usan `fn_ligar_carga_programa(p_folio, p_codigo|null, p_nota)`, gateadas con
  capacidad `capturar`.
- **Bonus de navegación**: como Programas ya tiene ficha por código, el chip "PC-0XX" de la lista de
  Embarques y el chip del header del Expediente (agregados en E47) ahora navegan directo a la ficha
  del programa (`ERP.irModulo('programas', codigo)`) en vez de solo a la lista general.

**2) Módulo Proyectos — alta de proyecto nueva (`modulo-proyectos.js`):**
- **"+ Proyecto"** (capacidad `capturar`): drawer con nombre, productor (autocompletar contra
  `v_catalogo_proveedores` — un productor ES un proveedor `es_proveedor=true`, mismo criterio que
  Directorio Comercial), código (opcional, auto si se deja vacío), descripción, temporada, vigencia
  desde/hasta, comisión %, ventas/cajas proyectadas, monto de línea, fuente de fondeo, **fondeador**
  (autocompletar contra `v_catalogo_admin` — el catálogo general de TODAS las clases de contraparte,
  porque el fondeador puede ser un socio virtual como JEAMS/Samuel o una entidad externa como
  AgroCapital, no solo un proveedor), costo financiero, nota. RPC `fn_crear_proyecto` → si devuelve
  `{codigo}` abre la ficha del proyecto nuevo directo; si no, toast con el texto de confirmación.
- **"Editar proyecto"** (capacidad `editar`, en la ficha): ya estaba implementado desde E44
  (`fn_editar_proyecto` con estado/tasa_anual/tasa_vigencia_desde/precio_valuacion_especie/nota/motivo,
  patrón solo-cambiados) y coincide exactamente con lo pedido en E47-B — **verificado, sin cambios**.

`node --check` OK en los 4 archivos tocados (`modulo-programas.js`, `modulo-proyectos.js`,
`modulo-cargas.js`, `modulo-expediente.js`) + smoke test puro: `validarTemporada` (todo_ano ignora
meses, cruce de año dic–abr válido, mes_desde/mes_hasta faltantes o fuera de 1–12 rechazados);
`armarPayloadCrear` (bloque a número, trim de producto/nota, meses con cruce de año tal cual);
`armarPayloadEditar` (sin cambios → todos los campos null salvo p_codigo/p_motivo; cambiar un solo
campo no contamina los demás; boolean es_frente detecta cambio; `producto_ids` vaciado manda `[]`
explícito, no null; nota cambiada se manda tal cual; motivo vacío se normaliza a null). CSS nueva
`.chk-lista` para el multi-select de productos. Desplegado y verificado en producción (los 5 archivos
tocados confirmados vía `curl` sirviendo el contenido nuevo).

## ACTUALIZACIÓN — 2026-07-25 (Módulo nuevo "Programas" + chip de programa en Embarques/Expediente/Agenda, E47)
Backend E47 agregó 4 vistas nuevas (todas authenticated-only): `v_programas_comerciales` (13 filas PC-001..PC-013), `v_programas_proyeccion` (12 filas, una por mes), `v_programa_cargas` (real por programa) y `v_cargas_programa` (mapa carga→programa, 66 filas). Solo consumo de vistas, sin escritura.

**1) Módulo nuevo `modulo-programas.js`** (ruta `programas`, menú "🌾 Programas" tras Proyectos), pantalla única en 3 secciones, solo lectura, visible a todos los roles:
- **Programas comerciales**: lista de `v_programas_comerciales` agrupada por bloque (chips por bloque, patrón de `modulo-proyectos.js`). Columnas Código · Cliente · Producto · Proveedor (`—` si null) · Modalidad · Ingreso · Frecuencia · Temporada · Estado. **Texto de Ingreso** compuesto en `textoIngreso()`: `pct_venta` → `"10% s/venta"` (+ `" (retiene 50%)"` solo si `plein_retiene_pct` no es null **ni** 100); `usd_caja` → `"$1.00/caja"`; cualquier otro caso (`por_definir`, base null, o `ingreso_valor` null) → badge ámbar **"POR DEFINIR"**. **Temporada** (`textoTemporada()`): `todo_ano` → "Todo el año"; si no, `"mmm–mmm"` de `mes_desde`/`mes_hasta` **sin reordenar** (así un cruce de año tipo dic–abr sale tal cual, sin lógica especial). Estado con pill activo=verde/por_arrancar=ámbar; `es_frente=false` → chip gris "no frente"; `nota` en tooltip ⓘ vía `ERP.cablearInfoNota`.
- **Proyección anual**: tabla de `v_programas_proyeccion` con barra inline por mes (`cargas_equiv_sem`, patrón `.barra-row`/`.fill` de Finanzas/Concentración) — el mes máximo se calcula siempre de los datos (`Math.max` sobre las 12 filas, **nunca** diciembre hardcodeado) y se resalta en verde. Fila clickeable por mes → detalle debajo. `ingreso_sem_activos`/`ingreso_sem_por_arrancar` se pintan con `usd()` salvo cuando el valor es exactamente 0 **y** ese mes tiene `programas_sin_dato > 0`, en cuyo caso se pinta "—" (para no mostrar un `$0.00` engañoso por falta de dato). Si algún mes tiene `programas_sin_dato > 0`, leyenda fija: *"N programas sin datos de ingreso — la proyección en $ está incompleta"* + lista de `codigos_sin_dato` del mes seleccionado (default: el mes máximo).
- **Real por programa**: tabla de `v_programa_cargas` con exactamente las 6 columnas pedidas — Código · Cargas · Primera · Última · Venta acumulada (`usd()`) · Últimos 7 días. Sin columnas extra aunque la vista trae más campos (bloque, producto, estado, venta_mes_actual).
- Export Excel/PDF estándar (`ERP.botonesExportar`) en cada sección. Registrado con `ERP.registrar('programas', ...)`; item de menú y `<script>` agregados en `index.html`.

**2) Chip de programa en Embarques y Expediente** (mismo patrón del chip 🌱 Proyecto de E42): `v_cargas_programa` se trae una sola vez al pintar la lista/expediente y se arma un mapa folio→`programa_codigo`.
- **`modulo-cargas.js`**: mapa nuevo `programaMap`, poblado en el `Promise.all` de `render()` (fetch con `.catch(()=>[])`, defensivo). En la celda de folio de la lista, si el folio está en el mapa, se agrega `<span class="pill verde ir-programa">PC-0XX</span>` con `e.stopPropagation()` (vive dentro de una fila ya clickeable) → `ERP.irModulo('programas')` (sin código — Programas no tiene ficha por código, a diferencia de Proyectos). Cargas sin programa: sin chip (nada que pintar).
- **`modulo-expediente.js`**: fetch de `v_cargas_programa` por folio (`.catch(()=>[])`) agregado al `Promise.all` de `verExpediente`; chip `🌾 PC-0XX` en el header del panel (junto al chip de proyecto existente), mismo click → `ERP.irModulo('programas')`.
- **CSS** (`estilos.css`): `.pill.ir-programa{cursor:pointer}` + hover a verde sólido.

**3) Agenda — fix de seguridad para `categoria: 'programa_sin_carga'`**: el backend ahora puede emitir una tarjeta de agenda con `folio=NULL`/`po=NULL` (un programa sin cargas en la semana). `htmlAgenda()` en `modulo-cargas.js` se hizo null-folio-safe: `data-folio` solo se emite si `a.folio` existe; el segmento de folio+PO en el encabezado de la tarjeta solo se pinta si hay folio; una tarjeta con `folio` null y `categoria==='programa_sin_carga'` queda clickeable hacia `ERP.irModulo('programas')` (nuevo atributo `data-ir-programa-agenda`) en vez de intentar abrir el Expediente; cualquier otra tarjeta con folio null (caso defensivo, no esperado hoy) queda simplemente sin link. El wiring de clic de la franja "Agenda de la semana" se extendió (no se tocó nada más de esa franja).

`node --check` OK en los 3 archivos tocados/creados (`modulo-programas.js`, `modulo-cargas.js`, `modulo-expediente.js`) + smoke test puro: los 3 casos de texto de Ingreso + fallback "POR DEFINIR" (incluyendo `retiene=100%` que NO debe mostrar la aclaración, y decimales tipo 7.5%); temporada con cruce de año (dic–abr, nov–ene) sin reordenar; tarjeta de agenda con folio null tanto para `programa_sin_carga` (sin `data-folio`, clickeable a Programas) como para un caso hipotético con otra categoría (sin `data-folio` y sin ningún link). Desplegado y verificado en producción (los 5 archivos tocados confirmados vía `curl` sirviendo el contenido nuevo).

## ACTUALIZACIÓN — 2026-07-24 (Ajuste — Proyectos: toggle del plan de flujo se oculta si es single-layer)
Dos problemas del toggle Plein/Santana/Total en "Plan de flujo del proyecto": (1) "Santana" es el nombre del productor de PRJ-005, no una etiqueta genérica — en otro proyecto (ej. PRJ-001/Akambarhu) el chip salía igual, con nombre equivocado; (2) HOY ningún proyecto usa la segunda capa (`santana_acum` = 0 en todos los meses de todos los proyectos), así que el toggle sobraba. Ajuste 100% frontend en `modulo-proyectos.js`, sin tocar backend/vistas.
- **`hayProductor`** se calcula de la serie (`estado.flujo.some(p => num(p.santana_acum) !== 0)`) — nunca hardcodeado. Si es `false` (caso de todos los proyectos hoy), `seccionFlujo()` **no pinta la fila de chips**, pero sigue pintando `#flujoWrap` + `#flujoBody` y `pintarFicha()` sigue llamando `pintarFlujo('plein')` igual: la curva Plein y su tarjeta de alerta se ven normal, solo sin el toggle.
- Si `hayProductor` es `true` (algún proyecto futuro multi-capa), el toggle se pinta con la etiqueta **genérica "Productor"** en vez de "Santana" — la clave interna `'santana'` no cambió (el backend la sigue usando tal cual).
- El wiring de `#flujoWrap [data-capa]` en `pintarFicha()` ya era condicional a que hubiera chips; sin ellos, el `querySelectorAll` simplemente no itera nada — no rompe.
- `node --check` OK + smoke test puro: caso single-layer (sin toggle, `#flujoWrap`/`#flujoBody` se pintan igual), caso multi-capa con la etiqueta "Productor" para la clave `santana`, caso límite (un solo mes con `santana_acum` distinto de cero ya activa el toggle), y caso de serie vacía. Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Finanzas — panel "Días de pago por cliente", E46)
Backend E46 agregó `v_dias_pago_observado` (días de crédito contratado vs observado vs gap por cliente, sobre embarques cobrados completos, ordenada por `pct_cxc` desc) — insumo del futuro flujo proyectado 30/60/90 (hoy todos los clientes en 15 días provisionales). Panel nuevo en `modulo-finanzas.js`, junto a Antigüedad CxC/CxP.
- Fetch con `.catch(()=>[])` (si truena, sección vacía, no rompe la pantalla); tabla: Cliente · Embarques · Contratado · Observado (`prom / mediana`, ej. "138 / 133") · Gap · CxC viva · % CxC.
- **Gap con semáforo** (`.pill` gris/ámbar/rojo): `<=0` gris, `1..29` ámbar, `>=30` rojo; con signo (`+123 d` / `-11 d` / `0 d`). Umbrales son constantes de UI; el dato siempre sale de la vista.
- **Callout** arriba de la tabla SOLO si la primera fila (mayor `pct_cxc`) tiene gap rojo — nombre/porcentaje/días leídos de esa fila, nunca hardcodeados.
- **Leyenda**: "Solo clientes con historial de cobro completo; cubren X% de la CxC viva." con X = suma calculada de `pct_cxc` de las filas (no hardcodeada).
- Formatos: días enteros + " d" (salvo el par prom/mediana, sin unidad, tal cual el ejemplo dado); montos con `usd()`; % a 1 decimal. Export Excel/PDF estándar (`ERP.botonesExportar`); visible a todos los roles (solo lectura, sin gating adicional).
- `node --check` OK + smoke test puro: badge por los 7 puntos de corte de gap (incl. negativos y los dos límites 0/29/30), suma de `pct_cxc` en la leyenda, y el callout apareciendo solo cuando el top tiene gap ≥30 (no con ámbar ni gris, incluido el caso límite exacto =30). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Expediente/ficha clásica — columna MOV clickeable a Tesorería)
La columna "Mov." de `v_carga_aplicaciones` (pestaña "Pagos y Cobros" del Expediente y la tabla de aplicaciones de la ficha clásica) salía como texto plano. Ahora, igual que el "Libro de la línea" de Proyectos (E44), `mov_folio` se envuelve en un `<span class="chip-folio" data-ir-tesoreria="{folio}">` que navega con `ERP.irModulo('tesoreria', 'mov:' + folio)` — Tesorería ya sabe forzar la cuenta, limpiar filtros, hacer scroll y resaltar la fila (construido en E44, sin tocar).
- **`modulo-expediente.js`** (`htmlPagos`): celda de Mov. condicional (chip clickeable si hay folio, "—" si no) + wiring nuevo `cablearMovLinks(cont)` llamado tras pintar la pestaña "pagos".
- **`modulo-cargas.js`** (ficha clásica, `pintarFicha`): misma celda condicional; wiring inline junto a `ERP.cablearInfoNota()`.
- **Defensivo:** `mov_folio` null/vacío nunca genera el atributo `data-ir-tesoreria` — se pinta "—" plano, sin link roto (backend confirmó 0 de 175 aplicaciones con `mov_folio` null, pero la defensa cubre el caso igual).
- Sin cambios en Tesorería (ya construida en E44) ni en el backend. `ERP.irModulo` (no existe `ERP.irA`).
- `node --check` OK en ambos archivos + smoke test puro (construcción del link para folios con valor, texto plano sin atributo para null/undefined/''/0, y simulación del listener delegado navegando a `mod:'tesoreria', param:'mov:361'`). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Proyectos — Plan de flujo del proyecto, E45)
Backend E45 agregó `v_proyecto_flujo` (1 fila por proyecto/mes, columnas `plein_mes/santana_mes/total_mes` + sus `_acum`) y `v_proyecto_flujo_pico` (3 filas por proyecto, una por capa `plein|santana|total`, con `mes_pico`, `monto_pico`, `mes_cruce_positivo`, `saldo_final`). Ambas solo por vista (authenticated), sin tocar contabilidad.

**1) Sección nueva "Plan de flujo del proyecto"** en la ficha de `modulo-proyectos.js`, colocada arriba de "Presupuesto de gastos del proyecto":
- Fetch de ambas vistas dentro del `Promise.all` de `verProyecto()`, cada una con `.catch(()=>[])` — si truenan, la sección degrada a estado vacío sin romper la ficha.
- Si `v_proyecto_flujo` viene vacía: "Este proyecto no tiene plan de flujo sembrado todavía." (estado amable, no error) y **sin toggle** (no tiene sentido alternar capas sin datos).
- **Toggle segmentado Plein/Santana/Total** (chips reutilizando `.chip`/`.chip.activo`; default **Plein**, la curva que le importa a tesorería). Al cambiar, `pintarFlujo(capa)` repinta **solo** `#flujoBody` (sin refetch) con la serie `*_acum` de esa capa y la fila de `v_proyecto_flujo_pico` correspondiente.
- **Gráfica SVG inline a mano** (sin librerías — el stack no trae charting): ~100% ancho × 220px vía `viewBox` + `preserveAspectRatio="none"`. Línea + área de la serie acumulada; línea base en cero **siempre marcada** (el escalado fuerza `0` a entrar en el rango min/max aunque toda la serie sea negativa o positiva); tramo negativo en rojo-suave (`var(--rojo)`/`var(--rojo-bg)`) y positivo en verde-suave (`var(--verde)`/`var(--verde-claro)`) mediante dos `<clipPath>` (por encima/por debajo de la línea de cero) — sin necesitar interpolar el punto exacto de cruce. Eje X con etiquetas `mmm-YYYY` (throttled a ~7 visibles para no amontonar si hay muchos meses). Punto + etiqueta marcados en el mes del **pico** (mínimo) y en el mes de **cruce a positivo** (si existe). **Nada de rangos hardcodeados**: min/max se calculan de la serie real en cada repintado.
- **Tarjeta de alerta** (encima de la gráfica), leyendo la fila de `v_proyecto_flujo_pico` de la capa activa: *"Pico de exposición: $X en mmm-YYYY · cruza a positivo en mmm-YYYY · cierre $Y."* — si `mes_cruce_positivo` es NULL: *"…no cruza a positivo dentro del horizonte del plan."* Severidad roja si `monto_pico < 0`, gris si ≥ 0 (mismo patrón visual que la barra de cuadre de Balance en Finanzas).
- Montos con `usd()`, meses con un formateador local `mesLargo()` (mmm-YYYY con año completo, mismo patrón `MESES` ya usado en otros módulos) — no se reutilizó `ERP.mesTexto` porque trunca el año a 2 dígitos.

**2) Renombrada la sección de presupuesto** — "Presupuesto del proyecto" → **"Presupuesto de gastos del proyecto"**, con subtítulo nuevo: *"Gastos blandos del proyecto (viáticos, QC en campo, asesoría, legal…). Es distinto del plan de flujo de arriba."* Solo copy — misma lógica, mismas RPCs (`fn_capturar_presupuesto` intacta).

`node --check` OK + smoke test puro de escalado SVG (caso todo-negativo → línea de cero en el tope; caso con cruce → línea de cero a media altura; serie plana y de 1 punto → sin división entre cero) y de la tarjeta (con/sin `mes_cruce_positivo`, severidad roja/gris, pico null). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Tesorería — navegación directa a un movimiento por folio)
Antes, hacer clic en un folio de movimiento (en "Libro de la línea" o "Movimientos ligados" de la ficha de Proyectos) navegaba a Tesorería pero caía en la lista completa sin ubicar el movimiento. Ahora navega directo a la fila, con scroll + resalte temporal.

- **`modulo-tesoreria.js`**: `render(cont, parametro)` acepta `'mov:361'`. Si el folio existe en `v_estado_cuenta`, se **fuerza su cuenta (`cuenta_id`)** y se **limpian los filtros de fecha/texto** antes de pintar, garantizando que la fila sea visible sin depender de qué cuenta/rango estuviera seleccionado por defecto. Cada `<tr>` del estado de cuenta ahora lleva `id="mov-{folio}"` y `data-folio="{folio}"`.
- Función nueva `irAMovimiento(folio)`: busca la fila (por `id`, con fallback por `data-folio`), hace `scrollIntoView({behavior:'smooth', block:'center'})` y agrega la clase `.fila-destacada` ~2.5s (se quita sola por `setTimeout`, nunca queda fija). Si el folio no aparece ni tras ajustar cuenta/filtros (folio inexistente), toast de aviso: *"No se encontró el movimiento #361 en el estado de cuenta."* — no rompe la pantalla.
- **`modulo-proyectos.js`**: los enlaces a movimiento en "Libro de la línea" (`a.movimiento_folio`) y "Movimientos ligados" (`m.folio`) ahora llevan el folio en `data-ir-tesoreria="{folio}"` y el clic navega con `ERP.irModulo('tesoreria', 'mov:' + folio)` (mismo mecanismo de ruteo+parámetro que usa Embarques para abrir el Expediente). El enlace "Aplicado a" de Tesorería ya apuntaba correctamente a `ERP.verCarga` (folio de carga, no de movimiento) — se revisó y no aplicaba cambio ahí.
- **CSS**: `.fila-destacada{animation:destello 2.5s ease-out}` con `@keyframes destello` de `var(--verde-claro)` a transparente, respetando la paleta.
- `node --check` OK en ambos módulos + smoke test aislado de `irAMovimiento` (folio encontrado por id, folio inexistente → toast sin excepción, fallback por `data-folio`, y verificación de que la clase se retira sola tras ~2.5s). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Ajustes de UI: Tesorería estado de cuenta + Embarques fecha/rango)
Dos ajustes 100% frontend, sin tocar backend (todos los campos ya existían en las vistas).

**1) Tesorería — Estado de cuenta (`modulo-tesoreria.js`):**
- Columnas reordenadas al estilo de la pestaña CHASE del V7: **Folio · Fecha · Contraparte · Tipo · Descripción · Ingreso · Egreso · Saldo · Aplicado a**. Contraparte, Tipo y Descripción siguen siendo tres columnas independientes (nunca se fusionan).
- Si `descripcion` viene vacía o es idéntica a `contraparte` (comparación normalizada: minúsculas, sin acentos), se pinta **"—" en gris** en vez de repetir el nombre.
- `aplicado_a` ya era clickeable al Expediente (`ERP.verCarga` vía `.chip-folio`) — verificado, sin cambios.
- Nueva clase `.col-desc` (min-width 280px, ~40 caracteres) para que la columna Descripción, al ser la más ancha, no se trunque en pantallas angostas.
- El `tfoot` no cambió de colspan (mismo número de columnas antes de "Ingreso").

**2) Embarques — fecha visible + filtro por rango (`modulo-cargas.js`):**
- Columna nueva **"Embarque"** (f_embarque, formato DD-mmm-YYYY vía `ERP.fecha`) después de P.O., **ordenable** (clic en el header, mismo patrón que la columna Utilidad — arrow ⇅/▲/▼, mutuamente exclusiva con el sort de Utilidad). **Orden por defecto: f_embarque DESC** (antes era por folio); las cargas sin fecha (ej. "Por Confirmar") quedan al final.
- **Filtro de rango de fechas** arriba, junto a los chips: dos `<input type="date">` (Desde/Hasta) + atajos "Este mes", "Mes pasado", "Últimos 30 días", "Todo". Cálculo de fechas 100% en **hora local del navegador** (no `toISOString()` crudo, que cruzaría de día tras ~17-18h en México — el mismo tipo de bug de zona horaria que ya se corrigió en el backend con `fn_hoy()`; aquí es cálculo cliente puro, pero se hizo bien desde el inicio).
- El rango es **acumulativo** con los chips de estado/cobro y con la búsqueda de texto (`enRango()` se aplica en `filtradas()` junto al resto). El rango activo se muestra como una **etiqueta removible** ("01-jul-2026 – 24-jul-2026 ✕").
- **Los conteos de los chips respetan el rango activo**: se extrajo la construcción de la barra de chips a una función `pintarFiltros()` que se repinta sola (sin refetch) cada vez que cambia el rango, así los números y la visibilidad de cada chip (incluida "Anuladas" y los estados del catálogo) reflejan el rango vigente.
- **Export Excel/PDF exporta lo filtrado**: ya lo hacía (el scraper lee el DOM de `#cargasTabla`, que solo pinta `filas` filtradas). El **título del PDF ahora incluye el rango aplicado** — se actualiza el `dataset.expTitulo` de los botones de export en cada cambio de rango (leído al vuelo por `cablearExportar` al hacer clic, sin necesidad de re-cablear).
- **Responsive**: en móvil los dos `<input type="date">` se apilan verticalmente (`@media max-width:640px`), no lado a lado.
- `node --check` OK en ambos módulos + smoke test de lógica pura (rangos de fecha en hora local, `enRango` en todos los casos límite, orden base f_embarque DESC con folio de desempate, y la normalización de "descripción repite contraparte"). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Módulo "Proyectos" — financiamiento a productores)
Módulo nuevo `modulo-proyectos.js` (ruta `proyectos`, menú "🌱 Proyectos" tras Embarques) sobre el backend E42/E43. Solo consume vistas + RPCs (todas devuelven texto humano → se muestra tal cual en el toast; errores del backend tal cual). NO hay alta de proyectos/contratos ni edición de presupuesto (por chat).
- **Lista** (`v_proyectos`): Código · Proyecto · Productor · Estado (badge suave activo/cerrado/cancelado) · Línea · Dispuesto · Saldo vivo · Disponible · Comisión proy. · Fondeo (fuente + fondeador). Guion en proyectos sin línea (`monto_linea` 0/null). Export Excel/PDF estándar; clic en fila → ficha.
- **Ficha** (drawer, patrón Expediente): (a) header con código/nombre/productor/estado/temporada/vigencia/fondeo/costo financiero/tasa ("pendiente" si NULL) + precio valuación; (b) **KPIs** Línea/Dispuesto/Recuperado/**SALDO VIVO** (destacado)/Disponible/Comisión proyectada; (c) **Rentabilidad** (`v_proyecto_rentabilidad`): ingreso − costo financiero real − gastos = **UTILIDAD REAL** (verde/rojo), presupuesto Plein informativo aparte; (d) **Contratos** (`v_proyecto_contratos`, solo lectura); (e) **Libro de la línea** (`v_proyecto_amortizaciones` por fecha asc): efecto chip (cargo ámbar/abono verde/informativo gris), liga a movimiento (→ Tesorería) y a embarque (→ Expediente) + botón "+ Registrar movimiento de línea" → `fn_registrar_amortizacion`; (f) **Presupuesto** (`v_proyecto_presupuesto`) con absorbe (chip) + "+ Línea de presupuesto" → `fn_capturar_presupuesto` (categoría desde `categorias_presupuesto`); (g) **Ligas** plegables (`v_proyecto_movimientos` y `v_proyecto_cargas`) con navegación cruzada; (h) **"Editar proyecto"** (capacidad `editar`) → `fn_editar_proyecto` enviando **solo los campos que cambiaron** (los demás NULL = no tocar).
- **Gating:** ver = todos; captura solo `capturar`; editar solo `editar`. Tras cada escritura exitosa se refresca la ficha (KPIs + libro).
- **"Datos faltantes":** la acción "ID del V7" ahora **captura** (input inline mono + Guardar → `fn_asignar_id_v7`; el backend bloquea duplicados y se pinta su mensaje; tras éxito la fila desaparece). Se quitó el pendiente de `fn_asignar_id_v7` de `PENDIENTES-BACKEND.md`.
- **Expediente:** si la carga está ligada a un proyecto (se lee de `v_proyecto_cargas` por folio, `.catch → null`), el header muestra el chip **"🌱 PRJ-XXX"** con clic a la ficha del proyecto (`ERP.irModulo('proyectos', codigo)`); si no hay proyecto, no se pinta.
- Pendientes anotados en `PENDIENTES-BACKEND.md`: el backend E43 **ya agregó** `fn_crear_proyecto`, `fn_crear_contrato`, `fn_editar_presupuesto` y `fn_eliminar_presupuesto`, pero **la UI todavía NO los consume** (no hay alta de proyecto/contrato ni edición/borrado de presupuesto en la ficha) — quedan como "existen, falta consumirlos".
- `node --check` OK (3 archivos) + smoke test (PRJ-001: línea 150,000 / disponible 150,000 / comisión 183,879 / tasa pendiente; guion sin línea; editar solo campos tocados; validaciones). Desplegado y verificado. **La escritura real se dejó a Miguel (no se ensució producción).**

## ACTUALIZACIÓN — 2026-07-23 (Pantalla nueva "Datos faltantes")
Lista de trabajo para cerrar de un jalón los campos sin capturar (0/74 con entrega real, 0/74 con responsable) que tienen al motor de alertas al tercio. Módulo nuevo `modulo-datos-faltantes.js` (ruta `faltantes`) sobre `v_cargas_datos_faltantes`, sin tocar backend.
- **Entrada en el menú** "Datos faltantes" justo después de "Revisiones Pendientes", con contador (n filas). **Si la vista devuelve 0 filas, la entrada del menú se oculta completa** (no solo el badge) — vía `refrescarBadgeFaltantes()` en `app.js`, llamado en boot, tras cada refresco y en `erp:escritura`.
- **Tabla:** Carga · P.O. · Cliente · Producto · Estado (badge) · Qué falta · Acciones. **Respeta el orden de la vista** (`order=peso.desc`, lo que bloquea una alerta va primero — NO se reordena por folio). Cada elemento de `faltantes` se pinta como **etiqueta chica ámbar** (con fallback al texto `falta`).
- **Acciones por fila, reusando lo existente (no se duplica):** "Confirmar entrega real" → abre el Expediente (su form de confirmar entrega) vía `ERP.verCarga`; "Responsable" → botón que revela el **selector inline `ERP.montarResponsable`** en la misma fila; "ID del V7" → **solo etiqueta informativa** (no hay captura aún — anotado en `PENDIENTES-BACKEND.md`: se necesita `fn_asignar_id_v7`).
- **Recarga tras cada acción:** el selector de responsable recarga la lista en su `onDone`; confirmar entrega dispara `erp:escritura` + `datosSucios`, así que al cerrar el Expediente la lista se re-renderiza sola y **la fila desaparece cuando ya no le falta nada** (ese feedback es el punto de la pantalla).
- **Export Excel/PDF** con `ERP.botonesExportar` (`#tblFaltantes`). **Gating:** visible para todos los roles; las acciones (botones/selector) solo con capacidad `capturar` (sin ella, "solo lectura"). Las acciones se rinden como botones/etiqueta (no un `<select>` crudo en el DOM inicial) para que el export salga limpio.
- `node --check` OK + smoke test (ruteo de acciones por `faltantes`, orden respetado, menú oculto en 0). Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-23 (E41-D — Agenda operativa + responsable por carga)
Backend E41-D: `v_agenda_operativa` (alertas operativas por carga, ordenadas por `orden`, severidad rojo/ambar), `v_carga_detalle` ahora trae `responsable` + `responsable_nombre`, y `fn_asignar_responsable(p_folio, p_socio, p_nota)` (socios de `v_socios_asignables`). Todo frontend, sin tocar backend.
- **Franja "Agenda de la semana"** arriba de la lista de Embarques (`modulo-cargas.js`): tarjetas compactas desde `v_agenda_operativa` (reusa `.hoy-cards/.hoy-card`, rojas primero por `orden`), cada una con folio (clic → Expediente), título, detalle y responsable ("— Chanes"). **Sin datos → franja oculta del todo** (sin estado vacío; el fetch va con `.catch(()=>[])`). **Colapsable**, con el colapso recordado en una variable JS de sesión (`agendaColapsada`), **no localStorage**.
- **Responsable en Expediente y ficha clásica:** celda "Responsable: <nombre>"; con capacidad `capturar`, un `<select>` (`v_socios_asignables` + "— Nadie") que llama `fn_asignar_responsable` y muestra su texto de retorno en el toast (helper compartido `ERP.montarResponsable`, con `v_socios_asignables` cacheado). Refresca la vista al asignar.
- **Alta de carga:** selector opcional "Responsable"; tras `fn_crear_carga` exitoso, si se eligió uno se llama `fn_asignar_responsable` con el folio devuelto. Si ese 2º paso falla, se avisa que **la carga SÍ se creó pero quedó sin responsable** (no se revierte).
- **Lista de Embarques:** columna **"Resp."** al final con el primer nombre del responsable (guion si NULL); `tfoot` con celda trailing extra para cuadrar (header 16 cols = colspan 8 + 8 celdas).
- **Inicio:** NO se duplica la agenda — Panel Hoy ya la recibe del backend (categoría "Operación"). Sin cambios ahí.
- `node --check` OK + smoke test (agenda oculta/vacía y ordenada, pie cuadrado, primer nombre, selector "— Nadie", mensaje de retorno). Desplegado y verificado.
- **Ajuste (2026-07-23):** cada tarjeta de la Agenda ahora muestra el **P.O. junto al folio** (mono, gris, separado por `·`): `P-077 · NGM247514 · Embarca pronto — Chanes` — así Samuel reconoce la carga por su P.O. `v_agenda_operativa.po` ya venía; solo se pinta. Si `po` es null/vacío se **omite el segmento completo** (sin guion suelto, que en la tarjeta estorba; en la columna de la tabla sí va guion).

## ACTUALIZACIÓN — 2026-07-23 (Embarques — columna P.O. en la lista)
La regla de oro (CLAUDE.md #11) es cotejar por P.O., no por folio (33 de 74 vivos tienen `id_v7 ≠ folio`), pero el P.O. solo se veía abriendo la ficha. Ahora está en la lista, sin tocar backend (`v_carga_detalle.po` ya existía).
- **Columna "P.O." inmediatamente después de Folio** (antes de V7): las llaves de cotejo quedan juntas y arriba en la jerarquía. Monoespaciada (`.mono` = IBM Plex Mono) y `white-space:nowrap` para escanearla de un vistazo.
- **Guion cuando es vacío/NULL** (`c.po ? esc(c.po) : '—'`), nunca celda vacía ni "null" — cubre las cargas "Por Confirmar" que legítimamente aún no tienen P.O.
- **Pie ajustado:** `colspan` 7 → 8 (header pasó a 15 columnas; 8 + 7 celdas de totales = 15, cuadra).
- **Export:** verificado contra la lógica de `scrape` en exportar.js — la columna tiene encabezado no vacío, así que nunca se marca como columna-acción y **viaja en Excel/PDF** (selector `#cargasTabla table`). No asumido.
- **Buscador:** ya filtraba por PO, intacto. **Recordatorio "cotejar por P.O."** del Expediente (resalte ámbar cuando `id_v7 ≠ folio`): revisado — el texto no asumía que el P.O. estuviera oculto, sigue válido (el P.O. ahora se ve en lista y Expediente), sin reescritura.
- **Responsive:** `.tabla-wrap` ya hace scroll horizontal; en móvil se desplaza la tabla completa, no se sacrifica ninguna columna (menos aún P.O.).
- `node --check` OK + smoke test (guion en null/vacío, pie cuadrado). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-23 (E41 — Estados de embarque v2: 8 estados + matriz de transiciones)
Backend E41 amplió `cargas.estado` de 6 a 8 y agregó `v_estados_carga` (8 filas: etiqueta/orden/cuenta_como_embarque/exige_po/es_terminal…), `v_estado_transiciones` (27 filas con capacidad + es_retroceso + nota), `fn_mover_estado_carga(p_folio, p_estado, p_nota)`, y `v_anclas.cargas_por_confirmar`. **Todo se lee del catálogo — cero listas de estados hardcodeadas en la UI** (mismo criterio que v_balance).
- **`comun.js` — cache de catálogo:** `ERP.cargarEstados()` hace UN fetch de `v_estados_carga` + `v_estado_transiciones`, cacheado; se precarga en `app.js` al abrir sesión. `ERP.badgeEstado`/`estadoInfo`/`catalogoEstados` ahora leen etiqueta/orden/clase del cache; un estado nuevo lo absorbe solo (color por defecto gris). Sin `.catch` que enmascare: si truena, la app degrada al valor crudo y el módulo que lo pide muestra su errbox. Colores nuevos `.badge-estado.lila` (#9B3FAB, "Cargas por Confirmar") y `.naranja` (#C25311, "Revisión/QC") cercanos al tablero de Samuel.
- **Lista de Embarques:** los chips de estado se generan y **ordenan por `orden`** del catálogo (con etiqueta del catálogo), ocultando los de 0 vivas. **"Cargas por Confirmar"** (cuenta_como_embarque=false) va **al inicio, separado** (chip lila) y **NO suma a "Todas"** (sigue dando 74) ni a los totales — la exclusión se deriva de `cuenta_como_embarque`, no de comparar el texto. La vista base y el filtro respetan eso.
- **Botón "Cambiar estado"** (header del Expediente y ficha clásica): abre un **modal** con las transiciones filtradas por `desde=estado actual` y `capacidad` según `ERP.puede`. Si no hay ninguna → botón **deshabilitado con tooltip** explicando la capacidad requerida. Muestra la `nota` de la transición, aviso ámbar si `es_retroceso`, y campo de nota libre → `p_nota`. Llama `fn_mover_estado_carga` y muestra su `mensaje` tal cual; errores del backend vía `ERP.avisarSiPermiso` (el filtro es UX, el candado es del backend). Refresca ficha/Expediente + lista.
- **Alta de carga:** el `<select>` de estado sale del catálogo. Con un estado `exige_po=false` (Por Confirmar) el **P.O. deja de ser obligatorio** y aparece la leyenda "Sin P.O. todavía: … NO cuenta como embarque hasta confirmarla"; con cualquier otro, P.O. vuelve a exigirse. `fn_crear_carga` recibe `p_po=null` cuando va vacío.
- **Inicio:** el total de cargas vigentes excluye Por Confirmar y muestra "+N por confirmar" como dato secundario.
- **Facturación:** sin cambio de regla — `fn_emitir_factura` exige "Entregada"; como Revisión/QC ≠ Entregada, el botón ya queda deshabilitado con el tooltip "Se emite cuando el embarque esté Entregada" (sin listar estados).
- **Expediente:** el mini-form de "Confirmar entrega" avisa que confirmar también avanza el estado a Entregada (fn_confirmar_entrega ya lo hace), para no cambiarlo dos veces.
- Nota: el "pipeline" visual de la ficha clásica sigue siendo cosmético sobre las 4 etapas del happy-path (no dirige lógica); el catálogo no codifica un pipeline lineal, así que se deja como decorado.
- `node --check` OK (5 archivos) + smoke test (Todas=74, chips ordenados, transiciones por rol, candado, P.O. opcional). Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-23 (Embarques — chip de "Estatus de Cobro")
Chip de estatus de cobro en las cargas, 100% frontend consumiendo `v_cxc` (sin tocar backend).
- **Helpers compartidos (`comun.js`):** `ERP.estatusCobro(cx)` evalúa en orden y devuelve `{clave, texto, sub, clase}` — (1) no está en v_cxc → **Sin liquidar** (gris); (2) `saldo_cxc ≤ 0` → **Cobrado** (verde); (3) `dias_vencido > 0` → **Vencido** (rojo, sub `${dias_vencido}d`); (4) `cobrado > 0` → **Parcial** (azul, sub % cobrado, **nunca NaN**: si venta 0/nula se omite el %); (5) resto → **Pendiente** (ámbar, sub `vence en ${-dias_vencido}d`). `ERP.chipCobroHTML(cx)` reúsa el componente `.badge-estado` (paleta gris/verde/rojo/azul/ámbar existente).
- **Carga de datos:** `render()` de Embarques hace **UN solo fetch de `v_cxc`** en paralelo, lo indexa por folio en un `Map` y lo cruza con la lista ya traída (no hay consulta por carga). Si `v_cxc` falla, `cxcOk=false` y la lista funciona **sin chips**.
- **Lista de Embarques:** columna nueva **"Cobro"** después de Estado (viaja en el export; anuladas sin chip). `colspan` del pie ajustado.
- **Filtro:** 5 chips nuevos de cobro (Cobrado/Parcial/Vencido/Pendiente/Sin liquidar) con conteo, mismo patrón single-select `data-estado="cobro:<clave>"`; `filtradas()` los resuelve. Solo se muestran si `cxcOk`.
- **Modal de detalle (Expediente):** el chip va en el encabezado junto al estado, más una línea **Venta · Cobrado · Saldo por cobrar**. El Expediente hace UNA consulta de `v_cxc` para ese folio (es el detalle abierto, no la lista), robusta ante cualquier punto de entrada.
- **Verificación esperada:** 26 Cobrado · 9 Parcial · 26 Vencido+Pendiente · 13 Sin liquidar = 74. `node --check` OK (3 archivos) + smoke test de las 5 reglas. Desplegado y verificado.
- **Ajuste (2026-07-23):** como "Vencido" gana sobre "Parcial" y las 9 cargas con abono también están vencidas, el chip Parcial nunca aparecía y se perdía la señal del abono. (a) En `ERP.estatusCobro`, la rama "Vencido" ahora agrega el % al sub si hubo abono: `${dias_vencido}d · ${pct}% cobrado` (misma protección: sin % si venta 0/nula → nunca NaN). (b) En el filtro, el chip **"Parcial" filtra por "tiene abono parcial"** (`cobrado>0 && saldo_cxc>0`), esté vencida o no, vía el helper `enCobro()`; se **traslapa con Vencido a propósito** (preguntas distintas). Conteos tras el cambio: **Vencido 31 · Cobrado 26 · Sin liquidar 13 · Pendiente 4** (partición = 74) y **Parcial 9** (⊂ Vencido). Verificado con smoke test.

## ACTUALIZACIÓN — 2026-07-22 (E39 — Utilidad por carga + pantalla "Posición de caja")
Backend E39: `v_carga_detalle` expone `venta_esperada, utilidad, utilidad_es_estimada, margen_pct, utilidad_nota`; y vista nueva `v_posicion_liquidez(orden, seccion, concepto, monto, nota)`.
- **Helpers compartidos (`comun.js`):** `ERP.utilidadColor(u)` (verde >0, rojo <0, normal =0/NULL), `ERP.utilidadTexto(u, est, nota)` (NULL→"—" nunca $0.00; sufijo " (est.)" si `utilidad_es_estimada`; ícono ⓘ con `utilidad_nota` SOLO en tooltip), `ERP.margenTexto(m)` ("8.15%" o "—"), y `ERP.cablearInfoNota(cont)` (ⓘ con hover + tap/Enter → toast, `stopPropagation` para que el tap en una fila clickeable no abra la ficha). La `utilidad_nota` nunca se pinta como texto suelto.
- **Lista de Embarques (`modulo-cargas.js`):** columna **"Utilidad"** después de Venta, con color/est./ⓘ y total en el pie. **Ordenable** por clic en la cabecera (▼/▲, NULLs siempre al final; se resetea a orden por folio al entrar). Viaja en el export Excel/PDF (se raspa `#cargasTabla`).
- **Expediente (Resumen) y Ficha clásica:** tarjetas **"Utilidad"** y **"Margen %"** junto a "Margen por caja" / "Margen bruto", mismo criterio de pintado; ⓘ cableado en ambos.
- **Pantalla nueva "Posición de caja" (Finanzas):** sección desde `v_posicion_liquidez`, agrupada por `seccion` y ordenada por `orden` (nunca hardcodeado); secciones Entra/Sale/Socios/Resultado; renglones que empiezan con TOTAL/FLUJO/POSICION en negritas con línea superior (clase `.total`); **"POSICION NETA" verde si ≥0, rojo si <0**; `nota`→ⓘ; montos `$12,345.67`; texto fijo explicativo arriba; export Excel/PDF con el helper existente. **Sin `.catch`**: si la vista truena, se ve el errbox del módulo (igual que Balance).
- `node --check` OK (4 archivos) + smoke test de la lógica. Desplegado y verificado en producción.
- **Ajuste E39b (2026-07-23):** `pintarPosicionLiquidez` ahora agrupa por `seccion` con encabezado de grupo (recorriendo las secciones como vengan, sin hardcodear nombres ni `orden`) y la sección **"Informativo"** va separada (divisoria arriba, texto en gris, sin negritas, rotulada "no entra en la suma") por ser dato de contexto fuera de la aritmética; verificado que "Ventas con precio pactado por escrito" muestra `$0.00`. `node --check` OK, desplegado.

## ACTUALIZACIÓN — 2026-07-22 (Embarques — los conteos por estado excluyen anuladas)
Los chips/contadores por estado contaban TODAS las filas de `v_carga_detalle`, incluidas las anuladas, mostrando basura (ej. "Falta informacion 3", "En Camino 2", "Rechazo 2" — todas anuladas, 0 vivas). Corregido en `modulo-cargas.js`, consumiendo la columna `anulado` que ya trae la vista:
- **Vista base = solo cargas vivas (`anulado != true`):** `filtradas()` excluye anuladas en TODOS los filtros operativos (Todas, Activas, Con flag y cada estado); las anuladas solo aparecen con el chip "Anuladas". La tabla por defecto (`todas`) ya no las muestra.
- **Conteos sin anuladas:** `nEstado`, `nActivas`, `nFlag` y la nueva "Todas" (`nVivas`) filtran `!anulado`. "Todas" ahora es 70 (antes 77).
- **Chips de estado en 0 no se muestran:** `estados()` solo lista estados con ≥1 carga viva. Hoy quedan **Cerrada (48) · Entregada (21) · Programada (1)**; desaparecen Falta informacion, En Camino y Rechazo (solo existían en anuladas).
- **Anuladas separadas:** el chip **"Anuladas ⊘ (7)"** se movió al final de la barra (con separación), fuera de los estados operativos; el usuario lo activa a propósito para ver las anuladas.
- **Inicio:** el total de cargas vigentes ya excluía anuladas (`cargas.length - anuladas` = 70, no 77); verificado en producción. Sin cambios necesarios ahí.
- `node --check` OK + smoke test (Todas 70, Anuladas 7, estados vivos 48/21/1, "En Camino" 0 sin chip). Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-22 (Consolidación de documentos — un solo sistema oficial)
La pantalla mezclaba dos sistemas: `documentos` (oficial: `fn_registrar_documento` + `v_documentos`, bucket `documentos`) y `carga_documentos` (jubilada, con `mov_folio` INTEGER que causaba `invalid input syntax for type integer` al anotar la PO del cliente). Consolidado en el sistema oficial, sin tocar backend:
- **Expediente → pestaña Documentos:** ya NO usa `carga_documentos` (se borró todo ese código: form con `mov_folio`, insert directo, lista sobre `v_carga_documentos`, constantes). Ahora **delega en `ERP.documentos.montar(cont, { entidad: 'carga', entidadId: folio, permitirSubir: !anulado })`** — el mismo componente que ya usaba la ficha clásica. Un solo camino.
- **Componente `ERP.documentos` (documentos.js):** se le agregó el campo **"Referencia externa" (PO cliente, contenedor, guía/BL)**, texto libre opcional, que se manda como `p_referencia_externa`; se muestra en la lista. Ya cumplía el resto: categoría del catálogo `v_categorias_documento` (nombre EXACTO, ej. "Orden de compra"), validación de tipo/tamaño/campos **antes** de subir al Storage, y limpieza del archivo huérfano si el registro falla. Se corrigió su header (estaba marcado DEPRECADO por error; es el sistema vivo).
- **Bug del folio bancario eliminado de raíz:** el campo `mov_folio` desapareció; la PO/contenedor/guía va en "Referencia externa" (texto) o en "Nota".
- **Menú:** se retiró el enlace legacy `captura.html` ("Capturar movimiento") — la captura de movimientos ya vive en la SPA (`ERP.capturarMovimiento`: botón en Tesorería y contextuales en Cobranza/Pagos). El `<script src="documentos.js">` **se mantiene** (es el sistema vivo que consumen ficha clásica y Expediente).
- Archivos: `modulo-expediente.js`, `documentos.js`, `index.html`. `node --check` OK; desplegado y verificado (referencia externa en documentos.js, Expediente delegando, sin `captura.html` en el menú).

## ACTUALIZACIÓN — 2026-07-22 (Bug — folio bancario no numérico en Documentos del Expediente)
`carga_documentos.mov_folio` es INTEGER. Si el usuario escribía texto (ej. la PO del cliente "NGM247514") en "Folio de movimiento bancario", el archivo se subía al Storage pero el INSERT fallaba con `invalid input syntax for type integer`, se revertía y dejaba un huérfano momentáneo con mensaje feo. Arreglado en `modulo-expediente.js` (sección Documentos), sin tocar backend:
- **Input solo numérico:** el campo pasó a `type="number" min="1" step="1" inputmode="numeric"` (teclado numérico en móvil).
- **Validación ANTES de subir:** en `subir()`, si el folio no es solo dígitos (`/^\d+$/`) se aborta **antes** de tocar el Storage con el mensaje: *"El folio bancario es el número de movimiento del ERP (solo dígitos). Si querías anotar la PO del cliente u otra referencia, usa el campo Nota."* → ya no hay archivos huérfanos.
- **Etiqueta más clara:** "Folio de movimiento bancario del ERP (opcional, solo número)" para dejar claro que NO es la PO del cliente.
- **Nota:** confirma que acepta texto libre (`type="text"`, 200 chars); su placeholder ahora sugiere "PO del cliente, contenedor, referencia…".
- `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-22 (E37 — factura con ítem/cantidad/precio del embarque y emisión solo si "Entregada")
Backend E37: `productos.codigo_item` (ID-01..ID-021) va en la columna "item"; `fn_crear_factura` llena cada línea con item, qty (cajas), precio (venta/cajas) y total — si la carga no tiene cajas, qty/precio salen NULL y `r_advertencia` lo explica; `fn_emitir_factura` rechaza la emisión si el embarque no está "Entregada" (el borrador sí se crea).
- **Columnas de líneas (pantalla):** encabezados renombrados a **Item · Descripción · Cantidad · Precio unit. · Total**. En modo lectura (factura emitida/anulada) las líneas se pintan como texto y **qty/precio/total NULL → guion, nunca cero** (nuevo `filaLineaLectura`); en borrador siguen siendo inputs editables.
- **PDF (INVOICE):** la columna **ITEM#** muestra el código del producto (ya venía; ahora el backend lo llena) y `filaLineaImpr` pinta **guion** para qty/precio/total NULL en lugar de celda vacía.
- **Advertencia al crear:** se muestra `r_advertencia` **tal cual** (toast), sin el sufijo fijo "captura la dirección…" que ya no aplica siempre (ahora la advertencia puede ser por carga sin cajas).
- **Botón "Emitir":** sigue visible; si el backend rechaza por estado de carga, se muestra el mensaje del error tal cual. Además (opcional pedido): si el embarque **no está "Entregada"**, el botón queda **deshabilitado** con tooltip *"Se emite cuando el embarque esté Entregada"*. El estado se lee de `v_carga_detalle` por folio (patrón de `cxcActual`); si no se pudiera leer, el botón queda habilitado y el backend gatea. `botonesFicha` conserva ese bloqueo al reactivar botones.
- `node --check` OK + smoke test de guiones y del bloqueo de emisión. Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (FASE 4 — Panel "Hoy" en Inicio)
Primer punto de FASE 4. Vista nueva `v_panel_hoy(orden, severidad, categoria, titulo, detalle, monto, referencia, ruta)` (authenticated; solo devuelve renglones cuando algo está MAL).
- **Sección "Hoy" arriba de todo en Inicio** (antes del hero de utilidad neta): tarjetas agrupadas por severidad **roja → ámbar → gris**, y dentro de cada grupo por `orden` (nunca hardcodeado). Colores mapeados a la paleta de semáforos (`--rojo`/`--ambar`/`--gris-claro` en el borde izquierdo de cada tarjeta).
- **Tarjeta:** título, detalle, monto `$12,345.67` (se **omite** la línea si `monto` es NULL, nunca "$0.00") y referencia como etiqueta secundaria (se **omite** si es NULL, nunca "null").
- **Contador** derivado de los datos: "N rojas · N ámbar · N informativas".
- **Grises plegadas** por defecto tras un `<details>` "Ver informativas (N)"; rojas y ámbar siempre visibles.
- **Estado vacío amable:** si la vista trae el centinela `categoria='Sin alertas'` (o ningún renglón real), se pinta "✅ Todo en orden — no hay alertas hoy", no una tarjeta de alerta.
- **Clic → ruta de la SPA:** `v_panel_hoy.ruta` **ya emite el id real del módulo del router** (cobranza, cierres, cargas, flags, tesoreria…), así que se usa `r.ruta` directo — **sin tabla de alias** (se eliminó `RUTA_ALIAS`; si un módulo se renombra se corrige en la vista, no aquí). La tarjeta navega con `ERP.ir`. Se conserva `ERP.moduloExiste(r.ruta)` (helper agregado a `comun.js`) como red de seguridad: si la ruta **no existe** en el router, la tarjeta queda **inerte** (no rompe la navegación). El centinela 'Sin alertas' trae `ruta = NULL`.
- **Sin export** (el panel es para mirar). **Responsive:** grid `auto-fill minmax(280px,1fr)` + una columna en móvil (`@media max-width:640px`).
- **Sin `.catch` que oculte:** `v_panel_hoy` se pide con `.catch` que captura el mensaje y lo **muestra** dentro del panel (errbox), sin tumbar el resto de Inicio.
- Archivos: `modulo-inicio.js` (`pintarHoy`/`tarjetaHoy` + query + cableado), `comun.js` (`moduloExiste`), `estilos.css` (clases `.hoy-*`). `node --check` OK + smoke test de la lógica. Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-21 (E37e — tercer valor de destino: 'Neutro (se cancela)')
`v_balance_partidas.destino` ahora tiene un tercer valor `'Neutro (se cancela)'`. En la sub-sección "Partidas por aplicar (detalle)" se invirtió la lógica de color: en vez de comparar contra el texto de Inventario, ahora **solo `'Por aplicar a un embarque'` cuenta como pendiente** (rojo si el sin-aplicar es negativo); **cualquier otro destino (Inventario, Neutro y valores futuros) va en gris y sin rojo**. Así aguanta nuevos valores sin tocar código. `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37d — Destino de partidas + limpieza de deuda E36)
`v_balance` pasó a 13 filas (nueva "Inventario de material de empaque" en Activo, orden 4; los TOTAL/Cuadre se recorrieron). El frontend YA agrupa por `seccion` y ordena por `orden` sin hardcodear números, así que absorbe la fila nueva sin cambios. `v_balance_partidas` trae columna nueva `destino` (`Inventario (activo, no pendiente)` | `Por aplicar a un embarque`).
- **Sub-sección "Partidas por aplicar (detalle)":** columna nueva **"Destino"**. Las filas con `destino='Inventario (activo, no pendiente)'` van en **gris suave y NO en rojo** aunque el "sin aplicar" sea negativo (no son un pendiente: ya están reconocidas en el Activo); las de "Por aplicar a un embarque" mantienen el rojo en negativos.
- **Texto fijo actualizado:** "Dinero que salió o entró del banco y todavía no está aplicado a un embarque. Las filas marcadas como Inventario ya están reconocidas en el Activo y no son un pendiente; el resto sí debe aplicarse."
- **Export:** la columna Destino viaja en Excel/PDF (el export multi-tabla del Balance raspa `#tblPartidas`, que ya la incluye).
- **Deuda E36 saldada:** en `modulo-cargas.js` → `render()` se quitó la consulta a `v_margen_caja` con `.catch(() => [])` que rellenaba `cajas` "por si `v_carga_detalle` no las exponía". Ya las expone: era código muerto y el patrón defensivo que hay que erradicar. Ahora `render()` lee `v_carga_detalle` directo, sin catch.
- `node --check` OK (2 archivos) + prueba de la lógica de Destino. Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37c — ID del embarque en el V7 de Samuel)
`v_carga_detalle` trae una columna nueva `id_v7` (text, puede ser NULL): el ID del mismo embarque en el Control de Cargas V7 de Samuel (Drive). NO es el folio del ERP — son consecutivos independientes y en 28 de 70 casos difieren (ej. ERP P-075 = V7 P-071); sirve para cotejar contra el Excel de Samuel por el renglón correcto.
- **Expediente (Resumen):** dato nuevo **"ID en V7 (Samuel)"** junto al Folio. Si `id_v7` es NULL muestra "— (no está en el V7)". Si `id_v7 <> folio` se resalta en **ámbar suave** con tooltip "El folio del ERP y el ID del V7 son distintos para este embarque. Cotejar siempre por P.O.".
- **Lista de Embarques:** columna nueva **"V7"** (tras "Carga") con el `id_v7` o "—"; `colspan` del pie ajustado. **Buscable** en el filtro de texto existente (se agregó `id_v7` a los campos y al placeholder).
- **Export Excel/PDF de Embarques:** incluye la columna V7 automáticamente (el scrape lee la tabla `#cargasTabla`, que ya la contiene).
- Todo desde `v_carga_detalle` (sin `.catch` nuevo). `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37b — el cuadre viaja en el export)
La barra de cuadre es un `<div>` y no la raspa el export. Se agregó un **renglón de cuadre al final del `<tbody>` de `#tblBalance`** (tomado de la fila `seccion='Cuadre'` de `v_balance`): concepto "CUADRE (Activo - Pasivo - Patrimonio)", monto de esa fila. En negritas (clase `total`) y con la misma lógica de color que la barra (verde si `|monto| < 0.005`, rojo si no). Se ve en pantalla como último renglón y, por estar dentro de la tabla, **viaja en Excel y PDF**. La barra grande se queda como semáforo — son complementarias. `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37 — Balance General con cuadre y partidas por aplicar)
`v_balance` cambió a 12 filas `(orden, seccion, concepto, monto, nota)` con secciones `Activo | Pasivo | Patrimonio | Cuadre`; `nota` es nueva (puede venir NULL). Vista nueva `v_balance_partidas(tipo, grupo, movimientos, monto_movido, aplicado, sin_aplicar)` (solo tipos con `sin_aplicar <> 0`; puede venir vacía). Todo en el panel Finanzas → "Balance general".
- **Secciones agrupadas por `seccion` en orden de `orden`;** los renglones que empiezan con "TOTAL" van en negritas con línea superior (clase `total`); montos `$12,345.67`.
- **Barra de cuadre** al pie (no como renglón): verde "✅ Balance cuadrado" si `monto = 0`; rojo "⚠️ DESCUADRE DE $X — avisar a Miguel" si `≠ 0`. Es el semáforo de integridad.
- **Nota → ícono ⓘ** junto al concepto: tooltip en hover (`title`) y **tap** en móvil (muestra la nota como toast; también responde a Enter/Espacio por accesibilidad).
- **Sub-sección plegable "Partidas por aplicar (detalle)"** (`<details>`, así la tabla queda en el DOM aunque esté cerrada) alimentada de `v_balance_partidas`, ordenada por `sin_aplicar` ascendente, con el texto fijo explicativo arriba. Si la vista vuelve vacía: "Sin partidas pendientes ✅".
- **Export Excel + PDF** del Balance en **un solo archivo que incluye el detalle de partidas**: helper nuevo `ERP.botonesExportarVarias(nombre, titulo, contenedor)` + `exportarExcelVarias`/`exportarPDFVarias`/`scrapeTablas` en `exportar.js` (raspan TODAS las `<table>` del contenedor `#balanceExport`, cada una con su título vía `data-exp-seccion`; PDF con logo por `encabezadoPDF`, formato moneda en Excel). Los exports de una sola tabla no se tocaron (ruta `data-exp-multi`).
- **Sin `.catch` defensivo:** `v_balance` y `v_balance_partidas` se piden sin `.catch`; si truenan, `despachar()` muestra el `errbox` del módulo en vez de ocultar el fallo con `[]`.
- `node --check` OK (2 archivos) + prueba de la lógica (cuadre verde/rojo, orden, TOTAL en negrita, ⓘ solo con nota, partidas vacías/ordenadas). Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-21 (E36 4ª parte — Entrega programada vs. entrega real)
El histórico `f_entrega` resultó ser una fórmula (embarque + 21 días), no una entrega observada. El backend separó: `f_entrega` = programada, `f_entrega_real` = confirmada por una persona. `v_carga_detalle` expone ahora `f_entrega_real, entrega_nota, entrega_por, entrega_ts, transito_es_estimado, desfase_entrega_dias`; `transito_dias` usa la real si existe, si no la programada. RPC nueva `fn_confirmar_entrega(p_folio, p_fecha, p_nota)`.
- **`modulo-expediente.js` (Resumen):** "Fecha de entrega" → **"Entrega programada"**; se agregó **"Entrega real"** (guion si NULL) con el **desfase** al lado: `+3 días` en rojo (tarde), `-2 días` en verde (antes), `en fecha` si 0. En **Tránsito**, si `transito_es_estimado` es true el número va en gris con tooltip "Estimado: la entrega real no se ha confirmado"; si false, normal.
- **Botón "✓ Confirmar entrega"** en las acciones del Expediente: visible solo con capacidad `capturar`, solo si `f_entrega_real` es NULL y el embarque no está anulado. Abre un mini-formulario inline (contenedor `#expFormEntrega`, patrón toggle): fecha (por defecto hoy, `max=hoy`) + nota opcional. Llama `fn_confirmar_entrega`, muestra el campo `mensaje` que devuelve como toast de éxito, limpia caché (`marcarDatosSucios`) y recarga el Expediente (ya con entrega real y sin el botón). Validación en cliente: fecha requerida, no futura, no anterior al embarque; errores de permiso vía `ERP.avisarSiPermiso`. Se agregó `rpc` al destructure del módulo.
- **`modulo-cargas.js` (alta de embarque):** etiqueta "Fecha de entrega" → **"Entrega programada"** con ayuda al pie del campo: *"Estimada; la llegada real se confirma después desde el Expediente."*
- `node --check` OK (2 archivos) + prueba de desfase (signo/color/singular-plural), gating de tránsito estimado y validaciones del formulario. Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-21 (E36 3ª parte — corrección: todo desde v_carga_detalle)
El backend expuso en `v_carga_detalle`: `pallets`, `f_entrega`, `origen_operativo`, `cajas_por_pallet` y `transito_dias`.
- **`modulo-expediente.js`:** se quitó del `Promise.all` de `verExpediente` la lectura directa `q('cargas', …)` y la variable `cg` (con su rastro en `estado` y en la firma de `htmlResumen`). La tabla `cargas` NO es legible por `authenticated` (RLS sin políticas), así que esa consulta **siempre fallaba** y el `.catch` la ocultaba: Pallets, Fecha de entrega, Cajas por pallet y Tránsito salían **siempre en guion**. Ahora todo se toma de `v_carga_detalle` (`d`).
- **Derivados desde el backend:** se usan `d.cajas_por_pallet` y `d.transito_dias` directo y se **borró el cálculo local** (fechas/división en el front). Mismo criterio de NULL (guion, nunca cero). El resto del Resumen no cambió.
- **Regla reafirmada:** el frontend consume **solo vistas y RPCs, nunca tablas**. Si falta un dato en una vista, se anota en `PENDIENTES-BACKEND.md` (no se leen tablas directas). Esta corrección alinea el código con esa regla.
- `node --check` OK; desplegado y verificado en `erp-plein-dashboard.vercel.app` (ya no aparece `q('cargas')`).

## ACTUALIZACIÓN — 2026-07-21 (E36 3ª parte — Pallets y fecha de entrega)
Backend E36 agregó a `cargas`: `pallets` (int opcional), `f_entrega` (date opcional), `origen_operativo`; y `fn_crear_carga` acepta `p_pallets` y `p_f_entrega` (rechaza pallets ≤ 0 y entrega anterior al embarque).
- **`modulo-cargas.js` → `nuevaCarga`:** dos campos nuevos opcionales — **"Fecha de entrega"** (junto a Fecha de embarque) y **"Pallets"** (junto a Cajas). En `guardarNuevaCarga`: pallets se valida entero > 0; la fecha de entrega se **valida en cliente** que no sea anterior al embarque (comparación de texto ISO YYYY-MM-DD, mensaje claro, sin depender del error del backend). Se mandan `p_pallets` y `p_f_entrega`.
- **`modulo-expediente.js` (Resumen):** se muestran **Pallets** y **Fecha de entrega**, más dos derivados calculados en el front — **Cajas por pallet** (`cajas / pallets`, solo si ambos) y **Tránsito** (días entre `f_embarque` y `f_entrega`, solo si ambas; `0 días` es valor genuino, no guion). Mismo criterio de NULL: guion, nunca cero; sin división por cero si pallets fuera 0.
- **Fuente de los datos:** `v_carga_detalle` **todavía no expone** `pallets`/`f_entrega`. El Expediente los prefiere de `d` (v_carga_detalle) por si el backend los expone luego, con **respaldo a la fila `cargas` por folio** (`q('cargas', &folio=eq…)`, `.catch → []`). Si esa tabla no fuera legible por authenticated, degrada a guion sin romper nada. **Si se prefiere no leer la tabla directa, pedir al backend exponer `pallets`, `f_entrega` (y `origen_operativo`) en `v_carga_detalle`** y el Expediente los tomará solo de ahí sin más cambios.
- **Tabla de Embarques:** sin columnas nuevas (según indicación).
- `node --check` OK (2 archivos) + prueba de los derivados y validaciones (0 días genuino, singular/plural, sin div/0, bloqueo entrega < embarque). Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-20 (E36 2ª parte — Costos desglosados en el alta de embarque)
Backend E36 amplió `fn_crear_carga` para aceptar costos DESGLOSADOS por concepto (`p_materia_prima, p_comision, p_aduanas, p_qc, p_fletes, p_carton, p_otro`, todos numeric opcionales). El viejo `p_costo` sigue por compatibilidad, pero mandarlo solo deja el costo sin desglosar (advertencia) y mandarlo junto a un desglose que no cuadra lanza excepción.
- **`modulo-cargas.js` → `nuevaCarga`:** el campo único **"Costo USD"** se reemplazó por **siete campos** de costo (Materia prima · Comisión · Aduanas · In & Out QC · Fletes · Cartón · Otro), bajo un subtítulo "Costos por concepto (todos opcionales)". Debajo, un **Total en vivo** solo informativo que se recalcula con cada tecla.
- **Envío:** en `guardarNuevaCarga` **ya no se manda `p_costo`**; se manda únicamente el desglose, y solo los conceptos con valor > 0 (los vacíos o en 0 se omiten). Así es imposible el descuadre. El mapeo input→parámetro vive en la constante de módulo `CAMPOS_COSTO`.
- **Validación:** cada campo se acepta vacío o ≥ 0; un negativo se rechaza con aviso. **No** se exige ninguno: si van los siete vacíos la carga nace con flag "falta costo" (comportamiento previo, deseado).
- **Advertencias del backend:** se siguen mostrando igual (`r.advertencias` → aviso en el panel), verificado.
- Se mantienen intactos el campo **Cajas** y su texto de ayuda ("El precio por caja lo calcula el sistema; no se captura.").
- `node --check` OK + prueba de la construcción del payload (todos vacíos → sin params de costo; desglose → solo > 0; negativo → error; nunca `p_costo`). Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-20 (E36 — Cajas y margen por caja en los embarques)
Backend E36 agregó `cajas` a `cargas` (más `cajas_origen`, `cajas_nota`), un parámetro opcional `p_cajas` a `fn_crear_carga`, y las vistas `v_margen_caja` y `v_cajas_vigilancia`. Se consumen así (sin tocar Supabase):
- **Alta de embarque (`modulo-cargas.js` → `nuevaCarga`):** campo **"Cajas"** opcional (entero > 0; vacío = NULL). Se valida en `guardarNuevaCarga` y se manda como `p_cajas`. Ayuda al pie del formulario: *"El precio por caja lo calcula el sistema; no se captura."*
- **Tabla de Embarques:** nueva columna **"Cajas"** (separador de miles con `fmt0`, guion cuando es NULL) más total al pie. `render()` lee `v_carga_detalle` y, por si esa vista aún no expone `cajas`, rellena por folio desde `v_margen_caja` (merge defensivo). El export Excel/PDF ya incluye la columna automáticamente.
- **Finanzas (`modulo-finanzas.js`):** sección nueva **"Margen por caja"** desde `v_margen_caja`, agrupada por producto con promedios ponderados por cajas (estilo `v_kpi_margen_producto`), con export Excel/PDF. **Regla de NULL:** `margen_por_caja`/`venta_por_caja`/`costo_por_caja` ausentes se muestran como **guion con el `motivo_sin_margen_caja` en tooltip**, nunca 0 ni vacío. Los promedios por caja usan solo embarques con cajas capturadas e ingreso confiable.
- **Expediente de embarque (`modulo-expediente.js`):** el encabezado (Resumen) muestra **Cajas** y **Margen por caja** con el mismo criterio de NULL (guion + tooltip). Se agregó la consulta `v_margen_caja` por folio al `Promise.all` de `verExpediente`.
- `v_cajas_vigilancia` hoy no tiene filas; no se construyó pantalla (según indicación).
- Validado con `node --check` (3 archivos) + prueba unitaria de la agrupación por caja; desplegado a producción y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-20 (Tareas: asignables desde v_socios_asignables + CLAUDE.md al día)
- **modulo-tareas.js — `cargarSocios()`:** ahora lee la vista nueva **`v_socios_asignables(socio_codigo, nombre, rol)`** (solo socios activos) en vez de `usuarios_erp`, que NO es legible por el rol authenticated (por eso el desplegable solo mostraba a Miguel cuando no había tareas). `id = socio_codigo` (el mismo valor que va a `p_asignado_a` y que trae `v_tareas.asignado_a` — sin cambiarlo a email ni id). Se mantiene el fallback (asignados ya presentes en tareas + usuario actual) por si la vista fallara, pero ya no se consulta `usuarios_erp`.
- **Rol visible al asignar:** helper `etiquetaSocio()` muestra el rol junto al nombre en los tres desplegables de asignación/filtro — p. ej. *"Jose Arambula (solo lectura)"* para rol `vista`. Motivo: un socio `vista` puede RECIBIR la tarea pero no puede cambiarle el estado ni comentar (ambos requieren capacidad `capturar`), así que quien asigna lo ve de entrada.
- **CLAUDE.md actualizado:** agregadas las vistas E32–E35 (`v_facturas, v_ordenes_compra, v_orden_compra_items, v_tareas, v_tareas_resumen, v_tarea_comentarios, v_socios_asignables, v_bitacora_ediciones`), las 6 RPCs de tareas, los valores CHECK de tareas (punto 9), los helpers `ERP.imprimirArea()` y `ERP.descLineaDoc()` (punto 10) y la nota de que `usuarios_erp` no es legible por authenticated.
- Validado con `node --check`; desplegado a producción (`dpl_D6ZHQay…`, READY) y verificado que `erp-plein-dashboard.vercel.app/modulo-tareas.js` ya sirve `v_socios_asignables`/`etiquetaSocio`.

_Generado el 2026-07-17. Foto real del código, sin adornos. El frontend NO puede ver la base de datos,
así que "VIVO vs FUNCIONAL-SIN-USO" se infiere de qué vistas consume cada módulo (las vistas ancla con
cifras reales de sesiones previas = VIVO; lo recién construido o dependiente de datos que aún no se llenan
= FUNCIONAL). **La verdad sobre el uso real solo la tiene Supabase.**_

Arquitectura: SPA de una sola página (`index.html`) con router por hash (`#/modulo`). Cada módulo es un
archivo `modulo-*.js` que se registra con `ERP.registrar(ruta, {titulo, render})`. Núcleo compartido en
`comun.js` (cliente Supabase, helpers de formato, panel/drawer, combos, permisos). **14 módulos registrados,
los 14 están en el menú. No hay módulos registrados escondidos.** Sí hay piezas fuera del menú (abajo).

---

## ACTUALIZACIÓN — 2026-07-20 (módulo Tareas E35 + fix select Órdenes)

`modulo-tareas.js` reescrito al contrato E35 (siguiendo el patrón de facturas/órdenes). Backend E35, no se tocó.

- **Vistas:** `v_tareas`, `v_tareas_resumen` (chips), `v_tarea_comentarios`. **RPCs:** `fn_crear_tarea`,
  `fn_editar_tarea`, `fn_cambiar_estado_tarea`, `fn_asignar_tarea`, `fn_comentar_tarea`, `fn_cancelar_tarea`.
  Valores literales que van a la RPC (CHECK): estado `pendiente|en_proceso|hecha|cancelada`, prioridad
  `baja|media|alta|urgente`, área `cargas|comercial|sourcing|admin`; en pantalla se ven en español.
- **Vistas de pantalla:** **Kanban** (4 columnas por estado) + **Tabla**, con toggle. En celular el kanban
  se apila (grid → 1 columna). Se renderizan ambas y una se oculta, para que el **export** (`#tblTareas`)
  funcione en cualquier vista.
- **Filtros:** chips por área con conteo (de `v_tareas_resumen`), select de asignado, select de prioridad,
  búsqueda por texto. **Atrasada** se marca en rojo (viene calculada en la vista, no se recalcula).
- **Ficha:** editar (solo si no está hecha/cancelada) vía `fn_editar_tarea` (con `p_limpiar_fecha`); botones
  de cambio de estado (`fn_cambiar_estado_tarea`); **hilo de comentarios** (`v_tarea_comentarios`) + comentar
  (`fn_comentar_tarea`); cancelar con motivo (`fn_cancelar_tarea`). Asignación dentro del edit (los socios
  salen de `usuarios_erp` si es legible, con fallback a los asignados existentes + el usuario actual).
- **Enlaces cruzados:** chips 📦 embarque → `ERP.verCarga`, 📄 cotización → `ERP.verComercial`, 🧾 orden →
  `ERP.verOrden`, en la lista y en la ficha.
- **Integración:** recuadro **Tareas** en la ficha clásica de carga y en la pestaña Resumen del Expediente
  (`ERP.montarTareasCarga`), con botón "Nueva tarea" prellenando el embarque.
- **Gating:** crear/editar/estado/asignar/comentar/cancelar requieren `puede('capturar')`; rol vista = solo
  lectura. Catches de escritura vía `ERP.avisarSiPermiso`.
- **Bug corregido en Órdenes:** el `<select>` de producto en la ficha en solo-lectura mostraba "— libre —"
  porque los productos solo se cargaban en modo edición. Ahora `verOrden` carga el catálogo siempre, así el
  select deshabilitado muestra el producto guardado. (Las opciones de `<select>` de Tareas también fijan el
  valor real seleccionado.)

**Archivos tocados:** `modulo-tareas.js` (reescrito), `modulo-ordenes.js` (fix + carga de catálogos),
`modulo-cargas.js` y `modulo-expediente.js` (integración), `estilos.css` (kanban/tareas), `PLAN-MAESTRO.md`.
El nav "✅ Tareas" y el `<script>` ya existían.

**Cómo probarlo (Miguel):** tras `npx vercel --prod`, entra a **Tareas**:
1. **Samuel/Miguel (capturar):** "+ Nueva tarea" → título, área, prioridad, asignado, embarque opcional →
   Crear; en la ficha edita, mueve el estado (kanban), comenta, cancela. Alterna Kanban/Tabla; exporta.
2. **José (vista):** ve el tablero y las fichas, pero sin botones de acción.
3. **Embarque:** abre un embarque (Expediente → Resumen, o la ficha) y verás el recuadro de tareas ligadas.

**Dependencia backend (E35):** `v_tareas`, `v_tareas_resumen`, `v_tarea_comentarios` y las 6 RPCs.
`usuarios_erp` es opcional (si no es legible, la asignación cae a los asignados existentes + el usuario actual).

---

## ACTUALIZACIÓN — 2026-07-20 (PDF de Órdenes: logo + columna descripción)

Dos defectos del PDF PURCHASE ORDER (visto con OC-0001 real, AGROFEPAC):

1. **Logo en blanco.** Diagnóstico: (a) `assets/logo-plein.png` existe y sirve 200 en prod; (b) la
   plantilla YA usaba `ERP.encabezadoImpresion()` (no estaba hardcodeada); (c) `print-color-adjust:exact`
   ya estaba. **Causa real:** `imprimir()` hacía `innerHTML = …; window.print()` de forma síncrona, así
   que la imagen del logo aún no había cargado al imprimir → salía en blanco. El texto "ERP Plein Produce"
   que se veía arriba es el **encabezado del navegador** (document.title), no el documento.
   **Fix (centralizado):** nuevo `ERP.imprimirArea(html)` en `exportar.js` que espera a que las imágenes
   terminen de cargar (o 1.5 s de salvaguarda) antes de `window.print()`. Lo usan Órdenes y Facturación.
2. **Columna DESCRIPCIÓN vacía.** En `orden_compra_items`, `descripcion` viene null cuando el usuario solo
   elige producto del select. Además, al imprimir con la ficha abierta se armaban los ítems sin el nombre
   del producto. **Fix:** `imprimir()` de Órdenes ahora lee SIEMPRE de `v_orden_compra_items` (trae nombre
   de producto + descripción) y usa el helper compartido `ERP.descLineaDoc(producto, descripcion)`:
   ambos → "Papaya — descripción", solo uno → ese, ninguno → "". Aplicado también al PDF de cotizaciones/
   órdenes del módulo comercial (jsPDF). El INVOICE no comparte el defecto (sus líneas son item/descripción
   libre, sin catálogo de producto), solo recibió el fix del logo.

**Archivos tocados:** `exportar.js` (helpers `imprimirArea` y `descLineaDoc`), `modulo-ordenes.js`,
`modulo-facturas.js`, `modulo-comercial.js`. Solo plantillas de impresión; no se tocó backend/RPCs/esquema.

**Cómo probarlo:** imprime OC-0001 (u otra OC) → el logo de Plein debe verse arriba-izquierda y la columna
DESCRIPCIÓN debe decir el producto. Igual en una factura y en una cotización.

---

## ACTUALIZACIÓN — 2026-07-20 (Facturación: estado cancelado = 'anulada')

`fn_cancelar_factura` ahora deja el estado en **'anulada'** (antes intentaba 'cancelada' y fallaba por el
CHECK). En `modulo-facturas.js` se ajustó para aceptar `'anulada'` (y seguir aceptando `'cancelada'` por
compatibilidad): badge en gris, filtro "Cancelada" del selector (option value pasó a `anulada`, matchea ambos),
y las etiquetas de estado (pill, campo Estado de la ficha, toast) muestran **"Cancelada"** al usuario aunque el
valor real sea `'anulada'`. Solo visual/UI; no se tocó backend ni otra lógica.

---

## ACTUALIZACIÓN — 2026-07-20 (INVOICE: ocultar SALES TAX / OTHER en cero)

En la plantilla INVOICE (`modulo-facturas.js` → `htmlImpresion`), las filas **SALES TAX** y **OTHER**
del bloque de totales ahora se ocultan cuando su valor es 0; si vinieran distintas de cero
(`f.sales_tax` / `f.other`) se muestran igual que hoy. SUBTOTAL y TOTAL siempre visibles. Solo visual,
nada más tocado. (Hoy esas columnas no existen en `v_facturas`, así que en la práctica siempre se ocultan.)

---

## ACTUALIZACIÓN — 2026-07-20 (logo de marca en TODOS los PDFs)

Se puso `assets/logo-plein.png` (700×213) en todos los PDFs, centralizado en dos helpers compartidos
para no copiar el `<img>`/logo en cada plantilla.

- **Helper DOM (window.print):** `ERP.encabezadoImpresion(titulo, filas)` en `exportar.js` devuelve el
  encabezado con `<img src="assets/logo-plein.png" style="height:48px">` a la izquierda y el título
  (INVOICE / PURCHASE ORDER) + meta a la derecha. Lo usan `modulo-facturas.js` (INVOICE) y
  `modulo-ordenes.js` (PURCHASE ORDER). Ruta relativa, sin base64 ni URL externa.
- **Helper jsPDF:** `exportar.js` → `cargarLogo()` ahora carga `assets/logo-plein.png` (dataURL) y
  `encabezadoPDF()` dibuja el logo (~32px) en vez del texto "Plein Produce LLC". Cubre TODOS los
  "Exportar PDF" de listados (Facturación, Órdenes, Finanzas, Bitácora, CxC, CxP, Tesorería, Embarques,
  Estado de Resultados) y el **Expediente PDF**. Se expone `ERP.logoPdfDataURL` para reuso.
- **Comercial (jsPDF propio):** `modulo-comercial.js` → `construirDoc()` (Cotizaciones y Órdenes del
  módulo comercial) ahora dibuja el logo con `ERP.logoPdfDataURL()` en vez del texto de empresa.
- **CSS de impresión:** en `@media print` se agregó `-webkit-print-color-adjust / color-adjust /
  print-color-adjust: exact` al área de impresión, para que el logo y los fondos de color SALGAN en el
  PDF (el bug clásico de "se ve en pantalla, sale en blanco"). `.inv-logo img` ahora es `height:48px`.

**Archivos tocados:** `exportar.js`, `modulo-facturas.js`, `modulo-ordenes.js`, `modulo-comercial.js`,
`estilos.css`. Solo visual; no se tocó backend/RPCs/contabilidad.

**Cómo probarlo:** imprime (PDF) una factura, una orden de compra, una cotización, el expediente y
cualquier "Exportar PDF" de listado — el logo de Plein debe verse arriba-izquierda en todos.

---

## ACTUALIZACIÓN FASE 3 — 2026-07-18 (módulo Órdenes de Compra) — PENDIENTE DE DEPLOY

Espejo de Facturación para el lado proveedor/CxP. Backend E33. Módulo NUEVO dedicado (el módulo
'comercial' con su pestaña de órdenes se deja intacto; esta es la implementación oficial de Fase 3).

- **`modulo-ordenes.js` (nuevo), ruta `ordenes`, menú "📦 Órdenes de Compra"** (junto a Facturación).
  Consume `v_ordenes_compra`, `v_orden_compra_items`, `v_cxp` (amarre de pago) y los catálogos
  `v_catalogo_admin` (proveedores comerciales) y `v_catalogo_productos`.
- **Lista:** Folio, Fecha, Proveedor, Embarque (carga_folio o "—"), Entrega est., Estado (chip:
  Borrador ámbar / Enviada azul / Confirmada verde / Recibida verde oscuro / Cancelada gris), Ítems,
  Total ($), Vence (rojo si pasó y no está Recibida/Cancelada). Filtros por estado, proveedor y texto;
  export Excel/PDF.
- **Crear:** "+ Nueva orden" → proveedor (combo, solo `es_proveedor` + `clase='comercial'`), moneda
  USD/MXN, entrega estimada, condiciones, notas, **embarque opcional** (combo de cargas), y editor de
  líneas (producto del catálogo por `<select>` o descripción libre, cantidad, unidad, precio unitario;
  importe y total en vivo). → `fn_crear_orden_compra` (NO se manda importe; lo calcula la base). Muestra
  el folio OC-NNNN y abre la ficha. Los días de crédito se heredan del proveedor (no se capturan).
- **Ficha:** encabezado con folio/proveedor/estado/total y **NET dias_credito**. En **Borrador**: editable
  (líneas, entrega, condiciones, notas y **ligar/desligar embarque** con `p_desligar_carga`) vía
  `fn_editar_orden_compra`. Fuera de Borrador: solo lectura + aviso "Solo se edita en Borrador; para
  cambios, cancela y crea otra." Recuadro **Pago (CxP)** de solo lectura (costo/pagado/saldo/vencimiento).
- **Flujo de estado:** botón "Avanzar a <siguiente>" (Borrador→Enviada→Confirmada→Recibida) vía
  `fn_cambiar_estado_orden` con confirmación; "Cancelar orden" (`fn_anular_orden`, **motivo obligatorio**)
  mientras no esté cancelada. Si el backend rechaza una transición, se muestra su mensaje tal cual.
- **PDF:** layout `inv-doc` reutilizado — **PURCHASE ORDER**, folio/fecha/términos/entrega, PROVEEDOR y
  CONDICIONES, tabla de líneas (descripción/cantidad/unidad/precio/importe), TOTAL y notas.
- **Gating:** crear/editar/avanzar/cancelar requieren `puede('capturar')`; rol vista = solo lista/ficha +
  PDF. Todos los catches pasan por `ERP.avisarSiPermiso(e)`.
- **Integración:** en la ficha clásica y en el **Expediente** de embarque (pestaña renombrada
  "Factura y OC") se lista ahora también "Órdenes de compra" del embarque (patrón `montarOrdenesCarga`),
  con salto a la ficha.

**Archivos tocados:** `modulo-ordenes.js` (nuevo), `index.html` (nav+script), `estilos.css`
(`.oc-estado`, `.fact-lineas select`), `modulo-cargas.js` y `modulo-expediente.js` (integración).

**Cómo probarlo (Miguel):** tras `npx vercel --prod`, entra a **Órdenes de Compra**:
1. **Samuel/Miguel (capturar):** "+ Nueva orden" → elige proveedor, agrega líneas (producto o libre) →
   Crear → aparece **OC-0001**; en la ficha edita y **Guarda**; **Avanza** de Borrador→Enviada→…; **Imprime
   PDF** (PURCHASE ORDER); **Cancela** con motivo. Liga/desliga un embarque en Borrador.
2. **José (vista):** ve lista y ficha, imprime PDF, pero sin botones de acción.
3. **Embarque:** abre un embarque (Expediente → pestaña "Factura y OC", o la ficha) y verás sus órdenes.

**Dependencia backend (E33):** `v_ordenes_compra`, `v_orden_compra_items`, `v_cxp` y las RPCs
`fn_crear/editar/cambiar_estado/anular_orden`. Envío por correo (Resend) pendiente de DNS de Miguel.

---

## ACTUALIZACIÓN FASE 3 — 2026-07-18 (módulo Facturación) — PENDIENTE DE DEPLOY

El módulo de facturas se reescribió a su **ruta propia `'facturas'`** con el contrato E32.
El item de menú "🧾 Facturación" ahora apunta a `#/facturas` (antes iba a `#/documentos`). El
componente Storage deprecado `documentos.js` no se tocó; la ruta `'documentos'` ya no se registra
ni se enlaza (nadie la usa).

- **`modulo-facturas.js` (reescrito), ruta `facturas`, título "Facturación".** Consume `v_facturas`
  (columnas E32: `fecha_emision`, `estado` borrador|emitida|cancelada, `total`, `bill_to`, `ship_to`,
  `lineas` jsonb, etc.) y `v_cxc` para el amarre de cobro. Sigue exponiendo `ERP.verFactura`,
  `ERP.montarFacturasCarga`, `ERP.generarInvoiceDesdeCarga`, `ERP.nuevaFactura` (el Expediente los usa).
- **Lista:** Número (o "— borrador"), PO, Cliente, Emisión (DD-mmm-YYYY), Términos, Estado (chip:
  borrador ámbar / emitida verde / cancelada gris), Total ($), y **Cobro** leído de `v_cxc`
  ("Cobrado $X / Falta $Y" + vencimiento en rojo si vencida). Filtros por estado y texto; export Excel/PDF.
- **Crear desde embarque:** "+ Nueva factura" → selector de embarque (folio · PO · cliente · venta),
  **solo embarques sin factura** → `fn_crear_factura(folio)`; si el backend devuelve advertencia
  (cliente sin dirección) se muestra toast sugiriendo capturarla en Directorio Comercial; abre la ficha.
- **Ficha:** edita términos, bill_to, ship_to, comentarios y las líneas (total = suma) vía
  `fn_editar_factura` (el **número NO es editable**; se pasa sin cambiar). Recuadro **Cobro (CxC)** de
  solo lectura (venta / cobrado / saldo / vencimiento) — el estado de pago se lee de CxC, no es manual.
- **Flujo de estado:** borrador → **Emitir** (`fn_emitir_factura`, confirma con el número PP-AAAA-NNNN
  asignado) o **Cancelar** (`fn_cancelar_factura` pidiendo motivo). Emitida → solo **Cancelar**. No hay
  estado "pagada" manual ni re-emitir. Sólo lectura en cancelada.
- **PDF imprimible:** reutiliza el layout `inv-doc` (@media print) — INVOICE + fecha/número/términos,
  BILL TO / SHIP TO, tabla de líneas (mín. 7 filas), totales. Se ve como documento a cliente.
- **Gating (Fase 2):** crear/editar/emitir/cancelar requieren `puede('capturar')` (Samuel puede facturar);
  rol vista (José) = solo lista + Imprimir/PDF, sin botones. Todos los catches de escritura pasan por
  `ERP.avisarSiPermiso(e)` (toast claro si es de permiso; si no, el mensaje del backend tal cual).

**Archivos tocados:** `modulo-facturas.js` (reescrito), `index.html` (nav reapuntado a `facturas`),
`estilos.css` (recuadro `.fact-cxc`). El script `modulo-facturas.js` ya estaba enlazado.

**Cómo probarlo (Miguel):** tras `npx vercel --prod`, entra a **Facturación**:
1. **Samuel/Miguel (capturar):** "+ Nueva factura" → elige un embarque sin factura → se crea en borrador;
   abre la ficha, edita líneas/direcciones, **Guardar**; luego **Emitir** → confirma que aparece el número
   PP-2026-NNNN; **Imprimir / PDF**. En una emitida, **Cancelar** pidiendo motivo (el número queda como hueco).
2. **José (vista):** ve la lista y puede Imprimir/PDF, pero NO ve "+ Nueva factura" ni Guardar/Emitir/Cancelar.
3. **Cobro:** en la lista y en la ficha, la columna/recuadro de cobro refleja lo que dice CxC del embarque.
4. **Expediente de embarque → pestaña Factura:** "Generar factura" sigue funcionando (crea y salta a Facturación).

**Dependencia backend (E32):** `v_facturas`, `v_cxc` y las RPCs `fn_crear/editar/emitir/cancelar_factura`.
Envío por correo (Resend) queda pendiente de DNS de Miguel — no está en esta entrega.

---

## ACTUALIZACIÓN FASE 2 — 2026-07-18 (login real por rol) — PENDIENTE DE DEPLOY

El backend ya valida permisos por rol (JWT en las RPC, E31); esta sesión hace que la UI lo refleje.

- **Gating por rol (transversal).** Tras login se lee `v_mi_perfil` (ya existía en `comun.js` →
  `ERP.puede('capturar'|'editar'|'administrar')`). El header muestra nombre + rol. Se alinearon los botones a
  la capacidad que exige cada RPC:
  - **Tesorería:** el botón "Editar" de un movimiento (`fn_editar_movimiento`) ahora requiere **editar** (antes
    aparecía con captura).
  - **Revisiones Pendientes:** "Responder" (`fn_responder_flag`) requiere **capturar**; "Cerrar flag"
    (`fn_resolver_flag_web`) requiere **editar**. Rol vista no ve ninguno.
  - Aplicar FIFO (`fn_aplicar_fifo`) requiere **editar** — ver checkbox abajo.
  - Alta de embarque / agregar costo / registrar gasto ya estaban en **capturar**.
- **Toast de "Sin permiso".** Nuevo `ERP.avisarSiPermiso(e)` / `ERP.esPermisoDenegado(e)` en `comun.js`: si una
  RPC rechaza con "Sin permiso" o "PERMISO_DENEGADO", se muestra un toast claro en español (con el rol del
  usuario) en vez del error crudo. Aplicado en las rutas de escritura (captura rápida, flags, tesorería,
  cargas cobro/pago y nuevo embarque). El backend sigue siendo la autoridad; esto solo mejora el mensaje.
- **Checkbox "Solo capturar (no aplicar)"** en la captura rápida de movimiento (`captura-rapida.js`): visible
  solo si el usuario **puede editar**. Flujo: llama `fn_capturar_mov`; si el usuario no puede editar **o** marcó
  el checkbox → termina ahí (movimiento SIN aplicar) con toast "…queda pendiente de aplicar por administración";
  si puede editar y NO lo marcó → aplica `fn_aplicar_fifo` y muestra a qué carga(s) se aplicó. La ficha de carga
  (cobros/pagos) hace lo equivalente: un rol captura captura pero no aplica (mensaje claro).
- **Módulo Bitácora (NUEVO).** `modulo-bitacora.js`, entrada de menú "Bitácora" (📜), ruta `bitacora`. Solo
  lectura para todos los roles. Lee `v_bitacora_ediciones` (order `editado_ts` desc, 500 recientes). Columnas:
  Fecha (`DD-mmm-YYYY HH:mm`), Quién (`editado_por`), Tabla, Registro (`registro_id`), Motivo, y un expandible
  **Cambios** que hace un diff campo por campo de `campos_antes` → `campos_despues` (jsonb). Filtros por tabla y
  por texto; export Excel/PDF como los demás módulos.
- **Captura de embarque <2 min.** Se verificó que el formulario existente `nuevaCarga` (botón "+ Nuevo embarque"
  en Embarques) cumple el contrato de `fn_crear_carga` con P.O. obligatorio, combos con texto libre y muestra
  folio + `con_flag`/advertencias. No se reconstruyó (evitar duplicación).

**Archivos tocados:** `comun.js`, `captura-rapida.js`, `modulo-flags.js`, `modulo-tesoreria.js`,
`modulo-cargas.js`, `modulo-bitacora.js` (nuevo), `index.html` (nav+script), `estilos.css`.

**Cómo probarlo (Miguel):** después de `npx vercel --prod`, entrar con cada socio:
1. **José (vista):** no debe ver botones de capturar/editar/aplicar/cerrar/resolver; todo solo lectura; Bitácora sí visible.
2. **Samuel (captura):** ve "+ Nuevo embarque", "+ Movimiento", "Registrar gasto", "Responder" en Revisiones. Al
   capturar un cobro/pago queda **sin aplicar** ("pendiente de aplicar"). No ve "Editar" en Tesorería ni "Cerrar flag".
3. **Miguel (admin):** ve todo; en captura rápida aparece el checkbox "Solo capturar"; sin marcarlo, aplica FIFO.
4. **Bitácora:** abrir el menú "Bitácora", filtrar por tabla, expandir "Cambios" de una fila, exportar Excel/PDF.

**Dependencia backend:** requiere que `v_mi_perfil`, `v_bitacora_ediciones` y las RPCs con validación de rol
existan (confirmado E31). Si `v_bitacora_ediciones` no existiera, la pantalla Bitácora mostraría el error del
backend sin romper el resto.

---

## ACTUALIZACIÓN FASE 1.5 — 2026-07-18 (desplegado)

Se conectaron pantallas a backend que ya existía. Cambios de esta sesión:

- **Pipeline de estados de embarque (solo lectura).** Mapa central de color por estado en `comun.js`
  (`ERP.estadoEmbarque` / `ERP.badgeEstado`; Cerrada=gris, Entregada=verde, En Camino=azul,
  Falta informacion=ámbar, Rechazo=rojo, desconocido=gris). En **Embarques**: chips de filtro por
  estado **con conteo**, y **badge de estado** en cada fila. En el **Expediente**: badge de estado en el
  header. No agrega cambio de estado (eso es Fase 3).
- **Expediente más accesible.** El botón **"＋ Captura y acciones"** ahora es sólido y prominente (primero,
  junto a "Exportar Expediente PDF"). Verificado: desde ahí se llega a agregar costo, cobros/pagos, resolver
  revisión y anular. _(Nota: "editar costo" nunca existió en la ficha clásica; no se perdió nada.)_
- **Panel Finanzas ampliado.** Nuevas secciones, cada una con Exportar Excel/PDF: Balance general (`v_balance`),
  Flujo de caja semanal (`v_flujo_semanal`, con mini-barra), Antigüedad de saldos por cobrar (`v_cxc_aging`,
  resalta filas vencidas), Cuentas por pagar próximas (`v_cxp_proximas`), Rentabilidad por embarque
  (`v_rentabilidad_carga`), y a Márgenes por cliente/producto se les añadió columna **Costo** y export. Las
  vistas nuevas van con `.catch(()=>[])`: si alguna no existiera, esa sección degrada sin romper Finanzas.
- **Deuda marcada (no migrada).** `documentos.js` y `captura.html` llevan comentario
  `DEPRECADO 2026-07-17`. **La migración real sigue pendiente** (§5): `documentos.js` aún se monta en la
  ficha clásica y `captura.html` sigue enlazado en el menú.

El resto del reporte (abajo) describe el estado general; los puntos de arriba lo actualizan donde apliquen.

---

## 1. INVENTARIO DE MÓDULOS

| Archivo | En el menú | Qué hace | Consume (Supabase) | Estado |
|---|---|---|---|---|
| `modulo-inicio.js` | **Inicio** | Tarjetas resumen del día (banco, CxC, CxP, flags, utilidad neta, cargas activas) + cascada de estado de resultados. Todo clicable. | `v_anclas`, `v_deuda_jeams`, `v_estado_resultados_neto`, `v_saldo_cuentas`, `v_carga_detalle` | **VIVO** |
| `modulo-cargas.js` | **Embarques** | Lista de embarques con filtros/semáforo de margen; alta de embarque (`fn_crear_carga`); ficha clásica con captura (costos, cobros/pagos, resolver revisión, anular). El clic abre el **Expediente** (ver abajo). | `v_carga_detalle`, `v_carga_aplicaciones`, `v_carga_costos_det`, `v_catalogo_cuentas`; RPC `fn_crear_carga`, `fn_agregar_costo`, `fn_capturar_mov`, `fn_aplicar_fifo`, `fn_resolver_flag_web`, `fn_anular_carga` | **VIVO** |
| `modulo-expediente.js` | (se abre al tocar un embarque) | Expediente de 4 pestañas: Resumen · Pagos y Cobros · Documentos · Factura. Botón "Captura y acciones" → ficha clásica. | `v_carga_detalle`, `v_carga_aplicaciones`, `v_carga_costos_det`, `v_carga_documentos`, `v_facturas`; tabla `carga_documentos` (INSERT); Storage bucket `documentos-cargas` | **VIVO** (Documentos depende de backend nuevo — ver §5) |
| `modulo-cobranza.js` | **Cuentas por Cobrar** | Saldo por cliente, antigüedad de cartera, rotación (DSO); drill-down por cliente; "+ cobro" en fila; export Excel/PDF. | `v_cxc_cliente`, `v_cxc_aging_resumen`, `v_kpi_rotacion_cobranza`, `v_cxc_detalle_cliente` | **VIVO** |
| `modulo-pagos.js` | **Cuentas por Pagar** | Saldo por proveedor, próximos vencimientos; drill-down; "+ pago" en fila; export. | `v_cxp_proveedor`, `v_cxp_proximas`, `v_cxp_detalle_proveedor` | **VIVO** |
| `modulo-antiguedad.js` | **Antigüedad de saldos** | Pestañas CxC/CxP: cartera vencida vs por vencer, pirámide por contraparte, detalle por carga con fecha de vencimiento. | `v_cxc_aging_resumen`, `v_cxc_aging_cliente`, `v_cxc_aging`, `v_cxp_aging_resumen`, `v_cxp_aging_proveedor`, `v_cxp_aging` | **VIVO** |
| `modulo-tesoreria.js` | **Tesorería** | Saldos por cuenta, flujo semanal/mensual, estado de cuenta bancario con saldo corrido; registrar gasto y movimiento; editar movimiento con bitácora; export. | `v_saldo_cuentas`, `v_flujo_semanal`, `v_flujo_caja_mensual`, `v_estado_cuenta`, `v_bitacora_movimientos`, `v_catalogo_cuentas`, `v_catalogo_admin`, `v_catalogo_beneficiarios_gasto`; RPC `fn_capturar_mov`, `fn_aplicar_fifo`, `fn_editar_movimiento`, `fn_traspaso` | **VIVO** |
| `modulo-finanzas.js` | **Finanzas** | Estado de resultados con drill-down por mes, balance, KPIs de margen, concentración de cartera, presupuesto vs real; export del P&L. | `v_estado_resultados_neto`, `v_balance`, `v_kpi_margen_cliente`, `v_kpi_margen_producto`, `v_kpi_concentracion`, `v_presupuesto_vs_real`, `v_pl_mes_detalle`, `v_gastos_mensual` | **VIVO** |
| `modulo-cierres.js` | **Cierres Contables** | Tabla solo-lectura del avance de cierre mensual (estado, bloqueadores, ingresos, utilidad bruta). | `v_cierre_checklist` | **FUNCIONAL** — depende de que la vista exista con datos (ver §5) |
| `modulo-concentracion.js` | **Concentración de riesgo** | HHI y Pareto por cliente/producto/proveedor. | `v_concentracion_resumen`, `v_concentracion` | **VIVO** |
| `modulo-flags.js` | **Revisiones Pendientes** | Dudas parqueadas: responder (`fn_responder_flag`) y cerrar (`fn_resolver_flag_web`). Badge en el menú. | `v_flags_web`; RPC `fn_responder_flag`, `fn_resolver_flag_web` | **VIVO** |
| `modulo-tareas.js` | **Tareas** | Tablero kanban por área/socio, con vínculos a cotización/orden/embarque; crear/editar/asignar/comentar/cancelar. | `v_tareas`, `v_tareas_resumen`, `v_tarea_comentarios`, `v_cotizaciones`, `v_ordenes_compra`, `v_carga_detalle`, `v_catalogo_clientes`, `v_catalogo_proveedores`; RPC `fn_crear_tarea`, `fn_editar_tarea`, `fn_asignar_tarea`, `fn_comentar_tarea`, `fn_cambiar_estado_tarea`, `fn_cancelar_tarea` | **FUNCIONAL** — uso real no verificable desde el frontend (reemplazo de ClickUp, adopción pendiente) |
| `modulo-catalogos.js` | **Directorio Comercial** | Alta/edición de contrapartes (clase, alias, días crédito, direcciones bill-to/ship-to) y productos. | `v_catalogo_admin`, `v_catalogo_productos`; RPC `fn_alta_contraparte`, `fn_editar_contraparte`, `fn_alta_producto` | **VIVO** |
| `modulo-comercial.js` | **Cotiz. y órdenes** | Cotizaciones y órdenes de compra: alta, PDF con logo, envío por WhatsApp/correo, cambios de estado, anulación. | `v_cotizaciones`, `v_cotizacion_items`, `v_ordenes_compra`, `v_orden_compra_items`, `v_envios`, `v_catalogo_clientes`, `v_catalogo_proveedores`, `v_catalogo_productos`; RPC `fn_crear_cotizacion`, `fn_cambiar_estado_cotizacion`, `fn_anular_cotizacion`, `fn_crear_orden_compra`, `fn_cambiar_estado_orden`, `fn_anular_orden`, `fn_registrar_envio`, `fn_actualizar_estado_envio`, `fn_set_contacto_contraparte` | **FUNCIONAL** — completo, uso real no verificable (posible FUNCIONAL-SIN-USO) |
| `modulo-facturas.js` | **Facturación** | Lista de facturas, alta desde un embarque (`fn_crear_factura`), editor con líneas, impresión/PDF, estados borrador/emitida/anulada. | `v_facturas`, `v_carga_detalle`; RPC `fn_crear_factura`, `fn_editar_factura` | **FUNCIONAL-SIN-USO** probable — recién construido; la serie de numeración de factura está pendiente (Miguel) y seguramente hay 0 facturas reales aún |

### Piezas de soporte (no son módulos del menú)
- `comun.js` — núcleo: cliente Supabase, `q()` (lectura de vistas con caché), `rpc()`, formato (`usd`, `fecha`, `venc`), panel/drawer, `crearCombo`, `toast`, permisos (`ERP.puede`), router. **VIVO / crítico.**
- `app.js` — shell: login, buscador universal (`fn_buscar_universal`), badge de flags (`v_flags_web`), router. **VIVO.**
- `exportar.js` — exportación Excel (SheetJS) y PDF (jsPDF + autotable), y PDF del expediente. **VIVO.**
- `captura-rapida.js` — captura en contexto de movimientos (cobro/pago) desde Tesorería/CxC/CxP (`fn_capturar_mov` + `fn_aplicar_fifo`). **VIVO.**
- `documentos.js` — componente viejo de Storage (bucket `documentos`) usado en la ficha clásica de carga. **DEUDA — ver §5 (sistema de documentos duplicado).**

---

## 2. MÓDULOS OCULTOS O A MEDIAS

- **Expediente de Embarque (`modulo-expediente.js`)** — NO está en el menú (por diseño: se abre al tocar un embarque). Es la pieza central reciente. Miguel debe saber que existe y que el clic en un embarque ya NO abre la ficha vieja, sino el expediente de 4 pestañas.
- **Ficha clásica de carga (`verFichaClasica` en `modulo-cargas.js`)** — quedó **semi-escondida**: hoy es el ÚNICO lugar para *agregar costo*, *registrar cobro/pago sobre un embarque* y *anular*, y solo se llega por el botón **"Captura y acciones"** dentro del expediente. Si alguien no ve ese botón, cree que no se puede capturar.
- **`captura.html`** — página **legacy separada** (no es parte de la SPA), enlazada en el menú como "Capturar movimiento". Tiene sus PROPIOS formularios de captura de movimiento/carga/costo y usa **otro juego de vistas de catálogo** (`v_cat_contrapartes`, `v_cat_productos`, `v_cat_tipos`, `v_cat_conceptos_costo`) distinto al de la SPA (`v_catalogo_*`). Es un camino paralelo y viejo que puede confundir y desincronizarse.
- **Documentos de Storage viejos (`documentos.js`)** — componente completo pero **superado** por la pestaña Documentos del expediente. Sigue montado en la ficha clásica. Dos sistemas de documentos conviviendo (§5).

No hay ningún otro módulo registrado que falte en el menú: los 14 `ERP.registrar(...)` están todos enlazados.

---

## 3. CICLO OPERATIVO (cotización → orden de compra → orden de venta → factura → envío → tarea)

| Eslabón | Estado UI | Detalle |
|---|---|---|
| **Cotización** | **Completa** | `modulo-comercial.js` pestaña Cotizaciones: alta, PDF, envío WhatsApp/correo, estados (Borrador→Enviada→Aceptada/Rechazada/Vencida). |
| **Orden de compra** | **Completa** | Misma pantalla, pestaña Órdenes: alta, PDF, envío, estados (Borrador→Enviada→Confirmada→Recibida). |
| **Orden de venta** | **NO existe** | No hay módulo, pestaña ni RPC de "orden de venta / confirmación al cliente". Es el hueco del ciclo. |
| **Factura** | **Completa (UI), sin uso** | `modulo-facturas.js`: crear/editar/imprimir/estados. Falta la **serie de numeración** (pendiente Miguel) y no está amarrada automáticamente a CxC. |
| **Envío** | **Parcial / ambiguo** | Lo que hay (`v_envios`, `fn_registrar_envio`) es el **envío del documento** (mandar la cotización/orden por WhatsApp/correo), NO el envío/logística del embarque físico. No hay tracking de embarque como tal. |
| **Tarea** | **Completa (UI), uso incierto** | `modulo-tareas.js`: kanban con vínculos a cotización/orden/embarque. |

Además, el **pipeline de estados del embarque** (Cotizado→…→Cerrado, FASE 3 del plan) **no está construido**: el embarque tiene un campo `estado` y una mini-barra (`pintarPipeline`) pero no el flujo completo con responsables/timeline.

---

## 4. DISEÑO

**Sistema visual.** Paleta sobria de ERP financiero: verde bosque `#1E5B3A` (marca/acento), lima `#8DBF3F`,
ámbar `#C98A2D` y rojo `#B3402E` para semáforos, papel `#F6F5EF`, tinta `#14261C`. Tipografía en tres roles:
**Archivo** (títulos, peso 800), **Inter** (cuerpo), **IBM Plex Mono** (números y folios). Componentes
reutilizables consistentes: tarjetas (`.card`, `.tarjeta`), píldoras de estado (`.pill` gris/ámbar/rojo/verde),
botones (`.btn-mini` con variantes peligro/confirmar), formularios (`.form-erp`), avisos inline (`.aviso`
ok/warn/err), pestañas (`.pestanas`), tablas con scroll horizontal (`.tabla-wrap`), combos con autocompletado
(`crearCombo`), toasts, barras de antigüedad, y un **panel lateral (drawer)** para todo el detalle/captura.
Todo número es clicable y lleva a su desglose (drill-down). **Responsive:** el menú lateral colapsa a
hamburguesa en móvil y el drawer ocupa el 100% del ancho; los socios lo abren en celular. **Login:** overlay
centrado con tarjeta (`.login-card`), correo/contraseña por socio (Supabase Auth). La impresión de factura usa
un layout dedicado con `@media print` (solo sale la factura).

**Evaluación honesta.** El núcleo se ve **genuinamente profesional y terminado**: header/menú/login idénticos
en todo, paleta coherente, números monoespaciados, semáforos claros, drill-down parejo y drawers pulidos —
para un ERP interno está por encima del promedio. Lo que se ve **a medio hacer** no es el estilo sino la
**coherencia estructural**: conviven dos sistemas de documentos y dos caminos de captura (la SPA moderna y la
`captura.html` vieja), la captura de costos/anulación quedó escondida detrás de un botón, y módulos recién
horneados (Facturación, Cierres, Tareas) se ven completos pero probablemente vacíos de datos. Es un frontend
bien vestido cuyo riesgo está en la plomería, no en la fachada.

---

## 5. DEUDA Y RIESGOS

1. **Sistema de documentos DUPLICADO.** Coexisten (a) `documentos.js` → bucket `documentos`, vistas
   `v_documentos`/`v_categorias_documento`, RPC `fn_registrar_documento`/`fn_anular_documento` (en la ficha
   clásica); y (b) la pestaña Documentos del expediente → bucket `documentos-cargas`, vista
   `v_carga_documentos`, INSERT directo a `carga_documentos`. Dos backends de documentos para lo mismo. Hay que
   decidir cuál es el oficial y retirar el otro.
2. **Backend nuevo que podría no existir aún** (anotado en `PENDIENTES-BACKEND.md`): la vista
   `v_carga_documentos`, la tabla `carga_documentos`, el **bucket `documentos-cargas`** y la vista
   `v_cierre_checklist`. Si no existen con RLS authenticated, la **pestaña Documentos** del expediente y el
   módulo **Cierres Contables** mostrarán el error del backend (no rompen el resto de la app, degradan solo su
   sección).
3. **Captura contable escondida.** `verFichaClasica` (agregar costo / registrar cobro-pago / anular) solo se
   alcanza por "Captura y acciones" dentro del expediente. Riesgo de que se perciba como "ya no se puede capturar".
4. **`captura.html` legacy** vive en paralelo con distinto set de vistas (`v_cat_*` vs `v_catalogo_*`). Riesgo de
   desincronización y de que Samuel capture por dos caminos distintos.
5. **Dependencia de CDNs** (`index.html`): `supabase-js`, `xlsx`, `jspdf`, `jspdf-autotable`. Sin internet o si
   cae un CDN, se rompen exportaciones (y sin supabase-js, toda la app). No hay copia local.
6. **Exportaciones frágiles por diseño.** `exportar.js` **raspa la tabla visible del DOM** (no los datos crudos):
   exporta solo lo filtrado en pantalla y depende de que la estructura `<thead>/<tbody>` no cambie. Para CxC/CxP/
   Finanzas apunta a "la primera tabla del módulo" (selector implícito) — si se reordena el layout, exporta la
   tabla equivocada.
7. **`modulo-comercial.js` es el de más superficie backend** (9 RPCs + 8 vistas). Si alguna de esas vistas/RPC no
   está, esa pantalla falla. Es también el candidato #1 a FUNCIONAL-SIN-USO.
8. **Facturación sin serie ni amarre a CxC.** El editor guarda, pero la numeración oficial y el enlace factura→CxC
   son pendientes de definición.
9. **Detectores de columna "defensivos".** En varios módulos se detecta la columna por lista de candidatos
   (`ERP.columna([...])`) por si el backend cambia nombres. Los de `v_carga_documentos` y `v_cierre_checklist` ya
   se fijaron a los nombres confirmados (ver CLAUDE.md); el resto sigue tolerante pero eso también esconde
   discrepancias de esquema.
10. **No hay TODO/FIXME sueltos ni pantallas placeholder muertas.** Los mensajes de "no disponible" son fallbacks
    graciosos (p. ej. expediente si el módulo de facturación no cargó), no deuda abandonada.

---

## 6. LO QUE FALTA PARA CADA MÓDULO INCOMPLETO

- **Facturación (`modulo-facturas.js`)** — Definir la **serie/numeración** de factura (backend, Miguel) y amarrar
  la factura emitida a CxC. Después: usarla de verdad (hoy probablemente 0 facturas).
- **Cierres Contables (`modulo-cierres.js`)** — Confirmar que `v_cierre_checklist` existe y se puebla; ya está
  fijado a los nombres de columna reales. Nada más de UI; es solo lectura.
- **Expediente → pestaña Documentos** — Confirmar bucket `documentos-cargas` + tabla `carga_documentos` + vista
  con RLS; luego la **prueba real de subida/descarga por Miguel** (pendiente en el plan).
- **Cotizaciones y órdenes (`modulo-comercial.js`)** — Verificar que todas sus vistas/RPC existan en producción y
  ponerlo en uso real; agregar **Orden de Venta / confirmación al cliente** (hoy no existe).
- **Tareas (`modulo-tareas.js`)** — Completo en UI; falta adopción (reemplazar ClickUp) y validar que las vistas de
  tareas estén pobladas.
- **Ciclo operativo** — Falta el eslabón **Orden de Venta** y el **pipeline de estados del embarque**
  (Cotizado→…→Cerrado) con timeline y responsables (FASE 3 del plan maestro).
- **Deuda transversal** — Unificar el **sistema de documentos** (retirar `documentos.js` viejo o el nuevo) y
  decidir el futuro de **`captura.html`** (integrarla a la SPA o retirarla).

---

_Fin del reporte. Este documento es una foto del código al 2026-07-17; el estado de datos (qué está realmente
poblado y en uso) debe confirmarse contra Supabase._
