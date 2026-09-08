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
      className="fixed top-14 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-md animate-in slide-in-from-top-2 duration-200"
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg bg-neutral-900/95 border border-neutral-700/90 text-neutral-100 shadow-2xl backdrop-blur-md font-mono select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-[#012456] border border-sky-500/80 flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-neutral-200">Install SNA Terminal Lab</div>
            <p className="text-[11px] text-neutral-400 truncate">
              Offline lab with zero network requirement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#012456] hover:bg-[#02357a] text-sky-100 border border-sky-500/80 hover:border-sky-400 transition-colors active:scale-95 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Install</span>
          </button>

          <button
            type="button"
            id="dismiss-install-prompt-btn"
            onClick={dismissPrompt}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Dismiss install prompt"
            aria-label="Dismiss installation prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
