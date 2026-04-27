"use client";

import { useEffect, useState } from "react";
import { isElectron, rufino } from "@/lib/electron-api";
import {
  OnbHeader,
  RecoveryBanner,
} from "@/components/onboarding/shell";
import {
  ScreenClaude,
  ScreenDone,
  ScreenNode,
  ScreenPermissions,
  ScreenVault,
  ScreenWelcome,
  type ClaudeSub,
  type VaultBranch,
} from "@/components/onboarding/screens";
import "./onboarding.css";

const TOTAL_STEPS = 6;

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [vaultBranch, setVaultBranch] = useState<VaultBranch>("pick");
  const [claudeSub, setClaudeSub] = useState<ClaudeSub>("idle");

  const [nodeDetected, setNodeDetected] = useState(true);
  const [nodeVersion, setNodeVersion] = useState<string | null>(null);
  const [claudeDetected, setClaudeDetected] = useState(true);
  const [claudePath, setClaudePath] = useState<string | null>(null);
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [permsRequired, setPermsRequired] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [installLog, setInstallLog] = useState<string>("");

  // Real Electron detection on mount
  useEffect(() => {
    const api = rufino();
    if (!api) return; // browser preview: stay on default mock state

    let cancelled = false;
    (async () => {
      const [cfg, node, claude] = await Promise.all([
        api.config.get(),
        api.detect.node(),
        api.detect.claude(),
      ]);
      if (cancelled) return;
      setNodeDetected(node.ok);
      setNodeVersion(node.version);
      setClaudeDetected(claude.ok);
      setClaudePath(claude.path);
      setVaultPath(cfg.vaultPath);
      setShowRecovery(
        cfg.onboardingCompleted && (!node.ok || !claude.ok || !cfg.vaultPath),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Stream claude install logs
  useEffect(() => {
    const api = rufino();
    if (!api || claudeSub !== "installing") return;
    const off = api.install.onClaudeLog((chunk) => {
      setInstallLog((s) => s + chunk);
    });
    return off;
  }, [claudeSub]);

  const next = () => {
    let n = step + 1;
    if (n === 4 && !permsRequired) n = 5;
    if (n > TOTAL_STEPS - 1) n = TOTAL_STEPS - 1;
    setStep(n);
    setVaultBranch("pick");
  };
  const back = () => {
    let p = step - 1;
    if (p === 4 && !permsRequired) p = 3;
    if (p < 0) p = 0;
    setStep(p);
  };

  const handlePickExisting = async () => {
    const api = rufino();
    if (!api) {
      setVaultBranch("init-existing");
      return;
    }
    const r = await api.vault.pick();
    if (r.canceled) return;
    const ins = await api.vault.inspect(r.path);
    if (!ins.exists) return;
    if (ins.hasRufino) {
      await api.config.set({ vaultPath: r.path });
      setVaultPath(r.path);
      const t = await api.perms.test(r.path);
      setPermsRequired(!t.ok);
      next();
    } else {
      setVaultPath(r.path);
      setVaultBranch("init-existing");
    }
  };

  const handleConfirmInitExisting = async () => {
    const api = rufino();
    if (!api || !vaultPath) {
      next();
      return;
    }
    await api.vault.initExisting(vaultPath);
    await api.config.set({ vaultPath });
    const t = await api.perms.test(vaultPath);
    setPermsRequired(!t.ok);
    next();
  };

  const handlePickCreateNew = () => setVaultBranch("create-new");

  const handleCreateNew = async (name: string) => {
    const api = rufino();
    if (!api) {
      next();
      return;
    }
    const pickP = await api.vault.pick();
    if (pickP.canceled) return;
    const r = await api.vault.createNew(pickP.path, name);
    await api.config.set({ vaultPath: r.path });
    setVaultPath(r.path);
    const t = await api.perms.test(r.path);
    setPermsRequired(!t.ok);
    next();
  };

  const handleInstallClaude = async () => {
    const api = rufino();
    if (!api) {
      setClaudeSub("installing");
      setTimeout(() => {
        setClaudeDetected(true);
        setClaudeSub("idle");
      }, 1500);
      return;
    }
    setInstallLog("");
    setClaudeSub("installing");
    const r = await api.install.claude();
    const detect = await api.detect.claude();
    setClaudeDetected(detect.ok);
    setClaudePath(detect.path);
    if (r.code === 0 && detect.ok) setClaudeSub("idle");
    else setClaudeSub("error");
  };

  const handleOpenNodeJsOrg = async () => {
    const api = rufino();
    if (api) await api.external.open("https://nodejs.org/");
    else if (typeof window !== "undefined")
      window.open("https://nodejs.org/", "_blank");
  };

  const handleRedetectNode = async () => {
    const api = rufino();
    if (!api) return;
    const r = await api.detect.node();
    setNodeDetected(r.ok);
    setNodeVersion(r.version);
  };

  const handleRedetectClaude = async () => {
    const api = rufino();
    if (!api) return;
    const r = await api.detect.claude();
    setClaudeDetected(r.ok);
    setClaudePath(r.path);
    if (r.ok) setClaudeSub("idle");
  };

  const handleOpenSettings = async () => {
    const api = rufino();
    if (api) await api.perms.openSettings();
  };

  const handlePermsRetry = async () => {
    const api = rufino();
    if (!api || !vaultPath) return;
    const t = await api.perms.test(vaultPath);
    setPermsRequired(!t.ok);
    if (t.ok) next();
  };

  const handleFinish = async () => {
    const api = rufino();
    if (!api) {
      if (typeof window !== "undefined") window.location.href = "/";
      return;
    }
    await api.onboarding.finish();
  };

  const renderScreen = () => {
    switch (step) {
      case 0:
        return <ScreenWelcome onNext={next} />;
      case 1:
        return (
          <ScreenVault
            onNext={next}
            branchState={vaultBranch}
            setBranchState={setVaultBranch}
            onPickExisting={handlePickExisting}
            onPickCreateNew={handlePickCreateNew}
            onConfirmInitExisting={handleConfirmInitExisting}
            onConfirmCreateNew={handleCreateNew}
            currentVaultPath={vaultPath}
            isElectron={isElectron()}
          />
        );
      case 2:
        return (
          <ScreenNode
            onNext={next}
            detected={nodeDetected}
            version={nodeVersion}
            onOpenNodeJsOrg={handleOpenNodeJsOrg}
            onRedetect={handleRedetectNode}
          />
        );
      case 3:
        return (
          <ScreenClaude
            onNext={next}
            detected={claudeDetected}
            subState={claudeSub}
            setSubState={setClaudeSub}
            claudePath={claudePath}
            installLog={installLog}
            onInstall={handleInstallClaude}
            onRedetect={handleRedetectClaude}
          />
        );
      case 4:
        return (
          <ScreenPermissions
            onNext={next}
            onOpenSettings={handleOpenSettings}
            onRetry={handlePermsRetry}
          />
        );
      case 5:
        return (
          <ScreenDone
            onFinish={handleFinish}
            vaultPath={vaultPath ?? "/Users/val/Files/vaultlentino"}
            nodeVersion={nodeVersion ?? "v20.18.0"}
            claudePath={claudePath ?? "/usr/local/bin/claude"}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="onb-page">
      <div
        style={{
          width: 640,
          height: 720,
          background: "var(--bg)",
          borderRadius: 14,
          overflow: "hidden",
          boxShadow:
            "0 0 0 1px rgba(0,0,0,0.18), 0 24px 60px rgba(0,0,0,0.32)",
          display: "flex",
          flexDirection: "column",
          position: "relative",
        }}
      >
        <OnbHeader
          step={step}
          totalSteps={TOTAL_STEPS}
          canBack={canBack(step)}
          onBack={back}
          banner={showRecovery ? <RecoveryBanner /> : null}
        />
        {renderScreen()}
      </div>
    </div>
  );
}

function canBack(step: number): boolean {
  return step > 0;
}
