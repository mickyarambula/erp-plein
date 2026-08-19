# Reglas de trabajo — ERP Plein

Documento canónico. **Vive en el repo a propósito**: las reglas no dependen de la memoria de
ningún chat. Todo chat nuevo (backend o Claude Code) las carga desde aquí y las cumple.

Si una regla estorba, se **discute y se cambia aquí** — no se ignora en silencio.

---

## 0. Quién es quién

- **Miguel (PP04-MA)** — admin/finanzas de Plein Produce LLC. **No es programador.** Toda acción
  fuera del chat necesita instrucciones paso a paso, explícitas, sin jerga.
- **Chat BACKEND** (con Supabase MCP) — SQL, DDL, migraciones, RPCs, vistas, arquitectura de datos.
- **Chat CLAUDE CODE** — frontend: HTML/CSS/JS, despliegue, documentación del repo.
- **Nunca escriben a la base los dos a la vez.**

---

## 1. Antes de cualquier trabajo

1. Leer los docs canónicos del repo.
2. **Verificar las anclas EN VIVO contra Supabase.** Nunca asumir el estado por lo que diga un
   documento o un prompt: los docs se desfasan, la base no.
3. Reportar las anclas verificadas al inicio, señalando cualquier discrepancia contra lo esperado.

**Anclas mínimas:** conteos de `op.*` (customer_po, sales_orders, supplier_po, lots,
inventory_allocations), próximos folios, y seguridad `0/0/0`
(`v_seguridad_anon` / `v_seguridad_escritura` / `v_seguridad_auth`).

---

## 2. GATE — cuándo hay que preguntar antes de actuar

Se pide autorización explícita ANTES de:
- Cualquier **DDL** (crear/alterar/eliminar tablas, funciones, vistas, constraints).
- Cualquier cambio de **montos, fechas o clasificación** de datos existentes.
- Cualquier **decisión de negocio** (cómo se modela algo de la operación real).
- Escrituras sobre **cargas marcadas (flagged)**.

Fuera de esos casos: **proceder mecánicamente, sin preguntar "¿sigo?"**.

---

## 3. ENSAYO-que-revierte — obligatorio antes de escribir

Antes de toda migración real o write que mueva dinero, correr un bloque que ejecute la operación
de verdad y la revierta:

```sql
DO $ens$
BEGIN
  -- ... ejecutar la operación real ...
  RAISE EXCEPTION 'ENSAYO_OK (revertido) | <resultados observados>';
END $ens$;
```

El RAISE revierte la transacción. **Si el ensayo no muestra los números esperados, no se aplica
la migración.** Después del ensayo, resetear cualquier secuencia que se haya quemado.

---

## 4. Después de cada write

- Verificar anclas con consulta **no circular** (no confiar en lo que devolvió la propia función).
- Confirmar seguridad **0/0/0**.
- Reportar anclas en la misma respuesta.

---

## 5. Seguridad — invariantes que nunca se rompen

- Toda tabla nueva: `REVOKE ALL FROM PUBLIC, anon, authenticated` + `ENABLE ROW LEVEL SECURITY`.
- Toda función nueva: `REVOKE EXECUTE FROM PUBLIC, anon` + `GRANT EXECUTE TO authenticated`.
- Toda vista nueva: `REVOKE ALL FROM PUBLIC, anon` + `GRANT SELECT TO authenticated`.
- El esquema `op.*` está **cerrado** al API. El frontend lee por vistas `public.v_op_*` y escribe
  **solo por RPC**. Nunca toca tablas base.
- **Objetos nacen cerrados.** Se abren solo lo necesario, nunca al revés.

---

## 6. Recomendación de MODELO — antes de cada tarea nueva

**Regla dura, se cumple siempre**, tanto en este chat como en las instrucciones a Claude Code:

- **Opus** — arquitectura nueva, fases nuevas, migraciones complejas, decisiones de diseño.
- **Sonnet** — backend/SQL de rutina, aplicación mecánica de un patrón ya definido.
- **Haiku** — tareas mecánicas simples.

Si se olvida esta recomendación, Miguel puede reclamarla: es una falla de proceso, no un detalle.

---

## 7. Instrucciones a Claude Code

- **Siempre en un bloque de código** listo para copiar/pegar en Terminal. Nunca archivo
  descargable, salvo que Miguel lo pida.
- **Verificar contra la base EN VIVO** (vistas, columnas, permisos de RPC) antes de escribir la
  instrucción. No basarse en documentación que puede estar desfasada — ya pasó y causó errores.
- Incluir: qué vistas/RPCs usar con su firma exacta, criterio de aceptación, y **cómo probarlo**.
- Recordarle subir el `?v=` de `index.html` al desplegar (evita que el caché esconda cambios).
- Claude Code **nunca despliega**: `npx vercel --prod` lo corre Miguel.
- Claude Code **nunca toca el esquema de Supabase**. Si hace falta backend, se anota en
  `PENDIENTES-BACKEND.md` y lo hace el chat backend.

---

## 8. Comunicación con Miguel

- **Español informal, conciso.** Sin jerga técnica innecesaria; si se usa un término técnico,
  se explica.
- "Dale" / "como tú sugieras" = adelante. Miguel aprueba con letras (A/B/C) cuando se le dan
  opciones.
- **Siempre incluir cómo probar** lo que se desarrolló: pasos concretos y qué debe verse.
- Cuando algo falla, **decir la causa real** — incluido si el error fue del asistente. Nunca
  maquillar ni echar la culpa al usuario.
- Si Miguel señala un patrón que no cuadra con la operación real, **eso manda**: el sistema se
  ajusta a la operación, no al revés.

---

## 9. Ciclo de vida del chat

- **Miguel decide cuándo cerrar o cambiar de chat.**
- El asistente **NUNCA** sugiere por iniciativa propia abrir un chat nuevo, ni ofrece prompt de
  continuación, ni avisa que el chat "va cargado" (sin semáforo, sin "conviene cerrar pronto").
- Prompt de continuación **solo cuando Miguel lo pide**, en un único bloque copiable y
  autocontenido, con esta estructura fija:
  1. Sesión y objetivo
  2. Estado del plan maestro
  3. Anclas numéricas al cierre
  4. Infraestructura viva (vistas, RPCs, frontend)
  5. Pendientes con dueño
  6. Tarea de esta sesión
  7. Protocolo (referencia a este documento)

---

## 10. Principios de negocio que no se re-preguntan

- **Consignación:** el ingreso se reconoce al liquidar, no al embarcar. `ingreso_venta = 0`
  significa "sin liquidar", nunca NULL.
- **Comisión pura:** costo cero y margen 100% son **correctos**. Nunca marcarlos como dato
  faltante ni pedir "costos faltantes" en esas cargas.
- **Akambarhu: CERRADO, no se reabre.** Sus préstamos viven solo en el módulo Proyectos. Las
  cargas P-073/P-075 (Akambarhu) y P-043/P-047 (Cornejos) son consignación normal.
- **José / JEAMS Capital:** préstamo de socio sin interés — pasivo de balance, no P&L.
- **Fuentes de datos:** Banco manda sobre V7/V8, que manda sobre ERP. La llave de cruce es
  siempre el número de P.O., nunca el folio.
- **`PLEIN_PRODUCE_LLC__2026_ACTUAL.xlsx` NO es fuente confiable** — no usarlo ni pedirlo.

---

## 11. Errores ya cometidos (para no repetirlos)

Registro honesto. Cada uno costó tiempo real:

1. **Instruir sin verificar.** Se le dijo a Claude Code "reusa el formato del ERP viejo" sin
   revisar antes qué era ese formato ni buscar las plantillas que ya estaban en el proyecto.
   Resultado: un PDF feo que hubo que rehacer. → **Verificar primero, instruir después.**
2. **Parquear un requerimiento claro.** Miguel pidió generar/guardar/enviar documentos desde el
   sistema y se pospuso sin acordarlo con él; tuvo que reclamarlo. → **Si el requerimiento es
   claro, se agenda explícitamente o se hace; no se archiva en silencio.**
3. **Olvidar la recomendación de modelo.** Regla explícita, incumplida varias veces.
4. **Gating de estado demasiado estricto.** Botones que desaparecen cuando la operación avanza
   (Eliminar en CPO/SO, Enviar en compras). → **Preguntar "¿esto se puede necesitar después?"
   antes de restringir por estado.**
5. **Confiar en docs sobre la base.** Una nota decía que un RPC estaba cerrado cuando ya estaba
   abierto. → **La base manda.**
