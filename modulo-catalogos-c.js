/* Módulo Catálogos (ruta 'catalogos-c') — CAMINO C · directorio maestro (Parte B).
   Master-detail (lista 320px + detalle), 3 pestañas Productos/Proveedores/Clientes, sobre el
   modelo SKU del schema cat.* (ver SPEC-CATALOGOS-BACKEND.md — lo aplica el chat de backend).
   Portado de catalogos-completo.html a los tokens reales del proyecto (tokens.css, dark-aware).

   Responsive (Fase 2, D-195): en móvil (<=640px) el master-detail se vuelve navegación de 2 pasos
   — lista o ficha, nunca ambas a la vez. #catcSplit gana/pierde .detalle-abierta vía
   mostrarDetalleMovil()/ocultarDetalleMovil() (CSS en estilos.css hace el display real). Botón
   "Volver a la lista" (#catcVolver) siempre presente, visible solo en móvil. Tablas del detalle
   (matriz de SKU, papelera) usan ERP.marcarTabla($det()) — patrón tabla→tarjeta de D-193.

   SOLO FRONTEND. Lee por vistas public.v_catc_*, escribe por RPCs public.fn_cat_* (SECURITY DEFINER).
   NO toca el modulo-catalogos.js viejo (Directorio Comercial) ni sus tablas vivas.

   Contrato consumido (SPEC-CATALOGOS-BACKEND.md §7):
     Lectura: v_catc_productos, v_catc_variedades, v_catc_skus, v_catc_sku_etiqueta,
       v_catc_producto_proveedores, v_catc_sku_clientes, v_catc_contrapartes, v_catc_contactos,
       v_catc_contraparte_skus, v_catc_listas_valores, v_catc_papelera.
     Escritura: fn_cat_* (alta/editar/eliminar/restaurar, vincular/desvincular, lista_valor, import). */

(function () {
  'use strict';
  const { q, rpc, esc, usd } = ERP;

  const puedeCap = () => ERP.puede('capturar');
  const uno = d => Array.isArray(d) ? (d[0] || {}) : (d || {});
  const num = v => (v === null || v === undefined || v === '') ? null : Number(v);
  const inicial = s => String(s || '?').trim().charAt(0).toUpperCase();
  const iniciales = s => String(s || '?').trim().split(/\s+/).slice(0, 2).map(w => w.charAt(0)).join('').toUpperCase() || '?';
  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesOpts = sel => '<option value="">—</option>' + MESES.map((m, i) => `<option value="${i + 1}"${Number(sel) === i + 1 ? ' selected' : ''}>${m}</option>`).join('');

  async function existeNombre(vista, nombre) {
    const filas = await q(vista, '&order=nombre.asc').catch(() => []);
    const n = ERP.norm(nombre);
    return (filas || []).some(x => ERP.norm(x.nombre) === n);
  }
  async function confirmarSiDuplicado(vista, nombre) {
    if (!(await existeNombre(vista, nombre))) return true;
    return confirm(`Ya existe "${nombre}". ¿Crear otro de todas formas?`);
  }

  /* ================= Selector de tags múltiples (tipo_contraparte) ================= */
  function chipsTagPicker(idBase, seleccionados) {
    const sel = new Set((seleccionados || []).map(String));
    const ro = !puedeCap();
    return `<div class="catc-tagpick${ro ? ' ro' : ''}" id="${idBase}">
      ${(listas.tipo_contraparte || []).map(t => `<span class="${sel.has(t) ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</span>`).join('')}
      ${ro ? '' : '<span class="add" data-tagnew><i class="ti ti-plus"></i>otro…</span>'}
    </div>${ro ? '' : `<div id="${idBase}_new" style="display:none;margin-top:6px"></div>`}`;
  }
  function wireTagPicker(idBase) {
    const cont = document.getElementById(idBase);
    if (!cont) return;
    cont.querySelectorAll('[data-tag]').forEach(s => s.addEventListener('click', () => s.classList.toggle('on')));
    const addBtn = cont.querySelector('[data-tagnew]');
    if (!addBtn) return;
    addBtn.addEventListener('click', () => {
      const newBox = document.getElementById(idBase + '_new');
      newBox.style.display = 'block';
      newBox.innerHTML = `<span class="catc-hint">Nuevo tipo:</span> <input id="${idBase}_nv" style="height:28px;width:150px;margin:0 6px;display:inline-block"><button class="catc-act" id="${idBase}_nvadd" style="height:28px">Agregar</button>`;
      document.getElementById(idBase + '_nvadd').addEventListener('click', async () => {
        const val = (document.getElementById(idBase + '_nv').value || '').trim();
        if (!val) return;
        try {
          await rpc('fn_cat_lista_valor_alta', { p_tipo: 'tipo_contraparte', p_valor: val });
          ERP.limpiarCache();
          listas.tipo_contraparte = listas.tipo_contraparte || []; if (!listas.tipo_contraparte.includes(val)) listas.tipo_contraparte.push(val);
          const s = document.createElement('span'); s.textContent = val; s.dataset.tag = val; s.classList.add('on');
          s.addEventListener('click', () => s.classList.toggle('on'));
          cont.insertBefore(s, addBtn);
          newBox.style.display = 'none';
          ERP.toast('ok', `«${esc(val)}» agregado a la lista`);
        } catch (e) { ERP.toast('err', 'No se pudo agregar: ' + esc(e.message)); }
      });
    });
  }
  function leerTags(idBase) {
    const cont = document.getElementById(idBase);
    return cont ? Array.from(cont.querySelectorAll('[data-tag].on')).map(s => s.dataset.tag) : [];
  }

  // Campos canónicos por entidad (= encabezados de las plantillas .xlsx, sin " *").
  const CAMPOS_IMPORT = {
    productos: ['nombre', 'codigo_item', 'categoria', 'pais_origen', 'organico', 'temporada_desde', 'temporada_hasta', 'estado', 'nota'],
    skus: ['producto', 'variedad', 'empaque', 'peso_neto', 'unidad_peso', 'peso_bruto', 'calibre', 'tamano', 'grado', 'marca', 'gtin', 'plu', 'cajas_por_tarima', 'patron_estiba', 'temperatura_c', 'vida_anaquel_dias', 'es_reempaque', 'costo_caja_ref', 'precio_caja_ref', 'estado', 'nota'],
    contrapartes: ['nombre', 'razon_social', 'es_cliente', 'es_proveedor', 'rfc_tax_id', 'paca_licencia', 'certificaciones', 'pais', 'ciudad', 'direccion_facturacion', 'direccion_envio', 'dias_credito', 'limite_credito', 'pct_anticipo', 'metodo_pago', 'moneda', 'contacto_nombre', 'contacto_rol', 'email', 'telefono_whatsapp', 'email_facturacion', 'estado', 'nota']
  };
  const PLANTILLA = { productos: 'plantilla_productos.xlsx', skus: 'plantilla_skus_presentaciones.xlsx', contrapartes: 'plantilla_contrapartes.xlsx' };
  // Campos que existen en la plantilla/export pero el RPC de import correspondiente no acepta —
  // se ocultan solo del mapeo (no del export, que sigue leyendo la vista completa).
  const CAMPOS_IMPORT_IGNORAR = { skus: ['estado', 'nota'] };
  const camposMapeo = entidad => CAMPOS_IMPORT[entidad].filter(c => !(CAMPOS_IMPORT_IGNORAR[entidad] || []).includes(c));

  /* ================= Estado ================= */
  let tab = 'prod';       // 'prod' | 'prov' | 'cli'
  let selId = null;
  let skuMode = 'cards';  // 'cards' | 'matriz'
  let fTexto = '';
  let fTipo = '';         // filtro por tipo_contraparte en pestañas Proveedores/Clientes
  let listaActual = [];   // filas de la pestaña activa
  let listas = null;      // { empaque:[], calibre:[], grado:[], unidad:[], categoria:[] } (cache)
  let det = null;         // bundle del registro seleccionado

  const esProd = () => tab === 'prod';
  const nuevoLabel = () => tab === 'prod' ? 'Nuevo producto' : tab === 'prov' ? 'Nuevo proveedor' : 'Nuevo cliente';

  /* ================= Carga de datos ================= */
  async function cargarListas() {
    if (listas) return listas;
    const filas = await q('v_catc_listas_valores', '&order=tipo.asc,orden.asc,valor.asc').catch(() => []);
    const l = { empaque: [], calibre: [], grado: [], unidad: [], categoria: [], tipo_contraparte: [], tamano: [] };
    (filas || []).filter(v => v.activo !== false).forEach(v => { if (l[v.tipo]) l[v.tipo].push(v.valor); });
    listas = l;
    return listas;
  }

  async function cargarLista() {
    if (esProd()) return q('v_catc_productos', '&order=nombre.asc');
    const filtro = tab === 'prov' ? '&es_proveedor=eq.true' : '&es_cliente=eq.true';
    return q('v_catc_contrapartes', filtro + '&order=nombre.asc');
  }

  async function cargarDetalleProducto(id) {
    const [variedades, skus, proveedores, clientes] = await Promise.all([
      q('v_catc_variedades', `&producto_id=eq.${id}&order=nombre.asc`).catch(() => []),
      q('v_catc_skus', `&producto_id=eq.${id}&order=id.asc`).catch(() => []),
      q('v_catc_producto_proveedores', `&producto_id=eq.${id}`).catch(() => []),
      q('v_catc_producto_clientes', `&producto_id=eq.${id}`).catch(() => [])
    ]);
    let skuClientes = [];
    const ids = (skus || []).map(s => s.id);
    if (ids.length) skuClientes = await q('v_catc_sku_clientes', `&sku_id=in.(${ids.join(',')})`).catch(() => []);
    return { variedades: variedades || [], skus: skus || [], proveedores: proveedores || [], skuClientes: skuClientes || [], clientesProducto: clientes || [] };
  }

  async function cargarDetalleContraparte(id) {
    const [contactos, skus] = await Promise.all([
      q('v_catc_contactos', `&contraparte_id=eq.${id}&order=id.asc`).catch(() => []),
      q('v_catc_contraparte_skus', `&contraparte_id=eq.${id}`).catch(() => [])
    ]);
    return { contactos: contactos || [], skus: skus || [] };
  }

  /* ================= Render base ================= */
  async function render(cont) {
    await cargarListas();
    let filas;
    try {
      filas = await cargarLista();
    } catch (e) {
      cont.innerHTML = `<div class="pantalla-catalogos-c"><div class="errbox">
        No se pudo leer el catálogo: ${esc(e.message)}<br>
        <span class="catc-hint">Si el módulo Catálogos aún no está aplicado en el backend (schema <b>cat.*</b>), pídele al chat de backend que aplique <b>SPEC-CATALOGOS-BACKEND.md</b>.</span>
      </div></div>`;
      return;
    }
    listaActual = filas || [];
    if (!listaActual.some(x => String(x.id) === String(selId))) selId = listaActual.length ? listaActual[0].id : null;

    cont.innerHTML = `<div class="pantalla-catalogos-c">
      <div class="catc-tabs">
        <button data-tab="prod" class="${tab === 'prod' ? 'on' : ''}"><i class="ti ti-box"></i>Productos</button>
        <button data-tab="prov" class="${tab === 'prov' ? 'on' : ''}"><i class="ti ti-tractor"></i>Proveedores</button>
        <button data-tab="cli" class="${tab === 'cli' ? 'on' : ''}"><i class="ti ti-building-store"></i>Clientes</button>
        <span class="grow"></span>
        <button class="catc-ic" id="catcDestinos" title="Destinos: bodegas propias, de cliente, de proveedor, cross-dock"><i class="ti ti-map-pin"></i><span>Destinos</span></button>
        <button class="catc-ic" id="catcListas" title="Listas de valores (empaque, calibre, grado…)"><i class="ti ti-list-details"></i><span>Listas</span></button>
        <button class="catc-ic" id="catcPapelera" title="Ver eliminados y restaurar"><i class="ti ti-trash"></i><span>Papelera</span></button>
      </div>
      <div class="catc-split" id="catcSplit">
        <div class="catc-list">
          <div class="catc-lh">
            <div class="catc-sb"><i class="ti ti-search"></i><input id="catcBuscar" type="search" placeholder="Buscar" value="${esc(fTexto)}"></div>
            ${!esProd() ? `<select id="catcFiltroTipo"><option value="">Todos los tipos</option>${(listas.tipo_contraparte || []).map(t => `<option value="${esc(t)}" ${fTipo === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` : ''}
            <div class="catc-lh-btns">
              <div class="catc-lh-fila">
                ${puedeCap() ? `<button class="btn-mini" id="catcNuevo"><i class="ti ti-plus"></i>${esc(nuevoLabel())}</button>` : ''}
              </div>
              <div class="catc-lh-fila">
                ${puedeCap() ? `<button class="btn-mini gris" id="catcImportar"><i class="ti ti-file-spreadsheet"></i>Importar</button>` : ''}
                <button class="btn-mini gris" id="catcExportar" title="Bajar este catálogo en .xlsx"><i class="ti ti-file-export"></i>Exportar</button>
              </div>
            </div>
          </div>
          <div class="catc-rows" id="catcRows"></div>
        </div>
        <div class="catc-detail-wrap">
          <button type="button" class="catc-volver" id="catcVolver"><i class="ti ti-arrow-left"></i>Volver a la lista</button>
          <div class="catc-detail" id="catcDetail"></div>
        </div>
      </div>
    </div>`;

    cont.querySelectorAll('.catc-tabs button[data-tab]').forEach(b => b.addEventListener('click', () => cambiarTab(b.dataset.tab)));
    document.getElementById('catcDestinos').addEventListener('click', () => { vistaDestinos(); mostrarDetalleMovil(); });
    document.getElementById('catcListas').addEventListener('click', () => { vistaListas(); mostrarDetalleMovil(); });
    document.getElementById('catcPapelera').addEventListener('click', () => { vistaPapelera(); mostrarDetalleMovil(); });
    document.getElementById('catcVolver').addEventListener('click', ocultarDetalleMovil);
    document.getElementById('catcBuscar').addEventListener('input', e => { fTexto = e.target.value; pintarRows(); });
    const selTipo = document.getElementById('catcFiltroTipo');
    if (selTipo) selTipo.addEventListener('change', e => { fTipo = e.target.value; pintarRows(); });
    const bNuevo = document.getElementById('catcNuevo');
    if (bNuevo) bNuevo.addEventListener('click', () => { crearNuevo(); mostrarDetalleMovil(); });
    const bImp = document.getElementById('catcImportar');
    if (bImp) bImp.addEventListener('click', () => { vistaImportar(); mostrarDetalleMovil(); });
    document.getElementById('catcExportar').addEventListener('click', exportarExcel);

    pintarRows();
    abrirDetalle(selId);
  }

  /* Navegación de 2 pasos en móvil (Bug 2, Fase 2 · D-195): .catc-split gana/pierde la clase
     .detalle-abierta; el display real (lista vs. ficha a ancho completo) vive en el CSS bajo
     @media(max-width:640px) — en desktop/tablet estas clases no tienen efecto (split lado a lado
     de siempre). Se resetea a "lista" en cada render()/cambio de pestaña porque el template se
     reconstruye entero (la clase nueva no trae 'detalle-abierta'). */
  function mostrarDetalleMovil() {
    const split = document.getElementById('catcSplit');
    if (split) split.classList.add('detalle-abierta');
  }
  function ocultarDetalleMovil() {
    const split = document.getElementById('catcSplit');
    if (split) split.classList.remove('detalle-abierta');
  }

  async function cambiarTab(t) {
    tab = t; selId = null; fTexto = ''; fTipo = '';
    await render(document.getElementById('modContenido'));
  }

  async function recargarLista() {
    try { listaActual = (await cargarLista()) || []; } catch (_) { /* la vista muestra su error */ }
    pintarRows();
  }

  function filtradas() {
    let rows = listaActual;
    if (!esProd() && fTipo) rows = rows.filter(x => Array.isArray(x.tipos) && x.tipos.includes(fTipo));
    const t = ERP.norm(fTexto);
    if (!t) return rows;
    return rows.filter(x => [x.nombre, x.codigo_item, x.ciudad, x.categoria].some(v => ERP.norm(v).includes(t)));
  }

  function pintarRows() {
    const cont = document.getElementById('catcRows');
    if (!cont) return;
    const rows = filtradas();
    if (!rows.length) { cont.innerHTML = '<div class="catc-hint" style="padding:16px">Nada coincide. Crea uno con el botón de arriba.</div>'; return; }
    cont.innerHTML = rows.map(x => {
      const on = String(x.id) === String(selId) ? ' on' : '';
      if (esProd()) {
        return `<div class="catc-row${on}" data-id="${esc(x.id)}">
          <div class="catc-av">${esc(inicial(x.nombre))}</div>
          <div class="catc-rt"><div class="nm">${esc(x.nombre || '—')}</div>
            <div class="mt">${esc(x.n_skus ?? 0)} SKU · ${esc(x.categoria || 'sin categoría')}</div></div>
        </div>`;
      }
      return `<div class="catc-row${on}" data-id="${esc(x.id)}">
        <div class="catc-av">${esc(iniciales(x.nombre))}</div>
        <div class="catc-rt"><div class="nm">${esc(x.nombre || '—')}</div>
          <div class="mt">${esc([x.ciudad, x.pais].filter(Boolean).join(', ') || '—')}</div></div>
      </div>`;
    }).join('');
    cont.querySelectorAll('.catc-row[data-id]').forEach(r => r.addEventListener('click', () => {
      selId = r.dataset.id; pintarRows(); abrirDetalle(selId); mostrarDetalleMovil();
    }));
  }

  const $det = () => document.getElementById('catcDetail');
  function detHint(txt) { const d = $det(); if (d) d.innerHTML = `<div class="catc-hint" style="padding:22px">${esc(txt)}</div>`; }

  async function abrirDetalle(id) {
    if (id == null) { detHint(esProd() ? 'Selecciona un producto.' : 'Selecciona una empresa.'); return; }
    const reg = listaActual.find(x => String(x.id) === String(id));
    if (!reg) { detHint('Selecciona un registro.'); return; }
    const d = $det(); if (d) d.innerHTML = '<div class="skel" style="padding:22px">Cargando…</div>';
    try {
      if (esProd()) { det = { reg, ...(await cargarDetalleProducto(id)) }; detProducto(); }
      else { det = { reg, ...(await cargarDetalleContraparte(id)) }; detContraparte(); }
    } catch (e) {
      detHint('No se pudo cargar el detalle: ' + e.message);
    }
  }

  /* ================= Ficha de PRODUCTO ================= */
  function pillEstado(estado) {
    const on = String(estado || 'activo').toLowerCase() === 'activo';
    return `<span class="catc-pill ${on ? 'ok' : 'off'}"><span class="catc-dot"></span>${esc(estado || 'activo')}</span>`;
  }

  function tituloSku(s) {
    const peso = [s.peso_neto, s.unidad_peso].filter(v => v != null && String(v).trim() !== '').join(' ');
    return [s.producto, s.variedad, s.empaque, s.tamano, s.calibre, peso]
      .filter(v => v != null && String(v).trim() !== '').join(' · ');
  }

  function matrizHTML(skus) {
    return `<div class="catc-hint" style="margin-bottom:8px">Todos los SKUs del producto en una vista.</div>
      <div class="tabla-wrap"><table class="catc-tbl"><thead><tr><th>SKU</th><th>Calibre</th><th>Grado</th><th>GTIN</th>
        <th style="text-align:right">Cajas/tar.</th><th style="text-align:right">Clientes</th>${puedeCap() ? '<th></th>' : ''}</tr></thead>
      <tbody>${skus.map(s => `<tr>
        <td>${esc(tituloSku(s))}</td>
        <td class="catc-sec">${esc(s.calibre || '—')}</td><td class="catc-sec">${esc(s.grado || '—')}</td>
        <td class="mono catc-mut" style="font-size:11px">${esc(s.gtin || '—')}</td>
        <td style="text-align:right" class="catc-sec">${esc(s.cajas_por_tarima ?? '—')}</td>
        <td style="text-align:right" class="catc-sec">${esc(s.n_clientes ?? 0)}</td>
        ${puedeCap() ? `<td style="text-align:right"><i class="ti ti-pencil catc-go editar" data-editsku="${esc(s.id)}" title="Editar SKU"></i></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  }

  function skuCardHTML(s, i, clientesDe) {
    const cli = clientesDe(s.id);
    const cxt = s.cajas_por_tarima ?? 0;
    return `<div class="catc-sku${i === 0 ? ' open' : ''}" data-sku="${esc(s.id)}">
      <div class="catc-sku-top"><i class="ti ti-chevron-right chev"></i>
        <div><div class="catc-sku-nm">${esc(tituloSku(s))}</div>
          <div class="catc-sku-sb">${cli.length} cliente(s) · ${esc(cxt)} cajas/tarima</div></div>
        <div class="catc-sku-tg"><span class="mono catc-mut">GTIN ${esc(s.gtin || '—')}</span></div>
      </div>
      <div class="catc-sku-bd">
        <div class="catc-g3" style="margin-bottom:10px">
          <div class="f"><label>Calibre</label><input data-sf="${esc(s.id)}" data-k="calibre" value="${esc(s.calibre || '')}"></div>
          <div class="f"><label>Marca</label><input data-sf="${esc(s.id)}" data-k="marca" value="${esc(s.marca || '')}"></div>
          <div class="f"><label>Cajas/tarima</label><input data-sf="${esc(s.id)}" data-k="cajas_por_tarima" value="${esc(s.cajas_por_tarima ?? '')}"></div>
          <div class="f"><label>Estiba (Ti×Hi)</label><input data-sf="${esc(s.id)}" data-k="patron_estiba" value="${esc(s.patron_estiba || '')}"></div>
          <div class="f"><label>Temp. °C</label><input data-sf="${esc(s.id)}" data-k="temperatura_c" value="${esc(s.temperatura_c ?? '')}"></div>
          <div class="f"><label>Vida anaquel (d)</label><input data-sf="${esc(s.id)}" data-k="vida_anaquel_dias" value="${esc(s.vida_anaquel_dias ?? '')}"></div>
        </div>
        <div class="catc-actions" style="margin-bottom:10px">
          ${puedeCap() ? `<button class="catc-act" data-savesku="${esc(s.id)}"><i class="ti ti-check"></i>Guardar SKU</button>
          <button class="catc-act" data-editsku="${esc(s.id)}" title="Editar todos los campos"><i class="ti ti-pencil"></i>Editar</button>
          <button class="catc-act del" data-delsku="${esc(s.id)}" title="Eliminar SKU"><i class="ti ti-trash"></i></button>` : ''}
        </div>
        <div class="catc-hint" style="margin-bottom:7px">Clientes de este SKU con su <b>código de item</b>. El precio se define en cada pedido — aquí solo el de contrato/ref. Pallets → cajas = pallets × ${esc(cxt)}.</div>
        ${cli.map(c => `<div class="catc-linkline"><div style="flex:1"><div class="cn">${esc(c.contraparte_nombre || '—')}</div>
          <div class="code">código ${esc(c.codigo_item_cliente || '—')}</div></div>
          ${c.precio_contrato_ref != null ? `<span class="catc-tag soft">ref. ${esc(usd(c.precio_contrato_ref))}</span>` : ''}
          ${puedeCap() ? `<i class="ti ti-x catc-go" data-unlinkcli="${esc(s.id)}:${esc(c.contraparte_id)}" title="Desvincular"></i>` : ''}</div>`).join('')
          || '<div class="catc-hint">Aún sin clientes vinculados.</div>'}
        ${puedeCap() ? `<span class="catc-add" data-vcli="${esc(s.id)}"><i class="ti ti-plus"></i> Vincular cliente</span>` : ''}
      </div>
    </div>`;
  }

  function detProducto() {
    const p = det.reg;
    const clientesDe = sid => det.skuClientes.filter(c => String(c.sku_id) === String(sid));
    const cats = (listas.categoria || []);
    const catOpts = ['', ...cats].map(c => `<option ${String(p.categoria || '') === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
    const ro = puedeCap() ? '' : ' disabled';

    $det().innerHTML = `<div class="catc-dwrap">
      <div class="catc-dhead">
        <div style="flex:1;display:grid;grid-template-columns:1fr 130px;gap:10px;min-width:240px">
          <div class="f"><label>Producto</label><input id="p_nombre" value="${esc(p.nombre || '')}" style="font-size:15px;font-weight:600;height:36px"${ro}></div>
          <div class="f"><label>Código</label><input id="p_codigo" class="mono" value="${esc(p.codigo_item || '')}" style="height:36px"${ro}></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px">
          ${pillEstado(p.estado)}
          ${puedeCap() ? `<div style="display:flex;gap:7px"><button class="catc-act del" data-del title="Eliminar producto"><i class="ti ti-trash"></i>Eliminar</button><button class="btn-primary catc-act" data-save>Guardar</button></div>` : ''}
        </div>
      </div>

      <div class="catc-card"><h4>Datos generales</h4>
        <div class="catc-g3">
          <div class="f"><label>Categoría</label><select id="p_categoria"${ro}>${catOpts}</select></div>
          <div class="f"><label>País de origen</label><input id="p_pais" value="${esc(p.pais_origen || '')}"${ro}></div>
          <div class="f"><label>Orgánico</label><select id="p_organico"${ro}><option value="false" ${!p.organico ? 'selected' : ''}>No</option><option value="true" ${p.organico ? 'selected' : ''}>Sí</option></select></div>
        </div>
        <div class="catc-g3" style="margin-top:10px">
          <div class="f"><label>Estado</label><select id="p_estado"${ro}><option value="activo" ${String(p.estado||'activo')==='activo'?'selected':''}>Activo</option><option value="inactivo" ${String(p.estado)==='inactivo'?'selected':''}>Inactivo</option></select></div>
        </div>
        <div class="f" style="margin-top:10px"><label>Nota</label><input id="p_nota" value="${esc(p.nota || '')}"${ro}></div>
      </div>

      <div class="catc-card"><h4>Variedades ${puedeCap() ? '<span class="catc-add" data-addvar><i class="ti ti-plus"></i>Agregar</span>' : ''}</h4>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${det.variedades.length
          ? det.variedades.map(v => `<span class="catc-chip">${esc(v.nombre)}${puedeCap() ? `<i class="ti ti-x" data-delvar="${esc(v.id)}" title="Quitar variedad"></i>` : ''}</span>`).join('')
          : '<span class="catc-hint">Sin variedades.</span>'}</div>
      </div>

      <div class="catc-card"><h4>SKUs · variedad + presentación
        <span style="display:flex;align-items:center;gap:10px;text-transform:none;letter-spacing:0">
          <span class="catc-segtog"><button class="${skuMode === 'cards' ? 'on' : ''}" data-mode="cards">Tarjetas</button><button class="${skuMode === 'matriz' ? 'on' : ''}" data-mode="matriz">Matriz</button></span>
          ${puedeCap() ? '<span class="catc-add" data-newsku><i class="ti ti-plus"></i>Nuevo SKU</span><span class="catc-add" data-impsku><i class="ti ti-file-spreadsheet"></i>Importar</span>' : ''}
        </span></h4>
        ${det.skus.length
          ? (skuMode === 'matriz' ? matrizHTML(det.skus) : det.skus.map((s, i) => skuCardHTML(s, i, clientesDe)).join(''))
          : '<div class="catc-hint">Sin SKUs. Crea el primero con "Nuevo SKU".</div>'}
      </div>

      <div class="catc-card"><h4>Proveedores que lo surten ${puedeCap() ? '<span class="catc-add" data-vprov><i class="ti ti-plus"></i>Vincular</span>' : ''}</h4>
        ${det.proveedores.length
          ? det.proveedores.map(v => `<div class="catc-linkline">
              <div style="flex:1"><div class="cn">${esc(v.contraparte_nombre)}</div></div>
              <span class="catc-hint" style="margin:0 3px">Temporada</span>
              <select data-provtemp="${esc(v.contraparte_id)}" data-k="desde" style="height:28px;width:70px"${puedeCap() ? '' : ' disabled'}>${mesOpts(v.temporada_desde)}</select>
              <span class="catc-hint">–</span>
              <select data-provtemp="${esc(v.contraparte_id)}" data-k="hasta" style="height:28px;width:70px"${puedeCap() ? '' : ' disabled'}>${mesOpts(v.temporada_hasta)}</select>
              ${puedeCap() ? `<i class="ti ti-device-floppy catc-go" data-saveprovtemp="${esc(v.contraparte_id)}" title="Guardar temporada"></i>
              <i class="ti ti-x catc-go" data-unlinkprov="${esc(v.contraparte_id)}" title="Desvincular proveedor"></i>` : ''}
            </div>`).join('')
          : '<span class="catc-hint">Sin proveedores vinculados.</span>'}
      </div>

      <div class="catc-card"><h4>Clientes que lo compran</h4>
        <div style="display:flex;flex-wrap:wrap;gap:7px">${det.clientesProducto.length
          ? det.clientesProducto.map(c => `<span class="catc-chip">${esc(c.contraparte_nombre)}${c.n_skus > 1 ? ` <span class="catc-mut">· ${esc(c.n_skus)} presentaciones</span>` : ''}</span>`).join('')
          : '<span class="catc-hint">Sin clientes aún.</span>'}</div>
      </div>

      <div class="catc-hint" style="margin-top:6px">Todo editable · eliminar va a papelera (recuperable) · si tiene movimientos, se archiva.</div>
    </div>`;

    // wiring
    $det().querySelectorAll('.catc-sku-top').forEach(t => t.addEventListener('click', () => t.parentElement.classList.toggle('open')));
    $det().querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { skuMode = b.dataset.mode; detProducto(); }));
    const bSave = $det().querySelector('[data-save]'); if (bSave) bSave.addEventListener('click', guardarProducto);
    const bDel = $det().querySelector('[data-del]'); if (bDel) bDel.addEventListener('click', () => eliminar('producto', p.id, 'el producto "' + (p.nombre || '') + '"'));
    const bAddVar = $det().querySelector('[data-addvar]'); if (bAddVar) bAddVar.addEventListener('click', () => agregarVariedad(p.id));
    $det().querySelectorAll('[data-delvar]').forEach(el => el.addEventListener('click', () => {
      const vv = det.variedades.find(x => String(x.id) === String(el.dataset.delvar));
      eliminar('variedad', el.dataset.delvar, 'la variedad "' + (vv ? vv.nombre : '') + '"', true);
    }));
    const bNewSku = $det().querySelector('[data-newsku]'); if (bNewSku) bNewSku.addEventListener('click', () => armadorSku(p));
    const bImpSku = $det().querySelector('[data-impsku]'); if (bImpSku) bImpSku.addEventListener('click', () => vistaImportar('skus'));
    const bVprov = $det().querySelector('[data-vprov]'); if (bVprov) bVprov.addEventListener('click', () => vincularProveedor(p));
    $det().querySelectorAll('[data-unlinkprov]').forEach(el => el.addEventListener('click', () => desvincularProveedor(p.id, el.dataset.unlinkprov)));
    $det().querySelectorAll('[data-saveprovtemp]').forEach(el => el.addEventListener('click', () => guardarTemporadaProveedor(p.id, el.dataset.saveprovtemp)));
    $det().querySelectorAll('[data-savesku]').forEach(el => el.addEventListener('click', () => guardarSku(el.dataset.savesku)));
    $det().querySelectorAll('[data-editsku]').forEach(el => el.addEventListener('click', () => {
      const sk = det.skus.find(x => String(x.id) === String(el.dataset.editsku));
      if (sk) armadorSku(p, sk);
    }));
    $det().querySelectorAll('[data-delsku]').forEach(el => el.addEventListener('click', () => {
      const sk = det.skus.find(x => String(x.id) === String(el.dataset.delsku));
      eliminar('sku', el.dataset.delsku, 'el SKU "' + (sk ? [sk.variedad, sk.empaque].filter(Boolean).join(' · ') : '') + '"', true);
    }));
    $det().querySelectorAll('[data-vcli]').forEach(el => el.addEventListener('click', () => vincularClienteSku(el.dataset.vcli)));
    $det().querySelectorAll('[data-unlinkcli]').forEach(el => el.addEventListener('click', () => {
      const [sid, cid] = el.dataset.unlinkcli.split(':'); desvincularClienteSku(sid, cid);
    }));
    ERP.marcarTabla($det());   // matriz de SKU (D-193) — no-op si skuMode es "cards" (sin <table>)
  }

  async function guardarProducto() {
    const v = id => (document.getElementById(id) || {}).value;
    await escribir('fn_cat_producto_editar', {
      p_id: Number(det.reg.id), p_nombre: v('p_nombre').trim() || null, p_codigo_item: v('p_codigo').trim() || null,
      p_categoria: v('p_categoria') || null, p_pais_origen: v('p_pais').trim() || null,
      p_organico: v('p_organico') === 'true',
      p_estado: v('p_estado') || null, p_nota: v('p_nota').trim() || null
    }, 'Producto guardado', true);
  }

  async function guardarSku(sid) {
    const g = k => (document.querySelector(`[data-sf="${sid}"][data-k="${k}"]`) || {}).value;
    await escribir('fn_cat_sku_editar', {
      p_id: Number(sid), p_calibre: (g('calibre') || '').trim() || null, p_marca: (g('marca') || '').trim() || null,
      p_cajas_por_tarima: num(g('cajas_por_tarima')), p_patron_estiba: (g('patron_estiba') || '').trim() || null,
      p_temperatura_c: num(g('temperatura_c')), p_vida_anaquel_dias: num(g('vida_anaquel_dias'))
    }, 'SKU guardado');
  }

  async function agregarVariedad(pid) {
    const nombre = (prompt('Nombre de la variedad:') || '').trim();
    if (!nombre) return;
    await escribir('fn_cat_variedad_alta', { p_producto_id: Number(pid), p_nombre: nombre }, 'Variedad agregada');
  }

  /* ================= Ficha de CONTRAPARTE ================= */
  function detContraparte() {
    const c = det.reg;
    const principal = det.contactos.find(k => k.es_principal) || {};
    const wa = principal.telefono_whatsapp || '';
    const mailPrincipal = principal.email || '';
    const ro = puedeCap() ? '' : ' disabled';
    const badge = (on, ico, txt) => `<span class="catc-tag${on ? '' : ' off'}"><i class="ti ${ico}"></i>${txt}</span>`;

    $det().innerHTML = `<div class="catc-dwrap">
      <div class="catc-dhead">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:240px">
          <div class="catc-av lg">${esc(iniciales(c.nombre))}</div>
          <div style="flex:1"><input id="c_nombre" value="${esc(c.nombre || '')}" style="font-size:15px;font-weight:600;height:36px;max-width:340px"${ro}>
            <div class="catc-badges">${badge(c.es_proveedor, 'ti-tractor', 'Proveedor')}${badge(c.es_cliente, 'ti-building-store', 'Cliente')}${pillEstado(c.estado)}</div>
          </div>
        </div>
        <div style="display:flex;gap:7px">
          <a class="catc-act" ${mailPrincipal ? `href="mailto:${esc(mailPrincipal)}"` : 'style="opacity:.5;pointer-events:none"'}><i class="ti ti-mail"></i>Correo</a>
          <a class="catc-act wa" ${wa ? `href="https://wa.me/${esc(String(wa).replace(/[^\d]/g, ''))}" target="_blank" rel="noopener"` : 'style="opacity:.5;pointer-events:none"'}><i class="ti ti-brand-whatsapp"></i>WhatsApp</a>
        </div>
      </div>
      <div class="catc-g2">
        <div>
          <div class="catc-card"><h4>Identidad / Fiscal</h4>
            <div class="f" style="margin-bottom:9px"><label>Razón social</label><input id="c_razon" value="${esc(c.razon_social || '')}"${ro}></div>
            <div style="display:flex;gap:16px;margin-bottom:11px">
              <label class="catc-chk"><input type="checkbox" id="c_esprov" ${c.es_proveedor ? 'checked' : ''}${ro}>Proveedor</label>
              <label class="catc-chk"><input type="checkbox" id="c_escli" ${c.es_cliente ? 'checked' : ''}${ro}>Cliente</label>
            </div>
            <div class="f" style="margin-bottom:9px"><label>Tipo(s)</label>${chipsTagPicker('c_tipos', c.tipos)}</div>
            <div class="catc-g2" style="margin-bottom:9px"><div class="f"><label>Tax ID / RFC</label><input id="c_tax" class="mono" value="${esc(c.rfc_tax_id || '')}"${ro}></div><div class="f"><label>PACA</label><input id="c_paca" class="mono" value="${esc(c.paca_licencia || '')}"${ro}></div></div>
            <div class="f" style="margin-bottom:9px"><label>Certificaciones</label><input id="c_cert" value="${esc(c.certificaciones || '')}"${ro}></div>
            <div class="catc-g2"><div class="f"><label>País</label><input id="c_pais" value="${esc(c.pais || '')}"${ro}></div><div class="f"><label>Ciudad</label><input id="c_ciudad" value="${esc(c.ciudad || '')}"${ro}></div></div>
            <div class="f" style="margin-top:9px"><label>Dirección de facturación</label><input id="c_dirfact" value="${esc(c.direccion_facturacion || '')}"${ro}></div>
            <div class="f" style="margin-top:9px"><label>Dirección de envío</label><input id="c_direnvio" value="${esc(c.direccion_envio || '')}"${ro}></div>
          </div>
          <div class="catc-card"><h4>Términos</h4>
            <div class="catc-kv"><span>Días de crédito</span><input id="c_credito" type="number" value="${esc(c.dias_credito ?? '')}"${ro}></div>
            <div class="catc-kv"><span>Límite de crédito</span><input id="c_limite" type="number" value="${esc(c.limite_credito ?? '')}"${ro}></div>
            <div class="catc-kv"><span>% anticipo</span><input id="c_anticipo" type="number" value="${esc(c.pct_anticipo ?? '')}"${ro}></div>
            <div class="catc-kv"><span>Método de pago</span><input id="c_pago" value="${esc(c.metodo_pago || '')}"${ro}></div>
            <div class="catc-kv"><span>Moneda</span><input id="c_moneda" class="mono" value="${esc(c.moneda || 'USD')}"${ro}></div>
          </div>
        </div>
        <div>
          <div class="catc-card"><h4>Contactos ${puedeCap() ? '<span class="catc-add" data-addcont><i class="ti ti-plus"></i>Agregar</span>' : ''}</h4>
            ${det.contactos.length ? det.contactos.map(k => `<div class="catc-contact"><div><div class="cn">${esc(k.nombre || '—')} ${k.es_principal ? '<span class="catc-pill ok"><i class="ti ti-star-filled"></i>Principal</span>' : ''}</div><div class="cr">${esc([k.rol, k.email].filter(Boolean).join(' · ') || '—')}</div></div>
              <div>${(!k.es_principal && puedeCap()) ? `<span class="catc-add" data-mkprincipal="${esc(k.id)}" style="margin-right:8px">Hacer principal</span>` : ''}${k.email ? `<a href="mailto:${esc(k.email)}"><i class="ti ti-mail"></i></a>` : ''}${k.telefono_whatsapp ? `<a class="wa" href="https://wa.me/${esc(String(k.telefono_whatsapp).replace(/[^\d]/g, ''))}" target="_blank" rel="noopener"><i class="ti ti-brand-whatsapp"></i></a>` : ''}${puedeCap() ? `<i class="ti ti-pencil catc-go editar" data-editcont="${esc(k.id)}" title="Editar" style="margin-left:7px"></i>` : ''}${puedeCap() ? `<i class="ti ti-x catc-go" data-delcont="${esc(k.id)}" title="Quitar"></i>` : ''}</div></div>`).join('')
              : '<div class="catc-hint">Sin contactos.</div>'}
            <div id="cont_nuevo" style="display:none;margin-top:10px"></div>
          </div>
          <div class="catc-card"><h4>${c.es_proveedor ? 'SKUs / productos que surte' : 'SKUs que compra'} ${puedeCap() ? '<span class="catc-add" data-vsku><i class="ti ti-plus"></i>Vincular</span>' : ''}</h4>
            <div style="display:flex;flex-wrap:wrap;gap:6px">${det.skus.length
              ? det.skus.map(s => `<span class="catc-chip">${esc(s.etiqueta)}${puedeCap() ? `<i class="ti ti-x" data-unlinksku="${esc(s.sku_id)}" title="Desvincular SKU"></i>` : ''}</span>`).join('')
              : '<span class="catc-hint">Sin vínculos.</span>'}</div>
          </div>
        </div>
      </div>
      ${puedeCap() ? `<div class="catc-dfoot"><span class="catc-hint"><i class="ti ti-history"></i> ${esc(c.capturado_por || 'Miguel')}</span>
        <div style="display:flex;gap:7px"><button class="catc-act del" data-del><i class="ti ti-trash"></i>Eliminar</button><button class="btn-primary catc-act" data-save>Guardar</button></div></div>` : ''}
      <div class="catc-hint" style="margin-top:6px">Eliminar → papelera. Con movimientos ligados, se archiva.</div>
    </div>`;

    const bSave = $det().querySelector('[data-save]'); if (bSave) bSave.addEventListener('click', guardarContraparte);
    wireTagPicker('c_tipos');
    const bDel = $det().querySelector('[data-del]'); if (bDel) bDel.addEventListener('click', () => eliminar('contraparte', c.id, 'el registro "' + (c.nombre || '') + '"'));
    const bAddCont = $det().querySelector('[data-addcont]'); if (bAddCont) bAddCont.addEventListener('click', () => agregarContacto(c.id));
    $det().querySelectorAll('[data-delcont]').forEach(el => el.addEventListener('click', () => {
      const kk = det.contactos.find(x => String(x.id) === String(el.dataset.delcont));
      eliminar('contacto', el.dataset.delcont, 'el contacto "' + (kk ? kk.nombre : '') + '"', true);
    }));
    $det().querySelectorAll('[data-editcont]').forEach(el => el.addEventListener('click', () => {
      const kk = det.contactos.find(x => String(x.id) === String(el.dataset.editcont));
      if (kk) editarContacto(kk);
    }));
    $det().querySelectorAll('[data-mkprincipal]').forEach(el => el.addEventListener('click', () => hacerPrincipal(el.dataset.mkprincipal)));
    const bVsku = $det().querySelector('[data-vsku]'); if (bVsku) bVsku.addEventListener('click', () => vincularSkuAContraparte(c));
    $det().querySelectorAll('[data-unlinksku]').forEach(el => el.addEventListener('click', () => desvincularSkuContraparte(el.dataset.unlinksku, c.id)));
  }

  async function guardarContraparte() {
    const v = id => (document.getElementById(id) || {}).value;
    const chk = id => !!(document.getElementById(id) || {}).checked;
    await escribir('fn_cat_contraparte_editar', {
      p_id: Number(det.reg.id), p_nombre: v('c_nombre').trim() || null, p_razon_social: v('c_razon').trim() || null,
      p_es_cliente: chk('c_escli'), p_es_proveedor: chk('c_esprov'),
      p_rfc_tax_id: v('c_tax').trim() || null, p_paca_licencia: v('c_paca').trim() || null,
      p_certificaciones: v('c_cert').trim() || null, p_pais: v('c_pais').trim() || null, p_ciudad: v('c_ciudad').trim() || null,
      p_direccion_facturacion: v('c_dirfact').trim() || null, p_direccion_envio: v('c_direnvio').trim() || null,
      p_dias_credito: num(v('c_credito')), p_limite_credito: num(v('c_limite')), p_pct_anticipo: num(v('c_anticipo')),
      p_metodo_pago: v('c_pago').trim() || null, p_moneda: v('c_moneda').trim() || 'USD',
      p_tipos: leerTags('c_tipos')
    }, 'Guardado', true);
  }

  function agregarContacto(cid) {
    const cont = document.getElementById('cont_nuevo');
    if (!cont) return;
    cont.style.display = 'block';
    cont.innerHTML = `
      <div class="catc-g2" style="margin-bottom:8px">
        <div class="f"><label>Nombre *</label><input id="cn_nombre" autofocus></div>
        <div class="f"><label>Rol</label><input id="cn_rol" placeholder="Compras / Pagos / Ventas…"></div>
      </div>
      <div class="catc-g2" style="margin-bottom:8px">
        <div class="f"><label>Correo</label><input id="cn_email"></div>
        <div class="f"><label>WhatsApp</label><input id="cn_wa" placeholder="Solo dígitos, con país"></div>
      </div>
      <label class="catc-chk" style="margin-bottom:9px"><input type="checkbox" id="cn_principal">Marcar como principal</label>
      <div style="display:flex;gap:7px"><button class="catc-act" id="cn_cancel">Cancelar</button><button class="btn-primary catc-act" id="cn_save"><i class="ti ti-check"></i>Guardar contacto</button></div>`;
    document.getElementById('cn_cancel').addEventListener('click', () => { cont.style.display = 'none'; cont.innerHTML = ''; });
    document.getElementById('cn_save').addEventListener('click', async () => {
      const nombre = (document.getElementById('cn_nombre').value || '').trim();
      if (!nombre) { ERP.toast('err', 'El nombre es obligatorio.'); return; }
      const rol = (document.getElementById('cn_rol').value || '').trim() || null;
      const email = (document.getElementById('cn_email').value || '').trim() || null;
      const wa = (document.getElementById('cn_wa').value || '').trim() || null;
      const esPrincipal = document.getElementById('cn_principal').checked;
      await escribir('fn_cat_contacto_alta', { p_contraparte_id: Number(cid), p_nombre: nombre, p_rol: rol, p_email: email, p_telefono_whatsapp: wa, p_es_principal: esPrincipal }, 'Contacto agregado');
    });
  }

  // Reusa el mismo hueco #cont_nuevo que agregarContacto() — prellenado, sin checkbox de
  // principal (eso se maneja aparte con "Hacer principal"; fn_cat_contacto_editar no lo toca).
  function editarContacto(k) {
    const cont = document.getElementById('cont_nuevo');
    if (!cont) return;
    cont.style.display = 'block';
    cont.innerHTML = `
      <div class="catc-g2" style="margin-bottom:8px">
        <div class="f"><label>Nombre *</label><input id="cn_nombre" autofocus value="${esc(k.nombre || '')}"></div>
        <div class="f"><label>Rol</label><input id="cn_rol" placeholder="Compras / Pagos / Ventas…" value="${esc(k.rol || '')}"></div>
      </div>
      <div class="catc-g2" style="margin-bottom:8px">
        <div class="f"><label>Correo</label><input id="cn_email" value="${esc(k.email || '')}"></div>
        <div class="f"><label>WhatsApp</label><input id="cn_wa" placeholder="Solo dígitos, con país" value="${esc(k.telefono_whatsapp || '')}"></div>
      </div>
      <div style="display:flex;gap:7px"><button class="catc-act" id="cn_cancel">Cancelar</button><button class="btn-primary catc-act" id="cn_save"><i class="ti ti-check"></i>Guardar cambios</button></div>`;
    document.getElementById('cn_cancel').addEventListener('click', () => { cont.style.display = 'none'; cont.innerHTML = ''; });
    document.getElementById('cn_save').addEventListener('click', async () => {
      const nombre = (document.getElementById('cn_nombre').value || '').trim();
      if (!nombre) { ERP.toast('err', 'El nombre es obligatorio.'); return; }
      const rol = (document.getElementById('cn_rol').value || '').trim() || null;
      const email = (document.getElementById('cn_email').value || '').trim() || null;
      const wa = (document.getElementById('cn_wa').value || '').trim() || null;
      await escribir('fn_cat_contacto_editar', { p_id: Number(k.id), p_nombre: nombre, p_rol: rol, p_email: email, p_telefono_whatsapp: wa }, 'Contacto actualizado');
    });
  }

  async function hacerPrincipal(id) {
    await escribir('fn_cat_contacto_principal', { p_id: Number(id) }, 'Contacto principal actualizado');
  }

  /* ================= Vínculos ================= */
  async function vincularProveedor(p) {
    const provs = (await q('v_catc_contrapartes', '&es_proveedor=eq.true&order=nombre.asc').catch(() => []))
      .filter(x => !det.proveedores.some(v => String(v.contraparte_id) === String(x.id)));
    vistaPicker('Vincular proveedor · ' + p.nombre, provs.map(x => ({ id: x.id, label: x.nombre })), async sel => {
      await escribir('fn_cat_vincular_producto_proveedor', { p_producto_id: Number(p.id), p_contraparte_id: Number(sel.id), p_temporada_desde: null, p_temporada_hasta: null }, 'Vinculado — define su temporada abajo (opcional)');
    });
  }
  async function desvincularProveedor(pid, cid) {
    await escribir('fn_cat_desvincular_producto_proveedor', { p_producto_id: Number(pid), p_contraparte_id: Number(cid) }, 'Desvinculado');
  }
  async function guardarTemporadaProveedor(pid, cid) {
    const desde = (document.querySelector(`[data-provtemp="${cid}"][data-k="desde"]`) || {}).value;
    const hasta = (document.querySelector(`[data-provtemp="${cid}"][data-k="hasta"]`) || {}).value;
    await escribir('fn_cat_vincular_producto_proveedor_editar', {
      p_producto_id: Number(pid), p_contraparte_id: Number(cid),
      p_temporada_desde: desde ? Number(desde) : null, p_temporada_hasta: hasta ? Number(hasta) : null
    }, 'Temporada actualizada');
  }
  async function vincularClienteSku(sid) {
    const clis = (await q('v_catc_contrapartes', '&es_cliente=eq.true&order=nombre.asc').catch(() => []));
    const yaCli = det.skuClientes.filter(c => String(c.sku_id) === String(sid)).map(c => String(c.contraparte_id));
    vistaPicker('Vincular cliente al SKU', clis.filter(x => !yaCli.includes(String(x.id))).map(x => ({ id: x.id, label: x.nombre })), async sel => {
      const codigo = (prompt('Código de item del cliente (opcional):') || '').trim() || null;
      const precio = (prompt('Precio de contrato/referencia (opcional, solo número):') || '').trim();
      await escribir('fn_cat_vincular_sku_cliente', { p_sku_id: Number(sid), p_contraparte_id: Number(sel.id), p_codigo_item_cliente: codigo, p_precio_contrato_ref: precio ? Number(precio) : null }, 'Cliente vinculado al SKU');
    });
  }
  async function desvincularClienteSku(sid, cid) {
    await escribir('fn_cat_desvincular_sku_cliente', { p_sku_id: Number(sid), p_contraparte_id: Number(cid) }, 'Desvinculado');
  }
  function vincularSkuAContraparte(c) {
    const yaVinculados = new Set(det.skus.map(s => String(s.sku_id)));
    $det().innerHTML = `<div class="catc-dwrap">
      <button class="catc-act" data-back style="margin-bottom:14px"><i class="ti ti-arrow-left"></i>${esc(c.nombre)}</button>
      <div style="font-size:16px;font-weight:600;margin-bottom:3px">Vincular SKU · ${esc(c.nombre)}</div>
      <div class="catc-hint" style="margin-bottom:14px">Busca por producto, variedad, empaque o calibre — tolera errores de tecleo.</div>
      <div class="catc-card" style="max-width:460px">
        <div class="f" style="margin-bottom:11px"><label>SKU</label><div id="vsku_picker"></div><div class="catc-hint" id="vsku_aviso" style="margin-top:5px;display:none"></div></div>
        ${c.es_cliente ? '<div class="f" style="margin-bottom:14px"><label>Código de item del cliente (opcional)</label><input id="vsku_codigo"></div>' : ''}
        <button class="btn-primary catc-act" id="vsku_confirmar" disabled><i class="ti ti-check"></i>Vincular</button>
      </div>
    </div>`;
    $det().querySelector('[data-back]').addEventListener('click', () => abrirDetalle(selId));
    const btn = document.getElementById('vsku_confirmar');
    const aviso = document.getElementById('vsku_aviso');
    const picker = ERP.crearPickerSku({
      contenedor: document.getElementById('vsku_picker'),
      placeholder: 'Buscar SKU…',
      alCambiar: sel => {
        const dup = sel && yaVinculados.has(String(sel.sku_id));
        btn.disabled = !sel || dup;
        aviso.style.display = dup ? 'block' : 'none';
        aviso.textContent = dup ? 'Ese SKU ya está vinculado.' : '';
      }
    });
    btn.addEventListener('click', async () => {
      const skuId = picker.valorId();
      if (!skuId) return;
      if (c.es_cliente) {
        const codigo = (document.getElementById('vsku_codigo').value || '').trim() || null;
        await escribir('fn_cat_vincular_sku_cliente', { p_sku_id: Number(skuId), p_contraparte_id: Number(c.id), p_codigo_item_cliente: codigo, p_precio_contrato_ref: null }, 'Vinculado');
      } else {
        // proveedor surte a nivel PRODUCTO: el picker ya trae producto_id (fn_cat_sugerir_sku)
        const productoId = picker.valorProductoId();
        if (!productoId) { ERP.toast('err', 'No se pudo resolver el producto del SKU.'); return; }
        await escribir('fn_cat_vincular_producto_proveedor', { p_producto_id: Number(productoId), p_contraparte_id: Number(c.id), p_temporada_desde: null, p_temporada_hasta: null }, 'Vinculado a nivel producto');
      }
    });
  }
  async function desvincularSkuContraparte(sid, cid) {
    // en cliente = vinculo_sku_cliente; en proveedor = producto_proveedor (resolver producto)
    if (det.reg.es_cliente) { await escribir('fn_cat_desvincular_sku_cliente', { p_sku_id: Number(sid), p_contraparte_id: Number(cid) }, 'Desvinculado'); return; }
    const sku = uno(await q('v_catc_skus', `&id=eq.${Number(sid)}`).catch(() => []));
    if (sku.producto_id) await escribir('fn_cat_desvincular_producto_proveedor', { p_producto_id: Number(sku.producto_id), p_contraparte_id: Number(cid) }, 'Desvinculado');
  }

  /* ================= Armador de SKU ================= */
  function armadorSku(p, skuExistente) {
    const editando = !!skuExistente;
    const s = skuExistente || {};
    const optSel = (arr, nuevoLbl, actual) => {
      const lista = (actual && !arr.includes(actual)) ? [...arr, actual] : arr;
      return ['<option value=""></option>', ...lista.map(o => `<option ${o === actual ? 'selected' : ''}>${esc(o)}</option>`), `<option value="__new">${esc(nuevoLbl)}</option>`].join('');
    };
    const v = campo => esc(s[campo] ?? '');
    $det().innerHTML = `<div class="catc-dwrap">
      <button class="catc-act" data-back style="margin-bottom:14px"><i class="ti ti-arrow-left"></i>${esc(p.nombre)}</button>
      <div style="font-size:17px;font-weight:600;margin-bottom:2px">${editando ? 'Editar SKU' : 'Nuevo SKU'} · ${esc(p.nombre)}</div>
      <div class="catc-hint" style="margin-bottom:14px">Arma la presentación eligiendo de listas — así no hay valores repetidos. ¿Falta uno? Elige «＋ otro…» y se agrega a la lista para todos.</div>
      <div class="catc-card"><h4>Combinación (define el SKU)</h4>
        <div class="catc-g3" style="margin-bottom:10px">
          <div class="f"><label>Variedad</label>${det.variedades.length
            ? `<select id="k_var"><option value="">— sin variedad —</option>${det.variedades.map(vv => `<option value="${esc(vv.id)}" ${editando && String(vv.id) === String(s.variedad_id) ? 'selected' : ''}>${esc(vv.nombre)}</option>`).join('')}</select>`
            : '<input id="k_var" placeholder="(sin variedades)" disabled>'}</div>
          <div class="f"><label>Empaque *</label><select id="k_emp" data-tipo="empaque">${optSel(listas.empaque, '＋ otro empaque…', s.empaque)}</select></div>
          <div class="f"><label>Tamaño</label><select id="k_tam" data-tipo="tamano">${optSel(listas.tamano, '＋ otro tamaño…', s.tamano)}</select></div>
        </div>
        <div class="catc-g3">
          <div class="f"><label>Calibre</label><select id="k_cal" data-tipo="calibre">${optSel(listas.calibre, '＋ otro calibre…', s.calibre)}</select></div>
          <div class="f"><label>Grado</label><select id="k_gra" data-tipo="grado">${optSel(listas.grado, '＋ otro grado…', s.grado)}</select></div>
          <div class="f"><label>Unidad de peso</label><select id="k_uni" data-tipo="unidad">${optSel(listas.unidad, '＋ otra unidad…', s.unidad_peso)}</select></div>
        </div>
        <div class="catc-g2" style="margin-top:10px">
          <div class="f"><label>Peso neto</label><input id="k_peso" type="number" step="0.001" placeholder="10" value="${v('peso_neto')}"></div>
          <div class="f"><label>Peso bruto</label><input id="k_pesob" type="number" step="0.001" value="${v('peso_bruto')}"></div>
        </div>
        <div id="k_newval" style="display:none;margin-top:10px"></div>
        <div class="catc-prev">Vista previa: <b id="k_prev">—</b></div>
      </div>
      <div class="catc-card"><h4>Datos del SKU</h4>
        <div class="catc-g3">
          <div class="f"><label>GTIN</label><input id="k_gtin" class="mono" value="${v('gtin')}"></div>
          <div class="f"><label>PLU</label><input id="k_plu" class="mono" value="${v('plu')}"></div>
          <div class="f"><label>Cajas/tarima</label><input id="k_cxt" type="number" value="${v('cajas_por_tarima')}"></div>
          <div class="f"><label>Estiba (Ti×Hi)</label><input id="k_estiba" placeholder="8x10" value="${v('patron_estiba')}"></div>
          <div class="f"><label>Temp. °C</label><input id="k_temp" type="number" step="0.1" value="${v('temperatura_c')}"></div>
          <div class="f"><label>Vida anaquel (d)</label><input id="k_vida" type="number" value="${v('vida_anaquel_dias')}"></div>
          <div class="f"><label>¿Reempaque?</label><select id="k_reemp"><option value="false" ${!s.es_reempaque ? 'selected' : ''}>No</option><option value="true" ${s.es_reempaque ? 'selected' : ''}>Sí</option></select></div>
          ${editando ? `
          <div class="f"><label>Costo caja (ref)</label><input id="k_costo" type="number" step="0.01" value="${v('costo_caja_ref')}"></div>
          <div class="f"><label>Precio caja (ref)</label><input id="k_precio" type="number" step="0.01" value="${v('precio_caja_ref')}"></div>
          <div class="f"><label>Estado</label><select id="k_estado"><option value="activo" ${String(s.estado || 'activo') === 'activo' ? 'selected' : ''}>Activo</option><option value="inactivo" ${s.estado === 'inactivo' ? 'selected' : ''}>Inactivo</option></select></div>` : ''}
        </div>
      </div>
      <div class="catc-dfoot"><span class="catc-hint">${editando ? '* obligatorio' : '* obligatorio · los clientes se vinculan después de crear el SKU'}</span>
        <div style="display:flex;gap:7px"><button class="catc-act" data-back>Cancelar</button><button class="btn-primary catc-act" data-create><i class="ti ti-check"></i>${editando ? 'Guardar cambios' : 'Crear SKU'}</button></div></div>
    </div>`;

    const gv = id => { const e = document.getElementById(id); return e ? e.value : ''; };
    const nombreVar = () => { const sel = document.getElementById('k_var'); if (!sel || sel.tagName !== 'SELECT' || !sel.value) return ''; return sel.options[sel.selectedIndex].text; };
    const upd = () => {
      const e = gv('k_emp'), t = gv('k_tam'), c = gv('k_cal');
      document.getElementById('k_prev').textContent = p.nombre + (nombreVar() ? ' · ' + nombreVar() : '') + (e && e !== '__new' ? ' · ' + e : '') + (t && t !== '__new' ? ' · ' + t : '') + (c && c !== '__new' ? ' · cal ' + c : '');
    };
    ['k_var', 'k_emp', 'k_tam', 'k_cal', 'k_gra', 'k_uni'].forEach(id => {
      const el = document.getElementById(id);
      if (el && el.tagName === 'SELECT') el.addEventListener('change', () => {
        if (el.value === '__new') mostrarNuevoValor(el);
        upd();
      });
    });
    upd();
    $det().querySelector('[data-back]').addEventListener('click', () => detProducto());
    $det().querySelector('[data-create]').addEventListener('click', () => editando ? guardarSkuEditado(p, s.id) : crearSku(p));
  }

  function mostrarNuevoValor(sel) {
    const cont = document.getElementById('k_newval');
    const tipo = sel.dataset.tipo;
    cont.style.display = 'block';
    cont.innerHTML = `<span class="catc-hint">Nuevo valor para «${esc(tipo)}»:</span> <input id="k_nv" style="height:28px;width:150px;margin:0 6px;display:inline-block"><button class="catc-act" id="k_nvadd" style="height:28px">Agregar</button>`;
    document.getElementById('k_nvadd').addEventListener('click', async () => {
      const val = (document.getElementById('k_nv').value || '').trim();
      if (!val) return;
      try {
        await rpc('fn_cat_lista_valor_alta', { p_tipo: tipo, p_valor: val });
        ERP.limpiarCache();
        // agregar al select vivo + al cache
        listas[tipo] = listas[tipo] || []; if (!listas[tipo].includes(val)) listas[tipo].push(val);
        const o = document.createElement('option'); o.text = val; o.value = val;
        sel.add(o, sel.options[sel.options.length - 1]); o.selected = true;
        cont.style.display = 'none';
        ERP.toast('ok', `«${esc(val)}» agregado a la lista`);
      } catch (e) { ERP.toast('err', 'No se pudo agregar: ' + esc(e.message)); }
    });
  }

  async function crearSku(p) {
    const gv = id => { const e = document.getElementById(id); return e ? e.value : ''; };
    const emp = gv('k_emp');
    if (!emp || emp === '__new') { ERP.toast('err', 'El empaque es obligatorio.'); return; }
    const varSel = document.getElementById('k_var');
    const variedad_id = (varSel && varSel.tagName === 'SELECT' && varSel.value) ? Number(varSel.value) : null;
    const args = {
      p_producto_id: Number(p.id), p_variedad_id: variedad_id, p_empaque: emp,
      p_calibre: (gv('k_cal') && gv('k_cal') !== '__new') ? gv('k_cal') : null,
      p_tamano: (gv('k_tam') && gv('k_tam') !== '__new') ? gv('k_tam') : null,
      p_grado: (gv('k_gra') && gv('k_gra') !== '__new') ? gv('k_gra') : null,
      p_unidad_peso: (gv('k_uni') && gv('k_uni') !== '__new') ? gv('k_uni') : null,
      p_peso_neto: num(gv('k_peso')), p_peso_bruto: num(gv('k_pesob')),
      p_gtin: gv('k_gtin').trim() || null, p_plu: gv('k_plu').trim() || null, p_cajas_por_tarima: num(gv('k_cxt')),
      p_patron_estiba: gv('k_estiba').trim() || null, p_temperatura_c: num(gv('k_temp')), p_vida_anaquel_dias: num(gv('k_vida')),
      p_es_reempaque: gv('k_reemp') === 'true'
    };
    try {
      await rpc('fn_cat_sku_alta', args);
      ERP.limpiarCache();
      ERP.toast('ok', 'SKU creado');
      skuMode = 'cards';
      det = { reg: det.reg, ...(await cargarDetalleProducto(det.reg.id)) };
      detProducto();
      recargarLista();
    } catch (e) { if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', 'El ERP rechazó el SKU: ' + esc(e.message)); }
  }

  async function guardarSkuEditado(p, skuId) {
    const gv = id => { const e = document.getElementById(id); return e ? e.value : ''; };
    const emp = gv('k_emp');
    if (!emp || emp === '__new') { ERP.toast('err', 'El empaque es obligatorio.'); return; }
    const varSel = document.getElementById('k_var');
    const variedad_id = (varSel && varSel.tagName === 'SELECT' && varSel.value) ? Number(varSel.value) : null;
    const args = {
      p_id: Number(skuId), p_producto_id: Number(p.id), p_variedad_id: variedad_id,
      p_empaque: emp,
      p_calibre: (gv('k_cal') && gv('k_cal') !== '__new') ? gv('k_cal') : null,
      p_tamano: (gv('k_tam') && gv('k_tam') !== '__new') ? gv('k_tam') : null,
      p_grado: (gv('k_gra') && gv('k_gra') !== '__new') ? gv('k_gra') : null,
      p_peso_neto: num(gv('k_peso')), p_unidad_peso: (gv('k_uni') && gv('k_uni') !== '__new') ? gv('k_uni') : null, p_peso_bruto: num(gv('k_pesob')),
      p_gtin: gv('k_gtin').trim() || null, p_plu: gv('k_plu').trim() || null, p_cajas_por_tarima: num(gv('k_cxt')),
      p_patron_estiba: gv('k_estiba').trim() || null, p_temperatura_c: num(gv('k_temp')), p_vida_anaquel_dias: num(gv('k_vida')),
      p_es_reempaque: gv('k_reemp') === 'true',
      p_costo_caja_ref: num(gv('k_costo')), p_precio_caja_ref: num(gv('k_precio')), p_estado: gv('k_estado') || null
    };
    await escribir('fn_cat_sku_editar', args, 'SKU actualizado');
  }

  /* ================= Picker (elegir de lo existente) ================= */
  function vistaPicker(titulo, opciones, onPick) {
    $det().innerHTML = `<div class="catc-dwrap">
      <button class="catc-act" data-back style="margin-bottom:14px"><i class="ti ti-arrow-left"></i>Cancelar</button>
      <div style="font-size:16px;font-weight:600;margin-bottom:3px">${esc(titulo)}</div>
      <div class="catc-hint" style="margin-bottom:14px">Elige de lo que ya existe en el catálogo. El vínculo se guarda una sola vez y aparece en las dos fichas.</div>
      <div class="catc-sb" style="margin-bottom:12px"><i class="ti ti-search"></i><input id="pk_q" placeholder="Buscar" style="padding-left:28px"></div>
      <div id="pk_l">${opciones.length
        ? opciones.map(o => `<button class="catc-pk" data-id="${esc(o.id)}"><i class="ti ti-plus"></i>${esc(o.label)}</button>`).join('')
        : '<div class="catc-hint">Ya están todos vinculados, o falta capturarlos en el catálogo.</div>'}</div>
    </div>`;
    $det().querySelector('[data-back]').addEventListener('click', () => abrirDetalle(selId));
    $det().querySelectorAll('.catc-pk').forEach(b => b.addEventListener('click', async () => {
      const opt = opciones.find(o => String(o.id) === b.dataset.id);
      await onPick(opt);
    }));
    const qi = document.getElementById('pk_q');
    if (qi) qi.addEventListener('input', () => {
      const t = ERP.norm(qi.value);
      $det().querySelectorAll('.catc-pk').forEach(b => { b.style.display = ERP.norm(b.textContent).includes(t) ? 'flex' : 'none'; });
    });
  }

  /* ================= Altas (nuevo) ================= */
  function crearNuevo() { esProd() ? crearProducto() : crearContraparte(); }

  function crearProducto() {
    const cats = listas.categoria || [];
    $det().innerHTML = `<div class="catc-dwrap">
      <button class="catc-act" data-back style="margin-bottom:14px"><i class="ti ti-arrow-left"></i>Productos</button>
      <div style="font-size:18px;font-weight:600;margin-bottom:2px">Nuevo producto</div>
      <div class="catc-hint" style="margin-bottom:16px">Solo el nombre es obligatorio. Los SKUs y variedades se agregan después de crear.</div>
      <div class="catc-card"><h4>Datos generales</h4>
        <div class="catc-g2" style="margin-bottom:10px"><div class="f"><label>Nombre *</label><input id="n_nombre" autofocus></div><div class="f"><label>Código (auto si vacío)</label><input id="n_codigo" class="mono"></div></div>
        <div class="catc-g3"><div class="f"><label>Categoría</label><select id="n_cat"><option value=""></option>${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></div><div class="f"><label>País de origen</label><input id="n_pais"></div><div class="f"><label>Orgánico</label><select id="n_org"><option value="false">No</option><option value="true">Sí</option></select></div></div>
        <div class="f" style="margin-top:10px"><label>Nota</label><input id="n_nota"></div>
      </div>
      <div class="catc-dfoot"><span class="catc-hint">* obligatorio</span><div style="display:flex;gap:7px"><button class="catc-act" data-back>Cancelar</button><button class="btn-primary catc-act" data-create><i class="ti ti-check"></i>Crear producto</button></div></div>
    </div>`;
    $det().querySelector('[data-back]').addEventListener('click', () => abrirDetalle(selId));
    $det().querySelector('[data-create]').addEventListener('click', async () => {
      const v = id => (document.getElementById(id) || {}).value;
      const nombre = v('n_nombre').trim();
      if (!nombre) { ERP.toast('err', 'El nombre es obligatorio.'); return; }
      if (!(await confirmarSiDuplicado('v_catc_productos', nombre))) return;
      try {
        const r = uno(await rpc('fn_cat_producto_alta', {
          p_nombre: nombre, p_codigo_item: v('n_codigo').trim() || null, p_categoria: v('n_cat') || null,
          p_pais_origen: v('n_pais').trim() || null, p_organico: v('n_org') === 'true', p_nota: v('n_nota').trim() || null
        }));
        ERP.limpiarCache();
        ERP.toast('ok', 'Producto creado');
        await recargarLista();
        if (r.id != null) { selId = r.id; pintarRows(); abrirDetalle(selId); }
      } catch (e) { if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', 'El ERP rechazó el producto: ' + esc(e.message)); }
    });
  }

  function crearContraparte() {
    const esCli = tab === 'cli';
    $det().innerHTML = `<div class="catc-dwrap">
      <button class="catc-act" data-back style="margin-bottom:14px"><i class="ti ti-arrow-left"></i>${esCli ? 'Clientes' : 'Proveedores'}</button>
      <div style="font-size:18px;font-weight:600;margin-bottom:2px">Nuevo ${esCli ? 'cliente' : 'proveedor'}</div>
      <div class="catc-hint" style="margin-bottom:16px">Una empresa puede ser cliente y proveedor a la vez.</div>
      <div class="catc-g2">
        <div>
          <div class="catc-card"><h4>Identidad</h4>
            <div class="f" style="margin-bottom:9px"><label>Nombre *</label><input id="x_nombre" autofocus></div>
            <div class="f" style="margin-bottom:11px"><label>Razón social</label><input id="x_razon"></div>
            <div style="display:flex;gap:16px;margin-bottom:11px"><label class="catc-chk"><input type="checkbox" id="x_prov" ${tab === 'prov' ? 'checked' : ''}>Proveedor</label><label class="catc-chk"><input type="checkbox" id="x_cli" ${esCli ? 'checked' : ''}>Cliente</label></div>
            <div class="f"><label>Tipo(s)</label>${chipsTagPicker('x_tipos', null)}</div>
          </div>
          <div class="catc-card"><h4>Fiscal</h4>
            <div class="catc-g2" style="margin-bottom:9px"><div class="f"><label>Tax ID / RFC</label><input id="x_tax" class="mono"></div><div class="f"><label>PACA</label><input id="x_paca" class="mono"></div></div>
            <div class="f" style="margin-bottom:9px"><label>Certificaciones</label><input id="x_cert" placeholder="GAP, Orgánico…"></div>
            <div class="catc-g2"><div class="f"><label>País</label><input id="x_pais"></div><div class="f"><label>Ciudad</label><input id="x_ciudad"></div></div>
          </div>
        </div>
        <div>
          <div class="catc-card"><h4>Términos</h4>
            <div class="catc-kv"><span>Días de crédito</span><input id="x_credito" type="number" value="0"></div>
            <div class="catc-kv"><span>Límite de crédito</span><input id="x_limite" type="number"></div>
            <div class="catc-kv"><span>Método de pago</span><input id="x_pago" placeholder="ACH / Cheque"></div>
            <div class="catc-kv"><span>Moneda</span><input id="x_moneda" class="mono" value="USD"></div>
          </div>
          <div class="catc-card"><h4>Contacto principal</h4>
            <div class="f" style="margin-bottom:8px"><label>Nombre</label><input id="x_cnom"></div>
            <div class="catc-g2" style="margin-bottom:8px"><div class="f"><label>Rol</label><input id="x_crol" placeholder="Compras / Pagos"></div><div class="f"><label>Correo</label><input id="x_cmail"></div></div>
            <div class="f"><label>WhatsApp</label><input id="x_cwa" placeholder="Solo dígitos, con país"></div>
          </div>
        </div>
      </div>
      <div class="catc-dfoot"><span class="catc-hint">* obligatorio · más contactos y SKUs, después</span><div style="display:flex;gap:7px"><button class="catc-act" data-back>Cancelar</button><button class="btn-primary catc-act" data-create><i class="ti ti-check"></i>Crear ${esCli ? 'cliente' : 'proveedor'}</button></div></div>
    </div>`;
    $det().querySelector('[data-back]').addEventListener('click', () => abrirDetalle(selId));
    wireTagPicker('x_tipos');
    $det().querySelector('[data-create]').addEventListener('click', async () => {
      const v = id => (document.getElementById(id) || {}).value;
      const chk = id => !!(document.getElementById(id) || {}).checked;
      const nombre = v('x_nombre').trim();
      if (!nombre) { ERP.toast('err', 'El nombre es obligatorio.'); return; }
      if (!(await confirmarSiDuplicado('v_catc_contrapartes', nombre))) return;
      try {
        const r = uno(await rpc('fn_cat_contraparte_alta', {
          p_nombre: nombre, p_razon_social: v('x_razon').trim() || null, p_es_cliente: chk('x_cli'), p_es_proveedor: chk('x_prov'),
          p_rfc_tax_id: v('x_tax').trim() || null, p_paca_licencia: v('x_paca').trim() || null, p_certificaciones: v('x_cert').trim() || null,
          p_pais: v('x_pais').trim() || null, p_ciudad: v('x_ciudad').trim() || null,
          p_dias_credito: num(v('x_credito')), p_limite_credito: num(v('x_limite')), p_metodo_pago: v('x_pago').trim() || null,
          p_moneda: v('x_moneda').trim() || 'USD',
          p_tipos: leerTags('x_tipos')
        }));
        // el contacto principal se crea aparte (una sola lista de contactos; p_email/p_telefono_whatsapp
        // sueltos ya no existen en la contraparte — viven en el contacto marcado es_principal)
        if (r.id != null && v('x_cnom').trim()) {
          await rpc('fn_cat_contacto_alta', { p_contraparte_id: Number(r.id), p_nombre: v('x_cnom').trim(), p_rol: v('x_crol').trim() || null, p_email: v('x_cmail').trim() || null, p_telefono_whatsapp: v('x_cwa').trim() || null, p_es_principal: true }).catch(() => {});
        }
        ERP.limpiarCache();
        ERP.toast('ok', (esCli ? 'Cliente' : 'Proveedor') + ' creado');
        await recargarLista();
        if (r.id != null) { selId = r.id; pintarRows(); abrirDetalle(selId); }
      } catch (e) { if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', 'El ERP rechazó el registro: ' + esc(e.message)); }
    });
  }

  /* ================= Eliminar / papelera ================= */
  const RPC_ELIMINAR = { producto: 'fn_cat_producto_eliminar', variedad: 'fn_cat_variedad_eliminar', sku: 'fn_cat_sku_eliminar', contraparte: 'fn_cat_contraparte_eliminar', contacto: 'fn_cat_contacto_eliminar' };
  async function eliminar(entidad, id, nombre, quedarseEnDetalle) {
    if (!confirm(`¿Eliminar ${nombre}? Va a la papelera y se puede restaurar (si tiene movimientos, se archiva).`)) return;
    try {
      const r = uno(await rpc(RPC_ELIMINAR[entidad], { p_id: Number(id) }));
      ERP.limpiarCache();
      ERP.toast('ok', r.accion === 'archivado' ? 'Tenía movimientos: se archivó (inactivo).' : 'En papelera.');
      if (quedarseEnDetalle && det) {
        // sub-registro (variedad/sku/contacto): recargar el detalle del padre
        if (esProd()) { det = { reg: det.reg, ...(await cargarDetalleProducto(det.reg.id)) }; detProducto(); }
        else { det = { reg: det.reg, ...(await cargarDetalleContraparte(det.reg.id)) }; detContraparte(); }
      } else {
        selId = null; await recargarLista(); abrirDetalle(selId);
      }
    } catch (e) { if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', 'No se pudo eliminar: ' + esc(e.message)); }
  }

  const RPC_RESTAURAR = { producto: 'fn_cat_producto_restaurar', variedad: 'fn_cat_variedad_restaurar', sku: 'fn_cat_sku_restaurar', contraparte: 'fn_cat_contraparte_restaurar' };
  const RPC_PURGAR = { producto: 'fn_cat_producto_purgar', sku: 'fn_cat_sku_purgar', variedad: 'fn_cat_variedad_purgar', contraparte: 'fn_cat_contraparte_purgar', contacto: 'fn_cat_contacto_purgar' };
  async function vistaPapelera() {
    selId = null;
    const filas = await q('v_catc_papelera', '&order=deleted_at.desc').catch(() => []);
    document.getElementById('catcRows').innerHTML = '<div class="catc-hint" style="padding:16px">Papelera abierta en el detalle →</div>';
    $det().innerHTML = `<div class="catc-dwrap">
      <div style="font-size:17px;font-weight:600;margin-bottom:2px">Papelera</div>
      <div class="catc-hint" style="margin-bottom:14px">Registros eliminados. Restaurar los devuelve al catálogo. (Los contactos no se restauran desde aquí.) "Eliminar definitivo" los borra de la base — no se puede deshacer, y si tienen otros registros dependiendo de ellos (ej. un producto con SKUs), el ERP lo rechaza y explica por qué.</div>
      ${(filas || []).length ? `<div class="tabla-wrap"><table class="catc-tbl"><thead><tr><th>Tipo</th><th>Registro</th><th>Eliminado</th><th></th></tr></thead>
        <tbody>${filas.map(f => `<tr><td class="catc-sec">${esc(f.entidad)}</td><td>${esc(f.etiqueta || '—')}</td>
          <td class="catc-sec">${esc(ERP.fecha(f.deleted_at))}</td>
          <td style="text-align:right;white-space:nowrap">${(puedeCap() && RPC_RESTAURAR[f.entidad]) ? `<button class="catc-act" data-restore="${esc(f.entidad)}:${esc(f.id)}"><i class="ti ti-arrow-back-up"></i>Restaurar</button>` : ''}${(puedeCap() && RPC_PURGAR[f.entidad]) ? ` <button class="catc-act del" data-purgar="${esc(f.entidad)}:${esc(f.id)}" title="Borra de la base, sin vuelta atrás"><i class="ti ti-trash"></i>Eliminar definitivo</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="catc-hint">Papelera vacía.</div>'}
    </div>`;
    $det().querySelectorAll('[data-restore]').forEach(b => b.addEventListener('click', async () => {
      const [ent, id] = b.dataset.restore.split(':');
      try { await rpc(RPC_RESTAURAR[ent], { p_id: Number(id) }); ERP.limpiarCache(); ERP.toast('ok', 'Restaurado'); vistaPapelera(); recargarLista(); }
      catch (e) { ERP.toast('err', 'No se pudo restaurar: ' + esc(e.message)); }
    }));
    $det().querySelectorAll('[data-purgar]').forEach(b => b.addEventListener('click', async () => {
      const [ent, id] = b.dataset.purgar.split(':');
      const fila = filas.find(x => x.entidad === ent && String(x.id) === id);
      if (!confirm(`¿Eliminar DEFINITIVAMENTE "${(fila && fila.etiqueta) || ent}"?\n\nEsto no se puede deshacer — no queda en la papelera ni se puede recuperar.`)) return;
      try {
        await rpc(RPC_PURGAR[ent], { p_id: Number(id) });
        ERP.limpiarCache();
        ERP.toast('ok', 'Eliminado definitivamente.');
        vistaPapelera(); recargarLista();
      } catch (e) {
        // El backend puede bloquear con un mensaje legible (ej. "tiene 3 SKU(s) y 1 variedad(es)...") —
        // se muestra tal cual: es información útil para Miguel, no un error genérico que ocultar.
        ERP.toast('err', esc(e.message), 9000);
      }
    }));
    ERP.marcarTabla($det());   // D-193
  }

  /* ================= Listas de valores ================= */
  async function vistaListas() {
    selId = null;
    listas = null; await cargarListas();
    const filas = await q('v_catc_listas_valores', '&order=tipo.asc,orden.asc,valor.asc').catch(() => []);
    const porTipo = {};
    (filas || []).forEach(f => { (porTipo[f.tipo] = porTipo[f.tipo] || []).push(f); });
    const TIPOS = ['empaque', 'calibre', 'tamano', 'grado', 'marca', 'unidad', 'categoria', 'tipo_contraparte'];
    const LABEL_TIPO = { tipo_contraparte: 'Tipo de proveedor', tamano: 'Tamaño', marca: 'Marca' };
    document.getElementById('catcRows').innerHTML = '<div class="catc-hint" style="padding:16px">Listas abiertas en el detalle →</div>';
    $det().innerHTML = `<div class="catc-dwrap">
      <div style="font-size:17px;font-weight:600;margin-bottom:2px">Listas de valores</div>
      <div class="catc-hint" style="margin-bottom:14px">Vocabularios controlados que alimentan los selectores (empaque, calibre, tamaño, grado, marca, unidad, categoría, tipo de proveedor). Agregar aquí o al vuelo desde el armador de SKU / la ficha de contraparte.</div>
      ${TIPOS.map(t => `<div class="catc-card"><h4>${esc(LABEL_TIPO[t] || t)} ${puedeCap() ? `<span class="catc-add" data-addlv="${esc(t)}"><i class="ti ti-plus"></i>Agregar</span>` : ''}</h4>
        <div style="display:flex;flex-wrap:wrap;gap:7px">${(porTipo[t] || []).length
          ? porTipo[t].map(v => `<span class="catc-chip ${v.activo === false ? 'off' : ''}">${esc(v.valor)}${puedeCap() ? `<i class="ti ti-x" data-dellv="${esc(v.id)}" title="Quitar"></i>` : ''}</span>`).join('')
          : '<span class="catc-hint">Vacío.</span>'}</div></div>`).join('')}
    </div>`;
    $det().querySelectorAll('[data-addlv]').forEach(b => b.addEventListener('click', async () => {
      const val = (prompt(`Nuevo valor para «${b.dataset.addlv}»:`) || '').trim();
      if (!val) return;
      try { await rpc('fn_cat_lista_valor_alta', { p_tipo: b.dataset.addlv, p_valor: val }); ERP.limpiarCache(); ERP.toast('ok', 'Agregado'); vistaListas(); }
      catch (e) { ERP.toast('err', 'No se pudo: ' + esc(e.message)); }
    }));
    $det().querySelectorAll('[data-dellv]').forEach(b => b.addEventListener('click', async () => {
      try { const r = uno(await rpc('fn_cat_lista_valor_eliminar', { p_id: Number(b.dataset.dellv) })); ERP.limpiarCache(); ERP.toast('ok', r.accion === 'archivado' ? 'En uso: se desactivó.' : 'Quitado'); vistaListas(); }
      catch (e) { ERP.toast('err', 'No se pudo: ' + esc(e.message)); }
    }));
  }

  /* ================= Destinos (bodegas propias/cliente/proveedor/cross-dock) =================
     Catálogo nuevo (v_op_destinos + fn_op_location_alta/editar) que alimenta el SHIP TO real de
     las órdenes de compra (O3c). Vista propia (mismo patrón que Listas/Papelera arriba: se pinta
     directo en $det(), catcRows queda como aviso) — más simple que Productos/Contrapartes (sin
     sub-entidades), no necesita meterse en el master-detail esProd()/tab. Sin RPC de eliminar:
     "borrar" es desactivar (p_activo=false) vía editar. */
  const TIPO_DESTINO_LABEL = { propia: 'Bodega propia', cliente: 'Bodega de cliente', proveedor: 'Bodega de proveedor', cross_dock: 'Cross-dock', tercero: 'Tercero' };
  let contrapartesCatDest = null;
  async function cargarContrapartesDest() {
    if (contrapartesCatDest) return contrapartesCatDest;
    contrapartesCatDest = await q('v_catc_contrapartes', '&order=nombre.asc').catch(() => []);
    return contrapartesCatDest;
  }

  async function vistaDestinos() {
    selId = null;
    const filas = await q('v_op_destinos', '&order=nombre.asc').catch(() => []);
    document.getElementById('catcRows').innerHTML = '<div class="catc-hint" style="padding:16px">Destinos abiertos en el detalle →</div>';
    $det().innerHTML = `<div class="catc-dwrap">
      <div class="catc-dhead">
        <div style="font-size:17px;font-weight:600">Destinos</div>
        ${puedeCap() ? '<button class="btn-primary catc-act" id="destNuevo"><i class="ti ti-plus"></i>Nuevo destino</button>' : ''}
      </div>
      <div class="catc-hint" style="margin-bottom:14px">Bodegas propias, de cliente (entrega directa), de proveedor o cross-dock. Se usan como SHIP TO real en las órdenes de compra — antes siempre caía a la dirección de Plein.</div>
      ${(filas || []).length ? `<div class="tabla-wrap"><table class="catc-tbl"><thead><tr>
          <th>Nombre</th><th>Código</th><th>Tipo</th><th>Contraparte</th><th>Ciudad</th><th style="text-align:right">Lotes</th><th></th><th></th></tr></thead>
        <tbody>${filas.map(f => `<tr${f.activo === false ? ' style="opacity:.55"' : ''}>
          <td>${esc(f.nombre || '—')}</td>
          <td class="mono catc-sec">${esc(f.codigo || '—')}</td>
          <td class="catc-sec">${esc(f.tipo_etiqueta || TIPO_DESTINO_LABEL[f.tipo] || f.tipo || '—')}</td>
          <td class="catc-sec">${esc(f.contraparte || '—')}</td>
          <td class="catc-sec">${esc(f.ciudad || '—')}</td>
          <td style="text-align:right" class="catc-sec">${esc(f.lotes ?? 0)}</td>
          <td>${f.activo === false ? '<span class="catc-pill off"><span class="catc-dot"></span>Inactivo</span>' : '<span class="catc-pill ok"><span class="catc-dot"></span>Activo</span>'}</td>
          <td style="text-align:right;white-space:nowrap">${puedeCap() ? `<i class="ti ti-pencil catc-go editar" data-editdest="${esc(f.location_id)}" title="Editar destino"></i>
            <i class="ti ti-trash catc-go" data-deldest="${esc(f.location_id)}" data-nombre="${esc(f.nombre || '')}" title="Eliminar destino"></i>` : ''}</td>
        </tr>`).join('')}</tbody></table></div>`
        : '<div class="catc-hint">Sin destinos aún.</div>'}
    </div>`;
    const bNuevo = document.getElementById('destNuevo');
    if (bNuevo) bNuevo.addEventListener('click', () => formDestino(null));
    $det().querySelectorAll('[data-editdest]').forEach(b => b.addEventListener('click', () => {
      const f = filas.find(x => String(x.location_id) === b.dataset.editdest);
      if (f) formDestino(f);
    }));
    $det().querySelectorAll('[data-deldest]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar el destino «${b.dataset.nombre}»? Si tiene lotes o compras con historial, el ERP lo va a rechazar (mejor desactivarlo en ese caso).`)) return;
      const id = b.dataset.deldest;
      try {
        await rpc('fn_op_location_eliminar', { p_id: Number(id) });
        ERP.limpiarCache();
        ERP.toast('ok', `Destino «${esc(b.dataset.nombre)}» eliminado.`);
        const tr = b.closest('tr');
        if (tr) tr.remove();
      } catch (e) {
        if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', esc(e.message), 9000);
      }
    }));
  }

  function formDestino(existing) {
    const esNuevo = !existing;
    const d = existing || {};
    const ro = puedeCap() ? '' : ' disabled';
    const tipoActual = String(d.tipo || '');
    const tipoOpts = Object.entries(TIPO_DESTINO_LABEL).map(([k, lbl]) => `<option value="${k}" ${tipoActual === k ? 'selected' : ''}>${esc(lbl)}</option>`).join('');

    $det().innerHTML = `<div class="catc-dwrap">
      <button type="button" class="catc-act" data-back style="margin-bottom:14px"><i class="ti ti-arrow-left"></i>Volver a Destinos</button>
      <div class="catc-dhead">
        <div style="flex:1;display:grid;grid-template-columns:1fr 130px;gap:10px;min-width:240px">
          <div class="f"><label>Nombre</label><input id="d_nombre" value="${esc(d.nombre || '')}" style="font-size:15px;font-weight:600;height:36px"${ro}></div>
          <div class="f"><label>Código</label><input id="d_codigo" class="mono" value="${esc(d.codigo || '')}" style="height:36px"${ro}></div>
        </div>
        ${!esNuevo ? `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:7px">
          ${d.activo === false ? '<span class="catc-pill off"><span class="catc-dot"></span>Inactivo</span>' : '<span class="catc-pill ok"><span class="catc-dot"></span>Activo</span>'}
        </div>` : ''}
      </div>

      <div class="catc-card"><h4>Datos generales</h4>
        <div class="catc-g3">
          <div class="f"><label>Tipo</label><select id="d_tipo"${ro}>${tipoOpts}</select></div>
          <div class="f"><label>Ciudad</label><input id="d_ciudad" value="${esc(d.ciudad || '')}"${ro}></div>
          <div class="f"><label>Estado/Región</label><input id="d_estado" value="${esc(d.estado_region || '')}"${ro}></div>
        </div>
        <div class="catc-g3" style="margin-top:10px">
          <div class="f"><label>País</label><input id="d_pais" value="${esc(d.pais || '')}"${ro}></div>
          <div class="f"><label>Contacto</label><input id="d_contacto" value="${esc(d.contacto || '')}"${ro}></div>
          <div class="f"><label>Teléfono</label><input id="d_telefono" value="${esc(d.telefono || '')}"${ro}></div>
        </div>
        <div class="f" style="margin-top:10px"><label>Dirección</label><input id="d_direccion" value="${esc(d.direccion || '')}"${ro}></div>
        <div class="f" style="margin-top:10px"><label>Nota</label><input id="d_nota" value="${esc(d.nota || '')}"${ro}></div>
        ${!esNuevo ? `<div class="f" style="margin-top:10px"><label style="display:flex;align-items:center;gap:6px;text-transform:none;font-size:12.5px"><input type="checkbox" id="d_activo" ${d.activo === false ? '' : 'checked'}${ro} style="width:auto">Activo</label></div>` : ''}
      </div>

      <div class="catc-card" id="d_contraparte_wrap" style="${['cliente', 'proveedor'].includes(tipoActual) ? '' : 'display:none'}">
        <h4>Contraparte vinculada</h4>
        <div class="catc-hint" style="margin-bottom:8px">Solo aplica cuando el tipo es «Bodega de cliente» o «Bodega de proveedor» — liga el destino a la contraparte del Directorio.</div>
        <div id="d_contraparte_pick"></div>
      </div>

      ${puedeCap() ? `<div class="acciones" style="margin-top:14px"><button class="btn-primary catc-act" id="d_guardar">Guardar</button></div>` : ''}
      <div class="aviso" id="d_aviso"></div>
    </div>`;

    document.getElementById('catcRows').innerHTML = '<div class="catc-hint" style="padding:16px">Destinos abiertos en el detalle →</div>';
    $det().querySelector('[data-back]').addEventListener('click', vistaDestinos);

    let comboContraparteDest = null;
    async function montarComboContraparte() {
      const cont = document.getElementById('d_contraparte_pick');
      if (!cont) return;
      const todas = await cargarContrapartesDest();
      const tipoAhora = document.getElementById('d_tipo').value;
      const items = todas.filter(c => tipoAhora === 'cliente' ? c.es_cliente : tipoAhora === 'proveedor' ? c.es_proveedor : false)
        .map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] }));
      comboContraparteDest = ERP.crearCombo({
        contenedor: cont, items, placeholder: 'Busca la contraparte…', permitirNuevo: false,
        valorInicial: d.contraparte || null
      });
    }
    if (['cliente', 'proveedor'].includes(tipoActual)) montarComboContraparte();

    const selTipo = document.getElementById('d_tipo');
    selTipo.addEventListener('change', () => {
      const t = selTipo.value;
      const wrap = document.getElementById('d_contraparte_wrap');
      if (['cliente', 'proveedor'].includes(t)) { wrap.style.display = ''; montarComboContraparte(); }
      else { wrap.style.display = 'none'; comboContraparteDest = null; }
    });

    function avisoDest(tipo, html) {
      const el = document.getElementById('d_aviso');
      if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
    }

    const bGuardar = document.getElementById('d_guardar');
    if (bGuardar) bGuardar.addEventListener('click', async () => {
      const v = id => (document.getElementById(id) || {}).value;
      const nombre = v('d_nombre').trim();
      if (!nombre) { avisoDest('err', 'El nombre es obligatorio.'); return; }
      const tipo = v('d_tipo');
      const contraparte_id = (['cliente', 'proveedor'].includes(tipo) && comboContraparteDest) ? comboContraparteDest.valorId() : null;
      bGuardar.disabled = true;
      const args = {
        p_codigo: v('d_codigo').trim() || null,
        p_nombre: nombre,
        p_tipo: tipo,
        p_direccion: v('d_direccion').trim() || null,
        p_ciudad: v('d_ciudad').trim() || null,
        p_estado_region: v('d_estado').trim() || null,
        p_pais: v('d_pais').trim() || null,
        p_contraparte_id: contraparte_id,
        p_contacto: v('d_contacto').trim() || null,
        p_telefono: v('d_telefono').trim() || null,
        p_nota: v('d_nota').trim() || null
      };
      try {
        if (esNuevo) {
          const r = uno(await rpc('fn_op_location_alta', args));
          ERP.limpiarCache();
          ERP.toast('ok', `Destino «${esc(r.codigo || nombre)}» creado.`);
        } else {
          const activo = document.getElementById('d_activo');
          await rpc('fn_op_location_editar', { p_id: Number(d.location_id), ...args, p_activo: activo ? activo.checked : null });
          ERP.limpiarCache();
          ERP.toast('ok', 'Destino guardado.');
        }
        vistaDestinos();
      } catch (e) {
        if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) avisoDest('err', 'El ERP rechazó el cambio: ' + esc(e.message));
        bGuardar.disabled = false;
      }
    });
  }

  /* ================= Importar Excel ================= */
  function vistaImportar(entidadForzada) {
    const entidadDefault = entidadForzada || (esProd() ? 'productos' : 'contrapartes');
    let entidad = entidadDefault, parsed = null, mapeo = {};
    const cont = $det();

    function pintar() {
      const campos = camposMapeo(entidad);
      const req = { productos: ['nombre'], skus: ['producto', 'empaque'], contrapartes: ['nombre'] }[entidad];
      cont.innerHTML = `<div class="catc-dwrap">
        <button class="catc-act" data-back style="margin-bottom:14px"><i class="ti ti-arrow-left"></i>Volver</button>
        <div style="font-size:18px;font-weight:600;margin-bottom:2px">Importar de Excel</div>
        <div class="catc-hint" style="margin-bottom:14px">Baja la plantilla, llénala, súbela. Se cuadran columnas y previsualizas antes de guardar. Nada se guarda hasta confirmar.</div>
        <div class="catc-hint" style="margin-bottom:6px">¿Qué importas?</div>
        <div class="catc-segtog" style="margin-bottom:12px">
          <button class="${entidad === 'productos' ? 'on' : ''}" data-ent="productos">Productos</button>
          <button class="${entidad === 'skus' ? 'on' : ''}" data-ent="skus">SKUs</button>
          <button class="${entidad === 'contrapartes' ? 'on' : ''}" data-ent="contrapartes">Contrapartes</button>
        </div>
        <div style="display:flex;gap:8px;margin-bottom:12px"><a class="catc-act" href="${PLANTILLA[entidad]}" download><i class="ti ti-download"></i>Descargar plantilla</a></div>
        <div class="catc-dz" id="imp_dz"><i class="ti ti-file-spreadsheet" style="font-size:32px;color:var(--brand)"></i>
          <div style="font-size:13px;font-weight:500;margin-top:8px">Arrastra tu archivo aquí</div>
          <button type="button" class="catc-act" id="imp_pick_btn" style="margin-top:10px"><i class="ti ti-folder-open"></i>Seleccionar archivo</button>
          <div class="catc-hint" style="margin-top:8px">Primera fila = encabezados. Campos: ${campos.map(c => esc(c) + (req.includes(c) ? '*' : '')).join(', ')}</div>
          <input type="file" id="imp_file" accept=".xlsx,.xls,.csv" style="display:none">
        </div>
        <div id="imp_res"></div>
      </div>`;
      cont.querySelector('[data-back]').addEventListener('click', () => abrirDetalle(selId));
      cont.querySelectorAll('[data-ent]').forEach(b => b.addEventListener('click', () => { entidad = b.dataset.ent; parsed = null; pintar(); }));
      const fileInp = document.getElementById('imp_file');
      document.getElementById('imp_pick_btn').addEventListener('click', () => fileInp.click());
      fileInp.addEventListener('change', e => { if (e.target.files[0]) leerArchivo(e.target.files[0]); });
      const dz = document.getElementById('imp_dz');
      dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
      dz.addEventListener('dragleave', () => dz.classList.remove('over'));
      dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('over'); if (e.dataTransfer.files[0]) leerArchivo(e.dataTransfer.files[0]); });
      if (parsed) pintarMapeoYPreview();
    }

    async function leerArchivo(file) {
      try {
        if (!window.XLSX) throw new Error('La librería XLSX no está cargada.');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
        if (!rows.length) throw new Error('El archivo está vacío.');
        const headers = rows[0].map(h => String(h == null ? '' : h).replace(/\s*\*\s*$/, '').trim());
        const datos = rows.slice(1).filter(r => r.some(c => c != null && String(c).trim() !== ''));
        parsed = { headers, datos };
        // auto-mapeo: header normalizado === campo canónico
        const campos = camposMapeo(entidad);
        mapeo = {};
        headers.forEach((h, i) => { const n = ERP.norm(h).replace(/\s+/g, '_'); const m = campos.find(c => ERP.norm(c) === n); if (m) mapeo[i] = m; });
        pintar();
      } catch (e) { ERP.toast('err', 'No se pudo leer: ' + esc(e.message)); }
    }

    function pintarMapeoYPreview() {
      const campos = camposMapeo(entidad);
      const res = document.getElementById('imp_res');
      const opts = sel => ['<option value="">Ignorar</option>', ...campos.map(c => `<option ${sel === c ? 'selected' : ''}>${esc(c)}</option>`)].join('');
      // preview: nuevas vs existentes por nombre contra la lista cargada (si aplica a la pestaña)
      const idxNombre = Object.keys(mapeo).find(k => mapeo[k] === 'nombre');
      const existentesSet = new Set((entidad === 'productos' && esProd() ? listaActual : (entidad === 'contrapartes' ? listaActual : [])).map(x => ERP.norm(x.nombre)));
      let nuevas = 0, existen = 0;
      const muestras = parsed.datos.slice(0, 8).map(fila => {
        const obj = {}; Object.keys(mapeo).forEach(k => { obj[mapeo[k]] = fila[k]; });
        const yaEsta = idxNombre != null && existentesSet.has(ERP.norm(fila[idxNombre]));
        return { obj, yaEsta };
      });
      parsed.datos.forEach(fila => { const ya = idxNombre != null && existentesSet.has(ERP.norm(fila[idxNombre])); ya ? existen++ : nuevas++; });

      res.innerHTML = `
        <div class="catc-card" style="margin-top:12px"><h4>Paso 2 · Cuadrar columnas</h4>
          <table class="catc-tbl"><thead><tr><th>Tu Excel</th><th></th><th>Campo del catálogo</th></tr></thead><tbody>
            ${parsed.headers.map((h, i) => `<tr><td class="mono" style="font-size:11px">${esc(h || '(col ' + (i + 1) + ')')}</td>
              <td class="catc-mut"><i class="ti ti-arrow-right"></i></td>
              <td><select data-mapcol="${i}" style="width:auto;min-width:150px">${opts(mapeo[i])}</select></td></tr>`).join('')}
          </tbody></table>
        </div>
        <div class="catc-card"><h4>Paso 3 · Previsualizar <span class="catc-hint" style="text-transform:none;letter-spacing:0">${parsed.datos.length} filas · ${nuevas} nuevas · ${existen} ya existen</span></h4>
          <table class="catc-tbl"><thead><tr><th>Nombre</th><th>Detalle</th><th>Resultado</th></tr></thead><tbody>
            ${muestras.map(m => `<tr><td>${esc(m.obj.nombre || m.obj.producto || '—')}</td>
              <td class="catc-sec">${esc([m.obj.categoria, m.obj.empaque, m.obj.ciudad].filter(Boolean).join(' · ') || '—')}</td>
              <td>${m.yaEsta ? '<span class="catc-pill warn">Ya existe</span>' : '<span class="catc-pill ok"><span class="catc-dot"></span>Nueva</span>'}</td></tr>`).join('')}
          </tbody></table>
          ${parsed.datos.length > 8 ? `<div class="catc-hint">…y ${parsed.datos.length - 8} más.</div>` : ''}
        </div>
        <div class="catc-dfoot"><span class="catc-hint">Nada se guarda hasta confirmar.</span>
          <div style="display:flex;gap:7px"><button class="catc-act" data-back2>Cancelar</button><button class="btn-primary catc-act" data-conf><i class="ti ti-check"></i>Importar ${nuevas} nuevas</button></div></div>`;

      res.querySelectorAll('[data-mapcol]').forEach(s => s.addEventListener('change', () => {
        const i = s.dataset.mapcol; if (s.value) mapeo[i] = s.value; else delete mapeo[i]; pintarMapeoYPreview();
      }));
      res.querySelector('[data-back2]').addEventListener('click', () => abrirDetalle(selId));
      res.querySelector('[data-conf]').addEventListener('click', () => confirmarImport());
    }

    async function confirmarImport() {
      const filas = parsed.datos.map(fila => {
        const obj = {}; Object.keys(mapeo).forEach(k => { const val = fila[k]; if (val != null && String(val).trim() !== '') obj[mapeo[k]] = val; }); return obj;
      }).filter(o => o.nombre || o.producto);
      if (!filas.length) { ERP.toast('err', 'No hay filas mapeadas con nombre.'); return; }
      const fn = { productos: 'fn_cat_import_productos', skus: 'fn_cat_import_skus', contrapartes: 'fn_cat_import_contrapartes' }[entidad];
      const args = { p_filas: filas };
      if (entidad === 'contrapartes') { args.p_forzar_cliente = tab === 'cli'; args.p_forzar_proveedor = tab === 'prov'; }
      try {
        const r = uno(await rpc(fn, args));
        ERP.limpiarCache();
        ERP.toast('ok', `${r.insertados ?? 0} ${entidad} importados${r.existentes ? ' · ' + r.existentes + ' ya existían' : ''}.`);
        await recargarLista();
        pintarResultado(r);
      } catch (e) { if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', 'La importación falló: ' + esc(e.message)); }
    }

    function pintarResultado(r) {
      const res = document.getElementById('imp_res');
      const detalle = Array.isArray(r.detalle) ? r.detalle : null;
      res.innerHTML = `
        <div class="catc-card"><h4>Resultado</h4>
          <div class="catc-hint" style="margin-bottom:10px">${esc(r.insertados ?? 0)} insertados${r.existentes ? ' · ' + esc(r.existentes) + ' ya existían' : ''}.</div>
          ${detalle && detalle.length ? `<table class="catc-tbl"><thead><tr><th>Producto</th><th>Estado</th><th>ID</th></tr></thead><tbody>
            ${detalle.map(d => `<tr><td>${esc(d.producto ?? '—')}</td><td>${esc(d.estado ?? '—')}</td><td class="mono">${esc(d.id ?? '—')}</td></tr>`).join('')}
          </tbody></table>` : ''}
        </div>
        <div class="catc-dfoot"><span></span><button class="btn-primary catc-act" id="imp_listo"><i class="ti ti-check"></i>Listo</button></div>`;
      document.getElementById('imp_listo').addEventListener('click', () => abrirDetalle(selId));
    }

    pintar();
  }

  /* ================= Exportar Excel (simétrico al import) ================= */
  function filaExport(reg, campos) {
    const o = {}; campos.forEach(c => { const v = reg[c]; o[c] = v == null ? '' : v; }); return o;
  }

  async function exportarExcel() {
    try {
      if (!window.XLSX) throw new Error('La librería XLSX no está cargada.');
      const wb = XLSX.utils.book_new();
      const hoy = ERP.hoyISO ? ERP.hoyISO() : new Date().toISOString().slice(0, 10);
      let nombreArchivo;
      if (esProd()) {
        const [productos, skus] = await Promise.all([
          q('v_catc_productos', '&order=nombre.asc'),
          q('v_catc_skus', '&order=producto_id.asc,id.asc')
        ]);
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((productos || []).map(p => filaExport(p, CAMPOS_IMPORT.productos))), 'Productos');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((skus || []).map(s => filaExport(s, CAMPOS_IMPORT.skus))), 'SKUs');
        nombreArchivo = `catalogo_productos_${hoy}.xlsx`;
      } else {
        const filtro = tab === 'prov' ? '&es_proveedor=eq.true' : '&es_cliente=eq.true';
        const contrapartes = await q('v_catc_contrapartes', filtro + '&order=nombre.asc');
        const hoja = tab === 'prov' ? 'Proveedores' : 'Clientes';
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((contrapartes || []).map(c => filaExport(c, CAMPOS_IMPORT.contrapartes))), hoja);
        nombreArchivo = `catalogo_${tab === 'prov' ? 'proveedores' : 'clientes'}_${hoy}.xlsx`;
      }
      XLSX.writeFile(wb, nombreArchivo);
      ERP.toast('ok', 'Exportado');
    } catch (e) { ERP.toast('err', 'No se pudo exportar: ' + esc(e.message)); }
  }

  /* ================= Escritura genérica ================= */
  async function escribir(fn, args, okMsg, recargarCabecera) {
    try {
      await rpc(fn, args);
      ERP.limpiarCache();
      ERP.toast('ok', okMsg);
      // recargar detalle + lista
      if (esProd()) det = { reg: det.reg, ...(await cargarDetalleProducto(det.reg.id)) };
      else det = { reg: det.reg, ...(await cargarDetalleContraparte(det.reg.id)) };
      if (recargarCabecera) { await recargarLista(); const nuevo = listaActual.find(x => String(x.id) === String(det.reg.id)); if (nuevo) det.reg = nuevo; }
      esProd() ? detProducto() : detContraparte();
      if (recargarCabecera) pintarRows();
    } catch (e) { if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', 'El ERP rechazó el cambio: ' + esc(e.message)); }
  }

  ERP.registrar('catalogos-c', {
    titulo: 'Catálogos',
    descripcion: 'Camino C · directorio maestro — productos, SKUs, clientes y proveedores',
    render
  });
})();
