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
      className="fixed bottom-14 right-3 left-3 sm:left-auto sm:max-w-sm z-40 animate-in slide-in-from-bottom-2 duration-200"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-[#11141A] border border-white/10 text-neutral-100 shadow-2xl backdrop-blur-md font-mono select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded bg-[#012456] border border-sky-500/50 flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-neutral-100">Install SNA Terminal Lab</div>
            <p className="text-[10px] text-neutral-400 truncate">
              Offline lab with zero network requirement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-[#012456] hover:bg-[#02357a] text-sky-100 border border-sky-500/70 transition-colors active:scale-95 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Install</span>
          </button>

          <button
            type="button"
            id="dismiss-install-prompt-btn"
            onClick={dismissPrompt}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
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
