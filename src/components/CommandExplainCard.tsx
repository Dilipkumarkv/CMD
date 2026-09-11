import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Copy,
  Check,
  Play,
  GraduationCap,
  Code2,
} from 'lucide-react';
import { ShellMode } from '../types/terminal';
import { getCommandDetails } from '../engine/explain';

interface CommandExplainCardProps {
  id?: string;
  commandText: string;
  shellMode: ShellMode;
  isExpanded: boolean;
  onToggle: () => void;
  onReuseCommand?: (cmd: string) => void;
  onExpandedComplete?: () => void;
  onCollapsedComplete?: () => void;
}

interface ShellTheme {
  cardBorderBg: string;
  headerHover: string;
  chevron: string;
  title: string;
  badge: string;
  hintText: string;
  expandedPanel: string;
  sectionHeader: string;
  syntaxBox: string;
  exampleHighlight: string;
  tryButton: string;
}

const SHELL_THEMES: Record<ShellMode, ShellTheme> = {
  cmd: {
    cardBorderBg: 'border-emerald-500/30 bg-[#041108]/90 hover:border-emerald-500/50 shadow-[0_2px_12px_rgba(16,185,129,0.06)]',
    headerHover: 'hover:bg-emerald-950/40 active:bg-emerald-950/70',
    chevron: 'text-emerald-400',
    title: 'text-emerald-200',
    badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
    hintText: 'text-emerald-400/80',
    expandedPanel: 'border-t border-emerald-900/50 bg-[#020b05]',
    sectionHeader: 'text-emerald-400',
    syntaxBox: 'bg-[#010603] border border-emerald-900/40 text-emerald-200',
    exampleHighlight: 'text-emerald-300',
    tryButton: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-sm shadow-emerald-950',
  },
  ps: {
    cardBorderBg: 'border-sky-500/30 bg-[#071120]/90 hover:border-sky-500/50 shadow-[0_2px_12px_rgba(14,165,233,0.06)]',
    headerHover: 'hover:bg-sky-950/40 active:bg-sky-950/70',
    chevron: 'text-sky-400',
    title: 'text-sky-200',
    badge: 'bg-sky-950/80 text-sky-300 border-sky-700/50',
    hintText: 'text-sky-400/80',
    expandedPanel: 'border-t border-sky-900/50 bg-[#040a14]',
    sectionHeader: 'text-sky-400',
    syntaxBox: 'bg-[#02060d] border border-sky-900/40 text-sky-200',
    exampleHighlight: 'text-sky-300',
    tryButton: 'bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white shadow-sm shadow-sky-950',
  },
  bash: {
    cardBorderBg: 'border-fuchsia-500/30 bg-[#120620]/90 hover:border-fuchsia-500/50 shadow-[0_2px_12px_rgba(217,70,239,0.06)]',
    headerHover: 'hover:bg-fuchsia-950/40 active:bg-fuchsia-950/70',
    chevron: 'text-fuchsia-400',
    title: 'text-fuchsia-200',
    badge: 'bg-fuchsia-950/80 text-fuchsia-300 border-fuchsia-700/50',
    hintText: 'text-fuchsia-400/80',
    expandedPanel: 'border-t border-fuchsia-900/50 bg-[#090312]',
    sectionHeader: 'text-fuchsia-400',
    syntaxBox: 'bg-[#06020c] border border-fuchsia-900/40 text-fuchsia-200',
    exampleHighlight: 'text-fuchsia-300',
    tryButton: 'bg-fuchsia-600 hover:bg-fuchsia-500 active:bg-fuchsia-700 text-white shadow-sm shadow-fuchsia-950',
  },
};

export const CommandExplainCard: React.FC<CommandExplainCardProps> = ({
  id,
  commandText,
  shellMode,
  isExpanded,
  onToggle,
  onReuseCommand,
  onExpandedComplete,
  onCollapsedComplete,
}) => {
  const [copied, setCopied] = useState(false);
  const theme = SHELL_THEMES[shellMode] || SHELL_THEMES.cmd;

  const details = React.useMemo(() => {
    return getCommandDetails(commandText, shellMode);
  }, [commandText, shellMode]);

  if (!details) return null;

  const handleCopy = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleTryExample = (e: React.MouseEvent, example: string) => {
    e.stopPropagation();
    if (onReuseCommand) {
      onReuseCommand(example);
    }
  };

  return (
    <div
      id={id}
      data-explain-card="true"
      className={`explain-card my-1.5 rounded border transition-colors text-xs font-mono select-none overflow-hidden ${theme.cardBorderBg}`}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Collapsible Header Bar (Minimal space when collapsed) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={(e) => {
          e.stopPropagation();
          // Blur any active input so virtual keyboard closes and doesn't obscure the card
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
          onToggle();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (document.activeElement instanceof HTMLElement) {
              document.activeElement.blur();
            }
            onToggle();
          }
        }}
        className={`flex items-center justify-between px-2.5 py-1.5 cursor-pointer transition-colors ${theme.headerHover}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className={`${theme.chevron} shrink-0`}>
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className={`font-semibold ${theme.title} truncate`}>
            Explain: <span className="text-white uppercase font-bold">{details.token}</span>
          </span>
          <span className={`hidden xs:inline-block px-1.5 py-0.2 rounded text-[10px] border ${theme.badge}`}>
            {details.category}
          </span>
        </div>

        <div className={`flex items-center gap-1.5 shrink-0 text-[10px] ${theme.hintText}`}>
          <span className="hidden sm:inline">
            {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
          </span>
          <span className="sm:hidden">{isExpanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Expanded Dialogue Box Content */}
      <AnimatePresence initial={false} onExitComplete={onCollapsedComplete}>
        {isExpanded && (
          <motion.div
            data-explain-content="true"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onAnimationComplete={() => {
              if (isExpanded) {
                onExpandedComplete?.();
              }
            }}
            className={`p-3 text-neutral-300 space-y-2.5 select-text cursor-auto max-h-[min(65vh,420px)] overflow-y-auto ${theme.expandedPanel}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Function / Operation Purpose */}
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider ${theme.sectionHeader} mb-0.5 flex items-center gap-1`}>
                <span>Operation / Purpose</span>
              </div>
              <p className="text-white/90 leading-relaxed pl-1 text-xs">
                {details.description}
              </p>
            </div>

            {/* Syntax Box */}
            <div>
              <div className={`text-[10px] uppercase font-bold tracking-wider ${theme.sectionHeader} mb-1 flex items-center justify-between`}>
                <span className="flex items-center gap-1">
                  <Code2 className="w-3 h-3" /> Syntax
                </span>
                <button
                  type="button"
                  onClick={(e) => handleCopy(e, details.syntax)}
                  className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-2.5 h-2.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className={`rounded px-2.5 py-1.5 font-mono text-xs overflow-x-auto whitespace-pre ${theme.syntaxBox}`}>
                {details.syntax}
              </div>
            </div>

            {/* Lab & Exam Note (Polytechnic syllabus guidance) */}
            {details.notes && (
              <div className="rounded bg-amber-950/30 border-l-2 border-amber-500/80 p-2 text-xs text-amber-200/90 leading-relaxed flex items-start gap-2">
                <GraduationCap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 mr-1">Lab / Exam Note:</span>
                  <span>{details.notes}</span>
                </div>
              </div>
            )}

            {/* Practical Example Action Bar */}
            {details.example && (
              <div className="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-xs text-neutral-400 truncate min-w-0">
                  <span className="text-neutral-500 font-bold">Example:</span>
                  <code className={`font-bold truncate ${theme.exampleHighlight}`}>{details.example}</code>
                </div>

                <div className="flex items-center gap-1.5">
                  {onReuseCommand && (
                    <button
                      type="button"
                      onClick={(e) => handleTryExample(e, details.example)}
                      className={`px-2 py-1 rounded font-semibold text-xs flex items-center gap-1 transition-colors ${theme.tryButton}`}
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Try Example</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onToggle}
                    className="px-2 py-1 rounded bg-white/10 hover:bg-white/15 text-neutral-300 text-xs transition-colors"
                  >
                    Collapse
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
