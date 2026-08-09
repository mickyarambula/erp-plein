/* Módulo Usuarios (ruta 'usuarios') — administración de accesos (E87/D-103). SOLO ADMIN
   (ERP.puede('administrar')); si un socio sin esa capacidad llega a la ruta, ve un mensaje de
   acceso restringido y nada de datos (el backend igual lo bloquearía en las 3 RPCs, pero no
   tiene caso ni pedírselas).

   RPCs (todas requieren capacidad 'administrar'; el backend es la autoridad final, incluidas
   sus guardas anti-lockout — sus mensajes se muestran tal cual, nunca se envuelven):
     fn_admin_listar_usuarios() → [{socio_codigo,nombre,email,rol,activo,puede_ver,
       puede_capturar,puede_editar,puede_administrar}]
     fn_admin_listar_roles() → [{rol,puede_ver,puede_capturar,puede_editar,puede_administrar,descripcion}]
     fn_admin_guardar_usuario(p_socio_codigo,p_nombre,p_email,p_rol,p_activo) → texto (mensaje)

   Esta pantalla SOLO define rol/nombre/correo/activo del socio DENTRO del ERP — el correo debe
   además estar invitado aparte en Supabase Auth (Authentication → Users) para poder iniciar
   sesión; aquí no se manda ninguna invitación.

   Permisos granulares por usuario (E88/D-105) — matriz de capacidades + módulos visibles, cada
   celda es hereda(null)/sí(true)/no(false) sobre el valor del rol base. Botón "Permisos" por fila:
     fn_admin_capacidades_usuario(p_socio) → [{capacidad,valor_rol,override,efectivo}] (4 filas)
     fn_admin_modulos_usuario(p_socio) → [{modulo,etiqueta,orden,visible_rol,override,efectivo}] (25 filas)
     fn_admin_set_capacidad(p_cap,p_socio,p_valor) → texto — p_valor null = "hereda del rol"
     fn_admin_set_modulo(p_modulo,p_socio,p_visible) → texto — p_visible null = "hereda del rol"
   Autoguardado por celda (no hay botón "Guardar todo"): cada <select> dispara su propio RPC al
   cambiar; el drawer se queda abierto para seguir ajustando. fn_admin_listar_modulos() (catálogo
   general de módulos) no se usa en este archivo — fn_admin_modulos_usuario ya trae etiqueta/orden
   por usuario, que es todo lo que necesita esta pantalla.

   Expone ERP.nuevoUsuario (abre el alta desde cualquier lado, por si se necesita más adelante). */

(function () {
  'use strict';
  const { rpc, esc } = ERP;

  // Mismo patrón que ya usa modulo-proyectos.js para RPCs que devuelven un mensaje de texto
  // (a veces llega como string plano, a veces como primera fila de una tabla de 1 columna).
  const textoRpc = data => (typeof data === 'string' ? data : ((data && data[0]) || 'Listo.'));

  const CAPACIDADES = [
    ['puede_ver', 'Ver'],
    ['puede_capturar', 'Capturar'],
    ['puede_editar', 'Editar'],
    ['puede_administrar', 'Administrar']
  ];

  let usuarios = [];
  let roles = [];
  let fTexto = '';

  const rolInfo = rol => roles.find(r => r.rol === rol) || null;

  function chipsCapacidad(u) {
    const activas = CAPACIDADES.filter(([k]) => u[k]);
    return activas.length
      ? activas.map(([, l]) => `<span class="pill verde">${esc(l)}</span>`).join(' ')
      : '<span class="pill gris">Sin capacidades</span>';
  }

  /* ================= Lista ================= */

  function filtradas() {
    const t = ERP.norm(fTexto);
    if (!t) return usuarios;
    return usuarios.filter(u => [u.socio_codigo, u.nombre, u.email, u.rol].some(v => ERP.norm(v).includes(t)));
  }

  function pintarTabla() {
    const cont = document.getElementById('usrTabla');
    const conteo = document.getElementById('usrConteo');
    const rows = filtradas();
    if (conteo) conteo.textContent = `${rows.length} de ${usuarios.length} usuarios`;
    if (!rows.length) { cont.innerHTML = '<div class="vacio">Ningún usuario coincide con el filtro.</div>'; return; }

    cont.innerHTML = `<div class="tabla-wrap"><table id="tblUsuarios">
      <thead><tr><th>Código</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Capacidades</th>
        <th>Activo</th><th></th></tr></thead>
      <tbody>${rows.map(u => `<tr>
        <td class="mono">${esc(u.socio_codigo)}</td>
        <td>${esc(u.nombre || '—')}</td>
        <td>${esc(u.email || '—')}</td>
        <td><span class="pill ${u.activo ? '' : 'gris'}">${esc(u.rol || '—')}</span></td>
        <td>${chipsCapacidad(u)}</td>
        <td>${u.activo ? 'Sí' : 'No'}</td>
        <td>
          <button class="btn-mini gris" data-editar="${esc(u.socio_codigo)}">Editar</button>
          <button class="btn-mini gris" data-permisos="${esc(u.socio_codigo)}">Permisos</button>
        </td>
      </tr>`).join('')}</tbody>
    </table></div>`;

    cont.querySelectorAll('[data-editar]').forEach(b =>
      b.addEventListener('click', () => abrirForm(usuarios.find(u => u.socio_codigo === b.dataset.editar) || null)));
    cont.querySelectorAll('[data-permisos]').forEach(b =>
      b.addEventListener('click', () => abrirPermisos(usuarios.find(u => u.socio_codigo === b.dataset.permisos) || null)));
  }

  async function render(cont) {
    if (!ERP.puede('administrar')) {
      cont.innerHTML = '<div class="errbox">Esta pantalla es solo para administradores.</div>';
      return;
    }
    try {
      [usuarios, roles] = await Promise.all([
        rpc('fn_admin_listar_usuarios'),
        rpc('fn_admin_listar_roles')
      ]);
    } catch (e) {
      cont.innerHTML = `<div class="errbox">No se pudieron leer los usuarios: ${esc(e.message)}</div>`;
      return;
    }
    usuarios = usuarios || [];
    roles = roles || [];
    fTexto = '';

    cont.innerHTML = `<div class="pantalla-usuarios">
      <div class="filtros">
        <button class="btn-mini" id="usrNuevo">+ Nuevo usuario</button>
        <input class="busca" id="usrFTexto" type="text" placeholder="Buscar por código, nombre, correo o rol…">
        <span class="conteo" id="usrConteo"></span>
      </div>
      <div class="card" style="padding:14px"><div id="usrTabla"></div></div>
      <div class="leyenda">Esta pantalla define el <b>rol</b> y si el socio está <b>activo</b>
        dentro del ERP. El correo debe además estar invitado en <b>Supabase Auth</b>
        (Authentication → Users) para poder iniciar sesión — aquí no se manda ninguna invitación.</div>
    </div>`;

    document.getElementById('usrNuevo').addEventListener('click', () => abrirForm(null));
    let tempo;
    document.getElementById('usrFTexto').addEventListener('input', e => {
      clearTimeout(tempo); tempo = setTimeout(() => { fTexto = e.target.value; pintarTabla(); }, 150);
    });

    pintarTabla();
  }

  /* ================= Alta / edición ================= */

  function avisoEn(id, tipo, html) {
    const el = document.getElementById(id);
    if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; }
  }
  const avisoUsr = (tipo, html) => avisoEn('usrAviso', tipo, html);

  function abrirForm(u) {
    const esAlta = !u;
    if (!roles.length) {
      ERP.toast('err', 'No hay catálogo de roles cargado — recarga la pantalla.');
      return;
    }
    const titulo = esAlta ? 'Nuevo usuario' : `Editar usuario · ${esc(u.socio_codigo)}`;
    const rolActual = esAlta ? null : rolInfo(u.rol);

    ERP.abrirPanel(titulo, esAlta ? 'Da de alta el rol de un socio dentro del ERP' : 'Cambia rol, correo o estado', `
      <div class="form-erp">
        <div class="campos">
          <div class="campo">
            <label>Código de socio <span class="req">*</span></label>
            ${esAlta
              ? '<input id="usrCodigo" type="text" maxlength="20" placeholder="ej. PP05-XX">'
              : `<div class="campo-fijo mono">${esc(u.socio_codigo)}</div>`}
          </div>
          <div class="campo">
            <label>Nombre <span class="req">*</span></label>
            <input id="usrNombre" type="text" maxlength="120" value="${esAlta ? '' : esc(u.nombre || '')}">
          </div>
          <div class="campo ancho">
            <label>Correo <span class="req">*</span></label>
            <input id="usrEmail" type="email" maxlength="160" value="${esAlta ? '' : esc(u.email || '')}">
          </div>
          <div class="campo">
            <label>Rol <span class="req">*</span></label>
            <select id="usrRol">
              ${roles.map(r => `<option value="${esc(r.rol)}"${!esAlta && u.rol === r.rol ? ' selected' : ''}>${esc(r.rol)} — ${esc(r.descripcion || '')}</option>`).join('')}
            </select>
            <div class="alias-ayuda" id="usrRolDesc">${rolActual && rolActual.descripcion ? esc(rolActual.descripcion) : ''}</div>
          </div>
          <div class="campo">
            <label>Activo</label>
            <label class="check-solo"><input type="checkbox" id="usrActivo"${(esAlta || u.activo) ? ' checked' : ''}> El socio puede iniciar sesión</label>
          </div>
        </div>
        ${esAlta ? `<div class="alias-ayuda">El correo debe además estar invitado en <b>Supabase Auth</b>
          (Authentication → Users) para poder iniciar sesión; esta pantalla solo define su rol.</div>` : ''}
        <div class="acciones">
          <button class="btn-mini" id="usrGuardar">${esAlta ? 'Crear usuario' : 'Guardar cambios'}</button>
          <button class="btn-mini gris" id="usrCancelar">Cancelar</button>
        </div>
        <div class="aviso" id="usrAviso"></div>
      </div>`);

    const selRol = document.getElementById('usrRol');
    selRol.addEventListener('change', () => {
      const r = rolInfo(selRol.value);
      document.getElementById('usrRolDesc').textContent = r && r.descripcion ? r.descripcion : '';
    });

    document.getElementById('usrCancelar').addEventListener('click', ERP.cerrarPanel);
    document.getElementById('usrGuardar').addEventListener('click', () => guardarUsuario(esAlta, u));
    (document.getElementById('usrCodigo') || document.getElementById('usrNombre')).focus();
  }

  async function guardarUsuario(esAlta, uOriginal) {
    const codigo = esAlta ? document.getElementById('usrCodigo').value.trim() : uOriginal.socio_codigo;
    const nombre = document.getElementById('usrNombre').value.trim();
    const email = document.getElementById('usrEmail').value.trim();
    const rolSel = document.getElementById('usrRol').value;
    const activo = document.getElementById('usrActivo').checked;
    const btn = document.getElementById('usrGuardar');

    if (!codigo) { avisoUsr('err', 'El código de socio es obligatorio.'); return; }
    if (!nombre) { avisoUsr('err', 'El nombre es obligatorio.'); return; }
    if (!email) { avisoUsr('err', 'El correo es obligatorio.'); return; }
    if (!rolSel) { avisoUsr('err', 'Elige un rol.'); return; }

    btn.disabled = true;
    avisoUsr('warn', 'Guardando…');
    try {
      const data = await rpc('fn_admin_guardar_usuario', {
        p_socio_codigo: codigo,
        p_nombre: nombre,
        p_email: email,
        p_rol: rolSel,
        p_activo: activo
      });
      ERP.marcarDatosSucios();
      ERP.cerrarPanel();
      ERP.toast('ok', esc(textoRpc(data)));
    } catch (e) {
      if (ERP.avisarSiPermiso(e)) { btn.disabled = false; return; }
      // Mensajes del backend tal cual (incluidas las guardas anti-lockout "...administrador...").
      avisoUsr('err', esc(e.message));
      btn.disabled = false;
    }
  }

  /* ================= Permisos granulares (E88/D-105) ================= */

  const ETIQUETA_CAP = { ver: 'Ver', capturar: 'Capturar', editar: 'Editar', administrar: 'Administrar' };

  const pillBool = (v, texto) => `<span class="pill ${v ? 'verde' : 'gris'}">${esc(texto || (v ? 'Sí' : 'No'))}</span>`;

  function seccion(titulo, html) {
    return `<div class="seccion-head" style="margin-top:20px"><h4>${esc(titulo)}</h4></div>${html}`;
  }

  // Una fila de la matriz — sirve tanto para capacidades como para módulos, misma forma de datos:
  // clave, valorBase (lo que trae el rol), override (null=hereda / true / false ya guardado).
  function filaPermiso(clave, etiqueta, valorBase, override) {
    const seleccion = (override === null || override === undefined) ? '' : (override ? '1' : '0');
    return `<tr data-valor-base="${valorBase ? '1' : '0'}">
      <td>${esc(etiqueta)}</td>
      <td>${pillBool(valorBase)}</td>
      <td><select class="selPermiso" data-clave="${esc(clave)}" data-valor-anterior="${seleccion}">
        <option value=""${seleccion === '' ? ' selected' : ''}>Hereda del rol (${valorBase ? 'Sí' : 'No'})</option>
        <option value="1"${seleccion === '1' ? ' selected' : ''}>Sí</option>
        <option value="0"${seleccion === '0' ? ' selected' : ''}>No</option>
      </select></td>
      <td class="efectivo">${pillBool(override === null || override === undefined ? valorBase : override)}</td>
    </tr>`;
  }

  function tablaPermisos(id, encabezado, filasHtml) {
    return `<div class="tabla-wrap"><table>
      <thead><tr><th>${esc(encabezado)}</th><th>Valor del rol</th><th>Este usuario</th><th>Efectivo</th></tr></thead>
      <tbody id="${id}">${filasHtml}</tbody>
    </table></div>`;
  }

  async function abrirPermisos(u) {
    if (!u) return;
    ERP.abrirPanel(`Permisos · ${esc(u.socio_codigo)}`, 'Cargando…', '<div class="skel">Cargando…</div>');

    let caps, mods;
    try {
      [caps, mods] = await Promise.all([
        rpc('fn_admin_capacidades_usuario', { p_socio: u.socio_codigo }),
        rpc('fn_admin_modulos_usuario', { p_socio: u.socio_codigo })
      ]);
    } catch (e) {
      ERP.abrirPanel(`Permisos · ${esc(u.socio_codigo)}`, '',
        `<div class="errbox">No se pudieron leer los permisos: ${esc(e.message)}</div>`);
      return;
    }
    caps = caps || [];
    mods = (mods || []).slice().sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

    ERP.abrirPanel(
      `Permisos · ${esc(u.nombre || u.socio_codigo)}`,
      `Rol base: ${esc(u.rol)} — "Hereda" toma el valor del rol; solo anula lo que necesites`,
      `<div class="form-erp">
        ${seccion('Capacidades', tablaPermisos('permCapsBody', 'Capacidad',
          caps.map(c => filaPermiso(c.capacidad, ETIQUETA_CAP[c.capacidad] || c.capacidad, c.valor_rol, c.override)).join('')))}
        ${seccion('Módulos visibles', tablaPermisos('permModsBody', 'Módulo',
          mods.map(m => filaPermiso(m.modulo, m.etiqueta || m.modulo, m.visible_rol, m.override)).join('')))}
        <div class="leyenda">Cada cambio se guarda al vuelo, uno por uno — no hay botón "Guardar todo".
          "Hereda" quita el ajuste individual y vuelve a tomar el valor del rol.</div>
        <div class="aviso" id="permAviso"></div>
      </div>`
    );

    document.getElementById('permCapsBody').querySelectorAll('.selPermiso').forEach(sel =>
      sel.addEventListener('change', () => guardarPermiso(false, u.socio_codigo, sel)));
    document.getElementById('permModsBody').querySelectorAll('.selPermiso').forEach(sel =>
      sel.addEventListener('change', () => guardarPermiso(true, u.socio_codigo, sel)));
  }

  async function guardarPermiso(esModulo, socio, sel) {
    const clave = sel.dataset.clave;
    const valor = sel.value === '' ? null : sel.value === '1';
    const tr = sel.closest('tr');
    const valorBase = tr.dataset.valorBase === '1';

    sel.disabled = true;
    try {
      const data = esModulo
        ? await rpc('fn_admin_set_modulo', { p_modulo: clave, p_socio: socio, p_visible: valor })
        : await rpc('fn_admin_set_capacidad', { p_cap: clave, p_socio: socio, p_valor: valor });
      tr.querySelector('.efectivo').innerHTML = pillBool(valor === null ? valorBase : valor);
      sel.dataset.valorAnterior = sel.value;
      ERP.marcarDatosSucios();
      avisoEn('permAviso', '', '');
      ERP.toast('ok', esc(textoRpc(data)));
    } catch (e) {
      sel.value = sel.dataset.valorAnterior;   // revierte: el backend no guardó el cambio
      if (!ERP.avisarSiPermiso(e)) {
        // Mensajes del backend tal cual (incluidas guardas anti-lockout sobre 'administrar').
        avisoEn('permAviso', 'err', esc(e.message));
      }
    }
    sel.disabled = false;
  }

  /* ================= Registro y exposición ================= */

  ERP.registrar('usuarios', {
    titulo: 'Usuarios',
    descripcion: 'Administración de accesos — rol y estado de cada socio dentro del ERP',
    render
  });

  ERP.nuevoUsuario = () => abrirForm(null);
})();
