Vamos a empezar la Fase 1 del ERP Plein 3.0: convertir el dashboard actual (index.html)
en un sistema profesional con módulos separados, buscador universal y drill-down.

CONTEXTO: Lee CLAUDE.md primero. El archivo index.html actual funciona y tiene el login
(Supabase Auth) y el patrón de conexión — úsalo como referencia de estilo y de cómo se
conecta a Supabase, pero vamos a reorganizar todo en módulos.

QUÉ CONSTRUIR:

1. ESTRUCTURA DE ARCHIVOS
   - index.html → shell principal: login, menú lateral, header con buscador universal,
     y un <main id="app"> donde se cargan los módulos.
   - Un archivo por módulo (ej. modulo-inicio.js, modulo-cargas.js, modulo-cobranza.js,
     modulo-pagos.js, modulo-tesoreria.js, modulo-finanzas.js, modulo-flags.js) que
     renderiza su contenido dentro de #app cuando el usuario lo selecciona en el menú.
   - Un archivo compartido (comun.js o similar) con: cliente de Supabase, helpers de
     formato de moneda/fecha, función q() para consultar vistas, función para llamar RPCs.
   - Sin build step: todo se sirve tal cual, JS vanilla + supabase-js por CDN (revisa cómo
     está importado en el index.html actual).

2. MENÚ LATERAL — módulos, en este orden:
   Inicio · Cargas · Cobranza · Pagos · Tesorería · Finanzas · Flags
   (Cotizaciones, Órdenes, Documentos llegan en fases futuras — deja el espacio en el
   menú pero pueden decir "Próximamente" si los agregas ya desde ahora, o simplemente
   omítelos del menú hasta la Fase 4/3).

3. BUSCADOR UNIVERSAL (en el header, siempre visible)
   Input de texto. Al escribir (con debounce ~300ms) o al dar Enter, llama:
     POST a la función RPC fn_buscar_universal con { termino: <texto> }
   vía supabase.rpc('fn_buscar_universal', { termino: texto })
   Devuelve filas con columnas: tipo, id, titulo, subtitulo, ref_folio, relevancia.
   tipo puede ser: 'carga', 'cliente', 'proveedor', 'contraparte', 'producto', 'movimiento'.
   Muestra resultados en un dropdown debajo del buscador, agrupados o con ícono por tipo.
   Al hacer clic en un resultado:
     - tipo='carga' → abre el módulo Cargas filtrado/enfocado en ese folio (usa ref_folio o id)
     - tipo='movimiento' → si tiene ref_folio, abre esa carga; si no, muestra el movimiento
     - tipo='cliente'/'proveedor'/'contraparte' → abre Cobranza o Pagos filtrado por esa contraparte

4. INICIO (módulo por defecto al entrar)
   Ligero, NO cargado. 5-6 tarjetas grandes clicables con un número + etiqueta, cada una
   navega a su módulo:
   - Saldo JPM (de v_anclas o v_saldo_cuentas) → Tesorería
   - CxC total (de v_anclas) → Cobranza
   - CxP total (de v_anclas) → Pagos
   - Flags activas (de v_anclas) → Flags
   - Utilidad bruta del mes actual (de v_estado_resultados) → Finanzas
   - Cargas activas (cuenta de v_rentabilidad_carga con estado != 'Entregada' o similar) → Cargas

5. CARGAS — el módulo con más uso, prioriza que quede muy bien:
   - Buscador local propio (por folio, PO, cliente, producto — filtro instantáneo sobre
     v_rentabilidad_carga, esto es aparte del buscador universal del header)
   - Vista tipo tabla o tarjetas, con filtro por estado
   - Al hacer clic en una carga: panel de detalle (drawer lateral o vista completa) con
     todos sus datos de v_rentabilidad_carga — esto es la base para la Fase 2 (pipeline
     de etapas y captura en contexto), por ahora solo el detalle de lectura

6. FINANZAS — trae P&L, flujo de caja, balance (lo que ya existía en index.html), pero:
   - Cada celda de ingreso/costo del P&L mensual debe ser CLICABLE y abrir un desglose
     (modal o panel) con las cargas de ese mes, consultando v_pl_mes_detalle filtrado
     por ese mes — esto es el drill-down clave que pidió Miguel

7. COBRANZA — trae lo de v_cxc_cliente / v_cxc_aging_resumen que ya existía, pero:
   - Cada cliente/saldo debe ser clicable y mostrar el desglose de sus cargas pendientes
     via v_cxc_detalle_cliente filtrado por ese cliente

8. PAGOS — igual que Cobranza pero con v_cxp_proximas / v_cxp_detalle_proveedor

9. TESORERÍA y FLAGS — trae lo que ya existía en index.html, reorganizado en su módulo.

10. DISEÑO: profesional y sobrio (es un ERP financiero), reutiliza la paleta y estilos
    del index.html actual (verdes/ámbar/rojo para semáforos), pero con más aire —
    nada de todo apilado en una sola página larga. Responsive, se abre en celular.

11. Antes de hacer deploy, valida sintaxis JS de todos los archivos tocados.
    Luego: npx vercel --prod

IMPORTANTE: Todas las vistas y el RPC del buscador ya existen en Supabase y son
authenticated-only (igual que las que ya usa index.html) — no necesitas crear nada en
la base de datos. Si en el camino te falta algo del backend, anótalo en
PENDIENTES-BACKEND.md como dice CLAUDE.md, no lo improvises.

Empieza por la estructura de archivos y el shell con login + menú + buscador funcionando
contra datos reales, luego ve módulo por módulo. Ve mostrándome tu avance.
