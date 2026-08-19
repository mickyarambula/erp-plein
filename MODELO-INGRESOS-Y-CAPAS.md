# Modelo de ingresos y operación — Plein Produce

Base de diseño para integrar, en orden y sin desordenar, todas las formas en que Plein opera y
gana dinero. Documento vivo. **Actualizado 19-ago-2026.**

## Principio central

Los casos reales del negocio **no son "más modalidades"**. Son combinaciones de **5 capas
independientes**. Una misma carga puede activar varias a la vez (ej: consignación + reparto con
socio + pick-n-pack descontado al cliente). Modelarlas por separado evita la explosión
combinatoria y mantiene el orden.

---

## Capa 1 — Rol de Plein en la transacción ✅ CONSTRUIDA

Qué ES Plein en el trato. Vive en `public.revenue_models`, con **ejes explícitos** (no texto libre):

- `toma_titulo` (bool) — ¿Plein toma título del producto?
- `posesion_fisica` (`si`|`no`|`opcional`) — **decide si usa Inventario/Lots**
- `frente_financiero` (bool) — ¿el dinero del cliente pasa por Plein? → **decide si hay CxC/CxP**
- `reconoce_ingreso` (`embarque`|`liquidacion`|`precio_fijado`|`cierre_trato`)
- `formula_tipo` — cómo se calcula

| Código | Modalidad | Título | Posesión | Frente fin. | Ingreso | Cálculo |
|---|---|---|---|---|---|---|
| RM-001 | Fixed Fee por embarque (Alpine) | No | No | No | Embarque | comisión/caja |
| RM-002 | Margin per Box | Sí | Sí | Sí | Embarque | margen |
| RM-003 | Consignment | No | Opcional | Sí | Liquidación | % venta |
| RM-004 | Buy & Resell | Sí | Sí | Sí | Embarque | buy_resell |
| RM-005 | **Broker (comisión pura)** | No | No | **No** | Cierre trato | comisión % |
| RM-006 | **Commission merchant (Plein al frente)** | No | Opcional | **Sí** | Liquidación | comisión % |

**RM-005 vs RM-006 = el caso Agrícola Omega.** Hoy (RM-005): relación directa cliente↔Omega,
Omega paga comisión, Plein no toca producto ni dinero. Ideal (RM-006): el cliente le paga a
Plein, Plein retiene comisión y remite a Omega — genera CxC y CxP.

**Consecuencia de diseño:** la pregunta "¿esta operación usa inventario?" se contesta sola con
`posesion_fisica`. No hay reglas hardcodeadas por modalidad.

### Escenarios documentados pero NO sembrados (se agregan cuando ocurran)
- **Joint account puro** (compartir costo y riesgo de un lote con el proveedor). Lo que Miguel
  tiene hoy es reparto de utilidad neta con un co-vendedor → eso es **Capa 3**, no Capa 1.
- **Price After Sale con título** (Plein compra y el precio se fija tras la reventa). Hoy esos
  casos se manejan como consignación para no asumir riesgo de pérdida.
- **Repack/valor agregado como ingreso propio.** Hoy el reempaque lo pide el cliente y el costo
  se traslada → es **Capa 2**, no ingreso. Solo sería Capa 1 si se reempacara a nombre de Plein.

---

## Capa 2 — Atribución y recuperación de gastos ⬜ PENDIENTE

Quién pone cada gasto (pick-n-pack, flete, cooling, inspección, brokerage, aduana) y cómo se
recupera. Vive a nivel de **operación/línea**, NO en la modalidad.

Modos de cada gasto:
- Plein lo pone → **lo descuenta al cliente**
- Plein lo pone → **lo traslada al productor**
- El cliente lo pone → **se paga al productor** (pass-through)
- Plein lo adelanta por cuenta de otro → **se cobra al cobrar**
- Plein lo absorbe (costo propio, baja el margen)

Casos reales: pick-n-pack que Plein pone y descuenta al cliente; pick-n-pack del cliente
trasladado al productor; "% sobre venta pero cubrimos gastos que luego cobramos al cobrar".

**Parcialmente cubierto:** el costo del PRODUCTO ya vive en `op.lots.costo_unitario` (O2b).
Falta el resto de conceptos de costo y su atribución.

---

## Capa 3 — Reparto de utilidad con terceros ⬜ PENDIENTE

Un tercero que NO es cliente ni productor ayuda a colocar producto y se reparte utilidad, cada
quien asumiendo ciertos gastos.

**Caso real: socio de ventas en Texas / McAllen** — se reparte la utilidad (venta − costo),
Plein asume algunos gastos (pick-n-pack, flete, pago del producto) y el socio otros (renta de
bodega, etc.), según las condiciones del cliente. Hoy **el socio es el frente**; se quiere migrar
a que Plein sea el frente para reducir riesgo. El producto suele ir en consignación a una bodega
hasta que se vende.

Se combina con Capa 1 (consignación) y Capa 2 (gastos). Es capa aparte porque el tercero no
encaja en cliente/productor.

---

## Capa 4 — Términos de pago y riesgo ⬜ PENDIENTE

- **Back-to-back** — Plein paga al productor solo cuando el cliente le paga (sin riesgo).
- **Adelantado** — Plein paga antes de cobrar (asume riesgo de crédito).

Caso real: "no asumimos nada y pagamos hasta que nos pagan". Atributo de la operación.

---

## Capa 5 — Financiamiento a productores y contratos forward ⬜ PENDIENTE

Programas donde Plein ayuda con **financiamiento de siembra** a cambio de compromiso de entrega,
con **contratos de cliente atados a la cosecha** que se cumplen según el avance del productor,
con reglas establecidas desde el inicio.

Vive en el **módulo Proyectos** (nunca pegado a cargas). El financiamiento es un activo/derecho
de Plein; las entregas comprometidas se liquidan contra cargas reales.

---

## Documentos y envíos ✅ CONSTRUIDO (transversal)

No es una capa de ingreso, pero es infraestructura que atraviesa todo el flujo.

- `documentos` — cualquier archivo ligado a cualquier entidad (`entidad` + `entidad_id`).
  Entidades Camino C habilitadas: `supplier_po`, `customer_po`, `sales_order`, `lot`, `operacion`.
- `categorias_documento` — Factura · Cotización · Orden de compra · BL/Guía · Certificado QC ·
  Liquidación · Comprobante de pago · Otro.
- `envios` — bitácora de a quién se le mandó qué, por qué canal (correo/whatsapp), cuándo y si
  llegó.
- RPCs: `fn_op_doc_registrar`, `fn_op_doc_anular`, `fn_op_envio_registrar`, `fn_op_envio_estado`.
- Vistas: `v_op_documentos`, `v_op_envios`, `v_op_spo_documento` (datos para el PDF de la OC).

**Decisiones tomadas:** correo = canal formal (puede llevar PDF adjunto); WhatsApp = aviso rápido
con liga (wa.me no adjunta archivos). Ligas firmadas a **90 días**. El envío real por servicio de
correo requiere dominio verificado — **pendiente con Miguel**.

**Formato de los documentos:** se usa la hoja membretada oficial (`assets/hoja-membretada.jpg`)
como fondo de página, y la estructura de las plantillas del proyecto (`Purchase_Order_Template`,
`Quote_Template`, `Invoice_Template`): BILL TO / SHIP TO, tabla ITEM#/DESCRIPTION/QTY/UNIT
PRICE/TOTAL, bloque SUBTOTAL/SALES TAX/OTHER/TOTAL, y comentarios finales.

**Patrón genérico a propósito:** replicar a factura al cliente, liquidación, etc. es solo agregar
su vista de formato.

---

## Mapeo: caso real → capas que activa

| Caso real | Capa 1 | Capa 2 | Capa 3 | Capa 4 | Capa 5 |
|---|---|---|---|---|---|
| Socio McAllen + consignación en bodega | Consignment | según gastos | Sí | — | — |
| Pick-n-pack que Plein pone y descuenta al cliente | (la que sea) | Sí | — | — | — |
| Pick-n-pack del cliente trasladado al productor | (la que sea) | Sí (pass-through) | — | — | — |
| No asume nada, paga al cobrar | (la que sea) | — | — | Back-to-back | — |
| % sobre venta sin poner nada | RM-005/006 | — | — | — | — |
| % sobre venta + gastos recuperables | RM-005/006 | Sí (adelanto) | — | — | — |
| Financiamiento de siembra + contrato atado a cosecha | RM-003/004 | según gastos | — | — | Sí |
| Omega hoy (relación directa, comisión) | RM-005 | — | — | — | — |
| Omega ideal (Plein el frente) | RM-006 | — | — | según acuerdo | — |

---

## Estado del Camino C (19-ago-2026)

| Fase | Estado |
|---|---|
| Catálogos (`cat.*`) | ✅ |
| O1 — Customer PO → Sales Order | ✅ |
| O2a — Inventario y lotes (sin dinero) | ✅ |
| O2b — Inventario con dinero (costo, valoración, margen) | ✅ |
| O3a — Compras (Supplier PO) → nace el lote | ✅ |
| O3b — Estados + recepción con diferencias y tolerancia | ✅ |
| O3c — Documentos y envíos | ✅ backend · frontend en curso |
| **Capa 1 — modalidades con ejes** | ✅ |
| Costos adicionales (flete, cooling, brokerage) | ⬜ **siguiente** |
| Cuentas por pagar con three-way match | ⬜ |
| Cuentas por cobrar / facturación al cliente | ⬜ |
| Logística (embarques, aduana, tránsito) | ⬜ |
| Capas 2–5 completas | ⬜ |

**Orden decidido y por qué:** recepción con diferencias fue PRIMERO porque el costo real por caja
y el three-way match dependen de lo que realmente llegó. Construir costos o CxP antes habría
obligado a rehacerlos.

---

## Huecos conocidos del flujo real (aún no modelados)

Del mapa de operación validado con Miguel:
- Control de calidad previo a la carga.
- Embarque y aduana (transportista, temperatura, pallets, agencia mexicana y americana).
- Entrega al cliente (incluido cross-dock, cuando no pasa por bodega de Plein).
- Facturación al cliente y cobranza.
- Pago al proveedor.

---

## Referencia: estándares de industria adoptados

- **PACA** distingue tres roles: *purchase and sale*, *consignment* (relación de agencia, el
  título se queda con el consignador), y comisionista/bróker. Nuestras modalidades mapean a eso.
- **GRN (Goods Received Note)** — el documento del comprador con lo que realmente contó al
  recibir, vs. el packing slip del proveedor. La diferencia es la *variación de recepción*.
- **Tolerancia de recepción** — configurable por línea (default 10%), estándar de la industria.
- **Three-way match** — la factura debe cuadrar con la orden de compra Y con lo recibido antes de
  autorizar pago. Es el candado que evita pagar mercancía que nunca llegó. **Pendiente de
  construir.**
