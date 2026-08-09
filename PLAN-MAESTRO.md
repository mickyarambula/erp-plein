# PLAN MAESTRO ERP PLEIN — v2 (reconciliado 2026-07-17)

> Este plan se reconcilió contra la base de datos real (v_estado_sistema / v_estado_modulos) y contra REPORTE-FRONTEND.md. Regla: al completar un punto, márcalo [x] con fecha. Nunca borres puntos.


**Actualización más reciente: 2026-08-06, cierre E88 (CONCILIACIÓN DRIVE↔ERP COMPLETA).** Terminó la conciliación contra el Drive/V8; **el ERP es la fuente de verdad y el Drive se jubila** (salvo 3 cargas En Camino que faltan capturar con dato de Samuel). Entregas: **D-105** permisos GRANULARES (matriz usuario×capacidad/módulo, backend+frontend). **D-106/107/108** Paso 1 Banco: JPM 7,297.29 = Chase V8 al centavo, 281=281 movs. **D-109** cubeta sin-acción (consignación/rechazo/cosmético = modelo correcto). **D-110** CxC re-repartida: Crystal paga por depósito específico por P.O. (no abono-a-cuenta) → **CxC 589,263.13→570,023.13**, cada carga = V8. **D-111** CxP conciliada: el ERP ya es correcto (99.6% por proveedor); las diferencias (1,976.07) son decisiones deliberadas (licencia anual, cartón a granel, reembolsos E38, agrupación comisión P&M) → NO forzar. **D-112** flete BBA f367→P-073. **D-113** id_v7 corregido (35 vivas + 2 anuladas mal cruzadas). **D-114** barrido no-carga limpio (Egresos 46/46, Ingresos 8/8, Nómina 35,000, Traspasos). Anclas cierre: CxC 570,023.13 · CxP 496,368.03 · Cuadre 0.00 · seg 0/0/0 · JPM 7,297.29. **SIGUIENTE FASE (frontend): rediseño visual profesional + flujos operativos** para operar el día desde el ERP y cortar Drive/ClickUp; empezar por dirección de diseño, luego pantalla por pantalla (Claude Code / Tailwind / Claude Design). Pendiente único de conciliación: 3 cargas En Camino (Miguel+Samuel). Ver NORTE.md (Actualización E88 FINAL) y BITACORA D-105..D-114.

**Actualización más reciente: 2026-08-05, cierre E87 (USO REAL).** Tres entregas nuevas: **D-102** feature Anticipo a productor (RPC atómico fn_anticipo_productor ligado a proyecto + puerta en front Tesorería/ficha Proyecto + backfill proyecto_id; + fix zona horaria hoyISO en 6 archivos). **D-103** permisos de usuarios (rol nuevo 'operacion'=ver+capturar+editar; Samuel/Juan/Jose/Fer→operacion; alta PP05-FP Fer Palacios; 3 RPCs admin fn_admin_* con anti-lockout; panel modulo-usuarios.js admin-only). **D-104** diagnóstico CxP (2 modelos directo/atribuido; vista nueva v_cxp_detalle_proveedor_atribuido; cajón CxP consistente; sin dinero perdido). Anclas cierre: CxC 589,263.13 · CxP 496,368.03 · Cuadre 0.00 · seg 0/0/0 · JPM −9,584.71 (¡confirmar vs banco!). E88 (chat nuevo): rediseño visual profesional del ERP + permisos GRANULARES (matriz usuario×capacidad y usuario×módulo). Parked: barrido CxC, AGROFEPAC consignación en CxP. Ver NORTE.md y BITACORA D-102/D-103/D-104.

**Actualización más reciente: 2026-08-04, cierre E86 (BASE CERRADA / USO REAL).** A-16 espejos lote_ventas auditados (0 mismatches) → base declarada cerrada; se detiene la auditoría de backend. PACA EN USO REAL: 1ª liquidación real emitida (LQ-2026-0002) + fix frontend fmt0 (D-98); señal "listo para liquidar" en 4 superficies (agenda/panel/badge/chip, D-99/D-101). Akambarhu CERRADO (D-100): préstamos en Proyectos, no en cargas. E85 previo: guardas A-07 (D-93), PC-013 (D-94), A-14 (D-95), P-035 rechazo (D-96). Anclas: CxC 589,263.13 · CxP 507,241.00 · Cuadre 0.00 · seg 0/0/0. SIGUIENTE: feature Anticipo a productor ligado a proyecto. Ver NORTE.md y BITACORA D-93..D-101.

**Actualización más reciente: 2026-08-03, cierre E83b.** **DOS EJES COMPLETOS.** Flip 4b venta→eje-SO HECHO (D-82, money-neutral, CxC 588,061.82 intacta, 0 divergencias) vía `v_ingreso_reconocido` (fuente de `v_cxc` + rama no-consig de `v_estado_resultados`); detector `v_venta_ejes` honesto (D-82b); relación programa↔cliente↔productor y recencia read-only (D-83/D-83b); Directorio v2 sittings 1–4 (frontend, desplegado). El build del camino crítico TERMINÓ; solo resta cerrar julio (operativo, espera contenedores + Samuel). Ver NORTE.md y BITACORA D-82..D-83b.

**Actualización previa: 2026-08-03, cierre E81.** Dos pasos del camino crítico cerrados. **Paso 3 COMPLETO (D-80):** poblados los params de los 23 SO restantes y confirmados → **80/80 SO Confirmada, 0 Borrador**; RM-001 resuelto como **"Fixed Fee per Shipment"** con nueva columna `sales_orders.cuota_fija_embarque` (cuota fija por embarque = `ingreso_venta`), el trigger exige el param correcto al confirmar, `formula_tipo` INTACTO ('comision_por_caja' = etiqueta legacy); RM-002 con `precio_compra/venta_caja` (venta = `lote_ventas.precio_caja` canónico); P-035/Candy Fresh confirmado (pérdida real, sin duda abierta). **Paso 4/peldaño 5 COMPLETO (D-81):** costo lote-first — `carga_costos.carga_folio` ahora NULLABLE + `fn_carga_costos_set_lote` con derivación simétrica lote↔carga + guard de consistencia; los 31 lectores intactos (carga_folio = espejo denormalizado auto-mantenido). Todo **money-neutral** (CxC 588,061.82 · CxP 507,241.00 · JPM 15,989.29 · Cuadre 0.00 · seg 0/0/0; advisor baseline sin cambio). **SIGUIENTE (Paso 5):** flip 4b venta→eje-SO (spec D-76) — **money-MOVER**, mueve CxC al eje-SO; GATE + snapshot, Opus 4.8, idealmente chat propio. Peldaño 6 (RPC/UX captura lote-first) = follow-on frontend, aditivo. Ver NORTE.md y BITACORA D-80/D-81.

**Actualización más reciente: 2026-08-03, cierre E80.** Sesión de rumbo + primer avance del camino crítico (ver **NORTE.md**, nueva brújula de una página que se anexa siempre). **A-12 RESUELTO (D-78):** P-019 etiquetado `[VENTA=COSTO CONFIRMADO]` (venta=costo=21,948 margen 0 real; la nota E26 "margen 672" la consumieron las atribuciones E60) + excepción acotada al gate de periodos para permitir editar `nota_revision` (texto) en meses cerrados → `v_placeholders` 1→0, marzo cerrable. **Corrección de premisa:** A-12 NO destrababa julio (el checklist es por mes; P-019 cuenta en marzo; julio se cierra por su propia operativa: 5 consig sin liquidar + 5 cargas sin cerrar + 4 movs). **Paso 3 PARCIAL (D-79):** confirmados 57/80 SO (RM-003 17 + RM-004 40), SO-0074 (prueba de Juan, sin carga) cancelado; **23 restantes (RM-001 13 + RM-002 10) parqueados** — el trigger `tg_valida_so_params` exige params del modelo al confirmar y el backfill E70 nunca cargó comisión/precios a esos. **Seguridad (D-77):** REVOKE EXECUTE en 5 funciones de trigger → advisor `anon_security_definer` 1→0. Todo **money-neutral** (dinero EXACTO a E79: CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · seg 0/0/0). **Frontend E80 (Claude Code, desplegado):** dirección del productor en PDF de liquidación + picker de programa en Nueva Orden de Venta. **SIGUIENTE (paso 3b):** poblar params de los 23 SO y confirmarlos — ojo con la tensión de diseño de RM-001 (D-76 lo llama "Fixed Fee per Shipment"/por-embarque pero el param es comision_por_caja/por-caja); requiere GATE. Ver NORTE.md y BITACORA D-77/D-78/D-79.

**Actualización más reciente: 2026-08-02, cierre E76.** **FASE C DOCUMENTAL COMPLETA (backend).** Cuatro migraciones money-neutral y advisor-limpias: **D-68 Auto-espejo de lote al alta de carga** (trigger `tg_cargas_crear_lote_espejo` crea `lotes`+`lote_items` 1:1 con NEW.lote — cierra la frontera D-65; peldaño 1 del end-state Dos Ejes) · **D-69 Factura-desde-SO** (`facturas.so_folio` + `carga_folio` nullable + CHECK; RPC `fn_crear_factura_desde_so` arma líneas desde `lote_ventas.precio_caja`, bloquea consignación/comisión, exige SO Confirmada/Cerrada; `v_facturas` INNER→LEFT + so_folio; ruta carga intacta) · **D-70 Liquidación auto** (`fn_crear_liquidacion_auto` computa bruto=Σ `cargas.ingreso_venta` y auto-pobla `liquidacion_ventas`; reusa `fn_crear_liquidacion` con comisión 10%/deducciones/anticipos; guard consignación+liquidada) · **D-71 Shipping/Embarque físico (Load)** (tablas `loads`/`load_cargas`/`load_serie`, folio `LD-YYYY-####`, campos logísticos opcionales MX→USA, agrupa 1+ cargas consolidación-ready; RPCs crear/asignar/desasignar/editar/anular; vistas `v_loads`/`v_load_cargas`; documentos entidad `load`). Anclas de dinero **EXACTAS a E75** (CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · seg 0/0/0). Flujo SO→OC→Lote→Envío(Load)→Factura→Liquidación→Profit **entero en backend**. Pendiente NO-backend: frontend (Claude Code) de las 4 piezas + packing-list/BOL imprimible (opcional) + backfill de 9 SOs (bloqueado por D-50). **Siguiente hito (fuera de C):** peldaño 3 (costo nativo al lote) → re-anclaje de la venta al SO (money-mover, filosofía V8). Ver BITACORA D-68/D-69/D-70/D-71.

**Actualización: 2026-08-02, cierre E75.** **E75** = **Estados de inventario por lote (C.2, D-67)** — tabla `lote_movimientos` (`merma|rts`, guard `Σ(vendido+merma+rts) ≤ cajas`, soft-delete, nace cerrada) + vista `v_lote_inventario` (`total/sold/waste/rts/on_hand/ats`, estilo Silo Reconcile) + vista detalle `v_lote_movimientos` + RPCs `fn_registrar_mov_lote(p_lote_folio,p_tipo,p_cajas,p_motivo,p_fecha?,p_nota?)` / `fn_anular_mov_lote(p_id,p_motivo)`. **MONEY-NEUTRAL** (merma/RTS son físicos, NO tocan CxC/CxP/Cuadre; dinero EXACTO a E74, Cuadre 0.00, seg 0/0/0, 0 discrepancias vs `cajas_disponibles`). **Frontend desplegado (E75):** `modulo-lotes.js` en prod con la sección "Inventario del lote" **más el ripple D-66** (reparto con precio + desasignar por `id`; gate de "Quitar" corregido a `editar`) — cierra el pendiente de ripple de E74. **E74** = **Re-ancla de costos (D-65)** (`carga_costos.lote_folio`, backfill 257/257, el puente `carga_folio` ya NO es fuente de costo; trigger `tg_carga_costos_set_lote` + índice UNIQUE parcial `ux_lotes_carga_folio`) + **Pricing A1+B+C (D-66)** (`lote_ventas.precio_caja` + se quitó UNIQUE(lote,SO) = multi-tranche estilo Silo; `v_lote_rentabilidad` revenue/utilidad/margen del LOTE por `formula_tipo`; RPCs re-firmadas incl. **`fn_desasignar_venta_lote(p_id)`**); dinero EXACTO a E73/E72, Cuadre 0.00, seg 0/0/0, 0 discrepancias. Ripple frontend pendiente (reparto con precio + desasignar por id) antes de desplegar `modulo-lotes.js`. **E73** = Fase C.2 construida completa (entidad LOTE + reparto Lote↔OV + migración 89 lotes espejo + backfill 73 lote_ventas + v_lote_cadena + v_lote_rentabilidad + frontend modulo-lotes.js sin desplegar); anclas de dinero EXACTAS a E72; C.2: lotes 89 (82 viv/7 anul)/lote_items 89/lote_ventas 73/lote_serie 2026=86 — ver D-64. **E71** = Reconciliación V8 Fases 1-2 (Chase: 7 movs reales 375-381, JPM→15,989.29; conceptos sin DDL; 0 cargas nuevas — D-61). **E72** = Reconciliación V8 **Fase 3 (montos) CERRADA**: cruce por P.O. de 82 cargas, única corrección real **P-076** (venta 15,000→15,254.73 + comisión 462.99→358.85; PO 1490=V8 1495) → **CxC 587,807.09→588,061.82 · CxP 507,345.14→507,241.00 · Cuadre 0.00**; resto de deltas no-accionables. **Reconciliación V8 CERRADA** (captura directa de Miguel en adelante; casos especiales puntuales — D-62). **+ Rumbo de C.2 (Fase C) redefinido (D-63): el LOTE es el eje de compra (no OC ni Carga); enlace Lote↔Orden de Venta con cantidades — BUILD pendiente (E73).** Parkeado operativo (junta socios): adopción Samuel, trueque D-42, Akambarhu D-59, FRONTERA D-50, Candy Fresh P-035. **Sigue:** re-ancla de costos al lote (quitar puente carga_folio) + fase pricing (profit por-SO) — E74.

**Actualización más reciente: 2026-07-31, cierre E70.** **E69** = ejecución del diagnóstico Kabocha D-59: se aplicaron los movs 370/372 a las cargas 1001/1002 (**3,250** a P-073 costo proveedor + **7,562** a P-073 venta liquidada + **438** a P-075 remanente CRI); el sobrante de 370 (**$6,750**) quedó **PARKEADO** como anticipo a productor Akambarhu hasta capturar PO 1003/P-089 → **CxC 595,807.09→587,807.09 · CxP 510,595.14→507,345.14 · aplicaciones 186→189 · Cuadre 0.00**. **E70** = **backfill de las 73 cargas claras → 73 Sales Orders** (SO-0001..SO-0073, 1 SO/carga, estado Borrador; RM-001=13 · RM-002=10 · RM-003=17 con pct_comision=10 · RM-004=33); las 7 FRONTERA (P-059/066/074/078/082/083/084) + P-089 + P-034 quedaron fuera; los SO no tocan contabilidad → **sales_orders 0→73 · sales_order_cargas 0→73 · folio_max_sales_order 0→73**, resto de anclas intactas. Ver BITACORA D-59/D-60. **Sigue:** reconciliación del **V8 ACTUALIZADO** (6 pestañas: Chase +Cargas +Ingresos +Egresos +Traspasos +Nómina; Chase crece a folio 941, pivote Ingresos $846,879.60/Egresos -$830,890.31/Bancos $15,989.29) **por fases**, y el backfill de las 7 FRONTERA cuando socios decidan D-50.

**Actualización más reciente: 2026-07-31, cierre E68.** E67 = análisis read-only para el **GATE de socios D-50** (split margen_fijo → RM-002 Margin vs RM-004 Buy & Resell; entregado Excel `D-50_split_margen_fijo.xlsx`, sin escrituras). E68 = **módulo Presencia / En línea** (tablas `presencia`/`presencia_log`, RPC `fn_latido`, vistas `v_presencia_online`/`v_presencia_historial`; frontend `modulo-presencia.js` en prod; repo bajo git por primera vez) + **corrección de datos vía V8** (P-082/083/084: `Otro`→`Materia prima` + comisión faltante → **CxP 510,115.14 → 510,595.14**, +480; P-034 "Rechazo" = wash, se deja sin costo) + diagnóstico Kabocha 370/372 (NO son préstamo, sólo estaban sin aplicar; el adelanto excede el costo de la carga → ejecución en E69). Tras la corrección, D-50 mueve **7** cargas (FRONTERA: P-059/066/074/078/082/083/084). Sigue: aplicar Kabocha 370/372 (E69), decisión de socios D-50, y backfill de las 73 cargas claras → SO (1 SO/carga; bloqueado por D-50).

**Actualización más reciente: 2026-07-31, cierre E66.** Construido **C.1b — Eventos de Carga** (bitácora tipificada append-only: catálogo `evento_tipos` de 5 tipos + `eventos_carga`; **sólo REGISTRA**, no mueve dinero — referencia por id al movimiento/costo/aplicación real; Fase D lo leerá para el asiento). En paralelo, **frontend de C.1 Órdenes de Venta** (Claude Code: `modulo-ventas.js`, en prod). Sesión 100% aditiva; anclas EXACTAS a E65 (CxC 595,807.09 · CxP 510,115.14 · Cuadre 0.00 · seg 0/0/0). Ver BITACORA D-56. Sigue: backfill de las 82 cargas → SO (bloqueado por GATE de socios D-50) y la UI de Eventos de Carga (Claude Code).

**Actualización más reciente: 2026-07-31, cierre E65.** Construido el sub-bloque **C.1 — Orden de
Venta** (Fase C): tablas `sales_orders` (documento padre, Revenue Model obligatorio, params por
modelo como columnas validadas por trigger) y `sales_order_cargas` (m:n SO↔carga; cubre escenarios
E1/E2/E3), 6 RPCs (crear/asignar/desasignar/confirmar/cerrar/cancelar), vistas `v_sales_orders` /
`v_sales_order_cargas`, y triggers de validación de params + guard anti-sobreasignación
(Σ cajas ≤ cargas.cajas). Probado end-to-end; sesión 100% backend, anclas intactas vs E64
(CxC 595,807.09 · CxP 510,115.14 · Cuadre 0.00 · seg 0/0/0). Numeración interna SO-#### (D-55).
Ver BITACORA D-54/D-55. Sigue: C.1b Eventos de Carga y el backfill de las 82 cargas a un SO c/u.

**Actualización más reciente: 2026-07-30, cierre E62.** Candado de seguridad completado
(variedades/presentaciones/documento_serie cerradas, v_seguridad_auth=0); sincronización V8→ERP
(2 cargas nuevas P-088/P-089, 6 movs, JPM baja a 6,875.93); 8 líneas de costo residuales
atribuidas + 25 documentadas con motivo (228/253); alias pagado/saldo_cxp en
v_cxp_proveedor_atribuido. Spec de socios "Revenue Models" recibida y ubicada en Fase C (C.0).

**Actualización más reciente: 2026-07-30, cierre E61 / arranca E62.** GATE de socios de la
REESTRUCTURA aprobado el 30-jul-2026 — ver sección "REESTRUCTURA — Modelo de Dos Ejes" abajo
(es ahora el rumbo principal del proyecto; las FASE 0–8 de más abajo quedan como historial y
como pendientes operativos que siguen vigentes en paralelo).

## ESTADO ACTUAL (2026-07-27, cierre E48) — LEER PRIMERO
- Balance CUADRADO (centinela 0.00). **`v_balance` tiene 17 filas** (E49 agregó Patrimonio "Ajuste bancario reconocido (sin par)" +21.81; E47 había agregado la 16ª) — cualquier código que asuma un conteo fijo está roto. El Cuadre es ahora orden 17; localizarlo por `seccion='Cuadre'`, nunca por número (el frontend ya lo hace bien).
- JUNIO 2026 CERRADO sin forzar (E44). Periodos dic-25 a jun-26 cerrados. Julio abierto.
- El ERP YA sirve para reportes de utilidad y CxC (se levanta el aviso anterior de "NO usar el ERP para reportes").
- **Sistema en 0 flags abiertas** (desde E47: P-085/AX0013 resuelta — ver D-27).
- **E48 fue sesión de higiene de datos + infraestructura, SIN captura financiera nueva** — las anclas de dinero no cambiaron contra E47.
- Anclas al cierre de E48: JPM 41,214.93 · JEAMS −52,872.00 (deuda contable 162,639) · folio_max_jpm 368 · fecha_max 2026-07-24 · movs_jpm 262 · aplicaciones 180 · 80 cargas vivas · flags 0 · CxC 595,807.09 · CxP 534,578.14 · utilidad neta +2,557.86 · CUADRE 0.00 · v_seguridad_anon 0 · v_seguridad_escritura 0 · Anticipos a productores 31,180.00 · Financiamiento externo 30,000.00 · Pasivo a socios 6,721.81 · Partidas por aplicar −3,278.19 · PRJ-001 tasa 6.2% dispuesto 25,000.00 · contrapartes 81 (Las Brisas/id 67 neutralizada, fusionada en AGROFEPAC/id 4 — ver D-30) · clientes 17 · 13 programas comerciales · **76 RPCs · 101 vistas**.
- Modalidades: 51 margen_fijo · 16 consignación · 13 comisión.
- Módulo nuevo (backend + frontend): **Programas comerciales** — 13 programas (PC-001..PC-013) mapeando los 7 bloques del panorama comercial, con captura completa desde la UI. Detalle abajo en FASE 0 y en REPORTE-FRONTEND.md.
- Frontend: botón **"Editar embarque"** desplegado (`fn_editar_carga` ya existía en backend) — reasigna proveedor/cliente/producto/P.O./fecha/modalidad/estado/venta con motivo obligatorio en bitácora, gate `administrar`. Sección **"Aplicaciones"** en el modal Editar movimiento de Tesorería, sobre el nuevo Gestor de Aplicaciones (`fn_aplicar_a_carga`/`fn_desaplicar`). Detalle en REPORTE-FRONTEND.md.
- **Dos auditorías completas del sistema**: `AUDITORIA.md` (Fable — integridad de datos, 15 hallazgos + certificación de lo sano) y `AUDITORIA-FRONTEND.md` (Claude Code — frontend). Falsos positivos ya descartados en vivo: A-15 (Fable) y 3 hallazgos de "función muerta" de la pasada de Opus — **no re-perseguirlos**. En E48 se resolvieron **A-02** (zona horaria en funciones) y **A-03** (duplicado AGROFEPAC/Las Brisas) — ver FASE 0 abajo.

### Actualización E54 (2026-07-28) — variedad de producto, documentos oficiales, Presentaciones
- **Variedad de producto (tablas + captura + edición + catálogo + vistas): COMPLETO.** Backend
  (`variedades`, `cargas.variedad_id`, `fn_alta_variedad`/`fn_set_variedad_carga`,
  `v_catalogo_variedades`, `v_carga_detalle.variedad_id/variedad_nombre`) y frontend (selector
  dependiente en Nueva/Editar carga + mini-pantalla de catálogo) desplegados y verificados.
  Decisiones detrás: `BITACORA-DECISIONES.md` D-35 (variedad separada del nombre) y D-37
  (Espárrago Convencional/Orgánico).
- **Módulo de documentos oficiales (Invoice/Purchase Order/Quote con membrete real): COMPLETO.**
  `v_documento_invoice`/`v_documento_po`/`v_documento_quote` + membrete compartido
  (`exportar.js`) consumido por Facturación, Órdenes de Compra y Comercial. Verificado en vivo y
  con vista previa visual en navegador antes de desplegar. Detalle en REPORTE-FRONTEND.md.
- **Presentaciones/SKU: PENDIENTE.** Tabla `presentaciones` creada (calibre_tipo/calibre_valor/
  marca/es_reempaque, ver D-38) pero **sin enganchar** a ningún flujo de captura todavía — es el
  **siguiente bloque grande** del plan. Requiere las imágenes del "silo" de Miguel (catálogo real
  de calibres por producto) antes de poder diseñar la captura.

### E55 (2026-07-29)
- [x] Numeración oficial de documentos OC/Quote (serie anual, número al enviar; documento_serie +
  fn_siguiente_numero_doc). Frontend: PDF y listas muestran el número.
- [x] Limpieza de documentos de prueba (todo lo anulado) + reset de contadores.
- [x] Captura guiada por programa: v_contraparte_productos (guía suave) + v_programa_captura;
  frontend con dropdown ★ y "Nueva carga desde programa".
- [x] Liquidación PDF con membrete de familia; Facturación con un solo botón de PDF.
- [x] Espárrago separado en 2 productos (D-41, revierte D-37).

### E56 (2026-07-29)
- [x] E56 (2026-07-29): trueque Papayas & More desenredado (Opcion B, diferencial informativo
  27,349.33 via v_papm_diferencial) + re-atribucion CxP AGROFEPAC->P&M via v_cxp_proveedor_real
  (AGROFEPAC real 55,567.23). Sin mover anclas. Arranca la REESTRUCTURA (ver Plan de
  Reestructura ERP Plein, Fases 0-4). Pendiente: Opcion A neteo (espera Samuel).

### E57–E61 (2026-07-30) — REESTRUCTURA: GATE aprobado, atribución de proveedores 88%
- [x] **E57 — descubrimiento del proceso real (junta de socios).** Se recorrieron cargas reales
  (FMU01 multi-proveedor, trueque P&M, consignación, comisión pura). Hallazgo mayor: falta la
  entidad "Acuerdo Comercial por contraparte" que explica todos los parches actuales. Las 5
  variantes feas ya vistas (rechazo, reempaque, ajuste de precio, reembolso, reasignación) van
  como Eventos de Carga tipificados. Documento de proceso (deber ser) definió el Sales Order
  como documento comercial central, relación SO↔OC muchos-a-muchos (3 escenarios). Evaluación
  del Silo de Miguel (3 reuniones, 81 capturas) como referencia de diseño — patrones a robar:
  contraparte multi-rol, costo por línea con proveedor, prorrateo de gastos, catálogo de
  unidades estructurado, Credit Invoice tipificado, Settlement Calculator (margen objetivo),
  contabilidad de doble partida automática. Doc `Evaluacion_Silo_Patrones_ERP_Plein.docx`
  entregado. **GATE de socios aprobado 30-jul-2026**: modelo de Dos Ejes, Plan A→B→C→D (ver
  sección "REESTRUCTURA" abajo).
- [x] **E59 — excepción acotada en `fn_chk_periodo_cerrado`.** 3ª excepción (mismo patrón que
  E36/E44): un `UPDATE` en `carga_costos` que SOLO toca `contraparte_id` (nunca `concepto` ni
  `monto`) pasa en meses cerrados. Probado que sigue bloqueando cambios de monto. Ver D-47.
- [x] **E60 — atribución masiva de proveedores por línea, 220/251 líneas (88%).** Método:
  Fletes→BBA(9), Aduanas→Suárez(49), In&Out→Agricooling(3) (inequívocos, sin cruce); Materia
  prima/Comisión/Cartón vía puente `id_v7`→V8 (cruce por `id_v7` **NUNCA por folio**: 22
  embarques tienen folio≠id_v7). Alta de Succar Farms (comisionista); Luis Alvarez ya existía
  (id 84). **Descubrimiento crítico:** `cargas.proveedor_id` era un cajón de sastre (AGROFEPAC
  aparecía en cargas cuya materia prima real era de P&M o Las Brisas) — la atribución por línea
  corrigió el error histórico. FMU01 (P-025) atribuido a sus 4 proveedores reales. Ver D-49.
- [x] **E61 — cierre: vista `v_cxp_proveedor_atribuido`.** CxP por proveedor real vía
  `carga_costos.contraparte_id`. Nace cerrada (REVOKE anon/PUBLIC, GRANT authenticated). Costo
  exacto $1,068,388.47; pagado/saldo ESTIMADOS por prorrateo (pagos aún a nivel carga). Jubila
  conceptualmente el parche `v_cxp_proveedor_real` (E56). **Pendiente:** reapuntar frontend
  `modulo-pagos.js:108` — ver `REPORTE-FRONTEND.md`. Anclas al cierre (sin cambio de dinero):
  CxC 595,807.09 · CxP 534,578.14 · Cuadre 0.00 · JPM 41,214.93 · JEAMS −52,872.00 · productos
  12 · presentaciones 45 · variedades 8 · contrapartes 71 · cargas 87 (80 vivas) · costos
  atribuidos 220/251 · seg 0/0.
- [ ] **SIGUIENTE E62** — pendientes que quedan abiertos al cierre de E61:
  - Sincronización V8→ERP (sesión dedicada, toca dinero): P-084/P-085 + movimientos (CxC
    +$23,387, CxP −$25,270), cotejo banco→V7→ERP por P.O., cierre de las 31 líneas de costo
    residuales y atribución de PAGOS por línea (hoy pagado/saldo de
    `v_cxp_proveedor_atribuido` son estimados por prorrateo, no exactos).
  - Ligar `cargas.presentacion_id` (espera datos de Samuel); variedades faltantes (captura
    progresiva); Bell Pepper/Coco/Habanero sin presentaciones.
  - Fase C (flujo documental) y Fase D (contabilidad automática): no empezadas.
  - Opción A del trueque Papayas & More (neteo formal, D-42): espera Samuel.

## REESTRUCTURA — Modelo de Dos Ejes (GATE de socios aprobado 2026-07-30)

**Modelo objetivo:** DOS EJES que se cruzan en la Carga — el **Sales Order** manda lo comercial
(qué se vendió, a quién, en qué términos) y el **Lote** manda el costeo (qué costó, de qué
proveedor, en qué presentación). La Carga es el punto de cruce operativo. Ver D-45 en
`BITACORA-DECISIONES.md` para el razonamiento completo.

- **Fase C — Flujo documental (Sales Order → OC → Envío → Factura → Liquidación): tablas
  parcialmente pobladas — **C.0 Revenue Models (E64), C.1 Orden de Venta (E65) y C.1b Eventos de Carga (E66) HECHOS;
  resto del flujo (Envío/Factura/Liquidación) **COMPLETO (E76): Factura-desde-SO (D-69), Liquidación auto (D-70), Envío/Load (D-71). FASE C COMPLETA.**

  **C.0 — Catálogo de Revenue Models (spec de socios, doc "Plein Produce ERP — Revenue Models",
  2026-07-30). PRIMER sub-bloque de Fase C.** Los socios formalizaron que **cada Sales Order debe
  tener un Revenue Model obligatorio** que determina cómo se calcula el ingreso/utilidad, sin
  cambiar el flujo operativo (SO→OC→Inventory→Shipping→Invoice→Profit). Cuatro modelos base:
    1. **Commission per Box** — $X fijo por caja; producto del productor; Plein no gana por
       diferencia (= modalidad `comision` actual, Alpine).
    2. **Margin per Box** — compra/revende, utilidad = venta − compra ("el más usado").
    3. **Percentage of Sale** — % del monto total de venta (**NUEVO — hoy NO se modela como tal;
       la regla "comisión consignación = 10% del gross" es justo esto, hoy calculado a mano**).
    4. **Buy & Resell** — compra + toma inventario + prorrateo de TODOS los costos (freight,
       cooling, repacking, storage, brokerage, inspection). Es la atribución por línea de E60/E62.
  Escalables futuros que exige el doc (modelar como CATÁLOGO, no enum rígido): Consignment,
  Fixed Brokerage Fee, Marketing Programs, Rebates, Volume Incentives, Revenue Sharing,
  combinaciones comisión+margen.
  **Diseño:** tabla `revenue_models` (catálogo, nace cerrada) + columna obligatoria
  `revenue_model_id` en `sales_orders`. Ver D-50 en BITACORA para las 3 decisiones de negocio
  pendientes (requieren GATE de socios antes de programar C.0).

  **C.1 — Orden de Venta: HECHO (E65).** `sales_orders` (documento padre, `revenue_model_id`
  obligatorio, params del modelo como columnas nullables validadas por trigger) + `sales_order_cargas`
  (capa m:n SO↔carga, `cajas_asignadas`, guard Σ ≤ cargas.cajas; cubre E1/E2/E3 de ERP_1). RPCs
  `fn_crear_so` / `fn_asignar_carga_so` / `fn_desasignar_carga_so` / `fn_confirmar_so` / `fn_cerrar_so`
  / `fn_cancelar_so`. Vistas `v_sales_orders` / `v_sales_order_cargas`. Estado
  Borrador→Confirmada→Cerrada (+Cancelada). Numeración interna SO-#### (D-55). Ver D-54/D-55.

  **C.1b — Eventos de Carga: HECHO (E66).** (rechazo/reempaque/ajuste_precio/reembolso/reasignación). Catálogo `evento_tipos` (5, banderas exige_*) + `eventos_carga` (append-only, sólo registra; refs por id al dinero real). Vistas `v_evento_tipos`/`v_eventos_carga`; RPCs `fn_registrar_evento_carga`/`fn_anular_evento_carga`; triggers de validación por bandera + inmutabilidad. Ver D-56. Pendiente: UI de eventos (Claude Code).

  **C.2 — LOTE (eje de compra) + reparto Lote↔OV + rentabilidad: HECHO completo — backend + datos + frontend (E73, D-64).**
  Entidad **Lote** (`LOTE-YYYY-####` vía `fn_siguiente_lote`, contador compartido con `tg_asignar_lote`),
  `lote_items` (multi-producto) y `lote_ventas` (reparto m:n Lote↔SO, guard Σ cajas ≤ cajas del lote) —
  cubre "1 carga física repartida a N ventas". RPCs `fn_crear_lote`/`fn_agregar_item_lote`/
  `fn_asignar_venta_lote`/`fn_desasignar_venta_lote`/`fn_anular_lote`. Vistas `v_lotes`/`v_lote_items`/
  `v_lote_ventas`/`v_lote_cadena` (Lote→reparto→OV→RM)/`v_lote_rentabilidad` (reusa el reconocimiento ya
  vetado de `v_carga_detalle` por modalidad). Migración 89 lotes espejo 1:1 (7 anulados) + backfill 73
  `lote_ventas` desde `sales_order_cargas` (0 discrepancias cliente). Frontend `modulo-lotes.js` (Claude
  Code, sin desplegar). Puente **TRANSITORIO** `lotes.carga_folio` (deriva costo; se ELIMINA en la
  re-ancla). Paso 1 conviviendo con el modelo actual. Ver D-63/D-64.
  **RE-ANCLA DE COSTOS: HECHA (E74, D-65)** — `carga_costos.lote_folio` (backfill 257/257) es la fuente de costo; el puente `carga_folio` ya no; trigger `tg_carga_costos_set_lote`; índice UNIQUE parcial `ux_lotes_carga_folio`.
  **PRICING A1+B+C: HECHO (E74, D-66)** — `lote_ventas.precio_caja` + multi-tranche (sin UNIQUE lote,SO); `v_lote_rentabilidad` revenue/utilidad/margen del LOTE por `formula_tipo`; RPCs re-firmadas (`fn_desasignar_venta_lote(p_id)`). **Ripple frontend HECHO Y DESPLEGADO (E75)** — `modulo-lotes.js` en prod con reparto con precio + desasignar por `id` (y el gate de "Quitar" corregido a `editar`).
  **INVENTARIO POR LOTE (estados Silo Reconcile): HECHO (E75, D-67)** — tabla `lote_movimientos` (`merma|rts`, guard `Σ(vendido+merma+rts) ≤ cajas`, soft-delete) + `v_lote_inventario` (`total/sold/waste/rts/on_hand/ats`) + `v_lote_movimientos` (detalle) + RPCs `fn_registrar_mov_lote` / `fn_anular_mov_lote`. **MONEY-NEUTRAL** (no toca CxC/CxP/Cuadre); número-preservador (0 discrepancias vs `cajas_disponibles`). Frontend "Inventario del lote" desplegado en `modulo-lotes.js` (E75).
  PARQUEADO (arquitectura): captura futura lote-first (carga nueva no crea lote espejo — D-65) · `fn_editar_venta_lote` (opcional) · ajuste de CxP por RTS si algún día debe mover dinero (hoy money-neutral) · columnas On-hand/ATS en la LISTA de lotes (fase 2 frontend).

  **C.3+ — resto del flujo documental: HECHO (E76).** Factura-desde-SO (`fn_crear_factura_desde_so`, D-69), Liquidación al productor auto (`fn_crear_liquidacion_auto`, D-70), y Envío = entidad **Load** (`loads`/`load_cargas`, agrupa cargas, logística MX→USA opcional, D-71). El "Envío" NO es campos en la carga: es el Load que consolida 1+ cargas. Documentos de embarque (BOL/Carta Porte/packing list/fitosanitario/FDA) vía módulo Documentos (entidad `load`). Todo money-neutral.

  **Backfill (pendiente):** poblar 1 SO por cada una de las 82 cargas vivas. Mapeo modalidad→RM:
  comisión→RM-001, consignación→RM-003, margen_fijo→RM-002/RM-004 (el split depende de D-50).
- **Fase D — Contabilidad automática:** el Revenue Model del SO es lo que determina el asiento
  contable (el doc lo confirma: "lo único que cambia es cómo se calcula el ingreso"). Valida el
  diseño de D. No empezada.

**Principio rector: NO reconstruir.** El esqueleto de tablas para este modelo **YA EXISTE** de
sesiones anteriores; el plan es poblarlo, no rehacerlo desde cero (ver D-46). Secuencia
obligatoria A→B→C→D, una fase a la vez:

- **Fase A — Catálogo de 3 niveles (Producto › Presentación › Variedad): COMPLETA.**
  `productos` 10→12, `presentaciones` 0→45 (catálogo de referencia), variedad redefinida a
  cultivar botánico (8 variedades). Detalle en `CLAUDE.md` ("Objetos nuevos de E57–E61").
- **Fase B — Partir la Carga: estructura lista, atribución de costos al 88% (220/251 líneas).**
  `cargas.presentacion_id` y `carga_costos.contraparte_id` ya existen. Pendiente: ligar
  `presentacion_id` (espera datos de Samuel) y cerrar las 31 líneas de costo residuales.
- **Fase C — Flujo documental (Sales Order → OC → Envío → Factura → Liquidación): tablas
  parcialmente pobladas — **C.0 Revenue Models (E64), C.1 Orden de Venta (E65) y C.1b Eventos de Carga (E66) HECHOS;
  resto del flujo (Envío/Factura/Liquidación) **COMPLETO (E76): Factura-desde-SO (D-69), Liquidación auto (D-70), Envío/Load (D-71). FASE C COMPLETA.**
- **Fase D — Contabilidad automática (asientos que nacen de la operación, no se capturan a
  mano): no empezada.**

**Regla de variedad (aplicar en todo catálogo nuevo, ver D-44):** Variedad = **cultivar
botánico** (ej. Maradol, Tainung, Intenzza, Vegas). Color, calibre, grado y orgánico son
atributos de **PRESENTACIÓN**, no de variedad. La operación de Plein hoy NO maneja calibre/SKU
por carga — el V8 de Samuel registra producto+color (ej. "Habanero Rojo"); las 45 presentaciones
cargadas son catálogo de referencia, todavía sin enganchar a la captura por carga.

## PROTOCOLO DE CONTINUIDAD (obligatorio al abrir cualquier sesión, chat o Claude Code)
1. Backend en vivo: SELECT * FROM v_estado_sistema; y SELECT * FROM v_estado_modulos;
2. Verificación: SELECT * FROM v_anclas; y **`v_seguridad_anon` Y `v_seguridad_escritura` deben dar 0 filas** (0 = ok; >0 = ALERTA: hay una tabla con escritura abierta a anon o authenticated). Mismo criterio para ambas.
3. Frontend: leer REPORTE-FRONTEND.md (Claude Code lo actualiza al final de cada sesión suya)
4. Rumbo: leer este archivo
5. Solo entonces, plantear la sesión

## SEGURIDAD (RLS / escritura) — fuga cerrada en E43 (2026-07-24)
- **Fuga descubierta:** Supabase, por DEFAULT PRIVILEGES, daba **INSERT/UPDATE/DELETE a `authenticated`** en TODA tabla nueva de `public`. La regla anterior ("REVOKE de anon y PUBLIC") NO cubría a authenticated.
- **Tablas que estuvieron abiertas:** las 5 del módulo Proyectos, **`facturas`** (permitía saltarse `fn_emitir_factura` y la serie PP-AAAA-NNNN) y **`carga_documentos`** (política permisiva total).
- **Arreglo:** se revocó escritura de `authenticated` y `anon` en TODAS las tablas de `public`; se corrigió `ALTER DEFAULT PRIVILEGES` para que tablas y funciones futuras nazcan cerradas; y se creó la vista **`v_seguridad_escritura`** (debe dar **0 filas SIEMPRE**, igual que `v_seguridad_anon`).
- **REGLA NUEVA para todo objeto futuro:** REVOKE de anon, PUBLIC **y authenticated**; la escritura SOLO por RPC `SECURITY DEFINER`.
- **Verificado:** el frontend NO requirió cambios (siempre leyó por vistas y escribió por RPC).

## MODALIDADES DE NEGOCIO
El ERP modela TRES: **`margen_fijo`**, **`consignacion`** (el ingreso se reconoce al liquidar el cliente) y **`comision`**.
- **COMISIÓN PURA (modelada en E44):** Plein **NO compra el producto**, solo cobra comisión. Aplica a las **11 cargas de Alpine Fresh** — folios ERP **P-038, P-048, P-050, P-055, P-056, P-057, P-062, P-063, P-064, P-065, P-085** (referencia V7: serie AX). En esas cargas **COSTO 0 y MARGEN 100% son CORRECTOS**: el ingreso registrado ES la comisión. **NUNCA pedir "el costo faltante".** `v_placeholders` ya excluye `'comision'` de la patología "COSTO 0 – margen 100%", y `v_estado_resultados` reconoce su ingreso al embarque como utilidad bruta íntegra. **OJO:** las Kabocha de CRI (PO 1001/1002 = ERP P-073/P-075) y Carrifoods (PO 24 = ERP P-071) **NO son comisión**: ahí sí hubo pago de fruta a proveedor. Siguen como consignación, parqueadas en TAR-0001..0004.

## FASE 0 — Cimiento contable [COMPLETA 2026-07-17]
- [x] Banco conciliado 100% · JEAMS virtual · margen fijo/consignación · costos · aplicaciones realineadas (E28) · flags · cierres dic-mar · seguridad anon=0 · v_estado_sistema/v_estado_modulos (2026-07-17)
- [x] Limpieza de datos E37 (2026-07-22): los **21 flags se resolvieron a 0** y se **anularon 7 cargas basura → quedan 70 cargas vivas**. Nueva **ancla de utilidad +75.24** (subió por ventas reales capturadas al liquidar consignaciones y por corregir montos contra el V7 de Samuel). Verificar siempre contra `v_anclas`.
- [x] Cierre abril (2026-07-22, E38) · [x] Movs post-14-jul cargados al ERP (16 movs del CHASE, JPM al 20-jul = 1,554.93, E38) · [ ] Cierre mayo · [ ] Cierre junio · [ ] Cierre julio · [ ] Serie de factura (Miguel)
- [x] Cierre ABRIL (E38, 2026-07-22): aplicados movs 123 y 125 (-672 c/u, reembolso de aduana + in&out a Papayas & More, que prestaba su broker) → P-019 (aduana 530.73 + in&out 141.27, queda MARGEN 0 correcto) y P-021 (aduana 258; su in&out 414 ya existía). mov 180 (Agricooling 414) reasignado de P-021 → P-043 (el 414 era de la 1930). Marzo reabierto y re-cerrado forzado (P-019 margen 0 es correcto, no error). Nueva ancla de utilidad neta -854.76 (los 930 de reembolso que flotaban ya se reconocieron). Banco reconciliado al centavo contra la pestaña CHASE del V7 hasta 14-jul (236 movs = 13,780.35). Verificar siempre contra v_anclas.
- [x] Cierre ABRIL (E38, 2026-07-22): movs 123/125 (-672 c/u, reembolso aduana+in&out a Papayas) aplicados a P-019 (queda margen 0 correcto) y P-021; mov 180 (Agricooling 414) reasignado P-021->P-043; marzo reabierto y re-cerrado forzado (P-019 margen 0). Utilidad neta -854.76.
- [x] Captura post-corte JULIO (E38, 2026-07-22): 16 movs del CHASE (folios 343-358, neto -12,225.42) cargados; JPM ahora 1,554.93 (al 20-jul), reconciliado al centavo vs pestaña CHASE del V7. Pendiente: aplicar los pagos a proveedor de julio (Cornejos/Carrifoods/Agrofepac/Akambarhu) a sus cargas Kabocha/Yaca/habanero; alta de contrapartes DRAGE CPA LLC y US PATENT; luego cerrar julio.
- [x] Cierre MAYO (E39, 2026-07-23): P-034 Tierra Selecta reclasificada a rechazo puro (venta 0, sin costo, wash en banco, sin saldo). P-038 Alpine confirmada costo 0 / margen 100%. P-043 CRI corregida a V7 (MP 6,977.28, comisión 554.40). 0 bloqueadores.
- [x] Cierre JUNIO (E39, 2026-07-23): 3 consignaciones Alpine (AX003/AX004/AX006) confirmadas costo 0 / margen 100%. Mov 283 (El Sagrado 100) reclasificado a Materiales de empaque. 0 bloqueadores.
- [x] Conciliación completa V7 ↔ ERP (E39): banco cuadra al centavo; 74 cargas vivas casan 1:1 con el V7; cotejo concepto por concepto (245 líneas) sin diferencias. Se dieron de alta 4 embarques que faltaban (P-078 a P-081).
- [x] FUGA DE BALANCE CERRADA (E39): el cuadre daba 1,573.04, ahora 0.00.
- [ ] Cierre JULIO — BLOQUEADO LEGÍTIMAMENTE: P-077 a P-081 son contenedores en tránsito. Cierra cuando lleguen (fn_confirmar_entrega) y termine el mes.
- [x] Corrección de fechas de embarque contra V7 (E40, 2026-07-23): 15 cargas tenían la f_embarque distinta a la del V7 (fuente autorizada). Se reabrieron mayo y junio (fn_reabrir_periodo), se corrigieron las 15 y se re-cerraron ambos meses, los dos con 0 bloqueadores. Bitácora: "Correccion de fechas de embarque contra V7 - E40". Cargas corregidas: P-036, P-037, P-038, P-042, P-048, P-049, P-055, P-056, P-057, P-062, P-063, P-064, P-065, P-066, P-075. Efecto: 42,513.98 de venta se movieron de junio a julio (P-049 = 16,629.98 y P-066 = 25,884.00). Junio: 227,547.25 → 185,033.27 de ingreso. Julio: 120,941.24 → 163,455.22 de ingreso. El acumulado NO cambió; utilidad neta, anclas y cuadre intactos. `f_embarque` sólo lo usan v_estado_resultados y v_cierre_checklist.
- [x] Cajas completadas (E40, 2026-07-23): se llenaron cajas y pallets desde el V7 en P-05, P-06, P-063, P-064 y P-065, con cajas_origen y origen_operativo = 'v7_samuel'. Cargas vivas sin cajas: 0.
- [~] Módulo Proyectos y Financiamiento a productores — DISEÑO (E40, 2026-07-23): DDL v1 final ESCRITO Y NO EJECUTADO; se aplica sólo cuando cierre julio. Patrón contable: JEAMS al revés (activo con saldo vivo, no toca P&L). Piezas: proyectos_productor, contratos_entrega, proyecto_amortizaciones, proyecto_flujo_plan; columnas proyecto_id y contrato_id en movimientos y cargas; y dos tipos de movimiento nuevos (Anticipo a productor, Financiamiento externo), ambos con afecta_pl = false. Incluye fuente_fondeo (propio/agrocapital/back_to_back/otro) con su fondeador_id, y costo_financiero configurable por proyecto (no_aplica/plein/productor/compartido). El DDL completo está en el chat de la sesión E40.
- [x] Anclas al cierre de E40 (2026-07-23): JPM 1,554.93 · JEAMS −52,872.00 · folio_max 358 · fecha_max 2026-07-20 · 74 cargas vivas · flags 0 · aplicaciones 174 · CxC 550,331.89 · CxP 477,378.14 · utilidad neta acumulada −6,048.33 · CUADRE BALANCE 0.00 · v_seguridad_anon 0 filas. Periodos dic-25 a jun-26 CERRADOS. Julio abierto: 5 bloqueadores (P-077 a P-081 sin f_entrega_real), 9 consignaciones sin liquidar.
- [ ] SIGUIENTE E41 — estados faltantes de cargas (En Camino, Revisión/QC, Cargas por Confirmar).
- [x] Barrido de fechas E43 (2026-07-24): se reemplazó `CURRENT_DATE` por `fn_hoy()` (America/Mazatlan) en **9 vistas** — v_panel_hoy, v_cxc, v_cxp, v_cxp_aging, v_cxp_proximas, v_tareas, v_tareas_resumen, v_carga_detalle, v_kpi_rotacion_cobranza. Motivo: el servidor corre en UTC y después de las 17:00 locales contaba **un día de más** en todas las antigüedades. Efecto medido: **−61 días** en la suma de días vencidos de CxC, y 2 CxP que se marcaban vencidas antes de tiempo. Ya **no queda ningún `CURRENT_DATE`** en la base.
- [x] Sincronización V7 / ClickUp E43 (2026-07-24): se capturaron **6 id_v7 → 0 cargas vivas sin id_v7** (77 mapeadas); **12 cambios de estado** sincronizados con ClickUp/V7; **4 cargas nuevas** dadas de alta — PX-72589, PX-72648, PX-72650 (Crystal Valley / Pampa Store) y AX0013 (Alpine / Agrícola Omega) → el ERP pasó de **74 a 78 cargas vivas**. **⚠ AVISO CRÍTICO (permanente):** los folios del ERP y los del V7 de Samuel **NO comparten numeración**; se cruzan por `cargas.id_v7`. Ejemplos reales: **ERP P-049 = V7 P-068 · ERP P-067 = V7 P-046 · ERP P-058 = V7 P-057**. Comparar por folio directo produce cruces equivocados (ver CLAUDE.md regla #11).
- [x] Cierre JUNIO (E44, 2026-07-24): modalidad comisión a las 11 Alpine + renglón de Pasivo "Ingreso de consignación declarado, no reconocido" en v_balance. Cuadre de vuelta en 0.00. Junio cerrado sin forzar, 0 bloqueadores. Utilidad neta acumulada +2,942.87.
- [x] Módulo Proyectos EJECUTADO (E44, 2026-07-24): el DDL que estaba escrito-y-no-ejecutado (E40) ya corrió. PRJ-005 (Santana — Baby Broccoli 8oz SBB 26/27) dado de alta: productor José Pablo Santana (Mexicali), fondeador JEAMS, línea 10,349.86, primera disposición 6,180 (semilla), 4 movimientos capturados (359-362), plan de flujo de 110 filas sembrado en proyecto_flujo_plan. Renglón de Activo "Anticipos a productores (líneas de proyecto)" agregado a v_balance (patrón JEAMS al revés).
- [x] Descripciones del V7 en Tesorería (E44): 241 movimientos recibieron su descripción real del V7 (antes descripción=contraparte). Solo texto documental, sin efecto contable.
- [x] E45/E46: plan de flujo de proyectos resuelto (2026-07-25) — **NO se unifica** con `presupuesto` (D-16, Opción B: son tablas distintas a propósito, plan de flujo = tesorería del proyecto, presupuesto = gasto blando discrecional). Vistas `v_proyecto_flujo`/`v_proyecto_flujo_pico` construidas sobre `proyecto_flujo_plan` y sacadas a pantalla en el módulo Proyectos: sección "Plan de flujo del proyecto" con curva acumulada (SVG), toggle Plein/Productor/Total (oculto si el proyecto es single-layer) y tarjeta de alerta con pico/cruce a positivo. PRJ-005 re-sembrado con modelo "3 contratos" (D-18, single-layer): nuevo pico **−78,820** (reemplaza el −41,937/−118,619 del modelo de dos capas de E44).
- [x] Días de pago observados (E46, 2026-07-25): vista nueva `v_dias_pago_observado` (D-17: días medidos desde `f_embarque`; gap = prom − contratado) — insumo del futuro flujo proyectado 30/60/90 (hoy 15 días provisionales para todos). Panel "Días de pago por cliente" en Finanzas, con semáforo de gap y callout cuando el cliente de mayor peso en la CxC paga fuera de lo contratado.
- [x] Alta de cargas Alpine del V7 (E46, 2026-07-25): el ERP pasó de 78 a 80 cargas vivas. Modalidades al cierre: 51 margen_fijo · 16 consignación · 13 comisión (antes 11 comisión).
- [x] Registro Samuel/Akambarhu (E46, 2026-07-25): cuenta virtual **SAMUEL** creada (D-19, excluida del banco en `v_balance` — dinero que un socio pone de su bolsa nunca se mezcla con JPM/Chase, mismo patrón que JEAMS). PRJ-001 (Akambarhu) con línea dispuesta **4,405.03**. Deuda a Samuel al cierre de E46: **6,726.84**.
- [ ] SIGUIENTE E47 — registrar el back-to-back del lunes + apagar la deuda a Samuel (6,726.84).
- [x] Días de crédito reales por cliente (E47, 2026-07-26): capturados del panorama comercial — Northgate 30 (21+cheque), Crystal Valley 21 (pick&pack), CRI 15 (wire), Alpine 15. Reemplazan la suposición uniforme de 15 días que arrastraba `v_dias_pago_observado` desde E46. Alta de Tropical Specialist (id 80) y de Costatropical Papayas Inc (id 81, clase operativo, proveedor de servicio de reempaque — distinta de Papayas & More, id 40; ver D-26).
- [x] Módulo comercial "Programas comerciales" — backend completo (E47, 2026-07-26): tabla `programas_comerciales`, 13 filas PC-001..PC-013 mapeando los 7 bloques del panorama comercial (columna `etiqueta` NOT NULL = nombre legible, el código PC-### es la llave estable — ver D-21). Columnas `producto_ids`, `venta_tipica_carga`, `cajas_tipicas_carga`. Columna `cargas.programa_id` (NO contable) con backfill de 66 de 80 cargas y trigger `tg_cargas_programa` que auto-liga cargas nuevas vía `fn_match_programa` (match determinista cliente+proveedor+producto+temporada; NULL si hay ambigüedad — ver D-22). Vistas `v_programas_comerciales`, `v_programas_proyeccion`, `v_programa_cargas`, `v_cargas_programa`. RPCs `fn_crear_programa`, `fn_editar_programa`, `fn_ligar_carga_programa`, `fn_match_programa`, `fn_etiqueta_sugerida`. `v_agenda_operativa` ganó la regla 8 `'programa_sin_carga'`.
- [x] Módulo comercial "Programas" — frontend completo (E47, 2026-07-25 a 27): módulo nuevo "Programas" (lista agrupada por bloque + proyección anual + real por programa), captura completa vía RPC (alta/edición/ligar-desligar de programas, con gating por rol igual que Facturas/OC), alta de Proyectos (formulario nuevo sobre `fn_crear_proyecto`, ya existente), chips de programa en la lista de Embarques y en el Expediente, y bugfix del filtro por bloque (comparaba string contra number sin normalizar — la lista se quedaba vacía al hacer clic en cualquier chip de bloque). Detalle completo, sesión por sesión, en `REPORTE-FRONTEND.md`.
- [x] `v_balance` ganó la línea 16 "Financiamiento externo (back-to-back, con tasa)" (E47, 2026-07-26): SEPARADA de la deuda JEAMS porque el back-to-back sí causa interés (tasa 6.2% anual en `PRJ-001.tasa_anual` desde el 24-jul-2026, ver D-23). Balance pasa de 15 a 16 filas — ver CLAUDE.md regla 9.
- [x] Captura financiera del 24-jul (E47, 2026-07-26): movs 363-368 (back-to-back +30,000 · Crystal +44,040 · Agrofepac −10,000 · Akambarhu −20,600 · BBA −3,250 · Suarez −50), tasa 6.2% sembrada en PRJ-001, ajuste de TC de los 77,000 MXN a 4,400.00 USD exactos (ver D-24), disposición de 20,600 y FIFO de Crystal + aplicación directa a P-080 (ver D-25 sobre partidas sin aplicar).
- [x] P-085 (AX0013) resuelta (E47, 2026-07-26): proveedor asignado = Agrícola Omega (id 7), NO Paumar. Flag bajado; sistema quedó en **0 flags abiertos**. Resuelve la discrepancia Paumar-vs-Omega que llevaba tiempo parqueada: es Omega — el V7 confirma 15/15 cargas de Alpine bajo ese proveedor (ver D-27).
- [x] Pago Yaca de 10,000 (mov 365) reasignado (E47, 2026-07-26): se quitó de P-080 directo y se aplicó FIFO a la deuda más vieja de Las Brisas primero — P-079 (15-jul) se salda, el resto va a P-080. Instrucción de Miguel: es abono a cuenta, no pago a carga específica (ver D-28).
- [x] Confirmado que P-079/P-080 SÍ son de Las Brisas/Yaca (E47, 2026-07-26): el folio ERP y el id_v7 son numeraciones distintas, no había mala atribución. El hallazgo A-03 de la auditoría es solo duplicado de catálogo, no error de datos (ver D-29).
- [x] Botón "Editar embarque" desplegado en frontend (E47, 2026-07-26): `fn_editar_carga` ya existía en backend — reasigna proveedor/cliente/producto (y P.O./fecha/modalidad/estado/venta) con motivo obligatorio en bitácora, gate `administrar`. Detalle en REPORTE-FRONTEND.md.
- [x] Dos auditorías completas del sistema corridas (E47, 2026-07-26/27): `AUDITORIA.md` (Fable — 15 hallazgos + certificación de lo sano) y `AUDITORIA-FRONTEND.md` (Claude Code — frontend). Falsos positivos ya descartados en vivo: A-15 y 3 hallazgos de "función muerta" de la pasada de Opus — **no re-perseguirlos**.
- [ ] SIGUIENTE E48 — pendientes que quedaron abiertos al cierre de E47:
  - **Miguel:** TC del reembolso a Samuel del reempaque (1,885.01 @17.48 vs 1,996 que trae Samuel, diferencia 110.99) · devolución a Samuel de 6,721.81 (la deuda NO se apagó en E47, solo se ajustó de 6,726.84 a 6,721.81) · destino del remanente del back-to-back · River 20lb del modelo Santana.
  - **Samuel:** FALTA CAPTURAR la carga de kabocha que cruzó el 20/07/2026 (existe el pago de aduana pero no la carga; por eso salta la alerta de PC-005) · a qué embarque va el flete BBA de 3,250 · TAR-0001..0004 (siguen abiertos desde E44).
  - **Backend:** devengo del interés del back-to-back (solo está fijada la tasa, falta el mecanismo) · fusión de "Las Brisas Produce" (67) en "AGROFEPAC" (4) · alta del producto "Bell Pepper Rojo" (PC-006 quedó sin `producto_ids`) · flag pago-contra-cobro en CxP · separar el neteo del trueque de Papayas & More del aging (ver D-20).
  - **Datos de proyección:** `venta_tipica_carga`/`cajas_tipicas_carga` vacíos en los 13 programas → la columna de ingreso de `v_programas_proyeccion` sale en "—" para todos. 3 programas en `por_definir` sin resolver: PC-002 (split), PC-008 (esquema habanero), PC-009 (ingreso espárrago).
  - **En curso:** auditoría del sistema en 5 fases — Fase 1 (integridad, con Fable) y Fase 3 (frontend, con Claude Code) hechas; faltan Fase 2, 4 y 5.
- [x] E48-A "Gestor de Aplicaciones" — backend + frontend (E48, 2026-07-27): `fn_aplicar_a_carga(p_mov_folio, p_carga_folio, p_monto, p_nota)` y `fn_desaplicar(p_aplicacion_id, p_motivo)`, ambas gate `editar` (ver D-31), vista `v_movimiento_aplicaciones`. Reemplaza el INSERT directo a `aplicaciones` que CLAUDE.md documentaba como único camino — ya NO usar ese INSERT a mano. Frontend: sección "Aplicaciones" en el modal Editar movimiento de Tesorería (lista + resumen aplicado/total/sin-aplicar + acciones Aplicar/Desaplicar). Detalle en REPORTE-FRONTEND.md.
- [x] A-02 resuelto (E48, 2026-07-27): las 5 funciones que usaban `current_date` (`fn_reporte_semanal_texto`, `fn_cerrar_periodo`, `fn_crear_factura`, `fn_siguiente_folio_factura`, `fn_confirmar_entrega`) corregidas a `fn_hoy()`. La base entera queda SIN `current_date` fuera de `fn_hoy()` — D-08 ahora cubre toda la superficie (vistas Y funciones).
- [x] A-03 resuelto (E48, 2026-07-27): Las Brisas Produce (67) fusionada en AGROFEPAC (4); P-079/P-080 reasignadas a proveedor 4; 67 neutralizada. Confirmado por Miguel: mismo proveedor real (Yaca/Thai). Completa y actualiza D-29 (ver D-30) — ya no es "solo duplicado no accionable".
- [x] Sync backend E49 (2026-07-28, sin cambio de dinero): `v_carga_detalle` pasó de 44 a 47 columnas (`cliente_id`/`proveedor_id`/`producto_id` aditivas al final); `v_balance` de 16 a 17 filas (Patrimonio "Ajuste bancario reconocido (sin par)" +21.81, "Partidas por aplicar" ahora −3,300.00 limpia, TOTAL PATRIMONIO −720.33 sin cambio); `fn_liquidar_consignacion` ahora rechaza declarar venta < lo ya cobrado (el frontend ya muestra ese error tal cual). **Resuelve A-04** (ver AUDITORIA.md).
- [x] Producto en la ficha del embarque — RESUELTO (2026-07-28): tarjeta "Producto" agregada al Resumen del Expediente (antes solo estaba en la lista y en la ficha clásica). Cierra el parqueado "Producto faltante en el modal de embarque".
- [x] Balance con 17 filas — verificado en frontend (2026-07-28): `modulo-finanzas.js` agrupa por `seccion`, ordena por `orden` y localiza Cuadre por `seccion='Cuadre'`; cada renglón con `nota` recibe su ⓘ automáticamente (incluida la fila 17). Nada asume 16 filas ni hardcodea el orden. Sin cambio de código.
- [x] Flujo "Capturar venta (liquidar consignación)" — frontend (2026-07-28): botón en la ficha (gate `editar`, solo consignación viva) sobre `fn_liquidar_consignacion`. Detalle en REPORTE-FRONTEND.md.
- [x] v_carga_detalle +3 ids (E49, 2026-07-28): cliente_id/proveedor_id/producto_id al final (44→47 col). Aditivo, discrepancias vs cargas = 0, anclas/cuadre/seguridad intactos. Desbloquea "Editar embarque" (comparar por id, no por nombre).
- [x] A-04 resuelto (E49, 2026-07-28): residuo neutro +21.81 sacado de "Partidas por aplicar" a línea propia "Ajuste bancario reconocido (sin par)" en v_balance; destino corregido en v_balance_partidas. Partidas queda limpia en −3,300.00. TOTAL PATRIMONIO y Cuadre intactos. v_balance 16→17 filas. Ver D-33.
- [x] Menores E49 (2026-07-28): (a) fn_editar_contraparte ahora escribe bitacora_ediciones (diff antes->despues + actor, motivo fijo "Edicion de contraparte", solo si hay cambio real). (b) fn_reporte_semanal_texto blindada contra NULL (COALESCE en cada to_char/escalar + RETURN COALESCE). Sin efecto contable.
- [x] Liquidación de consignación independiente del estado (E49, 2026-07-28): fn_liquidar_consignacion acepta p_estado_final=NULL = capturar venta sin tocar el estado logístico. Firma sin cambio, grants re-asertadas. Habilita el botón de captura en frontend. Ver D-34.
- [x] Guarda anti sobre-cobro en fn_liquidar_consignacion (E49, 2026-07-28): rechaza declarar venta < cobrado (evita CxC negativa por re-liquidación). Cierra el flujo de consignación de punta a punta. Ver D-34 (addendum).
- [ ] SIGUIENTE E50 — parqueados que siguen abiertos (heredados de E49, ninguno urge):
  - **"Editar embarque" migrar a id:** ya se puede comparar/mandar `cliente_id`/`proveedor_id`/`producto_id` (E49 los expuso en `v_carga_detalle`); hoy el frontend aún compara por nombre normalizado como rodeo. Migrar cuando se toque esa zona — ver PENDIENTES-BACKEND.md.
  - $424.67 de aportación V7 pendiente de aclarar (Samuel/José).
  - Visibilidad de cargas en consignación: falta una lista de trabajo ("worklist") de las que están esperando liquidación (el chip/badge de Embarques ya las distingue; falta la worklist dedicada).
  - **A-01 (RLS deshabilitado en 7 tablas)** sigue abierto — ver AUDITORIA.md. **A-04 quedó resuelto en E49.**
  - **EN CARTERA (backend NO construido; NO empezar UI):** si se aprueba el Bloque PACA, vendrá una pantalla "Estado de liquidación al productor" (account of sales) sobre tablas `liquidaciones` + RPC `fn_emitir_liquidacion`. Esperar el contrato exacto del backend antes de tocar UI.

## FASE 1 — Expediente y seriedad documental [COMPLETA 2026-07-17]
- [x] Tabla+bucket documentos · Expediente 4 pestañas · subida drag&drop · exportación Excel/PDF · nomenclatura profesional · Cierres Contables · detectores fijados (2026-07-17)

## FASE 1.5 — Sacar a la luz lo ya construido [EN CURSO]
Hallazgo de la reconciliación: hay más backend que frontend. Conectar pantallas a datos que YA existen:
- [x] Pipeline de estados de embarque: chips de filtro por estado con conteo en Embarques + badge de estado (semáforo suave, mapa central ERP.badgeEstado) en la tabla de Embarques y en el header del Expediente. Solo lectura. (2026-07-18)
- [x] Expediente accesible: botón "＋ Captura y acciones" prominente (sólido, primero) junto a "Exportar Expediente PDF"; verificado que llegan todas las acciones de la ficha clásica (agregar costo, cobros/pagos, resolver revisión, anular). Nota: "editar costo" no existía en la ficha clásica, no se perdió nada. (2026-07-18)
- [x] Panel Finanzas ampliado: conectados v_balance (Balance general), v_flujo_semanal (Flujo semanal), v_cxc_aging (Antigüedad CxC), v_cxp_proximas (CxP próximas), v_kpi_margen_cliente/producto (con columna Costo), v_rentabilidad_carga (Rentabilidad por embarque), cada sección con export Excel/PDF. (2026-07-18)
- [x] Logo de marca (assets/logo-plein.png) en TODOS los PDF de exportación de listados y en el Expediente PDF, vía los helpers compartidos. (2026-07-20)
- [x] Sistema de documentos consolidado (2026-07-22): el backend INVIRTIÓ la decisión — `carga_documentos` quedó JUBILADA y el sistema OFICIAL es `documentos` + `v_documentos` + `fn_registrar_documento` (componente `ERP.documentos` en documentos.js). El Expediente dejó de usar `carga_documentos` y delega en `ERP.documentos.montar` (igual que la ficha clásica); se agregó `referencia_externa`. Un solo camino de documentos en toda la app.
- [x] captura.html legacy retirado del menú (2026-07-22): la captura de movimientos vive en la SPA (`ERP.capturarMovimiento`: botón en Tesorería + contextuales en Cobranza/Pagos). El archivo captura.html queda en disco pero sin enlace.

## FASE 2 — Adopción: matar el Excel [CRÍTICA — el cuello de botella de todo]
Avance real: usuarios_erp (4) y roles_erp (3) YA existen: Miguel admin, Samuel/Chanes captura, José vista.
- [x] Gating por rol en la UI: tras login se lee v_mi_perfil y se ocultan/deshabilitan botones por capacidad (vista=solo lectura, captura=captura+responder flag, admin=todo). Errores "Sin permiso"/"PERMISO_DENEGADO" del backend se muestran como toast claro en español. Header muestra nombre+rol. El login Supabase Auth + JWT ya funcionaba (E31); esto es el reflejo en la UI. (2026-07-18)
- [x] Checkbox "solo capturar (no aplicar)" en captura rápida: visible solo con capacidad editar; sin editar, siempre captura-sin-aplicar. (2026-07-18)
- [x] Captura de embarque nuevo en <2 min: formulario nuevaCarga (fn_crear_carga) con P.O. obligatorio, autocompletar contrapartes/productos con texto libre, muestra folio + con_flag/advertencia. Cumple el contrato exacto. (2026-07-18)
- [x] Pantalla de bitácora: nuevo módulo "Bitácora" (v_bitacora_ediciones) con diff antes→después, filtros por tabla/texto y export Excel/PDF; visible para todos los roles. (2026-07-18)
- [ ] Prueba de fuego: 2 semanas captura doble Samuel → apagar V6/V7  (operativo, con Samuel/Miguel)

## FASE 3 — Ciclo operativo completo
Avance real backend: cotizaciones VIVO (COT-0001) · ordenes_compra+RPCs listos · envios+fn_registrar_envio/fn_actualizar_estado_envio listos · tareas+6 RPCs listos · facturas listo. Falta principalmente UI y USO.
- [x] Orden de Venta — HECHO (backend E65; frontend E66 `modulo-ventas.js`, en prod)
- [ ] Envío de documentos por correo (Resend+DNS) + bitácora v_envios — cubre Factura, OC y cotizaciones. BLOQUEADO: DNS de Miguel.
- [~] Tracking real de embarque (dónde va el contenedor) — **`fn_confirmar_entrega` es el PRIMER LADRILLO** del tracking real (E36/E37): `f_entrega` (programada, estimada) vs `f_entrega_real` (confirmada por una persona) + RPC `fn_confirmar_entrega` + botón "Confirmar entrega" en el Expediente, con tránsito real/estimado y desfase. FALTA el resto de los hitos del contenedor (ubicación en ruta, timeline de estados con responsables, ETA en vivo), que siguen sin backend y requieren diseño en chat.
- [~] Orden de Compra: completar UI + PDF + envío por correo. HECHO (2026-07-18): módulo Órdenes de Compra propio (ruta 'ordenes', menú "📦 Órdenes de Compra") espejo de Facturación. Lista con estado/total/vence + filtros + export; crear (proveedor comercial, moneda, entrega, embarque opcional, editor de líneas producto/descripción) → fn_crear_orden_compra; ficha editable solo en Borrador (fn_editar_orden_compra, ligar/desligar embarque); flujo Borrador→Enviada→Confirmada→Recibida (fn_cambiar_estado_orden) + Cancelar con motivo (fn_anular_orden); recuadro CxP de solo lectura; PDF PURCHASE ORDER; gating por rol; integrado en ficha/Expediente de embarque (montarOrdenesCarga). PENDIENTE: envío por correo (Resend + DNS de Miguel).
- [x] Factura: serie + amarre a CxC (UI 2026-07-18; validado end-to-end 2026-07-20). Módulo Facturación propio (ruta 'facturas'): lista con estado/total/cobro (v_cxc), crear desde embarque (fn_crear_factura), ficha editable, emitir con número de serie PP-AAAA-NNNN (fn_emitir_factura), cancelar con motivo (fn_cancelar_factura), amarre a CxC de solo lectura, PDF imprimible con logo, gating por rol. **Validado E34:** PP-2026-0001 emitida desde la UI, la serie se auto-siembra, incremento y candado anti-doble-emisión probados. Lo **ÚNICO pendiente de Factura es el ENVÍO POR CORREO** (Resend + DNS de Miguel).
  - Nota (bug backend E34, 2026-07-20): fn_cancelar_factura escribía 'cancelada' contra un CHECK que solo acepta 'anulada' → cancelar factura NUNCA funcionó desde E32. Corregido en backend (E34) y ajustado en el frontend (acepta 'anulada', se muestra "Cancelada").
- [x] Logo de marca en los PDF de documentos a cliente/proveedor: INVOICE, PURCHASE ORDER y cotizaciones. Centralizado en ERP.encabezadoImpresion() (plantillas DOM) y ERP.logoPdfDataURL() (jsPDF). (2026-07-20)
- [x] Tareas: UI completa E35 (2026-07-20) — módulo 'tareas' reescrito al contrato v_tareas/v_tareas_resumen/v_tarea_comentarios + 6 RPCs; vista kanban (4 estados) + tabla, chips por área con conteo, filtros por asignado/prioridad/texto, marca de atrasada, ficha (editar/estado/asignar/comentar/cancelar), enlaces cruzados a embarque/cotización/orden, gating por rol, export, e integrada en la ficha/Expediente de embarque. PENDIENTE: adopción real (reemplazo ClickUp) con los socios.
- [x] Estados de embarque v2 (E41, 2026-07-23): 8 estados desde catálogo (`v_estados_carga`) + matriz de transiciones (`v_estado_transiciones`) con permisos; chips ordenados por `orden` con "Cargas por Confirmar" separado y fuera de "Todas"; botón "Cambiar estado" (modal filtrado por rol, retroceso avisado) vía `fn_mover_estado_carga` en Expediente y ficha; alta con P.O. opcional en estados `exige_po=false`. Cero listas de estados hardcodeadas en la UI.
- [x] Agenda operativa + seguimiento (E41, 2026-07-23): franja "Agenda de la semana" arriba de Embarques (`v_agenda_operativa`), **responsable por carga** (`fn_asignar_responsable` + selector inline `ERP.montarResponsable` en Expediente/ficha/alta, columna "Resp." en la lista), pantalla nueva "Datos faltantes" (`v_cargas_datos_faltantes`, lista de trabajo con acciones que reusan lo existente), y las fechas operativas ya salen de `fn_hoy()` (America/Mazatlan) en backend. PENDIENTE: RPC para capturar `id_v7` (anotado en PENDIENTES-BACKEND.md).
- [ ] Checklist documental por embarque

## FASE 4 — Alertas y tiempo real
Motor de datos casi listo (v_cxc_aging, v_cxp_proximas, v_flujo_semanal, fn_reporte_semanal_texto YA existen).
- [x] Panel "Hoy" (2026-07-21): sección de alertas arriba de Inicio desde `v_panel_hoy`, tarjetas por severidad (roja→ámbar→gris) ordenadas por `orden`, monto/referencia opcionales, contador derivado, grises plegables, estado vacío amable, clic a la ruta (con alias y verificación `ERP.moduloExiste`), responsive a 1 columna en móvil. · [ ] Alertas CxC/CxP/consignación/flags/saldo · [ ] Resumen semanal por correo (Resend — pendiente DNS de Miguel)

## FASE 5 — Finanzas grado contador
v_balance, v_presupuesto_vs_real, presupuesto (tabla) YA existen.
- [x] Pantalla "Posición de caja" (E39, 2026-07-23, `v_posicion_liquidez`): secciones Entra/Sale/Socios/Resultado agrupadas por `seccion` y ordenadas por `orden`, TOTAL/FLUJO/POSICION en negritas, POSICION NETA verde/rojo, sección "Informativo" separada (fuera de la aritmética), notas con ⓘ y export. PENDIENTE: **flujo proyectado 30/60/90** — requiere días de crédito reales por cliente (hoy todos en 15 provisionales).
- [x] Pantalla Balance General (E37, 2026-07-21): 4 secciones agrupadas por `seccion` en orden, TOTAL en negritas, barra de cuadre (semáforo verde/rojo con aviso de descuadre), notas con ícono ⓘ (hover + tap móvil), sub-sección plegable "Partidas por aplicar" (v_balance_partidas) y export Excel/PDF en un solo archivo con el detalle. · [ ] Llenar presupuesto 2026 · [ ] Flujo proyectado 30/60/90 · [ ] FX MXN/USD · [ ] Paquete mensual contador (1 clic) · [ ] Rentabilidad por producto/cliente/ruta (vistas listas, falta pantalla)
- [x] DECISIÓN (cajas resuelta en E36, 2026-07-21): backend E36 agregó `cajas`, `pallets`, `f_entrega`/`f_entrega_real` a `cargas`, ampliró `fn_crear_carga` (`p_cajas`, `p_pallets`, `p_f_entrega` + siete costos por concepto, sin `p_costo`) y las vistas `v_margen_caja`/derivados en `v_carga_detalle`. Frontend E36: captura de cajas/pallets/costos desglosados/entrega en el alta, columna Cajas en la lista, sección "Margen por caja" en Finanzas, y cajas + margen por caja + cajas por pallet + tránsito + entrega real en el Expediente. Ya hay **margen por caja, cajas por pallet y tránsito** (los KPIs que mandan en fruta). PENDIENTE: (a) **peso por caja** — nunca se capturó, sigue sin guardarse (decidir si hace falta); (b) captura de los **5 embarques que faltan** de cajas (E39 llenó 12 desde el V7 y se dieron de alta 4 nuevos ya con cajas; quedan 5).

## FASE 6 — Asistente IA interno
- [ ] Edge Function segura · [ ] Chat solo-lectura sobre vistas · [ ] Análisis bajo demanda · [ ] Borradores de cobro · [ ] Lectura de documentos del expediente

## FASE 7 — Portal Cliente y Proveedor
- [ ] Link rastreo por embarque (token, sin login) · [ ] Portal cliente · [ ] Portal proveedor · [ ] Notificaciones WhatsApp/correo · [ ] Firma de recibido · [ ] Estado de cuenta automático

## FASE 8 — Inteligencia de negocio
- [ ] Precios USDA · [ ] Histórico precios · [ ] Score contraparte · [ ] Simulador de embarque · [ ] PWA

## REGLAS
Una fase a la vez (1.5 → 2 → 3 → 4). Backend se decide en el chat de Miguel; frontend aquí. Todo cambio contable se verifica contra v_anclas. Claude Code actualiza REPORTE-FRONTEND.md al cierre de cada sesión.

## NOTAS DE CONCILIACIÓN (conflictos anotados, no borrados)
- Cajas: E40 (2026-07-23) reporta **0 cargas vivas sin cajas** (se llenaron P-05, P-06, P-063, P-064, P-065 desde el V7). Esto deja desactualizado el pendiente de FASE 5 que todavía dice "quedan 5 embarques sin cajas" (de E39). Por la regla del plan ("nunca borres puntos") no se edita esa línea; queda anotado aquí que el dato vigente es **0**.


## CIERRE E77-E79 (sesion conjunta, 2026-08-02)
Peldanos Dos Ejes: 1 (D-68) OK . 3 costo->lote (D-72) OK . 4a detector (D-73) OK.
D-50 RESUELTO sin socios (D-74 clasificador + D-75 backfill 7 SO FRONTERA). Reconocimiento por modelo
especificado (D-76). Frontend E76/E77 desplegado (T1-T5).

ANCLAS AL CIERRE E79 (= E76 en dinero):
CxC 588,061.82 . CxP 507,241.00 . Cuadre 0.00 . JPM 15,989.29 . JEAMS -52,872.00 . movs_jpm 275 .
aplicaciones 189 . cargas 82 . seg 0/0/0 . lotes 89(82v) . carga_costos 257 (lote_folio NOT NULL, Sigma 1,215,630.81)
. SO 81 . SO_cargas 80 . lote_ventas 80 (precio 50) . facturas 0 . liquidaciones 1(anulada) . loads 0 .
ingreso eje-lote 1,224,484.40. Detector: 50 CONCILIADO / 30 ESPEJO / 2 SIN_SO.

INFRA VIVA nueva: v_cxp_lote . v_venta_ejes(+resumen) . v_rm_sugerido_carga . carga_costos.lote_folio NOT NULL
+ fn_carga_costos_set_lote endurecido . v_cxp_proveedor_atribuido via lote . v_liquidaciones +7 cols productor
. v_programas_comerciales +id . RM-001='Fixed Fee per Shipment' / RM-003='Margin (Consignment Timing)'.
Advisor: search_path_mutable 9, security_definer_view 131.

HECHO E82/D-82: flip 4b venta->eje-SO (money-neutral, 0 divergencias). DOS EJES COMPLETOS. Peldano 6 (RPC/UX captura lote-first) = follow-on frontend aditivo, opcional. SIGUIENTE real: cerrar julio (operativo, espera contenedores/Samuel).
Frontend chico pendiente (Claude Code): direccion del productor en PDF de liquidacion + picker SO<->programa (id nuevo).


---

## E84 (2026-08-04) — HARDENING DE AUDITORÍA CERRADO

Ola de endurecimiento y limpieza. Detalle en BITACORA D-84..D-92; estado por hallazgo en AUDITORIA (sección Cierre E84).

**Hecho E84:**
- A-05 sello de captura en aplicaciones.
- A-06/A-06b gate de mes cerrado → whitelist en las 3 tablas (venta_esperada inmutable).
- A-15/A-15b fn_editar_factura no cambia estado ni numero.
- A-11 fn_editar_movimiento NULL=no-toca (fin del borrado silencioso).
- A-10 cc282 "Otros gastos"→"Otro" (reapertura marzo).
- A-09 borrado de cc42/46 basura staging FRX en cargas anuladas (reapertura junio).
- A-09/10 prevención: FK carga_costos.concepto→conceptos_costo.nombre.
- A-03 cola: contraparte 67 retirada de selectores.
- Corrección de ancla: security_definer_view = 140 (no 135).

**Anclas al cierre:** CxC 588,061.82 · CxP 507,241.00 · Cuadre 0.00 · JPM 15,989.29 · JEAMS −52,872.00 · seg 0/0/0 · carga_costos **255** (Σ **1,210,817.31**, −4,813.50 por A-09) · aplicaciones 189 · SO 81 (80/0/1) · secdef_view 140. Periodos ene–jun cerrados, julio abierto.

**Pendiente próxima sesión (backend puro, rápido):** A-07 guarda futura — fn_editar_carga/fn_liquidar_consignacion rechacen ingreso_venta>0 en consignación sin nota.
**Bloqueado Samuel:** A-07 datos, cerrar julio, sync V8→ERP, Akambarhu, presentacion_id, trueque D-42, adopción.
**Dato/decisión Miguel:** A-14 (Bell Pepper Rojo), PC-013 (Paumar→Omega).
**Futuro grande:** end-state Scope B, Fase D (doble partida), Fases 5–8, rename formula_tipo RM-001.


---

## CIERRE E85 (2026-08-04)
- Seguridad (A-01): verde. seg 0/0/0.
- Liquidación PACA (P-B): backend COMPLETO (tablas + RPCs + vistas + triggers + RLS). Pendiente frontend (resultó que el frontend YA estaba construido — ver E86).
- Programas comerciales: PC-013 proveedor corregido (D-94), PC-006 ligado a producto Bell Pepper (D-95). Directorio consistente: 0 sin producto, 0 en diverge.
- Guardas contables (A-07): desplegadas (D-93); cierre 100% pendiente de dato de Samuel (P-071/P-075).
- Correcciones de datos: P-035 rechazo cerrado (D-96) → abrió el hallazgo de espejos backfill (auditar de un jalón; se numeró A-16 en E86, NO A-15).
- Anclas al cierre E85: CxC 589,263.13 · CxP 507,241.00 · Cuadre 0.00 · seg 0/0/0.

## CIERRE E86 (2026-08-04) — BASE CERRADA / USO REAL
- A-16 espejos lote_ventas: CERRADO (D-97, 50/50, 0 mismatches). BASE declarada CERRADA / lista para uso real (Cuadre 0.00, seg 0/0/0, placeholders 0, sin ventas fantasma, periodos correctos, CxC/CxP confiables). Se detiene el ciclo de auditoría de backend (no auditar salvo que algo rompa el Cuadre).
- Liquidación PACA (P-B): EN USO REAL. El frontend YA estaba construido (no era pendiente). 1ª liquidación real emitida por Miguel LQ-2026-0002 (Cornejos P-019+P-021, bruto 103,624.50, saldo 13,464.02) — D-98; bug frontend fmt0 encontrado y corregido (Claude Code).
- Señal "listo para liquidar" en 4 superficies: agenda (regla `liquidar_productor`, D-99), panel + badge + chip (vista `v_liquidaciones_pendientes`, D-101). Auto-limpieza al crear borrador/emitir.
- Akambarhu: CERRADO (D-100). Préstamos → módulo Proyectos (no ligados a carga); cargas → consignación normal.
- Regla de liquidación (documentada): comisión = % del programa (ingreso_base='pct_venta') o 10% fallback; deducciones = costos EXCEPTO 'Materia prima' (→anticipo) y 'Comision' (excluido). Miguel: todos los costos del producto se pasan al productor → revisar cada borrador antes de emitir.
- Anclas al cierre E86: CxC 589,263.13 · CxP 507,241.00 · Cuadre 0.00 · seg 0/0/0 (money-neutral vs E85). liquidaciones 1 emitida + 1 anulada.

### Próximo en el horizonte (foco USO REAL)
1. FEATURE "Anticipo a productor / disposición de proyecto": crear movimiento tipo "Anticipo a productor" desde el front, ligado a PROYECTO de verdad (proyecto_id), descontando la línea. Hallazgo E86: no hay puerta de creación en el front (solo aparece al EDITAR); los anticipos actuales se metieron por backend con proyecto_id=NULL. Arranque: estudiar módulo Proyectos.
2. Liquidar el backlog (4 prod, 11 cargas, $54,224.70), revisando cada borrador.
3. Conciliación V8↔ERP hoja por hoja (Ingresos/Egresos/Chase/Traspasos/Nómina).
4. Adopción de Samuel como usuario ERP.


## CIERRE E87 (2026-08-05) — USO REAL (features + diagnóstico)
- **D-102 Anticipo a productor:** RPC atómico `fn_anticipo_productor` (capturar_mov + disposición +
  ligar proyecto), Cuadre-neutro, guarda de línea en backend. Puerta en front (Tesorería + ficha
  Proyecto). Backfill proyecto_id de 4 anticipos viejos. Fix hoyISO() UTC→local en 6 archivos.
- **D-103 Permisos:** rol nuevo `operacion` (ver+capturar+editar). PP01/PP02/PP03→operacion; alta
  PP05-FP Fer Palacios (operacion). 3 RPCs admin (fn_admin_listar_usuarios/listar_roles/guardar_usuario)
  con anti-lockout. Panel `modulo-usuarios.js` admin-only. Fer ya tenía Supabase Auth; solo faltaba
  la fila en usuarios_erp.
- **D-104 CxP dos modelos:** DIRECTO (asentado, alimenta Cuadre) vs ATRIBUIDO (estimado, pantalla CxP).
  Sin dinero perdido. Vista nueva `v_cxp_detalle_proveedor_atribuido`; cajón CxP consistente con la
  lista. AGROFEPAC 235k (consignación, contraparte_id NULL) = parked.
- Anclas cierre E87: CxC 589,263.13 · CxP 496,368.03 · Cuadre 0.00 · seg 0/0/0 · JPM −9,584.71
  (confirmar vs banco) · JEAMS −52,872.00 · folio_max 384 · aplicaciones 195 · usuarios 5 · roles 4
  (admin/operacion/captura/vista) · liquidaciones 1 emitida.

### Próximo en el horizonte (E88, chat nuevo)
1. **Rediseño visual profesional del ERP** (sistema de diseño; empezar por Usuarios). Claude Code + frontend-design.
2. **Permisos GRANULARES** (matriz por-usuario: capacidades + módulos visibles) — backend (modelo) + frontend.
3. Confirmar JPM vs banco (banco manda). 4. Barrido de CxC. 5. AGROFEPAC consignación en CxP (decisión).
6. Liquidar backlog (4 prod/11 cargas/$54,224.70). 7. A-07 notas Samuel P-071/P-075.

---
## E88 — Estado (cierre)
- ✅ **D-105 Permisos GRANULARES** (backend + frontend desplegado): matriz usuario×capacidad y usuario×módulo (2 capas rol/override). Regla nueva: tabla nueva → ENABLE RLS.
- ✅ **Conciliación V8↔ERP — PASO 1 BANCO CERRADO** (D-106/107/108): JPM = 7,297.29 = neto Chase del V8 al centavo, 281 movs activos = 281 del V8, Cuadre 0.00.
- 🟠 **Siguiente: PASO 2 CARGAS** (88 P.O. V8 vs 82 ERP, cotejar por P.O.), luego Ingresos/Egresos/Traspasos/Nómina. El V8 es la ÚNICA fuente al día de hoy.
- Parqueados: cta SAMUEL (registrar 1,918 Costatropical + FX); aplicar cobro Crystal +9,600 y pago Costatropical −1,000 a sus cargas (Paso 2).
