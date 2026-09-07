import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface CommandInputBarProps {
  shellMode: 'cmd' | 'ps';
  onHistoryPrev: () => void;
  onHistoryNext: () => void;
  canHistoryPrev: boolean;
  canHistoryNext: boolean;
  onQuickCommand: (cmd: string) => void;
}

export function CommandInputBar({
  shellMode,
  onHistoryPrev,
  onHistoryNext,
  canHistoryPrev,
  canHistoryNext,
  onQuickCommand,
}: CommandInputBarProps) {
  const isPS = shellMode === 'ps';

  const quickChips = isPS
    ? ['Get-ChildItem', 'Get-Process', 'Get-Service', 'Clear-Host']
    : ['dir', 'tasklist', 'ipconfig', 'cls'];

  return (
    <div
      id="terminal-input-container"
      className={`border-t select-none px-2.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2.5 transition-colors duration-300 ${
        isPS
          ? 'bg-[#011c40] border-sky-900/80 text-sky-100'
          : 'bg-[#141414] border-neutral-800 text-neutral-200'
      }`}
    >
      {/* Quick Action Chips & History Touch Stepper */}
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1 min-w-0 pb-0.5">
          {quickChips.map((chip) => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={chip}
              type="button"
              onClick={() => onQuickCommand(chip)}
              className="px-2.5 py-1 min-h-[32px] rounded bg-black/40 hover:bg-black/70 text-slate-300 border border-white/10 shrink-0 font-mono text-xs transition-colors"
            >
              {chip}
            </motion.button>
          ))}
        </div>

        {/* Touch History Up/Down Arrow Stepper (One-handed thumb friendly) */}
        <div className="flex items-center gap-0.5 shrink-0 bg-black/40 rounded p-0.5 border border-white/10 pb-0.5 mb-0.5">
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            id="history-prev-btn"
            disabled={!canHistoryPrev}
            onClick={onHistoryPrev}
            className="w-8 h-7.5 flex items-center justify-center rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Previous command in history (Up Arrow)"
            aria-label="Previous command"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <span className="text-[10px] text-slate-400 font-mono px-0.5">Hist</span>
          <motion.button
            whileTap={{ scale: 0.85 }}
            type="button"
            id="history-next-btn"
            disabled={!canHistoryNext}
            onClick={onHistoryNext}
            className="w-8 h-7.5 flex items-center justify-center rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Next command in history (Down Arrow)"
            aria-label="Next command"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
