/* Módulo Finanzas — P&L con drill-down por mes, balance, KPIs y presupuesto vs real. */

(function () {
  'use strict';
  const { q, esc, usd, usd0, num, fmt, fmt0, pct, semaforo } = ERP;

  /* ---------- Drill-down: cargas de un mes ----------
     v_pl_mes_detalle: mes, folio, po, cliente, origen, ingreso, costo */

  async function verMes(mes, foco) {
    const titulo = ERP.mesTexto(mes);
    ERP.abrirPanel(esc(titulo), 'Cargando desglose…', '<div class="skel">Cargando…</div>');
    try {
      const filas = await q('v_pl_mes_detalle', `&mes=${ERP.eq(mes)}&order=folio.asc`);
      const ti = filas.reduce((s, r) => s + num(r.ingreso), 0);
      const tc = filas.reduce((s, r) => s + num(r.costo), 0);

      const cuerpo = filas.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Carga</th><th>PO</th><th>Cliente</th><th>Origen</th>
          <th class="num">Ingreso</th><th class="num">Costo</th><th class="num">Utilidad</th></tr></thead>
        <tbody>${filas.map(r => {
          const u = num(r.ingreso) - num(r.costo);
          return `<tr class="clic" data-folio="${esc(r.folio)}">
            <td class="mono"><span class="enlace">${esc(r.folio)}</span></td>
            <td>${esc(r.po || '—')}</td>
            <td>${esc(r.cliente || '—')}</td>
            <td>${esc(r.origen || '—')}</td>
            <td class="num ${foco === 'ingresos' ? 'pos' : ''}">${usd0(r.ingreso)}</td>
            <td class="num ${foco === 'costos' ? 'neg' : ''}">${usd0(r.costo)}</td>
            <td class="num ${u < 0 ? 'neg' : ''}">${usd0(u)}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="4">Total (${filas.length})</td>
          <td class="num">${usd0(ti)}</td><td class="num">${usd0(tc)}</td>
          <td class="num ${ti - tc < 0 ? 'neg' : ''}">${usd0(ti - tc)}</td></tr></tfoot>
      </table></div>` : '<div class="vacio">Sin cargas reconocidas en este mes.</div>';

      ERP.abrirPanel(
        esc(titulo),
        `${filas.length} ${filas.length === 1 ? 'carga reconocida' : 'cargas reconocidas'} en el mes` +
        (foco ? ` · desglose de ${esc(foco)}` : ''),
        cuerpo + `<div class="leyenda">
          El reconocimiento es por embarque, salvo consignaciones (se reconocen al liquidar el cliente).
          Toca una fila para abrir la ficha de la carga.
        </div>`
      );
      ERP.enlazarFolios(document.getElementById('panelBody'));
    } catch (e) {
      ERP.abrirPanel(esc(titulo), '', `<div class="errbox">No se pudo cargar el desglose: ${esc(e.message)}</div>`);
    }
  }

  /* ---------- Drill-down de gastos (operativos / financieros) de un mes ----------
     v_gastos_mensual solo contiene grupos gasto_operativo/gasto_financiero: los tipos
     flujo_cxp (fletes, aduanas…) no están aquí — no son gasto del P&L. */

  async function verGastos(mes, grupo) {
    const titulo = ERP.mesTexto(mes);
    const nombre = grupo === 'gasto_operativo' ? 'Gastos operativos' : 'Gastos financieros';
    ERP.abrirPanel(`${esc(nombre)} · ${esc(titulo)}`, 'Cargando desglose…', '<div class="skel">Cargando…</div>');
    try {
      const filas = await q('v_gastos_mensual',
        `&mes=${ERP.eq(mes)}&grupo=${ERP.eq(grupo)}&order=gasto.desc`);
      const total = filas.reduce((s, r) => s + num(r.gasto), 0);

      const cuerpo = filas.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Tipo</th><th class="num">Gasto neto</th></tr></thead>
        <tbody>${filas.map(r => {
          const g = num(r.gasto);
          const cls = g > 0.009 ? 'num neg' : g < -0.009 ? 'num pos' : 'num';
          return `<tr><td>${esc(r.tipo || '—')}</td>
            <td class="${cls}">${Math.abs(g) < 0.009 ? '—' : usd0(-g)}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="total"><td>Total</td>
          <td class="num ${total > 0.009 ? 'neg' : total < -0.009 ? 'pos' : ''}">${usd0(-total)}</td></tr></tfoot>
      </table></div>` : `<div class="vacio">Sin ${esc(nombre.toLowerCase())} en este mes.</div>`;

      ERP.abrirPanel(`${esc(nombre)} · ${esc(titulo)}`,
        `${filas.length} concepto${filas.length === 1 ? '' : 's'}`,
        cuerpo + `<div class="leyenda">Gasto neto: los reembolsos ya están restados
          (un valor en verde es un reembolso neto). Base caja: se reconoce al pagarse.</div>`);
    } catch (e) {
      ERP.abrirPanel(`${esc(nombre)} · ${esc(titulo)}`, '',
        `<div class="errbox">No se pudo cargar el desglose: ${esc(e.message)}</div>`);
    }
  }

  /* ---------- P&L completo (utilidad neta) ----------
     Estado de resultados clásico: conceptos como FILAS, meses como COLUMNAS, más una
     columna Acumulado. Los importes de gasto/utilidad vienen precalculados en la vista
     (utilidad_bruta, _operacion, _neta): NO se recalculan aquí para no depender de la
     convención de signos de los componentes. Las cifras de gasto se muestran negativas
     (dinero que sale) usando usd0(-valor). */

  const FILAS_PL = [
    { key: 'ingresos', label: 'Ingresos', kind: 'ingreso', drill: 'cargas:ingresos' },
    { key: 'costo_ventas', label: 'Costo de ventas', kind: 'gasto', drill: 'cargas:costos' },
    { key: 'utilidad_bruta', label: 'Utilidad bruta', kind: 'utilidad' },
    { key: 'margen_bruto_pct', label: 'Margen bruto', kind: 'margen' },
    { key: 'gastos_operativos', label: 'Gastos operativos', kind: 'gasto', drill: 'gastos:gasto_operativo' },
    { key: 'utilidad_operacion', label: 'Utilidad de operación', kind: 'utilidad' },
    { key: 'gastos_financieros', label: 'Gastos financieros', kind: 'gasto', drill: 'gastos:gasto_financiero' },
    { key: 'utilidad_neta', label: 'Utilidad neta', kind: 'utilidad' },
    { key: 'margen_neto_pct', label: 'Margen neto', kind: 'margen' }
  ];

  function celdaPL(f, mes, valor) {
    if (f.kind === 'margen') {
      return `<td class="num ${num(valor) < 0 ? 'neg' : ''}">${valor == null ? '—' : pct(valor)}</td>`;
    }
    const v = num(valor);
    const nada = Math.abs(v) < 0.009;

    if (f.kind === 'ingreso') {
      const clic = (mes && f.drill && !nada) ? ` celda-clic" data-mes="${esc(mes)}" data-drill="${f.drill}` : '';
      return `<td class="num${clic}">${nada ? '—' : usd0(v)}</td>`;
    }
    if (f.kind === 'gasto') {
      const cls = v > 0.009 ? 'num neg' : v < -0.009 ? 'num pos' : 'num';
      const clic = (mes && f.drill && !nada) ? ` celda-clic" data-mes="${esc(mes)}" data-drill="${f.drill}` : '';
      // usd0(-v): un gasto positivo (dinero que sale) se lee como −$X.
      return `<td class="${cls}${clic}">${nada ? '—' : usd0(-v)}</td>`;
    }
    // utilidad
    return `<td class="num ${v < 0 ? 'neg' : ''}">${usd0(v)}</td>`;
  }

  function pintarPL(rows) {
    if (!rows.length) return '<div class="vacio">Sin resultados registrados.</div>';
    // No se filtran meses: puede haber meses solo-gasto (ingresos=0) que igual cuentan.

    const suma = k => rows.reduce((s, r) => s + num(r[k]), 0);
    const totIng = suma('ingresos');
    const acum = {
      ingresos: totIng, costo_ventas: suma('costo_ventas'), utilidad_bruta: suma('utilidad_bruta'),
      gastos_operativos: suma('gastos_operativos'), utilidad_operacion: suma('utilidad_operacion'),
      gastos_financieros: suma('gastos_financieros'), utilidad_neta: suma('utilidad_neta'),
      margen_bruto_pct: totIng > 0.009 ? suma('utilidad_bruta') / totIng * 100 : null,
      margen_neto_pct: totIng > 0.009 ? suma('utilidad_neta') / totIng * 100 : null
    };

    const filaHtml = f => {
      const clsRow = f.kind === 'utilidad' ? ' class="fila-utilidad"' : f.kind === 'margen' ? ' class="fila-margen"' : '';
      const etiqueta = f.kind === 'utilidad' ? f.label.toUpperCase() : f.label;
      const celdasMes = rows.map(r => celdaPL(f, r.mes, r[f.key])).join('');
      const celdaAcum = celdaPL(f, null, acum[f.key]);   // sin mes → no clicable
      return `<tr${clsRow}><td>${esc(etiqueta)}</td>${celdasMes}${celdaAcum}</tr>`;
    };

    return `<div class="tabla-wrap"><table>
      <thead><tr>
        <th></th>
        ${rows.map(r => `<th class="num">${esc(ERP.mesTexto(r.mes))}</th>`).join('')}
        <th class="num">Acumulado</th>
      </tr></thead>
      <tbody>${FILAS_PL.map(filaHtml).join('')}</tbody>
    </table></div>
    <div class="leyenda">
      <b>Toca una cifra de ingresos, costo de ventas o gastos</b> de un mes para ver su desglose.
      Utilidad bruta devengada por carga; gastos reconocidos al pagarse.
      Los costos operativos del embarque (flete, aduana, empaque) no son gasto aquí: liquidan
      el costo que ya vive en la carga.
    </div>`;
  }

  /* ---------- Balance ---------- */

  /* Posición de caja (v_posicion_liquidez, E39): "qué pasaría si cobráramos todo y pagáramos todo".
     Secciones Entra/Sale/Socios/Resultado ordenadas por `orden` (NUNCA hardcodeado). Renglones que
     empiezan con TOTAL/FLUJO/POSICION en negritas con línea superior (.total, como Balance general);
     POSICION NETA verde si >=0, rojo si <0; nota → ⓘ (mismo helper del Balance). */
  function pintarPosicionLiquidez(rows) {
    if (!rows.length) return '<div class="vacio">Sin datos de posición de caja.</div>';
    const cuerpo = rows.slice().sort((a, b) => num(a.orden) - num(b.orden));
    // Se agrupa por `seccion` recorriéndolas como vengan (sin hardcodear nombres ni `orden`);
    // cada cambio de sección emite un encabezado de grupo. La sección "Informativo" (E39) es un
    // dato de contexto que NO entra en la aritmética: va separada, en gris, sin negritas.
    let filas = '';
    let seccionActual = null;
    cuerpo.forEach(r => {
      const seccion = r.seccion || '';
      const info = seccion === 'Informativo';
      if (seccion !== seccionActual) {
        seccionActual = seccion;
        const estiloHead = 'font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;color:var(--gris);font-weight:700;padding-top:12px'
          + (info ? ';border-top:2px solid var(--linea)' : '');
        filas += `<tr><td colspan="2" style="${estiloHead}">${esc(seccion)}${info ? ' <span style="font-weight:400;text-transform:none">· contexto, no entra en la suma</span>' : ''}</td></tr>`;
      }
      const c = String(r.concepto || '');
      const esTotal = !info && (c.startsWith('TOTAL') || c.startsWith('FLUJO') || c.startsWith('POSICION'));
      const esPosNeta = !info && c.startsWith('POSICION');
      const m = num(r.monto);
      const nota = r.nota
        ? ` <span class="info-nota" data-nota="${esc(r.nota)}" title="${esc(r.nota)}" role="button" tabindex="0" style="cursor:help;color:var(--gris)">ⓘ</span>`
        : '';
      const estilo = [
        esPosNeta ? `color:${m >= 0 ? 'var(--verde)' : 'var(--rojo)'}` : '',
        info ? 'color:var(--gris)' : ''
      ].filter(Boolean).join(';');
      const st = estilo ? ` style="${estilo}"` : '';
      filas += `<tr class="${esTotal ? 'total' : ''}"><td${st}>${esc(c)}${nota}</td>
        <td class="num"${st}>${usd(m)}</td></tr>`;
    });
    return `<p class="leyenda" style="margin:0 0 12px">Qué pasaría si todos los clientes pagaran lo que deben y nosotros pagáramos todo lo que debemos. No es un pronóstico por fechas: es la foto de los saldos de hoy.</p>
    <div class="tabla-wrap"><table id="tblPosicionCaja" data-exp-seccion="Posición de caja">
      <thead><tr><th>Concepto</th><th class="num">Monto</th></tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;
  }

  function pintarBalance(rows, partidas) {
    if (!rows.length) return '<div class="vacio">Sin balance disponible.</div>';

    // Renglones del cuerpo: todo menos 'Cuadre' (que va como barra de estado al pie), en orden.
    const cuerpo = rows.filter(r => r.seccion !== 'Cuadre').sort((a, b) => num(a.orden) - num(b.orden));
    const filasHtml = cuerpo.map(r => {
      const esTotal = String(r.concepto || '').startsWith('TOTAL');
      const m = num(r.monto);
      // Nota explicativa: ícono ⓘ con tooltip (hover) y tap (móvil) — se cablea en render().
      const info = r.nota
        ? ` <span class="info-nota" data-nota="${esc(r.nota)}" title="${esc(r.nota)}" role="button" tabindex="0" style="cursor:help;color:var(--gris)">ⓘ</span>`
        : '';
      return `<tr class="${esTotal ? 'total' : ''}"><td>${esc(r.concepto)}${info}</td>
        <td class="num ${m < 0 ? 'neg' : ''}">${usd(m)}</td></tr>`;
    }).join('');

    // Barra de cuadre: semáforo de integridad del Balance.
    const cuadreRow = rows.find(r => r.seccion === 'Cuadre');
    const cuadre = cuadreRow ? num(cuadreRow.monto) : 0;
    const cuadraOK = Math.abs(cuadre) < 0.005;
    const cuadreBar = `<div style="margin-top:12px;padding:11px 15px;border-radius:8px;font-weight:700;
      background:${cuadraOK ? '#e4efe7' : '#fbe4e4'};color:${cuadraOK ? 'var(--verde)' : 'var(--rojo)'}">
      ${cuadraOK ? '✅ Balance cuadrado' : `⚠️ DESCUADRE DE ${usd(Math.abs(cuadre))} — avisar a Miguel`}</div>`;
    // Renglón de cuadre al final de la tabla: complementa a la barra y ES el que viaja en el export
    // (la barra es un <div> y no se raspa). Negritas + mismo color que la barra.
    const colorCuadre = cuadraOK ? 'var(--verde)' : 'var(--rojo)';
    const cuadreFila = `<tr class="total"><td style="color:${colorCuadre}">CUADRE (Activo - Pasivo - Patrimonio)</td>
      <td class="num" style="color:${colorCuadre}">${usd(cuadre)}</td></tr>`;

    // Detalle plegable de partidas por aplicar (v_balance_partidas). El <details> mantiene la
    // tabla en el DOM aunque esté cerrado, así el export la incluye igual.
    const parts = (partidas || []).slice().sort((a, b) => num(a.sin_aplicar) - num(b.sin_aplicar));
    const tablaPartidas = parts.length
      ? `<div class="tabla-wrap"><table id="tblPartidas" data-exp-seccion="Partidas por aplicar (detalle)">
          <thead><tr><th>Tipo</th><th class="num">Movimientos</th><th class="num">Monto movido</th>
            <th class="num">Aplicado</th><th class="num">Sin aplicar</th><th>Destino</th></tr></thead>
          <tbody>${parts.map(p => {
            // Solo "Por aplicar a un embarque" es un pendiente (rojo si negativo). Cualquier otro
            // destino (Inventario, Neutro, y valores futuros) va en gris: no es un pendiente.
            const pendiente = p.destino === 'Por aplicar a un embarque';
            return `<tr${pendiente ? '' : ' style="color:var(--gris)"'}>
            <td>${esc(p.tipo)}${p.grupo ? ` <span style="color:var(--gris)">· ${esc(p.grupo)}</span>` : ''}</td>
            <td class="num">${esc(p.movimientos)}</td>
            <td class="num">${usd(p.monto_movido)}</td>
            <td class="num">${usd(p.aplicado)}</td>
            <td class="num ${pendiente && num(p.sin_aplicar) < 0 ? 'neg' : ''}">${usd(p.sin_aplicar)}</td>
            <td>${esc(p.destino || '—')}</td></tr>`;
          }).join('')}</tbody>
        </table></div>`
      : '<div class="vacio">Sin partidas pendientes ✅</div>';

    return `<div class="tabla-wrap"><table id="tblBalance" data-exp-seccion="Balance general">
      <thead><tr><th>Concepto</th><th class="num">Monto</th></tr></thead>
      <tbody>${filasHtml}${cuadreFila}</tbody>
    </table></div>
    ${cuadreBar}
    <div class="leyenda">CxC y CxP incluyen los montos en revisión (flags pendientes);
      el patrimonio se ajustará al resolverse.</div>
    <details style="margin-top:14px">
      <summary style="cursor:pointer;font-weight:600">Partidas por aplicar (detalle)</summary>
      <p class="leyenda" style="margin:8px 0 12px">Dinero que salió o entró del banco y todavía no está aplicado a un embarque. Las filas marcadas como Inventario ya están reconocidas en el Activo y no son un pendiente; el resto sí debe aplicarse.</p>
      ${tablaPartidas}
    </details>`;
  }

  /* ---------- KPIs de margen ---------- */

  function pintarMargen(rows, etiquetaCol, idTabla) {
    const conVenta = rows.filter(r => num(r.venta) > 0.009).sort((a, b) => num(b.venta) - num(a.venta));
    if (!conVenta.length) return '<div class="vacio">Sin ventas registradas.</div>';
    const tv = conVenta.reduce((s, r) => s + num(r.venta), 0);
    const tc = conVenta.reduce((s, r) => s + num(r.costo), 0);
    const tm = conVenta.reduce((s, r) => s + num(r.margen), 0);

    return `<div class="tabla-wrap"><table${idTabla ? ` id="${idTabla}"` : ''}>
      <thead><tr><th></th><th>${esc(etiquetaCol)}</th><th class="num">Cargas</th>
        <th class="num">Venta</th><th class="num">Costo</th><th class="num">Margen</th><th class="num">%</th></tr></thead>
      <tbody>${conVenta.map(r => `<tr>
        <td>${semaforo(r.margen_pct == null ? null : num(r.margen_pct))}</td>
        <td>${esc(String(r.cliente ?? r.producto ?? '—').split(' ').slice(0, 3).join(' '))}</td>
        <td class="num">${esc(r.cargas)}</td>
        <td class="num">${usd0(r.venta)}</td>
        <td class="num">${usd0(r.costo)}</td>
        <td class="num ${num(r.margen) < 0 ? 'neg' : ''}">${usd0(r.margen)}</td>
        <td class="num">${r.margen_pct == null ? '—' : pct(r.margen_pct)}</td></tr>`).join('')}</tbody>
      <tfoot><tr class="total"><td></td><td>Total</td><td></td>
        <td class="num">${usd0(tv)}</td><td class="num">${usd0(tc)}</td><td class="num">${usd0(tm)}</td>
        <td class="num">${tv > 0 ? pct(tm / tv * 100) : '—'}</td></tr></tfoot>
    </table></div>
    <div class="leyenda">Base carga (embarque). Márgenes de 100% = costo aún sin capturar (flag de Sourcing).</div>`;
  }

  /* Margen por caja, agrupado por producto con promedios (como v_kpi_margen_producto).
     Los por-caja se ponderan por cajas y SOLO con embarques cuyo margen_por_caja no es NULL.
     Cuando el grupo no tiene ningún embarque fiable, el por-caja va como guion (—) con el
     motivo como tooltip: es dato deliberadamente ausente, nunca un cero. */
  function pintarMargenCaja(rows) {
    if (!rows || !rows.length) return '<div class="vacio">Aún no hay cajas capturadas en los embarques.</div>';
    const grupos = new Map();
    rows.forEach(r => {
      const k = r.producto || '—';
      if (!grupos.has(k)) grupos.set(k, { producto: k, cargas: 0, cajasTot: 0, tieneCajas: false,
        cajasFiab: 0, ingreso: 0, costo: 0, margen: 0, motivo: null });
      const g = grupos.get(k);
      g.cargas++;
      if (r.cajas != null) { g.cajasTot += num(r.cajas); g.tieneCajas = true; }
      if (r.margen_por_caja != null && r.cajas != null && num(r.cajas) > 0) {
        g.cajasFiab += num(r.cajas);
        g.ingreso += num(r.ingreso_venta);
        g.costo += num(r.costo_total);
        g.margen += num(r.margen_total);
      } else if (!g.motivo && r.motivo_sin_margen_caja) {
        g.motivo = r.motivo_sin_margen_caja;
      }
    });
    const filas = [...grupos.values()].sort((a, b) => b.cargas - a.cargas);
    const cel = (val, motivo, neg) => val == null
      ? `<td class="num" style="color:var(--gris)" title="${esc(motivo || 'Dato deliberadamente ausente')}">—</td>`
      : `<td class="num ${neg && val < 0 ? 'neg' : ''}">${usd(val)}</td>`;

    return `<div class="tabla-wrap"><table id="tblMargenCaja">
      <thead><tr><th>Producto</th><th class="num">Cargas</th><th class="num">Cajas</th>
        <th class="num">Venta/caja</th><th class="num">Costo/caja</th><th class="num">Margen/caja</th></tr></thead>
      <tbody>${filas.map(g => {
        const fiab = g.cajasFiab > 0;
        const vpc = fiab ? g.ingreso / g.cajasFiab : null;
        const cpc = fiab ? g.costo / g.cajasFiab : null;
        const mpc = fiab ? g.margen / g.cajasFiab : null;
        return `<tr>
          <td>${esc(String(g.producto).split(' ').slice(0, 3).join(' '))}</td>
          <td class="num">${g.cargas}</td>
          <td class="num">${g.tieneCajas ? fmt0(g.cajasTot) : '<span style="color:var(--gris)">—</span>'}</td>
          ${cel(vpc, g.motivo, false)}
          ${cel(cpc, g.motivo, false)}
          ${cel(mpc, g.motivo, true)}</tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="leyenda">El precio por caja lo calcula el sistema (margen ÷ cajas), promediando solo embarques con cajas capturadas e ingreso confiable. El guion (—) marca un dato deliberadamente ausente, no un cero — pasa el cursor para ver el motivo.</div>`;
  }

  /* ---------- Concentración ---------- */

  function pintarConcentracion(rows) {
    const conVenta = rows.filter(r => num(r.venta) > 0.009).sort((a, b) => num(b.venta) - num(a.venta));
    if (!conVenta.length) return '<div class="vacio">Sin datos de concentración.</div>';
    const maxV = Math.max(...conVenta.map(r => num(r.pct_venta)), 1);

    return conVenta.map(r => {
      const pv = num(r.pct_venta), pc = num(r.pct_cxc);
      const color = pc > 50 ? 'var(--rojo)' : pc > 25 ? '#C98A2D' : '#1E5B3A';
      return `<div class="barra-row">
        <div class="barra-top">
          <span>${esc(String(r.cliente).split(' ').slice(0, 2).join(' '))}</span>
          <span class="b">${fmt(pv)}% venta · ${fmt(pc)}% CxC</span>
        </div>
        <div class="barra"><div class="fill" style="width:${(pv / maxV * 100).toFixed(1)}%;background:${color}">${fmt0(r.venta)}</div></div>
      </div>`;
    }).join('') +
      `<div class="leyenda">Barra = participación en venta. Color por riesgo de concentración en CxC:
       verde &lt;25% · ámbar 25–50% · rojo &gt;50%.</div>`;
  }

  /* ---------- Presupuesto vs real ---------- */

  function pintarPvr(rows) {
    const conPpto = rows.filter(r => r.ingresos_ppto != null);
    if (!conPpto.length) {
      return `<div class="vacio">Sin cifras de presupuesto cargadas todavía.
        La tabla <b>presupuesto</b> ya existe en el ERP: cuando se definan las metas mensuales,
        esta sección comparará automáticamente contra el real.</div>`;
    }
    const v = x => x == null ? '—' : usd0(x);
    const col = x => x != null && num(x) < 0 ? 'neg' : '';

    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Mes</th>
        <th class="num">Ing. real</th><th class="num">Ing. ppto</th><th class="num">Var.</th>
        <th class="num">Costo real</th><th class="num">Costo ppto</th><th class="num">Var.</th>
        <th class="num">UB real</th><th class="num">UB ppto</th><th class="num">Var.</th></tr></thead>
      <tbody>${conPpto.map(r => `<tr>
        <td>${esc(ERP.mesTexto(r.mes))}</td>
        <td class="num">${v(r.ingresos_real)}</td><td class="num">${v(r.ingresos_ppto)}</td>
        <td class="num ${col(r.var_ingresos)}">${v(r.var_ingresos)}</td>
        <td class="num">${v(r.costos_real)}</td><td class="num">${v(r.costos_ppto)}</td>
        <td class="num ${col(r.var_costos != null ? -num(r.var_costos) : null)}">${v(r.var_costos)}</td>
        <td class="num">${v(r.ub_real)}</td><td class="num">${v(r.ub_ppto)}</td>
        <td class="num ${col(r.var_ub)}">${v(r.var_ub)}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  /* ---------- Secciones Fase 1.5 (vistas que ya existen con datos) ---------- */

  function pintarFlujoSemFin(rows) {
    if (!rows.length) return '<div class="vacio">Sin flujo semanal.</div>';
    const maxN = Math.max(...rows.map(r => Math.abs(num(r.neto))), 1);
    return `<div class="tabla-wrap"><table id="tblFlujoSem">
      <thead><tr><th>Semana</th><th class="num">Ingresos</th><th class="num">Egresos</th>
        <th class="num">Neto</th><th class="num">Movs</th><th>Tendencia neto</th></tr></thead>
      <tbody>${rows.map(r => {
        const n = num(r.neto);
        const w = (Math.abs(n) / maxN * 100).toFixed(0);
        return `<tr>
          <td class="mono">${esc(r.semana_iso || r.semana || '—')}</td>
          <td class="num">${usd(r.ingresos)}</td>
          <td class="num">${usd(Math.abs(num(r.egresos)))}</td>
          <td class="num ${n < 0 ? 'neg' : 'pos'}">${usd(n)}</td>
          <td class="num">${esc(r.movimientos ?? '—')}</td>
          <td><div class="mini-bar"><div class="mini-fill ${n < 0 ? 'neg' : ''}" style="width:${w}%"></div></div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  function pintarCxcAgingFin(rows) {
    const conSaldo = rows.filter(r => num(r.saldo_cxc) > 0.009);
    if (!conSaldo.length) return '<div class="vacio">Sin saldos por cobrar.</div>';
    return `<div class="tabla-wrap"><table id="tblCxcAging">
      <thead><tr><th>Carga</th><th>Cliente</th><th>Estado</th><th>Vence</th><th>Situación</th><th class="num">Saldo</th></tr></thead>
      <tbody>${conSaldo.map(r => {
        const v = ERP.venc(r.dias_vencido);
        return `<tr class="${r.vencida ? 'vencido-alto' : ''}">
          <td class="mono">${esc(r.folio)}${r.po ? `<div style="font-size:11px;color:var(--gris)">${esc(r.po)}</div>` : ''}</td>
          <td>${esc(String(r.cliente || '—').split(' ').slice(0, 2).join(' '))}</td>
          <td>${ERP.badgeEstado(r.estado)}</td>
          <td>${r.f_vencimiento ? esc(ERP.fecha(r.f_vencimiento)) : '—'}</td>
          <td class="${v.cls}">${esc(v.txt)}</td>
          <td class="num">${usd(r.saldo_cxc)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="leyenda">Filas en rojo = vencidas (ya pasó su fecha de pago).</div>`;
  }

  function pintarCxpProxFin(rows) {
    const conSaldo = rows.filter(r => num(r.saldo_cxp) > 0.009)
      .slice().sort((a, b) => String(a.f_vencimiento || '').localeCompare(String(b.f_vencimiento || '')));
    if (!conSaldo.length) return '<div class="vacio">Sin cuentas por pagar próximas.</div>';
    return `<div class="tabla-wrap"><table id="tblCxpProx">
      <thead><tr><th>Carga</th><th>Proveedor</th><th>Estado</th><th>Vence</th><th>Situación</th><th class="num">Saldo</th></tr></thead>
      <tbody>${conSaldo.map(r => {
        const v = ERP.venc(r.dias_vencido);
        return `<tr class="${r.vencida ? 'vencido-alto' : ''}">
          <td class="mono">${esc(r.folio)}${r.po ? `<div style="font-size:11px;color:var(--gris)">${esc(r.po)}</div>` : ''}</td>
          <td>${esc(String(r.proveedor || '—').split(' ').slice(0, 2).join(' '))}</td>
          <td>${ERP.badgeEstado(r.estado)}</td>
          <td>${r.f_vencimiento ? esc(ERP.fecha(r.f_vencimiento)) : '—'}</td>
          <td class="${v.cls}">${esc(v.txt)}</td>
          <td class="num">${usd(r.saldo_cxp)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="leyenda">Ordenado por fecha de vencimiento (lo que vence antes, primero).</div>`;
  }

  /* Días de pago por cliente (E46, v_dias_pago_observado): contratado vs observado sobre embarques
     cobrados COMPLETOS — insumo del futuro flujo proyectado 30/60/90 (hoy 15 días provisionales
     para todos). gap = dias_prom - dias_contratado (ya viene calculado en la vista); los umbrales
     de color son constantes de UI, pero todo dato (nombre, días, %, saldo) sale de la vista. */
  const gapClaseFin = g => (g >= 30 ? 'rojo' : (g >= 1 ? 'ambar' : 'gris'));
  const gapTxtFin = g => (g > 0 ? '+' : '') + Math.round(g) + ' d';
  const pct1Fin = n => (n == null ? '—' : Number(n).toFixed(1) + '%');

  function pintarDiasPago(rows) {
    if (!rows.length) return '<div class="vacio">Sin datos de días de pago observado.</div>';
    // Ya viene ordenada por pct_cxc desc (mayor peso en la CxC viva primero).
    const top = rows[0];
    const callout = gapClaseFin(num(top.gap)) === 'rojo'
      ? `<div style="margin:0 0 10px;padding:11px 15px;border-radius:8px;font-weight:700;background:var(--rojo-bg);color:var(--rojo)">
          ${esc(top.cliente)} concentra ${pct1Fin(top.pct_cxc)} de la CxC viva y paga a ${Math.round(num(top.dias_prom))} d (contratado ${Math.round(num(top.dias_contratado))} d).
        </div>`
      : '';
    const totalPct = rows.reduce((s, r) => s + num(r.pct_cxc), 0);

    return `${callout}<div class="tabla-wrap"><table id="tblDiasPago">
      <thead><tr><th>Cliente</th><th class="num">Embarques</th><th class="num">Contratado</th>
        <th class="num">Observado (prom / mediana)</th><th class="num">Gap</th>
        <th class="num">CxC viva</th><th class="num">% CxC</th></tr></thead>
      <tbody>${rows.map(r => {
        const g = num(r.gap);
        return `<tr>
          <td>${esc(r.cliente || '—')}</td>
          <td class="num">${r.n_embarques ?? '—'}</td>
          <td class="num">${Math.round(num(r.dias_contratado))} d</td>
          <td class="num">${Math.round(num(r.dias_prom))} / ${Math.round(num(r.dias_mediana))}</td>
          <td class="num"><span class="pill ${gapClaseFin(g)}">${gapTxtFin(g)}</span></td>
          <td class="num">${usd(r.saldo_cxc_actual)}</td>
          <td class="num">${pct1Fin(r.pct_cxc)}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="leyenda">Solo clientes con historial de cobro completo; cubren ${pct1Fin(totalPct)} de la CxC viva.</div>`;
  }

  function pintarRentabFin(rows) {
    const conV = rows.filter(r => num(r.ingreso_venta) > 0.009).sort((a, b) => num(b.margen) - num(a.margen));
    if (!conV.length) return '<div class="vacio">Sin datos de rentabilidad.</div>';
    return `<div class="tabla-wrap"><table id="tblRentab">
      <thead><tr><th></th><th>Carga</th><th>Producto</th><th>Cliente</th>
        <th class="num">Venta</th><th class="num">Costo</th><th class="num">Margen</th><th class="num">%</th></tr></thead>
      <tbody>${conV.map(r => `<tr>
        <td>${semaforo(r.margen_pct == null ? null : num(r.margen_pct))}</td>
        <td class="mono">${esc(r.folio)}</td>
        <td>${esc(r.producto || '—')}</td>
        <td>${esc(String(r.cliente || '—').split(' ').slice(0, 2).join(' '))}</td>
        <td class="num">${usd(r.ingreso_venta)}</td>
        <td class="num">${usd(r.costo_total)}</td>
        <td class="num ${num(r.margen) < 0 ? 'neg' : ''}">${usd(r.margen)}</td>
        <td class="num">${r.margen_pct == null ? '—' : pct(r.margen_pct)}</td></tr>`).join('')}</tbody>
    </table></div>
    <div class="leyenda">Semáforo de margen: 🟢 &gt;10% · 🟡 3–10% · 🔴 &lt;3%.</div>`;
  }

  /* ---------- Módulo ---------- */

  async function render(cont, parametro) {
    const [pl, balance, partidas, pos, kcli, kprod, kconc, pvr, flsem, cxcag, cxpprox, rentab, mcaja, diaspago] = await Promise.all([
      q('v_estado_resultados_neto', '&order=mes.asc'),
      // Balance E37 / Posición de caja E39: SIN .catch — si estas vistas truenan, que el error se
      // vea (despachar() muestra el errbox del módulo); no lo ocultamos con [] como en las demás.
      q('v_balance', '&order=orden.asc'),
      q('v_balance_partidas', '&order=sin_aplicar.asc'),
      q('v_posicion_liquidez', '&order=orden.asc'),
      q('v_kpi_margen_cliente').catch(() => []),
      q('v_kpi_margen_producto').catch(() => []),
      q('v_kpi_concentracion').catch(() => []),
      q('v_presupuesto_vs_real', '&order=mes.asc').catch(() => []),
      q('v_flujo_semanal', '&order=semana.asc').catch(() => []),
      q('v_cxc_aging').catch(() => []),
      q('v_cxp_proximas').catch(() => []),
      q('v_rentabilidad_carga').catch(() => []),
      q('v_margen_caja').catch(() => []),
      q('v_dias_pago_observado').catch(() => [])
    ]);

    cont.innerHTML = `
      <h2 class="sec">Estado de resultados</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('EstadoResultados', 'Estado de Resultados', '') : ''}
      <div class="card">${pintarPL(pl)}</div>

      <h2 class="sec">Balance general</h2>
      ${ERP.botonesExportarVarias ? ERP.botonesExportarVarias('BalanceGeneral', 'Balance General', '#balanceExport') : ''}
      <div class="card" id="balanceExport">${pintarBalance(balance, partidas)}</div>

      <h2 class="sec">Posición de caja</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('PosicionCaja', 'Posición de Caja', '#tblPosicionCaja') : ''}
      <div class="card">${pintarPosicionLiquidez(pos)}</div>

      <h2 class="sec">Márgenes</h2>
      <div class="grid2">
        <div class="card"><h3>Por cliente</h3>${ERP.botonesExportar ? ERP.botonesExportar('MargenCliente', 'Margen por Cliente', '#tblMargenCliente') : ''}${pintarMargen(kcli, 'Cliente', 'tblMargenCliente')}</div>
        <div class="card"><h3>Por producto</h3>${ERP.botonesExportar ? ERP.botonesExportar('MargenProducto', 'Margen por Producto', '#tblMargenProducto') : ''}${pintarMargen(kprod, 'Producto', 'tblMargenProducto')}</div>
      </div>

      <h2 class="sec">Margen por caja</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('MargenCaja', 'Margen por Caja', '#tblMargenCaja') : ''}
      <div class="card">${pintarMargenCaja(mcaja)}</div>

      <h2 class="sec">Concentración de cartera</h2>
      <div class="card">${pintarConcentracion(kconc)}</div>

      <h2 class="sec">Presupuesto vs real</h2>
      <div class="card">${pintarPvr(pvr)}</div>

      <h2 class="sec">Flujo de caja semanal</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('FlujoSemanal', 'Flujo de Caja Semanal', '#tblFlujoSem') : ''}
      <div class="card">${pintarFlujoSemFin(flsem)}</div>

      <h2 class="sec">Antigüedad de saldos por cobrar</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('CxCAntiguedad', 'Antigüedad CxC', '#tblCxcAging') : ''}
      <div class="card">${pintarCxcAgingFin(cxcag)}</div>

      <h2 class="sec">Cuentas por pagar próximas</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('CxPProximas', 'Cuentas por Pagar Próximas', '#tblCxpProx') : ''}
      <div class="card">${pintarCxpProxFin(cxpprox)}</div>

      <h2 class="sec">Días de pago por cliente</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('DiasPago', 'Días de Pago por Cliente', '#tblDiasPago') : ''}
      <div class="card">${pintarDiasPago(diaspago)}</div>

      <h2 class="sec">Rentabilidad por embarque</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('Rentabilidad', 'Rentabilidad por Embarque', '#tblRentab') : ''}
      <div class="card">${pintarRentabFin(rentab)}</div>`;

    cont.querySelectorAll('.celda-clic').forEach(td =>
      td.addEventListener('click', () => {
        const [destino, arg] = String(td.dataset.drill || '').split(':');
        if (destino === 'gastos') verGastos(td.dataset.mes, arg);
        else verMes(td.dataset.mes, arg);   // 'cargas:ingresos' | 'cargas:costos'
      }));

    // Íconos ⓘ del Balance: tooltip en hover (title) + tap/Enter en móvil (toast con la nota).
    cont.querySelectorAll('.info-nota[data-nota]').forEach(el => {
      const mostrar = () => ERP.toast('ok', esc(el.dataset.nota));
      el.addEventListener('click', mostrar);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mostrar(); } });
    });

    if (ERP.cablearExportar) ERP.cablearExportar(cont);

    if (parametro) verMes(parametro);
  }

  ERP.registrar('finanzas', {
    titulo: 'Finanzas',
    descripcion: 'Resultados, balance y márgenes — todo con desglose',
    render
  });
})();
