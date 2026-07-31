/* Módulo Cobranza — CxC por cliente, antigüedad de cartera y drill-down por cliente. */

(function () {
  'use strict';
  const { q, esc, usd, usd0, num, fmt } = ERP;

  /* ---------- Drill-down: cargas pendientes de un cliente ----------
     v_cxc_detalle_cliente: folio, po, cliente, estado, f_embarque, dias,
                            ingreso_venta, cobrado, saldo_cxc, revision_pendiente */

  async function verCliente(cliente) {
    ERP.abrirPanel(esc(cliente), 'Cargando desglose…', '<div class="skel">Cargando…</div>');
    try {
      const filas = await q('v_cxc_detalle_cliente', `&cliente=${ERP.eq(cliente)}&order=f_embarque.asc`);
      const total = filas.reduce((s, r) => s + num(r.saldo_cxc), 0);

      const cuerpo = filas.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Carga</th><th>PO</th><th>Estado</th><th>Embarque</th><th class="num">Días</th>
          <th class="num">Venta</th><th class="num">Cobrado</th><th class="num">Saldo</th></tr></thead>
        <tbody>${filas.map(r => {
          const d = Number(r.dias);
          const col = d >= 90 ? 'var(--rojo)' : d >= 60 ? 'var(--ambar)' : 'inherit';
          return `<tr class="clic" data-folio="${esc(r.folio)}">
            <td class="mono"><span class="enlace">${esc(r.folio)}</span>${r.revision_pendiente ? ' ⚑' : ''}</td>
            <td>${esc(r.po || '—')}</td>
            <td><span class="pill gris">${esc(r.estado || '—')}</span></td>
            <td>${esc(ERP.fecha(r.f_embarque))}</td>
            <td class="num" style="color:${col}">${r.dias == null ? '—' : esc(r.dias)}</td>
            <td class="num">${usd(r.ingreso_venta)}</td>
            <td class="num">${usd(r.cobrado)}</td>
            <td class="num pos">${usd(r.saldo_cxc)}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="5">Total (${filas.length})</td>
          <td class="num">${usd(filas.reduce((s, r) => s + num(r.ingreso_venta), 0))}</td>
          <td class="num">${usd(filas.reduce((s, r) => s + num(r.cobrado), 0))}</td>
          <td class="num">${usd(total)}</td></tr></tfoot>
      </table></div>` : '<div class="vacio">Este cliente no tiene cargas con saldo pendiente.</div>';

      ERP.abrirPanel(
        esc(cliente),
        `${filas.length} carga${filas.length === 1 ? '' : 's'} con saldo · total ${usd(total)}`,
        cuerpo + (filas.length
          ? `<div class="leyenda">Días ámbar ≥60 · rojo ≥90. ⚑ = flag activa.
             Toca una fila para abrir la ficha de la carga.</div>` : '')
      );
      ERP.enlazarFolios(document.getElementById('panelBody'));
    } catch (e) {
      ERP.abrirPanel(esc(cliente), '', `<div class="errbox">No se pudo cargar el desglose: ${esc(e.message)}</div>`);
    }
  }

  /* ---------- Antigüedad de cartera ---------- */

  function pintarAging(rows) {
    if (!rows.length) return '<div class="vacio">Sin cartera pendiente.</div>';
    const max = Math.max(...rows.map(r => num(r.saldo)), 1);
    const total = rows.reduce((s, r) => s + num(r.saldo), 0);
    const color = b => b === '0-30' ? '#1E5B3A' : b === '31-60' ? '#5F8C3E' : b === '61-90' ? '#C98A2D' : '#B3402E';
    // Cartera vencida: de saldo_vencido (backend, contra fecha de vencimiento), no del bucket.
    const vencido = rows.reduce((s, r) => s + num(r.saldo_vencido), 0);

    return rows.map(r => {
      const ex = num(r.exigible), fl = num(r.en_flag), s = num(r.saldo);
      const etq = r.bucket === '0-30' ? '0-30 días venc. (incluye por vencer)' : `${esc(r.bucket)} días vencidos`;
      return `<div class="barra-row">
        <div class="barra-top">
          <span>${etq} · ${r.cargas} carga${r.cargas === 1 ? '' : 's'} ${r.bucket === '90+' ? '⚠' : ''}</span>
          <span class="b">${usd(s)}</span>
        </div>
        <div class="barra">
          <div class="fill" style="width:${(ex / max * 100).toFixed(1)}%;background:${color(r.bucket)}">${ERP.fmt0(ex)}</div>
          ${fl > 0 ? `<div class="fill rev" style="width:${(fl / max * 100).toFixed(1)}%;background:${color(r.bucket)}" title="En revisión">${ERP.fmt0(fl)} rev.</div>` : ''}
        </div></div>`;
    }).join('') +
      `<div class="leyenda"><b>Los tramos miden días VENCIDOS</b> (hoy − fecha de vencimiento),
       no antigüedad desde el embarque; el tramo 0-30 incluye lo que aún no vence. Rayado = en revisión (flag).
       <b>Cartera vencida: ${usd(vencido)}${total > 0 ? ` (${fmt(vencido / total * 100)}% del total)` : ''}.</b>
       El desglose por cliente y el detalle por carga están en <b>Antigüedad de saldos</b>.</div>`;
  }

  /* ---------- Módulo ---------- */

  async function render(cont, parametro) {
    const [clientes, aging, dso] = await Promise.all([
      q('v_cxc_cliente'),
      q('v_cxc_aging_resumen').catch(() => []),
      q('v_kpi_rotacion_cobranza').catch(() => [])
    ]);

    const conSaldo = clientes.filter(r => num(r.saldo_cxc) > 0.009).sort((a, b) => num(b.saldo_cxc) - num(a.saldo_cxc));
    const cero = clientes.filter(r => num(r.saldo_cxc) <= 0.009);
    const total = clientes.reduce((s, r) => s + num(r.saldo_cxc), 0);

    const filasDso = dso.filter(r => r.cliente && (num(r.cobrado) > 0 || num(r.saldo_pendiente) > 0.009))
      .sort((a, b) => num(b.saldo_pendiente) - num(a.saldo_pendiente));

    const puedeCap = ERP.puede('capturar');

    cont.innerHTML = `
      ${ERP.botonesExportar ? ERP.botonesExportar('CuentasPorCobrar', 'Cuentas por Cobrar', '') : ''}
      <h2 class="sec">Saldo por cliente</h2>
      <div class="card">
        <div class="tabla-wrap"><table>
          <thead><tr><th>Cliente</th><th class="num">Cargas</th><th class="num">Saldo CxC</th><th class="num">% cartera</th></tr></thead>
          <tbody>
            ${conSaldo.map(r => `<tr class="clic" data-cliente="${esc(r.cliente)}">
              <td><span class="enlace">${esc(r.cliente)}</span>${puedeCap ? ` <button class="btn-cap" data-cap-cliente="${esc(r.cliente)}" title="Registrar un cobro de ${esc(r.cliente)}">+ cobro</button>` : ''}</td>
              <td class="num">${r.cargas}</td>
              <td class="num">${usd(r.saldo_cxc)}</td>
              <td class="num">${total > 0 ? fmt(num(r.saldo_cxc) / total * 100) + '%' : '—'}</td>
            </tr>`).join('')}
            ${cero.length ? `<tr style="color:var(--gris)">
              <td>Cobrados a cero (${cero.map(r => esc(String(r.cliente).split(' ')[0])).join(', ')})</td>
              <td class="num">${cero.reduce((s, r) => s + Number(r.cargas), 0)}</td>
              <td class="num">$0.00</td><td class="num">—</td></tr>` : ''}
          </tbody>
          <tfoot><tr class="total"><td>Total cartera</td><td></td><td class="num">${usd(total)}</td><td class="num">100%</td></tr></tfoot>
        </table></div>
        <div class="leyenda">Toca un cliente para ver las cargas que componen su saldo.</div>
      </div>

      <h2 class="sec">Antigüedad de cartera</h2>
      <div class="card">${pintarAging(aging)}</div>

      <h2 class="sec">Rotación de cobranza (DSO)</h2>
      <div class="card">
        ${filasDso.length ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Cliente</th><th class="num">Cobrado</th><th class="num">DSO (días)</th>
            <th class="num">Pendiente</th><th class="num">Antigüedad</th></tr></thead>
          <tbody>${filasDso.map(r => {
            const ant = r.antiguedad_pendiente_dias == null ? null : num(r.antiguedad_pendiente_dias);
            const col = ant != null && ant >= 90 ? 'var(--rojo)' : ant != null && ant >= 60 ? 'var(--ambar)' : 'inherit';
            return `<tr class="clic" data-cliente="${esc(r.cliente)}">
              <td><span class="enlace">${esc(r.cliente)}</span></td>
              <td class="num">${usd0(r.cobrado)}</td>
              <td class="num">${r.dso_cobrado_dias == null ? '—' : ERP.fmt0(r.dso_cobrado_dias)}</td>
              <td class="num">${usd0(r.saldo_pendiente)}</td>
              <td class="num" style="color:${col}">${ant == null ? '—' : ERP.fmt0(ant) + ' d'}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="leyenda">DSO = días promedio embarque→cobro, ponderado por monto (negativo = anticipo).
          Antigüedad = días promedio de lo que sigue pendiente.</div>`
          : '<div class="vacio">Sin datos de rotación todavía.</div>'}
      </div>`;

    cont.querySelectorAll('tr.clic[data-cliente]').forEach(tr =>
      tr.addEventListener('click', () => ERP.irModulo('cobranza', tr.dataset.cliente)));

    cont.querySelectorAll('[data-cap-cliente]').forEach(b =>
      b.addEventListener('click', e => {
        e.stopPropagation();   // no dispares la navegación de la fila
        ERP.capturarMovimiento({ modo: 'cobro', contraparte: b.dataset.capCliente });
      }));

    if (ERP.cablearExportar) ERP.cablearExportar(cont);

    if (parametro) verCliente(parametro);
  }

  ERP.registrar('cobranza', {
    titulo: 'Cuentas por Cobrar',
    descripcion: 'Lo que nos deben los clientes',
    render
  });
})();
