/* SISTEMA OFICIAL de documentos (tabla documentos + v_documentos + fn_registrar_documento, bucket 'documentos').
   carga_documentos quedó JUBILADA (2026-07-22). Componente reutilizable montado por la ficha clásica
   y por el Expediente de embarque: ERP.documentos.montar(contenedor, { entidad, entidadId }). */
/* Documentos — componente reutilizable sobre Supabase Storage (bucket privado "documentos").
   Se monta en cualquier ficha:  ERP.documentos.montar(contenedor, { entidad, entidadId })
   Entidades válidas: 'carga' | 'contraparte' | 'movimiento' | 'general'.

   Permisos: subir → capturar · descargar → ver · anular → administrar.
   El backend valida tamaño y mime en el upload; aquí se valida antes solo para no
   gastar la subida, pero la autoridad es el backend y su rechazo se muestra literal. */

window.ERP.documentos = (function () {
  'use strict';
  const { sb, esc, fecha, puede } = ERP;

  const BUCKET = 'documentos';
  const MAX_BYTES = 25 * 1024 * 1024;
  const SEGUNDOS_URL = 60;

  /* El MIME se deriva de la EXTENSIÓN, nunca de file.type: los navegadores reportan
     vacío u "application/octet-stream" para csv/xlsx/docx según el sistema, y el bucket
     es estricto y los rechaza. Este mapa es también la lista de extensiones aceptadas. */
  const MIME = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    csv: 'text/csv',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  const EXT_OK = Object.keys(MIME);

  /** MIME confiable para un archivo. Se usa igual en el upload y en p_mime del RPC. */
  const mimeDe = archivo =>
    MIME[extDe(archivo.name)] || archivo.type || 'application/octet-stream';

  const ICONO = {
    pdf: '📕', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️',
    xlsx: '📊', docx: '📄', csv: '📈'
  };

  const extDe = nombre => String(nombre || '').split('.').pop().toLowerCase();

  function tamano(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  /** Nombre seguro para la ruta de Storage: sin acentos, espacios ni caracteres raros. */
  function saneaNombre(nombre) {
    const n = String(nombre || 'archivo')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^A-Za-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^[-.]+/, '');
    return n.slice(0, 90) || 'archivo';
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  const rutaDe = (entidad, entidadId, nombre) =>
    `${entidad}/${entidadId}/${uuid()}-${saneaNombre(nombre)}`;

  /* ================= Datos ================= */

  let categoriasCache = null;

  async function categorias() {
    if (categoriasCache) return categoriasCache;
    const { data, error } = await sb.from('v_categorias_documento').select('*');
    if (error) throw new Error(error.message);
    categoriasCache = (data || []).filter(c => c.activo !== false);
    return categoriasCache;
  }

  async function listar(entidad, entidadId) {
    const { data, error } = await sb.from('v_documentos').select('*')
      .eq('entidad', entidad)
      .eq('entidad_id', String(entidadId));
    if (error) throw new Error(error.message);
    return (data || []).sort((a, b) =>
      String(b.capturado_ts || '').localeCompare(String(a.capturado_ts || '')));
  }

  /** Sube y registra. Si el registro falla, borra el objeto huérfano del bucket. */
  async function subir({ entidad, entidadId, archivo, categoria, nota, referenciaExterna }) {
    const path = rutaDe(entidad, entidadId, archivo.name);
    const contentType = mimeDe(archivo);   // derivado de la extensión, no de archivo.type

    const { error: errSubida } = await sb.storage.from(BUCKET)
      .upload(path, archivo, { contentType });
    if (errSubida) throw new Error(errSubida.message);

    try {
      const { data, error } = await sb.rpc('fn_registrar_documento', {
        p_entidad: entidad,
        p_entidad_id: String(entidadId),
        p_categoria: categoria,
        p_storage_path: path,
        p_nombre_archivo: archivo.name,
        p_mime: contentType,               // el mismo que se subió al bucket
        p_tamano_bytes: archivo.size,
        p_nota: nota || null,
        p_referencia_externa: referenciaExterna || null   // PO cliente, contenedor, guía/BL (texto libre, buscable)
      });
      if (error) throw new Error(error.message);
      return (data && data[0]) || { storage_path: path };
    } catch (e) {
      /* El archivo ya está en el bucket pero sin metadato: sería invisible y no se
         podría borrar desde la app. Se limpia antes de propagar el error. */
      let limpio = true;
      try {
        const { error: errBorrado } = await sb.storage.from(BUCKET).remove([path]);
        if (errBorrado) limpio = false;
      } catch (_) { limpio = false; }

      throw new Error(e.message + (limpio
        ? ''
        : ` — ADEMÁS quedó un archivo huérfano en el bucket (${path}); hay que borrarlo desde el backend.`));
    }
  }

  /** Bucket privado: se descarga con una URL firmada de vida corta. */
  async function descargar(doc, boton) {
    const textoOriginal = boton.textContent;
    boton.disabled = true;
    boton.textContent = 'Abriendo…';
    try {
      const { data, error } = await sb.storage.from(BUCKET)
        .createSignedUrl(doc.storage_path, SEGUNDOS_URL);
      if (error) throw new Error(error.message);

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('No se pudo abrir el documento: ' + e.message);
    }
    boton.disabled = false;
    boton.textContent = textoOriginal;
  }

  async function anular(id) {
    const { data, error } = await sb.rpc('fn_anular_documento', { p_id: id });
    if (error) throw new Error(error.message);
    return data;
  }

  /* ================= Componente ================= */

  function aviso(el, tipo, html) {
    el.className = 'aviso visible ' + tipo;
    el.innerHTML = html;
  }
  function limpiarAviso(el) { el.className = 'aviso'; el.innerHTML = ''; }

  async function montar(contenedor, opciones) {
    const { entidad, entidadId } = opciones;
    const puedeSubir = puede('capturar') && opciones.permitirSubir !== false;
    const puedeAnular = puede('administrar');
    const puedeVer = puede('ver');

    contenedor.innerHTML = '<div class="skel">Cargando documentos…</div>';

    let docs, cats;
    try {
      [docs, cats] = await Promise.all([
        listar(entidad, entidadId),
        puedeSubir ? categorias() : Promise.resolve([])
      ]);
    } catch (e) {
      contenedor.innerHTML = `<div class="errbox">No se pudieron leer los documentos: ${esc(e.message)}</div>`;
      return;
    }

    contenedor.innerHTML = `
      ${puedeSubir ? `
        <div class="docs-zona" id="dzZona">
          <div class="icono">📎</div>
          <div class="titulo">Arrastra un archivo aquí o toca para elegirlo</div>
          <div class="ayuda">PDF, imagen, Excel, Word o CSV · máximo 25 MB</div>
          <input type="file" id="dzInput" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.docx,.csv">
        </div>
        <div class="docs-form" id="dzForm">
          <div class="form-erp">
            <div class="campos">
              <div class="campo ancho">
                <label>Archivo</label>
                <div class="campo-fijo" id="dzArchivo"></div>
              </div>
              <div class="campo ancho">
                <label>Categoría <span class="req">*</span></label>
                <div id="dzCat"></div>
              </div>
              <div class="campo ancho">
                <label>Nota</label>
                <input id="dzNota" type="text" maxlength="200" placeholder="Opcional — de qué es este documento">
              </div>
              <div class="campo ancho">
                <label>Referencia externa</label>
                <input id="dzRef" type="text" maxlength="120" placeholder="Opcional — PO del cliente, contenedor, guía/BL">
              </div>
            </div>
            <div class="acciones">
              <button class="btn-mini" id="dzSubir">Subir documento</button>
              <button class="btn-mini gris" id="dzCancelar">Cancelar</button>
            </div>
            <div class="aviso" id="dzAviso"></div>
          </div>
        </div>` : ''}
      <div id="dzLista"></div>
      <div class="aviso" id="dzAvisoLista"></div>`;

    const elLista = contenedor.querySelector('#dzLista');
    const elAvisoLista = contenedor.querySelector('#dzAvisoLista');

    function pintarLista() {
      if (!docs.length) {
        elLista.innerHTML = '<div class="docs-vacio">Sin documentos adjuntos.</div>';
        return;
      }
      elLista.innerHTML = docs.map((d, i) => {
        const ext = extDe(d.nombre_archivo);
        return `<div class="doc-fila">
          <span class="tipo">${ICONO[ext] || '📎'}</span>
          <span class="cuerpo">
            <div class="nombre">${esc(d.nombre_archivo)}</div>
            <div class="meta">
              ${d.categoria ? `<span class="pill">${esc(d.categoria)}</span><span class="sep">·</span>` : ''}
              ${esc(tamano(d.tamano_bytes))}<span class="sep">·</span>
              ${esc(fecha(d.capturado_ts))}<span class="sep">·</span>
              ${esc(d.capturado_por || '—')}
            </div>
            ${d.nota ? `<div class="nota-doc">${esc(d.nota)}</div>` : ''}
            ${d.referencia_externa ? `<div class="nota-doc">Ref. externa: ${esc(d.referencia_externa)}</div>` : ''}
          </span>
          <span class="acciones-doc">
            ${puedeVer ? `<button class="btn-mini gris" data-ver="${i}">Abrir</button>` : ''}
            ${puedeAnular ? `<button class="btn-mini peligro" data-anular="${i}">Anular</button>` : ''}
          </span>
        </div>`;
      }).join('');

      elLista.querySelectorAll('[data-ver]').forEach(b =>
        b.addEventListener('click', () => descargar(docs[Number(b.dataset.ver)], b)));

      elLista.querySelectorAll('[data-anular]').forEach(b =>
        b.addEventListener('click', () => confirmarAnular(docs[Number(b.dataset.anular)], b)));
    }

    async function confirmarAnular(doc, boton) {
      if (!window.confirm(`¿Anular "${doc.nombre_archivo}"?\n\nDeja de aparecer en la ficha. No hay botón para deshacerlo.`)) return;
      boton.disabled = true;
      limpiarAviso(elAvisoLista);
      try {
        await anular(doc.id);
        docs = await listar(entidad, entidadId);
        pintarLista();
        aviso(elAvisoLista, 'ok', `Documento <b>${esc(doc.nombre_archivo)}</b> anulado.`);
      } catch (e) {
        aviso(elAvisoLista, 'err', `No se anuló: ${esc(e.message)}`);
        boton.disabled = false;
      }
    }

    pintarLista();
    if (!puedeSubir) return;

    /* ---------- Subida ---------- */

    const zona = contenedor.querySelector('#dzZona');
    const input = contenedor.querySelector('#dzInput');
    const form = contenedor.querySelector('#dzForm');
    const elArchivo = contenedor.querySelector('#dzArchivo');
    const elAviso = contenedor.querySelector('#dzAviso');
    const btnSubir = contenedor.querySelector('#dzSubir');

    let archivo = null;
    const comboCat = ERP.crearCombo({
      contenedor: contenedor.querySelector('#dzCat'),
      items: cats.map(c => ({ id: c.id, nombre: c.nombre })),
      placeholder: 'Elige una categoría…',
      permitirNuevo: false
    });

    function elegir(f) {
      const ext = extDe(f.name);
      limpiarAviso(elAviso);
      if (!EXT_OK.includes(ext)) {
        form.classList.remove('abierto');
        aviso(elAvisoLista, 'err',
          `<b>${esc(f.name)}</b> no es un tipo permitido. Se aceptan: ${EXT_OK.join(', ')}.`);
        return;
      }
      if (f.size > MAX_BYTES) {
        form.classList.remove('abierto');
        aviso(elAvisoLista, 'err',
          `<b>${esc(f.name)}</b> pesa ${esc(tamano(f.size))}; el máximo son 25 MB.`);
        return;
      }
      limpiarAviso(elAvisoLista);
      archivo = f;
      elArchivo.innerHTML = `${ICONO[ext] || '📎'} ${esc(f.name)}
        <div class="aclara">${esc(tamano(f.size))} · ${esc(mimeDe(f))}</div>`;
      form.classList.add('abierto');
      comboCat.enfocar();
    }

    zona.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { if (input.files[0]) elegir(input.files[0]); });

    ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => {
      e.preventDefault(); zona.classList.add('encima');
    }));
    ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => {
      e.preventDefault(); zona.classList.remove('encima');
    }));
    zona.addEventListener('drop', e => {
      const f = e.dataTransfer && e.dataTransfer.files[0];
      if (f) elegir(f);
    });

    contenedor.querySelector('#dzCancelar').addEventListener('click', () => {
      archivo = null; input.value = '';
      form.classList.remove('abierto');
      limpiarAviso(elAviso);
    });

    btnSubir.addEventListener('click', async () => {
      const categoria = comboCat.valor();
      limpiarAviso(elAviso);
      if (!archivo) { aviso(elAviso, 'err', 'Elige un archivo.'); return; }
      if (!categoria) { aviso(elAviso, 'err', 'Elige una categoría de la lista.'); return; }

      btnSubir.disabled = true;
      zona.classList.add('subiendo');
      aviso(elAviso, 'warn', `Subiendo <b>${esc(archivo.name)}</b>…`);
      try {
        await subir({
          entidad, entidadId, archivo, categoria,
          nota: contenedor.querySelector('#dzNota').value.trim(),
          referenciaExterna: contenedor.querySelector('#dzRef').value.trim()
        });
        docs = await listar(entidad, entidadId);
        pintarLista();
        aviso(elAvisoLista, 'ok', `<b>${esc(archivo.name)}</b> subido.`);
        archivo = null; input.value = '';
        contenedor.querySelector('#dzNota').value = '';
        contenedor.querySelector('#dzRef').value = '';
        comboCat.limpiar();
        form.classList.remove('abierto');
        limpiarAviso(elAviso);
      } catch (e) {
        // El backend valida tamaño y mime: su rechazo se muestra tal cual.
        aviso(elAviso, 'err', `No se subió: ${esc(e.message)}`);
      }
      btnSubir.disabled = false;
      zona.classList.remove('subiendo');
    });
  }

  return { montar, listar, subir, descargar, anular, categorias, saneaNombre, tamano, rutaDe, mimeDe };
})();
