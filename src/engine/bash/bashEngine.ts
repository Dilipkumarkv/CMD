import { LabContext } from '../context';
import { parseBashCommandLine } from './bashParser';
import { bashRegistry, CommandResult } from './bashRegistry';
import { toVfsPath } from './linuxFs';

export type { CommandResult } from './bashRegistry';

function checkRedirection(line: string): { cmdPart: string; targetFile?: string; append?: boolean } {
  // Check for append first (>>)
  let idx = line.lastIndexOf('>>');
  if (idx !== -1) {
    const target = line.substring(idx + 2).trim();
    if (target && !target.includes('>') && !target.includes('<')) {
      return { cmdPart: line.substring(0, idx).trim(), targetFile: target, append: true };
    }
  }

  // Check for truncate (>)
  idx = line.lastIndexOf('>');
  if (idx !== -1) {
    const target = line.substring(idx + 1).trim();
    if (target && !target.includes('<')) {
      return { cmdPart: line.substring(0, idx).trim(), targetFile: target, append: false };
    }
  }

  return { cmdPart: line };
}

function saveRedirection(
  context: LabContext,
  targetFile: string,
  content: string,
  append?: boolean
): void {
  const vfsTarget = toVfsPath(targetFile, context.vfs.getCwd());
  if (append) {
    const existing = context.vfs.getNodeResult(vfsTarget);
    if (existing && existing.node.type === 'file') {
      existing.node.content += (existing.node.content.length > 0 ? '\n' : '') + content;
      return;
    }
  }
  context.vfs.createFile(vfsTarget, content);
}

/**
 * Split command line by operator ('&&', ';', or '|') respecting single and double quotes and escapes.
 */
function splitByOperator(line: string, op: '&&' | ';' | '|'): string[] {
  const parts: string[] = [];
  let cur = '';
  let inDouble = false;
  let inSingle = false;
  let escaped = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (escaped) {
      cur += ch;
      escaped = false;
      continue;
    }

    if (ch === '\\' && !inSingle) {
      escaped = true;
      cur += ch;
      continue;
    }

    if (ch === '"' && !inSingle) inDouble = !inDouble;
    if (ch === "'" && !inDouble) inSingle = !inSingle;

    if (!inDouble && !inSingle) {
      if (op === '&&' && line.substring(i, i + 2) === '&&') {
        parts.push(cur.trim());
        cur = '';
        i++; // skip second &
        continue;
      }
      if (op === ';' && ch === ';') {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
      if (op === '|' && ch === '|' && line.substring(i, i + 2) !== '||') {
        parts.push(cur.trim());
        cur = '';
        continue;
      }
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

/**
 * Converts a simple glob wildcard (* and ?) pattern into a RegExp.
 */
function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const regexStr = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${regexStr}$`);
}

/**
 * Expands wildcard tokens (* and ?) across positional arguments against the virtual filesystem.
 * If no matches occur, leaves the token untouched (standard Bash POSIX behavior).
 */
function expandBashGlobs(positional: string[], context: LabContext): string[] {
  const expanded: string[] = [];

  for (const token of positional) {
    // Only process tokens with unquoted wildcards
    if (!token.includes('*') && !token.includes('?')) {
      expanded.push(token);
      continue;
    }

    // Determine directory prefix and search pattern
    const lastSlash = Math.max(token.lastIndexOf('/'), token.lastIndexOf('\\'));
    let dirPrefix = '';
    let pattern = token;

    if (lastSlash !== -1) {
      dirPrefix = token.substring(0, lastSlash + 1);
      pattern = token.substring(lastSlash + 1);
    }

    // Resolve target directory in VFS
    const currentCwd = context.vfs.getCwd();
    const vfsTargetDir = dirPrefix ? toVfsPath(dirPrefix, currentCwd) : currentCwd;
    const dirNodeRes = context.vfs.getNodeResult(vfsTargetDir);

    if (!dirNodeRes || dirNodeRes.node.type !== 'dir') {
      expanded.push(token);
      continue;
    }

    const regex = globToRegExp(pattern);
    const candidateNames = Object.keys(dirNodeRes.node.children);

    const matches = candidateNames.filter((name) => {
      // In POSIX shells, patterns not starting with '.' do not match hidden files
      if (!pattern.startsWith('.') && name.startsWith('.')) {
        return false;
      }
      return regex.test(name);
    });

    if (matches.length === 0) {
      expanded.push(token);
    } else {
      // Sort matches alphabetically per standard shell globbing rules
      matches.sort((a, b) => a.localeCompare(b));
      for (const match of matches) {
        expanded.push(dirPrefix ? `${dirPrefix}${match}` : match);
      }
    }
  }

  return expanded;
}

function runSingleBashCommand(
  cmdLine: string,
  context: LabContext,
  stdin?: string
): CommandResult {
  const trimmed = cmdLine.trim();
  if (!trimmed) return { error: false, text: '' };

  const parsed = parseBashCommandLine(trimmed);
  if (!parsed.commandName) {
    return { error: false, text: '' };
  }

  // Expand wildcards/globs in positional arguments
  const expandedPositional = expandBashGlobs(parsed.positional, context);

  const handler = bashRegistry[parsed.commandName.toLowerCase()];
  if (!handler) {
    // If it is an executable script or file path like ./run.sh
    if (parsed.commandName.startsWith('./') || parsed.commandName.startsWith('/')) {
      const vfsTarget = toVfsPath(parsed.commandName, context.vfs.getCwd());
      const res = context.vfs.getNodeResult(vfsTarget);
      if (res && res.node.type === 'file') {
        return {
          error: false,
          text: `Executing script ${parsed.commandName}...\n${res.node.content || '[Done]'}`,
        };
      }
      return {
        error: true,
        text: `bash: ${parsed.commandName}: No such file or directory`,
      };
    }

    return {
      error: true,
      text: `bash: ${parsed.commandName}: command not found`,
    };
  }

  try {
    return handler(expandedPositional, parsed.flags, parsed.switches, context, trimmed, stdin);
  } catch (err: any) {
    return {
      error: true,
      text: `bash: ${err?.message || String(err)}`,
    };
  }
}

/**
 * Executes a pipeline segment or single command (handling | pipe with quote awareness).
 */
function executePipeline(pipelineStr: string, context: LabContext): CommandResult {
  const stages = splitByOperator(pipelineStr, '|');
  if (stages.length > 1) {
    let currentInput: string | undefined = undefined;
    let finalResult: CommandResult = { error: false, text: '' };

    for (const stage of stages) {
      finalResult = runSingleBashCommand(stage, context, currentInput);
      if (finalResult.error) {
        return finalResult;
      }
      currentInput = finalResult.text;
    }
    return finalResult;
  }

  return runSingleBashCommand(pipelineStr, context);
}

export function executeBashCommand(
  rawCommandLine: string,
  context: LabContext
): CommandResult {
  const trimmed = rawCommandLine.trim();
  if (!trimmed) return { error: false, text: '' };

  // 1. Handle sequential commands separated by semicolon (;)
  const semiCommands = splitByOperator(trimmed, ';');
  if (semiCommands.length > 1) {
    const outputs: string[] = [];
    let hasError = false;
    let clearScreen = false;

    for (const cmd of semiCommands) {
      const res = executeBashCommand(cmd, context);
      if (res.clearScreen) clearScreen = true;
      if (res.text) outputs.push(res.text);
      if (res.error) {
        hasError = true;
      }
    }
    return { error: hasError, text: outputs.join('\n'), clearScreen };
  }

  // 2. Handle logical AND chained commands (&&)
  const andCommands = splitByOperator(trimmed, '&&');
  if (andCommands.length > 1) {
    const outputs: string[] = [];
    let clearScreen = false;

    for (const cmd of andCommands) {
      const res = executeBashCommand(cmd, context);
      if (res.clearScreen) clearScreen = true;
      if (res.text) outputs.push(res.text);
      if (res.error) {
        return { error: true, text: outputs.join('\n'), clearScreen };
      }
    }
    return { error: false, text: outputs.join('\n'), clearScreen };
  }

  // 3. Handle file redirection (>, >>)
  const redir = checkRedirection(trimmed);
  const lineToRun = redir.targetFile ? redir.cmdPart : trimmed;

  const result = executePipeline(lineToRun, context);

  if (redir.targetFile && !result.error) {
    saveRedirection(context, redir.targetFile, result.text, redir.append);
    return { error: false, text: '' };
  }

  return result;
}
