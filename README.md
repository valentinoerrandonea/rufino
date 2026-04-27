# Rufino

Tu segundo cerebro, sin fricción.

App standalone para macOS que captura notas, pendientes y personas, y las procesa con Claude Code para organizarlas por proyecto en tu vault de Obsidian.

## Instalación (usuarios)

> **Heads up:** Rufino no está firmada todavía. macOS te va a mostrar un warning de Gatekeeper la primera vez. No es malware — es porque no pago la membresía de Apple Developer todavía.

1. Bajá el `.dmg` más reciente de [Releases](https://github.com/valentinoerrandonea/rufino/releases).
2. Abrí el `.dmg`, arrastrá Rufino a `Applications`.
3. Abrí la app. Va a aparecer **"no se puede abrir porque Apple no puede verificar el desarrollador"**. Tocá **Cancelar**.
4. Configuración del Sistema → Privacidad y seguridad → bajá hasta encontrar "Se bloqueó Rufino…" → **Abrir igual**.
5. La próxima vez se abre normal.

### Pre-requisitos

Rufino procesa notas con Claude Code. Si no lo tenés instalado, el onboarding te ayuda:

- **Node.js** ≥ 20 (rufino te dirige a [nodejs.org](https://nodejs.org/) si falta).
- **Claude Code** — la app puede instalarlo por vos vía `npm install -g @anthropic-ai/claude-code`. Después corré `claude login` en una Terminal una sola vez.

## Lo que hace al instalarse

El primer arranque ejecuta el onboarding (6 pantallas):

1. **Welcome.**
2. **Vault** — pickeás carpeta existente o creás una nueva. Se inicializa la estructura `rufino/` con `_index.md`, `_pendientes.md`, `_people.md`.
3. **Node.js** — detecta versión; si falta, te lleva a nodejs.org.
4. **Claude Code** — detecta `which claude`; si falta, ofrece `npm install -g @anthropic-ai/claude-code` con log streaming.
5. **Permisos** — si el vault está fuera de `~/Documents`, te guía a Configuración → Privacidad → Acceso total al disco.
6. **Listo** — guarda la config en `~/Library/Application Support/Rufino/config.json`, copia las reglas y prompts de Claude a `~/.claude/`, y registra un cron diario (22:00) que procesa notas nuevas con Claude.

## Desarrollo

```bash
git clone https://github.com/valentinoerrandonea/rufino.git
cd rufino
npm install

# Dashboard solo (Next.js dev, http://localhost:3000)
npm run dev

# Electron app (build Next.js + electron)
npm run build
npm run electron:dev

# Build .dmg local
npm run electron:dist
# → release/Rufino-0.x.x-arm64.dmg
```

## Releases

Los releases se cortan via tag:

```bash
git tag v0.1.0
git push --tags
```

GitHub Actions buildea en `macos-latest` y publica `.dmg` + `.zip` + `latest-mac.yml` a GitHub Releases. Sin signing.

## Stack

- **Renderer:** Next.js 16 App Router (Server Components + Server Actions, lee/escribe filesystem directo al vault)
- **Shell:** Electron 33 (main process spawn `next start` standalone en puerto random)
- **Bundler:** electron-builder
- **Distribución:** GitHub Releases

## Estructura

```
electron/                    Main + preload (TypeScript → dist-electron/)
app/                         Next.js renderer
  onboarding/                6-screen first-run flow
components/onboarding/       Onboarding UI
lib/                         Vault read/write, electron-api bridge
resources/claude-config/     Bundled rules/prompts/scripts copiados a ~/.claude
assets/                      .icns icon, source SVG
```

---
Hecho con 🪶 por [@valentinoerrandonea](https://github.com/valentinoerrandonea).
