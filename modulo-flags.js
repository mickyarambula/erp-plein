/* Módulo Flags — dudas parqueadas sobre cargas. Una carga flageada no se toca hasta resolverla.
   SOLO consume la vista v_flags_web (ya ordenada: sin responder primero, luego por f_embarque) y
   dos RPCs de escritura:
     fn_responder_flag(p_folio, p_respuesta)   — rol captura (Samuel); registra respuesta, no cierra.
     fn_resolver_flag_web(p_folio, p_resolucion) — rol editar (Miguel/admin); cierra el flag.
   El backend valida rol y contenido; aquí no se inventa lógica de permisos: el botón "Cerrar" se
   oculta a quien no puede editar, pero el enforcement real lo hace el RPC. */

(function () {
  'use strict';
  const { q, rpc, esc, usd } = ERP;

  let contRef = null;
  let flagsActuales = [];
  let flash = null;        // {tipo, texto} — mensaje a mostrar arriba tras una acción

  function fechaHora(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return String(ts);
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  /* ---------- Tarjeta ---------- */

  function tarjeta(f, i) {
    const sinResp = f.estado_flag === 'sin_responder';
    const puedeResponder = ERP.puede('capturar');   // fn_responder_flag = capturar
    const puedeCerrar = ERP.puede('editar');         // fn_resolver_flag_web = editar
    const venta = usd(f.ingreso_venta);
    const costo = usd(f.costo_total);

    const respuesta = f.ultima_respuesta ? `<div class="flag-respuesta">
      <div class="fr-cab">Respuesta${f.respondio ? ' de ' + esc(f.respondio) : ''}${f.respuesta_ts ? ' · ' + esc(fechaHora(f.respuesta_ts)) : ''}</div>
      <div class="fr-txt">${esc(f.ultima_respuesta)}</div>
    </div>` : '';

    const formResponder = `<div class="flag-form" id="respForm-${i}" style="display:none">
      <div class="form-erp">
        <div class="campo ancho">
          <label>Tu respuesta <span class="req">*</span></label>
          <textarea id="respTa-${i}" placeholder="Responde la pregunta de arriba…"></textarea>
        </div>
        <div class="acciones">
          <button class="btn-mini" data-act="responder-ok" data-i="${i}">Enviar respuesta</button>
          <button class="btn-mini gris" data-act="cancelar" data-i="${i}" data-form="resp">Cancelar</button>
        </div>
        <div class="aviso" id="respAv-${i}"></div>
      </div>
    </div>`;

    const formCerrar = puedeCerrar ? `<div class="flag-form" id="cerrarForm-${i}" style="display:none">
      <div class="form-erp peligro">
        <p style="font-size:12.5px;margin-bottom:10px">
          <b>Esto cierra el flag y re-habilita FIFO en la carga.</b> ¿Seguro?</p>
        <div class="campo ancho">
          <label>Resolución <span class="req">*</span></label>
          <textarea id="cerrarTa-${i}" placeholder="Cómo quedó resuelta la duda…"></textarea>
        </div>
        <div class="acciones">
          <button class="btn-mini confirmar-peligro" data-act="cerrar-ok" data-i="${i}">Sí, cerrar flag</button>
          <button class="btn-mini gris" data-act="cancelar" data-i="${i}" data-form="cerrar">Cancelar</button>
        </div>
        <div class="aviso" id="cerrarAv-${i}"></div>
      </div>
    </div>` : '';

    return `<div class="flag-card ${sinResp ? 'sin-resp' : 'respondido'}">
      <div class="flag-head">
        <div>
          <div class="flag-po">${esc(f.po || '(sin P.O.)')}</div>
          <div class="flag-folio">
            <span class="enlace" data-folio="${esc(f.folio)}" title="Abrir la ficha de la carga">${esc(f.folio)}</span>
            ${f.estado ? ` · <span class="pill gris">${esc(f.estado)}</span>` : ''}
            ${f.modalidad ? ` · ${esc(f.modalidad)}` : ''}
          </div>
        </div>
        <span class="pill ${sinResp ? 'rojo' : 'verde'}">${sinResp ? 'Sin responder' : 'Respondido'}</span>
      </div>

      <div class="flag-ruta">${esc(f.proveedor || 'sin proveedor')} → ${esc(f.cliente || 'sin cliente')}</div>
      <div class="flag-cifras">
        <span>Embarque ${esc(ERP.fecha(f.f_embarque))}</span>
        <span>Venta ${venta}</span>
        <span>Costo ${costo}</span>
      </div>

      <div class="flag-pregunta">${esc(f.nota_revision || '(sin nota de revisión)')}</div>
      ${respuesta}

      <div class="flag-acciones">
        ${puedeResponder ? `<button class="btn-mini" data-act="responder" data-i="${i}">Responder</button>` : ''}
        ${puedeCerrar ? `<button class="btn-mini peligro" data-act="cerrar" data-i="${i}">Cerrar flag</button>` : ''}
        ${!puedeResponder && !puedeCerrar ? '<span class="solo-lectura">Solo lectura — sin permiso para responder o cerrar</span>' : ''}
      </div>
      ${puedeResponder ? formResponder : ''}
      ${formCerrar}
    </div>`;
  }

  function seccion(titulo, filas, indices, vacio) {
    const cuerpo = filas.length
      ? filas.map((f, k) => tarjeta(f, indices[k])).join('')
      : `<div class="card"><div class="vacio">${esc(vacio)}</div></div>`;
    return `<h2 class="sec">${esc(titulo)} <span class="conteo">${filas.length}</span></h2>${cuerpo}`;
  }

  /* ---------- Render ---------- */

  async function pintar(cont) {
    const flags = await q('v_flags_web');   // ya ordenada por el backend
    flagsActuales = flags;

    const flashHtml = flash
      ? `<div class="aviso visible ${esc(flash.tipo)}" style="margin-bottom:16px">${flash.texto}</div>` : '';
    flash = null;

    if (!flags.length) {
      cont.innerHTML = flashHtml + `<div class="card"><div class="vacio">
        Sin flags 🎉<br><span style="font-size:12px">No hay dudas parqueadas.</span>
      </div></div>`;
      return;
    }

    // Índices originales para localizar cada flag en flagsActuales desde los botones.
    const idxSin = [], idxResp = [], sin = [], resp = [];
    flags.forEach((f, i) => {
      if (f.estado_flag === 'sin_responder') { sin.push(f); idxSin.push(i); }
      else { resp.push(f); idxResp.push(i); }
    });

    cont.innerHTML = flashHtml +
      seccion('Pendientes de respuesta', sin, idxSin, 'Nada pendiente de responder.') +
      seccion('Respondidos — pendientes de cierre', resp, idxResp, 'Nada respondido en espera de cierre.') +
      `<div class="leyenda">Una flag es una duda parqueada: la carga no se modifica hasta resolverla.
        <b>Responder</b> registra la respuesta (no cierra el flag).
        ${ERP.puede('editar') ? '<b>Cerrar flag</b> lo resuelve y re-habilita FIFO en la carga.' : ''}
        Toca el folio para abrir la ficha de la carga.</div>`;
  }

  async function refrescar() {
    ERP.marcarDatosSucios();   // limpia caché + actualiza el contador del menú
    await pintar(contRef);
  }

  /* ---------- Acciones ---------- */

  function aviso(id, tipo, html) {
    const el = document.getElementById(id);
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  function abrirForm(i, cual) {
    const resp = document.getElementById('respForm-' + i);
    const cerrar = document.getElementById('cerrarForm-' + i);
    if (resp) resp.style.display = cual === 'resp' ? 'block' : 'none';
    if (cerrar) cerrar.style.display = cual === 'cerrar' ? 'block' : 'none';
    const ta = document.getElementById((cual === 'resp' ? 'respTa-' : 'cerrarTa-') + i);
    if (ta) ta.focus();
  }

  function cerrarForm(i, cual) {
    const el = document.getElementById((cual === 'resp' ? 'respForm-' : 'cerrarForm-') + i);
    if (el) el.style.display = 'none';
  }

  async function enviarRespuesta(i) {
    const f = flagsActuales[i];
    if (!f) return;
    const ta = document.getElementById('respTa-' + i);
    const texto = (ta ? ta.value : '').trim();
    if (!texto) { aviso('respAv-' + i, 'err', 'Escribe la respuesta antes de enviar.'); return; }

    const btn = document.querySelector(`[data-act="responder-ok"][data-i="${i}"]`);
    if (btn) btn.disabled = true;
    aviso('respAv-' + i, 'warn', 'Enviando respuesta…');
    try {
      const data = await rpc('fn_responder_flag', { p_folio: f.folio, p_respuesta: texto });
      const r = (data && data[0]) || {};
      flash = { tipo: 'ok', texto: esc(r.mensaje || `Respuesta registrada en ${f.folio}.`) };
      await refrescar();
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { if (btn) btn.disabled = false; return; }
      // El backend valida (rol, respuesta vacía…): mostramos su mensaje tal cual.
      aviso('respAv-' + i, 'err', esc(e.message));
      if (btn) btn.disabled = false;
    }
  }

  async function cerrarFlag(i) {
    const f = flagsActuales[i];
    if (!f) return;
    const ta = document.getElementById('cerrarTa-' + i);
    const texto = (ta ? ta.value : '').trim();
    if (!texto) { aviso('cerrarAv-' + i, 'err', 'Escribe la resolución antes de cerrar.'); return; }

    const btn = document.querySelector(`[data-act="cerrar-ok"][data-i="${i}"]`);
    if (btn) btn.disabled = true;
    aviso('cerrarAv-' + i, 'warn', 'Cerrando flag…');
    try {
      const data = await rpc('fn_resolver_flag_web', { p_folio: f.folio, p_resolucion: texto });
      const r = (data && data[0]) || {};
      flash = { tipo: 'ok', texto: esc(r.mensaje || `Flag de ${f.folio} cerrado.`) };
      await refrescar();
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { if (btn) btn.disabled = false; return; }
      aviso('cerrarAv-' + i, 'err', esc(e.message));
      if (btn) btn.disabled = false;
    }
  }

  function onClick(e) {
    const folioEl = e.target.closest('.enlace[data-folio]');
    if (folioEl) { ERP.verCarga(folioEl.dataset.folio); return; }

    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    switch (btn.dataset.act) {
      case 'responder': abrirForm(i, 'resp'); break;
      case 'cerrar': abrirForm(i, 'cerrar'); break;
      case 'cancelar': cerrarForm(i, btn.dataset.form); break;
      case 'responder-ok': enviarRespuesta(i); break;
      case 'cerrar-ok': cerrarFlag(i); break;
    }
  }

  async function render(cont) {
    contRef = cont;
    cont.addEventListener('click', onClick);   // delegación: sobrevive a los re-render de innerHTML
    await pintar(cont);
  }

  ERP.registrar('flags', {
    titulo: 'Revisiones Pendientes',
    descripcion: 'Dudas parqueadas: respóndelas y ciérralas antes de tocar el embarque',
    render
  });
})();
