/* Módulo Catálogos — alta y edición de contrapartes (por clase) y productos.
   Lectura para todos; escritura solo con puede_administrar (el backend también lo valida).

   La palabra "contraparte" es vocabulario de la base, no de la pantalla: aquí cada clase
   se llama por lo que es (cliente, proveedor, beneficiario de gasto, socio). */

(function () {
  'use strict';
  const { q, rpc, esc, num, norm } = ERP;

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
  let pestana = 'comercial';       // clase | 'productos'
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
    if (c.es_cliente && c.es_proveedor) return { txt: 'Ambos', clase: '' };
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
    const admin = ERP.puede('administrar');
    const tieneCorreo = !!(c.email_facturacion || c.email);

    const linea = (etq, val, mono) => (val != null && String(val).trim() !== '')
      ? `<div class="ficha-linea"><span class="ficha-etq">${esc(etq)}</span><span class="ficha-val${mono ? ' mono' : ''}">${esc(val)}</span></div>`
      : '';
    /** Devuelve el HTML de una sección solo si alguna de sus líneas tiene contenido. */
    const seccion = (titulo, lineas) => {
      const cuerpo = lineas.join('');
      return cuerpo ? `<div class="ficha-seccion">${esc(titulo)}</div>${cuerpo}` : '';
    };

    const ubic = [c.ciudad, c.pais].filter(x => x && String(x).trim()).join(', ');
    const contacto = seccion('Contacto', [
      linea('Persona', c.contacto_nombre),
      linea('Teléfono / WhatsApp', c.telefono_whatsapp),
      linea('Correo general', c.email)
    ]);
    const factur = seccion('Facturación', [
      linea('Razón social', c.razon_social),
      linea('RFC / Tax ID', c.rfc_tax_id, true),
      linea('Correo de facturación', c.email_facturacion),
      linea('Licencia PACA', c.paca_licencia, true)
    ]);
    const direcc = seccion('Direcciones', [
      linea('Bill to', c.direccion_facturacion),
      linea('Ship to', c.direccion_envio),
      linea('Ciudad / País', ubic)
    ]);

    const cuerpoDatos = contacto + factur + direcc +
      seccion('Nota', [linea('Nota', c.nota)]);

    ERP.abrirPanel(esc(c.nombre),
      `${cl ? esc(cl.pestana) : 'Sin clase'} · <span class="pill ${t.clase}">${esc(t.txt)}</span> · ` +
      `${c.num_cargas} carga${c.num_cargas === 1 ? '' : 's'}${c.dias_credito == null ? '' : ` · ${esc(c.dias_credito)} días de crédito`}`,
      `<div class="ficha-cp">
        ${al.length ? `<div class="ficha-seccion">Alias</div><div class="ficha-linea"><span class="ficha-val">${al.map(a => `<span class="alias-chip solo-ver">${esc(a)}</span>`).join(' ')}</span></div>` : ''}
        ${cuerpoDatos || '<div class="ficha-vacio">Sin datos de contacto capturados todavía.</div>'}
      </div>
      <div class="form-erp" style="margin-top:14px">
        <div class="acciones">
          <button class="btn-mini${tieneCorreo ? '' : ' gris'}" id="cpCorreo"${tieneCorreo ? '' : ' disabled'}>Enviar correo</button>
          ${admin ? '<button class="btn-mini gris" id="cpEditar">Editar</button>' : ''}
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
      `${cl ? esc(cl.pestana) : 'Sin clase'} · ${c.num_cargas} carga${c.num_cargas === 1 ? '' : 's'} vigente${c.num_cargas === 1 ? '' : 's'}`, `
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

  function pintarContrapartes() {
    const filas = filtrar();
    const admin = ERP.puede('administrar');
    const cont = document.getElementById('catTabla');
    const cl = claseDe(pestana);
    const esComercial = pestana === 'comercial';
    document.getElementById('catConteo').textContent = `${filas.length} de ${deClase(pestana).length}`;

    if (!filas.length) {
      cont.innerHTML = '<div class="vacio">Nada coincide con la búsqueda.</div>';
      return;
    }

    cont.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr>
        <th>Nombre</th>
        ${esComercial ? '<th>Rol</th>' : ''}
        <th>Alias</th>
        <th class="num">Días crédito</th>
        <th class="num">Cargas</th>
        ${admin ? '<th></th>' : ''}
      </tr></thead>
      <tbody>${filas.map(c => {
        const t = tipoDe(c);
        const al = aliasDe(c);
        const enUso = num(c.num_cargas) > 0;
        return `<tr>
          <td><button class="cp-nombre-link" data-ficha="${esc(c.id)}">${esc(c.nombre)}</button>${c.nota ? `<div style="font-size:11px;color:var(--gris)">${esc(c.nota)}</div>` : ''}</td>
          ${esComercial ? `<td><span class="pill ${t.clase}">${esc(t.txt)}</span></td>` : ''}
          <td>${al.length
            ? `<span class="alias-lista">${al.map(a => `<span class="alias-chip solo-ver">${esc(a)}</span>`).join('')}</span>`
            : '<span class="sin-alias">—</span>'}</td>
          <td class="num">${c.dias_credito == null ? '—' : esc(c.dias_credito)}</td>
          <td class="num" style="${enUso ? 'font-weight:600' : 'color:var(--gris-claro)'}">${esc(c.num_cargas)}</td>
          ${admin ? `<td><button class="btn-mini gris" data-id="${esc(c.id)}">Editar</button></td>` : ''}
        </tr>`;
      }).join('')}</tbody>
    </table></div>
    <div class="leyenda">${cl ? cl.leyenda : ''} Haz clic en un nombre para ver su ficha completa. El nombre no se puede cambiar; para eso están los alias.</div>`;

    cont.querySelectorAll('button[data-ficha]').forEach(b => b.addEventListener('click', () => {
      const c = contrapartes.find(x => String(x.id) === b.dataset.ficha);
      if (c) fichaContraparte(c);
    }));

    if (admin) {
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
    const admin = ERP.puede('administrar');
    document.getElementById('catConteo').textContent = `${filas.length} de ${productos.length}`;

    cont.innerHTML = filas.length
      ? `<div class="tabla-wrap"><table>
          <thead><tr><th>Producto</th><th>Variedades</th>${admin ? '<th></th>' : ''}</tr></thead>
          <tbody>${filas.map(p => {
            const vs = variedadesDe(p.id);
            return `<tr>
              <td>${esc(p.nombre)}</td>
              <td>${vs.length
                ? `<span class="alias-lista">${vs.map(v => `<span class="alias-chip solo-ver">${esc(v.nombre)}</span>`).join('')}</span>`
                : '<span class="sin-alias">— sin variedades —</span>'}</td>
              ${admin ? `<td><button class="btn-mini gris" data-variedad="${esc(p.id)}">+ Variedad</button></td>` : ''}
            </tr>`;
          }).join('')}</tbody>
        </table></div>
        <div class="leyenda">Estos son los productos que ofrece el combo al crear una carga, con sus variedades.</div>`
      : '<div class="vacio">Nada coincide con la búsqueda.</div>';

    if (admin) {
      cont.querySelectorAll('button[data-variedad]').forEach(b => b.addEventListener('click', () => {
        const p = productos.find(x => String(x.id) === b.dataset.variedad);
        if (p) formNuevaVariedad(p);
      }));
    }
  }

  const pintarTabla = () => (pestana === 'productos' ? pintarProductos() : pintarContrapartes());

  /* ================= Datos ================= */

  async function traer() {
    [contrapartes, productos, variedades] = await Promise.all([
      q('v_catalogo_admin', '&order=nombre.asc'),
      q('v_catalogo_productos', '&order=nombre.asc'),
      q('v_catalogo_variedades', '&order=producto_id.asc,nombre.asc')
    ]);
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
    const admin = ERP.puede('administrar');
    const esProductos = pestana === 'productos';
    const cl = claseDe(pestana);
    const sueltas = huerfanas();

    return `
      ${sueltas.length ? `<div class="errbox">Hay ${sueltas.length} registro${sueltas.length === 1 ? '' : 's'}
        con una clase que esta pantalla no conoce (${esc([...new Set(sueltas.map(c => c.clase))].join(', '))})
        y no aparecen en ninguna pestaña.</div>` : ''}

      <div class="pestanas">
        ${CLASES.map(c => `<button class="pestana ${pestana === c.id ? 'activa' : ''}" data-pestana="${esc(c.id)}">
          ${esc(c.pestana)} <span class="cuenta">${deClase(c.id).length}</span></button>`).join('')}
        <button class="pestana ${esProductos ? 'activa' : ''}" data-pestana="productos">
          Productos <span class="cuenta">${productos.length}</span></button>
      </div>

      ${pestana === 'comercial' ? `<div class="filtros" id="catSub">
        ${SUBFILTROS.map(s => `<button class="chip ${subfiltro === s.id ? 'activo' : ''}" data-sub="${esc(s.id)}">${esc(s.txt)}</button>`).join('')}
      </div>` : ''}

      <div class="filtros">
        <input class="busca" id="catBusca" type="text"
               placeholder="${esProductos ? 'Buscar producto…' : 'Buscar por nombre, alias o nota…'}"
               value="${esc(busqueda)}">
        ${admin
          ? `<button class="btn-mini" id="catNuevo">${esc(esProductos ? '+ Nuevo producto' : cl.alta)}</button>`
          : '<span class="solo-lectura">Solo lectura — el alta de catálogos es de administrador</span>'}
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
    if (nuevo) nuevo.addEventListener('click',
      () => (pestana === 'productos' ? formNuevoProducto() : formNueva(pestana)));
  }

  async function render(cont) {
    await traer();
    pestana = 'comercial';
    subfiltro = 'todos';
    busqueda = '';
    cont.innerHTML = barra();
    conectar(cont);
    pintarTabla();
  }

  ERP.registrar('catalogos', {
    titulo: 'Directorio Comercial',
    descripcion: 'Clientes, proveedores, beneficiarios de gasto, socios y productos',
    render
  });
})();
