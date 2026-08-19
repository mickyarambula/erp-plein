/* Módulo Inventario (ruta 'o1-inventario') — CAMINO C · Fase O2a/O2b.
   Recepción de inventario (lotes) contra el stack Camino C (op.lots), STANDALONE — un lote NO
   está ligado a ninguna operación al recibirlo; se liga a una línea de Sales Order al asignarlo
   (ver "Asignar" en el tablero de la ficha de Sales Order, modulo-o1-so.js, que llama
   fn_op_alloc_crear). Realineado a nivel SKU (D-1xx, ago 2026 — mismo picker que O1 CPO/SO):
     - op.lots (recibir aquí)               → a nivel SKU (cat.skus), sin operacion_id.
     - op.inventory_allocations→op.so_lineas → depende de que existan Sales Orders Camino C (O1).
   O2b (D-1xx, ago 2026): costo por lote, opcional al recibir (ej. consignación: se sabe después) o
   agregado/editado después con "Costear". El backend siempre guarda costo UNITARIO — si el usuario
   captura el TOTAL del lote, el frontend lo divide entre la cantidad antes de mandarlo.

   SOLO FRONTEND. Lee por vistas en public, escribe por RPCs SECURITY DEFINER (op cerrado fuera del API).
   Vistas:
     v_op_inventario (lot_id, folio, sku_id, sku, producto_id, producto, location_id, location_codigo,
       location_nombre, uom, estado, on_hand, reservado, disponible, proveedor_id, proveedor, fecha,
       costo_unitario, costo_moneda, valor_lote, valor_disponible) — costo_unitario NULL = "sin
       costear" (dato faltante, NUNCA se muestra como $0, que sería costo real de cero).
   Catálogos (vistas ya vivas, reusadas del resto del ERP/O1):
     v_catc_contrapartes (id, nombre, alias, es_proveedor, ...) — picker de proveedor, mismo patrón que O1.
     Picker de SKU: ERP.crearPickerSku (fn_cat_sugerir_sku), mismo componente que las líneas de O1-SO.
   RPCs (capacidad 'capturar'):
     fn_op_location_alta(p_codigo, p_nombre) -> jsonb
     fn_op_lot_recibir(p_sku_id, p_location_id, p_on_hand, p_uom='CAJA', p_proveedor_id=NULL,
       p_origen_ref=NULL, p_fecha=NULL, p_costo_unitario=NULL, p_costo_moneda='USD') ->
       { lot_id, folio, on_hand, valor_lote }   (folio formato LOT-26-001)
     fn_op_lot_set_costo(p_lot_id, p_costo_unitario, p_costo_moneda) -> { ok, lot_id,
       costo_unitario, valor_lote } — pone o corrige el costo de un lote ya recibido.
     fn_op_lot_eliminar(p_lot_id) -> { ok, lote_eliminado, lineas_compra_reabiertas } (D-192,
       pedido por Miguel para poder limpiar pruebas/errores). Destructivo — pide confirm() antes.
       El backend BLOQUEA con mensaje legible si el lote tiene inventario apartado para una venta
       ("tiene X caja(s) apartada(s)... libera la asignación primero") — se muestra tal cual, no es
       un error genérico. Si el lote nació de una línea de compra (O3a), esa línea vuelve sola a
       quedar pendiente de recibir (lineas_compra_reabiertas) — el backend ya lo maneja, el
       frontend solo recarga.
   NOTA (sin vista dedicada de ubicaciones todavía): el picker de ubicación se arma a partir de
   las ubicaciones que YA aparecen en v_op_inventario (dedupe en frontend) + "+ Nueva ubicación"
   inline. Con el inventario en 0 (arranque), el picker empieza vacío — se resuelve solo en cuanto
   exista al menos un lote por ubicación. Limitación conocida, anotada en REPORTE-FRONTEND.md.
   Expone ERP.o1AbrirRecibirInventario(skuPrefill) para saltar aquí desde otro módulo (ej. "Asignar
   a línea" en el tablero de Sales Orders cuando no hay lote disponible) — skuPrefill es
   { sku_id, etiqueta } o null. */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num, fecha } = ERP;

  const actor = () => (ERP.perfil && ERP.perfil.socio_codigo) || null;
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  /* ================= Lista ================= */

  let lotes = [];
  let fTexto = '';

  function ubicacionesDeInventario() {
    const mapa = new Map();
    lotes.forEach(l => {
      if (l.location_id != null && !mapa.has(l.location_id)) {
        mapa.set(l.location_id, { id: l.location_id, nombre: [l.location_codigo, l.location_nombre].filter(Boolean).join(' — ') || `Ubicación ${l.location_id}` });
      }
    });
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  function filtrados() {
    const t = ERP.norm(fTexto);
    if (!t) return lotes;
    return lotes.filter(l => [l.folio, l.sku, l.producto, l.location_codigo, l.location_nombre].some(v => ERP.norm(v).includes(t)));
  }

  function pintarKpis() {
    const totalLotes = lotes.length;
    const dispTotal = lotes.reduce((s, l) => s + num(l.disponible), 0);
    const nUbicaciones = ubicacionesDeInventario().length;
    const el = document.getElementById('invKpis');
    if (!el) return;
    el.innerHTML = `
      <div class="kpi"><div class="k">Lotes</div><div class="v ink">${totalLotes}</div></div>
      <div class="kpi"><div class="k">Disponible total</div><div class="v">${ERP.fmt0(dispTotal)}</div></div>
      <div class="kpi"><div class="k">Ubicaciones</div><div class="v ink">${nUbicaciones}</div></div>`;
  }

  function pintarTabla() {
    const cont = document.getElementById('invTabla');
    if (!cont) return;   // el usuario ya navegó a otro módulo — nada que pintar (mismo guard que pintarKpis)
    const conteo = document.getElementById('invConteo');
    const rows = filtrados();
    if (conteo) conteo.textContent = `${rows.length} de ${lotes.length} lotes`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ningún lote coincide con el filtro.</div>'; return; }

    const puedeCap = ERP.puede('capturar');
    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr><th>Lote</th><th>SKU</th><th>Ubicación</th><th>UOM</th><th>Estado</th>
        <th class="num">On hand</th><th class="num">Reservado</th><th class="num">Disponible</th>
        <th class="num">Costo unit.</th><th class="num">Valor lote</th><th class="num">Valor disp.</th>
        <th>Proveedor</th><th>Fecha</th><th></th></tr></thead>
      <tbody>${rows.map(l => `<tr>
        <td class="mono">${esc(l.folio || '—')}</td>
        <td class="ent">${esc(l.sku || l.producto || '—')}</td>
        <td>${esc([l.location_codigo, l.location_nombre].filter(Boolean).join(' — ') || '—')}</td>
        <td class="mono">${esc(l.uom || '—')}</td>
        <td><span class="pill gris">${esc(l.estado || '—')}</span></td>
        <td class="num">${esc(ERP.fmt0(l.on_hand))}</td>
        <td class="num">${esc(ERP.fmt0(l.reservado))}</td>
        <td class="num" style="font-weight:600">${esc(ERP.fmt0(l.disponible))}</td>
        <td class="num">${dinero(l.costo_unitario, l.costo_moneda)}</td>
        <td class="num">${dinero(l.valor_lote, l.costo_moneda)}</td>
        <td class="num">${dinero(l.valor_disponible, l.costo_moneda)}</td>
        <td>${esc(l.proveedor || '—')}</td>
        <td>${esc(fecha(l.fecha))}</td>
        <td>${puedeCap ? `<button class="btn-mini gris" data-costear="${esc(l.lot_id)}">${l.costo_unitario != null ? 'Editar costo' : 'Costear'}</button> <button class="btn-mini gris" data-eliminar="${esc(l.lot_id)}">Eliminar</button>` : ''}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('[data-costear]').forEach(b => b.addEventListener('click', () => {
      const lot = lotes.find(x => String(x.lot_id) === b.dataset.costear);
      if (lot) abrirCostearLote(lot);
    }));
    cont.querySelectorAll('[data-eliminar]').forEach(b => b.addEventListener('click', () => {
      const lot = lotes.find(x => String(x.lot_id) === b.dataset.eliminar);
      if (lot) eliminarLote(lot);
    }));
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    let filas;
    try {
      filas = await q('v_op_inventario', '&order=fecha.desc');
    } catch (e) {
      // Si el usuario ya navegó a otro módulo mientras esto cargaba, `cont` sigue siendo el nodo
      // <div id="modContenido"> de ANTES — ya no está en el documento (el router creó uno nuevo al
      // despachar la siguiente ruta). Escribir en él es inofensivo pero inútil; lo importante es
      // NO seguir de largo a pintarKpis()/pintarTabla(), que buscan por id en el documento VIVO y
      // truenan con "Cannot set properties of null" si el módulo ya no está montado.
      if (document.body.contains(cont)) cont.innerHTML = `<div class="errbox">No se pudo leer el inventario: ${esc(e.message)}</div>`;
      return;
    }
    if (!document.body.contains(cont)) return;   // navegó fuera mientras el fetch estaba en vuelo
    lotes = filas || [];
    fTexto = '';

    cont.innerHTML = `<div class="pantalla-o1-inventario">
      <div class="kpistrip" id="invKpis"></div>
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="invRecibir">Recibir inventario</button>' : ''}
        <input class="busca" id="invBuscar" type="search" placeholder="Buscar lote, producto o ubicación…" style="flex:1;min-width:180px">
        <span class="conteo" id="invConteo"></span>
      </div>
      <div class="leyenda-o1">Un lote se recibe aquí SIN ligar a ninguna venta; se asigna a una línea desde la ficha de la <b>Sales Order</b> (tablero → “Asignar”).</div>
      <div id="invTabla"></div>
    </div>`;

    pintarKpis();
    pintarTabla();
    const bRecibir = document.getElementById('invRecibir');
    if (bRecibir) bRecibir.addEventListener('click', () => abrirRecibir(null));
    document.getElementById('invBuscar').addEventListener('input', e => { fTexto = e.target.value; pintarTabla(); });
  }

  async function recargar() {
    ERP.limpiarCache();
    try { lotes = (await q('v_op_inventario', '&order=fecha.desc')) || []; } catch (_) { /* la pantalla ya muestra su propio error si aplica */ }
  }

  /* ================= Recibir inventario ================= */

  let pickerSkuInv = null, comboUbicacionInv = null, comboProveedorInv = null;
  let proveedoresCat = [];
  let ubicacionesEnMemoria = [];   // dedupe de v_op_inventario + las que se creen inline en esta sesión

  function avisoInv(tipo, html) {
    const el = document.getElementById('invNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  // skuPrefill: { sku_id, etiqueta } | null — viene de "Asignar" en el tablero del SO cuando no
  // hay lote disponible de ese SKU (ver modulo-o1-so.js → abrirAsignarLote).
  async function abrirRecibir(skuPrefill) {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Recibir inventario', 'Crea un lote nuevo (sin ligar a ninguna venta todavía)', '<div class="skel">Cargando catálogos…</div>');
    try {
      const [provs, inv] = await Promise.all([
        q('v_catc_contrapartes', '&es_proveedor=eq.true&order=nombre.asc'),
        lotes.length ? Promise.resolve(lotes) : q('v_op_inventario', '&order=fecha.desc').catch(() => [])
      ]);
      proveedoresCat = provs || [];
      lotes = inv || lotes;
    } catch (e) {
      ERP.abrirPanel('Recibir inventario', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }
    ubicacionesEnMemoria = ubicacionesDeInventario();

    ERP.abrirPanel('Recibir inventario', 'Crea un lote nuevo (sin ligar a ninguna venta todavía)', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>SKU <span class="req">*</span></label><div id="invSku"></div></div>
          <div class="campo ancho">
            <label>Ubicación <span class="req">*</span></label>
            <div id="invUbicacion"></div>
            <div class="ia-leer-wrap">
              <button type="button" class="btn-mini gris" id="invNuevaUbicacion"><i class="ti ti-plus"></i> Nueva ubicación</button>
              <span class="alias-ayuda" id="invUbicacionAyuda">${ubicacionesEnMemoria.length ? '' : 'Todavía no hay ubicaciones — crea la primera.'}</span>
            </div>
            <div id="invUbicacionForm" style="display:none;margin-top:8px" class="campo-fijo">
              <div class="campos">
                <div class="campo"><label>Código</label><input id="invUbCodigo" type="text" maxlength="20" placeholder="Ej. NGL-01"></div>
                <div class="campo"><label>Nombre</label><input id="invUbNombre" type="text" maxlength="80" placeholder="Ej. Bodega Nogales"></div>
              </div>
              <div class="acciones" style="margin-top:8px">
                <button type="button" class="btn-mini gris" id="invUbCrear">Crear ubicación</button>
                <button type="button" class="btn-mini gris" id="invUbCancelar">Cancelar</button>
              </div>
            </div>
          </div>
          <div class="campo"><label>Cantidad <span class="req">*</span></label>
            <input id="invCantidad" class="mono" type="number" step="0.01" min="0" placeholder="0"></div>
          <div class="campo"><label>UOM</label>
            <input id="invUom" type="text" value="CAJA" style="width:100px"></div>
          <div class="campo ancho"><label>Proveedor de origen</label><div id="invProveedor"></div>
            <div class="alias-ayuda">Opcional — de quién viene este inventario.</div></div>
          <div class="campo"><label>Referencia de origen</label>
            <input id="invOrigenRef" type="text" maxlength="60" placeholder="Ej. OC-0123 (opcional)"></div>
          <div class="campo"><label>Fecha</label><input id="invFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo ancho"><label>Costo (opcional)</label>
            <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
              <select id="invCostoTipo" style="width:150px">
                <option value="unitario">Por caja (UOM)</option>
                <option value="total">Total del lote</option>
              </select>
              <input id="invCostoMonto" class="mono" type="number" step="0.01" min="0" placeholder="0.00" style="max-width:160px">
              <select id="invCostoMoneda" style="width:90px">
                <option value="USD" selected>USD</option>
                <option value="MXN">MXN</option>
              </select>
            </div>
            <div class="alias-ayuda">Déjalo vacío si el costo se sabrá después (típico en consignación) — se puede agregar luego con "Costear" desde la lista.</div></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="invGuardar">Recibir inventario</button>
          <button class="btn-mini gris" id="invCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="invNvAviso"></div>
      </div>`);

    pickerSkuInv = ERP.crearPickerSku({
      contenedor: document.getElementById('invSku'),
      placeholder: 'Busca SKU…',
      valorInicial: (skuPrefill && skuPrefill.sku_id != null) ? skuPrefill : null
    });
    montarComboUbicacion();
    comboProveedorInv = ERP.crearCombo({
      contenedor: document.getElementById('invProveedor'),
      items: proveedoresCat.map(p => ({ id: p.id, nombre: p.nombre, alias: p.alias || [] })),
      placeholder: 'Busca proveedor…', permitirNuevo: false
    });

    document.getElementById('invNuevaUbicacion').addEventListener('click', () => {
      document.getElementById('invUbicacionForm').style.display = '';
    });
    document.getElementById('invUbCancelar').addEventListener('click', () => {
      document.getElementById('invUbicacionForm').style.display = 'none';
    });
    document.getElementById('invUbCrear').addEventListener('click', crearUbicacionInline);
    document.getElementById('invCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('invGuardar').addEventListener('click', guardarRecibir);
  }

  function montarComboUbicacion(preseleccionar) {
    comboUbicacionInv = ERP.crearCombo({
      contenedor: document.getElementById('invUbicacion'),
      items: ubicacionesEnMemoria,
      placeholder: 'Busca ubicación…', permitirNuevo: false
    });
    if (preseleccionar) comboUbicacionInv.seleccionar(preseleccionar);
  }

  async function crearUbicacionInline() {
    const codigo = (document.getElementById('invUbCodigo').value || '').trim();
    const nombre = (document.getElementById('invUbNombre').value || '').trim();
    if (!codigo || !nombre) { avisoInv('err', 'Código y nombre son obligatorios para la nueva ubicación.'); return; }
    const btn = document.getElementById('invUbCrear');
    btn.disabled = true;
    avisoInv('warn', 'Creando ubicación…');
    try {
      const r = uno(await rpc('fn_op_location_alta', { p_codigo: codigo, p_nombre: nombre }));
      const id = r.location_id ?? r.id;
      if (id == null) throw new Error('El ERP no devolvió el id de la ubicación.');
      const nueva = { id, nombre: `${codigo} — ${nombre}` };
      ubicacionesEnMemoria = [...ubicacionesEnMemoria.filter(u => String(u.id) !== String(id)), nueva]
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      montarComboUbicacion(nueva);
      document.getElementById('invUbicacionForm').style.display = 'none';
      document.getElementById('invUbCodigo').value = ''; document.getElementById('invUbNombre').value = '';
      avisoInv('ok', `Ubicación <b>${esc(nueva.nombre)}</b> creada y seleccionada.`);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoInv('err', `No se pudo crear la ubicación: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  const uno = d => Array.isArray(d) ? (d[0] || {}) : (d || {});
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  // NULL = "sin costear" (dato faltante) — NUNCA se muestra como $0, que sería un costo real de
  // cero. Distinguir esto es intencional (Tarea 3).
  const dinero = (n, mon) => (n === null || n === undefined) ? '—' : `${ERP.usd(n)} ${esc(mon || 'USD')}`;

  async function guardarRecibir() {
    const sku_id = pickerSkuInv && pickerSkuInv.valorId();
    if (!sku_id) { avisoInv('err', 'Elige un SKU.'); return; }
    const location_id = comboUbicacionInv && comboUbicacionInv.valorId();
    if (!location_id) { avisoInv('err', 'Elige o crea una ubicación.'); return; }
    const v = id => (document.getElementById(id) || {}).value;
    const cantidad = numOrNull(v('invCantidad'));
    if (!(cantidad > 0)) { avisoInv('err', 'La cantidad debe ser mayor a cero.'); return; }

    // Costo opcional: "por caja" se manda tal cual; "total del lote" se divide entre la cantidad
    // porque el backend siempre guarda el costo UNITARIO. Vacío = null (válido — se costea después).
    const costoMonto = numOrNull(v('invCostoMonto'));
    const costoUnitario = (costoMonto != null && costoMonto > 0)
      ? (v('invCostoTipo') === 'total' ? costoMonto / cantidad : costoMonto)
      : null;

    const args = {
      p_sku_id: Number(sku_id),
      p_location_id: Number(location_id),
      p_on_hand: cantidad,
      p_uom: (v('invUom') || '').trim() || 'CAJA',
      p_proveedor_id: (() => { const id = comboProveedorInv && comboProveedorInv.valorId(); return id ? Number(id) : null; })(),
      p_origen_ref: (v('invOrigenRef') || '').trim() || null,
      p_fecha: v('invFecha') || null,
      p_costo_unitario: costoUnitario,
      p_costo_moneda: v('invCostoMoneda') || 'USD'
    };

    const btn = document.getElementById('invGuardar');
    btn.disabled = true;
    avisoInv('warn', 'Recibiendo inventario…');
    try {
      const r = uno(await rpc('fn_op_lot_recibir', args));
      const valorTxt = r.valor_lote != null ? ` · valor ${dinero(r.valor_lote, args.p_costo_moneda)}` : '';
      ERP.toast('ok', `Inventario recibido — lote <b>${esc(r.folio || '')}</b> (${esc(ERP.fmt0(r.on_hand))} ${esc((v('invUom') || '').trim() || 'CAJA')})${valorTxt}.`);
      ERP.marcarDatosSucios();
      await recargar();
      render(document.getElementById('modContenido'));
      ERP.cerrarPanel();
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoInv('err', `El ERP rechazó la recepción: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Costear / editar costo de un lote (O2b) ================= */
  // Para consignación el costo casi nunca se sabe al recibir — este panel lo agrega o corrige
  // después. Prellena si el lote ya tiene costo (fn_op_lot_set_costo también sirve para editar).

  function avisoCosteo(tipo, html) {
    const el = document.getElementById('costLoteAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  function abrirCostearLote(lot) {
    if (!ERP.puede('capturar')) return;
    ERP.cerrarPanel();
    const tieneCosto = lot.costo_unitario != null;
    ERP.abrirPanel(tieneCosto ? 'Editar costo del lote' : 'Costear lote', `${esc(lot.folio || '')} · ${esc(lot.sku || lot.producto || '')}`, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo"><label>Costo por ${esc(lot.uom || 'unidad')} <span class="req">*</span></label>
            <input id="costLoteMonto" class="mono" type="number" step="0.01" min="0" placeholder="0.00" value="${tieneCosto ? esc(lot.costo_unitario) : ''}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="costLoteMoneda">
              <option value="USD" ${lot.costo_moneda !== 'MXN' ? 'selected' : ''}>USD</option>
              <option value="MXN" ${lot.costo_moneda === 'MXN' ? 'selected' : ''}>MXN</option>
            </select></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="costLoteGuardar">Guardar costo</button>
          <button class="btn-mini gris" id="costLoteCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="costLoteAviso"></div>
      </div>`);
    document.getElementById('costLoteCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('costLoteGuardar').addEventListener('click', () => guardarCostoLote(lot.lot_id));
  }

  async function guardarCostoLote(lotId) {
    const v = id => (document.getElementById(id) || {}).value;
    const monto = numOrNull(v('costLoteMonto'));
    if (!(monto > 0)) { avisoCosteo('err', 'El costo debe ser mayor a cero.'); return; }
    const moneda = v('costLoteMoneda') || 'USD';

    const btn = document.getElementById('costLoteGuardar');
    btn.disabled = true;
    avisoCosteo('warn', 'Guardando…');
    try {
      const r = uno(await rpc('fn_op_lot_set_costo', { p_lot_id: Number(lotId), p_costo_unitario: monto, p_costo_moneda: moneda }));
      ERP.toast('ok', `Costo guardado — valor del lote: ${dinero(r.valor_lote, moneda)}.`);
      ERP.marcarDatosSucios();
      await recargar();
      render(document.getElementById('modContenido'));
      ERP.cerrarPanel();
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoCosteo('err', `El ERP rechazó el costo: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Eliminar lote (D-192) ================= */
  // Destructivo — confirm() explícito. Si el backend bloquea (inventario apartado para una venta)
  // o reabre una línea de compra, el mensaje/efecto ya viene resuelto del backend: se muestra tal
  // cual, no se reinterpreta aquí (mismo patrón que eliminarSPO/eliminarSO en los otros módulos).
  async function eliminarLote(lot) {
    if (!confirm(`¿Eliminar el lote ${lot.folio}? Esta acción no se puede deshacer.`)) return;
    try {
      const r = uno(await rpc('fn_op_lot_eliminar', { p_lot_id: Number(lot.lot_id) }));
      const reabiertas = r.lineas_compra_reabiertas;
      const notaReabierta = (Array.isArray(reabiertas) ? reabiertas.length > 0 : !!reabiertas)
        ? ' La línea de compra vuelve a quedar pendiente de recibir.' : '';
      ERP.toast('ok', `Lote <b>${esc(lot.folio || '')}</b> eliminado.${notaReabierta}`);
      ERP.marcarDatosSucios();
      await recargar();
      render(document.getElementById('modContenido'));
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) return;
      ERP.toast('err', esc(e.message), 9000);
    }
  }

  ERP.registrar('o1-inventario', {
    titulo: 'Inventario',
    descripcion: 'Camino C · O2a — recibir lotes (se asignan a una Sales Order desde su tablero)',
    render
  });

  ERP.o1AbrirRecibirInventario = abrirRecibir;
})();
