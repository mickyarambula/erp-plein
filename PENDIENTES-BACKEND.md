# Pendientes de backend

Cosas que el frontend necesita de Supabase y que **no** se improvisaron aquí.
Miguel: lleva esto a tu sesión de claude.ai con protocolo de gates.

---

## Órdenes de Venta / Sales Orders — pendientes tras C.1 (2026-07-30)

Del módulo nuevo `modulo-ventas.js` (Fase C.1, backend E65/E66 ya consumido):

1. **`fn_editar_so` (posible, si se vuelve necesario):** hoy NO existe edición de encabezado de SO
   — para cambiar cliente/revenue model/params hay que cancelar y recrear. El frontend lo dice
   explícito en la ficha. Si la operación pide editar el encabezado sin recrear, hará falta un
   `fn_editar_so(p_folio, …)` (probablemente COALESCE = "NULL no toca", como los otros `fn_editar_*`).

2. **`programa_id` de una SO — no se puede poblar desde el frontend hoy:** `fn_crear_so` acepta
   `p_programa_id bigint`, pero **ninguna vista expuesta trae el id bigint del programa**
   (`v_programas_comerciales`/`v_cargas_programa`/`v_programa_cargas`/`v_programas_proyeccion` solo
   exponen `codigo`/`etiqueta`, no `id`). Por eso el modal de creación **omite** ese campo y siempre
   manda `p_programa_id = null`. Para ofrecer el vínculo a programa al crear una SO se necesita una
   vista que exponga `id` (bigint) + `etiqueta` (o agregar `id`/`programa_id` a `v_programas_comerciales`).

3. **Siguiente frontend pendiente = UI de Eventos de Carga (C.1b):** integrar en el Expediente los
   Eventos de Carga tipificados (rechazo, reempaque, ajuste de precio, reembolso, reasignación) sobre
   `v_evento_tipos` + `v_eventos_carga` + `fn_registrar_evento_carga` + `fn_anular_evento_carga`
   (verificar firmas en vivo antes de programar, como siempre).

---

## Falta la dirección del productor en v_liquidaciones (2026-07-29)

El PDF de Liquidación ("LIQUIDACIÓN AL PRODUCTOR / ACCOUNT OF SALES") ya usa el membrete
compartido de la familia (mismo header/footer que Invoice/PO/Quote). El bloque "PRODUCTOR" hoy
solo muestra el **nombre** (`v_liquidaciones.productor`) — la vista NO trae dirección, ciudad,
país ni teléfono del productor (a diferencia de `v_documento_po.proveedor_*`, que sí los trae
para el bloque VENDOR). No se inventó ni se dejó texto libre en su lugar.

**Se pide:** si se quiere el mismo desglose que VENDOR (`productor_direccion`, `productor_ciudad`,
`productor_pais`, `productor_tel`), agregarlos a `v_liquidaciones` como columnas aditivas, mismo
patrón que `v_documento_po`/`v_documento_invoice`. Mientras tanto el PDF se queda solo con el
nombre — correcto y no bloqueante para operar.

---

## RESUELTO — variedad ASIGNADA a una carga en v_carga_detalle (abierto 2026-07-28, resuelto 2026-07-28)

`v_carga_detalle` YA expone `variedad_id` y `variedad_nombre` (aditivo al final, mismo patrón que
`cliente_id/proveedor_id/producto_id` de E49) — verificado en vivo (P-058 devuelve
`variedad_nombre='Convencional'`).

Frontend actualizado (`modulo-cargas.js`, Editar carga): el selector de Variedad ahora **precarga**
`d.variedad_id` al abrir el formulario (igual que ya hacía con cliente/proveedor/producto), y el envío
de `fn_set_variedad_carga` pasó de "solo si el usuario tocó el select" a **"solo si el valor final
difiere del inicial precargado"** — ya no hay riesgo de borrado silencioso (el valor actual está a la
vista) y se evitan llamadas innecesarias cuando no cambió nada. Se quitó el aviso de "pendiente de
backend" del formulario. **Ya no hay dependencia pendiente por este punto.**

---

## RESUELTO — Directorio comercial enriquecido (2026-07-28, backend E52)

`fn_alta_contraparte` y `fn_editar_contraparte` YA aceptan los 11 campos de contacto/facturación
(`p_contacto_nombre, p_telefono_whatsapp, p_email, p_razon_social, p_rfc_tax_id, p_email_facturacion,
p_paca_licencia, p_direccion_facturacion, p_direccion_envio, p_ciudad, p_pais`) y la vista
**`v_catalogo_admin` ya los expone** (20 columnas, grant a authenticated, anon cerrado — verificado en
vivo). El frontend ya los captura en el alta, los precarga y edita (NULL = no tocar) en la edición, y los
muestra en la ficha de detalle con botón de correo. **Ya no hay dependencia pendiente por estos campos.**

Con esto queda **desbloqueado** (pendiente de frontend, no de backend) meter dirección/RFC de la
contraparte en el PDF de la cotización (ver nota "PDF" más abajo): las columnas ya existen en la vista.

---

## PENDIENTES DE FRONTEND (NO son de backend) — anotados al cierre de E52 (2026-07-28)

Estos NO requieren nada nuevo de Supabase; son trabajo de frontend/infra que dejamos para después.
Se listan aquí para que el próximo chat los tenga a la vista.

**(a) Envío directo por correo (Resend + dominio) — reemplazar el mailto interino.**
Hoy el botón "Enviar por correo" (Facturación) y el botón de correo de la ficha de contraparte usan
`mailto:` (abre el cliente de correo del usuario y le pide adjuntar el PDF descargado a mano). Es una
solución interina. El objetivo real es envío directo desde el sistema con **Resend** (u otro proveedor)
sobre un **dominio propio verificado** (SPF/DKIM), adjuntando el PDF automáticamente. Requiere: dominio +
verificación DNS, cuenta/API key de Resend guardada como secreto **fuera del frontend** (nunca en el
código público — regla dura), y probablemente una función serverless/edge que reciba el PDF y dispare el
envío. No se puede resolver solo con vistas/RPCs de Supabase; es infra aparte.

**(b) Dirección / RFC de la contraparte en el PDF de la cotización.**
Las columnas ya existen en las vistas tras E52 (`direccion_facturacion`, `rfc_tax_id`, etc. en
`v_catalogo_admin` / `v_catalogo_clientes` / `v_catalogo_proveedores`), así que **ya no hay bloqueo de
backend**. Falta el trabajo de frontend: leer esas columnas al armar la cotización y pintarlas en el
bloque de contraparte del PDF (jsPDF en `modulo-comercial.js`). La nota histórica "PDF" más abajo (que
decía que las vistas no exponían esos campos) queda **superada por esto**.

---

## NOMENCLATURA + EXPEDIENTE + EXPORTACIONES — frontend hecho (2026-07-17)

1) Nomenclatura (solo etiquetas visibles; NO se renombró tabla/columna/archivo/ruta):
   Cargas→Embarques, Cobranza→Cuentas por Cobrar, Pagos→Cuentas por Pagar,
   Flags→Revisiones Pendientes, Catálogos→Directorio Comercial, Invoices→Facturación.
   Nuevo módulo "Cierres Contables" (modulo-cierres.js) SOLO LECTURA sobre v_cierre_checklist
   (mes, estado cerrado/abierto, bloqueadores, ingresos, utilidad_bruta).

2) Expediente de Embarque (modulo-expediente.js): el clic en un embarque abre 4 pestañas
   (Resumen · Pagos y Cobros · Documentos · Factura). ERP.verCarga ahora rutea al expediente;
   la ficha clásica con TODA la captura sigue intacta y accesible desde "Captura y acciones"
   (no se tocó ninguna RPC ni lógica de captura/FIFO). Consume v_carga_detalle,
   v_carga_aplicaciones, v_carga_costos_det, v_facturas.
   Pestaña Documentos consume:
     - vista v_carga_documentos (filtrada por carga_folio)
     - bucket privado de Storage 'documentos-cargas', ruta {carga_folio}/{timestamp}_{nombre}
     - INSERT directo a tabla carga_documentos (carga_folio, tipo, nombre_archivo, storage_path,
       mov_folio, nota). tipo usa el CHECK exacto (orden_compra, orden_venta, factura_proveedor,
       factura_cliente, bol, packing_list, pedimento_aduanal, certificado, comprobante_pago,
       foto_qc, otro). Descarga con createSignedUrl (60 s). REQUIERE que el bucket y la tabla
       tengan RLS authenticated (insert/select por sesión; anon denegado) — confirmar en backend.

3) Exportaciones (exportar.js + SheetJS/jsPDF por CDN cdnjs): botones "Exportar Excel/PDF"
   en Tesorería, Cuentas por Cobrar, Cuentas por Pagar, Embarques y Estado de Resultados;
   y "Exportar Expediente PDF" en el expediente. Todo se arma en el cliente desde las tablas
   visibles / los datos ya cargados; no pide nada nuevo al backend.

Pendiente de confirmar en backend (no bloquea el resto): que v_carga_documentos, la tabla
carga_documentos y el bucket 'documentos-cargas' existan con RLS authenticated, y que
v_cierre_checklist sea SELECT authenticated.

---

## MÓDULO INVOICES + BRANDING — frontend hecho (2026-07-16)

Se activó el módulo "Documentos" (ruta 'documentos', label "Invoices") como facturación
(modulo-facturas.js, NUEVO; documentos.js de Storage se dejó intacto). Consume:
  - v_facturas (lista + editor + ficha de carga).
  - fn_crear_factura(p_carga_folio, p_numero=null) -> (r_id, r_advertencia).
  - fn_editar_factura(p_id, p_numero, p_fecha, p_terminos, p_bill_to, p_ship_to,
    p_lineas jsonb, p_comentarios, p_estado). lineas jsonb [{item,descripcion,qty,precio,total}].
Incluye: lista con pill de estado (borrador gris/emitida verde/anulada roja), "+ Nueva invoice"
(combo de cargas no anuladas), editor con líneas editables (total=qty*precio o directo), botones
Guardar / Marcar emitida / Anular (confirm), y VISTA DE IMPRESIÓN (@media print, sin librerías)
que replica el layout: logo, INVOICE/date/#/terms, BILL TO/SHIP TO, tabla ITEM#/DESCRIPTION/QTY/
UNIT PRICE/TOTAL (mín. 7 filas), SUBTOTAL/SALES TAX 0.00%/OTHER/TOTAL, y caja de comentarios.
En la ficha de carga: botón "Generar invoice" + lista de invoices de esa carga.
Escrituras gated por ERP.puede('capturar'); lectura libre.

Catálogos → edición de contraparte: se agregaron "Dirección de facturación" y "Dirección de envío"
(textareas), cableadas a fn_editar_contraparte(... p_direccion_facturacion, p_direccion_envio) y
leyendo las columnas direccion_facturacion / direccion_envio.

Branding: favicon y logo del header desde assets/icono.png; la impresión usa assets/logo.png.
Sin cambios de backend (RPCs/vistas ya existían).

---

## CAPTURA EN CONTEXTO — frontend hecho (2026-07-14)

Nuevo lanzador reutilizable `ERP.capturarMovimiento(ctx)` (captura-rapida.js): abre el
drawer compartido con el form de cobro/pago y reusa el mismo contrato que la ficha de carga
(fn_capturar_mov + fn_aplicar_fifo; el FIFO distribuye por contraparte). Al guardar cierra el
drawer, refresca el módulo actual SIN navegar (ERP.marcarDatosSucios + cierre de panel →
despachar) y muestra un toast (nuevo ERP.toast) con el folio y las cargas a las que aplicó.
Colocado en:
  - Tesorería: botón "+ Movimiento" en la fila de acciones del header (junto a Registrar gasto).
  - Cobranza (CxC): botón "+ cobro" por fila con contraparte precargada y tipo Cliente.
  - Pagos (CxP): botón "+ pago" por fila con contraparte precargada y tipo Proveedor.
  - Ya existían y se dejaron igual: Cargas "+ Nueva carga" (fn_crear_carga) y la ficha de carga
    "+ Agregar costo" (fn_agregar_costo) / "+ Registrar cobro/pago" (fn_capturar_mov+FIFO).
Todos los botones se ocultan si el rol no puede capturar (ERP.puede('capturar'), del perfil de
sesión); el backend valida igual. Sin cambios de backend: usa RPCs y vistas ya existentes.

---

## PANTALLA FLAGS (responder / cerrar) — frontend hecho (2026-07-13)

La pantalla Flags (modulo-flags.js) se reconstruyó y ahora consume:
  - Vista `v_flags_web` (SELECT authenticated; ya ordenada: sin responder primero, luego
    f_embarque). Dos secciones: "Pendientes de respuesta" (estado_flag='sin_responder') y
    "Respondidos — pendientes de cierre" (estado_flag='respondido'). Cada flag es una tarjeta
    con P.O. grande, folio, proveedor→cliente, estado/modalidad, embarque, venta y costo en USD,
    la nota_revision completa (respeta saltos de línea) y, si existe, la ultima_respuesta
    resaltada con respondio + respuesta_ts.
  - RPC `fn_responder_flag(p_folio, p_respuesta)` — botón "Responder" en cada tarjeta (rol captura).
  - RPC `fn_resolver_flag_web(p_folio, p_resolucion)` — botón "Cerrar flag" con confirmación
    explícita; se oculta a quien no puede editar (ERP.puede('editar')), pero el enforcement real
    lo hace el RPC (los errores del backend se muestran tal cual).
  - El contador del menú (badge junto a "Flags") ahora sale del total de filas de v_flags_web
    (antes salía de v_anclas.flags).
Nada pendiente del backend.

---

## AGING POR VENCIMIENTO REAL (E17) — frontend hecho (2026-07-13)

El backend corrigió el aging: los buckets ahora miden DÍAS VENCIDOS (contra
f_embarque + dias_credito), no antigüedad desde embarque. El frontend ya consume
las columnas nuevas (sin calcular nada en el cliente):
  - Helper compartido `ERP.venc(dias_vencido)` → texto "vencida hace N días" (rojo) /
    "vence en N días" (verde) / "vence hoy" (ámbar). Clases CSS .venc-si/.venc-no/.venc-hoy.
  - Antigüedad de saldos (modulo-antiguedad): cabecera ahora separa CARTERA VENCIDA
    (saldo_vencido) vs POR VENCER (saldo_por_vencer) — NO usa el bucket para el vencido.
    Pirámide ordenada por saldo_vencido DESC con columnas Por vencer / Vencido / % vencido /
    Máx. días venc. (dias_vencido_max). Detalle por carga: columnas Vence (f_vencimiento) y
    Situación (dias_vencido), ordenado por dias_vencido DESC; muestra dias_credito con nota
    de que 15 es provisional. Leyendas aclaran que los buckets miden días VENCIDOS y que
    el tramo 0-30 incluye lo aún no vencido.
  - Pagos (modulo-pagos): "Cola FIFO" → "Próximos vencimientos" desde v_cxp_proximas
    (ya ordenada por vencimiento), con columnas Vence + Situación.
  - Cobranza (modulo-cobranza): la barra de aging aclara días vencidos y su resumen de
    cartera vencida ahora sale de saldo_vencido, no del tramo 90+.
  - Columnas muertas cargas.cxc_ref / cxp_ref: NO se usaban en el frontend (verificado).
Nada pendiente del backend.

---

## HISTORIAL DE CAMBIOS (auditoría de movimientos) — frontend hecho (2026-07-13)

Tesorería → Estado de cuenta ahora consume la vista `v_bitacora_movimientos`
(SELECT authenticated; id, folio, fecha_mov, descripcion_mov, campo, valor_ant,
valor_nuevo, actor, actor_nombre, ts). Solo lectura, sin RPC:
  - Indicador 🕘 discreto junto al folio de cada movimiento con cambios registrados.
  - Click en 🕘 → panel con el historial de ESE folio (ts DESC): fecha-hora, quién
    (actor_nombre), campo, valor_ant → valor_nuevo. valor_ant NULL se muestra como “—”.
  - Nueva sección "Historial de cambios": últimas 100 ediciones (ts DESC), cada fila
    clicable abre el historial del movimiento.
  - El formulario de edición de movimientos ya leía la bitácora desde la tabla cruda
    `movimientos_bitacora`; se migró a `v_bitacora_movimientos` para usar actor_nombre.
Nada pendiente del backend: el contrato de la vista se consumió tal cual.

---

## ANTIGÜEDAD DE SALDOS — frontend hecho (2026-07-13)

Nuevo módulo de SOLO LECTURA "Antigüedad de saldos" (`modulo-antiguedad.js`, tab en el
menú lateral) con 2 pestañas (CxC / CxP). Consume, sin escrituras y sin RPC:
  v_cxc_aging_resumen · v_cxc_aging_cliente · v_cxc_aging      (pestaña CxC)
  v_cxp_aging_resumen · v_cxp_aging_proveedor · v_cxp_aging    (pestaña CxP)
Cabecera: "vencido +90" grande y en rojo (lo primero que se ve) + barra de 4 buckets
  (exigible vs en_flag rayado; en_flag NULL se trata como 0). Tabla pirámide ordenada por
  b_90_mas DESC, columnas de bucket en moneda, filas en rojo cuando pct_90_mas>50, badge
  "en revisión" cuando en_flag>0. Click en fila → cargas desde v_cx?_aging filtrado por
  contraparte (columnas de saldo/bruto/pagado resueltas por nombre en tiempo de ejecución,
  robusto a las diferencias de esquema entre v_cxc_aging y v_cxp_aging).
Nada pendiente del backend: el contrato de las 4 vistas nuevas se consumió tal cual.

---

## CONCENTRACIÓN DE RIESGO — frontend hecho (2026-07-13)

Nuevo módulo de SOLO LECTURA "Concentración de riesgo" (`modulo-concentracion.js`,
tab en el menú lateral). Consume, sin escrituras y sin RPC:
  v_concentracion_resumen -> 3 tarjetas (cliente/producto/proveedor) con HHI grande +
    semáforo por `nivel` (concentrado=rojo, moderado=ámbar, competitivo=verde),
    Top-1/Top-3 % y venta_total de referencia.
  v_concentracion (order=rank.asc) -> tabla por dimensión: rank, entidad, cargas,
    venta (usd()), pct, pct_acumulado; filas resaltadas hasta cruzar 80% (Pareto).
Nada pendiente del backend: el contrato de ambas vistas se consumió tal cual.

---

## TAXONOMÍA DE CONTRAPARTES (clase) — backend LISTO 2026-07-10

contrapartes.clase ∈ {'comercial','operativo','gasto','socio'} (NOT NULL, ya
clasificadas las 57 existentes).
  comercial = el negocio real (fruta): clientes y proveedores de producto
  operativo = servicios que escalan con embarques (flete, aduana, empaque, bróker)
  gasto     = costo fijo/administrativo (software, viáticos, seguros, certificaciones)
  socio     = préstamos/movimientos con los socios (JEAMS Capital, Samuel, Juan)

fn_alta_contraparte(p_nombre, p_clase, p_es_cliente=false, p_es_proveedor=false,
                     p_alias=[], p_dias_credito=NULL, p_nota=NULL)
  p_clase es OBLIGATORIO ahora. Rechaza con mensaje claro si no es uno de los 4 valores.

fn_editar_contraparte(p_id, p_clase=NULL, p_alias=NULL, p_dias_credito=NULL,
                       p_es_cliente=NULL, p_es_proveedor=NULL, p_nota=NULL)
  p_clase es opcional: NULL = no tocar. Mismo patrón que el resto de campos
  (dias_credito sigue con su sentinela -1 = borrar, sin cambios ahí).

Vistas:
  v_catalogo_admin       -> ahora incluye clase (mismas columnas de antes + clase al final)
  v_catalogo_beneficiarios_gasto -> id, nombre, alias, clase — SOLO operativo+gasto.
    Este es el combo para "Registrar gasto" en Tesorería (Bloque 3, próxima tarea).

---

---

---

---

---

## B6.2 — TABLERO DE TAREAS — frontend hecho (2026-07-10)

Módulo `modulo-tareas.js` (nav "Tareas", ruta #/tareas). Tablero kanban
(Pendiente/En proceso/Hecha) + pestaña Canceladas aparte. Consumido tal cual el contrato:
- Vistas `v_tareas`, `v_tarea_comentarios`, `v_tareas_resumen`.
- RPCs `fn_crear_tarea`, `fn_editar_tarea` (sentinelas: ''=limpia vínculo texto, -1=limpia
  contraparte, p_limpiar_fecha), `fn_cambiar_estado_tarea`, `fn_asignar_tarea`,
  `fn_comentar_tarea`, `fn_cancelar_tarea` (admin).
- Permisos verificados con los 3 roles: crear/editar/estado/asignar/comentar = capturar;
  cancelar = admin; vista = solo lectura (ve tarjetas y comentarios, sin controles).
- Vínculos clicables: carga → `ERP.verCarga`, cotización/orden → `ERP.verComercial`
  (abridor global nuevo, expuesto desde `modulo-comercial.js`).

Decisiones (sin acción de backend):
- **Movimiento de estado con botones**, no drag&drop: los socios abren el ERP en celular
  y el arrastre táctil es frágil; el contrato lo permite explícitamente.
- **Vínculo de contraparte**: se muestra como chip (nombre) pero NO navega, porque una
  contraparte puede ser cliente o proveedor y no hay un abridor único no ambiguo. Los
  vínculos de documento (carga/cotización/orden) sí abren su entidad.
- Verificado con arnés (RPCs stubbeados) — no se creó ninguna tarea real (sin sesión con
  credenciales desde este entorno).

Estado B6: **tablero de tareas hecho**.

---

## B5.4 — ENVÍO POR WHATSAPP (wa.me) — frontend hecho (2026-07-10)

En el detalle de cotización/orden (`modulo-comercial.js`): botón **Enviar → WhatsApp**
(rol capturar) y **Correo** deshabilitado ("próximamente, cuando esté Resend"). Panel
**Envíos** leyendo `v_envios` por folio, con "Ver PDF" (re-firma el path) y "Marcar enviado".

Consumido tal cual el contrato B5.1:
- Storage `documentos`: `upload(path, blob, {contentType:'application/pdf', upsert:true})` a
  `envios/{cotizaciones|ordenes}/{folio}.pdf`; `createSignedUrl(path, 604800)` (7 días).
- `fn_registrar_envio` con `p_pdf_url = PATH` (no la URL firmada), `p_destinatario` = solo
  dígitos, `p_mensaje` = texto armado, `p_estado='pendiente'`, `p_proveedor_envio='wa.me'`.
- `fn_actualizar_estado_envio(p_id, 'enviado')` para el marcado manual de wa.me.
- Teléfono desde `v_catalogo_clientes/proveedores.telefono_whatsapp`; si falta, mini-form que
  llama `fn_editar_contraparte(p_telefono_whatsapp)` y reintenta.
- El PDF reusa el generador de B4 (jsPDF → Blob), no se re-implementó.

Estado B5: **wa.me hecho; pendiente correo (Resend)**.

Decisiones/constancias (sin acción de backend):
- **Orden de operaciones**: se registra el envío ANTES de abrir wa.me, para cumplir "si el
  RPC falla, no abrir wa.me". Si el navegador bloquea el popup, el aviso deja un link
  "Abrir WhatsApp" clicable (evita perder el envío ya registrado).
- **Captura de teléfono en el mini-form**: usa `fn_set_contacto_contraparte`
  (`p_id`, `p_telefono_whatsapp`), RPC angosta a nivel **capturar** — resuelto el 10-jul-2026.
  Ya no se usa `fn_editar_contraparte` (admin-only) aquí, así que los capturistas pueden
  registrar el teléfono faltante sin rebote.
- Verificado con arnés (storage/RPC stubbeados) — **no se creó ningún envío real** (sigo sin
  sesión con credenciales desde este entorno). El PDF sí se generó de verdad (Blob de ~6 KB).

---

## B4 — COTIZACIONES Y ÓRDENES — frontend consumió el contrato (2026-07-10)

Módulo `modulo-comercial.js` (nav "Cotiz. y órdenes", ruta #/comercial). Motor genérico
para ambos documentos: captura con líneas dinámicas, listado, detalle, transiciones de
estado, anular, y PDF client-side (jsPDF + autoTable por CDN jsDelivr, carga diferida).

Consumido tal cual el contrato:
- fn_crear_cotizacion(p_cliente_id, p_items, p_moneda, p_vigencia_dias, p_condiciones, p_notas)
- fn_crear_orden_compra(p_proveedor_id, p_items, p_moneda, p_f_entrega_est, p_condiciones, p_notas)
- fn_cambiar_estado_cotizacion / _orden, fn_anular_cotizacion / _orden
- Vistas v_cotizaciones/_items, v_ordenes_compra/_items; dropdowns v_catalogo_clientes/
  proveedores/productos.
- p_items: cada línea manda producto_id (si se eligió del catálogo) O descripcion (texto
  libre), + cantidad, unidad (default 'caja'), precio_unitario. Verificado.
- Permisos: crear/estado → capturar · anular → administrar. Verificado con los 3 roles.

Sin ajustes de backend pendientes. Notas menores (no requieren acción, solo constancia):
- **Productos**: el frontend lee `v_catalogo_productos` (id, nombre), no la tabla `productos`
  directa que mencionaba el contrato. Ambas exponen id+nombre; se usó la vista por consistencia
  con el resto de la app. Si el id de la vista difiere del de la tabla, avísame.
- **Moneda MXN**: la app formatea importes en USD ($) y rotula " MXN" cuando la moneda no es
  USD. No hay conversión de tipo de cambio (no se pidió): cada documento muestra su propio
  importe en su moneda.
- **PDF**: se genera 100% en el navegador (jsPDF), sin backend. Incluye encabezado "Plein
  Produce LLC", tipo+folio, fecha, contraparte, líneas, subtotal/total, condiciones/notas y
  vigencia/vencimiento+entrega. No trae dirección/RFC de la contraparte porque las vistas no
  los exponen; si se quieren en el PDF, harían falta esas columnas.

NOTA DE PRUEBA: la verificación se hizo con arnés (RPCs stubbeados) — **no se creó ningún
documento real** en la base (sigo sin sesión con credenciales desde este entorno). No hay
folios ZZZ-TEST que purgar.

---

## B2 — P&L COMPLETO (utilidad neta) — backend LISTO 2026-07-10

v_estado_resultados_neto (reemplaza a v_estado_resultados en el módulo Finanzas;
la vieja sigue viva, no la borres de otros usos si los hay):
  mes, ingresos, costo_ventas, utilidad_bruta, margen_bruto_pct,
  gastos_operativos, utilidad_operacion, gastos_financieros,
  utilidad_neta, margen_neto_pct
Base contable: bruta devengada por carga (consignación-aware, igual que siempre);
gastos base caja (se reconocen al pagarse). Puede haber meses con ingresos=0 y
solo gastos (jul actual) — la vista los trae, no los filtres.

v_gastos_mensual (drill-down de gastos):
  mes, tipo, grupo ('gasto_operativo'|'gasto_financiero'), gasto (positivo=gasto
  neto, los reembolsos ya restan)

tipos_movimiento ahora tiene columna grupo (6 valores). Los tipos Fletes/Aduanas/
Comision/Materiales de empaque son grupo flujo_cxp: NO son gasto del P&L (liquidan
costo que ya vive en la carga). No los muestres como gasto en ningún lado.

---

## SELECTOR DE CUENTA (p_cuenta) — backend LISTO 2026-07-09

fn_capturar_mov ya acepta p_cuenta (default 'JPM'). Antes solo se enviaba JPM
implícito porque el formulario no tenía selector.

Catálogo para el combo:
   supabase.from('v_catalogo_cuentas').select('*')
   cols: id, nombre, banco, moneda
   (hoy solo 2 filas: JPM y JEAMS)

Al capturar movimiento:
   supabase.rpc('fn_capturar_mov', { ..., p_cuenta: comboCuenta.valor() || 'JPM' })

Si mandas una cuenta que no existe en el catálogo, el RPC rechaza con mensaje claro
("Cuenta "X" no existe en catálogo. Válidas: JEAMS, JPM"), no hace falta validar
en el front más allá de poblar el combo desde v_catalogo_cuentas.

La numeración de folio ya la resuelve el backend solo: JPM sigue su secuencia
normal, cualquier otra cuenta usa folios ≥9001 (sin chocar entre sí).

---

## FASE 3 — DOCUMENTOS (Storage) — backend LISTO 2026-07-09

Bucket privado: documentos (máx 25 MB; pdf, jpg/png/webp, xlsx/docx, csv).
El backend valida tamaño y mime en el upload (rechaza si no cumple).
Ruta sugerida: <entidad>/<entidad_id>/<uuid>-<nombreSaneado>
  ej. carga/P-01/1a2b3c-factura.pdf · contraparte/7/... · movimiento/183/...
Entidades válidas: 'carga' | 'contraparte' | 'movimiento' | 'general'.

FLUJO DE SUBIDA (supabase-js, en este orden):
1) Subir archivo:
   supabase.storage.from('documentos').upload(path, file, { contentType: file.type })
2) Registrar metadato (si falla, borrar el objeto huérfano con .remove([path])):
   supabase.rpc('fn_registrar_documento', {
     p_entidad:'carga', p_entidad_id: folio, p_categoria,
     p_storage_path: path, p_nombre_archivo: file.name,
     p_mime: file.type, p_tamano_bytes: file.size, p_nota })
   -> devuelve { id, entidad, entidad_id, storage_path }

LISTAR (ficha de carga/contraparte/movimiento):
   supabase.from('v_documentos').select('*').eq('entidad','carga').eq('entidad_id', folio)
   cols: id, entidad, entidad_id, entidad_nombre, categoria, storage_path,
         nombre_archivo, mime, tamano_bytes, nota, capturado_por, capturado_ts

DESCARGAR (bucket privado -> URL firmada temporal):
   supabase.storage.from('documentos').createSignedUrl(storage_path, 60)

COMBO DE CATEGORÍAS:
   supabase.from('v_categorias_documento').select('*')   // id, nombre, activo

ANULAR (solo admin):
   supabase.rpc('fn_anular_documento', { p_id })
   (opcional, solo admin: .storage.from('documentos').remove([storage_path]))

PERMISOS (ERP.puede): subir->capturar · descargar->ver · anular/borrar->administrar

---

## Resuelto

- ~~**¿`fn_alta_contraparte` exige al menos un rol? / ¿pueden existir contrapartes sin rol?**~~
  Resuelto y blindado el 10-jul-2026. Esa regla **nunca existió** como CHECK en la base.
  Y ya no importa: `v_catalogo_clientes` / `v_catalogo_proveedores` (las que alimentan el
  selector de "Nueva carga") ahora exigen `clase = 'comercial'` **además** de
  `es_cliente`/`es_proveedor` — defensa en profundidad. Un socio/gasto/operativo con
  `es_proveedor = true` jamás aparece al capturar una carga. Por eso el alta ya no premarca
  proveedor fuera de Comercial: da igual cómo queden esos roles.

- ~~**`p_nota` de `fn_editar_contraparte`: ¿`''` borra o se ignora?**~~ Confirmado el
  9-jul-2026: mandar `''` **sí borra** la nota (queda cadena vacía). El frontend manda la
  cadena tal cual. Efecto lateral menor: editar una contraparte cuya nota era `NULL` la deja
  en `''`. Ambas se ven igual en la tabla.

- ~~**`dias_credito` no se podía borrar.**~~ Era real y Miguel lo arregló:
  `fn_editar_contraparte` acepta ahora un centinela **`p_dias_credito = -1` = borrar**
  (poner `NULL`); `NULL` sigue siendo "dejar igual" y cualquier `n ≥ 0` lo fija.

  Decisión de UX en el frontend: el formulario de edición **nunca manda `NULL`**. Campo vacío
  = "sin crédito definido" = manda `-1`. Así lo que ves en el campo es lo que queda guardado,
  sin memoria oculta; mandar `-1` sobre un campo ya vacío es idempotente. En el **alta** sí se
  manda `null` (es el default de `fn_alta_contraparte`: ahí no hay nada que borrar).

- ~~**¿Las vistas financieras excluyen las cargas anuladas?**~~ Confirmado el 9-jul-2026
  con prueba end-to-end (crear carga → medir → anular → medir), no solo lectura del SQL.

  Filtran `anulado = true` en la misma migración que creó `fn_anular_carga`:
  `v_anclas`, `v_cxc`, `v_cxp`, `v_rentabilidad_carga`, `v_estado_resultados`,
  `v_pl_mes_detalle`, `v_flags_activas`.

  Todo lo que se calcula **encima** de `v_cxc` / `v_cxp` / `v_rentabilidad_carga` hereda
  el filtro (son `SELECT` sobre esas vistas, no sobre `cargas`): `v_cxc_cliente`,
  `v_cxp_proveedor`, `v_cxc_detalle_cliente`, `v_cxp_detalle_proveedor`, `v_balance`,
  `v_kpi_margen_producto`, `v_kpi_margen_cliente`, `v_kpi_rotacion_cobranza`,
  `v_kpi_concentracion`, `v_presupuesto_vs_real`.

  `v_carga_detalle` **no** filtra, a propósito: la ficha necesita poder abrir una carga
  anulada para mostrar su banner. De ahí que Inicio y los totales de la lista de Cargas
  descuenten las anuladas en el frontend — son los dos únicos lugares que calculan
  sobre `v_carga_detalle`.

- ~~**Valores reales de `estado`.**~~ Confirmado el 9-jul-2026: hay CHECK constraint con
  exactamente 6 valores — `Programada`, `En Camino`, `Entregada`, `Cerrada`, `Rechazo`,
  `Falta informacion` (esta última **sin acento**). Los 4 primeros son el pipeline lineal;
  los 2 últimos son de excepción y quedan fuera del pipeline (la ficha los muestra tal cual).
  El selector de "Nueva carga" ofrece los 6, agrupados.

- ~~**`p_egreso`: ¿magnitud o negativo?**~~ Confirmado: la función normaliza el signo sola.
  El frontend manda magnitud positiva. Sin cambios.

- ~~**`p_tipo` de `fn_capturar_mov`.**~~ Confirmado y **corregido**: ya no va en `NULL`.
  Cobro → `'Cliente'`, pago → `'Proveedor'`. `fn_aplicar_fifo` decide por el signo del monto,
  así que el FIFO funcionaba igual con `NULL` — pero `v_kpi_rotacion_cobranza` filtra
  `WHERE m.tipo = 'Cliente'`, y un cobro con tipo `NULL` se aplicaba bien y **desaparecía
  del DSO en silencio**.

- ~~**¿Se puede capturar sobre una carga con flag activa?**~~ Confirmado: sí.
  `fn_agregar_costo` acepta `revision_pendiente = true` y solo devuelve advertencia.
  La decisión de no bloquear en la UI era correcta. Sin cambios.

- ~~**`p_concepto` de `fn_agregar_costo`.**~~ No es texto libre: se valida contra el catálogo
  `conceptos_costo` y cualquier otro valor se rechaza. El formulario es un `<select>` cerrado
  que se llena desde `v_catalogo_conceptos_costo` al abrirlo. **Ya no hay constante en el
  código**: si el catálogo cambia en la base, el frontend lo refleja solo.

- ~~**Catálogos de cliente / proveedor / producto.**~~ `v_catalogo_clientes`,
  `v_catalogo_proveedores`, `v_catalogo_productos` y `v_catalogo_conceptos_costo` existen y
  alimentan el formulario de "Nueva carga". Los combos buscan por `nombre` y por cualquier
  entrada de `alias`, pero mandan al RPC **el nombre canónico** — así se evitan las flags de
  "contraparte sin resolver". `dias_credito` está disponible en las vistas de clientes y
  proveedores; se usará en la **Fase 4 (cotizaciones)**, no antes.

- ~~**Confirmar el esquema de las vistas de drill-down.**~~ Confirmado el 9-jul-2026.
  Columnas reales, ya cableadas en el frontend con filtro server-side (`col=eq.<valor>`):
  - `v_pl_mes_detalle`: `mes, folio, po, cliente, origen, ingreso, costo` → Finanzas filtra por `mes`
  - `v_cxc_detalle_cliente`: `folio, po, cliente, estado, f_embarque, dias, ingreso_venta, cobrado, saldo_cxc, revision_pendiente` → Cobranza filtra por `cliente`
  - `v_cxp_detalle_proveedor`: `folio, po, proveedor, estado, f_embarque, costo_total, pagado, saldo_cxp, revision_pendiente` → Pagos filtra por `proveedor`

  Ya no se traen las vistas completas ni se adivinan columnas. El helper genérico
  `ERP.detallePor()` (en `comun.js`) queda **solo como red de seguridad** por si en el
  futuro llega otra vista sin documentar.

- ~~**Verificar `fn_buscar_universal` en producción.**~~ Confirmado funcionando contra
  datos reales el 9-jul-2026.

---

## Nota sobre nombres con caracteres especiales

`ERP.eq()` en `comun.js` entrecomilla el valor del filtro PostgREST **solo cuando
contiene caracteres reservados** (`,` `.` `:` `(` `)` `"`). Para texto normal —la mayoría
de los nombres, incluidos los que llevan espacios— manda el valor plano.

El espacio **no** es reservado en PostgREST: entrecomillar siempre rompía el filtro y
devolvía 0 filas en silencio (bug encontrado el 9-jul-2026 con `PAPAYAS AND MORE LLC`,
que tenía 24 cargas y $396,391.57 y aparecía como "0 cargas con saldo").

Si el backend introduce nombres con comas, puntos o paréntesis, siguen funcionando.

---

---

## Pendiente condicional — solo si Miguel lo pide tras verlo en producción

**Filtro "con carga / gastos generales" en el Estado de cuenta.**

`v_estado_cuenta` de JPM tiene 216 movimientos, de los cuales **147 (68%) no llevan carga
asociada** — son gastos generales legítimos (nómina, cargos bancarios, administrativos),
verificado contra la base el 9-jul-2026. No es un hueco de datos.

Consecuencia de diseño: la columna *Aplicado a* muestra `sin carga` en gris para la mayoría
de las filas. El gris se pensó como estado secundario y resultó ser el mayoritario.

**No construir todavía.** Miguel lo ve primero en producción y decide con ojos reales.
Si el gris estorba, la solución acordada es un chip de filtro
(`Con carga` / `Gastos generales` / `Todos`) en la barra de filtros del estado de cuenta,
**no** cambiar el estilo del texto gris.

---

## INICIO — utilidad neta (2026-07-11)

Inicio cableado a `v_estado_resultados_neto` (utilidad neta, esquema grupo/tipo).
Headline cae a último mes con ingresos≠0. `pct()` global arreglado (null→'—', menos
tipográfico). Backend sin cambios.

Detalle: el hero muestra la utilidad neta del mes en curso solo si tiene ingresos; un mes
solo-gasto (jul-2026: ingresos=0) no es representativo, así que cae al último mes con
ingresos (jun-2026, etiquetado por nombre). La cascada sigue mostrando todos los meses,
incluido julio. Cascada = mismo esquema/convención de signos que Finanzas — candidato a
DRY futuro (hoy duplicado a propósito para no tocar Finanzas, que funciona).

---

## EDICIÓN DE MOVIMIENTOS — frontend hecho (2026-07-11)

El frontend de edición ya consume `fn_editar_movimiento` (+ tabla `movimientos_bitacora`).
Botón "Editar" por fila en el Estado de cuenta de Tesorería (rol capturar; oculto para
vista; no aparece en movimientos anulados). Formulario en el panel:
- Precarga fecha, tipo (select desde `tipos_movimiento.tipo`), contraparte (combo desde
  `v_catalogo_admin`, resuelto por nombre → id), monto con toggle Ingreso/Egreso, descripción,
  nota. Read-only: folio (int) y cuenta_id.
- Envía el registro completo: Ingreso → p_ingreso=abs, p_egreso=0; Egreso → p_egreso=−abs,
  p_ingreso=0. Nunca ambos.
- `MOV_CON_APLICACIONES`: admin → confirm → reintenta con `p_forzar=true`; no-admin → bloqueo.
- Toast con `r_cambios`; si `r_advertencia`, aviso adicional. Errores mapeados por prefijo.
- Panel "Historial de cambios" desde `movimientos_bitacora` (campo | antes → después | actor | fecha).

Notas de esquema:
- `v_estado_cuenta.folio` es **int** (la llave del movimiento).
- `v_estado_cuenta` ya expone **`contraparte_id`** (int, nullable). El combo del formulario
  selecciona por id directo (localiza el item con `id === mov.contraparte_id` en la lista de
  `v_catalogo_admin`); ya **no** se adivina por nombre. `contraparte_id` NULL → combo vacío,
  el usuario elige y el RPC valida (hay 3 movimientos vigentes sin contraparte, p.ej. folio 313).

Verificado con arnés — sin sesión con credenciales desde este entorno, no se editó ningún
movimiento real.

---

## Módulo Proyectos — altas que quedan por chat (2026-07-24, E42/E43)

RESUELTO: `fn_asignar_id_v7(p_folio, p_id_v7, p_nota)` ya existe (E42/E43); la captura inline de id_v7
en "Datos faltantes" ya la consume. Ya no es un pendiente.

YA EXISTEN EN BACKEND — FALTA CONSUMIRLOS DESDE LA UI (E43 los agregó después del frontend inicial):
- **fn_crear_proyecto** — alta de proyectos (la ficha aún no la usa; hoy se siembran por chat).
- **fn_crear_contrato** — alta de contratos de entrega dentro de un proyecto.
- **fn_editar_presupuesto** — editar una línea de presupuesto ya capturada.
- **fn_eliminar_presupuesto** — borrar una línea de presupuesto.
  (Hoy la ficha de Proyectos solo captura con `fn_capturar_presupuesto` y lista; no edita/borra ni da altas.)

---

## FRONTEND PENDIENTE cuando E44 agregue la modalidad 'comision' (2026-07-24, solo aviso)

Cuando el backend (E44) modele la tercera modalidad **`comision`** (Plein no compra, solo cobra comisión;
COSTO 0 / MARGEN 100% correctos — ver PLAN-MAESTRO "Modalidades de negocio"), el frontend deberá:
- Mostrarla como modalidad en **Embarques** (lista/badge), en el **Expediente** y en los **filtros**.
- Ofrecerla en el `<select>` de modalidad del alta de carga (hoy solo margen_fijo/consignación).
- **Revisar que los cálculos de margen NO la traten como anomalía** (hoy `v_placeholders` la marca falso
  positivo "COSTO 0 – margen 100%" y bloquea cierres; una vez modelada, dejar de alertarla).
NO implementar ahora: esperar el contrato de datos de E44.

---

## "Editar embarque" (fn_editar_carga) — frontend hecho con workaround (2026-07-27)

`fn_editar_carga(p_folio, p_motivo, p_po, p_f_embarque, p_ingreso_venta, p_modalidad, p_estado,
p_cliente_id, p_proveedor_id, p_producto_id, p_nota_revision, p_forzar)` recibe **ids** de
cliente/proveedor/producto (COALESCE(param, actual) = NULL no toca), pero **`v_carga_detalle` NO
expone `cliente_id`/`proveedor_id`/`producto_id`** — solo los nombres (`cliente`, `proveedor`,
`producto`).

**Workaround aplicado en `modulo-cargas.js` (`abrirEditarCarga`/`armarPayloadEditarCarga`):** el
combo de cada campo se preselecciona por NOMBRE (`valorInicial`, igual que en cualquier otro combo
de la app) y "¿cambió?" se decide comparando el nombre normalizado (`ERP.norm`) contra el original,
no el id — solo se manda `p_cliente_id`/`p_proveedor_id`/`p_producto_id` cuando el combo tiene una
selección explícita Y esa selección difiere en nombre de la actual. Si el combo queda vacío (por
ejemplo porque el nombre guardado no calza exacto con ningún ítem del catálogo), se manda `null`
(no tocar) — nunca se adivina un id.

**Pedido:** agregar `cliente_id`, `proveedor_id`, `producto_id` a `v_carga_detalle` (al final, para
no romper el contrato). Con eso, el frontend puede comparar por id directamente y ya no depende de
que el nombre calce exacto contra el catálogo — hoy funciona, pero es un rodeo, no la solución
limpia.

**✅ ENTREGADO por backend (E49, 2026-07-28):** `v_carga_detalle` ya expone `cliente_id`,
`proveedor_id`, `producto_id` al final (pasó de 44 a 47 columnas, aditivo). **Ahora es un pendiente
de FRONTEND, no de backend:** migrar `abrirEditarCarga`/`armarPayloadEditarCarga` para comparar y
mandar por id en vez de por nombre normalizado. No urge (el workaround funciona); hacerlo cuando se
toque esa zona. Anotado en PLAN-MAESTRO.md → SIGUIENTE E50.

---

## Bloque de empresa Plein en los documentos impresos — faltan 2 claves de config (2026-07-28)

Al unificar el estándar visual de los documentos (INVOICE/PO/settlement), el encabezado ahora tiene
un **bloque de empresa a la izquierda** (nombre + dirección + contacto). Hoy solo se muestra el
**nombre** ('Plein Produce LLC', constante en `exportar.js`); la **dirección y el contacto NO existen**
ni en el código ni en `v_config`, y NO se inventan (misma política que la leyenda PACA).

**Pedido:** agregar a la tabla de config (la que expone `v_config`) las claves:
- `empresa_direccion` → dirección legal de Plein Produce LLC (la que va en el encabezado de los docs).
- `empresa_contacto` → tel / correo / web para el encabezado.
- (opcional) `empresa_nombre` → si el nombre legal para documentos difiere de 'Plein Produce LLC'.

El frontend YA las consume: `ERP.empresaImpresion()` lee `v_config` filtrando esas 3 claves y el
encabezado se auto-completa en cuanto existan (sin cambio de frontend). Se editarán desde la futura
pantalla de Ajustes (con `fn_set_config`, ya anotado como futuro).

**Nota de assets:** el brief mencionaba `mainlogo_1.png` como logo, pero **ese archivo no está en el
repo** — solo `assets/logo-plein.png` (el que ya usaban todos los documentos) y `assets/logo.png`.
Si el logo oficial de marca es otro, subirlo a `assets/` y cambiar la ruta en `encabezadoImpresion`
(`exportar.js`, una línea).
