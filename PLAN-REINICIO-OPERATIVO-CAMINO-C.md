# PLAN DE REINICIO OPERATIVO — CAMINO C
### Plein Produce LLC · ERP · Nuevo núcleo operativo hacia adelante
**Versión 1.0 · Documento norte · Estado: aprobado (bandera verde)**

---

## 0. Qué es este documento

Es el **norte** del nuevo desarrollo del ERP de Plein. Define, en orden, **cómo se
reconstruye el núcleo operativo hacia adelante** (Camino C), qué se reutiliza de lo ya
construido, qué se hace nuevo, y cómo se hace el cambio (go-live) sin entorpecer la operación.

**No es** una reescritura desde cero: se reconstruye **el modelo operativo** reusando el
motor financiero, la seguridad, los catálogos y la metodología que ya están probados.

Este documento manda sobre lo que se recuerde "de memoria". Si algo aquí choca con una
idea vieja, gana este documento.

---

## 1. Decisión tomada (Camino C)

- Construir un **núcleo operativo nuevo, hacia adelante**, siguiendo el modelo del
  documento de Proceso 1 (Customer PO → Sales Order → Sourcing → …).
- **Reusar** el motor de dinero (Cuadre, CxC/CxP, banco, liquidación PACA), la seguridad,
  los catálogos y la disciplina de trabajo.
- **No migrar** el historial reconciliado. Go-live con **saldos de apertura** en una
  **fecha de corte**.
- El ERP actual **sigue vivo y operando** hasta que el nuevo esté operable y validado.
  El viejo queda después como **historia de solo-lectura**; V8/Drive se retiran progresivamente.

---

## 2. Principios rectores (candados de diseño)

1. **Un solo ERP, modular.** Operación y administración viven juntas; los números
   administrativos salen solos de lo operativo (sin doble captura).
2. **ERP ≠ contabilidad fiscal.** El ERP lleva **números y movimientos** (ventas, compras,
   inventario, costo, margen, AR, AP, gastos, banco, reportes). Lo fiscal/formal
   (GL formal, impuestos, estados financieros fiscales, CPA) queda en un sistema
   contable aparte que **recibe** del ERP (fase futura O8).
3. **Hacia adelante, operación-primero.** El flujo arranca en el Customer PO, no en la
   reconstrucción del pasado.
4. **Operación (OP) como hilo conductor.** Una clave interna gobierna todas las fases de
   una transacción y hace el **roll-up de costos** para el margen real.
5. **Costos a nivel Operación/Embarque (regla amarrada).** Los gastos (in&out, fletes, QA,
   aduanas, cartón, comisión, otro) **no se capitalizan por unidad** en el inventario;
   son costo de la Operación/Embarque. El inventario/Lot vale **solo el costo de producto**.
6. **Atribución de CxP (regla amarrada).** Cada gasto con un tercero real genera su
   **Cuenta por Pagar atribuida** a quien se le paga (proveedor, flete, aduana, QA…).
7. **Corte con saldos de apertura, no migración del desorden.**
8. **Cada fase termina en un checkpoint "operable y probado"** antes de pasar a la siguiente.
9. **Disciplina de siempre:** GATE para DDL/montos/decisiones, ENSAYO-que-revierte antes de
   cada DDL, verificación de anclas + seguridad (0/0/0), objetos que nacen cerrados,
   un solo escritor durante el DDL, split backend/frontend, un tema por chat.
10. **Se construye en espacio limpio** (rama de Supabase o esquema aparte). Lo vivo no se
    toca hasta el corte.

---

## 3. Mapa del modelo (hacia dónde vamos)

```
Customer
   │
   ▼
Customer PO ──► Sales Order ──►  (Inventory Allocation ──► Lot / Inventario)
   (adjunto)     (centro)    │    y/o
                             └──►  (Purchase Order ──► Vendor)
                                        │
                                        ▼
                                 Load / Embarque ──► BOL ──► POD (entrega)
                                        │
                                        ▼
                                   Invoice  ──►  AR (CxC)
                                 Vendor Bill ──►  AP (CxP)
                                        │
                                        ▼
                                  Payment ──► Banco / Cash
                                        │
                                        ▼
                           Reporting: Ventas / Margen / Inventario / AR-AP / P&L
```

La **Operación (OP)** envuelve todo el hilo de una transacción y junta el costo total
para el margen. El **Sales Order** es el centro comercial; **Allocation** y **Purchase Order**
son las dos formas de abastecerlo.

---

## 4. Las fases (O1 → O7)

> Cada fase indica: **Objetivo**, **Entidades nuevas**, **Reglas clave**, **Reutiliza**,
> y **Criterio de operable** (la prueba de que quedó lista). El orden es obligatorio:
> no se abre una fase hasta cerrar el checkpoint de la anterior.

### O1 — Comercial de entrada: Customer PO + Sales Order
- **Objetivo:** capturar la orden del cliente y convertirla en un Sales Order interno.
- **Entidades nuevas:** `customer_po` (número original + adjunto + ID interno propio),
  `sales_orders` (versión limpia), `so_lineas` (order lines).
- **Reglas clave:**
  - El Customer PO conserva su número original y su documento; el ERP genera un ID interno
    propio (ej. `CPO-2026-00125`). El número del cliente **no** es el número interno.
  - Desde el CPO se crea el SO (auto-numerado). v1: **1 CPO → 1 SO**.
  - Estados del SO: Draft → Confirmed → In Progress → Partially Sourced → Sourced/Ready.
  - "Sales Type" (Venta directa / Comisión / Consignación) se mapea a los **revenue_models**
    que ya tenemos.
  - El SO muestra **Required / Allocated / Purchased / Open** (Allocated y Purchased llegan
    en O2/O3).
- **Reutiliza:** catálogo de clientes (contrapartes), productos, revenue_models, sistema de diseño.
- **Operable cuando:** puedo registrar un Customer PO real, generar y confirmar su SO, y ver
  el tablero Required/Open del SO.

### O2 — Inventario + Lots + Allocation
- **Objetivo:** inventario real que se pueda reservar sin mover el físico. *(Músculo nuevo.)*
- **Entidades nuevas:** `lots` real (On Hand, ubicación), `locations`,
  `inventory_allocations` (SO ↔ Lot, cantidad reservada).
- **Reglas clave:**
  - `Available = On Hand − Allocated − reservas válidas`.
  - La Allocation **reserva** producto: baja Available, **no** baja On Hand físico.
  - Se puede asignar de uno o varios lotes al mismo SO.
  - **Gastos de entrada** (in&out de recepción, flete de traída, QA de recibo): se cuelgan
    aquí **a nivel Operación** (regla amarrada), generando **CxP atribuida** al tercero.
- **Reutiliza:** motor CxP, contrapartes.
- **Operable cuando:** cargo inventario en lotes, veo On Hand/Available, asigno a un SO, y
  Available baja mientras On Hand se mantiene.

### O3 — Purchasing / Sourcing: Purchase Order desde el SO
- **Objetivo:** cubrir el faltante del SO con compra al proveedor, con relación bidireccional.
- **Entidades nuevas:** `purchase_orders` (evolución de `ordenes_compra`), `po_items`,
  `so_po_link` (relación SO ↔ PO).
- **Reglas clave:**
  - Si no hay inventario suficiente, se crea PO **solo por el faltante**; la PO **referencia** el SO.
  - Navegación en ambos sentidos (SO→PO y PO→SO). Un SO puede tener varias PO; una PO puede
    abastecer varios SO.
  - Parcial: primero se asigna lo disponible (O2), luego PO por el resto.
  - **Se reutiliza el patrón AJUSTE A** (herencia PO→embarque con costo de materia prima
    **atribuido** al proveedor) probado en el sistema actual.
- **Reutiliza:** estructura de `ordenes_compra`, patrón AJUSTE A, motor CxP.
- **Operable cuando:** desde un SO con faltante creo una PO, queda ligada, y el SO muestra
  Purchased/Open correctos.

### O4 — Logística: Load / Pickup / BOL / POD (Embarque)
- **Objetivo:** mover el producto asignado hacia el cliente y documentar la entrega.
- **Entidades nuevas:** `loads`/embarques (evolución de `cargas`), pickup/release, `bol`, `pod`.
- **Reglas clave:**
  - El embarque **consume** el inventario asignado: al embarcar, sale de On Hand.
  - **Gastos de salida** (flete al cliente, comisión de venta, enfriado): se cuelgan al
    Embarque **a nivel Operación**, con **CxP atribuida**.
- **Reutiliza:** concepto `cargas`/`carga_costos`, el formulario de embarque del frontend,
  patrón AJUSTE A.
- **Operable cuando:** creo un Load desde SO(s) asignados, genero BOL, registro POD, y el
  On Hand baja al embarcar.

### O5 — Invoice + Payment → AR / AP
- **Objetivo:** que la facturación y los pagos alimenten AR/AP **hacia adelante** (por evento).
- **Entidades nuevas:** `invoices` (cliente), `vendor_bills` (proveedor), `payments`;
  AR/AP como estado derivado.
- **Reglas clave:**
  - Al entregar/embarcar → se genera Invoice → **AR + monto**. Cliente paga → Payment → AR baja.
  - Factura de proveedor → **AP + monto**. Se paga → Payment → AP baja.
  - **Consignación:** el ingreso se reconoce **al liquidar**, no al embarcar (se reutiliza
    liquidación PACA).
  - Margen visible = ventas − (costo de producto + todos los gastos de la operación).
- **Reutiliza:** motor CxC/CxP, liquidación PACA, banco, plantillas (Invoice/PO/Quote/Liquidación),
  aplicaciones/FIFO.
- **Operable cuando:** entrego → factura → AR sube; cobro → AR baja a 0; lo mismo con AP;
  y el margen de la operación se ve solo.

### O6 — Gastos + Banco / Cash
- **Objetivo:** registrar gastos generales y conciliar el banco.
- **Entidades nuevas:** `expenses` (gastos generales no ligados a una operación),
  banco/movimientos (evolución del modelo JPM), cash.
- **Reglas clave:**
  - Gastos **ligados a una operación** van por `carga_costos` (O2/O4). Gastos **generales** de la
    empresa (renta, servicios, admin) van a `expenses`.
  - El banco concilia entradas y salidas; **Cuadre = 0.00** sigue siendo el centinela.
- **Reutiliza:** banco JPM, movimientos, Cuadre.
- **Operable cuando:** registro un gasto general y un movimiento de banco, y el cash/banco cuadra.

### O7 — Reporting: Ventas / Margen / Inventario / AR-AP / P&L
- **Objetivo:** ver la foto del negocio derivada del flujo, sin recaptura.
- **Entidades nuevas:** principalmente vistas/reportes (pocas tablas nuevas).
- **Reglas clave:**
  - P&L por operación, por cliente, por producto y por periodo.
  - Inventario valuado (a costo de producto), aging de AR/AP, margen.
- **Reutiliza:** anclas, Cuadre, concepto de `v_balance`.
- **Operable cuando:** veo P&L del periodo, margen por operación, estado de AR/AP e inventario,
  todo derivado del flujo.

### O8 — (Futuro) Integración contable/fiscal
Fuera del alcance inicial. Cuando aplique: el ERP **exporta/integra** hacia un sistema
contable/fiscal (GL formal, impuestos, CPA, nómina). No se construye contabilidad fiscal
dentro del ERP.

---

## 5. Qué pasa con lo ya construido

| Categoría | Detalle | Destino |
|---|---|---|
| Motor de dinero | Cuadre=0.00, CxC/CxP con atribución, banco JPM, aplicaciones/FIFO, liquidación PACA | **Se reutiliza** |
| Seguridad | Objetos que nacen cerrados, centinelas seg (0/0/0) | **Se reutiliza** |
| Catálogos | Contrapartes, productos, revenue_models | **Se reutiliza** |
| Plantillas | Invoice / PO / Quote / Liquidación | **Se reutiliza** |
| Diseño frontend | Estilo Silo, tokens, MARCO, sistema de diseño | **Se reutiliza** |
| Metodología | GATE, ENSAYO-que-revierte, anclas, split backend/frontend | **Se reutiliza** |
| Reglas amarradas | Costos a nivel OP/embarque · Atribución de CxP | **Se reutiliza** |
| Operación como hilo | Concepto OP + relaciones SO↔OC↔embarque | **Se reconstruye hacia adelante** (concepto se conserva) |
| Customer PO | Hoy es solo texto en la venta | **Se construye nuevo** (entidad de primera clase) |
| Sales Order | Existe, pero no como centro con estados | **Se reconstruye** (limpio, centro, con estados) |
| Inventario/Lots/Allocation | Hoy `lotes` es espejo contable, no operativo | **Se construye nuevo** (músculo faltante) |
| Sourcing (allocate vs PO vs parcial) | No existe | **Se construye nuevo** |
| Logística (Load/Pickup/BOL/POD) | No existe como primera clase | **Se construye nuevo** |
| Invoice/Payment → AR/AP hacia adelante | Hoy AR/AP es reconstruido hacia atrás | **Se reconstruye** (por evento) |
| Datos históricos reconciliados | P-001…P-096, OP-0001…0088, CxC/CxP reconstruido | **No migran** — quedan como historia de solo-lectura |
| V8 / Drive | Fuente operativa actual | **Se retiran** progresivamente tras el go-live |

---

## 6. El corte (go-live con saldos de apertura)

Cuando el nuevo núcleo esté operable y validado:

1. Se elige una **fecha de corte** (idealmente fin de un mes).
2. Del sistema actual se sacan **solo los saldos de apertura** al corte:
   - **CxC abierta** (quién nos debe y cuánto).
   - **CxP abierta** (a quién le debemos y cuánto), atribuida por contraparte.
   - **Saldo de banco** (JPM y demás).
   - **Inventario On Hand por lote** con su costo de producto.
   - **En Camino** (posiciones en tránsito: NGM248545 / PX-72306 / PX-72715 y las que apliquen).
3. Esos saldos se cargan al sistema nuevo como su **punto de arranque**.
4. Del corte en adelante, **todo se captura operando** (limpio).
5. El sistema viejo y V8 quedan **congelados como historia de solo-lectura**. No se borra nada.

---

## 7. Cómo trabajaremos (metodología)

- **Espacio de desarrollo limpio** (rama de Supabase o esquema aparte). Lo vivo no se toca
  hasta el corte.
- **Una fase por bloque de trabajo**, cada una cerrando en su checkpoint "operable y probado".
- **Backend (este chat):** SQL, arquitectura, funciones, vistas, ENSAYO, anclas, seguridad.
- **Frontend (Claude Code):** pantallas, formularios, pruebas en navegador. Instrucciones en
  bloques copy-paste. Miguel despliega y valida en navegador.
- **Cada DDL:** GATE → ENSAYO-que-revierte → verificar anclas + seg (0/0/0) → aplicar.
- **Pruebas:** cada entrega incluye pasos concretos de cómo probar y qué esperar.
- **Un solo escritor** durante el DDL (pausar la UI mientras se aplica).

---

## 8. Lo que falta definir (se resuelve sobre la marcha)

- **Fecha de corte** tentativa (para planear, no urgente).
- Detalle fino de cada fase (campos exactos, estados, validaciones) se cierra **al abrir cada fase**.
- Cómo se tratan las operaciones **en vuelo** al corte (SO abiertos, En Camino) → entran como
  posiciones de apertura.
- Nombre/ubicación del esquema o rama de desarrollo limpio.

---

## 9. Siguiente paso inmediato

Abrir **Fase O1** (Customer PO + Sales Order + catálogos base): diseño de entidades →
ENSAYO → checkpoint operable → prueba en navegador.

---

*Documento vivo. Se actualiza al cerrar cada fase. Las decisiones numeradas (D-XXX) y el
detalle técnico de cada fase se registran en la bitácora del repo.*
