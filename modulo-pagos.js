/* Módulo Pagos — CxP por proveedor, cola FIFO y drill-down por proveedor. */

(function () {
  'use strict';
  const { q, esc, usd, num, fmt } = ERP;

  const COLS_PROV = ['proveedor', 'proveedor_nombre', 'contraparte', 'nombre', 'razon_social'];
  const COLS_SALDO = ['saldo_cxp', 'saldo', 'pendiente', 'monto'];

  /* ---------- Drill-down: cargas pendientes de un proveedor ----------
     v_cxp_detalle_proveedor: folio, po, proveedor, estado, f_embarque,
                              costo_total, pagado, saldo_cxp, revision_pendiente */

  async function verProveedor(proveedor) {
    ERP.abrirPanel(esc(proveedor), 'Cargando desglose…', '<div class="skel">Cargando…</div>');
    try {
      const filas = await q('v_cxp_detalle_proveedor', `&proveedor=${ERP.eq(proveedor)}&order=f_embarque.asc`);
      const total = filas.reduce((s, r) => s + num(r.saldo_cxp), 0);

      const cuerpo = filas.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Carga</th><th>PO</th><th>Estado</th><th>Embarque</th>
          <th class="num">Costo</th><th class="num">Pagado</th><th class="num">Saldo</th></tr></thead>
        <tbody>${filas.map(r => `<tr class="clic" data-folio="${esc(r.folio)}">
          <td class="mono"><span class="enlace">${esc(r.folio)}</span>${r.revision_pendiente ? ' ⚑' : ''}</td>
          <td>${esc(r.po || '—')}</td>
          <td><span class="pill gris">${esc(r.estado || '—')}</span></td>
          <td>${esc(ERP.fecha(r.f_embarque))}</td>
          <td class="num">${usd(r.costo_total)}</td>
          <td class="num">${usd(r.pagado)}</td>
          <td class="num neg">${usd(r.saldo_cxp)}</td></tr>`).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="4">Total (${filas.length})</td>
          <td class="num">${usd(filas.reduce((s, r) => s + num(r.costo_total), 0))}</td>
          <td class="num">${usd(filas.reduce((s, r) => s + num(r.pagado), 0))}</td>
          <td class="num">${usd(total)}</td></tr></tfoot>
      </table></div>` : '<div class="vacio">Este proveedor no tiene saldo pendiente.</div>';

      ERP.abrirPanel(
        esc(proveedor),
        `${filas.length} carga${filas.length === 1 ? '' : 's'} por pagar · total ${usd(total)}`,
        cuerpo + (filas.length
          ? '<div class="leyenda">⚑ = flag activa. Toca una fila para abrir la ficha de la carga.</div>' : '')
      );
      ERP.enlazarFolios(document.getElementById('panelBody'));
    } catch (e) {
      ERP.abrirPanel(esc(proveedor), '', `<div class="errbox">No se pudo cargar el desglose: ${esc(e.message)}</div>`);
    }
  }

  /* ---------- Lista de proveedores ---------- */

  function pintarProveedores(filas) {
    if (!filas.length) return '<div class="vacio">Sin saldos por pagar.</div>';
    const provCol = ERP.columna(filas, COLS_PROV);
    const saldoCol = ERP.columna(filas, COLS_SALDO);
    if (!provCol || !saldoCol) return ERP.tablaAuto(filas);   // esquema inesperado: muéstralo tal cual

    const cargasCol = ERP.columna(filas, ['cargas', 'n_cargas', 'num_cargas']);
    const puedeCap = ERP.puede('capturar');
    const conSaldo = filas.filter(r => num(r[saldoCol]) > 0.009).sort((a, b) => num(b[saldoCol]) - num(a[saldoCol]));
    const total = conSaldo.reduce((s, r) => s + num(r[saldoCol]), 0);

    const notaEstimado = 'Pagado y saldo por proveedor son ESTIMADOS por prorrateo: los pagos se registran a nivel carga, no por línea de costo.';
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Proveedor</th>${cargasCol ? '<th class="num">Cargas</th>' : ''}
        <th class="num">Saldo CxP <span class="info-nota" data-nota="${esc(notaEstimado)}" title="${esc(notaEstimado)}" role="button" tabindex="0" style="cursor:help;color:var(--gris)">ⓘ</span></th><th class="num">% del total</th></tr></thead>
      <tbody>${conSaldo.map(r => `<tr class="clic" data-prov="${esc(r[provCol])}">
        <td><span class="enlace">${esc(r[provCol])}</span>${puedeCap ? ` <button class="btn-cap" data-cap-prov="${esc(r[provCol])}" title="Registrar un pago a ${esc(r[provCol])}">+ pago</button>` : ''}</td>
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
          <td>${esc(r.proveedor)}</td>
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

  /* ---------- Módulo ---------- */

  async function render(cont, parametro) {
    const [proveedores, cola] = await Promise.all([
      q('v_cxp_proveedor_atribuido').catch(() => []),
      q('v_cxp_proximas').catch(() => [])
    ]);

    cont.innerHTML = `
      ${ERP.botonesExportar ? ERP.botonesExportar('CuentasPorPagar', 'Cuentas por Pagar', '') : ''}
      <h2 class="sec">Saldo por proveedor</h2>
      <div class="card">${pintarProveedores(proveedores)}</div>

      <h2 class="sec">Próximos vencimientos</h2>
      <div class="card">${pintarCola(cola)}</div>`;

    cont.querySelectorAll('tr.clic[data-prov]').forEach(tr =>
      tr.addEventListener('click', () => ERP.irModulo('pagos', tr.dataset.prov)));

    cont.querySelectorAll('[data-cap-prov]').forEach(b =>
      b.addEventListener('click', e => {
        e.stopPropagation();
        ERP.capturarMovimiento({ modo: 'pago', contraparte: b.dataset.capProv });
      }));

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
