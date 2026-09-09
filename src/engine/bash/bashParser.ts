/**
 * Dedicated POSIX/Bash Command-Line Parser for the Linux Terminal Simulation.
 *
 * Correctly distinguishes between POSIX file paths (e.g. /etc/passwd, /var/log, /)
 * and Unix-style options (-la, -rf, --help, -n 5, --lines=10), unlike Windows CMD parsers.
 */

export interface ParsedBashCommand {
  commandName: string;
  positional: string[];
  flags: Record<string, string | boolean>;
  switches: string[];
  rawArgs: string[];
  rawLine: string;
}

// Flags that take an immediate value argument in Unix utilities
const VALUE_FLAGS = new Set([
  'n',
  'lines',
  'c',
  'count',
  'u',
  'user',
  'p',
  'port',
  'name',
  'type',
  'o',
  'output',
  's',
  't',
  'm',
]);

/**
 * Splits a command line into raw shell tokens respecting single and double quotes.
 */
export function tokenizeBashLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingle) {
      escaped = true;
      continue;
    }

    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      continue;
    }

    if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      continue;
    }

    if (/\s/.test(char) && !inDouble && !inSingle) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Parses a raw bash command line string into a structured ParsedBashCommand.
 */
export function parseBashCommandLine(rawLine: string): ParsedBashCommand {
  const trimmed = rawLine.trim();
  if (!trimmed) {
    return {
      commandName: '',
      positional: [],
      flags: {},
      switches: [],
      rawArgs: [],
      rawLine,
    };
  }

  const rawTokens = tokenizeBashLine(trimmed);
  if (rawTokens.length === 0) {
    return {
      commandName: '',
      positional: [],
      flags: {},
      switches: [],
      rawArgs: [],
      rawLine,
    };
  }

  let commandToken = rawTokens[0];
  const restTokens = rawTokens.slice(1);

  // Normalize command name: resolve /bin/cmd, /usr/bin/cmd, /sbin/cmd, etc.
  let commandName = commandToken;
  if (/^(\/usr)?(\/local)?\/(bin|sbin)\/[a-zA-Z0-9_\-]+$/.test(commandToken)) {
    commandName = commandToken.substring(commandToken.lastIndexOf('/') + 1);
  }

  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  const switches: string[] = [];

  // Expand standard bash aliases
  const lowerCmd = commandName.toLowerCase();
  if (lowerCmd === 'll') {
    commandName = 'ls';
    flags['l'] = true;
    flags['a'] = true;
    flags['la'] = true;
    switches.push('-la', 'la', '-l', 'l', '-a', 'a');
  } else if (lowerCmd === 'la') {
    commandName = 'ls';
    flags['a'] = true;
    flags['all'] = true;
    switches.push('-a', 'a', '-all', 'all');
  } else if (lowerCmd === 'l') {
    commandName = 'ls';
  }

  for (let i = 0; i < restTokens.length; i++) {
    const token = restTokens[i];

    // 1. Long options starting with -- (e.g. --help, --all, --lines=10, --name "*.txt")
    if (token.startsWith('--')) {
      const full = token.substring(2);
      switches.push(token);
      switches.push(full);

      if (full.includes('=')) {
        const [k, ...v] = full.split('=');
        const key = k.toLowerCase();
        const val = v.join('=');
        flags[key] = val;
        if (key === 'lines') flags['n'] = val;
      } else {
        const key = full.toLowerCase();
        // Check if next token is value
        if (
          VALUE_FLAGS.has(key) &&
          i + 1 < restTokens.length &&
          !restTokens[i + 1].startsWith('-')
        ) {
          const val = restTokens[i + 1];
          flags[key] = val;
          if (key === 'lines') flags['n'] = val;
          i++; // consume value token
        } else {
          flags[key] = true;
          if (key === 'all') flags['a'] = true;
          if (key === 'help') flags['h'] = true;
        }
      }
      continue;
    }

    // 2. Numeric line flags like head -5 or tail -20
    if (/^-\d+$/.test(token)) {
      const num = token.substring(1);
      flags[num] = true;
      flags['n'] = num;
      flags['lines'] = num;
      switches.push(token);
      switches.push(num);
      continue;
    }

    // 3. Short options starting with - (e.g. -l, -la, -rf, -n 5, -n5, -name)
    if (token.startsWith('-') && token.length > 1) {
      // Find-style options: -name, -type
      if (token === '-name' || token === '-type') {
        const key = token.substring(1);
        if (i + 1 < restTokens.length) {
          flags[key] = restTokens[i + 1];
          i++;
        } else {
          flags[key] = true;
        }
        switches.push(token);
        switches.push(key);
        continue;
      }

      // Check attached value e.g. -n5 or -c3
      const singleChar = token[1];
      if (VALUE_FLAGS.has(singleChar) && token.length > 2 && /^[0-9]+$/.test(token.substring(2))) {
        const val = token.substring(2);
        flags[singleChar] = val;
        if (singleChar === 'n') flags['lines'] = val;
        switches.push(token);
        switches.push(singleChar);
        continue;
      }

      // Check separated value flag e.g. -n 5 or -c 4 or -u student
      if (
        token.length === 2 &&
        VALUE_FLAGS.has(singleChar) &&
        i + 1 < restTokens.length &&
        !restTokens[i + 1].startsWith('-')
      ) {
        const val = restTokens[i + 1];
        flags[singleChar] = val;
        if (singleChar === 'n') flags['lines'] = val;
        switches.push(token);
        switches.push(singleChar);
        i++; // consume value
        continue;
      }

      // Short flag cluster e.g. -la, -rf, -lah, -in, -tuln, -ef, -aux
      const cluster = token.substring(1);
      switches.push(token);
      switches.push(cluster);
      flags[cluster] = true;

      for (const ch of cluster) {
        flags[ch] = true;
        switches.push('-' + ch);
        switches.push(ch);
      }
      continue;
    }

    // 4. Special BSD / utility options without leading dashes
    // e.g. `ps aux`, `ps ax`, `ps ef`
    if (commandName.toLowerCase() === 'ps' && (token === 'aux' || token === 'ax' || token === 'ef')) {
      flags['aux'] = true;
      if (token === 'ef') flags['ef'] = true;
      switches.push(token);
      switches.push('-' + token);
      continue;
    }

    // e.g. `tar xvf ...` or `tar cvf ...`
    if (commandName.toLowerCase() === 'tar' && /^[cxvtjzf]+$/.test(token)) {
      flags[token] = true;
      switches.push(token);
      for (const ch of token) {
        flags[ch] = true;
        switches.push(ch);
      }
      continue;
    }

    // 5. Positional arguments (Includes all POSIX paths /etc/passwd, relative paths, filenames)
    positional.push(token);
  }

  return {
    commandName,
    positional,
    flags,
    switches,
    rawArgs: restTokens,
    rawLine,
  };
}
