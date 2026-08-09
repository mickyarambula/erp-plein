# BITÁCORA — entradas E85 (anexar al final de BITACORA-DECISIONES.md)

### D-93 · E85 · A-07 guarda: declarar venta de consignación exige nota fuente
Se cerraron ambas puertas de escritura que permitían declarar ingreso de consignación sin fuente documentada.
- `fn_editar_carga`: guard tras el check de anulado — si `p_ingreso_venta>0` y modalidad (nueva o actual) = 'consignacion' y no hay nota (ni `p_nota_revision` ni `nota_revision` existente) → RAISE. Manda `p_nota_revision` con la fuente o usa `fn_liquidar_consignacion`.
- `fn_crear_carga`: guard antes del advisory lock — si modalidad='consignacion' e `ingreso_venta>0` → RAISE (una consignación se crea sin liquidar).
- `fn_liquidar_consignacion` y `fn_desglosar_carga` ya blindadas (exigen `p_resolucion`).
Técnica de inyección: `pg_get_functiondef` + `replace(src, ancla, guard)` con tags de dollar-quote distintos (preserva el cuerpo byte-por-byte). Migración `e85_d93_guarda_a07_editar_crear_carga`. Money-neutral (anclas = E84). **Pendiente:** dato de Samuel para notas de P-071 y P-075 (A-07 no cierra 100% hasta eso).

### D-94 · E85 · PC-013 proveedor Paumar → Omega
`fn_editar_programa(p_codigo=>'PC-013', p_proveedor_id=>7, ...)`: AGRICOLA PAUMAR (id 2, `es_proveedor=false`) → Agricola Omega (id 7, proveedor válido). Money-neutral (solo escribe `programas_comerciales` + bitacora). Resultado: 0 programas en diverge. *Cosmético pendiente:* etiqueta/nota aún dicen "Paumar" (no afecta bandera).

### D-95 · E85 · A-14 ligar PC-006 al producto Bell Pepper (modelo producto+variedad)
NORTE describía A-14 como "alta de producto 'Bell Pepper Rojo' con codigo_item FRX". Al revisar el esquema real (captura del Directorio Comercial) se corrige: el modelo es **producto + variedades**. "Bell Pepper Rojo" = producto Bell Pepper (id 4, `codigo_item ID-06`) + variedad Rojo. La tabla `variedades` (id, producto_id, nombre, activo) **no lleva codigo_item**; el FRX vive solo a nivel producto. `programas.producto_ids` referencia `productos.id` (confirmado: PC-013 usa [7]=Col de bruselas).
Acciones: (1) Miguel agregó por UI la variedad Rojo a Bell Pepper (`variedades.id=22`). (2) `fn_editar_programa(PC-006, producto_ids=>ARRAY[4])`. NO se creó producto nuevo. Resultado: PC-006.producto_ids=[4], 0 programas sin producto, 0 en diverge, money-neutral.

### D-96 · E85 · P-035 rechazo Candy Fresh (PO 7569) — corregido en la capa lote_ventas
Contexto: P-035 fue rechazo puro (sin venta). Candy Fresh (cp 11, cliente y proveedor) recibió 9,010 y lo devuelve por partes; reembolsos 6,505 (movs 271/284/310/338/362), deuda viva 2,505. La carga arrastraba "venta fantasma" 7,808.69 + estado Entregada → v_cxc reportaba 1,303.69 en vez de 2,505.
**HALLAZGO CLAVE:** editar `cargas.ingreso_venta` NO corrige el saldo. Para RM-002 (margen), `v_ingreso_reconocido` toma `venta_lote = Σ(lote_ventas.precio_caja × cajas)`, y solo cae a `ingreso_venta` si no hay lote_ventas. La venta fantasma vivía en `lote_ventas` id 95 (SO-0028, LOTE-2026-0032, espejo 1:1 del backfill C.2/E73), precio 7.0988×1100=7,808.69. Cancelar la SO no sirve (v_ingreso_reconocido no filtra SOs anuladas y el lote_venta persiste). `fn_desasignar_carga_so` solo borra el vínculo y deja el lote_venta huérfano.
Decisión (**Opción A**, elegida por Miguel): corregir en la capa correcta.
Acciones: (1) `lote_ventas` 95 `precio_caja` 7.0988 → 9010/1100 = 8.19090909 (venta_lote=9,010, margen 0 = recuperación de costo); (2) `SO-0028.precio_venta_caja` alineado a 8.19090909 (margen 0, coherente con precio_compra); (3) `cargas.ingreso_venta` 7,808.69 → 9,010, estado Entregada → Rechazo, nota `[VENTA=COSTO CONFIRMADO]` (via `fn_editar_carga`, 2 llamadas: nota primero por el orden de UPDATE del trigger GATE-3; luego venta+estado con `p_forzar` por la guarda CxC que suma el pago y por la transición no catalogada); (4) mayo reabierto → corregido → re-cerrado limpio (bloqueadores 0).
Verificación: ENSAYO-que-revierte OK; aplicado con aserciones-red; persistente: saldo_cxc P-035=2,505.00, estado Rechazo, vir=9,010, Cuadre 0.00, seg 0/0/0, **CxC 588,061.82 → 589,263.13 (+1,201.31)**, CxP 507,241 sin cambio, placeholders 0. Money-neutral en Cuadre (CxC +1,201.31 = utilidad +1,201.31; mayo ingresos 154,631.26→155,832.57, utilidad_bruta 10,354.12→11,555.43).
