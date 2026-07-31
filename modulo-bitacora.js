/* Módulo Bitácora — SOLO LECTURA. Auditoría de ediciones desde v_bitacora_ediciones.
   Columnas: id, tabla, registro_id, campos_antes(jsonb), campos_despues(jsonb), motivo,
   editado_por, editado_ts. Visible para todos los roles (no escribe nada). */

(function () {
  'use strict';
  const { q, esc } = ERP;

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fechaHora(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d)) return String(ts);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${MESES[d.getMonth()]}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  const fmtVal = v => (v === null || v === undefined) ? '—' : (typeof v === 'object' ? JSON.stringify(v) : String(v));

  /** Lista de campos que cambiaron entre antes y después. */
  function camposCambiados(antes, despues) {
    const a = (antes && typeof antes === 'object') ? antes : {};
    const d = (despues && typeof despues === 'object') ? despues : {};
    const keys = [...new Set([...Object.keys(a), ...Object.keys(d)])].sort();
    return keys.filter(k => JSON.stringify(a[k]) !== JSON.stringify(d[k]))
      .map(k => ({ campo: k, antes: a[k], despues: d[k] }));
  }

  function diffHtml(cambios) {
    if (!cambios.length) return '<span class="bit-nada">Sin cambios de campos</span>';
    return `<table class="bit-difftbl"><tbody>${cambios.map(c => `<tr>
      <td class="bit-k">${esc(c.campo)}</td>
      <td class="bit-antes">${esc(fmtVal(c.antes))}</td>
      <td class="bit-flecha">→</td>
      <td class="bit-despues">${esc(fmtVal(c.despues))}</td></tr>`).join('')}</tbody></table>`;
  }

  /* ---------- Estado / filtros ---------- */

  let filas = [];
  let fTabla = '';
  let fTexto = '';

  function tablasDistintas() {
    return [...new Set(filas.map(r => r.tabla).filter(Boolean))].sort();
  }

  function filtradas() {
    const t = ERP.norm(fTexto);
    return filas.filter(r => {
      if (fTabla && r.tabla !== fTabla) return false;
      if (!t) return true;
      return [r.editado_por, r.tabla, r.registro_id, r.motivo].some(v => ERP.norm(v).includes(t));
    });
  }

  function pintarTabla() {
    const cont = document.getElementById('bitTabla');
    const cont2 = document.getElementById('bitConteo');
    const rows = filtradas();
    if (cont2) cont2.textContent = `${rows.length} de ${filas.length} ediciones`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Sin ediciones que coincidan con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblBitacora">
      <thead><tr><th>Fecha</th><th>Quién</th><th>Tabla</th><th>Registro</th><th>Motivo</th><th>Cambios</th></tr></thead>
      <tbody>${rows.map(r => {
        const cambios = camposCambiados(r.campos_antes, r.campos_despues);
        return `<tr>
          <td class="mono">${esc(fechaHora(r.editado_ts))}</td>
          <td>${esc(r.editado_por || '—')}</td>
          <td><span class="pill gris">${esc(r.tabla || '—')}</span></td>
          <td class="mono">${esc(r.registro_id ?? '—')}</td>
          <td>${esc(r.motivo || '—')}</td>
          <td><details class="bit-det"><summary>${cambios.length} ${cambios.length === 1 ? 'campo' : 'campos'}</summary>${diffHtml(cambios)}</details></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
  }

  /* ---------- Render ---------- */

  async function render(cont) {
    filas = await q('v_bitacora_ediciones', '&order=editado_ts.desc&limit=500');
    fTabla = ''; fTexto = '';

    cont.innerHTML = `
      ${ERP.botonesExportar ? ERP.botonesExportar('Bitacora', 'Bitácora de ediciones', '#tblBitacora') : ''}
      <div class="filtros">
        <select class="busca" id="bitFTabla" style="max-width:220px">
          <option value="">Todas las tablas</option>
          ${tablasDistintas().map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
        </select>
        <input class="busca" id="bitFTexto" type="text" placeholder="Buscar por quién, tabla, registro o motivo…">
        <span class="conteo" id="bitConteo"></span>
      </div>
      <div class="card" style="padding:14px"><div id="bitTabla"></div></div>
      <div class="leyenda">Registro de auditoría de ediciones (más reciente arriba). Solo lectura para todos los roles.
        Toca <b>Cambios</b> en una fila para ver el antes → después campo por campo.</div>`;

    document.getElementById('bitFTabla').addEventListener('change', e => { fTabla = e.target.value; pintarTabla(); });
    let tempo;
    document.getElementById('bitFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });

    pintarTabla();
    if (ERP.cablearExportar) ERP.cablearExportar(cont);
  }

  ERP.registrar('bitacora', {
    titulo: 'Bitácora',
    descripcion: 'Auditoría de ediciones — quién cambió qué y cuándo',
    render
  });
})();
