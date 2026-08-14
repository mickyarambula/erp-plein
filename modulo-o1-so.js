/* Módulo Sales Orders (ruta 'o1-so') — CAMINO C · Fase O1 (D-160/161/162).
   La SO nace SIEMPRE desde un Customer PO (modulo-o1-cpo.js). Al crearla, el backend también crea
   la OP (espinazo op.operaciones) — grain 1 OP/SO en v1 (D-161). El tablero muestra Required/Allocated/
   Purchased/Open; Allocated y Purchased llegan en O2/O3 (hoy en 0, en gris).

   SOLO FRONTEND. Lee por vistas en public, escribe por RPCs SECURITY DEFINER (op cerrado fuera del API).
   Vistas:
     v_op_sales_orders (id, folio, customer_po_id, cpo_folio, numero_cliente, operacion_id, op_folio,
       op_estado, cliente_id, cliente, revenue_model_id, sales_type, formula_tipo, estado, fecha,
       moneda, nota, created_at, updated_at)
     v_op_so_lineas (id, sales_order_id, so_folio, linea_num, producto_id, producto, cantidad, uom,
       precio_unitario, importe, nota)
     v_op_so_tablero (sales_order_id, so_folio, linea_id, linea_num, producto_id, producto, uom,
       required, allocated, purchased, open)
   Catálogos (vistas ya vivas):
     v_revenue_models (id, codigo, nombre, formula_tipo, descripcion, activo, orden)
     v_catalogo_productos (id, nombre)
   RPCs (capacidad 'capturar'):
     fn_op_so_crear_desde_cpo(p_customer_po_id, p_revenue_model_id, p_lineas jsonb, p_fecha, p_moneda,
       p_nota, p_actor) -> { sales_order_id, so_folio, operacion_id, op_folio, n_lineas }
       p_lineas = [{producto_id, cantidad, uom, precio_unitario|null}]  (precio null = comisión pura, correcto)
     fn_op_so_confirmar(p_so_id, p_actor) -> { so_id, estado_anterior, estado }   (Draft->Confirmed)
     fn_op_so_set_estado(p_so_id, p_nuevo, p_actor)
   Expone ERP.o1CrearSODesde(cpoId, cpoFolio) y ERP.o1VerSO(soId). */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num, fecha } = ERP;

  const actor = () => (ERP.perfil && ERP.perfil.socio_codigo) || null;
  const uno = d => Array.isArray(d) ? (d[0] || {}) : (d || {});
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Pastilla de Sales Type por formula_tipo (comisión pura = ámbar, NO es error). Clases GLOBALES
  // (.pill.verde/.ambar) para que pinte igual en la lista (scoped) y en la ficha (#panelBody, fuera del scope).
  const SALES_TYPE = {
    margen:            { cls: 'verde', txt: 'Margen' },
    pct_venta:         { cls: 'verde', txt: 'Consignación' },
    comision_por_caja: { cls: 'ambar', txt: 'Comisión' },
    buy_resell:        { cls: 'verde', txt: 'Compra-Reventa' }
  };
  function chipSalesType(so) {
    const s = SALES_TYPE[String(so.formula_tipo || '').toLowerCase()];
    const txt = so.sales_type || (s && s.txt) || so.formula_tipo || '—';
    const cls = s ? s.cls : 'gris';
    return `<span class="pill ${cls}">${esc(txt)}</span>`;
  }

  // Pastilla de estado de la SO.
  const ESTADO_CLS = {
    'draft': 'gris', 'confirmed': 'azul', 'in progress': 'ambar',
    'partially sourced': 'ambar', 'sourced': 'verde', 'ready': 'verde', 'cancelled': 'rojo'
  };
  const chipEstado = est => `<span class="pill ${ESTADO_CLS[String(est || '').toLowerCase()] || 'gris'}">${esc(est || '—')}</span>`;

  // Transiciones legales (backend es la autoridad; esto solo evita ofrecer saltos ilegales en la UI).
  const SIGUIENTES = {
    'Draft': ['Confirmed', 'Cancelled'],
    'Confirmed': ['In Progress', 'Cancelled'],
    'In Progress': ['Partially Sourced', 'Sourced', 'Ready', 'Cancelled'],
    'Partially Sourced': ['Sourced', 'Ready', 'Cancelled'],
    'Sourced': [],
    'Ready': [],
    'Cancelled': []
  };

  /* ================= Lista ================= */

  let sos = [];
  let fEstado = '', fTexto = '';

  function filtradas() {
    const t = ERP.norm(fTexto);
    return sos.filter(s => {
      if (fEstado && String(s.estado || '') !== fEstado) return false;
      if (!t) return true;
      return [s.folio, s.cpo_folio, s.cliente, s.op_folio].some(v => ERP.norm(v).includes(t));
    });
  }

  function pintarKpis() {
    const total = sos.length;
    const draft = sos.filter(s => String(s.estado || '').toLowerCase() === 'draft').length;
    const activas = sos.filter(s => {
      const e = String(s.estado || '').toLowerCase();
      return e !== 'draft' && e !== 'cancelled';
    }).length;
    const el = document.getElementById('soKpis');
    if (!el) return;
    el.innerHTML = `
      <div class="kpi"><div class="k">Sales Orders</div><div class="v ink">${total}</div></div>
      <div class="kpi"><div class="k">En borrador</div><div class="v">${draft}</div></div>
      <div class="kpi"><div class="k">En curso</div><div class="v">${activas}</div></div>`;
  }

  function pintarTabla() {
    const cont = document.getElementById('soTabla');
    const conteo = document.getElementById('soConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${sos.length} sales orders`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ninguna sales order coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr><th>Folio SO</th><th>Customer PO</th><th>Cliente</th><th>Sales Type</th>
        <th>Estado</th><th>OP</th><th>Fecha</th></tr></thead>
      <tbody>${rows.map(s => `<tr class="clic" data-id="${esc(s.id)}">
        <td class="mono"><span class="enlace">${esc(s.folio || '—')}</span></td>
        <td class="mono">${esc(s.cpo_folio || '—')}</td>
        <td class="ent">${esc(s.cliente || '—')}</td>
        <td>${chipSalesType(s)}</td>
        <td>${chipEstado(s.estado)}</td>
        <td class="mono">${esc(s.op_folio || '—')}</td>
        <td>${esc(fecha(s.fecha))}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-id]').forEach(tr =>
      tr.addEventListener('click', () => verSO(Number(tr.dataset.id))));
  }

  async function render(cont) {
    let filas;
    try {
      filas = await q('v_op_sales_orders', '&order=created_at.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer las sales orders: ${esc(e.message)}</div>`;
      return;
    }
    sos = filas || [];
    fEstado = ''; fTexto = '';

    cont.innerHTML = `<div class="pantalla-o1-so">
      <div class="kpistrip" id="soKpis"></div>
      <div class="filtros">
        <select class="busca" id="soFEstado" style="max-width:180px">
          <option value="">Todos los estados</option>
          ${['Draft', 'Confirmed', 'In Progress', 'Partially Sourced', 'Sourced', 'Ready', 'Cancelled']
            .map(e => `<option value="${e}">${e}</option>`).join('')}
        </select>
        <input class="busca" id="soBuscar" type="search" placeholder="Buscar folio SO, CPO, cliente u OP…" style="flex:1;min-width:180px">
        <span class="conteo" id="soConteo"></span>
      </div>
      <div class="leyenda-o1">Una Sales Order se genera desde un Customer PO (pantalla <b>Customer PO</b> → “Generar Sales Order”).</div>
      <div id="soTabla"></div>
    </div>`;

    pintarKpis();
    pintarTabla();
    document.getElementById('soFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    document.getElementById('soBuscar').addEventListener('input', e => { fTexto = e.target.value; pintarTabla(); });
  }

  /* ================= Alta (desde un CPO) ================= */

  let revenueModels = [], productos = [], lineas = [];
  let cpoActual = null;   // { id, folio }

  const nuevaLinea = () => ({ producto_id: '', cantidad: '', uom: 'CAJA', precio_unitario: '' });

  function montarLineas() {
    const body = document.getElementById('soLineasBody');
    if (!body) return;
    const opts = l => '<option value="">— producto —</option>' +
      productos.map(p => `<option value="${p.id}"${String(l.producto_id) === String(p.id) ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
    body.innerHTML = lineas.map((l, i) => `<tr>
      <td><select class="so-li" data-i="${i}" data-k="producto_id">${opts(l)}</select></td>
      <td><input class="so-li num" data-i="${i}" data-k="cantidad" type="number" step="0.01" min="0" value="${esc(l.cantidad)}" placeholder="0"></td>
      <td><input class="so-li" data-i="${i}" data-k="uom" type="text" value="${esc(l.uom)}" style="width:70px"></td>
      <td><input class="so-li num" data-i="${i}" data-k="precio_unitario" type="number" step="0.01" min="0" value="${esc(l.precio_unitario)}" placeholder="opcional"></td>
      <td><button class="btn-cap" data-del="${i}" title="Quitar línea">✕</button></td>
    </tr>`).join('');

    body.querySelectorAll('.so-li').forEach(inp => {
      inp.addEventListener('input', e => { lineas[Number(e.target.dataset.i)][e.target.dataset.k] = e.target.value; });
      inp.addEventListener('change', e => { lineas[Number(e.target.dataset.i)][e.target.dataset.k] = e.target.value; });
    });
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      recogerLineas();
      lineas.splice(Number(b.dataset.del), 1);
      if (!lineas.length) lineas.push(nuevaLinea());
      montarLineas();
    }));
  }

  function recogerLineas() {
    document.querySelectorAll('#soLineasBody .so-li').forEach(inp => {
      const i = Number(inp.dataset.i), k = inp.dataset.k;
      if (lineas[i]) lineas[i][k] = inp.value;
    });
  }

  function lineasPayload() {
    recogerLineas();
    return lineas
      .filter(l => l.producto_id)
      .map(l => ({
        producto_id: Number(l.producto_id),
        cantidad: numOrNull(l.cantidad),
        uom: String(l.uom || '').trim() || 'CAJA',
        precio_unitario: numOrNull(l.precio_unitario)   // null = comisión pura (correcto)
      }));
  }

  function avisoNv(tipo, html) {
    const el = document.getElementById('soNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function crearSODesde(cpoId, cpoFolio) {
    if (!ERP.puede('capturar')) return;
    cpoActual = { id: Number(cpoId), folio: cpoFolio || '' };
    ERP.abrirPanel('Generar Sales Order', `desde Customer PO ${esc(cpoFolio || '')}`, '<div class="skel">Cargando catálogos…</div>');
    try {
      [revenueModels, productos] = await Promise.all([
        q('v_revenue_models', '&order=orden.asc').then(r => (r || []).filter(x => x.activo !== false)),
        q('v_catalogo_productos', '&order=nombre.asc')
      ]);
    } catch (e) {
      ERP.abrirPanel('Generar Sales Order', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }
    lineas = [nuevaLinea()];

    ERP.abrirPanel('Generar Sales Order', `desde Customer PO <span class="mono">${esc(cpoFolio || '')}</span>`, `
      <div class="form-erp so-editor">
        <div class="campos">
          <div class="campo ancho"><label>Sales Type <span class="req">*</span></label>
            <select id="soRM"><option value="">— Elige el modelo de venta —</option>${revenueModels.map(r =>
              `<option value="${esc(r.id)}">${esc([r.codigo, r.nombre].filter(Boolean).join(' — '))}</option>`).join('')}</select>
            <div class="alias-ayuda" id="soRMDesc">Margen, Consignación o Comisión definen cómo se reconoce el ingreso.</div></div>
          <div class="campo"><label>Fecha</label><input id="soFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="soMoneda">${ERP.MONEDAS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
          <div class="campo ancho"><label>Nota</label><textarea id="soNota" rows="2"></textarea></div>
        </div>
        <div class="seccion-head"><h4>Líneas</h4><button class="btn-mini gris" id="soAddLinea">+ Línea</button></div>
        <div class="tabla-wrap"><table class="so-lineas">
          <thead><tr><th>Producto</th><th class="num">Cantidad</th><th>UOM</th><th class="num">Precio unit.</th><th></th></tr></thead>
          <tbody id="soLineasBody"></tbody>
        </table></div>
        <div class="alias-ayuda">El precio unitario es opcional: en comisión pura va vacío (costo 0 / margen 100% es correcto).</div>
        <div class="acciones">
          <button class="btn-mini" id="soCrear">Crear Sales Order (borrador) + OP</button>
          <button class="btn-mini gris" id="soCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="soNvAviso"></div>
      </div>`);

    montarLineas();
    const selRM = document.getElementById('soRM');
    selRM.addEventListener('change', () => {
      const rm = revenueModels.find(r => String(r.id) === String(selRM.value));
      document.getElementById('soRMDesc').textContent = rm && rm.descripcion
        ? rm.descripcion
        : 'Margen, Consignación o Comisión definen cómo se reconoce el ingreso.';
    });
    document.getElementById('soAddLinea').addEventListener('click', () => { recogerLineas(); lineas.push(nuevaLinea()); montarLineas(); });
    document.getElementById('soCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('soCrear').addEventListener('click', crearSO);
  }

  async function crearSO() {
    const rmId = (document.getElementById('soRM') || {}).value;
    if (!rmId) { avisoNv('err', 'Elige el Sales Type.'); return; }
    const payload = lineasPayload();
    if (!payload.length) { avisoNv('err', 'Agrega al menos una línea con producto.'); return; }

    const v = id => (document.getElementById(id) || {}).value;
    const args = {
      p_customer_po_id: cpoActual.id,
      p_revenue_model_id: Number(rmId),
      p_lineas: payload,
      p_fecha: v('soFecha') || null,
      p_moneda: v('soMoneda') || 'USD',
      p_nota: (v('soNota') || '').trim() || null,
      p_actor: actor()
    };

    const btn = document.getElementById('soCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando sales order y su OP…');
    try {
      const r = uno(await rpc('fn_op_so_crear_desde_cpo', args));
      if (!r.sales_order_id) throw new Error('El ERP no devolvió la sales order.');
      ERP.toast('ok', `Sales Order <b>${esc(r.so_folio || '')}</b> creada (Draft) · OP <b>${esc(r.op_folio || '')}</b>.`);
      ERP.marcarDatosSucios();
      verSO(Number(r.sales_order_id));
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó la sales order: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha + tablero ================= */

  async function verSO(id) {
    ERP.abrirPanel('Sales Order', 'Cargando…', '<div class="skel">Cargando sales order…</div>');
    let so, lin, tab;
    try {
      [so, lin, tab] = await Promise.all([
        q('v_op_sales_orders', `&id=eq.${Number(id)}`).then(r => r && r[0]),
        q('v_op_so_lineas', `&sales_order_id=eq.${Number(id)}&order=linea_num.asc`).catch(() => []),
        q('v_op_so_tablero', `&sales_order_id=eq.${Number(id)}&order=linea_num.asc`).catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel('Sales Order', '', `<div class="errbox">No se pudo cargar la sales order: ${esc(e.message)}</div>`);
      return;
    }
    if (!so) { ERP.abrirPanel('Sales Order', '', '<div class="errbox">No se encontró la sales order.</div>'); return; }

    const est = so.estado || 'Draft';
    const esDraft = String(est).toLowerCase() === 'draft';
    const puedeCap = ERP.puede('capturar');
    const siguientes = SIGUIENTES[est] || [];

    const tablero = (tab && tab.length) ? tab : (lin || []).map(l => ({
      linea_id: l.id, producto_id: l.producto_id,
      linea_num: l.linea_num, producto: l.producto, uom: l.uom,
      required: l.cantidad, allocated: 0, purchased: 0, open: l.cantidad
    }));

    const filasTablero = tablero.map(t => `<tr>
      <td class="mono">${esc(t.linea_num ?? '—')}</td>
      <td class="prod">${esc(t.producto || '—')}</td>
      <td class="mono">${esc(t.uom || '—')}</td>
      <td class="num">${esc(num(t.required))}</td>
      <td class="num">${esc(num(t.allocated))}</td>
      <td class="num futuro">${esc(num(t.purchased))}</td>
      <td class="num open">${esc(num(t.open))}</td>
      <td>${puedeCap && num(t.open) > 0 && t.linea_id != null
        ? `<button type="button" class="btn-cap asignar-lote" data-linea-id="${esc(t.linea_id)}">Asignar</button>` : ''}</td>
    </tr>`).join('');

    const gestionEstado = (puedeCap && String(est).toLowerCase() !== 'cancelled' && String(est).toLowerCase() !== 'sourced' && String(est).toLowerCase() !== 'ready')
      ? `<div class="so-estados">
          ${esDraft ? '<button class="btn-mini" id="soConfirmar">Confirmar</button>' : ''}
          ${siguientes.length ? `
            <select id="soNuevoEstado" class="busca" style="max-width:200px">
              <option value="">Cambiar estado…</option>
              ${siguientes.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('')}
            </select>
            <button class="btn-mini gris" id="soAplicarEstado">Aplicar</button>` : ''}
        </div>`
      : '';

    ERP.abrirPanel(`Sales Order <span class="mono">${esc(so.folio || '')}</span>`, esc(so.cliente || ''), `
      <div class="so-ficha">
        <div class="det-grid">
          <div class="det"><span class="l">Customer PO</span><span class="v mono">${esc(so.cpo_folio || '—')}</span></div>
          <div class="det"><span class="l">Cliente</span><span class="v">${esc(so.cliente || '—')}</span></div>
          <div class="det"><span class="l">Sales Type</span><span class="v">${chipSalesType(so)}</span></div>
          <div class="det"><span class="l">Estado</span><span class="v">${chipEstado(est)}</span></div>
          <div class="det"><span class="l">OP</span><span class="v mono">${esc(so.op_folio || '—')}</span></div>
          <div class="det"><span class="l">Fecha</span><span class="v">${esc(fecha(so.fecha))}</span></div>
          <div class="det"><span class="l">Moneda</span><span class="v mono">${esc(so.moneda || '—')}</span></div>
        </div>
        ${so.nota ? `<div class="so-nota"><span class="l">Nota</span> ${esc(so.nota)}</div>` : ''}

        <div class="seccion-head"><h4>Tablero de la orden</h4></div>
        <div class="tabla-wrap"><table class="so-tablero">
          <thead><tr><th>#</th><th>Producto</th><th>UOM</th>
            <th class="num">Required</th><th class="num">Allocated</th><th class="num">Purchased</th><th class="num">Open</th><th></th></tr></thead>
          <tbody>${filasTablero || '<tr><td colspan="8" class="vacio">Sin líneas.</td></tr>'}</tbody>
        </table></div>
        <div class="alias-ayuda">Allocated sube al "Asignar" un lote de Inventario (O2a) — <b>Open</b> = lo que falta por surtir. Purchased llega en O3 (por eso sigue en 0 y en gris).</div>

        <div class="acciones">
          ${gestionEstado}
          <button class="btn-mini gris" id="soCerrar">Cerrar</button>
        </div>
        <div class="aviso" id="soFichaAviso"></div>
      </div>`);

    document.getElementById('soCerrar').addEventListener('click', ERP.cerrarPanel);

    const bConf = document.getElementById('soConfirmar');
    if (bConf) bConf.addEventListener('click', () => confirmarSO(Number(id), bConf));

    const bAplicar = document.getElementById('soAplicarEstado');
    if (bAplicar) bAplicar.addEventListener('click', () => {
      const nuevo = (document.getElementById('soNuevoEstado') || {}).value;
      if (!nuevo) { fichaAviso('err', 'Elige el estado destino.'); return; }
      setEstadoSO(Number(id), nuevo, bAplicar);
    });

    document.querySelectorAll('.asignar-lote').forEach(b => b.addEventListener('click', () => {
      const t = tablero.find(x => String(x.linea_id) === b.dataset.lineaId);
      if (t) abrirAsignarLote(so, t);
    }));
  }

  /* ================= Asignar lote a línea (O2a — fn_op_alloc_crear) =================
     op.inventory_allocations liga un lote de Inventario (op.lots, standalone, ver
     modulo-o1-inventario.js) a ESTA línea de Sales Order. Toma sobre el panel completo (mismo
     patrón que "Agregar compra"/"Registrar embarque" en modulo-operaciones.js): Cancelar vuelve
     a verSO(). Solo se ofrecen lotes del MISMO producto con disponible > 0. */

  async function abrirAsignarLote(so, t) {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Asignar inventario', `${esc(so.folio || '')} · línea #${esc(t.linea_num ?? '')} · ${esc(t.producto || '')}`, '<div class="skel">Buscando lotes disponibles…</div>');
    let inv;
    try {
      inv = await q('v_op_inventario', `&producto_id=${ERP.eq(t.producto_id)}&order=fecha.asc`);
    } catch (e) {
      ERP.abrirPanel('Asignar inventario', '', `<div class="errbox">No se pudo leer el inventario: ${esc(e.message)}</div>`);
      return;
    }
    const lotesDisp = (inv || []).filter(l => num(l.disponible) > 0.009);

    ERP.abrirPanel('Asignar inventario', `${esc(so.folio || '')} · línea #${esc(t.linea_num ?? '')} · ${esc(t.producto || '')}`, `
      <div class="form-erp">
        <div class="det-grid">
          <div class="det"><span class="l">Required</span><span class="v mono">${esc(num(t.required))}</span></div>
          <div class="det"><span class="l">Allocated</span><span class="v mono">${esc(num(t.allocated))}</span></div>
          <div class="det"><span class="l">Open</span><span class="v mono">${esc(num(t.open))}</span></div>
        </div>
        ${lotesDisp.length ? `
        <div class="campos">
          <div class="campo ancho"><label>Lote <span class="req">*</span></label>
            <select id="alLote">${lotesDisp.map(l =>
              `<option value="${esc(l.lot_id)}" data-disp="${esc(num(l.disponible))}">${esc(l.folio || ('Lote ' + l.lot_id))} · ${esc([l.location_codigo, l.location_nombre].filter(Boolean).join(' — '))} · disponible ${esc(ERP.fmt0(l.disponible))}</option>`).join('')}
            </select></div>
          <div class="campo"><label>Cantidad a asignar <span class="req">*</span></label>
            <input id="alCantidad" class="mono" type="number" step="0.01" min="0" placeholder="0"></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="alGuardar">Asignar</button>
          <button class="btn-mini gris" id="alCancelar">Cancelar</button>
        </div>` : `
        <div class="vacio">No hay inventario disponible de <b>${esc(t.producto || 'este producto')}</b> todavía.</div>
        <div class="acciones">
          <button class="btn-mini" id="alRecibir">Recibir inventario nuevo</button>
          <button class="btn-mini gris" id="alCancelar">Volver</button>
        </div>`}
        <div class="aviso" id="alAviso"></div>
      </div>`);

    document.getElementById('alCancelar').addEventListener('click', () => verSO(so.id));
    const bRecibir = document.getElementById('alRecibir');
    if (bRecibir) bRecibir.addEventListener('click', () => {
      if (ERP.o1AbrirRecibirInventario) ERP.o1AbrirRecibirInventario(t.producto_id);
      else ERP.toast('err', 'El módulo de Inventario no está cargado.');
    });
    const bGuardar = document.getElementById('alGuardar');
    if (bGuardar) bGuardar.addEventListener('click', () => guardarAsignacion(so, t));
  }

  function avisoAsignar(tipo, html) {
    const el = document.getElementById('alAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function guardarAsignacion(so, t) {
    const sel = document.getElementById('alLote');
    const lotId = sel && sel.value;
    if (!lotId) { avisoAsignar('err', 'Elige un lote.'); return; }
    const dispSel = Number((sel.selectedOptions[0] || {}).dataset.disp || 0);
    const cantidad = numOrNull(document.getElementById('alCantidad').value);
    if (!(cantidad > 0)) { avisoAsignar('err', 'La cantidad debe ser mayor a cero.'); return; }
    if (cantidad > dispSel + 0.009) { avisoAsignar('err', `Ese lote solo tiene ${esc(ERP.fmt0(dispSel))} disponible.`); return; }
    if (cantidad > num(t.open) + 0.009) { avisoAsignar('err', `La línea solo tiene ${esc(ERP.fmt0(t.open))} abierto (Open).`); return; }

    const btn = document.getElementById('alGuardar');
    btn.disabled = true;
    avisoAsignar('warn', 'Asignando…');
    try {
      await rpc('fn_op_alloc_crear', { p_so_linea_id: Number(t.linea_id), p_lot_id: Number(lotId), p_cantidad: cantidad });
      ERP.toast('ok', `Inventario asignado a la línea #${esc(t.linea_num ?? '')}.`);
      ERP.marcarDatosSucios();
      verSO(so.id);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoAsignar('err', `El ERP rechazó la asignación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  function fichaAviso(tipo, html) {
    const el = document.getElementById('soFichaAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function confirmarSO(id, btn) {
    btn.disabled = true;
    fichaAviso('warn', 'Confirmando…');
    try {
      const r = uno(await rpc('fn_op_so_confirmar', { p_so_id: id, p_actor: actor() }));
      ERP.toast('ok', `Sales Order confirmada (${esc(r.estado || 'Confirmed')}).`);
      ERP.marcarDatosSucios();
      verSO(id);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      fichaAviso('err', `El ERP rechazó la confirmación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function setEstadoSO(id, nuevo, btn) {
    btn.disabled = true;
    fichaAviso('warn', `Cambiando a ${esc(nuevo)}…`);
    try {
      await rpc('fn_op_so_set_estado', { p_so_id: id, p_nuevo: nuevo, p_actor: actor() });
      ERP.toast('ok', `Estado cambiado a <b>${esc(nuevo)}</b>.`);
      ERP.marcarDatosSucios();
      verSO(id);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      fichaAviso('err', `El ERP rechazó el cambio de estado: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  ERP.registrar('o1-so', {
    titulo: 'Sales Orders',
    descripcion: 'Camino C · O1 — órdenes de venta y su tablero (Required/Allocated/Purchased/Open)',
    render
  });

  ERP.o1CrearSODesde = crearSODesde;
  ERP.o1VerSO = verSO;
})();
