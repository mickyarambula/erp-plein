/* Módulo Cargas — el centro de operación.
   Lista filtrable + ficha de carga con captura en contexto (Fase 2).
   Expone ERP.verCarga(folio) para que Cobranza, Pagos, Finanzas y Flags abran la misma ficha. */

(function () {
  'use strict';
  const { q, rpc, esc, usd, num, norm, fmt, fmt0, pct, semaforo } = ERP;

  const CERRADA = /(entregad|cerrad|liquidad|cancelad|finalizad)/i;

  /* La tabla `cargas` tiene un CHECK constraint con exactamente estos 6 estados
     (confirmado contra el backend el 9-jul-2026). Los 4 primeros forman el pipeline
     lineal; Rechazo y "Falta informacion" son estados de excepción y quedan fuera:
     una carga en esos estados muestra su etiqueta tal cual, sin pipeline.
     Ojo: "Falta informacion" va SIN acento — debe coincidir exacto con el CHECK. */
  const ETAPAS = ['Programada', 'En Camino', 'Entregada', 'Cerrada'];   // solo el pipeline visual (cosmético)

  /* Costos desglosados por concepto para el alta de embarque (fn_crear_carga E36).
     [id de input, etiqueta visible, parámetro de la RPC]. Los parámetros mapean a los
     conceptos exactos del catálogo conceptos_costo en el backend; nunca se manda p_costo
     (mandar el desglose evita todo descuadre). Todos son opcionales. */
  const CAMPOS_COSTO = [
    ['nMateriaPrima', 'Materia prima', 'p_materia_prima'],
    ['nComision', 'Comisión', 'p_comision'],
    ['nAduanas', 'Aduanas', 'p_aduanas'],
    ['nQc', 'In & Out QC', 'p_qc'],
    ['nFletes', 'Fletes', 'p_fletes'],
    ['nCarton', 'Cartón', 'p_carton'],
    ['nOtro', 'Otro', 'p_otro'],
  ];
  const indiceEtapa = estado => ETAPAS.findIndex(e => norm(e) === norm(estado));

  const hoyISO = () => new Date().toISOString().slice(0, 10);

  /* Catálogos. fn_agregar_costo valida p_concepto contra `conceptos_costo`: texto libre
     = rechazo del backend. Ya no viven como constante en el código: se piden a sus vistas
     (ERP.q cachea, así que abrir el formulario dos veces no dispara dos consultas). */
  const catalogo = vista => q(vista, '&order=nombre.asc');

  /** Conceptos válidos según la última lectura del catálogo; se usa para validar antes del RPC. */
  let conceptosCosto = [];

  /* ================= Variedad (E52) =================
     Selector dependiente del producto elegido: v_catalogo_variedades filtra por producto_id,
     nunca se lee la tabla `variedades` directo (regla dura: solo vistas/RPCs). */

  const cargarVariedades = productoId =>
    productoId ? q('v_catalogo_variedades', `&producto_id=${ERP.eq(productoId)}&order=nombre.asc`) : Promise.resolve([]);

  function pintarSelectVariedad(select, variedades, valorInicialId) {
    const vi = valorInicialId != null ? String(valorInicialId) : null;
    select.innerHTML = '<option value="">— sin variedad —</option>' +
      variedades.map(v => `<option value="${esc(v.id)}"${vi === String(v.id) ? ' selected' : ''}>${esc(v.nombre)}</option>`).join('');
  }

  /** Fábrica con contador de petición propio: si el usuario cambia de producto varias veces
      rápido, una respuesta vieja que llega tarde ya no debe pisar la lista del producto actual.
      `valorInicialId` (opcional) precarga la variedad ya asignada (Editar carga, v_carga_detalle.variedad_id). */
  function crearControladorVariedad(select, avisoEl) {
    let reqId = 0;
    async function refrescar(productoId, valorInicialId) {
      const miId = ++reqId;
      select.disabled = true;
      select.innerHTML = '<option value="">— sin variedad —</option>';
      if (!productoId) {
        if (avisoEl) avisoEl.textContent = 'Elige un producto del catálogo para ver sus variedades.';
        return;
      }
      if (avisoEl) avisoEl.textContent = 'Cargando variedades…';
      try {
        const variedades = await cargarVariedades(productoId);
        if (miId !== reqId) return;   // llegó tarde: el producto ya cambió otra vez
        pintarSelectVariedad(select, variedades, valorInicialId);
        select.disabled = false;
        if (avisoEl) avisoEl.textContent = variedades.length ? '' : 'Este producto no tiene variedades capturadas.';
      } catch (e) {
        if (miId !== reqId) return;
        if (avisoEl) avisoEl.textContent = `No se pudieron cargar variedades: ${esc(e.message)}`;
      }
    }
    return { refrescar };
  }

  /* ================= Producto sugerido por contraparte (E55) =================
     Guía SUAVE, no candado: al elegir cliente o proveedor, se destacan/ordenan primero los
     productos que esa contraparte ya mueve (v_contraparte_productos). Si el usuario elige otro
     producto de todos modos, se avisa — nunca se bloquea ni se oculta el resto del catálogo. */

  /** null = sin contraparte elegida (no hay con qué comparar). Set (aunque vacío) = contraparte
      elegida sin historial — ahí SÍ aplica el aviso de "combo nuevo". Un fallo de red no rompe
      la captura: cae a Set vacío (sin destacar, sin bloquear). */
  async function productosDeContraparte(contraparteId, rol) {
    if (!contraparteId) return null;
    try {
      const rows = await q('v_contraparte_productos', `&contraparte_id=${ERP.eq(contraparteId)}&rol=${ERP.eq(rol)}`);
      return new Set(rows.map(r => r.producto_id));
    } catch (_) { return new Set(); }
  }

  /** Estado compartido por los combos de Cliente/Proveedor/Producto de un mismo formulario.
      `destacados()` = unión de lo que mueve el cliente y el proveedor ya elegidos (si alguno lo
      está). `aviso(id)` = texto de "combo nuevo" solo si hay AL MENOS una contraparte elegida y
      el producto no está en su historial; null si no hay nada que avisar. */
  function crearAsesorProducto() {
    return {
      cliente: { nombre: '', set: null },
      proveedor: { nombre: '', set: null },
      destacados() { return new Set([...(this.cliente.set || []), ...(this.proveedor.set || [])]); },
      aviso(productoId) {
        if (productoId == null) return null;
        const falta = [];
        if (this.cliente.set && !this.cliente.set.has(productoId)) falta.push(this.cliente.nombre);
        if (this.proveedor.set && !this.proveedor.set.has(productoId)) falta.push(this.proveedor.nombre);
        if (!falta.length) return null;
        return `Este producto no está en el historial de ${falta.join(' ni de ')} — ¿combo nuevo?`;
      }
    };
  }

  /* ================= Avisos dentro del panel ================= */

  function aviso(id, tipo, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'aviso visible ' + tipo;
    el.innerHTML = html;
  }
  function limpiarAviso(id) {
    const el = document.getElementById(id);
    if (el) { el.className = 'aviso'; el.innerHTML = ''; }
  }

  /* ================= Editar embarque (administrar) — fn_editar_carga ================= */

  // Los 3 valores legítimos de cargas.modalidad (ver CLAUDE.md "MODALIDADES DE NEGOCIO").
  // nuevaCarga() solo ofrece 2 porque una carga nace sin modalidad de comisión; al EDITAR
  // sí hay que poder mostrar/dejar 'comision' en las cargas que ya la tienen (13 hoy).
  const MODALIDAD_EDIT = { margen_fijo: 'Margen fijo', consignacion: 'Consignación', comision: 'Comisión' };

  function igualTxtCarga(a, b) {
    const na = (a === null || a === undefined) ? '' : String(a).trim();
    const nb = (b === null || b === undefined) ? '' : String(b).trim();
    return na === nb;
  }
  function igualNumCarga(a, b) {
    const na = (a === '' || a === null || a === undefined) ? null : Number(a);
    const nb = (b === '' || b === null || b === undefined) ? null : Number(b);
    return na === nb;
  }
  const numOrNullCarga = v => (v === '' || v === null || v === undefined) ? null : Number(v);
  const fISO = f => f ? String(f).slice(0, 10) : '';

  /* v_carga_detalle NO expone cliente_id/proveedor_id/producto_id (solo los nombres), así que
     "cambió" se decide comparando NOMBRES normalizados (mismo criterio que usa el propio combo
     para resolver un alias), no ids. Si el combo no tiene selección (nombre vacío) se manda
     null = no tocar, nunca se manda un id sin que el usuario haya elegido algo explícito.
     Pendiente anotado en PENDIENTES-BACKEND.md: sería más simple si la vista trajera los ids. */
  function armarPayloadEditarCarga(d, f) {
    const igualNombre = (nuevo, orig) => norm(nuevo || '') === norm(orig || '');
    return {
      p_folio: d.folio,
      p_motivo: (f.motivo || '').trim(),
      p_po: igualTxtCarga(f.po, d.po) ? null : (f.po || '').trim(),
      p_f_embarque: igualTxtCarga(f.fEmbarque, fISO(d.f_embarque)) ? null : (f.fEmbarque || null),
      p_ingreso_venta: igualNumCarga(f.ingresoVenta, d.ingreso_venta) ? null : numOrNullCarga(f.ingresoVenta),
      p_modalidad: igualTxtCarga(f.modalidad, d.modalidad) ? null : f.modalidad,
      p_estado: igualTxtCarga(f.estado, d.estado) ? null : f.estado,
      p_cliente_id: (f.clienteNombre && !igualNombre(f.clienteNombre, d.cliente)) ? f.clienteId : null,
      p_proveedor_id: (f.proveedorNombre && !igualNombre(f.proveedorNombre, d.proveedor)) ? f.proveedorId : null,
      p_producto_id: (f.productoNombre && !igualNombre(f.productoNombre, d.producto)) ? f.productoId : null,
      // Esta pantalla no toca la nota de revisión ni fuerza nada: eso vive en Revisiones Pendientes.
      p_nota_revision: null,
      p_forzar: false,
      // Lote (E52): el lote INTERNO (cargas.lote) lo asigna el backend, NO se manda. Solo se editan
      // el lote del productor (texto, mismo patrón que p_po: '' explícito lo limpia) y la fecha de
      // cosecha (mismo patrón que p_f_embarque: NULL = no tocar).
      p_lote_productor: igualTxtCarga(f.loteProductor, d.lote_productor) ? null : (f.loteProductor || '').trim(),
      p_f_cosecha: igualTxtCarga(f.fCosecha, fISO(d.f_cosecha)) ? null : (f.fCosecha || null)
    };
  }

  const textoRpcCarga = data => {
    if (typeof data === 'string') return data;
    const r = (data && data[0]) || {};
    return r.resultado || r.mensaje || null;
  };

  async function abrirEditarCarga(d) {
    const ov = document.createElement('div');
    ov.className = 'modal-ov';
    ov.innerHTML = `<div class="modal-box"><h3 style="margin:0 0 4px">Editar ${esc(d.folio)}</h3>
      <div class="skel">Cargando catálogos…</div></div>`;
    document.body.appendChild(ov);
    const cerrar = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });

    let clientes, proveedores, productos;
    try {
      [clientes, proveedores, productos] = await Promise.all([
        catalogo('v_catalogo_clientes'), catalogo('v_catalogo_proveedores'), catalogo('v_catalogo_productos')
      ]);
    } catch (e) {
      ov.querySelector('.modal-box').innerHTML = `<h3 style="margin:0 0 4px">Editar ${esc(d.folio)}</h3>
        <div class="errbox">No se pudieron leer los catálogos: ${esc(e.message)}</div>
        <div class="acciones"><button class="btn-mini gris" id="eaCerrarErr">Cerrar</button></div>`;
      ov.querySelector('#eaCerrarErr').addEventListener('click', cerrar);
      return;
    }

    const cat = ERP.catalogoEstados();
    const estados = cat ? cat.lista : [];
    const flagAviso = d.revision_pendiente
      ? `<div class="aviso visible warn">⚑ Esta carga tiene una revisión pendiente. Editar aquí <b>no la cierra</b> — resuélvela en Revisiones Pendientes.</div>`
      : '';

    ov.querySelector('.modal-box').innerHTML = `
      <h3 style="margin:0 0 4px">Editar ${esc(d.folio)}</h3>
      <div style="font-size:12px;color:var(--gris);margin-bottom:12px">Solo se guardan los campos que cambies.</div>
      ${flagAviso}
      <div class="form-erp"><div class="campos">
        <div class="campo"><label>P.O.</label><input id="eaPo" type="text" maxlength="40" value="${esc(d.po || '')}"></div>
        <div class="campo"><label>Fecha de embarque</label><input id="eaFecha" type="date" value="${esc(fISO(d.f_embarque))}"></div>
        <div class="campo"><label>Modalidad</label><select id="eaModalidad">
          ${Object.keys(MODALIDAD_EDIT).map(v => `<option value="${v}"${v === d.modalidad ? ' selected' : ''}>${MODALIDAD_EDIT[v]}</option>`).join('')}
        </select></div>
        <div class="campo"><label>Estado</label><select id="eaEstado">
          ${estados.map(i => `<option value="${esc(i.estado)}"${i.estado === d.estado ? ' selected' : ''}>${esc(i.etiqueta)}</option>`).join('')}
        </select></div>
        <div class="campo"><label>Cliente</label><div id="eaCliente"></div></div>
        <div class="campo"><label>Proveedor</label><div id="eaProveedor"></div></div>
        <div class="campo"><label>Producto</label><div id="eaProducto"></div>
          <div class="aviso" id="eaProdAviso"></div></div>
        <div class="campo"><label>Variedad</label>
          <select id="eaVariedad" disabled><option value="">— sin variedad —</option></select>
          <small id="eaVariedadAviso" style="color:var(--gris);font-size:11px;display:block">Cargando variedades…</small></div>
        <div class="campo"><label>Ingreso de venta USD</label>
          <input id="eaVenta" class="mono" type="number" step="0.01" min="0" value="${d.ingreso_venta != null ? esc(d.ingreso_venta) : ''}"></div>
        <div class="campo"><label>Lote (interno)</label>
          <div class="campo-fijo">${esc(d.lote || '—')}<div class="aclara">Lo asigna el sistema; no editable</div></div></div>
        <div class="campo"><label>Lote del productor (cosecha)</label>
          <input id="eaLoteProd" type="text" maxlength="60" value="${esc(d.lote_productor || '')}" placeholder="Opcional"></div>
        <div class="campo"><label>Fecha de cosecha</label>
          <input id="eaFCosecha" type="date" value="${esc(fISO(d.f_cosecha))}"></div>
        <div class="campo ancho"><label>Motivo del cambio <span class="req">*</span></label>
          <input id="eaMotivo" type="text" maxlength="200" placeholder="Queda en bitácora"></div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="eaGuardar">Guardar</button>
        <button class="btn-mini gris" id="eaCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="eaAviso"></div>
      </div>`;

    // Guía suave de producto por contraparte (E55) — mismo mecanismo que Nueva carga.
    const asesorProducto = crearAsesorProducto();
    const eaProdAvisoEl = ov.querySelector('#eaProdAviso');
    function pintarAvisoProductoEa(sel) {
      const txt = (sel && !sel.nuevo) ? asesorProducto.aviso(sel.id) : null;
      if (txt) { eaProdAvisoEl.className = 'aviso visible warn'; eaProdAvisoEl.innerHTML = txt; }
      else { eaProdAvisoEl.className = 'aviso'; eaProdAvisoEl.innerHTML = ''; }
    }
    function refrescarDestacadosProductoEa() {
      comboEaProducto.actualizarItems(productos.map(p => ({ ...p, destacado: asesorProducto.destacados().has(p.id) })));
      pintarAvisoProductoEa({ id: comboEaProducto.valorId(), nuevo: comboEaProducto.esNuevo() });
    }

    const comboEaCliente = ERP.crearCombo({
      contenedor: document.getElementById('eaCliente'), items: clientes,
      placeholder: 'Busca por nombre o alias…', permitirNuevo: false, valorInicial: d.cliente || null,
      alCambiar: async sel => {
        asesorProducto.cliente.nombre = sel ? sel.nombre : '';
        asesorProducto.cliente.set = sel ? await productosDeContraparte(sel.id, 'cliente') : null;
        refrescarDestacadosProductoEa();
      }
    });
    const comboEaProveedor = ERP.crearCombo({
      contenedor: document.getElementById('eaProveedor'), items: proveedores,
      placeholder: 'Busca por nombre o alias… (opcional)', permitirNuevo: false, valorInicial: d.proveedor || null,
      alCambiar: async sel => {
        asesorProducto.proveedor.nombre = sel ? sel.nombre : '';
        asesorProducto.proveedor.set = sel ? await productosDeContraparte(sel.id, 'proveedor') : null;
        refrescarDestacadosProductoEa();
      }
    });
    // Valor con el que abrió el formulario: al guardar solo se manda fn_set_variedad_carga si
    // el valor final difiere de este (evita llamadas innecesarias; v_carga_detalle ya expone
    // la variedad asignada, así que no hay riesgo de borrarla sin querer).
    const variedadInicial = d.variedad_id != null ? String(d.variedad_id) : '';
    const selVariedad = ov.querySelector('#eaVariedad');
    const ctrlVariedad = crearControladorVariedad(selVariedad, ov.querySelector('#eaVariedadAviso'));
    const comboEaProducto = ERP.crearCombo({
      contenedor: document.getElementById('eaProducto'), items: productos,
      placeholder: 'Busca un producto…', permitirNuevo: false, valorInicial: d.producto || null,
      // Cambiar de producto invalida la variedad anterior: se recarga sin preseleccionar nada.
      alCambiar: sel => { ctrlVariedad.refrescar(sel ? sel.id : null); pintarAvisoProductoEa(sel); }
    });
    ctrlVariedad.refrescar(d.producto_id || null, d.variedad_id || null);   // carga inicial: precargada

    // Historial inicial de cliente/proveedor ya elegidos al abrir el formulario (no hace falta
    // que el usuario los retoque para ver el destacado/aviso del producto ya asignado).
    (async () => {
      asesorProducto.cliente.nombre = d.cliente || '';
      asesorProducto.cliente.set = d.cliente_id ? await productosDeContraparte(d.cliente_id, 'cliente') : null;
      asesorProducto.proveedor.nombre = d.proveedor || '';
      asesorProducto.proveedor.set = d.proveedor_id ? await productosDeContraparte(d.proveedor_id, 'proveedor') : null;
      refrescarDestacadosProductoEa();
    })();

    ov.querySelector('#eaCancelar').addEventListener('click', cerrar);
    ov.querySelector('#eaGuardar').addEventListener('click', () =>
      guardarEditarCarga(d, ov, cerrar, comboEaCliente, comboEaProveedor, comboEaProducto, selVariedad, variedadInicial));
  }

  async function guardarEditarCarga(d, ov, cerrar, comboEaCliente, comboEaProveedor, comboEaProducto, selVariedad, variedadInicial) {
    const v = id => ov.querySelector('#' + id).value;
    const setA = (tipo, html) => { const a = ov.querySelector('#eaAviso'); a.className = 'aviso visible ' + tipo; a.innerHTML = html; };

    const motivo = v('eaMotivo').trim();
    if (!motivo) { setA('err', 'El motivo es obligatorio: toda edición queda justificada.'); return; }

    const ventaRaw = v('eaVenta');
    if (ventaRaw !== '' && (Number.isNaN(Number(ventaRaw)) || Number(ventaRaw) < 0)) {
      setA('err', 'El ingreso de venta no es válido (debe ser cero o positivo).');
      return;
    }

    const f = {
      motivo,
      po: v('eaPo'),
      fEmbarque: v('eaFecha'),
      modalidad: v('eaModalidad'),
      estado: v('eaEstado'),
      ingresoVenta: ventaRaw,
      clienteNombre: comboEaCliente.valor(), clienteId: comboEaCliente.valorId(),
      proveedorNombre: comboEaProveedor.valor(), proveedorId: comboEaProveedor.valorId(),
      productoNombre: comboEaProducto.valor(), productoId: comboEaProducto.valorId(),
      loteProductor: v('eaLoteProd'), fCosecha: v('eaFCosecha')
    };

    const btn = ov.querySelector('#eaGuardar');
    btn.disabled = true;
    setA('warn', 'Guardando…');
    try {
      const data = await rpc('fn_editar_carga', armarPayloadEditarCarga(d, f));
      ERP.marcarDatosSucios();
      const texto = textoRpcCarga(data);

      // Variedad (E52): 2º paso, solo si el valor final difiere del que traía la carga al abrir
      // el formulario. La carga YA quedó editada aquí; un error de variedad se avisa pero no
      // revierte lo anterior.
      let variedadFallo = null;
      const variedadFinal = selVariedad.value || '';
      if (variedadFinal !== variedadInicial) {
        const variedadId = variedadFinal ? Number(variedadFinal) : null;
        try { await rpc('fn_set_variedad_carga', { p_folio: d.folio, p_variedad_id: variedadId }); }
        catch (er) { variedadFallo = er.message; }
      }

      cerrar();
      await verFichaClasica(d.folio);
      const avisos = [];
      if (texto) avisos.push(esc(texto));
      if (variedadFallo) avisos.push(`La variedad <b>NO se pudo actualizar</b>: ${esc(variedadFallo)}`);
      aviso('avisoFicha', variedadFallo ? 'warn' : 'ok',
        avisos.length ? `${esc(d.folio)}: ${avisos.join('<br>')}` : `Carga <b>${esc(d.folio)}</b> actualizada.`);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      setA('err', `El ERP rechazó la edición: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Ficha de carga ================= */

  async function verFichaClasica(folio) {
    ERP.abrirPanel(esc(folio), 'Cargando detalle…', '<div class="skel">Cargando carga…</div>');
    try {
      const [det, apls, costos] = await Promise.all([
        q('v_carga_detalle', `&folio=${ERP.eq(folio)}`),
        q('v_carga_aplicaciones', `&carga_folio=${ERP.eq(folio)}&order=fecha.asc`),
        q('v_carga_costos_det', `&carga_folio=${ERP.eq(folio)}`)
      ]);
      if (!det.length) {
        ERP.abrirPanel(esc(folio), '', '<p style="font-size:13px">No existe esa carga. Revisa el folio (ej. P-043).</p>');
        return;
      }
      pintarFicha(det[0], apls, costos);
    } catch (e) {
      ERP.abrirPanel(esc(folio), '', `<div class="errbox">Error al cargar: ${esc(e.message)}</div>`);
    }
  }

  /** Recarga la ficha sin cerrar el panel (tras una escritura). */
  async function refrescarFicha(folio) {
    ERP.marcarDatosSucios();          // el módulo de fondo también quedó viejo
    await verCarga(folio);
  }

  function pintarPipeline(estado) {
    const i = indiceEtapa(estado);
    if (i < 0) {
      // El estado real no coincide con el pipeline propuesto: muéstralo tal cual.
      return `<div class="pipeline-libre">
        <span class="pill ${CERRADA.test(estado || '') ? 'gris' : 'ambar'}">${esc(estado || 'sin estado')}</span>
        <span class="solo-lectura">Estado fuera del pipeline estándar</span>
      </div>`;
    }
    return `<div class="pipeline">${ETAPAS.map((e, j) => {
      const clase = j < i ? 'hecha' : j === i ? 'actual' : '';
      return `<div class="etapa ${clase}">
        <span class="bolita">${j < i ? '✓' : j + 1}</span>
        <span class="nombre">${esc(e)}</span>
        <span class="linea"></span>
      </div>`;
    }).join('')}</div>`;
  }

  function pintarFicha(d, apls, costos) {
    const claseTxt = c => c === 'cobro' ? 'Cobro' : c === 'devolucion' ? 'Devolución' : 'Pago';
    const puedeCapturar = ERP.puede('capturar');
    const puedeEditar = ERP.puede('editar');

    const filasApl = apls.length
      ? apls.map(a => `<tr>
          <td>${esc(ERP.fecha(a.fecha))}</td>
          <td class="mono">${a.mov_folio ? `<span class="chip-folio" data-ir-tesoreria="${esc(a.mov_folio)}" title="Ver en Tesorería">${esc(a.mov_folio)}</span>` : '—'}</td>
          <td>${esc(claseTxt(a.clase))}</td>
          <td>${esc(a.descripcion || '')}</td>
          <td class="num">${usd(a.monto)}</td></tr>`).join('')
      : '<tr><td colspan="5" style="color:var(--gris)">Sin cobros ni pagos aplicados aún.</td></tr>';

    const filasCosto = costos.length
      ? costos.map(c => `<tr>
          <td>${esc(c.concepto)}</td>
          <td style="color:var(--gris)">${esc(c.nota || '')}</td>
          <td class="num">${usd(c.monto)}</td></tr>`).join('')
      : '<tr><td colspan="3" style="color:var(--gris)">Sin costos registrados (posible flag de Sourcing).</td></tr>';

    const margen = num(d.ingreso_venta) - num(d.costo_total);
    const margenPct = num(d.ingreso_venta) > 0.009 ? (margen / num(d.ingreso_venta) * 100) : null;
    const flagActiva = !!d.revision_pendiente;
    const anulada = d.anulado === true;

    /* La UI oculta un botón solo cuando el permiso lo prohíbe (puede_capturar / puede_editar).
       NO se bloquea la captura por tener flag activa: muchas flags de Sourcing se resuelven
       justo capturando el costo que falta. Si el backend decide rechazarlo, se muestra su
       error tal cual — él es la autoridad, no esta pantalla.

       Una carga ANULADA sí bloquea la captura, para cualquier rol: ya no cuenta para nada. */
    const sinPermiso = '<span class="solo-lectura">Sin permiso de captura</span>';
    const anuladaNoCaptura = '<span class="solo-lectura">Carga anulada</span>';

    const botonCosto = anulada ? anuladaNoCaptura
      : puedeCapturar ? '<button class="btn-mini" id="btnFormCosto">+ Agregar costo</button>' : sinPermiso;

    const botonMov = anulada ? anuladaNoCaptura
      : puedeCapturar ? '<button class="btn-mini" id="btnFormMov">+ Registrar cobro/pago</button>' : sinPermiso;

    /* Capturar la venta de una consignación (liquidación del cliente). En consignación el precio
       se asigna al conseguir comprador — antes de eso la carga sale con venta $0.00 (no es un dato
       faltante, es que la venta aún no existe — D-04). Este botón es de capacidad 'editar' (la RPC
       fn_liquidar_consignacion lo es), no 'capturar', y SOLO aplica a consignaciones vivas. */
    const esConsignacion = String(d.modalidad || '').toLowerCase() === 'consignacion';
    const botonLiquidar = (esConsignacion && !anulada && puedeEditar)
      ? '<button class="btn-mini" id="btnFormLiquidar">+ Capturar venta (liquidar consignación)</button>'
      : '';

    const bannerAnulada = anulada ? `
      <div class="banner-anulada">
        <div class="t">⊘ Carga anulada</div>
        <div class="motivo">${esc(d.anulado_motivo || '(sin motivo registrado)')}</div>
        <div class="meta">Anulada por ${esc(d.anulado_por || '—')}${d.anulado_ts ? ` el ${esc(ERP.fecha(d.anulado_ts))}` : ''}
          · No cuenta para finanzas, cobranza ni pagos. Para revertirla, sesión de backend.</div>
      </div>` : '';

    /* Anular es de administrador y no tiene deshacer en la UI: va al final, discreto,
       y con confirmación explícita en dos pasos. */
    const zonaPeligro = (!anulada && ERP.puede('administrar')) ? `
      <div class="zona-peligro">
        <span class="nota">Anular retira la carga de todos los reportes. No hay botón para deshacerlo.</span>
        <button class="btn-mini peligro" id="btnFormAnular">Anular carga</button>
      </div>
      <div id="formAnular"></div>` : '';

    // Botón "Cambiar estado": habilitado solo si el rol tiene alguna transición desde el estado actual.
    const btnEstado = anulada ? '' : `<button class="btn-mini" id="btnCambiarEstado"${ERP.transicionesDisponibles(d.estado).length ? '' : ` disabled title="${esc(ERP.motivoSinTransicion(d.estado))}"`}>Cambiar estado</button>`;

    // "Editar embarque": bypass de administrador sobre P.O./fecha/modalidad/estado/cliente/
    // proveedor/producto/venta — distinto del flujo guiado de "Cambiar estado" (matriz de
    // transiciones). Una carga anulada no se edita (ya no cuenta para nada).
    const btnEditar = (!anulada && ERP.puede('administrar'))
      ? '<button class="btn-mini" id="btnEditarCarga">Editar embarque</button>' : '';

    /* En una carga anulada la flag se conserva como registro de auditoría —por qué se dudó
       de esta carga— pero no se resuelve: ya no cuenta para ningún reporte.
       Mismo criterio que oculta "Agregar costo" y "Registrar cobro/pago". */
    const flagHtml = flagActiva ? `
      <div class="flagbox">
        <div class="t">⚑ Flag ${anulada ? 'registrada' : 'activa'}</div>
        <p>${esc(d.nota_revision || '(sin nota)')}</p>
        ${anulada
          ? '<p style="color:var(--gris);font-size:12px;margin:0">La carga está anulada: la flag queda como registro de auditoría, no hay nada que resolver.</p>'
          : puedeEditar ? `
            <textarea id="txtResol" placeholder="Explica el dato confirmado que resuelve la flag (obligatorio)…"></textarea>
            <button id="btnResol">Resolver flag</button>
            <div class="flag-res" id="resResol"></div>
          ` : '<p style="color:var(--gris);font-size:12px;margin:0">Resolución de flags reservada a quien puede editar.</p>'}
      </div>` : '';

    ERP.abrirPanel(
      `${esc(d.folio)}${d.po ? ` <span style="font-weight:400;color:var(--gris)">· ${esc(d.po)}</span>` : ''}`,
      `${esc(d.modalidad || '—')} · capturó ${esc(d.capturado_por || '—')}${d.capturado_ts ? ' · ' + esc(ERP.fecha(d.capturado_ts)) : ''}`,
      `<div class="${anulada ? 'ficha-anulada' : ''}">
      ${bannerAnulada}
      ${pintarPipeline(d.estado)}
      ${(btnEstado || btnEditar) ? `<div style="margin:4px 0 12px">${btnEstado}${btnEditar}</div>` : ''}

      <div class="det-grid">
        <div class="det"><div class="l">Producto</div><div class="v">${esc(d.producto || '—')}</div></div>
        <div class="det"><div class="l">Proveedor</div><div class="v">${esc(d.proveedor || '—')}</div></div>
        <div class="det"><div class="l">Cliente</div><div class="v">${esc(d.cliente || '—')}</div></div>
        <div class="det"><div class="l">Embarque</div><div class="v mono">${esc(ERP.fecha(d.f_embarque))}${d.dias != null ? ` · ${d.dias}d` : ''}</div></div>
        <div class="det"><div class="l">Venta / Cobrado</div><div class="v mono">${usd(d.ingreso_venta)} / ${usd(d.cobrado)}</div></div>
        <div class="det"><div class="l">Saldo CxC</div><div class="v mono" style="${num(d.saldo_cxc) > 0.009 ? 'color:var(--verde);font-weight:600' : ''}">${usd(d.saldo_cxc)}</div></div>
        <div class="det"><div class="l">Costo / Pagado</div><div class="v mono">${usd(d.costo_total)} / ${usd(d.pagado)}</div></div>
        <div class="det"><div class="l">Saldo CxP</div><div class="v mono" style="${num(d.saldo_cxp) > 0.009 ? 'color:var(--rojo);font-weight:600' : ''}">${usd(d.saldo_cxp)}</div></div>
        <div class="det"><div class="l">Margen bruto</div><div class="v mono ${margen < 0 ? 'neg' : ''}">${usd(margen)}${margenPct != null ? ` · ${fmt(margenPct)}%` : ''}</div></div>
        <div class="det"><div class="l">Utilidad</div><div class="v mono"${d.utilidad == null ? '' : ` style="color:${ERP.utilidadColor(d.utilidad)}"`}>${ERP.utilidadTexto(d.utilidad, d.utilidad_es_estimada, d.utilidad_nota)}</div></div>
        <div class="det"><div class="l">Margen %</div><div class="v mono">${ERP.margenTexto(d.margen_pct)}</div></div>
        <div class="det" id="fichaRespCell"><div class="l">Responsable</div><div class="v">${esc(d.responsable_nombre || '—')}</div></div>
        <div class="det"><div class="l">Lote</div><div class="v mono">${esc(d.lote || '—')}</div></div>
        <div class="det"><div class="l">Lote productor</div><div class="v mono">${esc(d.lote_productor || '—')}</div></div>
        <div class="det"><div class="l">Cosecha</div><div class="v mono">${d.f_cosecha ? esc(ERP.fecha(d.f_cosecha)) : '—'}</div></div>
      </div>

      ${flagHtml}

      ${esConsignacion ? `<div class="seccion-head"><h4>Venta de consignación</h4>${botonLiquidar}</div>
      <div id="formLiquidar"></div>` : ''}

      <div class="seccion-head"><h4>Costos</h4>${botonCosto}</div>
      <div id="formCosto"></div>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Concepto</th><th>Nota</th><th class="num">Monto</th></tr></thead>
        <tbody>${filasCosto}</tbody>
        ${costos.length ? `<tfoot><tr class="total"><td colspan="2">Total costos</td>
          <td class="num">${usd(costos.reduce((s, c) => s + num(c.monto), 0))}</td></tr></tfoot>` : ''}
      </table></div>

      <div class="seccion-head"><h4>Cobros y pagos aplicados</h4>${botonMov}</div>
      <div id="formMov"></div>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Fecha</th><th>Mov.</th><th>Clase</th><th>Descripción</th><th class="num">Monto</th></tr></thead>
        <tbody>${filasApl}</tbody>
      </table></div>

      <div id="facturasCarga" style="margin-top:22px"></div>
      <div id="ventasCarga" style="margin-top:22px"></div>
      <div id="ordenesCarga" style="margin-top:22px"></div>
      <div id="tareasCarga" style="margin-top:22px"></div>

      <h4 style="margin-top:22px">Documentos</h4>
      <div id="docsCarga"></div>

      <div class="aviso" id="avisoFicha"></div>
      </div>
      ${zonaPeligro}`
    );

    /* Los documentos se cargan aparte: son una petición a Storage y no deben
       retrasar el resto de la ficha. Una carga anulada no admite adjuntos nuevos. */
    ERP.documentos.montar(document.getElementById('docsCarga'), {
      entidad: 'carga',
      entidadId: d.folio,
      permitirSubir: !anulada
    });

    // Facturas y órdenes de compra de esta carga. No se generan desde una carga anulada.
    if (ERP.montarFacturasCarga) {
      ERP.montarFacturasCarga(document.getElementById('facturasCarga'), d.folio, !anulada);
    }
    if (ERP.montarVentasCarga) {
      ERP.montarVentasCarga(document.getElementById('ventasCarga'), d.folio);
    }
    if (ERP.montarOrdenesCarga) {
      ERP.montarOrdenesCarga(document.getElementById('ordenesCarga'), d.folio, !anulada);
    }
    if (ERP.montarTareasCarga) {
      ERP.montarTareasCarga(document.getElementById('tareasCarga'), d.folio, !anulada);
    }

    ERP.cablearInfoNota();   // ⓘ de utilidad estimada en la ficha clásica
    montarResponsable(document.getElementById('fichaRespCell'), d.folio, d.responsable, d.responsable_nombre, () => verFichaClasica(d.folio));

    // Folios de movimiento (columna "Mov." de Cobros y pagos aplicados) → Tesorería (E44). Solo
    // los que SÍ traen data-ir-tesoreria: mov_folio null/vacío se pintó como texto plano, sin link.
    document.querySelectorAll('[data-ir-tesoreria]').forEach(el => el.addEventListener('click', () =>
      ERP.irModulo('tesoreria', 'mov:' + el.dataset.irTesoreria)));

    const btnCambEstado = document.getElementById('btnCambiarEstado');
    if (btnCambEstado) btnCambEstado.addEventListener('click', () => abrirCambiarEstado(d.folio, d.estado, () => verFichaClasica(d.folio)));

    const btnEditarCarga = document.getElementById('btnEditarCarga');
    if (btnEditarCarga) btnEditarCarga.addEventListener('click', () => abrirEditarCarga(d));

    const btnCosto = document.getElementById('btnFormCosto');
    if (btnCosto) btnCosto.addEventListener('click', () => abrirFormCosto(d));

    const btnMov = document.getElementById('btnFormMov');
    if (btnMov) btnMov.addEventListener('click', () => abrirFormMov(d));

    const btnLiquidar = document.getElementById('btnFormLiquidar');
    if (btnLiquidar) btnLiquidar.addEventListener('click', () => abrirFormLiquidar(d));

    const btnResol = document.getElementById('btnResol');
    if (btnResol) btnResol.addEventListener('click', () => resolverFlag(d.folio));

    const btnAnular = document.getElementById('btnFormAnular');
    if (btnAnular) btnAnular.addEventListener('click', () => abrirFormAnular(d));
  }

  /* ================= Escritura: agregar costo ================= */

  async function abrirFormCosto(d) {
    const cont = document.getElementById('formCosto');
    if (cont.innerHTML) { cont.innerHTML = ''; return; }   // toggle

    cont.innerHTML = '<div class="form-erp"><div class="skel">Cargando catálogo de conceptos…</div></div>';
    try {
      conceptosCosto = (await catalogo('v_catalogo_conceptos_costo')).map(c => c.nombre);
      if (!conceptosCosto.length) throw new Error('el catálogo vino vacío');
    } catch (e) {
      // Sin catálogo no se puede capturar: el backend rechazaría cualquier texto libre.
      cont.innerHTML = `<div class="form-erp"><div class="aviso visible err">
        No se pudo leer el catálogo de conceptos: ${esc(e.message)}.<br>
        Sin él no se puede agregar un costo — el ERP solo acepta conceptos del catálogo.
      </div></div>`;
      return;
    }

    cont.innerHTML = `<div class="form-erp">
      <div class="campos">
        <div class="campo">
          <label>Concepto <span class="req">*</span></label>
          <select id="cCon">
            <option value="">Elige un concepto…</option>
            ${conceptosCosto.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
          </select>
        </div>
        <div class="campo">
          <label>Monto USD <span class="req">*</span></label>
          <input id="cMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00">
        </div>
        <div class="campo ancho">
          <label>Nota</label>
          <input id="cNota" type="text" placeholder="Opcional — referencia, factura…" maxlength="200">
        </div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="cGuardar">Guardar costo</button>
        <button class="btn-mini gris" id="cCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="cAviso"></div>
    </div>`;

    document.getElementById('cCancelar').addEventListener('click', () => { cont.innerHTML = ''; });
    document.getElementById('cGuardar').addEventListener('click', () => guardarCosto(d));
    document.getElementById('cCon').focus();
  }

  async function guardarCosto(d) {
    const concepto = document.getElementById('cCon').value.trim();
    const monto = Number(document.getElementById('cMonto').value);
    const nota = document.getElementById('cNota').value.trim();
    const btn = document.getElementById('cGuardar');
    limpiarAviso('cAviso');

    if (!conceptosCosto.includes(concepto)) {
      aviso('cAviso', 'err', 'Elige un concepto del catálogo.');
      return;
    }
    if (!(monto > 0)) { aviso('cAviso', 'err', 'El monto debe ser mayor a cero.'); return; }

    btn.disabled = true;
    try {
      const data = await rpc('fn_agregar_costo', {
        p_carga_folio: d.folio, p_concepto: concepto, p_monto: monto, p_nota: nota || null
      });
      const r = (data && data[0]) || {};
      // El backend puede aceptar y aun así advertir algo — no lo escondas.
      if (r.advertencia) aviso('cAviso', 'warn', `Guardado, pero: ${esc(r.advertencia)}`);
      await new Promise(res => setTimeout(res, r.advertencia ? 1400 : 350));
      await refrescarFicha(d.folio);
      aviso('avisoFicha', 'ok', `Costo <b>${esc(concepto)}</b> por ${usd(monto)} agregado.`);
    } catch (e) {
      // El backend es la autoridad (SECURITY DEFINER): si rechaza, dilo tal cual.
      aviso('cAviso', 'err', `El ERP rechazó el costo: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Escritura: liquidar consignación (capturar venta) =================
     fn_liquidar_consignacion(p_folio, p_ingreso_real, p_resolucion, p_estado_final). Asigna el
     precio de venta de una consignación (declara la CxC). El ingreso se reconoce al COBRAR, no
     aquí (D-04/D-11): esto solo registra el precio. `p_estado_final` NULL = NO tocar el estado
     logístico (la carga se queda donde esté); solo 'Entregada'/'Cerrada' lo avanzan — son los
     dos únicos valores que la RPC acepta, contrato fijo (no el catálogo de estados abierto). */
  async function abrirFormLiquidar(d) {
    const cont = document.getElementById('formLiquidar');
    if (cont.innerHTML) { cont.innerHTML = ''; return; }   // toggle

    // Sugerencia de monto: si ya hay una venta declarada, se precarga para editarla; si es 0
    // (sin liquidar) el campo va vacío para que el usuario capture el precio real.
    const ventaPrevia = num(d.ingreso_venta) > 0 ? num(d.ingreso_venta).toFixed(2) : '';

    cont.innerHTML = `<div class="form-erp">
      <div class="campos">
        <div class="campo">
          <label>Monto de venta USD <span class="req">*</span></label>
          <input id="lqMonto" class="mono" type="number" step="0.01" min="0" value="${esc(ventaPrevia)}" placeholder="0.00">
        </div>
        <div class="campo">
          <label>¿Avanzar estado?</label>
          <select id="lqEstado">
            <option value="">Dejar igual (recomendado)</option>
            <option value="Entregada">Marcar Entregada</option>
            <option value="Cerrada">Marcar Cerrada</option>
          </select>
        </div>
        <div class="campo ancho">
          <label>Referencia de la liquidación <span class="req">*</span></label>
          <input id="lqResol" type="text" maxlength="200" placeholder="Ej. Liquidación CRI del 28-jul, factura X">
        </div>
      </div>
      <div class="leyenda" style="margin:2px 0 0">
        Capturar la venta NO cambia dónde está el contenedor; solo registra el precio.
        Cámbialo solo si además ya se entregó/cerró. El cobro se registra aparte, en "Cobros y pagos".
      </div>
      <div class="acciones">
        <button class="btn-mini" id="lqGuardar">Capturar venta</button>
        <button class="btn-mini gris" id="lqCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="lqAviso"></div>
    </div>`;

    document.getElementById('lqCancelar').addEventListener('click', () => { cont.innerHTML = ''; });
    document.getElementById('lqGuardar').addEventListener('click', () => guardarLiquidacion(d));
    document.getElementById('lqMonto').focus();
  }

  async function guardarLiquidacion(d) {
    const montoRaw = document.getElementById('lqMonto').value.trim();
    const resolucion = document.getElementById('lqResol').value.trim();
    // "" = dejar igual → se manda NULL explícito (no cambiar el estado logístico).
    const estadoFinal = document.getElementById('lqEstado').value || null;
    const btn = document.getElementById('lqGuardar');
    limpiarAviso('lqAviso');

    // Monto requerido y >= 0 (la RPC acepta 0). "" parsea a 0 con Number(), así que se valida
    // el string crudo para distinguir "vacío" de "cero capturado a propósito".
    if (montoRaw === '') { aviso('lqAviso', 'err', 'Captura el monto de la venta.'); return; }
    const monto = Number(montoRaw);
    if (Number.isNaN(monto) || monto < 0) { aviso('lqAviso', 'err', 'El monto no es válido (debe ser cero o positivo).'); return; }
    if (!resolucion) { aviso('lqAviso', 'err', 'La referencia de la liquidación es obligatoria.'); return; }

    btn.disabled = true;
    try {
      const data = await rpc('fn_liquidar_consignacion', {
        p_folio: d.folio, p_ingreso_real: monto, p_resolucion: resolucion, p_estado_final: estadoFinal
      });
      const r = (data && data[0]) || {};
      await refrescarFicha(d.folio);
      const msg = r.resultado ? esc(r.resultado) : `Venta de <b>${esc(d.folio)}</b> capturada: ${usd(monto)}.`;
      ERP.toast('ok', msg);
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      aviso('lqAviso', 'err', `El ERP rechazó la liquidación: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Escritura: cobro / pago =================
     Dos pasos: fn_capturar_mov crea el movimiento de banco y devuelve folio_asignado;
     fn_aplicar_fifo lo aplica contra la carga MÁS ANTIGUA pendiente de esa contraparte
     — que puede NO ser esta carga. El resultado se muestra literal, sin maquillarlo.

     p_tipo va SIEMPRE explícito. fn_aplicar_fifo decide cobro/pago por el signo del
     monto, así que el FIFO funcionaría igual con NULL — pero v_kpi_rotacion_cobranza
     filtra `WHERE m.tipo = 'Cliente'`, y un cobro con tipo NULL se aplica bien y
     desaparece del DSO en silencio. */
  const TIPO_MOVIMIENTO = { cobro: 'Cliente', pago: 'Proveedor' };

  let comboCuenta = null;

  async function abrirFormMov(d) {
    const cont = document.getElementById('formMov');
    if (cont.innerHTML) { cont.innerHTML = ''; return; }

    cont.innerHTML = '<div class="form-erp"><div class="skel">Cargando cuentas…</div></div>';
    let cuentas;
    try {
      cuentas = await q('v_catalogo_cuentas', '&order=id.asc');
      if (!cuentas.length) throw new Error('el catálogo vino vacío');
    } catch (e) {
      // Sin catálogo de cuentas no se captura: el RPC rechazaría cualquier valor inventado.
      cont.innerHTML = `<div class="form-erp"><div class="aviso visible err">
        No se pudo leer el catálogo de cuentas: ${esc(e.message)}.<br>
        Sin él no se puede registrar el movimiento.
      </div></div>`;
      return;
    }

    cont.innerHTML = `<div class="form-erp">
      <div class="campos">
        <div class="campo">
          <label>Tipo <span class="req">*</span></label>
          <select id="mTipo">
            <option value="cobro">Cobro (entra dinero del cliente)</option>
            <option value="pago">Pago (sale dinero al proveedor)</option>
          </select>
        </div>
        <div class="campo">
          <label>Cuenta <span class="req">*</span></label>
          <div id="mCuenta"></div>
        </div>
        <div class="campo">
          <label>Fecha <span class="req">*</span></label>
          <input id="mFecha" type="date" value="${hoyISO()}">
        </div>
        <div class="campo">
          <label>Monto USD <span class="req">*</span></label>
          <input id="mMonto" class="mono" type="number" step="0.01" min="0.01" placeholder="0.00">
        </div>
        <div class="campo">
          <label>Contraparte <span class="req">*</span></label>
          <input id="mContra" type="text" value="${esc(d.cliente || '')}" maxlength="120">
        </div>
        <div class="campo ancho">
          <label>Descripción <span class="req">*</span></label>
          <input id="mDesc" type="text" value="Cobro ${esc(d.folio)}" maxlength="160">
        </div>
        <div class="campo ancho">
          <label>Nota</label>
          <input id="mNota" type="text" placeholder="Opcional — referencia del wire, cheque…" maxlength="200">
        </div>
      </div>
      <div class="acciones">
        <button class="btn-mini" id="mGuardar">Capturar y aplicar</button>
        <button class="btn-mini gris" id="mCancelar">Cancelar</button>
      </div>
      <div class="aviso visible warn" id="mAviso">
        El cobro/pago se aplica <b>FIFO</b>: va contra la carga más antigua pendiente de esa
        contraparte, que puede no ser ${esc(d.folio)}. Te diré a cuál se aplicó.
      </div>
    </div>`;

    /* El combo muestra el id de la cuenta (JPM, JEAMS) porque es lo que pide p_cuenta
       y lo que se ve en Tesorería; el nombre y el banco quedan como alias buscables. */
    comboCuenta = ERP.crearCombo({
      contenedor: document.getElementById('mCuenta'),
      items: cuentas.map(c => ({ id: c.id, nombre: c.id, alias: [c.nombre, c.banco].filter(Boolean) })),
      placeholder: 'Busca por id, nombre o banco…',
      permitirNuevo: false,
      valorInicial: cuentas.some(c => c.id === 'JPM') ? 'JPM' : cuentas[0].id
    });

    const tipo = document.getElementById('mTipo');
    tipo.addEventListener('change', () => {
      const esCobro = tipo.value === 'cobro';
      document.getElementById('mContra').value = (esCobro ? d.cliente : d.proveedor) || '';
      document.getElementById('mDesc').value = `${esCobro ? 'Cobro' : 'Pago'} ${d.folio}`;
    });
    document.getElementById('mCancelar').addEventListener('click', () => { cont.innerHTML = ''; });
    document.getElementById('mGuardar').addEventListener('click', () => guardarMov(d));
    document.getElementById('mMonto').focus();
  }

  async function guardarMov(d) {
    const tipo = document.getElementById('mTipo').value;
    const fecha = document.getElementById('mFecha').value;
    const monto = Number(document.getElementById('mMonto').value);
    const contraparte = document.getElementById('mContra').value.trim();
    const descripcion = document.getElementById('mDesc').value.trim();
    const nota = document.getElementById('mNota').value.trim();
    const cuenta = comboCuenta.valor();
    const btn = document.getElementById('mGuardar');

    if (!fecha) { aviso('mAviso', 'err', 'La fecha es obligatoria.'); return; }
    if (!cuenta) { aviso('mAviso', 'err', 'Elige una cuenta de la lista.'); return; }
    if (!(monto > 0)) { aviso('mAviso', 'err', 'El monto debe ser mayor a cero.'); return; }
    if (!contraparte) { aviso('mAviso', 'err', 'La contraparte es obligatoria.'); return; }
    if (!descripcion) { aviso('mAviso', 'err', 'La descripción es obligatoria.'); return; }

    btn.disabled = true;
    aviso('mAviso', 'warn', 'Capturando movimiento…');

    let movFolio;
    try {
      const data = await rpc('fn_capturar_mov', {
        p_fecha: fecha,
        p_descripcion: descripcion,
        p_ingreso: tipo === 'cobro' ? monto : 0,
        p_egreso: tipo === 'pago' ? monto : 0,
        p_contraparte: contraparte,
        p_tipo: TIPO_MOVIMIENTO[tipo],       // 'Cliente' | 'Proveedor' — necesario para el KPI de DSO
        p_nota: nota || null,
        p_cuenta: cuenta                     // el RPC valida contra el catálogo y rechaza lo inventado
      });
      const r = (data && data[0]) || {};
      movFolio = r.folio_asignado;
      if (!movFolio) throw new Error('El ERP no devolvió folio de movimiento.');
      if (r.advertencia) aviso('mAviso', 'warn', `Movimiento ${esc(movFolio)}: ${esc(r.advertencia)}`);
    } catch (e) {
      aviso('mAviso', 'err', `El ERP rechazó el movimiento: ${esc(e.message)}`);
      btn.disabled = false;
      return;
    }

    // Paso 2: aplicar FIFO. Si esto falla, el movimiento YA existe: hay que decirlo.
    try {
      const data = await rpc('fn_aplicar_fifo', { p_mov_folio: movFolio });
      const filas = Array.isArray(data) ? data : [];
      await refrescarFicha(d.folio);

      if (!filas.length) {
        aviso('avisoFicha', 'warn',
          `Movimiento <b>${esc(movFolio)}</b> capturado, pero el FIFO no lo aplicó a ninguna carga.
           Revísalo en Tesorería.`);
        return;
      }
      const detalle = filas.map(f =>
        `<b>${esc(f.carga_folio)}</b>: ${usd(f.monto_aplicado)}${f.resultado ? ` — ${esc(f.resultado)}` : ''}`
      ).join('<br>');
      const tocaEsta = filas.some(f => f.carga_folio === d.folio);
      aviso('avisoFicha', tocaEsta ? 'ok' : 'warn',
        `Movimiento <b>${esc(movFolio)}</b> aplicado:<br>${detalle}` +
        (tocaEsta ? '' : `<br><br>Nota: el FIFO no lo aplicó a ${esc(d.folio)} porque había cargas más antiguas pendientes de ${esc(contraparte)}.`));
    } catch (e) {
      await refrescarFicha(d.folio);
      if (ERP.esPermisoDenegado(e)) {
        aviso('avisoFicha', 'warn',
          `Movimiento <b>${esc(movFolio)}</b> capturado. Tu rol no aplica FIFO: queda pendiente de aplicar por administración.`);
        return;
      }
      aviso('avisoFicha', 'err',
        `El movimiento <b>${esc(movFolio)}</b> SÍ se capturó, pero el FIFO falló: ${esc(e.message)}.<br>
         El dinero está en el banco sin aplicar a ninguna carga. Aplícalo desde el ERP.`);
    }
  }

  /* ================= Escritura: resolver flag ================= */

  async function resolverFlag(folio) {
    const txt = document.getElementById('txtResol').value.trim();
    const res = document.getElementById('resResol');
    const btn = document.getElementById('btnResol');
    if (!txt) {
      res.className = 'flag-res err';
      res.textContent = 'Escribe la resolución: toda baja de flag requiere explicación.';
      return;
    }
    btn.disabled = true;
    try {
      const data = await rpc('fn_resolver_flag_web', { p_folio: folio, p_resolucion: txt });
      const r = (data && data[0]) || {};
      res.className = 'flag-res ok';
      res.textContent = r.resultado || 'Flag resuelto.';
      setTimeout(() => refrescarFicha(folio), 900);
    } catch (e) {
      res.className = 'flag-res err';
      res.textContent = 'El ERP rechazó la resolución: ' + e.message;
      btn.disabled = false;
    }
  }

  /* ================= Escritura: anular carga =================
     Cancelación suave: no borra nada, marca anulado=true. Solo puede_administrar.
     El backend rechaza si la carga ya tiene cobros/pagos aplicados — ese rechazo es
     una regla de negocio, no un fallo: se muestra literal, sin envolverlo en jerga. */

  function abrirFormAnular(d) {
    const cont = document.getElementById('formAnular');
    if (cont.innerHTML) { cont.innerHTML = ''; return; }   // toggle

    cont.innerHTML = `<div class="form-erp peligro">
      <div class="campos">
        <div class="campo ancho">
          <label>Motivo de la anulación <span class="req">*</span></label>
          <textarea id="aMotivo" placeholder="Por qué se anula esta carga. Queda registrado con tu nombre y la fecha."></textarea>
        </div>
      </div>
      <div class="acciones">
        <button class="btn-mini confirmar-peligro" id="aConfirmar">Confirmar anulación de ${esc(d.folio)}</button>
        <button class="btn-mini gris" id="aCancelar">Cancelar</button>
      </div>
      <div class="aviso" id="aAviso"></div>
    </div>`;

    document.getElementById('aCancelar').addEventListener('click', () => { cont.innerHTML = ''; });
    document.getElementById('aConfirmar').addEventListener('click', () => anularCarga(d));
    document.getElementById('aMotivo').focus();
  }

  async function anularCarga(d) {
    const motivo = document.getElementById('aMotivo').value.trim();
    const btn = document.getElementById('aConfirmar');
    limpiarAviso('aAviso');

    if (!motivo) {
      aviso('aAviso', 'err', 'El motivo es obligatorio: toda anulación queda justificada.');
      return;
    }

    btn.disabled = true;
    try {
      const data = await rpc('fn_anular_carga', { p_folio: d.folio, p_motivo: motivo });
      const r = (data && data[0]) || {};
      await refrescarFicha(d.folio);   // marca datos sucios y repinta con el banner
      aviso('avisoFicha', 'ok', r.resultado
        ? `${esc(d.folio)}: ${esc(r.resultado)}`
        : `Carga <b>${esc(d.folio)}</b> anulada.`);
    } catch (e) {
      // Ej.: "esta carga ya tiene movimientos aplicados" o falta de permiso.
      // Es una decisión del backend, no un bug: llega íntegra a la pantalla.
      aviso('aAviso', 'err', `No se anuló: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Escritura: nueva carga ================= */

  let comboCli = null, comboProv = null, comboProd = null;

  /** Busca una carga existente con el mismo PO (exacto, sin distinguir mayúsculas). */
  function poDuplicado(po) {
    const t = String(po || '').trim().toLowerCase();
    if (!t) return null;
    return cargas.find(c => String(c.po || '').trim().toLowerCase() === t) || null;
  }

  function revisarPo() {
    const dup = poDuplicado(document.getElementById('nPo').value);
    const el = document.getElementById('nPoAviso');
    if (!el) return;
    if (!dup) { el.className = 'aviso'; el.innerHTML = ''; return; }
    // Aviso, no bloqueo: a veces un cliente reusa su referencia.
    el.className = 'aviso visible warn';
    el.innerHTML = `Ya existe una carga con este PO: <b>${esc(dup.folio)}</b>
      (${esc(dup.cliente || 'sin cliente')}, ${esc(ERP.fecha(dup.f_embarque))}).
      Puedes continuar de todos modos.`;
  }

  async function nuevaCarga() {
    ERP.abrirPanel('Nueva carga', 'Se creará con folio automático',
      '<div class="skel">Cargando catálogos…</div>');

    let clientes, proveedores, productos, socios, programas;
    try {
      [clientes, proveedores, productos, , socios, programas] = await Promise.all([
        catalogo('v_catalogo_clientes'),
        catalogo('v_catalogo_proveedores'),
        catalogo('v_catalogo_productos'),
        ERP.cargarEstados(),   // catálogo de estados para el <select> (no hardcodear la lista)
        sociosAsignables(),
        q('v_programas_comerciales', '&order=etiqueta.asc')   // no tiene columna `nombre`: no usar catalogo()
      ]);
    } catch (e) {
      ERP.abrirPanel('Nueva carga', '', `<div class="errbox">
        No se pudieron leer los catálogos: ${esc(e.message)}<br>Intenta de nuevo.</div>`);
      return;
    }

    ERP.abrirPanel('Nueva carga', 'Se creará con folio automático', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho"><label>Desde programa <span style="font-weight:400;color:var(--gris)">(opcional — precarga cliente/proveedor/producto/modalidad; todo se puede editar después)</span></label>
            <select id="nPrograma"><option value="">— Ninguno, captura manual —</option>${(programas || []).map(p => `<option value="${esc(p.codigo)}">${esc(p.codigo)} — ${esc(p.etiqueta)}</option>`).join('')}</select>
            <div id="nProgramaInfo"></div></div>
          <div class="campo"><label>PO <span class="req" id="nPoReq">*</span></label>
            <input id="nPo" type="text" maxlength="40" placeholder="PO-1234">
            <small id="nPoHint" style="display:none;color:var(--gris);font-size:11px">Sin P.O. todavía: se registra como intención de carga y NO cuenta como embarque hasta confirmarla.</small></div>
          <div class="campo"><label>Producto <span class="req">*</span></label>
            <div id="nProd"></div>
            <div class="aviso" id="nProdAviso"></div></div>
          <div class="campo"><label>Variedad</label>
            <select id="nVariedad" disabled><option value="">— sin variedad —</option></select>
            <small id="nVariedadAviso" style="color:var(--gris);font-size:11px">Elige un producto del catálogo para ver sus variedades.</small></div>
          <div class="campo ancho"><div class="aviso" id="nPoAviso"></div></div>
          <div class="campo"><label>Proveedor <span class="req">*</span></label>
            <div id="nProv"></div></div>
          <div class="campo"><label>Cliente <span class="req">*</span></label>
            <div id="nCli"></div></div>
          <div class="campo"><label>Estado</label>
            <select id="nEstado">
              ${((ERP.catalogoEstados() || { lista: [] }).lista).map(i => `<option value="${esc(i.estado)}"${norm(i.estado) === 'programada' ? ' selected' : ''}>${esc(i.etiqueta)}</option>`).join('')}
            </select></div>
          <div class="campo"><label>Modalidad</label>
            <select id="nMod">
              <option value="margen_fijo">Margen fijo</option>
              <option value="consignacion">Consignación</option>
              <option value="comision">Comisión</option>
            </select></div>
          <div class="campo"><label>Responsable</label>
            <select id="nResp"><option value="">— Nadie</option>${(socios || []).map(s => `<option value="${esc(s.socio_codigo)}">${esc(s.nombre)}</option>`).join('')}</select></div>
          <div class="campo"><label>Fecha de embarque <span class="req">*</span></label>
            <input id="nFecha" type="date" value="${hoyISO()}"></div>
          <div class="campo"><label>Entrega programada</label>
            <input id="nFEntrega" type="date" placeholder="opcional">
            <small style="color:var(--gris);font-size:11px">Estimada; la llegada real se confirma después desde el Expediente.</small></div>
          <div class="campo"><label>Ingreso de venta USD</label>
            <input id="nVenta" class="mono" type="number" step="0.01" min="0" value="0"></div>
          <div class="campo ancho"><label style="color:var(--gris);font-weight:600">Costos por concepto <span style="font-weight:400">(todos opcionales; captura los que apliquen)</span></label></div>
          ${CAMPOS_COSTO.map(([id, label]) => `<div class="campo"><label>${esc(label)}</label>
            <input id="${id}" class="mono costo-in" type="number" step="0.01" min="0" placeholder="0.00"></div>`).join('')}
          <div class="campo ancho"><label>Total de costos <span style="font-weight:400;color:var(--gris)">(informativo, lo calcula el sistema)</span></label>
            <div id="nCostoTotal" class="mono" style="font-weight:700;font-size:15px">$0.00</div></div>
          <div class="campo"><label>Cajas</label>
            <input id="nCajas" class="mono" type="number" step="1" min="1" placeholder="opcional"></div>
          <div class="campo"><label>Pallets</label>
            <input id="nPallets" class="mono" type="number" step="1" min="1" placeholder="opcional"></div>
          <div class="campo ancho"><label>Nota</label>
            <textarea id="nNota" placeholder="Contexto de la carga, dudas, referencias…"></textarea></div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="nGuardar">Crear carga</button>
          <button class="btn-mini gris" id="nCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="nAviso"></div>
      </div>
      <div class="leyenda">
        Elige cliente, proveedor y producto del catálogo — puedes buscar por su alias.
        Si de verdad es nuevo, usa <b>+ Nuevo</b> y el texto se manda tal cual: el ERP lo
        resolverá o levantará una flag.<br>
        En consignación el ingreso se reconoce al liquidar el cliente, no al embarcar:
        deja el ingreso de venta en 0 si aún no hay liquidación.<br>
        El precio por caja lo calcula el sistema; no se captura.<br>
        El <b>lote</b> se asignará automáticamente al crear la carga (el lote del productor y la
        fecha de cosecha se capturan después, desde la ficha, cuando se tengan).
      </div>`);

    const asesorProducto = crearAsesorProducto();
    const nProdAvisoEl = document.getElementById('nProdAviso');

    function pintarAvisoProducto(sel) {
      const txt = (sel && !sel.nuevo) ? asesorProducto.aviso(sel.id) : null;
      if (txt) { nProdAvisoEl.className = 'aviso visible warn'; nProdAvisoEl.innerHTML = txt; }
      else { nProdAvisoEl.className = 'aviso'; nProdAvisoEl.innerHTML = ''; }
    }
    function refrescarDestacadosProducto() {
      comboProd.actualizarItems(productos.map(p => ({ ...p, destacado: asesorProducto.destacados().has(p.id) })));
      pintarAvisoProducto({ id: comboProd.valorId(), nuevo: comboProd.esNuevo() });
    }

    comboCli = ERP.crearCombo({
      contenedor: document.getElementById('nCli'), items: clientes,
      placeholder: 'Busca por nombre o alias…', permitirNuevo: true, etiquetaNuevo: 'cliente',
      alCambiar: async sel => {
        asesorProducto.cliente.nombre = sel ? sel.nombre : '';
        asesorProducto.cliente.set = (sel && !sel.nuevo) ? await productosDeContraparte(sel.id, 'cliente') : null;
        refrescarDestacadosProducto();
      }
    });
    comboProv = ERP.crearCombo({
      contenedor: document.getElementById('nProv'), items: proveedores,
      placeholder: 'Busca por nombre o alias…', permitirNuevo: true, etiquetaNuevo: 'proveedor',
      alCambiar: async sel => {
        asesorProducto.proveedor.nombre = sel ? sel.nombre : '';
        asesorProducto.proveedor.set = (sel && !sel.nuevo) ? await productosDeContraparte(sel.id, 'proveedor') : null;
        refrescarDestacadosProducto();
      }
    });
    const ctrlVariedad = crearControladorVariedad(document.getElementById('nVariedad'), document.getElementById('nVariedadAviso'));
    comboProd = ERP.crearCombo({
      contenedor: document.getElementById('nProd'), items: productos,
      placeholder: 'Busca un producto…', permitirNuevo: true, etiquetaNuevo: 'producto',
      alCambiar: sel => { ctrlVariedad.refrescar(sel ? sel.id : null); pintarAvisoProducto(sel); }
    });

    /* "Desde programa" (E55): bundle de precarga de v_programa_captura. Es precarga, NO candado
       — cada campo que llena sigue siendo editable normalmente, y elegir "Ninguno" o otro
       programa después simplemente vuelve a precargar por encima. */
    const selPrograma = document.getElementById('nPrograma');
    const programaInfoEl = document.getElementById('nProgramaInfo');
    let programaReqId = 0;
    selPrograma.addEventListener('change', async () => {
      const codigo = selPrograma.value;
      const miId = ++programaReqId;
      if (!codigo) { programaInfoEl.innerHTML = ''; return; }
      programaInfoEl.innerHTML = '<div class="skel" style="margin-top:6px">Cargando programa…</div>';
      let filas;
      try {
        filas = await q('v_programa_captura', `&codigo=${ERP.eq(codigo)}`);
      } catch (e) {
        if (miId !== programaReqId) return;
        programaInfoEl.innerHTML = `<div class="errbox" style="margin-top:6px">No se pudo leer el programa: ${esc(e.message)}</div>`;
        return;
      }
      if (miId !== programaReqId) return;   // el usuario ya cambió de programa otra vez
      const pr = filas && filas[0];
      if (!pr) {
        programaInfoEl.innerHTML = '<div class="errbox" style="margin-top:6px">El programa no tiene datos de captura.</div>';
        return;
      }

      // Cliente / Proveedor: se precargan Y se recalcula su historial de productos ANTES de
      // tocar el combo de producto (si no, el aviso de "combo nuevo" podría dispararse en falso
      // contra un destacado que todavía no llegó).
      if (pr.cliente_id) {
        comboCli.seleccionar({ id: pr.cliente_id, nombre: pr.cliente });
        asesorProducto.cliente.nombre = pr.cliente || '';
        asesorProducto.cliente.set = await productosDeContraparte(pr.cliente_id, 'cliente');
      }
      if (pr.proveedor_id) {
        comboProv.seleccionar({ id: pr.proveedor_id, nombre: pr.proveedor });
        asesorProducto.proveedor.nombre = pr.proveedor || '';
        asesorProducto.proveedor.set = await productosDeContraparte(pr.proveedor_id, 'proveedor');
      }
      if (miId !== programaReqId) return;
      if (pr.modalidad) document.getElementById('nMod').value = pr.modalidad;
      refrescarDestacadosProducto();

      // Producto: 1 solo → se precarga directo; varios → se destacan para elegir entre ESOS
      // (no se restringe el resto del catálogo: sigue siendo precarga, no candado).
      const prods = Array.isArray(pr.productos) ? pr.productos : [];
      if (prods.length === 1) {
        comboProd.seleccionar(prods[0]);
      } else if (prods.length > 1) {
        const idsPrograma = new Set(prods.map(p => p.id));
        comboProd.actualizarItems(productos.map(p => ({ ...p, destacado: asesorProducto.destacados().has(p.id) || idsPrograma.has(p.id) })));
        comboProd.limpiar();
        pintarAvisoProducto(null);
      }

      // Contexto informativo — v_programa_captura no se manda a fn_crear_carga (que no tiene
      // parámetros para días de crédito ni direcciones); esto es solo para que el capturista
      // vea de un vistazo los términos y direcciones habituales del programa.
      const info = [];
      if (pr.cliente_dias != null) info.push(`Términos del cliente: NET ${esc(pr.cliente_dias)}`);
      const dirCliente = [pr.cliente_dir_fact, pr.cliente_dir_envio, [pr.cliente_ciudad, pr.cliente_pais].filter(Boolean).join(', ')]
        .filter(v => v && String(v).trim());
      if (dirCliente.length) info.push(`Cliente: ${dirCliente.map(esc).join(' · ')}`);
      const dirProveedor = [pr.proveedor_dir, [pr.proveedor_ciudad, pr.proveedor_pais].filter(Boolean).join(', ')]
        .filter(v => v && String(v).trim());
      if (dirProveedor.length) info.push(`Proveedor: ${dirProveedor.map(esc).join(' · ')}`);
      if (pr.termino_proveedor) info.push(`Término pactado con proveedor: ${esc(pr.termino_proveedor)}`);
      if (pr.venta_tipica_carga != null || pr.cajas_tipicas_carga != null) {
        info.push(`Típico por embarque: ${pr.venta_tipica_carga != null ? usd(pr.venta_tipica_carga) : '—'}` +
          (pr.cajas_tipicas_carga != null ? ` · ${esc(pr.cajas_tipicas_carga)} cajas` : ''));
      }
      programaInfoEl.innerHTML = info.length ? `<div class="leyenda" style="margin-top:6px">${info.join('<br>')}</div>` : '';
    });

    const po = document.getElementById('nPo');
    let tempoPo;
    po.addEventListener('input', () => { clearTimeout(tempoPo); tempoPo = setTimeout(revisarPo, 200); });
    po.addEventListener('blur', revisarPo);

    // P.O. obligatorio salvo estados con exige_po=false (Por Confirmar): ahí muestra la leyenda.
    const selEstado = document.getElementById('nEstado');
    const actualizarPo = () => {
      const exige = ERP.estadoInfo(selEstado.value).exige_po !== false;
      document.getElementById('nPoReq').style.display = exige ? '' : 'none';
      document.getElementById('nPoHint').style.display = exige ? 'none' : '';
    };
    selEstado.addEventListener('change', actualizarPo);
    actualizarPo();

    const recalcCosto = () => {
      const tot = CAMPOS_COSTO.reduce((s, [id]) => s + (Number(document.getElementById(id).value) || 0), 0);
      document.getElementById('nCostoTotal').textContent = usd(tot);
    };
    CAMPOS_COSTO.forEach(([id]) => document.getElementById(id).addEventListener('input', recalcCosto));
    recalcCosto();

    document.getElementById('nCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('nGuardar').addEventListener('click', guardarNuevaCarga);
    po.focus();
  }

  async function guardarNuevaCarga() {
    const v = id => document.getElementById(id).value.trim();
    const po = v('nPo'), fecha = v('nFecha'), nota = v('nNota');
    const cliente = comboCli.valor(), proveedor = comboProv.valor(), producto = comboProd.valor();
    const venta = Number(v('nVenta') || 0);
    const cajasRaw = v('nCajas');
    const palletsRaw = v('nPallets');
    const fEntrega = v('nFEntrega');
    const btn = document.getElementById('nGuardar');
    limpiarAviso('nAviso');

    const estadoSel = document.getElementById('nEstado').value;
    const exigePo = ERP.estadoInfo(estadoSel).exige_po !== false;
    const faltan = [];
    if (exigePo && !po) faltan.push('PO');
    if (!producto) faltan.push('producto');
    if (!proveedor) faltan.push('proveedor');
    if (!cliente) faltan.push('cliente');
    if (!fecha) faltan.push('fecha de embarque');
    if (faltan.length) {
      /* Un combo con texto escrito pero sin elegir devuelve null: el texto a medias no
         es un valor. Se dice explícito para que no parezca que el campo está vacío. */
      const aMedias = [
        [comboCli, 'cliente'], [comboProv, 'proveedor'], [comboProd, 'producto']
      ].filter(([c]) => !c.valor() && c.textoCrudo()).map(([, n]) => n);
      aviso('nAviso', 'err', `Falta: ${faltan.join(', ')}.` + (aMedias.length
        ? `<br>Elige ${aMedias.join(' y ')} de la lista, o usa <b>+ Nuevo</b> si no está en el catálogo.`
        : ''));
      return;
    }
    if (venta < 0) { aviso('nAviso', 'err', 'El ingreso de venta no puede ser negativo.'); return; }
    /* Costos desglosados: se manda SOLO el desglose (nunca p_costo), con los conceptos que
       tengan valor > 0. Si van todos vacíos la carga nace con flag "falta costo" (esperado). */
    const costos = {};
    for (const [id, label, param] of CAMPOS_COSTO) {
      const raw = document.getElementById(id).value.trim();
      if (raw === '') continue;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) { aviso('nAviso', 'err', `El costo "${label}" no es válido (debe ser cero o positivo).`); return; }
      if (n > 0) costos[param] = n;
    }
    // Cajas es opcional; si se captura debe ser entero > 0. Vacío = NULL (no se manda dato).
    let cajas = null;
    if (cajasRaw !== '') {
      cajas = Number(cajasRaw);
      if (!Number.isInteger(cajas) || cajas <= 0) {
        aviso('nAviso', 'err', 'Las cajas, si se capturan, deben ser un entero mayor a cero.'); return;
      }
    }
    // Pallets: opcional, entero > 0 (el backend rechaza <= 0).
    let pallets = null;
    if (palletsRaw !== '') {
      pallets = Number(palletsRaw);
      if (!Number.isInteger(pallets) || pallets <= 0) {
        aviso('nAviso', 'err', 'Los pallets, si se capturan, deben ser un entero mayor a cero.'); return;
      }
    }
    // Fecha de entrega: opcional; validamos aquí que no sea anterior al embarque (el backend
    // también lo rechaza, pero así el aviso es claro y no depende del error del servidor).
    // Las fechas ISO YYYY-MM-DD comparan cronológicamente como texto.
    if (fEntrega && fecha && fEntrega < fecha) {
      aviso('nAviso', 'err', 'La fecha de entrega no puede ser anterior a la de embarque.'); return;
    }

    btn.disabled = true;
    try {
      const data = await rpc('fn_crear_carga', {
        p_po: po || null, p_proveedor: proveedor, p_cliente: cliente, p_producto: producto,
        p_estado: estadoSel,
        p_modalidad: document.getElementById('nMod').value,
        p_f_embarque: fecha, p_ingreso_venta: venta, p_nota: nota || null,
        p_cajas: cajas, p_pallets: pallets, p_f_entrega: fEntrega || null,
        ...costos
      });
      const r = (data && data[0]) || {};
      if (!r.folio) throw new Error('El ERP no devolvió el folio de la carga.');

      const avisos = [];
      // Responsable opcional: 2º paso. Si falla, la carga YA se creó (no se revierte): se avisa.
      const respVal = (document.getElementById('nResp') || {}).value || '';
      if (respVal) {
        try { await rpc('fn_asignar_responsable', { p_folio: r.folio, p_socio: respVal, p_nota: null }); }
        catch (er) { avisos.push('La carga se creó, pero <b>quedó SIN responsable</b> (' + esc(er.message) + '). Asígnalo desde el Expediente.'); }
      }
      // Variedad (E52) opcional: 2º paso, igual que responsable. Vacío = no se manda.
      const variedadVal = (document.getElementById('nVariedad') || {}).value || '';
      if (variedadVal) {
        try { await rpc('fn_set_variedad_carga', { p_folio: r.folio, p_variedad_id: Number(variedadVal) }); }
        catch (er) { avisos.push('La carga se creó, pero la <b>variedad NO se pudo asignar</b> (' + esc(er.message) + '). Asígnala desde la ficha.'); }
      }

      ERP.marcarDatosSucios();
      if (r.con_flag) avisos.push('La carga quedó <b>con flag activa</b>: revísala antes de capturar más.');
      if (r.advertencias) avisos.push(esc(r.advertencias));

      if (avisos.length) {
        aviso('nAviso', 'warn', `Carga <b>${esc(r.folio)}</b> creada.<br>${avisos.join('<br>')}`);
        setTimeout(() => verCarga(r.folio), 1800);
      } else {
        await verCarga(r.folio);
        aviso('avisoFicha', 'ok', `Carga <b>${esc(r.folio)}</b> creada.`);
      }
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      aviso('nAviso', 'err', `El ERP rechazó la carga: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Lista ================= */

  let cargas = [];
  let filtroEstado = 'todas';
  let filtroTexto = '';
  let sortUtil = null;    // null = orden base; 'desc' | 'asc' = ordenar por Utilidad
  let sortFecha = null;   // null = orden base (f_embarque DESC, ya aplicado al arreglo); 'asc' | 'desc' = override
  let rangoDesde = '';    // filtro de rango de fechas sobre f_embarque — acumulativo con chips y búsqueda
  let rangoHasta = '';
  let tempoBusca;         // debounce del buscador (compartido entre repintados de la barra de filtros)
  let cxcMap = new Map();   // folio → fila de v_cxc (para el chip de estatus de cobro)
  let programaMap = new Map();   // folio → {codigo, etiqueta} (E47/E47-C, para el chip "PC-0XX")
  let cxcOk = false;        // false si el fetch de v_cxc falló → la lista funciona sin chips
  let agendaColapsada = false;   // colapso de la franja "Agenda de la semana", recordado en sesión (NO localStorage)
  let _sociosCache = null;       // v_socios_asignables cacheado (selector de responsable)


  /* Pertenencia a un chip de cobro. "parcial" en el FILTRO = tiene abono parcial (cobrado>0 y
     saldo>0), esté vencida o no → se traslapa con "vencido" a propósito (son preguntas distintas).
     Los demás chips filtran por el `clave` del estatus. */
  function enCobro(c, clave) {
    const cx = cxcMap.get(String(c.folio));
    return clave === 'parcial'
      ? !!cx && num(cx.cobrado) > 0.009 && num(cx.saldo_cxc) > 0.009
      : ERP.estatusCobro(cx).clave === clave;
  }

  const FILTROS_ESPECIALES = ['todas', 'activas', 'flag', 'anuladas'];

  /* Filtro de rango de fechas sobre f_embarque. Sin rango activo (ambos vacíos) = pasa todo.
     Una carga sin f_embarque (ej. "Por Confirmar") no cae en ningún rango explícito: se excluye
     solo cuando el rango SÍ está activo, nunca cuando está en "Todo". */
  function enRango(c) {
    if (!rangoDesde && !rangoHasta) return true;
    const f = String(c.f_embarque || '').slice(0, 10);
    if (!f) return false;
    if (rangoDesde && f < rangoDesde) return false;
    if (rangoHasta && f > rangoHasta) return false;
    return true;
  }

  // Fecha "hoy" en LOCAL (no UTC): toISOString() cruzaría el día después de las ~17-18h en México,
  // el mismo bug de zona horaria que ya se corrigió en el backend (fn_hoy vs CURRENT_DATE). Los
  // atajos de rango son cálculo cliente puro (no tocan Supabase), pero se hacen bien desde el inicio.
  const pad2 = n => String(n).padStart(2, '0');
  const isoYMD = (y, m, day) => `${y}-${pad2(m + 1)}-${pad2(day)}`;
  const hoyLocal = () => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; };
  function rangoEsteMes() {
    const { y, m } = hoyLocal();
    return [isoYMD(y, m, 1), isoYMD(y, m, new Date(y, m + 1, 0).getDate())];
  }
  function rangoMesPasado() {
    const { y, m } = hoyLocal();
    const mp = m === 0 ? 11 : m - 1, yp = m === 0 ? y - 1 : y;
    return [isoYMD(yp, mp, 1), isoYMD(yp, mp, new Date(yp, mp + 1, 0).getDate())];
  }
  function rangoUlt30() {
    const hoy = new Date();
    const desde = new Date(hoy); desde.setDate(desde.getDate() - 29);
    const f = d => isoYMD(d.getFullYear(), d.getMonth(), d.getDate());
    return [f(desde), f(hoy)];
  }

  function filtradas() {
    const t = norm(filtroTexto);
    // Filtro por un estado concreto (operativo o "Por Confirmar"): match exacto, sin exclusiones.
    const esEstadoEspecifico = !FILTROS_ESPECIALES.includes(filtroEstado) && !filtroEstado.startsWith('cobro:') && !filtroEstado.startsWith('modalidad:');
    return cargas.filter(c => {
      if (filtroEstado === 'anuladas') {
        if (!c.anulado) return false;
      } else {
        if (c.anulado) return false;   // toda vista operativa excluye anuladas
        if (esEstadoEspecifico) {
          if (c.estado !== filtroEstado) return false;   // incluye poder ver "Por Confirmar" a propósito
        } else {
          // 'todas' / 'activas' / 'flag' / 'cobro:*' / 'modalidad:*': la vista base son embarques
          // que CUENTAN. Por Confirmar (cuenta_como_embarque=false) solo se ve con su propio chip.
          if (ERP.estadoInfo(c.estado).cuenta_como_embarque === false) return false;
          if (filtroEstado === 'activas' && CERRADA.test(c.estado || '')) return false;
          if (filtroEstado === 'flag' && !c.revision_pendiente) return false;
          if (filtroEstado.startsWith('cobro:') && !enCobro(c, filtroEstado.slice(6))) return false;
          // "En consignación": TODAS las de modalidad='consignacion' (liquidadas y sin liquidar).
          // Conjunto DISTINTO de 'cobro:sin_liquidar' a propósito — no unificar ni comparar conteos.
          if (filtroEstado.startsWith('modalidad:') && c.modalidad !== filtroEstado.slice('modalidad:'.length)) return false;
        }
      }
      if (!enRango(c)) return false;   // rango de fechas: acumulativo con el chip y la búsqueda
      if (!t) return true;
      return [c.folio, c.id_v7, c.po, c.cliente, c.proveedor, c.producto, c.lote, c.lote_productor].some(v => norm(v).includes(t));
    });
  }

  /* Badge compacto de MODALIDAD consignación — chico, apilado bajo el badge de ESTADO (mismo
     patrón visual que el chip PC-### bajo el folio en CARGA: inline-block que envuelve a su
     propia línea en una celda angosta, sin <br> ni bloque forzado). Paleta propia (ámbar/gris)
     para que se lea como modalidad, no como estado logístico ni como el semáforo de cobro.
     NUNCA fijo: ingreso_venta=0 en consignación no es un dato faltante — se reconoce al
     LIQUIDAR, no al embarcar (D-04) — por eso "esperando liquidación" SOLO cuando ni venta ni
     cobro existen todavía; si ya hay venta declarada (P-071/P-073/P-075) o liquidada (P-019),
     el pill queda neutro. Nunca en cargas anuladas ni en otras modalidades. */
  function badgeConsignacion(c) {
    if (c.anulado || c.modalidad !== 'consignacion') return '';
    if (num(c.ingreso_venta) === 0 && num(c.cobrado) === 0) {
      return ' <span class="pill ambar" title="Esperando liquidación — el ingreso se reconoce al liquidar, no al embarcar (D-04)">Consignación</span>';
    }
    if (num(c.ingreso_venta) > 0) {
      return ' <span class="pill gris" title="Venta ya declarada">Consignación</span>';
    }
    return '';
  }

  function pintarTabla() {
    let filas = filtradas();
    if (sortFecha) {
      const dir = sortFecha === 'asc' ? 1 : -1;
      filas = filas.slice().sort((a, b) =>
        String(a.f_embarque || '').localeCompare(String(b.f_embarque || '')) * dir);
    } else if (sortUtil) {
      const dir = sortUtil === 'asc' ? 1 : -1;
      filas = filas.slice().sort((a, b) => {
        const ua = a.utilidad, ub = b.utilidad;
        if (ua == null && ub == null) return 0;
        if (ua == null) return 1;    // NULLs siempre al final
        if (ub == null) return -1;
        return (num(ua) - num(ub)) * dir;
      });
    }
    const cuerpo = document.getElementById('cargasTabla');
    document.getElementById('cargasConteo').textContent = `${filas.length} de ${cargas.length} cargas`;

    if (!filas.length) {
      cuerpo.innerHTML = '<div class="vacio">Ninguna carga coincide con el filtro.</div>';
      return;
    }

    /* Los totales suman solo cargas vigentes: una anulada no cuenta para nada,
       y sumarla al pie inflaría la venta y el costo del periodo. */
    const vigentes = filas.filter(c => !c.anulado);
    const nAnuladas = filas.length - vigentes.length;
    const tv = vigentes.reduce((s, c) => s + num(c.ingreso_venta), 0);
    const tc = vigentes.reduce((s, c) => s + num(c.costo_total), 0);
    const tcajas = vigentes.reduce((s, c) => s + (c.cajas == null ? 0 : num(c.cajas)), 0);
    const hayCajas = vigentes.some(c => c.cajas != null);
    const tu = vigentes.reduce((s, c) => s + (c.utilidad == null ? 0 : num(c.utilidad)), 0);
    const hayUtil = vigentes.some(c => c.utilidad != null);

    cuerpo.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr>
        <th></th><th>Carga</th><th>P.O.</th>
        <th id="thFecha" style="cursor:pointer;user-select:none;white-space:nowrap" title="Clic para ordenar por fecha de embarque">Embarque ${sortFecha === 'desc' ? '▼' : sortFecha === 'asc' ? '▲' : '⇅'}</th>
        <th>V7</th><th>Lote</th><th>Estado</th><th>Cobro</th><th>Producto</th><th>Cliente</th>
        <th class="num">Cajas</th>
        <th class="num">Venta</th>
        <th class="num" id="thUtil" style="cursor:pointer;user-select:none" title="Clic para ordenar por utilidad">Utilidad ${sortUtil === 'desc' ? '▼' : sortUtil === 'asc' ? '▲' : '⇅'}</th>
        <th class="num">Costo</th><th class="num">Margen %</th>
        <th class="num">CxC</th><th class="num">CxP</th><th>Resp.</th>
      </tr></thead>
      <tbody>
      ${filas.map(c => {
        const m = num(c.ingreso_venta) - num(c.costo_total);
        const mp = num(c.ingreso_venta) > 0.009 ? (m / num(c.ingreso_venta) * 100) : null;
        const anulada = c.anulado === true;
        const prog = programaMap.get(String(c.folio));
        return `<tr class="clic ${anulada ? 'anulada' : ''}" data-folio="${esc(c.folio)}"
                    ${anulada ? `title="Anulada: ${esc(c.anulado_motivo || 'sin motivo')}"` : ''}>
          <td>${anulada ? '⊘' : semaforo(mp)}</td>
          <td class="mono"><span class="enlace">${esc(c.folio)}</span>${c.revision_pendiente && !anulada ? ' ⚑' : ''}${prog ? ` <span class="pill verde ir-programa" data-ir-programa="1" data-programa="${esc(prog.codigo)}" title="Ver programa: ${esc(prog.etiqueta || prog.codigo)}">${esc(prog.codigo)}</span>` : ''}</td>
          <td class="mono" style="white-space:nowrap">${c.po ? esc(c.po) : '—'}</td>
          <td class="mono" style="white-space:nowrap">${c.f_embarque ? esc(ERP.fecha(c.f_embarque)) : '—'}</td>
          <td class="mono">${c.id_v7 == null ? '—' : esc(c.id_v7)}</td>
          <td class="mono" style="white-space:nowrap">${esc(c.lote || '—')}</td>
          <td>${anulada
            ? '<span class="pill rojo">ANULADA</span>'
            : ERP.badgeEstado(c.estado)}${badgeConsignacion(c)}</td>
          <td>${anulada || !cxcOk ? '' : ERP.chipCobroHTML(cxcMap.get(String(c.folio)))}</td>
          <td>${esc(c.producto || '—')}</td>
          <td>${esc((c.cliente || '—').split(' ').slice(0, 2).join(' '))}</td>
          <td class="num">${c.cajas == null ? '—' : fmt0(c.cajas)}</td>
          <td class="num">${usd(c.ingreso_venta)}</td>
          <td class="num"${anulada ? '' : ` style="color:${ERP.utilidadColor(c.utilidad)}"`}>${ERP.utilidadTexto(c.utilidad, c.utilidad_es_estimada, c.utilidad_nota)}</td>
          <td class="num">${usd(c.costo_total)}</td>
          <td class="num ${m < 0 && !anulada ? 'neg' : ''}">${mp == null ? '—' : pct(mp)}</td>
          <td class="num">${num(c.saldo_cxc) > 0.009 ? usd(c.saldo_cxc) : '—'}</td>
          <td class="num ${num(c.saldo_cxp) > 0.009 && !anulada ? 'neg' : ''}">${num(c.saldo_cxp) > 0.009 ? usd(c.saldo_cxp) : '—'}</td>
          <td style="white-space:nowrap">${c.responsable_nombre ? esc(String(c.responsable_nombre).split(' ')[0]) : '—'}</td>
        </tr>`;
      }).join('')}
      </tbody>
      <tfoot><tr class="total">
        <td colspan="10">Total vigente (${vigentes.length})${nAnuladas ? ` · ${nAnuladas} anulada${nAnuladas === 1 ? '' : 's'} sin contar` : ''}</td>
        <td class="num">${hayCajas ? fmt0(tcajas) : '—'}</td>
        <td class="num">${usd(tv)}</td>
        <td class="num"${hayUtil ? ` style="color:${ERP.utilidadColor(tu)}"` : ''}>${hayUtil ? usd(tu) : '—'}</td>
        <td class="num">${usd(tc)}</td>
        <td class="num">${tv > 0 ? pct((tv - tc) / tv * 100) : '—'}</td>
        <td class="num">${usd(vigentes.reduce((s, c) => s + num(c.saldo_cxc), 0))}</td>
        <td class="num">${usd(vigentes.reduce((s, c) => s + num(c.saldo_cxp), 0))}</td>
        <td></td>
      </tr></tfoot>
    </table></div>`;

    cuerpo.querySelectorAll('tr.clic').forEach(tr =>
      tr.addEventListener('click', () => verCarga(tr.dataset.folio)));
    // Chip de programa (E47): navega a Programas sin abrir la ficha de la carga.
    cuerpo.querySelectorAll('[data-ir-programa]').forEach(chip => chip.addEventListener('click', e => {
      e.stopPropagation();
      ERP.irModulo('programas', chip.dataset.programa);
    }));

    const thUtil = document.getElementById('thUtil');
    if (thUtil) thUtil.addEventListener('click', () => { sortFecha = null; sortUtil = sortUtil === 'desc' ? 'asc' : 'desc'; pintarTabla(); });
    const thFecha = document.getElementById('thFecha');
    if (thFecha) thFecha.addEventListener('click', () => { sortUtil = null; sortFecha = sortFecha === 'desc' ? 'asc' : 'desc'; pintarTabla(); });
    ERP.cablearInfoNota(cuerpo);   // ⓘ de utilidad estimada (tap no abre la ficha: stopPropagation)
  }

  /* Barra de filtros: chips de estado/cobro + rango de fechas sobre f_embarque. Se repinta sola
     (sin refetch) cada vez que cambia el rango, para que los conteos de los chips lo reflejen;
     el clic en un chip no necesita repintar (los conteos no dependen de qué chip está activo). */
  function pintarFiltros(cont) {
    const cat = ERP.catalogoEstados();
    const cuenta = c => ERP.estadoInfo(c.estado).cuenta_como_embarque !== false;   // Por Confirmar = false
    // TODO conteo respeta el rango de fechas activo, acumulativo con "vivas" (no anuladas).
    const vivasRango = cargas.filter(c => !c.anulado && enRango(c));
    const nEstado = e => vivasRango.filter(c => c.estado === e).length;
    const nVivas = vivasRango.filter(cuenta).length;             // "Todas" = embarques reales
    const nActivas = vivasRango.filter(c => cuenta(c) && !CERRADA.test(c.estado || '')).length;
    const nFlag = vivasRango.filter(c => c.revision_pendiente).length;
    const nAnul = cargas.filter(c => c.anulado && enRango(c)).length;
    // Chips de estado del CATÁLOGO (ordenados por `orden`), solo los que tienen ≥1 carga viva
    // DENTRO del rango activo. Los que cuentan como embarque van en la barra normal; los que NO
    // (Por Confirmar) van aparte.
    const conVivas = i => vivasRango.some(c => c.estado === i.estado);
    const estadosOp = (cat ? cat.lista.filter(i => i.cuenta_como_embarque !== false) : []).filter(conVivas);
    const estadosNoCuenta = (cat ? cat.lista.filter(i => i.cuenta_como_embarque === false) : []).filter(conVivas);
    // Chips de estatus de cobro (mismo patrón single-select que los demás; solo si hay datos de v_cxc).
    const COBRO_CHIPS = [['cobrado', 'Cobrado'], ['parcial', 'Parcial'], ['vencido', 'Vencido'], ['pendiente', 'Pendiente'], ['sin_liquidar', 'Sin liquidar']];
    const nCobro = clave => vivasRango.filter(c => enCobro(c, clave)).length;
    // "En consignación": TODAS las cargas modalidad='consignacion' vivas (liquidadas y sin
    // liquidar). Es una lente por MODALIDAD, distinta de las lentes por estatus de cobro de
    // arriba — su conteo no tiene por qué coincidir con 'cobro:sin_liquidar' (D-04: el ingreso de
    // consignación se reconoce al liquidar, no al embarcar; hay consignaciones ya liquidadas).
    const nConsignacion = vivasRango.filter(c => c.modalidad === 'consignacion').length;
    const activo = valor => filtroEstado === valor ? ' activo' : '';

    // Etiqueta removible del rango activo (vacía si no hay rango).
    let rangoTxt = '';
    if (rangoDesde && rangoHasta) rangoTxt = `${esc(ERP.fecha(rangoDesde))} – ${esc(ERP.fecha(rangoHasta))}`;
    else if (rangoDesde) rangoTxt = `Desde ${esc(ERP.fecha(rangoDesde))}`;
    else if (rangoHasta) rangoTxt = `Hasta ${esc(ERP.fecha(rangoHasta))}`;

    document.getElementById('filtrosCont').innerHTML = `
      <div class="filtros-rango">
        <div class="fechas-par">
          <input type="date" id="rangoDesde" value="${esc(rangoDesde)}" title="Desde">
          <span class="sep">—</span>
          <input type="date" id="rangoHasta" value="${esc(rangoHasta)}" title="Hasta">
        </div>
        <button class="btn-mini gris" data-atajo="mes">Este mes</button>
        <button class="btn-mini gris" data-atajo="mesPasado">Mes pasado</button>
        <button class="btn-mini gris" data-atajo="30d">Últimos 30 días</button>
        <button class="btn-mini gris" data-atajo="todo">Todo</button>
        ${rangoTxt ? `<span class="chip-rango">${rangoTxt} <span class="chip-rango-x" id="rangoQuitar" title="Quitar filtro de fechas">✕</span></span>` : ''}
      </div>
      <div class="filtros">
        <input class="busca" id="cargasBusca" type="text" placeholder="Filtrar por folio, V7, lote, PO, cliente, proveedor o producto…"
               value="${esc(filtroTexto)}">
        ${estadosNoCuenta.map(i => `<button class="chip chip-porconfirmar${activo(i.estado)}" data-estado="${esc(i.estado)}" style="margin-right:12px" title="No cuenta como embarque hasta confirmarla">${esc(i.etiqueta)} <span class="chip-n">${nEstado(i.estado)}</span></button>`).join('')}
        <button class="chip${activo('todas')}" data-estado="todas">Todas <span class="chip-n">${nVivas}</span></button>
        <button class="chip${activo('activas')}" data-estado="activas">Activas <span class="chip-n">${nActivas}</span></button>
        <button class="chip${activo('flag')}" data-estado="flag">Con flag ⚑ <span class="chip-n">${nFlag}</span></button>
        ${estadosOp.map(i => `<button class="chip${activo(i.estado)}" data-estado="${esc(i.estado)}">${esc(i.etiqueta)} <span class="chip-n">${nEstado(i.estado)}</span></button>`).join('')}
        ${cxcOk ? COBRO_CHIPS.map(([k, l], i) => `<button class="chip${activo('cobro:' + k)}" data-estado="cobro:${k}"${i === 0 ? ' style="margin-left:10px" title="Filtrar por estatus de cobro"' : ''}>${l} <span class="chip-n">${nCobro(k)}</span></button>`).join('') : ''}
        <button class="chip${activo('modalidad:consignacion')}" data-estado="modalidad:consignacion" style="margin-left:12px" title="Todas las cargas en modalidad consignación (liquidadas y sin liquidar) — conjunto distinto de 'Sin liquidar'">En consignación <span class="chip-n">${nConsignacion}</span></button>
        ${nAnul ? `<button class="chip chip-anuladas${activo('anuladas')}" data-estado="anuladas" style="margin-left:10px">Anuladas ⊘ <span class="chip-n">${nAnul}</span></button>` : ''}
        ${ERP.puede('capturar') ? '<button class="btn-mini" id="btnNuevaCarga">+ Nuevo embarque</button>' : ''}
        <span class="conteo" id="cargasConteo"></span>
      </div>`;

    // El título del export lleva el rango aplicado (leído al vuelo por cablearExportar al hacer clic;
    // aquí solo actualizamos el dataset, no hace falta re-cablear los botones).
    document.querySelectorAll('[data-exp][data-exp-nombre="Embarques"]').forEach(b => {
      b.dataset.expTitulo = rangoTxt ? `Reporte de Embarques — ${rangoTxt}` : 'Reporte de Embarques';
    });

    document.getElementById('cargasBusca').addEventListener('input', e => {
      clearTimeout(tempoBusca);
      tempoBusca = setTimeout(() => { filtroTexto = e.target.value; pintarTabla(); }, 150);
    });

    cont.querySelectorAll('#filtrosCont .chip').forEach(ch => ch.addEventListener('click', () => {
      cont.querySelectorAll('#filtrosCont .chip').forEach(o => o.classList.remove('activo'));
      ch.classList.add('activo');
      filtroEstado = ch.dataset.estado;
      pintarTabla();
    }));

    const btnNueva = document.getElementById('btnNuevaCarga');
    if (btnNueva) btnNueva.addEventListener('click', nuevaCarga);

    const aplicarRango = (desde, hasta) => {
      rangoDesde = desde || ''; rangoHasta = hasta || '';
      pintarFiltros(cont);
      pintarTabla();
    };
    document.getElementById('rangoDesde').addEventListener('change', e => aplicarRango(e.target.value, rangoHasta));
    document.getElementById('rangoHasta').addEventListener('change', e => aplicarRango(rangoDesde, e.target.value));
    cont.querySelectorAll('#filtrosCont [data-atajo]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.atajo;
      if (a === 'mes') aplicarRango(...rangoEsteMes());
      else if (a === 'mesPasado') aplicarRango(...rangoMesPasado());
      else if (a === '30d') aplicarRango(...rangoUlt30());
      else aplicarRango('', '');   // "Todo": quita el rango
    }));
    const rangoQuitar = document.getElementById('rangoQuitar');
    if (rangoQuitar) rangoQuitar.addEventListener('click', () => aplicarRango('', ''));
  }

  async function render(cont, parametro) {
    // Un solo fetch de v_cxc al montar; se indexa por folio y se cruza con la lista ya traída.
    // NO se consulta por carga. Si v_cxc falla, la lista sigue funcionando sin chips de cobro.
    const [cargasData, cxc, , agenda, cargasPrograma] = await Promise.all([
      q('v_carga_detalle'),
      q('v_cxc').catch(() => null),
      ERP.cargarEstados(),   // catálogo de estados/transiciones; sin catch: si truena, se ve el errbox
      q('v_agenda_operativa').catch(() => []),   // enriquecimiento: si falla, la franja se oculta
      q('v_cargas_programa').catch(() => [])   // E47: mapa folio→programa, un solo fetch para toda la lista
    ]);
    cargas = cargasData;
    cxcOk = Array.isArray(cxc);
    cxcMap = new Map();
    if (cxcOk) cxc.forEach(r => cxcMap.set(String(r.folio), r));
    programaMap = new Map();
    cargasPrograma.forEach(r => { if (r.programa_codigo) programaMap.set(String(r.folio), { codigo: r.programa_codigo, etiqueta: r.programa_etiqueta || null }); });
    // Orden base: fecha de embarque más reciente primero (folio como desempate). Las cargas sin
    // f_embarque (ej. "Por Confirmar") quedan al final, como corresponde a un orden por fecha.
    cargas.sort((a, b) => String(b.f_embarque || '').localeCompare(String(a.f_embarque || ''))
      || String(b.folio).localeCompare(String(a.folio), 'es', { numeric: true }));

    filtroEstado = 'todas';
    sortUtil = null;
    sortFecha = null;
    rangoDesde = '';
    rangoHasta = '';
    filtroTexto = parametro && parametro.startsWith('q:') ? parametro.slice(2) : '';

    cont.innerHTML = `
      ${htmlAgenda(agenda)}
      <div id="filtrosCont"></div>
      ${ERP.botonesExportar ? ERP.botonesExportar('Embarques', 'Reporte de Embarques', '#cargasTabla table') : ''}
      <div class="card" style="padding:14px"><div id="cargasTabla"></div></div>
      <div class="leyenda">
        Semáforo por margen: 🟢 &gt;10% · 🟡 3–10% · 🔴 &lt;3% · ⚑ flag activa · ⊘ anulada.
        La vista base son solo cargas vivas; las anuladas quedan <b>fuera de los estados operativos</b> y viven aparte en el chip <b>Anuladas ⊘</b>.
        Las consignaciones abiertas pueden mostrar margen bajo temporal: el costo entra antes que el ingreso.
        Toca una fila para abrir la ficha de la carga.
      </div>`;

    pintarFiltros(cont);   // pinta chips/rango y cablea sus propios listeners (incluido "+ Nuevo embarque")

    // Franja Agenda: toggle (recuerda el colapso en sesión) + clic en tarjeta → Expediente.
    const agToggle = document.getElementById('agendaToggle');
    if (agToggle) agToggle.addEventListener('click', () => {
      agendaColapsada = !agendaColapsada;
      const cards = document.getElementById('agendaCards');
      if (cards) cards.style.display = agendaColapsada ? 'none' : '';
      const arrow = document.getElementById('agendaArrow');
      if (arrow) arrow.textContent = agendaColapsada ? '▸' : '▾';
    });
    cont.querySelectorAll('.agenda .hoy-card.clic[data-folio]').forEach(card =>
      card.addEventListener('click', () => verCarga(card.dataset.folio)));
    // Tarjetas de agenda sin carga (ej. 'programa_sin_carga', E47): enlazan a Programas.
    cont.querySelectorAll('.agenda .hoy-card.clic[data-ir-programa-agenda]').forEach(card =>
      card.addEventListener('click', () => ERP.irModulo('programas')));

    pintarTabla();

    if (ERP.cablearExportar) ERP.cablearExportar(cont);

    if (parametro && !parametro.startsWith('q:')) verCarga(ERP.folioNormalizado(parametro));
  }

  /* El clic en un embarque abre el EXPEDIENTE (4 pestañas) cuando modulo-expediente.js
     está cargado. La ficha clásica —con toda la captura (costos, cobros/pagos, resolver
     revisión, anular)— sigue intacta y disponible como "Captura y acciones" desde el
     expediente, y como respaldo si el expediente no cargó. No se duplica lógica de captura. */
  /* ================= Agenda operativa de la semana (v_agenda_operativa) ================= */

  function htmlAgenda(agenda) {
    if (!agenda || !agenda.length) return '';   // sin datos → franja oculta del todo (sin estado vacío)
    const filas = agenda.slice().sort((a, b) => num(a.orden) - num(b.orden));   // rojas primero (ya vienen por orden)
    const nR = filas.filter(a => a.severidad === 'rojo').length;
    const cards = filas.map(a => {
      const sev = a.severidad === 'rojo' ? 'roja' : 'ambar';
      const resp = a.responsable ? ` <span style="color:var(--gris)">— ${esc(a.responsable)}</span>` : '';
      // Sin folio (ej. categoria 'programa_sin_carga', E47): no hay Expediente que abrir. Se
      // degrada a tarjeta sin link, salvo que sea un aviso de programa: ahí enlaza a Programas.
      const irPrograma = !a.folio && a.categoria === 'programa_sin_carga';
      const clicable = !!a.folio || irPrograma;
      const encabezado = a.folio
        ? `<span class="mono">${esc(a.folio)}</span>${a.po ? ` · <span class="mono" style="color:var(--gris)">${esc(a.po)}</span>` : ''} · `
        : '';
      return `<div class="hoy-card sev-${sev}${clicable ? ' clic' : ''}"${a.folio ? ` data-folio="${esc(a.folio)}"` : ''}${irPrograma ? ' data-ir-programa-agenda="1"' : ''}>
        <div class="hoy-card-titulo">${encabezado}${esc(a.titulo)}${resp}</div>
        <div class="hoy-card-detalle">${esc(a.detalle || '')}</div>
      </div>`;
    }).join('');
    return `<section class="agenda">
      <div class="agenda-head">
        <button class="agenda-toggle" id="agendaToggle"><span id="agendaArrow">${agendaColapsada ? '▸' : '▾'}</span> Agenda de la semana <span class="chip-n">${filas.length}${nR ? ` · ${nR} 🔴` : ''}</span></button>
      </div>
      <div class="hoy-cards" id="agendaCards"${agendaColapsada ? ' style="display:none"' : ''}>${cards}</div>
    </section>`;
  }

  /* ================= Responsable por carga (v_socios_asignables + fn_asignar_responsable) ================= */

  async function sociosAsignables() {
    if (_sociosCache) return _sociosCache;
    try { _sociosCache = await q('v_socios_asignables', '&order=socio_codigo.asc'); }
    catch (_) { _sociosCache = []; }
    return _sociosCache;
  }

  // Rellena una celda .det con "Responsable": nombre a secas (sin capturar) o selector (con capturar).
  async function montarResponsable(cell, folio, resp, respNombre, onDone) {
    if (!cell) return;
    if (!ERP.puede('capturar')) {
      cell.innerHTML = `<div class="l">Responsable</div><div class="v">${esc(respNombre || '—')}</div>`;
      return;
    }
    const socios = await sociosAsignables();
    cell.innerHTML = `<div class="l">Responsable</div><div class="v"><select class="resp-sel">
      <option value="">— Nadie</option>
      ${socios.map(s => `<option value="${esc(s.socio_codigo)}"${String(s.socio_codigo) === String(resp || '') ? ' selected' : ''}>${esc(s.nombre)}</option>`).join('')}
    </select></div>`;
    const sel = cell.querySelector('.resp-sel');
    sel.addEventListener('change', async () => {
      sel.disabled = true;
      try {
        const data = await rpc('fn_asignar_responsable', { p_folio: folio, p_socio: sel.value || null, p_nota: null });
        const msg = typeof data === 'string' ? data : ((data && data[0]) || 'Responsable actualizado.');
        ERP.marcarDatosSucios();
        ERP.toast('ok', esc(msg));
        if (onDone) onDone();
      } catch (e) {
        if (!ERP.avisarSiPermiso(e)) ERP.toast('err', `No se pudo asignar responsable: ${esc(e.message)}`);
        sel.disabled = false;
      }
    });
  }

  /* ================= Cambiar estado (matriz de transiciones del backend) ================= */

  // Transiciones que el socio logueado PUEDE hacer desde este estado (filtro = UX; el candado es del backend).
  function transicionesDisponibles(estado) {
    const cat = ERP.catalogoEstados();
    return cat ? cat.trans.filter(t => t.desde === estado && ERP.puede(t.capacidad)) : [];
  }
  // Tooltip para el botón deshabilitado: por qué no puedes mover este estado.
  function motivoSinTransicion(estado) {
    const cat = ERP.catalogoEstados();
    const todas = cat ? cat.trans.filter(t => t.desde === estado) : [];
    if (!todas.length) return 'Este estado no tiene cambios disponibles (es terminal).';
    const ROL = { capturar: 'captura', editar: 'edición', administrar: 'administrador' };
    const caps = [...new Set(todas.map(t => t.capacidad))].map(c => ROL[c] || c);
    return `Cambiar el estado desde «${ERP.estadoInfo(estado).etiqueta}» requiere capacidad ${caps.join(' o ')}.`;
  }

  // Modal de confirmación. El menú se filtra por rol; el backend es la autoridad y sus errores se muestran tal cual.
  function abrirCambiarEstado(folio, estadoActual, onDone) {
    const opciones = transicionesDisponibles(estadoActual);
    if (!opciones.length) { ERP.toast('warn', motivoSinTransicion(estadoActual)); return; }
    const ov = document.createElement('div');
    ov.className = 'modal-ov';
    ov.innerHTML = `<div class="modal-box">
      <h3 style="margin:0 0 4px">Cambiar estado de ${esc(folio)}</h3>
      <div style="font-size:12px;color:var(--gris);margin-bottom:12px">Actual: ${ERP.badgeEstado(estadoActual)}</div>
      <div class="form-erp">
        <div class="campo ancho"><label>Nuevo estado</label>
          <select id="ceEstado">${opciones.map((t, i) => `<option value="${i}">${esc(t.etiqueta_hacia)}</option>`).join('')}</select></div>
        <div class="aviso" id="ceNotaTrans" style="display:none"></div>
        <div class="aviso warn visible" id="ceRetro" style="display:none">⚠ Esto es un retroceso y queda registrado en bitácora.</div>
        <div class="campo ancho"><label>Nota (opcional)</label>
          <input id="ceNota" type="text" maxlength="200" placeholder="Motivo o referencia…"></div>
        <div class="acciones">
          <button class="btn-mini" id="ceGuardar">Confirmar</button>
          <button class="btn-mini gris" id="ceCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ceAviso"></div>
      </div>
    </div>`;
    document.body.appendChild(ov);
    const cerrar = () => ov.remove();
    const sel = ov.querySelector('#ceEstado');
    const actualizar = () => {
      const t = opciones[Number(sel.value)];
      const nt = ov.querySelector('#ceNotaTrans');
      if (t.nota) { nt.style.display = ''; nt.className = 'aviso visible'; nt.textContent = t.nota; } else nt.style.display = 'none';
      ov.querySelector('#ceRetro').style.display = t.es_retroceso ? '' : 'none';
    };
    sel.addEventListener('change', actualizar); actualizar();
    ov.addEventListener('click', e => { if (e.target === ov) cerrar(); });
    ov.querySelector('#ceCancelar').addEventListener('click', cerrar);
    ov.querySelector('#ceGuardar').addEventListener('click', async () => {
      const t = opciones[Number(sel.value)];
      const nota = ov.querySelector('#ceNota').value.trim();
      const btn = ov.querySelector('#ceGuardar'); btn.disabled = true;
      const setA = (tipo, html) => { const a = ov.querySelector('#ceAviso'); a.className = 'aviso visible ' + tipo; a.innerHTML = html; };
      setA('warn', 'Aplicando…');
      try {
        const data = await rpc('fn_mover_estado_carga', { p_folio: folio, p_estado: t.hacia, p_nota: nota || null });
        const r = (data && data[0]) || {};
        ERP.marcarDatosSucios();
        ERP.toast('ok', esc(r.mensaje || 'Estado actualizado.'));
        cerrar();
        if (onDone) onDone(r);
      } catch (e) {
        if (!ERP.avisarSiPermiso(e)) setA('err', `El ERP rechazó el cambio: ${esc(e.message)}`);
        btn.disabled = false;
      }
    });
  }

  async function verCarga(folio) {
    if (ERP.verExpediente) return ERP.verExpediente(folio);
    return verFichaClasica(folio);
  }

  ERP.abrirCambiarEstado = abrirCambiarEstado;
  ERP.transicionesDisponibles = transicionesDisponibles;
  ERP.motivoSinTransicion = motivoSinTransicion;
  ERP.montarResponsable = montarResponsable;
  ERP.verCarga = verCarga;
  ERP.verFichaClasica = verFichaClasica;
  ERP.nuevaCarga = nuevaCarga;

  ERP.registrar('cargas', {
    titulo: 'Embarques',
    descripcion: 'Cada embarque es una operación completa: compra, embarque, venta y cobro',
    render
  });
})();
