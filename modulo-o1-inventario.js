/* Módulo Inventario (ruta 'o1-inventario') — CAMINO C · Fase O2a.
   Recepción de inventario (lotes) contra el stack Camino C (op.lots), STANDALONE — un lote NO
   está ligado a ninguna operación al recibirlo; se liga a una línea de Sales Order al asignarlo
   (ver "Asignar" en el tablero de la ficha de Sales Order, modulo-o1-so.js, que llama
   fn_op_alloc_crear). Realineado a nivel SKU (D-1xx, ago 2026 — mismo picker que O1 CPO/SO):
     - op.lots (recibir aquí)               → a nivel SKU (cat.skus), sin operacion_id.
     - op.inventory_allocations→op.so_lineas → depende de que existan Sales Orders Camino C (O1).

   SOLO FRONTEND. Lee por vistas en public, escribe por RPCs SECURITY DEFINER (op cerrado fuera del API).
   Vistas:
     v_op_inventario (lot_id, folio, sku_id, sku, producto_id, producto, location_id, location_codigo,
       location_nombre, uom, estado, on_hand, reservado, disponible, proveedor_id, proveedor, fecha)
   Catálogos (vistas ya vivas, reusadas del resto del ERP/O1):
     v_catc_contrapartes (id, nombre, alias, es_proveedor, ...) — picker de proveedor, mismo patrón que O1.
     Picker de SKU: ERP.crearPickerSku (fn_cat_sugerir_sku), mismo componente que las líneas de O1-SO.
   RPCs (capacidad 'capturar'):
     fn_op_location_alta(p_codigo, p_nombre) -> jsonb
     fn_op_lot_recibir(p_sku_id, p_location_id, p_on_hand, p_uom='CAJA', p_proveedor_id=NULL,
       p_origen_ref=NULL, p_fecha=NULL) -> { lot_id, folio, on_hand }   (folio formato LOT-26-001)
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
    const conteo = document.getElementById('invConteo');
    const rows = filtrados();
    if (conteo) conteo.textContent = `${rows.length} de ${lotes.length} lotes`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ningún lote coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr><th>Lote</th><th>SKU</th><th>Ubicación</th><th>UOM</th><th>Estado</th>
        <th class="num">On hand</th><th class="num">Reservado</th><th class="num">Disponible</th>
        <th>Proveedor</th><th>Fecha</th></tr></thead>
      <tbody>${rows.map(l => `<tr>
        <td class="mono">${esc(l.folio || '—')}</td>
        <td class="ent">${esc(l.sku || l.producto || '—')}</td>
        <td>${esc([l.location_codigo, l.location_nombre].filter(Boolean).join(' — ') || '—')}</td>
        <td class="mono">${esc(l.uom || '—')}</td>
        <td><span class="pill gris">${esc(l.estado || '—')}</span></td>
        <td class="num">${esc(ERP.fmt0(l.on_hand))}</td>
        <td class="num">${esc(ERP.fmt0(l.reservado))}</td>
        <td class="num" style="font-weight:600">${esc(ERP.fmt0(l.disponible))}</td>
        <td>${esc(l.proveedor || '—')}</td>
        <td>${esc(fecha(l.fecha))}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    let filas;
    try {
      filas = await q('v_op_inventario', '&order=fecha.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudo leer el inventario: ${esc(e.message)}</div>`;
      return;
    }
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

  async function guardarRecibir() {
    const sku_id = pickerSkuInv && pickerSkuInv.valorId();
    if (!sku_id) { avisoInv('err', 'Elige un SKU.'); return; }
    const location_id = comboUbicacionInv && comboUbicacionInv.valorId();
    if (!location_id) { avisoInv('err', 'Elige o crea una ubicación.'); return; }
    const v = id => (document.getElementById(id) || {}).value;
    const cantidad = numOrNull(v('invCantidad'));
    if (!(cantidad > 0)) { avisoInv('err', 'La cantidad debe ser mayor a cero.'); return; }

    const args = {
      p_sku_id: Number(sku_id),
      p_location_id: Number(location_id),
      p_on_hand: cantidad,
      p_uom: (v('invUom') || '').trim() || 'CAJA',
      p_proveedor_id: (() => { const id = comboProveedorInv && comboProveedorInv.valorId(); return id ? Number(id) : null; })(),
      p_origen_ref: (v('invOrigenRef') || '').trim() || null,
      p_fecha: v('invFecha') || null
    };

    const btn = document.getElementById('invGuardar');
    btn.disabled = true;
    avisoInv('warn', 'Recibiendo inventario…');
    try {
      const r = uno(await rpc('fn_op_lot_recibir', args));
      ERP.toast('ok', `Inventario recibido — lote <b>${esc(r.folio || '')}</b> (${esc(ERP.fmt0(r.on_hand))} ${esc((v('invUom') || '').trim() || 'CAJA')}).`);
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

  ERP.registrar('o1-inventario', {
    titulo: 'Inventario',
    descripcion: 'Camino C · O2a — recibir lotes (se asignan a una Sales Order desde su tablero)',
    render
  });

  ERP.o1AbrirRecibirInventario = abrirRecibir;
})();
