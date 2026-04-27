# Rufino Dashboard v0.2 — Plan de implementación

> Este doc es interno (para mí, no para Claude Design). Asume que el design spec [`design-spec-v0.2.md`](./design-spec-v0.2.md) ya fue mockeado por Claude Design y los HTML/JSX llegaron de vuelta. Documenta cómo voy a construir cada feature, en qué orden, qué archivos toca, y qué releases marca.

## Principios

- **Aditivo.** No refactor del código existente — sólo agregar pantallas nuevas y secciones nuevas en pantallas existentes. Lo que ya funciona no se toca.
- **Una feature = un release.** Cada feature termina en un `git tag vX.Y.Z` y un DMG nuevo. Releases incrementales para que Val pueda dar feedback temprano.
- **Branch protection on.** `main` requiere PR. Cada feature en su propio branch `feat/<short>` → PR → squash-merge → tag.
- **Soft-delete siempre.** Cualquier operación que retire algo del vault va a `_trash/<timestamp>/` (decisión existente).

## Dependencias entre features

```
F1 log.md  ───────────────┬──→ F3 lint
                          │
F2 conceptos ─────────────┴──→ F3 lint ──→ F5 ingest
                                  │
                          F4 triples ─────→ F5 ingest
```

- F1 (log) y F2 (conceptos) son independientes. Pueden ir en paralelo o en secuencia.
- F3 (lint) usa el log para reportar histórico y los conceptos para detectar páginas faltantes.
- F4 (triples) es ortogonal pero comparte aggregator con F3 y F5.
- F5 (ingest) genera contenido para todas las anteriores → va al final.

---

## F1 — `log.md` cronológico

**Branch:** `feat/log`
**Tag al mergear:** `v0.2.0`
**Tiempo estimado:** 1-2h
**Implementa secciones del spec:** §1 (Actividad)

### Schema

`vault/_meta/log.md` (creado lazy):

```markdown
# Vault activity log

## [2026-04-27 17:42] ingest | rufino/oiko/general/nota-onboarding-002914
Procesador detectó 3 notas nuevas. Augmentation completa.
ref: oiko/general/nota-onboarding-002914.md

## [2026-04-27 13:08] edit | proyectos/rufino-dashboard/aprendizajes/aprendizajeRsyncEmbedded
Editado vía dashboard (server action saveFileContent).

## [2026-04-27 12:01] delete | proyectos/old-stuff/nota-old-2912
Movido a _trash/2026-04-27_12-01-32-841/proyectos/old-stuff/nota-old-2912.md
```

### Cambios en código

**`lib/log.ts`** (nuevo)
```ts
export interface LogOp {
  op: "ingest" | "edit" | "delete" | "lint" | "import" | "remember";
  slug: string;            // "rufino/oiko/general/nota-X" o "_meta/lint-2026-04-27"
  summary?: string;        // opcional, 1-2 líneas
  ref?: string;            // path navegable opcional
}
export async function appendLogEntry(op: LogOp): Promise<void>;
export async function readLogEntries(opts?: { limit?: number; types?: string[] }): Promise<LogEntry[]>;
```

**Hooks de write:**
- `app/actions.ts → saveFileContent` → `appendLogEntry({ op: "edit", slug: relativePath })`
- `app/actions.ts → trashItem` → `appendLogEntry({ op: "delete", slug: relativePath, summary: <dest> })`
- `~/.claude/scripts/rufino-cron.sh` (procesador) — el prompt incluye instrucción de appendear al log al final del run
- `~/.claude/rules/common/obsidian-memory.md` (skill `/remember`) — agregar instrucción

**Pantalla `/actividad`:**
- `app/actividad/page.tsx` (Server Component, `export const dynamic = "force-dynamic"`)
- `components/actividad-timeline.tsx` (Client Component) — filtros + render
- Sidebar: agregar `{ label: "Actividad", href: "/actividad" }` en `rufinoNav` después de Pendientes

### Tests manuales antes de mergear

- Editar una nota → ver entry `edit` en `/actividad`
- Borrar una nota → ver entry `delete`
- Filtrar por tipo, search por slug

### PR title
`feat: chronological vault activity log`

---

## F2 — Concept pages

**Branch:** `feat/conceptos`
**Tag:** `v0.2.1`
**Tiempo:** 1 día
**Implementa:** §2 (Conceptos)

### Schema

`vault/conceptos/<concept>.md`:

```markdown
---
tags:
  - tipo/concepto
  - concepto/<id>
created: 2026-04-27
updated: 2026-04-27
aliases:
  - vector embeddings
  - semantic embeddings
mentions: 12
---

# embeddings

## Definición
Vectores densos que representan semántica de un texto/imagen…

## Sources
_(auto-managed por el procesador)_
- [[oiko/general/nota-001]] — 2026-04-13
- [[umbru/decisionBenchmarkV5Validacion]] — 2026-04-20
- …

## Notas adicionales
(editable por Val)
```

### Cambios en código

**`lib/concepts.ts`** (nuevo) — paralelo a `lib/projects.ts`
```ts
export interface ConceptSummary {
  id: string;
  name: string;
  aliases: string[];
  definition: string;     // primera línea del body
  mentions: number;
  lastMention: string | null;
}
export interface ConceptDetail extends ConceptSummary {
  body: string;
  sources: { id: string; title: string; date: string }[];
  // future: triples
}
export async function listConcepts(): Promise<ConceptSummary[]>;
export async function readConcept(id: string): Promise<ConceptDetail | null>;
```

**Procesador (`~/.claude/prompts/rufino-daily.md`):**
- Agregar lógica de promotion: cuando un tag `concepto/<x>` aparece en N≥3 notas distintas, crear stub.
- Cada augmentation que mencione un concepto existente updatea la sección "Sources" del concept page.

**Pantallas:**
- `app/memory/conceptos/page.tsx` — usa `<ProjectsList>` reusable (ya está parametrizado con `hrefBase`) → `hrefBase="/memory/concepto/"`. Probable rename del componente a `<EntityList>`.
- `app/memory/concepto/[id]/page.tsx` — paralelo a `proyecto/[id]`. Usa `<EntityDetail>` o lo replicamos.
- Editor: `components/concept-editor.tsx` — copiar `PersonEditor`, ajustar campos (Definición / Aliases / Notas adicionales editables; Sources read-only tail).
- Sidebar: agregar `{ label: "Conceptos", href: "/memory/conceptos" }` en `memoryNav`.

### Refactor oportunista (opcional)

Si `<ProjectsList>` y `<PersonEditor>` están demasiado acoplados a su entidad, generalizarlos a `<EntityList>` y `<EntityEditor>` con strategy pattern. **No bloquear** F2 por esto; si el copy-paste resulta menos agresivo, hacerlo así primero y refactorizar en F4.

### PR title
`feat: concept pages with auto-promotion from tags`

---

## F3 — Lint pass + Salud del vault

**Branch:** `feat/lint`
**Tag:** `v0.3.0`
**Tiempo:** 1-2 días
**Implementa:** §3 (Salud del vault)

### Schema

**Output:** `vault/_meta/lint-<YYYY-MM-DD>.md` — un archivo por corrida. El más reciente es la "Salud actual".

```yaml
---
ran_at: 2026-04-27T22:00:00Z
duration_ms: 12480
issues_total: 12
severity_high: 1
severity_medium: 5
severity_low: 6
---

## Issues

### contradicción [high]
- type: contradiction
- notes:
  - rufino/decisionPriceV1 (claim: $X)
  - rufino/decisionPriceV2 (claim: $Y)
- detail: Decisión V1 dice precio X, V2 dice Y, no hay nota de change.
- actions: [link, ignore]

### orphan [low]
- type: orphan
- note: proyectos/old/aprendizaje-x
- detail: Sin inbound wikilinks desde hace 60+ días.
- actions: [delete, ignore]

### concept-without-page [medium]
- type: concept_without_page
- concept: embeddings
- mentions: 8
- actions: [create_concept_page, ignore]

…
```

**Ignored issues:** `vault/_meta/lint-ignore.md` — append-only de issues marcados como `ignore` para no re-aparecer.

### Cambios en código

**Prompt:** `~/.claude/prompts/rufino-lint.md` — instrucciones detalladas para Claude Code de qué chequear y cómo formatear el output.

**Cron:** Agregar entry a `~/.claude/scripts/rufino-cron.sh` (o un script gemelo `rufino-lint-cron.sh`) — domingos 22:00.

**Lib:** `lib/lint.ts`
```ts
export interface LintIssue {
  id: string;
  type: "contradiction" | "stale" | "orphan" | "concept_without_page" | "person_unlisted" | "missing_xref" | "frontmatter";
  severity: "high" | "medium" | "low";
  detail: string;
  refs: string[];      // paths a las notas involucradas
  actions: string[];
}
export async function readLatestLint(): Promise<LintReport | null>;
export async function listLintRuns(): Promise<{ date: string; issues: number }[]>;
```

**Server actions:**
- `runLintNow()` — gatilla `claude --print` con el prompt de lint, devuelve el `<id>` de la corrida en curso. Streaming via SSE.
- `applyLintAction({ issueId, action })` — ejecuta una de las acciones contextuales. Las opciones canónicas:
  - `create_concept_page` → genera stub
  - `link_notes` → agrega wikilink bidireccional
  - `ignore` → mueve a lint-ignore
  - `delete_note` → trash

**Pantalla `/salud`:**
- `app/salud/page.tsx` (server component, lee `readLatestLint()`)
- `components/salud-issues.tsx` (client component) — render de cards agrupadas, botones de action.
- Sidebar: agregar después de Configuración con badge dinámico (`fetchLintStats()` → count).

**Streaming UI** durante `Run lint now`:
- Reusar el patrón de `install:claude:log` del onboarding (el componente que escucha eventos IPC y los renderiza en mono).

### PR title
`feat: weekly vault lint pass + actionable health screen`

---

## F4 — Triples + Conexiones + Grafo

**Branch:** `feat/triples`
**Tag:** `v0.4.0`
**Tiempo:** 3-4 días
**Implementa:** §4 (Grafo y conexiones tipadas)

### Schema

**En frontmatter de cualquier nota / persona / proyecto / concepto:**
```yaml
triples:
  - { r: depends-on, o: decisionSupabaseAuth }
  - { r: led-to,     o: aprendizajeRsyncEmbedded }
```

Subject implícito = la entidad cuyo archivo es. Resolver `o` → buscar primero en `rufino/<id>.md`, después en `_people/<id>.md`, después `proyectos/<id>/overview.md`, después `conceptos/<id>.md`. Si no se encuentra → warning en lint.

**Vocabulario:** `vault/_meta/relationship-vocab.md` — fuente de verdad de los 10 tipos canónicos. El editor del dashboard lee de ahí.

**Aggregator cache:** `vault/_meta/graph.json` — rebuilt por el procesador o lazy via dashboard. Forma:
```json
{
  "version": 1,
  "built_at": "2026-04-27T17:42Z",
  "nodes": [
    { "id": "decisionSupabaseAuth", "type": "decision", "name": "Supabase auth", "project": "umbru" },
    …
  ],
  "edges": [
    { "s": "umbruDecisionPricing", "r": "depends-on", "o": "decisionSupabaseAuth" },
    …
  ]
}
```

### Cambios en código

**Lib:** `lib/triples.ts`
```ts
export type RelationKind = "depends-on" | "blocks" | "caused-by" | "led-to" | "references"
  | "contradicts" | "refines" | "replaces" | "decided-by" | "learned-in";
export interface Triple { s: string; r: RelationKind; o: string; }
export async function readGraph(): Promise<{ nodes: Node[]; edges: Triple[] }>;
export async function buildGraphCache(): Promise<void>;
export async function addTriple(filePath: string, triple: Triple): Promise<void>;
export async function removeTriple(filePath: string, triple: Triple): Promise<void>;
export async function connectionsFor(entityId: string): Promise<{ outgoing: Triple[]; incoming: Triple[] }>;
```

**Editores existentes** (notas, personas, proyectos, conceptos): agregar sección "Conexiones" antes del "auto · no editable" tail. Componente nuevo `<ConnectionsEditor>` con autocomplete de objetos + dropdown de relaciones.

**Detail pages existentes:** agregar sección "Conexiones" entre header y secciones de listas. Componente `<ConnectionsView>`.

**Pantalla nueva `/grafo`:**
- `app/grafo/page.tsx` — server-render fetcheando el graph cache.
- `components/graph-canvas.tsx` (client) — usa `cytoscape.js` (o `react-flow`). Decisión preliminar: cytoscape porque tiene mejor soporte para grafos grandes y layouts force-directed.

**Bundle impact:** cytoscape es ~200kb gz. Bundle Electron pasa de ~280MB a ~310MB. Aceptable.

**Procesador:**
- Al augmentar una nota, infiere triples obvios (`led-to` cuando el body dice "esto causó que…", `depends-on` cuando referencia explícita). Inicialmente conservador — sólo agregar triples donde el texto sea inequívoco. Val edita manualmente el resto.

### Migración de datos existentes

No hay migración necesaria — vault arranca sin triples, Val los va agregando a medida que edita o el procesador los detecta. Notas viejas pueden quedarse sin triples y eso está OK.

### PR title
`feat: typed relationships (triples) + graph view`

---

## F5 — Importar documento

**Branch:** `feat/import`
**Tag:** `v0.5.0`
**Tiempo:** 3-4 días
**Implementa:** §5 (Importar documento)

### Schema

**Inbox:** `vault/inbox/sources/<timestamp>-<slug>.<ext>` — el archivo crudo, inmutable.

**Plan pendiente:** `vault/_meta/ingest-pending/<id>.md` — JSON-frontmatter con la propuesta:
```yaml
---
id: imp-2026-04-27_18-30-12
source: vault/inbox/sources/2026-04-27_18-30-12-memex-bush.pdf
status: pending  # pending | applied | discarded
title: "As We May Think"
author: Vannevar Bush
year: 1945
created_at: 2026-04-27T18:30:42Z
plan:
  create:
    - { type: source, path: "rufino/sources/memex-bush-1945.md", body: "…" }
    - { type: concept, id: "memex", body: "…" }
  update:
    - { path: "proyectos/rufino/overview.md", patches: [...] }
  triples:
    - { s: "memex-bush-1945", r: "led-to", o: "memex" }
---
```

**Source pages:** `vault/rufino/sources/<slug>.md` — donde viven las notas creadas a partir de docs externos. Frontmatter incluye `source: <inbox path>`, `author`, `year`.

### Cambios en código

**Server actions:**
- `submitImport({ kind: "file" | "url" | "text", payload })` → guarda el archivo en inbox, gatilla `claude --print` con el prompt de ingest, escribe el plan a `_meta/ingest-pending/<id>.md`, devuelve el `<id>` con streaming events.
- `applyImport(id, selectedItems)` → lee el plan, ejecuta los items seleccionados, mueve el plan a `applied`, appendea al log.
- `discardImport(id)` → mueve a `discarded`, deja el archivo en inbox por si Val quiere re-procesar.

**Prompt:** `~/.claude/prompts/rufino-ingest-document.md` — instrucciones detalladas:
1. Leer el doc completo
2. Listar `rufino/_index.md`, `_people.md`, listar `conceptos/` y `proyectos/`
3. Extraer takeaways, conceptos, personas mencionadas
4. Cruzar con entidades existentes (no duplicar)
5. Generar plan estructurado y escribirlo a la ruta dada

**Pantallas:**
- `app/import/page.tsx` — submit screen con drop zone, paste URL, paste text. También lista los pendings.
- `app/import/[id]/page.tsx` — review screen con tabs Crear / Updatear / Conexiones, checkboxes, botón Aplicar.
- `components/drop-zone.tsx`
- `components/reviewable-changes.tsx` — el componente shared que también se usará en lint actions (futuro).
- `components/ingest-progress.tsx` — streaming log durante el procesamiento.

**Sidebar:** agregar `{ label: "Importar", href: "/import" }` en `rufinoNav` después de Notas.

**File handling:**
- Para PDFs: extraer texto antes de pasar a Claude. Lib: `pdf-parse` (Node, ~50kb gz).
- Para URLs: fetch + readability extraction. Lib: `@mozilla/readability` (50kb gz).
- Para markdown/text: pasarlo directo.

**Bundle impact:** +100kb por pdf-parse + readability. Total ~310MB+→~315MB.

### Tests críticos

- PDF de 50 páginas con conceptos mixtos → plan razonable
- URL de un blog post → plan que incluye al autor como persona si está identificable
- Markdown corto (un párrafo) → plan minimalista (sólo source page, sin conceptos nuevos)

### PR title
`feat: document ingestion with reviewable plans`

---

## Cronograma sugerido

| Sprint | Features | Output |
|---|---|---|
| Sprint 1 (1-2h)  | F1 log.md | v0.2.0 |
| Sprint 2 (1 día) | F2 conceptos | v0.2.1 |
| Sprint 3 (1-2 días) | F3 lint | v0.3.0 |
| Sprint 4 (3-4 días) | F4 triples | v0.4.0 |
| Sprint 5 (3-4 días) | F5 import | v0.5.0 |

**Total:** ~10-12 días de trabajo. No tiene que ser consecutivo — cada sprint cierra con release shipping en GitHub y Val puede usarlo. F5 es el más ambicioso y se beneficia de los 4 anteriores existentes.

## Riesgos

1. **Cytoscape performance** con vaults grandes (>500 entidades). Mitigación: clustering automático, lazy-load del canvas, paginación si hace falta.
2. **Lint false positives**. Mitigación: empezar conservador (sólo issues de alta confianza), expandir el prompt según feedback.
3. **Ingest plan accuracy**. Mitigación: el step de review es obligatorio; Val siempre confirma antes de apply.
4. **Bundle size creep**. Mitigación: medir después de cada feature, considerar code-splitting si pasa de 350MB.

## Cuando arrancamos

Una vez Claude Design devuelva los mockups, voy a:
1. Crear `feat/log` branch
2. Implementar F1 según el spec
3. Abrir PR contra main, mergear, tagear v0.2.0, esperar CI
4. Repetir para F2, F3, F4, F5

Cada feature merge → tag → release lleva ~10 minutos de cleanup post-CI (promote draft, etc — automatizable más adelante).
