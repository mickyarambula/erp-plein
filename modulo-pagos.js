/* Módulo Pagos — CxP por proveedor, cola FIFO y drill-down por proveedor.
   La lista "Saldo por proveedor" y el cajón de detalle usan el MISMO modelo atribuido/estimado
   (v_cxp_proveedor_atribuido y v_cxp_detalle_proveedor_atribuido) — antes el cajón usaba el
   directo (v_cxp_detalle_proveedor) y salía vacío para proveedores de servicio sin costo asentado
   por línea (BBA, Las Brisas, AGRICOOLING, LAM, SUAREZ). El directo (v_cxp) sigue siendo lo
   asentado/Cuadre en el resto de la app; aquí solo cambió este cajón.
   "CxP por lote" (E77): v_cxp_lote(lote_folio, contraparte_id, proveedor, costo, pagado_estimado,
   saldo_estimado) — CxP granular por lote×proveedor, complementa (no reemplaza) a
   v_cxp_proveedor_atribuido. Solo lectura, agrupable por proveedor o por lote.

   E92: vestida con la gramática "Operador estilo Silo" (ver REPORTE-FRONTEND.md, E90/E91/E92).
   SCOPE = .pantalla-cxp, wrapper nuevo alrededor de TODO lo que pinta render() (mismo patrón que
   .pantalla-embarques y .pantalla-cxc) — verProveedor() abre en el panel/drawer global
   #panelBody, compartido por TODA la app, y se deja FUERA del wrapper a propósito (misma
   frontera que la ficha de carga en Embarques y el drill-down de cliente en CxC).
   Tira de KPIs: SOLO "Total por pagar" (modelo atribuido, el mismo que ya suma pintarProveedores
   para su <tfoot>) — "Próximos vencimientos" (v_cxp_proximas, columna saldo_cxp) es del modelo
   DIRECTO, no atribuido; no se mezclan en la misma tira de KPIs para no confundir los dos
   modelos (regla dura de la tarea). */

(function () {
  'use strict';
  const { q, esc, usd, num, fmt } = ERP;

  const COLS_PROV = ['proveedor', 'proveedor_nombre', 'contraparte', 'nombre', 'razon_social'];
  const COLS_SALDO = ['saldo_cxp', 'saldo', 'pendiente', 'monto'];

  // Nota de estimación compartida por la lista "Saldo por proveedor" y este cajón de detalle —
  // mismo texto en los dos lugares, el cajón hereda el modelo atribuido de la lista (antes usaba
  // el directo, que sale vacío para proveedores de servicio como BBA/Las Brisas/AGRICOOLING/LAM/SUAREZ).
  const NOTA_ESTIMADO = 'Pagado y saldo por proveedor son ESTIMADOS por prorrateo: los pagos se registran a nivel carga, no por línea de costo.';

  /* ---------- Drill-down: cargas pendientes de un proveedor ----------
     v_cxp_detalle_proveedor_atribuido: proveedor, contraparte_id, folio, po, estado, f_embarque,
                                        costo, pagado_estimado, saldo_estimado. */

  let proveedoresRows = [];   // v_cxp_proveedor_atribuido, cacheada por render() para resolver contraparte_id por nombre

  async function verProveedor(proveedor, contraparteId) {
    ERP.abrirPanel(esc(proveedor), 'Cargando desglose…', '<div class="skel">Cargando…</div>');
    try {
      if (contraparteId == null) {
        const provCol = ERP.columna(proveedoresRows, COLS_PROV);
        const match = provCol && proveedoresRows.find(r => r[provCol] === proveedor);
        if (match) contraparteId = match.contraparte_id;
      }
      const filtro = contraparteId != null
        ? `&contraparte_id=eq.${encodeURIComponent(contraparteId)}`
        : `&proveedor=${ERP.eq(proveedor)}`;
      const filas = await q('v_cxp_detalle_proveedor_atribuido', `${filtro}&order=f_embarque.asc`);
      const total = filas.reduce((s, r) => s + num(r.saldo_estimado), 0);

      const infoNota = `<span class="info-nota" data-nota="${esc(NOTA_ESTIMADO)}" title="${esc(NOTA_ESTIMADO)}" role="button" tabindex="0" style="cursor:help;color:var(--gris)">ⓘ</span>`;

      const cuerpo = filas.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Carga</th><th>PO</th><th>Estado</th><th>Embarque</th>
          <th class="num">Costo</th><th class="num">Pagado ${infoNota}</th><th class="num">Saldo ${infoNota}</th></tr></thead>
        <tbody>${filas.map(r => `<tr class="clic" data-folio="${esc(r.folio)}">
          <td class="mono"><span class="enlace">${esc(r.folio)}</span></td>
          <td>${esc(r.po || '—')}</td>
          <td><span class="pill gris">${esc(r.estado || '—')}</span></td>
          <td>${esc(ERP.fecha(r.f_embarque))}</td>
          <td class="num">${usd(r.costo)}</td>
          <td class="num">${usd(r.pagado_estimado)}</td>
          <td class="num neg">${usd(r.saldo_estimado)}</td></tr>`).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="4">Total (${filas.length})</td>
          <td class="num">${usd(filas.reduce((s, r) => s + num(r.costo), 0))}</td>
          <td class="num">${usd(filas.reduce((s, r) => s + num(r.pagado_estimado), 0))}</td>
          <td class="num">${usd(total)}</td></tr></tfoot>
      </table></div>` : '<div class="vacio">Este proveedor no tiene saldo pendiente.</div>';

      ERP.abrirPanel(
        esc(proveedor),
        `${filas.length} carga${filas.length === 1 ? '' : 's'} por pagar · total ${usd(total)}`,
        cuerpo + (filas.length
          ? '<div class="leyenda">Pagado y saldo son estimados por prorrateo (mismo modelo que la lista). Toca una fila para abrir la ficha de la carga.</div>' : '')
      );
      ERP.enlazarFolios(document.getElementById('panelBody'));
      ERP.cablearInfoNota(document.getElementById('panelBody'));
    } catch (e) {
      ERP.abrirPanel(esc(proveedor), '', `<div class="errbox">No se pudo cargar el desglose: ${esc(e.message)}</div>`);
    }
  }

  /* ---------- Lista de proveedores ---------- */

  /** Mismo total que arma el <tfoot> de pintarProveedores, expuesto aparte para la tira de KPIs
      en render() (sin duplicar la resolución defensiva de columna — E92). */
  function totalPorPagar(filas) {
    const saldoCol = ERP.columna(filas, COLS_SALDO);
    if (!saldoCol) return 0;
    return filas.filter(r => num(r[saldoCol]) > 0.009).reduce((s, r) => s + num(r[saldoCol]), 0);
  }

  function pintarProveedores(filas) {
    if (!filas.length) return '<div class="vacio">Sin saldos por pagar.</div>';
    const provCol = ERP.columna(filas, COLS_PROV);
    const saldoCol = ERP.columna(filas, COLS_SALDO);
    if (!provCol || !saldoCol) return ERP.tablaAuto(filas);   // esquema inesperado: muéstralo tal cual

    const cargasCol = ERP.columna(filas, ['cargas', 'n_cargas', 'num_cargas']);
    const puedeCap = ERP.puede('capturar');
    const conSaldo = filas.filter(r => num(r[saldoCol]) > 0.009).sort((a, b) => num(b[saldoCol]) - num(a[saldoCol]));
    const total = conSaldo.reduce((s, r) => s + num(r[saldoCol]), 0);

    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Proveedor</th>${cargasCol ? '<th class="num">Cargas</th>' : ''}
        <th class="num">Saldo CxP <span class="info-nota" data-nota="${esc(NOTA_ESTIMADO)}" title="${esc(NOTA_ESTIMADO)}" role="button" tabindex="0" style="cursor:help;color:var(--i2)">ⓘ</span></th><th class="num">% del total</th></tr></thead>
      <tbody>${conSaldo.map(r => `<tr class="clic" data-prov="${esc(r[provCol])}">
        <td class="prov"><span class="enlace">${esc(r[provCol])}</span>${puedeCap ? ` <button class="btn-cap" data-cap-prov="${esc(r[provCol])}" title="Registrar un pago a ${esc(r[provCol])}">+ pago</button>` : ''}</td>
        ${cargasCol ? `<td class="num">${esc(r[cargasCol])}</td>` : ''}
        <td class="num">${usd(r[saldoCol])}</td>
        <td class="num">${total > 0 ? fmt(num(r[saldoCol]) / total * 100) + '%' : '—'}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr class="total"><td>Total por pagar</td>${cargasCol ? '<td></td>' : ''}
        <td class="num">${usd(total)}</td><td class="num">100%</td></tr></tfoot>
    </table></div>
    <div class="leyenda">Toca un proveedor para ver las cargas que componen su saldo.</div>`;
  }

  /* ---------- Próximos vencimientos ----------
     v_cxp_proximas ya viene ordenada por fecha de vencimiento y trae dias_credito,
     f_vencimiento, dias_vencido y vencida (calculados por el backend). */

  function pintarCola(rows) {
    if (!rows.length) return '<div class="vacio">Nada por pagar.</div>';
    const total = rows.reduce((s, r) => s + num(r.saldo_cxp), 0);
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Carga</th><th>Proveedor</th><th>Vence</th><th>Situación</th><th class="num">Monto</th></tr></thead>
      <tbody>${rows.map(r => {
        const v = ERP.venc(r.dias_vencido);
        return `<tr class="clic" data-folio="${esc(r.folio)}">
          <td class="mono"><span class="enlace">${esc(r.folio)}</span></td>
          <td class="prov">${esc(r.proveedor)}</td>
          <td>${r.f_vencimiento ? esc(ERP.fecha(r.f_vencimiento)) : '—'}</td>
          <td class="${v.cls}">${esc(v.txt)}</td>
          <td class="num">${usd(r.saldo_cxp)}</td>
        </tr>`;
      }).join('')}</tbody>
      <tfoot><tr class="total"><td colspan="4">Total por pagar (${rows.length})</td>
        <td class="num">${usd(total)}</td></tr></tfoot>
    </table></div>
    <div class="leyenda">Ordenado por <b>fecha de vencimiento</b>: lo que vence antes, primero.
      <b>Vence</b> = embarque + días de crédito. Situación en rojo = ya vencida; verde = aún por vencer.
      Toca una fila para abrir la ficha de la carga.</div>`;
  }

  /* ---------- CxP por lote (E77, solo lectura) ---------- */

  let cxpLoteRows = [];
  let cxpLoteAgrupacion = 'proveedor';   // 'proveedor' | 'lote'

  function pintarCxpLote() {
    const rows = cxpLoteRows;
    if (!rows.length) return '<div class="vacio">Sin costo por lote todavía.</div>';

    if (cxpLoteAgrupacion === 'lote') {
      const ordenado = [...rows].sort((a, b) => num(b.saldo_estimado) - num(a.saldo_estimado));
      return `<div class="tabla-wrap"><table>
        <thead><tr><th>Lote</th><th>Proveedor</th><th class="num">Costo</th>
          <th class="num">Pagado (est.)</th><th class="num">Saldo (est.)</th></tr></thead>
        <tbody>${ordenado.map(r => `<tr class="clic" data-lote="${esc(r.lote_folio)}">
          <td class="mono"><span class="enlace">${esc(r.lote_folio)}</span></td>
          <td class="prov">${esc(r.proveedor || '—')}</td>
          <td class="num">${usd(r.costo)}</td>
          <td class="num">${usd(r.pagado_estimado)}</td>
          <td class="num">${usd(r.saldo_estimado)}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="2">Total (${ordenado.length} lote${ordenado.length === 1 ? '' : 's'})</td>
          <td class="num">${usd(ordenado.reduce((s, r) => s + num(r.costo), 0))}</td>
          <td class="num">${usd(ordenado.reduce((s, r) => s + num(r.pagado_estimado), 0))}</td>
          <td class="num">${usd(ordenado.reduce((s, r) => s + num(r.saldo_estimado), 0))}</td></tr></tfoot>
      </table></div>`;
    }

    // Agrupado por proveedor (default).
    const grupos = {};
    rows.forEach(r => {
      const k = r.proveedor || '—';
      if (!grupos[k]) grupos[k] = { proveedor: k, lotes: 0, costo: 0, pagado: 0, saldo: 0 };
      grupos[k].lotes++;
      grupos[k].costo += num(r.costo);
      grupos[k].pagado += num(r.pagado_estimado);
      grupos[k].saldo += num(r.saldo_estimado);
    });
    const lista = Object.values(grupos).sort((a, b) => b.saldo - a.saldo);
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Proveedor</th><th class="num">Lotes</th><th class="num">Costo</th>
        <th class="num">Pagado (est.)</th><th class="num">Saldo (est.)</th></tr></thead>
      <tbody>${lista.map(g => `<tr>
        <td class="prov">${esc(g.proveedor)}</td>
        <td class="num">${g.lotes}</td>
        <td class="num">${usd(g.costo)}</td>
        <td class="num">${usd(g.pagado)}</td>
        <td class="num">${usd(g.saldo)}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr class="total"><td>Total</td><td class="num">${lista.reduce((s, g) => s + g.lotes, 0)}</td>
        <td class="num">${usd(lista.reduce((s, g) => s + g.costo, 0))}</td>
        <td class="num">${usd(lista.reduce((s, g) => s + g.pagado, 0))}</td>
        <td class="num">${usd(lista.reduce((s, g) => s + g.saldo, 0))}</td></tr></tfoot>
    </table></div>`;
  }

  function pintarSeccionCxpLote() {
    const cont = document.getElementById('cxpLoteTabla');
    if (!cont) return;
    cont.innerHTML = pintarCxpLote();
    if (cxpLoteAgrupacion === 'lote') {
      cont.querySelectorAll('tr.clic[data-lote]').forEach(tr =>
        tr.addEventListener('click', () => { if (ERP.verLote) { ERP.ir('lotes'); setTimeout(() => ERP.verLote(tr.dataset.lote), 60); } }));
    }
  }

  /* ---------- Módulo ---------- */

  async function render(cont, parametro) {
    const [proveedores, cola, cxpLote] = await Promise.all([
      q('v_cxp_proveedor_atribuido').catch(() => []),
      q('v_cxp_proximas').catch(() => []),
      q('v_cxp_lote').catch(() => [])
    ]);
    cxpLoteRows = cxpLote || [];
    cxpLoteAgrupacion = 'proveedor';
    proveedoresRows = proveedores || [];

    // Tira de KPIs (E92): un solo total, el mismo que ya arma el <tfoot> de pintarProveedores.
    const kpistrip = `<div class="kpistrip"><div class="kpi">
      <div class="k">Total por pagar</div><div class="v">${usd(totalPorPagar(proveedoresRows))}</div>
    </div></div>`;

    cont.innerHTML = `
      <div class="pantalla-cxp">
      ${kpistrip}
      ${ERP.botonesExportar ? ERP.botonesExportar('CuentasPorPagar', 'Cuentas por Pagar', '') : ''}
      <h2 class="sec">Saldo por proveedor</h2>
      <div class="card">${pintarProveedores(proveedores)}</div>

      <h2 class="sec">Próximos vencimientos</h2>
      <div class="card">${pintarCola(cola)}</div>

      <div class="seccion-head"><h2 class="sec" style="margin:0">CxP por lote</h2>
        <select class="busca" id="cxpLoteAgrup" style="max-width:160px">
          <option value="proveedor">Agrupar por proveedor</option>
          <option value="lote">Agrupar por lote</option>
        </select>
      </div>
      <div class="card"><div id="cxpLoteTabla"></div></div>
      <div class="leyenda">CxP granular por lote×proveedor (E77) — complementa el saldo por
        proveedor de arriba. Pagado y saldo también son ESTIMADOS por prorrateo.</div>
      </div>`;

    cont.querySelectorAll('tr.clic[data-prov]').forEach(tr =>
      tr.addEventListener('click', () => ERP.irModulo('pagos', tr.dataset.prov)));

    cont.querySelectorAll('[data-cap-prov]').forEach(b =>
      b.addEventListener('click', e => {
        e.stopPropagation();
        ERP.capturarMovimiento({ modo: 'pago', contraparte: b.dataset.capProv });
      }));

    const selAgrup = document.getElementById('cxpLoteAgrup');
    if (selAgrup) selAgrup.addEventListener('change', e => { cxpLoteAgrupacion = e.target.value; pintarSeccionCxpLote(); });
    pintarSeccionCxpLote();

    ERP.enlazarFolios(cont);
    ERP.cablearInfoNota(cont);

    if (ERP.cablearExportar) ERP.cablearExportar(cont);

    if (parametro) verProveedor(parametro);
  }

  ERP.registrar('pagos', {
    titulo: 'Cuentas por Pagar',
    descripcion: 'Lo que le debemos a los proveedores',
    render
  });
})();
