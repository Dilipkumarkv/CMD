export type ShellMode = 'cmd' | 'ps' | 'bash';

export function getShellBanner(_mode: ShellMode): string {
  return 'Developed by Dilip Kumar KV';
}

export interface TerminalEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  shell: ShellMode;
  prompt?: string;
  commandText?: string;
  output?: string;
  timestamp: number;
  instant?: boolean;
}
