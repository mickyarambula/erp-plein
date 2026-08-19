/* Módulo Compras / Supplier PO (ruta 'o3-compras') — CAMINO C · Fase O3a.
   Espejo invertido del Customer PO (O1): en vez de "el cliente nos manda un PO", aquí "nosotros le
   mandamos un PO al proveedor". Cada línea, al recibirse, hace NACER un lote de Inventario (O2) —
   ya no se captura suelto desde "Recibir inventario"; ese flujo sigue vivo para inventario que
   llega sin una compra formal detrás (ver modulo-o1-inventario.js).

   SOLO FRONTEND. Lee por vistas en public, escribe por RPCs SECURITY DEFINER (op cerrado fuera del API).
   Vistas:
     v_op_supplier_po (supplier_po_id, folio, proveedor, numero_proveedor, fecha, moneda, estado,
       so_folio, adjunto_ref, nota, num_lineas, total_costo, enviada_en, confirmada_en)
       — estado (O3b, D-194): Abierto → Enviada → Confirmada → Recibido parcial → Recibido (+ Cancelado).
       Los estados de RECEPCIÓN (parcial/recibido) los calcula el backend solo; los de gestión
       (Enviada/Confirmada/Cancelado) se fijan con fn_op_spo_set_estado. enviada_en/confirmada_en
       son timestamps que se muestran si existen.
     v_op_spo_lineas (linea_id, supplier_po_id, spo_folio, linea_num, sku_id, sku, cantidad, uom,
       costo_unitario, costo_moneda, costo_linea, recibido, pendiente, diferencia, tolerancia_pct,
       estado_recepcion, lot_id, lot_folio, recibida, so_linea_id, so_folio, auto_asigna).
       O3b (D-194): recibido/pendiente/diferencia/tolerancia_pct/estado_recepcion — una línea se
       recibe VARIAS veces (parcial y luego el resto). estado_recepcion = 'Pendiente'|'Parcial'|
       'Completo'|'Recibido de mas'. diferencia = recibido − pedido (≠0 = vigilar vs. la factura).
       so_linea_id/so_folio/auto_asigna (D-192): si la línea nació de una Sales Order, auto_asigna=
       true y recibirla asigna sola el lote a esa línea de venta (ver fn_op_spo_recibir_linea abajo).
   Catálogos (vistas ya vivas, reusadas del resto de O1/O2):
     v_catc_contrapartes (id, nombre, alias, es_proveedor, ...) — picker de proveedor.
     v_op_sales_orders — dropdown opcional para ligar la compra a una venta (trazabilidad).
     v_op_so_lineas (id, sales_order_id, so_folio, linea_num, sku_id, sku, cantidad, uom, ...) —
       líneas heredadas SOLO LECTURA al generar una compra desde una SO (D-192).
     Picker de SKU: ERP.crearPickerSku (fn_cat_sugerir_sku), mismo componente que O1-SO.
   RPCs (capacidad 'capturar'):
     fn_op_spo_alta(p_proveedor_id, p_lineas jsonb, p_numero_proveedor, p_fecha, p_moneda,
       p_sales_order_id, p_adjunto_ref, p_nota) -> { supplier_po_id, folio, lineas }
       p_lineas = [{sku_id, cantidad, uom, costo_unitario|null, costo_moneda, nota}]
       (costo_unitario null = consignación, se costea al recibir o después, igual que O2b)
     fn_op_spo_desde_so(p_sales_order_id, p_proveedor_id, p_costos jsonb, p_numero_proveedor,
       p_fecha, p_moneda, p_adjunto_ref, p_nota) -> { supplier_po_id, folio, lineas, desde_so }
       (D-192, "Comprar desde el SO" — botón en la ficha de la Sales Order, modulo-o1-so.js, vía
       ERP.o3AbrirSPODesdeSO(soId, soFolio)). SKU y cantidad se HEREDAN de las líneas de la SO —
       el usuario SOLO elige proveedor + costo unitario por línea; nunca re-elige SKU/cantidad,
       que era justo la causa de errores de recaptura (ej. vender Maradol y terminar comprando
       Formosa). p_costos = [{so_linea_id, costo_unitario|null, costo_moneda}] (costo puede ir
       null en consignación, igual que fn_op_spo_alta).
     fn_op_spo_set_estado(p_id, p_estado) — p_estado ∈ 'Abierto'|'Enviada'|'Confirmada'|'Cancelado'
       (O3b, D-194). Los estados de recepción NO se fijan por aquí (los calcula el sistema). Si la
       compra ya tiene mercancía recibida, el backend bloquea con mensaje legible (se muestra tal cual).
     fn_op_spo_recibir_linea(p_spo_linea_id, p_location_id, p_fecha, p_cantidad) -> { ok, lot_id,
       lot_folio, recibido_ahora, recibido_total, pedido, diferencia, estado_linea, auto_asignado }
       — nace/agrega el lote de Inventario (O2) DESDE esta línea. p_cantidad (O3b, D-194) = cuánto
       llegó REALMENTE; NULL = recibe todo lo pendiente (comportamiento previo). estado_linea =
       'Parcial'|'Completo'|'Recibido de mas' (caso real: pediste 226 y llegaron 200). El toast lo
       usa: si Parcial dice cuánto falta; si "Recibido de mas" lo marca claro. `auto_asignado`
       (D-192) = {allocation_id, pendiente_linea, disponible_lote_restante} si la línea venía ligada
       a una venta (auto_asigna=true) — el backend ya asignó el lote solo; null si no. El backend
       bloquea si se excede la tolerancia (mensaje legible, se muestra tal cual).
     fn_op_spo_eliminar(p_id) -> ok (el backend bloquea si ya hay líneas recibidas — mensaje
       legible, se muestra tal cual).
   O3c (D-196, "documentos y envíos reales" — reusa ERP.opDocumentos, ver modulo-op-documentos.js):
     v_op_spo_documento (supplier_po_id, folio, fecha, estado, moneda, nota, numero_proveedor,
       enviada_en, confirmada_en, so_folio, proveedor_id, proveedor, proveedor_razon_social,
       proveedor_direccion, proveedor_ciudad, proveedor_pais, proveedor_rfc, proveedor_email,
       proveedor_email_facturacion, proveedor_whatsapp, total, lineas jsonb
       [{linea, sku, qty, unidad, precio, moneda, total, nota}]) — todo lo necesario para armar el
       PDF de la orden de compra SIN pedir datos del proveedor a mano (ya están registrados).
     "Generar orden de compra": arma el PDF con ERP.opDocumentos.construirPdfOficial (mismo
       membrete/verde de marca que el PO oficial legacy — v_documento_po/exportar.js — que Miguel
       pidió reusar; aquí dibujado con jsPDF para producir un Blob real, no solo imprimirlo) y lo
       guarda con ERP.opDocumentos.subir(..., storagePath: 'oc/{folio}.pdf', categoria='Orden de
       compra') -> fn_op_doc_registrar(p_entidad='supplier_po', p_entidad_id=folio, ...).
     "Enviar al proveedor": correo (ERP.enviarPorCorreoDoc, mailto interino — el envío real por
       servicio queda para una 2ª vuelta, necesita dominio verificado) o WhatsApp (wa.me con URL
       firmada de 90 días — wa.me no adjunta archivos, solo texto). Ambos registran con
       ERP.opDocumentos.registrarEnvio -> fn_op_envio_registrar(p_canal='correo'|'whatsapp',
       p_estado='enviado') y AL TERMINAR marcan fn_op_spo_set_estado(p_id,'Enviada') — "Marcar
       enviada" ya no es un botón suelto, es consecuencia de haber enviado de verdad.
     Documentos (v_op_documentos) y Envíos (v_op_envios) en la ficha: componente genérico
       ERP.opDocumentos.montar()/montarEnvios() — el mismo que usará factura al cliente/liquidación
       más adelante, aquí solo con entidad='supplier_po', entidad_id=folio.
   NOTA proveedor picker: se usa ERP.crearCombo sobre v_catc_contrapartes&es_proveedor=eq.true —
   el MISMO patrón real que usa O1-CPO para el cliente (búsqueda cliente-side sobre la lista
   completa). fn_op_sugerir_contraparte NO se usa aquí a propósito: está documentada como RPC
   CERRADA (D-171 — sin GRANT a authenticated, solo invocable desde dentro de la Edge Function
   extraer-po). Llamarla directo desde el frontend tronaría por permisos.
   Adjunto: mismo patrón de O1-CPO (bucket cpo-adjuntos, subida real + ver por URL firmada).
   Ubicación al recibir: mismo patrón de "Recibir inventario" (dedupe de v_op_inventario +
   "+ Nueva ubicación" inline vía fn_op_location_alta).
   Expone ERP.o3AbrirSPO(id) y ERP.o3AbrirSPODesdeSO(soId, soFolio) para saltar aquí desde otro módulo. */

(function () {
  'use strict';
  const { q, rpc, esc, fecha } = ERP;

  const BUCKET_CPO = 'cpo-adjuntos';   // mismo bucket privado que O1-CPO (20 MB; pdf/png/jpeg/webp)

  const actor = () => (ERP.perfil && ERP.perfil.socio_codigo) || null;
  const uno = d => Array.isArray(d) ? (d[0] || {}) : (d || {});
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const mesActual = () => hoyISO().slice(0, 7);

  // Pastilla de estado de la compra (cabecera). O3b (D-194): Abierto → Enviada → Confirmada →
  // Recibido parcial → Recibido (+ Cancelado). Enviada/Confirmada = en curso (azul); recibido
  // completo = verde; parcial/abierto = ámbar (aún requiere acción); cancelado = rojo.
  function chipEstado(est) {
    const e = String(est || '').toLowerCase();
    const cls = e.includes('cancel') ? 'rojo'
      : e === 'recibido' ? 'verde'
      : e.includes('parcial') ? 'ambar'
      : (e === 'enviada' || e === 'confirmada') ? 'azul'
      : e === 'abierto' ? 'ambar'
      : 'gris';
    return `<span class="pill ${cls}">${esc(est || '—')}</span>`;
  }

  // Pastilla del estado de RECEPCIÓN de una línea (lo calcula el backend). Completo = verde;
  // Parcial = ámbar (falta mercancía); Recibido de más = rojo (vigilar vs. factura); Pendiente = gris.
  function chipRecepcion(est) {
    const e = String(est || '').toLowerCase();
    const cls = e === 'completo' ? 'verde'
      : e === 'parcial' ? 'ambar'
      : (e.includes('mas') || e.includes('más')) ? 'rojo'
      : 'gris';
    return `<span class="pill ${cls}">${esc(est || 'Pendiente')}</span>`;
  }

  /* ---- Adjunto (idéntico a O1-CPO, mismo bucket) ---- */
  function parseStorageRef(ref) {
    const r = String(ref || '').trim();
    if (!r.startsWith('storage:')) return null;
    const resto = r.slice('storage:'.length);
    const i = resto.indexOf('/');
    if (i < 1) return null;
    return { bucket: resto.slice(0, i), ruta: resto.slice(i + 1) };
  }
  function adjuntoHTML(ref) {
    const r = String(ref || '').trim();
    if (!r) return '<span class="i3">—</span>';
    const st = parseStorageRef(r);
    if (st) return `<button class="btn-mini gris ver-adjunto" data-bucket="${esc(st.bucket)}" data-ruta="${esc(st.ruta)}">Ver adjunto</button>`;
    if (/^https?:\/\//i.test(r)) return `<a class="enlace" href="${esc(r)}" target="_blank" rel="noopener">Ver adjunto</a>`;
    return `<span class="mono" title="${esc(r)}">${esc(r)}</span>`;
  }
  async function abrirAdjuntoFirmado(bucket, ruta, boton) {
    const txt = boton.textContent; boton.disabled = true; boton.textContent = 'Abriendo…';
    try {
      const { data, error } = await ERP.sb.storage.from(bucket).createSignedUrl(ruta, 3600);
      if (error) throw new Error(error.message);
      const a = document.createElement('a');
      a.href = data.signedUrl; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      ERP.toast('err', `No se pudo abrir el adjunto: ${esc(e.message)}`);
    }
    boton.disabled = false; boton.textContent = txt;
  }
  function cablearVerAdjunto(cont, dentroDeFila) {
    (cont || document).querySelectorAll('button.ver-adjunto').forEach(b => {
      if (b._verAdjWired) return; b._verAdjWired = true;
      b.addEventListener('click', e => {
        if (dentroDeFila) e.stopPropagation();
        abrirAdjuntoFirmado(b.dataset.bucket, b.dataset.ruta, b);
      });
    });
  }

  /* ================= Lista ================= */

  let spos = [];
  let fEstado = '', fTexto = '';

  function filtrados() {
    const t = ERP.norm(fTexto);
    return spos.filter(s => {
      if (fEstado && String(s.estado || '') !== fEstado) return false;
      if (!t) return true;
      return [s.folio, s.proveedor, s.numero_proveedor, s.so_folio].some(v => ERP.norm(v).includes(t));
    });
  }

  function pintarKpis() {
    const abiertas = spos.filter(s => String(s.estado || '').toLowerCase() === 'abierto').length;
    const recibidas = spos.filter(s => String(s.estado || '').toLowerCase() === 'recibido').length;
    const mes = mesActual();
    const delMes = spos.filter(s => String(s.fecha || '').slice(0, 7) === mes).length;
    const el = document.getElementById('spoKpis');
    if (!el) return;
    el.innerHTML = `
      <div class="kpi"><div class="k">Abiertas</div><div class="v">${abiertas}</div></div>
      <div class="kpi"><div class="k">Recibidas</div><div class="v ink">${recibidas}</div></div>
      <div class="kpi"><div class="k">Del mes</div><div class="v ink">${delMes}</div></div>`;
  }

  function pintarTabla() {
    const cont = document.getElementById('spoTabla');
    const conteo = document.getElementById('spoConteo');
    const rows = filtrados();
    if (conteo) conteo.textContent = `${rows.length} de ${spos.length} compras`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ninguna compra coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr><th>Folio</th><th>Proveedor</th><th>N° proveedor</th><th>Fecha</th><th>Moneda</th>
        <th>Estado</th><th class="num">Total costo</th><th>SO</th><th>Adjunto</th></tr></thead>
      <tbody>${rows.map(s => `<tr class="clic" data-id="${esc(s.supplier_po_id)}">
          <td class="mono"><span class="enlace">${esc(s.folio || '—')}</span></td>
          <td class="ent">${esc(s.proveedor || '—')}</td>
          <td class="mono">${esc(s.numero_proveedor || '—')}</td>
          <td>${esc(fecha(s.fecha))}</td>
          <td class="mono">${esc(s.moneda || '—')}</td>
          <td>${chipEstado(s.estado)}</td>
          <td class="num">${esc(ERP.usd(s.total_costo))}</td>
          <td class="mono">${esc(s.so_folio || '—')}</td>
          <td>${adjuntoHTML(s.adjunto_ref)}</td>
        </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-id]').forEach(tr =>
      tr.addEventListener('click', () => verSPO(Number(tr.dataset.id))));
    cablearVerAdjunto(cont, true);
    ERP.marcarTabla(cont);   // patrón tabla→tarjeta en móvil (D-193/Fase 2)
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    let filas;
    try {
      filas = await q('v_op_supplier_po', '&order=fecha.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer las compras: ${esc(e.message)}</div>`;
      return;
    }
    spos = filas || [];
    fEstado = ''; fTexto = '';

    cont.innerHTML = `<div class="pantalla-o3-compras">
      <div class="kpistrip" id="spoKpis"></div>
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="spoNuevo">Nueva compra</button>' : ''}
        <select class="busca" id="spoFEstado" style="max-width:170px">
          <option value="">Todos los estados</option>
          <option value="Abierto">Abierto</option>
          <option value="Recibido parcial">Recibido parcial</option>
          <option value="Recibido">Recibido</option>
          <option value="Cancelado">Cancelado</option>
        </select>
        <input class="busca" id="spoBuscar" type="search" placeholder="Buscar folio, proveedor, N° proveedor o SO…" style="flex:1;min-width:180px">
        <span class="conteo" id="spoConteo"></span>
      </div>
      <div id="spoTabla"></div>
    </div>`;

    pintarKpis();
    pintarTabla();

    const bNuevo = document.getElementById('spoNuevo');
    if (bNuevo) bNuevo.addEventListener('click', nuevaSPO);
    document.getElementById('spoFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    document.getElementById('spoBuscar').addEventListener('input', e => { fTexto = e.target.value; pintarTabla(); });
  }

  async function recargar() {
    ERP.limpiarCache();
    try { spos = (await q('v_op_supplier_po', '&order=fecha.desc')) || []; } catch (_) { /* la ficha muestra su propio error */ }
  }

  /* ================= Alta ================= */

  let proveedoresCat = [], sosCat = [], comboProveedor = null;
  let lineas = [];
  let adjuntoSubido = null;   // 'storage:cpo-adjuntos/<ruta>' si se subió un archivo en esta alta

  const nuevaLinea = () => ({ picker: null, sku_id: null, sku_etiqueta: '', cantidad: '', uom: 'CAJA', costo_unitario: '', costo_moneda: 'USD', nota: '' });

  function avisoNv(tipo, html) {
    const el = document.getElementById('spoNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function nuevaSPO() {
    if (!ERP.puede('capturar')) return;
    ERP.cerrarPanel();
    adjuntoSubido = null;
    ERP.abrirPanel('Nueva compra', 'Registra el PO que le mandamos al proveedor', '<div class="skel">Cargando catálogos…</div>');
    try {
      [proveedoresCat, sosCat] = await Promise.all([
        q('v_catc_contrapartes', '&es_proveedor=eq.true&order=nombre.asc'),
        q('v_op_sales_orders', '&order=created_at.desc').catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel('Nueva compra', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }
    lineas = [nuevaLinea()];

    ERP.abrirPanel('Nueva compra', 'Registra el PO que le mandamos al proveedor', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Proveedor <span class="req">*</span></label><div id="spoProveedor"></div>
            <div class="alias-ayuda">Contraparte marcada como proveedor en el Directorio.</div></div>
          <div class="campo"><label>N° de PO / referencia del proveedor</label>
            <input id="spoNumProveedor" type="text" maxlength="60" placeholder="Ej. EST-1001 (opcional)"></div>
          <div class="campo"><label>Fecha</label>
            <input id="spoFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="spoMoneda">${ERP.MONEDAS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
          <div class="campo ancho"><label>Ligar a una Sales Order (opcional)</label>
            <select id="spoSO"><option value="">— sin ligar —</option>${sosCat.map(s => `<option value="${esc(s.id)}">${esc(s.folio)} — ${esc(s.cliente || '')}</option>`).join('')}</select>
            <div class="alias-ayuda">Solo trazabilidad — puede quedar vacío.</div></div>
          <div class="campo ancho"><label>Adjunto (Estimate/Invoice del proveedor)</label>
            <input id="spoAdjunto" class="mono" type="text" placeholder="Pega una URL… o sube un archivo abajo">
            <div class="adjunto-sube">
              <label class="btn-file" for="spoArchivo"><i class="ti ti-upload"></i> o subir archivo (PDF/imagen)</label>
              <input id="spoArchivo" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" style="display:none">
              <span class="adjunto-estado" id="spoArchivoEstado"></span>
            </div>
            <div class="alias-ayuda">Pega la URL/ruta, <b>o</b> sube el archivo (máx 20 MB: PDF, PNG, JPG, WEBP).</div></div>
          <div class="campo ancho"><label>Nota</label><textarea id="spoNota" rows="2"></textarea></div>
        </div>
        <div class="seccion-head"><h4>Líneas</h4><button class="btn-mini gris" id="spoAddLinea">+ Línea</button></div>
        <div id="spoLineasBody" class="so-lineas-lista"></div>
        <div class="alias-ayuda">El costo unitario es opcional: déjalo vacío en consignación — se captura después con "Costear" en Inventario, o al recibir la línea aquí.</div>
        <div class="acciones">
          <button class="btn-mini" id="spoCrear">Crear compra</button>
          <button class="btn-mini gris" id="spoCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="spoNvAviso"></div>
      </div>`);

    comboProveedor = ERP.crearCombo({
      contenedor: document.getElementById('spoProveedor'),
      items: proveedoresCat.map(p => ({ id: p.id, nombre: p.nombre, alias: p.alias || [] })),
      placeholder: 'Busca proveedor por nombre o alias…', permitirNuevo: false
    });
    montarLineas();

    document.getElementById('spoAddLinea').addEventListener('click', () => { recogerLineas(); lineas.push(nuevaLinea()); montarLineas(); });
    document.getElementById('spoArchivo').addEventListener('change', onArchivoSPO);
    document.getElementById('spoCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('spoCrear').addEventListener('click', crearSPO);
  }

  function montarLineas() {
    const body = document.getElementById('spoLineasBody');
    if (!body) return;
    body.innerHTML = lineas.map((l, i) => `<div class="so-linea-card" data-i="${i}">
      <div id="spoLiSku${i}"></div>
      <div class="so-linea-fila">
        <div class="so-linea-campo num"><label>Cantidad</label><input class="spo-li num" data-i="${i}" data-k="cantidad" type="number" step="0.01" min="0" value="${esc(l.cantidad)}" placeholder="0"></div>
        <div class="so-linea-campo num"><label>UOM</label><input class="spo-li" data-i="${i}" data-k="uom" type="text" value="${esc(l.uom)}"></div>
        <div class="so-linea-campo num"><label>Costo unit.</label><input class="spo-li num" data-i="${i}" data-k="costo_unitario" type="number" step="0.01" min="0" value="${esc(l.costo_unitario)}" placeholder="opcional"></div>
        <div class="so-linea-campo"><label>Moneda</label>
          <select class="spo-li" data-i="${i}" data-k="costo_moneda">${ERP.MONEDAS.map(m => `<option value="${m}" ${l.costo_moneda === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        <button type="button" class="so-linea-quitar" data-del="${i}" title="Quitar línea">✕</button>
      </div>
    </div>`).join('');

    lineas.forEach((l, i) => {
      l.picker = ERP.crearPickerSku({
        contenedor: document.getElementById(`spoLiSku${i}`),
        placeholder: 'Busca SKU…',
        valorInicial: l.sku_id ? { sku_id: l.sku_id, etiqueta: l.sku_etiqueta } : null
      });
    });

    body.querySelectorAll('.spo-li').forEach(inp => {
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
    document.querySelectorAll('#spoLineasBody .spo-li').forEach(inp => {
      const i = Number(inp.dataset.i), k = inp.dataset.k;
      if (lineas[i]) lineas[i][k] = inp.value;
    });
    lineas.forEach(l => {
      if (l.picker) { l.sku_id = l.picker.valorId(); l.sku_etiqueta = l.picker.valorEtiqueta(); }
    });
  }

  function lineasPayload() {
    recogerLineas();
    return lineas
      .filter(l => l.sku_id)
      .map(l => ({
        sku_id: Number(l.sku_id),
        cantidad: numOrNull(l.cantidad),
        uom: String(l.uom || '').trim() || 'CAJA',
        costo_unitario: numOrNull(l.costo_unitario),   // null = consignación, correcto
        costo_moneda: String(l.costo_moneda || '').trim() || 'USD',
        nota: null
      }));
  }

  // Sube el Estimate/Invoice del proveedor a cpo-adjuntos (mismo bucket que O1-CPO) — patrón idéntico.
  const MIMES_CPO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  const MAX_CPO = 20 * 1024 * 1024;
  async function onArchivoSPO(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!MIMES_CPO.includes(file.type)) { avisoNv('err', 'Tipo no permitido. Sube PDF, PNG, JPG o WEBP.'); e.target.value = ''; return; }
    if (file.size > MAX_CPO) { avisoNv('err', 'El archivo supera el máximo de 20 MB.'); e.target.value = ''; return; }

    const estado = document.getElementById('spoArchivoEstado');
    if (estado) estado.textContent = 'Subiendo…';
    const nombreSaneado = file.name.replace(/[^\w.\-]+/g, '_');
    const anio = hoyISO().slice(0, 4);
    const ruta = `${anio}/${crypto.randomUUID()}-${nombreSaneado}`;
    try {
      const up = await ERP.sb.storage.from(BUCKET_CPO).upload(ruta, file, { contentType: file.type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      adjuntoSubido = `storage:${BUCKET_CPO}/${ruta}`;
      const txt = document.getElementById('spoAdjunto');
      if (txt) { txt.value = ''; txt.disabled = true; txt.placeholder = '(usando el archivo subido)'; }
      if (estado) {
        estado.innerHTML = `<i class="ti ti-file-check"></i> ${esc(file.name)} · <a class="enlace quitar" id="spoArchivoQuitar">quitar</a>`;
        const q2 = document.getElementById('spoArchivoQuitar');
        if (q2) q2.addEventListener('click', quitarArchivoSPO);
      }
      avisoNv('ok', 'Archivo subido. Se guardará al crear la compra.');
    } catch (err) {
      adjuntoSubido = null;
      if (estado) estado.textContent = '';
      e.target.value = '';
      avisoNv('err', `No se pudo subir el archivo: ${esc(err.message)}`);
    }
  }
  function quitarArchivoSPO() {
    adjuntoSubido = null;
    const estado = document.getElementById('spoArchivoEstado'); if (estado) estado.textContent = '';
    const inp = document.getElementById('spoArchivo'); if (inp) inp.value = '';
    const txt = document.getElementById('spoAdjunto');
    if (txt) { txt.disabled = false; txt.placeholder = 'Pega una URL… o sube un archivo abajo'; }
  }

  async function crearSPO() {
    const proveedor_id = comboProveedor && comboProveedor.valorId();
    if (!proveedor_id) { avisoNv('err', 'Elige el proveedor.'); return; }
    const payload = lineasPayload();
    if (!payload.length) { avisoNv('err', 'Agrega al menos una línea con SKU.'); return; }
    for (const l of payload) {
      if (!(l.cantidad > 0)) { avisoNv('err', 'Cada línea necesita una cantidad mayor a cero.'); return; }
    }

    const v = id => (document.getElementById(id) || {}).value;
    const adjRef = adjuntoSubido || (v('spoAdjunto') || '').trim() || null;
    const soVal = v('spoSO');
    const args = {
      p_proveedor_id: Number(proveedor_id),
      p_lineas: payload,
      p_numero_proveedor: (v('spoNumProveedor') || '').trim() || null,
      p_fecha: v('spoFecha') || null,
      p_moneda: v('spoMoneda') || 'USD',
      p_sales_order_id: soVal ? Number(soVal) : null,
      p_adjunto_ref: adjRef,
      p_nota: (v('spoNota') || '').trim() || null
    };

    const btn = document.getElementById('spoCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando compra…');
    try {
      const r = uno(await rpc('fn_op_spo_alta', args));
      if (!r.supplier_po_id) throw new Error('El ERP no devolvió la compra.');
      ERP.toast('ok', `Compra <b>${esc(r.folio || '')}</b> creada.`);
      ERP.marcarDatosSucios();
      await recargar();
      verSPO(Number(r.supplier_po_id));
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó la compra: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Generar compra DESDE una Sales Order (D-192) =================
     "Comprar" desde la ficha del SO (modulo-o1-so.js → botón "Generar compra" → ERP.o3AbrirSPODesdeSO).
     Elimina la re-captura redundante que causaba errores reales (vender un SKU y terminar
     comprando otro por tener que re-elegir): SKU y cantidad se HEREDAN de las líneas de la SO,
     de solo lectura aquí — el usuario únicamente elige proveedor + costo unitario por línea.
     Reusa el mismo picker de proveedor y el mismo patrón de adjunto (mismos ids: spoProveedor,
     spoNumProveedor, spoFecha, spoMoneda, spoAdjunto/spoArchivo/spoArchivoEstado, spoNota) que
     "Nueva compra" — solo hay un panel abierto a la vez, no hay colisión. */

  let lineasSO = [];   // [{so_linea_id, sku, cantidad, uom, costo_unitario, costo_moneda}] — SKU/cantidad NO editables
  let soOrigenDs = null;   // { id, folio }

  async function abrirSPODesdeSO(soId, soFolio) {
    if (!ERP.puede('capturar')) return;
    ERP.cerrarPanel();
    adjuntoSubido = null;
    soOrigenDs = { id: Number(soId), folio: soFolio || '' };
    ERP.abrirPanel('Generar compra', `desde Sales Order ${esc(soFolio || '')}`, '<div class="skel">Cargando líneas de la venta…</div>');
    let sol;
    try {
      [proveedoresCat, sol] = await Promise.all([
        q('v_catc_contrapartes', '&es_proveedor=eq.true&order=nombre.asc'),
        q('v_op_so_lineas', `&sales_order_id=eq.${Number(soId)}&order=linea_num.asc`)
      ]);
    } catch (e) {
      ERP.abrirPanel('Generar compra', '', `<div class="errbox">No se pudieron leer las líneas de la venta: ${esc(e.message)}</div>`);
      return;
    }
    if (!sol || !sol.length) {
      ERP.abrirPanel('Generar compra', '', '<div class="errbox">Esta Sales Order no tiene líneas.</div>');
      return;
    }
    lineasSO = sol.map(l => ({ so_linea_id: l.id, sku: l.sku || l.producto || '', cantidad: l.cantidad, uom: l.uom, costo_unitario: '', costo_moneda: 'USD' }));

    ERP.abrirPanel('Generar compra', `desde Sales Order <span class="mono">${esc(soFolio || '')}</span>`, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Proveedor <span class="req">*</span></label><div id="spoProveedor"></div>
            <div class="alias-ayuda">Contraparte marcada como proveedor en el Directorio.</div></div>
          <div class="campo"><label>N° de PO / referencia del proveedor</label>
            <input id="spoNumProveedor" type="text" maxlength="60" placeholder="Ej. EST-1001 (opcional)"></div>
          <div class="campo"><label>Fecha</label>
            <input id="spoFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="spoMoneda">${ERP.MONEDAS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
          <div class="campo ancho"><label>Adjunto (Estimate/Invoice del proveedor)</label>
            <input id="spoAdjunto" class="mono" type="text" placeholder="Pega una URL… o sube un archivo abajo">
            <div class="adjunto-sube">
              <label class="btn-file" for="spoArchivo"><i class="ti ti-upload"></i> o subir archivo (PDF/imagen)</label>
              <input id="spoArchivo" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" style="display:none">
              <span class="adjunto-estado" id="spoArchivoEstado"></span>
            </div>
            <div class="alias-ayuda">Pega la URL/ruta, <b>o</b> sube el archivo (máx 20 MB: PDF, PNG, JPG, WEBP).</div></div>
          <div class="campo ancho"><label>Nota</label><textarea id="spoNota" rows="2"></textarea></div>
        </div>
        <div class="seccion-head"><h4>Líneas (heredadas de la venta — SKU y cantidad no se editan aquí)</h4></div>
        <div id="spoDsLineasBody" class="so-lineas-lista"></div>
        <div class="alias-ayuda">El costo unitario es opcional: déjalo vacío en consignación — se captura después con "Costear" en Inventario, o al recibir la línea aquí.</div>
        <div class="acciones">
          <button class="btn-mini" id="spoCrear">Generar compra</button>
          <button class="btn-mini gris" id="spoCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="spoNvAviso"></div>
      </div>`);

    comboProveedor = ERP.crearCombo({
      contenedor: document.getElementById('spoProveedor'),
      items: proveedoresCat.map(p => ({ id: p.id, nombre: p.nombre, alias: p.alias || [] })),
      placeholder: 'Busca proveedor por nombre o alias…', permitirNuevo: false
    });
    montarLineasDesdeSO();

    document.getElementById('spoArchivo').addEventListener('change', onArchivoSPO);
    document.getElementById('spoCancelar').addEventListener('click', () => (ERP.o1VerSO ? ERP.o1VerSO(soOrigenDs.id) : ERP.cerrarPanel()));
    document.getElementById('spoCrear').addEventListener('click', crearSPODesdeSO);
  }

  function montarLineasDesdeSO() {
    const body = document.getElementById('spoDsLineasBody');
    if (!body) return;
    body.innerHTML = lineasSO.map((l, i) => `<div class="so-linea-card" data-i="${i}">
      <div class="det-grid" style="margin-bottom:6px">
        <div class="det"><span class="l">SKU</span><span class="v">${esc(l.sku || '—')}</span></div>
        <div class="det"><span class="l">Cantidad</span><span class="v mono">${esc(ERP.fmt0(l.cantidad))} ${esc(l.uom || '')}</span></div>
      </div>
      <div class="so-linea-fila">
        <div class="so-linea-campo num"><label>Costo unit.</label><input class="spo-ds-li num" data-i="${i}" data-k="costo_unitario" type="number" step="0.01" min="0" value="${esc(l.costo_unitario)}" placeholder="opcional"></div>
        <div class="so-linea-campo"><label>Moneda</label>
          <select class="spo-ds-li" data-i="${i}" data-k="costo_moneda">${ERP.MONEDAS.map(m => `<option value="${m}" ${l.costo_moneda === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
      </div>
    </div>`).join('');

    body.querySelectorAll('.spo-ds-li').forEach(inp => {
      inp.addEventListener('input', e => { lineasSO[Number(e.target.dataset.i)][e.target.dataset.k] = e.target.value; });
      inp.addEventListener('change', e => { lineasSO[Number(e.target.dataset.i)][e.target.dataset.k] = e.target.value; });
    });
  }

  function recogerLineasDesdeSO() {
    document.querySelectorAll('#spoDsLineasBody .spo-ds-li').forEach(inp => {
      const i = Number(inp.dataset.i), k = inp.dataset.k;
      if (lineasSO[i]) lineasSO[i][k] = inp.value;
    });
  }

  async function crearSPODesdeSO() {
    const proveedor_id = comboProveedor && comboProveedor.valorId();
    if (!proveedor_id) { avisoNv('err', 'Elige el proveedor.'); return; }
    recogerLineasDesdeSO();
    const p_costos = lineasSO.map(l => ({
      so_linea_id: l.so_linea_id,
      costo_unitario: numOrNull(l.costo_unitario),   // null = consignación, correcto
      costo_moneda: String(l.costo_moneda || '').trim() || 'USD'
    }));

    const v = id => (document.getElementById(id) || {}).value;
    const adjRef = adjuntoSubido || (v('spoAdjunto') || '').trim() || null;
    const args = {
      p_sales_order_id: soOrigenDs.id,
      p_proveedor_id: Number(proveedor_id),
      p_costos,
      p_numero_proveedor: (v('spoNumProveedor') || '').trim() || null,
      p_fecha: v('spoFecha') || null,
      p_moneda: v('spoMoneda') || 'USD',
      p_adjunto_ref: adjRef,
      p_nota: (v('spoNota') || '').trim() || null
    };

    const btn = document.getElementById('spoCrear');
    btn.disabled = true;
    avisoNv('warn', 'Generando compra…');
    try {
      const r = uno(await rpc('fn_op_spo_desde_so', args));
      if (!r.supplier_po_id) throw new Error('El ERP no devolvió la compra.');
      ERP.toast('ok', `Compra <b>${esc(r.folio || '')}</b> generada desde ${esc(soOrigenDs.folio || '')}.`);
      ERP.marcarDatosSucios();
      await recargar();
      verSPO(Number(r.supplier_po_id));
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó la compra: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha + recibir línea ================= */

  function fichaAviso(tipo, html) {
    const el = document.getElementById('spoFichaAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function verSPO(id) {
    ERP.cerrarPanel();
    ERP.abrirPanel('Compra', 'Cargando…', '<div class="skel">Cargando compra…</div>');
    let s, lin, docSpo;
    try {
      [s, lin, docSpo] = await Promise.all([
        q('v_op_supplier_po', `&supplier_po_id=eq.${Number(id)}`).then(r => r && r[0]),
        q('v_op_spo_lineas', `&supplier_po_id=eq.${Number(id)}&order=linea_num.asc`).catch(() => []),
        q('v_op_spo_documento', `&supplier_po_id=eq.${Number(id)}`).then(r => r && r[0]).catch(() => null)
      ]);
    } catch (e) {
      ERP.abrirPanel('Compra', '', `<div class="errbox">No se pudo cargar la compra: ${esc(e.message)}</div>`);
      return;
    }
    if (!s) { ERP.abrirPanel('Compra', '', '<div class="errbox">No se encontró la compra.</div>'); return; }

    const puedeCap = ERP.puede('capturar');
    const lineasF = lin || [];

    const filasLineas = lineasF.map(l => {
      const pedido = Number(l.cantidad) || 0;
      const recibido = Number(l.recibido) || 0;
      const pendiente = l.pendiente != null ? Number(l.pendiente) : Math.max(pedido - recibido, 0);
      const tol = Number(l.tolerancia_pct) || 0;
      const maxConTol = pedido * (1 + tol / 100);
      // Se puede recibir mientras no se llegue al máximo con tolerancia (permite recibir en varias
      // parcialidades y también un excedente dentro de tolerancia). Solo se oculta cuando ya no cabe más.
      const puedeRecibir = puedeCap && recibido < maxConTol - 1e-6;
      // diferencia ≠ 0 = lo que hay que vigilar contra la factura del proveedor: se resalta.
      const dif = l.diferencia;
      const difTxt = (dif != null && Number(dif) !== 0)
        ? `<div class="i3" style="font-size:11px;color:var(--rojo);font-weight:600">${Number(dif) > 0 ? '+' : ''}${esc(ERP.fmt0(dif))} vs pedido</div>` : '';
      return `<tr>
        <td class="mono">${esc(l.linea_num ?? '—')}</td>
        <td class="ent">${esc(l.sku || '—')}${l.auto_asigna ? `<div class="i3" style="font-size:11px">se asignará solo a <span class="mono">${esc(l.so_folio || '')}</span></div>` : ''}</td>
        <td class="mono">${esc(l.uom || '—')}</td>
        <td class="num">${esc(ERP.fmt0(pedido))}</td>
        <td class="num">${esc(ERP.fmt0(recibido))}${difTxt}</td>
        <td class="num">${esc(ERP.fmt0(pendiente))}</td>
        <td class="num">${l.costo_unitario != null ? esc(ERP.usd(l.costo_unitario)) + ' ' + esc(l.costo_moneda || 'USD') : '<span class="i3">—</span>'}</td>
        <td>${chipRecepcion(l.estado_recepcion)}${l.lot_folio ? `<div class="i3" style="font-size:11px">${esc(l.lot_folio)}</div>` : ''}</td>
        <td>${puedeRecibir ? `<button type="button" class="btn-cap recibir-linea" data-linea-id="${esc(l.linea_id)}">Recibir</button>` : ''}</td>
      </tr>`;
    }).join('');

    // Transiciones de gestión (O3b, D-194). Los estados de recepción los calcula el backend, no se
    // ofrecen aquí. Abierto → Enviada → Confirmada; Cancelar disponible mientras no haya recepción.
    // O3c (D-196/D-197): "Enviada" ya NO se marca a mano — es consecuencia de "Enviar al
    // proveedor" de verdad (ver abrirEnviarProveedor). puedeGenerarDoc/puedeEnviarProveedor:
    // disponibles en CUALQUIER estado activo (D-197 — reenviar es un caso real: no llegó el
    // correo, se manda a otro contacto, el proveedor lo vuelve a pedir), solo se ocultan en
    // Cancelado. El cambio de estado a 'Enviada' dentro del envío SÍ sigue gateado a que la
    // compra esté en Abierto (ver enviarOCPorCorreo/enviarOCPorWhatsapp) — reenviar una compra ya
    // Confirmada/Recibida NO debe regresarla de estado, el backend lo rechazaría.
    const estL = String(s.estado || '').toLowerCase();
    const puedeGenerarDoc = puedeCap && estL !== 'cancelado';
    const puedeEnviarProveedor = puedeCap && estL !== 'cancelado';
    const puedeConfirmar = puedeCap && estL === 'enviada';
    const puedeCancelar = puedeCap && ['abierto', 'enviada', 'confirmada'].includes(estL);

    ERP.abrirPanel(`Compra <span class="mono">${esc(s.folio || '')}</span>`, esc(s.proveedor || ''), `
      <div class="so-ficha">
        <div class="det-grid">
          <div class="det"><span class="l">Proveedor</span><span class="v">${esc(s.proveedor || '—')}</span></div>
          <div class="det"><span class="l">N° proveedor</span><span class="v mono">${esc(s.numero_proveedor || '—')}</span></div>
          <div class="det"><span class="l">Fecha</span><span class="v">${esc(fecha(s.fecha))}</span></div>
          <div class="det"><span class="l">Moneda</span><span class="v mono">${esc(s.moneda || '—')}</span></div>
          <div class="det"><span class="l">Estado</span><span class="v">${chipEstado(s.estado)}</span></div>
          ${s.enviada_en ? `<div class="det"><span class="l">Enviada</span><span class="v">${esc(fecha(s.enviada_en))}</span></div>` : ''}
          ${s.confirmada_en ? `<div class="det"><span class="l">Confirmada</span><span class="v">${esc(fecha(s.confirmada_en))}</span></div>` : ''}
          <div class="det"><span class="l">Sales Order</span><span class="v mono">${esc(s.so_folio || '—')}</span></div>
          <div class="det"><span class="l">Total costo</span><span class="v mono">${esc(ERP.usd(s.total_costo))}</span></div>
          <div class="det"><span class="l">Adjunto</span><span class="v">${adjuntoHTML(s.adjunto_ref)}</span></div>
        </div>
        ${s.nota ? `<div class="so-nota"><span class="l">Nota</span> ${esc(s.nota)}</div>` : ''}

        <div class="seccion-head"><h4>Líneas</h4></div>
        <div class="tabla-wrap"><table class="so-tablero">
          <thead><tr><th>#</th><th>SKU</th><th>UOM</th>
            <th class="num">Pedido</th><th class="num">Recibido</th><th class="num">Pendiente</th>
            <th class="num">Costo unit.</th><th>Recepción</th><th></th></tr></thead>
          <tbody>${filasLineas || '<tr><td colspan="9" class="vacio">Sin líneas.</td></tr>'}</tbody>
        </table></div>
        <div class="alias-ayuda">"Recibir" crea/agrega el lote de Inventario (O2) desde esta línea — puede recibirse en varias parcialidades. La <b>diferencia</b> vs. lo pedido es lo que se coteja contra la factura del proveedor.</div>

        <div class="so-estados">
          ${puedeGenerarDoc ? `<button class="btn-mini" id="spoGenerarDoc">Generar orden de compra</button>` : ''}
          ${puedeEnviarProveedor ? '<button class="btn-mini" id="spoEnviarProveedor">Enviar al proveedor</button>' : ''}
          ${puedeConfirmar ? '<button class="btn-mini" id="spoConfirmar">Marcar confirmada por el proveedor</button>' : ''}
          ${puedeCancelar ? '<button class="btn-mini gris" id="spoCancelarCompra">Cancelar compra</button>' : ''}
        </div>

        <div class="seccion-head"><h4>Documentos</h4></div>
        <div id="spoDocumentos"><div class="skel">Cargando…</div></div>

        <div class="seccion-head"><h4>Envíos</h4></div>
        <div id="spoEnvios"><div class="skel">Cargando…</div></div>

        <div class="acciones">
          ${puedeCap ? '<button class="btn-mini gris" id="spoEliminar">Eliminar</button>' : ''}
          <button class="btn-mini gris" id="spoCerrar">Cerrar</button>
        </div>
        <div class="aviso" id="spoFichaAviso"></div>
      </div>`);

    cablearVerAdjunto(document.getElementById('panelBody'), false);
    document.getElementById('spoCerrar').addEventListener('click', ERP.cerrarPanel);
    const bDel = document.getElementById('spoEliminar');
    if (bDel) bDel.addEventListener('click', () => eliminarSPO(s));
    const bGenDoc = document.getElementById('spoGenerarDoc');
    if (bGenDoc) bGenDoc.addEventListener('click', () => generarOrdenCompra(s, bGenDoc));
    const bEnviarProv = document.getElementById('spoEnviarProveedor');
    if (bEnviarProv) bEnviarProv.addEventListener('click', () => abrirEnviarProveedor(s));
    const bConfirmar = document.getElementById('spoConfirmar');
    if (bConfirmar) bConfirmar.addEventListener('click', () => cambiarEstadoSPO(s, 'Confirmada'));
    const bCancelar = document.getElementById('spoCancelarCompra');
    if (bCancelar) bCancelar.addEventListener('click', () => {
      if (!confirm(`¿Cancelar la compra ${s.folio}? Se marca como Cancelada (no se borra el registro).`)) return;
      cambiarEstadoSPO(s, 'Cancelado');
    });
    document.querySelectorAll('.recibir-linea').forEach(b => b.addEventListener('click', () => {
      const l = lineasF.find(x => String(x.linea_id) === b.dataset.lineaId);
      if (l) abrirRecibirLinea(s, l);
    }));
    // Líneas de la compra (Pedido/Recibido/Pendiente/Costo/Recepción, D-194) — otro caso ancho.
    ERP.marcarTabla(document.getElementById('panelBody'));

    // Documentos/Envíos (O3c, D-196) — componente genérico, entidad_id = FOLIO (no el id numérico).
    ERP.opDocumentos.montar(document.getElementById('spoDocumentos'), { entidad: 'supplier_po', entidadId: s.folio });
    ERP.opDocumentos.montarEnvios(document.getElementById('spoEnvios'), { entidad: 'supplier_po', entidadId: s.folio });
  }

  // Transición de estado de la compra (O3b, D-194). El backend valida (ej. bloquea Cancelar si ya
  // hay mercancía recibida) y devuelve el mensaje legible, que se muestra tal cual.
  async function cambiarEstadoSPO(s, nuevo) {
    try {
      await rpc('fn_op_spo_set_estado', { p_id: Number(s.supplier_po_id), p_estado: nuevo });
      ERP.toast('ok', `Compra <b>${esc(s.folio || '')}</b> → <b>${esc(nuevo)}</b>.`);
      ERP.marcarDatosSucios();
      await recargar();
      verSPO(s.supplier_po_id);
    } catch (e) {
      if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', esc(e.message), 9000);
    }
  }

  /* ================= O3c: Generar orden de compra (PDF real) + Enviar al proveedor =================
     Reusa ERP.opDocumentos (modulo-op-documentos.js): construirPdfOficial (mismo membrete/verde de
     marca que el PO oficial legacy) + subir/urlFirmada/registrarEnvio, sobre v_op_spo_documento
     (trae los datos del proveedor YA registrados — nunca se piden a mano aquí). */

  function lineasOcParaPdf(po) {
    const lin = Array.isArray(po.lineas) ? po.lineas : [];
    return lin.map(l => ({
      item: l.linea,
      descripcion: [l.sku, l.unidad ? `(${l.unidad})` : '', l.nota ? `— ${l.nota}` : ''].filter(Boolean).join(' '),
      qty: l.qty, precio: l.precio, total: l.total
    }));
  }

  async function construirOcPdfBlob(po) {
    // Estructura tomada de Purchase Order Template.docx (D-197): BILL TO (Plein, quien paga) y
    // SHIP TO (destino de la mercancía) — NO "VENDOR" como caja propia, ese formato es de las
    // plantillas oficiales de Invoice/Quote/PO reusadas tal cual. El proveedor se identifica en el
    // meta (fila VENDOR) — no hace falta repetirle su propia dirección/RFC de vuelta en el
    // documento que le mandamos. SHIP TO: no hay un campo de "ubicación de entrega" propio por
    // compra en v_op_spo_documento todavía — se usa la misma dirección de Plein que BILL TO
    // (dato real conocido, no inventado) hasta que exista ese campo.
    const poNum = po.numero_proveedor || po.folio;
    const meta = [
      ['VENDOR', po.proveedor_razon_social || po.proveedor || '—'],
      ['DATE', fecha(po.fecha)],
      ['PO #', poNum]
    ];
    if (poNum !== po.folio) meta.push(['REF. INTERNA', po.folio]);   // no repetir el mismo dato dos veces
    meta.push(['MONEDA', po.moneda || 'USD']);

    const doc = await ERP.opDocumentos.construirPdfOficial({
      titulo: 'PURCHASE ORDER',
      meta,
      cajaIzq: { titulo: 'BILL TO', lineas: ERP.opDocumentos.bloqueEmpresaPleinPdf() },
      cajaDer: { titulo: 'SHIP TO', lineas: ERP.opDocumentos.bloqueEmpresaPleinPdf() },
      lineas: lineasOcParaPdf(po),
      total: po.total,
      notaLabel: 'Other Comments or Special Instructions',
      nota: po.nota
    });
    return doc.output('blob');
  }

  const RUTA_OC = folio => `oc/${folio}.pdf`;   // ruta FIJA (task): regenerar reemplaza el mismo archivo

  /** Documento 'Orden de compra' ya registrado para esta compra, si existe (evita regenerar/resubir
      en cada envío — Enviar reusa el PDF que ya se generó). */
  async function documentoOcExistente(s) {
    try {
      const docs = await ERP.opDocumentos.listarDocumentos('supplier_po', s.folio);
      return docs.find(d => d.categoria === 'Orden de compra' && d.storage_path === RUTA_OC(s.folio)) || null;
    } catch (_) { return null; }
  }

  async function generarOrdenCompra(s, boton) {
    const txt = boton && boton.textContent;
    if (boton) { boton.disabled = true; boton.textContent = 'Generando…'; }
    limpiarAvisoFicha();
    try {
      const docSpo = await q('v_op_spo_documento', `&supplier_po_id=eq.${Number(s.supplier_po_id)}`).then(r => r && r[0]);
      if (!docSpo) throw new Error('No se pudo leer el documento de la compra.');
      const blob = await construirOcPdfBlob(docSpo);
      await ERP.opDocumentos.subir({
        entidad: 'supplier_po', entidadId: s.folio, archivo: blob,
        nombreArchivo: `${s.folio}.pdf`, mime: 'application/pdf',
        categoria: 'Orden de compra', storagePath: RUTA_OC(s.folio),
        nota: 'Generada desde la ficha de la compra.'
      });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Orden de compra <b>${esc(s.folio)}.pdf</b> generada y guardada.`);
      const url = await ERP.opDocumentos.urlFirmada(RUTA_OC(s.folio), 300);
      window.open(url, '_blank', 'noopener');
      ERP.opDocumentos.montar(document.getElementById('spoDocumentos'), { entidad: 'supplier_po', entidadId: s.folio });
    } catch (e) {
      fichaAviso('err', `No se pudo generar la orden de compra: ${esc(e.message)}`);
    }
    if (boton) { boton.disabled = false; boton.textContent = txt; }
  }

  function limpiarAvisoFicha() { const el = document.getElementById('spoFichaAviso'); if (el) { el.className = 'aviso'; el.innerHTML = ''; } }

  /** Asegura que el PDF de la OC ya esté en el bucket (lo genera si aún no existe) y regresa su
      storage_path — tanto Correo (para "adjúntalo") como WhatsApp (para la URL firmada) lo usan. */
  async function asegurarDocumentoOC(s) {
    const existente = await documentoOcExistente(s);
    if (existente) return existente.storage_path;
    const docSpo = await q('v_op_spo_documento', `&supplier_po_id=eq.${Number(s.supplier_po_id)}`).then(r => r && r[0]);
    if (!docSpo) throw new Error('No se pudo leer el documento de la compra.');
    const blob = await construirOcPdfBlob(docSpo);
    await ERP.opDocumentos.subir({
      entidad: 'supplier_po', entidadId: s.folio, archivo: blob,
      nombreArchivo: `${s.folio}.pdf`, mime: 'application/pdf',
      categoria: 'Orden de compra', storagePath: RUTA_OC(s.folio)
    });
    return RUTA_OC(s.folio);
  }

  async function abrirEnviarProveedor(s) {
    if (!ERP.puede('capturar')) return;
    ERP.cerrarPanel();
    ERP.abrirPanel('Enviar al proveedor', `${esc(s.folio || '')} · ${esc(s.proveedor || '')}`, '<div class="skel">Cargando datos del proveedor…</div>');
    let docSpo;
    try {
      docSpo = await q('v_op_spo_documento', `&supplier_po_id=eq.${Number(s.supplier_po_id)}`).then(r => r && r[0]);
      if (!docSpo) throw new Error('No se pudo leer el documento de la compra.');
    } catch (e) {
      ERP.abrirPanel('Enviar al proveedor', '', `<div class="errbox">${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Enviar al proveedor', `${esc(s.folio || '')} · ${esc(s.proveedor || '')}`, `
      <div class="form-erp">
        <div class="det-grid">
          <div class="det"><span class="l">Correo</span><span class="v mono">${docSpo.proveedor_email ? esc(docSpo.proveedor_email) : '<span class="i3">sin correo registrado</span>'}</span></div>
          <div class="det"><span class="l">WhatsApp</span><span class="v mono">${docSpo.proveedor_whatsapp ? esc(docSpo.proveedor_whatsapp) : '<span class="i3">sin WhatsApp registrado</span>'}</span></div>
        </div>
        <div class="alias-ayuda">Estos datos vienen del Directorio (proveedor). Si faltan, captúralos ahí antes de enviar. Si el PDF todavía no existe, se genera automáticamente al enviar.</div>
        <div class="acciones">
          <button class="btn-mini" id="envCorreo"${docSpo.proveedor_email ? '' : ' disabled'}>Enviar por correo</button>
          <button class="btn-mini" id="envWhatsapp"${docSpo.proveedor_whatsapp ? '' : ' disabled'}>Enviar por WhatsApp</button>
          <button class="btn-mini gris" id="envCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="envAviso"></div>
      </div>`);

    document.getElementById('envCancelar').addEventListener('click', () => verSPO(s.supplier_po_id));
    const bCorreo = document.getElementById('envCorreo');
    if (bCorreo) bCorreo.addEventListener('click', () => enviarOCPorCorreo(s, docSpo, bCorreo));
    const bWa = document.getElementById('envWhatsapp');
    if (bWa) bWa.addEventListener('click', () => enviarOCPorWhatsapp(s, docSpo, bWa));
  }

  function avisoEnv(tipo, html) {
    const el = document.getElementById('envAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  /** D-197: marca la compra como Enviada SOLO si sigue en Abierto. Reenviar (correo o WhatsApp)
      ya es válido en cualquier estado activo (D-197 — no llegó, se manda a otro contacto, el
      proveedor lo pide de nuevo), pero si la compra ya avanzó a Confirmada/Recibido, NO hay que
      regresarla de estado — el backend rechaza esa transición con excepción y rompería el envío
      completo (el registro del envío ya se hizo antes de esto, así que el rastro queda igual).
      Devuelve true si sí cambió el estado, para ajustar el mensaje del toast. */
  async function marcarEnviadaSiAbierto(s) {
    if (String(s.estado || '').toLowerCase() !== 'abierto') return false;
    await rpc('fn_op_spo_set_estado', { p_id: Number(s.supplier_po_id), p_estado: 'Enviada' });
    return true;
  }

  async function enviarOCPorCorreo(s, docSpo, boton) {
    boton.disabled = true;
    avisoEnv('warn', 'Preparando…');
    try {
      const path = await asegurarDocumentoOC(s);
      // mailto interino (ERP.enviarPorCorreoDoc, comun.js): NO puede adjuntar el PDF — abre el
      // borrador con destinatario/asunto/cuerpo y, en paralelo, reabre el PDF para adjuntarlo a
      // mano. El envío real por servicio (Resend + dominio verificado) queda para una 2ª vuelta.
      ERP.enviarPorCorreoDoc({
        email: docSpo.proveedor_email,
        asunto: `Orden de compra ${s.folio} — Plein Produce`,
        cuerpo: `Hola,\n\nTe compartimos la orden de compra ${s.folio} de Plein Produce.\n` +
          `Proveedor: ${docSpo.proveedor || ''}\nTotal: ${ERP.usd(docSpo.total)}\n\nSaludos.`,
        sinEmailAviso: 'El proveedor no tiene correo registrado — captúralo en Directorio Comercial.',
        descargar: () => { ERP.opDocumentos.urlFirmada(path, 300).then(url => window.open(url, '_blank', 'noopener')); }
      });
      await ERP.opDocumentos.registrarEnvio({
        entidad: 'supplier_po', entidadId: s.folio, canal: 'correo', destinatario: docSpo.proveedor_email,
        asunto: `Orden de compra ${s.folio} — Plein Produce`, pdfPath: path, estado: 'enviado',
        contraparteId: docSpo.proveedor_id, proveedorEnvio: 'mailto'
      });
      const cambioAEnviada = await marcarEnviadaSiAbierto(s);
      ERP.marcarDatosSucios();
      await recargar();
      ERP.toast('ok', `Compra <b>${esc(s.folio)}</b> enviada${cambioAEnviada ? ' y marcada como <b>Enviada</b>' : ''}.`);
      verSPO(s.supplier_po_id);
    } catch (e) {
      avisoEnv('err', `No se pudo enviar: ${esc(e.message)}`);
      boton.disabled = false;
    }
  }

  async function enviarOCPorWhatsapp(s, docSpo, boton) {
    boton.disabled = true;
    avisoEnv('warn', 'Preparando…');
    try {
      const digitos = String(docSpo.proveedor_whatsapp || '').replace(/\D/g, '');
      if (!digitos) throw new Error('El proveedor no tiene WhatsApp registrado.');
      const path = await asegurarDocumentoOC(s);
      // wa.me NO adjunta archivos, solo texto — la liga (URL firmada 90 días) va en el mensaje.
      const url90 = await ERP.opDocumentos.urlFirmada(path, 60 * 60 * 24 * 90);
      const mensaje = `Hola, te compartimos la orden de compra ${s.folio} de Plein Produce.\n` +
        `Proveedor: ${docSpo.proveedor || ''}\nTotal: ${ERP.usd(docSpo.total)}\n` +
        `Documento (liga válida 90 días): ${url90}`;
      await ERP.opDocumentos.registrarEnvio({
        entidad: 'supplier_po', entidadId: s.folio, canal: 'whatsapp', destinatario: digitos,
        mensaje, pdfPath: path, pdfUrl: url90, estado: 'enviado',
        contraparteId: docSpo.proveedor_id, proveedorEnvio: 'wa.me'
      });
      const cambioAEnviada = await marcarEnviadaSiAbierto(s);
      ERP.marcarDatosSucios();
      await recargar();
      const win = window.open(`https://wa.me/${digitos}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
      ERP.toast('ok', `Compra <b>${esc(s.folio)}</b> enviada${cambioAEnviada ? ' y marcada como <b>Enviada</b>' : ''}.` + (win ? '' : ' No se pudo abrir WhatsApp automáticamente — revisa el bloqueo de ventanas emergentes.'));
      verSPO(s.supplier_po_id);
    } catch (e) {
      avisoEnv('err', `No se pudo enviar: ${esc(e.message)}`);
      boton.disabled = false;
    }
  }

  async function eliminarSPO(s) {
    if (!confirm(`¿Eliminar la compra ${s.folio}? Esta acción no se puede deshacer.`)) return;
    try {
      await rpc('fn_op_spo_eliminar', { p_id: Number(s.supplier_po_id) });
      ERP.toast('ok', `Compra <b>${esc(s.folio || '')}</b> eliminada.`);
      ERP.marcarDatosSucios();
      await recargar();
      ERP.cerrarPanel();
    } catch (e) {
      // El backend bloquea con mensaje legible si ya hay líneas recibidas — se muestra tal cual,
      // es información útil, no un error genérico.
      if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', esc(e.message), 9000);
    }
  }

  /* ---- Recibir línea: mismo picker de ubicación que "Recibir inventario" (dedupe de
     v_op_inventario + "+ Nueva ubicación" inline) ---- */

  let comboUbicacionRec = null, ubicacionesEnMemoria = [];

  function avisoRec(tipo, html) {
    const el = document.getElementById('recLiAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function abrirRecibirLinea(s, l) {
    if (!ERP.puede('capturar')) return;
    ERP.cerrarPanel();
    ERP.abrirPanel('Recibir línea', `${esc(s.folio || '')} · ${esc(l.sku || '')}`, '<div class="skel">Cargando ubicaciones…</div>');
    let inv;
    try {
      inv = await q('v_op_inventario', '&order=fecha.desc').catch(() => []);
    } catch (e) {
      ERP.abrirPanel('Recibir línea', '', `<div class="errbox">No se pudo leer el inventario: ${esc(e.message)}</div>`);
      return;
    }
    const mapa = new Map();
    (inv || []).forEach(x => {
      if (x.location_id != null && !mapa.has(x.location_id)) {
        mapa.set(x.location_id, { id: x.location_id, nombre: [x.location_codigo, x.location_nombre].filter(Boolean).join(' — ') || `Ubicación ${x.location_id}` });
      }
    });
    ubicacionesEnMemoria = [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));

    const pedido = Number(l.cantidad) || 0;
    const yaRecibido = Number(l.recibido) || 0;
    const pendiente = l.pendiente != null ? Number(l.pendiente) : Math.max(pedido - yaRecibido, 0);

    ERP.abrirPanel('Recibir línea', `${esc(s.folio || '')} · ${esc(l.sku || '')}`, `
      <div class="form-erp">
        <div class="det-grid">
          <div class="det"><span class="l">Pedido</span><span class="v mono">${esc(ERP.fmt0(pedido))} ${esc(l.uom || '')}</span></div>
          <div class="det"><span class="l">Ya recibido</span><span class="v mono">${esc(ERP.fmt0(yaRecibido))}</span></div>
          <div class="det"><span class="l">Pendiente</span><span class="v mono">${esc(ERP.fmt0(pendiente))}</span></div>
          <div class="det"><span class="l">Costo unit.</span><span class="v mono">${l.costo_unitario != null ? esc(ERP.usd(l.costo_unitario)) + ' ' + esc(l.costo_moneda || 'USD') : 'Sin costear'}</span></div>
        </div>
        <div class="campos">
          <div class="campo">
            <label>Cantidad recibida <span class="req">*</span></label>
            <input id="recLiCantidad" class="mono" type="number" step="0.01" min="0" value="${esc(pendiente)}">
            <div class="alias-ayuda">Lo que llegó realmente. Prellenado con lo pendiente; edítalo si llegó distinto (ej. pediste 226 y llegaron 200). Se puede recibir en varias parcialidades.</div>
          </div>
          <div class="campo ancho">
            <label>Ubicación <span class="req">*</span></label>
            <div id="recLiUbicacion"></div>
            <div class="ia-leer-wrap">
              <button type="button" class="btn-mini gris" id="recLiNuevaUbicacion"><i class="ti ti-plus"></i> Nueva ubicación</button>
              <span class="alias-ayuda">${ubicacionesEnMemoria.length ? '' : 'Todavía no hay ubicaciones — crea la primera.'}</span>
            </div>
            <div id="recLiUbicacionForm" style="display:none;margin-top:8px" class="campo-fijo">
              <div class="campos">
                <div class="campo"><label>Código</label><input id="recLiUbCodigo" type="text" maxlength="20" placeholder="Ej. NGL-01"></div>
                <div class="campo"><label>Nombre</label><input id="recLiUbNombre" type="text" maxlength="80" placeholder="Ej. Bodega Nogales"></div>
              </div>
              <div class="acciones" style="margin-top:8px">
                <button type="button" class="btn-mini gris" id="recLiUbCrear">Crear ubicación</button>
                <button type="button" class="btn-mini gris" id="recLiUbCancelar">Cancelar</button>
              </div>
            </div>
          </div>
          <div class="campo"><label>Fecha</label><input id="recLiFecha" type="date" value="${hoyISO()}"></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="recLiGuardar">Recibir</button>
          <button class="btn-mini gris" id="recLiCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="recLiAviso"></div>
      </div>`);

    montarComboUbicacionRec();
    document.getElementById('recLiNuevaUbicacion').addEventListener('click', () => { document.getElementById('recLiUbicacionForm').style.display = ''; });
    document.getElementById('recLiUbCancelar').addEventListener('click', () => { document.getElementById('recLiUbicacionForm').style.display = 'none'; });
    document.getElementById('recLiUbCrear').addEventListener('click', crearUbicacionInlineRec);
    document.getElementById('recLiCancelar').addEventListener('click', () => verSPO(s.supplier_po_id));
    document.getElementById('recLiGuardar').addEventListener('click', () => guardarRecibirLinea(s, l));
  }

  function montarComboUbicacionRec(preseleccionar) {
    comboUbicacionRec = ERP.crearCombo({
      contenedor: document.getElementById('recLiUbicacion'),
      items: ubicacionesEnMemoria,
      placeholder: 'Busca ubicación…', permitirNuevo: false
    });
    if (preseleccionar) comboUbicacionRec.seleccionar(preseleccionar);
  }

  async function crearUbicacionInlineRec() {
    const codigo = (document.getElementById('recLiUbCodigo').value || '').trim();
    const nombre = (document.getElementById('recLiUbNombre').value || '').trim();
    if (!codigo || !nombre) { avisoRec('err', 'Código y nombre son obligatorios para la nueva ubicación.'); return; }
    const btn = document.getElementById('recLiUbCrear');
    btn.disabled = true;
    avisoRec('warn', 'Creando ubicación…');
    try {
      const r = uno(await rpc('fn_op_location_alta', { p_codigo: codigo, p_nombre: nombre }));
      const id = r.location_id ?? r.id;
      if (id == null) throw new Error('El ERP no devolvió el id de la ubicación.');
      const nueva = { id, nombre: `${codigo} — ${nombre}` };
      ubicacionesEnMemoria = [...ubicacionesEnMemoria.filter(u => String(u.id) !== String(id)), nueva]
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      montarComboUbicacionRec(nueva);
      document.getElementById('recLiUbicacionForm').style.display = 'none';
      avisoRec('ok', `Ubicación <b>${esc(nueva.nombre)}</b> creada y seleccionada.`);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoRec('err', `No se pudo crear la ubicación: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  async function guardarRecibirLinea(s, l) {
    const location_id = comboUbicacionRec && comboUbicacionRec.valorId();
    if (!location_id) { avisoRec('err', 'Elige o crea una ubicación.'); return; }
    const fechaVal = (document.getElementById('recLiFecha') || {}).value || null;
    // p_cantidad = lo que llegó realmente; null (input vacío) = recibe todo lo pendiente.
    const cantVal = numOrNull((document.getElementById('recLiCantidad') || {}).value);
    if (cantVal != null && !(cantVal > 0)) { avisoRec('err', 'La cantidad recibida debe ser mayor a cero.'); return; }

    const btn = document.getElementById('recLiGuardar');
    btn.disabled = true;
    avisoRec('warn', 'Recibiendo…');
    try {
      const r = uno(await rpc('fn_op_spo_recibir_linea', {
        p_spo_linea_id: Number(l.linea_id), p_location_id: Number(location_id),
        p_fecha: fechaVal, p_cantidad: cantVal
      }));
      // estado_linea (O3b, D-194): Parcial → di cuánto falta; Recibido de más → márcalo claro;
      // Completo → recepción normal. auto_asignado (D-192) → nota extra de asignación a la venta.
      const lot = esc(r.lot_folio || '');
      const est = String(r.estado_linea || '').toLowerCase();
      let tipo = 'ok', msg;
      if (est === 'parcial') {
        tipo = 'warn';
        const falta = (r.pedido != null && r.recibido_total != null) ? Number(r.pedido) - Number(r.recibido_total) : null;
        msg = `Recibido parcial — lote <b>${lot}</b> (${esc(ERP.fmt0(r.recibido_ahora))} ahora · ${esc(ERP.fmt0(r.recibido_total))} de ${esc(ERP.fmt0(r.pedido))})`
          + (falta != null ? `, faltan <b>${esc(ERP.fmt0(falta))}</b>.` : '.');
      } else if (est.includes('mas') || est.includes('más')) {
        tipo = 'warn';
        const dif = r.diferencia != null ? `${Number(r.diferencia) > 0 ? '+' : ''}${ERP.fmt0(r.diferencia)}` : '';
        msg = `Recibido de MÁS — lote <b>${lot}</b>: llegaron ${esc(ERP.fmt0(r.recibido_total))} vs ${esc(ERP.fmt0(r.pedido))} pedidos (<b>${esc(dif)}</b>). Revísalo contra la factura.`;
      } else {
        msg = `Recibido completo — lote <b>${lot}</b>.`;
      }
      if (r.auto_asignado) {
        const pend = r.auto_asignado.pendiente_linea;
        msg += pend != null ? ` Asignado a la venta (quedan ${esc(ERP.fmt0(pend))} pendientes).` : ' Asignado a la venta.';
      }
      ERP.toast(tipo, msg, 8000);
      ERP.marcarDatosSucios();
      await recargar();
      verSPO(s.supplier_po_id);
    } catch (e) {
      // El backend bloquea si se excede la tolerancia (mensaje legible) — se muestra tal cual.
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoRec('err', `El ERP rechazó la recepción: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  ERP.registrar('o3-compras', {
    titulo: 'Compras',
    descripcion: 'Camino C · O3a — PO al proveedor; recibir sus líneas hace nacer el lote de Inventario',
    render
  });

  ERP.o3AbrirSPO = verSPO;
  ERP.o3AbrirSPODesdeSO = abrirSPODesdeSO;
})();
