/* Módulo Órdenes de Venta / Sales Orders (ruta 'ventas') — Fase C, backend E65/E66.
   ESPEJO estructural de modulo-ordenes.js (Órdenes de Compra): lista + ficha + estados + export.
   Documento INTERNO: NO tiene PDF ni envío por correo (ERP_PP / D-55) — a propósito.

   Vistas (solo lectura):
     v_sales_orders (folio, cliente, cliente_id, revenue_model, rm_codigo, revenue_model_id, estado,
       customer_po, cotizacion_folio, programa_id, moneda, dias_credito, incoterm, nota, n_cargas,
       cajas_asignadas_total, comision_por_caja, pct_comision, precio_compra_caja, precio_venta_caja)
     v_sales_order_cargas (so_folio, carga_folio, carga_po, producto, proveedor, cajas_asignadas,
       precio_caja, importe_asignado)
     v_revenue_models (id, codigo, nombre, formula_tipo, descripcion, activo, orden)
     v_catalogo_clientes (id, nombre, dias_credito, …) · v_carga_detalle (picker de embarques)
   Estados: Borrador → Confirmada → Cerrada (+ Cancelada). Transiciones las fuerza el backend.
   RPCs (capacidad 'capturar'/'editar'; el backend es la autoridad):
     fn_crear_so(p_cliente_id, p_revenue_model_id, p_customer_po, p_cotizacion_folio, p_programa_id,
       p_moneda, p_dias_credito, p_incoterm, p_comision_por_caja, p_pct_comision,
       p_precio_compra_caja, p_precio_venta_caja, p_nota) → (folio, cliente, revenue_model, estado, dias_credito)
     fn_asignar_carga_so(p_so_folio, p_carga_folio, p_cajas_asignadas, p_precio_caja, p_nota)
       → (so_folio, carga_folio, cajas_asignadas, cajas_restantes_carga)
     fn_desasignar_carga_so(p_so_folio, p_carga_folio)
     fn_confirmar_so(p_folio) · fn_cerrar_so(p_folio) · fn_cancelar_so(p_folio, p_motivo)
   NO hay fn_editar_so: el encabezado NO se edita tras crear (cancelar y recrear). Anotado en PENDIENTES-BACKEND.md.
   Expone ERP.verSO, ERP.nuevaVenta, ERP.montarVentasCarga.
   RESUELTO (E79): v_programas_comerciales ahora expone id (bigint) + cliente_id, además de
   codigo/etiqueta — el modal "Nueva orden de venta" ya ofrece un picker de programa (opcional,
   filtrado al cliente elegido) y manda p_programa_id como número o null (nunca cadena vacía). */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num, MONEDAS } = ERP;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha4(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return `${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}-${d.getFullYear()}`;
  }
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

  const estadoDe = so => (so && so.estado) || 'Borrador';
  const chipEstado = est => `<span class="so-estado ${ERP.norm(est)}">${esc(est)}</span>`;

  /* Parámetros del Revenue Model, keados por `formula_tipo` (catálogo del backend, NO hardcodear
     la lista de modelos — solo el mapeo tipo→inputs, que es el contrato documentado). */
  const PARAM_DEFS = [
    { arg: 'p_comision_por_caja', tipo: 'comision_por_caja', id: 'soP_comxcaja', col: 'comision_por_caja', label: 'Comisión por caja (USD)' },
    { arg: 'p_precio_compra_caja', tipo: 'margen', id: 'soP_compra', col: 'precio_compra_caja', label: 'Precio compra / caja (USD)' },
    { arg: 'p_precio_venta_caja', tipo: 'margen', id: 'soP_venta', col: 'precio_venta_caja', label: 'Precio venta / caja (USD)' },
    { arg: 'p_pct_comision', tipo: 'pct_venta', id: 'soP_pct', col: 'pct_comision', label: '% comisión' }
  ];

  /* ================= Lista ================= */

  let ventas = [];
  let revenueModels = [];      // {id, codigo, nombre, formula_tipo, ...} activos, ordenados
  let fEstado = '', fCliente = '', fTexto = '';

  const rmPorId = id => revenueModels.find(r => String(r.id) === String(id)) || null;

  function clientesEnLista() {
    return [...new Set(ventas.map(v => v.cliente).filter(Boolean))].sort();
  }

  function filtradas() {
    const t = ERP.norm(fTexto);
    return ventas.filter(v => {
      if (fEstado && estadoDe(v) !== fEstado) return false;
      if (fCliente && v.cliente !== fCliente) return false;
      if (!t) return true;
      return [v.folio, v.cliente, v.customer_po].some(x => ERP.norm(x).includes(t));
    });
  }

  function pintarTabla() {
    const cont = document.getElementById('soTabla');
    const conteo = document.getElementById('soConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${ventas.length} órdenes de venta`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ninguna orden de venta coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblVentas">
      <thead><tr><th>Folio</th><th>Cliente</th><th>Revenue Model</th><th>Estado</th><th>Customer PO</th>
        <th class="num">Cargas</th><th class="num">Cajas</th><th class="num">Días créd.</th></tr></thead>
      <tbody>${rows.map(v => `<tr class="clic" data-folio="${esc(v.folio)}">
        <td class="mono"><span class="enlace">${esc(v.folio)}</span></td>
        <td>${esc(v.cliente || '—')}</td>
        <td>${esc([v.rm_codigo, v.revenue_model].filter(Boolean).join(' · ') || '—')}</td>
        <td>${chipEstado(estadoDe(v))}</td>
        <td class="mono">${esc(v.customer_po || '—')}</td>
        <td class="num">${esc(v.n_cargas ?? 0)}</td>
        <td class="num">${v.cajas_asignadas_total == null ? '—' : esc(v.cajas_asignadas_total)}</td>
        <td class="num">${v.dias_credito == null ? '—' : esc(v.dias_credito)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-folio]').forEach(tr =>
      tr.addEventListener('click', () => verSO(tr.dataset.folio)));
  }

  async function render(cont, parametro) {
    const puedeCap = ERP.puede('capturar');
    let vs, rms;
    try {
      [vs, rms] = await Promise.all([
        q('v_sales_orders', '&order=folio.desc'),
        q('v_revenue_models', '&order=orden.asc')
      ]);
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer las órdenes de venta: ${esc(e.message)}</div>`;
      return;
    }
    ventas = vs || [];
    revenueModels = (rms || []).filter(r => r.activo !== false);
    fEstado = ''; fCliente = ''; fTexto = '';

    cont.innerHTML = `<div class="pantalla-ventas">
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="soNueva">+ Nueva orden de venta</button>' : ''}
        <select class="busca" id="soFEstado" style="max-width:160px">
          <option value="">Todos los estados</option>
          ${['Borrador', 'Confirmada', 'Cerrada', 'Cancelada'].map(e => `<option value="${e}">${e}</option>`).join('')}
        </select>
        <select class="busca" id="soFCliente" style="max-width:200px">
          <option value="">Todos los clientes</option>
          ${clientesEnLista().map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select>
        <input class="busca" id="soFTexto" type="text" placeholder="Buscar por folio, cliente o PO…">
        <span class="conteo" id="soConteo"></span>
      </div>
      ${ERP.botonesExportar ? ERP.botonesExportar('OrdenesVenta', 'Órdenes de Venta', '#tblVentas') : ''}
      <div class="card" style="padding:14px"><div id="soTabla"></div></div>
      <div class="leyenda">La Orden de Venta es un documento <b>interno</b> (no se envía al cliente).
        El <b>Revenue Model</b> se elige por orden y no se edita después: para cambiarlo, cancela y recrea.
        Las cajas se reparten desde embarques ya capturados.</div>
    </div>`;

    const btnN = document.getElementById('soNueva');
    if (btnN) btnN.addEventListener('click', () => nuevaVenta());
    document.getElementById('soFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    document.getElementById('soFCliente').addEventListener('change', e => { fCliente = e.target.value; pintarTabla(); });
    let tempo;
    document.getElementById('soFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });

    pintarTabla();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
    if (parametro) verSO(parametro);
  }

  /* ================= Nueva orden de venta ================= */

  let comboCliente = null;
  let clientesCat = [];
  let programasCat = [];   // v_programas_comerciales (E79): id, etiqueta, codigo, cliente_id

  /** Opciones del <select> de programa: si hay cliente elegido, filtra a sus programas; si no hay
      match (o no hay cliente todavía), muestra todos — nunca deja el picker vacío por error. */
  function opcionesPrograma(clienteId) {
    const todas = programasCat.slice().sort((a, b) => String(a.codigo || '').localeCompare(String(b.codigo || '')));
    const filtradas = clienteId != null ? todas.filter(p => String(p.cliente_id) === String(clienteId)) : [];
    const lista = filtradas.length ? filtradas : todas;
    return `<option value="">— sin programa —</option>${lista.map(p =>
      `<option value="${esc(p.id)}">${esc(p.etiqueta || p.codigo || ('Programa ' + p.id))}</option>`).join('')}`;
  }

  function pintarParams(formulaTipo) {
    const cont = document.getElementById('soParams');
    if (!cont) return;
    const defs = PARAM_DEFS.filter(p => p.tipo === formulaTipo);
    if (!formulaTipo) { cont.innerHTML = '<div class="alias-ayuda">Elige un Revenue Model para ver sus parámetros.</div>'; return; }
    if (!defs.length) {
      // buy_resell (sin parámetros) o un tipo que este frontend aún no conoce: se dice explícito.
      const conocido = PARAM_DEFS.some(p => p.tipo === formulaTipo) || formulaTipo === 'buy_resell';
      cont.innerHTML = `<div class="alias-ayuda">${conocido
        ? 'Este modelo no requiere parámetros: la utilidad se deriva de los costos.'
        : 'Este modelo no tiene parámetros configurables en esta versión.'}</div>`;
      return;
    }
    cont.innerHTML = defs.map(p =>
      `<div class="campo"><label>${esc(p.label)}</label>
        <input id="${p.id}" class="mono" type="number" step="0.01" min="0" placeholder="0.00"></div>`).join('');
  }

  async function nuevaVenta() {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Nueva orden de venta', 'Elige cliente y revenue model', '<div class="skel">Cargando catálogos…</div>');
    try {
      // Los revenue models ya están cargados por render(); si se entró directo, cárgalos aquí.
      if (!revenueModels.length) revenueModels = ((await q('v_revenue_models', '&order=orden.asc')) || []).filter(r => r.activo !== false);
      [clientesCat, programasCat] = await Promise.all([
        q('v_catalogo_clientes', '&order=nombre.asc'),
        q('v_programas_comerciales')
      ]);
    } catch (e) {
      ERP.abrirPanel('Nueva orden de venta', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Nueva orden de venta', 'Elige cliente y revenue model', `
      <div class="form-erp oc-editor">
        <div class="campos">
          <div class="campo ancho"><label>Cliente <span class="req">*</span></label><div id="soCliente"></div>
            <div class="alias-ayuda">Los días de crédito se prellenan con los del cliente (editables).</div></div>
          <div class="campo ancho"><label>Revenue Model <span class="req">*</span></label>
            <select id="soRM"><option value="">— Elige un modelo —</option>${revenueModels.map(r =>
              `<option value="${esc(r.id)}">${esc([r.codigo, r.nombre].filter(Boolean).join(' — '))}</option>`).join('')}</select>
            <div class="alias-ayuda" id="soRMDesc"></div></div>
          <div class="campo ancho" id="soParams"><div class="alias-ayuda">Elige un Revenue Model para ver sus parámetros.</div></div>
          <div class="campo"><label>Customer PO</label><input id="soPO" type="text" maxlength="60" placeholder="Opcional"></div>
          <div class="campo"><label>Cotización (folio)</label><input id="soCot" type="text" maxlength="40" placeholder="Ej. COT-0001"></div>
          <div class="campo ancho"><label>Programa comercial (opcional)</label>
            <select id="soPrograma">${opcionesPrograma(null)}</select></div>
          <div class="campo"><label>Moneda</label>
            <select id="soMoneda">${MONEDAS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
          <div class="campo"><label>Días de crédito</label><input id="soDias" class="mono" type="number" step="1" min="0" placeholder="—"></div>
          <div class="campo"><label>Incoterm</label><input id="soIncoterm" type="text" maxlength="20" placeholder="Ej. FOB, DAP"></div>
          <div class="campo ancho"><label>Nota</label><textarea id="soNota" rows="2"></textarea></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="soCrear">Crear orden de venta (borrador)</button>
          <button class="btn-mini gris" id="soCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="soNvAviso"></div>
      </div>`);

    comboCliente = ERP.crearCombo({
      contenedor: document.getElementById('soCliente'),
      items: clientesCat.map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] })),
      placeholder: 'Busca cliente por nombre o alias…', permitirNuevo: false,
      alCambiar: sel => {
        // Prefill de días de crédito con el del cliente elegido (editable).
        const cli = sel && clientesCat.find(c => String(c.id) === String(sel.id));
        const inp = document.getElementById('soDias');
        if (cli && inp && !inp.value) inp.value = cli.dias_credito == null ? '' : cli.dias_credito;
        // Filtra el picker de programa a los del cliente elegido (si no hay match, muestra todos).
        const selPrograma = document.getElementById('soPrograma');
        if (selPrograma) selPrograma.innerHTML = opcionesPrograma(sel ? sel.id : null);
      }
    });

    const selRM = document.getElementById('soRM');
    selRM.addEventListener('change', () => {
      const rm = rmPorId(selRM.value);
      document.getElementById('soRMDesc').textContent = rm && rm.descripcion ? rm.descripcion : '';
      pintarParams(rm ? rm.formula_tipo : '');
    });

    document.getElementById('soCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('soCrear').addEventListener('click', crearSO);
  }

  function avisoNv(tipo, html) {
    const el = document.getElementById('soNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function crearSO() {
    const cliente_id = comboCliente && comboCliente.valorId();
    if (!cliente_id) { avisoNv('err', 'Elige un cliente de la lista.'); return; }
    const rmId = (document.getElementById('soRM') || {}).value;
    const rm = rmPorId(rmId);
    if (!rm) { avisoNv('err', 'Elige un Revenue Model.'); return; }

    const v = id => (document.getElementById(id) || {}).value;
    // Params: solo los del formula_tipo elegido viajan con valor; el resto van null.
    const args = {
      p_cliente_id: Number(cliente_id),
      p_revenue_model_id: Number(rm.id),
      p_customer_po: (v('soPO') || '').trim() || null,
      p_cotizacion_folio: (v('soCot') || '').trim() || null,
      p_programa_id: (() => { const pv = v('soPrograma'); return pv ? Number(pv) : null; })(),
      p_moneda: v('soMoneda') || 'USD',
      p_dias_credito: numOrNull(v('soDias')),
      p_incoterm: (v('soIncoterm') || '').trim() || null,
      p_comision_por_caja: null,
      p_pct_comision: null,
      p_precio_compra_caja: null,
      p_precio_venta_caja: null,
      p_nota: (v('soNota') || '').trim() || null
    };
    PARAM_DEFS.filter(p => p.tipo === rm.formula_tipo).forEach(p => { args[p.arg] = numOrNull(v(p.id)); });

    const btn = document.getElementById('soCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando orden de venta…');
    try {
      const data = await rpc('fn_crear_so', args);
      const r = (data && data[0]) || {};
      if (!r.folio) throw new Error('El ERP no devolvió el folio de la orden de venta.');
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Orden de venta <b>${esc(r.folio)}</b> creada en borrador.`);
      verSO(r.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó la orden de venta: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha ================= */

  let soActual = null, comboCargaAsig = null, cargasDisp = [];

  async function verSO(folio) {
    ERP.abrirPanel('Orden de venta', 'Cargando…', '<div class="skel">Cargando orden de venta…</div>');
    let so, cargas, ingresos;
    try {
      [so, cargas, ingresos] = await Promise.all([
        q('v_sales_orders', `&folio=${ERP.eq(folio)}`).then(r => r && r[0]),
        q('v_sales_order_cargas', `&so_folio=${ERP.eq(folio)}&order=carga_folio.asc`),
        // Ingreso CANÓNICO por carga (v_ingreso_reconocido.ingreso_reconocido): ya respeta el
        // modelo de ingreso (comisión fija, margen por caja, %, compra-reventa). Es la fuente del
        // importe de la SO — NO cajas×precio_caja, que suele venir NULL y pintaba $0. Si esta
        // lectura falla, se degrada a importe_asignado y la ficha no se rompe.
        q('v_ingreso_reconocido').catch(() => [])
      ]);
      if (!so) throw new Error('La orden de venta no existe.');
    } catch (e) {
      ERP.abrirPanel('Orden de venta', '', `<div class="errbox">No se pudo cargar la orden de venta: ${esc(e.message)}</div>`);
      return;
    }
    soActual = so;
    // Mapa carga_folio → ingreso reconocido, para el importe de cada carga y el total de la SO.
    const ingresoPorCarga = new Map((ingresos || []).map(r => [r.carga_folio, num(r.ingreso_reconocido)]));
    const est = estadoDe(so);
    const puedeCap = ERP.puede('capturar');
    const editable = puedeCap && est === 'Borrador';

    ERP.abrirPanel(
      `Orden de venta ${esc(so.folio)}`,
      `${esc(so.cliente || '—')} · ${chipEstado(est)}`,
      cuerpoFicha(so, cargas || [], editable, puedeCap, est, ingresoPorCarga)
    );

    if (editable) {
      const bAsig = document.getElementById('soAsignar');
      if (bAsig) bAsig.addEventListener('click', () => abrirAsignarCarga());
      document.querySelectorAll('[data-desasig]').forEach(b =>
        b.addEventListener('click', () => desasignar(b.dataset.desasig)));
    }
    const bConf = document.getElementById('soConfirmar');
    if (bConf) bConf.addEventListener('click', () => cambiarEstado('fn_confirmar_so', {}, 'Confirmada'));
    const bCerr = document.getElementById('soCerrar');
    if (bCerr) bCerr.addEventListener('click', () => cambiarEstado('fn_cerrar_so', {}, 'Cerrada'));
    const bCanc = document.getElementById('soCancelarDoc');
    if (bCanc) bCanc.addEventListener('click', () => cancelar());
  }

  function filaParamHeader(so) {
    // Muestra solo los parámetros con valor (los que aplican al modelo de esta SO).
    return PARAM_DEFS.filter(p => so[p.col] != null).map(p =>
      `<div class="campo"><label>${esc(p.label)}</label><div class="campo-fijo">${
        p.arg === 'p_pct_comision' ? esc(so[p.col]) + '%' : usd(so[p.col])
      }</div></div>`).join('');
  }

  function tablaAsignadas(cargas, editable, ingresoPorCarga) {
    // Importe = ingreso reconocido de la carga (modelo canónico). Si por alguna razón no hay fila
    // en v_ingreso_reconocido para esa carga, se degrada a importe_asignado (cajas×precio).
    const ing = c => ingresoPorCarga && ingresoPorCarga.has(c.carga_folio)
      ? ingresoPorCarga.get(c.carga_folio) : num(c.importe_asignado);
    const total = cargas.reduce((s, c) => s + ing(c), 0);
    const cajas = cargas.reduce((s, c) => s + num(c.cajas_asignadas), 0);
    const filas = cargas.length ? cargas.map(c => `<tr>
        <td class="mono">${esc(c.carga_folio || '—')}${c.carga_po ? ` · ${esc(c.carga_po)}` : ''}</td>
        <td>${esc(c.producto || '—')}</td>
        <td>${esc(c.proveedor || '—')}</td>
        <td class="num">${c.cajas_asignadas == null ? '—' : esc(c.cajas_asignadas)}</td>
        <td class="num">${c.precio_caja == null ? '—' : usd(c.precio_caja)}</td>
        <td class="num">${usd(ing(c))}</td>
        ${editable ? `<td><button class="btn-cap" data-desasig="${esc(c.carga_folio)}" title="Quitar esta carga">✕</button></td>` : ''}
      </tr>`).join('')
      : `<tr><td colspan="${editable ? 7 : 6}" style="color:var(--gris)">Sin cargas asignadas todavía.</td></tr>`;
    return `<div class="seccion-head"><h4>Cargas asignadas</h4>${editable ? '<button class="btn-mini gris" id="soAsignar">Asignar carga</button>' : ''}</div>
      <div id="soAsignarForm"></div>
      <div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Embarque</th><th>Producto</th><th>Proveedor</th><th class="num">Cajas</th>
          <th class="num">Precio/caja</th><th class="num">Importe</th>${editable ? '<th></th>' : ''}</tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr class="total"><td colspan="3">Total (${cargas.length} carga${cargas.length === 1 ? '' : 's'})</td>
          <td class="num">${cajas || '—'}</td><td></td><td class="num">${usd(total)}</td>${editable ? '<td></td>' : ''}</tr></tfoot>
      </table></div>
      <div class="leyenda">El <b>Importe</b> es el <b>ingreso reconocido</b> de cada carga (respeta su modelo:
        comisión fija, margen por caja, %, o compra-reventa) — no cajas × precio.</div>`;
  }

  function cuerpoFicha(so, cargas, editable, puedeCap, est, ingresoPorCarga) {
    const params = filaParamHeader(so);
    const activo = puedeCap && est !== 'Cerrada' && est !== 'Cancelada';
    return `<div class="form-erp oc-editor">
      <div class="campos">
        <div class="campo"><label>Folio</label><div class="campo-fijo">${esc(so.folio)}</div></div>
        <div class="campo"><label>Cliente</label><div class="campo-fijo">${esc(so.cliente || '—')}</div></div>
        <div class="campo"><label>Revenue Model</label><div class="campo-fijo">${esc([so.rm_codigo, so.revenue_model].filter(Boolean).join(' · ') || '—')}</div></div>
        <div class="campo"><label>Estado</label><div class="campo-fijo">${esc(est)}</div></div>
        ${params}
        <div class="campo"><label>Customer PO</label><div class="campo-fijo">${esc(so.customer_po || '—')}</div></div>
        <div class="campo"><label>Cotización</label><div class="campo-fijo">${esc(so.cotizacion_folio || '—')}</div></div>
        <div class="campo"><label>Moneda</label><div class="campo-fijo">${esc(so.moneda || 'USD')}</div></div>
        <div class="campo"><label>Días de crédito</label><div class="campo-fijo">${so.dias_credito == null ? '—' : 'NET ' + esc(so.dias_credito)}</div></div>
        <div class="campo"><label>Incoterm</label><div class="campo-fijo">${esc(so.incoterm || '—')}</div></div>
        <div class="campo ancho"><label>Nota</label><div class="campo-fijo">${esc(so.nota || '—')}</div></div>
      </div>

      <div class="leyenda"><b>El encabezado no se edita</b> (no hay edición de orden de venta). Para cambiar
        cliente o revenue model, cancela esta orden y crea una nueva.</div>

      ${tablaAsignadas(cargas, editable, ingresoPorCarga)}

      <div class="acciones">
        ${est === 'Borrador' && puedeCap ? '<button class="btn-mini" id="soConfirmar">Confirmar</button>' : ''}
        ${est === 'Confirmada' && puedeCap ? '<button class="btn-mini" id="soCerrar">Cerrar</button>' : ''}
        ${activo && (est === 'Borrador' || est === 'Confirmada') ? '<button class="btn-mini peligro" id="soCancelarDoc">Cancelar</button>' : ''}
      </div>
      <div class="aviso" id="soEdAviso"></div>
    </div>`;
  }

  function avisoEd(tipo, html) {
    const el = document.getElementById('soEdAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  /* ---------- Asignar / desasignar cargas ---------- */

  async function abrirAsignarCarga() {
    const cont = document.getElementById('soAsignarForm');
    if (!cont) return;
    if (cont.dataset.abierto === '1') { cont.dataset.abierto = ''; cont.innerHTML = ''; return; }
    cont.dataset.abierto = '1';
    cont.innerHTML = '<div class="skel">Cargando embarques…</div>';
    try {
      const cargas = await q('v_carga_detalle');
      cargasDisp = (cargas || []).filter(c => !c.anulado);
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los embarques: ${esc(e.message)}</div>`;
      return;
    }
    cont.innerHTML = `<div class="form-erp" style="margin:8px 0">
      <div class="campos">
        <div class="campo ancho"><label>Embarque <span class="req">*</span></label><div id="soCargaPick"></div>
          <div class="alias-ayuda" id="soCargaHint">Elige un embarque para ver sus cajas.</div></div>
        <div class="campo"><label>Cajas a asignar <span class="req">*</span></label>
          <input id="soCajas" class="mono" type="number" step="1" min="1" placeholder="0"></div>
        <div class="campo"><label>Precio / caja (opcional)</label>
          <input id="soPrecioCaja" class="mono" type="number" step="0.01" min="0" placeholder="—"></div>
        <div class="campo ancho"><label>Nota</label><input id="soAsigNota" type="text" maxlength="120" placeholder="Opcional"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="soAsigGuardar">Asignar</button>
        <button class="btn-mini gris" id="soAsigCancelar">Cerrar</button>
      </div>
      <div class="aviso" id="soAsigAviso"></div>
    </div>`;

    comboCargaAsig = ERP.crearCombo({
      contenedor: document.getElementById('soCargaPick'),
      items: cargasDisp.map(c => ({
        id: c.folio,
        nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.producto ? ' · ' + c.producto : ''}${c.cajas != null ? ' · ' + c.cajas + ' cajas' : ''}`,
        alias: [c.po, c.producto, c.proveedor, c.cliente, c.folio].filter(Boolean)
      })),
      placeholder: 'Folio, PO o producto…', permitirNuevo: false,
      alCambiar: sel => {
        const c = sel && cargasDisp.find(x => x.folio === sel.id);
        const hint = document.getElementById('soCargaHint');
        if (hint) hint.textContent = c
          ? (c.cajas != null ? `Este embarque tiene ${c.cajas} cajas en total (el ERP valida que la suma asignada no las exceda).` : 'Este embarque no tiene cajas capturadas.')
          : 'Elige un embarque para ver sus cajas.';
      }
    });

    document.getElementById('soAsigCancelar').addEventListener('click', () => { cont.dataset.abierto = ''; cont.innerHTML = ''; });
    document.getElementById('soAsigGuardar').addEventListener('click', asignarCarga);
  }

  function avisoAsig(tipo, html) {
    const el = document.getElementById('soAsigAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function asignarCarga() {
    const cargaFolio = comboCargaAsig && comboCargaAsig.valorId();
    if (!cargaFolio) { avisoAsig('err', 'Elige un embarque de la lista.'); return; }
    const cajas = numOrNull((document.getElementById('soCajas') || {}).value);
    if (cajas == null || cajas <= 0 || !Number.isInteger(cajas)) { avisoAsig('err', 'Las cajas a asignar deben ser un entero mayor a cero.'); return; }
    const precio = numOrNull((document.getElementById('soPrecioCaja') || {}).value);
    const nota = ((document.getElementById('soAsigNota') || {}).value || '').trim() || null;

    const btn = document.getElementById('soAsigGuardar');
    btn.disabled = true;
    avisoAsig('warn', 'Asignando carga…');
    try {
      const data = await rpc('fn_asignar_carga_so', {
        p_so_folio: soActual.folio, p_carga_folio: cargaFolio,
        p_cajas_asignadas: cajas, p_precio_caja: precio, p_nota: nota
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      const rest = r.cajas_restantes_carga;
      ERP.toast('ok', `Carga <b>${esc(cargaFolio)}</b> asignada (${esc(cajas)} cajas)${rest == null ? '' : ` · quedan ${esc(rest)} disponibles en el embarque`}.`);
      verSO(soActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoAsig('err', `El ERP rechazó la asignación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function desasignar(cargaFolio) {
    if (!window.confirm(`¿Quitar la carga ${cargaFolio} de esta orden de venta?`)) return;
    try {
      await rpc('fn_desasignar_carga_so', { p_so_folio: soActual.folio, p_carga_folio: cargaFolio });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Carga ${esc(cargaFolio)} quitada.`);
      verSO(soActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      avisoEd('err', `No se pudo quitar la carga: ${esc(e.message)}`);
    }
  }

  /* ---------- Estados ---------- */

  function botonesFicha(dis) {
    ['soConfirmar', 'soCerrar', 'soCancelarDoc'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = dis; });
  }

  async function cambiarEstado(fn, extraArgs, etiqueta) {
    if (!window.confirm(`¿Cambiar la orden de venta a "${etiqueta}"? Lo registra el ERP.`)) return;
    botonesFicha(true);
    avisoEd('warn', `Cambiando a ${esc(etiqueta)}…`);
    try {
      await rpc(fn, Object.assign({ p_folio: soActual.folio }, extraArgs));
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Orden de venta ${esc(soActual.folio)} → <b>${esc(etiqueta)}</b>.`);
      verSO(soActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botonesFicha(false); return; }
      avisoEd('err', `No se pudo cambiar el estado: ${esc(e.message)}`);
      botonesFicha(false);
    }
  }

  async function cancelar() {
    const motivo = window.prompt('Motivo de la cancelación (OBLIGATORIO, queda registrado):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para cancelar.'); return; }
    botonesFicha(true);
    avisoEd('warn', 'Cancelando…');
    try {
      await rpc('fn_cancelar_so', { p_folio: soActual.folio, p_motivo: motivo.trim() });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Orden de venta ${esc(soActual.folio)} cancelada.`);
      verSO(soActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botonesFicha(false); return; }
      avisoEd('err', `No se pudo cancelar: ${esc(e.message)}`);
      botonesFicha(false);
    }
  }

  /* ================= Integración en ficha/expediente de embarque ================= */

  async function montarVentasCarga(contenedor, folio) {
    if (!contenedor) return;
    contenedor.innerHTML = `<div class="seccion-head"><h4>Órdenes de venta</h4></div>
      <div id="ventasCargaLista"><div class="skel">Cargando…</div></div>`;
    const lista = document.getElementById('ventasCargaLista');
    try {
      const sos = await q('v_sales_order_cargas', `&carga_folio=${ERP.eq(folio)}&order=so_folio.asc`);
      lista.innerHTML = sos.length
        ? `<div class="tabla-wrap"><table>
            <thead><tr><th>Orden de venta</th><th>Producto</th><th class="num">Cajas</th><th class="num">Importe</th></tr></thead>
            <tbody>${sos.map(s => `<tr class="clic" data-so="${esc(s.so_folio)}">
              <td class="mono"><span class="enlace">${esc(s.so_folio)}</span></td>
              <td>${esc(s.producto || '—')}</td>
              <td class="num">${s.cajas_asignadas == null ? '—' : esc(s.cajas_asignadas)}</td>
              <td class="num">${s.importe_asignado == null ? '—' : usd(s.importe_asignado)}</td></tr>`).join('')}</tbody>
          </table></div>`
        : '<div class="vacio" style="padding:10px 0">Este embarque no está en ninguna orden de venta.</div>';
      lista.querySelectorAll('tr.clic[data-so]').forEach(tr =>
        tr.addEventListener('click', () => { ERP.ir('ventas'); setTimeout(() => verSO(tr.dataset.so), 60); }));
    } catch (e) {
      lista.innerHTML = `<div class="errbox">No se pudieron leer las órdenes de venta: ${esc(e.message)}</div>`;
    }
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('ventas', {
    titulo: 'Órdenes de Venta',
    descripcion: 'Sales Orders — documento interno: revenue model por orden y reparto de cajas',
    render
  });

  ERP.verSO = verSO;
  ERP.nuevaVenta = nuevaVenta;
  ERP.montarVentasCarga = montarVentasCarga;
})();
