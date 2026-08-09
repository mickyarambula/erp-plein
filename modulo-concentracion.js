/* Módulo Concentración de riesgo — SOLO LECTURA.
   Índice de Herfindahl-Hirschman (HHI) por cliente, producto y proveedor:
   qué tan repartida está la venta o si depende de pocas manos.
   Consume v_concentracion_resumen (1 fila por dimensión) y v_concentracion
   (1 fila por entidad, ordenada por rank). Sin escrituras, sin RPC. */

(function () {
  'use strict';
  const { q, esc, usd, num, fmt, fmt0, pct } = ERP;

  // Orden y etiquetas de las tres dimensiones.
  const DIMS = [
    { key: 'cliente', label: 'Clientes', singular: 'Cliente' },
    { key: 'producto', label: 'Productos', singular: 'Producto' },
    { key: 'proveedor', label: 'Proveedores', singular: 'Proveedor' }
  ];

  // Semáforo por nivel de concentración (viene calculado en la vista).
  const NIVEL = {
    concentrado: { pill: 'rojo', txt: 'Concentrado' },
    moderado: { pill: 'ambar', txt: 'Moderado' },
    competitivo: { pill: 'verde', txt: 'Competitivo' }
  };

  /* ---------- Tarjeta de cabecera por dimensión ---------- */

  function tarjetaResumen(dim, r) {
    if (!r) {
      return `<div class="conc-card">
        <div class="conc-dim">${esc(dim.label)}</div>
        <div class="vacio" style="padding:12px 0">Sin datos.</div>
      </div>`;
    }
    const nivel = NIVEL[r.nivel] || { pill: 'gris', txt: r.nivel || '—' };
    return `<div class="conc-card nivel-${esc(r.nivel || '')}">
      <div class="conc-dim">${esc(dim.label)}</div>
      <div class="conc-hhi">${fmt0(r.hhi)} <span class="conc-hhi-lbl">HHI</span></div>
      <span class="pill ${nivel.pill}">${esc(nivel.txt)}</span>
      <div class="conc-top">Top-1: ${pct(r.top1_pct)} · Top-3: ${pct(r.top3_pct)}</div>
      <div class="conc-ref">${fmt0(r.n_entidades)} ${num(r.n_entidades) === 1 ? 'entidad' : 'entidades'}
        · venta total ${usd(r.venta_total)}</div>
    </div>`;
  }

  /* ---------- Tabla por dimensión (ordenada por rank) ---------- */

  function tabla(dim, filas) {
    if (!filas.length) return '<div class="vacio">Sin ventas registradas en esta dimensión.</div>';

    const totCargas = filas.reduce((s, r) => s + num(r.cargas), 0);
    const totVenta = filas.reduce((s, r) => s + num(r.venta), 0);

    // Pareto: resalta las filas hasta que el acumulado cruza el 80% (inclusive).
    let cruzado = false;

    const cuerpo = filas.map(r => {
      const enPareto = !cruzado;
      if (num(r.pct_acumulado) >= 80) cruzado = true;
      return `<tr class="${enPareto ? 'pareto' : ''}">
        <td class="num">${fmt0(r.rank)}</td>
        <td>${esc(r.entidad || '—')}</td>
        <td class="num">${fmt0(r.cargas)}</td>
        <td class="num">${usd(r.venta)}</td>
        <td class="num">${pct(r.pct)}</td>
        <td class="num">${pct(r.pct_acumulado)}</td>
      </tr>`;
    }).join('');

    return `<div class="tabla-wrap"><table>
      <thead><tr>
        <th class="num">#</th><th>${esc(dim.singular)}</th>
        <th class="num">Cargas</th><th class="num">Venta</th>
        <th class="num">%</th><th class="num">% acum.</th>
      </tr></thead>
      <tbody>${cuerpo}</tbody>
      <tfoot><tr class="total">
        <td></td><td>Total (${filas.length})</td>
        <td class="num">${fmt0(totCargas)}</td>
        <td class="num">${usd(totVenta)}</td>
        <td class="num">100.00%</td><td class="num"></td>
      </tr></tfoot>
    </table></div>`;
  }

  /* ---------- Módulo ---------- */

  async function render(cont) {
    const [resumen, filas] = await Promise.all([
      q('v_concentracion_resumen'),
      q('v_concentracion', '&order=rank.asc')
    ]);

    // Índice del resumen por dimensión y agrupado de las filas por dimensión.
    const resPorDim = {};
    resumen.forEach(r => { resPorDim[r.dimension] = r; });
    const filasPorDim = {};
    filas.forEach(f => { (filasPorDim[f.dimension] = filasPorDim[f.dimension] || []).push(f); });

    const cabecera = `<div class="conc-cards">
      ${DIMS.map(d => tarjetaResumen(d, resPorDim[d.key])).join('')}
    </div>
    <div class="leyenda" style="margin-top:6px">
      <b>HHI</b> (índice de Herfindahl-Hirschman) resume qué tan repartida está la venta:
      &lt;1500 competitivo · 1500–2500 moderado · &gt;2500 concentrado (máx. 10 000 = un solo actor).
      A mayor HHI, más depende el negocio de pocas contrapartes.
    </div>`;

    const secciones = DIMS.map(d => `
      <h2 class="sec">${esc(d.label)}</h2>
      <div class="card">${tabla(d, filasPorDim[d.key] || [])}</div>`).join('');

    cont.innerHTML = `<div class="pantalla-concentracion">
      ${cabecera}
      ${secciones}
      <div class="leyenda" style="margin-top:18px">
        Las filas resaltadas son el <b>Pareto 80/20</b>: las contrapartes que juntas acumulan
        el primer 80% de la venta — donde se concentra el riesgo. Base carga (venta reconocida).
      </div>
    </div>`;
  }

  ERP.registrar('concentracion', {
    titulo: 'Concentración de riesgo',
    descripcion: 'HHI y Pareto por cliente, producto y proveedor — dónde se concentra la venta',
    render
  });
})();
