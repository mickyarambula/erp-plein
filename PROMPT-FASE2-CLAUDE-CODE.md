Cambia a Opus para esto: /model opus

Vamos a construir la Fase 2: la ficha de carga como centro de operación,
con captura en contexto. Antes de escribir nada, quiero que sepas que
TODO el backend de escritura que esto necesita ya existe — nada de lo
de abajo requiere pedirme una migración nueva. Solo hace falta cablear
el frontend contra lo que ya está.

VISTAS DE LECTURA (authenticated, ya confirmadas con datos reales):

v_mi_perfil — perfil del usuario logueado (una sola fila, sin filtro):
  socio_codigo, nombre, rol, puede_ver, puede_capturar, puede_editar,
  puede_administrar
  Roles reales: admin (Miguel, todo permitido) · captura (Samuel y
  Chanes: ven y capturan, NO editan montos) · vista (José: solo lectura).
  USA ESTO para decidir qué botones de captura mostrar — no vuelvas a
  inventar un flag "puedeEditar" genérico como tenía el index.html viejo.

v_carga_detalle — folio, po, producto, proveedor, cliente, estado,
  modalidad, f_embarque, dias, ingreso_venta, cobrado, saldo_cxc,
  costo_total, pagado, saldo_cxp, revision_pendiente, nota_revision,
  capturado_por, capturado_ts
  Filtra por folio=eq.<folio> con ERP.eq() (ya corregido).

v_carga_aplicaciones — carga_folio, mov_folio, fecha, descripcion,
  clase, monto, nota  (clase = cobro/pago/devolución)

v_carga_costos_det — carga_folio, concepto, monto, nota

RPCs DE ESCRITURA (authenticated, con SECURITY DEFINER — validan
permisos internamente vía fn_actor_puede, no hace falta que el
frontend repita esa lógica, pero SÍ debe ocultar botones si
puede_capturar/puede_editar es false, para que la UI no invite a
intentar algo que el backend va a rechazar):

fn_crear_carga(p_po, p_proveedor, p_cliente, p_producto,
  p_estado default 'Programada', p_modalidad default 'margen_fijo',
  p_f_embarque, p_ingreso_venta default 0, p_costo, p_nota)
  → TABLE(folio, proveedor, cliente, producto, con_flag, advertencias)

fn_agregar_costo(p_carga_folio, p_concepto, p_monto, p_nota default NULL)
  → TABLE(id, carga_folio, concepto, monto, advertencia)

fn_capturar_mov(p_fecha, p_descripcion, p_ingreso default 0,
  p_egreso default 0, p_contraparte default NULL, p_tipo default NULL,
  p_nota default NULL, p_cuenta default 'JPM')
  → TABLE(folio_asignado, contraparte_resuelta, advertencia)
  (esto crea el movimiento de banco; para ligarlo a una carga como
  cobro/pago, después de crearlo hay que llamar fn_aplicar_fifo)

fn_aplicar_fifo(p_mov_folio)
  → TABLE(carga_folio, monto_aplicado, resultado)
  (aplica un movimiento ya capturado contra la(s) carga(s) más antigua(s)
  pendiente(s) del mismo cliente/proveedor, FIFO — es el motor de
  cobranza/pagos)

fn_resolver_flag_web(p_folio, p_resolucion)
  → TABLE(folio, resultado)
  (esto YA estaba conectado en el index.html viejo — revísalo como
  referencia de patrón, capturaba texto de resolución obligatorio)

QUÉ CONSTRUIR:

1. FICHA DE CARGA (expandir el panel de Cargas que ya existe):
   - Header con folio, PO, estado con pill de color, modalidad
   - Pipeline visual de etapas (Programada → En Camino → Entregada →
     Cerrada) — usa el campo `estado` de v_carga_detalle. Si el estado
     real no coincide exactamente con estos 4 nombres, muéstralo tal
     cual viene (no fuerces el pipeline a 4 pasos fijos si los datos
     dicen otra cosa) y anótalo en PENDIENTES-BACKEND.md.
   - Costos: tabla de v_carga_costos_det + botón "Agregar costo" que
     abre un formulario chico (concepto, monto, nota) → fn_agregar_costo,
     solo visible si puede_capturar
   - Cobros/pagos: tabla de v_carga_aplicaciones + botón "Registrar
     cobro/pago" → formulario (fecha, monto, contraparte, tipo) que
     llama fn_capturar_mov y LUEGO fn_aplicar_fifo con el folio que
     regrese el primero, solo visible si puede_capturar
   - Si revision_pendiente: caja de flag con nota_revision y, si
     puede_editar, textarea + botón para fn_resolver_flag_web
   - Todo dentro del panel lateral que ya existe (ERP.abrirPanel),
     no crees un panel nuevo — amplía el que ya renderiza el detalle
     de carga en modulo-cargas.js

2. NUEVA CARGA: botón en el módulo Cargas ("+ Nueva carga") que abre
   un formulario con los campos de fn_crear_carga, visible solo si
   puede_capturar. Al crear, refresca la lista y abre la ficha de la
   carga nueva.

3. PERMISOS GLOBALES: al cargar la sesión, trae v_mi_perfil UNA vez y
   guárdalo en el objeto ERP compartido (ERP.perfil o similar), para
   que todos los módulos puedan consultar puede_capturar/puede_editar
   sin volver a pedirlo.

4. Todos los formularios: validación básica en el navegador (campos
   requeridos, montos > 0) ANTES de llamar el RPC — pero recuerda que
   el backend es la autoridad real (SECURITY DEFINER valida permisos
   y reglas de negocio), así que maneja también el error que regrese
   si el backend rechaza algo, mostrándolo claro al usuario.

5. Después de cualquier escritura exitosa (crear carga, agregar costo,
   capturar cobro/pago, resolver flag): refresca los datos relevantes
   (la ficha de la carga, y si aplica, los KPIs de Inicio/Cobranza/Pagos
   que dependan de ese número) — no dejes que el usuario vea datos
   viejos después de escribir.

Antes de deploy: valida sintaxis, y prueba con smoke test (stub de
fetch/rpc) los 4 flujos de escritura simulados, más el caso de un
usuario con puede_capturar=false (no debe ver los botones). Anota en
PENDIENTES-BACKEND.md cualquier cosa que necesites confirmar conmigo
antes de asumirla — en particular, si el campo `estado` de las cargas
reales no tiene exactamente los 4 valores del pipeline que propuse,
no lo fuerces.

Ve mostrándome tu avance por partes, no todo junto al final.
