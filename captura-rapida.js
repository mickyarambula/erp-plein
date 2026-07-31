/* Captura en contexto — lanzador reutilizable de captura de MOVIMIENTOS (cobro/pago) desde
   cualquier pantalla (Tesorería, Cobranza/CxC, Pagos/CxP), sin duplicar la lógica de RPC.

   Expone ERP.capturarMovimiento(ctx) que abre el drawer compartido (ERP.abrirPanel) con el
   formulario de cobro/pago. Reusa el mismo contrato que la ficha de carga:
     fn_capturar_mov(p_fecha,p_descripcion,p_ingreso,p_egreso,p_contraparte,p_tipo,p_nota,p_cuenta)
     fn_aplicar_fifo(p_mov_folio)   — el FIFO distribuye por contraparte, no por carga.

   Precarga por contexto (ctx):
     { modo:'cobro'|'pago', contraparte:'NOMBRE', folio:'P-0NN' (solo para la descripción) }
   Al guardar: cierra el drawer, refresca el módulo actual (ERP.marcarDatosSucios + cierre del
   panel → despachar, sin navegar) y muestra un toast con el folio del movimiento.

   Permisos: los botones que lo invocan se ocultan a quien no puede capturar; aquí igual se
   valida ERP.puede('capturar') como red de seguridad (el RPC también lo hace). */

(function () {
  'use strict';
  const { q, rpc, esc, usd } = ERP;

  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const TIPO_MOVIMIENTO = { cobro: 'Cliente', pago: 'Proveedor' };

  function avisoCap(tipo, html) {
    const el = document.getElementById('capAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  let comboContra = null, comboCuenta = null;

  async function capturarMovimiento(ctx) {
    ctx = ctx || {};
    if (!ERP.puede('capturar')) {
      ERP.abrirPanel('Capturar movimiento', '',
        '<div class="errbox">Tu rol es de solo lectura: no puedes capturar movimientos.</div>');
      return;
    }

    const modoInicial = ctx.modo === 'pago' ? 'pago' : 'cobro';
    const puedeAplicar = ERP.puede('editar');   // aplicar FIFO (fn_aplicar_fifo) requiere capacidad EDITAR
    const titulo = 'Capturar movimiento';
    ERP.abrirPanel(titulo, 'Cobro o pago — se aplica FIFO a la contraparte',
      '<div class="skel">Cargando catálogos…</div>');

    let contrapartes, cuentas;
    try {
      [contrapartes, cuentas] = await Promise.all([
        q('v_catalogo_admin', '&order=nombre.asc'),
        q('v_catalogo_cuentas', '&order=id.asc')
      ]);
      if (!cuentas.length) throw new Error('no hay cuentas en el catálogo');
    } catch (e) {
      ERP.abrirPanel(titulo, '', `<div class="errbox">
        No se pudieron leer los catálogos: ${esc(e.message)}<br>Sin ellos no se puede capturar.</div>`);
      return;
    }

    const descInicial = `${modoInicial === 'cobro' ? 'Cobro' : 'Pago'}${ctx.folio ? ' ' + ctx.folio : ctx.contraparte ? ' ' + ctx.contraparte : ''}`;

    ERP.abrirPanel(titulo, 'Cobro o pago — se aplica FIFO a la contraparte', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo">
            <label>Tipo <span class="req">*</span></label>
            <select id="capModo">
              <option value="cobro"${modoInicial === 'cobro' ? ' selected' : ''}>Cobro (entra dinero del cliente)</option>
              <option value="pago"${modoInicial === 'pago' ? ' selected' : ''}>Pago (sale dinero al proveedor)</option>
            </select>
          </div>
          <div class="campo">
            <label>Cuenta <span class="req">*</span></label>
            <div id="capCuenta"></div>
          </div>
          <div class="campo ancho">
            <label>Contraparte <span class="req">*</span></label>
            <div id="capContra"></div>
          </div>
          <div class="campo">
            <label>Fecha <span class="req">*</span></label>
            <input id="capFecha" type="date" value="${hoyISO()}">
          </div>
          <div class="campo">
            <label>Monto USD <span class="req">*</span></label>
            <input id="capMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00">
          </div>
          <div class="campo ancho">
            <label>Descripción <span class="req">*</span></label>
            <input id="capDesc" type="text" maxlength="160" value="${esc(descInicial)}">
          </div>
          <div class="campo ancho">
            <label>Nota</label>
            <input id="capNota" type="text" maxlength="200" placeholder="Opcional — referencia del wire, cheque…">
          </div>
        </div>
        ${puedeAplicar ? `<label class="check-solo">
          <input type="checkbox" id="capSoloCapturar"> Solo capturar (no aplicar FIFO ahora)
        </label>` : ''}
        <div class="acciones">
          <button class="btn-mini" id="capGuardar">${puedeAplicar ? 'Capturar y aplicar' : 'Capturar'}</button>
          <button class="btn-mini gris" id="capCancelar">Cancelar</button>
        </div>
        <div class="aviso visible warn" id="capAviso">
          ${puedeAplicar
            ? 'El cobro/pago se aplica <b>FIFO</b> a la carga más antigua pendiente de esa contraparte. Marca <b>“Solo capturar”</b> para dejarlo pendiente de aplicar.'
            : 'Tu rol <b>captura</b> el movimiento pero no lo aplica: quedará pendiente de aplicar por administración.'}
        </div>
      </div>`);

    comboContra = ERP.crearCombo({
      contenedor: document.getElementById('capContra'),
      items: contrapartes.map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] })),
      placeholder: 'Busca por nombre o alias…',
      permitirNuevo: false,
      valorInicial: ctx.contraparte || null
    });
    comboCuenta = ERP.crearCombo({
      contenedor: document.getElementById('capCuenta'),
      items: cuentas.map(c => ({ id: c.id, nombre: c.id, alias: [c.nombre, c.banco].filter(Boolean) })),
      placeholder: 'Busca por id, nombre o banco…',
      permitirNuevo: false,
      valorInicial: cuentas.some(c => c.id === 'JPM') ? 'JPM' : cuentas[0].id
    });

    // La descripción por defecto sigue al tipo mientras el usuario no la edite a mano.
    const desc = document.getElementById('capDesc');
    let descTocada = false;
    desc.addEventListener('input', () => { descTocada = true; });
    document.getElementById('capModo').addEventListener('change', e => {
      if (descTocada) return;
      const cp = comboContra.valor() || ctx.contraparte || '';
      desc.value = `${e.target.value === 'cobro' ? 'Cobro' : 'Pago'}${ctx.folio ? ' ' + ctx.folio : cp ? ' ' + cp : ''}`;
    });

    document.getElementById('capCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('capGuardar').addEventListener('click', guardar);
    document.getElementById('capMonto').focus();
  }

  async function guardar() {
    const modo = document.getElementById('capModo').value;
    const fecha = document.getElementById('capFecha').value;
    const monto = Number(document.getElementById('capMonto').value);
    const contraparte = comboContra.valor();
    const descripcion = document.getElementById('capDesc').value.trim();
    const nota = document.getElementById('capNota').value.trim();
    const cuenta = comboCuenta.valor();
    const btn = document.getElementById('capGuardar');

    if (!fecha) { avisoCap('err', 'La fecha es obligatoria.'); return; }
    if (!cuenta) { avisoCap('err', 'Elige una cuenta de la lista.'); return; }
    if (!(monto > 0)) { avisoCap('err', 'El monto debe ser mayor a cero.'); return; }
    if (!contraparte) { avisoCap('err', 'Elige la contraparte de la lista.'); return; }
    if (!descripcion) { avisoCap('err', 'La descripción es obligatoria.'); return; }

    btn.disabled = true;
    avisoCap('warn', 'Capturando movimiento…');

    let movFolio;
    try {
      const data = await rpc('fn_capturar_mov', {
        p_fecha: fecha,
        p_descripcion: descripcion,
        p_ingreso: modo === 'cobro' ? monto : 0,
        p_egreso: modo === 'pago' ? monto : 0,
        p_contraparte: contraparte,
        p_tipo: TIPO_MOVIMIENTO[modo],       // 'Cliente' | 'Proveedor'
        p_nota: nota || null,
        p_cuenta: cuenta
      });
      const r = (data && data[0]) || {};
      movFolio = r.folio_asignado;
      if (!movFolio) throw new Error('El ERP no devolvió folio de movimiento.');
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      // Mensajes del backend en español autoexplicativo: se muestran tal cual.
      avisoCap('err', `El ERP rechazó el movimiento: ${esc(e.message)}`);
      btn.disabled = false;
      return;
    }

    /* ¿Aplicar FIFO? Solo si el usuario puede editar Y no marcó "Solo capturar". Sin permiso
       de editar, el movimiento queda capturado pero SIN aplicar (lo hace administración). */
    const soloCap = document.getElementById('capSoloCapturar');
    const soloCapturar = !ERP.puede('editar') || (soloCap && soloCap.checked);
    if (soloCapturar) {
      ERP.marcarDatosSucios();
      ERP.cerrarPanel();
      ERP.toast('ok', `Movimiento <b>${esc(movFolio)}</b> capturado. Queda pendiente de aplicar por administración.`);
      return;
    }

    // Paso 2: FIFO. Si falla, el movimiento YA existe: hay que decirlo con claridad.
    let resumenFifo = '';
    try {
      const filas = await rpc('fn_aplicar_fifo', { p_mov_folio: movFolio });
      const aplic = Array.isArray(filas) ? filas : [];
      resumenFifo = aplic.length
        ? ' Aplicado a ' + aplic.map(f => `<b>${esc(f.carga_folio)}</b> (${usd(f.monto_aplicado)})`).join(', ') + '.'
        : ' Capturado, pero el FIFO no lo aplicó a ninguna carga (revísalo en Tesorería).';
    } catch (e) {
      ERP.marcarDatosSucios();
      ERP.cerrarPanel();
      ERP.toast('err', `Movimiento <b>${esc(movFolio)}</b> capturado, pero el FIFO falló:
        ${esc(e.message)}.<br>El dinero está en el banco sin aplicar. Aplícalo desde el ERP.`, 8000);
      return;
    }

    // Éxito: refresca el módulo actual (al cerrar el panel) sin navegar, y avisa con toast.
    ERP.marcarDatosSucios();
    ERP.cerrarPanel();
    ERP.toast('ok', `Movimiento <b>${esc(movFolio)}</b> capturado.${resumenFifo}`);
  }

  ERP.capturarMovimiento = capturarMovimiento;
})();
