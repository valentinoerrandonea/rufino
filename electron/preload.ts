import { contextBridge, ipcRenderer } from "electron";

export type RufinoConfig = {
  onboardingCompleted: boolean;
  vaultPath: string | null;
  lastValidated: string | null;
};

export type RufinoApi = {
  config: {
    get: () => Promise<RufinoConfig>;
    set: (patch: Partial<RufinoConfig>) => Promise<RufinoConfig>;
  };
  detect: {
    node: () => Promise<{ ok: boolean; version: string | null; major: number }>;
    claude: () => Promise<{
      ok: boolean;
      path: string | null;
      version?: string | null;
    }>;
  };
  install: {
    claude: () => Promise<{ code: number | null }>;
    onClaudeLog: (
      cb: (chunk: string, kind: "stdout" | "stderr" | "exit") => void,
    ) => () => void;
    claudeConfig: () => Promise<{ installed: string[]; skipped: string[] }>;
    cron: () => Promise<{ added: boolean; reason?: string }>;
  };
  vault: {
    pick: () => Promise<
      { canceled: true } | { canceled: false; path: string }
    >;
    inspect: (path: string) => Promise<{
      exists: boolean;
      hasRufino?: boolean;
    }>;
    initExisting: (
      path: string,
    ) => Promise<{ path: string; created: string[] }>;
    createNew: (
      parent: string,
      name: string,
    ) => Promise<{ path: string; created: string[] }>;
  };
  perms: {
    test: (
      path: string,
    ) => Promise<{ ok: true; sample: string[] } | { ok: false; error: string }>;
    openSettings: () => Promise<void>;
  };
  external: { open: (url: string) => Promise<void> };
  onboarding: { finish: () => Promise<unknown> };
  app: { resetOnboarding: () => Promise<void> };
};

const api: RufinoApi = {
  config: {
    get: () => ipcRenderer.invoke("config:get"),
    set: (patch) => ipcRenderer.invoke("config:set", patch),
  },
  detect: {
    node: () => ipcRenderer.invoke("detect:node"),
    claude: () => ipcRenderer.invoke("detect:claude"),
  },
  install: {
    claude: () => ipcRenderer.invoke("install:claude"),
    onClaudeLog: (cb) => {
      const handler = (
        _e: unknown,
        payload: { chunk: string; kind: "stdout" | "stderr" | "exit" },
      ) => cb(payload.chunk, payload.kind);
      ipcRenderer.on("install:claude:log", handler);
      return () => ipcRenderer.off("install:claude:log", handler);
    },
    claudeConfig: () => ipcRenderer.invoke("install:claude-config"),
    cron: () => ipcRenderer.invoke("install:cron"),
  },
  vault: {
    pick: () => ipcRenderer.invoke("vault:pick"),
    inspect: (path) => ipcRenderer.invoke("vault:inspect", path),
    initExisting: (path) => ipcRenderer.invoke("vault:init-existing", path),
    createNew: (parent, name) =>
      ipcRenderer.invoke("vault:create-new", parent, name),
  },
  perms: {
    test: (path) => ipcRenderer.invoke("perms:test", path),
    openSettings: () => ipcRenderer.invoke("perms:open-settings"),
  },
  external: { open: (url) => ipcRenderer.invoke("external:open", url) },
  onboarding: { finish: () => ipcRenderer.invoke("onboarding:finish") },
  app: { resetOnboarding: () => ipcRenderer.invoke("app:reset-onboarding") },
};

contextBridge.exposeInMainWorld("rufino", api);
