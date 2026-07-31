# AUDITORÍA DE FRONTEND — A3 (2026-07-27)

Diagnóstico, no corrección: **no se modificó ningún .js/.css y no hubo deploy**.
Cobertura: contratos (1), código muerto (2), fetches (3), errores (4), móvil (7), accesibilidad (8).
**Faltan por correr: consistencia entre módulos (5) y gating por rol (6)** — ver PENDIENTE al final.

`✓` = confirmado leyendo el código en esta sesión. Sin marca = detectado en barrido, verificar antes de tocar.

---

## CRÍTICO

### F-01 ✓ La "Posición neta" del Inicio se pinta MAL si falla `v_deuda_jeams`
- **modulo-inicio.js:164** (se usa en :173-174, se muestra en :227-228)
- repro: bloquea `v_deuda_jeams` y recarga Inicio → "Deuda JEAMS −0.00" y la Posición neta sube ~52,872 sin aviso.
- fix: quitar el `.catch(() => [])` para que `despachar()` muestre el errbox.
- esfuerzo: S · *el mismo `Promise.all` ya comenta que `v_panel_hoy` NO debe enmascararse; a `jeams` no se le aplicó el criterio.*

---

## ALTO

### F-02 ✓ El PDF del Expediente lee la vista JUBILADA `v_carga_documentos` y se traga el fallo
- **exportar.js:254** (y `dc.tipo` en :259, del esquema viejo) — el resto de la app ya migró a `documentos`/`v_documentos` en E37; este export se quedó atrás.
- repro: sube un documento a un embarque y exporta "Expediente PDF" → siempre dice "Sin documentos adjuntos".
- fix: `q('v_documentos', '&entidad=eq.carga&entidad_id=eq.'+folio)`, mapear `dc.categoria` (no `dc.tipo`) y borrar el mapa `TL` de :255; propagar el error en vez de `catch (_) { docs = [] }`.
- esfuerzo: M · **columnas verificadas en vivo:** `entidad, entidad_id, categoria, nombre_archivo, storage_path, referencia_externa` existen; **no hay `anulado`** (la vista ya los excluye), así que no hace falta filtrar. *Documento que va a cliente/banco afirmando que no hay adjuntos cuando sí los hay.*

### F-03 ✓ Cuentas por Pagar: los DOS fetches primarios están enmascarados
- **modulo-pagos.js:107-110**
- repro: bloquea `v_cxp_proveedor`/`v_cxp_proximas` y abre CxP → dice que no hay nada por pagar, sin error.
- fix: eliminar ambos `.catch(() => [])` y dejar que `despachar()` pinte el errbox.
- esfuerzo: S

### F-04 ✓ Expediente: costos y aplicaciones enmascarados → embarque con costo cero
- **modulo-expediente.js:28-29**
- repro: bloquea `v_carga_costos_det` y abre un Expediente → costo 0 y sin total; el PDF (exportar.js:212) hereda el cero.
- fix: quitar esos dos `.catch(() => [])`; la ficha clásica (modulo-cargas.js:63-64) ya los pide sin catch.
- esfuerzo: S · *asimetría real: dos pantallas del mismo dato con criterio opuesto.*

### F-05 ✓ Tesorería: el estado de cuenta completo se silencia si falla `v_estado_cuenta`
- **modulo-tesoreria.js:686**
- repro: bloquea `v_estado_cuenta` → sección principal vacía y selector de cuenta vacío (se deriva de `movs`, :698-700), sin aviso.
- fix: quitar el `.catch(() => [])` — es el dato primario del módulo, no enriquecimiento.
- esfuerzo: S · *dos líneas abajo el código SÍ justifica por comentario el catch de `v_bitacora_movimientos`; el criterio existe, solo no se aplicó al dato primario.*

### F-06 ✓ Antigüedad de saldos: la pestaña entera se enmascara
- **modulo-antiguedad.js:233-234**
- repro: bloquea la vista de resumen y cambia de pestaña CxC/CxP → pirámide vacía, nunca un mensaje de error.
- fix: quitar los `.catch(() => [])` y envolver `pintarTab` en try/catch que escriba errbox en `#agingBody`.
- esfuerzo: S

### F-07 ✓ Ficha de Proyecto: amortizaciones y movimientos enmascarados
- **modulo-proyectos.js:214 y :216**
- repro: bloquea `v_proyecto_amortizaciones` y abre PRJ-001 → libro dispuesto/recuperado vacío, saldo vivo sin respaldo visible.
- fix: quitar el `.catch(() => [])` de esas dos (núcleo financiero del proyecto, no secciones opcionales).
- esfuerzo: S · *8 de los 10 fetches de esa ficha llevan catch; el patrón se aplicó en bloque sin separar núcleo de opcional.*

### F-08 El buscador universal queda en ~134px en celular y sus resultados son ilegibles
- **estilos.css:66-91** (`.buscador{flex:1}` / `.resultados{left:0;right:0}`) + index.html:36-48
- repro: en 375px el header deja ~134px al buscador; `.res-item .t/.s` truncan con ellipsis casi todo.
- fix: bajo 620px colapsar "Actualizar"/"Salir" a íconos y dar a `.resultados` `left:12px;right:12px;position:fixed`.
- esfuerzo: M

### F-09 Embarques: 17 columnas con scroll horizontal y sin columna Folio fija
- **modulo-cargas.js:969-1021** (thead :971-979)
- repro: en 375px desliza la tabla a la derecha para ver Utilidad/Margen/CxC → Carga y P.O. salen de pantalla; ya no se sabe de qué embarque es la cifra.
- fix: `position:sticky;left:0;background:var(--tarjeta);z-index:1` en `td/th:nth-child(2)`.
- esfuerzo: S

### F-39 ✓ "Cancelar tarea" visible para rol captura, pero `fn_cancelar_tarea` exige admin
- **modulo-tareas.js:389** (`puedeCap && t.estado !== 'cancelada'`), RPC en :458
- repro: entra como Samuel (captura), abre cualquier tarea activa → se ve el botón rojo "Cancelar tarea"; al confirmarlo el backend rebota.
- fix: cambiar la condición a `ERP.puede('administrar') && t.estado !== 'cancelada'`.
- esfuerzo: S · *evidencia: PENDIENTES-BACKEND.md:211 y :213 — "crear/editar/estado/asignar/comentar = capturar; **cancelar = admin**".*

### F-40 ✓ "Cancelar orden" gateado a `capturar` cuando `fn_anular_orden` exige `administrar`
- **modulo-ordenes.js:419** (`const activo = puedeCap && !o.anulado`) → botón en :453, RPC en :525
- repro: entra como Samuel (captura), abre una orden de compra → se ve "Cancelar orden" (pide motivo y luego falla).
- fix: **no tocar `activo`** — también gatea "Avanzar a X", que sí es `capturar`; añadir un `puedeAnular = ERP.puede('administrar')` aparte, solo para `ocCancelarDoc`.
- esfuerzo: S · *evidencia: PENDIENTES-BACKEND.md:275 ("anular → administrar, verificado con los 3 roles"); modulo-comercial.js:279 ya lo hace así para la misma RPC.*

### F-44 ✓ El helper compartido `ERP.fecha` viola la regla `DD-mmm-YYYY` de CLAUDE.md
- **comun.js:146** usa `year:'2-digit'` → pinta `23 jul 26`. Tres módulos escribieron su propio `fecha4` con el formato correcto: **modulo-facturas.js:19 · modulo-ordenes.js:21 · modulo-tareas.js:16**.
- repro: compara la fecha en Embarques (`23 jul 26`) con la de Facturación (`23-jul-2026`) — mismo dato, dos formatos.
- fix: mover el cuerpo de `fecha4` a `ERP.fecha` y borrar las 3 copias locales.
- esfuerzo: M · **ojo al alcance:** toca las ~16 pantallas que usan `ERP.fecha` **y los exports Excel/PDF**; es el fix correcto, pero conviene revisarlo a ojo antes de desplegar.

### F-45 ✓ Inicio mezcla montos con y sin `$` en la misma columna
- **modulo-inicio.js:226-227** (`−${ERP.fmt(x)}` en vez de `usd()`)
- repro: en Inicio → "Posición": CxC sale `$639,847.09`, y justo debajo CxP `−544,578.14` y JEAMS `−162,639.00` sin `$`, contra el total que sí lo lleva.
- fix: reemplazar `−${ERP.fmt(x)}` por `usd(-num(x))` en ambas filas.
- esfuerzo: S

### F-46 ✓ "Exportar" en CxC/CxP baja solo la primera tabla de la pantalla, sin avisar
- **modulo-cobranza.js:100 · modulo-pagos.js:113** (pasan `''` como selector)
- repro: exporta a Excel desde Cuentas por Cobrar → el archivo trae solo "Saldo por cliente"; faltan las otras 2 tablas y nada lo indica.
- fix: dar `id` a cada tabla y usar `ERP.botonesExportarVarias` con el contenedor, como hace Finanzas con el Balance.
- esfuerzo: M · *verificado: con selector vacío `resolverTabla` (exportar.js:32) cae a `#modContenido table` — la primera; Cobranza tiene 3.*

### F-47 Cobranza y Pagos pintan `$0.00` donde Antigüedad pinta "—", con el mismo dato
- **modulo-cobranza.js:29-30 · modulo-pagos.js:28-29** vs **modulo-antiguedad.js:32** (que sí tiene un helper local `dinero`)
- repro: en el drill-down de un cliente de consignación, Venta y Cobrado salen `$0.00`; la misma carga en Antigüedad sale "—".
- fix: subir `dinero` a comun.js (p. ej. `ERP.usdOGuion`) y usarlo en las tres pantallas.
- esfuerzo: S · *viola la regla "dato faltante = —, nunca $0.00": comunica un cero que no existe.*

### F-48 Cotizaciones/Órdenes usa moneda hecha a mano: negativos `$-1,234.56` y NULL como `$0.00`
- **modulo-comercial.js:54** (`monto()` propio; no destructura `usd`)
- repro: un total negativo sale `$-1,234.56` en vez de `−$1,234.56`, y un NULL sale `$0.00` (líneas 297, 298, 324, 325, 333, 688 y el PDF).
- fix: `const monto = (n, moneda) => n == null ? '—' : usd(n) + (moneda && moneda !== 'USD' ? ' ' + esc(moneda) : '')`.
- esfuerzo: S

### F-49 Factura borrador sin cajas muestra Total `$0.00` en vez de "—"
- **modulo-facturas.js:78** (y :319 tfoot, :575)
- repro: `fn_crear_factura` deja `qty`/`precio`/`total` en NULL si la carga no tiene cajas; la lista pinta `$0.00` aunque la misma factura abierta ya pinta "—" por línea (`filaLineaLectura`, :240).
- fix: `numOrNull(f.total) == null ? '—' : usd(f.total)`, como ya hace `filaLineaLectura`.
- esfuerzo: S

---

## MEDIO

### F-10 Finanzas: 10 secciones caen a "Sin registros", indistinguible de un fallo
- **modulo-finanzas.js:529-538**
- repro: bloquea `v_margen_caja` o `v_dias_pago_observado` → "Sin datos", igual que si de verdad no hubiera filas.
- fix: devolver centinela `{__error}` y que cada `pintarX` imprima errbox, como ya hace `v_panel_hoy`.
- esfuerzo: M

### F-11 Se leen TABLAS base (no vistas) y el 401 se traga con `[]`
- **modulo-tesoreria.js:528** (`tipos_movimiento`) · **modulo-proyectos.js:218** (`categorias_presupuesto`)
- repro: abre "Editar movimiento" → el `<select>` de tipo solo trae el tipo actual (parche :538-539); reclasificar es imposible y nadie se entera.
- fix: pedir vistas equivalentes al backend (PENDIENTES-BACKEND.md); mientras, avisar cuando la lista venga vacía.
- esfuerzo: M · *viola la regla 7 de CLAUDE.md (solo vistas y RPCs, nunca tablas).*

### F-12 El fallo de `v_socios_asignables` se cachea PARA SIEMPRE
- **modulo-cargas.js:1233-1238**
- repro: haz fallar el primer fetch → "Responsable" queda con solo "— Nadie" y ni **Actualizar** ni `ERP.limpiarCache()` lo recuperan (cache aparte).
- fix: no memorizar en el `catch` (`_sociosCache = null; throw`).
- esfuerzo: S

### F-13 Catálogo de productos de OC enmascarado (el propio código admite el síntoma)
- **modulo-ordenes.js:160-161** (comentario en :383-385)
- repro: bloquea `v_catalogo_productos` y abre una OC → todas las líneas muestran "— libre —" como si el producto no estuviera guardado.
- fix: quitar el `.catch(() => [])` y avisar en el editor cuando el catálogo no cargó.
- esfuerzo: S

### F-14 `captura.html` huérfano en disco y desplegado
- **captura.html:1** (no referenciado desde index.html)
- repro: `grep -rn "captura.html" *.html *.js` → 0 hits; sigue accesible en `erp-plein-dashboard.vercel.app/captura.html` con su propio set de vistas `v_cat_*`.
- fix: borrar el archivo (la captura vive en `captura-rapida.js` / `ERP.capturarMovimiento`).
- esfuerzo: S

### F-15 ✓ Exports `ERP.*` que ningún otro archivo consume (10)
- `ERP.` + `nuevaCarga · verFactura · nuevaFactura · generarInvoiceDesdeCarga · nuevaOrden · verTarea · nuevaTarea · verProyecto · verPrograma · registrarGasto` — **modulo-cargas.js:1351 · modulo-facturas.js:594-596 · modulo-ordenes.js:629 · modulo-tareas.js:526-527 · modulo-proyectos.js:652 · modulo-programas.js:767 · modulo-tesoreria.js:486**
- repro: `grep -n "ERP\.nuevaCarga\b" *.js *.html` (excluyendo la asignación) → 0 hits; sin acceso dinámico `ERP[...]` en el repo.
- fix: borrar **solo la línea de asignación** y la cabecera "Expone: …"; **las funciones SÍ se usan** dentro de su propio archivo por nombre desnudo — no borrarlas. `montarFacturasCarga`/`montarOrdenesCarga`/`montarTareasCarga` sí se consumen cross-file: dejarlas.
- esfuerzo: S

### F-16 Encabezado de tabla no se queda fijo al hacer scroll vertical
- **estilos.css:188-189** (`th`)
- repro: en 375px baja 30 filas en Embarques o Estado de cuenta → el `<thead>` desaparece y no se sabe qué columna se lee.
- fix: `th{position:sticky;top:0;z-index:2;background:var(--tarjeta)}` + `.tabla-wrap{max-height:70vh;overflow:auto}`.
- esfuerzo: S

### F-17 La barra de filtros de Embarques consume media pantalla antes de la primera fila
- **modulo-cargas.js:1068-1093**
- repro: en 375px abre Embarques → rango apilado + 4 atajos + ~15 chips ocupan ≈330px de 667px antes de ver un embarque.
- fix: envolver rango + chips secundarios en un `<details>` colapsado por debajo de 640px.
- esfuerzo: S

### F-18 `.btn-mini` mide ~29px de alto tocable — es el botón de acción de todo el ERP
- **estilos.css:448-449**
- repro: en 375px toca "Crear carga"/"Cancelar": `padding:6px 12px` + 11.5px×1.45 ≈ 29px, contra 44px recomendados.
- fix: en `@media(pointer:coarse)` agregar `.btn-mini,.btn{min-height:44px;padding:10px 14px}`.
- esfuerzo: S

### F-19 Íconos clicables de 11–14px: ⓘ, ✕ de rango, ✕ de alias, historial
- **estilos.css:247 · :304 · :562-565 · comun.js:86** (`.info-nota` sin padding)
- repro: en 375px toca el ⓘ de una utilidad estimada o el ✕ del filtro de fechas → blanco real ~12×12px; se falla el toque o se abre la ficha por error.
- fix: en `@media(pointer:coarse)` dar `min-width/min-height:44px` + `inline-flex` centrado a esos cuatro selectores.
- esfuerzo: S

### F-20 `.btn-cap` (+cobro/+pago) mide ~21px y `.chip-folio` ~20px
- **estilos.css:367-368 · :658-662**
- repro: en 375px toca "+ cobro" en Cuentas por Cobrar o un chip de folio en Tesorería: `padding:2px 8px` con 10.5px ≈ 21px.
- fix: subir a `padding:8px 10px` bajo `@media(pointer:coarse)`.
- esfuerzo: S

### F-21 La ✕ de cerrar el panel lateral mide 24px, sin padding y pegada al borde
- **estilos.css:341-342** + index.html:88
- repro: en 375px abre la ficha de un embarque (panel al 100%) y toca la ✕ arriba a la derecha.
- fix: `.panel-head .cerrar{padding:10px;margin:-10px -10px -10px auto}`.
- esfuerzo: S

### F-22 `--ambar` #C98A2D sobre `--ambar-bg` #FBF3E4 da ≈2.6:1 (mínimo 4.5:1)
- **estilos.css:7, 111, 257, 493, 509, 811, 868**
- repro: la insignia de "Revisiones Pendientes", cualquier `.pill.ambar`, un `.aviso.warn` o el estado "Borrador" de una OC.
- fix: oscurecer `--ambar` a `#8A5A11` (≈5.6:1) manteniendo `--ambar-bg`.
- esfuerzo: S

### F-23 `--ambar` sobre blanco da ≈2.9:1 en texto de dato, no decorativo
- **estilos.css:173, 276, 301, 312-313**
- repro: en Inicio una alerta ámbar muestra su monto en 15px bold ámbar sobre blanco; igual "vence hoy" en Antigüedad y las etiquetas blancas dentro de las barras ámbar.
- fix: el mismo cambio de F-22 lo sube a ≈5.2:1 (y da 4.4:1 al texto blanco del `.fill`).
- esfuerzo: S

### F-24 `--gris-claro` #9AA097 sobre blanco da ≈2.7:1 y lleva texto real
- **estilos.css:9, 114, 432, 567, 603, 664, 889**
- repro: encabezados de sección del menú lateral (10px mayúsculas) y nombres de etapas futuras del pipeline en la ficha de un embarque.
- fix: oscurecer `--gris-claro` a `#7A8177` (≈4.6:1) y dejar el tono actual solo para bordes/líneas.
- esfuerzo: S

### F-25 Semáforo de margen 🟢/🟡/🔴: color puro, sin texto ni `title`
- **comun.js:163**, usado en modulo-cargas.js:988
- repro: en Embarques la primera columna es solo un círculo de color; para un daltónico 🟢 y 🔴 son el mismo círculo pardo.
- fix: que `semaforo` devuelva `<span title="Margen >10%" aria-label="margen alto">` y un carácter distinto por nivel (▲/●/▼).
- esfuerzo: S

### F-26 Tarjetas de "Hoy": la urgencia se comunica solo con la franja de color de 5px
- **estilos.css:163-166** + modulo-inicio.js:118-129
- repro: en Inicio las alertas rojas y ámbar se ven idénticas salvo por los 5px de la izquierda; título y detalle no dicen la severidad.
- fix: anteponer ícono al título según `r.severidad` (`🔴 Urgente ·` / `🟠 Atención ·`) en modulo-inicio.js:124.
- esfuerzo: S

### F-27 199 `<label>` en los formularios y solo 2 con `for=`
- **modulo-cargas.js:647-685 · modulo-programas.js:361-418 · captura-rapida.js:64-96** (único correcto: modulo-tesoreria.js:290-291)
- repro: en "Nuevo embarque" tocar la etiqueta "Cajas" no enfoca el campo; un lector de pantalla anuncia los 7 campos de costo solo como "0.00".
- fix: agregar `for="<id>"` a cada `<label>` (los inputs ya tienen id únicos).
- esfuerzo: M

### F-28 `<select>`/`<input>` sin ninguna etiqueta accesible
- **modulo-cargas.js:1071, 1073, 1248 · modulo-datos-faltantes.js:19 · modulo-facturas.js:101 · modulo-ordenes.js:120, 124 · modulo-tareas.js:111, 115**
- repro: el `<select>` de Responsable y el filtro de estado de Facturación se anuncian solo por su valor actual.
- fix: agregar `aria-label` a cada uno ("Responsable", "Filtrar por estado", "Fecha desde"…).
- esfuerzo: S

### F-29 Breakpoints inconsistentes: 8 anchos distintos para el mismo problema
- **estilos.css:183, 249, 381, 500, 625, 649, 709, 712, 732, 737**
- repro: al reducir de 1000→375px el layout cambia en 1000, 860, 820, 640, 620, 600 y 480px.
- fix: consolidar a 3 (`1000`/`860`/`600`) y mover `.kanban`, `.hoy-cards`, `#toastHost`, `.marca`, `.linea-doc`, `.doc-meta-grid` a esos.
- esfuerzo: S

### F-41 "Cancelar factura" gateado a `capturar`; todas las demás anulaciones del ERP exigen `administrar`
- **modulo-facturas.js:331** (RPC en :477)
- repro: entra como Samuel (captura), abre una factura borrador o emitida → se ve "Cancelar factura".
- fix: **confirmar primero con backend** la capacidad de `fn_cancelar_factura` y, si es admin como el resto, gatear con `ERP.puede('administrar')`.
- esfuerzo: S · *único caso donde la capacidad NO está documentada en PENDIENTES-BACKEND.md (tareas y órdenes sí lo están) — no asumir.*

### F-42 `captura.html`: "Aplicar FIFO" habilitado con `puede_capturar` cuando FIFO exige `editar`
- **captura.html:214** (`puedeCapturar` gobierna las 4 pestañas) y **:287**
- repro: entra como Samuel a `/captura.html`, pestaña FIFO → botón activo y error crudo "Error: Sin permiso…" sin traducir (esa página no usa `ERP.avisarSiPermiso`).
- fix: retirar la página (ver **F-14**, ya está huérfana) — es la corrección que resuelve ambos hallazgos de una vez.
- esfuerzo: S

### F-50 El estado del embarque se pinta como pill gris cruda en 3 módulos
- **modulo-cobranza.js:26 · modulo-pagos.js:26 · modulo-antiguedad.js:193**
- repro: la misma carga sale "Revision/QC" en pill gris en Cobranza, y con la etiqueta y color del catálogo en Embarques, Finanzas, Datos faltantes y Proyectos.
- fix: sustituir `<span class="pill gris">${esc(r.estado)}</span>` por `ERP.badgeEstado(r.estado)` en esas 3 líneas (el catálogo ya se precarga en app.js:38).
- esfuerzo: S

### F-51 Seis módulos no tienen botones de exportar
- **modulo-antiguedad.js · modulo-comercial.js · modulo-catalogos.js · modulo-cierres.js · modulo-concentracion.js · modulo-flags.js** (0 ocurrencias de `botonesExportar`)
- repro: Antigüedad de saldos y Concentración de riesgo son tablas de reporte puro y no se pueden bajar, mientras que tablas menores (Bitácora, Datos faltantes) sí.
- fix: dar `id` a las tablas + `ERP.botonesExportar(...)` y `ERP.cablearExportar(cont)` al final del render.
- esfuerzo: M

### F-52 `fechaHora` duplicado 4 veces, con dos formatos distintos en pantalla
- **modulo-flags.js:17 · modulo-tesoreria.js:510 · modulo-tareas.js:22 · modulo-bitacora.js:10**
- repro: Revisiones Pendientes y Tesorería muestran `23 jul 26, 12:00 p.m.`; Tareas y Bitácora `23-jul-2026 12:00`. Además flags devuelve `''` con nulo y los otros `'—'`.
- fix: exportar un único `ERP.fechaHora` (`DD-mmm-YYYY HH:MM`, "—" si nulo) y borrar las 4 copias — hacerlo junto con F-44.
- esfuerzo: M

---

## COSMÉTICO

### F-30 ✓ "Real por programa" muestra solo el código, ignorando la `etiqueta` que ya trae la vista
- **modulo-programas.js** (`pintarRealPrograma`, encabezado "Código")
- repro: en Programas, la 3ª sección lista `PC-005` mientras lista y ficha ya muestran el nombre legible.
- fix: pintar `r.etiqueta || r.codigo` con el código en gris debajo, igual que la lista.
- esfuerzo: S · *`v_programa_cargas.etiqueta` existe y está sin usar; contradice D-21 ("el nombre manda").*

### F-31 CSS muerto: 6 bloques de clases que ningún JS/HTML emite
- **estilos.css:401-405** (`.flag-item`,`.ftag`) · **:590-613** (kanban viejo `.kan-*`,`.k-*`) · **:608-612** (`.pill.prio-*`,`.badge-atrasada`) · **:616-619** (`.resumen-tareas`,`.res-chip`) · **:620-624** (`.comentario`,`.c-head`,`.c-texto`) · **:799-802** (`.doc-drop`,`.doc-subir`,`.over`)
- repro: las clases vivas son otras (`.tarea-card`, `.tarea-com`/`.tc-cab`, `.docs-zona`/`.encima`, `.pill gris|ambar|rojo`).
- fix: borrar esos 6 rangos — **conservar** `.kanban` (:589), `.k-vinc` (:614) y las reglas de :906-908.
- esfuerzo: S

### F-32 ✓ Tres helpers de `comun.js` declarados, exportados y nunca llamados
- **comun.js:273 (`detallePor`), :448 (`panelCuerpo`), :527 (`recargar`)** — el botón "Actualizar" llama `ERP.limpiarCache()` directo (app.js:68), no `recargar()`.
- repro: `grep -n "\bdetallePor\|\bpanelCuerpo\|ERP.recargar" *.js` → solo la declaración y el `return` de :591-595.
- fix: borrar esas 3 y sus entradas del `return`.
- esfuerzo: S · **`usd0`, `pct` y `semaforo` NO son código muerto** — se usan mucho, pero vía destructuring (`const { usd0, pct, semaforo } = ERP`), invisible a un grep de `ERP.usd0`. No borrarlas.

### F-33 `exportar.js` y `ERP.documentos` sobreexponen API interna
- **exportar.js:360-364** (4 asignaciones) · **documentos.js:377** (10 exports, solo `montar` se usa fuera)
- repro: las llamadas reales son locales; `ERP.exportarExcel(` fuera de exportar.js = 0 hits; `ERP.documentos.` = solo `.montar(`.
- fix: borrar las 4 líneas de exportar.js y reducir el return de documentos.js a `{ montar }`.
- esfuerzo: S

### F-34 Fetches repetidos que la caché no absorbe (URL distinta) o serializados de más
- **modulo-facturas.js:138 vs :90** (`v_facturas` sin el mismo `&order`) · **:241,:248** (CxC ya en `cxcPorFolio`) · **modulo-ordenes.js:376** (CxP ya en `cxpPorFolio`) · **modulo-tareas.js:94-98** (socios fuera del `Promise.all`) · **documentos.js:88** (usa `sb.from`, sin caché)
- repro: DevTools/Network al abrir cada ficha: se ve el round-trip extra.
- fix: reusar el dato ya cargado o alinear la URL para que caiga en la misma entrada de caché.
- esfuerzo: S

### F-35 `seleccionados` calculado y nunca leído en el form de Programas
- **modulo-programas.js:358**
- repro: `grep -n "seleccionados" modulo-programas.js` → una sola línea; la preselección real la hace el helper de :466 leyendo `p.producto_ids`.
- fix: borrar la línea.
- esfuerzo: S

### F-36 Doble red (`try` + `.catch`) que garantiza que el fallo nunca se vea
- **modulo-tareas.js:238 y :330**
- repro: bloquea `v_carga_detalle` y abre "Nueva tarea" → el combo "Embarque relacionado" queda vacío sin explicación.
- fix: dejar un solo manejador que escriba un aviso junto al combo.
- esfuerzo: S

### F-37 `.chip` de filtro en ~31px y `min-width:260px` de `.busca` anula los `max-width` en línea
- **estilos.css:227-230** y **:222-224**
- repro: en 375px, en Facturación el `<select>` con `style="max-width:180px"` se dibuja a 260px y empuja los chips a otro renglón.
- fix: `@media(pointer:coarse){.chip{padding:10px 14px}}` y dar clase propia `.filtro-sel` sin `min-width` a los selects.
- esfuerzo: S

### F-38 `.pill.gris` ≈4.2:1 y `.badge-estado.naranja` ≈3.9:1
- **estilos.css:259, 809, 611, 872, 884** y **:815**
- repro: el chip "Sin liquidar", el estado "Cancelada" de una OC, y la insignia "Revision/QC" en Embarques (10.5px bold).
- fix: fondo `#EEEDE5`→`#F3F2EC` (o texto `#5A6058`); naranja a `#A3430C`.
- esfuerzo: S

### F-43 Ficha de embarque: el botón dice "Capturar y aplicar" a quien no puede aplicar
- **modulo-cargas.js:420** (flujo `fn_capturar_mov` :471 + `fn_aplicar_fifo` :493)
- repro: entra como Samuel (captura), abre un embarque → "+ Registrar cobro/pago": el botón promete "Capturar y aplicar" y el FIFO siempre cae en "Tu rol no aplica FIFO".
- fix: rotular el botón según `ERP.puede('editar')`, como ya hace captura-rapida.js:99.
- esfuerzo: S · *el error está bien manejado (:512); es solo la promesa del rótulo.*

### F-53 El folio del embarque se llama "Carga" en 6 pantallas y "Embarque" en 2
- **modulo-cargas.js:971** (th "Carga" dentro del módulo titulado "Embarques"); también Cobranza, Pagos, Antigüedad, Finanzas, Datos faltantes. "Embarque" en modulo-ordenes.js:83 y modulo-proyectos.js:519.
- repro: peor aún, en modulo-cargas.js:972 "Embarque" es el encabezado de la **fecha**, no del folio: dos cosas distintas con el mismo nombre en la misma tabla.
- fix: unificar el th del folio a "Embarque" y renombrar la columna de fecha a "F. embarque".
- esfuerzo: M

### F-54 "Flags" se filtra a pantalla pese a que la etiqueta oficial es "Revisiones Pendientes"
- **modulo-inicio.js:196-198 · modulo-flags.js:120,135 · modulo-cobranza.js:43 · modulo-pagos.js:41 · modulo-finanzas.js:266,299**
- repro: el menú dice "Revisiones Pendientes" pero la tarjeta de Inicio dice "Flags activas", el vacío dice "Sin flags 🎉" y las leyendas "⚑ = flag activa"; flags.js:135-137 hasta alterna género ("una flag"/"el flag").
- fix: reemplazar el término visible por "revisión pendiente" en esas cadenas (regla 5 de CLAUDE.md).
- esfuerzo: S

### F-55 El mismo campo se encabeza "PO", "P.O." y "Número" según la pantalla
- **modulo-cobranza.js:18** ("PO") vs **modulo-cargas.js:971** ("P.O.") vs **modulo-facturas.js:69** ("Número")
- repro: "PO" en Cobranza/Pagos/Antigüedad/Facturas, "P.O." en Embarques/Datos faltantes/Proyectos/Programas; y el folio del documento es "Folio" en Órdenes/Tareas/Tesorería pero "Número" en Facturación.
- fix: fijar "P.O." y "Folio" en todos los `<th>`.
- esfuerzo: S · *P.O. es la llave de cotejo oficial (regla 11 de CLAUDE.md); conviene que se llame igual en todas partes.*

### F-56 Tres formatos de porcentaje y dos de moneda dentro de Finanzas
- **modulo-finanzas.js:468** (`pct1Fin`, 1 decimal) vs `ERP.pct` (2 decimales) vs **modulo-programas.js:25** (`pctTxt`, 0-1 decimales)
- repro: en la misma página, "Margen por cliente" usa `usd0` (sin centavos) y `pct` (2 dec); "Días de pago" usa `usd` (2 dec) y `pct1Fin` (1 dec).
- fix: usar `ERP.pct` y `ERP.usd` en todo Finanzas y borrar `pct1Fin`.
- esfuerzo: S

### F-57 Inicio usa una clase de estado vacío propia
- **modulo-inicio.js:139** (`class="hoy-vacio"`)
- repro: `✅ Todo en orden…` con tipografía y padding distintos al `<div class="vacio">` que usan los otros 19 módulos.
- fix: cambiar a `class="vacio"` (dejar el estilo extra como modificador si hace falta).
- esfuerzo: S

### F-58 Cobranza muestra "Días" crudo donde el resto muestra la situación legible
- **modulo-cobranza.js:18,27**
- repro: el drill-down de cliente pinta un número de días coloreado con umbrales hardcodeados (≥60 ámbar, ≥90 rojo), mientras Pagos:87, Antigüedad:189 y Finanzas:429 usan `ERP.venc()` → "vencida hace 12 días".
- fix: cambiar la columna a `ERP.venc(r.dias_vencido)` como las otras tres.
- esfuerzo: S

---

## TABLA COMPARATIVA POR MÓDULO (dimensión 5)

| Módulo | Formato | Estado vacío | Export | Dato faltante | Vocabulario |
|---|---|---|---|---|---|
| cargas (Embarques) | ✓ helpers | ✓ `.vacio` | ✓ | ✓ "—" | ✗ th "Carga" |
| expediente | ✓ helpers | ✓ `.vacio` | ✓ PDF propio | ✓ "—" | ✓ "Embarque" |
| cobranza | ✓ helpers | ✓ `.vacio` | ⚠ solo 1ª tabla | ✗ $0.00 | ✗ "Carga", pill cruda |
| pagos | ✓ helpers | ✓ `.vacio` | ⚠ solo 1ª tabla | ✗ $0.00 | ✗ "Carga", pill cruda |
| antiguedad | ✓ + `dinero` local | ✓ `.vacio` | ✗ sin export | ✓ "—" | ✗ "Carga", pill cruda |
| comercial | ✗ `monto()` propio | ✓ `.vacio` | ✗ sin export | ✗ $0.00 | ✓ |
| tesoreria | ⚠ `fechaHora` propio | ✓ `.vacio` | ✓ | ✓ "—" | ✓ |
| finanzas | ⚠ usd/usd0/pct1Fin | ✓ `.vacio` | ✓ (9 barras) | ✓ "—" | ✗ Carga vs Embarques |
| cierres | ✓ helpers | ✓ `.vacio` | ✗ sin export | ⚠ $0.00 | ✓ |
| concentracion | ✓ helpers | ✓ `.vacio` | ✗ sin export | ✓ "—" | ✗ "Cargas" |
| flags | ✓ helpers | ⚠ "Sin flags 🎉" | ✗ sin export | n/a | ✗ "flag" en pantalla |
| facturas | ✗ `fecha4` propio | ✓ `.vacio` | ✓ | ✗ Total $0.00 | ✗ th "Número" |
| ordenes | ✗ `fecha4` propio | ✓ `.vacio` | ✓ | ⚠ Total $0.00 | ✓ "Embarque" |
| catalogos | ✓ (sin montos) | ✓ `.vacio` | ✗ sin export | ✓ "—" | ✗ "Cargas" |
| tareas | ✗ `fecha4`+`fechaHora` | ✓ `.vacio` | ✓ | ✓ "—" | ✓ "Folio" |
| bitacora | ✗ `fechaHora` propio | ✓ `.vacio` | ✓ | ✓ "—" | ✓ |
| datos-faltantes | ✓ helpers | ✓ `.vacio` | ✓ | ✓ "—" | ✗ th "Carga" |
| proyectos | ✓ ejemplar | ✓ `.vacio` | ✓ | ✓ "—" | ✓ "Embarque" |
| programas | ⚠ `pctTxt` propio | ✓ `.vacio` | ✓ (3 barras) | ✓ "—" | ✓ |
| inicio | ✗ `ERP.fmt` sin `$` | ✗ `.hoy-vacio` | ✗ sin export | ✓ "—" | ✗ "Flags", "Cargas" |

**Módulos más consistentes:** proyectos, expediente, datos-faltantes, bitacora. **Los que más divergen:** inicio, comercial, cobranza/pagos.

---

## REVISADO Y SANO

**Contratos con Supabase (dimensión 1) — verificado contra la base en vivo, no contra la documentación:**
- Las **74 vistas** que invoca el frontend existen. Ninguna 404.
- Las **67 columnas** usadas en `&order=` y en filtros `=eq.` existen en su vista. Una sola equivocada devolvería 400 y rompería la pantalla entera; no hay ninguna.
- **Todas las firmas de RPC resuelven** contra la base, incluidas las construidas dinámicamente (`fn_editar_movimiento` con sus 9 parámetros, `fn_crear_carga` con los 7 costos desglosados, `fn_crear_programa`/`fn_editar_programa` con sus 22 y 26 parámetros).
- **Columnas nuevas de E47 correctamente consumidas:** `v_programas_comerciales.{etiqueta, venta_tipica_carga, cajas_tipicas_carga, cliente_id, proveedor_id, producto_ids}`, `v_programa_cargas.etiqueta`, `v_cargas_programa.{programa_codigo, programa_etiqueta}`. Ninguna asume la forma vieja.
- **`v_balance` de 16 filas no rompe nada:** `modulo-finanzas.js:213-227` agrupa por `seccion` y ordena por `orden`, y localiza el renglón de Cuadre por `seccion === 'Cuadre'`, nunca por número de fila. No hay ningún conteo ni `orden` hardcodeado en todo el repo.
- No se hardcodea el catálogo de estados: `modulo-inicio.js:24` usa `ERP.estadoInfo().cuenta_como_embarque`. (`ETAPAS` en modulo-cargas.js:16 es pipeline visual, documentado como cosmético.)

**Estructura y ruteo:** los 19 `ERP.registrar()` casan 1:1 con los 19 `<a data-modulo>` de index.html — sin módulos inalcanzables ni ítems rotos. Los 25 `.js` están referenciados. No hay acceso dinámico `ERP[...]`. `cablearExportar`/`cablearInfoNota` tienen guard de idempotencia (`_expWired`/`_infoWired`) y `despachar()` recrea `#modContenido` en cada ruta → **no hay listeners duplicados**. Ninguna `let` de estado quedó escrita sin leer.

**Responsive que sí está resuelto:** `.tabla-wrap{overflow-x:auto}` existe de verdad y envuelve **todas** las tablas de pantalla (las 4 sin envolver son de impresión dentro de `#areaImpresion{display:none}`). No hay anchos fijos en px fuera de un contenedor con overflow → **el body nunca hace scroll horizontal**. `.panel` pasa a `width:100%` con `.panel-body{overflow-y:auto}`, así que el formulario largo de alta de Programas cabe y hace scroll en 375×667. `.modal-box{width:min(420px,100%);max-height:90vh;overflow:auto}` cabe. `@media(pointer:coarse)` ya sube `.combo-item` a 44px.

**Accesibilidad que sí está resuelta:** `.pill`, `.badge-estado`, `.oc-estado` y el chip de cobro llevan **siempre el texto adentro** ("Vencido", "Parcial", "Sin liquidar", "Cancelada") — no dependen del color. Igual la barra de cuadre del Balance (✅/⚠️ + texto) y `venc()` ("vencida hace 12 días").

**Gating por rol — bien resuelto en casi todo el ERP.** Solo 5 desvíos (F-39 a F-43) sobre decenas de acciones de escritura, y ninguno es hueco de seguridad: el backend valida con `fn_actor_puede` en todos los casos. Gatean correctamente: comun.js (`ERP.puede`/`avisarSiPermiso`, `montarResponsable`, `transicionesDisponibles` leyendo la capacidad del catálogo de transiciones), captura-rapida.js, modulo-cargas.js (costos/mov/flag/anular-admin/estado), modulo-expediente.js, documentos.js (subir=capturar, anular=administrar), modulo-flags.js (responder=capturar, cerrar=editar), modulo-tesoreria.js (editar mov=editar, forzar=administrar), modulo-catalogos.js (todo=administrar), modulo-comercial.js (anular=administrar), modulo-proyectos.js, modulo-programas.js, modulo-datos-faltantes.js, modulo-cobranza.js, modulo-pagos.js y todas las altas.

**Archivos sin hallazgos:** app.js, modulo-cierres.js, modulo-cobranza.js, modulo-concentracion.js, modulo-bitacora.js, modulo-catalogos.js, modulo-datos-faltantes.js, modulo-flags.js, modulo-comercial.js, captura-rapida.js, index.html.

---

## PENDIENTE DE AUDITAR

Las 8 dimensiones quedaron cubiertas. **Pendiente que NO es de auditoría sino de decisión:**

**Pregunta abierta para backend (bloquea F-41):** ¿qué capacidad exige `fn_cancelar_factura`? Es la única RPC de anulación sin documentar; el resto (`fn_anular_orden`, `fn_cancelar_tarea`, `fn_anular_carga`, anular documento) exige `administrar`. No se propone cambio hasta confirmarlo: gatearla a `administrar` por analogía podría romper un flujo que hoy funciona.

**Lo que esta auditoría NO cubrió:** no se ejecutó la app en un navegador ni se probó con los 3 roles reales — todo es análisis estático más verificación de contratos contra la base. Los cálculos de contraste y de área táctil son estimaciones a partir del CSS. Nada se midió en un dispositivo real.

---

## APÉNDICE — Cómo se verificaron los contratos sin credenciales

Las vistas son authenticated-only, así que con la publishable key todo devuelve 401. Pero PostgREST distingue el motivo **antes** de comprobar permisos, y eso alcanza para auditar el contrato completo sin loguearse:

| Respuesta | Significado |
|---|---|
| `42501 permission denied` | la vista/columna **existe** (falló solo el permiso) |
| `PGRST205` 404 | la **vista no existe** |
| `42703 column ... does not exist` | la vista existe, la **columna no** |
| `PGRST202` 404 en `/rpc/x` | **ninguna firma** de esa función casa con los parámetros enviados |

Ejemplos reproducibles:

```bash
K='sb_publishable_qaNQbKSDDb8teUACJe7pWg_FhabcEJS'
U='https://wnjomlwevqaxbborikkq.supabase.co/rest/v1'

curl -s "$U/v_balance?select=orden" -H "apikey: $K"              # 42501 -> existe
curl -s "$U/v_balance?select=columna_falsa" -H "apikey: $K"      # 42703 -> no existe
curl -s -X POST "$U/rpc/fn_crear_programa" -H "apikey: $K" \
     -H 'Content-Type: application/json' -d '{"p_etiqueta":null}' # PGRST202 -> firma no casa
```

Para la firma de una RPC hay que mandar **todos** los nombres de parámetro que manda el frontend, con valor `null`: PostgREST resuelve la sobrecarga por nombres antes de ejecutar, así que un 401 confirma que la firma casa. Enviar `{}` da un falso negativo (busca una sobrecarga sin argumentos y no la encuentra).
