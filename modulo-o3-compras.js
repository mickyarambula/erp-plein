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
       true y recibirla (Aceptada, vía fn_op_recepcion_registrar — ver abajo) asigna sola el lote
       a esa línea de venta.
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
     fn_op_spo_recibir_linea — RETIRADA (D-204). Existía UN SOLO camino más al inventario desde
       una compra, sin calidad (nacía el lote directo). Miguel recibió 2 compras sin ver la opción
       de rechazo porque una pestaña vieja seguía usando este RPC. El backend ahora la deja viva
       solo como guarda: SIEMPRE lanza una excepción explicando que se reemplazó por "Recibir
       mercancía" (D-201/D-203, ver fn_op_recepcion_registrar abajo). El frontend NO debe volver a
       llamarla — ni un modal "Recibir línea" suelto por línea. Recibir mercancía es SIEMPRE a
       nivel compra completa (inspección + resultado por línea), nunca una línea aislada.
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
  let huerfanos = [];   // v_op_documentos_huerfanos (D-201) — solo se carga para rol administrar

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
    const esAdmin = ERP.puede('administrar');
    let filas;
    try {
      filas = await q('v_op_supplier_po', '&order=fecha.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer las compras: ${esc(e.message)}</div>`;
      return;
    }
    spos = filas || [];
    fEstado = ''; fTexto = '';

    // Documentos huérfanos (D-201, TAREA 2c): PDFs en el bucket cuya compra ya no existe. Solo se
    // muestran a rol administrar y SOLO si hay (>0) — con 0 no aparece nada (no ensuciar la
    // pantalla de uso diario). Ubicación PROVISIONAL aquí porque hoy la vista solo cubre
    // supplier_po; cuando cubra ventas/CPO se replantea (anotado en BITACORA D-201).
    huerfanos = [];
    if (esAdmin) { try { huerfanos = (await q('v_op_documentos_huerfanos', '&order=nombre_archivo.asc')) || []; } catch (_) { huerfanos = []; } }

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
        ${huerfanos.length ? `<button class="btn-mini gris" id="spoHuerfanos" title="PDFs en el bucket sin compra — limpieza"><i class="ti ti-trash"></i> Huérfanos (${esc(huerfanos.length)})</button>` : ''}
        <span class="conteo" id="spoConteo"></span>
      </div>
      <div id="spoTabla"></div>
    </div>`;

    pintarKpis();
    pintarTabla();

    const bNuevo = document.getElementById('spoNuevo');
    if (bNuevo) bNuevo.addEventListener('click', nuevaSPO);
    const bHuerf = document.getElementById('spoHuerfanos');
    if (bHuerf) bHuerf.addEventListener('click', abrirHuerfanos);
    document.getElementById('spoFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    document.getElementById('spoBuscar').addEventListener('input', e => { fTexto = e.target.value; pintarTabla(); });
  }

  /* ================= Documentos huérfanos (D-201, TAREA 2c) — admin =================
     Drawer de mantenimiento: lista v_op_documentos_huerfanos con "Limpiar" por fila. Limpiar =
     purgar (fn_op_doc_purgar, que exige el doc ya anulado → si aún no lo está, se anula primero)
     + borrar el archivo del bucket con lo que devuelva el backend (archivo_a_borrar). */
  async function abrirHuerfanos() {
    if (!ERP.puede('administrar')) return;
    ERP.abrirPanel('Documentos huérfanos', 'PDFs en el bucket cuya compra ya no existe', `
      <div class="form-erp">
        <div class="alias-ayuda">Estos archivos quedaron en Storage sin una compra que los respalde. "Limpiar" los borra de la base y del bucket — no se puede deshacer. (Al eliminar una compra hoy, esto ya se hace solo; esta lista atrapa restos previos.)</div>
        <div id="huerfList" style="margin-top:12px"></div>
        <div class="acciones"><button class="btn-mini gris" id="huerfCerrar">Cerrar</button></div>
        <div class="aviso" id="huerfAviso"></div>
      </div>`);
    pintarHuerfanos();
    document.getElementById('huerfCerrar').addEventListener('click', ERP.cerrarPanel);
  }

  function pintarHuerfanos() {
    const cont = document.getElementById('huerfList');
    if (!cont) return;
    if (!huerfanos.length) { cont.innerHTML = '<div class="vacio">No quedan documentos huérfanos. 🎉</div>'; return; }
    cont.innerHTML = `<div class="tabla-wrap"><table class="so-tablero">
      <thead><tr><th>Archivo</th><th>Categoría</th><th>Ruta</th><th></th></tr></thead>
      <tbody>${huerfanos.map((h, i) => `<tr>
        <td class="ent">${esc(h.nombre_archivo || '—')}</td>
        <td>${esc(h.categoria || '—')}</td>
        <td class="mono i3" style="font-size:11px">${esc(h.storage_path || '—')}</td>
        <td><button type="button" class="btn-mini gris" data-limpiar="${i}">Limpiar</button></td>
      </tr>`).join('')}</tbody>
    </table></div>`;
    cont.querySelectorAll('[data-limpiar]').forEach(b => b.addEventListener('click', () => limpiarHuerfano(huerfanos[Number(b.dataset.limpiar)], b)));
    ERP.marcarTabla(cont);
  }

  async function limpiarHuerfano(h, boton) {
    if (!h || !confirm(`¿Limpiar "${h.nombre_archivo}"? Se borra de la base y del bucket, sin vuelta atrás.`)) return;
    if (boton) { boton.disabled = true; boton.textContent = 'Limpiando…'; }
    const aviso = (t, html) => { const el = document.getElementById('huerfAviso'); if (el) { el.className = 'aviso visible ' + t; el.innerHTML = html; } };
    try {
      let r;
      try {
        r = await ERP.opDocumentos.purgar(h.documento_id);
      } catch (e1) {
        // "papelera primero": si el doc aún no está anulado, purgar lo rechaza — se anula y reintenta.
        if (/anul/i.test(e1.message || '')) { await ERP.opDocumentos.anular(h.documento_id); r = await ERP.opDocumentos.purgar(h.documento_id); }
        else throw e1;
      }
      const path = (r && r.archivo_a_borrar) || h.storage_path;
      const res = await ERP.opDocumentos.borrarDeStorage(path);
      huerfanos = huerfanos.filter(x => String(x.documento_id) !== String(h.documento_id));
      pintarHuerfanos();
      ERP.marcarDatosSucios();
      aviso('ok', res.fallidos.length
        ? `Registro purgado, pero el archivo del bucket no se pudo borrar (puede que ya no existiera).`
        : `<b>${esc(h.nombre_archivo)}</b> limpiado de la base y del bucket.`);
    } catch (e) {
      if (boton) { boton.disabled = false; boton.textContent = 'Limpiar'; }
      if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) aviso('err', `No se pudo limpiar: ${esc(e.message)}`);
    }
  }

  async function recargar() {
    ERP.limpiarCache();
    try { spos = (await q('v_op_supplier_po', '&order=fecha.desc')) || []; } catch (_) { /* la ficha muestra su propio error */ }
  }

  /* ================= Alta ================= */

  let proveedoresCat = [], sosCat = [], destinosCat = [], proveedoresPorProductoCat = [], comboProveedor = null;
  let acotadoProveedor = true;   // toggle "ver todos" — nunca bloquea, solo cambia qué se muestra primero (D-200)
  const optsDestino = (destinos, sel) => `<option value="">— sin destino —</option>` +
    destinos.map(d => `<option value="${esc(d.location_id)}" ${String(sel || '') === String(d.location_id) ? 'selected' : ''}>${esc(d.nombre)}${d.tipo_etiqueta ? ` (${esc(d.tipo_etiqueta)})` : ''}</option>`).join('');

  /** Sugerencia de proveedor por producto (D-200) — NUNCA bloquea (REGLAS-DE-TRABAJO.md §11.4):
      el combo siempre puede buscar cualquier proveedor escribiendo; "acotado" solo decide qué se
      ve por default en la lista sin escribir, con un link "ver todos" siempre a un clic. Mismo
      espíritu que el toggle soloVinculados de ERP.crearPickerSku. */
  function productoIdsDeLineas() {
    const set = new Set();
    lineas.forEach(l => { const pid = l.picker && l.picker.valorProductoId && l.picker.valorProductoId(); if (pid != null) set.add(Number(pid)); });
    return set;
  }
  function destacadosProveedorPorProductos(pids) {
    if (!pids.size) return new Set();
    return new Set(proveedoresPorProductoCat.filter(v => pids.has(Number(v.producto_id))).map(v => Number(v.contraparte_id)));
  }
  function refrescarSugerenciaProveedor(pids, hintId) {
    if (!comboProveedor) return;
    const destacados = destacadosProveedorPorProductos(pids);
    const items = proveedoresCat.map(p => ({ id: p.id, nombre: p.nombre, alias: p.alias || [], destacado: destacados.has(Number(p.id)) }));
    const hint = document.getElementById(hintId);
    if (!destacados.size) {
      if (hint) hint.style.display = 'none';
      comboProveedor.actualizarItems(items);
      return;
    }
    const acotados = items.filter(i => i.destacado);
    comboProveedor.actualizarItems(acotadoProveedor && acotados.length ? acotados : items);
    if (hint) {
      hint.style.display = '';
      hint.innerHTML = `${destacados.size} proveedor${destacados.size === 1 ? '' : 'es'} ya surte${destacados.size === 1 ? '' : 'n'} este producto — se muestra${destacados.size === 1 ? '' : 'n'} primero. ` +
        `<a class="enlace" id="${hintId}Toggle">${acotadoProveedor ? 'Ver todos los proveedores' : 'Solo los que ya surten este producto'}</a>`;
      const t = document.getElementById(hintId + 'Toggle');
      if (t) t.addEventListener('click', () => { acotadoProveedor = !acotadoProveedor; refrescarSugerenciaProveedor(pids, hintId); });
    }
  }
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
      [proveedoresCat, sosCat, destinosCat, proveedoresPorProductoCat] = await Promise.all([
        q('v_catc_contrapartes', '&es_proveedor=eq.true&order=nombre.asc'),
        q('v_op_sales_orders', '&order=created_at.desc').catch(() => []),
        q('v_op_destinos', '&activo=eq.true&order=nombre.asc').catch(() => []),
        q('v_catc_proveedores_por_producto').catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel('Nueva compra', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }
    lineas = [nuevaLinea()];
    acotadoProveedor = true;

    ERP.abrirPanel('Nueva compra', 'Registra el PO que le mandamos al proveedor', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Proveedor <span class="req">*</span></label><div id="spoProveedor"></div>
            <div class="alias-ayuda">Contraparte marcada como proveedor en el Directorio.</div>
            <div class="alias-ayuda" id="spoProveedorHint" style="display:none"></div></div>
          <div class="campo"><label>N° de PO / referencia del proveedor</label>
            <input id="spoNumProveedor" type="text" maxlength="60" placeholder="Ej. EST-1001 (opcional)"></div>
          <div class="campo"><label>Fecha</label>
            <input id="spoFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="spoMoneda">${ERP.MONEDAS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
          <div class="campo ancho"><label>Ligar a una Sales Order (opcional)</label>
            <select id="spoSO"><option value="">— sin ligar —</option>${sosCat.map(s => `<option value="${esc(s.id)}">${esc(s.folio)} — ${esc(s.cliente || '')}</option>`).join('')}</select>
            <div class="alias-ayuda">Solo trazabilidad — puede quedar vacío.</div></div>
          <div class="campo ancho"><label>Destino (SHIP TO)</label>
            <select id="spoDestino">${optsDestino(destinosCat)}</select>
            <div class="alias-ayuda">A dónde va la mercancía: bodega propia, del cliente (entrega directa) o cross-dock. Se usa en el PDF de la orden de compra. Se puede dejar sin elegir y fijarlo después en la ficha.</div></div>
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
        valorInicial: l.sku_id ? { sku_id: l.sku_id, etiqueta: l.sku_etiqueta } : null,
        alCambiar: () => refrescarSugerenciaProveedor(productoIdsDeLineas(), 'spoProveedorHint')
      });
    });
    refrescarSugerenciaProveedor(productoIdsDeLineas(), 'spoProveedorHint');

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
    const destinoVal = v('spoDestino');
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
      if (destinoVal) {
        try { await rpc('fn_op_spo_set_destino', { p_id: Number(r.supplier_po_id), p_destino_location_id: Number(destinoVal) }); }
        catch (eDest) { ERP.toast('err', `Compra creada, pero no se pudo fijar el destino: ${esc(eDest.message)}`, 9000); }
      }
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
      [proveedoresCat, sol, destinosCat, proveedoresPorProductoCat] = await Promise.all([
        q('v_catc_contrapartes', '&es_proveedor=eq.true&order=nombre.asc'),
        q('v_op_so_lineas', `&sales_order_id=eq.${Number(soId)}&order=linea_num.asc`),
        q('v_op_destinos', '&activo=eq.true&order=nombre.asc').catch(() => []),
        q('v_catc_proveedores_por_producto').catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel('Generar compra', '', `<div class="errbox">No se pudieron leer las líneas de la venta: ${esc(e.message)}</div>`);
      return;
    }
    if (!sol || !sol.length) {
      ERP.abrirPanel('Generar compra', '', '<div class="errbox">Esta Sales Order no tiene líneas.</div>');
      return;
    }
    acotadoProveedor = true;
    lineasSO = sol.map(l => ({ so_linea_id: l.id, sku: l.sku || l.producto || '', producto_id: l.producto_id ?? null, cantidad: l.cantidad, uom: l.uom, costo_unitario: '', costo_moneda: 'USD' }));

    ERP.abrirPanel('Generar compra', `desde Sales Order <span class="mono">${esc(soFolio || '')}</span>`, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Proveedor <span class="req">*</span></label><div id="spoProveedor"></div>
            <div class="alias-ayuda">Contraparte marcada como proveedor en el Directorio.</div>
            <div class="alias-ayuda" id="spoProveedorHint" style="display:none"></div></div>
          <div class="campo"><label>N° de PO / referencia del proveedor</label>
            <input id="spoNumProveedor" type="text" maxlength="60" placeholder="Ej. EST-1001 (opcional)"></div>
          <div class="campo"><label>Fecha</label>
            <input id="spoFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="spoMoneda">${ERP.MONEDAS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
          <div class="campo ancho"><label>Destino (SHIP TO)</label>
            <select id="spoDestino">${optsDestino(destinosCat)}</select>
            <div class="alias-ayuda">A dónde va la mercancía. Se puede dejar sin elegir y fijarlo después en la ficha.</div></div>
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
    // Aquí el producto de cada línea YA se conoce (heredado de la SO, de solo lectura) — se
    // calcula una sola vez, no hace falta recalcular en cada cambio como en "Nueva compra".
    const pidsDesdeSO = new Set(lineasSO.filter(l => l.producto_id != null).map(l => Number(l.producto_id)));
    refrescarSugerenciaProveedor(pidsDesdeSO, 'spoProveedorHint');
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
    const destinoVal = v('spoDestino');
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
      if (destinoVal) {
        try { await rpc('fn_op_spo_set_destino', { p_id: Number(r.supplier_po_id), p_destino_location_id: Number(destinoVal) }); }
        catch (eDest) { ERP.toast('err', `Compra creada, pero no se pudo fijar el destino: ${esc(eDest.message)}`, 9000); }
      }
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
    let s, lin, docSpo, recLin;
    try {
      [s, lin, docSpo, destinosCat, recLin] = await Promise.all([
        q('v_op_supplier_po', `&supplier_po_id=eq.${Number(id)}`).then(r => r && r[0]),
        q('v_op_spo_lineas', `&supplier_po_id=eq.${Number(id)}&order=linea_num.asc`).catch(() => []),
        q('v_op_spo_documento', `&supplier_po_id=eq.${Number(id)}`).then(r => r && r[0]).catch(() => null),
        q('v_op_destinos', '&activo=eq.true&order=nombre.asc').catch(() => []),
        // D-203: un lote sano + uno retenido por línea con incidencia (antes uno solo) — se lee
        // aparte de v_op_spo_lineas (que solo trae un lot_id/lot_folio, ya no representa el caso
        // partido) para poder mostrar los dos lotes hermanos en la tabla.
        q('v_op_recepcion_lineas', `&supplier_po_id=eq.${Number(id)}`).catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel('Compra', '', `<div class="errbox">No se pudo cargar la compra: ${esc(e.message)}</div>`);
      return;
    }
    if (!s) { ERP.abrirPanel('Compra', '', '<div class="errbox">No se encontró la compra.</div>'); return; }

    const puedeCap = ERP.puede('capturar');
    const lineasF = lin || [];

    // Agrupa las recepciones (D-203) por línea de compra — una línea puede recibirse en varias
    // parcialidades, cada una con su propio par sano/retenido.
    const recPorLinea = new Map();
    (recLin || []).forEach(r => {
      const k = String(r.spo_linea_id);
      if (!recPorLinea.has(k)) recPorLinea.set(k, []);
      recPorLinea.get(k).push(r);
    });
    function celdaRecepcion(l) {
      const recs = recPorLinea.get(String(l.linea_id)) || [];
      if (!recs.length) return l.lot_folio ? `<div class="i3" style="font-size:11px">${esc(l.lot_folio)}</div>` : '';
      return recs.map(r => {
        const chips = [];
        if (r.lot_folio) chips.push(`<span class="i3" style="font-size:11px">Sano <b>${esc(r.lot_folio)}</b> (${esc(ERP.fmt0(r.cantidad_sana))})</span>`);
        if (r.lot_retenido_folio) chips.push(`<span class="i3" style="font-size:11px;color:var(--ambar)">Retenido <b>${esc(r.lot_retenido_folio)}</b> (${esc(ERP.fmt0(r.cantidad_afectada))})</span>`);
        return `<div>${chips.join(' · ') || '—'}</div>`;
      }).join('');
    }

    const filasLineas = lineasF.map(l => {
      const pedido = Number(l.cantidad) || 0;
      const recibido = Number(l.recibido) || 0;
      const pendiente = l.pendiente != null ? Number(l.pendiente) : Math.max(pedido - recibido, 0);
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
        <td>${chipRecepcion(l.estado_recepcion)}${celdaRecepcion(l)}</td>
      </tr>`;
    }).join('');

    // Recepción por calidad (D-201) es a nivel COMPRA (una inspección + varias líneas), no por
    // línea suelta: se ofrece un solo botón "Recibir mercancía" mientras quede algo pendiente.
    const hayPendiente = lineasF.some(l => {
      const ped = Number(l.cantidad) || 0, rec = Number(l.recibido) || 0;
      return (l.pendiente != null ? Number(l.pendiente) : Math.max(ped - rec, 0)) > 0.0001;
    });

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
    const puedeRecibirCompra = puedeCap && estL !== 'cancelado' && hayPendiente;

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
          <div class="det"><span class="l">Destino (SHIP TO)</span><span class="v">${docSpo && docSpo.destino_nombre ? esc(docSpo.destino_nombre) : '<span class="i3">Sin asignar</span>'}</span></div>
          <div class="det"><span class="l">Total costo</span><span class="v mono">${esc(ERP.usd(s.total_costo))}</span></div>
          <div class="det"><span class="l">Adjunto</span><span class="v">${adjuntoHTML(s.adjunto_ref)}</span></div>
        </div>
        ${puedeCap ? `<div class="alias-ayuda" style="margin-top:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span>Cambiar destino:</span>
          <select id="spoDestinoSel" style="height:30px">${optsDestino(destinosCat, docSpo && docSpo.destino_location_id)}</select>
          <button type="button" class="btn-mini gris" id="spoDestinoGuardar" style="height:30px">Guardar destino</button>
        </div>` : ''}
        ${(!docSpo || !docSpo.destino_nombre) ? '<div class="alias-ayuda" style="color:var(--ambar)">Esta compra no tiene destino asignado — el PDF usará la dirección de Plein como SHIP TO por respaldo.</div>' : ''}
        ${s.nota ? `<div class="so-nota"><span class="l">Nota</span> ${esc(s.nota)}</div>` : ''}

        <div class="seccion-head"><h4>Líneas</h4></div>
        <div class="tabla-wrap"><table class="so-tablero">
          <thead><tr><th>#</th><th>SKU</th><th>UOM</th>
            <th class="num">Pedido</th><th class="num">Recibido</th><th class="num">Pendiente</th>
            <th class="num">Costo unit.</th><th>Recepción</th></tr></thead>
          <tbody>${filasLineas || '<tr><td colspan="8" class="vacio">Sin líneas.</td></tr>'}</tbody>
        </table></div>
        <div class="alias-ayuda">"Recibir mercancía" registra la recepción por calidad de toda la compra (una inspección, resultado por línea). La <b>diferencia</b> vs. lo pedido es lo que se coteja contra la factura del proveedor.</div>

        <div class="so-estados">
          ${puedeRecibirCompra ? '<button class="btn-mini" id="spoRecibir">Recibir mercancía</button>' : ''}
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
    const bDestGuardar = document.getElementById('spoDestinoGuardar');
    if (bDestGuardar) bDestGuardar.addEventListener('click', async () => {
      const sel = document.getElementById('spoDestinoSel');
      const val = sel ? sel.value : '';
      bDestGuardar.disabled = true;
      try {
        await rpc('fn_op_spo_set_destino', { p_id: Number(s.supplier_po_id), p_destino_location_id: val ? Number(val) : null });
        ERP.toast('ok', val ? 'Destino actualizado.' : 'Destino quitado.');
        ERP.marcarDatosSucios();
        await recargar();
        verSPO(s.supplier_po_id);
      } catch (e) {
        if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', 'No se pudo cambiar el destino: ' + esc(e.message), 9000);
        bDestGuardar.disabled = false;
      }
    });
    const bRecibir = document.getElementById('spoRecibir');
    if (bRecibir) bRecibir.addEventListener('click', () => abrirRecepcion(s));
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

  /** SHIP TO real (D-198): v_op_spo_documento trae destino_nombre/tipo/direccion/ciudad/estado/
      pais/contacto/telefono cuando la compra tiene un destino asignado (fn_op_spo_set_destino).
      Sin destino asignado, cae a la dirección de Plein (dato real conocido, no inventado) — el
      aviso suave para elegir destino vive en la ficha, no aquí. */
  function cajaShipTo(po) {
    if (!po.destino_nombre) return ERP.opDocumentos.bloqueEmpresaPleinPdf();
    return [
      po.destino_nombre,
      po.destino_direccion || '',
      [po.destino_ciudad, po.destino_estado, po.destino_pais].filter(Boolean).join(', '),
      [po.destino_contacto, po.destino_telefono].filter(Boolean).join(' · ')
    ].filter(Boolean);
  }

  async function construirOcPdfBlob(po) {
    // Estructura tomada de Purchase Order Template.docx (D-197): BILL TO (Plein, quien paga) y
    // SHIP TO (destino real de la mercancía, D-198 — ver cajaShipTo) — NO "VENDOR" como caja
    // propia, ese formato es de las plantillas oficiales de Invoice/Quote/PO reusadas tal cual.
    // El proveedor se identifica en el meta (fila VENDOR) — no hace falta repetirle su propia
    // dirección/RFC de vuelta en el documento que le mandamos.
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
      cajaDer: { titulo: 'SHIP TO', lineas: cajaShipTo(po) },
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
      // Cascada (D-201): el backend anula documentos + marca envíos huérfanos y devuelve
      // archivos_a_borrar[] (storage_path). El backend NO borra de Storage (Supabase lo bloquea);
      // el frontend cierra el ciclo. Si algún archivo falla al borrar, se avisa pero NO se
      // considera fallida la eliminación de la compra (que ya ocurrió en la base).
      const r = uno(await rpc('fn_op_spo_eliminar', { p_id: Number(s.supplier_po_id) }));
      let extra = '';
      const archivos = (r && r.archivos_a_borrar) || [];
      if (Array.isArray(archivos) && archivos.length) {
        const res = await ERP.opDocumentos.borrarDeStorage(archivos);
        extra = res.fallidos.length
          ? ` (${res.borrados} archivo(s) borrado(s); ${res.fallidos.length} no se pudieron borrar del bucket)`
          : ` y ${res.borrados} archivo(s) del bucket`;
      }
      ERP.toast('ok', `Compra <b>${esc(s.folio || '')}</b> eliminada${extra}.`);
      ERP.marcarDatosSucios();
      await recargar();
      ERP.cerrarPanel();
    } catch (e) {
      // El backend bloquea con mensaje legible si ya hay líneas recibidas — se muestra tal cual,
      // es información útil, no un error genérico.
      if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', esc(e.message), 9000);
    }
  }

  /* ================= Recepción por calidad (D-201) =================
     Reemplaza el modal viejo "Recibir línea" (cantidad + ubicación con búsqueda libre — cuyo
     catálogo salía de v_op_inventario, por eso un destino nuevo sin stock nunca aparecía: bug
     TAREA-3, resuelto al desaparecer ese picker). Ahora es UNA recepción por compra que entiende
     calidad (PACA): una inspección + "¿descargó?" + destino heredado del propio destino de la
     compra, y por línea un resultado (Aceptada / Aceptada con incidencia / Rechazada).
       fn_op_recepcion_registrar(p_supplier_po_id, p_lineas jsonb, p_fecha, p_location_id,
         p_inspeccion_tipo, p_inspeccion_folio, p_inspeccion_fecha, p_descargada, p_nota)
       p_lineas = [{spo_linea_id, cantidad, afectada, resultado, defecto_tipo, defecto_motivo, nota}]
     Efectos (los aplica el backend, aquí solo se reflejan): Aceptada→lote Sano (+auto-asigna si la
     línea venía ligada a SO); Aceptada con incidencia→lote Retenido (NO asignable); Rechazada→sin
     lote, no suma a recibido. El rechazo es SIEMPRE por línea completa (nunca una fracción). Si se
     registra un rechazo con la carga ya descargada, el backend devuelve `advertencia` (texto
     legal) — se MUESTRA, no se esconde; es informativo, no bloquea. */

  const INSPECCION_TIPOS = ['Ninguna', 'Propia', 'USDA', 'Federal-Estatal', 'Privada'];
  const RESULTADOS_REC = ['Aceptada', 'Aceptada con incidencia', 'Rechazada'];
  let recLineas = [], recDefectos = { calidad: [], condicion: [] }, recDestinosCat = [], recHereda = null;

  function optsDefecto(tipo, sel) {
    const vals = tipo === 'condicion' ? recDefectos.condicion : recDefectos.calidad;
    return '<option value="">— elige motivo —</option>' +
      vals.map(v => `<option value="${esc(v)}" ${sel === v ? 'selected' : ''}>${esc(v)}</option>`).join('');
  }

  function recFilaHTML(l, i) {
    const esInc = l.resultado === 'Aceptada con incidencia';
    const esRech = l.resultado === 'Rechazada';
    return `<div class="rec-linea" data-i="${i}">
      <div class="rec-linea-top">
        <div class="rec-sku"><div class="nm">${esc(l.sku || '—')}</div>
          <div class="rec-mut">Pedido ${esc(ERP.fmt0(l.pedido))} · recibido ${esc(ERP.fmt0(l.recibido))} · <b>pendiente ${esc(ERP.fmt0(l.pendiente))}</b> ${esc(l.uom || '')}</div></div>
        <select class="rec-f" data-i="${i}" data-k="resultado" style="max-width:210px">
          <option value="">— no recibir ahora —</option>
          ${RESULTADOS_REC.map(r => `<option value="${esc(r)}" ${l.resultado === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
        </select>
      </div>
      ${l.resultado ? `<div class="rec-linea-det">
        <div class="rec-campo"><label>Cantidad ${esRech ? '(línea completa)' : 'recibida'}</label>
          <input class="rec-f mono" data-i="${i}" data-k="cantidad" type="number" step="0.01" min="0" value="${esc(l.cantidad)}" ${esRech ? 'disabled' : ''}></div>
        ${esInc ? `
          <div class="rec-campo"><label>Viene afectada <span class="req">*</span></label>
            <input class="rec-f mono" data-i="${i}" data-k="afectada" type="number" step="0.01" min="0" value="${esc(l.afectada)}" placeholder="0"></div>
          <div class="rec-campo"><label>Tipo de defecto <span class="req">*</span></label>
            <select class="rec-f" data-i="${i}" data-k="defecto_tipo">
              <option value="">— elige —</option>
              <option value="calidad" ${l.defecto_tipo === 'calidad' ? 'selected' : ''}>Calidad</option>
              <option value="condicion" ${l.defecto_tipo === 'condicion' ? 'selected' : ''}>Condición</option>
            </select></div>
          <div class="rec-campo ancho"><label>Motivo <span class="req">*</span></label>
            <select class="rec-f" data-i="${i}" data-k="defecto_motivo" ${l.defecto_tipo ? '' : 'disabled'}>${optsDefecto(l.defecto_tipo, l.defecto_motivo)}</select></div>` : ''}
        <div class="rec-campo ancho"><label>Nota${esRech ? ' (motivo del rechazo)' : ''}</label>
          <input class="rec-f" data-i="${i}" data-k="nota" type="text" value="${esc(l.nota)}" placeholder="${esRech ? 'Ej. temperatura de arribo fuera de rango' : 'opcional'}"></div>
      </div>` : ''}
    </div>`;
  }

  function recPintarLineas() {
    const body = document.getElementById('recLineasBody');
    if (!body) return;
    body.innerHTML = recLineas.map((l, i) => recFilaHTML(l, i)).join('');
    body.querySelectorAll('.rec-f').forEach(el => {
      const ev = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, e => {
        const i = Number(e.target.dataset.i), k = e.target.dataset.k;
        recLineas[i][k] = e.target.value;
        if (k === 'resultado') {
          // Rechazo = línea completa: la cantidad se fija al pendiente y no se edita.
          if (e.target.value === 'Rechazada') recLineas[i].cantidad = recLineas[i].pendiente;
          if (e.target.value !== 'Aceptada con incidencia') { recLineas[i].afectada = ''; recLineas[i].defecto_tipo = ''; recLineas[i].defecto_motivo = ''; }
          recPintarLineas();
        } else if (k === 'defecto_tipo') {
          recLineas[i].defecto_motivo = '';
          recPintarLineas();
        }
      });
    });
  }

  function recAviso(tipo, html) {
    const el = document.getElementById('recAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function abrirRecepcion(s) {
    if (!ERP.puede('capturar')) return;
    ERP.cerrarPanel();
    ERP.abrirPanel('Recibir mercancía', `${esc(s.folio || '')} · ${esc(s.proveedor || '')}`, '<div class="skel">Cargando líneas e inspección…</div>');
    let lin, doc, defs;
    try {
      [lin, doc, defs, recDestinosCat] = await Promise.all([
        q('v_op_spo_lineas', `&supplier_po_id=eq.${Number(s.supplier_po_id)}&order=linea_num.asc`),
        q('v_op_spo_documento', `&supplier_po_id=eq.${Number(s.supplier_po_id)}`).then(r => r && r[0]).catch(() => null),
        q('v_catc_listas_valores', '&tipo=in.(defecto_calidad,defecto_condicion)&order=tipo.asc,orden.asc,valor.asc').catch(() => []),
        q('v_op_destinos', '&activo=eq.true&order=nombre.asc').catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel('Recibir mercancía', '', `<div class="errbox">No se pudo preparar la recepción: ${esc(e.message)}</div>`);
      return;
    }
    recDefectos = { calidad: [], condicion: [] };
    (defs || []).filter(v => v.activo !== false).forEach(v => {
      if (v.tipo === 'defecto_calidad') recDefectos.calidad.push(v.valor);
      else if (v.tipo === 'defecto_condicion') recDefectos.condicion.push(v.valor);
    });

    const pendientes = (lin || []).map(l => {
      const pedido = Number(l.cantidad) || 0, recibido = Number(l.recibido) || 0;
      const pendiente = l.pendiente != null ? Number(l.pendiente) : Math.max(pedido - recibido, 0);
      return { linea_id: l.linea_id, sku: l.sku || l.producto || '', uom: l.uom || '', pedido, recibido, pendiente,
        resultado: '', cantidad: pendiente, afectada: '', defecto_tipo: '', defecto_motivo: '', nota: '' };
    }).filter(l => l.pendiente > 0.0001);

    if (!pendientes.length) {
      ERP.abrirPanel('Recibir mercancía', '', '<div class="errbox">Esta compra ya no tiene líneas pendientes de recibir.</div>');
      return;
    }
    recLineas = pendientes;

    // Ubicación (SHIP TO): se hereda del destino de la compra (v_op_spo_documento). Solo si la
    // compra no tiene destino asignado se pide uno — y del catálogo CORRECTO (v_op_destinos, no
    // del inventario, que era el bug del picker viejo).
    recHereda = doc && doc.destino_location_id != null
      ? { id: doc.destino_location_id, nombre: doc.destino_nombre || `Ubicación ${doc.destino_location_id}` } : null;

    ERP.abrirPanel('Recibir mercancía', `${esc(s.folio || '')} · ${esc(s.proveedor || '')}`, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo"><label>Fecha de recepción</label><input id="recFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>¿Ya se descargó la carga?</label>
            <label class="rec-check"><input type="checkbox" id="recDescargada" checked> Sí, la mercancía ya bajó del transporte</label></div>
        </div>
        ${recHereda
          ? `<div class="alias-ayuda">Entra a <b>${esc(recHereda.nombre)}</b> (destino de la compra). Para cambiarlo, edita el destino en la ficha de la compra.</div>`
          : `<div class="campo ancho"><label>Destino (SHIP TO) <span class="req">*</span></label>
              <select id="recDestino"><option value="">— elige destino —</option>${recDestinosCat.map(d => `<option value="${esc(d.location_id)}">${esc(d.nombre)}${d.tipo_etiqueta ? ` (${esc(d.tipo_etiqueta)})` : ''}</option>`).join('')}</select>
              <div class="alias-ayuda">Esta compra no tiene destino asignado — elige a dónde entra la mercancía.</div></div>`}

        <div class="seccion-head"><h4>Inspección</h4></div>
        <div class="campos">
          <div class="campo"><label>Tipo</label>
            <select id="recInspTipo">${INSPECCION_TIPOS.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}</select></div>
          <div class="campo"><label>Folio de inspección</label><input id="recInspFolio" type="text" maxlength="60" placeholder="opcional"></div>
          <div class="campo"><label>Fecha de inspección</label><input id="recInspFecha" type="date"></div>
        </div>

        <div class="seccion-head"><h4>Líneas — resultado por producto</h4></div>
        <div class="alias-ayuda" style="margin-bottom:8px">Aceptada → nace lote sano. <b>Aceptada con incidencia</b> → nace lote retenido (no se puede vender hasta liberarlo). <b>Rechazada</b> → no nace lote (línea completa, nunca una fracción). Deja "no recibir ahora" lo que aún no llega.</div>
        <div id="recLineasBody"></div>

        <div class="campo ancho" style="margin-top:12px"><label>Nota general de la recepción</label><textarea id="recNota" rows="2"></textarea></div>
        <div class="acciones">
          <button class="btn-mini" id="recGuardar">Registrar recepción</button>
          <button class="btn-mini gris" id="recCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="recAviso"></div>
      </div>`);

    recPintarLineas();
    document.getElementById('recInspTipo').addEventListener('change', e => {
      // "Ninguna" no necesita folio/fecha — se dejan pero no estorban; no se fuerza nada.
      const off = e.target.value === 'Ninguna';
      document.getElementById('recInspFolio').disabled = off;
      document.getElementById('recInspFecha').disabled = off;
    });
    document.getElementById('recInspTipo').dispatchEvent(new Event('change'));
    document.getElementById('recCancelar').addEventListener('click', () => verSPO(s.supplier_po_id));
    document.getElementById('recGuardar').addEventListener('click', () => registrarRecepcion(s));
  }

  async function registrarRecepcion(s) {
    const val = id => (document.getElementById(id) || {}).value;
    const activas = recLineas.filter(l => l.resultado);
    if (!activas.length) { recAviso('err', 'Elige un resultado en al menos una línea (o "no recibir ahora" en todas para cancelar).'); return; }

    for (const l of activas) {
      if (l.resultado !== 'Rechazada' && !(Number(l.cantidad) > 0)) { recAviso('err', `La cantidad recibida de "${esc(l.sku)}" debe ser mayor a cero.`); return; }
      if (l.resultado === 'Aceptada con incidencia') {
        if (!(Number(l.afectada) > 0)) { recAviso('err', `Captura cuánto viene afectado en "${esc(l.sku)}".`); return; }
        if (Number(l.afectada) > Number(l.cantidad) + 1e-9) { recAviso('err', `Lo afectado no puede ser mayor que lo recibido en "${esc(l.sku)}".`); return; }
        if (!l.defecto_tipo) { recAviso('err', `Elige el tipo de defecto en "${esc(l.sku)}".`); return; }
        if (!l.defecto_motivo) { recAviso('err', `Elige el motivo del defecto en "${esc(l.sku)}".`); return; }
      }
    }

    let p_location_id = null;
    if (!recHereda) {
      const d = val('recDestino');
      if (!d) { recAviso('err', 'Elige el destino de la mercancía.'); return; }
      p_location_id = Number(d);
    }

    const inspTipo = val('recInspTipo') || 'Ninguna';
    const p_lineas = activas.map(l => ({
      spo_linea_id: Number(l.linea_id),
      cantidad: l.resultado === 'Rechazada' ? Number(l.pendiente) : Number(l.cantidad),
      afectada: l.resultado === 'Aceptada con incidencia' ? Number(l.afectada) : null,
      resultado: l.resultado,
      defecto_tipo: l.resultado === 'Aceptada con incidencia' ? l.defecto_tipo : null,
      defecto_motivo: l.resultado === 'Aceptada con incidencia' ? l.defecto_motivo : null,
      nota: (l.nota || '').trim() || null
    }));

    const btn = document.getElementById('recGuardar');
    btn.disabled = true;
    recAviso('warn', 'Registrando recepción…');
    try {
      const r = uno(await rpc('fn_op_recepcion_registrar', {
        p_supplier_po_id: Number(s.supplier_po_id),
        p_lineas,
        p_fecha: val('recFecha') || null,
        p_location_id,
        p_inspeccion_tipo: inspTipo,
        p_inspeccion_folio: (val('recInspFolio') || '').trim() || null,
        p_inspeccion_fecha: (inspTipo !== 'Ninguna' && val('recInspFecha')) ? val('recInspFecha') : null,
        p_descargada: !!(document.getElementById('recDescargada') || {}).checked,
        p_nota: (val('recNota') || '').trim() || null
      }));

      // Conteos por resultado a partir de lo ENVIADO (siempre correctos, no dependen del jsonb).
      const nAcep = p_lineas.filter(l => l.resultado === 'Aceptada').length;
      const nInc = p_lineas.filter(l => l.resultado === 'Aceptada con incidencia').length;
      const nRech = p_lineas.filter(l => l.resultado === 'Rechazada').length;
      const partes = [];
      if (nAcep) partes.push(`${nAcep} aceptada(s)`);
      if (nInc) partes.push(`${nInc} con incidencia`);
      if (nRech) partes.push(`${nRech} rechazada(s)`);
      // Detalle sano/retenido por línea con incidencia (D-203): ya NO nace un solo lote retenido
      // con todo — nace un lote SANO (cantidad_sana) + uno RETENIDO (cantidad_retenida), salvo que
      // todo venga afectado (entonces solo hay retenido). Se arma de lo que DEVUELVE la RPC.
      const lnsResp = (r && (r.lineas || r.resultado_lineas || r.lotes)) || [];
      const detalleInc = (Array.isArray(lnsResp) ? lnsResp : []).map(x => {
        if (!x) return '';
        const bloques = [];
        if (x.lot_sano_folio) bloques.push(`${esc(ERP.fmt0(x.cantidad_sana))} sanas (<b>${esc(x.lot_sano_folio)}</b>)`);
        if (x.lot_retenido_folio) bloques.push(`${esc(ERP.fmt0(x.cantidad_retenida))} retenidas (<b>${esc(x.lot_retenido_folio)}</b>)`);
        return bloques.join(' · ');
      }).filter(Boolean);
      let msg = `Recepción registrada — ${partes.join(', ')}.` + (detalleInc.length ? ` ${detalleInc.join(' | ')}.` : '');
      ERP.toast('ok', msg, 9000);

      ERP.marcarDatosSucios();
      await recargar();
      // Advertencia legal (rechazo con carga ya descargada): se muestra persistente en la ficha.
      // Hay que ESPERAR a que verSPO reconstruya el panel; si no, fichaAviso pinta sobre el panel
      // viejo y verSPO lo borra al rearmar (bug detectado en verificación).
      const adv = r && r.advertencia;
      await verSPO(s.supplier_po_id);
      if (adv) fichaAviso('warn', `<b>Aviso:</b> ${esc(adv)}`);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      recAviso('err', `El ERP rechazó la recepción: ${esc(e.message)}`);
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
