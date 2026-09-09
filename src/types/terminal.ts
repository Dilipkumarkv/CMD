export type ShellMode = 'cmd' | 'ps' | 'bash';

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
