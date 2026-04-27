# Rufino Dashboard v0.2 — Design Spec

> **Para Claude Design:** este doc describe 5 features nuevas que se agregan al dashboard de Rufino. La app actual existe en `https://github.com/valentinoerrandonea/rufino` (v0.1.2 shipped, ver releases para los DMG). Todo lo que ya existe (Inicio, Notas, Pendientes, Personas, Memoria con sus subsecciones, captura, settings, onboarding) se mantiene tal cual — sólo agregamos pantallas nuevas y secciones nuevas en pantallas existentes. Mantener el lenguaje visual actual (warm calm, Bear/Things 3 / serif Newsreader / accent terracota `#b06836`). Dark + light theme. Idioma: español neutro.
>
> **Lo que necesito de Claude Design:** mockups en HTML/CSS/JS de las pantallas nuevas detalladas abajo, más ejemplos de los componentes shared. Sample data realista. Estados vacíos, de carga, de error explícitos.

---

## 0. Sistema de diseño existente

### Tokens (CSS variables)

```css
/* Light */
--bg: #f7f4ee;        --bg-2: #fbf8f3;
--surface: #ffffff;   --surface-2: #f2ede4;
--ink: #2a2723;       --ink-2: #6b6660;       --ink-3: #9a948c;
--ink-dim: #c5beb2;
--hair: #e6dfd2;      --hair-soft: #efeadf;
--accent: #b06836;    --accent-2: #c47a48;
--accent-wash: rgba(176, 104, 54, 0.08);
--green: #5b8a5a;     --amber: #c49530;
--red: #b4493c;       --blue: #5a7aa0;

/* Dark */
--bg: #1e1c1a;        --bg-2: #242220;
--surface: #2a2724;   --surface-2: #33302c;
--ink: #ece7de;       --ink-2: #a8a29a;       --ink-3: #757069;
--hair: #3a3632;      --hair-soft: #322f2b;
/* accents stay constant across themes */
```

### Tipografía

- **Body**: Inter (sans, 14px base)
- **Display/headings/serif**: Newsreader (serif 400/500, used in titles and pulled quotes)
- **Mono**: JetBrains Mono (code blocks, eyebrows)

### Componentes existentes (referencia)

- `.btn` (default), `.btn.primary`, `.btn.ghost`, `.btn.sm`
- `.card` (white surface with hairline border), `.card-soft` (warm bg-2)
- `.chip` / `.chip.active`
- `.input`, `.label`
- `.cb` / `.cb.done` (checkbox)
- `.hr`, `.hr-soft`
- `.avatar`
- `.drag-region` (Electron `app-region: drag`) — el strip de 36px arriba de toda la app

### Patrones recurrentes

- **Eyebrow:** mono `font-size: 11`, `--accent`, `letter-spacing: 0.6`, `text-transform: uppercase`, `font-weight: 600` — usado arriba de los títulos de página (ej. `MEMORIA`, `MEMORIA · PROYECTO`).
- **Page title:** serif `font-size: 32-36`, `font-weight: 400`, `line-height: 1.1-1.15`.
- **Section label uppercase:** `font-size: 11`, `letter-spacing: 0.7`, `font-weight: 600`, `--ink-3`, en field labels del editor.
- **Empty state with dashed border:** `border: 1px dashed var(--hair); padding: 18px 22px; border-radius: 8; color: var(--ink-3); font-size: 13`.
- **Row-list cards:** ver `/memory/proyectos` — grid de fila con nombre serif + subtitle + blurb + stats + tiempo relativo + chevron al hover.
- **Detail layout:** ver `/memory/proyecto/[id]` — eyebrow + título serif grande + italic subtitle + blurb + meta row + secciones con cards.

### Sidebar actual (referencia)

```
┌── Rufino logo + nombre ──────┐
│ RUFINO                       │
│   Inicio                     │
│   Notas                      │
│   Pendientes                 │
│   Personas                   │
│ MEMORIA                      │
│   Perfil                     │
│   Preferencias               │
│   Stack                      │
│   Proyectos                  │
│ ─────────────                │
│   Configuración              │
│   ☾ Tema oscuro              │
│   ⚙ Ajustes                  │
└──────────────────────────────┘
```

---

## 1. Feature: Actividad — timeline cronológico

### Definición

Una pantalla read-only que muestra la actividad reciente del vault (qué se ingestó, qué se editó, qué corrió el lint, qué documentos se importaron). Es la cara humana de `vault/_meta/log.md`, un append-only de operaciones.

### Sidebar

Agregar bajo **RUFINO**, después de "Pendientes":

```
RUFINO
  Inicio
  Notas
  Pendientes
  Actividad   ← nueva
  Personas
```

### Ruta

`/actividad`

### Layout

**Header:**
- Eyebrow `RUFINO` (mono accent)
- Título `Actividad` (serif 32px)
- Sub-paragraph: "Lo que pasó en el vault — ingests, ediciones, sesiones de Claude, importaciones."

**Filter row** (debajo del header, antes del timeline):
- Chips de filtro por tipo de operación: `Todas`, `Ingest`, `Edición`, `Borrado`, `Lint`, `Import`. La activa con `--accent-wash`.
- Search input a la derecha (placeholder: `Filtrar por título o nota…`).

**Timeline:**
- Lista vertical agrupada por día. Cada día tiene un sticky header pequeño con la fecha (`Jueves 27 abril`) en serif 18px ink-2.
- Cada entry es una fila: hora (mono 11px, ink-3, 70px de ancho fijo) + ícono del op (16px, color según tipo) + título de la entrada (serif 14.5px) + slug/path opcional (mono 11.5px ink-3) en una segunda línea.
- Hover: row gets `--surface-2` background.
- Click: si tiene un slug navegable (nota, persona, proyecto), navega a esa página.

### Iconos por op

- `ingest` → ⬇ (procesador procesó una nota cruda)
- `edit` → ✏
- `delete` → 🗑 (en color `--red`)
- `lint` → ✓ (en color `--green` si todo OK, ⚠ en `--amber` si encontró issues)
- `import` → 📄

### Estados

- **Empty:** "Todavía no hay actividad registrada. Va a aparecer acá cuando proceses notas o edites algo." en empty state con borde dasheado.
- **Loading:** skeleton de 5-6 filas grises animadas.
- **Filter sin resultados:** "Nada coincide con `<query>`."

### Sample data

```
Jueves 27 abril
17:42  ⬇  Procesado: 3 notas crudas         _index.md, oiko/general/nota-onboarding-002914.md
13:08  ✏   Edición: aprendizajeRsyncEmbedded   proyectos/rufino-dashboard/aprendizajes/
12:01  🗑  Borrado: nota-old-2912              movido a _trash/2026-04-27_12-01-32-841/
11:45  📄  Import: "Memex" by Vannevar Bush   sources/memex-bush.md → 4 conceptos nuevos

Miércoles 26 abril
22:00  ✓  Lint pass — 12 issues encontrados   _meta/lint-2026-04-26.md
…
```

---

## 2. Feature: Conceptos

### Definición

Páginas dedicadas a conceptos técnicos (ej. `embeddings`, `electron`, `next/font`, `RAG`). Hoy hay tags `concepto/<x>` en notas; los promovemos a páginas con definición + sources + relaciones.

**Promotion logic:** un concepto que aparece en N≥3 notas distintas se promueve automáticamente a página por el procesador (genera stub). Val también puede crear manualmente.

### Sidebar

En la sección **MEMORIA**, agregar después de "Proyectos":

```
MEMORIA
  Perfil
  Preferencias
  Stack
  Proyectos
  Conceptos   ← nuevo
```

### Ruta lista

`/memory/conceptos`

### Layout lista

Mismo patrón visual que `/memory/proyectos`:

- Eyebrow `MEMORIA` (mono accent)
- Título `Conceptos` (serif 32px)
- Sub-paragraph: "N conceptos detectados a través de tus notas."
- Search input + (opcional, futuro) "+ Nuevo concepto"
- **Lista en filas**, una por concepto. Cada fila:
  - Nombre del concepto en serif 17px (`embeddings`)
  - Alias entre paréntesis si hay (`embeddings (vector embeddings)`)
  - Definición one-line truncada (ink-2, max 1 línea, similar a blurb de proyectos)
  - Counter `N menciones` (serif numérico 16px + ink-3 "menciones")
  - Tiempo relativo de la última mención (`hace 3 días`)
  - Chevron al hover

### Ruta detalle

`/memory/concepto/[id]`

### Layout detalle

**Header:**
- Eyebrow `MEMORIA · CONCEPTO`
- Título serif 36px (`embeddings`)
- Aliases en italic serif 16px ink-2 si hay (`vector embeddings · semantic embeddings`)
- Definición en párrafo 14px ink-2, max 640px (la definición canónica que el procesador escribió)
- Meta row: "N menciones · primera vez `<fecha>` · última `<fecha>`"
- Botones de acción: Editar / Eliminar

**Sección "Sources" (`Menciones en notas`):**
- Lista en cards de las notas que mencionan este concepto, igual estructura que la sección "Notas" en `/memory/proyecto/[id]`
- Cada card: título de la nota + proyecto + fecha relativa
- Click navega a la nota

**Sección "Conexiones":** (esto se completa con triples — feature 4)
- Por ahora, espacio reservado / "Sin conexiones tipadas todavía."

**Editor (cuando entrás en modo edición):**
- Mismo patrón que `PersonEditor`: campos por sección (Definición, Aliases, Notas adicionales)
- "Sources" y "Conexiones" se mantienen como auto-managed tail (no editables)

### Estados

- **Empty list:** "Todavía no hay conceptos detectados. Aparecen automáticamente cuando 3+ notas distintas comparten un tag `concepto/X`."
- **Sin sources en detalle:** "Este concepto fue creado manualmente y todavía no fue mencionado en ninguna nota."

---

## 3. Feature: Salud del vault (Lint pass)

### Definición

Pantalla que muestra el resultado del último lint pass — health-check semanal del vault que detecta inconsistencias, deuda, y oportunidades. Output del lint vive en `vault/_meta/lint-<YYYY-MM-DD>.md`.

### Sidebar

Después de "Configuración", agregar:

```
─────────────
  Configuración
  Salud         ← nueva (con badge si hay issues)
  ☾ Tema oscuro
  ⚙ Ajustes
```

**Badge:** un círculo pequeño con número (ej. `12`) en `--amber` a la derecha del label "Salud" cuando hay issues abiertos. En `--red` si hay issues `severity: high`.

### Ruta

`/salud`

### Layout

**Header:**
- Eyebrow `SISTEMA`
- Título `Salud del vault` (serif 32px)
- Sub-paragraph: "Última corrida: `<fecha relativa>`. N issues encontrados."
- Botón secundario "Correr lint ahora" (gatilla un lint manual; durante la corrida muestra spinner inline)

**Resumen (stats quad):**
4 stat cards inline (mismo patrón que home page "Un vistazo"):
- Issues totales (número grande serif)
- Severity high (rojo)
- Severity medium (amber)
- Severity low (ink-3)

**Lista de issues:**
Agrupada por **tipo**, expandible. Cada grupo es un `<details>` que arranca abierto.

Tipos esperados:
- **Contradicciones** — dos notas dicen cosas que se chocan
- **Claims stale** — afirmaciones viejas que notas nuevas refutaron
- **Páginas huérfanas** — notas sin inbound links
- **Conceptos sin página** — `concepto/<x>` mencionado N+ veces sin entry en `conceptos/`
- **Personas no listadas** — nombres mencionados que no tienen entry en `_people/`
- **Cross-refs faltantes** — notas del mismo proyecto que deberían linkearse y no lo hacen
- **Frontmatter roto** — fechas inválidas, tags sin axis, etc.

Cada **issue** es un card:
- Severity dot (red/amber/ink-3) + título corto del issue
- Una línea de detalle en ink-2
- Una o dos referencias (links a las notas involucradas)
- Botones de acción contextuales según tipo:
  - "Crear página de concepto" → genera el stub directo y lo abre para editar
  - "Linkear estas dos notas" → agrega wikilink bidireccional
  - "Marcar como ignorado" → persiste en `_meta/lint-ignore.md` para no re-aparecer
  - "Ver notas" → expande in-place mostrando los snippets relevantes

### Estados

- **Sin lint pass corrida nunca:** "Todavía no se corrió ningún lint pass. El próximo es el domingo a las 22:00, o podés correr uno ahora."
- **Sin issues:** ilustración chiquita + "Tu vault está limpio. Próxima corrida en N días."
- **Mid-run (lint corriendo manual):** progress indicator + log streaming en mono.

### Iconos por severity

- High → ⚠ red
- Medium → ▲ amber
- Low → ● ink-3

---

## 4. Feature: Grafo y conexiones tipadas (Triples)

### Definición

Cada nota / persona / proyecto / concepto puede declarar relaciones tipadas con otras entidades del vault. Estas relaciones son **triples** (Subject → Relationship → Object), almacenadas en el frontmatter de las notas.

Vocabulario controlado de relaciones (`_meta/relationship-vocab.md`):

| Relación | Significado | Ejemplo |
|---|---|---|
| `depends-on` | El subject necesita el object | _decisionPricing depends-on decisionStack_ |
| `blocks` | El subject impide al object | _bugAuth blocks decisionShipBeta_ |
| `caused-by` | El subject fue desencadenado por el object | _refactorAPI caused-by aprendizajeBugLatencia_ |
| `led-to` | El subject desencadenó al object | _decisionElectron led-to aprendizajeNextStandalone_ |
| `references` | El subject menciona al object como source | _aprendizajeX references memoBush1945_ |
| `contradicts` | El subject contradice al object | _decisionV2 contradicts decisionV1_ |
| `refines` | El subject mejora/precisa al object | _decisionV2 refines decisionV1_ |
| `replaces` | El subject reemplaza al object | _decisionMongoDb replaces decisionPostgres_ |
| `decided-by` | (sólo decisiones) Quién la tomó | _decisionPricing decided-by alejo_ |
| `learned-in` | (sólo aprendizajes) En qué proyecto | _aprendizajeRsync learned-in rufino-dashboard_ |

### Storage en frontmatter

```yaml
triples:
  - { r: depends-on, o: decisionSupabaseAuth }
  - { r: led-to,     o: aprendizajeRsyncEmbedded }
  - { r: blocks,     o: decisionPricingV2 }
```

Subject implícito = la nota actual.

### Cambios en pantallas existentes

#### Detail pages (notas, personas, proyectos, conceptos)

Agregar **sección "Conexiones"** después de la sección original / blurb / antes de las secciones de listas (decisiones, aprendizajes, etc).

Layout de la sección:
- Eyebrow uppercase `CONEXIONES`
- Dos columnas:
  - **Salientes** — triples donde esta entidad es subject
  - **Entrantes** — triples donde esta entidad es object (computado al render)
- Cada relación es una fila con:
  - Tag chip pequeño con la relación tipo (`depends-on` color `--blue`, `blocks` color `--red`, `led-to` color `--green`, etc — colores semánticos por tipo)
  - Flecha → o ← según dirección
  - Link al target (nombre serif + tipo de entidad en ink-3)

#### Editor de cada entidad

Agregar nueva sección editable **"Conexiones"** en el editor (después de las secciones existentes, antes del "auto · no editable" tail).

UI:
- Lista de triples actuales, cada uno como una fila editable:
  - Dropdown de relación (vocabulario controlado, con su color semántico)
  - Autocomplete del object (busca en notas/personas/proyectos/conceptos del vault)
  - Botón × para borrar la relación
- Botón "+ Agregar conexión" al final que agrega una fila vacía

### Pantalla nueva: Grafo

#### Sidebar

En **MEMORIA**, después de "Conceptos":

```
MEMORIA
  Perfil
  Preferencias
  Stack
  Proyectos
  Conceptos
  Grafo       ← nuevo
```

#### Ruta

`/grafo`

#### Layout

**Header:**
- Eyebrow `MEMORIA · GRAFO`
- Título `Grafo` (serif 32px)
- Sub-paragraph: "Conexiones tipadas entre todas las entidades del vault. Click en un nodo para abrirlo."

**Filter bar:**
- Chips multi-selección de tipos de relación (cada una con su color)
- Chip de tipos de entidad: `Notas`, `Personas`, `Proyectos`, `Conceptos`
- Search input para focusear en una entidad y mostrar sólo su vecindario
- Toggle "Densidad: simple / completo"

**Canvas:**
- Render del grafo a pantalla completa (cytoscape.js o similar). Nodos circulares con:
  - Iniciales/abreviatura del nombre (igual que avatar de personas)
  - Color por tipo de entidad (notas: ink-2, personas: green, proyectos: accent, conceptos: blue)
  - Tamaño según degree (más conexiones = más grande)
- Edges con flechas direccionales y color por tipo de relación.
- Hover en un nodo: highlight de sus vecinos, los demás se desaturan.
- Click en un nodo: navega a su detail page.
- Drag para mover nodos (layout fuerza-dirigida que se acomoda).

**Sidebar derecha (cuando hover/click en un nodo):**
- Avatar/nombre + tipo de entidad
- Lista de salientes y entrantes (mismo patrón que la sección Conexiones de detail)
- Botón "Abrir página completa →"

### Estados

- **Vault con pocas relaciones (<10):** muestra el grafo igual pero con un banner arriba sugiriendo "Empezá agregando conexiones desde el editor de cualquier nota".
- **Sin relaciones:** ilustración + "Todavía no hay conexiones tipadas. Editá una nota y agregá una conexión para empezar."

---

## 5. Feature: Importar documento

### Definición

Drop un PDF / URL / texto markdown → el sistema lo lee, extrae las partes importantes, y crea/updatea notas, personas, conceptos, triples — siempre con un paso de **review** antes de aplicar.

Pipeline:
1. **Submit** — Val drag-drop / paste URL / paste texto
2. **Plan** — Claude lee el doc, propone qué crear y qué updatear, escribe el plan a `_meta/ingest-pending/<id>.md`
3. **Review** — Val ve el plan en la UI con diff/preview, ajusta o confirma
4. **Apply** — Claude ejecuta el plan, escribe los archivos, appendea al log

### Sidebar / acceso

Una entrada nueva en la sección **RUFINO** después de "Notas" (paralelo a la captura existente):

```
RUFINO
  Inicio
  Notas
  Importar      ← nuevo
  Pendientes
  Actividad
  Personas
```

### Ruta

`/import`

### Layout — Submit

**Header:**
- Eyebrow `RUFINO`
- Título `Importar documento` (serif 32px)
- Sub-paragraph: "Subí un PDF, una URL o pegá un markdown. Claude lo lee, propone qué notas crear, y vos confirmás antes de aplicar."

**Drop zone (centro de la pantalla):**
- Área grande con borde dasheado, padding 60px, color `--ink-3`. Texto centrado:
  - Ícono 32px arriba
  - "Arrastrá un archivo acá"
  - "o"
  - 3 botones inline: `Elegir archivo` / `Pegar URL` / `Pegar texto`
- Hover/dragover: borde sólido `--accent`, background `--accent-wash`.
- File types accepted: PDF, MD, TXT (y futuro: HTML, EPUB).

**Modal "Pegar URL":**
- Input para la URL
- Sub-text: "Voy a hacer fetch del HTML, lo limpio, y lo proceso como markdown."
- Botón `Importar`

**Modal "Pegar texto":**
- Textarea grande
- Sub-text: "Pegá markdown o texto plano. Si es un screenshot OCR'd, también funciona."
- Botón `Importar`

**Lista de imports recientes** debajo del drop zone:
- Cada uno con: ícono del tipo + título + estado (`pendiente review`, `aplicado`, `descartado`) + tiempo + acción (`Ver →`).
- Click en un import en `pendiente review` lleva a la pantalla de Review.

### Layout — Plan / Review

Cuando el procesamiento termina, redirige a `/import/<id>` (o queda en la misma vista mostrando el plan inline).

**Header:**
- Eyebrow `RUFINO · IMPORT`
- Título serif: el título del documento (ej. "Memex" by Vannevar Bush, 1945)
- Meta row: "Procesado hace 2 min · 4 conceptos nuevos · 2 entidades existentes referenciadas"
- Botones: `Cancelar` / `Aplicar todo` (primary, accent)

**Tabs (3):**

#### Tab "Crear" (default)

Lista de items que se van a crear, cada uno como card:
- Tipo (eyebrow): `NOTA`, `CONCEPTO`, `SOURCE` (la entrada del documento mismo)
- Path donde va a vivir: `rufino/sources/memex-bush.md` (mono ink-3)
- Preview del contenido (collapsed por default, expandible)
- Checkbox para incluir/excluir este item del apply

#### Tab "Updatear"

Items existentes que se van a updatear:
- Header con el nombre de la entidad y su path
- Diff inline: secciones que se agregan en verde, secciones que cambian con before/after side-by-side
- Checkbox para incluir/excluir

#### Tab "Conexiones"

Triples nuevos que se van a agregar:
- Tabla simple: Subject (con tipo) → Relationship → Object (con tipo)
- Color semántico por tipo de relación
- Checkbox por triple

### Estados durante el procesamiento

Cuando Claude está generando el plan (puede tardar 30-120s), mostrar:
- Spinner + "Procesando documento…"
- Log streaming en mono pequeño debajo (las líneas de status que Claude emite — "Leyendo PDF...", "Extrayendo conceptos...", "Cruzando con vault existente...")
- Botón `Cancelar` si quiere abortar

### Estados de error

- "El procesamiento falló: `<error message>`. Probá de nuevo o reportá si persiste."
- Mantener el archivo en `vault/inbox/sources/` para no perder el upload.

### Sample data del Plan

```
Tab "Crear" (5 items):
  □ NOTA → rufino/sources/memex-bush-1945.md
    Preview: Vannevar Bush (1945) — "As We May Think"
              Memex como prototipo de personal knowledge base.
              Asociaciones entre documentos como atom de información.
              [collapsed contents...]

  □ CONCEPTO → conceptos/memex.md
    Preview: Memex es una máquina conceptual propuesta por Vannevar Bush en 1945...

  □ CONCEPTO → conceptos/associative-trails.md
    Preview: Senderos asociativos entre documentos. Predecesor del wiki link...

Tab "Updatear" (2 items):
  □ rufinoOverview
    + Sección nueva "Antecedentes" con referencia al Memex
    + 1 wikilink agregado

  □ aprendizajeLlmWikiPatternGap
    + Bloque de citation de Memex como fuente del patrón

Tab "Conexiones" (4 triples):
  □ memex-bush-1945  references     vannevar-bush
  □ memex-bush-1945  led-to         associative-trails
  □ rufino           caused-by      memex (concepto)
  □ aprendizajeLlmWikiPatternGap   references   memex-bush-1945
```

---

## 6. Componentes shared nuevos

### `ReviewableChanges`

Patrón que aparece en (al menos) doc-import y eventualmente lint actions / triples bulk-add. Diseñar un componente reusable que:

- Recibe un "plan" estructurado: `{ create: Item[], update: Item[], triples: Triple[] }`
- Renderiza tabs por tipo de cambio
- Cada item tiene checkbox para incluir/excluir
- Footer con `Cancelar` y `Aplicar N items` (donde N es el count de incluidos)
- Soporta preview expandible y diff in-line

### Tag chips de relación tipada

Color por tipo (consistencia entre conexiones, grafo, plan de import):

| Relación | Color del chip |
|---|---|
| `depends-on` | `--blue` |
| `blocks` | `--red` |
| `caused-by` | `--ink-3` |
| `led-to` | `--green` |
| `references` | `--ink-2` |
| `contradicts` | `--red` |
| `refines` | `--accent` |
| `replaces` | `--amber` |
| `decided-by` | `--green` |
| `learned-in` | `--accent` |

Chip = pill `padding: 2px 8px`, `border-radius: 999px`, `font-size: 11px`, `background: <color> con 8-12% opacity`, `color: <color> sólido`.

### Skeleton states

Cuando algo carga (ingest plan, lint corriendo manual, grafo con muchos nodos):
- Skeleton rows: rectángulos grises animados con shimmer (un gradiente de `--surface-2` a `--hair-soft` y vuelta, 1.5s loop).
- Spinner: 16px círculo con stroke `--accent`, animación rotación 1s linear.

### Drop zone

Para drag-drop de archivos en `/import` (y futuro en otros lados):
- Estado idle: borde 2px dashed `--ink-dim`, padding 40-60px, texto centrado.
- Estado dragover: borde sólido `--accent`, background `--accent-wash`, scale slight.
- Estado uploading: progress bar lineal `--accent` arriba.

---

## 7. Cambios al sidebar (resumen)

```
┌── Rufino logo + nombre ──────┐
│ RUFINO                       │
│   Inicio                     │
│   Notas                      │
│   Importar         ← nuevo   │
│   Pendientes                 │
│   Actividad        ← nuevo   │
│   Personas                   │
│ MEMORIA                      │
│   Perfil                     │
│   Preferencias               │
│   Stack                      │
│   Proyectos                  │
│   Conceptos        ← nuevo   │
│   Grafo            ← nuevo   │
│ ─────────────                │
│   Configuración              │
│   Salud (badge)    ← nuevo   │
│   ☾ Tema oscuro              │
│   ⚙ Ajustes                  │
└──────────────────────────────┘
```

---

## 8. Coverage / mocks pedidos

Para cada feature, mockear al menos:
1. La pantalla principal (estado normal con datos realistas)
2. Estado vacío (sin datos)
3. Estado de error (cuando aplique — import, lint manual)

Para grafo + import, mockear también:
- Estado de carga (spinner + log streaming)
- Estado mid-flow (review tab del import con varios items checked/unchecked)

Para Conexiones (sección dentro de detail pages existentes):
- Mock de cómo se ve la sección nueva en `/memory/proyecto/[id]` con 5-6 conexiones mixtas
- Mock del editor inline de conexiones (autocomplete + dropdown abierto)

---

## 9. Constraints

- **Reusar tokens y componentes existentes** lo más posible. No introducir variables CSS nuevas a menos que sea inevitable.
- **Light + dark theme** para todas las pantallas nuevas.
- **No animations gratuitas** — sólo donde aporten (drop zone hover, skeleton shimmer, grafo force-direct, fade entre tabs).
- **Sin modales pesados** — preferir inline expansions, drawer panels, o nuevas rutas.
- **Idioma:** español neutro, mismo tono que el dashboard actual ("la última vez", "todavía no hay", "movido a papelera").
