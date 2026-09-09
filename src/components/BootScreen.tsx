import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal } from 'lucide-react';

interface BootScreenProps {
  onComplete: () => void;
}

export const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2200); // 2.2 second display for smoother loading feel

    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={onComplete}>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 5 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center justify-center gap-6"
          >
            <motion.div 
              animate={{ 
                boxShadow: ['0px 0px 0px rgba(16, 185, 129, 0)', '0px 0px 40px rgba(16, 185, 129, 0.15)', '0px 0px 0px rgba(16, 185, 129, 0)'] 
              }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 rounded-2xl bg-[#080d1a] border border-emerald-900/40 shadow-2xl flex items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
              <Terminal className="w-10 h-10 text-emerald-400 relative z-10" strokeWidth={1.5} />
            </motion.div>
            
            <div className="flex flex-col items-center gap-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-mono flex items-center gap-1">
                SNA Terminal Lab
              </h1>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="mt-1 flex items-center gap-2 text-xs font-mono text-emerald-400/70"
              >
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
                />
                Booting System...
              </motion.div>
            </div>
            
            {/* Loading Bar */}
            <div className="mt-4 w-56 h-[3px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
                className="h-full bg-gradient-to-r from-emerald-500/50 to-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
