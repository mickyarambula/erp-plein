/* Módulo Embarques físicos / Loads (ruta 'loads') — Fase C, backend E76 ya desplegado (verificado
   en vivo antes de programar). ESPEJO estructural de modulo-lotes.js: lista + ficha + estados +
   export + documentos.
   Un Load consolida una o más CARGAS (embarques comerciales) en un contenedor/tráiler físico para
   el cruce de frontera — trazabilidad logística (transportista, booking, BOL/Carta Porte,
   temperatura, recorder). Es una entidad distinta de la Carga (comercial) y del Lote (costeo).

   Vistas (solo lectura, confirmadas en vivo columna por columna antes de programar):
     v_loads (folio, transportista, contenedor_placas, booking, cruce, fecha_cruce,
       temperatura_c, recorder, bol_carta_porte, pallets, estado, nota, n_cargas, cajas_total,
       cargas, anulado)
     v_load_cargas (id, load_folio, carga_folio, carga_po, cliente, producto, cajas, carga_estado)
     v_carga_detalle (picker de cargas a consolidar/asignar: folio, po, cliente, producto, cajas, anulado)
   Estados (fijos — no hay vista catálogo para Loads, a diferencia de v_estados_carga; se listan
   tal cual los da el contrato de esta pieza): en_origen → en_cruce → en_transito → entregado.
   RPCs (firmas confirmadas en vivo contra PostgREST, no adivinadas):
     fn_crear_load(p_transportista, p_contenedor_placas, p_booking, p_cruce, p_fecha_cruce date,
       p_temperatura_c numeric, p_recorder, p_bol_carta_porte, p_pallets int, p_nota,
       p_cargas text[]) — TODOS los parámetros son opcionales. Gate 'capturar'.
     fn_asignar_carga_load(p_load_folio, p_carga_folio) — gate 'capturar'.
     fn_desasignar_carga_load(p_load_folio, p_carga_folio) — gate 'editar'.
     fn_editar_load(p_load_folio, ...mismos campos logísticos que crear..., p_estado, p_nota) —
       NULL = no tocar. Gate 'editar'. Se reusa tanto para editar campos como para "cambiar
       estado" (se manda SOLO p_estado con todo lo demás en null, aprovechando el contrato NULL).
     fn_anular_load(p_load_folio, p_motivo) — gate 'editar'.
   Documentos: ERP.documentos.montar(cont, {entidad:'load', entidadId: folio}) — BOL, Carta Porte,
   packing list, FDA. 'load' es una entidad nueva para el sistema de documentos (fuera del enum
   carga|contraparte|movimiento|general documentado en CLAUDE.md); si el backend la rechaza es un
   pendiente de backend a anotar, no un bug de este módulo (no se puede verificar sin sesión real).
   Expone ERP.verLoad, ERP.nuevoLoad. */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num } = ERP;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha4(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return `${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}-${d.getFullYear()}`;
  }
  const numOrNull = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

  // Estados fijos del Load (no hay catálogo de backend para esto, a diferencia de v_estados_carga).
  const ESTADOS_LOAD = [
    { valor: 'en_origen', etiqueta: 'En origen', clase: 'lila' },
    { valor: 'en_cruce', etiqueta: 'En cruce', clase: 'ambar' },
    { valor: 'en_transito', etiqueta: 'En tránsito', clase: 'azul' },
    { valor: 'entregado', etiqueta: 'Entregado', clase: 'verde' }
  ];
  const estadoLoadInfo = v => ESTADOS_LOAD.find(e => e.valor === v) || { valor: v, etiqueta: v || '—', clase: 'gris' };
  // Reusa .badge-estado (mismo componente visual que los estados de carga) — sin CSS nueva.
  const chipEstadoLoad = v => `<span class="badge-estado ${estadoLoadInfo(v).clase}">${esc(estadoLoadInfo(v).etiqueta)}</span>`;
  const chipAnulado = anulado => anulado ? '<span class="badge-estado gris">Anulado</span>' : '';

  /* ================= Lista ================= */

  let loads = [];
  let fFiltro = 'vivos';   // 'vivos' | 'anulados' | ''
  let fTexto = '';

  function filtradas() {
    const t = ERP.norm(fTexto);
    return loads.filter(l => {
      if (fFiltro === 'vivos' && l.anulado) return false;
      if (fFiltro === 'anulados' && !l.anulado) return false;
      if (!t) return true;
      return [l.folio, l.transportista, l.contenedor_placas, l.booking, l.cruce, l.cargas].some(x => ERP.norm(x).includes(t));
    });
  }

  function pintarTabla() {
    const cont = document.getElementById('ldTabla');
    const conteo = document.getElementById('ldConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${loads.length} embarques físicos`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ningún embarque físico coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblLoads">
      <thead><tr><th>Folio</th><th>Transportista</th><th>Contenedor/Placas</th><th>Cruce</th>
        <th>Fecha cruce</th><th class="num">Pallets</th><th class="num">Cargas</th>
        <th class="num">Cajas</th><th>Estado</th></tr></thead>
      <tbody>${rows.map(l => `<tr class="clic" data-folio="${esc(l.folio)}">
        <td class="mono"><span class="enlace">${esc(l.folio)}</span></td>
        <td>${esc(l.transportista || '—')}</td>
        <td class="mono">${esc(l.contenedor_placas || '—')}</td>
        <td>${esc(l.cruce || '—')}</td>
        <td>${fecha4(l.fecha_cruce)}</td>
        <td class="num">${l.pallets == null ? '—' : esc(l.pallets)}</td>
        <td class="num">${esc(l.n_cargas ?? 0)}</td>
        <td class="num">${l.cajas_total == null ? '—' : esc(l.cajas_total)}</td>
        <td>${l.anulado ? chipAnulado(true) : chipEstadoLoad(l.estado)}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-folio]').forEach(tr =>
      tr.addEventListener('click', () => verLoad(tr.dataset.folio)));
  }

  async function render(cont, parametro) {
    const puedeCap = ERP.puede('capturar');
    let ls;
    try {
      ls = await q('v_loads', '&order=folio.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los embarques físicos: ${esc(e.message)}</div>`;
      return;
    }
    loads = ls || [];
    fFiltro = 'vivos'; fTexto = '';

    cont.innerHTML = `
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="ldNuevo">+ Nuevo embarque físico</button>' : ''}
        <select class="busca" id="ldFFiltro" style="max-width:160px">
          <option value="vivos">Vivos</option>
          <option value="anulados">Anulados</option>
          <option value="">Todos</option>
        </select>
        <input class="busca" id="ldFTexto" type="text" placeholder="Buscar por folio, transportista, contenedor, booking o cruce…">
        <span class="conteo" id="ldConteo"></span>
      </div>
      ${ERP.botonesExportar ? ERP.botonesExportar('EmbarquesFisicos', 'Embarques físicos', '#tblLoads') : ''}
      <div class="card" style="padding:14px"><div id="ldTabla"></div></div>
      <div class="leyenda">El Load es la unidad LOGÍSTICA (contenedor/tráiler que cruza la frontera):
        puede consolidar varias cargas comerciales. Estados: En origen → En cruce → En tránsito → Entregado.</div>`;

    const btnN = document.getElementById('ldNuevo');
    if (btnN) btnN.addEventListener('click', () => nuevoLoad());
    document.getElementById('ldFFiltro').addEventListener('change', e => { fFiltro = e.target.value; pintarTabla(); });
    let tempo;
    document.getElementById('ldFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });

    pintarTabla();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
    if (parametro) verLoad(parametro);
  }

  /* ================= Nuevo embarque físico ================= */

  let cargasDispNv = [];

  async function nuevoLoad() {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Nuevo embarque físico', 'Datos logísticos (todos opcionales)', '<div class="skel">Cargando embarques…</div>');
    try {
      const cargas = await q('v_carga_detalle');
      cargasDispNv = (cargas || []).filter(c => !c.anulado);
    } catch (e) {
      ERP.abrirPanel('Nuevo embarque físico', '', `<div class="errbox">No se pudieron leer los embarques: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Nuevo embarque físico', 'Datos logísticos (todos opcionales)', `
      <div class="form-erp oc-editor">
        <div class="campos">
          <div class="campo"><label>Transportista</label><input id="ldTransportista" type="text" maxlength="80" placeholder="Opcional"></div>
          <div class="campo"><label>Contenedor / Placas</label><input id="ldContenedor" type="text" maxlength="40" placeholder="Opcional"></div>
          <div class="campo"><label>Booking</label><input id="ldBooking" type="text" maxlength="40" placeholder="Opcional"></div>
          <div class="campo"><label>Cruce (garita)</label><input id="ldCruce" type="text" maxlength="40" placeholder="Ej. Nogales, Otay"></div>
          <div class="campo"><label>Fecha de cruce</label><input id="ldFechaCruce" type="date"></div>
          <div class="campo"><label>Temperatura (°C)</label><input id="ldTemp" class="mono" type="number" step="0.1" placeholder="Opcional"></div>
          <div class="campo"><label>Recorder</label><input id="ldRecorder" type="text" maxlength="40" placeholder="Opcional"></div>
          <div class="campo"><label>BOL / Carta Porte</label><input id="ldBol" type="text" maxlength="60" placeholder="Opcional"></div>
          <div class="campo"><label>Pallets</label><input id="ldPallets" class="mono" type="number" step="1" min="0" placeholder="Opcional"></div>
          <div class="campo ancho"><label>Cargas a consolidar (opcional)</label>
            <div class="chk-lista" id="ldCargasChk"></div></div>
          <div class="campo ancho"><label>Nota</label><textarea id="ldNota" rows="2"></textarea></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="ldCrear">Crear embarque físico</button>
          <button class="btn-mini gris" id="ldCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ldNvAviso"></div>
      </div>`);

    const chk = document.getElementById('ldCargasChk');
    chk.innerHTML = cargasDispNv.length
      ? cargasDispNv.map(c => `<label style="display:flex;align-items:center;gap:6px;font-size:12.5px">
          <input type="checkbox" value="${esc(c.folio)}" style="width:auto">
          <span class="mono">${esc(c.folio)}</span> · ${esc(c.po || '—')} · ${esc(c.cliente || '—')} · ${esc(c.producto || '—')}</label>`).join('')
      : '<div class="vacio" style="padding:8px">No hay embarques vivos disponibles.</div>';

    document.getElementById('ldCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('ldCrear').addEventListener('click', crearLoad);
  }

  function avisoNv(tipo, html) {
    const el = document.getElementById('ldNvAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function crearLoad() {
    const v = id => ((document.getElementById(id) || {}).value || '').trim();
    const cargas = Array.from(document.querySelectorAll('#ldCargasChk input[type=checkbox]:checked')).map(el => el.value);

    const args = {
      p_transportista: v('ldTransportista') || null,
      p_contenedor_placas: v('ldContenedor') || null,
      p_booking: v('ldBooking') || null,
      p_cruce: v('ldCruce') || null,
      p_fecha_cruce: v('ldFechaCruce') || null,
      p_temperatura_c: numOrNull(v('ldTemp')),
      p_recorder: v('ldRecorder') || null,
      p_bol_carta_porte: v('ldBol') || null,
      p_pallets: numOrNull(v('ldPallets')),
      p_nota: v('ldNota') || null,
      p_cargas: cargas.length ? cargas : null
    };

    const btn = document.getElementById('ldCrear');
    btn.disabled = true;
    avisoNv('warn', 'Creando embarque físico…');
    try {
      const data = await rpc('fn_crear_load', args);
      const r = (data && data[0]) || {};
      if (!r.folio) throw new Error('El ERP no devolvió el folio del embarque físico.');
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Embarque físico <b>${esc(r.folio)}</b> creado.`);
      verLoad(r.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoNv('err', `El ERP rechazó el embarque físico: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha ================= */

  let loadActual = null;

  async function verLoad(folio) {
    ERP.abrirPanel('Embarque físico', 'Cargando…', '<div class="skel">Cargando embarque físico…</div>');
    let load, cargas;
    try {
      [load, cargas] = await Promise.all([
        q('v_loads', `&folio=${ERP.eq(folio)}`).then(r => r && r[0]),
        q('v_load_cargas', `&load_folio=${ERP.eq(folio)}&order=carga_folio.asc`)
      ]);
      if (!load) throw new Error('El embarque físico no existe.');
    } catch (e) {
      ERP.abrirPanel('Embarque físico', '', `<div class="errbox">No se pudo cargar el embarque físico: ${esc(e.message)}</div>`);
      return;
    }
    loadActual = load;
    const puedeCap = ERP.puede('capturar');
    const puedeEd = ERP.puede('editar');
    const activo = !load.anulado;

    ERP.abrirPanel(
      `Embarque físico ${esc(load.folio)}`,
      `${esc(load.transportista || 'Sin transportista')} · ${load.anulado ? chipAnulado(true) : chipEstadoLoad(load.estado)}`,
      cuerpoFicha(load, cargas || [], activo, puedeCap, puedeEd)
    );

    ERP.documentos.montar(document.getElementById('ldDocs'), { entidad: 'load', entidadId: load.folio, permitirSubir: activo });

    if (activo && puedeCap) {
      const bAsig = document.getElementById('ldAsignar');
      if (bAsig) bAsig.addEventListener('click', () => abrirAsignarCarga());
    }
    if (activo && puedeEd) {
      const bEditar = document.getElementById('ldEditar');
      if (bEditar) bEditar.addEventListener('click', () => abrirEditar());
      const bEstado = document.getElementById('ldCambiarEstado');
      if (bEstado) bEstado.addEventListener('click', () => cambiarEstado());
      const bAnular = document.getElementById('ldAnular');
      if (bAnular) bAnular.addEventListener('click', () => anular());
      document.querySelectorAll('[data-desasig-load]').forEach(b =>
        b.addEventListener('click', () => desasignarCarga(b.dataset.desasigLoad)));
    }
  }

  function tablaCargasLoad(cargas, editable) {
    const cajas = cargas.reduce((s, c) => s + num(c.cajas), 0);
    const filas = cargas.length ? cargas.map(c => `<tr>
        <td class="mono"><span class="enlace" data-carga="${esc(c.carga_folio)}">${esc(c.carga_folio || '—')}</span>${c.carga_po ? ` · ${esc(c.carga_po)}` : ''}</td>
        <td>${esc(c.cliente || '—')}</td>
        <td>${esc(c.producto || '—')}</td>
        <td class="num">${c.cajas == null ? '—' : esc(c.cajas)}</td>
        <td>${esc(c.carga_estado || '—')}</td>
        ${editable ? `<td><button class="btn-cap" data-desasig-load="${esc(c.carga_folio)}" title="Quitar esta carga">✕</button></td>` : ''}
      </tr>`).join('')
      : `<tr><td colspan="${editable ? 6 : 5}" style="color:var(--gris)">Sin cargas asignadas todavía.</td></tr>`;
    return `<div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Embarque</th><th>Cliente</th><th>Producto</th><th class="num">Cajas</th>
          <th>Estado</th>${editable ? '<th></th>' : ''}</tr></thead>
        <tbody>${filas}</tbody>
        ${cargas.length ? `<tfoot><tr class="total"><td colspan="3">Total (${cargas.length})</td>
          <td class="num">${cajas}</td><td></td>${editable ? '<td></td>' : ''}</tr></tfoot>` : ''}
      </table></div>`;
  }

  function cuerpoFicha(load, cargas, activo, puedeCap, puedeEd) {
    return `<div class="form-erp oc-editor">
      <div class="campos">
        <div class="campo"><label>Folio</label><div class="campo-fijo">${esc(load.folio)}</div></div>
        <div class="campo"><label>Transportista</label><div class="campo-fijo">${esc(load.transportista || '—')}</div></div>
        <div class="campo"><label>Contenedor / Placas</label><div class="campo-fijo">${esc(load.contenedor_placas || '—')}</div></div>
        <div class="campo"><label>Booking</label><div class="campo-fijo">${esc(load.booking || '—')}</div></div>
        <div class="campo"><label>Cruce</label><div class="campo-fijo">${esc(load.cruce || '—')}</div></div>
        <div class="campo"><label>Fecha de cruce</label><div class="campo-fijo">${fecha4(load.fecha_cruce)}</div></div>
        <div class="campo"><label>Temperatura</label><div class="campo-fijo">${load.temperatura_c == null ? '—' : esc(load.temperatura_c) + ' °C'}</div></div>
        <div class="campo"><label>Recorder</label><div class="campo-fijo">${esc(load.recorder || '—')}</div></div>
        <div class="campo"><label>BOL / Carta Porte</label><div class="campo-fijo">${esc(load.bol_carta_porte || '—')}</div></div>
        <div class="campo"><label>Pallets</label><div class="campo-fijo">${load.pallets == null ? '—' : esc(load.pallets)}</div></div>
        <div class="campo"><label>Estado</label><div class="campo-fijo">${load.anulado ? chipAnulado(true) : chipEstadoLoad(load.estado)}</div></div>
        <div class="campo ancho"><label>Nota</label><div class="campo-fijo">${esc(load.nota || '—')}</div></div>
      </div>

      <div class="acciones" style="margin-top:8px">
        ${activo && puedeEd ? '<button class="btn-mini gris" id="ldEditar">Editar</button>' : ''}
        ${activo && puedeEd ? `<button class="btn-mini gris" id="ldCambiarEstado">Cambiar estado</button>
          <select id="ldEstadoNuevo" class="mono">${ESTADOS_LOAD.map(e => `<option value="${e.valor}"${e.valor === load.estado ? ' selected' : ''}>${esc(e.etiqueta)}</option>`).join('')}</select>` : ''}
      </div>
      <div id="ldEditForm"></div>

      <div class="seccion-head"><h4>Cargas consolidadas</h4>${activo && puedeCap ? '<button class="btn-mini gris" id="ldAsignar">Asignar carga</button>' : ''}</div>
      <div id="ldAsigForm"></div>
      ${tablaCargasLoad(cargas, activo && puedeEd)}

      <h4 style="margin-top:22px">Documentos</h4>
      <div id="ldDocs"></div>

      ${activo && puedeEd ? `<div class="zona-peligro">
        <button class="btn-mini peligro" id="ldAnular">Anular embarque físico</button>
      </div>` : ''}
      ${load.anulado ? `<div class="leyenda"><b>Embarque físico anulado.</b> Motivo: ${esc(load.anulado_motivo || '—')}</div>` : ''}
      <div class="aviso" id="ldEdAviso"></div>
    </div>`;
  }

  function avisoEd(tipo, html) {
    const el = document.getElementById('ldEdAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  /* ---------- Editar ---------- */

  function abrirEditar() {
    const cont = document.getElementById('ldEditForm');
    if (!cont) return;
    if (cont.dataset.abierto === '1') { cont.dataset.abierto = ''; cont.innerHTML = ''; return; }
    cont.dataset.abierto = '1';
    const l = loadActual;
    cont.innerHTML = `<div class="form-erp" style="margin:8px 0">
      <div class="campos">
        <div class="campo"><label>Transportista</label><input id="ldEdTransportista" type="text" maxlength="80" value="${esc(l.transportista || '')}"></div>
        <div class="campo"><label>Contenedor / Placas</label><input id="ldEdContenedor" type="text" maxlength="40" value="${esc(l.contenedor_placas || '')}"></div>
        <div class="campo"><label>Booking</label><input id="ldEdBooking" type="text" maxlength="40" value="${esc(l.booking || '')}"></div>
        <div class="campo"><label>Cruce</label><input id="ldEdCruce" type="text" maxlength="40" value="${esc(l.cruce || '')}"></div>
        <div class="campo"><label>Fecha de cruce</label><input id="ldEdFechaCruce" type="date" value="${l.fecha_cruce ? esc(String(l.fecha_cruce).slice(0, 10)) : ''}"></div>
        <div class="campo"><label>Temperatura (°C)</label><input id="ldEdTemp" class="mono" type="number" step="0.1" value="${l.temperatura_c == null ? '' : esc(l.temperatura_c)}"></div>
        <div class="campo"><label>Recorder</label><input id="ldEdRecorder" type="text" maxlength="40" value="${esc(l.recorder || '')}"></div>
        <div class="campo"><label>BOL / Carta Porte</label><input id="ldEdBol" type="text" maxlength="60" value="${esc(l.bol_carta_porte || '')}"></div>
        <div class="campo"><label>Pallets</label><input id="ldEdPallets" class="mono" type="number" step="1" min="0" value="${l.pallets == null ? '' : esc(l.pallets)}"></div>
        <div class="campo ancho"><label>Nota</label><textarea id="ldEdNota" rows="2">${esc(l.nota || '')}</textarea></div>
      </div>
      <div class="alias-ayuda">Deja un campo como está si no lo quieres cambiar.</div>
      <div class="acciones">
        <button class="btn-mini" id="ldEdGuardar">Guardar cambios</button>
        <button class="btn-mini gris" id="ldEdCancelar">Cerrar</button>
      </div>
      <div class="aviso" id="ldEdFormAviso"></div>
    </div>`;

    document.getElementById('ldEdCancelar').addEventListener('click', () => { cont.dataset.abierto = ''; cont.innerHTML = ''; });
    document.getElementById('ldEdGuardar').addEventListener('click', guardarEdicion);
  }

  function avisoEdForm(tipo, html) {
    const el = document.getElementById('ldEdFormAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function guardarEdicion() {
    const v = id => ((document.getElementById(id) || {}).value || '').trim();
    const args = {
      p_load_folio: loadActual.folio,
      p_transportista: v('ldEdTransportista') || null,
      p_contenedor_placas: v('ldEdContenedor') || null,
      p_booking: v('ldEdBooking') || null,
      p_cruce: v('ldEdCruce') || null,
      p_fecha_cruce: v('ldEdFechaCruce') || null,
      p_temperatura_c: numOrNull(v('ldEdTemp')),
      p_recorder: v('ldEdRecorder') || null,
      p_bol_carta_porte: v('ldEdBol') || null,
      p_pallets: numOrNull(v('ldEdPallets')),
      p_estado: null,
      p_nota: v('ldEdNota') || null
    };
    const btn = document.getElementById('ldEdGuardar');
    btn.disabled = true;
    avisoEdForm('warn', 'Guardando…');
    try {
      await rpc('fn_editar_load', args);
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Embarque físico actualizado.');
      verLoad(loadActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoEdForm('err', `El ERP rechazó el cambio: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ---------- Cambiar estado (reusa fn_editar_load; NULL en todo lo demás) ---------- */

  async function cambiarEstado() {
    const nuevo = (document.getElementById('ldEstadoNuevo') || {}).value;
    if (!nuevo) return;
    if (nuevo === loadActual.estado) { avisoEd('warn', 'Ese ya es el estado actual.'); return; }
    if (!window.confirm(`¿Cambiar el estado a "${estadoLoadInfo(nuevo).etiqueta}"?`)) return;
    avisoEd('warn', 'Cambiando estado…');
    try {
      await rpc('fn_editar_load', {
        p_load_folio: loadActual.folio,
        p_transportista: null, p_contenedor_placas: null, p_booking: null, p_cruce: null,
        p_fecha_cruce: null, p_temperatura_c: null, p_recorder: null, p_bol_carta_porte: null,
        p_pallets: null, p_estado: nuevo, p_nota: null
      });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Estado cambiado a <b>${esc(estadoLoadInfo(nuevo).etiqueta)}</b>.`);
      verLoad(loadActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      avisoEd('err', `No se pudo cambiar el estado: ${esc(e.message)}`);
    }
  }

  /* ---------- Asignar / desasignar carga ---------- */

  let comboCargaAsig = null, cargasDispAsig = [];

  async function abrirAsignarCarga() {
    const cont = document.getElementById('ldAsigForm');
    if (!cont) return;
    if (cont.dataset.abierto === '1') { cont.dataset.abierto = ''; cont.innerHTML = ''; return; }
    cont.dataset.abierto = '1';
    cont.innerHTML = '<div class="skel">Cargando embarques…</div>';
    try {
      const cargas = await q('v_carga_detalle');
      cargasDispAsig = (cargas || []).filter(c => !c.anulado);
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los embarques: ${esc(e.message)}</div>`;
      return;
    }
    cont.innerHTML = `<div class="form-erp" style="margin:8px 0">
      <div class="campos">
        <div class="campo ancho"><label>Embarque <span class="req">*</span></label><div id="ldCargaPick"></div></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="ldAsigGuardar">Asignar</button>
        <button class="btn-mini gris" id="ldAsigCancelar">Cerrar</button>
      </div>
      <div class="aviso" id="ldAsigAviso"></div>
    </div>`;

    comboCargaAsig = ERP.crearCombo({
      contenedor: document.getElementById('ldCargaPick'),
      items: cargasDispAsig.map(c => ({
        id: c.folio,
        nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.cliente ? ' · ' + c.cliente : ''}`,
        alias: [c.po, c.cliente, c.producto, c.folio].filter(Boolean)
      })),
      placeholder: 'Folio, PO o cliente…', permitirNuevo: false
    });

    document.getElementById('ldAsigCancelar').addEventListener('click', () => { cont.dataset.abierto = ''; cont.innerHTML = ''; });
    document.getElementById('ldAsigGuardar').addEventListener('click', asignarCarga);
  }

  function avisoAsig(tipo, html) {
    const el = document.getElementById('ldAsigAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function asignarCarga() {
    const folio = comboCargaAsig && comboCargaAsig.valorId();
    if (!folio) { avisoAsig('err', 'Elige un embarque de la lista.'); return; }
    const btn = document.getElementById('ldAsigGuardar');
    btn.disabled = true;
    avisoAsig('warn', 'Asignando embarque…');
    try {
      await rpc('fn_asignar_carga_load', { p_load_folio: loadActual.folio, p_carga_folio: folio });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Embarque <b>${esc(folio)}</b> asignado al embarque físico.`);
      verLoad(loadActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoAsig('err', `El ERP rechazó la asignación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function desasignarCarga(folio) {
    if (!window.confirm(`¿Quitar el embarque ${folio} de este embarque físico?`)) return;
    try {
      await rpc('fn_desasignar_carga_load', { p_load_folio: loadActual.folio, p_carga_folio: folio });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Embarque ${esc(folio)} quitado.`);
      verLoad(loadActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      avisoEd('err', `No se pudo quitar el embarque: ${esc(e.message)}`);
    }
  }

  /* ---------- Anular ---------- */

  async function anular() {
    const motivo = window.prompt('Motivo de la anulación (OBLIGATORIO, queda registrado):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para anular.'); return; }
    const btn = document.getElementById('ldAnular');
    if (btn) btn.disabled = true;
    avisoEd('warn', 'Anulando embarque físico…');
    try {
      await rpc('fn_anular_load', { p_load_folio: loadActual.folio, p_motivo: motivo.trim() });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Embarque físico ${esc(loadActual.folio)} anulado.`);
      verLoad(loadActual.folio);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { if (btn) btn.disabled = false; return; }
      avisoEd('err', `No se pudo anular: ${esc(e.message)}`);
      if (btn) btn.disabled = false;
    }
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('loads', {
    titulo: 'Embarques físicos',
    descripcion: 'Contenedores/tráileres que consolidan cargas comerciales para el cruce de frontera',
    render
  });

  ERP.verLoad = verLoad;
  ERP.nuevoLoad = nuevoLoad;
})();
