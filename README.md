# Dashboard de inversiones

Visualización interactiva de la evolución de un portafolio de inversión. Este mismo muestra:

- **Valor del portafolio vs. capital aportado** (gráfico de área + línea escalonada).
- **Rentabilidad acumulada ponderada por tiempo** (vista alternativa), que muestra el desempeño sin el efecto de los
  aportes.
- **Períodos 1M / 3M / 6M / Todo**, anclados a la última observación; recalculan gráfico y métricas.
- **Métricas del período**: rentabilidad, ganancia de mercado, aportes, caída máxima, mejor/peor día.
- **Resumen mensual**.
- Responsive (móvil → escritorio), modo oscuro automático y `prefers-reduced-motion`.

## Stack y por qué

| Pieza    | Elección                                                                        | Motivo                                                                                                     |
| -------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| UI       | React 19 + TypeScript                                                           | El tipado estricto obliga a validar datos externos                                                         |
| Build    | Vite 8                                                                          | Arranque y HMR instantáneos, env vars `VITE_*`                                                             |
| Datos    | Firebase JS SDK modular 13 (`firebase/firestore`)                               | `onSnapshot` + tree-shaking                                                                                |
| Gráficos | Recharts 3                                                                      | Declarativo en React, tooltip/crosshair y `ResponsiveContainer` listos; suficiente para una serie temporal |
| Estilos  | Tailwind CSS 4 + shadcn/ui (Card, ToggleGroup, Table, Badge, Skeleton) + Lucide | Componentes accesibles (Radix) sin dependencia de un kit cerrado                                           |
| Calidad  | ESLint 10 + typescript-eslint, Prettier, Vitest + Testing Library               |                                                                                                            |

## Instalación y ejecución

Requisitos: Node.js LTS (≥ 20) y npm. Además de las variables de entorno adecuadas.

```bash
npm install
cp .env.example .env
npm run dev            # servidor de desarrollo en http://localhost:5173
```

`npm run dev` no genera un build: Vite sirve el código fuente transformándolo al vuelo, con recarga instantánea.
Para producción:

```bash
npm run build          # typecheck + build optimizado en dist/
npm run preview        # sirve dist/ en http://localhost:4173 para probarlo
```

| Script                                                        | Qué hace                                              |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                                                 | Servidor de desarrollo                                |
| `npm run build`                                               | Typecheck (`tsc -b`) + build de producción en `dist/` |
| `npm run preview`                                             | Sirve el build                                        |
| `npm test`                                                    | Tests (Vitest)                                        |
| `npm run lint` / `npm run typecheck` / `npm run format:check` | Calidad                                               |

## Integración con Firebase

### Configuración

| Variable                                                                                   | Obligatoria | Default                      |
| ------------------------------------------------------------------------------------------ | ----------- | ---------------------------- |
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`                | sí          | —                            |
| `VITE_FIREBASE_AUTH_DOMAIN`, `…_DATABASE_URL`, `…_STORAGE_BUCKET`, `…_MESSAGING_SENDER_ID` | no          | —                            |
| `VITE_FIRESTORE_DOCUMENT_PATH`                                                             | no          | `investmentEvolutions/user1` |

### Suscripción en tiempo real

```text
Firestore ─onSnapshot─▶ subscribeToDocument ─▶ useFirestoreDocument ─▶ normalizeEvolution ─▶ Dashboard ─▶ Recharts
            (includeMetadataChanges)          (máquina de estados)     (validación pura)      (métricas memoizadas)
```

- `onSnapshot(doc(db, path), { includeMetadataChanges: true }, …)`: el primer callback trae el estado inicial y
  luego uno por cada cambio. Con `includeMetadataChanges` también se notifica cuando datos de caché pasan a estar
  confirmados por el servidor, así la UI nunca presenta `fromCache` como "en vivo".
- El listener se crea **una vez por ruta** y se libera (`unsubscribe`) al desmontar o cambiar de ruta.
- Un documento inexistente solo se reporta como tal si **el servidor lo confirma**; si solo respondió la caché
  vacía se muestra "Sin conexión". Un error de permisos **nunca** se muestra como "no existe".
- Si no llega respuesta en 10 s se muestra un aviso de conexión lenta (el SDK sigue reintentando solo).

| Error del SDK                                          | Lo que ve el usuario                                           |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `permission-denied`                                    | Sin permisos para leer los datos (reglas de seguridad)         |
| `unauthenticated`                                      | Se requiere autenticación                                      |
| `unavailable`, `deadline-exceeded`                     | Firestore no disponible / sin conexión                         |
| `invalid-argument`, `failed-precondition`, `not-found` | Proyecto de Firebase no válido                                 |
| otro                                                   | Mensaje genérico con el código (nunca contenido del documento) |

**Permisos requeridos:** lectura pública del documento. Verificado: el documento se lee sin autenticación con la
configuración entregada.

## Modelo de datos real

```text
investmentEvolutions/user1
└── array: Array<{ date: Timestamp, portfolioValue: number, contributions: number,
                   portfolioIndex: number, dailyReturn: number }>   (356 puntos diarios, 2019-01-01 → 2019-12-22)
```

Relaciones **verificadas numéricamente** (error ≈ 1e‑16) y no supuestas por el nombre de los campos:

- `dailyReturn` es fracción decimal (0,01 = 1 %) del día del punto: `I_i = I_{i-1}·(1 + r_i)`.
- `portfolioIndex` es un índice de rentabilidad ponderada por tiempo, base 100.
- `contributions` es capital aportado **acumulado** (12 niveles, sin retiros).
- `portfolioValue = V_{i-1}·(1 + r_i) + ΔC_i`: valor de mercado; el aporte entra al cierre del día.

## Visualización y métricas

**Por qué este gráfico:** los datos son una serie temporal diaria con dos magnitudes en la misma unidad (valor y
capital aportado). Un área para el valor con la línea escalonada de aportes encima responde la pregunta central
—¿cuánto tengo y cuánto de eso es ganancia?— en un solo eje. La rentabilidad (%) es otra unidad, así que va en
una vista separada en lugar de un doble eje. No hay composición del portafolio en los datos, así que no hay gráfico
de distribución.

## UI/UX

- **Color con intención:** azul = valor, gris = capital aportado (referencia neutra). Verde/rojo solo para
  signo, **siempre** acompañado de `+`/`−` e ícono. Paleta verificada en claro y oscuro (contraste ≥ 3:1, separación
  para daltonismo).
- **Gráfico:** líneas rectas entre días (sin suavizado que invente valores), crosshair + tooltip con valor,
  aportado, ganancia, retorno del día y aporte del día.
- **Accesibilidad:** HTML semántico (`header`/`main`/`section`/`dl`/`table`), `ToggleGroup` de Radix (teclado y
  `aria-checked`), foco visible, resumen textual del gráfico (`role="img"` + `aria-label`), tabla como
  alternativa, estados con `role="alert"`/`status`, `prefers-reduced-motion`.

## Testing

```bash
npm test
```

78 tests (Vitest + Testing Library), todos con **datos sintéticos** (`src/test/fixtures.ts` genera series que
cumplen las mismas relaciones que el documento real; ningún dato real está en el repo).

| Área                                 | Casos                                                                                                                                                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Configuración                        | variables faltantes, ruta de colección vs. documento                                                                                                                                                                 |
| Errores                              | clasificación de códigos del SDK                                                                                                                                                                                     |
| Suscripción (`useFirestoreDocument`) | ruta correcta, primer snapshot, nuevos snapshots, caché vs. servidor, igualdad independiente del orden de claves, inexistente vs. offline, permisos, conexión lenta, `unsubscribe` al desmontar y al cambiar de ruta |
| Normalización                        | Timestamps, día calendario UTC, orden, duplicados, valores inválidos, serie vacía, estructura desconocida                                                                                                            |
| Métricas                             | ganancia, TWR vs. variación de valor, ganancia de mercado, drawdown, meses parciales                                                                                                                                 |
| Rangos / ejes                        | resta de meses, anclaje, rangos disponibles, escalas "nice"                                                                                                                                                          |
| UI                                   | todos los estados, hora de actualización vs. datos en caché sin confirmar, re-render ante un nuevo snapshot + anuncio, cambio de período                                                                             |

**Limitaciones:** los tests del listener usan un SDK **mockeado**: prueban el comportamiento del hook, no la
conectividad real. La conexión real se verificó aparte: la app en Chromium headless recibe el snapshot desde el
servidor y, sin recargar, recibió una actualización real de Firestore (cambió la cifra principal, la hora de
"Actualizado" cambió y se emitió el anuncio `aria-live`). No hay tests E2E automatizados ni de los
internos de Recharts.

Verificado en esta entrega: `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test` y
`npm run build` sin errores; revisión visual en Chromium headless (claro/oscuro, 390 px y 1280 px).

## Estructura

```text
src/
├── App.tsx                      # Conecta config → hook → Dashboard
├── components/
│   ├── charts/EvolutionChart.tsx
│   ├── dashboard/               # Dashboard, PositionHero, ChartControls, PeriodStatsGrid,
│   │                            # MonthlyTable, StatusPanel, Delta
│   └── ui/                      # shadcn/ui generados
├── hooks/                       # useFirestoreDocument, useInvestmentEvolution, usePrefersReducedMotion
├── lib/
│   ├── firebase/                # config, client (singleton), subscribeToDocument, errors
│   ├── investments/             # normalize, metrics, ranges (puras y testeadas)
│   ├── chartScale.ts, format.ts
├── types/investment.ts
└── test/                        # setup + fixtures sintéticos
```

## Uso de inteligencia artificial

El proyecto se desarrolló con **Claude Code** (Claude Opus) como agente de programación, guiado por un prompt de
sistema que imponía dos fases: primero conectar y **descubrir** el documento real, y solo después diseñar.

- **Cómo se integró:** la IA inicializó el proyecto, escribió el código, los tests y la documentación. Se definieron el alcance y las restricciones (privacidad,
  datos no inventados) y a su vez se revisaron las desiciones del agente.
- **Decisiones donde participó:**
  - El descubrimiento se hizo con scripts que imprimen **solo esquema y errores relativos**, nunca valores, para no
    exponer datos financieros en el flujo de trabajo de la IA.
  - Las semánticas de los campos se **demostraron** con comprobaciones numéricas (p. ej. que `dailyReturn` es
    fracción y no porcentaje, que `contributions` es acumulado) en vez de deducirlas del nombre.
  - Detectó el desfase de zona horaria de los timestamps y propuso usar el día calendario UTC.
  - Detectó que el documento se actualiza en vivo (solo el último punto) y se verificó que los invariantes se
    mantienen tras cada actualización.
  - Elección del gráfico (área + escalón en un eje; rentabilidad en vista aparte, sin doble eje), validación de la
    paleta con un script de contraste/daltonismo, y cambio de curvas suavizadas a rectas.
- **Qué se validó técnicamente:** typecheck, lint, formato, 78 tests y build; conexión real en navegador y recepción
  de actualizaciones reales.
