/* Módulo Operaciones (OP) — pantalla de LECTURA del hilo conductor del modelo-OP (backend
   D-140..D-146, ver ARQUITECTURA-OPERACION.md y BITACORA-DECISIONES.md). Cada OP-XXXX es el
   hilo que une VENTA/COMPRA/EMBARQUE de un embarque; esta pantalla no captura ni muta nada,
   solo lee 4 vistas nuevas: v_operacion, v_operacion_resumen, v_operacion_costos,
   v_operacion_cxp. SCOPE = .pantalla-operaciones, mismo patrón que .pantalla-cxc/
   .pantalla-embarques (wrapper alrededor de TODO lo que pinta render()); el drawer de detalle
   usa el #panelBody global compartido, FUERA del scope, con los tokens legacy que ya usan
   todos los demás paneles (pintarFicha en modulo-cargas.js, verCliente en modulo-cobranza.js).

   Lista maestra: una tarjeta por OP (reusa la gramática .group/.ghead/.kv-row/.kv que ya
   vistió Embarques en E99 — "reusar el componente que ya cumple el rol", SISTEMA-DISENO.md
   §12) en vez de una tabla plana, con chip de modalidad y buscador/filtro client-side sobre
   el único fetch de v_operacion_resumen (85 OPs, sin refetch por filtro).

   Detalle (drawer): encabezado desde v_operacion + tabla de costos desde v_operacion_costos,
   resaltando cuando `contraparte_real` ≠ `proveedor_encabezado` (el "fantasma": un proveedor de
   servicio — flete/comisión/reempaque — que cobra la línea aunque el encabezado muestre otro
   nombre, ej. OP-0011: encabezado AGROFEPAC pero costo repartido a Las Brisas/BBA/Suárez/
   Agricooling) y marcando `sin_contraparte=true` como "(interno / pendiente)" — más el resumen
   de v_operacion_cxp (costo real por contraparte). */

(function () {
  'use strict';
  const { q, esc, usd, num, fmt0, pct, norm } = ERP;

  let operaciones = [];
  let filtroModalidad = 'todas';
  let filtroTexto = '';
  let tempoBusca;

  /* Mismo contrato visual que pillModalidad() en modulo-cargas.js: 3 modalidades válidas,
     comisión pura en ámbar (costo 0/margen 100% es correcto, nunca rojo). Sin chequeo de
     `anulado`: v_operacion_resumen no expone ese campo (el backfill solo cubre cargas vivas). */
  function pillModalidad(modalidad) {
    if (modalidad === 'margen_fijo') return '<span class="pill m">Margen</span>';
    if (modalidad === 'comision') return '<span class="pill c" title="Comisión pura: costo 0 y margen 100% son correctos, Plein no compra la fruta">Comisión</span>';
    if (modalidad === 'consignacion') return '<span class="pill g">Consignación</span>';
    return `<span class="pill gris">${esc(modalidad || '—')}</span>`;
  }

  function kv(etiqueta, valor, clase) {
    return `<div class="kv"><div class="k">${esc(etiqueta)}</div><div class="v${clase ? ' ' + clase : ''}">${valor}</div></div>`;
  }

  /* margen_bruto llega NULL en consignación mientras no se liquide (el ingreso se reconoce al
     cobro, no al embarque — D-04) — nunca se pinta como $0.00, eso sería un dato falso. */
  function margenTexto(r) {
    if (r.margen_bruto == null) return r.modalidad === 'consignacion' ? '— al liquidar' : '—';
    return usd(r.margen_bruto);
  }
  function margenClase(r) {
    if (r.margen_bruto == null) return 'ink';
    return num(r.margen_bruto) < 0 ? 'neg' : '';
  }

  function htmlCardOperacion(r) {
    return `<div class="group op-card" data-folio-op="${esc(r.folio_op)}">
      <div class="ghead">
        <i class="ti ti-git-branch gicon"></i>
        <div class="gtxt">
          <div class="gtag">${esc(r.folio_op)}</div>
          <div class="gsub">${esc(r.carga || '—')}${r.po ? ` · ${esc(r.po)}` : ''} · ${esc(r.cliente || 'cliente sin asignar')}</div>
        </div>
        <div class="op-modalidad">${pillModalidad(r.modalidad)}</div>
        <div class="kv-row">
          ${kv('Ingreso', usd(r.ingreso_venta))}
          ${kv('Costo', usd(r.costo_total), 'ink')}
          ${kv('Margen', margenTexto(r), margenClase(r))}
        </div>
      </div>
    </div>`;
  }

  function filtradas() {
    let filas = operaciones;
    if (filtroModalidad !== 'todas') filas = filas.filter(r => r.modalidad === filtroModalidad);
    const t = norm(filtroTexto);
    if (t) filas = filas.filter(r => [r.folio_op, r.carga, r.po, r.cliente].some(x => norm(x).includes(t)));
    return filas;
  }

  function pintarKpis() {
    const cont = document.getElementById('opKpis');
    if (!cont) return;
    const tv = operaciones.reduce((s, r) => s + num(r.ingreso_venta), 0);
    const tc = operaciones.reduce((s, r) => s + num(r.costo_total), 0);
    const conMargen = operaciones.filter(r => r.margen_bruto != null);
    const tvM = conMargen.reduce((s, r) => s + num(r.ingreso_venta), 0);
    const tm = conMargen.reduce((s, r) => s + num(r.margen_bruto), 0);
    const mp = tvM > 0.009 ? tm / tvM * 100 : null;
    const tile = (etiqueta, valor, clase, titulo) => `<div class="kpi"${titulo ? ` title="${esc(titulo)}"` : ''}><div class="k">${esc(etiqueta)}</div><div class="v${clase ? ' ' + clase : ''}">${valor}</div></div>`;
    cont.innerHTML =
      tile('Operaciones', fmt0(operaciones.length), 'ink') +
      tile('Ingreso', usd(tv)) +
      tile('Costo', usd(tc), 'ink') +
      tile('Margen (reconocido)', mp == null ? '—' : pct(mp), mp == null ? 'ink' : (mp < 0 ? 'neg' : ''),
        'Margen sobre operaciones ya reconocidas: excluye consignación sin liquidar (margen_bruto NULL). No es (Ingreso−Costo)/Ingreso de todas las tarjetas mostradas arriba.');
  }

  function pintarLista() {
    const filas = filtradas();
    const cuerpo = document.getElementById('opLista');
    const conteo = document.getElementById('opConteo');
    if (conteo) conteo.textContent = `${filas.length} de ${operaciones.length} operaciones`;
    cuerpo.innerHTML = filas.length
      ? filas.map(htmlCardOperacion).join('')
      : '<div class="vacio">Ninguna operación coincide con el filtro.</div>';
    cuerpo.querySelectorAll('.op-card[data-folio-op]').forEach(el =>
      el.addEventListener('click', () => verOperacion(el.dataset.folioOp)));
  }

  function pintarFiltros(cont) {
    const nTodas = operaciones.length;
    const nMargen = operaciones.filter(r => r.modalidad === 'margen_fijo').length;
    const nConsig = operaciones.filter(r => r.modalidad === 'consignacion').length;
    const nComision = operaciones.filter(r => r.modalidad === 'comision').length;
    const activo = v => filtroModalidad === v ? ' activo' : '';
    document.getElementById('opFiltros').innerHTML = `
      <input class="busca" id="opBusca" type="text" placeholder="Buscar por OP, carga, PO o cliente…" value="${esc(filtroTexto)}">
      <button class="chip${activo('todas')}" data-mod="todas">Todas <span class="chip-n">${nTodas}</span></button>
      <button class="chip${activo('margen_fijo')}" data-mod="margen_fijo">Margen <span class="chip-n">${nMargen}</span></button>
      <button class="chip${activo('consignacion')}" data-mod="consignacion">Consignación <span class="chip-n">${nConsig}</span></button>
      <button class="chip${activo('comision')}" data-mod="comision">Comisión <span class="chip-n">${nComision}</span></button>
      <span class="conteo" id="opConteo"></span>`;

    document.getElementById('opBusca').addEventListener('input', e => {
      clearTimeout(tempoBusca);
      tempoBusca = setTimeout(() => { filtroTexto = e.target.value; pintarLista(); }, 150);
    });
    cont.querySelectorAll('#opFiltros .chip').forEach(ch => ch.addEventListener('click', () => {
      cont.querySelectorAll('#opFiltros .chip').forEach(o => o.classList.remove('activo'));
      ch.classList.add('activo');
      filtroModalidad = ch.dataset.mod;
      pintarLista();
    }));
  }

  /* Línea de costo del detalle. "Fantasma" = contraparte_real distinta del proveedor del
     encabezado (comparación case/acento-insensible con ERP.norm — un espacio o mayúscula de
     más no debe disparar un falso fantasma). sin_contraparte=true es un caso aparte: no hay
     ninguna contraparte capturada todavía, no es que sea distinta — se marca "(interno /
     pendiente)" y NUNCA se cuenta como fantasma. */
  function filaCosto(c, encHead) {
    const esFantasma = !c.sin_contraparte && !!c.contraparte_real && norm(c.contraparte_real) !== norm(encHead);
    const contraHtml = c.sin_contraparte
      ? '<span style="color:var(--gris)">(interno / pendiente)</span>'
      : (c.contraparte_real ? esc(c.contraparte_real) : '<span style="color:var(--gris)">—</span>');
    return `<tr${esFantasma ? ' style="background:var(--ambar-bg)"' : ''}>
      <td>${esc(c.concepto || '—')}</td>
      <td class="num">${usd(c.monto)}</td>
      <td>${contraHtml}${esFantasma ? ` <span class="pill ambar" title="Distinto del proveedor en el encabezado (${esc(encHead || '—')})">fantasma</span>` : ''}</td>
      <td class="mono">${c.lote_folio ? esc(c.lote_folio) : '—'}</td>
      <td style="color:var(--gris)">${c.nota ? esc(c.nota) : ''}</td>
    </tr>`;
  }

  function filaCxp(r) {
    return `<tr>
      <td>${esc(r.contraparte || '—')}${r.interno ? ' <span class="pill gris">interno</span>' : ''}</td>
      <td class="num">${r.lineas == null ? '—' : esc(r.lineas)}</td>
      <td class="num">${usd(r.costo)}</td>
    </tr>`;
  }

  async function verOperacion(folioOp) {
    ERP.abrirPanel(esc(folioOp), 'Cargando…', '<div class="skel">Cargando…</div>');
    let op, costos, cxp;
    try {
      const [opRows, costosRows, cxpRows] = await Promise.all([
        q('v_operacion', `&folio_op=${ERP.eq(folioOp)}`),
        q('v_operacion_costos', `&folio_op=${ERP.eq(folioOp)}&order=concepto.asc`),
        q('v_operacion_cxp', `&folio_op=${ERP.eq(folioOp)}&order=costo.desc`)
      ]);
      op = opRows && opRows[0];
      costos = costosRows || [];
      cxp = cxpRows || [];
    } catch (e) {
      ERP.abrirPanel(esc(folioOp), '', `<div class="errbox">No se pudo cargar la operación: ${esc(e.message)}</div>`);
      return;
    }
    if (!op) {
      ERP.abrirPanel(esc(folioOp), '', '<div class="errbox">No se encontró la operación.</div>');
      return;
    }

    const encHead = op.proveedor_encabezado || '';
    const totalCxp = cxp.reduce((s, r) => s + num(r.costo), 0);
    const totalLineasCxp = cxp.reduce((s, r) => s + num(r.lineas || 0), 0);

    const cuerpo = `
      <div class="det-grid">
        <div class="det"><div class="l">Carga</div><div class="v mono">${esc(op.carga || '—')}${op.folio_carga_v1 && op.folio_carga_v1 !== op.carga ? ` <span style="color:var(--gris)">(v1: ${esc(op.folio_carga_v1)})</span>` : ''}</div></div>
        <div class="det"><div class="l">P.O.</div><div class="v mono">${esc(op.po || '—')}</div></div>
        <div class="det"><div class="l">Embarque</div><div class="v mono">${esc(ERP.fecha(op.f_embarque))}</div></div>
        <div class="det"><div class="l">Estado</div><div class="v">${ERP.badgeEstado(op.estado_carga)}</div></div>
        <div class="det"><div class="l">Cliente</div><div class="v">${esc(op.cliente || '—')}</div></div>
        <div class="det"><div class="l">Proveedor (encabezado)</div><div class="v">${esc(encHead || '—')}</div></div>
        <div class="det"><div class="l">Cajas</div><div class="v mono">${op.cajas == null ? '—' : fmt0(op.cajas)}</div></div>
        <div class="det"><div class="l">Ingreso (venta)</div><div class="v mono">${usd(op.ingreso_venta)}</div></div>
        <div class="det"><div class="l">Costo total</div><div class="v mono">${usd(op.costo_total)}</div></div>
        <div class="det"><div class="l">Venta (SO)</div><div class="v mono">${op.venta_so ? esc(op.venta_so) : '—'}</div></div>
      </div>
      ${op.proyecto_id ? `<div class="leyenda">Ligada al proyecto <span class="mono">${esc(op.proyecto_id)}</span>.</div>` : ''}

      <div class="seccion-head"><h4>Costos por línea</h4></div>
      ${costos.length ? `<div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>Concepto</th><th class="num">Monto</th><th>Contraparte real</th><th>Lote</th><th>Nota</th></tr></thead>
        <tbody>${costos.map(c => filaCosto(c, encHead)).join('')}</tbody>
      </table></div>
      <div class="leyenda"><span class="pill ambar">fantasma</span> = la línea la cobró un proveedor DISTINTO del que aparece en el encabezado (${esc(encHead || 'sin proveedor de encabezado')}) — típicamente proveedores de servicio (flete/comisión/reempaque). <b>(interno / pendiente)</b> = línea sin contraparte capturada todavía.</div>`
        : '<div class="vacio">Sin costos registrados.</div>'}

      <div class="seccion-head"><h4>Costo por contraparte real (CxP)</h4></div>
      ${cxp.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Contraparte</th><th class="num">Líneas</th><th class="num">Costo</th></tr></thead>
        <tbody>${cxp.map(filaCxp).join('')}</tbody>
        <tfoot><tr class="total"><td>Total</td><td class="num">${totalLineasCxp}</td><td class="num">${usd(totalCxp)}</td></tr></tfoot>
      </table></div>` : '<div class="vacio">Sin costos por contraparte.</div>'}`;

    ERP.abrirPanel(
      `${esc(op.folio_op)}${op.carga ? ` <span style="font-weight:400;color:var(--gris)">· ${esc(op.carga)}</span>` : ''}`,
      `${esc(op.cliente || '—')} · ${pillModalidad(op.modalidad)}`,
      cuerpo
    );
    ERP.enlazarFolios(document.getElementById('panelBody'));
  }

  async function render(cont, parametro) {
    operaciones = await q('v_operacion_resumen');
    operaciones.sort((a, b) => String(b.folio_op || '').localeCompare(String(a.folio_op || ''), 'es', { numeric: true }));

    filtroModalidad = 'todas';
    filtroTexto = '';

    cont.innerHTML = `
      <div class="pantalla-operaciones">
      <div id="opKpis" class="kpistrip"></div>
      <div id="opFiltros" class="filtros"></div>
      <div id="opLista"></div>
      <div class="leyenda">
        Cada tarjeta es una <b>operación (OP)</b> — el hilo que une venta, compra y embarque de un mismo lote.
        En consignación el margen se reconoce <b>al liquidar</b>, nunca al embarcar (D-04) — por eso "— al liquidar" y no $0.00.
        Toca una operación para ver su desglose por línea y quién cobró realmente cada costo.
      </div>
      </div>`;

    pintarKpis();
    pintarFiltros(cont);
    pintarLista();

    if (parametro) verOperacion(parametro);
  }

  ERP.registrar('operaciones', {
    titulo: 'Operaciones (OP)',
    descripcion: 'El hilo conductor: venta, compra y embarque de cada operación (modelo OP)',
    render
  });
})();
