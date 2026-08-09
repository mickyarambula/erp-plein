/* Módulo Órdenes de Compra (ruta 'ordenes') — espejo de Facturación, lado proveedor/CxP.
   Backend E33, no se toca.
   Vistas: v_ordenes_compra (folio, fecha, estado, moneda, dias_credito, fecha_vencimiento,
     f_entrega_est, proveedor_id, proveedor, subtotal, total, condiciones, notas, carga_folio,
     n_items, anulado, anulado_motivo, capturado_por, capturado_ts)
     v_orden_compra_items (id, orden_folio, orden, producto_id, producto, descripcion, cantidad,
     unidad, precio_unitario, importe) · v_cxp (amarre de pago por embarque)
   Estados: Borrador -> Enviada -> Confirmada -> Recibida (+ Cancelada). Transiciones las fuerza el backend.
   RPCs (capacidad 'capturar'):
     fn_crear_orden_compra(p_proveedor_id, p_items, p_moneda='USD', p_f_entrega_est, p_condiciones, p_notas, p_carga_folio)
     fn_editar_orden_compra(p_folio, p_f_entrega_est, p_condiciones, p_notas, p_items, p_carga_folio, p_desligar_carga=false)  — SOLO Borrador
     fn_cambiar_estado_orden(p_folio, p_estado) · fn_anular_orden(p_folio, p_motivo)
   items jsonb = [{producto_id|null, descripcion, cantidad, unidad, precio_unitario}] (NO importe; lo calcula la base).
   dias_credito lo hereda del proveedor. Expone ERP.verOrden, ERP.montarOrdenesCarga, ERP.nuevaOrden */

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
  // Fecha LOCAL, no toISOString() (UTC): en Sonora (UTC-7) toISOString ya muestra el día
  // siguiente después de las 17:00, prellenando mal los <input type="date"> (y corriendo la
  // comparación "vencido" que usa este hoyISO() para pintar el chip de la lista).
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

  const estadoDe = o => o && o.anulado ? 'Cancelada' : ((o && o.estado) || 'Borrador');
  const chipEstado = est => `<span class="oc-estado ${ERP.norm(est)}">${esc(est)}</span>`;
  const SIGUIENTE = { 'Borrador': 'Enviada', 'Enviada': 'Confirmada', 'Confirmada': 'Recibida' };

  const importeLinea = l => (numOrNull(l.cantidad) || 0) * (numOrNull(l.precio_unitario) || 0);

  /** Recuadro de pago (CxP) del embarque ligado — solo lectura. */
  function cxpBox(cx) {
    if (!cx) return '';
    const costo = num(cx.costo_total ?? cx.costo);
    const pagado = num(cx.pagado);
    const saldo = num(cx.saldo_cxp ?? cx.saldo);
    const venc = num(cx.dias_vencido) > 0;
    return `<div class="fact-cxc">
      <div class="fc-h">Pago del embarque (CxP — se lee del banco, no es manual)</div>
      <div class="fc-grid">
        <div><span class="l">Costo</span><span class="v">${usd(costo)}</span></div>
        <div><span class="l">Pagado</span><span class="v">${usd(pagado)}</span></div>
        <div><span class="l">Saldo por pagar</span><span class="v ${saldo > 0.009 ? 'neg' : 'pos'}">${usd(saldo)}</span></div>
        <div><span class="l">Vencimiento</span><span class="v">${cx.f_vencimiento ? esc(fecha4(cx.f_vencimiento)) + (venc ? ' · vencido' : '') : '—'}</span></div>
      </div>
    </div>`;
  }

  /* ================= Lista ================= */

  let ordenes = [];
  let cxpPorFolio = {};
  let fEstado = '', fProv = '', fTexto = '';

  function proveedoresEnLista() {
    return [...new Set(ordenes.map(o => o.proveedor).filter(Boolean))].sort();
  }

  function filtradas() {
    const t = ERP.norm(fTexto);
    return ordenes.filter(o => {
      if (fEstado && estadoDe(o) !== fEstado) return false;
      if (fProv && o.proveedor !== fProv) return false;
      if (!t) return true;
      return [o.folio, o.proveedor, o.carga_folio].some(v => ERP.norm(v).includes(t));
    });
  }

  function pintarTabla() {
    const cont = document.getElementById('ocTabla');
    const conteo = document.getElementById('ocConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${ordenes.length} órdenes`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ninguna orden coincide con el filtro.</div>'; return; }
    const hoy = hoyISO();

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblOrdenes">
      <thead><tr><th>Folio</th><th>N° oficial</th><th>Fecha</th><th>Proveedor</th><th>Embarque</th><th>Lote</th><th>Entrega est.</th>
        <th>Estado</th><th class="num">Ítems</th><th class="num">Total</th><th>Vence</th></tr></thead>
      <tbody>${rows.map(o => {
        const est = estadoDe(o);
        const vencido = o.fecha_vencimiento && String(o.fecha_vencimiento).slice(0, 10) < hoy && est !== 'Recibida' && est !== 'Cancelada';
        return `<tr class="clic" data-folio="${esc(o.folio)}">
          <td class="mono"><span class="enlace">${esc(o.folio)}</span></td>
          <td class="mono">${o.numero ? esc(o.numero) : '—'}</td>
          <td>${esc(fecha4(o.fecha))}</td>
          <td>${esc(o.proveedor || '—')}</td>
          <td class="mono">${esc(o.carga_folio || '—')}</td>
          <td class="mono" style="white-space:nowrap">${esc(o.lote || '—')}</td>
          <td>${esc(fecha4(o.f_entrega_est))}</td>
          <td>${chipEstado(est)}</td>
          <td class="num">${esc(o.n_items ?? 0)}</td>
          <td class="num">${usd(o.total)}</td>
          <td class="${vencido ? 'neg' : ''}">${o.fecha_vencimiento ? esc(fecha4(o.fecha_vencimiento)) : '—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-folio]').forEach(tr =>
      tr.addEventListener('click', () => verOrden(tr.dataset.folio)));
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    const [ocs, cxp] = await Promise.all([
      q('v_ordenes_compra', '&order=folio.desc'),
      q('v_cxp').catch(() => [])
    ]);
    ordenes = ocs;
    cxpPorFolio = {};
    cxp.forEach(c => { cxpPorFolio[c.folio] = c; });
    fEstado = ''; fProv = ''; fTexto = '';

    cont.innerHTML = `
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="ocNueva">+ Nueva orden</button>' : ''}
        <select class="busca" id="ocFEstado" style="max-width:160px">
          <option value="">Todos los estados</option>
          ${['Borrador', 'Enviada', 'Confirmada', 'Recibida', 'Cancelada'].map(e => `<option value="${e}">${e}</option>`).join('')}
        </select>
        <select class="busca" id="ocFProv" style="max-width:200px">
          <option value="">Todos los proveedores</option>
          ${proveedoresEnLista().map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('')}
        </select>
        <input class="busca" id="ocFTexto" type="text" placeholder="Buscar por folio, proveedor o embarque…">
        <span class="conteo" id="ocConteo"></span>
      </div>
      ${ERP.botonesExportar ? ERP.botonesExportar('OrdenesCompra', 'Órdenes de Compra', '#tblOrdenes') : ''}
      <div class="card" style="padding:14px"><div id="ocTabla"></div></div>
      <div class="leyenda">Toca una orden para abrir su ficha (editar en Borrador, avanzar estado, imprimir).
        <b>Vence</b> = fecha de vencimiento del crédito del proveedor (rojo si ya pasó y no está Recibida).
        El pago se lee de CxP del embarque, no es un estado manual.</div>`;

    const btnN = document.getElementById('ocNueva');
    if (btnN) btnN.addEventListener('click', () => nuevaOrden());
    document.getElementById('ocFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    document.getElementById('ocFProv').addEventListener('change', e => { fProv = e.target.value; pintarTabla(); });
    let tempo;
    document.getElementById('ocFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });

    pintarTabla();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
  }

  /* ================= Catálogos y editor de líneas ================= */

  let productos = [];        // {id, nombre}
  let cargasDisp = [];       // v_carga_detalle no anuladas
  let lineas = [];

  const nuevaLinea = () => ({ producto_id: '', descripcion: '', cantidad: '', unidad: '', precio_unitario: '' });

  async function cargarCatalogos() {
    const [prods, cargas] = await Promise.all([
      q('v_catalogo_productos', '&order=nombre.asc').catch(() => []),
      q('v_carga_detalle').catch(() => [])
    ]);
    productos = prods;
    cargasDisp = cargas.filter(c => !c.anulado);
  }

  async function cargarProveedores() {
    const cat = await q('v_catalogo_admin', '&order=nombre.asc');
    return cat.filter(c => c.es_proveedor && c.clase === 'comercial')
      .map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] }));
  }

  function comboCargasItems() {
    return cargasDisp.map(c => ({
      id: c.folio,
      nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.proveedor ? ' · ' + c.proveedor : ''}`,
      alias: [c.po, c.proveedor, c.cliente, c.folio].filter(Boolean)
    }));
  }

  function montarLineas(editable) {
    const body = document.getElementById('ocLineasBody');
    const dis = editable ? '' : ' disabled';
    const opts = l => '<option value="">— libre —</option>' +
      productos.map(p => `<option value="${p.id}"${String(l.producto_id) === String(p.id) ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
    body.innerHTML = lineas.map((l, i) => `<tr>
      <td><select class="oc-li" data-i="${i}" data-k="producto_id"${dis}>${opts(l)}</select></td>
      <td><input class="oc-li" data-i="${i}" data-k="descripcion" type="text" value="${esc(l.descripcion)}" placeholder="Descripción libre"${dis}></td>
      <td><input class="oc-li num" data-i="${i}" data-k="cantidad" type="number" step="0.01" value="${esc(l.cantidad)}"${dis}></td>
      <td><input class="oc-li" data-i="${i}" data-k="unidad" type="text" value="${esc(l.unidad)}" style="width:64px"${dis}></td>
      <td><input class="oc-li num" data-i="${i}" data-k="precio_unitario" type="number" step="0.01" value="${esc(l.precio_unitario)}"${dis}></td>
      <td class="num oc-importe" data-i="${i}">${usd(importeLinea(l))}</td>
      ${editable ? `<td><button class="btn-cap" data-del="${i}" title="Quitar línea">✕</button></td>` : ''}
    </tr>`).join('');

    if (editable) {
      body.querySelectorAll('.oc-li').forEach(inp => {
        inp.addEventListener('input', onLineaInput);
        inp.addEventListener('change', onLineaInput);
      });
      body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
        recogerLineas();
        lineas.splice(Number(b.dataset.del), 1);
        if (!lineas.length) lineas.push(nuevaLinea());
        montarLineas(editable);
      }));
    }
    recomputarTotal();
  }

  function onLineaInput(e) {
    const i = Number(e.target.dataset.i), k = e.target.dataset.k;
    lineas[i][k] = e.target.value;
    const cel = document.querySelector(`.oc-importe[data-i="${i}"]`);
    if (cel) cel.textContent = usd(importeLinea(lineas[i]));
    recomputarTotal();
  }

  function recogerLineas() {
    document.querySelectorAll('#ocLineasBody .oc-li').forEach(inp => {
      const i = Number(inp.dataset.i), k = inp.dataset.k;
      if (lineas[i]) lineas[i][k] = inp.value;
    });
  }

  const totalActual = () => lineas.reduce((s, l) => s + importeLinea(l), 0);
  function recomputarTotal() {
    const el = document.getElementById('ocTotal');
    if (el) el.textContent = usd(totalActual());
  }

  function itemsPayload() {
    recogerLineas();
    return lineas
      .filter(l => l.producto_id || String(l.descripcion).trim())
      .map(l => ({
        producto_id: l.producto_id ? Number(l.producto_id) : null,
        descripcion: String(l.descripcion || '').trim() || null,
        cantidad: numOrNull(l.cantidad),
        unidad: String(l.unidad || '').trim() || null,
        precio_unitario: numOrNull(l.precio_unitario)
      }));
  }

  function tablaLineas(editable) {
    return `<div class="seccion-head"><h4>Líneas</h4>${editable ? '<button class="btn-mini gris" id="ocAddLinea">+ Línea</button>' : ''}</div>
      <div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Producto</th><th>Descripción</th><th class="num">Cantidad</th><th>Unidad</th>
          <th class="num">Precio unit.</th><th class="num">Importe</th>${editable ? '<th></th>' : ''}</tr></thead>
        <tbody id="ocLineasBody"></tbody>
        <tfoot><tr class="total"><td colspan="5">Total</td>
          <td class="num" id="ocTotal">$0.00</td>${editable ? '<td></td>' : ''}</tr></tfoot>
      </table></div>`;
  }

  /* ================= Nueva orden ================= */

  let comboProv = null, comboCargaNueva = null;

  async function nuevaOrden() {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Nueva orden de compra', 'Elige proveedor y captura las líneas', '<div class="skel">Cargando catálogos…</div>');
    let proveedores;
    try {
      await cargarCatalogos();
      proveedores = await cargarProveedores();
    } catch (e) {
      ERP.abrirPanel('Nueva orden de compra', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }
    lineas = [nuevaLinea()];

    ERP.abrirPanel('Nueva orden de compra', 'Elige proveedor y captura las líneas', `
      <div class="form-erp oc-editor">
        <div class="campos">
          <div class="campo ancho"><label>Proveedor <span class="req">*</span></label><div id="ocProv"></div>
            <div class="alias-ayuda">Solo proveedores comerciales. Los días de crédito se heredan del proveedor.</div></div>
          <div class="campo"><label>Moneda</label>
            <select id="ocMoneda"><option value="USD">USD</option><option value="MXN">MXN</option></select></div>
          <div class="campo"><label>Entrega estimada</label>
            <input id="ocEntrega" type="date"></div>
          <div class="campo ancho"><label>Embarque ligado (opcional)</label><div id="ocCarga"></div>
            <div class="alias-ayuda">Déjalo vacío si aún no aplica a una carga.</div></div>
          <div class="campo ancho"><label>Condiciones</label>
            <textarea id="ocCondiciones" rows="2" placeholder="Ej. entrega en bodega, calidad…"></textarea></div>
          <div class="campo ancho"><label>Notas</label>
            <textarea id="ocNotas" rows="2"></textarea></div>
        </div>
        ${tablaLineas(true)}
        <div class="acciones">
          <button class="btn-mini" id="ocCrear">Crear orden (borrador)</button>
          <button class="btn-mini gris" id="ocCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ocNvAviso"></div>
      </div>`);

    comboProv = ERP.crearCombo({
      contenedor: document.getElementById('ocProv'),
      items: proveedores, placeholder: 'Busca proveedor por nombre o alias…', permitirNuevo: false
    });
    comboCargaNueva = ERP.crearCombo({
      contenedor: document.getElementById('ocCarga'),
      items: comboCargasItems(), placeholder: 'Folio, PO o proveedor… (opcional)', permitirNuevo: false
    });

    montarLineas(true);
    document.getElementById('ocAddLinea').addEventListener('click', () => { recogerLineas(); lineas.push(nuevaLinea()); montarLineas(true); });
    document.getElementById('ocCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('ocCrear').addEventListener('click', crearOrden);
  }

  function avisoNv(tipo, html) {
    const el = document.getElementById('ocNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function crearOrden() {
    const proveedor_id = comboProv && comboProv.valorId();
    if (!proveedor_id) { avisoNv('err', 'Elige un proveedor de la lista.'); return; }
    const items = itemsPayload();
    if (!items.length) { avisoNv('err', 'Agrega al menos una línea (producto o descripción).'); return; }

    const v = id => (document.getElementById(id) || {}).value;
    const args = {
      p_proveedor_id: Number(proveedor_id),
      p_items: items,
      p_moneda: v('ocMoneda') || 'USD',
      p_f_entrega_est: v('ocEntrega') || null,
      p_condiciones: (v('ocCondiciones') || '').trim() || null,
      p_notas: (v('ocNotas') || '').trim() || null,
      p_carga_folio: (comboCargaNueva && comboCargaNueva.valorId()) || null
    };
    const btn = document.getElementById('ocCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando orden…');
    try {
      const data = await rpc('fn_crear_orden_compra', args);
      const r = (data && data[0]) || {};
      if (!r.folio) throw new Error('El ERP no devolvió el folio de la orden.');
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Orden <b>${esc(r.folio)}</b> creada en borrador.`);
      verOrden(r.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó la orden: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha ================= */

  let ordenActual = null, cxpActual = null, comboCargaFicha = null;

  async function verOrden(folio) {
    ERP.abrirPanel('Orden de compra', 'Cargando…', '<div class="skel">Cargando orden…</div>');
    let o, items;
    try {
      [o, items] = await Promise.all([
        q('v_ordenes_compra', `&folio=${ERP.eq(folio)}`).then(r => r && r[0]),
        q('v_orden_compra_items', `&orden_folio=${ERP.eq(folio)}&order=orden.asc`)
      ]);
      if (!o) throw new Error('La orden no existe.');
    } catch (e) {
      ERP.abrirPanel('Orden de compra', '', `<div class="errbox">No se pudo cargar la orden: ${esc(e.message)}</div>`);
      return;
    }
    ordenActual = o;
    lineas = (items || []).map(it => ({
      producto_id: it.producto_id ?? '', descripcion: it.descripcion ?? '',
      cantidad: it.cantidad ?? '', unidad: it.unidad ?? '', precio_unitario: it.precio_unitario ?? ''
    }));
    if (!lineas.length) lineas.push(nuevaLinea());

    cxpActual = null;
    if (o.carga_folio) {
      try { const cx = await q('v_cxp', `&folio=${ERP.eq(o.carga_folio)}`); cxpActual = (cx && cx[0]) || null; } catch (_) { cxpActual = null; }
    }

    const puedeCap = ERP.puede('capturar');
    const est = estadoDe(o);
    const editable = puedeCap && est === 'Borrador';

    // Siempre se cargan los productos: si no, el <select> deshabilitado (solo lectura) mostraría
    // "— libre —" en vez del producto guardado (bug corregido 2026-07-20).
    try { await cargarCatalogos(); } catch (_) { /* seguimos; los selects caerían a "— libre —" */ }

    ERP.abrirPanel(
      `Orden ${esc(o.folio)}`,
      `${esc(o.proveedor || '—')} · ${chipEstado(est)} · Total ${usd(o.total)}`,
      cuerpoFicha(o, editable, puedeCap, est)
    );

    montarLineas(editable);
    document.getElementById('ocImprimir').addEventListener('click', () => imprimir(o.folio));
    document.getElementById('ocGenerarPO').addEventListener('click', () => generarPOOficial(o.folio));

    if (editable) {
      comboCargaFicha = ERP.crearCombo({
        contenedor: document.getElementById('ocCargaFicha'),
        items: comboCargasItems(), placeholder: 'Folio, PO o proveedor… (opcional)',
        permitirNuevo: false, valorInicial: null
      });
      // Preselecciona el embarque actual si lo hay (por folio en el texto del item).
      if (o.carga_folio) {
        const inp = document.querySelector('#ocCargaFicha .combo-input');
        if (inp) inp.value = o.carga_folio;
      }
      document.getElementById('ocAddLinea').addEventListener('click', () => { recogerLineas(); lineas.push(nuevaLinea()); montarLineas(true); });
      document.getElementById('ocGuardar').addEventListener('click', guardar);
    }
    const bAvanza = document.getElementById('ocAvanzar');
    if (bAvanza) bAvanza.addEventListener('click', avanzar);
    const bCancel = document.getElementById('ocCancelarDoc');
    if (bCancel) bCancel.addEventListener('click', cancelar);
  }

  function cuerpoFicha(o, editable, puedeCap, est) {
    const dis = editable ? '' : ' disabled';
    const siguiente = SIGUIENTE[est];
    const activo = puedeCap && !o.anulado;

    return `<div class="form-erp oc-editor">
      <div class="campos">
        <div class="campo"><label>Folio</label><div class="campo-fijo">${esc(o.folio)}</div></div>
        <div class="campo"><label>Fecha</label><div class="campo-fijo">${esc(fecha4(o.fecha))}</div></div>
        <div class="campo"><label>Proveedor</label><div class="campo-fijo">${esc(o.proveedor || '—')}</div></div>
        <div class="campo"><label>Términos (días de crédito heredados)</label>
          <div class="campo-fijo">${o.dias_credito != null ? 'NET ' + esc(o.dias_credito) : '—'}</div></div>
        <div class="campo"><label>Moneda</label><div class="campo-fijo">${esc(o.moneda || 'USD')}</div></div>
        <div class="campo"><label>Estado</label><div class="campo-fijo">${esc(est)}</div></div>
        <div class="campo"><label>Entrega estimada</label>
          ${editable ? `<input id="ocEntrega" type="date" value="${esc((o.f_entrega_est || '').slice(0, 10))}">` : `<div class="campo-fijo">${esc(fecha4(o.f_entrega_est))}</div>`}</div>
        <div class="campo"><label>Vencimiento</label><div class="campo-fijo">${esc(fecha4(o.fecha_vencimiento))}</div></div>
        <div class="campo ancho"><label>Embarque ligado</label>
          ${editable ? '<div id="ocCargaFicha"></div><div class="alias-ayuda">Cámbialo o déjalo vacío para desligar.</div>'
            : `<div class="campo-fijo">${esc(o.carga_folio || '—')}</div>`}</div>
        <div class="campo"><label>Lote</label>
          <div class="campo-fijo">${esc(o.lote || '—')}${o.lote_productor ? ` · <span style="color:var(--gris)">prod: ${esc(o.lote_productor)}</span>` : ''}<div class="aclara">Heredado del embarque; se edita en la ficha del embarque</div></div></div>
        <div class="campo ancho"><label>Condiciones</label>
          ${editable ? `<textarea id="ocCondiciones" rows="2"${dis}>${esc(o.condiciones || '')}</textarea>` : `<div class="campo-fijo">${esc(o.condiciones || '—')}</div>`}</div>
        <div class="campo ancho"><label>Notas</label>
          ${editable ? `<textarea id="ocNotas" rows="2"${dis}>${esc(o.notas || '')}</textarea>` : `<div class="campo-fijo">${esc(o.notas || '—')}</div>`}</div>
      </div>

      ${o.anulado && o.anulado_motivo ? `<div class="aviso visible err">Orden cancelada. Motivo: ${esc(o.anulado_motivo)}</div>` : ''}
      ${!editable && !o.anulado && est !== 'Recibida' ? '<div class="leyenda"><b>Solo se edita en Borrador; para cambios, cancela y crea otra.</b></div>' : ''}

      ${cxpBox(cxpActual)}

      ${tablaLineas(editable)}

      <div class="acciones">
        <button class="btn-mini gris" id="ocImprimir">Imprimir / PDF</button>
        <button class="btn-mini gris" id="ocGenerarPO">Generar PO (PDF)</button>
        ${editable ? '<button class="btn-mini" id="ocGuardar">Guardar</button>' : ''}
        ${activo && siguiente ? `<button class="btn-mini" id="ocAvanzar">Avanzar a ${esc(siguiente)}</button>` : ''}
        ${activo ? '<button class="btn-mini peligro" id="ocCancelarDoc">Cancelar orden</button>' : ''}
      </div>
      <div class="aviso" id="ocEdAviso"></div>
    </div>`;
  }

  function avisoEd(tipo, html) {
    const el = document.getElementById('ocEdAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  function botones(dis) {
    ['ocGuardar', 'ocAvanzar', 'ocCancelarDoc'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = dis; });
  }

  async function guardar() {
    const items = itemsPayload();
    if (!items.length) { avisoEd('err', 'La orden necesita al menos una línea.'); return; }
    const v = id => (document.getElementById(id) || {}).value;
    // Embarque: nuevo folio elegido, o desligar si se vació uno que estaba ligado.
    const nuevoFolio = comboCargaFicha ? comboCargaFicha.valorId() : ordenActual.carga_folio;
    const desligar = !nuevoFolio && !!ordenActual.carga_folio;

    const args = {
      p_folio: ordenActual.folio,
      p_f_entrega_est: v('ocEntrega') || null,
      p_condiciones: (v('ocCondiciones') || '').trim() || null,
      p_notas: (v('ocNotas') || '').trim() || null,
      p_items: items,
      p_carga_folio: nuevoFolio || null,
      p_desligar_carga: desligar
    };
    botones(true);
    avisoEd('warn', 'Guardando…');
    try {
      await rpc('fn_editar_orden_compra', args);
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Orden guardada.');
      verOrden(ordenActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botones(false); return; }
      avisoEd('err', `El ERP rechazó la orden: ${esc(e.message)}`);
      botones(false);
    }
  }

  async function avanzar() {
    const est = estadoDe(ordenActual);
    const sig = SIGUIENTE[est];
    if (!sig) return;
    if (!window.confirm(`¿Avanzar la orden de "${est}" a "${sig}"? Esta acción la registra el ERP.`)) return;
    botones(true);
    avisoEd('warn', `Cambiando a ${esc(sig)}…`);
    try {
      const data = await rpc('fn_cambiar_estado_orden', { p_folio: ordenActual.folio, p_estado: sig });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Orden ${esc(ordenActual.folio)}: ${esc(r.estado_anterior || est)} → <b>${esc(r.estado_nuevo || sig)}</b>.`);
      verOrden(ordenActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botones(false); return; }
      avisoEd('err', `No se pudo cambiar el estado: ${esc(e.message)}`);
      botones(false);
    }
  }

  async function cancelar() {
    const motivo = window.prompt('Motivo de la cancelación (OBLIGATORIO, queda registrado):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para cancelar.'); return; }
    botones(true);
    avisoEd('warn', 'Cancelando…');
    try {
      await rpc('fn_anular_orden', { p_folio: ordenActual.folio, p_motivo: motivo.trim() });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Orden ${esc(ordenActual.folio)} cancelada.`);
      verOrden(ordenActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botones(false); return; }
      avisoEd('err', `No se pudo cancelar: ${esc(e.message)}`);
      botones(false);
    }
  }

  /* ================= Impresión / PDF ================= */

  async function imprimir(folio) {
    // Se lee SIEMPRE de la BD: v_orden_compra_items trae el nombre del producto y la descripción,
    // así el documento al proveedor nunca sale con la línea en blanco. (El editor arma ítems sin
    // el nombre del producto; imprimir lo saltaba y dejaba la celda vacía.)
    let o, items;
    try {
      [o, items] = await Promise.all([
        q('v_ordenes_compra', `&folio=${ERP.eq(folio)}`).then(r => r && r[0]),
        q('v_orden_compra_items', `&orden_folio=${ERP.eq(folio)}&order=orden.asc`)
      ]);
      if (!o) throw new Error('no existe');
    } catch (_) { ERP.toast('err', 'No se pudo leer la orden para imprimir.'); return; }
    const empresa = ERP.empresaImpresion ? await ERP.empresaImpresion() : null;
    ERP.imprimirArea(htmlImpresion(o, items || [], empresa));
  }

  function filaImpr(l) {
    const imp = l.importe != null ? num(l.importe) : importeLinea(l);
    return `<tr>
      <td>${esc(ERP.descLineaDoc(l.producto, l.descripcion))}</td>
      <td class="num">${l.cantidad === '' || l.cantidad == null ? '' : esc(l.cantidad)}</td>
      <td>${esc(l.unidad || '')}</td>
      <td class="num">${numOrNull(l.precio_unitario) == null ? '' : usd(l.precio_unitario)}</td>
      <td class="num">${usd(imp)}</td>
    </tr>`;
  }

  function htmlImpresion(o, items, empresa) {
    const total = items.reduce((s, l) => s + (l.importe != null ? num(l.importe) : importeLinea(l)), 0);
    const vacias = Math.max(0, 7 - items.length);
    const filasVacias = Array.from({ length: vacias }, () => '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('');
    return `<div class="inv-doc">
      ${ERP.encabezadoImpresion('PURCHASE ORDER', [['ORDEN', o.folio], ['FECHA', fecha4(o.fecha)], ['TÉRMINOS', o.dias_credito != null ? 'NET ' + o.dias_credito : ''], ['ENTREGA', fecha4(o.f_entrega_est)]], empresa)}
      <div class="inv-boxes">
        <div class="inv-box"><div class="inv-box-h">PROVEEDOR</div><div class="inv-box-b">${esc(o.proveedor || '')}</div></div>
        <div class="inv-box"><div class="inv-box-h">CONDICIONES</div><div class="inv-box-b">${esc(o.condiciones || '').replace(/\n/g, '<br>')}</div></div>
      </div>
      <table class="inv-items">
        <thead><tr><th>DESCRIPCIÓN</th><th class="num">CANTIDAD</th><th>UNIDAD</th><th class="num">PRECIO</th><th class="num">IMPORTE</th></tr></thead>
        <tbody>${items.map(filaImpr).join('')}${filasVacias}</tbody>
      </table>
      <div class="inv-bottom">
        <div class="inv-comments"><div class="inv-box-h">Notas</div><div class="inv-box-b">${esc(o.notas || '').replace(/\n/g, '<br>')}</div></div>
        <table class="inv-totals">
          <tr class="inv-grand"><td>TOTAL</td><td class="num">${usd(total)}</td></tr>
        </table>
      </div>
    </div>`;
  }

  /* ================= Purchase Order oficial (membrete Plein, v_documento_po) =================
     Documento aparte del "Imprimir / PDF" de arriba: mismo motor (ERP.imprimirArea) y mismo
     membrete/tabla/footer compartidos con Invoice y Quote (ERP.membreteOficial / ERP.pieOficial /
     ERP.tablaLineasDoc, ver exportar.js). Aquí solo se arma lo propio del PO: título, meta y el
     bloque VENDOR (proveedor) / BILL TO (Plein, fijo). */

  /** VENDOR: una línea por campo, en este orden, omitiendo los vacíos (mismo criterio que el
      BILL TO del invoice). */
  function lineasProveedorPO(po) {
    return [po.proveedor_nombre, po.proveedor_direccion, po.proveedor_ciudad, po.proveedor_pais, po.proveedor_tel]
      .map(v => (v && String(v).trim()) ? String(v).trim() : null)
      .filter(Boolean);
  }

  function bloqueProveedorPO(po) {
    const lns = lineasProveedorPO(po);
    return lns.length ? lns.map(esc).join('<br>') : '<span class="sin-alias">— sin datos del proveedor —</span>';
  }

  /** TERMS: condiciones (texto libre) si existe; si no, NET {dias_credito}. */
  function terminosPO(po) {
    if (po.condiciones && String(po.condiciones).trim()) return String(po.condiciones).trim();
    if (po.dias_credito != null) return 'NET ' + po.dias_credito;
    return '—';
  }

  async function generarPOOficial(folio) {
    let po;
    try {
      const rows = await q('v_documento_po', `&folio=${ERP.eq(folio)}`);
      po = rows && rows[0];
      if (!po) throw new Error('No existe el documento de Purchase Order para esta orden.');
    } catch (e) {
      ERP.toast('err', `No se pudo generar el PO: ${esc(e.message)}`);
      return;
    }
    ERP.imprimirArea(htmlPOOficial(po));
  }

  function htmlPOOficial(po) {
    const lin = Array.isArray(po.lineas) ? po.lineas : [];
    const subtotal = numOrNull(po.subtotal);
    const total = numOrNull(po.total);

    return `<div class="inv-doc">
      ${ERP.membreteOficial('PURCHASE ORDER', [
        ['DATE', fecha4(po.fecha)],
        ['PO #', po.numero || 'BORRADOR'],
        ['TERMS', terminosPO(po)],
        ['ENTREGA EST.', fecha4(po.f_entrega_est)],
        ['REF. INTERNA', po.folio]
      ])}
      <div class="inv-boxes">
        <div class="inv-box"><div class="inv-box-h">VENDOR</div><div class="inv-box-b">${bloqueProveedorPO(po)}</div></div>
        <div class="inv-box"><div class="inv-box-h">BILL TO</div><div class="inv-box-b">${ERP.bloqueEmpresaPlein()}</div></div>
      </div>
      ${ERP.tablaLineasDoc(lin)}
      <div class="inv-bottom">
        <div class="inv-comments"><div class="inv-box-h">Conditions</div><div class="inv-box-b">${esc(po.condiciones || '').replace(/\n/g, '<br>')}</div></div>
        <table class="inv-totals">
          <tr><td>SUBTOTAL</td><td class="num">${subtotal == null ? '—' : usd(subtotal)}</td></tr>
          <tr class="inv-grand"><td>TOTAL</td><td class="num">${total == null ? '—' : usd(total)}</td></tr>
        </table>
      </div>
      ${ERP.pieOficial()}
    </div>`;
  }

  /* ================= Integración en ficha/expediente de embarque ================= */

  async function montarOrdenesCarga(contenedor, folio, permitirGenerar = true) {
    if (!contenedor) return;
    const puedeCap = ERP.puede('capturar');
    const boton = (puedeCap && permitirGenerar)
      ? '<button class="btn-mini" id="btnNuevaOCcarga">Nueva orden</button>' : '';
    contenedor.innerHTML = `<div class="seccion-head"><h4>Órdenes de compra</h4>${boton}</div>
      <div id="ordenesCargaLista"><div class="skel">Cargando…</div></div>`;

    const btn = document.getElementById('btnNuevaOCcarga');
    if (btn) btn.addEventListener('click', () => nuevaOrden());

    const lista = document.getElementById('ordenesCargaLista');
    try {
      const ocs = await q('v_ordenes_compra', `&carga_folio=${ERP.eq(folio)}&order=folio.desc`);
      lista.innerHTML = ocs.length
        ? `<div class="tabla-wrap"><table>
            <thead><tr><th>Folio</th><th>Proveedor</th><th class="num">Total</th><th>Estado</th></tr></thead>
            <tbody>${ocs.map(o => `<tr class="clic" data-oc="${esc(o.folio)}">
              <td class="mono"><span class="enlace">${esc(o.folio)}</span></td>
              <td>${esc(o.proveedor || '—')}</td>
              <td class="num">${usd(o.total)}</td>
              <td>${chipEstado(estadoDe(o))}</td></tr>`).join('')}</tbody>
          </table></div>`
        : '<div class="vacio" style="padding:10px 0">Este embarque no tiene órdenes de compra.</div>';
      lista.querySelectorAll('tr.clic[data-oc]').forEach(tr =>
        tr.addEventListener('click', () => { ERP.ir('ordenes'); setTimeout(() => verOrden(tr.dataset.oc), 60); }));
    } catch (e) {
      lista.innerHTML = `<div class="errbox">No se pudieron leer las órdenes: ${esc(e.message)}</div>`;
    }
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('ordenes', {
    titulo: 'Órdenes de Compra',
    descripcion: 'Compras a proveedores — crear, avanzar estado e imprimir',
    render
  });

  ERP.verOrden = verOrden;
  ERP.nuevaOrden = nuevaOrden;
  ERP.montarOrdenesCarga = montarOrdenesCarga;
  ERP.generarPOOficial = generarPOOficial;   // reutilizado por modulo-comercial.js (ficha "orden")
})();
