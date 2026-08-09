# CLAUDE.md — Cómo trabajar en ERP Plein
_Instrucciones operativas para cualquier sesión (backend u operación). Última actualización: E95._

## Quién es quién
- **Miguel Arámbula (PP04-MA)** — admin/finanzas. **NO es programador**: toda acción fuera del chat necesita pasos detallados (dónde hacer clic, qué escribir, qué esperar). Actor MCP = PP04-MA (permisos admin/editar/administrar/capturar). En E86 Miguel ya opera el ERP él mismo (capturó y emitió su 1ª liquidación real).
- **PP01-SI Samuel Ibarra** — Ventas y Operaciones; dueño de las hojas fuente (V6/V7/V8) y de la cuenta JP Morgan Chase; fuente operativa primaria.
- **PP02-JM Juan Mercado "Chanes"** — Compras y Operaciones; sourcing y productores.
- **PP03-JA José Arámbula Miñarro** — Financiero/Consejo; capital vía **JEAMS Capital LLC** (préstamo socio sin interés; pasivo de balance, no P&L).
- **Luis Fernando Hanna (cp 35)** — vendedor US; participación sale de la comisión de Plein, nunca de deducciones al productor.

## Negocio en un párrafo
Plein Produce LLC, trading de fruta/verdura fresca (US-registered). ERP a medida en Supabase + frontend vanilla JS/Vercel. **Modalidades:** margen fijo (costo al embarque); consignación (ingreso al **COBRO**, no al embarque; el costo puede preceder al ingreso); comisión pura (Plein no compra; solo comisión — Alpine Fresh AX001–AX0013, Kabocha CRI, Carrifoods en POs específicas: **costo 0 y margen 100% son correctos**, `modalidad='comision'`). Dos ejes: **costo en el LOTE, venta en la SALES ORDER**. Flujo = Order-to-Cash de 11 pasos.

## Estado (E87): USO REAL
La base está **CERRADA** (A-16 auditada, D-97). Foco = cargar datos reales y operar, **no auditar backend** salvo que algo rompa el Cuadre. Liquidaciones PACA en uso real (LQ-2026-0002 emitida). Siguiente feature: **Anticipo a productor / disposición de proyecto** (crear movimiento tipo "Anticipo a productor" desde el front, ligado a proyecto).

## Reglas de oro
- **BANCO MANDA:** Banco → V8 → ERP. Llave de cotejo = **P.O.**, nunca folio.
- **CUADRE 0.00** en todo momento; cualquier desvío = parar.
- Consignación: no poblar `venta`/`venta_esperada` con estimados; `ingreso_venta=0` = "sin liquidar"; reconocer al cobro.
- JEAMS = préstamo socio sin interés. Comisión Plein consignación = del programa (`ingreso_base='pct_venta'`) o 10% fallback; Hanna sale de la parte de Plein.
- **Liquidación PACA:** comisión del programa/10%; deducciones = costos EXCEPTO 'Materia prima' (→anticipo) y 'Comision' (excluido). Regla de negocio de Miguel: todos los costos del producto se le pasan al productor al final. **Revisar cada borrador antes de emitir** (proveedores viejos = discrepancias esperadas).
- **Akambarhu:** préstamos en Proyectos, no en cargas (cerrado D-100).

## Dos chats (división de trabajo)
- **BACKEND** (este documento en modo completo): esquema/DDL, RPCs, money-movers, meses cerrados. **Escribe** con protocolo.
- **OPERACIÓN/CONCILIACIÓN/MANUAL** (ver `MODO-OPERACION.md`): **solo lectura**; enseña, concilia V8↔ERP, mantiene el manual.
- **FRONTEND/DISEÑO** (ver `SISTEMA-DISEÑO.md` + `REPORTE-FRONTEND.md`): rediseño visual "Operador estilo Silo" pantalla por pantalla con Claude Code. **Solo frontend, nunca esquema.**
- **Nunca dos chats escribiendo a la vez.**

## PROTOCOLO DE ESCRITURA (backend) — obligatorio
1. **GATE:** presentar el plan antes de escribir cuando haya DDL, cambios de montos/fechas/clasificaciones, escrituras contra cargas flageadas, o decisiones de negocio. Escrituras mecánicas se ejecutan sin pedir autorización.
2. **ENSAYO-que-revierte:** antes de cada escritura real, un bloque `DO $$ ... $$` que aplica el cambio, verifica sentinelas (Cuadre 0.00, seg 0/0/0, anclas), y termina con `RAISE EXCEPTION 'ENSAYO_OK_REVERTIR ...'` para hacer rollback. Nada persiste. (Para DDL: `EXECUTE` dentro del DO; el RAISE revierte el CREATE/REPLACE.)
3. **Aplicar real:** el mismo bloque **sin** el RAISE final (aserciones como red). Luego verificar en **lectura fresca** (no circular).
4. `apply_migration` para **todo DDL**; `execute_sql` para DML/RPC/lecturas.
5. Al cambiar la lista de parámetros de una función: **DROP** la firma vieja antes de `CREATE OR REPLACE`.
6. Verificación no circular: `v_anclas` + `v_balance`(Cuadre) + `v_seguridad_*`. Nunca una vista contra sí misma.
7. Numerar decisiones nuevas desde el último D-## (al cierre E87: **D-104**; siguiente = D-105). Registrar en BITACORA.
8. **Modificar una vista grande** (ej. v_agenda_operativa): usar `pg_get_viewdef` + `replace` en un ancla única (preserva el cuerpo byte-por-byte), no re-transcribir. Preservar reloptions.
9. **Objeto nuevo** (tabla/vista/función): `REVOKE ALL FROM PUBLIC, anon` + `GRANT SELECT/EXECUTE TO authenticated` + `SET search_path TO 'public'`. Verificar seg 0/0/0 después.

## Protocolo de arranque de sesión
1. Leer NORTE.md, CLAUDE.md, PLAN-MAESTRO.md, AUDITORIA.md, BITACORA-DECISIONES.md, PENDIENTES-BACKEND.md (+ MODO-OPERACION.md y manual si es chat de operación; + SISTEMA-DISEÑO.md y REPORTE-FRONTEND.md para tareas de frontend).
2. Correr verificación en vivo: `v_anclas`, `v_balance WHERE seccion='Cuadre'`, `v_seguridad_anon/escritura/auth`, `v_placeholders`.
3. Confirmar que las anclas cuadran con el cierre previo **antes** de tocar nada.

## Estilo y comunicación
- Español informal, respuestas concisas. Una tarea real a la vez (no abrumar).
- "dale" / "como tú sugieras" = GO. Selección por letra (A/B/C) para opciones.
- No preguntar "¿sigo?" a media ejecución: continuar autónomo hasta 🔴 o bloqueo por input externo.
- Correcciones = requisito bloqueante; reconocer de inmediato. **Nunca rellenar con supuestos** (leer datos reales antes de explicar/diseñar; si no se sabe, verificar en la base — no inventar).
- Para clics exactos (acciones en la UI): pedir **captura de pantalla**.
- **Semáforo de carga** al final de turnos largos: 🟢 ok / 🟡 ya cargado, cerrar pronto / 🔴 cortar. En 🔴 ofrecer prompt de continuación + qué anexar. Pecar de avisar temprano. Preferir una tarea por chat. **Miguel decide cuándo cambiar de chat, no Claude** (no insistir).
- **Recomendar modelo** al arrancar cada tarea nueva: rutina backend/SQL → Sonnet 5; migraciones/diagnóstico contable fino/arquitectura/money-mover → Opus 4.8; Fable 5 si atorado. Claude Code frontend rutina → Sonnet 5.

## Instrucciones para Claude Code (cuando aplique)
- SIEMPRE en bloque de código para pegar en Terminal, sin excepción por longitud. Nunca crear archivo descargable salvo que Miguel lo pida.
- Claude Code toca **solo frontend**; nunca el esquema de Supabase (regla dura). Verificar que exista el call-site en frontend antes de envolver un RPC. Verificar columnas/vistas EN VIVO antes de programar. `node --check` limpio; NO desplegar (Miguel corre `npx vercel --prod`). Actualizar REPORTE-FRONTEND.md.
- **Commit + push automático de documentación (regla permanente, autorizada de antemano):** al cierre de cada sesión, o cada vez que se actualice REPORTE-FRONTEND.md u otro `.md`, hacer `git add` + `git commit` + `git push` de esos archivos `.md` con un mensaje descriptivo — **sin pedir permiso**, ya autorizado por Miguel. Esto cubre SOLO documentación (`.md`); el código (`.js`/`.css`/`.html`) nunca se commitea/push sin que Miguel lo pida explícitamente en esa sesión.

## Prompts de continuación (7 secciones fijas)
(1) sesión/objetivo · (2) estado plan maestro (0→A→B→C→D→E→F) · (3) anclas numéricas al cierre · (4) infraestructura viva (vistas/RPCs/frontend) · (5) pendientes parqueados con dueño · (6) tarea de sesión · (7) protocolo. En un solo bloque de código autocontenido.

## Herramientas
- **Supabase MCP** (proyecto `wnjomlwevqaxbborikkq`): `execute_sql` (lecturas + DML/RPC), `apply_migration` (DDL).
- **Vercel:** deploy frontend `npx vercel --prod` desde `~/Desktop/erp-plein` (scope `mickyarambulas-projects`).
- **Google Drive** "Plein Produce Claude": V6 Samuel + FRX + V8 (CSVs: Cargas, Ingresos, Egresos, Chase, Traspasos, Nómina).
- **ClickUp:** workspace 9017829151; lista de Samuel 901714662602 (Cargas/Pedidos).
- ⚠️ `PLEIN_PRODUCE_LLC__2026_ACTUAL.xlsx` del proyecto **NO es fuente confiable** — nunca usarlo ni pedirlo.

## Seguridad de datos
Cada objeto nuevo (tabla/vista/función) → `REVOKE ALL` y luego `GRANT` explícito solo a `authenticated` donde aplique. `v_seguridad_anon` y `v_seguridad_escritura` = 0 filas tras cada sesión de DDL.

## Actualización E87 (estado)
E87 entregó tres cosas (todas money-neutral salvo pagos operativos de Miguel):
- **D-102** feature Anticipo a productor (RPC atómico `fn_anticipo_productor` ligado a proyecto + puerta en front) + fix zona horaria `hoyISO()` (UTC→local) en 6 archivos.
- **D-103** permisos de usuarios: rol nuevo **operacion** (ver+capturar+editar); samuel/juan/jose/fer→operacion; alta **PP05-FP Fer Palacios**; 3 RPCs admin (`fn_admin_*`, anti-lockout); panel `modulo-usuarios.js` (admin-only).
- **D-104** diagnóstico CxP: dos modelos (DIRECTO=asentado/Cuadre vs ATRIBUIDO=estimado/pantalla); vista nueva `v_cxp_detalle_proveedor_atribuido`; cajón CxP consistente. Sin dinero perdido.

**Permisos (recordatorio):** `usuarios_erp`+`roles_erp`; `fn_actor()` por JWT email (sin JWT→PP04-MA); crear embarque exige 'capturar'. **CxP dos modelos:** el DIRECTO alimenta el Cuadre; el ATRIBUIDO es estimado (pantalla). Ver NORTE.md.

**Siguiente (E88):** rediseño visual profesional del ERP + permisos GRANULARES (matriz usuario×capacidad y usuario×módulo). Parked: confirmar JPM vs banco, barrido CxC, AGROFEPAC consignación en CxP.

## Actualización E88 (permisos granulares + conciliación banco)
- **D-105 permisos GRANULARES** (backend+frontend, money-neutral): modelo 2 capas rol default + override por usuario, para capacidades Y módulos. Tablas modulos_erp/rol_modulos/usuario_capacidades/usuario_modulos (RLS on, sin grant a authenticated, solo RPCs definer). fn_usuario_puede centraliza; v_mi_perfil v2 trae array `modulos`; 5 RPCs fn_admin_* (gate administrar + anti-lockout). Frontend desplegado (menú dinámico + matriz por usuario). **REGLA NUEVA DURA: toda tabla nueva → ENABLE RLS** (o v_seguridad_auth la marca).
- **Conciliación V8↔ERP (arrancó E88):** el V8 es la ÚNICA fuente, al día de hoy. Programa por hojas. **PASO 1 BANCO CERRADO** (D-106/107/108): JPM = 7,297.29 = Chase V8 al centavo, 281 movs = 281 V8. Llave banco=folio, cargas=P.O. Siguiente: Paso 2 Cargas. Money-movers de conciliación en bloques GATE; NO forzar números que rompan el modelo bueno del ERP (consignación/comisión).

## Actualización E89–E95 (FRONTEND — rediseño "Operador estilo Silo") · SOLO FRONTEND, money-neutral
Detalle completo en **`SISTEMA-DISEÑO.md`** (dirección/tokens/componentes/plan) y **`REPORTE-FRONTEND.md`** (log fino por pantalla). Resumen:
- **E89** — dirección aprobada + **fundación**: `tokens.css` (variables claro/oscuro, aditivo, sin tocar el `:root` viejo) + toggle luna/sol con persistencia `localStorage('plein-theme')` + script anti-parpadeo. SIN Tailwind, SIN build.
- **E90–E95** — **6 pantallas vestidas** (una por sesión), cada una con su wrapper de SCOPE propio, CSS anidado bajo el scope, tokens, sin globales: Embarques (`.pantalla-embarques`), CxC (`.pantalla-cxc`), CxP (`.pantalla-cxp`), Tesorería (`.pantalla-tesoreria`), Inicio (`.pantalla-inicio`), Antigüedad (`.pantalla-antiguedad`). Fixes globales: `color-scheme` para inputs de fecha nativos; `.enlace`→`--brand` en cada scope; `tr.total` legible en oscuro.
- **Método probado (repetir):** verificar marcado en vivo → wrapper `.pantalla-XXX` → CSS anidado con especificidad extra → tokens, cero hex → drawers `#panelBody` fuera del scope → no inventar datos, reusar el componente que ya cumple el rol → verificar claro/oscuro + que otras pantallas no cambien (por color computado) → `node --check` → NO desplegar (Miguel) → actualizar REPORTE-FRONTEND.md.
- **Falta:** resto de pantallas de tablas (Finanzas, Directorio, Programas, Proyectos, etc.) y, **al final**, el **MARCO** (riel de íconos + barra de módulo + menú agrupado, respetando `ERP.perfil.modulos` de D-105) — antes de tocar el MARCO, mostrar a Miguel la propuesta de agrupación del menú para aprobar. Pendiente menor: `.pos/.neg` en Embarques/CxC/CxP aún no son theme-aware.
- **Regla dura frontend:** Claude Code solo frontend, nunca el esquema Supabase; verificar en vivo; `node --check` limpio; NO desplegar (lo hace Miguel).
