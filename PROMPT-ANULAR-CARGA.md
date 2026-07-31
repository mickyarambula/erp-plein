Cambia a Sonnet si no lo estás: /model sonnet

Nueva pieza, mismo patron que ya usaste para "Resolver flag": agregar la
capacidad de anular una carga (cancelacion suave, no borra nada).

BACKEND YA LISTO (confirmado, probado con datos reales, no supongas nada):

v_carga_detalle ahora trae 4 columnas nuevas: anulado (boolean),
anulado_motivo (text), anulado_por (text), anulado_ts (timestamptz).

fn_anular_carga(p_folio text, p_motivo text) -> TABLE(folio, resultado)
  - Solo funciona si el usuario tiene puede_administrar (hoy solo Miguel/
    admin). Si Samuel o Chanes lo intentan, el backend rechaza -- la UI
    debe ocultar el boton para ellos, mismo patron que "Resolver flag".
  - p_motivo es obligatorio (texto obligatorio, igual que resolver flag).
  - Si la carga YA tiene cobros/pagos aplicados, el backend RECHAZA con
    un mensaje claro. Esto es intencional -- no lo trates como error de
    programacion, muestralo tal cual al usuario (algo como "esta carga
    ya tiene movimientos aplicados, no se puede anular desde aqui").

QUE CONSTRUIR:

1. En la ficha de carga (modulo-cargas.js, misma funcion pintarFicha):
   si ERP.puede('administrar') Y la carga NO esta anulada, muestra un
   boton pequeno "Anular carga" (estilo discreto, no protagonista --
   sugerencia: btn-mini gris, junto al header o al final de la ficha,
   no arriba con los botones de captura). Al hacer clic, abre un
   formulario chico con un textarea obligatorio para el motivo y un
   boton "Confirmar anulacion" -- pide confirmacion extra aqui porque
   es una accion con mas peso que agregar un costo (aunque sea
   reversible solo por mi en backend, no hay boton de deshacer en la UI).

2. Si la carga YA esta anulada (d.anulado === true): la ficha entera
   debe verse claramente distinta -- un banner arriba (rojo o gris, no
   verde) tipo "ANULADA -- [motivo] -- anulada por [anulado_por] el
   [anulado_ts]". Oculta TODOS los botones de captura (agregar costo,
   registrar cobro/pago) en una carga anulada, sin importar el rol --
   no tiene sentido seguir capturando en algo que ya no cuenta.

3. En la lista de Cargas: las cargas anuladas siguen apareciendo (no se
   ocultan), pero con una marca visual clara (ej. texto tachado o gris,
   etiqueta "ANULADA"). Agrega un chip de filtro "Anuladas" junto a los
   que ya existen (Activas, Con flag, etc.) para poder verlas aparte.

4. Tras anular con exito: refresca la ficha (para que se vea el banner)
   y marca los datos como sucios (ERP.marcarDatosSucios(), mismo patron
   que ya usas) para que la lista de Cargas y los KPIs se actualicen --
   la carga anulada debe desaparecer de inmediato de Finanzas, Cobranza,
   Cargas activas, etc. sin que el usuario tenga que recargar la pagina.

Verifica con el mismo tipo de arnes que ya usas (argumentos crudos del
RPC) los dos casos: anular una carga sin aplicaciones (debe funcionar) y
mostrar que pasa cuando el backend rechaza por permisos o por tener
aplicaciones (el mensaje debe llegar integro a la pantalla, no generico).

No hagas nada con "reactivar" una carga anulada por error -- si eso pasa,
es un caso raro que se resuelve conmigo en sesion de backend, no hace
falta un boton para deshacerlo.

Valida sintaxis y preguntame antes de desplegar.
