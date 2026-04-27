// Helper: typed access to the Electron preload bridge.
// In a regular browser context, window.rufino is undefined; callers should
// guard with isElectron().

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

declare global {
  interface Window {
    rufino?: RufinoApi;
  }
}

export function isElectron(): boolean {
  return typeof window !== "undefined" && Boolean(window.rufino);
}

export function rufino(): RufinoApi | null {
  if (!isElectron()) return null;
  return window.rufino!;
}
