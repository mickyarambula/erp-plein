/* Módulo Cierres Contables — SOLO LECTURA sobre v_cierre_checklist.
   Muestra por mes: estado (cerrado/abierto), bloqueadores, ingresos y utilidad bruta.
   No escribe nada; el cierre real se opera desde el backend. */

(function () {
  'use strict';
  const { q, esc, usd, num } = ERP;

  // Bloqueadores puede venir como texto, número o lista (jsonb) — se muestra legible.
  function bloqueadoresTxt(v) {
    if (v == null || v === '') return '—';
    if (Array.isArray(v)) return v.length ? v.map(x => esc(String(x))).join(', ') : 'Ninguno';
    if (typeof v === 'number') return v === 0 ? 'Ninguno' : String(v);
    return esc(String(v));
  }

  // v_cierre_checklist.estado es texto (no hay columna booleana). Ver CLAUDE.md.
  function estaCerrado(r) {
    return /cerr/i.test(String(r.estado || ''));
  }

  async function render(cont) {
    const rows = await q('v_cierre_checklist', '&order=mes.desc');

    if (!rows.length) {
      cont.innerHTML = '<div class="card"><div class="vacio">Sin periodos en el checklist de cierre.</div></div>';
      return;
    }

    const cuerpo = rows.map(r => {
      const cerrado = estaCerrado(r);
      const estadoTxt = r.estado ? String(r.estado) : (cerrado ? 'Cerrado' : 'Abierto');
      const blo = r.bloqueadores;
      const ub = r.utilidad_bruta;
      return `<tr>
        <td>${esc(ERP.mesTexto(r.mes))}</td>
        <td><span class="pill ${cerrado ? 'verde' : 'ambar'}">${esc(estadoTxt)}</span></td>
        <td>${bloqueadoresTxt(blo)}</td>
        <td class="num">${usd(r.ingresos)}</td>
        <td class="num ${num(ub) < 0 ? 'neg' : ''}">${usd(ub)}</td>
      </tr>`;
    }).join('');

    cont.innerHTML = `
      <div class="card">
        <div class="tabla-wrap"><table>
          <thead><tr><th>Mes</th><th>Estado</th><th>Bloqueadores</th>
            <th class="num">Ingresos</th><th class="num">Utilidad bruta</th></tr></thead>
          <tbody>${cuerpo}</tbody>
        </table></div>
        <div class="leyenda">Vista de solo lectura del avance de cierre por periodo.
          Un mes con <b>bloqueadores</b> no puede cerrarse hasta resolverlos.
          El cierre se ejecuta desde el backend, no desde aquí.</div>
      </div>`;
  }

  ERP.registrar('cierres', {
    titulo: 'Cierres Contables',
    descripcion: 'Avance de cierre mensual — estado, bloqueadores y resultados',
    render
  });
})();
