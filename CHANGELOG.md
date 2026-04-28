# Changelog

Registro de cambios del Rufino Dashboard. Cada versión cuelga del tag `vX.Y.Z` correspondiente.

Formato basado en [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Sigue [SemVer](https://semver.org/lang/es/).

## [Unreleased]

## [v0.4.3] — 2026-04-28

### Added
- **Pendientes con title + description**: el campo único `desc` se separa en `title` (claro, corto, conciso) y `description` (opcional, expandible). Si Val solo escribe título, el processor (Haiku, 25s timeout) auto-completa una descripción de 1-3 oraciones en español rioplatense (PR #19).
- **CHANGELOG.md**: este archivo. Histórico de cambios versión a versión.

### Changed
- **Prompt `rufino-process-single.md` enriquecido para concepts**: scope `conceptos/*.md` cambia de `NONE` a `CONCEPT-LIGHT`. El Step 7 ahora exige definiciones de 200-400 palabras en 3 párrafos (WHAT/WHY/HOW), `[[wikilinks]]` cross-reference inline, sección `## Aparece en` con bullets reales, y `triples:` typed en frontmatter. Idempotency rule añadida (skip si def ≥600 chars + ≥2 triples). Sincronizado entre `~/.claude/prompts/` (canónico), `resources/claude-config/prompts/` (bundle del .dmg) y `claude-code-power-setup/configs/prompts/` (público). Resultado: 22 concepts re-procesados; avg def 250 → 1716 chars, triples por archivo 0 → 4.

## [v0.4.2] — 2026-04-28

### Fixed
- **Notas queued/processing visibles en `/notes`**: `readProcessedNotes()` ya no filtra por `status === "processed"` exclusivamente. Ahora incluye `queued` y `processing` con badge visible, así Val ve sus notas inmediatamente al guardar (sin esperar al processor) (PR #17).

## [v0.4.1] — 2026-04-27

### Fixed
- **Detalle de decisiones/aprendizajes clickeable** en `/memory/proyecto/[id]`: PR #15 corrige el routing duplicado donde el sidebar apuntaba a `/memory/proyecto/[id]` pero los fixes anteriores se aplicaron a `/projects/[id]`. Source-of-truth: el sidebar.
- **Pendientes agrupados 2-level** (proyecto → arista → items): la vista de pendientes ahora agrupa correctamente con `buildProjectGroups()`, exportado por Worker B y wired en la página de detalle (PR #15).

## [v0.4.0] — 2026-04-27

Release multi-feature ejecutado vía orquestación multi-agente (5 worktrees paralelos).

### Added
- **9 features de UX, datos y visuales** (PR #14):
  - Editor estructurado de notas con campos tipados
  - Filtros compactos single-line en `/notes`
  - Página `/notes` con grouping por proyecto
  - Pendientes editables + grid 2-col en dashboard
  - App Electron standalone con onboarding wired
  - Bundle de Next.js standalone via `extraResources` (app.asar más liviano)
  - Drag region full-width + corners transparentes en icono + Next.js como `utilityProcess`
  - CI: drop x64 build target (solo arm64)
  - Editable note titles, structured person editor, delete buttons, projects redesign

## [v0.3.2] — 2026-04-26

### Fixed
- **PDF parsing** migrado de `pdf-parse` a `unpdf` para resolver `DOMMatrix is not defined` en Node 24 / Next.js 16 serverless (PR #12).

## [v0.3.1] — 2026-04-26

### Added
- **PDF import support**: el dashboard ahora acepta PDFs en `/import` y los procesa via Claude (PR #10).

### Fixed
- **Processor usa `mv` no `cp`**: las notas inbox se mueven a `rufino/<project>/<type>/`, no se duplican. No más redirect stubs en inbox (PR #9).

## [v0.3.0] — 2026-04-26

### Added
- **Real-time async processing on save**: cada save/import/edit dispara el processor en background (Claude `-p` detached spawn). Badge `procesando` visible en la UI mientras corre. Daily cron sigue como fallback (PR #7).

## [v0.2.0] — 2026-04-25

### Added
- **Document ingestion con reviewable plans** (`/import` + `/import/[id]`): pipeline para subir documentos externos (PDFs, markdown, text) y revisar el plan de procesamiento antes de aplicarlo (PR #5).
- **Typed relationships (triples)**: vocabulario controlado de 10 relaciones (`depends-on`, `blocks`, `caused-by`, `led-to`, `references`, `contradicts`, `refines`, `replaces`, `decided-by`, `learned-in`) en frontmatter. Sección "Conexiones" en detail pages + `/grafo` con SVG force-directed Obsidian-style (PR #4).
- **Lint pass semanal + `/salud` screen**: cron domingo 03:00 corre lint del vault, escribe `_meta/lint-<fecha>.json`, dashboard muestra issues actionables (PR #3).
- **Concept pages**: listado en `/memory/conceptos` + detail con menciones auto-descubiertas (PR #2).
- **Activity log cronológico** + `/actividad` timeline: vault activity log que se appendea por cada save/edit/processed/import (PR #1).

## [v0.1.x]

### Added
- App Electron standalone + onboarding wired a real IPC
- Bundle Next.js standalone (slim `app.asar`)
- Capture forms + queue inicial
- File system as database — sin DB ni API layer separado
- Status state machine: `queued → processing → processed`

[Unreleased]: https://github.com/valentinoerrandonea/rufino/compare/v0.4.3...HEAD
[v0.4.3]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.4.3
[v0.4.2]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.4.2
[v0.4.1]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.4.1
[v0.4.0]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.4.0
[v0.3.2]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.3.2
[v0.3.1]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.3.1
[v0.3.0]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.3.0
[v0.2.0]: https://github.com/valentinoerrandonea/rufino/releases/tag/v0.2.0
