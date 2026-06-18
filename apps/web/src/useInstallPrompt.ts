import { useEffect, useState } from "react";

// Install / Add-to-Home-Screen (Brief v27). Capture the browser's beforeinstallprompt so Tutti can
// offer its own "Install" button at the right moment, and hide it once installed. Feature-detected:
// where the event never fires (iOS Safari, jsdom) canInstall stays false and promptInstall no-ops.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function useInstallPrompt(): { canInstall: boolean; promptInstall: () => Promise<void> } {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBIP = (e: Event) => {
      e.preventDefault(); // suppress the default mini-infobar; we show our own button
      setEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setEvt(null);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!evt) return;
    try {
      await evt.prompt();
    } catch {
      /* user dismissed or unavailable */
    }
    setEvt(null); // a prompt can only be used once — hide the button after
  };

  return { canInstall: evt !== null, promptInstall };
}
