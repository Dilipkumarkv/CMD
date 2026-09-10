import {
  RotateCcw,
  WifiOff,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';
import { ShellMode } from '../types/terminal';

interface ShellHeaderProps {
  shellMode: ShellMode;
  onQuickCommand: (cmd: string) => void;
  onOpenReset: () => void;
  toastMessage?: string | null;
  onHistoryPrev: () => void;
  onHistoryNext: () => void;
  canHistoryPrev: boolean;
  canHistoryNext: boolean;
}

const CMD_QUICK_COMMANDS = [
  'dir',
  'ipconfig /all',
  'tasklist',
  'netstat -ano',
  'systeminfo',
  'ping 127.0.0.1',
  'tracert 8.8.8.8',
  'driverquery',
  'tree',
  'whoami',
  'cls',
];

const PS_QUICK_COMMANDS = [
  'Get-ChildItem',
  'Get-Process',
  'Get-Service',
  'Test-NetConnection 8.8.8.8',
  'Get-NetIPAddress',
  'Get-NetAdapter',
  'Get-LocalUser',
  'Get-Disk',
  'Get-Date',
  'Clear-Host',
];

const BASH_QUICK_COMMANDS = [
  'ls -la',
  'pwd',
  'ps aux',
  'ifconfig',
  'netstat -tuln',
  'ping -c 3 8.8.8.8',
  'uname -a',
  'cat /etc/os-release',
  'df -h',
  'cat /etc/hosts',
  'clear',
];

export function ShellHeader({
  shellMode,
  onQuickCommand,
  onOpenReset,
  toastMessage,
  onHistoryPrev,
  onHistoryNext,
  canHistoryPrev,
  canHistoryNext,
}: ShellHeaderProps) {
  const isPS = shellMode === 'ps';
  const isBash = shellMode === 'bash';
  const isCMD = shellMode === 'cmd';
  const isOnline = useOnlineStatus();

  const commandList = isPS
    ? PS_QUICK_COMMANDS
    : isBash
    ? BASH_QUICK_COMMANDS
    : CMD_QUICK_COMMANDS;

  return (
    <header
      id="terminal-header"
      className="select-none border-b border-white/[0.08] bg-[#070B14]/95 backdrop-blur-md text-neutral-200 px-3 pt-2 pb-2 flex flex-col gap-2 shrink-0 transition-colors"
    >
      {/* 1. Dynamic Top Banner: Shows SNA Terminal App on left, and CMD/PS/BASH Online on right */}
      <div
        id="terminal-status-banner"
        className="flex items-center justify-between gap-3 text-xs font-mono select-none"
      >
        {/* SNA Terminal App Branding */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-6 h-6 rounded-md bg-neutral-900/90 border border-white/10 flex items-center justify-center shrink-0 shadow-inner transition-all duration-200 ${
              isCMD
                ? 'text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                : isPS
                ? 'text-sky-400 border-sky-500/30 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                : 'text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_10px_rgba(217,70,239,0.25)]'
            }`}
            aria-hidden="true"
          >
            <Terminal className="w-3.5 h-3.5" />
          </div>
          <span
            className={`font-bold font-mono tracking-tight text-xs sm:text-sm transition-colors duration-200 truncate ${
              isCMD
                ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.35)]'
                : isPS
                ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.35)]'
                : 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.35)]'
            }`}
          >
            SNA Terminal App
          </span>
        </div>

        {/* Right Side: CMD ONLINE / PS ONLINE / BASH ONLINE status (with colors matching shell), PWA Install, Reset VM */}
        <div className="flex items-center gap-2 shrink-0">
          {!isOnline ? (
            <span className="flex items-center gap-1 text-amber-400 font-mono font-bold tracking-wider text-[10px] sm:text-[11px]">
              <WifiOff className="w-3.5 h-3.5" />
              <span>{isCMD ? 'CMD OFFLINE' : isPS ? 'PS OFFLINE' : 'BASH OFFLINE'}</span>
            </span>
          ) : (
            <span
              className={`flex items-center gap-1.5 font-mono font-bold tracking-wider text-[10px] sm:text-[11px] transition-colors duration-200 ${
                isCMD
                  ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)]'
                  : isPS
                  ? 'text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]'
                  : 'text-fuchsia-400 drop-shadow-[0_0_6px_rgba(217,70,239,0.7)]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full transition-all duration-200 animate-pulse ${
                  isCMD
                    ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                    : isPS
                    ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.9)]'
                    : 'bg-fuchsia-400 shadow-[0_0_6px_rgba(217,70,239,0.9)]'
                }`}
              />
              <span>{isCMD ? 'CMD ONLINE' : isPS ? 'PS ONLINE' : 'BASH ONLINE'}</span>
            </span>
          )}

          <PWAInstallButton shellMode={shellMode} />

          <button
            type="button"
            id="reset-lab-btn"
            onClick={onOpenReset}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/30 text-rose-300 hover:text-rose-100 transition-all text-xs font-mono"
            title="Reset Virtual Machine"
            aria-label="Reset virtual machine"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline text-[10px] sm:text-[11px] text-rose-300 font-semibold">Reset</span>
          </button>
        </div>
      </div>

      {/* 2. Command Selection Strip with History Up/Down Navigation (No Clear button) */}
      <div
        id="quick-commands-strip"
        className="flex items-center gap-1.5 w-full bg-black/40 p-1 rounded-lg border border-white/[0.06] overflow-hidden"
      >
        {/* History Previous (Up) & Next (Down) Buttons */}
        <div className="flex items-center gap-1 shrink-0 pr-1 border-r border-white/[0.08]">
          <button
            type="button"
            disabled={!canHistoryPrev}
            onClick={onHistoryPrev}
            className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.05] hover:bg-white/[0.1] active:scale-90 text-neutral-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all border border-white/[0.06]"
            title="Previous command in history (Up Arrow)"
            aria-label="Previous command"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            disabled={!canHistoryNext}
            onClick={onHistoryNext}
            className="w-7 h-7 flex items-center justify-center rounded bg-white/[0.05] hover:bg-white/[0.1] active:scale-90 text-neutral-300 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-all border border-white/[0.06]"
            title="Next command in history (Down Arrow)"
            aria-label="Next command"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Horizontal Scrollable Quick Commands Strip */}
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 scroll-smooth">
          {commandList.map((cmd) => (
            <button
              key={cmd}
              type="button"
              onClick={() => onQuickCommand(cmd)}
              className={`shrink-0 text-xs font-mono py-1 px-2.5 rounded-md transition-all duration-150 active:scale-95 border cursor-pointer ${
                isCMD
                  ? 'bg-[#0B1420]/90 hover:bg-emerald-950/60 border-[#182C40] hover:border-emerald-500/50 text-neutral-200 hover:text-emerald-300'
                  : isPS
                  ? 'bg-[#0A1324]/90 hover:bg-sky-950/60 border-[#182A4A] hover:border-sky-500/50 text-neutral-200 hover:text-sky-300'
                  : 'bg-[#120D24]/90 hover:bg-fuchsia-950/60 border-[#2A1D46] hover:border-fuchsia-500/50 text-neutral-200 hover:text-fuchsia-300'
              }`}
              title={`Click to run: ${cmd}`}
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Notification Strip: Lights up with terminal name then shows like cmd.exe */}
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
                : isCMD
                ? 'bg-emerald-500/60'
                : isPS
                ? 'bg-sky-500/60'
                : 'bg-fuchsia-500/60'
            }`}
          />
          <span className="truncate font-medium">
            {toastMessage
              ? toastMessage
              : isCMD
              ? 'Windows Command Prompt (cmd.exe - v10.0)'
              : isPS
              ? 'Windows PowerShell (v5.1)'
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
