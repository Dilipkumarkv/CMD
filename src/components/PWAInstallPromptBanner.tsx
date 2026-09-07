import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallPromptBanner() {
  const { isInstallable, isInstalled, isIOS, isDismissed, install, dismissPrompt } = usePWAInstall();

  // If already installed, dismissed by the user previously, or not supported, hide the prompt completely
  if (isInstalled || isDismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  const handleInstall = async () => {
    if (isInstallable) {
      await install();
    }
  };

  return (
    <div
      id="pwa-install-prompt-banner"
      role="region"
      aria-label="App Installation Prompt"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg animate-in slide-in-from-top duration-200"
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-neutral-900/95 border border-sky-500/40 text-neutral-100 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-md bg-sky-500/20 border border-sky-500/40 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-sky-300">Install SNA Terminal Lab</div>
            <p className="text-[11px] text-neutral-300 truncate">
              Run offline anytime directly from your home screen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>

          <button
            type="button"
            id="dismiss-install-prompt-btn"
            onClick={dismissPrompt}
            className="p-1 rounded text-neutral-400 hover:text-white transition-colors"
            title="Dismiss install prompt (will not reappear on reload)"
            aria-label="Dismiss installation prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
