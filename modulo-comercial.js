/* Módulo Cotizaciones y Órdenes de compra (B4).
   Dos documentos con la misma mecánica (captura con líneas, listado, detalle, estados,
   anular, PDF) → un motor genérico parametrizado por `cfg`.

   Permisos: crear/cambiar estado → capturar · anular → administrar. El backend valida igual. */

(function () {
  'use strict';
  const { q, rpc, esc, num, fmt } = ERP;

  /* ================= Configuración por tipo ================= */

  const TIPOS = {
    cotizacion: {
      id: 'cotizacion', plural: 'Cotizaciones', singular: 'cotización', articulo: 'la',
      contraLabel: 'Cliente', catalogo: 'v_catalogo_clientes',
      vistaHead: 'v_cotizaciones', vistaItems: 'v_cotizacion_items', fk: 'cotizacion_folio',
      contraCol: 'cliente', creditoCol: 'cliente_dias_credito',
      idCol: 'cliente_id', envioTipo: 'cotizacion', storageDir: 'cotizaciones', tipoTexto: 'cotización',
      rpcCrear: 'fn_crear_cotizacion', rpcEstado: 'fn_cambiar_estado_cotizacion', rpcAnular: 'fn_anular_cotizacion',
      transiciones: { Borrador: ['Enviada'], Enviada: ['Aceptada', 'Rechazada', 'Vencida'] },
      colFecha: { key: 'vigente_hasta', label: 'Vigente hasta' },
      docTitulo: 'COTIZACIÓN', nuevoBtn: '+ Nueva cotización',
      crearArgs: cab => ({
        p_cliente_id: cab.contraId, p_items: cab.items, p_moneda: cab.moneda,
        p_vigencia_dias: cab.vigencia_dias, p_condiciones: cab.condiciones || null, p_notas: cab.notas || null
      })
    },
    orden: {
      id: 'orden', plural: 'Órdenes de compra', singular: 'orden de compra', articulo: 'la',
      contraLabel: 'Proveedor', catalogo: 'v_catalogo_proveedores',
      vistaHead: 'v_ordenes_compra', vistaItems: 'v_orden_compra_items', fk: 'orden_folio',
      contraCol: 'proveedor', creditoCol: 'dias_credito',
      idCol: 'proveedor_id', envioTipo: 'orden_compra', storageDir: 'ordenes', tipoTexto: 'orden de compra',
      rpcCrear: 'fn_crear_orden_compra', rpcEstado: 'fn_cambiar_estado_orden', rpcAnular: 'fn_anular_orden',
      transiciones: { Borrador: ['Enviada'], Enviada: ['Confirmada'], Confirmada: ['Recibida'] },
      colFecha: { key: 'fecha_vencimiento', label: 'Vence' },
      docTitulo: 'ORDEN DE COMPRA', nuevoBtn: '+ Nueva orden de compra',
      crearArgs: cab => ({
        p_proveedor_id: cab.contraId, p_items: cab.items, p_moneda: cab.moneda,
        p_f_entrega_est: cab.f_entrega_est || null, p_condiciones: cab.condiciones || null, p_notas: cab.notas || null
      })
    }
  };

  /* Color del chip por estado (los de éxito quedan verdes = pill por defecto). */
  const CHIP = {
    Borrador: 'gris', Enviada: 'ambar', Aceptada: '', Confirmada: 'ambar', Recibida: '',
    Rechazada: 'rojo', Vencida: 'gris', Anulada: 'rojo', Cancelada: 'rojo'
  };
  const chip = e => `<span class="pill ${CHIP[e] || ''}">${esc(e || '—')}</span>`;

  /** Monto con su moneda. USD implícito; cualquier otra se rotula. */
  const monto = (n, moneda) => `$${fmt(n)}${moneda && moneda !== 'USD' ? ' ' + esc(moneda) : ''}`;

  /* ================= Estado del módulo ================= */

  let pestana = 'cotizacion';
  let headers = [];
  let busqueda = '';

  function aviso(id, tipo, html) {
    const el = document.getElementById(id);
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  function limpiarAviso(id) { const el = document.getElementById(id); if (el) { el.className = 'aviso'; el.innerHTML = ''; } }

  /* ================= Captura con líneas dinámicas ================= */

  let combosLinea = new Map();   // idLinea -> combo de producto
  let seqLinea = 0;
  let productosCat = [];

  function nuevaLineaHtml(idLinea) {
    return `<div class="linea-doc" data-linea="${idLinea}">
      <div class="lcol prod"><label>Producto o concepto</label><div class="prod-combo"></div></div>
      <div class="lcol"><label>Cantidad</label><input class="mono l-cant" type="number" min="0" step="0.01" value="1"></div>
      <div class="lcol lcol-unidad"><label>Unidad</label><input class="l-unidad" type="text" value="caja" maxlength="12"></div>
      <div class="lcol"><label>Precio unit.</label><input class="mono l-precio" type="number" min="0" step="0.01" placeholder="0.00"></div>
      <div class="lcol lcol-importe"><label>Importe</label><div class="val l-importe">$0.00</div></div>
      <button type="button" class="quitar" title="Quitar línea" data-quitar="${idLinea}">×</button>
    </div>`;
  }

  function montarLinea(idLinea) {
    const div = document.querySelector(`.linea-doc[data-linea="${idLinea}"]`);
    const combo = ERP.crearCombo({
      contenedor: div.querySelector('.prod-combo'),
      items: productosCat.map(p => ({ id: p.id, nombre: p.nombre })),
      placeholder: 'Producto del catálogo o texto libre…',
      permitirNuevo: true, etiquetaNuevo: 'concepto libre'
    });
    combosLinea.set(idLinea, combo);
    div.querySelector('.l-cant').addEventListener('input', recalcular);
    div.querySelector('.l-precio').addEventListener('input', recalcular);
    div.querySelector(`[data-quitar="${idLinea}"]`).addEventListener('click', () => quitarLinea(idLinea));
  }

  function agregarLinea() {
    const id = ++seqLinea;
    document.getElementById('lineas').insertAdjacentHTML('beforeend', nuevaLineaHtml(id));
    montarLinea(id);
    recalcular();
  }

  function quitarLinea(id) {
    const div = document.querySelector(`.linea-doc[data-linea="${id}"]`);
    if (div) div.remove();
    combosLinea.delete(id);
    // Siempre queda al menos una línea.
    if (!document.querySelectorAll('.linea-doc').length) agregarLinea();
    recalcular();
  }

  function importeLinea(div) {
    return num(div.querySelector('.l-cant').value) * num(div.querySelector('.l-precio').value);
  }

  function recalcular() {
    let total = 0;
    document.querySelectorAll('.linea-doc').forEach(div => {
      const imp = importeLinea(div);
      total += imp;
      div.querySelector('.l-importe').textContent = monto(imp, monedaActual());
    });
    const el = document.getElementById('docTotal');
    if (el) el.textContent = monto(total, monedaActual());
  }

  const monedaActual = () => (document.getElementById('cMoneda') || {}).value || 'USD';

  async function formNuevo() {
    const cfg = TIPOS[pestana];
    ERP.abrirPanel(`Nueva ${cfg.singular}`, 'Se crea en estado Borrador', '<div class="skel">Cargando catálogos…</div>');

    let contrapartes;
    try {
      [contrapartes, productosCat] = await Promise.all([
        q(cfg.catalogo, '&order=nombre.asc'),
        q('v_catalogo_productos', '&order=nombre.asc')
      ]);
    } catch (e) {
      ERP.abrirPanel(`Nueva ${cfg.singular}`, '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    const extra = cfg.id === 'cotizacion'
      ? `<div class="campo"><label>Vigencia (días)</label>
           <input id="cVigencia" class="mono" type="number" min="1" step="1" value="15"></div>`
      : `<div class="campo"><label>Entrega estimada</label>
           <input id="cEntrega" type="date"></div>`;

    ERP.abrirPanel(`Nueva ${cfg.singular}`, 'Se crea en estado Borrador', `
      <div class="form-erp">
        <div class="doc-meta-grid">
          <div class="campo"><label>${esc(cfg.contraLabel)} <span class="req">*</span></label><div id="cContra"></div></div>
          <div class="campo"><label>Moneda</label>
            <select id="cMoneda"><option value="USD">USD</option><option value="MXN">MXN</option></select></div>
          ${extra}
        </div>

        <label style="font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--gris);font-weight:700">Líneas <span class="req">*</span></label>
        <div class="lineas-doc" id="lineas"></div>
        <button type="button" class="btn-linea" id="btnAgregarLinea">+ Agregar línea</button>
        <div class="doc-total">Total <span class="n" id="docTotal">$0.00</span></div>

        <div class="campo ancho" style="margin-top:10px"><label>Condiciones</label>
          <textarea id="cCondiciones" placeholder="Condiciones de pago, entrega…"></textarea></div>
        <div class="campo ancho"><label>Notas</label>
          <textarea id="cNotas" placeholder="Opcional"></textarea></div>

        <div class="acciones">
          <button class="btn-mini" id="cGuardar">Crear ${esc(cfg.singular)}</button>
          <button class="btn-mini gris" id="cCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="cAviso"></div>
        <div class="leyenda">En cada línea elige un producto del catálogo o escribe una descripción libre.
          El total se calcula solo.</div>
      </div>`);

    const comboContra = ERP.crearCombo({
      contenedor: document.getElementById('cContra'),
      items: contrapartes.map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] })),
      placeholder: `Busca ${cfg.contraLabel.toLowerCase()} por nombre o alias…`,
      permitirNuevo: false
    });

    combosLinea = new Map();
    seqLinea = 0;
    document.getElementById('lineas').innerHTML = '';
    agregarLinea();

    document.getElementById('cMoneda').addEventListener('change', recalcular);
    document.getElementById('btnAgregarLinea').addEventListener('click', agregarLinea);
    document.getElementById('cCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('cGuardar').addEventListener('click', () => guardarNuevo(cfg, comboContra));
  }

  function leerLineas() {
    const items = [];
    const errores = [];
    document.querySelectorAll('.linea-doc').forEach((div, i) => {
      const combo = combosLinea.get(Number(div.dataset.linea));
      const cantidad = num(div.querySelector('.l-cant').value);
      const unidad = div.querySelector('.l-unidad').value.trim() || 'caja';
      const precio = num(div.querySelector('.l-precio').value);
      const pid = combo.valorId();
      const desc = combo.valor();

      if (!pid && !desc) { errores.push(`Línea ${i + 1}: falta el producto o la descripción.`); return; }
      if (!(cantidad > 0)) { errores.push(`Línea ${i + 1}: la cantidad debe ser mayor a cero.`); return; }
      if (precio < 0) { errores.push(`Línea ${i + 1}: el precio no puede ser negativo.`); return; }

      const item = { cantidad, unidad, precio_unitario: precio };
      // producto del catálogo → producto_id; texto libre → descripcion.
      if (pid && !combo.esNuevo()) item.producto_id = pid;
      else item.descripcion = desc;
      items.push(item);
    });
    return { items, errores };
  }

  async function guardarNuevo(cfg, comboContra) {
    const btn = document.getElementById('cGuardar');
    limpiarAviso('cAviso');

    const contraId = comboContra.valorId();
    if (!contraId) { aviso('cAviso', 'err', `Elige ${cfg.contraLabel.toLowerCase()} de la lista.`); return; }

    const { items, errores } = leerLineas();
    if (errores.length) { aviso('cAviso', 'err', errores.join('<br>')); return; }
    if (!items.length) { aviso('cAviso', 'err', 'Agrega al menos una línea.'); return; }

    const cab = {
      contraId, items, moneda: monedaActual(),
      condiciones: document.getElementById('cCondiciones').value.trim(),
      notas: document.getElementById('cNotas').value.trim()
    };
    if (cfg.id === 'cotizacion') {
      cab.vigencia_dias = num(document.getElementById('cVigencia').value) || 15;
    } else {
      cab.f_entrega_est = document.getElementById('cEntrega').value || null;
    }

    btn.disabled = true;
    try {
      const data = await rpc(cfg.rpcCrear, cfg.crearArgs(cab));
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      if (!r.folio) throw new Error('el ERP no devolvió folio.');
      aviso('cAviso', 'ok', `Creada <b>${esc(r.folio)}</b> — ${r.n_items || items.length} línea(s), total ${monto(r.total, cab.moneda)}.`);
      setTimeout(() => verDoc(cfg.id, r.folio), 1000);
    } catch (e) {
      aviso('cAviso', 'err', `El ERP rechazó ${cfg.articulo} ${cfg.singular}: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Detalle ================= */

  async function verDoc(tipoId, folio) {
    const cfg = TIPOS[tipoId];
    ERP.abrirPanel(esc(folio), 'Cargando…', '<div class="skel">Cargando documento…</div>');
    try {
      const [heads, items] = await Promise.all([
        q(cfg.vistaHead, `&folio=${ERP.eq(folio)}`),
        q(cfg.vistaItems, `&${cfg.fk}=${ERP.eq(folio)}&order=orden.asc`)
      ]);
      if (!heads.length) { ERP.abrirPanel(esc(folio), '', '<p style="font-size:13px">No existe ese documento.</p>'); return; }
      pintarDetalle(cfg, heads[0], items);
    } catch (e) {
      ERP.abrirPanel(esc(folio), '', `<div class="errbox">Error: ${esc(e.message)}</div>`);
    }
  }

  function pintarDetalle(cfg, h, items) {
    const anulado = h.anulado === true;
    const puedeCapturar = ERP.puede('capturar');
    const puedeAnular = ERP.puede('administrar');
    const permitidos = (cfg.transiciones[h.estado] || []);

    const bannerAnulado = anulado ? `<div class="banner-anulada">
      <div class="t">⊘ ${esc(h.estado)}</div>
      <div class="motivo">${esc(h.anulado_motivo || '(sin motivo)')}</div>
      <div class="meta">Anulada por ${esc(h.capturado_por || '—')}. No cuenta para reportes.</div>
    </div>` : '';

    const fechaExtra = cfg.id === 'cotizacion'
      ? `<div class="det"><div class="l">Vigente hasta</div><div class="v mono">${esc(ERP.fecha(h.vigente_hasta))}</div></div>`
      : `<div class="det"><div class="l">Vence</div><div class="v mono">${esc(ERP.fecha(h.fecha_vencimiento))}</div></div>
         <div class="det"><div class="l">Entrega estimada</div><div class="v mono">${esc(ERP.fecha(h.f_entrega_est))}</div></div>`;

    const filasItems = items.length ? items.map(it => `<tr>
        <td>${esc(it.producto || it.descripcion || '—')}</td>
        <td class="num">${fmt(it.cantidad)}</td>
        <td>${esc(it.unidad || '—')}</td>
        <td class="num">${monto(it.precio_unitario, h.moneda)}</td>
        <td class="num">${monto(it.importe, h.moneda)}</td></tr>`).join('')
      : '<tr><td colspan="5" style="color:var(--gris)">Sin líneas.</td></tr>';

    const transHtml = (!anulado && puedeCapturar && permitidos.length)
      ? `<h4>Cambiar estado</h4><div class="transiciones">
          ${permitidos.map(e => `<button class="btn-mini" data-estado="${esc(e)}">Marcar ${esc(e)}</button>`).join('')}
        </div>`
      : (!anulado && puedeCapturar && !permitidos.length
          ? `<div class="leyenda">Estado <b>${esc(h.estado)}</b>: sin transiciones siguientes.</div>` : '');

    const anularHtml = (!anulado && puedeAnular)
      ? `<div class="zona-peligro">
          <span class="nota">Anular retira el documento de los reportes. No hay deshacer.</span>
          <button class="btn-mini peligro" id="btnAnularDoc">Anular</button>
        </div><div id="formAnularDoc"></div>` : '';

    ERP.abrirPanel(
      `${esc(h.folio)} ${chip(h.estado)}`,
      `${esc(h[cfg.contraCol] || '—')} · ${esc(ERP.fecha(h.fecha))}`,
      `<div class="${anulado ? 'ficha-anulada' : ''}">
        ${bannerAnulado}
        <div class="det-grid">
          <div class="det"><div class="l">${esc(cfg.contraLabel)}</div><div class="v">${esc(h[cfg.contraCol] || '—')}</div></div>
          <div class="det"><div class="l">Moneda</div><div class="v">${esc(h.moneda || 'USD')}</div></div>
          <div class="det"><div class="l">Días de crédito</div><div class="v mono">${h[cfg.creditoCol] == null ? '—' : esc(h[cfg.creditoCol])}</div></div>
          ${fechaExtra}
          <div class="det"><div class="l">Subtotal</div><div class="v mono">${monto(h.subtotal, h.moneda)}</div></div>
          <div class="det"><div class="l">Total</div><div class="v mono" style="font-weight:700">${monto(h.total, h.moneda)}</div></div>
          ${h.carga_folio ? `<div class="det"><div class="l">Carga ligada</div><div class="v mono"><span class="enlace" id="verCargaLig">${esc(h.carga_folio)}</span></div></div>` : ''}
        </div>

        <h4>Líneas (${items.length})</h4>
        <div class="tabla-wrap"><table>
          <thead><tr><th>Producto / concepto</th><th class="num">Cant.</th><th>Unidad</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead>
          <tbody>${filasItems}</tbody>
          <tfoot><tr class="total"><td colspan="4">Total</td><td class="num">${monto(h.total, h.moneda)}</td></tr></tfoot>
        </table></div>

        ${h.condiciones ? `<h4>Condiciones</h4><p style="font-size:12.5px">${esc(h.condiciones)}</p>` : ''}
        ${h.notas ? `<h4>Notas</h4><p style="font-size:12.5px">${esc(h.notas)}</p>` : ''}

        ${transHtml}
        <div class="aviso" id="docAviso"></div>

        <h4>Documento</h4>
        <div class="transiciones">
          <button class="btn-mini gris" id="btnPdf">Exportar PDF</button>
          <button class="btn-mini gris" id="btnDocOficial">${cfg.id === 'cotizacion' ? 'Generar Quote (PDF)' : 'Generar PO (PDF)'}</button>
          ${(!anulado && ERP.puede('capturar')) ? `
            <span class="solo-lectura" style="font-style:normal;font-weight:600;color:var(--tinta)">Enviar:</span>
            <button class="btn-mini" id="btnWhatsapp">WhatsApp</button>
            <button class="btn-mini gris" id="btnCorreo" disabled title="Próximamente (cuando esté Resend)">Correo</button>` : ''}
        </div>

        <h4>Envíos</h4>
        <div id="enviosPanel"><div class="skel">Cargando envíos…</div></div>
      </div>
      ${anularHtml}`
    );

    const cuerpo = document.getElementById('panelBody');
    cuerpo.querySelectorAll('[data-estado]').forEach(b =>
      b.addEventListener('click', () => cambiarEstado(cfg, h.folio, b.dataset.estado)));

    const btnAnular = document.getElementById('btnAnularDoc');
    if (btnAnular) btnAnular.addEventListener('click', () => formAnular(cfg, h.folio));

    const verCarga = document.getElementById('verCargaLig');
    if (verCarga) verCarga.addEventListener('click', () => ERP.verCarga(h.carga_folio));

    document.getElementById('btnPdf').addEventListener('click', (ev) => exportarPdf(ev.currentTarget, cfg, h, items));
    document.getElementById('btnDocOficial').addEventListener('click', () =>
      cfg.id === 'cotizacion' ? generarQuoteOficial(h.folio) : ERP.generarPOOficial(h.folio));

    const btnWa = document.getElementById('btnWhatsapp');
    if (btnWa) btnWa.addEventListener('click', () => enviarWhatsapp(cfg, h, items));

    refrescarEnvios(cfg, h.folio);
  }

  async function cambiarEstado(cfg, folio, estado) {
    document.querySelectorAll('[data-estado]').forEach(b => (b.disabled = true));
    try {
      await rpc(cfg.rpcEstado, { p_folio: folio, p_estado: estado });
      ERP.marcarDatosSucios();
      await verDoc(cfg.id, folio);
    } catch (e) {
      aviso('docAviso', 'err', `No se pudo cambiar el estado: ${esc(e.message)}`);
      document.querySelectorAll('[data-estado]').forEach(b => (b.disabled = false));
    }
  }

  function formAnular(cfg, folio) {
    const cont = document.getElementById('formAnularDoc');
    if (cont.innerHTML) { cont.innerHTML = ''; return; }
    cont.innerHTML = `<div class="form-erp peligro">
      <div class="campo ancho"><label>Motivo de la anulación <span class="req">*</span></label>
        <textarea id="anMotivo" placeholder="Por qué se anula. Queda registrado."></textarea></div>
      <div class="acciones">
        <button class="btn-mini confirmar-peligro" id="anConfirmar">Confirmar anulación de ${esc(folio)}</button>
        <button class="btn-mini gris" id="anCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="anAviso"></div>
    </div>`;
    document.getElementById('anCancelar').addEventListener('click', () => { cont.innerHTML = ''; });
    document.getElementById('anConfirmar').addEventListener('click', async () => {
      const motivo = document.getElementById('anMotivo').value.trim();
      if (!motivo) { aviso('anAviso', 'err', 'El motivo es obligatorio.'); return; }
      document.getElementById('anConfirmar').disabled = true;
      try {
        await rpc(cfg.rpcAnular, { p_folio: folio, p_motivo: motivo });
        ERP.marcarDatosSucios();
        await verDoc(cfg.id, folio);
      } catch (e) {
        aviso('anAviso', 'err', `No se anuló: ${esc(e.message)}`);
        document.getElementById('anConfirmar').disabled = false;
      }
    });
  }

  /* ================= Quote oficial (membrete Plein, v_documento_quote) =================
     Documento aparte del "Exportar PDF" (jsPDF) de abajo: usa el motor DOM (ERP.imprimirArea) y
     el mismo membrete/tabla/footer compartidos con Invoice y Purchase Order
     (ERP.membreteOficial / ERP.pieOficial / ERP.tablaLineasDoc, ver exportar.js). Solo se arma
     aquí lo propio del quote: título, meta y el bloque BILL TO del cliente. */

  const MESES4 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha4(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return `${String(d.getDate()).padStart(2, '0')}-${MESES4[d.getMonth()]}-${d.getFullYear()}`;
  }

  /** BILL TO: una línea por campo, en este orden, omitiendo los vacíos (mismo criterio que el
      invoice oficial). */
  function lineasBillToQuote(qt) {
    return [qt.bill_to_nombre, qt.bill_to_direccion, qt.bill_to_ciudad, qt.bill_to_pais, qt.bill_to_tel]
      .map(v => (v && String(v).trim()) ? String(v).trim() : null)
      .filter(Boolean);
  }
  function bloqueBillToQuote(qt) {
    const lns = lineasBillToQuote(qt);
    return lns.length ? lns.map(esc).join('<br>') : '<span class="sin-alias">— sin datos de facturación —</span>';
  }

  async function generarQuoteOficial(folio) {
    let qt;
    try {
      const rows = await q('v_documento_quote', `&folio=${ERP.eq(folio)}`);
      qt = rows && rows[0];
      if (!qt) throw new Error('No existe el documento de Quote para esta cotización.');
    } catch (e) {
      ERP.toast('err', `No se pudo generar el quote: ${esc(e.message)}`);
      return;
    }
    ERP.imprimirArea(htmlQuoteOficial(qt));
  }

  function htmlQuoteOficial(qt) {
    const lin = Array.isArray(qt.lineas) ? qt.lineas : [];
    const subtotal = num(qt.subtotal);
    const total = num(qt.total);

    return `<div class="inv-doc">
      ${ERP.membreteOficial('QUOTE', [
        ['DATE', fecha4(qt.fecha)],
        ['QUOTE #', qt.numero || 'BORRADOR'],
        ['VALID UNTIL', fecha4(qt.vigente_hasta)],
        ['REF. INTERNA', qt.folio]
      ])}
      <div class="inv-boxes">
        <div class="inv-box"><div class="inv-box-h">BILL TO</div><div class="inv-box-b">${bloqueBillToQuote(qt)}</div></div>
      </div>
      ${ERP.tablaLineasDoc(lin)}
      <div class="inv-bottom">
        <div class="inv-comments"><div class="inv-box-h">Other Comments or Special Instructions</div><div class="inv-box-b">${esc(qt.condiciones || qt.notas || '').replace(/\n/g, '<br>')}</div></div>
        <table class="inv-totals">
          <tr><td>SUBTOTAL</td><td class="num">${ERP.usd(subtotal)}</td></tr>
          <tr class="inv-grand"><td>TOTAL</td><td class="num">${ERP.usd(total)}</td></tr>
        </table>
      </div>
      ${ERP.pieOficial()}
    </div>`;
  }

  /* ================= PDF (jsPDF + autoTable, carga diferida por CDN) ================= */

  let pdfPromesa = null;
  function inyectar(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = () => rej(new Error('no se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }
  function cargarPdf() {
    if (pdfPromesa) return pdfPromesa;
    pdfPromesa = inyectar('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js')
      .then(() => inyectar('https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'))
      .catch(e => { pdfPromesa = null; throw e; });
    return pdfPromesa;
  }

  /** Arma el documento jsPDF y lo devuelve (sin guardarlo). Reutilizado por exportar y enviar. */
  async function construirDoc(cfg, h, items) {
    await cargarPdf();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const M = h.moneda || 'USD';
    const money = n => monto(n, M).replace(/<[^>]+>/g, '');

    {

      // Logo de marca (reutiliza el loader compartido de exportar.js) en vez del texto de empresa.
      const _logo = ERP.logoPdfDataURL ? await ERP.logoPdfDataURL() : null;
      if (_logo) { try { const _p = doc.getImageProperties(_logo); const _h = 24, _w = _p.width / _p.height * _h; doc.addImage(_logo, 'PNG', 40, 26, _w, _h); } catch (_) { /* sin logo */ } }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(`${cfg.docTitulo} · ${h.folio}`, 40, 74);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
      doc.text(`Fecha: ${ERP.fecha(h.fecha)}`, 40, 94);
      doc.text(`Estado: ${h.estado}`, 200, 94);
      doc.text(`${cfg.contraLabel}: ${h[cfg.contraCol] || '—'}`, 40, 110);
      if (h[cfg.creditoCol] != null) doc.text(`Días de crédito: ${h[cfg.creditoCol]}`, 40, 126);

      doc.autoTable({
        startY: 144,
        head: [['Producto / concepto', 'Cant.', 'Unidad', 'Precio', 'Importe']],
        body: items.map(it => [
          (ERP.descLineaDoc ? ERP.descLineaDoc(it.producto, it.descripcion) : (it.producto || it.descripcion || '')) || '—',
          fmt(it.cantidad), it.unidad || '—', money(it.precio_unitario), money(it.importe)
        ]),
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [25, 107, 36] },   // verde de marca #196B24 (unificación de documentos)
        columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        margin: { left: 40, right: 40 }
      });

      let y = doc.lastAutoTable.finalY + 18;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
      doc.text(`Subtotal: ${money(h.subtotal)}`, 400, y);
      doc.text(`Total: ${money(h.total)}`, 400, y + 16);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);

      y += 44;
      const vig = cfg.id === 'cotizacion'
        ? `Vigente hasta ${ERP.fecha(h.vigente_hasta)}`
        : `Vence ${ERP.fecha(h.fecha_vencimiento)}` + (h.f_entrega_est ? ` · Entrega estimada ${ERP.fecha(h.f_entrega_est)}` : '');
      doc.text(vig, 40, y); y += 18;
      if (h.condiciones) { doc.text(doc.splitTextToSize('Condiciones: ' + h.condiciones, 515), 40, y); y += 16 + 11 * doc.splitTextToSize(h.condiciones, 515).length; }
      if (h.notas) { doc.text(doc.splitTextToSize('Notas: ' + h.notas, 515), 40, y); }
    }
    return doc;
  }

  async function exportarPdf(boton, cfg, h, items) {
    const txt = boton.textContent;
    boton.disabled = true; boton.textContent = 'Generando…';
    try {
      const doc = await construirDoc(cfg, h, items);
      doc.save(`${h.folio}.pdf`);
    } catch (e) {
      aviso('docAviso', 'err', `No se pudo generar el PDF: ${esc(e.message)}`);
    }
    boton.disabled = false; boton.textContent = txt;
  }

  /* ================= Envío por WhatsApp ================= */

  const soloDigitos = t => String(t || '').replace(/\D/g, '');
  const BUCKET = 'documentos';
  const rutaEnvio = (cfg, folio) => `envios/${cfg.storageDir}/${folio}.pdf`;

  /** Teléfono WhatsApp de la contraparte del documento (solo dígitos), o '' si no hay. */
  async function telefonoDe(cfg, h) {
    const id = h[cfg.idCol];
    if (id == null) return '';
    const filas = await q(cfg.catalogo, `&id=eq.${id}`);
    return soloDigitos((filas[0] || {}).telefono_whatsapp);
  }

  function mensajeWhatsapp(cfg, h, signedUrl) {
    const nombre = h[cfg.contraCol] || '—';
    const totalTxt = monto(h.total, h.moneda).replace(/<[^>]+>/g, '');
    const vig = cfg.id === 'cotizacion'
      ? `Vigencia: ${ERP.fecha(h.vigente_hasta)}`
      : `Entrega estimada: ${ERP.fecha(h.f_entrega_est)}`;
    return `Hola, te comparto la ${cfg.tipoTexto} ${h.folio} de Plein Produce.\n` +
      `${cfg.contraLabel}: ${nombre}\nTotal: ${totalTxt}\n${vig}\n` +
      `Documento (link 7 días): ${signedUrl}`;
  }

  async function enviarWhatsapp(cfg, h, items) {
    limpiarAviso('docAviso');
    const boton = document.getElementById('btnWhatsapp');
    if (boton) { boton.disabled = true; boton.textContent = 'Preparando…'; }
    const restaurar = () => { if (boton) { boton.disabled = false; boton.textContent = 'WhatsApp'; } };

    try {
      // Teléfono primero: si falta, pedirlo y no seguir (evita subir un PDF que no se usará).
      const tel = await telefonoDe(cfg, h);
      if (!tel) { restaurar(); formTelefono(cfg, h, items); return; }

      // a+b. PDF (reusa B4) → Blob → subir. contentType SIEMPRE application/pdf.
      const doc = await construirDoc(cfg, h, items);
      const blob = doc.output('blob');
      const path = rutaEnvio(cfg, h.folio);
      const up = await ERP.sb.storage.from(BUCKET).upload(path, blob, { contentType: 'application/pdf', upsert: true });
      if (up.error) throw new Error('subida: ' + up.error.message);

      // d. Link firmado 7 días para el mensaje.
      const firm = await ERP.sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (firm.error) throw new Error('firma: ' + firm.error.message);
      const signedUrl = firm.data.signedUrl;

      const mensaje = mensajeWhatsapp(cfg, h, signedUrl);

      // g. Registrar el envío ANTES de abrir wa.me (si falla, no abrimos). p_pdf_url = PATH.
      await rpc('fn_registrar_envio', {
        p_tipo: cfg.envioTipo, p_folio: h.folio, p_canal: 'whatsapp',
        p_destinatario: tel, p_asunto: null, p_mensaje: mensaje,
        p_pdf_url: path, p_estado: 'pendiente',
        p_proveedor_envio: 'wa.me', p_proveedor_ref: null, p_error_detalle: null
      });
      ERP.marcarDatosSucios();

      // f. Abrir wa.me. Si el navegador bloquea el popup, dejamos el link a mano.
      const url = `https://wa.me/${tel}?text=${encodeURIComponent(mensaje)}`;
      const win = window.open(url, '_blank', 'noopener');
      aviso('docAviso', 'ok',
        `Envío registrado a <b>${esc(tel)}</b>.` +
        (win ? ' Se abrió WhatsApp en otra pestaña.' : ` <a href="${esc(url)}" target="_blank" rel="noopener">Abrir WhatsApp</a>`) +
        ' Cuando lo mandes, márcalo como enviado abajo.');

      await refrescarEnvios(cfg, h.folio);
    } catch (e) {
      // Error de subida o RPC: NO se abre wa.me.
      aviso('docAviso', 'err', `No se pudo enviar: ${esc(e.message)}`);
    }
    restaurar();
  }

  /** Mini-form para capturar el teléfono faltante y reintentar el envío. */
  function formTelefono(cfg, h, items) {
    aviso('docAviso', 'warn', `
      <div>${esc(h[cfg.contraCol] || 'La contraparte')} no tiene WhatsApp registrado.</div>
      <div class="form-erp" style="margin-top:8px">
        <div class="campo ancho"><label>Teléfono WhatsApp (con lada país) <span class="req">*</span></label>
          <input id="telNuevo" class="mono" type="tel" placeholder="521 55 1234 5678"></div>
        <div class="acciones">
          <button class="btn-mini" id="telGuardar">Guardar y enviar</button>
          <button class="btn-mini gris" id="telCancelar">Cancelar</button>
        </div>
      </div>`);
    document.getElementById('telCancelar').addEventListener('click', () => limpiarAviso('docAviso'));
    document.getElementById('telGuardar').addEventListener('click', async () => {
      const dig = soloDigitos(document.getElementById('telNuevo').value);
      if (dig.length < 8) { document.getElementById('telNuevo').focus(); return; }
      const btn = document.getElementById('telGuardar'); btn.disabled = true;
      try {
        // RPC angosta a nivel 'capturar' (fn_editar_contraparte es admin-only y rebotaba).
        await rpc('fn_set_contacto_contraparte', { p_id: h[cfg.idCol], p_telefono_whatsapp: dig });
        ERP.limpiarCache();
        enviarWhatsapp(cfg, h, items);   // reintenta ya con el teléfono
      } catch (e) {
        aviso('docAviso', 'err', `No se pudo guardar el teléfono: ${esc(e.message)}`);
      }
    });
  }

  /* ================= Panel de envíos ================= */

  async function refrescarEnvios(cfg, folio) {
    const cont = document.getElementById('enviosPanel');
    if (!cont) return;
    try {
      const envios = await q('v_envios', `&folio=${ERP.eq(folio)}&order=creado_en.desc`);
      cont.innerHTML = pintarEnvios(envios);
      cont.querySelectorAll('[data-verpdf]').forEach(b =>
        b.addEventListener('click', () => verPdfEnvio(b, b.dataset.verpdf)));
      cont.querySelectorAll('[data-marcar]').forEach(b =>
        b.addEventListener('click', () => marcarEnviado(cfg, folio, b.dataset.marcar)));
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudo cargar la bitácora: ${esc(e.message)}</div>`;
    }
  }

  function pintarEnvios(envios) {
    if (!envios.length) return '<div class="docs-vacio">Sin envíos registrados.</div>';
    const puedeMarcar = ERP.puede('capturar');
    const puedeVer = ERP.puede('ver');
    const chipEnvio = e => `<span class="pill ${e === 'enviado' ? '' : e === 'error' ? 'rojo' : 'ambar'}">${esc(e || '—')}</span>`;
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Canal</th><th>Destinatario</th><th>Estado</th><th>Creado</th><th>Enviado</th><th></th></tr></thead>
      <tbody>${envios.map(e => `<tr>
        <td>${esc(e.canal)}</td>
        <td class="mono">${esc(e.destinatario || '—')}</td>
        <td>${chipEnvio(e.estado)}</td>
        <td>${esc(ERP.fecha(e.creado_en))}</td>
        <td>${esc(e.enviado_en ? ERP.fecha(e.enviado_en) : '—')}</td>
        <td><span class="acciones-doc">
          ${puedeVer && e.pdf_url ? `<button class="btn-mini gris" data-verpdf="${esc(e.pdf_url)}">Ver PDF</button>` : ''}
          ${puedeMarcar && e.estado !== 'enviado' ? `<button class="btn-mini" data-marcar="${esc(e.id)}">Marcar enviado</button>` : ''}
        </span></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  async function verPdfEnvio(boton, path) {
    const txt = boton.textContent; boton.disabled = true; boton.textContent = 'Abriendo…';
    try {
      const { data, error } = await ERP.sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7);
      if (error) throw new Error(error.message);
      const a = document.createElement('a');
      a.href = data.signedUrl; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      aviso('docAviso', 'err', `No se pudo abrir el PDF: ${esc(e.message)}`);
    }
    boton.disabled = false; boton.textContent = txt;
  }

  async function marcarEnviado(cfg, folio, id) {
    try {
      await rpc('fn_actualizar_estado_envio', { p_id: Number(id), p_estado: 'enviado' });
      ERP.marcarDatosSucios();
      await refrescarEnvios(cfg, folio);
    } catch (e) {
      aviso('docAviso', 'err', `No se pudo marcar: ${esc(e.message)}`);
    }
  }

  /* ================= Listado ================= */

  function filtrados() {
    const t = ERP.norm(busqueda);
    if (!t) return headers;
    const cfg = TIPOS[pestana];
    return headers.filter(h =>
      ERP.norm(h.folio).includes(t) || ERP.norm(h[cfg.contraCol]).includes(t) || ERP.norm(h.estado).includes(t));
  }

  function pintarLista() {
    const cfg = TIPOS[pestana];
    const filas = filtrados();
    const cont = document.getElementById('comTabla');
    document.getElementById('comConteo').textContent = `${filas.length} de ${headers.length}`;

    if (!filas.length) { cont.innerHTML = '<div class="vacio">Sin documentos.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr>
        <th>Folio</th><th>N° oficial</th><th>Fecha</th><th>${esc(cfg.contraLabel)}</th><th>Estado</th>
        <th class="num">Total</th><th>${esc(cfg.colFecha.label)}</th>
      </tr></thead>
      <tbody>${filas.map(h => `<tr class="clic ${h.anulado ? 'anulada' : ''}" data-folio="${esc(h.folio)}">
        <td class="mono"><span class="enlace">${esc(h.folio)}</span></td>
        <td class="mono">${h.numero ? esc(h.numero) : '—'}</td>
        <td>${esc(ERP.fecha(h.fecha))}</td>
        <td>${esc(h[cfg.contraCol] || '—')}</td>
        <td>${chip(h.estado)}</td>
        <td class="num">${monto(h.total, h.moneda)}</td>
        <td class="mono">${esc(ERP.fecha(h[cfg.colFecha.key]))}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic').forEach(tr =>
      tr.addEventListener('click', () => verDoc(cfg.id, tr.dataset.folio)));
  }

  async function cargarLista() {
    const cfg = TIPOS[pestana];
    headers = await q(cfg.vistaHead, '&order=fecha.desc');
  }

  /* ================= Módulo ================= */

  function barra() {
    const cfg = TIPOS[pestana];
    return `
      <div class="pestanas">
        <button class="pestana ${pestana === 'cotizacion' ? 'activa' : ''}" data-tab="cotizacion">Cotizaciones</button>
        <button class="pestana ${pestana === 'orden' ? 'activa' : ''}" data-tab="orden">Órdenes de compra</button>
      </div>
      <div class="filtros">
        <input class="busca" id="comBusca" type="text" placeholder="Buscar por folio, ${esc(cfg.contraLabel.toLowerCase())} o estado…" value="${esc(busqueda)}">
        ${ERP.puede('capturar') ? `<button class="btn-mini" id="comNuevo">${esc(cfg.nuevoBtn)}</button>` : ''}
        <span class="conteo" id="comConteo"></span>
      </div>
      <div class="card" style="padding:14px"><div id="comTabla"><div class="skel">Cargando…</div></div></div>`;
  }

  async function conectar(cont) {
    cont.querySelectorAll('.pestana').forEach(p => p.addEventListener('click', async () => {
      if (p.dataset.tab === pestana) return;
      pestana = p.dataset.tab; busqueda = '';
      cont.innerHTML = barra();
      await conectar(cont);
    }));

    let tempo;
    document.getElementById('comBusca').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { busqueda = e.target.value; pintarLista(); }, 150);
    });
    const nuevo = document.getElementById('comNuevo');
    if (nuevo) nuevo.addEventListener('click', formNuevo);

    try { await cargarLista(); pintarLista(); }
    catch (e) { document.getElementById('comTabla').innerHTML = `<div class="errbox">No se pudo cargar: ${esc(e.message)}</div>`; }
  }

  async function render(cont) {
    pestana = 'cotizacion'; busqueda = '';
    cont.innerHTML = barra();
    await conectar(cont);
  }

  // Abridor global para que otros módulos (p.ej. Tareas) abran un documento por su folio.
  ERP.verComercial = (tipoId, folio) => TIPOS[tipoId] && verDoc(tipoId, folio);

  ERP.registrar('comercial', {
    titulo: 'Cotizaciones y órdenes',
    descripcion: 'Cotizaciones a clientes y órdenes de compra a proveedores',
    render
  });
})();
