import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Download,
  HardDrive,
  Laptop,
  Share2,
  ShieldCheck,
  Smartphone,
  X,
} from 'lucide-react';
import { MouseEvent, useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'standalone';
  shellMode?: 'cmd' | 'ps';
}

export function PWAInstallButton({ variant = 'header', shellMode = 'cmd' }: PWAInstallButtonProps) {
  const { isInstallable, isInstalled, isIOS, isDismissed, install, dismissPrompt } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'device' | 'desktop' | 'mobile'>('device');
  const isPS = shellMode === 'ps';

  const isActuallyInstalled = isInstalled || justInstalled;

  const handleInstallClick = async () => {
    if (isActuallyInstalled) {
      setShowModal(true);
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
    setShowModal(true);
  };

  const handleCloseModal = (e?: MouseEvent) => {
    e?.stopPropagation();
    setShowModal(false);
  };

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        type="button"
        id="pwa-install-btn"
        onClick={handleInstallClick}
        className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors shadow-xs ${
          isActuallyInstalled
            ? 'bg-[#012456] hover:bg-[#01357d] text-sky-200 border border-sky-600/80'
            : 'bg-[#012456] hover:bg-[#01357d] text-sky-100 border border-sky-500/80 hover:border-sky-400'
        }`}
        title={
          isActuallyInstalled
            ? 'SNA Terminal Lab is installed as a PWA (Click for offline status & details)'
            : 'Install SNA Terminal Lab for offline home screen / desktop access'
        }
        aria-label={isActuallyInstalled ? 'App is installed' : 'Install SNA Terminal Lab'}
      >
        {isActuallyInstalled ? (
          <Check className="w-3.5 h-3.5 shrink-0 text-sky-400" />
        ) : (
          <Download className="w-3.5 h-3.5 shrink-0 text-sky-400" />
        )}
        <span className="hidden sm:inline font-medium">
          {isActuallyInstalled ? 'Installed' : 'Install'}
        </span>
      </motion.button>

      {/* Interactive Modal: Guided Install or Installed Status */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={handleCloseModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-lg bg-neutral-900 border border-neutral-800 p-5 shadow-2xl text-neutral-100 space-y-4 font-mono select-none"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded flex items-center justify-center bg-[#012456] border border-sky-500/80 text-sky-400">
                    {isActuallyInstalled ? (
                      <ShieldCheck className="w-4 h-4" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-100">
                      {isActuallyInstalled ? 'SNA Terminal Lab (PWA)' : 'Install SNA Terminal Lab'}
                    </h3>
                    <p className="text-[11px] text-neutral-400">
                      {isActuallyInstalled ? 'Application is installed & offline ready' : 'Standalone Desktop & Mobile Experience'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: Installed State Info */}
              {isActuallyInstalled ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded bg-neutral-950 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Status:</span>
                      <span className="text-sky-300 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-sky-400" /> Installed & Running
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Offline Capability:</span>
                      <span className="text-neutral-200">100% Zero Network Lab</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400">Virtual State:</span>
                      <span className="text-neutral-200">Persisted locally in storage</span>
                    </div>
                  </div>

                  <div className="rounded bg-[#012456]/40 border border-sky-800/60 p-3 space-y-1.5 text-[11px] text-sky-200">
                    <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                      Standalone Window Advantage
                    </div>
                    <p className="text-sky-200/90 leading-relaxed">
                      SNA Terminal Lab runs as an independent application window without browser chrome. All curriculum exercises, simulated disks, services, and file system states remain saved on your device.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="w-full py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
                  >
                    Done
                  </button>
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
                          setShowModal(false);
                        }
                      }}
                      className="w-full py-2.5 rounded bg-[#012456] hover:bg-[#02357a] text-sky-100 border border-sky-500/80 font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4 text-sky-400" />
                      <span>Install Directly to Device</span>
                    </button>
                  )}

                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    Install SNA Terminal Lab to run completely offline without an active internet connection, with full-screen window access and your practice state securely saved on this device.
                  </p>

                  {/* Device-Specific Steps */}
                  <div className="p-3 rounded bg-neutral-950 border border-neutral-800 space-y-2.5">
                    <div className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                      {isIOS ? (
                        <>
                          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                          <span>iOS Safari (iPhone / iPad)</span>
                        </>
                      ) : (
                        <>
                          <Laptop className="w-3.5 h-3.5 text-sky-400" />
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
                          <span>Click the <strong className="text-neutral-100">Install</strong> icon in your browser address bar (top right) or browser menu.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded bg-[#012456] text-sky-300 border border-sky-700 flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                          <span>Confirm <strong className="text-neutral-100">Install</strong> to launch as a standalone desktop window.</span>
                        </li>
                      </ol>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

