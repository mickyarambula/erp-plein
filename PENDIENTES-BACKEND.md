# PENDIENTES-BACKEND.md
_Última actualización: cierre E88 (2026-08-06) — CONCILIACIÓN COMPLETA. Dueño por defecto: backend, salvo que diga otro._

## Cerrado en E87
- ✅ **D-102** — feature Anticipo a productor: RPC atómico `fn_anticipo_productor` (ligado a proyecto, Cuadre-neutro, guarda de línea) + puerta en front (Tesorería/ficha Proyecto) + backfill proyecto_id de 4 anticipos. + fix zona horaria `hoyISO()` UTC→local (6 archivos).
- ✅ **D-103** — permisos de usuarios: rol `operacion` (ver+capturar+editar); PP01/PP02/PP03→operacion; alta PP05-FP Fer Palacios; 3 RPCs admin `fn_admin_*` (anti-lockout); panel `modulo-usuarios.js` (admin-only).
- ✅ **D-104** — diagnóstico CxP: 2 modelos (directo/atribuido); vista nueva `v_cxp_detalle_proveedor_atribuido`; cajón CxP consistente. Sin dinero perdido.

## Cerrado en E86
- ✅ **A-16 (D-97)** — auditoría de espejos lote_ventas (backfill C.2/E73). 50/50 cargas
  margen/buy_resell cuadran exacto, 0 mismatches. BASE declarada CERRADA / lista para uso real.
  **Se detiene el ciclo de auditoría de backend.**
- ✅ **1ª liquidación PACA real (D-98)** — LQ-2026-0002 (Cornejos, P-019+P-021), emitida por Miguel
  en la UI. Bug frontend `fmt0` encontrado y corregido (Claude Code, desplegado). Money-neutral.
- ✅ **Regla de agenda 'liquidar_productor' (D-99)** — avisa consignación cobrada sin liquidar.
- ✅ **Akambarhu (D-100)** — CERRADO. Préstamos → Proyectos (no ligados a carga); cargas →
  consignación normal. Removido de parqueados. NO reabrir.
- ✅ **Vista v_liquidaciones_pendientes (D-101)** — agrupada por productor; alimenta panel + badge +
  chip en el frontend (4 superficies de la señal "listo para liquidar").

## Backend — activos / por hacer
- ✅ **`fn_editar_costo` / `fn_eliminar_costo` conectadas al frontend (D-118, E100-fix3).** Backend
  expuso `id` en `v_carga_costos_det` y entregó ambas RPCs; el frontend ya tiene Editar/Eliminar por
  línea de costo en la ficha de captura (ver REPORTE-FRONTEND.md). Cierra el bloqueo de abajo.
- 🟠 ~~**Confirmar firma de `fn_editar_costo`**~~ (RESUELTO por D-118, ver arriba): Miguel pidió
  poder corregir un costo YA capturado (monto/cantidad y nota) sin anular la carga entera. En
  frontend hoy solo existe `fn_agregar_costo` (agrega una línea nueva) — NO hay UI para editar una
  línea de `carga_costos` existente. Pero **`fn_editar_costo` ya existe en el backend** (censado en
  AUDITORIA.md línea 222: "bando NULL=no tocar", valida concepto contra catálogo activo, exige
  `p_motivo` — "el patrón más sólido de las diez") y **ya se usó manualmente desde el chat de
  backend** varias veces (P-082/083/084 en AUDITORIA.md/BITACORA-DECISIONES.md, ajuste de julio en
  BITACORA-DECISIONES.md:1263). Nunca se conectó al frontend. Claude Code (frontend) NO tiene forma
  de leer la firma exacta (sin MCP de Supabase autenticado en esta sesión, y la clave pública del
  front no tiene permiso de introspección OpenAPI — probado, 401 "Secret API key required") y no va
  a inventar nombres de parámetros. **Necesito del chat de backend:** el listado exacto de
  parámetros de `fn_editar_costo` (probable: identificador de la fila de `carga_costos` — folio +
  concepto, o un id — más `p_monto`, `p_nota`, `p_motivo`) y si `v_carga_costos_det` expone ese
  identificador (hoy el frontend solo lee `concepto`/`nota`/`monto` de esa vista, sin id). Con eso,
  el frontend se conecta en una sesión corta. De paso: no existe ningún `fn_anular_costo` /
  `fn_eliminar_costo` — si se necesita poder RETIRAR una línea de costo mal capturada (no solo
  corregirla), eso sí requeriría una RPC nueva.
- ✅ **FEATURE "Anticipo a productor"** — HECHO E87 (D-102). (Referencia histórica abajo.)
  "Anticipo a productor" es un TIPO de movimiento (bank egreso) = disposición de financiamiento a
  productor contra un proyecto. **NO hay puerta en el front para CREARLO** (solo aparece al EDITAR).
  Miguel quiere: crearlo desde el front, tipo "Anticipo a productor", LIGADO A PROYECTO de verdad
  (`proyecto_id`), descontando la línea del proyecto. **Arranque:** estudiar módulo Proyectos
  (tablas de proyecto/línea/disposiciones, `v_proyecto_cargas`, cómo se lleva el límite ej. 150,000
  de PRJ-001, RPCs de movimiento). Probablemente toca backend (poblar proyecto_id + descuento de
  línea) + frontend (crear-movimiento con tipo completo). Dueño: backend + Claude Code.
- 🟠 **Liquidar el backlog** (4 prod, 11 cargas, $54,224.70): Cornejos P-043/047, Carrifoods 6,
  Akambarhu P-073/075, Agrofepac P-071. Lo hace Miguel en la UI revisando cada borrador. OJO regla
  de comisión (del programa o 10% fallback) y tratamiento de "Comision" cp 84 (Luis Alvarez) — con
  proveedores viejos hay discrepancias esperadas; puede requerir agregar deducciones a mano.
- 🟠 **A-07 100%:** cerrar cuando lleguen las notas fuente de P-071/P-075 (Miguel puede resolver).
- 🟠 **Adopción de Samuel como usuario ERP** (hoy Miguel captura todo).
- 🟠 **Hallazgos de auditoría no cerrados** (revisar AUDITORIA.md). Recordar: no abrir auditorías
  nuevas de backend salvo que algo rompa el Cuadre.

## Conciliación V8 ↔ ERP (tablero — coordinado con el chat de OPERACIÓN)
> Cambios seguros (mes abierto, no mueven dinero) los hace Miguel en la UI guiado por operación.
> Lo que mueve dinero o toca mes cerrado llega aquí como bloque GATE+ENSAYO.
- ✅ P.O. Alpine julio (P-063/064/065) — hecho por Miguel en UI.
- ✅ P-035 rechazo — corregido en backend (D-96).
- ✅ AX007/008/009 (P-056/057/062) — nada que hacer.
- ❓ **P-076** — ERP 1490 vs V8 1495 (Jack Fruit Las Brisas). Confirmar typo; edit seguro en UI.
- ⏳ **Julio margen P-083 (PX-72648) y P-084 (PX-72650)** — V8 Entregada, ERP Programada. Confirmar
  cobro en Ingresos/Chase (banco manda) antes de avanzar estado y registrar cobro.
- 🔴 **Julio consignación P-079 (1491), P-080 (1492), P-089 (1003)** — LIQUIDAR con monto real
  cobrado (`fn_liquidar_consignacion`), NO forzar por estado. Esperan dato de Samuel. P-089 le faltan
  cajas (flag activo). (Estos son consignación aún SIN cobrar → no están en el backlog de liquidar
  al productor todavía.)
- ⏸️ P.O. enero P-05/P-06 (ERP 101/102 vs V8 EXP-101/EXP-102) — parqueadas: mes cerrado + cosméticas.
- ⏳ Hojas del V8 aún por conciliar: **Ingresos, Egresos, Chase (banco), Traspasos, Nómina** — una a
  la vez.

## Parqueados (esperan input externo)
- **A-07 notas P-071/P-075**: dueño Miguel/Samuel.
- **PC-005 (Kabocha Akambarhu)**: monitorear regla `programa_sin_carga` de `v_agenda_operativa`.
- **PC-013 etiqueta/nota "Paumar"**: cosmético; dueño Miguel.
- ~~Akambarhu clasificación préstamo~~ → **CERRADO E86 (D-100)**.

## Manual operativo (chat de operación)
- Añadir **liquidación PACA** como caso resuelto (flujo completo: crear auto → revisar desglose →
  emitir → PDF; señal en 4 superficies; regla de comisión/deducciones; revisar antes de emitir).
- Añadir **P-035** como caso resuelto (rechazo con saldo vivo; la venta vive en lote_ventas/SO).
- Afinar cada paso con clics reales; membrete + PDF cuando esté afinado.
## Nuevos activos / parqueados (E87 → E88)
- 🟠 **E88 — Rediseño visual profesional del ERP** (Miguel: el diseño no le gusta, no se ve profesional; empezar por Usuarios). Sistema de diseño + Claude Code (frontend-design). Dueño: frontend + Claude Code.
- 🟠 **E88 — Permisos GRANULARES**: matriz por-usuario (capacidades + módulos visibles), no solo por rol. Requiere: overrides de capacidad por usuario + módulos permitidos por usuario/rol + menú del front que se pinte según eso + ampliar panel Usuarios. Backend (GATE+ENSAYO) + frontend. Dueño: backend + Claude Code.
- 🟠 **JPM −9,584.71** — confirmar vs estado de cuenta (banco manda). Si el banco no está negativo, falta registrar ingreso/traspaso. Dueño: Miguel/operación. PRIMERO.
- 🟠 **Barrido de CxC** — sin correr (más simple: 1 cliente por carga; confirmar lista y detalle usan la misma vista). Dueño: backend/operación.
- 🟠 **AGROFEPAC / consignación en CxP directo (235k)** — decidir si es CxP normal o va por liquidación (líneas con contraparte_id NULL). Dueño: backend (GATE).
- 🟠 **fn_anticipo_productor paso 3 (fn_ligar) exige 'editar'** — usuarios operacion lo tienen; si algún usuario queda solo 'capturar', cambiar a UPDATE directo del proyecto_id dentro del DEFINER. Dueño: backend.
- 🟠 **Fer** — si no recuerda contraseña: Supabase Auth → Send password recovery. Dueño: Miguel.
## Cerrado en E88
- ✅ **D-105 permisos GRANULARES** backend (tablas + resolución + v_mi_perfil v2 + 5 RPCs admin) + frontend (Claude Code, desplegado por Miguel). Regla nueva: tabla nueva → ENABLE RLS.
- ✅ **Paso 1 conciliación BANCO** (D-106/107/108): JPM = 7,297.29 = Chase V8 al centavo, 281 movs activos = 281 V8, Cuadre 0.00.
- ✅ **Paso 2 CARGAS conciliado** (D-109..D-112): cubeta sin-acción (D-109); CxC re-repartida (D-110, CxC 589,263.13→570,023.13, Crystal paga por depósito específico); CxP verificada — ERP correcto, diferencias deliberadas, NO forzar (D-111); flete BBA f367→P-073 (D-112).
- ✅ **Relación id_v7 corregida** (D-113): 35 vivas + 2 anuladas mal cruzadas → ID real del V8 por P.O. Metadata, money-neutral.
- ✅ **Barrido de clasificación no-carga** (D-114): Egresos 46/46, Ingresos 8/8, Nómina 35,000, Traspasos — todo capturado y bien clasificado. 0 sin tipo/contraparte.

## Conciliación V8↔ERP — COMPLETA salvo 3 cargas (E88)
El Drive/V8 quedó conciliado al centavo (banco) y por P.O. (cargas cobros/pagos); el barrido no-carga salió limpio. **El ERP es la fuente de verdad.** Único pendiente:
- 🔴 **Capturar 3 cargas En Camino** (Miguel + dato de Samuel, luego cerrar julio):
  - **NGM248545** — Northgate/Papaya/P&M. V8 22,176 / 22,176 / 20,648. Aplicar f387 Costatropical −1,000.
  - **PX-72306** — Crystal/col de bruselas/Agrícola Omega. V8 12,690 / 12,690 / 12,372.75. CONFIRMAR modalidad (no es Alpine).
  - **PX-72715** — Crystal/espárrago org/Pampa Store. V8 34,560 / 34,560 / 33,840.
  De Samuel por carga: proveedor real, modalidad, cajas, costos por concepto. Capturar con fn_crear_carga (GATE+ENSAYO). Luego **cerrar julio**.

## FASE NUEVA — Frontend (operativo + visual) — SIGUIENTE GRANDE
- 🟠 **Rediseño visual profesional** del ERP (Miguel: "cero profesional"). Sistema de diseño + Claude Code (frontend-design) y/o Tailwind sobre el HTML vanilla; Claude Design para prototipar. Dueño: frontend + Claude Code.
- 🟠 **Flujos operativos** para operar el día desde el ERP (pendientes cobro/pago, capturar carga nueva directo, liquidar consignación, cierre de mes) → cortar Drive/ClickUp. Dueño: frontend + Claude Code + backend donde toque.
- 🟠 **Adopción de Samuel** como usuario ERP para captura en vivo.

## Parqueados E88 (con dueño)
- 🟠 **Cta virtual SAMUEL:** registrar 1,918 Costatropical como deuda a Samuel + aplicar reembolso mov f388; revisar FX (32,950 MXN). Dueño Miguel/Samuel.
- ✅ Cobro Crystal +9,600 (mov 386) → P-082/P-083 — APLICADO en D-110.
- 🟠 Pago Costatropical −1,000 (mov 387) → NGM248545 — aplicar al capturar esa carga (arriba).
- 🟠 Crédito Crystal 360 (cosmético venta P-058) — se cierra subiendo lote_ventas +360 (toca su mes).
- 🟠 f370 Akambarhu 6,750 (anticipo) — espera captura de P-089.
- ℹ️ Diferencias CxP deliberadas (comisión P&M, cartón a granel, reembolsos E38, aportación 424.67): NO tocar.

## Pendientes abiertos al cierre E101 (2026-08-08)
BACKEND:
- 🔴 Tema 2 (BLOQUEA a Miguel) — Feature "Inversión/préstamo JEAM": registrar la ENTRADA de dinero de JEAM como préstamo socio (pasivo, sin interés) Y aumentar la línea del proyecto en ese monto (un paso). + RPC para AJUSTAR la línea de un proyecto (`fn_editar_proyecto` NO tiene `monto_linea`; hoy no hay forma de subir la línea). Caso real: PRJ-005 línea 10,349.86, dispuesto 8,455.33, disponible 1,894.53; quiso disponer 6,500 (Compra Semilla Baby Brocoli) → `fn_anticipo_productor` lo rechazó correctamente. GATE+ENSAYO (toca balance/pasivo).
- 🟠 Tema 1 — Filtro de cargas al aplicar movimiento: hoy filtra solo por cliente/proveedor de ENCABEZADO → proveedores de SERVICIO (reempaque/flete, ej. Costatropical) caen al fallback "todas". Fix: vista backend carga↔TODAS sus contrapartes (cliente + proveedor header + contrapartes de líneas de costo) + ajuste del filtro en front.
- 🔴 Capturar 3 cargas En Camino (PX-72306→Pampa, NGM248545→Papayas+Costa, PX-72715→Succar) con dato de Samuel/Crystal (proveedor, modalidad, cajas, costos por concepto) → cierra Papayas 380,850.73→400,548.73, Pampa 50,400→62,772.75, Succar 600→840, Costa 0→−80. OJO: P-090/P-091 (anuladas, PX-72306) NO borrar — ENSAYO mostró que borrarlas mueve CxP +67,860; dejar anuladas.
- 🟠 Liga única de venta — unificar sales_order_cargas/lote_ventas + jalar cajas del lote (matar doble registro). GATE+ENSAYO.
- 🟠 Cobro Crystal ~70k (mov 389) — aplicar a sus cargas cuando Crystal mande la relación (tiene 4 aplicaciones que pueden ser provisionales).
- 🟠 F2 — diferencia ~1,494 del total CxP (Drive 497,861.64 vs directo 496,368.03).
- 🟠 Deuda Samuel 1,918 (Costatropical) + reembolso mov f388; mov 387 = reempaque Costatropical −1,000 (NGM248545/P-094), aplicación parkeada.

FRONTEND (Claude Code):
- Verificar DEPLOY de: botón anular-movimiento (D-119) + fix importe SO (lee v_ingreso_reconocido). Ya codificados y verificados en harness; faltaba `npx vercel --prod`.
- Vista de embarques sin carpetas de programa (lista corrida) + estado por carga + marca de carpetas con pendientes.
- Tema 1 (front): ampliar filtro de cargas una vez exista la vista backend.
- FIFO (opcional): dos botones claros "Aplicar en orden (FIFO)" vs "Aplicar a carga específica".

DESPLEGADO E101 (frontend): no-te-saca (guard panelAbierto vs auto-refresco 5min), filtro cargas por cliente al aplicar, editar/eliminar costo en ficha de embarque.