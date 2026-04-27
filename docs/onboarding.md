# Onboarding — Rufino Dashboard (standalone Electron app)

Spec del flujo de onboarding la primera vez que el usuario abre la app. Sirve también como recovery flow si algo se rompe (vault movido, Claude Code desinstalado).

## Principios

- **Skippeable lo que ya esté OK.** Si Node y Claude Code ya están instalados, la pantalla los detecta y pasa de largo con un check verde — no exige interacción.
- **Re-entry inteligente.** Al startup, la app valida estado. Si todo OK, skip onboarding. Si algo falla (vault no existe, `which claude` falla), reabre el onboarding en el step que corresponde, no desde cero.
- **Persistencia.** Estado del onboarding en `app.getPath('userData')/config.json`:
  ```json
  {
    "onboardingCompleted": true,
    "vaultPath": "/Users/val/Files/vaultlentino",
    "lastValidated": "2026-04-27T00:00:00Z"
  }
  ```
- **Sin sudo, nunca.** No instalamos Node ni cosas de sistema. Para Node guiamos al sitio oficial. Para Claude Code corremos `npm install -g` (no requiere sudo si Node está bien instalado).
- **No bloqueamos al usuario por validaciones blandas.** Si la detección de Claude Code falla en el último paso, ofrecemos "Continuar igual" — el usuario verá el dashboard funcionando para ver/editar, solo el procesador de notas no anda hasta que esté instalado.
- **Comandos siempre con `execFile` o `spawn`, nunca `exec` con string.** Evita inyección y comportamientos raros con shell.

---

## Flujo (6 pantallas)

```
[1 Welcome] → [2 Vault] → [3 Node] → [4 Claude Code] → [5 Permisos] → [6 Listo]
```

Header común en todas las pantallas: indicador de progreso (1/6, 2/6...) y botón "Atrás" (deshabilitado en 1).

---

### Pantalla 1 — Welcome

**Goal:** explicar qué es Rufino en 10 segundos y arrancar el flujo.

**Layout:**
```
                       Rufino
        Tu segundo cerebro, sin fricción.

  Capturá notas, pendientes y personas. Rufino las
  procesa con Claude y las organiza por proyecto en
  tu vault de Obsidian. Vos seguís escribiendo —
  Rufino se encarga de archivar.

                  [ Empezar → ]
```

**Acciones:**
- "Empezar" → Pantalla 2.

**Estado:** sin estado, sin validación.

---

### Pantalla 2 — Vault

**Goal:** definir dónde se guardan las notas. Es la decisión más importante del onboarding.

**Layout:**
```
                  ¿Dónde está tu vault?

  Rufino lee y escribe notas en una carpeta de tu Mac
  (típicamente tu vault de Obsidian).

  [ Elegir carpeta existente ]
  [ Crear vault nuevo        ]

                          [ ← Atrás ]
```

**Branches:**

#### 2A. Elegir carpeta existente
- Abre `dialog.showOpenDialog` (folder picker, default `~/Documents/`).
- Validar: la carpeta existe y es escribible.
- Validar: existe `<carpeta>/rufino/` o subcarpeta razonable. Si no:
  ```
  Esta carpeta no parece tener un vault de Rufino.
  ¿Querés inicializarlo acá?

  Se crearán: rufino/, rufino/_index.md, rufino/_pendientes.md,
  rufino/_people.md y rufino/_people/.

  [ Inicializar acá ]   [ Elegir otra carpeta ]
  ```
- Al confirmar → guardar `vaultPath` en config → Pantalla 3.

#### 2B. Crear vault nuevo
- Folder picker para elegir dónde crear.
- Input: nombre del vault (default `mi-vault`).
- Crea estructura:
  ```
  <ubicación>/<nombre>/
    rufino/
      _index.md         (vacío con header)
      _pendientes.md    (tabla vacía)
      _people.md        (lista vacía)
      _people/          (carpeta vacía)
  ```
- Guardar `vaultPath` en config → Pantalla 3.

**Errores comunes:**
- Carpeta read-only → "No tengo permisos de escritura en esa carpeta. Elegí otra."
- Path con caracteres raros / iCloud Drive (puede traer issues con file watching) → warning soft, no bloqueante.

---

### Pantalla 3 — Node.js

**Goal:** asegurar que Node está disponible (precondición de Claude Code).

**Detección automática al cargar:**
```ts
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileP = promisify(execFile);

async function detectNode(): Promise<{ ok: boolean; version?: string }> {
  try {
    const { stdout } = await execFileP('node', ['--version']);
    const m = stdout.match(/^v(\d+)\./);
    const major = m ? parseInt(m[1], 10) : 0;
    return { ok: major >= 20, version: stdout.trim() };
  } catch {
    return { ok: false };
  }
}
```

**Si Node está OK** → skip a Pantalla 4 con un toast "Node detectado ✓" (1 seg).

**Si Node falta o es viejo:**
```
                  Necesitás Node.js

  Rufino usa Claude Code para procesar tus notas, y
  Claude Code corre sobre Node.js.

  No detecté Node.js en tu sistema (o es muy viejo).

  Recomendamos Node 20 o más nuevo.

  [ Abrir nodejs.org ]   [ Ya lo instalé, continuar ]

                          [ ← Atrás ]
```

**Acciones:**
- "Abrir nodejs.org" → `shell.openExternal('https://nodejs.org/')`. No avanza solo.
- "Ya lo instalé, continuar" → re-corre la detección. Si pasa, avanza. Si no:
  ```
  Sigo sin detectar Node.js. Reiniciá Rufino y probá de nuevo.

  [ Reintentar detección ]   [ Continuar igual ]
  ```
- "Continuar igual" → avanza pero loggea warning. Pantalla 4 va a fallar el auto-install de Claude Code.

---

### Pantalla 4 — Claude Code

**Goal:** asegurar que Claude Code esté instalado y autenticado.

**Detección automática al cargar:**
```ts
async function detectClaudeCode(): Promise<{ installed: boolean; path?: string }> {
  try {
    const { stdout } = await execFileP('which', ['claude']);
    const path = stdout.trim();
    return { installed: path.length > 0, path };
  } catch {
    return { installed: false };
  }
}
```

**Si Claude Code está instalado:**
```
              Claude Code detectado ✓

  Path: /usr/local/bin/claude

  Asegurate de estar logueado. Si todavía no lo
  hiciste, abrí tu terminal y corré:

      claude login

  (El login es interactivo y no se puede hacer desde
  Rufino — abrí Terminal una sola vez y listo.)

           [ Continuar ]   [ ← Atrás ]
```

**Si Claude Code NO está instalado:**
```
              Instalá Claude Code

  Rufino usa Claude Code para procesar tus notas:
  augmentation, organización por proyecto, detección
  de pendientes y personas.

  Puedo instalarlo por vos:

      npm install -g @anthropic-ai/claude-code

  [ Instalar ahora ]   [ Lo instalo yo ]

                          [ ← Atrás ]
```

**"Instalar ahora":**
- Spawn `npm` con `['install', '-g', '@anthropic-ai/claude-code']` (nunca como string concatenada).
- Estado: spinner + "Instalando Claude Code…"
- Streaming de stdout/stderr en una caja colapsada (debug-friendly).
- Al terminar:
  - Éxito → re-detectar → mostrar "Detectado ✓" → instrucción de `claude login` → "Continuar".
  - Error → mostrar el error + "Reintentar" + "Lo instalo yo".

**"Lo instalo yo":**
```
  Instalalo manualmente con:

      npm install -g @anthropic-ai/claude-code

  Después corré:

      claude login

  Cuando termines, hacé clic en "Detectar de nuevo".

  [ Detectar de nuevo ]   [ ← Atrás ]
```

**Edge case:** Node falta. El install falla. Mensaje claro: "Necesito Node.js primero. Volvé al paso anterior."

---

### Pantalla 5 — Permisos (condicional)

**Goal:** si el vault está en una ubicación que requiere Full Disk Access (fuera de `~/Documents`, `~/Desktop`, `~/Downloads`), guiar al usuario.

**Detección:** intentar leer un archivo del vault. Si tira `EACCES` o `EPERM`, mostrar la pantalla. Si lee OK, skippear.

**Si necesita permisos:**
```
              Permitile a Rufino leer tu vault

  Tu vault está en una carpeta protegida por macOS.
  Necesitás darle a Rufino "Acceso total al disco".

  1. Abrí Configuración del Sistema
  2. Privacidad y seguridad → Acceso total al disco
  3. Activá Rufino en la lista
  4. Volvé acá y tocá "Reintentar"

       [ Abrir Configuración ]   [ Reintentar ]

                          [ ← Atrás ]
```

**Acciones:**
- "Abrir Configuración" → `shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles')`.
- "Reintentar" → re-prueba lectura. Si OK → avanza. Si no → mantiene la pantalla.

**Skippear la pantalla si no aplica.**

---

### Pantalla 6 — Listo

**Goal:** confirmar que todo está en orden y dar el primer hint de uso.

**Layout:**
```
              Todo en orden 🪶

  Vault:        /Users/val/Files/vaultlentino
  Node.js:      v20.18.0 ✓
  Claude Code:  /usr/local/bin/claude ✓

  Tip: para captura rápida sin abrir Rufino, podés
  usar el menú de la barra (próximamente).

                [ Ir al dashboard → ]
```

**Acciones:**
- "Ir al dashboard" → marca `onboardingCompleted: true` en config → cierra window de onboarding → abre el dashboard principal.

---

## Estados transversales

### Cargando estado al startup

Cada vez que la app abre:
1. Lee `config.json`.
2. Si no existe → onboarding desde Pantalla 1.
3. Si existe pero `onboardingCompleted: false` → resume en el último step.
4. Si `onboardingCompleted: true` → corre validaciones rápidas:
   - `vaultPath` existe y es legible
   - `which claude` devuelve algo
   - `claude --version` no falla
5. Si alguna validación falla → reabrir onboarding en el step correspondiente con un banner: "Algo cambió desde la última vez. Confirmemos."

### Errores no recuperables

Si en cualquier pantalla pasa algo unexpected (filesystem corrupto, permisos imposibles), mostrar:
```
  Algo no anduvo. Mandame este error y lo arreglo.

  [error message + stack]

  [ Copiar al portapapeles ]   [ Reintentar ]
```

### Re-onboarding manual

En Settings de la app, botón "Re-correr onboarding" que borra el flag y arranca de cero. Útil para debug y para cuando el usuario cambia de vault.

---

## Implementación notes

- Onboarding es una **window separada** del dashboard, no un overlay. Cuando termina, se cierra y se abre la window principal.
- Tamaño: 640×720 fijo, no resizable.
- Tema: respeta `prefers-color-scheme` del sistema.
- Animaciones: fade entre pantallas, no slide. Keep it simple.
- Toda la copia en español.

## Files involucrados (futuros)

- `electron/onboarding/window.ts` — crea la BrowserWindow del onboarding
- `electron/onboarding/checks.ts` — detección de Node, Claude Code, permisos (siempre `execFile`/`spawn`, nunca `exec` con string)
- `electron/onboarding/install-claude-code.ts` — runner de `npm install -g`
- `electron/config.ts` — read/write de `config.json` en `userData`
- `app/onboarding/*` — UI de cada pantalla (puede ser Next.js routes dentro del mismo bundle, o React standalone — TBD)
