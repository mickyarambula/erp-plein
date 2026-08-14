# SPEC — Módulo Catálogos · Backend (schema `cat.*`)
_Contrato para el **chat de backend**. Lo redacta el chat de **frontend** (consumidor) para fijar el contrato antes de programar la Parte B. Última actualización: 2026-08-14 (Camino C · Catálogos)._

> **Regla de dos chats:** este documento es el hand-off frontend → backend. El **chat de backend** aplica todo el DDL/RPCs de aquí con `apply_migration` + protocolo ENSAYO-que-revierte. El **chat de frontend** construye `modulo-catalogos-c.js` (ruta `catalogos-c`, grupo Camino C) **contra este contrato** — NO toca el esquema. Si el backend necesita renombrar algo, avisar para re-sincronizar el contrato antes de que el frontend enlace.

---

## 0. Decisiones de arquitectura

- **Schema nuevo `cat` (aislado, nace cerrado)** — mismo patrón que `op.*` (O1/O2, D-160): las tablas viven en `cat`, SIN `USAGE` a `anon`/`authenticated`, SIN entrar a `PGRST_DB_SCHEMAS`. El frontend **LEE** por vistas `public.v_cat_*` (`security_invoker`) y **ESCRIBE** por RPCs `public.fn_cat_*` (`SECURITY DEFINER`, `search_path=pg_catalog`, que nombran `cat.tabla` explícitamente). Superficie pública = exactamente el set de vistas + RPCs de abajo.
- **NO se toca** el `modulo-catalogos.js` viejo (Directorio Comercial) ni sus tablas vivas `productos`/`contrapartes`/`variedades`. `cat.*` es un stack paralelo del reinicio Camino C. La migración/retiro del viejo se decide después, cuando el nuevo esté probado.
- **Papelera = soft-delete** vía columna `deleted_at timestamptz NULL`. Todas las vistas de lectura filtran `deleted_at IS NULL` por defecto (papelera se lee aparte, ver §3). Nada de borrado físico salvo una purga administrativa explícita (fuera de alcance de esta entrega).
- **Regla eliminar (negocio):** si el registro TIENE movimientos ligados (compras/ventas/embarques del stack Camino C), NO se borra: se **archiva** (`estado='inactivo'`). Si no tiene, va a papelera (`deleted_at=now()`). La RPC de eliminar decide sola (ver `fn_cat_*_eliminar`). En O2 (hoy) los stacks de movimiento aún están casi vacíos, así que el cross-check puede empezar laxo y endurecerse cuando O3+ conecte compras/ventas — dejar la puerta lista.
- **Listas controladas:** `empaque/calibre/grado/unidad/categoria` salen de `cat.listas_valores` (NO texto libre en `skus`). El usuario agrega un valor nuevo a una lista desde la UI (`fn_cat_lista_valor_alta`) — es una opción más, no un campo nuevo.
- **Vínculos bidireccionales:** el vínculo se guarda UNA vez (tabla puente) y aparece en ambas fichas (producto↔proveedor a nivel producto; sku↔cliente a nivel SKU). Se crea desde cualquier lado.
- **Precio:** el catálogo NO guarda el precio del pedido. Solo, opcional, `precio_contrato_ref` en `vinculo_sku_cliente` (referencia/contrato). El precio real se captura en el pedido/venta (otro módulo).
- **Permisos:** gate `fn_actor_puede('capturar')` en las RPCs de escritura (alta/editar/vincular/lista); `fn_actor_puede('administrar')` o `'capturar'` (a criterio del backend) en eliminar/restaurar. Lectura por `authenticated` vía las vistas. `p_actor` NO se pasa desde el front (el server lo resuelve por JWT), salvo que el backend prefiera el patrón `capturado_por` explícito — en ese caso avisar y lo agrego a las llamadas.
- **Seguridad:** cada objeto nuevo → `REVOKE ALL FROM PUBLIC, anon` + `GRANT SELECT/EXECUTE TO authenticated` donde aplique + `ENABLE ROW LEVEL SECURITY` en toda tabla. `v_seguridad_anon`/`v_seguridad_escritura`/`v_seguridad_auth` = **0/0/0** al cierre.

---

## 1. Tablas — schema `cat`

Todas: `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`, `capturado_por text` (email/socio_codigo del JWT), `deleted_at timestamptz NULL` (papelera) — salvo las tablas puente, que no llevan papelera propia (se borran duro al desvincular; ver §1.7/1.8).

### 1.1 `cat.listas_valores` — vocabularios controlados
| col | tipo | notas |
|---|---|---|
| tipo | text NOT NULL | CHECK in `('empaque','calibre','grado','unidad','categoria')` |
| valor | text NOT NULL | el valor mostrado en el `<select>` |
| activo | boolean NOT NULL DEFAULT true | inactivo = deja de ofrecerse, no se borra |
| orden | int NOT NULL DEFAULT 0 | orden en el picker |

`UNIQUE(tipo, valor) WHERE deleted_at IS NULL`.

### 1.2 `cat.productos`
| col | tipo | notas |
|---|---|---|
| nombre | text NOT NULL | obligatorio |
| codigo_item | text | autogenera si vacío (`PRD-#####` por secuencia `cat.seq_producto`) |
| categoria | text | de `listas_valores` tipo `categoria` (o libre si el backend prefiere no forzar) |
| pais_origen | text | |
| organico | boolean NOT NULL DEFAULT false | |
| temporada_desde | int | CHECK 1–12 NULL-able |
| temporada_hasta | int | CHECK 1–12 NULL-able |
| estado | text NOT NULL DEFAULT 'activo' | CHECK `('activo','inactivo')` |
| nota | text | |

`UNIQUE(codigo_item) WHERE deleted_at IS NULL`.

### 1.3 `cat.variedades`
| col | tipo | notas |
|---|---|---|
| producto_id | bigint NOT NULL REFERENCES cat.productos(id) | |
| nombre | text NOT NULL | |
| activo | boolean NOT NULL DEFAULT true | |

`UNIQUE(producto_id, nombre) WHERE deleted_at IS NULL`.

### 1.4 `cat.skus` — presentaciones (la unidad que se vende/inventaría/lleva GTIN)
| col | tipo | notas |
|---|---|---|
| producto_id | bigint NOT NULL REFERENCES cat.productos(id) | |
| variedad_id | bigint REFERENCES cat.variedades(id) NULL | |
| empaque | text | valor de `listas_valores` tipo `empaque` |
| calibre | text | tipo `calibre` |
| grado | text | tipo `grado` |
| marca | text | |
| peso_neto | numeric(10,3) | |
| unidad_peso | text | tipo `unidad` |
| peso_bruto | numeric(10,3) | |
| gtin | text | |
| plu | text | |
| cajas_por_tarima | int | usado por pedidos: cajas = pallets × cajas_por_tarima |
| patron_estiba | text | "TixHi", ej. "8x10" |
| temperatura_c | numeric(5,2) | |
| vida_anaquel_dias | int | |
| es_reempaque | boolean NOT NULL DEFAULT false | |
| costo_caja_ref | numeric(14,2) | solo referencia |
| precio_caja_ref | numeric(14,2) | solo referencia |
| estado | text NOT NULL DEFAULT 'activo' | CHECK `('activo','inactivo')` |

`empaque/calibre/grado/unidad_peso` deben existir en `listas_valores` (validar en la RPC, no CHECK duro, para permitir "+ otro…" al vuelo).

### 1.5 `cat.contrapartes` — clientes y/o proveedores (una empresa puede ser ambas)
| col | tipo | notas |
|---|---|---|
| nombre | text NOT NULL | obligatorio |
| razon_social | text | |
| es_cliente | boolean NOT NULL DEFAULT false | |
| es_proveedor | boolean NOT NULL DEFAULT false | |
| rfc_tax_id | text | |
| paca_licencia | text | |
| certificaciones | text | |
| pais | text | |
| ciudad | text | |
| direccion_facturacion | text | |
| direccion_envio | text | |
| dias_credito | int | |
| limite_credito | numeric(14,2) | |
| pct_anticipo | numeric(5,2) | |
| metodo_pago | text | |
| moneda | text DEFAULT 'USD' | |
| email | text | contacto principal legado |
| email_facturacion | text | |
| telefono_whatsapp | text | contacto principal legado |
| estado | text NOT NULL DEFAULT 'activo' | CHECK `('activo','inactivo')` |

### 1.6 `cat.contactos` — multi-contacto por empresa
| col | tipo | notas |
|---|---|---|
| contraparte_id | bigint NOT NULL REFERENCES cat.contrapartes(id) | |
| nombre | text | |
| rol | text | ej. Compras / Pagos / Ventas |
| email | text | |
| telefono_whatsapp | text | |

### 1.7 `cat.vinculo_producto_proveedor` — proveedor surte un producto (nivel producto)
| col | tipo | notas |
|---|---|---|
| producto_id | bigint NOT NULL REFERENCES cat.productos(id) | |
| contraparte_id | bigint NOT NULL REFERENCES cat.contrapartes(id) | debe ser `es_proveedor=true` (validar en RPC) |

`UNIQUE(producto_id, contraparte_id)`. Sin `deleted_at` — desvincular = DELETE duro.

### 1.8 `cat.vinculo_sku_cliente` — cliente compra un SKU (nivel SKU)
| col | tipo | notas |
|---|---|---|
| sku_id | bigint NOT NULL REFERENCES cat.skus(id) | |
| contraparte_id | bigint NOT NULL REFERENCES cat.contrapartes(id) | debe ser `es_cliente=true` (validar en RPC) |
| codigo_item_cliente | text | el código del cliente para ese SKU; ESTABLE |
| precio_contrato_ref | numeric(14,2) NULL | SOLO referencia/contrato — NO es el precio del pedido |

`UNIQUE(sku_id, contraparte_id)`. Sin `deleted_at` — desvincular = DELETE duro.

---

## 2. Secuencias
- `cat.seq_producto` → `codigo_item` autogenerado `PRD-#####` cuando el alta no manda código.
- (SKUs no llevan folio propio; se identifican por `id` + etiqueta compuesta, ver `v_cat_sku_etiqueta`.)

---

## 3. Vistas de lectura — `public.v_cat_*` (`security_invoker`, filtran `deleted_at IS NULL` salvo las de papelera)

### Listas
- **`v_cat_listas_valores`** — `id, tipo, valor, activo, orden`. (para la pantalla de Listas y para armar los `<select>`; el front filtra `activo` en cliente o se piden solo activos con `&activo=eq.true`).

### Productos
- **`v_cat_productos`** — `id, nombre, codigo_item, categoria, pais_origen, organico, temporada_desde, temporada_hasta, estado, nota, n_skus (int), n_variedades (int), n_proveedores (int), updated_at, capturado_por`. Lista maestra de la pestaña Productos (avatar = inicial del nombre; meta = "N SKU · categoría").
- **`v_cat_variedades`** — `id, producto_id, nombre, activo`.
- **`v_cat_skus`** — todas las columnas de `cat.skus` + `producto (text)`, `variedad (text|null)`, `n_clientes (int)`. Para las tarjetas/matriz de SKU dentro de la ficha de producto.
- **`v_cat_sku_etiqueta`** — `sku_id, producto_id, etiqueta` (etiqueta = `producto · variedad · empaque · calibre`, guiones colapsados cuando falta un campo). Para los pickers "Vincular SKU".
- **`v_cat_producto_proveedores`** — `producto_id, contraparte_id, contraparte_nombre`. Chips "Proveedores que lo surten".
- **`v_cat_sku_clientes`** — `sku_id, contraparte_id, contraparte_nombre, codigo_item_cliente, precio_contrato_ref`. Linklines "Clientes de este SKU".

### Contrapartes
- **`v_cat_contrapartes`** — todas las columnas de `cat.contrapartes` + `n_contactos (int)`, `n_skus_vinculados (int)`. Lista maestra de las pestañas Proveedores (`es_proveedor=true`) y Clientes (`es_cliente=true`) — el front filtra por `es_proveedor`/`es_cliente`.
- **`v_cat_contactos`** — `id, contraparte_id, nombre, rol, email, telefono_whatsapp`.
- **`v_cat_contraparte_skus`** — `contraparte_id, sku_id, etiqueta, rol ('cliente'|'proveedor')`. Chips "SKUs que surte/compra": para cliente = SKUs vinculados vía `vinculo_sku_cliente`; para proveedor = SKUs de los productos que surte vía `vinculo_producto_proveedor` (a nivel producto → todos sus SKUs, o solo el nombre de producto — a criterio: el mockup muestra etiqueta de producto/SKU).

### Papelera (solo `deleted_at IS NOT NULL`)
- **`v_cat_papelera`** — `entidad ('producto'|'variedad'|'sku'|'contraparte'|'contacto'), id, etiqueta, deleted_at, capturado_por`. Union de las 5 tablas con papelera. Para la vista de papelera + restaurar.

Todas las vistas: `REVOKE ALL FROM PUBLIC, anon` + `GRANT SELECT TO authenticated` + `SET (security_invoker=on)`.

---

## 4. RPCs de escritura — `public.fn_cat_*` (`SECURITY DEFINER`, `search_path=pg_catalog`, gate `capturar`), retornan `jsonb`

> Convención de retorno: `{ ok:true, id, ...campos_clave }`. En error de negocio: `RAISE EXCEPTION` con mensaje claro (el front lo muestra tal cual). Los `p_*` opcionales default NULL.

### Listas de valores
```
fn_cat_lista_valor_alta(p_tipo text, p_valor text, p_orden int DEFAULT NULL)
   -> { ok, id, tipo, valor }   -- si ya existe (tipo,valor) activo, regresarlo sin duplicar (idempotente)
fn_cat_lista_valor_editar(p_id bigint, p_valor text DEFAULT NULL, p_activo boolean DEFAULT NULL, p_orden int DEFAULT NULL) -> { ok, id }
fn_cat_lista_valor_eliminar(p_id bigint) -> { ok, id, accion }  -- 'archivado' si en uso por algún SKU, 'borrado' si no
```

### Productos
```
fn_cat_producto_alta(p_nombre text, p_codigo_item text DEFAULT NULL, p_categoria text DEFAULT NULL,
   p_pais_origen text DEFAULT NULL, p_organico boolean DEFAULT false,
   p_temporada_desde int DEFAULT NULL, p_temporada_hasta int DEFAULT NULL, p_nota text DEFAULT NULL)
   -> { ok, id, codigo_item }   -- codigo_item autogenera si p_codigo_item NULL
fn_cat_producto_editar(p_id bigint, p_nombre text DEFAULT NULL, p_codigo_item text DEFAULT NULL,
   p_categoria text DEFAULT NULL, p_pais_origen text DEFAULT NULL, p_organico boolean DEFAULT NULL,
   p_temporada_desde int DEFAULT NULL, p_temporada_hasta int DEFAULT NULL,
   p_estado text DEFAULT NULL, p_nota text DEFAULT NULL) -> { ok, id }
fn_cat_producto_eliminar(p_id bigint) -> { ok, id, accion }   -- 'archivado' si tiene movimientos, 'papelera' si no
fn_cat_producto_restaurar(p_id bigint) -> { ok, id }          -- deleted_at = NULL
```

### Variedades
```
fn_cat_variedad_alta(p_producto_id bigint, p_nombre text) -> { ok, id }
fn_cat_variedad_editar(p_id bigint, p_nombre text DEFAULT NULL, p_activo boolean DEFAULT NULL) -> { ok, id }
fn_cat_variedad_eliminar(p_id bigint) -> { ok, id, accion }
fn_cat_variedad_restaurar(p_id bigint) -> { ok, id }
```

### SKUs
```
fn_cat_sku_alta(p_producto_id bigint, p_variedad_id bigint DEFAULT NULL, p_empaque text DEFAULT NULL,
   p_calibre text DEFAULT NULL, p_grado text DEFAULT NULL, p_marca text DEFAULT NULL,
   p_peso_neto numeric DEFAULT NULL, p_unidad_peso text DEFAULT NULL, p_peso_bruto numeric DEFAULT NULL,
   p_gtin text DEFAULT NULL, p_plu text DEFAULT NULL, p_cajas_por_tarima int DEFAULT NULL,
   p_patron_estiba text DEFAULT NULL, p_temperatura_c numeric DEFAULT NULL, p_vida_anaquel_dias int DEFAULT NULL,
   p_es_reempaque boolean DEFAULT false, p_costo_caja_ref numeric DEFAULT NULL, p_precio_caja_ref numeric DEFAULT NULL)
   -> { ok, id }
   -- valida que empaque/calibre/grado/unidad_peso (los no nulos) existan en cat.listas_valores;
   --   si NO existen, RAISE con mensaje pidiendo agregarlos por fn_cat_lista_valor_alta primero.
fn_cat_sku_editar(p_id bigint, ... mismos campos, todos DEFAULT NULL ..., p_estado text DEFAULT NULL) -> { ok, id }
fn_cat_sku_eliminar(p_id bigint) -> { ok, id, accion }
fn_cat_sku_restaurar(p_id bigint) -> { ok, id }
```

### Contrapartes
```
fn_cat_contraparte_alta(p_nombre text, p_razon_social text DEFAULT NULL, p_es_cliente boolean DEFAULT false,
   p_es_proveedor boolean DEFAULT false, p_rfc_tax_id text DEFAULT NULL, p_paca_licencia text DEFAULT NULL,
   p_certificaciones text DEFAULT NULL, p_pais text DEFAULT NULL, p_ciudad text DEFAULT NULL,
   p_direccion_facturacion text DEFAULT NULL, p_direccion_envio text DEFAULT NULL,
   p_dias_credito int DEFAULT NULL, p_limite_credito numeric DEFAULT NULL, p_pct_anticipo numeric DEFAULT NULL,
   p_metodo_pago text DEFAULT NULL, p_moneda text DEFAULT 'USD', p_email text DEFAULT NULL,
   p_email_facturacion text DEFAULT NULL, p_telefono_whatsapp text DEFAULT NULL)
   -> { ok, id }
   -- contacto principal (nombre/rol/email/whatsapp del alta) se inserta como primer cat.contactos si viene.
fn_cat_contraparte_editar(p_id bigint, ... mismos campos, todos DEFAULT NULL ..., p_estado text DEFAULT NULL) -> { ok, id }
fn_cat_contraparte_eliminar(p_id bigint) -> { ok, id, accion }
fn_cat_contraparte_restaurar(p_id bigint) -> { ok, id }
```

### Contactos
```
fn_cat_contacto_alta(p_contraparte_id bigint, p_nombre text DEFAULT NULL, p_rol text DEFAULT NULL,
   p_email text DEFAULT NULL, p_telefono_whatsapp text DEFAULT NULL) -> { ok, id }
fn_cat_contacto_editar(p_id bigint, p_nombre text DEFAULT NULL, p_rol text DEFAULT NULL,
   p_email text DEFAULT NULL, p_telefono_whatsapp text DEFAULT NULL) -> { ok, id }
fn_cat_contacto_eliminar(p_id bigint) -> { ok, id }   -- papelera
```

### Vínculos (bidireccionales — se guardan una vez, aparecen en ambas fichas)
```
fn_cat_vincular_producto_proveedor(p_producto_id bigint, p_contraparte_id bigint) -> { ok, id }
   -- valida contraparte.es_proveedor; idempotente (UNIQUE); si existe regresa el id existente.
fn_cat_desvincular_producto_proveedor(p_producto_id bigint, p_contraparte_id bigint) -> { ok }   -- DELETE duro

fn_cat_vincular_sku_cliente(p_sku_id bigint, p_contraparte_id bigint,
   p_codigo_item_cliente text DEFAULT NULL, p_precio_contrato_ref numeric DEFAULT NULL) -> { ok, id }
   -- valida contraparte.es_cliente; idempotente (UNIQUE).
fn_cat_vincular_sku_cliente_editar(p_id bigint, p_codigo_item_cliente text DEFAULT NULL,
   p_precio_contrato_ref numeric DEFAULT NULL) -> { ok, id }
fn_cat_desvincular_sku_cliente(p_sku_id bigint, p_contraparte_id bigint) -> { ok }   -- DELETE duro
```

### Import (Excel) — bulk
```
fn_cat_import_productos(p_filas jsonb) -> { ok, insertados int, existentes int, detalle jsonb }
   -- p_filas = [{nombre, codigo_item?, categoria?, pais_origen?, organico?, ...}]. Idempotente por nombre
   --   (o codigo_item si viene): fila cuyo nombre ya existe cuenta como "existente", no duplica.
fn_cat_import_skus(p_filas jsonb) -> { ok, insertados, existentes, detalle }
   -- p_filas = [{producto (nombre|codigo), variedad?, empaque, calibre?, grado?, gtin?, cajas_por_tarima?, ...}].
   --   Resuelve producto por nombre/código; valida/crea listas_valores faltantes o las reporta en detalle.
fn_cat_import_contrapartes(p_filas jsonb) -> { ok, insertados, existentes, detalle }
   -- p_filas = [{nombre, es_cliente?, es_proveedor?, razon_social?, rfc_tax_id?, pais?, ciudad?, ...}].
```
> El front hace: parse del .xlsx (lib XLSX ya cargada) → mapeo de columnas (auto + corrección manual) → **previsualización** (llama una variante `_preview` o el front calcula nuevas/existentes leyendo las vistas) → **confirmar** llama la `fn_cat_import_*`. Nada se guarda hasta confirmar. Si el backend prefiere exponer también `fn_cat_import_*_preview(p_filas) -> {nuevas, existentes, detalle}` (mismo cuerpo sin escribir), mejor — el front lo usa para el Paso 3. Si no, el front calcula el preview en cliente contra `v_cat_productos`/`v_cat_contrapartes`.

---

## 5. Seed inicial de `cat.listas_valores`
(el negocio arrancó vacío; sembrar unos valores base para que el armador de SKU no salga en blanco — el usuario agrega el resto desde la UI):
- **empaque:** Caja, Bin, Manojo, Bolsa, Clamshell
- **calibre:** 4, 5, 6, 8, 9, 12, Mix
- **grado:** 1, 2, Fancy
- **unidad:** kg, lb, oz
- **categoria:** Fruta, Verdura

---

## 6. Checklist de cierre (backend)
- [ ] 8 tablas en `cat` con RLS on, sin grants a authenticated (solo vía vistas/RPCs).
- [ ] Vistas `v_cat_*` con `security_invoker`, `GRANT SELECT authenticated`, filtran `deleted_at`.
- [ ] RPCs `fn_cat_*` `SECURITY DEFINER`, gate `capturar` (eliminar/restaurar según política), `GRANT EXECUTE authenticated`.
- [ ] Seed §5 aplicado.
- [ ] `v_seguridad_anon` / `v_seguridad_escritura` / `v_seguridad_auth` = **0/0/0**.
- [ ] Avisar al chat de frontend los nombres EXACTOS finales (si alguno cambió) para enlazar `modulo-catalogos-c.js`.

---

## 7. Contrato que el frontend asume (resumen para enlazar)
Lectura (PostgREST): `v_cat_productos`, `v_cat_variedades`, `v_cat_skus`, `v_cat_sku_etiqueta`, `v_cat_producto_proveedores`, `v_cat_sku_clientes`, `v_cat_contrapartes`, `v_cat_contactos`, `v_cat_contraparte_skus`, `v_cat_listas_valores`, `v_cat_papelera`.
Escritura (RPC vía `ERP.rpc`): las `fn_cat_*` de §4.
Módulo frontend: `modulo-catalogos-c.js`, ruta `catalogos-c`, scope `.pantalla-catalogos-c`, grupo MARCO "Camino C". Layout master-detail (lista 320px + detalle) con 3 pestañas Productos/Proveedores/Clientes, según `catalogos-completo.html`. Portado a tokens reales (`tokens.css`, dark-aware) — sin el set de tokens paralelo del mockup.
