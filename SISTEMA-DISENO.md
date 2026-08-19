# SISTEMA-DISEÑO.md — ERP Plein · Dirección visual aprobada
_Anexo del chat de frontend. Autocontenido. Última actualización: E97 (2026-08-06). NO toca backend ni dinero._

## 0. Estado de la decisión
Dirección **"Operador estilo Silo, versión Plein"** APROBADA (E89). Escena ancla aprobada: **`escena-silo-plein.html`** (pantalla Embarques). Referencia de formato: **`conceptos-diseno-3.html`** (concepto G "Operador" + H "Tablero"). Piloto Inicio+Embarques aprobado por Miguel (E90).

**Implementación** (detalle en §12): **7 pantallas ya vestidas** — Embarques (E90), CxC (E91), CxP (E92), Tesorería (E93), Inicio (E94), Antigüedad de saldos (E95), Finanzas (E96). **MARCO estilo Silo IMPLEMENTADO (E97):** riel de íconos por grupo + barra de módulo + menú agrupado (§7), respetando permisos D-105. Falta vestir el resto de pantallas de tablas (§9), que ahora viven dentro del MARCO con su piel vieja hasta que les toque.

Regla mayor: **el problema del ERP actual no es la estructura, son los tokens** (color/espacio/tipo) + ruido (foto de fondo, emojis, notas internas filtradas, menú plano de 25 ítems). Se arregla **refinando el CSS a tokens** — SIN Tailwind, SIN build.

## 1. Motor de estilos (decidido)
- **CSS con variables (tokens)**, SIN Tailwind, SIN paso de build. El stack sigue igual (HTML/JS vanilla en Vercel). Claude Code toca sobre todo **una hoja de estilos** (`tokens.css` + bloques scopeados en `estilos.css`) + retoques puntuales de marcado.
- **Modo claro/oscuro = requisito. YA INSTALADO Y FUNCIONANDO (E89).** Tokens en `:root` (claro) + override en `[data-theme="dark"]`, con un **toggle de usuario** (botón luna/sol en la barra superior; persiste en `localStorage('plein-theme')`; script anti-parpadeo en `<head>` fija el tema antes del primer paint). Todo color sale de un token; nada de hex sueltos en componentes.

## 2. Formato aprobado (gramática visual)
Tool **denso, de operador, orientado a datos** (no dashboard aireado). Elementos:
- **Riel de íconos angosto** (66px): logo arriba, íconos + micro-etiqueta, activo en verde. Botón claro/oscuro abajo. _(Parte del MARCO — §7, ✅ implementado E97: un ícono por GRUPO.)_
- **Barra de módulo arriba** (52px, blanca): selector de módulo (chip verde "Operación ▾") · miga de pan · ⭐ · a la derecha: buscador + empresa + avatar. _(Parte del MARCO — §7.)_
- **Tira de KPIs verdes grandes** encima de cada tabla (Venta, Costo, Gastos, Margen, Utilidad) — números en mono, verde = dinero.
- **Grupos por programa/cliente**: encabezado con **pestaña verde** a la izquierda + resumen del grupo; debajo, **filas de lote anidadas** con **pestaña naranja**.
- **Columnas financieras densas**: $/caja, venta, costo/caja, break-even, utilidad, margen.
- **Pastillas de modalidad**: Margen / Consignación / Comisión. (Comisión pura → costo 0 / margen 100% se muestra **correcto**, no como error.)
- **Botón de acción NEGRO** (primario), no azul (a diferencia de Silo). Semáforos ámbar/rojo.
- Íconos: **Tabler (líneas)**, NUNCA emojis.

## 3. Tokens — CLARO (`:root`)
```
--bg:        #F6F8F5   /* lienzo (adiós crema) */
--pan:       #FFFFFF   /* tarjetas/tablas */
--ink:       #14231A   /* texto principal */
--i2:        #56655C   /* texto secundario */
--i3:        #8B968C   /* hints/labels */
--bd:        #E3E7E1   /* borde */
--hair:      #EEF1EC   /* divisor fino */
--brand:     #1E531D   /* verde marca (logo) */
--money:     #1E7A3C   /* verde dinero (números positivos) */
--btn:       #14231A   /* botón primario (negro) */
--btnT:      #FFFFFF   /* texto botón primario */
--amb:       #B26B12   /* ámbar (advertencia) */  --amb-bg:#FBF0DB
--red:       #B3402E   /* rojo (negativo) */       --red-bg:#FBEAE7
--tabG:      #1E7A3C   /* pestaña grupo (verde) */
--tabO:      #C98A2D   /* pestaña lote (naranja) */
--gtint:     #F0F6EE   /* tinte fila/hover */
--color-scheme: light  /* E93: `color-scheme: light` en :root — controles nativos (fecha, scroll) en claro */
```

## 4. Tokens — OSCURO (`[data-theme="dark"]`)
```
--bg:#0F1512  --pan:#151B17  --ink:#EAF0EB  --i2:#93A197  --i3:#66736B
--bd:#232B26  --hair:#1B221D  --brand:#5FB255  --money:#57C06A
--btn:#EAF0EB --btnT:#0F1512  --amb:#D69A3C --amb-bg:#2A2213
--red:#E5675A --red-bg:#2A1613  --tabG:#57C06A --tabO:#D69A3C  --gtint:#141E15
/* E93: `color-scheme: dark` en [data-theme="dark"] — arregla date pickers/scrollbars nativos */
```

## 5. Tipografía
- **Archivo** — títulos de página y wordmark (700/800).
- **Inter** — toda la UI/cuerpo (400/500/600).
- **IBM Plex Mono** — TODO número (folios, montos, %), `tabular-nums`. Negativos en `--red`.
- Escala: título página 20–23px · sección/eyebrow 9.5–11px MAYÚSCULAS con tracking · cuerpo 12–13px · KPI 20px · label 9.5px.

## 6. Componentes (contratos)
- **Riel de íconos** `.icrail` (66px) · `.ic` (activo `.on` verde) · botón tema abajo. _(MARCO — §7.)_
- **Barra módulo** `.modbar` · chip módulo verde · buscador `.srch` · avatar. _(MARCO — §7.)_
- **Tira KPIs** `.kpistrip` / `.kpi` (label + `.v` mono verde; `.v.ink` neutro; `.v.neg` rojo).
- **Grupo** `.group` → `.ghead` (pestaña verde `border-left:4px --tabG`, tinte `--gtint`) con `.gtag` + celdas kv; `.actions` a la derecha (`.mini`).
- **Tabla** densa: `thead th` (9px MAYÚS `--i3`), `td.num` derecha mono, hover `--gtint`, `border-top --hair`, **`tr.total td` fondo `--hair` + texto `--ink`** (fix E91 — antes ilegible en oscuro).
- **Fila de lote** `.ltag` (pestaña naranja `--tabO` vía `::before`), folio en verde marca.
- **Pastillas** `.pill.m` (Margen, verde) · `.pill.g` (Consignación, verde) · `.pill.c` (Comisión, ámbar — nunca rojo) · semáforo verde/ámbar/rojo.
- **Botones** `.btn` / `.btn-mini` (negro primario) · `.btn-mini.gris` / `.gbtn` (ghost bordeado) · `.act`/`.mini` (acción por fila) · `.act.pri` (negro).
- **Filtros** `.filters` (label arriba + control `.ctl`) · **tabs** `.tb` (chip; `.on` verde relleno) / `.chip`+`.chip.activo`.
- **Nombres de entidad** `.cliente` / `.prov` / `.ent` / `.cuenta` → `--ink` peso 500.
- **`.enlace`** dentro de cada scope → `--brand` (legible en claro y oscuro; fix E93).
- **`.pos` / `.neg`** → `--money` / `--red` (remapear dentro de cada scope).
> Fuente de verdad de valores exactos: `escena-silo-plein.html`.

## 7. Menú agrupado · PARTE DEL MARCO · ✅ IMPLEMENTADO E97 (agrupación aprobada por Miguel)
Hoy son ~25 módulos en lista plana. Agrupar así (con eyebrow por grupo):
- **INICIO:** Inicio
- **OPERACIÓN:** Embarques · Órdenes de compra · Órdenes de venta · Lotes · Embarques físicos · Programas · Cotizaciones y órdenes · Tareas
- **DINERO:** Cuentas por cobrar · Cuentas por pagar · Tesorería · Liquidaciones al productor · Antigüedad de saldos
- **FINANZAS:** Finanzas · Cierres contables · Proyectos · Concentración de riesgo
- **CATÁLOGOS:** Directorio comercial · Inventario · Facturación
- **REVISIÓN:** Revisiones pendientes · Datos faltantes · Bitácora
- **ADMIN:** Usuarios
> El menú se pinta según permisos (E88/D-105: `ERP.perfil.modulos`). El agrupado NO cambia esa lógica; solo la presentación.
> Agrupación **aprobada por Miguel** e implementada en E97. El menú se pinta por `ERP.perfil.modulos`
> (D-105); un grupo (eyebrow + su ícono de riel) se oculta si el usuario no tiene ningún módulo en él.

## 8. Reglas de limpieza (aprobadas)
1. **Quitar la foto de fondo** del `body` — ✅ verificado E90: no existía foto en el repo; el `body` ya está en lienzo sólido `--bg` desde E89. (La "playa" que a veces asoma es el wallpaper del Mac, no del ERP.)
2. **Cero emojis** en navegación/UI → íconos Tabler. _(Se van reemplazando pantalla por pantalla; ya limpio en las 6 vestidas.)_
3. **Ocultar notas internas** de la vista diaria: códigos tipo `[E17]`, `[E47]`, `FLAG:` → nota interna secundaria/colapsada. _(No aparecieron en las 6 vestidas; el flag ⚑ operativo sí se conserva, re-vestido como ícono Tabler.)_
4. **Header** sin ruido: chip de usuario limpio. _(Parte del MARCO — §7.)_
5. Escala de espacio estricta; tarjetas/filas parejas.

## 9. Plan de rollout (con Claude Code)
1. ✅ **Tokens + toggle claro/oscuro** en 1 hoja (`tokens.css`) — HECHO (E89).
2. **Aplicar pantalla por pantalla.** Método probado (§12): wrapper de SCOPE `.pantalla-XXX` + CSS anidado bajo el scope + tokens, sin globales. Estado:
   - ✅ Embarques (E90) · ✅ CxC (E91) · ✅ CxP (E92) · ✅ Tesorería (E93) · ✅ Inicio (E94) · ✅ Antigüedad (E95) · ✅ Finanzas (E96)
   - ⬜ Faltan (pantallas de tablas, propagación de rutina): **Finanzas, Directorio Comercial, Programas, Proyectos, Concentración de riesgo, Inventario, Cotiz. y órdenes, Facturación, Órdenes de Venta, Cierres Contables, Tareas, Revisiones Pendientes, Datos faltantes, Usuarios.** (Orden sugerido por uso: Finanzas → Directorio → Programas → Proyectos → resto; Miguel puede reordenar.)
3. Cada entrega = **bloque copy-paste para Terminal** + qué esperar ver. Miguel despliega con `cd ~/Desktop/erp-plein && npx vercel --prod`.
4. ✅ **MARCO (§7) — HECHO E97**: riel de grupos + barra de módulo + menú agrupado, respetando D-105. (`index.html` shell, `estilos.css` bloque MARCO, `app.js` sync riel/menú, `comun.js` emite `erp:navegar`.)
5. Actualizar `REPORTE-FRONTEND.md` + `NORTE.md` al cierre de cada tanda.

## 10. Reglas duras (Claude Code, frontend)
- Solo frontend; **nunca** el esquema Supabase.
- Verificar columnas/vistas/RPCs **en vivo** antes de programar; verificar que exista el call-site antes de envolver.
- `node --check` limpio. **NO desplegar** (lo hace Miguel).
- Instrucciones a Miguel SIEMPRE como bloque copy-paste para Terminal, paso a paso (no es programador). Nunca archivo descargable salvo que lo pida.
- **Todo color sale de tokens DARK-AWARE (regla permanente, E123).** Los tokens nuevos de `tokens.css`
  (`--bg/--pan/--ink/--i2/--i3/--bd/--money/--brand/--red/--amb`) YA son dark-aware (redefinidos en
  `html[data-theme="dark"]`) — úsalos siempre en pantallas y componentes nuevos. Los tokens viejos
  del `:root` de `estilos.css` (`--papel/--tarjeta/--tinta/--gris/--gris-claro/--linea/--verde/
  --ambar/--rojo/--lima…) son **legacy claro-only**: no los uses en trabajo nuevo. (E123 les agregó
  alias dark-aware en `tokens.css` para arreglar el panel/fichas globales que ya los usaban, pero
  eso es un parche de compatibilidad — no una invitación a seguir usándolos.)
- **El texto de valores fija color explícito dark-aware**, nunca "a ver qué cae" por herencia — ej.
  `.det .v`, `.ficha-val` (`color:var(--ink)`).
- **Especificidad de `html[data-theme="dark"]` vs `:root`:** si necesitas que un override de tema
  oscuro gane pase lo que pase sobre un `:root{}` que se cargue DESPUÉS en el `<link>` (como el
  `:root` legacy de `estilos.css`, que carga después de `tokens.css`), el selector `[data-theme="dark"]`
  a secas NO alcanza — tiene la MISMA especificidad que `:root` (0-0-1-0) y pierde el empate por
  orden de archivo. Usa `html[data-theme="dark"]` (0-0-1-1, con el tipo `html`), que gana siempre
  sin importar el orden de los `<link>`. Pero ojo: eso también sube su especificidad por encima de
  cualquier `.pantalla-XXX .algo{}` scopeado (0-0-2-0) — si el override es para un token o clase que
  también tienen reglas scopeadas correctas (ej. `.btn-mini`), NO lo apliques con `html[data-theme=
  "dark"] .btn-mini{...}` (rompería las pantallas ya vestidas): usa en su lugar un token dedicado sin
  alias (ver `--verde-solido` en `estilos.css` — mismo valor en ambos temas, cero pelea de cascada)
  o edita el literal directo en la regla fuente.
- **Toda pantalla y todo panel/ficha se prueba en CLARO y OSCURO antes de darse por hecho, por
  color computado (`getComputedStyle`), no a ojo.** Aplica también a cualquier tarea de frontend
  futura, no solo a pantallas nuevas — un fix que solo se ve "a ojo" en el navegador puede estar
  resolviendo el síntoma equivocado (ver E123: el primer intento de fix pasó "a ojo" pero medido
  con contraste real seguía roto por un empate de especificidad).
- **Los CONTROLES de formulario (`input`/`select`/`textarea`) y los dropdowns/autocompletes
  (`crearCombo`) son dark-aware por defecto EN LA BASE (regla permanente, E124)** — nunca fondo
  blanco/hardcodeado (`#fff`) ni un token legacy claro-only. Fondo `var(--pan)`, texto `var(--ink)`,
  placeholder `var(--i3)`, borde `var(--bd)`, borde en foco `var(--brand)`; el ítem resaltado/hover
  de un dropdown usa `var(--gtint)` (nunca gris genérico). Esto se arregla UNA VEZ en la base
  (`.form-erp input,select,textarea`, `.combo-input`, `.combo-lista`, `.combo-item`), NO por
  pantalla — cualquier drawer/formulario nuevo lo hereda gratis. Para un control nativo (`input[type=
  date]`, `select`) que necesite forzar su propio `color-scheme` (el ícono del calendario o el caret
  del select no siguen el tema), usa `color-scheme:inherit` en la regla del control, no en `:root`
  (ya está ahí) — verificado por SCREENSHOT en ambos temas, no solo por color computado (el ícono
  nativo del date-picker y el caret del select no son medibles con `getComputedStyle`).
- **Toda pantalla, panel, ficha Y formulario (incluido el dropdown ABIERTO y con opción
  SELECCIONADA) se prueba en claro y oscuro antes de darse por hecho** — no solo el estado
  "vacío"/cerrado del control.

## 11. Archivos de referencia (mockups)
- `escena-silo-plein.html` — **escena ancla APROBADA** (Embarques, formato final, claro/oscuro).
- `conceptos-diseno-3.html` — concepto G "Operador" + H "Tablero" (referencia de formato).
- (Descartados: `piloto-inicio.html`, `piloto-inicio-v2.html`, `conceptos-diseno.html`, `conceptos-diseno-2.html`.)

## 12. Estado de implementación y método probado (E90–E97)
_El detalle fino de cada pantalla vive en `REPORTE-FRONTEND.md` (entradas E90–E97). Esto es el resumen._

### Pantallas vestidas (SCOPE por pantalla)
| Pantalla | SCOPE | Sesión |
|---|---|---|
| Embarques | `.pantalla-embarques` | E90 |
| Cuentas por Cobrar | `.pantalla-cxc` | E91 |
| Cuentas por Pagar | `.pantalla-cxp` | E92 |
| Tesorería | `.pantalla-tesoreria` | E93 |
| Inicio | `.pantalla-inicio` | E94 |
| Antigüedad de saldos | `.pantalla-antiguedad` | E95 |
| Finanzas | `.pantalla-finanzas` | E96 |

### MARCO (navegación global) — E97
Riel de íconos por grupo (`.icrail`) + barra de módulo (`.modbar`) + menú agrupado (`nav.lateral` con
`.nav-grupo`/`.nav-eyebrow`). En `index.html` (shell) + `estilos.css` (bloque MARCO) + `app.js`
(`aplicarMenuDinamico`/`sincronizarGrupos`/`sincronizarMarco`/`irAGrupo`) + `comun.js` (evento `erp:navegar`).
Respeta D-105 (`ERP.perfil.modulos`): grupo sin módulos visibles → se oculta su eyebrow y su ícono de riel.
Las 25 pantallas viven dentro del MARCO; las 7 vestidas conservan su scope, las demás su piel vieja.

### Método (repetir igual en cada pantalla nueva)
1. **Verificar EN VIVO** el marcado real del módulo antes de tocar (clases/IDs reales, de dónde salen los datos — NO cambiar el origen de datos).
2. **Crear un wrapper de SCOPE propio** `.pantalla-XXX` alrededor de todo lo que pinta `render()`. Casi ningún módulo tiene contenedor propio: escriben directo a `#modContenido` genérico.
3. **TODO el CSS nuevo va ANIDADO bajo el SCOPE**, con una clase extra de especificidad. NUNCA estilos globales a `table`/`.kpi`/`.chip`/`.pill`/`thead th`/`tbody td`/`tr.total`.
4. **Tokens de `tokens.css`, cero hex sueltos.**
5. **Drawers/paneles globales (`#panelBody`) quedan FUERA del scope** (frontera constante: ficha de carga, drill-down de cliente/proveedor, etc.).
6. **No inventar KPIs/datos** que el backend no exponga. **Reusar el componente que ya cumple el rol** en vez de duplicar (ej. `.tarjeta` en Inicio y `.aging-hero` en Antigüedad ya son la tira de KPIs — no forzar un `.kpistrip` paralelo).
7. **Verificar en navegador CLARO y OSCURO** + que 2-3 OTRAS pantallas no cambien (por color computado, no a ojo).
8. `node --check` limpio; **NO desplegar** (lo hace Miguel); **actualizar `REPORTE-FRONTEND.md`**.

### Fixes globales ya aplicados
- **`color-scheme` claro/oscuro** en `tokens.css` (E93) → controles de fecha nativos y scrollbars siguen el tema. (Ojo: un `input[type=date]` con `background` propio de token viejo necesita remapeo scopeado extra — pasó en el rango de Embarques.)
- **`.enlace`** remapeado a `--brand` dentro de cada scope (E93) → nombres/enlaces legibles en oscuro.
- **`tr.total td`** con fondo `--hair` + texto `--ink` en cada scope → pie de tabla legible en oscuro (antes casi blanco).

### Pendiente menor anotado (barrer en algún pulido)
- **`.pos` / `.neg`** en Embarques/CxC/CxP (E90–E92) todavía usan color viejo (legibles, pero **no** cambian con el tema). En Tesorería/Inicio/Antigüedad ya se remapearon. Barrer los 3 primeros cuando convenga.

## 13. Responsive · UNA sola base de código (Fase 1 · E131 / D-193)
El ERP debe usarse desde el teléfono (Miguel opera en bodegas y en la calle), no solo en laptop.
**Regla mayor: una sola base de código responsive — NO una app/diseño móvil aparte** (mantener dos
se desincroniza). El backend no cambia: mismas vistas y RPCs. **Todo módulo NUEVO nace responsive.**

### Breakpoints (convención — usar SIEMPRE estos dos valores en trabajo nuevo)
CSS no admite `var()` dentro de la condición `@media`, así que los breakpoints son una **convención
escrita**, no una variable. No inventar valores sueltos (600/620/860/1000…); usar:
- **MÓVIL** `@media(max-width:640px)` — teléfono.
- **TABLET** `@media(max-width:1024px)` — tablet / ventana chica.
- **DESKTOP** `> 1024px` — default, sin media query.

Definido y comentado en `estilos.css`, bloque **"CIMIENTO RESPONSIVE (Fase 1)"** (después de la
sección Invoices). Ahí viven todas las reglas base; no dispersar reglas responsive por el archivo.

### Comportamiento del MARCO por escalón
- **Desktop (>1024):** riel de íconos (66px) + menú agrupado fijo (250px), ambos visibles.
- **Tablet (≤1024):** el riel (66px) SE QUEDA; el menú agrupado colapsa a **cajón** (hamburguesa
  `#btnMenu` + overlay `#menuFondo`), deslizando desde `left:66px`.
- **Móvil (≤640):** además se **oculta el riel**; el shell pasa a una sola columna; el cajón desliza
  desde `left:0`. El toggle de tema (que en desktop vive en el riel, `#btnTema`) se reemplaza por
  `#btnTemaTop` en la modbar (los íconos de ambos se sincronizan en `app.js → pintarIconoTema`).

### Patrón TABLA → TARJETA (reusable — el más importante)
Las tablas del ERP tienen 8–12 columnas y desbordan en móvil (a veces incluso en desktop). En móvil
cada `<tr>` se vuelve una **tarjeta apilada** con la etiqueta de cada campo visible. Definido UNA vez:
- **CSS:** clase `.tabla-cards` sobre el `.tabla-wrap` (las reglas viven bajo `@media(max-width:640px)`,
  así que en desktop/tablet son inertes — no tocan la tabla normal).
- **JS:** `ERP.marcarTabla(ref)` (en `comun.js`) — `ref` = id (string), contenedor, o `<table>`.
  Agrega `.tabla-cards` al wrapper y copia el texto de cada `<th>` al `data-label` del `<td>` de esa
  columna (el CSS lo pinta con `::before`). Idempotente; las columnas de acciones (sin `<th>` con
  texto) no reciben etiqueta y quedan como fila de botones. **Uso (Fase 2): una línea por módulo
  tras pintar la tabla — `ERP.marcarTabla(cont);`**

### Formularios en móvil
- Campos a **una columna** (`.form-erp .campos{grid-template-columns:1fr}` ya desde tablet).
- Inputs/selects/textarea a **16px** (evita el zoom automático de iOS al enfocar) y **min-height
  44px** (área táctil). Botones ~40–44px.
- Panel/drawer a **pantalla completa**; `.panel-body` con padding inferior + `env(safe-area-inset-
  bottom)` para que el botón de guardar no quede tapado por el teclado.

### Tipografía en móvil
- Nada por debajo de ~12px (labels/hints suben a 12px; valores de detalle y celdas a 14px).

### Plan de rollout responsive
- **Fase 1 (E131 · HECHO):** cimiento — breakpoints, marco colapsable, patrón tabla→tarjeta,
  formularios táctiles, tipografía. Verificado en iPhone (390px), tablet (800px) y desktop (1440px):
  cero scroll horizontal en los tres; desktop pixel-idéntico a antes.
- **Fase 2 (E132 · HECHO, D-195):** aplicada a los 5 módulos Camino C, uno por uno, commit por
  módulo, en el orden por uso (o1-cpo → o1-so → o1-inventario → o3-compras → catalogos-c):
  `ERP.marcarTabla(cont)` tras pintar cada tabla (lista + tablero ancho del SO de 11 columnas +
  líneas de compra de O3b). De paso, Miguel probó Fase 1 en su iPhone real y reportó 2 bugs, ambos
  cerrados en esta misma fase — ver "Bugs reales cerrados" abajo.
- **Fase 3 (E132 · HECHO, D-195):** PWA — `manifest.json` + iconos (192/180px, generados con
  `sips` a partir de `assets/icono.png`) + service worker mínimo (`sw.js`, sin caché — solo
  install/activate/fetch passthrough) + meta tags `apple-mobile-web-app-*`. Instalable en iPhone
  ("Agregar a pantalla de inicio", sin barra de navegador, con ícono de Plein). Sin soporte
  offline, como se pidió.

### Bugs reales cerrados en Fase 2 (Miguel probó en su iPhone, con evidencia)
- **BUG 1 — modbar se desbordaba en móvil.** Causa reportada (`.presencia-soy` sin ocultar en
  ≤640px) más una causa raíz adicional encontrada al medir con `getBoundingClientRect` (no solo
  el síntoma): `.modbar .sp` traía `flex:none` (no encogía) y `.modbar .mod` no tenía tamaño fijo,
  así que el chip de grupo se desbordaba de un contenedor colapsado a 0. Fix: `.presencia-soy`
  oculta en móvil; `.sp` ahora encoge; el chip queda solo-ícono en móvil (el título ya está en el
  H1 de la pantalla); "Actualizar"/"Salir" pasan a botones cuadrados solo-ícono de 40px (nuevos
  `<i>`+`<span class="btn-txt">` en `index.html`, texto oculto por CSS en móvil).
- **BUG 2 — Catálogos (master-detail) no colapsaba.** Lista y ficha quedaban lado a lado con
  scroll horizontal y contenido cortado. Fix: navegación de 2 pasos — `#catcSplit` gana/pierde
  `.detalle-abierta` (JS: `mostrarDetalleMovil()`/`ocultarDetalleMovil()` en
  `modulo-catalogos-c.js`); por default se ve la LISTA a ancho completo, al elegir un registro se
  ve la FICHA a ancho completo con botón fijo "Volver a la lista" (oculto fuera de móvil con regla
  base explícita — sin ella el `<button>` aparecía también en desktop, detectado y corregido en la
  misma verificación). Pestañas con scroll horizontal propio (`flex-wrap:nowrap;overflow-x:auto`).
