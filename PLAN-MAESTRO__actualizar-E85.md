# PLAN-MAESTRO — actualización E85 (mergear en PLAN-MAESTRO.md)
_Solo lo tocado en E85. Reconciliar contra tu estructura de bloques 0→A→B→C→D→E→F._

## Estado tras E85
- **Seguridad (A-01):** cerrado en sesiones previas (RLS + REVOKE ALL en 16 tablas, `v_seguridad_auth` en el centinela de arranque). Verde al cierre E85.
- **Liquidación PACA (P-B):** backend COMPLETO (tablas + RPCs + vistas + triggers de inmutabilidad + RLS). **Pendiente: frontend (bloque P-B frontend).**
- **Programas comerciales:** 13 programas (PC-001…PC-013) sembrados; trigger de auto-ligado `tg_cargas_programa`; UI desplegada. En E85: PC-013 proveedor corregido (D-94), PC-006 ligado a producto (D-95). **Directorio consistente: 0 programas sin producto, 0 en diverge.**
- **Documentos (membrete/Invoice/PO/Quote/Liquidación PACA):** integrados al ERP (E54/E55) con numeración oficial PO-/QT-. Cerrado.
- **Guardas contables (A-07):** desplegadas (D-93); cierre 100% pendiente de dato de Samuel.
- **Correcciones de datos:** P-035 rechazo cerrado (D-96) — abrió el hallazgo de espejos backfill (candidato A-15).

## Próximo en el horizonte (backend)
1. Auditar espejos `lote_ventas` del backfill C.2/E73 (posibles "ventas fantasma" heredadas). ← recomendado como siguiente diagnóstico.
2. Cerrar A-07 100% cuando llegue el dato de Samuel (notas P-071/P-075).
3. Frontend PACA (bloque P-B frontend).
4. Adopción de Samuel como usuario ERP.
5. Conciliación V8↔ERP hoja por hoja (coordinado con el chat de operación): Ingresos, Egresos, Chase, Traspasos, Nómina.
