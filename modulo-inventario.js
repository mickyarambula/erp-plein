/* Módulo "Inventario" (ruta 'inventario', backend E52) — SOLO LECTURA. Una fila por carga viva NO
   cerrada, agrupada por `bucket`. Dos semáforos de exposición arriba (capital parado / vendido sin
   sourcing). Consume solo la vista v_inventario; no hay escritura de inventario. */

(function () {
  'use strict';
  const { q, esc, usd, num, norm, fmt0 } = ERP;

  /* Orden canónico de buckets (el layout pedido). El grupo se casa con el `bucket` de la vista por
     comparación NORMALIZADA (tolera acentos/mayúsculas), así el orden aguanta aunque el texto exacto
     del backend difiera un poco. Cualquier bucket que la vista traiga y NO esté aquí se pinta AL
     FINAL con su etiqueta cruda — nunca se pierde una carga (mismo criterio que v_balance/estados). */
  const BUCKETS_ORDEN = ['En transito', 'En piso', 'Entregado (sin cerrar)', 'En proceso', 'Otro'];
  // Buckets que se muestran SIEMPRE, aunque salgan vacíos (a propósito), con su estado vacío propio.
  const VACIO_ESPECIAL = { [norm('En piso')]: 'Sin producto en piso — se activa cuando haya bodega.' };
  const siempreVisible = k => Object.prototype.hasOwnProperty.call(VACIO_ESPECIAL, k);

  let inventario = [];
  let filtro = '';

  /* ================= Semáforos de exposición (globales, NO respetan el buscador) =================
     Reflejan el riesgo de TODO el inventario: si respetaran el filtro, buscar ocultaría la alerta. */

  function pintarSemaforos(rows) {
    const capital = rows.filter(c => c.comprado_sin_vender === true);
    const expuesto = rows.filter(c => c.vendido_sin_comprar === true);
    const totCapital = capital.reduce((s, c) => s + num(c.costo_total), 0);
    const totExpuesto = expuesto.reduce((s, c) => s + num(c.ingreso_venta), 0);

    // Capital parado: ya pagado, sin venta reportada (esperan liquidar). Ámbar si hay, gris si 0.
    const cardCapital = capital.length
      ? `<div class="hoy-card sev-ambar">
          <div class="hoy-card-titulo">Capital parado</div>
          <div class="hoy-card-detalle">${capital.length} carga${capital.length === 1 ? '' : 's'} pagada${capital.length === 1 ? '' : 's'} sin venta reportada — esperan liquidación (${esc(capital.map(c => c.folio).join(', '))}).</div>
          <div class="hoy-card-monto">${usd(totCapital)}</div>
        </div>`
      : `<div class="hoy-card sev-gris">
          <div class="hoy-card-titulo">Sin capital parado</div>
          <div class="hoy-card-detalle">Ninguna carga pagada sin venta reportada.</div></div>`;

    // Vendido sin sourcing: venta comprometida, sin costo, en modalidad que compra. ROJO si hay
    // (riesgo operativo real), gris si 0.
    const cardExpuesto = expuesto.length
      ? `<div class="hoy-card sev-roja">
          <div class="hoy-card-titulo">Exposición: vendido sin sourcing</div>
          <div class="hoy-card-detalle">${expuesto.length} carga${expuesto.length === 1 ? '' : 's'} con venta comprometida y sin costo capturado (${esc(expuesto.map(c => c.folio).join(', '))}).</div>
          <div class="hoy-card-monto">${usd(totExpuesto)}</div>
        </div>`
      : `<div class="hoy-card sev-gris">
          <div class="hoy-card-titulo">Sin exposición: vendido sin sourcing</div>
          <div class="hoy-card-detalle">Ninguna carga vendida sin su sourcing.</div></div>`;

    return `<div class="hoy-cards" style="margin-bottom:16px">${cardCapital}${cardExpuesto}</div>`;
  }

  /* ================= Secciones por bucket (SÍ respetan el buscador) ================= */

  const coincide = c => {
    const t = norm(filtro);
    if (!t) return true;
    return [c.lote, c.lote_productor, c.producto, c.proveedor, c.cliente, c.folio].some(v => norm(v).includes(t));
  };

  function tablaCargas(rows) {
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Folio</th><th>Lote</th><th>Producto</th><th>Proveedor</th><th>Cliente</th>
        <th class="num">Cajas</th><th class="num">Pallets</th><th class="num">Costo</th>
        <th class="num">Venta</th><th class="num">CxC</th><th class="num">CxP</th></tr></thead>
      <tbody>${rows.map(c => `<tr class="clic" data-folio="${esc(c.folio)}">
        <td class="mono"><span class="enlace">${esc(c.folio)}</span></td>
        <td class="mono" style="white-space:nowrap">${esc(c.lote || '—')}${c.lote_productor ? `<div style="font-size:10px;color:var(--gris)">${esc(c.lote_productor)}</div>` : ''}</td>
        <td>${esc(c.producto || '—')}</td>
        <td>${esc(c.proveedor || '—')}</td>
        <td>${esc(c.cliente || '—')}</td>
        <td class="num">${c.cajas == null ? '—' : fmt0(c.cajas)}</td>
        <td class="num">${c.pallets == null ? '—' : fmt0(c.pallets)}</td>
        <td class="num">${usd(c.costo_total)}</td>
        <td class="num">${usd(c.ingreso_venta)}</td>
        <td class="num">${num(c.saldo_cxc) > 0.009 ? usd(c.saldo_cxc) : '—'}</td>
        <td class="num ${num(c.saldo_cxp) > 0.009 ? 'neg' : ''}">${num(c.saldo_cxp) > 0.009 ? usd(c.saldo_cxp) : '—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
  }

  function seccion(etiqueta, rows, vacioKey) {
    const totCosto = rows.reduce((s, c) => s + num(c.costo_total), 0);
    const totVenta = rows.reduce((s, c) => s + num(c.ingreso_venta), 0);
    const head = `<div class="seccion-head" style="margin-top:20px"><h4>${esc(etiqueta)}
      <span style="font-weight:400;color:var(--gris);font-size:12px">· ${rows.length} carga${rows.length === 1 ? '' : 's'}${rows.length ? ` · costo ${usd(totCosto)} · venta ${usd(totVenta)}` : ''}</span></h4></div>`;
    const cuerpo = rows.length
      ? tablaCargas(rows)
      : `<div class="vacio">${esc((vacioKey && VACIO_ESPECIAL[vacioKey]) || 'Sin cargas en esta categoría con el filtro actual.')}</div>`;
    return head + cuerpo;
  }

  function pintarSecciones() {
    const filtradas = inventario.filter(coincide);
    // Agrupa por bucket (clave normalizada → {etiqueta cruda, rows}).
    const grupos = new Map();
    filtradas.forEach(c => {
      const k = norm(c.bucket);
      if (!grupos.has(k)) grupos.set(k, { etiqueta: c.bucket || 'Otro', rows: [] });
      grupos.get(k).rows.push(c);
    });

    let html = '';
    const usados = new Set();
    // 1) Buckets canónicos, en orden. Los vacíos NO se pintan salvo los "siempre visible" (En piso).
    BUCKETS_ORDEN.forEach(nombre => {
      const k = norm(nombre);
      usados.add(k);
      const g = grupos.get(k);
      const rows = g ? g.rows : [];
      if (rows.length || siempreVisible(k)) html += seccion(g ? g.etiqueta : nombre, rows, k);
    });
    // 2) Buckets que la vista trajo y no están en el orden canónico → al final, con su etiqueta cruda.
    grupos.forEach((g, k) => { if (!usados.has(k)) html += seccion(g.etiqueta, g.rows, k); });

    if (!html) html = '<div class="vacio" style="padding:24px">Sin inventario vivo.</div>';
    return html;
  }

  function repintarSecciones(cont) {
    const el = cont.querySelector('#invSecciones');
    if (!el) return;
    el.innerHTML = pintarSecciones();
    el.querySelectorAll('tr.clic[data-folio]').forEach(tr =>
      tr.addEventListener('click', () => ERP.verCarga(tr.dataset.folio)));
  }

  /* ================= Render ================= */

  async function render(cont) {
    let rows;
    try {
      rows = await q('v_inventario', '&order=f_embarque.asc');
    } catch (e) {
      cont.innerHTML = `<div class="pantalla-inventario"><div class="errbox">No se pudo leer el inventario: ${esc(e.message)}</div></div>`;
      return;
    }
    inventario = rows;
    filtro = '';

    cont.innerHTML = `<div class="pantalla-inventario">
      ${pintarSemaforos(inventario)}
      <div class="filtros">
        <input class="busca" id="invBusca" type="text" placeholder="Buscar por lote, producto, proveedor o cliente…">
        <span class="conteo" id="invConteo"></span>
      </div>
      <div id="invSecciones"></div>
      <div class="leyenda">Solo lectura: una fila por carga viva que aún no se cierra. El <b>bucket</b>
      lo calcula el backend. "En piso" hoy sale vacío a propósito (Plein no tiene bodega todavía).
      Los semáforos de arriba reflejan TODO el inventario, no lo filtrado.</div>
    </div>`;

    document.getElementById('invConteo').textContent = `${inventario.length} carga${inventario.length === 1 ? '' : 's'} viva${inventario.length === 1 ? '' : 's'}`;

    let tempo;
    document.getElementById('invBusca').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => {
        filtro = e.target.value;
        repintarSecciones(cont);
        const vis = inventario.filter(coincide).length;
        document.getElementById('invConteo').textContent = filtro
          ? `${vis} de ${inventario.length} cargas`
          : `${inventario.length} carga${inventario.length === 1 ? '' : 's'} viva${inventario.length === 1 ? '' : 's'}`;
      }, 150);
    });

    repintarSecciones(cont);
  }

  ERP.registrar('inventario', {
    titulo: 'Inventario',
    descripcion: 'Cargas vivas por ubicación (bucket) y semáforos de exposición — solo lectura',
    render
  });
})();
