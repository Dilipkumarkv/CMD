/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormEvent, useCallback, useEffect, useState, useRef, KeyboardEvent } from 'react';
import { CommandInputBar } from './components/CommandInputBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPromptBanner } from './components/PWAInstallPromptBanner';
import { ResetModal } from './components/ResetModal';
import { ShellHeader } from './components/ShellHeader';
import { TerminalScreen } from './components/TerminalScreen';
import { CommandGuideModal } from './components/CommandGuideModal';
import { executeCommand } from './engine/commands/registry';
import { LabContext } from './engine/context';
import { defaultPSEngine } from './engine/powershell/pipeline';
import { TerminalEntry } from './types/terminal';
import { getTerminalColors } from './utils/colors';
import { clearLabState, loadLabState, saveLabState } from './utils/storage';

export default function App() {
  // Shared Virtual Machine State
  const [labContext, setLabContext] = useState<LabContext>(() => {
    return loadLabState() || new LabContext();
  });
  const [shellMode, setShellMode] = useState<'cmd' | 'ps'>('cmd');
  const getPromptString = (context: LabContext, shell: 'cmd' | 'ps') => {
    if (context.inDiskPart === shell) return 'DISKPART>';
    const cwd = context.vfs.getCwd();
    return shell === 'ps' ? `PS ${cwd}>` : `${cwd}>`;
  };

  const [currentPrompt, setCurrentPrompt] = useState<string>(() => getPromptString(labContext, 'cmd'));

  // Input & Command History
  const [cmdInput, setCmdInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  // Modals / Drawers
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isCommandGuideOpen, setIsCommandGuideOpen] = useState<boolean>(false);

  const isCommandGuideOpenRef = useRef<boolean>(isCommandGuideOpen);
  const isResetModalOpenRef = useRef<boolean>(isResetModalOpen);

  useEffect(() => {
    isCommandGuideOpenRef.current = isCommandGuideOpen;
  }, [isCommandGuideOpen]);

  useEffect(() => {
    isResetModalOpenRef.current = isResetModalOpen;
  }, [isResetModalOpen]);

  // Modal open/close handlers with history state synchronization
  const handleOpenCommands = () => {
    try {
      window.history.pushState({ modal: 'commandGuide' }, '');
    } catch {
      // ignore
    }
    setIsCommandGuideOpen(true);
  };

  const handleCloseCommands = () => {
    setIsCommandGuideOpen(false);
    if (window.history.state?.modal === 'commandGuide') {
      try {
        window.history.replaceState({ app: 'terminal' }, '');
      } catch {
        // ignore
      }
    }
  };

  const handleOpenReset = () => {
    try {
      window.history.pushState({ modal: 'reset' }, '');
    } catch {
      // ignore
    }
    setIsResetModalOpen(true);
  };

  const handleCloseReset = () => {
    setIsResetModalOpen(false);
    if (window.history.state?.modal === 'reset') {
      try {
        window.history.replaceState({ app: 'terminal' }, '');
      } catch {
        // ignore
      }
    }
  };

  // Back button and popstate management: prevents back button from closing entire page
  useEffect(() => {
    try {
      window.history.replaceState({ app: 'terminal-root' }, '');
      window.history.pushState({ app: 'terminal' }, '');
    } catch {
      // ignore
    }

    const onPopState = () => {
      // If a modal is open, back button simply dismisses the modal
      if (isCommandGuideOpenRef.current) {
        setIsCommandGuideOpen(false);
        return;
      }
      if (isResetModalOpenRef.current) {
        setIsResetModalOpen(false);
        return;
      }

      // If on main screen, re-push buffer so pressing Back never navigates away or closes page
      try {
        window.history.pushState({ app: 'terminal' }, '');
      } catch {
        // ignore
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // Global key interception: prevent accidental Backspace-to-navigate-back and handle Escape
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        const activeEl = document.activeElement;
        const tag = (activeEl?.tagName || '').toLowerCase();
        const isEditable =
          tag === 'input' ||
          tag === 'textarea' ||
          (activeEl as HTMLElement)?.isContentEditable;

        if (!isEditable) {
          e.preventDefault();
          const termInput = document.getElementById('terminal-input') as HTMLInputElement | null;
          if (termInput) {
            termInput.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        if (isCommandGuideOpenRef.current) {
          handleCloseCommands();
        } else if (isResetModalOpenRef.current) {
          handleCloseReset();
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Load history from session or local if needed (omitted for brevity, keeping existing initial states)
  const [entries, setEntries] = useState<TerminalEntry[]>([
    {
      id: 'init-header-cmd',
      type: 'output',
      shell: 'cmd',
      output:
        'Microsoft CMD [Version 10.0]\nDeveloped by Dilip Kumar',
      timestamp: Date.now(),
    },
    {
      id: 'init-header-ps',
      type: 'output',
      shell: 'ps',
      output:
        'Microsoft PS [Version 10.0]\nDeveloped by Dilip Kumar',
      timestamp: Date.now(),
    }
  ]);

  // Execute a command string in the active or specified shell
  const runCommand = useCallback(
    (rawCmd: string, explicitShell?: 'cmd' | 'ps') => {
      const trimmed = rawCmd.trim();
      if (!trimmed) return;

      const activeShell = explicitShell || shellMode;
      labContext.activeShell = activeShell;
      const promptStr = getPromptString(labContext, activeShell);

      // Save to command history (avoid immediate duplicates)
      setCommandHistory((prev) => {
        if (prev.length > 0 && prev[prev.length - 1] === trimmed) return prev;
        return [...prev, trimmed];
      });
      setHistoryPointer(-1);

      // Handle interactive shell switching
      if (activeShell === 'cmd' && trimmed.toLowerCase() === 'powershell') {
        setShellMode('ps');
        setEntries((prev) => [
          ...prev,
          {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: 'cmd',
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          },
          {
            id: `out-${Date.now()}`,
            type: 'output',
            shell: 'ps',
            output:
              'Microsoft PS [Version 10.0]\nDeveloped by Dilip Kumar\n',
            timestamp: Date.now(),
          },
        ]);
        setCmdInput('');
        return;
      }

      if (
        activeShell === 'ps' &&
        (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'cmd')
      ) {
        setShellMode('cmd');
        setEntries((prev) => [
          ...prev,
          {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: 'ps',
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          },
          {
            id: `out-${Date.now()}`,
            type: 'output',
            shell: 'cmd',
            output:
              'Microsoft CMD [Version 10.0]\nDeveloped by Dilip Kumar\n',
            timestamp: Date.now(),
          },
        ]);
        setCmdInput('');
        return;
      }

      // Execute via appropriate engine
      if (activeShell === 'ps') {
        const result = defaultPSEngine.execute(trimmed, labContext);
        
        saveLabState(labContext);
        setLabContext(loadLabState() || labContext);

        if (result.clearScreen) {
          setEntries((prev) => prev.filter((e) => e.shell !== 'ps'));
        } else {
          const inputEntry: TerminalEntry = {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: 'ps',
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          };
          const outputEntry: TerminalEntry | null = result.text
            ? {
                id: `out-${Date.now()}`,
                type: result.error ? 'error' : 'output',
                shell: 'ps',
                output: result.text,
                timestamp: Date.now(),
              }
            : null;

          setEntries((prev) => (outputEntry ? [...prev, inputEntry, outputEntry] : [...prev, inputEntry]));
        }
      } else {
        const result = executeCommand(trimmed, labContext);
        
        saveLabState(labContext);
        setLabContext(loadLabState() || labContext);

        if (result.clearScreen) {
          setEntries((prev) => prev.filter((e) => e.shell !== 'cmd'));
        } else {
          const inputEntry: TerminalEntry = {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: 'cmd',
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          };
          const outputEntry: TerminalEntry | null = result.text
            ? {
                id: `out-${Date.now()}`,
                type: result.error ? 'error' : 'output',
                shell: 'cmd',
                output: result.text,
                timestamp: Date.now(),
              }
            : null;

          setEntries((prev) => (outputEntry ? [...prev, inputEntry, outputEntry] : [...prev, inputEntry]));
        }
      }

      setCurrentPrompt(getPromptString(labContext, shellMode));
      setCmdInput('');
    },
    [labContext, shellMode]
  );

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    runCommand(cmdInput);
  };

  // Switch mode via header toggle
  const handleSwitchMode = (newMode: 'cmd' | 'ps') => {
    if (newMode === shellMode) return;
    setShellMode(newMode);
    setCurrentPrompt(getPromptString(labContext, newMode));
    const cwd = labContext.vfs.getCwd();
    setEntries((prev) => {
      // Filter out previous session active notifications to prevent stacking
      const filtered = prev.filter((e) => !(e.type === 'system' && e.output.includes('Session active')));
      return [
        ...filtered,
        {
          id: `mode-switch-${Date.now()}`,
          type: 'system',
          shell: newMode,
          output:
            newMode === 'ps'
              ? `Switched to Windows PowerShell (Session active in ${cwd})`
              : `Switched to Command Prompt (Session active in ${cwd})`,
          timestamp: Date.now(),
        },
      ];
    });
  };

  // Tap-to-reuse previous command
  const handleReuseCommand = (cmdText: string) => {
    setCmdInput(cmdText);
    document.getElementById('terminal-input')?.focus();
  };

  // History Stepper (< Prev, Next >)
  const handleHistoryPrev = () => {
    if (commandHistory.length === 0) return;
    const newPointer = historyPointer === -1 ? commandHistory.length - 1 : Math.max(0, historyPointer - 1);
    setHistoryPointer(newPointer);
    setCmdInput(commandHistory[newPointer]);
    document.getElementById('terminal-input')?.focus();
  };

  const handleHistoryNext = () => {
    if (historyPointer === -1) return;
    if (historyPointer >= commandHistory.length - 1) {
      setHistoryPointer(-1);
      setCmdInput('');
    } else {
      const newPointer = historyPointer + 1;
      setHistoryPointer(newPointer);
      setCmdInput(commandHistory[newPointer]);
    }
    document.getElementById('terminal-input')?.focus();
  };

  const handleSelectGuideCommand = (command: string, targetShell: 'cmd' | 'ps') => {
    handleCloseCommands();
    if (targetShell !== shellMode) {
      handleSwitchMode(targetShell);
    }
    setCmdInput(command);
    setTimeout(() => {
      document.getElementById('terminal-input')?.focus();
    }, 150);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleHistoryPrev();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleHistoryNext();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const parts = cmdInput.split(' ');
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        const cwd = labContext.vfs.getCwd();
        const nodeLookup = labContext.vfs.getNodeResult(cwd);
        if (nodeLookup && nodeLookup.node.type === 'dir') {
          const children = Object.keys(nodeLookup.node.children);
          const matches = children.filter((c) => c.toLowerCase().startsWith(lastPart.toLowerCase()));
          if (matches.length > 0) {
            // Very simple autocomplete: complete to first match
            parts[parts.length - 1] = matches[0];
            setCmdInput(parts.join(' '));
          }
        }
      }
    }
  };

  // Reset entire Virtual Machine lab state
  const handleResetLab = () => {
    handleCloseReset();
    clearLabState();
    const newContext = new LabContext();
    setLabContext(newContext);
    setCurrentPrompt(newContext.vfs.getCwd());
    setCommandHistory([]);
    setHistoryPointer(-1);
    setCmdInput('');
    setEntries([
      {
        id: `reset-header-${Date.now()}`,
        type: 'system',
        shell: shellMode,
        output:
          '[System]: Virtual Machine & File System have been reset to clean default baseline (Phase 1).',
        timestamp: Date.now(),
      },
      {
        id: `welcome-cmd-${Date.now()}`,
        type: 'output',
        shell: 'cmd',
        output: 'Microsoft CMD [Version 10.0]\nDeveloped by Dilip Kumar',
        timestamp: Date.now(),
      },
      {
        id: `welcome-ps-${Date.now()}`,
        type: 'output',
        shell: 'ps',
        output: 'Microsoft PS [Version 10.0]\nDeveloped by Dilip Kumar',
        timestamp: Date.now(),
      }
    ]);
  };

  const isPS = shellMode === 'ps';
  const colors = getTerminalColors(labContext.terminalColor, isPS);

  return (
    <div
      className={`h-[100dvh] max-h-[100dvh] w-full flex flex-col overflow-hidden font-mono select-text transition-colors ${
        !colors.bg ? (isPS ? 'bg-[#012456]' : 'bg-[#0c0c0c]') : ''
      }`}
      style={colors.bg ? { backgroundColor: colors.bg } : undefined}
    >
      {/* Real Windows-styled Terminal Header */}
      <ShellHeader
        shellMode={shellMode}
        onSwitchMode={handleSwitchMode}
        onOpenReset={handleOpenReset}
        onOpenCommands={handleOpenCommands}
      />

      {/* Dismissible First-Time PWA Install Prompt Banner */}
      <PWAInstallPromptBanner />

      {/* Primary Authentic Terminal Output Viewport */}
      <TerminalScreen
        entries={entries.filter((e) => e.shell === shellMode)}
        shellMode={shellMode}
        currentPrompt={currentPrompt}
        terminalColors={colors}
        inputValue={cmdInput}
        onChangeInput={setCmdInput}
        onSubmit={handleSubmit}
        onReuseCommand={handleReuseCommand}
        onKeyDown={handleKeyDown}
      />

      {/* Sticky Bottom Touch Input Bar (now just Quick Chips & History) */}
      <CommandInputBar
        shellMode={shellMode}
        onHistoryPrev={handleHistoryPrev}
        onHistoryNext={handleHistoryNext}
        canHistoryPrev={commandHistory.length > 0 && historyPointer !== 0}
        canHistoryNext={historyPointer !== -1}
        onQuickCommand={(cmd) => runCommand(cmd)}
      />

      {/* Safe Reset Lab Confirmation Modal */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={handleCloseReset}
        onConfirm={handleResetLab}
      />

      {/* Interactive Command Reference & Practice Guide Modal */}
      <CommandGuideModal
        isOpen={isCommandGuideOpen}
        onClose={handleCloseCommands}
        onSelectCommand={handleSelectGuideCommand}
        activeShell={shellMode}
      />

      {/* Unobtrusive Working Offline & Device Saved Indicator */}
      <OfflineIndicator />
    </div>
  );
}
