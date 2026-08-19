/* ERP Plein 3.0 — núcleo común
   Cliente Supabase, helpers de formato, consultas a vistas, router y panel de detalle.
   Sin build step: se carga como script clásico y expone window.ERP. */

window.ERP = (function () {
  'use strict';

  const SUPABASE_URL = 'https://wnjomlwevqaxbborikkq.supabase.co';
  // Llave publicable (pública). Las vistas son authenticated-only: sin sesión devuelven 401.
  const KEY = 'sb_publishable_qaNQbKSDDb8teUACJe7pWg_FhabcEJS';
  const REST = SUPABASE_URL + '/rest/v1';

  const sb = supabase.createClient(SUPABASE_URL, KEY);
  let TOKEN = null;

  const encabezados = () => ({ apikey: KEY, Authorization: 'Bearer ' + (TOKEN || KEY) });

  /* ============ Consultas ============ */

  const _cache = new Map();
  function limpiarCache() { _cache.clear(); }

  /** Lee una vista de Supabase. params = string PostgREST, ej. '&order=mes.asc&folio=eq.P-043' */
  function q(vista, params = '') {
    const url = `${REST}/${vista}?select=*${params}`;
    if (_cache.has(url)) return _cache.get(url);
    const p = fetch(url, { headers: encabezados() }).then(async r => {
      if (!r.ok) {
        let msg = '';
        try { msg = (await r.json()).message || ''; } catch (_) { /* sin cuerpo JSON */ }
        throw new Error(`${vista}: HTTP ${r.status}${msg ? ' — ' + msg : ''}`);
      }
      return r.json();
    });
    _cache.set(url, p);
    p.catch(() => _cache.delete(url));
    return p;
  }

  /* Caracteres que PostgREST reserva dentro del valor de un filtro. Solo cuando el
     valor contiene alguno hay que entrecomillarlo. El espacio NO es reservado:
     entrecomillar por costumbre rompe el filtro (bug del 9-jul-2026, ver git). */
  const RESERVADOS_POSTGREST = /[,.:()"]/;

  /** Valor para un filtro PostgREST `col=eq.<valor>`.
      Texto normal ("PAPAYAS AND MORE LLC") → plano.
      Con reservados ("CRI INTERNATIONAL, LLC") → entrecomillado. */
  const eq = valor => {
    const s = String(valor);
    const v = RESERVADOS_POSTGREST.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s;
    return 'eq.' + encodeURIComponent(v);
  };

  /** Llama una función RPC de Supabase (authenticated). */
  async function rpc(nombre, args) {
    const { data, error } = await sb.rpc(nombre, args);
    if (error) throw new Error(error.message);
    return data;
  }

  /* ============ Formato ============ */

  /** Monedas que ofrece el ERP en los selectores de "Nueva orden de venta"/"Cotización-Orden de
      compra"/"Orden de compra" (antes repetido literal en 3 archivos: modulo-ventas.js,
      modulo-comercial.js, modulo-ordenes.js). Única fuente — agregar una moneda aquí la propaga
      a los 3 sin tocar cada archivo. */
  const MONEDAS = ['USD', 'MXN'];

  const num = v => (v === null || v === undefined || v === '') ? 0 : Number(v);

  const fmt = n => num(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = n => num(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

  /** Moneda USD con signo menos tipográfico. */
  function usd(n, decimales = 2) {
    const v = num(n);
    const s = decimales ? fmt(Math.abs(v)) : fmt0(Math.abs(v));
    return (v < 0 ? '−$' : '$') + s;
  }
  const usd0 = n => usd(n, 0);

  // % con 2 decimales; negativos con menos tipográfico (el color rojo lo pone el caller vía clase).
  const pct = n => (n === null || n === undefined) ? '—' : (Number(n) < 0 ? '−' : '') + fmt(Math.abs(n)) + '%';

  /* Utilidad por carga (E39): reglas de pintado compartidas por lista, ficha y Expediente.
     NULL → guion (nunca $0.00); >0 verde, <0 rojo, =0 normal; estimada → " (est.)" + ⓘ con la nota. */
  const utilidadColor = u => u == null ? '' : (num(u) > 0 ? 'var(--verde)' : num(u) < 0 ? 'var(--rojo)' : '');
  const utilidadTexto = (u, estimada, nota) => {
    if (u == null) return '—';
    let s = usd(u);
    if (estimada) s += ' (est.)';
    if (nota) s += ` <span class="info-nota" data-nota="${esc(nota)}" title="${esc(nota)}" role="button" tabindex="0" style="cursor:help;color:var(--gris)">ⓘ</span>`;
    return s;
  };
  const margenTexto = m => m == null ? '—' : fmt(num(m)) + '%';
  /* Cablea los íconos ⓘ (.info-nota) de un contenedor: tooltip en hover (title nativo) + tap/Enter → toast.
     Idempotente (_infoWired). Mismo patrón que ya usa la nota de v_balance en Finanzas. */
  function cablearInfoNota(cont) {
    (cont || document).querySelectorAll('.info-nota[data-nota]').forEach(el => {
      if (el._infoWired) return; el._infoWired = true;
      const mostrar = () => toast('ok', esc(el.dataset.nota));
      // stopPropagation: si el ⓘ está dentro de una fila clickeable (lista de embarques),
      // el tap no debe abrir la ficha, solo mostrar la nota.
      el.addEventListener('click', e => { e.stopPropagation(); mostrar(); });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostrar(); } });
    });
  }

  /* Estatus de cobro (chip) a partir de la fila de v_cxc (o null/undefined si la carga NO está en
     v_cxc → "Sin liquidar": consignación embarcada sin liquidar). Se evalúa en orden; el primero que
     cumple gana. Reúsa la paleta del badge de estado (.badge-estado gris/verde/rojo/azul/ambar). */
  function estatusCobro(cx) {
    if (!cx) return { clave: 'sin_liquidar', texto: 'Sin liquidar', sub: '', clase: 'gris' };
    const saldo = num(cx.saldo_cxc), cobrado = num(cx.cobrado), venta = num(cx.ingreso_venta), vencido = num(cx.dias_vencido);
    if (saldo <= 0.009) return { clave: 'cobrado', texto: 'Cobrado', sub: '', clase: 'verde' };
    if (vencido > 0) {
      // Vencido gana sobre Parcial, pero si YA hubo abono lo mostramos en el sub para no perder
      // esa señal. Nunca NaN: si la venta es 0/nula no se calcula el porcentaje.
      const p = cobrado > 0 && venta > 0.009 ? Math.round(cobrado / venta * 100) : null;
      return { clave: 'vencido', texto: 'Vencido', sub: vencido + 'd' + (p == null ? '' : ` · ${p}% cobrado`), clase: 'rojo' };
    }
    if (cobrado > 0) {
      // Nunca NaN: si la venta es 0/nula no se calcula el porcentaje.
      const p = venta > 0.009 ? Math.round(cobrado / venta * 100) : null;
      return { clave: 'parcial', texto: 'Parcial', sub: p == null ? '' : p + '%', clase: 'azul' };
    }
    return { clave: 'pendiente', texto: 'Pendiente', sub: 'vence en ' + (-vencido) + 'd', clase: 'ambar' };
  }
  /** HTML del chip de cobro: badge (misma pieza que el estado) + texto secundario en gris. */
  function chipCobroHTML(cx) {
    const e = estatusCobro(cx);
    return `<span class="badge-estado ${e.clase}">${e.texto}</span>${e.sub ? ` <span style="font-size:10.5px;color:var(--gris)">${esc(e.sub)}</span>` : ''}`;
  }

  /** Formatea dias_vencido (hoy − f_vencimiento) del backend: >0 vencida, <0 por vencer, 0 hoy.
      Devuelve { txt, cls } — cls ∈ 'venc-si' | 'venc-no' | 'venc-hoy' | '' (la CSS pone el color).
      El valor lo calcula la vista; aquí solo se formatea (no se recalcula en el cliente). */
  function venc(diasVencido) {
    if (diasVencido === null || diasVencido === undefined || diasVencido === '') return { txt: '—', cls: '' };
    const d = Math.round(Number(diasVencido));
    if (isNaN(d)) return { txt: '—', cls: '' };
    const dia = n => (n === 1 ? 'día' : 'días');
    if (d > 0) return { txt: `vencida hace ${d} ${dia(d)}`, cls: 'venc-si' };
    if (d < 0) { const a = Math.abs(d); return { txt: `vence en ${a} ${dia(a)}`, cls: 'venc-no' }; }
    return { txt: 'vence hoy', cls: 'venc-hoy' };
  }

  function fecha(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
  }

  function mesTexto(m) {
    if (!m) return '—';
    const d = new Date(String(m).slice(0, 10) + 'T12:00:00');
    if (isNaN(d)) return String(m);
    return d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' });
  }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** Normaliza para búsquedas locales: minúsculas sin acentos. */
  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /** Semáforo de margen. */
  const semaforo = p => p === null || p === undefined ? '' : Number(p) > 10 ? '🟢' : Number(p) >= 3 ? '🟡' : '🔴';

  /* Colores por estado (sugeridos, cercanos al tablero de Samuel: por confirmar #ab4aba, revision/qc
     #f76808). La ETIQUETA y el ORDEN vienen de v_estados_carga (cache); aquí SOLO se mapea el color.
     Un estado nuevo que el backend agregue cae a 'gris' sin romper nada. */
  const CLASE_ESTADO = {
    'por confirmar': 'lila', 'programada': 'azul', 'en camino': 'ambar', 'entregada': 'azul',
    'revision/qc': 'naranja', 'cerrada': 'verde', 'rechazo': 'rojo', 'falta informacion': 'gris'
  };
  let _estados = null;       // { mapa: Map(norm→info), lista: [info…] por orden, trans: [transiciones] } o null
  let _estadosProm = null;   // promesa en vuelo (evita fetch duplicado)
  /* Catálogo de estados + matriz de transiciones (v_estados_carga + v_estado_transiciones), UN fetch
     cacheado. NO enmascara errores: si truena limpia la promesa (permite reintento) y propaga el error
     al módulo que lo pidió (que muestra su errbox). Se precarga al abrir sesión (app.js). */
  function cargarEstados() {
    if (_estados) return Promise.resolve(_estados);
    if (_estadosProm) return _estadosProm;
    _estadosProm = Promise.all([q('v_estados_carga', '&order=orden.asc'), q('v_estado_transiciones')])
      .then(([estados, trans]) => {
        const lista = estados.map(e => ({
          estado: e.estado, etiqueta: e.etiqueta || e.estado, orden: num(e.orden),
          clase: CLASE_ESTADO[norm(e.estado)] || 'gris',
          cuenta_como_embarque: e.cuenta_como_embarque, exige_po: e.exige_po,
          es_terminal: e.es_terminal, bloquea_cierre: e.bloquea_cierre, descripcion: e.descripcion
        }));
        const mapa = new Map(lista.map(i => [norm(i.estado), i]));
        _estados = { mapa, lista, trans: trans || [] };
        return _estados;
      })
      .catch(err => { _estadosProm = null; throw err; });
    return _estadosProm;
  }
  const catalogoEstados = () => _estados;   // acceso síncrono al cache (o null si aún no cargó)
  /** Info de un estado desde el cache; si no cargó, degrada al valor crudo + gris (no rompe la app). */
  const estadoInfo = estado => (_estados && _estados.mapa.get(norm(estado)))
    || { estado, etiqueta: estado || '—', clase: 'gris', cuenta_como_embarque: true, exige_po: true, es_terminal: false };
  /** → { texto, clase } para pintar un badge de estado de embarque. */
  const estadoEmbarque = estado => { const i = estadoInfo(estado); return { texto: i.etiqueta, clase: i.clase }; };
  /** HTML directo del badge de estado (etiqueta y color del catálogo). */
  const badgeEstado = estado => {
    const e = estadoEmbarque(estado);
    return `<span class="badge-estado ${e.clase}">${esc(e.texto)}</span>`;
  };

  /** Normaliza un folio escrito a mano: "43" → "P-043". */
  function folioNormalizado(t) {
    const f = String(t || '').trim().toUpperCase();
    return /^\d+$/.test(f) ? 'P-' + f.padStart(3, '0') : f;
  }

  /* ============ Utilidades de datos ============ */

  /** Primera columna presente en las filas, de una lista de candidatos. */
  function columna(filas, candidatos) {
    if (!filas || !filas.length) return null;
    const claves = Object.keys(filas[0]);
    for (const c of candidatos) if (claves.includes(c)) return c;
    return null;
  }

  const COLS_MONEDA = /(monto|saldo|ingres|costo|venta|margen|cobrad|pagad|entrada|salida|neto|total|precio|importe|utilidad|deuda|abono|cargo)/i;
  const COLS_FECHA = /(fecha|f_|_at|embarque|vencim)/i;

  function esColumnaNumerica(filas, clave) {
    let vistos = 0;
    for (const f of filas) {
      const v = f[clave];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'boolean') return false;
      if (isNaN(Number(v))) return false;
      vistos++;
    }
    return vistos > 0;
  }

  const etiqueta = c => c.replace(/_/g, ' ').replace(/^./, m => m.toUpperCase());

  /** Tabla genérica: renderiza cualquier arreglo de filas sin conocer su esquema.
      opciones.folio = nombre de la columna de folio → las filas se vuelven clicables. */
  function tablaAuto(filas, opciones = {}) {
    const { ocultar = [], vacio = 'Sin registros.', folio = null } = opciones;
    if (!filas || !filas.length) return `<div class="vacio">${esc(vacio)}</div>`;
    const cols = Object.keys(filas[0]).filter(c => !ocultar.includes(c));
    const numericas = new Set(cols.filter(c => esColumnaNumerica(filas, c)));

    const celda = (c, v) => {
      if (v === null || v === undefined || v === '') return '<td class="' + (numericas.has(c) ? 'num' : '') + '">—</td>';
      if (typeof v === 'boolean') return `<td>${v ? 'Sí' : 'No'}</td>`;
      if (numericas.has(c)) {
        const n = Number(v);
        const txt = COLS_MONEDA.test(c) ? usd(n) : fmt0(n);
        return `<td class="num ${n < 0 ? 'neg' : ''}">${txt}</td>`;
      }
      if (COLS_FECHA.test(c) && /^\d{4}-\d{2}-\d{2}/.test(String(v))) return `<td>${esc(fecha(v))}</td>`;
      return `<td>${esc(v)}</td>`;
    };

    const clicable = folio && Object.prototype.hasOwnProperty.call(filas[0], folio);
    const attrs = f => clicable ? ` class="clic" data-folio="${esc(f[folio])}"` : '';

    return `<div class="tabla-wrap"><table>
      <thead><tr>${cols.map(c => `<th class="${numericas.has(c) ? 'num' : ''}">${esc(etiqueta(c))}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(f => `<tr${attrs(f)}>${cols.map(c => celda(c, f[c])).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  /** Red de seguridad para vistas cuyo esquema aún no está documentado: las lee
      completas y las filtra en el navegador por la primera columna candidata que exista.
      Las vistas de drill-down actuales ya no la usan (filtran server-side con eq()).
      comparar(valorDeLaFila, valorBuscado) → boolean. */
  async function detallePor(vista, candidatos, valor, comparar) {
    const todas = await q(vista);
    const col = columna(todas, candidatos);
    if (!col) return { col: null, filas: todas };
    const cmp = comparar || ((a, b) => norm(a) === norm(b));
    return { col, filas: todas.filter(r => cmp(r[col], valor)) };
  }

  /** Conecta las filas con data-folio de un contenedor a la ficha de carga. */
  function enlazarFolios(contenedor) {
    contenedor.querySelectorAll('tr.clic[data-folio]').forEach(tr =>
      tr.addEventListener('click', () => ERP.verCarga && ERP.verCarga(tr.dataset.folio)));
  }

  /* ============ Combo con búsqueda (autocomplete) ============
     Se monta sobre un contenedor vacío. Filtra por nombre o por cualquier alias,
     pero el valor que entrega es SIEMPRE el nombre canónico del catálogo — teclear
     un alias y elegirlo devuelve el nombre bueno, que es lo que evita las flags de
     "contraparte sin resolver".

     Escribir sin elegir NO cuenta como valor: hay que seleccionar de la lista o usar
     "+ Nuevo". Así un texto a medio escribir nunca llega al RPC por accidente.

     crearCombo({contenedor, items, placeholder, permitirNuevo, etiquetaNuevo, alCambiar, valorInicial})
       items: [{id, nombre, alias?: string[], destacado?: bool}]  — destacado sube el item al
         principio de la lista (guía suave por contraparte, E55); no oculta ni bloquea el resto.
       valorInicial: nombre de un item para dejarlo ya elegido (ignora lo que no exista)
       → { valor(), valorId(), esNuevo(), limpiar(), enfocar(), elemento,
           actualizarItems(nuevos), seleccionar({id,nombre}) } */

  function crearCombo(opciones) {
    const {
      contenedor, placeholder = '',
      permitirNuevo = false, etiquetaNuevo = 'registro', alCambiar = null,
      valorInicial = null
    } = opciones;
    // `let` (no const): actualizarItems() la reemplaza para reordenar/destacar en vivo
    // (guía suave de producto por contraparte, E55) sin recrear el combo.
    let items = opciones.items || [];

    let seleccion = null;    // { nombre, nuevo: bool }
    let resaltado = -1;
    let opcionesVisibles = [];   // [{tipo:'item'|'nuevo', nombre}]

    contenedor.classList.add('combo');
    contenedor.innerHTML = `
      <input type="text" class="combo-input" autocomplete="off" spellcheck="false"
             role="combobox" aria-expanded="false" placeholder="${esc(placeholder)}">
      <div class="combo-lista" role="listbox"></div>`;

    const input = contenedor.querySelector('.combo-input');
    const lista = contenedor.querySelector('.combo-lista');

    const coincide = (it, t) =>
      !t || norm(it.nombre).includes(t) || (it.alias || []).some(a => norm(a).includes(t));

    function calcular(texto) {
      const t = norm(texto.trim());
      const encontrados = items.filter(it => coincide(it, t))
        .map(it => ({ tipo: 'item', id: it.id, nombre: it.nombre, alias: it.alias || [], destacado: !!it.destacado }));
      // Destacados primero, orden ESTABLE (no revuelve el resto): guía suave de producto por
      // contraparte (E55) — sugiere, nunca oculta ni bloquea las demás opciones.
      encontrados.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0));
      const limitados = encontrados.slice(0, 50);

      /* "+ Nuevo" aparece solo cuando lo escrito NO coincide con nada del catálogo.
         Si hay aunque sea una coincidencia parcial, la opción se esconde: ofrecerla
         mientras el registro bueno está a la vista es invitar a crear un duplicado
         —justo lo que genera las flags de "contraparte sin resolver"—. */
      if (permitirNuevo && t.length >= 2 && !limitados.length) {
        limitados.push({ tipo: 'nuevo', nombre: texto.trim() });
      }
      return limitados;
    }

    function pintar(texto) {
      opcionesVisibles = calcular(texto);
      resaltado = opcionesVisibles.length ? 0 : -1;

      if (!opcionesVisibles.length) {
        lista.innerHTML = '<div class="combo-vacio">Nada coincide en el catálogo.</div>';
      } else {
        const t = norm(texto.trim());
        lista.innerHTML = opcionesVisibles.map((o, i) => {
          if (o.tipo === 'nuevo') {
            return `<div class="combo-item nuevo ${i === resaltado ? 'sel' : ''}" data-i="${i}" role="option">
              <span class="mas">+</span>
              <span class="txt">Nuevo ${esc(etiquetaNuevo)}: <b>${esc(o.nombre)}</b></span>
            </div>`;
          }
          // Si acertó por alias, muéstralo: así entiende por qué salió ese nombre.
          const porAlias = t && !norm(o.nombre).includes(t)
            ? o.alias.find(a => norm(a).includes(t)) : null;
          return `<div class="combo-item ${o.destacado ? 'destacado' : ''} ${i === resaltado ? 'sel' : ''}" data-i="${i}" role="option">
            ${o.destacado ? '<span class="combo-destacado" title="Ya trabaja con esta contraparte">★</span>' : ''}
            <span class="txt">${esc(o.nombre)}</span>
            ${porAlias ? `<span class="alias">alias: ${esc(porAlias)}</span>` : ''}
          </div>`;
        }).join('');
      }
      abrir();
    }

    function abrir() { lista.classList.add('abierta'); input.setAttribute('aria-expanded', 'true'); }
    function cerrar() { lista.classList.remove('abierta'); input.setAttribute('aria-expanded', 'false'); }

    function elegir(i) {
      const o = opcionesVisibles[i];
      if (!o) return;
      seleccion = { nombre: o.nombre, nuevo: o.tipo === 'nuevo', id: o.tipo === 'nuevo' ? null : (o.id ?? null) };
      input.value = o.nombre;
      contenedor.classList.add('elegido');
      contenedor.classList.toggle('es-nuevo', seleccion.nuevo);
      cerrar();
      if (alCambiar) alCambiar(seleccion);
    }

    function mover(paso) {
      if (!opcionesVisibles.length) return;
      resaltado = (resaltado + paso + opcionesVisibles.length) % opcionesVisibles.length;
      lista.querySelectorAll('.combo-item').forEach((el, i) => el.classList.toggle('sel', i === resaltado));
      const el = lista.querySelector('.combo-item.sel');
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('input', () => {
      // Al reescribir se pierde la selección: el texto a medias no es un valor válido.
      seleccion = null;
      contenedor.classList.remove('elegido', 'es-nuevo');
      if (alCambiar) alCambiar(null);
      pintar(input.value);
    });

    input.addEventListener('focus', () => pintar(input.value));

    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); if (!lista.classList.contains('abierta')) pintar(input.value); else mover(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (resaltado >= 0) elegir(resaltado); }
      else if (e.key === 'Escape') { cerrar(); }
      else if (e.key === 'Tab') { cerrar(); }
    });

    // mousedown (no click) para que dispare antes del blur del input; sirve para touch.
    lista.addEventListener('mousedown', e => {
      const item = e.target.closest('.combo-item');
      if (item) { e.preventDefault(); elegir(Number(item.dataset.i)); }
    });

    input.addEventListener('blur', () => setTimeout(cerrar, 120));

    /* Preselección: solo vale si el nombre existe en el catálogo. Un valorInicial que
       no coincide se ignora en silencio y el combo queda vacío — nunca se inventa un
       valor que el backend luego rechazaría. */
    if (valorInicial) {
      const it = items.find(i => norm(i.nombre) === norm(valorInicial));
      if (it) {
        seleccion = { nombre: it.nombre, nuevo: false, id: it.id ?? null };
        input.value = it.nombre;
        contenedor.classList.add('elegido');
      }
    }

    return {
      elemento: contenedor,
      valor: () => (seleccion ? seleccion.nombre : null),
      valorId: () => (seleccion ? seleccion.id : null),
      esNuevo: () => !!(seleccion && seleccion.nuevo),
      textoCrudo: () => input.value.trim(),
      limpiar() { seleccion = null; input.value = ''; contenedor.classList.remove('elegido', 'es-nuevo'); },
      enfocar() { input.focus(); },
      /** Reemplaza el catálogo del combo (p.ej. con `destacado` recalculado por contraparte).
          No toca la selección ni el texto actuales; si la lista está abierta, la repinta. */
      actualizarItems(nuevos) {
        items = Array.isArray(nuevos) ? nuevos : [];
        if (lista.classList.contains('abierta')) pintar(input.value);
      },
      /** Selección programática (precarga desde un programa comercial, E55): mismo efecto que
          si el usuario lo hubiera elegido de la lista (dispara alCambiar), sin exigir que el
          item ya esté en `items` — el valor viene de una vista de backend, no se inventa. */
      seleccionar(item) {
        if (!item) { this.limpiar(); return; }
        seleccion = { nombre: item.nombre, nuevo: false, id: item.id ?? null };
        input.value = item.nombre;
        contenedor.classList.add('elegido');
        contenedor.classList.remove('es-nuevo');
        cerrar();
        if (alCambiar) alCambiar(seleccion);
      }
    };
  }

  /** Picker de SKU reutilizable — mismo look & feel que crearCombo (clases .combo/.combo-item)
      pero busca en SERVIDOR vía fn_cat_sugerir_sku (ranking tolerante a typos) en vez de filtrar
      un arreglo local, porque el universo de SKUs es demasiado grande/dinámico para precargar.
      Primer enganche: vincular cliente↔SKU en Catálogos. Pensado para reusarse tal cual en
      líneas de Sales Orders y Compras (pasando `productoId` cuando la línea ya trae producto). */
  function crearPickerSku(opciones) {
    const {
      contenedor, placeholder = 'Buscar SKU…',
      alCambiar = null, valorInicial = null   // valorInicial: { sku_id, etiqueta, producto_id?, es_vinculado? } — precarga sin RPC
    } = opciones;
    let productoId = opciones.productoId ?? null;
    let contraparteId = opciones.contraparteId ?? null;
    // Con contraparteId puesto, arranca acotado a lo que ese cliente ya compra (D-1xx) —
    // "ver todos" queda como un toggle, nunca oculta el catálogo completo permanentemente.
    let soloVinculados = opciones.soloVinculados ?? (contraparteId != null);

    let itemsActuales = [];   // últimas filas de fn_cat_sugerir_sku
    let seleccion = null;     // { sku_id, etiqueta, producto_id, es_vinculado }
    let resaltado = -1;
    let peticion = 0;         // guard de carreras: descarta respuestas que llegan fuera de orden
    let debounceT = null;
    let cargado = false;      // evita relanzar la carga inicial en cada focus
    let input, lista, toggleBtn;

    contenedor.classList.add('combo', 'picker-sku');

    function abrir() { lista.classList.add('abierta'); input.setAttribute('aria-expanded', 'true'); }
    function cerrar() { if (lista) lista.classList.remove('abierta'); if (input) input.setAttribute('aria-expanded', 'false'); }

    /** Etiqueta larga y completa — nunca se corta con "…" (D-1xx: el problema original). */
    function pintar() {
      resaltado = itemsActuales.length ? 0 : -1;
      lista.innerHTML = !itemsActuales.length
        ? '<div class="combo-vacio">Nada coincide.</div>'
        : itemsActuales.map((o, i) => `
          <div class="combo-item ${o.es_sugerencia ? 'destacado' : ''} ${i === resaltado ? 'sel' : ''}" data-i="${i}" role="option">
            ${o.es_sugerencia ? '<span class="combo-destacado" title="Mejor coincidencia">★</span>' : ''}
            <span class="txt">${esc(o.etiqueta)}</span>
            ${o.es_vinculado ? '<span class="picker-sku-vinc-tag">del cliente</span>' : ''}
          </div>`).join('');
      abrir();
    }

    async function buscar(texto) {
      const mio = ++peticion;
      lista.innerHTML = '<div class="combo-vacio">Buscando…</div>';
      abrir();
      let filas;
      try {
        filas = await rpc('fn_cat_sugerir_sku', {
          p_texto: texto || '', p_producto_id: productoId, p_umbral: 0.3,
          p_contraparte_id: contraparteId, p_solo_vinculados: !!(contraparteId && soloVinculados)
        });
      } catch (e) {
        if (mio !== peticion) return;
        lista.innerHTML = `<div class="combo-vacio">No se pudo buscar: ${esc(e.message)}</div>`;
        return;
      }
      if (mio !== peticion) return;   // llegó tarde, ya hay otra búsqueda en curso
      cargado = true;
      itemsActuales = Array.isArray(filas) ? filas : [];
      pintar();
    }

    function mover(paso) {
      if (!itemsActuales.length) return;
      resaltado = (resaltado + paso + itemsActuales.length) % itemsActuales.length;
      lista.querySelectorAll('.combo-item').forEach((el, i) => el.classList.toggle('sel', i === resaltado));
      const el = lista.querySelector('.combo-item.sel');
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    /** Modo búsqueda: input + dropdown (idéntico a antes, más el toggle de acotado por cliente). */
    function renderBusqueda() {
      contenedor.classList.remove('elegido');
      contenedor.innerHTML = `
        <div class="picker-sku-buscador">
          <input type="text" class="combo-input" autocomplete="off" spellcheck="false"
                 role="combobox" aria-expanded="false" placeholder="${esc(placeholder)}">
          ${contraparteId != null ? `<button type="button" class="picker-sku-toggle">${soloVinculados ? 'Ver todos los SKU' : 'Solo del cliente'}</button>` : ''}
        </div>
        <div class="combo-lista" role="listbox"></div>`;
      input = contenedor.querySelector('.combo-input');
      lista = contenedor.querySelector('.combo-lista');
      toggleBtn = contenedor.querySelector('.picker-sku-toggle');

      input.addEventListener('input', () => {
        seleccion = null;
        if (alCambiar) alCambiar(null);
        clearTimeout(debounceT);
        const texto = input.value;
        debounceT = setTimeout(() => buscar(texto), 200);   // debounce ~200ms
      });
      input.addEventListener('focus', () => { cargado ? abrir() : buscar(input.value); });
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); if (!lista.classList.contains('abierta')) buscar(input.value); else mover(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); if (resaltado >= 0) elegir(resaltado); }
        else if (e.key === 'Escape') { cerrar(); }
        else if (e.key === 'Tab') { cerrar(); }
      });
      lista.addEventListener('mousedown', e => {
        const item = e.target.closest('.combo-item');
        if (item) { e.preventDefault(); elegir(Number(item.dataset.i)); }
      });
      input.addEventListener('blur', () => setTimeout(cerrar, 120));
      if (toggleBtn) toggleBtn.addEventListener('click', () => {
        soloVinculados = !soloVinculados;
        toggleBtn.textContent = soloVinculados ? 'Ver todos los SKU' : 'Solo del cliente';
        cargado = false;
        buscar(input.value);
        input.focus();
      });
    }

    /** Modo elegido: chip ancho con la etiqueta COMPLETA (nunca un input diminuto) + lápiz para cambiar. */
    function renderChip() {
      contenedor.classList.add('elegido');
      contenedor.innerHTML = `
        <div class="picker-sku-chip">
          <span class="txt">${esc(seleccion.etiqueta)}</span>
          ${seleccion.es_vinculado ? '<span class="picker-sku-vinc" title="Este cliente ya compra este SKU">★ del cliente</span>' : ''}
          <button type="button" class="picker-sku-editar" title="Cambiar SKU"><i class="ti ti-pencil"></i></button>
        </div>`;
      contenedor.querySelector('.picker-sku-editar').addEventListener('click', () => {
        seleccion = null;
        if (alCambiar) alCambiar(null);
        renderBusqueda();
        input.focus();
      });
    }

    function elegir(i) {
      const o = itemsActuales[i];
      if (!o) return;
      seleccion = { sku_id: o.sku_id, etiqueta: o.etiqueta, producto_id: o.producto_id ?? null, es_vinculado: !!o.es_vinculado };
      renderChip();
      if (alCambiar) alCambiar(seleccion);
    }

    if (valorInicial && valorInicial.sku_id != null) {
      seleccion = { sku_id: valorInicial.sku_id, etiqueta: valorInicial.etiqueta || '', producto_id: valorInicial.producto_id ?? null, es_vinculado: !!valorInicial.es_vinculado };
      renderChip();
    } else {
      renderBusqueda();
    }

    return {
      elemento: contenedor,
      valorId: () => (seleccion ? seleccion.sku_id : null),
      valorEtiqueta: () => (seleccion ? seleccion.etiqueta : null),
      valorProductoId: () => (seleccion ? seleccion.producto_id : null),
      valorEsVinculado: () => !!(seleccion && seleccion.es_vinculado),
      limpiar() { seleccion = null; renderBusqueda(); },
      enfocar() { if (input) input.focus(); },
      /** Acota/cambia el producto (p.ej. la línea de la Sales Order ya eligió producto) y
          fuerza una recarga con el texto actual — no toca la selección existente. */
      acotarProducto(pid) { productoId = pid ?? null; cargado = false; if (lista && lista.classList.contains('abierta')) buscar(input.value); },
      /** Cambia el cliente al que se acota la búsqueda (p.ej. el CPO ya resolvió su cliente
          después de montar el picker). Resetea soloVinculados al default de "hay cliente". */
      acotarContraparte(cid) { contraparteId = cid ?? null; soloVinculados = contraparteId != null; cargado = false; },
      seleccionar(item) {
        if (!item) { this.limpiar(); return; }
        seleccion = { sku_id: item.sku_id, etiqueta: item.etiqueta || '', producto_id: item.producto_id ?? null, es_vinculado: !!item.es_vinculado };
        renderChip();
        if (alCambiar) alCambiar(seleccion);
      }
    };
  }

  /* ============ Panel lateral (drawer) ============ */

  /* Desmontaje REAL del contenido del panel — no solo ocultarlo con una clase CSS. Destruye el
     subárbol (removeChild nodo por nodo, no solo innerHTML='') para que cualquier picker/combo/
     listener que hubiera quedado vivo ahí se pierda con el nodo, y no dependa de que el próximo
     abrirPanel() lo pise a tiempo. Se llama tanto al cerrar como, defensivamente, al INICIO de
     todo abrirPanel() — así ningún módulo necesita acordarse de llamar cerrarPanel() primero
     antes de encadenar a otro panel (causa más probable de "paneles montados uno sobre otro").
     Centralizado aquí: cubre los ~30 módulos que usan el drawer, no solo el que reportó el bug. */
  function desmontarPanel() {
    const panelBody = document.getElementById('panelBody');
    while (panelBody.firstChild) panelBody.removeChild(panelBody.firstChild);
    document.getElementById('panelTitulo').innerHTML = '—';
    document.getElementById('panelSub').innerHTML = '';
  }

  function abrirPanel(titulo, subtitulo, cuerpoHtml) {
    desmontarPanel();
    document.getElementById('panelTitulo').innerHTML = titulo;
    document.getElementById('panelSub').innerHTML = subtitulo || '';
    document.getElementById('panelBody').innerHTML = cuerpoHtml;
    document.getElementById('panelOv').classList.add('abierto');
    document.getElementById('panel').classList.add('abierto');
    document.body.style.overflow = 'hidden';
  }
  function panelCuerpo(html) { document.getElementById('panelBody').innerHTML = html; }

  /* ============ Toast (notificación transitoria, no bloquea) ============
     Para confirmar una captura en contexto sin navegar ni robar el foco. */
  function toast(tipo, html, ms = 4500) {
    let host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      document.body.appendChild(host);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (tipo || 'ok');
    el.innerHTML = html;
    host.appendChild(el);
    // fuerza reflow para que la transición de entrada corra
    void el.offsetWidth;
    el.classList.add('visible');
    setTimeout(() => {
      el.classList.remove('visible');
      setTimeout(() => el.remove(), 300);
    }, ms);
  }

  /* Envío interino de un documento por correo (mailto). INTERINO: mailto NO puede adjuntar el PDF,
     así que se abre el borrador con destinatario/asunto/cuerpo y, en paralelo, se dispara la
     descarga/impresión del PDF con un aviso para que el usuario lo adjunte a mano. Cuando exista el
     envío directo (Resend + dominio), este helper se reemplaza por un "Enviar" real que adjunta el
     PDF y archiva la copia. Reutilizable por Facturación (cliente), Órdenes (proveedor) y
     Liquidaciones (productor) — todos pasan { email, asunto, cuerpo, sinEmailAviso, descargar }.
     Si email viene vacío: se abre el correo con "Para" vacío y se avisa que falta el correo. */
  function enviarPorCorreoDoc(opts) {
    const o = opts || {};
    const params = [];
    if (o.asunto) params.push('subject=' + encodeURIComponent(o.asunto));
    if (o.cuerpo) params.push('body=' + encodeURIComponent(o.cuerpo));
    const dest = o.email ? String(o.email).trim() : '';
    const href = 'mailto:' + encodeURIComponent(dest).replace(/%40/g, '@') + (params.length ? '?' + params.join('&') : '');
    // Un <a> temporal en vez de location.href: entrega el mailto al cliente de correo sin recargar la SPA.
    const a = document.createElement('a');
    a.href = href; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();

    if (!dest) toast('warn', o.sinEmailAviso || 'El destinatario no tiene correo en el catálogo — captúralo en Directorio Comercial.', 8000);
    toast('ok', 'Se abrió tu correo. <b>Adjunta el PDF que se acaba de descargar</b> antes de enviar.', 8000);
    // El PDF no viaja en el mailto: se dispara aparte (window.print del documento) para que el usuario lo adjunte.
    if (typeof o.descargar === 'function') { try { o.descargar(); } catch (_) { /* no romper el flujo si la impresión falla */ } }
  }

  function cerrarPanel() {
    const estabaAbierto = document.getElementById('panel').classList.contains('abierto');
    document.getElementById('panelOv').classList.remove('abierto');
    document.getElementById('panel').classList.remove('abierto');
    desmontarPanel();
    document.body.style.overflow = '';
    // Si se escribió algo mientras el panel estaba abierto, el módulo de fondo está viejo.
    if (estabaAbierto && datosSucios) { datosSucios = false; despachar(); }
  }

  /* ============ Router ============ */

  const modulos = {};
  /** registrar('cargas', {titulo, descripcion, render(contenedor, parametro)}) */
  function registrar(id, def) { modulos[id] = def; }
  function moduloExiste(id) { return !!modulos[id]; }

  function ir(ruta) { location.hash = '#/' + ruta; }
  function irModulo(id, parametro) { ir(id + (parametro ? '/' + encodeURIComponent(parametro) : '')); }

  function rutaActual() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const partes = h.split('/');
    return { modulo: partes[0] || 'inicio', parametro: partes[1] ? decodeURIComponent(partes.slice(1).join('/')) : null };
  }

  let moduloActivo = null;

  async function despachar() {
    const { modulo, parametro } = rutaActual();
    const def = modulos[modulo];
    const app = document.getElementById('app');
    if (!def) { ir('inicio'); return; }

    moduloActivo = modulo;
    document.querySelectorAll('nav.lateral a.item').forEach(a =>
      a.classList.toggle('activo', a.dataset.modulo === modulo));
    // E97 (MARCO): avisa al riel/barra de módulo para sincronizar grupo activo + miga de pan.
    // Desacoplado por evento: comun.js no conoce el marco; app.js escucha 'erp:navegar'.
    window.dispatchEvent(new CustomEvent('erp:navegar', { detail: { modulo } }));
    cerrarMenu();
    cerrarPanel();
    window.scrollTo(0, 0);

    app.innerHTML = `
      <div class="mod-head">
        <h1>${esc(def.titulo)}</h1>
        ${def.descripcion ? `<div class="desc">${esc(def.descripcion)}</div>` : ''}
      </div>
      <div id="modContenido"><div class="skel">Cargando ${esc(def.titulo.toLowerCase())}…</div></div>`;

    const cont = document.getElementById('modContenido');
    try {
      await def.render(cont, parametro);
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudo cargar el módulo: ${esc(e.message)}<br>
        Revisa tu conexión y pulsa <b>Actualizar</b>.</div>`;
    }
  }

  function recargar() { limpiarCache(); despachar(); }

  /* ============ Menú móvil ============ */
  function alternarMenu() {
    document.querySelector('nav.lateral').classList.toggle('abierto');
    document.querySelector('.menu-fondo').classList.toggle('abierto');
  }
  function cerrarMenu() {
    document.querySelector('nav.lateral').classList.remove('abierto');
    document.querySelector('.menu-fondo').classList.remove('abierto');
  }

  /* ============ Responsive: patrón TABLA → TARJETA (Fase 1, D-193) ============
     Utilidad reusable, NO ad-hoc por módulo. Marca las tablas de un contenedor para que en
     móvil (<=640px) cada fila se apile como tarjeta con la etiqueta de cada campo visible.
     Cómo: agrega la clase .tabla-cards al .tabla-wrap y copia el texto del <th> de cada columna
     al atributo data-label del <td> correspondiente (el CSS lo pinta con ::before en móvil).
     En desktop/tablet no cambia nada (las reglas .tabla-cards solo viven bajo @media 640).
     Idempotente: se puede llamar tras cada repintado de tabla sin efectos acumulados.
     Uso típico (Fase 2, una línea por módulo tras pintar la tabla):  ERP.marcarTabla(cont);
     `ref` puede ser un id (string), un elemento contenedor, o una <table> directamente. */
  function marcarTabla(ref) {
    const cont = typeof ref === 'string' ? document.getElementById(ref) : ref;
    if (!cont) return;
    const tablas = (cont.matches && cont.matches('table')) ? [cont] : cont.querySelectorAll('table');
    tablas.forEach(tabla => {
      const wrap = tabla.closest('.tabla-wrap') || tabla.parentElement;
      if (wrap) wrap.classList.add('tabla-cards');
      // Etiquetas = texto de cada <th> del encabezado (columnas de acciones sin texto → sin etiqueta).
      const ths = [...tabla.querySelectorAll('thead th')].map(th => th.textContent.trim());
      tabla.querySelectorAll('tbody tr').forEach(tr => {
        const celdas = [...tr.children].filter(c => c.tagName === 'TD');
        // Filas con una sola celda con colspan (ej. "Sin líneas"): no se etiquetan.
        if (celdas.length === 1 && celdas[0].hasAttribute('colspan')) return;
        celdas.forEach((td, i) => {
          if (ths[i] && !td.hasAttribute('data-label') && !td.hasAttribute('colspan')) {
            td.setAttribute('data-label', ths[i]);
          }
        });
      });
    });
  }

  /* ============ Sesión y permisos ============
     v_mi_perfil trae una sola fila para el usuario logueado:
     socio_codigo, nombre, rol, puede_ver, puede_capturar, puede_editar, puede_administrar.
     Se lee UNA vez al iniciar sesión y vive aquí; los módulos consultan ERP.perfil
     o ERP.puede('capturar'). Ante cualquier fallo, el perfil queda en solo lectura:
     ocultar un botón de más es inocuo, mostrarlo de más invita a un rechazo del backend. */

  const PERFIL_SIN_PERMISOS = {
    socio_codigo: null, nombre: null, rol: null,
    puede_ver: false, puede_capturar: false, puede_editar: false, puede_administrar: false,
    modulos: []   // E88: claves de módulo visibles para este perfil; vacío = nada (fail-closed)
  };
  let perfil = { ...PERFIL_SIN_PERMISOS };

  async function cargarPerfil() {
    try {
      const { data, error } = await sb.from('v_mi_perfil').select('*').maybeSingle();
      if (error) throw new Error(error.message);
      perfil = data ? { ...PERFIL_SIN_PERMISOS, ...data } : { ...PERFIL_SIN_PERMISOS };
    } catch (_) {
      perfil = { ...PERFIL_SIN_PERMISOS };
    }
    return perfil;
  }

  /** ERP.puede('capturar') · ERP.puede('editar') · ERP.puede('administrar') · ERP.puede('ver') */
  const puede = accion => perfil['puede_' + accion] === true;

  /* El backend es la autoridad de permisos: si una RPC rechaza por rol, su mensaje contiene
     "Sin permiso" o "PERMISO_DENEGADO". Lo convertimos en un toast claro en español en vez de
     mostrar el error crudo. avisarSiPermiso() devuelve true si manejó el error. */
  const RE_PERMISO = /sin permiso|permiso_denegado|no autoriz/i;
  const esPermisoDenegado = e => RE_PERMISO.test((e && e.message) ? e.message : String(e || ''));
  function avisarSiPermiso(e) {
    if (!esPermisoDenegado(e)) return false;
    toast('err', `No tienes permiso para esta acción. Tu rol es <b>${esc(perfil.rol || '—')}</b>; ` +
      `pídeselo a un administrador.`);
    return true;
  }

  /* ============ Invalidación tras escribir ============
     Después de un RPC de escritura los datos en pantalla quedan viejos. Marcamos
     la caché como sucia; al cerrar el panel se re-renderiza el módulo de fondo. */

  let datosSucios = false;

  function marcarDatosSucios() {
    datosSucios = true;
    limpiarCache();
    window.dispatchEvent(new Event('erp:escritura'));
  }

  /** true si el drawer de captura está abierto — para que el auto-refresco no interrumpa
      una captura en curso (ver app.js). */
  function panelAbierto() { return document.getElementById('panel').classList.contains('abierto'); }

  return {
    sb, q, rpc, eq, limpiarCache, recargar,
    num, fmt, fmt0, usd, usd0, pct, MONEDAS, utilidadColor, utilidadTexto, margenTexto, cablearInfoNota, estatusCobro, chipCobroHTML, venc, fecha, mesTexto, esc, norm, semaforo, estadoEmbarque, badgeEstado, cargarEstados, catalogoEstados, estadoInfo, folioNormalizado,
    columna, tablaAuto, etiqueta, enlazarFolios, detallePor, crearCombo, crearPickerSku,
    abrirPanel, panelCuerpo, cerrarPanel, panelAbierto, toast, enviarPorCorreoDoc,
    registrar, moduloExiste, ir, irModulo, rutaActual, despachar,
    alternarMenu, cerrarMenu, marcarTabla, cargarPerfil, puede, esPermisoDenegado, avisarSiPermiso, marcarDatosSucios,
    get perfil() { return perfil; },
    get moduloActivo() { return moduloActivo; },
    setToken(t) { TOKEN = t; },
    get token() { return TOKEN; },
  };
})();
