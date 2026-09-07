export interface TerminalEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  shell: 'cmd' | 'ps';
  prompt?: string;
  commandText?: string;
  output?: string;
  timestamp: number;
}

export interface CommandSuggestion {
  title: string;
  description: string;
  cmdCommand?: string;
  psCommand?: string;
  category: 'basics' | 'files' | 'processes' | 'network' | 'users' | 'pipeline' | 'storage' | 'diagnostics' | 'security';
  tag?: string;
  week?: number;
  call?: '(a)' | '(b)' | '(c)';
}
