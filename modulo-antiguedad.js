/* Módulo Antigüedad de saldos — SOLO LECTURA. Dos pestañas: CxC (cobranza) y CxP (pagos).
   Herramienta de cobranza: lo primero que se ve es la CARTERA VENCIDA real (saldo_vencido),
   calculada por el backend contra la fecha de vencimiento (f_embarque + días de crédito),
   NO contra la fecha de embarque.

   Consume (SELECT authenticated, sin escrituras, sin RPC):
     CxC: v_cxc_aging_resumen · v_cxc_aging_cliente · v_cxc_aging (detalle por carga)
     CxP: v_cxp_aging_resumen · v_cxp_aging_proveedor · v_cxp_aging (detalle por carga)

   v_cx?_aging_resumen: bucket, cargas, saldo, en_flag, exigible, saldo_vencido, saldo_por_vencer
   v_cx?_aging_(cliente|proveedor): <entidad>, cargas, saldo_total, b_0_30, b_31_60, b_61_90,
     b_90_mas, saldo_61_mas, pct_90_mas, en_flag, dias_max, saldo_vencido, saldo_por_vencer,
     dias_vencido_max
   v_cx?_aging (detalle): folio, po, <entidad>, estado, f_embarque, dias, costo/venta, pagado/cobrado,
     saldo, revision_pendiente, bucket, dias_credito, f_vencimiento, dias_vencido, vencida

   OJO con `bucket`: ahora mide DÍAS VENCIDOS (no antigüedad desde embarque). El tramo '0-30'
   incluye lo que todavía no vence. La cartera vencida se toma de saldo_vencido, nunca del bucket. */

(function () {
  'use strict';
  const { q, esc, usd, usd0, num, fmt, venc } = ERP;

  const BUCKETS = ['0-30', '31-60', '61-90', '90+'];
  const colorBucket = b =>
    b === '0-30' ? '#1E5B3A' : b === '31-60' ? '#5F8C3E' : b === '61-90' ? '#C98A2D' : '#B3402E';
  const pillBucket = b =>
    `<span class="pill ${b === '90+' ? 'rojo' : b === '61-90' ? 'ambar' : 'gris'}">${esc(b || '—')}</span>`;

  // dinero o guion si es ~0, para no llenar las columnas de $0.00.
  const dinero = v => Math.abs(num(v)) > 0.009 ? usd(v) : '—';

  const TABS = {
    cxc: {
      label: 'Cobranza (CxC)',
      resumen: 'v_cxc_aging_resumen', piramide: 'v_cxc_aging_cliente', detalle: 'v_cxc_aging',
      filtro: 'cliente', entidad: 'cliente', entidadLabel: 'Cliente',
      brutoLabel: 'Venta', pagadoLabel: 'Cobrado',
      brutoCols: ['ingreso_venta', 'venta'], pagadoCols: ['cobrado'], saldoCols: ['saldo_cxc', 'saldo'],
      leyendaHero: 'Lo que nos deben los clientes.'
    },
    cxp: {
      label: 'Pagos (CxP)',
      resumen: 'v_cxp_aging_resumen', piramide: 'v_cxp_aging_proveedor', detalle: 'v_cxp_aging',
      filtro: 'proveedor', entidad: 'proveedor', entidadLabel: 'Proveedor',
      brutoLabel: 'Costo', pagadoLabel: 'Pagado',
      brutoCols: ['costo_total', 'costo'], pagadoCols: ['pagado'], saldoCols: ['saldo_cxp', 'saldo'],
      leyendaHero: 'Lo que le debemos a los proveedores.'
    }
  };

  /* ---------- Cabecera: vencido vs por vencer + barra por días vencidos ---------- */

  function cabecera(cfg, rows) {
    if (!rows.length) return '<div class="vacio">Sin saldos pendientes.</div>';

    const byB = {};
    rows.forEach(r => { byB[r.bucket] = r; });
    const val = b => byB[b] || { saldo: 0, exigible: 0, en_flag: 0, cargas: 0 };

    // Cartera vencida y por vencer: SIEMPRE de saldo_vencido/saldo_por_vencer (backend),
    // nunca del bucket (el '0-30' mezcla vencido reciente con lo aún no vencido).
    const total = rows.reduce((s, r) => s + num(r.saldo), 0);
    const vencido = rows.reduce((s, r) => s + num(r.saldo_vencido), 0);
    const porVencer = rows.reduce((s, r) => s + num(r.saldo_por_vencer), 0);
    const pctVenc = total > 0 ? vencido / total * 100 : 0;
    const max = Math.max(...BUCKETS.map(b => num(val(b).saldo)), 1);

    const hero = `<div class="aging-hero">
      <div class="ah-tot">
        <span class="l">Saldo total</span>
        <span class="v">${usd(total)}</span>
        <span class="ah-nota">${esc(cfg.leyendaHero)}</span>
      </div>
      <div class="ah-venc">
        <span class="l">Cartera vencida</span>
        <span class="v">${usd(vencido)}</span>
        <span class="pct">${fmt(pctVenc)}% del total · ya pasó su fecha de pago</span>
      </div>
      <div class="ah-porvencer">
        <span class="l">Por vencer</span>
        <span class="v">${usd(porVencer)}</span>
        <span class="nota2">aún dentro del plazo de crédito</span>
      </div>
    </div>`;

    const barras = BUCKETS.map(b => {
      const r = val(b);
      const s = num(r.saldo);
      const fl = num(r.en_flag);                                  // NULL → 0
      const ex = r.exigible != null ? num(r.exigible) : s - fl;   // fallback si no viene exigible
      const c = colorBucket(b);
      const etq = b === '0-30' ? '0–30 días venc. (incluye por vencer)' : `${b} días vencidos`;
      return `<div class="barra-row">
        <div class="barra-top">
          <span>${esc(etq)} · ${num(r.cargas)} carga${num(r.cargas) === 1 ? '' : 's'} ${b === '90+' ? '⚠' : ''}</span>
          <span class="b">${usd(s)}</span>
        </div>
        <div class="barra">
          <div class="fill" style="width:${(Math.max(ex, 0) / max * 100).toFixed(1)}%;background:${c}">${ex > 0.009 ? ERP.fmt0(ex) : ''}</div>
          ${fl > 0.009 ? `<div class="fill rev" style="width:${(fl / max * 100).toFixed(1)}%;background:${c}" title="En revisión (flag)">${ERP.fmt0(fl)} rev.</div>` : ''}
        </div>
      </div>`;
    }).join('');

    return hero + `<div class="card">
      <h3 style="margin-bottom:12px">Distribución por días vencidos</h3>
      ${barras}
      <div class="leyenda"><b>Los tramos miden días VENCIDOS</b> (hoy − fecha de vencimiento),
      no antigüedad desde el embarque. El tramo <b>0–30</b> incluye el saldo que todavía no vence.
      Rayado = <b>en revisión</b> (flag): esa parte no se persigue hasta resolver la duda.
      Barras a escala sobre el tramo mayor.</div>
    </div>`;
  }

  /* ---------- Tabla pirámide (por entidad, ordenada por saldo vencido) ---------- */

  function piramide(cfg, rows) {
    const conSaldo = rows.filter(r => num(r.saldo_total) > 0.009);
    if (!conSaldo.length) return `<div class="vacio">Sin saldos pendientes por ${esc(cfg.entidadLabel.toLowerCase())}.</div>`;

    const tot = k => conSaldo.reduce((s, r) => s + num(r[k]), 0);
    const totSaldo = tot('saldo_total');
    const totVenc = tot('saldo_vencido');
    const totPorVencer = tot('saldo_por_vencer');

    const filas = conSaldo.map(r => {
      const vencido = num(r.saldo_vencido);
      const st = num(r.saldo_total);
      const pctVenc = st > 0 ? vencido / st * 100 : 0;
      const alto = pctVenc > 50;                 // más de la mitad del saldo ya venció
      const rev = num(r.en_flag) > 0.009;
      const dvm = r.dias_vencido_max;
      const ent = r[cfg.entidad];
      return `<tr class="clic ${alto ? 'vencido-alto' : ''}" data-ent="${esc(ent)}">
        <td><span class="enlace">${esc(ent || '—')}</span>${rev ? ' <span class="pill ambar">en revisión</span>' : ''}</td>
        <td class="num">${num(r.cargas)}</td>
        <td class="num">${dinero(r.saldo_por_vencer)}</td>
        <td class="num ${vencido > 0.009 ? 'neg' : ''}">${dinero(r.saldo_vencido)}</td>
        <td class="num ${alto ? 'neg' : ''}">${st > 0 ? fmt(pctVenc) + '%' : '—'}</td>
        <td class="num ${num(dvm) > 0 ? 'neg' : ''}" title="Días vencidos del saldo más atrasado">${dvm == null ? '—' : esc(dvm)}</td>
        <td class="num">${usd(r.saldo_total)}</td>
      </tr>`;
    }).join('');

    return `<h2 class="sec">Detalle por ${esc(cfg.entidadLabel.toLowerCase())}</h2>
    <div class="card"><div class="tabla-wrap"><table>
      <thead><tr>
        <th>${esc(cfg.entidadLabel)}</th><th class="num">Cargas</th>
        <th class="num">Por vencer</th><th class="num">Vencido</th><th class="num">% vencido</th>
        <th class="num">Máx. días venc.</th><th class="num">Saldo total</th>
      </tr></thead>
      <tbody>${filas}</tbody>
      <tfoot><tr class="total">
        <td>Total (${conSaldo.length})</td>
        <td class="num">${tot('cargas')}</td>
        <td class="num">${usd0(totPorVencer)}</td>
        <td class="num ${totVenc > 0.009 ? 'neg' : ''}">${usd0(totVenc)}</td>
        <td class="num ${totSaldo > 0 && totVenc / totSaldo * 100 > 50 ? 'neg' : ''}">${totSaldo > 0 ? fmt(totVenc / totSaldo * 100) + '%' : '—'}</td>
        <td class="num"></td>
        <td class="num">${usd0(totSaldo)}</td>
      </tr></tfoot>
    </table></div>
    <div class="leyenda">Ordenado por <b>saldo vencido</b> de mayor a menor.
      <b>Filas en rojo</b>: más de la mitad del saldo ya venció.
      <span class="pill ambar">en revisión</span> = parte del saldo está en flag.
      Toca una fila para ver las cargas que la componen.</div>
    </div>`;
  }

  /* ---------- Drill-down: cargas de una contraparte (v_cx?_aging) ---------- */

  async function verDetalle(cfg, contraparte) {
    ERP.abrirPanel(esc(contraparte), 'Cargando desglose…', '<div class="skel">Cargando…</div>');
    try {
      const filas = await q(cfg.detalle, `&${cfg.filtro}=${ERP.eq(contraparte)}&order=dias_vencido.desc`);
      const cSaldo = ERP.columna(filas, cfg.saldoCols);
      const cBruto = ERP.columna(filas, cfg.brutoCols);
      const cPag = ERP.columna(filas, cfg.pagadoCols);
      const totSaldo = cSaldo ? filas.reduce((s, r) => s + num(r[cSaldo]), 0) : 0;
      // Días de crédito de la contraparte (igual en todas sus filas). Provisional = 15.
      const diasCred = filas.length ? filas[0].dias_credito : null;

      const cuerpo = filas.length ? `<div class="tabla-wrap"><table>
        <thead><tr><th>Carga</th><th>PO</th><th>Estado</th><th>Embarque</th><th>Vence</th><th>Situación</th>
          <th class="num">${esc(cfg.brutoLabel)}</th><th class="num">${esc(cfg.pagadoLabel)}</th>
          <th class="num">Saldo</th><th>Tramo venc.</th></tr></thead>
        <tbody>${filas.map(r => {
          const v = venc(r.dias_vencido);
          return `<tr class="clic" data-folio="${esc(r.folio)}">
            <td class="mono"><span class="enlace">${esc(r.folio)}</span>${r.revision_pendiente ? ' ⚑' : ''}</td>
            <td>${esc(r.po || '—')}</td>
            <td><span class="pill gris">${esc(r.estado || '—')}</span></td>
            <td>${esc(ERP.fecha(r.f_embarque))}</td>
            <td>${r.f_vencimiento ? esc(ERP.fecha(r.f_vencimiento)) : '—'}</td>
            <td class="${v.cls}">${esc(v.txt)}</td>
            <td class="num">${cBruto ? usd(r[cBruto]) : '—'}</td>
            <td class="num">${cPag ? usd(r[cPag]) : '—'}</td>
            <td class="num">${cSaldo ? usd(r[cSaldo]) : '—'}</td>
            <td>${pillBucket(r.bucket)}</td></tr>`;
        }).join('')}</tbody>
        <tfoot><tr class="total"><td colspan="8">Total (${filas.length})</td>
          <td class="num">${usd(totSaldo)}</td><td></td></tr></tfoot>
      </table></div>` : '<div class="vacio">Esta contraparte no tiene cargas con saldo pendiente.</div>';

      ERP.abrirPanel(
        esc(contraparte),
        `${filas.length} carga${filas.length === 1 ? '' : 's'} con saldo · total ${usd(totSaldo)}` +
        (diasCred != null ? ` · ${esc(diasCred)} días de crédito` : ''),
        cuerpo + (filas.length
          ? `<div class="leyenda">Ordenado por días vencidos (lo más atrasado arriba).
             <b>Vence</b> = embarque + días de crédito. <b>Situación</b>: rojo = ya vencida, verde = aún por vencer.
             ${diasCred != null ? `Días de crédito: <b>${esc(diasCred)}</b> — <i>valor provisional (15) que Miguel ajustará por contraparte</i>. ` : ''}
             ⚑ = flag activa. Toca una fila para abrir la ficha de la carga.</div>` : '')
      );
      ERP.enlazarFolios(document.getElementById('panelBody'));
    } catch (e) {
      ERP.abrirPanel(esc(contraparte), '', `<div class="errbox">No se pudo cargar el desglose: ${esc(e.message)}</div>`);
    }
  }

  /* ---------- Módulo ---------- */

  let tabActual = 'cxc';

  async function pintarTab(cont) {
    const cfg = TABS[tabActual];
    const host = cont.querySelector('#agingBody');
    host.innerHTML = '<div class="skel">Cargando…</div>';

    // q() cachea por URL: alternar pestañas ya vistas no vuelve a pegarle al backend.
    const [resumen, piram] = await Promise.all([
      q(cfg.resumen).catch(() => []),
      q(cfg.piramide, '&order=saldo_vencido.desc').catch(() => [])
    ]);

    host.innerHTML = cabecera(cfg, resumen) + piramide(cfg, piram);
    host.querySelectorAll('tr.clic[data-ent]').forEach(tr =>
      tr.addEventListener('click', () => verDetalle(cfg, tr.dataset.ent)));
  }

  async function render(cont, parametro) {
    if (parametro && TABS[parametro]) tabActual = parametro;

    cont.innerHTML = `
      <div class="pestanas">
        ${Object.keys(TABS).map(id => `<button class="pestana ${tabActual === id ? 'activa' : ''}" data-tab="${id}">
          ${esc(TABS[id].label)}</button>`).join('')}
      </div>
      <div id="agingBody"></div>`;

    cont.querySelectorAll('.pestana').forEach(p => p.addEventListener('click', () => {
      if (p.dataset.tab === tabActual) return;
      tabActual = p.dataset.tab;
      cont.querySelectorAll('.pestana').forEach(o => o.classList.toggle('activa', o.dataset.tab === tabActual));
      pintarTab(cont);
    }));

    await pintarTab(cont);
  }

  ERP.registrar('antiguedad', {
    titulo: 'Antigüedad de saldos',
    descripcion: 'Qué está vencido y con quién — cobranza (CxC) y pagos (CxP)',
    render
  });
})();
