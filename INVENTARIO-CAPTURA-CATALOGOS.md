# Inventario — Captura, Catálogos y Dropdowns (ERP Plein frontend)
_Generado 2026-08-09 por Claude Code, leyendo el repo en vivo. Documento de solo lectura para coordinar con el chat de backend — no se tocó ningún archivo de código al generarlo._

Convenciones usadas abajo:
- **RPC-fed** = el picker lee una vista (`q('v_...')`) o una RPC de catálogo en vivo.
- **Hardcoded** = las opciones son un array/objeto de JS fijo en el archivo, sin vista/tabla que lo respalde.
- Cuando un picker es `ERP.crearCombo(...)`, el "filtro exacto" es el string que se pasa a `q('vista', filtro)`, o "sin filtro" si se trae la vista completa y se filtra en el cliente (se anota cómo).

---

## 1) CAPTURA — cada botón/panel de captura

### Tesorería (`modulo-tesoreria.js`)

| Panel | Función | Dropdowns/pickers | RPC al guardar |
|---|---|---|---|
| **+ Movimiento** (cobro/pago) | `captura-rapida.js` → `capturarMovimiento(ctx)` (compartido, se abre también desde Cobranza/CxC y Pagos/CxP con `{modo, contraparte}`) | Contraparte: `crearCombo`, `q('v_catalogo_admin','&order=nombre.asc')` sin filtro adicional · Cuenta: `crearCombo`, `q('v_catalogo_cuentas','&order=id.asc')` sin filtro · Tipo: `<select>` hardcoded (cobro/pago) | `fn_capturar_mov({p_fecha,p_descripcion,p_ingreso,p_egreso,p_contraparte,p_tipo,p_nota,p_cuenta})`, luego opcional `fn_aplicar_fifo({p_mov_folio})` |
| **+ Registrar gasto** | `modulo-tesoreria.js` → `formGasto()` (fix E104) | Beneficiario: `crearCombo` (`permitirNuevo:true`), `q('v_catalogo_beneficiarios_gasto','&order=nombre.asc')` **sin filtro de clase en la query** — se filtra en cliente según Tipo (`beneficiariosParaTipo()`: Sueldo→recibe_pagos=true; Viaticos→recibe_pagos=true OR clase∈(gasto,operativo); otro→clase∈(gasto,operativo)) · Tipo de gasto: `<select>` **hardcoded** `TIPOS_GASTO` (7 valores) · Cuenta: `crearCombo`, `v_catalogo_cuentas` sin filtro | `fn_capturar_mov({p_fecha,p_descripcion,p_egreso,p_contraparte,p_tipo,p_cuenta,p_nota})` |
| **Aplicar a carga** (dentro de Editar movimiento) | `modulo-tesoreria.js` → `formAplicarHtml()`/`guardarAplicacion()` | Carga: `crearCombo`, `q('v_carga_detalle')` sin filtro en query — filtrado en cliente por contraparte del movimiento (cliente si Cobro, proveedor si Pago) + toggle "Ver todas" | `fn_aplicar_a_carga({p_mov_folio,p_carga_folio,p_monto,p_nota})` |
| **Editar movimiento** | `modulo-tesoreria.js` → `editarMovimiento()`/`guardarMovimiento()` | Contraparte: `crearCombo`, `q('v_catalogo_admin','&order=nombre.asc')` sin filtro · Tipo: `<select>` RPC-fed, `q('v_cat_tipos','&order=tipo.asc')` · Modo (ingreso/egreso): hardcoded 2 valores | `fn_editar_movimiento({p_folio,p_fecha,p_tipo,p_contraparte_id,p_ingreso,p_egreso,p_descripcion,p_nota,p_forzar})` |
| **Anular movimiento** (D-119, E100) | `modulo-tesoreria.js` → `anularMovimiento()` | Sin dropdown — `confirm` + `prompt` de motivo | `fn_anular_movimiento({p_folio,p_motivo})` |

### Tesorería / Proyectos (`captura-rapida.js`)

| Panel | Función | Dropdowns/pickers | RPC al guardar |
|---|---|---|---|
| **+ Anticipo a productor** | `capturarAnticipoProductor(ctx)` | Proyecto: `<select>` RPC-fed, `q('v_proyectos','&estado=eq.activo&monto_linea=gt.0&order=codigo.asc')` · Cuenta: `crearCombo`, `v_catalogo_cuentas` sin filtro · Origen del fondeo: `<select>` hardcoded (—/Propio/Socio) · Fondeador (solo si origen=Socio): input texto + `<datalist>` sugerido desde `q('v_deuda_socios','&order=socio.asc')` filtrado a `clase='socio'` en cliente (texto libre permitido) | `fn_anticipo_productor({p_proyecto,p_productor,p_monto,p_cuenta,p_fecha,p_descripcion,p_nota,p_origen_fondeo,p_fondeador})` |
| **+ Aportación de socio** (D-122, E101) | `capturarAportacionSocio(ctx)` — botones en Tesorería y en ficha de Proyecto | Socio: input texto + `<datalist>` desde `v_deuda_socios` (clase='socio', texto libre) · Naturaleza: `<select>` hardcoded `NATURALEZA_AP` (3 valores) · Cuenta: `crearCombo`, `v_catalogo_cuentas` sin filtro · Proyecto (referencia opcional): `<select>` RPC-fed, `q('v_proyectos','&order=codigo.asc')` sin filtro | `fn_registrar_aportacion_socio({p_socio,p_monto,p_naturaleza,p_cuenta,p_fecha,p_proyecto,p_descripcion,p_nota})` |

### Cargas (`modulo-cargas.js`)

| Panel | Función | Dropdowns/pickers | RPC al guardar |
|---|---|---|---|
| **+ Nueva carga** | `nuevaCarga()` | Cliente/Proveedor: `crearCombo` (`permitirNuevo:true`), `catalogo('v_catalogo_clientes')`/`catalogo('v_catalogo_proveedores')` (= `&order=nombre.asc`, sin más filtro) · Producto: `crearCombo` (`permitirNuevo:true`), `catalogo('v_catalogo_productos')` · Variedad: `<select>` RPC-fed según producto elegido (`v_catalogo_variedades`) · Programa: `<select>` RPC-fed, `q('v_programas_comerciales','&order=etiqueta.asc')` · Estado: `<select>` RPC-fed vía `ERP.catalogoEstados()` (cache de `v_estados_carga`+`v_estado_transiciones`, cargado 1 vez al login) · Modalidad: `<select>` **hardcoded** `MODALIDAD_EDIT` (3 valores, CHECK constraint) · Responsable: `<select>` RPC-fed, `q('v_socios_asignables','&order=socio_codigo.asc')` | `fn_crear_carga({...})` + luego opcional `fn_asignar_responsable` y `fn_set_variedad_carga` |
| **Editar embarque** | `abrirEditarCarga()`/`guardarEditarCarga()` | Mismos combos Cliente/Proveedor/Producto (`permitirNuevo:false` aquí) · Modalidad/Estado igual que arriba | `fn_editar_carga({...})` + opcional `fn_set_variedad_carga` |
| **+ Agregar costo** | `abrirFormCosto()`/`guardarCosto()` | Concepto: `<select>` RPC-fed, `catalogo('v_catalogo_conceptos_costo')` (solo nombres, sin indicar activos/inactivos explícitamente en este picker) | `fn_agregar_costo({p_carga_folio,p_concepto,p_monto,p_nota})` |
| **Editar costo** (D-118, E100-fix3) | `abrirFormEditarCosto()`/`guardarEditarCosto()` | Concepto: `<select>` RPC-fed, mismo catálogo + concepto actual garantizado como opción aunque esté fuera del catálogo activo | `fn_editar_costo({p_id,p_motivo,p_concepto,p_monto,p_nota})` (NULL=no tocar) |
| **Eliminar costo** | `confirmarEliminarCosto()`/`eliminarCosto()` | Sin dropdown — `confirm`+`prompt` | `fn_eliminar_costo({p_id,p_motivo})` |
| **+ Registrar cobro/pago** (dentro de ficha de carga) | `abrirFormMov()`/`guardarMov()` | Cuenta: `crearCombo`, `v_catalogo_cuentas` sin filtro | `fn_capturar_mov({...})` + `fn_aplicar_fifo` |
| **Capturar venta (liquidar consignación)** | `abrirFormLiquidar()` | Estado final: `<select>` RPC-fed (subset de `ERP.catalogoEstados()`) | `fn_liquidar_consignacion({p_folio,p_ingreso_real,p_resolucion,p_estado_final})` |
| **Cambiar estado** | `abrirCambiarEstado()` | Transición destino: `<select>` RPC-fed, `ERP.transicionesDisponibles(estado)` (deriva de `ERP.catalogoEstados()`) | `fn_mover_estado_carga({p_folio,p_estado,p_nota})` |
| **Anular carga** | `abrirFormAnular()` | Sin dropdown — motivo obligatorio | `fn_anular_carga({p_folio,p_motivo})` |
| **Resolver flag** | (inline en ficha) | Sin dropdown — textarea | `fn_resolver_flag_web({p_folio,p_resolucion})` |
| **Registrar evento** | `abrirRegistrarEvento()` | Tipo de evento: `<select>` RPC-fed, `q('v_evento_tipos','&order=orden.asc')` · Contraparte (según tipo): `crearCombo`, `q('v_catalogo_admin','&order=nombre.asc')` · SO destino (según tipo): `crearCombo`, `q('v_sales_orders')` | `fn_registrar_evento_carga({...})` |
| **Anular evento** | (inline) | — | `fn_anular_evento_carga({p_id,p_motivo})` |
| **Asignar responsable** | `montarResponsable()` | Responsable: `<select>` RPC-fed, `v_socios_asignables` (cache `_sociosCache`) | `fn_asignar_responsable({p_folio,p_socio,p_nota})` |

### Proyectos (`modulo-proyectos.js`)

| Panel | Función | Dropdowns/pickers | RPC al guardar |
|---|---|---|---|
| **+ Proyecto** | `nuevoProyecto()` | Productor: `crearCombo`, `q('v_catalogo_proveedores','&order=nombre.asc')` · Fondeador: `crearCombo`, `q('v_catalogo_admin','&order=nombre.asc')` · Fuente de fondeo: `<select>` **hardcoded** `FONDEO` (4 valores) · Costo financiero: `<select>` **hardcoded** `COSTOFIN` (4 valores) | `fn_crear_proyecto({...})` |
| **Editar proyecto** | `editarProyecto()` | Estado: `<select>` **hardcoded** (`activo`/`cerrado`/`cancelado`, literal inline) | `fn_editar_proyecto({p_codigo,p_estado,p_tasa_anual,p_tasa_vigencia_desde,p_precio_valuacion_especie,p_nota,p_motivo})` (diff: NULL=no tocar) |
| **Ajustar línea** (D-120, E101) | `ajustarLinea()` | Sin dropdown | `fn_ajustar_linea_proyecto({p_codigo,p_nueva_linea,p_motivo})` |
| **+ Registrar movimiento de línea** | `registrarMovLinea()` | Tipo: `<select>` **hardcoded** `TIPOS` (6 valores: disposicion/recuperacion/valuacion_especie/interes/ajuste_cargo/ajuste_abono) | `fn_registrar_amortizacion({p_proyecto,p_tipo,p_monto,p_fecha,p_movimiento_folio,p_carga_folio,p_nota})` |
| **+ Línea de presupuesto** | `capturarPresupuesto()` | Categoría: `<select>` RPC-fed, `q('v_cat_presupuesto','&order=orden.asc')` · Absorbe: `<select>` **hardcoded** `ABSORBE` (4 valores) | `fn_capturar_presupuesto({...})` |

### Catálogos (`modulo-catalogos.js`) — ver también sección 2

| Panel | Dropdowns/pickers | RPC |
|---|---|---|
| **+ Nuevo cliente/proveedor/beneficiario/socio** (`formNueva()`) | Clase: `<select>` hardcoded 4 valores (`CLASES`, = CHECK constraint) | `fn_alta_contraparte({p_nombre,p_clase,p_es_cliente,p_es_proveedor,p_recibe_pagos,p_alias,p_dias_credito,p_nota,...extendidos})` |
| **Editar contraparte** (`formEditar()`) | Clase: mismo `<select>` | `fn_editar_contraparte({...})` (P1 D-125..128, gate `capturar`) |
| **+ Nuevo producto** / **+ Variedad** | — | `fn_alta_producto({p_nombre,p_codigo_item})` / `fn_alta_variedad({p_producto_id,p_nombre})` |
| **+ Nuevo concepto** / **Editar concepto** (P2, E103) | Estado: checkbox Activo/Inactivo | `fn_alta_concepto_costo({p_nombre})` / `fn_editar_concepto_costo({p_id,p_nombre,p_activo})` |
| **+ Nueva cuenta de banco** / **Editar cuenta** (P2, E103) | — (tipo fijo `'banco'`, nunca se pregunta) | `fn_alta_cuenta({p_id,p_nombre,p_banco,p_moneda,p_tipo:'banco'})` / `fn_editar_cuenta({p_id,p_nombre,p_banco,p_moneda})` |

### Ventas / Comercial / Programas

| Panel | Archivo/función | Dropdowns/pickers | RPC |
|---|---|---|---|
| **+ Nueva orden de venta** | `modulo-ventas.js` → `nuevaVenta()`/`crearSO()` | Cliente: `crearCombo`, `q('v_catalogo_clientes','&order=nombre.asc')` · Revenue Model: `<select>` RPC-fed, `q('v_revenue_models','&order=orden.asc')` filtrado a `activo!==false` en cliente · Programa (opcional): `<select>` RPC-fed, `q('v_programas_comerciales')` sin filtro en query, filtrado por cliente en cliente · Moneda: `<select>` **hardcoded inline** (USD/MXN) | `fn_crear_so({p_cliente_id,p_revenue_model_id,p_customer_po,p_cotizacion_folio,p_programa_id,p_moneda,p_dias_credito,p_incoterm,+4 params de fórmula,p_nota})` |
| **Asignar carga a SO** | `modulo-ventas.js` → `abrirAsignarCarga()` | Embarque: `crearCombo`, `q('v_carga_detalle')` sin filtro, cliente-filtrado a `!anulado` | `fn_asignar_carga_so({p_so_folio,p_carga_folio,p_cajas_asignadas,p_precio_caja,p_nota})` |
| **+ Nueva cotización** / **+ Nueva orden de compra** | `modulo-comercial.js` → `formNuevo()` (motor genérico `TIPOS`) | Cliente/Proveedor: `crearCombo`, `q('v_catalogo_clientes')`/`q('v_catalogo_proveedores')` · Producto por línea: `crearCombo` (`permitirNuevo:true`), `q('v_catalogo_productos','&order=nombre.asc')` · Moneda: `<select>` **hardcoded inline** (USD/MXN) | `fn_crear_cotizacion({...})` / `fn_crear_orden_compra({...})` |
| **Mini-form teléfono faltante** | `modulo-comercial.js` → `formTelefono()` | — | `fn_set_contacto_contraparte({p_id,p_telefono_whatsapp})` |
| **+ Nuevo programa** / **Editar programa** | `modulo-programas.js` → `pintarFormPrograma()` | Cliente/Proveedor: `crearCombo`, `catalogo('v_catalogo_clientes'/'v_catalogo_proveedores')` · Producto: `crearCombo` (`permitirNuevo:true`), `catalogo('v_catalogo_productos')` + checklist multi-producto · Modalidad: `<select>` **hardcoded** `MODALIDAD_LBL` (5 valores) · Ingreso base: `<select>` **hardcoded inline** (pct_venta/usd_caja/por_definir) · Frecuencia unidad: `<select>` **hardcoded** `FREC_UNIDAD_LBL` · Vía: `<select>` **hardcoded** `VIA_LBL` · Término con proveedor: `<select>` **hardcoded** `TERMINO_LBL` · Estado: `<select>` **hardcoded inline** (activo/por_arrancar) | `fn_crear_programa({...})` / `fn_editar_programa({...})` |
| **Ligar/Desligar embarque a programa** | `modulo-programas.js` | — | `fn_ligar_carga_programa({p_folio,p_codigo,p_nota})` |

### Facturas / Órdenes / Liquidaciones

| Panel | Archivo/función | Dropdowns/pickers | RPC |
|---|---|---|---|
| **+ Nueva factura** | `modulo-facturas.js` → `nuevaFactura()` | Embarque: `crearCombo`, `q('v_carga_detalle')` sin filtro, filtrado en cliente a `!anulado` y sin factura ya emitida | `fn_crear_factura({p_carga_folio})` |
| **Factura desde Orden de Venta** | `modulo-facturas.js` → `nuevaFacturaDesdeSO()` | SO: `crearCombo`, `q('v_sales_orders')` filtrada a `estado∈(Confirmada,Cerrada)` en cliente | `fn_crear_factura_desde_so({p_so_folio,p_numero})` |
| **Editar factura / Emitir / Cancelar** | `modulo-facturas.js` → `cuerpoEditor()` | Sin dropdown (línea de ítems en texto libre) | `fn_editar_factura` / `fn_emitir_factura` / `fn_cancelar_factura` |
| **+ Nueva orden de compra** | `modulo-ordenes.js` → `nuevaOrden()` | Proveedor: `crearCombo`, `q('v_catalogo_admin')` filtrado en cliente a `es_proveedor && clase='comercial'` · Embarque (opcional): `crearCombo`, `v_carga_detalle` sin filtro · Moneda: `<select>` **hardcoded inline** · Producto por línea: `<select>` RPC-fed, `v_catalogo_productos` | `fn_crear_orden_compra({...})` |
| **Editar orden / Avanzar / Cancelar** | `modulo-ordenes.js` → `cuerpoFicha()` | Mismo picker de embarque/producto | `fn_editar_orden_compra` / `fn_cambiar_estado_orden` / `fn_anular_orden` |
| **+ Nueva liquidación** | `modulo-liquidaciones.js` → `nuevaLiquidacion()` | Productor: `crearCombo`, `q('v_catalogo_proveedores','&order=nombre.asc')` · Embarques: checkboxes desde `v_carga_detalle` filtrado a `!anulado && proveedor_id=sel` | `fn_crear_liquidacion({p_productor_id,p_cargas,p_bruto,p_comision_pct,p_nota})` |
| **Liquidación automática** | `modulo-liquidaciones.js` → `nuevaLiquidacionAuto()` | Mismo productor picker · Embarques filtrados además a `modalidad='consignacion' && ingreso_venta>0` | `fn_crear_liquidacion_auto({p_productor_id,p_cargas,p_nota[,p_comision_pct]})` |
| **Agregar venta** (a liquidación) | `modulo-liquidaciones.js` | Sin dropdown | `fn_agregar_venta_liquidacion({...})` |
| **Agregar deducción** (a liquidación) | `modulo-liquidaciones.js` | **Categoría: `<select>` hardcoded `CATEGORIAS`/`CAT_LABEL` (7 valores) — ver sección 3** | `fn_agregar_deduccion_liquidacion({p_liquidacion_id,p_concepto,p_monto,p_nota,p_categoria})` |
| **Emitir / Anular liquidación** | `modulo-liquidaciones.js` | — | `fn_emitir_liquidacion` / `fn_anular_liquidacion` |

### Lotes / Loads (embarques físicos)

| Panel | Archivo/función | Dropdowns/pickers | RPC |
|---|---|---|---|
| **+ Nuevo lote** | `modulo-lotes.js` → `nuevoLote()` | Proveedor: `crearCombo`, `q('v_catalogo_proveedores','&order=nombre.asc')` · Embarque puente (opcional): `crearCombo`, `v_carga_detalle` filtrado a `!anulado` | `fn_crear_lote({...})` |
| **Agregar item** (a lote) | `modulo-lotes.js` | Producto: `crearCombo`, `v_catalogo_productos` | `fn_agregar_item_lote({...})` |
| **Asignar a venta** (lote→SO) | `modulo-lotes.js` | SO: `crearCombo`, `v_sales_orders` filtrada a `!anulado && estado no en (Cerrada,Cancelada)` | `fn_asignar_venta_lote({...})` |
| **Registrar movimiento** (merma/RTS) | `modulo-lotes.js` | Tipo: `<select>` **hardcoded inline** (merma/rts, ni siquiera usa la constante `TEXTO_MOV` para las opciones) | `fn_registrar_mov_lote({...})` |
| **Anular lote / Desasignar venta / Anular movimiento** | `modulo-lotes.js` | — | `fn_anular_lote` / `fn_desasignar_venta_lote` / `fn_anular_mov_lote` |
| **+ Nuevo embarque físico (Load)** | `modulo-loads.js` → `nuevoLoad()` | Cargas a consolidar: **checklist** (no combo/select), `v_carga_detalle` filtrado a `!anulado` | `fn_crear_load({...})` |
| **Editar Load** | `modulo-loads.js` | — | `fn_editar_load({...,p_estado:null})` |
| **Cambiar estado (Load)** | `modulo-loads.js` → `cambiarEstado()` | Estado: `<select>` **hardcoded** `ESTADOS_LOAD` — comentario del propio código dice "no hay catálogo de backend para esto, a diferencia de v_estados_carga" | `fn_editar_load({...,p_estado})` |
| **Asignar/Desasignar carga a Load** | `modulo-loads.js` | Embarque: `crearCombo`, `v_carga_detalle` filtrado a `!anulado` | `fn_asignar_carga_load` / `fn_desasignar_carga_load` |
| **Anular Load** | `modulo-loads.js` | — | `fn_anular_load({p_load_folio,p_motivo})` |

### Tareas / Flags / Datos faltantes / Expediente / Usuarios / Documentos

| Panel | Archivo/función | Dropdowns/pickers | RPC |
|---|---|---|---|
| **+ Nueva tarea** | `modulo-tareas.js` → `nuevaTarea()` | Área: `<select>` **hardcoded** `AREAS` (4 valores, CHECK) · Prioridad: `<select>` **hardcoded** `PRIORIDADES` (4 valores, CHECK) · Asignado: `<select>` RPC-fed, `q('v_socios_asignables','&order=socio_codigo.asc')` · Embarque ligado (opcional): `crearCombo`, `v_carga_detalle` filtrado a `!anulado` | `fn_crear_tarea({...})` |
| **Editar tarea / Cambiar estado / Cancelar / Comentar** | `modulo-tareas.js` → `verTarea()` | Mismos Área/Prioridad/Asignado/Carga | `fn_editar_tarea` / `fn_cambiar_estado_tarea` / `fn_cancelar_tarea` / `fn_comentar_tarea` |
| **Responder flag** | `modulo-flags.js` (inline, sin drawer) | Sin dropdown | `fn_responder_flag({p_folio,p_respuesta})` |
| **Cerrar flag** | `modulo-flags.js` (inline) | Sin dropdown | `fn_resolver_flag_web({p_folio,p_resolucion})` |
| **Guardar ID V7** | `modulo-datos-faltantes.js` (inline) | Sin dropdown | `fn_asignar_id_v7({p_folio,p_id_v7,p_nota})` |
| **Confirmar entrega** | `modulo-expediente.js` → `abrirFormConfirmarEntrega()` | Sin dropdown | `fn_confirmar_entrega({p_folio,p_fecha,p_nota})` |
| **Nuevo/Editar usuario** | `modulo-usuarios.js` → `abrirForm()` | Rol: `<select>` **RPC-fed** (no vista), `rpc('fn_admin_listar_roles')` | `fn_admin_guardar_usuario({p_socio_codigo,p_nombre,p_email,p_rol,p_activo})` |
| **Permisos (capacidades/módulos)** | `modulo-usuarios.js` → `abrirPermisos()` | Autoguardado por celda; opciones RPC-fed (`fn_admin_capacidades_usuario`/`fn_admin_modulos_usuario`); valores hereda/Sí/No hardcoded (patrón estructural, no catálogo de negocio) | `fn_admin_set_capacidad` / `fn_admin_set_modulo` (cada `<select>` dispara su propio RPC) |
| **Subir documento** | `documentos.js` (componente compartido, montado en varias fichas) | Categoría: `crearCombo`, `q('v_categorias_documento')` sin filtro | `fn_registrar_documento({...})` (tras subir a Storage) |

### Sin puerta en el frontend (mencionado en código pero sin botón/panel)
- **`fn_traspaso`** — mencionado solo en un texto de leyenda en `modulo-tesoreria.js` ("Los traspasos entre cuentas se registran vía `fn_traspaso`"). **No existe ningún botón/panel que lo llame** en todo el repo. Si el backend espera que el frontend lo use, falta la puerta de captura.

### Read-only (sin captura) — confirmado por cero `rpc(`/`abrirPanel` con guardar
`modulo-cobranza.js`, `modulo-pagos.js` (ambas delegan a `capturarMovimiento`), `modulo-inventario.js`, `modulo-antiguedad.js`, `modulo-cierres.js`, `modulo-concentracion.js`, `modulo-finanzas.js`, `modulo-inicio.js`, `modulo-bitacora.js`.

---

## 2) CATÁLOGOS — cada pantalla de gestión (lista + alta + edición)

| Pantalla | Archivo | Vista(s) que lee | RPC alta / edición | Alimenta estos pickers de captura |
|---|---|---|---|---|
| **Directorio Comercial** (contrapartes por clase) | `modulo-catalogos.js` | `v_catalogo_admin` (fuente principal, con `razon_social`/facturación/`num_cargas`) fundido con `v_directorio_contrapartes` (P1: `recibe_pagos`,`capturado_por`,`capturado_ts`,`tiene_movimientos`) | `fn_alta_contraparte` / `fn_editar_contraparte` | `v_catalogo_admin`: Movimiento (Tesorería/captura-rapida), Editar movimiento, Nueva carga (Registrar evento), Nuevo proyecto (fondeador), Nueva orden de compra (proveedor). `v_catalogo_clientes`/`v_catalogo_proveedores` (vistas derivadas, mismo origen): Nueva SO, Cotización/Orden, Nuevo programa, Nueva liquidación, Nuevo lote, Nuevo proyecto (productor) |
| **Productos** | `modulo-catalogos.js` | `v_catalogo_productos` | `fn_alta_producto` (sin RPC de edición encontrado) | Nueva carga, Editar carga, Cotización/Orden (línea), Nuevo programa, Agregar item a lote, Orden de compra (línea) |
| **Variedades** | `modulo-catalogos.js` | `v_catalogo_variedades` | `fn_alta_variedad` (sin RPC de edición encontrado) | Nueva carga / Editar carga (selector de variedad según producto) |
| **Conceptos de costo** (P2, E103) | `modulo-catalogos.js` | `v_conceptos_costo_admin` (id, nombre, activo) | `fn_alta_concepto_costo` / `fn_editar_concepto_costo` | Agregar costo / Editar costo (ficha de carga), vía `v_catalogo_conceptos_costo` (vista hermana, solo nombres) |
| **Cuentas** (P2, E103) | `modulo-catalogos.js` | `v_cuentas_admin` (id, nombre, banco, moneda, tipo, capturado_por/ts, saldo, tiene_movimientos) | `fn_alta_cuenta` (solo tipo='banco') / `fn_editar_cuenta` | Prácticamente todo picker de "Cuenta" del ERP, vía `v_catalogo_cuentas` (vista hermana): Movimiento, Registrar gasto, Anticipo, Aportación de socio, Registrar cobro/pago en carga |
| **Programas Comerciales** | `modulo-programas.js` | `v_programas_comerciales`, `v_programas_proyeccion`, `v_programa_cargas`, `v_cargas_programa` | `fn_crear_programa` / `fn_editar_programa` (+ `fn_ligar_carga_programa` para ligar embarques) | Nueva orden de venta (programa opcional), Nueva carga (programa opcional), lista de Embarques agrupada por programa |
| **Lotes** | `modulo-lotes.js` | `v_lotes`, `v_lote_items`, `v_lote_ventas`, `v_lote_cadena`, `v_lote_inventario`, `v_lote_movimientos` | `fn_crear_lote` / (sin edición de encabezado; sí `fn_agregar_item_lote`, `fn_asignar_venta_lote`, `fn_registrar_mov_lote`) | No alimenta pickers en otros módulos — `v_lotes` es de uso exclusivo de este archivo |
| **Loads (embarques físicos)** | `modulo-loads.js` | `v_loads`, `v_load_cargas` | `fn_crear_load` / `fn_editar_load` | No alimenta pickers en otros módulos — `v_loads` es de uso exclusivo de este archivo |
| **Usuarios** (admin) | `modulo-usuarios.js` | Sin vista — 100% RPC (`fn_admin_listar_usuarios`, `fn_admin_listar_roles`) | `fn_admin_guardar_usuario` (+ `fn_admin_set_capacidad`/`fn_admin_set_modulo` para permisos) | No alimenta pickers de captura (es panel de administración de acceso, no catálogo de negocio) |
| **Categorías de documento** | `documentos.js` (implícito — solo lectura, sin alta/edición encontrada) | `v_categorias_documento` | Ninguna encontrada — parece precargada por backend | Subir documento (todas las fichas que montan el componente) |

**Documentos/Ordenes/Facturas/Liquidaciones NO son catálogos** — son módulos de flujo/documento transaccional (crean folios de negocio, no entidades reutilizables), aunque tienen su propia captura+edición+cambio de estado. Se listan en la sección 1, no aquí.

---

## 3) DROPDOWNS SIN PANEL — opciones fijas en código, sin pantalla de gestión

| Dropdown | Archivo | Constante | Valores | Nota |
|---|---|---|---|---|
| **Categoría de deducción** (liquidación) | `modulo-liquidaciones.js` | `CATEGORIAS`/`CAT_LABEL` | general, material, flete, in_out, customs, duties, otro | **Candidato más fuerte** — es un campo de captura real (`p_categoria` de `fn_agregar_deduccion_liquidacion`), 7 valores fijos, ninguna vista/tabla lo respalda ni hay pantalla para administrarlo. |
| **Tipo de gasto** | `modulo-tesoreria.js` | `TIPOS_GASTO` | Gastos Administrativos, Gastos Financieros, Otros gastos, Paca, Sueldo, Viaticos, Seguro | Mencionado explícitamente en la tarea como ejemplo. Campo real de captura (`p_tipo` de `fn_capturar_mov`). |
| **Tipo de movimiento (cobro/pago)** | `captura-rapida.js`, `modulo-cargas.js` | `TIPO_MOVIMIENTO` | cobro→Cliente, pago→Proveedor | Solo 2 valores, atados 1:1 al modo del formulario — bajo riesgo, probablemente no necesita pantalla propia. |
| **Estado de Load** | `modulo-loads.js` | `ESTADOS_LOAD` | en_origen, en_cruce, en_transito, entregado | El propio comentario del código dice que, a diferencia de Cargas (`v_estados_carga`), Loads no tiene catálogo de backend. |
| **Tipo de movimiento de lote** | `modulo-lotes.js` | inline (no ni siquiera usa `TEXTO_MOV`) | merma, rts | 2 valores fijos. |
| **Modalidad de carga** | `modulo-cargas.js` | `MODALIDAD_EDIT` | margen_fijo, consignacion, comision | Coincide con el CHECK constraint documentado en CLAUDE.md — cambiar esto es decisión de negocio, no un catálogo abierto. |
| **Naturaleza de aportación de socio** | `captura-rapida.js` | `NATURALEZA_AP` | prestamo_sin_interes, financiamiento_con_tasa, custodia | Coincide con el enum del RPC `fn_registrar_aportacion_socio`. |
| **Origen del fondeo (anticipo)** | `captura-rapida.js` | inline | propio, socio | Coincide con el enum del RPC `fn_anticipo_productor`. |
| **Área / Prioridad / Estado de tarea** | `modulo-tareas.js` | `AREAS`, `PRIORIDADES`, `ESTADOS` | Área: cargas/comercial/sourcing/admin · Prioridad: baja/media/alta/urgente · Estado: pendiente/en_proceso/hecha/cancelada | 3 enums CHECK distintos, todos hardcoded. |
| **Absorbe** (línea de presupuesto de proyecto) | `modulo-proyectos.js` | `ABSORBE` | plein, productor, compartido, no_aplica | — |
| **Fuente de fondeo** (proyecto) | `modulo-proyectos.js` | `FONDEO` | propio, agrocapital, back_to_back, otro | — |
| **Costo financiero** (proyecto) | `modulo-proyectos.js` | `COSTOFIN` | no_aplica, plein, productor, compartido | — |
| **Tipo de movimiento de línea** (proyecto) | `modulo-proyectos.js` | `TIPOS` (local a `registrarMovLinea`) | disposicion, recuperacion, valuacion_especie, interes, ajuste_cargo, ajuste_abono | — |
| **Modalidad / Ingreso base / Frecuencia unidad / Vía / Término con proveedor / Estado** (programa comercial) | `modulo-programas.js` | `MODALIDAD_LBL`, inline, `FREC_UNIDAD_LBL`, `VIA_LBL`, `TERMINO_LBL`, inline | Modalidad: margen_fijo/consignacion/comision/trueque/por_definir · Ingreso base: pct_venta/usd_caja/por_definir · Frecuencia: carga/palet/contenedor/medio_contenedor · Vía: terrestre/barco · Término: pago_contra_cobro/trueque/credito/por_definir · Estado: activo/por_arrancar | 6 enums distintos en un solo formulario, todos hardcoded. |
| **Moneda** (SO / Cotización-Orden / Orden de compra) | `modulo-ventas.js`, `modulo-comercial.js`, `modulo-ordenes.js` | inline, duplicado en 3 archivos | USD, MXN | Mismo par de valores repetido literal 3 veces — riesgo de que se desalineen si algún día se agrega una moneda. |

### Caso especial — vista existe pero sin alta/edición
- **Revenue Model** (`modulo-ventas.js`, `<select>` de "Nueva orden de venta"): SÍ tiene vista propia (`v_revenue_models`), a diferencia de todo lo de arriba — pero no se encontró ningún `fn_crear_revenue_model`/`fn_editar_revenue_model` ni pantalla que lo gestione en todo el repo. Es de solo lectura desde el frontend; presumiblemente se siembra directo en la base.

### No listados (son filtros de lista, no campos de captura)
Se excluyeron a propósito selects como `#soFEstado`, `#ocFEstado`, `#factFEstado`, `#liqFEstado`, `#ltFFiltro`, `#ldFFiltro`, `#cxpLoteAgrup` — todos hardcoded pero solo filtran una tabla en pantalla, no viajan a ningún RPC.

---

## Resumen para el chat de backend
- **2 huecos de mayor impacto:** (1) `fn_traspaso` no tiene ningún botón en el frontend — si se espera que el usuario lo use, falta la puerta; (2) la categoría de deducción en Liquidaciones (`CATEGORIAS`) es una lista de 7 valores fijos sin catálogo — si va a crecer, conviene una vista + RPC de alta, mismo patrón que Conceptos de costo (P2).
- **`v_revenue_models`** tiene vista de lectura pero ningún RPC de alta/edición — confirmar si eso es intencional (catálogo sembrado por backend) o si falta exponerlo.
- El resto de los "hardcoded" (modalidad, estados de Load, enums de proyecto/programa/tarea) coinciden con CHECK constraints documentados — cambiarlos es decisión de negocio, no gap técnico; se listan por completitud.
