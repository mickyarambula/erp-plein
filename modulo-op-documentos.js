/* Documentos + Envíos GENÉRICOS para entidades de op.* (Camino C) — ERP.opDocumentos.
   Hermano del sistema legacy (documentos.js → ERP.documentos, tabla `documentos`/v_documentos/
   fn_registrar_documento): mismo espíritu de componente reutilizable, pero sobre el contrato
   op.* nuevo (D-196, O3c). Primer enganche: Compras (modulo-o3-compras.js, entidad='supplier_po',
   entidad_id=folio). CONSTRUIDO GENÉRICO A PROPÓSITO — se replica igual a factura al cliente,
   liquidación, etc.: solo cambian `entidad`/`entidad_id` al montar.

   SOLO FRONTEND. Bucket privado 'documentos' (el mismo de siempre — ya existe, no es nuevo).
   Vistas: v_op_documentos (documento_id, entidad, entidad_id, categoria, storage_path,
     nombre_archivo, mime, tamano_bytes, nota, capturado_por, capturado_ts)
     v_op_envios (envio_id, entidad, entidad_id, canal, destinatario, contraparte, asunto,
     mensaje, pdf_path, pdf_url, estado, enviado_por, enviado_en)
   RPCs (capacidad 'capturar' para registrar; 'administrar' para anular):
     fn_op_doc_registrar(p_entidad, p_entidad_id, p_categoria, p_storage_path, p_nombre_archivo,
       p_mime, p_tamano_bytes, p_nota, p_referencia_externa) -> documento
     fn_op_doc_anular(p_id)
     fn_op_envio_registrar(p_entidad, p_entidad_id, p_canal, p_destinatario, p_asunto, p_mensaje,
       p_pdf_path, p_pdf_url, p_estado, p_contraparte_id, p_proveedor_envio, p_proveedor_ref,
       p_error_detalle) — p_canal ∈ 'correo'|'whatsapp'.

   API expuesta:
     ERP.opDocumentos.montar(contenedor, {entidad, entidadId, categorias?})
       — sección "Documentos": lista (v_op_documentos) + zona de subida (categoría de una lista
       fija — Factura/Cotización/Orden de compra/BL-Guía/Certificado QC/Liquidación/Comprobante de
       pago/Otro, salvo que se pase `categorias` propio) + Ver (URL firmada) + Anular.
     ERP.opDocumentos.montarEnvios(contenedor, {entidad, entidadId})
       — sección "Envíos": historial de v_op_envios (canal, destinatario, cuándo).
     ERP.opDocumentos.subir({entidad, entidadId, archivo, nombreArchivo?, mime?, categoria, nota?,
       referenciaExterna?, storagePath?}) — primitiva de subida+registro reusable: la usa el form
       de "Adjuntar documento" de aquí mismo, Y módulos que generan un documento (ej. la OC de
       Compras) para guardar ese archivo bajo una ruta fija propia (storagePath, ej. oc/{folio}.pdf
       — si se omite, se genera una ruta única tipo documentos.js).
     ERP.opDocumentos.urlFirmada(storagePath, segundos) -> string
     ERP.opDocumentos.registrarEnvio({entidad, entidadId, canal, destinatario, asunto?, mensaje?,
       pdfPath?, pdfUrl?, estado, contraparteId?, proveedorEnvio?, proveedorRef?, errorDetalle?})
     ERP.opDocumentos.anular(documentoId) */

window.ERP.opDocumentos = (function () {
  'use strict';
  const { sb, esc, fecha, puede } = ERP;

  const BUCKET = 'documentos';   // mismo bucket privado que el sistema legacy — no es nuevo
  const MAX_BYTES = 25 * 1024 * 1024;
  const SEGUNDOS_URL_VER = 300;   // 5 min — de sobra para abrir/descargar desde la ficha

  const CATEGORIAS_DEFAULT = [
    'Factura', 'Cotización', 'Orden de compra', 'BL/Guía',
    'Certificado QC', 'Liquidación', 'Comprobante de pago', 'Otro'
  ];

  const MIME = {
    pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    csv: 'text/csv', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
  const EXT_OK = Object.keys(MIME);
  const ICONO = { pdf: '📕', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️', xlsx: '📊', docx: '📄', csv: '📈' };
  const extDe = nombre => String(nombre || '').split('.').pop().toLowerCase();
  const mimeDe = archivo => MIME[extDe(archivo && archivo.name)] || (archivo && archivo.type) || 'application/octet-stream';

  function tamano(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  function saneaNombre(nombre) {
    const n = String(nombre || 'archivo')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-').replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '');
    return n.slice(0, 90) || 'archivo';
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  const rutaAuto = (entidad, entidadId, nombre) => `${entidad}/${entidadId}/${uuid()}-${saneaNombre(nombre)}`;

  /* ================= Primitivas ================= */

  async function listarDocumentos(entidad, entidadId) {
    const { data, error } = await sb.from('v_op_documentos').select('*')
      .eq('entidad', entidad).eq('entidad_id', String(entidadId));
    if (error) throw new Error(error.message);
    return (data || []).sort((a, b) => String(b.capturado_ts || '').localeCompare(String(a.capturado_ts || '')));
  }

  async function listarEnvios(entidad, entidadId) {
    const { data, error } = await sb.from('v_op_envios').select('*')
      .eq('entidad', entidad).eq('entidad_id', String(entidadId));
    if (error) throw new Error(error.message);
    return (data || []).sort((a, b) => String(b.enviado_en || '').localeCompare(String(a.enviado_en || '')));
  }

  /** Sube (bucket 'documentos') y registra (fn_op_doc_registrar). Si el registro falla, borra el
      objeto huérfano del bucket — mismo criterio que ERP.documentos.subir del sistema legacy.
      `storagePath`: ruta FIJA propia (ej. oc/{folio}.pdf, para que regenerar reemplace el mismo
      archivo — upsert:true); si se omite, se genera una ruta única (adjuntos del proveedor). */
  async function subir({ entidad, entidadId, archivo, nombreArchivo, mime, categoria, nota, referenciaExterna, storagePath }) {
    const nombre = nombreArchivo || (archivo && archivo.name) || 'archivo';
    const contentType = mime || mimeDe(archivo);
    const path = storagePath || rutaAuto(entidad, entidadId, nombre);

    const { error: errSubida } = await sb.storage.from(BUCKET)
      .upload(path, archivo, { contentType, upsert: !!storagePath });
    if (errSubida) throw new Error(errSubida.message);

    try {
      const { data, error } = await sb.rpc('fn_op_doc_registrar', {
        p_entidad: entidad, p_entidad_id: String(entidadId), p_categoria: categoria,
        p_storage_path: path, p_nombre_archivo: nombre, p_mime: contentType,
        p_tamano_bytes: archivo.size, p_nota: nota || null, p_referencia_externa: referenciaExterna || null
      });
      if (error) throw new Error(error.message);
      return { ...(((data && data[0]) || {})), storage_path: path, nombre_archivo: nombre };
    } catch (e) {
      let limpio = true;
      try { const { error: errBorrado } = await sb.storage.from(BUCKET).remove([path]); if (errBorrado) limpio = false; }
      catch (_) { limpio = false; }
      throw new Error(e.message + (limpio ? '' : ` — ADEMÁS quedó un archivo huérfano en el bucket (${path}).`));
    }
  }

  async function urlFirmada(storagePath, segundos) {
    const { data, error } = await sb.storage.from(BUCKET).createSignedUrl(storagePath, segundos || SEGUNDOS_URL_VER);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  async function verDocumento(doc, boton) {
    const txt = boton && boton.textContent;
    if (boton) { boton.disabled = true; boton.textContent = 'Abriendo…'; }
    try {
      const url = await urlFirmada(doc.storage_path, SEGUNDOS_URL_VER);
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    } catch (e) {
      ERP.toast('err', `No se pudo abrir el documento: ${esc(e.message)}`);
    }
    if (boton) { boton.disabled = false; boton.textContent = txt; }
  }

  async function anular(documentoId) {
    const { error } = await sb.rpc('fn_op_doc_anular', { p_id: documentoId });
    if (error) throw new Error(error.message);
  }

  async function registrarEnvio(o) {
    const { data, error } = await sb.rpc('fn_op_envio_registrar', {
      p_entidad: o.entidad, p_entidad_id: String(o.entidadId), p_canal: o.canal,
      p_destinatario: o.destinatario || null, p_asunto: o.asunto || null, p_mensaje: o.mensaje || null,
      p_pdf_path: o.pdfPath || null, p_pdf_url: o.pdfUrl || null, p_estado: o.estado || 'enviado',
      p_contraparte_id: o.contraparteId != null ? Number(o.contraparteId) : null,
      p_proveedor_envio: o.proveedorEnvio || null, p_proveedor_ref: o.proveedorRef || null,
      p_error_detalle: o.errorDetalle || null
    });
    if (error) throw new Error(error.message);
    return (data && data[0]) || null;
  }

  /* ================= PDF oficial genérico (membrete Plein) =================
     Mismo espíritu que ERP.membreteOficial/tablaLineasDoc/pieOficial (exportar.js) — que ya usan
     Invoice/PO/Quote legacy sobre window.print() — pero dibujado con jsPDF (ya cargado en
     index.html) para producir un Blob real que SÍ se puede guardar en el bucket, no solo
     imprimirse. Mismo logo (ERP.logoPdfDataURL), mismo verde de marca, mismos rótulos de caja
     (VENDOR/BILL TO). Genérico a propósito: reusable por cualquier documento oficial nuevo
     (factura al cliente, liquidación…), no solo la Orden de Compra de Compras.
     o = { titulo, meta:[[label,val]], cajaIzq:{titulo,lineas:[str]}, cajaDer:{titulo,lineas:[str]},
           lineas:[{item,descripcion,qty,precio,total}], moneda, total, notaLabel, nota } */
  const VERDE_MARCA = [25, 107, 36];   // #196B24 — mismo verde que ya usa el jsPDF de Cotizaciones/Órdenes
  const DIRECCION_PLEIN = ['2595 Dallas Pkwy Ste 350', 'Frisco, TX 75034', '+1 (520) 300-3028', 'www.pleinproduce.com'];
  const EMPRESA_PLEIN = 'Plein Produce LLC';

  async function construirPdfOficial(o) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const money = n => (n == null || isNaN(Number(n))) ? '—' : ERP.usd(n).replace(/<[^>]+>/g, '');

    const logo = ERP.logoPdfDataURL ? await ERP.logoPdfDataURL() : null;
    if (logo) { try { const p = doc.getImageProperties(logo); const h = 30, w = p.width / p.height * h; doc.addImage(logo, 'PNG', 40, 30, w, h); } catch (_) { /* sin logo */ } }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(20, 38, 28);
    doc.text(String(o.titulo || 'DOCUMENTO'), 555, 46, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(107, 114, 104);
    let metaY = 62;
    (o.meta || []).forEach(([l, v]) => {
      doc.text(String(l || ''), 460, metaY, { align: 'right' });
      doc.setTextColor(20, 38, 28);
      doc.text(v == null ? '—' : String(v), 555, metaY, { align: 'right' });
      doc.setTextColor(107, 114, 104);
      metaY += 13;
    });

    // Dirección de Plein bajo el logo (siempre visible, es el membrete — mismo criterio que
    // ERP.membreteOficial en exportar.js).
    doc.setFontSize(8); doc.setTextColor(74, 84, 80);
    let dirY = 68;
    DIRECCION_PLEIN.forEach(l => { doc.text(l, 40, dirY); dirY += 10; });

    let y = Math.max(metaY, dirY) + 14;

    // Cajas VENDOR/BILL TO (o las que traiga cfg) lado a lado.
    const cajaW = 250;
    function pintarCaja(caja, x) {
      if (!caja) return;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(107, 114, 104);
      doc.text(String(caja.titulo || ''), x, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(20, 38, 28);
      let ly = y + 14;
      (caja.lineas || []).filter(Boolean).forEach(l => { doc.text(String(l), x, ly); ly += 12; });
    }
    pintarCaja(o.cajaIzq, 40);
    pintarCaja(o.cajaDer, 40 + cajaW);
    y += 14 + Math.max(
      ((o.cajaIzq && o.cajaIzq.lineas) || []).filter(Boolean).length,
      ((o.cajaDer && o.cajaDer.lineas) || []).filter(Boolean).length
    ) * 12 + 18;

    const lineas = Array.isArray(o.lineas) ? o.lineas : [];
    doc.autoTable({
      startY: y,
      head: [['ITEM#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL']],
      body: lineas.map(l => [
        l.item ?? '', l.descripcion ?? '',
        l.qty == null || l.qty === '' ? '—' : String(l.qty),
        l.precio == null ? '—' : money(l.precio),
        l.total == null ? '—' : money(l.total)
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: VERDE_MARCA },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: 40, right: 40 }
    });

    let y2 = doc.lastAutoTable.finalY + 18;
    if (o.nota) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(107, 114, 104);
      doc.text(String(o.notaLabel || 'Notas'), 40, y2);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(20, 38, 28);
      const lns = doc.splitTextToSize(String(o.nota), 320);
      doc.text(lns, 40, y2 + 13);
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...VERDE_MARCA);
    doc.text(`TOTAL: ${money(o.total)}`, 555, y2, { align: 'right' });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(107, 114, 104);
    doc.text('If you have any questions about this document, please contact sales@pleinproduce.com', 40, 740);

    return doc;
  }

  /* ================= Componente "Documentos" ================= */

  function aviso(el, tipo, html) { if (el) { el.className = 'aviso visible ' + tipo; el.innerHTML = html; } }
  function limpiarAviso(el) { if (el) { el.className = 'aviso'; el.innerHTML = ''; } }

  async function montar(contenedor, opciones) {
    const { entidad, entidadId } = opciones;
    const categorias = opciones.categorias || CATEGORIAS_DEFAULT;
    const puedeSubir = puede('capturar') && opciones.permitirSubir !== false;
    const puedeAnular = puede('administrar');
    const puedeVer = puede('ver');

    contenedor.innerHTML = '<div class="skel">Cargando documentos…</div>';
    let docs;
    try { docs = await listarDocumentos(entidad, entidadId); }
    catch (e) { contenedor.innerHTML = `<div class="errbox">No se pudieron leer los documentos: ${esc(e.message)}</div>`; return; }

    contenedor.innerHTML = `
      ${puedeSubir ? `
        <div class="docs-zona" id="odzZona">
          <div class="icono">📎</div>
          <div class="titulo">Arrastra un archivo aquí o toca para elegirlo</div>
          <div class="ayuda">PDF, imagen, Excel, Word o CSV · máximo 25 MB — ej. el Invoice, BOL, manifiesto o certificado QC que manda el proveedor</div>
          <input type="file" id="odzInput" accept=".pdf,.jpg,.jpeg,.png,.webp,.xlsx,.docx,.csv">
        </div>
        <div class="docs-form" id="odzForm">
          <div class="form-erp">
            <div class="campos">
              <div class="campo ancho"><label>Archivo</label><div class="campo-fijo" id="odzArchivo"></div></div>
              <div class="campo ancho"><label>Categoría <span class="req">*</span></label>
                <select id="odzCat"><option value="">— elige —</option>${categorias.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select></div>
              <div class="campo ancho"><label>Nota</label>
                <input id="odzNota" type="text" maxlength="200" placeholder="Opcional"></div>
            </div>
            <div class="acciones">
              <button class="btn-mini" id="odzSubir">Adjuntar documento</button>
              <button class="btn-mini gris" id="odzCancelar">Cancelar</button>
            </div>
            <div class="aviso" id="odzAviso"></div>
          </div>
        </div>` : ''}
      <div id="odzLista"></div>
      <div class="aviso" id="odzAvisoLista"></div>`;

    const elLista = contenedor.querySelector('#odzLista');
    const elAvisoLista = contenedor.querySelector('#odzAvisoLista');

    function pintarLista() {
      if (!docs.length) { elLista.innerHTML = '<div class="docs-vacio">Sin documentos.</div>'; return; }
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
          </span>
          <span class="acciones-doc">
            ${puedeVer ? `<button class="btn-mini gris" data-ver="${i}">Ver</button>` : ''}
            ${puedeAnular ? `<button class="btn-mini peligro" data-anular="${i}">Anular</button>` : ''}
          </span>
        </div>`;
      }).join('');
      elLista.querySelectorAll('[data-ver]').forEach(b => b.addEventListener('click', () => verDocumento(docs[Number(b.dataset.ver)], b)));
      elLista.querySelectorAll('[data-anular]').forEach(b => b.addEventListener('click', () => confirmarAnular(docs[Number(b.dataset.anular)], b)));
    }

    async function confirmarAnular(doc, boton) {
      if (!window.confirm(`¿Anular "${doc.nombre_archivo}"?\n\nDeja de aparecer en la ficha. No hay botón para deshacerlo.`)) return;
      boton.disabled = true; limpiarAviso(elAvisoLista);
      try {
        await anular(doc.documento_id);
        docs = await listarDocumentos(entidad, entidadId);
        pintarLista();
        aviso(elAvisoLista, 'ok', `Documento <b>${esc(doc.nombre_archivo)}</b> anulado.`);
      } catch (e) {
        aviso(elAvisoLista, 'err', `No se anuló: ${esc(e.message)}`);
        boton.disabled = false;
      }
    }

    pintarLista();
    if (!puedeSubir) return;

    const zona = contenedor.querySelector('#odzZona');
    const input = contenedor.querySelector('#odzInput');
    const form = contenedor.querySelector('#odzForm');
    const elArchivo = contenedor.querySelector('#odzArchivo');
    const elAviso = contenedor.querySelector('#odzAviso');
    const btnSubir = contenedor.querySelector('#odzSubir');
    let archivo = null;

    function elegir(f) {
      const ext = extDe(f.name);
      limpiarAviso(elAviso);
      if (!EXT_OK.includes(ext)) { aviso(elAvisoLista, 'err', `<b>${esc(f.name)}</b> no es un tipo permitido. Se aceptan: ${EXT_OK.join(', ')}.`); return; }
      if (f.size > MAX_BYTES) { aviso(elAvisoLista, 'err', `<b>${esc(f.name)}</b> pesa ${esc(tamano(f.size))}; el máximo son 25 MB.`); return; }
      limpiarAviso(elAvisoLista);
      archivo = f;
      elArchivo.innerHTML = `${ICONO[ext] || '📎'} ${esc(f.name)} <div class="aclara">${esc(tamano(f.size))} · ${esc(mimeDe(f))}</div>`;
      form.classList.add('abierto');
    }

    zona.addEventListener('click', () => input.click());
    input.addEventListener('change', () => { if (input.files[0]) elegir(input.files[0]); });
    ['dragenter', 'dragover'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.add('encima'); }));
    ['dragleave', 'drop'].forEach(ev => zona.addEventListener(ev, e => { e.preventDefault(); zona.classList.remove('encima'); }));
    zona.addEventListener('drop', e => { const f = e.dataTransfer && e.dataTransfer.files[0]; if (f) elegir(f); });

    contenedor.querySelector('#odzCancelar').addEventListener('click', () => {
      archivo = null; input.value = ''; form.classList.remove('abierto'); limpiarAviso(elAviso);
    });

    btnSubir.addEventListener('click', async () => {
      const categoria = contenedor.querySelector('#odzCat').value;
      limpiarAviso(elAviso);
      if (!archivo) { aviso(elAviso, 'err', 'Elige un archivo.'); return; }
      if (!categoria) { aviso(elAviso, 'err', 'Elige una categoría de la lista.'); return; }
      btnSubir.disabled = true; zona.classList.add('subiendo');
      aviso(elAviso, 'warn', `Subiendo <b>${esc(archivo.name)}</b>…`);
      try {
        await subir({ entidad, entidadId, archivo, categoria, nota: contenedor.querySelector('#odzNota').value.trim() });
        docs = await listarDocumentos(entidad, entidadId);
        pintarLista();
        aviso(elAvisoLista, 'ok', `<b>${esc(archivo.name)}</b> adjuntado.`);
        archivo = null; input.value = '';
        contenedor.querySelector('#odzNota').value = '';
        contenedor.querySelector('#odzCat').value = '';
        form.classList.remove('abierto'); limpiarAviso(elAviso);
      } catch (e) {
        aviso(elAviso, 'err', `No se subió: ${esc(e.message)}`);
      }
      btnSubir.disabled = false; zona.classList.remove('subiendo');
    });
  }

  /* ================= Componente "Envíos" ================= */

  function chipEnvio(estado) {
    const e = String(estado || '').toLowerCase();
    const cls = e === 'enviado' ? 'verde' : e === 'error' ? 'rojo' : 'ambar';
    return `<span class="pill ${cls}">${esc(estado || '—')}</span>`;
  }

  async function montarEnvios(contenedor, opciones) {
    const { entidad, entidadId } = opciones;
    contenedor.innerHTML = '<div class="skel">Cargando envíos…</div>';
    let envios;
    try { envios = await listarEnvios(entidad, entidadId); }
    catch (e) { contenedor.innerHTML = `<div class="errbox">No se pudieron leer los envíos: ${esc(e.message)}</div>`; return; }

    if (!envios.length) { contenedor.innerHTML = '<div class="docs-vacio">Sin envíos registrados.</div>'; return; }
    contenedor.innerHTML = `<div class="tabla-wrap"><table>
      <thead><tr><th>Canal</th><th>Destinatario</th><th>Estado</th><th>Enviado</th><th>Por</th></tr></thead>
      <tbody>${envios.map(e => `<tr>
        <td class="mono">${esc(e.canal)}</td>
        <td>${esc(e.destinatario || '—')}</td>
        <td>${chipEnvio(e.estado)}</td>
        <td>${esc(e.enviado_en ? fecha(e.enviado_en) : '—')}</td>
        <td>${esc(e.enviado_por || '—')}</td>
      </tr>`).join('')}</tbody>
    </table></div>`;
    ERP.marcarTabla(contenedor);
  }

  /** Bloque BILL TO fijo con los datos de la propia Plein — mismo criterio que
      ERP.bloqueEmpresaPlein() en exportar.js, aquí en forma de array de líneas para
      construirPdfOficial (cajaDer.lineas). */
  const bloqueEmpresaPleinPdf = () => [EMPRESA_PLEIN, ...DIRECCION_PLEIN];

  return {
    montar, montarEnvios, subir, urlFirmada, verDocumento, anular, registrarEnvio,
    listarDocumentos, listarEnvios, CATEGORIAS_DEFAULT, construirPdfOficial, bloqueEmpresaPleinPdf
  };
})();
