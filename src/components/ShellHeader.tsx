import { motion } from 'motion/react';
import {
  HardDrive,
  RotateCcw,
  Terminal,
  TerminalSquare,
  FileCode2,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';
import { ShellMode } from '../types/terminal';

interface ShellHeaderProps {
  shellMode: ShellMode;
  onSwitchMode: (mode: ShellMode) => void;
  onOpenReset: () => void;
  toastMessage?: string | null;
}

export function ShellHeader({
  shellMode,
  onSwitchMode,
  onOpenReset,
  toastMessage,
}: ShellHeaderProps) {
  const isPS = shellMode === 'ps';
  const isBash = shellMode === 'bash';
  const isCMD = shellMode === 'cmd';
  const isOnline = useOnlineStatus();

  return (
    <header
      id="terminal-header"
      className="select-none border-b border-white/[0.08] bg-[#0A0C0F] text-neutral-200 px-3 pt-2.5 pb-2 flex flex-col gap-2 shrink-0 transition-colors"
    >
      {/* Top Application Bar */}
      <div className="flex items-center justify-between gap-3">
        {/* Brand & Context */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-neutral-900/90 border border-white/10 flex items-center justify-center shrink-0 shadow-inner">
            <Terminal className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-neutral-100 truncate font-mono">
                SNA Terminal Lab
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-white/[0.06] text-neutral-400 border border-white/[0.06]">
                Omni-Term
              </span>
            </div>
            <span className="text-[10px] text-neutral-400 font-mono truncate hidden xs:block">
              Polytechnic System & Network Admin Practice
            </span>
          </div>
        </div>

        {/* Global Actions: Install, Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <PWAInstallButton shellMode={shellMode} />

          <button
            type="button"
            id="reset-lab-btn"
            onClick={onOpenReset}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/20 text-rose-300 hover:text-rose-200 transition-all text-xs font-mono focus-visible:ring-1 focus-visible:ring-rose-400"
            title="Reset lab virtual environment"
            aria-label="Reset virtual machine"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline font-medium">Reset VM</span>
          </button>
        </div>
      </div>

      {/* Segmented Terminal Mode Switcher */}
      <nav
        aria-label="Terminal Environment Selection"
        className="w-full bg-black/40 p-1 rounded-lg border border-white/[0.06] flex items-center gap-1"
      >
        {/* CMD Tab */}
        <button
          type="button"
          onClick={() => onSwitchMode('cmd')}
          aria-selected={isCMD}
          className={`relative flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-all duration-150 active:scale-[0.98] ${
            isCMD
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_1px_10px_rgba(16,185,129,0.15)]'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03] border border-transparent'
          }`}
        >
          <TerminalSquare className={`w-3.5 h-3.5 ${isCMD ? 'text-emerald-400' : 'text-neutral-500'}`} />
          <span className="font-semibold">CMD</span>
        </button>

        {/* PowerShell Tab */}
        <button
          type="button"
          onClick={() => onSwitchMode('ps')}
          aria-selected={isPS}
          className={`relative flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-all duration-150 active:scale-[0.98] ${
            isPS
              ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-[0_1px_10px_rgba(14,165,233,0.15)]'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03] border border-transparent'
          }`}
        >
          <Terminal className={`w-3.5 h-3.5 ${isPS ? 'text-sky-400' : 'text-neutral-500'}`} />
          <span className="font-semibold">
            <span className="hidden sm:inline">PowerShell</span>
            <span className="inline sm:hidden">PS</span>
          </span>
        </button>

        {/* Bash Tab */}
        <button
          type="button"
          onClick={() => onSwitchMode('bash')}
          aria-selected={isBash}
          className={`relative flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-all duration-150 active:scale-[0.98] ${
            isBash
              ? 'bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/30 shadow-[0_1px_10px_rgba(217,70,239,0.15)]'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03] border border-transparent'
          }`}
        >
          <FileCode2 className={`w-3.5 h-3.5 ${isBash ? 'text-fuchsia-400' : 'text-neutral-500'}`} />
          <span className="font-semibold">Bash</span>
        </button>
      </nav>

      {/* In-Place Context & Notification Strip (Zero CLS - Stable 24px Height) */}
      <div
        id="terminal-status-strip"
        className={`h-6 w-full rounded px-2.5 flex items-center justify-between text-[11px] font-mono border transition-all duration-200 ${
          toastMessage
            ? isCMD
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : isPS
              ? 'bg-sky-950/40 border-sky-500/30 text-sky-300'
              : 'bg-fuchsia-950/40 border-fuchsia-500/30 text-fuchsia-300'
            : 'bg-black/30 border-white/[0.04] text-neutral-400'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
              toastMessage
                ? isCMD
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.9)] animate-pulse'
                  : isPS
                  ? 'bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.9)] animate-pulse'
                  : 'bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.9)] animate-pulse'
                : 'bg-neutral-600'
            }`}
          />
          <span className="truncate font-medium">
            {toastMessage
              ? toastMessage
              : isCMD
              ? 'Windows Command Prompt (cmd.exe)'
              : isPS
              ? 'Windows PowerShell (v5.1 Console Host)'
              : 'GNU/Linux Bash Shell (v5.1.16)'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 pl-2">
          {!isOnline ? (
            <span className="flex items-center gap-1 text-amber-400 text-[10px]">
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline Mode</span>
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1 text-neutral-400 text-[10px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
              <span>VM Ready</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

