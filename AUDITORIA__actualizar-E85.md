# AUDITORÍA — actualización E85 (mergear en AUDITORIA.md)
_Solo cambios de esta sesión. Reconciliar contra tu lista completa A-01…A-14._

## A-07 — Reconocimiento de venta de consignación sin fuente
**Estado: RESUELTO EN BACKEND (D-93) · pendiente dato de Samuel.**
Guardas puestas en `fn_editar_carga` (exige nota fuente para venta de consignación) y `fn_crear_carga` (prohíbe consignación con ingreso>0). `fn_liquidar_consignacion` y `fn_desglosar_carga` ya blindadas por `p_resolucion`. **Cierra 100%** cuando Samuel entregue las notas fuente de **P-071** y **P-075** (dato externo).

## A-14 — Alta/ligado de "Bell Pepper Rojo"
**Estado: CERRADO (D-95).**
Corregido el supuesto: el modelo es producto + variedades. "Bell Pepper Rojo" = producto Bell Pepper (id 4, `ID-06`) + variedad Rojo (id 22, agregada por Miguel en UI). PC-006 ligado a `producto_ids=[4]`. `variedades` no lleva `codigo_item`. Resultado: 0 programas sin producto, 0 en diverge.

## Nuevo hallazgo abierto (de D-96) — proponer como A-15
**Espejos del backfill C.2/E73:** existen lotes + `lote_ventas` espejo 1:1 creados por migración. P-035 tenía la venta reconocida (`venta_lote`) distinta de la venta real. **Riesgo:** otras cargas margen podrían arrastrar `lote_ventas` con precio de venta espejo desalineado del real ("ventas fantasma" heredadas). **Acción:** auditar comparando `venta_lote` (v_ingreso_reconocido) vs. venta real por P.O./V8, para todas las cargas margen/buy_resell con lote_ventas. Dueño: backend.

## Recordatorio de sanidad (post-DDL y post-money-mover)
`v_seguridad_anon = 0` · `v_seguridad_escritura = 0` · `v_seguridad_auth = 0` · `v_balance` Cuadre = 0.00. Todo verde al cierre E85.
