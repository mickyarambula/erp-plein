# Modelo de ingresos y operación — Plein Produce

Base de diseño para integrar, en orden y sin desordenar, todas las formas en que Plein
opera y gana dinero. Documento vivo de referencia (no es bitácora; se registra formalmente
cuando cada capa se construya).

## Principio central

Los casos reales del negocio **no son "más modalidades"**. Son combinaciones de **5 capas
independientes**. Una misma carga puede activar varias capas a la vez (ej: consignación +
reparto con socio + pick-n-pack descontado al cliente). Modelarlas por separado evita la
explosión combinatoria y mantiene el orden.

---

## Capa 1 — Rol de Plein en la transacción (modalidad / `revenue_models`)

Qué ES Plein en el trato. Se define por 5 ejes, no por texto libre:

- `toma_titulo` — ¿Plein toma título del producto?
- `posesion_fisica` — ¿Plein recibe físicamente? → **decide si usa Inventario/Lots**
- `frente_financiero` — ¿el dinero del cliente pasa por Plein? → **decide si hay CxC/CxP en Plein**
- `reconoce_ingreso` — `embarque` | `liquidacion` | `precio_fijado`
- `calculo_ingreso` — `margen` | `pct_gross` | `comision_fija` | `comision_pct` | `cuota_servicio` | `prorrateo_joint`

| Modalidad | Título | Posesión | Frente fin. | Ingreso | Cálculo |
|---|---|---|---|---|---|
| Buy & Resell | Sí | Sí | Sí | Embarque | Venta − costo prorrateado |
| Margin per Box | Sí | Sí | Sí | Embarque | Margen por caja |
| Consignment | No | Opcional | Sí | Liquidación | % del gross |
| Fixed Fee/embarque (Alpine) | No | No | No | Embarque | Cuota fija |
| Bróker puro | No | No | No | Cierre de trato | Comisión (paga el proveedor) |
| Commission merchant / frente | No | Opcional | Sí | Cobro/liquidación | Comisión % |
| Joint account | Compartido | Opcional | Compartido | Liquidación | Prorrateo de utilidad |
| Price After Sale (PAS) | Sí | Sí | Sí | Precio fijado | Margen (precio tardío) |

Estado: hoy existen 4 (RM-001..004) con los ejes escondidos en texto. Falta: agregar columnas
de ejes + sembrar las nuevas (aditivo, sin renumerar).

---

## Capa 2 — Atribución y recuperación de gastos

Quién pone cada gasto (pick-n-pack, flete, cooling, inspección, brokerage) y cómo se recupera.
Vive a nivel de **operación/línea**, NO en la modalidad.

Modos de cada gasto:
- **Plein lo pone → lo descuenta al cliente** (recuperable del cliente)
- **Plein lo pone → lo traslada/cobra al productor** (recuperable del productor)
- **El cliente lo pone → se paga al productor** (pass-through, Plein no lo absorbe)
- **Plein lo adelanta por cuenta de otro → se cobra al cobrar** (adelanto recuperable)
- **Plein lo absorbe** (costo propio, baja el margen)

Casos reales que caen aquí:
- Pick-n-pack que Plein pone y descuenta de lo que pague el cliente.
- Pick-n-pack que el cliente pone y se traslada/paga al productor.
- "% sobre venta pero cubrimos algunos gastos que luego cobramos al cobrar".

---

## Capa 3 — Reparto de utilidad con terceros (co-vendedores / socios comerciales)

Un tercero que NO es cliente ni productor ayuda a colocar el producto y se reparte utilidad,
cada quien asumiendo ciertos gastos. Vive como participación ligada a la operación.

Caso real: **socio de ventas en Texas / McAllen** — reparto de utilidades, Plein asume algunos
gastos y el socio otros; el producto muchas veces va en consignación a una bodega hasta que se
vende, y ahí se sabe el precio y lo que toca a cada quien.

Nota: esto se combina con Capa 1 (consignación) y Capa 2 (gastos). Es una capa aparte porque el
tercero no encaja en cliente/productor.

---

## Capa 4 — Términos de pago y riesgo

Cuándo paga Plein al productor y cuánto riesgo asume.
- **Back-to-back** — Plein paga al productor solo cuando el cliente le paga (sin riesgo).
- **Adelantado** — Plein paga antes de cobrar (asume riesgo de crédito/cobranza).

Caso real: "no asumimos nada y pagamos hasta que nos pagan". Atributo de la operación; se
integra con AR/AP.

---

## Capa 5 — Financiamiento a productores y contratos forward (módulo Proyectos)

Programas donde Plein ayuda con **financiamiento de siembra** a cambio de compromiso de entrega,
y se firman **contratos con clientes atados a la cosecha** que se van cumpliendo según el avance
del productor, con las reglas establecidas desde el inicio.

Vive en el **módulo Proyectos** (nunca pegado a cargas). El financiamiento es un activo/derecho
de Plein; la entrega comprometida y los contratos forward con clientes son piezas que se van
liquidando contra cargas reales conforme cosechan.

---

## Mapeo rápido: cada caso real → capas que activa

| Caso real de Miguel | Capa 1 | Capa 2 | Capa 3 | Capa 4 | Capa 5 |
|---|---|---|---|---|---|
| Socio McAllen + consignación en bodega | Consignment | según gastos | Sí | — | — |
| Pick-n-pack que Plein pone y descuenta al cliente | (la que sea) | Sí | — | — | — |
| Pick-n-pack del cliente trasladado al productor | (la que sea) | Sí (pass-through) | — | — | — |
| No asume nada, paga al cobrar | (la que sea) | — | — | Back-to-back | — |
| % sobre venta sin poner nada | Comisión % | — | — | — | — |
| % sobre venta + gastos recuperables | Comisión % | Sí (adelanto) | — | — | — |
| Financiamiento de siembra + contrato atado a cosecha | Buy&Resell/Consig al liquidar | según gastos | — | — | Sí |
| Omega hoy (relación directa, comisión) | Bróker puro | — | — | — | — |
| Omega ideal (Plein el frente) | Commission merchant | — | — | según acuerdo | — |

---

## Orden de integración sugerido (sin perder la línea actual)

1. **Capa 1 (modalidades con ejes)** — cimiento. Se asienta al entrar a O2b/O3, porque el dinero
   y las compras dependen de qué es Plein en cada operación.
2. **O2b (inventario con dinero)** — entra parte de Capa 2 (costos/gastos por línea).
3. **O3 (Sourcing/Compras)** — el lado de compra; conecta costo real al inventario.
4. **AR/AP e Invoice (O5–O6)** — Capa 4 (términos/riesgo) y recuperación de gastos de Capa 2.
5. **Capa 3 (splits con terceros)** — fase dedicada dentro de AR/AP o posterior.
6. **Capa 5 (Proyectos)** — módulo aparte, se integra cuando toque; ya tiene hogar definido.
