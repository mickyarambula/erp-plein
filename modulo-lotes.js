/* Módulo Lotes (ruta 'lotes') — Fase C.2, backend ya desplegado (verificado en vivo antes de programar).
   ESPEJO estructural de modulo-ventas.js (Órdenes de Venta): lista + ficha + estados + export.

   Vistas (solo lectura, confirmadas en vivo columna por columna vía 42703 (no existe) / 42501
   (existe, protegida) sobre REST — el mismo patrón de siempre, sin necesitar sesión real):
     v_lotes (folio, proveedor, proveedor_id, cajas, pallets, cajas_disponibles,
       cajas_asignadas_total, n_items, productos, costo_total, n_ventas, anulado, po_proveedor,
       fecha, carga_folio, nota, capturado_por, capturado_ts, anulado_motivo, anulado_por, anulado_ts)
     v_lote_items (id, lote_folio, producto_id, producto, cajas, nota, capturado_por, capturado_ts)
     v_lote_ventas (id, lote_folio, so_folio, so_estado, cliente, cajas_asignadas,
       pallets_asignados, nota, capturado_por, capturado_ts)
     v_lote_cadena (lote_folio, carga_folio, carga_po, proveedor_id, proveedor, lote_cajas,
       so_folio, so_cliente, so_cliente_id, so_estado, revenue_model_id, revenue_model,
       cajas_asignadas, pallets_asignados) — trazabilidad Lote→carga→SO→Revenue Model.
     v_catalogo_proveedores / v_catalogo_productos (id, nombre, alias…) · v_sales_orders (picker
     de venta) · v_carga_detalle (picker de embarque puente, folio/po/cliente/producto/cajas/anulado)
     v_lote_inventario (folio, proveedor, po_proveedor, carga_folio, carga_po, productos, total,
       sold, waste, rts, on_hand, ats, anulado) — inventario FÍSICO (sin dinero); total/on_hand/ats
       pueden venir NULL (lote sin cajas capturadas) → pintar "—", nunca 0.
     v_lote_movimientos (id, lote_folio, tipo 'merma'|'rts', cajas, fecha, motivo, nota,
       capturado_por, capturado_ts, anulado, anulado_motivo, anulado_por, anulado_ts)
   No hay "estado" de texto: el lote solo tiene `anulado` (bool) → chip Vivo/Anulado.
   RPCs (capacidad 'capturar'/'editar'; el backend es la autoridad; firmas p_ confirmadas en vivo
   contra el esquema real de PostgREST, no adivinadas):
     fn_crear_lote(p_proveedor_id, p_cajas, p_pallets, p_po_proveedor, p_fecha, p_carga_folio, p_nota)
       → folio del lote nuevo
     fn_agregar_item_lote(p_lote_folio, p_producto_id, p_cajas, p_nota) → cajas_lote_restantes (si el backend lo trae)
     fn_asignar_venta_lote(p_lote_folio, p_so_folio, p_cajas_asignadas, p_pallets_asignados, p_nota)
       → cajas_restantes_lote (si el backend lo trae)
     fn_desasignar_venta_lote(p_lote_folio, p_so_folio)
     fn_anular_lote(p_folio, p_motivo) — el backend rechaza si el lote tiene repartos; el error se
       muestra tal cual, no se esconde.
     fn_registrar_mov_lote(p_lote_folio, p_tipo 'merma'|'rts', p_cajas, p_motivo, p_fecha, p_nota)
       → (lote_folio, tipo, cajas, on_hand) — gate 'capturar'. El backend topa
       Σ(vendido+merma+rts) ≤ total y devuelve el error tal cual si se excede.
     fn_anular_mov_lote(p_id, p_motivo) → (id, anulado) — gate 'editar'.
   Expone ERP.verLote, ERP.nuevoLote, ERP.montarLoteCarga.
   costo_total es DERIVADO del puente transitorio carga_folio (C.2 paso 1): migrará a costo propio
   del lote en la re-ancla — se avisa con un ⓘ (.info-nota) junto al encabezado de la columna.
   "Inventario del lote" es FÍSICO (cajas: total/vendido/merma/devuelto/on-hand/ATS) — NO hay
   campos de dinero en esa sección; el dinero sigue viviendo en "Reparto a ventas" (RM/costos). */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num, fmt0 } = ERP;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha4(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return `${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}-${d.getFullYear()}`;
  }
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

  const chipLote = anulado => `<span class="lote-estado ${anulado ? 'anulado' : 'vivo'}">${anulado ? 'Anulado' : 'Vivo'}</span>`;
  const NOTA_COSTO = 'costo_total es DERIVADO del puente transitorio carga_folio (C.2 paso 1); migrará a costo propio del lote en la re-ancla.';
  const infoNota = (texto, extraStyle = '') => ` <span class="info-nota" data-nota="${esc(texto)}" title="${esc(texto)}" role="button" tabindex="0" style="cursor:help;color:var(--i2)${extraStyle}">ⓘ</span>`;

  const TEXTO_MOV = { merma: 'Merma', rts: 'Devolución' };
  const chipMov = tipo => {
    const t = String(tipo || '').toLowerCase();
    return `<span class="mov-tipo ${t}">${esc(TEXTO_MOV[t] || tipo || '—')}</span>`;
  };
  const cantOrRaya = v => v == null ? '—' : fmt0(num(v));
  /* Fecha LOCAL (no toISOString, que es UTC y puede correrse un día tras las 17:00 en Los Mochis —
     ver la regla dura de zona horaria en CLAUDE.md): solo es un prellenado de conveniencia, editable;
     si el usuario la borra se manda null y el backend usa fn_hoy(). */
  function hoyLocalISO() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /* ================= Lista ================= */

  let lotes = [];
  let fFiltro = 'vivos';   // 'vivos' | 'anulados' | '' (todos)
  let fTexto = '';

  function filtradas() {
    const t = ERP.norm(fTexto);
    return lotes.filter(l => {
      if (fFiltro === 'vivos' && l.anulado) return false;
      if (fFiltro === 'anulados' && !l.anulado) return false;
      if (!t) return true;
      return [l.folio, l.proveedor, l.po_proveedor, l.carga_folio, l.productos].some(x => ERP.norm(x).includes(t));
    });
  }

  function pintarTabla() {
    const cont = document.getElementById('ltTabla');
    const conteo = document.getElementById('ltConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${lotes.length} lotes`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ningún lote coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblLotes">
      <thead><tr><th>Folio</th><th>Proveedor</th><th class="num">Cajas</th><th class="num">Disponibles</th>
        <th class="num">Asignadas</th><th class="num">Items</th><th>Productos</th>
        <th class="num">Costo total${infoNota(NOTA_COSTO)}</th><th class="num">Ventas</th><th>Estado</th></tr></thead>
      <tbody>${rows.map(l => `<tr class="clic" data-folio="${esc(l.folio)}">
        <td class="mono"><span class="enlace">${esc(l.folio)}</span></td>
        <td>${esc(l.proveedor || '—')}</td>
        <td class="num">${l.cajas == null ? '—' : esc(l.cajas)}</td>
        <td class="num">${l.cajas_disponibles == null ? '—' : esc(l.cajas_disponibles)}</td>
        <td class="num">${l.cajas_asignadas_total == null ? '—' : esc(l.cajas_asignadas_total)}</td>
        <td class="num">${esc(l.n_items ?? 0)}</td>
        <td>${esc(l.productos || '—')}</td>
        <td class="num">${l.costo_total == null ? '—' : usd(l.costo_total)}</td>
        <td class="num">${esc(l.n_ventas ?? 0)}</td>
        <td>${chipLote(l.anulado)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-folio]').forEach(tr =>
      tr.addEventListener('click', () => verLote(tr.dataset.folio)));
    ERP.cablearInfoNota(cont);
  }

  async function render(cont, parametro) {
    const puedeCap = ERP.puede('capturar');
    let ls;
    try {
      ls = await q('v_lotes', '&order=folio.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los lotes: ${esc(e.message)}</div>`;
      return;
    }
    lotes = ls || [];
    fFiltro = 'vivos'; fTexto = '';

    cont.innerHTML = `<div class="pantalla-lotes">
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="ltNuevo">+ Nuevo lote</button>' : ''}
        <select class="busca" id="ltFFiltro" style="max-width:160px">
          <option value="vivos">Vivos</option>
          <option value="anulados">Anulados</option>
          <option value="">Todos</option>
        </select>
        <input class="busca" id="ltFTexto" type="text" placeholder="Buscar por folio, proveedor, PO o producto…">
        <span class="conteo" id="ltConteo"></span>
      </div>
      ${ERP.botonesExportar ? ERP.botonesExportar('Lotes', 'Lotes', '#tblLotes') : ''}
      <div class="card" style="padding:14px"><div id="ltTabla"></div></div>
      <div class="leyenda">El Lote agrupa la materia prima comprada a un proveedor (con o sin embarque
        puente) antes de repartirla entre productos y órdenes de venta.</div>
    </div>`;

    const btnN = document.getElementById('ltNuevo');
    if (btnN) btnN.addEventListener('click', () => nuevoLote());
    document.getElementById('ltFFiltro').addEventListener('change', e => { fFiltro = e.target.value; pintarTabla(); });
    let tempo;
    document.getElementById('ltFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });

    pintarTabla();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
    if (parametro) verLote(parametro);
  }

  /* ================= Nuevo lote ================= */

  let comboProveedorNv = null, comboCargaNv = null;
  let proveedoresCat = [], cargasDisp = [];

  async function nuevoLote() {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Nuevo lote', 'Datos del lote', '<div class="skel">Cargando catálogos…</div>');
    try {
      [proveedoresCat, cargasDisp] = await Promise.all([
        q('v_catalogo_proveedores', '&order=nombre.asc'),
        q('v_carga_detalle')
      ]);
      cargasDisp = (cargasDisp || []).filter(c => !c.anulado);
    } catch (e) {
      ERP.abrirPanel('Nuevo lote', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Nuevo lote', 'Datos del lote', `
      <div class="form-erp oc-editor">
        <div class="campos">
          <div class="campo ancho"><label>Proveedor</label><div id="ltProveedor"></div>
            <div class="alias-ayuda">Opcional: déjalo vacío si el proveedor aún no se define.</div></div>
          <div class="campo"><label>Cajas <span class="req">*</span></label>
            <input id="ltCajas" class="mono" type="number" step="1" min="1" placeholder="0"></div>
          <div class="campo"><label>Pallets</label>
            <input id="ltPallets" class="mono" type="number" step="1" min="0" placeholder="Opcional"></div>
          <div class="campo"><label>P.O. proveedor</label><input id="ltPO" type="text" maxlength="60" placeholder="Opcional"></div>
          <div class="campo"><label>Fecha</label><input id="ltFecha" type="date"></div>
          <div class="campo ancho"><label>Embarque puente (opcional)</label><div id="ltCargaPick"></div>
            <div class="alias-ayuda" id="ltCargaHint">Solo si este lote viene de un embarque ya capturado (C.2 paso 1).</div></div>
          <div class="campo ancho"><label>Nota</label><textarea id="ltNota" rows="2"></textarea></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="ltCrear">Crear lote</button>
          <button class="btn-mini gris" id="ltCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ltNvAviso"></div>
      </div>`);

    comboProveedorNv = ERP.crearCombo({
      contenedor: document.getElementById('ltProveedor'),
      items: proveedoresCat.map(p => ({ id: p.id, nombre: p.nombre, alias: p.alias || [] })),
      placeholder: 'Busca proveedor por nombre o alias…', permitirNuevo: false
    });

    comboCargaNv = ERP.crearCombo({
      contenedor: document.getElementById('ltCargaPick'),
      items: cargasDisp.map(c => ({
        id: c.folio,
        nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.producto ? ' · ' + c.producto : ''}${c.cajas != null ? ' · ' + c.cajas + ' cajas' : ''}`,
        alias: [c.po, c.producto, c.proveedor, c.cliente, c.folio].filter(Boolean)
      })),
      placeholder: 'Folio, PO o producto…', permitirNuevo: false,
      alCambiar: sel => {
        const c = sel && cargasDisp.find(x => x.folio === sel.id);
        const hint = document.getElementById('ltCargaHint');
        if (hint) hint.textContent = c
          ? (c.cajas != null ? `Este embarque tiene ${c.cajas} cajas capturadas.` : 'Este embarque no tiene cajas capturadas.')
          : 'Solo si este lote viene de un embarque ya capturado (C.2 paso 1).';
      }
    });

    document.getElementById('ltCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('ltCrear').addEventListener('click', crearLote);
  }

  function avisoNv(tipo, html) {
    const el = document.getElementById('ltNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function crearLote() {
    const cajas = numOrNull((document.getElementById('ltCajas') || {}).value);
    if (cajas == null || cajas <= 0 || !Number.isInteger(cajas)) { avisoNv('err', 'Las cajas deben ser un entero mayor a cero.'); return; }
    const pallets = numOrNull((document.getElementById('ltPallets') || {}).value);
    const v = id => ((document.getElementById(id) || {}).value || '').trim();

    const args = {
      p_proveedor_id: comboProveedorNv ? comboProveedorNv.valorId() : null,
      p_cajas: cajas,
      p_pallets: pallets,
      p_po_proveedor: v('ltPO') || null,
      p_fecha: v('ltFecha') || null,
      p_carga_folio: comboCargaNv ? comboCargaNv.valorId() : null,
      p_nota: v('ltNota') || null
    };

    const btn = document.getElementById('ltCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando lote…');
    try {
      const data = await rpc('fn_crear_lote', args);
      const r = (data && data[0]) || {};
      if (!r.folio) throw new Error('El ERP no devolvió el folio del lote.');
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Lote <b>${esc(r.folio)}</b> creado.`);
      verLote(r.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó el lote: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha ================= */

  let loteActual = null, comboSOAsig = null, sosDisp = [];

  async function verLote(folio) {
    ERP.abrirPanel('Lote', 'Cargando…', '<div class="skel">Cargando lote…</div>');
    let lote, items, ventas, cadena, inv, movs;
    try {
      [lote, items, ventas, cadena, inv, movs] = await Promise.all([
        q('v_lotes', `&folio=${ERP.eq(folio)}`).then(r => r && r[0]),
        q('v_lote_items', `&lote_folio=${ERP.eq(folio)}&order=id.asc`),
        q('v_lote_ventas', `&lote_folio=${ERP.eq(folio)}&order=so_folio.asc`),
        q('v_lote_cadena', `&lote_folio=${ERP.eq(folio)}`),
        q('v_lote_inventario', `&folio=${ERP.eq(folio)}`).then(r => r && r[0]),
        q('v_lote_movimientos', `&lote_folio=${ERP.eq(folio)}&anulado=eq.false&order=fecha.desc,id.desc`)
      ]);
      if (!lote) throw new Error('El lote no existe.');
    } catch (e) {
      ERP.abrirPanel('Lote', '', `<div class="errbox">No se pudo cargar el lote: ${esc(e.message)}</div>`);
      return;
    }
    loteActual = lote;
    const puedeCap = ERP.puede('capturar');
    const puedeEd = ERP.puede('editar');
    const activo = !lote.anulado;

    ERP.abrirPanel(
      `Lote ${esc(lote.folio)}`,
      `${esc(lote.proveedor || 'Sin proveedor')} · ${chipLote(lote.anulado)}`,
      cuerpoFicha(lote, items || [], ventas || [], cadena || [], inv || null, movs || [], activo, puedeCap, puedeEd)
    );
    ERP.cablearInfoNota(document.getElementById('panelBody'));

    if (activo && puedeCap) {
      const bItem = document.getElementById('ltAgregarItem');
      if (bItem) bItem.addEventListener('click', () => abrirAgregarItem());
      const bAsig = document.getElementById('ltAsignar');
      if (bAsig) bAsig.addEventListener('click', () => abrirAsignarVenta());
      const bMov = document.getElementById('ltMovGuardar');
      if (bMov) bMov.addEventListener('click', () => registrarMovLote());
    }
    if (activo && puedeEd) {
      const bAnular = document.getElementById('ltAnular');
      if (bAnular) bAnular.addEventListener('click', () => anular());
      document.querySelectorAll('[data-desasig]').forEach(b =>
        b.addEventListener('click', () => desasignar(b.dataset.desasig)));
      document.querySelectorAll('[data-anular-mov]').forEach(b =>
        b.addEventListener('click', () => anularMovLote(b.dataset.anularMov)));
    }
  }

  function tablaItems(items) {
    const cajas = items.reduce((s, i) => s + num(i.cajas), 0);
    const filas = items.length ? items.map(i => `<tr>
        <td>${esc(i.producto || '—')}</td>
        <td class="num">${i.cajas == null ? '—' : esc(i.cajas)}</td>
        <td>${esc(i.nota || '—')}</td>
      </tr>`).join('')
      : `<tr><td colspan="3" style="color:var(--i2)">Sin productos capturados todavía.</td></tr>`;
    return `<div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Producto</th><th class="num">Cajas</th><th>Nota</th></tr></thead>
        <tbody>${filas}</tbody>
        ${items.length ? `<tfoot><tr class="total"><td>Total (${items.length} producto${items.length === 1 ? '' : 's'})</td>
          <td class="num">${cajas}</td><td></td></tr></tfoot>` : ''}
      </table></div>`;
  }

  function tablaVentas(ventas, editable) {
    const filas = ventas.length ? ventas.map(v => `<tr>
        <td class="mono"><span class="enlace" data-so="${esc(v.so_folio)}">${esc(v.so_folio || '—')}</span></td>
        <td>${esc(v.cliente || '—')}</td>
        <td class="num">${v.cajas_asignadas == null ? '—' : esc(v.cajas_asignadas)}</td>
        <td class="num">${v.pallets_asignados == null ? '—' : esc(v.pallets_asignados)}</td>
        <td class="num">${v.precio_caja == null ? '—' : usd(v.precio_caja)}</td>
        <td class="num">${v.importe == null ? '—' : usd(v.importe)}</td>
        <td>${esc(v.so_estado || '—')}</td>
        ${editable ? `<td><button class="btn-cap" data-desasig="${esc(v.id)}" title="Quitar esta venta">✕</button></td>` : ''}
      </tr>`).join('')
      : `<tr><td colspan="${editable ? 8 : 7}" style="color:var(--i2)">Sin ventas repartidas todavía.</td></tr>`;
    return `<div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Orden de venta</th><th>Cliente</th><th class="num">Cajas</th>
          <th class="num">Pallets</th><th class="num">Precio/caja</th><th class="num">Importe</th>
          <th>Estado</th>${editable ? '<th></th>' : ''}</tr></thead>
        <tbody>${filas}</tbody>
      </table></div>`;
  }

  function tablaCadena(cadena) {
    if (!cadena.length) return '';
    const filas = cadena.map(c => `<tr>
        <td class="mono">${esc(c.carga_folio || '—')}${c.carga_po ? ` · ${esc(c.carga_po)}` : ''}</td>
        <td>${esc(c.proveedor || '—')}</td>
        <td class="mono">${esc(c.so_folio || '—')}</td>
        <td>${esc(c.so_cliente || '—')}</td>
        <td>${esc(c.so_estado || '—')}</td>
        <td>${esc(c.revenue_model || '—')}</td>
        <td class="num">${c.cajas_asignadas == null ? '—' : esc(c.cajas_asignadas)}</td>
      </tr>`).join('');
    return `<div class="seccion-head"><h4>Cadena / trazabilidad</h4></div>
      <div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Embarque</th><th>Proveedor</th><th>Orden de venta</th><th>Cliente</th>
          <th>Estado SO</th><th>Revenue Model</th><th class="num">Cajas</th></tr></thead>
        <tbody>${filas}</tbody>
      </table></div>`;
  }

  function bloqueInventario(inv) {
    if (!inv) return '<div class="vacio">Sin datos de inventario todavía.</div>';
    const celda = (label, v) => `<div class="campo"><label>${esc(label)}</label>
      <div class="campo-fijo" style="font-size:16px;font-weight:700">${cantOrRaya(v)}</div></div>`;
    return `<div class="campos" style="margin-bottom:6px">
      ${celda('Total', inv.total)}
      ${celda('Vendido', inv.sold)}
      ${celda('Merma', inv.waste)}
      ${celda('Devuelto a proveedor', inv.rts)}
      ${celda('On-hand', inv.on_hand)}
      ${celda('Disponible (ATS)', inv.ats)}
    </div>`;
  }

  function formMovLote() {
    return `<div class="form-erp" style="margin:8px 0 14px">
      <div class="campos">
        <div class="campo"><label>Tipo <span class="req">*</span></label>
          <select id="ltMovTipo">
            <option value="merma">Merma</option>
            <option value="rts">Devolución al proveedor</option>
          </select></div>
        <div class="campo"><label>Cajas <span class="req">*</span></label>
          <input id="ltMovCajas" class="mono" type="number" step="1" min="1" placeholder="0"></div>
        <div class="campo"><label>Fecha</label><input id="ltMovFecha" type="date" value="${hoyLocalISO()}"></div>
        <div class="campo ancho"><label>Motivo <span class="req">*</span></label>
          <input id="ltMovMotivo" type="text" maxlength="160" placeholder="Obligatorio"></div>
        <div class="campo ancho"><label>Nota</label><input id="ltMovNota" type="text" maxlength="120" placeholder="Opcional"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini gris" id="ltMovGuardar">Registrar movimiento</button>
      </div>
      <div class="aviso" id="ltMovAviso"></div>
    </div>`;
  }

  function tablaMovimientos(movs, editable) {
    const filas = movs.length ? movs.map(m => `<tr>
        <td>${chipMov(m.tipo)}</td>
        <td class="num">${m.cajas == null ? '—' : esc(m.cajas)}</td>
        <td>${fecha4(m.fecha)}</td>
        <td>${esc(m.motivo || '—')}</td>
        <td>${esc(m.nota || '—')}</td>
        ${editable ? `<td><button class="btn-cap" data-anular-mov="${esc(m.id)}" title="Anular movimiento">✕</button></td>` : ''}
      </tr>`).join('')
      : `<tr><td colspan="${editable ? 6 : 5}" style="color:var(--i2)">Sin movimientos registrados.</td></tr>`;
    return `<div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Tipo</th><th class="num">Cajas</th><th>Fecha</th><th>Motivo</th><th>Nota</th>${editable ? '<th></th>' : ''}</tr></thead>
        <tbody>${filas}</tbody>
      </table></div>`;
  }

  function cuerpoFicha(lote, items, ventas, cadena, inv, movs, activo, puedeCap, puedeEd) {
    return `<div class="form-erp oc-editor">
      <div class="campos">
        <div class="campo"><label>Folio</label><div class="campo-fijo">${esc(lote.folio)}</div></div>
        <div class="campo"><label>Proveedor</label><div class="campo-fijo">${esc(lote.proveedor || '—')}</div></div>
        <div class="campo"><label>Cajas</label><div class="campo-fijo">${lote.cajas == null ? '—' : esc(lote.cajas)}</div></div>
        <div class="campo"><label>Pallets</label><div class="campo-fijo">${lote.pallets == null ? '—' : esc(lote.pallets)}</div></div>
        <div class="campo"><label>Fecha</label><div class="campo-fijo">${fecha4(lote.fecha)}</div></div>
        <div class="campo"><label>P.O. proveedor</label><div class="campo-fijo">${esc(lote.po_proveedor || '—')}</div></div>
        <div class="campo"><label>Embarque puente</label><div class="campo-fijo">${esc(lote.carga_folio || '—')}</div></div>
        <div class="campo"><label>Costo total${infoNota(NOTA_COSTO)}</label><div class="campo-fijo">${lote.costo_total == null ? '—' : usd(lote.costo_total)}</div></div>
        <div class="campo ancho"><label>Nota</label><div class="campo-fijo">${esc(lote.nota || '—')}</div></div>
      </div>

      <div class="seccion-head"><h4>Productos</h4>${activo && puedeCap ? '<button class="btn-mini gris" id="ltAgregarItem">Agregar item</button>' : ''}</div>
      <div id="ltItemForm"></div>
      ${tablaItems(items)}

      <div class="seccion-head"><h4>Reparto a ventas</h4>${activo && puedeCap ? '<button class="btn-mini gris" id="ltAsignar">Asignar a venta</button>' : ''}</div>
      <div class="campo" style="max-width:260px"><label>Cajas disponibles</label>
        <div class="campo-fijo" style="font-size:16px;font-weight:700">${lote.cajas_disponibles == null ? '—' : esc(lote.cajas_disponibles)}</div></div>
      <div id="ltAsigForm"></div>
      ${tablaVentas(ventas, activo && puedeEd)}

      <div class="seccion-head"><h4>Inventario del lote</h4></div>
      ${bloqueInventario(inv)}
      ${activo && puedeCap ? formMovLote() : ''}
      ${tablaMovimientos(movs, activo && puedeEd)}

      ${tablaCadena(cadena)}

      ${activo && puedeEd ? `<div class="zona-peligro">
        <button class="btn-mini peligro" id="ltAnular">Anular lote</button>
        <div class="nota">El backend rechaza la anulación si el lote todavía tiene ventas repartidas.</div>
      </div>` : ''}
      ${lote.anulado ? `<div class="leyenda"><b>Lote anulado.</b> Motivo: ${esc(lote.anulado_motivo || '—')}</div>` : ''}
      <div class="aviso" id="ltEdAviso"></div>
    </div>`;
  }

  function avisoEd(tipo, html) {
    const el = document.getElementById('ltEdAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  /* ---------- Agregar item ---------- */

  let comboProductoItem = null, productosCat = [];

  async function abrirAgregarItem() {
    const cont = document.getElementById('ltItemForm');
    if (!cont) return;
    if (cont.dataset.abierto === '1') { cont.dataset.abierto = ''; cont.innerHTML = ''; return; }
    cont.dataset.abierto = '1';
    cont.innerHTML = '<div class="skel">Cargando catálogo de productos…</div>';
    try {
      productosCat = await q('v_catalogo_productos', '&order=nombre.asc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudo leer el catálogo de productos: ${esc(e.message)}</div>`;
      return;
    }
    cont.innerHTML = `<div class="form-erp" style="margin:8px 0">
      <div class="campos">
        <div class="campo ancho"><label>Producto <span class="req">*</span></label><div id="ltItemProd"></div></div>
        <div class="campo"><label>Cajas <span class="req">*</span></label>
          <input id="ltItemCajas" class="mono" type="number" step="1" min="1" placeholder="0"></div>
        <div class="campo ancho"><label>Nota</label><input id="ltItemNota" type="text" maxlength="120" placeholder="Opcional"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="ltItemGuardar">Agregar</button>
        <button class="btn-mini gris" id="ltItemCancelar">Cerrar</button>
      </div>
      <div class="aviso" id="ltItemAviso"></div>
    </div>`;

    comboProductoItem = ERP.crearCombo({
      contenedor: document.getElementById('ltItemProd'),
      items: productosCat.map(p => ({ id: p.id, nombre: p.nombre, alias: p.alias || [] })),
      placeholder: 'Busca un producto…', permitirNuevo: false
    });

    document.getElementById('ltItemCancelar').addEventListener('click', () => { cont.dataset.abierto = ''; cont.innerHTML = ''; });
    document.getElementById('ltItemGuardar').addEventListener('click', agregarItem);
  }

  function avisoItem(tipo, html) {
    const el = document.getElementById('ltItemAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function agregarItem() {
    const productoId = comboProductoItem && comboProductoItem.valorId();
    if (!productoId) { avisoItem('err', 'Elige un producto de la lista.'); return; }
    const cajas = numOrNull((document.getElementById('ltItemCajas') || {}).value);
    if (cajas == null || cajas <= 0 || !Number.isInteger(cajas)) { avisoItem('err', 'Las cajas deben ser un entero mayor a cero.'); return; }
    const nota = ((document.getElementById('ltItemNota') || {}).value || '').trim() || null;

    const btn = document.getElementById('ltItemGuardar');
    btn.disabled = true;
    avisoItem('warn', 'Agregando producto…');
    try {
      const data = await rpc('fn_agregar_item_lote', {
        p_lote_folio: loteActual.folio, p_producto_id: productoId, p_cajas: cajas, p_nota: nota
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      const rest = r.cajas_lote_restantes;
      ERP.toast('ok', `Producto agregado (${esc(cajas)} cajas)${rest == null ? '' : ` · quedan ${esc(rest)} cajas sin repartir en el lote`}.`);
      verLote(loteActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoItem('err', `El ERP rechazó el producto: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ---------- Asignar / desasignar venta ---------- */

  async function abrirAsignarVenta() {
    const cont = document.getElementById('ltAsigForm');
    if (!cont) return;
    if (cont.dataset.abierto === '1') { cont.dataset.abierto = ''; cont.innerHTML = ''; return; }
    cont.dataset.abierto = '1';
    cont.innerHTML = '<div class="skel">Cargando órdenes de venta…</div>';
    try {
      const sos = await q('v_sales_orders');
      sosDisp = (sos || []).filter(s => !s.anulado && s.estado !== 'Cerrada' && s.estado !== 'Cancelada');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer las órdenes de venta: ${esc(e.message)}</div>`;
      return;
    }
    cont.innerHTML = `<div class="form-erp" style="margin:8px 0">
      <div class="campos">
        <div class="campo ancho"><label>Orden de venta <span class="req">*</span></label><div id="ltSOPick"></div>
          <div class="alias-ayuda" id="ltSOHint">Elige una orden de venta (Borrador o Confirmada).</div></div>
        <div class="campo"><label>Cajas a asignar <span class="req">*</span></label>
          <input id="ltAsigCajas" class="mono" type="number" step="1" min="1" placeholder="0"></div>
        <div class="campo"><label>Pallets (opcional)</label>
          <input id="ltAsigPallets" class="mono" type="number" step="1" min="0" placeholder="—"></div>
        <div class="campo"><label>Precio por caja (USD, opcional)</label>
          <input id="ltAsigPrecio" class="mono" type="number" step="0.01" min="0" placeholder="—"></div>
        <div class="campo ancho"><label>Nota</label><input id="ltAsigNota" type="text" maxlength="120" placeholder="Opcional"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="ltAsigGuardar">Asignar</button>
        <button class="btn-mini gris" id="ltAsigCancelar">Cerrar</button>
      </div>
      <div class="aviso" id="ltAsigAviso"></div>
    </div>`;

    comboSOAsig = ERP.crearCombo({
      contenedor: document.getElementById('ltSOPick'),
      items: sosDisp.map(s => ({
        id: s.folio,
        nombre: `${s.folio}${s.cliente ? ' · ' + s.cliente : ''}${s.customer_po ? ' · ' + s.customer_po : ''}`,
        alias: [s.cliente, s.customer_po, s.folio].filter(Boolean)
      })),
      placeholder: 'Folio, cliente o PO…', permitirNuevo: false,
      alCambiar: sel => {
        const hint = document.getElementById('ltSOHint');
        if (hint) hint.textContent = sel ? `Estado actual: ${(sosDisp.find(x => x.folio === sel.id) || {}).estado || '—'}.` : 'Elige una orden de venta (Borrador o Confirmada).';
      }
    });

    document.getElementById('ltAsigCancelar').addEventListener('click', () => { cont.dataset.abierto = ''; cont.innerHTML = ''; });
    document.getElementById('ltAsigGuardar').addEventListener('click', asignarVenta);
  }

  function avisoAsig(tipo, html) {
    const el = document.getElementById('ltAsigAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function asignarVenta() {
    const soFolio = comboSOAsig && comboSOAsig.valorId();
    if (!soFolio) { avisoAsig('err', 'Elige una orden de venta de la lista.'); return; }
    const cajas = numOrNull((document.getElementById('ltAsigCajas') || {}).value);
    if (cajas == null || cajas <= 0 || !Number.isInteger(cajas)) { avisoAsig('err', 'Las cajas a asignar deben ser un entero mayor a cero.'); return; }
    const pallets = numOrNull((document.getElementById('ltAsigPallets') || {}).value);
    const precioCaja = numOrNull((document.getElementById('ltAsigPrecio') || {}).value);
    const nota = ((document.getElementById('ltAsigNota') || {}).value || '').trim() || null;

    const btn = document.getElementById('ltAsigGuardar');
    btn.disabled = true;
    avisoAsig('warn', 'Asignando venta…');
    try {
      const data = await rpc('fn_asignar_venta_lote', {
        p_lote_folio: loteActual.folio, p_so_folio: soFolio,
        p_cajas_asignadas: cajas, p_precio_caja: precioCaja, p_pallets_asignados: pallets, p_nota: nota
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      const rest = r.cajas_restantes_lote;
      ERP.toast('ok', `Orden de venta <b>${esc(soFolio)}</b> asignada (${esc(cajas)} cajas)${rest == null ? '' : ` · quedan ${esc(rest)} disponibles en el lote`}.`);
      verLote(loteActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoAsig('err', `El ERP rechazó la asignación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function desasignar(id) {
    // Multi-tramche (D-66): un mismo SO puede tener varios renglones a distinto precio en el
    // mismo lote — desasignar es SIEMPRE por el id del renglón (v_lote_ventas.id), nunca por
    // (lote,SO), o se podría borrar el renglón equivocado.
    if (!window.confirm('¿Quitar este renglón de reparto del lote?')) return;
    try {
      await rpc('fn_desasignar_venta_lote', { p_id: Number(id) });
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Renglón de reparto quitado del lote.');
      verLote(loteActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      avisoEd('err', `No se pudo quitar el renglón: ${esc(e.message)}`);
    }
  }

  /* ---------- Anular ---------- */

  async function anular() {
    const motivo = window.prompt('Motivo de la anulación (OBLIGATORIO, queda registrado):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para anular.'); return; }
    const btn = document.getElementById('ltAnular');
    if (btn) btn.disabled = true;
    avisoEd('warn', 'Anulando lote…');
    try {
      await rpc('fn_anular_lote', { p_folio: loteActual.folio, p_motivo: motivo.trim() });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Lote ${esc(loteActual.folio)} anulado.`);
      verLote(loteActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { if (btn) btn.disabled = false; return; }
      avisoEd('err', `No se pudo anular el lote: ${esc(e.message)}`);
      if (btn) btn.disabled = false;
    }
  }

  /* ---------- Inventario del lote (físico: merma / devolución al proveedor) ---------- */

  function avisoMov(tipo, html) {
    const el = document.getElementById('ltMovAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function registrarMovLote() {
    const tipo = (document.getElementById('ltMovTipo') || {}).value;
    if (tipo !== 'merma' && tipo !== 'rts') { avisoMov('err', 'Elige un tipo de movimiento.'); return; }
    const cajas = numOrNull((document.getElementById('ltMovCajas') || {}).value);
    if (cajas == null || cajas <= 0 || !Number.isInteger(cajas)) { avisoMov('err', 'Las cajas deben ser un entero mayor a cero.'); return; }
    const motivo = ((document.getElementById('ltMovMotivo') || {}).value || '').trim();
    if (!motivo) { avisoMov('err', 'El motivo es obligatorio.'); return; }
    const fechaVal = (document.getElementById('ltMovFecha') || {}).value || null;
    const nota = ((document.getElementById('ltMovNota') || {}).value || '').trim() || null;

    const btn = document.getElementById('ltMovGuardar');
    btn.disabled = true;
    avisoMov('warn', 'Registrando movimiento…');
    try {
      const data = await rpc('fn_registrar_mov_lote', {
        p_lote_folio: loteActual.folio, p_tipo: tipo, p_cajas: cajas, p_motivo: motivo,
        p_fecha: fechaVal, p_nota: nota
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      const onHand = r.on_hand;
      ERP.toast('ok', `Movimiento de ${esc(TEXTO_MOV[tipo] || tipo).toLowerCase()} registrado (${esc(cajas)} cajas)${onHand == null ? '' : ` · on-hand: ${esc(onHand)}`}.`);
      verLote(loteActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoMov('err', `El ERP rechazó el movimiento: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function anularMovLote(id) {
    const motivo = window.prompt('Motivo de la anulación del movimiento (OBLIGATORIO, queda registrado):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para anular el movimiento.'); return; }
    try {
      await rpc('fn_anular_mov_lote', { p_id: Number(id), p_motivo: motivo.trim() });
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Movimiento anulado.');
      verLote(loteActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      avisoEd('err', `No se pudo anular el movimiento: ${esc(e.message)}`);
    }
  }

  /* ================= Integración en ficha/expediente de embarque ================= */

  async function montarLoteCarga(contenedor, folio) {
    if (!contenedor) return;
    contenedor.innerHTML = `<div class="seccion-head"><h4>Lote</h4></div>
      <div id="loteCargaLista"><div class="skel">Cargando…</div></div>`;
    const lista = document.getElementById('loteCargaLista');
    try {
      const ls = await q('v_lotes', `&carga_folio=${ERP.eq(folio)}`);
      lista.innerHTML = (ls && ls.length)
        ? `<div class="tabla-wrap"><table>
            <thead><tr><th>Lote</th><th>Proveedor</th><th class="num">Cajas</th><th class="num">Costo total</th><th>Estado</th></tr></thead>
            <tbody>${ls.map(l => `<tr class="clic" data-lote="${esc(l.folio)}">
              <td class="mono"><span class="enlace">${esc(l.folio)}</span></td>
              <td>${esc(l.proveedor || '—')}</td>
              <td class="num">${l.cajas == null ? '—' : esc(l.cajas)}</td>
              <td class="num">${l.costo_total == null ? '—' : usd(l.costo_total)}</td>
              <td>${chipLote(l.anulado)}</td></tr>`).join('')}</tbody>
          </table></div>`
        : '<div class="vacio" style="padding:10px 0">Este embarque no tiene un lote espejo todavía.</div>';
      lista.querySelectorAll('tr.clic[data-lote]').forEach(tr =>
        tr.addEventListener('click', () => { ERP.ir('lotes'); setTimeout(() => verLote(tr.dataset.lote), 60); }));
    } catch (e) {
      lista.innerHTML = `<div class="errbox">No se pudo leer el lote: ${esc(e.message)}</div>`;
    }
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('lotes', {
    titulo: 'Lotes',
    descripcion: 'Fase C.2 — materia prima por proveedor, repartida entre productos y órdenes de venta',
    render
  });

  ERP.verLote = verLote;
  ERP.nuevoLote = nuevoLote;
  ERP.montarLoteCarga = montarLoteCarga;
})();
