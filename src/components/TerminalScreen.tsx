import { motion } from 'motion/react';
import { AlertCircle, Copy, Info, Terminal, SendHorizontal, CornerDownLeft } from 'lucide-react';
import { FormEvent, MouseEvent, useEffect, useState, KeyboardEvent, useCallback } from 'react';
import { TerminalEntry, ShellMode } from '../types/terminal';
import { formatTerminalOutput } from '../utils/formatOutput';
import { useTypewriter } from '../hooks/useTypewriter';
import { CommandExplainCard } from './CommandExplainCard';

interface TerminalScreenProps {
  entries: TerminalEntry[];
  shellMode: ShellMode;
  currentPrompt: string;
  terminalColors?: { bg: string | undefined; fg: string | undefined };
  inputValue: string;
  onChangeInput: (val: string) => void;
  onSubmit: (e?: FormEvent) => void;
  onReuseCommand: (cmd: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  streamedIds?: Set<string>;
  onMarkStreamed?: (id: string) => void;
}

function StreamedOutput({
  content,
  shell,
  onComplete,
}: {
  content: string;
  shell: ShellMode;
  onComplete?: () => void;
}) {
  const { displayedText, isTyping } = useTypewriter({
    content,
    onTick: () => {
      const viewport = document.getElementById('terminal-scroll-area');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    },
    onComplete,
  });

  return (
    <>
      {formatTerminalOutput(displayedText, shell)}
      {isTyping && <span className="terminal-block-cursor opacity-80" />}
    </>
  );
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
  streamedIds,
  onMarkStreamed,
}: TerminalScreenProps) {
  const isPS = shellMode === 'ps';
  const isBash = shellMode === 'bash';
  const isCMD = shellMode === 'cmd';
  const [flashedId, setFlashedId] = useState<string | null>(null);
  const [expandedExplainIds, setExpandedExplainIds] = useState<Record<string, boolean>>({});

  const toggleExplain = useCallback((cmdId: string) => {
    setExpandedExplainIds((prev) => {
      const isNowExpanded = !prev[cmdId];
      if (isNowExpanded) {
        setTimeout(() => {
          const viewport = document.getElementById('terminal-scroll-area');
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          }
        }, 120);
      }
      return { ...prev, [cmdId]: isNowExpanded };
    });
  }, []);

  // Auto-scroll to bottom on output change and when virtual keyboard closes/resizes
  useEffect(() => {
    const scrollToBottom = () => {
      const viewport = document.getElementById('terminal-scroll-area');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    };

    scrollToBottom();
    const t1 = setTimeout(scrollToBottom, 60);
    const t2 = setTimeout(scrollToBottom, 180);
    const t3 = setTimeout(scrollToBottom, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [entries, inputValue]);

  useEffect(() => {
    const handleResize = () => {
      const viewport = document.getElementById('terminal-scroll-area');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
      const activeInput = document.getElementById('terminal-input');
      activeInput?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    // If selecting text or clicking buttons/interactive elements, don't hijack focus
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    const inputEl = document.getElementById('terminal-input') as HTMLInputElement | null;
    if (inputEl) {
      inputEl.focus();
      const viewport = document.getElementById('terminal-scroll-area');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  const renderEntry = (index: number, entry: TerminalEntry) => {
    if (entry.type === 'system') {
      return (
        <div
          key={entry.id}
          className="py-1 px-3 rounded bg-blue-950/40 border border-blue-800/40 text-blue-300 text-xs flex items-center gap-2 my-1.5 font-mono"
        >
          <Terminal className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="leading-snug">{entry.output}</span>
        </div>
      );
    }

    if (entry.type === 'input') {
      const nextEntry = entries[index + 1];
      const hasFollowUpOutput = nextEntry && (nextEntry.type === 'output' || nextEntry.type === 'error');
      const isExplainCmd = (entry.commandText || '').trim().toLowerCase().startsWith('explain ');

      return (
        <div key={entry.id} className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className={`group relative flex items-baseline gap-1.5 p-1 rounded-md transition-all duration-150 my-0.5 ${
              flashedId === entry.id ? 'flash-highlight bg-white/[0.08]' : 'hover:bg-white/[0.04]'
            }`}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              if (!target.closest('.explain-btn') && entry.commandText) {
                setFlashedId(entry.id);
                onReuseCommand(entry.commandText);
                setTimeout(() => setFlashedId(null), 500);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if ((e.key === 'Enter' || e.key === ' ') && entry.commandText) {
                e.preventDefault();
                onReuseCommand(entry.commandText);
              }
            }}
            title="Click to copy and reuse this command"
            aria-label={`Command: ${entry.commandText}. Tap to reuse.`}
          >
            {/* Prompt prefix */}
            <span
              className={`font-semibold select-none shrink-0 whitespace-nowrap ${
                entry.shell === 'ps'
                  ? 'text-sky-300'
                  : entry.shell === 'bash'
                  ? 'text-fuchsia-300'
                  : 'text-neutral-400'
              }`}
            >
              {entry.prompt || currentPrompt}
            </span>

            {/* Command text */}
            <span
              className={`font-bold min-w-0 break-words ${
                !terminalColors?.fg
                  ? entry.shell === 'cmd'
                    ? 'text-emerald-300'
                    : 'text-white'
                  : ''
              }`}
            >
              {entry.commandText}
            </span>

            {/* Action pills: Desktop hover only */}
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex items-center gap-1.5 pointer-events-none group-hover:pointer-events-auto bg-[#080A0D]/90 px-1.5 py-0.5 rounded shadow-sm border border-white/10">
              <button
                type="button"
                className="explain-btn text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-sky-200 flex items-center gap-1 transition-colors font-mono cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExplain(entry.id);
                }}
                title="Explain what this command does"
                aria-label="Explain command"
              >
                <Info className="w-2.5 h-2.5" />
                <span>{expandedExplainIds[entry.id] ? 'Hide' : 'Explain'}</span>
              </button>
              <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-neutral-300 flex items-center gap-1 font-mono">
                <Copy className="w-2.5 h-2.5" />
                <span>Reuse</span>
              </span>
            </div>
          </motion.div>

          {/* If command produced no output, render explain card right under input */}
          {!hasFollowUpOutput && entry.commandText && !isExplainCmd && (
            <CommandExplainCard
              commandText={entry.commandText}
              shellMode={entry.shell}
              isExpanded={!!expandedExplainIds[entry.id]}
              onToggle={() => toggleExplain(entry.id)}
              onReuseCommand={onReuseCommand}
            />
          )}
        </div>
      );
    }

    if (entry.type === 'error') {
      const prevEntry = entries[index - 1];
      const prevIsInput = prevEntry && prevEntry.type === 'input' && prevEntry.commandText;
      const isExplainCmd = prevIsInput && (prevEntry.commandText || '').trim().toLowerCase().startsWith('explain ');

      return (
        <div key={entry.id} className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className={`my-2 p-3 rounded-md border text-xs font-mono whitespace-pre-wrap leading-relaxed shadow-sm ${
              entry.shell === 'ps'
                ? 'bg-rose-950/60 border-rose-800/60 text-rose-200'
                : entry.shell === 'bash'
                ? 'bg-rose-950/50 border-rose-800/50 text-rose-300'
                : 'bg-red-950/50 border-red-800/50 text-red-300'
            }`}
          >
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold mb-1.5 text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Command Error / Syntax Diagnostic</span>
            </div>
            <div className="font-mono pl-5">{entry.output}</div>
          </motion.div>

          {prevIsInput && !isExplainCmd && (
            <CommandExplainCard
              commandText={prevEntry.commandText!}
              shellMode={prevEntry.shell}
              isExpanded={!!expandedExplainIds[prevEntry.id]}
              onToggle={() => toggleExplain(prevEntry.id)}
              onReuseCommand={onReuseCommand}
            />
          )}
        </div>
      );
    }

    const isStreamed = streamedIds ? streamedIds.has(entry.id) : entry.instant;
    const shouldStream = !isStreamed && !entry.instant && index === entries.length - 1;
    const prevEntry = entries[index - 1];
    const prevIsInput = prevEntry && prevEntry.type === 'input' && prevEntry.commandText;
    const isExplainCmd = prevIsInput && (prevEntry.commandText || '').trim().toLowerCase().startsWith('explain ');

    return (
      <div key={entry.id} className="flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12 }}
          className={`whitespace-pre-wrap font-mono leading-relaxed pl-1 my-0.5 ${
            !terminalColors?.fg ? 'text-neutral-300' : ''
          }`}
        >
          {shouldStream ? (
            <StreamedOutput
              content={entry.output || ''}
              shell={entry.shell}
              onComplete={() => onMarkStreamed?.(entry.id)}
            />
          ) : (
            formatTerminalOutput(entry.output || '', entry.shell)
          )}
        </motion.div>

        {prevIsInput && !isExplainCmd && (
          <CommandExplainCard
            commandText={prevEntry.commandText!}
            shellMode={prevEntry.shell}
            isExpanded={!!expandedExplainIds[prevEntry.id]}
            onToggle={() => toggleExplain(prevEntry.id)}
            onReuseCommand={onReuseCommand}
          />
        )}
      </div>
    );
  };

  return (
    <main
      onClick={handleContainerClick}
      className="flex-1 min-h-0 overflow-hidden p-2.5 sm:p-4 font-mono text-xs sm:text-sm bg-[#080A0D] text-[#cccccc] select-text relative cursor-text flex flex-col"
    >
      <div
        id="terminal-scroll-area"
        className="h-full w-full overflow-y-auto overflow-x-hidden break-words custom-scrollbar pr-1 pb-2 sm:pb-3"
      >
        <div className="flex flex-col space-y-1">
          {entries.map((entry, index) => renderEntry(index, entry))}
        </div>

        {/* Live Active Command Prompt Line */}
        <form
          onSubmit={(e) => {
            const termInput = document.getElementById('terminal-input') as HTMLInputElement | null;
            termInput?.blur();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            onSubmit(e);
          }}
          className="group flex items-center gap-1.5 px-2 py-1.5 mt-3 w-full bg-black/20 rounded-md border border-white/[0.04] focus-within:border-white/[0.12] transition-colors"
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('button') || target.closest('input')) return;
            document.getElementById('terminal-input')?.focus();
          }}
        >
          <span
            className={`font-semibold select-none whitespace-nowrap shrink-0 ${
              isPS ? 'text-sky-300' : isBash ? 'text-fuchsia-300' : 'text-emerald-400'
            }`}
          >
            {currentPrompt}
          </span>

          <input
            id="terminal-input"
            type="text"
            value={inputValue}
            onChange={(e) => onChangeInput(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={(e) => {
              const target = e.target;
              [40, 120, 250, 450].forEach((delay) => {
                setTimeout(() => {
                  target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                  const viewport = document.getElementById('terminal-scroll-area');
                  if (viewport) {
                    viewport.scrollTop = viewport.scrollHeight;
                  }
                }, delay);
              });
            }}
            className="flex-1 min-w-0 bg-transparent border-none outline-none p-0 m-0 font-mono font-bold text-white placeholder-white/20 focus:ring-0 text-xs sm:text-sm terminal-caret"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            aria-label="Terminal command input"
          />

          {/* Desktop Enter hint / Mobile Action button */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="hidden sm:flex items-center gap-1 text-[10px] text-neutral-500 font-mono px-1.5 py-0.5 rounded bg-white/[0.04]">
              <CornerDownLeft className="w-2.5 h-2.5" />
              <span>Enter</span>
            </span>

            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={`flex sm:hidden items-center justify-center w-8 h-8 rounded-md transition-all active:scale-95 disabled:opacity-30 disabled:pointer-events-none ${
                isCMD
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : isPS
                  ? 'bg-sky-600 hover:bg-sky-500 text-white'
                  : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
              }`}
              title="Run Command"
              aria-label="Run command"
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

