/* Módulo "Programas" (E47/E47-B) — programas comerciales: acuerdos de venta recurrentes (cliente,
   producto, cómo se cobra, frecuencia, temporada) y su proyección/realidad de cargas. Consume
   vistas (v_programas_comerciales, v_programas_proyeccion, v_programa_cargas, v_cargas_programa)
   y ahora TAMBIÉN captura vía RPC (fn_crear_programa, fn_editar_programa, fn_ligar_carga_programa),
   con gating por rol (ERP.puede) igual que Facturas/Órdenes de Compra. */
(function () {
  'use strict';
  const { q, rpc, esc, num, usd, fmt, fmt0, fecha } = ERP;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const ESTADO_PILL = { activo: 'verde', por_arrancar: 'ambar' };
  const badgeProgEstado = e => `<span class="pill ${ESTADO_PILL[String(e || '').toLowerCase()] || 'gris'}">${esc(e || '—')}</span>`;
  // Modalidad del PROGRAMA (distinto del enum de modalidad de Cargas — trueque/por_definir solo
  // aplican aquí, no se tocó el enum de embarques).
  const MODALIDAD_LBL = {
    margen_fijo: 'Margen Fijo', consignacion: 'Consignación', comision: 'Comisión',
    trueque: 'Trueque', por_definir: 'Por definir'
  };
  const VIA_LBL = { terrestre: 'Terrestre', barco: 'Barco' };
  const TERMINO_LBL = {
    pago_contra_cobro: 'Pago contra cobro', trueque: 'Trueque', credito: 'Crédito', por_definir: 'Por definir'
  };
  const FREC_UNIDAD_LBL = { carga: 'carga', palet: 'palet', contenedor: 'contenedor', medio_contenedor: 'medio contenedor' };
  // Porcentaje sin ceros de más: entero si es entero, si no 1 decimal (evita "10.0%" y "7.53%").
  const pctTxt = n => { const v = Number(n); return (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + '%'; };

  /* Texto compuesto de Ingreso según cómo se cobra el programa. ingreso_base indica la rama
     (pct_venta | usd_caja | por_definir); ingreso_valor trae el número. Nunca se inventa un
     valor: sin dato suficiente, badge ámbar "POR DEFINIR". */
  function textoIngreso(p) {
    const base = String(p.ingreso_base || '').toLowerCase();
    if (base === 'pct_venta' && p.ingreso_valor != null) {
      const retiene = (p.plein_retiene_pct != null && num(p.plein_retiene_pct) !== 100)
        ? ` (retiene ${pctTxt(p.plein_retiene_pct)})` : '';
      return `${pctTxt(p.ingreso_valor)} s/venta${retiene}`;
    }
    if (base === 'usd_caja' && p.ingreso_valor != null) {
      return `${usd(p.ingreso_valor)}/caja`;
    }
    return '<span class="pill ambar">POR DEFINIR</span>';
  }

  // "Todo el año" o "mmm–mmm" (mes_desde/mes_hasta, 1-12). Un cruce de año (dic–abr) se pinta
  // tal cual, sin reordenar: mes_desde SIEMPRE primero, mes_hasta SIEMPRE después.
  function textoTemporada(p) {
    if (p.todo_ano) return 'Todo el año';
    if (p.mes_desde == null || p.mes_hasta == null) return '—';
    const d = num(p.mes_desde), h = num(p.mes_hasta);
    if (d < 1 || d > 12 || h < 1 || h > 12) return '—';
    return `${MESES[d - 1]}–${MESES[h - 1]}`;
  }

  /* ================= Helpers puros de captura (testables sin DOM) ================= */

  function igualTxt(a, b) {
    const na = (a === null || a === undefined) ? '' : String(a).trim();
    const nb = (b === null || b === undefined) ? '' : String(b).trim();
    return na === nb;
  }
  function igualNum(a, b) {
    const na = (a === null || a === undefined || a === '') ? null : Number(a);
    const nb = (b === null || b === undefined || b === '') ? null : Number(b);
    return na === nb;
  }
  function igualBool(a, b) { return !!a === !!b; }
  // Compara por String() (no Number()): los ids del catálogo pueden no ser enteros — no se asume su tipo.
  function igualConjunto(a, b) {
    const na = Array.from(new Set((a || []).map(String))).sort();
    const nb = Array.from(new Set((b || []).map(String))).sort();
    return JSON.stringify(na) === JSON.stringify(nb);
  }
  const numOrNull = v => (v === '' || v === null || v === undefined) ? null : Number(v);

  /* Si todo_ano es false, mes_desde y mes_hasta son obligatorios y deben ser 1..12.
     Pura — sin DOM, para poder probarla con un smoke test aislado. */
  function validarTemporada(todoAno, mesDesde, mesHasta) {
    if (todoAno) return null;
    const d = (mesDesde === '' || mesDesde == null) ? null : Number(mesDesde);
    const h = (mesHasta === '' || mesHasta == null) ? null : Number(mesHasta);
    if (d == null || h == null) return 'Si el programa no es "todo el año", captura el mes de inicio y el mes de fin de temporada.';
    if (!Number.isInteger(d) || d < 1 || d > 12 || !Number.isInteger(h) || h < 1 || h > 12) {
      return 'El mes de inicio y el mes de fin de temporada deben ser del 1 al 12.';
    }
    return null;
  }

  /* Alta: se manda todo tal cual (no hay "original" contra qué comparar). f = valores crudos
     recogidos del formulario (ver recogerFormPrograma). */
  function armarPayloadCrear(f) {
    return {
      // Vacío -> null (NUNCA ''): así el backend autogenera la etiqueta. Mandar '' lo forzaría
      // a un nombre vacío en vez de dejarlo decidir.
      p_etiqueta: (f.etiqueta || '').trim() || null,
      p_bloque: Number(f.bloque),
      p_cliente_id: f.clienteId,
      p_producto: (f.producto || '').trim(),
      p_modalidad: f.modalidad,
      p_proveedor_id: f.proveedorId ?? null,
      p_es_frente: !!f.esFrente,
      p_ingreso_base: f.ingresoBase,
      p_ingreso_valor: numOrNull(f.ingresoValor),
      p_plein_retiene_pct: numOrNull(f.pleinRetienePct),
      p_frecuencia_valor: numOrNull(f.frecuenciaValor),
      p_frecuencia_unidad: f.frecuenciaUnidad || null,
      p_cargas_equiv_sem: numOrNull(f.cargasEquivSem),
      p_todo_ano: !!f.todoAno,
      p_mes_desde: f.todoAno ? null : numOrNull(f.mesDesde),
      p_mes_hasta: f.todoAno ? null : numOrNull(f.mesHasta),
      p_via: f.via || null,
      p_termino_proveedor: f.terminoProveedor || null,
      p_pick_pack_pct: numOrNull(f.pickPackPct),
      p_estado: f.estado,
      p_producto_ids: (f.productoIds && f.productoIds.length) ? f.productoIds : null,
      p_nota: (f.nota || '').trim() || null
    };
  }

  /* Edición: SOLO los campos que cambiaron contra `orig` (fila de v_programas_comerciales); el
     resto va null = "no tocar" (mismo contrato ya usado por fn_editar_proyecto). Limitación
     conocida y aceptada (igual que en Proyectos): un campo numérico/id no se puede "vaciar" a
     NULL desde la UI — vacío siempre se interpreta como "no tocar", nunca como "bórralo". Los
     campos de texto y el arreglo de productos SÍ soportan vaciarse (mandan '' o [] explícito). */
  function armarPayloadEditar(orig, f) {
    const mesDesdeNv = f.todoAno ? null : numOrNull(f.mesDesde);
    const mesHastaNv = f.todoAno ? null : numOrNull(f.mesHasta);
    return {
      p_codigo: orig.codigo,
      // Vacío = "no tocar" (nunca borra el nombre), igual que nota/producto — nunca ''.
      p_etiqueta: igualTxt(f.etiqueta, orig.etiqueta) ? null : ((f.etiqueta || '').trim() || null),
      p_bloque: igualNum(f.bloque, orig.bloque) ? null : Number(f.bloque),
      p_cliente_id: igualNum(f.clienteId, orig.cliente_id) ? null : f.clienteId,
      p_producto: igualTxt(f.producto, orig.producto) ? null : (f.producto || '').trim(),
      p_modalidad: igualTxt(f.modalidad, orig.modalidad) ? null : f.modalidad,
      p_proveedor_id: igualNum(f.proveedorId, orig.proveedor_id) ? null : (f.proveedorId ?? null),
      p_es_frente: igualBool(f.esFrente, orig.es_frente !== false) ? null : !!f.esFrente,
      p_ingreso_base: igualTxt(f.ingresoBase, orig.ingreso_base) ? null : f.ingresoBase,
      p_ingreso_valor: igualNum(f.ingresoValor, orig.ingreso_valor) ? null : numOrNull(f.ingresoValor),
      p_plein_retiene_pct: igualNum(f.pleinRetienePct, orig.plein_retiene_pct) ? null : numOrNull(f.pleinRetienePct),
      p_frecuencia_valor: igualNum(f.frecuenciaValor, orig.frecuencia_valor) ? null : numOrNull(f.frecuenciaValor),
      p_frecuencia_unidad: igualTxt(f.frecuenciaUnidad, orig.frecuencia_unidad) ? null : (f.frecuenciaUnidad || null),
      p_cargas_equiv_sem: igualNum(f.cargasEquivSem, orig.cargas_equiv_sem) ? null : numOrNull(f.cargasEquivSem),
      p_todo_ano: igualBool(f.todoAno, orig.todo_ano) ? null : !!f.todoAno,
      p_mes_desde: igualNum(mesDesdeNv, orig.mes_desde) ? null : mesDesdeNv,
      p_mes_hasta: igualNum(mesHastaNv, orig.mes_hasta) ? null : mesHastaNv,
      p_via: igualTxt(f.via, orig.via) ? null : (f.via || null),
      p_termino_proveedor: igualTxt(f.terminoProveedor, orig.termino_proveedor) ? null : (f.terminoProveedor || null),
      p_pick_pack_pct: igualNum(f.pickPackPct, orig.pick_pack_pct) ? null : numOrNull(f.pickPackPct),
      p_estado: igualTxt(f.estado, orig.estado) ? null : f.estado,
      p_producto_ids: igualConjunto(f.productoIds, orig.producto_ids) ? null : (f.productoIds || []),
      p_venta_tipica_carga: igualNum(f.ventaTipicaCarga, orig.venta_tipica_carga) ? null : numOrNull(f.ventaTipicaCarga),
      p_cajas_tipicas_carga: igualNum(f.cajasTipicasCarga, orig.cajas_tipicas_carga) ? null : numOrNull(f.cajasTipicasCarga),
      p_nota: igualTxt(f.nota, orig.nota) ? null : (f.nota || '').trim(),
      p_motivo: (f.motivo || '').trim() || null
    };
  }

  const textoRpc = data => (typeof data === 'string' ? data : ((data && data[0]) || 'Listo.'));

  /* ================= Utilerías locales de UI (mismos patrones que Cargas/Proyectos) ================= */

  const catalogo = vista => q(vista, '&order=nombre.asc');

  function aviso(id, tipo, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'aviso visible ' + tipo;
    el.innerHTML = html;
  }
  function limpiarAviso(id) {
    const el = document.getElementById(id);
    if (el) { el.className = 'aviso'; el.innerHTML = ''; }
  }

  // Modal ligero (mismo patrón que modulo-proyectos.js) para confirmaciones cortas (desligar).
  function abrirModal(titulo, innerHtml) {
    const ov = document.createElement('div');
    ov.className = 'modal-ov';
    ov.innerHTML = `<div class="modal-box"><h3 style="margin:0 0 12px">${titulo}</h3>${innerHtml}<div class="aviso" id="mAviso"></div></div>`;
    document.body.appendChild(ov);
    const cerrar = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
    const setA = (tipo, html) => { const a = ov.querySelector('#mAviso'); a.className = 'aviso visible ' + tipo; a.innerHTML = html; };
    return { ov, cerrar, setA };
  }

  const opcionesSelect = (valores, etiquetas, actual) =>
    valores.map(v => `<option value="${esc(v)}"${v === actual ? ' selected' : ''}>${esc(etiquetas[v] || v)}</option>`).join('');

  /* ================= Estado del módulo ================= */
  let programas = [];
  let filtroBloque = 'todos';
  let mesSeleccionadoProy = null;
  let proyeccionRows = [];

  let progEstado = null;          // ficha abierta: { codigo, p, cargas }
  let comboPgCliente = null, comboPgProveedor = null, comboPgProducto = null;
  let productosCatActual = [];    // catálogo de productos vigente mientras el form de captura está abierto

  /* ================= Sección 1: Lista (agrupada por bloque) ================= */

  /* `p.bloque` llega de PostgREST como number; `ch.dataset.bloque` (y por tanto `filtroBloque`)
     SIEMPRE es string — el dataset del DOM nunca guarda otra cosa. Comparar con === sin
     normalizar nunca coincide ("2" !== 2) y el filtro se queda vacío (bug 2026-07-27). Puras y
     testables sin DOM; no se cambia el tipo del dato ni el del dataset, solo la comparación. */
  function mismoBloque(a, b) { return String(a) === String(b); }
  function coincideFiltroBloque(bloquePrograma, filtro) {
    return filtro === 'todos' || mismoBloque(bloquePrograma, filtro);
  }

  function pintarListaProgramas() {
    const bloques = [...new Set(programas.map(p => p.bloque).filter(Boolean))].sort();
    const filas = programas.filter(p => coincideFiltroBloque(p.bloque, filtroBloque));

    const chips = `<div class="filtros">
      <button class="chip${filtroBloque === 'todos' ? ' activo' : ''}" data-bloque="todos">Todos <span class="chip-n">${programas.length}</span></button>
      ${bloques.map(b => `<button class="chip${mismoBloque(b, filtroBloque) ? ' activo' : ''}" data-bloque="${esc(b)}">Bloque ${esc(b)} <span class="chip-n">${programas.filter(p => p.bloque === b).length}</span></button>`).join('')}
    </div>`;

    const tabla = !filas.length ? '<div class="vacio">Ningún programa en este bloque.</div>' : `<div class="tabla-wrap"><table id="tblProgramas">
      <thead><tr><th>Programa</th><th>Cliente</th><th>Producto</th><th>Proveedor</th><th>Modalidad</th>
        <th>Ingreso</th><th>Frecuencia</th><th>Temporada</th><th>Estado</th></tr></thead>
      <tbody>${filas.map(p => {
        const nota = p.nota
          ? ` <span class="info-nota" data-nota="${esc(p.nota)}" title="${esc(p.nota)}" role="button" tabindex="0" style="cursor:help;color:var(--i2)">ⓘ</span>`
          : '';
        const noFrente = p.es_frente === false ? ' <span class="pill gris">no frente</span>' : '';
        const frec = (p.frecuencia_valor != null && p.frecuencia_unidad) ? `${esc(p.frecuencia_valor)}/${esc(p.frecuencia_unidad)}` : '—';
        return `<tr class="clic" data-codigo="${esc(p.codigo)}">
          <td><span class="enlace">${esc(p.etiqueta || p.codigo)}</span>${nota}${noFrente}
            <div class="mono" style="font-size:11px;color:var(--i2)">${esc(p.codigo)}</div></td>
          <td>${esc(p.cliente || '—')}</td>
          <td>${esc(p.producto || '—')}</td>
          <td>${esc(p.proveedor || '—')}</td>
          <td>${esc(MODALIDAD_LBL[p.modalidad] || p.modalidad || '—')}</td>
          <td>${textoIngreso(p)}</td>
          <td class="mono">${frec}</td>
          <td class="mono">${esc(textoTemporada(p))}</td>
          <td>${badgeProgEstado(p.estado)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    return `${chips}${tabla}`;
  }

  function repintarLista(cont) {
    const el = document.getElementById('progListaCont');
    if (!el) return;
    el.innerHTML = pintarListaProgramas();
    el.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => {
      filtroBloque = ch.dataset.bloque;
      repintarLista(cont);
    }));
    el.querySelectorAll('tr[data-codigo]').forEach(tr => tr.addEventListener('click', () => verPrograma(tr.dataset.codigo)));
    ERP.cablearInfoNota(el);
  }

  /* ================= Sección 2: Proyección anual ================= */

  function pintarProyeccion() {
    if (!proyeccionRows.length) return '<div class="vacio">Sin datos de proyección anual.</div>';
    const rows = proyeccionRows.slice().sort((a, b) => num(a.mes) - num(b.mes));
    const maxV = Math.max(0, ...rows.map(r => num(r.cargas_equiv_sem)));
    const hayAlgunMesSinDato = rows.some(r => num(r.programas_sin_dato) > 0);

    // Mes seleccionado (para el detalle de programas sin dato): por defecto, el mes con más
    // carga equivalente (el que ya se resalta como máximo) — nunca hardcodeado a diciembre.
    if (mesSeleccionadoProy == null) {
      const top = rows.find(r => num(r.cargas_equiv_sem) === maxV);
      mesSeleccionadoProy = top ? num(top.mes) : num(rows[0].mes);
    }

    // "—" en vez de $0.00 cuando el 0 es por falta de dato (programas_sin_dato>0 ese mes),
    // no un cero genuino (ej. mes sin programas activos).
    const ingresoTxt = (valor, sinDato) => (num(valor) === 0 && num(sinDato) > 0) ? '—' : usd(valor);

    const filas = rows.map(r => {
      const v = num(r.cargas_equiv_sem);
      const esMax = maxV > 0 && v === maxV;
      const sel = num(r.mes) === mesSeleccionadoProy;
      const pctBarra = maxV > 0 ? (v / maxV * 100).toFixed(1) : 0;
      return `<tr class="clic${sel ? ' activo-fila' : ''}" data-mes="${num(r.mes)}">
        <td class="mono">${esc(MESES[num(r.mes) - 1] || r.mes)}${esMax ? ' <b>★</b>' : ''}</td>
        <td class="num">${esc(r.programas)}</td>
        <td class="num">${esc(r.activos)}</td>
        <td class="num">${esc(r.por_arrancar)}</td>
        <td><div class="barra"><div class="fill" style="width:${pctBarra}%;background:${esMax ? 'var(--money)' : 'var(--money)'}">${fmt(v)}</div></div></td>
        <td class="num">${ingresoTxt(r.ingreso_sem_activos, r.programas_sin_dato)}</td>
        <td class="num">${ingresoTxt(r.ingreso_sem_por_arrancar, r.programas_sin_dato)}</td>
      </tr>`;
    }).join('');

    const tabla = `<div class="tabla-wrap"><table id="tblProyeccion">
      <thead><tr><th>Mes</th><th class="num">Programas</th><th class="num">Activos</th><th class="num">Por arrancar</th>
        <th>Cargas eq./sem</th><th class="num">Ingreso sem. (activos)</th><th class="num">Ingreso sem. (por arrancar)</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>
    <div class="leyenda">★ = mes con más cargas equivalentes por semana. Toca un mes para ver el detalle.</div>`;

    const detalle = hayAlgunMesSinDato ? (() => {
      const sel = rows.find(r => num(r.mes) === mesSeleccionadoProy);
      const nSinDato = sel ? num(sel.programas_sin_dato) : 0;
      const codigos = (sel && Array.isArray(sel.codigos_sin_dato)) ? sel.codigos_sin_dato : [];
      const mesTxt = MESES[mesSeleccionadoProy - 1] || mesSeleccionadoProy;
      return `<div id="progProyDetalle" style="margin-top:10px;padding:11px 15px;border-radius:8px;background:var(--ambar-bg);color:var(--amb)">
        ${nSinDato > 0
          ? `${nSinDato} programa${nSinDato === 1 ? '' : 's'} sin datos de ingreso en ${esc(mesTxt)} — la proyección en $ está incompleta.${codigos.length ? `<br><span class="mono">${codigos.map(esc).join(', ')}</span>` : ''}`
          : `${esc(mesTxt)} no tiene programas sin datos de ingreso.`}
      </div>`;
    })() : '';

    return `${tabla}${detalle}`;
  }

  function repintarProyeccion(cont) {
    const el = document.getElementById('progProyCont');
    if (!el) return;
    el.innerHTML = pintarProyeccion();
    el.querySelectorAll('tr[data-mes]').forEach(tr => tr.addEventListener('click', () => {
      mesSeleccionadoProy = num(tr.dataset.mes);
      repintarProyeccion(cont);
    }));
  }

  /* ================= Sección 3: Real por programa ================= */

  function pintarRealPrograma(rows) {
    if (!rows.length) return '<div class="vacio">Sin cargas ligadas a programas todavía.</div>';
    return `<div class="tabla-wrap"><table id="tblProgramaCargas">
      <thead><tr><th>Código</th><th class="num">Cargas</th><th>Primera</th><th>Última</th>
        <th class="num">Venta acumulada</th><th class="num">Últimos 7 días</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td class="mono">${esc(r.codigo)}</td>
        <td class="num">${esc(r.cargas_ligadas)}</td>
        <td class="mono">${r.primera ? esc(fecha(r.primera)) : '—'}</td>
        <td class="mono">${r.ultima ? esc(fecha(r.ultima)) : '—'}</td>
        <td class="num">${r.venta_acum == null ? '—' : usd(r.venta_acum)}</td>
        <td class="num">${r.cargas_ult_7d ?? 0}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  /* ================= Captura: campos compartidos de alta/edición ================= */

  /* HTML de todos los campos del formulario (grid .campos). `p` = fila existente (edición) o {}
     (alta, con los defaults del negocio). `editar` agrega Datos de proyección + motivo. */
  function camposPrograma(p, editar) {
    const bloque = p.bloque ?? '';
    const esFrente = p.es_frente !== false;                 // default true si no existe (alta)
    const modalidad = p.modalidad || 'margen_fijo';
    const ingresoBase = p.ingreso_base || 'por_definir';
    const via = p.via || 'terrestre';
    const termino = p.termino_proveedor || 'por_definir';
    const estadoV = p.estado || 'por_arrancar';
    const todoAno = p.todo_ano !== false;                    // default true si no existe (alta)
    const mesDesde = p.mes_desde ?? '';
    const mesHasta = p.mes_hasta ?? '';
    const seleccionados = new Set((p.producto_ids || []).map(String));

    return `
      <div class="campo ancho"><label>Nombre del programa</label>
        <input id="pgEtiqueta" type="text" maxlength="120" value="${esc(p.etiqueta || '')}"
          placeholder="${editar ? '' : 'Se arma solo si lo dejas vacío'}"></div>
      <div class="campo"><label>Bloque <span class="req">*</span></label>
        <input id="pgBloque" class="mono" type="number" step="1" value="${esc(bloque)}"></div>
      <div class="campo"><label>Cliente <span class="req">*</span></label><div id="pgCliente"></div></div>
      <div class="campo"><label>Proveedor</label><div id="pgProveedor"></div>
        <small style="color:var(--i2);font-size:11px">Si no aparece, créalo primero en Directorio Comercial.</small></div>
      <div class="campo"><label>Producto <span class="req">*</span></label><div id="pgProducto"></div></div>
      <div class="campo ancho"><label>Productos del catálogo <span style="font-weight:400;color:var(--i2)">(opcional, para filtros/reportes)</span></label>
        <div class="chk-lista" id="pgProductosCat"></div></div>
      <div class="campo"><label>Modalidad</label><select id="pgModalidad">
        ${opcionesSelect(['margen_fijo', 'consignacion', 'comision', 'trueque', 'por_definir'], MODALIDAD_LBL, modalidad)}
      </select></div>
      <div class="campo"><label style="display:flex;align-items:center;gap:6px;margin-top:16px;text-transform:none;letter-spacing:0">
        <input id="pgEsFrente" type="checkbox" style="width:auto"${esFrente ? ' checked' : ''}> Es frente</label></div>
      <div class="campo"><label>Ingreso — base</label><select id="pgIngresoBase">
        ${opcionesSelect(['pct_venta', 'usd_caja', 'por_definir'], { pct_venta: '% de venta', usd_caja: 'USD por caja', por_definir: 'Por definir' }, ingresoBase)}
      </select></div>
      <div class="campo"><label>Ingreso — valor</label>
        <input id="pgIngresoValor" class="mono" type="number" step="0.01" min="0" value="${p.ingreso_valor != null ? esc(p.ingreso_valor) : ''}" placeholder="10 (%) ó 1.00 ($/caja)"></div>
      <div class="campo"><label>Plein retiene (%)</label>
        <input id="pgRetiene" class="mono" type="number" step="0.01" min="0" max="100" value="${p.plein_retiene_pct != null ? esc(p.plein_retiene_pct) : ''}" placeholder="opcional"></div>
      <div class="campo"><label>Frecuencia — valor</label>
        <input id="pgFrecValor" class="mono" type="number" step="0.01" min="0" value="${p.frecuencia_valor != null ? esc(p.frecuencia_valor) : ''}" placeholder="opcional"></div>
      <div class="campo"><label>Frecuencia — unidad</label><select id="pgFrecUnidad">
        <option value="">—</option>${opcionesSelect(['carga', 'palet', 'contenedor', 'medio_contenedor'], FREC_UNIDAD_LBL, p.frecuencia_unidad || '')}
      </select></div>
      <div class="campo"><label>Cargas equiv./semana</label>
        <input id="pgCargasEqSem" class="mono" type="number" step="0.01" min="0" value="${p.cargas_equiv_sem != null ? esc(p.cargas_equiv_sem) : ''}" placeholder="opcional"></div>
      <div class="campo"><label style="display:flex;align-items:center;gap:6px;margin-top:16px;text-transform:none;letter-spacing:0">
        <input id="pgTodoAno" type="checkbox" style="width:auto"${todoAno ? ' checked' : ''}> Todo el año</label></div>
      <div class="campo ancho" id="pgTemporadaMeses" style="${todoAno ? 'display:none' : ''}">
        <div class="campos" style="grid-template-columns:1fr 1fr">
          <div class="campo"><label>Mes desde</label><select id="pgMesDesde">
            <option value="">—</option>${MESES.map((m, i) => `<option value="${i + 1}"${Number(mesDesde) === i + 1 ? ' selected' : ''}>${m}</option>`).join('')}
          </select></div>
          <div class="campo"><label>Mes hasta</label><select id="pgMesHasta">
            <option value="">—</option>${MESES.map((m, i) => `<option value="${i + 1}"${Number(mesHasta) === i + 1 ? ' selected' : ''}>${m}</option>`).join('')}
          </select></div>
        </div>
      </div>
      <div class="campo"><label>Vía</label><select id="pgVia">${opcionesSelect(['terrestre', 'barco'], VIA_LBL, via)}</select></div>
      <div class="campo"><label>Término con proveedor</label><select id="pgTermino">
        ${opcionesSelect(['pago_contra_cobro', 'trueque', 'credito', 'por_definir'], TERMINO_LBL, termino)}
      </select></div>
      <div class="campo"><label>Pick &amp; pack (%)</label>
        <input id="pgPickPack" class="mono" type="number" step="0.01" min="0" max="100" value="${p.pick_pack_pct != null ? esc(p.pick_pack_pct) : ''}" placeholder="opcional"></div>
      <div class="campo"><label>Estado</label><select id="pgEstado">${opcionesSelect(['activo', 'por_arrancar'], { activo: 'Activo', por_arrancar: 'Por arrancar' }, estadoV)}</select></div>
      ${editar ? `
      <div class="campo ancho"><label style="color:var(--i2);font-weight:600">Datos de proyección</label></div>
      <div class="campo"><label>Venta típica/carga (USD)</label>
        <input id="pgVentaTipica" class="mono" type="number" step="0.01" min="0" value="${p.venta_tipica_carga != null ? esc(p.venta_tipica_carga) : ''}" placeholder="opcional"></div>
      <div class="campo"><label>Cajas típicas/carga</label>
        <input id="pgCajasTipica" class="mono" type="number" step="1" min="0" value="${p.cajas_tipicas_carga != null ? esc(p.cajas_tipicas_carga) : ''}" placeholder="opcional"></div>` : ''}
      <div class="campo ancho"><label>Nota</label><textarea id="pgNota">${esc(p.nota || '')}</textarea></div>
      ${editar ? `<div class="campo ancho"><label>Motivo del cambio <span class="req">*</span></label>
        <input id="pgMotivo" type="text" maxlength="200" placeholder="Queda en bitácora"></div>` : ''}
    `;
  }

  function pintarFormPrograma(modo, p, clientes, proveedores, productosCat) {
    productosCatActual = productosCat || [];
    const titulo = modo === 'crear' ? 'Nuevo programa' : `Editar ${esc(p.etiqueta || p.codigo)}`;
    ERP.abrirPanel(titulo, modo === 'crear' ? 'Se creará con código automático' : 'Solo se guardan los campos que cambies', `
      <div class="form-erp">
        <div class="campos">${camposPrograma(p, modo === 'editar')}</div>
        <div class="acciones">
          <button class="btn-mini" id="pgGuardar">${modo === 'crear' ? 'Crear programa' : 'Guardar cambios'}</button>
          <button class="btn-mini gris" id="pgCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="pgAviso"></div>
      </div>
      <div class="leyenda">Elige cliente y proveedor del catálogo (Directorio Comercial). El producto es texto
      libre: puedes escoger una sugerencia del catálogo o escribir uno nuevo con <b>+ Nuevo</b>.</div>`);

    comboPgCliente = ERP.crearCombo({
      contenedor: document.getElementById('pgCliente'), items: clientes,
      placeholder: 'Busca por nombre o alias…', permitirNuevo: false, valorInicial: p.cliente || null
    });
    comboPgProveedor = ERP.crearCombo({
      contenedor: document.getElementById('pgProveedor'), items: proveedores,
      placeholder: 'Busca por nombre o alias… (opcional)', permitirNuevo: false, valorInicial: p.proveedor || null
    });
    comboPgProducto = ERP.crearCombo({
      contenedor: document.getElementById('pgProducto'), items: productosCat,
      placeholder: 'Busca un producto…', permitirNuevo: true, etiquetaNuevo: 'producto', valorInicial: p.producto || null
    });

    document.getElementById('pgProductosCat').innerHTML = productosCatActual.length
      ? productosCatActual.map(it => `<label style="display:flex;align-items:center;gap:6px;font-size:12.5px">
          <input type="checkbox" value="${esc(it.id)}" style="width:auto"${seleccionadosTiene(p, it.id) ? ' checked' : ''}> ${esc(it.nombre)}</label>`).join('')
      : '<div class="vacio">Catálogo de productos vacío.</div>';

    const chkTodoAno = document.getElementById('pgTodoAno');
    const wrapMeses = document.getElementById('pgTemporadaMeses');
    chkTodoAno.addEventListener('change', () => { wrapMeses.style.display = chkTodoAno.checked ? 'none' : ''; });

    document.getElementById('pgCancelar').addEventListener('click', () => {
      if (modo === 'editar') verPrograma(p.codigo); else ERP.cerrarPanel();
    });
    document.getElementById('pgGuardar').addEventListener('click', () => guardarFormPrograma(modo, p));
  }

  function seleccionadosTiene(p, id) {
    return (p.producto_ids || []).map(String).includes(String(id));
  }

  function recogerFormPrograma() {
    const v = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    const chk = id => { const el = document.getElementById(id); return !!(el && el.checked); };
    const marcados = new Set(Array.from(document.querySelectorAll('#pgProductosCat input[type=checkbox]:checked')).map(el => el.value));
    const productoIds = productosCatActual.filter(it => marcados.has(String(it.id))).map(it => it.id);
    return {
      etiqueta: v('pgEtiqueta'),
      bloque: v('pgBloque'),
      clienteId: comboPgCliente ? comboPgCliente.valorId() : null,
      clienteNombre: comboPgCliente ? comboPgCliente.valor() : null,
      proveedorId: comboPgProveedor ? comboPgProveedor.valorId() : null,
      producto: comboPgProducto ? comboPgProducto.valor() : null,
      productoIds,
      modalidad: v('pgModalidad'),
      esFrente: chk('pgEsFrente'),
      ingresoBase: v('pgIngresoBase'),
      ingresoValor: v('pgIngresoValor'),
      pleinRetienePct: v('pgRetiene'),
      frecuenciaValor: v('pgFrecValor'),
      frecuenciaUnidad: v('pgFrecUnidad'),
      cargasEquivSem: v('pgCargasEqSem'),
      todoAno: chk('pgTodoAno'),
      mesDesde: v('pgMesDesde'),
      mesHasta: v('pgMesHasta'),
      via: v('pgVia'),
      terminoProveedor: v('pgTermino'),
      pickPackPct: v('pgPickPack'),
      estado: v('pgEstado'),
      ventaTipicaCarga: v('pgVentaTipica'),
      cajasTipicasCarga: v('pgCajasTipica'),
      nota: v('pgNota'),
      motivo: v('pgMotivo')
    };
  }

  async function guardarFormPrograma(modo, orig) {
    limpiarAviso('pgAviso');
    const f = recogerFormPrograma();

    const faltan = [];
    if (!f.bloque) faltan.push('bloque');
    if (!f.clienteId) faltan.push('cliente');
    if (!f.producto) faltan.push('producto');
    if (modo === 'editar' && !f.motivo.trim()) faltan.push('motivo del cambio');
    if (faltan.length) {
      const aMedias = [[comboPgCliente, 'cliente'], [comboPgProducto, 'producto']]
        .filter(([c]) => c && !c.valor() && c.textoCrudo()).map(([, n]) => n);
      aviso('pgAviso', 'err', `Falta: ${faltan.join(', ')}.` + (aMedias.length
        ? `<br>Elige ${aMedias.join(' y ')} de la lista, o usa <b>+ Nuevo</b> si no está en el catálogo.`
        : ''));
      return;
    }
    if (f.bloque !== '' && !Number.isInteger(Number(f.bloque))) {
      aviso('pgAviso', 'err', 'El bloque debe ser un número entero.'); return;
    }
    const errTemporada = validarTemporada(f.todoAno, f.mesDesde, f.mesHasta);
    if (errTemporada) { aviso('pgAviso', 'err', errTemporada); return; }
    if (f.cajasTipicasCarga !== '' && !Number.isInteger(Number(f.cajasTipicasCarga))) {
      aviso('pgAviso', 'err', 'Las cajas típicas por carga deben ser un entero.'); return;
    }
    const numsNoNeg = [
      ['Ingreso — valor', f.ingresoValor], ['Plein retiene', f.pleinRetienePct], ['Frecuencia — valor', f.frecuenciaValor],
      ['Cargas equiv./semana', f.cargasEquivSem], ['Pick & pack', f.pickPackPct],
      ['Venta típica/carga', f.ventaTipicaCarga], ['Cajas típicas/carga', f.cajasTipicasCarga]
    ];
    for (const [label, raw] of numsNoNeg) {
      if (raw === '' || raw == null) continue;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) { aviso('pgAviso', 'err', `"${label}" no es válido (debe ser cero o positivo).`); return; }
    }

    const btn = document.getElementById('pgGuardar');
    btn.disabled = true;
    aviso('pgAviso', 'warn', 'Guardando…');
    try {
      if (modo === 'crear') {
        const data = await rpc('fn_crear_programa', armarPayloadCrear(f));
        const r = (data && data[0]) || {};
        if (!r.codigo) throw new Error('El ERP no devolvió el código del programa.');
        ERP.marcarDatosSucios();
        await verPrograma(r.codigo);
        ERP.toast('ok', `Programa <b>${esc(r.etiqueta || r.codigo)}</b> creado (${esc(r.codigo)}).`);
      } else {
        const data = await rpc('fn_editar_programa', armarPayloadEditar(orig, f));
        ERP.marcarDatosSucios();
        ERP.toast('ok', esc(textoRpc(data)));
        await verPrograma(orig.codigo);
      }
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      aviso('pgAviso', 'err', `El ERP rechazó el programa: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function nuevoPrograma() {
    ERP.abrirPanel('Nuevo programa', 'Se creará con código automático', '<div class="skel">Cargando catálogos…</div>');
    let clientes, proveedores, productosCat;
    try {
      [clientes, proveedores, productosCat] = await Promise.all([
        catalogo('v_catalogo_clientes'), catalogo('v_catalogo_proveedores'), catalogo('v_catalogo_productos')
      ]);
    } catch (e) {
      ERP.abrirPanel('Nuevo programa', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }
    pintarFormPrograma('crear', {}, clientes, proveedores, productosCat);
  }

  async function editarPrograma() {
    const p = progEstado.p;
    ERP.abrirPanel(`Editar ${esc(p.etiqueta || p.codigo)}`, '', '<div class="skel">Cargando catálogos…</div>');
    let clientes, proveedores, productosCat;
    try {
      [clientes, proveedores, productosCat] = await Promise.all([
        catalogo('v_catalogo_clientes'), catalogo('v_catalogo_proveedores'), catalogo('v_catalogo_productos')
      ]);
    } catch (e) {
      ERP.abrirPanel(`Editar ${esc(p.etiqueta || p.codigo)}`, '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }
    pintarFormPrograma('editar', p, clientes, proveedores, productosCat);
  }

  /* ================= Ficha de programa (ver + cargas ligadas + ligar/desligar) ================= */

  async function verPrograma(codigo) {
    ERP.abrirPanel(esc(codigo), 'Cargando programa…', '<div class="skel">Cargando…</div>');
    let filaProg, cargasLig;
    try {
      [filaProg, cargasLig] = await Promise.all([
        q('v_programas_comerciales', `&codigo=${ERP.eq(codigo)}`),
        q('v_cargas_programa', `&programa_codigo=${ERP.eq(codigo)}&order=folio.asc`)
      ]);
    } catch (e) {
      ERP.abrirPanel(esc(codigo), '', `<div class="errbox">No se pudo cargar el programa: ${esc(e.message)}</div>`);
      return;
    }
    if (!filaProg.length) { ERP.abrirPanel(esc(codigo), '', '<p style="font-size:13px">No existe ese programa.</p>'); return; }
    progEstado = { codigo, p: filaProg[0], cargas: cargasLig || [] };
    pintarFichaPrograma();
  }

  function pintarFichaPrograma() {
    const p = progEstado.p;
    const titulo = esc(p.etiqueta || p.codigo);
    const sub = `${esc(p.codigo)} · Bloque ${esc(p.bloque ?? '—')} · ${esc(p.cliente || '—')} · ${esc(p.producto || '—')} · ${badgeProgEstado(p.estado)}`;
    ERP.abrirPanel(titulo, sub, cuerpoFichaPrograma());

    const bEd = document.getElementById('pgEditarBtn');
    if (bEd) bEd.addEventListener('click', editarPrograma);
    const bLig = document.getElementById('pgLigarBtn');
    if (bLig) bLig.addEventListener('click', ligarEmbarque);
    document.querySelectorAll('[data-desligar]').forEach(b => b.addEventListener('click', () => confirmarDesligar(b.dataset.desligar)));
    document.querySelectorAll('[data-ir-carga]').forEach(el => el.addEventListener('click', () => ERP.verCarga(el.dataset.irCarga)));
  }

  function cuerpoFichaPrograma() {
    const p = progEstado.p;
    const puedeEd = ERP.puede('editar'), puedeCap = ERP.puede('capturar');
    const frec = (p.frecuencia_valor != null && p.frecuencia_unidad)
      ? `${esc(p.frecuencia_valor)}/${esc(FREC_UNIDAD_LBL[p.frecuencia_unidad] || p.frecuencia_unidad)}` : '—';

    const detalle = `<div class="det-grid">
      <div class="det"><div class="l">Código</div><div class="v mono">${esc(p.codigo)}</div></div>
      <div class="det"><div class="l">Bloque</div><div class="v mono">${esc(p.bloque ?? '—')}</div></div>
      <div class="det"><div class="l">Cliente</div><div class="v">${esc(p.cliente || '—')}</div></div>
      <div class="det"><div class="l">Proveedor</div><div class="v">${esc(p.proveedor || '—')}</div></div>
      <div class="det"><div class="l">Producto</div><div class="v">${esc(p.producto || '—')}</div></div>
      <div class="det"><div class="l">Modalidad</div><div class="v">${esc(MODALIDAD_LBL[p.modalidad] || p.modalidad || '—')}</div></div>
      <div class="det"><div class="l">Es frente</div><div class="v">${p.es_frente === false ? 'No' : 'Sí'}</div></div>
      <div class="det"><div class="l">Ingreso</div><div class="v">${textoIngreso(p)}</div></div>
      <div class="det"><div class="l">Frecuencia</div><div class="v mono">${frec}</div></div>
      <div class="det"><div class="l">Cargas eq./sem</div><div class="v mono">${p.cargas_equiv_sem == null ? '—' : fmt(p.cargas_equiv_sem)}</div></div>
      <div class="det"><div class="l">Temporada</div><div class="v mono">${esc(textoTemporada(p))}</div></div>
      <div class="det"><div class="l">Vía</div><div class="v">${esc(VIA_LBL[p.via] || p.via || '—')}</div></div>
      <div class="det"><div class="l">Término proveedor</div><div class="v">${esc(TERMINO_LBL[p.termino_proveedor] || p.termino_proveedor || '—')}</div></div>
      <div class="det"><div class="l">Pick &amp; pack</div><div class="v mono">${p.pick_pack_pct == null ? '—' : pctTxt(p.pick_pack_pct)}</div></div>
      <div class="det"><div class="l">Estado</div><div class="v">${badgeProgEstado(p.estado)}</div></div>
      <div class="det"><div class="l">Venta típica/carga</div><div class="v mono">${p.venta_tipica_carga == null ? '—' : usd(p.venta_tipica_carga)}</div></div>
      <div class="det"><div class="l">Cajas típicas/carga</div><div class="v mono">${p.cajas_tipicas_carga == null ? '—' : fmt0(p.cajas_tipicas_carga)}</div></div>
      ${p.nota ? `<div class="det ancho"><div class="l">Nota</div><div class="v">${esc(p.nota)}</div></div>` : ''}
    </div>`;

    const cargasHtml = !progEstado.cargas.length
      ? '<div class="vacio">Sin embarques ligados a este programa.</div>'
      : `<div class="tabla-wrap"><table><thead><tr><th>Folio</th><th>P.O.</th><th>id_v7</th>${puedeCap ? '<th></th>' : ''}</tr></thead>
        <tbody>${progEstado.cargas.map(c => `<tr>
          <td class="mono"><span class="enlace" data-ir-carga="${esc(c.folio)}">${esc(c.folio)}</span></td>
          <td>${esc(c.po || '—')}</td>
          <td class="mono">${esc(c.id_v7 || '—')}</td>
          ${puedeCap ? `<td><button class="btn-mini gris" data-desligar="${esc(c.folio)}">Desligar</button></td>` : ''}
        </tr>`).join('')}</tbody></table></div>`;

    const ligarHtml = puedeCap ? `<div class="form-erp" style="margin-top:10px"><div class="campos">
        <div class="campo"><label>Folio a ligar</label><input id="pgLigarFolio" type="text" placeholder="ej. 43 o P-043"></div>
        <div class="campo"><label>Nota (opcional)</label><input id="pgLigarNota" type="text" maxlength="200"></div>
      </div>
      <div class="acciones"><button class="btn-mini" id="pgLigarBtn">Ligar embarque</button></div>
      <div class="aviso" id="pgLigarAviso"></div></div>` : '';

    return `
      <div class="exp-acciones">${puedeEd ? '<button class="btn-mini" id="pgEditarBtn">Editar programa</button>' : ''}</div>
      ${detalle}
      <div class="seccion-head"><h4>Embarques ligados</h4></div>
      ${cargasHtml}
      ${ligarHtml}`;
  }

  async function ligarEmbarque() {
    const folioRaw = document.getElementById('pgLigarFolio').value.trim();
    const nota = document.getElementById('pgLigarNota').value.trim();
    if (!folioRaw) { aviso('pgLigarAviso', 'err', 'Escribe el folio a ligar.'); return; }
    const folio = ERP.folioNormalizado(folioRaw);
    const btn = document.getElementById('pgLigarBtn');
    btn.disabled = true;
    aviso('pgLigarAviso', 'warn', 'Ligando…');
    try {
      const data = await rpc('fn_ligar_carga_programa', { p_folio: folio, p_codigo: progEstado.codigo, p_nota: nota || null });
      ERP.marcarDatosSucios();
      ERP.toast('ok', esc(textoRpc(data)));
      await verPrograma(progEstado.codigo);
    } catch (e) {
      if (!ERP.avisarSiPermiso(e)) aviso('pgLigarAviso', 'err', `El ERP rechazó la liga: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  function confirmarDesligar(folio) {
    const { ov, cerrar, setA } = abrirModal(`Desligar ${esc(folio)}`, `
      <div class="form-erp"><div class="campos">
        <div class="campo ancho"><label>Nota (opcional)</label><input id="pgDesNota" type="text" maxlength="200"></div>
      </div><div class="acciones"><button class="btn-mini peligro" id="pgDesGuardar">Desligar</button><button class="btn-mini gris" id="pgDesCancelar">Cancelar</button></div></div>`);
    ov.querySelector('#pgDesCancelar').addEventListener('click', cerrar);
    ov.querySelector('#pgDesGuardar').addEventListener('click', async () => {
      const nota = ov.querySelector('#pgDesNota').value.trim();
      const btn = ov.querySelector('#pgDesGuardar');
      btn.disabled = true;
      setA('warn', 'Desligando…');
      try {
        const data = await rpc('fn_ligar_carga_programa', { p_folio: folio, p_codigo: null, p_nota: nota || null });
        ERP.marcarDatosSucios();
        ERP.toast('ok', esc(textoRpc(data)));
        cerrar();
        await verPrograma(progEstado.codigo);
      } catch (e) {
        if (!ERP.avisarSiPermiso(e)) setA('err', `El ERP rechazó desligar: ${esc(e.message)}`);
        btn.disabled = false;
      }
    });
  }

  /* ================= Render principal ================= */

  async function render(cont, parametro) {
    let comerciales, proyeccion, cargasProg;
    try {
      [comerciales, proyeccion, cargasProg] = await Promise.all([
        q('v_programas_comerciales', '&order=codigo.asc'),
        q('v_programas_proyeccion', '&order=mes.asc'),
        q('v_programa_cargas', '&order=codigo.asc')
      ]);
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los programas: ${esc(e.message)}</div>`;
      return;
    }

    programas = comerciales;
    proyeccionRows = proyeccion;
    filtroBloque = 'todos';
    mesSeleccionadoProy = null;

    cont.innerHTML = `<div class="pantalla-programas">
      <div class="exp-acciones">
        <h2 class="sec" style="margin:0">Programas comerciales</h2>
        ${ERP.puede('capturar') ? '<button class="btn-mini" id="btnNuevoPrograma">+ Programa</button>' : ''}
      </div>
      ${ERP.botonesExportar ? ERP.botonesExportar('Programas', 'Programas Comerciales', '#tblProgramas') : ''}
      <div class="card" id="progListaCont"></div>

      <h2 class="sec">Proyección anual</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('ProgramasProyeccion', 'Proyección Anual de Programas', '#tblProyeccion') : ''}
      <div class="card" id="progProyCont"></div>

      <h2 class="sec">Real por programa</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('ProgramaCargas', 'Real por Programa', '#tblProgramaCargas') : ''}
      <div class="card">${pintarRealPrograma(cargasProg)}</div>
    </div>`;

    repintarLista(cont);
    repintarProyeccion(cont);

    const bNuevo = document.getElementById('btnNuevoPrograma');
    if (bNuevo) bNuevo.addEventListener('click', nuevoPrograma);

    if (ERP.cablearExportar) ERP.cablearExportar(cont);
    if (parametro) verPrograma(parametro);   // abrir ficha directo (ej. desde el chip de Embarques/Expediente)
  }

  ERP.verPrograma = verPrograma;
  ERP.registrar('programas', {
    titulo: 'Programas',
    descripcion: 'Acuerdos comerciales recurrentes — proyección y realidad de cargas',
    render
  });
})();
