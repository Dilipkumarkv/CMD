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
  commandText: string;
  shellMode: ShellMode;
  isExpanded: boolean;
  onToggle: () => void;
  onReuseCommand?: (cmd: string) => void;
}

export const CommandExplainCard: React.FC<CommandExplainCardProps> = ({
  commandText,
  shellMode,
  isExpanded,
  onToggle,
  onReuseCommand,
}) => {
  const [copied, setCopied] = useState(false);
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
      className="my-1.5 rounded border border-sky-900/50 bg-[#0a1120]/80 transition-colors text-xs font-mono select-none overflow-hidden"
      onClick={(e) => {
        // Prevent accidental trigger if text is selected
        const selection = window.getSelection();
        if (selection && selection.toString().length > 0) return;
        onToggle();
      }}
    >
      {/* Collapsible Header Bar (Minimal space when collapsed) */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-sky-900/20 active:bg-sky-900/30 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sky-400 shrink-0">
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-semibold text-sky-200 truncate">
            Explain: <span className="text-white uppercase font-bold">{details.token}</span>
          </span>
          <span className="hidden xs:inline-block px-1.5 py-0.2 rounded text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/40">
            {details.category}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-sky-400/80">
          <span className="hidden sm:inline">
            {isExpanded ? 'Tap to collapse' : 'Tap to expand'}
          </span>
          <span className="sm:hidden">{isExpanded ? '▾' : '▸'}</span>
        </div>
      </div>

      {/* Expanded Dialogue Box Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="border-t border-sky-900/40 bg-[#060b14] p-3 text-neutral-300 space-y-2.5 select-text cursor-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Function / Operation Purpose */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-0.5 flex items-center gap-1">
                <span>Operation / Purpose</span>
              </div>
              <p className="text-white/90 leading-relaxed pl-1 text-xs">
                {details.description}
              </p>
            </div>

            {/* Syntax Box */}
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-1 flex items-center justify-between">
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
              <div className="bg-[#03060a] border border-white/10 rounded px-2.5 py-1.5 font-mono text-xs text-sky-200 overflow-x-auto whitespace-pre">
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
                  <code className="text-emerald-300 font-bold truncate">{details.example}</code>
                </div>

                <div className="flex items-center gap-1.5">
                  {onReuseCommand && (
                    <button
                      type="button"
                      onClick={(e) => handleTryExample(e, details.example)}
                      className="px-2 py-1 rounded bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-semibold text-xs flex items-center gap-1 transition-colors shadow-sm"
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
