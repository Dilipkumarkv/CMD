export interface ParsedCommand {
  commandName: string;
  positional: string[];
  flags: Record<string, string | boolean>;
  switches: string[]; // e.g. ['+h', '-r', '/s', '/im:notepad.exe']
  rawArgs: string[];
  rawLine: string;
}

/**
 * Splits a command string into tokens respecting double quotes.
 */
export function splitTokens(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (/\s/.test(ch) && !inQuotes) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Tokenizes a CMD command line into command name, positional arguments, and flags.
 */
export function parseCommandLine(line: string): ParsedCommand {
  const trimmed = line.trim();
  if (!trimmed) {
    return {
      commandName: '',
      positional: [],
      flags: {},
      switches: [],
      rawArgs: [],
      rawLine: line,
    };
  }

  const rawTokens = splitTokens(trimmed);
  let commandName = (rawTokens[0] || '').toLowerCase();
  let restTokens = rawTokens.slice(1);

  // Handle attached switches in commandName, e.g. "ipconfig/all", "dir/w/p", "chkdsk/f"
  if (commandName.includes('/') && !commandName.startsWith('cd/') && !/^[a-z]:\//i.test(commandName)) {
    const slashIdx = commandName.indexOf('/');
    const actualCmd = commandName.substring(0, slashIdx);
    const attachedPart = commandName.substring(slashIdx);
    commandName = actualCmd;
    const attachedSwitches = attachedPart.split(/(?=\/)/).filter(Boolean);
    restTokens = [...attachedSwitches, ...restTokens];
  }

  // Handle cd.. and cd\ and cd/ special cases (CMD allows them without space)
  if (commandName.startsWith('cd.') || commandName.startsWith('cd\\') || commandName.startsWith('cd/')) {
    const remaining = commandName.substring(2); // take the part after 'cd'
    commandName = 'cd';
    restTokens = [remaining, ...restTokens];
  }

  // Handle drive letter changes e.g. "C:" or "d:"
  if (/^[a-z]:$/i.test(commandName)) {
    restTokens = [commandName, ...restTokens];
    commandName = 'cd';
  }

  // Expand any tokens with chained switches, e.g. "/w/p" -> ["/w", "/p"]
  const expandedTokens: string[] = [];
  for (const token of restTokens) {
    if (token.startsWith('/') && token.indexOf('/', 1) !== -1) {
      const parts = token.split(/(?=\/)/).filter(Boolean);
      expandedTokens.push(...parts);
    } else {
      expandedTokens.push(token);
    }
  }
  restTokens = expandedTokens;

  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  const switches: string[] = [];

  // Look-ahead for flags that take values, e.g. /im notepad.exe or /pid 1234
  const valueFlags = new Set(['im', 'pid', 't', 'fi']);

  for (let i = 0; i < restTokens.length; i++) {
    const token = restTokens[i];

    // Check for + or - attribute flags (e.g. +h, -r, +s, -a)
    if (/^[+-][a-zA-Z]$/.test(token)) {
      switches.push(token);
      continue;
    }

    // Check for / or - flags (e.g. /all, /s, /im, /flushdns, -h, /im:notepad.exe)
    if (token.startsWith('/') || (token.startsWith('-') && !/^[+-][a-zA-Z]$/.test(token))) {
      switches.push(token);
      const clean = token.replace(/^[\/-]/, '');

      // Flag with colon, e.g. /im:notepad.exe or /pid:4520
      if (clean.includes(':')) {
        const [k, ...vParts] = clean.split(':');
        flags[k.toLowerCase()] = vParts.join(':');
      } else {
        const key = clean.toLowerCase();
        // Check if next token is value
        if (valueFlags.has(key) && i + 1 < restTokens.length && !restTokens[i + 1].startsWith('/') && !restTokens[i + 1].startsWith('-')) {
          flags[key] = restTokens[i + 1];
          i++; // consume value token
        } else {
          flags[key] = true;
        }
      }
    } else {
      positional.push(token);
    }
  }

  return {
    commandName,
    positional,
    flags,
    switches,
    rawArgs: restTokens,
    rawLine: line,
  };
}
