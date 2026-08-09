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
   valida ERP.puede('capturar') como red de seguridad (el RPC también lo hace).

   También expone ERP.capturarAnticipoProductor(ctx) (E87/D-102) — puerta de un solo paso, SIN
   FIFO, para disponer directo de la línea de un proyecto vía fn_anticipo_productor. Ver el
   bloque propio más abajo para el detalle. */

(function () {
  'use strict';
  const { q, rpc, esc, usd } = ERP;

  // Fecha LOCAL, no toISOString() (UTC): en Sonora (UTC-7) toISOString ya muestra el día
  // siguiente después de las 17:00, prellenando mal los <input type="date">.
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const TIPO_MOVIMIENTO = { cobro: 'Cliente', pago: 'Proveedor' };

  function avisoCap(tipo, html) {
    const el = document.getElementById('capAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  let comboContra = null, comboCuenta = null;

  /* Socios para los pickers de "fondeador" (anticipo) y "socio" (aportación). Se lee de la VISTA
     v_deuda_socios (clase='socio') — el front NO toca la tabla base `contrapartes`. Los campos son
     de texto libre con sugerencias (datalist): se puede escribir cualquier nombre, no solo los
     listados (un socio nuevo aún sin deuda no aparece aquí, pero se captura escribiéndolo). */
  async function cargarSocios() {
    try {
      const filas = await q('v_deuda_socios', '&order=socio.asc');
      let socios = (filas || []).filter(r => String(r.clase || '').toLowerCase() === 'socio')
        .map(r => r.socio).filter(Boolean);
      if (!socios.length) socios = (filas || []).map(r => r.socio).filter(Boolean);
      return [...new Set(socios)];
    } catch (_) { return []; }   // silencioso: sin sugerencias el campo sigue siendo texto libre
  }
  const datalistSocios = (id, socios) =>
    `<datalist id="${id}">${socios.map(s => `<option value="${esc(s)}"></option>`).join('')}</datalist>`;

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

  /* ================= Anticipo a productor (E87/D-102) =================
     Puerta de captura de UN SOLO PASO para un anticipo a productor: dispone directo de la línea
     de un proyecto, SIN FIFO (no es un cobro/pago de carga — capturarMovimiento() de arriba no
     aplica aquí). Antes de esto, la única forma de registrar esto era "Movimiento de línea" en
     la ficha de Proyecto con tipo='disposicion' (fn_registrar_amortizacion) — esa puerta sigue
     intacta; esta es un atajo más simple y directo para el caso común.

       fn_anticipo_productor(p_proyecto,p_productor,p_monto,p_cuenta,p_fecha,p_descripcion,p_nota)
         → folio_asignado, proyecto, saldo_vivo, linea_disponible, advertencia

     Se invoca desde Tesorería (junto a "+ Movimiento"/"+ Registrar gasto") y desde la ficha de
     Proyecto ("Libro de la línea", junto a "+ Registrar movimiento de línea"), con
     ctx.proyecto precargando el selector en ese segundo caso. Reusa exactamente el mismo patrón
     de drawer que capturarMovimiento/formGasto (ERP.abrirPanel, no un modal aparte) — al cerrar,
     el módulo de fondo se refresca solo (marcarDatosSucios + cierre → despachar); NO reabre la
     ficha del proyecto automáticamente (mismo comportamiento ya existente de capturarMovimiento
     al invocarse desde una fila de Cobranza/Pagos). */

  let comboCuentaAnt = null;
  let proyectosAntCat = [];
  let sociosAnt = [];

  function avisoAnt(tipo, html) {
    const el = document.getElementById('antAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  const AVISO_ANT_BASE = 'Este anticipo dispone directo de la línea del proyecto — <b>no aplica FIFO</b> ni se liga a una carga.';

  function proyectoAntPorCodigo(codigo) {
    return proyectosAntCat.find(p => p.codigo === codigo) || null;
  }

  function pintarLineaProyectoAnt(p) {
    const cont = document.getElementById('antLineaInfo');
    if (!cont) return;
    cont.innerHTML = p
      ? `Saldo vivo: <b>${usd(p.saldo_vivo)}</b> · Línea disponible: <b>${usd(p.linea_disponible)}</b>`
      : '';
  }

  /** Avisa ANTES de enviar si el monto ya capturado supera la línea disponible del proyecto
      elegido — el backend sigue siendo la autoridad final (puede rechazar o no); esto es solo
      una señal temprana en la UI, nunca un bloqueo. */
  function revisarLineaAntEnVivo() {
    const codigo = (document.getElementById('antProyecto') || {}).value;
    const monto = Number((document.getElementById('antMonto') || {}).value);
    const p = proyectoAntPorCodigo(codigo);
    if (p && monto > 0 && p.linea_disponible != null && monto > Number(p.linea_disponible) + 0.005) {
      avisoAnt('warn', `⚠ El monto (${usd(monto)}) supera la línea disponible de ${esc(p.codigo)}
        (${usd(p.linea_disponible)}). El ERP puede rechazarlo — el backend decide, esto es solo un aviso.`);
    } else {
      avisoAnt('warn', AVISO_ANT_BASE);
    }
  }

  async function capturarAnticipoProductor(ctx) {
    ctx = ctx || {};
    if (!ERP.puede('capturar')) {
      ERP.abrirPanel('Anticipo a productor', '',
        '<div class="errbox">Tu rol es de solo lectura: no puedes capturar anticipos.</div>');
      return;
    }

    const titulo = 'Anticipo a productor';
    const subInicial = 'Disposición de línea de proyecto — un solo paso, sin FIFO';
    ERP.abrirPanel(titulo, subInicial, '<div class="skel">Cargando proyectos…</div>');

    let cuentas;
    try {
      [proyectosAntCat, cuentas, sociosAnt] = await Promise.all([
        // Solo proyectos activos con línea capturada — no tiene caso ofrecer los demás.
        q('v_proyectos', '&estado=eq.activo&monto_linea=gt.0&order=codigo.asc'),
        q('v_catalogo_cuentas', '&order=id.asc'),
        cargarSocios()   // para el picker de fondeador cuando el origen es 'socio'
      ]);
      if (!cuentas.length) throw new Error('no hay cuentas en el catálogo');
    } catch (e) {
      ERP.abrirPanel(titulo, '', `<div class="errbox">
        No se pudieron leer los catálogos: ${esc(e.message)}<br>Sin ellos no se puede capturar.</div>`);
      return;
    }
    if (!proyectosAntCat.length) {
      ERP.abrirPanel(titulo, '', '<div class="vacio">No hay proyectos activos con línea disponible para anticipar.</div>');
      return;
    }

    ERP.abrirPanel(titulo, subInicial, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Proyecto <span class="req">*</span></label>
            <select id="antProyecto">
              <option value="">— Elige un proyecto —</option>
              ${proyectosAntCat.map(p => `<option value="${esc(p.codigo)}"${ctx.proyecto === p.codigo ? ' selected' : ''}>${esc(p.codigo)} — ${esc(p.nombre || '')}</option>`).join('')}
            </select>
            <div class="alias-ayuda" id="antLineaInfo"></div>
          </div>
          <div class="campo ancho">
            <label>Productor</label>
            <input id="antProductor" type="text" maxlength="120" placeholder="Se prellena con el productor del proyecto — editable">
          </div>
          <div class="campo">
            <label>Cuenta <span class="req">*</span></label>
            <div id="antCuenta"></div>
          </div>
          <div class="campo">
            <label>Origen del fondeo</label>
            <select id="antOrigen">
              <option value="">— Sin especificar —</option>
              <option value="propio">Propio</option>
              <option value="socio">Socio</option>
            </select>
          </div>
          <div class="campo" id="antFondeadorCampo" style="display:none">
            <label>Fondeador (socio)</label>
            <input id="antFondeador" type="text" list="antSociosList" maxlength="120" placeholder="Nombre del socio">
            ${datalistSocios('antSociosList', sociosAnt)}
          </div>
          <div class="campo">
            <label>Fecha <span class="req">*</span></label>
            <input id="antFecha" type="date" value="${hoyISO()}">
          </div>
          <div class="campo">
            <label>Monto USD <span class="req">*</span></label>
            <input id="antMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00">
          </div>
          <div class="campo ancho">
            <label>Descripción</label>
            <input id="antDesc" type="text" maxlength="160" placeholder="Opcional">
          </div>
          <div class="campo ancho">
            <label>Nota</label>
            <input id="antNota" type="text" maxlength="200" placeholder="Opcional">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="antGuardar">Registrar anticipo</button>
          <button class="btn-mini gris" id="antCancelar">Cancelar</button>
        </div>
        <div class="aviso visible warn" id="antAviso">${AVISO_ANT_BASE}</div>
      </div>`);

    comboCuentaAnt = ERP.crearCombo({
      contenedor: document.getElementById('antCuenta'),
      items: cuentas.map(c => ({ id: c.id, nombre: c.id, alias: [c.nombre, c.banco].filter(Boolean) })),
      placeholder: 'Busca por id, nombre o banco…',
      permitirNuevo: false,
      valorInicial: cuentas.some(c => c.id === 'JPM') ? 'JPM' : cuentas[0].id
    });

    const selProyecto = document.getElementById('antProyecto');
    const productorInp = document.getElementById('antProductor');
    selProyecto.addEventListener('change', () => {
      const p = proyectoAntPorCodigo(selProyecto.value);
      pintarLineaProyectoAnt(p);
      if (p && !productorInp.value) productorInp.value = p.productor || '';
      revisarLineaAntEnVivo();
    });
    document.getElementById('antMonto').addEventListener('input', revisarLineaAntEnVivo);

    // Origen del fondeo (opcional, D-124): 'socio' revela el picker de fondeador; cualquier otro
    // valor lo oculta y lo limpia. Es etiqueta — nunca bloquea el flujo actual.
    const selOrigen = document.getElementById('antOrigen');
    const campoFond = document.getElementById('antFondeadorCampo');
    selOrigen.addEventListener('change', () => {
      const esSocio = selOrigen.value === 'socio';
      campoFond.style.display = esSocio ? '' : 'none';
      if (!esSocio) document.getElementById('antFondeador').value = '';
    });

    if (ctx.proyecto) {
      const p = proyectoAntPorCodigo(ctx.proyecto);
      pintarLineaProyectoAnt(p);
      if (p) productorInp.value = p.productor || '';
    }

    document.getElementById('antCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('antGuardar').addEventListener('click', guardarAnticipo);
    document.getElementById('antMonto').focus();
  }

  async function guardarAnticipo() {
    const proyecto = document.getElementById('antProyecto').value;
    const productor = document.getElementById('antProductor').value.trim();
    const monto = Number(document.getElementById('antMonto').value);
    const cuenta = comboCuentaAnt.valor();
    const fecha = document.getElementById('antFecha').value;
    const descripcion = document.getElementById('antDesc').value.trim();
    const nota = document.getElementById('antNota').value.trim();
    const origen = document.getElementById('antOrigen').value || null;
    const fondeador = document.getElementById('antFondeador').value.trim();
    const btn = document.getElementById('antGuardar');

    if (!proyecto) { avisoAnt('err', 'Elige un proyecto de la lista.'); return; }
    if (!(monto > 0)) { avisoAnt('err', 'El monto debe ser mayor a cero.'); return; }
    if (!cuenta) { avisoAnt('err', 'Elige una cuenta.'); return; }
    if (!fecha) { avisoAnt('err', 'La fecha es obligatoria.'); return; }

    btn.disabled = true;
    avisoAnt('warn', 'Registrando anticipo…');
    try {
      const data = await rpc('fn_anticipo_productor', {
        p_proyecto: proyecto,
        p_productor: productor || null,
        p_monto: monto,
        p_cuenta: cuenta,
        p_fecha: fecha || null,
        p_descripcion: descripcion || null,
        p_nota: nota || null,
        // Origen del fondeo (opcional): solo etiqueta, nunca bloquea. p_fondeador solo si es socio.
        p_origen_fondeo: origen,
        p_fondeador: (origen === 'socio' && fondeador) ? fondeador : null
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.cerrarPanel();
      const advTxt = r.advertencia ? `<br>Aviso: ${esc(r.advertencia)}` : '';
      ERP.toast('ok', `Anticipo folio <b>${esc(r.folio_asignado)}</b> registrado. ` +
        `Saldo vivo ${usd(r.saldo_vivo)}, línea disponible ${usd(r.linea_disponible)}.${advTxt}`, 8000);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      // Mensaje del backend tal cual (incluida la guarda "...excede la linea..."), sin envolverlo.
      avisoAnt('err', `El ERP rechazó el anticipo: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Aportación de socio (D-122) =================
     Entrada de capital de un socio: préstamo sin interés (pasivo de balance, patrón JEAMS),
     financiamiento con tasa, o custodia. Reusa el mismo patrón de drawer que anticipo/gasto.
       fn_registrar_aportacion_socio(p_socio,p_monto,p_naturaleza,p_cuenta,p_fecha,p_proyecto,
                                     p_descripcion,p_nota) → folio_asignado, socio, naturaleza,
                                     tipo_mov, advertencia.
     p_socio = nombre de contraparte (texto libre con sugerencias). p_proyecto es SOLO etiqueta de
     referencia (no mueve ninguna línea). Se invoca desde Tesorería y desde la ficha de Proyecto. */

  let comboCuentaAp = null;
  const NATURALEZA_AP = [
    ['prestamo_sin_interes', 'Préstamo sin interés'],
    ['financiamiento_con_tasa', 'Financiamiento con tasa'],
    ['custodia', 'Custodia']
  ];

  function avisoAp(tipo, html) {
    const el = document.getElementById('apAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  async function capturarAportacionSocio(ctx) {
    ctx = ctx || {};
    if (!ERP.puede('capturar')) {
      ERP.abrirPanel('Aportación de socio', '',
        '<div class="errbox">Tu rol es de solo lectura: no puedes capturar aportaciones.</div>');
      return;
    }

    const titulo = 'Registrar aportación de socio';
    const sub = 'Entrada de capital de socio (préstamo sin interés, financiamiento con tasa o custodia)';
    ERP.abrirPanel(titulo, sub, '<div class="skel">Cargando catálogos…</div>');

    let cuentas, socios, proyectos;
    try {
      [cuentas, socios, proyectos] = await Promise.all([
        q('v_catalogo_cuentas', '&order=id.asc'),
        cargarSocios(),
        q('v_proyectos', '&order=codigo.asc').catch(() => [])   // referencia opcional; si falla, sin lista
      ]);
      if (!cuentas.length) throw new Error('no hay cuentas en el catálogo');
    } catch (e) {
      ERP.abrirPanel(titulo, '', `<div class="errbox">
        No se pudieron leer los catálogos: ${esc(e.message)}<br>Sin ellos no se puede capturar.</div>`);
      return;
    }

    ERP.abrirPanel(titulo, sub, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Socio <span class="req">*</span></label>
            <input id="apSocio" type="text" list="apSociosList" maxlength="120" placeholder="Nombre del socio (JEAMS, José, Samuel…)">
            ${datalistSocios('apSociosList', socios)}
          </div>
          <div class="campo">
            <label>Naturaleza <span class="req">*</span></label>
            <select id="apNaturaleza">${NATURALEZA_AP.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          </div>
          <div class="campo">
            <label>Monto USD <span class="req">*</span></label>
            <input id="apMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00">
          </div>
          <div class="campo">
            <label>Cuenta <span class="req">*</span></label>
            <div id="apCuenta"></div>
          </div>
          <div class="campo">
            <label>Fecha <span class="req">*</span></label>
            <input id="apFecha" type="date" value="${hoyISO()}">
          </div>
          <div class="campo ancho">
            <label>Proyecto (referencia, opcional)</label>
            <select id="apProyecto">
              <option value="">— Ninguno —</option>
              ${(proyectos || []).map(p => `<option value="${esc(p.codigo)}"${ctx.proyecto === p.codigo ? ' selected' : ''}>${esc(p.codigo)} — ${esc(p.nombre || '')}</option>`).join('')}
            </select>
          </div>
          <div class="campo ancho"><label>Descripción</label>
            <input id="apDesc" type="text" maxlength="160" placeholder="Opcional"></div>
          <div class="campo ancho"><label>Nota</label>
            <input id="apNota" type="text" maxlength="200" placeholder="Opcional"></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="apGuardar">Registrar aportación</button>
          <button class="btn-mini gris" id="apCancelar">Cancelar</button>
        </div>
        <div class="aviso visible warn" id="apAviso">La aportación entra como <b>capital del socio</b> en la cuenta elegida. El proyecto (si lo eliges) es solo referencia — no mueve ninguna línea.</div>
      </div>`);

    comboCuentaAp = ERP.crearCombo({
      contenedor: document.getElementById('apCuenta'),
      items: cuentas.map(c => ({ id: c.id, nombre: c.id, alias: [c.nombre, c.banco].filter(Boolean) })),
      placeholder: 'Busca por id, nombre o banco…',
      permitirNuevo: false,
      valorInicial: cuentas.some(c => c.id === 'JPM') ? 'JPM' : cuentas[0].id
    });

    document.getElementById('apCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('apGuardar').addEventListener('click', guardarAportacion);
    document.getElementById('apSocio').focus();
  }

  async function guardarAportacion() {
    const socio = document.getElementById('apSocio').value.trim();
    const naturaleza = document.getElementById('apNaturaleza').value;
    const monto = Number(document.getElementById('apMonto').value);
    const cuenta = comboCuentaAp.valor();
    const fecha = document.getElementById('apFecha').value;
    const proyecto = document.getElementById('apProyecto').value || null;
    const descripcion = document.getElementById('apDesc').value.trim();
    const nota = document.getElementById('apNota').value.trim();
    const btn = document.getElementById('apGuardar');

    if (!socio) { avisoAp('err', 'Escribe el nombre del socio.'); return; }
    if (!(monto > 0)) { avisoAp('err', 'El monto debe ser mayor a cero.'); return; }
    if (!cuenta) { avisoAp('err', 'Elige una cuenta.'); return; }
    if (!fecha) { avisoAp('err', 'La fecha es obligatoria.'); return; }

    btn.disabled = true;
    avisoAp('warn', 'Registrando aportación…');
    try {
      const data = await rpc('fn_registrar_aportacion_socio', {
        p_socio: socio,
        p_monto: monto,
        p_naturaleza: naturaleza,
        p_cuenta: cuenta,
        p_fecha: fecha || null,
        p_proyecto: proyecto,
        p_descripcion: descripcion || null,
        p_nota: nota || null
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.cerrarPanel();
      const advTxt = r.advertencia ? `<br>Aviso: ${esc(r.advertencia)}` : '';
      ERP.toast('ok', `Aportación folio <b>${esc(r.folio_asignado)}</b> registrada ` +
        `(${esc(r.socio || socio)} · ${esc(r.naturaleza || naturaleza)}).${advTxt}`, 8000);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoAp('err', `El ERP rechazó la aportación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  ERP.capturarAnticipoProductor = capturarAnticipoProductor;
  ERP.capturarAportacionSocio = capturarAportacionSocio;
  ERP.capturarMovimiento = capturarMovimiento;
})();
