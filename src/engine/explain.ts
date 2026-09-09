import { COMMAND_REFERENCE, CATEGORIES, CommandItem } from '../data/commandReference';
import { ShellMode } from '../types/terminal';

export interface CommandDetails {
  token: string;
  name: string;
  category: string;
  level: string;
  shell: string;
  syntax: string;
  description: string;
  example: string;
  notes?: string;
  quickSwitches?: string[];
}

/**
 * Returns structured metadata for a command query to power interactive UI dialogue boxes.
 */
export function getCommandDetails(rawQuery: string, activeShell?: ShellMode): CommandDetails | null {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed) return null;

  // Clean query: strip leading explain, sudo, or redirection
  let query = trimmed;
  if (query.toLowerCase().startsWith('explain ')) {
    query = query.slice(8).trim();
  }
  if (query.toLowerCase().startsWith('sudo ')) {
    query = query.slice(5).trim();
  }

  // Get primary executable/cmdlet token
  const primaryToken = query.split(/\s+/)[0].replace(/^["']|["']$/g, '');
  if (!primaryToken) return null;

  const lowerPrimary = primaryToken.toLowerCase();

  // 1. Direct name/alias match
  let match: CommandItem | undefined = COMMAND_REFERENCE.find((item) => {
    const itemNames = item.name.toLowerCase().split(/[\s/(),]+/);
    return itemNames.includes(lowerPrimary);
  });

  // 2. Syntax token match
  if (!match) {
    match = COMMAND_REFERENCE.find((item) => {
      const syntaxTokens = item.syntax.toLowerCase().split(/[\s|,[\]()]+/);
      return syntaxTokens.includes(lowerPrimary);
    });
  }

  // 3. Fallback partial ID or description match
  if (!match) {
    match = COMMAND_REFERENCE.find((item) => {
      return (
        item.id.toLowerCase().includes(lowerPrimary) ||
        item.name.toLowerCase().includes(lowerPrimary)
      );
    });
  }

  const envName =
    activeShell === 'ps'
      ? 'Windows PowerShell'
      : activeShell === 'bash'
      ? 'Linux Bash'
      : 'Command Prompt (CMD)';

  if (match) {
    const categoryTitle =
      CATEGORIES.find((c) => c.id === match?.category)?.name || match.category;

    const shellLabel =
      match.shell === 'both'
        ? 'CMD & PowerShell'
        : match.shell === 'cmd'
        ? 'Command Prompt'
        : match.shell === 'ps'
        ? 'PowerShell'
        : 'Linux Bash';

    const switchMatches = match.syntax.match(/\[([/-][A-Za-z0-9_?:]+(?:\s+<[^>]+>)?)\]/g);
    const quickSwitches = switchMatches ? switchMatches.map((s) => s.slice(1, -1)) : undefined;

    return {
      token: primaryToken,
      name: match.name,
      category: categoryTitle,
      level: match.level.toUpperCase(),
      shell: shellLabel,
      syntax: match.syntax,
      description: match.description,
      example: match.example,
      notes: match.notes,
      quickSwitches,
    };
  }

  return {
    token: primaryToken,
    name: primaryToken,
    category: 'System Command',
    level: 'Standard',
    shell: envName,
    syntax: `${primaryToken} [options...]`,
    description: `Executes '${primaryToken}' in the ${envName} environment.`,
    example: activeShell === 'ps' ? `Get-Help ${primaryToken}` : `${primaryToken} /?`,
    notes: `Try typing 'help ${primaryToken}' or '${primaryToken} /?' for integrated manual details.`,
  };
}

/**
 * Organically produces a terminal-formatted manual card for any command.
 * Matches existing terminal styling, fonts, and colors without modifying UI structure.
 */
export function explainCommand(rawQuery: string, activeShell?: ShellMode): string {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed) {
    return [
      '================================================================================',
      'COMMAND EXPLAINER - Built-in Reference & Syllabus Manual',
      '================================================================================',
      'Usage: explain <command-name>',
      '',
      'Examples:',
      '  explain ping',
      '  explain ipconfig',
      '  explain Get-ChildItem',
      '  explain netsh',
      '  explain chmod',
      '  explain diskpart',
      '',
      'Provides practical usage, formal syntax, common switches, and polytechnic exam notes.',
      '================================================================================',
    ].join('\n');
  }

  // Clean query: strip leading explain or sudo
  let query = trimmed;
  if (query.toLowerCase().startsWith('explain ')) {
    query = query.slice(8).trim();
  }
  if (query.toLowerCase().startsWith('sudo ')) {
    query = query.slice(5).trim();
  }

  // Primary executable/cmdlet name token
  const primaryToken = query.split(/\s+/)[0].replace(/^["']|["']$/g, '');
  const lowerPrimary = primaryToken.toLowerCase();

  // 1. Direct name/alias match
  let match: CommandItem | undefined = COMMAND_REFERENCE.find((item) => {
    const itemNames = item.name.toLowerCase().split(/[\s/(),]+/);
    return itemNames.includes(lowerPrimary);
  });

  // 2. Syntax token match
  if (!match) {
    match = COMMAND_REFERENCE.find((item) => {
      const syntaxTokens = item.syntax.toLowerCase().split(/[\s|,[\]()]+/);
      return syntaxTokens.includes(lowerPrimary);
    });
  }

  // 3. Fallback partial ID or description match
  if (!match) {
    match = COMMAND_REFERENCE.find((item) => {
      return (
        item.id.toLowerCase().includes(lowerPrimary) ||
        item.name.toLowerCase().includes(lowerPrimary)
      );
    });
  }

  if (match) {
    const categoryTitle =
      CATEGORIES.find((c) => c.id === match?.category)?.name || match.category;

    const shellLabel =
      match.shell === 'both'
        ? 'CMD & PowerShell'
        : match.shell === 'cmd'
        ? 'Command Prompt (CMD)'
        : match.shell === 'ps'
        ? 'Windows PowerShell'
        : 'Bash / Linux';

    const lines = [
      '================================================================================',
      `COMMAND REFERENCE: ${match.name.toUpperCase()}`,
      '================================================================================',
      `Category     : ${categoryTitle}  |  Level: ${match.level.toUpperCase()}`,
      `Environment  : ${shellLabel}`,
      '',
      'SYNTAX:',
      `  ${match.syntax}`,
      '',
      'DESCRIPTION:',
      `  ${match.description}`,
      '',
      'PRACTICAL EXAMPLE:',
      `  ${match.example}`,
    ];

    if (match.notes) {
      lines.push('', 'LAB & EXAM NOTES:', `  ${match.notes}`);
    }

    lines.push('================================================================================');
    return lines.join('\n');
  }

  const envName =
    activeShell === 'ps'
      ? 'Windows PowerShell'
      : activeShell === 'bash'
      ? 'Linux Bash'
      : 'Command Prompt (CMD)';

  return [
    '================================================================================',
    `COMMAND REFERENCE: ${primaryToken.toUpperCase()}`,
    '================================================================================',
    `Environment : ${envName}`,
    '',
    'DESCRIPTION:',
    `  '${primaryToken}' is recognized in the ${envName} simulation environment.`,
    '',
    'QUICK HELP / MANUAL LOOKUP:',
    `  - In CMD / Windows : Type 'help ${primaryToken}' or '${primaryToken} /?'`,
    `  - In PowerShell    : Type 'Get-Help ${primaryToken}' or 'help ${primaryToken}'`,
    `  - In Linux / Bash  : Type 'man ${primaryToken}' or '${primaryToken} --help'`,
    '',
    'TIP: Click the "Command Guide" button in the header toolbar to browse all available',
    'syllabus commands categorized by weekly lab topics.',
    '================================================================================',
  ].join('\n');
}
