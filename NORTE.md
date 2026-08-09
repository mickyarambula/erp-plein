# NORTE.md — ERP Plein · Estrella polar
_Última actualización: cierre **E88** (2026-08-06) — **CONCILIACIÓN DRIVE↔ERP COMPLETA**. **Verificar SIEMPRE en vivo** antes de tocar nada: el otro chat también puede haber escrito._

## Qué es esto
Estado vivo del ERP Plein. Backend Supabase `wnjomlwevqaxbborikkq` (us-west-1). Frontend Vercel `erp-plein-dashboard.vercel.app`, repo `~/Desktop/erp-plein` (deploy: `cd ~/Desktop/erp-plein && npx vercel --prod`). Se lee al arrancar cada sesión.

## Dos chats — nunca escribir en paralelo
- **BACKEND** (chat con protocolo): esquema/DDL, RPCs, money-movers, meses cerrados. GATE + ENSAYO-que-revierte. Escribe con `apply_migration` (DDL) y `execute_sql` (DML/RPC/lecturas).
- **OPERACIÓN / CONCILIACIÓN / MANUAL**: solo lectura; enseña a Miguel, concilia V8↔ERP, mantiene el manual. **No escribe en la base.** Si algo mueve dinero o toca mes cerrado, prepara bloque para el chat de backend. Ver `MODO-OPERACION.md`.
- **Regla dura:** nunca dos chats escribiendo a la vez.

## FOCO ACTUAL (desde E86): USO REAL
La base está **CERRADA / lista para uso real** (A-16 cerrada, D-97). Ya **no se audita backend** salvo que algo rompa el Cuadre. El foco es: cargar datos reales y operar. Miguel ya opera el ERP él mismo (capturó y emitió su 1ª liquidación real en E86).
**Definición de BASE CERRADA:** Cuadre 0.00 · seg 0/0/0 · placeholders 0 · sin ventas fantasma · periodos correctos · CxC/CxP confiables.

## ANCLAS (cierre E88 — verificar en vivo con `v_anclas`)
| Ancla | Valor |
|---|---|
| **CxC total** | **570,023.13** | _(bajó de 589,263.13 en D-110: cobros Crystal/P&M re-repartidos a como pagó el cliente)_
| CxP total | 496,368.03 |
| **Cuadre** (v_balance) | **0.00** |
| Seguridad (anon/escritura/auth) | **0 / 0 / 0** |
| Banco JPM | **7,297.29** (= Chase V8 al centavo) |
| JEAMS | −52,872.00 |
| movs JPM / JEAMS | 275 / 8 |
| folio_max JPM (fecha) | 384 (2026-08-05) |
| cargas | 82 |
| flags abiertos | 1 (P-089) |
| aplicaciones | 195 |
| carga_costos (n / Σ) | 255 / 1,210,817.31 |
| Sales Orders | 81 (80 Confirmada / 1 Cancelada) |
| placeholders | 0 |
| usuarios / roles | 5 / 4 (admin/operacion/captura/vista) |
| contrapartes / productos | 72 / 12 |
| **liquidaciones PACA** | **1 emitida (LQ-2026-0002) + 1 anulada (LQ-2026-0001)** |
| periodos | dic2025–jun2026 **cerrados** · julio **abierto** |

_Todo E86 fue money-neutral (A-16 lectura; reglas de agenda y vista = DDL de solo lectura; emitir liquidación de consignación no mueve el mayor). Anclas E86 = E85._

`v_anclas` es una sola fila ancha: saldo_jpm, saldo_jeams, movs_jpm, movs_jeams, folio_max_jpm, fecha_max_jpm, cargas, flags, aplicaciones, cxc_total, cxp_total, cargas_por_confirmar.

## Verificación NO circular (tras cada escritura)
`v_anclas` + `v_balance` (seccion='Cuadre' = 0.00) + `v_seguridad_anon/escritura/auth` (todas 0). **Nunca** verificar una vista contra sí misma.

## Liquidaciones al productor (PACA) — EN USO REAL (E86)
Módulo completo y en uso. Miguel captura/emite en la UI (él, no backend). Reversible (anular).
- **RPCs:** `fn_crear_liquidacion`, `fn_crear_liquidacion_auto`, `fn_emitir_liquidacion`, `fn_anular_liquidacion`, `fn_agregar/quitar_deduccion_liquidacion`, `fn_agregar/quitar_venta_liquidacion`. Vistas: `v_liquidaciones`, `v_liquidacion_deducciones`, `v_liquidacion_ventas`, `v_liquidaciones_pendientes`. Enlace `liquidacion_cargas(liquidacion_id, carga_folio)`.
- **Cómo calcula `fn_crear_liquidacion` (leído en E86):**
  - **Comisión:** si no se pasa %, toma el % del PROGRAMA de la 1ª carga (`programas_comerciales` con `ingreso_base='pct_venta'` → `ingreso_valor`); si no hay, **fallback 10%**. `comision = bruto × %`.
  - **Deducciones:** Σ `carga_costos` WHERE `concepto NOT IN ('Materia prima','Comision')`.
  - **Anticipos:** Σ `carga_costos` WHERE `concepto = 'Materia prima'`.
  - **Neto = bruto − comisión − deducciones**; **saldo = neto − anticipos** (negativo = el productor le debe a Plein; NO es error).
  - ⚠️ El concepto de costo **"Comision" se EXCLUYE por completo** (ni deduce ni usa). Puede ser comisión de Plein/Hanna (correcto excluir) o un tercero (ej. P-043 "Comision" cp 84 = **LUIS ALVAREZ**, hoy ignorada). **Regla de negocio de Miguel:** todos los costos del producto se le pasan al productor al final. Con proveedores viejos (consignación de resultado variable, sin esquema real de 10%) hay **discrepancias esperadas** — no forzar; **Miguel revisa cada borrador antes de emitir** y agrega deducciones a mano si aplica.
- **Señal "listo para liquidar" en 4 superficies:** agenda (`v_agenda_operativa` categoria `liquidar_productor`), panel arriba del módulo Liquidaciones, badge en menú, chip en la ficha de carga. Auto-limpieza: al crear borrador/emitir, la carga sale de la señal.
- **Backlog al cierre E86** (consignación cobrada sin liquidar): 4 productores / 11 cargas / **$54,224.70** — Cornejos P-043/047 ($21,571.20), Carrifoods 6 ($20,329.50), Akambarhu P-073/075 ($11,874), Agrofepac P-071 ($450). Todas >15 días (rojo).

## Anticipo a productor / disposición de proyecto (HECHO E87 · D-102)
**RESUELTO:** `fn_anticipo_productor(p_proyecto,p_productor,p_monto,p_cuenta='JPM',p_fecha,p_descripcion,p_nota)` — atómico (fn_capturar_mov + fn_registrar_amortizacion('disposicion') + fn_ligar_movimiento_proyecto), Cuadre-neutro, guarda de línea en backend. Puerta en el front: Tesorería y ficha de Proyecto (captura-rapida.js → ERP.capturarAnticipoProductor, sin FIFO). Backfill del proyecto_id de 4 anticipos viejos. Lo de abajo queda como referencia histórica del hallazgo E86.
"Anticipo a productor" es un **TIPO de movimiento** (bank egreso), = disposición de financiamiento a productor **contra un proyecto** (mismo esquema back-to-back tipo Akambarhu; los préstamos viven en Proyectos, no en cargas).
- **Problema (hallazgo E86):** NO hay puerta en el front para CREAR ese movimiento. "Capturar movimiento" solo ofrece Cobro/Pago (+ FIFO); "Registrar gasto" solo gastos admin; la lista completa de tipos solo aparece al **EDITAR** un movimiento existente. Los anticipos actuales se metieron por backend, con `proyecto_id=NULL` (liga solo en la nota).
- **Lo que quiere Miguel:** crear el movimiento desde el front, tipo "Anticipo a productor", **LIGADO A PROYECTO de verdad** (`proyecto_id`), descontando la línea del proyecto. Requiere estudiar el módulo Proyectos antes de diseñar.
- Ejemplos existentes: movs 375 (Akambarhu 58, −15,000, PRJ-001 semilla Bell Pepper), 381 (−105.33 PRJ-005), 366 (−20,600 PRJ-001). Columnas de `movimientos`: folio, fecha, descripcion, contraparte_id, ingreso, egreso, tipo, cuenta_id, anulado, nota, capturado_por, capturado_ts, proyecto_id, contrato_id. Tipos "sueltos" sin puerta de creación en front: 'Anticipo a productor','Inversion','Financiamiento externo','Pasivo a socio','Traspaso'.

## Cómo se reconoce el ingreso (trampa central — D-96)
Dos ejes: **costo en el LOTE**, **venta en la SALES ORDER**.
- `v_ingreso_reconocido` es la fuente de verdad del ingreso reconocido:
  - `margen` / `buy_resell` → `COALESCE(round(venta_lote,2), cargas.ingreso_venta)`, con `venta_lote = Σ(lote_ventas.precio_caja × cajas_asignadas)` del lote de la carga.
  - `comision_por_caja` → `COALESCE(so.cuota_fija_embarque, ingreso_venta)`.
  - resto → `cargas.ingreso_venta`.
- ⚠️ **Si la carga tiene `lote_ventas`, editar `cargas.ingreso_venta` NO mueve CxC ni el estado de resultados.** Hay que corregir en `lote_ventas` (precio_caja). (Descubierto con P-035.)
- `v_ingreso_reconocido` **no filtra SOs anuladas** → cancelar la SO no baja el reconocimiento.
- `fn_desasignar_carga_so` solo borra el vínculo `sales_order_cargas`; deja el `lote_ventas` huérfano.
- `v_cxc` y `v_estado_resultados` usan `COALESCE(vir.ingreso_reconocido, cargas.ingreso_venta)`.
- El backfill **C.2 / E73** creó lotes + `lote_ventas` espejo 1:1. **A-16 (E86) auditó los 50 espejos margen/buy_resell → 0 mismatches. Capa sana.** P-035 fue caso único.

## Guardas de carga (fn_editar_carga / fn_crear_carga)
- **A-07 (D-93):** declarar venta de consignación (>0) exige nota fuente en la carga (`p_nota_revision`) o usar `fn_liquidar_consignacion`. `fn_crear_carga` prohíbe consignación con ingreso>0. `fn_liquidar_consignacion` y `fn_desglosar_carga` blindadas por `p_resolucion`.
- **GATE-3 placeholder (`trg_chk_placeholder_venta`):** si `venta = costo` (>0) exige la marca literal **`[VENTA=COSTO CONFIRMADO]`** en `nota_revision`. OJO: `fn_editar_carga` actualiza `ingreso_venta` **antes** que `nota_revision` → para poner venta=costo se hacen **2 llamadas**.
- **Guarda CxC-negativa:** `v_cobrado = Σ TODAS las aplicaciones` (mezcla cobro + pago). En rechazos / notas de crédito usar `p_forzar => true` con motivo.
- **Transición de estado:** valida contra `estado_transiciones` salvo `p_forzar`. **Entregada→Rechazo NO catalogada** → requiere `p_forzar`. "Rechazo" es estado válido (orden 6) y **sigue en CxC**.

## Agenda operativa (v_agenda_operativa)
Motor de reglas/alertas (una fila por evento; columnas severidad/categoria/folio/po/cliente/producto/responsable/titulo/detalle/fecha_clave/dias). Reglas: embarque, ETA (debio_llegar/llega_pronto/sin_eta), QC, consignación sin liquidar (cliente no ha pagado), tarea atrasada, programa sin carga, y **`liquidar_productor` (D-99, nueva E86)**: consignación + ingreso_venta>0 + NO en liquidación viva; ámbar, rojo >15 días. Modificar la vista con la técnica pg_get_viewdef + replace en ancla única (preserva cuerpo).

## Cuadre (v_balance)
`Cuadre = (banco+cxc+transito+inventario+anticipos) − (cxp+jeams+pas_socio+dif_consig+fin_ext) − (utilidad+partidas+neutro_rec)`. Debe ser **0.00** siempre.

## Periodos
`fn_reabrir_periodo(p_mes date, p_motivo text)` · `fn_cerrar_periodo(p_mes date, p_forzar boolean DEFAULT false, p_nota text)`. `v_cierre_checklist`: `cerrable = bloqueadores 0`. `sin_cerrar = estado IN (Programada, En Camino, Revision/QC, Falta información)`. `bloqueadores = (revision_pendiente OR sin_cerrar OR es_placeholder) + movs_sin_aplicar`.

## Reglas de oro
- **BANCO MANDA:** Banco → V8 → ERP. Llave de cotejo = **P.O.** (nunca folio).
- **CUADRE 0.00** siempre. Cualquier desvío = parar de inmediato.
- Modalidades: **margen fijo** · **consignación** (ingreso al COBRO) · **comisión pura** (Alpine / Kabocha CRI / Carrifoods en POs específicas: costo 0, margen 100% es CORRECTO — `modalidad='comision'`). OJO: un mismo cliente/proveedor puede tener cargas de consignación en OTRAS POs (ej. Carrifoods 365xx = consignación real).
- **JEAMS** = préstamo socio sin interés (pasivo de balance, no P&L). Comisión Plein consignación = del programa (o 10%); la participación de Luis F. Hanna (cp 35) sale de la parte de Plein, **nunca** deducción al productor.
- **Akambarhu (CERRADO D-100):** préstamos → módulo Proyectos (no ligados a carga); cargas → consignación normal. NO reabrir como duda.

## Trampas de esquema confirmadas
- `cargas` PK = `folio` (text). `carga_costos` une por `carga_folio`.
- `movimientos`: `ingreso`/`egreso` en columnas separadas (egreso negativo), no un monto firmado. Tiene `proyecto_id` y `contrato_id` (hoy los anticipos los traen NULL).
- `execute_sql` solo devuelve el resultado de la **última** sentencia de un bloque.
- Agregar parámetro a función existente → **DROP** firma vieja antes de `CREATE OR REPLACE`.
- `v_cxp` usa INNER JOIN con `carga_costos`: cargas sin costo son invisibles en CxP.
- `bitacora_ediciones.campos_antes` es NOT NULL (altas: pasar `{"alta":true}`).
- `variedades` (id, producto_id, nombre, activo) **sin `codigo_item`**; el FRX vive en el producto. `programas_comerciales.producto_ids` referencia **`productos.id`**.
- `carga_costos.concepto` valores: Aduanas, Carton, Comision, Fletes, In & Out QC, Materia prima, Otro.
- `movimientos.tipo` valores: Aduanas, AJUSTE, Anticipo a productor, Cliente, Comision, Devolucion, Financiamiento externo, Fletes, Gastos Administrativos, Gastos Financieros, Inversion, Materiales de empaque, Otros gastos, Paca, Pasivo a socio, Proveedor, Seguro, Sueldo, Viaticos, Traspaso.
- Advisor secdef_view: usar **CATÁLOGO (140)**, no el advisor (caché a veces muestra 135).

## Docs del proyecto (leer al arrancar)
`NORTE.md` · `CLAUDE.md` · `PLAN-MAESTRO.md` · `AUDITORIA.md` · `BITACORA-DECISIONES.md` · `PENDIENTES-BACKEND.md` · `MODO-OPERACION.md` · `manual-operativo-erp-plein.html` · `REPORTE-FRONTEND.md` (para tareas de frontend).
## Permisos de usuarios (E87 / D-103)
Modelo de dos capas: `usuarios_erp`(socio_codigo PK, nombre, email UNIQUE, rol FK→roles_erp, activo) + `roles_erp`(rol PK, puede_ver/capturar/editar/administrar, descripcion). `fn_actor()` resuelve por el email del JWT; **sin JWT cae a 'PP04-MA'** (contexto MCP → el backend siempre te ve como admin). `fn_actor_puede(cap)` lee las banderas del rol.
- Roles: **admin** (todo) · **operacion** (ver+capturar+editar, NUEVO E87) · **captura** (ver+capturar) · **vista** (solo ver).
- Usuarios: miguel=admin; samuel/juan/jose/**fer(PP05-FP, accounting@)**=operacion.
- Crear embarque/movimiento exige **'capturar'** (no 'editar'). Panel admin: `modulo-usuarios.js` + RPCs `fn_admin_listar_usuarios/listar_roles/guardar_usuario` (gate 'administrar', anti-lockout).
- **Auth ≠ mapeo:** entrar requiere cuenta en Supabase Auth **y** fila en `usuarios_erp`.
- **E88 (pendiente):** permisos GRANULARES (matriz por-usuario: capacidades + módulos visibles) + rediseño visual.

## CxP: dos modelos (trampa — E87 / D-104)
- **DIRECTO** (`v_cxp` / `v_cxp_proveedor` / `v_cxp_detalle_proveedor`): amontona todos los costos de una carga sobre `carga.proveedor_id`. Es lo **ASENTADO** y lo que alimenta `v_anclas.cxp_total` y el **Cuadre**.
- **ATRIBUIDO** (`v_cxp_proveedor_atribuido` + `v_cxp_detalle_proveedor_atribuido`, D-104): reparte cada línea `carga_costos` por su `contraparte_id` y **prorratea** los pagos. **ESTIMADO**. Lo usa la pantalla CxP (lista y, desde D-104, el cajón).
- Difieren (455,964.78 vs 496,368.03): la diferencia son líneas con `contraparte_id` NULL (ej. consignación de AGROFEPAC 235k). **No es dinero perdido** — el costo de servicio SÍ está en libros, bajo el productor de fruta. PARKED E88: decidir clasificación de AGROFEPAC.

---
## Actualización E88 FINAL (2026-08-06) — CONCILIACIÓN DRIVE↔ERP COMPLETA
_La conciliación contra el Drive/V8 TERMINÓ (salvo 3 cargas En Camino). El ERP es la fuente de verdad; el Drive se jubila. Verificar SIEMPRE en vivo antes de tocar._

### ANCLAS (cierre E88 final — verificar con v_anclas)
- CxC **570,023.13** · CxP **496,368.03** · Cuadre **0.00** · seg **0/0/0**.
- Banco **JPM 7,297.29** (= Chase V8 al centavo). JEAMS −52,872.00. Cta virtual SAMUEL +4,400.
- movs_jpm **282** (281 activos + 1 anulado f383) · folio_max 388 · cargas 82 · flags 1 (P-089) · aplicaciones **198**.
- Periodos dic2025–jun2026 cerrados · julio abierto.

### Conciliación V8↔ERP — CERRADA salvo 3 cargas (llave = P.O.)
- **Banco (Paso 1 · D-106/107/108):** JPM 7,297.29 = Chase al centavo; 281 = 281 movs.
- **Cargas cobros (CxC · D-110):** 82 cotejadas por P.O. Crystal Valley paga por DEPÓSITO ESPECÍFICO por P.O. (no abono-a-cuenta); el ERP los había repartido FIFO. Re-aplicados por depósito (V8) + cobros parqueados f386/f377. **CxC 589,263.13→570,023.13.** Cada carga = V8.
- **Cargas pagos (CxP · D-111):** el ERP ya es correcto (99.6% por proveedor). El único hueco grande vs V8 son las 3 cargas faltantes; las diferencias por carga (1,976.07) son decisiones DELIBERADAS: licencia anual Suárez (admin, no carga), cartón a granel Celulosa/El Sagrado, reembolsos E38, y la "comisión P&M" (el V8 agrupa flete+aduana+in&out+cartón+comisión en una línea; el ERP los itemiza por proveedor real — MISMO costo total). **NO se forzó** (reabriría meses cerrados para reintroducir imprecisiones ya corregidas).
- **Flete BBA (D-112):** f367 3,250 → P-073 (1era Kabocha Akambarhu, como dice la descripción). Cierra el −3,250 de Akambarhu; mov 370 queda anticipo completo (Proyectos).
- **Relación id_v7 (D-113):** 35 cargas vivas + 2 anuladas estaban mal cruzadas; corregidas contra el ID real del V8 (por P.O.). Campo de referencia, no toca dinero.
- **Barrido no-carga (D-114):** Egresos (46/46), Ingresos (8/8), Nómina (35,000 exacto), Traspasos — todo capturado y bien clasificado. 0 movimientos sin tipo/contraparte. Único suelto: aportación 424.67 (E49) = entrada gross del V8 que netea a cero, **NO se agrega** (rompería JPM=Chase).

### ÚNICO PENDIENTE de conciliación: 3 cargas En Camino (Miguel + Samuel, mañana)
Capturar con `fn_crear_carga` (GATE+ENSAYO):
- **NGM248545** — Northgate / Papaya / prov P&M. V8: venta 22,176 / cxc 22,176 / cxp 20,648. Al capturarla, aplicar pago **f387 Costatropical −1,000**.
- **PX-72306** — Crystal Valley / col de bruselas / prov Agrícola Omega. V8: 12,690 / 12,690 / 12,372.75. **CONFIRMAR modalidad** (NO es Alpine comisión pura).
- **PX-72715** — Crystal Valley / espárrago org / prov Pampa Store. V8: 34,560 / 34,560 / 33,840.
De cada una, de Samuel: proveedor real, modalidad, cajas, costos por concepto. Luego **cerrar julio**. → el Drive se jubila.

### FASE NUEVA (post-conciliación): OPERAR desde el ERP + rediseño visual
Backend sólido y conciliado; el foco pasa a **frontend**, dos vertientes a la vez:
1. **Visual profesional** — hoy "cero profesional" (Miguel). Sistema de diseño (paleta/tipografía/espaciado/componentes) + Claude Code (skill frontend-design). Opción: Tailwind sobre el HTML vanilla actual (salto grande sin rehacer) y/o Claude Design para prototipar el look por chat.
2. **Operativo** — flujos para hacer el día desde el ERP (pendientes de cobro/pago, capturar carga nueva directo, liquidar consignación, cierre de mes) y cortar Drive/ClickUp.
Enfoque: fijar dirección de diseño primero, luego aplicar pantalla por pantalla. Doc clave: **REPORTE-FRONTEND.md**. Modelo: **Opus 4.8**.

### Parqueados vigentes (con dueño — NO son descuadres)
- **3 cargas faltantes** (arriba) — Miguel/Samuel, mañana.
- Cta virtual SAMUEL: registrar 1,918 Costatropical + revisar FX 32,950 MXN — Miguel/Samuel.
- Crédito Crystal 360 (cosmético venta P-058; se cierra subiendo lote_ventas +360 — toca su mes).
- f370 Akambarhu 6,750 (anticipo, espera P-089).
- Modelo/gross deliberado (NO tocar): comisión P&M/trueque, cartón Celulosa/El Sagrado a granel, AGROFEPAC +1,344 (reembolsos E38), aportación 424.67 (E49).

---
## Actualización E89 (2026-08-06) — DIRECCIÓN DE DISEÑO FRONTEND ELEGIDA (sin código · money-neutral)
_Sesión de frontend, solo exploración de diseño. **Anclas SIN cambio** (CxC 570,023.13 · CxP 496,368.03 · Cuadre 0.00 · seg 0/0/0 · JPM 7,297.29). No se tocó backend ni dinero._

- **Dirección visual APROBADA:** formato **"Operador estilo Silo, versión Plein"** — riel de íconos + selector de módulo arriba + tira de KPIs verdes grandes + grupos por programa/cliente con filas de lote anidadas (pestaña naranja) + columnas financieras densas + botón de acción NEGRO (no azul) + pastillas de modalidad (Margen/Consignación/Comisión) + claro/oscuro. Verde = dinero. Íconos Tabler, cero emojis.
- **Motor de estilos:** refinar CSS a **TOKENS** (variables), SIN Tailwind, SIN build. Claro/oscuro = **toggle de usuario**, se construye una sola vez.
- **Escena ancla APROBADA:** `escena-silo-plein.html` (pantalla Embarques). Referencia de formato: `conceptos-diseno-3.html` (concepto G). Descartados por "misma línea / muy aireado": pilotos v1/v2 y galerías 1–2.
- **Detalle completo** (tokens claro/oscuro exactos, componentes, menú agrupado, reglas de limpieza, plan de rollout) en el anexo NUEVO **`SISTEMA-DISEÑO.md`**.
- **Aprobado además:** menú agrupado (Operación / Dinero / Finanzas / Catálogos / Revisión / Admin — hoy ~25 módulos en lista plana; respeta permisos E88/D-105 `ERP.perfil.modulos`), quitar emojis, quitar la foto de fondo del `body`, ocultar notas internas `[E17]`/`[E47]`/`FLAG` de la vista (→ nota interna secundaria), header sin ruido.
- **Siguiente:** piloto pulido (Inicio + Embarques) → aprobar → Claude Code baja los tokens + toggle claro/oscuro (1 hoja) y aplica **pantalla por pantalla** (Embarques → CxC → CxP → Tesorería → Inicio → resto). Instrucciones a Miguel siempre como bloques copy-paste para Terminal; Miguel despliega con `npx vercel --prod`.
