# ERP Plein — Contexto del proyecto

## Reglas permanentes (leer SIEMPRE primero)
1. **Antes de cualquier trabajo, lee `PLAN-MAESTRO.md`** (en qué fase estamos y qué puntos siguen) y **`PENDIENTES-BACKEND.md`** (estado del backend). Al completar un punto del plan, márcalo `[x]` con la fecha; nunca borres puntos.
2. **Stack fijo:** HTML/CSS/JS vanilla + Supabase por CDN. Sin build, sin frameworks. **Nunca** introducir React ni build tools.
3. **NUNCA tocar la lógica contable, las RPCs, ni `fn_aplicar_fifo`.** La captura contable existente es **intocable** salvo instrucción explícita.
4. **Nada expuesto a anon:** toda vista/tabla nueva se consume asumiendo **RLS authenticated** (anon = 0).
5. **Etiquetas visibles en español profesional:** Embarques, Tesorería, Cuentas por Cobrar, Cuentas por Pagar, Revisiones Pendientes, Directorio Comercial, Facturación, Cierres Contables, Expediente de Embarque.
6. **Formato:** montos `$12,345.67`. Fechas en pantalla `DD-mmm-YYYY`.
7. **Deploy:** `npx vercel --prod` (proyecto `erp-plein-dashboard`).
8. **El backend (SQL/Supabase) se decide en el chat de Miguel con Claude, NO aquí.** Si necesitas algo de backend, anótalo en `PENDIENTES-BACKEND.md` y trabaja defensivo mientras tanto.
9. **Columnas exactas confirmadas** (usar estos nombres, no adivinar):
   - **Documentos — sistema OFICIAL: tabla `documentos` + vista `v_documentos` + RPC `fn_registrar_documento(p_entidad, p_entidad_id, p_categoria, p_storage_path, p_nombre_archivo, p_mime, p_tamano_bytes, p_nota, p_referencia_externa)`**, bucket privado `documentos`, entidades `carga | contraparte | movimiento | general`. Categorías EXACTAS del catálogo `v_categorias_documento` (ej. "Orden de compra" en minúscula). `referencia_externa` = texto libre buscable (PO cliente, contenedor, guía/BL). El frontend lo consume por el componente reutilizable `ERP.documentos.montar(cont, {entidad, entidadId})` (`documentos.js`), montado por la ficha clásica y por el Expediente. **`carga_documentos` / `v_carga_documentos` quedaron JUBILADAS (2026-07-22)** — su `mov_folio` INTEGER causaba errores al anotar texto; NO usarlas.
   - `v_cierre_checklist(mes, estado, cerrado_por, cerrado_ts, movimientos, cargas, flags_abiertos, cargas_sin_cerrar, placeholders, consig_sin_liquidar, movs_sin_aplicar, monto_sin_aplicar, bloqueadores, ingresos, utilidad_bruta, cerrable)`
   - Estado de **facturas**: `borrador | emitida | anulada` (el estado cancelado es `'anulada'`; se MUESTRA como "Cancelada"). El estado de **órdenes de compra**: `Borrador → Enviada → Confirmada → Recibida` (+ Cancelada vía `anulado`).
   - **Tareas** (valores CHECK literales que se mandan a las RPCs; se muestran en español): estado `pendiente | en_proceso | hecha | cancelada` · prioridad `baja | media | alta | urgente` · área `cargas | comercial | sourcing | admin`.
   - **Conceptos de costo** válidos del catálogo `conceptos_costo` (exactos, SIN acentos): `Materia prima` · `Comision` · `Aduanas` · `In & Out QC` · `Fletes` · `Carton` · `Otro`.
   - **`productos.codigo_item`** (E37): código del producto (`ID-01`..`ID-021`, catálogo FRX) que va en la columna `item` de cada línea de factura; lo llena `fn_crear_factura`.
   - **`v_carga_detalle` es la fuente ÚNICA del detalle de embarque** (la tabla `cargas` no es legible por authenticated). Expone: `cajas, cajas_origen, pallets, f_entrega (PROGRAMADA), f_entrega_real, entrega_nota, entrega_por, entrega_ts, origen_operativo, cajas_por_pallet, transito_dias, transito_es_estimado, desfase_entrega_dias, id_v7, anulado` y (E49, aditivas al final) `cliente_id, proveedor_id, producto_id` — la vista pasó de 44 a 47 columnas; nada existente cambió de nombre ni de orden. **(E54, también aditivas)** `variedad_id, variedad_nombre` — habilita precargar la variedad ya asignada en "Editar carga" (antes el frontend solo podía fijarla, no mostrarla). **OJO con `f_entrega`:** el histórico es una **ESTIMACIÓN** (embarque + 21 días en 46 de 51 embarques), NO una entrega observada. **No usarla para calcular días de crédito.** La entrega real (confirmada por una persona) es `f_entrega_real`; `transito_dias` usa la real si existe, si no la programada (`transito_es_estimado = true` mientras no haya real).
   - `v_balance(orden, seccion, concepto, monto, nota)` — **17 filas (E44 + E47 + E49; antes 15/16 — cualquier código que asuma un conteo fijo está roto)**. Secciones: `Activo | Pasivo | Patrimonio | Cuadre`. `nota` puede ser NULL. **NUNCA hardcodear los números de `orden`:** agrupar por `seccion` y ordenar por `orden`, porque al agregar renglones los TOTAL se recorren. La fila `seccion='Cuadre'` **DEBE dar 0.00 siempre** — es el centinela de integridad del balance; si da otra cosa, hay una fuga contable. En E44 se agregaron dos renglones: Pasivo "Ingreso de consignación declarado, no reconocido" (= suma de saldo_cxc de consignaciones; blinda el centinela) y Activo "Anticipos a productores (líneas de proyecto)" (= suma de saldo_vivo de proyectos; patrón JEAMS al revés, activo recuperable). En E47 se agregó un renglón de Pasivo: "Financiamiento externo (back-to-back, con tasa)" — SEPARADO de la deuda JEAMS porque este sí causa interés (ver PRJ-001.tasa_anual). En E49 se agregó un renglón de Patrimonio: "Ajuste bancario reconocido (sin par)" (+21.81), entre "Partidas por aplicar" (ahora −3,300.00 limpia) y "TOTAL PATRIMONIO" (−720.33, sin cambio) — resuelve A-04 (el residuo +21.81 que se colaba disfrazado de "Neutro"). **La fila Cuadre es ahora orden 17** y NO tiene un número de `orden` fijo memorizable: sigue siendo la última, localízala por `seccion='Cuadre'` (nunca por número), como ya hace `modulo-finanzas.js`.
   - `v_balance_partidas(tipo, grupo, movimientos, monto_movido, aplicado, sin_aplicar, destino)` — solo trae tipos con `sin_aplicar <> 0`. `destino` tiene hoy tres valores: `'Por aplicar a un embarque'` (el ÚNICO pendiente), `'Inventario (activo, no pendiente)'`, `'Neutro (se cancela)'`. **Regla de pintado:** `pendiente = (destino === 'Por aplicar a un embarque')` (rojo si negativo); todo lo demás en gris. Así aguanta valores futuros de `destino`.
   - **`v_carga_detalle` — columnas nuevas (E39):** `venta_esperada`, `utilidad`, `utilidad_es_estimada`, `margen_pct`, `utilidad_nota`. `utilidad` = venta − costo total; es **NULL** cuando no se puede calcular (consignación sin liquidar, o carga anulada) → pintar "—", **NUNCA $0.00**. `utilidad_es_estimada` = true solo si se usó un precio pactado por escrito. `utilidad_nota` va **SOLO en tooltip**, nunca como texto suelto. Helpers ya existentes en `comun.js`: `ERP.utilidadColor`, `ERP.utilidadTexto`, `ERP.margenTexto`, `ERP.cablearInfoNota`.
   - **`v_posicion_liquidez(orden, seccion, concepto, monto, nota)`** — pantalla "Posición de caja" en Finanzas. Secciones: `Entra · Sale · Socios · Resultado · Informativo`. **NUNCA hardcodear** los números de `orden` ni los nombres de sección: agrupar y ordenar por lo que venga. La sección **`Informativo` NO entra en la aritmética** (es contexto: costo de consignaciones sin liquidar).
   - **`cargas.venta_esperada`** — precio pactado POR ESCRITO. En consignación normalmente es NULL.
10. **Logo en PDFs:** el logo de marca vive en `assets/logo-plein.png` y se usa vía los helpers compartidos `ERP.encabezadoImpresion()` (plantillas DOM que imprimen con `window.print()`) y `ERP.logoPdfDataURL()` (documentos jsPDF) — **no copiar** el `<img>` ni el `addImage` en cada plantilla nueva. También `ERP.imprimirArea(html)` imprime esperando a que el logo cargue (evita PDFs sin logo por carrera de imagen) y `ERP.descLineaDoc(producto, descripcion)` arma el texto de línea `"producto — descripción"` sin celdas vacías.
11. **COTEJAR SIEMPRE POR P.O., NUNCA POR FOLIO.** El folio del ERP (`P-0XX`) y el ID del V7 de Samuel (`v_carga_detalle.id_v7`) son consecutivos **INDEPENDIENTES**: en 28 de 70 embarques NO coinciden (ej. ERP `P-075` = V7 `P-071`, y el `P-073` de cada sistema es un embarque DISTINTO). Cotejar por folio corrige una carga con los datos de otra. En pantalla, cuando `id_v7 <> folio` se resalta en ámbar con recordatorio de cotejar por P.O.

## Qué es esto
ERP interno de Plein Produce LLC (distribuidora de fruta fresca México→USA/EU/Asia, 4 socios).
Frontend estático (HTML/CSS/JS vanilla) servido en Vercel, datos en Supabase.
Usuario principal: Miguel (PP04-MA), administrador, NO es programador — todo se le explica paso a paso y la UI debe ser autoexplicativa.

## Reglas duras (no negociables)
1. **NUNCA tocar el esquema de Supabase** (ni CREATE, ni ALTER, ni INSERT/UPDATE/DELETE directo a tablas). El backend se gestiona en sesiones de claude.ai con protocolo de gates. Este proyecto solo CONSUME vistas y RPCs vía REST/supabase-js.
2. **NUNCA poner service keys ni secretos en el código.** Solo la publishable key (abajo). El acceso a datos requiere login (Supabase Auth) — las vistas son authenticated-only, anon recibe 401.
3. Idioma de toda la UI: **español**. Formato de moneda: USD con separador de miles.
4. Deploy: `npx vercel --prod` desde la raíz (proyecto ya vinculado: erp-plein-dashboard, scope mickyarambulas-projects). URL: erp-plein-dashboard.vercel.app
5. Antes de deploy, validar sintaxis JS de los archivos tocados.
6. No agregar frameworks ni build steps (no React, no bundlers). HTML + CSS + JS vanilla + supabase-js por CDN. Multi-archivo está bien.
7. **El frontend consume SOLO vistas y RPCs, NUNCA tablas.** La tabla `cargas` (y las tablas base en general) NO es legible por `authenticated` (RLS activo sin políticas de SELECT → 401/403). Si falta un dato en una vista, va a `PENDIENTES-BACKEND.md` (qué campo, en qué vista) — **no** se resuelve con lectura directa de la tabla ni con un `.catch` defensivo, que además **enmascara el fallo** (parece funcionar y en realidad sale siempre vacío/en guion).
8. **GATE 4 (backend) tiene una excepción acotada:** permite `UPDATE` en `cargas` **solo si NO cambia ninguna columna contable ni de identidad** (para capturar cajas/pallets/entrega incluso en meses ya cerrados). No es una puerta para editar montos: cualquier cambio contable sigue bloqueado. Es contexto de backend — el frontend igual nunca escribe tablas directo; captura vía RPC (`fn_crear_carga`, `fn_confirmar_entrega`, etc.).

## Conexión Supabase
- URL: https://wnjomlwevqaxbborikkq.supabase.co
- Publishable key (pública, ok en el código): sb_publishable_qaNQbKSDDb8teUACJe7pWg_FhabcEJS
- Auth: email/password por socio (ya funciona en index.html actual — reutilizar ese patrón de login/sesión en todos los módulos).

## Vistas y RPCs disponibles (solo lectura desde el frontend)
Financieras: v_anclas, v_deuda_jeams, v_cxc_cliente, v_cxc_aging_resumen, v_cxp_proveedor, v_cxp_proximas, v_flujo_semanal, v_flags_activas, v_rentabilidad_carga, v_estado_resultados, v_flujo_caja_mensual, v_balance, v_balance_partidas.
KPIs (E17): v_kpi_margen_producto, v_kpi_margen_cliente, v_kpi_rotacion_cobranza, v_kpi_concentracion, v_presupuesto_vs_real.
Tesorería (E18): v_saldo_cuentas, v_flujo_caja_mensual_multi.
Comercial/Docs/Tareas (E32–E35): v_facturas, v_ordenes_compra, v_orden_compra_items, v_tareas, v_tareas_resumen, v_tarea_comentarios, v_socios_asignables, v_bitacora_ediciones. Nota: `usuarios_erp` NO es legible por authenticated (nunca lo fue); para asignar tareas se usa `v_socios_asignables(socio_codigo, nombre, rol)`.
Cajas/Embarque (E36): v_margen_caja (margen por caja por embarque, con NULL deliberados y motivos), v_cajas_vigilancia (centinela de cajas derivadas).
Estados de embarque (E41): `v_estados_carga(estado, etiqueta, orden, descripcion, bloquea_cierre, cuenta_como_embarque, exige_po, es_terminal)` — 8 estados: Por Confirmar · Programada · En Camino · Entregada · Revision/QC · Cerrada · Rechazo · Falta informacion. `v_estado_transiciones(desde, etiqueta_desde, hacia, etiqueta_hacia, capacidad, es_retroceso, nota, orden_hacia)` — 27 transiciones. Las tablas base `estados_carga` / `estado_transiciones` NO son legibles por authenticated: solo por estas vistas. **REGLA DURA: nunca hardcodear la lista de estados, sus etiquetas, su orden ni la matriz — todo sale del catálogo (mismo criterio que v_balance/v_posicion_liquidez).**
Agenda y seguimiento (E41): `v_agenda_operativa(orden, severidad rojo|ambar, categoria, folio, po, cliente, producto, responsable, titulo, detalle, fecha_clave, dias)` — 7 reglas derivadas, no se captura nada. `v_cargas_datos_faltantes(folio, po, id_v7, cliente, producto, estado, modalidad, f_embarque, n_faltantes, falta, faltantes, peso)` — lista de trabajo de campos sin capturar.
RPCs de escritura — **desde E31 el frontend SÍ captura** (ya NO son service-role-only). Hay login por socio (Supabase Auth) y las RPCs validan capacidad con `fn_actor_puede('ver'/'capturar'/'editar'/'administrar')`. El frontend escribe vía, entre otras: `fn_crear_carga`, `fn_capturar_mov`, `fn_agregar_costo`, `fn_aplicar_fifo`, `fn_crear_factura`, `fn_editar_factura`, `fn_emitir_factura`, `fn_cancelar_factura`, `fn_crear_orden_compra`, `fn_editar_orden_compra`, `fn_cambiar_estado_orden`, `fn_anular_orden`, `fn_responder_flag`, `fn_resolver_flag_web`, `fn_editar_movimiento`, y las de tareas `fn_crear_tarea`, `fn_editar_tarea`, `fn_cambiar_estado_tarea`, `fn_asignar_tarea`, `fn_comentar_tarea`, `fn_cancelar_tarea`; y `fn_confirmar_entrega(p_folio, p_fecha, p_nota)` (confirma la entrega real; rechaza fecha futura, anterior al embarque, embarque anulado o inexistente; requiere `capturar`). El gating de la UI (ERP.puede) refleja la capacidad del rol; el backend es la autoridad y sus errores "Sin permiso"/"PERMISO_DENEGADO" se muestran vía ERP.avisarSiPermiso.
**Facturas (E37):** `fn_crear_factura` llena cada línea con `item` (= `codigo_item` del producto), `qty` (= cajas de la carga) y `precio` (= venta/cajas); si la carga no tiene cajas, `qty`/`precio` salen NULL y `r_advertencia` lo explica. `fn_emitir_factura` **RECHAZA la emisión si la carga no está en estado "Entregada"** (el borrador sí se crea antes; solo la emisión se bloquea). `fn_confirmar_entrega(folio, fecha, nota)` registra la llegada REAL (`cargas.f_entrega_real/entrega_nota/entrega_por/entrega_ts`).
Nota `fn_crear_carga` (E36): acepta `p_cajas`, `p_pallets`, `p_f_entrega` (todos opcionales) y los SIETE costos por concepto `p_materia_prima, p_comision, p_aduanas, p_qc, p_fletes, p_carton, p_otro`. El frontend ya **NO manda `p_costo`** (solo el desglose, así nunca hay descuadre).
**RPCs nuevas (E41):** `fn_mover_estado_carga(p_folio, p_estado, p_nota)` (gatea por la capacidad de cada transición; es la que usa Samuel para avanzar el pipeline), `fn_asignar_responsable(p_folio, p_socio, p_nota)`, `fn_hoy()`.
**Cambios en lo existente (E41):** `v_carga_detalle` trae `responsable` y `responsable_nombre` AL FINAL. `v_anclas` trae `cargas_por_confirmar`. `fn_confirmar_entrega` AHORA TAMBIÉN mueve el estado a Entregada (solo desde Programada/En Camino) — ya no hay que cambiarlo a mano. `fn_crear_carga` acepta P.O. vacío SOLO si el estado tiene `exige_po=false` (Por Confirmar). `fn_emitir_factura` sigue exigiendo exactamente 'Entregada' (Revision/QC también bloquea la emisión).
**REGLA DURA — ZONA HORARIA (E41):** el servidor de Supabase corre en UTC y después de las 17:00 de Los Mochis `CURRENT_DATE` ya es el día siguiente. Toda lógica de fechas operativas usa `fn_hoy()` (America/Mazatlan), NUNCA `CURRENT_DATE`. Ojo: el barrido del resto de vistas (`v_tareas.atrasada`, `v_cxc_aging`, `v_cxp_proximas`) sigue pendiente en backend.

### CONTRATO VIGENTE tras E52 (2026-07-28) — fuente de verdad backend↔frontend

Cierre de E52. Estas firmas/columnas están **verificadas en vivo** y son las que consume el frontend hoy:

- **`v_catalogo_admin` — 20 columnas** (alimenta la tabla, el modal de edición Y la ficha de detalle de contrapartes en Directorio Comercial). Las 9 previas (`id, nombre, alias, clase, es_cliente, es_proveedor, dias_credito, nota, num_cargas`) **+ 11 nuevas**: `email, telefono_whatsapp, contacto_nombre, razon_social, rfc_tax_id, email_facturacion, direccion_facturacion, direccion_envio, ciudad, pais, paca_licencia`. Grant a `authenticated`, anon cerrado.
- **`v_catalogo_clientes` / `v_catalogo_proveedores` — 15 columnas** cada una (mismos campos de contacto/facturación que arriba, ya filtradas por rol). Son subconjuntos por rol; **NO reemplazan** a `v_catalogo_admin`, que es la única que trae todas las clases (comercial/operativo/gasto/socio) para la tabla general.
- **`fn_alta_contraparte` / `fn_editar_contraparte` — firmas ampliadas (18 params).** Además de los previos (`p_nombre/p_id, p_clase, p_es_cliente, p_es_proveedor, p_alias, p_dias_credito, p_nota`) aceptan: `p_email, p_telefono_whatsapp, p_contacto_nombre, p_razon_social, p_rfc_tax_id, p_email_facturacion, p_paca_licencia, p_direccion_facturacion, p_direccion_envio, p_ciudad, p_pais`. **`fn_editar_contraparte` es del bando `COALESCE` — `NULL = no tocar`** (el frontend solo manda lo que el usuario cambió; `''` para limpiar un campo que tenía valor). `fn_alta_contraparte`: vacío → null (no se setea).
- **`v_facturas` expone `cliente_email` y `cliente_id`** (habilita el botón "Enviar por correo" de Facturación; el `select=*` del frontend ya los trae).
- **`v_inventario`** — pipeline de inventario (módulo Inventario, solo lectura).
- **`v_liquidacion_ventas`** — líneas de GROSS SALES del borrador de liquidación al productor (módulo Liquidaciones).
- **`v_config`** — configuración por clave; la **leyenda PACA** de la factura vive en la clave `'factura_leyenda_paca'` (también claves `empresa_direccion` / `empresa_contacto` para el bloque de empresa de los documentos impresos, hoy opcionales — se pintan solo si existen).
- **`v_carga_detalle` y `v_ordenes_compra` traen `lote`** (LOTE capturable/visible en el frontend).

### Objetos nuevos de E54 (2026-07-28) — variedad de producto + documentos oficiales

Todos verificados en vivo antes de programar (patrón 42501=existe-protegida / PGRST202=no-existe).

- **Tablas nuevas:** `variedades` (producto_id, nombre) y `presentaciones` (calibre_tipo,
  calibre_valor, marca, es_reempaque — **aún vacía/sin enganchar a ningún flujo de captura**,
  siguiente bloque grande del plan). **Regla dura sin excepción:** el frontend NUNCA lee estas
  tablas directo, solo por vista/RPC — igual que `cargas`/`productos`/todo lo demás.
- **Columnas nuevas:** `cargas.variedad_id` (la asigna `fn_set_variedad_carga`, se lee vía
  `v_carga_detalle.variedad_id`/`variedad_nombre` — ver rule 9 arriba) y `productos.activo`
  (aún no consumida por el frontend — `v_catalogo_productos` no la expone).
- **RPCs nuevas:** `fn_alta_producto(p_nombre, p_codigo_item)`, `fn_alta_variedad(p_producto_id,
  p_nombre)`, `fn_set_variedad_carga(p_folio, p_variedad_id)` (folio + id o NULL = quitar).
- **Vistas nuevas:** `v_catalogo_variedades(id, producto_id, nombre)` — filtrar SIEMPRE por
  `producto_id`, es la ÚNICA lectura válida de variedades (no existe RPC de listado).
  `v_documento_invoice`, `v_documento_po`, `v_documento_quote` — una fila por documento
  (factura/orden/cotización respectivamente) con la dirección de la contraparte ya desglosada
  (herencia de la captura de direcciones de E53) y `lineas` en JSON `[{item, descripcion, qty,
  precio, total}]`, listas para armar el PDF sin texto libre inventado. Alimentan los botones
  "Generar/Descargar Invoice (PDF)" (Facturación), "Generar PO (PDF)" (Órdenes de Compra y la
  pestaña "orden" de Comercial) y "Generar Quote (PDF)" (Comercial, cotizaciones) — detalle del
  membrete compartido en REPORTE-FRONTEND.md.

### Objetos nuevos / cambios de E55 (2026-07-29)
Numeración oficial de documentos:
- Tabla documento_serie(tipo,anio,ultimo) (nace cerrada) + fn_siguiente_numero_doc(tipo).
- Columna numero en ordenes_compra y cotizaciones (NULL en Borrador; se llena en Enviada:
  PO-AAAA-#### / QT-AAAA-####; no se reasigna).
- fn_cambiar_estado_orden / fn_cambiar_estado_cotizacion asignan numero en Borrador->Enviada.
- Vistas v_documento_po/quote, v_ordenes_compra, v_cotizaciones exponen numero.
Captura guiada:
- v_contraparte_productos (productos por contraparte, derivada de programas+histórico; guía suave).
- v_programa_captura (bundle de precarga para "Nueva carga desde programa").
Limpieza: se borraron TODOS los documentos de prueba (facturas/OC/cotizaciones/liquidaciones
anuladas); contadores reseteados → primer documento real arranca en #1. Los 3 triggers de
inmutabilidad PACA se levantaron momentáneamente y se reactivaron en la misma transacción.
Catálogo: espárrago = 2 productos separados (9 convencional, 10 orgánico); variedad "Orgánico"
errónea del 9 removida (ver D-41).

### Objetos nuevos / cambios de E57–E61 (2026-07-30) — arranca la REESTRUCTURA

GATE de socios **aprobado el 30-jul-2026**. Modelo objetivo: **DOS EJES** — el **Sales Order**
manda lo comercial, el **Lote** manda el costeo, se cruzan en la **Carga** (ver D-45 en
`BITACORA-DECISIONES.md`). Plan A→B→C→D poblando el esqueleto que **YA existe** (no se
reconstruye — ver D-46). Detalle de fases en `PLAN-MAESTRO.md`, sección "REESTRUCTURA".

- **Catálogo (Fase A, COMPLETA):** `productos` 10→12 (Broccolini id 11, Plátano Thai id 12).
  `presentaciones` 0→45 filas (Jack Fruit 6, Papaya 7, Col de bruselas 6, Espárrago conv. 10,
  Espárrago org. 10, Broccolini 5, Plátano Thai 1) — **catálogo de REFERENCIA**, la operación
  hoy NO captura calibre/SKU por carga (el V8 de Samuel solo registra producto+color). Variedad
  redefinida a **cultivar botánico** (Maradol/Tainung/Intenzza/Vegas en papaya, 8 variedades en
  total): color/calibre/grado/orgánico son atributos de PRESENTACIÓN, no de variedad — ver D-44.
  Bell Pepper/Coco/Habanero siguen con su color en variedad (herencia histórica) hasta migrar,
  pendiente de datos de Samuel.
- **Partir la Carga (Fase B, en curso — atribución de costos al 88%, 220/251 líneas):**
  `cargas.presentacion_id` (nullable, FK `presentaciones`, todas las cargas en NULL por ahora —
  pendiente ligar, espera datos de Samuel). `carga_costos.contraparte_id` (nullable, FK
  `contrapartes`) resuelve costos multi-proveedor (el hoyo #1 de FMU01/P-025, que tenía 4
  proveedores reales en una sola carga). **Descubrimiento crítico (E60):** `cargas.proveedor_id`
  era un **cajón de sastre** — AGROFEPAC aparecía como proveedor de cargas cuya materia prima
  real era de Papayas & More o Las Brisas. La atribución por LÍNEA (no por carga) lo corrigió:
  Fletes→BBA(9), Aduanas→Suárez(49), In&Out→Agricooling(3) (inequívocos), Materia
  prima/Comisión/Cartón vía puente `id_v7`↔V8 (**NUNCA por folio** — 22 embarques tienen
  folio≠id_v7). Ver D-49. Pendiente: 31 líneas de costo residuales + ligar `presentacion_id`.
- **E59 — 3ª excepción acotada en `fn_chk_periodo_cerrado`:** un `UPDATE` en `carga_costos` que
  SOLO toca `contraparte_id` (nunca `concepto` ni `monto`) pasa en meses ya cerrados — mismo
  patrón que E36 (cajas) y E44 (texto). **Probado que sigue bloqueando cambios de monto.** Ver D-47.
- **E61 — vista nueva `v_cxp_proveedor_atribuido`:** CxP por proveedor real vía
  `carga_costos.contraparte_id` (costo exacto por línea). Nace **cerrada** (REVOKE anon/PUBLIC,
  GRANT authenticated). Costo exacto **$1,068,388.47**; pagado/saldo son **ESTIMADOS** por
  prorrateo (los pagos todavía están a nivel carga, no por línea). **Jubila conceptualmente**
  el parche `v_cxp_proveedor_real` (E56, que re-atribuía solo en lectura). **RESUELTO en E62:**
  el frontend (`modulo-pagos.js`) migró a `v_cxp_proveedor_atribuido` (se agregaron alias
  `pagado`/`saldo_cxp`), se desplegó, y **`v_cxp_proveedor_real` fue BORRADA** — ciclo cerrado.
- **Fase C (flujo documental SO→OC→Envío→Factura→Liquidación):** tablas existen, **VACÍAS**, no
  empezada. **Fase D (contabilidad automática):** no empezada.
- **E57 — descubrimiento del proceso real (junta de socios):** se recorrieron cargas reales
  (FMU01 multi-proveedor, trueque P&M, consignación, comisión pura). Hallazgo mayor: falta la
  entidad **"Acuerdo Comercial por contraparte"** que explica todos los parches actuales. Las 5
  variantes feas ya vistas (rechazo, reempaque, ajuste de precio, reembolso, reasignación) van
  como **Eventos de Carga** tipificados. El **Sales Order** queda como documento comercial
  central, con relación SO↔OC muchos-a-muchos (3 escenarios). Referencia de diseño: evaluación
  del "Silo" de Miguel (3 reuniones, 81 capturas) — patrones a robar: contraparte multi-rol,
  costo por línea con proveedor, prorrateo de gastos, catálogo de unidades estructurado, Credit
  Invoice tipificado, Settlement Calculator (margen objetivo), contabilidad de doble partida
  automática. Documento `Evaluacion_Silo_Patrones_ERP_Plein.docx` entregado.

### Objetos nuevos de E65 (2026-07-31) — C.1 Orden de Venta (backend; el frontend aún NO existe)
Sub-bloque **C.1** de la Fase C, construido en backend. El frontend de Órdenes de Venta todavía no
se programa (pendiente de Claude Code). Contrato que el frontend consumirá:

- **Vistas (lectura, solo `authenticated`):**
  - `v_sales_orders` — una fila por SO: `folio, estado, anulado, cliente_id, cliente,
    revenue_model_id, rm_codigo, revenue_model, formula_tipo, customer_po, cotizacion_folio,
    programa_id, programa, moneda, dias_credito, incoterm, comision_por_caja, pct_comision,
    precio_compra_caja, precio_venta_caja, n_cargas, cajas_asignadas_total, nota, capturado_por,
    capturado_ts, anulado_motivo, anulado_por, anulado_ts`.
  - `v_sales_order_cargas` — una fila por asignación SO↔carga: `id, so_folio, so_estado, cliente_id,
    cliente, carga_folio, carga_po, producto_id, producto, proveedor_id, proveedor, carga_cajas,
    cajas_asignadas, precio_caja, importe_asignado, nota, capturado_por, capturado_ts`.
- **RPCs (escritura, gate `capturar`):**
  - `fn_crear_so(p_cliente_id, p_revenue_model_id, p_customer_po, p_cotizacion_folio, p_programa_id,
    p_moneda, p_dias_credito, p_incoterm, p_comision_por_caja, p_pct_comision, p_precio_compra_caja,
    p_precio_venta_caja, p_nota)` → crea SO en Borrador, folio `SO-####`.
  - `fn_asignar_carga_so(p_so_folio, p_carga_folio, p_cajas_asignadas, p_precio_caja, p_nota)` →
    asigna cajas de una carga; devuelve `cajas_restantes_carga`. Guard: Σ cajas ≤ cargas.cajas.
  - `fn_desasignar_carga_so(p_so_folio, p_carga_folio)` → quita la asignación.
  - `fn_confirmar_so(p_folio)` → Borrador→Confirmada (exige ≥1 carga + params del modelo completos).
  - `fn_cerrar_so(p_folio)` → Confirmada→Cerrada.
  - `fn_cancelar_so(p_folio, p_motivo)` → Cancelada (motivo obligatorio; no desde Cerrada).
- **Params por Revenue Model** (`formula_tipo`): `comision_por_caja`→RM-001 (usa `comision_por_caja`);
  `pct_venta`→RM-003 (usa `pct_comision`); `margen`→RM-002 (usa `precio_compra_caja` +
  `precio_venta_caja`); `buy_resell`→RM-004 (sin params, deriva de costos). El backend rechaza
  params que no correspondan al modelo, y exige los requeridos al Confirmar.
- Estado del SO: `Borrador → Confirmada → Cerrada`, + `Cancelada`. Numeración interna `SO-####`
  (D-55). Diseño completo en BITACORA D-54/D-55.

## Conceptos de negocio clave
- **Carga** = unidad operativa central (folio P-0XX, PO, cliente, producto, modalidad margen_fijo/consignacion/comision, costos, cobros).
- **Comisión pura (E44)**: Plein NO compra el producto, solo cobra comisión (11 cargas Alpine). Costo 0 y margen 100% son correctos: el ingreso ES la comisión. NUNCA pedir su costo faltante.
- **Consignación**: el ingreso se reconoce al liquidar el cliente, no al embarcar (CRI INTERNATIONAL es consignación).
- **JEAMS** = préstamo de socio (pasivo, sin interés), cuenta virtual en tesorería.
- **Flags** = dudas parqueadas; una carga flageada no se modifica sin resolución.
- Egresos se almacenan con signo negativo en la base.

## Plan maestro
La hoja de ruta oficial (8 fases con checkboxes) vive en **`PLAN-MAESTRO.md`**. Léela al inicio de cada sesión y marca `[x]` con fecha cuando completes un punto. (Este bloque histórico se movió allí.)

## Diseño
Profesional y sobrio (es un ERP financiero): tipografía legible, densidad media, paleta actual del dashboard (verdes/ámbar/rojo para semáforos), responsive (los socios lo abren en celular). Mantener consistencia entre módulos: mismo header, mismo menú, mismo login.

## Coordinación con el backend
Cuando una fase necesite algo nuevo del backend (RPC, vista, tabla, Storage), NO improvisarlo: dejar anotado en un archivo PENDIENTES-BACKEND.md en la raíz qué se necesita y con qué firma, para que Miguel lo lleve a su sesión de claude.ai. El backend entregará lo pedido y se anotará aquí en CLAUDE.md.

## Reglas de negocio confirmadas (E39, 2026-07-23)

1. **CONSIGNACIÓN = NO HAY PRECIO DE VENTA hasta que el cliente liquida.** `ingreso_venta` se queda en 0 y `venta_esperada` en NULL. NUNCA llenar esos campos con cifras "esperadas" de una hoja de cálculo: eso inventa utilidad que no existe. La utilidad sale "—" hasta que el cliente reporte. En pantalla eso NO es una pérdida, es un dato que todavía no existe.
2. **El cartón SÍ es costo.** Evidencia: nunca ha entrado un ingreso por cartón al banco. Los 2 renglones del V7 que lo excluyen (P-043/1930 y P-047/1931) están mal; el ERP está bien. En 13 embarques el cartón está calculado a $1.90 por caja (tarifa de Samuel, no factura).
3. **`v_placeholders` tiene dos compuertas de confirmación** que sacan una carga de la lista sin tocar montos, escribiendo la etiqueta en `nota_revision`: `[VENTA=COSTO CONFIRMADO]` y `[COSTO 0 CONFIRMADO]`. La segunda es para las consignaciones puras de Alpine (Plein no compra la fruta → costo 0 correcto).
4. **La fila `seccion='Cuadre'` de `v_balance` DEBE dar 0.00 siempre.** En E39 se encontró y cerró una fuga de 1,573.04. Si vuelve a dar otra cosa, hay fuga contable: PARAR y avisar al chat de backend.
5. **GATE 4 — excepción de movimientos (E44):** UPDATE en `movimientos` de un mes cerrado se permite SOLO si cambia únicamente `descripcion` y/o `nota`. `tipo` queda FUERA a propósito (cambiar tipo puede mover el P&L) → reclasificar movimientos de meses cerrados EXIGE reabrir el mes.
6. **Clases de contraparte:** las válidas son `comercial | operativo | gasto | socio`. NO existe clase "proveedor"; cliente/proveedor se distingue con las banderas `es_cliente` / `es_proveedor`. Los productores se dan de alta como `comercial` + `es_proveedor=true` (igual que Akambarhu, Cornejos, Agrofepac).
7. **Módulo Proyectos (E44, VIVO):** tablas `proyectos_productor`, `proyecto_amortizaciones` (dispuesto/recuperado → saldo_vivo), `proyecto_flujo_plan` (plan sembrado) y `presupuesto` (lo que consume la pantalla). **Actualización E46/D-16: NO se unifican** — plan de flujo (tesorería del proyecto, mes a mes) y presupuesto (gastos blandos discrecionales) son preguntas de negocio distintas; se quedan como tablas separadas a propósito (Opción B). Tipo de movimiento `Anticipo a productor` (grupo financiamiento, `afecta_pl=false`) = salida de banco que es ACTIVO recuperable, no gasto. `fn_registrar_amortizacion` valida que la disposición no exceda la línea.

## Anclas y cambios recientes (backend)

**ANCLAS AL CIERRE DE E66 (2026-07-31) — sesión más reciente:** CxC 595,807.09 · CxP 510,115.14 · Cuadre 0.00 · JPM 6,875.93 · JEAMS −52,872.00 · movs_jpm 268 · folio_max_jpm 374 · aplicaciones 186 · cargas 82 vivas · flags 1 · revenue_models 4 · sales_orders 0 · sales_order_cargas 0 · folio_max_sales_order 0 · **evento_tipos 5 · eventos_carga 0** · seg_anon/seg_escritura/seg_auth 0/0/0. E66 = 100% backend (DDL): se construyó **C.1b Eventos de Carga** (2 tablas, 2 vistas, 2 RPCs, 2 triggers) y en paralelo el **frontend de C.1 Órdenes de Venta** (Claude Code: `modulo-ventas.js`, en prod). NINGÚN dato de dinero se movió — anclas EXACTAS a E65. Ver D-56.

### Objetos nuevos de E66 (2026-07-31) — C.1b Eventos de Carga (backend) + frontend C.1 Órdenes de Venta
- **Tablas:** `evento_tipos` (catálogo, 5 filas, banderas `exige_cajas/monto/contraparte/so_destino`) · `eventos_carga` (append-only, ancla `carga_folio`, refs opcionales a SO/asignación y a `movimiento`/`carga_costo`/`aplicacion` por id). Nacen cerradas (RLS + REVOKE anon/authenticated).
- **Vistas (SELECT authenticated):** `v_evento_tipos` (dropdown) · `v_eventos_carga` (lista con PO, cliente, producto, tipo, contraparte).
- **RPCs (gate capturar/editar):** `fn_registrar_evento_carga(p_carga_folio,p_evento_tipo,p_nota,[p_fecha,p_cajas,p_monto,p_contraparte_id,p_so_folio,p_sales_order_carga_id,p_so_destino_folio,p_ref_movimiento_folio,p_ref_carga_costo_id,p_ref_aplicacion_id])` · `fn_anular_evento_carga(p_id,p_motivo)`.
- **Triggers:** `trg_evento_valida` (banderas por tipo) · `trg_evento_inmutable` (sólo se anula; no se edita/borra).
- **Regla (D-56):** el evento SÓLO registra; el dinero fluye por las RPCs existentes y se referencia por id. Fase D leerá estos eventos para el asiento.
- **Frontend C.1 (Claude Code, prod):** `modulo-ventas.js` (ruta `ventas`, menú "🧾 Órdenes de Venta"), consume `v_sales_orders`/`v_sales_order_cargas`/`v_revenue_models`; sección "Órdenes de venta" en el Expediente (`ERP.montarVentasCarga`). Sin PDF/correo (SO interno). Límites: sin `fn_editar_so`; `p_programa_id` siempre null (falta vista con el id del programa) — ver PENDIENTES-BACKEND.md.

**ANCLAS AL CIERRE DE E65 (2026-07-31) — sesión más reciente:** CxC 595,807.09 · CxP 510,115.14 · Cuadre 0.00 · JPM 6,875.93 · JEAMS −52,872.00 · movs_jpm 268 · folio_max_jpm 374 · aplicaciones 186 · cargas 82 vivas (89 totales) · flags 1 · revenue_models 4 · **sales_orders 0 · sales_order_cargas 0 · folio_max_sales_order 0** · **seg_anon/seg_escritura/seg_auth 0/0/0**. E65 = sesión 100% backend (DDL): se construyó **C.1 Orden de Venta** (2 tablas, 6 RPCs, 2 vistas, 2 triggers). NINGÚN dato de dinero se movió — las anclas quedan EXACTAS a E64. Nota: E63 y E64 no dejaron bloque de anclas propio aquí (el salto E62→E65 es real); catálogos —contrapartes 72, costos 231/254, productos 12, presentaciones 45, variedades 8— sin cambio desde E64. Detalle de diseño en BITACORA D-54/D-55.

**ANCLAS AL CIERRE DE E62 (2026-07-30):** CxC 595,807.09
· CxP 510,115.14 · Cuadre 0.00 · JPM 6,875.93 · JEAMS −52,872.00 · movs_jpm 268 · folio_max_jpm 374
· aplicaciones 185 · cargas 82 vivas (de 89 totales) · flags 1 (P-089) · contrapartes 72 (alta BAJA
PLANTS id 89) · costos atribuidos 228/253 (90%) · PRJ-005 dispuesto 8,350.00 · productos 12 ·
presentaciones 45 · variedades 8 · **seg_anon/seg_escritura/seg_auth 0/0/0**. E62: candado de
seguridad (variedades/presentaciones/documento_serie cerradas), sync V8→ERP (2 cargas nuevas
P-088/P-089, 6 movs Chase 369-374, JPM baja de 41,214.93), cierre honesto de residuales (228/253 +
25 documentadas con motivo), alias pagado/saldo_cxp en v_cxp_proveedor_atribuido y **DROP de
v_cxp_proveedor_real** (frontend ya migrado, ciclo cerrado). Spec de socios "Revenue Models"
recibida y ubicada en Fase C.0 (ver PLAN-MAESTRO y D-50). Detalle en BITACORA D-50 a D-53.

**ANCLAS AL CIERRE DE E61 (2026-07-30):** CxC 595,807.09
· CxP 534,578.14 · Cuadre 0.00 · JPM 41,214.93 · JEAMS −52,872.00 · productos 12 · presentaciones
45 · variedades 8 · contrapartes 71 · cargas 87 (80 vivas) · costos atribuidos 220/251 (88%) ·
seg_anon/seg_escritura 0/0. GATE de socios de la REESTRUCTURA aprobado 30-jul-2026 (dos ejes,
Fases A–D — ver sección arriba y `PLAN-MAESTRO.md`).

**ANCLAS AL CIERRE DE E48 (2026-07-27):** JPM 41,214.93 · JEAMS −52,872.00 (deuda contable 162,639) · folio_max_jpm 368 · fecha_max 2026-07-24 · movs_jpm 262 · aplicaciones 180 · 80 cargas vivas · flags 0 · CxC 595,807.09 · CxP 534,578.14 · utilidad neta +2,557.86 · CUADRE 0.00 · seg_anon 0 · seg_escritura 0 · Anticipos a productores 31,180.00 · Financiamiento externo 30,000.00 · Pasivo a socios 6,721.81 · Partidas por aplicar −3,278.19 · PRJ-001 tasa 6.2% dispuesto 25,000.00 · contrapartes 81 (Las Brisas/id 67 neutralizada, fusionada en AGROFEPAC/id 4 — ver D-30) · clientes 17 · 13 programas comerciales · modalidades 51 margen_fijo / 16 consignación / 13 comisión · **infra: 76 RPCs · 101 vistas** · periodos dic-25 a jun-26 CERRADOS, julio abierto. Sin cambios de dinero en E48 (sesión de higiene de datos + gestor de aplicaciones, no de captura).

**Cambios recientes (E57–E61) — REESTRUCTURA: GATE aprobado, atribución de proveedores 88%,
sin cambio de dinero:** ver detalle completo arriba en "Objetos nuevos / cambios de E57–E61".
Resumen: descubrimiento del proceso real (E57) → excepción de periodo cerrado para
`contraparte_id` (E59) → atribución masiva de proveedores por línea, 220/251 (E60) → vista
`v_cxp_proveedor_atribuido` + cierre de sesión (E61). Decisiones de negocio en
`BITACORA-DECISIONES.md` D-44 a D-49. Próximos pasos y pendientes: ver sección
"Próximos pasos / pendientes" abajo.

**Cambios recientes (E56) — trueque Papayas & More + re-atribucion CxP (2 vistas de lectura,
sin cambio de dinero, anclas intactas):**
- v_papm_diferencial (read-only, authenticated): diferencial informativo del trueque P&M (id
  40). Filas: Yaka nos deben 377,567.70 / papaya les debemos 159,982.00 / reembolso logistica
  de sus cargas 169,221.80 / participacion 50/50 (comision) 21,014.57 / DIFERENCIAL NETO
  27,349.33. Opcion B: informativa, NO netea, NO toca anclas.
- v_cxp_proveedor_real: **BORRADA en E62** (era el parche E56; el frontend migró a
  v_cxp_proveedor_atribuido). [Descripción histórica: re-atribuía en lectura AGROFEPAC->P&M; P&M
  159,982 -> 350,218.37. Total reconcilia a CxP 534,578.14. NO muta datos (respeta meses
  cerrados). El frontend (modulo-pagos.js) ya la consume en el resumen "Saldo por proveedor".
- Anclas E56 (sin cambio): JPM 41,214.93 / JEAMS -52,872.00 / CxC 595,807.09 / CxP 534,578.14
  / Cuadre 0.00 / seg 0/0 / 80 cargas (87) / 180 aplicaciones / movs_jpm 262 / contrapartes 70.

**Cambios recientes (E54) — variedad de producto + documentos oficiales (frontend desplegado 2026-07-28):**
- **Variedad de producto, backend:** tablas `variedades`/`presentaciones` (presentaciones sin enganchar aún), columnas `cargas.variedad_id`/`productos.activo`, RPCs `fn_alta_producto`/`fn_alta_variedad`/`fn_set_variedad_carga`, vista `v_catalogo_variedades` y `v_carga_detalle` ampliada con `variedad_id`/`variedad_nombre`. Ver "Objetos nuevos de E54" arriba (lista exacta).
- **Documentos oficiales:** `v_documento_invoice`, `v_documento_po`, `v_documento_quote` — nuevas, una fila por documento con dirección de contraparte ya desglosada (herencia de E53) y `lineas` en JSON. Ver detalle arriba.
- **Decisiones de negocio de la sesión** (backend, ver `BITACORA-DECISIONES.md` D-35 a D-39): la variedad se separa del nombre del producto; Espárrago pasa a ser 1 producto con variedades Convencional/Orgánico (P-058 confirmada Convencional; fusión histórica de las 7 orgánicas queda PENDIENTE porque P-059 cae en junio, ya cerrado); Las Brisas (67) = AGROFEPAC (4) también por RFC de persona física (refuerza D-30); Presentaciones modela el calibre con `calibre_tipo`+`calibre_valor` texto para no forzar un solo tipo de dato.
- **Frontend (Claude Code, 2026-07-28):** selector de Variedad dependiente del producto en Nueva carga y Editar carga (`modulo-cargas.js`, precarga + guarda solo si cambió); mini-pantalla de catálogo con alta de producto (+"Código de ítem") y variedad (`modulo-catalogos.js`); documentos oficiales Invoice/Purchase Order/Quote con membrete compartido (`exportar.js`: `ERP.membreteOficial`/`pieOficial`/`tablaLineasDoc`/`bloqueEmpresaPlein`) — header claro + logo + acento salvia + footer verde + leyenda PACA en Invoice. Se encontró y corrigió de paso un bug de layout en `.inv-totals`/`.inv-comments` (`estilos.css`) que afectaba también al Invoice ya desplegado. Detalle completo en REPORTE-FRONTEND.md.

**Cambios recientes (E48):**
- **Módulo backend nuevo "Gestor de Aplicaciones":** `fn_aplicar_a_carga(p_mov_folio, p_carga_folio, p_monto, p_nota)` [gate `editar`] y `fn_desaplicar(p_aplicacion_id, p_motivo)` [gate `editar`], vista `v_movimiento_aplicaciones`. La guarda `chk_aplicacion` y el candado de mes cerrado operan solos (a nivel de tabla/trigger); las RPCs solo suman el gate de capacidad + bitácora encima. Invariantes: `fecha` de la aplicación = fecha del movimiento (no se captura aparte); `monto > 0`; si `campos_antes` sale NOT NULL en la bitácora → `{"alta": true}`. Frontend ya lo consume (sección "Aplicaciones" del modal Editar movimiento, ver REPORTE-FRONTEND.md).
- **A-02 resuelto:** la base entera quedó SIN `current_date` fuera de `fn_hoy()` — D-08 ahora cubre TODA la superficie (antes solo las vistas; las 5 funciones que faltaban ya están corregidas).
- **A-03 resuelto:** Las Brisas Produce (id 67) fusionada en AGROFEPAC (id 4); 67 neutralizada. Ver D-30 (completa y actualiza D-29, que había cerrado A-03 como "solo duplicado no accionable").
- **Confirmado el bando de RPCs `fn_editar_*`:** `fn_editar_carga` y `fn_editar_contraparte` SON `COALESCE` ("NULL = no tocar") — mismo bando que `fn_editar_proyecto`/`fn_editar_programa` (ver "Trampas de API" arriba).
- **Hallazgos menores — RESUELTOS en E49:** `fn_editar_contraparte` ahora SÍ escribe `bitacora_ediciones` (diff antes→después + actor, motivo fijo, solo si hay cambio real); `fn_reporte_semanal_texto` quedó blindada contra NULL (COALESCE en cada `to_char`/escalar + `RETURN COALESCE`).
- **Aclaración dinero de José/JEAMS (dos cubetas, ver D-32):** cuenta virtual JEAMS (folios 9001-9008) = pagos directos a proveedor que NUNCA pasaron por el banco; movimientos JPM tipo "Inversión" (folios 107-118, 359-360; **ojo, el 112 es un retiro, no aportación**) = capital que SÍ se depositó al banco, las "Aportaciones" de la pestaña V7-Traspasos. Ambas son préstamo de socio (pasivo), ninguna es ingreso.

**Cambios recientes (E52) — Directorio comercial enriquecido, botón correo, inventario, liquidaciones, LOTE, leyenda PACA (frontend desplegado 2026-07-28):**
- **Contrapartes:** `v_catalogo_admin` pasó de 9 a **20 columnas** (11 campos de contacto/facturación al final) y `fn_alta_contraparte`/`fn_editar_contraparte` ampliaron a **18 params**. `v_catalogo_clientes`/`v_catalogo_proveedores` = 15 columnas (subconjuntos por rol). Ver el "CONTRATO VIGENTE tras E52" en la sección de Vistas/RPCs arriba (lista exacta de columnas y params + convención `NULL=no tocar` en edición).
- **`v_facturas` ganó `cliente_email` y `cliente_id`** — insumo del botón "Enviar por correo" de Facturación.
- **Nuevas vistas de módulo:** `v_inventario` (pipeline, solo lectura), `v_liquidacion_ventas` (GROSS SALES del borrador de liquidación al productor). `v_config` sirve la **leyenda PACA** de la factura por la clave `'factura_leyenda_paca'`.
- **LOTE:** `v_carga_detalle` y `v_ordenes_compra` exponen `lote` (capturable/visible en el frontend).
- **Frontend (Claude Code, 2026-07-28):** botón "Enviar por correo" en Facturación (mailto interino + descarga del PDF para adjuntar), alta/edición de contraparte con los 11 campos agrupados (Contacto/Facturación/Direcciones) + **ficha de detalle de contraparte** (solo lectura, todos los roles, con botón de correo a `email_facturacion`/`email`), módulos Inventario y Liquidaciones (GROSS SALES + deducciones por categoría estilo STESAN), LOTE, leyenda PACA al pie de la factura, y **estándar visual unificado de los documentos impresos** (verde de marca **#196B24**, header logo+empresa, colgroup de INVOICE). Detalle en REPORTE-FRONTEND.md.

**Cambios recientes (E49) — sync backend, sin cambio de dinero (los deltas ya estaban dentro de anclas previas):**
- **`v_carga_detalle` pasó de 44 a 47 columnas:** `cliente_id, proveedor_id, producto_id` al final (aditivas; nada existente cambió de nombre ni orden). Habilita que "Editar embarque" compare/mande por id en vez de por nombre normalizado (migración frontend pendiente, no urgente — ver PENDIENTES-BACKEND.md).
- **`v_balance` pasó de 16 a 17 filas** (ver rule 9 arriba): nuevo renglón de Patrimonio "Ajuste bancario reconocido (sin par)" (+21.81), con "Partidas por aplicar" ahora en −3,300.00 limpia. TOTAL PATRIMONIO sigue en −720.33 (el +21.81 ya estaba dentro del −3,278.19 anterior; solo se separó). **Resuelve A-04.**
- **`fn_liquidar_consignacion`** (la del botón "Capturar venta"): `p_estado_final=null` sigue siendo "no tocar estado", y AHORA **rechaza declarar una venta menor a lo ya cobrado** — el frontend muestra ese error del backend tal cual vía el manejador existente; no requirió cambio de UI.

**Cambios recientes (E45/E46):**
- **Cuenta virtual SAMUEL** (excluida del banco en `v_balance`): para dinero que un socio pone de su propio bolsillo. Nunca se mezcla con JPM/Chase, para no romper la conciliación bancaria — mismo patrón que ya existía para JEAMS.
- **`v_dias_pago_observado`** (nueva): días de crédito contratado vs observado vs gap por cliente, sobre embarques cobrados completos. Insumo del futuro flujo proyectado 30/60/90.
- **PRJ-005 re-sembrado** con modelo "3 contratos" (single-layer; pico de exposición −78,820). La partición `plein`/`santana` del modelo anterior (D-15, E44) resultó ser el error de modelado — hoy ningún proyecto usa una segunda capa.

**Cambios recientes (E47):**
- **Días de crédito reales por cliente**, capturados del panorama comercial: Northgate 30 (21+cheque), Crystal Valley 21 (pick&pack), CRI 15 (wire), Alpine 15. Reemplazan la suposición uniforme de 15 días.
- **Altas de contraparte:** Tropical Specialist (id 80) y Costatropical Papayas Inc (id 81, clase `operativo`, proveedor de servicio de reempaque — **NO** es Papayas & More, id 40; son entidades distintas).
- **Módulo comercial "Programas"** (backend): tabla `programas_comerciales` (13 filas, PC-001..PC-013, una por cliente × producto × proveedor × modalidad; columna `etiqueta` NOT NULL es el nombre legible, el código PC-### es la llave estable que nunca cambia; también `producto_ids`, `venta_tipica_carga`, `cajas_tipicas_carga`). Columna `cargas.programa_id` (NO contable) con backfill de 66 de 80 cargas y trigger `tg_cargas_programa` que auto-liga cargas nuevas vía `fn_match_programa` (match determinista por cliente+proveedor+producto+temporada; NULL si hay ambigüedad, nunca adivina). Vistas `v_programas_comerciales`, `v_programas_proyeccion`, `v_programa_cargas`, `v_cargas_programa`. RPCs `fn_crear_programa`, `fn_editar_programa`, `fn_ligar_carga_programa`, `fn_match_programa`, `fn_etiqueta_sugerida`. `v_agenda_operativa` ganó la regla 8 `'programa_sin_carga'` (programa activo en ventana sin carga al ritmo esperado).
- **`v_balance` ganó la línea 16** "Financiamiento externo (back-to-back, con tasa)" — ver rule 9 arriba. Separada de la deuda JEAMS porque el back-to-back sí causa interés (tasa 6.2% anual en `PRJ-001.tasa_anual` desde el 24-jul-2026).
- **Frontend (Claude Code, 2026-07-25 a 27):** módulo nuevo "Programas" (lista + proyección anual + real por programa), captura completa (alta/edición/ligar-desligar de programas), alta de Proyectos, chips de programa en Embarques y Expediente, y bugfix del filtro por bloque (comparación string-vs-number). Detalle completo en REPORTE-FRONTEND.md.
- **Captura financiera del 24-jul:** movs 363-368 (back-to-back +30,000 · Crystal +44,040 · Agrofepac −10,000 · Akambarhu −20,600 · BBA −3,250 · Suarez −50), tasa 6.2% sembrada en PRJ-001, ajuste de TC de los 77,000 MXN (ver D-24), disposición de 20,600 y FIFO de Crystal + aplicación directa a P-080.

## Próximos pasos / pendientes (al cierre de E61, 2026-07-30 — E62 por arrancar)

- **Sincronización V8→ERP** (sesión dedicada, **toca dinero** — no es de higiene): 2 cargas
  nuevas (P-084, P-085) + movimientos (CxC +$23,387, CxP −$25,270). Cotejo banco→V7→ERP **por
  P.O., nunca por folio** (regla 11 arriba). **RESUELTO en E62:** las líneas residuales quedaron en 228/253 (8 atribuidas con dato V8, 25
  documentadas con motivo: 17 cartón interno, 4 comisión AGROFEPAC sin V8, 2 flagged Akambarhu, 2
  anuladas). PENDIENTE aún: atribuir **pagos** por línea (hoy a nivel carga; por eso
  `v_cxp_proveedor_atribuido` da pagado/saldo estimados por prorrateo — 49 cargas multi-proveedor,
  requiere criterio caso por caso, NO cerrable en una sola sesión).
- **Ligar `cargas.presentacion_id`** — espera datos de Samuel (calibres reales por producto).
  Variedades faltantes: captura progresiva. Bell Pepper/Coco/Habanero siguen sin presentaciones.
- **Fase C** (flujo documental SO→OC→Envío→Factura→Liquidación): tablas existen vacías, no
  empezada. **Fase D** (contabilidad automática): no empezada.
- **Frontend:** ~~reapuntar `modulo-pagos.js` a `v_cxp_proveedor_atribuido`~~ **HECHO en E62**
  (migrado, desplegado, con ⓘ de "estimado por prorrateo"; vieja vista borrada). Pendiente aún:
  rediseño visual Fase 3 (dirección acordada en E57, mockup de
  Embarques como referencia — Fase 3 NO inventa estilos nuevos, usa los ya existentes). Detalle
  en `REPORTE-FRONTEND.md`.
- **Opción A del trueque Papayas & More** (neteo formal, ver D-42): pendiente de Samuel — gap V7
  Yaka 31,000 (P-079/P-080 en tránsito) y arrastre papaya 2025 31,294.44.

## Trampas de API (leer antes de programar encima)

Contratos de RPC que NO son simétricos entre sí — asumir que "todas se comportan igual" produce
bugs de captura silenciosos. Confirmar aquí antes de escribir código nuevo encima de cualquiera:

- **`fn_capturar_mov` NORMALIZA el signo del egreso** (si mandas positivo, el backend lo vuelve
  negativo solo). **`fn_editar_movimiento` hace LO CONTRARIO:** rechaza un egreso positivo (hay
  que mandarlo ya en negativo), exige TODOS los parámetros (solo `p_forzar` tiene default),
  interpreta `NULL` como **0** — **NO** como "no tocar" — y **RECHAZA `contraparte` NULL** aunque
  el movimiento ya la tenga así guardada. Dos RPCs de movimientos, dos contratos de signo y de
  NULL completamente distintos.
- **`fn_editar_proyecto` / `fn_editar_programa` / `fn_editar_contraparte` SÍ usan
  `COALESCE(param, actual)`:** ahí `NULL` = "no tocar", el contrato inverso al de
  `fn_editar_movimiento`. Antes de tocar cualquier RPC `fn_editar_*` nueva, confirmar de cuál de
  los dos bandos es — no se puede asumir por el nombre.
- **`fn_capturar_mov` NO aplica FIFO automáticamente.** La aplicación a cargas es un paso
  explícito y separado (`fn_aplicar_fifo` o el INSERT directo de abajo); capturar un movimiento
  nunca mueve saldos de CxC/CxP por sí solo.
- **Aplicar un pago a una carga ESPECÍFICA (E48): ya tiene RPC propia.** `fn_aplicar_a_carga
  (p_mov_folio, p_carga_folio, p_monto, p_nota)` — reemplaza el INSERT directo a `aplicaciones`
  que este archivo documentaba antes (ya NO hacer el INSERT a mano). Gate **`editar`**, igual que
  `fn_aplicar_fifo` — mover saldos de CxC/CxP es la misma clase de operación sin importar si es
  FIFO o dirigido a una carga puntual (ver D-31). Para deshacer una aplicación: `fn_desaplicar
  (p_aplicacion_id, p_motivo)`, mismo gate. Ambas leen/escriben con la vista
  `v_movimiento_aplicaciones`. Invariantes: `fecha` de la aplicación = fecha del movimiento
  (no se captura aparte); `monto > 0`; `p_nota`/`p_motivo` obligatorios.
