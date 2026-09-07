import { motion } from 'framer-motion';
import { BookOpen, HardDrive, RotateCcw, Terminal, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { PWAInstallButton } from './PWAInstallButton';

interface ShellHeaderProps {
  shellMode: 'cmd' | 'ps';
  onSwitchMode: (mode: 'cmd' | 'ps') => void;
  onOpenReset: () => void;
  onOpenCommands: () => void;
}

export function ShellHeader({
  shellMode,
  onSwitchMode,
  onOpenReset,
  onOpenCommands,
}: ShellHeaderProps) {
  const isPS = shellMode === 'ps';
  const isOnline = useOnlineStatus();

  return (
    <header
      id="terminal-header"
      className={`select-none border-b transition-colors duration-300 px-3 py-2 flex flex-col gap-2 ${
        isPS
          ? 'bg-[#011c40] border-sky-900/60 text-sky-100'
          : 'bg-[#121212] border-neutral-800 text-neutral-200'
      }`}
    >
      {/* Top Title Bar with Windows Style Dots & Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-colors duration-300 ${
              isPS
                ? 'bg-sky-500 text-[#012456]'
                : 'bg-neutral-700 text-neutral-200'
            }`}
          >
            {isPS ? '>_' : 'C:'}
          </div>
          <div className="min-w-0 flex items-baseline gap-1.5">
            <span className="text-xs font-semibold tracking-wide truncate">
              {isPS ? 'Windows PowerShell' : 'Command Prompt'}
            </span>
            <span
              className={`hidden xs:inline-block text-[10px] px-1.5 py-0.2 rounded font-mono transition-colors duration-300 ${
                isPS
                  ? 'bg-sky-950/80 text-sky-400 border border-sky-800/60'
                  : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
              }`}
            >
              {isPS ? 'v5.1' : 'cmd.exe'}
            </span>
          </div>
        </div>

        {/* Action Buttons: Install, Help & Reset */}
        <div className="flex items-center gap-1.5">
          <PWAInstallButton shellMode={shellMode} />

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            id="reset-lab-btn"
            onClick={onOpenReset}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 transition-colors"
            title="Reset lab virtual machine to clean state"
          >
            <RotateCcw className="w-3 h-3 text-rose-400" />
            <span className="hidden sm:inline">Reset Lab</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            id="view-commands-btn"
            onClick={onOpenCommands}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            title="Command Reference & Practice Guide (Basic to Advanced)"
            aria-label="Commands Guide"
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-medium">Commands</span>
          </motion.button>
        </div>
      </div>

      {/* Mode Switcher Segmented Control */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="inline-flex rounded bg-black/40 p-0.5 border border-white/10 w-full sm:w-auto relative">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            id="mode-cmd-toggle"
            onClick={() => onSwitchMode('cmd')}
            className={`relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
              !isPS
                ? 'text-neutral-100 font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {!isPS && (
              <motion.div
                layoutId="active-mode-bg"
                className="absolute inset-0 bg-neutral-800 rounded shadow-sm border border-neutral-700"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>CMD</span>
            </span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            id="mode-ps-toggle"
            onClick={() => onSwitchMode('ps')}
            className={`relative z-10 flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
              isPS
                ? 'text-white font-semibold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            {isPS && (
              <motion.div
                layoutId="active-mode-bg"
                className="absolute inset-0 bg-sky-700 rounded shadow-sm border border-sky-600"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-1.5">
              <span className="font-bold text-sky-300 text-[11px]">PS</span>
              <span>PowerShell</span>
            </span>
          </motion.button>
        </div>

        {/* Live Device Storage / Offline Status */}
        <div className="hidden xs:flex items-center gap-1.5 text-[11px] font-mono">
          {!isOnline ? (
            <motion.span 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60 font-medium"
            >
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span>Offline &bull; Progress saved on device</span>
            </motion.span>
          ) : (
            <span className="flex items-center gap-1 text-slate-400">
              <HardDrive className="w-3 h-3 text-emerald-500" />
              <span>Offline-ready &bull; Synced VM</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
