/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { FormEvent, useCallback, useEffect, useState, useRef, KeyboardEvent, useMemo } from 'react';
import { BootScreen } from './components/BootScreen';
import { CommandInputBar } from './components/CommandInputBar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallPromptBanner } from './components/PWAInstallPromptBanner';
import { ResetModal } from './components/ResetModal';
import { ShellHeader } from './components/ShellHeader';
import { TerminalScreen } from './components/TerminalScreen';
import { executeCommand } from './engine/commands/registry';
import { LabContext } from './engine/context';
import { defaultPSEngine } from './engine/powershell/pipeline';
import { executeBashCommand } from './engine/bash/bashEngine';
import { TerminalEntry, ShellMode } from './types/terminal';
import { getTerminalColors } from './utils/colors';
import { clearLabState, loadLabState, saveLabState } from './utils/storage';

export function getShellBanner(mode: ShellMode): string {
  switch (mode) {
    case 'cmd':
      return 'Microsoft CMD [Version 10.0]\nDeveloped by Dilip Kumar KV';
    case 'ps':
      return 'Microsoft PS [Version 10.0]\nDeveloped by Dilip Kumar KV';
    case 'bash':
      return 'Linux bash [Version 5.1.16]\nDeveloped by Dilip Kumar KV';
  }
}

export default function App() {
  // Shared Virtual Machine State
  const [labContext, setLabContext] = useState<LabContext>(() => {
    return loadLabState() || new LabContext();
  });
  const [, setLabVersion] = useState<number>(0);
  const notifyLabMutation = useCallback(() => {
    setLabVersion((v) => v + 1);
  }, []);
  const [shellMode, setShellMode] = useState<ShellMode>('cmd');
  const getPromptString = (context: LabContext, shell: ShellMode) => {
    if (context.inDiskPart === shell) return 'DISKPART>';
    const cwd = context.vfs.getCwd();
    if (shell === 'bash') {
      let bashCwd = cwd.replace(/\\/g, '/');
      if (bashCwd.startsWith('C:')) bashCwd = bashCwd.substring(2);
      if (bashCwd.toLowerCase() === '/users/student' || bashCwd.toLowerCase() === '/home/student') {
        bashCwd = '~';
      } else if (bashCwd.toLowerCase().startsWith('/users/student/')) {
        bashCwd = '~' + bashCwd.substring('/users/student'.length);
      } else if (bashCwd.toLowerCase().startsWith('/home/student/')) {
        bashCwd = '~' + bashCwd.substring('/home/student'.length);
      }
      if (!bashCwd) bashCwd = '/';
      const host = context.computerName.toLowerCase().replace('desktop-', '');
      const user = context.currentUser.toLowerCase();
      return `${user}@${host}:${bashCwd}$ `;
    }
    return shell === 'ps' ? `PS ${cwd}>` : `${cwd}>`;
  };

  const [currentPrompt, setCurrentPrompt] = useState<string>(() => getPromptString(labContext, 'cmd'));

  // Input & Command History
  const [cmdInput, setCmdInput] = useState<string>('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyPointer, setHistoryPointer] = useState<number>(-1);

  // Modals / Drawers
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  // Dynamic visualViewport tracking: ensures mobile keyboard never blocks the terminal window
  const [viewportHeight, setViewportHeight] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      return Math.round(window.visualViewport.height);
    }
    return typeof window !== 'undefined' ? window.innerHeight : 0;
  });

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window === 'undefined') return;
      if (window.visualViewport) {
        const vh = Math.round(window.visualViewport.height);
        setViewportHeight(vh);
        // Keep document scroll reset so header/layout never drifts on iOS Safari
        if (window.scrollY !== 0 || window.scrollX !== 0) {
          window.scrollTo(0, 0);
        }
      } else {
        setViewportHeight(window.innerHeight);
      }

      // Automatically keep the active terminal prompt and scroll area visible
      const scrollArea = document.getElementById('terminal-scroll-area');
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
      const activeInput = document.getElementById('terminal-input');
      activeInput?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
    };
  }, []);

  const isResetModalOpenRef = useRef<boolean>(isResetModalOpen);

  useEffect(() => {
    isResetModalOpenRef.current = isResetModalOpen;
  }, [isResetModalOpen]);

  // Modal open/close handlers with history state synchronization
  const handleOpenReset = () => {
    const termInput = document.getElementById('terminal-input') as HTMLInputElement | null;
    termInput?.blur();
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
        if (isResetModalOpenRef.current) {
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
      output: getShellBanner('cmd'),
      timestamp: Date.now(),
    },
    {
      id: 'init-header-ps',
      type: 'output',
      shell: 'ps',
      output: getShellBanner('ps'),
      timestamp: Date.now(),
    },
    {
      id: 'init-header-bash',
      type: 'output',
      shell: 'bash',
      output: getShellBanner('bash'),
      timestamp: Date.now(),
    },
  ]);

  const [streamedIds, setStreamedIds] = useState<Set<string>>(() => new Set());

  const handleMarkStreamed = useCallback((id: string) => {
    setStreamedIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Execute a command string in the active or specified shell
  const runCommand = useCallback(
    (rawCmd: string, explicitShell?: ShellMode) => {
      const trimmed = rawCmd.trim();
      if (!trimmed) return;

      // Automatically dismiss virtual keyboard on mobile upon command execution
      const termInput = document.getElementById('terminal-input') as HTMLInputElement | null;
      termInput?.blur();
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

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
      const lower = trimmed.toLowerCase();
      if ((lower === 'powershell' || lower === 'pwsh' || lower === 'ps') && activeShell !== 'ps') {
        setShellMode('ps');
        labContext.activeShell = 'ps';
        setCurrentPrompt(getPromptString(labContext, 'ps'));
        setToastMessage('Switched to PowerShell');
        setEntries((prev) => [
          ...prev,
          {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: activeShell,
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          },
        ]);
        setCmdInput('');
        return;
      }

      if (lower === 'cmd' && activeShell !== 'cmd') {
        setShellMode('cmd');
        labContext.activeShell = 'cmd';
        setCurrentPrompt(getPromptString(labContext, 'cmd'));
        setToastMessage('Switched to CMD');
        setEntries((prev) => [
          ...prev,
          {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: activeShell,
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          },
        ]);
        setCmdInput('');
        return;
      }

      if ((lower === 'bash' || lower === 'sh' || lower === 'wsl') && activeShell !== 'bash') {
        setShellMode('bash');
        labContext.activeShell = 'bash';
        setCurrentPrompt(getPromptString(labContext, 'bash'));
        setToastMessage('Switched to Bash');
        setEntries((prev) => [
          ...prev,
          {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: activeShell,
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          },
        ]);
        setCmdInput('');
        return;
      }

      if (lower === 'exit' && activeShell !== 'cmd') {
        setShellMode('cmd');
        labContext.activeShell = 'cmd';
        setCurrentPrompt(getPromptString(labContext, 'cmd'));
        setToastMessage('Switched to CMD');
        setEntries((prev) => [
          ...prev,
          {
            id: `in-${Date.now()}`,
            type: 'input',
            shell: activeShell,
            prompt: promptStr,
            commandText: trimmed,
            timestamp: Date.now(),
          },
        ]);
        setCmdInput('');
        return;
      }

      // Execute via appropriate engine with robust sandbox error boundaries
      try {
        if (activeShell === 'ps') {
          const result = defaultPSEngine.execute(trimmed, labContext);
          
          saveLabState(labContext);
          notifyLabMutation();

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
        } else if (activeShell === 'bash') {
          const result = executeBashCommand(trimmed, labContext);
          
          saveLabState(labContext);
          notifyLabMutation();

          if (result.clearScreen) {
            setEntries((prev) => prev.filter((e) => e.shell !== 'bash'));
          } else {
            const inputEntry: TerminalEntry = {
              id: `in-${Date.now()}`,
              type: 'input',
              shell: 'bash',
              prompt: promptStr,
              commandText: trimmed,
              timestamp: Date.now(),
            };

            const outputEntry: TerminalEntry | null = result.text
              ? {
                  id: `out-${Date.now()}`,
                  type: result.error ? 'error' : 'output',
                  shell: 'bash',
                  output: result.text,
                  timestamp: Date.now(),
                }
              : null;

            setEntries((prev) => (outputEntry ? [...prev, inputEntry, outputEntry] : [...prev, inputEntry]));
          }
        } else {
          const result = executeCommand(trimmed, labContext);
          
          saveLabState(labContext);
          notifyLabMutation();

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
      } catch (err: any) {
        // Prevent unhandled engine errors from interrupting terminal session
        const inputEntry: TerminalEntry = {
          id: `in-${Date.now()}`,
          type: 'input',
          shell: activeShell,
          prompt: promptStr,
          commandText: trimmed,
          timestamp: Date.now(),
        };
        const errorEntry: TerminalEntry = {
          id: `err-${Date.now()}`,
          type: 'error',
          shell: activeShell,
          output: `Command error: ${err?.message || 'Unexpected simulator exception'}`,
          timestamp: Date.now(),
        };
        setEntries((prev) => [...prev, inputEntry, errorEntry]);
      }

      setCurrentPrompt(getPromptString(labContext, shellMode));
      setCmdInput('');
    },
    [labContext, shellMode]
  );

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    const termInput = document.getElementById('terminal-input') as HTMLInputElement | null;
    termInput?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    runCommand(cmdInput);
  };

  // Switch mode via header toggle
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSwitchMode = (newMode: ShellMode) => {
    if (newMode === shellMode) return;
    setShellMode(newMode);
    labContext.activeShell = newMode;
    setCurrentPrompt(getPromptString(labContext, newMode));
    const modeName = newMode === 'ps' ? 'PowerShell' : newMode === 'bash' ? 'Bash' : 'CMD';
    setToastMessage(`Switched to ${modeName}`);
  };

  // Quick Command selection from chips bar
  const handleQuickCommand = (cmd: string) => {
    // 1. Clear screen commands execute immediately
    if (cmd === 'cls' || cmd === 'clear' || cmd === 'Clear-Host') {
      runCommand(cmd);
      setCmdInput('');
      return;
    }

    // 2. Argument-requiring commands: populate input and focus cursor at end
    const argCommands = ['mkdir', 'sudo', 'grep', 'cd', 'cat', 'rm', 'touch', 'echo', 'kill'];
    if (argCommands.includes(cmd.toLowerCase())) {
      const text = `${cmd} `;
      setCmdInput(text);
      setTimeout(() => {
        const inputEl = document.getElementById('terminal-input') as HTMLInputElement | null;
        if (inputEl) {
          inputEl.focus();
          inputEl.setSelectionRange(text.length, text.length);
        }
      }, 50);
      return;
    }

    // 3. Self-contained commands: execute immediately
    runCommand(cmd);
    setCmdInput('');
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleHistoryPrev();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleHistoryNext();
    }
  };

  // Reset entire Virtual Machine lab state
  const handleResetLab = () => {
    handleCloseReset();
    clearLabState();
    const newContext = new LabContext();
    setLabContext(newContext);
    setCurrentPrompt(getPromptString(newContext, shellMode));
    setCommandHistory([]);
    setHistoryPointer(-1);
    setCmdInput('');
    setStreamedIds(new Set());
    setEntries([
      {
        id: `init-header-cmd-${Date.now()}`,
        type: 'output',
        shell: 'cmd',
        output: getShellBanner('cmd'),
        timestamp: Date.now(),
      },
      {
        id: `init-header-ps-${Date.now()}`,
        type: 'output',
        shell: 'ps',
        output: getShellBanner('ps'),
        timestamp: Date.now(),
      },
      {
        id: `init-header-bash-${Date.now()}`,
        type: 'output',
        shell: 'bash',
        output: getShellBanner('bash'),
        timestamp: Date.now(),
      },
      {
        id: `reset-header-${Date.now()}`,
        type: 'system',
        shell: shellMode,
        output:
          '[System]: Virtual Machine & File System have been reset to clean default baseline (Phase 1).',
        timestamp: Date.now(),
      },
    ]);
  };

  // Ensure that only ONE banner exists per shell across entries so it never stacks up
  const activeEntries = useMemo(() => {
    const list = entries.filter((e) => e.shell === shellMode);
    let bannerSeen = false;
    return list.filter((e) => {
      const isBanner =
        e.output === getShellBanner('cmd') ||
        e.output === getShellBanner('ps') ||
        e.output === getShellBanner('bash') ||
        e.id.startsWith('init-header-');
      if (isBanner) {
        if (bannerSeen) return false;
        bannerSeen = true;
      }
      return true;
    });
  }, [entries, shellMode]);

  const isPS = shellMode === 'ps';
  const isBash = shellMode === 'bash';
  const colors = getTerminalColors(labContext.terminalColor, isPS);

  const [isBooting, setIsBooting] = useState(true);

  return (
    <div
      id="terminal-app-root"
      style={{
        height: viewportHeight ? `${viewportHeight}px` : '100dvh',
        maxHeight: viewportHeight ? `${viewportHeight}px` : '100dvh',
      }}
      className="w-full flex flex-col overflow-hidden font-mono select-text bg-[#0B0D10] text-[#cccccc] fixed top-0 left-0 right-0 z-0"
    >
      {isBooting && <BootScreen onComplete={() => setIsBooting(false)} />}
      
      {/* Real Windows-styled Terminal Header */}
      <ShellHeader
        shellMode={shellMode}
        onSwitchMode={handleSwitchMode}
        onOpenReset={handleOpenReset}
        toastMessage={toastMessage}
      />

      {/* Dismissible First-Time PWA Install Prompt Banner */}
      <PWAInstallPromptBanner />

      {/* Primary Authentic Terminal Output Viewport */}
      <TerminalScreen
        entries={activeEntries}
        shellMode={shellMode}
        currentPrompt={currentPrompt}
        terminalColors={colors}
        inputValue={cmdInput}
        onChangeInput={setCmdInput}
        onSubmit={handleSubmit}
        onReuseCommand={handleReuseCommand}
        onKeyDown={handleKeyDown}
        streamedIds={streamedIds}
        onMarkStreamed={handleMarkStreamed}
      />

      {/* Sticky Bottom Touch Input Bar (now just Quick Chips & History) */}
      <CommandInputBar
        shellMode={shellMode}
        onHistoryPrev={handleHistoryPrev}
        onHistoryNext={handleHistoryNext}
        canHistoryPrev={commandHistory.length > 0 && historyPointer !== 0}
        canHistoryNext={historyPointer !== -1}
        onQuickCommand={handleQuickCommand}
      />

      {/* Safe Reset Lab Confirmation Modal */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={handleCloseReset}
        onConfirm={handleResetLab}
      />

      {/* Unobtrusive Working Offline & Device Saved Indicator */}
      <OfflineIndicator />
    </div>
  );
}
