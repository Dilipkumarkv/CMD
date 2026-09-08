import { LabContext } from '../context';
import { parseCommandLine } from '../tokenizer';
import {
  attribCommand,
  cdCommand,
  cipherCommand,
  copyCommand,
  delCommand,
  dirCommand,
  mdCommand,
  moveCommand,
  rdCommand,
  renCommand,
  treeCommand,
  typeCommand,
} from './fs-commands';
import {
  chkdskCommand,
  ipconfigCommand,
  netstatCommand,
  nslookupCommand,
  pingCommand,
  sfcCommand,
  tracertCommand,
} from './network-commands';
import {
  arpCommand,
  bcdeditCommand,
  diskpartCommand,
  dismCommand,
  driverqueryCommand,
  formatCommand,
  netshCommand,
  rasdialCommand,
  routeCommand,
  scCommand,
} from './syllabus-commands';
import {
  clsCommand,
  colorCommand,
  dateCommand,
  echoCommand,
  helpCommand,
  netCommand,
  systeminfoCommand,
  taskkillCommand,
  tasklistCommand,
  timeCommand,
  verCommand,
  whoamiCommand,
  shutdownCommand,
} from './system-commands';
import { CommandRegistry, CommandResult } from './types';

/**
 * Command registry mapping command names (lowercase) to handler functions.
 * Easily extensible by adding new entries without nested if/else statements.
 */
export const defaultRegistry: CommandRegistry = {
  // Filesystem Commands
  dir: dirCommand,
  cd: cdCommand,
  chdir: cdCommand,
  md: mdCommand,
  mkdir: mdCommand,
  rd: rdCommand,
  rmdir: rdCommand,
  del: delCommand,
  erase: delCommand,
  copy: copyCommand,
  move: moveCommand,
  ren: renCommand,
  rename: renCommand,
  type: typeCommand,
  tree: treeCommand,
  attrib: attribCommand,
  cipher: cipherCommand,

  // General System Commands
  cls: clsCommand,
  color: colorCommand,
  echo: echoCommand,
  ver: verCommand,
  date: dateCommand,
  time: timeCommand,
  help: helpCommand,
  whoami: whoamiCommand,
  net: netCommand,
  systeminfo: systeminfoCommand,
  tasklist: tasklistCommand,
  taskkill: taskkillCommand,
  shutdown: shutdownCommand,

  // Network & Diagnostic Commands
  ipconfig: ipconfigCommand,
  ping: pingCommand,
  tracert: tracertCommand,
  netstat: netstatCommand,
  nslookup: nslookupCommand,
  chkdsk: chkdskCommand,
  sfc: sfcCommand,

  // Week 6-11 Live-State Syllabus Commands
  route: routeCommand,
  arp: arpCommand,
  netsh: netshCommand,
  diskpart: diskpartCommand,
  list: diskpartCommand,
  select: diskpartCommand,
  detail: diskpartCommand,
  format: formatCommand,
  driverquery: driverqueryCommand,
  sc: scCommand,
  bcdedit: bcdeditCommand,
  dism: dismCommand,
  rasdial: rasdialCommand,
};

function checkRedirection(line: string): { cmdPart: string; targetFile?: string; append?: boolean } {
  let inQuotes = false;
  let quoteChar = '';
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (!inQuotes && (c === '"' || c === "'")) {
      inQuotes = true;
      quoteChar = c;
    } else if (inQuotes && c === quoteChar) {
      inQuotes = false;
    } else if (!inQuotes) {
      if (c === '>' && line[i + 1] === '>') {
        return {
          cmdPart: line.slice(0, i).trim(),
          targetFile: line.slice(i + 2).trim().replace(/^["']|["']$/g, ''),
          append: true,
        };
      } else if (c === '>') {
        return {
          cmdPart: line.slice(0, i).trim(),
          targetFile: line.slice(i + 1).trim().replace(/^["']|["']$/g, ''),
          append: false,
        };
      }
    }
  }
  return { cmdPart: line };
}

/**
 * Executes a raw command line string against the command registry and lab context.
 */
export function executeCommand(
  rawCommandLine: string,
  context: LabContext,
  customRegistry: CommandRegistry = defaultRegistry
): CommandResult {
  const redir = checkRedirection(rawCommandLine);
  const lineToRun = redir.targetFile ? redir.cmdPart : rawCommandLine;

  const parsed = parseCommandLine(lineToRun);

  if (!parsed.commandName) {
    return { error: false, text: '' };
  }

  if (context.inDiskPart === 'cmd') {
    try {
      return diskpartCommand(parsed.positional, parsed.flags, parsed.switches, context, lineToRun);
    } catch (e: any) {
      return { error: true, text: `Diskpart encountered an error: ${e.message}` };
    }
  }

  const handler = customRegistry[parsed.commandName];

  if (!handler) {
    return {
      error: true,
      text: `'${parsed.commandName}' is not recognized as an internal or external command,\noperable program or batch file.`,
    };
  }

  try {
    const result = handler(parsed.positional, parsed.flags, parsed.switches, context, lineToRun);
    if (redir.targetFile && !result.error) {
      if (redir.append) {
        const existing = context.vfs.getNodeResult(redir.targetFile);
        if (existing && existing.node.type === 'file') {
          existing.node.content += (existing.node.content.length > 0 ? '\n' : '') + result.text;
        } else {
          context.vfs.createFile(redir.targetFile, result.text);
        }
      } else {
        context.vfs.createFile(redir.targetFile, result.text);
      }
      return { error: false, text: '' };
    }
    return result;
  } catch (err: any) {
    return {
      error: true,
      text: `Command execution error: ${err?.message || String(err)}`,
    };
  }
}
