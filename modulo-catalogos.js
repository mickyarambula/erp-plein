/* Módulo Catálogos — alta y edición de contrapartes (por clase), productos, conceptos de costo,
   cuentas, categorías de deducción y categorías de gasto. Lectura para todos. Escritura: TODO
   este módulo pide permiso 'capturar' (P1/P2/Fase 2, D-125..D-137) — incluidos productos y
   variedades desde Fase 2c (D-136/D-137), ya no 'administrar'. El backend también valida cada
   permiso — esta pantalla solo oculta el botón cuando sabe que le van a rechazar la escritura.

   La palabra "contraparte" es vocabulario de la base, no de la pantalla: aquí cada clase
   se llama por lo que es (cliente, proveedor, beneficiario de gasto, socio). */

(function () {
  'use strict';
  const { q, rpc, esc, num, norm, usd } = ERP;

  // Fecha DD-mmm-YYYY (regla de la casa) — este módulo no formateaba fechas todavía; mismo
  // helper local que ya usan modulo-facturas.js/modulo-liquidaciones.js/modulo-ventas.js/modulo-lotes.js.
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  function fecha4(f) {
    if (!f) return '—';
    const d = new Date(String(f).length <= 10 ? f + 'T12:00:00' : f);
    if (isNaN(d)) return String(f);
    return `${String(d.getDate()).padStart(2, '0')}-${MESES[d.getMonth()]}-${d.getFullYear()}`;
  }

  /* Taxonomía. `id` es el valor exacto que espera p_clase; el resto es cómo se ve. */
  const CLASES = [
    {
      id: 'comercial', pestana: 'Comercial',
      alta: '+ Nuevo cliente o proveedor',
      titulo: 'Nuevo cliente o proveedor',
      subtitulo: 'El negocio real: quien nos compra fruta o nos la vende',
      leyenda: 'Clientes y proveedores de producto. <b>Cargas</b> = cuántas cargas vigentes los usan.'
    },
    {
      id: 'operativo', pestana: 'Operativo',
      alta: '+ Nuevo proveedor de servicio',
      titulo: 'Nuevo proveedor de servicio',
      subtitulo: 'Servicios que escalan con los embarques',
      leyenda: 'Flete, aduana, empaque, bróker. Su costo sube y baja con el volumen embarcado.'
    },
    {
      id: 'gasto', pestana: 'Gasto',
      alta: '+ Nuevo beneficiario de gasto',
      titulo: 'Nuevo beneficiario de gasto',
      subtitulo: 'Costo fijo o administrativo',
      leyenda: 'Software, viáticos, seguros, certificaciones. No dependen del volumen embarcado.'
    },
    {
      id: 'socio', pestana: 'Socio',
      alta: '+ Nuevo socio',
      titulo: 'Nuevo socio',
      subtitulo: 'Préstamos y movimientos con los socios',
      leyenda: 'JEAMS Capital, Samuel, Juan. Sus préstamos son pasivo, no ingreso.'
    }
  ];
  const claseDe = id => CLASES.find(c => c.id === id);
  const ES_CLASE = CLASES.map(c => c.id);

  /* Sub-filtros dentro de Comercial: ahí sí importa si vende, compra o ambas. */
  const SUBFILTROS = [
    { id: 'todos', txt: 'Todos' },
    { id: 'cliente', txt: 'Clientes' },
    { id: 'proveedor', txt: 'Proveedores' },
    { id: 'ambos', txt: 'Ambos' }
  ];

  let contrapartes = [];
  let productos = [];
  let variedades = [];   // {id, producto_id, nombre} — todas, agrupadas en pantalla por producto_id

  /* Panel de relación financiera (ficha de detalle, sitting 2): 4 vistas chicas, indexadas por
     NOMBRE (la llave de unión real — verificado en backend, 0 huérfanos por igualdad exacta con
     v_catalogo_admin.nombre; NO se une por id). Si una contraparte no aparece, es que no tiene
     actividad — nunca error, nunca $0 forzado. */
  let cxcPorCliente = new Map();      // v_cxc_cliente: cliente, cargas, venta, cobrado, saldo_cxc
  let cxpPorProveedor = new Map();    // v_cxp_proveedor: proveedor, cargas, costo, pagado, saldo_cxp
  let agingPorCliente = new Map();    // v_cxc_aging_cliente
  let diasPagoPorCliente = new Map(); // v_dias_pago_observado

  /* Sección "Programas" (ficha de detalle, sitting 3): v_contraparte_programas, unida por NOMBRE
     (mismo criterio limpio del sitting 2). Una contraparte puede tener VARIAS filas (varios
     programas, incluso ambos roles a la vez) — se indexa como Map<nombre, fila[]>, no un set. */
  let programasPorContraparte = new Map();

  /* Última operación / recencia: v_contraparte_recencia, unida por NOMBRE (mismo criterio limpio
     de los sittings previos). Una fila por contraparte -> indexarPor() normal. */
  let recenciaPorContraparte = new Map();
  // P2 (D-129..D-132): 2 catálogos más chicos, mismo patrón de pestaña que Productos.
  let conceptosCosto = [];   // v_conceptos_costo_admin: id, nombre, activo
  let cuentas = [];          // v_cuentas_admin: id, nombre, banco, moneda, tipo, capturado_por, capturado_ts, saldo, tiene_movimientos
  let categoriasDed = [];    // v_categorias_deduccion_admin: id, codigo, nombre, activo, orden, capturado_por, capturado_ts
  let categoriasGasto = [];  // v_categorias_gasto_admin: tipo, grupo, activo, linea, usos — `tipo` es la llave (texto), sin id numérico
  let pestana = 'comercial';       // clase | 'productos' | 'conceptos' | 'cuentas' | 'deducciones' | 'gastos'
  let subfiltro = 'todos';
  let busqueda = '';

  /* ================= Avisos ================= */

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

  const aliasDe = c => Array.isArray(c.alias) ? c.alias.filter(Boolean) : [];

  function tipoDe(c) {
    if (c.es_cliente && c.es_proveedor) return { txt: 'Cliente y proveedor', clase: '' };
    if (c.es_cliente) return { txt: 'Cliente', clase: '' };
    if (c.es_proveedor) return { txt: 'Proveedor', clase: 'ambar' };
    return { txt: 'Sin tipo', clase: 'gris' };
  }

  /* ================= Campos extendidos (contacto / facturación / direcciones) =================
     Mismo bloque de HTML para alta y edición: se parametriza el prefijo de id (`ct`/`ed`).
     En alta se pasa c = {} (todo vacío); en edición se precargan los valores de la vista. */

  /** Definición única: [sufijoId, columnaVista, paramRPC]. El orden es el de pantalla. */
  const CAMPOS_EXT = [
    ['Contacto',  'contacto_nombre',       'p_contacto_nombre'],
    ['Tel',       'telefono_whatsapp',     'p_telefono_whatsapp'],
    ['Email',     'email',                 'p_email'],
    ['Razon',     'razon_social',          'p_razon_social'],
    ['Rfc',       'rfc_tax_id',            'p_rfc_tax_id'],
    ['EmailFact', 'email_facturacion',     'p_email_facturacion'],
    ['Paca',      'paca_licencia',         'p_paca_licencia'],
    ['DirFact',   'direccion_facturacion', 'p_direccion_facturacion'],
    ['DirEnvio',  'direccion_envio',       'p_direccion_envio'],
    ['Ciudad',    'ciudad',                'p_ciudad'],
    ['Pais',      'pais',                  'p_pais']
  ];

  function camposExtendidos(pref, c) {
    c = c || {};
    const v = k => esc(c[k] == null ? '' : c[k]);
    return `
      <div class="grupo-form">Contacto</div>
      <div class="campo"><label>Persona de contacto</label>
        <input id="${pref}Contacto" type="text" maxlength="120" value="${v('contacto_nombre')}" placeholder="Quién atiende"></div>
      <div class="campo"><label>Teléfono / WhatsApp</label>
        <input id="${pref}Tel" type="text" maxlength="60" value="${v('telefono_whatsapp')}" placeholder="+52 …"></div>
      <div class="campo ancho"><label>Correo general</label>
        <input id="${pref}Email" type="email" maxlength="160" value="${v('email')}" placeholder="contacto@empresa.com"></div>

      <div class="grupo-form">Facturación</div>
      <div class="campo"><label>Razón social</label>
        <input id="${pref}Razon" type="text" maxlength="160" value="${v('razon_social')}" placeholder="Nombre legal completo"></div>
      <div class="campo"><label>RFC / Tax ID</label>
        <input id="${pref}Rfc" class="mono" type="text" maxlength="40" value="${v('rfc_tax_id')}" placeholder="RFC o EIN"></div>
      <div class="campo"><label>Correo de facturación (AP)</label>
        <input id="${pref}EmailFact" type="email" maxlength="160" value="${v('email_facturacion')}" placeholder="cuentas por pagar del cliente"></div>
      <div class="campo"><label>Licencia PACA</label>
        <input id="${pref}Paca" class="mono" type="text" maxlength="40" value="${v('paca_licencia')}" placeholder="Productores / proveedores US"></div>

      <div class="grupo-form">Direcciones</div>
      <div class="campo ancho"><label>Dirección de facturación (bill to)</label>
        <textarea id="${pref}DirFact" rows="3" placeholder="Aparece en el bloque BILL TO de las invoices">${v('direccion_facturacion')}</textarea></div>
      <div class="campo ancho"><label>Dirección de envío (ship to)</label>
        <textarea id="${pref}DirEnvio" rows="3" placeholder="Aparece en el bloque SHIP TO de las invoices">${v('direccion_envio')}</textarea></div>
      <div class="campo"><label>Ciudad</label>
        <input id="${pref}Ciudad" type="text" maxlength="80" value="${v('ciudad')}" placeholder="Ciudad"></div>
      <div class="campo"><label>País</label>
        <input id="${pref}Pais" type="text" maxlength="60" value="${v('pais')}" placeholder="País"></div>`;
  }

  /** Alta: manda cada campo tal cual (vacío → null, no se setea). */
  function leerExtendidosAlta(pref) {
    const out = {};
    for (const [id, , param] of CAMPOS_EXT) {
      const el = document.getElementById(pref + id);
      const val = el ? el.value.trim() : '';
      out[param] = val || null;
    }
    return out;
  }

  /** Edición: NULL = no tocar. Solo viaja lo que el usuario cambió respecto a la vista.
      Si lo borró (tenía valor y ahora está vacío) viaja '' para limpiarlo. */
  function difExtendidosEdicion(pref, c) {
    const out = {};
    for (const [id, col, param] of CAMPOS_EXT) {
      const el = document.getElementById(pref + id);
      const nuevo = el ? el.value.trim() : '';
      const viejo = c[col] == null ? '' : String(c[col]).trim();
      out[param] = nuevo === viejo ? null : nuevo;   // null = igual; '' = limpiar; texto = cambiar
    }
    return out;
  }

  /* ================= Ficha de detalle (solo lectura, para todos los roles) ================= */

  function correoContraparte(c) {
    const dest = (c.email_facturacion || c.email || '').trim();
    if (!dest) { ERP.toast('warn', 'Esta contraparte no tiene correo capturado. Agrégalo con “Editar”.', 6000); return; }
    const asunto = `Plein Produce — ${c.nombre || ''}`.trim();
    const saludo = c.contacto_nombre ? `Estimado ${c.contacto_nombre}:` : 'Estimados:';
    const cuerpo = `${saludo}\n\n\n\nSaludos,\nPlein Produce LLC`;
    const href = 'mailto:' + encodeURIComponent(dest).replace(/%40/g, '@') +
      '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
    const a = document.createElement('a');
    a.href = href; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    ERP.toast('ok', `Se abrió tu correo hacia <b>${esc(dest)}</b>.`);
  }

  function fichaContraparte(c) {
    const cl = claseDe(c.clase);
    const t = tipoDe(c);
    const al = aliasDe(c);
    // Alta/edición de CONTRAPARTE es permiso 'capturar' (fn_alta_contraparte/fn_editar_contraparte,
    // P1 D-125..D-128) — más laxo que 'administrar', a propósito: Samuel/Juan (rol operacion) ya
    // pueden dar de alta un cliente/proveedor nuevo sin depender de Miguel.
    const puedeContra = ERP.puede('capturar');
    const tieneCorreo = !!(c.email_facturacion || c.email);
    // BUG 1: número de WhatsApp saneado a solo dígitos para el link wa.me (ej. "52 6681 894888" -> "526681894888").
    const waNumero = String(c.telefono_whatsapp || '').replace(/\D/g, '');

    const linea = (etq, val, mono) => (val != null && String(val).trim() !== '')
      ? `<div class="ficha-linea"><span class="ficha-etq">${esc(etq)}</span><span class="ficha-val${mono ? ' mono' : ''}">${esc(val)}</span></div>`
      : '';
    /** Devuelve el HTML de una sección solo si alguna de sus líneas tiene contenido. */
    const seccion = (titulo, lineas) => {
      const cuerpo = lineas.join('');
      return cuerpo ? `<div class="ficha-seccion">${esc(titulo)}</div>${cuerpo}` : '';
    };
    // Línea de alias con chips (no texto plano) — mismo patrón visual que el editor de alias.
    const lineaAlias = al.length
      ? `<div class="ficha-linea"><span class="ficha-etq">Alias</span><span class="ficha-val">${al.map(a => `<span class="alias-chip solo-ver">${esc(a)}</span>`).join(' ')}</span></div>`
      : '';
    // Línea con valor YA en HTML (números formateados, pills de semáforo) — linea() escapa el
    // valor y por eso no sirve aquí; el llamador es responsable de no meter datos crudos sin esc().
    const lineaCruda = (etq, valHtml) => `<div class="ficha-linea"><span class="ficha-etq">${esc(etq)}</span><span class="ficha-val">${valHtml}</span></div>`;
    const subEtq = txt => `<div class="ficha-linea"><span class="ficha-val" style="font-weight:700;color:var(--brand);text-transform:uppercase;font-size:10.5px;letter-spacing:.04em">${esc(txt)}</span></div>`;
    const sinDato = txt => `<div class="ficha-linea"><span class="ficha-val" style="color:var(--i2)">${esc(txt)}</span></div>`;

    const contacto = seccion('Contacto', [
      linea('Persona', c.contacto_nombre),
      linea('Correo', c.email),
      linea('Teléfono / WhatsApp', c.telefono_whatsapp)
    ]);
    const terminos = seccion('Términos', [
      linea('Días de crédito', c.dias_credito),
      lineaAlias,
      linea('Rol', t.txt)
    ]);
    const factur = seccion('Facturación', [
      linea('Razón social', c.razon_social),
      linea('RFC / Tax ID', c.rfc_tax_id, true),
      linea('Correo de facturación', c.email_facturacion)
    ]);
    const paca = seccion('Licencia PACA', [linea('Licencia PACA', c.paca_licencia, true)]);
    const direcc = seccion('Direcciones', [
      linea('Bill-to', c.direccion_facturacion),
      linea('Ship-to', c.direccion_envio),
      linea('Ciudad', c.ciudad),
      linea('País', c.pais)
    ]);

    /* Estado de cuenta (sitting 2, panel de relación financiera): une por NOMBRE contra 4 vistas
       chicas (v_cxc_cliente, v_cxp_proveedor, v_cxc_aging_cliente, v_dias_pago_observado),
       verificado en backend como llave limpia (0 huérfanos). Sin match = "Sin saldo"/"Sin
       movimientos", nunca un $0 forzado ni un error. */
    const cxc = c.es_cliente ? cxcPorCliente.get(c.nombre) : null;
    const cxp = c.es_proveedor ? cxpPorProveedor.get(c.nombre) : null;

    let estadoCuenta = '';
    if (!c.es_cliente && !c.es_proveedor) {
      estadoCuenta = seccion('Estado de cuenta', [sinDato('Sin movimientos financieros registrados.')]);
    } else {
      let bloqueCxC = '';
      if (c.es_cliente) {
        bloqueCxC += subEtq('Cuentas por cobrar');
        if (cxc) {
          const saldo = num(cxc.saldo_cxc);
          bloqueCxC += lineaCruda('Venta', usd(cxc.venta));
          bloqueCxC += lineaCruda('Cobrado', usd(cxc.cobrado));
          bloqueCxC += lineaCruda('Saldo', `<b class="${saldo > 0.009 ? 'neg' : ''}">${usd(saldo)}</b>`);

          const ag = agingPorCliente.get(c.nombre);
          if (ag) {
            const alertaHtml = ag.en_flag ? ' <span class="pill rojo" title="Saldo con antigüedad crítica">⚠ Alerta</span>' : '';
            bloqueCxC += lineaCruda('Aging', `Por vencer ${usd(ag.saldo_por_vencer)} · Vencido <span class="${num(ag.saldo_vencido) > 0.009 ? 'neg' : ''}">${usd(ag.saldo_vencido)}</span>${alertaHtml}`);
            bloqueCxC += lineaCruda('Desglose', `0-30: ${usd(ag.b_0_30)} · 31-60: ${usd(ag.b_31_60)} · 61-90: ${usd(ag.b_61_90)} · 90+: ${usd(ag.b_90_mas)}`);
            if (ag.en_flag) {
              const diasMax = ag.dias_vencido_max == null ? '—' : Math.round(num(ag.dias_vencido_max));
              bloqueCxC += lineaCruda('Días vencido máx', `<b class="neg">${esc(diasMax)}</b>`);
            }
          }

          const dp = diasPagoPorCliente.get(c.nombre);
          if (dp) {
            const gap = Math.round(num(dp.gap));
            const claseGap = gap <= 0 ? 'verde' : (gap <= 30 ? 'ambar' : 'rojo');
            const contratado = dp.dias_contratado == null ? '—' : Math.round(num(dp.dias_contratado));
            const prom = dp.dias_prom == null ? '—' : Math.round(num(dp.dias_prom));
            const mediana = dp.dias_mediana == null ? '—' : Math.round(num(dp.dias_mediana));
            const emb = dp.n_embarques == null ? '' : ` · ${esc(dp.n_embarques)} embarque${dp.n_embarques === 1 ? '' : 's'}`;
            bloqueCxC += lineaCruda('Días de pago',
              `Contratado ${esc(contratado)} · Observado ${esc(prom)} (mediana ${esc(mediana)}) · Gap <span class="pill ${claseGap}">${esc(gap)}</span>${emb}`);
            const pct = num(dp.pct_cxc);
            if (pct >= 0.20 && gap > 0) {
              bloqueCxC += `<div class="ficha-linea"><span class="ficha-etq"></span><span class="ficha-val" style="font-size:11.5px;color:var(--i2)">Cliente de peso (${Math.round(pct * 100)}% de la CxC) pagando fuera de término</span></div>`;
            }
          }
        } else {
          bloqueCxC += sinDato('Sin saldo');
        }
      }

      let bloqueCxP = '';
      if (c.es_proveedor) {
        bloqueCxP += subEtq('Cuentas por pagar');
        if (cxp) {
          const saldo = num(cxp.saldo_cxp);
          bloqueCxP += lineaCruda('Costo', usd(cxp.costo));
          bloqueCxP += lineaCruda('Pagado', usd(cxp.pagado));
          bloqueCxP += lineaCruda('Saldo', `<b style="${saldo > 0.009 ? 'color:var(--amb)' : ''}">${usd(saldo)}</b>`);
        } else {
          bloqueCxP += sinDato('Sin saldo');
        }
      }

      estadoCuenta = seccion('Estado de cuenta', [bloqueCxC + bloqueCxP]);
    }

    /* Programas (sitting 3): v_contraparte_programas, unida por nombre. Sin filas = se OMITE la
       sección entera (la mayoría de gastos/socios no participan en programas — no es "vacío que
       hay que anunciar", es simplemente que no aplica). */
    const filasPrograma = programasPorContraparte.get(c.nombre) || [];
    let programasSeccion = '';
    if (filasPrograma.length) {
      const rolOrden = r => r === 'Compra' ? 0 : (r === 'Abastece' ? 1 : 2);
      const ordenadas = [...filasPrograma].sort((a, b) => {
        const d = rolOrden(a.rol) - rolOrden(b.rol);
        return d !== 0 ? d : String(a.codigo || '').localeCompare(String(b.codigo || ''));
      });
      const lineaPrograma = p => {
        const pillClase = p.rol === 'Compra' ? 'verde' : (p.rol === 'Abastece' ? 'ambar' : 'gris');
        const cargasTxt = `${p.n_cargas ?? 0} carga${p.n_cargas === 1 ? '' : 's'}`;
        const estadoTxt = (p.estado && p.estado !== 'activo') ? ` · ${p.estado}` : '';
        return `<div class="ficha-linea"><span class="ficha-val">${esc(p.codigo || '—')} · ${esc(p.etiqueta || '—')} ` +
          `<span class="pill ${pillClase}">${esc(p.rol || '—')}</span> ` +
          `<span style="color:var(--i2);font-size:11px">${esc(cargasTxt + estadoTxt)}</span></span></div>`;
      };
      programasSeccion = seccion('Programas', [ordenadas.map(lineaPrograma).join('')]);
    }

    /* Última operación / recencia (sitting 4): v_contraparte_recencia, unida por nombre. Sin fila
       (contraparte sin cargas) = se OMITE la línea, nunca "sin operaciones". Semáforo v1 simple:
       solo alerta si es_cliente y ya se enfrió (>30 días) — un proveedor con 40 días de por medio
       no es una señal de alarma de la misma forma. */
    const rec = recenciaPorContraparte.get(c.nombre);
    let recenciaLinea = '';
    if (rec) {
      const dias = num(rec.dias_desde);
      const enfriando = !!c.es_cliente && dias > 30;
      const diasTxt = `hace ${esc(dias)} día${dias === 1 ? '' : 's'}`;
      const diasHtml = enfriando
        ? `<span style="color:var(--amb);font-weight:600">${diasTxt}</span> <span class="pill ambar">cuenta enfriándose</span>`
        : diasTxt;
      recenciaLinea = `<div class="ficha-linea"><span class="ficha-etq">Última operación</span><span class="ficha-val">${esc(fecha4(rec.ultima_operacion))} (${diasHtml})</span></div>`;
    }

    const cuerpoDatos = recenciaLinea + contacto + terminos + factur + paca + direcc +
      seccion('Nota', [linea('Nota', c.nota)]) + estadoCuenta + programasSeccion;

    ERP.abrirPanel(esc(c.nombre),
      `${cl ? esc(cl.pestana) : 'Sin clase'} · <span class="pill ${t.clase}">${esc(t.txt)}</span> · ` +
      `${c.num_cargas} carga${c.num_cargas === 1 ? '' : 's'}${c.dias_credito == null ? '' : ` · ${esc(c.dias_credito)} días de crédito`}`,
      `<div class="ficha-cp">
        ${cuerpoDatos || '<div class="ficha-vacio">Sin datos de contacto capturados todavía.</div>'}
      </div>
      <div class="form-erp" style="margin-top:14px">
        <div class="acciones">
          <button class="btn-mini${tieneCorreo ? '' : ' gris'}" id="cpCorreo"${tieneCorreo ? '' : ' disabled'}>Enviar correo</button>
          ${waNumero ? `<a class="btn-mini gris" href="https://wa.me/${esc(waNumero)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          ${puedeContra ? '<button class="btn-mini gris" id="cpEditar">Editar</button>' : ''}
          <button class="btn-mini gris" id="cpCerrar">Cerrar</button>
        </div>
      </div>`);

    const bC = document.getElementById('cpCorreo');
    if (bC && tieneCorreo) bC.addEventListener('click', () => correoContraparte(c));
    const bE = document.getElementById('cpEditar');
    if (bE) bE.addEventListener('click', () => formEditar(c));
    document.getElementById('cpCerrar').addEventListener('click', ERP.cerrarPanel);
  }

  /* ================= Editor de alias =================
     El backend REEMPLAZA el array completo: para agregar uno hay que mandar los viejos
     + el nuevo. Por eso el editor mantiene la lista entera. */

  function crearEditorAlias(contenedor, iniciales) {
    let alias = [...iniciales];

    function pintar() {
      const lista = contenedor.querySelector('.alias-lista');
      lista.innerHTML = alias.length
        ? alias.map((a, i) => `<span class="alias-chip">${esc(a)}
            <button type="button" data-i="${i}" title="Quitar alias">×</button></span>`).join('')
        : '<span class="sin-alias">Sin alias</span>';
      lista.querySelectorAll('button').forEach(b =>
        b.addEventListener('click', () => { alias.splice(Number(b.dataset.i), 1); pintar(); }));
    }

    contenedor.classList.add('alias-editor');
    contenedor.innerHTML = `<div class="alias-lista"></div>
      <input type="text" placeholder="Escribe un alias y pulsa Enter…" maxlength="60">`;
    const input = contenedor.querySelector('input');

    function agregar(texto) {
      const t = String(texto || '').trim();
      if (!t) return;
      if (!alias.some(a => norm(a) === norm(t))) alias.push(t);
      input.value = '';
      pintar();
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); agregar(input.value); }
      else if (e.key === 'Backspace' && !input.value && alias.length) { alias.pop(); pintar(); }
    });
    input.addEventListener('paste', e => {
      const txt = (e.clipboardData || window.clipboardData).getData('text');
      if (txt.includes(',')) { e.preventDefault(); txt.split(',').forEach(agregar); }
    });
    input.addEventListener('blur', () => agregar(input.value));

    pintar();
    return { valor: () => [...alias] };
  }

  /** Selector de clase: 4 valores fijos del CHECK, no un catálogo. Un <select> basta. */
  function selectorClase(id, claseActual) {
    return `<select id="${id}">
      ${CLASES.map(c => `<option value="${esc(c.id)}"${c.id === claseActual ? ' selected' : ''}>
        ${esc(c.pestana)} — ${esc(c.subtitulo.toLowerCase())}</option>`).join('')}
    </select>`;
  }

  /* ================= Alta ================= */

  let editorAlias = null;

  function formNueva(claseInicial) {
    const cl = claseDe(claseInicial) || CLASES[0];

    ERP.abrirPanel(esc(cl.titulo), esc(cl.subtitulo), `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="ctNombre" type="text" maxlength="120" placeholder="PAPAYAS AND MORE LLC">
            <div class="alias-ayuda">No se podrá cambiar después: las cargas históricas lo referencian.</div>
          </div>
          <div class="campo ancho">
            <label>Clase <span class="req">*</span></label>
            ${selectorClase('ctClase', cl.id)}
          </div>
          <div class="campo ancho">
            <label>Rol</label>
            <div class="checks">
              <label><input type="checkbox" id="ctCliente"> Le vendemos (cliente)</label>
              <label><input type="checkbox" id="ctProveedor"> Le compramos o pagamos (proveedor)</label>
            </div>
            <div class="alias-ayuda" id="ctRolAyuda"></div>
          </div>
          <div class="campo ancho">
            <label>Recibe pagos</label>
            <div class="checks">
              <label><input type="checkbox" id="ctRecibePagos"> Puede recibir un pago (sueldo, viáticos, reembolso…)</label>
            </div>
            <div class="alias-ayuda">Recibe pagos = puede recibir sueldo/viáticos aunque no sea de clase Gasto.</div>
          </div>
          <div class="campo ancho">
            <label>Alias</label>
            <div id="ctAlias"></div>
            <div class="alias-ayuda">Nombres alternativos con los que se le busca. Enter o coma para agregar.</div>
          </div>
          <div class="campo">
            <label>Días de crédito</label>
            <input id="ctDias" class="mono" type="number" min="0" step="1" placeholder="opcional">
          </div>
          <div class="campo ancho">
            <label>Nota</label>
            <textarea id="ctNota" placeholder="Opcional — contexto, contacto, condiciones…"></textarea>
          </div>
          ${camposExtendidos('ct', {})}
        </div>
        <div class="acciones">
          <button class="btn-mini" id="ctGuardar">Crear</button>
          <button class="btn-mini gris" id="ctCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ctAviso"></div>
      </div>`);

    editorAlias = crearEditorAlias(document.getElementById('ctAlias'), []);

    const selClase = document.getElementById('ctClase');
    function ayudaRol() {
      /* Solo Comercial usa los roles: el selector de "Nueva carga" lee de vistas que
         exigen clase='comercial', así que en las otras clases marcar rol o no es
         irrelevante para la operación. Se dice explícito para que nadie lo dude. */
      document.getElementById('ctRolAyuda').innerHTML = selClase.value === 'comercial'
        ? 'En Comercial hay que marcar al menos uno.'
        : 'Opcional aquí: solo los <b>comerciales</b> aparecen al capturar una carga.';
    }
    selClase.addEventListener('change', ayudaRol);
    ayudaRol();

    document.getElementById('ctCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('ctGuardar').addEventListener('click', guardarNueva);
    document.getElementById('ctNombre').focus();
  }

  async function guardarNueva() {
    const nombre = document.getElementById('ctNombre').value.trim();
    const clase = document.getElementById('ctClase').value;
    const esCliente = document.getElementById('ctCliente').checked;
    const esProveedor = document.getElementById('ctProveedor').checked;
    const recibePagos = document.getElementById('ctRecibePagos').checked;
    const diasTxt = document.getElementById('ctDias').value.trim();
    const nota = document.getElementById('ctNota').value.trim();
    const btn = document.getElementById('ctGuardar');
    limpiarAviso('ctAviso');

    if (!nombre) { aviso('ctAviso', 'err', 'El nombre es obligatorio.'); return; }
    if (!ES_CLASE.includes(clase)) { aviso('ctAviso', 'err', 'Elige una clase válida.'); return; }
    /* La regla "al menos un rol" solo tiene sentido en Comercial. En las otras clases se
       deja pasar: si el backend la exige igual, su rechazo se muestra tal cual. */
    if (clase === 'comercial' && !esCliente && !esProveedor) {
      aviso('ctAviso', 'err', 'En Comercial hay que marcar <b>cliente</b> o <b>proveedor</b>.');
      return;
    }
    if (diasTxt && !(Number(diasTxt) >= 0)) {
      aviso('ctAviso', 'err', 'Los días de crédito no pueden ser negativos.');
      return;
    }

    btn.disabled = true;
    try {
      const data = await rpc('fn_alta_contraparte', {
        p_nombre: nombre,
        p_clase: clase,
        p_es_cliente: esCliente,
        p_es_proveedor: esProveedor,
        p_recibe_pagos: recibePagos,
        p_alias: editorAlias.valor(),
        p_dias_credito: diasTxt ? Number(diasTxt) : null,
        p_nota: nota || null,
        ...leerExtendidosAlta('ct')
      });
      const r = (data && data[0]) || {};
      await refrescar();
      if (r.advertencia) {
        aviso('ctAviso', 'warn', `Creado <b>${esc(r.nombre || nombre)}</b>, pero: ${esc(r.advertencia)}`);
      } else {
        aviso('ctAviso', 'ok', `<b>${esc(r.nombre || nombre)}</b> creado.`);
      }
    } catch (e) {
      aviso('ctAviso', 'err', `No se creó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  /* ================= Edición ================= */

  const DIAS_BORRAR = -1;   // centinela del backend: -1 borra, NULL deja igual

  function formEditar(c) {
    const dias = c.dias_credito;
    const cl = claseDe(c.clase);
    ERP.abrirPanel(esc(c.nombre),
      `${cl ? esc(cl.pestana) : 'Sin clase'} · ${c.num_cargas} carga${c.num_cargas === 1 ? '' : 's'} vigente${c.num_cargas === 1 ? '' : 's'}` +
      (c.tiene_movimientos ? ' · tiene movimientos registrados' : ''), `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre</label>
            <div class="campo-fijo">${esc(c.nombre)}
              <div class="aclara">No se puede cambiar: las cargas históricas lo referencian.</div>
            </div>
          </div>
          <div class="campo ancho">
            <label>Clase</label>
            ${selectorClase('edClase', c.clase)}
            <div class="alias-ayuda">Cambiarla mueve este registro de pestaña.</div>
          </div>
          <div class="campo ancho">
            <label>Rol</label>
            <div class="checks">
              <label><input type="checkbox" id="edCliente" ${c.es_cliente ? 'checked' : ''}> Le vendemos (cliente)</label>
              <label><input type="checkbox" id="edProveedor" ${c.es_proveedor ? 'checked' : ''}> Le compramos o pagamos (proveedor)</label>
            </div>
          </div>
          <div class="campo ancho">
            <label>Recibe pagos</label>
            <div class="checks">
              <label><input type="checkbox" id="edRecibePagos" ${c.recibe_pagos ? 'checked' : ''}> Puede recibir un pago (sueldo, viáticos, reembolso…)</label>
            </div>
            <div class="alias-ayuda">Recibe pagos = puede recibir sueldo/viáticos aunque no sea de clase Gasto.</div>
          </div>
          <div class="campo ancho">
            <label>Alias</label>
            <div id="edAlias"></div>
            <div class="alias-ayuda">Se guarda la lista completa. Quitar un alias aquí lo borra.</div>
          </div>
          <div class="campo">
            <label>Días de crédito</label>
            <input id="edDias" class="mono" type="number" min="0" step="1"
                   value="${dias == null ? '' : esc(dias)}" placeholder="sin crédito definido">
            <div class="alias-ayuda">Déjalo vacío para dejarlo sin crédito definido.</div>
          </div>
          <div class="campo ancho">
            <label>Nota</label>
            <textarea id="edNota">${esc(c.nota || '')}</textarea>
          </div>
          ${camposExtendidos('ed', c)}
        </div>
        <div class="acciones">
          <button class="btn-mini" id="edGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="edCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="edAviso"></div>
      </div>`);

    editorAlias = crearEditorAlias(document.getElementById('edAlias'), aliasDe(c));
    document.getElementById('edCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('edGuardar').addEventListener('click', () => guardarEdicion(c));
  }

  async function guardarEdicion(c) {
    const clase = document.getElementById('edClase').value;
    const esCliente = document.getElementById('edCliente').checked;
    const esProveedor = document.getElementById('edProveedor').checked;
    const recibePagos = document.getElementById('edRecibePagos').checked;
    const diasTxt = document.getElementById('edDias').value.trim();
    const nota = document.getElementById('edNota').value.trim();
    const btn = document.getElementById('edGuardar');
    limpiarAviso('edAviso');

    if (clase === 'comercial' && !esCliente && !esProveedor) {
      aviso('edAviso', 'err', 'En Comercial debe quedar marcado <b>cliente</b> o <b>proveedor</b>.');
      return;
    }
    if (diasTxt && !(Number(diasTxt) >= 0)) {
      aviso('edAviso', 'err', 'Los días de crédito no pueden ser negativos.');
      return;
    }

    btn.disabled = true;
    try {
      const data = await rpc('fn_editar_contraparte', {
        p_id: c.id,
        // NULL = no tocar. Solo viaja si el usuario la cambió.
        p_clase: clase === c.clase ? null : clase,
        // Array COMPLETO: el backend reemplaza, no agrega.
        p_alias: editorAlias.valor(),
        // Vacío = borrar (centinela -1). Nunca NULL: el formulario es lo que se guarda.
        p_dias_credito: diasTxt ? Number(diasTxt) : DIAS_BORRAR,
        p_es_cliente: esCliente,
        p_es_proveedor: esProveedor,
        p_recibe_pagos: recibePagos,
        p_nota: nota,
        // Contacto / facturación / direcciones: NULL = no tocar; '' = limpiar; solo viaja lo cambiado.
        ...difExtendidosEdicion('ed', c)
      });
      const r = (data && data[0]) || {};
      const cambioClase = clase !== c.clase;
      await refrescar();
      aviso('edAviso', 'ok', (r.resultado ? `${esc(c.nombre)}: ${esc(r.resultado)}` : `<b>${esc(c.nombre)}</b> actualizado.`) +
        (cambioClase ? `<br>Ahora está en la pestaña <b>${esc(claseDe(clase).pestana)}</b>.` : ''));
    } catch (e) {
      aviso('edAviso', 'err', `No se guardó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  /* ================= Productos ================= */

  function formNuevoProducto() {
    ERP.abrirPanel('Nuevo producto', 'Se agrega al catálogo que usan las cargas', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="prNombre" type="text" maxlength="80" placeholder="Mango Ataulfo">
          </div>
          <div class="campo ancho">
            <label>Código de ítem</label>
            <input id="prCodigo" class="mono" type="text" maxlength="20" placeholder="ID-01 (opcional)">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="prGuardar">Crear producto</button>
          <button class="btn-mini gris" id="prCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="prAviso"></div>
      </div>`);
    document.getElementById('prCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('prGuardar').addEventListener('click', guardarNuevoProducto);
    document.getElementById('prNombre').focus();
  }

  async function guardarNuevoProducto() {
    const nombre = document.getElementById('prNombre').value.trim();
    const codigo = document.getElementById('prCodigo').value.trim();
    const btn = document.getElementById('prGuardar');
    limpiarAviso('prAviso');
    if (!nombre) { aviso('prAviso', 'err', 'El nombre es obligatorio.'); return; }

    btn.disabled = true;
    try {
      const data = await rpc('fn_alta_producto', { p_nombre: nombre, p_codigo_item: codigo || null });
      const r = (data && data[0]) || {};
      await refrescar();
      if (r.advertencia) aviso('prAviso', 'warn', `Creado <b>${esc(r.nombre || nombre)}</b>, pero: ${esc(r.advertencia)}`);
      else aviso('prAviso', 'ok', `Producto <b>${esc(r.nombre || nombre)}</b> creado.`);
    } catch (e) {
      aviso('prAviso', 'err', `No se creó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  /* ================= Variedades (E52) ================= */

  function formNuevaVariedad(producto) {
    ERP.abrirPanel(`Nueva variedad — ${esc(producto.nombre)}`, 'Se agrega al catálogo de este producto', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="vrNombre" type="text" maxlength="80" placeholder="Ataulfo temprano">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="vrGuardar">Crear variedad</button>
          <button class="btn-mini gris" id="vrCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="vrAviso"></div>
      </div>`);
    document.getElementById('vrCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('vrGuardar').addEventListener('click', () => guardarNuevaVariedad(producto));
    document.getElementById('vrNombre').focus();
  }

  async function guardarNuevaVariedad(producto) {
    const nombre = document.getElementById('vrNombre').value.trim();
    const btn = document.getElementById('vrGuardar');
    limpiarAviso('vrAviso');
    if (!nombre) { aviso('vrAviso', 'err', 'El nombre es obligatorio.'); return; }

    btn.disabled = true;
    try {
      const data = await rpc('fn_alta_variedad', { p_producto_id: producto.id, p_nombre: nombre });
      const r = (data && data[0]) || {};
      await refrescar();
      if (r.advertencia) aviso('vrAviso', 'warn', `Creada <b>${esc(r.nombre || nombre)}</b>, pero: ${esc(r.advertencia)}`);
      else aviso('vrAviso', 'ok', `Variedad <b>${esc(r.nombre || nombre)}</b> creada para <b>${esc(producto.nombre)}</b>.`);
    } catch (e) {
      aviso('vrAviso', 'err', `No se creó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  /* ================= Editar producto / variedad (Fase 2c, D-136/D-137) =================
     fn_editar_producto(p_id, p_nombre=null, p_codigo_item=null, p_activo=null) — NULL=no tocar.
     fn_editar_variedad(p_id, p_nombre=null, p_activo=null) — NULL=no tocar. Ninguna vista nueva:
     v_catalogo_productos/v_catalogo_variedades ya se leen con `select=*`, así que codigo_item/
     activo llegan en la fila aunque nadie los usara antes — se leen tal cual, sin inventar
     columnas ni pedir nada aparte. */

  function formEditarProducto(p) {
    const inactivo = p.activo === false;
    ERP.abrirPanel(esc(p.nombre), inactivo ? 'Inactivo' : 'Activo', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="prEdNombre" type="text" maxlength="80" value="${esc(p.nombre)}">
          </div>
          <div class="campo ancho">
            <label>Código de ítem</label>
            <input id="prEdCodigo" class="mono" type="text" maxlength="20" value="${esc(p.codigo_item || '')}" placeholder="Opcional">
          </div>
          <div class="campo ancho">
            <label>Estado</label>
            <div class="checks">
              <label><input type="checkbox" id="prEdActivo" ${inactivo ? '' : 'checked'}> Activo (aparece en los combos de producto)</label>
            </div>
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="prEdGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="prEdCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="prEdAviso"></div>
      </div>`);
    document.getElementById('prEdCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('prEdGuardar').addEventListener('click', () => guardarEditarProducto(p));
  }

  async function guardarEditarProducto(p) {
    const nombre = document.getElementById('prEdNombre').value.trim();
    const codigo = document.getElementById('prEdCodigo').value.trim();
    const activo = document.getElementById('prEdActivo').checked;
    const btn = document.getElementById('prEdGuardar');
    limpiarAviso('prEdAviso');
    if (!nombre) { aviso('prEdAviso', 'err', 'El nombre es obligatorio.'); return; }

    const nombreCambio = nombre !== p.nombre;
    const codigoCambio = codigo !== (p.codigo_item || '');
    const activoCambio = activo !== (p.activo !== false);
    if (!nombreCambio && !codigoCambio && !activoCambio) { aviso('prEdAviso', 'warn', 'No cambiaste ningún valor.'); return; }

    btn.disabled = true;
    try {
      await rpc('fn_editar_producto', {
        p_id: p.id,
        p_nombre: nombreCambio ? nombre : null,
        // '' explícito borra el código; NULL = no tocar (mismo criterio que el resto del módulo).
        p_codigo_item: codigoCambio ? codigo : null,
        p_activo: activoCambio ? activo : null
      });
      await refrescar();
      aviso('prEdAviso', 'ok', `<b>${esc(nombre)}</b> actualizado.`);
      setTimeout(ERP.cerrarPanel, 700);
    } catch (e) {
      // El backend rechaza nombre o código duplicado — se muestra tal cual.
      aviso('prEdAviso', 'err', `No se guardó: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  function formEditarVariedad(v, producto) {
    const inactiva = v.activo === false;
    ERP.abrirPanel(`${esc(v.nombre)} — ${esc(producto.nombre)}`, inactiva ? 'Inactiva' : 'Activa', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="vrEdNombre" type="text" maxlength="80" value="${esc(v.nombre)}">
          </div>
          <div class="campo ancho">
            <label>Estado</label>
            <div class="checks">
              <label><input type="checkbox" id="vrEdActivo" ${inactiva ? '' : 'checked'}> Activa (aparece en el selector de variedad)</label>
            </div>
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="vrEdGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="vrEdCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="vrEdAviso"></div>
      </div>`);
    document.getElementById('vrEdCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('vrEdGuardar').addEventListener('click', () => guardarEditarVariedad(v));
  }

  async function guardarEditarVariedad(v) {
    const nombre = document.getElementById('vrEdNombre').value.trim();
    const activo = document.getElementById('vrEdActivo').checked;
    const btn = document.getElementById('vrEdGuardar');
    limpiarAviso('vrEdAviso');
    if (!nombre) { aviso('vrEdAviso', 'err', 'El nombre es obligatorio.'); return; }

    const nombreCambio = nombre !== v.nombre;
    const activoCambio = activo !== (v.activo !== false);
    if (!nombreCambio && !activoCambio) { aviso('vrEdAviso', 'warn', 'No cambiaste ningún valor.'); return; }

    btn.disabled = true;
    try {
      await rpc('fn_editar_variedad', {
        p_id: v.id,
        p_nombre: nombreCambio ? nombre : null,
        p_activo: activoCambio ? activo : null
      });
      await refrescar();
      aviso('vrEdAviso', 'ok', `<b>${esc(nombre)}</b> actualizada.`);
      setTimeout(ERP.cerrarPanel, 700);
    } catch (e) {
      // El backend rechaza nombre duplicado dentro del mismo producto — se muestra tal cual.
      aviso('vrEdAviso', 'err', `No se guardó: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Tablas ================= */

  const deClase = clase => contrapartes.filter(c => c.clase === clase);

  function filtrar() {
    let filas = deClase(pestana);
    if (pestana === 'comercial' && subfiltro !== 'todos') {
      filas = filas.filter(c =>
        subfiltro === 'ambos' ? (c.es_cliente && c.es_proveedor)
          : subfiltro === 'cliente' ? (c.es_cliente && !c.es_proveedor)
            : (c.es_proveedor && !c.es_cliente));
    }
    const t = norm(busqueda);
    if (!t) return filas;
    return filas.filter(c =>
      norm(c.nombre).includes(t) ||
      aliasDe(c).some(a => norm(a).includes(t)) ||
      norm(c.nota).includes(t));
  }

  /** Cliente/Proveedor/Recibe pagos como pills independientes — a diferencia de tipoDe() (que
      conflacta cliente+proveedor en una sola etiqueta para la ficha), aquí las 3 banderas viajan
      por separado porque recibe_pagos aplica sin importar clase (D-125..D-128). */
  function flagsHtml(c) {
    const pills = [];
    if (c.es_cliente) pills.push('<span class="pill">Cliente</span>');
    if (c.es_proveedor) pills.push('<span class="pill ambar">Proveedor</span>');
    if (c.recibe_pagos) pills.push('<span class="pill verde">Recibe pagos</span>');
    return pills.length ? pills.join(' ') : '<span class="sin-alias">—</span>';
  }

  function pintarContrapartes() {
    const filas = filtrar();
    const puedeContra = ERP.puede('capturar');   // gate real de fn_alta/fn_editar_contraparte
    const cont = document.getElementById('catTabla');
    const cl = claseDe(pestana);
    document.getElementById('catConteo').textContent = `${filas.length} de ${deClase(pestana).length}`;

    if (!filas.length) {
      cont.innerHTML = '<div class="vacio">Nada coincide con la búsqueda.</div>';
      return;
    }

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr>
        <th>Nombre</th>
        <th>Clase</th>
        <th>Flags</th>
        <th>Alias</th>
        <th>Ciudad / país</th>
        <th class="num">Días crédito</th>
        <th class="num">Cargas</th>
        <th>Alta por</th>
        ${puedeContra ? '<th></th>' : ''}
      </tr></thead>
      <tbody>${filas.map(c => {
        const al = aliasDe(c);
        const enUso = num(c.num_cargas) > 0;
        const claseFila = claseDe(c.clase);
        const ciudadPais = [c.ciudad, c.pais].filter(Boolean).join(', ');
        const altaPor = c.capturado_por
          ? `<span${c.capturado_ts ? ` title="${esc(fecha4(c.capturado_ts))}"` : ''}>${esc(c.capturado_por)}</span>`
          : '<span style="color:var(--i2)">histórico</span>';
        return `<tr>
          <td><button class="cp-nombre-link" data-ficha="${esc(c.id)}">${esc(c.nombre)}</button>${c.nota ? `<div style="font-size:11px;color:var(--i2)">${esc(c.nota)}</div>` : ''}</td>
          <td><span class="pill gris">${esc(claseFila ? claseFila.pestana : (c.clase || '—'))}</span></td>
          <td>${flagsHtml(c)}</td>
          <td>${al.length
            ? `<span class="alias-lista">${al.map(a => `<span class="alias-chip solo-ver">${esc(a)}</span>`).join('')}</span>`
            : '<span class="sin-alias">—</span>'}</td>
          <td>${ciudadPais || '—'}</td>
          <td class="num">${c.dias_credito == null ? '—' : esc(c.dias_credito)}</td>
          <td class="num" style="${enUso ? 'font-weight:600' : 'color:var(--gris-claro)'}">${esc(c.num_cargas)}</td>
          <td>${altaPor}</td>
          ${puedeContra ? `<td><button class="btn-mini gris" data-id="${esc(c.id)}">Editar</button></td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="leyenda">${cl ? cl.leyenda : ''} Haz clic en un nombre para ver su ficha completa. El nombre no se puede cambiar; para eso están los alias.</div>`;

    cont.querySelectorAll('button[data-ficha]').forEach(b => b.addEventListener('click', () => {
      const c = contrapartes.find(x => String(x.id) === b.dataset.ficha);
      if (c) fichaContraparte(c);
    }));

    if (puedeContra) {
      cont.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => {
        const c = contrapartes.find(x => String(x.id) === b.dataset.id);
        if (c) formEditar(c);
      }));
    }
  }

  function pintarProductos() {
    const t = norm(busqueda);
    const filas = t ? productos.filter(p => norm(p.nombre).includes(t)) : productos;
    const cont = document.getElementById('catTabla');
    // Fase 2c (D-136/D-137): alta Y edición de productos/variedades ya es 'capturar', no 'administrar'.
    const puedeCap = ERP.puede('capturar');
    document.getElementById('catConteo').textContent = `${filas.length} de ${productos.length}`;

    cont.innerHTML = filas.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Producto</th><th>Variedades</th>${puedeCap ? '<th></th>' : ''}</tr></thead>
          <tbody>${filas.map(p => {
            const vs = variedadesDe(p.id);
            const prodInactivo = p.activo === false;
            return `<tr${prodInactivo ? ' style="color:var(--i2)"' : ''}>
              <td>${esc(p.nombre)}${prodInactivo ? ' <span class="pill gris">Inactivo</span>' : ''}</td>
              <td>${vs.length
                ? `<span class="alias-lista">${vs.map(v => {
                    const vInactiva = v.activo === false;
                    const colorInactiva = vInactiva ? ';color:var(--i2)' : '';
                    return puedeCap
                      ? `<button type="button" class="alias-chip" data-editar-variedad="${esc(v.id)}" style="cursor:pointer${colorInactiva}">${esc(v.nombre)}</button>`
                      : `<span class="alias-chip solo-ver"${vInactiva ? ' style="color:var(--i2)"' : ''}>${esc(v.nombre)}</span>`;
                  }).join('')}</span>`
                : '<span class="sin-alias">— sin variedades —</span>'}</td>
              ${puedeCap ? `<td style="white-space:nowrap">
                <button class="btn-mini gris" data-editar-producto="${esc(p.id)}">Editar</button>
                <button class="btn-mini gris" data-variedad="${esc(p.id)}">+ Variedad</button></td>` : ''}
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="leyenda">Estos son los productos que ofrece el combo al crear una carga, con sus variedades. Clic en una variedad para editarla. Un producto o variedad inactivo no se ofrece en los combos nuevos, pero el historial que ya lo usa no se toca.</div>`
      : '<div class="vacio">Nada coincide con la búsqueda.</div>';

    if (puedeCap) {
      cont.querySelectorAll('button[data-variedad]').forEach(b => b.addEventListener('click', () => {
        const p = productos.find(x => String(x.id) === b.dataset.variedad);
        if (p) formNuevaVariedad(p);
      }));
      cont.querySelectorAll('button[data-editar-producto]').forEach(b => b.addEventListener('click', () => {
        const p = productos.find(x => String(x.id) === b.dataset.editarProducto);
        if (p) formEditarProducto(p);
      }));
      cont.querySelectorAll('button[data-editar-variedad]').forEach(b => b.addEventListener('click', () => {
        const v = variedades.find(x => String(x.id) === b.dataset.editarVariedad);
        if (!v) return;
        const p = productos.find(x => String(x.id) === String(v.producto_id));
        if (p) formEditarVariedad(v, p);
      }));
    }
  }

  /* ================= Conceptos de costo (P2, D-129/D-130) =================
     v_conceptos_costo_admin (id, nombre, activo). Sin borrado — desactivar (activo=false) es la
     forma de "retirarlo" del picker de "+ Agregar costo" en la ficha de carga (modulo-cargas.js
     ya filtra ese picker contra v_catalogo_conceptos_costo, que solo trae los activos — verificado
     por el nombre de la vista y el patrón ya usado ahí; esta pantalla no la toca). */

  function pintarConceptosCosto() {
    const t = norm(busqueda);
    const filas = t ? conceptosCosto.filter(c => norm(c.nombre).includes(t)) : conceptosCosto;
    const cont = document.getElementById('catTabla');
    const puedeCap = ERP.puede('capturar');
    document.getElementById('catConteo').textContent = `${filas.length} de ${conceptosCosto.length}`;

    cont.innerHTML = filas.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Concepto</th><th>Estado</th>${puedeCap ? '<th></th>' : ''}</tr></thead>
          <tbody>${filas.map(c => `<tr>
              <td>${esc(c.nombre)}</td>
              <td><span class="pill${c.activo ? '' : ' gris'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
              ${puedeCap ? `<td><button class="btn-mini gris" data-id="${esc(c.id)}">Editar</button></td>` : ''}
            </tr>`).join('')}</tbody>
        </table></div>
        <div class="leyenda">Estos son los conceptos que ofrece "+ Agregar costo" en la ficha de un embarque. No hay borrado — desactivar un concepto lo retira del selector sin perder el historial de costos ya capturados con él.</div>`
      : '<div class="vacio">Nada coincide con la búsqueda.</div>';

    if (puedeCap) {
      cont.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => {
        const c = conceptosCosto.find(x => String(x.id) === b.dataset.id);
        if (c) formEditarConcepto(c);
      }));
    }
  }

  function formNuevoConcepto() {
    ERP.abrirPanel('Nuevo concepto de costo', 'Se agrega al selector de "+ Agregar costo"', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="ccNombre" type="text" maxlength="80" placeholder="Ej. Fletes, Aduanas, Empaque…">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="ccGuardar">Crear concepto</button>
          <button class="btn-mini gris" id="ccCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ccAviso"></div>
      </div>`);
    document.getElementById('ccCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('ccGuardar').addEventListener('click', guardarNuevoConcepto);
    document.getElementById('ccNombre').focus();
  }

  async function guardarNuevoConcepto() {
    const nombre = document.getElementById('ccNombre').value.trim();
    const btn = document.getElementById('ccGuardar');
    limpiarAviso('ccAviso');
    if (!nombre) { aviso('ccAviso', 'err', 'El nombre es obligatorio.'); return; }

    btn.disabled = true;
    try {
      const data = await rpc('fn_alta_concepto_costo', { p_nombre: nombre });
      const r = (data && data[0]) || {};
      await refrescar();
      aviso('ccAviso', 'ok', `Concepto <b>${esc(r.nombre || nombre)}</b> creado.`);
    } catch (e) {
      // El backend rechaza vacío/duplicado (case-insensitive) con mensaje claro — se muestra tal cual.
      aviso('ccAviso', 'err', `No se creó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  function formEditarConcepto(c) {
    ERP.abrirPanel(esc(c.nombre), c.activo ? 'Activo' : 'Inactivo', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="ceNombre" type="text" maxlength="80" value="${esc(c.nombre)}">
          </div>
          <div class="campo ancho">
            <label>Estado</label>
            <div class="checks">
              <label><input type="checkbox" id="ceActivo" ${c.activo ? 'checked' : ''}> Activo (aparece en el selector de "+ Agregar costo")</label>
            </div>
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="ceGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="ceCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ceAviso"></div>
      </div>`);
    document.getElementById('ceCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('ceGuardar').addEventListener('click', () => guardarEditarConcepto(c));
  }

  async function guardarEditarConcepto(c) {
    const nombre = document.getElementById('ceNombre').value.trim();
    const activo = document.getElementById('ceActivo').checked;
    const btn = document.getElementById('ceGuardar');
    limpiarAviso('ceAviso');
    if (!nombre) { aviso('ceAviso', 'err', 'El nombre es obligatorio.'); return; }

    const nombreCambio = nombre !== c.nombre;
    const activoCambio = activo !== c.activo;
    if (!nombreCambio && !activoCambio) { aviso('ceAviso', 'warn', 'No cambiaste ningún valor.'); return; }

    btn.disabled = true;
    try {
      await rpc('fn_editar_concepto_costo', {
        p_id: c.id,
        p_nombre: nombreCambio ? nombre : null,
        p_activo: activoCambio ? activo : null
      });
      await refrescar();
      aviso('ceAviso', 'ok', `<b>${esc(nombre)}</b> actualizado.`);
      setTimeout(ERP.cerrarPanel, 700);
    } catch (e) {
      // El backend rechaza renombrar a un nombre que ya existe — se muestra tal cual.
      aviso('ceAviso', 'err', `No se guardó: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Cuentas (P2, D-131/D-132) =================
     v_cuentas_admin (id, nombre, banco, moneda, tipo, capturado_por, capturado_ts, saldo,
     tiene_movimientos). tipo='banco' (editable aquí) vs 'virtual' (bolsa de socio — JEAMS,
     Samuel — de solo lectura: se gestiona en backend porque toca el balance). fn_alta_cuenta SOLO
     crea bancarias (esta pantalla nunca manda otro p_tipo); fn_editar_cuenta nunca cambia el tipo. */

  function pintarCuentasAdmin() {
    const t = norm(busqueda);
    const pasaFiltro = c => !t || norm(c.id).includes(t) || norm(c.nombre).includes(t) || norm(c.banco || '').includes(t);
    const filas = cuentas.filter(pasaFiltro);
    const cont = document.getElementById('catTabla');
    const puedeCap = ERP.puede('capturar');
    document.getElementById('catConteo').textContent = `${filas.length} de ${cuentas.length}`;

    const bancos = filas.filter(c => c.tipo === 'banco');
    const virtuales = filas.filter(c => c.tipo === 'virtual');

    const altaPor = c => c.capturado_por
      ? `<span${c.capturado_ts ? ` title="${esc(fecha4(c.capturado_ts))}"` : ''}>${esc(c.capturado_por)}</span>`
      : '<span style="color:var(--i2)">histórico</span>';

    const filaBanco = c => `<tr>
        <td class="mono">${esc(c.id)}</td>
        <td>${esc(c.nombre)}</td>
        <td>${esc(c.banco || '—')}</td>
        <td>${esc(c.moneda || '—')}</td>
        <td><span class="pill">Banco</span></td>
        <td class="num">${usd(c.saldo)}</td>
        <td>${altaPor(c)}</td>
        ${puedeCap ? `<td><button class="btn-mini gris" data-id="${esc(c.id)}">Editar</button></td>` : ''}
      </tr>`;
    const filaVirtual = c => `<tr>
        <td class="mono">${esc(c.id)}</td>
        <td>${esc(c.nombre)}</td>
        <td>—</td>
        <td>${esc(c.moneda || '—')}</td>
        <td><span class="pill gris">Virtual</span></td>
        <td class="num">${usd(c.saldo)}</td>
        <td>${altaPor(c)}</td>
        ${puedeCap ? '<td></td>' : ''}
      </tr>`;

    const tablaBancos = bancos.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Id</th><th>Nombre</th><th>Banco</th><th>Moneda</th><th>Tipo</th><th class="num">Saldo</th><th>Alta por</th>${puedeCap ? '<th></th>' : ''}</tr></thead>
          <tbody>${bancos.map(filaBanco).join('')}</tbody>
        </table></div>`
      : '<div class="vacio">Sin cuentas de banco que coincidan.</div>';

    const tablaVirtuales = virtuales.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Id</th><th>Nombre</th><th>—</th><th>Moneda</th><th>Tipo</th><th class="num">Saldo</th><th>Alta por</th>${puedeCap ? '<th></th>' : ''}</tr></thead>
          <tbody>${virtuales.map(filaVirtual).join('')}</tbody>
        </table></div>
        <div class="leyenda">Bolsa virtual de socio — se gestiona en backend (toca el balance). No se ofrece editar ni borrar desde aquí.</div>`
      : '';

    cont.innerHTML = `
      <div class="seccion-head"><h4>Cuentas de banco</h4></div>
      ${tablaBancos}
      ${virtuales.length ? `<div class="seccion-head"><h4>Cuentas virtuales (socios)</h4></div>${tablaVirtuales}` : ''}`;

    if (puedeCap) {
      cont.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => {
        const c = cuentas.find(x => String(x.id) === b.dataset.id);
        if (c && c.tipo === 'banco') formEditarCuenta(c);
      }));
    }
  }

  function formNuevaCuenta() {
    ERP.abrirPanel('Nueva cuenta de banco', 'Cuenta bancaria real (las virtuales de socio se gestionan en backend)', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo">
            <label>Id <span class="req">*</span></label>
            <input id="cuId" class="mono" type="text" maxlength="20" placeholder="ej. JPM">
            <div class="alias-ayuda">Se guarda en MAYÚSCULAS (ej. JPM, BANORTE).</div>
          </div>
          <div class="campo">
            <label>Moneda</label>
            <input id="cuMoneda" class="mono" type="text" maxlength="10" value="USD">
          </div>
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="cuNombre" type="text" maxlength="120" placeholder="Nombre de la cuenta">
          </div>
          <div class="campo ancho">
            <label>Banco</label>
            <input id="cuBanco" type="text" maxlength="80" placeholder="Ej. JP Morgan Chase (opcional)">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="cuGuardar">Crear cuenta</button>
          <button class="btn-mini gris" id="cuCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="cuAviso"></div>
      </div>`);
    document.getElementById('cuCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('cuGuardar').addEventListener('click', guardarNuevaCuenta);
    document.getElementById('cuId').focus();
  }

  async function guardarNuevaCuenta() {
    const id = document.getElementById('cuId').value.trim();
    const nombre = document.getElementById('cuNombre').value.trim();
    const banco = document.getElementById('cuBanco').value.trim();
    const moneda = document.getElementById('cuMoneda').value.trim();
    const btn = document.getElementById('cuGuardar');
    limpiarAviso('cuAviso');
    if (!id) { aviso('cuAviso', 'err', 'El id es obligatorio.'); return; }
    if (!nombre) { aviso('cuAviso', 'err', 'El nombre es obligatorio.'); return; }

    btn.disabled = true;
    try {
      const data = await rpc('fn_alta_cuenta', {
        p_id: id,
        p_nombre: nombre,
        p_banco: banco || null,
        p_moneda: moneda || 'USD',
        p_tipo: 'banco'   // esta pantalla SOLO crea cuentas de banco real (el backend rechaza cualquier otro tipo)
      });
      const r = (data && data[0]) || {};
      await refrescar();
      aviso('cuAviso', 'ok', `Cuenta <b>${esc(r.id || id)}</b> creada.`);
    } catch (e) {
      // El backend rechaza id duplicado y tipo != 'banco' con mensaje claro — se muestra tal cual.
      aviso('cuAviso', 'err', `No se creó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  function formEditarCuenta(c) {
    ERP.abrirPanel(esc(c.nombre),
      `Cuenta ${esc(c.id)}` + (c.tiene_movimientos ? ' · tiene movimientos registrados' : ''), `
      <div class="form-erp">
        <div class="campos">
          <div class="campo">
            <label>Id</label>
            <div class="campo-fijo mono">${esc(c.id)}<div class="aclara">No se puede cambiar.</div></div>
          </div>
          <div class="campo">
            <label>Moneda</label>
            <input id="edCuMoneda" class="mono" type="text" maxlength="10" value="${esc(c.moneda || '')}">
          </div>
          <div class="campo ancho">
            <label>Nombre</label>
            <input id="edCuNombre" type="text" maxlength="120" value="${esc(c.nombre || '')}">
          </div>
          <div class="campo ancho">
            <label>Banco</label>
            <input id="edCuBanco" type="text" maxlength="80" value="${esc(c.banco || '')}">
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="edCuGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="edCuCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="edCuAviso"></div>
      </div>`);
    document.getElementById('edCuCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('edCuGuardar').addEventListener('click', () => guardarEditarCuenta(c));
  }

  async function guardarEditarCuenta(c) {
    const nombre = document.getElementById('edCuNombre').value.trim();
    const banco = document.getElementById('edCuBanco').value.trim();
    const moneda = document.getElementById('edCuMoneda').value.trim();
    const btn = document.getElementById('edCuGuardar');
    limpiarAviso('edCuAviso');
    if (!nombre) { aviso('edCuAviso', 'err', 'El nombre es obligatorio.'); return; }
    if (!moneda) { aviso('edCuAviso', 'err', 'La moneda es obligatoria.'); return; }

    const nombreCambio = nombre !== (c.nombre || '');
    const bancoCambio = banco !== (c.banco || '');
    const monedaCambio = moneda !== (c.moneda || '');
    if (!nombreCambio && !bancoCambio && !monedaCambio) { aviso('edCuAviso', 'warn', 'No cambiaste ningún valor.'); return; }

    btn.disabled = true;
    try {
      await rpc('fn_editar_cuenta', {
        p_id: c.id,
        p_nombre: nombreCambio ? nombre : null,
        p_banco: bancoCambio ? (banco || '') : null,
        p_moneda: monedaCambio ? moneda : null
      });
      await refrescar();
      aviso('edCuAviso', 'ok', `Cuenta <b>${esc(c.id)}</b> actualizada.`);
      setTimeout(ERP.cerrarPanel, 700);
    } catch (e) {
      aviso('edCuAviso', 'err', `No se guardó: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Categorías de deducción (Fase 2a, D-134) =================
     v_categorias_deduccion_admin (id, codigo, nombre, activo, orden, capturado_por, capturado_ts).
     Mismo patrón exacto que Conceptos de costo: sin borrado, desactivar la retira del selector de
     "+ Agregar deducción" (modulo-liquidaciones.js, que ahora lee v_categorias_deduccion — solo
     activas — en vez del hardcode CATEGORIAS/CAT_LABEL que tenía antes). El código lo normaliza
     el BACKEND (minúsculas_con_guiones); aquí solo se manda el nombre tal cual lo escribe el
     usuario como p_codigo Y p_nombre — la vista previa de abajo es puramente cosmética. */

  /** Aproximación cliente de la normalización del backend, SOLO para la vista previa — nunca se
      manda: el código real lo decide y valida el backend (rechaza duplicados). Reusa ERP.norm()
      (minúsculas + sin acentos, mismo criterio que la búsqueda) y solo agrega guiones bajos. */
  function previsualizarCodigoDed(nombre) {
    return norm(nombre).trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function pintarCategoriasDeduccion() {
    const t = norm(busqueda);
    const filas = t ? categoriasDed.filter(c => norm(c.nombre).includes(t) || norm(c.codigo).includes(t)) : categoriasDed;
    const cont = document.getElementById('catTabla');
    const puedeCap = ERP.puede('capturar');
    document.getElementById('catConteo').textContent = `${filas.length} de ${categoriasDed.length}`;

    const altaPor = c => c.capturado_por
      ? `<span${c.capturado_ts ? ` title="${esc(fecha4(c.capturado_ts))}"` : ''}>${esc(c.capturado_por)}</span>`
      : '<span style="color:var(--i2)">histórico</span>';

    cont.innerHTML = filas.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Nombre</th><th>Código</th><th>Estado</th><th>Alta por</th>${puedeCap ? '<th></th>' : ''}</tr></thead>
          <tbody>${filas.map(c => `<tr>
              <td>${esc(c.nombre)}</td>
              <td class="mono" style="color:var(--gris)">${esc(c.codigo)}</td>
              <td><span class="pill${c.activo ? '' : ' gris'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
              <td>${altaPor(c)}</td>
              ${puedeCap ? `<td><button class="btn-mini gris" data-id="${esc(c.id)}">Editar</button></td>` : ''}
            </tr>`).join('')}</tbody>
        </table></div>
        <div class="leyenda">Estas son las categorías que ofrece "+ Agregar deducción" en una liquidación. No hay borrado — desactivar una categoría la retira del selector sin perder el historial de deducciones ya capturadas con ella.</div>`
      : '<div class="vacio">Nada coincide con la búsqueda.</div>';

    if (puedeCap) {
      cont.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => {
        const c = categoriasDed.find(x => String(x.id) === b.dataset.id);
        if (c) formEditarCategoriaDeduccion(c);
      }));
    }
  }

  function formNuevaCategoriaDeduccion() {
    ERP.abrirPanel('Nueva categoría de deducción', 'Se agrega al selector de "+ Agregar deducción"', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="cdNombre" type="text" maxlength="80" placeholder="Ej. Seguro Carga">
            <div class="alias-ayuda" id="cdCodigoPreview"></div>
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="cdGuardar">Crear categoría</button>
          <button class="btn-mini gris" id="cdCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="cdAviso"></div>
      </div>`);
    const inp = document.getElementById('cdNombre');
    const prev = document.getElementById('cdCodigoPreview');
    const actualizarPreview = () => {
      const cod = previsualizarCodigoDed(inp.value);
      prev.textContent = cod ? `Código estimado: ${cod} (lo normaliza el backend)` : '';
    };
    inp.addEventListener('input', actualizarPreview);
    document.getElementById('cdCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('cdGuardar').addEventListener('click', guardarNuevaCategoriaDeduccion);
    inp.focus();
  }

  async function guardarNuevaCategoriaDeduccion() {
    const nombre = document.getElementById('cdNombre').value.trim();
    const btn = document.getElementById('cdGuardar');
    limpiarAviso('cdAviso');
    if (!nombre) { aviso('cdAviso', 'err', 'El nombre es obligatorio.'); return; }

    btn.disabled = true;
    try {
      // Mínimo un campo: se manda el mismo texto como codigo Y nombre — el backend normaliza
      // el codigo a minúsculas_con_guiones y rechaza duplicados con mensaje claro.
      const data = await rpc('fn_alta_categoria_deduccion', { p_codigo: nombre, p_nombre: nombre });
      const r = (data && data[0]) || {};
      await refrescar();
      aviso('cdAviso', 'ok', `Categoría <b>${esc(r.nombre || nombre)}</b> creada${r.codigo ? ` (código <span class="mono">${esc(r.codigo)}</span>)` : ''}.`);
    } catch (e) {
      // El backend rechaza vacío/duplicado con mensaje claro — se muestra tal cual.
      aviso('cdAviso', 'err', `No se creó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  function formEditarCategoriaDeduccion(c) {
    ERP.abrirPanel(esc(c.nombre), `Código ${esc(c.codigo)} · ${c.activo ? 'Activo' : 'Inactivo'}`, `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="ceDedNombre" type="text" maxlength="80" value="${esc(c.nombre)}">
          </div>
          <div class="campo ancho">
            <label>Estado</label>
            <div class="checks">
              <label><input type="checkbox" id="ceDedActivo" ${c.activo ? 'checked' : ''}> Activo (aparece en el selector de "+ Agregar deducción")</label>
            </div>
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="ceDedGuardar">Guardar cambios</button>
          <button class="btn-mini gris" id="ceDedCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="ceDedAviso"></div>
      </div>`);
    document.getElementById('ceDedCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('ceDedGuardar').addEventListener('click', () => guardarEditarCategoriaDeduccion(c));
  }

  async function guardarEditarCategoriaDeduccion(c) {
    const nombre = document.getElementById('ceDedNombre').value.trim();
    const activo = document.getElementById('ceDedActivo').checked;
    const btn = document.getElementById('ceDedGuardar');
    limpiarAviso('ceDedAviso');
    if (!nombre) { aviso('ceDedAviso', 'err', 'El nombre es obligatorio.'); return; }

    const nombreCambio = nombre !== c.nombre;
    const activoCambio = activo !== c.activo;
    if (!nombreCambio && !activoCambio) { aviso('ceDedAviso', 'warn', 'No cambiaste ningún valor.'); return; }

    btn.disabled = true;
    try {
      await rpc('fn_editar_categoria_deduccion', {
        p_id: c.id,
        p_nombre: nombreCambio ? nombre : null,
        p_activo: activoCambio ? activo : null
      });
      await refrescar();
      aviso('ceDedAviso', 'ok', `<b>${esc(nombre)}</b> actualizada.`);
      setTimeout(ERP.cerrarPanel, 700);
    } catch (e) {
      aviso('ceDedAviso', 'err', `No se guardó: ${esc(e.message)}`);
      btn.disabled = false;
    }
  }

  /* ================= Categorías de gasto (Fase 2b, D-135) =================
     v_categorias_gasto_admin (tipo, grupo, activo, linea, usos). Sin id numérico: `tipo` ES la
     llave (fn_editar_categoria_gasto la recibe como p_tipo, no hay rename posible — solo
     activar/desactivar). El grupo (gasto_operativo | gasto_financiero) define el comportamiento
     contable que el tipo nuevo clona; nunca se ofrece un tercer grupo "estructural" desde aquí
     (el backend lo rechazaría). Alimenta el selector "Tipo de gasto" de Registrar gasto en
     Tesorería (v_categorias_gasto, solo activas — modulo-tesoreria.js no se toca aquí). */

  function pintarCategoriasGasto() {
    const t = norm(busqueda);
    const filas = t ? categoriasGasto.filter(c => norm(c.tipo).includes(t)) : categoriasGasto;
    const cont = document.getElementById('catTabla');
    const puedeCap = ERP.puede('capturar');
    document.getElementById('catConteo').textContent = `${filas.length} de ${categoriasGasto.length}`;

    const grupoTxt = g => g === 'gasto_financiero' ? 'Financiero' : 'Operativo';
    const grupoPill = g => g === 'gasto_financiero' ? 'pill ambar' : 'pill';

    cont.innerHTML = filas.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Tipo</th><th>Grupo</th><th>Estado</th><th class="num">Usos</th>${puedeCap ? '<th></th>' : ''}</tr></thead>
          <tbody>${filas.map(c => `<tr>
              <td>${esc(c.tipo)}</td>
              <td><span class="${grupoPill(c.grupo)}">${esc(grupoTxt(c.grupo))}</span></td>
              <td><span class="pill${c.activo ? '' : ' gris'}">${c.activo ? 'Activo' : 'Inactivo'}</span></td>
              <td class="num">${c.usos == null ? '—' : esc(c.usos)}</td>
              ${puedeCap ? `<td><button class="btn-mini gris" data-tipo="${esc(c.tipo)}" data-activar="${c.activo ? '0' : '1'}">${c.activo ? 'Desactivar' : 'Activar'}</button></td>` : ''}
            </tr>`).join('')}</tbody>
        </table></div>
        <div class="leyenda">Estos son los tipos que ofrece "Registrar gasto" en Tesorería. Sin renombrar ni borrar — desactivar un tipo lo retira del selector sin perder el historial de gastos ya capturados con él (columna Usos).</div>`
      : '<div class="vacio">Nada coincide con la búsqueda.</div>';

    if (puedeCap) {
      cont.querySelectorAll('button[data-tipo]').forEach(b => b.addEventListener('click', () => {
        const c = categoriasGasto.find(x => x.tipo === b.dataset.tipo);
        if (c) alternarActivoCategoriaGasto(c, b.dataset.activar === '1');
      }));
    }
  }

  /** Toggle inline (sin panel): es el único campo editable, un drawer completo sería de más.
      Si ya tiene usos y se va a desactivar, se avisa antes — no bloquea, solo informa. */
  async function alternarActivoCategoriaGasto(c, nuevoActivo) {
    if (!nuevoActivo && num(c.usos) > 0) {
      const ok = window.confirm(`"${c.tipo}" tiene ${c.usos} gasto${c.usos === 1 ? '' : 's'} capturado${c.usos === 1 ? '' : 's'}.\n\nDesactivarla la retira del selector de "Registrar gasto" — NO afecta el historial ya capturado.\n\n¿Continuar?`);
      if (!ok) return;
    }
    try {
      await rpc('fn_editar_categoria_gasto', { p_tipo: c.tipo, p_activo: nuevoActivo });
      await refrescar();
      ERP.toast('ok', `<b>${esc(c.tipo)}</b> ${nuevoActivo ? 'activada' : 'desactivada'}.`);
    } catch (e) {
      if (!ERP.avisarSiPermiso(e)) ERP.toast('err', `No se pudo actualizar: ${esc(e.message)}`);
    }
  }

  function formNuevaCategoriaGasto() {
    ERP.abrirPanel('Nueva categoría de gasto', 'Se agrega al selector de "Registrar gasto" en Tesorería', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo ancho">
            <label>Nombre <span class="req">*</span></label>
            <input id="cgNombre" type="text" maxlength="80" placeholder="Ej. Renta de bodega">
          </div>
          <div class="campo ancho">
            <label>Tipo</label>
            <select id="cgGrupo">
              <option value="gasto_operativo" selected>Operativo</option>
              <option value="gasto_financiero">Financiero</option>
            </select>
            <div class="alias-ayuda">El tipo nuevo clona el comportamiento contable del grupo elegido.</div>
          </div>
        </div>
        <div class="acciones">
          <button class="btn-mini" id="cgGuardar">Crear categoría</button>
          <button class="btn-mini gris" id="cgCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="cgAviso"></div>
      </div>`);
    document.getElementById('cgCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('cgGuardar').addEventListener('click', guardarNuevaCategoriaGasto);
    document.getElementById('cgNombre').focus();
  }

  async function guardarNuevaCategoriaGasto() {
    const nombre = document.getElementById('cgNombre').value.trim();
    const grupo = document.getElementById('cgGrupo').value;
    const btn = document.getElementById('cgGuardar');
    limpiarAviso('cgAviso');
    if (!nombre) { aviso('cgAviso', 'err', 'El nombre es obligatorio.'); return; }

    btn.disabled = true;
    try {
      // El backend rechaza p_grupo fuera de {gasto_operativo,gasto_financiero} y nombres
      // duplicados — el mensaje se muestra tal cual.
      const data = await rpc('fn_alta_categoria_gasto', { p_nombre: nombre, p_grupo: grupo });
      const r = (data && data[0]) || {};
      await refrescar();
      aviso('cgAviso', 'ok', `Categoría <b>${esc(r.tipo || nombre)}</b> creada.`);
    } catch (e) {
      aviso('cgAviso', 'err', `No se creó: ${esc(e.message)}`);
    }
    btn.disabled = false;
  }

  const pintarTabla = () => {
    if (pestana === 'productos') return pintarProductos();
    if (pestana === 'conceptos') return pintarConceptosCosto();
    if (pestana === 'cuentas') return pintarCuentasAdmin();
    if (pestana === 'deducciones') return pintarCategoriasDeduccion();
    if (pestana === 'gastos') return pintarCategoriasGasto();
    return pintarContrapartes();
  };

  /* ================= Datos ================= */

  /** Índice simple filas[] -> Map(valor[campo] -> fila), para lookups O(1) por nombre. */
  const indexarPor = (filas, campo) => {
    const m = new Map();
    (filas || []).forEach(f => m.set(f[campo], f));
    return m;
  };
  /** Índice filas[] -> Map(valor[campo] -> fila[]), para claves con VARIAS filas (ej. una
      contraparte en varios programas comerciales, o con ambos roles). */
  const indexarPorLista = (filas, campo) => {
    const m = new Map();
    (filas || []).forEach(f => {
      const k = f[campo];
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(f);
    });
    return m;
  };

  async function traer() {
    let cxcCliente, cxpProveedor, agingCliente, diasPago, contraparteProgramas, contraparteRecencia, directorio;
    [contrapartes, productos, variedades, cxcCliente, cxpProveedor, agingCliente, diasPago, contraparteProgramas, contraparteRecencia, directorio, conceptosCosto, cuentas, categoriasDed, categoriasGasto] = await Promise.all([
      q('v_catalogo_admin', '&order=nombre.asc'),
      q('v_catalogo_productos', '&order=nombre.asc'),
      q('v_catalogo_variedades', '&order=producto_id.asc,nombre.asc'),
      // Panel de relación financiera (sitting 2) + Programas (sitting 3) + Recencia (sitting 4):
      // enriquecen la ficha de detalle, no la lista principal — si una de estas vistas chicas
      // falla, degrada a "sin datos" en vez de tumbar todo el Directorio Comercial.
      q('v_cxc_cliente').catch(() => []),
      q('v_cxp_proveedor').catch(() => []),
      q('v_cxc_aging_cliente').catch(() => []),
      q('v_dias_pago_observado').catch(() => []),
      q('v_contraparte_programas').catch(() => []),
      q('v_contraparte_recencia').catch(() => []),
      // P1 (D-125..D-128): vista nueva, más angosta, con los 4 campos que v_catalogo_admin no
      // tiene todavía (recibe_pagos, capturado_por, capturado_ts, tiene_movimientos). Se funde en
      // `contrapartes` por id en vez de reemplazar v_catalogo_admin — esa sigue siendo la fuente
      // de razón social/facturación/direcciones/num_cargas que ya usan la ficha y el editor.
      q('v_directorio_contrapartes', '&order=nombre.asc').catch(() => []),
      // P2 (D-129..D-132): pestañas nuevas "Conceptos de costo" y "Cuentas" — activos primero /
      // bancos primero, cada una ordena lo que necesita su propia sección de la tabla.
      q('v_conceptos_costo_admin', '&order=activo.desc,nombre.asc'),
      q('v_cuentas_admin', '&order=tipo.asc,nombre.asc'),
      // Fase 2a (D-134): "Categorías de deducción" — activas primero, mismo criterio que Conceptos.
      q('v_categorias_deduccion_admin', '&order=activo.desc,orden.asc,nombre.asc'),
      // Fase 2b (D-135): "Categorías de gasto" — activas primero, orden alfabético por tipo
      // (que es a la vez el nombre visible y la llave — sin id numérico en esta vista).
      q('v_categorias_gasto_admin', '&order=activo.desc,tipo.asc')
    ]);
    cxcPorCliente = indexarPor(cxcCliente, 'cliente');
    cxpPorProveedor = indexarPor(cxpProveedor, 'proveedor');
    agingPorCliente = indexarPor(agingCliente, 'cliente');
    diasPagoPorCliente = indexarPor(diasPago, 'cliente');
    programasPorContraparte = indexarPorLista(contraparteProgramas, 'contraparte');
    recenciaPorContraparte = indexarPor(contraparteRecencia, 'contraparte');
    const directorioPorId = indexarPor(directorio, 'id');
    contrapartes.forEach(c => {
      const d = directorioPorId.get(c.id);
      c.recibe_pagos = d ? d.recibe_pagos === true : false;
      c.capturado_por = d ? d.capturado_por : null;
      c.capturado_ts = d ? d.capturado_ts : null;
      c.tiene_movimientos = d ? d.tiene_movimientos === true : null;   // null = no se pudo confirmar (vista caída)
    });
  }

  const variedadesDe = productoId => variedades.filter(v => String(v.producto_id) === String(productoId));

  /** Tras escribir: los combos de "Nueva carga" leen estos mismos catálogos. */
  async function refrescar() {
    ERP.marcarDatosSucios();
    await traer();
    pintarTabla();
  }

  /* ================= Módulo ================= */

  /** Si el backend introduce una clase que este frontend no conoce, esas filas
      no caerían en ninguna pestaña. Mejor decirlo que perderlas en silencio. */
  function huerfanas() {
    return contrapartes.filter(c => !ES_CLASE.includes(c.clase));
  }

  function barra() {
    // Fase 2c (D-136/D-137): productos/variedades se movieron de 'administrar' a 'capturar' —
    // mismo gate que contrapartes/conceptos/cuentas/deducciones/gastos. Ya no queda ninguna
    // pestaña de este módulo gateada a 'administrar'.
    const puedeCap = ERP.puede('capturar');
    const esProductos = pestana === 'productos';
    const esConceptos = pestana === 'conceptos';
    const esCuentas = pestana === 'cuentas';
    const esDeducciones = pestana === 'deducciones';
    const esGastos = pestana === 'gastos';
    const puedeAlta = puedeCap;
    const cl = claseDe(pestana);
    const sueltas = huerfanas();

    const placeholder = esProductos ? 'Buscar producto…'
      : esConceptos ? 'Buscar concepto…'
      : esCuentas ? 'Buscar por id, nombre o banco…'
      : esDeducciones ? 'Buscar por nombre o código…'
      : esGastos ? 'Buscar por tipo…'
      : 'Buscar por nombre, alias o nota…';
    const labelNuevo = esProductos ? '+ Nuevo producto'
      : esConceptos ? '+ Nuevo concepto'
      : esCuentas ? '+ Nueva cuenta de banco'
      : esDeducciones ? '+ Nueva categoría'
      : esGastos ? '+ Nueva categoría de gasto'
      : (cl ? cl.alta : '+ Nuevo');
    const soloLecturaTxt = 'necesitas permiso de captura';

    return `
      ${sueltas.length ? `<div class="errbox">Hay ${sueltas.length} registro${sueltas.length === 1 ? '' : 's'}
        con una clase que esta pantalla no conoce (${esc([...new Set(sueltas.map(c => c.clase))].join(', '))})
        y no aparecen en ninguna pestaña.</div>` : ''}

      <div class="pestanas">
        ${CLASES.map(c => `<button class="pestana ${pestana === c.id ? 'activa' : ''}" data-pestana="${esc(c.id)}">
          ${esc(c.pestana)} <span class="cuenta">${deClase(c.id).length}</span></button>`).join('')}
        <button class="pestana ${esProductos ? 'activa' : ''}" data-pestana="productos">
          Productos <span class="cuenta">${productos.length}</span></button>
        <button class="pestana ${esConceptos ? 'activa' : ''}" data-pestana="conceptos">
          Conceptos de costo <span class="cuenta">${conceptosCosto.length}</span></button>
        <button class="pestana ${esCuentas ? 'activa' : ''}" data-pestana="cuentas">
          Cuentas <span class="cuenta">${cuentas.length}</span></button>
        <button class="pestana ${esDeducciones ? 'activa' : ''}" data-pestana="deducciones">
          Categorías de deducción <span class="cuenta">${categoriasDed.length}</span></button>
        <button class="pestana ${esGastos ? 'activa' : ''}" data-pestana="gastos">
          Categorías de gasto <span class="cuenta">${categoriasGasto.length}</span></button>
      </div>

      ${pestana === 'comercial' ? `<div class="filtros" id="catSub">
        ${SUBFILTROS.map(s => `<button class="chip ${subfiltro === s.id ? 'activo' : ''}" data-sub="${esc(s.id)}">${esc(s.txt)}</button>`).join('')}
      </div>` : ''}

      <div class="filtros">
        <input class="busca" id="catBusca" type="text"
               placeholder="${placeholder}"
               value="${esc(busqueda)}">
        ${puedeAlta
          ? `<button class="btn-mini" id="catNuevo">${esc(labelNuevo)}</button>`
          : `<span class="solo-lectura">Solo lectura — ${soloLecturaTxt}</span>`}
        <span class="conteo" id="catConteo"></span>
      </div>
      <div class="card" style="padding:14px"><div id="catTabla"></div></div>`;
  }

  function conectar(cont) {
    cont.querySelectorAll('.pestana').forEach(p => p.addEventListener('click', () => {
      if (p.dataset.pestana === pestana) return;
      pestana = p.dataset.pestana;
      subfiltro = 'todos';
      busqueda = '';
      cont.innerHTML = barra();
      conectar(cont);
      pintarTabla();
    }));

    cont.querySelectorAll('#catSub .chip').forEach(ch => ch.addEventListener('click', () => {
      cont.querySelectorAll('#catSub .chip').forEach(o => o.classList.remove('activo'));
      ch.classList.add('activo');
      subfiltro = ch.dataset.sub;
      pintarTabla();
    }));

    let tempo;
    document.getElementById('catBusca').addEventListener('input', e => {
      clearTimeout(tempo);
      tempo = setTimeout(() => { busqueda = e.target.value; pintarTabla(); }, 150);
    });

    const nuevo = document.getElementById('catNuevo');
    if (nuevo) nuevo.addEventListener('click', () => {
      if (pestana === 'productos') return formNuevoProducto();
      if (pestana === 'conceptos') return formNuevoConcepto();
      if (pestana === 'cuentas') return formNuevaCuenta();
      if (pestana === 'deducciones') return formNuevaCategoriaDeduccion();
      if (pestana === 'gastos') return formNuevaCategoriaGasto();
      return formNueva(pestana);
    });
  }

  async function render(cont) {
    await traer();
    pestana = 'comercial';
    subfiltro = 'todos';
    busqueda = '';
    cont.innerHTML = `<div class="pantalla-catalogos">${barra()}</div>`;
    conectar(cont.querySelector('.pantalla-catalogos'));
    pintarTabla();
  }

  ERP.registrar('catalogos', {
    titulo: 'Directorio Comercial',
    descripcion: 'Clientes, proveedores, beneficiarios de gasto, socios, productos, conceptos de costo, cuentas, categorías de deducción y categorías de gasto',
    render
  });
})();
