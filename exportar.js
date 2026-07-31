/* Exportaciones Excel (SheetJS) y PDF (jsPDF + autotable) — cargadas por CDN en index.html.
   Expone:
     ERP.exportarExcel(selectorOrEl, {nombre, titulo})
     ERP.exportarPDF(selectorOrEl, {nombre, titulo})
     ERP.exportarExpedientePDF(estado)   // PDF completo del expediente de embarque
   Lee la(s) tabla(s) visibles del módulo actual, con encabezados y formato de moneda.
   Nombre de archivo: PleinProduce_{Reporte}_{YYYY-MM-DD}.(xlsx|pdf) */

(function () {
  'use strict';
  const { esc, usd, num } = ERP;
  const EMPRESA = 'Plein Produce LLC';

  const hoy = () => new Date().toISOString().slice(0, 10);
  const slug = s => String(s || 'Reporte').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'Reporte';
  const archivo = (nombre, ext) => `PleinProduce_${slug(nombre)}_${hoy()}.${ext}`;

  // "$12,345.67" / "−$1,234.00" / "-$5.00" → 12345.67 / -1234 / -5 ; null si no es moneda.
  const RE_MONEDA = /^[−-]?\$[\d,]+(\.\d+)?$/;
  function parseMoneda(txt) {
    const t = String(txt).trim();
    if (!RE_MONEDA.test(t)) return null;
    const neg = /^[−-]/.test(t);
    const n = Number(t.replace(/[−\-$,]/g, ''));
    return isNaN(n) ? null : (neg ? -n : n);
  }

  /* ---------- Lectura de una tabla del DOM ---------- */

  function resolverTabla(selectorOrEl) {
    if (!selectorOrEl) return document.querySelector('#modContenido table');
    if (typeof selectorOrEl === 'string') {
      const raiz = document.getElementById('modContenido') || document;
      return raiz.querySelector(selectorOrEl) || document.querySelector(selectorOrEl);
    }
    return selectorOrEl.tagName === 'TABLE' ? selectorOrEl : selectorOrEl.querySelector('table');
  }

  /** Devuelve { headers:[], filas:[[...]], moneda:[bool] } saltando columnas de acción (botones). */
  function scrape(tabla) {
    if (!tabla) return null;
    const ths = Array.from(tabla.querySelectorAll('thead th'));
    // Columnas a excluir: encabezado vacío cuyas celdas del cuerpo tienen botones (acciones).
    const filasCuerpo = Array.from(tabla.querySelectorAll('tbody tr'))
      .concat(Array.from(tabla.querySelectorAll('tfoot tr')));
    const nCols = ths.length || (filasCuerpo[0] ? filasCuerpo[0].children.length : 0);

    const esAccion = new Array(nCols).fill(false);
    for (let c = 0; c < nCols; c++) {
      const headVacio = !ths[c] || !ths[c].textContent.trim();
      let tieneBoton = false, tieneTexto = false;
      filasCuerpo.forEach(tr => {
        const cel = tr.children[c];
        if (!cel) return;
        if (cel.querySelector('button')) tieneBoton = true;
        if (cel.textContent.trim()) tieneTexto = true;
      });
      esAccion[c] = headVacio && tieneBoton && !tieneTexto;
    }

    const idx = [];
    for (let c = 0; c < nCols; c++) if (!esAccion[c]) idx.push(c);

    const headers = idx.map(c => (ths[c] ? ths[c].textContent.trim() : ''));
    const moneda = idx.map(() => false);
    const filas = filasCuerpo.map(tr => idx.map((c, k) => {
      const cel = tr.children[c];
      const txt = cel ? cel.textContent.trim() : '';
      const m = parseMoneda(txt);
      if (m !== null) { moneda[k] = true; return m; }
      return txt;
    }));
    return { headers, filas, moneda };
  }

  /* ---------- Excel (SheetJS) ---------- */

  function exportarExcel(selectorOrEl, opts = {}) {
    if (typeof XLSX === 'undefined') { ERP.toast('err', 'La librería de Excel no cargó. Revisa la conexión.'); return; }
    const data = scrape(resolverTabla(selectorOrEl));
    if (!data || !data.filas.length) { ERP.toast('warn', 'No hay datos visibles para exportar.'); return; }

    const aoa = [data.headers, ...data.filas];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Formato de moneda por columna detectada
    const R = aoa.length, C = data.headers.length;
    for (let c = 0; c < C; c++) {
      if (!data.moneda[c]) continue;
      for (let r = 1; r < R; r++) {
        const ref = XLSX.utils.encode_cell({ r, c });
        const cell = ws[ref];
        if (cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = '$#,##0.00'; }
      }
    }
    ws['!cols'] = data.headers.map((h, c) => ({ wch: Math.max(10, Math.min(40,
      Math.max(h.length, ...data.filas.map(f => String(f[c] ?? '').length)) + 2)) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (opts.nombre || 'Reporte').slice(0, 28));
    XLSX.writeFile(wb, archivo(opts.nombre, 'xlsx'));
    ERP.toast('ok', 'Excel exportado.');
  }

  /* ---------- Logo (dataURL) para el PDF ---------- */

  let logoPromise = null;
  function cargarLogo() {
    if (logoPromise) return logoPromise;
    logoPromise = fetch('assets/logo-plein.png')
      .then(r => { if (!r.ok) throw new Error('sin logo'); return r.blob(); })
      .then(b => new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(b);
      }))
      .catch(() => null);
    return logoPromise;
  }

  async function encabezadoPDF(doc, titulo) {
    // Logo de marca en vez del texto de empresa (el logo ya lleva el nombre). ~32px = 24pt de alto.
    const logo = await cargarLogo();
    let y = 40;
    if (logo) {
      try {
        const props = doc.getImageProperties(logo);
        const h = 24, w = props.width / props.height * h;
        doc.addImage(logo, 'PNG', 40, 22, w, h);
        y = 62;
      } catch (_) { /* sin logo: cae al texto */ }
    }
    if (y === 40) { doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(25, 107, 36); doc.text(EMPRESA, 40, 40); y = 60; }
    doc.setFont('helvetica', 'normal'); doc.setFontSize(12); doc.setTextColor(20, 38, 28);
    doc.text(String(titulo || 'Reporte'), 40, y);
    doc.setFontSize(9); doc.setTextColor(107, 114, 104);
    doc.text('Generado: ' + new Date().toLocaleString('es-MX'), 40, y + 14);
    return y + 28;
  }

  /* Imprime un documento DOM (window.print) esperando a que las imágenes (el logo) terminen de
     cargar; si no, la impresión se dispara antes y el logo sale en blanco. Salvaguarda a 1.5 s. */
  function imprimirArea(html) {
    let host = document.getElementById('areaImpresion');
    if (!host) { host = document.createElement('div'); host.id = 'areaImpresion'; document.body.appendChild(host); }
    host.innerHTML = html;
    const pend = Array.from(host.querySelectorAll('img')).filter(im => !im.complete);
    if (!pend.length) { window.print(); return; }
    let disparado = false;
    const go = () => { if (disparado) return; disparado = true; window.print(); };
    let faltan = pend.length;
    const uno = () => { if (--faltan <= 0) go(); };
    pend.forEach(im => { im.addEventListener('load', uno, { once: true }); im.addEventListener('error', uno, { once: true }); });
    setTimeout(go, 1500);
  }

  /* Texto de una línea de documento a partir de producto (nombre del catálogo) y descripción libre:
     ambos → "Producto — descripción" · solo uno → ese · ninguno → "". Evita celdas vacías cuando el
     usuario eligió producto del select sin escribir descripción. */
  function descLineaDoc(producto, descripcion) {
    const p = String(producto == null ? '' : producto).trim();
    const d = String(descripcion == null ? '' : descripcion).trim();
    if (p && d) return `${p} — ${d}`;
    return d || p || '';
  }

  /* Encabezado compartido para las plantillas de impresión DOM (window.print): INVOICE, PURCHASE
     ORDER, etc. Logo a la izquierda (48px), título + meta a la derecha. filas = [[label, valor], …]. */
  /* Encabezado compartido de los documentos oficiales (INVOICE, PURCHASE ORDER, ACCOUNT OF SALES):
     IZQUIERDA = logo + bloque de empresa Plein (nombre + dirección + contacto); DERECHA = título +
     tabla meta (número/fecha/términos). `empresa` = {nombre, direccion, contacto} (opcional): el
     nombre cae a 'PLEIN PRODUCE LLC' si no viene; dirección/contacto solo se pintan si existen (se
     obtienen de v_config vía ERP.empresaImpresion — NUNCA se inventa una dirección legal). */
  function encabezadoImpresion(titulo, filas, empresa) {
    const e = empresa || {};
    const nombre = (e.nombre && String(e.nombre).trim()) || EMPRESA;   // 'Plein Produce LLC' (fuente única); el CSS lo pone en mayúsculas
    const linea = v => (v && String(v).trim()) ? `<div class="inv-co-line">${esc(v).replace(/\n/g, '<br>')}</div>` : '';
    return `<div class="inv-top">
      <div class="inv-head-left">
        <div class="inv-logo"><img src="assets/logo-plein.png" alt="Plein Produce" style="height:48px" onerror="this.style.display='none'"></div>
        <div class="inv-company">
          <div class="inv-co-name">${esc(nombre)}</div>
          ${linea(e.direccion)}${linea(e.contacto)}
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-title">${esc(titulo)}</div>
        <table class="inv-meta-tbl">
          ${(filas || []).map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v == null ? '' : v)}</td></tr>`).join('')}
        </table>
      </div>
    </div>`;
  }

  /* ============ Membrete oficial (INVOICE / PURCHASE ORDER / QUOTE) ============
     Header claro + logo + footer verde, compartido por los 3 documentos oficiales
     (modulo-facturas.js, modulo-ordenes.js, modulo-comercial.js). Solo cambian título,
     etiquetas de meta y el bloque de contraparte — eso lo arma cada módulo. */

  // Dirección fija del membrete: va impresa en los 3 documentos, no depende de v_config.
  const DIRECCION_PLEIN = ['2595 Dallas Pkwy Ste 350', 'Frisco, TX 75034', '+1 (520) 300-3028', 'www.pleinproduce.com'];

  /** filasMeta = [[etiqueta, valor], …] — 3 filas en Invoice/Quote, 4 en Purchase Order. */
  function membreteOficial(titulo, filasMeta) {
    return `<div class="inv-masthead">
      <div class="inv-masthead-left">
        <img class="inv-masthead-logo" src="assets/logo-plein.png" alt="Plein Produce" style="height:44px" onerror="this.style.display='none'">
        <div class="inv-masthead-addr">${DIRECCION_PLEIN.map(esc).join('<br>')}</div>
      </div>
      <div class="inv-masthead-right">
        <div class="inv-masthead-title">${esc(titulo)}</div>
        <table class="inv-masthead-meta">
          ${(filasMeta || []).map(([l, v]) => `<tr><td>${esc(l)}</td><td>${esc(v == null ? '' : v)}</td></tr>`).join('')}
        </table>
      </div>
    </div>`;
  }

  function pieOficial() {
    return `<div class="inv-footgreen">
      <div>If you have any questions about this invoice, please contact <b>sales@pleinproduce.com</b></div>
      <div style="margin-top:4px;font-weight:700">Thank you for your business!</div>
    </div>`;
  }

  /** Bloque de contraparte con los datos de la propia Plein (Purchase Order: "BILL TO" = Plein,
      fijo, mismo criterio que la dirección del membrete). */
  function bloqueEmpresaPlein() {
    return [EMPRESA, ...DIRECCION_PLEIN].map(esc).join('<br>');
  }

  /* Tabla de renglones compartida: mismas 5 columnas (ITEM# / DESCRIPTION / QTY / UNIT PRICE /
     TOTAL) que usan los 3 documentos, todas alimentadas por un `lineas` JSON con la misma forma
     {item, descripcion, qty, precio, total}. `minFilas` rellena con renglones vacíos para que la
     tabla no se vea corta con pocas líneas (mismo criterio visual que ya usaba el invoice). */
  const numDoc = v => (v === '' || v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

  function filaLineaDoc(l) {
    return `<tr>
      <td>${esc(l.item ?? '')}</td>
      <td>${esc(l.descripcion ?? '')}</td>
      <td class="ctr">${l.qty === '' || l.qty == null ? '—' : esc(l.qty)}</td>
      <td class="ctr">${numDoc(l.precio) == null ? '—' : usd(l.precio)}</td>
      <td class="num">${numDoc(l.total) == null ? '—' : usd(l.total)}</td>
    </tr>`;
  }

  function tablaLineasDoc(lineas, minFilas) {
    const lin = Array.isArray(lineas) ? lineas : [];
    const vacias = Math.max(0, (minFilas == null ? 7 : minFilas) - lin.length);
    const filasVacias = Array.from({ length: vacias }, () =>
      '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>').join('');
    return `<table class="inv-items">
      <colgroup><col style="width:19%"><col style="width:34%"><col style="width:10%"><col style="width:19%"><col style="width:19%"></colgroup>
      <thead><tr><th>ITEM#</th><th>DESCRIPTION</th><th class="ctr">QTY</th><th class="ctr">UNIT PRICE</th><th class="num">TOTAL</th></tr></thead>
      <tbody>${lin.map(filaLineaDoc).join('')}${filasVacias}</tbody>
    </table>`;
  }

  /* Bloque de empresa para el encabezado, leído de v_config (claves empresa_nombre / empresa_direccion
     / empresa_contacto). ERP.q cachea por URL → una sola lectura para todos los documentos. Si las
     claves no están, devuelve solo el nombre por defecto (los renglones de dirección/contacto se
     omiten). Nunca inventa una dirección. */
  async function empresaImpresion() {
    const out = { nombre: null, direccion: null, contacto: null };
    try {
      const rows = await ERP.q('v_config', '&clave=in.(empresa_nombre,empresa_direccion,empresa_contacto)&select=clave,valor');
      (rows || []).forEach(r => {
        if (r.clave === 'empresa_nombre') out.nombre = r.valor;
        else if (r.clave === 'empresa_direccion') out.direccion = r.valor;
        else if (r.clave === 'empresa_contacto') out.contacto = r.valor;
      });
    } catch (e) {
      console.warn('[Impresión] no se pudo leer el bloque de empresa de v_config: ' + e.message + ' — se usa solo el nombre por defecto.');
    }
    return out;
  }

  function nuevoDoc() {
    const jsPDFctor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDFctor) return null;
    return new jsPDFctor({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  }

  async function exportarPDF(selectorOrEl, opts = {}) {
    const doc = nuevoDoc();
    if (!doc || typeof doc.autoTable !== 'function') { ERP.toast('err', 'La librería de PDF no cargó. Revisa la conexión.'); return; }
    const data = scrape(resolverTabla(selectorOrEl));
    if (!data || !data.filas.length) { ERP.toast('warn', 'No hay datos visibles para exportar.'); return; }

    const startY = await encabezadoPDF(doc, opts.titulo || opts.nombre);
    const body = data.filas.map(f => f.map((v, c) => data.moneda[c] && typeof v === 'number' ? usd(v) : String(v ?? '')));
    doc.autoTable({
      head: [data.headers], body, startY,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [25, 107, 36], textColor: 255 },
      alternateRowStyles: { fillColor: [244, 243, 239] },
      margin: { left: 40, right: 40 }
    });
    doc.save(archivo(opts.nombre, 'pdf'));
    ERP.toast('ok', 'PDF exportado.');
  }

  /* ---------- PDF del Expediente completo ---------- */

  async function exportarExpedientePDF(estado) {
    const doc = nuevoDoc();
    if (!doc || typeof doc.autoTable !== 'function') { ERP.toast('err', 'La librería de PDF no cargó. Revisa la conexión.'); return; }
    const d = estado.d, costos = estado.costos || [], apls = estado.apls || [];
    const MOD = { margen_fijo: 'Margen Fijo', consignacion: 'Consignación' };

    let y = await encabezadoPDF(doc, `Expediente de embarque ${d.folio}`);

    doc.autoTable({
      startY: y, styles: { fontSize: 9, cellPadding: 4 }, theme: 'plain',
      body: [
        ['Folio', d.folio, 'P.O.', d.po || '—'],
        ['Proveedor', d.proveedor || '—', 'Cliente', d.cliente || '—'],
        ['Modalidad', MOD[d.modalidad] || d.modalidad || '—', 'Embarque', ERP.fecha(d.f_embarque)],
        ['Venta', usd(d.ingreso_venta), 'Saldo por cobrar', usd(d.saldo_cxc)],
        ['Costo total', usd(d.costo_total), 'Saldo por pagar', usd(d.saldo_cxp)]
      ],
      columnStyles: { 0: { fontStyle: 'bold', textColor: [107, 114, 104] }, 2: { fontStyle: 'bold', textColor: [107, 114, 104] } },
      margin: { left: 40, right: 40 }
    });

    // Costos
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14,
      head: [['Concepto', 'Nota', 'Monto']],
      body: costos.length ? costos.map(c => [c.concepto || '', c.nota || '', usd(c.monto)]) : [['Sin costos', '', '']],
      foot: costos.length ? [['Total costos', '', usd(costos.reduce((s, c) => s + num(c.monto), 0))]] : null,
      styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [25, 107, 36], textColor: 255 },
      footStyles: { fillColor: [228, 239, 231], textColor: [20, 38, 28], fontStyle: 'bold' },
      margin: { left: 40, right: 40 }
    });

    // Pagos y cobros
    const filasAp = apls.map(a => [ERP.fecha(a.fecha), a.mov_folio || '—',
      a.clase === 'cobro' ? 'Cobro' : 'Pago', a.descripcion || a.nota || '—', usd(a.monto)]);
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14,
      head: [['Fecha', 'Mov.', 'Tipo', 'Detalle', 'Monto']],
      body: filasAp.length ? filasAp : [['—', '—', '—', 'Sin movimientos', '']],
      styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [25, 107, 36], textColor: 255 },
      margin: { left: 40, right: 40 }
    });

    // Documentos adjuntos (nombres y tipos)
    let docs = [];
    try { docs = await ERP.q('v_carga_documentos', `&carga_folio=${ERP.eq(d.folio)}&order=id.desc`); } catch (_) { docs = []; }
    const TL = { orden_compra: 'Orden de Compra', orden_venta: 'Orden de Venta', factura_proveedor: 'Factura de Proveedor', factura_cliente: 'Factura a Cliente', bol: 'BOL / Carta Porte', packing_list: 'Packing List', pedimento_aduanal: 'Pedimento Aduanal', certificado: 'Certificado', comprobante_pago: 'Comprobante de Pago', foto_qc: 'Foto Control de Calidad', otro: 'Otro' };
    doc.autoTable({
      startY: doc.lastAutoTable.finalY + 14,
      head: [['Documento', 'Tipo']],
      body: docs.length ? docs.map(dc => [dc.nombre_archivo || '—', TL[dc.tipo] || dc.tipo || '—'])
        : [['Sin documentos adjuntos', '']],
      styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [25, 107, 36], textColor: 255 },
      margin: { left: 40, right: 40 }
    });

    doc.save(`PleinProduce_Expediente_${slug(d.folio)}_${hoy()}.pdf`);
    ERP.toast('ok', 'Expediente PDF exportado.');
  }

  /* ---------- Barra de botones reutilizable ---------- */

  /** HTML de los dos botones. data-exp-sel = selector de la tabla objetivo. */
  ERP.botonesExportar = (nombre, titulo, selector) =>
    `<div class="exportar-barra">
      <button class="btn-mini gris" data-exp="excel" data-exp-nombre="${esc(nombre)}" data-exp-titulo="${esc(titulo)}" data-exp-sel="${esc(selector || '')}">Exportar Excel</button>
      <button class="btn-mini gris" data-exp="pdf" data-exp-nombre="${esc(nombre)}" data-exp-titulo="${esc(titulo)}" data-exp-sel="${esc(selector || '')}">Exportar PDF</button>
    </div>`;

  /** Conecta los botones dentro de un contenedor. */
  ERP.cablearExportar = cont => {
    (cont || document).querySelectorAll('[data-exp]').forEach(b => {
      if (b._expWired) return; b._expWired = true;
      b.addEventListener('click', () => {
        const opts = { nombre: b.dataset.expNombre, titulo: b.dataset.expTitulo };
        const sel = b.dataset.expSel || null;
        const multi = b.dataset.expMulti === '1';
        if (b.dataset.exp === 'excel') (multi ? exportarExcelVarias : exportarExcel)(sel, opts);
        else (multi ? exportarPDFVarias : exportarPDF)(sel, opts);
      });
    });
  };

  /* ---------- Export multi-tabla (varias tablas de un contenedor en un solo archivo) ---------- */
  function resolverContenedor(sel) {
    if (!sel) return null;
    if (typeof sel !== 'string') return sel;
    const raiz = document.getElementById('modContenido') || document;
    return raiz.querySelector(sel) || document.querySelector(sel);
  }
  /** Raspa TODAS las <table> del contenedor; cada sección lleva su título (data-exp-seccion). */
  function scrapeTablas(cont) {
    if (!cont) return [];
    return Array.from(cont.querySelectorAll('table')).map(t => {
      const s = scrape(t);
      if (s) s.titulo = t.getAttribute('data-exp-seccion') || '';
      return s;
    }).filter(s => s && s.filas.length);
  }
  function exportarExcelVarias(sel, opts = {}) {
    if (typeof XLSX === 'undefined') { ERP.toast('err', 'La librería de Excel no cargó. Revisa la conexión.'); return; }
    const secciones = scrapeTablas(resolverContenedor(sel));
    if (!secciones.length) { ERP.toast('warn', 'No hay datos visibles para exportar.'); return; }
    const aoa = [], money = [];
    secciones.forEach((s, i) => {
      if (i) aoa.push([]);                 // renglón en blanco entre secciones
      if (s.titulo) aoa.push([s.titulo]);
      aoa.push(s.headers);
      s.filas.forEach(f => {
        const r = aoa.length;
        f.forEach((v, c) => { if (s.moneda[c] && typeof v === 'number') money.push([r, c]); });
        aoa.push(f);
      });
    });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    money.forEach(([r, c]) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = '$#,##0.00'; }
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (opts.nombre || 'Reporte').slice(0, 28));
    XLSX.writeFile(wb, archivo(opts.nombre, 'xlsx'));
    ERP.toast('ok', 'Excel exportado.');
  }
  async function exportarPDFVarias(sel, opts = {}) {
    const doc = nuevoDoc();
    if (!doc || typeof doc.autoTable !== 'function') { ERP.toast('err', 'La librería de PDF no cargó. Revisa la conexión.'); return; }
    const secciones = scrapeTablas(resolverContenedor(sel));
    if (!secciones.length) { ERP.toast('warn', 'No hay datos visibles para exportar.'); return; }
    let y = await encabezadoPDF(doc, opts.titulo || opts.nombre);
    secciones.forEach(s => {
      if (s.titulo) { doc.setFontSize(11); doc.setTextColor(25, 107, 36); doc.text(s.titulo, 40, y); y += 6; }
      const body = s.filas.map(f => f.map((v, c) => s.moneda[c] && typeof v === 'number' ? usd(v) : String(v ?? '')));
      doc.autoTable({
        head: [s.headers], body, startY: y,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [25, 107, 36], textColor: 255 },
        alternateRowStyles: { fillColor: [244, 243, 239] },
        margin: { left: 40, right: 40 }
      });
      y = doc.lastAutoTable.finalY + 20;
    });
    doc.save(archivo(opts.nombre, 'pdf'));
    ERP.toast('ok', 'PDF exportado.');
  }
  /** Barra de botones para export multi-tabla: apunta a un CONTENEDOR con varias tablas. */
  ERP.botonesExportarVarias = (nombre, titulo, selector) =>
    `<div class="exportar-barra">
      <button class="btn-mini gris" data-exp="excel" data-exp-multi="1" data-exp-nombre="${esc(nombre)}" data-exp-titulo="${esc(titulo)}" data-exp-sel="${esc(selector || '')}">Exportar Excel</button>
      <button class="btn-mini gris" data-exp="pdf" data-exp-multi="1" data-exp-nombre="${esc(nombre)}" data-exp-titulo="${esc(titulo)}" data-exp-sel="${esc(selector || '')}">Exportar PDF</button>
    </div>`;
  ERP.exportarExcelVarias = exportarExcelVarias;
  ERP.exportarPDFVarias = exportarPDFVarias;

  ERP.exportarExcel = exportarExcel;
  ERP.exportarPDF = exportarPDF;
  ERP.exportarExpedientePDF = exportarExpedientePDF;
  ERP.encabezadoImpresion = encabezadoImpresion;   // header compartido para plantillas DOM (window.print)
  ERP.empresaImpresion = empresaImpresion;         // bloque de empresa Plein (v_config, cacheado)
  ERP.imprimirArea = imprimirArea;                 // imprime esperando a que cargue el logo
  ERP.descLineaDoc = descLineaDoc;                 // texto de línea (producto — descripción) sin celdas vacías
  ERP.logoPdfDataURL = cargarLogo;                 // dataURL del logo para módulos que usan jsPDF propio
  ERP.membreteOficial = membreteOficial;           // header claro+logo de INVOICE/PURCHASE ORDER/QUOTE
  ERP.pieOficial = pieOficial;                     // footer verde compartido de los 3 documentos oficiales
  ERP.tablaLineasDoc = tablaLineasDoc;             // tabla de renglones compartida (mismo formato lineas[])
  ERP.bloqueEmpresaPlein = bloqueEmpresaPlein;     // "BILL TO" = Plein, fijo (Purchase Order)
})();
