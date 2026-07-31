/* Módulo Tesorería — saldos por cuenta, flujo semanal / mensual, y estado de cuenta
   (bitácora completa de movimientos con saldo corrido). */

(function () {
  'use strict';
  const { q, rpc, esc, usd, usd0, num, fmt0, norm } = ERP;

  const hoyISO = () => new Date().toISOString().slice(0, 10);

  /* "Registrar gasto" cubre SOLO costo fijo/administrativo. El costo operativo ligado a
     un embarque (fletes, aduanas, comisión, empaque) NO va aquí: tiene su propio camino
     por la ficha de carga → costos, para no desconectarlo de la rentabilidad de su carga.
     Por eso p_tipo se limita a estas 7, nunca 'Cliente'/'Proveedor'. */
  const TIPOS_GASTO = [
    'Gastos Administrativos', 'Gastos Financieros', 'Otros gastos',
    'Paca', 'Sueldo', 'Viaticos', 'Seguro'
  ];

  /* ================= Resúmenes (lo que ya existía) ================= */

  function pintarCuentas(rows) {
    if (!rows.length) return '<div class="vacio">Sin cuentas registradas.</div>';
    const reales = rows.filter(r => r.banco !== 'Virtual');
    const total = reales.reduce((s, r) => s + num(r.saldo), 0);

    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Cuenta</th><th>Banco</th><th class="num">Movs</th><th>Último mov.</th><th class="num">Saldo</th></tr></thead>
      <tbody>${rows.map(r => {
        const s = num(r.saldo), virt = r.banco === 'Virtual';
        return `<tr style="${virt ? 'color:var(--gris)' : ''}">
          <td><b>${esc(r.id)}</b>${virt ? ' <span class="pill gris">virtual</span>' : ''}</td>
          <td>${esc(r.nombre)}</td>
          <td class="num">${esc(r.movs)}</td>
          <td>${esc(ERP.fecha(r.ultimo_mov))}</td>
          <td class="num ${s < 0 ? 'neg' : ''}">${usd(s)}</td></tr>`;
      }).join('')}</tbody>
      <tfoot><tr class="total"><td colspan="4">Total cuentas reales</td><td class="num">${usd(total)}</td></tr></tfoot>
    </table></div>
    <div class="leyenda">JEAMS es el ledger virtual del préstamo de socio, no una cuenta bancaria.
      Los traspasos entre cuentas se registran vía <span class="mono">fn_traspaso</span> y no afectan el P&amp;L.</div>`;
  }

  function pintarFlujoSemanal(rows) {
    const ult = rows.slice(-6);
    if (!ult.length) return '<div class="vacio">Sin movimientos semanales.</div>';
    const max = Math.max(...ult.flatMap(r => [num(r.ingresos), Math.abs(num(r.egresos))]), 1);

    return `<div class="flujo">${ult.map(r => {
      const inp = num(r.ingresos), out = Math.abs(num(r.egresos)), neto = num(r.neto);
      return `<div class="fcol">
        <div class="fbars">
          <div class="fb in" style="height:${Math.max(inp / max * 100, 2)}%" title="Ingresos ${usd(inp)}"></div>
          <div class="fb out" style="height:${Math.max(out / max * 100, 2)}%" title="Egresos ${usd(out)}"></div>
        </div>
        <div class="fneto ${neto >= 0 ? 'pos' : 'negv'}">${neto >= 0 ? '+' : '−'}${fmt0(Math.abs(neto))}</div>
        <div class="fsem">${esc(String(r.semana_iso).replace(/^\d{4}-/, ''))}</div>
      </div>`;
    }).join('')}</div>
    <div class="leyenda">Verde = ingresos · gris = egresos · neto semanal abajo. Cuenta JPM.</div>`;
  }

  function pintarFlujoMensual(rows) {
    if (!rows.length) return '<div class="vacio">Sin flujo mensual.</div>';
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Mes</th><th class="num">Entradas</th><th class="num">Salidas</th>
        <th class="num">Cobros clientes</th><th class="num">Pagos proveedores</th>
        <th class="num">Neto</th><th class="num">Saldo acum.</th></tr></thead>
      <tbody>${rows.map(r => {
        const n = num(r.neto);
        return `<tr>
          <td>${esc(ERP.mesTexto(r.mes))}</td>
          <td class="num">${usd0(r.entradas)}</td>
          <td class="num">${usd0(Math.abs(num(r.salidas)))}</td>
          <td class="num">${usd0(r.cobros_clientes)}</td>
          <td class="num">${usd0(Math.abs(num(r.pagos_proveedores)))}</td>
          <td class="num ${n < 0 ? 'neg' : 'pos'}">${n < 0 ? '−' : '+'}${fmt0(Math.abs(n))}</td>
          <td class="num"><b>${usd0(r.saldo_acumulado)}</b></td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="leyenda">Base caja pura, cuenta JPM. El saldo acumulado final coincide con el saldo del banco.</div>`;
  }

  /* ================= Estado de cuenta ================= */

  let movimientos = [];
  let cuentaSel = null;      // selección única: el saldo corrido es POR CUENTA
  let desde = '';
  let hasta = '';
  let texto = '';

  // Log de auditoría de ediciones (v_bitacora_movimientos, ts DESC). Se carga una vez
  // por render y sirve para tres cosas: el indicador por fila, el panel por folio y la
  // sección general. foliosConCambios = qué movimientos tienen al menos un cambio.
  let bitacora = [];
  let foliosConCambios = new Set();

  const DIAS_POR_DEFECTO = 90;

  /** aplicado_a es TEXTO: puede traer varios folios separados por coma, o venir vacío. */
  function foliosAplicados(aplicado_a) {
    return String(aplicado_a || '')
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);
  }

  const soloFecha = f => String(f || '').slice(0, 10);

  function cuentas() {
    return [...new Set(movimientos.map(m => m.cuenta_id).filter(Boolean))].sort();
  }

  /** Fecha de referencia = el movimiento más reciente, no "hoy": los datos pueden ser viejos. */
  function fechaMaxima() {
    return movimientos.reduce((max, m) => {
      const f = soloFecha(m.fecha);
      return f > max ? f : max;
    }, '');
  }

  function rangoPorDefecto() {
    const max = fechaMaxima();
    if (!max) return '';
    const d = new Date(max + 'T12:00:00');
    d.setDate(d.getDate() - DIAS_POR_DEFECTO);
    return d.toISOString().slice(0, 10);
  }

  function filtrados() {
    const t = norm(texto);
    return movimientos.filter(m => {
      if (cuentaSel && m.cuenta_id !== cuentaSel) return false;
      const f = soloFecha(m.fecha);
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      if (!t) return true;
      return [m.descripcion, m.contraparte, m.folio, m.nota, m.aplicado_a]
        .some(v => norm(v).includes(t));
    });
  }

  function pintarMovimientos() {
    const filas = filtrados()
      .slice()
      // Más reciente arriba, como un estado de cuenta bancario. Desempate por folio.
      .sort((a, b) => soloFecha(b.fecha).localeCompare(soloFecha(a.fecha))
        || String(b.folio).localeCompare(String(a.folio), 'es', { numeric: true }));

    const cont = document.getElementById('ecTabla');
    document.getElementById('ecConteo').textContent =
      `${filas.length} de ${movimientos.filter(m => !cuentaSel || m.cuenta_id === cuentaSel).length} movimientos`;

    if (!filas.length) {
      cont.innerHTML = '<div class="vacio">Ningún movimiento coincide con el filtro.</div>';
      return;
    }

    /* Los movimientos anulados no suman: el saldo corrido de la vista ya los ignora. */
    const vigentes = filas.filter(m => !m.anulado);
    const totIn = vigentes.reduce((s, m) => s + num(m.ingreso), 0);
    const totOut = vigentes.reduce((s, m) => s + Math.abs(num(m.egreso)), 0);
    const nAnulados = filas.length - vigentes.length;

    // Editar un movimiento usa fn_editar_movimiento → requiere capacidad EDITAR (no captura).
    const editable = ERP.puede('editar');

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr>
        <th>Folio</th><th>Fecha</th><th>Contraparte</th><th>Tipo</th><th class="col-desc">Descripción</th>
        <th class="num">Ingreso</th><th class="num">Egreso</th><th class="num">Saldo</th>
        <th>Aplicado a</th>${editable ? '<th></th>' : ''}
      </tr></thead>
      <tbody>${filas.map(m => {
        const folios = foliosAplicados(m.aplicado_a);
        const ing = num(m.ingreso), egr = Math.abs(num(m.egreso));
        // Descripción real: si viene vacía o repite literalmente la contraparte (dato viejo
        // sin corregir), se pinta "—" en gris en vez de duplicar el nombre.
        const descRepite = !m.descripcion || norm(m.descripcion) === norm(m.contraparte);
        const descHtml = descRepite
          ? '<span style="color:var(--gris)">—</span>'
          : esc(m.descripcion);
        return `<tr id="mov-${esc(m.folio)}" data-folio="${esc(m.folio)}" class="${m.anulado ? 'mov-anulado' : ''}" ${m.nota ? `title="${esc(m.nota)}"` : ''}>
          <td class="mono">${esc(m.folio || '—')}${foliosConCambios.has(String(m.folio))
            ? ` <span class="hist-ic" data-hist="${esc(m.folio)}" title="Este movimiento fue editado — ver historial">🕘</span>` : ''}</td>
          <td class="mono">${esc(ERP.fecha(m.fecha))}</td>
          <td>${esc(m.contraparte || '—')}</td>
          <td>${m.tipo ? `<span class="pill gris">${esc(m.tipo)}</span>` : '—'}</td>
          <td class="col-desc">${descHtml}${m.anulado ? ' <span class="pill rojo">ANULADO</span>' : ''}</td>
          <td class="num">${ing > 0.009 ? usd(ing) : '—'}</td>
          <td class="num ${egr > 0.009 ? 'neg' : ''}">${egr > 0.009 ? usd(egr) : '—'}</td>
          <td class="num"><b>${usd(m.saldo_acumulado)}</b></td>
          <td>${folios.length
            ? `<span class="chips-folio">${folios.map(f =>
                `<span class="chip-folio" data-folio="${esc(f)}" title="Abrir ficha de ${esc(f)}">${esc(f)}</span>`
              ).join('')}</span>`
            : '<span class="sin-carga">sin carga</span>'}</td>
          ${editable ? `<td>${m.anulado ? '' : `<button class="btn-mini gris" data-editar="${esc(m.folio)}">Editar</button>`}</td>` : ''}
        </tr>`;
      }).join('')}</tbody>
      <tfoot><tr class="total">
        <td colspan="5">Total del filtro (${vigentes.length})${nAnulados ? ` · ${nAnulados} anulado${nAnulados === 1 ? '' : 's'} sin contar` : ''}</td>
        <td class="num">${usd(totIn)}</td>
        <td class="num">${usd(totOut)}</td>
        <td class="num">${usd(totIn - totOut)}<div style="font-size:9.5px;color:var(--gris);font-weight:400">neto del periodo</div></td>
        <td></td>${editable ? '<td></td>' : ''}
      </tr></tfoot>
    </table></div>`;

    cont.querySelectorAll('.chip-folio').forEach(el =>
      el.addEventListener('click', () => ERP.verCarga(el.dataset.folio)));
    cont.querySelectorAll('[data-editar]').forEach(b =>
      b.addEventListener('click', () => editarMovimiento(b.dataset.editar)));
    cont.querySelectorAll('.hist-ic[data-hist]').forEach(el =>
      el.addEventListener('click', () => verHistorial(el.dataset.hist)));
  }

  /* ---------- Historial de cambios (auditoría, solo lectura) ----------
     v_bitacora_movimientos: id, folio, fecha_mov, descripcion_mov, campo,
     valor_ant, valor_nuevo, actor, actor_nombre, ts. valor_ant puede ser NULL. */

  /** Panel con el historial de UN movimiento (más reciente arriba). */
  function verHistorial(folio) {
    const rows = bitacora
      .filter(b => String(b.folio) === String(folio))
      .slice()
      .sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    const mov = movimientos.find(m => String(m.folio) === String(folio));
    const sub = mov
      ? `Cuenta ${esc(mov.cuenta_id || '—')}${mov.descripcion ? ' · ' + esc(mov.descripcion) : ''}`
      : `Movimiento ${esc(folio)}`;
    ERP.abrirPanel(`Historial · movimiento ${esc(folio)}`, sub, cuerpoHistorial(rows));
  }

  function cuerpoHistorial(rows) {
    if (!rows.length) return '<div class="vacio">Sin cambios registrados para este movimiento.</div>';
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Fecha y hora</th><th>Quién</th><th>Campo</th><th>Antes → después</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td class="mono">${esc(fechaHora(r.ts))}</td>
        <td>${esc(r.actor_nombre || r.actor || '—')}</td>
        <td>${esc(r.campo)}</td>
        <td><span style="color:var(--gris)">${esc(r.valor_ant ?? '—')}</span> → <b>${esc(r.valor_nuevo ?? '—')}</b></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="leyenda">Registro de auditoría de las ediciones de este movimiento
      (<span class="mono">fn_editar_movimiento</span>). Un campo que estaba vacío se muestra como “—”.</div>`;
  }

  /** Sección general: últimas 100 ediciones de cualquier movimiento. */
  function pintarBitacoraGeneral(rows) {
    if (!rows.length) {
      return `<div class="vacio">Aún no hay ediciones registradas.
        El registro de auditoría se estrenó el 13-jul-2026.</div>`;
    }
    const top = rows.slice(0, 100);   // ya viene ts DESC del backend
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Fecha y hora</th><th>Mov.</th><th>Descripción</th><th>Quién</th>
        <th>Campo</th><th>Antes → después</th></tr></thead>
      <tbody>${top.map(r => `<tr class="clic" data-hist="${esc(r.folio)}">
        <td class="mono">${esc(fechaHora(r.ts))}</td>
        <td class="mono"><span class="enlace">${esc(r.folio || '—')}</span></td>
        <td>${esc(r.descripcion_mov || '—')}</td>
        <td>${esc(r.actor_nombre || r.actor || '—')}</td>
        <td>${esc(r.campo)}</td>
        <td><span style="color:var(--gris)">${esc(r.valor_ant ?? '—')}</span> → <b>${esc(r.valor_nuevo ?? '—')}</b></td>
      </tr>`).join('')}</tbody>
    </table></div>
    <div class="leyenda">${rows.length > 100 ? `Mostrando las 100 ediciones más recientes de ${rows.length}. ` : ''}
      Toca una fila para ver el historial completo de ese movimiento. Solo lectura.</div>`;
  }

  function pintarChipsCuenta() {
    document.querySelectorAll('#ecCuentas .chip').forEach(ch =>
      ch.classList.toggle('activo', ch.dataset.cuenta === cuentaSel));
  }

  function seccionEstadoCuenta() {
    if (!movimientos.length) {
      return '<div class="card"><div class="vacio">Sin movimientos registrados.</div></div>';
    }
    const lista = cuentas();
    return `
      <div class="filtros" id="ecCuentas">
        ${lista.map(c => `<button class="chip" data-cuenta="${esc(c)}">${esc(c)}</button>`).join('')}
        <input class="busca" id="ecBusca" type="text" placeholder="Buscar por descripción, contraparte o folio…">
        <span class="conteo" id="ecConteo"></span>
      </div>
      <div class="filtros">
        <span class="fechas">
          <label for="ecDesde">Desde</label><input id="ecDesde" type="date">
          <label for="ecHasta">Hasta</label><input id="ecHasta" type="date">
        </span>
        <button class="chip" id="ecVerTodo">Ver todo el historial</button>
        <button class="chip" id="ecUlt90">Últimos ${DIAS_POR_DEFECTO} días</button>
      </div>
      <div class="card" style="padding:14px"><div id="ecTabla"></div></div>
      <div class="leyenda">
        <b>El saldo corrido es por cuenta</b>, por eso solo se ve una cuenta a la vez:
        mezclarlas haría que la columna Saldo no signifique nada.<br>
        Orden: el movimiento más reciente arriba. Los folios de <i>Aplicado a</i> son clicables
        y abren la ficha de esa carga — un mismo movimiento puede repartirse entre varias cargas
        (FIFO). <i>Sin carga</i> = gasto general (nómina, administrativos), no es un dato faltante.
      </div>`;
  }

  function conectarEstadoCuenta() {
    if (!movimientos.length) return;

    document.querySelectorAll('#ecCuentas .chip').forEach(ch =>
      ch.addEventListener('click', () => {
        cuentaSel = ch.dataset.cuenta;
        pintarChipsCuenta();
        pintarMovimientos();
      }));

    const dDesde = document.getElementById('ecDesde');
    const dHasta = document.getElementById('ecHasta');
    dDesde.value = desde;
    dHasta.value = hasta;

    dDesde.addEventListener('change', () => { desde = dDesde.value; pintarMovimientos(); });
    dHasta.addEventListener('change', () => { hasta = dHasta.value; pintarMovimientos(); });

    document.getElementById('ecVerTodo').addEventListener('click', () => {
      desde = ''; hasta = '';
      dDesde.value = ''; dHasta.value = '';
      pintarMovimientos();
    });
    document.getElementById('ecUlt90').addEventListener('click', () => {
      desde = rangoPorDefecto(); hasta = '';
      dDesde.value = desde; dHasta.value = '';
      pintarMovimientos();
    });

    let tempo;
    document.getElementById('ecBusca').addEventListener('input', e => {
      clearTimeout(tempo);
      tempo = setTimeout(() => { texto = e.target.value; pintarMovimientos(); }, 150);
    });

    pintarChipsCuenta();
    pintarMovimientos();
  }

  /* ================= Registrar gasto ================= */

  function avisoG(tipo, html) {
    const el = document.getElementById('gAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  function limpiarAvisoG() {
    const el = document.getElementById('gAviso');
    if (el) { el.className = 'aviso'; el.innerHTML = ''; }
  }

  let comboBenef = null, comboCuentaG = null;

  async function formGasto() {
    ERP.abrirPanel('Registrar gasto', 'Costo fijo o administrativo — no ligado a una carga',
      '<div class="skel">Cargando catálogos…</div>');

    let beneficiarios, cuentas;
    try {
      [beneficiarios, cuentas] = await Promise.all([
        // La vista trae operativo+gasto; aquí solo gasto (el operativo va por la ficha de carga).
        q('v_catalogo_beneficiarios_gasto', '&clase=eq.gasto&order=nombre.asc'),
        q('v_catalogo_cuentas', '&order=id.asc')
      ]);
      if (!cuentas.length) throw new Error('no hay cuentas en el catálogo');
    } catch (e) {
      ERP.abrirPanel('Registrar gasto', '', `<div class="errbox">
        No se pudieron leer los catálogos: ${esc(e.message)}<br>Intenta de nuevo.</div>`);
      return;
    }

    ERP.abrirPanel('Registrar gasto', 'Costo fijo o administrativo — no ligado a una carga', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Beneficiario <span class="req">*</span></label>
            <div id="gBenef"></div>
            <div class="alias-ayuda">Solo beneficiarios de gasto. Los proveedores de servicio
              (flete, aduana, empaque) se capturan como costo dentro de su carga.</div>
          </div>
          <div class="campo">
            <label>Tipo de gasto <span class="req">*</span></label>
            <select id="gTipo">
              <option value="">Elige un tipo…</option>
              ${TIPOS_GASTO.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
            </select>
          </div>
          <div class="campo">
            <label>Cuenta <span class="req">*</span></label>
            <div id="gCuenta"></div>
          </div>
          <div class="campo">
            <label>Fecha <span class="req">*</span></label>
            <input id="gFecha" type="date" value="${hoyISO()}">
          </div>
          <div class="campo">
            <label>Monto USD <span class="req">*</span></label>
            <input id="gMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00">
          </div>
          <div class="campo ancho">
            <label>Descripción <span class="req">*</span></label>
            <input id="gDesc" type="text" maxlength="160" placeholder="De qué es el gasto">
          </div>
          <div class="campo ancho">
            <label>Nota</label>
            <input id="gNota" type="text" maxlength="200" placeholder="Opcional — referencia, factura…">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="gGuardar">Registrar gasto</button>
          <button class="btn-mini gris" id="gCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="gAviso"></div>
      </div>`);

    comboBenef = ERP.crearCombo({
      contenedor: document.getElementById('gBenef'),
      items: beneficiarios.map(b => ({ id: b.id, nombre: b.nombre, alias: b.alias || [] })),
      placeholder: 'Busca por nombre o alias…',
      permitirNuevo: false
    });
    comboCuentaG = ERP.crearCombo({
      contenedor: document.getElementById('gCuenta'),
      items: cuentas.map(c => ({ id: c.id, nombre: c.id, alias: [c.nombre, c.banco].filter(Boolean) })),
      placeholder: 'Cuenta…',
      permitirNuevo: false,
      valorInicial: cuentas.some(c => c.id === 'JPM') ? 'JPM' : cuentas[0].id
    });

    document.getElementById('gCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('gGuardar').addEventListener('click', guardarGasto);
  }

  async function guardarGasto() {
    const v = id => document.getElementById(id).value.trim();
    const beneficiario = comboBenef.valor();
    const tipo = v('gTipo');
    const cuenta = comboCuentaG.valor();
    const fecha = v('gFecha');
    const monto = Number(v('gMonto'));
    const descripcion = v('gDesc');
    const nota = v('gNota');
    const btn = document.getElementById('gGuardar');
    limpiarAvisoG();

    if (!beneficiario) { avisoG('err', 'Elige un beneficiario de la lista.'); return; }
    if (!TIPOS_GASTO.includes(tipo)) { avisoG('err', 'Elige un tipo de gasto.'); return; }
    if (!cuenta) { avisoG('err', 'Elige una cuenta.'); return; }
    if (!fecha) { avisoG('err', 'La fecha es obligatoria.'); return; }
    if (!(monto > 0)) { avisoG('err', 'El monto debe ser mayor a cero.'); return; }
    if (!descripcion) { avisoG('err', 'La descripción es obligatoria.'); return; }

    btn.disabled = true;
    avisoG('warn', 'Registrando gasto…');
    try {
      const data = await rpc('fn_capturar_mov', {
        p_fecha: fecha,
        p_descripcion: descripcion,
        p_egreso: monto,                 // magnitud positiva; el backend normaliza el signo
        p_contraparte: beneficiario,     // nombre canónico, clase=gasto
        p_tipo: tipo,                    // una de las 7; nunca 'Cliente'/'Proveedor'
        p_cuenta: cuenta,
        p_nota: nota || null
        // sin fn_aplicar_fifo: un gasto general no se aplica a ninguna carga
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();           // el estado de cuenta y los saldos de fondo cambiaron
      avisoG('ok', `Gasto registrado${r.folio_asignado ? ` como <b>${esc(r.folio_asignado)}</b>` : ''}
        — ${usd(monto)} a ${esc(beneficiario)}${r.advertencia ? `.<br>Nota: ${esc(r.advertencia)}` : '.'}`);
      // Deja el aviso visible y limpia el resto para poder capturar otro sin cerrar.
      document.getElementById('gMonto').value = '';
      document.getElementById('gDesc').value = '';
      document.getElementById('gNota').value = '';
      document.getElementById('gTipo').value = '';
      comboBenef.limpiar();
    } catch (e) {
      avisoG('err', `El ERP rechazó el gasto: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  ERP.registrarGasto = formGasto;

  /* ================= Editar movimiento ================= */

  const MAPA_ERROR = {
    PERMISO_DENEGADO: 'No tienes permiso para editar movimientos.',
    MOV_NO_EXISTE: 'El movimiento ya no existe.',
    MOV_ANULADO: 'El movimiento está anulado; no se puede editar.',
    TIPO_INVALIDO: 'El tipo elegido no es válido.',
    CONTRAPARTE_INVALIDA: 'La contraparte elegida no es válida.',
    SIGNO_INVALIDO: 'El signo del monto es inválido (un ingreso es positivo, un egreso negativo).',
    MONTO_CERO: 'El monto no puede ser cero: debe ser un ingreso o un egreso.',
    FORZAR_REQUIERE_ADMIN: 'Forzar el cambio requiere administrador.'
  };
  function textoError(msg) {
    const clave = Object.keys(MAPA_ERROR).find(k => String(msg).startsWith(k));
    return clave ? MAPA_ERROR[clave] : msg;
  }

  /* Errores de fn_aplicar_a_carga / fn_desaplicar. Solo se traducen los códigos en MAYÚSCULAS;
     el resto ("...exceden el monto...", "SOBRE-COBRO/SOBRE-PAGO...", "GATE 4: periodo
     CERRADO...") ya llega legible en español desde el backend y se muestra tal cual. */
  const MAPA_ERROR_APL = {
    PERMISO_DENEGADO: 'No tienes permiso para aplicar ni desaplicar movimientos.',
    NOTA_REQUERIDA: 'La nota/motivo es obligatoria.',
    MONTO_INVALIDO: 'El monto no es válido.',
    MOV_ANULADO: 'El movimiento está anulado; no se puede aplicar ni desaplicar.',
    CARGA_NO_EXISTE: 'Esa carga no existe.'
  };
  function textoErrorApl(msg) {
    const clave = Object.keys(MAPA_ERROR_APL).find(k => String(msg).startsWith(k));
    return clave ? MAPA_ERROR_APL[clave] : msg;
  }

  function avisoEd(tipo, html) {
    const el = document.getElementById('edMovAviso');
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }

  function fechaHora(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    if (isNaN(d)) return String(ts);
    return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  let comboContraparteEd = null;
  let comboCargaApl = null;

  /* ================= Aplicaciones del movimiento (v_movimiento_aplicaciones) ================= */

  // Mismo patrón de combo de cargas ya usado en modulo-ordenes.js (comboCargasItems): id=folio,
  // nombre buscable por folio/PO/contraparte, alias para que el buscador encuentre por cualquiera.
  function cargasComboItems(cargas) {
    return (cargas || []).filter(c => !c.anulado).map(c => ({
      id: c.folio,
      nombre: `${c.folio}${c.po ? ' · ' + c.po : ''}${c.cliente ? ' · ' + c.cliente : c.proveedor ? ' · ' + c.proveedor : ''}`,
      alias: [c.po, c.cliente, c.proveedor, c.producto, c.folio].filter(Boolean)
    }));
  }

  function pintarAplicaciones(rows, puedeEd) {
    if (rows && rows.__error) {
      return `<div class="errbox">No se pudieron leer las aplicaciones: ${esc(rows.__error)}</div>`;
    }
    if (!rows.length) return '<div class="docs-vacio">Sin aplicaciones registradas para este movimiento.</div>';

    const r0 = rows[0];
    const sinAplicar = num(r0.mov_sin_aplicar);
    const resumen = `<div class="aviso visible ${sinAplicar > 0.009 ? 'warn' : 'ok'}">
      Aplicado ${usd(r0.mov_aplicado)} de ${usd(r0.mov_total)} — quedan <b>${usd(r0.mov_sin_aplicar)}</b>
    </div>`;

    const filas = rows.map(r => {
      const contraNombre = (r.sentido === 'Cobro' ? r.carga_cliente : r.carga_proveedor) || '—';
      const flagChip = r.carga_flag ? ' <span class="pill ambar">Carga en revisión</span>' : '';
      return `<tr>
        <td>${esc(r.sentido || '—')}</td>
        <td class="mono"><span class="chip-folio" data-folio="${esc(r.carga_folio)}">${esc(r.carga_folio)}</span>${flagChip}</td>
        <td>${esc(contraNombre)}</td>
        <td>${esc(r.carga_producto || '—')}</td>
        <td class="num">${usd(r.monto)}</td>
        <td class="mono">${esc(ERP.fecha(r.aplicacion_fecha))}</td>
        <td>${esc(r.nota || '—')}</td>
        ${puedeEd ? `<td><button class="btn-mini gris" data-desaplicar="${esc(r.aplicacion_id)}">Desaplicar</button></td>` : ''}
      </tr>`;
    }).join('');

    return `${resumen}<div class="tabla-wrap"><table>
      <thead><tr><th>Sentido</th><th>Carga</th><th>Cliente/Proveedor</th><th>Producto</th>
        <th class="num">Monto</th><th>Fecha</th><th>Nota</th>${puedeEd ? '<th></th>' : ''}</tr></thead>
      <tbody>${filas}</tbody>
    </table></div>`;
  }

  function formAplicarHtml(hayCargas) {
    return `<div class="form-erp" style="margin-top:10px">
      <div class="campos">
        <div class="campo ancho"><label>Carga <span class="req">*</span></label><div id="aplCarga"></div>
          ${hayCargas ? '' : '<small style="color:var(--gris);font-size:11px">No se pudo cargar el catálogo de embarques; recarga el panel.</small>'}</div>
        <div class="campo"><label>Monto USD <span class="req">*</span></label>
          <input id="aplMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00"></div>
        <div class="campo ancho"><label>Nota <span class="req">*</span></label>
          <input id="aplNota" type="text" maxlength="200" placeholder="Motivo de la aplicación"></div>
      </div>
      <div class="acciones"><button class="btn-mini" id="aplGuardar"${hayCargas ? '' : ' disabled'}>Aplicar a carga</button></div>
      <div class="aviso" id="aplAviso"></div>
    </div>`;
  }

  function avisoApl(tipo, html) {
    const el = document.getElementById('aplAviso');
    if (!el) return;
    if (!tipo) { el.className = 'aviso'; el.innerHTML = ''; return; }
    el.className = 'aviso visible ' + tipo;
    el.innerHTML = html;
  }

  async function refrescarAplicaciones(movFolio, puedeEd) {
    let rows;
    try { rows = await q('v_movimiento_aplicaciones', `&mov_folio=${ERP.eq(movFolio)}&order=aplicacion_fecha.asc`); }
    catch (e) { rows = { __error: e.message }; }
    const cont = document.getElementById('edAplicaciones');
    if (!cont) return;
    cont.innerHTML = pintarAplicaciones(rows, puedeEd);
    cablearAplicaciones(cont, movFolio, puedeEd);
  }

  function cablearAplicaciones(cont, movFolio, puedeEd) {
    cont.querySelectorAll('.chip-folio[data-folio]').forEach(el =>
      el.addEventListener('click', () => ERP.verCarga(el.dataset.folio)));
    if (!puedeEd) return;
    cont.querySelectorAll('[data-desaplicar]').forEach(b =>
      b.addEventListener('click', () => confirmarDesaplicar(b.dataset.desaplicar, movFolio, puedeEd)));
  }

  async function guardarAplicacion(movFolio, puedeEd) {
    const cargaFolio = comboCargaApl ? comboCargaApl.valorId() : null;
    const monto = num(document.getElementById('aplMonto').value);
    const nota = document.getElementById('aplNota').value.trim();

    if (!cargaFolio) { avisoApl('err', 'Elige una carga de la lista.'); return; }
    if (!(monto > 0)) { avisoApl('err', 'El monto debe ser mayor a cero.'); return; }
    if (!nota) { avisoApl('err', 'La nota es obligatoria.'); return; }

    const btn = document.getElementById('aplGuardar');
    btn.disabled = true;
    avisoApl('warn', 'Aplicando…');
    try {
      const data = await rpc('fn_aplicar_a_carga', {
        p_mov_folio: movFolio, p_carga_folio: cargaFolio, p_monto: monto, p_nota: nota
      });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.toast('ok', esc(r.resultado || 'Aplicación registrada.'));
      document.getElementById('aplMonto').value = '';
      document.getElementById('aplNota').value = '';
      if (comboCargaApl) comboCargaApl.limpiar();
      avisoApl('', '');
      await refrescarAplicaciones(movFolio, puedeEd);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      avisoApl('err', `No se aplicó: ${esc(textoErrorApl(e.message))}`);
    } finally {
      btn.disabled = false;
    }
  }

  function confirmarDesaplicar(aplicacionId, movFolio, puedeEd) {
    const motivo = window.prompt('Motivo para desaplicar (obligatorio):');
    if (motivo === null) return;   // canceló el prompt
    const m = motivo.trim();
    if (!m) { ERP.toast('err', 'El motivo es obligatorio: no se desaplicó.'); return; }
    desaplicar(aplicacionId, m, movFolio, puedeEd);
  }

  async function desaplicar(aplicacionId, motivo, movFolio, puedeEd) {
    try {
      const data = await rpc('fn_desaplicar', { p_aplicacion_id: aplicacionId, p_motivo: motivo });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();
      ERP.toast('ok', esc(r.resultado || 'Aplicación revertida.'));
      await refrescarAplicaciones(movFolio, puedeEd);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) return;
      ERP.toast('err', `No se pudo desaplicar: ${esc(textoErrorApl(e.message))}`);
    }
  }

  async function editarMovimiento(folio) {
    const mov = movimientos.find(m => String(m.folio) === String(folio));
    if (!mov) return;

    ERP.abrirPanel(`Editar movimiento ${esc(folio)}`, esc(mov.cuenta_id || ''), '<div class="skel">Cargando…</div>');

    let tipos, contrapartes, bitacora, aplicaciones, cargasCat;
    try {
      [tipos, contrapartes, bitacora, aplicaciones, cargasCat] = await Promise.all([
        q('v_cat_tipos', '&order=tipo.asc').catch(() => []),   // E50: vista (antes leía la tabla base tipos_movimiento, que 401 a authenticated → el select de tipo salía vacío)
        q('v_catalogo_admin', '&order=nombre.asc'),
        cargarBitacora(mov.folio),
        // Aplicaciones: es un dato primario de esta sección nueva, NO se enmascara con [] — si
        // truena, se muestra su propio errbox dentro de #edAplicaciones (ver pintarAplicaciones).
        q('v_movimiento_aplicaciones', `&mov_folio=${ERP.eq(mov.folio)}&order=aplicacion_fecha.asc`).catch(e => ({ __error: e.message })),
        // Catálogo para el combo de "Aplicar a carga": si falla, el form queda con el aviso ya
        // escrito en formAplicarHtml (nunca se enmascara con un combo vacío sin explicación).
        q('v_carga_detalle').catch(() => [])
      ]);
    } catch (e) {
      ERP.abrirPanel(`Editar movimiento ${esc(folio)}`, '', `<div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>`);
      return;
    }

    const puedeEdApl = ERP.puede('editar');
    const cargasItems = cargasComboItems(cargasCat);

    // Lista de tipos (columna `tipo`); asegura que el tipo actual esté presente aunque falte.
    const listaTipos = [...new Set(tipos.map(t => t.tipo).filter(Boolean))];
    if (mov.tipo && !listaTipos.includes(mov.tipo)) listaTipos.unshift(mov.tipo);

    const ing = num(mov.ingreso), egr = num(mov.egreso);
    const modoIngreso = ing > 0.009;               // si no hay ingreso, es egreso
    const montoInicial = modoIngreso ? ing : Math.abs(egr);

    ERP.abrirPanel(`Editar movimiento ${esc(folio)}`, `Cuenta ${esc(mov.cuenta_id || '—')} · movimiento ${esc(folio)}`, `
      <div class="form-erp">
        <div class="doc-meta-grid">
          <div class="campo"><label>Movimiento</label>
            <div class="campo-fijo">${esc(folio)}<div class="aclara">No editable</div></div></div>
          <div class="campo"><label>Cuenta</label>
            <div class="campo-fijo">${esc(mov.cuenta_id || '—')}<div class="aclara">No editable</div></div></div>
          <div class="campo"><label>Fecha <span class="req">*</span></label>
            <input id="edFecha" type="date" value="${esc(soloFecha(mov.fecha))}"></div>
          <div class="campo"><label>Tipo <span class="req">*</span></label>
            <select id="edTipo">${listaTipos.map(t => `<option value="${esc(t)}"${t === mov.tipo ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
        </div>
        <div class="campo ancho"><label>Contraparte <span class="req">*</span></label><div id="edContra"></div></div>

        <div class="doc-meta-grid">
          <div class="campo"><label>Ingreso / egreso <span class="req">*</span></label>
            <select id="edModo">
              <option value="ingreso"${modoIngreso ? ' selected' : ''}>Ingreso (entra dinero)</option>
              <option value="egreso"${!modoIngreso ? ' selected' : ''}>Egreso (sale dinero)</option>
            </select></div>
          <div class="campo"><label>Importe USD <span class="req">*</span></label>
            <input id="edMonto" class="mono" type="number" step="0.01" min="0.01" value="${esc(montoInicial.toFixed(2))}"></div>
        </div>
        <div class="campo ancho"><label>Descripción <span class="req">*</span></label>
          <input id="edDesc" type="text" maxlength="160" value="${esc(mov.descripcion || '')}"></div>
        <div class="campo ancho"><label>Nota</label>
          <input id="edNota" type="text" maxlength="200" value="${esc(mov.nota || '')}"></div>

        <div class="acciones">
          <button class="btn-mini" id="edGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="edCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="edMovAviso"></div>

        <h4>Aplicaciones</h4>
        <div id="edAplicaciones">${pintarAplicaciones(aplicaciones, puedeEdApl)}</div>
        ${puedeEdApl ? formAplicarHtml(cargasItems.length > 0) : ''}

        <h4>Historial de cambios</h4>
        <div id="edBitacora">${pintarBitacora(bitacora)}</div>
      </div>`);

    // Selección inicial por id (v_estado_cuenta.contraparte_id): se localiza el item exacto
    // en la lista del catálogo; ya no se adivina por el nombre. contraparte_id NULL → combo vacío.
    const contraSel = mov.contraparte_id != null
      ? contrapartes.find(c => c.id === mov.contraparte_id) : null;
    comboContraparteEd = ERP.crearCombo({
      contenedor: document.getElementById('edContra'),
      items: contrapartes.map(c => ({ id: c.id, nombre: c.nombre, alias: c.alias || [] })),
      placeholder: 'Cliente, proveedor, beneficiario…',
      permitirNuevo: false,
      valorInicial: contraSel ? contraSel.nombre : null
    });

    document.getElementById('edCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('edGuardar').addEventListener('click', () => guardarMovimiento(mov));

    cablearAplicaciones(document.getElementById('edAplicaciones'), mov.folio, puedeEdApl);
    if (puedeEdApl) {
      comboCargaApl = ERP.crearCombo({
        contenedor: document.getElementById('aplCarga'),
        items: cargasItems,
        placeholder: 'Folio, PO, cliente o proveedor…',
        permitirNuevo: false
      });
      const btnAplicar = document.getElementById('aplGuardar');
      if (btnAplicar) btnAplicar.addEventListener('click', () => guardarAplicacion(mov.folio, puedeEdApl));
    }
  }

  function pintarBitacora(rows) {
    if (!rows.length) return '<div class="docs-vacio">Sin cambios registrados.</div>';
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>Campo</th><th>Antes → después</th><th>Actor</th><th>Fecha</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${esc(r.campo)}</td>
        <td><span style="color:var(--gris)">${esc(r.valor_ant ?? '—')}</span> → <b>${esc(r.valor_nuevo ?? '—')}</b></td>
        <td>${esc(r.actor_nombre || r.actor || '—')}</td>
        <td class="mono">${esc(fechaHora(r.ts))}</td></tr>`).join('')}</tbody>
    </table></div>`;
  }

  async function cargarBitacora(folio) {
    const { data, error } = await ERP.sb.from('v_bitacora_movimientos')
      .select('campo,valor_ant,valor_nuevo,actor,actor_nombre,ts')
      .eq('folio', folio).order('ts', { ascending: false });
    if (error) return [];
    return data || [];
  }

  async function guardarMovimiento(mov) {
    const v = id => document.getElementById(id).value.trim();
    const fecha = v('edFecha');
    const tipo = document.getElementById('edTipo').value;
    const contraId = comboContraparteEd.valorId();
    const modo = document.getElementById('edModo').value;
    const monto = num(document.getElementById('edMonto').value);
    const descripcion = v('edDesc');
    const nota = v('edNota');
    const btn = document.getElementById('edGuardar');
    document.getElementById('edMovAviso').className = 'aviso';

    if (!fecha) { avisoEd('err', 'La fecha es obligatoria.'); return; }
    if (!tipo) { avisoEd('err', 'Elige un tipo.'); return; }
    if (contraId == null) { avisoEd('err', 'Elige una contraparte de la lista.'); return; }
    if (!(monto > 0)) { avisoEd('err', 'El importe debe ser mayor a cero.'); return; }
    if (!descripcion) { avisoEd('err', 'La descripción es obligatoria.'); return; }

    // Exactamente uno: ingreso positivo o egreso negativo.
    const p_ingreso = modo === 'ingreso' ? Math.abs(monto) : 0;
    const p_egreso = modo === 'egreso' ? -Math.abs(monto) : 0;

    const args = {
      p_folio: mov.folio, p_fecha: fecha, p_tipo: tipo, p_contraparte_id: contraId,
      p_ingreso, p_egreso, p_descripcion: descripcion, p_nota: nota || null
    };

    btn.disabled = true;
    await enviarEdicion(mov, args, false);
    btn.disabled = false;
  }

  async function enviarEdicion(mov, args, forzar) {
    try {
      const data = await rpc('fn_editar_movimiento', { ...args, p_forzar: forzar });
      const r = (data && data[0]) || {};
      ERP.marcarDatosSucios();   // el estado de cuenta de fondo cambió
      const n = num(r.r_cambios);
      avisoEd('ok', `${n === 0 ? 'Sin cambios que guardar' : n === 1 ? '1 campo actualizado' : `${n} campos actualizados`}.` +
        (r.r_advertencia ? `<br><b>Aviso:</b> ${esc(r.r_advertencia)}` : ''));
      // Refresca el historial en caliente.
      const bit = document.getElementById('edBitacora');
      if (bit) bit.innerHTML = pintarBitacora(await cargarBitacora(mov.folio));
    } catch (e) {
      const msg = e.message || '';
      if (ERP.avisarSiPermiso(e)) return;
      if (msg.startsWith('MOV_CON_APLICACIONES')) {
        if (ERP.puede('administrar')) {
          const ok = window.confirm('Este movimiento tiene aplicaciones; editar monto o tipo moverá CxC/CxP. ¿Forzar el cambio?');
          if (ok) { await enviarEdicion(mov, args, true); return; }
          avisoEd('warn', 'Cambio no aplicado: requiere forzar para mover CxC/CxP.');
        } else {
          avisoEd('err', 'Este movimiento tiene aplicaciones; editar el monto o el tipo requiere administrador.');
        }
      } else {
        avisoEd('err', `No se guardó: ${esc(textoError(msg))}`);
      }
    }
  }

  /* ================= Módulo ================= */

  async function render(cont, parametro) {
    const [cuentasSaldo, semanal, mensual, movs, bit] = await Promise.all([
      q('v_saldo_cuentas', '&order=id.asc'),
      q('v_flujo_semanal', '&order=semana.asc').catch(() => []),
      q('v_flujo_caja_mensual', '&order=mes.asc').catch(() => []),
      q('v_estado_cuenta', '&order=fecha.asc').catch(() => []),
      // Log de auditoría: si falla (permiso/vista), el estado de cuenta sigue funcionando
      // y los indicadores simplemente no aparecen.
      q('v_bitacora_movimientos', '&order=ts.desc').catch(() => [])
    ]);

    movimientos = movs;
    bitacora = bit;
    foliosConCambios = new Set(bitacora.map(b => String(b.folio)));
    texto = '';
    hasta = '';
    // Arranca en la cuenta con más movimientos (JPM en la práctica), últimos 90 días.
    const porCuenta = {};
    movs.forEach(m => { porCuenta[m.cuenta_id] = (porCuenta[m.cuenta_id] || 0) + 1; });
    cuentaSel = Object.keys(porCuenta).sort((a, b) => porCuenta[b] - porCuenta[a])[0] || null;
    desde = rangoPorDefecto();

    // Navegación directa a un movimiento (ej. "Aplicado a" del Libro de un proyecto):
    // parametro = 'mov:361'. Si el folio existe, se fuerza SU cuenta y se quitan los filtros
    // de fecha/texto para garantizar que la fila sea visible antes de buscarla y hacer scroll.
    let folioObjetivo = null;
    if (parametro && parametro.startsWith('mov:')) {
      folioObjetivo = parametro.slice(4).trim();
      const movObjetivo = movimientos.find(m => String(m.folio) === folioObjetivo);
      if (movObjetivo) { cuentaSel = movObjetivo.cuenta_id; desde = ''; hasta = ''; }
    }

    cont.innerHTML = `
      ${ERP.puede('capturar') ? `<div class="filtros" style="justify-content:flex-end">
        <button class="btn-mini" id="tesNuevoMov">+ Movimiento</button>
        <button class="btn-mini gris" id="tesRegistrarGasto">+ Registrar gasto</button>
      </div>` : ''}

      <h2 class="sec">Saldo por cuenta</h2>
      <div class="card">${pintarCuentas(cuentasSaldo)}</div>

      <h2 class="sec">Flujo semanal — últimas 6 semanas</h2>
      <div class="card">${pintarFlujoSemanal(semanal)}</div>

      <h2 class="sec">Flujo de caja mensual</h2>
      <div class="card">${pintarFlujoMensual(mensual)}</div>

      <h2 class="sec">Estado de cuenta</h2>
      ${ERP.botonesExportar ? ERP.botonesExportar('Tesoreria', 'Tesorería — Estado de cuenta', '#ecTabla table') : ''}
      ${seccionEstadoCuenta()}

      <h2 class="sec">Historial de cambios</h2>
      <div class="card" id="tesHistorial">${pintarBitacoraGeneral(bitacora)}</div>`;

    const btnGasto = document.getElementById('tesRegistrarGasto');
    if (btnGasto) btnGasto.addEventListener('click', formGasto);
    const btnMov = document.getElementById('tesNuevoMov');
    if (btnMov) btnMov.addEventListener('click', () => ERP.capturarMovimiento({}));

    const histCont = document.getElementById('tesHistorial');
    if (histCont) histCont.querySelectorAll('tr.clic[data-hist]').forEach(el =>
      el.addEventListener('click', () => verHistorial(el.dataset.hist)));

    conectarEstadoCuenta();

    if (ERP.cablearExportar) ERP.cablearExportar(cont);

    if (folioObjetivo) irAMovimiento(folioObjetivo);
  }

  /* Navegación directa a un movimiento del estado de cuenta. render() ya dejó la cuenta y los
     filtros correctos si el movimiento existe; aquí solo se localiza la fila ya pintada, se hace
     scroll y se resalta unos segundos (nunca se deja fija). Si no aparece (folio inexistente,
     o existente pero fuera de lo que se pudo mostrar), se avisa con un toast — no rompe la pantalla. */
  function irAMovimiento(folio) {
    const cuerpo = document.getElementById('ecTabla');
    let fila = document.getElementById('mov-' + folio);
    if (!fila && cuerpo) fila = [...cuerpo.querySelectorAll('[data-folio]')].find(tr => tr.dataset.folio === folio);
    if (!fila) {
      ERP.toast('warn', `No se encontró el movimiento #${esc(folio)} en el estado de cuenta.`);
      return;
    }
    fila.scrollIntoView({ behavior: 'smooth', block: 'center' });
    fila.classList.add('fila-destacada');
    setTimeout(() => fila.classList.remove('fila-destacada'), 2500);
  }

  ERP.registrar('tesoreria', {
    titulo: 'Tesorería',
    descripcion: 'Dónde está el efectivo y cómo se mueve',
    render
  });
})();
