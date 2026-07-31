# AUDITORIA.md — Sesión A1 · Fase 1: Integridad de datos
**ERP Plein · Auditor externo (Fable 5) · 2026-07-27 · Solo lectura**
Alcance completado: bloques 0–9 + pistas + censo de contratos de RPC. 15 hallazgos (0 críticos, 3 altos, 1 medio-alto, 7 medios, 2 medio-bajos, 2 cosméticos).

---

## VERIFICACIÓN DE ANCLAS (Bloque 0)

Todas las anclas de E47 cuadran contra la base al momento de la auditoría:
JPM 41,214.93 ✓ · JEAMS −52,872.00 ✓ · deuda JEAMS 162,639.00 ✓ · CxC 595,807.09 ✓ · CxP 534,578.14 ✓ · utilidad neta +2,557.86 ✓ · Cuadre 0.00 ✓ · seg_anon 0 ✓ · folio_max_jpm 368 ✓ · fecha_max 2026-07-24 ✓ · movs_jpm 262 ✓ · aplicaciones 179 ✓ · 80 cargas vivas ✓ · flags 1 ✓ · Anticipos 31,180.00 ✓ · Financiamiento externo 30,000.00 ✓ · Pasivo a socios 6,721.81 ✓ · Partidas por aplicar −3,278.19 ✓ · 13 programas ✓ · 51/16/13 modalidades ✓ · 7 periodos cerrados ✓ · balance 16 filas ✓.

**No se encontró ningún hallazgo crítico.** Los hallazgos van de alto a cosmético.

---

## HALLAZGOS

### A-01 · RLS deshabilitado en 7 tablas; el centinela de seguridad es ciego a esta clase
**Severidad: ALTO (seguridad/arquitectura, no fuga externa)**

7 tablas tienen `relrowsecurity = false`: `facturas`, `proyectos_productor`, `contratos_entrega`, `proyecto_amortizaciones`, `proyecto_flujo_plan`, `categorias_presupuesto`, `programas_comerciales`. De ellas, 6 son **legibles directo por `authenticated`** (todas menos `programas_comerciales`), lo que viola la regla arquitectónica propia ("las tablas base NO son legibles por authenticated; el frontend consume SOLO vistas") y D-07.

`anon` no tiene ningún privilegio sobre ellas (no hay fuga externa) y `authenticated` no tiene INSERT/UPDATE/DELETE — el riesgo es de disciplina de arquitectura, no de escritura. Pero `v_seguridad_anon` **solo vigila privilegios de `anon`**: esta clase entera de desviación (RLS off + lectura authenticated) es invisible al centinela, por eso seg_anon=0 convivió con esto sin sonar.

**Consulta que lo prueba:**
```sql
SELECT c.relname, c.relrowsecurity,
       has_table_privilege('authenticated', c.oid, 'SELECT') auth_sel,
       has_table_privilege('anon', c.oid, 'SELECT') anon_sel
FROM pg_class c
WHERE c.relnamespace='public'::regnamespace AND c.relkind='r' AND NOT c.relrowsecurity;
```
**Resultado:** 7 filas; auth_sel=true en 6; anon_sel=false en todas.
**Impacto en dinero:** 0 directo.
**Dueño sugerido:** backend (GATE de Miguel).
**Fix en una línea:** `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + REVOKE SELECT a authenticated en las 6 (crear vistas si el frontend las necesita), y ampliar `v_seguridad_anon` (o vista hermana `v_seguridad_auth`) para vigilar tablas legibles por authenticated y RLS off.

---

### A-02 · Cinco funciones violan la regla dura de zona horaria (D-08): usan CURRENT_DATE
**Severidad: ALTO (regla dura declarada, con efecto observable)**

Regla E41/D-08: toda fecha operativa usa `fn_hoy()` (America/Mazatlan), nunca `CURRENT_DATE` (UTC: después de ~17:00 en Los Mochis ya es "mañana"). Las vistas están limpias (0 vistas con CURRENT_DATE), pero **5 funciones no**:
`fn_reporte_semanal_texto`, `fn_cerrar_periodo`, `fn_crear_factura`, `fn_siguiente_folio_factura`, `fn_confirmar_entrega`.

Efectos concretos: una factura creada después de las 17:00 sale con `fecha_emision` del día siguiente; `fn_confirmar_entrega` (que rechaza fecha futura) acepta de noche una entrega fechada "mañana"; la serie de factura por año (`fn_siguiente_folio_factura`) puede brincar de año una noche antes cada 31 de diciembre.

**Consulta que lo prueba:**
```sql
SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.prosrc ILIKE '%CURRENT_DATE%' AND p.proname <> 'fn_hoy';
```
**Resultado:** las 5 funciones listadas.
**Impacto en dinero:** 0 directo; riesgo de fechas de emisión/entrega corridas un día.
**Dueño sugerido:** backend.
**Fix en una línea:** reemplazar `CURRENT_DATE` por `fn_hoy()` en las 5 (revisar caso por caso si alguna usa CURRENT_DATE con intención de UTC, que no parece).

**✅ RESUELTO (E48, 2026-07-27):** las 5 funciones (`fn_reporte_semanal_texto`, `fn_cerrar_periodo`, `fn_crear_factura`, `fn_siguiente_folio_factura`, `fn_confirmar_entrega`) corregidas — `CURRENT_DATE` → `fn_hoy()`. La base entera queda sin ningún `CURRENT_DATE` fuera de la propia `fn_hoy()`; D-08 ahora cubre toda la superficie (vistas Y funciones).

---

### A-03 · Duplicado AGROFEPAC (4) / Las Brisas (67) con tráfico partido entre los dos ids
**Severidad: ALTO (lectura de cartera por proveedor incorrecta)**

Confirmado y ampliado: además del duplicado de catálogo ya conocido, hay **operación viva partida**: las cargas P-079 y P-080 (consignaciones Papayas & More, En Camino) tienen `proveedor_id = 67`, mientras los pagos que las liquidan parcialmente (mov 355 −12,500 y mov 365 −10,000) tienen `contraparte_id = 4`. Es el único par duplicado del catálogo (barrido por nombre, alias cruzado y nombre=alias no arrojó otros).

Consecuencia: `v_cxp_proveedor` muestra dos renglones para la misma entidad real — "Las Brisas Produce" con saldo 7,877.35 (2,061.95 + 5,815.40) y "AGROFEPAC" aparte. La exposición real al productor está subestimada en cualquier lectura por renglón, y el aging por proveedor también se parte.

**Consulta que lo prueba:**
```sql
SELECT a.id, a.mov_folio, m.contraparte_id mov_cp, a.carga_folio, c.proveedor_id carga_cp, a.monto
FROM aplicaciones a
JOIN movimientos m ON m.folio=a.mov_folio
JOIN cargas c ON c.folio=a.carga_folio
WHERE c.proveedor_id=67 AND m.contraparte_id=4;
```
**Resultado:** apl 267 (mov 355 → P-079, 12,500.00) y apl 279 (mov 365 → P-080, 10,000.00).
**Impacto en dinero:** 7,877.35 de CxP asignados a un renglón de proveedor que no debería existir.
**Dueño sugerido:** backend con GATE de Miguel (reasignar `proveedor_id` 67→4 en P-079/P-080 toca meses NO cerrados — julio; verificar que ninguna vista dependa del id 67) + decidir destino del catálogo (desactivar/fusionar 67).
**Fix en una línea:** UPDATE cargas SET proveedor_id=4 WHERE folio IN ('P-079','P-080') con nota de bitácora, y marcar la contraparte 67 como no usable.

**✅ RESUELTO (E48, 2026-07-27):** fusión ejecutada — Las Brisas Produce (id 67) fusionada en AGROFEPAC (id 4); P-079/P-080 reasignadas a `proveedor_id=4`; 67 neutralizada. Confirmado por Miguel: es el mismo proveedor real (Yaca/Thai). Ver D-30 en BITACORA-DECISIONES.md (completa y actualiza D-29).

---

### A-04 · "Partidas por aplicar" NO es solo BBA+Suarez: hay un residuo de +21.81 en el balde "Neutro (se cancela)" que no se cancela
**Severidad: MEDIO (narrativa del ancla incorrecta; monto pequeño)**

La pista decía: −3,278.19 = flete BBA 3,250 + aduana Suarez 50. Esa suma da **−3,300.00**, no −3,278.19. La diferencia (+21.81) viene del balde `Neutro (se cancela)` de `v_balance_partidas`, que hoy netea AJUSTE −8,806.29 contra Devolución +8,828.10: los pares espejo reales (207/209 y 345/348) sí se cancelan, pero quedan **dos créditos sueltos sin par**: mov 199 (+0.21, "Dominio Plein Produce", Devolucion) y mov 297 (+21.60, "AJUSTE DE SALDOS" de Samuel, AJUSTE). La etiqueta "se cancela" miente para estos dos, y el residuo se cuela a la línea de Patrimonio "Partidas por aplicar".

**Consulta que lo prueba:**
```sql
WITH apl AS (SELECT mov_folio, sum(abs(monto)) ap FROM aplicaciones GROUP BY mov_folio)
SELECT m.folio, m.tipo, m.ingreso, m.egreso, m.descripcion
FROM movimientos m LEFT JOIN apl a ON a.mov_folio=m.folio
WHERE m.tipo IN ('AJUSTE','Devolucion') AND NOT m.anulado
  AND abs(m.ingreso+m.egreso) <> COALESCE(a.ap,0);
```
**Resultado:** 6 movs; 4 forman pares espejo exactos; movs 199 (+0.21) y 297 (+21.60) quedan sin contraparte. −3,300.00 + 21.81 = −3,278.19 ✓ (explica el ancla al centavo).
**Impacto en dinero:** 21.81.
**Dueño sugerido:** backend (decisión de Miguel: reconocerlos como otro ingreso/ajuste de patrimonio explícito, o separar en `v_balance_partidas` un destino "Residuo sin par" para que no viajen disfrazados de neutro).
**Fix en una línea:** reclasificar movs 199 y 297 a un tipo que los reconozca (o destino propio en la vista) y actualizar la narrativa del ancla a "−3,300 pendiente + 21.81 residuo".

**✅ RESUELTO (E49, 2026-07-28):** `v_balance` ganó un renglón de Patrimonio "Ajuste bancario reconocido (sin par)" (+21.81); "Partidas por aplicar" queda ahora en −3,300.00 limpia y TOTAL PATRIMONIO sigue en −720.33 (el residuo dejó de viajar disfrazado de "Neutro (se cancela)"). El balance pasó de 16 a 17 filas — el frontend ya lo pinta sin cambio (agrupa por `seccion`, ordena por `orden`, localiza Cuadre por sección). Es exactamente el fix propuesto (separar el residuo en su propia línea reconocida).

---

### A-05 · `aplicaciones` no tiene timestamp ni autor de captura: 134 aplicaciones en meses cerrados son inauditables
**Severidad: MEDIO (hueco de auditabilidad, no evidencia de abuso)**

La tabla `aplicaciones(id, mov_folio, carga_folio, fecha, monto, nota)` carece de `capturado_ts` / `capturado_por`. El trigger `trg_periodo_cerrado` SÍ cubre `aplicaciones` (impide insertar/borrar con fecha en mes cerrado **hoy**), pero no hay forma de auditar *cuándo* se insertó cada una de las 134 aplicaciones con fecha en dic-25..jun-26 — el punto 4 del alcance ("aplicaciones capturadas DESPUÉS del cierre") es incontestable con el esquema actual. En movimientos, cargas y costos sí se pudo verificar (resultado: 0 capturas post-cierre).

**Consulta que lo prueba:**
```sql
SELECT count(*) FROM aplicaciones a
JOIN periodos p ON p.estado='cerrado' AND date_trunc('month',a.fecha)::date=p.mes;
-- 134, y no existe columna de timestamp para fecharlas contra p.cerrado_ts
```
**Impacto en dinero:** 0 directo.
**Dueño sugerido:** backend.
**Fix en una línea:** `ALTER TABLE aplicaciones ADD capturado_por text, ADD capturado_ts timestamptz DEFAULT now()` (columnas no contables; backfill NULL honesto para lo histórico).

---

### A-06 · La excepción del gate de meses cerrados en `cargas` es una lista invertida: toda columna NUEVA pasa por omisión
**Severidad: MEDIO (trampa latente de diseño, sin daño actual)**

`fn_chk_periodo_cerrado` implementa la excepción E36 comparando una lista fija de columnas "protegidas" (folio, po, ids, estado, modalidad, f_embarque, ingreso_venta, revision, anulado...). Todo lo que NO está en la lista pasa el gate en meses cerrados: hoy eso incluye `cajas*` y `pallets` (intención original), pero también `venta_esperada`, `f_entrega`, `f_entrega_real`, `entrega_*`, `id_v7`, `responsable`, `proyecto_id`, `contrato_id`, `programa_id`, `origen_operativo` — columnas agregadas DESPUÉS de E36 que se colaron a la excepción sin decisión explícita. El comentario del código dice "solo toca cajas/cajas_origen/cajas_pu_carton/cajas_nota", que ya no es verdad. Ninguna de las coladas es contable hoy, pero **cualquier columna contable futura en `cargas` nacerá exenta del gate** salvo que alguien recuerde agregarla a la lista.

**Consulta que lo prueba:**
```sql
SELECT prosrc FROM pg_proc WHERE proname='fn_chk_periodo_cerrado';
-- comparar la lista IS NOT DISTINCT FROM contra information_schema.columns de cargas
SELECT column_name FROM information_schema.columns
WHERE table_name='cargas' AND column_name NOT IN
 ('folio','po','proveedor_id','cliente_id','producto_id','estado','modalidad','f_embarque',
  'ingreso_venta','revision_pendiente','nota_revision','capturado_por','capturado_ts',
  'anulado','anulado_motivo','anulado_por','anulado_ts');
```
**Resultado:** 16 columnas fuera de la lista (pasan el gate), 12 de ellas posteriores a E36.
**Impacto en dinero:** 0 hoy.
**Dueño sugerido:** backend.
**Fix en una línea:** invertir la lógica a whitelist explícita de columnas EDITABLES en mes cerrado (cajas*, pallets, entrega*, responsable, programa_id...) y rechazar por default lo demás — así una columna nueva nace protegida.

---

### A-07 · P-071, P-073, P-075: consignaciones con ingreso declarado (12,324.00) sin una sola nota que documente la fuente
**Severidad: MEDIO (cumple el modelo D-11, incumple la disciplina D-04)**

Tres consignaciones tienen `ingreso_venta > 0` con cobrado = 0: P-071 (450.00), P-073 (7,562.00), P-075 (4,312.00) — total 12,324.00, que es exactamente la línea de Pasivo "Ingreso de consignación declarado, no reconocido" (el blindaje E44 funciona: balance y P&L intactos). El problema es documental: `nota_revision` está **vacía en las tres**. D-04 prohíbe llenar `ingreso_venta` con cifras esperadas; solo es legítimo si viene de una liquidación reportada por el cliente. Sin nota, no hay forma de distinguir "el cliente ya liquidó y falta el pago" de "alguien anticipó la cifra" — y esa distinción es la diferencia entre CxC real y utilidad inventada.

**Consulta que lo prueba:**
```sql
SELECT c.folio, c.ingreso_venta, COALESCE(ac.cobrado,0) cobrado, c.nota_revision
FROM cargas c LEFT JOIN v_aplic_cobros ac ON ac.carga_folio=c.folio
WHERE c.modalidad='consignacion' AND c.ingreso_venta > COALESCE(ac.cobrado,0)
  AND NOT COALESCE(c.anulado,false);
```
**Resultado:** 3 filas, nota_revision NULL en todas.
**Impacto en dinero:** 12,324.00 de CxC cuya evidencia de origen no está en el sistema.
**Dueño sugerido:** Samuel (aportar la liquidación/soporte) + Miguel (capturar la nota o, si no hay soporte, regresar ingreso_venta a 0).
**Fix en una línea:** exigir nota fuente en las 3; a futuro, que `fn_editar_carga`/`fn_liquidar_consignacion` rechace ingreso_venta>0 en consignación sin nota de liquidación.

---

### A-08 · El flag vivo (P-085) pide "Falta costo" a una carga de comisión pura — texto stale que contradice D-10
**Severidad: MEDIO (riesgo de que alguien "corrija" capturando un costo que no existe)**

El único flag vivo es P-085 (AX0013, Alpine, modalidad `comision`): *"Proveedor sin resolver: Agricola Omega | Falta costo (dato de Sourcing/Samuel)"*. Por D-10, en comisión pura el costo 0 es CORRECTO y **nunca se le pide costo**. `v_placeholders` ya está parchada (su regla "COSTO 0 — margen 100%" excluye modalidad comisión y hoy NO lista a P-085), así que no es falso positivo vigente de la vista: es texto de flag anterior a D-10 que quedó congelado. La mitad válida del flag es el proveedor sin resolver. Riesgo: quien lea "Falta costo" y lo "resuelva" capturando un costo inventado rompe la modalidad.

**Consulta que lo prueba:**
```sql
SELECT folio, modalidad, nota_revision FROM cargas
WHERE revision_pendiente AND NOT COALESCE(anulado,false);
SELECT count(*) FROM v_placeholders WHERE folio='P-085';  -- 0
```
**Resultado:** 1 flag con el texto citado; v_placeholders no lo lista.
**Impacto en dinero:** 0 (riesgo preventivo).
**Dueño sugerido:** Miguel (reformular el flag vía fn_responder_flag: dejar solo "proveedor sin resolver") + Samuel (confirmar Agricola Omega).
**Fix en una línea:** editar la nota del flag quitando "Falta costo" y dejar constancia D-10 en la resolución.

---

### A-09 · Dos costos colgados de cargas ANULADAS, con concepto fuera de catálogo
**Severidad: MEDIO-BAJO (basura referencial; impacto $0 en vistas)**

`carga_costos` id 42 (P-046, 2,293.50) e id 46 (P-054, 2,520.00) cuelgan de cargas con `anulado=true` y usan el concepto **"Costo total (staging FRX)"**, que no existe en el catálogo `conceptos_costo`. Las vistas financieras (v_cxp, v_estado_resultados, v_anclas) filtran cargas anuladas, así que hoy no mueven ni un centavo — pero cualquier consulta futura que sume `carga_costos` sin repetir el filtro de anulado heredará 4,813.50 fantasma, y el concepto huérfano rompe cualquier pivote por catálogo.

**Consulta que lo prueba:**
```sql
SELECT cc.id, cc.carga_folio, cc.concepto, cc.monto
FROM carga_costos cc JOIN cargas c ON c.folio=cc.carga_folio
WHERE c.anulado IS TRUE
   OR cc.concepto NOT IN (SELECT nombre FROM conceptos_costo);
```
**Resultado:** ids 42 y 46 (ambas condiciones) + id 282 (solo concepto, ver A-10).
**Impacto en dinero:** 0 en vistas actuales; 4,813.50 latentes.
**Dueño sugerido:** backend con GATE (borrarlos toca staging histórico de meses cerrados → el trigger de periodo lo va a bloquear: requiere decisión de Miguel, posiblemente reabrir o documentar que se quedan).
**Fix en una línea:** eliminar los 2 renglones (o marcarlos) y agregar FK/CHECK de `carga_costos.concepto` → `conceptos_costo.nombre`.

---

### A-10 · Concepto "Otros gastos" (P-022, 3,701.00) fuera del catálogo de 7 conceptos
**Severidad: MEDIO-BAJO (decisión documentada, pero invisible para pivotes)**

`carga_costos` id 282 usa el concepto "Otros gastos", que no está en `conceptos_costo` (los 7 válidos terminan en "Otro"). La nota lo documenta (decisión de Miguel 13-jul: se queda en costo de ventas) y las sumas por carga lo incluyen bien. El riesgo es el mismo patrón de A-09: `fn_crear_carga` y el frontend pivotean por los 7 conceptos exactos; un desglose por concepto de P-022 pierde 3,701.00 sin avisar.

**Consulta que lo prueba:** (misma de A-09; fila id 282, carga viva).
**Impacto en dinero:** 3,701.00 invisibles en cualquier pivote por concepto.
**Dueño sugerido:** backend con GATE de Miguel.
**Fix en una línea:** renombrar el concepto a "Otro" conservando la nota (mes de P-022 está cerrado → mismo trámite de gate que A-09), y el mismo CHECK/FK de A-09 para que no vuelva a pasar.

---

### A-11 · Contratos de RPC asimétricos, confirmados en fuente — y un borrado silencioso adicional en fn_editar_movimiento
**Severidad: MEDIO (trampa de API confirmada + hallazgo nuevo)**

Confirmado en el fuente de ambas funciones:
- `fn_capturar_mov`: `IF v_egreso > 0 THEN v_egreso := -v_egreso` → **normaliza** el signo.
- `fn_editar_movimiento`: `COALESCE(p_ingreso,0)` / `COALESCE(p_egreso,0)` → **NULL = 0** (no "no tocar"); rechaza egreso positivo (`SIGNO_INVALIDO`); rechaza contraparte NULL; y — **hallazgo nuevo** — el UPDATE asigna crudo `descripcion=p_descripcion, nota=p_nota`: mandar NULL en esos campos **borra** el texto existente sin advertencia (la bitácora lo registra, pero el dato se pierde).
- **Precisión importante:** `fn_editar_movimiento` NO valida periodos cerrados internamente, pero SÍ está blindada por el trigger `trg_periodo_cerrado` de la tabla `movimientos` (verificado en pg_trigger y en el fuente de `fn_chk_periodo_cerrado`). No hay hueco de inmutabilidad ahí.
- **Censo completado (fuente leído función por función):** 9 de 10 `fn_editar_*` son del bando "NULL = no tocar" — `fn_editar_contraparte`, `fn_editar_costo`, `fn_editar_factura`, `fn_editar_orden_compra`, `fn_editar_presupuesto`, `fn_editar_programa`, `fn_editar_proyecto` (COALESCE(param, actual)), `fn_editar_carga` (vía `IF p_x IS NOT NULL`) y `fn_editar_tarea` (CASE + `p_limpiar_fecha` explícito para vaciar). **La única desalineada es `fn_editar_movimiento`** (NULL=0 en montos, NULL borra descripcion/nota, exige todos los parámetros). Efecto secundario del bando mayoritario: por diseño no se puede poner un campo a NULL (solo tarea ofrece mecanismo explícito de limpieza) — documentarlo, no es error. `fn_editar_costo` además valida concepto contra catálogo activo y exige `p_motivo`, el patrón más sólido de las diez.

**Consulta que lo prueba:**
```sql
SELECT proname, prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN ('fn_capturar_mov','fn_editar_movimiento');
```
**Impacto en dinero:** 0 directo; riesgo de captura silenciosa errónea al programar encima.
**Dueño sugerido:** backend (unificar contrato o documentar por firma) + CLAUDE.md (ya documenta la mitad; agregar el borrado de descripcion/nota).
**Fix en una línea:** migrar fn_editar_movimiento al contrato COALESCE(param, actual) — o como mínimo proteger descripcion/nota con COALESCE.

---

### A-12 · P-019 aparece en v_placeholders (VENTA=COSTO sin confirmar): bloqueador latente del cierre de julio
**Severidad: MEDIO-BAJO**

`v_placeholders` devuelve exactamente 1 fila: P-019 (consignación, Cerrada, venta = costo = cobrado = 21,948.00, patología "VENTA=COSTO — margen 0 por construcción"). Le falta la etiqueta `[VENTA=COSTO CONFIRMADO]` en `nota_revision`. Como `v_cierre_checklist` cuenta placeholders entre los bloqueadores, esto reaparecerá al intentar cerrar julio.

**Consulta que lo prueba:** `SELECT * FROM v_placeholders;` → 1 fila (P-019).
**Impacto en dinero:** 0 (margen 0 real o no confirmado — eso es justo lo que la etiqueta debe decidir).
**Dueño sugerido:** Miguel (confirmar con Samuel si el margen 0 de la 1457 es real y estampar la etiqueta).
**Fix en una línea:** agregar `[VENTA=COSTO CONFIRMADO]` a nota_revision de P-019 si procede.

---

### A-13 · Cobro anterior al embarque en P-013 (anomalía de fecha menor)
**Severidad: COSMÉTICO**

Dos aplicaciones de cobro con fecha anterior a `f_embarque`: P-034 (18-may vs 20-may — es el wash documentado del rechazo Tierra Selecta, sin efecto) y **P-013** (apl 10, cobro 27-feb-2026 vs embarque 01-mar-2026). Puede ser anticipo legítimo o una `f_embarque` corrida; no afecta saldos, sí afecta `dias` de cobranza observados.

**Consulta que lo prueba:**
```sql
SELECT a.id, a.carga_folio, a.fecha, c.f_embarque
FROM aplicaciones a JOIN cargas c ON c.folio=a.carga_folio
JOIN movimientos m ON m.folio=a.mov_folio AND m.ingreso>0 AND m.tipo='Cliente'
WHERE a.fecha < c.f_embarque AND NOT COALESCE(c.anulado,false);
```
**Resultado:** 2 filas (P-013, P-034).
**Dueño sugerido:** Samuel (confirmar si fue anticipo o fecha de embarque incorrecta en P-013).
**Fix en una línea:** nota aclaratoria en P-013 (o corrección de f_embarque si aplica, con gate).

---

### A-14 · PC-006 es el único programa sin producto ligable (respuesta a la pista)
**Severidad: COSMÉTICO**

Barrido completo: solo **PC-006** ("Bell pepper rojo") tiene `producto_ids` vacío — el producto no existe en el catálogo `productos` (10 productos). Ningún otro programa tiene el problema, y ningún `producto_ids` apunta a un id inexistente. 14 de 80 cargas siguen sin `programa_id`, todas explicables (clientes/productos fuera de los 13 programas, o proveedor sin resolver como P-085).

**Consulta que lo prueba:**
```sql
SELECT codigo, producto FROM programas_comerciales
WHERE producto_ids IS NULL OR cardinality(producto_ids)=0;
```
**Resultado:** 1 fila (PC-006).
**Dueño sugerido:** Miguel (alta de "Bell Pepper Rojo" en `productos` con su `codigo_item` FRX, luego ligar en PC-006).
**Fix en una línea:** INSERT del producto + UPDATE de producto_ids en PC-006.

---

### A-15 · `fn_editar_factura` permite "emitir" saltándose `fn_emitir_factura` (y con capacidad de solo captura)
**Severidad: MEDIO-ALTO (bypass de flujo de negocio; sin daño actual)**

Fuente completo leído: `fn_editar_factura` solo valida `fn_actor_puede('capturar')` y luego hace `estado = COALESCE(p_estado, estado)` y `numero = COALESCE(p_numero, numero)` sin más guardas. Consecuencias:
1. Cualquier rol con capacidad de **capturar** (no editar, no administrar) puede poner `estado='emitida'` directamente, saltándose las tres validaciones de `fn_emitir_factura`: carga en estado "Entregada", folio asignado por la serie oficial (`factura_serie`/PP-AAAA-NNNN) y el candado de serie.
2. Puede asignar un `numero` manual arbitrario fuera de la serie (p. ej. PP-2026-9999), rompiendo el consecutivo aunque sea único.
3. Puede editar libremente facturas ya `emitida` o `anulada` (no valida el estado actual antes de tocar líneas, montos o bill_to).

Lo que SÍ contiene el daño: los constraints de tabla `facturas_estado_check` (solo borrador/emitida/anulada) y `facturas_numero_key` (UNIQUE) existen y funcionan. Hoy solo hay 2 facturas (borradores anulados, sin número), así que no hay daño histórico — es una puerta abierta, no un robo consumado.

**Consulta que lo prueba:**
```sql
SELECT prosrc FROM pg_proc WHERE proname='fn_editar_factura';
-- sin validación de estado actual, sin gate de emisión, capacidad 'capturar'
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='facturas'::regclass;
```
**Impacto en dinero:** 0 hoy; riesgo de facturas "emitidas" sin entrega ni serie cuando el módulo entre en uso real (PP-2026-0001 sigue pendiente).
**Dueño sugerido:** backend.
**Fix en una línea:** en `fn_editar_factura`, rechazar `p_estado` y `p_numero` (que estado/folio solo se muevan por `fn_emitir_factura`/`fn_cancelar_factura`) y bloquear edición si `estado <> 'borrador'`.

---

## LO QUE REVISÉ Y ESTÁ BIEN

1. **Anclas E47:** las 20+ cifras cuadran al centavo (Bloque 0).
2. **Doble camino:** CxC (595,807.09), CxP (534,578.14), saldo JPM (41,214.93), utilidad neta (2,557.86) y Anticipos a productores (31,180.00 vs `proyecto_amortizaciones`) dan idéntico por vista y por suma cruda independiente. El Cuadre del balance da 0.00.
3. **Cero deriva en meses cerrados:** los snapshots de `periodos` (ingresos y utilidad bruta de dic-25 a jun-26) coinciden HOY exactamente con `v_estado_resultados` recalculada — 7 de 7 meses, drift 0.00 en todos. Los meses cerrados están genuinamente congelados.
4. **Huérfanos duros: cero.** Movimientos→contrapartes, aplicaciones→cargas, aplicaciones→movimientos, cargas→productos/clientes/proveedores, documentos→cargas, facturas→cargas, amortizaciones→movimientos, tareas→cargas: todo referencialmente íntegro (única excepción: los 2 costos de A-09, en cargas anuladas).
5. **Sobre-aplicación: cero.** Ninguna carga cobrada por encima de su venta ni pagada por encima de su costo; ninguna suma de aplicaciones excede su movimiento; ninguna aplicación con monto negativo; fecha de aplicación = fecha del movimiento en las 179.
6. **Signos limpios:** 0 ingresos negativos, 0 egresos positivos, 0 movimientos con ambos lados, 0 incongruencias tipo-vs-signo contra `tipos_movimiento.naturaleza`.
7. **Series sin huecos ni duplicados:** folios de cargas P-01..P-087 completos y únicos; movimientos JPM 107–368 continuo (262), JEAMS 9001–9008, SAMUEL 9009–9011; tareas y programas sin duplicados. Las 2 facturas son borradores anulados sin número — correcto por diseño (folio solo al emitir).
8. **Capturas post-cierre: cero** en movimientos, cargas y costos (capturado_ts vs cerrado_ts del periodo). En aplicaciones no es verificable — ver A-05.
9. **Movimientos sin aplicar = exactamente los conocidos:** mov 367 (BBA −3,250) y mov 368 (Suarez −50, la kabocha del 20-jul **cuya carga efectivamente NO existe** — pista confirmada, sin más cargas fantasma: todos los cobros de Cliente están 100% aplicados y no hay otros egresos comerciales flotantes). Materiales de empaque sin aplicar = inventario, correcto.
10. **P-034 (Tierra Selecta):** el cobro sin venta que mi consulta detectó es el wash documentado (+9,540/−9,540, neto 0). Falso positivo mío, bien documentado en la nota.
11. **Trigger de periodos cerrados:** `trg_periodo_cerrado` existe y cubre `movimientos`, `cargas`, `aplicaciones` y `carga_costos` (contra lo que se temía, `fn_editar_movimiento` SÍ está blindada por él; ver precisión en A-11). La excepción de movimientos (solo descripcion/nota) es exacta y estricta.
12. **Nadie coteja por folio:** ninguna vista ni función junta `folio` contra `id_v7` (D-09 respetada en el sistema; el riesgo queda solo en procesos humanos).
13. **v_placeholders ya respeta D-10:** su regla de COSTO 0 excluye modalidad comisión; las 13 cargas de comisión no aparecen como patología y ninguna tiene costo > 0.
14. **Vistas y zona horaria:** 0 vistas usan CURRENT_DATE (el barrido pendiente de E41 sobre vistas se hizo; el hueco quedó en funciones — A-02).
15. **P-043:** estado "Cerrada", sin revisión pendiente — el pendiente histórico de estado stale quedó resuelto.
16. **Cuenta SAMUEL:** saldo 4,400.00 = exactamente el TC de D-24; excluida del banco en v_balance como manda D-19.
17. **anon:** cero privilegios sobre todo objeto (tablas, vistas y funciones — v_seguridad_anon vigila las tres clases para anon; su punto ciego es authenticated, ver A-01).

## HIPÓTESIS NO PROBADAS (declaradas aparte, como pide el método)

- **Origen de las cifras de P-071/073/075 (A-07):** la base no puede probar si vinieron de liquidación real o de expectativa; solo Samuel puede.
- **Composición del "Pasivo a socios" 6,721.81:** SAMUEL 4,400 + comisión 720 + Global Fresh 436.80 = 5,556.80; el resto (1,165.01) no lo desglosé contra fuente — pendiente de rastrear en la definición de v_balance si se quiere certeza.
- **P-013 cobro pre-embarque (A-13):** anticipo vs fecha errada — indistinguible desde la base.

---

## ESTADO DE LA AUDITORÍA (corte 2026-07-27)

- Bloques 0–9 del alcance: **ejecutados** (huérfanos, doble camino, sobre-aplicación, periodos, duplicados, modalidad, fechas, signos, series).
- Pistas: partidas por aplicar (A-04, corregida la narrativa), kabocha (confirmada, sin más fantasmas), PC-006 (confirmada, única), flag P-085 (A-08: stale, no falso positivo vigente), cotejo por folio (descartado en objetos del sistema).
- Censo de contratos de RPC: **completado** (10 de 10 `fn_editar_*` leídas en fuente; resultado en A-11; hallazgo derivado A-15).
- **AUDITORÍA FASE 1 COMPLETA.** Cero escrituras ejecutadas durante toda la sesión (solo SELECT / lectura de catálogos del sistema). Todo fix propuesto requiere GATE de Miguel en sesión aparte.

---

### E55 (2026-07-29) — Limpieza de documentos de prueba

Se borraron todos los documentos de prueba anulados (8 facturas, 3 OC, 2 cotizaciones, 1 liquidación
LQ-2026-0001) y se resetearon los contadores. Para borrar la liquidación anulada se levantaron
momentáneamente los 3 triggers de inmutabilidad PACA (tg_liquidaciones_inmutable,
tg_liq_cargas_inmutables, tg_liq_deducciones_inmutables) y se reactivaron en la MISMA transacción —
verificado post-apply que quedaron activos ('O'). Sin impacto en anclas (Cuadre 0.00, CxC/CxP/JPM sin
cambio).

---

### E57–E61 (2026-07-30) — REESTRUCTURA: cambios de esquema, vista de atribución y estado de atribución de proveedores

**Cambios de esquema (DDL aplicado):**
- **Fase A — catálogo:** `productos` 10→12 (Broccolini id 11, Plátano Thai id 12). `presentaciones`
  0→45 filas (Jack Fruit 6, Papaya 7, Col de bruselas 6, Espárrago conv. 10, Espárrago org. 10,
  Broccolini 5, Plátano Thai 1) — catálogo de referencia, aún sin enganchar a la captura por carga.
  `variedades`: se quitó "Convencional" de espárrago y se agregaron 4 de Papaya
  (Maradol/Tainung/Intenzza/Vegas) → total 8. Colores de Bell Pepper/Coco/Habanero se conservan en
  variedad hasta migrar a presentación (pendiente datos Samuel).
- **B1:** `ALTER TABLE cargas ADD COLUMN presentacion_id integer NULL REFERENCES presentaciones(id)`
  + índice. Todas las cargas en NULL por ahora.
- **B3:** `ALTER TABLE carga_costos ADD COLUMN contraparte_id integer NULL REFERENCES contrapartes(id)`
  + índice. Resuelve costos multi-proveedor (el hoyo #1 de FMU01/P-025).
- **E59:** se redefinió `fn_chk_periodo_cerrado()` agregando una 3ª excepción acotada — un `UPDATE`
  en `carga_costos` que SOLO toca `contraparte_id` (no `concepto` ni `monto`) pasa en meses
  cerrados. Mismo patrón que E36 (cajas) / E44 (texto). **PROBADO** que sigue bloqueando cambios
  de monto.
- **E61:** creada `VIEW v_cxp_proveedor_atribuido` (CxP por proveedor real vía `contraparte_id`).
  Nace **cerrada** (REVOKE anon/PUBLIC, GRANT authenticated). Costo exacto **$1,068,388.47**.
  Pagado/saldo son **ESTIMADOS** por prorrateo (los pagos aún están capturados a nivel carga, no
  por línea). Jubila conceptualmente el parche `v_cxp_proveedor_real` (E56). **PENDIENTE:**
  reapuntar frontend `modulo-pagos.js:108` (ver `REPORTE-FRONTEND.md`).

**Estado de atribución de proveedores (E60): 220/251 líneas de costo (88%).** Método: Fletes→BBA(9),
Aduanas→Suárez(49), In&Out→Agricooling(3) — inequívocos, sin necesidad de cruce. Materia
prima/Comisión/Cartón vía puente `id_v7`→V8 (cruce **por `id_v7`, NUNCA por folio**: 22 embarques
tienen folio≠id_v7 — ver regla 11 de `CLAUDE.md`). Altas: Succar Farms (comisionista); Luis Alvarez
ya existía (id 84).

**Descubrimiento crítico:** `cargas.proveedor_id` era un **cajón de sastre** — AGROFEPAC aparecía
como proveedor en cargas cuya materia prima real era de Papayas & More o de Las Brisas. La
atribución por LÍNEA (no por carga completa) corrigió el error histórico. FMU01 (P-025) quedó
atribuido a sus 4 proveedores reales: Materia prima→Las Brisas(67), Fletes→BBA(9),
Aduanas→Suárez(49), Cartón→Papayas & More(40). AGROFEPAC pasa de una CxP inflada (~245.8k) a su
saldo real (~55.6k). Detalle de la decisión en `BITACORA-DECISIONES.md` D-49.

**Pendiente (E62):** 31 líneas de costo residuales sin atribuir; atribución de PAGOS por línea
(hoy estimados por prorrateo en `v_cxp_proveedor_atribuido`). Sin impacto en anclas al cierre de
E61 (Cuadre 0.00, CxC/CxP/JPM sin cambio).
