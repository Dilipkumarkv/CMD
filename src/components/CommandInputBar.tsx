import { ShellMode } from '../types/terminal';
import { History, ChevronUp, ChevronDown } from 'lucide-react';
import { useRef } from 'react';

interface CommandInputBarProps {
  shellMode: ShellMode;
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
  const isBash = shellMode === 'bash';
  const isCMD = shellMode === 'cmd';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const quickChips = isPS
    ? ['Get-ChildItem', 'ipconfig /all', 'Get-Process', 'Get-Service', 'Clear-Host']
    : isBash
    ? ['ls -la', 'pwd', 'sudo', 'mkdir', 'grep', 'clear']
    : ['dir', 'ipconfig /all', 'tasklist', 'cls'];

  return (
    <div
      id="terminal-input-container"
      className="border-t border-white/[0.08] select-none px-2.5 sm:px-3 py-1.5 sm:py-2 bg-[#0A0C0F] text-neutral-300 shrink-0 z-10 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-between gap-3 text-xs">
        {/* Quick Action Chips Toolbar with subtle scroll controls */}
        <div className="relative flex items-center flex-1 min-w-0 overflow-hidden">
          {/* Scrollable chip container */}
          <div
            ref={scrollContainerRef}
            id="command-selection-box"
            role="toolbar"
            aria-label="Quick Command Suggestions"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 pr-4 pl-0.5 scroll-smooth"
          >
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => onQuickCommand(chip)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-mono shrink-0 transition-all duration-150 cursor-pointer border active:scale-95 select-none ${
                  isCMD
                    ? 'bg-emerald-500/[0.08] border-emerald-500/25 text-emerald-300 hover:text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-500/40'
                    : isPS
                    ? 'bg-sky-500/[0.08] border-sky-500/25 text-sky-300 hover:text-sky-100 hover:bg-sky-500/20 hover:border-sky-500/40'
                    : 'bg-fuchsia-500/[0.08] border-fuchsia-500/25 text-fuchsia-300 hover:text-fuchsia-100 hover:bg-fuchsia-500/20 hover:border-fuchsia-500/40'
                }`}
                title={`Insert or execute: ${chip}`}
                aria-label={`Command ${chip}`}
              >
                <span>{chip}</span>
              </button>
            ))}
          </div>

          {/* Right edge subtle gradient fade */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0A0C0F] to-transparent" />
        </div>

        {/* Command History Navigation (Up/Down Stepper) */}
        <div className="flex items-center gap-1 shrink-0 pl-2.5 border-l border-white/[0.08]">
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-neutral-400 font-mono mr-1">
            <History className="w-3.5 h-3.5 text-neutral-400" />
            <span>History</span>
          </span>

          <button
            type="button"
            disabled={!canHistoryPrev}
            onClick={onHistoryPrev}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.1] active:scale-95 text-neutral-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-all border border-white/[0.06] focus-visible:ring-1 focus-visible:ring-emerald-400"
            title="Previous command in history (Up Arrow)"
            aria-label="Previous command"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={!canHistoryNext}
            onClick={onHistoryNext}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.1] active:scale-95 text-neutral-300 hover:text-white disabled:opacity-25 disabled:pointer-events-none transition-all border border-white/[0.06] focus-visible:ring-1 focus-visible:ring-emerald-400"
            title="Next command in history (Down Arrow)"
            aria-label="Next command"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
