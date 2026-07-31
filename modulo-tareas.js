/* Módulo Tareas (ruta 'tareas') — reemplazo de ClickUp. Backend E35, no se toca.
   Patrón de modulo-facturas.js / modulo-ordenes.js: lista + filtros + ficha + gating + export.
   Vistas: v_tareas · v_tareas_resumen (chips) · v_tarea_comentarios
   RPCs (capacidad 'capturar'): fn_crear_tarea, fn_editar_tarea, fn_cambiar_estado_tarea,
     fn_asignar_tarea, fn_comentar_tarea, fn_cancelar_tarea
   Valores literales (CHECK en tabla; NO traducir al mandarlos):
     estado: pendiente|en_proceso|hecha|cancelada · prioridad: baja|media|alta|urgente
     area: cargas|comercial|sourcing|admin
   Expone: ERP.verTarea, ERP.nuevaTarea, ERP.montarTareasCarga */

(function () {
  'use strict';
  const { q, rpc, esc, num } = ERP;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha4(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return `${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}-${d.getFullYear()}`;
  }
  function fechaHora(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d)) return String(ts);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${MESES[d.getMonth()]}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  const ESTADOS = ['pendiente', 'en_proceso', 'hecha', 'cancelada'];
  const ESTADO_ACTIVOS = ['pendiente', 'en_proceso', 'hecha'];
  const ESTADO_LABEL = { pendiente: 'Pendiente', en_proceso: 'En proceso', hecha: 'Hecha', cancelada: 'Cancelada' };
  const ESTADO_PILL = { pendiente: 'gris', en_proceso: 'azul', hecha: 'verde', cancelada: 'rojo' };
  const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'];
  const PRIORIDAD_LABEL = { baja: 'Baja', media: 'Media', alta: 'Alta', urgente: 'Urgente' };
  const PRIORIDAD_PILL = { baja: 'gris', media: 'ambar', alta: 'ambar', urgente: 'rojo' };
  const AREAS = ['cargas', 'comercial', 'sourcing', 'admin'];
  const AREA_LABEL = { cargas: 'Cargas', comercial: 'Comercial', sourcing: 'Sourcing', admin: 'Admin' };

  const pillEstado = e => `<span class="pill ${ESTADO_PILL[e] || 'gris'}">${esc(ESTADO_LABEL[e] || e || '')}</span>`;
  const pillPrioridad = p => `<span class="pill ${PRIORIDAD_PILL[p] || 'gris'}">${esc(PRIORIDAD_LABEL[p] || p || '')}</span>`;

  /* Opciones de <select> con el valor real seleccionado (evita el bug del select deshabilitado
     que mostraba la opción vacía en vez del valor guardado). */
  function opciones(valores, labelDe, actual) {
    return valores.map(v => `<option value="${esc(v)}"${String(v) === String(actual) ? ' selected' : ''}>${esc(labelDe(v))}</option>`).join('');
  }

  /* ================= Estado del módulo ================= */

  let tareas = [], resumen = [], socios = [];
  let fArea = '', fAsignado = '', fPrioridad = '', fTexto = '', vista = 'kanban';

  async function cargarSocios() {
    // Socios asignables (E35): id = socio_codigo (== v_tareas.asignado_a y p_asignado_a; NO usar email/id),
    // nombre y rol. usuarios_erp NO es legible por authenticated; por eso se usa v_socios_asignables.
    try {
      const s = await q('v_socios_asignables', '&order=socio_codigo.asc');
      if (s.length) return s.map(x => ({ id: x.socio_codigo, nombre: x.nombre || x.socio_codigo, rol: x.rol }));
    } catch (_) { /* si la vista fallara, caemos al fallback de abajo */ }
    // Fallback: asignados ya presentes en las tareas + el usuario actual.
    const m = new Map();
    tareas.forEach(t => { if (t.asignado_a && !m.has(String(t.asignado_a))) m.set(String(t.asignado_a), { nombre: t.asignado_a, rol: null }); });
    const yo = ERP.perfil;
    if (yo && yo.socio_codigo && !m.has(String(yo.socio_codigo))) m.set(String(yo.socio_codigo), { nombre: yo.nombre || yo.socio_codigo, rol: yo.rol });
    return [...m].map(([id, v]) => ({ id, nombre: v.nombre, rol: v.rol }));
  }
  const nombreSocio = id => { const s = socios.find(x => String(x.id) === String(id)); return s ? s.nombre : (id || '—'); };
  // Etiqueta para los desplegables de asignación: muestra el rol para que quien asigna vea que un rol
  // 'vista' recibe la tarea pero no puede cambiarle el estado ni comentar (requieren 'capturar').
  const ROL_ETIQUETA = { vista: 'solo lectura', captura: 'captura', admin: 'admin', administrador: 'admin' };
  const etiquetaSocio = s => `${s.nombre}${s.rol ? ` (${ROL_ETIQUETA[s.rol] || s.rol})` : ''}`;

  /* ================= Filtros ================= */

  const nArea = a => resumen.filter(r => r.area === a).reduce((s, r) => s + num(r.n), 0);
  const nTotal = () => resumen.reduce((s, r) => s + num(r.n), 0);

  function filtradas() {
    const t = ERP.norm(fTexto);
    return tareas.filter(k => {
      if (fArea && k.area !== fArea) return false;
      if (fAsignado && String(k.asignado_a) !== String(fAsignado)) return false;
      if (fPrioridad && k.prioridad !== fPrioridad) return false;
      if (!t) return true;
      return [k.folio, k.titulo, k.contraparte, k.asignado_a, k.carga_folio].some(v => ERP.norm(v).includes(t));
    });
  }

  /* ================= Render ================= */

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    [tareas, resumen] = await Promise.all([
      q('v_tareas', '&order=folio.desc'),
      q('v_tareas_resumen').catch(() => [])
    ]);
    socios = await cargarSocios();
    fArea = ''; fAsignado = ''; fPrioridad = ''; fTexto = '';

    const chipsArea = `<button class="chip ${fArea === '' ? 'activo' : ''}" data-area="">Todas <span class="chip-n">${nTotal()}</span></button>` +
      AREAS.map(a => `<button class="chip ${fArea === a ? 'activo' : ''}" data-area="${a}">${esc(AREA_LABEL[a])} <span class="chip-n">${nArea(a)}</span></button>`).join('');

    cont.innerHTML = `
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="tareaNueva">+ Nueva tarea</button>' : ''}
        <span class="seg" id="tareaVista">
          <button class="chip ${vista === 'kanban' ? 'activo' : ''}" data-vista="kanban">Kanban</button>
          <button class="chip ${vista === 'tabla' ? 'activo' : ''}" data-vista="tabla">Tabla</button>
        </span>
        <select class="busca" id="tareaFAsignado" style="max-width:180px">
          <option value="">Todos los asignados</option>
          ${socios.map(s => `<option value="${esc(s.id)}">${esc(etiquetaSocio(s))}</option>`).join('')}
        </select>
        <select class="busca" id="tareaFPrioridad" style="max-width:150px">
          <option value="">Toda prioridad</option>
          ${PRIORIDADES.map(p => `<option value="${p}">${esc(PRIORIDAD_LABEL[p])}</option>`).join('')}
        </select>
        <input class="busca" id="tareaFTexto" type="text" placeholder="Buscar por folio, título, asignado…">
        <span class="conteo" id="tareaConteo"></span>
      </div>
      <div class="filtros" id="tareaChips">${chipsArea}</div>
      ${ERP.botonesExportar ? ERP.botonesExportar('Tareas', 'Tareas', '#tblTareas') : ''}
      <div id="tareaBody"></div>
      <div class="leyenda">Tareas en rojo = <b>atrasadas</b> (pasó su fecha límite). En Kanban, cada columna es un estado;
        en celular las columnas se apilan. Toca una tarea para abrir su ficha.</div>`;

    const btnN = document.getElementById('tareaNueva');
    if (btnN) btnN.addEventListener('click', () => nuevaTarea());
    document.getElementById('tareaFAsignado').addEventListener('change', e => { fAsignado = e.target.value; pintarVista(); });
    document.getElementById('tareaFPrioridad').addEventListener('change', e => { fPrioridad = e.target.value; pintarVista(); });
    let tempo;
    document.getElementById('tareaFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarVista(); }, 150);
    });
    document.querySelectorAll('#tareaChips .chip').forEach(ch => ch.addEventListener('click', () => {
      fArea = ch.dataset.area;
      document.querySelectorAll('#tareaChips .chip').forEach(o => o.classList.toggle('activo', o.dataset.area === fArea));
      pintarVista();
    }));
    document.querySelectorAll('#tareaVista .chip').forEach(ch => ch.addEventListener('click', () => {
      vista = ch.dataset.vista;
      document.querySelectorAll('#tareaVista .chip').forEach(o => o.classList.toggle('activo', o.dataset.vista === vista));
      pintarVista();
    }));

    pintarVista();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
  }

  function chips(t) {
    const v = [];
    if (t.carga_folio) v.push(`<span class="k-vinc" data-abrir="carga:${esc(t.carga_folio)}">📦 ${esc(t.carga_folio)}</span>`);
    if (t.cotizacion_folio) v.push(`<span class="k-vinc" data-abrir="cotizacion:${esc(t.cotizacion_folio)}">📄 ${esc(t.cotizacion_folio)}</span>`);
    if (t.orden_folio) v.push(`<span class="k-vinc" data-abrir="orden:${esc(t.orden_folio)}">🧾 ${esc(t.orden_folio)}</span>`);
    return v.join(' ');
  }

  function cardHtml(t) {
    return `<div class="tarea-card ${t.atrasada ? 'atrasada' : ''}" data-folio="${esc(t.folio)}">
      <div class="tc-top"><span class="mono tc-folio">${esc(t.folio)}</span>${pillPrioridad(t.prioridad)}</div>
      <div class="tc-titulo">${esc(t.titulo || '(sin título)')}</div>
      <div class="tc-meta">
        <span class="pill gris">${esc(AREA_LABEL[t.area] || t.area || '—')}</span>
        <span class="tc-asig">${esc(nombreSocio(t.asignado_a))}</span>
      </div>
      <div class="tc-pie">
        <span class="${t.atrasada ? 'neg' : 'tc-lim'}">${t.fecha_limite ? (t.atrasada ? '⚠ ' : '') + esc(fecha4(t.fecha_limite)) : 'sin fecha'}</span>
        ${num(t.n_comentarios) > 0 ? `<span class="tc-com">💬 ${esc(t.n_comentarios)}</span>` : ''}
      </div>
      ${chips(t) ? `<div class="tc-vinc">${chips(t)}</div>` : ''}
    </div>`;
  }

  function kanbanHtml(filas) {
    return `<div class="kanban">${ESTADOS.map(est => {
      const col = filas.filter(t => t.estado === est);
      return `<div class="kanban-col">
        <div class="kanban-h estado-${est}">${esc(ESTADO_LABEL[est])} <span class="chip-n">${col.length}</span></div>
        <div class="kanban-body">${col.length ? col.map(cardHtml).join('') : '<div class="kanban-vacio">—</div>'}</div>
      </div>`;
    }).join('')}</div>`;
  }

  function tablaHtml(filas) {
    if (!filas.length) return '<div class="vacio">Ninguna tarea coincide con el filtro.</div>';
    return `<div class="tabla-wrap"><table id="tblTareas">
      <thead><tr><th>Folio</th><th>Título</th><th>Área</th><th>Prioridad</th><th>Asignado</th>
        <th>Límite</th><th>Estado</th><th class="num">Coment.</th></tr></thead>
      <tbody>${filas.map(t => `<tr class="clic ${t.atrasada ? 'vencido-alto' : ''}" data-folio="${esc(t.folio)}">
        <td class="mono"><span class="enlace">${esc(t.folio)}</span></td>
        <td>${esc(t.titulo || '—')}</td>
        <td>${esc(AREA_LABEL[t.area] || t.area || '—')}</td>
        <td>${pillPrioridad(t.prioridad)}</td>
        <td>${esc(nombreSocio(t.asignado_a))}</td>
        <td class="${t.atrasada ? 'neg' : ''}">${t.fecha_limite ? (t.atrasada ? '⚠ ' : '') + esc(fecha4(t.fecha_limite)) : '—'}</td>
        <td>${pillEstado(t.estado)}</td>
        <td class="num">${esc(t.n_comentarios ?? 0)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function pintarVista() {
    const body = document.getElementById('tareaBody');
    const filas = filtradas();
    const conteo = document.getElementById('tareaConteo');
    if (conteo) conteo.textContent = `${filas.length} de ${tareas.length} tareas`;
    // Se renderizan ambas vistas; una se oculta. Así el export (#tblTareas) funciona en cualquier vista.
    body.innerHTML =
      `<div class="${vista === 'kanban' ? '' : 'oculto'}">${kanbanHtml(filas)}</div>` +
      `<div class="${vista === 'tabla' ? '' : 'oculto'}">${tablaHtml(filas)}</div>`;

    body.querySelectorAll('[data-folio]').forEach(el => el.addEventListener('click', e => {
      if (e.target.closest('.k-vinc')) return;   // los vínculos se manejan aparte
      verTarea(el.dataset.folio);
    }));
    body.querySelectorAll('.k-vinc[data-abrir]').forEach(v => v.addEventListener('click', e => {
      e.stopPropagation(); abrirVinculo(v.dataset.abrir);
    }));
  }

  function abrirVinculo(spec) {
    const i = String(spec).indexOf(':');
    const tipo = spec.slice(0, i), folio = spec.slice(i + 1);
    if (tipo === 'carga' && ERP.verCarga) ERP.verCarga(folio);
    else if (tipo === 'cotizacion' && ERP.verComercial) ERP.verComercial('cotizacion', folio);
    else if (tipo === 'orden' && ERP.verOrden) ERP.verOrden(folio);
  }

  /* ================= Nueva tarea ================= */

  let comboCargaNueva = null;

  async function nuevaTarea(prefillCarga) {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Nueva tarea', 'Captura una tarea y asígnala', '<div class="skel">Cargando…</div>');
    let cargas = [];
    try { cargas = await q('v_carga_detalle').catch(() => []); } catch (_) { cargas = []; }
    const vivas = cargas.filter(c => !c.anulado);

    ERP.abrirPanel('Nueva tarea', 'Captura una tarea y asígnala', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Título <span class="req">*</span></label>
            <input id="tTitulo" type="text" maxlength="160" placeholder="¿Qué hay que hacer?"></div>
          <div class="campo"><label>Área <span class="req">*</span></label>
            <select id="tArea">${opciones(AREAS, a => AREA_LABEL[a], 'cargas')}</select></div>
          <div class="campo"><label>Prioridad</label>
            <select id="tPrioridad">${opciones(PRIORIDADES, p => PRIORIDAD_LABEL[p], 'media')}</select></div>
          <div class="campo"><label>Asignado a</label>
            <select id="tAsignado"><option value="">— sin asignar —</option>${socios.map(s => `<option value="${esc(s.id)}">${esc(etiquetaSocio(s))}</option>`).join('')}</select></div>
          <div class="campo"><label>Fecha límite</label>
            <input id="tFecha" type="date"></div>
          <div class="campo ancho"><label>Embarque ligado (opcional)</label><div id="tCarga"></div></div>
          <div class="campo ancho"><label>Descripción</label>
            <textarea id="tDesc" rows="3"></textarea></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="tCrear">Crear tarea</button>
          <button class="btn-mini gris" id="tCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="tNvAviso"></div>
      </div>`);

    comboCargaNueva = ERP.crearCombo({
      contenedor: document.getElementById('tCarga'),
      items: vivas.map(c => ({ id: c.folio, nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.cliente ? ' · ' + c.cliente : ''}`, alias: [c.po, c.cliente, c.folio].filter(Boolean) })),
      placeholder: 'Folio, PO o cliente… (opcional)', permitirNuevo: false,
      valorInicial: prefillCarga || null
    });
    if (prefillCarga) { const inp = document.querySelector('#tCarga .combo-input'); if (inp) inp.value = prefillCarga; }

    document.getElementById('tCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('tCrear').addEventListener('click', crearTarea);
    document.getElementById('tTitulo').focus();
  }

  function avisoNv(tipo, html) { const el = document.getElementById('tNvAviso'); if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; } }

  async function crearTarea() {
    const v = id => (document.getElementById(id) || {}).value;
    const titulo = (v('tTitulo') || '').trim();
    if (!titulo) { avisoNv('err', 'El título es obligatorio.'); return; }
    const args = {
      p_titulo: titulo,
      p_area: v('tArea') || 'cargas',
      p_descripcion: (v('tDesc') || '').trim() || null,
      p_prioridad: v('tPrioridad') || 'media',
      p_asignado_a: v('tAsignado') || null,
      p_fecha_limite: v('tFecha') || null,
      p_carga_folio: (comboCargaNueva && comboCargaNueva.valorId()) || null,
      p_cotizacion_folio: null, p_orden_folio: null, p_contraparte_id: null
    };
    const btn = document.getElementById('tCrear');
    btn.disabled = true; avisoNv('warn', 'Creando tarea…');
    try {
      const data = await rpc('fn_crear_tarea', args);
      const r = (data && data[0]) || {};
      const folio = r.folio || r.r_folio;
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Tarea <b>${esc(folio || '')}</b> creada.`);
      if (folio) verTarea(folio); else ERP.cerrarPanel();
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó la tarea: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha ================= */

  let tareaActual = null, comentarios = [], comboCargaFicha = null;

  async function verTarea(folio) {
    ERP.abrirPanel('Tarea', 'Cargando…', '<div class="skel">Cargando tarea…</div>');
    let t, coms, cargas = [];
    try {
      [t, coms] = await Promise.all([
        q('v_tareas', `&folio=${ERP.eq(folio)}`).then(r => r && r[0]),
        q('v_tarea_comentarios', `&tarea_folio=${ERP.eq(folio)}&order=creado_en.asc`).catch(() => [])
      ]);
      if (!t) throw new Error('La tarea no existe.');
    } catch (e) {
      ERP.abrirPanel('Tarea', '', `<div class="errbox">No se pudo cargar la tarea: ${esc(e.message)}</div>`);
      return;
    }
    tareaActual = t; comentarios = coms || [];
    const puedeCap = ERP.puede('capturar');
    const editable = puedeCap && t.estado !== 'hecha' && t.estado !== 'cancelada';
    if (editable) { try { cargas = await q('v_carga_detalle').catch(() => []); } catch (_) { cargas = []; } }

    ERP.abrirPanel(`Tarea ${esc(t.folio)}`, `${pillEstado(t.estado)} · ${esc(AREA_LABEL[t.area] || t.area || '')} · ${esc(nombreSocio(t.asignado_a))}`,
      cuerpoFicha(t, editable, puedeCap));

    if (editable) {
      comboCargaFicha = ERP.crearCombo({
        contenedor: document.getElementById('tfCarga'),
        items: cargas.filter(c => !c.anulado).map(c => ({ id: c.folio, nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.cliente ? ' · ' + c.cliente : ''}`, alias: [c.po, c.cliente, c.folio].filter(Boolean) })),
        placeholder: 'Folio, PO o cliente… (opcional)', permitirNuevo: false
      });
      if (t.carga_folio) { const inp = document.querySelector('#tfCarga .combo-input'); if (inp) inp.value = t.carga_folio; }
      document.getElementById('tfGuardar').addEventListener('click', guardar);
    }
    document.querySelectorAll('#tfEstados [data-estado]').forEach(b => b.addEventListener('click', () => cambiarEstado(b.dataset.estado)));
    const bCancel = document.getElementById('tfCancelar'); if (bCancel) bCancel.addEventListener('click', cancelar);
    const bCom = document.getElementById('tfComentar'); if (bCom) bCom.addEventListener('click', comentar);
    document.querySelectorAll('#tfVinc .k-vinc[data-abrir]').forEach(v => v.addEventListener('click', () => abrirVinculo(v.dataset.abrir)));
  }

  function cuerpoFicha(t, editable, puedeCap) {
    const dis = editable ? '' : ' disabled';
    const asigOpts = '<option value="">— sin asignar —</option>' +
      ((t.asignado_a && !socios.some(s => String(s.id) === String(t.asignado_a))) ? `<option value="${esc(t.asignado_a)}" selected>${esc(nombreSocio(t.asignado_a))}</option>` : '') +
      socios.map(s => `<option value="${esc(s.id)}"${String(s.id) === String(t.asignado_a) ? ' selected' : ''}>${esc(etiquetaSocio(s))}</option>`).join('');

    const vinc = chips(t);
    const botonesEstado = puedeCap ? ESTADO_ACTIVOS.filter(e => e !== t.estado).map(e =>
      `<button class="btn-mini gris" data-estado="${e}">Marcar ${esc(ESTADO_LABEL[e])}</button>`).join('') : '';

    const hilo = comentarios.length
      ? comentarios.map(c => `<div class="tarea-com"><div class="tc-cab">${esc(c.autor || c.autor_email || '—')} · ${esc(fechaHora(c.creado_en))}</div><div class="tc-txt">${esc(c.texto)}</div></div>`).join('')
      : '<div class="tarea-com-vacio">Sin comentarios todavía.</div>';

    return `<div class="form-erp">
      <div class="campos">
        <div class="campo ancho"><label>Título</label>
          ${editable ? `<input id="tfTitulo" type="text" maxlength="160" value="${esc(t.titulo || '')}">` : `<div class="campo-fijo">${esc(t.titulo || '—')}</div>`}</div>
        <div class="campo"><label>Área</label>
          <select id="tfArea"${dis}>${opciones(AREAS, a => AREA_LABEL[a], t.area)}</select></div>
        <div class="campo"><label>Prioridad</label>
          <select id="tfPrioridad"${dis}>${opciones(PRIORIDADES, p => PRIORIDAD_LABEL[p], t.prioridad)}</select></div>
        <div class="campo"><label>Asignado a</label>
          <select id="tfAsignado"${dis}>${asigOpts}</select></div>
        <div class="campo"><label>Fecha límite</label>
          ${editable ? `<input id="tfFecha" type="date" value="${esc((t.fecha_limite || '').slice(0, 10))}">` : `<div class="campo-fijo ${t.atrasada ? 'neg' : ''}">${fecha4(t.fecha_limite)}${t.atrasada ? ' · atrasada' : ''}</div>`}</div>
        <div class="campo"><label>Estado</label><div class="campo-fijo">${esc(ESTADO_LABEL[t.estado] || t.estado)}</div></div>
        <div class="campo ancho"><label>Embarque ligado</label>
          ${editable ? '<div id="tfCarga"></div>' : `<div class="campo-fijo">${esc(t.carga_folio || '—')}</div>`}</div>
        <div class="campo ancho"><label>Descripción</label>
          ${editable ? `<textarea id="tfDesc" rows="3">${esc(t.descripcion || '')}</textarea>` : `<div class="campo-fijo">${esc(t.descripcion || '—')}</div>`}</div>
      </div>

      ${vinc ? `<div class="tarea-vinc" id="tfVinc"><span class="l">Ligada a:</span> ${vinc}</div>` : ''}
      ${t.estado === 'cancelada' && t.nota_cierre ? `<div class="aviso visible err">Cancelada. Motivo: ${esc(t.nota_cierre)}</div>` : ''}

      <div class="acciones" id="tfEstados">
        ${editable ? '<button class="btn-mini" id="tfGuardar">Guardar</button>' : ''}
        ${botonesEstado}
        ${puedeCap && t.estado !== 'cancelada' ? '<button class="btn-mini peligro" id="tfCancelar">Cancelar tarea</button>' : ''}
      </div>
      <div class="aviso" id="tfEdAviso"></div>

      <div class="seccion-head"><h4>Comentarios</h4></div>
      <div class="tarea-hilo">${hilo}</div>
      ${puedeCap ? `<div class="form-erp" style="margin-top:10px">
        <div class="campo ancho"><textarea id="tfComTexto" rows="2" placeholder="Escribe un comentario…"></textarea></div>
        <div class="acciones"><button class="btn-mini" id="tfComentar">Comentar</button></div>
      </div>` : ''}
    </div>`;
  }

  function avisoEd(tipo, html) { const el = document.getElementById('tfEdAviso'); if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; } }
  function bloquear(dis) { document.querySelectorAll('#tfEstados button').forEach(b => b.disabled = dis); }

  async function guardar() {
    const v = id => (document.getElementById(id) || {}).value;
    const titulo = (v('tfTitulo') || '').trim();
    if (!titulo) { avisoEd('err', 'El título es obligatorio.'); return; }
    const fecha = v('tfFecha') || null;
    const args = {
      p_folio: tareaActual.folio,
      p_titulo: titulo,
      p_descripcion: (v('tfDesc') || '').trim() || null,
      p_area: v('tfArea') || tareaActual.area,
      p_prioridad: v('tfPrioridad') || tareaActual.prioridad,
      p_fecha_limite: fecha,
      p_limpiar_fecha: !fecha && !!tareaActual.fecha_limite,
      p_asignado_a: v('tfAsignado') || null,
      p_carga_folio: (comboCargaFicha && comboCargaFicha.valorId()) || null,
      // Vínculos que la ficha no edita se pasan sin cambiar.
      p_cotizacion_folio: tareaActual.cotizacion_folio || null,
      p_orden_folio: tareaActual.orden_folio || null,
      p_contraparte_id: tareaActual.contraparte_id ?? null
    };
    bloquear(true); avisoEd('warn', 'Guardando…');
    try {
      await rpc('fn_editar_tarea', args);
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Tarea guardada.');
      verTarea(tareaActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { bloquear(false); return; }
      avisoEd('err', `El ERP rechazó la tarea: ${esc(e.message)}`);
      bloquear(false);
    }
  }

  async function cambiarEstado(estado) {
    bloquear(true); avisoEd('warn', `Cambiando a ${esc(ESTADO_LABEL[estado] || estado)}…`);
    try {
      await rpc('fn_cambiar_estado_tarea', { p_folio: tareaActual.folio, p_estado: estado });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Tarea ${esc(tareaActual.folio)} → <b>${esc(ESTADO_LABEL[estado] || estado)}</b>.`);
      verTarea(tareaActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { bloquear(false); return; }
      avisoEd('err', `No se pudo cambiar el estado: ${esc(e.message)}`);
      bloquear(false);
    }
  }

  async function cancelar() {
    const motivo = window.prompt('Motivo de la cancelación (queda registrado):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para cancelar.'); return; }
    bloquear(true); avisoEd('warn', 'Cancelando…');
    try {
      await rpc('fn_cancelar_tarea', { p_folio: tareaActual.folio, p_motivo: motivo.trim() });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Tarea ${esc(tareaActual.folio)} cancelada.`);
      verTarea(tareaActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { bloquear(false); return; }
      avisoEd('err', `No se pudo cancelar: ${esc(e.message)}`);
      bloquear(false);
    }
  }

  async function comentar() {
    const ta = document.getElementById('tfComTexto');
    const texto = (ta ? ta.value : '').trim();
    if (!texto) { avisoEd('err', 'Escribe un comentario antes de enviar.'); return; }
    const btn = document.getElementById('tfComentar');
    if (btn) btn.disabled = true;
    try {
      await rpc('fn_comentar_tarea', { p_folio: tareaActual.folio, p_texto: texto });
      ERP.marcarDatosSucios();
      verTarea(tareaActual.folio);   // recarga el hilo
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { if (btn) btn.disabled = false; return; }
      avisoEd('err', `No se pudo comentar: ${esc(e.message)}`);
      if (btn) btn.disabled = false;
    }
  }

  /* ================= Integración en ficha/expediente de embarque ================= */

  async function montarTareasCarga(contenedor, folio, permitirNueva = true) {
    if (!contenedor) return;
    const puedeCap = ERP.puede('capturar');
    const boton = (puedeCap && permitirNueva) ? '<button class="btn-mini" id="btnNuevaTareaCarga">Nueva tarea</button>' : '';
    contenedor.innerHTML = `<div class="seccion-head"><h4>Tareas</h4>${boton}</div>
      <div id="tareasCargaLista"><div class="skel">Cargando…</div></div>`;
    const btn = document.getElementById('btnNuevaTareaCarga');
    if (btn) btn.addEventListener('click', () => nuevaTarea(folio));

    const lista = document.getElementById('tareasCargaLista');
    try {
      const tks = await q('v_tareas', `&carga_folio=${ERP.eq(folio)}&order=folio.desc`);
      lista.innerHTML = tks.length
        ? `<div class="tabla-wrap"><table>
            <thead><tr><th>Folio</th><th>Título</th><th>Asignado</th><th>Límite</th><th>Estado</th></tr></thead>
            <tbody>${tks.map(t => `<tr class="clic ${t.atrasada ? 'vencido-alto' : ''}" data-tf="${esc(t.folio)}">
              <td class="mono"><span class="enlace">${esc(t.folio)}</span></td>
              <td>${esc(t.titulo || '—')}</td>
              <td>${esc(nombreSocio(t.asignado_a))}</td>
              <td class="${t.atrasada ? 'neg' : ''}">${t.fecha_limite ? esc(fecha4(t.fecha_limite)) : '—'}</td>
              <td>${pillEstado(t.estado)}</td></tr>`).join('')}</tbody>
          </table></div>`
        : '<div class="vacio" style="padding:10px 0">Este embarque no tiene tareas.</div>';
      lista.querySelectorAll('tr.clic[data-tf]').forEach(tr =>
        tr.addEventListener('click', () => { ERP.ir('tareas'); setTimeout(() => verTarea(tr.dataset.tf), 60); }));
    } catch (e) {
      lista.innerHTML = `<div class="errbox">No se pudieron leer las tareas: ${esc(e.message)}</div>`;
    }
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('tareas', {
    titulo: 'Tareas',
    descripcion: 'Pendientes por área y socio — kanban o tabla',
    render
  });

  ERP.verTarea = verTarea;
  ERP.nuevaTarea = nuevaTarea;
  ERP.montarTareasCarga = montarTareasCarga;
})();
