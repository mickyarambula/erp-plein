/* Módulo Customer PO (ruta 'o1-cpo') — CAMINO C · Fase O1 (D-160/161/162).
   Puerta de entrada del flujo Order-to-Cash reiniciado: el cliente manda su PO, aquí se captura,
   y desde un CPO "Abierto" se genera la Sales Order (que a su vez crea la OP — ver modulo-o1-so.js).

   SOLO FRONTEND. Lee por vistas en public, escribe por RPCs SECURITY DEFINER (op cerrado fuera del API).
   Vistas:
     v_op_customer_po (id, folio, cliente_id, cliente, numero_cliente, adjunto_ref, fecha_po,
       moneda, estado, nota, created_at, updated_at)
   Catálogo (realineado a cat.*, D-1xx ago 2026): el cliente ya no viene de v_catalogo_clientes —
   viene de v_catc_contrapartes filtrada por es_cliente=true (la misma fuente que usa Catálogos).
   fn_op_cpo_alta recibe p_cliente_id como bigint (valida es_cliente en cat.*) y genera el folio
   interno solo (formato CPO-26-001, año corto + consecutivo); el N° de PO del cliente se guarda
   aparte (p_numero_cliente). El frontend solo muestra el folio que llega — no lo formatea.
   RPC (capacidad 'capturar'):
     fn_op_cpo_alta(p_cliente_id bigint, p_numero_cliente, p_fecha_po, p_moneda, p_adjunto_ref, p_nota, p_actor)
       -> { customer_po_id, folio }
     fn_op_cpo_editar(p_id, p_numero_cliente, p_fecha_po, p_moneda, p_adjunto_ref, p_nota,
       p_cliente_id, p_actor) — p_cliente_id solo cambiable si el CPO aún NO tiene Sales Order
     fn_op_cpo_eliminar(p_id, p_actor) — borra CPO + su SO/líneas/OP en cascada
   El adjunto es una REFERENCIA a Storage (ruta/URL), no un archivo subido (D-162).
   Expone ERP.o1AbrirCPO(cpoId) para saltar a un CPO desde otro módulo. */

(function () {
  'use strict';
  const { q, rpc, esc, fecha } = ERP;

  const BUCKET_CPO = 'cpo-adjuntos';   // bucket privado (20 MB; pdf/png/jpeg/webp) — ver requiere URL firmada

  const actor = () => (ERP.perfil && ERP.perfil.socio_codigo) || null;
  const uno = d => Array.isArray(d) ? (d[0] || {}) : (d || {});
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const mesActual = () => hoyISO().slice(0, 7);   // 'YYYY-MM' local

  // Pastilla de estado del CPO. Abierto = pendiente de convertir (ámbar); Convertido = verde; otro = gris.
  function chipEstado(est) {
    const e = String(est || '').toLowerCase();
    const cls = e === 'convertido' ? 'verde' : e === 'abierto' ? 'ambar' : e.includes('cancel') ? 'rojo' : 'gris';
    return `<span class="pill ${cls}">${esc(est || '—')}</span>`;
  }

  // adjunto_ref es texto. `storage:bucket/ruta` → botón que abre por URL firmada (bucket privado);
  // http(s) → enlace directo; cualquier otra cosa → texto plano.
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

  // Abre un adjunto privado por URL firmada temporal (~1 h). Reusa el patrón de modulo-comercial.js.
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
  // Cablea los botones "Ver adjunto" de un contenedor. dentroDeFila → stopPropagation (no abrir la ficha).
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

  let cpos = [];
  let fEstado = '', fTexto = '';

  function filtrados() {
    const t = ERP.norm(fTexto);
    return cpos.filter(c => {
      if (fEstado && String(c.estado || '') !== fEstado) return false;
      if (!t) return true;
      return [c.folio, c.cliente, c.numero_cliente].some(v => ERP.norm(v).includes(t));
    });
  }

  function pintarKpis() {
    const abiertos = cpos.filter(c => String(c.estado || '').toLowerCase() === 'abierto').length;
    const convertidos = cpos.filter(c => String(c.estado || '').toLowerCase() === 'convertido').length;
    const mes = mesActual();
    const delMes = cpos.filter(c => String(c.fecha_po || '').slice(0, 7) === mes).length;
    const el = document.getElementById('cpoKpis');
    if (!el) return;
    el.innerHTML = `
      <div class="kpi"><div class="k">CPOs Abiertos</div><div class="v">${abiertos}</div></div>
      <div class="kpi"><div class="k">Convertidos</div><div class="v">${convertidos}</div></div>
      <div class="kpi"><div class="k">Del mes</div><div class="v ink">${delMes}</div></div>`;
  }

  function pintarTabla() {
    const cont = document.getElementById('cpoTabla');
    const conteo = document.getElementById('cpoConteo');
    const rows = filtrados();
    if (conteo) conteo.textContent = `${rows.length} de ${cpos.length} customer PO`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ningún customer PO coincide con el filtro.</div>'; return; }
    const puedeCap = ERP.puede('capturar');

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr><th>Folio</th><th>Cliente</th><th>N° cliente</th><th>Fecha</th><th>Moneda</th>
        <th>Estado</th><th>Adjunto</th><th></th></tr></thead>
      <tbody>${rows.map(c => {
        const abierto = String(c.estado || '').toLowerCase() === 'abierto';
        return `<tr class="clic" data-id="${esc(c.id)}">
          <td class="mono"><span class="enlace">${esc(c.folio || '—')}</span></td>
          <td class="ent">${esc(c.cliente || '—')}</td>
          <td class="mono">${esc(c.numero_cliente || '—')}</td>
          <td>${esc(fecha(c.fecha_po))}</td>
          <td class="mono">${esc(c.moneda || '—')}</td>
          <td>${chipEstado(c.estado)}</td>
          <td>${adjuntoHTML(c.adjunto_ref)}</td>
          <td class="acc">${abierto && puedeCap
            ? `<button class="btn-mini gen-so" data-id="${esc(c.id)}" data-folio="${esc(c.folio)}" data-cliente-id="${esc(c.cliente_id)}">Generar Sales Order</button>`
            : ''}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('button.gen-so').forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      if (ERP.o1CrearSODesde) ERP.o1CrearSODesde(Number(b.dataset.id), b.dataset.folio, b.dataset.clienteId ? Number(b.dataset.clienteId) : null);
      else ERP.toast('err', 'El módulo de Sales Orders no está cargado.');
    }));
    cont.querySelectorAll('tr.clic[data-id]').forEach(tr =>
      tr.addEventListener('click', () => verCPO(Number(tr.dataset.id))));
    cablearVerAdjunto(cont, true);
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    let filas;
    try {
      filas = await q('v_op_customer_po', '&order=created_at.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los customer PO: ${esc(e.message)}</div>`;
      return;
    }
    cpos = filas || [];
    fEstado = ''; fTexto = '';

    cont.innerHTML = `<div class="pantalla-o1-cpo">
      <div class="kpistrip" id="cpoKpis"></div>
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="cpoNuevo">Nuevo Customer PO</button>' : ''}
        <select class="busca" id="cpoFEstado" style="max-width:170px">
          <option value="">Todos los estados</option>
          <option value="Abierto">Abierto</option>
          <option value="Convertido">Convertido</option>
          <option value="Cancelado">Cancelado</option>
        </select>
        <input class="busca" id="cpoBuscar" type="search" placeholder="Buscar folio, cliente o N° cliente…" style="flex:1;min-width:180px">
        <span class="conteo" id="cpoConteo"></span>
      </div>
      <div id="cpoTabla"></div>
    </div>`;

    pintarKpis();
    pintarTabla();

    const bNuevo = document.getElementById('cpoNuevo');
    if (bNuevo) bNuevo.addEventListener('click', nuevoCPO);
    document.getElementById('cpoFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    document.getElementById('cpoBuscar').addEventListener('input', e => { fTexto = e.target.value; pintarTabla(); });
  }

  /* ================= Alta ================= */

  let comboCliente = null, clientesCat = [];
  let adjuntoSubido = null;   // 'storage:cpo-adjuntos/<ruta>' si el usuario subió un archivo en este alta

  function avisoNv(tipo, html) {
    const el = document.getElementById('cpoNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function nuevoCPO() {
    if (!ERP.puede('capturar')) return;
    ERP.cerrarPanel();
    adjuntoSubido = null;
    ERP.abrirPanel('Nuevo Customer PO', 'Captura el PO que envió el cliente', '<div class="skel">Cargando catálogos…</div>');
    try {
      clientesCat = await q('v_catc_contrapartes', '&es_cliente=eq.true&order=nombre.asc');
    } catch (e) {
      ERP.abrirPanel('Nuevo Customer PO', '', `<div class="errbox">No se pudieron leer los clientes: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Nuevo Customer PO', 'Captura el PO que envió el cliente', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Cliente <span class="req">*</span></label><div id="cpoCliente"></div>
            <div class="alias-ayuda">Contraparte marcada como cliente en el Directorio.</div></div>
          <div class="campo"><label>N° de PO del cliente</label>
            <input id="cpoNumCliente" type="text" maxlength="60" placeholder="Ej. 4500123 (opcional)"></div>
          <div class="campo"><label>Fecha del PO</label>
            <input id="cpoFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="cpoMoneda">${ERP.MONEDAS.map(m => `<option value="${m}">${m}</option>`).join('')}</select></div>
          <div class="campo ancho"><label>Adjunto del PO</label>
            <input id="cpoAdjunto" class="mono" type="text" placeholder="Pega una URL… o sube un archivo abajo">
            <div class="adjunto-sube">
              <label class="btn-file" for="cpoArchivo"><i class="ti ti-upload"></i> o subir archivo (PDF/imagen)</label>
              <input id="cpoArchivo" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" style="display:none">
              <span class="adjunto-estado" id="cpoArchivoEstado"></span>
            </div>
            <div class="alias-ayuda">Pega la URL/ruta donde vive el PDF, <b>o</b> sube el archivo (máx 20 MB: PDF, PNG, JPG, WEBP).</div>
            <div class="ia-leer-wrap">
              <button type="button" class="btn-mini gris" id="cpoLeerIA" disabled title="Sube un PDF/imagen primero">
                <i class="ti ti-sparkles"></i> Leer PO con IA</button>
              <span class="alias-ayuda">Sube el archivo arriba para habilitar la lectura por IA. La IA solo sugiere — nada se guarda hasta que confirmes.</span>
            </div></div>
          <div class="campo ancho"><label>Nota</label><textarea id="cpoNota" rows="2"></textarea></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="cpoCrear">Crear Customer PO</button>
          <button class="btn-mini gris" id="cpoCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="cpoNvAviso"></div>
      </div>`);

    comboCliente = ERP.crearCombo({
      contenedor: document.getElementById('cpoCliente'),
      items: clientesCat.map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] })),
      placeholder: 'Busca cliente por nombre o alias…', permitirNuevo: false
    });

    document.getElementById('cpoArchivo').addEventListener('change', onArchivoCPO);
    document.getElementById('cpoLeerIA').addEventListener('click', leerPOconIA);
    document.getElementById('cpoCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('cpoCrear').addEventListener('click', crearCPO);
  }

  // Sube el archivo elegido a cpo-adjuntos con ruta única y setea adjuntoSubido. Valida mime/tamaño
  // en cliente (el backend también valida) y muestra errores en el .aviso, sin romper el form.
  const MIMES_CPO = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
  const MAX_CPO = 20 * 1024 * 1024;
  async function onArchivoCPO(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!MIMES_CPO.includes(file.type)) { avisoNv('err', 'Tipo no permitido. Sube PDF, PNG, JPG o WEBP.'); e.target.value = ''; return; }
    if (file.size > MAX_CPO) { avisoNv('err', 'El archivo supera el máximo de 20 MB.'); e.target.value = ''; return; }

    const estado = document.getElementById('cpoArchivoEstado');
    if (estado) estado.textContent = 'Subiendo…';
    const nombreSaneado = file.name.replace(/[^\w.\-]+/g, '_');
    const anio = hoyISO().slice(0, 4);
    const ruta = `${anio}/${crypto.randomUUID()}-${nombreSaneado}`;
    try {
      const up = await ERP.sb.storage.from(BUCKET_CPO).upload(ruta, file, { contentType: file.type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      adjuntoSubido = `storage:${BUCKET_CPO}/${ruta}`;
      // El archivo manda sobre la URL pegada: se limpia y bloquea el input de texto para no ambiguar.
      const txt = document.getElementById('cpoAdjunto');
      if (txt) { txt.value = ''; txt.disabled = true; txt.placeholder = '(usando el archivo subido)'; }
      if (estado) {
        estado.innerHTML = `<i class="ti ti-file-check"></i> ${esc(file.name)} · <a class="enlace quitar" id="cpoArchivoQuitar">quitar</a>`;
        const q2 = document.getElementById('cpoArchivoQuitar');
        if (q2) q2.addEventListener('click', quitarArchivoCPO);
      }
      avisoNv('ok', 'Archivo subido. Se guardará al crear el Customer PO.');
      const btnIA = document.getElementById('cpoLeerIA');
      if (btnIA) { btnIA.disabled = false; btnIA.title = ''; }
    } catch (err) {
      adjuntoSubido = null;
      if (estado) estado.textContent = '';
      e.target.value = '';
      avisoNv('err', `No se pudo subir el archivo: ${esc(err.message)}`);
    }
  }
  function quitarArchivoCPO() {
    adjuntoSubido = null;
    const estado = document.getElementById('cpoArchivoEstado'); if (estado) estado.textContent = '';
    const inp = document.getElementById('cpoArchivo'); if (inp) inp.value = '';
    const txt = document.getElementById('cpoAdjunto');
    if (txt) { txt.disabled = false; txt.placeholder = 'Pega una URL… o sube un archivo abajo'; }
    const btnIA = document.getElementById('cpoLeerIA');
    if (btnIA) { btnIA.disabled = true; btnIA.title = 'Sube un PDF/imagen primero'; }
  }

  async function crearCPO() {
    const cliente_id = comboCliente && comboCliente.valorId();
    if (!cliente_id) { avisoNv('err', 'Elige un cliente de la lista.'); return; }
    const v = id => (document.getElementById(id) || {}).value;
    // El archivo subido (storage:...) manda; si no hubo, se usa la URL/ruta pegada.
    const adjRef = adjuntoSubido || (v('cpoAdjunto') || '').trim() || null;
    const args = {
      p_cliente_id: Number(cliente_id),
      p_numero_cliente: (v('cpoNumCliente') || '').trim() || null,
      p_fecha_po: v('cpoFecha') || null,
      p_moneda: v('cpoMoneda') || 'USD',
      p_adjunto_ref: adjRef,
      p_nota: (v('cpoNota') || '').trim() || null,
      p_actor: actor()
    };

    const btn = document.getElementById('cpoCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando customer PO…');
    try {
      const r = uno(await rpc('fn_op_cpo_alta', args));
      if (!r.folio) throw new Error('El ERP no devolvió el folio del customer PO.');
      ERP.toast('ok', `Customer PO <b>${esc(r.folio)}</b> creado (Abierto).`);
      ERP.marcarDatosSucios();
      await recargar();
      verCPO(r.customer_po_id);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó el customer PO: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Incremento B: "Leer PO con IA" (D-169/170/171) =================
     La IA solo SUGIERE (mapeo contra catálogo, D-167): cliente y cada producto de línea llegan
     con una `sugerencia` (o null) + `alternativas`, ambos EXISTENTES en catálogo — nunca se crea
     contraparte/producto nuevo desde aquí. El Sales Type NO lo da la IA: lo elige el usuario.
     Nada se guarda hasta "Confirmar y guardar", que reusa el MISMO par de RPCs del flujo manual
     (fn_op_cpo_alta → fn_op_so_crear_desde_cpo) con el mismo shape de p_lineas que crearSO() de
     modulo-o1-so.js. Edge Function 'extraer-po' (verify_jwt=false; exige capacidad 'capturar'
     igual, validada dentro de la función vía el JWT que invoke() adjunta solo). */

  // D-170: catálogo de errores de la Edge Function → mensaje claro en español.
  const MENSAJES_ERROR_IA = {
    falta_ruta: 'Falta la ruta del archivo — súbelo de nuevo e inténtalo otra vez.',
    sin_sesion: 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.',
    auth_error: 'No se pudo validar tu sesión. Intenta de nuevo.',
    sin_permiso_capturar: "No tienes permiso para capturar — pídele a un administrador el permiso 'capturar'.",
    descarga_falla: 'No se pudo descargar el PDF del PO. Verifica que se subió correctamente y vuelve a intentar.',
    anthropic_falla: 'El servicio de IA no respondió. Intenta de nuevo en unos segundos, o captura el Customer PO manualmente.',
    json_invalido: 'La IA devolvió una respuesta que no se pudo interpretar. Intenta de nuevo, o captura manualmente.'
  };

  async function mensajeErrorIA(error) {
    let codigo = null;
    try {
      if (error && error.context && typeof error.context.json === 'function') {
        const body = await error.context.json();
        codigo = body && body.error;
      }
    } catch (_) { /* el cuerpo no era JSON — nos quedamos con error.message */ }
    return MENSAJES_ERROR_IA[codigo] || (error && error.message) || 'Error desconocido al leer el PO con IA.';
  }

  async function leerPOconIA() {
    if (!ERP.puede('capturar')) return;
    const st = parseStorageRef(adjuntoSubido);
    if (!st) { avisoNv('err', 'Sube el archivo del PO primero (arriba).'); return; }

    const btn = document.getElementById('cpoLeerIA');
    const txtOriginal = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Leyendo…';
    avisoNv('warn', 'Leyendo el PO con IA — esto puede tardar unos segundos…');
    try {
      const { data, error } = await ERP.sb.functions.invoke('extraer-po', { body: { ruta: st.ruta } });
      if (error) throw new Error(await mensajeErrorIA(error));
      if (!data || data.ok !== true) throw new Error((data && data.error) || 'La IA no devolvió una extracción válida.');
      avisoNv('', '');
      await abrirRevisionIA(data);
    } catch (e) {
      avisoNv('err', `No se pudo leer el PO con IA: ${esc(e.message)}`);
      btn.disabled = false;
      btn.innerHTML = txtOriginal;
    }
  }

  /* ---------------- Pantalla de revisión (prellenada, editable) ---------------- */

  let iaComboCliente = null, iaClienteSugerencia = null;
  let iaLineas = [];        // [{ picker, sku_id, sku_etiqueta, sugerencia, alternativas, texto, marca, marca_privada, cantidad, uom, precio_unitario }]
  let iaCpoCreado = null;   // { customer_po_id, folio } una vez creado el paso A (evita duplicar en un reintento)
  let iaExtraccion = null, iaAdjuntoRef = null, iaRevenueModels = [], iaMarcasCat = [];

  function scoreBadge(sug) {
    if (!sug) return '<span class="pill gris">sin sugerencia</span>';
    const pct = Math.round(Number(sug.score || 0) * 100);
    const cls = pct >= 70 ? 'verde' : pct >= 30 ? 'ambar' : 'rojo';
    return `<span class="pill ${cls}">${pct}%</span>`;
  }

  function chipsAlternativas(alts, tipo, idx) {
    const lista = Array.isArray(alts) ? alts : [];
    if (!lista.length) return '';
    return `<div class="ia-alts">${lista.map(a => {
      const nombre = a.etiqueta || a.nombre || '';
      const pct = Math.round(Number(a.score || 0) * 100);
      return `<button type="button" class="chip ia-alt" data-tipo="${tipo}" data-idx="${idx ?? ''}" data-id="${esc(a.id)}" data-nombre="${esc(nombre)}">${esc(nombre)} · ${pct}%</button>`;
    }).join('')}</div>`;
  }

  function cablearAlternativas(cont) {
    cont.querySelectorAll('.ia-alt').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.tipo === 'cliente') {
        if (iaComboCliente) iaComboCliente.seleccionar({ id: Number(b.dataset.id), nombre: b.dataset.nombre });
        return;
      }
      const picker = (iaLineas[Number(b.dataset.idx)] || {}).picker;
      if (picker) picker.seleccionar({ sku_id: Number(b.dataset.id), etiqueta: b.dataset.nombre });
    }));
  }

  const iaNuevaLinea = () => ({ picker: null, sku_id: null, sku_etiqueta: '', sku_vinculado: false, autoMatchIntentado: false, sugerencia: null, alternativas: [], texto: '', marca: '', marca_privada: '', cantidad: '', uom: 'CAJA', precio_unitario: '' });

  const optsMarcaIA = l => '<option value="">— marca —</option>' +
    iaMarcasCat.map(m => `<option value="${esc(m)}"${l.marca === m ? ' selected' : ''}>${esc(m)}</option>`).join('');

  // Auto-match por SKU (D-1xx): la línea llega de la IA solo con el texto leído (nivel línea,
  // no siempre con sku_id). Busca ese texto acotado al cliente ya elegido; si hay una mejor
  // coincidencia con score alto, la preselecciona — el usuario solo confirma o la cambia.
  // Nunca inventa un SKU: si no hay sugerencia fuerte, la línea queda para elegir a mano.
  async function autoMatchLinea(l) {
    const clienteId = iaComboCliente ? iaComboCliente.valorId() : null;
    try {
      const sugs = await rpc('fn_cat_sugerir_sku', {
        p_texto: l.texto, p_producto_id: null, p_umbral: 0.3, p_contraparte_id: clienteId, p_solo_vinculados: false
      });
      const mejor = (sugs || []).find(s => s.es_sugerencia);
      if (mejor && Number(mejor.score || 0) >= 0.7 && l.picker && !l.picker.valorId()) {
        l.picker.seleccionar({ sku_id: mejor.sku_id, etiqueta: mejor.etiqueta, producto_id: mejor.producto_id, es_vinculado: mejor.es_vinculado });
      }
    } catch (_) { /* silencioso — el usuario siempre puede buscar a mano */ }
  }

  function montarLineasIA() {
    const body = document.getElementById('iaLineasBody');
    if (!body) return;
    const clienteId = iaComboCliente ? iaComboCliente.valorId() : null;
    body.innerHTML = iaLineas.map((l, i) => `<div class="so-linea-card" data-i="${i}">
      <div class="ia-leido">Texto leído: ${esc(l.texto || '—')}</div>
      <div id="iaLiCombo${i}"></div>
      <div class="ia-combo-meta">${scoreBadge(l.sugerencia)}${chipsAlternativas(l.alternativas, 'linea', i)}</div>
      <div class="so-linea-fila">
        <div class="so-linea-campo"><label>Marca</label><select class="ia-li" data-i="${i}" data-k="marca">${optsMarcaIA(l)}</select></div>
        ${l.marca === 'Private Label' ? `<div class="so-linea-campo"><label>Marca del cliente</label><input class="ia-li" data-i="${i}" data-k="marca_privada" placeholder="Marca del cliente" value="${esc(l.marca_privada)}"></div>` : ''}
        <div class="so-linea-campo num"><label>Cantidad</label><input class="ia-li num" data-i="${i}" data-k="cantidad" type="number" step="0.01" min="0" value="${esc(l.cantidad)}" placeholder="0"></div>
        <div class="so-linea-campo num"><label>UOM</label><input class="ia-li" data-i="${i}" data-k="uom" type="text" value="${esc(l.uom)}"></div>
        <div class="so-linea-campo num"><label>Precio unit.</label><input class="ia-li num" data-i="${i}" data-k="precio_unitario" type="number" step="0.01" min="0" value="${esc(l.precio_unitario)}" placeholder="opcional"></div>
        <button type="button" class="so-linea-quitar" data-del="${i}" title="Quitar línea">✕</button>
      </div>
    </div>`).join('');

    iaLineas.forEach((l, i) => {
      l.picker = ERP.crearPickerSku({
        contenedor: document.getElementById(`iaLiCombo${i}`),
        placeholder: 'Busca SKU…',
        contraparteId: clienteId,
        valorInicial: l.sku_id ? { sku_id: l.sku_id, etiqueta: l.sku_etiqueta, es_vinculado: l.sku_vinculado } : null
      });
      // La IA sugiere a nivel SKU si el mapeo ya trae sku_id; si no, se intenta el auto-match
      // por texto (una sola vez por línea — autoMatchIntentado evita repetirlo en cada re-render).
      if (l.sugerencia && l.sugerencia.sku_id) l.picker.seleccionar({ sku_id: l.sugerencia.sku_id, etiqueta: l.sugerencia.etiqueta || l.sugerencia.nombre });
      else if (!l.sku_id && !l.autoMatchIntentado && l.texto && l.texto.trim()) {
        l.autoMatchIntentado = true;
        autoMatchLinea(l);
      }
    });

    body.querySelectorAll('.ia-li').forEach(inp => {
      inp.addEventListener('input', e => { iaLineas[Number(e.target.dataset.i)][e.target.dataset.k] = e.target.value; });
      inp.addEventListener('change', e => {
        iaLineas[Number(e.target.dataset.i)][e.target.dataset.k] = e.target.value;
        if (e.target.dataset.k === 'marca') { recogerLineasIA(); montarLineasIA(); cablearAlternativas(document.getElementById('panelBody')); }
      });
    });
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      recogerLineasIA();
      iaLineas.splice(Number(b.dataset.del), 1);
      if (!iaLineas.length) iaLineas.push(iaNuevaLinea());
      montarLineasIA();
      cablearAlternativas(document.getElementById('panelBody'));
    }));
    cablearAlternativas(document.getElementById('panelBody'));
  }

  function recogerLineasIA() {
    document.querySelectorAll('#iaLineasBody .ia-li').forEach(inp => {
      const i = Number(inp.dataset.i), k = inp.dataset.k;
      if (iaLineas[i]) iaLineas[i][k] = inp.value;
    });
    iaLineas.forEach(l => {
      if (l.picker) { l.sku_id = l.picker.valorId(); l.sku_etiqueta = l.picker.valorEtiqueta(); l.sku_vinculado = l.picker.valorEsVinculado(); }
    });
  }

  // Mismo shape EXACTO que lineasPayload() de modulo-o1-so.js (fn_op_so_crear_desde_cpo → p_lineas).
  function lineasPayloadIA() {
    recogerLineasIA();
    const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
    const filasConDatos = iaLineas.filter(l => l.sku_id || String(l.cantidad).trim() || String(l.texto || '').trim());
    const sinSku = filasConDatos.filter(l => !l.sku_id);
    if (sinSku.length) return { error: `${sinSku.length} línea(s) sin SKU elegido del catálogo — complétalas o quítalas.` };
    return {
      payload: filasConDatos.map(l => ({
        sku_id: Number(l.sku_id),
        cantidad: numOrNull(l.cantidad),
        uom: String(l.uom || '').trim() || 'CAJA',
        precio_unitario: numOrNull(l.precio_unitario),
        marca: (l.marca || '').trim() || null,
        marca_privada: l.marca === 'Private Label' ? ((l.marca_privada || '').trim() || null) : null
      }))
    };
  }

  function avisoIA(tipo, html) {
    const el = document.getElementById('iaAviso');
    if (el) { el.className = 'aviso' + (tipo ? ' visible ' + tipo : ''); el.innerHTML = html || ''; }
  }

  async function abrirRevisionIA(data) {
    // Reemplaza el panel "Nuevo Customer PO" (todavía abierto) por el de revisión — mismo fix
    // que crearSODesde(): sin esto el drawer no re-dispara su animación de entrada.
    ERP.cerrarPanel();
    iaExtraccion = data.extraccion || {};
    iaAdjuntoRef = adjuntoSubido;
    iaCpoCreado = null;
    const mapeo = data.mapeo || {};
    const cliente = mapeo.cliente || {};
    // D-167: solo se ofrece como sugerencia/alternativa una contraparte marcada es_cliente=true
    // (el catálogo que la IA barre puede incluir proveedores también; aquí solo aplica cliente).
    const sugCliente = (cliente.sugerencia && cliente.sugerencia.es_cliente) ? cliente.sugerencia : null;
    const altsCliente = (cliente.alternativas || []).filter(a => a.es_cliente);
    iaClienteSugerencia = sugCliente;

    try {
      [iaRevenueModels, iaMarcasCat] = await Promise.all([
        q('v_revenue_models', '&order=orden.asc').then(r => (r || []).filter(x => x.activo !== false)),
        q('v_catc_listas_valores', '&tipo=eq.marca&order=orden.asc,valor.asc').then(r => (r || []).filter(v => v.activo !== false).map(v => v.valor))
      ]);
    } catch (e) {
      ERP.abrirPanel('Revisar PO leído por IA', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    iaLineas = (mapeo.lineas && mapeo.lineas.length ? mapeo.lineas : [{}]).map(l => ({
      picker: null, sku_id: null, sku_etiqueta: '',
      sugerencia: l.sugerencia || null,
      alternativas: l.alternativas || [],
      texto: l.producto_texto || '',
      marca: '', marca_privada: '',
      cantidad: l.cantidad ?? '',
      uom: l.uom || 'CAJA',
      precio_unitario: l.precio ?? ''
    }));

    ERP.abrirPanel('Revisar PO leído por IA', `Modelo: ${esc(data.modelo_usado || '—')}`, `
      <div class="form-erp ia-revision">
        <div class="ia-aviso-ia"><i class="ti ti-info-circle"></i> La IA sugiere. Revisa antes de guardar. <b>Nada se guarda hasta que confirmes.</b></div>
        <div class="campos">
          <div class="campo"><label>N° de PO del cliente</label>
            <input id="iaNumeroPO" type="text" maxlength="60" value="${esc(iaExtraccion.numero_po || '')}"></div>
          <div class="campo"><label>Fecha del PO</label>
            <input id="iaFecha" type="date" value="${esc(iaExtraccion.fecha || hoyISO())}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="iaMoneda">${ERP.MONEDAS.map(m => `<option value="${m}"${(iaExtraccion.moneda || 'USD') === m ? ' selected' : ''}>${m}</option>`).join('')}</select></div>
          <div class="campo ancho">
            <label>Cliente <span class="req">*</span></label>
            ${cliente.texto ? `<div class="ia-leido">Texto leído: “${esc(cliente.texto)}”</div>` : ''}
            <div class="ia-combo-cell">
              <div id="iaCliente"></div>
              <div class="ia-combo-meta">${scoreBadge(sugCliente)}${chipsAlternativas(altsCliente, 'cliente')}</div>
            </div>
            <div class="alias-ayuda">${sugCliente ? 'Sugerido por la IA — revísalo o busca otro cliente del Directorio.' : 'La IA no encontró una sugerencia segura: elige el cliente del Directorio.'}</div>
          </div>
          <div class="campo ancho"><label>Sales Type <span class="req">*</span></label>
            <select id="iaSalesType"><option value="">— Elige el modelo de venta —</option>${iaRevenueModels.map(r =>
              `<option value="${esc(r.id)}">${esc([r.codigo, r.nombre].filter(Boolean).join(' — '))}</option>`).join('')}</select>
            <div class="alias-ayuda">No lo sugiere la IA — Margen, Consignación o Comisión definen cómo se reconoce el ingreso.</div></div>
        </div>
        <div class="seccion-head"><h4>Líneas</h4><button type="button" class="btn-mini gris" id="iaAddLinea">+ Línea</button></div>
        <div id="iaLineasBody" class="so-lineas-lista ia-lineas-lista"></div>
        <div class="alias-ayuda">El precio unitario es opcional: en comisión pura va vacío (costo 0 / margen 100% es correcto).</div>
        <div class="acciones">
          <button type="button" class="btn-mini" id="iaConfirmar">Confirmar y guardar</button>
          <button type="button" class="btn-mini gris" id="iaCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="iaAviso"></div>
      </div>`);

    iaComboCliente = ERP.crearCombo({
      contenedor: document.getElementById('iaCliente'),
      items: clientesCat.map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] })),
      placeholder: 'Busca cliente por nombre o alias…', permitirNuevo: false
    });
    if (sugCliente) iaComboCliente.seleccionar({ id: sugCliente.id, nombre: sugCliente.etiqueta });

    montarLineasIA();
    cablearAlternativas(document.getElementById('panelBody'));

    document.getElementById('iaAddLinea').addEventListener('click', () => {
      recogerLineasIA();
      iaLineas.push(iaNuevaLinea());
      montarLineasIA();
      cablearAlternativas(document.getElementById('panelBody'));
    });
    document.getElementById('iaCancelar').addEventListener('click', () => { iaCpoCreado = null; ERP.cerrarPanel(); });
    document.getElementById('iaConfirmar').addEventListener('click', confirmarIA);
  }

  async function confirmarIA() {
    const cliente_id = iaComboCliente && iaComboCliente.valorId();
    if (!cliente_id) { avisoIA('err', 'Elige un cliente del Directorio.'); return; }
    const rmId = (document.getElementById('iaSalesType') || {}).value;
    if (!rmId) { avisoIA('err', 'Elige el Sales Type.'); return; }
    const { payload, error: errLineas } = lineasPayloadIA();
    if (errLineas) { avisoIA('err', errLineas); return; }
    if (!payload.length) { avisoIA('err', 'Agrega al menos una línea con producto.'); return; }

    const v = id => (document.getElementById(id) || {}).value;
    const p_numero_cliente = (v('iaNumeroPO') || '').trim() || null;
    const p_fecha_po = v('iaFecha') || null;
    const p_moneda = v('iaMoneda') || 'USD';

    const btn = document.getElementById('iaConfirmar');
    btn.disabled = true;

    // Paso A (fn_op_cpo_alta) — se salta si un reintento anterior ya lo creó (nunca duplica el CPO).
    if (!iaCpoCreado) {
      avisoIA('warn', 'Creando Customer PO…');
      try {
        const r = uno(await rpc('fn_op_cpo_alta', {
          p_cliente_id: Number(cliente_id), p_numero_cliente, p_fecha_po, p_moneda,
          p_adjunto_ref: iaAdjuntoRef, p_nota: null, p_actor: actor()
        }));
        if (!r.customer_po_id) throw new Error('El ERP no devolvió el customer PO.');
        iaCpoCreado = { customer_po_id: r.customer_po_id, folio: r.folio };
      } catch (e) {
        if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
        avisoIA('err', `El ERP rechazó el customer PO: ${esc(e.message)}`);
        btn.disabled = false;
        return;
      }
    }

    // Paso B (fn_op_so_crear_desde_cpo) — mismo p_lineas shape que el flujo manual.
    avisoIA('warn', `Customer PO <b>${esc(iaCpoCreado.folio || '')}</b> listo. Creando Sales Order…`);
    try {
      const r2 = uno(await rpc('fn_op_so_crear_desde_cpo', {
        p_customer_po_id: iaCpoCreado.customer_po_id, p_revenue_model_id: Number(rmId),
        p_lineas: payload, p_fecha: p_fecha_po, p_moneda, p_nota: null, p_actor: actor()
      }));
      if (!r2.sales_order_id) throw new Error('El ERP no devolvió la sales order.');
      ERP.toast('ok', `Leído con IA: Customer PO <b>${esc(iaCpoCreado.folio)}</b> + Sales Order <b>${esc(r2.so_folio)}</b> creados (OP <b>${esc(r2.op_folio)}</b>).`);
      ERP.marcarDatosSucios();
      iaCpoCreado = null;
      await recargar();
      // Cierra el panel de "Revisar PO leído por IA" antes de abrir el siguiente (ficha del SO o
      // del CPO) — mismo fix que crearSODesde(): sin esto el drawer no re-dispara su animación de
      // entrada y el contenido nuevo se ve montado sobre el anterior.
      ERP.cerrarPanel();
      if (ERP.o1VerSO) ERP.o1VerSO(Number(r2.sales_order_id));
      else verCPO(r2.customer_po_id || cliente_id);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      // El CPO YA se creó (paso A) — nunca lo dejamos huérfano en silencio: se avisa explícito y
      // un reintento del mismo botón NO vuelve a crear el CPO (ver guardia de iaCpoCreado arriba).
      avisoIA('err', `El Customer PO <b>${esc(iaCpoCreado.folio)}</b> SÍ se creó, pero la Sales Order falló: ${esc(e.message)}. ` +
        `Pulsa "Confirmar y guardar" de nuevo para reintentar solo la Sales Order, o ábrelo desde la lista de Customer PO y genera la Sales Order manualmente.`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha ================= */

  async function recargar() {
    ERP.limpiarCache();
    try { cpos = (await q('v_op_customer_po', '&order=created_at.desc')) || []; } catch (_) { /* la ficha muestra su propio error */ }
  }

  async function verCPO(id) {
    ERP.cerrarPanel();
    ERP.abrirPanel('Customer PO', 'Cargando…', '<div class="skel">Cargando customer PO…</div>');
    let c;
    try {
      const r = await q('v_op_customer_po', `&id=eq.${Number(id)}`);
      c = r && r[0];
    } catch (e) {
      ERP.abrirPanel('Customer PO', '', `<div class="errbox">No se pudo cargar el customer PO: ${esc(e.message)}</div>`);
      return;
    }
    if (!c) { ERP.abrirPanel('Customer PO', '', '<div class="errbox">No se encontró el customer PO.</div>'); return; }

    const abierto = String(c.estado || '').toLowerCase() === 'abierto';
    const puedeCap = ERP.puede('capturar');

    ERP.abrirPanel(`Customer PO <span class="mono">${esc(c.folio || '')}</span>`, esc(c.cliente || ''), `
      <div class="cpo-ficha">
        <div class="det-grid">
          <div class="det"><span class="l">Cliente</span><span class="v">${esc(c.cliente || '—')}</span></div>
          <div class="det"><span class="l">N° cliente</span><span class="v mono">${esc(c.numero_cliente || '—')}</span></div>
          <div class="det"><span class="l">Fecha PO</span><span class="v">${esc(fecha(c.fecha_po))}</span></div>
          <div class="det"><span class="l">Moneda</span><span class="v mono">${esc(c.moneda || '—')}</span></div>
          <div class="det"><span class="l">Estado</span><span class="v">${chipEstado(c.estado)}</span></div>
          <div class="det"><span class="l">Adjunto</span><span class="v">${adjuntoHTML(c.adjunto_ref)}</span></div>
        </div>
        ${c.nota ? `<div class="cpo-nota"><span class="l">Nota</span> ${esc(c.nota)}</div>` : ''}
        <div class="acciones">
          ${abierto && puedeCap
            ? '<button class="btn-mini" id="cpoGenSO">Generar Sales Order</button>'
            : ''}
          ${puedeCap ? '<button class="btn-mini gris" id="cpoEditar">Editar</button>' : ''}
          ${abierto && puedeCap ? '<button class="btn-mini gris" id="cpoEliminar">Eliminar</button>' : ''}
          <button class="btn-mini gris" id="cpoCerrar">Cerrar</button>
        </div>
      </div>`);

    cablearVerAdjunto(document.getElementById('panelBody'), false);
    document.getElementById('cpoCerrar').addEventListener('click', ERP.cerrarPanel);
    const bGen = document.getElementById('cpoGenSO');
    if (bGen) bGen.addEventListener('click', () => {
      if (ERP.o1CrearSODesde) ERP.o1CrearSODesde(Number(c.id), c.folio, c.cliente_id != null ? Number(c.cliente_id) : null);
      else ERP.toast('err', 'El módulo de Sales Orders no está cargado.');
    });
    const bEd = document.getElementById('cpoEditar');
    if (bEd) bEd.addEventListener('click', () => editarCPO(c));
    const bDel = document.getElementById('cpoEliminar');
    if (bDel) bDel.addEventListener('click', () => eliminarCPO(c));
  }

  /* ================= Editar / eliminar ================= */

  async function editarCPO(c) {
    ERP.cerrarPanel();
    // cliente_id solo es editable si el CPO todavía NO generó su Sales Order (fn_op_cpo_editar
    // lo rechaza si ya tiene una — aquí solo evitamos mostrar un campo que el backend va a tronar).
    const puedeCambiarCliente = String(c.estado || '').toLowerCase() === 'abierto';
    ERP.abrirPanel(`Editar Customer PO <span class="mono">${esc(c.folio || '')}</span>`, esc(c.cliente || ''), '<div class="skel">Cargando…</div>');

    let clientesEd = [];
    if (puedeCambiarCliente) {
      try {
        clientesEd = await q('v_catc_contrapartes', '&es_cliente=eq.true&order=nombre.asc');
      } catch (e) {
        ERP.abrirPanel(`Editar Customer PO <span class="mono">${esc(c.folio || '')}</span>`, '', `<div class="errbox">No se pudieron leer los clientes: ${esc(e.message)}</div>`);
        return;
      }
    }

    ERP.abrirPanel(`Editar Customer PO <span class="mono">${esc(c.folio || '')}</span>`, esc(c.cliente || ''), `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Cliente</label>
            ${puedeCambiarCliente ? '<div id="cpoEdCliente"></div>' : `<input type="text" value="${esc(c.cliente || '')}" disabled>`}
            <div class="alias-ayuda">${puedeCambiarCliente
              ? 'Se puede cambiar porque este Customer PO todavía no tiene Sales Order.'
              : 'Ya no se puede cambiar: este Customer PO ya generó su Sales Order.'}</div></div>
          <div class="campo"><label>N° de PO del cliente</label>
            <input id="cpoEdNumCliente" type="text" maxlength="60" value="${esc(c.numero_cliente || '')}"></div>
          <div class="campo"><label>Fecha del PO</label>
            <input id="cpoEdFecha" type="date" value="${esc(String(c.fecha_po || '').slice(0, 10))}"></div>
          <div class="campo"><label>Moneda</label>
            <select id="cpoEdMoneda">${ERP.MONEDAS.map(m => `<option value="${m}" ${m === c.moneda ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
          <div class="campo ancho"><label>Adjunto del PO</label>
            <input id="cpoEdAdjunto" class="mono" type="text" placeholder="URL/ruta del PDF…" value="${esc(c.adjunto_ref || '')}"></div>
          <div class="campo ancho"><label>Nota</label><textarea id="cpoEdNota" rows="2">${esc(c.nota || '')}</textarea></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="cpoEdGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="cpoEdCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="cpoEdAviso"></div>
      </div>`);

    let comboClienteEd = null;
    if (puedeCambiarCliente) {
      comboClienteEd = ERP.crearCombo({
        contenedor: document.getElementById('cpoEdCliente'),
        items: clientesEd.map(x => ({ id: x.id, nombre: x.nombre, alias: x.alias || [] })),
        placeholder: 'Busca cliente por nombre o alias…', permitirNuevo: false,
        valorInicial: c.cliente || null
      });
    }
    document.getElementById('cpoEdCancelar').addEventListener('click', () => verCPO(c.id));
    document.getElementById('cpoEdGuardar').addEventListener('click', () => guardarEdicionCPO(c, comboClienteEd, puedeCambiarCliente));
  }

  async function guardarEdicionCPO(c, comboClienteEd, puedeCambiarCliente) {
    const v = id => (document.getElementById(id) || {}).value;
    const btn = document.getElementById('cpoEdGuardar');
    const aviso = document.getElementById('cpoEdAviso');
    if (puedeCambiarCliente && !comboClienteEd.valorId()) { aviso.className = 'aviso visible err'; aviso.innerHTML = 'Elige el cliente.'; return; }
    btn.disabled = true;
    if (aviso) { aviso.className = 'aviso visible warn'; aviso.innerHTML = 'Guardando…'; }
    try {
      await rpc('fn_op_cpo_editar', {
        p_id: Number(c.id),
        p_numero_cliente: (v('cpoEdNumCliente') || '').trim() || null,
        p_fecha_po: v('cpoEdFecha') || null,
        p_moneda: v('cpoEdMoneda') || 'USD',
        p_adjunto_ref: (v('cpoEdAdjunto') || '').trim() || null,
        p_nota: (v('cpoEdNota') || '').trim() || null,
        p_cliente_id: puedeCambiarCliente ? Number(comboClienteEd.valorId()) : Number(c.cliente_id),
        p_actor: actor()
      });
      ERP.toast('ok', `Customer PO <b>${esc(c.folio || '')}</b> actualizado.`);
      ERP.marcarDatosSucios();
      await recargar();
      verCPO(c.id);
    } catch (e) {
      if (ERP.avisarSiPermiso && ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      if (aviso) { aviso.className = 'aviso visible err'; aviso.innerHTML = `El ERP rechazó el cambio: ${esc(e.message)}`; }
      btn.disabled = false;
    }
  }

  async function eliminarCPO(c) {
    if (!confirm(`¿Eliminar el Customer PO ${c.folio}? Se borra junto con su Sales Order (si ya tiene una), sus líneas y su OP. Esta acción no se puede deshacer.`)) return;
    try {
      await rpc('fn_op_cpo_eliminar', { p_id: Number(c.id), p_actor: actor() });
      ERP.toast('ok', `Customer PO <b>${esc(c.folio || '')}</b> eliminado.`);
      ERP.marcarDatosSucios();
      await recargar();
      ERP.cerrarPanel();
    } catch (e) {
      if (!(ERP.avisarSiPermiso && ERP.avisarSiPermiso(e))) ERP.toast('err', `No se pudo eliminar: ${esc(e.message)}`);
    }
  }

  ERP.registrar('o1-cpo', {
    titulo: 'Customer PO',
    descripcion: 'Camino C · O1 — captura el PO del cliente y genera su orden de venta',
    render
  });

  ERP.o1AbrirCPO = verCPO;
})();
