import { ShellMode } from '../types/terminal';
import {
  TerminalSquare,
  Terminal,
  FileCode2,
} from 'lucide-react';

interface ShellBottomBarProps {
  shellMode: ShellMode;
  onSwitchMode: (mode: ShellMode) => void;
}

export function ShellBottomBar({
  shellMode,
  onSwitchMode,
}: ShellBottomBarProps) {
  const isPS = shellMode === 'ps';
  const isBash = shellMode === 'bash';
  const isCMD = shellMode === 'cmd';

  return (
    <footer
      id="terminal-bottom-bar"
      className="select-none border-t border-white/[0.08] bg-[#070B14]/95 backdrop-blur-md text-neutral-300 shrink-0 z-10 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex flex-col transition-colors"
    >
      {/* Terminal Mode Switcher Tabs - Expanded to use MAXIMUM space */}
      <nav
        aria-label="Terminal Environment Selection"
        className="w-full bg-black/50 p-1 rounded-xl border border-white/[0.08] flex items-center gap-1.5 shadow-inner"
      >
        {/* CMD Tab */}
        <button
          type="button"
          id="tab-cmd"
          onClick={() => onSwitchMode('cmd')}
          aria-selected={isCMD}
          className={`relative flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-lg text-xs sm:text-sm font-mono font-medium transition-all duration-150 active:scale-[0.98] ${
            isCMD
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_14px_rgba(16,185,129,0.3)] font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <TerminalSquare className={`w-4 h-4 shrink-0 ${isCMD ? 'text-emerald-400' : 'text-neutral-500'}`} />
          <span className="tracking-wide">CMD</span>
        </button>

        {/* PowerShell Tab */}
        <button
          type="button"
          id="tab-ps"
          onClick={() => onSwitchMode('ps')}
          aria-selected={isPS}
          className={`relative flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-lg text-xs sm:text-sm font-mono font-medium transition-all duration-150 active:scale-[0.98] ${
            isPS
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-[0_0_14px_rgba(14,165,233,0.3)] font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <Terminal className={`w-4 h-4 shrink-0 ${isPS ? 'text-sky-400' : 'text-neutral-500'}`} />
          <span className="tracking-wide">PowerShell</span>
        </button>

        {/* Bash Tab */}
        <button
          type="button"
          id="tab-bash"
          onClick={() => onSwitchMode('bash')}
          aria-selected={isBash}
          className={`relative flex-1 flex items-center justify-center gap-2 py-2 sm:py-2.5 px-3 rounded-lg text-xs sm:text-sm font-mono font-medium transition-all duration-150 active:scale-[0.98] ${
            isBash
              ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 shadow-[0_0_14px_rgba(217,70,239,0.3)] font-bold'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <FileCode2 className={`w-4 h-4 shrink-0 ${isBash ? 'text-fuchsia-400' : 'text-neutral-500'}`} />
          <span className="tracking-wide">Bash</span>
        </button>
      </nav>
    </footer>
  );
}
