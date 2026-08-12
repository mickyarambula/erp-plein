# PENDIENTES-BACKEND.md
_Última actualización: 2026-08-12 — rediseño OP: backend COMPLETO (Fase 0/1a/2/alta-módulo/3a/3b/3c/3d cerradas, D-140..D-151); lo único pendiente es el FRONTEND de captura (Slice 2 "Agregar compra" y Slice 3 "Registrar embarque") + saneamiento CxP (1b). Dueño por defecto: backend, salvo que diga otro._

**Anclas vigentes (2026-08-12, post D-150/D-151):** Cuadre 0.00 · seg 0/0/0 · cargas 85 · flags 1 · aplicaciones 212 · CxC 565,985.13 · CxP 504,869.78 · JPM 43,308.54 · folio_max JPM 401.

## Cerrado en E102–E106 (sesión de autosuficiencia, ver BITACORA D-120..D-137)
- ✅ **Tema 2 — Línea de proyecto + socios (D-120..D-124):** `fn_ajustar_linea_proyecto` (sola, money-neutral, candado ≥ dispuesto), `fn_registrar_aportacion_socio` (genérica, 3 naturalezas), origen de fondeo en `fn_anticipo_productor` (opcional, retrocompatible), balance "Deuda a socios" generalizado + `v_deuda_socios`. Frontend: 3 botones cableados (Ajustar línea en Proyecto, + Aportación de socio en Tesorería/Proyecto, selector Origen en Anticipo). **Miguel ya opera esto solo** (folio 397, PRJ-005).
- ✅ **P1 — Directorio autosuficiente (D-125..D-128):** `contrapartes.recibe_pagos` + `capturado_por/ts`; picker de "Registrar gasto" desacoplado de `clase` (Samuel/Juan ya salen en Sueldo); `fn_alta/editar_contraparte` con `recibe_pagos` + rastro; `v_directorio_contrapartes`. Frontend desplegado y probado.
- ✅ **P2 — Catálogos autoservibles (D-129..D-132):** Conceptos de costo (`fn_alta/editar_concepto_costo`), Cuentas (`tipo` banco/virtual, `fn_alta/editar_cuenta` solo banco real, balance "Banco" por `tipo='banco'` en vez de hardcode). Frontend desplegado y probado.
- ✅ **Fase 1 captura — puerta única (D-133):** `fn_traspaso` saneado (gate + `fn_actor` + folios por rango, permitido al front). Frontend: botón único "+ Registrar" con chooser de intención (Cobro/pago · Gasto · Anticipo · Aportación · Traspaso) reemplaza los 4 botones sueltos. Desplegado y probado.
- ✅ **Fase 2a — Categoría de deducción (D-134):** tabla `categorias_deduccion` + `fn_alta/editar_categoria_deduccion` + `v_categorias_deduccion`/`_admin`; `liquidacion_deducciones.categoria` pasó de CHECK fijo a FK al catálogo. Frontend: pestaña en Catálogos + Liquidaciones lee la vista. Desplegado y probado.
- ✅ **Fase 2b — Categorías de gasto (D-135):** `tipos_movimiento.activo`; `fn_alta_categoria_gasto` (clona comportamiento del grupo gasto_operativo/financiero, candado contra tipos estructurales) + `fn_editar_categoria_gasto` (activar/desactivar) + `v_categorias_gasto`/`_admin`. Frontend: pestaña + "Registrar gasto" lee el catálogo. Desplegado y probado (confirmado: categoría nueva pega sola al P&L).
- ✅ **Fase 2c — Editar productos/variedades (D-136, D-137):** `fn_editar_producto`/`fn_editar_variedad` + permisos unificados a `capturar` en las 5 RPCs de producto/variedad (2 de ellas no tenían gate — hueco cerrado). **✅ Hecho y probado en producción** — Miguel confirmó con capturas de pantalla: el botón "Editar" en Catálogos → Productos existe y funciona (nombre, código de ítem, Activo, "Guardar cambios").
- ✅ **Fase 3 — limpieza:** moneda (USD/MXN) centralizada en `ERP.MONEDAS` (comun.js), antes duplicada en 3 archivos. Seeds confirmados como enums de sistema (documento/evento/presupuesto) — no requieren panel. Estado de Load decidido como enum (queda igual, no es catálogo de usuario).

**Anclas al cierre E102-E106:** Cuadre 0.00 · seg 0/0/0 · CxC 565,985.13 · CxP 526,469.78 · JPM ~50,308.54 (antes de capturas de Miguel post-sesión) · cargas 85 · folio_max ~401.

## Cerrado post-autosuficiencia (2026-08-09)
- ✅ **D-138 — Tema 1, filtro de cargas al aplicar movimiento (backend + frontend):** vista nueva `v_carga_contrapartes` (folio_carga, contraparte_id, contraparte_nombre, rol['cliente'|'proveedor'|'costo']) — une cliente/proveedor de ENCABEZADO + contrapartes de línea de costo (proveedores de SERVICIO: flete/comisión/reempaque, ej. SUAREZ BROKERAGE en P-076, que antes nunca aparecían). `modulo-tesoreria.js` → `editarMovimiento()`: el selector "Aplicar a carga" ahora filtra por **ID** contra esta vista en vez de por nombre contra el encabezado. Verificado en vivo (4 casos: proveedor de servicio, regresión con proveedor normal, fallback sin contraparte_id, toggle "Ver todas"), `node --check` limpio. Commit `04e8be3` (Claude Code, solo `.md` aparte del código).
- ✅ **D-139 — Consolidar `fn_alta_producto` (backend):** unificada a una sola firma `(p_nombre, p_codigo_item)` con detección de duplicado exacto (RAISE) y de "parecido" (warning). Antes había 2 firmas: la de 1-arg (con la validación, pero sin call-site en el front) y la de 2-arg (la que sí usaba `modulo-catalogos.js`, SIN validación — el aviso de "parecido a uno existente" nunca se mostraba en producción porque el front esperaba `data[0].advertencia` y la función viva no la mandaba). La fusión corrige ese bug mudo **sin tocar frontend** (el front ya esperaba esa forma de respuesta).
- ✅ **`documentos.entidad='load'`** — confirmado que el CHECK constraint de la tabla `documentos` SÍ incluye `'load'` desde D-71 (E76); ya estaba soportado, solo faltaba documentarlo (la nota de incertidumbre vivía en el comentario de `modulo-loads.js`, no en el backend).

**Anclas al cierre de esta sesión:** Cuadre 0.00 · seg 0/0/0 · CxC 565,985.13 · CxP 526,469.78 · JPM 46,808.54 · cargas 85 · folio_max 400.

## Backend — activos / por hacer

### 🧵 Rediseño OP (modelo-OP, hilo conductor — ver `ARQUITECTURA-OPERACION.md`)
- ✅ **Fase 0 (D-140):** tabla `operaciones` vacía + columnas `operacion_id` nullable en `cargas`/`sales_orders`/`ordenes_compra`. Andamiaje reversible, RLS+REVOKE, seg 0/0/0.
- ✅ **Fase 1a (D-141/D-142):** `operacion_id` en la lista blanca de `fn_chk_periodo_cerrado` (columna de puro enlace); backfill de 85 operaciones (OP-0001..OP-0085, orden `f_embarque`, `folio_carga_v1`=folio histórico, `proyecto_id` heredado), 85 cargas + 81 ventas enlazadas. Money-neutral.
- ✅ **Fase 2 — vistas de lectura (D-143/144/145/146):** `v_operacion`, `v_operacion_costos`, `v_operacion_cxp`, `v_operacion_resumen`. Consumidas por la pantalla frontend "Operaciones (OP)" (`modulo-operaciones.js`, E111/E112).
- ✅ **Alta de módulo:** `'operaciones'` dado de alta en `modulos_erp` (orden 26, icono 🧵) + concedido a los 4 roles en `rol_modulos` — el ítem de menú ya no debería estar oculto (cierra el hueco que había anotado E111 aquí mismo).
- ✅ **Fase 3a/3b (D-147/D-148/D-149):** diseño del flujo "+ Nueva operación" (D-147: OC siempre formal cuando hay compra, venta se confirma antes del embarque, 1-a-muchos); `fn_abrir_operacion` (reserva folio OP-XXXX, `seq_operaciones_num` arranca en 86); `fn_op_agregar_venta` (cuelga una SO de una OP, reusa `fn_crear_so`). Money-neutral. **Frontend Slice 1 (E113) ya cableado:** botón "+ Nueva operación" en la pantalla Operaciones (OP) crea la OP + su primera venta en un paso, con protección contra OPs huérfanas duplicadas por reintento. Ver `REPORTE-FRONTEND.md` E113.
- ✅ **Fase 3c (D-150, backend HECHO):** `fn_op_agregar_compra` — wrapper OP-céntrico sobre `fn_crear_orden_compra` (verifica OP, genera folio interno OC-XXXX, setea `operacion_id`, guarda el número oficial del proveedor en `ordenes_compra.numero`). Comisión pura = AVISO (`RAISE NOTICE`), NO candado — permite la compra igual, la verdad contable se cuida en el embarque. Money-neutral (`v_cxp` se arma de `cargas`+`carga_costos`, no de `ordenes_compra`). ENSAYO OK, anclas idénticas, seg 0/0/0. ✅ **Frontend Slice 2 (E114) ya cableado:** botón "Agregar compra" en el detalle de una OP, editor de líneas reusado de `modulo-ordenes.js`. Ver `REPORTE-FRONTEND.md` E114 — nota abierta: confirmar con Miguel si la compra debe verse reflejada en "Costos por línea" antes de que exista un embarque (Slice 3), o si es esperado que no aparezca todavía.
- ✅ **Fase 3d (D-151, backend HECHO — cierra Fase 3):** `fn_op_agregar_embarque` — wrapper sobre `fn_crear_carga` (verifica OP, HERENCIA SIN RECAPTURA desde la única venta de la OP: PO←`customer_po`, cliente←cliente de la venta, modalidad←`revenue_model`; llama `fn_crear_carga` con costos desglosados; setea `operacion_id`; AUTO-LIGA carga↔venta vía `fn_asignar_carga_so` si hay 1 venta y `p_auto_ligar_venta=true`). Modalidad derivada = default override-able, NO candado (mapa validado con las 81 cargas: `comision_por_caja`→comisión, `pct_venta`→consignación, margen/`buy_resell`→margen_fijo). Devuelve `TABLE(folio, con_flag, advertencias, ligada_a_so)`. ENSAYO OK (ΔCxP=1000=costo, ΔCxC=1000=ingreso, Cuadre 0.00, secuencia restaurada), anclas idénticas post-apply, seg 0/0/0. **TOCA COSTOS — la de más cuidado.** ⬜ **Falta el frontend — Slice 3 "Registrar embarque"** (el que más cuidado va a necesitar, por lo mismo).
- ⬜ **Fase 1b (saneamiento CxP):** 30 líneas de `carga_costos` sin contraparte = **$108,264.01**, en 4 buckets: **A** cartón interno Plein $32,262.24 · **B** comisión derivada $7,661.02 · **C** comisión venta PAMPAS $720.00 · **D** En Camino pendiente Samuel $67,620.75 (NGM248545, PX-72306, PX-72715). **Decisiones de Miguel pausadas:** tratamiento de cartón interno (A+B ≈$40K, ¿es CxP o no?) + proveedores reales del bucket D.
- ⬜ **Hacer oficial el CxP atribuido** (bloqueado por Fase 1b): al cambiar, el ancla CxP baja ~$45,244.39 (brecha fantasma vs real) — es legítima (cartón interno + En Camino), pero no se cambia el ancla oficial hasta cerrar 1b.

### 🟠 Prioridad media
- **Liga única de venta:** unificar `sales_order_cargas`/`lote_ventas` + jalar cajas del lote (matar doble registro). GATE+ENSAYO.
- **F2:** diferencia ~1,494 del total CxP (Drive 497,861.64 vs directo 496,368.03).
- **Liquidar backlog** (4 productores, **10 cargas, $44,224.70** — bajó de $54,224.70/11 cargas: **Cornejos P-043 ($10,000) ya se liquidó**): Carrifoods 6 cargas $20,329.50 · Akambarhu P-073/075 $11,874 · Cornejos P-047 $11,571.20 · Agrofepac P-071 $450. Lo hace Miguel en la UI.
- **Deuda Samuel / mov 387:** revisar si el reempaque Costatropical −1,000 sigue pendiente de aplicar (ya existe P-094/NGM248545 como carga — revisar si folio 393/399 ya lo cubrió).
- **Samuel custodia −4,432.99:** histórico, el reembolso f388 fue mayor a lo debido. Revisar cuando convenga.

### 🟢 Continuo
- **Auditoría de autosuficiencia:** seguir mapeando huecos "¿se hace 100% desde el sistema?" fuera de captura/catálogos (ver `MAPA-CAPTURA.md`).
- **Cobro Crystal mov 389:** confirmado 100% aplicado (Samuel lo capturó y aplicó él mismo).

## GitHub / continuidad (nuevo, E106)
- Repo `mickyarambula/erp-plein` en GitHub, **privado**, subido.
- Claude Code puede leer/escribir el repo local y hacer **commit** de `.md` sin pedir permiso (regla en `CLAUDE.md`).
- **El `push` a GitHub lo debe correr Miguel manualmente** (`git push -u origin main`) — bloqueado para agentes por control de seguridad de la herramienta, no removible desde el chat.
- Este chat (backend, claude.ai) **no tiene acceso de lectura a GitHub** todavía — se sigue trabajando por archivos subidos + prompt de continuación, igual que antes. Documentos de continuidad se actualizan al cierre de cada sesión y se guardan en la carpeta local para que Claude Code los suba en su próximo commit.

## Parqueados (esperan input externo)
- **A-07 notas P-071/P-075:** dueño Miguel/Samuel.
- **PC-005 (Kabocha Akambarhu):** monitorear regla `programa_sin_carga`.
- **P-092 modalidad:** quedó `margen_fijo` — confirmar con Crystal si es compra en firme o consignación.
