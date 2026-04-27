import { BrowserWindow, app, ipcMain, dialog, shell, nativeTheme } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, access, copyFile, readdir } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { homedir } from "node:os";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);

// ──────────────────────────────────────────
// Config — userData/config.json
// ──────────────────────────────────────────
type Config = {
  onboardingCompleted: boolean;
  vaultPath: string | null;
  lastValidated: string | null;
};

const defaultConfig: Config = {
  onboardingCompleted: false,
  vaultPath: null,
  lastValidated: null,
};

let configCache: Config | null = null;

function configPath(): string {
  return join(app.getPath("userData"), "config.json");
}

async function readConfig(): Promise<Config> {
  if (configCache) return configCache;
  try {
    const raw = await readFile(configPath(), "utf8");
    configCache = { ...defaultConfig, ...JSON.parse(raw) };
  } catch {
    configCache = { ...defaultConfig };
  }
  return configCache!;
}

async function writeConfig(patch: Partial<Config>): Promise<Config> {
  const current = await readConfig();
  const next = { ...current, ...patch };
  await mkdir(dirname(configPath()), { recursive: true });
  await writeFile(configPath(), JSON.stringify(next, null, 2));
  configCache = next;
  return next;
}

// ──────────────────────────────────────────
// Next.js standalone server lifecycle
// ──────────────────────────────────────────
let nextProcess: ChildProcess | null = null;
let nextPort: number | null = null;

function findFreePort(): Promise<number> {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", rej);
    srv.listen(0, () => {
      const addr = srv.address();
      if (addr && typeof addr === "object") {
        const port = addr.port;
        srv.close(() => res(port));
      } else {
        rej(new Error("could not get port"));
      }
    });
  });
}

function nextStandaloneRoot(): string {
  // In dev (electron .) we run from project root with .next/ at the root.
  // In packaged app, app.asar contains .next/standalone.
  if (app.isPackaged) {
    return join(process.resourcesPath, "app.asar.unpacked", ".next", "standalone");
  }
  return join(app.getAppPath(), ".next", "standalone");
}

async function startNext(): Promise<string> {
  const port = await findFreePort();
  nextPort = port;
  const standaloneRoot = nextStandaloneRoot();
  const serverFile = join(standaloneRoot, "server.js");

  if (!existsSync(serverFile)) {
    throw new Error(
      `Next.js standalone server not found at ${serverFile}. Run \`npm run build\` first.`,
    );
  }

  // Resolve vault path from config (env var read by server actions / vault.ts)
  const cfg = await readConfig();
  const vaultPath = cfg.vaultPath ?? join(homedir(), "Files/vaultlentino");

  nextProcess = spawn(process.execPath, [serverFile], {
    cwd: standaloneRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      RUFINO_VAULT_PATH: vaultPath,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  nextProcess.stdout?.on("data", (d) => {
    process.stdout.write(`[next] ${d}`);
  });
  nextProcess.stderr?.on("data", (d) => {
    process.stderr.write(`[next] ${d}`);
  });
  nextProcess.on("exit", (code, sig) => {
    console.log(`[next] exited code=${code} sig=${sig}`);
    nextProcess = null;
  });

  // Wait for server to respond
  const url = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (r.ok || r.status < 500) return url;
    } catch {
      /* not ready */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Next.js server did not become ready in 30s");
}

function stopNext() {
  if (nextProcess && !nextProcess.killed) {
    try {
      nextProcess.kill("SIGTERM");
    } catch (e) {
      console.error("error killing next process", e);
    }
  }
  nextProcess = null;
}

// ──────────────────────────────────────────
// Window
// ──────────────────────────────────────────
let win: BrowserWindow | null = null;

async function createWindow(initialUrl: string) {
  win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1e1c1a" : "#f7f4ee",
    title: "Rufino",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 16 },
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // First-run routing: if onboarding incomplete, force /onboarding
  const cfg = await readConfig();
  const path = cfg.onboardingCompleted ? "/" : "/onboarding";
  win.loadURL(`${initialUrl}${path}`);

  win.on("closed", () => {
    win = null;
  });
}

// ──────────────────────────────────────────
// Bundled claude-config installer
// ──────────────────────────────────────────
function bundledClaudeConfigDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, "claude-config");
  }
  return join(app.getAppPath(), "resources", "claude-config");
}

async function installClaudeConfig(): Promise<{
  installed: string[];
  skipped: string[];
}> {
  const src = bundledClaudeConfigDir();
  const installed: string[] = [];
  const skipped: string[] = [];

  const cfg = await readConfig();
  const vaultPath = cfg.vaultPath ?? join(homedir(), "Documents", "vault");

  const map: { from: string; to: string; template?: boolean; exec?: boolean }[] = [
    {
      from: "rules/rufino.md",
      to: ".claude/rules/common/rufino.md",
      template: true,
    },
    {
      from: "rules/obsidian-memory.md",
      to: ".claude/rules/common/obsidian-memory.md",
      template: true,
    },
    { from: "prompts/rufino-daily.md", to: ".claude/prompts/rufino-daily.md" },
    {
      from: "scripts/rufino-cron.sh",
      to: ".claude/scripts/rufino-cron.sh",
      exec: true,
    },
  ];

  const { chmod } = await import("node:fs/promises");

  for (const entry of map) {
    const srcFile = join(src, entry.from);
    const dstFile = join(homedir(), entry.to);
    try {
      await access(dstFile);
      skipped.push(entry.to);
      continue;
    } catch {
      /* missing, will install */
    }
    if (!existsSync(srcFile)) {
      console.warn(`bundled claude config missing source: ${srcFile}`);
      continue;
    }
    await mkdir(dirname(dstFile), { recursive: true });
    if (entry.template) {
      const raw = await readFile(srcFile, "utf8");
      const out = raw.replaceAll("__VAULT_PATH__", vaultPath);
      await writeFile(dstFile, out);
    } else {
      await copyFile(srcFile, dstFile);
    }
    if (entry.exec) await chmod(dstFile, 0o755);
    installed.push(entry.to);
  }
  return { installed, skipped };
}

async function installCronEntry(): Promise<{ added: boolean; reason?: string }> {
  const cronScript = join(homedir(), ".claude/scripts/rufino-cron.sh");
  try {
    await access(cronScript);
  } catch {
    return { added: false, reason: "rufino-cron.sh not installed" };
  }
  // Check existing crontab
  try {
    const { stdout: existing } = await execFile("crontab", ["-l"]);
    if (existing.includes(cronScript)) {
      return { added: false, reason: "already present" };
    }
    const newCrontab = existing.trimEnd() + `\n0 22 * * * ${cronScript}\n`;
    await writeTempCrontab(newCrontab);
  } catch (e) {
    // No crontab yet
    await writeTempCrontab(`0 22 * * * ${cronScript}\n`);
  }
  return { added: true };
}

async function writeTempCrontab(content: string): Promise<void> {
  const tmp = join(app.getPath("temp"), `rufino-crontab-${Date.now()}.txt`);
  await writeFile(tmp, content);
  await execFile("crontab", [tmp]);
}

// ──────────────────────────────────────────
// IPC handlers
// ──────────────────────────────────────────
function registerIpc() {
  ipcMain.handle("config:get", () => readConfig());
  ipcMain.handle("config:set", (_e, patch: Partial<Config>) => writeConfig(patch));

  ipcMain.handle("detect:node", async () => {
    try {
      const { stdout } = await execFile("node", ["--version"]);
      const match = stdout.trim().match(/^v(\d+)\./);
      const major = match ? parseInt(match[1], 10) : 0;
      return { ok: major >= 18, version: stdout.trim(), major };
    } catch {
      return { ok: false, version: null, major: 0 };
    }
  });

  ipcMain.handle("detect:claude", async () => {
    try {
      const { stdout } = await execFile("which", ["claude"]);
      const path = stdout.trim();
      if (!path) return { ok: false, path: null };
      try {
        const { stdout: ver } = await execFile(path, ["--version"]);
        return { ok: true, path, version: ver.trim() };
      } catch {
        return { ok: true, path, version: null };
      }
    } catch {
      return { ok: false, path: null, version: null };
    }
  });

  ipcMain.handle("install:claude", async (e) => {
    const send = (chunk: string, kind: "stdout" | "stderr" | "exit") => {
      e.sender.send("install:claude:log", { chunk, kind });
    };
    return new Promise<{ code: number | null }>((resolve) => {
      const p = spawn("npm", ["install", "-g", "@anthropic-ai/claude-code"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      });
      p.stdout?.on("data", (d) => send(d.toString(), "stdout"));
      p.stderr?.on("data", (d) => send(d.toString(), "stderr"));
      p.on("close", (code) => {
        send(`\n[exit ${code}]\n`, "exit");
        resolve({ code });
      });
      p.on("error", (err) => {
        send(`\n[error] ${err.message}\n`, "stderr");
        resolve({ code: -1 });
      });
    });
  });

  ipcMain.handle("vault:pick", async () => {
    if (!win) return { canceled: true };
    const r = await dialog.showOpenDialog(win, {
      title: "Elegí tu vault",
      properties: ["openDirectory", "createDirectory"],
      defaultPath: join(homedir(), "Documents"),
    });
    if (r.canceled || r.filePaths.length === 0) return { canceled: true };
    return { canceled: false, path: r.filePaths[0] };
  });

  ipcMain.handle("vault:inspect", async (_e, path: string) => {
    try {
      await access(path);
    } catch {
      return { exists: false };
    }
    const hasRufino = existsSync(join(path, "rufino"));
    return { exists: true, hasRufino };
  });

  ipcMain.handle("vault:init-existing", async (_e, path: string) => {
    return initVault(path);
  });

  ipcMain.handle("vault:create-new", async (_e, parent: string, name: string) => {
    const dst = join(parent, name);
    await mkdir(dst, { recursive: true });
    return initVault(dst);
  });

  ipcMain.handle("perms:test", async (_e, path: string) => {
    try {
      const dir = await readdir(path);
      return { ok: true, sample: dir.slice(0, 3) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  });

  ipcMain.handle("perms:open-settings", async () => {
    await shell.openExternal(
      "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles",
    );
  });

  ipcMain.handle("external:open", async (_e, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle("install:claude-config", async () => {
    return installClaudeConfig();
  });

  ipcMain.handle("install:cron", async () => {
    return installCronEntry();
  });

  ipcMain.handle("onboarding:finish", async () => {
    const claudeConfig = await installClaudeConfig();
    const cron = await installCronEntry();
    await writeConfig({
      onboardingCompleted: true,
      lastValidated: new Date().toISOString(),
    });
    if (win) {
      const url = nextPort ? `http://127.0.0.1:${nextPort}/` : "/";
      await win.loadURL(url);
    }
    return { claudeConfig, cron };
  });

  ipcMain.handle("app:reset-onboarding", async () => {
    await writeConfig({ onboardingCompleted: false, vaultPath: null });
    if (win && nextPort) {
      await win.loadURL(`http://127.0.0.1:${nextPort}/onboarding`);
    }
  });
}

async function initVault(rootPath: string): Promise<{
  path: string;
  created: string[];
}> {
  const created: string[] = [];
  const rufinoDir = join(rootPath, "rufino");
  await mkdir(rufinoDir, { recursive: true });
  await mkdir(join(rufinoDir, "_people"), { recursive: true });

  const seedFiles: { path: string; content: string }[] = [
    { path: join(rufinoDir, "_index.md"), content: "# Index\n\n_(notas procesadas aparecerán acá)_\n" },
    {
      path: join(rufinoDir, "_pendientes.md"),
      content: `# Pendientes

## Por hacer

| Estado | Descripción | Proyecto·Arista | Personas | Fecha límite | Origen | Creado |
|--------|-------------|-----------------|----------|--------------|--------|--------|

## Completados

| Descripción | Proyecto·Arista | Personas | Origen | Completado |
|-------------|-----------------|----------|--------|------------|
`,
    },
    {
      path: join(rufinoDir, "_people.md"),
      content: "# People\n\n_(personas mencionadas en notas aparecerán acá)_\n",
    },
  ];
  for (const f of seedFiles) {
    if (!existsSync(f.path)) {
      await writeFile(f.path, f.content);
      created.push(f.path);
    }
  }
  return { path: rootPath, created };
}

// ──────────────────────────────────────────
// App lifecycle
// ──────────────────────────────────────────
app.on("window-all-closed", () => {
  stopNext();
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0 && nextPort) {
    await createWindow(`http://127.0.0.1:${nextPort}`);
  }
});

app.on("will-quit", () => {
  stopNext();
});

app.whenReady().then(async () => {
  registerIpc();
  try {
    const url = await startNext();
    await createWindow(url);
  } catch (err) {
    console.error("Failed to start Next.js", err);
    dialog.showErrorBox(
      "Rufino no pudo arrancar",
      `${(err as Error).message}\n\nProbá reiniciar la app o reinstalar.`,
    );
    app.quit();
  }
});
