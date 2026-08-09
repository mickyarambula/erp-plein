# PARCHE E71 — pegar en los anexos

Instrucciones: pega el bloque **D-61** al final de `BITACORA-DECISIONES.md` y el bloque
**PLAN-MAESTRO** en la sección de reconciliación V8 de `PLAN-MAESTRO.md`. `AUDITORIA.md` NO
cambia (no hubo hallazgos de auditoría; el ENSAYO que atrapó la fuga fue proceso normal, no
finding). `CLAUDE.md` ya viene reemplazado aparte.

---

## → BITACORA-DECISIONES.md (append)

**D-61 (E71) — Reconciliación V8, Fase 1 (Chase) + Fase 2 (conceptos).**
- El pivote Chase del V8 = suma cruda EXACTA (846,879.60 / −830,890.31 / 15,989.29); sin wash
  interno en la pestaña Chase (a diferencia del FRX histórico).
- ERP JPM (107-374) y V8 (107-941) contiguos, sin huecos. Solape 268: folios **363-368 son un
  REORDEN de folio** (mismo conjunto de montos, cero impacto — confirma "cotejar por contraparte,
  nunca por folio"); 28 Types distintos V8↔ERP = reclasificaciones ya decididas y horneadas en
  anclas (Hanna, viáticos Samuel, wash AJUSTE, cartón, anticipos), NO son errores.
- "Bloque nuevo" 375-941 = **560 filas 100% vacías (padding de la hoja)** + **7 movimientos reales
  (375-381)**, que netean +9,113.36 = exactamente 15,989.29 − 6,875.93.
- Capturados los 7 (folios ERP 375-381 alineados a V8): 375 Akambarhu −15,000 Anticipo a productor;
  376 JEAMS +15,000 Financiamiento externo (back-to-back con tasa 6.2%); 377 P&M +10,000 Cliente;
  378 Samuel −415.37 Viáticos; 379 Costatropical −300 Fletes; 380 ClickUp −65.94 Otros gastos;
  381 Seed Aruba −105.33 Anticipo a productor.
- **Hallazgo de proceso:** un `Anticipo a productor` como movimiento suelto FUGA el Cuadre (el
  activo se reconoce por `proyecto_amortizaciones`, no por el movimiento). El ENSAYO lo detectó
  (−15,105.33) ANTES de escribir. Corregido ligando disposiciones: **375→PRJ-001** disposición
  15,000 (dispuesto 25k→40k); **381→PRJ-005** disposición 105.33 (8,350→8,455.33). Segundo ENSAYO
  dio Cuadre 0.00 → write real. (Regla incorporada a CLAUDE.md, sección Trampas de API.)
- **377 (P&M 10,000) capturado como Cliente pero SIN APLICAR:** es abono a la carga 1491 = **P-079**,
  que es **consignación sin liquidar** y arrastra el trueque D-42. Aplicarlo reconocería venta
  inexistente. Flota en "partidas por aplicar"; se liquida cuando P-079 liquide.
- **379 (flete Costatropical 300):** recuperable del productor ("se lo descontamos del pago");
  ligar a la carga **NGM247514 = P-077** (Northgate/papaya) con su recuperación, en Fase 3.
- **Fase 2 cerrada de facto:** ningún tipo nuevo ni DDL. El único Type fuera de catálogo
  ("Prestamo") mapeó a buckets existentes (Financiamiento externo / Anticipo a productor).
- **Diagnóstico Fase 3-Cargas (E71, sin escrituras):** V8 85 vs ERP 82 vivas. **0 cargas nuevas
  reales.** Falsos nuevos: EXP-101/102 = 101/102 y Alpine AX0010/11/12 = AX010/11/12 (formato de
  PO). Alpine sin discrepancia (comisión abierta en ambos; "Cerrada" = estado de pipeline, no
  cobro). **V8 1495 = ERP P-076/1490** (mismo embarque de 960 cajas, 8-jul, Jack Fruit P&M, prov.
  Las Brisas): NO es carga nueva — cargarla habría duplicado ~15k de CxC/CxP. Diferencias reales de
  P-076: comisión 462.99(ERP)→358.85(V8) y venta 15,000→15,254.73 (V8 manda). El núcleo real de
  Fase 3 es la **reconciliación de montos carga-por-carga** (venta + 7 costos) sobre las 82.

**ANCLAS E71:** CxC 587,807.09 · CxP 507,345.14 · Cuadre 0.00 · JPM 15,989.29 · JEAMS −52,872.00 ·
movs_jpm 275 · folio_max_jpm 381 · fecha_max 2026-07-31 · aplicaciones 189 · cargas 82 vivas ·
flags 1 · revenue_models 4 · sales_orders 73 · seg 0/0/0 · anticipos 48,455.33 · finext 45,000 ·
PRJ-001 dispuesto 40,000 · PRJ-005 dispuesto 8,455.33.

---

## → PLAN-MAESTRO.md (sección "Reconciliación V8")

**Bloque transversal: Reconciliación V8-actualizado (fuera de C→D, por fases)**
- [x] **Fase 1 — Chase/movimientos** (E71): 7 movs reales cargados (375-381), JPM reconcilia a
  15,989.29 = pivote V8. 560 filas vacías ignoradas. Cuadre 0.00.
- [x] **Fase 2 — conceptos nuevos** (E71): sin DDL; "Prestamo" mapea a buckets existentes.
- [ ] **Fase 3 — cargas + pestañas Ingresos/Egresos/Traspasos/Nómina** (en curso):
  - [x] Diagnóstico de Cargas (E71): 0 cargas nuevas reales; 1495=P-076.
  - [ ] Reconciliación de MONTOS carga-por-carga (venta + 7 costos, V8 manda) sobre las 82.
  - [ ] Corrección P-076 (venta →15,254.73, comisión →358.85).
  - [ ] Sync de estados (P-079 Entregada, PX-72648/72650 Entregada, Candy Fresh).
  - [ ] Liquidar consignación P-079 y aplicar abono P&M mov 377.
  - [ ] Ligar flete mov 379 → carga P-077 con recuperación del productor.
  - [ ] Diff de pestañas Ingresos / Egresos / Traspasos / Nómina (aún sin abrir).
