Confirmado desde el backend (leí las funciones reales, no supuse nada):

1. ESTADOS — hay CHECK constraint, son exactamente 6, no 4:
   Programada, En Camino, Entregada, Cerrada, Rechazo, Falta informacion
   Tu pipeline de 4 etapas está bien para VISUALIZAR una carga existente
   (Rechazo y Falta informacion son estados de excepción, correctamente
   quedan fuera del pipeline lineal). Pero el <select> de "Nueva carga"
   debe ofrecer los 6, no solo 4 — agrega Rechazo y Falta informacion
   como opciones aparte (quizás en un grupo "Estados de excepción").

2. p_egreso: confirmado, tu instinto estaba bien. La función normaliza
   el signo sola. No cambies nada ahí.

3. p_tipo: NO lo dejes en NULL. Mándalo explícito:
   - tipo === 'cobro' → p_tipo: 'Cliente'
   - tipo === 'pago'  → p_tipo: 'Proveedor'
   Razón: fn_aplicar_fifo decide COBRO/PAGO por el signo del monto, no
   por p_tipo, así que el FIFO funciona igual en ambos casos. PERO
   v_kpi_rotacion_cobranza (el KPI de DSO en Finanzas) filtra
   específicamente WHERE m.tipo = 'Cliente'. Si mandas NULL, el cobro
   se aplica bien pero desaparece de ese KPI. Ambos valores ('Cliente'
   y 'Proveedor') ya existen en tipos_movimiento, no disparan rechazo.

4. Flags: confirmado, tu decisión de no bloquear era correcta.
   fn_agregar_costo permite escribir con revision_pendiente=true y solo
   regresa advertencia, nunca rechaza por eso. No cambies nada ahí.

5. HALLAZGO NUEVO (no lo preguntaste, pero es bloqueante): p_concepto en
   fn_agregar_costo NO es texto libre. Debe coincidir EXACTO con el
   catálogo conceptos_costo o el backend rechaza. Los 7 valores reales,
   activos ahora mismo:
   Materia prima, Comision, Aduanas, In & Out QC, Fletes, Carton, Otro
   Cambia el campo "Concepto" del formulario de costo de <input text> a
   <select> con estas 7 opciones exactas. Si en el futuro cambia el
   catálogo, lo aviso aquí — por ahora no hace falta traerlo dinámico
   de una vista, son fijos.

Aplica los 4 ajustes (estados completos en el selector, p_tipo explícito,
concepto como select) y despliega. Ya no hay preguntas abiertas de tu
lado — todo lo demás de tu resumen (matriz de permisos, FIFO advirtiendo
a qué carga se aplicó, pipeline no forzado) quedó bien y no se toca.

Confirma con el mismo tipo de verificación que ya usas (argumentos crudos
del RPC, no un stub que asuma) que ahora sale p_tipo:"Cliente" o
p_tipo:"Proveedor" en vez de null, y que el concepto viaja como uno de
los 7 valores del catálogo.
