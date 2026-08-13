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
  const { q, rpc, esc, usd, num, fmt0, pct, norm, MONEDAS } = ERP;

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
      <span class="conteo" id="opConteo"></span>
      ${ERP.puede('capturar') ? '<button class="btn-mini" id="opBtnNueva"><i class="ti ti-plus"></i> Nueva operación</button>' : ''}`;

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
    const btnNueva = document.getElementById('opBtnNueva');
    if (btnNueva) btnNueva.addEventListener('click', abrirNuevaOperacion);
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

  /* Fila de v_operacion_compras (D-152) — una OC colgada de la OP vía fn_op_agregar_compra
     (Slice 2). Vive ANTES de "Costos por línea" en el hilo: Venta → Compras (OC) → Costos
     (estos últimos nacen con el embarque, Slice 3, y son otra cosa). */
  function filaCompra(c) {
    return `<tr>
      <td class="mono">${esc(c.oc_folio)}</td>
      <td>${esc(c.proveedor || '—')}</td>
      <td class="mono">${c.numero_proveedor ? esc(c.numero_proveedor) : '—'}</td>
      <td>${esc(c.moneda || '—')}</td>
      <td class="num">${usd(c.total)}</td>
      <td><span class="pill gris">${esc(c.estado || '—')}</span></td>
      <td class="num">${c.n_items == null ? '—' : esc(c.n_items)}</td>
      <td class="mono">${c.f_entrega_est ? esc(ERP.fecha(c.f_entrega_est)) : '—'}</td>
    </tr>`;
  }

  async function verOperacion(folioOp) {
    ERP.abrirPanel(esc(folioOp), 'Cargando…', '<div class="skel">Cargando…</div>');
    let op, costos, cxp, compras;
    try {
      const [opRows, costosRows, cxpRows, comprasRows] = await Promise.all([
        q('v_operacion', `&folio_op=${ERP.eq(folioOp)}`),
        q('v_operacion_costos', `&folio_op=${ERP.eq(folioOp)}&order=concepto.asc`),
        q('v_operacion_cxp', `&folio_op=${ERP.eq(folioOp)}&order=costo.desc`),
        q('v_operacion_compras', `&folio_op=${ERP.eq(folioOp)}&order=oc_folio.asc`)
      ]);
      op = opRows && opRows[0];
      costos = costosRows || [];
      cxp = cxpRows || [];
      compras = comprasRows || [];
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

      ${ERP.puede('capturar') ? `<div class="acciones" style="margin:4px 0 12px">
        <button class="btn-mini" id="opBtnAgregarCompra">Agregar compra</button>
        <button class="btn-mini" id="opBtnRegistrarEmbarque">Registrar embarque</button>
      </div>` : ''}

      <div class="seccion-head"><h4>Compras (OC)</h4></div>
      ${compras.length ? `<div class="tabla-wrap"><table class="fact-lineas">
        <thead><tr><th>OC</th><th>Proveedor</th><th>Núm. oficial</th><th>Moneda</th>
          <th class="num">Total</th><th>Estado</th><th class="num">Ítems</th><th>Entrega est.</th></tr></thead>
        <tbody>${compras.map(filaCompra).join('')}</tbody>
      </table></div>` : '<div class="vacio">Sin compras registradas todavía.</div>'}

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
      </table></div>` : '<div class="vacio">Sin costos por contraparte.</div>'}

      ${ERP.puede('administrar') ? `<div class="zona-peligro">
        <span class="nota">Anular retira TODO el hilo de esta operación (venta, compra y embarque) de saldos y reportes de un jalón. Si alguna carga ya tiene cobros/pagos aplicados, el ERP lo rechaza — hay que desaplicar primero.</span>
        <button class="btn-mini peligro" id="opBtnAnular">Anular operación</button>
      </div>` : ''}`;

    ERP.abrirPanel(
      `${esc(op.folio_op)}${op.carga ? ` <span style="font-weight:400;color:var(--gris)">· ${esc(op.carga)}</span>` : ''}`,
      `${esc(op.cliente || '—')} · ${pillModalidad(op.modalidad)}`,
      cuerpo
    );
    ERP.enlazarFolios(document.getElementById('panelBody'));
    const btnCompra = document.getElementById('opBtnAgregarCompra');
    if (btnCompra) btnCompra.addEventListener('click', () => abrirAgregarCompra(op.folio_op));
    const btnEmbarque = document.getElementById('opBtnRegistrarEmbarque');
    if (btnEmbarque) btnEmbarque.addEventListener('click', () => abrirRegistrarEmbarque(op));
    const btnAnular = document.getElementById('opBtnAnular');
    if (btnAnular) btnAnular.addEventListener('click', () => anularOperacion(op));
  }

  /* ================= "+ Nueva operación" (Slice 1 del rediseño OP, D-147..D-149) =================
     Crea la OP (fn_abrir_operacion) y le cuelga su primera venta (fn_op_agregar_venta) en un
     solo formulario. Producto/cajas NO se capturan aquí — viven en compra/embarque (Slice 2/3,
     por herencia sin recaptura). Las 2 llamadas NO son atómicas: si la 2ª falla, la OP ya
     existe — se avisa y se ofrece "Reintentar venta" reusando el folio_op ya creado, para no
     dejar OPs huérfanas duplicadas por reintentar desde cero. */

  // 5 campos de precio/comisión; solo los de la modalidad activa se leen del DOM al guardar —
  // los demás van null aunque el input tenga texto (p.ej. si el usuario cambió de modalidad
  // sin borrar lo que ya había escrito).
  const CAMPOS_MODALIDAD = {
    comisionCaja: { campoId: 'opCampoComisionCaja', inputId: 'opComisionCaja', param: 'p_comision_por_caja' },
    cuotaFija:    { campoId: 'opCampoCuotaFija',    inputId: 'opCuotaFija',    param: 'p_cuota_fija_embarque' },
    pctComision:  { campoId: 'opCampoPctComision',  inputId: 'opPctComision',  param: 'p_pct_comision' },
    precioCompra: { campoId: 'opCampoPrecioCompra', inputId: 'opPrecioCompra', param: 'p_precio_compra_caja' },
    precioVenta:  { campoId: 'opCampoPrecioVenta',  inputId: 'opPrecioVenta',  param: 'p_precio_venta_caja' }
  };
  const MODALIDADES_OP = [
    { id: 1, nombre: 'Comisión pura', campos: ['comisionCaja', 'cuotaFija'] },
    { id: 2, nombre: 'Margen fijo', campos: ['precioCompra', 'precioVenta'] },
    { id: 3, nombre: 'Consignación', campos: ['pctComision'] },
    { id: 4, nombre: 'Buy & Resell', campos: ['precioCompra', 'precioVenta'] }
  ];

  let comboClienteOp = null;
  // Estado de una sesión de captura en curso: si fn_abrir_operacion ya corrió, se guarda el
  // folio para que un reintento de la venta NO vuelva a abrir una OP nueva.
  let opEnProgreso = { folioOp: null };

  function avisoOp(tipo, html) {
    const el = document.getElementById('opAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  function limpiarAvisoOp() {
    const el = document.getElementById('opAviso');
    if (el) { el.className = 'aviso'; el.innerHTML = ''; }
  }

  function actualizarCamposModalidadOp() {
    const idSel = Number(document.getElementById('opModalidad').value);
    const activa = MODALIDADES_OP.find(m => m.id === idSel);
    const camposActivos = activa ? activa.campos : [];
    Object.keys(CAMPOS_MODALIDAD).forEach(k => {
      const visible = camposActivos.includes(k);
      const cont = document.getElementById(CAMPOS_MODALIDAD[k].campoId);
      if (cont) cont.style.display = visible ? '' : 'none';
    });
  }

  async function abrirNuevaOperacion() {
    opEnProgreso = { folioOp: null };
    ERP.abrirPanel('Nueva operación', 'Crea la OP y su primera venta en un paso', '<div class="skel">Cargando clientes…</div>');

    let clientes, proyectos;
    try {
      [clientes, proyectos] = await Promise.all([
        q('v_directorio_contrapartes', '&es_cliente=eq.true&order=nombre.asc'),
        q('proyectos_productor', '&order=nombre.asc').catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel('Nueva operación', '', `<div class="errbox">No se pudieron cargar los clientes: ${esc(e.message)}</div>`);
      return;
    }

    ERP.abrirPanel('Nueva operación', 'Crea la OP y su primera venta en un paso', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo">
            <label>Cliente <span class="req">*</span></label>
            <div id="opCliente"></div>
          </div>
          <div class="campo">
            <label>Modalidad <span class="req">*</span></label>
            <select id="opModalidad">
              ${MODALIDADES_OP.map(m => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="campo">
            <label>PO del cliente</label>
            <input id="opCustomerPo" type="text" placeholder="Opcional">
          </div>
          <div class="campo">
            <label>Días de crédito</label>
            <input id="opDiasCredito" class="mono" type="number" step="1" min="0" placeholder="Opcional">
          </div>
          <div class="campo">
            <label>Incoterm</label>
            <input id="opIncoterm" type="text" placeholder="ej. FOB, CIF, DDP — opcional">
          </div>
          <div class="campo">
            <label>Proyecto</label>
            <select id="opProyecto">
              <option value="">— Ninguno (no ligada a un proyecto)</option>
              ${(proyectos || []).map(p => `<option value="${esc(p.id)}">${esc(p.nombre)}${p.estado ? ' (' + esc(p.estado) + ')' : ''}</option>`).join('')}
            </select>
          </div>
          <div class="campo" id="opCampoComisionCaja">
            <label>Comisión por caja (USD)</label>
            <input id="opComisionCaja" class="mono" type="number" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="campo" id="opCampoCuotaFija">
            <label>Cuota fija por embarque (USD)</label>
            <input id="opCuotaFija" class="mono" type="number" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="campo" id="opCampoPctComision">
            <label>% de comisión sobre venta</label>
            <input id="opPctComision" class="mono" type="number" step="0.01" min="0" max="100" placeholder="0.00">
          </div>
          <div class="campo" id="opCampoPrecioCompra">
            <label>Precio de compra por caja (USD)</label>
            <input id="opPrecioCompra" class="mono" type="number" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="campo" id="opCampoPrecioVenta">
            <label>Precio de venta por caja (USD)</label>
            <input id="opPrecioVenta" class="mono" type="number" step="0.01" min="0" placeholder="0.00">
          </div>
          <div class="campo ancho">
            <label>Nota</label>
            <input id="opNota" type="text" maxlength="200" placeholder="Opcional">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="opGuardar">Crear operación</button>
          <button class="btn-mini gris" id="opCancelar">Cancelar</button>
        </div>
        <div class="aviso visible warn" id="opAviso">Producto y cajas no se capturan aquí — se agregan con la compra y el embarque (próximos pasos).</div>
      </div>`);

    comboClienteOp = ERP.crearCombo({
      contenedor: document.getElementById('opCliente'),
      items: (clientes || []).map(c => ({ id: c.id, nombre: c.nombre })),
      placeholder: 'Busca por nombre…',
      permitirNuevo: false
    });

    document.getElementById('opModalidad').addEventListener('change', actualizarCamposModalidadOp);
    actualizarCamposModalidadOp();

    document.getElementById('opCancelar').addEventListener('click', () => {
      if (opEnProgreso.folioOp && !window.confirm(
        `La operación ${opEnProgreso.folioOp} ya se creó (sin venta todavía). ¿Cerrar de todos modos?\n\nPodrás agregarle la venta más tarde.`)) return;
      ERP.cerrarPanel();
    });
    document.getElementById('opGuardar').addEventListener('click', guardarNuevaOperacion);
  }

  async function guardarNuevaOperacion() {
    limpiarAvisoOp();
    const clienteId = comboClienteOp.valorId();
    if (!clienteId) {
      avisoOp('err', 'Elige un cliente de la lista.' + (comboClienteOp.textoCrudo() ? ' Este cliente no existe en el Directorio Comercial — dalo de alta ahí primero.' : ''));
      return;
    }
    const modalidadId = Number(document.getElementById('opModalidad').value);
    const proyectoId = document.getElementById('opProyecto').value || null;
    const customerPo = document.getElementById('opCustomerPo').value.trim();
    const diasCreditoRaw = document.getElementById('opDiasCredito').value.trim();
    const incoterm = document.getElementById('opIncoterm').value.trim();
    const nota = document.getElementById('opNota').value.trim();

    const activa = MODALIDADES_OP.find(m => m.id === modalidadId);
    const precios = {};
    Object.keys(CAMPOS_MODALIDAD).forEach(k => {
      const { inputId, param } = CAMPOS_MODALIDAD[k];
      const activo = activa && activa.campos.includes(k);
      const raw = activo ? document.getElementById(inputId).value.trim() : '';
      precios[param] = raw === '' ? null : Number(raw);
    });

    const btn = document.getElementById('opGuardar');
    btn.disabled = true;
    avisoOp('warn', opEnProgreso.folioOp ? 'Reintentando registrar la venta…' : 'Creando operación…');

    try {
      let folioOp = opEnProgreso.folioOp;
      if (!folioOp) {
        folioOp = await rpc('fn_abrir_operacion', { p_proyecto_id: proyectoId ? Number(proyectoId) : null, p_nota: nota || null });
        opEnProgreso.folioOp = folioOp;
        ERP.marcarDatosSucios();   // la OP ya existe aunque la venta truene abajo — refresca la lista de fondo
      }

      const folioSo = await rpc('fn_op_agregar_venta', {
        p_folio_op: folioOp, p_cliente_id: clienteId, p_revenue_model_id: modalidadId,
        p_customer_po: customerPo || null, p_cotizacion_folio: null, p_programa_id: null,
        p_moneda: 'USD', p_dias_credito: diasCreditoRaw === '' ? null : Number(diasCreditoRaw),
        p_incoterm: incoterm || null,
        p_comision_por_caja: precios.p_comision_por_caja, p_pct_comision: precios.p_pct_comision,
        p_precio_compra_caja: precios.p_precio_compra_caja, p_precio_venta_caja: precios.p_precio_venta_caja,
        p_nota: nota || null, p_cuota_fija_embarque: precios.p_cuota_fija_embarque
      });

      ERP.marcarDatosSucios();
      ERP.toast('ok', `Operación <b>${esc(folioOp)}</b> creada con venta <b>${esc(folioSo)}</b>.`);
      ERP.cerrarPanel();
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      if (opEnProgreso.folioOp) {
        avisoOp('err', `La operación <b>${esc(opEnProgreso.folioOp)}</b> ya se creó, pero la venta NO se pudo registrar: ${esc(e.message)}. Corrige los datos e intenta de nuevo — no se creará otra operación.`);
        btn.textContent = 'Reintentar venta';
      } else {
        avisoOp('err', `No se pudo crear la operación: ${esc(e.message)}`);
      }
    }
    btn.disabled = false;
  }

  /* ================= "Agregar compra" (Slice 2 del rediseño OP, D-150) =================
     Cuelga una compra (OC) de una OP existente vía fn_op_agregar_compra — wrapper OP-céntrico
     sobre fn_crear_orden_compra ya usado por modulo-ordenes.js. Mismo editor de líneas que esa
     pantalla (producto de catálogo o descripción libre, cantidad/unidad/precio, total en vivo)
     — reusado aquí en vez de reinventado, mismos nombres de campo que ya conoce el backend.
     Comisión pura NO bloquea (el backend solo emite un RAISE NOTICE que supabase-js no expone;
     es decisión de negocio de Miguel, no un error — no se simula el aviso aquí). */

  let productosCompra = [];
  let lineasCompra = [];
  let comboProveedorCompra = null;

  const nuevaLineaCompra = () => ({ producto_id: '', descripcion: '', cantidad: '1', unidad: 'caja', precio_unitario: '' });
  const numOrNullCompra = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);
  const importeLineaCompra = l => (numOrNullCompra(l.cantidad) || 0) * (numOrNullCompra(l.precio_unitario) || 0);

  async function cargarCatalogosCompra() {
    const [prods, directorio] = await Promise.all([
      q('v_catalogo_productos', '&order=nombre.asc').catch(() => []),
      q('v_directorio_contrapartes', '&es_proveedor=eq.true&clase=eq.comercial&order=nombre.asc')
    ]);
    productosCompra = prods;
    return directorio.map(c => ({ id: c.id, nombre: c.nombre }));
  }

  function montarLineasCompra() {
    const body = document.getElementById('opcLineasBody');
    if (!body) return;
    const opts = l => '<option value="">— libre —</option>' +
      productosCompra.map(p => `<option value="${p.id}"${String(l.producto_id) === String(p.id) ? ' selected' : ''}>${esc(p.nombre)}</option>`).join('');
    body.innerHTML = lineasCompra.map((l, i) => `<tr>
      <td><select class="opc-li" data-i="${i}" data-k="producto_id">${opts(l)}</select></td>
      <td><input class="opc-li" data-i="${i}" data-k="descripcion" type="text" value="${esc(l.descripcion)}" placeholder="Descripción libre"></td>
      <td><input class="opc-li num" data-i="${i}" data-k="cantidad" type="number" step="0.01" min="0" value="${esc(l.cantidad)}"></td>
      <td><input class="opc-li" data-i="${i}" data-k="unidad" type="text" value="${esc(l.unidad)}" style="width:64px"></td>
      <td><input class="opc-li num" data-i="${i}" data-k="precio_unitario" type="number" step="0.01" min="0" value="${esc(l.precio_unitario)}" placeholder="0.00"></td>
      <td class="num opc-importe" data-i="${i}">${usd(importeLineaCompra(l))}</td>
      <td><button class="btn-cap" data-del="${i}" title="Quitar línea">✕</button></td>
    </tr>`).join('');

    body.querySelectorAll('.opc-li').forEach(inp => {
      inp.addEventListener('input', onLineaCompraInput);
      inp.addEventListener('change', onLineaCompraInput);
    });
    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      recogerLineasCompra();
      lineasCompra.splice(Number(b.dataset.del), 1);
      if (!lineasCompra.length) lineasCompra.push(nuevaLineaCompra());
      montarLineasCompra();
    }));
    recomputarTotalCompra();
  }

  function onLineaCompraInput(e) {
    const i = Number(e.target.dataset.i), k = e.target.dataset.k;
    lineasCompra[i][k] = e.target.value;
    const cel = document.querySelector(`.opc-importe[data-i="${i}"]`);
    if (cel) cel.textContent = usd(importeLineaCompra(lineasCompra[i]));
    recomputarTotalCompra();
  }

  function recogerLineasCompra() {
    document.querySelectorAll('#opcLineasBody .opc-li').forEach(inp => {
      const i = Number(inp.dataset.i), k = inp.dataset.k;
      if (lineasCompra[i]) lineasCompra[i][k] = inp.value;
    });
  }

  function recomputarTotalCompra() {
    const el = document.getElementById('opcTotal');
    if (el) el.textContent = usd(lineasCompra.reduce((s, l) => s + importeLineaCompra(l), 0));
  }

  function itemsPayloadCompra() {
    recogerLineasCompra();
    return lineasCompra
      .filter(l => l.producto_id || String(l.descripcion).trim())
      .map(l => ({
        producto_id: l.producto_id ? Number(l.producto_id) : null,
        descripcion: String(l.descripcion || '').trim() || null,
        cantidad: numOrNullCompra(l.cantidad),
        unidad: String(l.unidad || '').trim() || null,
        precio_unitario: numOrNullCompra(l.precio_unitario)
      }));
  }

  function avisoCompra(tipo, html) {
    const el = document.getElementById('opcAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function abrirAgregarCompra(folioOp) {
    ERP.abrirPanel('Agregar compra', `A la operación ${esc(folioOp)}`, '<div class="skel">Cargando proveedores…</div>');

    let proveedores;
    try {
      proveedores = await cargarCatalogosCompra();
    } catch (e) {
      ERP.abrirPanel('Agregar compra', '', `<div class="errbox">No se pudieron cargar los proveedores: ${esc(e.message)}</div>`);
      return;
    }
    lineasCompra = [nuevaLineaCompra()];

    ERP.abrirPanel('Agregar compra', `A la operación ${esc(folioOp)}`, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Proveedor <span class="req">*</span></label>
            <div id="opcProveedor"></div>
          </div>
          <div class="campo">
            <label>Número oficial de OC del proveedor</label>
            <input id="opcNumeroProveedor" type="text" placeholder="Opcional">
          </div>
          <div class="campo">
            <label>Moneda</label>
            <select id="opcMoneda">${MONEDAS.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select>
          </div>
          <div class="campo">
            <label>Fecha de entrega estimada</label>
            <input id="opcFEntrega" type="date">
          </div>
          <div class="campo ancho">
            <label>Condiciones</label>
            <input id="opcCondiciones" type="text" placeholder="Opcional — ej. entrega en bodega, calidad…">
          </div>
          <div class="campo ancho">
            <label>Notas</label>
            <input id="opcNotas" type="text" placeholder="Opcional">
          </div>
        </div>

        <div class="seccion-head"><h4>Líneas</h4><button class="btn-mini gris" id="opcAddLinea">+ Línea</button></div>
        <div class="tabla-wrap"><table class="fact-lineas">
          <thead><tr><th>Producto</th><th>Descripción</th><th class="num">Cantidad</th><th>Unidad</th>
            <th class="num">Precio unit.</th><th class="num">Importe</th><th></th></tr></thead>
          <tbody id="opcLineasBody"></tbody>
          <tfoot><tr class="total"><td colspan="5">Total</td><td class="num" id="opcTotal">$0.00</td><td></td></tr></tfoot>
        </table></div>

        <div class="acciones">
          <button class="btn-mini" id="opcGuardar">Agregar compra</button>
          <button class="btn-mini gris" id="opcCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="opcAviso"></div>
      </div>`);

    comboProveedorCompra = ERP.crearCombo({
      contenedor: document.getElementById('opcProveedor'),
      items: proveedores,
      placeholder: 'Busca proveedor comercial por nombre…',
      permitirNuevo: false
    });

    montarLineasCompra();
    document.getElementById('opcAddLinea').addEventListener('click', () => {
      recogerLineasCompra();
      lineasCompra.push(nuevaLineaCompra());
      montarLineasCompra();
    });
    document.getElementById('opcCancelar').addEventListener('click', () => verOperacion(folioOp));
    document.getElementById('opcGuardar').addEventListener('click', () => guardarCompra(folioOp));
  }

  async function guardarCompra(folioOp) {
    const proveedorId = comboProveedorCompra && comboProveedorCompra.valorId();
    if (!proveedorId) {
      avisoCompra('err', 'Elige un proveedor comercial de la lista.');
      return;
    }
    const items = itemsPayloadCompra();
    if (!items.length) {
      avisoCompra('err', 'Agrega al menos una línea (producto o descripción).');
      return;
    }
    const v = id => (document.getElementById(id) || {}).value;
    const args = {
      p_folio_op: folioOp,
      p_proveedor_id: Number(proveedorId),
      p_items: items,
      p_numero_proveedor: v('opcNumeroProveedor').trim() || null,
      p_moneda: v('opcMoneda') || 'USD',
      p_f_entrega_est: v('opcFEntrega') || null,
      p_condiciones: v('opcCondiciones').trim() || null,
      p_notas: v('opcNotas').trim() || null,
      p_carga_folio: null
    };
    const btn = document.getElementById('opcGuardar');
    btn.disabled = true;
    avisoCompra('warn', 'Agregando compra…');
    try {
      const folioOc = await rpc('fn_op_agregar_compra', args);
      ERP.marcarDatosSucios();
      ERP.toast('ok', `Compra <b>${esc(folioOc)}</b> agregada a <b>${esc(folioOp)}</b>.`);
      await verOperacion(folioOp);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoCompra('err', `El ERP rechazó la compra: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= "Registrar embarque" (Slice 3 del rediseño OP, D-151) =================
     El eslabón final del hilo: crea la carga física (fn_op_agregar_embarque, wrapper sobre
     fn_crear_carga) con herencia SIN RECAPTURA desde la venta única de la OP (PO/cliente/
     modalidad quedan null = "hereda"), más los datos propios del embarque (proveedor de materia
     prima, producto, fechas, cajas/pallets, ingreso, costos desglosados) y auto-liga la carga a
     la venta si p_auto_ligar_venta=true. A DIFERENCIA de venta/compra, ESTA RPC SÍ mueve dinero
     (ingreso→CxC, costos→CxP) — por eso no se agrega validación extra de nuestra cosecha: el
     backend ya está blindado (D-151, ENSAYO OK) y cualquier RAISE se muestra tal cual, sin
     traducir ni ocultar (PO duplicado, consignación con ingreso>0, etc.).

     ⚠️ fn_op_agregar_embarque RETURNS TABLE (a diferencia de fn_abrir_operacion/
     fn_op_agregar_venta/fn_op_agregar_compra, que son escalares) — rpc() de comun.js ya
     funciona para ambos casos: solo hace `return data` tal cual viene de supabase-js, así que
     aquí se lee `data[0]` (mismo patrón que fn_traspaso/fn_crear_carga en otros módulos), sin
     que haga falta tocar el helper compartido. */

  let comboClienteEmb = null, comboProveedorEmb = null, comboProductoEmb = null;
  // D-157/158/159: si la OP tiene OC(s) viva(s), proveedor + materia prima se heredan de ellas
  // — el form deja de pedirlos y guardarEmbarque() manda p_proveedor/p_materia_prima en null.
  let ocsHerenciaEmb = [];

  function avisoEmb(tipo, html) {
    const el = document.getElementById('opeAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  function limpiarAvisoEmb() {
    const el = document.getElementById('opeAviso');
    if (el) { el.className = 'aviso'; el.innerHTML = ''; }
  }

  /* Consignación nace SIN liquidar (A-07/D-11): el ingreso se reconoce al cobro, nunca al
     embarcar. Si la modalidad EFECTIVA (elegida o, si se deja vacía, la heredada de la venta —
     ya conocida vía op.modalidad) es consignación, se fuerza el ingreso a 0 y se bloquea el
     campo — evita el viaje redondo obvio. Si aun así el backend recibe consignación con
     ingreso>0 (caso raro: venta multi-modalidad, etc.), hace RAISE y ese mensaje se muestra tal
     cual, sin intentar adivinarlo aquí. */
  function actualizarIngresoEmbarque(op) {
    const modSel = document.getElementById('opeModalidad').value;
    const efectiva = modSel || op.modalidad;
    const inputIngreso = document.getElementById('opeIngreso');
    const notaConsig = document.getElementById('opeNotaConsig');
    if (!inputIngreso) return;
    if (efectiva === 'consignacion') {
      inputIngreso.value = '0';
      inputIngreso.disabled = true;
      if (notaConsig) notaConsig.style.display = '';
    } else {
      inputIngreso.disabled = false;
      if (notaConsig) notaConsig.style.display = 'none';
    }
  }

  function recomputarTotalCostosEmbarque() {
    const el = document.getElementById('opeTotalCostos');
    if (!el) return;
    const ids = ['opeMateriaPrima', 'opeComision', 'opeAduanas', 'opeQc', 'opeFletes', 'opeCarton', 'opeOtro'];
    const total = ids.reduce((s, id) => s + num((document.getElementById(id) || {}).value), 0);
    el.textContent = usd(total);
  }

  async function abrirRegistrarEmbarque(op) {
    const folioOp = op.folio_op;
    ERP.abrirPanel('Registrar embarque', `Crea la carga física de ${esc(folioOp)}`, '<div class="skel">Cargando catálogos…</div>');

    let clientes, proveedores, productos, compras;
    try {
      [clientes, proveedores, productos, compras] = await Promise.all([
        q('v_directorio_contrapartes', '&es_cliente=eq.true&order=nombre.asc'),
        q('v_directorio_contrapartes', '&es_proveedor=eq.true&order=nombre.asc'),
        q('v_catalogo_productos', '&order=nombre.asc'),
        q('v_operacion_compras', `&folio_op=${ERP.eq(folioOp)}&order=total.desc`)
      ]);
    } catch (e) {
      ERP.abrirPanel('Registrar embarque', '', `<div class="errbox">No se pudieron cargar los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    // D-157/158/159: OC "viva" = no cancelada (mismo criterio que estadoDe() en modulo-ordenes.js,
    // donde una OC anulada se muestra con estado 'Cancelada'). Con >=1 OC viva, el backend hereda
    // proveedor + materia prima de ellas e ignora lo que se capture aquí — el form deja de pedirlo.
    ocsHerenciaEmb = (compras || []).filter(c => c.estado !== 'Cancelada');
    const hayOcViva = ocsHerenciaEmb.length > 0;
    const proveedorEncabezadoOc = hayOcViva ? (ocsHerenciaEmb[0].proveedor || '—') : null;
    const totalMateriaPrimaOc = ocsHerenciaEmb.reduce((s, c) => s + num(c.total), 0);

    const bloqueProveedor = hayOcViva
      ? `<div class="campo ancho">
          <label>Proveedor de materia prima</label>
          <div class="campo-fijo">
            Heredado de: ${ocsHerenciaEmb.map(c => `<b>${esc(c.oc_folio)}</b> ${usd(c.total)} (${esc(c.proveedor || '—')})`).join(', ')}
            <div class="aclara">Encabezado de la carga: <b>${esc(proveedorEncabezadoOc)}</b> (OC de mayor total). El backend ignora cualquier proveedor que se capture aquí.</div>
          </div>
        </div>`
      : `<div class="campo ancho">
          <label>Proveedor de materia prima <span style="color:var(--ambar);text-transform:none">(muy recomendado)</span></label>
          <div id="opeProveedor"></div>
          <div class="alias-ayuda">Sin proveedor, los costos NO entran a Cuentas por Pagar y el embarque queda con flag.</div>
        </div>`;

    const campoMateriaPrima = hayOcViva
      ? `<div class="campo">
          <label>Materia prima</label>
          <div class="campo-fijo">${usd(totalMateriaPrimaOc)}<div class="aclara">Heredado de la(s) OC — ver arriba</div></div>
        </div>`
      : `<div class="campo"><label>Materia prima</label><input id="opeMateriaPrima" class="mono opec" type="number" step="0.01" min="0" placeholder="0.00"></div>`;

    ERP.abrirPanel('Registrar embarque', `Crea la carga física de ${esc(folioOp)}`, `
      <div class="form-erp">
        <div class="grupo-form">Heredado de la venta (opcional)</div>
        <div class="campos">
          <div class="campo">
            <label>PO</label>
            <input id="opePo" type="text" placeholder="${op.po ? 'Heredar (actual: ' + esc(op.po) + ')' : 'Heredar de la venta'}">
          </div>
          <div class="campo">
            <label>Cliente</label>
            <div id="opeCliente"></div>
          </div>
          <div class="campo">
            <label>Modalidad</label>
            <select id="opeModalidad">
              <option value="">(Heredar de la venta${op.modalidad ? ': ' + esc(op.modalidad) : ''})</option>
              <option value="margen_fijo">Margen fijo</option>
              <option value="consignacion">Consignación</option>
              <option value="comision">Comisión</option>
            </select>
          </div>
        </div>
        <div class="leyenda">Si lo dejas vacío, se hereda de la venta de la OP.</div>

        <div class="grupo-form">Embarque</div>
        <div class="campos">
          ${bloqueProveedor}
          <div class="campo">
            <label>Producto</label>
            <div id="opeProducto"></div>
          </div>
          <div class="campo">
            <label>Fecha de embarque</label>
            <input id="opeFEmbarque" type="date">
          </div>
          <div class="campo">
            <label>Fecha de entrega</label>
            <input id="opeFEntrega" type="date">
          </div>
          <div class="campo">
            <label>Cajas</label>
            <input id="opeCajas" class="mono" type="number" step="1" min="0" placeholder="Opcional">
          </div>
          <div class="campo">
            <label>Pallets</label>
            <input id="opePallets" class="mono" type="number" step="1" min="0" placeholder="Opcional">
          </div>
          <div class="campo">
            <label>Ingreso de venta (USD)</label>
            <input id="opeIngreso" class="mono" type="number" step="0.01" min="0" value="0">
            <div class="leyenda" id="opeNotaConsig" style="display:none;margin-top:4px">Consignación nace sin liquidar; el ingreso se reconoce al cobro (A-07/D-11).</div>
          </div>
        </div>

        <div class="grupo-form">Costos por concepto${hayOcViva ? ' (materia prima heredada; el resto sigue siendo opcional)' : ' (opcionales)'}</div>
        <div class="campos">
          ${campoMateriaPrima}
          <div class="campo"><label>Comisión</label><input id="opeComision" class="mono opec" type="number" step="0.01" min="0" placeholder="0.00"></div>
          <div class="campo"><label>Aduanas</label><input id="opeAduanas" class="mono opec" type="number" step="0.01" min="0" placeholder="0.00"></div>
          <div class="campo"><label>In &amp; Out QC</label><input id="opeQc" class="mono opec" type="number" step="0.01" min="0" placeholder="0.00"></div>
          <div class="campo"><label>Fletes</label><input id="opeFletes" class="mono opec" type="number" step="0.01" min="0" placeholder="0.00"></div>
          <div class="campo"><label>Cartón</label><input id="opeCarton" class="mono opec" type="number" step="0.01" min="0" placeholder="0.00"></div>
          <div class="campo"><label>Otro</label><input id="opeOtro" class="mono opec" type="number" step="0.01" min="0" placeholder="0.00"></div>
          <div class="campo"><label>Total costos (referencia)</label><div class="v mono" id="opeTotalCostos" style="padding:9px 0;font-weight:600">$0.00</div></div>
        </div>

        <div class="campo ancho">
          <div class="checks">
            <label><input id="opeLigarVenta" type="checkbox" checked> Ligar a la venta de la OP</label>
          </div>
        </div>
        <div class="campo ancho">
          <label>Nota</label>
          <input id="opeNota" type="text" maxlength="200" placeholder="Opcional">
        </div>

        <div class="acciones">
          <button class="btn-mini" id="opeGuardar">Registrar embarque</button>
          <button class="btn-mini gris" id="opeCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="opeAviso"></div>
      </div>`);

    comboClienteEmb = ERP.crearCombo({
      contenedor: document.getElementById('opeCliente'),
      items: clientes.map(c => ({ id: c.id, nombre: c.nombre })),
      placeholder: op.cliente ? `Heredar (actual: ${op.cliente})` : 'Heredar de la venta',
      permitirNuevo: true, etiquetaNuevo: 'cliente'
    });
    // Sin OC viva: combo normal de proveedor. Con OC viva, el bloque #opeProveedor ni existe en
    // el DOM (se reemplazó por el bloque "Heredado de…" read-only) — comboProveedorEmb queda
    // null y guardarEmbarque() manda p_proveedor en null a propósito.
    comboProveedorEmb = hayOcViva ? null : ERP.crearCombo({
      contenedor: document.getElementById('opeProveedor'),
      items: proveedores.map(p => ({ id: p.id, nombre: p.nombre })),
      placeholder: 'Busca por nombre…',
      permitirNuevo: true, etiquetaNuevo: 'proveedor'
    });
    comboProductoEmb = ERP.crearCombo({
      contenedor: document.getElementById('opeProducto'),
      items: productos.map(p => ({ id: p.id, nombre: p.nombre })),
      placeholder: 'Busca por nombre…',
      permitirNuevo: true, etiquetaNuevo: 'producto'
    });

    actualizarIngresoEmbarque(op);
    document.getElementById('opeModalidad').addEventListener('change', () => actualizarIngresoEmbarque(op));
    document.querySelectorAll('.opec').forEach(inp => inp.addEventListener('input', recomputarTotalCostosEmbarque));

    document.getElementById('opeCancelar').addEventListener('click', () => verOperacion(folioOp));
    document.getElementById('opeGuardar').addEventListener('click', () => guardarEmbarque(op));
  }

  async function guardarEmbarque(op) {
    const folioOp = op.folio_op;
    limpiarAvisoEmb();
    const v = id => (document.getElementById(id) || {}).value;
    const numOrNullEmb = raw => { const t = String(raw == null ? '' : raw).trim(); return t === '' ? null : Number(t); };
    const intOrNullEmb = raw => { const t = String(raw == null ? '' : raw).trim(); return t === '' ? null : Math.trunc(Number(t)); };

    const args = {
      p_folio_op: folioOp,
      p_po: v('opePo').trim() || null,
      p_cliente: (comboClienteEmb && comboClienteEmb.valor()) || null,
      p_modalidad: v('opeModalidad') || null,
      p_proveedor: (comboProveedorEmb && comboProveedorEmb.valor()) || null,
      p_producto: (comboProductoEmb && comboProductoEmb.valor()) || null,
      p_estado: 'Programada',
      p_f_embarque: v('opeFEmbarque') || null,
      p_f_entrega: v('opeFEntrega') || null,
      p_ingreso_venta: numOrNullEmb(v('opeIngreso')) || 0,
      p_cajas: intOrNullEmb(v('opeCajas')),
      p_pallets: intOrNullEmb(v('opePallets')),
      p_materia_prima: numOrNullEmb(v('opeMateriaPrima')),
      p_comision: numOrNullEmb(v('opeComision')),
      p_aduanas: numOrNullEmb(v('opeAduanas')),
      p_qc: numOrNullEmb(v('opeQc')),
      p_fletes: numOrNullEmb(v('opeFletes')),
      p_carton: numOrNullEmb(v('opeCarton')),
      p_otro: numOrNullEmb(v('opeOtro')),
      p_nota: v('opeNota').trim() || null,
      p_auto_ligar_venta: document.getElementById('opeLigarVenta').checked
    };

    const btn = document.getElementById('opeGuardar');
    btn.disabled = true;
    avisoEmb('warn', 'Registrando embarque…');
    try {
      const data = await rpc('fn_op_agregar_embarque', args);
      const r = (data && data[0]) || {};
      if (!r.folio) throw new Error('El ERP no devolvió el folio del embarque.');

      ERP.marcarDatosSucios();
      const ligadoTxt = r.ligada_a_so ? ` · ligado a <b>${esc(op.venta_so || 'la venta')}</b>` : '';
      ERP.toast('ok', `Embarque <b>${esc(r.folio)}</b> registrado en <b>${esc(folioOp)}</b>${ligadoTxt}.`);

      const avisos = [];
      if (r.con_flag) avisos.push('El embarque quedó <b>con flag activa</b>: revísalo antes de seguir.');
      if (r.advertencias) avisos.push(esc(r.advertencias));

      if (avisos.length) {
        avisoEmb('warn', `Embarque creado CON avisos:<br>${avisos.join('<br>')}`);
        setTimeout(() => verOperacion(folioOp), 1800);
      } else {
        await verOperacion(folioOp);
      }
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoEmb('err', `El ERP rechazó el embarque: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= "Anular operación" (D-156) =================
     Orquestador atómico: anula TODO el hilo de la OP (carga(s)+compra(s)+venta(s)) de un jalón,
     reusando fn_anular_carga/fn_anular_orden/fn_cancelar_so. Si alguna carga ya tiene cobros/
     pagos aplicados, el backend hace RAISE y NO se puede anular desde la web — ese mensaje se
     muestra tal cual, sin intentar desaplicar nada desde aquí (fuera de alcance). Mismo patrón
     confirm+prompt que ya usa anularMovimiento() en modulo-tesoreria.js (D-119) — nada de
     formulario nuevo para una acción de una sola vez con motivo obligatorio. */
  async function anularOperacion(op) {
    const ok = window.confirm(
      `¿Anular la operación ${op.folio_op}?\n\n` +
      'Esto anula la venta, la compra y el embarque de esta operación de un jalón — deja de contar ' +
      'para saldos y reportes. Es un movimiento fuerte, no tiene deshacer desde la pantalla.');
    if (!ok) return;
    const motivo = window.prompt('Motivo de la anulación (obligatorio):');
    if (motivo === null) return;   // canceló el prompt
    const m = motivo.trim();
    if (!m) { ERP.toast('err', 'El motivo es obligatorio: no se anuló.'); return; }
    try {
      const data = await rpc('fn_anular_operacion', { p_folio_op: op.folio_op, p_motivo: m });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.toast('ok', r.resultado || `Operación ${op.folio_op} anulada.`);
      // La OP anulada desaparece sola de la lista (v_operacion_resumen ya la filtra, D-155) —
      // cerrarPanel() re-renderiza Operaciones de fondo (datosSucios), no hace falta forzar nada.
      ERP.cerrarPanel();
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      ERP.toast('err', e.message);   // p.ej. cobros/pagos aplicados: el backend ya explica qué hacer
    }
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
