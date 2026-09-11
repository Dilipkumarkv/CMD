import { ShellMode } from "../types/terminal";
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Check,
  Download,
  Laptop,
  RotateCcw,
  Share2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'standalone';
  shellMode?: ShellMode;
}

export function PWAInstallButton({ variant = 'header', shellMode = 'cmd' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActuallyInstalled = isInstalled || justInstalled;
  const isCMD = shellMode === 'cmd';
  const isPS = shellMode === 'ps';
  const isBash = shellMode === 'bash';

  // Modal open helper with browser history entry so mobile/browser Back button closes it
  const openModal = useCallback(() => {
    setShowModal(true);
    try {
      window.history.pushState({ modal: 'pwa-install' }, '');
    } catch {
      // ignore
    }
  }, []);

  // Modal close helper that cleanly pops the history entry if present
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    try {
      if (window.history.state?.modal === 'pwa-install') {
        window.history.back();
      }
    } catch {
      // ignore
    }
  }, []);

  // Support hardware/browser Back button and Escape key to close modal smoothly
  useEffect(() => {
    if (!showModal) return;

    const handlePopState = () => {
      setShowModal(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showModal, handleCloseModal]);

  const handleInstallClick = async () => {
    if (isActuallyInstalled) {
      openModal();
      return;
    }

    if (isInstallable) {
      const accepted = await install();
      if (accepted) {
        setJustInstalled(true);
        return;
      }
    }
    // If native prompt wasn't available or was already prompted, show the guided install modal
    openModal();
  };

  const handleMarkAsInstalled = () => {
    try {
      localStorage.setItem('sna_pwa_installed', 'true');
    } catch {
      // ignore
    }
    setJustInstalled(true);
  };

  const handleResetInstallState = () => {
    try {
      localStorage.removeItem('sna_pwa_installed');
      localStorage.removeItem('sna_pwa_install_dismissed');
    } catch {
      // ignore
    }
    setJustInstalled(false);
    handleCloseModal();
  };

  const buttonThemeClass = isActuallyInstalled
    ? isCMD
      ? 'bg-emerald-950/40 hover:bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
      : isBash
      ? 'bg-fuchsia-950/40 hover:bg-fuchsia-950/80 border-fuchsia-500/40 text-fuchsia-300'
      : 'bg-[#012456]/40 hover:bg-[#012456]/80 border-sky-500/40 text-sky-300'
    : isCMD
    ? 'bg-emerald-950/40 hover:bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
    : isBash
    ? 'bg-fuchsia-950/40 hover:bg-fuchsia-950/80 border-fuchsia-500/40 text-fuchsia-300'
    : 'bg-[#012456]/40 hover:bg-[#012456]/80 border-sky-500/40 text-sky-300';

  const iconThemeColor = isCMD ? 'text-emerald-400' : isBash ? 'text-fuchsia-400' : 'text-sky-400';

  const modalContent = (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[99999] overflow-y-auto overscroll-contain bg-black/85 backdrop-blur-sm p-2 sm:p-4 flex flex-col justify-start sm:justify-center items-center">
          {/* Backdrop click dismiss area */}
          <div
            className="fixed inset-0 -z-10 cursor-pointer"
            onClick={handleCloseModal}
            aria-hidden="true"
          />

          {/* Modal Container Card */}
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-dialog-title"
            className="relative w-full max-w-md my-2 sm:my-auto rounded-xl bg-neutral-900 border border-neutral-700/80 shadow-2xl text-neutral-100 font-mono select-none flex flex-col overflow-hidden cursor-default"
          >
            {/* Sticky Top Bar with Bold Close Button */}
            <div className="sticky top-0 z-20 bg-neutral-900 border-b border-neutral-800 px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-neutral-800 border border-neutral-700 text-sky-400 shrink-0">
                  {isActuallyInstalled ? (
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Download className="w-4 h-4 text-sky-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 id="pwa-dialog-title" className="text-xs sm:text-sm font-bold text-neutral-100 truncate">
                    {isActuallyInstalled ? 'SNA Terminal App (Installed)' : 'Install SNA Terminal'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-neutral-400 truncate">
                    {isActuallyInstalled ? 'Active offline on this device' : 'Standalone Desktop & Mobile App'}
                  </p>
                </div>
              </div>

              {/* Header Close button */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="min-h-[38px] px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 text-neutral-200 text-xs font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>Close</span>
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="p-4 sm:p-5 space-y-3 text-xs overflow-y-auto max-h-[60vh]">
              {isActuallyInstalled ? (
                /* Body: Already Installed State */
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Install Status:</span>
                      <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                        <Check className="w-4 h-4 text-emerald-400" /> Installed & Active
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Offline Capability:</span>
                      <span className="text-neutral-200">100% Zero-Network Lab</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Virtual Lab State:</span>
                      <span className="text-neutral-200">Persisted locally in storage</span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-[#012456]/40 border border-sky-800/60 p-3 space-y-1.5 text-[11px] text-sky-200">
                    <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />
                      Standalone Experience Tip
                    </div>
                    <p className="text-sky-200/90 leading-relaxed">
                      SNA Terminal App is installed on your device. Launch it anytime from your Home Screen or Applications drawer to practice with zero distractions and full offline access.
                    </p>
                  </div>

                  {/* Option to re-check or reset if uninstalled */}
                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={handleResetInstallState}
                      className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors flex items-center gap-1 cursor-pointer py-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Re-check / reset install detection</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Body: Not Yet Installed Instructions */
                <div className="space-y-3 text-xs">
                  {/* Quick Action if browser supports prompt */}
                  {isInstallable && (
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await install();
                        if (ok) {
                          setJustInstalled(true);
                          handleCloseModal();
                        }
                      }}
                      className="w-full py-2.5 min-h-[44px] rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-md cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Directly to Device</span>
                    </button>
                  )}

                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Install SNA Terminal App to run completely offline without an internet connection, with full-screen access and your practice lab state saved on this device.
                  </p>

                  {/* Device-Specific Steps */}
                  <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2.5">
                    <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                      {isIOS ? (
                        <>
                          <Smartphone className="w-4 h-4 text-sky-400" />
                          <span>iOS Safari (iPhone / iPad)</span>
                        </>
                      ) : (
                        <>
                          <Laptop className="w-4 h-4 text-sky-400" />
                          <span>Desktop / Mobile Browser</span>
                        </>
                      )}
                    </div>

                    {isIOS ? (
                      <ol className="space-y-2 text-[11px] text-neutral-300 list-none">
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded bg-[#012456] text-sky-300 border border-sky-700 flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                          <span>Tap the Safari <strong className="text-sky-300">Share</strong> button <Share2 className="w-3 h-3 inline mx-0.5 text-sky-400" />.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded bg-[#012456] text-sky-300 border border-sky-700 flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                          <span>Scroll down and select <strong className="text-sky-300">Add to Home Screen</strong>.</span>
                        </li>
                      </ol>
                    ) : (
                      <ol className="space-y-2 text-[11px] text-neutral-300 list-none">
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded bg-[#012456] text-sky-300 border border-sky-700 flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                          <span>Tap the browser menu <strong className="text-neutral-100">(⋮)</strong> and select <strong className="text-neutral-100">Install app</strong> or <strong className="text-neutral-100">Add to Home screen</strong>.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded bg-[#012456] text-sky-300 border border-sky-700 flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                          <span>Confirm to launch SNA Terminal as an offline standalone app.</span>
                        </li>
                      </ol>
                    )}
                  </div>

                  {/* Manual trigger to set installed if user already added it */}
                  <div className="pt-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        handleMarkAsInstalled();
                      }}
                      className="text-[11px] text-neutral-400 hover:text-sky-300 transition-colors flex items-center gap-1 cursor-pointer py-1"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Already installed? Mark as Installed</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Bar with Primary "Back to Terminal" Action */}
            <div className="sticky bottom-0 z-20 bg-neutral-900 border-t border-neutral-800 px-4 py-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full min-h-[44px] py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Terminal</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        id="pwa-install-btn"
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-md active:scale-95 border transition-all text-xs font-mono focus-visible:ring-1 focus-visible:ring-sky-400 ${buttonThemeClass}`}
        title={isActuallyInstalled ? "App Installed & Offline Ready (Tap to view details)" : "Install App Locally"}
        aria-label="Install App"
      >
        {isActuallyInstalled ? (
          <>
            <ShieldCheck className={`w-3.5 h-3.5 ${iconThemeColor}`} />
            <span className="hidden sm:inline text-[10px] sm:text-[11px] font-semibold">Installed</span>
          </>
        ) : (
          <>
            <Download className={`w-3.5 h-3.5 ${iconThemeColor}`} />
            <span className="hidden sm:inline text-[10px] sm:text-[11px] font-semibold">Install</span>
          </>
        )}
      </button>

      {/* Render modal directly in document.body via Portal to prevent any container clipping */}
      {mounted && typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}


