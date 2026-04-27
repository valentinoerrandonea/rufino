"use client";

import { useEffect, useState } from "react";
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconExternal,
  IconFeather,
  IconFolder,
  IconFolderPlus,
  IconHardDrive,
  IconLock,
  IconNode,
  IconPackage,
  IconRefresh,
  IconShield,
  IconSparkle,
  IconTerminal,
} from "./icons";
import {
  Btn,
  Code,
  ONB_FONT,
  OptionCard,
  StatusRow,
  StepActions,
  StepBody,
} from "./shell";

// ──────────────────────────────────────────
// Pantalla 1 — Welcome
// ──────────────────────────────────────────
export function ScreenWelcome({ onNext }: { onNext: () => void }) {
  const [animKey, setAnimKey] = useState(0);
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, []);

  return (
    <StepBody stepKey="welcome">
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "0 48px",
          textAlign: "center",
        }}
      >
        <div
          key={animKey}
          style={{ position: "relative", height: 90, marginBottom: 28 }}
        >
          <div
            className="feather-fall"
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              color: "var(--accent)",
            }}
          >
            <IconFeather size={44} sw={1.3} />
          </div>
          <div
            className="feather-shadow"
            style={{
              position: "absolute",
              bottom: 6,
              left: "50%",
              width: 28,
              height: 4,
              borderRadius: "50%",
              background: "var(--ink-dim)",
              opacity: 0.25,
              transform: "translateX(-50%) scaleX(0.4)",
            }}
          />
        </div>

        <h1
          className="onb-fade-up"
          style={{
            fontFamily: ONB_FONT,
            fontStyle: "italic",
            fontWeight: 400,
            fontSize: 56,
            lineHeight: 1,
            color: "var(--ink)",
            margin: 0,
            animationDelay: "0.4s",
          }}
        >
          Rufino
        </h1>
        <p
          className="onb-fade-up"
          style={{
            fontFamily: ONB_FONT,
            fontSize: 19,
            color: "var(--ink-2)",
            margin: "14px 0 0",
            fontWeight: 400,
            animationDelay: "0.7s",
          }}
        >
          Tu segundo cerebro, sin fricción.
        </p>

        <p
          className="onb-fade-up"
          style={{
            fontSize: 14.5,
            lineHeight: 1.6,
            color: "var(--ink-2)",
            margin: "32px 0 0",
            maxWidth: 380,
            animationDelay: "1.0s",
          }}
        >
          Capturá notas, pendientes y personas. Rufino las procesa con Claude y
          las organiza por proyecto en tu vault de Obsidian.
          <br />
          <br />
          Vos seguís escribiendo. Rufino se encarga de archivar.
        </p>
      </div>

      <StepActions>
        <div className="onb-fade-up" style={{ animationDelay: "1.3s" }}>
          <Btn
            kind="primary"
            size="lg"
            iconRight={<IconArrowRight size={16} sw={1.8} />}
            onClick={onNext}
          >
            Empezar
          </Btn>
        </div>
      </StepActions>
    </StepBody>
  );
}

// ──────────────────────────────────────────
// Pantalla 2 — Vault
// ──────────────────────────────────────────
export type VaultBranch = "pick" | "init-existing" | "create-new";

export function ScreenVault({
  onNext,
  branchState,
  setBranchState,
  onPickExisting,
  onPickCreateNew,
  onConfirmInitExisting,
  onConfirmCreateNew,
  currentVaultPath,
  isElectron,
}: {
  onNext: () => void;
  branchState: VaultBranch;
  setBranchState: (b: VaultBranch) => void;
  onPickExisting?: () => void | Promise<void>;
  onPickCreateNew?: () => void;
  onConfirmInitExisting?: () => void | Promise<void>;
  onConfirmCreateNew?: (name: string) => void | Promise<void>;
  currentVaultPath?: string | null;
  isElectron?: boolean;
}) {
  const [vaultName, setVaultName] = useState("mi-vault");
  const vaultParent = currentVaultPath
    ? currentVaultPath.replace(/\/[^/]+$/, "") || "~/Documents"
    : "~/Documents";

  if (branchState === "init-existing") {
    return (
      <StepBody stepKey="vault-init">
        <div
          style={{
            flex: 1,
            padding: "8px 36px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "var(--surface-2)",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--ink-2)",
              marginBottom: 18,
            }}
          >
            <IconFolder size={22} sw={1.5} />
          </div>
          <h2
            style={{
              fontFamily: ONB_FONT,
              fontSize: 26,
              fontWeight: 500,
              lineHeight: 1.15,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Esta carpeta no parece tener un vault de Rufino
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-2)",
              margin: "12px 0 18px",
              lineHeight: 1.55,
            }}
          >
            ¿Querés inicializarlo acá? Se crearán los archivos base.
          </p>

          <Code style={{ marginBottom: 6 }}>
            {`rufino/
├── _index.md
├── _pendientes.md
├── _people.md
└── _people/`}
          </Code>
          <div
            style={{
              fontSize: 11.5,
              color: "var(--ink-3)",
              fontStyle: "italic",
              marginBottom: 22,
            }}
          >
            {currentVaultPath ?? "(sin carpeta seleccionada)"}
          </div>
        </div>
        <StepActions>
          <Btn kind="ghost" onClick={() => setBranchState("pick")}>
            Elegir otra
          </Btn>
          <Btn
            kind="primary"
            iconRight={<IconArrowRight size={14} sw={1.8} />}
            onClick={() => (onConfirmInitExisting ? onConfirmInitExisting() : onNext())}
          >
            Inicializar acá
          </Btn>
        </StepActions>
      </StepBody>
    );
  }

  if (branchState === "create-new") {
    return (
      <StepBody stepKey="vault-new">
        <div
          style={{
            flex: 1,
            padding: "8px 36px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "var(--accent-wash)",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              marginBottom: 18,
            }}
          >
            <IconFolderPlus size={22} sw={1.5} />
          </div>
          <h2
            style={{
              fontFamily: ONB_FONT,
              fontSize: 26,
              fontWeight: 500,
              lineHeight: 1.15,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Crear vault nuevo
          </h2>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-2)",
              margin: "12px 0 22px",
              lineHeight: 1.55,
            }}
          >
            Elegí el nombre y dónde guardarlo.
          </p>

          <div className="label">Nombre del vault</div>
          <input
            className="input"
            value={vaultName}
            onChange={(e) => setVaultName(e.target.value)}
            style={{ marginBottom: 16 }}
          />

          <div className="label">Ubicación</div>
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: "9px 12px",
              borderRadius: 7,
              background: "var(--surface)",
              border: "1px solid var(--hair)",
              color: "var(--ink-2)",
              fontSize: 13,
              fontFamily: "inherit",
              cursor: "pointer",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <IconFolder size={14} stroke="var(--ink-3)" />
              <span className="mono" style={{ fontSize: 12 }}>
                {vaultParent}
              </span>
            </span>
            <span style={{ fontSize: 11, color: "var(--ink-3)" }}>Cambiar</span>
          </button>

          <div
            style={{
              marginTop: 22,
              padding: "12px 14px",
              borderRadius: 8,
              background: "var(--bg-2)",
              border: "1px solid var(--hair-soft)",
              fontSize: 12.5,
              color: "var(--ink-2)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginBottom: 6,
                letterSpacing: 0.3,
              }}
            >
              Se creará
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>
              {vaultParent}/{vaultName || "…"}/rufino/
            </div>
          </div>
        </div>
        <StepActions>
          <Btn kind="ghost" onClick={() => setBranchState("pick")}>
            Atrás
          </Btn>
          <Btn
            kind="primary"
            iconRight={<IconArrowRight size={14} sw={1.8} />}
            onClick={() =>
              onConfirmCreateNew ? onConfirmCreateNew(vaultName.trim()) : onNext()
            }
            disabled={!vaultName.trim()}
          >
            Crear
          </Btn>
        </StepActions>
      </StepBody>
    );
  }

  return (
    <StepBody stepKey="vault">
      <div style={{ flex: 1, padding: "8px 36px 0" }}>
        <h2
          style={{
            fontFamily: ONB_FONT,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.15,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          ¿Dónde está tu vault?
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            margin: "12px 0 24px",
            lineHeight: 1.55,
            maxWidth: 460,
          }}
        >
          Rufino lee y escribe notas en una carpeta de tu Mac — típicamente tu
          vault de Obsidian.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <OptionCard
            icon={<IconFolder size={20} sw={1.5} />}
            label="Elegir carpeta existente"
            sub="Ya tengo un vault con notas adentro"
            onClick={() =>
              onPickExisting
                ? onPickExisting()
                : setBranchState("init-existing")
            }
          />
          <OptionCard
            icon={<IconFolderPlus size={20} sw={1.5} />}
            label="Crear vault nuevo"
            sub="Empezar de cero, en blanco"
            onClick={() =>
              onPickCreateNew
                ? onPickCreateNew()
                : setBranchState("create-new")
            }
          />
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 12,
            color: "var(--ink-3)",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <IconLock
            size={13}
            sw={1.6}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>
            Todo se guarda local en tu Mac. Rufino no sube tus notas a ningún
            lado.
          </span>
        </div>
      </div>
    </StepBody>
  );
}

// ──────────────────────────────────────────
// Pantalla 3 — Node.js
// ──────────────────────────────────────────
export function ScreenNode({
  onNext,
  detected,
  version,
  onOpenNodeJsOrg,
  onRedetect,
}: {
  onNext: () => void;
  detected: boolean;
  version?: string | null;
  onOpenNodeJsOrg?: () => void | Promise<void>;
  onRedetect?: () => void | Promise<void>;
}) {
  if (detected) {
    return (
      <StepBody stepKey="node-ok">
        <div
          style={{
            flex: 1,
            padding: "8px 36px 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--green)",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              marginBottom: 22,
              alignSelf: "flex-start",
            }}
          >
            <IconCheck size={28} sw={2.4} />
          </div>
          <h2
            style={{
              fontFamily: ONB_FONT,
              fontSize: 28,
              fontWeight: 500,
              lineHeight: 1.15,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Node.js detectado
          </h2>
          <div
            style={{
              marginTop: 22,
              padding: "14px 16px",
              borderRadius: 10,
              background: "var(--bg-2)",
              border: "1px solid var(--hair-soft)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginBottom: 4,
                letterSpacing: 0.3,
              }}
            >
              Versión
            </div>
            <div className="mono" style={{ fontSize: 14, color: "var(--ink)" }}>
              {version ?? "v20.18.0"}
            </div>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              marginTop: 18,
              lineHeight: 1.55,
            }}
          >
            Avanzando al siguiente paso…
          </p>
        </div>
        <StepActions>
          <Btn
            kind="primary"
            iconRight={<IconArrowRight size={14} sw={1.8} />}
            onClick={onNext}
          >
            Continuar
          </Btn>
        </StepActions>
      </StepBody>
    );
  }

  return (
    <StepBody stepKey="node-missing">
      <div style={{ flex: 1, padding: "8px 36px 0" }}>
        <div
          style={{
            display: "inline-flex",
            width: 44,
            height: 44,
            borderRadius: 11,
            background: "var(--surface-2)",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
            marginBottom: 18,
          }}
        >
          <IconNode size={22} sw={1.5} />
        </div>
        <h2
          style={{
            fontFamily: ONB_FONT,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.15,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Necesitás Node.js
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            margin: "12px 0 18px",
            lineHeight: 1.55,
            maxWidth: 460,
          }}
        >
          Rufino usa Claude Code para procesar tus notas, y Claude Code corre
          sobre Node.js. No detecté Node en tu sistema (o es muy viejo).
        </p>

        <div
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            background: "var(--bg-2)",
            border: "1px solid var(--hair-soft)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--hair)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconAlert size={15} stroke="var(--amber)" sw={1.7} />
          </div>
          <div>
            <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
              Recomendamos Node 20 o más nuevo
            </div>
            <div
              style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}
            >
              El instalador oficial es la forma más simple.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            fontSize: 12,
            color: "var(--ink-3)",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <IconShield
            size={13}
            sw={1.6}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>
            No instalamos nada por vos a nivel sistema. Te llevamos al sitio
            oficial.
          </span>
        </div>
      </div>
      <StepActions>
        <Btn
          kind="secondary"
          icon={<IconRefresh size={13} sw={1.8} />}
          onClick={() => onRedetect?.()}
        >
          Detectar de nuevo
        </Btn>
        <Btn
          kind="primary"
          iconRight={<IconExternal size={13} sw={1.8} />}
          onClick={() => onOpenNodeJsOrg?.()}
        >
          Abrir nodejs.org
        </Btn>
      </StepActions>
    </StepBody>
  );
}

// ──────────────────────────────────────────
// Pantalla 4 — Claude Code
// ──────────────────────────────────────────
export type ClaudeSub = "idle" | "installing" | "error";

export function ScreenClaude({
  onNext,
  detected,
  subState,
  setSubState,
  claudePath,
  installLog,
  onInstall,
  onRedetect,
}: {
  onNext: () => void;
  detected: boolean;
  subState: ClaudeSub;
  setSubState: (s: ClaudeSub) => void;
  claudePath?: string | null;
  installLog?: string;
  onInstall?: () => void | Promise<void>;
  onRedetect?: () => void | Promise<void>;
}) {
  if (detected && subState === "idle") {
    return (
      <StepBody stepKey="claude-ok">
        <div
          style={{
            flex: 1,
            padding: "8px 36px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "rgba(91,138,90,0.15)",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--green)",
              marginBottom: 18,
            }}
          >
            <IconCheck size={22} sw={2.2} />
          </div>
          <h2
            style={{
              fontFamily: ONB_FONT,
              fontSize: 26,
              fontWeight: 500,
              lineHeight: 1.15,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Claude Code detectado
          </h2>
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 8,
              background: "var(--bg-2)",
              border: "1px solid var(--hair-soft)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--ink-3)",
                marginBottom: 4,
                letterSpacing: 0.3,
              }}
            >
              Path
            </div>
            <div
              className="mono"
              style={{ fontSize: 12.5, color: "var(--ink)" }}
            >
              {claudePath ?? "/usr/local/bin/claude"}
            </div>
          </div>

          <div
            style={{
              marginTop: 22,
              padding: "14px 16px",
              borderRadius: 10,
              background: "var(--accent-wash)",
              border: "1px solid rgba(176,104,54,0.2)",
            }}
          >
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <IconTerminal
                size={15}
                stroke="var(--accent)"
                sw={1.7}
                style={{ marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--ink)",
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  Asegurate de estar logueado
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--ink-2)",
                    lineHeight: 1.55,
                  }}
                >
                  Si todavía no lo hiciste, abrí Terminal una sola vez y corré:
                </div>
                <div
                  className="mono"
                  style={{
                    marginTop: 8,
                    fontSize: 12.5,
                    color: "var(--ink)",
                    padding: "6px 10px",
                    background: "var(--surface)",
                    borderRadius: 5,
                    border: "1px solid var(--hair)",
                    display: "inline-block",
                  }}
                >
                  claude login
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    marginTop: 8,
                    fontStyle: "italic",
                  }}
                >
                  El login es interactivo y no se puede hacer desde Rufino.
                </div>
              </div>
            </div>
          </div>
        </div>
        <StepActions>
          <Btn
            kind="primary"
            iconRight={<IconArrowRight size={14} sw={1.8} />}
            onClick={onNext}
          >
            Continuar
          </Btn>
        </StepActions>
      </StepBody>
    );
  }

  if (subState === "installing") {
    return (
      <StepBody stepKey="claude-installing">
        <div
          style={{
            flex: 1,
            padding: "8px 36px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "var(--accent-wash)",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent)",
              marginBottom: 18,
            }}
          >
            <div
              className="onb-spinner"
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: "2px solid var(--accent)",
                borderTopColor: "transparent",
              }}
            />
          </div>
          <h2
            style={{
              fontFamily: ONB_FONT,
              fontSize: 26,
              fontWeight: 500,
              lineHeight: 1.15,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Instalando Claude Code…
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "var(--ink-3)",
              margin: "10px 0 16px",
              lineHeight: 1.55,
            }}
          >
            <span className="mono" style={{ fontSize: 12 }}>
              npm install -g @anthropic-ai/claude-code
            </span>
          </p>

          <div
            style={{
              flex: 1,
              minHeight: 200,
              background: "#1a1816",
              color: "#d6cdbf",
              borderRadius: 10,
              padding: 14,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              lineHeight: 1.6,
              overflow: "auto",
              border: "1px solid #2a2724",
              whiteSpace: "pre-wrap",
            }}
          >
            {installLog && installLog.trim().length > 0 ? (
              <>
                {installLog}
                <span className="onb-blink">▋</span>
              </>
            ) : (
              <>
                <div style={{ color: "#7a716a" }}>
                  $ npm install -g @anthropic-ai/claude-code
                </div>
                <div style={{ color: "#9d948a" }}>
                  resolviendo dependencias…
                </div>
                <span className="onb-blink">▋</span>
              </>
            )}
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 11.5,
              color: "var(--ink-3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <div
              className="onb-spinner"
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "1.5px solid var(--ink-dim)",
                borderTopColor: "transparent",
              }}
            />
            Esto puede tomar un minuto.
          </div>
        </div>
        <StepActions>
          <Btn kind="ghost" disabled>
            Instalando…
          </Btn>
        </StepActions>
      </StepBody>
    );
  }

  if (subState === "error") {
    return (
      <StepBody stepKey="claude-error">
        <div
          style={{
            flex: 1,
            padding: "8px 36px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              width: 44,
              height: 44,
              borderRadius: 11,
              background: "rgba(180,73,60,0.12)",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--red)",
              marginBottom: 18,
            }}
          >
            <IconAlert size={22} sw={1.7} />
          </div>
          <h2
            style={{
              fontFamily: ONB_FONT,
              fontSize: 26,
              fontWeight: 500,
              lineHeight: 1.15,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            La instalación falló
          </h2>
          <p
            style={{
              fontSize: 13.5,
              color: "var(--ink-2)",
              margin: "12px 0 16px",
              lineHeight: 1.55,
            }}
          >
            npm devolvió un error. Podés reintentar o instalarlo manualmente.
          </p>

          <div
            style={{
              background: "#1a1816",
              color: "#d6cdbf",
              borderRadius: 10,
              padding: 14,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11.5,
              lineHeight: 1.6,
              overflow: "auto",
              border: "1px solid #2a2724",
              maxHeight: 180,
              whiteSpace: "pre-wrap",
            }}
          >
            {installLog && installLog.trim().length > 0 ? (
              installLog
            ) : (
              <>
                <div style={{ color: "#7a716a" }}>
                  $ npm install -g @anthropic-ai/claude-code
                </div>
                <div style={{ color: "#d06b5e" }}>npm error code EACCES</div>
                <div style={{ color: "#d06b5e" }}>
                  npm error Error: EACCES: permission denied
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => {
              if (typeof navigator !== "undefined" && installLog) {
                navigator.clipboard?.writeText(installLog);
              }
            }}
            style={{
              marginTop: 12,
              alignSelf: "flex-start",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11.5,
              color: "var(--ink-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "4px 0",
            }}
          >
            <IconCopy size={12} /> Copiar error
          </button>
        </div>
        <StepActions>
          <Btn kind="secondary" onClick={() => setSubState("idle")}>
            Lo instalo yo
          </Btn>
          <Btn
            kind="primary"
            icon={<IconRefresh size={13} sw={1.8} />}
            onClick={() => onInstall?.()}
          >
            Reintentar
          </Btn>
        </StepActions>
      </StepBody>
    );
  }

  return (
    <StepBody stepKey="claude-missing">
      <div style={{ flex: 1, padding: "8px 36px 0" }}>
        <div
          style={{
            display: "inline-flex",
            width: 44,
            height: 44,
            borderRadius: 11,
            background: "var(--surface-2)",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
            marginBottom: 18,
          }}
        >
          <IconPackage size={22} sw={1.5} />
        </div>
        <h2
          style={{
            fontFamily: ONB_FONT,
            fontSize: 28,
            fontWeight: 500,
            lineHeight: 1.15,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Instalá Claude Code
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            margin: "12px 0 18px",
            lineHeight: 1.55,
            maxWidth: 460,
          }}
        >
          Rufino lo usa para procesar tus notas: organización por proyecto,
          detección de pendientes y personas.
        </p>

        <div
          style={{
            marginBottom: 6,
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: 0.3,
          }}
        >
          Comando que correré
        </div>
        <Code style={{ marginBottom: 18 }}>
          npm install -g @anthropic-ai/claude-code
        </Code>

        <div
          style={{
            fontSize: 12,
            color: "var(--ink-3)",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <IconShield
            size={13}
            sw={1.6}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span>
            Sin sudo. Si Node está bien instalado, esto no necesita permisos
            elevados.
          </span>
        </div>
      </div>
      <StepActions>
        <Btn kind="secondary" onClick={() => onRedetect?.()}>
          Detectar de nuevo
        </Btn>
        <Btn
          kind="primary"
          icon={<IconPackage size={14} sw={1.7} />}
          onClick={() => onInstall?.()}
        >
          Instalar ahora
        </Btn>
      </StepActions>
    </StepBody>
  );
}

// ──────────────────────────────────────────
// Pantalla 5 — Permissions
// ──────────────────────────────────────────
export function ScreenPermissions({
  onNext,
  onOpenSettings,
  onRetry,
}: {
  onNext: () => void;
  onOpenSettings?: () => void | Promise<void>;
  onRetry?: () => void | Promise<void>;
}) {
  const steps = [
    "Abrí Configuración del Sistema",
    "Privacidad y seguridad → Acceso total al disco",
    "Activá Rufino en la lista",
    'Volvé acá y tocá "Reintentar"',
  ];
  return (
    <StepBody stepKey="perms">
      <div style={{ flex: 1, padding: "8px 36px 0" }}>
        <div
          style={{
            display: "inline-flex",
            width: 44,
            height: 44,
            borderRadius: 11,
            background: "var(--surface-2)",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-2)",
            marginBottom: 18,
          }}
        >
          <IconHardDrive size={22} sw={1.5} />
        </div>
        <h2
          style={{
            fontFamily: ONB_FONT,
            fontSize: 26,
            fontWeight: 500,
            lineHeight: 1.15,
            color: "var(--ink)",
            margin: 0,
          }}
        >
          Permitile a Rufino leer tu vault
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "var(--ink-2)",
            margin: "12px 0 22px",
            lineHeight: 1.55,
            maxWidth: 460,
          }}
        >
          Tu vault está en una carpeta protegida por macOS. Necesitás darle a
          Rufino{" "}
          <b style={{ color: "var(--ink)", fontWeight: 500 }}>
            Acceso total al disco
          </b>
          .
        </p>

        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {steps.map((t, i) => (
            <li
              key={i}
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                padding: "12px 0",
                borderBottom:
                  i < steps.length - 1 ? "1px solid var(--hair-soft)" : "none",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: "var(--surface-2)",
                  color: "var(--ink-2)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: ONB_FONT,
                  fontSize: 13,
                  fontWeight: 500,
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: 13.5,
                  color: "var(--ink)",
                  lineHeight: 1.5,
                  paddingTop: 3,
                }}
              >
                {t}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <StepActions>
        <Btn
          kind="secondary"
          icon={<IconRefresh size={13} sw={1.8} />}
          onClick={() => onRetry?.()}
        >
          Reintentar
        </Btn>
        <Btn
          kind="primary"
          iconRight={<IconExternal size={13} sw={1.8} />}
          onClick={() => (onOpenSettings ? onOpenSettings() : onNext())}
        >
          Abrir Configuración
        </Btn>
      </StepActions>
    </StepBody>
  );
}

// ──────────────────────────────────────────
// Pantalla 6 — Done
// ──────────────────────────────────────────
export function ScreenDone({
  onFinish,
  vaultPath,
  nodeVersion,
  claudePath,
}: {
  onFinish: () => void;
  vaultPath: string;
  nodeVersion?: string;
  claudePath?: string;
}) {
  return (
    <StepBody stepKey="done">
      <div
        style={{
          flex: 1,
          padding: "8px 36px 0",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="onb-fade-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              color: "var(--accent)",
              animation: "feather-sway 3s ease-in-out infinite",
            }}
          >
            <IconFeather size={32} sw={1.3} />
          </div>
          <h2
            style={{
              fontFamily: ONB_FONT,
              fontStyle: "italic",
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1,
              color: "var(--ink)",
              margin: 0,
            }}
          >
            Todo en orden
          </h2>
        </div>

        <p
          className="onb-fade-up"
          style={{
            fontSize: 14.5,
            color: "var(--ink-2)",
            margin: "6px 0 22px",
            lineHeight: 1.55,
            animationDelay: "0.15s",
          }}
        >
          Rufino está listo para procesar tu primera nota.
        </p>

        <div className="onb-fade-up" style={{ animationDelay: "0.3s" }}>
          <StatusRow label="Vault" value={vaultPath} ok monoValue />
          <StatusRow
            label="Node.js"
            value={nodeVersion ?? "v20.18.0"}
            ok
            monoValue
          />
          <StatusRow
            label="Claude Code"
            value={claudePath ?? "/usr/local/bin/claude"}
            ok
            monoValue
          />
        </div>

        <div
          className="onb-fade-up"
          style={{
            marginTop: 24,
            padding: "14px 16px",
            borderRadius: 10,
            background: "var(--accent-wash)",
            border: "1px solid rgba(176,104,54,0.2)",
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            animationDelay: "0.45s",
          }}
        >
          <IconSparkle
            size={15}
            stroke="var(--accent)"
            sw={1.7}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div
            style={{
              fontSize: 12.5,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            <b style={{ color: "var(--ink)", fontWeight: 500 }}>Tip.</b> Para
            captura rápida sin abrir Rufino, vas a poder usar el menú de la
            barra{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              (próximamente)
            </span>
            .
          </div>
        </div>
      </div>
      <StepActions>
        <Btn
          kind="primary"
          size="lg"
          iconRight={<IconArrowRight size={16} sw={1.8} />}
          onClick={onFinish}
        >
          Ir al dashboard
        </Btn>
      </StepActions>
    </StepBody>
  );
}
