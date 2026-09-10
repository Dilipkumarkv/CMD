import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal } from 'lucide-react';

interface BootScreenProps {
  onComplete: () => void;
}

const BOOT_LOGS = [
  'Mounting virtual disk subsystem...',
  'Allocating memory pages & virtual partitions...',
  'Initializing CMD, PowerShell & Bash engines...',
  'Polytechnic practice curriculum loaded.',
  'Subsystems verified. Terminal ready.',
];

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    const logInterval = setInterval(() => {
      setLogIndex((prev) => (prev < BOOT_LOGS.length - 1 ? prev + 1 : prev));
    }, 1000);

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5100);

    return () => {
      clearInterval(logInterval);
      clearTimeout(timer);
    };
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#070B14] cyber-grid cyber-grid-cmd select-none overflow-hidden"
        >
          {/* Subtle Ambient Glow Behind Content */}
          <div className="absolute w-[360px] h-[360px] rounded-full bg-emerald-500/[0.04] blur-3xl pointer-events-none" />

          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center gap-5 p-6 max-w-sm w-full relative z-10"
          >
            {/* Terminal Badge with tri-flavor ring glow */}
            <motion.div
              animate={{
                boxShadow: [
                  '0px 0px 0px rgba(16, 185, 129, 0)',
                  '0px 0px 30px rgba(56, 189, 248, 0.25)',
                  '0px 0px 0px rgba(16, 185, 129, 0)',
                ],
              }}
              transition={{ duration: 2.2, repeat: Infinity }}
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-[#0B1322] border border-white/10 shadow-2xl flex items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-sky-500/10 to-fuchsia-500/10" />
              <Terminal className="w-8 h-8 text-emerald-400 relative z-10" strokeWidth={1.75} />
            </motion.div>

            {/* App Title & Subsystem Status */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
                <span>SNA Terminal App</span>
              </h1>

              {/* Status Pill */}
              <div className="flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] font-mono text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>ONLINE · ZERO NETWORK REQ</span>
              </div>
            </div>

            {/* Boot Sequence Log Text */}
            <div className="w-full max-w-xs bg-black/40 rounded-lg p-2.5 border border-white/[0.06] font-mono text-[11px] text-neutral-400 h-14 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-emerald-400/90 truncate">
                <span className="text-neutral-500">&gt;</span>
                <span className="truncate">{BOOT_LOGS[logIndex]}</span>
              </div>
            </div>

            {/* Loading Bar with Tri-Color Engine Gradient (CMD -> PS -> Bash) */}
            <div className="w-full max-w-xs h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 4.8, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-emerald-400 via-sky-400 to-fuchsia-400 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.6)]"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
