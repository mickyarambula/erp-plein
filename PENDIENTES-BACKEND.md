# PENDIENTES-BACKEND.md
_Última actualización: cierre E104-E106 (2026-08-09) — Autosuficiencia (Tema 2 + P1 + P2 + Fase 1/2c/3). Dueño por defecto: backend, salvo que diga otro._

## Cerrado en E102–E106 (sesión de autosuficiencia, ver BITACORA D-120..D-137)
- ✅ **Tema 2 — Línea de proyecto + socios (D-120..D-124):** `fn_ajustar_linea_proyecto` (sola, money-neutral, candado ≥ dispuesto), `fn_registrar_aportacion_socio` (genérica, 3 naturalezas), origen de fondeo en `fn_anticipo_productor` (opcional, retrocompatible), balance "Deuda a socios" generalizado + `v_deuda_socios`. Frontend: 3 botones cableados (Ajustar línea en Proyecto, + Aportación de socio en Tesorería/Proyecto, selector Origen en Anticipo). **Miguel ya opera esto solo** (folio 397, PRJ-005).
- ✅ **P1 — Directorio autosuficiente (D-125..D-128):** `contrapartes.recibe_pagos` + `capturado_por/ts`; picker de "Registrar gasto" desacoplado de `clase` (Samuel/Juan ya salen en Sueldo); `fn_alta/editar_contraparte` con `recibe_pagos` + rastro; `v_directorio_contrapartes`. Frontend desplegado y probado.
- ✅ **P2 — Catálogos autoservibles (D-129..D-132):** Conceptos de costo (`fn_alta/editar_concepto_costo`), Cuentas (`tipo` banco/virtual, `fn_alta/editar_cuenta` solo banco real, balance "Banco" por `tipo='banco'` en vez de hardcode). Frontend desplegado y probado.
- ✅ **Fase 1 captura — puerta única (D-133):** `fn_traspaso` saneado (gate + `fn_actor` + folios por rango, permitido al front). Frontend: botón único "+ Registrar" con chooser de intención (Cobro/pago · Gasto · Anticipo · Aportación · Traspaso) reemplaza los 4 botones sueltos. Desplegado y probado.
- ✅ **Fase 2a — Categoría de deducción (D-134):** tabla `categorias_deduccion` + `fn_alta/editar_categoria_deduccion` + `v_categorias_deduccion`/`_admin`; `liquidacion_deducciones.categoria` pasó de CHECK fijo a FK al catálogo. Frontend: pestaña en Catálogos + Liquidaciones lee la vista. Desplegado y probado.
- ✅ **Fase 2b — Categorías de gasto (D-135):** `tipos_movimiento.activo`; `fn_alta_categoria_gasto` (clona comportamiento del grupo gasto_operativo/financiero, candado contra tipos estructurales) + `fn_editar_categoria_gasto` (activar/desactivar) + `v_categorias_gasto`/`_admin`. Frontend: pestaña + "Registrar gasto" lee el catálogo. Desplegado y probado (confirmado: categoría nueva pega sola al P&L).
- ✅ **Fase 2c — Editar productos/variedades (D-136, D-137):** `fn_editar_producto`/`fn_editar_variedad` + permisos unificados a `capturar` en las 5 RPCs de producto/variedad (2 de ellas no tenían gate — hueco cerrado). Backend listo; **frontend pendiente de correr** (bloque ya entregado a Claude Code).
- ✅ **Fase 3 — limpieza:** moneda (USD/MXN) centralizada en `ERP.MONEDAS` (comun.js), antes duplicada en 3 archivos. Seeds confirmados como enums de sistema (documento/evento/presupuesto) — no requieren panel. Estado de Load decidido como enum (queda igual, no es catálogo de usuario).

**Anclas al cierre de esta sesión:** Cuadre 0.00 · seg 0/0/0 · CxC 565,985.13 · CxP 526,469.78 · JPM ~50,308.54 (antes de capturas de Miguel post-sesión) · cargas 85 · folio_max ~401.

## Backend — activos / por hacer

### 🔴 Prioridad alta
- **Tema 1 — Filtro de cargas al aplicar movimiento:** hoy filtra solo por cliente/proveedor de ENCABEZADO → proveedores de SERVICIO (reempaque/flete, ej. Costatropical) caen al fallback "todas". Fix: vista backend carga↔TODAS sus contrapartes (cliente + proveedor header + contrapartes de líneas de costo) + ajuste del filtro en front. **Sigue abierto, no tocado en esta sesión.**
- **Consolidar `fn_alta_producto` duplicada:** hay 2 firmas (1-arg con advertencia de "parecido" + gate ya en `capturar`; 2-arg con código, gate agregado en D-137). Parqueado hasta poder leer el repo completo sin romper a ciegas qué firma usa cada call-site del front.

### 🟠 Prioridad media
- **Liga única de venta:** unificar `sales_order_cargas`/`lote_ventas` + jalar cajas del lote (matar doble registro). GATE+ENSAYO.
- **F2:** diferencia ~1,494 del total CxP (Drive 497,861.64 vs directo 496,368.03).
- **Liquidar backlog** (4 productores, 11 cargas, ~$54,224.70): Cornejos P-043/047, Carrifoods, Akambarhu P-073/075, Agrofepac P-071. Lo hace Miguel en la UI.
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
