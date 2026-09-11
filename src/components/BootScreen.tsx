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
    }, 550);

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2800);

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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000] cyber-grid cyber-grid-cmd select-none overflow-hidden"
        >
          {/* Subtle Ambient Cyber Green Glow Behind Content */}
          <div className="absolute w-[400px] h-[400px] rounded-full bg-[#00FF66]/[0.07] blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center justify-center gap-5 p-6 max-w-sm w-full relative z-10">
            {/* Terminal Badge in UHD Black with Glowing Cyber Green Icon */}
            <motion.div
              animate={{
                boxShadow: [
                  '0px 0px 15px rgba(0, 255, 102, 0.2)',
                  '0px 0px 35px rgba(0, 255, 102, 0.45)',
                  '0px 0px 15px rgba(0, 255, 102, 0.2)',
                ],
              }}
              transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
              className="w-18 h-18 rounded-2xl bg-[#000000] border-2 border-[#00FF66]/40 shadow-2xl flex items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-radial from-[#00FF66]/15 via-transparent to-transparent pointer-events-none" />
              <Terminal className="w-9 h-9 text-[#00FF66] relative z-10 drop-shadow-[0_0_12px_rgba(0,255,102,0.9)]" strokeWidth={2} />
            </motion.div>

            {/* App Title & Subsystem Status */}
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
                <span>SNA Terminal App</span>
              </h1>

              {/* Status Pill */}
              <div className="flex items-center gap-2 px-3 py-0.5 rounded-full bg-[#00FF66]/[0.05] border border-[#00FF66]/20 text-[11px] font-mono text-[#00FF66]">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] animate-pulse shadow-[0_0_10px_rgba(0,255,102,1)]" />
                <span className="font-semibold tracking-wider">PWA Virtual Machine</span>
              </div>
            </div>

            {/* Boot Sequence Log Text */}
            <div className="w-full max-w-xs bg-black/70 rounded-lg p-2.5 border border-[#00FF66]/15 font-mono text-[11px] text-neutral-300 h-14 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[#00FF66] truncate">
                <span className="text-[#00FF66]/60">&gt;</span>
                <span className="truncate text-neutral-200">{BOOT_LOGS[logIndex]}</span>
              </div>
            </div>

            {/* Loading Bar in Cyber Green Glow */}
            <div className="w-full max-w-xs h-[3px] bg-[#00FF66]/15 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.6, ease: 'easeInOut' }}
                className="h-full bg-gradient-to-r from-[#00FF66] via-emerald-400 to-[#00E676] rounded-full shadow-[0_0_14px_rgba(0,255,102,0.9)]"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
