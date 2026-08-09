/* Expediente de Embarque — vista central del embarque en 4 pestañas.
   Se abre al hacer clic en cualquier embarque (ERP.verCarga → ERP.verExpediente).
   SOLO LECTURA salvo la subida de documentos (Storage) y la creación de factura (reusa
   fn_crear_factura vía el módulo de facturación). NO duplica ni cambia la captura contable:
   "Captura y acciones" abre la ficha clásica (costos, cobros/pagos, revisión, anular).

   Vistas: v_carga_detalle · v_carga_aplicaciones · v_carga_costos_det · v_margen_caja · v_facturas
   Documentos: la pestaña Documentos delega en el componente OFICIAL ERP.documentos
   (sistema documentos + v_documentos + fn_registrar_documento, bucket 'documentos').
   La tabla carga_documentos quedó JUBILADA (2026-07-22). */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num } = ERP;

  // Fecha LOCAL, no toISOString() (UTC): en Sonora (UTC-7) toISOString ya muestra el día
  // siguiente después de las 17:00 — rompía tanto el default del <input type="date"> de
  // Confirmar entrega como el "no puede ser futura" (fecha > hoy) que lo valida.
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const MODALIDAD = { margen_fijo: 'Margen Fijo', consignacion: 'Consignación' };

  let estado = null;   // { folio, d, apls, costos, mc, tab }

  /* ================= Apertura y shell de pestañas ================= */

  async function verExpediente(folio) {
    ERP.abrirPanel(esc(folio), 'Cargando expediente…', '<div class="skel">Cargando expediente…</div>');
    let det, apls, costos, mc, cx, pc, progc, agendaLiq;
    try {
      [det, apls, costos, mc, cx, pc, progc, agendaLiq] = await Promise.all([
        q('v_carga_detalle', `&folio=${ERP.eq(folio)}`),
        q('v_carga_aplicaciones', `&carga_folio=${ERP.eq(folio)}&order=fecha.asc`).catch(() => []),
        q('v_carga_costos_det', `&carga_folio=${ERP.eq(folio)}`).catch(() => []),
        q('v_margen_caja', `&folio=${ERP.eq(folio)}`).catch(() => []),
        // v_cxc para el chip de estatus de cobro (una consulta para ESTE embarque, no por lista).
        q('v_cxc', `&folio=${ERP.eq(folio)}`).catch(() => []),
        // v_carga_detalle no trae proyecto_id: se lee de v_proyecto_cargas por folio (chip 🌱, opcional).
        q('v_proyecto_cargas', `&folio=${ERP.eq(folio)}`).catch(() => []),
        // Mapa carga→programa (E47, chip "PC-0XX", opcional): una consulta para ESTE embarque.
        q('v_cargas_programa', `&folio=${ERP.eq(folio)}`).catch(() => []),
        // Señal "lista para liquidar al productor" (v_agenda_operativa, categoria dedicada, chip
        // verde opcional): una consulta para ESTE embarque.
        q('v_agenda_operativa', `&folio=${ERP.eq(folio)}&categoria=eq.liquidar_productor`).catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel(esc(folio), '', `<div class="errbox">No se pudo cargar el expediente: ${esc(e.message)}</div>`);
      return;
    }
    if (!det.length) {
      ERP.abrirPanel(esc(folio), '', '<p style="font-size:13px">No existe ese embarque. Revisa el folio (ej. P-043).</p>');
      return;
    }
    estado = { folio, d: det[0], apls, costos, mc: (mc && mc[0]) || null, cx: (cx && cx[0]) || null, proyecto: (pc && pc[0] && pc[0].proyecto_codigo) || null, programa: (progc && progc[0] && progc[0].programa_codigo) || null, programaEtiqueta: (progc && progc[0] && progc[0].programa_etiqueta) || null, listaLiquidar: agendaLiq.length > 0, tab: 'resumen' };
    pintarShell();
  }

  function pintarShell() {
    const d = estado.d;
    const rev = !!d.revision_pendiente;
    const titulo = `${esc(d.folio)}${d.po ? ` <span style="font-weight:400;color:var(--gris)">· ${esc(d.po)}</span>` : ''}`;
    const sub = `${ERP.badgeEstado(d.estado)}${d.anulado ? '' : ` · ${ERP.chipCobroHTML(estado.cx)}`}${estado.proyecto ? ` · <span class="pill verde" id="expChipProy" style="cursor:pointer" title="Ver proyecto ${esc(estado.proyecto)}">🌱 ${esc(estado.proyecto)}</span>` : ''}${estado.programa ? ` · <span class="pill verde" id="expChipPrograma" style="cursor:pointer" title="Ver programa: ${esc(estado.programaEtiqueta || estado.programa)}">🌾 ${esc(estado.programa)}</span>` : ''}${estado.listaLiquidar ? ' · <span class="pill verde">Lista para liquidar al productor</span>' : ''} · ${esc(MODALIDAD[d.modalidad] || d.modalidad || '—')} · ${esc(d.cliente || '—')}${d.anulado ? ' · ANULADO' : ''}`;
    const TABS = [['resumen', 'Resumen'], ['pagos', 'Pagos y Cobros'], ['documentos', 'Documentos'], ['factura', 'Factura y OC']];

    ERP.abrirPanel(titulo, sub, `
      <div class="exp-acciones">
        ${ERP.puede('capturar') ? '<button class="btn-mini" id="expCaptura">＋ Captura y acciones</button>' : ''}
        ${ERP.puede('capturar') && !d.f_entrega_real && !d.anulado ? '<button class="btn-mini" id="expConfEntrega">✓ Confirmar entrega</button>' : ''}
        ${!d.anulado ? `<button class="btn-mini" id="expCambiarEstado"${ERP.transicionesDisponibles(d.estado).length ? '' : ` disabled title="${esc(ERP.motivoSinTransicion(d.estado))}"`}>Cambiar estado</button>` : ''}
        <button class="btn-mini gris" id="expPdf">Exportar Expediente PDF</button>
      </div>
      ${d.anulado ? '' : `<div style="font-size:12px;color:var(--gris);margin:0 0 10px">Venta <b>${usd(d.ingreso_venta)}</b> · Cobrado <b>${usd(d.cobrado)}</b> · Saldo por cobrar <b${num(d.saldo_cxc) > 0.009 ? ' style="color:var(--verde)"' : ''}>${usd(d.saldo_cxc)}</b></div>`}
      <div id="expFormEntrega"></div>
      <div class="pestanas exp-tabs">
        ${TABS.map(([id, l]) => `<button class="pestana ${estado.tab === id ? 'activa' : ''}" data-tab="${id}">${esc(l)}${id === 'resumen' && rev ? ' ⚑' : ''}</button>`).join('')}
      </div>
      <div id="expBody"></div>`);

    document.querySelectorAll('.exp-tabs .pestana').forEach(p => p.addEventListener('click', () => {
      estado.tab = p.dataset.tab;
      document.querySelectorAll('.exp-tabs .pestana').forEach(o => o.classList.toggle('activa', o.dataset.tab === estado.tab));
      pintarTab();
    }));
    const bPdf = document.getElementById('expPdf');
    if (bPdf) bPdf.addEventListener('click', () => {
      if (ERP.exportarExpedientePDF) ERP.exportarExpedientePDF(estado);
      else ERP.toast('warn', 'Exportación no disponible (revisa la conexión).');
    });
    const bCap = document.getElementById('expCaptura');
    if (bCap) bCap.addEventListener('click', () => ERP.verFichaClasica(estado.folio));
    const bConf = document.getElementById('expConfEntrega');
    if (bConf) bConf.addEventListener('click', abrirFormConfirmarEntrega);
    const bCambEstado = document.getElementById('expCambiarEstado');
    if (bCambEstado) bCambEstado.addEventListener('click', () => ERP.abrirCambiarEstado(estado.folio, estado.d.estado, () => verExpediente(estado.folio)));
    const chipProy = document.getElementById('expChipProy');
    if (chipProy) chipProy.addEventListener('click', () => ERP.irModulo('proyectos', estado.proyecto));
    const chipPrograma = document.getElementById('expChipPrograma');
    if (chipPrograma) chipPrograma.addEventListener('click', () => ERP.irModulo('programas', estado.programa));

    pintarTab();
  }

  function pintarTab() {
    const body = document.getElementById('expBody');
    if (!body) return;
    if (estado.tab === 'resumen') {
      body.innerHTML = htmlResumen(estado.d, estado.costos, estado.mc) + '<div id="expTareas" style="margin-top:22px"></div>';
      ERP.cablearInfoNota(body);   // ⓘ de utilidad estimada en el Resumen
      if (ERP.montarResponsable) ERP.montarResponsable(document.getElementById('expRespCell'), estado.folio, estado.d.responsable, estado.d.responsable_nombre, () => verExpediente(estado.folio));
      if (ERP.montarTareasCarga) ERP.montarTareasCarga(document.getElementById('expTareas'), estado.folio, !estado.d.anulado);
    }
    else if (estado.tab === 'pagos') {
      body.innerHTML = htmlPagos(estado.apls, estado.d);
      cablearMovLinks(body);
    }
    else if (estado.tab === 'documentos') montarDocumentos(body, estado.folio, estado.d.anulado);
    else if (estado.tab === 'factura') {
      body.innerHTML = '<div id="expFacturas"></div><div id="expVentas" style="margin-top:22px"></div><div id="expLote" style="margin-top:22px"></div><div id="expOrdenes" style="margin-top:22px"></div><div id="expEventos" style="margin-top:22px"></div>';
      if (ERP.montarFacturasCarga) ERP.montarFacturasCarga(document.getElementById('expFacturas'), estado.folio, !estado.d.anulado);
      if (ERP.montarVentasCarga) ERP.montarVentasCarga(document.getElementById('expVentas'), estado.folio);
      if (ERP.montarLoteCarga) ERP.montarLoteCarga(document.getElementById('expLote'), estado.folio);
      if (ERP.montarOrdenesCarga) ERP.montarOrdenesCarga(document.getElementById('expOrdenes'), estado.folio, !estado.d.anulado);
      if (ERP.montarEventosCarga) ERP.montarEventosCarga(document.getElementById('expEventos'), estado.folio, !estado.d.anulado);
    }
  }

  /* ================= Pestaña RESUMEN ================= */

  function htmlResumen(d, costos, mc) {
    const rev = !!d.revision_pendiente;
    // ID del mismo embarque en el Control de Cargas V7 de Samuel (E37c). NO es el folio del ERP:
    // son consecutivos independientes y a veces difieren; si difieren, se resalta para cotejar por P.O.
    const idV7 = d.id_v7 ?? null;
    const v7Distinto = idV7 != null && String(idV7) !== String(d.folio);
    // Cajas y margen por caja (E36). El margen_por_caja NULL es dato deliberadamente ausente
    // (no cero): guion + motivo como tooltip. Cajas se toma de v_margen_caja y, si no hubiera
    // fila, del propio detalle.
    const cajas = (mc && mc.cajas != null) ? mc.cajas : (d.cajas != null ? d.cajas : null);
    const mpc = mc ? mc.margen_por_caja : null;
    const motivoMpc = mc ? mc.motivo_sin_margen_caja : null;
    // Pallets, entregas y derivados desde v_carga_detalle (E36 3ª/4ª parte).
    // Mismo criterio de NULL: guion, nunca cero.
    const pallets = d.pallets ?? null;
    const fEntrega = d.f_entrega ?? null;               // programada (estimada)
    const fEntregaReal = d.f_entrega_real ?? null;      // confirmada por una persona
    const cajasPorPallet = d.cajas_por_pallet ?? null;
    const transito = d.transito_dias ?? null;
    const transitoEstimado = !!d.transito_es_estimado;  // aún sin entrega real
    const desfase = d.desfase_entrega_dias ?? null;     // real vs programada (+ tarde, − antes)
    // Desfase junto a la entrega real: rojo suave si tarde, verde si antes, "en fecha" si 0.
    const desfaseHtml = desfase == null ? ''
      : desfase === 0
        ? ' <span style="color:var(--gris)">· en fecha</span>'
        : ` <span style="color:${desfase > 0 ? 'var(--rojo)' : 'var(--verde)'}">· ${desfase > 0 ? '+' : ''}${desfase} día${Math.abs(desfase) === 1 ? '' : 's'}</span>`;
    const totCosto = costos.reduce((s, c) => s + num(c.monto), 0);
    const costosHtml = costos.length
      ? costos.map(c => `<tr><td>${esc(c.concepto)}</td>
          <td style="color:var(--gris)">${esc(c.nota || '')}</td>
          <td class="num">${usd(c.monto)}</td></tr>`).join('')
      : '<tr><td colspan="3" style="color:var(--gris)">Sin costos registrados.</td></tr>';

    return `
      ${rev ? `<div class="flagbox"><div class="t">⚑ Revisión pendiente</div>
        <p>${esc(d.nota_revision || '(sin nota)')}</p></div>` : ''}
      <div class="det-grid">
        <div class="det"><div class="l">Folio</div><div class="v mono">${esc(d.folio)}</div></div>
        <div class="det"><div class="l">ID en V7 (Samuel)</div>
          <div class="v mono"${v7Distinto ? ' style="background:#fdf0d5;color:#8a6d2b;padding:1px 6px;border-radius:4px" title="El folio del ERP y el ID del V7 son distintos para este embarque. Cotejar siempre por P.O."' : ''}>${idV7 == null ? '— (no está en el V7)' : esc(idV7)}</div></div>
        <div class="det"><div class="l">P.O.</div><div class="v mono">${esc(d.po || '—')}</div></div>
        <div class="det"><div class="l">Producto</div><div class="v">${esc(d.producto || '—')}</div></div>
        <div class="det"><div class="l">Proveedor</div><div class="v">${esc(d.proveedor || '—')}</div></div>
        <div class="det"><div class="l">Cliente</div><div class="v">${esc(d.cliente || '—')}</div></div>
        <div class="det"><div class="l">Modalidad</div><div class="v">${esc(MODALIDAD[d.modalidad] || d.modalidad || '—')}</div></div>
        <div class="det"><div class="l">Embarque</div><div class="v mono">${esc(ERP.fecha(d.f_embarque))}</div></div>
        <div class="det"><div class="l">Entrega programada</div><div class="v mono">${fEntrega ? esc(ERP.fecha(fEntrega)) : '—'}</div></div>
        <div class="det"><div class="l">Entrega real</div><div class="v mono">${fEntregaReal ? esc(ERP.fecha(fEntregaReal)) : '—'}${desfaseHtml}</div></div>
        <div class="det"><div class="l">Tránsito</div><div class="v mono"${transito != null && transitoEstimado ? ' style="color:var(--gris)" title="Estimado: la entrega real no se ha confirmado"' : ''}>${transito == null ? '—' : `${transito} día${Math.abs(transito) === 1 ? '' : 's'}`}</div></div>
        <div class="det"><div class="l">Venta</div><div class="v mono">${usd(d.ingreso_venta)}</div></div>
        <div class="det"><div class="l">Cajas</div><div class="v mono">${cajas == null ? '—' : ERP.fmt0(cajas)}</div></div>
        <div class="det"><div class="l">Pallets</div><div class="v mono">${pallets == null ? '—' : ERP.fmt0(pallets)}</div></div>
        <div class="det"><div class="l">Cajas por pallet</div><div class="v mono">${cajasPorPallet == null ? '—' : ERP.fmt(cajasPorPallet)}</div></div>
        <div class="det"><div class="l">Margen por caja</div><div class="v mono"${mpc == null ? ` title="${esc(motivoMpc || 'Dato deliberadamente ausente')}" style="color:var(--gris)"` : ''}>${mpc == null ? '—' : usd(mpc)}</div></div>
        <div class="det"><div class="l">Utilidad</div><div class="v mono"${d.utilidad == null ? '' : ` style="color:${ERP.utilidadColor(d.utilidad)}"`}>${ERP.utilidadTexto(d.utilidad, d.utilidad_es_estimada, d.utilidad_nota)}</div></div>
        <div class="det"><div class="l">Margen %</div><div class="v mono">${ERP.margenTexto(d.margen_pct)}</div></div>
        <div class="det"><div class="l">Saldo por cobrar</div><div class="v mono" style="${num(d.saldo_cxc) > 0.009 ? 'color:var(--verde);font-weight:600' : ''}">${usd(d.saldo_cxc)}</div></div>
        <div class="det"><div class="l">Saldo por pagar</div><div class="v mono" style="${num(d.saldo_cxp) > 0.009 ? 'color:var(--rojo);font-weight:600' : ''}">${usd(d.saldo_cxp)}</div></div>
        <div class="det" id="expRespCell"><div class="l">Responsable</div><div class="v">${esc(d.responsable_nombre || '—')}</div></div>
        <div class="det"><div class="l">Lote</div><div class="v mono">${esc(d.lote || '—')}</div></div>
        <div class="det"><div class="l">Lote productor</div><div class="v mono">${esc(d.lote_productor || '—')}</div></div>
        <div class="det"><div class="l">Cosecha</div><div class="v mono">${d.f_cosecha ? esc(ERP.fecha(d.f_cosecha)) : '—'}</div></div>
      </div>
      <div class="seccion-head"><h4>Costos por concepto</h4></div>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Concepto</th><th>Nota</th><th class="num">Monto</th></tr></thead>
        <tbody>${costosHtml}</tbody>
        ${costos.length ? `<tfoot><tr class="total"><td colspan="2">Total costos</td><td class="num">${usd(totCosto)}</td></tr></tfoot>` : ''}
      </table></div>`;
  }

  /* ============ Confirmar entrega real (E36 4ª parte) ============ */

  function abrirFormConfirmarEntrega() {
    const cont = document.getElementById('expFormEntrega');
    if (!cont) return;
    if (cont.innerHTML) { cont.innerHTML = ''; return; }   // toggle

    const hoy = hoyISO();
    cont.innerHTML = `<div class="form-erp" style="margin-top:10px">
      <div class="leyenda" style="margin:0 0 8px">Confirmar la entrega también avanza el estado a <b>Entregada</b> automáticamente — no hace falta cambiarlo a mano después.</div>
      <div class="campos">
        <div class="campo"><label>Fecha de entrega real <span class="req">*</span></label>
          <input id="ceFecha" type="date" value="${hoy}" max="${hoy}"></div>
        <div class="campo ancho"><label>Nota</label>
          <input id="ceNota" type="text" placeholder="Opcional — quién confirmó, referencia…" maxlength="200"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="ceGuardar">Confirmar entrega</button>
        <button class="btn-mini gris" id="ceCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="ceAviso"></div>
    </div>`;

    document.getElementById('ceCancelar').addEventListener('click', () => { cont.innerHTML = ''; });
    document.getElementById('ceGuardar').addEventListener('click', guardarConfirmarEntrega);
    document.getElementById('ceFecha').focus();
  }

  async function guardarConfirmarEntrega() {
    const fecha = document.getElementById('ceFecha').value;
    const nota = document.getElementById('ceNota').value.trim();
    const btn = document.getElementById('ceGuardar');
    const hoy = hoyISO();
    const setAviso = (tipo, html) => {
      const a = document.getElementById('ceAviso');
      if (a) { a.className = 'aviso visible ' + tipo; a.innerHTML = html; }
    };

    // Validación en cliente (el backend es la autoridad, pero así el aviso es claro).
    if (!fecha) { setAviso('err', 'Elige la fecha de entrega real.'); return; }
    if (fecha > hoy) { setAviso('err', 'La entrega real no puede ser una fecha futura.'); return; }
    if (estado.d.f_embarque && fecha < estado.d.f_embarque) {
      setAviso('err', 'La entrega no puede ser anterior a la fecha de embarque.'); return;
    }

    btn.disabled = true;
    try {
      const data = await rpc('fn_confirmar_entrega', { p_folio: estado.folio, p_fecha: fecha, p_nota: nota || null });
      const r = (data && data[0]) || {};
      ERP.toast('ok', esc(r.mensaje || 'Entrega confirmada.'));
      ERP.marcarDatosSucios();          // limpia caché para releer v_carga_detalle fresco
      await verExpediente(estado.folio); // recarga el expediente: ya con entrega real y sin el botón
    } catch (e) {
      if (!ERP.avisarSiPermiso(e)) setAviso('err', `El ERP rechazó la confirmación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Pestaña PAGOS Y COBROS ================= */

  // Enlaza los folios de movimiento (columna "Mov.") a Tesorería, con scroll+resalte (E44).
  // Solo se cablean los que SÍ traen data-ir-tesoreria: mov_folio null/vacío ya se pintó como
  // texto plano, sin el atributo, así que nunca genera un link roto.
  function cablearMovLinks(cont) {
    (cont || document).querySelectorAll('[data-ir-tesoreria]').forEach(el => {
      if (el._irTesWired) return; el._irTesWired = true;
      el.addEventListener('click', () => ERP.irModulo('tesoreria', 'mov:' + el.dataset.irTesoreria));
    });
  }

  function htmlPagos(apls, d) {
    const cobros = apls.filter(a => a.clase === 'cobro');
    const pagos = apls.filter(a => a.clase !== 'cobro');
    const colContra = ERP.columna(apls, ['contraparte', 'beneficiario', 'cliente', 'proveedor']);
    const colNota = ERP.columna(apls, ['nota']);

    const tabla = (filas, etiqueta, pos) => {
      if (!filas.length) return `<div class="vacio" style="padding:10px 0">Sin ${esc(etiqueta)}.</div>`;
      const tot = filas.reduce((s, a) => s + num(a.monto), 0);
      const cols = colContra ? 3 : 2;
      return `<div class="tabla-wrap"><table>
        <thead><tr><th>Fecha</th><th>Mov.</th>${colContra ? '<th>Contraparte</th>' : ''}<th>Detalle</th><th class="num">Monto</th></tr></thead>
        <tbody>${filas.map(a => `<tr>
          <td>${esc(ERP.fecha(a.fecha))}</td>
          <td class="mono">${a.mov_folio ? `<span class="chip-folio" data-ir-tesoreria="${esc(a.mov_folio)}" title="Ver en Tesorería">${esc(a.mov_folio)}</span>` : '—'}</td>
          ${colContra ? `<td>${esc(a[colContra] || '—')}</td>` : ''}
          <td>${esc((colNota && a[colNota]) || a.descripcion || '—')}</td>
          <td class="num ${pos ? 'pos' : 'neg'}">${usd(a.monto)}</td></tr>`).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="${cols}">Total ${esc(etiqueta)}</td><td class="num">${usd(tot)}</td></tr></tfoot>
      </table></div>`;
    };

    return `
      <div class="seccion-head"><h4>Cobros (ingresos)</h4></div>
      ${tabla(cobros, 'cobros', true)}
      <div class="seccion-head"><h4>Pagos (egresos)</h4></div>
      ${tabla(pagos, 'pagos', false)}
      <div class="seccion-head"><h4>Saldos de este embarque</h4></div>
      <div class="tabla-wrap"><table><tbody>
        <tr><td>Venta / Cobrado</td><td class="num">${usd(d.ingreso_venta)} / ${usd(d.cobrado)}</td></tr>
        <tr class="total"><td>Saldo por cobrar</td><td class="num">${usd(d.saldo_cxc)}</td></tr>
        <tr><td>Costo / Pagado</td><td class="num">${usd(d.costo_total)} / ${usd(d.pagado)}</td></tr>
        <tr class="total"><td>Saldo por pagar</td><td class="num">${usd(d.saldo_cxp)}</td></tr>
      </tbody></table></div>
      <div class="leyenda">Los cobros y pagos se aplican por FIFO a la contraparte; un mismo
        movimiento bancario puede repartirse entre varios embarques. Solo lectura.</div>`;
  }

  /* ================= Pestaña DOCUMENTOS ================= */
  // Consolidado (2026-07-22): delega en el componente OFICIAL ERP.documentos
  // (sistema documentos + v_documentos + fn_registrar_documento). La tabla carga_documentos
  // quedó JUBILADA — su mov_folio INTEGER causaba errores al anotar la PO del cliente.
  // La misma pieza la usa la ficha clásica; la PO/contenedor/guía va en "Referencia externa".
  async function montarDocumentos(container, folio, anulado) {
    if (!ERP.documentos || typeof ERP.documentos.montar !== 'function') {
      container.innerHTML = '<div class="errbox">El componente de documentos no está disponible.</div>';
      return;
    }
    await ERP.documentos.montar(container, { entidad: 'carga', entidadId: folio, permitirSubir: !anulado });
  }


  ERP.verExpediente = verExpediente;
})();
