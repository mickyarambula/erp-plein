/* Módulo "Datos faltantes" (E41-D) — lista de trabajo para cerrar campos sin capturar de un jalón,
   en vez de ir carga por carga. Solo lee v_cargas_datos_faltantes (ordenada por `peso`, NO por folio);
   las acciones REUSAN piezas ya existentes (Expediente + ERP.montarResponsable). Al capturar lo que
   falta, la fila desaparece sola (recarga tras cada acción). Visible para todos; acciones solo con
   capacidad 'capturar'. */
(function () {
  'use strict';
  const { q, rpc, esc, norm, badgeEstado } = ERP;

  // Acciones por fila según lo que falte. Reusa lo existente; el id_v7 ya se captura (E42/E43).
  function accionesHTML(f) {
    const falt = (f.faltantes || []).map(x => norm(x));
    let html = '';
    if (falt.some(x => x.includes('entrega')))
      html += '<button class="btn-cap" data-acc-entrega>Confirmar entrega real</button>';
    if (falt.some(x => x.includes('responsable')))
      html += '<button class="btn-cap" data-acc-resp>Asignar responsable</button><div class="acc-resp-slot"></div>';
    if (falt.some(x => x.includes('v7')))
      html += '<span class="acc-v7" style="display:inline-flex;gap:4px;align-items:center"><input class="mono acc-v7-inp" type="text" maxlength="20" placeholder="ID del V7" style="width:112px;font-size:12px;padding:2px 4px"><button class="btn-cap acc-v7-btn">Guardar</button></span>';
    return html || '<span style="color:var(--gris)">—</span>';
  }

  function filaHTML(f, puedeCap) {
    // 'faltantes' como etiquetas chicas ámbar; si no viene el arreglo, cae al texto legible 'falta'.
    const falta = (f.faltantes && f.faltantes.length)
      ? f.faltantes.map(x => `<span class="pill ambar" style="display:inline-block;margin:1px 3px 1px 0">${esc(x)}</span>`).join('')
      : esc(f.falta || '—');
    return `<tr data-folio="${esc(f.folio)}">
      <td class="mono"><span class="enlace acc-folio">${esc(f.folio)}</span></td>
      <td class="mono" style="white-space:nowrap">${f.po ? esc(f.po) : '—'}</td>
      <td>${esc(f.cliente || '—')}</td>
      <td>${esc(f.producto || '—')}</td>
      <td>${badgeEstado(f.estado)}</td>
      <td>${falta}</td>
      <td class="acc-faltantes">${puedeCap ? accionesHTML(f) : '<span style="color:var(--gris)">solo lectura</span>'}</td>
    </tr>`;
  }

  async function render(cont) {
    const puedeCap = ERP.puede('capturar');
    let filas;
    try {
      // Se respeta el orden de la vista (peso desc: lo que bloquea una alerta va primero). No se reordena.
      filas = await q('v_cargas_datos_faltantes', '&order=peso.desc');
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los datos faltantes: ${esc(e.message)}</div>`;
      return;
    }
    if (!filas.length) {
      cont.innerHTML = '<div class="vacio" style="padding:24px">🎉 No hay datos faltantes: todas las cargas vivas están completas.</div>';
      return;
    }

    cont.innerHTML = `
      ${ERP.botonesExportar ? ERP.botonesExportar('DatosFaltantes', 'Datos faltantes', '#tblFaltantes') : ''}
      <div class="card" style="padding:14px"><div class="tabla-wrap"><table id="tblFaltantes">
        <thead><tr><th>Carga</th><th>P.O.</th><th>Cliente</th><th>Producto</th><th>Estado</th><th>Qué falta</th><th>Acciones</th></tr></thead>
        <tbody>${filas.map(f => filaHTML(f, puedeCap)).join('')}</tbody>
      </table></div></div>
      <div class="leyenda">Ordenadas por prioridad (lo que bloquea una alerta operativa va primero, no por folio). Al capturar lo que falta, la carga desaparece de esta lista.</div>`;

    const recargar = () => render(cont);
    const folioDe = el => el.closest('tr').dataset.folio;

    // Folio → Expediente.
    cont.querySelectorAll('.acc-folio').forEach(el =>
      el.addEventListener('click', () => ERP.verCarga(folioDe(el))));

    if (ERP.cablearExportar) ERP.cablearExportar(cont);
    if (!puedeCap) return;   // sin capacidad de captura, la tabla es solo lectura

    // Confirmar entrega real → abre el Expediente (su form de confirmar entrega). Al cerrarse con
    // datos sucios, esta lista se re-renderiza sola (despachar) y la fila desaparece.
    cont.querySelectorAll('[data-acc-entrega]').forEach(b =>
      b.addEventListener('click', () => ERP.verCarga(folioDe(b))));

    // Responsable → selector inline (reusa ERP.montarResponsable) en la propia fila; onDone recarga.
    cont.querySelectorAll('[data-acc-resp]').forEach(b =>
      b.addEventListener('click', () => {
        const slot = b.nextElementSibling;   // .acc-resp-slot
        b.style.display = 'none';
        if (ERP.montarResponsable) ERP.montarResponsable(slot, folioDe(b), null, null, recargar);
      }));

    // ID del V7 → captura inline (fn_asignar_id_v7). El backend bloquea duplicados; se pinta su mensaje.
    cont.querySelectorAll('.acc-v7-btn').forEach(b =>
      b.addEventListener('click', async () => {
        const inp = b.closest('.acc-v7').querySelector('.acc-v7-inp');
        const valor = inp.value.trim();
        if (!valor) { ERP.toast('warn', 'Escribe el ID del V7 antes de guardar.'); inp.focus(); return; }
        b.disabled = true;
        try {
          const data = await rpc('fn_asignar_id_v7', { p_folio: folioDe(b), p_id_v7: valor, p_nota: null });
          ERP.marcarDatosSucios();
          ERP.toast('ok', esc(typeof data === 'string' ? data : ((data && data[0]) || 'ID del V7 guardado.')));
          recargar();
        } catch (e) {
          if (!ERP.avisarSiPermiso(e)) ERP.toast('err', `No se pudo guardar el ID del V7: ${esc(e.message)}`);
          b.disabled = false;
        }
      }));
  }

  ERP.registrar('faltantes', {
    titulo: 'Datos faltantes',
    descripcion: 'Cargas con campos sin capturar — ciérralos de un jalón',
    render
  });
})();
