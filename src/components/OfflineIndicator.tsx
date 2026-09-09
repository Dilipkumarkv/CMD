import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, HardDrive, WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);

  // If online, don't show the warning banner
  if (isOnline) {
    return null;
  }

  // If dismissed, show a tiny unobtrusive floating pill in the corner
  if (dismissed) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: 20 }}
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={() => setDismissed(false)}
        className="fixed bottom-16 right-3 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/90 border border-amber-600/70 text-amber-200 text-xs shadow-lg backdrop-blur-xs transition-colors"
        title="Tap to expand offline status"
      >
        <WifiOff className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-mono text-[11px]">Offline (Saved)</span>
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, x: "-50%" }}
        animate={{ opacity: 1, y: 0, x: "-50%" }}
        exit={{ opacity: 0, y: 20, x: "-50%" }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        id="offline-status-banner"
        role="status"
        aria-live="polite"
        className="fixed bottom-16 sm:bottom-20 left-1/2 z-40 w-[94%] max-w-md pointer-events-auto"
      >
        <div className="flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-neutral-900/95 border border-amber-500/50 shadow-2xl backdrop-blur-md text-neutral-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <WifiOff className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <span>Working Offline</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-neutral-300 truncate flex items-center gap-1">
                <HardDrive className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>Your progress is saved on this device</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded text-neutral-400 hover:text-white transition-colors shrink-0"
            title="Minimize offline banner"
            aria-label="Dismiss offline indicator"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
