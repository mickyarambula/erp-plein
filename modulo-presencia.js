/* Módulo Presencia / En línea — latido + indicador de socios conectados en el header.
   NO es un módulo de ruta: es un widget del header + un loop en segundo plano.
   Backend YA existe (no se toca):
     RPC  fn_latido(p_actor text, p_pagina text)
     Vista v_presencia_online (actor, email, ultimo_latido, pagina, segundos_desde, online)
   Usa el cliente supabase YA autenticado (ERP.sb), igual que modulo-tesoreria.js consume
   ERP.sb.from(...). No crea un cliente nuevo ni toca la sesión.
   Arranque: app.js llama ERP.iniciarPresencia() dentro de sesionActiva() (tras sesión válida). */

(function () {
  'use strict';
  const { sb, esc } = ERP;

  // Actores válidos y su nombre visible (contrato del backend).
  const ACTORES = { 'PP01-SI': 'Samuel', 'PP02-JM': 'Juan', 'PP03-JA': 'José', 'PP04-MA': 'Miguel' };
  const ORDEN = ['PP01-SI', 'PP02-JM', 'PP03-JA', 'PP04-MA'];
  const KEY = 'presencia_actor';
  const nombreDe = a => ACTORES[a] || a || '—';

  const getActor = () => { try { return localStorage.getItem(KEY) || null; } catch (_) { return null; } };
  const setActor = a => { try { localStorage.setItem(KEY, a); } catch (_) { /* modo privado, etc. */ } };
  const clearActor = () => { try { localStorage.removeItem(KEY); } catch (_) { /* idem */ } };

  let iniciado = false;   // evita doblar timers/listeners si iniciar() se llama dos veces

  /** Ruta/vista actual para p_pagina; cae a document.title si aún no hay hash. */
  function paginaActual() {
    const r = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    return r || document.title || 'inicio';
  }

  /* ================= Latido ================= */

  async function latir() {
    const actor = getActor();
    if (!actor) return;                                    // NUNCA latir sin actor
    if (document.visibilityState !== 'visible') return;    // no latir con la pestaña oculta
    try {
      await sb.rpc('fn_latido', { p_actor: actor, p_pagina: paginaActual() });
    } catch (_) { /* silencioso: la presencia no es crítica, no molestar al usuario */ }
  }

  /* ================= Indicador "en línea" en el header ================= */

  async function refrescarIndicador() {
    const cont = document.getElementById('presenciaOnline');
    if (!cont) return;
    let filas;
    try {
      const { data, error } = await sb.from('v_presencia_online').select('actor,online,segundos_desde,pagina');
      if (error) throw error;
      filas = data || [];
    } catch (_) { return; /* silencioso: deja el último render pintado */ }

    const yo = getActor();
    const online = filas.filter(f => f.online === true)
      .sort((a, b) => ORDEN.indexOf(a.actor) - ORDEN.indexOf(b.actor));

    if (!online.length) { cont.innerHTML = '<span class="pres-vacio" title="Nadie más conectado ahora">Solo tú</span>'; return; }

    cont.innerHTML = online.map(f => {
      const seg = f.segundos_desde == null ? '?' : f.segundos_desde;
      const tip = `última señal hace ${seg}s · ${f.pagina || '—'}`;
      const esYo = f.actor === yo;
      return `<span class="pres-persona${esYo ? ' yo' : ''}" title="${esc(tip)}">`
        + `<span class="pres-dot"></span>${esc(nombreDe(f.actor))}</span>`;
    }).join('');
  }

  /* ================= Identidad "Soy: X (cambiar)" ================= */

  function pintarSoy() {
    const el = document.getElementById('presenciaSoy');
    if (!el) return;
    const actor = getActor();
    if (!actor) { el.style.display = 'none'; el.innerHTML = ''; return; }
    el.style.display = '';
    el.innerHTML = `Soy: <b>${esc(nombreDe(actor))}</b> `
      + `<button type="button" class="pres-cambiar" id="presCambiar">(cambiar)</button>`;
    const b = document.getElementById('presCambiar');
    if (b) b.addEventListener('click', () => { clearActor(); pintarSoy(); refrescarIndicador(); abrirSelector(); });
  }

  /* ================= Modal "¿Quién eres?" ================= */

  function abrirSelector() {
    if (document.getElementById('presModalOv')) return;    // ya abierto
    const ov = document.createElement('div');
    ov.className = 'pres-modal-ov';
    ov.id = 'presModalOv';
    ov.innerHTML = `<div class="pres-modal">
        <h2>¿Quién eres?</h2>
        <p>Elige tu nombre para marcar tu presencia en el ERP. Se recuerda en este navegador.</p>
        <div class="pres-botones">
          ${ORDEN.map(a => `<button type="button" data-actor="${a}">${esc(ACTORES[a])}</button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(ov);
    ov.querySelectorAll('button[data-actor]').forEach(btn =>
      btn.addEventListener('click', () => {
        setActor(btn.dataset.actor);
        ov.remove();
        pintarSoy();
        latir();               // marca presencia de inmediato al elegir
        refrescarIndicador();
      }));
  }

  /* ================= Visibilidad de la pestaña ================= */

  function onVisibilidad() {
    // Al volver a la pestaña, late de inmediato; el setInterval sigue corriendo pero latir()
    // ya se auto-inhibe cuando la pestaña está oculta.
    if (document.visibilityState === 'visible') latir();
  }

  /* ================= Arranque (lo llama app.js tras login) ================= */

  function iniciar() {
    pintarSoy();
    if (!getActor()) abrirSelector();   // primera vez en este navegador → pregunta quién eres

    if (!iniciado) {
      iniciado = true;
      document.addEventListener('visibilitychange', onVisibilidad);
      setInterval(latir, 30000);              // latido cada 30 s
      setInterval(refrescarIndicador, 20000); // indicador cada 20 s
    }

    latir();
    refrescarIndicador();
  }

  ERP.iniciarPresencia = iniciar;
})();
