import { ParsedStage } from './types';

/**
 * Tokenizes a pipeline stage string into arguments, named parameters, and scriptblocks.
 */
export function tokenizeStage(stageStr: string): ParsedStage {
  const trimmed = stageStr.trim();
  const positional: string[] = [];
  const named: Record<string, any> = {};
  let scriptBlock: string | undefined = undefined;

  let i = 0;
  const tokens: string[] = [];

  while (i < trimmed.length) {
    // Skip whitespace
    while (i < trimmed.length && /\s/.test(trimmed[i])) {
      i++;
    }
    if (i >= trimmed.length) break;

    // Check for script block { ... }
    if (trimmed[i] === '{') {
      let depth = 1;
      let start = i + 1;
      i++;
      while (i < trimmed.length && depth > 0) {
        if (trimmed[i] === '{') depth++;
        else if (trimmed[i] === '}') depth--;
        i++;
      }
      scriptBlock = trimmed.slice(start, i - 1).trim();
      tokens.push(`{${scriptBlock}}`);
      continue;
    }

    // Check for quoted token
    if (trimmed[i] === '"' || trimmed[i] === "'") {
      const quote = trimmed[i];
      i++;
      let val = '';
      while (i < trimmed.length && trimmed[i] !== quote) {
        if (trimmed[i] === '`' && i + 1 < trimmed.length) {
          // PowerShell escape character `
          i++;
          val += trimmed[i];
        } else {
          val += trimmed[i];
        }
        i++;
      }
      if (i < trimmed.length && trimmed[i] === quote) {
        i++; // skip closing quote
      }
      tokens.push(val);
      continue;
    }

    // Regular unquoted token
    let token = '';
    while (i < trimmed.length && !/\s/.test(trimmed[i]) && trimmed[i] !== '{') {
      token += trimmed[i];
      i++;
    }
    if (token) {
      tokens.push(token);
    }
  }

  let cmdlet = tokens[0] || '';
  let remaining = tokens.slice(1);

  // Handle attached switches in cmdlet, e.g. "ipconfig/all"
  const lowerCmdlet = cmdlet.toLowerCase();
  if (lowerCmdlet.includes('/') && !lowerCmdlet.startsWith('cd/') && !/^[a-z]:\//i.test(lowerCmdlet)) {
    const slashIdx = cmdlet.indexOf('/');
    const actualCmd = cmdlet.substring(0, slashIdx);
    const attachedPart = cmdlet.substring(slashIdx);
    cmdlet = actualCmd;
    const attachedSwitches = attachedPart.split(/(?=\/)/).filter(Boolean);
    remaining = [...attachedSwitches, ...remaining];
  }

  // Handle cd.. and cd\ and cd/ special cases (PowerShell allows some without space)
  if (lowerCmdlet.startsWith('cd.') || lowerCmdlet.startsWith('cd\\') || lowerCmdlet.startsWith('cd/')) {
    const part = cmdlet.substring(2);
    cmdlet = 'cd';
    remaining = [part, ...remaining];
  }

  // Handle drive letter changes e.g. "C:" or "d:"
  if (/^[a-z]:$/i.test(cmdlet)) {
    remaining = [cmdlet, ...remaining];
    cmdlet = 'cd';
  }

  let idx = 0;
  while (idx < remaining.length) {
    const t = remaining[idx];
    if (t.startsWith('{') && t.endsWith('}')) {
      // already extracted as scriptBlock
      idx++;
      continue;
    }

    if (t.startsWith('-') || t.startsWith('/')) {
      const paramName = t.replace(/^[-/]+/, '');
      // Check if next token is a value (and not another parameter starting with - or /)
      const nextToken = remaining[idx + 1];
      if (
        nextToken !== undefined &&
        !nextToken.startsWith('-') &&
        !nextToken.startsWith('/') &&
        !(nextToken.startsWith('{') && nextToken.endsWith('}'))
      ) {
        named[paramName.toLowerCase()] = nextToken;
        idx += 2;
      } else {
        // Boolean switch like -Descending, -Recurse, or /all
        named[paramName.toLowerCase()] = true;
        idx++;
      }
    } else {
      positional.push(t);
      idx++;
    }
  }

  return {
    raw: trimmed,
    cmdlet,
    positional,
    named,
    scriptBlock,
  };
}

/**
 * Splits a command line into pipeline stages by '|', respecting quotes and braces.
 */
export function splitPipeline(line: string): string[] {
  const stages: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let braceDepth = 0;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
      current += char;
    } else if (!inQuotes && char === '{') {
      braceDepth++;
      current += char;
    } else if (!inQuotes && char === '}') {
      if (braceDepth > 0) braceDepth--;
      current += char;
    } else if (!inQuotes && braceDepth === 0 && char === '|') {
      stages.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    stages.push(current.trim());
  }

  return stages;
}

/**
 * Performs variable substitution on a raw line (e.g. $var replaced with value),
 * excluding scriptblock expressions referencing $_ or $PSItem.
 */
export function substituteVariables(line: string, vars: Map<string, any>): string {
  // Regex finding $identifier but not $_ or $PSItem
  return line.replace(/\$([a-zA-Z0-9_]+)/g, (match, varName) => {
    const lower = varName.toLowerCase();
    if (lower === '_' || lower === 'psitem') {
      return match;
    }
    if (vars.has(lower)) {
      const val = vars.get(lower);
      if (typeof val === 'object') {
        return JSON.stringify(val);
      }
      return String(val);
    }
    return '';
  });
}
