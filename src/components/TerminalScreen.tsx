import { motion } from 'framer-motion';
import { AlertCircle, Copy, Terminal } from 'lucide-react';
import { FormEvent, MouseEvent, useEffect, useState, KeyboardEvent } from 'react';
import { TerminalEntry } from '../types/terminal';

interface TerminalScreenProps {
  entries: TerminalEntry[];
  shellMode: 'cmd' | 'ps';
  currentPrompt: string;
  terminalColors?: { bg: string | undefined; fg: string | undefined };
  inputValue: string;
  onChangeInput: (val: string) => void;
  onSubmit: (e?: FormEvent) => void;
  onReuseCommand: (cmd: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
}

function StreamedOutput({ content }: { content: string }) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    // If output is relatively short, display instantly
    if (content.length < 500) {
      setDisplayed(content);
      return;
    }

    let i = 0;
    const chunkSize = Math.max(150, Math.floor(content.length / 10)); // Stream over ~10 frames or 150 chars/tick
    
    const interval = setInterval(() => {
      i += chunkSize;
      if (i >= content.length) {
        setDisplayed(content);
        clearInterval(interval);
      } else {
        setDisplayed(content.slice(0, i));
      }
    }, 16);

    return () => clearInterval(interval);
  }, [content]);

  return <>{displayed}</>;
}

export function TerminalScreen({
  entries,
  shellMode,
  currentPrompt,
  terminalColors,
  inputValue,
  onChangeInput,
  onSubmit,
  onReuseCommand,
  onKeyDown,
}: TerminalScreenProps) {
  const isPS = shellMode === 'ps';
  // Auto-scroll to bottom
  useEffect(() => {
    const viewport = document.getElementById('terminal-scroll-area');
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [entries, inputValue]);

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    // If clicking a button or selecting text, don't hijack focus
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    
    // On touch devices, do not aggressively hijack focus on background tap.
    if (window.matchMedia('(pointer: coarse)').matches) return;

    // Default to focusing the input for desktop users
    document.getElementById('terminal-input')?.focus();
  };

  const renderEntry = (index: number, entry: TerminalEntry) => {
    if (entry.type === 'system') {
      return (
        <div key={entry.id} className="py-1 px-2.5 rounded bg-blue-950/60 border border-blue-800/50 text-blue-300 text-[11px] sm:text-xs flex items-center gap-1.5 my-1">
          <Terminal className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{entry.output}</span>
        </div>
      );
    }

    if (entry.type === 'input') {
      const isEntryPS = entry.shell === 'ps';
      return (
        <div
          key={entry.id}
          className="group relative flex items-baseline gap-1.5 flex-wrap cursor-pointer hover:bg-white/5 p-1 rounded transition-colors"
          onClick={() => entry.commandText && onReuseCommand(entry.commandText)}
          title="Tap to reuse this command"
        >
          <span className={`font-semibold whitespace-nowrap ${isEntryPS ? 'text-sky-300' : 'text-neutral-400'}`}>
            {entry.prompt || (isEntryPS ? `PS ${currentPrompt}>` : `${currentPrompt}>`)}
          </span>
          <span className={`font-bold flex-1 ${!terminalColors?.fg ? (isEntryPS ? 'text-white' : 'text-emerald-300') : ''}`}>
            {entry.commandText}
          </span>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] px-1 py-0.5 rounded bg-white/10 text-white/70 flex items-center gap-0.5">
            <Copy className="w-2.5 h-2.5" />
            <span className="hidden sm:inline">Tap to reuse</span>
          </span>
        </div>
      );
    }

    if (entry.type === 'error') {
      return (
        <div
          key={entry.id}
          className={`my-1.5 p-2 sm:p-2.5 rounded border text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed shadow-sm ${
            entry.shell === 'ps' ? 'bg-rose-950/80 border-rose-700 text-rose-200' : 'bg-red-950/70 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-rose-400 font-semibold mb-1 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>Command Error / Syntax Warning</span>
          </div>
          <div className="font-mono">{entry.output}</div>
        </div>
      );
    }

    return (
      <div
        key={entry.id}
        className={`whitespace-pre-wrap font-mono leading-relaxed pl-1 ${!terminalColors?.fg ? (entry.shell === 'ps' ? 'text-sky-100' : 'text-[#cccccc]') : ''}`}
      >
        {index === entries.length - 1 ? <StreamedOutput content={entry.output || ''} /> : entry.output}
      </div>
    );
  };

  return (
    <div
      onClick={handleContainerClick}
      className={`flex-1 overflow-hidden p-3 sm:p-4 font-mono text-xs sm:text-sm transition-colors duration-300 select-text ${
        !terminalColors?.bg ? (isPS ? 'bg-[#012456] text-[#e0f2fe]' : 'bg-[#0c0c0c] text-[#cccccc]') : ''
      }`}
      style={{
        ...(terminalColors?.bg && { backgroundColor: terminalColors.bg }),
        ...(terminalColors?.fg && { color: terminalColors.fg }),
      }}
    >
      <div 
        id="terminal-scroll-area"
        className="h-full w-full overflow-y-auto custom-scrollbar pr-2 pb-12"
      >
        <div className="flex flex-col">
          {entries.map((entry, index) => renderEntry(index, entry))}
        </div>
        
        <form onSubmit={onSubmit} className="flex items-baseline gap-1.5 pl-1 py-4 mt-2 w-full cursor-text" onClick={() => document.getElementById('terminal-input')?.focus()}>
          <span className={`font-semibold whitespace-nowrap ${isPS ? 'text-sky-300' : 'text-neutral-400'}`}>
            {isPS ? `PS ${currentPrompt}>` : `${currentPrompt}>`}
          </span>
          <input
            id="terminal-input"
            type="text"
            value={inputValue}
            onChange={(e) => onChangeInput(e.target.value)}
            onKeyDown={onKeyDown}
            className={`flex-1 bg-transparent border-none outline-none p-0 m-0 font-mono font-bold placeholder-white/20 focus:ring-0 text-xs sm:text-sm terminal-caret ${
              !terminalColors?.fg ? 'text-white' : ''
            }`}
            style={terminalColors?.fg ? { color: terminalColors.fg } : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
}
