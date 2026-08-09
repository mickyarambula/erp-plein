/* Módulo "Liquidaciones al productor" (ruta 'liquidaciones', backend E51) — account of sales que
   PACA exige: bruto de venta − comisión − deducciones = neto al productor; menos anticipos = saldo.
   Espejo del módulo Facturación (mismo flujo borrador→emitida→anulada, misma serie al emitir).
   Solo CONSUME vistas + RPCs, nunca tablas.
   Vistas: v_liquidaciones, v_liquidacion_deducciones, v_liquidacion_ventas.
   RPCs: fn_crear_liquidacion (capturar) · fn_emitir_liquidacion (editar) · fn_anular_liquidacion (administrar)
     · fn_crear_liquidacion_auto(p_productor_id, p_cargas text[], p_comision_pct numeric DEFAULT 10, p_nota)
       (capturar) [E76/E77] — solo consignación ya LIQUIDADA (ingreso_venta>0) del productor; el
       desglose (bruto/deducciones) lo calcula el backend a partir de v_carga_detalle, reusando el
       mismo motor PACA de v_liquidaciones/v_liquidacion_ventas. p_comision_pct se OMITE del payload
       si el usuario lo deja vacío (para que aplique el DEFAULT 10 real de la función, no un null
       explícito que lo pisaría).
   Expone: ERP.verLiquidacion, ERP.nuevaLiquidacionAuto. */

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

  // Estados espejo de Facturación: borrador | emitida | anulada.
  const ESTADO_PILL = { borrador: 'ambar', emitida: 'verde', anulada: 'gris' };

  // Categorías de deducción. El selector de "+ Agregar deducción" ahora lee el catálogo en vivo
  // (v_categorias_deduccion, Fase 2a/D-134) — ver verLiquidacion()/cuerpoFicha(). CAT_LABEL queda
  // SOLO como respaldo de despliegue para categorías históricas/código no encontrado en el
  // catálogo (p.ej. datos viejos con un código que ya no está activo). En el PDF se agrupan:
  // CUSTOMS y DUTIES en secciones propias; TODO lo demás (incluidos valores futuros/nuevas
  // categorías del catálogo) cae en DEDUCTIONS — así el total nunca se pierde por una categoría
  // no listada aquí.
  const CAT_LABEL = { general: 'General', material: 'Material', flete: 'Flete', in_out: 'In & Out', customs: 'Customs', duties: 'Duties', otro: 'Otro' };
  const catLabel = c => CAT_LABEL[String(c || '').toLowerCase()] || (c || 'General');
  const estadoLabel = e => ({ borrador: 'Borrador', emitida: 'Emitida', anulada: 'Anulada' }[e] || e || 'Borrador');
  const pillEstado = e => `<span class="pill ${ESTADO_PILL[e] || 'gris'}">${esc(estadoLabel(e))}</span>`;

  // Descuadre: centinela de integridad de la liquidación. Con |descuadre| >= 1 centavo NO se puede
  // emitir (el backend igual lo rechaza, pero el usuario lo ve antes en rojo).
  const DESC_EPS = 0.005;
  const hayDescuadre = l => Math.abs(num(l.descuadre)) >= DESC_EPS;

  /* saldo_a_pagar: positivo = Plein le debe al productor (lo normal a pagar). Negativo = el productor
     le debe a Plein (anticipos/deducciones exceden el neto) — NO es un error, es un dato: se pinta
     distinto (azul) con nota aclaratoria, nunca en rojo de error. */
  function saldoHtml(v) {
    const n = num(v);
    if (n < -0.009) return `<span style="color:#2A6098;font-weight:600">${usd(n)}</span> <span style="font-size:10.5px;color:var(--gris)">(el productor debe a Plein)</span>`;
    return `<b>${usd(n)}</b>`;
  }

  // Los embarques pueden venir como arreglo de folios o como texto ya unido; se muestra igual.
  const embarquesTxt = e => Array.isArray(e) ? e.join(', ') : (e == null || e === '' ? '—' : String(e));

  /* Desempaqueta el retorno de una RPC sin asumir su forma: escalar, arreglo de filas u objeto.
     fn_crear_liquidacion devuelve id (escalar), fn_emitir devuelve numero (escalar). */
  function unwrap(data, key) {
    if (data == null) return null;
    if (Array.isArray(data)) { const r = data[0]; if (r == null) return null; return (typeof r === 'object') ? (r[key] ?? Object.values(r)[0]) : r; }
    if (typeof data === 'object') return data[key] ?? Object.values(data)[0];
    return data;
  }

  /* ================= Lista ================= */

  let liquidaciones = [];
  let pendientesActuales = [];   // v_liquidaciones_pendientes del último render, para el botón de cada card
  let fEstado = '';
  let fTexto = '';

  function filtradas() {
    const t = ERP.norm(fTexto);
    return liquidaciones.filter(l => {
      if (fEstado && l.estado !== fEstado) return false;
      if (!t) return true;
      return [l.numero, l.productor].some(v => ERP.norm(v).includes(t));
    });
  }

  function pintarTabla() {
    const cont = document.getElementById('liqTabla');
    const conteo = document.getElementById('liqConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${liquidaciones.length} liquidaciones`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ninguna liquidación coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblLiquidaciones">
      <thead><tr><th>Número</th><th>Productor</th><th>Fecha</th><th>Estado</th>
        <th class="num">Bruto</th><th class="num">Neto productor</th><th class="num">Saldo a pagar</th>
        <th class="num">Descuadre</th><th class="num">Emb.</th></tr></thead>
      <tbody>${rows.map(l => {
        const desc = hayDescuadre(l);
        return `<tr class="clic" data-id="${esc(l.id)}">
          <td class="mono"><span class="enlace">${l.numero ? esc(l.numero) : '— borrador'}</span></td>
          <td>${esc(l.productor || '—')}</td>
          <td class="mono">${esc(fecha4(l.f_liquidacion))}</td>
          <td>${pillEstado(l.estado)}</td>
          <td class="num">${usd(l.bruto_venta)}</td>
          <td class="num">${usd(l.neto_productor)}</td>
          <td class="num">${saldoHtml(l.saldo_a_pagar)}</td>
          <td class="num ${desc ? 'neg' : ''}"${desc ? ' style="font-weight:700"' : ''}>${usd(l.descuadre)}</td>
          <td class="num">${esc(l.n_embarques ?? 0)}</td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('tr.clic[data-id]').forEach(tr =>
      tr.addEventListener('click', () => verLiquidacion(tr.dataset.id)));
  }

  /** "Listas para liquidar" (v_liquidaciones_pendientes, agrupada por productor): card por
      productor con acento de color por severidad y botón que dispara la liquidación automática
      YA existente, precargando productor + folios. Sin filas -> sin sección (nada de "no hay
      pendientes" ruidoso). */
  function pintarPanelPendientes(filas) {
    pendientesActuales = filas || [];
    if (!pendientesActuales.length) return '';
    const cards = pendientesActuales.map((p, i) => {
      const sev = p.severidad === 'rojo' ? 'rojo' : 'ambar';
      const etiquetaSev = sev === 'rojo' ? 'Urgente' : 'Pendiente';
      return `<div class="card" style="border-left:4px solid var(--${sev});padding:12px 14px;min-width:230px;flex:1 1 230px">
        <div style="font-weight:700;margin-bottom:2px">${esc(p.productor || '—')}</div>
        <div style="font-size:12.5px;color:var(--gris)">${esc(p.n_cargas ?? 0)} carga${p.n_cargas === 1 ? '' : 's'} · ${usd(p.bruto_total)} · hace ${esc(p.dias_max ?? 0)} día${p.dias_max === 1 ? '' : 's'}</div>
        <div class="mono" style="font-size:11.5px;color:var(--gris);margin:4px 0">${esc(p.folios || '—')}</div>
        <span class="pill ${sev}">${etiquetaSev}</span>
        <div style="margin-top:8px"><button class="btn-mini" data-liq-pend-idx="${i}">Liquidación automática</button></div>
      </div>`;
    }).join('');
    return `<div class="seccion-head"><h4>Listas para liquidar</h4></div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px">${cards}</div>`;
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    let liqs;
    try {
      liqs = await q('v_liquidaciones', '&order=id.desc');
    } catch (e) {
      cont.innerHTML = `<div class="pantalla-liquidaciones"><div class="errbox">No se pudieron leer las liquidaciones: ${esc(e.message)}</div></div>`;
      return;
    }
    liquidaciones = liqs;
    fEstado = ''; fTexto = '';

    // Enriquecimiento, no núcleo: si v_liquidaciones_pendientes falla, se degrada a "sin panel"
    // en vez de tumbar la lista de liquidaciones.
    const pendientes = await q('v_liquidaciones_pendientes').catch(() => []);

    cont.innerHTML = `<div class="pantalla-liquidaciones">
      ${pintarPanelPendientes(pendientes)}
      <div class="filtros">
        ${puedeCap ? '<button class="btn-mini" id="liqNueva">+ Nueva liquidación</button>' : ''}
        ${puedeCap ? '<button class="btn-mini gris" id="liqNuevaAuto">Liquidación automática</button>' : ''}
        <select class="busca" id="liqFEstado" style="max-width:180px">
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="emitida">Emitida</option>
          <option value="anulada">Anulada</option>
        </select>
        <input class="busca" id="liqFTexto" type="text" placeholder="Buscar por número o productor…">
        <span class="conteo" id="liqConteo"></span>
      </div>
      ${ERP.botonesExportar ? ERP.botonesExportar('Liquidaciones', 'Liquidaciones al productor', '#tblLiquidaciones') : ''}
      <div class="card" style="padding:14px"><div id="liqTabla"></div></div>
      <div class="leyenda">Toca una liquidación para abrir su ficha (ver desglose, emitir, imprimir).
        El <b>número</b> (LQ-AAAA-NNNN) lo asigna la serie al emitir. La columna <b>Descuadre</b>
        debe ser $0.00: si no, la liquidación no cuadra y no se puede emitir. Un <b>saldo a pagar
        negativo</b> significa que el productor le debe a Plein (no es error).</div>
    </div>`;

    const btnN = document.getElementById('liqNueva');
    if (btnN) btnN.addEventListener('click', () => nuevaLiquidacion());
    const btnNAuto = document.getElementById('liqNuevaAuto');
    if (btnNAuto) btnNAuto.addEventListener('click', () => nuevaLiquidacionAuto());
    document.getElementById('liqFEstado').addEventListener('change', e => { fEstado = e.target.value; pintarTabla(); });
    let tempo;
    document.getElementById('liqFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });
    cont.querySelectorAll('[data-liq-pend-idx]').forEach(b => b.addEventListener('click', () => {
      const p = pendientesActuales[Number(b.dataset.liqPendIdx)];
      if (!p) return;
      const folios = String(p.folios || '').split(',').map(s => s.trim()).filter(Boolean);
      nuevaLiquidacionAuto({ productorId: p.productor_id, productorNombre: p.productor, folios });
    }));

    pintarTabla();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
  }

  /* ================= Nueva liquidación ================= */

  let comboProductor = null;
  let cargasTodas = [];   // v_carga_detalle completa; se filtra por proveedor_id al elegir productor

  // Embarques vivos del productor elegido (proveedor_id de la carga == id de la contraparte).
  function cargasDelProductor(productorId) {
    if (productorId == null) return [];
    return cargasTodas.filter(c => !c.anulado && String(c.proveedor_id) === String(productorId));
  }

  function pintarCargasCheck(productorId) {
    const cont = document.getElementById('liqCargas');
    if (!cont) return;
    const cargas = cargasDelProductor(productorId);
    if (productorId == null) { cont.innerHTML = '<div class="vacio" style="padding:8px">Elige un productor para ver sus embarques.</div>'; return; }
    if (!cargas.length) { cont.innerHTML = '<div class="vacio" style="padding:8px">Este productor no tiene embarques vivos.</div>'; return; }
    cont.innerHTML = cargas.map(c => `<label style="display:flex;align-items:center;gap:6px;font-size:12.5px">
      <input type="checkbox" value="${esc(c.folio)}" style="width:auto">
      <span class="mono">${esc(c.folio)}</span> · ${esc(c.producto || '—')} · <span class="mono">${esc(fecha4(c.f_embarque))}</span></label>`).join('');
  }

  async function nuevaLiquidacion() {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Nueva liquidación', 'Elige el productor y sus embarques', '<div class="skel">Cargando catálogos…</div>');
    let productores;
    try {
      [productores, cargasTodas] = await Promise.all([
        q('v_catalogo_proveedores', '&order=nombre.asc'),
        q('v_carga_detalle')
      ]);
    } catch (e) {
      ERP.abrirPanel('Nueva liquidación', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Nueva liquidación', 'Elige el productor y sus embarques', `
      <div class="form-erp"><div class="campos">
        <div class="campo"><label>Productor <span class="req">*</span></label><div id="liqProductor"></div>
          <small style="color:var(--gris);font-size:11px">Es un proveedor con embarques en consignación. Si no aparece, dalo de alta en Directorio Comercial.</small></div>
        <div class="campo"><label>Bruto de venta USD <span class="req">*</span></label>
          <input id="liqBruto" class="mono" type="number" step="0.01" min="0" placeholder="0.00"></div>
        <div class="campo ancho"><label>Embarques a liquidar <span class="req">*</span></label>
          <div class="chk-lista" id="liqCargas"></div></div>
        <div class="campo"><label>Comisión (%)</label>
          <input id="liqComision" class="mono" type="number" step="0.01" min="0" max="100" placeholder="del programa si lo dejas vacío"></div>
        <div class="campo ancho"><label>Nota</label>
          <input id="liqNota" type="text" maxlength="200" placeholder="Opcional — referencia de la liquidación"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="liqGuardar">Crear liquidación (borrador)</button>
        <button class="btn-mini gris" id="liqCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="liqAviso"></div>
      </div>
      <div class="leyenda">Se crea en <b>borrador</b>: el sistema precarga las deducciones desde los
      costos de cada embarque y toma la comisión del programa comercial si no la capturas. Revisa el
      desglose y el descuadre antes de emitir.</div>`);

    comboProductor = ERP.crearCombo({
      contenedor: document.getElementById('liqProductor'), items: productores,
      placeholder: 'Busca por nombre o alias…', permitirNuevo: false,
      alCambiar: sel => pintarCargasCheck(sel ? sel.id : null)
    });
    pintarCargasCheck(null);

    document.getElementById('liqCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('liqGuardar').addEventListener('click', guardarNueva);
  }

  async function guardarNueva() {
    const aviso = (tipo, html) => { const a = document.getElementById('liqAviso'); a.className = 'aviso visible ' + tipo; a.innerHTML = html; };
    const productorId = comboProductor ? comboProductor.valorId() : null;
    const brutoRaw = document.getElementById('liqBruto').value.trim();
    const comisionRaw = document.getElementById('liqComision').value.trim();
    const nota = document.getElementById('liqNota').value.trim();
    const folios = Array.from(document.querySelectorAll('#liqCargas input[type=checkbox]:checked')).map(el => el.value);

    if (productorId == null) { aviso('err', 'Elige un productor de la lista.'); return; }
    if (!folios.length) { aviso('err', 'Marca al menos un embarque a liquidar.'); return; }
    if (brutoRaw === '') { aviso('err', 'Captura el bruto de venta.'); return; }
    const bruto = Number(brutoRaw);
    if (Number.isNaN(bruto) || bruto < 0) { aviso('err', 'El bruto de venta no es válido (debe ser cero o positivo).'); return; }
    let comisionPct = null;
    if (comisionRaw !== '') {
      comisionPct = Number(comisionRaw);
      if (Number.isNaN(comisionPct) || comisionPct < 0) { aviso('err', 'La comisión (%) no es válida.'); return; }
    }

    const btn = document.getElementById('liqGuardar');
    btn.disabled = true;
    aviso('warn', 'Creando liquidación…');
    try {
      const data = await rpc('fn_crear_liquidacion', {
        p_productor_id: productorId, p_cargas: folios, p_bruto: bruto,
        p_comision_pct: comisionPct, p_nota: nota || null
      });
      const nuevoId = unwrap(data, 'id');
      if (nuevoId == null) throw new Error('El ERP no devolvió el id de la liquidación.');
      ERP.marcarDatosSucios();
      await verLiquidacion(nuevoId);
      ERP.toast('ok', 'Liquidación creada en borrador. Revisa el desglose y el descuadre.');
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      aviso('err', `El ERP rechazó la liquidación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Liquidación automática (E76/E77) =================
     Igual que "Nueva liquidación" pero: (a) solo ofrece embarques de consignación YA liquidada
     (modalidad='consignacion' && ingreso_venta>0) — el bruto NO se captura a mano, lo calcula el
     backend; (b) la comisión tiene default 10 en el propio backend. */

  let comboProductorAuto = null;
  let cargasAutoTodas = [];

  function cargasAutoDelProductor(productorId) {
    if (productorId == null) return [];
    return cargasAutoTodas.filter(c => !c.anulado && c.modalidad === 'consignacion'
      && String(c.proveedor_id) === String(productorId) && num(c.ingreso_venta) > 0);
  }

  function pintarCargasAutoCheck(productorId) {
    const cont = document.getElementById('liqAutoCargas');
    if (!cont) return;
    if (productorId == null) { cont.innerHTML = '<div class="vacio" style="padding:8px">Elige un productor para ver sus embarques liquidables.</div>'; return; }
    const cargas = cargasAutoDelProductor(productorId);
    if (!cargas.length) { cont.innerHTML = '<div class="vacio" style="padding:8px">Este productor no tiene consignación liquidada (con venta ya capturada) todavía.</div>'; return; }
    cont.innerHTML = cargas.map(c => `<label style="display:flex;align-items:center;gap:6px;font-size:12.5px">
      <input type="checkbox" value="${esc(c.folio)}" style="width:auto">
      <span class="mono">${esc(c.folio)}</span> · ${esc(c.po || '—')} · ${esc(c.cliente || '—')} · ${usd(c.ingreso_venta)}</label>`).join('');
  }

  /** preseleccion opcional (desde el panel "Listas para liquidar"): { productorId, productorNombre,
      folios[] } — precarga el combo de productor (dispara alCambiar -> pinta sus embarques) y
      marca los checkboxes de esos folios. Sin preseleccion se comporta exactamente igual que antes. */
  async function nuevaLiquidacionAuto(preseleccion) {
    if (!ERP.puede('capturar')) return;
    ERP.abrirPanel('Liquidación automática', 'Elige el productor y sus embarques de consignación liquidada',
      '<div class="skel">Cargando catálogos…</div>');
    let productores;
    try {
      [productores, cargasAutoTodas] = await Promise.all([
        q('v_catalogo_proveedores', '&order=nombre.asc'),
        q('v_carga_detalle')
      ]);
    } catch (e) {
      ERP.abrirPanel('Liquidación automática', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Liquidación automática', 'Elige el productor y sus embarques de consignación liquidada', `
      <div class="form-erp"><div class="campos">
        <div class="campo"><label>Productor <span class="req">*</span></label><div id="liqAutoProductor"></div>
          <small style="color:var(--gris);font-size:11px">Solo consignación ya liquidada (con venta capturada). Si no aparece, dalo de alta en Directorio Comercial.</small></div>
        <div class="campo ancho"><label>Embarques a liquidar <span class="req">*</span></label>
          <div class="chk-lista" id="liqAutoCargas"></div></div>
        <div class="campo"><label>Comisión (%)</label>
          <input id="liqAutoComision" class="mono" type="number" step="0.01" min="0" max="100" placeholder="10 (default del ERP)"></div>
        <div class="campo ancho"><label>Nota</label>
          <input id="liqAutoNota" type="text" maxlength="200" placeholder="Opcional — referencia de la liquidación"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="liqAutoGuardar">Crear liquidación automática (borrador)</button>
        <button class="btn-mini gris" id="liqAutoCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="liqAutoAviso"></div>
      </div>
      <div class="leyenda">El bruto de venta y el desglose de deducciones se calculan solos a partir
      de la venta ya reportada de cada embarque de consignación. Revisa el desglose y el descuadre
      antes de emitir.</div>`);

    comboProductorAuto = ERP.crearCombo({
      contenedor: document.getElementById('liqAutoProductor'), items: productores,
      placeholder: 'Busca por nombre o alias…', permitirNuevo: false,
      alCambiar: sel => pintarCargasAutoCheck(sel ? sel.id : null)
    });

    if (preseleccion && preseleccion.productorId != null) {
      // seleccionar() dispara alCambiar de forma síncrona (pintarCargasAutoCheck ya deja los
      // checkboxes en el DOM antes de continuar) — por eso se puede marcar folios justo después.
      comboProductorAuto.seleccionar({ id: preseleccion.productorId, nombre: preseleccion.productorNombre || '' });
      if (preseleccion.folios && preseleccion.folios.length) {
        const folioSet = new Set(preseleccion.folios);
        document.querySelectorAll('#liqAutoCargas input[type=checkbox]').forEach(chk => {
          if (folioSet.has(chk.value)) chk.checked = true;
        });
      }
    } else {
      pintarCargasAutoCheck(null);
    }

    document.getElementById('liqAutoCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('liqAutoGuardar').addEventListener('click', guardarNuevaAuto);
  }

  async function guardarNuevaAuto() {
    const aviso = (tipo, html) => { const a = document.getElementById('liqAutoAviso'); a.className = 'aviso visible ' + tipo; a.innerHTML = html; };
    const productorId = comboProductorAuto ? comboProductorAuto.valorId() : null;
    const comisionRaw = document.getElementById('liqAutoComision').value.trim();
    const nota = document.getElementById('liqAutoNota').value.trim();
    const folios = Array.from(document.querySelectorAll('#liqAutoCargas input[type=checkbox]:checked')).map(el => el.value);

    if (productorId == null) { aviso('err', 'Elige un productor de la lista.'); return; }
    if (!folios.length) { aviso('err', 'Marca al menos un embarque a liquidar.'); return; }
    let comisionPct = null;
    if (comisionRaw !== '') {
      comisionPct = Number(comisionRaw);
      if (Number.isNaN(comisionPct) || comisionPct < 0) { aviso('err', 'La comisión (%) no es válida.'); return; }
    }

    // p_comision_pct se OMITE del payload si el usuario no la capturó, para que aplique el DEFAULT
    // 10 real de la función — mandar null explícito lo pisaría con NULL, no con el default.
    const args = { p_productor_id: productorId, p_cargas: folios, p_nota: nota || null };
    if (comisionPct != null) args.p_comision_pct = comisionPct;

    const btn = document.getElementById('liqAutoGuardar');
    btn.disabled = true;
    aviso('warn', 'Creando liquidación automática…');
    try {
      const data = await rpc('fn_crear_liquidacion_auto', args);
      const nuevoId = unwrap(data, 'id');
      if (nuevoId == null) throw new Error('El ERP no devolvió el id de la liquidación.');
      ERP.marcarDatosSucios();
      await verLiquidacion(nuevoId);
      ERP.toast('ok', 'Liquidación automática creada en borrador. Revisa el desglose y el descuadre.');
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      aviso('err', `El ERP rechazó la liquidación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha ================= */

  let liqActual = null;

  async function verLiquidacion(id) {
    ERP.abrirPanel('Liquidación', 'Cargando…', '<div class="skel">Cargando liquidación…</div>');
    let l, ventas, deducciones, categoriasDed;
    try {
      [l, ventas, deducciones, categoriasDed] = await Promise.all([
        q('v_liquidaciones', `&id=eq.${encodeURIComponent(id)}`).then(r => r && r[0]),
        q('v_liquidacion_ventas', `&liquidacion_id=eq.${encodeURIComponent(id)}&order=orden.asc`),
        q('v_liquidacion_deducciones', `&liquidacion_id=eq.${encodeURIComponent(id)}&order=orden.asc`),
        // Fase 2a (D-134): catálogo en vivo (solo activas) para el selector de "+ Agregar
        // deducción" — si falla, el form degrada a un único 'General' en vez de quedar sin opciones.
        q('v_categorias_deduccion', '&order=orden.asc').catch(() => [])
      ]);
      if (!l) throw new Error('La liquidación no existe.');
    } catch (e) {
      ERP.abrirPanel('Liquidación', '', `<div class="errbox">No se pudo cargar la liquidación: ${esc(e.message)}</div>`);
      return;
    }
    liqActual = l;

    ERP.abrirPanel(
      `Liquidación ${l.numero ? esc(l.numero) : '(borrador)'}`,
      `${esc(l.productor || '—')} · ${pillEstado(l.estado)}`,
      cuerpoFicha(l, ventas || [], deducciones || [], categoriasDed || [])
    );

    const bImp = document.getElementById('liqImprimir');
    if (bImp) bImp.addEventListener('click', () => imprimir(l.id));
    const bEmitir = document.getElementById('liqEmitir');
    if (bEmitir) bEmitir.addEventListener('click', emitir);
    const bAnular = document.getElementById('liqAnular');
    if (bAnular) bAnular.addEventListener('click', anular);

    // Edición de deducciones (solo se pintan en borrador editable): agregar + quitar por fila.
    const bAddDed = document.getElementById('dedAgregar');
    if (bAddDed) bAddDed.addEventListener('click', () => agregarDeduccion(l.id));
    document.querySelectorAll('[data-quitar-ded]').forEach(b =>
      b.addEventListener('click', () => quitarDeduccion(b.dataset.quitarDed, l.id)));

    // Edición de líneas de venta (Gross Sales) — mismo criterio: solo en borrador editable.
    const bAddVta = document.getElementById('vtaAgregar');
    if (bAddVta) bAddVta.addEventListener('click', () => agregarVenta(l.id));
    document.querySelectorAll('[data-quitar-vta]').forEach(b =>
      b.addEventListener('click', () => quitarVenta(b.dataset.quitarVta, l.id)));
  }

  const avisoDed = (tipo, html) => { const a = document.getElementById('dedAviso'); if (a) { a.className = 'aviso visible ' + tipo; a.innerHTML = html; } };

  async function agregarDeduccion(liqId) {
    const concepto = (document.getElementById('dedConcepto').value || '').trim();
    const montoRaw = (document.getElementById('dedMonto').value || '').trim();
    const nota = (document.getElementById('dedNota').value || '').trim();
    const categoria = document.getElementById('dedCategoria').value || 'general';

    if (!concepto) { avisoDed('err', 'El concepto es obligatorio.'); return; }
    if (montoRaw === '') { avisoDed('err', 'Captura el monto de la deducción.'); return; }
    const monto = Number(montoRaw);
    if (Number.isNaN(monto) || monto <= 0) { avisoDed('err', 'El monto debe ser mayor a cero.'); return; }

    const btn = document.getElementById('dedAgregar');
    btn.disabled = true;
    avisoDed('warn', 'Agregando…');
    try {
      await rpc('fn_agregar_deduccion_liquidacion', {
        p_liquidacion_id: liqId, p_concepto: concepto, p_monto: monto, p_nota: nota || null, p_categoria: categoria
      });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Deducción "${esc(concepto)}" por ${usd(monto)} agregada.`);
      await verLiquidacion(liqId);   // neto/deducciones/descuadre llegan ya recalculados
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoDed('err', `El ERP rechazó la deducción: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function quitarDeduccion(dedId, liqId) {
    if (!window.confirm('¿Quitar esta deducción? El neto y el descuadre se recalculan.')) return;
    try {
      await rpc('fn_quitar_deduccion_liquidacion', { p_deduccion_id: Number(dedId) });
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Deducción quitada.');
      await verLiquidacion(liqId);
    } catch (e) {
      if (!ERP.avisarSiPermiso(e)) ERP.toast('err', `No se pudo quitar la deducción: ${esc(e.message)}`);
    }
  }

  const avisoVta = (tipo, html) => { const a = document.getElementById('vtaAviso'); if (a) { a.className = 'aviso visible ' + tipo; a.innerHTML = html; } };
  const numOpc = raw => { const s = (raw || '').trim(); if (s === '') return null; const n = Number(s); return (Number.isNaN(n) || n < 0) ? NaN : n; };

  async function agregarVenta(liqId) {
    const producto = (document.getElementById('vtaProducto').value || '').trim();
    const montoRaw = (document.getElementById('vtaMonto').value || '').trim();
    // Opcionales: lote (texto), unidades y precio_unit (numéricos ≥ 0 o vacío → null).
    const lote = (document.getElementById('vtaLote').value || '').trim();
    const unidades = numOpc(document.getElementById('vtaUnidades').value);
    const precio = numOpc(document.getElementById('vtaPrecio').value);

    if (!producto) { avisoVta('err', 'El producto es obligatorio.'); return; }
    if (montoRaw === '') { avisoVta('err', 'Captura el monto de la venta.'); return; }
    const monto = Number(montoRaw);
    if (Number.isNaN(monto) || monto < 0) { avisoVta('err', 'El monto no es válido (debe ser cero o positivo).'); return; }
    if (Number.isNaN(unidades)) { avisoVta('err', 'Las unidades, si se capturan, deben ser cero o positivas.'); return; }
    if (Number.isNaN(precio)) { avisoVta('err', 'El precio unitario, si se captura, debe ser cero o positivo.'); return; }

    const btn = document.getElementById('vtaAgregar');
    btn.disabled = true;
    avisoVta('warn', 'Agregando…');
    try {
      await rpc('fn_agregar_venta_liquidacion', {
        p_liquidacion_id: liqId, p_producto: producto, p_monto: monto,
        p_lote: lote || null, p_unidades: unidades, p_precio_unit: precio
      });
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Venta "${esc(producto)}" por ${usd(monto)} agregada.`);
      await verLiquidacion(liqId);   // bruto/comisión/neto/descuadre llegan ya recalculados
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoVta('err', `El ERP rechazó la venta: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  async function quitarVenta(vtaId, liqId) {
    if (!window.confirm('¿Quitar esta línea de venta? El bruto y el neto se recalculan.')) return;
    try {
      await rpc('fn_quitar_venta_liquidacion', { p_venta_id: Number(vtaId) });
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Línea de venta quitada.');
      await verLiquidacion(liqId);
    } catch (e) {
      if (!ERP.avisarSiPermiso(e)) ERP.toast('err', `No se pudo quitar la venta: ${esc(e.message)}`);
    }
  }

  function cuerpoFicha(l, ventas, deducciones, categoriasDed) {
    const desc = hayDescuadre(l);
    const esBorrador = l.estado === 'borrador';
    const anulada = l.estado === 'anulada';
    const puedeEmitir = ERP.puede('editar');
    const puedeAnular = ERP.puede('administrar');
    // Edición de deducciones: solo en borrador y con capacidad 'capturar' (las 2 RPCs nuevas son
    // gate 'capturar' y el backend solo las deja correr en borrador). En emitida/anulada, la tabla
    // es de solo lectura — los controles NI se pintan.
    const editable = esBorrador && ERP.puede('capturar');

    const bannerAnulada = anulada ? `<div class="banner-anulada">
      <div class="t">⊘ Liquidación anulada</div>
      <div class="motivo">${esc(l.anulado_motivo || '(sin motivo registrado)')}</div>
    </div>` : '';

    // Descuadre: aviso rojo que además bloquea Emitir. Si cuadra, confirmación verde discreta.
    const bannerDescuadre = desc
      ? `<div class="aviso visible err">⚠️ DESCUADRE DE ${usd(Math.abs(num(l.descuadre)))} — la liquidación no cuadra y NO se puede emitir. Revisa bruto, comisión y deducciones.</div>`
      : `<div class="aviso visible ok">✅ Cuadra (descuadre $0.00).</div>`;

    const comisionTxt = `${l.comision_pct == null ? '—' : num(l.comision_pct) + '%'} · ${usd(l.comision_monto)}`;

    const detalle = `<div class="det-grid">
      <div class="det"><div class="l">Número</div><div class="v mono">${l.numero ? esc(l.numero) : 'Se asigna al emitir'}</div></div>
      <div class="det"><div class="l">Productor</div><div class="v">${esc(l.productor || '—')}</div></div>
      <div class="det"><div class="l">Fecha</div><div class="v mono">${esc(fecha4(l.f_liquidacion))}</div></div>
      <div class="det"><div class="l">Moneda</div><div class="v">${esc(l.moneda || 'USD')}</div></div>
      <div class="det"><div class="l">Bruto de venta</div><div class="v mono">${usd(l.bruto_venta)}</div></div>
      <div class="det"><div class="l">Comisión</div><div class="v mono">${esc(comisionTxt)}</div></div>
      <div class="det"><div class="l">Deducciones</div><div class="v mono">${usd(l.deducciones)}</div></div>
      <div class="det" style="background:var(--verde-claro);border-radius:8px;padding:8px 10px"><div class="l">NETO PRODUCTOR</div><div class="v mono" style="font-weight:700;font-size:16px">${usd(l.neto_productor)}</div></div>
      <div class="det"><div class="l">Anticipos</div><div class="v mono">${usd(l.anticipos)}</div></div>
      <div class="det"><div class="l">Saldo a pagar</div><div class="v mono">${saldoHtml(l.saldo_a_pagar)}</div></div>
      <div class="det"><div class="l">Embarques</div><div class="v mono">${esc(l.n_embarques ?? 0)}</div></div>
      ${l.nota ? `<div class="det ancho"><div class="l">Nota</div><div class="v">${esc(l.nota)}</div></div>` : ''}
    </div>`;

    /* Líneas de venta (Gross Sales). Cuando hay líneas, el BRUTO = suma de las líneas — el backend
       lo recalcula (junto con comisión y neto) al agregar/quitar. El "Bruto de venta" del alta queda
       como fallback para liquidaciones sin desglose. Cada fila lleva su ✕ solo en borrador editable. */
    const vtaTabla = ventas.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Producto</th><th>Lote</th><th class="num">Unidades</th><th class="num">Precio unit.</th><th class="num">Monto</th>${editable ? '<th></th>' : ''}</tr></thead>
          <tbody>${ventas.map(v => `<tr>
            <td>${esc(v.producto || '—')}</td>
            <td class="mono">${esc(v.lote || '—')}</td>
            <td class="num">${v.unidades == null ? '—' : fmt0(v.unidades)}</td>
            <td class="num">${v.precio_unit == null ? '—' : usd(v.precio_unit)}</td>
            <td class="num">${usd(v.monto)}</td>
            ${editable ? `<td><button class="btn-cap" data-quitar-vta="${esc(v.id)}" title="Quitar esta línea de venta">✕</button></td>` : ''}</tr>`).join('')}</tbody>
          <tfoot><tr class="total"><td colspan="4">Subtotal ventas (bruto)</td>
            <td class="num">${usd(ventas.reduce((s, v) => s + num(v.monto), 0))}</td>${editable ? '<td></td>' : ''}</tr></tfoot>
        </table></div>`
      : '<div class="vacio">Sin líneas de venta — el bruto usa el capturado al crear la liquidación.</div>';

    const vtaForm = editable ? `<div class="form-erp" style="margin-top:10px">
      <div class="campos">
        <div class="campo"><label>Producto <span class="req">*</span></label>
          <input id="vtaProducto" type="text" maxlength="120" placeholder="Ej. Kabocha"></div>
        <div class="campo"><label>Monto USD <span class="req">*</span></label>
          <input id="vtaMonto" class="mono" type="number" step="0.01" min="0" placeholder="0.00"></div>
        <div class="campo"><label>Lote</label>
          <input id="vtaLote" type="text" maxlength="60" placeholder="Opcional"></div>
        <div class="campo"><label>Unidades</label>
          <input id="vtaUnidades" class="mono" type="number" step="0.01" min="0" placeholder="Opcional"></div>
        <div class="campo"><label>Precio unit. USD</label>
          <input id="vtaPrecio" class="mono" type="number" step="0.01" min="0" placeholder="Opcional"></div>
      </div>
      <div class="acciones"><button class="btn-mini" id="vtaAgregar">+ Agregar venta</button></div>
      <div class="aviso" id="vtaAviso"></div>
      <div class="leyenda" style="margin-top:2px">Si capturas líneas, el bruto se recalcula como la suma de las líneas (sobreescribe el bruto provisional del alta).</div>
    </div>` : '';

    const vtaHtml = `${vtaTabla}${vtaForm}`;

    // Cada fila lleva su botón ✕ SOLO en borrador editable (necesita `d.id` de v_liquidacion_deducciones).
    const dedTabla = deducciones.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Concepto</th><th>Categoría</th><th>Nota</th><th class="num">Monto</th>${editable ? '<th></th>' : ''}</tr></thead>
          <tbody>${deducciones.map(d => `<tr><td>${esc(d.concepto || '—')}</td>
            <td><span class="pill gris">${esc(catLabel(d.categoria))}</span></td>
            <td style="color:var(--gris)">${esc(d.nota || '')}</td>
            <td class="num">${usd(d.monto)}</td>
            ${editable ? `<td><button class="btn-cap" data-quitar-ded="${esc(d.id)}" title="Quitar esta deducción">✕</button></td>` : ''}</tr>`).join('')}</tbody>
          <tfoot><tr class="total"><td colspan="3">Total deducciones</td>
            <td class="num">${usd(deducciones.reduce((s, d) => s + num(d.monto), 0))}</td>${editable ? '<td></td>' : ''}</tr></tfoot>
        </table></div>`
      : '<div class="vacio">Sin deducciones registradas.</div>';

    // Alta de deducción (solo borrador editable). El neto, las deducciones y el descuadre los
    // recalcula el backend: al agregar/quitar se recarga la ficha y todo llega ya recalculado.
    const dedForm = editable ? `<div class="form-erp" style="margin-top:10px">
      <div class="campos">
        <div class="campo"><label>Concepto <span class="req">*</span></label>
          <input id="dedConcepto" type="text" maxlength="120" placeholder="Ej. Pick & pack"></div>
        <div class="campo"><label>Monto USD <span class="req">*</span></label>
          <input id="dedMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00"></div>
        <div class="campo"><label>Categoría</label>
          <select id="dedCategoria">${(categoriasDed && categoriasDed.length
            ? categoriasDed.map(c => `<option value="${esc(c.codigo)}"${c.codigo === 'general' ? ' selected' : ''}>${esc(c.nombre)}</option>`).join('')
            : '<option value="general">General</option>')}</select></div>
        <div class="campo ancho"><label>Nota</label>
          <input id="dedNota" type="text" maxlength="200" placeholder="Opcional — referencia"></div>
      </div>
      <div class="acciones"><button class="btn-mini" id="dedAgregar">+ Agregar deducción</button></div>
      <div class="aviso" id="dedAviso"></div>
    </div>` : '';

    const dedHtml = `${dedTabla}${dedForm}`;

    // Emitir: solo en borrador, capacidad 'editar', y SOLO si cuadra (descuadre 0). Tras emitir no
    // hay edición (no existe RPC de edición y los triggers la impiden): solo Imprimir/Anular.
    const btnEmitir = (esBorrador && puedeEmitir)
      ? `<button class="btn-mini" id="liqEmitir"${desc ? ' disabled title="No se puede emitir con descuadre — corrígelo primero"' : ''}>Emitir liquidación</button>`
      : '';
    const btnAnular = ((esBorrador || l.estado === 'emitida') && puedeAnular)
      ? '<button class="btn-mini peligro" id="liqAnular">Anular liquidación</button>' : '';

    const meta = `<div class="leyenda">
      Capturó ${esc(l.capturado_por || '—')}${l.capturado_ts ? ' · ' + esc(fecha4(l.capturado_ts)) : ''}${l.emitida_por ? ` · Emitió ${esc(l.emitida_por)}${l.emitida_ts ? ' · ' + esc(fecha4(l.emitida_ts)) : ''}` : ''}.
      Embarques: <span class="mono">${esc(embarquesTxt(l.embarques))}</span></div>`;

    return `<div class="${anulada ? 'ficha-anulada' : ''}">
      ${bannerAnulada}
      ${bannerDescuadre}
      ${detalle}
      <div class="seccion-head"><h4>Ventas (Gross Sales)</h4></div>
      ${vtaHtml}
      <div class="seccion-head"><h4>Deducciones</h4></div>
      ${dedHtml}
      ${meta}
      <div class="acciones" style="margin-top:14px">
        <button class="btn-mini gris" id="liqImprimir">Imprimir / PDF</button>
        ${btnEmitir}
        ${btnAnular}
      </div>
      <div class="aviso" id="liqEdAviso"></div>
    </div>`;
  }

  function avisoEd(tipo, html) {
    const el = document.getElementById('liqEdAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  function botonesFicha(dis) {
    ['liqEmitir', 'liqAnular', 'liqImprimir'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = dis; });
  }

  async function emitir() {
    if (!window.confirm('Emitir asigna el número de serie (LQ-AAAA-NNNN) y la vuelve un documento oficial (account of sales). Ya no se podrá editar. ¿Continuar?')) return;
    botonesFicha(true);
    avisoEd('warn', 'Emitiendo…');
    try {
      const data = await rpc('fn_emitir_liquidacion', { p_id: liqActual.id });
      const numero = unwrap(data, 'numero');
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Liquidación emitida con número <b>${esc(numero || '—')}</b>.`, 6000);
      verLiquidacion(liqActual.id);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botonesFicha(false); return; }
      avisoEd('err', `No se pudo emitir: ${esc(e.message)}`);
      botonesFicha(false);
    }
  }

  async function anular() {
    const motivo = window.prompt('Motivo de la anulación (obligatorio; queda registrado):');
    if (motivo === null) return;
    if (!motivo.trim()) { avisoEd('err', 'El motivo es obligatorio para anular.'); return; }
    botonesFicha(true);
    avisoEd('warn', 'Anulando…');
    try {
      await rpc('fn_anular_liquidacion', { p_id: liqActual.id, p_motivo: motivo.trim() });
      ERP.marcarDatosSucios();
      ERP.toast('ok', 'Liquidación anulada.');
      verLiquidacion(liqActual.id);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { botonesFicha(false); return; }
      avisoEd('err', `No se pudo anular: ${esc(e.message)}`);
      botonesFicha(false);
    }
  }

  /* ================= Impresión / PDF (account of sales) ================= */

  async function imprimir(id) {
    let l, ventas, deducciones;
    if (liqActual && String(liqActual.id) === String(id)) l = liqActual;
    try {
      [l, ventas, deducciones] = await Promise.all([
        l ? Promise.resolve(l) : q('v_liquidaciones', `&id=eq.${encodeURIComponent(id)}`).then(r => r && r[0]),
        q('v_liquidacion_ventas', `&liquidacion_id=eq.${encodeURIComponent(id)}&order=orden.asc`),
        q('v_liquidacion_deducciones', `&liquidacion_id=eq.${encodeURIComponent(id)}&order=orden.asc`)
      ]);
    } catch (_) { l = null; }
    if (!l) { ERP.toast('err', 'No se pudo leer la liquidación para imprimir.'); return; }
    ERP.imprimirArea(htmlImpresion(l, ventas || [], deducciones || []));
  }

  /** PRODUCTOR: desglose completo (E79 — v_liquidaciones ganó 7 columnas productor_*), mismo
      patrón "omitir vacíos" de los otros bloques de contraparte (VENDOR/BILL TO en Facturas/PO) —
      placeholder honesto si no hay nombre, nunca una celda en blanco muda. NO existe
      productor_tel: no se pinta un teléfono aquí. */
  function bloqueProductor(l) {
    const nombre = (l.productor_razon_social && String(l.productor_razon_social).trim())
      || (l.productor && String(l.productor).trim()) || '';
    if (!nombre) return '<span class="sin-alias">— sin productor asociado —</span>';
    const soloTexto = v => (v && String(v).trim()) ? String(v).trim() : null;
    const ciudadPais = [soloTexto(l.productor_ciudad), soloTexto(l.productor_pais)].filter(Boolean).join(', ');
    const lineas = [
      nombre,
      soloTexto(l.productor_direccion),
      ciudadPais || null,
      soloTexto(l.productor_rfc) ? `RFC/Tax ID: ${soloTexto(l.productor_rfc)}` : null,
      soloTexto(l.productor_paca) ? `PACA #: ${soloTexto(l.productor_paca)}` : null,
      soloTexto(l.productor_email)
    ].filter(Boolean);
    return lineas.map(esc).join('<br>');
  }

  function htmlImpresion(l, ventas, deducciones) {
    // Desglose completo tipo account of sales: bruto − comisión − deducciones = neto; − anticipos = saldo.
    // Deducciones agrupadas por categoría (modelo STESAN): CUSTOMS y DUTIES en sección propia; todo
    // lo demás (material/flete/in_out/general/otro y cualquier valor futuro) en DEDUCTIONS. El total
    // y el neto NO cambian: solo cambia la presentación. Una categoría sin líneas no pinta sección.
    const esCat = (d, c) => String(d.categoria || '').toLowerCase() === c;
    const dedGenerales = deducciones.filter(d => !esCat(d, 'customs') && !esCat(d, 'duties'));
    const dedCustoms = deducciones.filter(d => esCat(d, 'customs'));
    const dedDuties = deducciones.filter(d => esCat(d, 'duties'));
    const seccionDedPDF = (titulo, lineas) => !lineas.length ? '' :
      `<tr><td colspan="3" style="background:#f0efe8;font-weight:700;font-size:10px;letter-spacing:.05em;padding-top:9px">${titulo}</td></tr>
       ${lineas.map(d => `<tr><td>${esc(d.concepto || '—')}</td><td>${esc(d.nota || '')}</td><td class="num">−${usd(Math.abs(num(d.monto)))}</td></tr>`).join('')}
       <tr><td style="font-style:italic">Subtotal ${esc(titulo)}</td><td></td><td class="num" style="font-style:italic">−${usd(Math.abs(lineas.reduce((s, d) => s + num(d.monto), 0)))}</td></tr>`;
    const comisionPctTxt = l.comision_pct == null ? '' : ` (${num(l.comision_pct)}%)`;

    // GROSS SALES (líneas de venta), arriba del desglose — solo si hay líneas capturadas (modelo
    // STESAN). El subtotal = el bruto que el backend ya recalculó a partir de estas líneas.
    const grossSales = ventas.length ? `<div class="inv-box-h" style="margin-bottom:4px">GROSS SALES</div>
      <table class="inv-items" style="margin-bottom:16px">
        <thead><tr><th>PRODUCT</th><th>LOT</th><th class="num">UNITS</th><th class="num">UNIT PRICE</th><th class="num">AMOUNT</th></tr></thead>
        <tbody>
          ${ventas.map(v => `<tr><td>${esc(v.producto || '—')}</td><td>${esc(v.lote || '')}</td>
            <td class="num">${v.unidades == null ? '' : fmt0(v.unidades)}</td>
            <td class="num">${v.precio_unit == null ? '' : usd(v.precio_unit)}</td>
            <td class="num">${usd(v.monto)}</td></tr>`).join('')}
          <tr class="inv-grand"><td>SUBTOTAL</td><td></td><td></td><td></td><td class="num">${usd(ventas.reduce((s, v) => s + num(v.monto), 0))}</td></tr>
        </tbody>
      </table>` : '';

    // Descuadre: centinela de integridad (mismo criterio que hayDescuadre() de la ficha). Se
    // muestra SIEMPRE que no sea cero — nunca se oculta un descuadre, mismo espíritu que el
    // centinela de v_balance.
    const descuadreRow = hayDescuadre(l)
      ? `<tr><td style="color:#B42318;font-weight:700">⚠ DESCUADRE</td><td></td><td class="num" style="color:#B42318;font-weight:700">${usd(l.descuadre)}</td></tr>`
      : '';

    return `<div class="inv-doc">
      ${ERP.membreteOficial('LIQUIDACIÓN AL PRODUCTOR / ACCOUNT OF SALES', [
        ['FECHA', fecha4(l.f_liquidacion)],
        ['LIQ #', l.numero || 'BORRADOR'],
        ['PRODUCTOR', l.productor || '—']
      ])}
      <div class="inv-boxes">
        <div class="inv-box"><div class="inv-box-h">PRODUCTOR</div><div class="inv-box-b">${bloqueProductor(l)}</div></div>
        <div class="inv-box"><div class="inv-box-h">EMBARQUES (${esc(l.n_embarques ?? 0)})</div><div class="inv-box-b">${esc(embarquesTxt(l.embarques))}</div></div>
      </div>
      ${grossSales}
      <table class="inv-items">
        <thead><tr><th>CONCEPTO</th><th>NOTA</th><th class="num">MONTO</th></tr></thead>
        <tbody>
          <tr><td><b>Bruto de venta</b></td><td></td><td class="num">${usd(l.bruto_venta)}</td></tr>
          <tr><td>Comisión Plein${comisionPctTxt}</td><td></td><td class="num">−${usd(Math.abs(num(l.comision_monto)))}</td></tr>
          ${seccionDedPDF('DEDUCTIONS', dedGenerales)}
          ${seccionDedPDF('CUSTOMS', dedCustoms)}
          ${seccionDedPDF('DUTIES', dedDuties)}
          <tr class="inv-grand"><td>NETO AL PRODUCTOR</td><td></td><td class="num">${usd(l.neto_productor)}</td></tr>
          <tr><td>Anticipos</td><td></td><td class="num">−${usd(Math.abs(num(l.anticipos)))}</td></tr>
          <tr class="inv-grand"><td>SALDO A PAGAR</td><td></td><td class="num">${usd(l.saldo_a_pagar)}</td></tr>
          ${descuadreRow}
        </tbody>
      </table>
      ${num(l.saldo_a_pagar) < -0.009 ? '<div style="font-size:11px;color:#2A6098;margin-top:6px">Saldo negativo: el productor le debe a Plein.</div>' : ''}
      ${l.nota ? `<div class="inv-comments" style="margin-top:14px"><div class="inv-box-h">NOTA</div><div class="inv-box-b">${esc(l.nota).replace(/\n/g, '<br>')}</div></div>` : ''}
      ${ERP.pieOficial()}
    </div>`;
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('liquidaciones', {
    titulo: 'Liquidaciones al productor',
    descripcion: 'Account of sales: bruto − comisión − deducciones = neto; menos anticipos = saldo',
    render
  });

  ERP.verLiquidacion = verLiquidacion;
  ERP.nuevaLiquidacionAuto = nuevaLiquidacionAuto;
})();
