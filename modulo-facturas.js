/* Módulo Facturación (ruta 'facturas') — facturas de embarques. Backend E32, no se toca.
   Vistas: v_facturas (id, numero, carga_folio, so_folio, po, cliente, fecha_emision, terminos,
           estado, total, bill_to, ship_to, lineas jsonb, comentarios, creado_por, creado_en) —
           carga_folio puede venir NULL en facturas nacidas de una Orden de Venta (E76); po ya
           viene COALESCE.
           v_cxc (folio, po, cliente, ingreso_venta, cobrado, saldo_cxc, f_vencimiento, dias_vencido)
           v_sales_orders (folio, cliente, estado, anulado, revenue_model) — picker de "Factura
           desde Orden de Venta" y de confirmación rápida.
   estado: borrador | emitida | anulada  (el estado cancelado es 'anulada'; se muestra como "Cancelada")
   RPCs (todas capacidad 'capturar'):
     fn_crear_factura(p_carga_folio) -> (r_id, r_advertencia)   [ruta legacy, intacta]
     fn_crear_factura_desde_so(p_so_folio, p_numero) -> (r_id, r_advertencia) [E76] — exige SO
       'Confirmada'|'Cerrada'; bloquea consignación/comisión (error del backend tal cual).
     fn_editar_factura(p_id, p_numero, p_fecha, p_terminos, p_bill_to, p_ship_to, p_lineas jsonb, p_comentarios, p_estado)
     fn_emitir_factura(p_id) -> (r_id, r_numero)   borrador -> emitida, número PP-AAAA-NNNN
     fn_cancelar_factura(p_id, p_motivo) -> (r_id, r_estado)
     fn_confirmar_so(p_folio) — capacidad 'capturar', usada aquí solo como atajo para confirmar una
       SO en Borrador sin salir de Facturación (el flujo completo vive en modulo-ventas.js).
   El número NO se edita a mano (serie). El estado de PAGO se lee de v_cxc (no es flag manual).
   Expone: ERP.verFactura, ERP.montarFacturasCarga, ERP.generarInvoiceDesdeCarga, ERP.nuevaFactura,
   ERP.nuevaFacturaDesdeSO */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num } = ERP;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha4(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return `${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}-${d.getFullYear()}`;
  }
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

  // El backend usa 'anulada' para el estado cancelado (antes intentaba 'cancelada' y fallaba por el
  // CHECK). Se aceptan ambos y se muestran como "Cancelada" (gris) de cara al usuario.
  const ES_CANCELADA = e => e === 'anulada' || e === 'cancelada';
  const ESTADO_PILL = { borrador: 'ambar', emitida: 'verde', cancelada: 'gris', anulada: 'gris' };
  const estadoLabel = e => ES_CANCELADA(e) ? 'Cancelada' : (e || 'borrador');
  const pillEstado = e => `<span class="pill ${ESTADO_PILL[e] || 'gris'}">${esc(estadoLabel(e))}</span>`;

  /** Celda "Cobro" a partir de la fila de v_cxc del embarque. */
  function cobroCell(c) {
    if (!c) return '<span style="color:var(--gris-claro)">—</span>';
    const saldo = num(c.saldo_cxc), cobrado = num(c.cobrado);
    if (saldo <= 0.009) return '<span class="pos">Pagado ✓</span>';
    const venc = num(c.dias_vencido) > 0;
    return `Cobrado ${usd(cobrado)} / Falta <b class="${venc ? 'neg' : ''}">${usd(saldo)}</b>` +
      (c.f_vencimiento ? `<div style="font-size:11px;color:${venc ? 'var(--rojo)' : 'var(--gris)'}">${venc ? 'venció' : 'vence'} ${esc(fecha4(c.f_vencimiento))}</div>` : '');
  }

  /* ================= Lista ================= */

  let facturas = [];
  let cxcPorFolio = {};
  let fEstado = '';
  let fTexto = '';

  function filtradas() {
    const t = ERP.norm(fTexto);
    return facturas.filter(f => {
      if (fEstado === 'anulada') { if (!ES_CANCELADA(f.estado)) return false; }
      else if (fEstado && f.estado !== fEstado) return false;
      if (!t) return true;
      return [f.numero, f.po, f.cliente, f.carga_folio, f.so_folio].some(v => ERP.norm(v).includes(t));
    });
  }

  function pintarTabla() {
    const cont = document.getElementById('factTabla');
    const conteo = document.getElementById('factConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${facturas.length} facturas`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ninguna factura coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblFacturas">
      <thead><tr><th>Número</th><th>PO</th><th>Embarque / SO</th><th>Cliente</th><th>Emisión</th><th>Términos</th>
        <th>Estado</th><th class="num">Total</th><th>Cobro</th></tr></thead>
      <tbody>${rows.map(f => `<tr class="clic" data-id="${esc(f.id)}">
        <td class="mono"><span class="enlace">${f.numero ? esc(f.numero) : '— borrador'}</span></td>
        <td class="mono">${esc(f.po || f.carga_folio || '—')}</td>
        <td class="mono">${esc(f.carga_folio || f.so_folio || '—')}</td>
        <td>${esc(f.cliente || '—')}</td>
        <td>${esc(fecha4(f.fecha_emision))}</td>
        <td>${esc(f.terminos || '—')}</td>
        <td>${pillEstado(f.estado)}</td>
        <td class="num">${usd(f.total)}</td>
        <td>${cobroCell(cxcPorFolio[f.carga_folio])}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-id]').forEach(tr =>
      tr.addEventListener('click', () => verFactura(tr.dataset.id)));
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    const [facs, cxc] = await Promise.all([
      q('v_facturas', '&order=id.desc'),
      q('v_cxc').catch(() => [])
    ]);
    facturas = facs;
    cxcPorFolio = {};
    cxc.forEach(c => { cxcPorFolio[c.folio] = c; });
    fEstado = ''; fTexto = '';

    cont.innerHTML = `<div class="pantalla-facturas">
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="factNueva">+ Nueva factura</button>' : ''}
        ${puedeCap ? '<button class="btn-mini gris" id="factNuevaSO">Factura desde Orden de Venta</button>' : ''}
        <select class="busca" id="factFEstado" style="max-width:180px">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="emitida">Emitida</option>
          <option value="anulada">Cancelada</option>
        </select>
        <input class="busca" id="factFTexto" type="text" placeholder="Buscar por número, PO, cliente o folio…">
        <span class="conteo" id="factConteo"></span>
      </div>
      ${ERP.botonesExportar ? ERP.botonesExportar('Facturas', 'Facturación', '#tblFacturas') : ''}
      <div class="card" style="padding:14px"><div id="factTabla"></div></div>
      <div class="leyenda">Toca una factura para abrir su ficha (editar, emitir, imprimir).
        El <b>número</b> lo asigna la serie al emitir (una en borrador aún no lo tiene).
        La columna <b>Cobro</b> se lee de CxC del embarque, no es un estado manual.</div>
    </div>`;

    const btnN = document.getElementById('factNueva');
    if (btnN) btnN.addEventListener('click', () => nuevaFactura());
    const btnNSO = document.getElementById('factNuevaSO');
    if (btnNSO) btnNSO.addEventListener('click', () => nuevaFacturaDesdeSO());
    document.getElementById('factFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    let tempo;
    document.getElementById('factFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });

    pintarTabla();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
  }

  /* ================= Nueva factura (elige embarque) ================= */

  let comboCarga = null;

  async function nuevaFactura() {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Nueva factura', 'Elige el embarque que se va a facturar',
      '<div class="skel">Cargando embarques…</div>');
    let cargas, facs;
    try {
      [cargas, facs] = await Promise.all([q('v_carga_detalle'), q('v_facturas').catch(() => [])]);
    } catch (e) {
      ERP.abrirPanel('Nueva factura', '', `<div class="errbox">No se pudieron leer los embarques: ${esc(e.message)}</div>`);
      return;
    }
    // Ofrece embarques no anulados que aún no tienen factura.
    const conFactura = new Set(facs.map(f => f.carga_folio));
    const disponibles = cargas.filter(c => !c.anulado && !conFactura.has(c.folio));

    ERP.abrirPanel('Nueva factura', 'Elige el embarque que se va a facturar', `
      <div class="form-erp">
        <div class="campo ancho">
          <label>Embarque <span class="req">*</span></label>
          <div id="factCarga"></div>
          <div class="alias-ayuda">Busca por folio, PO o cliente. Solo embarques sin factura.</div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="factCrear">Crear factura (borrador)</button>
          <button class="btn-mini gris" id="factCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="factNvAviso"></div>
      </div>`);

    comboCarga = ERP.crearCombo({
      contenedor: document.getElementById('factCarga'),
      items: disponibles.map(c => ({
        id: c.folio,
        nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.cliente ? ' · ' + c.cliente : ''} · ${usd(c.ingreso_venta)}`,
        alias: [c.po, c.cliente, c.folio].filter(Boolean)
      })),
      placeholder: 'Folio, PO o cliente…',
      permitirNuevo: false
    });

    document.getElementById('factCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('factCrear').addEventListener('click', crearFactura);
  }

  function avisoNv(tipo, html) {
    const el = document.getElementById('factNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function crearDesde(folio, onAviso, onDone) {
    try {
      const data = await rpc('fn_crear_factura', { p_carga_folio: folio });
      const r = (data && data[0]) || {};
      if (!r.r_id) throw new Error('El ERP no devolvió el id de la factura.');
      ERP.marcarDatosSucios();
      if (r.r_advertencia) {
        // El backend explica la advertencia (dirección faltante, carga sin cajas → qty/precio NULL, etc.);
        // se muestra tal cual, sin asumir la causa.
        ERP.toast('warn', `Factura creada en borrador, pero: ${esc(r.r_advertencia)}`, 8000);
      } else {
        ERP.toast('ok', 'Factura creada en borrador.');
      }
      onDone(r.r_id);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { onAviso && onAviso(); return; }
      if (onAviso) onAviso(`El ERP rechazó la factura: ${esc(e.message)}`);
      else ERP.toast('err', `No se pudo crear la factura: ${esc(e.message)}`, 8000);
    }
  }

  async function crearFactura() {
    const folio = comboCarga && comboCarga.valorId();
    if (!folio) { avisoNv('err', 'Elige un embarque de la lista.'); return; }
    const btn = document.getElementById('factCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando factura…');
    await crearDesde(folio,
      msg => { if (msg) avisoNv('err', msg); btn.disabled = false; },
      id => verFactura(id));
  }

  /** Desde la ficha/expediente de embarque: crea directo y abre la ficha en Facturación. */
  async function generarInvoiceDesdeCarga(folio) {
    if (!ERP.puede('capturar')) return;
    ERP.toast('warn', `Generando factura de <b>${esc(folio)}</b>…`, 2500);
    await crearDesde(folio, null, id => { ERP.ir('facturas'); setTimeout(() => verFactura(id), 60); });
  }

  /* ================= Nueva factura desde Orden de Venta (E76) ================= */

  let comboSODesde = null;

  async function nuevaFacturaDesdeSO() {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Factura desde Orden de Venta', 'Elige la orden de venta a facturar',
      '<div class="skel">Cargando órdenes de venta…</div>');
    let sos;
    try {
      sos = await q('v_sales_orders');
    } catch (e) {
      ERP.abrirPanel('Factura desde Orden de Venta', '',
        `<div class="errbox">No se pudieron leer las órdenes de venta: ${esc(e.message)}</div>`);
      return;
    }

    const facturables = (sos || []).filter(s => !s.anulado && (s.estado === 'Confirmada' || s.estado === 'Cerrada'));
    if (!facturables.length) {
      // Hoy (E76) las Órdenes de Venta nacen en Borrador: es el caso normal, no un error — se
      // ofrece confirmar directo desde aquí sin salir a Órdenes de Venta.
      const borradores = (sos || []).filter(s => !s.anulado && s.estado === 'Borrador');
      ERP.abrirPanel('Factura desde Orden de Venta', '', `
        <div class="vacio">No hay Órdenes de Venta confirmadas — confírmalas primero.</div>
        ${borradores.length ? `<div class="tabla-wrap"><table>
            <thead><tr><th>Folio</th><th>Cliente</th><th>Revenue Model</th><th></th></tr></thead>
            <tbody>${borradores.map(s => `<tr>
              <td class="mono">${esc(s.folio)}</td><td>${esc(s.cliente || '—')}</td>
              <td>${esc(s.revenue_model || '—')}</td>
              <td><button class="btn-mini gris" data-confirmar-so="${esc(s.folio)}">Confirmar SO</button></td>
            </tr>`).join('')}</tbody>
          </table></div>`
          : '<div class="vacio">Tampoco hay Órdenes de Venta en Borrador todavía.</div>'}
        <div class="aviso" id="factSOConfAviso"></div>`);
      document.querySelectorAll('[data-confirmar-so]').forEach(b =>
        b.addEventListener('click', () => confirmarSODesdeFacturas(b.dataset.confirmarSo)));
      return;
    }

    ERP.abrirPanel('Factura desde Orden de Venta', 'Elige la orden de venta a facturar', `
      <div class="form-erp">
        <div class="campo ancho"><label>Orden de venta <span class="req">*</span></label><div id="factSODesde"></div>
          <div class="alias-ayuda">Solo órdenes Confirmada o Cerrada. El backend bloquea consignación/comisión (te lo explica si aplica).</div></div>
        <div class="campo"><label>Número (opcional)</label>
          <input id="factSONumero" type="text" maxlength="40" placeholder="Se asigna al emitir si lo dejas vacío"></div>
        <div class="acciones">
          <button class="btn-mini" id="factSOCrear">Crear factura (borrador)</button>
          <button class="btn-mini gris" id="factSOCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="factSOAviso"></div>
      </div>`);

    comboSODesde = ERP.crearCombo({
      contenedor: document.getElementById('factSODesde'),
      items: facturables.map(s => ({
        id: s.folio,
        nombre: `${s.folio}${s.cliente ? ' · ' + s.cliente : ''}${s.revenue_model ? ' · ' + s.revenue_model : ''}`,
        alias: [s.cliente, s.revenue_model, s.folio].filter(Boolean)
      })),
      placeholder: 'Folio, cliente o Revenue Model…', permitirNuevo: false
    });

    document.getElementById('factSOCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('factSOCrear').addEventListener('click', crearFacturaDesdeSO);
  }

  function avisoSODesde(tipo, html) {
    const el = document.getElementById('factSOAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function crearFacturaDesdeSO() {
    const soFolio = comboSODesde && comboSODesde.valorId();
    if (!soFolio) { avisoSODesde('err', 'Elige una orden de venta de la lista.'); return; }
    const numero = ((document.getElementById('factSONumero') || {}).value || '').trim() || null;

    const btn = document.getElementById('factSOCrear');
    btn.disabled = true;
    avisoSODesde('warn', 'Creando factura…');
    try {
      const data = await rpc('fn_crear_factura_desde_so', { p_so_folio: soFolio, p_numero: numero });
      const r = (data && data[0]) || {};
      if (!r.r_id) throw new Error('El ERP no devolvió el id de la factura.');
      ERP.marcarDatosSucios();
      if (r.r_advertencia) ERP.toast('warn', `Factura creada en borrador, pero: ${esc(r.r_advertencia)}`, 8000);
      else ERP.toast('ok', 'Factura creada en borrador desde la orden de venta.');
      verFactura(r.r_id);
    } catch (e) {
      // El backend explica por qué (SO no Confirmada/Cerrada, consignación/comisión bloqueada,
      // etc.) — se muestra tal cual, nunca se esconde con un .catch defensivo.
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoSODesde('err', `El ERP rechazó la factura: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function confirmarSODesdeFacturas(folio) {
    if (!window.confirm(`¿Confirmar la orden de venta ${folio}? Lo registra el ERP.`)) return;
    const aviso = (tipo, html) => { const a = document.getElementById('factSOConfAviso'); if (a) { a.className = 'aviso visible ' + tipo; a.innerHTML = html; } };
    aviso('warn', 'Confirmando…');
    try {
      await rpc('fn_confirmar_so', { p_folio: folio });
      ERP.toast('ok', `Orden de venta ${esc(folio)} confirmada.`);
      nuevaFacturaDesdeSO();   // recarga la vista: ya debería aparecer en el picker
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      aviso('err', `No se pudo confirmar la orden de venta: ${esc(e.message)}`);
    }
  }

  /* ================= Ficha / editor ================= */

  let facturaActual = null;
  let cxcActual = null;
  let cargaEstadoActual = null;
  let lineas = [];

  async function verFactura(id) {
    ERP.abrirPanel('Factura', 'Cargando…', '<div class="skel">Cargando factura…</div>');
    let f;
    try {
      const rows = await q('v_facturas', `&id=eq.${encodeURIComponent(id)}`);
      f = rows && rows[0];
      if (!f) throw new Error('La factura no existe.');
    } catch (e) {
      ERP.abrirPanel('Factura', '', `<div class="errbox">No se pudo cargar la factura: ${esc(e.message)}</div>`);
      return;
    }
    facturaActual = f;
    cxcActual = null;
    cargaEstadoActual = null;
    // carga_folio puede venir NULL (factura nacida de una Orden de Venta, E76): sin carga que
    // consultar, cxc/estado se quedan en null y el resto del flujo degrada solo (Emitir no se
    // bloquea por un estado de embarque que no aplica a este documento).
    if (f.carga_folio) {
      try {
        const cx = await q('v_cxc', `&folio=${ERP.eq(f.carga_folio)}`);
        cxcActual = (cx && cx[0]) || null;
      } catch (_) { cxcActual = null; }

      // Estado del embarque (para el botón Emitir): fn_emitir_factura solo emite si está "Entregada".
      try {
        const cd = await q('v_carga_detalle', `&folio=${ERP.eq(f.carga_folio)}`);
        cargaEstadoActual = (cd && cd[0] && cd[0].estado) || null;
      } catch (_) { cargaEstadoActual = null; }
    }

    lineas = Array.isArray(f.lineas) ? f.lineas.map(l => ({
      item: l.item ?? '', descripcion: l.descripcion ?? '',
      qty: l.qty ?? '', precio: l.precio ?? '', total: l.total ?? ''
    })) : [];
    if (!lineas.length) lineas.push({ item: '', descripcion: '', qty: '', precio: '', total: '' });

    const puedeCap = ERP.puede('capturar');
    const editable = puedeCap && f.estado === 'borrador';   // se edita solo en borrador
    const origenTxt = f.carga_folio ? `Embarque ${f.carga_folio}` : (f.so_folio ? `Orden de venta ${f.so_folio}` : 'Sin origen');

    ERP.abrirPanel(
      `Factura ${f.numero ? esc(f.numero) : '(borrador)'}`,
      `${esc(origenTxt)} · ${esc(f.cliente || '')} · ${pillEstado(f.estado)}`,
      cuerpoEditor(f, editable, puedeCap)
    );

    montarLineas(editable);
    document.getElementById('factInvoiceOficial').addEventListener('click', () => generarInvoiceOficial(f.id));
    const bEnv = document.getElementById('factEnviarCorreo');
    if (bEnv) bEnv.addEventListener('click', () => enviarCorreo(f));

    if (editable) {
      document.getElementById('factGuardar').addEventListener('click', guardar);
      document.getElementById('factEmitir').addEventListener('click', emitir);
      document.getElementById('factAddLinea').addEventListener('click', () => {
        recogerLineas();
        lineas.push({ item: '', descripcion: '', qty: '', precio: '', total: '' });
        montarLineas(editable);
      });
    }
    const bCancel = document.getElementById('factCancelarDoc');
    if (bCancel) bCancel.addEventListener('click', cancelar);
  }

  function cuerpoEditor(f, editable, puedeCap) {
    const dis = editable ? '' : ' disabled';
    const cx = cxcActual;
    const cobroBox = `<div class="fact-cxc">
      <div class="fc-h">Cobro del embarque (CxC — se lee del banco, no es manual)</div>
      <div class="fc-grid">
        <div><span class="l">Venta</span><span class="v">${usd(cx ? cx.ingreso_venta : f.total)}</span></div>
        <div><span class="l">Cobrado</span><span class="v">${usd(cx ? cx.cobrado : 0)}</span></div>
        <div><span class="l">Saldo por cobrar</span><span class="v ${cx && num(cx.saldo_cxc) > 0.009 ? 'neg' : 'pos'}">${usd(cx ? cx.saldo_cxc : 0)}</span></div>
        <div><span class="l">Vencimiento</span><span class="v">${cx && cx.f_vencimiento ? esc(fecha4(cx.f_vencimiento)) + (num(cx.dias_vencido) > 0 ? ' · vencida' : '') : '—'}</span></div>
      </div>
    </div>`;

    const origenTxt = f.carga_folio ? `Embarque ${f.carga_folio}` : (f.so_folio ? `Orden de venta ${f.so_folio}` : 'Sin origen');
    return `<div class="form-erp fact-editor">
      <div class="campos">
        <div class="campo"><label>Origen</label>
          <div class="campo-fijo">${esc(origenTxt)}</div></div>
        <div class="campo"><label>Número</label>
          <div class="campo-fijo">${f.numero ? esc(f.numero) : 'Se asigna al emitir'}</div></div>
        <div class="campo"><label>Emisión</label>
          <div class="campo-fijo">${f.fecha_emision ? esc(fecha4(f.fecha_emision)) : 'Pendiente de emisión'}</div></div>
        <div class="campo"><label>Términos</label>
          <input id="fTerminos" type="text" maxlength="40" placeholder="NET 21" value="${esc(f.terminos || '')}"${dis}></div>
        <div class="campo"><label>Estado</label>
          <div class="campo-fijo">${esc(estadoLabel(f.estado))}</div></div>
        <div class="campo ancho"><label>Bill to (dirección de facturación)</label>
          <textarea id="fBill" rows="3"${dis}>${esc(f.bill_to || '')}</textarea></div>
        <div class="campo ancho"><label>Ship to (dirección de envío)</label>
          <textarea id="fShip" rows="3"${dis}>${esc(f.ship_to || '')}</textarea></div>
      </div>

      ${cobroBox}

      <div class="seccion-head"><h4>Líneas</h4>${editable ? '<button class="btn-mini gris" id="factAddLinea">+ Línea</button>' : ''}</div>
      <div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Item</th><th>Descripción</th><th class="num">Cantidad</th>
          <th class="num">Precio unit.</th><th class="num">Total</th>${editable ? '<th></th>' : ''}</tr></thead>
        <tbody id="factLineasBody"></tbody>
        <tfoot><tr class="total"><td colspan="4">Total factura</td>
          <td class="num" id="factSubtotal">$0.00</td>${editable ? '<td></td>' : ''}</tr></tfoot>
      </table></div>

      <div class="campo ancho" style="margin-top:12px"><label>Comentarios</label>
        <textarea id="fComentarios" rows="2" placeholder="Ej. PO#NGM238314"${dis}>${esc(f.comentarios || '')}</textarea></div>

      <div class="acciones">
        <button class="btn-mini gris" id="factInvoiceOficial">Generar/Descargar Invoice (PDF)</button>
        ${f.estado === 'emitida' ? '<button class="btn-mini" id="factEnviarCorreo">Enviar por correo</button>' : ''}
        ${editable ? `<button class="btn-mini" id="factGuardar">Guardar</button>
        <button class="btn-mini" id="factEmitir"${cargaEstadoActual && cargaEstadoActual !== 'Entregada' ? ' disabled title="Se emite cuando el embarque esté Entregada"' : ''}>Emitir factura</button>` : ''}
        ${puedeCap && (f.estado === 'borrador' || f.estado === 'emitida')
          ? '<button class="btn-mini peligro" id="factCancelarDoc">Cancelar factura</button>' : ''}
      </div>
      <div class="aviso" id="factEdAviso"></div>
    </div>`;
  }

  // Fila en modo LECTURA (factura emitida/anulada): qty/precio/total NULL → guion, nunca cero.
  function filaLineaLectura(l) {
    const qty = (l.qty === '' || l.qty == null) ? '—' : esc(l.qty);
    const precio = numOrNull(l.precio) == null ? '—' : usd(l.precio);
    const total = numOrNull(l.total) == null ? '—' : usd(l.total);
    return `<tr>
      <td>${esc(l.item) || '—'}</td>
      <td>${esc(l.descripcion) || '—'}</td>
      <td class="num">${qty}</td>
      <td class="num">${precio}</td>
      <td class="num">${total}</td>
    </tr>`;
  }

  function montarLineas(editable) {
    const body = document.getElementById('factLineasBody');
    body.innerHTML = lineas.map((l, i) => editable ? `<tr>
      <td><input class="li" data-i="${i}" data-k="item" type="text" value="${esc(l.item)}"></td>
      <td><input class="li" data-i="${i}" data-k="descripcion" type="text" value="${esc(l.descripcion)}"></td>
      <td><input class="li num" data-i="${i}" data-k="qty" type="number" step="0.01" value="${esc(l.qty)}"></td>
      <td><input class="li num" data-i="${i}" data-k="precio" type="number" step="0.01" value="${esc(l.precio)}"></td>
      <td><input class="li num" data-i="${i}" data-k="total" type="number" step="0.01" value="${esc(l.total)}"></td>
      <td><button class="btn-cap" data-del="${i}" title="Quitar línea">✕</button></td>
    </tr>` : filaLineaLectura(l)).join('');

    if (editable) {
      body.querySelectorAll('input.li').forEach(inp => inp.addEventListener('input', onLineaInput));
      body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        recogerLineas();
        lineas.splice(Number(b.dataset.del), 1);
        if (!lineas.length) lineas.push({ item: '', descripcion: '', qty: '', precio: '', total: '' });
        montarLineas(editable);
      }));
    }
    recomputarTotal();
  }

  function onLineaInput(e) {
    const i = Number(e.target.dataset.i), k = e.target.dataset.k;
    lineas[i][k] = e.target.value;
    if (k === 'qty' || k === 'precio') {
      const qn = numOrNull(lineas[i].qty), pn = numOrNull(lineas[i].precio);
      if (qn !== null && pn !== null) {
        lineas[i].total = +(qn * pn).toFixed(2);
        const totInp = document.querySelector(`input.li[data-i="${i}"][data-k="total"]`);
        if (totInp) totInp.value = lineas[i].total;
      }
    }
    recomputarTotal();
  }

  function recogerLineas() {
    document.querySelectorAll('#factLineasBody input.li').forEach(inp => {
      const i = Number(inp.dataset.i), k = inp.dataset.k;
      if (lineas[i]) lineas[i][k] = inp.value;
    });
  }

  const totalActual = () => lineas.reduce((s, l) => s + (numOrNull(l.total) || 0), 0);
  function recomputarTotal() {
    const el = document.getElementById('factSubtotal');
    if (el) el.textContent = usd(totalActual());
  }

  function avisoEd(tipo, html) {
    const el = document.getElementById('factEdAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  function lineasLimpias() {
    return lineas
      .filter(l => String(l.item).trim() || String(l.descripcion).trim() || numOrNull(l.qty) !== null || numOrNull(l.precio) !== null || numOrNull(l.total) !== null)
      .map(l => ({
        item: String(l.item || '').trim(), descripcion: String(l.descripcion || '').trim(),
        qty: numOrNull(l.qty), precio: numOrNull(l.precio), total: numOrNull(l.total) ?? 0
      }));
  }

  function botonesFicha(dis) {
    ['factGuardar', 'factEmitir', 'factCancelarDoc'].forEach(id => {
      const b = document.getElementById(id); if (b) b.disabled = dis;
    });
    // Emitir sigue bloqueado si el embarque no está "Entregada", aunque se reactiven los demás.
    const em = document.getElementById('factEmitir');
    if (em && !dis && cargaEstadoActual && cargaEstadoActual !== 'Entregada') em.disabled = true;
  }

  async function guardar() {
    recogerLineas();
    const val = id => (document.getElementById(id) || {}).value;
    // Número, fecha y estado NO se cambian aquí: se pasan tal cual (los maneja emitir/cancelar/serie).
    const args = {
      p_id: facturaActual.id,
      p_numero: facturaActual.numero || null,
      p_fecha: facturaActual.fecha_emision || null,
      p_terminos: (val('fTerminos') || '').trim() || null,
      p_bill_to: (val('fBill') || '').trim() || null,
      p_ship_to: (val('fShip') || '').trim() || null,
      p_lineas: lineasLimpias(),
      p_comentarios: (val('fComentarios') || '').trim() || null,
      p_estado: facturaActual.estado || 'borrador'
    };
    botonesFicha(true);
    avisoEd('warn', 'Guardando…');
    try {
      await rpc('fn_editar_factura', args);
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Factura guardada.');
      verFactura(facturaActual.id);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botonesFicha(false); return; }
      avisoEd('err', `El ERP rechazó la factura: ${esc(e.message)}`);
      botonesFicha(false);
    }
  }

  async function emitir() {
    if (!window.confirm('Emitir asigna el número de serie (PP-AAAA-NNNN) y la vuelve un documento oficial. ¿Continuar?')) return;
    botonesFicha(true);
    avisoEd('warn', 'Emitiendo…');
    try {
      const data = await rpc('fn_emitir_factura', { p_id: facturaActual.id });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Factura emitida con número <b>${esc(r.r_numero || '—')}</b>.`, 6000);
      verFactura(facturaActual.id);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botonesFicha(false); return; }
      avisoEd('err', `No se pudo emitir: ${esc(e.message)}`);
      botonesFicha(false);
    }
  }

  async function cancelar() {
    const motivo = window.prompt('Motivo de la cancelación (queda registrado; el número se conserva como hueco en la serie):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para cancelar.'); return; }
    botonesFicha(true);
    avisoEd('warn', 'Cancelando…');
    try {
      const data = await rpc('fn_cancelar_factura', { p_id: facturaActual.id, p_motivo: motivo.trim() });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Factura cancelada${r.r_estado ? ` (${esc(estadoLabel(r.r_estado))})` : ''}.`);
      verFactura(facturaActual.id);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botonesFicha(false); return; }
      avisoEd('err', `No se pudo cancelar: ${esc(e.message)}`);
      botonesFicha(false);
    }
  }

  /* ================= Impresión / PDF ================= */

  /* Leyenda legal PACA para el pie de la factura (v_config, clave 'factura_leyenda_paca'). Texto en
     inglés, requisito legal: se pinta TAL CUAL, no se traduce ni se recorta. ERP.q cachea por URL, así
     que reimprimir no vuelve a pegarle al backend. Si la fila no está (o viene vacía), se OMITE el pie
     —mejor sin leyenda que con una inventada— y se deja un console.warn. */
  async function leyendaPaca() {
    try {
      const rows = await q('v_config', '&clave=eq.factura_leyenda_paca&select=valor');
      const val = rows && rows[0] && rows[0].valor;
      if (val && String(val).trim()) return String(val);
      console.warn("[Facturación] v_config no trae 'factura_leyenda_paca' (o viene vacía): el PDF sale sin leyenda PACA al pie.");
      return null;
    } catch (e) {
      console.warn('[Facturación] no se pudo leer v_config para la leyenda PACA: ' + e.message + ' — el PDF sale sin el pie.');
      return null;
    }
  }

  /* Enviar por correo (INTERINO, mailto). No adjunta el PDF: el helper compartido abre el borrador y
     dispara la generación/descarga del Invoice oficial para adjuntarlo a mano (ver
     ERP.enviarPorCorreoDoc). */
  function enviarCorreo(f) {
    const total = usd(f.total);
    const asunto = `Plein Produce — Invoice ${f.numero || ''}`.trim();
    const cuerpo = `Estimado cliente,\n\nAdjunto la factura ${f.numero || ''} por ${total}. Términos: ${f.terminos || '—'}.\n\nSaludos,\nPlein Produce LLC`;
    ERP.enviarPorCorreoDoc({
      email: f.cliente_email,
      asunto, cuerpo,
      sinEmailAviso: 'El cliente no tiene email en el catálogo — captúralo en Directorio Comercial.',
      descargar: () => generarInvoiceOficial(f.id)
    });
  }

  /* ================= Invoice oficial (membrete Plein, v_documento_invoice) =================
     Único generador de PDF de Facturación (el flujo viejo basado en v_facturas + encabezadoImpresion
     se retiró: dos botones de PDF para el mismo documento invitaban a confusión sobre cuál era el
     oficial). Mismo motor (ERP.imprimirArea, DOM + CSS, window.print). El membrete (header
     claro+logo / footer verde) y la tabla de renglones son compartidos con Purchase Order y Quote
     vía ERP.membreteOficial / ERP.pieOficial / ERP.tablaLineasDoc (exportar.js) — aquí solo se arma
     lo propio del invoice: título, meta y
     el bloque BILL TO / SHIP TO desglosado que trae v_documento_invoice. */

  /** BILL TO: una línea por campo, en este orden, omitiendo los vacíos (muchos clientes hoy
      solo tienen ciudad y teléfono capturados). */
  function lineasBillTo(inv) {
    return [inv.bill_to_nombre, inv.bill_to_direccion, inv.bill_to_ciudad, inv.bill_to_pais, inv.bill_to_tel]
      .map(v => (v && String(v).trim()) ? String(v).trim() : null)
      .filter(Boolean);
  }

  function bloqueBillTo(inv) {
    const lns = lineasBillTo(inv);
    return lns.length ? lns.map(esc).join('<br>') : '<span class="sin-alias">— sin datos de facturación —</span>';
  }

  function bloqueShipTo(inv) {
    const v = (inv.ship_to_direccion && String(inv.ship_to_direccion).trim()) || '';
    return v ? esc(v).replace(/\n/g, '<br>') : '<span class="sin-alias">— sin dirección de envío capturada —</span>';
  }

  async function generarInvoiceOficial(id) {
    let inv;
    try {
      const rows = await q('v_documento_invoice', `&id=eq.${encodeURIComponent(id)}`);
      inv = rows && rows[0];
      if (!inv) throw new Error('No existe el documento de invoice para esta factura.');
    } catch (e) {
      ERP.toast('err', `No se pudo generar el invoice: ${esc(e.message)}`);
      return;
    }
    // Misma leyenda PACA que el PDF viejo (v_config, clave 'factura_leyenda_paca') — se jala del
    // mismo lugar, no se reescribe.
    const leyenda = await leyendaPaca();
    ERP.imprimirArea(htmlInvoiceOficial(inv, leyenda));
  }

  function htmlInvoiceOficial(inv, leyendaPacaTxt) {
    const lin = Array.isArray(inv.lineas) ? inv.lineas : [];
    const subtotal = lin.reduce((s, l) => s + (numOrNull(l.total) || 0), 0);
    const total = numOrNull(inv.total);
    const totalFinal = total == null ? subtotal : total;
    // Cualquier diferencia entre el total real y la suma de líneas se muestra como OTHER —
    // nunca se oculta un descuadre (mismo criterio que el centinela de v_balance).
    const otro = totalFinal - subtotal;

    return `<div class="inv-doc">
      ${ERP.membreteOficial('INVOICE', [
        ['DATE', fecha4(inv.fecha_emision)],
        ['INVOICE #', inv.numero || 'BORRADOR'],
        ['PAYMENT TERMS', inv.terminos || '—']
      ])}
      <div class="inv-boxes">
        <div class="inv-box"><div class="inv-box-h">BILL TO</div><div class="inv-box-b">${bloqueBillTo(inv)}</div></div>
        <div class="inv-box"><div class="inv-box-h">SHIP TO</div><div class="inv-box-b">${bloqueShipTo(inv)}</div></div>
      </div>
      ${ERP.tablaLineasDoc(lin)}
      <div class="inv-bottom">
        <div class="inv-comments">
          <div class="inv-box-h">Other Comments or Special Instructions</div>
          <div class="inv-box-b">${esc(inv.comentarios || '').replace(/\n/g, '<br>')}</div>
        </div>
        <table class="inv-totals">
          <tr><td>SUBTOTAL</td><td class="num">${usd(subtotal)}</td></tr>
          <tr><td>SALES TAX 0.00%</td><td class="num">${usd(0)}</td></tr>
          ${Math.abs(otro) > 0.009 ? `<tr><td>OTHER</td><td class="num">${usd(otro)}</td></tr>` : ''}
          <tr class="inv-grand"><td>TOTAL</td><td class="num">${usd(totalFinal)}</td></tr>
        </table>
      </div>
      ${leyendaPacaTxt ? `<div style="margin-top:16px;padding-top:8px;border-top:1px solid #999;font-size:8.5px;line-height:1.35;color:#333;white-space:pre-wrap">${esc(leyendaPacaTxt)}</div>` : ''}
      ${ERP.pieOficial()}
    </div>`;
  }

  /* ================= Integración en la ficha/expediente de embarque ================= */

  async function montarFacturasCarga(contenedor, folio, permitirGenerar = true) {
    if (!contenedor) return;
    const puedeCap = ERP.puede('capturar');
    const boton = (puedeCap && permitirGenerar)
      ? '<button class="btn-mini" id="btnGenFactura">Generar factura</button>' : '';
    contenedor.innerHTML = `<div class="seccion-head"><h4>Facturas</h4>${boton}</div>
      <div id="facturasCargaLista"><div class="skel">Cargando…</div></div>`;

    const btn = document.getElementById('btnGenFactura');
    if (btn) btn.addEventListener('click', () => generarInvoiceDesdeCarga(folio));

    const lista = document.getElementById('facturasCargaLista');
    try {
      const facs = await q('v_facturas', `&carga_folio=${ERP.eq(folio)}&order=id.desc`);
      lista.innerHTML = facs.length
        ? `<div class="tabla-wrap"><table>
            <thead><tr><th>Número</th><th>Emisión</th><th class="num">Total</th><th>Estado</th></tr></thead>
            <tbody>${facs.map(f => `<tr class="clic" data-fid="${esc(f.id)}">
              <td class="mono"><span class="enlace">${f.numero ? esc(f.numero) : '— borrador'}</span></td>
              <td>${esc(fecha4(f.fecha_emision))}</td>
              <td class="num">${usd(f.total)}</td>
              <td>${pillEstado(f.estado)}</td></tr>`).join('')}</tbody>
          </table></div>`
        : '<div class="vacio" style="padding:10px 0">Este embarque aún no tiene facturas.</div>';
      lista.querySelectorAll('tr.clic[data-fid]').forEach(tr =>
        tr.addEventListener('click', () => { ERP.ir('facturas'); setTimeout(() => verFactura(tr.dataset.fid), 60); }));
    } catch (e) {
      lista.innerHTML = `<div class="errbox">No se pudieron leer las facturas: ${esc(e.message)}</div>`;
    }
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('facturas', {
    titulo: 'Facturación',
    descripcion: 'Facturas de los embarques — crear, editar, emitir e imprimir',
    render
  });

  ERP.nuevaFactura = nuevaFactura;
  ERP.nuevaFacturaDesdeSO = nuevaFacturaDesdeSO;
  ERP.verFactura = verFactura;
  ERP.generarInvoiceDesdeCarga = generarInvoiceDesdeCarga;
  ERP.montarFacturasCarga = montarFacturasCarga;
})();
