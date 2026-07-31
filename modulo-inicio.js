/* Módulo Inicio — tarjetas grandes clicables. Ligero: solo lo indispensable. */

(function () {
  'use strict';
  const { q, esc, usd, usd0, num, pct } = ERP;

  /** Una carga se considera activa mientras no esté cerrada/entregada/liquidada. */
  const CERRADA = /(entregad|cerrad|liquidad|cancelad|finalizad)/i;

  function tarjeta({ id, lbl, val, sub, clase = '', destino }) {
    return `<button class="tarjeta ${clase}" data-destino="${esc(destino)}" id="${esc(id)}">
      <div class="lbl">${esc(lbl)}</div>
      <div class="val">${val}</div>
      <div class="sub">${esc(sub)}</div>
      <div class="ir">→</div>
    </button>`;
  }

  async function contarCargasActivas() {
    try {
      const cargas = await q('v_carga_detalle');
      if (!cargas.length) return { activas: 0, total: 0, anuladas: 0, porConfirmar: 0 };
      const tieneEstado = Object.prototype.hasOwnProperty.call(cargas[0], 'estado');
      // 'Por Confirmar' (cuenta_como_embarque=false) NO es un embarque todavía: fuera del total.
      const cuenta = c => ERP.estadoInfo(c.estado).cuenta_como_embarque !== false;
      const anuladas = cargas.filter(c => c.anulado === true).length;
      const porConfirmar = cargas.filter(c => !c.anulado && !cuenta(c)).length;
      // Una carga anulada nunca está activa, diga lo que diga su estado.
      const activas = cargas.filter(c => !c.anulado && cuenta(c) && (tieneEstado
        ? !CERRADA.test(c.estado || '')
        : (num(c.saldo_cxc) > 0.009 || num(c.saldo_cxp) > 0.009))).length;
      return { activas, total: cargas.length - anuladas - porConfirmar, anuladas, porConfirmar };
    } catch (_) {
      return null;
    }
  }

  /** Fila para el headline de utilidad neta.
      Usa el mes en curso SOLO si tiene ingresos; un mes solo-gasto (jul-2026: ingresos=0,
      apenas un gasto) no representa el desempeño y arrastraría el hero a negativo. En ese
      caso cae al mes más reciente con ingresos≠0 (etiqueta con el nombre del mes). */
  function mesActualPL(pl) {
    const hoy = new Date();
    const clave = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
    const delMes = pl.find(r => String(r.mes).startsWith(clave));
    if (delMes && num(delMes.ingresos) !== 0) return { fila: delMes, esMesActual: true };
    const conIngresos = pl.filter(r => num(r.ingresos) !== 0);
    const ultima = conIngresos[conIngresos.length - 1];
    if (ultima) return { fila: ultima, esMesActual: false };
    return delMes ? { fila: delMes, esMesActual: true } : null;   // red de seguridad
  }

  /* ---------- Cascada del estado de resultados (neto), meses en columnas ----------
     Los importes de utilidad vienen precalculados en la vista; no se recalculan aquí.
     Los renglones de gasto/costo se muestran negativos (dinero que sale). Misma forma
     y convención de signos que Finanzas (candidato a DRY futuro — ver PENDIENTES). */

  const FILAS_PL = [
    ['ingresos', 'Ingresos', 'ingreso'],
    ['costo_ventas', 'Costo de ventas', 'gasto'],
    ['utilidad_bruta', 'Utilidad bruta', 'util'],
    ['margen_bruto_pct', 'Margen bruto', 'margen'],
    ['gastos_operativos', 'Gastos operativos', 'gasto'],
    ['utilidad_operacion', 'Utilidad de operación', 'util'],
    ['gastos_financieros', 'Gastos financieros', 'gasto'],
    ['utilidad_neta', 'Utilidad neta', 'util'],
    ['margen_neto_pct', 'Margen neto', 'margen']
  ];

  function celdaPL(kind, valor) {
    if (kind === 'margen') {
      // NULL (ingresos=0) → "—"; negativo en rojo.
      return `<td class="num ${num(valor) < 0 ? 'neg' : ''}">${valor == null ? '—' : pct(valor)}</td>`;
    }
    const v = num(valor);
    const nada = Math.abs(v) < 0.009;
    if (kind === 'ingreso') return `<td class="num">${nada ? '—' : usd(v)}</td>`;
    if (kind === 'gasto') {
      const cls = v > 0.009 ? 'num neg' : v < -0.009 ? 'num pos' : 'num';
      return `<td class="${cls}">${nada ? '—' : usd(-v)}</td>`;   // gasto positivo → −$X
    }
    return `<td class="num ${v < 0 ? 'neg' : ''}">${usd(v)}</td>`;  // utilidad, signo real
  }

  function pintarCascada(pl) {
    if (!pl.length) return '<div class="vacio">Sin estado de resultados.</div>';
    const suma = k => pl.reduce((s, r) => s + num(r[k]), 0);
    const ingA = suma('ingresos');
    const acum = {
      ingresos: ingA, costo_ventas: suma('costo_ventas'), utilidad_bruta: suma('utilidad_bruta'),
      gastos_operativos: suma('gastos_operativos'), utilidad_operacion: suma('utilidad_operacion'),
      gastos_financieros: suma('gastos_financieros'), utilidad_neta: suma('utilidad_neta'),
      margen_bruto_pct: Math.abs(ingA) > 0.009 ? suma('utilidad_bruta') / ingA * 100 : null,
      margen_neto_pct: Math.abs(ingA) > 0.009 ? suma('utilidad_neta') / ingA * 100 : null
    };
    const filaHtml = ([k, lbl, kind]) => {
      const rowCls = kind === 'util' ? ' class="fila-utilidad"' : kind === 'margen' ? ' class="fila-margen"' : '';
      const etq = kind === 'util' ? lbl.toUpperCase() : lbl;
      const celdas = pl.map(r => celdaPL(kind, r[k])).join('');
      return `<tr${rowCls}><td>${esc(etq)}</td>${celdas}${celdaPL(kind, acum[k])}</tr>`;
    };
    return `<div class="tabla-wrap"><table>
      <thead><tr><th></th>
        ${pl.map(r => `<th class="num">${esc(ERP.mesTexto(r.mes))}</th>`).join('')}
        <th class="num">Acumulado</th></tr></thead>
      <tbody>${FILAS_PL.map(filaHtml).join('')}</tbody>
    </table></div>
    <div class="leyenda">Utilidad bruta devengada por carga; gastos base caja (al pagarse).
      El <b>Acumulado</b> abarca todo el período (dic-2025 → hoy); la utilidad neta acumulada
      arrastra la apertura de dic-2025. Montos USD a 2 decimales; negativos en rojo.</div>`;
  }

  /* ===== Panel "Hoy" (v_panel_hoy): alertas del día ===== */
  // La vista solo devuelve renglones cuando algo está MAL. Si todo bien, trae un solo renglón
  // centinela con categoria='Sin alertas' → estado vacío amable (no una tarjeta de alerta).
  const SEV_ORDEN = { roja: 0, ambar: 1, gris: 2 };

  function tarjetaHoy(r) {
    // r.ruta ya viene lista del backend (id real del módulo); si un módulo se renombra se corrige
    // en v_panel_hoy, NO aquí. moduloExiste queda como red: ruta desconocida → tarjeta inerte.
    const clic = !!(r.ruta && ERP.moduloExiste(r.ruta));
    const sev = SEV_ORDEN[r.severidad] != null ? r.severidad : 'gris';
    return `<div class="hoy-card sev-${sev}${clic ? ' clic' : ''}"${clic ? ` data-ruta="${esc(r.ruta)}"` : ''}>
      <div class="hoy-card-titulo">${esc(r.titulo)}</div>
      <div class="hoy-card-detalle">${esc(r.detalle)}</div>
      ${r.monto != null ? `<div class="hoy-card-monto">${usd(r.monto)}</div>` : ''}
      ${r.referencia ? `<div class="hoy-card-ref">${esc(r.referencia)}</div>` : ''}
    </div>`;
  }

  function pintarHoy(hoy) {
    if (hoy && hoy.__error) {
      return `<section class="hoy"><h2 class="sec">Hoy</h2>
        <div class="errbox">No se pudo cargar el panel de alertas: ${esc(hoy.__error)}</div></section>`;
    }
    const filas = (hoy || []).filter(r => r.categoria !== 'Sin alertas');
    if (!filas.length) {
      return `<section class="hoy"><h2 class="sec">Hoy</h2>
        <div class="hoy-vacio">✅ Todo en orden — no hay alertas hoy.</div></section>`;
    }
    const nR = filas.filter(f => f.severidad === 'roja').length;
    const nA = filas.filter(f => f.severidad === 'ambar').length;
    const nG = filas.filter(f => f.severidad === 'gris').length;

    // Orden: roja → ámbar → gris; dentro de cada grupo por `orden` (NUNCA hardcodeado).
    const porOrden = (a, b) => (SEV_ORDEN[a.severidad] ?? 9) - (SEV_ORDEN[b.severidad] ?? 9) || num(a.orden) - num(b.orden);
    const visibles = filas.filter(f => f.severidad !== 'gris').sort(porOrden);   // rojas + ámbar, siempre a la vista
    const grises = filas.filter(f => f.severidad === 'gris').sort(porOrden);     // informativas, plegadas

    const conteo = `${nR} roja${nR === 1 ? '' : 's'} · ${nA} ámbar · ${nG} informativa${nG === 1 ? '' : 's'}`;
    return `<section class="hoy">
      <div class="hoy-head"><h2 class="sec">Hoy</h2><div class="hoy-conteo">${conteo}</div></div>
      <div class="hoy-cards">${visibles.map(tarjetaHoy).join('')}</div>
      ${grises.length ? `<details class="hoy-info">
        <summary>Ver informativas (${grises.length})</summary>
        <div class="hoy-cards">${grises.map(tarjetaHoy).join('')}</div>
      </details>` : ''}
    </section>`;
  }

  async function render(cont) {
    const [anclas, jeams, pl, cuentas, cargas, hoy] = await Promise.all([
      q('v_anclas'),
      q('v_deuda_jeams').catch(() => []),
      q('v_estado_resultados_neto', '&order=mes.asc').catch(() => []),
      q('v_saldo_cuentas', '&order=id.asc').catch(() => []),
      contarCargasActivas(),
      // Panel Hoy: si truena, se muestra el error dentro del panel (no se oculta con []).
      q('v_panel_hoy', '&order=orden.asc').catch(e => ({ __error: e.message }))
    ]);

    const a = anclas[0] || {};
    const deudaJeams = num(jeams[0] && jeams[0].deuda_jeams);
    const neta = num(a.cxc_total) - num(a.cxp_total) - deudaJeams;
    const flags = Number(a.flags) || 0;
    const un = mesActualPL(pl);   // headline = utilidad NETA del mes
    const cuentasReales = cuentas.filter(c => c.banco !== 'Virtual');

    cont.innerHTML = `
      ${pintarHoy(hoy)}
      <div class="tarjetas">
        ${tarjeta({
          id: 'tJpm', lbl: 'Saldo banco JPM', val: usd(a.saldo_jpm),
          sub: `${a.movs_jpm ?? '—'} movimientos · último ${ERP.fecha(a.fecha_max_jpm)}`,
          destino: 'tesoreria'
        })}
        ${tarjeta({
          id: 'tCxc', lbl: 'CxC por cobrar', val: usd(a.cxc_total),
          sub: `${a.cargas ?? '—'} cargas en sistema`, destino: 'cobranza'
        })}
        ${tarjeta({
          id: 'tCxp', lbl: 'CxP por pagar', val: usd(a.cxp_total),
          sub: `${a.aplicaciones ?? '—'} aplicaciones registradas`, destino: 'pagos'
        })}
        ${tarjeta({
          id: 'tFlags', lbl: 'Flags activas', val: String(flags),
          clase: flags > 0 ? 'alerta' : '',
          sub: flags > 0 ? 'Dudas parqueadas, pendientes de resolver' : 'Nada pendiente 🎉',
          destino: 'flags'
        })}
        ${un ? tarjeta({
          id: 'tUn',
          lbl: un.esMesActual ? 'Utilidad neta del mes' : `Utilidad neta — ${ERP.mesTexto(un.fila.mes)}`,
          val: usd(un.fila.utilidad_neta),
          clase: num(un.fila.utilidad_neta) < 0 ? 'neg' : '',
          sub: `Ingresos ${usd(un.fila.ingresos)} · Margen neto ${un.fila.margen_neto_pct == null ? '—' : pct(un.fila.margen_neto_pct)}`,
          destino: 'finanzas'
        }) : ''}
        ${cargas ? tarjeta({
          id: 'tCargas', lbl: 'Cargas activas', val: String(cargas.activas),
          sub: `${cargas.total} ${cargas.total === 1 ? 'carga vigente' : 'cargas vigentes'} en el ERP` +
               (cargas.anuladas ? ` · ${cargas.anuladas} anulada${cargas.anuladas === 1 ? '' : 's'}` : '') +
               (cargas.porConfirmar ? ` · +${cargas.porConfirmar} por confirmar` : ''),
          destino: 'cargas'
        }) : ''}
      </div>

      <h2 class="sec">Estado de resultados — utilidad neta</h2>
      <div class="card">${pintarCascada(pl)}</div>

      <h2 class="sec">Posición</h2>
      <div class="card">
        <div class="tabla-wrap"><table>
          <tbody>
            <tr><td>CxC por cobrar</td><td class="num">${usd(a.cxc_total)}</td></tr>
            <tr><td>CxP por pagar</td><td class="num neg">−${ERP.fmt(a.cxp_total)}</td></tr>
            <tr><td>Deuda JEAMS <span class="pill gris">préstamo de socio</span></td><td class="num neg">−${ERP.fmt(deudaJeams)}</td></tr>
            <tr class="total"><td>Posición neta</td><td class="num ${neta < 0 ? 'neg' : 'pos'}">${usd(neta)}</td></tr>
          </tbody>
        </table></div>
        <div class="leyenda">
          Efectivo real en cuentas bancarias: <b>${usd(cuentasReales.reduce((s, c) => s + num(c.saldo), 0))}</b>
          en ${cuentasReales.length} cuenta${cuentasReales.length === 1 ? '' : 's'}.
          La posición neta no incluye el efectivo; mide lo que se debe cobrar contra lo que se debe pagar.
        </div>
      </div>

      <div class="leyenda" style="margin-top:22px">
        Toca cualquier tarjeta para ver su desglose. Usa el buscador de arriba (o <b>⌘K</b>) para saltar
        directo a una carga, cliente, proveedor o movimiento.
      </div>`;

    cont.querySelectorAll('.tarjeta').forEach(b =>
      b.addEventListener('click', () => ERP.ir(b.dataset.destino)));
    cont.querySelectorAll('.hoy-card.clic').forEach(c =>
      c.addEventListener('click', () => ERP.ir(c.dataset.ruta)));
  }

  ERP.registrar('inicio', {
    titulo: 'Inicio',
    descripcion: 'Resumen del día — toca un número para ver su desglose',
    render
  });
})();
