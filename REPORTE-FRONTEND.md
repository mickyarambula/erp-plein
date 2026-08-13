# REPORTE DE ESTADO DEL FRONTEND — ERP Plein

## 🟣 ACTUALIZACIÓN — 2026-08-06 (E98: Rediseño "Operador estilo Silo" de las 18 table screens — SESIÓN 1 DE 2+)

**Tarea:** Aplicar `.pantalla-XXX` scope + CSS tokenizado a las 18 "table screens" originales. Método: wrapper HTML con div.pantalla-XXX, remapear tokens viejos (--gris/--verde/--ambar/--rojo/--tinta/--lima → --i2/--brand/--amb/--red/--ink/--money), agregar bloque CSS scopeado en estilos.css bajo cada scope, node --check al terminar cada módulo. Omitir Órdenes de Venta (no existe).

**COMPLETADAS SESIÓN 1 (5 de 18):**
1. ✅ **Directorio Comercial** (`modulo-catalogos.js`) — scope `.pantalla-catalogos`, 6 token remappings, CSS con 35 reglas
2. ✅ **Programas** (`modulo-programas.js`) — scope `.pantalla-programas`, 4 token remappings, CSS con 15 reglas
3. ✅ **Proyectos** (`modulo-proyectos.js`) — scope `.pantalla-proyectos`, 3 token remappings, CSS con 15 reglas
4. ✅ **Cotizaciones y Órdenes de Compra** (`modulo-comercial.js`) — scope `.pantalla-comercial`, 2 token remappings, CSS con 20 reglas (pestaña dual, mismo scope)
5. ✅ **Lotes** (`modulo-lotes.js`) — scope `.pantalla-lotes`, 1 token remapping, CSS con 11 reglas

**FALTANTES SESIÓN 2 (13 de 18):**
6. Facturación (`modulo-facturas.js`)
7. Inventario (`modulo-inventario.js`)
8. Concentración de riesgo (`modulo-concentracion.js`)
9. Cierres Contables (`modulo-cierres.js`)
10. Liquidaciones al productor (`modulo-liquidaciones.js`)
11. Tareas (`modulo-tareas.js`)
12. Revisiones Pendientes (`modulo-flags.js`)
13. Datos faltantes (`modulo-datos-faltantes.js`)
14. Bitácora (`modulo-bitacora.js`)
15. Usuarios (`modulo-usuarios.js`)
16. ⊘ Órdenes de Venta — NO EXISTE (hueco conocido)

**Verificación estado actual:** `node --check` limpio en los 5 módulos completados. CSS sin errores de sintaxis. Próxima sesión: continuar con Facturación, aplicando el mismo patrón.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (MARCO "Operador estilo Silo" — riel + barra de módulo + menú agrupado, E97)

**Cambio GLOBAL de navegación** (el último paso mayor del rediseño, SISTEMA-DISENO §7/§9). Reemplaza
el header verde de ancho completo + lista plana de 25 módulos por el MARCO estilo Silo. Money-neutral,
solo presentación — la lógica de permisos D-105 queda intacta (ver abajo).

**Estructura nueva** (`#shell` pasó de `display:block` a `display:grid; grid-template-columns:66px 1fr`):
- **Riel de íconos (66px, `.icrail`)** — logo arriba, **un ícono por GRUPO** (7: Inicio, Oper., Dinero,
  Fin., Catál., Revis., Admin), grupo activo en verde (`color-mix brand 13%`), y el **toggle de tema
  abajo** (`.themebtn`, `margin-top:auto`). El botón de tema (`#btnTema`/`#icoTema`) SE MOVIÓ aquí desde
  el header viejo; su lógica en app.js (`alternarTema`/`pintarIconoTema`) no cambió.
- **Barra de módulo (52px, `.modbar`)** — hamburguesa móvil (`#btnMenu`) · **chip de grupo verde**
  (`#modChip` con `#modChipIco`/`#modChipTxt`) + separador + **miga de pan** con el módulo activo
  (`#modPg`); a la derecha (`.sp`): buscador universal (`#buscaUniv`/`#resultados`, reubicado aquí),
  presencia, estado, Actualizar, Salir, chip de perfil. Todos los IDs que tocan app.js/modulo-presencia
  se conservaron.
- **Menú lateral agrupado (`nav.lateral`)** — se mantiene el elemento `nav.lateral` con `a.item[data-modulo]`
  (para no romper el router ni el filtro de permisos), reorganizado en `.nav-grupo[data-grupo]` con
  **eyebrow** (`.nav-eyebrow`) por grupo. Ítem activo en verde. **Cero emojis**: cada módulo usa su ícono
  Tabler (`<i class="ti ti-… ico">`); los 7 íconos de grupo del riel también Tabler.

**Agrupación (exacta, aprobada por Miguel):** INICIO · OPERACIÓN (Embarques, Órdenes de compra, Órdenes de
venta, Lotes, Embarques físicos, Programas, Cotiz. y órdenes, Tareas) · DINERO (CxC, CxP, Tesorería,
Liquidaciones al productor, Antigüedad de saldos) · FINANZAS (Finanzas, Cierres, Proyectos, Concentración
de riesgo) · CATÁLOGOS (Directorio, Inventario, Facturación) · REVISIÓN (Revisiones pendientes, Datos
faltantes, Bitácora) · ADMIN (Usuarios).

**Permisos D-105 — intactos (solo se extendió la presentación):**
- `aplicarMenuDinamico()` sigue filtrando `a.item[data-modulo]` por `ERP.perfil.modulos` (misma regla de
  E88). Nuevo: `sincronizarGrupos()` oculta el **eyebrow del grupo Y su ícono en el riel** cuando el grupo
  se queda sin ningún ítem visible para ese usuario.
- `refrescarBadgeFaltantes()` conserva su doble regla (módulo permitido **y** contador>0) y ahora llama
  `sincronizarGrupos()` al terminar (por si REVISIÓN quedó vacío/no-vacío).
- Los mapas `moduloAGrupo`/`tituloDeModulo` se derivan del DOM del menú (DRY: la fuente de verdad sigue
  siendo el markup), no duplican la lista.
- **Router desacoplado:** `despachar()` en comun.js emite `window.dispatchEvent('erp:navegar', {modulo})`
  (1 línea nueva); app.js escucha y sincroniza riel activo + chip + miga. comun.js no conoce el MARCO.
- Clic en un ícono del riel → `irAGrupo()` navega al **primer módulo visible** de ese grupo (respeta permisos).

**Tokens/limpieza:** todo el CSS del MARCO usa solo tokens nuevos de `tokens.css` (cero hex sueltos). El
buscador y su dropdown de resultados se remapearon a tokens nuevos (antes usaban `--tarjeta`/`--linea`/
`--verde-claro` viejos → no eran theme-aware). Se eliminaron las reglas muertas `header.top`, `.top-derecha`,
`header.top .marca`, `.btn-tema` (ya no existen en el markup).

**Verificado en navegador** (harness generado transformando el `index.html` REAL — mismo markup del MARCO,
mismos `estilos.css`/`app.js`/`comun.js`/módulos reales; Supabase mockeado, perfil conmutable):
1. **Permisos, 2 perfiles.** Admin (`modulos`=25): 7 grupos + 7 íconos de riel; 24 ítems visibles (faltantes
   oculto por contador=0, correcto). Operación (`modulos`=14: Inicio+OPERACIÓN+DINERO): **solo** 3 grupos y
   3 íconos de riel; FINANZAS/CATÁLOGOS/REVISIÓN/ADMIN ocultos en menú **y** riel; 14 ítems exactos. Confirmado
   por estado computado (no a ojo) y por captura.
2. **Sync de navegación.** Al ir a cada módulo, riel-grupo activo + ítem activo + chip + miga se actualizan
   (ej. `#/cargas` → riel `operacion`, chip "Operación" ti-package, miga "Embarques").
3. **Las 7 pantallas vestidas** (Embarques/CxC/CxP/Tesorería/Inicio/Antigüedad/Finanzas) renderizan su
   wrapper de scope (`.pantalla-*` presente) DENTRO del MARCO, sin romperse.
4. **Los 18 módulos sin vestir** (25−7) renderizan su contenido dentro del MARCO (piel vieja, esperado),
   sin errbox, con la miga de grupo correcta.
5. **Tema** claro y oscuro: capturas OK; toggle desde el riel alterna `data-theme` + ícono + `localStorage`.
6. **Móvil**: la hamburguesa (`#btnMenu`) sigue abriendo/cerrando el cajón (`alternarMenu`/`cerrarMenu`).
7. Cero errores de consola en las 25 navegaciones (ambos perfiles).

**Archivos tocados:** `index.html` (shell reescrito: riel + barra de módulo + menú agrupado), `estilos.css`
(bloque MARCO: `.icrail`/`.modbar`/`nav.lateral` agrupado + buscador/resultados remapeados + responsive
actualizado; reglas muertas del header viejo eliminadas), `app.js` (`aplicarMenuDinamico` extendido,
`sincronizarGrupos`/`sincronizarMarco`/`irAGrupo` nuevas, mapas grupo/título, wiring riel + `erp:navegar`),
`comun.js` (1 línea: emitir `erp:navegar` en `despachar`). `node --check` limpio en `app.js` y `comun.js`.
NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Finanzas — séptima propagación "Operador estilo Silo", E96)

**SCOPE nuevo = `.pantalla-finanzas`** — mismo patrón que las 6 pantallas anteriores.
`modulo-finanzas.js` tampoco tenía wrapper propio. Es el módulo más grande vestido hasta ahora
(614 líneas, 12 secciones: Estado de resultados, Balance general, Posición de caja, Márgenes por
cliente/producto, Margen por caja, Concentración de cartera, Presupuesto vs real, Flujo de caja
semanal, Antigüedad CxC, CxP próximas, Días de pago, Rentabilidad por embarque) pero **ninguna
sección introdujo un componente nuevo** — todas reusan clases ya scopeadas en pantallas previas.
`verMes()`/`verGastos()` (drill-down por mes, panel/drawer global `#panelBody`) quedan fuera del
wrapper, misma frontera de siempre. Sin pastillas de modalidad (`.pill.m/.g/.c`): verificado por
grep que el módulo no las genera — nada que construir ahí.

**Componentes reusados (todos ya scopeados en E90–E95, aquí solo replicados bajo `.pantalla-finanzas`):**
- Tablas densas — misma receta en las 12 secciones (una sola declaración de `table`/`thead th`/
  `tbody td`/`tr:hover`/`tr.total` cubre todo el módulo).
- `.fila-utilidad`/`.fila-margen` (cascada del P&L) — compartidas con Inicio (E94).
- `.pmargen` (Márgenes + Rentabilidad) — reemplaza `ERP.semaforo()` SOLO en este archivo, mismo
  patrón que Embarques (E90); `semaforo` se quitó del destructure por quedar sin uso.
- `.barra`/`.fill` (Concentración de cartera) — compartidas con CxC (E91).
- `tr.vencido-alto`/`.venc-si`/`.venc-no`/`.venc-hoy` (Antigüedad CxC, CxP próximas) — compartidas
  con CxC/Antigüedad/CxP.
- `.badge-estado` + variantes (Antigüedad CxC, CxP próximas, vía `ERP.badgeEstado()`).
- `.pill.rojo`/`.ambar`/`.gris` (pastilla de gap en Días de pago, vía `gapClaseFin()`).
- `td.ent` (nueva SOLO en el sentido de que este módulo no la tenía — la clase ya existía desde
  Antigüedad) — agregada a 7 celdas de cliente/producto en 5 secciones distintas.
- `.mini-bar`/`.mini-fill`/`.mini-fill.neg` (Flujo de caja semanal) — único componente exclusivo
  de este módulo (nadie más lo usa), igual se scopeó (nunca global, regla dura).

**Remapeos explícitos pedidos por la tarea:** `.enlace`→`--brand` y `.pos`/`.neg`→`--money`/`--red`
dentro del scope, ya theme-aware desde el día 1 (a diferencia del pendiente menor que quedó
anotado en Embarques/CxC/CxP desde E90-E92). Nota: `.enlace` no lo genera ninguna función
en-scope de este archivo (solo `verMes()`, el drawer, fuera de scope) — se dejó el remapeo de
todos modos, preventivo, mismo criterio que en Inicio (E94).

**Limpieza encontrada y corregida (verificado por grep exhaustivo, no solo lectura):**
- **2 colores hex sueltos** (nunca antes vistos en las 6 pantallas previas): la barra de "Balance
  cuadrado"/"DESCUADRE" tenía `background:'#e4efe7'`/`'#fbe4e4'` literal; `pintarConcentracion()`
  tenía `'#C98A2D'`/`'#1E5B3A'` literal mezclados con `var(--rojo)`. Ambos remapeados a los 3
  tokens semánticos (`--gtint`/`--red-bg` y `--money`/`--amb`/`--red` respectivamente).
- **3 emojis**: `✅ Balance cuadrado` / `⚠️ DESCUADRE...` (barra de cuadre) → íconos Tabler
  `ti-circle-check-filled`/`ti-alert-triangle-filled`; `Sin partidas pendientes ✅` → mismo ícono
  de check; leyenda de Rentabilidad (`🟢🟡🔴`) → 3 `.pmargen` con puntos de color, mismo texto que
  Embarques (E90).
- **13 usos de tokens viejos como inline style** (`var(--gris)`, `var(--verde)`, `var(--rojo)`,
  `var(--linea)`, `var(--rojo-bg)`) repartidos en Posición de caja, Balance (partidas + notas ⓘ),
  Margen por caja (celdas "dato ausente"), Antigüedad CxC/CxP (sub-línea de PO) y el callout de
  Días de pago — todos remapeados a los tokens nuevos (`--i2`/`--money`/`--red`/`--bd`/`--red-bg`)
  directamente en el JS, porque un estilo inline le gana a cualquier CSS por especificidad y no
  se puede arreglar solo desde el scope.

**Verificado en navegador con datos reales** (fixture cubriendo las 12 secciones: 2 meses de P&L,
balance cuadrado, posición neta positiva, 2 clientes/1 producto en márgenes, 3 clientes en
concentración —uno por cada tramo de color—, flujo semanal con una semana negativa, antigüedad
CxC con una fila `vencido-alto`, callout de días de pago, y rentabilidad con margen alto/bajo):
- Claro y oscuro: cascada del P&L con filas de utilidad resaltadas, barra de "Balance cuadrado"
  con ícono y tinte verde, "Posición neta" en verde, concentración con los 3 colores exactos
  (rojo 76%, ámbar 30%, verde 20%), mini-barras de flujo semanal (verde/rojo), fila `vencido-alto`
  en Antigüedad CxC legible, callout de días de pago en rojo, puntos de margen verde/rojo en
  Rentabilidad — todo confirmado por captura.
- **Scoping confirmado numéricamente** en las 4 pantallas relevantes: `.pantalla-finanzas .card`,
  `.pantalla-embarques .kpi`, `.pantalla-cxc .kpi`, `.pantalla-tesoreria .kpi` → los 4
  `rgb(21,27,23)` (`--pan` oscuro). Cero errores de consola en las 5 pantallas, claro y oscuro.

**Nota aparte (hallazgo de higiene, no de este módulo):** al preparar el harness de prueba se
encontró una colisión de nombres en el archivo de pruebas de la sesión (dos fixtures llamadas
`FIX_CXC_AGING` de tareas distintas, E91 y E96) que además dejaba muerta una ruta de fixture más
completa de E95 (`v_cxc_aging_resumen` apuntando primero al fixture viejo de E91). Es un problema
del archivo de pruebas de esta sesión (`/private/tmp/.../test-embarques.html`), **no del código de
producción** — se corrigió en el harness; no afecta nada de lo ya entregado en E90-E95.

**Pendiente anotado (no se tocó, fuera del alcance de esta tarea):** `SISTEMA-DISENO.md` (§9/§12)
todavía lista a Finanzas como pantalla pendiente — la tarea pidió actualizar solo
`REPORTE-FRONTEND.md`, así que ese documento no se tocó; queda para quien lleve el tracking
general actualizarlo cuando convenga.

**Archivos tocados:** `modulo-finanzas.js` (wrapper `.pantalla-finanzas`, `puntoMargen()` nueva,
2 hex + 3 emojis + 13 inline-styles con tokens viejos corregidos, clase `.ent` en 7 celdas),
`estilos.css` (bloque nuevo `.pantalla-finanzas` al final del archivo). `node --check` limpio en
los 7 módulos con scope activo (`modulo-finanzas.js`, `modulo-antiguedad.js`, `modulo-inicio.js`,
`modulo-cargas.js`, `modulo-cobranza.js`, `modulo-pagos.js`, `modulo-tesoreria.js`). NO
desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Antigüedad de saldos — sexta propagación "Operador estilo Silo", E95)

**SCOPE nuevo = `.pantalla-antiguedad`** — mismo patrón que las 5 pantallas anteriores.
`modulo-antiguedad.js` tampoco tenía wrapper propio. `.pestanas`/`.pestana` se comparten con
Directorio Comercial, Expediente y Cotiz./órdenes — remapeadas SOLO aquí, sin tocar la regla
global (se mantuvo el componente de pestaña SUBRAYADA tal cual, no se cambió a `.chip`, porque es
el componente real de este módulo). `.barra`/`.fill` se comparten con CxC (ya scopeados ahí en
E91). `verDetalle()` (drill-down por contraparte) abre en el panel/drawer global `#panelBody` y
queda FUERA del wrapper, misma frontera de siempre.

**Decisión clave — `.aging-hero`/`.ah-*` NO se reemplazó por un `.kpistrip` paralelo:** esta
sección (Saldo total / Cartera vencida / Por vencer) ya es, en los hechos, la tira de KPIs propia
del módulo — no la comparte nadie más. Se mantuvo con sus clases originales y solo se remapeó
color (mismo criterio que `.tarjeta` en Inicio, E94, y `select.busca` en CxP, E92): reusar lo que
ya existe en vez de duplicar el componente.

**Componentes instalados:**
- **Pestañas** (`Cobranza (CxC)` / `Pagos (CxP)`) — subrayado en `--i2`/hover `--ink`/activa
  `--brand`, en vez de gris/verde viejos.
- **Tira de KPIs propia** (`.aging-hero`): Saldo total en `--ink` (neutral, igual que el diseño
  original no le daba color propio), Cartera vencida en `--red` con acento izquierdo rojo, Por
  vencer en `--money` con acento izquierdo verde.
- **Barras de distribución por días vencidos**: `colorBucket()` pasó de 4 hex fijos
  (`#1E5B3A`/`#5F8C3E`/`#C98A2D`/`#B3402E`) a 3 tokens semánticos (`var(--money)`/`var(--amb)`/
  `var(--red)`) — misma simplificación deliberada que en CxC (E91): 31-60 y 61-90 comparten
  ámbar, el set de tokens no trae un 4º matiz. Fondo de la barra a `--hair`.
- **Tabla "Detalle por cliente/proveedor"** — misma receta densa que las 5 pantallas anteriores,
  `tr.total td` con el fix de E91. Nombre de contraparte → `td.ent` (nueva, ink peso 500) — clase
  unificada porque el módulo alterna entre cliente/proveedor según la pestaña, no tenía sentido
  forzar `.cliente` o `.prov` de otras pantallas.
- **Fila "más de la mitad vencido"** (`tr.vencido-alto`) — antes fondo rojo claro fijo y nombre en
  rojo estático; remapeado a `var(--red-bg)`/`var(--red)`, confirmado legible en oscuro (antes se
  hubiera perdido contra el panel oscuro nuevo).
- **Pastillas** (`.pill.gris`/`.pill.ambar`/`.pill.rojo`, "en revisión"/bucket) y **`.pos`/`.neg`**
  — mismo remapeo de siempre.
- **`.enlace`** dentro del scope → `var(--brand)` (Fix B de E93) — con cuidado de que
  `tr.vencido-alto .enlace` (mayor especificidad, rojo) siga ganando donde debe.
- **Cero emojis**: `⚠` del bucket 90+ → `ti-alert-triangle-filled` en rojo (mismo fix que CxC,
  E91). `⚑` dentro de `verDetalle()` (drawer global) se dejó igual, fuera de scope.

**Verificado en navegador con datos reales** (fixture CxC con 4 buckets incluido 90+, 2 clientes
—uno con 76% vencido para probar `vencido-alto`— y la pestaña CxP con datos vacíos para confirmar
que el estado "Sin saldos pendientes" no rompe nada):
- Claro y oscuro: pestaña activa en verde con subrayado, KPIs con acentos correctos, barras
  verde/ámbar/ámbar/rojo con ícono de alerta en 90+, fila `vencido-alto` con fondo rojo tenue y
  nombre en rojo legible en ambos modos, "Total" del pie de tabla legible en oscuro.
- **Scoping confirmado numéricamente** en las 4 pantallas vestidas: `.pantalla-antiguedad
  .aging-hero>div`, `.pantalla-inicio .tarjeta`, `.pantalla-cxc .kpi`, `.pantalla-tesoreria .kpi`
  → los 4 `rgb(21,27,23)` (`--pan` oscuro). Cero errores de consola en las 5 pantallas, claro y
  oscuro.

**Archivos tocados:** `modulo-antiguedad.js` (wrapper `.pantalla-antiguedad`, `colorBucket()`
remapeada a tokens, ⚠→ícono Tabler, clase `.ent` nueva en la celda de contraparte), `estilos.css`
(bloque nuevo `.pantalla-antiguedad` al final del archivo). `node --check` limpio en los 6
módulos con scope activo (`modulo-antiguedad.js`, `modulo-inicio.js`, `modulo-cargas.js`,
`modulo-cobranza.js`, `modulo-pagos.js`, `modulo-tesoreria.js`). NO desplegado — pendiente de
`npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Inicio — quinta propagación "Operador estilo Silo", E94)

**SCOPE nuevo = `.pantalla-inicio`** — mismo patrón que las 4 pantallas anteriores.
`modulo-inicio.js` tampoco tenía wrapper propio. `.hoy-card`/`.hoy-*` se comparten con la agenda
de Embarques (ya scopeada bajo `.pantalla-embarques` en E90) y `.fila-utilidad`/`.fila-margen` se
comparten con `modulo-finanzas.js` — remapeadas SOLO aquí, sin tocar esas reglas globales.

**Decisión clave — NO se introdujo un `.kpistrip` paralelo:** `.tarjetas`/`.tarjeta` (las 6
tarjetas grandes clicables: JPM, CxC, CxP, Flags, Utilidad neta, Cargas activas) YA cumplen el
rol de tira de KPIs — son más grandes, clicables, con acento de color y "→" — construir un
`.kpistrip` aparte habría sido un segundo componente haciendo el mismo trabajo. Se re-vistió
`.tarjeta` con los tokens nuevos en su lugar. Para el lenguaje "verde=dinero / ink=neutro" que sí
pedía la tarea, se agregó un modificador nuevo `.tarjeta.ink` (aplicado a "Flags activas" cuando
no hay alerta y "Cargas activas" — las 2 tarjetas que NO son montos en dólares) — 2 líneas de JS,
mismo lenguaje visual que las tiras de KPI de Embarques/CxC/CxP/Tesorería sin duplicar el
componente.

**Componentes instalados:**
- **`.tarjeta`**: fondo `--pan`/borde `--bd`; barra de acento izquierda `--money` por default,
  `--amb` en `.alerta`, `--red` en `.neg`; valor en `--money` por default, `--ink` con el nuevo
  `.tarjeta.ink`, `--red` con `.neg`; label/sub en `--i2`; flecha "→" en `--i3` (hover `--brand`).
- **Panel "Hoy"** (`.hoy-*`) — mismo trato que las agenda-cards de Embarques (E93: color
  explícito en vez de heredado), MÁS las clases propias de Inicio que Embarques no usa:
  `.hoy-conteo`, `.hoy-card-monto` (con variantes `sev-roja`/`sev-ambar`), `.hoy-card-ref`,
  `.hoy-info>summary` (el "Ver informativas") y `.hoy-vacio` (estado sin alertas).
- **Tabla densa** (cascada de resultados + Posición) — misma receta que las 4 pantallas
  anteriores; `tr.total td` con el fix de E91 (antes casi ilegible en oscuro, confirmado en
  captura: "Posición neta" ahora legible).
- **Cascada de resultados**: `tr.fila-utilidad` (filas resaltadas: Utilidad bruta/operación/neta)
  pasó de `background:var(--verde-claro)` fijo a `var(--gtint)`; `tr.fila-margen` (Margen
  bruto/neto, cursiva) de `var(--gris)`/`var(--linea)` a `var(--i2)`/`var(--bd)`.
- **`.pos`/`.neg`** (sección Posición y cascada) y **`.pill.gris`** ("préstamo de socio") —
  remapeados a tokens, mismo patrón que las 4 pantallas anteriores.
- **`.enlace`** — agregado preventivamente (`color:var(--brand)`) aunque hoy no se usa dentro de
  Inicio; mismo Fix B de E93, por si se usa más adelante.
- **Cero emojis**: ✅ ("Todo en orden") → ícono Tabler `ti-circle-check-filled`. 🎉 ("Nada
  pendiente 🎉") — este iba dentro del `sub` de una tarjeta, que pasa por `esc()` (cualquier
  `<i class="ti-...">` se habría escapado como texto literal, no renderizado como ícono); se
  quitó el emoji y se reescribió el texto ("todo resuelto") en vez de forzar un ícono roto.
  `⌘K` (atajo de teclado) se dejó igual — no es un emoji decorativo, es notación funcional.

**Verificado en navegador con datos reales** (fixture con panel Hoy de 3 severidades, 6
tarjetas, 2 meses de estado de resultados, y posición neta negativa):
- Claro y oscuro: panel Hoy con acentos rojo/ámbar legibles, tarjetas con acento money/ámbar y
  texto ink/money correctos, cascada con filas de utilidad resaltadas y negativos en rojo,
  "Posición neta" (tr.total) legible en oscuro.
- **Scoping confirmado numéricamente** en las 4 pantallas vestidas: `.pantalla-inicio .tarjeta`,
  `.pantalla-embarques .kpi`, `.pantalla-cxc .kpi`, `.pantalla-tesoreria .kpi` → los 4
  `rgb(21,27,23)` (`--pan` oscuro). Cero errores de consola en las 5 pantallas, claro y oscuro.

**Archivos tocados:** `modulo-inicio.js` (wrapper `.pantalla-inicio`, 2 tarjetas con
`clase:'ink'` nueva, ✅→ícono Tabler, 🎉 quitado y texto reescrito), `estilos.css` (bloque nuevo
`.pantalla-inicio` al final del archivo). `node --check` limpio en los 5 módulos con scope activo
(`modulo-inicio.js`, `modulo-cargas.js`, `modulo-cobranza.js`, `modulo-pagos.js`,
`modulo-tesoreria.js`). NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Pulido de modo oscuro + Tesorería — cuarta propagación "Operador estilo Silo", E93)

### Parte 1 — 2 fixes de modo oscuro (afectan varias pantallas)

**Fix A — controles de fecha nativos:** `tokens.css` ahora declara `color-scheme: light` en `:root`
y `color-scheme: dark` en `[data-theme="dark"]` (1 línea por bloque, nada más tocado). Arregla
date pickers/scrollbars nativos sin estilo propio en TODA la app. **Hallazgo en vivo:** para los
2 `<input type="date">` del rango de Embarques (`#rangoDesde`/`#rangoHasta`), `color-scheme` NO
bastaba — `.filtros-rango input[type="date"]` (única usuaria: `modulo-cargas.js`) ya traía un
`background:var(--tarjeta)` explícito (token viejo, estático) que le ganaba al render nativo por
especificidad de CSS de toda la vida, no por un problema de `color-scheme`. Verificado en un
archivo de prueba aislado (sin ninguna otra CSS) que `color-scheme` solo SÍ pinta un input de
fecha sin estilo propio de oscuro correctamente — confirma que el mecanismo funciona y que el
problema era el `background` explícito compitiendo. Se agregó
`.pantalla-embarques .filtros-rango input[type="date"]{background:var(--pan);border-color:var(--bd);color:var(--ink)}`
(y de paso `.chip-rango`/`.chip-rango-x`, mismo grupo visual, mismo problema) — scopeado, no se
tocó la regla global.

**Fix B — nombres de cliente/proveedor:** `.enlace` es GLOBAL (toda la app la usa) y trae
`color:var(--verde)` — token viejo, estático, casi ilegible sobre fondo oscuro. Se agregó,
SIN tocar la clase global:
```css
.pantalla-embarques .enlace, .pantalla-cxc .enlace, .pantalla-cxp .enlace{color:var(--brand)}
```

### Parte 2 — Tesorería, cuarta propagación

**SCOPE nuevo = `.pantalla-tesoreria`** — mismo patrón que las 3 pantallas anteriores.
`modulo-tesoreria.js` tampoco tenía wrapper propio. Incluye también "Estado de cuenta" e
"Historial de cambios" (no nombradas explícitamente en la tarea pero SÍ dentro de `render()`,
así que heredan el trato genérico de tabla/card/chip/botón, igual que las secciones secundarias
de CxC/CxP). Los paneles de edición de movimiento (`formAplicarHtml`, `pintarBitacora` singular
— distinta de `pintarBitacoraGeneral` — y `cuerpoHistorial`, las 3 abren en `#panelBody` global)
quedan FUERA del wrapper, misma frontera de siempre.

**Componentes instalados:**
- **Tira de KPIs** (1 tarjeta): "Saldo total (cuentas reales)" — el ejemplo EXACTO que daba la
  tarea, ya lo calculaba `pintarCuentas()` para su `<tfoot>` (excluye JEAMS/virtual, que es el
  préstamo de socio, no efectivo real). `totalCuentasReales()` nueva, evita duplicar la lógica.
- **Tablas densas** (Saldo por cuenta, Flujo mensual, Estado de cuenta, Historial de cambios) —
  misma receta que las 3 pantallas anteriores, `tr.total td` con el fix de E91.
- **`td.cuenta`** (nueva, ink peso 500) en el nombre de cuenta — mismo patrón que `.cliente`/`.prov`.
- **`.pos`/`.neg`** (clases GLOBALES, verde/rojo viejos y estáticos) remapeadas a
  `var(--money)`/`var(--red)` dentro del scope — usadas en saldo negativo, columna Neto de Flujo
  mensual, egresos del Estado de cuenta. **Hallazgo transparente, fuera de alcance de esta
  tarea:** `.pos`/`.neg` NO se habían remapeado en Embarques/CxC/CxP (E90–E92) — son legibles
  pero no theme-aware ahí. La tarea de hoy solo nombró 2 fixes específicos (A y B); no se tocaron
  las 3 pantallas anteriores para no exceder lo pedido. Queda anotado por si se quiere un pase
  de seguimiento.
- **Gráfica de flujo semanal** (`.fb.in`/`.fb.out`/`.fneto`/`.fsem`) — ingresos `var(--money)`,
  egresos `var(--i3)` (antes `#C9C6B8` hex suelto), neto positivo/negativo
  `var(--money)`/`var(--red)`, eje semanal `var(--i2)`.
- **Pills "virtual"** (JEAMS/SAMUEL) y **"ANULADO"** — remapeadas a tokens (`.pill.gris`/`.pill.rojo`).
- **Chips** (selector de cuenta + "Ver todo el historial"/"Últimos 90 días" en Estado de cuenta)
  — mismo look de pestaña que Embarques.
- **Botones**: `+ Movimiento` (sin modificador) = primario negro; `+ Registrar gasto` y
  `+ Anticipo a productor` (`.gris`) = fantasma con borde — el módulo ya los distinguía así,
  solo se remapeó el color.
- **Folios "Aplicado a"** (`.chip-folio`, tags mono) y **"sin carga"** — remapeados (antes verde
  claro/verde oscuro estáticos, ilegibles en oscuro).
- **Cero emojis**: 🕘 (indicador "editado", Historial) → `ti-history`. 5 inline
  `style="color:var(--gris)"` dentro de secciones en-scope (fila JEAMS/SAMUEL, descripción
  vacía, nota "neto del periodo", antes/después en Historial general) → `var(--i2)`. Las 3
  copias de ese mismo patrón dentro de paneles/drawers globales (`formAplicarHtml`,
  `pintarBitacora`, `cuerpoHistorial`) se dejaron igual — fuera de scope, misma frontera de
  siempre.

**Verificado en navegador con datos reales** (fixture con 3 cuentas incl. 2 virtuales, flujo
semanal con semanas positivas/negativas/cero, flujo mensual, y un movimiento con historial de
edición):
- Claro y oscuro: KPI, tabla de cuentas con JEAMS en rojo, gráfica con barras verde/gris y neto
  rojo/verde correcto, chips, botones primario/fantasma, folio "601" del Historial en verde
  brillante (Fix B) y los inputs de fecha del Estado de cuenta oscuros y legibles.
- **Los 2 fixes de Parte 1 confirmados en las pantallas que los originaron:** date-range de
  Embarques con fondo `rgb(21,27,23)` (`--pan` oscuro, antes blanco fijo) computado Y visual;
  `.enlace` en CxC y CxP con `color:rgb(95,178,85)` (`--brand` oscuro) en vez del verde oscuro
  viejo — capturas de pantalla confirmando legibilidad en las 3.
- **Scoping confirmado numéricamente** en las 4 pantallas vestidas + Inicio: `.pantalla-tesoreria
  .kpi`, `.pantalla-embarques .kpi`, `.pantalla-cxc .kpi` → los 3 `rgb(21,27,23)` (`--pan`
  oscuro); `#app .card` en **Inicio** → `rgb(255,255,255)` (`--tarjeta` viejo, sin cambios).
  Cero errores de consola en las 5 pantallas, claro y oscuro.

**Archivos tocados:** `tokens.css` (Fix A, 2 líneas), `modulo-tesoreria.js` (wrapper
`.pantalla-tesoreria`, `totalCuentasReales()` nueva, KPI strip inline, clase `.cuenta`, 🕘→ícono
Tabler, 5 inline `var(--gris)`→`var(--i2)`), `estilos.css` (Fix B + complemento de Fix A para
`.filtros-rango`/`.chip-rango` + bloque nuevo `.pantalla-tesoreria`). `node --check` limpio en
`modulo-tesoreria.js`. NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Cuentas por Pagar — tercera propagación "Operador estilo Silo", E92)

**SCOPE nuevo = `.pantalla-cxp`** — mismo patrón que `.pantalla-embarques` (E90) y `.pantalla-cxc`
(E91): `modulo-pagos.js` tampoco tenía wrapper propio, se creó envolviendo TODO lo que pinta
`render()`. `verProveedor()` (drill-down por proveedor) abre en el panel/drawer global
`#panelBody`, compartido por toda la app, y se dejó FUERA del wrapper — misma frontera de
siempre (ficha de carga en Embarques, drill-down de cliente en CxC).

**Mapeo real verificado antes de tocar nada:** 3 secciones — "Saldo por proveedor" (modelo
**ATRIBUIDO**, `v_cxp_proveedor_atribuido`), "Próximos vencimientos" (modelo **DIRECTO**,
`v_cxp_proximas`, columna `saldo_cxp`) y "CxP por lote" (`v_cxp_lote`, agrupable por proveedor o
por lote vía un `<select>` que no tenía NINGÚN estilo global — `<select class="busca">` sin
`<input>` ni ancestro `.filtros`, así que la única regla existente para `.busca` no lo alcanzaba).
Sin chips/filtros (como CxP no tiene, igual que CxC). **No se tocó la lógica de atribución en
ningún momento** — solo presentación.

**Decisión clave — la tira de KPIs NO mezcla los dos modelos:** "Total por pagar" (única
tarjeta) sale del modelo ATRIBUIDO, el mismo total que ya arma el `<tfoot>` de "Saldo por
proveedor" (`totalPorPagar()`, función nueva que reutiliza la resolución defensiva de columna
de `pintarProveedores()` sin duplicar lógica). El total de "Próximos vencimientos" (modelo
DIRECTO) **es un número distinto** (verificado con datos de prueba: $11,051.00 atribuido vs.
$11,551.00 directo, en la misma pantalla) — mezclarlos en una sola tira de KPIs habría sido
confuso y habría difuminado la distinción atribuido/directo que el propio módulo ya cuida con
cuidado (nota `NOTA_ESTIMADO` + tooltip ⓘ). Por eso la tira quedó en 1 sola tarjeta, tal como
permitía la tarea ("si solo hay un total, una sola tarjeta está bien").

**Componentes instalados:**
- **Tira de KPIs** (nueva, 1 tarjeta: Total por pagar).
- **3 tablas densas** (Saldo por proveedor, Próximos vencimientos, CxP por lote en sus 2 vistas)
  — misma receta que Embarques/CxC (`thead th`/`tbody td`/`tr:hover`), aplicada una sola vez al
  `<table>` genérico del scope.
- **`td.prov`** (nueva, ink peso 500) agregada en las 4 celdas de nombre de proveedor del
  archivo (lista principal, próximos vencimientos, y las 2 vistas de CxP por lote) — mismo
  patrón que `.cliente` en CxC.
- **Situación de vencimiento** (`.venc-si`/`.venc-no`/`.venc-hoy`, del helper compartido
  `ERP.venc()` — **también lo usa `modulo-finanzas.js`**, remapeado SOLO bajo `.pantalla-cxp` sin
  tocar la regla global) — rojo/verde/ámbar de tokens en vez de los viejos `--rojo`/`--verde`/`--ambar`.
- **Botón "+ pago"** (`.btn-cap`) — mismo trato fantasma-con-borde que "+ cobro" en CxC.
- **Select de agrupación** (`select.busca` en "CxP por lote") — estilo nuevo completo (no
  chocaba con nada, no tenía estilo previo).
- **`tr.total td`** — el fix de E91 (fondo `--hair` + texto `--ink`, antes `var(--papel)` fijo e
  ilegible en oscuro) replicado aquí; con 3 tablas en esta pantalla era el bug con más superficie
  de las 3 propagaciones — confirmado legible en las 3 en captura oscura.
- **`h2.sec`** (3 encabezados de sección) — mismo remapeo ink/bd que CxC.
- **Nota de estimación** (ⓘ, tooltip compartido con el cajón de detalle) — el `color:var(--gris)`
  inline de la copia que vive en la lista principal (dentro del scope) se cambió a
  `var(--i2)`; la copia idéntica dentro de `verProveedor()` (drawer global, fuera del scope) se
  dejó igual a propósito.
- **Cero emojis**: no había ninguno en este archivo (verificado por grep) — nada que cambiar ahí.

**Verificado en navegador con datos reales** (fixture con 2 proveedores con saldo + 1 en cero,
3 vencimientos con las 3 situaciones — vencida/por vencer/hoy — y 2 lotes):
- Claro y oscuro: KPI, 3 tablas, situación de vencimiento con los 3 colores correctos, select de
  agrupación legible, y los 3 pies "Total" confirmados legibles en oscuro (antes casi blancos).
- **Scoping confirmado numéricamente** en las 5 pantallas relevantes de una sola pasada:
  `.pantalla-cxp .kpi`, `.pantalla-embarques .kpi` y `.pantalla-cxc .kpi` → los 3
  `rgb(21,27,23)` (`--pan` oscuro); `#app .card` en **Inicio** y **Tesorería** → los 2
  `rgb(255,255,255)` (`--tarjeta` viejo, estático, sin cambios). Cero errores de consola en las 5
  pantallas, claro y oscuro.

**Archivos tocados:** `modulo-pagos.js` (wrapper `.pantalla-cxp`, `totalPorPagar()` nueva, KPI
strip inline en `render()`, clase `.prov` en 4 celdas, `color:var(--gris)`→`var(--i2)` en el
ⓘ de la lista principal), `estilos.css` (bloque nuevo `.pantalla-cxp` al final del archivo).
`node --check` limpio en `modulo-pagos.js`, `modulo-cobranza.js` y `modulo-cargas.js` (los 3
módulos con scopes activos). NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Cuentas por Cobrar — segunda propagación "Operador estilo Silo" + fix de agenda en Embarques, E91)

**SCOPE nuevo = `.pantalla-cxc`** — mismo patrón que `.pantalla-embarques` (E90): `modulo-cobranza.js`
no tenía wrapper propio (escribía directo a `cont`/`#modContenido` genérico), se creó envolviendo
TODO lo que pinta `render()`. El drill-down `verCliente()` abre en el panel/drawer global
`#panelBody` (compartido por toda la app) y se dejó FUERA del wrapper — misma frontera que la
ficha de carga en Embarques.

**Mapeo real verificado antes de tocar nada:** Cuentas por Cobrar hoy son 3 tarjetas apiladas
("Saldo por cliente" tabla, "Antigüedad de cartera" con barras `.barra`/`.fill`, "Rotación de
cobranza (DSO)" tabla) — **sin ningún chip/filtro** (a diferencia de Embarques). No se inventó
ninguna barra de filtros nueva; se resolvió únicamente lo que ya existe.

**Componentes instalados:**
- **Tira de KPIs** (nueva, 3 tarjetas — no las 5-6 de Embarques, "SOLO los que el módulo ya
  tenga"): **Por cobrar** (`total`, ya lo calculaba el `<tfoot>`), **Vencido** (Σ `saldo_vencido`
  de `v_cxc_aging_resumen` — la MISMA suma que `pintarAging()` ya hacía internamente para su
  leyenda, recalculada una vez más en `render()` sobre el mismo `aging` ya traído, sin fetch
  nuevo, porque `pintarAging()` no la exponía hacia afuera), **Al corriente** (`total − vencido`,
  aritmética sobre datos ya presentes, no un dato nuevo del backend).
- **Tablas densas** (Saldo por cliente + DSO, mismo `<table>` genérico en las dos) — idéntica
  receta que Embarques (`thead th`/`tbody td`/`tr:hover`); ninguna de las dos tenía estilo global
  de celda antes de esto. Nombre de cliente → `td.cliente` (clase nueva, ink peso 500).
- **Barras de antigüedad**: la función `color(bucket)` pasó de 4 tonos hex fijos
  (`#1E5B3A`/`#5F8C3E`/`#C98A2D`/`#B3402E`) a **3 tokens semánticos** (`var(--money)`/`var(--amb)`/
  `var(--red)`) — el set de `tokens.css` no trae un 4º matiz, así que 31-60 y 61-90 comparten
  ámbar; simplificación deliberada, documentada en el propio código. Fondo de la barra
  (`.barra`) remapeado de `var(--verde-claro)` a `var(--hair)`.
- **Semáforo de antigüedad en DSO**: la columna "Antigüedad" ya coloreaba por umbral (≥90/≥60)
  con `var(--rojo)`/`var(--ambar)` (tokens viejos) — remapeado a `var(--red)`/`var(--amb)`, misma
  lógica de umbrales, sin tocar `comun.js`.
- **Botón "+ cobro"** (`.btn-cap`, compartido con Pagos) — remapeado a fantasma con borde
  (`var(--pan)`/`var(--bd)`) en vez de la pastilla verde vieja, solo dentro del scope.
- **Botones de exportar** (`.btn-mini.gris`, mismo componente `ERP.botonesExportar` que usa
  Embarques) — mismo remapeo primario-negro/fantasma que en E90.
- **Encabezados de sección** (`h2.sec`, 3 en esta pantalla) — el global usa `color:var(--tinta)`
  y `background:var(--linea)` en su línea divisoria (tokens viejos, estáticos): remapeado a
  `var(--ink)`/`var(--bd)` dentro del scope para que no se vean apagados/ilegibles en oscuro.
- **Cero emojis**: `⚠` del bucket "90+" → `ti-alert-triangle-filled` en rojo.
  **No tocado a propósito**: `⚑`/emojis dentro de `verCliente()` (drawer global, fuera del scope).

**Fix de bug encontrado de paso (afecta a AMBAS pantallas, Embarques y CxC):** `tr.total td`
(fila de totales al pie de las tablas) tiene una regla GLOBAL con `background:var(--papel)` —
token viejo, estático, no cambia en oscuro — se veía como una barra casi blanca **ilegible** sobre
el fondo oscuro nuevo. Se agregó `.pantalla-embarques tr.total td` / `.pantalla-cxc tr.total td`
(fondo `var(--hair)`, borde superior e texto `var(--ink)`) en ambos scopes. Este bug ya existía
en Embarques desde E90 pero no se había visto porque el snapshot de esa sesión no bajó lo
suficiente en la captura de modo oscuro — corregido ahora en los dos módulos a la vez.

**Parte 2 — fix de tarjetas de agenda en Embarques:** el reporte decía que se veían "oscuras en
claro". Al verificar en vivo (computed style + captura), el fondo YA resolvía correctamente a
`var(--pan)` — la regla scopeada de E90 ya ganaba por especificidad sobre la global
(`.hoy-card{background:#fff}` fijo). Lo que SÍ faltaba: `.hoy-card`/`.hoy-card-titulo` no traían
`color` explícito (dependían de heredar `--ink` desde el `body`) — se hizo explícito por
robustez, sin depender de la cadena de herencia de un ancestro compartido con Inicio. No se tocó
la regla global (la sigue usando Inicio sin cambios) ni se usó `!important`.

**Verificado en navegador con datos reales (fixture con 3 clientes, 4 buckets de antigüedad
incluido 90+, y datos DSO):**
- Claro y oscuro: KPIs (Vencido en rojo, Al corriente en ink), barras money/amb/red con ícono de
  alerta en 90+, tabla con hover, "Total cartera" ahora legible en oscuro (antes casi blanco).
- Agenda de Embarques confirmada clara en modo claro y oscura en modo oscuro, en ambas capturas.
- **Scoping confirmado numéricamente**: `.pantalla-cxc .kpi` → `rgb(21,27,23)` (`--pan` oscuro)
  en CxC, vs. `#app .card` en **Inicio** y **Tesorería** → `rgb(255,255,255)` (`--tarjeta` viejo,
  estático) en ambos, sin cambios. Cero errores de consola en las 4 pantallas
  (Embarques/CxC/Inicio/Tesorería), claro y oscuro.

**Archivos tocados:** `modulo-cobranza.js` (wrapper `.pantalla-cxc`, KPI strip inline en
`render()`, `color()` de `pintarAging()` remapeado a tokens, `⚠` → ícono Tabler, clase `.cliente`
en 2 celdas, semáforo DSO remapeado a tokens nuevos), `estilos.css` (bloque nuevo `.pantalla-cxc`
al final del archivo + 2 líneas de fix `tr.total td` en los scopes de Embarques y CxC + fix de
color explícito en `.hoy-card`/`.hoy-card-titulo` dentro de `.pantalla-embarques`). `node --check`
limpio en `modulo-cobranza.js` y `modulo-cargas.js`. NO desplegado — pendiente de
`npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Embarques — primera propagación "Operador estilo Silo", E90)

**SCOPE = `.pantalla-embarques`** — wrapper nuevo que `modulo-cargas.js` pone alrededor de TODO
lo que pinta `render()`. No existía ningún contenedor raíz propio (el módulo escribía directo a
`cont`/`#modContenido`, un `id` genérico que TODOS los módulos reusan uno a la vez) — se creó el
wrapper como parte de esta tarea. Todo el CSS nuevo vive anidado bajo `.pantalla-embarques ` en
`estilos.css` (nunca suelto), con una clase extra de especificidad sobre cada equivalente global
para ganar el cascade sin importar el orden en el archivo — verificado numéricamente (ver abajo),
no solo a ojo.

**Mapeo real verificado en vivo ANTES de tocar nada** (contradice varios supuestos del enunciado
original — se documentan las 3 desviaciones más importantes):
1. Embarques hoy es una **tabla plana multi-filtro** (chips `.chip` + tabla ordenable), NO datos
   agrupables por programa — la mayoría de las cargas no traen programa. **No se instaló** el
   layout `.group`/`.ghead`/`.gtag`/`.gsub`/`.mini` de la escena aprobada: habría sido decoración
   sin función real. La tarea daba permiso explícito para elegir la opción menos invasiva.
2. `v_carga_detalle` **no tiene columna `gastos`** separada del costo total (verificado en vivo,
   `42703`). La tira de KPIs quedó en 5 tarjetas (Embarques/Venta/Costo/Margen/Utilidad), no 6 —
   no se inventó un dato que el backend no expone.
3. No existen notas internas tipo `[E17]`/`[E47]`/`FLAG:` en el marcado de Embarques (grep en
   vivo, cero resultados) — lo único "interno" en la fila es el flag ⚑/`revision_pendiente`, una
   señal operativa legítima (no un olvido de desarrollo), así que se mantuvo — solo re-vestida
   como ícono Tabler en vez de emoji.

**Componentes instalados (reusando el marcado/clases real de Embarques donde ya existían, sin
inventar markup nuevo salvo la tira de KPIs):**
- **Tira de KPIs** (`.kpistrip`/`.kpi`, nueva) — Embarques/Venta/Costo/Margen/Utilidad, calculados
  con los MISMOS totales que ya armaba el `<tfoot>` (`pintarKpis()`, llamada desde `pintarTabla()`
  antes del early-return de "sin filas" para que se ponga en 0 en vez de quedar congelada).
- **Chips de filtro** — se restyló `.chip`/`.chip.activo` (existentes) con el look de tab-pill
  del diseño; NO se renombraron clases en el JS (el wiring ya selecciona por `#filtrosCont .chip`,
  scoping por ancestro basta).
- **Tabla densa** — `table`/`thead th`/`tbody td`/`tbody tr:hover` mapeados 1:1 sobre el
  `<table>` real de `#cargasTabla` (Embarques no tenía NINGÚN estilo global de `thead th`/
  `tbody td` antes de esto — se verificó que no colisiona con nada).
- **Folio con pestaña naranja** (`.ltag`, clase nueva agregada al `<span class="enlace">` del
  folio) y **Producto en tinta** (`.prod`, clase nueva en esa `<td>`).
- **Punto de margen** (`puntoMargen()`, función local nueva) — reemplaza el emoji 🟢🟡🔴 del
  semáforo SOLO en esta pantalla; `ERP.semaforo` (helper compartido en `comun.js`, usado por
  otros módulos) no se tocó — se dejó de llamar en este archivo y se quitó del destructure por
  quedar sin uso.
- **Pastillas de modalidad** (`pillModalidad()`, reemplaza a `badgeConsignacion()`) — las 3
  modalidades reales (`margen_fijo`/`consignacion`/`comision`, confirmadas contra `MODALIDAD_EDIT`
  del propio archivo): Margen y Consignación en verde (`.pill.m`/`.pill.g`), Comisión en ámbar
  (`.pill.c`) — **nunca rojo**, para que comisión pura (costo 0 / margen 100%) se lea como
  correcto, no como error. El detalle de sub-estado de consignación que traía `badgeConsignacion`
  (esperando liquidación / venta ya declarada) se conservó, ahora en el `title` de la pastilla.
- **Badges de estado y cobro** (`ERP.badgeEstado`/`ERP.chipCobroHTML`, helpers compartidos) — solo
  se remapeó el COLOR de sus variantes (`.badge-estado.verde/.ambar/.rojo/...`) a los tokens
  nuevos; la lógica que decide qué color usar sigue en `comun.js`, sin tocar.
  Igual con `.pill.verde`/`.pill.rojo`/`.pill.gris`/`.pill.ambar` (chip de programa, "ANULADA").
- **Botones** (`.btn-mini`/`.btn-mini.gris`, existentes) — remapeados a negro primario / fantasma
  con borde, sin tocar el JS (ya diferenciaban primario vs. fantasma por la clase `.gris`).
- **Cero emojis dentro de Embarques**: semáforo → `.pmargen` (Tabler `ti-circle-filled`
  coloreado), ⊘ anulada → `ti-ban`, ⚑ flag → `ti-flag-filled` (fila, chip "Con flag", leyenda),
  🔴 contador de agenda → `ti-alert-triangle-filled`. Leyenda del pie reescrita para describir los
  íconos nuevos. **No tocado a propósito**: los emojis de la FICHA de carga (`pintarFicha`,
  `abrirEditarCarga` — abren en el panel/drawer global `#panelBody`, compartido por TODA la app,
  fuera del wrapper `.pantalla-embarques`) y los de Inicio/otros módulos.
- **Tarjetas de agenda** (`.hoy-card`, compartida con Inicio) — armonía ligera de color
  (`--pan`/`--bd`/`--brand`) sin clases nuevas, solo dentro del scope.

**Limpieza global (1 sola cosa, la aprobada):** se buscó la foto de fondo del `body`
(`background-image`, `url(...)`, inline en `index.html`) en TODO el repo — **no existe**. El
`body` ya quedó en lienzo sólido `var(--bg)` desde la sesión anterior (E89, capa de tokens). Nada
que quitar; se documenta para que no se lea como un olvido.

**Verificado en navegador con datos reales (harness con fixture cubriendo las 3 modalidades +
flag + anulada + 2 sub-estados de consignación + fila sin PO/lote/V7):**
- Claro y oscuro: capturas confirmando KPIs, chips, tabla, pastillas (Comisión en ámbar, nunca
  rojo), punto de margen rojo en la fila de margen <3%, fila ANULADA con `ti-ban`.
- **Scoping confirmado NUMÉRICAMENTE** (no solo a ojo — mismos nombres de clase, colores
  distintos): `.pantalla-embarques .card` → `rgb(21,27,23)` (`--pan` oscuro) vs. `#app .card` en
  Inicio → `rgb(255,255,255)` (`--tarjeta` viejo, estático). `.pantalla-embarques .chip.activo` →
  `rgb(95,178,85)` (`--brand` oscuro) vs. `#app .btn-mini.gris` en Cobranza → fondo transparente,
  borde `rgb(221,220,210)` (`--linea` viejo) y padding `6px 12px` (el original, no el `8px 12px`
  nuevo de Embarques). Tesorería: `.card` también `rgb(255,255,255)`, sin cambios. Cero errores de
  consola en las 4 pantallas (Embarques/Inicio/Cobranza/Tesorería), claro y oscuro.

**Archivos tocados:** `modulo-cargas.js` (wrapper `.pantalla-embarques`, `pintarKpis()` nueva,
`pillModalidad()` reemplaza a `badgeConsignacion()`, `puntoMargen()` nueva, clases `.ltag`/`.prod`
agregadas a 2 celdas, reemplazo de 6 emojis/símbolos por íconos Tabler, leyenda reescrita,
`semaforo` quitado del destructure por quedar sin uso), `estilos.css` (bloque nuevo ~90 reglas al
final del archivo, todo anidado bajo `.pantalla-embarques`). `node --check` limpio en
`modulo-cargas.js`. NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-06 (Capa de tokens claro/oscuro + toggle — fundación E89 "Operador estilo Silo")

**Verificado en vivo antes de programar:** `estilos.css` ya tenía un `:root` (nombres viejos:
`--tinta`, `--papel`, `--tarjeta`, `--verde`, etc.) — **no se tocó**, sigue siendo lo que usa el
resto de la app. Los nombres nuevos (`--bg`, `--pan`, `--ink`, etc.) no chocan con nada existente.
`index.html` no tenía Tabler ni script anti-parpadeo. Confirmado que el repo es 100% vanilla, sin
`package.json` ni paso de build.

- **`tokens.css` (nuevo)** — el bloque `:root`/`[data-theme="dark"]` exacto de la tarea, enlazado
  ANTES de `estilos.css` en `index.html`.
- **`index.html` `<head>`:**
  - Google Fonts actualizado a Archivo 600;700;800 (antes traía además 500, sin uso real —
    verificado por grep, ningún `font-weight:500` con Archivo en `estilos.css`) · Inter
    400;500;600;**700** (antes no traía 700) · IBM Plex Mono 400;500;600 (sin cambio).
  - Tabler icons webfont 3.7.0 (CDN jsDelivr).
  - Script inline **anti-parpadeo**, primero que nada en el `<head>` (antes de los `<link>` de
    fuentes/CSS): lee `localStorage('plein-theme')`, si no hay usa `prefers-color-scheme`, y fija
    `data-theme` en `<html>` antes del primer paint. Envuelto en `try/catch` (localStorage puede
    estar bloqueado en modo privado — cae a claro por defecto sin tronar).
  - `<link rel="stylesheet" href="tokens.css">` antes de `estilos.css`.
  - Botón nuevo `#btnTema` en `.top-derecha` (barra superior, a la derecha, junto a "Actualizar"),
    ícono `<i class="ti ti-moon">` (Tabler).
- **`app.js`:** `alternarTema()` (toggle `data-theme` + guarda en `localStorage`, con `try/catch`),
  `pintarIconoTema()` (cambia `ti-moon`↔`ti-sun` según el tema actual), `temaActual()`. Cableado
  igual que los demás botones del header (`$('btnTema').addEventListener('click', alternarTema)`
  junto a `btnRf`/`btnSalir`/`btnMenu`). `pintarIconoTema()` se llama una vez al cargar el script
  para que el ícono ya esté correcto en cuanto se vea el header (vive dentro de `#shell`, oculto
  hasta iniciar sesión, pero el estado no depende del login).
- **`estilos.css` — la ÚNICA superficie retokenizada** (nada más se tocó): `body` (fondo/tinta) y
  `header.top` (fondo/tinta/borde) ahora usan `--bg`/`--pan`/`--ink`/`--bd`. **Extensión necesaria
  más allá de los 4 vars literales del enunciado:** varios hijos de `header.top` traían blancos y
  `rgba(255,255,255,.2-.35)` hardcodeados asumiendo el fondo verde oscuro de marca (`.btn-menu`,
  `.btn.fantasma`, `.estado`, `.buscador input` + su placeholder/focus, `.perfil`, `.presencia-soy`,
  `.pres-persona`, `.pres-vacio`, `.pres-cambiar`) — de no ajustarlos, el header habría quedado con
  texto/bordes blancos invisibles sobre el nuevo fondo claro. Se corrigieron con el resto de los
  tokens ya definidos en `tokens.css` (`--hair`, `--i3`, `--gtint`, `--brand`) porque siguen siendo
  la MISMA superficie de prueba (la barra superior), no "otro módulo" — se dejó comentado en el CSS
  el porqué. `nav.lateral`, paneles, tarjetas y todo lo demás **no se tocaron**: siguen con la
  paleta vieja hasta el rediseño pantalla por pantalla.

**Cómo probar el toggle:** iniciar sesión normal → arriba a la derecha, botón redondo junto a
"Actualizar" (ícono luna). Un clic → la barra superior y el fondo del área de contenido cambian a
oscuro, el ícono pasa a sol, y la preferencia se guarda (recargar la página mantiene el tema — sin
parpadeo al cargar). Otro clic regresa a claro. El menú lateral y el resto de las pantallas se
quedan en la paleta actual a propósito — eso es el siguiente paso, no este.

**Verificado con navegador real** (Chrome DevTools MCP, `index.html` real — no un harness con
mocks, esta tarea es puramente visual/CSS/DOM): (1) carga inicial en claro, header/fondo/buscador
legibles, ícono luna → confirmado por captura; (2) clic en `#btnTema` → `data-theme="dark"`,
`localStorage.plein-theme="dark"`, ícono sol, header y fondo del contenido pasan a oscuro con buen
contraste, menú lateral se queda claro (tal como se pidió) → confirmado por captura; (3) recargar
con `plein-theme=dark` en localStorage → `data-theme` sale en `"dark"` desde el primer paint (cero
parpadeo) → confirmado; (4) sin errores en consola (Tabler y Google Fonts cargaron bien desde CDN).

**Archivos tocados:** `tokens.css` (nuevo), `index.html` (`<head>`: fuentes, Tabler, script
anti-parpadeo, link a tokens.css; body: botón `#btnTema`), `estilos.css` (`body`, `header.top` y
sus hijos inmediatos retokenizados; nueva clase `.btn-tema`), `app.js` (toggle + wiring).
`node --check` limpio en `app.js` (único JS tocado; `index.html`/`*.css` no aplican). NO
desplegado — pendiente de `npx vercel --prod` por Miguel.

---


## ✅ ACTUALIZACIÓN — 2026-08-05 (Permisos granulares — menú dinámico + matriz por usuario, E88/D-105)

**Contrato backend verificado en vivo** antes de programar: `v_mi_perfil` v2 trae `modulos text[]`
(confirmado — columna real, `42501` con la llave publicable; una columna inventada da `42703`, la
técnica de siempre). Las 5 RPCs nuevas existen y están protegidas por RLS (`42501`); los nombres
de parámetro reales se confirmaron por el `hint` de PostgREST en el primer intento fallido (el
enunciado de la tarea traía `p_socio_codigo`/`p_capacidad` — el backend real usa **`p_socio`** y
**`p_cap`**): `fn_admin_listar_modulos()`, `fn_admin_capacidades_usuario(p_socio)`,
`fn_admin_modulos_usuario(p_socio)`, `fn_admin_set_capacidad(p_cap,p_socio,p_valor)`,
`fn_admin_set_modulo(p_modulo,p_socio,p_visible)`. **No se llamaron los dos RPC de escritura**
(`fn_admin_set_capacidad`/`fn_admin_set_modulo`) contra la base real durante la verificación —
solo se confirmó su firma por el `hint` del error, sin ejecutar la mutación (regla dura de esta
sesión: frontend nunca escribe en Supabase, ni siquiera "para probar").

### (a) Menú dinámico — `comun.js` + `app.js`

- `comun.js`: `PERFIL_SIN_PERMISOS` ahora incluye `modulos: []` (antes no existía la llave;
  fail-closed si `cargarPerfil()` falla — mismo criterio que el resto del perfil). `cargarPerfil()`
  no se tocó: como ya hace `select('*')` + spread, `modulos` llega solo.
- `app.js`: nueva función `aplicarMenuDinamico()` (llamada en `sesionActiva()`, reemplaza la línea
  vieja `$('itemUsuarios').style.display = ERP.puede('administrar') ? ...`) — recorre
  `nav.lateral a.item[data-modulo]` y muestra/oculta cada uno según `ERP.perfil.modulos.includes(clave)`.
  `'usuarios'` ya no necesita caso especial: el backend solo lo incluye en el array para admins.
  `'faltantes'` se **excluye** del barrido genérico (`return` temprano en el forEach) porque su
  regla es doble (permiso Y contador>0), no solo permiso.
- `refrescarBadgeFaltantes()` ahora empieza revisando `ERP.perfil.modulos.includes('faltantes')`
  — si no está, oculta el ítem y ni pide el conteo (antes solo miraba el contador, sin gate de rol).

### (b) Matriz de permisos por usuario — `modulo-usuarios.js`

Botón nuevo **"Permisos"** por fila (junto a "Editar") → `abrirPermisos(u)`, drawer con dos tablas:
**Capacidades** (4 filas: ver/capturar/editar/administrar) y **Módulos visibles** (hasta 25,
ordenados por `orden`). Cada fila: etiqueta, valor del rol (pill informativo), un `<select>`
tri-estado (**Hereda del rol (Sí/No)** / Sí / No — value `""`/`"1"`/`"0"`, mapeando a
`null`/`true`/`false`) y el **efectivo** resultante (pill, se recalcula en vivo).

- **Autoguardado por celda**, no hay botón "Guardar todo": cada `<select>` dispara su propio
  `rpc('fn_admin_set_capacidad'|'fn_admin_set_modulo', ...)` al `change`. El drawer se queda
  abierto para seguir ajustando (a diferencia del form de alta/edición, que sí cierra al guardar)
  — con 29 celdas posibles por usuario, cerrar en cada cambio habría sido muy fricción.
  `p_valor`/`p_visible` es `null` cuando el `<select>` vuelve a "Hereda".
  `ERP.marcarDatosSucios()` se llama en cada guardado exitoso.
- **Reversión en error:** cada `<select>` guarda su propio valor anterior en
  `data-valor-anterior`; si el RPC falla, el `<select>` se regresa a ese valor (no se queda
  mostrando una selección que el backend rechazó) y el mensaje del backend se muestra **tal cual**
  en un aviso del drawer — mismo trato que las guardas anti-lockout de `fn_admin_guardar_usuario`
  ya documentado en E87, extendido aquí a las guardas equivalentes de los RPC de capacidad/módulo
  (ej. "no puedes quitarte a ti mismo administrar" / "no puedes ocultarte el módulo Usuarios").
- Reutiliza el patrón `seccion(titulo, html)` de `modulo-proyectos.js` (encabezado `<h4>` dentro
  del panel) para las dos sub-tablas, y generaliza el `avisoUsr()` existente en un `avisoEn(id,...)`
  compartido (antes solo apuntaba a `#usrAviso`; ahora también sirve al nuevo `#permAviso`).
- `fn_admin_listar_modulos()` (catálogo general) **no se usó**: `fn_admin_modulos_usuario(p_socio)`
  ya trae `etiqueta`/`orden` por usuario, que es todo lo que pide esta pantalla — se documentó la
  decisión en el encabezado del archivo para que no se vea como un olvido.

**Verificado con harness de navegador** (Chrome DevTools MCP, flujo de login real simulado —
`liEmail`/`liPass`/`liBtn` + mock de `sb.auth.signInWithPassword`/`sb.from('v_mi_perfil')`, no un
atajo directo a `ERP.perfil`): (1) perfil admin con los 25 módulos en su array ve los 25 ítems,
incluidos `usuarios`/`cierres` → PASS; (2) un rol angosto (fixture "captura", 5 módulos) solo ve
esos 5, `faltantes` oculto aunque su contador sea 3 (no está en su `modulos[]`) → PASS; (3) con
`faltantes` sí permitido pero contador=0, sigue oculto → PASS; (4) el drawer de Permisos abre con
4 filas de capacidades + 3 de módulos (fixture) → PASS; (5) una capacidad con `override` guardado
(`editar`→No) precarga el `<select>` en "No", no en "Hereda" → PASS; (6) cambiar `administrar` de
Hereda a Sí dispara `fn_admin_set_capacidad` con el payload exacto y el pill "Efectivo" pasa a
"Sí" → PASS; (7) cambiar un módulo dispara `fn_admin_set_modulo` con el payload exacto → PASS;
(8) un error simulado (anti-lockout) revierte el `<select>` a su valor previo y muestra el mensaje
del backend verbatim en el drawer → PASS.

**Archivos tocados:** `comun.js` (1 llave nueva en `PERFIL_SIN_PERMISOS`), `app.js`
(`aplicarMenuDinamico()` nueva + `refrescarBadgeFaltantes()` con gate de rol), `modulo-usuarios.js`
(sección "Permisos granulares" nueva: `abrirPermisos`, `guardarPermiso`, `filaPermiso`,
`tablaPermisos`, `seccion`, `pillBool`, `ETIQUETA_CAP`, más el botón "Permisos" por fila y el
`avisoEn` generalizado). `node --check` limpio en los 3. NO desplegado — pendiente de
`npx vercel --prod` por Miguel.

---

## 🐛 FIX — 2026-08-05 (Cuentas por Pagar — el cajón de detalle por proveedor migrado al modelo atribuido)

**Bug:** la lista "Saldo por proveedor" en Cuentas por Pagar (`modulo-pagos.js`) ya usaba
`v_cxp_proveedor_atribuido` (estimado por prorrateo, con tooltip de tinte). Pero el **cajón de
detalle** que abre al picar un proveedor (`verProveedor()`) seguía leyendo la vista **directa**
`v_cxp_detalle_proveedor` — que solo trae costo asentado por línea. Para proveedores de servicio
sin costo por línea (BBA, Las Brisas, AGRICOOLING, LAM, SUAREZ) el cajón salía **vacío** aunque la
lista de arriba sí les mostraba saldo — inconsistencia entre lista y detalle.

**Fix:** `verProveedor()` ahora lee la vista nueva `v_cxp_detalle_proveedor_atribuido(proveedor,
contraparte_id, folio, po, estado, f_embarque, costo, pagado_estimado, saldo_estimado)` — mismo
modelo atribuido que la lista. Verificada en vivo (`42501` = existe + protegida por RLS, incluidas
sus columnas vía sanity-check con columna inventada → `42703`).

- **Filtro exacto por `contraparte_id`:** el routing de la lista (`ERP.irModulo('pagos', nombre)`)
  solo pasa el **nombre** del proveedor por el hash, no trae `contraparte_id`. `verProveedor()`
  ahora recibe un `contraparteId` opcional y, si no llega, lo resuelve buscando el nombre en
  `proveedoresRows` (la misma lista `v_cxp_proveedor_atribuido` ya cargada por `render()`, cacheada
  a nivel módulo — mismo patrón que `cxpLoteRows`) para filtrar por `contraparte_id=eq.<id>` en vez
  de por nombre de texto — exactitud garantizada aunque dos proveedores compartan nombre parecido.
  Si por algún motivo no se encuentra el id (proveedor nuevo no listado todavía), cae de vuelta a
  filtrar por `proveedor=eq.<nombre>` tal como antes.
- **Mismo tooltip de estimación** que la lista: se extrajo la nota a una constante compartida
  `NOTA_ESTIMADO` (antes duplicada inline solo en la lista) y ahora decora también las columnas
  "Pagado"/"Saldo" del cajón; se cablea con `ERP.cablearInfoNota(panelBody)` igual que en el resto
  de la app.
- **Columnas del cajón:** folio, po, estado, f_embarque, costo, pagado_estimado, saldo_estimado —
  encabezado "N cargas por pagar · total $X" = suma de `saldo_estimado`. El total puede diferir
  1–2¢ del de la lista por redondeo por-carga; es esperado, no se fuerza cuadre.
- **Se quitó** la bandera ⚑ (`revision_pendiente`) del cajón — esa columna no existe en la vista
  atribuida (el detalle directo sí la traía). No hay reemplazo; es una pérdida de señal aceptada
  al migrar de modelo, no un descuido.
- **El directo (`v_cxp_detalle_proveedor`, `v_cxp`) no se tocó** — sigue siendo lo asentado/Cuadre
  en el resto de la app; solo cambió la fuente de este cajón.

**Verificado con harness de navegador** (Chrome DevTools MCP, fixture con un proveedor de
servicio simulando BBA — sin filas en el directo, con 2 filas en el atribuido): (1) la lista
renderiza el saldo atribuido → PASS; (2) clic directo en la fila abre el cajón con las 2 cargas,
total `$1,250.75`, tooltip de estimación presente → PASS; (3) un deep-link `#/pagos/BBA%20SERVICIOS`
que solo trae el nombre (sin id) resuelve `contraparte_id=501` internamente y filtra por id, no por
texto (confirmado inspeccionando la URL del fetch real, con `ERP.limpiarCache()` para evitar que
la caché de `q()` enmascarara la prueba) → PASS; (4) un proveedor con datos también en el directo
(AGROFEPAC) sigue mostrando su carga y total correctos por la vía atribuida → PASS.

**Archivo/función tocada:** `modulo-pagos.js` — función `verProveedor()` (fuente de datos + firma,
ahora acepta `contraparteId` opcional), variable de módulo nueva `proveedoresRows` (cache de
`v_cxp_proveedor_atribuido` para resolver id por nombre), constante `NOTA_ESTIMADO` (extraída para
compartirse entre `pintarProveedores()` y `verProveedor()`), 1 línea añadida en `render()` para
poblar `proveedoresRows`. `node --check` limpio. NO desplegado — pendiente de `npx vercel --prod`
por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-05 (Módulo nuevo "Usuarios" — administración de accesos, E87/D-103)

**Qué se construyó:** módulo nuevo `modulo-usuarios.js` (ruta `usuarios`), **visible solo para
administradores** (`ERP.puede('administrar')`). Consume las 3 RPCs ya verificadas en vivo
(`42501` = existen y están protegidas por RLS, la señal esperada con la llave publicable):
`fn_admin_listar_usuarios()`, `fn_admin_listar_roles()`, `fn_admin_guardar_usuario(p_socio_codigo,
p_nombre, p_email, p_rol, p_activo)`.

- **Ítem de menú "Usuarios"** en `index.html`, oculto por defecto (`style="display:none"`, mismo
  patrón que `itemFaltantes`) y mostrado en `app.js` → `sesionActiva()` con una línea:
  `$('itemUsuarios').style.display = ERP.puede('administrar') ? '' : 'none';` — se evalúa una vez
  al iniciar sesión, igual que el resto de `pintarPerfil`/badges iniciales.
- **Gate de ruta:** si un socio sin `administrar` navega a `#/usuarios` directo (o queda con la
  pestaña abierta y pierde el rol), `render()` corta antes de pedir datos y muestra
  `<div class="errbox">Esta pantalla es solo para administradores.</div>` — mismo tono que los
  `errbox` de solo-lectura ya existentes en `captura-rapida.js`.
- **Tabla:** código, nombre, correo, rol (pill, gris si inactivo), chips de capacidad
  (`Ver`/`Capturar`/`Editar`/`Administrar`, verdes, solo las que el rol tiene activas — "Sin
  capacidades" en gris si ninguna), activo (Sí/No), botón "Editar" por fila. Buscador de texto
  libre sobre código/nombre/correo/rol.
- **Alta ("+ Nuevo usuario"):** drawer (`ERP.abrirPanel`) con `socio_codigo` (input libre, único
  campo editable solo en alta), nombre, email, `<select>` de rol poblado desde
  `fn_admin_listar_roles` mostrando `"{rol} — {descripcion}"` (con ayuda que se actualiza al
  cambiar de rol), toggle "Activo" (checkbox, marcado por default). Nota fija visible solo en
  alta: *"El correo debe además estar invitado en Supabase Auth (Authentication → Users) para
  poder iniciar sesión; esta pantalla solo define su rol."*
- **Edición:** mismo drawer, `socio_codigo` pasa a `<div class="campo-fijo mono">` (no editable —
  el backend no tiene forma de "renombrar" un socio, solo alta/edición sobre el código existente).
- **Guardado:** `rpc('fn_admin_guardar_usuario', {...})` → éxito: `ERP.marcarDatosSucios() +
  ERP.cerrarPanel()` (que re-dispara `despachar()` y refresca la tabla, patrón estándar del
  repo) + `ERP.toast('ok', ...)` con el texto que devuelve el backend, extraído con un helper
  local `textoRpc` **replicado tal cual** de `modulo-proyectos.js`
  (`const textoRpc = data => (typeof data === 'string' ? data : ((data && data[0]) || 'Listo.'));`)
  — no se inventó un patrón nuevo. Error: si `ERP.avisarSiPermiso` no lo atrapa (o sea, no es un
  rechazo de permiso genérico), el mensaje del backend se muestra **tal cual, sin envolver**,
  incluidas las guardas anti-lockout ("no puedes quitarte a ti mismo la capacidad de
  administrador…") — verificado en el harness de prueba (ver abajo) que el texto exacto del
  backend llega íntegro al aviso del drawer.

**Verificado con harness de navegador** (Chrome DevTools MCP, mock de `supabase.createClient`
antes de cargar `comun.js`, `sb.from('v_mi_perfil')` mockeado para poder variar `ERP.perfil` vía
`ERP.cargarPerfil()` real — `ERP.perfil` es un getter sin setter, no se puede pisar directo): (1)
gate no-admin → PASS; (2) admin ve las 4 filas fixture con chips correctos → PASS; (3) alta manda
el payload exacto `{p_socio_codigo, p_nombre, p_email, p_rol, p_activo}` y el usuario aparece en
la lista tras guardar → PASS; (4) editar un usuario existente deja `socio_codigo` en
`campo-fijo`, sin input → PASS; (5) un error simulado de anti-lockout se muestra verbatim en el
aviso del drawer → PASS.

**Auditoría rápida solicitada (embarque/movimiento gateados por `capturar`, no `editar`):**
revisados todos los botones de creación — "+ Nuevo embarque" (`modulo-cargas.js:1686`,
guardado además por un segundo chequeo `ERP.puede('capturar')` dentro de `nuevaCarga()` en la
línea 2052), "+ Movimiento"/"+ Registrar gasto"/"+ Anticipo a productor" (`modulo-tesoreria.js:900`),
"+ cobro" en Cuentas por Cobrar (`modulo-cobranza.js:97`), "+ pago" en Cuentas por Pagar
(`modulo-pagos.js:61`) y "+ Registrar cobro/pago" dentro de la ficha de carga
(`modulo-cargas.js:470`) — **todos ya estaban correctamente gateados por `ERP.puede('capturar')`**,
igual que exige el backend en `fn_crear_carga`/`fn_capturar_mov`. No se encontró ningún botón de
creación usando `'editar'` por error; no hizo falta ningún cambio.

**Archivos tocados:** `modulo-usuarios.js` (nuevo), `index.html` (ítem de menú + `<script>`),
`app.js` (1 línea en `sesionActiva()`). `node --check` limpio en `modulo-usuarios.js` y `app.js`.
NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## 🐛 FIX — 2026-08-04 (Zona horaria: `hoyISO()` prellenaba el día siguiente de noche en Sonora)

**Causa confirmada:** `hoyISO()` no es un helper compartido — está duplicado, idéntico, en 5
archivos: `captura-rapida.js`, `modulo-tesoreria.js`, `modulo-cargas.js`, `modulo-proyectos.js`,
`modulo-ordenes.js`. Las 5 copias usaban `new Date().toISOString().slice(0, 10)` — **UTC**. En
Sonora (UTC-7), después de las 17:00 hora local, `toISOString()` ya cae en el día siguiente en
UTC, así que todo `<input type="date">` prellenado con `hoyISO()` mostraba **mañana** en vez de
hoy. Reproducido en vivo mientras se investigaba (21:43 hora de México): `toISOString()` daba
`2026-08-05`, la fecha local real era `2026-08-04`.

**Fix:** las 5 copias de `hoyISO()` se cambiaron a construir el string desde componentes
**locales** (`getFullYear()/getMonth()/getDate()`, sin `toISOString()`):
```js
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
```
Cada copia se arregló donde vive (no se centralizó en `comun.js` — sigue el mismo patrón de
utilidades pequeñas duplicadas por archivo que ya usa este repo, ej. `fecha4()`). Afecta los
defaults de fecha de: "+ Movimiento" y "+ Anticipo a productor" (`captura-rapida.js`), "+
Registrar gasto" (`modulo-tesoreria.js`), los forms de captura de `modulo-cargas.js`, "Movimiento
de línea"/"Línea de presupuesto" (`modulo-proyectos.js`) y el chip "vencido" de
`modulo-ordenes.js` (mismo `hoyISO()`, usado ahí para comparar contra `fecha_vencimiento`).

**Bug gemelo encontrado de paso (mismo patrón, nombre distinto) y también arreglado:**
`modulo-expediente.js`, formulario "Confirmar entrega" — usaba `new Date().toISOString().slice(0,
10)` inline (dos veces, sin helper) tanto para el default/`max` del `<input type="date">` como
para la validación "la entrega real no puede ser una fecha futura" (`fecha > hoy`). Este era el
más grave de los dos hallazgos: de noche, el `max` quedaba en mañana, así que la validación
**dejaba pasar una fecha realmente futura** como si no lo fuera. Se extrajo un `hoyISO()` local
en ese archivo (antes no existía ninguno ahí) con la misma fórmula de arriba, reemplazando las 2
apariciones — de paso desduplica el inline repetido.

**Encontrado pero NO tocado (mismo patrón, fuera de alcance — solo cosmético):**
- `exportar.js` (`hoy()`): solo arma el sufijo de fecha del nombre de archivo exportado
  (`PleinProduce_Reporte_YYYY-MM-DD.xlsx`), no un default de captura ni una validación. Si se
  exporta ya entrada la noche, el archivo podría llevar la fecha de mañana en el nombre — cosmético,
  sin impacto de negocio. Se deja anotado por si se quiere el mismo trato después.
- `modulo-tesoreria.js:131` (`rangoPorDefecto()`): SÍ usa `.toISOString().slice(0,10)`, pero sobre
  un `Date` ya anclado a mediodía LOCAL (`new Date(max + 'T12:00:00')` + `setDate()`) — con ese
  ancla a mediodía nunca cruza la medianoche UTC en la práctica, así que no tiene el mismo bug.
  Se revisó y se descartó a propósito, no es un olvido.

**Archivos tocados:** `captura-rapida.js`, `modulo-tesoreria.js`, `modulo-cargas.js`,
`modulo-proyectos.js`, `modulo-ordenes.js`, `modulo-expediente.js`. `node --check` limpio en los
6. Verificado con el reloj real de esta sesión (ver arriba) que la fórmula nueva da el día local
correcto donde la vieja ya fallaba. NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-04 (Nueva puerta de captura "Anticipo a productor", E87/D-102)

Solo frontend, sin backend nuevo — RPC `fn_anticipo_productor` y vista `v_proyectos` ya
desplegadas, verificadas en vivo antes de programar (técnica 42501/PGRST202 sobre PostgREST,
firma y columnas exactas confirmadas). Objetivo: capturar un anticipo a productor **en un solo
paso, SIN FIFO** — hoy la única forma era "Movimiento de línea" en la ficha de Proyecto
(`fn_registrar_amortizacion`, tipo `disposicion`), que sigue intacta y sin tocar.

**Función compartida nueva:** `ERP.capturarAnticipoProductor(ctx)` en `captura-rapida.js`, junto
a `ERP.capturarMovimiento` (mismo archivo = lanzador reutilizable de captura, mismo patrón: un
solo drawer vía `ERP.abrirPanel`, sin duplicar lógica de RPC entre módulos). `ctx.proyecto`
(opcional) precarga el selector cuando se invoca desde dentro de un proyecto ya abierto.

- **Formulario:** Proyecto (`<select>` de `v_proyectos` filtrado `estado=eq.activo&monto_linea=gt.0`,
  texto "`código` — `nombre`"; al cambiar, pinta en vivo Saldo vivo y Línea disponible, y prellena
  Productor —editable— con `v_proyectos.productor`) · Productor (texto libre) · Cuenta (combo
  JPM/JEAMS/SAMUEL, default JPM, mismo catálogo `v_catalogo_cuentas` que ya usa
  `capturarMovimiento`/`formGasto`) · Fecha (default hoy) · Monto (>0) · Descripción/Nota
  (opcionales).
- **Aviso previo a enviar:** si el monto ya capturado supera la línea disponible del proyecto
  elegido, se muestra una advertencia ámbar en vivo (al teclear o al cambiar de proyecto) — el
  backend sigue siendo la autoridad final, esto NO bloquea el envío.
- **Al enviar:** llama `fn_anticipo_productor`; éxito → toast "Anticipo folio **N** registrado.
  Saldo vivo $X, línea disponible $Y." (+ la `advertencia` del backend si trae una, ej.
  contraparte no encontrada). Error → el mensaje del backend se muestra TAL CUAL (incluida la
  guarda "...excede la línea...", nunca envuelto ni escondido). Sin proyectos elegibles → estado
  vacío amable, no un error.
- **Dos puntos de entrada, misma función:**
  1. **Tesorería** (`modulo-tesoreria.js`), botón "+ Anticipo a productor" junto a "+ Movimiento"/
     "+ Registrar gasto" — el lugar principal, per instrucción explícita del encargo.
  2. **Ficha de Proyecto** (`modulo-proyectos.js`), botón "+ Anticipo a productor" junto a
     "+ Registrar movimiento de línea" dentro de "Libro de la línea" (misma sección — un anticipo
     SÍ aparece en ese libro), con `ctx.proyecto` precargando el proyecto ya abierto.
- **Simplificación consciente:** como usa el mismo drawer único (`ERP.abrirPanel`, no un modal
  flotante aparte como `registrarMovLinea`), al cerrar tras un anticipo exitoso el panel regresa
  a la lista de fondo (Tesorería o Proyectos), NO reabre automáticamente la ficha del proyecto que
  estaba viendo — mismo comportamiento que ya tiene `capturarMovimiento` al invocarse desde una
  fila de Cobranza/Pagos. `marcarDatosSucios()` asegura que esa lista de fondo salga fresca en
  cuanto se vuelva a ver.
- **Verificado en navegador** (arnés con `comun.js`+`captura-rapida.js` reales, `ERP.sb.rpc`/`fetch`
  interceptados con fixtures de `v_proyectos`/`v_catalogo_cuentas`): el formulario con ambos
  puntos de entrada (`ctx={}` y `ctx={proyecto:'PRJ-002'}`, este último confirmando el prellenado
  de proyecto+productor); el payload exacto a `fn_anticipo_productor` en ambos casos; el aviso en
  vivo apareciendo y desapareciendo según el monto cruce la línea disponible; el toast de éxito
  con folio/saldo/línea; el error del backend mostrado tal cual; y el estado vacío cuando no hay
  proyectos elegibles.

**Archivos tocados:** `captura-rapida.js` (nueva función + export), `modulo-tesoreria.js` (botón),
`modulo-proyectos.js` (botón en "Libro de la línea"). `node --check` limpio en los 3. Sin cambios
a `estilos.css`/`index.html` (reusa `.form-erp`/`.campo`/`.aviso`/`ERP.crearCombo` existentes; el
script ya se carga antes que ambos módulos consumidores). NO desplegado — pendiente de
`npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-04 (Señal "listo para liquidar al productor" en 3 lugares)

Solo frontend, sin backend nuevo — 2 vistas ya desplegadas y con GRANT authenticated, verificadas
en vivo antes de programar: `v_liquidaciones_pendientes` (agrupada por productor: productor_id,
productor, n_cargas, bruto_total, folios, dias_max, severidad 'rojo'|'ambar') y
`v_agenda_operativa` (ya traía filas con `categoria='liquidar_productor'`, una por carga).

**1) Panel "Listas para liquidar" (`modulo-liquidaciones.js`).** Arriba de la lista, si
`v_liquidaciones_pendientes` trae filas: una card por productor (nombre, "N cargas · $bruto ·
hace N días", folios en mono, pill de severidad rojo/ámbar con acento `border-left` del mismo
color) y botón "Liquidación automática". El botón **reusa** la función
existente `nuevaLiquidacionAuto()` (no se duplicó) — se le agregó un parámetro opcional
`preseleccion {productorId, productorNombre, folios[]}`: precarga el combo de productor vía
`comboProductorAuto.seleccionar(...)` (dispara `alCambiar` de forma síncrona, así que los
checkboxes de embarques ya están en el DOM) y marca los folios de la card. Sin preselección, el
botón "Liquidación automática" de siempre se comporta exactamente igual que antes. Sin filas en
la vista, la sección no se pinta (nada de "no hay pendientes").

**2) Badge en el menú lateral (`index.html` + `app.js`)**, junto a "Liquidaciones al productor".
Clonado EXACTO del patrón de `badgeFlags` (Revisiones Pendientes) — no el de `badgeFaltantes`
(Datos faltantes), que oculta el item completo: aquí el item permanente se queda siempre visible,
solo el badge se oculta si el número es 0. `refrescarBadgeLiquidaciones()` suma `n_cargas` de
`v_liquidaciones_pendientes`, wireada en los 3 mismos puntos que los otros dos badges
(`sesionActiva`, `actualizar`, evento `erp:escritura`).

**3) Chip "Lista para liquidar al productor" (`modulo-cargas.js` Y `modulo-expediente.js`)** — se
agregó en ambas fichas de carga (la clásica y el Expediente, que es la vista primaria) para no
dejar un hueco de consistencia entre ellas. Cada una hace un fetch adicional en paralelo a
`v_agenda_operativa` filtrado por `folio` + `categoria=eq.liquidar_productor` (con `.catch(()=>[])`,
enriquecimiento no crítico); si hay match, se agrega `<span class="pill verde">Lista para liquidar
al productor</span>` al subtítulo del panel. `pintarFicha()` (cargas) y `pintarShell()`
(expediente) reciben la bandera ya resuelta — ningún cambio a `num_cargas` ni a otras secciones.

**Verificado en navegador** (arnés con `comun.js` + `app.js` + los 3 módulos reales, sesión
simulada vía mock de `supabase.createClient`, `fetch` interceptado con fixtures): las 4 cards
pintan con los datos correctos (incluida la pluralización "1 carga" vs "N cargas" y el pill
Urgente/Pendiente); el botón de la card de Agrofepac precarga el productor Y los 3 folios
(P-043/P-047/P-050), y el submit manda el payload exacto
`{p_productor_id:4, p_cargas:["P-043","P-047","P-050"]}` a `fn_crear_liquidacion_auto`; el badge
muestra 7 (=3+1+2+1) y se oculta correctamente tras un refresh con 0 filas; el chip aparece en
`verFichaClasica('P-043')` y en `verExpediente('P-043')` (folio en la señal) y está ausente en
ambas para `P-999` (folio fuera de la señal).

**Archivos tocados:** `modulo-liquidaciones.js`, `index.html`, `app.js`, `modulo-cargas.js`,
`modulo-expediente.js`. `node --check` limpio en los 4 `.js`. Sin CSS nueva (reusa
`.card`/`.pill`/`.badge`/`.seccion-head` existentes). NO desplegado — pendiente de
`npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-03 (Directorio Comercial — "última operación / recencia" en la ficha de contraparte, sitting 4)

Cuarto sitting sobre la ficha de contraparte (sitting 1: datos + WhatsApp; sitting 2: panel de
relación financiera; sitting 3: sección Programas — ver las 3 entradas anteriores de hoy). Solo
frontend, `modulo-catalogos.js`, sin backend nuevo.

**Línea "Última operación"**, al INICIO del cuerpo de la ficha (antes de "Contacto", arriba de
"Estado de cuenta"). Se une por **NOMBRE** contra
`v_contraparte_recencia(contraparte, ultima_operacion, dias_desde, n_ops)` — misma llave limpia de
los sittings previos, una fila por contraparte → `indexarPor()` normal (no `indexarPorLista()`,
a diferencia de Programas).

- **Formato:** "Última operación: `<fecha DD-mmm-YYYY>` (hace `<dias_desde>` días)".
- **Nota técnica:** este módulo NO tenía formateo de fechas todavía (a diferencia de
  facturas/liquidaciones/ventas/lotes) — se agregó el mismo helper local `fecha4()`
  (DD-mmm-YYYY) que ya usan esos módulos, sin centralizarlo en `comun.js` (sigue el patrón
  existente de duplicación local, no una refactorización de alcance mayor).
- **Semáforo v1 (simple, solo alerta):** ámbar + etiqueta "cuenta enfriándose" únicamente si
  `es_cliente` es true Y `dias_desde > 30`. Un proveedor con muchos días de por medio NO dispara
  la alerta (no es la misma señal de negocio) — verificado explícitamente.
- **Sin fila (contraparte sin cargas) → la línea se OMITE**, nunca "sin operaciones".
- **Fuera de alcance, no tocado:** el `num_cargas` del encabezado del panel, cualquier otra
  sección, backend.
- **Verificado en navegador** (arnés con `comun.js`+`modulo-catalogos.js` reales, `fetch`
  interceptado): un cliente con 5 días (texto plano, sin ámbar); un cliente con 45 días (ámbar +
  "cuenta enfriándose"); un proveedor con 63 días (sin ámbar, confirma el gate por `es_cliente`);
  y una contraparte sin fila en la vista (línea ausente del DOM). Confirmada la posición: primera
  línea del cuerpo, antes de "Contacto".

**Archivo tocado:** `modulo-catalogos.js`. `node --check` limpio. Sin cambios a
`estilos.css`/`index.html`. NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-03 (Directorio Comercial — sección "Programas" en la ficha de contraparte, sitting 3)

Tercer sitting sobre la ficha de contraparte (sitting 1: datos + WhatsApp; sitting 2: panel de
relación financiera — ver las 2 entradas anteriores de hoy mismo). Solo frontend,
`modulo-catalogos.js`, sin backend nuevo.

**Nueva sección "Programas"**, después de "Estado de cuenta". Se une por **NOMBRE** contra
`v_contraparte_programas(contraparte, rol, codigo, etiqueta, producto, estado, n_cargas)` — misma
llave limpia verificada en el sitting 2. A diferencia de las 4 vistas del sitting 2 (una fila por
contraparte), aquí una contraparte puede tener **varias filas** (varios programas, y hasta ambos
roles a la vez), así que se indexa con un helper nuevo `indexarPorLista()` → `Map<nombre, fila[]>`
(en vez de `indexarPor()`, que pisa y solo se queda con la última fila). Fetch con
`.catch(() => [])`, mismo criterio de degradar sin tumbar el módulo.

- **Sin filas → la sección se OMITE por completo** (no hay "sin programas" — la mayoría de
  gastos/socios no participan y no se quería ruido).
- **Con filas:** una línea por programa — `"<codigo> · <etiqueta>"` + pill de rol (`Compra` →
  `.pill.verde`, `Abastece` → `.pill.ambar`) + en gris chico "`N carga(s)`" y, solo si
  `estado != 'activo'`, el estado tal cual (ej. "por_arrancar"). Orden: rol `Compra` primero, luego
  `Abastece`, y dentro de cada rol por `codigo` ascendente.
- **Fuera de alcance a propósito** (como se pidió): el flag de consistencia divergente
  (`v_programa_relacion`, sitting aparte), Blue Book, rentabilidad por contraparte.
- **Verificado en navegador** (arnés con `comun.js`+`modulo-catalogos.js` reales, `fetch`
  interceptado): un cliente con 2 programas en rol Compra (orden correcto por código, y el
  sufijo de estado solo en el que NO está `activo`); un productor con 1 programa en rol Abastece
  (pill ámbar); una contraparte con AMBOS roles en el MISMO programa (confirmado que la línea
  Compra sale antes que la línea Abastece, pese a compartir código); y una contraparte sin ninguna
  fila (sección ausente del DOM, no solo vacía).

**Archivo tocado:** `modulo-catalogos.js`. `node --check` limpio. Sin cambios a
`estilos.css`/`index.html` (reusa `.ficha-*`/`.pill` existentes). NO desplegado — pendiente de
`npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-03 (Directorio Comercial — panel de relación financiera en la ficha de contraparte, sitting 2)

Sitting 2 de 2 sobre la ficha de contraparte (el sitting 1 —datos enriquecidos + botón WhatsApp—
quedó en la entrada anterior de hoy mismo). Solo frontend, `modulo-catalogos.js`, sin backend
nuevo — 4 vistas chicas ya con GRANT authenticated, verificadas en vivo antes de programar.

**Nueva sección "Estado de cuenta"**, al final de la ficha de detalle (después de Nota). Se une
por **NOMBRE** (no por id — verificado en backend como llave limpia, 0 huérfanos por igualdad
exacta con `v_catalogo_admin.nombre`) contra:
`v_cxc_cliente`, `v_cxp_proveedor`, `v_cxc_aging_cliente`, `v_dias_pago_observado`. Las 4 se
fetchean una sola vez en `traer()` (junto con `v_catalogo_admin`/productos/variedades) y se
indexan en `Map`s por `cliente`/`proveedor` con un helper genérico `indexarPor()`; cada fetch
tiene su propio `.catch(() => [])` para que un problema en una vista chica de enriquecimiento no
tumbe todo el Directorio Comercial (a diferencia de las 3 vistas núcleo, que sí propagan el error).

- **Si `es_cliente`:** bloque "Cuentas por cobrar" — Venta/Cobrado/Saldo (saldo en negrita, rojo
  si > 0). Si hay match en `v_cxc_aging_cliente`: línea Aging (Por vencer vs. Vencido, rojo si
  vencido > 0) + línea Desglose (0-30/31-60/61-90/90+) + si `en_flag` es true, chip `⚠ Alerta`
  (`.pill.rojo`) y línea "Días vencido máx". Si hay match en `v_dias_pago_observado`: línea "Días
  de pago" (Contratado/Observado/mediana, todos redondeados a enteros) con el Gap en un chip
  semáforo (`.pill verde` si ≤0, `.pill ambar` si 1–30, `.pill rojo` si >30) + conteo de embarques
  de contexto; si `pct_cxc >= 0.20` y el gap > 0, nota chica "Cliente de peso (…% de la CxC)
  pagando fuera de término". **Si no hay match en `v_cxc_cliente`:** el bloque igual se pinta (la
  contraparte SÍ está marcada como cliente) pero con "Sin saldo" — nunca se omite ni se inventa
  $0.
- **Si `es_proveedor`:** bloque "Cuentas por pagar" — Costo/Pagado/Saldo (saldo en negrita, ámbar
  si > 0), mismo criterio "Sin saldo" si no hay match.
- **Si es ambos:** se pintan los dos bloques, cada uno con su propio sub-encabezado.
- **Si NO es cliente ni proveedor** (contraparte `gasto`/`socio`/`operativo` sin ninguna de las 2
  banderas): la sección entera dice "Sin movimientos financieros registrados." — es el único caso
  que usa el mensaje genérico; con al menos una bandera activa siempre se pinta su bloque (con
  datos reales o "Sin saldo").
- Reutiliza clases ya existentes: `.ficha-seccion`/`.ficha-linea`/`.ficha-etq`/`.ficha-val` (mismas
  del sitting 1), `.neg`/`.pos`, `.pill` con sus variantes de color (`verde`/`ambar`/`rojo`) — sin
  CSS nueva en `estilos.css`. Los sub-encabezados "Cuentas por cobrar"/"Cuentas por pagar" son un
  `.ficha-linea` en negrita/verde (no un `.ficha-seccion` nuevo, para no duplicar visualmente el
  borde superior dentro de la misma sección "Estado de cuenta").
- **Fuera de alcance a propósito** (como se pidió): "última operación/recencia", Blue Book,
  rentabilidad por contraparte.
- **Verificado en navegador** (arnés con `comun.js`+`modulo-catalogos.js` reales, `fetch`
  interceptado con fixtures de las 4 vistas): un cliente de mayor peso con saldo + aging con
  `en_flag=true` + gap de 17 días (semáforo ámbar) + nota de "cliente de peso" (28%); un proveedor
  con saldo (semáforo ámbar en el monto); una contraparte "ambos" con saldo $0.00 en las dos
  cuentas (sin colorear, correcto); una contraparte marcada cliente sin ningún match ("Sin
  saldo"); y una contraparte sin ninguna bandera (`clase='socio'`) mostrando el mensaje genérico
  "Sin movimientos financieros registrados.".

**Archivo tocado:** `modulo-catalogos.js` (agregado `usd` a la destructuración de `ERP`, ya se
usaba `esc`/`num`/`q`/`rpc`/`norm`). `node --check` limpio. Sin cambios a `estilos.css`/`index.html`.
NO desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-03 (Directorio Comercial — ficha de detalle de contraparte enriquecida + botón WhatsApp)

Sitting 1 de 2 sobre la ficha de contraparte (el sitting 2, panel de relación financiera, queda
fuera de alcance a propósito). Solo frontend, `modulo-catalogos.js`, consumiendo `v_catalogo_admin`
(ya se leía en este módulo; sin backend nuevo).

**Bug 1 — botón WhatsApp:** en la ficha de detalle, junto a "Enviar correo" (que se dejó
**intacto**, mismo id/handler), se agrega un link "WhatsApp" (`<a target="_blank" rel="noopener"
href="https://wa.me/…">`) **solo si** `telefono_whatsapp` tiene valor. El número se sanea con
`.replace(/\D/g, '')` (ej. "52 6681 894888" → "526681894888").

**Mejora 2 — ficha reorganizada en 5 secciones**, mismo patrón "omitir vacíos" ya usado por los
bloques VENDOR/BILL-TO de los PDF (si el campo viene NULL/vacío, no se pinta ni la etiqueta ni la
línea) y las mismas clases ya existentes en este módulo (`.ficha-seccion`/`.ficha-linea`/
`.ficha-etq`/`.ficha-val` — no se inventó CSS nueva):
- **Contacto:** Persona (`contacto_nombre`) · Correo (`email`) · Teléfono/WhatsApp.
- **Términos:** Días de crédito · Alias (mismos chips del editor) · Rol (derivado de
  `es_cliente`/`es_proveedor`). Nota: se cambió el texto "Ambos" → **"Cliente y proveedor"** en
  `tipoDe()` — afecta también el pill de la columna "Rol" de la lista, cambio cosmético
  consistente en ambos lugares, no solo en la ficha.
- **Facturación:** Razón social · RFC/Tax ID · Correo de facturación.
- **Licencia PACA:** sección propia (antes vivía dentro de Facturación).
- **Direcciones:** Bill-to · Ship-to · Ciudad · País (antes Ciudad/País iba en una sola línea
  combinada; ahora son 2 líneas separadas, tal como se pidió).
- **Nota:** al final, si existe.
- **Verificado en navegador** (arnés con `comun.js`+`modulo-catalogos.js` reales, `fetch`
  interceptado con 3 fixtures): contraparte con los 20 campos completos (todas las secciones +
  WhatsApp con número saneado correcto), contraparte sin ningún dato de contacto/facturación
  (secciones vacías omitidas, botón correo deshabilitado, sin botón WhatsApp), y contraparte con
  datos parciales + `telefono_whatsapp=''` (string vacío, no solo `null` → botón WhatsApp
  correctamente ausente). Confirmado que "Enviar correo" no cambió de comportamiento.

**Archivo tocado:** `modulo-catalogos.js`. `node --check` limpio. Sin cambios a `estilos.css`
(reusa `.ficha-*`/`.alias-chip`/`.btn-mini` existentes). NO desplegado — pendiente de
`npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-03 (Backend E79: dirección del productor en PDF + picker de programa en SO)

Dos cambios chicos e independientes, backend ya entregado (sesión E79), consumido tal cual sin
tocar Supabase. Verificado en vivo antes de programar (técnica 42703/42501 sobre PostgREST).

**1. Dirección del productor en el PDF de Liquidación (`modulo-liquidaciones.js`).** Resuelve el
pendiente anotado el 2026-07-29. `v_liquidaciones` ganó 7 columnas aditivas: `productor_razon_social,
productor_rfc, productor_direccion, productor_ciudad, productor_pais, productor_email,
productor_paca` (confirmado en vivo — **NO existe `productor_tel`**, no se usó). `bloqueProductor()`
reescrita con el mismo patrón "omitir vacíos" del bloque VENDOR/BILL TO de Facturas/PO: nombre
(`productor_razon_social` con fallback a `productor`) · dirección · ciudad+país (una línea, coma
solo si ambos existen) · `RFC/Tax ID: …` · `PACA #: …` · email — cada línea se omite si el dato
viene NULL/vacío, nunca se inventa texto. El placeholder "— sin productor asociado —" se conserva
cuando no hay ni razón social ni nombre corto. No se tocó ningún monto/cálculo/deducción.
**Verificado en navegador** (arnés con `comun.js`+`modulo-liquidaciones.js` reales,
`ERP.membreteOficial`/`ERP.imprimirArea` interceptados): los 3 casos — productor con los 7 campos
completos, sin productor en absoluto (placeholder), y productor con nombre corto + solo
dirección/país (RFC/PACA/email correctamente omitidos) — pintan exactamente lo esperado.

**2. Picker de Programa comercial al crear una Orden de Venta (`modulo-ventas.js`).** Resuelve el
pendiente #2 de "Órdenes de Venta — pendientes tras C.1". `v_programas_comerciales` ahora expone
`id` (bigint) + `cliente_id` además de `codigo`/`etiqueta` (confirmado en vivo). El modal "Nueva
orden de venta" ganó un `<select>` "Programa comercial (opcional)": opción vacía "— sin programa —"
+ programas ordenados por `codigo`, texto = `etiqueta` (fallback a `codigo` si viene vacía). Se
filtra a los programas del `cliente_id` elegido (si no hay match o no hay cliente aún, muestra
todos — nunca deja el picker vacío). En el submit, `p_programa_id` viaja como `Number(id)` si se
eligió uno, o `null` si se dejó "— sin programa —" (nunca cadena vacía). Ningún otro parámetro de
`fn_crear_so` ni el toggle de params por Revenue Model se tocó.
**Verificado en navegador:** el filtro por cliente (2 programas de "Cliente X" vs. 1 de "Cliente Y");
el payload exacto de `fn_crear_so` con `p_programa_id` numérico al elegir un programa y `null` al
dejarlo vacío, con el resto de los parámetros idénticos a antes (incluido el toggle de RM).

**Archivos tocados:** `modulo-liquidaciones.js`, `modulo-ventas.js`. `node --check` limpio en
ambos. Sin cambios a `estilos.css`/`index.html` (ambos reusan clases y patrones existentes). NO
desplegado — pendiente de `npx vercel --prod` por Miguel.

---

## ✅ ACTUALIZACIÓN — 2026-08-02 (Cableado de 5 piezas de backend E76/E77 — T1 a T5)

Todo backend ya existía (E76 + CxP-lote E77); esta sesión fue **100% frontend**, consumiendo vistas
y RPCs ya desplegadas. Las 5 piezas se verificaron EN VIVO contra PostgREST (técnica 42703 columna
no existe / 42501 existe-protegida, y para RPCs: cuerpo vacío + firma exacta → `42501` confirma
existencia y firma correctas) antes de escribir una sola línea de código — ningún nombre de columna
ni parámetro se adivinó. Después se armó un arnés de navegador único (`comun.js` + los 6 módulos
tocados/nuevos reales, `fetch`/`ERP.sb.rpc` interceptados con fixtures) para confirmar el payload
EXACTO de cada RPC de escritura. **NO se desplegó — lo corre Miguel con `npx vercel --prod`.**

### T1 — Factura desde Orden de Venta (`modulo-facturas.js`)
- `v_facturas` ganó `so_folio` (columna nueva, `carga_folio` ahora puede ser NULL). RPC nueva
  `fn_crear_factura_desde_so(p_so_folio, p_numero)`.
- Botón "Factura desde Orden de Venta" junto a "+ Nueva factura": picker de `v_sales_orders`
  filtrado a `estado IN ('Confirmada','Cerrada') AND NOT anulado`. **Caso real de hoy (74 SO en
  Borrador → picker vacío) resuelto con un estado vacío dedicado:** "No hay Órdenes de Venta
  confirmadas — confírmalas primero" + lista de las SO en Borrador con botón "Confirmar SO" por
  fila (`fn_confirmar_so`) que recarga la vista in-place — no hay que salir a Órdenes de Venta.
- Lista y ficha muestran el origen (`Embarque X` / `Orden de venta Y`, columna nueva "Embarque/SO").
  `verFactura` ya NO consulta `v_cxc`/`v_carga_detalle` cuando `carga_folio` es NULL (antes hubiera
  mandado un filtro `eq.null` inútil) — Emitir no se bloquea por un estado de embarque que no aplica.
  Ruta legacy `fn_crear_factura(carga)` intacta.
- **Verificado:** payload exacto de `fn_crear_factura_desde_so` y `fn_confirmar_so`; el estado
  vacío con "Confirmar SO"; el Origen mostrado correctamente cuando `carga_folio` es NULL.

### T2 — Liquidación automática al productor (`modulo-liquidaciones.js`)
- RPC nueva `fn_crear_liquidacion_auto(p_productor_id, p_cargas text[], p_comision_pct DEFAULT 10, p_nota)`.
- Botón "Liquidación automática": productor (`v_catalogo_proveedores`) → multiselect de cargas
  candidatas (`v_carga_detalle` filtrado a `modalidad='consignacion' AND ingreso_venta>0` del
  productor elegido) → % comisión opcional. **`p_comision_pct` se OMITE del payload por completo
  si el campo queda vacío** (no se manda `null`) para que aplique el DEFAULT 10 real de la función
  — mandar `null` explícito lo hubiera pisado. Al crear, abre la ficha (mismo patrón que "Nueva
  liquidación": el backend calcula bruto/desglose, aquí no se captura nada a mano).
- **Verificado:** con comisión vacía el payload NO trae la llave `p_comision_pct`; con comisión
  capturada sí la trae con el valor exacto; el filtro de cargas candidatas excluye correctamente
  consignación sin venta capturada (`ingreso_venta=0`).

### T3 — Módulo nuevo "Embarques físicos" (`modulo-loads.js`)
Módulo nuevo (ruta `loads`, menú "🚛 Embarques físicos"), espejo estructural de `modulo-lotes.js`.
Un Load es la unidad LOGÍSTICA (contenedor/tráiler que cruza la frontera) — distinta de la Carga
(comercial) y del Lote (costeo); puede consolidar varias cargas.
- Vistas: `v_loads`, `v_load_cargas`, `v_carga_detalle` (picker). RPCs: `fn_crear_load` (todos los
  parámetros opcionales), `fn_asignar_carga_load`/`fn_desasignar_carga_load`, `fn_editar_load`
  (NULL=no tocar, se reusa también para "Cambiar estado" mandando SOLO `p_estado`),
  `fn_anular_load`. Estados fijos `en_origen→en_cruce→en_transito→entregado` (no hay vista
  catálogo para esto, a diferencia de `v_estados_carga`; se reusa el componente visual
  `.badge-estado` existente, sin CSS nueva).
- Ficha: header + Editar (form con NULL=no tocar) + Cambiar estado (select + botón, atajo sobre la
  misma RPC) + cargas consolidadas (asignar/quitar) + Documentos (`ERP.documentos.montar(cont,
  {entidad:'load', entidadId:folio})`) + Anular.
- **Pendiente NO verificable desde este frontend:** `entidad:'load'` es nueva para el sistema de
  documentos (el enum documentado en CLAUDE.md es `carga|contraparte|movimiento|general`). Si el
  backend aún no la acepta en el CHECK de `documentos`/`fn_registrar_documento`, la subida fallará
  con el error del backend tal cual (no se esconde) — anotado en PENDIENTES-BACKEND.md por si acaso.
- **Verificado:** payload exacto de las 5 RPCs de escritura (crear con opcionales en null, editar
  con prefill completo, cambiar-estado con solo `p_estado`, asignar/desasignar, anular con motivo
  obligatorio); toggle completo por `anulado` (sin botones de captura, banner de motivo).

### T4 — Eventos de Carga (`modulo-cargas.js` + `modulo-expediente.js`)
- `v_eventos_carga` ya trae `tipo` (nombre legible) y `tipo_codigo` resueltos — no hace falta cruzar
  con `v_evento_tipos` para pintar la lista, solo para el formulario. Columnas reales confirmadas en
  vivo difieren del nombre corto usado en el encargo: es `tipo`/`tipo_codigo` (no `tipo` a secas) y
  `contraparte`/`contraparte_id` (ambos existen).
- Nueva función `montarEventosCarga(contenedor, folio, permitir)` en `modulo-cargas.js`, expuesta
  como `ERP.montarEventosCarga` y montada en la ficha clásica y en la pestaña "Factura" del
  Expediente (mismo patrón que `montarVentasCarga`/`montarLoteCarga`).
- Lista (`v_eventos_carga`, solo vivos) con chip de tipo + botón "Anular" por fila (gate `editar`).
  Formulario "Registrar evento": el `<select>` de tipo sale de `v_evento_tipos` (activos, por
  `orden`); al elegir un tipo se pintan/exigen SOLO los campos que sus banderas piden
  (`exige_cajas`→Cajas, `exige_monto`→Monto, `exige_contraparte`→combo de `v_catalogo_admin`,
  `exige_so_destino`→combo de `v_sales_orders`) y se validan en cliente antes de llamar. Los demás
  parámetros de la RPC (`p_so_folio`, `p_sales_order_carga_id`, `p_ref_*`) no tienen bandera propia
  en el catálogo — se mandan siempre `null`, no se expusieron como campos (fuera de alcance del
  encargo).
- Fechas en esta sección usan `ERP.fecha()` (no un `fecha4` DD-mmm-YYYY local), por consistencia
  con el resto de `modulo-cargas.js`, que usa `ERP.fecha()` en sus ~15 usos existentes.
- **Verificado:** con dos tipos de prueba (uno cajas+SO-destino, otro monto+contraparte) el payload
  de `fn_registrar_evento_carga` trae EXACTAMENTE los campos que ese tipo exige y `null` en todo lo
  demás; la validación en cliente bloquea el envío si falta un campo exigido (sin llamar la RPC);
  `fn_anular_evento_carga` con el `p_id` correcto; `permitir=false` (carga anulada) oculta el botón
  de registrar y la columna de anular.

### T5 — Panel "CxP por lote" (`modulo-pagos.js`, solo lectura)
- Nueva sección debajo de "Próximos vencimientos": `v_cxp_lote` (lote_folio, contraparte_id,
  proveedor, costo, pagado_estimado, saldo_estimado), con selector "Agrupar por proveedor / por
  lote" — agrupado por proveedor (default) suma costo/pagado/saldo y cuenta lotes; agrupado por
  lote lista cada fila con click-through a la ficha del lote (`ERP.verLote`, mismo patrón que
  `montarLoteCarga`). Mismo aviso de "estimado por prorrateo" que ya usa el panel de proveedor.
- **Verificado:** ambos modos de agrupación con datos de 2 proveedores/3 lotes, totales correctos.

### Archivos tocados/nuevos
`modulo-facturas.js`, `modulo-liquidaciones.js`, `modulo-pagos.js`, `modulo-cargas.js`,
`modulo-expediente.js` (modificados) · `modulo-loads.js` (nuevo) · `index.html` (nav + `<script>`
de `modulo-loads.js`). `node --check` limpio en los 6 `.js` tocados. Sin cambios a `estilos.css`
(T3 reusa `.badge-estado`; T4/T5 reusan `.pill`/`.tabla-wrap`/`.card` existentes).

---

## ✅ ACTUALIZACIÓN — 2026-08-02 (Ripple D-66 en "Reparto a ventas" — pricing por renglón + desasignar por id)

**`modulo-lotes.js` YA QUEDA LISTO PARA DESPLEGAR** (esta entrada + la de "Inventario del lote"
de abajo van juntas en el mismo deploy — Miguel corre `npx vercel --prod` cuando quiera).

Ripple OBLIGATORIO: el backend (D-66, ya en producción de Supabase) quitó el `UNIQUE(lote,SO)` de
`v_lote_ventas` — el mismo lote puede venderse en varios renglones a precio distinto al MISMO SO
(multi-tramche) — y por eso cambió de firma `fn_desasignar_venta_lote` (ahora por `id` del
renglón, no por `(lote,SO)`; la firma vieja **ya no existe** y hubiera tronado en producción). Solo
se tocó la sección "Reparto a ventas"; "Inventario del lote" (agregada en la entrada de abajo, el
mismo día) NO se tocó y se re-verificó que sigue intacta.

- **Vista `v_lote_ventas` — 3 columnas nuevas** (verificadas en vivo antes de programar):
  `cliente_id`, `precio_caja`, `importe` (`importe = precio_caja × cajas_asignadas`, lo calcula la
  vista).
- **RPC `fn_asignar_venta_lote`** ganó el parámetro `p_precio_caja` (numeric, **opcional/nullable**
  — vacío en el formulario → `null`, nunca `0` ni `""`; consignación/comisión no llevan precio
  aquí). Orden de argumentos respetado tal cual el contrato: `p_lote_folio, p_so_folio,
  p_cajas_asignadas, p_precio_caja, p_pallets_asignados, p_nota`.
- **RPC `fn_desasignar_venta_lote` cambió de `(p_lote_folio, p_so_folio)` a `(p_id)`** — el id del
  renglón de `v_lote_ventas`. Cada fila de la tabla ahora lleva su propio `id` en el
  `data-desasig`, así que quitar un renglón de un SO con multi-tramche nunca borra el renglón
  equivocado (ni ambos).
- **UI:** el modal "Asignar a venta" ganó el campo "Precio por caja (USD, opcional)". La tabla de
  reparto ganó las columnas "Precio/caja" e "Importe" (`ERP.usd`, "—" si es `null`) — el mismo SO
  puede aparecer en más de una fila a distinto precio, eso es correcto y esperado.
- **Corrección de gating de paso:** al revisar el ripple se confirmó que "Quitar" debía gatearse
  por `ERP.puede('editar')` (el gate real de `fn_desasignar_venta_lote`), no por `'capturar'` como
  hacía antes (heredado de compartir el mismo flag que "Asignar a venta"). Se separó: **Asignar =
  `capturar`, Quitar = `editar`** — un rol solo-`capturar` ya no ve un botón que el backend le
  rechazaría.
- **Verificación:** `node --check`. **Flujo real en navegador** con fixture de DOS renglones del
  MISMO `so_folio` a precios distintos (`id` 1 y 2): confirmado el payload EXACTO de
  `fn_asignar_venta_lote` con `p_precio_caja` (un caso con 12.50, otro con el campo vacío → `null`,
  respetando el orden de parámetros); confirmado que "Quitar" en la fila `id=2` manda
  `fn_desasignar_venta_lote({p_id:2})` sin tocar el renglón `id=1`; confirmada la tabla pintando
  Precio/caja e Importe (y "—" en la fila sin precio, caso consignación); confirmada la separación
  de gates (`capturar`→ve Asignar+form de inventario pero no Quitar/Anular; `editar`→ve
  Quitar/Anular pero no Asignar). Re-verificado que "Inventario del lote" sigue 100% funcional
  (los seis indicadores, el formulario de merma/RTS y el toggle por lote anulado) — no se tocó.

---

## ✅ ACTUALIZACIÓN — 2026-08-02 (Ficha de Lote — sección "Inventario del lote", física, sin dinero)

**Actualización 2026-08-02 (mismo día): el ripple D-66 obligatorio ya se hizo (ver entrada arriba)
— `modulo-lotes.js` queda LISTO PARA DESPLEGAR con ambos cambios juntos.**

Sección nueva en la ficha de `modulo-lotes.js` (después de "Reparto a ventas", sin tocarla),
estilo "Silo Reconcile": estados físicos de la caja (ATS/vendido/merma/RTS/on-hand). NO tiene
campos de dinero — el dinero sigue viviendo en "Reparto a ventas" (Revenue Model/costos).

- **Vistas consumidas (solo lectura), verificadas en vivo columna por columna antes de programar**
  (técnica 42703/42501 sobre PostgREST, sin sesión real): `v_lote_inventario` (folio, proveedor,
  po_proveedor, carga_folio, carga_po, productos, total, sold, waste, rts, on_hand, ats, anulado —
  total/on_hand/ats pueden venir NULL, se pinta "—" y nunca 0) y `v_lote_movimientos` (id,
  lote_folio, tipo 'merma'|'rts', cajas, fecha, motivo, nota, capturado_por, capturado_ts, anulado,
  anulado_motivo, anulado_por, anulado_ts), filtrada por `lote_folio` y `anulado=eq.false`.
- **RPCs (firmas confirmadas en vivo, no adivinadas):**
  `fn_registrar_mov_lote(p_lote_folio, p_tipo, p_cajas, p_motivo, p_fecha, p_nota)` → gate
  `capturar`, devuelve `on_hand`; el backend topa Σ(vendido+merma+rts) ≤ total y su error se
  muestra tal cual (no se esconde con `.catch`). `fn_anular_mov_lote(p_id, p_motivo)` → gate
  `editar`.
- **UI:** seis indicadores (Total · Vendido · Merma · Devuelto a proveedor · On-hand · Disponible
  ATS) con el mismo estilo `.campo`/`.campo-fijo` ya usado en el resto de la ficha; formulario de
  captura (Tipo Merma/Devolución al proveedor, Cajas, Fecha —prellenada con la fecha LOCAL de hoy,
  no `toISOString()` que es UTC y se corre un día tras las 17:00 en Los Mochis—, Motivo obligatorio,
  Nota) visible solo si el lote está vivo y `ERP.puede('capturar')`; lista de movimientos vivos con
  chip `.mov-tipo` (Merma ámbar / Devolución azul) y botón "Anular" por fila solo si el lote está
  vivo y `ERP.puede('editar')`. Un lote anulado oculta formulario y botones de anular, igual que ya
  hacía el resto de la ficha.
- **Detalle de las fechas de movimiento:** se usa el helper `fecha4` ya existente en el archivo
  (formato `DD-mmm-YYYY`, regla dura de CLAUDE.md), no `ERP.fecha` (que da año a 2 dígitos) — así
  queda visualmente consistente con el resto de esta misma ficha.
- **Omitido a propósito (fase 2 del encargo, no ensucia el alcance de hoy):** las columnas
  "On-hand"/"ATS" en la LISTA de lotes — hubiera exigido otro fetch + join por folio en `render()`;
  se deja para una sesión futura si se pide.
- **Verificación:** `node --check` en `modulo-lotes.js`. **Flujo real en navegador** (arnés con
  `comun.js`+`modulo-lotes.js` reales, `fetch`/`ERP.sb.rpc` interceptados con fixtures): confirmado
  el payload EXACTO de `fn_registrar_mov_lote` (con `p_tipo` 'merma' y 'rts', fecha vacía → `null`,
  motivo obligatorio bloqueando la llamada en cliente) y de `fn_anular_mov_lote`; confirmado que un
  lote anulado NO pinta el formulario ni el botón "Anular" (ni de fila ni el general); confirmado
  el "—" en los seis indicadores cuando `total`/`on_hand`/`ats` vienen NULL; confirmada la fecha
  local por defecto (no UTC). No se tocó "Reparto a ventas" — se verificó que sigue funcionando
  idéntico.

---

## ✅ ACTUALIZACIÓN — 2026-07-31 (Módulo nuevo "Lotes" — Fase C.2)

Módulo nuevo `modulo-lotes.js` (ruta `lotes`, menú "📦 Lotes"), espejo estructural de
`modulo-ventas.js`. El Lote agrupa la materia prima comprada a un proveedor (con o sin embarque
puente transitorio) antes de repartirla entre productos capturados y órdenes de venta.

- **Archivos tocados:** `modulo-lotes.js` (nuevo), `index.html` (nav + `<script>`), `estilos.css`
  (chip `.lote-estado` vivo/anulado, solo dos estados — no hay texto libre como en OC/SO),
  `modulo-cargas.js` y `modulo-expediente.js` (sección "Lote" espejo de la carga, vía
  `ERP.montarLoteCarga`, opcional/fase 2 del encargo).
- **Vistas consumidas (solo lectura), todas verificadas EN VIVO columna por columna antes de
  programar** (técnica `42703` columna no existe / `42501` existe-protegida sobre REST, sin
  necesitar sesión real — mismo patrón ya usado en sesiones previas): `v_lotes`, `v_lote_items`,
  `v_lote_ventas`, `v_lote_cadena`, `v_catalogo_proveedores`, `v_catalogo_productos`,
  `v_sales_orders`, `v_carga_detalle`.
- **RPCs (firmas p_ confirmadas en vivo contra PostgREST, no adivinadas):**
  `fn_crear_lote(p_proveedor_id, p_cajas, p_pallets, p_po_proveedor, p_fecha, p_carga_folio, p_nota)`,
  `fn_agregar_item_lote(p_lote_folio, p_producto_id, p_cajas, p_nota)`,
  `fn_asignar_venta_lote(p_lote_folio, p_so_folio, p_cajas_asignadas, p_pallets_asignados, p_nota)`,
  `fn_desasignar_venta_lote(p_lote_folio, p_so_folio)`, `fn_anular_lote(p_folio, p_motivo)`.
- **Lista:** folio · proveedor · cajas · disponibles · asignadas · items · productos · costo total
  (con ⓘ avisando que hoy es DERIVADO del puente `carga_folio` — migrará a costo propio del lote en
  la re-ancla) · ventas · estado (chip Vivo/Anulado). Filtro Vivos (default) / Anulados / Todos +
  búsqueda por folio/proveedor/PO/producto. Export Excel/PDF.
- **Crear (modal):** proveedor (combo `v_catalogo_proveedores`, opcional), cajas (obligatorio, entero
  > 0), pallets (opcional), P.O. proveedor (opcional), fecha (opcional), embarque puente (picker
  opcional de `v_carga_detalle` con cajas visibles), nota. Muestra el folio devuelto y abre la ficha.
- **Ficha:** header solo-lectura. Sección "Productos" (`v_lote_items`) con botón "Agregar item"
  (combo `v_catalogo_productos` + cajas + nota opcional). Sección "Reparto a ventas"
  (`v_lote_ventas`) con `cajas_disponibles` del lote en grande, botón "Asignar a venta" (picker de
  `v_sales_orders` filtrado a `!anulado && estado NOT IN (Cerrada,Cancelada)` + cajas + pallets
  opcional + nota) y "Quitar" por fila. Sección opcional "Cadena / trazabilidad" (`v_lote_cadena`):
  embarque→proveedor→SO→cliente→Revenue Model. Botón "Anular lote" gateado en **rol `editar`**
  (más estricto que crear/capturar, tal como se pidió) con motivo obligatorio; los errores del
  backend (incluido el rechazo por repartos existentes) se muestran tal cual, nunca se esconden.
  Un lote anulado oculta los tres botones de captura y muestra el motivo en una leyenda.
- **Verificación:** `node --check` en los 3 JS tocados. **Flujo real en navegador** (arnés con
  `comun.js`+`modulo-lotes.js` reales, `window.fetch`/`ERP.sb.rpc` interceptados con fixtures):
  confirmado el payload EXACTO de las 5 RPCs (incluido el null-handling de campos opcionales en
  `fn_crear_lote`), el picker de "Asignar a venta" excluyendo correctamente SOs anuladas/Cerradas/
  Canceladas, la validación de motivo obligatorio al anular, y el toggle completo de secciones para
  un lote anulado (sin botones de captura, con banner de motivo). Preview visual con la CSS de
  producción confirmado por screenshot (mismo estilo que Órdenes de Venta/Compra).
- **Deploy:** NO desplegado en esta sesión — queda para Miguel (`npx vercel --prod`).

---


## ✅ ACTUALIZACIÓN — 2026-07-30 (Módulo nuevo "Órdenes de Venta" / Sales Orders — Fase C.1, E65/E66)

Módulo nuevo `modulo-ventas.js` (ruta `ventas`, menú "🧾 Órdenes de Venta"), espejo estructural de
`modulo-ordenes.js`. Hace operativa la Fase C: crear Sales Orders eligiendo Revenue Model por orden
y repartir cajas de embarques. Documento **interno** — sin PDF ni correo, a propósito (ERP_PP/D-55).

- **Archivos tocados:** `modulo-ventas.js` (nuevo), `index.html` (nav + `<script>`), `estilos.css`
  (chip `.so-estado` borrador/confirmada/cerrada/cancelada), `modulo-expediente.js` y
  `modulo-cargas.js` (sección "Órdenes de venta" en la pestaña factura del Expediente y en la ficha
  clásica, vía `ERP.montarVentasCarga`).
- **Vistas consumidas (solo lectura):** `v_sales_orders`, `v_sales_order_cargas`, `v_revenue_models`,
  `v_catalogo_clientes`, `v_carga_detalle`. Todas verificadas en vivo antes de programar.
- **RPCs:** `fn_crear_so`, `fn_asignar_carga_so`, `fn_desasignar_carga_so`, `fn_confirmar_so`,
  `fn_cerrar_so`, `fn_cancelar_so` (firmas confirmadas en vivo).
- **Lista:** folio · cliente · Revenue Model (rm_codigo + nombre) · estado (chip) · customer_po ·
  n_cargas · cajas_asignadas_total · días crédito. Filtros estado/cliente/texto + export Excel/PDF.
- **Crear (modal):** cliente (combo `v_catalogo_clientes`, **prellena días de crédito del cliente**,
  editable) + Revenue Model (combo `v_revenue_models`). **Los inputs de parámetro se muestran/ocultan
  según `formula_tipo` del RM** (catálogo, no hardcodeado): `comision_por_caja`→"Comisión por caja";
  `margen`→"Precio compra/caja"+"Precio venta/caja"; `pct_venta`→"% comisión"; `buy_resell`→sin
  inputs (mensaje "la utilidad se deriva de los costos"); un tipo desconocido cae a un mensaje
  defensivo. Opcionales: customer_po, cotización (folio), moneda (USD/MXN), incoterm, nota. Solo el
  param del modelo elegido viaja con valor; el resto van null.
- **Ficha:** header solo-lectura (con nota visible "el encabezado no se edita — no hay `fn_editar_so`;
  para cambiar cliente/RM, cancelar y recrear"). Sección "Cargas asignadas" (`v_sales_order_cargas`):
  en Borrador, botón "Asignar carga" (picker de embarques de `v_carga_detalle` con cajas visibles +
  cajas + precio/caja opcional → `fn_asignar_carga_so`, muestra `cajas_restantes_carga`) y "Quitar"
  por fila (`fn_desasignar_carga_so`). Botones de estado gateados por estado + rol: Borrador→Confirmar,
  Confirmada→Cerrar, Borrador/Confirmada→Cancelar con motivo. Errores del backend se muestran tal cual.
- **Verificación:** `node --check` en los 3 JS tocados. **Flujo real en navegador** (arnés con
  `comun.js`+`modulo-ventas.js` reales, `ERP.q`/`ERP.rpc` interceptados): confirmado el toggle de
  params por los 4 `formula_tipo`, el prefill de días, el payload EXACTO de `fn_crear_so` (para margen
  solo viajan precio compra/venta), la ficha con params del modelo, y las 3 RPCs de acción
  (confirmar/asignar/desasignar) con sus argumentos exactos, más `montarVentasCarga` en el Expediente.
  Desplegado (`npx vercel --prod`) y verificado en producción vía `curl`.
- **Decisión / límite:** `p_programa_id` se manda **siempre null** — ninguna vista expone el id bigint
  del programa (`v_programas_comerciales` solo trae `codigo`/`etiqueta`), así que no se puede poblar
  sin adivinar. Omitido del modal y anotado en PENDIENTES-BACKEND.md (regla dura: dato faltante en
  vista → pendiente de backend, no lectura de tabla ni `.catch`).

---


## ✅ ACTUALIZACIÓN — 2026-07-30 (CxP por proveedor: migrado a v_cxp_proveedor_atribuido)

Resuelve el pendiente #1 de la entrada de abajo. `modulo-pagos.js:109` (dentro de `render()`) —
cambiado `q('v_cxp_proveedor_real')` por `q('v_cxp_proveedor_atribuido')`. Mismos alias de
columna (`proveedor`, `cargas`, `costo`, `pagado`, `saldo_cxp`, `contraparte_id`), verificados en
vivo antes de tocar código — **no cambió ningún nombre de columna ni la lógica de render**
(`pintarProveedores` sigue igual). Se agregó un ⓘ discreto en el encabezado "Saldo CxP" (mismo
patrón `.info-nota` / `ERP.cablearInfoNota` ya usado en Finanzas para las notas de `v_balance`),
con el texto: "Pagado y saldo por proveedor son ESTIMADOS por prorrateo: los pagos se registran
a nivel carga, no por línea de costo." — hover muestra el tooltip nativo, tap/Enter dispara un
toast (accesible por teclado).

**Los números en pantalla cambian respecto a antes — es esperado, no un bug:** AGROFEPAC deja de
ser el "cajón de sastre" (backend E60/E62, ver `BITACORA-DECISIONES.md` D-49) y aparecen los
proveedores reales por línea de costo (Las Brisas, BBA, Suárez, Agricooling, etc.).

`node --check` OK. Smoke test puro (6/6) de la generación del `<th>` con el ⓘ: clase
`info-nota` presente, `data-nota`/`title` con el texto exacto, ícono visible, accesible por
teclado (`role="button"` + `tabindex="0"`), sin romper la etiqueta. Desplegado
(`npx vercel --prod`) y verificado en producción vía `curl` — cero menciones de
`v_cxp_proveedor_real` en el archivo servido. **Backend puede borrar `v_cxp_proveedor_real` en
cuanto confirme este deploy.**

---

## ⏳ PENDIENTE — 2026-07-30 (tras REESTRUCTURA E57–E61, ningún trabajo de frontend hecho aún)

Nota de rutina de documentación (no hay código nuevo esta entrada): la sesión backend E57–E61
aprobó el GATE de la REESTRUCTURA (dos ejes, Fases A–D — detalle en `PLAN-MAESTRO.md` y
`CLAUDE.md`) y dejó dos pendientes de UI explícitos:

1. **Reapuntar `modulo-pagos.js:108`** de `v_cxp_proveedor_real` (parche de E56, re-atribuye
   solo en lectura) a **`v_cxp_proveedor_atribuido`** (E61, fuente real por línea vía
   `carga_costos.contraparte_id`, mismas columnas). **Aún no se hace**: el backend marca
   pagado/saldo de la vista nueva como ESTIMADOS por prorrateo (los pagos siguen capturados a
   nivel carga, no por línea) — falta que E62 atribuya pagos por línea antes de que el cambio
   sea un drop-in tan limpio como el de E56. Confirmar con Miguel antes de repuntar.
2. **Rediseño visual (Fase 3 de la REESTRUCTURA):** tokens + guía de componentes. Dirección
   acordada en E57 (mockup de Embarques como referencia). **Fase 3 NO inventa estilos nuevos** —
   usa los ya existentes del dashboard actual (paleta verde/ámbar/rojo, tipografía, densidad).
   Sin sesión de frontend asignada todavía.

---

## ACTUALIZACIÓN — 2026-07-29 (CxP por proveedor: corrección AGROFEPAC/Papayas & More)

`modulo-pagos.js:108` — cambiado `q('v_cxp_proveedor')` por `q('v_cxp_proveedor_real')` (drop-in
del backend, mismas columnas + `contraparte_id` opcional) en el resumen "Saldo por proveedor". No
se tocó `v_cxp_proximas` (línea 109, próximos vencimientos) ni ningún otro call site — era el
único. `node --check` OK. Desplegado (`npx vercel --prod`) y verificado en producción vía `curl`.

---

## ACTUALIZACIÓN — 2026-07-29 (Guía suave de producto por contraparte + "Nueva carga desde programa", E55)

Backend E55: `v_contraparte_productos(contraparte_id, contraparte, rol, producto_id, producto,
en_programa, en_historico)` y `v_programa_captura(codigo, etiqueta, modalidad,
termino_proveedor, venta_tipica_carga, cajas_tipicas_carga, cliente_*, proveedor_*,
producto_ids, productos[jsonb])`. Verificadas en vivo antes de programar.

- **`comun.js` — `ERP.crearCombo` ampliado** (componente compartido por TODO el ERP, cambio
  100% aditivo — ningún otro combo del sistema manda `destacado` hoy, así que su comportamiento
  no cambió):
  - `items` ahora acepta un flag opcional `destacado: true`; el combo los ordena primero
    (orden estable, no revuelve el resto) y los marca con ★ — nunca oculta ni deshabilita las
    demás opciones.
  - Método nuevo `actualizarItems(nuevos)`: reemplaza el catálogo del combo en caliente (sin
    recrearlo, sin perder lo que el usuario ya escribió) — la pieza que permite reordenar el
    dropdown de producto cuando cambia la contraparte elegida.
  - Método nuevo `seleccionar({id, nombre})`: selección programática (dispara `alCambiar` igual
    que si el usuario hubiera elegido de la lista) — la pieza que permite la precarga "desde
    programa".
- **TAREA 1 — Guía suave de producto por contraparte** (`modulo-cargas.js`, Nueva carga y
  Editar carga): al elegir cliente o proveedor, se destacan/ordenan primero los productos que
  esa contraparte ya mueve (`v_contraparte_productos`). **Nunca bloquea:** si el usuario elige
  otro producto de todos modos, se le avisa con un `<div class="aviso warn">` no bloqueante
  ("Este producto no está en el historial de {contraparte} — ¿combo nuevo?") y la selección se
  completa igual. Un fallo de red al pedir el historial cae a "sin destacar" — nunca rompe la
  captura.
- **TAREA 2 — "Nueva carga desde programa"** (`modulo-cargas.js`, solo Nueva carga): selector
  nuevo con la lista de `v_programas_comerciales` (código + etiqueta). Al elegir uno, lee
  `v_programa_captura` y precarga cliente, proveedor y modalidad (vía `combo.seleccionar()`); el
  producto se precarga directo si el programa trae uno solo, o se destaca entre varios para
  elegir (mismo mecanismo de destacado de la TAREA 1) si trae más. **Es precarga, no candado:**
  ningún campo queda deshabilitado, todo se puede corregir después. Días de crédito y
  direcciones (que `fn_crear_carga` no recibe como parámetro) se muestran como panel informativo
  de solo lectura debajo del selector — no se envían a ninguna RPC. Se agregó la opción
  **"Comisión"**, que faltaba en el `<select>` de modalidad de Nueva carga (ya existía en Editar
  carga) — sin ella, un programa de modalidad `comision` habría precargado un valor inválido en
  el select.

`node --check` OK en los 2 archivos JS; CSS balanceada. **Flujo real en navegador** (no solo
vista estática): arnés de prueba con `comun.js`/`modulo-cargas.js` reales cargados en una página
aparte, `ERP.q` interceptado con datos de prueba (sin backend real) — se confirmó por consola y
por lectura del DOM: (1) al elegir un cliente, sus 2 productos históricos suben al principio del
combo con ★; (2) elegir un producto fuera de ese historial dispara el aviso exacto y la
selección se completa sin bloqueo; (3) elegir un programa precarga cliente/proveedor/producto/
modalidad y pinta el panel informativo, con los 3 campos siguiendo editables (`disabled: false`
verificado). Desplegado (`npx vercel --prod`) y verificado en producción vía `curl`.

---

## ACTUALIZACIÓN — 2026-07-29 (Liquidación con membrete de familia + consolidación de PDF de Invoice)

Dos tareas, un solo deploy. Sin cambios de backend.

- **Liquidación al productor (`modulo-liquidaciones.js`) rediseñada al estilo de la familia:**
  `htmlImpresion` dejó de usar `ERP.encabezadoImpresion` (header viejo blanco+texto verde) y ahora
  usa `ERP.membreteOficial('LIQUIDACIÓN AL PRODUCTOR / ACCOUNT OF SALES', [FECHA, LIQ #, PRODUCTOR])`
  — mismo header claro+logo+acento salvia que Invoice/PO/Quote — y agrega `ERP.pieOficial()`
  (footer verde) al final, que antes no existía. `LIQ #` pasó de `'— borrador'` a `'BORRADOR'`
  (mismo formato que el resto de la familia). El bloque "PRODUCTOR" ahora usa el mismo patrón
  "omitir vacíos" que VENDOR/BILL TO (placeholder `— sin productor asociado —` si no hay nombre).
  La tabla CONCEPTO/NOTA/MONTO, GROSS SALES y las deducciones por categoría (DEDUCTIONS/CUSTOMS/
  DUTIES) **no cambiaron de contenido ni semántica** — ya usaban las clases compartidas
  (`.inv-items`/`.inv-box-h`) así que el estilo de familia ya les aplicaba. **Nuevo:** si
  `descuadre` es distinto de cero (mismo centinela `hayDescuadre()` que ya gatea "Emitir" en la
  ficha), el PDF ahora muestra una fila `⚠ DESCUADRE` en rojo — antes el PDF no lo mostraba en
  absoluto. Sin leyenda PACA (no aplica, solo Invoice la lleva). **Pendiente anotado en
  PENDIENTES-BACKEND.md:** `v_liquidaciones` no trae dirección del productor (solo nombre); el
  bloque PRODUCTOR se queda con lo que hay, no se inventó nada.
- **Invoice: un solo botón de PDF (`modulo-facturas.js`).** Se retiró el flujo viejo completo
  (`imprimir()`, `htmlImpresion()`, `filaLineaImpr()`, el botón "Imprimir / PDF" y su wiring) —
  basado en `v_facturas` + `ERP.encabezadoImpresion`, sin el membrete nuevo. Queda solo
  "Generar/Descargar Invoice (PDF)" (`v_documento_invoice` + membrete compartido). `enviarCorreo()`
  ahora dispara `generarInvoiceOficial(f.id)` en vez de la función eliminada. `leyendaPaca()` se
  conservó intacta (la sigue usando el flujo oficial). Sin referencias colgando verificado por
  grep antes de desplegar.

`node --check` OK en los 2 archivos. **Vista previa visual real en navegador** con la CSS de
producción antes de desplegar: Liquidación se ve como la familia (logo + dirección de Plein +
acento salvia + título verde + pie verde) en 3 casos (normal, con descuadre, sin productor); la
fila DESCUADRE solo aparece cuando corresponde. Ficha de Facturación confirmada con **un solo**
botón de PDF (captura del bloque de acciones). Desplegado (`npx vercel --prod`) y verificado en
producción vía `curl`.

---

## ACTUALIZACIÓN — 2026-07-29 (Numeración oficial de documentos — PO-2026-#### / QT-2026-####, E55)

Backend E55 agregó `numero` (formato `PO-2026-0001` / `QT-2026-0001`, NULL en Borrador, se llena
solo al pasar a "Enviada", nunca se reasigna) a `v_documento_po`, `v_documento_quote`,
`v_ordenes_compra` y `v_cotizaciones`. Verificado en vivo antes de programar. El frontend **solo
lee** `numero` — no lo genera ni lo calcula.

- **`modulo-ordenes.js` (Purchase Order oficial, `htmlPOOficial`):** la línea de meta "PO #"
  ahora muestra `po.numero || 'BORRADOR'` (antes mostraba el folio interno). Se agregó una fila
  "REF. INTERNA" con el folio de trabajo (`OC-0002`) para poder localizar el documento aunque
  siga en borrador — se muestra siempre, no solo mientras no tiene número oficial.
- **`modulo-comercial.js` (Quote oficial, `htmlQuoteOficial`):** mismo cambio en "QUOTE #"
  (`qt.numero || 'BORRADOR'`) + fila "REF. INTERNA" con el folio (`COT-0001`). El botón de PO en
  la ficha "orden" de este módulo ya usa `ERP.generarPOOficial` (compartido con Órdenes de
  Compra), así que quedó cubierto por el mismo cambio sin tocarlo aparte.
- **Columna "N° oficial" en las listas:** agregada junto a la columna de Folio existente (no la
  reemplaza) en la lista de Órdenes de Compra (`modulo-ordenes.js`, sobre `v_ordenes_compra`) y
  en la lista compartida de Comercial (`modulo-comercial.js`, sirve tanto la pestaña
  "cotización" sobre `v_cotizaciones` como la pestaña "orden" sobre `v_ordenes_compra`). Muestra
  `numero` o `—` si es NULL — nunca vacío ni la palabra "null".

`node --check` OK en los 2 archivos tocados. Smoke test puro (9/9): PO/Quote enviada muestran el
número oficial, borrador muestra "BORRADOR", la referencia interna siempre trae el folio, y la
columna de lista cae a "—" ante `numero` null o ausente (no revienta, no inventa texto). **Vista
previa visual real en navegador** con la CSS de producción antes de desplegar: PO y Quote en
Borrador muestran "BORRADOR" + "REF. INTERNA"; en Enviada muestran `PO-2026-0001`/`QT-2026-0001`
manteniendo la referencia interna visible — confirmado con captura de los 4 casos (PO borrador,
PO enviada, Quote borrador, Quote enviada). Desplegado (`npx vercel --prod`) y verificado en
producción vía `curl`.

---

## ✅ CIERRE DE SESIÓN — 2026-07-28 (E54): DESPLEGADO Y VERIFICADO EN PRODUCCIÓN

Sesión E54 (backend resuelto en el chat de trabajo de Miguel; frontend construido y desplegado
en esta sesión). Todo quedó **desplegado en producción** (`npx vercel --prod`, proyecto
`erp-plein-dashboard`) y **verificado vía `curl`** contra los archivos servidos. Dos entregables:

1. **Variedad de producto, de punta a punta:** selector de variedad dependiente del producto en
   Nueva carga y Editar carga (`modulo-cargas.js`), y mini-pantalla de catálogo con alta de
   producto/variedad (`modulo-catalogos.js`).
2. **Documentos oficiales con membrete real de Plein:** Invoice, Purchase Order y Quote, los tres
   compartiendo el mismo membrete/tabla de renglones/footer (nuevo bloque compartido en
   `exportar.js`), sin duplicar markup entre los tres módulos que los generan.

Detalle completo de cada uno en las secciones de abajo. Las decisiones de negocio detrás de esta
sesión (separar variedad del nombre del producto, Espárrago Convencional/Orgánico, fusión
Las Brisas=AGROFEPAC por RFC, modelo de calibre de Presentaciones) están documentadas en
`BITACORA-DECISIONES.md` (D-35 a D-39) — ese archivo es la fuente de verdad del *por qué*;
aquí solo se documenta el *qué* se construyó en el frontend.

---

## ACTUALIZACIÓN — 2026-07-28 (Variedad de producto: captura/edición en Embarques + catálogo, E54)

Backend E54 entregó las tablas `variedades`/`presentaciones`, las columnas `cargas.variedad_id` /
`productos.activo`, las RPCs `fn_alta_producto` / `fn_alta_variedad` / `fn_set_variedad_carga`, y
las vistas `v_catalogo_variedades` y `v_carga_detalle` ampliada (`variedad_id`, `variedad_nombre`).
Verificado en vivo antes de programar (patrón 42501=existe-protegida / PGRST202=no-existe).

- **`modulo-cargas.js` — selector de Variedad dependiente del producto**, en los dos flujos de
  captura:
  - **Nueva carga:** el selector solo se activa cuando se elige un producto EXISTENTE del
    catálogo (si el usuario escribe uno nuevo vía "+Nuevo", no hay `producto_id` que filtrar).
    Lee `v_catalogo_variedades` filtrando por `producto_id` — **nunca la tabla `variedades`**
    directo (regla dura: frontend solo consume vistas/RPCs). Al crear la carga, si se eligió
    variedad, se llama `fn_set_variedad_carga` como paso secundario (mismo patrón que
    `fn_asignar_responsable`: si falla, la carga ya quedó creada, se avisa sin revertir).
  - **Editar carga:** el selector **precarga** la variedad ya asignada (`d.variedad_id`, que
    `v_carga_detalle` ya expone). Al guardar, `fn_set_variedad_carga` solo se llama si el valor
    final **difiere** del inicial — evita llamadas innecesarias y, como el valor actual siempre
    está a la vista, no hay riesgo de borrar una variedad por accidente.
  - Guardia anti-carrera: si el usuario cambia de producto varias veces rápido, una respuesta
    tardía de `v_catalogo_variedades` ya no pisa la lista del producto actual (contador de
    petición por instancia del selector).
- **`modulo-catalogos.js` — mini-pantalla de catálogo** (extendida la pestaña "Productos" ya
  existente en Directorio Comercial, no se creó una pantalla nueva):
  - Alta de producto ahora acepta **"Código de ítem"** opcional → `fn_alta_producto(p_nombre,
    p_codigo_item)`.
  - Cada producto lista sus **variedades** (chips) con botón "+ Variedad" (solo admin) que abre
    un formulario y llama `fn_alta_variedad(p_producto_id, p_nombre)`.

`node --check` OK. Smoke test puro (10/10 en la iteración de precarga/diff + 9/9 en la primera
iteración de agrupación/gate): agrupación de variedades por producto, precarga marca la opción
correcta, el gate por diff no llama si no hay cambio real, sí llama en cambio/borrado/alta,
guardia anti-carrera no deja que una respuesta vieja pise la actual. Desplegado y verificado en
producción vía `curl` en cada iteración.

---

## ACTUALIZACIÓN — 2026-07-28 (Documentos oficiales: Invoice, Purchase Order y Quote con membrete Plein, E54)

Construidos en 3 iteraciones sobre el mismo backend (`v_documento_invoice`, `v_documento_po`,
`v_documento_quote`, las 3 verificadas en vivo antes de programar): primero el Invoice con banda
verde, luego el ajuste a header claro + leyenda PACA (feedback de Miguel), y por último Purchase
Order y Quote reutilizando el mismo membrete ya aprobado.

- **`exportar.js` — membrete compartido por los 3 documentos** (nuevo, para no duplicar):
  `ERP.membreteOficial(titulo, filasMeta)` (header claro: logo directo sobre fondo claro,
  dirección fija de Plein debajo, título en verde de marca `#196B24` a la derecha, acento salvia
  `#E4EFE7` tipo abanico decorativo en la esquina), `ERP.pieOficial()` (footer verde con contacto
  y "Thank you for your business!"), `ERP.tablaLineasDoc(lineas)` (tabla de renglones ITEM# /
  DESCRIPTION / QTY / UNIT PRICE / TOTAL, mismo formato `lineas` JSON en los 3), y
  `ERP.bloqueEmpresaPlein()` (bloque "Plein Produce LLC" + dirección, para el BILL TO fijo del PO).
- **`modulo-facturas.js` — Invoice**: botón "Generar/Descargar Invoice (PDF)" en la ficha de la
  factura (adicional al "Imprimir / PDF" ya existente, no lo reemplaza). BILL TO / SHIP TO se
  arman campo por campo desde `v_documento_invoice` (`bill_to_nombre/direccion/ciudad/pais/tel`),
  omitiendo los vacíos. TOTAL sale del campo `total` de la vista (no de recalcular); cualquier
  diferencia contra la suma de líneas se muestra como OTHER, nunca se oculta un descuadre (mismo
  criterio que el centinela de `v_balance`). Lleva la **leyenda PACA** (misma fuente que el PDF
  viejo, `v_config` clave `factura_leyenda_paca` — no se reescribió).
- **`modulo-ordenes.js` — Purchase Order**: botón "Generar PO (PDF)" en la ficha de la orden.
  Bloque de contraparte = **VENDOR** (proveedor, mismo patrón de omitir vacíos) + **BILL TO**
  fijo con los datos de Plein. Meta: DATE / PO# / TERMS (`condiciones` si existe, si no
  `NET {dias_credito}`, si no un guion) / ENTREGA EST. SUBTOTAL/TOTAL directos de
  `v_documento_po` (sin recalcular). Expuesto como `ERP.generarPOOficial` para que
  `modulo-comercial.js` lo reutilice sin duplicar código.
- **`modulo-comercial.js` — Quote**: botón "Generar Quote (PDF)" en la ficha de cotización.
  Bloque BILL TO del cliente (mismo patrón que Invoice). Meta: DATE / QUOTE# / VALID UNTIL.
  El mismo botón, en la ficha de "orden" de este mismo módulo (que apunta a la misma orden de
  compra que `modulo-ordenes.js`), llama a `ERP.generarPOOficial` — el PO se agregó a **las dos**
  pantallas donde una orden de compra es visible hoy, para no dejar ninguna sin el botón.
- **Bug de layout encontrado y corregido en `estilos.css`** (afectaba a los 3 documentos,
  incluido el Invoice ya deployado): `.inv-totals` (la tabla de totales) se auto-expandía a
  ~690px por su layout de tabla sin `table-layout:fixed`, dejando la caja de comentarios/
  condiciones de al lado en ~2px de ancho (invisible). Se encontró al hacer la vista previa
  visual del PO/Quote en navegador real, no en el Invoice original (donde pasó inadvertido).
  Fix: `width` fijo (no `min-width`) + `flex:0 0 auto` en `.inv-totals`, `min-width:0` en
  `.inv-comments`.

`node --check` OK en los 4 archivos JS tocados en cada iteración; CSS con llaves balanceadas.
Smoke test puro por iteración (13/13, luego 12/12 adicionales para PO/Quote): BILL TO/SHIP TO/
VENDOR omiten vacíos, BORRADOR cuando no hay número, TERMS con fallback, reconciliación de
totales sin ocultar descuadres. **Vista previa visual real en navegador** (Chrome DevTools) con
la CSS de producción antes de cada deploy — así se detectó el bug de `.inv-totals` y se corrigió
antes de dar el trabajo por bueno. Desplegado y verificado en producción vía `curl` en cada
iteración.

---

## ✅ CIERRE DE SESIÓN — 2026-07-28 (E52): DESPLEGADO Y VERIFICADO EN PRODUCCIÓN

Toda la sesión de hoy quedó **desplegada en producción** (`npx vercel --prod`, proyecto
`erp-plein-dashboard`, URL `erp-plein-dashboard.vercel.app`) y **verificada vía `curl`** contra los
archivos servidos. Entregables del día:
1. **Botón "Enviar por correo"** (mailto interino + descarga del PDF) en Facturación.
2. **Directorio comercial enriquecido:** alta y edición de contraparte con 11 campos nuevos agrupados
   (Contacto / Facturación / Direcciones).
3. **Ficha de detalle de contraparte** (solo lectura, todos los roles) con botón de correo.
4. **Estándar visual unificado de los documentos impresos** — verde de marca **#196B24**.
5. (Antes en el día) módulos **Inventario** y **Liquidaciones** (GROSS SALES + deducciones por
   categoría), **LOTE** y **leyenda PACA** al pie de la factura.

Contrato backend↔frontend vigente registrado en **CLAUDE.md** (sección "CONTRATO VIGENTE tras E52").
Sin cambios de backend desde este entorno; solo consumo de vistas/RPCs ya desplegadas.

---

## ACTUALIZACIÓN — 2026-07-28 (Botón "Enviar por correo" en Facturación + Directorio comercial enriquecido)

Dos tareas de frontend sobre backend E52 ya desplegado.

### TAREA A — Botón "Enviar por correo" (mailto) en Facturación
Se completó el botón que había quedado a medias en `modulo-facturas.js`: el listener
(`factEnviarCorreo → enviarCorreo(f)`) ya existía, faltaba la función. Se creó `enviarCorreo(f)` junto a
`imprimir()`:
- **Para:** `f.cliente_email` (que `v_facturas` ahora expone). Si es null, el helper avisa "el cliente no
  tiene email en el catálogo — captúralo en Directorio Comercial" y **no** aborta el resto.
- **Asunto:** `Plein Produce — Invoice {numero}`.
- **Cuerpo:** saludo + "Adjunto la factura {numero} por {total}. Términos: {terminos}." + firma.
- El botón solo aparece si `f.estado === 'emitida'` (los borradores no se envían).
- Usa el helper compartido `ERP.enviarPorCorreoDoc()`: abre el `mailto` con un `<a>` temporal (sin
  recargar la SPA) y, como el mailto **no adjunta archivos**, dispara la descarga del PDF (`imprimir(f.id)`)
  y muestra el aviso "Adjunta el PDF que se acaba de descargar antes de enviar".

### TAREA B — Alta/edición de cliente/proveedor enriquecidas + ficha de detalle
El registro de contrapartes era pobrísimo (solo nombre/clase/rol/alias/días/nota). Backend E52 amplió
las RPCs y la vista `v_catalogo_admin` (ahora 20 columnas, las 11 nuevas verificadas en vivo). Cambios en
`modulo-catalogos.js`:
- **11 campos nuevos** agrupados visualmente en **Contacto** (persona, teléfono/WhatsApp, correo general),
  **Facturación** (razón social, RFC/Tax ID, correo de facturación/AP, licencia PACA) y **Direcciones**
  (bill to, ship to, ciudad, país). Un único helper `camposExtendidos(pref, c)` genera el mismo bloque
  para el alta (prefijo `ct`, vacío) y la edición (prefijo `ed`, precargado desde la vista) — sin
  duplicar HTML. Definición única en `CAMPOS_EXT` `[sufijoId, columnaVista, paramRPC]`.
- **Alta** (`fn_alta_contraparte`): `leerExtendidosAlta('ct')` — vacío → null (no se setea).
- **Edición** (`fn_editar_contraparte`): `difExtendidosEdicion('ed', c)` respeta la convención
  **NULL = no tocar**: solo viaja lo que el usuario cambió respecto a la vista; si borró un campo que
  tenía valor, viaja `''` para limpiarlo. Se eliminó el bloque manual de direcciones (lo subsume el helper).
- **Ficha de detalle (solo lectura, TODOS los roles):** el nombre de cada fila ahora es un enlace que abre
  `fichaContraparte(c)` — un panel con la info agrupada (cada sección/línea se pinta solo si tiene dato,
  nunca en blanco engañoso) + **botón "Enviar correo"** (mailto a `email_facturacion` si existe, si no a
  `email`; deshabilitado si no hay ninguno) + botón "Editar" (solo admin, salta a la edición). Antes solo
  el admin podía ver algo de la contraparte (vía el botón Editar); ahora cualquiera consulta y contacta.

`node --check` OK en `modulo-catalogos.js`, `modulo-facturas.js`, `comun.js`. Smoke test puro de la lógica
del differ (11/11): sin cambios → todo null; email cambiado viaja; campo borrado → `''`; whitespace no
cuenta como cambio; alta vacío → null. Desplegado y verificado en producción vía `curl`
(`enviarCorreo`/`factEnviarCorreo` en facturas; `camposExtendidos`/`difExtendidosEdicion`/`fichaContraparte`/
`CAMPOS_EXT` en catálogos; `grupo-form`/`ficha-cp`/`cp-nombre-link` en el CSS).

---

## ACTUALIZACIÓN — 2026-07-28 (Estándar visual unificado de los documentos impresos — verde de marca #196B24)
Unificación de la familia visual de los documentos oficiales con los templates .docx de Plein. Los
**3 documentos DOM** (INVOICE, PURCHASE ORDER, ACCOUNT OF SALES/settlement) ya compartían el header
`ERP.encabezadoImpresion()` + las clases CSS `.inv-*`, así que el grueso se resolvió en esos dos
puntos y aplicó a los tres de un golpe.

- **Verde de marca #196B24** (antes #1E5B3A): cambiado SOLO en las reglas de impresión de `estilos.css`
  (`.inv-title`, `.inv-box-h`, `.inv-items th`, `.inv-grand`, y el nombre de empresa) — la variable
  `--verde` de la UI de la app **NO se tocó** (habría recoloreado toda la interfaz). También se alineó
  el verde de los PDF jsPDF (`exportar.js` ×7 y la cotización en `modulo-comercial.js`) a RGB
  `25,107,36` = #196B24, para consistencia de marca en todo lo que se imprime/exporta.
- **Header rediseñado** (`encabezadoImpresion`): **IZQUIERDA** = logo + bloque de empresa Plein
  (nombre + dirección + contacto); **DERECHA** = título del documento + tabla meta (número/fecha/
  términos). El nombre cae a la constante `EMPRESA` ('Plein Produce LLC', fuente única, en mayúsculas
  vía CSS). **Dirección/contacto son config-driven**: nuevo helper `ERP.empresaImpresion()` los lee de
  `v_config` (claves `empresa_direccion`/`empresa_contacto`, una lectura cacheada compartida por los 3
  docs) y **solo los pinta si existen — NUNCA inventa una dirección legal** (mismo criterio que la
  leyenda PACA). Threaded por los 3 documentos (fetch en `imprimir`, pasado a `htmlImpresion`).
- **Tabla de líneas del INVOICE**: `<colgroup>` con los anchos del template (19/34/10/19/19 %),
  header verde, **QTY y UNIT PRICE centrados** (clase `.ctr` nueva) y **TOTAL a la derecha** (`.num`).
  Cajas BILL TO / SHIP TO y "Comments" al pie sin cambios de estructura; la leyenda PACA sigue debajo
  de comentarios. Términos ya salían como "NET {dias}".

`node --check` OK en los 5 archivos + smoke test puro del header: layout (logo+empresa a la IZQ
antes del meta a la DER); nombre por defecto (`EMPRESA`) sin config; dirección/contacto pintados solo
si vienen (multilínea → `<br>`, sin inventar); parseo de `v_config` (nombre de config sobreescribe el
default; claves ausentes → default); `esc` no rompe con `&`/`<`. Desplegado y verificado en producción
(#196B24 en el CSS de print, `inv-head-left`/`inv-company`/`empresaImpresion`/`25,107,36` en
exportar.js, colgroup/empresa en invoice, threading en PO/settlement/cotización — todo vía `curl`).

**Dos cosas que señalo (no bloqueé por ellas):**
1. **`mainlogo_1.png` NO está en el repo** (solo `logo-plein.png` y `logo.png`). Usé `logo-plein.png`,
   que ya estaba cableado. Si el logo oficial es otro archivo, hay que subirlo a `assets/` y cambiar
   la ruta en `encabezadoImpresion` (una línea).
2. **La dirección/contacto de Plein no existe hoy** en código ni en `v_config` (solo el nombre). El
   bloque de empresa muestra el nombre y se auto-completa cuando se agreguen las claves
   `empresa_direccion`/`empresa_contacto` a `v_config` (via el futuro `fn_set_config` + pantalla de
   Ajustes). Anotado en PENDIENTES-BACKEND.md.
3. **La cotización (quote) usa jsPDF** (motor de dibujo por coordenadas), NO el template DOM `.inv-doc`.
   Se le alineó el verde de marca; un match visual 1:1 con el template DOM sería una reescritura del
   motor de esa pantalla, fuera del alcance de esta pasada (anotado). El número de factura se conserva
   como la serie oficial PP-AAAA-NNNN (no se reformateó a 7 dígitos crudos, que rompería la serie).

## ACTUALIZACIÓN — 2026-07-28 (Liquidaciones — deducciones por categoría estilo STESAN, E52)
Backend E52: `v_liquidacion_deducciones` gana `categoria` (valores `general · material · flete ·
in_out · customs · duties · otro`); `fn_agregar_deduccion_liquidacion` gana `p_categoria DEFAULT
'general'` AL FINAL. La precarga ya auto-clasifica (Aduanas→customs, Fletes→flete, Cartón→material,
In & Out QC→in_out; el resto general). Columna y firma verificadas contra Supabase en vivo.

- **Ficha (borrador)**: el form "+ Agregar deducción" tiene un `<select>` de **Categoría** (7
  opciones, default **General**), y `agregarDeduccion` manda `p_categoria`. La tabla de deducciones
  muestra la categoría como **chip** (`.pill gris`) en columna propia; `tfoot` colspan ajustado 2→3.
  Catálogo de categorías centralizado (`CATEGORIAS`/`CAT_LABEL`); una categoría desconocida (valor
  futuro) se muestra cruda, no rompe.
- **PDF (account of sales)**: el desglose se reorganizó en secciones agrupadas por categoría (modelo
  STESAN), en el orden pedido: Bruto → **Comisión Plein** (con %) → **DEDUCTIONS** (material/flete/
  in_out/general/otro) → **CUSTOMS** → **DUTIES** → NETO → −Anticipos → SALDO. Cada sección lleva su
  encabezado, sus líneas (concepto/nota/−monto) y su **subtotal**. Una categoría sin líneas **no
  pinta sección** (sin ruido vacío). **CUSTOMS/DUTIES van aparte; todo lo demás —incluidos NULL y
  cualquier categoría futura— cae en DEDUCTIONS**, así ninguna línea se pierde por una categoría no
  listada. Es solo presentación: el total de deducciones y el neto **no cambian** (todas restan
  igual).

`node --check` OK + smoke test puro: `catLabel` (etiquetas, default General, valor futuro crudo);
agrupación del PDF (CUSTOMS/DUTIES aparte; material/flete/in_out/general/NULL/categoría-inventada →
DEDUCTIONS); **invariante crítico verificado — la suma de los 3 subtotales = el total global de
deducciones** (1,847.00 en el escenario de prueba, todas restan igual); y que las secciones vacías
no se pintan. Desplegado y verificado en producción (`p_categoria`, `dedCategoria`, las 3 llamadas
`seccionDedPDF('DEDUCTIONS'/'CUSTOMS'/'DUTIES')` y la columna Categoría vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Liquidaciones — líneas de venta "Gross Sales" en el borrador, E52)
Backend E52: vista `v_liquidacion_ventas` (id, liquidacion_id, numero, producto, lote, unidades,
precio_unit, monto, orden) + 2 RPCs gate `capturar`, solo en borrador, que recalculan
**bruto/comisión/neto** solas: `fn_agregar_venta_liquidacion(p_liquidacion_id, p_producto, p_monto,
p_lote, p_unidades, p_precio_unit)` → id · `fn_quitar_venta_liquidacion(p_venta_id)`. Vista y firmas
verificadas contra Supabase en vivo antes de programar. Comportamiento clave: **cuando hay líneas,
el BRUTO = suma de las líneas** (el backend lo recalcula); el "Bruto de venta" del alta queda como
fallback para liquidaciones sin desglose.

En la ficha de una liquidación **en borrador** (`modulo-liquidaciones.js`), sección nueva **"Ventas
(Gross Sales)" ARRIBA de Deducciones**:
- **Tabla**: producto · lote · unidades · precio unit · monto + subtotal (bruto). Botón **✕** por
  fila (`.btn-cap`, `fn_quitar_venta_liquidacion`) con confirmación ligera + recarga.
- **"+ Agregar venta"**: producto (requerido) · monto (requerido, **≥ 0** — a diferencia de las
  deducciones que exigen > 0) · lote / unidades / precio unit (opcionales; vacío → `null`, negativos
  rechazados). `fn_agregar_venta_liquidacion` → recarga la ficha: **bruto, comisión, neto y descuadre
  llegan ya recalculados** de `v_liquidaciones`.
- **Gating idéntico a las deducciones**: `editable = estado==='borrador' && ERP.puede('capturar')`.
  En emitida/anulada NI se pintan la columna del ✕ ni el form; la tabla queda de solo lectura (el
  `<th>`/celda del ✕ y del `tfoot` son condicionales, sin columna vacía colgando). El fetch de
  `v_liquidacion_ventas` se agregó al `Promise.all` del `verLiquidacion`.
- Leyenda bajo el form: *"Si capturas líneas, el bruto se recalcula como la suma de las líneas
  (sobreescribe el bruto provisional del alta)."*
- Reusé el helper `numOpc` para los 3 opcionales numéricos (unidades/precio) — '' → `null`, `< 0` →
  error.

**PDF (account of sales):** si la liquidación tiene líneas, se pinta una sección **"GROSS SALES"**
ARRIBA del desglose (modelo STESAN) — tabla PRODUCT · LOT · UNITS · UNIT PRICE · AMOUNT + SUBTOTAL,
con las clases `.inv-items`/`.inv-grand` ya existentes. Sin líneas → no se pinta (el desglose usa el
"Bruto de venta" del alta como antes). `imprimir()` ahora trae `v_liquidacion_ventas` junto con las
deducciones y las pasa a `htmlImpresion(l, ventas, deducciones)`.

`node --check` OK + smoke test puro: visibilidad de controles (solo borrador + `capturar`); alta de
venta (producto/monto requeridos, **monto 0 válido**, negativo/no-numérico rechazados, opcionales
'' → null, lote con trim); subtotal = suma de líneas; y el gating del PDF (GROSS SALES solo con
líneas). Desplegado y verificado en producción (`fn_agregar_venta_liquidacion`,
`fn_quitar_venta_liquidacion`, `v_liquidacion_ventas`, "GROSS SALES", `data-quitar-vta` vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Leyenda legal PACA al pie del PDF de factura, E52)
Backend E52: vista `v_config` (pares clave/valor, GRANT SELECT authenticated) con la fila
`clave='factura_leyenda_paca'` → el texto legal PACA (~454 chars, inglés). Verificado contra
Supabase que la vista y la clave existan antes de programar. Cambio acotado a `modulo-facturas.js`,
**solo en el PDF/impresión** (no toca la ficha ni el autocompletado desde el cliente, que ya vive
en backend).

- **`leyendaPaca()`** (nuevo): lee `v_config` filtrando `clave=eq.factura_leyenda_paca&select=valor`.
  `ERP.q` cachea por URL → reimprimir no vuelve a pegarle al backend ("leer una vez"). Devuelve el
  `valor` **tal cual** (no se traduce ni se recorta — es requisito legal).
- **`imprimir(id)`** ahora hace `const leyenda = await leyendaPaca()` y lo pasa a `htmlImpresion(f,
  leyenda)`.
- **Pie en el PDF**: cuando hay leyenda, se agrega al final del `.inv-doc`, **en TODA factura**,
  separado del resto por una línea (`border-top`), en letra chica pero legible (`font-size:8.5px`,
  `line-height:1.35`), con `white-space:pre-wrap` para respetar cualquier salto de línea del texto
  legal. El texto se escapa con `esc()` (solo entidades HTML; no altera el sentido legal).
- **Sin fila / vacía / fetch falla → NO se inventa texto**: se **omite el pie** (mejor sin leyenda
  que con una mal escrita) y se deja un `console.warn`. Nunca se pinta un pie vacío.
- **No editable desde la factura**, es fijo (viene de config). *Futuro (no ahora):* cuando exista
  `fn_set_config(p_clave, p_valor, p_nota)` y una pantalla de Ajustes, la leyenda PACA y las demás
  claves se editarán ahí — anotado, sin construir.

`node --check` OK + smoke test puro: resolución del valor (fila presente → texto verbatim con el
mismo largo, sin recorte; sin filas / valor vacío / solo-espacios / null / fetch-falla → `null` =
se omite) y el pie (con leyenda → línea separadora + 8.5px + pre-wrap + el texto PACA íntegro con
"7 U.S.C. 499e(c)"; sin leyenda → string vacío, no un div vacío). Desplegado y verificado en
producción (`leyendaPaca`, `factura_leyenda_paca`, `leyendaPacaTxt` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Módulo nuevo "Inventario" — solo lectura, E52)
Backend E52: vista `v_inventario` (una fila por carga viva NO cerrada). Las 18 columnas verificadas
contra Supabase en vivo antes de programar. Módulo nuevo `modulo-inventario.js` (ruta `inventario`,
menú "📥 Inventario" entre Antigüedad de saldos y Cotiz. y órdenes). Solo lectura — no hay escritura
de inventario.

- **Dos semáforos de exposición arriba** (tarjetas `.hoy-card`, mismo estilo que las alertas de
  Inicio), **calculados sobre TODO el inventario, NO sobre lo filtrado** (buscar no debe ocultar el
  riesgo):
  - **"Capital parado"** (`comprado_sin_vender=true`): ámbar, con el total de `costo_total` de esas
    cargas y sus folios. Ya pagadas sin venta reportada — son las que esperan liquidación (hoy
    P-079/P-080/P-081). Si fueran 0 → tarjeta gris "Sin capital parado".
  - **"Exposición: vendido sin sourcing"** (`vendido_sin_comprar=true`): **rojo** cuando hay (riesgo
    operativo real: venta comprometida sin costo), con su total de venta. Hoy 0 → tarjeta gris "Sin
    exposición". Se pinta en rojo automáticamente en cuanto aparezca alguna.
- **Secciones por `bucket`, en el orden pedido:** En tránsito · **En piso** · Entregado (sin cerrar)
  · En proceso · Otro. Cada sección con su título + conteo + total costo/venta y una tabla de sus
  cargas (Folio clicable al Expediente · Lote —con lote_productor debajo si existe— · Producto ·
  Proveedor · Cliente · Cajas · Pallets · Costo · Venta · CxC · CxP).
  - **"En piso" se muestra SIEMPRE, aunque salga vacía** (a propósito: Plein no tiene bodega aún),
    con estado vacío *"Sin producto en piso — se activa cuando haya bodega."* No se esconde.
  - Los demás buckets canónicos se pintan solo si tienen cargas (no meten ruido vacío).
  - **Robustez de agrupado** (mismo criterio que v_balance/estados, sin hardcodear a ciegas): el
    grupo se casa con el `bucket` de la vista por comparación **normalizada** (tolera acentos/
    mayúsculas), y cualquier `bucket` que la vista traiga y NO esté en el orden canónico se pinta
    **al final** con su etiqueta cruda — nunca se pierde una carga.
- **Buscable** por lote / lote_productor / producto / proveedor / cliente / folio (filtra las
  secciones; los semáforos siguen globales). Conteo dinámico "N de M cargas".

`node --check` OK + smoke test puro: orden de secciones (canónico + "En piso" vacío visible + bucket
no-canónico al final; "Otro" vacío NO se pinta por no ser especial); el buscador filtra las secciones
pero "En piso" sigue visible y los semáforos NO cambian con el filtro (son globales); y el cálculo de
los dos semáforos (Capital parado = 3 cargas / total costo / ámbar; Vendido sin sourcing = 0 → gris,
y → rojo con su venta en cuanto aparece uno). El único "fallo" del test fue un artefacto de float en
la propia aserción (10877.34999…); el módulo muestra el total con `usd()`, que redondea a $10,877.35.
Desplegado y verificado en producción (`v_inventario`, registro del módulo, ambos semáforos, "En piso"
y el menú/script confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (LOTE en Embarques y Órdenes de Compra, E52)
Backend E52: `v_carga_detalle` expone al final `lote` (siempre presente, ej. "LOTE-2026-0042"),
`lote_productor` (opcional) y `f_cosecha` (opcional); `v_ordenes_compra` hereda `lote`/`lote_productor`
de la carga ligada (NULL si la OC no tiene carga). `fn_editar_carga` ganó 2 params opcionales AL
FINAL: `p_lote_productor`, `p_f_cosecha` (gate `administrar`, motivo obligatorio, NULL = no tocar).
El **lote interno (`cargas.lote`) lo asigna el backend solo — el frontend NUNCA lo manda.** Contrato
(3 columnas de `v_carga_detalle`, 2 de `v_ordenes_compra`, firma ampliada de `fn_editar_carga`)
verificado contra Supabase en vivo antes de programar.

**1) Embarques — lista (`modulo-cargas.js`):** columna **"Lote"** nueva (el interno), junto a V7 en
el bloque de identidad. `tfoot` colspan ajustado 9→10. El buscador ahora también matchea por `lote`
y `lote_productor` (traza PACA); placeholder actualizado.

**2) Embarques — ficha:** LOTE, lote productor y cosecha visibles (lectura) en el det-grid, tanto
en el **Expediente** (`modulo-expediente.js`, Resumen) como en la ficha clásica. La **edición** de
`lote_productor` (texto) y `f_cosecha` (fecha) vive en el modal **"Editar embarque"** (gate
`administrar`, motivo obligatorio, como el resto de la edición de carga), vía `fn_editar_carga`
ampliada. El lote interno se muestra ahí como **campo fijo no editable** ("Lo asigna el sistema").
Los 2 campos siguen el patrón solo-cambiados ya establecido: `lote_productor` como `p_po` (texto;
'' explícito lo limpia), `f_cosecha` como `p_f_embarque` (fecha; NULL = no tocar, con la misma
limitación conocida de no poder vaciarse desde la UI).

**3) Órdenes de Compra (`modulo-ordenes.js`):** columna **"Lote"** en la lista (lectura) y campo
**"Lote"** en la ficha (campo fijo, con `lote_productor` si existe y aclaración "heredado del
embarque; se edita en la ficha del embarque"). Solo lectura — la OC no edita el lote.

**4) Form de nueva carga:** nota en la leyenda: *"El lote se asignará automáticamente al crear la
carga (el lote del productor y la fecha de cosecha se capturan después, desde la ficha)."* — no se
agregó ningún campo de captura de lote en el alta.

`node --check` OK en los 3 archivos tocados + smoke test puro de la lógica de payload: `lote_productor`
(primera captura null→valor; sin cambio→null; mismo valor con espacios→null; cambio→valor; vaciar→''
explícito) y `f_cosecha` (primera captura; misma fecha timestamp-vs-date→null; cambio→fecha; vaciar→
null); y verificación de que **el lote interno nunca aparece en el payload**. Desplegado y verificado
en producción (`p_lote_productor`/`p_f_cosecha`/`eaLoteProd`/columna Lote en cargas; `d.lote_productor`
en Expediente; columna + `o.lote` en Órdenes — confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Liquidaciones — edición de deducciones en el borrador)
Backend E51 desplegó 2 RPCs nuevas (gate `capturar`, solo corren en borrador y recalculan el neto
solas): `fn_agregar_deduccion_liquidacion(p_liquidacion_id, p_concepto, p_monto, p_nota)` →
id · `fn_quitar_deduccion_liquidacion(p_deduccion_id)`. Firmas verificadas contra Supabase en vivo
antes de programar. Caso de uso: un embarque trae pick&pack real que SÍ se le cobra al productor y
no se precargó (el concepto "Comisión" ya no se precarga, por decisión de negocio).

En la ficha de una liquidación **en borrador** (`modulo-liquidaciones.js`, `cuerpoFicha`), bajo la
tabla de deducciones:
- **Renglón "+ Agregar deducción"** con inputs concepto (requerido) / monto USD (requerido, > 0) /
  nota (opcional) y botón. Llama `fn_agregar_deduccion_liquidacion`; al volver **recarga la ficha
  completa** (`verLiquidacion`) — el neto, el total de deducciones y el descuadre llegan ya
  recalculados de `v_liquidaciones`, no se computan en el cliente.
- **Botón ✕ "quitar"** en cada fila de deducción (clase `.btn-cap` ya existente, sin CSS nuevo) →
  `fn_quitar_deduccion_liquidacion(id)` (el `id` sale de `v_liquidacion_deducciones`), con
  confirmación ligera ("El neto y el descuadre se recalculan") y recarga.
- **Gating estricto:** ambos controles se calculan con `editable = estado==='borrador' &&
  ERP.puede('capturar')`. En **emitida/anulada NI se pintan** (ni la columna del ✕ ni el form) —
  la tabla queda de solo lectura; los triggers del backend igual lo impedirían, pero el usuario no
  ve un control que va a fallar. El `<th>` extra del ✕ y su celda del `tfoot` también son
  condicionales, así que la tabla no queda con una columna vacía en modo lectura.
- Errores del backend vía `ERP.avisarSiPermiso` (permiso) o toast/aviso (resto), tal cual el resto
  del módulo. `ERP.marcarDatosSucios()` tras cada escritura.

`node --check` OK + smoke test puro: visibilidad de los controles (solo borrador + `capturar`;
ocultos en emitida/anulada aunque haya capacidad) y el alta (concepto requerido, monto vacío ≠ 0
por accidente, monto ≤ 0 rechazado, no-numérico rechazado, decimal preservado, nota con trim → null)
+ el payload de quitar (id string del dataset → number). Desplegado y verificado en producción
(`fn_agregar_deduccion_liquidacion`, `fn_quitar_deduccion_liquidacion`, `data-quitar-ded`,
`dedAgregar` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Módulo nuevo "Liquidaciones al productor" + cierre de 2 pendientes E50)
Backend E51 desplegó el account of sales que PACA exige. Contrato verificado contra Supabase en
vivo antes de programar: las 2 vistas (`v_liquidaciones` 23 columnas, `v_liquidacion_deducciones`
7 columnas) y las 3 RPCs (`fn_crear_liquidacion`/`fn_emitir_liquidacion`/`fn_anular_liquidacion`,
con sus firmas exactas) existen tal cual.

**Prerrequisito — 2 pendientes de E50 (lecturas de tabla base → vista):**
- **`modulo-tesoreria.js`**: `q('tipos_movimiento')` → `q('v_cat_tipos')`. La tabla base `tipos_movimiento`
  daba 401 a authenticated (la regla es solo-vistas), así que el `<select>` de tipo en "Editar
  movimiento" salía vacío y reclasificar era imposible (hallazgo F-11 de la auditoría). Con la vista
  ya popula. Mismas columnas (`tipo`), swap drop-in.
- **`modulo-proyectos.js`**: `q('categorias_presupuesto')` → `q('v_cat_presupuesto')`. Igual: el
  `<select>` de categoría en "+ Línea de presupuesto" degradaba a solo "—". Mismas columnas
  (`orden`, `nombre`).

**Módulo nuevo `modulo-liquidaciones.js`** (ruta `liquidaciones`, menú "🧑‍🌾 Liquidaciones al
productor", tras Facturación) — espejo de Facturación (mismo flujo borrador→emitida→anulada, serie
al emitir):
- **Lista**: filtro por estado + búsqueda (número/productor), export Excel/PDF. Columnas Número ·
  Productor · Fecha · Estado (pill) · Bruto · Neto productor · Saldo a pagar · **Descuadre** · Emb.
- **Nueva liquidación** (gate `capturar`, `fn_crear_liquidacion`): combo de productor (contra
  `v_catalogo_proveedores`); al elegir productor se filtran sus embarques vivos de `v_carga_detalle`
  por `proveedor_id` (columna E49) y se muestran como checkboxes → `p_cargas` (text[] de folios);
  bruto de venta (requerido, ≥0), comisión % (opcional — vacío = el backend la toma del programa),
  nota. Se crea en borrador; el backend precarga deducciones desde `carga_costos`.
- **Ficha** (solo lectura + acciones): desglose completo en grid (bruto, comisión con su %,
  deducciones, **NETO PRODUCTOR** destacado, anticipos, saldo a pagar), tabla de deducciones
  (`v_liquidacion_deducciones`, concepto/nota/monto), lista de embarques, quién capturó/emitió.
- **Reglas duras de UI cumplidas:**
  - **Descuadre**: siempre pintado. Si `|descuadre| ≥ $0.01` → banner rojo *"DESCUADRE DE $X — no
    se puede emitir"* y el botón **Emitir queda `disabled`** (el backend igual lo rechaza, pero el
    usuario lo ve antes). Si cuadra → confirmación verde discreta.
  - **Tras emitir no se edita**: no existe RPC de edición (los triggers lo impiden); la ficha es de
    solo lectura siempre, solo Imprimir/Emitir/Anular según estado. Emitida/anulada ocultan Emitir.
  - **Saldo negativo = el productor debe a Plein**: se pinta en azul (#2A6098) con nota aclaratoria
    *"(el productor debe a Plein)"*, **nunca en rojo de error**. Positivo = normal.
  - Formato `$12,345.67` y fechas `DD-mmm-YYYY`.
- **Emitir** (gate `editar`, `fn_emitir_liquidacion`): confirmación, asigna serie LQ-AAAA-NNNN,
  toast con el número. **Anular** (gate `administrar`, `fn_anular_liquidacion`): motivo obligatorio
  vía prompt (mismo patrón que Facturación); banner de anulación con motivo.
- **PDF "LIQUIDACIÓN AL PRODUCTOR / ACCOUNT OF SALES"** vía `ERP.encabezadoImpresion()` +
  `ERP.imprimirArea()` (logo compartido, espera la carga de imagen). Desglose tipo cuenta de ventas:
  Bruto de venta → −Comisión Plein (con %) → cada deducción con su concepto/nota → **NETO AL
  PRODUCTOR** → −Anticipos → **SALDO A PAGAR**. Reusa las clases `.inv-doc`/`.inv-items`/`.inv-grand`
  del INVOICE, sin CSS nuevo. Es el documento que PACA exige.
- **Retornos RPC robustos**: `unwrap(data, key)` desempaqueta escalar / arreglo de filas / objeto
  sin asumir la forma (fn_crear devuelve `id` escalar, fn_emitir devuelve `numero` escalar).

`node --check` OK en los 3 archivos JS tocados/creados + smoke test puro: descuadre (0/residuo/≥1
centavo, y negativo, bloquea Emitir); saldo negativo → tratamiento distinto (no error); `unwrap` en
las 3 formas de retorno + null; embarques como arreglo o texto; `cargasDelProductor` (filtra por
`proveedor_id`, excluye anuladas, id string-vs-number, vacío sin productor); y el armado del payload
de creación (validaciones + comisión vacía → `null` = del programa + bruto 0 válido + nota con trim).
Desplegado y verificado en producción (módulo, menú, script y los 2 swaps E50 confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Capturar la venta de una consignación — liquidar consignación)
Nuevo flujo sobre `fn_liquidar_consignacion(p_folio, p_ingreso_real, p_resolucion,
p_estado_final)` (RPC ya desplegada, gate `editar`) — sin tocar SQL/backend ni la máquina de
estados. Cierra el hueco: las consignaciones salían con venta $0.00 y la UI las marcaba
"esperando liquidación", pero no dejaba capturar esa venta cuando se conseguía comprador.

- **Botón "+ Capturar venta (liquidar consignación)"** en la ficha clásica de embarque
  (`modulo-cargas.js`, `pintarFicha`), en una sección nueva **"Venta de consignación"** junto a
  las demás acciones de captura (Costos, Cobros y pagos). Visible SOLO si `modalidad='consignacion'
  && !anulado && ERP.puede('editar')` — la sección entera no se pinta en cargas que no son
  consignación. Vive en la ficha clásica (a la que el Expediente llega por "＋ Captura y
  acciones"), igual que el resto de la captura y que "Editar embarque".
- **Form desplegable** (mismo patrón toggle in-place que "Agregar costo"/"Registrar cobro/pago",
  sin modal aparte): monto de venta USD (requerido, ≥ 0 — se precarga con la venta previa si ya
  había una declarada, para poder corregirla); referencia de la liquidación (texto requerido);
  y selector **"¿Avanzar estado?"** con default **"Dejar igual (recomendado)"**, más "Marcar
  Entregada" / "Marcar Cerrada". Leyenda de ayuda autoexplicativa: *"Capturar la venta NO cambia
  dónde está el contenedor; solo registra el precio. Cámbialo solo si además ya se
  entregó/cerró."*
- **`p_estado_final`**: la opción "Dejar igual" manda **`null` explícito** (no cambia el estado
  logístico); solo "Entregada"/"Cerrada" lo avanzan — son los dos únicos valores que la RPC
  acepta (contrato fijo de la RPC, no el catálogo de estados abierto; se documenta así en el
  código).
- **Validación cliente** (el backend re-valida): monto requerido y ≥ 0 — se valida el string
  crudo para distinguir "vacío" de "0 capturado a propósito" (0 es válido, `Number('')` daría 0
  por accidente); referencia no vacía (con `trim`). Errores `PERMISO_DENEGADO`/"Sin permiso" →
  `ERP.avisarSiPermiso`; cualquier otro error del backend se muestra tal cual.
- **Al éxito**: `refrescarFicha(d.folio)` recarga la ficha → aparece la CxC (saldo por cobrar),
  el badge pasa de ámbar "esperando liquidación" a gris "venta declarada", y se ve el nuevo
  ingreso/utilidad. Toast con el `resultado` que devuelve la RPC (fallback local si viene vacío).
- Recordatorio contable (D-04/D-11, ya vigente): capturar la venta **declara la CxC**; el
  ingreso se reconoce al **COBRAR** (el cobro sigue por el flujo existente de "Cobros y pagos") —
  este botón solo cubre el paso de asignar el precio de venta.

Firma de la RPC verificada contra Supabase en vivo antes de programar (los 4 parámetros
resuelven, gate `editar`). `node --check` OK + smoke test puro: visibilidad del botón (solo
consignación viva + capacidad editar; oculto en anuladas/otras modalidades; modalidad NULL no
rompe) y armado del payload (`p_estado_final` NULL cuando "dejar igual", 'Entregada'/'Cerrada'
tal cual; monto vacío rechazado, monto 0 aceptado, negativo/no-numérico rechazados, referencia
vacía rechazada, trim aplicado). Desplegado y verificado en producción (`fn_liquidar_consignacion`,
`btnFormLiquidar`, textos del form confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-28 (Corrección — el badge de consignación se movió de VENTA a ESTADO)
Corrige el cambio del 2026-07-27 (ver entrada de abajo): el texto ámbar "En consignación —
esperando liquidación" quedó mal puesto dentro de la celda de **Venta** en la lista de
Embarques (`modulo-cargas.js`) — invadía la columna y parecía tapar el monto. La columna Venta
estaba bien; solo faltaba mostrar el concepto en otro lugar.

- **Celda de Venta**: vuelve a ser solo `${usd(c.ingreso_venta)}`, sin texto adicional.
- **Celda de Estado**: gana un **pill compacto** apilado debajo del badge de estado logístico
  (`ERP.badgeEstado(c.estado)`) — mismo mecanismo visual que el chip "PC-###" bajo el folio en
  la columna Carga (un `<span class="pill">` inline-block que envuelve a su propia línea en una
  celda angosta; no hay `<br>` ni bloque forzado). Texto siempre corto, **"Consignación"**; el
  detalle vive solo en el `title` (tooltip):
  - `modalidad='consignacion'` y `ingreso_venta=0` y `cobrado=0` → `.pill.ambar`, title
    *"Esperando liquidación — el ingreso se reconoce al liquidar, no al embarcar (D-04)"*.
  - `modalidad='consignacion'` y `ingreso_venta>0` → `.pill.gris`, title *"Venta ya declarada"*.
  - Nunca en cargas anuladas ni en otras modalidades — reutiliza las clases `.pill.ambar`/
    `.pill.gris` ya existentes (mismas que usa el resto de la app), sin CSS nuevo.
- **Función renombrada**: `etiquetaConsignacion` → `badgeConsignacion` (misma función, un solo
  sitio de verdad; ya no existe la versión anterior en el archivo).
- **Sin cambios** (por instrucción explícita): el chip/filtro "En consignación" de la barra de
  filtros, la tarjeta "Producto" del Expediente, y la máquina de estados (`estado` sigue siendo
  logística; esto es solo un badge visual por `modalidad`).

`node --check` OK + smoke test puro sobre `badgeConsignacion`: los 2 casos definidos (ámbar
venta=0/cobrado=0, gris venta>0, incluida la consignación ya liquidada que también cae en gris);
nunca en anuladas ni en otras modalidades; el caso borde no definido (venta=0, cobrado>0) sigue
sin pill, sin inventar una tercera regla; y el escenario pedido explícitamente — 16 consignaciones
vivas repartidas 3 ámbar + 13 gris — clasifica las 16 sin ninguna suelta. Desplegado y verificado
en producción (`badgeConsignacion` presente 2 veces —definición y único uso—, `pill ambar` y su
title confirmados vía `curl`; la celda de Venta vuelve a terminar en
`usd(c.ingreso_venta)}</td>` limpio).

## ACTUALIZACIÓN — 2026-07-28 (Producto en el Expediente + visibilidad de consignación en Embarques)
Dos cambios de solo lectura sobre `v_carga_detalle` (vista que el frontend ya consumía) — sin
tocar SQL, RPCs ni la máquina de estados.

**1) Tarjeta "Producto" en el Resumen del Expediente (`modulo-expediente.js`, `htmlResumen`).**
El listado de Embarques ya mostraba el producto, pero el modal Ver/Editar (Expediente, pestaña
"Resumen") no — la ficha clásica sí lo tenía. Se agregó la tarjeta `Producto` al `det-grid`,
junto a Proveedor/Cliente/Modalidad (mismo estilo `.det`/`.l`/`.v` que las demás), leyendo
`d.producto` con fallback a "—" cuando viene NULL.

**2) Visibilidad de cargas en consignación en Embarques (`modulo-cargas.js`) — por MODALIDAD, sin
tocar el `estado` (que sigue siendo logístico: Programada→En Camino→Entregada…).**
- **Chip nuevo "En consignación"** en la barra de filtros, mismo patrón single-select que los
  chips de estatus de cobro (Cobrado/Parcial/Vencido/Pendiente/Sin liquidar) y Anuladas. Cuenta
  `modalidad='consignacion' && !anulado` sobre `vivasRango`. Se implementó con el mismo prefijo
  de filtro que ya usan los chips de cobro (`filtroEstado = 'cobro:*'`), extendido a
  `'modalidad:*'`, para que `filtradas()` no lo confunda con un filtro de `estado` — sin este
  prefijo, `'consignacion'` a secas habría intentado matchear contra `c.estado` (que nunca vale
  eso) y el chip habría devuelto siempre cero filas.
  Colocado en su **propio grupo visual** (separado de los chips de cobro con `margin-left:12px`
  y tooltip propio), a propósito: la tarea marcó que "En consignación" (todas, liquidadas y no) y
  "Sin liquidar" (venta aún no reconocida) son conjuntos DISTINTOS — ponerlos pegados sin
  distinción visual habría invitado a leerlos como si debieran cuadrar.
- **Etiqueta condicional** (`etiquetaConsignacion`, chica, bajo el monto de Venta en la lista):
  *"En consignación — esperando liquidación"* SOLO si `ingreso_venta=0 Y cobrado=0`; *"En
  consignación"* (sin la coletilla) si `ingreso_venta>0` — para no mentir en consignaciones que
  ya declararon o liquidaron venta (P-071/P-073/P-075) ni en las ya cerradas (P-019). Nunca se
  pinta en cargas anuladas. Un caso no cubierto por el spec (`ingreso_venta=0` con `cobrado>0`,
  anómalo y no esperado en consignación per D-04) deliberadamente no cae en ninguna rama y no
  muestra etiqueta — no se inventó una tercera regla no pedida.
- Recordatorio de negocio (D-04, ya vigente): `ingreso_venta=0` en consignación NO es un dato
  faltante — es que la venta se reconoce al liquidar, no al embarcar. Estos dos cambios hacen
  visible esa regla en vez de dejar que un "$0.00" se lea como una carga sin venta.

`node --check` OK en ambos archivos + smoke test puro: `etiquetaConsignacion` (las 2 ramas
definidas + anulada nunca se muestra + modalidades distintas de consignación nunca la muestran +
el caso borde no definido no inventa una tercera etiqueta) y el filtro del chip (cuenta 3 vivas
sobre un set con 1 liquidada + 1 declarada-sin-cobrar + 1 sin-liquidar + 1 anulada-excluida +
otras modalidades; confirma que "En consignación" (3) y "Sin liquidar" (1) NO cuadran a
propósito). Desplegado y verificado en producción (`modalidad:consignacion`,
`etiquetaConsignacion` en modulo-cargas.js; tarjeta "Producto" en modulo-expediente.js
confirmadas vía `curl`).

## ACTUALIZACIÓN — 2026-07-27 (Sección "Aplicaciones" en el modal Editar movimiento de Tesorería)
Backend ya tenía `v_movimiento_aplicaciones` (una fila por aplicación, con el resumen del
movimiento repetido en cada fila) y las RPCs `fn_aplicar_a_carga(p_mov_folio, p_carga_folio,
p_monto, p_nota)` / `fn_desaplicar(p_aplicacion_id, p_motivo)`. Faltaba consumirlo desde la UI.
Verificado contra Supabase en vivo antes de programar (misma técnica de la auditoría): las 13
columnas de la vista y las 2 firmas de RPC existen tal cual las describe el contrato.

- **Nueva sección "Aplicaciones"** dentro del modal "Editar movimiento" (`modulo-tesoreria.js`,
  `editarMovimiento`), entre el formulario de edición y el "Historial de cambios". Se agregó al
  `Promise.all` existente (no es un fetch nuevo aislado).
- **Resumen del movimiento**: *"Aplicado $X de $Y — quedan $Z"*, con `mov_aplicado`/`mov_total`/
  `mov_sin_aplicar` (llegan repetidos en cada fila, se leen de la primera). El aviso se resalta en
  ámbar si `mov_sin_aplicar > 0`, en verde si ya quedó en cero.
- **Lista** (`pintarAplicaciones`): sentido (Cobro/Pago) · carga (folio clickeable a Expediente,
  reusando la clase `.chip-folio`/`ERP.verCarga` que este mismo archivo ya usa en el estado de
  cuenta) · **Cliente si Cobro, Proveedor si Pago** (mismo dato, columna que cambia de significado
  según el sentido) · producto · monto · fecha (`DD-mmm-YYYY` vía `ERP.fecha`) · nota ("—" si
  vacía). Si `carga_flag=true`, chip ámbar **"Carga en revisión"** junto al folio (recordatorio,
  no bloquea nada).
- **"Aplicar a carga"** (solo con capacidad `editar`): combo de carga reutilizando el mismo patrón
  de `comboCargasItems` de Órdenes de Compra (id=folio, buscable por folio/PO/cliente/proveedor/
  producto), monto (número > 0), nota (texto **obligatorio**) — sin fecha, la pone el backend.
  Llama `fn_aplicar_a_carga` en el orden exacto pedido. Éxito → `ERP.toast('ok', resultado)` +
  se limpia el formulario + se refresca **solo** la sección (resumen y lista), sin recargar el
  resto del modal.
- **"Desaplicar"** (botón por fila, mismo gate `editar`): pide motivo con `window.prompt` —
  **mismo patrón ya usado en este archivo** para el caso `MOV_CON_APLICACIONES` de "Editar
  movimiento" (`window.confirm`), así que no introduce un estilo de diálogo nuevo. Cancelar el
  prompt no hace nada; motivo vacío → toast de error sin llamar la RPC. Llama `fn_desaplicar`,
  refresca la sección, toast con `resultado`.
- **Errores del backend**: `MAPA_ERROR_APL`/`textoErrorApl` (mismo patrón ya usado por
  `MAPA_ERROR`/`textoError` de "Editar movimiento", diccionario separado para no mezclar
  contratos de error de dos RPCs distintas) traduce los códigos en MAYÚSCULAS
  (`PERMISO_DENEGADO`, `NOTA_REQUERIDA`, `MONTO_INVALIDO`, `MOV_ANULADO`, `CARGA_NO_EXISTE`); los
  mensajes ya legibles del backend ("...exceden el monto...", "SOBRE-COBRO/SOBRE-PAGO...",
  "GATE 4: periodo CERRADO...") se muestran tal cual, sin intentar traducirlos.
- **Manejo de errores sin enmascarar** (relevante tras la auditoría de esta misma semana): el
  fetch de `v_movimiento_aplicaciones` es primario para esta sección — si falla, NO cae a `[]`
  silencioso; guarda `{__error}` y `pintarAplicaciones` pinta su propio `errbox` dentro de
  `#edAplicaciones`. El catálogo de cargas para el combo (`v_carga_detalle`) sí degrada a `[]` si
  falla (es un enriquecimiento de un formulario de escritura), pero el botón "Aplicar a carga"
  queda deshabilitado con una nota visible explicando por qué — nunca un combo vacío sin
  explicación (el mismo patrón que la auditoría marcó como problema en Órdenes de Compra, F-13).
- **Gating**: la lista se ve siempre (solo lectura); el formulario "Aplicar a carga" y el botón
  "Desaplicar" solo se pintan con `ERP.puede('editar')`. Nota: hoy "Editar movimiento" solo es
  alcanzable desde un botón ya gateado por `editar`, así que el gating interno es defensivo/
  futuro-a-prueba más que operante hoy — no se amplió quién puede abrir el modal (fuera de
  alcance de esta tarea).

`node --check` OK + smoke test puro de `pintarAplicaciones` (error de fetch → errbox, no lista
vacía disfrazada; resumen resaltado en ámbar solo cuando `mov_sin_aplicar>0`; columna Cliente/
Proveedor cambia según `sentido`; chip de flag solo cuando `carga_flag=true`; nota vacía → "—";
botón Desaplicar ausente sin capacidad `editar`) y de `cargasComboItems` (cargas anuladas
excluidas, `id`=folio no un id numérico, nombre sin " · " colgando cuando falta PO/cliente,
alias cubre PO/cliente/proveedor/producto/folio). Desplegado y verificado en producción
(`fn_aplicar_a_carga`, `fn_desaplicar`, `v_movimiento_aplicaciones`, `edAplicaciones`,
`cargasComboItems` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-27 ("Editar embarque" — sostenibilidad de captura sobre fn_editar_carga)
Backend ya tenía `fn_editar_carga(p_folio, p_motivo, p_po, p_f_embarque, p_ingreso_venta,
p_modalidad, p_estado, p_cliente_id, p_proveedor_id, p_producto_id, p_nota_revision, p_forzar)` —
gate `administrar`, `COALESCE(param, actual)` (NULL = no tocar), valida clase de contraparte, deja
bitácora. Faltaba consumirlo desde la UI.

- **Botón "Editar embarque"** en la ficha clásica (`modulo-cargas.js`, junto a "Cambiar estado"),
  gateado con `ERP.puede('administrar')` y oculto en cargas anuladas (mismo criterio que el resto
  de la captura). **No se duplicó en el Expediente**: el Expediente ya delega TODA la captura a la
  ficha clásica vía "＋ Captura y acciones" (mismo patrón que "Anular carga" y "Cambiar estado",
  que tampoco viven ahí).
- **Modal** (`abrirEditarCarga`, patrón `modal-ov` ya usado por "Cambiar estado" en este mismo
  archivo): P.O., fecha de embarque, modalidad (`margen_fijo|consignacion|comision` — las 3 reales
  del negocio; `nuevaCarga()` solo ofrece 2 porque una carga nunca *nace* en comisión, pero al
  editar sí hay que poder dejar/mostrar la modalidad de las 13 cargas que ya la tienen), estado
  (del catálogo completo `ERP.catalogoEstados()`, sin el filtro de la matriz de transiciones — es
  un bypass de administrador, no el flujo guiado), cliente/proveedor/producto (combos contra
  `v_catalogo_clientes/proveedores/productos`, sin "+ Nuevo" — las 3 RPC piden id, no texto libre),
  ingreso de venta, y **Motivo obligatorio**.
- **Aviso de flag no resuelta**: si `d.revision_pendiente` es true, el modal muestra un aviso fijo
  arriba de los campos: *"Editar aquí no la cierra — resuélvela en Revisiones Pendientes"* (el
  backend advierte pero no baja el flag; este aviso es puramente informativo, no depende de la
  respuesta del RPC).
- **Solo se manda lo que cambió** (`armarPayloadEditarCarga`, función pura): texto/número con el
  patrón ya usado en Programas/Proyectos; P.O. sí soporta vaciarse a propósito (manda `''`
  explícito, distinto de `null`).
- **Cliente/proveedor/producto por NOMBRE, no por id** — limitación real, no capricho: `v_carga_
  detalle` NO expone `cliente_id`/`proveedor_id`/`producto_id` (solo los nombres), así que "¿cambió?"
  se decide comparando el nombre normalizado (`ERP.norm`) contra el original, igual que ya resuelve
  el propio combo un alias. Si el combo queda sin selección (preselección fallida), se manda `null`
  — nunca se adivina un id a partir de un nombre a medias. Pendiente anotado en
  `PENDIENTES-BACKEND.md`: pedir esas 3 columnas a `v_carga_detalle` para poder comparar por id
  directo y retirar el rodeo.
- `p_nota_revision` y `p_forzar` nunca los toca este modal (siempre `null`/`false`): la nota de
  revisión se administra en Revisiones Pendientes, y no hay UI de forzado aquí.

`node --check` OK + smoke test puro de `armarPayloadEditarCarga`: sin cambios reales → todos los
campos `null` salvo `p_folio`/`p_motivo`/`p_forzar` (este último siempre `false` por diseño, no por
"no tocar"); cambios puntuales (PO, venta, estado) no contaminan los demás campos; cliente con
distintas mayúsculas/acentos → no se manda (normalización correcta); cliente realmente distinto →
se manda su id; combo vacío por preselección fallida → `null`, nunca se adivina; fecha comparada
contra el ISO de 10 caracteres del original (timestamp completo vs. `<input type=date>`); PO vaciado
a propósito manda `''` explícito. Desplegado y verificado en producción (`fn_editar_carga`,
`btnEditarCarga`, `armarPayloadEditarCarga` confirmados vía `curl`).

## ACTUALIZACIÓN — 2026-07-27 (Bugfix — el filtro por bloque en Programas no devolvía nada)
**Causa confirmada:** `filtroBloque` se llena con `ch.dataset.bloque`, que el DOM entrega
SIEMPRE como string ("3"); `p.bloque` llega de PostgREST como number (3). El filtro comparaba
con `===` sin normalizar → "3" !== 3 → nunca coincidía → clic en cualquier chip de bloque dejaba
la lista vacía con "Ningún programa en este bloque", aunque el dato y los conteos de los chips
(esos sí comparaban number-vs-number entre sí) eran correctos.
- **Fix en `modulo-programas.js`**: dos funciones puras nuevas. `mismoBloque(a, b)` compara
  `String(a) === String(b)` (tolera number-vs-string sin cambiar el tipo del dato ni el del
  dataset). `coincideFiltroBloque(bloquePrograma, filtro)` = `filtro === 'todos' || mismoBloque(...)`
  — el caso especial `'todos'` se resuelve ANTES de la comparación normalizada, así nunca se cuela
  como si fuera "el bloque número todos" al decidir qué chip de bloque se ve activo.
  `pintarListaProgramas()` ahora filtra con `coincideFiltroBloque` y marca el chip de cada bloque
  como activo con `mismoBloque(b, filtroBloque)` (el chip "Todos" sigue comparando string-string
  como antes, sin cambio).
- **Revisado y descartado** el mismo patrón en "Proyección anual": `mesSeleccionadoProy` y `r.mes`
  ya se normalizan con `num()` en los tres puntos donde se comparan (selección por defecto, pintado
  de la fila activa, detalle de programas sin dato) — no tenía el bug, no requirió cambio.
- **Mejora de claridad (mismo pase):** los chips de bloque pasan de mostrarse como "3 6" (número
  pelón + conteo) a **"Bloque 3"** con el conteo en el mismo badge `.chip-n` ya usado por los
  chips de estado de Embarques — mismo patrón visual, más legible. El chip "Todos 13" no cambia.

`node --check` OK + smoke test puro con el escenario real reportado (13 programas repartidos
1/1/6/2/1/1/1 en bloques 1..7): filtro `'todos'` → 13; bloque `'3'` (string, como llega del
dataset) → los 6 de CRI (PC-003..PC-008); bloque `'4'` → los 2 espárragos (PC-009, PC-010);
bloque `'1'` → solo PC-001; bloque inexistente `'9'` → 0 filas sin tronar; y `mismoBloque(3,
'todos')` → false (el atajo "todos" no contamina la marca de chip activo). Desplegado y
verificado en producción.

## ACTUALIZACIÓN — 2026-07-27 (Etiqueta legible en Programas — el nombre manda, el código es la llave, E47-C)
Backend E47-C ya listo y probado: `v_programas_comerciales`/`v_programa_cargas` ganan columna `etiqueta`
AL FINAL; `v_cargas_programa` gana `programa_etiqueta` AL FINAL; `fn_crear_programa` acepta
`p_etiqueta` (opcional) y ahora devuelve `{codigo, etiqueta}`; `fn_editar_programa` acepta
`p_etiqueta` y también `p_bloque`/`p_cliente_id`/`p_producto` (antes ignorados por el backend —
el frontend ya los armaba desde E47-B, ahora sí llegan). Los códigos PC-### no cambian: son la
llave técnica; la etiqueta es el nombre legible que ahora manda visualmente.

- **Lista de Programas**: primera columna pasa de "Código" a **"Programa"** — muestra la `etiqueta`
  (o el código si por algún motivo viniera sin etiqueta) como texto principal clickeable, con el
  código debajo en gris pequeño (`.mono`, ~11px) — sigue siendo la llave visible y trazable, solo
  deja de ser lo primero que se lee.
- **Ficha de programa**: el título del panel pasa a ser la `etiqueta`; el subtítulo ahora es
  "PC-005 · Bloque 3 · cliente · producto · estado"; se agregó el campo **Código** (mono) a la
  grilla de detalle, arriba de Bloque. El botón "Editar X" también usa la etiqueta.
- **Formulario (alta y edición)**: campo nuevo **"Nombre del programa"**, ancho completo, primero
  de todos. En alta: opcional, placeholder "Se arma solo si lo dejas vacío" — **vacío manda `null`,
  nunca `''`**, para que el backend autogenere el nombre. En edición: precargado con la etiqueta
  vigente, entra en la lógica de solo-cambiados (`igualTxt`) igual que los demás campos de texto;
  a diferencia de nota/producto, **vaciarlo en edición también manda `null`** (no `''`) — por
  contrato explícito del backend la etiqueta nunca se borra desde aquí, solo se reemplaza.
- **Toast de alta**: ahora usa el nombre devuelto por `fn_crear_programa` — *"Programa
  <b>Kabocha (Akambarhu) — CRI · verano</b> creado (PC-014)."* — en vez de mostrar solo el código.
- **Bloque/Cliente/Producto ahora editables de verdad**: `armarPayloadEditar` ya los calculaba
  desde E47-B (`p_bloque`, `p_cliente_id`, `p_producto` con la lógica solo-cambiados) pero el
  backend los ignoraba; sin cambios de frontend, ahora se aplican.
- **Chip de programa en Embarques y Expediente**: sigue mostrando el código "PC-0XX" (el espacio
  es corto), pero el `title` del chip ahora es la `programa_etiqueta`/`estado.programaEtiqueta`
  (fallback defensivo al código si viene null). En Embarques, el mapa folio→programa pasó de
  guardar solo el código a guardar `{codigo, etiqueta}`; el clic sigue navegando por el **código**
  (`ERP.irModulo('programas', codigo)`), sin cambio de comportamiento.
- **Agenda de la semana** (tarjeta `programa_sin_carga`, ya trae el nombre legible en el título
  desde el backend): verificado que `.hoy-card`/`.hoy-card-titulo` no tienen `white-space:nowrap`
  ni recorte por altura fija — un título más largo simplemente envuelve a una segunda línea dentro
  de la tarjeta, no se corta. Sin cambios de CSS ni de frontend en la franja.

`node --check` OK en los 3 archivos tocados (`modulo-programas.js`, `modulo-cargas.js`,
`modulo-expediente.js`) + smoke test puro: etiqueta vacía/solo-espacios/ausente en alta → `null`
(nunca `''`); etiqueta sin cambios en edición (incluida con espacios extra) → `null`; etiqueta
cambiada en edición → el texto nuevo; etiqueta vaciada en edición → `null` (nunca borra el nombre);
título del chip de Embarques usa la etiqueta cuando existe y cae al código cuando viene `null`/`''`
(defensivo). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-25 (Captura desde la UI para Programas y Proyectos, E47-B)
Backend E47-B ya listo y probado: `v_programas_comerciales` ahora trae AL FINAL `venta_tipica_carga,
cajas_tipicas_carga, cliente_id, proveedor_id, producto_ids` (contrato previo intacto). El módulo
Programas (E47, solo lectura) y Proyectos (E42/E43, solo lectura salvo movimientos/presupuesto) pasan
a tener alta y edición completas, con el mismo gating por rol (`ERP.puede`) y manejo de errores
(`ERP.avisarSiPermiso`) que Facturas/Órdenes de Compra.

**1) Módulo Programas — captura nueva (`modulo-programas.js`):**
- **"+ Programa"** (capacidad `capturar`, botón junto al título de la lista): drawer (`ERP.abrirPanel`,
  mismo patrón de nuevaCarga por la cantidad de campos) con bloque, cliente/proveedor (autocompletar
  contra `v_catalogo_clientes`/`v_catalogo_proveedores`, **sin** "+ Nuevo" — `p_cliente_id`/`p_proveedor_id`
  son FK, no texto libre; si no aparece, se da de alta primero en Directorio Comercial), producto (texto
  libre con sugerencias de `v_catalogo_productos`, sí admite "+ Nuevo"), productos del catálogo
  (multi-select por checkboxes → `producto_ids`, opcional), modalidad (`margen_fijo|consignacion|
  comision|trueque|por_definir` — los dos últimos son EXCLUSIVOS del programa, no se tocó el enum de
  modalidad de Cargas), es_frente, ingreso_base+valor+retiene, frecuencia_valor+unidad+cargas_equiv_sem,
  todo_ano (checkbox que oculta/muestra mes_desde/mes_hasta), vía, término con proveedor, pick&pack,
  estado, nota. RPC `fn_crear_programa` → `{codigo}`; al crear se abre directo la ficha del programa
  nuevo (mismo patrón que nuevaCarga con `verCarga`) + toast con el código.
- **Fila de la lista clickeable** → ficha (drawer) de solo lectura con todos los campos + botón
  **"Editar programa"** (capacidad `editar`) que abre el mismo formulario precargado, más la sección
  "Datos de proyección" (venta_tipica_carga, cajas_tipicas_carga) y un campo **Motivo** obligatorio en
  la UI. RPC `fn_editar_programa` recibe **SOLO los campos que cambiaron** (el resto null = "no tocar",
  mismo contrato que `fn_editar_proyecto"); comparación por tipo (texto/número/booleano/conjunto) en
  funciones puras (`igualTxt/igualNum/igualBool/igualConjunto`) — probadas con smoke test aislado.
  Limitación conocida y aceptada (igual que Proyectos): un campo numérico/id no se puede vaciar a NULL
  desde la UI (vacío = "no tocar", nunca "bórralo"); texto y `producto_ids` sí soportan vaciarse
  (mandan `''`/`[]` explícito).
- **Ficha — cargas ligadas**: `v_cargas_programa` filtrada por `programa_codigo` (folio/P.O./id_v7,
  folio clickeable a Expediente). Acción **"Ligar embarque"** (input de folio, normalizado con
  `ERP.folioNormalizado`, nota opcional) y **"Desligar"** por fila (confirmación en modal ligero con
  nota opcional) → ambas usan `fn_ligar_carga_programa(p_folio, p_codigo|null, p_nota)`, gateadas con
  capacidad `capturar`.
- **Bonus de navegación**: como Programas ya tiene ficha por código, el chip "PC-0XX" de la lista de
  Embarques y el chip del header del Expediente (agregados en E47) ahora navegan directo a la ficha
  del programa (`ERP.irModulo('programas', codigo)`) en vez de solo a la lista general.

**2) Módulo Proyectos — alta de proyecto nueva (`modulo-proyectos.js`):**
- **"+ Proyecto"** (capacidad `capturar`): drawer con nombre, productor (autocompletar contra
  `v_catalogo_proveedores` — un productor ES un proveedor `es_proveedor=true`, mismo criterio que
  Directorio Comercial), código (opcional, auto si se deja vacío), descripción, temporada, vigencia
  desde/hasta, comisión %, ventas/cajas proyectadas, monto de línea, fuente de fondeo, **fondeador**
  (autocompletar contra `v_catalogo_admin` — el catálogo general de TODAS las clases de contraparte,
  porque el fondeador puede ser un socio virtual como JEAMS/Samuel o una entidad externa como
  AgroCapital, no solo un proveedor), costo financiero, nota. RPC `fn_crear_proyecto` → si devuelve
  `{codigo}` abre la ficha del proyecto nuevo directo; si no, toast con el texto de confirmación.
- **"Editar proyecto"** (capacidad `editar`, en la ficha): ya estaba implementado desde E44
  (`fn_editar_proyecto` con estado/tasa_anual/tasa_vigencia_desde/precio_valuacion_especie/nota/motivo,
  patrón solo-cambiados) y coincide exactamente con lo pedido en E47-B — **verificado, sin cambios**.

`node --check` OK en los 4 archivos tocados (`modulo-programas.js`, `modulo-proyectos.js`,
`modulo-cargas.js`, `modulo-expediente.js`) + smoke test puro: `validarTemporada` (todo_ano ignora
meses, cruce de año dic–abr válido, mes_desde/mes_hasta faltantes o fuera de 1–12 rechazados);
`armarPayloadCrear` (bloque a número, trim de producto/nota, meses con cruce de año tal cual);
`armarPayloadEditar` (sin cambios → todos los campos null salvo p_codigo/p_motivo; cambiar un solo
campo no contamina los demás; boolean es_frente detecta cambio; `producto_ids` vaciado manda `[]`
explícito, no null; nota cambiada se manda tal cual; motivo vacío se normaliza a null). CSS nueva
`.chk-lista` para el multi-select de productos. Desplegado y verificado en producción (los 5 archivos
tocados confirmados vía `curl` sirviendo el contenido nuevo).

## ACTUALIZACIÓN — 2026-07-25 (Módulo nuevo "Programas" + chip de programa en Embarques/Expediente/Agenda, E47)
Backend E47 agregó 4 vistas nuevas (todas authenticated-only): `v_programas_comerciales` (13 filas PC-001..PC-013), `v_programas_proyeccion` (12 filas, una por mes), `v_programa_cargas` (real por programa) y `v_cargas_programa` (mapa carga→programa, 66 filas). Solo consumo de vistas, sin escritura.

**1) Módulo nuevo `modulo-programas.js`** (ruta `programas`, menú "🌾 Programas" tras Proyectos), pantalla única en 3 secciones, solo lectura, visible a todos los roles:
- **Programas comerciales**: lista de `v_programas_comerciales` agrupada por bloque (chips por bloque, patrón de `modulo-proyectos.js`). Columnas Código · Cliente · Producto · Proveedor (`—` si null) · Modalidad · Ingreso · Frecuencia · Temporada · Estado. **Texto de Ingreso** compuesto en `textoIngreso()`: `pct_venta` → `"10% s/venta"` (+ `" (retiene 50%)"` solo si `plein_retiene_pct` no es null **ni** 100); `usd_caja` → `"$1.00/caja"`; cualquier otro caso (`por_definir`, base null, o `ingreso_valor` null) → badge ámbar **"POR DEFINIR"**. **Temporada** (`textoTemporada()`): `todo_ano` → "Todo el año"; si no, `"mmm–mmm"` de `mes_desde`/`mes_hasta` **sin reordenar** (así un cruce de año tipo dic–abr sale tal cual, sin lógica especial). Estado con pill activo=verde/por_arrancar=ámbar; `es_frente=false` → chip gris "no frente"; `nota` en tooltip ⓘ vía `ERP.cablearInfoNota`.
- **Proyección anual**: tabla de `v_programas_proyeccion` con barra inline por mes (`cargas_equiv_sem`, patrón `.barra-row`/`.fill` de Finanzas/Concentración) — el mes máximo se calcula siempre de los datos (`Math.max` sobre las 12 filas, **nunca** diciembre hardcodeado) y se resalta en verde. Fila clickeable por mes → detalle debajo. `ingreso_sem_activos`/`ingreso_sem_por_arrancar` se pintan con `usd()` salvo cuando el valor es exactamente 0 **y** ese mes tiene `programas_sin_dato > 0`, en cuyo caso se pinta "—" (para no mostrar un `$0.00` engañoso por falta de dato). Si algún mes tiene `programas_sin_dato > 0`, leyenda fija: *"N programas sin datos de ingreso — la proyección en $ está incompleta"* + lista de `codigos_sin_dato` del mes seleccionado (default: el mes máximo).
- **Real por programa**: tabla de `v_programa_cargas` con exactamente las 6 columnas pedidas — Código · Cargas · Primera · Última · Venta acumulada (`usd()`) · Últimos 7 días. Sin columnas extra aunque la vista trae más campos (bloque, producto, estado, venta_mes_actual).
- Export Excel/PDF estándar (`ERP.botonesExportar`) en cada sección. Registrado con `ERP.registrar('programas', ...)`; item de menú y `<script>` agregados en `index.html`.

**2) Chip de programa en Embarques y Expediente** (mismo patrón del chip 🌱 Proyecto de E42): `v_cargas_programa` se trae una sola vez al pintar la lista/expediente y se arma un mapa folio→`programa_codigo`.
- **`modulo-cargas.js`**: mapa nuevo `programaMap`, poblado en el `Promise.all` de `render()` (fetch con `.catch(()=>[])`, defensivo). En la celda de folio de la lista, si el folio está en el mapa, se agrega `<span class="pill verde ir-programa">PC-0XX</span>` con `e.stopPropagation()` (vive dentro de una fila ya clickeable) → `ERP.irModulo('programas')` (sin código — Programas no tiene ficha por código, a diferencia de Proyectos). Cargas sin programa: sin chip (nada que pintar).
- **`modulo-expediente.js`**: fetch de `v_cargas_programa` por folio (`.catch(()=>[])`) agregado al `Promise.all` de `verExpediente`; chip `🌾 PC-0XX` en el header del panel (junto al chip de proyecto existente), mismo click → `ERP.irModulo('programas')`.
- **CSS** (`estilos.css`): `.pill.ir-programa{cursor:pointer}` + hover a verde sólido.

**3) Agenda — fix de seguridad para `categoria: 'programa_sin_carga'`**: el backend ahora puede emitir una tarjeta de agenda con `folio=NULL`/`po=NULL` (un programa sin cargas en la semana). `htmlAgenda()` en `modulo-cargas.js` se hizo null-folio-safe: `data-folio` solo se emite si `a.folio` existe; el segmento de folio+PO en el encabezado de la tarjeta solo se pinta si hay folio; una tarjeta con `folio` null y `categoria==='programa_sin_carga'` queda clickeable hacia `ERP.irModulo('programas')` (nuevo atributo `data-ir-programa-agenda`) en vez de intentar abrir el Expediente; cualquier otra tarjeta con folio null (caso defensivo, no esperado hoy) queda simplemente sin link. El wiring de clic de la franja "Agenda de la semana" se extendió (no se tocó nada más de esa franja).

`node --check` OK en los 3 archivos tocados/creados (`modulo-programas.js`, `modulo-cargas.js`, `modulo-expediente.js`) + smoke test puro: los 3 casos de texto de Ingreso + fallback "POR DEFINIR" (incluyendo `retiene=100%` que NO debe mostrar la aclaración, y decimales tipo 7.5%); temporada con cruce de año (dic–abr, nov–ene) sin reordenar; tarjeta de agenda con folio null tanto para `programa_sin_carga` (sin `data-folio`, clickeable a Programas) como para un caso hipotético con otra categoría (sin `data-folio` y sin ningún link). Desplegado y verificado en producción (los 5 archivos tocados confirmados vía `curl` sirviendo el contenido nuevo).

## ACTUALIZACIÓN — 2026-07-24 (Ajuste — Proyectos: toggle del plan de flujo se oculta si es single-layer)
Dos problemas del toggle Plein/Santana/Total en "Plan de flujo del proyecto": (1) "Santana" es el nombre del productor de PRJ-005, no una etiqueta genérica — en otro proyecto (ej. PRJ-001/Akambarhu) el chip salía igual, con nombre equivocado; (2) HOY ningún proyecto usa la segunda capa (`santana_acum` = 0 en todos los meses de todos los proyectos), así que el toggle sobraba. Ajuste 100% frontend en `modulo-proyectos.js`, sin tocar backend/vistas.
- **`hayProductor`** se calcula de la serie (`estado.flujo.some(p => num(p.santana_acum) !== 0)`) — nunca hardcodeado. Si es `false` (caso de todos los proyectos hoy), `seccionFlujo()` **no pinta la fila de chips**, pero sigue pintando `#flujoWrap` + `#flujoBody` y `pintarFicha()` sigue llamando `pintarFlujo('plein')` igual: la curva Plein y su tarjeta de alerta se ven normal, solo sin el toggle.
- Si `hayProductor` es `true` (algún proyecto futuro multi-capa), el toggle se pinta con la etiqueta **genérica "Productor"** en vez de "Santana" — la clave interna `'santana'` no cambió (el backend la sigue usando tal cual).
- El wiring de `#flujoWrap [data-capa]` en `pintarFicha()` ya era condicional a que hubiera chips; sin ellos, el `querySelectorAll` simplemente no itera nada — no rompe.
- `node --check` OK + smoke test puro: caso single-layer (sin toggle, `#flujoWrap`/`#flujoBody` se pintan igual), caso multi-capa con la etiqueta "Productor" para la clave `santana`, caso límite (un solo mes con `santana_acum` distinto de cero ya activa el toggle), y caso de serie vacía. Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Finanzas — panel "Días de pago por cliente", E46)
Backend E46 agregó `v_dias_pago_observado` (días de crédito contratado vs observado vs gap por cliente, sobre embarques cobrados completos, ordenada por `pct_cxc` desc) — insumo del futuro flujo proyectado 30/60/90 (hoy todos los clientes en 15 días provisionales). Panel nuevo en `modulo-finanzas.js`, junto a Antigüedad CxC/CxP.
- Fetch con `.catch(()=>[])` (si truena, sección vacía, no rompe la pantalla); tabla: Cliente · Embarques · Contratado · Observado (`prom / mediana`, ej. "138 / 133") · Gap · CxC viva · % CxC.
- **Gap con semáforo** (`.pill` gris/ámbar/rojo): `<=0` gris, `1..29` ámbar, `>=30` rojo; con signo (`+123 d` / `-11 d` / `0 d`). Umbrales son constantes de UI; el dato siempre sale de la vista.
- **Callout** arriba de la tabla SOLO si la primera fila (mayor `pct_cxc`) tiene gap rojo — nombre/porcentaje/días leídos de esa fila, nunca hardcodeados.
- **Leyenda**: "Solo clientes con historial de cobro completo; cubren X% de la CxC viva." con X = suma calculada de `pct_cxc` de las filas (no hardcodeada).
- Formatos: días enteros + " d" (salvo el par prom/mediana, sin unidad, tal cual el ejemplo dado); montos con `usd()`; % a 1 decimal. Export Excel/PDF estándar (`ERP.botonesExportar`); visible a todos los roles (solo lectura, sin gating adicional).
- `node --check` OK + smoke test puro: badge por los 7 puntos de corte de gap (incl. negativos y los dos límites 0/29/30), suma de `pct_cxc` en la leyenda, y el callout apareciendo solo cuando el top tiene gap ≥30 (no con ámbar ni gris, incluido el caso límite exacto =30). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Expediente/ficha clásica — columna MOV clickeable a Tesorería)
La columna "Mov." de `v_carga_aplicaciones` (pestaña "Pagos y Cobros" del Expediente y la tabla de aplicaciones de la ficha clásica) salía como texto plano. Ahora, igual que el "Libro de la línea" de Proyectos (E44), `mov_folio` se envuelve en un `<span class="chip-folio" data-ir-tesoreria="{folio}">` que navega con `ERP.irModulo('tesoreria', 'mov:' + folio)` — Tesorería ya sabe forzar la cuenta, limpiar filtros, hacer scroll y resaltar la fila (construido en E44, sin tocar).
- **`modulo-expediente.js`** (`htmlPagos`): celda de Mov. condicional (chip clickeable si hay folio, "—" si no) + wiring nuevo `cablearMovLinks(cont)` llamado tras pintar la pestaña "pagos".
- **`modulo-cargas.js`** (ficha clásica, `pintarFicha`): misma celda condicional; wiring inline junto a `ERP.cablearInfoNota()`.
- **Defensivo:** `mov_folio` null/vacío nunca genera el atributo `data-ir-tesoreria` — se pinta "—" plano, sin link roto (backend confirmó 0 de 175 aplicaciones con `mov_folio` null, pero la defensa cubre el caso igual).
- Sin cambios en Tesorería (ya construida en E44) ni en el backend. `ERP.irModulo` (no existe `ERP.irA`).
- `node --check` OK en ambos archivos + smoke test puro (construcción del link para folios con valor, texto plano sin atributo para null/undefined/''/0, y simulación del listener delegado navegando a `mod:'tesoreria', param:'mov:361'`). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Proyectos — Plan de flujo del proyecto, E45)
Backend E45 agregó `v_proyecto_flujo` (1 fila por proyecto/mes, columnas `plein_mes/santana_mes/total_mes` + sus `_acum`) y `v_proyecto_flujo_pico` (3 filas por proyecto, una por capa `plein|santana|total`, con `mes_pico`, `monto_pico`, `mes_cruce_positivo`, `saldo_final`). Ambas solo por vista (authenticated), sin tocar contabilidad.

**1) Sección nueva "Plan de flujo del proyecto"** en la ficha de `modulo-proyectos.js`, colocada arriba de "Presupuesto de gastos del proyecto":
- Fetch de ambas vistas dentro del `Promise.all` de `verProyecto()`, cada una con `.catch(()=>[])` — si truenan, la sección degrada a estado vacío sin romper la ficha.
- Si `v_proyecto_flujo` viene vacía: "Este proyecto no tiene plan de flujo sembrado todavía." (estado amable, no error) y **sin toggle** (no tiene sentido alternar capas sin datos).
- **Toggle segmentado Plein/Santana/Total** (chips reutilizando `.chip`/`.chip.activo`; default **Plein**, la curva que le importa a tesorería). Al cambiar, `pintarFlujo(capa)` repinta **solo** `#flujoBody` (sin refetch) con la serie `*_acum` de esa capa y la fila de `v_proyecto_flujo_pico` correspondiente.
- **Gráfica SVG inline a mano** (sin librerías — el stack no trae charting): ~100% ancho × 220px vía `viewBox` + `preserveAspectRatio="none"`. Línea + área de la serie acumulada; línea base en cero **siempre marcada** (el escalado fuerza `0` a entrar en el rango min/max aunque toda la serie sea negativa o positiva); tramo negativo en rojo-suave (`var(--rojo)`/`var(--rojo-bg)`) y positivo en verde-suave (`var(--verde)`/`var(--verde-claro)`) mediante dos `<clipPath>` (por encima/por debajo de la línea de cero) — sin necesitar interpolar el punto exacto de cruce. Eje X con etiquetas `mmm-YYYY` (throttled a ~7 visibles para no amontonar si hay muchos meses). Punto + etiqueta marcados en el mes del **pico** (mínimo) y en el mes de **cruce a positivo** (si existe). **Nada de rangos hardcodeados**: min/max se calculan de la serie real en cada repintado.
- **Tarjeta de alerta** (encima de la gráfica), leyendo la fila de `v_proyecto_flujo_pico` de la capa activa: *"Pico de exposición: $X en mmm-YYYY · cruza a positivo en mmm-YYYY · cierre $Y."* — si `mes_cruce_positivo` es NULL: *"…no cruza a positivo dentro del horizonte del plan."* Severidad roja si `monto_pico < 0`, gris si ≥ 0 (mismo patrón visual que la barra de cuadre de Balance en Finanzas).
- Montos con `usd()`, meses con un formateador local `mesLargo()` (mmm-YYYY con año completo, mismo patrón `MESES` ya usado en otros módulos) — no se reutilizó `ERP.mesTexto` porque trunca el año a 2 dígitos.

**2) Renombrada la sección de presupuesto** — "Presupuesto del proyecto" → **"Presupuesto de gastos del proyecto"**, con subtítulo nuevo: *"Gastos blandos del proyecto (viáticos, QC en campo, asesoría, legal…). Es distinto del plan de flujo de arriba."* Solo copy — misma lógica, mismas RPCs (`fn_capturar_presupuesto` intacta).

`node --check` OK + smoke test puro de escalado SVG (caso todo-negativo → línea de cero en el tope; caso con cruce → línea de cero a media altura; serie plana y de 1 punto → sin división entre cero) y de la tarjeta (con/sin `mes_cruce_positivo`, severidad roja/gris, pico null). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Tesorería — navegación directa a un movimiento por folio)
Antes, hacer clic en un folio de movimiento (en "Libro de la línea" o "Movimientos ligados" de la ficha de Proyectos) navegaba a Tesorería pero caía en la lista completa sin ubicar el movimiento. Ahora navega directo a la fila, con scroll + resalte temporal.

- **`modulo-tesoreria.js`**: `render(cont, parametro)` acepta `'mov:361'`. Si el folio existe en `v_estado_cuenta`, se **fuerza su cuenta (`cuenta_id`)** y se **limpian los filtros de fecha/texto** antes de pintar, garantizando que la fila sea visible sin depender de qué cuenta/rango estuviera seleccionado por defecto. Cada `<tr>` del estado de cuenta ahora lleva `id="mov-{folio}"` y `data-folio="{folio}"`.
- Función nueva `irAMovimiento(folio)`: busca la fila (por `id`, con fallback por `data-folio`), hace `scrollIntoView({behavior:'smooth', block:'center'})` y agrega la clase `.fila-destacada` ~2.5s (se quita sola por `setTimeout`, nunca queda fija). Si el folio no aparece ni tras ajustar cuenta/filtros (folio inexistente), toast de aviso: *"No se encontró el movimiento #361 en el estado de cuenta."* — no rompe la pantalla.
- **`modulo-proyectos.js`**: los enlaces a movimiento en "Libro de la línea" (`a.movimiento_folio`) y "Movimientos ligados" (`m.folio`) ahora llevan el folio en `data-ir-tesoreria="{folio}"` y el clic navega con `ERP.irModulo('tesoreria', 'mov:' + folio)` (mismo mecanismo de ruteo+parámetro que usa Embarques para abrir el Expediente). El enlace "Aplicado a" de Tesorería ya apuntaba correctamente a `ERP.verCarga` (folio de carga, no de movimiento) — se revisó y no aplicaba cambio ahí.
- **CSS**: `.fila-destacada{animation:destello 2.5s ease-out}` con `@keyframes destello` de `var(--verde-claro)` a transparente, respetando la paleta.
- `node --check` OK en ambos módulos + smoke test aislado de `irAMovimiento` (folio encontrado por id, folio inexistente → toast sin excepción, fallback por `data-folio`, y verificación de que la clase se retira sola tras ~2.5s). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Ajustes de UI: Tesorería estado de cuenta + Embarques fecha/rango)
Dos ajustes 100% frontend, sin tocar backend (todos los campos ya existían en las vistas).

**1) Tesorería — Estado de cuenta (`modulo-tesoreria.js`):**
- Columnas reordenadas al estilo de la pestaña CHASE del V7: **Folio · Fecha · Contraparte · Tipo · Descripción · Ingreso · Egreso · Saldo · Aplicado a**. Contraparte, Tipo y Descripción siguen siendo tres columnas independientes (nunca se fusionan).
- Si `descripcion` viene vacía o es idéntica a `contraparte` (comparación normalizada: minúsculas, sin acentos), se pinta **"—" en gris** en vez de repetir el nombre.
- `aplicado_a` ya era clickeable al Expediente (`ERP.verCarga` vía `.chip-folio`) — verificado, sin cambios.
- Nueva clase `.col-desc` (min-width 280px, ~40 caracteres) para que la columna Descripción, al ser la más ancha, no se trunque en pantallas angostas.
- El `tfoot` no cambió de colspan (mismo número de columnas antes de "Ingreso").

**2) Embarques — fecha visible + filtro por rango (`modulo-cargas.js`):**
- Columna nueva **"Embarque"** (f_embarque, formato DD-mmm-YYYY vía `ERP.fecha`) después de P.O., **ordenable** (clic en el header, mismo patrón que la columna Utilidad — arrow ⇅/▲/▼, mutuamente exclusiva con el sort de Utilidad). **Orden por defecto: f_embarque DESC** (antes era por folio); las cargas sin fecha (ej. "Por Confirmar") quedan al final.
- **Filtro de rango de fechas** arriba, junto a los chips: dos `<input type="date">` (Desde/Hasta) + atajos "Este mes", "Mes pasado", "Últimos 30 días", "Todo". Cálculo de fechas 100% en **hora local del navegador** (no `toISOString()` crudo, que cruzaría de día tras ~17-18h en México — el mismo tipo de bug de zona horaria que ya se corrigió en el backend con `fn_hoy()`; aquí es cálculo cliente puro, pero se hizo bien desde el inicio).
- El rango es **acumulativo** con los chips de estado/cobro y con la búsqueda de texto (`enRango()` se aplica en `filtradas()` junto al resto). El rango activo se muestra como una **etiqueta removible** ("01-jul-2026 – 24-jul-2026 ✕").
- **Los conteos de los chips respetan el rango activo**: se extrajo la construcción de la barra de chips a una función `pintarFiltros()` que se repinta sola (sin refetch) cada vez que cambia el rango, así los números y la visibilidad de cada chip (incluida "Anuladas" y los estados del catálogo) reflejan el rango vigente.
- **Export Excel/PDF exporta lo filtrado**: ya lo hacía (el scraper lee el DOM de `#cargasTabla`, que solo pinta `filas` filtradas). El **título del PDF ahora incluye el rango aplicado** — se actualiza el `dataset.expTitulo` de los botones de export en cada cambio de rango (leído al vuelo por `cablearExportar` al hacer clic, sin necesidad de re-cablear).
- **Responsive**: en móvil los dos `<input type="date">` se apilan verticalmente (`@media max-width:640px`), no lado a lado.
- `node --check` OK en ambos módulos + smoke test de lógica pura (rangos de fecha en hora local, `enRango` en todos los casos límite, orden base f_embarque DESC con folio de desempate, y la normalización de "descripción repite contraparte"). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-24 (Módulo "Proyectos" — financiamiento a productores)
Módulo nuevo `modulo-proyectos.js` (ruta `proyectos`, menú "🌱 Proyectos" tras Embarques) sobre el backend E42/E43. Solo consume vistas + RPCs (todas devuelven texto humano → se muestra tal cual en el toast; errores del backend tal cual). NO hay alta de proyectos/contratos ni edición de presupuesto (por chat).
- **Lista** (`v_proyectos`): Código · Proyecto · Productor · Estado (badge suave activo/cerrado/cancelado) · Línea · Dispuesto · Saldo vivo · Disponible · Comisión proy. · Fondeo (fuente + fondeador). Guion en proyectos sin línea (`monto_linea` 0/null). Export Excel/PDF estándar; clic en fila → ficha.
- **Ficha** (drawer, patrón Expediente): (a) header con código/nombre/productor/estado/temporada/vigencia/fondeo/costo financiero/tasa ("pendiente" si NULL) + precio valuación; (b) **KPIs** Línea/Dispuesto/Recuperado/**SALDO VIVO** (destacado)/Disponible/Comisión proyectada; (c) **Rentabilidad** (`v_proyecto_rentabilidad`): ingreso − costo financiero real − gastos = **UTILIDAD REAL** (verde/rojo), presupuesto Plein informativo aparte; (d) **Contratos** (`v_proyecto_contratos`, solo lectura); (e) **Libro de la línea** (`v_proyecto_amortizaciones` por fecha asc): efecto chip (cargo ámbar/abono verde/informativo gris), liga a movimiento (→ Tesorería) y a embarque (→ Expediente) + botón "+ Registrar movimiento de línea" → `fn_registrar_amortizacion`; (f) **Presupuesto** (`v_proyecto_presupuesto`) con absorbe (chip) + "+ Línea de presupuesto" → `fn_capturar_presupuesto` (categoría desde `categorias_presupuesto`); (g) **Ligas** plegables (`v_proyecto_movimientos` y `v_proyecto_cargas`) con navegación cruzada; (h) **"Editar proyecto"** (capacidad `editar`) → `fn_editar_proyecto` enviando **solo los campos que cambiaron** (los demás NULL = no tocar).
- **Gating:** ver = todos; captura solo `capturar`; editar solo `editar`. Tras cada escritura exitosa se refresca la ficha (KPIs + libro).
- **"Datos faltantes":** la acción "ID del V7" ahora **captura** (input inline mono + Guardar → `fn_asignar_id_v7`; el backend bloquea duplicados y se pinta su mensaje; tras éxito la fila desaparece). Se quitó el pendiente de `fn_asignar_id_v7` de `PENDIENTES-BACKEND.md`.
- **Expediente:** si la carga está ligada a un proyecto (se lee de `v_proyecto_cargas` por folio, `.catch → null`), el header muestra el chip **"🌱 PRJ-XXX"** con clic a la ficha del proyecto (`ERP.irModulo('proyectos', codigo)`); si no hay proyecto, no se pinta.
- Pendientes anotados en `PENDIENTES-BACKEND.md`: el backend E43 **ya agregó** `fn_crear_proyecto`, `fn_crear_contrato`, `fn_editar_presupuesto` y `fn_eliminar_presupuesto`, pero **la UI todavía NO los consume** (no hay alta de proyecto/contrato ni edición/borrado de presupuesto en la ficha) — quedan como "existen, falta consumirlos".
- `node --check` OK (3 archivos) + smoke test (PRJ-001: línea 150,000 / disponible 150,000 / comisión 183,879 / tasa pendiente; guion sin línea; editar solo campos tocados; validaciones). Desplegado y verificado. **La escritura real se dejó a Miguel (no se ensució producción).**

## ACTUALIZACIÓN — 2026-07-23 (Pantalla nueva "Datos faltantes")
Lista de trabajo para cerrar de un jalón los campos sin capturar (0/74 con entrega real, 0/74 con responsable) que tienen al motor de alertas al tercio. Módulo nuevo `modulo-datos-faltantes.js` (ruta `faltantes`) sobre `v_cargas_datos_faltantes`, sin tocar backend.
- **Entrada en el menú** "Datos faltantes" justo después de "Revisiones Pendientes", con contador (n filas). **Si la vista devuelve 0 filas, la entrada del menú se oculta completa** (no solo el badge) — vía `refrescarBadgeFaltantes()` en `app.js`, llamado en boot, tras cada refresco y en `erp:escritura`.
- **Tabla:** Carga · P.O. · Cliente · Producto · Estado (badge) · Qué falta · Acciones. **Respeta el orden de la vista** (`order=peso.desc`, lo que bloquea una alerta va primero — NO se reordena por folio). Cada elemento de `faltantes` se pinta como **etiqueta chica ámbar** (con fallback al texto `falta`).
- **Acciones por fila, reusando lo existente (no se duplica):** "Confirmar entrega real" → abre el Expediente (su form de confirmar entrega) vía `ERP.verCarga`; "Responsable" → botón que revela el **selector inline `ERP.montarResponsable`** en la misma fila; "ID del V7" → **solo etiqueta informativa** (no hay captura aún — anotado en `PENDIENTES-BACKEND.md`: se necesita `fn_asignar_id_v7`).
- **Recarga tras cada acción:** el selector de responsable recarga la lista en su `onDone`; confirmar entrega dispara `erp:escritura` + `datosSucios`, así que al cerrar el Expediente la lista se re-renderiza sola y **la fila desaparece cuando ya no le falta nada** (ese feedback es el punto de la pantalla).
- **Export Excel/PDF** con `ERP.botonesExportar` (`#tblFaltantes`). **Gating:** visible para todos los roles; las acciones (botones/selector) solo con capacidad `capturar` (sin ella, "solo lectura"). Las acciones se rinden como botones/etiqueta (no un `<select>` crudo en el DOM inicial) para que el export salga limpio.
- `node --check` OK + smoke test (ruteo de acciones por `faltantes`, orden respetado, menú oculto en 0). Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-23 (E41-D — Agenda operativa + responsable por carga)
Backend E41-D: `v_agenda_operativa` (alertas operativas por carga, ordenadas por `orden`, severidad rojo/ambar), `v_carga_detalle` ahora trae `responsable` + `responsable_nombre`, y `fn_asignar_responsable(p_folio, p_socio, p_nota)` (socios de `v_socios_asignables`). Todo frontend, sin tocar backend.
- **Franja "Agenda de la semana"** arriba de la lista de Embarques (`modulo-cargas.js`): tarjetas compactas desde `v_agenda_operativa` (reusa `.hoy-cards/.hoy-card`, rojas primero por `orden`), cada una con folio (clic → Expediente), título, detalle y responsable ("— Chanes"). **Sin datos → franja oculta del todo** (sin estado vacío; el fetch va con `.catch(()=>[])`). **Colapsable**, con el colapso recordado en una variable JS de sesión (`agendaColapsada`), **no localStorage**.
- **Responsable en Expediente y ficha clásica:** celda "Responsable: <nombre>"; con capacidad `capturar`, un `<select>` (`v_socios_asignables` + "— Nadie") que llama `fn_asignar_responsable` y muestra su texto de retorno en el toast (helper compartido `ERP.montarResponsable`, con `v_socios_asignables` cacheado). Refresca la vista al asignar.
- **Alta de carga:** selector opcional "Responsable"; tras `fn_crear_carga` exitoso, si se eligió uno se llama `fn_asignar_responsable` con el folio devuelto. Si ese 2º paso falla, se avisa que **la carga SÍ se creó pero quedó sin responsable** (no se revierte).
- **Lista de Embarques:** columna **"Resp."** al final con el primer nombre del responsable (guion si NULL); `tfoot` con celda trailing extra para cuadrar (header 16 cols = colspan 8 + 8 celdas).
- **Inicio:** NO se duplica la agenda — Panel Hoy ya la recibe del backend (categoría "Operación"). Sin cambios ahí.
- `node --check` OK + smoke test (agenda oculta/vacía y ordenada, pie cuadrado, primer nombre, selector "— Nadie", mensaje de retorno). Desplegado y verificado.
- **Ajuste (2026-07-23):** cada tarjeta de la Agenda ahora muestra el **P.O. junto al folio** (mono, gris, separado por `·`): `P-077 · NGM247514 · Embarca pronto — Chanes` — así Samuel reconoce la carga por su P.O. `v_agenda_operativa.po` ya venía; solo se pinta. Si `po` es null/vacío se **omite el segmento completo** (sin guion suelto, que en la tarjeta estorba; en la columna de la tabla sí va guion).

## ACTUALIZACIÓN — 2026-07-23 (Embarques — columna P.O. en la lista)
La regla de oro (CLAUDE.md #11) es cotejar por P.O., no por folio (33 de 74 vivos tienen `id_v7 ≠ folio`), pero el P.O. solo se veía abriendo la ficha. Ahora está en la lista, sin tocar backend (`v_carga_detalle.po` ya existía).
- **Columna "P.O." inmediatamente después de Folio** (antes de V7): las llaves de cotejo quedan juntas y arriba en la jerarquía. Monoespaciada (`.mono` = IBM Plex Mono) y `white-space:nowrap` para escanearla de un vistazo.
- **Guion cuando es vacío/NULL** (`c.po ? esc(c.po) : '—'`), nunca celda vacía ni "null" — cubre las cargas "Por Confirmar" que legítimamente aún no tienen P.O.
- **Pie ajustado:** `colspan` 7 → 8 (header pasó a 15 columnas; 8 + 7 celdas de totales = 15, cuadra).
- **Export:** verificado contra la lógica de `scrape` en exportar.js — la columna tiene encabezado no vacío, así que nunca se marca como columna-acción y **viaja en Excel/PDF** (selector `#cargasTabla table`). No asumido.
- **Buscador:** ya filtraba por PO, intacto. **Recordatorio "cotejar por P.O."** del Expediente (resalte ámbar cuando `id_v7 ≠ folio`): revisado — el texto no asumía que el P.O. estuviera oculto, sigue válido (el P.O. ahora se ve en lista y Expediente), sin reescritura.
- **Responsive:** `.tabla-wrap` ya hace scroll horizontal; en móvil se desplaza la tabla completa, no se sacrifica ninguna columna (menos aún P.O.).
- `node --check` OK + smoke test (guion en null/vacío, pie cuadrado). Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-23 (E41 — Estados de embarque v2: 8 estados + matriz de transiciones)
Backend E41 amplió `cargas.estado` de 6 a 8 y agregó `v_estados_carga` (8 filas: etiqueta/orden/cuenta_como_embarque/exige_po/es_terminal…), `v_estado_transiciones` (27 filas con capacidad + es_retroceso + nota), `fn_mover_estado_carga(p_folio, p_estado, p_nota)`, y `v_anclas.cargas_por_confirmar`. **Todo se lee del catálogo — cero listas de estados hardcodeadas en la UI** (mismo criterio que v_balance).
- **`comun.js` — cache de catálogo:** `ERP.cargarEstados()` hace UN fetch de `v_estados_carga` + `v_estado_transiciones`, cacheado; se precarga en `app.js` al abrir sesión. `ERP.badgeEstado`/`estadoInfo`/`catalogoEstados` ahora leen etiqueta/orden/clase del cache; un estado nuevo lo absorbe solo (color por defecto gris). Sin `.catch` que enmascare: si truena, la app degrada al valor crudo y el módulo que lo pide muestra su errbox. Colores nuevos `.badge-estado.lila` (#9B3FAB, "Cargas por Confirmar") y `.naranja` (#C25311, "Revisión/QC") cercanos al tablero de Samuel.
- **Lista de Embarques:** los chips de estado se generan y **ordenan por `orden`** del catálogo (con etiqueta del catálogo), ocultando los de 0 vivas. **"Cargas por Confirmar"** (cuenta_como_embarque=false) va **al inicio, separado** (chip lila) y **NO suma a "Todas"** (sigue dando 74) ni a los totales — la exclusión se deriva de `cuenta_como_embarque`, no de comparar el texto. La vista base y el filtro respetan eso.
- **Botón "Cambiar estado"** (header del Expediente y ficha clásica): abre un **modal** con las transiciones filtradas por `desde=estado actual` y `capacidad` según `ERP.puede`. Si no hay ninguna → botón **deshabilitado con tooltip** explicando la capacidad requerida. Muestra la `nota` de la transición, aviso ámbar si `es_retroceso`, y campo de nota libre → `p_nota`. Llama `fn_mover_estado_carga` y muestra su `mensaje` tal cual; errores del backend vía `ERP.avisarSiPermiso` (el filtro es UX, el candado es del backend). Refresca ficha/Expediente + lista.
- **Alta de carga:** el `<select>` de estado sale del catálogo. Con un estado `exige_po=false` (Por Confirmar) el **P.O. deja de ser obligatorio** y aparece la leyenda "Sin P.O. todavía: … NO cuenta como embarque hasta confirmarla"; con cualquier otro, P.O. vuelve a exigirse. `fn_crear_carga` recibe `p_po=null` cuando va vacío.
- **Inicio:** el total de cargas vigentes excluye Por Confirmar y muestra "+N por confirmar" como dato secundario.
- **Facturación:** sin cambio de regla — `fn_emitir_factura` exige "Entregada"; como Revisión/QC ≠ Entregada, el botón ya queda deshabilitado con el tooltip "Se emite cuando el embarque esté Entregada" (sin listar estados).
- **Expediente:** el mini-form de "Confirmar entrega" avisa que confirmar también avanza el estado a Entregada (fn_confirmar_entrega ya lo hace), para no cambiarlo dos veces.
- Nota: el "pipeline" visual de la ficha clásica sigue siendo cosmético sobre las 4 etapas del happy-path (no dirige lógica); el catálogo no codifica un pipeline lineal, así que se deja como decorado.
- `node --check` OK (5 archivos) + smoke test (Todas=74, chips ordenados, transiciones por rol, candado, P.O. opcional). Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-23 (Embarques — chip de "Estatus de Cobro")
Chip de estatus de cobro en las cargas, 100% frontend consumiendo `v_cxc` (sin tocar backend).
- **Helpers compartidos (`comun.js`):** `ERP.estatusCobro(cx)` evalúa en orden y devuelve `{clave, texto, sub, clase}` — (1) no está en v_cxc → **Sin liquidar** (gris); (2) `saldo_cxc ≤ 0` → **Cobrado** (verde); (3) `dias_vencido > 0` → **Vencido** (rojo, sub `${dias_vencido}d`); (4) `cobrado > 0` → **Parcial** (azul, sub % cobrado, **nunca NaN**: si venta 0/nula se omite el %); (5) resto → **Pendiente** (ámbar, sub `vence en ${-dias_vencido}d`). `ERP.chipCobroHTML(cx)` reúsa el componente `.badge-estado` (paleta gris/verde/rojo/azul/ámbar existente).
- **Carga de datos:** `render()` de Embarques hace **UN solo fetch de `v_cxc`** en paralelo, lo indexa por folio en un `Map` y lo cruza con la lista ya traída (no hay consulta por carga). Si `v_cxc` falla, `cxcOk=false` y la lista funciona **sin chips**.
- **Lista de Embarques:** columna nueva **"Cobro"** después de Estado (viaja en el export; anuladas sin chip). `colspan` del pie ajustado.
- **Filtro:** 5 chips nuevos de cobro (Cobrado/Parcial/Vencido/Pendiente/Sin liquidar) con conteo, mismo patrón single-select `data-estado="cobro:<clave>"`; `filtradas()` los resuelve. Solo se muestran si `cxcOk`.
- **Modal de detalle (Expediente):** el chip va en el encabezado junto al estado, más una línea **Venta · Cobrado · Saldo por cobrar**. El Expediente hace UNA consulta de `v_cxc` para ese folio (es el detalle abierto, no la lista), robusta ante cualquier punto de entrada.
- **Verificación esperada:** 26 Cobrado · 9 Parcial · 26 Vencido+Pendiente · 13 Sin liquidar = 74. `node --check` OK (3 archivos) + smoke test de las 5 reglas. Desplegado y verificado.
- **Ajuste (2026-07-23):** como "Vencido" gana sobre "Parcial" y las 9 cargas con abono también están vencidas, el chip Parcial nunca aparecía y se perdía la señal del abono. (a) En `ERP.estatusCobro`, la rama "Vencido" ahora agrega el % al sub si hubo abono: `${dias_vencido}d · ${pct}% cobrado` (misma protección: sin % si venta 0/nula → nunca NaN). (b) En el filtro, el chip **"Parcial" filtra por "tiene abono parcial"** (`cobrado>0 && saldo_cxc>0`), esté vencida o no, vía el helper `enCobro()`; se **traslapa con Vencido a propósito** (preguntas distintas). Conteos tras el cambio: **Vencido 31 · Cobrado 26 · Sin liquidar 13 · Pendiente 4** (partición = 74) y **Parcial 9** (⊂ Vencido). Verificado con smoke test.

## ACTUALIZACIÓN — 2026-07-22 (E39 — Utilidad por carga + pantalla "Posición de caja")
Backend E39: `v_carga_detalle` expone `venta_esperada, utilidad, utilidad_es_estimada, margen_pct, utilidad_nota`; y vista nueva `v_posicion_liquidez(orden, seccion, concepto, monto, nota)`.
- **Helpers compartidos (`comun.js`):** `ERP.utilidadColor(u)` (verde >0, rojo <0, normal =0/NULL), `ERP.utilidadTexto(u, est, nota)` (NULL→"—" nunca $0.00; sufijo " (est.)" si `utilidad_es_estimada`; ícono ⓘ con `utilidad_nota` SOLO en tooltip), `ERP.margenTexto(m)` ("8.15%" o "—"), y `ERP.cablearInfoNota(cont)` (ⓘ con hover + tap/Enter → toast, `stopPropagation` para que el tap en una fila clickeable no abra la ficha). La `utilidad_nota` nunca se pinta como texto suelto.
- **Lista de Embarques (`modulo-cargas.js`):** columna **"Utilidad"** después de Venta, con color/est./ⓘ y total en el pie. **Ordenable** por clic en la cabecera (▼/▲, NULLs siempre al final; se resetea a orden por folio al entrar). Viaja en el export Excel/PDF (se raspa `#cargasTabla`).
- **Expediente (Resumen) y Ficha clásica:** tarjetas **"Utilidad"** y **"Margen %"** junto a "Margen por caja" / "Margen bruto", mismo criterio de pintado; ⓘ cableado en ambos.
- **Pantalla nueva "Posición de caja" (Finanzas):** sección desde `v_posicion_liquidez`, agrupada por `seccion` y ordenada por `orden` (nunca hardcodeado); secciones Entra/Sale/Socios/Resultado; renglones que empiezan con TOTAL/FLUJO/POSICION en negritas con línea superior (clase `.total`); **"POSICION NETA" verde si ≥0, rojo si <0**; `nota`→ⓘ; montos `$12,345.67`; texto fijo explicativo arriba; export Excel/PDF con el helper existente. **Sin `.catch`**: si la vista truena, se ve el errbox del módulo (igual que Balance).
- `node --check` OK (4 archivos) + smoke test de la lógica. Desplegado y verificado en producción.
- **Ajuste E39b (2026-07-23):** `pintarPosicionLiquidez` ahora agrupa por `seccion` con encabezado de grupo (recorriendo las secciones como vengan, sin hardcodear nombres ni `orden`) y la sección **"Informativo"** va separada (divisoria arriba, texto en gris, sin negritas, rotulada "no entra en la suma") por ser dato de contexto fuera de la aritmética; verificado que "Ventas con precio pactado por escrito" muestra `$0.00`. `node --check` OK, desplegado.

## ACTUALIZACIÓN — 2026-07-22 (Embarques — los conteos por estado excluyen anuladas)
Los chips/contadores por estado contaban TODAS las filas de `v_carga_detalle`, incluidas las anuladas, mostrando basura (ej. "Falta informacion 3", "En Camino 2", "Rechazo 2" — todas anuladas, 0 vivas). Corregido en `modulo-cargas.js`, consumiendo la columna `anulado` que ya trae la vista:
- **Vista base = solo cargas vivas (`anulado != true`):** `filtradas()` excluye anuladas en TODOS los filtros operativos (Todas, Activas, Con flag y cada estado); las anuladas solo aparecen con el chip "Anuladas". La tabla por defecto (`todas`) ya no las muestra.
- **Conteos sin anuladas:** `nEstado`, `nActivas`, `nFlag` y la nueva "Todas" (`nVivas`) filtran `!anulado`. "Todas" ahora es 70 (antes 77).
- **Chips de estado en 0 no se muestran:** `estados()` solo lista estados con ≥1 carga viva. Hoy quedan **Cerrada (48) · Entregada (21) · Programada (1)**; desaparecen Falta informacion, En Camino y Rechazo (solo existían en anuladas).
- **Anuladas separadas:** el chip **"Anuladas ⊘ (7)"** se movió al final de la barra (con separación), fuera de los estados operativos; el usuario lo activa a propósito para ver las anuladas.
- **Inicio:** el total de cargas vigentes ya excluía anuladas (`cargas.length - anuladas` = 70, no 77); verificado en producción. Sin cambios necesarios ahí.
- `node --check` OK + smoke test (Todas 70, Anuladas 7, estados vivos 48/21/1, "En Camino" 0 sin chip). Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-22 (Consolidación de documentos — un solo sistema oficial)
La pantalla mezclaba dos sistemas: `documentos` (oficial: `fn_registrar_documento` + `v_documentos`, bucket `documentos`) y `carga_documentos` (jubilada, con `mov_folio` INTEGER que causaba `invalid input syntax for type integer` al anotar la PO del cliente). Consolidado en el sistema oficial, sin tocar backend:
- **Expediente → pestaña Documentos:** ya NO usa `carga_documentos` (se borró todo ese código: form con `mov_folio`, insert directo, lista sobre `v_carga_documentos`, constantes). Ahora **delega en `ERP.documentos.montar(cont, { entidad: 'carga', entidadId: folio, permitirSubir: !anulado })`** — el mismo componente que ya usaba la ficha clásica. Un solo camino.
- **Componente `ERP.documentos` (documentos.js):** se le agregó el campo **"Referencia externa" (PO cliente, contenedor, guía/BL)**, texto libre opcional, que se manda como `p_referencia_externa`; se muestra en la lista. Ya cumplía el resto: categoría del catálogo `v_categorias_documento` (nombre EXACTO, ej. "Orden de compra"), validación de tipo/tamaño/campos **antes** de subir al Storage, y limpieza del archivo huérfano si el registro falla. Se corrigió su header (estaba marcado DEPRECADO por error; es el sistema vivo).
- **Bug del folio bancario eliminado de raíz:** el campo `mov_folio` desapareció; la PO/contenedor/guía va en "Referencia externa" (texto) o en "Nota".
- **Menú:** se retiró el enlace legacy `captura.html` ("Capturar movimiento") — la captura de movimientos ya vive en la SPA (`ERP.capturarMovimiento`: botón en Tesorería y contextuales en Cobranza/Pagos). El `<script src="documentos.js">` **se mantiene** (es el sistema vivo que consumen ficha clásica y Expediente).
- Archivos: `modulo-expediente.js`, `documentos.js`, `index.html`. `node --check` OK; desplegado y verificado (referencia externa en documentos.js, Expediente delegando, sin `captura.html` en el menú).

## ACTUALIZACIÓN — 2026-07-22 (Bug — folio bancario no numérico en Documentos del Expediente)
`carga_documentos.mov_folio` es INTEGER. Si el usuario escribía texto (ej. la PO del cliente "NGM247514") en "Folio de movimiento bancario", el archivo se subía al Storage pero el INSERT fallaba con `invalid input syntax for type integer`, se revertía y dejaba un huérfano momentáneo con mensaje feo. Arreglado en `modulo-expediente.js` (sección Documentos), sin tocar backend:
- **Input solo numérico:** el campo pasó a `type="number" min="1" step="1" inputmode="numeric"` (teclado numérico en móvil).
- **Validación ANTES de subir:** en `subir()`, si el folio no es solo dígitos (`/^\d+$/`) se aborta **antes** de tocar el Storage con el mensaje: *"El folio bancario es el número de movimiento del ERP (solo dígitos). Si querías anotar la PO del cliente u otra referencia, usa el campo Nota."* → ya no hay archivos huérfanos.
- **Etiqueta más clara:** "Folio de movimiento bancario del ERP (opcional, solo número)" para dejar claro que NO es la PO del cliente.
- **Nota:** confirma que acepta texto libre (`type="text"`, 200 chars); su placeholder ahora sugiere "PO del cliente, contenedor, referencia…".
- `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-22 (E37 — factura con ítem/cantidad/precio del embarque y emisión solo si "Entregada")
Backend E37: `productos.codigo_item` (ID-01..ID-021) va en la columna "item"; `fn_crear_factura` llena cada línea con item, qty (cajas), precio (venta/cajas) y total — si la carga no tiene cajas, qty/precio salen NULL y `r_advertencia` lo explica; `fn_emitir_factura` rechaza la emisión si el embarque no está "Entregada" (el borrador sí se crea).
- **Columnas de líneas (pantalla):** encabezados renombrados a **Item · Descripción · Cantidad · Precio unit. · Total**. En modo lectura (factura emitida/anulada) las líneas se pintan como texto y **qty/precio/total NULL → guion, nunca cero** (nuevo `filaLineaLectura`); en borrador siguen siendo inputs editables.
- **PDF (INVOICE):** la columna **ITEM#** muestra el código del producto (ya venía; ahora el backend lo llena) y `filaLineaImpr` pinta **guion** para qty/precio/total NULL en lugar de celda vacía.
- **Advertencia al crear:** se muestra `r_advertencia` **tal cual** (toast), sin el sufijo fijo "captura la dirección…" que ya no aplica siempre (ahora la advertencia puede ser por carga sin cajas).
- **Botón "Emitir":** sigue visible; si el backend rechaza por estado de carga, se muestra el mensaje del error tal cual. Además (opcional pedido): si el embarque **no está "Entregada"**, el botón queda **deshabilitado** con tooltip *"Se emite cuando el embarque esté Entregada"*. El estado se lee de `v_carga_detalle` por folio (patrón de `cxcActual`); si no se pudiera leer, el botón queda habilitado y el backend gatea. `botonesFicha` conserva ese bloqueo al reactivar botones.
- `node --check` OK + smoke test de guiones y del bloqueo de emisión. Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (FASE 4 — Panel "Hoy" en Inicio)
Primer punto de FASE 4. Vista nueva `v_panel_hoy(orden, severidad, categoria, titulo, detalle, monto, referencia, ruta)` (authenticated; solo devuelve renglones cuando algo está MAL).
- **Sección "Hoy" arriba de todo en Inicio** (antes del hero de utilidad neta): tarjetas agrupadas por severidad **roja → ámbar → gris**, y dentro de cada grupo por `orden` (nunca hardcodeado). Colores mapeados a la paleta de semáforos (`--rojo`/`--ambar`/`--gris-claro` en el borde izquierdo de cada tarjeta).
- **Tarjeta:** título, detalle, monto `$12,345.67` (se **omite** la línea si `monto` es NULL, nunca "$0.00") y referencia como etiqueta secundaria (se **omite** si es NULL, nunca "null").
- **Contador** derivado de los datos: "N rojas · N ámbar · N informativas".
- **Grises plegadas** por defecto tras un `<details>` "Ver informativas (N)"; rojas y ámbar siempre visibles.
- **Estado vacío amable:** si la vista trae el centinela `categoria='Sin alertas'` (o ningún renglón real), se pinta "✅ Todo en orden — no hay alertas hoy", no una tarjeta de alerta.
- **Clic → ruta de la SPA:** `v_panel_hoy.ruta` **ya emite el id real del módulo del router** (cobranza, cierres, cargas, flags, tesoreria…), así que se usa `r.ruta` directo — **sin tabla de alias** (se eliminó `RUTA_ALIAS`; si un módulo se renombra se corrige en la vista, no aquí). La tarjeta navega con `ERP.ir`. Se conserva `ERP.moduloExiste(r.ruta)` (helper agregado a `comun.js`) como red de seguridad: si la ruta **no existe** en el router, la tarjeta queda **inerte** (no rompe la navegación). El centinela 'Sin alertas' trae `ruta = NULL`.
- **Sin export** (el panel es para mirar). **Responsive:** grid `auto-fill minmax(280px,1fr)` + una columna en móvil (`@media max-width:640px`).
- **Sin `.catch` que oculte:** `v_panel_hoy` se pide con `.catch` que captura el mensaje y lo **muestra** dentro del panel (errbox), sin tumbar el resto de Inicio.
- Archivos: `modulo-inicio.js` (`pintarHoy`/`tarjetaHoy` + query + cableado), `comun.js` (`moduloExiste`), `estilos.css` (clases `.hoy-*`). `node --check` OK + smoke test de la lógica. Desplegado y verificado.

## ACTUALIZACIÓN — 2026-07-21 (E37e — tercer valor de destino: 'Neutro (se cancela)')
`v_balance_partidas.destino` ahora tiene un tercer valor `'Neutro (se cancela)'`. En la sub-sección "Partidas por aplicar (detalle)" se invirtió la lógica de color: en vez de comparar contra el texto de Inventario, ahora **solo `'Por aplicar a un embarque'` cuenta como pendiente** (rojo si el sin-aplicar es negativo); **cualquier otro destino (Inventario, Neutro y valores futuros) va en gris y sin rojo**. Así aguanta nuevos valores sin tocar código. `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37d — Destino de partidas + limpieza de deuda E36)
`v_balance` pasó a 13 filas (nueva "Inventario de material de empaque" en Activo, orden 4; los TOTAL/Cuadre se recorrieron). El frontend YA agrupa por `seccion` y ordena por `orden` sin hardcodear números, así que absorbe la fila nueva sin cambios. `v_balance_partidas` trae columna nueva `destino` (`Inventario (activo, no pendiente)` | `Por aplicar a un embarque`).
- **Sub-sección "Partidas por aplicar (detalle)":** columna nueva **"Destino"**. Las filas con `destino='Inventario (activo, no pendiente)'` van en **gris suave y NO en rojo** aunque el "sin aplicar" sea negativo (no son un pendiente: ya están reconocidas en el Activo); las de "Por aplicar a un embarque" mantienen el rojo en negativos.
- **Texto fijo actualizado:** "Dinero que salió o entró del banco y todavía no está aplicado a un embarque. Las filas marcadas como Inventario ya están reconocidas en el Activo y no son un pendiente; el resto sí debe aplicarse."
- **Export:** la columna Destino viaja en Excel/PDF (el export multi-tabla del Balance raspa `#tblPartidas`, que ya la incluye).
- **Deuda E36 saldada:** en `modulo-cargas.js` → `render()` se quitó la consulta a `v_margen_caja` con `.catch(() => [])` que rellenaba `cajas` "por si `v_carga_detalle` no las exponía". Ya las expone: era código muerto y el patrón defensivo que hay que erradicar. Ahora `render()` lee `v_carga_detalle` directo, sin catch.
- `node --check` OK (2 archivos) + prueba de la lógica de Destino. Desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37c — ID del embarque en el V7 de Samuel)
`v_carga_detalle` trae una columna nueva `id_v7` (text, puede ser NULL): el ID del mismo embarque en el Control de Cargas V7 de Samuel (Drive). NO es el folio del ERP — son consecutivos independientes y en 28 de 70 casos difieren (ej. ERP P-075 = V7 P-071); sirve para cotejar contra el Excel de Samuel por el renglón correcto.
- **Expediente (Resumen):** dato nuevo **"ID en V7 (Samuel)"** junto al Folio. Si `id_v7` es NULL muestra "— (no está en el V7)". Si `id_v7 <> folio` se resalta en **ámbar suave** con tooltip "El folio del ERP y el ID del V7 son distintos para este embarque. Cotejar siempre por P.O.".
- **Lista de Embarques:** columna nueva **"V7"** (tras "Carga") con el `id_v7` o "—"; `colspan` del pie ajustado. **Buscable** en el filtro de texto existente (se agregó `id_v7` a los campos y al placeholder).
- **Export Excel/PDF de Embarques:** incluye la columna V7 automáticamente (el scrape lee la tabla `#cargasTabla`, que ya la contiene).
- Todo desde `v_carga_detalle` (sin `.catch` nuevo). `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37b — el cuadre viaja en el export)
La barra de cuadre es un `<div>` y no la raspa el export. Se agregó un **renglón de cuadre al final del `<tbody>` de `#tblBalance`** (tomado de la fila `seccion='Cuadre'` de `v_balance`): concepto "CUADRE (Activo - Pasivo - Patrimonio)", monto de esa fila. En negritas (clase `total`) y con la misma lógica de color que la barra (verde si `|monto| < 0.005`, rojo si no). Se ve en pantalla como último renglón y, por estar dentro de la tabla, **viaja en Excel y PDF**. La barra grande se queda como semáforo — son complementarias. `node --check` OK; desplegado y verificado en producción.

## ACTUALIZACIÓN — 2026-07-21 (E37 — Balance General con cuadre y partidas por aplicar)
`v_balance` cambió a 12 filas `(orden, seccion, concepto, monto, nota)` con secciones `Activo | Pasivo | Patrimonio | Cuadre`; `nota` es nueva (puede venir NULL). Vista nueva `v_balance_partidas(tipo, grupo, movimientos, monto_movido, aplicado, sin_aplicar)` (solo tipos con `sin_aplicar <> 0`; puede venir vacía). Todo en el panel Finanzas → "Balance general".
- **Secciones agrupadas por `seccion` en orden de `orden`;** los renglones que empiezan con "TOTAL" van en negritas con línea superior (clase `total`); montos `$12,345.67`.
- **Barra de cuadre** al pie (no como renglón): verde "✅ Balance cuadrado" si `monto = 0`; rojo "⚠️ DESCUADRE DE $X — avisar a Miguel" si `≠ 0`. Es el semáforo de integridad.
- **Nota → ícono ⓘ** junto al concepto: tooltip en hover (`title`) y **tap** en móvil (muestra la nota como toast; también responde a Enter/Espacio por accesibilidad).
- **Sub-sección plegable "Partidas por aplicar (detalle)"** (`<details>`, así la tabla queda en el DOM aunque esté cerrada) alimentada de `v_balance_partidas`, ordenada por `sin_aplicar` ascendente, con el texto fijo explicativo arriba. Si la vista vuelve vacía: "Sin partidas pendientes ✅".
- **Export Excel + PDF** del Balance en **un solo archivo que incluye el detalle de partidas**: helper nuevo `ERP.botonesExportarVarias(nombre, titulo, contenedor)` + `exportarExcelVarias`/`exportarPDFVarias`/`scrapeTablas` en `exportar.js` (raspan TODAS las `<table>` del contenedor `#balanceExport`, cada una con su título vía `data-exp-seccion`; PDF con logo por `encabezadoPDF`, formato moneda en Excel). Los exports de una sola tabla no se tocaron (ruta `data-exp-multi`).
- **Sin `.catch` defensivo:** `v_balance` y `v_balance_partidas` se piden sin `.catch`; si truenan, `despachar()` muestra el `errbox` del módulo en vez de ocultar el fallo con `[]`.
- `node --check` OK (2 archivos) + prueba de la lógica (cuadre verde/rojo, orden, TOTAL en negrita, ⓘ solo con nota, partidas vacías/ordenadas). Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-21 (E36 4ª parte — Entrega programada vs. entrega real)
El histórico `f_entrega` resultó ser una fórmula (embarque + 21 días), no una entrega observada. El backend separó: `f_entrega` = programada, `f_entrega_real` = confirmada por una persona. `v_carga_detalle` expone ahora `f_entrega_real, entrega_nota, entrega_por, entrega_ts, transito_es_estimado, desfase_entrega_dias`; `transito_dias` usa la real si existe, si no la programada. RPC nueva `fn_confirmar_entrega(p_folio, p_fecha, p_nota)`.
- **`modulo-expediente.js` (Resumen):** "Fecha de entrega" → **"Entrega programada"**; se agregó **"Entrega real"** (guion si NULL) con el **desfase** al lado: `+3 días` en rojo (tarde), `-2 días` en verde (antes), `en fecha` si 0. En **Tránsito**, si `transito_es_estimado` es true el número va en gris con tooltip "Estimado: la entrega real no se ha confirmado"; si false, normal.
- **Botón "✓ Confirmar entrega"** en las acciones del Expediente: visible solo con capacidad `capturar`, solo si `f_entrega_real` es NULL y el embarque no está anulado. Abre un mini-formulario inline (contenedor `#expFormEntrega`, patrón toggle): fecha (por defecto hoy, `max=hoy`) + nota opcional. Llama `fn_confirmar_entrega`, muestra el campo `mensaje` que devuelve como toast de éxito, limpia caché (`marcarDatosSucios`) y recarga el Expediente (ya con entrega real y sin el botón). Validación en cliente: fecha requerida, no futura, no anterior al embarque; errores de permiso vía `ERP.avisarSiPermiso`. Se agregó `rpc` al destructure del módulo.
- **`modulo-cargas.js` (alta de embarque):** etiqueta "Fecha de entrega" → **"Entrega programada"** con ayuda al pie del campo: *"Estimada; la llegada real se confirma después desde el Expediente."*
- `node --check` OK (2 archivos) + prueba de desfase (signo/color/singular-plural), gating de tránsito estimado y validaciones del formulario. Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-21 (E36 3ª parte — corrección: todo desde v_carga_detalle)
El backend expuso en `v_carga_detalle`: `pallets`, `f_entrega`, `origen_operativo`, `cajas_por_pallet` y `transito_dias`.
- **`modulo-expediente.js`:** se quitó del `Promise.all` de `verExpediente` la lectura directa `q('cargas', …)` y la variable `cg` (con su rastro en `estado` y en la firma de `htmlResumen`). La tabla `cargas` NO es legible por `authenticated` (RLS sin políticas), así que esa consulta **siempre fallaba** y el `.catch` la ocultaba: Pallets, Fecha de entrega, Cajas por pallet y Tránsito salían **siempre en guion**. Ahora todo se toma de `v_carga_detalle` (`d`).
- **Derivados desde el backend:** se usan `d.cajas_por_pallet` y `d.transito_dias` directo y se **borró el cálculo local** (fechas/división en el front). Mismo criterio de NULL (guion, nunca cero). El resto del Resumen no cambió.
- **Regla reafirmada:** el frontend consume **solo vistas y RPCs, nunca tablas**. Si falta un dato en una vista, se anota en `PENDIENTES-BACKEND.md` (no se leen tablas directas). Esta corrección alinea el código con esa regla.
- `node --check` OK; desplegado y verificado en `erp-plein-dashboard.vercel.app` (ya no aparece `q('cargas')`).

## ACTUALIZACIÓN — 2026-07-21 (E36 3ª parte — Pallets y fecha de entrega)
Backend E36 agregó a `cargas`: `pallets` (int opcional), `f_entrega` (date opcional), `origen_operativo`; y `fn_crear_carga` acepta `p_pallets` y `p_f_entrega` (rechaza pallets ≤ 0 y entrega anterior al embarque).
- **`modulo-cargas.js` → `nuevaCarga`:** dos campos nuevos opcionales — **"Fecha de entrega"** (junto a Fecha de embarque) y **"Pallets"** (junto a Cajas). En `guardarNuevaCarga`: pallets se valida entero > 0; la fecha de entrega se **valida en cliente** que no sea anterior al embarque (comparación de texto ISO YYYY-MM-DD, mensaje claro, sin depender del error del backend). Se mandan `p_pallets` y `p_f_entrega`.
- **`modulo-expediente.js` (Resumen):** se muestran **Pallets** y **Fecha de entrega**, más dos derivados calculados en el front — **Cajas por pallet** (`cajas / pallets`, solo si ambos) y **Tránsito** (días entre `f_embarque` y `f_entrega`, solo si ambas; `0 días` es valor genuino, no guion). Mismo criterio de NULL: guion, nunca cero; sin división por cero si pallets fuera 0.
- **Fuente de los datos:** `v_carga_detalle` **todavía no expone** `pallets`/`f_entrega`. El Expediente los prefiere de `d` (v_carga_detalle) por si el backend los expone luego, con **respaldo a la fila `cargas` por folio** (`q('cargas', &folio=eq…)`, `.catch → []`). Si esa tabla no fuera legible por authenticated, degrada a guion sin romper nada. **Si se prefiere no leer la tabla directa, pedir al backend exponer `pallets`, `f_entrega` (y `origen_operativo`) en `v_carga_detalle`** y el Expediente los tomará solo de ahí sin más cambios.
- **Tabla de Embarques:** sin columnas nuevas (según indicación).
- `node --check` OK (2 archivos) + prueba de los derivados y validaciones (0 días genuino, singular/plural, sin div/0, bloqueo entrega < embarque). Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-20 (E36 2ª parte — Costos desglosados en el alta de embarque)
Backend E36 amplió `fn_crear_carga` para aceptar costos DESGLOSADOS por concepto (`p_materia_prima, p_comision, p_aduanas, p_qc, p_fletes, p_carton, p_otro`, todos numeric opcionales). El viejo `p_costo` sigue por compatibilidad, pero mandarlo solo deja el costo sin desglosar (advertencia) y mandarlo junto a un desglose que no cuadra lanza excepción.
- **`modulo-cargas.js` → `nuevaCarga`:** el campo único **"Costo USD"** se reemplazó por **siete campos** de costo (Materia prima · Comisión · Aduanas · In & Out QC · Fletes · Cartón · Otro), bajo un subtítulo "Costos por concepto (todos opcionales)". Debajo, un **Total en vivo** solo informativo que se recalcula con cada tecla.
- **Envío:** en `guardarNuevaCarga` **ya no se manda `p_costo`**; se manda únicamente el desglose, y solo los conceptos con valor > 0 (los vacíos o en 0 se omiten). Así es imposible el descuadre. El mapeo input→parámetro vive en la constante de módulo `CAMPOS_COSTO`.
- **Validación:** cada campo se acepta vacío o ≥ 0; un negativo se rechaza con aviso. **No** se exige ninguno: si van los siete vacíos la carga nace con flag "falta costo" (comportamiento previo, deseado).
- **Advertencias del backend:** se siguen mostrando igual (`r.advertencias` → aviso en el panel), verificado.
- Se mantienen intactos el campo **Cajas** y su texto de ayuda ("El precio por caja lo calcula el sistema; no se captura.").
- `node --check` OK + prueba de la construcción del payload (todos vacíos → sin params de costo; desglose → solo > 0; negativo → error; nunca `p_costo`). Desplegado y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-20 (E36 — Cajas y margen por caja en los embarques)
Backend E36 agregó `cajas` a `cargas` (más `cajas_origen`, `cajas_nota`), un parámetro opcional `p_cajas` a `fn_crear_carga`, y las vistas `v_margen_caja` y `v_cajas_vigilancia`. Se consumen así (sin tocar Supabase):
- **Alta de embarque (`modulo-cargas.js` → `nuevaCarga`):** campo **"Cajas"** opcional (entero > 0; vacío = NULL). Se valida en `guardarNuevaCarga` y se manda como `p_cajas`. Ayuda al pie del formulario: *"El precio por caja lo calcula el sistema; no se captura."*
- **Tabla de Embarques:** nueva columna **"Cajas"** (separador de miles con `fmt0`, guion cuando es NULL) más total al pie. `render()` lee `v_carga_detalle` y, por si esa vista aún no expone `cajas`, rellena por folio desde `v_margen_caja` (merge defensivo). El export Excel/PDF ya incluye la columna automáticamente.
- **Finanzas (`modulo-finanzas.js`):** sección nueva **"Margen por caja"** desde `v_margen_caja`, agrupada por producto con promedios ponderados por cajas (estilo `v_kpi_margen_producto`), con export Excel/PDF. **Regla de NULL:** `margen_por_caja`/`venta_por_caja`/`costo_por_caja` ausentes se muestran como **guion con el `motivo_sin_margen_caja` en tooltip**, nunca 0 ni vacío. Los promedios por caja usan solo embarques con cajas capturadas e ingreso confiable.
- **Expediente de embarque (`modulo-expediente.js`):** el encabezado (Resumen) muestra **Cajas** y **Margen por caja** con el mismo criterio de NULL (guion + tooltip). Se agregó la consulta `v_margen_caja` por folio al `Promise.all` de `verExpediente`.
- `v_cajas_vigilancia` hoy no tiene filas; no se construyó pantalla (según indicación).
- Validado con `node --check` (3 archivos) + prueba unitaria de la agrupación por caja; desplegado a producción y verificado en `erp-plein-dashboard.vercel.app`.

## ACTUALIZACIÓN — 2026-07-20 (Tareas: asignables desde v_socios_asignables + CLAUDE.md al día)
- **modulo-tareas.js — `cargarSocios()`:** ahora lee la vista nueva **`v_socios_asignables(socio_codigo, nombre, rol)`** (solo socios activos) en vez de `usuarios_erp`, que NO es legible por el rol authenticated (por eso el desplegable solo mostraba a Miguel cuando no había tareas). `id = socio_codigo` (el mismo valor que va a `p_asignado_a` y que trae `v_tareas.asignado_a` — sin cambiarlo a email ni id). Se mantiene el fallback (asignados ya presentes en tareas + usuario actual) por si la vista fallara, pero ya no se consulta `usuarios_erp`.
- **Rol visible al asignar:** helper `etiquetaSocio()` muestra el rol junto al nombre en los tres desplegables de asignación/filtro — p. ej. *"Jose Arambula (solo lectura)"* para rol `vista`. Motivo: un socio `vista` puede RECIBIR la tarea pero no puede cambiarle el estado ni comentar (ambos requieren capacidad `capturar`), así que quien asigna lo ve de entrada.
- **CLAUDE.md actualizado:** agregadas las vistas E32–E35 (`v_facturas, v_ordenes_compra, v_orden_compra_items, v_tareas, v_tareas_resumen, v_tarea_comentarios, v_socios_asignables, v_bitacora_ediciones`), las 6 RPCs de tareas, los valores CHECK de tareas (punto 9), los helpers `ERP.imprimirArea()` y `ERP.descLineaDoc()` (punto 10) y la nota de que `usuarios_erp` no es legible por authenticated.
- Validado con `node --check`; desplegado a producción (`dpl_D6ZHQay…`, READY) y verificado que `erp-plein-dashboard.vercel.app/modulo-tareas.js` ya sirve `v_socios_asignables`/`etiquetaSocio`.

_Generado el 2026-07-17. Foto real del código, sin adornos. El frontend NO puede ver la base de datos,
así que "VIVO vs FUNCIONAL-SIN-USO" se infiere de qué vistas consume cada módulo (las vistas ancla con
cifras reales de sesiones previas = VIVO; lo recién construido o dependiente de datos que aún no se llenan
= FUNCIONAL). **La verdad sobre el uso real solo la tiene Supabase.**_

Arquitectura: SPA de una sola página (`index.html`) con router por hash (`#/modulo`). Cada módulo es un
archivo `modulo-*.js` que se registra con `ERP.registrar(ruta, {titulo, render})`. Núcleo compartido en
`comun.js` (cliente Supabase, helpers de formato, panel/drawer, combos, permisos). **14 módulos registrados,
los 14 están en el menú. No hay módulos registrados escondidos.** Sí hay piezas fuera del menú (abajo).

---

## ACTUALIZACIÓN — 2026-07-20 (módulo Tareas E35 + fix select Órdenes)

`modulo-tareas.js` reescrito al contrato E35 (siguiendo el patrón de facturas/órdenes). Backend E35, no se tocó.

- **Vistas:** `v_tareas`, `v_tareas_resumen` (chips), `v_tarea_comentarios`. **RPCs:** `fn_crear_tarea`,
  `fn_editar_tarea`, `fn_cambiar_estado_tarea`, `fn_asignar_tarea`, `fn_comentar_tarea`, `fn_cancelar_tarea`.
  Valores literales que van a la RPC (CHECK): estado `pendiente|en_proceso|hecha|cancelada`, prioridad
  `baja|media|alta|urgente`, área `cargas|comercial|sourcing|admin`; en pantalla se ven en español.
- **Vistas de pantalla:** **Kanban** (4 columnas por estado) + **Tabla**, con toggle. En celular el kanban
  se apila (grid → 1 columna). Se renderizan ambas y una se oculta, para que el **export** (`#tblTareas`)
  funcione en cualquier vista.
- **Filtros:** chips por área con conteo (de `v_tareas_resumen`), select de asignado, select de prioridad,
  búsqueda por texto. **Atrasada** se marca en rojo (viene calculada en la vista, no se recalcula).
- **Ficha:** editar (solo si no está hecha/cancelada) vía `fn_editar_tarea` (con `p_limpiar_fecha`); botones
  de cambio de estado (`fn_cambiar_estado_tarea`); **hilo de comentarios** (`v_tarea_comentarios`) + comentar
  (`fn_comentar_tarea`); cancelar con motivo (`fn_cancelar_tarea`). Asignación dentro del edit (los socios
  salen de `usuarios_erp` si es legible, con fallback a los asignados existentes + el usuario actual).
- **Enlaces cruzados:** chips 📦 embarque → `ERP.verCarga`, 📄 cotización → `ERP.verComercial`, 🧾 orden →
  `ERP.verOrden`, en la lista y en la ficha.
- **Integración:** recuadro **Tareas** en la ficha clásica de carga y en la pestaña Resumen del Expediente
  (`ERP.montarTareasCarga`), con botón "Nueva tarea" prellenando el embarque.
- **Gating:** crear/editar/estado/asignar/comentar/cancelar requieren `puede('capturar')`; rol vista = solo
  lectura. Catches de escritura vía `ERP.avisarSiPermiso`.
- **Bug corregido en Órdenes:** el `<select>` de producto en la ficha en solo-lectura mostraba "— libre —"
  porque los productos solo se cargaban en modo edición. Ahora `verOrden` carga el catálogo siempre, así el
  select deshabilitado muestra el producto guardado. (Las opciones de `<select>` de Tareas también fijan el
  valor real seleccionado.)

**Archivos tocados:** `modulo-tareas.js` (reescrito), `modulo-ordenes.js` (fix + carga de catálogos),
`modulo-cargas.js` y `modulo-expediente.js` (integración), `estilos.css` (kanban/tareas), `PLAN-MAESTRO.md`.
El nav "✅ Tareas" y el `<script>` ya existían.

**Cómo probarlo (Miguel):** tras `npx vercel --prod`, entra a **Tareas**:
1. **Samuel/Miguel (capturar):** "+ Nueva tarea" → título, área, prioridad, asignado, embarque opcional →
   Crear; en la ficha edita, mueve el estado (kanban), comenta, cancela. Alterna Kanban/Tabla; exporta.
2. **José (vista):** ve el tablero y las fichas, pero sin botones de acción.
3. **Embarque:** abre un embarque (Expediente → Resumen, o la ficha) y verás el recuadro de tareas ligadas.

**Dependencia backend (E35):** `v_tareas`, `v_tareas_resumen`, `v_tarea_comentarios` y las 6 RPCs.
`usuarios_erp` es opcional (si no es legible, la asignación cae a los asignados existentes + el usuario actual).

---

## ACTUALIZACIÓN — 2026-07-20 (PDF de Órdenes: logo + columna descripción)

Dos defectos del PDF PURCHASE ORDER (visto con OC-0001 real, AGROFEPAC):

1. **Logo en blanco.** Diagnóstico: (a) `assets/logo-plein.png` existe y sirve 200 en prod; (b) la
   plantilla YA usaba `ERP.encabezadoImpresion()` (no estaba hardcodeada); (c) `print-color-adjust:exact`
   ya estaba. **Causa real:** `imprimir()` hacía `innerHTML = …; window.print()` de forma síncrona, así
   que la imagen del logo aún no había cargado al imprimir → salía en blanco. El texto "ERP Plein Produce"
   que se veía arriba es el **encabezado del navegador** (document.title), no el documento.
   **Fix (centralizado):** nuevo `ERP.imprimirArea(html)` en `exportar.js` que espera a que las imágenes
   terminen de cargar (o 1.5 s de salvaguarda) antes de `window.print()`. Lo usan Órdenes y Facturación.
2. **Columna DESCRIPCIÓN vacía.** En `orden_compra_items`, `descripcion` viene null cuando el usuario solo
   elige producto del select. Además, al imprimir con la ficha abierta se armaban los ítems sin el nombre
   del producto. **Fix:** `imprimir()` de Órdenes ahora lee SIEMPRE de `v_orden_compra_items` (trae nombre
   de producto + descripción) y usa el helper compartido `ERP.descLineaDoc(producto, descripcion)`:
   ambos → "Papaya — descripción", solo uno → ese, ninguno → "". Aplicado también al PDF de cotizaciones/
   órdenes del módulo comercial (jsPDF). El INVOICE no comparte el defecto (sus líneas son item/descripción
   libre, sin catálogo de producto), solo recibió el fix del logo.

**Archivos tocados:** `exportar.js` (helpers `imprimirArea` y `descLineaDoc`), `modulo-ordenes.js`,
`modulo-facturas.js`, `modulo-comercial.js`. Solo plantillas de impresión; no se tocó backend/RPCs/esquema.

**Cómo probarlo:** imprime OC-0001 (u otra OC) → el logo de Plein debe verse arriba-izquierda y la columna
DESCRIPCIÓN debe decir el producto. Igual en una factura y en una cotización.

---

## ACTUALIZACIÓN — 2026-07-20 (Facturación: estado cancelado = 'anulada')

`fn_cancelar_factura` ahora deja el estado en **'anulada'** (antes intentaba 'cancelada' y fallaba por el
CHECK). En `modulo-facturas.js` se ajustó para aceptar `'anulada'` (y seguir aceptando `'cancelada'` por
compatibilidad): badge en gris, filtro "Cancelada" del selector (option value pasó a `anulada`, matchea ambos),
y las etiquetas de estado (pill, campo Estado de la ficha, toast) muestran **"Cancelada"** al usuario aunque el
valor real sea `'anulada'`. Solo visual/UI; no se tocó backend ni otra lógica.

---

## ACTUALIZACIÓN — 2026-07-20 (INVOICE: ocultar SALES TAX / OTHER en cero)

En la plantilla INVOICE (`modulo-facturas.js` → `htmlImpresion`), las filas **SALES TAX** y **OTHER**
del bloque de totales ahora se ocultan cuando su valor es 0; si vinieran distintas de cero
(`f.sales_tax` / `f.other`) se muestran igual que hoy. SUBTOTAL y TOTAL siempre visibles. Solo visual,
nada más tocado. (Hoy esas columnas no existen en `v_facturas`, así que en la práctica siempre se ocultan.)

---

## ACTUALIZACIÓN — 2026-07-20 (logo de marca en TODOS los PDFs)

Se puso `assets/logo-plein.png` (700×213) en todos los PDFs, centralizado en dos helpers compartidos
para no copiar el `<img>`/logo en cada plantilla.

- **Helper DOM (window.print):** `ERP.encabezadoImpresion(titulo, filas)` en `exportar.js` devuelve el
  encabezado con `<img src="assets/logo-plein.png" style="height:48px">` a la izquierda y el título
  (INVOICE / PURCHASE ORDER) + meta a la derecha. Lo usan `modulo-facturas.js` (INVOICE) y
  `modulo-ordenes.js` (PURCHASE ORDER). Ruta relativa, sin base64 ni URL externa.
- **Helper jsPDF:** `exportar.js` → `cargarLogo()` ahora carga `assets/logo-plein.png` (dataURL) y
  `encabezadoPDF()` dibuja el logo (~32px) en vez del texto "Plein Produce LLC". Cubre TODOS los
  "Exportar PDF" de listados (Facturación, Órdenes, Finanzas, Bitácora, CxC, CxP, Tesorería, Embarques,
  Estado de Resultados) y el **Expediente PDF**. Se expone `ERP.logoPdfDataURL` para reuso.
- **Comercial (jsPDF propio):** `modulo-comercial.js` → `construirDoc()` (Cotizaciones y Órdenes del
  módulo comercial) ahora dibuja el logo con `ERP.logoPdfDataURL()` en vez del texto de empresa.
- **CSS de impresión:** en `@media print` se agregó `-webkit-print-color-adjust / color-adjust /
  print-color-adjust: exact` al área de impresión, para que el logo y los fondos de color SALGAN en el
  PDF (el bug clásico de "se ve en pantalla, sale en blanco"). `.inv-logo img` ahora es `height:48px`.

**Archivos tocados:** `exportar.js`, `modulo-facturas.js`, `modulo-ordenes.js`, `modulo-comercial.js`,
`estilos.css`. Solo visual; no se tocó backend/RPCs/contabilidad.

**Cómo probarlo:** imprime (PDF) una factura, una orden de compra, una cotización, el expediente y
cualquier "Exportar PDF" de listado — el logo de Plein debe verse arriba-izquierda en todos.

---

## ACTUALIZACIÓN FASE 3 — 2026-07-18 (módulo Órdenes de Compra) — PENDIENTE DE DEPLOY

Espejo de Facturación para el lado proveedor/CxP. Backend E33. Módulo NUEVO dedicado (el módulo
'comercial' con su pestaña de órdenes se deja intacto; esta es la implementación oficial de Fase 3).

- **`modulo-ordenes.js` (nuevo), ruta `ordenes`, menú "📦 Órdenes de Compra"** (junto a Facturación).
  Consume `v_ordenes_compra`, `v_orden_compra_items`, `v_cxp` (amarre de pago) y los catálogos
  `v_catalogo_admin` (proveedores comerciales) y `v_catalogo_productos`.
- **Lista:** Folio, Fecha, Proveedor, Embarque (carga_folio o "—"), Entrega est., Estado (chip:
  Borrador ámbar / Enviada azul / Confirmada verde / Recibida verde oscuro / Cancelada gris), Ítems,
  Total ($), Vence (rojo si pasó y no está Recibida/Cancelada). Filtros por estado, proveedor y texto;
  export Excel/PDF.
- **Crear:** "+ Nueva orden" → proveedor (combo, solo `es_proveedor` + `clase='comercial'`), moneda
  USD/MXN, entrega estimada, condiciones, notas, **embarque opcional** (combo de cargas), y editor de
  líneas (producto del catálogo por `<select>` o descripción libre, cantidad, unidad, precio unitario;
  importe y total en vivo). → `fn_crear_orden_compra` (NO se manda importe; lo calcula la base). Muestra
  el folio OC-NNNN y abre la ficha. Los días de crédito se heredan del proveedor (no se capturan).
- **Ficha:** encabezado con folio/proveedor/estado/total y **NET dias_credito**. En **Borrador**: editable
  (líneas, entrega, condiciones, notas y **ligar/desligar embarque** con `p_desligar_carga`) vía
  `fn_editar_orden_compra`. Fuera de Borrador: solo lectura + aviso "Solo se edita en Borrador; para
  cambios, cancela y crea otra." Recuadro **Pago (CxP)** de solo lectura (costo/pagado/saldo/vencimiento).
- **Flujo de estado:** botón "Avanzar a <siguiente>" (Borrador→Enviada→Confirmada→Recibida) vía
  `fn_cambiar_estado_orden` con confirmación; "Cancelar orden" (`fn_anular_orden`, **motivo obligatorio**)
  mientras no esté cancelada. Si el backend rechaza una transición, se muestra su mensaje tal cual.
- **PDF:** layout `inv-doc` reutilizado — **PURCHASE ORDER**, folio/fecha/términos/entrega, PROVEEDOR y
  CONDICIONES, tabla de líneas (descripción/cantidad/unidad/precio/importe), TOTAL y notas.
- **Gating:** crear/editar/avanzar/cancelar requieren `puede('capturar')`; rol vista = solo lista/ficha +
  PDF. Todos los catches pasan por `ERP.avisarSiPermiso(e)`.
- **Integración:** en la ficha clásica y en el **Expediente** de embarque (pestaña renombrada
  "Factura y OC") se lista ahora también "Órdenes de compra" del embarque (patrón `montarOrdenesCarga`),
  con salto a la ficha.

**Archivos tocados:** `modulo-ordenes.js` (nuevo), `index.html` (nav+script), `estilos.css`
(`.oc-estado`, `.fact-lineas select`), `modulo-cargas.js` y `modulo-expediente.js` (integración).

**Cómo probarlo (Miguel):** tras `npx vercel --prod`, entra a **Órdenes de Compra**:
1. **Samuel/Miguel (capturar):** "+ Nueva orden" → elige proveedor, agrega líneas (producto o libre) →
   Crear → aparece **OC-0001**; en la ficha edita y **Guarda**; **Avanza** de Borrador→Enviada→…; **Imprime
   PDF** (PURCHASE ORDER); **Cancela** con motivo. Liga/desliga un embarque en Borrador.
2. **José (vista):** ve lista y ficha, imprime PDF, pero sin botones de acción.
3. **Embarque:** abre un embarque (Expediente → pestaña "Factura y OC", o la ficha) y verás sus órdenes.

**Dependencia backend (E33):** `v_ordenes_compra`, `v_orden_compra_items`, `v_cxp` y las RPCs
`fn_crear/editar/cambiar_estado/anular_orden`. Envío por correo (Resend) pendiente de DNS de Miguel.

---

## ACTUALIZACIÓN FASE 3 — 2026-07-18 (módulo Facturación) — PENDIENTE DE DEPLOY

El módulo de facturas se reescribió a su **ruta propia `'facturas'`** con el contrato E32.
El item de menú "🧾 Facturación" ahora apunta a `#/facturas` (antes iba a `#/documentos`). El
componente Storage deprecado `documentos.js` no se tocó; la ruta `'documentos'` ya no se registra
ni se enlaza (nadie la usa).

- **`modulo-facturas.js` (reescrito), ruta `facturas`, título "Facturación".** Consume `v_facturas`
  (columnas E32: `fecha_emision`, `estado` borrador|emitida|cancelada, `total`, `bill_to`, `ship_to`,
  `lineas` jsonb, etc.) y `v_cxc` para el amarre de cobro. Sigue exponiendo `ERP.verFactura`,
  `ERP.montarFacturasCarga`, `ERP.generarInvoiceDesdeCarga`, `ERP.nuevaFactura` (el Expediente los usa).
- **Lista:** Número (o "— borrador"), PO, Cliente, Emisión (DD-mmm-YYYY), Términos, Estado (chip:
  borrador ámbar / emitida verde / cancelada gris), Total ($), y **Cobro** leído de `v_cxc`
  ("Cobrado $X / Falta $Y" + vencimiento en rojo si vencida). Filtros por estado y texto; export Excel/PDF.
- **Crear desde embarque:** "+ Nueva factura" → selector de embarque (folio · PO · cliente · venta),
  **solo embarques sin factura** → `fn_crear_factura(folio)`; si el backend devuelve advertencia
  (cliente sin dirección) se muestra toast sugiriendo capturarla en Directorio Comercial; abre la ficha.
- **Ficha:** edita términos, bill_to, ship_to, comentarios y las líneas (total = suma) vía
  `fn_editar_factura` (el **número NO es editable**; se pasa sin cambiar). Recuadro **Cobro (CxC)** de
  solo lectura (venta / cobrado / saldo / vencimiento) — el estado de pago se lee de CxC, no es manual.
- **Flujo de estado:** borrador → **Emitir** (`fn_emitir_factura`, confirma con el número PP-AAAA-NNNN
  asignado) o **Cancelar** (`fn_cancelar_factura` pidiendo motivo). Emitida → solo **Cancelar**. No hay
  estado "pagada" manual ni re-emitir. Sólo lectura en cancelada.
- **PDF imprimible:** reutiliza el layout `inv-doc` (@media print) — INVOICE + fecha/número/términos,
  BILL TO / SHIP TO, tabla de líneas (mín. 7 filas), totales. Se ve como documento a cliente.
- **Gating (Fase 2):** crear/editar/emitir/cancelar requieren `puede('capturar')` (Samuel puede facturar);
  rol vista (José) = solo lista + Imprimir/PDF, sin botones. Todos los catches de escritura pasan por
  `ERP.avisarSiPermiso(e)` (toast claro si es de permiso; si no, el mensaje del backend tal cual).

**Archivos tocados:** `modulo-facturas.js` (reescrito), `index.html` (nav reapuntado a `facturas`),
`estilos.css` (recuadro `.fact-cxc`). El script `modulo-facturas.js` ya estaba enlazado.

**Cómo probarlo (Miguel):** tras `npx vercel --prod`, entra a **Facturación**:
1. **Samuel/Miguel (capturar):** "+ Nueva factura" → elige un embarque sin factura → se crea en borrador;
   abre la ficha, edita líneas/direcciones, **Guardar**; luego **Emitir** → confirma que aparece el número
   PP-2026-NNNN; **Imprimir / PDF**. En una emitida, **Cancelar** pidiendo motivo (el número queda como hueco).
2. **José (vista):** ve la lista y puede Imprimir/PDF, pero NO ve "+ Nueva factura" ni Guardar/Emitir/Cancelar.
3. **Cobro:** en la lista y en la ficha, la columna/recuadro de cobro refleja lo que dice CxC del embarque.
4. **Expediente de embarque → pestaña Factura:** "Generar factura" sigue funcionando (crea y salta a Facturación).

**Dependencia backend (E32):** `v_facturas`, `v_cxc` y las RPCs `fn_crear/editar/emitir/cancelar_factura`.
Envío por correo (Resend) queda pendiente de DNS de Miguel — no está en esta entrega.

---

## ACTUALIZACIÓN FASE 2 — 2026-07-18 (login real por rol) — PENDIENTE DE DEPLOY

El backend ya valida permisos por rol (JWT en las RPC, E31); esta sesión hace que la UI lo refleje.

- **Gating por rol (transversal).** Tras login se lee `v_mi_perfil` (ya existía en `comun.js` →
  `ERP.puede('capturar'|'editar'|'administrar')`). El header muestra nombre + rol. Se alinearon los botones a
  la capacidad que exige cada RPC:
  - **Tesorería:** el botón "Editar" de un movimiento (`fn_editar_movimiento`) ahora requiere **editar** (antes
    aparecía con captura).
  - **Revisiones Pendientes:** "Responder" (`fn_responder_flag`) requiere **capturar**; "Cerrar flag"
    (`fn_resolver_flag_web`) requiere **editar**. Rol vista no ve ninguno.
  - Aplicar FIFO (`fn_aplicar_fifo`) requiere **editar** — ver checkbox abajo.
  - Alta de embarque / agregar costo / registrar gasto ya estaban en **capturar**.
- **Toast de "Sin permiso".** Nuevo `ERP.avisarSiPermiso(e)` / `ERP.esPermisoDenegado(e)` en `comun.js`: si una
  RPC rechaza con "Sin permiso" o "PERMISO_DENEGADO", se muestra un toast claro en español (con el rol del
  usuario) en vez del error crudo. Aplicado en las rutas de escritura (captura rápida, flags, tesorería,
  cargas cobro/pago y nuevo embarque). El backend sigue siendo la autoridad; esto solo mejora el mensaje.
- **Checkbox "Solo capturar (no aplicar)"** en la captura rápida de movimiento (`captura-rapida.js`): visible
  solo si el usuario **puede editar**. Flujo: llama `fn_capturar_mov`; si el usuario no puede editar **o** marcó
  el checkbox → termina ahí (movimiento SIN aplicar) con toast "…queda pendiente de aplicar por administración";
  si puede editar y NO lo marcó → aplica `fn_aplicar_fifo` y muestra a qué carga(s) se aplicó. La ficha de carga
  (cobros/pagos) hace lo equivalente: un rol captura captura pero no aplica (mensaje claro).
- **Módulo Bitácora (NUEVO).** `modulo-bitacora.js`, entrada de menú "Bitácora" (📜), ruta `bitacora`. Solo
  lectura para todos los roles. Lee `v_bitacora_ediciones` (order `editado_ts` desc, 500 recientes). Columnas:
  Fecha (`DD-mmm-YYYY HH:mm`), Quién (`editado_por`), Tabla, Registro (`registro_id`), Motivo, y un expandible
  **Cambios** que hace un diff campo por campo de `campos_antes` → `campos_despues` (jsonb). Filtros por tabla y
  por texto; export Excel/PDF como los demás módulos.
- **Captura de embarque <2 min.** Se verificó que el formulario existente `nuevaCarga` (botón "+ Nuevo embarque"
  en Embarques) cumple el contrato de `fn_crear_carga` con P.O. obligatorio, combos con texto libre y muestra
  folio + `con_flag`/advertencias. No se reconstruyó (evitar duplicación).

**Archivos tocados:** `comun.js`, `captura-rapida.js`, `modulo-flags.js`, `modulo-tesoreria.js`,
`modulo-cargas.js`, `modulo-bitacora.js` (nuevo), `index.html` (nav+script), `estilos.css`.

**Cómo probarlo (Miguel):** después de `npx vercel --prod`, entrar con cada socio:
1. **José (vista):** no debe ver botones de capturar/editar/aplicar/cerrar/resolver; todo solo lectura; Bitácora sí visible.
2. **Samuel (captura):** ve "+ Nuevo embarque", "+ Movimiento", "Registrar gasto", "Responder" en Revisiones. Al
   capturar un cobro/pago queda **sin aplicar** ("pendiente de aplicar"). No ve "Editar" en Tesorería ni "Cerrar flag".
3. **Miguel (admin):** ve todo; en captura rápida aparece el checkbox "Solo capturar"; sin marcarlo, aplica FIFO.
4. **Bitácora:** abrir el menú "Bitácora", filtrar por tabla, expandir "Cambios" de una fila, exportar Excel/PDF.

**Dependencia backend:** requiere que `v_mi_perfil`, `v_bitacora_ediciones` y las RPCs con validación de rol
existan (confirmado E31). Si `v_bitacora_ediciones` no existiera, la pantalla Bitácora mostraría el error del
backend sin romper el resto.

---

## ACTUALIZACIÓN FASE 1.5 — 2026-07-18 (desplegado)

Se conectaron pantallas a backend que ya existía. Cambios de esta sesión:

- **Pipeline de estados de embarque (solo lectura).** Mapa central de color por estado en `comun.js`
  (`ERP.estadoEmbarque` / `ERP.badgeEstado`; Cerrada=gris, Entregada=verde, En Camino=azul,
  Falta informacion=ámbar, Rechazo=rojo, desconocido=gris). En **Embarques**: chips de filtro por
  estado **con conteo**, y **badge de estado** en cada fila. En el **Expediente**: badge de estado en el
  header. No agrega cambio de estado (eso es Fase 3).
- **Expediente más accesible.** El botón **"＋ Captura y acciones"** ahora es sólido y prominente (primero,
  junto a "Exportar Expediente PDF"). Verificado: desde ahí se llega a agregar costo, cobros/pagos, resolver
  revisión y anular. _(Nota: "editar costo" nunca existió en la ficha clásica; no se perdió nada.)_
- **Panel Finanzas ampliado.** Nuevas secciones, cada una con Exportar Excel/PDF: Balance general (`v_balance`),
  Flujo de caja semanal (`v_flujo_semanal`, con mini-barra), Antigüedad de saldos por cobrar (`v_cxc_aging`,
  resalta filas vencidas), Cuentas por pagar próximas (`v_cxp_proximas`), Rentabilidad por embarque
  (`v_rentabilidad_carga`), y a Márgenes por cliente/producto se les añadió columna **Costo** y export. Las
  vistas nuevas van con `.catch(()=>[])`: si alguna no existiera, esa sección degrada sin romper Finanzas.
- **Deuda marcada (no migrada).** `documentos.js` y `captura.html` llevan comentario
  `DEPRECADO 2026-07-17`. **La migración real sigue pendiente** (§5): `documentos.js` aún se monta en la
  ficha clásica y `captura.html` sigue enlazado en el menú.

El resto del reporte (abajo) describe el estado general; los puntos de arriba lo actualizan donde apliquen.

---

## 1. INVENTARIO DE MÓDULOS

| Archivo | En el menú | Qué hace | Consume (Supabase) | Estado |
|---|---|---|---|---|
| `modulo-inicio.js` | **Inicio** | Tarjetas resumen del día (banco, CxC, CxP, flags, utilidad neta, cargas activas) + cascada de estado de resultados. Todo clicable. | `v_anclas`, `v_deuda_jeams`, `v_estado_resultados_neto`, `v_saldo_cuentas`, `v_carga_detalle` | **VIVO** |
| `modulo-cargas.js` | **Embarques** | Lista de embarques con filtros/semáforo de margen; alta de embarque (`fn_crear_carga`); ficha clásica con captura (costos, cobros/pagos, resolver revisión, anular). El clic abre el **Expediente** (ver abajo). | `v_carga_detalle`, `v_carga_aplicaciones`, `v_carga_costos_det`, `v_catalogo_cuentas`; RPC `fn_crear_carga`, `fn_agregar_costo`, `fn_capturar_mov`, `fn_aplicar_fifo`, `fn_resolver_flag_web`, `fn_anular_carga` | **VIVO** |
| `modulo-expediente.js` | (se abre al tocar un embarque) | Expediente de 4 pestañas: Resumen · Pagos y Cobros · Documentos · Factura. Botón "Captura y acciones" → ficha clásica. | `v_carga_detalle`, `v_carga_aplicaciones`, `v_carga_costos_det`, `v_carga_documentos`, `v_facturas`; tabla `carga_documentos` (INSERT); Storage bucket `documentos-cargas` | **VIVO** (Documentos depende de backend nuevo — ver §5) |
| `modulo-cobranza.js` | **Cuentas por Cobrar** | Saldo por cliente, antigüedad de cartera, rotación (DSO); drill-down por cliente; "+ cobro" en fila; export Excel/PDF. | `v_cxc_cliente`, `v_cxc_aging_resumen`, `v_kpi_rotacion_cobranza`, `v_cxc_detalle_cliente` | **VIVO** |
| `modulo-pagos.js` | **Cuentas por Pagar** | Saldo por proveedor, próximos vencimientos; drill-down; "+ pago" en fila; export. | `v_cxp_proveedor`, `v_cxp_proximas`, `v_cxp_detalle_proveedor` | **VIVO** |
| `modulo-antiguedad.js` | **Antigüedad de saldos** | Pestañas CxC/CxP: cartera vencida vs por vencer, pirámide por contraparte, detalle por carga con fecha de vencimiento. | `v_cxc_aging_resumen`, `v_cxc_aging_cliente`, `v_cxc_aging`, `v_cxp_aging_resumen`, `v_cxp_aging_proveedor`, `v_cxp_aging` | **VIVO** |
| `modulo-tesoreria.js` | **Tesorería** | Saldos por cuenta, flujo semanal/mensual, estado de cuenta bancario con saldo corrido; registrar gasto y movimiento; editar movimiento con bitácora; export. | `v_saldo_cuentas`, `v_flujo_semanal`, `v_flujo_caja_mensual`, `v_estado_cuenta`, `v_bitacora_movimientos`, `v_catalogo_cuentas`, `v_catalogo_admin`, `v_catalogo_beneficiarios_gasto`; RPC `fn_capturar_mov`, `fn_aplicar_fifo`, `fn_editar_movimiento`, `fn_traspaso` | **VIVO** |
| `modulo-finanzas.js` | **Finanzas** | Estado de resultados con drill-down por mes, balance, KPIs de margen, concentración de cartera, presupuesto vs real; export del P&L. | `v_estado_resultados_neto`, `v_balance`, `v_kpi_margen_cliente`, `v_kpi_margen_producto`, `v_kpi_concentracion`, `v_presupuesto_vs_real`, `v_pl_mes_detalle`, `v_gastos_mensual` | **VIVO** |
| `modulo-cierres.js` | **Cierres Contables** | Tabla solo-lectura del avance de cierre mensual (estado, bloqueadores, ingresos, utilidad bruta). | `v_cierre_checklist` | **FUNCIONAL** — depende de que la vista exista con datos (ver §5) |
| `modulo-concentracion.js` | **Concentración de riesgo** | HHI y Pareto por cliente/producto/proveedor. | `v_concentracion_resumen`, `v_concentracion` | **VIVO** |
| `modulo-flags.js` | **Revisiones Pendientes** | Dudas parqueadas: responder (`fn_responder_flag`) y cerrar (`fn_resolver_flag_web`). Badge en el menú. | `v_flags_web`; RPC `fn_responder_flag`, `fn_resolver_flag_web` | **VIVO** |
| `modulo-tareas.js` | **Tareas** | Tablero kanban por área/socio, con vínculos a cotización/orden/embarque; crear/editar/asignar/comentar/cancelar. | `v_tareas`, `v_tareas_resumen`, `v_tarea_comentarios`, `v_cotizaciones`, `v_ordenes_compra`, `v_carga_detalle`, `v_catalogo_clientes`, `v_catalogo_proveedores`; RPC `fn_crear_tarea`, `fn_editar_tarea`, `fn_asignar_tarea`, `fn_comentar_tarea`, `fn_cambiar_estado_tarea`, `fn_cancelar_tarea` | **FUNCIONAL** — uso real no verificable desde el frontend (reemplazo de ClickUp, adopción pendiente) |
| `modulo-catalogos.js` | **Directorio Comercial** | Alta/edición de contrapartes (clase, alias, días crédito, direcciones bill-to/ship-to) y productos. | `v_catalogo_admin`, `v_catalogo_productos`; RPC `fn_alta_contraparte`, `fn_editar_contraparte`, `fn_alta_producto` | **VIVO** |
| `modulo-comercial.js` | **Cotiz. y órdenes** | Cotizaciones y órdenes de compra: alta, PDF con logo, envío por WhatsApp/correo, cambios de estado, anulación. | `v_cotizaciones`, `v_cotizacion_items`, `v_ordenes_compra`, `v_orden_compra_items`, `v_envios`, `v_catalogo_clientes`, `v_catalogo_proveedores`, `v_catalogo_productos`; RPC `fn_crear_cotizacion`, `fn_cambiar_estado_cotizacion`, `fn_anular_cotizacion`, `fn_crear_orden_compra`, `fn_cambiar_estado_orden`, `fn_anular_orden`, `fn_registrar_envio`, `fn_actualizar_estado_envio`, `fn_set_contacto_contraparte` | **FUNCIONAL** — completo, uso real no verificable (posible FUNCIONAL-SIN-USO) |
| `modulo-facturas.js` | **Facturación** | Lista de facturas, alta desde un embarque (`fn_crear_factura`), editor con líneas, impresión/PDF, estados borrador/emitida/anulada. | `v_facturas`, `v_carga_detalle`; RPC `fn_crear_factura`, `fn_editar_factura` | **FUNCIONAL-SIN-USO** probable — recién construido; la serie de numeración de factura está pendiente (Miguel) y seguramente hay 0 facturas reales aún |

### Piezas de soporte (no son módulos del menú)
- `comun.js` — núcleo: cliente Supabase, `q()` (lectura de vistas con caché), `rpc()`, formato (`usd`, `fecha`, `venc`), panel/drawer, `crearCombo`, `toast`, permisos (`ERP.puede`), router. **VIVO / crítico.**
- `app.js` — shell: login, buscador universal (`fn_buscar_universal`), badge de flags (`v_flags_web`), router. **VIVO.**
- `exportar.js` — exportación Excel (SheetJS) y PDF (jsPDF + autotable), y PDF del expediente. **VIVO.**
- `captura-rapida.js` — captura en contexto de movimientos (cobro/pago) desde Tesorería/CxC/CxP (`fn_capturar_mov` + `fn_aplicar_fifo`). **VIVO.**
- `documentos.js` — componente viejo de Storage (bucket `documentos`) usado en la ficha clásica de carga. **DEUDA — ver §5 (sistema de documentos duplicado).**

---

## 2. MÓDULOS OCULTOS O A MEDIAS

- **Expediente de Embarque (`modulo-expediente.js`)** — NO está en el menú (por diseño: se abre al tocar un embarque). Es la pieza central reciente. Miguel debe saber que existe y que el clic en un embarque ya NO abre la ficha vieja, sino el expediente de 4 pestañas.
- **Ficha clásica de carga (`verFichaClasica` en `modulo-cargas.js`)** — quedó **semi-escondida**: hoy es el ÚNICO lugar para *agregar costo*, *registrar cobro/pago sobre un embarque* y *anular*, y solo se llega por el botón **"Captura y acciones"** dentro del expediente. Si alguien no ve ese botón, cree que no se puede capturar.
- **`captura.html`** — página **legacy separada** (no es parte de la SPA), enlazada en el menú como "Capturar movimiento". Tiene sus PROPIOS formularios de captura de movimiento/carga/costo y usa **otro juego de vistas de catálogo** (`v_cat_contrapartes`, `v_cat_productos`, `v_cat_tipos`, `v_cat_conceptos_costo`) distinto al de la SPA (`v_catalogo_*`). Es un camino paralelo y viejo que puede confundir y desincronizarse.
- **Documentos de Storage viejos (`documentos.js`)** — componente completo pero **superado** por la pestaña Documentos del expediente. Sigue montado en la ficha clásica. Dos sistemas de documentos conviviendo (§5).

No hay ningún otro módulo registrado que falte en el menú: los 14 `ERP.registrar(...)` están todos enlazados.

---

## 3. CICLO OPERATIVO (cotización → orden de compra → orden de venta → factura → envío → tarea)

| Eslabón | Estado UI | Detalle |
|---|---|---|
| **Cotización** | **Completa** | `modulo-comercial.js` pestaña Cotizaciones: alta, PDF, envío WhatsApp/correo, estados (Borrador→Enviada→Aceptada/Rechazada/Vencida). |
| **Orden de compra** | **Completa** | Misma pantalla, pestaña Órdenes: alta, PDF, envío, estados (Borrador→Enviada→Confirmada→Recibida). |
| **Orden de venta** | **NO existe** | No hay módulo, pestaña ni RPC de "orden de venta / confirmación al cliente". Es el hueco del ciclo. |
| **Factura** | **Completa (UI), sin uso** | `modulo-facturas.js`: crear/editar/imprimir/estados. Falta la **serie de numeración** (pendiente Miguel) y no está amarrada automáticamente a CxC. |
| **Envío** | **Parcial / ambiguo** | Lo que hay (`v_envios`, `fn_registrar_envio`) es el **envío del documento** (mandar la cotización/orden por WhatsApp/correo), NO el envío/logística del embarque físico. No hay tracking de embarque como tal. |
| **Tarea** | **Completa (UI), uso incierto** | `modulo-tareas.js`: kanban con vínculos a cotización/orden/embarque. |

Además, el **pipeline de estados del embarque** (Cotizado→…→Cerrado, FASE 3 del plan) **no está construido**: el embarque tiene un campo `estado` y una mini-barra (`pintarPipeline`) pero no el flujo completo con responsables/timeline.

---

## 4. DISEÑO

**Sistema visual.** Paleta sobria de ERP financiero: verde bosque `#1E5B3A` (marca/acento), lima `#8DBF3F`,
ámbar `#C98A2D` y rojo `#B3402E` para semáforos, papel `#F6F5EF`, tinta `#14261C`. Tipografía en tres roles:
**Archivo** (títulos, peso 800), **Inter** (cuerpo), **IBM Plex Mono** (números y folios). Componentes
reutilizables consistentes: tarjetas (`.card`, `.tarjeta`), píldoras de estado (`.pill` gris/ámbar/rojo/verde),
botones (`.btn-mini` con variantes peligro/confirmar), formularios (`.form-erp`), avisos inline (`.aviso`
ok/warn/err), pestañas (`.pestanas`), tablas con scroll horizontal (`.tabla-wrap`), combos con autocompletado
(`crearCombo`), toasts, barras de antigüedad, y un **panel lateral (drawer)** para todo el detalle/captura.
Todo número es clicable y lleva a su desglose (drill-down). **Responsive:** el menú lateral colapsa a
hamburguesa en móvil y el drawer ocupa el 100% del ancho; los socios lo abren en celular. **Login:** overlay
centrado con tarjeta (`.login-card`), correo/contraseña por socio (Supabase Auth). La impresión de factura usa
un layout dedicado con `@media print` (solo sale la factura).

**Evaluación honesta.** El núcleo se ve **genuinamente profesional y terminado**: header/menú/login idénticos
en todo, paleta coherente, números monoespaciados, semáforos claros, drill-down parejo y drawers pulidos —
para un ERP interno está por encima del promedio. Lo que se ve **a medio hacer** no es el estilo sino la
**coherencia estructural**: conviven dos sistemas de documentos y dos caminos de captura (la SPA moderna y la
`captura.html` vieja), la captura de costos/anulación quedó escondida detrás de un botón, y módulos recién
horneados (Facturación, Cierres, Tareas) se ven completos pero probablemente vacíos de datos. Es un frontend
bien vestido cuyo riesgo está en la plomería, no en la fachada.

---

## 5. DEUDA Y RIESGOS

1. **Sistema de documentos DUPLICADO.** Coexisten (a) `documentos.js` → bucket `documentos`, vistas
   `v_documentos`/`v_categorias_documento`, RPC `fn_registrar_documento`/`fn_anular_documento` (en la ficha
   clásica); y (b) la pestaña Documentos del expediente → bucket `documentos-cargas`, vista
   `v_carga_documentos`, INSERT directo a `carga_documentos`. Dos backends de documentos para lo mismo. Hay que
   decidir cuál es el oficial y retirar el otro.
2. **Backend nuevo que podría no existir aún** (anotado en `PENDIENTES-BACKEND.md`): la vista
   `v_carga_documentos`, la tabla `carga_documentos`, el **bucket `documentos-cargas`** y la vista
   `v_cierre_checklist`. Si no existen con RLS authenticated, la **pestaña Documentos** del expediente y el
   módulo **Cierres Contables** mostrarán el error del backend (no rompen el resto de la app, degradan solo su
   sección).
3. **Captura contable escondida.** `verFichaClasica` (agregar costo / registrar cobro-pago / anular) solo se
   alcanza por "Captura y acciones" dentro del expediente. Riesgo de que se perciba como "ya no se puede capturar".
4. **`captura.html` legacy** vive en paralelo con distinto set de vistas (`v_cat_*` vs `v_catalogo_*`). Riesgo de
   desincronización y de que Samuel capture por dos caminos distintos.
5. **Dependencia de CDNs** (`index.html`): `supabase-js`, `xlsx`, `jspdf`, `jspdf-autotable`. Sin internet o si
   cae un CDN, se rompen exportaciones (y sin supabase-js, toda la app). No hay copia local.
6. **Exportaciones frágiles por diseño.** `exportar.js` **raspa la tabla visible del DOM** (no los datos crudos):
   exporta solo lo filtrado en pantalla y depende de que la estructura `<thead>/<tbody>` no cambie. Para CxC/CxP/
   Finanzas apunta a "la primera tabla del módulo" (selector implícito) — si se reordena el layout, exporta la
   tabla equivocada.
7. **`modulo-comercial.js` es el de más superficie backend** (9 RPCs + 8 vistas). Si alguna de esas vistas/RPC no
   está, esa pantalla falla. Es también el candidato #1 a FUNCIONAL-SIN-USO.
8. **Facturación sin serie ni amarre a CxC.** El editor guarda, pero la numeración oficial y el enlace factura→CxC
   son pendientes de definición.
9. **Detectores de columna "defensivos".** En varios módulos se detecta la columna por lista de candidatos
   (`ERP.columna([...])`) por si el backend cambia nombres. Los de `v_carga_documentos` y `v_cierre_checklist` ya
   se fijaron a los nombres confirmados (ver CLAUDE.md); el resto sigue tolerante pero eso también esconde
   discrepancias de esquema.
10. **No hay TODO/FIXME sueltos ni pantallas placeholder muertas.** Los mensajes de "no disponible" son fallbacks
    graciosos (p. ej. expediente si el módulo de facturación no cargó), no deuda abandonada.

---

## 6. LO QUE FALTA PARA CADA MÓDULO INCOMPLETO

- **Facturación (`modulo-facturas.js`)** — Definir la **serie/numeración** de factura (backend, Miguel) y amarrar
  la factura emitida a CxC. Después: usarla de verdad (hoy probablemente 0 facturas).
- **Cierres Contables (`modulo-cierres.js`)** — Confirmar que `v_cierre_checklist` existe y se puebla; ya está
  fijado a los nombres de columna reales. Nada más de UI; es solo lectura.
- **Expediente → pestaña Documentos** — Confirmar bucket `documentos-cargas` + tabla `carga_documentos` + vista
  con RLS; luego la **prueba real de subida/descarga por Miguel** (pendiente en el plan).
- **Cotizaciones y órdenes (`modulo-comercial.js`)** — Verificar que todas sus vistas/RPC existan en producción y
  ponerlo en uso real; agregar **Orden de Venta / confirmación al cliente** (hoy no existe).
- **Tareas (`modulo-tareas.js`)** — Completo en UI; falta adopción (reemplazar ClickUp) y validar que las vistas de
  tareas estén pobladas.
- **Ciclo operativo** — Falta el eslabón **Orden de Venta** y el **pipeline de estados del embarque**
  (Cotizado→…→Cerrado) con timeline y responsables (FASE 3 del plan maestro).
- **Deuda transversal** — Unificar el **sistema de documentos** (retirar `documentos.js` viejo o el nuevo) y
  decidir el futuro de **`captura.html`** (integrarla a la SPA o retirarla).

---

_Fin del reporte. Este documento es una foto del código al 2026-07-17; el estado de datos (qué está realmente
poblado y en uso) debe confirmarse contra Supabase._

---
## E98 Sesión 2 (2026-08-06 11:22pm) — Pantalla 6/18: Facturación completada
_Continuación de rediseño "Operador estilo Silo". Sesión 1 había completado 5 de 18 pantallas (Directorio Comercial, Programas, Proyectos, Cotizaciones y OC, Lotes). Session 2 continúa con pantallas faltantes._

**COMPLETADAS 11 PANTALLAS EN E98 SESIÓN 2 (todas node --check ✅, NO DESPLEGADO — Miguel corre deploy):**

1. **Facturación (modulo-facturas.js)** — `.pantalla-facturas` (76 líneas CSS). Listado+filtros, tabla con cobro desde CxC, ficha editable con grid de cobro y tabla de líneas, avisos.
2. **Inventario (modulo-inventario.js)** — `.pantalla-inventario` (32 líneas CSS). Tarjetas HHI de semáforos (Capital parado/Exposición), tabla agrupada por buckets, solo lectura.
3. **Concentración de riesgo (modulo-concentracion.js)** — `.pantalla-concentracion` (33 líneas CSS). Tarjetas HHI x3 dimensiones, tablas Pareto por cliente/producto/proveedor.
4. **Cierres Contables (modulo-cierres.js)** — `.pantalla-cierres` (16 líneas CSS). Tabla de periodos, estado, bloqueadores, ingresos, utilidad bruta.
5. **Liquidaciones (modulo-liquidaciones.js)** — `.pantalla-liquidaciones` (42 líneas CSS). Listado+filtros, tabla, ficha con desglose y edición de deducciones.
6. **Tareas (modulo-tareas.js)** — `.pantalla-tareas`. Tablero Kanban (reemplazo ClickUp).
7. **Revisiones Pendientes (modulo-flags.js)** — `.pantalla-flags`. Dudas parqueadas agrupadas por estado (pendientes/respondidas).
8. **Datos faltantes (modulo-datos-faltantes.js)** — `.pantalla-datos-faltantes`. Lista de cargas con campos sin capturar.
9. **Bitácora (modulo-bitacora.js)** — `.pantalla-bitacora`. Registro de cambios con antes→después.
10. **Usuarios (modulo-usuarios.js)** — `.pantalla-usuarios`. Matrix usuario×capacidad y usuario×módulo (E105).
11. **Órdenes de Venta (modulo-ventas.js)** — `.pantalla-ventas`. Pedidos a clientes con líneas de embarques.

**CSS genérico (estilos.css):** Últimas 6 pantallas (Tareas–Órdenes) usan un CSS unificado con selectores múltiples (mismo patrón que Liquidaciones), cubriendo: filtros, botones, tablas, formularios, estados, avisos, colores con tokens nuevos (claro/oscuro).

---
## E89 (2026-08-06) — Dirección de diseño elegida (aún sin código)
_Sesión de exploración visual (8 conceptos, sin tocar el repo). Nada desplegado. Sin cambios de código._

Miguel APROBÓ el formato **"Operador estilo Silo, versión Plein"**. Escena ancla aprobada: `escena-silo-plein.html` (pantalla Embarques). Referencia de formato: `conceptos-diseno-3.html` (concepto G). Detalle completo (tokens claro/oscuro, tipografía, componentes, menú agrupado, plan) en el anexo NUEVO **`SISTEMA-DISEÑO.md`**.

- **Motor de estilos:** refinar CSS a **TOKENS** (variables) + **toggle claro/oscuro** (una sola vez, preferencia en `localStorage`). SIN Tailwind, SIN build. El stack sigue igual (HTML/JS vanilla en Vercel). Claude Code toca sobre todo una hoja de estilos + retoques puntuales de marcado.
- **Gramática visual:** riel de íconos (66px) + barra de módulo arriba + tira de KPIs verdes grandes encima de cada tabla + grupos por programa/cliente (pestaña verde) con filas de lote anidadas (pestaña naranja) + columnas financieras densas + botón primario NEGRO + pastillas de modalidad. Verde = dinero. Íconos Tabler, cero emojis.
- **Tokens (resumen — exactos en `SISTEMA-DISEÑO.md`):** claro `--bg #F6F8F5 · --pan #FFF · --ink #14231A · --brand #1E531D · --money #1E7A3C · --btn #14231A · --amb #B26B12 · --red #B3402E · --tabO #C98A2D`; oscuro `shell #0F1512 · panel #151B17 · money #57C06A · ink #EAF0EB · bd #232B26`. Tipos: Archivo / Inter / IBM Plex Mono.
- **Limpieza transversal aprobada:** quitar la foto de fondo del `body`; cero emojis (→ Tabler); ocultar notas internas `[E17]`/`[E47]`/`FLAG:` de la vista diaria (→ nota interna secundaria, no en la fila principal); menú agrupado (Operación/Dinero/Finanzas/Catálogos/Revisión/Admin, respetando `ERP.perfil.modulos`); header sin ruido (chip de usuario limpio).
- **Pendiente frontend (orden):** (1) piloto pulido Inicio + Embarques → aprobar. (2) Claude Code: instalar hoja de tokens + toggle claro/oscuro → verificar en 1 pantalla. (3) propagar pantalla por pantalla: Embarques → CxC → CxP → Tesorería → Inicio → resto. Cada entrega = bloque copy-paste Terminal + qué esperar ver; Miguel despliega.

---
## E99 (2026-08-07) — Embarques: RECONSTRUCCIÓN ESTRUCTURAL a agrupado por programa
_No es un re-pintado: E90 había dejado pendiente explícitamente el layout `.group/.ghead/.gtag/.gsub` "por no ser datos agrupables 1:1 por programa" — esa decisión se REVIRTIÓ en E99: se verificó que sí hay suficiente cobertura de programa (v_cargas_programa, backfill de E47) para que el agrupado tenga sentido, y se construyó completo._

**Qué cambió (modulo-cargas.js):**
- `pintarTabla()` reescrita de cero: de una sola tabla plana con 16 columnas a tarjetas `.group` (una por programa comercial), cada una con encabezado `.ghead` (pestaña verde `--tabG`, ícono, nombre del programa, subtítulo, 5 KPIs de grupo, botones Programa/Editar/colapsar) + tabla de lotes anidada dentro de `.glotes`.
- Nuevas funciones: `agruparPorPrograma()` (agrupa+ordena+calcula totales de grupo), `kv()` (celda de KPI compacta), `htmlFilaLote()` (fila de lote en la tabla anidada), `htmlGrupoPrograma()` (tarjeta completa de grupo).
- Se eliminó la función `puntoMargen()` (semáforo de punto de color) — quedó huérfana tras el rediseño de columnas; la leyenda al pie se actualizó para explicar los nuevos indicadores (B-E, Vendidas) en su lugar.
- Se eliminó el chip `.pill.ir-programa` de la fila plana (ya no existe esa fila) — su navegación a Programas ahora vive en el botón "Programa" del encabezado de grupo. Se limpiaron las reglas CSS huérfanas correspondientes (`.pill.ir-programa` global y scoped, `.pmargen` scoped).
- Los chips de filtro/estado, la tira de KPIs superior (`#kpiStrip`), la franja de Agenda operativa y la barra de filtros (`pintarFiltros`) **NO se tocaron** — siguen exactamente igual que en E90.

**JOIN de proveedor en frontend (E99, sin tocar backend):** `v_cargas_programa` (folio→programa_codigo/etiqueta) NO trae el proveedor del programa. Se agregó un segundo fetch a `v_programas_comerciales` (mismo patrón que ya usa `modulo-programas.js` para su columna Proveedor) y se construyó `programaInfoMap` (codigo→{etiqueta,proveedor}) en frontend. Si el fetch falla o el programa no tiene `proveedor_id` capturado, el grupo muestra **"proveedor sin asignar"** — nunca se inventa un nombre. Verificado en el harness de prueba con un programa sin proveedor: se comportó como se esperaba.

**Columnas de la tabla de lotes — 3 son DERIVADAS en frontend, no campos nuevos de backend:**
- `$/Caja` = `ingreso_venta / cajas`, `Costo/Caja` = `costo_total / cajas` — aritmética simple sobre datos ya existentes.
- `B-E` (break-even) = indicador ✓/— de si `ingreso_venta >= costo_total`, en vez de una tercera cifra en dinero (que habría sido idéntica a Costo/Caja — redundante).
- `Vendidas` = mismo valor que `Cajas`, con tooltip explicando: **el backend no rastrea venta parcial por lote** (cada embarque es una venta completa en este modelo de datos, D-04/D-10). No se inventó un número distinto — se documentó la limitación en vez de fabricar un dato.

**Venta vs. Comisión:** si TODAS las cargas vigentes de un grupo son `modalidad='comision'`, el KPI de grupo y la columna de la tabla se rotulan "Comisión" en vez de "Venta" — mismo campo `ingreso_venta`, sin transformar el número (D-10: "el ingreso registrado ES la comisión"). Verificado con el programa mock "Papaya Alpine — Comisión": costo $0, margen 100%, mostrado en verde/normal, NUNCA como error.

**Colapsar/expandir grupos:** implementado por grupo individual (botón chevron en `.ghead`, estado en `Set` de sesión `gruposColapsados`, no en localStorage). **Conteo de programas activos:** no se pudo verificar en vivo contra Supabase en esta sesión (sin acceso a Supabase MCP, solo herramientas de frontend) — PLAN-MAESTRO.md documenta 13 programas (PC-001–PC-013) al cierre de E47, cantidad manejable que NO justifica colapsado por default; se dejó **expandido por default** con el toggle disponible. Si el conteo real creció mucho desde E47, invertir el default es un cambio de una línea.

**Grupo "Sin programa asignado":** cargas sin `programa_codigo` (folio ausente en `v_cargas_programa`) caen en un grupo de excepción, sin botones Programa/Editar/colapsar (no aplican), con borde punteado gris para diferenciarlo visualmente. Se pinta SIEMPRE al final (orden: por venta desc, con este grupo excluido del ranking) — ninguna carga se pierde por no tener programa.

**Orden de sort (Fecha/Utilidad):** se conservó el mismo estado (`sortFecha`/`sortUtil`) y misma lógica de ordenamiento, aplicada a las filas ANTES de agruparlas (afecta el orden de los lotes dentro de cada grupo). La UI cambió de `<th>` clicable dentro de un thead único a dos botones `Fecha ⇅` / `Utilidad ⇅` en una barra de controles arriba de las tarjetas, porque ya no hay una sola tabla con un thead compartido.

**Verificación en vivo (harness local con datos mock, Chrome DevTools MCP):**
- ✅ Claro y oscuro: KPIs, pastillas, pestañas naranja/verde, íconos Tabler, indicador B-E, todo legible en ambos temas.
- ✅ Colapsar/expandir grupo individual: funciona, no afecta a otros grupos.
- ✅ Proveedor sin asignar: se muestra el fallback correcto sin romper el render.
- ✅ Grupo "Sin programa asignado": se pinta al final, con estilo visual distinto (borde punteado).
- ✅ Modalidad comisión pura: costo $0/margen 100% se muestra correcto, sin alertas de error.
- ✅ `node --check` limpio en modulo-cargas.js y en los 6 módulos que comparten clases (Cobranza/Inicio/Finanzas/Pagos/Tesorería/Programas) — nada se rompió por las 2 reglas CSS globales eliminadas (confirmado que eran dead code, sin otros usos).
- ⚠️ No se verificó contra Supabase en vivo (sin MCP en esta sesión) — Miguel debe confirmar en producción que `v_cargas_programa`/`v_programas_comerciales` devuelven los datos esperados y que el conteo real de programas no amerita colapsado por default.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E99-fix (2026-08-07) — Embarques: columnas P.O. y V7 en la tabla de lotes anidada
_Ajuste sobre la reconstrucción de E99: la tabla de lotes por grupo no tenía forma de identificar cada renglón contra el banco/V7 — la tabla plana anterior sí traía esos identificadores por separado (P.O./V7/Lote/Carga como 4 campos distintos)._

**Verificación en vivo (código, no Supabase — sin MCP esta sesión):** `v_carga_detalle` expone `c.po`, `c.id_v7`, `c.lote` y `c.lote_productor` — confirmado por uso ya existente en otras partes de `modulo-cargas.js` (`filtradas()` los usa para la búsqueda de texto libre). **No existe un campo "Orden de Venta"** en esta vista: se revisó cada referencia a `so_folio`/`orden_venta` en el módulo y la única aparición (`p_so_folio`) es un parámetro de RPC para registrar eventos, siempre `null` en el flujo normal — no un dato de la carga que se pueda mostrar. **No se agregó Orden de Venta.**

**Qué se agregó:**
- Columna **P.O.** (`c.po`) después de "Lote" (que sigue mostrando el folio, p.ej. P-084, sin renombrar — así se acordó con Miguel).
- Columna **V7** (`c.id_v7`) después de P.O.
- Ambas con fallback `—` cuando el campo viene `null` (nunca se inventa un valor), clase `.id-corta` nueva (font-size 11px, `white-space:nowrap`) para que la fila de 14 columnas no se vea amontonada.
- `title` en los `<th>` de P.O./V7 explicando su propósito (llave de cotejo con el banco / referencia V7).

**Qué NO se agregó (documentado, no omitido en silencio):** `c.lote`/`c.lote_productor` (el lote físico del productor) también existen en `v_carga_detalle` y existían como columna separada en la tabla plana anterior, pero no se agregaron aquí por espacio — la fila ya tiene 14 columnas. Si Miguel los necesita visibles, es un ajuste rápido de seguimiento (mismo patrón que P.O./V7).

**Verificación en vivo (harness local, Chrome DevTools MCP, claro y oscuro):** P.O./V7 se ven correctamente, compactos, con el fallback `—` funcionando (probado con una carga sin P.O. ni V7 en el mock). No se rompió ninguna otra columna ni el ancho general de la tarjeta.

**node --check:** ✅ limpio.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E100 (2026-08-07) — 3 fixes de captura que estorban el uso diario

**FIX 1 — "Te saca cada rato al capturar" (resuelto).** Causa raíz: el auto-refresco de `app.js`
(`setInterval` cada 5 min) llama `actualizar()` → `ERP.despachar()`, y `despachar()` (comun.js)
SIEMPRE cierra el drawer de captura (`cerrarPanel()`) y reemplaza `#app` completo — sin importar si
había un formulario abierto a medio llenar. Como TODAS las capturas del ERP pasan por el mismo
drawer compartido (`ERP.abrirPanel`, confirmado: 114 usos en los 30 módulos), un solo guard lo
resuelve. Cambios:
- `comun.js`: nueva función `panelAbierto()` (true si `#panel` tiene la clase `abierto`), exportada
  en `ERP`.
- `app.js`: el `setInterval` de auto-refresco ahora es `if (ERP.token && !ERP.panelAbierto())
  actualizar()` — si el drawer está abierto se salta ESE ciclo (no se cancela el timer, solo ese
  tick); 5 min después vuelve a intentar. El botón manual "Actualizar" y la navegación normal NO se
  tocaron (siguen igual).

**FIX 2 — Filtrar cargas por cliente al ligar un movimiento (resuelto).** El único lugar del ERP
donde se "liga" una carga a un movimiento a mano es la sección "Aplicar a carga" dentro de Editar
movimiento (Tesorería) — `fn_aplicar_a_carga`. El combo leía TODO `v_carga_detalle` sin filtrar.
Cambios en `modulo-tesoreria.js` (`editarMovimiento`, `formAplicarHtml`):
- El selector arranca filtrado a las cargas de la MISMA contraparte del movimiento (cliente si es
  Cobro/ingreso, proveedor si es Pago/egreso; comparación con `ERP.norm()` para no fallar por
  mayúsculas/acentos).
- Checkbox "Ver todas las cargas (no solo las de X)" — si el usuario la marca, `comboCargaApl`
  cambia sus items al catálogo completo (usa `actualizarItems()` del combo, no se recrea el combo).
- Si la contraparte no tiene cargas propias, el combo cae automáticamente a "todas" con el checkbox
  ya marcado y un aviso explicando por qué (nunca deja el selector vacío en silencio).
- No se tocó `fn_aplicar_a_carga` ni el resto del flujo de aplicación.

**FIX 3 — Edit amplio de carga/embarque (Parte 1 en E100; Parte 2 CERRADA con D-118).**
- Campos de la carga (P.O., fecha de embarque, modalidad, estado, cliente/proveedor/producto,
  variedad, ingreso de venta, lote del productor, fecha de cosecha): revisado `armarPayloadEditarCarga`
  contra la firma completa de `fn_editar_carga` — el formulario YA cubre el 100% de los parámetros
  que acepta esa RPC. No había nada más que desbloquear ahí.
- Costos por concepto (parte que estaba bloqueada en E100): antes solo se podía AGREGAR un costo
  nuevo (`fn_agregar_costo`). No había UI para editar/eliminar una línea YA capturada — de ahí la
  sensación de "campo de nota que no se puede escribir". **Quedó pendiente de backend** hasta D-118.

---
## E100-fix3 (2026-08-07) — Editar y ELIMINAR una línea de costo ya capturada (cierre del Fix 3)
_Backend D-118 ya desplegado: `v_carga_costos_det` ahora expone `id` por línea; existen las RPCs
`fn_editar_costo(p_id, p_motivo, p_concepto=NULL, p_monto=NULL, p_nota=NULL)` (lo que va NULL no se
toca) y `fn_eliminar_costo(p_id, p_motivo)`. Con eso, el frontend se conectó._

**Dónde vive (decisión):** en la **ficha clásica de captura** de un embarque — la que se abre con
"＋ Captura y acciones" desde el expediente (`modulo-cargas.js`, `pintarFicha`). Es la MISMA
superficie donde ya vivía "Agregar costo"; toda la captura/edición de costos queda ahí junta. El
Resumen del expediente sigue siendo solo lectura, a propósito (es una vista panorámica).

**Qué se agregó en `modulo-cargas.js`:**
- Tabla de Costos: por cada línea, dos botones **Editar** / **Eliminar** (misma clase `btn-mini gris`
  que ya usa el resto de acciones por fila, sin CSS nuevo). Se pintan SOLO si `ERP.puede('editar')`
  y la carga NO está anulada (`puedeEditarCostos`); si no, la tabla queda idéntica a antes (columna
  de acciones ausente, `colspan` ajustado). Usan el `id` nuevo de `v_carga_costos_det`.
- **Editar** (`abrirFormEditarCosto` / `guardarEditarCosto`): mini-form con el MISMO patrón/estilo
  de "Agregar costo" (concepto = `<select>` del catálogo `v_catalogo_conceptos_costo`, monto, nota),
  precargado con los valores actuales, MÁS un campo **Motivo** obligatorio. Es un toggle propio
  (`#formEditarCosto`), y al abrirlo cierra el de "Agregar" para no tener dos formularios a la vez.
  Al guardar manda a `fn_editar_costo` **solo lo que cambió** (lo igual va `null` → el backend no lo
  toca); vaciar la nota se manda como `''` (sí la borra). Si nada cambió, avisa y no llama al RPC.
  Si el backend devuelve `advertencia`, se muestra con `ERP.toast`. El concepto actual se garantiza
  como opción del `<select>` aunque sea uno viejo fuera del catálogo activo (no se pierde ni se
  fuerza un cambio no pedido).
- **Eliminar** (`confirmarEliminarCosto` / `eliminarCosto`): confirmación + `window.prompt` de
  **Motivo** obligatorio, luego `fn_eliminar_costo`; muestra `resultado` en un `ERP.toast`.
- Tras editar o eliminar: `ERP.marcarDatosSucios()` + `verFichaClasica(folio)` → **re-lee
  `v_carga_costos_det` y recalcula el Total de costos**, SIN cerrar el drawer (nunca llama
  `despachar()`, así que respeta el guard `panelAbierto` del Fix 1: no interrumpe la captura).

**Verificación en vivo (harness local + Chrome DevTools MCP, con `comun.js` y `modulo-cargas.js`
REALES, solo la capa de red stubbeada):**
- ✅ Render: 2 líneas de costo con sus botones Editar/Eliminar (ids correctos) y fila "Total costos $300.00".
- ✅ Editar abre el form y precarga concepto/monto/nota reales.
- ✅ Cambiar solo el monto → el RPC recibió `{p_id, p_motivo, p_concepto:null, p_monto:150, p_nota:null}` (solo lo cambiado).
- ✅ Vaciar la nota → `p_nota:''` (no null) para que el backend la borre; concepto/monto van null.
- ✅ Guard "no cambiaste nada" → no llama al RPC, avisa en el form.
- ✅ Motivo vacío → bloquea, avisa "El motivo es obligatorio…", sin RPC.
- ✅ Eliminar → confirma + pide motivo → `fn_eliminar_costo({p_id:12, p_motivo:'…'})`.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-cargas.js` (y en `app.js`/`comun.js`/`modulo-tesoreria.js` del Fix 1/2).

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E100-anular-mov (2026-08-07) — Botón "Anular movimiento" en Tesorería (backend D-119)
_Backend ya desplegado: `fn_anular_movimiento(p_folio, p_motivo)` → devuelve mov_folio,
aplicaciones_revertidas, resultado. Es REVERSIBLE (marca anulado=true) y desaplica sus aplicaciones.
Si el movimiento o sus aplicaciones caen en un mes cerrado, el backend lo rechaza con instrucciones._

**Qué se agregó en `modulo-tesoreria.js` (panel "Editar movimiento"):**
- Una **zona de peligro** al fondo del drawer (misma clase `.zona-peligro` + `.btn-mini.peligro`
  que ya usa "Anular carga" en Embarques, sin CSS nuevo) con el botón **Anular movimiento** y una
  nota que explica qué hace. Separado del resto de botones para no apretarlo por error.
- Se pinta SOLO si `ERP.puede('editar')` y `mov.anulado !== true`. (En la práctica un movimiento ya
  anulado ni siquiera muestra "Editar" en la lista, así que el panel no es alcanzable para uno
  anulado — el guard es doble seguridad.)
- `anularMovimiento(mov)`: `window.confirm` (advierte que se revierten las aplicaciones y queda en
  historial) + `window.prompt` de **Motivo** obligatorio (vacío → `ERP.toast` de error y NO llama al
  RPC; cancelar el prompt → no hace nada). Llama `fn_anular_movimiento({p_folio: mov.folio,
  p_motivo})`. Éxito → `ERP.toast('ok', 'Movimiento anulado · N aplicación(es) revertida(s)')`,
  `ERP.marcarDatosSucios()` y `ERP.cerrarPanel()` (cerrar el editor re-renderiza Tesorería de fondo
  por `datosSucios`, mostrando la fila ya con el chip **ANULADO**). Es una acción explícita sobre el
  propio drawer, no interrumpe otra captura (no toca el auto-refresco del Fix 1).
- Error del RPC (p.ej. **mes cerrado**): se muestra **tal cual** con `ERP.toast('err', e.message)`
  (el backend ya explica cómo reabrir) — no se interpreta. `ERP.avisarSiPermiso` primero por si es
  rechazo de permisos.

**Verificación en vivo (harness local + Chrome DevTools MCP, con `comun.js` y `modulo-tesoreria.js`
REALES, solo la capa de red stubbeada):**
- ✅ El botón aparece en el editor de un movimiento vigente, con clase `btn-mini peligro`, dentro de `.zona-peligro`.
- ✅ Un movimiento ya anulado no ofrece "Editar" en la lista (panel no alcanzable).
- ✅ Motivo vacío → NO llama al RPC.
- ✅ Cancelar el prompt de motivo → NO llama al RPC.
- ✅ Flujo válido → `fn_anular_movimiento({p_folio:501, p_motivo:'…'})` y el drawer se cierra (fondo se re-renderiza con el estado anulado).
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-tesoreria.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E100-so-importe (2026-08-07) — Importe de la Orden de Venta desde el ingreso canónico
_Bug: la ficha de una Sales Order mostraba el importe en $0 aunque la venta estaba registrada.
Causa: el front sumaba `v_sales_order_cargas.importe_asignado` (= cajas × `precio_caja`), y
`precio_caja` casi siempre viene NULL → importe $0. La fuente correcta del ingreso es
`v_ingreso_reconocido.ingreso_reconocido` (ya respeta el modelo: comisión fija, margen por caja,
%, compra-reventa)._

**Qué se cambió en `modulo-ventas.js` (`verSO` / `tablaAsignadas` / `cuerpoFicha`):**
- `verSO` ahora también lee `v_ingreso_reconocido` (en paralelo, con `.catch(()=>[])`: si falla se
  degrada a `importe_asignado` y la ficha no se rompe) y arma un mapa `carga_folio → ingreso_reconocido`.
- La columna **Importe** de cada carga y el **Total** de la orden salen de ese ingreso canónico
  (`ingresoPorCarga.get(carga_folio)`), con degradación a `importe_asignado` solo si una carga no
  tuviera fila en la vista. El total de la SO = SUMA de los ingresos reconocidos de sus cargas.
- **NO se tocó el detalle**: siguen las columnas Cajas y Precio/caja tal cual (Precio/caja muestra
  `—` cuando viene NULL, que es lo real). Se agregó una leyenda aclarando que el Importe es el
  ingreso reconocido de cada carga, no cajas × precio.
- La **lista** de órdenes (`pintarTabla`) no muestra importe (solo Cargas/Cajas/Días), así que no
  había ningún $0 que corregir ahí. La sección "Órdenes de venta" dentro de la ficha de una carga
  (`montarVentasCarga`) se dejó igual: ahí `importe_asignado` es el reparto de ESA carga por SO;
  meter el ingreso completo de la carga en cada renglón duplicaría el número si la carga está
  repartida entre varias SO (fuera del alcance de este fix, que es el importe de la SO).

**Verificación en vivo (harness local + Chrome DevTools MCP, `comun.js` y `modulo-ventas.js` REALES,
solo la red stubbeada):** SO con 2 cargas, `precio_caja` NULL en ambas e ingreso reconocido 9,600 y
7,680:
- ✅ Total de la orden = **$17,280.00** (antes habría sido $0).
- ✅ Importe por carga: P-101 → $9,600.00, P-102 → $7,680.00.
- ✅ Precio/caja sigue mostrando `—` (NULL real) y las Cajas (800/800) intactas.
- Harness temporal creado y **borrado** al terminar.

**node --check:** ✅ limpio en `modulo-ventas.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E101 (2026-08-08) — 3 features de financiamiento cableadas al frontend (backend D-120 a D-124)
_Solo UI. El frontend consume solo vistas/RPCs (nunca la tabla base `contrapartes`). node --check
limpio en los 3 archivos. NO desplegado (Miguel)._

**A) "Ajustar línea" del proyecto (D-120) — `modulo-proyectos.js`.**
- Botón nuevo **"Ajustar línea"** en las acciones de la ficha del proyecto (gate `editar`, junto a
  "Editar proyecto"). Abre un modal (patrón `abrirModal` ya existente) que muestra **línea actual /
  dispuesto / disponible** (de `v_proyectos`) e inputs **Nueva línea** (numérico, precargado con la
  línea actual) + **Motivo** (opcional). Llama `fn_ajustar_linea_proyecto(p_codigo, p_nueva_linea,
  p_motivo)`. El candado del backend (nueva línea < dispuesto) se muestra **tal cual** en el aviso
  del modal; una leyenda avisa de esa regla antes de guardar. Al éxito: `marcarDatosSucios` + toast
  con el mensaje del RPC + `verProyecto` (refresca la ficha).

**B) "Registrar aportación de socio" (D-122) — `captura-rapida.js` (panel nuevo).**
- `ERP.capturarAportacionSocio(ctx)`: drawer nuevo (mismo patrón que Anticipo/Gasto). Campos:
  **Socio** (input texto con `<datalist>` de sugerencias), **Naturaleza** (select →
  `prestamo_sin_interes` / `financiamiento_con_tasa` / `custodia`), **Monto**, **Cuenta** (combo,
  default JPM), **Fecha**, **Proyecto** (select de referencia, opcional — solo etiqueta),
  **Descripción**, **Nota**. Llama `fn_registrar_aportacion_socio(p_socio, p_monto, p_naturaleza,
  p_cuenta, p_fecha, p_proyecto, p_descripcion, p_nota)`; al éxito muestra folio + naturaleza +
  advertencia (si viene) en toast. Gate `capturar`.
- **Puertas:** botón **"+ Aportación de socio"** en la barra de acciones de **Tesorería** (junto a
  "+ Anticipo a productor") y en la ficha de **Proyecto** (sección "Libro de la línea", con
  `ctx.proyecto` precargando el select de referencia).

**C) Selector de origen en "Anticipo a productor" (D-124) — `captura-rapida.js` (panel existente).**
- Se agregaron 2 campos OPCIONALES: **Origen del fondeo** (select — Sin especificar / Propio /
  Socio) y, si es Socio, **Fondeador** (input texto con `<datalist>` de socios; oculto salvo que el
  origen sea "socio"). Se pasan como `p_origen_fondeo` (`'propio'|'socio'|null`) y `p_fondeador`
  (nombre, solo si origen='socio', si no `null`) a `fn_anticipo_productor`. **Retrocompatible**: si
  el usuario no elige nada, ambos van `null` y el anticipo funciona exactamente igual que antes.

**Fuente de los pickers de socio (decisión de diseño):** el picker/sugerencias de socio (para
Fondeador y para "Socio" en la aportación) se alimenta de la **vista** `v_deuda_socios`
(filtrando `clase='socio'`), NO de la tabla base `contrapartes` — respeta la regla dura "el
frontend consume solo vistas/RPCs". Los campos son **texto libre con sugerencias** (`<datalist>`):
se puede escribir cualquier nombre aunque no esté en la lista (p.ej. un socio nuevo sin deuda aún).

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`, `captura-rapida.js` y
`modulo-proyectos.js` REALES, solo la red stubbeada):**
- ✅ A: modal precarga línea 150,000 y muestra 150,000 / 40,000 / 110,000; guardar →
  `fn_ajustar_linea_proyecto({p_codigo:'PRJ-001', p_nueva_linea:180000, p_motivo:'…'})`.
- ✅ B: panel con sugerencias de socios (JEAMS, José) desde `v_deuda_socios`, proyecto de referencia
  precargado (PRJ-001), naturaleza correcta; guardar → `fn_registrar_aportacion_socio` con
  `p_naturaleza:'custodia'`, `p_cuenta:'JPM'`, `p_proyecto:'PRJ-001'`.
- ✅ C: fondeador oculto por defecto; al elegir "Socio" se revela y sugiere socios; guardar →
  `fn_anticipo_productor` con `p_origen_fondeo:'socio'`, `p_fondeador:'José Arámbula'`.
  Retrocompat: sin origen → `p_origen_fondeo:null, p_fondeador:null`; origen "propio" → `'propio', null`.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `captura-rapida.js`, `modulo-tesoreria.js`, `modulo-proyectos.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E102 (2026-08-09) — Directorio Comercial: gestión autosuficiente (backend P1 D-125..D-128)
_El módulo Directorio Comercial (`catalogos`) YA era una pantalla madura (lista por clase con
pestañas, ficha de detalle con estado de cuenta/aging/programas/recencia, alta y edición con
campos extendidos de contacto/facturación/direcciones). Este trabajo lo EXTIENDE con lo nuevo de
P1 — no lo reescribió: se conservó toda la funcionalidad existente (ficha, alias, catálogo de
productos/variedades) intacta._

**Decisión de diseño — fusionar, no reemplazar la fuente de datos:** la tarea pedía leer
`v_directorio_contrapartes` (columnas: id, nombre, clase, es_cliente, es_proveedor,
**recibe_pagos**, alias, email, telefono_whatsapp, contacto_nombre, ciudad, pais, dias_credito,
rfc_tax_id, paca_licencia, nota, **capturado_por**, **capturado_ts**, **tiene_movimientos**). Esa
lista NO incluye razón social / email de facturación / direcciones de facturación-envío / número
de cargas, que la ficha y el editor YA usan desde `v_catalogo_admin` y que las RPCs siguen
aceptando (`p_razon_social`, `p_email_facturacion`, `p_direccion_facturacion`, `p_direccion_envio`
siguen en el contrato). Para no perder esos campos ni inventar columnas que no están documentadas,
`traer()` ahora pide **ambas** vistas en paralelo y funde por `id` los 4 campos nuevos de
`v_directorio_contrapartes` dentro de cada fila de `contrapartes` (que sigue viniendo de
`v_catalogo_admin`). Si `v_directorio_contrapartes` falla, degrada con `recibe_pagos:false` /
`capturado_por:null` / `tiene_movimientos:null` — nunca tumba la pantalla.

**A) Lista — `pintarContrapartes()` reescrita.** Columnas nuevas: **Clase** (badge gris, antes
implícita solo por la pestaña activa), **Flags** (pills independientes Cliente / Proveedor /
Recibe pagos — antes solo existía una columna "Rol" fusionada y solo en la pestaña Comercial;
ahora aplica a las 4 clases porque `recibe_pagos` importa sobre todo en Gasto/Operativo/Socio),
**Ciudad / país**, y **Alta por** (`capturado_por`; si es `null` muestra <b>"histórico"</b> en
gris, con el timestamp como `title` cuando existe). Se conservaron Alias, Días crédito y Cargas.
El buscador (por nombre/alias/nota) y el filtro por clase (las pestañas ya existentes) siguen
igual — ya cumplían "buscador + filtro por clase" antes de este cambio.

**B) Nueva contraparte — `formNueva()` / `guardarNueva()`.** Se agregó el checkbox **"Recibe
pagos"** (bloque propio, no atado a Cliente/Proveedor, con la ayuda textual pedida: "puede recibir
sueldo/viáticos aunque no sea de clase Gasto") y se manda `p_recibe_pagos` a `fn_alta_contraparte`.
Todo lo demás (nombre, clase, roles, alias, días de crédito, nota, contacto/facturación/
direcciones) sigue igual — ya estaba completo.

**C) Editar — `formEditar()` / `guardarEdicion()`.** Mismo checkbox, precargado con
`c.recibe_pagos`, mandado tal cual (booleano directo, mismo patrón que `es_cliente`/`es_proveedor`)
a `fn_editar_contraparte`. El subtítulo del panel ahora agrega **"tiene movimientos registrados"**
cuando `tiene_movimientos=true` — informativo únicamente: **no se agregó ningún botón de borrar**
(nunca existió uno en este módulo, y no hay RPC de borrado — se sigue esa regla).

**Permisos — gate corregido de `administrar` a `capturar` para contrapartes.** El módulo tenía el
alta/edición de contraparte detrás de `ERP.puede('administrar')`, más restrictivo que lo que las
RPCs realmente exigen (`fn_alta_contraparte`/`fn_editar_contraparte` = permiso `'capturar'`, D-125).
Se corrigió en los 3 sitios (ficha de detalle, tabla, barra de acciones) a `ERP.puede('capturar')`
— así Samuel/Juan/José/Fer (rol `operacion`, que ya tienen `capturar`) pueden dar de alta o
corregir un cliente/proveedor sin depender de Miguel. El catálogo de **productos/variedades**
(`fn_alta_producto`/`fn_alta_variedad`, fuera del alcance de esta tarea) se dejó exactamente igual,
gateado a `administrar`.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js` y `modulo-catalogos.js`
REALES, solo la red stubbeada):**
- ✅ Lista pestaña Comercial: columnas Clase/Flags/Ciudad-país/Alta por correctas (Crystal Valley →
  Cliente, Nogales USA, alta por PP01-SI; Akambarhu → Proveedor, Culiacán MX, alta por PP04-MA).
- ✅ Pestaña Gasto: Fer Palacios → pill "Recibe pagos", "Alta por" = **histórico** (capturado_por null).
- ✅ Con perfil `operacion` (capturar=true, administrar=false): el botón "+Nuevo…" y "Editar" SÍ
  aparecen (antes habrían estado ocultos).
- ✅ Alta: checkbox "Recibe pagos" presente; al guardar, `fn_alta_contraparte` recibe
  `p_recibe_pagos:true` junto con el resto de campos intactos (sin regresión).
- ✅ Editar Crystal Valley: subtítulo muestra "· tiene movimientos registrados"; checkbox precargado
  en `false` (valor real del mock); al marcarlo y guardar, `fn_editar_contraparte` recibe
  `p_recibe_pagos:true` y el resto de parámetros (clase, alias, días, extendidos) sin cambios
  espurios.
- ✅ Con perfil de solo lectura (`puede_capturar:false`): ni "+Nuevo" ni "Editar" aparecen; mensaje
  "Solo lectura — necesitas permiso de captura".
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-catalogos.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E103 (2026-08-09) — Catálogos: Conceptos de costo y Cuentas (backend P2 D-129..D-132)
_2 pantallas de gestión nuevas, ambas dentro de Catálogos (`modulo-catalogos.js`), como 2 pestañas
más junto a Comercial/Operativo/Gasto/Socio/Productos — mismo patrón ya usado por Productos
(tabla + botón "+Nuevo" + panel de edición por fila, `ERP.abrirPanel`). No se creó una pantalla
aparte ni se duplicó en Tesorería: la navegación existente (pestañas dentro de un solo módulo) ya
resolvía "junto al Directorio, productos y variedades" de forma natural, y Cuentas es chica (2-3
filas de banco típicamente) — no justificaba una segunda copia en Tesorería. Decisión documentada
aquí por si Miguel prefiere después also verla ahí (sería un ítem de seguimiento, no bloqueante)._

**Conceptos de costo** — pestaña "Conceptos de costo", lee `v_conceptos_costo_admin` (activos
primero por `order=activo.desc,nombre.asc`, sin filtrar los inactivos — la lista los incluye
todos, como pidió la tarea). Tabla: Concepto | Estado (badge Activo/Inactivo) | Editar. "+ Nuevo
concepto" → `fn_alta_concepto_costo(p_nombre)`, muestra el rechazo del backend tal cual (vacío o
duplicado case-insensitive). Editar por fila → `fn_editar_concepto_costo(p_id, p_nombre, p_activo)`
con diff (NULL = no tocar; guard "no cambiaste ningún valor" si no hay diferencia). Sin borrado —
la leyenda explica que desactivar es la forma de retirar un concepto del selector de "+ Agregar
costo" (modulo-cargas.js) sin perder el historial ya capturado con él.

**Cuentas** — pestaña "Cuentas", lee `v_cuentas_admin` y separa en 2 secciones (`seccion-head`):
**Cuentas de banco** (editable) y **Cuentas virtuales — socios** (JEAMS, Samuel: solo lectura, con
la leyenda "se gestiona en backend"). Columnas: Id | Nombre | Banco | Moneda | Tipo (badge) | Saldo
(`usd()`) | Alta por (capturado_por, "histórico" si null). "+ Nueva cuenta de banco" →
`fn_alta_cuenta(p_id, p_nombre, p_banco, p_moneda, p_tipo:'banco')` — el tipo se manda SIEMPRE
`'banco'`, nunca se le pregunta al usuario (el backend rechaza cualquier otro tipo desde aquí, tal
como pide la tarea); ayuda visible de que el id se normaliza a mayúsculas en el backend. Editar
solo aparece en filas `tipo='banco'` → `fn_editar_cuenta(p_id, p_nombre, p_banco, p_moneda)` con
diff (el id se muestra fijo/no editable, el tipo nunca se manda — coincide con que el RPC no lo
acepta). El subtítulo del panel de edición agrega "tiene movimientos registrados" cuando
`tiene_movimientos=true` (mismo patrón informativo que ya se usó en Directorio Comercial, E102).

**Permisos** — ambas pantallas gatean alta/edición con `ERP.puede('capturar')` (igual que
contrapartes desde E102), consistente con lo que documenta la tarea para las 4 RPCs nuevas.
Productos/variedades no se tocaron: siguen en `administrar`.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js` y `modulo-catalogos.js`
REALES, solo la red stubbeada):**
- ✅ Pestañas "Conceptos de costo" (3) y "Cuentas" (3) aparecen con conteo correcto junto a las existentes.
- ✅ Conceptos: activos primero (Fletes, Aduanas, Concepto viejo-inactivo al final); alta manda
  `{p_nombre}`; editar (renombrar+desactivar) manda solo lo cambiado (`p_nombre:null` si no cambió).
- ✅ Cuentas: 2 secciones correctas (bancos JPM/CASH vs virtual JEAMS); saldo formateado
  (`$52,340.18`); CASH sin `capturado_por` → "histórico"; JEAMS (virtual) **sin botón Editar**.
- ✅ Alta de cuenta: `p_tipo:'banco'` siempre, sin importar que el usuario no lo vea ni lo elija.
- ✅ Editar JPM: Id de solo lectura, subtítulo "tiene movimientos registrados", solo se mandó
  `p_banco` (lo único que cambié) — `p_nombre`/`p_moneda` en `null`.
- ✅ Con perfil sin `puede_capturar`: ni "+Nuevo" ni "Editar" en ninguna de las 2 pantallas nuevas;
  mensaje "Solo lectura — necesitas permiso de captura".
- Sin CSS nueva: las 2 pantallas reusan 100% clases ya existentes y verificadas en claro/oscuro
  (`.pill`, `.pill.gris`, `.seccion-head`, `.tabla-wrap`, `.form-erp`, `.checks`, `.aviso`,
  `.btn-mini`, `.solo-lectura`, `.leyenda`, `.vacio`) — cero riesgo de romper tema u otras pantallas.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-catalogos.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E104 (2026-08-09) — Fix picker de Beneficiario en "Registrar gasto" (Tesorería)
_El panel vive en `modulo-tesoreria.js` (`formGasto`), NO en `captura-rapida.js` como asumía la
tarea — verificado en vivo por grep antes de programar; se corrigió donde realmente está._

**PASO 1 — diagnóstico.** La consulta era `q('v_catalogo_beneficiarios_gasto', '&clase=eq.gasto&order=nombre.asc')`
— el filtro `clase=eq.gasto` en la QUERY excluía a cualquier `clase='socio'`, así que Samuel/Juan
nunca podían aparecer aunque el backend ya los trae con `recibe_pagos=true` en esa misma vista. No
era otra vista ni faltaba una columna: era exactamente el filtro que pedía diagnosticar la tarea.

**PASO 2 — corregido.** Se quitó `&clase=eq.gasto` de la query: ahora se trae **toda** la vista
`v_catalogo_beneficiarios_gasto` (id, nombre, alias, clase, recibe_pagos) sin filtro de clase, y
todo el filtrado vive en el cliente (`beneficiariosParaTipo()`).

**PASO 3 — filtro contextual al Tipo de gasto**, con un listener `change` en `#gTipo` que llama
`comboBenef.actualizarItems(...)` (re-filtra sin recrear el combo ni recargar nada):
- `Sueldo` → solo `recibe_pagos === true`.
- `Viaticos` → `recibe_pagos === true` **o** `clase ∈ ('gasto','operativo')`.
- cualquier otro tipo (incluido el estado inicial sin tipo elegido) → `clase ∈ ('gasto','operativo')`.
- Orden: quien tiene `recibe_pagos=true` sube primero (aplicado siempre, no solo en Sueldo — en
  Viáticos es donde más se nota, con una lista mixta).

**PASO 4 — no bloquear el submit.** El combo tenía `permitirNuevo:false`, lo que en la práctica
significaba que un nombre escrito y NO seleccionado de la lista dejaba `valor()` en `null` — el
formulario SÍ bloqueaba ("Elige un beneficiario de la lista"), pese a que el comentario del código
sugería que el backend resolvía por nombre. Se cambió a `permitirNuevo:true` (mismo patrón ya
usado en cliente/proveedor/producto de "Nueva carga"), así que ahora si el nombre no está en la
lista aparece la opción "+ Nuevo beneficiario: …" y seleccionarla SÍ arma un valor válido para
`fn_capturar_mov`. Además, la leyenda bajo el campo (`#gBenefAyuda`) es dinámica: cambia según el
tipo elegido, y si lo escrito no coincide con nada de la lista filtrada agrega
"¿No aparece? Márcalo 'recibe pagos' en Directorio Comercial." — sin bloquear nada.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js` y `modulo-tesoreria.js`
REALES, solo la red stubbeada; mock con SAMUEL A IBARRA y JUAN E MERCADO clase='socio'
recibe_pagos=true, JOSE ARAMBULA clase='socio' recibe_pagos=false, y 3 beneficiarios de
gasto/operativo):**
- ✅ Sin tipo elegido: salen los 3 de gasto/operativo, ningún socio.
- ✅ Tipo **Sueldo**: salen SOLO Juan y Samuel (José, sin `recibe_pagos`, queda fuera).
- ✅ Tipo **Viaticos**: salen los 5 (Samuel/Juan primero por el orden `recibe_pagos`, luego los 3 de gasto/operativo).
- ✅ Tipo "cualquier otro" (usé `Paca`, una opción real del `<select>` — **nota:** el ejemplo de la
  tarea decía "tipo Aduanas", pero `Aduanas` no es un valor de `TIPOS_GASTO` en este formulario —
  es un concepto de costo de carga, formulario distinto; usé un tipo real equivalente): salen solo
  los 3 de gasto/operativo, sin Samuel/Juan.
- ✅ Cambiar el tipo re-filtra la lista en vivo, sin recargar el panel ni el módulo.
- ✅ Texto libre no listado ("Nuevo Empleado Sin Marcar") con tipo Sueldo: aparece el aviso "¿No
  aparece? Márcalo…", aparece la opción "+ Nuevo beneficiario", y al elegirla el formulario
  **completa el registro del gasto sin bloquear** (toast "Gasto registrado — $150.00 a Nuevo
  Empleado Sin Marcar").
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-tesoreria.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E105 (2026-08-09) — Fase 1 rediseño de captura: puerta única "+ Registrar" + Traspaso (Tesorería)
_Coordinado con backend (RPC `fn_traspaso` ya vivo, gate `capturar`). Cambio de UX: los 4 botones
sueltos que había en Tesorería se reemplazan por una sola puerta con intención explícita. Ninguna
de las 4 funciones existentes cambió — solo el punto de entrada — y se agrega Traspaso, nuevo._

**A) Puerta "+ Registrar" — `modulo-tesoreria.js`.**
- Los botones `+ Movimiento` / `+ Registrar gasto` / `+ Anticipo a productor` / `+ Aportación de
  socio` se quitaron de la barra de Tesorería; en su lugar hay **un solo botón "+ Registrar"**
  (mismo gate `ERP.puede('capturar')` de siempre).
- Abre un chooser (`abrirChooserRegistrar()`) con 5 tarjetas clicables, cada una con título +
  línea explicativa (ícono Tabler, sin emojis): **Cobro o pago de una carga** → `ERP.capturarMovimiento({})`
  · **Gasto de operación** → `formGasto()` (local) · **Anticipo a productor** →
  `ERP.capturarAnticipoProductor({})` · **Aportación de socio** → `ERP.capturarAportacionSocio({})`
  · **Traspaso entre cuentas** → `formTraspaso()` (nuevo, ver abajo). Elegir una opción reemplaza
  el contenido del mismo drawer con el panel real — no hay panel intermedio que cerrar.
- **Los accesos directos de Cobranza/CxC y Pagos/CxP NO se tocaron**: siguen llamando
  `ERP.capturarMovimiento({modo,contraparte})` directo desde sus propios botones "+ cobro"/"+
  pago" por fila, exactamente como antes (verificado por grep, cero cambios en esos 2 archivos).

**B) Panel nuevo "Traspaso entre cuentas" — `formTraspaso()`/`guardarTraspaso()`, mismo patrón de
drawer que `formGasto`.**
- Campos: Cuenta origen* / Cuenta destino* (ambas `crearCombo` sobre `v_catalogo_cuentas`, origen
  precargado a JPM si existe), Fecha* (`hoyISO()`), Monto USD* (>0), Nota (opcional).
- Validación en cliente: origen y destino no pueden ser la misma cuenta (bloquea sin llamar al
  RPC) — el backend también la rechaza, esto es solo para no gastar el viaje redondo obvio.
- Leyenda fija: "Mueve efectivo entre cuentas. No es gasto ni ingreso — no afecta el P&L. Si
  mueves a/desde una bolsa de socio (JEAMS/SAMUEL), ajusta la deuda con ese socio."
- Al guardar: `fn_traspaso({p_origen,p_destino,p_monto,p_fecha,p_nota})` → muestra **los 2 folios**
  (egreso en origen, ingreso en destino) en el aviso de éxito; `ERP.marcarDatosSucios()`.

**CSS nuevo (`estilos.css`):** `.chooser-registro`/`.chooser-opcion` — como vive en `#panelBody`
(fuera del scope `.pantalla-tesoreria` del rediseño "Operador estilo Silo"), usa los tokens
**viejos** (`--papel`/`--linea`/`--verde`/`--gris`), mismo criterio que `.form-erp`/`.zona-peligro`
ya usan ahí. Cero hex, cero tokens nuevos inventados, cero emojis (íconos Tabler).

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js` y `modulo-tesoreria.js`
REALES, solo la red y las 3 funciones de `captura-rapida.js` stubbeadas ya que ese archivo no se
tocó ni hacía falta cargarlo para probar el ENRUTAMIENTO):**
- ✅ Los 4 botones viejos ya no existen; solo aparece "+ Registrar".
- ✅ El chooser muestra las 5 opciones con el título/línea exactos pedidos.
- ✅ "Cobro o pago de una carga" → llama `ERP.capturarMovimiento({})`.
- ✅ "Anticipo a productor" → llama `ERP.capturarAnticipoProductor({})`.
- ✅ "Aportación de socio" → llama `ERP.capturarAportacionSocio({})`.
- ✅ "Gasto de operación" → abre el panel real de "Registrar gasto" (mismo `formGasto()` de siempre).
- ✅ "Traspaso entre cuentas" → abre el panel nuevo, origen precargado en JPM, leyenda correcta.
- ✅ Elegir la misma cuenta en origen y destino → bloquea en cliente, **no** llama al RPC.
- ✅ Flujo completo (JPM→JEAMS, $1,500.50): `fn_traspaso` recibe el payload exacto y el aviso de
  éxito muestra los 2 folios ("egreso 501 en JPM, ingreso 502 en JEAMS").
- ✅ Cobranza/CxC y Pagos/CxP: confirmado por grep que sus botones "+ cobro"/"+ pago" por fila
  siguen llamando `ERP.capturarMovimiento` sin cambios.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-tesoreria.js`. CSS: llaves balanceadas (1295/1295).

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E106 (2026-08-09) — Fase 2a: "Categoría de deducción" autoservible (backend D-134)
_Cierra el gap #1 detectado en el inventario de captura (`INVENTARIO-CAPTURA-CATALOGOS.md`,
sección 3): la categoría de deducción de Liquidaciones era una constante hardcoded de 7 valores
sin catálogo. Ahora tiene pantalla de gestión propia y el picker lee la vista en vivo._

**A) Nueva pestaña "Categorías de deducción" — `modulo-catalogos.js`.** Mismo patrón EXACTO que
"Conceptos de costo" (mismo archivo, mismo estilo de tabla/form/gate):
- Lista desde `v_categorias_deduccion_admin`: Nombre, Código (mono, gris), Estado (badge
  Activo/Inactivo), Alta por (`capturado_por` o "histórico"). Activas primero
  (`&order=activo.desc,orden.asc,nombre.asc`).
- "+ Nueva categoría": pide **solo el Nombre** — debajo del campo hay una vista previa en vivo del
  código que probablemente resultará (aproximación cliente: minúsculas, sin acentos, espacios→`_`,
  vía `ERP.norm()`), etiquetada claramente como estimado. Al guardar manda el mismo texto como
  `p_codigo` Y `p_nombre` a `fn_alta_categoria_deduccion` — el backend es quien normaliza y valida
  duplicados de verdad; el mensaje de rechazo se muestra tal cual.
- Editar por fila: renombrar + toggle Activo → `fn_editar_categoria_deduccion` (diff: NULL=no
  tocar; guard "no cambiaste ningún valor"). Sin borrado.
- Gate: `ERP.puede('capturar')`, igual que Conceptos/Cuentas/Directorio.

**B) Picker de "+ Agregar deducción" — `modulo-liquidaciones.js`.**
- `verLiquidacion()` ahora también pide `q('v_categorias_deduccion','&order=orden.asc')` (solo
  activas) en el mismo `Promise.all`, con `.catch(()=>[])` — si falla, el `<select>` degrada a un
  único `<option value="general">General</option>` en vez de quedar vacío.
- `cuerpoFicha()` recibió un 4º parámetro (`categoriasDed`) y arma el `<select id="dedCategoria">`
  con `value=codigo` / texto=`nombre` del catálogo, en vez de la constante `CATEGORIAS` (7 valores
  fijos) que se **eliminó** — confirmado por grep que no se usaba en ningún otro lado del archivo.
  `general` sigue preseleccionado por default, igual que antes.
- **`CAT_LABEL`/`catLabel()` se conservaron** (NO se tocaron): se usan para mostrar la categoría de
  una deducción ya capturada en la tabla de la ficha (`catLabel(d.categoria)`) — con la ventaja de
  que su fallback (`c || 'General'`) ya mostraba el código crudo para categorías fuera del mapa, así
  que categorías nuevas del catálogo (ej. `seguro_carga`) se siguen viendo bien aunque no tengan
  entrada en `CAT_LABEL`. La agrupación de PDF (CUSTOMS/DUTIES en secciones propias, todo lo demás
  cae en DEDUCTIONS) tampoco se tocó — usa comparación directa de string (`esCat()`), no la
  constante eliminada, así que categorías nuevas siguen cayendo correctamente en DEDUCTIONS.
- `p_categoria` al guardar sigue siendo el código elegido (o `'general'` si no se elige) — sin
  cambios en `agregarDeduccion()`.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`, `modulo-catalogos.js` y
`modulo-liquidaciones.js` REALES, solo la red stubbeada):**
- ✅ Pestaña "Categorías de deducción" aparece con conteo correcto; activos primero; código en
  mono; "histórico" para `capturado_por=null`.
- ✅ Alta: preview "seguro_carga" para "Seguro Carga"; RPC recibe `{p_codigo:'Seguro Carga',
  p_nombre:'Seguro Carga'}` (texto crudo, sin normalizar en cliente); aviso de éxito muestra el
  código real devuelto por el backend.
- ✅ Editar: precarga correcta (activo=false), diff correcto al reactivar (`p_nombre:null,
  p_activo:true`).
- ✅ **Integración end-to-end**: la categoría "Seguro Carga" recién creada en Catálogos aparece de
  inmediato en el `<select>` de "+ Agregar deducción" en Liquidaciones (vía la vista compartida
  `v_categorias_deduccion`), junto con "General" (preseleccionado) y "Flete".
- ✅ Guardar una deducción con la categoría nueva → `fn_agregar_deduccion_liquidacion` recibe
  `p_categoria:'seguro_carga'`.
- ✅ Una deducción histórica con categoría vieja (`'material'`, ya fuera del catálogo activo)
  se sigue mostrando como "Material" en la tabla — `catLabel()`/`CAT_LABEL` intactos.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-catalogos.js` y `modulo-liquidaciones.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E107 (2026-08-09) — Fase 2b: "Categorías de gasto" autoservibles (backend D-135)
_Cierra el gap #2 del inventario de captura (`TIPOS_GASTO`, 7 valores hardcoded en
`modulo-tesoreria.js`): ahora tiene pantalla de gestión propia y "Registrar gasto" lee la vista
en vivo. Mismo patrón que Fase 2a (Categorías de deducción, E106)._

**A) Nueva pestaña "Categorías de gasto" — `modulo-catalogos.js`.** A diferencia de
Conceptos/Deducciones, aquí **`tipo` es la llave** (texto, sin id numérico — lo confirma la vista
`v_categorias_gasto_admin`), y la RPC de edición **solo activa/desactiva** (no hay rename: "el
tipo es llave"). Por eso el patrón se simplificó respecto a Fase 2a:
- Lista desde `v_categorias_gasto_admin` (activas primero, `&order=activo.desc,tipo.asc`):
  **Tipo**, **Grupo** (badge "Operativo" / "Financiero" — ambar para financiero), **Estado**
  (badge Activo/Inactivo), **Usos** (cuántos movimientos ya lo usan).
- "+ Nueva categoría de gasto": Nombre + selector Tipo (Operativo=`gasto_operativo` por default /
  Financiero=`gasto_financiero`) → `fn_alta_categoria_gasto(p_nombre, p_grupo)`. El backend
  rechaza grupo fuera de esos 2 valores (nunca "estructural") y nombres duplicados — mensaje tal
  cual.
- **Sin panel de edición**: por fila hay un botón inline "Activar"/"Desactivar" (no hace falta un
  drawer completo para un solo booleano) → `fn_editar_categoria_gasto(p_tipo, p_activo)`. Si la
  categoría ya tiene `usos > 0` y se va a desactivar, se pide confirmación explicando que NO borra
  el historial, solo la retira del selector — cancelable, no bloquea.
- Gate: `ERP.puede('capturar')`, igual que el resto de P1/P2.

**B) "Registrar gasto" — `modulo-tesoreria.js` (`formGasto`).**
- La constante `TIPOS_GASTO` (7 valores fijos) se **eliminó por completo** — confirmado por grep
  que no se usaba en ningún otro archivo del repo, solo en este mismo (build del `<select>` y una
  validación de submit).
- `formGasto()` ahora también pide `q('v_categorias_gasto','&order=tipo.asc')` (solo activas) en
  el mismo `Promise.all` que beneficiarios/cuentas; si el catálogo viene vacío, lanza error y no
  deja abrir el form (mismo criterio que ya tenía "cuentas" — es un campo obligatorio, no hay
  default seguro al que degradar, a diferencia de la categoría de deducción que sí tenía
  'general').
- El `<select id="gTipo">` arma sus opciones desde ese catálogo (`value=tipo`, texto=`tipo`).
- La validación en `guardarGasto()` cambió de `TIPOS_GASTO.includes(tipo)` a solo `!tipo` — como
  el `<select>` únicamente puede contener valores que vinieron del catálogo, no hace falta
  revalidar contra una lista aparte.
- **El filtro contextual de beneficiario (`beneficiariosParaTipo`, E104) no se tocó**: Sueldo →
  `recibe_pagos`; Viaticos → `recibe_pagos` O clase∈(gasto,operativo); cualquier otro tipo
  (incluidas categorías nuevas del catálogo) → clase∈(gasto,operativo). Sigue funcionando igual
  porque solo depende del STRING del tipo elegido, no de dónde salió la lista de tipos.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`, `modulo-catalogos.js` y
`modulo-tesoreria.js` REALES, solo la red stubbeada):**
- ✅ Pestaña "Categorías de gasto": activas primero, badges Grupo/Estado correctos, columna Usos.
- ✅ Alta ("Renta de bodega", grupo Financiero) → `fn_alta_categoria_gasto({p_nombre:'Renta de
  bodega', p_grupo:'gasto_financiero'})`.
- ✅ Toggle Desactivar con `usos>0` ("Sueldo", 12 usos): cancelar el confirm → NO llama al RPC;
  aceptar → `fn_editar_categoria_gasto({p_tipo:'Sueldo', p_activo:false})`.
- ✅ **Integración end-to-end**: tras desactivar "Sueldo" y crear "Renta de bodega" en Catálogos,
  el `<select>` de "Registrar gasto" en Tesorería refleja ambos cambios de inmediato (Sueldo
  desaparece, Renta de bodega aparece) — sin recargar la página.
- ✅ Filtro contextual de beneficiario intacto: tipo Viaticos → Samuel (recibe_pagos) + proveedor
  de gasto; tipo Gastos Financieros ("cualquier otro") → solo el proveedor de gasto, sin Samuel.
- ✅ Guardar un gasto con la categoría nueva → `fn_capturar_mov` recibe `p_tipo:'Renta de bodega'`.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-catalogos.js` y `modulo-tesoreria.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E108 (2026-08-09) — Fase 2c: Editar en Productos/Variedades + gate alineado a 'capturar' (D-136/D-137)
_Cierra el último gap de permisos desalineado en Catálogos: productos/variedades eran las únicas
2 pestañas del módulo que seguían gateadas a `administrar` mientras el backend ya las movió a
`capturar` (decisión de Miguel: se gestionan igual que contrapartes/conceptos/cuentas/categorías).
También cierra el gap de "solo alta, nunca edición" en esas 2 pestañas._

**A) Editar producto.** Botón "Editar" nuevo por fila (`formEditarProducto`/`guardarEditarProducto`)
→ formulario con Nombre, Código de ítem y toggle Activo → `fn_editar_producto(p_id, p_nombre,
p_codigo_item, p_activo)` — diff (NULL=no tocar; `''` explícito si el código se vació a propósito;
guard "no cambiaste ningún valor"). El backend rechaza nombre o código duplicado — mensaje tal
cual. **Sin vista nueva**: `v_catalogo_productos` ya se leía con `select=*` (patrón fijo de
`q()` en `comun.js`), así que `codigo_item`/`activo` ya venían en cada fila aunque nadie los
usara antes — no hizo falta pedir nada aparte.

**B) Editar variedad.** Las variedades se mostraban como chips de solo lectura dentro de la fila
de su producto (sin ninguna interacción). Ahora, con permiso de captura, cada chip es un
`<button>` clicable (`formEditarVariedad`/`guardarEditarVariedad`) → Nombre + toggle Activo →
`fn_editar_variedad(p_id, p_nombre, p_activo)` — mismo patrón de diff. Sin permiso de captura, el
chip sigue siendo el `<span class="alias-chip solo-ver">` de siempre (sin regresión visual para
lectores). Reutiliza la clase `.alias-chip` ya existente — cero CSS nueva.

**Indicador visual de inactivo (extra, sin pedirlo explícito, pero natural al agregar el toggle):**
fila de producto atenuada (`color:var(--i2)`) + badge "Inactivo" cuando `p.activo === false`;
chip de variedad atenuado con el mismo color cuando `v.activo === false`. Ninguna columna/clase
CSS nueva — reusa el patrón de texto atenuado ya usado en el resto del archivo.

**C) Gate de permiso — `barra()` y `pintarProductos()`.** El único `ERP.puede('administrar')` que
quedaba en todo el módulo (variable `admin` en `barra()`, usada solo para decidir si mostrar
"+ Nuevo producto") se eliminó; ahora `puedeAlta = puedeCap` para las 7 pestañas por igual
(contrapartes, productos, conceptos, cuentas, deducciones, gastos). Mensaje de solo-lectura
unificado a "necesitas permiso de captura" (antes decía "el alta de productos es de
administrador"). Comentario de cabecera del archivo actualizado para reflejar que **todo** el
módulo es ahora `capturar` — no queda ninguna pestaña en `administrar`.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js` y `modulo-catalogos.js`
REALES, solo la red stubbeada; perfil de prueba = Samuel, rol `operacion`, `puede_capturar:true`
/ `puede_administrar:false` — el caso exacto que antes NO veía estos botones):**
- ✅ Con Samuel (sin `administrar`): "+ Nuevo producto", botón "Editar" por producto, y chips de
  variedad clicables — los 3 aparecen (antes de este cambio, ninguno habría aparecido).
- ✅ Editar producto: precarga nombre/código/activo reales; cambiar solo el código →
  `fn_editar_producto` recibe `{p_id:1, p_nombre:null, p_codigo_item:'MNG-02', p_activo:null}`.
- ✅ Rechazo de nombre duplicado: renombrar a un nombre ya usado por otro producto → el mensaje
  del backend ("Ya existe un producto con ese nombre.") se muestra tal cual, sin interpretarlo.
- ✅ Editar variedad (clic en el chip "Ataulfo tardio", inactiva): título muestra "Variedad —
  Producto"; precarga `activo=false`; reactivar → `fn_editar_variedad` recibe
  `{p_id:11, p_nombre:null, p_activo:true}`.
- ✅ Guard "sin cambios": guardar sin tocar nada → no llama al RPC, avisa en el form.
- ✅ Indicador visual: fila de "Papaya Maradol" (inactivo) y chip de "Ataulfo tardio" (inactiva)
  con `style="color:var(--i2)"` aplicado correctamente.
- ✅ Con perfil de solo lectura (`puede_capturar:false`): ni "+Nuevo" ni "Editar" ni chips
  clicables — los chips de variedad caen al `<span class="alias-chip solo-ver">` de siempre.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-catalogos.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E109 (2026-08-09) — Centralizar la constante de moneda (USD/MXN)
_Limpieza de duplicación detectada en el inventario de captura: la lista USD/MXN vivía repetida
literal en 3 archivos. Sin cambio de comportamiento — mismos valores, mismo orden, mismos labels._

**PASO 1 — diagnóstico.** `grep` por archivos con `USD` y `MXN` a la vez → exactamente 3:
`modulo-ventas.js` (`#soMoneda`, "Nueva orden de venta"), `modulo-comercial.js` (`#cMoneda`,
Cotización/Orden de compra — motor genérico `TIPOS`), `modulo-ordenes.js` (`#ocMoneda`, "Nueva
orden de compra"). Los 3 tenían el **mismo literal exacto**, carácter por carácter:
`<select id="X"><option value="USD">USD</option><option value="MXN">MXN</option></select>`
— solo cambiaba el `id` del `<select>`. No era un array JS repetido, era HTML inline duplicado.
(Los usos sueltos de `'USD'` como valor default de fallback, ej. `moneda || 'USD'` al mostrar una
orden ya guardada, NO son parte de esta lista — son un valor por default distinto, se dejaron
intactos a propósito.)

**PASO 2 — centralización.** Nueva constante `MONEDAS = ['USD', 'MXN']` en `comun.js`, junto a los
demás helpers de Formato (`num`/`fmt`/`usd`), expuesta como `ERP.MONEDAS`. Los 3 archivos ahora
arman su `<select>` con `${MONEDAS.map(m => \`<option value="${m}">${m}</option>\`).join('')}` en
vez del HTML literal — agregar o quitar una moneda a futuro es un cambio en un solo lugar que se
propaga a los 3 puntos de captura automáticamente.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`, `modulo-ventas.js`,
`modulo-comercial.js` y `modulo-ordenes.js` REALES, solo la red stubbeada):**
- ✅ `ERP.MONEDAS` expuesto correctamente (`["USD","MXN"]`).
- ✅ "Nueva orden de venta" (`#soMoneda`): 2 opciones, USD/MXN, mismo texto/value de siempre.
- ✅ "Nueva cotización" (`#cMoneda`, modulo-comercial.js): idéntico.
- ✅ "Nueva orden de compra" (`#ocMoneda`): idéntico.
- Sin regresión de comportamiento visible: mismas 2 opciones, mismo orden, USD sigue siendo la
  primera (default del navegador al abrir el form, igual que antes).
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `comun.js`, `modulo-ventas.js`, `modulo-comercial.js`, `modulo-ordenes.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

---
## E110 (2026-08-09) — Tema 1: "Aplicar a carga" filtra por ID contra v_carga_contrapartes (D-138)
_Backend cerró el Tema 1 (D-138): vista nueva `v_carga_contrapartes` (folio_carga, contraparte_id,
contraparte_nombre, rol['cliente'|'proveedor'|'costo']), una fila por combinación carga↔
contraparte↔rol — cubre lo que `v_carga_detalle` (solo encabezado `cliente_id`/`proveedor_id`) se
perdía: proveedores de **servicio** (flete, comisión, reempaque) que solo viven en
`carga_costos.contraparte_id`, nunca en el encabezado de la carga._

**El bug (antes de este fix):** el selector de "Aplicar a carga" (dentro de "Editar movimiento",
Tesorería) filtraba comparando **por nombre** (`norm(mov.contraparte) === norm(c.cliente/c.proveedor)`)
contra `v_carga_detalle`. Un pago a un proveedor de servicio (ej. **SUAREZ BROKERAGE**, que cobra
flete en P-076 pero nunca aparece como `cliente`/`proveedor` de esa carga) nunca coincidía con
nada — el combo se quedaba vacío o cafa al "sin cargas de X — mostrando todas", obligando a
buscar la carga a mano entre TODAS las cargas del catálogo.

**El fix (`modulo-tesoreria.js`, `editarMovimiento()`):**
- Se agregó `v_carga_contrapartes` al mismo `Promise.all()` de siempre (junto a `cargasCat`),
  pedida filtrada por `contraparte_id` cuando `mov.contraparte_id` existe
  (`&contraparte_id=eq.N`) — si el movimiento no tiene contraparte ligada, **ni se hace el fetch**
  (se resuelve con `Promise.resolve([])`, sin gastar el viaje redondo), cayendo directo al mismo
  fallback de "mostrar todas" de siempre.
- `cargasFiltradas` cambió de comparar NOMBRE contra el encabezado a armar un `Set` de
  `folio_carga` desde `v_carga_contrapartes` (sin importar el rol — cliente, proveedor de
  producto o proveedor de servicio, los 3 cuentan) y filtrar `cargasCat` contra ese set por
  **ID**, no por nombre.
- El checkbox "Ver todas las cargas" y el resto de `formAplicarHtml()` **no se tocaron** — sigue
  exactamente la misma UI/UX, solo cambió de dónde sale el filtro inicial.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js` y `modulo-tesoreria.js`
REALES, solo la red stubbeada; mock con SUAREZ BROKERAGE como proveedor de SERVICIO en P-076,
rol='costo', ausente del encabezado de esa carga):**
- ✅ **Caso clave**: editar un movimiento con contraparte SUAREZ BROKERAGE → el combo de "Aplicar
  a carga" muestra **P-076 directo**, sin marcar "Ver todas" (antes habría salido vacío/con el
  aviso de "sin cargas de X"). Confirmado que sí se pidió `v_carga_contrapartes` filtrada por
  `contraparte_id=eq.50`.
- ✅ **Sin regresión**: un pago a un proveedor normal de encabezado sigue filtrando exactamente
  igual que antes (solo su carga, sin las de otros).
- ✅ **Fallback sin contraparte_id**: un movimiento sin contraparte ligada NO dispara el fetch de
  `v_carga_contrapartes` y cae directo a mostrar todas las cargas, igual que siempre.
- ✅ El checkbox manual "Ver todas las cargas" sigue alternando correctamente entre el catálogo
  filtrado y el completo.
- Harness temporal creado y **borrado** al terminar; no queda basura en el repo.

**node --check:** ✅ limpio en `modulo-tesoreria.js`.

**Cómo probar (para Miguel, después de `npx vercel --prod`):** Tesorería → clic en un movimiento
con contraparte "Las Brisas Produce" o "SUAREZ BROKERAGE" → Editar → bajar a "Aplicar a carga" →
debe mostrar P-076 directo, sin necesitar "Ver todas". Confirmar que un pago a un proveedor común
se sigue filtrando igual que siempre.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

## E111 (2026-08-12) — Pantalla nueva "Operaciones (OP)": lectura del hilo conductor (backend D-140..D-146)
_Backend construyó el modelo-OP (hilo conductor `OP-XXXX` — ver `ARQUITECTURA-OPERACION.md`) y
4 vistas nuevas de solo lectura, legibles por `authenticated`: `v_operacion` (1 fila por OP,
encabezado completo), `v_operacion_resumen` (folio_op/carga/po/modalidad/cliente/estado_carga/
ingreso_venta/costo_total/margen_bruto), `v_operacion_costos` (detalle por línea con
`contraparte_real` vs `proveedor_encabezado` y `sin_contraparte`), `v_operacion_cxp` (costo por
contraparte real). Tarea SOLO FRONTEND: pantalla de lectura nueva, sin mutaciones, sin tocar
backend, sin escribir SQL._

**Archivo nuevo `modulo-operaciones.js`** — módulo `operaciones` registrado con `ERP.registrar`:
- **Lista maestra**: un solo fetch de `v_operacion_resumen` (sin refetch por filtro), pintado
  como **tarjetas** (reusa la gramática `.group`/`.ghead`/`.gtag`/`.gsub`/`.kv-row`/`.kv` que ya
  vistió Embarques en E99 — "reusar el componente que ya cumple el rol", SISTEMA-DISENO.md §12),
  una tarjeta por OP en vez de tabla plana, SIN `.glotes` anidado porque aquí una tarjeta = una
  operación (no un grupo de varias). Cada tarjeta: folio_op, carga/PO/cliente como subtítulo,
  pill de modalidad (mismo contrato que `pillModalidad()` de `modulo-cargas.js`: margen=verde,
  consignación=verde, comisión=ámbar — nunca rojo), e Ingreso/Costo/Margen como KPIs inline.
  Filtro por modalidad (chips Todas/Margen/Consignación/Comisión, sin refetch, toggle de
  `.activo` sin re-render de los chips — mismo patrón que `pintarFiltros()` en `modulo-cargas.js`)
  + buscador client-side (folio_op/carga/po/cliente, `ERP.norm` acento-insensible, debounce
  150ms). Tira de KPIs arriba (Operaciones/Ingreso/Costo/Margen%) — el % excluye del promedio las
  OPs con `margen_bruto` NULL (consignación sin liquidar), para no mezclar peras con manzanas.
- **Margen en consignación**: `margen_bruto` llega `NULL` mientras no se liquida (el ingreso se
  reconoce al cobro, no al embarque — D-04) → se pinta **"— al liquidar"**, NUNCA `$0.00`
  (verificado explícitamente, ver Pruebas abajo).
- **Detalle (drawer, `verOperacion(folioOp)`)**: encabezado desde `v_operacion` en un
  `.det-grid` (mismo componente legacy que usa la ficha de carga en `modulo-cargas.js` —
  drawers viven FUERA del scope `.pantalla-operaciones`, con los tokens legacy de siempre) +
  tabla de costos desde `v_operacion_costos`, resaltando con fondo ámbar y un `<span class="pill
  ambar">fantasma</span>` cada línea donde `contraparte_real` (comparado con `ERP.norm`,
  insensible a acentos/mayúsculas) es DISTINTO del `proveedor_encabezado` — el caso real es un
  proveedor de SERVICIO (flete/comisión/reempaque) que cobra la línea aunque el encabezado
  muestre otro nombre. Las líneas con `sin_contraparte=true` se marcan **"(interno /
  pendiente)"** y NUNCA se cuentan como fantasma (son un caso aparte: no hay contraparte
  capturada todavía, no es que sea distinta). Debajo, resumen de `v_operacion_cxp` (costo real
  agrupado por contraparte, con fila `total`).
- **Navegación**: nuevo ítem "Operaciones (OP)" al inicio del grupo "Operación" en `index.html`
  (antes de "Embarques" — es el hilo que los une a todos), `<script src="modulo-operaciones.js">`
  cargado junto a `modulo-cargas.js`.
- **CSS nuevo**: bloque `.pantalla-operaciones` en `estilos.css` (mismo patrón SCOPE que los
  demás — kpistrip/filtros/chip/busca/group/ghead/kv-row/kv/pill, todo con tokens de
  `tokens.css`, cero hex nuevo).

**⚠️ Hueco real encontrado — requiere backend, NO se puede cerrar desde este chat:** el menú
dinámico (`app.js` → `aplicarMenuDinamico()`, D-105) oculta cualquier ítem cuya clave no esté en
`ERP.perfil.modulos` (backend, tabla `modulos_erp` + `rol_modulos`/`usuario_modulos`). La clave
`'operaciones'` es NUEVA y **no existe todavía en ese catálogo** — el ítem de menú quedará oculto
para TODOS los usuarios (incluido Miguel) aun después de desplegar, hasta que el chat de backend
dé de alta `'operaciones'` en `modulos_erp` y lo conceda al menos al rol admin/operación. Pasado
a `PENDIENTES-BACKEND.md`.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js` y `modulo-operaciones.js`
REALES, con `tokens.css`/`estilos.css` reales cargados; solo la red — `fetch`/`supabase.createClient`
— stubbeada con 85 OPs sintéticas y el caso testigo OP-0011 descrito en la tarea):**
- ✅ **La lista trae 85 OPs** (`"85 de 85 operaciones"`, tira de KPIs con la suma correcta).
- ✅ **Filtro Consignación**: 30 OPs, las "sin liquidar" muestran `Margen = "— al liquidar"` —
  nunca `$0.00` (el `$0.00` que sí aparece es el de `Ingreso`, correcto: D-04, ingreso_venta=0
  mientras no se liquida).
- ✅ **OP-0011 (caso testigo)**: encabezado muestra Proveedor=AGROFEPAC S.A., pero las 4 líneas de
  costo (Flete/Comisión/Reempaque/Refrigeración) están coloreadas ámbar con el tag `fantasma`,
  cada una con su contraparte real (Las Brisas Transport/BBA Brokerage/Suarez Brokerage/
  Agricooling LLC) — distinta del encabezado. La línea "Materia prima" (`sin_contraparte=true`)
  se muestra "(interno / pendiente)", SIN el tag fantasma. El resumen CxP desglosa el mismo costo
  por las 4 contrapartes reales + total.
- ✅ **Comisión (caso Alpine-like)**: costo `$0.00`, margen = ingreso completo (100%), pill ámbar
  "Comisión" con el tooltip de siempre — correcto por diseño, nunca se marca como error.
- ✅ **Regresión**: una OP normal (proveedor de línea = proveedor de encabezado) NO muestra
  ningún tag fantasma.
- ✅ **Buscador**: "OP-0011" aísla exactamente esa tarjeta entre las 85.
- ✅ Visual claro/oscuro: la lista (`.pantalla-operaciones`, tokens nuevos) se adapta
  correctamente a `data-theme="dark"`. El drawer de detalle usa tokens legacy sin variante
  oscura — **mismo comportamiento que TODOS los demás drawers de la app hoy** (Embarques,
  Cobranza, etc.), no es una regresión de esta pantalla; sigue siendo el pendiente menor ya
  anotado en SISTEMA-DISENO.md, no se amplía su alcance en esta tarea.
- Harness temporal creado y **borrado** al terminar; servidor local detenido; no queda basura
  en el repo.

**node --check:** ✅ limpio en `modulo-operaciones.js`.

**Cómo probar (para Miguel, después de que backend dé de alta `'operaciones'` en `modulos_erp` Y
de `npx vercel --prod`):** menú lateral → grupo Operación → "Operaciones (OP)" (primer ítem) →
debe traer 85 tarjetas, chips de modalidad arriba, buscador. Tocar cualquiera abre el detalle;
para ver el caso "fantasma" en producción, buscar una OP cuya carga tenga un proveedor de
servicio (flete/comisión/reempaque) distinto del proveedor/cliente del encabezado.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

## E112 (2026-08-12) — Fix: "VENTA (SO)" mostraba "$NaN" en el drawer de Operaciones (OP)
_`venta_so` de `v_operacion` es un **folio de texto** (ej. `SO-0003`, o `null` si la OP no tiene
venta declarada) — `modulo-operaciones.js` lo pasaba por `usd()` (formateador de moneda), que
con un string no numérico devolvía "$NaN"._

**Fix (`modulo-operaciones.js`, `verOperacion()`):**
- `Venta (SO)` ahora se pinta como texto plano con `esc()` (el folio tal cual), no con `usd()`.
- `null`/vacío → `"—"`, nunca `"$NaN"` ni `"$0.00"`.

**Opcional (aplicado, trivial):** la tarjeta "Margen" de la tira de KPIs es el margen sobre
operaciones **reconocidas** (excluye consignación sin liquidar, `margen_bruto` NULL) — no
coincide con "(Ingreso−Costo)/Ingreso" de todas las tarjetas visibles. Se renombró a **"Margen
(reconocido)"** + `title` explicando la exclusión, para que no se preste a una resta a mano mal
comparada.

**Verificación EN VIVO (harness local + Chrome DevTools MCP, `comun.js`/`modulo-operaciones.js`
reales, red stubbeada):** OP-0011 (`venta_so='SO-0003'`) → drawer muestra `"SO-0003"`. OP-0085
(`venta_so=null`) → drawer muestra `"—"`. Ningún `$NaN` en pantalla. Tira de KPIs: etiqueta
"Margen (reconocido)" + tooltip presentes. Harness borrado, servidor detenido al terminar.

**node --check:** ✅ limpio en `modulo-operaciones.js`.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

## E113 (2026-08-12) — Slice 1 del rediseño OP: "+ Nueva operación" (crea OP + primera venta, backend D-147..D-149)
_Backend cerró Fase 3a/3b del rediseño OP: `fn_abrir_operacion(p_proyecto_id, p_nota)` (reserva
folio OP-XXXX, `seq_operaciones_num` arranca en 86) y `fn_op_agregar_venta(p_folio_op, ...)`
(cuelga una venta de la OP reusando los parámetros de `fn_crear_so` + setea `operacion_id`).
Tarea: la puerta de captura — botón "+ Nueva operación" en la pantalla Operaciones (OP)._

**`modulo-operaciones.js` — nueva sección "Nueva operación (Slice 1)":**
- Botón **"+ Nueva operación"** (negro, `var(--btn)` = `#14231A`, ícono `ti-plus`) en la barra
  de filtros de la pantalla, gateado por `ERP.puede('capturar')` — mismo patrón que "+ Nuevo
  embarque" en `modulo-cargas.js`.
- Abre el drawer compartido (`ERP.abrirPanel`) con un `.form-erp` (mismos componentes legacy que
  usa el resto de la app en drawers de captura — Registrar traspaso, Registrar gasto, Crear
  embarque): Cliente\* (combo de `v_directorio_contrapartes` filtrado `es_cliente=true`, SIN
  "+ Nuevo" — este slice no da de alta clientes, eso es Directorio Comercial), Modalidad\*
  (`<select>` con las 4 modalidades fijas: Comisión pura=1, Margen fijo=2, Consignación=3, Buy &
  Resell=4), PO del cliente, Días de crédito, Incoterm (texto libre — no hay fuente de datos
  para un catálogo, no se inventó una lista), Proyecto (opcional, `<select>` de
  `proyectos_productor`), Nota.
- **Campos de precio/comisión dinámicos por modalidad** (`CAMPOS_MODALIDAD`/`MODALIDADES_OP`):
  cambiar el `<select>` de Modalidad muestra/oculta Comisión por caja + Cuota fija (modalidad 1),
  Precio de compra + Precio de venta por caja (modalidad 2 y 4), % de comisión (modalidad 3). Al
  guardar, **solo se leen del DOM los campos de la modalidad activa** — los demás viajan `null`
  aunque el usuario haya escrito algo antes de cambiar de modalidad (evita mandar un precio
  "fantasma" de una modalidad que ya no aplica).
- Producto y cajas **NO se capturan aquí** (por diseño — viven en compra/embarque, Slice 2/3, por
  herencia sin recaptura) — nota fija en el formulario para que no se busquen esos campos.
- **Encadenado no-atómico, con protección contra duplicados**: `guardarNuevaOperacion()` llama
  `fn_abrir_operacion` y guarda el `folio_op` devuelto en una variable de módulo
  (`opEnProgreso.folioOp`) ANTES de intentar `fn_op_agregar_venta`. Si la venta falla, el aviso
  dice explícitamente que la OP ya existe y por qué falló la venta (mensaje del RAISE del
  backend, tal cual, sin traducir), el botón cambia a **"Reintentar venta"**, y un reintento
  **reusa el mismo `folio_op`** — nunca vuelve a llamar `fn_abrir_operacion` (no crea una segunda
  OP huérfana por reintentar). Si el usuario intenta cerrar el drawer con una OP creada pero sin
  venta, se le avisa con un `confirm()` antes de dejarlo cerrar.
- Éxito: `ERP.marcarDatosSucios()` + `ERP.toast('ok', 'Operación <OP-XXXX> creada con venta
  <SO-XXXX>.')` + `ERP.cerrarPanel()` — cerrar el panel re-ejecuta `despachar()` (la lista de
  Operaciones se re-lee de `v_operacion_resumen`, mismo mecanismo que usa toda la app).
- **CSS**: `.btn-mini` remapeado dentro del scope `.pantalla-operaciones` (no existía todavía —
  el botón de la lista vive en el scope nuevo; el botón "Crear operación" dentro del drawer usa
  el `.btn-mini` legacy sin scope, igual que TODOS los demás formularios de captura de la app).

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`/`modulo-operaciones.js`
reales; se mockeó `sb.rpc`/`sb.from('v_mi_perfil')`/`fetch` — no se tocó backend real):**
- ✅ El botón "+ Nueva operación" aparece (perfil mock con `puede_capturar=true`).
- ✅ Al abrir, modalidad por defecto (Comisión pura) muestra Comisión por caja + Cuota fija;
  cambiar a Margen fijo oculta esos 2 y muestra Precio de compra + Precio de venta.
- ✅ **Camino feliz**: cliente elegido por el combo (id real, no texto), modalidad Margen fijo,
  precios capturados → `fn_abrir_operacion({p_proyecto_id:null, p_nota:null})` seguido de
  `fn_op_agregar_venta({..., p_cliente_id:501, p_revenue_model_id:2, p_precio_compra_caja:5,
  p_precio_venta_caja:8.5, p_comision_por_caja:null, p_pct_comision:null,
  p_cuota_fija_embarque:null, ...})` — confirmado que los campos de las OTRAS modalidades viajan
  `null`. Toast `"Operación OP-0086 creada con venta SO-0086."`, drawer se cierra.
- ✅ **Falla parcial**: `fn_abrir_operacion` ok, `fn_op_agregar_venta` rechaza (RAISE simulado) →
  aviso inline muestra el mensaje del backend tal cual + "la operación ya se creó", botón pasa a
  "Reintentar venta", el drawer **sigue abierto**.
- ✅ **Reintento**: al corregir y volver a guardar, `fn_abrir_operacion` **NO se vuelve a llamar**
  (mismo `folio_op` reusado) — solo `fn_op_agregar_venta` se reintenta. Éxito → toast + cierre.
- ✅ **Cancelar con OP huérfana**: cerrar el drawer tras una falla parcial dispara un `confirm()`
  de advertencia; "Cancelar" (dismiss) deja el drawer abierto, "Aceptar" lo cierra.
- ✅ Visual: botón "+ Nueva operación" negro (`#14231A`) en la lista; formulario dentro del
  drawer con la gramática `.form-erp` habitual (mismo aspecto que Registrar traspaso/gasto).
- Harness temporal creado y **borrado** al terminar; servidor local detenido.

**node --check:** ✅ limpio en `modulo-operaciones.js`. `estilos.css`: llaves balanceadas.

**Cómo probar (para Miguel, después de `npx vercel --prod`):**
1. Operaciones (OP) → botón negro "+ Nueva operación" (arriba a la derecha de los chips).
2. Cliente (ej. "Crystal Fresh") + Modalidad **Margen fijo** → aparecen Precio de compra/venta
   por caja → llénalos → "Crear operación".
3. Debe salir un toast verde: "Operación OP-XXXX creada con venta SO-XXXX." y el drawer se cierra.
4. La OP nueva debe aparecer en la lista (folio OP-0086 en adelante).
5. Repite eligiendo Modalidad **Comisión pura** — el formulario debe mostrar Comisión por
   caja/Cuota fija en vez de precios de compra/venta, confirmando que el form cambia con la
   modalidad.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`). Slices 2 ("Agregar compra") y 3
("Registrar embarque") llegan en tareas posteriores — no se tocó nada de esas fases aquí.

## E114 (2026-08-12) — Slice 2 del rediseño OP: "Agregar compra" (backend D-150)
_PASO 0 de esta sesión: se corrigió una desincronización de docs — el backend ya había cerrado
Fase 3c (D-150, `fn_op_agregar_compra`) y Fase 3d (D-151, `fn_op_agregar_embarque`, cierra Fase 3
completa) pero `BITACORA-DECISIONES.md`/`PENDIENTES-BACKEND.md`/`NORTE.md` seguían diciendo
"pendiente". Se registraron D-150/D-151 en la bitácora (sesión E114 de BITACORA), se marcaron
✅ backend en `PENDIENTES-BACKEND.md`/`NORTE.md` (dejando claro que lo único ⬜ es el FRONTEND:
Slice 2 y 3), y se refrescaron las anclas donde este chat las había dejado viejas. Detalle
completo en esas 3 páginas — no se repite aquí._

**`modulo-operaciones.js` — nueva sección "Agregar compra" (Slice 2, D-150):**
- Botón **"Agregar compra"** en el detalle de una OP (`verOperacion()`, drawer), gateado por
  `ERP.puede('capturar')`, arriba de "Costos por línea".
- Editor de líneas **reusado tal cual** del patrón ya probado en `modulo-ordenes.js`
  (`nuevaOrden()`/`montarLineas()`/`itemsPayload()` — mismos nombres de campo, misma tabla
  `.fact-lineas`, mismo botón "+ Línea" y "✕" para quitar): cada línea es Producto (combo del
  catálogo `v_catalogo_productos`) O Descripción libre, + Cantidad/Unidad/Precio unitario,
  Importe calculado en vivo, Total = Σ(cantidad×precio) recalculado en cada tecla. No se
  reinventó el componente — SISTEMA-DISENO.md §12 ("reusar el que ya cumple el rol").
- Form: Proveedor\* (combo de `v_directorio_contrapartes` filtrado `es_proveedor=true` +
  `clase='comercial'` — mismo filtro exacto que ya usa `modulo-ordenes.js`), Número oficial de
  OC del proveedor, Moneda (`ERP.MONEDAS`), Fecha de entrega estimada, Condiciones, Notas — todos
  opcionales salvo Proveedor y ≥1 línea con producto o descripción.
- Al guardar: `fn_op_agregar_compra({p_folio_op, p_proveedor_id, p_items, p_numero_proveedor,
  p_moneda, p_f_entrega_est, p_condiciones, p_notas, p_carga_folio:null})`. Éxito → toast "Compra
  <OC-XXXX> agregada a <OP-XXXX>" + refresca el detalle de la OP (vuelve a `verOperacion()`, que
  releva `v_operacion`/`v_operacion_costos`/`v_operacion_cxp`) + `ERP.marcarDatosSucios()`
  (refresca también la lista de fondo). Si la RPC hace RAISE, el mensaje se muestra tal cual, sin
  traducir, y el formulario **queda abierto** para corregir.
- **Comisión pura:** no se implementó el `confirm()` suave opcional (nice-to-have de la tarea) —
  el backend YA decide permitir la compra igual y solo emite un `RAISE NOTICE` que
  `supabase-js` no expone; replicarlo habría requerido leer `sales_orders` directo (tabla base,
  no vista) solo para una advertencia cosmética no bloqueante. Se dejó fuera por prudencia (regla
  de la casa: frontend lee vistas/RPCs, no tablas base, salvo necesidad real) — la decisión de
  negocio ya vive 100% en el backend, que es la autoridad.
- **Nota honesta para la verificación de Miguel:** `v_operacion_costos`/`v_operacion_cxp` se
  arman de `carga_costos` (documentado en D-143..146) — una compra (OC) recién agregada puede
  **no verse todavía** en esas tablas del detalle hasta que exista un embarque (Slice 3) que la
  herede. El toast y el folio OC-XXXX SÍ confirman que la compra se creó; si Miguel espera verla
  reflejada en el desglose de costos y no aparece, es comportamiento esperado del modelo, no un
  bug de esta pantalla — a confirmar visualmente con él antes de dar el slice por cerrado del
  todo.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`/`modulo-operaciones.js`
reales; se mockeó `sb.rpc`/`sb.from('v_mi_perfil')`/`fetch`):**
- ✅ Botón "Agregar compra" visible en el detalle de OP-0011 (perfil mock `puede_capturar=true`).
- ✅ **Camino feliz**: proveedor elegido por combo (id real 601), 2 líneas de producto (JACK
  FRUIT 10×$5, KABOCHA 4×$8) + 1 de descripción libre ("Flete refrigerado" 2×$15) → Total en vivo
  `$112.00` (50+32+30) → `fn_op_agregar_compra` recibe el payload exacto (3 líneas bien formadas,
  `p_carga_folio:null`, número de OC del proveedor y condiciones capturados) → toast "Compra
  OC-0006 agregada a OP-0011." → drawer vuelve a mostrar el detalle de OP-0011 (no se cierra).
- ✅ **Validación sin proveedor**: "Elige un proveedor comercial de la lista."
- ✅ **Validación sin líneas** (proveedor elegido, única línea vacía): "Agrega al menos una línea
  (producto o descripción)."
- ✅ **Falla del backend (RAISE simulado)**: mensaje mostrado tal cual (`PROVEEDOR_NO_COMERCIAL:
  ...`), formulario sigue abierto para corregir.
- ✅ **Quitar línea**: el botón "✕" por fila reduce las líneas correctamente (nunca deja el
  editor en cero filas — repone una vacía si se queda sin ninguna, igual que en
  `modulo-ordenes.js`).
- ✅ Visual: formulario con la gramática `.form-erp`/`.fact-lineas` habitual, botón "Agregar
  compra" verde legacy (drawer, fuera del scope de tokens nuevos — igual que todos los demás
  formularios de captura).
- Harness temporal creado y **borrado** al terminar; servidor local detenido.

**node --check:** ✅ limpio en `modulo-operaciones.js`.

**Cómo probar (para Miguel, después de `npx vercel --prod`):**
1. Operaciones (OP) → abre cualquier OP → botón "Agregar compra".
2. Elige un proveedor comercial, agrega 2 líneas de producto del catálogo (cantidad y precio) +
   1 línea con descripción libre (sin producto) — confirma que el Total se actualiza en vivo.
3. Guarda → debe salir un toast verde "Compra OC-XXXX agregada a OP-XXXX." y el detalle de la OP
   se vuelve a mostrar (sin cerrar el panel).
4. Repite eligiendo un proveedor que NO sea comercial (si existe alguno en el catálogo) para
   confirmar que el backend lo rechaza con un mensaje claro.
5. Revisa si la compra recién agregada aparece reflejada en "Costos por línea"/CxP del detalle de
   la OP — si NO aparece todavía, es esperado (ver nota arriba), avísame para documentarlo.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`). Slice 3 ("Registrar embarque", D-151,
la de más cuidado — toca costos) queda para una tarea posterior, no se tocó aquí.

## E115 (2026-08-12) — Slice 2.1: sección "Compras (OC)" en el detalle de la OP (backend D-152)
_Cierra la nota abierta de E114: la compra que agrega el Slice 2 ("Agregar compra") no se veía
en ningún lado del detalle de la OP porque `v_operacion_costos`/`v_operacion_cxp` se arman de
`carga_costos`, que nace en el embarque (Slice 3), no en la compra. El backend creó una vista de
lectura nueva y dedicada, `v_operacion_compras` (D-152), para exponer las OCs colgadas de una OP
directamente — sin esperar a que exista un embarque._

**`modulo-operaciones.js` — `verOperacion()`:**
- Se agregó `q('v_operacion_compras', '&folio_op=eq.<OP>&order=oc_folio.asc')` al mismo
  `Promise.all()` de siempre (junto a `v_operacion`/`v_operacion_costos`/`v_operacion_cxp`) —
  un solo viaje redondo adicional, no un fetch aparte.
- Nueva sección **"Compras (OC)"** en el hilo del detalle, en el orden correcto: encabezado →
  botón "Agregar compra" → **Compras (OC)** → Costos por línea (embarque) → CxP. Tabla
  `.fact-lineas` (misma gramática que el resto del detalle): OC, Proveedor, Núm. oficial
  (`numero_proveedor` o "—"), Moneda, Total, Estado (pill gris), Ítems (`n_items`), Entrega
  estimada (`f_entrega_est` o "—", formateada con `ERP.fecha`).
- Sin compras: `<div class="vacio">Sin compras registradas todavía.</div>` — mismo componente
  "vacío" que ya usan "Costos por línea"/CxP cuando no hay datos, no se inventó uno nuevo.
- El refresh que ya hacía `guardarCompra()` (vuelve a llamar `verOperacion(folioOp)` tras un
  alta exitosa) automáticamente trae la OC nueva en esta sección — no hizo falta tocar
  `guardarCompra()`, el fetch adicional ya viaja en cada `verOperacion()`.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`/`modulo-operaciones.js`
reales; se mockeó `sb.rpc`/`fetch`, incluida una versión del mock que agrega la OC recién creada
a la respuesta de `v_operacion_compras` para simular el refetch real):**
- ✅ **Orden de secciones**: `["Compras (OC)", "Costos por línea", "Costo por contraparte real (CxP)"]` — Compras va justo después del botón de acción, antes de Costos.
- ✅ **OP con compra existente** (OC-0003, LAS BRISAS FARMS, PROV-99, USD, $1,250.00, Borrador,
  2 ítems, 20 ago 26): fila pintada con todos los campos correctos.
- ✅ **OP sin compras**: muestra "Sin compras registradas todavía." (clase `.vacio`).
- ✅ **Agregar una compra y verla aparecer sin recargar manualmente**: tras guardar en el form de
  "Agregar compra", el drawer vuelve a `verOperacion()` y la OC nueva (OC-0007, $60.00, 1 ítem)
  aparece de inmediato en la sección "Compras (OC)" — confirmado que NO hace falta cerrar y
  reabrir el panel.
- Harness temporal creado y **borrado** al terminar; servidor local detenido.

**node --check:** ✅ limpio en `modulo-operaciones.js`.

**Cómo probar (para Miguel, después de `npx vercel --prod`):**
1. Abre una OP que ya tenga una compra agregada (o agrégale una con "Agregar compra") → debe
   verse la sección "Compras (OC)" con folio, proveedor, total, estado e ítems.
2. Agrega una compra nueva → sin cerrar el panel, debe aparecer en la lista de "Compras (OC)"
   de inmediato.
3. Abre una OP sin compras → debe decir "Sin compras registradas todavía."

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`). Slice 3 ("Registrar embarque", D-151)
sigue pendiente, no se tocó aquí.

## E116 (2026-08-12) — Slice 3 del rediseño OP: "Registrar embarque" (backend D-151) — flujo "+ Nueva operación" COMPLETO end-to-end
_Último eslabón del hilo: desde el detalle de una OP, "Registrar embarque" crea la carga física
(`fn_op_agregar_embarque`, D-151) con herencia sin recaptura desde la venta única de la OP. A
diferencia de venta/compra, esta RPC SÍ mueve dinero (ingreso→CxC, costos→CxP) — el backend ya
está blindado (ENSAYO OK), este slice es "un form claro que muestre bien la herencia y las
advertencias", sin agregar validación de cosecha propia más allá de lo que pide la tarea._

**`modulo-operaciones.js` — nueva sección "Registrar embarque":**
- Botón **"Registrar embarque"** junto a "Agregar compra" en el detalle de la OP (gate
  `ERP.puede('capturar')`).
- **⚠️ Manejo de TABLE vs escalar verificado**: `fn_op_agregar_embarque` (a diferencia de las
  otras 3 RPCs del hilo, que son escalares) `RETURNS TABLE`. `ERP.rpc()` en `comun.js` ya
  funciona para ambos casos (`return data` tal cual llega de `sb.rpc()` — un string para
  escalar, un array de filas para TABLE) — no hizo falta tocar el helper compartido. Se lee
  `data[0] = {folio, con_flag, advertencias, ligada_a_so}`, mismo patrón que ya usan
  `fn_traspaso`/`fn_crear_carga` en otros módulos.
- **3 secciones del form**: "Heredado de la venta (opcional)" (PO, Cliente, Modalidad — los 3
  con placeholder que muestra el valor actual de la venta, ej. "Heredar (actual: PO-2001)"; dejar
  vacío = hereda, con nota explícita bajo el bloque); "Embarque" (Proveedor de materia prima —
  marcado "(muy recomendado)" en ámbar con la advertencia de que sin proveedor los costos no
  entran a CxP —, Producto, fechas, Cajas, Pallets, Ingreso de venta); "Costos por concepto"
  (7 numéricos opcionales — Materia prima/Comisión/Aduanas/In & Out QC/Fletes/Cartón/Otro — con
  Total en vivo de solo referencia, no se manda al backend como campo aparte).
- **Regla de consignación aplicada proactivamente**: `actualizarIngresoEmbarque()` calcula la
  modalidad EFECTIVA (la elegida en el `<select>`, o si se deja vacía, la ya conocida
  `op.modalidad` heredada de la venta — el dato YA está cargado en `verOperacion()`, no hace
  falta adivinar). Si la efectiva es consignación, el campo Ingreso se fuerza a 0, se deshabilita,
  y aparece la nota "Consignación nace sin liquidar; el ingreso se reconoce al cobro (A-07/D-11)"
  — funciona tanto si el usuario elige Consignación explícitamente como si la hereda en silencio.
  Si aun así el backend recibe consignación con ingreso>0 (caso raro), su RAISE se muestra tal
  cual, sin intentar traducirlo.
- **Combos de Cliente/Proveedor/Producto con `permitirNuevo:true`**: a diferencia de los combos
  por ID de los Slices 1/2, aquí los 3 campos son **texto** (`p_cliente`/`p_proveedor`/
  `p_producto` — la RPC envuelve `fn_crear_carga`, que acepta nombre y puede dar de alta uno
  nuevo sobre la marcha), mismo comportamiento que ya tiene `comboCli`/`comboProv`/`comboProd`
  en `nuevaCarga()` de `modulo-cargas.js` — no se restringió una capacidad que la RPC ya soporta.
- **Éxito**: toast `"Embarque <folio> registrado en <OP-XXXX>"` (+ `"· ligado a <SO-folio>"` si
  `ligada_a_so`, usando el `venta_so` ya cargado de `v_operacion` para mostrar el folio real, no
  solo un booleano) + `ERP.marcarDatosSucios()`.
- **Advertencias (`con_flag`/`advertencias`) mostradas de forma PROMINENTE**: si vienen, se pinta
  un aviso ámbar inline "Embarque creado CON avisos: ..." (concatenando el aviso de flag activa
  y el texto de `advertencias` si ambos vienen) y el drawer espera **1.8s** antes de refrescar a
  `verOperacion()` — mismo patrón exacto que ya usa `guardarNuevaCarga()` en `modulo-cargas.js`
  para el mismo tipo de situación (creación con avisos). Sin avisos, refresca de inmediato.
- Cualquier RAISE del backend (PO duplicado, consignación con ingreso, etc.) se muestra tal cual
  en un aviso rojo inline; el formulario queda abierto para corregir sin perder lo capturado.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`/`modulo-operaciones.js`
reales; se mockeó `sb.rpc`/`fetch` — la prueba REAL que mueve dinero la hará Miguel a
conciencia, como pidió la tarea):**
- ✅ **OP con venta margen_fijo**: Ingreso habilitado por defecto; placeholders muestran PO/
  modalidad heredados correctos.
- ✅ **OP con venta consignación (heredada, SIN elegir modalidad en el form)**: Ingreso se
  auto-deshabilita en 0 y aparece la nota de consignación, solo por herencia silenciosa.
- ✅ **Toggle manual del `<select>` Modalidad**: elegir Margen fijo habilita el Ingreso; elegir
  Consignación lo vuelve a deshabilitar — en ambas direcciones.
- ✅ **Total de costos en vivo**: 1000+300+50 → `$1,350.00`, recalculado en cada tecla.
- ✅ **Camino feliz**: proveedor y producto elegidos por combo (texto), cajas=100, ingreso=5000,
  3 de 7 costos capturados → payload exacto a `fn_op_agregar_embarque` (heredables en `null`,
  costos no capturados en `null`, `p_estado:'Programada'`, `p_auto_ligar_venta:true`) → toast
  `"Embarque P-086 registrado en OP-0086 · ligado a SO-0086."` → drawer refresca a `verOperacion`
  (confirma que `data[0]` de la respuesta TABLE se leyó bien).
- ✅ **Con avisos** (`con_flag:true`, `advertencias:"sin costo desglosado…"`): aviso ámbar
  inline con AMBOS mensajes concatenados, drawer sigue en el form ~1.8s, luego refresca solo.
- ✅ **RAISE simulado** (`CONSIGNACION_CON_INGRESO: ...`): mensaje tal cual en aviso rojo,
  formulario sigue abierto.
- Harness temporal creado y **borrado** al terminar; servidor local detenido.

**node --check:** ✅ limpio en `modulo-operaciones.js`.

**Cómo probar (para Miguel, después de `npx vercel --prod`) — ⚠️ ESTA RPC SÍ MUEVE DINERO,
probar a conciencia:**
1. Abre una OP sin embarque todavía → "Registrar embarque".
2. Deja PO/Cliente/Modalidad vacíos (para que hereden de la venta) → elige un proveedor de
   materia prima, captura cajas y al menos un costo → "Registrar embarque".
3. Debe salir un toast con el folio del embarque (P-XXX) y, si estaba ligado, el folio de la SO.
4. El detalle de la OP debe refrescar mostrando ya "Costos por línea" con lo capturado.
5. Prueba una OP con venta en **Consignación**: el Ingreso debe estar en 0 y bloqueado — intenta
   forzarlo (si el campo no se deja escribir, es el bloqueo del frontend funcionando).
6. Si alguna prueba dispara una advertencia (ej. sin proveedor), confirma que se ve clara en
   ámbar antes de que la pantalla se refresque sola.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`). **Con este slice, el flujo "+ Nueva
operación" queda completo end-to-end**: Slice 1 (venta) → Slice 2 (compra, + Slice 2.1 lectura)
→ Slice 3 (embarque, este). Los 4 pasos del hilo (`fn_abrir_operacion`, `fn_op_agregar_venta`,
`fn_op_agregar_compra`, `fn_op_agregar_embarque`) tienen su puerta de captura en el frontend.

## E117 (2026-08-12) — "Anular operación" y "Anular movimiento" desde la UI (backend D-155/D-156)
_Poder deshacer errores desde la pantalla en vez de depender del chat de backend para cada
anulación. El backend ya trae el motor blindado (D-156, ENSAYO real: creó una OP completa y la
anuló de punta a punta, anclas de vuelta exactas); este cierre es solo cablear botones._

- **"Anular operación"** (nuevo) — botón rojo/peligro en zona-peligro al final del detalle de
  la OP (`verOperacion()`, `modulo-operaciones.js`), visible solo con `ERP.puede('administrar')`.
  Confirm explícito + `prompt` de motivo obligatorio (bloquea si se manda vacío) → llama
  `fn_anular_operacion(p_folio_op, p_motivo)`, lee `data[0]` → toast con `data[0].resultado` tal
  cual lo arma el backend (ej. "Operación OP-XXXX anulada: 1 carga(s), 1 compra(s), 1 venta(s).")
  → cierra el drawer y refresca la lista (la OP anulada desaparece sola, ya filtrada por D-155).
  Cualquier RAISE (ej. cobros/pagos ya aplicados a alguna carga del hilo) se muestra tal cual,
  sin traducir, y el drawer se queda abierto.
- **"Anular movimiento"** (Tesorería) — ya existía desde D-119 (sesión muy anterior): botón
  `#edAnular` en `editarMovimiento()`, gateado por `ERP.puede('editar')`, mismo patrón
  confirm+prompt+motivo obligatorio → `fn_anular_movimiento(p_folio, p_motivo)`. Se ajustó una
  sola línea para que el toast use `data[0].resultado` del contrato actual, con fallback al
  mensaje anterior (armado con `aplicaciones_revertidas`) si `resultado` no viniera.
- Ambos botones leen `data[0]` de su RPC (ambas `RETURNS TABLE`) — mismo patrón ya establecido
  para `fn_traspaso`/`fn_crear_carga`/`fn_op_agregar_embarque` en este mismo módulo y en
  `modulo-tesoreria.js`.

**Verificado en vivo (harness + Chrome DevTools MCP, para "Anular operación"; "Anular
movimiento" ya estaba probado desde D-119 y solo se tocó un fallback de una línea):**
- ✅ Botón visible solo con `puede_administrar=true`; oculto sin el permiso.
- ✅ Camino feliz: motivo capturado, `fn_anular_operacion` recibe `{p_folio_op, p_motivo}`
  exactos, toast muestra el `resultado` tal cual, drawer se cierra.
- ✅ Motivo vacío bloquea la llamada (toast de error, sin tocar el backend).
- ✅ RAISE simulado (cobros aplicados): mensaje tal cual, drawer sigue abierto.

**node --check:** limpio (ya verificado en la sesión que escribió el código).

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

## E120 (2026-08-13) — "Registrar embarque" hereda proveedor + materia prima de la(s) OC de la OP (backend D-157/158/159)
_Cierra el ajuste A del backlog del flujo OP (E118): antes se recapturaba proveedor y materia
prima a mano en el embarque aunque la OP ya tuviera una compra (OC) con ese dato — doble captura
del mismo costo. El backend ahora hereda de la(s) OC(s) viva(s) cuando existen._

**`modulo-operaciones.js` — `abrirRegistrarEmbarque()`:**
- Se agregó `q('v_operacion_compras', '&folio_op=eq.<OP>&order=total.desc')` al `Promise.all()`
  de catálogos del form (junto a clientes/proveedores/productos). "OC viva" = `estado !==
  'Cancelada'` (mismo criterio que `estadoDe()` en `modulo-ordenes.js`, donde una OC anulada se
  muestra como "Cancelada").
- **Con ≥1 OC viva**: el form deja de pedir "Proveedor de materia prima" y "Materia prima" —
  en su lugar:
  - El campo Proveedor se reemplaza por un bloque read-only (`.campo-fijo`, mismo componente
    "campo fijo" que ya usa el resto de la app): *"Heredado de: **OC-0005** $1,000.00
    (AGRICOLA EL SAGRADO), **OC-0006** $400.00 (AGROFEPAC S.A.)"* + una aclaración con el
    encabezado calculado (la OC de **mayor total**) y una nota de que el backend ignora
    cualquier proveedor que se capture ahí.
  - El campo "Materia prima" del grid de costos se reemplaza por otro `.campo-fijo` mostrando
    el total heredado (Σ de las OCs vivas) con la leyenda "Heredado de la(s) OC — ver arriba".
  - `p_proveedor`/`p_materia_prima` viajan `null` **por construcción**, no por una rama de código
    aparte: el combo (`comboProveedorEmb`) ni se instancia y el `<input>` de materia prima ni se
    renderiza, así que las lecturas ya defensivas del código existente
    (`comboProveedorEmb && comboProveedorEmb.valor()`, `(document.getElementById(id) ||
    {}).value`) resuelven solas a `null` — cero lógica condicional nueva en `guardarEmbarque()`.
  - Los demás 6 conceptos de costo (comisión/aduanas/QC/fletes/cartón/otro) se siguen capturando
    exactamente igual, con o sin OC.
- **Sin OC viva (0 OCs, o todas canceladas)**: el form queda EXACTAMENTE como en E116 — Proveedor
  (combo) + Materia prima (input) editables, sin cambios.
- El aviso de herencia que trae `data[0].advertencias` (ej. *"Materia prima ($1,000.00) y
  proveedor heredados de 1 OC(s): OC-0005."*) ya se mostraba de forma prominente desde E116 —
  no hizo falta tocar esa parte, el mecanismo genérico de avisos ya lo cubre tal cual.

**Verificación EN VIVO (harness local + Chrome DevTools MCP; `comun.js`/`modulo-operaciones.js`
reales; se mockeó `sb.rpc`/`fetch`, con los 3 escenarios exactos que pedían las pruebas):**
- ✅ **Escenario A (1 OC viva)**: form sin combo de Proveedor ni input de Materia prima; bloque
  "Heredado de: OC-0005 $1,000.00 (AGRICOLA EL SAGRADO)". Capturando solo Fletes=50 y guardando,
  el payload real a `fn_op_agregar_embarque` confirmó `p_proveedor:null`,
  `p_materia_prima:null`, `p_fletes:50` — el resto de conceptos null. El aviso de herencia se
  mostró tal cual antes de refrescar el detalle de la OP.
- ✅ **Escenario B (2 OC vivas + 1 cancelada)**: el bloque muestra **solo** las 2 vivas
  (OC-0006 $1,000/AGRICOLA, OC-0007 $400/AGROFEPAC) — la cancelada (OC-0008 $5,000/CANDY FRESH)
  queda excluida correctamente pese a tener el total más alto. Encabezado calculado =
  AGRICOLA EL SAGRADO (mayor total **entre las vivas**). "Materia prima" muestra $1,400.00
  (1,000+400) heredado.
- ✅ **Escenario C (0 OC vivas, regresión)**: el form vuelve a pedir Proveedor (combo) y Materia
  prima (input) exactamente como antes de este cambio. Eligiendo proveedor + capturando
  materia prima=800 a mano, el payload confirmó `p_proveedor:"AGRICOLA EL SAGRADO"` y
  `p_materia_prima:800` — sin regresión al flujo previo (E116).
- Harness temporal creado y **borrado** al terminar; servidor local detenido.

**node --check:** ✅ limpio en `modulo-operaciones.js`.

**Cómo probar (para Miguel, después de `npx vercel --prod`):**
1. Abre una OP con una compra (OC) ya agregada → "Registrar embarque". El form NO debe pedir
   Proveedor ni Materia prima — debe mostrar "Heredado de: OC-XXXX $monto (proveedor)".
2. Captura solo Fletes (o cualquier otro concepto) y guarda. Espera: la carga se crea SIN
   bandera roja de "falta costo"; en su detalle, materia prima = el total de la OC, atribuida a
   ese proveedor (entra a CxP); el encabezado de la carga = ese proveedor; se ve el aviso de
   herencia.
3. Si la OP tiene 2+ compras, confirma que el encabezado quedó en la de mayor total.
4. Abre una OP SIN ninguna compra registrada → "Registrar embarque" debe pedir Proveedor y
   Materia prima como siempre — captúralos a mano y confirma que la carga no queda sin costo.

**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

## E121 (2026-08-13) — CAMINO C · Fase O1: pantallas Customer PO + Sales Orders (backend D-160/161/162)
_Arranque del reinicio operativo "Camino C". Dos pantallas NUEVAS (módulos nuevos, separados de lo
viejo) contra el namespace `op` recién aplicado por el chat de backend. SOLO FRONTEND, money-neutral._

**Contrato consumido (vistas `public` en lectura, RPCs `public` en escritura):**
- Vistas: `v_op_customer_po`, `v_op_sales_orders`, `v_op_so_lineas`, `v_op_so_tablero`.
- RPCs: `fn_op_cpo_alta`, `fn_op_so_crear_desde_cpo`, `fn_op_so_confirmar`, `fn_op_so_set_estado`.
- Catálogos reusados (vistas ya vivas del ERP, NO se inventaron nombres): `v_catalogo_clientes`
  (clientes), `v_catalogo_productos` (productos), `v_revenue_models` (Sales Type). `p_actor` =
  `ERP.perfil.socio_codigo` (o null).

**Archivos nuevos:**
- `modulo-o1-cpo.js` — ruta `o1-cpo`, scope `.pantalla-o1-cpo`. Tira de KPIs (CPOs Abiertos /
  Convertidos / del mes), tabla densa desde `v_op_customer_po` (folio mono, cliente, N° cliente,
  fecha, moneda, estado en pastilla, adjunto como enlace `--brand` si es URL). Botón negro
  "Nuevo Customer PO" → form en `#panelBody` (cliente vía combo `v_catalogo_clientes`, N° cliente,
  fecha, moneda, **referencia de adjunto en texto — NO sube archivo**, nota) → `fn_op_cpo_alta`.
  En filas "Abierto": acción "Generar Sales Order" → llama `ERP.o1CrearSODesde(id, folio)`. Ficha
  del CPO en el drawer.
- `modulo-o1-so.js` — ruta `o1-so`, scope `.pantalla-o1-so`. Alta desde un CPO (Sales Type =
  `v_revenue_models`; líneas producto/cantidad/uom `CAJA` por defecto/precio opcional) →
  `fn_op_so_crear_desde_cpo` (muestra el `op_folio` creado). Tabla desde `v_op_sales_orders`
  (folio SO, CPO, cliente, Sales Type en pastilla, estado, OP). Ficha con **tablero**
  `v_op_so_tablero`: Required / Allocated / Purchased / Open — Allocated y Purchased en 0 y en
  gris con nota "llegan en O2/O3"; **Open resaltado** (`--money`). Botón negro **"Confirmar"** si
  estado `Draft` (`fn_op_so_confirmar`); cambios de estado por `fn_op_so_set_estado` (siguientes
  legales calculados en el front para no ofrecer saltos ilegales; el backend es la autoridad).

**Diseño:** pastillas de Sales Type — Margen/Consignación verde, **Comisión ámbar** (comisión pura
NO es error). Pastillas mapeadas a clases GLOBALES (`.pill.verde/.ambar`) para pintar igual en la
lista (scoped) y en la ficha (`#panelBody`, fuera del scope). Bloques CSS anidados bajo cada scope
en `estilos.css` (KPIs/tabla/pills/botones remapeados a tokens, theme-aware); solo tokens, cero hex.

**MARCO:** grupo nuevo **"Camino C"** — ícono de riel `ti-route` (entre Operación y Dinero),
eyebrow + 2 ítems en `nav.lateral`, entrada en `GRUPO_META` de `app.js`, `<script>` de ambos
módulos en `index.html` antes de `app.js`. Respeta D-105 (`ERP.perfil.modulos`): si el backend aún
no registró las claves `o1-cpo`/`o1-so` en `modulos_erp`, los ítems del menú se ocultan, pero el
router permite entrar por URL (`#/o1-cpo`, `#/o1-so`).

**Verificación:** `node --check` limpio en `modulo-o1-cpo.js`, `modulo-o1-so.js`, `app.js`.
**NO DESPLEGADO** (Miguel corre `npx vercel --prod`).

**Qué probar (DoD O1):**
1. Registrar un Customer PO real (cliente + referencia de adjunto) → aparece con folio
   `CPO-2026-#####`, estado "Abierto".
2. Desde ese CPO, "Generar Sales Order" → elige Sales Type + líneas → Crear → la SO nace en
   "Draft" y muestra su OP (`OP-2026-#####`). Confirmar → la SO pasa a "Confirmed" y el CPO pasa a
   "Convertido".
3. Abrir la SO → el tablero muestra Required = lo capturado, Open = igual; Allocated y Purchased
   en 0 y en gris.
4. Verificar en claro Y oscuro; confirmar que 2-3 pantallas viejas no cambiaron.

## E122 (2026-08-13) — Incremento A: subir el archivo del Customer PO a Storage (bucket privado)
_Solo frontend. Backend ya tenía el bucket privado `cpo-adjuntos` (20 MB; pdf/png/jpeg/webp) + policies
(subir=`capturar`, leer=`ver`). El bucket NO es público → se ve/descarga por URL firmada temporal._

**En `modulo-o1-cpo.js`:**
- **Alta (drawer "Nuevo Customer PO"):** junto al campo "Adjunto del PO" (que sigue aceptando pegar
  una URL) se agregó un **input de archivo** "o subir archivo (PDF/imagen)". Es alternativa: se sube
  **O** se pega, ninguna obligatoria.
  - Al elegir archivo: valida mime (pdf/png/jpeg/webp) y tamaño (≤20 MB) en cliente, luego sube a
    `cpo-adjuntos` con ruta única `${año}/${crypto.randomUUID()}-${nombreSaneado}` (contentType =
    `file.type`, `upsert:false`) vía `ERP.sb.storage.from(...).upload(...)`.
  - Al éxito: `adjuntoSubido = "storage:cpo-adjuntos/<ruta>"`, se muestra el nombre del archivo + un
    enlace **"quitar"** (limpia el campo y reactiva el input de URL). El archivo manda sobre la URL
    pegada (se limpia/bloquea el texto para no ambiguar). Errores (tamaño/mime/permiso) van al
    `.aviso` del form, sin romper.
  - Al **Crear**: `p_adjunto_ref = adjuntoSubido || URL pegada || null` → `fn_op_cpo_alta` (RPC sin
    cambios).
- **Ficha/lista (`adjuntoHTML`):** si `adjunto_ref` empieza con `storage:` → se parsea `bucket/ruta`
  y se pinta un botón **"Ver adjunto"** que al click genera `createSignedUrl(ruta, 3600)` y abre en
  pestaña nueva. Si es `http(s)` → enlace directo (como antes). Otro → texto plano. Los botones se
  cablean tanto en la tabla (con `stopPropagation`, no abre la ficha) como en el drawer.
- **Cliente Supabase:** se reusó `ERP.sb.storage` (cliente ya autenticado, mismo patrón que
  `modulo-comercial.js`) — NO hizo falta agregar helpers a `comun.js`.

**Diseño:** input de archivo con la gramática del form (`.btn-file` punteado, tokens; estado con
"quitar" en `--red`). Reglas globales nuevas en `estilos.css` (`.adjunto-sube/.btn-file/.adjunto-estado`)
porque el form vive en `#panelBody` (fuera del scope). Solo tokens.

**Verificación:** `node --check` limpio en `modulo-o1-cpo.js`. **NO DESPLEGADO.**

**Qué probar:** en "Nuevo Customer PO" → subir un PDF (aparece el nombre + "quitar") → Crear →
abrir la ficha del CPO → **"Ver adjunto"** abre el PDF por URL firmada en pestaña nueva. Probar en
claro y oscuro. Verificar también que pegar una URL `http(s)` sigue funcionando como enlace directo.
