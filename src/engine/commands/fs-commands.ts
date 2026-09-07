import { CommandHandler, CommandResult } from './types';
import { FSDirNode, FSNode } from '../types';

function formatDate(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  const dateStr = d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr}  ${timeStr}`;
}

export const dirCommand: CommandHandler = (args, flags, switches, context) => {
  const targetPath = args[0] || context.vfs.getCwd();
  const lookup = context.vfs.getNodeResult(targetPath);

  if (!lookup) {
    return {
      error: true,
      text: 'File Not Found',
    };
  }

  const isBare = Boolean(flags['b']);
  const showHidden = Boolean(flags['a'] || flags['ah'] || switches.some((s) => s.toLowerCase().startsWith('/a')));

  if (lookup.node.type === 'file') {
    if (isBare) {
      return { error: false, text: lookup.canonicalName };
    }
    const size = lookup.node.content.length.toLocaleString('en-US');
    const lines = [
      ` Volume in drive C is OS`,
      ` Volume Serial Number is 4C82-9B14`,
      ``,
      ` Directory of ${lookup.canonicalPath.slice(0, lookup.canonicalPath.lastIndexOf('\\') || 3)}`,
      ``,
      `${formatDate(lookup.node.modifiedAt)}    ${size.padStart(14, ' ')} ${lookup.canonicalName}`,
      `               1 File(s) ${size.padStart(14, ' ')} bytes`,
      `               0 Dir(s)  128,450,211,840 bytes free`,
    ];
    return { error: false, text: lines.join('\n') };
  }

  // Directory listing
  const dirNode = lookup.node as FSDirNode;
  const entries = Object.keys(dirNode.children);

  if (isBare) {
    return { error: false, text: entries.join('\n') };
  }

  const lines: string[] = [
    ` Volume in drive C is OS`,
    ` Volume Serial Number is 4C82-9B14`,
    ``,
    ` Directory of ${lookup.canonicalPath}`,
    ``,
  ];

  let dirCount = 0;
  let fileCount = 0;
  let totalBytes = 0;

  // Real CMD shows '.' and '..' unless at drive root
  if (lookup.canonicalPath !== 'C:\\') {
    lines.push(`${formatDate()}    <DIR>          .`);
    lines.push(`${formatDate()}    <DIR>          ..`);
    dirCount += 2;
  }

  for (const name of entries) {
    const child = dirNode.children[name];
    if (child.attrs.hidden && !showHidden) {
      continue;
    }

    if (child.type === 'dir') {
      dirCount++;
      lines.push(`${formatDate(child.modifiedAt)}    <DIR>          ${name}`);
    } else {
      fileCount++;
      const bytes = child.content.length;
      totalBytes += bytes;
      lines.push(
        `${formatDate(child.modifiedAt)}    ${bytes.toLocaleString('en-US').padStart(14, ' ')} ${name}`
      );
    }
  }

  lines.push(
    `              ${fileCount.toString().padStart(2, ' ')} File(s) ${totalBytes.toLocaleString('en-US').padStart(15, ' ')} bytes`
  );
  lines.push(
    `              ${dirCount.toString().padStart(2, ' ')} Dir(s)  128,450,211,840 bytes free`
  );

  return {
    error: false,
    text: lines.join('\n'),
  };
};

export const cdCommand: CommandHandler = (args, flags, switches, context) => {
  let target = args[0];

  // In CMD, "cd /" might be parsed with "/" as a switch instead of an argument
  if (!target && switches.includes('/')) {
    target = '/';
  }

  // If no args, print current directory
  if (!target) {
    return { error: false, text: context.vfs.getCwd() };
  }

  // Handle "cd /d D:\..." or "cd /d C:\..."
  if (flags['d'] && typeof flags['d'] === 'string') {
    target = flags['d'];
  } else if (flags['d'] && args[0]) {
    target = args[0];
  }

  // Let resolvePath handle "\" and "/" normally
  const ok = context.vfs.setCwd(target);
  if (!ok) {
    return {
      error: true,
      text: 'The system cannot find the path specified.',
    };
  }

  return { error: false, text: '' };
};

export const mdCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length === 0) {
    return { error: true, text: 'The syntax of the command is incorrect.' };
  }

  for (const dirName of args) {
    const existing = context.vfs.getNode(dirName);
    if (existing) {
      return {
        error: true,
        text: `A subdirectory or file ${dirName} already exists.`,
      };
    }

    const ok = context.vfs.createDirectory(dirName);
    if (!ok) {
      return {
        error: true,
        text: 'The system cannot find the path specified.',
      };
    }
  }

  return { error: false, text: '' };
};

export const rdCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length === 0) {
    return { error: true, text: 'The syntax of the command is incorrect.' };
  }

  const isRecursive = Boolean(flags['s'] || flags['S'] || switches.some((s) => s.toLowerCase() === '/s'));
  const target = args[0];

  const res = context.vfs.removeDirectory(target, isRecursive);
  if (!res.success) {
    return { error: true, text: res.error || 'Failed to remove directory.' };
  }

  return { error: false, text: '' };
};

export const delCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length === 0) {
    return { error: true, text: 'The syntax of the command is incorrect.' };
  }

  const isForce = Boolean(flags['f'] || flags['F'] || switches.some((s) => s.toLowerCase() === '/f'));
  const target = args[0];

  const res = context.vfs.deleteFile(target, isForce);
  if (!res.success) {
    return { error: true, text: res.error || `Could Not Find ${target}` };
  }

  return { error: false, text: '' };
};

export const copyCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length < 1) {
    return { error: true, text: 'The syntax of the command is incorrect.' };
  }

  const src = args[0];
  const dest = args[1] || '.';

  const res = context.vfs.copyFile(src, dest);
  if (!res.success) {
    return { error: true, text: res.error || 'File copy failed.' };
  }

  return { error: false, text: '        1 file(s) copied.' };
};

export const moveCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length < 2) {
    return { error: true, text: 'The syntax of the command is incorrect.' };
  }

  const src = args[0];
  const dest = args[1];

  const res = context.vfs.moveNode(src, dest);
  if (!res.success) {
    return { error: true, text: res.error || 'The system cannot find the file specified.' };
  }

  return { error: false, text: '        1 file(s) moved.' };
};

export const renCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length < 2) {
    return { error: true, text: 'The syntax of the command is incorrect.' };
  }

  const src = args[0];
  const newName = args[1];

  const res = context.vfs.renameNode(src, newName);
  if (!res.success) {
    return {
      error: true,
      text: res.error || 'A duplicate file name exists, or the file cannot be found.',
    };
  }

  return { error: false, text: '' };
};

export const typeCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length === 0) {
    return { error: true, text: 'The syntax of the command is incorrect.' };
  }

  const target = args[0];
  const lookup = context.vfs.getNodeResult(target);

  if (!lookup) {
    return { error: true, text: 'The system cannot find the file specified.' };
  }

  if (lookup.node.type === 'dir') {
    return { error: true, text: 'Access is denied.' };
  }

  // Check if encrypted attribute is set
  if (lookup.node.attrs.encrypted) {
    return {
      error: true,
      text: 'Access is denied.\n(File is encrypted with EFS and cannot be read without decryption certificate)',
    };
  }

  return { error: false, text: lookup.node.content };
};

export const treeCommand: CommandHandler = (args, flags, switches, context) => {
  const targetPath = args[0] || context.vfs.getCwd();
  const lookup = context.vfs.getNodeResult(targetPath);

  if (!lookup || lookup.node.type !== 'dir') {
    return { error: true, text: 'Invalid path' };
  }

  const lines: string[] = [
    'Folder PATH listing for volume OS',
    'Volume serial number is 4C82-9B14',
    lookup.canonicalPath.toUpperCase(),
  ];

  function walk(dir: FSDirNode, prefix: string) {
    const keys = Object.keys(dir.children).filter((k) => dir.children[k].type === 'dir');
    for (let i = 0; i < keys.length; i++) {
      const name = keys[i];
      const isLast = i === keys.length - 1;
      const branch = isLast ? '└───' : '├───';
      lines.push(`${prefix}${branch}${name}`);
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      walk(dir.children[name] as FSDirNode, nextPrefix);
    }
  }

  walk(lookup.node, '');
  return { error: false, text: lines.join('\n') };
};

export const attribCommand: CommandHandler = (args, flags, switches, context) => {
  // Extract all attribute switches: +h, -h, +r, -r, +s, -s, +a, -a
  const attrSwitches = switches.filter((s) => /^[+-][a-zA-Z]$/.test(s));

  // Find target file/path from args or remaining tokens
  let targetPath = args[0];
  if (!targetPath) {
    targetPath = '.';
  }

  const lookup = context.vfs.getNodeResult(targetPath);
  if (!lookup) {
    return { error: true, text: 'File not found - ' + targetPath };
  }

  // If no switches given, display attributes
  if (attrSwitches.length === 0) {
    if (lookup.node.type === 'file') {
      const a = lookup.node.attrs;
      const str = `${a.archive ? 'A' : ' '}  ${a.system ? 'S' : ' '}  ${a.hidden ? 'H' : ' '}  ${a.readonly ? 'R' : ' '}        ${lookup.canonicalPath}`;
      return { error: false, text: str };
    } else {
      // List entries in dir
      const dir = lookup.node as FSDirNode;
      const lines: string[] = [];
      for (const name of Object.keys(dir.children)) {
        const item = dir.children[name];
        const a = item.attrs;
        const str = `${a.archive ? 'A' : ' '}  ${a.system ? 'S' : ' '}  ${a.hidden ? 'H' : ' '}  ${a.readonly ? 'R' : ' '}        ${lookup.canonicalPath}\\${name}`;
        lines.push(str);
      }
      return { error: false, text: lines.join('\n') };
    }
  }

  // Apply switches
  for (const sw of attrSwitches) {
    const sign = sw[0];
    const flag = sw[1].toLowerCase();
    const val = sign === '+';

    if (flag === 'h') lookup.node.attrs.hidden = val;
    if (flag === 'r') lookup.node.attrs.readonly = val;
    if (flag === 's') lookup.node.attrs.system = val;
    if (flag === 'a') lookup.node.attrs.archive = val;
  }

  return { error: false, text: '' };
};

export const cipherCommand: CommandHandler = (args, flags, switches, context) => {
  const isEncrypt = Boolean(flags['e'] || switches.some((s) => s.toLowerCase() === '/e'));
  const isDecrypt = Boolean(flags['d'] || switches.some((s) => s.toLowerCase() === '/d'));

  if (!isEncrypt && !isDecrypt) {
    return {
      error: false,
      text: 'CIPHER /E (encrypt) or /D (decrypt) [pathname]\nDisplays or alters the encryption of directories [files] on NTFS partitions.',
    };
  }

  const targetPath = args[0] || context.vfs.getCwd();
  const lookup = context.vfs.getNodeResult(targetPath);

  if (!lookup) {
    return { error: true, text: 'The system cannot find the file specified.' };
  }

  const actionName = isEncrypt ? 'Encrypting' : 'Decrypting';
  const pastAction = isEncrypt ? 'encrypted' : 'decrypted';

  lookup.node.attrs.encrypted = isEncrypt;

  const lines = [
    `${actionName} files in ${lookup.canonicalPath.slice(0, lookup.canonicalPath.lastIndexOf('\\') + 1 || 3)}`,
    ``,
    `${lookup.canonicalName.padEnd(20, ' ')} [OK]`,
    ``,
    `1 file(s) [or directorie(s)] within 1 directorie(s) were ${pastAction}.`,
  ];

  return { error: false, text: lines.join('\n') };
};
