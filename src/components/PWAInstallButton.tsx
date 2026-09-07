import { Check, Download, Share2, Smartphone, X } from 'lucide-react';
import { MouseEvent, useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'standalone';
  shellMode?: 'cmd' | 'ps';
}

export function PWAInstallButton({ variant = 'header', shellMode = 'cmd' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isDismissed, install, dismissPrompt } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const isPS = shellMode === 'ps';

  // If already installed, show clean status indicator
  if (isInstalled || justInstalled) {
    return (
      <div
        className="hidden md:flex items-center gap-1 px-2 py-1 rounded text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40"
        title="App is installed and running as a standalone PWA"
      >
        <Check className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px]">Installed PWA</span>
      </div>
    );
  }

  // If dismissed and in header, show a subtle icon or button that won't nag
  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setJustInstalled(true);
      }
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      setShowIOSGuide(true);
    }
  };

  const handleCloseGuide = (e?: MouseEvent) => {
    e?.stopPropagation();
    setShowIOSGuide(false);
    dismissPrompt();
  };

  return (
    <>
      <button
        type="button"
        id="pwa-install-btn"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all shadow-sm active:scale-95 ${
          isDismissed
            ? 'bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
            : isPS
            ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold shadow-sky-950'
            : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold shadow-emerald-950'
        }`}
        title="Install SNA Terminal Lab for offline home screen / desktop access"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install</span>
      </button>

      {/* Guided installation modal for iOS or manual install fallback */}
      {showIOSGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-sm rounded-xl bg-neutral-900 border border-neutral-700 p-5 shadow-2xl text-neutral-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-sky-400" />
                </div>
                <h3 className="text-sm font-semibold">Install SNA Terminal</h3>
              </div>
              <button
                type="button"
                onClick={handleCloseGuide}
                className="p-1 rounded text-neutral-400 hover:text-white"
                aria-label="Dismiss install instructions"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {isIOS ? (
                <>
                  Install directly on your iPhone or iPad home screen for genuine zero-network offline lab access:
                </>
              ) : (
                <>
                  To install SNA Terminal Lab on this device:
                </>
              )}
            </p>

            <div className="space-y-2 bg-black/40 rounded-lg p-3 border border-white/5 text-xs text-neutral-300">
              {isIOS ? (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Tap the <strong className="text-sky-300">Share</strong> button <Share2 className="w-3.5 h-3.5 inline mx-0.5" /> in Safari toolbar.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-600/30 text-sky-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Scroll down and select <strong className="text-sky-300">Add to Home Screen</strong>.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>Click the <strong>Install</strong> icon in your browser address bar (top right).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-300 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>Confirm <strong>Install</strong> to launch as a standalone desktop app.</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCloseGuide}
                className="flex-1 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-white transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
