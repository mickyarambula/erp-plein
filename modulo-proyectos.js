/* Módulo "Proyectos" (E42/E43) — financiamiento a productores. Línea de crédito con saldo vivo
   (patrón JEAMS al revés: activo en balance, no toca P&L), contratos, presupuesto y rentabilidad.
   Solo CONSUME vistas + RPCs (todas devuelven texto humano → se muestra tal cual en el toast).
   NO hay alta de proyectos/contratos ni edición de presupuesto desde aquí (por chat). */
(function () {
  'use strict';
  const { q, rpc, esc, num, usd, fmt, fecha, badgeEstado } = ERP;

  const ESTADO_PILL = { activo: 'verde', cerrado: 'gris', cancelado: 'rojo' };
  const badgeProy = e => `<span class="pill ${ESTADO_PILL[String(e || '').toLowerCase()] || 'gris'}">${esc(e || '—')}</span>`;
  const FONDEO = { propio: 'Propio', agrocapital: 'AgroCapital', back_to_back: 'Back to back', otro: 'Otro' };
  const COSTOFIN = { no_aplica: 'No aplica', plein: 'Plein', productor: 'Productor', compartido: 'Compartido' };
  const EFECTO_CLASE = { cargo: 'ambar', abono: 'verde', informativo: 'gris' };
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const textoRpc = data => (typeof data === 'string' ? data : ((data && data[0]) || 'Listo.'));
  const fondeoTxt = p => (FONDEO[p.fuente_fondeo] || p.fuente_fondeo || '—') + (p.fondeador ? ` · ${esc(p.fondeador)}` : '');
  const numOrNull = v => (v === '' || v === null || v === undefined) ? null : Number(v);

  /* ================= Avisos del formulario de alta (drawer, mismo patrón que nuevaCarga) ===== */
  function avisoP(id, tipo, html) {
    const el = document.getElementById(id);
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  function limpiarAvisoP(id) {
    const el = document.getElementById(id);
    if (el) { el.className = 'aviso'; el.innerHTML = ''; }
  }

  /* ================= Alta de proyecto (E47-B) — fn_crear_proyecto ya existía (E43); solo faltaba
     que la UI lo consumiera. Productor = contraparte es_proveedor=true (mismo criterio que Directorio
     Comercial); Fondeador = cualquier contraparte (v_catalogo_admin), puede ser un socio virtual
     (JEAMS, Samuel) o una entidad externa (AgroCapital). */
  let comboPyProductor = null, comboPyFondeador = null;

  async function nuevoProyecto() {
    ERP.abrirPanel('Nuevo proyecto', 'El código se genera automático si lo dejas vacío', '<div class="skel">Cargando catálogos…</div>');
    let productores, contrapartes;
    try {
      [productores, contrapartes] = await Promise.all([
        q('v_catalogo_proveedores', '&order=nombre.asc'),
        q('v_catalogo_admin', '&order=nombre.asc')
      ]);
    } catch (e) {
      ERP.abrirPanel('Nuevo proyecto', '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Nuevo proyecto', 'El código se genera automático si lo dejas vacío', `
      <div class="form-erp"><div class="campos">
        <div class="campo ancho"><label>Nombre del proyecto <span class="req">*</span></label>
          <input id="pyNombre" type="text" maxlength="120"></div>
        <div class="campo"><label>Productor <span class="req">*</span></label><div id="pyProductor"></div>
          <small style="color:var(--gris);font-size:11px">Si no aparece, dalo de alta primero en Directorio Comercial.</small></div>
        <div class="campo"><label>Código</label><input id="pyCodigo" class="mono" type="text" maxlength="20" placeholder="auto si se deja vacío"></div>
        <div class="campo ancho"><label>Temporada</label><input id="pyTemporada" type="text" maxlength="120" placeholder="ej. Baby Broccoli 8oz SBB 26/27"></div>
        <div class="campo"><label>Vigencia desde</label><input id="pyFIni" type="date"></div>
        <div class="campo"><label>Vigencia hasta</label><input id="pyFFin" type="date"></div>
        <div class="campo"><label>Comisión (%)</label><input id="pyComisionPct" class="mono" type="number" step="0.01" min="0" max="100" placeholder="opcional"></div>
        <div class="campo"><label>Ventas proyectadas (USD)</label><input id="pyVentasProy" class="mono" type="number" step="0.01" min="0" placeholder="opcional"></div>
        <div class="campo"><label>Cajas proyectadas</label><input id="pyCajasProy" class="mono" type="number" step="1" min="0" placeholder="opcional"></div>
        <div class="campo"><label>Línea (monto)</label><input id="pyMontoLinea" class="mono" type="number" step="0.01" min="0" placeholder="opcional"></div>
        <div class="campo"><label>Fuente de fondeo</label><select id="pyFuenteFondeo">
          <option value="">—</option>${Object.keys(FONDEO).map(k => `<option value="${esc(k)}">${esc(FONDEO[k])}</option>`).join('')}
        </select></div>
        <div class="campo"><label>Fondeador</label><div id="pyFondeador"></div></div>
        <div class="campo"><label>Costo financiero</label><select id="pyCostoFin">
          <option value="">—</option>${Object.keys(COSTOFIN).map(k => `<option value="${esc(k)}">${esc(COSTOFIN[k])}</option>`).join('')}
        </select></div>
        <div class="campo ancho"><label>Descripción</label><textarea id="pyDescripcion"></textarea></div>
        <div class="campo ancho"><label>Nota</label><textarea id="pyNota"></textarea></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="pyGuardar">Crear proyecto</button>
        <button class="btn-mini gris" id="pyCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="pyAviso"></div>
      </div>`);

    comboPyProductor = ERP.crearCombo({
      contenedor: document.getElementById('pyProductor'), items: productores,
      placeholder: 'Busca por nombre o alias…', permitirNuevo: false
    });
    comboPyFondeador = ERP.crearCombo({
      contenedor: document.getElementById('pyFondeador'), items: contrapartes,
      placeholder: 'JEAMS, Samuel, AgroCapital… (opcional)', permitirNuevo: false
    });

    document.getElementById('pyCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('pyGuardar').addEventListener('click', guardarNuevoProyecto);
    document.getElementById('pyNombre').focus();
  }

  async function guardarNuevoProyecto() {
    limpiarAvisoP('pyAviso');
    const v = id => document.getElementById(id).value.trim();
    const nombre = v('pyNombre');
    const productorId = comboPyProductor ? comboPyProductor.valorId() : null;
    const faltan = [];
    if (!nombre) faltan.push('nombre del proyecto');
    if (!productorId) faltan.push('productor');
    if (faltan.length) {
      const aMedias = comboPyProductor && !comboPyProductor.valor() && comboPyProductor.textoCrudo();
      avisoP('pyAviso', 'err', `Falta: ${faltan.join(', ')}.` + (aMedias
        ? '<br>Elige el productor de la lista; si no aparece, dalo de alta en Directorio Comercial.' : ''));
      return;
    }
    const numsNoNeg = [
      ['Comisión (%)', v('pyComisionPct')], ['Ventas proyectadas', v('pyVentasProy')],
      ['Cajas proyectadas', v('pyCajasProy')], ['Línea (monto)', v('pyMontoLinea')]
    ];
    for (const [label, raw] of numsNoNeg) {
      if (raw === '') continue;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) { avisoP('pyAviso', 'err', `"${label}" no es válido (debe ser cero o positivo).`); return; }
    }
    const fIni = v('pyFIni'), fFin = v('pyFFin');
    if (fIni && fFin && fFin < fIni) { avisoP('pyAviso', 'err', 'La vigencia "hasta" no puede ser anterior a "desde".'); return; }

    const btn = document.getElementById('pyGuardar');
    btn.disabled = true;
    avisoP('pyAviso', 'warn', 'Guardando…');
    try {
      const data = await rpc('fn_crear_proyecto', {
        p_nombre: nombre,
        p_productor_id: productorId,
        p_codigo: v('pyCodigo') || null,
        p_descripcion: v('pyDescripcion') || null,
        p_temporada: v('pyTemporada') || null,
        p_f_inicio: fIni || null,
        p_f_fin: fFin || null,
        p_comision_pct: numOrNull(v('pyComisionPct')),
        p_ventas_proyectadas: numOrNull(v('pyVentasProy')),
        p_cajas_proyectadas: numOrNull(v('pyCajasProy')),
        p_monto_linea: numOrNull(v('pyMontoLinea')),
        p_fuente_fondeo: document.getElementById('pyFuenteFondeo').value || null,
        p_fondeador_id: comboPyFondeador ? comboPyFondeador.valorId() : null,
        p_costo_financiero: document.getElementById('pyCostoFin').value || null,
        p_nota: v('pyNota') || null
      });
      ERP.marcarDatosSucios();
      const r = (data && data[0]) || {};
      if (r.codigo) {
        await verProyecto(r.codigo);
        ERP.toast('ok', `Proyecto <b>${esc(r.codigo)}</b> creado.`);
      } else {
        ERP.toast('ok', esc(textoRpc(data)));
        ERP.cerrarPanel();
      }
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoP('pyAviso', 'err', `El ERP rechazó el proyecto: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= LISTA ================= */
  async function render(cont, parametro) {
    let filas;
    try { filas = await q('v_proyectos', '&order=codigo.asc'); }
    catch (e) { cont.innerHTML = `<div class="errbox">No se pudieron leer los proyectos: ${esc(e.message)}</div>`; return; }
    if (!filas.length) {
      cont.innerHTML = `<div class="exp-acciones">${ERP.puede('capturar') ? '<button class="btn-mini" id="btnNuevoProyecto">+ Proyecto</button>' : ''}</div>
        <div class="vacio" style="padding:24px">Sin proyectos.</div>`;
      const bN = document.getElementById('btnNuevoProyecto');
      if (bN) bN.addEventListener('click', nuevoProyecto);
      return;
    }

    cont.innerHTML = `
      <div class="exp-acciones">${ERP.puede('capturar') ? '<button class="btn-mini" id="btnNuevoProyecto">+ Proyecto</button>' : ''}</div>
      ${ERP.botonesExportar ? ERP.botonesExportar('Proyectos', 'Proyectos', '#tblProyectos') : ''}
      <div class="card" style="padding:14px"><div class="tabla-wrap"><table id="tblProyectos">
        <thead><tr><th>Código</th><th>Proyecto</th><th>Productor</th><th>Estado</th>
          <th class="num">Línea</th><th class="num">Dispuesto</th><th class="num">Saldo vivo</th>
          <th class="num">Disponible</th><th class="num">Comisión proy.</th><th>Fondeo</th></tr></thead>
        <tbody>${filas.map(p => {
          const sinLinea = p.monto_linea == null || Math.abs(num(p.monto_linea)) < 0.005;
          const kl = v => sinLinea ? '—' : usd(v);
          return `<tr class="clic" data-codigo="${esc(p.codigo)}">
            <td class="mono"><span class="enlace">${esc(p.codigo)}</span></td>
            <td>${esc(p.nombre || '—')}</td>
            <td>${esc(p.productor || '—')}</td>
            <td>${badgeProy(p.estado)}</td>
            <td class="num">${kl(p.monto_linea)}</td>
            <td class="num">${kl(p.dispuesto)}</td>
            <td class="num">${kl(p.saldo_vivo)}</td>
            <td class="num">${kl(p.linea_disponible)}</td>
            <td class="num">${p.comision_proyectada == null ? '—' : usd(p.comision_proyectada)}</td>
            <td>${esc(fondeoTxt(p))}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div></div>`;

    cont.querySelectorAll('tr.clic[data-codigo]').forEach(tr =>
      tr.addEventListener('click', () => verProyecto(tr.dataset.codigo)));
    const bNuevo = document.getElementById('btnNuevoProyecto');
    if (bNuevo) bNuevo.addEventListener('click', nuevoProyecto);
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
    if (parametro) verProyecto(parametro);   // abrir ficha directo (ej. desde el chip del Expediente)
  }

  /* ================= FICHA ================= */
  let estado = null;   // { codigo, p, rent, contratos, amort, presu, movs, cargas, cats }

  async function verProyecto(codigo) {
    ERP.abrirPanel(esc(codigo), 'Cargando proyecto…', '<div class="skel">Cargando…</div>');
    const f = `&proyecto_codigo=${ERP.eq(codigo)}`;
    let p, rent, contratos, amort, presu, movs, cargas, cats, flujo, flujoPico;
    try {
      [p, rent, contratos, amort, presu, movs, cargas, cats, flujo, flujoPico] = await Promise.all([
        q('v_proyectos', `&codigo=${ERP.eq(codigo)}`),
        q('v_proyecto_rentabilidad', `&codigo=${ERP.eq(codigo)}`).catch(() => []),
        q('v_proyecto_contratos', f).catch(() => []),
        q('v_proyecto_amortizaciones', `${f}&order=fecha.asc`).catch(() => []),
        q('v_proyecto_presupuesto', `${f}&order=mes.asc`).catch(() => []),
        q('v_proyecto_movimientos', `${f}&order=fecha.asc`).catch(() => []),
        q('v_proyecto_cargas', f).catch(() => []),
        q('v_cat_presupuesto', '&order=orden.asc').catch(() => []),   // E50: vista (antes leía la tabla base categorias_presupuesto, que 401 a authenticated)
        // Plan de flujo (E45): si truena, la sección degrada a estado vacío, no rompe la ficha.
        q('v_proyecto_flujo', `${f}&order=mes.asc`).catch(() => []),
        q('v_proyecto_flujo_pico', f).catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel(esc(codigo), '', `<div class="errbox">No se pudo cargar el proyecto: ${esc(e.message)}</div>`);
      return;
    }
    if (!p.length) { ERP.abrirPanel(esc(codigo), '', '<p style="font-size:13px">No existe ese proyecto.</p>'); return; }
    estado = { codigo, p: p[0], rent: (rent && rent[0]) || null, contratos, amort, presu, movs, cargas, cats, flujo, flujoPico };
    pintarFicha();
  }

  function pintarFicha() {
    const p = estado.p;
    const titulo = `${esc(p.codigo)} <span style="font-weight:400;color:var(--gris)">· ${esc(p.nombre || '')}</span>`;
    const sub = `${badgeProy(p.estado)} · ${esc(p.productor || '—')} · ${esc(p.temporada || '—')}`;
    ERP.abrirPanel(titulo, sub, cuerpoFicha());

    const bEdit = document.getElementById('prjEditar');
    if (bEdit) bEdit.addEventListener('click', editarProyecto);
    const bMov = document.getElementById('prjMovLinea');
    if (bMov) bMov.addEventListener('click', registrarMovLinea);
    const bPre = document.getElementById('prjPresu');
    if (bPre) bPre.addEventListener('click', capturarPresupuesto);
    // Navegación cruzada del libro y las ligas.
    document.querySelectorAll('[data-ir-tesoreria]').forEach(el => el.addEventListener('click', () =>
      ERP.irModulo('tesoreria', 'mov:' + el.dataset.irTesoreria)));
    document.querySelectorAll('[data-ir-carga]').forEach(el => el.addEventListener('click', () => ERP.verCarga(el.dataset.irCarga)));

    // Toggle segmentado del plan de flujo (Plein/Productor/Total, default Plein) — solo existe si
    // seccionFlujo() lo pintó (proyecto multi-capa); si no hay chips, el querySelectorAll no itera
    // nada y no rompe. pintarFlujo('plein') SIEMPRE se llama mientras haya datos, con o sin toggle.
    if (estado.flujo && estado.flujo.length) {
      document.querySelectorAll('#flujoWrap [data-capa]').forEach(btn => btn.addEventListener('click', () => {
        document.querySelectorAll('#flujoWrap [data-capa]').forEach(b => b.classList.remove('activo'));
        btn.classList.add('activo');
        pintarFlujo(btn.dataset.capa);
      }));
      pintarFlujo('plein');
    }
  }

  function seccion(titulo, html) {
    return `<div class="seccion-head" style="margin-top:20px"><h4>${esc(titulo)}</h4></div>${html}`;
  }

  function cuerpoFicha() {
    const p = estado.p, r = estado.rent;
    const puedeCap = ERP.puede('capturar'), puedeEd = ERP.puede('editar');
    const sinLinea = p.monto_linea == null || Math.abs(num(p.monto_linea)) < 0.005;
    const kl = v => sinLinea ? '—' : usd(v);
    const tasa = p.tasa_anual == null
      ? '<span style="color:var(--gris)">pendiente</span>'
      : `${fmt(p.tasa_anual)}% anual${p.tasa_vigencia_desde ? ` · desde ${esc(fecha(p.tasa_vigencia_desde))}` : ''}`;

    const header = `<div class="det-grid">
      <div class="det"><div class="l">Código</div><div class="v mono">${esc(p.codigo)}</div></div>
      <div class="det"><div class="l">Productor</div><div class="v">${esc(p.productor || '—')}</div></div>
      <div class="det"><div class="l">Temporada</div><div class="v">${esc(p.temporada || '—')}</div></div>
      <div class="det"><div class="l">Vigencia</div><div class="v mono">${esc(fecha(p.f_inicio))} — ${esc(fecha(p.f_fin))}</div></div>
      <div class="det"><div class="l">Fuente de fondeo</div><div class="v">${esc(fondeoTxt(p))}</div></div>
      <div class="det"><div class="l">Costo financiero</div><div class="v">${esc(COSTOFIN[p.costo_financiero] || p.costo_financiero || '—')}</div></div>
      <div class="det"><div class="l">Tasa</div><div class="v mono">${tasa}</div></div>
      <div class="det"><div class="l">Precio valuación especie</div><div class="v mono">${p.precio_valuacion_especie == null ? '—' : usd(p.precio_valuacion_especie)}</div></div>
      ${p.nota ? `<div class="det ancho"><div class="l">Nota</div><div class="v">${esc(p.nota)}</div></div>` : ''}
    </div>`;

    const kpis = `<div class="det-grid" style="margin-top:14px">
      <div class="det"><div class="l">Línea</div><div class="v mono">${kl(p.monto_linea)}</div></div>
      <div class="det"><div class="l">Dispuesto</div><div class="v mono">${kl(p.dispuesto)}</div></div>
      <div class="det"><div class="l">Recuperado</div><div class="v mono">${kl(p.recuperado)}</div></div>
      <div class="det" style="background:var(--verde-claro);border-radius:8px;padding:8px 10px"><div class="l">SALDO VIVO</div><div class="v mono" style="font-weight:700;font-size:16px">${kl(p.saldo_vivo)}</div></div>
      <div class="det"><div class="l">Disponible</div><div class="v mono">${kl(p.linea_disponible)}</div></div>
      <div class="det"><div class="l">Comisión proyectada</div><div class="v mono">${p.comision_proyectada == null ? '—' : usd(p.comision_proyectada)}</div></div>
    </div>`;

    const rent = r ? (() => {
      const u = num(r.utilidad_real);
      return `<div class="tabla-wrap"><table>
        <tbody>
          <tr><td>Ingreso proyectado</td><td class="num">${usd(r.ingreso_proyectado)}</td></tr>
          <tr><td>− Costo financiero real</td><td class="num neg">${usd(r.costo_financiero_real)}</td></tr>
          <tr><td>− Gastos del proyecto</td><td class="num neg">${usd(r.gastos_proyecto)}</td></tr>
          <tr class="total"><td>UTILIDAD REAL</td><td class="num" style="color:${u >= 0 ? 'var(--verde)' : 'var(--rojo)'};font-weight:700">${usd(r.utilidad_real)}</td></tr>
        </tbody></table></div>
        <div class="leyenda">Regla de costo financiero: <b>${esc(r.costo_financiero_regla || '—')}</b>. Presupuesto Plein (informativo, no entra en la utilidad): <b>${usd(r.presupuesto_plein)}</b>.</div>`;
    })() : '<div class="vacio">Sin datos de rentabilidad.</div>';

    return `
      <div class="exp-acciones">
        ${puedeEd ? '<button class="btn-mini" id="prjEditar">Editar proyecto</button>' : ''}
      </div>
      ${header}
      ${kpis}
      ${seccion('Rentabilidad', rent)}
      ${seccion('Contratos de entrega', tablaContratos(estado.contratos))}
      ${seccion('Libro de la línea', libro(estado.amort, puedeCap))}
      ${seccion('Plan de flujo del proyecto', seccionFlujo())}
      ${seccion('Presupuesto de gastos del proyecto', presupuesto(estado.presu, puedeCap))}
      ${seccion('Ligas', ligas(estado.movs, estado.cargas))}`;
  }

  /* ================= Plan de flujo del proyecto (v_proyecto_flujo / v_proyecto_flujo_pico) =====
     Gráfica SVG a mano (sin librerías): línea + área de la serie acumulada por capa, línea base
     en cero SIEMPRE marcada, tramo negativo en rojo-suave y positivo en verde-suave, con marcador
     de punto+etiqueta en el mes del pico (mínimo) y en el mes de cruce a positivo. Escalado 100%
     dinámico al min/max de la serie — nada de rangos fijos. */

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  // "mmm-YYYY" con año completo (el campo `mes` es siempre día 1 del mes; el día no importa).
  function mesLargo(m) {
    if (!m) return '—';
    const d = new Date(String(m).slice(0, 10) + 'T12:00:00');
    if (isNaN(d)) return String(m);
    return `${MESES[d.getMonth()]}-${d.getFullYear()}`;
  }
  const ymKey = m => String(m || '').slice(0, 7);   // 'YYYY-MM', para casar mes_pico/mes_cruce contra la serie

  // [clave, etiqueta, campo *_acum]. La curva que importa a tesorería es PLEIN (default del toggle).
  // La CLAVE 'santana' es la que usa el backend (no cambia); la ETIQUETA es genérica ("Productor")
  // porque "Santana" es el nombre del productor de PRJ-005, no una capa genérica — en otro proyecto
  // (ej. Akambarhu) sería otro productor.
  const CAPAS_FLUJO = [
    ['plein', 'Plein', 'plein_acum'],
    ['santana', 'Productor', 'santana_acum'],
    ['total', 'Total', 'total_acum']
  ];

  /* Calcula las coordenadas SVG de la serie (una capa a la vez). minV/maxV SIEMPRE incluyen 0,
     así la línea base de cero cae dentro del lienzo aunque toda la serie sea negativa (o positiva). */
  function escalaFlujo(serie, campoAcum) {
    const W = 600, H = 220, padT = 14, padB = 26, padL = 4, padR = 4;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const n = serie.length;
    const valores = serie.map(p => num(p[campoAcum]));
    let minV = Math.min(0, ...valores), maxV = Math.max(0, ...valores);
    if (minV === maxV) { minV -= 1; maxV += 1; }   // serie plana (incl. todo-cero): evita división entre 0
    const x = i => (n <= 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
    const y = v => padT + (maxV - v) / (maxV - minV) * plotH;
    return { W, H, padT, padB, x, y, yZero: y(0), n, valores };
  }

  function marcadorMes(serie, mesObjetivo) {
    if (!mesObjetivo) return null;
    const key = ymKey(mesObjetivo);
    const idx = serie.findIndex(p => ymKey(p.mes) === key);
    return idx === -1 ? null : idx;
  }

  function tarjetaAlertaFlujo(pico) {
    if (!pico) return '<div class="vacio">Sin dato de pico para esta capa.</div>';
    const roja = num(pico.monto_pico) < 0;
    const cruceTxt = pico.mes_cruce_positivo
      ? `cruza a positivo en ${esc(mesLargo(pico.mes_cruce_positivo))}`
      : 'no cruza a positivo dentro del horizonte del plan';
    return `<div style="margin:0 0 10px;padding:11px 15px;border-radius:8px;font-weight:700;
      background:${roja ? 'var(--rojo-bg)' : '#EEEDE5'};color:${roja ? 'var(--rojo)' : 'var(--gris)'}">
      Pico de exposición: ${usd(pico.monto_pico)} en ${esc(mesLargo(pico.mes_pico))} · ${cruceTxt} · cierre ${usd(pico.saldo_final)}.
    </div>`;
  }

  function svgFlujoHtml(serie, campoAcum, pico) {
    const g = escalaFlujo(serie, campoAcum);
    const pts = serie.map((p, i) => [g.x(i), g.y(num(p[campoAcum]))]);
    const linea = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const area = pts.length
      ? `M${pts[0][0].toFixed(1)},${g.yZero.toFixed(1)} ` +
        pts.map(([px, py]) => `L${px.toFixed(1)},${py.toFixed(1)}`).join(' ') +
        ` L${pts[pts.length - 1][0].toFixed(1)},${g.yZero.toFixed(1)} Z`
      : '';

    // Ticks del eje X: se muestran cada N puntos para no amontonar etiquetas si hay muchos meses.
    const paso = Math.max(1, Math.ceil(g.n / 7));
    const ticks = serie.map((p, i) => (i % paso === 0 || i === g.n - 1)
      ? `<text x="${g.x(i).toFixed(1)}" y="${g.H - 8}" font-size="9" fill="var(--gris)" text-anchor="middle">${esc(mesLargo(p.mes))}</text>`
      : '').join('');

    const idxPico = pico ? marcadorMes(serie, pico.mes_pico) : null;
    const idxCruce = pico && pico.mes_cruce_positivo ? marcadorMes(serie, pico.mes_cruce_positivo) : null;
    const marcador = (idx, etiqueta, arriba) => {
      if (idx == null) return '';
      const val = num(serie[idx][campoAcum]);
      const [px, py] = [g.x(idx), g.y(val)];
      const color = val < 0 ? 'var(--rojo)' : 'var(--verde)';
      return `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" fill="${color}" stroke="#fff" stroke-width="1.2"/>
        <text x="${px.toFixed(1)}" y="${(py + (arriba ? -8 : 14)).toFixed(1)}" font-size="9" font-weight="700" text-anchor="middle" fill="${color}">${etiqueta}</text>`;
    };

    // Dos rects de recorte (por encima/por debajo de cero) para pintar área y línea en verde arriba
    // y rojo abajo SIN calcular el cruce exacto por interpolación: el recorte lo hace por pixeles.
    const rectPos = `x="0" y="${g.padT.toFixed(1)}" width="${g.W}" height="${Math.max(0, g.yZero - g.padT).toFixed(1)}"`;
    const rectNeg = `x="0" y="${g.yZero.toFixed(1)}" width="${g.W}" height="${Math.max(0, g.H - g.padB - g.yZero).toFixed(1)}"`;

    return `<svg viewBox="0 0 ${g.W} ${g.H}" width="100%" height="220" preserveAspectRatio="none" style="display:block;overflow:visible">
      <clipPath id="prjClipPos"><rect ${rectPos}/></clipPath>
      <clipPath id="prjClipNeg"><rect ${rectNeg}/></clipPath>
      <line x1="0" y1="${g.yZero.toFixed(1)}" x2="${g.W}" y2="${g.yZero.toFixed(1)}" stroke="var(--gris-claro)" stroke-width="1" stroke-dasharray="3,3"/>
      <path d="${area}" fill="var(--verde-claro)" clip-path="url(#prjClipPos)"/>
      <path d="${area}" fill="var(--rojo-bg)" clip-path="url(#prjClipNeg)"/>
      <path d="${linea}" fill="none" stroke="var(--verde)" stroke-width="1.8" clip-path="url(#prjClipPos)"/>
      <path d="${linea}" fill="none" stroke="var(--rojo)" stroke-width="1.8" clip-path="url(#prjClipNeg)"/>
      ${ticks}
      ${marcador(idxPico, 'Pico', false)}
      ${idxCruce != null ? marcador(idxCruce, 'Cruce', true) : ''}
    </svg>`;
  }

  /* Repinta SOLO #flujoBody (sin refetch) al cambiar el toggle Plein/Santana/Total. */
  function pintarFlujo(capa) {
    const body = document.getElementById('flujoBody');
    if (!body) return;
    const serie = estado.flujo || [];
    const [, , campoAcum] = CAPAS_FLUJO.find(c => c[0] === capa) || CAPAS_FLUJO[0];
    const pico = (estado.flujoPico || []).find(p => p.capa === capa) || null;
    body.innerHTML = tarjetaAlertaFlujo(pico) + svgFlujoHtml(serie, campoAcum, pico);
  }

  // HTML estático de la sección (toggle + contenedor); pintarFlujo() rellena #flujoBody después
  // de que ERP.abrirPanel inserta este HTML en el DOM. Sin datos → estado vacío, sin toggle.
  function seccionFlujo() {
    const serie = estado.flujo || [];
    if (!serie.length) {
      return '<div class="vacio">Este proyecto no tiene plan de flujo sembrado todavía.</div>';
    }
    // El toggle Plein/Productor/Total solo tiene sentido si el proyecto de verdad tiene una
    // segunda capa (santana_acum != 0 en algún mes). Se calcula de la serie, nunca hardcodeado:
    // hoy TODOS los proyectos son single-layer, así que el toggle no se pinta en ninguno.
    const hayProductor = serie.some(p => num(p.santana_acum) !== 0);
    return `<div id="flujoWrap">
      ${hayProductor ? `<div class="filtros">
        ${CAPAS_FLUJO.map(([clave, etiqueta], i) => `<button class="chip${i === 0 ? ' activo' : ''}" data-capa="${clave}">${etiqueta}</button>`).join('')}
      </div>` : ''}
      <div id="flujoBody"></div>
    </div>`;
  }

  function tablaContratos(rows) {
    if (!rows.length) return '<div class="vacio">Sin contratos.</div>';
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Producto</th><th>Periodo</th><th class="num">Cargas/sem</th><th class="num">Cargas est.</th>
        <th class="num">Ganancia/carga</th><th class="num">Ganancia est.</th><th class="num">Precio/caja</th></tr></thead>
      <tbody>${rows.map(c => `<tr>
        <td>${esc(c.producto || '—')}${c.descripcion ? ` <span style="color:var(--gris)">· ${esc(c.descripcion)}</span>` : ''}</td>
        <td class="mono">${esc(fecha(c.f_desde))} — ${esc(fecha(c.f_hasta))}</td>
        <td class="num">${c.cargas_por_semana ?? '—'}</td>
        <td class="num">${c.cargas_estimadas ?? '—'}</td>
        <td class="num">${c.ganancia_por_carga == null ? '—' : usd(c.ganancia_por_carga)}</td>
        <td class="num">${c.ganancia_estimada == null ? '—' : usd(c.ganancia_estimada)}</td>
        <td class="num">${c.precio_caja_detalle == null ? '—' : usd(c.precio_caja_detalle)}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  function libro(rows, puedeCap) {
    const btn = puedeCap ? '<button class="btn-mini" id="prjMovLinea" style="margin-bottom:10px">+ Registrar movimiento de línea</button>' : '';
    if (!rows.length) return `${btn}<div class="vacio">Sin movimientos en la línea.</div>`;
    return `${btn}<div class="tabla-wrap"><table>
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Efecto</th><th class="num">Monto</th><th>Mov.</th><th>Embarque</th><th>Nota</th></tr></thead>
      <tbody>${rows.map(a => `<tr>
        <td class="mono">${esc(fecha(a.fecha))}</td>
        <td>${esc(a.tipo || '—')}</td>
        <td><span class="pill ${EFECTO_CLASE[a.efecto] || 'gris'}">${esc(a.efecto || '—')}</span></td>
        <td class="num">${a.monto == null ? '—' : usd(a.monto)}</td>
        <td class="mono">${a.movimiento_folio ? `<span class="enlace" data-ir-tesoreria="${esc(a.movimiento_folio)}" title="Ver en Tesorería">${esc(a.movimiento_folio)}</span>` : '—'}</td>
        <td class="mono">${a.carga_folio ? `<span class="enlace" data-ir-carga="${esc(a.carga_folio)}">${esc(a.carga_folio)}</span>` : '—'}</td>
        <td>${esc(a.nota || '')}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  function presupuesto(rows, puedeCap) {
    // Subtítulo (E45): distingue este presupuesto de gastos blandos del plan de flujo de la línea
    // de arriba — sin esto, "Sin presupuesto capturado" se leía como si faltara el flujo.
    const sub = '<div class="leyenda">Gastos blandos del proyecto (viáticos, QC en campo, asesoría, legal…). Es distinto del plan de flujo de arriba.</div>';
    const btn = puedeCap ? '<button class="btn-mini" id="prjPresu" style="margin:10px 0">+ Línea de presupuesto</button>' : '';
    if (!rows.length) return `${sub}${btn}<div class="vacio">Sin presupuesto capturado.</div>`;
    const sorted = rows.slice().sort((a, b) => num(a.categoria_orden) - num(b.categoria_orden) || String(a.mes).localeCompare(String(b.mes)));
    return `${sub}${btn}<div class="tabla-wrap"><table>
      <thead><tr><th>Mes</th><th>Concepto</th><th>Categoría</th><th>Absorbe</th><th class="num">Monto</th><th>Nota</th></tr></thead>
      <tbody>${sorted.map(r => `<tr>
        <td class="mono">${esc(ERP.mesTexto ? ERP.mesTexto(r.mes) : fecha(r.mes))}</td>
        <td>${esc(r.concepto || '—')}</td>
        <td>${esc(r.categoria || '—')}</td>
        <td><span class="pill gris">${esc(r.absorbe || '—')}</span></td>
        <td class="num">${r.monto == null ? '—' : usd(r.monto)}</td>
        <td>${esc(r.nota || '')}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  function ligas(movs, cargas) {
    const tMovs = movs.length ? `<div class="tabla-wrap"><table>
      <thead><tr><th>Folio</th><th>Fecha</th><th>Descripción</th><th>Tipo</th><th class="num">Ingreso</th><th class="num">Egreso</th></tr></thead>
      <tbody>${movs.map(m => `<tr>
        <td class="mono"><span class="enlace" data-ir-tesoreria="${esc(m.folio)}">${esc(m.folio)}</span></td>
        <td class="mono">${esc(fecha(m.fecha))}</td>
        <td>${esc(m.descripcion || '—')}</td>
        <td>${esc(m.tipo || '—')}</td>
        <td class="num">${num(m.ingreso) ? usd(m.ingreso) : '—'}</td>
        <td class="num">${num(m.egreso) ? usd(m.egreso) : '—'}</td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="vacio" style="padding:8px 0">Sin movimientos ligados.</div>';
    const tCargas = cargas.length ? `<div class="tabla-wrap"><table>
      <thead><tr><th>Embarque</th><th>P.O.</th><th>Estado</th><th>Producto</th><th class="num">Venta</th></tr></thead>
      <tbody>${cargas.map(c => `<tr>
        <td class="mono"><span class="enlace" data-ir-carga="${esc(c.folio)}">${esc(c.folio)}</span></td>
        <td class="mono">${c.po ? esc(c.po) : '—'}</td>
        <td>${badgeEstado(c.estado)}</td>
        <td>${esc(c.producto || '—')}</td>
        <td class="num">${c.ingreso_venta == null ? '—' : usd(c.ingreso_venta)}</td></tr>`).join('')}</tbody>
    </table></div>` : '<div class="vacio" style="padding:8px 0">Sin embarques ligados.</div>';
    return `<details style="margin-top:6px"><summary style="cursor:pointer;font-weight:600">Movimientos ligados (${movs.length})</summary>${tMovs}</details>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Embarques ligados (${cargas.length})</summary>${tCargas}</details>`;
  }

  /* ================= Modales de escritura ================= */
  function abrirModal(titulo, innerHTML) {
    const ov = document.createElement('div');
    ov.className = 'modal-ov';
    ov.innerHTML = `<div class="modal-box"><h3 style="margin:0 0 12px">${titulo}</h3>${innerHTML}<div class="aviso" id="mAviso"></div></div>`;
    document.body.appendChild(ov);
    const cerrar = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
    const setA = (tipo, html) => { const a = ov.querySelector('#mAviso'); a.className = 'aviso visible ' + tipo; a.innerHTML = html; };
    return { ov, cerrar, setA };
  }

  function registrarMovLinea() {
    const TIPOS = [['disposicion', 'Disposición'], ['recuperacion', 'Recuperación'], ['valuacion_especie', 'Valuación en especie'], ['interes', 'Interés'], ['ajuste_cargo', 'Ajuste (cargo)'], ['ajuste_abono', 'Ajuste (abono)']];
    const { ov, cerrar, setA } = abrirModal(`Movimiento de línea · ${esc(estado.codigo)}`, `
      <div class="form-erp"><div class="campos">
        <div class="campo"><label>Tipo <span class="req">*</span></label><select id="amTipo">${TIPOS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
        <div class="campo"><label>Monto <span class="req">*</span></label><input id="amMonto" class="mono" type="number" step="0.01" min="0" placeholder="0.00"></div>
        <div class="campo"><label>Fecha</label><input id="amFecha" type="date" value="${hoyISO()}" max="${hoyISO()}"></div>
        <div class="campo"><label>Folio de movimiento (opcional)</label><input id="amMov" class="mono" type="number" step="1" min="1" placeholder="ej. 311"></div>
        <div class="campo"><label>Embarque (opcional)</label><input id="amCarga" class="mono" type="text" placeholder="ej. P-077"></div>
        <div class="campo ancho"><label>Nota</label><input id="amNota" type="text" maxlength="200"></div>
      </div><div class="acciones"><button class="btn-mini" id="amGuardar">Registrar</button><button class="btn-mini gris" id="amCancelar">Cancelar</button></div></div>`);
    ov.querySelector('#amCancelar').addEventListener('click', cerrar);
    const val = id => ov.querySelector('#' + id).value;
    ov.querySelector('#amGuardar').addEventListener('click', async () => {
      const monto = Number(val('amMonto'));
      if (!(monto > 0)) { setA('err', 'El monto debe ser mayor a cero.'); return; }
      const btn = ov.querySelector('#amGuardar'); btn.disabled = true; setA('warn', 'Registrando…');
      try {
        const data = await rpc('fn_registrar_amortizacion', {
          p_proyecto: estado.codigo, p_tipo: val('amTipo'), p_monto: monto,
          p_fecha: val('amFecha') || null,
          p_movimiento_folio: val('amMov') ? Number(val('amMov')) : null,
          p_carga_folio: val('amCarga').trim() || null,
          p_nota: val('amNota').trim() || null
        });
        ERP.marcarDatosSucios(); ERP.toast('ok', esc(textoRpc(data))); cerrar(); verProyecto(estado.codigo);
      } catch (e) {
        if (!ERP.avisarSiPermiso(e)) setA('err', `El ERP rechazó el movimiento: ${esc(e.message)}`);
        btn.disabled = false;
      }
    });
  }

  function capturarPresupuesto() {
    const ABSORBE = ['plein', 'productor', 'compartido', 'no_aplica'];
    const cats = estado.cats || [];
    const { ov, cerrar, setA } = abrirModal(`Línea de presupuesto · ${esc(estado.codigo)}`, `
      <div class="form-erp"><div class="campos">
        <div class="campo"><label>Mes <span class="req">*</span></label><input id="buMes" type="month" value="${hoyISO().slice(0, 7)}"></div>
        <div class="campo"><label>Monto <span class="req">*</span></label><input id="buMonto" class="mono" type="number" step="0.01" placeholder="0.00"></div>
        <div class="campo ancho"><label>Concepto <span class="req">*</span></label><input id="buConcepto" type="text" maxlength="120"></div>
        <div class="campo"><label>Categoría</label><select id="buCat"><option value="">—</option>${cats.map(c => `<option value="${esc(c.nombre)}">${esc(c.nombre)}</option>`).join('')}</select></div>
        <div class="campo"><label>Absorbe</label><select id="buAbsorbe">${ABSORBE.map(a => `<option value="${a}">${a}</option>`).join('')}</select></div>
        <div class="campo ancho"><label>Nota</label><input id="buNota" type="text" maxlength="200"></div>
      </div><div class="acciones"><button class="btn-mini" id="buGuardar">Guardar</button><button class="btn-mini gris" id="buCancelar">Cancelar</button></div></div>`);
    ov.querySelector('#buCancelar').addEventListener('click', cerrar);
    const val = id => ov.querySelector('#' + id).value;
    ov.querySelector('#buGuardar').addEventListener('click', async () => {
      const monto = Number(val('buMonto'));
      const mes = val('buMes'), concepto = val('buConcepto').trim();
      if (!mes) { setA('err', 'Elige el mes.'); return; }
      if (!concepto) { setA('err', 'El concepto es obligatorio.'); return; }
      if (Number.isNaN(monto)) { setA('err', 'El monto no es válido.'); return; }
      const btn = ov.querySelector('#buGuardar'); btn.disabled = true; setA('warn', 'Guardando…');
      try {
        const data = await rpc('fn_capturar_presupuesto', {
          p_mes: mes + '-01', p_concepto: concepto, p_monto: monto,
          p_proyecto: estado.codigo, p_categoria: val('buCat') || null,
          p_absorbe: val('buAbsorbe') || null, p_nota: val('buNota').trim() || null
        });
        ERP.marcarDatosSucios(); ERP.toast('ok', esc(textoRpc(data))); cerrar(); verProyecto(estado.codigo);
      } catch (e) {
        if (!ERP.avisarSiPermiso(e)) setA('err', `El ERP rechazó la línea: ${esc(e.message)}`);
        btn.disabled = false;
      }
    });
  }

  function editarProyecto() {
    const p = estado.p;
    const { ov, cerrar, setA } = abrirModal(`Editar ${esc(p.codigo)}`, `
      <div class="form-erp"><div class="campos">
        <div class="campo"><label>Estado</label><select id="edEstado">${['activo', 'cerrado', 'cancelado'].map(s => `<option value="${s}"${s === p.estado ? ' selected' : ''}>${s}</option>`).join('')}</select></div>
        <div class="campo"><label>Tasa anual (%)</label><input id="edTasa" class="mono" type="number" step="0.01" value="${p.tasa_anual != null ? esc(p.tasa_anual) : ''}"></div>
        <div class="campo"><label>Vigencia tasa desde</label><input id="edVig" type="date" value="${p.tasa_vigencia_desde ? esc(String(p.tasa_vigencia_desde).slice(0, 10)) : ''}"></div>
        <div class="campo"><label>Precio valuación especie</label><input id="edPrecio" class="mono" type="number" step="0.01" value="${p.precio_valuacion_especie != null ? esc(p.precio_valuacion_especie) : ''}"></div>
        <div class="campo ancho"><label>Nota</label><input id="edNota" type="text" maxlength="200" value="${esc(p.nota || '')}"></div>
        <div class="campo ancho"><label>Motivo del cambio</label><input id="edMotivo" type="text" maxlength="200" placeholder="Queda en bitácora"></div>
      </div><div class="acciones"><button class="btn-mini" id="edGuardar">Guardar</button><button class="btn-mini gris" id="edCancelar">Cancelar</button></div></div>`);
    ov.querySelector('#edCancelar').addEventListener('click', cerrar);
    const val = id => ov.querySelector('#' + id).value;
    ov.querySelector('#edGuardar').addEventListener('click', async () => {
      // Solo se mandan los campos que el usuario cambió; el resto va null ("no tocar").
      const camb = (nuevo, orig) => nuevo !== String(orig ?? '') ? nuevo : null;
      const estadoNv = camb(val('edEstado'), p.estado);
      const tasaNv = camb(val('edTasa'), p.tasa_anual != null ? p.tasa_anual : '');
      const vigNv = camb(val('edVig'), p.tasa_vigencia_desde ? String(p.tasa_vigencia_desde).slice(0, 10) : '');
      const precioNv = camb(val('edPrecio'), p.precio_valuacion_especie != null ? p.precio_valuacion_especie : '');
      const notaNv = camb(val('edNota'), p.nota || '');
      const motivo = val('edMotivo').trim() || null;
      const btn = ov.querySelector('#edGuardar'); btn.disabled = true; setA('warn', 'Guardando…');
      try {
        const data = await rpc('fn_editar_proyecto', {
          p_codigo: p.codigo,
          p_estado: estadoNv,
          p_tasa_anual: tasaNv === null || tasaNv === '' ? null : Number(tasaNv),
          p_tasa_vigencia_desde: vigNv || null,
          p_precio_valuacion_especie: precioNv === null || precioNv === '' ? null : Number(precioNv),
          p_nota: notaNv,
          p_motivo: motivo
        });
        ERP.marcarDatosSucios(); ERP.toast('ok', esc(textoRpc(data))); cerrar(); verProyecto(p.codigo);
      } catch (e) {
        if (!ERP.avisarSiPermiso(e)) setA('err', `El ERP rechazó la edición: ${esc(e.message)}`);
        btn.disabled = false;
      }
    });
  }

  ERP.verProyecto = verProyecto;
  ERP.registrar('proyectos', {
    titulo: 'Proyectos',
    descripcion: 'Financiamiento a productores — línea de crédito, contratos y rentabilidad',
    render
  });
})();
