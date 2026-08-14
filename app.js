/* ERP Plein 3.0 — arranque del shell: login, buscador universal, router. */

(function () {
  'use strict';
  const { sb, q, rpc, esc, norm } = ERP;
  const $ = id => document.getElementById(id);

  /* ================= Login ================= */

  async function entrar() {
    const btn = $('liBtn'), err = $('liErr');
    btn.disabled = true; err.style.display = 'none';
    const { data, error } = await sb.auth.signInWithPassword({
      email: $('liEmail').value.trim(),
      password: $('liPass').value
    });
    btn.disabled = false;
    if (error) {
      err.style.display = 'block';
      err.textContent = 'No se pudo entrar: correo o contraseña incorrectos.';
      return;
    }
    sesionActiva(data.session);
  }

  async function salir() { await sb.auth.signOut(); location.reload(); }

  async function sesionActiva(session) {
    ERP.setToken(session.access_token);
    $('loginOv').style.display = 'none';
    $('shell').classList.add('visible');
    const perfil = await ERP.cargarPerfil();
    pintarPerfil(perfil);
    aplicarMenuDinamico();
    marcarEstado('ok');
    // Precarga el catálogo de estados/transiciones para que los badges pinten bien desde el primer
    // render. Si truena, la app sigue (badges degradan a crudo) y el módulo que lo necesite reintenta
    // y muestra su errbox — no se enmascara.
    await ERP.cargarEstados().catch(() => {});
    ERP.despachar();
    refrescarBadgeFlags();
    refrescarBadgeFaltantes();
    refrescarBadgeLiquidaciones();
    // Presencia en línea: latido + indicador de socios conectados en el header (módulo aparte).
    if (ERP.iniciarPresencia) ERP.iniciarPresencia();
  }

  /* ================= MARCO (E97): riel de grupos + barra de módulo + menú agrupado =========
     La lógica de PERMISOS es la misma de E88/D-105 — un ítem se pinta solo si su clave está en
     ERP.perfil.modulos. El MARCO solo cambia la PRESENTACIÓN: agrupa los ítems por eyebrow, y
     además oculta el encabezado del grupo (y su ícono en el riel) cuando el grupo se queda sin
     ningún ítem visible para ese usuario. Nada de esto toca backend ni el filtro por módulo. */

  // Etiqueta + ícono de cada grupo (para el chip/miga de la barra de módulo). El orden y los
  // miembros de cada grupo viven en el HTML (nav.lateral .nav-grupo[data-grupo] > a.item), no aquí.
  const GRUPO_META = {
    inicio:    { label: 'Inicio',    icono: 'ti-home' },
    operacion: { label: 'Operación', icono: 'ti-package' },
    'camino-c': { label: 'Camino C', icono: 'ti-route' },
    dinero:    { label: 'Dinero',    icono: 'ti-cash' },
    finanzas:  { label: 'Finanzas',  icono: 'ti-chart-bar' },
    catalogos: { label: 'Catálogos', icono: 'ti-book-2' },
    revision:  { label: 'Revisión',  icono: 'ti-checkup-list' },
    admin:     { label: 'Admin',     icono: 'ti-shield-lock' }
  };

  // Mapas derivados del DOM (DRY: la fuente de verdad es el markup del menú). modulo→grupo y
  // modulo→título legible (para la miga de pan). Se construyen una vez al cargar app.js.
  const moduloAGrupo = new Map();
  const tituloDeModulo = new Map();
  document.querySelectorAll('nav.lateral .nav-grupo').forEach(g => {
    g.querySelectorAll('a.item[data-modulo]').forEach(a => {
      moduloAGrupo.set(a.dataset.modulo, g.dataset.grupo);
      // Título = texto del ítem sin el badge (que va como <span class="badge"> al final).
      const clon = a.cloneNode(true);
      clon.querySelectorAll('.badge').forEach(b => b.remove());
      tituloDeModulo.set(a.dataset.modulo, clon.textContent.trim());
    });
  });

  /** Filtra los ítems por ERP.perfil.modulos y luego sincroniza grupos vacíos + riel. */
  function aplicarMenuDinamico() {
    const modulos = Array.isArray(ERP.perfil.modulos) ? ERP.perfil.modulos : [];
    document.querySelectorAll('nav.lateral a.item[data-modulo]').forEach(a => {
      if (a.dataset.modulo === 'faltantes') return;   // lo controla refrescarBadgeFaltantes (permiso + contador)
      a.style.display = modulos.includes(a.dataset.modulo) ? '' : 'none';
    });
    sincronizarGrupos();
  }

  /** Oculta el encabezado de un grupo (y su ícono de riel) si no le queda ningún ítem visible. */
  function sincronizarGrupos() {
    document.querySelectorAll('nav.lateral .nav-grupo').forEach(g => {
      const hayVisibles = [...g.querySelectorAll('a.item[data-modulo]')].some(a => a.style.display !== 'none');
      g.style.display = hayVisibles ? '' : 'none';
      const rail = document.querySelector('.icrail .ic[data-grupo="' + g.dataset.grupo + '"]');
      if (rail) rail.style.display = hayVisibles ? '' : 'none';
    });
  }

  /** Sincroniza el riel (grupo activo) y la barra de módulo (chip de grupo + miga) con el módulo
      actual. Se dispara por el evento 'erp:navegar' que emite despachar() en comun.js. */
  function sincronizarMarco(modulo) {
    const grupo = moduloAGrupo.get(modulo);
    document.querySelectorAll('.icrail .ic[data-grupo]').forEach(ic =>
      ic.classList.toggle('on', ic.dataset.grupo === grupo));
    const meta = GRUPO_META[grupo];
    const chipIco = $('modChipIco'), chipTxt = $('modChipTxt'), pg = $('modPg');
    if (meta && chipTxt) chipTxt.textContent = meta.label;
    if (meta && chipIco) chipIco.className = 'ti ' + meta.icono;
    if (pg) pg.textContent = tituloDeModulo.get(modulo) || '';
  }

  /** Clic en un ícono del riel: va al PRIMER módulo visible de ese grupo (respeta permisos).
      aplicarMenuDinamico/refrescarBadgeFaltantes fijan a.style.display por ítem, así que basta
      leer esa propiedad (no depende de layout ni de si el cajón móvil está abierto). */
  function irAGrupo(grupo) {
    const items = document.querySelectorAll('nav.lateral .nav-grupo[data-grupo="' + grupo + '"] a.item[data-modulo]');
    for (const a of items) {
      if (a.style.display !== 'none') { ERP.ir(a.dataset.modulo); return; }
    }
  }

  /** Muestra quién eres y qué puedes hacer, para que nadie se pregunte por qué no ve un botón. */
  function pintarPerfil(p) {
    const el = $('perfil');
    if (!p || !p.socio_codigo) { el.style.display = 'none'; return; }
    const capacidad = p.puede_editar ? 'edita' : p.puede_capturar ? 'captura' : 'solo lectura';
    el.style.display = 'flex';
    el.innerHTML = `<b>${esc(p.nombre || p.socio_codigo)}</b><span>${esc(p.rol || '')} · ${esc(capacidad)}</span>`;
    el.title = `${p.socio_codigo} · rol ${p.rol}`;
  }

  function marcarEstado(estado, texto) {
    const dot = $('dot');
    dot.className = 'dot' + (estado === 'load' ? ' load' : estado === 'err' ? ' err' : '');
    $('ultimaAct').textContent = texto || (
      estado === 'err' ? 'error de conexión'
        : estado === 'load' ? 'cargando…'
          : 'actualizado ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
    );
  }

  async function actualizar() {
    $('btnRf').disabled = true;
    marcarEstado('load');
    try {
      ERP.limpiarCache();
      await ERP.despachar();
      await refrescarBadgeFlags();
      await refrescarBadgeFaltantes();
      await refrescarBadgeLiquidaciones();
      marcarEstado('ok');
    } catch (e) {
      marcarEstado('err');
    }
    $('btnRf').disabled = false;
  }

  async function refrescarBadgeFlags() {
    try {
      // Contador del menú = total de filas de v_flags_web (sin responder + respondidos sin cerrar).
      const filas = await q('v_flags_web');
      const n = Array.isArray(filas) ? filas.length : 0;
      const b = $('badgeFlags');
      b.textContent = n;
      b.style.display = n > 0 ? 'inline-block' : 'none';
    } catch (_) { /* silencioso: el badge no es crítico */ }
  }

  async function refrescarBadgeFaltantes() {
    const item = $('itemFaltantes');
    // E88: 'faltantes' exige el módulo en ERP.perfil.modulos ADEMÁS del contador>0 — si el
    // perfil no lo trae, ni se pide el conteo (no tiene caso, el ítem se queda oculto).
    const modulos = Array.isArray(ERP.perfil.modulos) ? ERP.perfil.modulos : [];
    if (!modulos.includes('faltantes')) { if (item) item.style.display = 'none'; sincronizarGrupos(); return; }
    try {
      // Contador = filas de v_cargas_datos_faltantes. Si 0, se OCULTA la entrada del menú completa.
      const filas = await q('v_cargas_datos_faltantes');
      const n = Array.isArray(filas) ? filas.length : 0;
      const b = $('badgeFaltantes');
      if (b) b.textContent = n;
      if (item) item.style.display = n > 0 ? '' : 'none';
    } catch (_) { /* silencioso: el badge no es crítico */ }
    // E97: 'faltantes' puede aparecer/desaparecer aquí (no en aplicarMenuDinamico); reevalúa si
    // el grupo REVISIÓN quedó vacío/no-vacío tras cambiar su visibilidad.
    sincronizarGrupos();
  }

  async function refrescarBadgeLiquidaciones() {
    try {
      // Contador del menú = suma de n_cargas de v_liquidaciones_pendientes (productores listos
      // para liquidar). Si 0, el badge se OCULTA (el item "Liquidaciones al productor" se queda,
      // a diferencia de "Datos faltantes" — es un módulo permanente, no una lista de pendientes).
      const filas = await q('v_liquidaciones_pendientes');
      const n = Array.isArray(filas) ? filas.reduce((s, f) => s + (Number(f.n_cargas) || 0), 0) : 0;
      const b = $('badgeLiquidaciones');
      if (b) { b.textContent = n; b.style.display = n > 0 ? 'inline-block' : 'none'; }
    } catch (_) { /* silencioso: el badge no es crítico */ }
  }

  /* ================= Tema claro/oscuro (E89 — capa de tokens) =================
     El script anti-parpadeo en <head> de index.html ya fijó data-theme antes del primer paint
     (localStorage('plein-theme') o prefers-color-scheme si no hay preferencia guardada). Aquí
     solo se alterna al hacer clic y se persiste — sin librerías. */

  function temaActual() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function pintarIconoTema() {
    const ico = $('icoTema');
    if (ico) ico.className = temaActual() === 'dark' ? 'ti ti-sun' : 'ti ti-moon';
  }

  function alternarTema() {
    const nuevo = temaActual() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nuevo);
    try { localStorage.setItem('plein-theme', nuevo); } catch (_) { /* modo privado, etc.: se ve en esta sesión aunque no persista */ }
    pintarIconoTema();
  }

  pintarIconoTema();   // el botón vive dentro de #shell (oculto hasta iniciar sesión), pero el ícono ya queda listo

  /* ================= Buscador universal ================= */

  const ICONO = {
    carga: '📦', cliente: '💵', proveedor: '🧾',
    contraparte: '👥', producto: '🍋', movimiento: '↔️'
  };
  const PLURAL = {
    carga: 'Cargas', cliente: 'Clientes', proveedor: 'Proveedores',
    contraparte: 'Contrapartes', producto: 'Productos', movimiento: 'Movimientos'
  };
  const ORDEN_TIPOS = ['carga', 'cliente', 'proveedor', 'contraparte', 'producto', 'movimiento'];

  const caja = () => $('resultados');
  let ultimos = [];
  let seleccion = -1;
  let peticion = 0;

  function cerrarResultados() {
    caja().classList.remove('abierto');
    seleccion = -1;
  }

  function pintar(html) {
    caja().innerHTML = html;
    caja().classList.add('abierto');
  }

  async function buscar(termino) {
    const mio = ++peticion;
    pintar('<div class="res-cargando">Buscando…</div>');
    let filas;
    try {
      filas = await rpc('fn_buscar_universal', { termino });
    } catch (e) {
      if (mio !== peticion) return;
      pintar(`<div class="res-vacio">No se pudo buscar: ${esc(e.message)}</div>`);
      return;
    }
    if (mio !== peticion) return;              // llegó tarde, ya hay otra búsqueda
    filas = Array.isArray(filas) ? filas : [];
    ultimos = filas;
    if (!filas.length) {
      pintar(`<div class="res-vacio">Sin resultados para “${esc(termino)}”.</div>`);
      return;
    }

    const grupos = {};
    filas.forEach((f, i) => { (grupos[f.tipo] = grupos[f.tipo] || []).push({ f, i }); });
    const tipos = Object.keys(grupos).sort((a, b) => {
      const ia = ORDEN_TIPOS.indexOf(a), ib = ORDEN_TIPOS.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

    pintar(tipos.map(t => `
      <div class="res-grupo">${esc(PLURAL[t] || t)}</div>
      ${grupos[t].map(({ f, i }) => `
        <div class="res-item" data-i="${i}">
          <span class="ico">${ICONO[f.tipo] || '•'}</span>
          <span class="txt">
            <span class="t">${esc(f.titulo || '—')}</span>
            ${f.subtitulo ? `<span class="s">${esc(f.subtitulo)}</span>` : ''}
          </span>
          ${f.ref_folio ? `<span class="folio">${esc(f.ref_folio)}</span>` : ''}
        </div>`).join('')}
    `).join(''));
  }

  /** Decide a dónde navega cada resultado. */
  async function abrirResultado(f) {
    cerrarResultados();
    $('buscaUniv').blur();

    switch (f.tipo) {
      case 'carga':
        return ERP.irModulo('cargas', f.ref_folio || f.id);

      case 'movimiento':
        if (f.ref_folio) return ERP.irModulo('cargas', f.ref_folio);
        return ERP.abrirPanel(esc(f.titulo || 'Movimiento'), esc(f.subtitulo || ''),
          `<p style="font-size:13px;color:var(--gris)">Este movimiento no está ligado a ninguna carga.
           Consúltalo en Tesorería o en el módulo de captura.</p>`);

      case 'cliente':
        return ERP.irModulo('cobranza', f.titulo);

      case 'proveedor':
        return ERP.irModulo('pagos', f.titulo);

      case 'contraparte': {
        // Puede ser cliente o proveedor: decide según dónde aparezca.
        try {
          const cxc = await q('v_cxc_cliente');
          const esCliente = cxc.some(r => norm(r.cliente) === norm(f.titulo));
          return ERP.irModulo(esCliente ? 'cobranza' : 'pagos', f.titulo);
        } catch (_) {
          return ERP.irModulo('cobranza', f.titulo);
        }
      }

      case 'producto':
        return ERP.irModulo('cargas', 'q:' + f.titulo);

      default:
        return ERP.irModulo('inicio');
    }
  }

  function moverSeleccion(paso) {
    const items = caja().querySelectorAll('.res-item');
    if (!items.length) return;
    items.forEach(el => el.classList.remove('sel'));
    seleccion = (seleccion + paso + items.length) % items.length;
    items[seleccion].classList.add('sel');
    items[seleccion].scrollIntoView({ block: 'nearest' });
  }

  /* ================= Eventos ================= */

  let tempo;
  $('buscaUniv').addEventListener('input', e => {
    const t = e.target.value.trim();
    clearTimeout(tempo);
    if (t.length < 2) { cerrarResultados(); return; }
    tempo = setTimeout(() => buscar(t), 300);
  });

  $('buscaUniv').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); moverSeleccion(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moverSeleccion(-1); }
    else if (e.key === 'Escape') { cerrarResultados(); }
    else if (e.key === 'Enter') {
      clearTimeout(tempo);
      const items = caja().querySelectorAll('.res-item');
      if (seleccion >= 0 && items[seleccion]) {
        abrirResultado(ultimos[Number(items[seleccion].dataset.i)]);
      } else {
        const t = e.target.value.trim();
        if (t) buscar(t);
      }
    }
  });

  caja().addEventListener('click', e => {
    const item = e.target.closest('.res-item');
    if (item) abrirResultado(ultimos[Number(item.dataset.i)]);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.buscador')) cerrarResultados();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') ERP.cerrarPanel();
    // Ctrl/Cmd + K enfoca el buscador
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      $('buscaUniv').focus();
      $('buscaUniv').select();
    }
  });

  $('liBtn').addEventListener('click', entrar);
  $('liPass').addEventListener('keydown', e => { if (e.key === 'Enter') entrar(); });
  $('liEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('liPass').focus(); });
  $('btnSalir').addEventListener('click', salir);
  $('btnRf').addEventListener('click', actualizar);
  $('btnTema').addEventListener('click', alternarTema);
  $('btnMenu').addEventListener('click', ERP.alternarMenu);
  $('menuFondo').addEventListener('click', ERP.cerrarMenu);
  $('panelCerrar').addEventListener('click', ERP.cerrarPanel);
  $('panelOv').addEventListener('click', ERP.cerrarPanel);

  // Riel de grupos (E97): cada ícono lleva al primer módulo visible de su grupo.
  document.querySelectorAll('.icrail .ic[data-grupo]').forEach(ic =>
    ic.addEventListener('click', () => irAGrupo(ic.dataset.grupo)));

  // El router (despachar en comun.js) emite 'erp:navegar' con el módulo actual: sincroniza el
  // riel (grupo activo) y la miga de pan de la barra de módulo.
  window.addEventListener('erp:navegar', e => sincronizarMarco(e.detail && e.detail.modulo));

  // Sin sesión no hay nada que consultar: las vistas devuelven 401.
  window.addEventListener('hashchange', () => { if (ERP.token) ERP.despachar(); });

  // Tras cualquier escritura, los contadores del menú pueden haber cambiado.
  window.addEventListener('erp:escritura', refrescarBadgeFlags);
  window.addEventListener('erp:escritura', refrescarBadgeFaltantes);
  window.addEventListener('erp:escritura', refrescarBadgeLiquidaciones);

  sb.auth.onAuthStateChange((_ev, session) => {
    if (session) ERP.setToken(session.access_token);   // renueva el token automáticamente
  });

  /* ================= Arranque ================= */

  (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) sesionActiva(data.session);
    else $('loginOv').style.display = 'flex';
  })();

  // Auto-refresco cada 5 minutos (solo el módulo visible). Si el drawer de captura está
  // abierto, se salta este ciclo — despachar() lo cerraría y borraría lo que se esté
  // escribiendo. El siguiente tick (5 min después) vuelve a intentar.
  setInterval(() => { if (ERP.token && !ERP.panelAbierto()) actualizar(); }, 5 * 60 * 1000);
})();
