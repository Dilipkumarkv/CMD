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
 * Normalizes a raw command line string into candidates for reference matching.
 */
function extractCommandCandidates(rawQuery: string): {
  normalizedQuery: string;
  primaryToken: string;
  twoWordCandidate?: string;
  hasAddFlag: boolean;
  hasDeleteFlag: boolean;
} {
  let query = (rawQuery || '').trim();

  // Strip explain, sudo, help, man, Get-Help prefixes
  query = query.replace(/^(explain|sudo|help|man|get-help)\s+/i, '').trim();

  // Strip pipeline and redirection respecting quotes
  let inDouble = false;
  let inSingle = false;
  let escaped = false;
  for (let i = 0; i < query.length; i++) {
    const ch = query[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\' || ch === '`') {
      escaped = true;
      continue;
    }
    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    if (!inDouble && !inSingle && (ch === '|' || ch === '>' || ch === '<')) {
      query = query.substring(0, i).trim();
      break;
    }
  }

  // Handle cd.., cd\, cd/
  if (/^cd[\.\/\\]/i.test(query)) {
    query = 'cd ' + query.substring(2);
  }

  // Split tokens respecting whitespace
  const rawTokens = query.split(/\s+/).filter(Boolean);
  if (rawTokens.length === 0) {
    return {
      normalizedQuery: '',
      primaryToken: '',
      hasAddFlag: false,
      hasDeleteFlag: false,
    };
  }

  let firstToken = rawTokens[0].replace(/^["']|["']$/g, '');

  // Strip path prefix if any (e.g., C:\Windows\System32\ping or ./test or /bin/ls)
  if (firstToken.includes('/') || firstToken.includes('\\')) {
    const parts = firstToken.split(/[/\\]/);
    firstToken = parts[parts.length - 1] || firstToken;
  }

  // Strip attached CMD switches (e.g., "dir/w", "ipconfig/all", "chkdsk/f")
  if (firstToken.includes('/') && !/^[a-z]:\//i.test(firstToken)) {
    firstToken = firstToken.split('/')[0];
  }

  // Strip .exe extension if present
  if (firstToken.toLowerCase().endsWith('.exe')) {
    firstToken = firstToken.slice(0, -4);
  }

  const secondToken = rawTokens[1] ? rawTokens[1].replace(/^["']|["']$/g, '').toLowerCase() : '';
  const lowerFirst = firstToken.toLowerCase();

  const twoWordCandidate = secondToken ? `${lowerFirst} ${secondToken}` : undefined;
  const hasAddFlag = rawTokens.some((t) => /^[/-]?add$/i.test(t));
  const hasDeleteFlag = rawTokens.some((t) => /^[/-]?(del|delete)$/i.test(t));

  return {
    normalizedQuery: query,
    primaryToken: firstToken,
    twoWordCandidate,
    hasAddFlag,
    hasDeleteFlag,
  };
}

/**
 * Finds the most relevant CommandItem from COMMAND_REFERENCE using shell-affinity and longest prefix match.
 */
function findMatchingCommandItem(
  rawQuery: string,
  activeShell?: ShellMode
): { item: CommandItem; matchedToken: string } | null {
  const { primaryToken, twoWordCandidate, hasAddFlag, hasDeleteFlag } = extractCommandCandidates(rawQuery);
  if (!primaryToken) return null;

  const lowerPrimary = primaryToken.toLowerCase();

  // Helper to test if an item matches candidates
  const testMatch = (item: CommandItem): string | null => {
    const itemNameLower = item.name.toLowerCase();

    // Check specific sub-commands like net user add / delete
    if (lowerPrimary === 'net' && twoWordCandidate === 'net user') {
      if (hasAddFlag && item.name.includes('/add')) return 'NET USER ... /ADD';
      if (hasDeleteFlag && item.name.includes('/delete')) return 'NET USER ... /DELETE';
      if (itemNameLower === 'net user') return 'NET USER';
    }

    // Check two-word command match first (e.g. "net start", "net stop", "net localgroup", "route print", "list disk")
    if (twoWordCandidate) {
      if (itemNameLower.includes(twoWordCandidate)) {
        return twoWordCandidate.toUpperCase();
      }
      const syntaxLower = item.syntax.toLowerCase();
      if (syntaxLower.includes(twoWordCandidate)) {
        return twoWordCandidate.toUpperCase();
      }
    }

    // Direct name or alias match
    const itemNames = itemNameLower.split(/[\s/(),]+/);
    if (itemNames.includes(lowerPrimary)) {
      return primaryToken.toUpperCase();
    }

    // Syntax token match
    const syntaxTokens = item.syntax.toLowerCase().split(/[\s|,[\]()]+/);
    if (syntaxTokens.includes(lowerPrimary)) {
      return primaryToken.toUpperCase();
    }

    return null;
  };

  // 1. First pass: prioritize items matching active shell or 'both'
  if (activeShell) {
    for (const item of COMMAND_REFERENCE) {
      if (item.shell === activeShell || item.shell === 'both') {
        const tokenMatch = testMatch(item);
        if (tokenMatch) return { item, matchedToken: tokenMatch };
      }
    }
  }

  // 2. Second pass: search all items in COMMAND_REFERENCE
  for (const item of COMMAND_REFERENCE) {
    const tokenMatch = testMatch(item);
    if (tokenMatch) return { item, matchedToken: tokenMatch };
  }

  // 3. Third pass: partial match by id or name
  for (const item of COMMAND_REFERENCE) {
    if (item.id.toLowerCase().includes(lowerPrimary) || item.name.toLowerCase().includes(lowerPrimary)) {
      return { item, matchedToken: primaryToken.toUpperCase() };
    }
  }

  return null;
}

/**
 * Returns structured metadata for a command query to power interactive UI dialogue boxes.
 */
export function getCommandDetails(rawQuery: string, activeShell?: ShellMode): CommandDetails | null {
  const { primaryToken } = extractCommandCandidates(rawQuery);
  if (!primaryToken) return null;

  const found = findMatchingCommandItem(rawQuery, activeShell);

  const envName =
    activeShell === 'ps'
      ? 'Windows PowerShell'
      : activeShell === 'bash'
      ? 'Linux Bash'
      : 'Command Prompt (CMD)';

  if (found) {
    const { item, matchedToken } = found;
    const categoryTitle =
      CATEGORIES.find((c) => c.id === item.category)?.name || item.category;

    const shellLabel =
      item.shell === 'both'
        ? 'CMD & PowerShell'
        : item.shell === 'cmd'
        ? 'Command Prompt'
        : item.shell === 'ps'
        ? 'PowerShell'
        : 'Linux Bash';

    const switchMatches = item.syntax.match(/\[([/-][A-Za-z0-9_?:]+(?:\s+<[^>]+>)?)\]/g);
    const quickSwitches = switchMatches ? switchMatches.map((s) => s.slice(1, -1)) : undefined;

    return {
      token: matchedToken,
      name: item.name,
      category: categoryTitle,
      level: item.level.toUpperCase(),
      shell: shellLabel,
      syntax: item.syntax,
      description: item.description,
      example: item.example,
      notes: item.notes,
      quickSwitches,
    };
  }

  return {
    token: primaryToken.toUpperCase(),
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
      '  explain net user',
      '  explain tasklist',
      '  explain chmod',
      '',
      'Provides practical usage, formal syntax, common switches, and polytechnic exam notes.',
      '================================================================================',
    ].join('\n');
  }

  const { primaryToken } = extractCommandCandidates(rawQuery);
  const found = findMatchingCommandItem(rawQuery, activeShell);

  if (found) {
    const { item, matchedToken } = found;
    const categoryTitle =
      CATEGORIES.find((c) => c.id === item.category)?.name || item.category;

    const shellLabel =
      item.shell === 'both'
        ? 'CMD & PowerShell'
        : item.shell === 'cmd'
        ? 'Command Prompt (CMD)'
        : item.shell === 'ps'
        ? 'Windows PowerShell'
        : 'Bash / Linux';

    const lines = [
      '================================================================================',
      `COMMAND REFERENCE: ${matchedToken}`,
      '================================================================================',
      `Category     : ${categoryTitle}  |  Level: ${item.level.toUpperCase()}`,
      `Environment  : ${shellLabel}`,
      '',
      'SYNTAX:',
      `  ${item.syntax}`,
      '',
      'DESCRIPTION:',
      `  ${item.description}`,
      '',
      'PRACTICAL EXAMPLE:',
      `  ${item.example}`,
    ];

    if (item.notes) {
      lines.push('', 'LAB & EXAM NOTES:', `  ${item.notes}`);
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
