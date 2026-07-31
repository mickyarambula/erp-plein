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
    marcarEstado('ok');
    // Precarga el catálogo de estados/transiciones para que los badges pinten bien desde el primer
    // render. Si truena, la app sigue (badges degradan a crudo) y el módulo que lo necesite reintenta
    // y muestra su errbox — no se enmascara.
    await ERP.cargarEstados().catch(() => {});
    ERP.despachar();
    refrescarBadgeFlags();
    refrescarBadgeFaltantes();
    // Presencia en línea: latido + indicador de socios conectados en el header (módulo aparte).
    if (ERP.iniciarPresencia) ERP.iniciarPresencia();
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
    try {
      // Contador = filas de v_cargas_datos_faltantes. Si 0, se OCULTA la entrada del menú completa.
      const filas = await q('v_cargas_datos_faltantes');
      const n = Array.isArray(filas) ? filas.length : 0;
      const item = $('itemFaltantes'), b = $('badgeFaltantes');
      if (b) b.textContent = n;
      if (item) item.style.display = n > 0 ? '' : 'none';
    } catch (_) { /* silencioso: el badge no es crítico */ }
  }

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
  $('btnMenu').addEventListener('click', ERP.alternarMenu);
  $('menuFondo').addEventListener('click', ERP.cerrarMenu);
  $('panelCerrar').addEventListener('click', ERP.cerrarPanel);
  $('panelOv').addEventListener('click', ERP.cerrarPanel);

  // Sin sesión no hay nada que consultar: las vistas devuelven 401.
  window.addEventListener('hashchange', () => { if (ERP.token) ERP.despachar(); });

  // Tras cualquier escritura, los contadores del menú pueden haber cambiado.
  window.addEventListener('erp:escritura', refrescarBadgeFlags);
  window.addEventListener('erp:escritura', refrescarBadgeFaltantes);

  sb.auth.onAuthStateChange((_ev, session) => {
    if (session) ERP.setToken(session.access_token);   // renueva el token automáticamente
  });

  /* ================= Arranque ================= */

  (async () => {
    const { data } = await sb.auth.getSession();
    if (data.session) sesionActiva(data.session);
    else $('loginOv').style.display = 'flex';
  })();

  // Auto-refresco cada 5 minutos (solo el módulo visible).
  setInterval(() => { if (ERP.token) actualizar(); }, 5 * 60 * 1000);
})();
