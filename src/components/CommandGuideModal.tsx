import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Check,
  Compass,
  Copy,
  Cpu,
  FolderTree,
  HardDrive,
  Play,
  Search,
  Shield,
  Terminal,
  Wifi,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  CATEGORIES,
  COMMAND_REFERENCE,
  CommandCategory,
} from '../data/commandReference';
import { PWAInstallButton } from './PWAInstallButton';

interface CommandGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCommand: (command: string, shell: 'cmd' | 'ps') => void;
  activeShell: 'cmd' | 'ps';
}

export function CommandGuideModal({
  isOpen,
  onClose,
  onSelectCommand,
  activeShell,
}: CommandGuideModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShell, setSelectedShell] = useState<'all' | 'cmd' | 'ps'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CommandCategory>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  };

  const handleTryInTerminal = (cmd: string, shellType: 'cmd' | 'ps' | 'both') => {
    const targetShell = shellType === 'both' ? activeShell : shellType;
    onSelectCommand(cmd, targetShell);
    onClose();
  };

  const getCategoryIcon = (category: CommandCategory) => {
    switch (category) {
      case 'navigation':
        return <Compass className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'files':
        return <FolderTree className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'network':
        return <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'processes':
        return <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'users':
        return <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'storage':
        return <HardDrive className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    }
  };

  // Filter commands
  const filteredCommands = useMemo(() => {
    return COMMAND_REFERENCE.filter((cmd) => {
      // Shell filter
      if (selectedShell !== 'all') {
        if (cmd.shell !== 'both' && cmd.shell !== selectedShell) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all' && cmd.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = cmd.name.toLowerCase().includes(query);
        const matchDesc = cmd.description.toLowerCase().includes(query);
        const matchSyntax = cmd.syntax.toLowerCase().includes(query);
        const matchExample = cmd.example.toLowerCase().includes(query);
        const matchCategory = cmd.category.toLowerCase().includes(query);
        return matchName || matchDesc || matchSyntax || matchExample || matchCategory;
      }

      return true;
    });
  }, [searchQuery, selectedShell, selectedCategory]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 6 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 6 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl h-[90vh] bg-neutral-900 border border-neutral-800 rounded-lg shadow-2xl flex flex-col overflow-hidden text-neutral-100"
          >
            {/* Modal Header: Clean, minimal "Command Reference Guide" */}
            <div className="px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950 shrink-0">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-emerald-400 shrink-0" />
                <h2 className="text-sm font-semibold text-neutral-100 font-mono tracking-tight">
                  Command Reference Guide
                </h2>
              </div>

              {/* Header Actions & Close Button */}
              <div className="flex items-center gap-2">
                <PWAInstallButton shellMode={activeShell} />
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800/80 transition-colors"
                  aria-label="Close command reference guide"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Compact Toolbar: Search, Shell toggle, and Category chips */}
            <div className="px-3.5 py-2.5 bg-neutral-950/90 border-b border-neutral-800 flex flex-col gap-2 shrink-0">
              {/* Row 1: Search & Shell toggle */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search commands, syntax, or actions (e.g., ipconfig, dir, ping, tasklist)..."
                    className="w-full bg-neutral-900 border border-neutral-800 rounded pl-8 pr-7 py-1.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-emerald-400 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Shell Toggle */}
                <div className="flex items-center bg-neutral-900 p-0.5 rounded border border-neutral-800 shrink-0">
                  {(['all', 'cmd', 'ps'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedShell(s)}
                      className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                        selectedShell === s
                          ? 'bg-neutral-800 text-emerald-300 font-medium'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {s === 'all' ? 'All' : s === 'cmd' ? 'CMD' : 'PowerShell'}
                    </button>
                  ))}
                </div>

                <div className="text-[11px] font-mono text-neutral-400 shrink-0 hidden sm:block">
                  {filteredCommands.length} commands
                </div>
              </div>

              {/* Row 2: Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto slim-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap font-mono transition-colors shrink-0 ${
                    selectedCategory === 'all'
                      ? 'bg-neutral-800 text-emerald-300 border border-neutral-700'
                      : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-neutral-800/80'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>All</span>
                  <span className="text-[10px] text-neutral-500">({COMMAND_REFERENCE.length})</span>
                </button>
                {CATEGORIES.map((cat) => {
                  const count = COMMAND_REFERENCE.filter((c) => c.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap font-mono transition-colors shrink-0 ${
                        selectedCategory === cat.id
                          ? 'bg-neutral-800 text-emerald-300 border border-neutral-700'
                          : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900 border border-neutral-800/80'
                      }`}
                    >
                      {getCategoryIcon(cat.id)}
                      <span>{cat.name}</span>
                      <span className="text-[10px] text-neutral-500">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Commands List Scroll Area */}
            <div className="p-3 sm:p-3.5 flex-1 overflow-y-auto slim-scrollbar space-y-2.5">
              {filteredCommands.length === 0 ? (
                <div className="text-center py-16 text-neutral-400 space-y-2 font-mono">
                  <Terminal className="w-8 h-8 text-emerald-400 mx-auto opacity-60" />
                  <p className="text-sm font-medium text-neutral-200">No commands match your filter.</p>
                  <p className="text-xs text-neutral-500">
                    Try searching for another term or selecting All operations.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedShell('all');
                      setSelectedCategory('all');
                    }}
                    className="mt-2 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs rounded transition-colors"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredCommands.map((cmd) => (
                  <div
                    key={cmd.id}
                    className="p-3 rounded-md bg-neutral-950 border border-neutral-800/90 hover:border-neutral-700 transition-colors flex flex-col gap-2"
                  >
                    {/* Top Row: Command Name, Shell tag, Inline Description, and Action Buttons */}
                    <div className="flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-mono font-bold text-sm text-neutral-100">
                          {cmd.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 shrink-0">
                          {cmd.shell === 'cmd'
                            ? 'CMD'
                            : cmd.shell === 'ps'
                            ? 'PowerShell'
                            : 'CMD & PowerShell'}
                        </span>
                        <span className="text-xs text-neutral-300 leading-snug">
                          {cmd.description}
                        </span>
                      </div>

                      {/* Action Buttons: Copy & Run */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => handleCopy(cmd.example, cmd.id)}
                          className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs flex items-center gap-1 transition-colors font-mono"
                          title="Copy command example"
                        >
                          {copiedId === cmd.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px] text-emerald-300">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px]">Copy</span>
                            </>
                          )}
                        </motion.button>

                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => handleTryInTerminal(cmd.example, cmd.shell)}
                          className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-emerald-300 border border-neutral-700 text-xs flex items-center gap-1.5 font-medium transition-colors font-mono"
                          title="Insert command into active terminal"
                        >
                          <Play className="w-3 h-3 fill-emerald-400 text-emerald-400" />
                          <span className="text-[10px]">Try in Terminal</span>
                        </motion.button>
                      </div>
                    </div>

                    {/* Syntax & Example Console Line Blocks */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                      <div className="bg-black/80 border border-neutral-800/80 rounded px-2.5 py-1.5 flex items-baseline gap-2 overflow-hidden">
                        <span className="text-[10px] uppercase text-neutral-500 font-semibold shrink-0">
                          Syntax:
                        </span>
                        <code className="text-neutral-200 select-all break-all block">
                          {cmd.syntax}
                        </code>
                      </div>

                      <div className="bg-black/80 border border-neutral-800/80 rounded px-2.5 py-1.5 flex items-baseline gap-2 overflow-hidden">
                        <span className="text-[10px] uppercase text-emerald-500 font-semibold shrink-0">
                          Example:
                        </span>
                        <code className="text-emerald-300 font-medium select-all break-all block">
                          {cmd.example}
                        </code>
                      </div>
                    </div>

                    {/* Optional Note / Pro-Tip */}
                    {cmd.notes && (
                      <div className="text-[11px] text-neutral-400 font-mono flex items-start gap-1.5 pt-0.5">
                        <span className="text-emerald-400 font-bold shrink-0">&gt;</span>
                        <span className="leading-snug">{cmd.notes}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
