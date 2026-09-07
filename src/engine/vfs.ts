import { DriveMap, FSDirNode, FSFileNode, FSNode, FSNodeAttrs, NodeLookupResult } from './types';

/**
 * Normalizes and resolves Windows-style file system paths.
 */
export function resolvePath(cwd: string, inputPath?: string): string {
  if (!inputPath || inputPath.trim() === '') {
    return normalizePathString(cwd);
  }

  // Remove wrapping quotes and clean whitespace
  let cleanInput = inputPath.trim().replace(/^["']|["']$/g, '');
  // Normalize forward slashes to backslashes
  cleanInput = cleanInput.replace(/\//g, '\\');

  const cwdNorm = normalizePathString(cwd);
  const currentDrive = getDrive(cwdNorm) || 'C:';

  let drive = currentDrive;
  let basePath = cwdNorm;
  let rest = cleanInput;

  // Case 1: Fully qualified drive path, e.g. "C:\Windows" or "d:\test"
  if (/^[a-zA-Z]:\\/.test(cleanInput)) {
    drive = cleanInput.slice(0, 2).toUpperCase();
    basePath = `${drive}\\`;
    rest = cleanInput.slice(3);
  }
  // Case 2: Drive with relative path, e.g. "C:sub\folder"
  else if (/^[a-zA-Z]:[^\\]/.test(cleanInput)) {
    const specifiedDrive = cleanInput.slice(0, 2).toUpperCase();
    drive = specifiedDrive;
    if (getDrive(cwdNorm) === specifiedDrive) {
      basePath = cwdNorm;
    } else {
      basePath = `${drive}\\`;
    }
    rest = cleanInput.slice(2);
  }
  // Case 3: Drive letter alone, e.g. "C:"
  else if (/^[a-zA-Z]:$/.test(cleanInput)) {
    const specifiedDrive = cleanInput.slice(0, 2).toUpperCase();
    return `${specifiedDrive}\\`;
  }
  // Case 4: Bare drive-rooted path, e.g. "\Windows\System32"
  else if (cleanInput.startsWith('\\')) {
    drive = currentDrive;
    basePath = `${drive}\\`;
    rest = cleanInput.slice(1);
  }
  // Case 5: Relative path, e.g. "Documents\notes.txt" or "..\Program Files"
  else {
    drive = currentDrive;
    basePath = cwdNorm;
    rest = cleanInput;
  }

  // Extract base segments
  const baseSegments = basePath.slice(3).split('\\').filter(Boolean);
  const restSegments = rest.split('\\').filter(Boolean);

  const finalSegments = [...baseSegments];

  for (const seg of restSegments) {
    if (seg === '.') {
      continue;
    }
    if (seg === '..') {
      if (finalSegments.length > 0) {
        finalSegments.pop();
      }
      continue;
    }
    finalSegments.push(seg);
  }

  if (finalSegments.length === 0) {
    return `${drive}\\`;
  }

  return `${drive}\\${finalSegments.join('\\')}`;
}

function getDrive(pathStr: string): string {
  if (/^[a-zA-Z]:/.test(pathStr)) {
    return pathStr.slice(0, 2).toUpperCase();
  }
  return 'C:';
}

export function normalizePathString(pathStr: string): string {
  const clean = pathStr.trim().replace(/\//g, '\\');
  const drive = getDrive(clean);
  const rest = clean.startsWith(drive) ? clean.slice(drive.length) : clean;
  const segments = rest.split('\\').filter(Boolean);
  if (segments.length === 0) {
    return `${drive}\\`;
  }
  return `${drive}\\${segments.join('\\')}`;
}

export class VirtualFileSystem {
  private drives: DriveMap = {};
  private cwd: string = 'C:\\Users\\Student';

  constructor() {
    this.seedDefaultFileSystem();
  }

  public getCwd(): string {
    return this.cwd;
  }

  public setCwd(targetPath: string): boolean {
    const resolved = resolvePath(this.cwd, targetPath);
    const node = this.getNode(resolved);
    if (node && node.type === 'dir') {
      // Store canonical path if possible
      const lookup = this.getNodeResult(resolved);
      this.cwd = lookup ? lookup.canonicalPath : resolved;
      return true;
    }
    return false;
  }

  public getDrives(): DriveMap {
    return this.drives;
  }

  /**
   * Seed realistic default layout:
   * - C:\Windows\System32 (placeholder system files)
   * - C:\Program Files
   * - C:\Users\Student (Desktop, Documents with notes.txt, Downloads)
   */
  public seedDefaultFileSystem(): void {
    const rootC: FSDirNode = {
      type: 'dir',
      children: {
        Windows: {
          type: 'dir',
          children: {
            System32: {
              type: 'dir',
              children: {
                'cmd.exe': {
                  type: 'file',
                  content: '[Binary Executable: Windows Command Processor]',
                  attrs: { system: true, readonly: true },
                },
                'notepad.exe': {
                  type: 'file',
                  content: '[Binary Executable: Notepad]',
                  attrs: { system: true },
                },
                'calc.exe': {
                  type: 'file',
                  content: '[Binary Executable: Calculator]',
                  attrs: { system: true },
                },
                drivers: {
                  type: 'dir',
                  children: {
                    etc: {
                      type: 'dir',
                      children: {
                        hosts: {
                          type: 'file',
                          content: '127.0.0.1 localhost\n::1 localhost',
                          attrs: {},
                        },
                      },
                      attrs: { system: true },
                    },
                  },
                  attrs: { system: true },
                },
              },
              attrs: { system: true },
            },
          },
          attrs: { system: true },
        },
        'Program Files': {
          type: 'dir',
          children: {
            'Common Files': {
              type: 'dir',
              children: {},
              attrs: {},
            },
          },
          attrs: {},
        },
        Users: {
          type: 'dir',
          children: {
            Student: {
              type: 'dir',
              children: {
                Desktop: {
                  type: 'dir',
                  children: {},
                  attrs: {},
                },
                Documents: {
                  type: 'dir',
                  children: {
                    'notes.txt': {
                      type: 'file',
                      content:
                        'SNA Lab 25CS34I - System & Network Administration\nStudent Practice Notes: Windows CMD and PowerShell commands.',
                      attrs: {},
                    },
                  },
                  attrs: {},
                },
                Downloads: {
                  type: 'dir',
                  children: {},
                  attrs: {},
                },
              },
              attrs: {},
            },
          },
          attrs: {},
        },
      },
      attrs: {},
    };

    this.drives = {
      'C:': rootC,
      'D:': { type: 'dir', children: {}, attrs: {} },
      'E:': { type: 'dir', children: {}, attrs: {} },
      'F:': { type: 'dir', children: {}, attrs: {} },
    };
    this.cwd = 'C:\\Users\\Student';
  }

  /**
   * Resolves a path relative to current or specified CWD.
   */
  public resolve(pathInput?: string, baseCwd?: string): string {
    return resolvePath(baseCwd || this.cwd, pathInput);
  }

  /**
   * Retrieves node lookup details with canonical casing and path.
   * Case-insensitive segment matching.
   */
  public getNodeResult(pathInput: string, baseCwd?: string): NodeLookupResult | null {
    const absPath = resolvePath(baseCwd || this.cwd, pathInput);
    const drive = getDrive(absPath);
    const driveRoot = this.drives[drive];

    if (!driveRoot) {
      return null;
    }

    if (absPath === `${drive}\\`) {
      return {
        node: driveRoot,
        canonicalPath: `${drive}\\`,
        canonicalName: `${drive}\\`,
      };
    }

    const segments = absPath.slice(3).split('\\').filter(Boolean);
    let currentNode: FSNode = driveRoot;
    const canonicalSegments: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (currentNode.type !== 'dir') {
        return null;
      }

      const matchKey = Object.keys(currentNode.children).find(
        (key) => key.toLowerCase() === seg.toLowerCase()
      );

      if (!matchKey) {
        return null;
      }

      currentNode = currentNode.children[matchKey];
      canonicalSegments.push(matchKey);
    }

    return {
      node: currentNode,
      canonicalPath: `${drive}\\${canonicalSegments.join('\\')}`,
      canonicalName: canonicalSegments[canonicalSegments.length - 1],
    };
  }

  /**
   * Returns node at given path (or null if not found), case-insensitive.
   */
  public getNode(pathInput: string, baseCwd?: string): FSNode | null {
    const res = this.getNodeResult(pathInput, baseCwd);
    return res ? res.node : null;
  }

  /**
   * Directly creates a directory node at target path.
   */
  public createDirectory(targetPath: string, attrs: FSNodeAttrs = {}, baseCwd?: string): boolean {
    const absPath = resolvePath(baseCwd || this.cwd, targetPath);
    const drive = getDrive(absPath);
    const driveRoot = this.drives[drive];
    if (!driveRoot) return false;

    const segments = absPath.slice(3).split('\\').filter(Boolean);
    if (segments.length === 0) return false; // cannot recreate drive root

    let currentNode: FSDirNode = driveRoot;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const matchKey = Object.keys(currentNode.children).find(
        (k) => k.toLowerCase() === seg.toLowerCase()
      );
      if (!matchKey) {
        return false; // parent directory does not exist
      }
      const child = currentNode.children[matchKey];
      if (child.type !== 'dir') return false;
      currentNode = child;
    }

    const newDirName = segments[segments.length - 1];
    // Check if item already exists
    const existingKey = Object.keys(currentNode.children).find(
      (k) => k.toLowerCase() === newDirName.toLowerCase()
    );
    if (existingKey) {
      return false;
    }

    currentNode.children[newDirName] = {
      type: 'dir',
      children: {},
      attrs: { ...attrs },
    };
    return true;
  }

  /**
   * Directly creates or overwrites a file node at target path.
   */
  public createFile(
    targetPath: string,
    content: string = '',
    attrs: FSNodeAttrs = {},
    baseCwd?: string
  ): boolean {
    const absPath = resolvePath(baseCwd || this.cwd, targetPath);
    const drive = getDrive(absPath);
    const driveRoot = this.drives[drive];
    if (!driveRoot) return false;

    const segments = absPath.slice(3).split('\\').filter(Boolean);
    if (segments.length === 0) return false;

    let currentNode: FSDirNode = driveRoot;

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const matchKey = Object.keys(currentNode.children).find(
        (k) => k.toLowerCase() === seg.toLowerCase()
      );
      if (!matchKey) {
        return false; // parent directory does not exist
      }
      const child = currentNode.children[matchKey];
      if (child.type !== 'dir') return false;
      currentNode = child;
    }

    const fileName = segments[segments.length - 1];
    const existingKey = Object.keys(currentNode.children).find(
      (k) => k.toLowerCase() === fileName.toLowerCase()
    );

    const keyToUse = existingKey || fileName;
    currentNode.children[keyToUse] = {
      type: 'file',
      content,
      attrs: { ...attrs },
    };
    return true;
  }

  /**
   * Helper to retrieve the parent directory node and child key for a given path.
   */
  public getParentAndChildKey(
    pathInput: string,
    baseCwd?: string
  ): { parent: FSDirNode; key: string; existingNode: FSNode | null; canonicalParentPath: string } | null {
    const absPath = resolvePath(baseCwd || this.cwd, pathInput);
    const drive = getDrive(absPath);
    const driveRoot = this.drives[drive];
    if (!driveRoot) return null;

    const segments = absPath.slice(3).split('\\').filter(Boolean);
    if (segments.length === 0) return null; // Root has no parent

    let currentNode: FSDirNode = driveRoot;
    const parentSegments: string[] = [];

    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const matchKey = Object.keys(currentNode.children).find(
        (k) => k.toLowerCase() === seg.toLowerCase()
      );
      if (!matchKey) return null;
      const child = currentNode.children[matchKey];
      if (child.type !== 'dir') return null;
      currentNode = child;
      parentSegments.push(matchKey);
    }

    const targetName = segments[segments.length - 1];
    const matchKey = Object.keys(currentNode.children).find(
      (k) => k.toLowerCase() === targetName.toLowerCase()
    );

    const existingNode = matchKey ? currentNode.children[matchKey] : null;
    const key = matchKey || targetName;
    const canonicalParentPath =
      parentSegments.length === 0
        ? `${drive}\\`
        : `${drive}\\${parentSegments.join('\\')}`;

    return { parent: currentNode, key, existingNode, canonicalParentPath };
  }

  /**
   * Deletes a file node (DEL / ERASE).
   */
  public deleteFile(
    targetPath: string,
    force: boolean = false,
    baseCwd?: string
  ): { success: boolean; error?: string } {
    const info = this.getParentAndChildKey(targetPath, baseCwd);
    if (!info || !info.existingNode) {
      return { success: false, error: 'The system cannot find the file specified.' };
    }

    if (info.existingNode.type === 'dir') {
      return { success: false, error: 'Access is denied. (Target is a directory)' };
    }

    if (info.existingNode.attrs.readonly && !force) {
      return { success: false, error: 'Access is denied. (File is read-only)' };
    }

    delete info.parent.children[info.key];
    return { success: true };
  }

  /**
   * Removes a directory (RD / RMDIR).
   */
  public removeDirectory(
    targetPath: string,
    recursive: boolean = false,
    baseCwd?: string
  ): { success: boolean; error?: string } {
    const absPath = resolvePath(baseCwd || this.cwd, targetPath);
    const cwd = this.getCwd();

    // Cannot remove root directory
    if (absPath.endsWith(':\\') || absPath.endsWith(':\\')) {
      return { success: false, error: 'The directory cannot be removed.' };
    }

    // Cannot remove current working directory or a parent of current working directory
    if (
      cwd.toLowerCase() === absPath.toLowerCase() ||
      cwd.toLowerCase().startsWith(`${absPath.toLowerCase()}\\`)
    ) {
      return {
        success: false,
        error: 'The process cannot access the file because it is being used by another process.',
      };
    }

    const info = this.getParentAndChildKey(targetPath, baseCwd);
    if (!info || !info.existingNode) {
      return { success: false, error: 'The system cannot find the file specified.' };
    }

    if (info.existingNode.type !== 'dir') {
      return { success: false, error: 'The directory name is invalid.' };
    }

    const childKeys = Object.keys(info.existingNode.children);
    if (childKeys.length > 0 && !recursive) {
      return { success: false, error: 'The directory is not empty.' };
    }

    delete info.parent.children[info.key];
    return { success: true };
  }

  /**
   * Renames a file or directory (REN / RENAME).
   */
  public renameNode(
    targetPath: string,
    newName: string,
    baseCwd?: string
  ): { success: boolean; error?: string } {
    const cleanNewName = newName.trim().replace(/^["']|["']$/g, '');
    if (cleanNewName.includes('\\') || cleanNewName.includes('/')) {
      return {
        success: false,
        error: 'The syntax of the command is incorrect. (Cannot specify a new path in rename)',
      };
    }

    const info = this.getParentAndChildKey(targetPath, baseCwd);
    if (!info || !info.existingNode) {
      return { success: false, error: 'The system cannot find the file specified.' };
    }

    const conflict = Object.keys(info.parent.children).find(
      (k) => k.toLowerCase() === cleanNewName.toLowerCase()
    );

    if (conflict) {
      return {
        success: false,
        error: 'A duplicate file name exists, or the file cannot be found.',
      };
    }

    const node = info.existingNode;
    delete info.parent.children[info.key];
    info.parent.children[cleanNewName] = node;
    return { success: true };
  }

  /**
   * Copies a file (COPY).
   */
  public copyFile(
    srcPath: string,
    destPath: string,
    baseCwd?: string
  ): { success: boolean; error?: string } {
    const srcNodeResult = this.getNodeResult(srcPath, baseCwd);
    if (!srcNodeResult) {
      return { success: false, error: 'The system cannot find the file specified.' };
    }
    if (srcNodeResult.node.type !== 'file') {
      return { success: false, error: 'The source must be a file.' };
    }

    const srcFile = srcNodeResult.node;
    const destLookup = this.getNodeResult(destPath, baseCwd);

    if (destLookup && destLookup.node.type === 'dir') {
      // Copy inside dest folder with same source filename
      const targetFilePath = `${destLookup.canonicalPath}\\${srcNodeResult.canonicalName}`;
      const ok = this.createFile(targetFilePath, srcFile.content, { ...srcFile.attrs }, baseCwd);
      return ok ? { success: true } : { success: false, error: 'Failed to write destination file.' };
    }

    // Otherwise dest is target file path
    const ok = this.createFile(destPath, srcFile.content, { ...srcFile.attrs }, baseCwd);
    return ok ? { success: true } : { success: false, error: 'Failed to write destination file.' };
  }

  /**
   * Moves a file or directory (MOVE).
   */
  public moveNode(
    srcPath: string,
    destPath: string,
    baseCwd?: string
  ): { success: boolean; error?: string } {
    const srcInfo = this.getParentAndChildKey(srcPath, baseCwd);
    if (!srcInfo || !srcInfo.existingNode) {
      return { success: false, error: 'The system cannot find the file specified.' };
    }

    const nodeToMove = srcInfo.existingNode;
    const destLookup = this.getNodeResult(destPath, baseCwd);

    if (destLookup && destLookup.node.type === 'dir') {
      // Move into directory
      const destDir = destLookup.node;
      const targetName = srcInfo.key;
      const conflict = Object.keys(destDir.children).find(
        (k) => k.toLowerCase() === targetName.toLowerCase()
      );
      if (conflict) {
        return { success: false, error: 'A file with that name already exists in target directory.' };
      }
      delete srcInfo.parent.children[srcInfo.key];
      destDir.children[targetName] = nodeToMove;
      return { success: true };
    }

    // Move to new path/name
    const destInfo = this.getParentAndChildKey(destPath, baseCwd);
    if (!destInfo) {
      return { success: false, error: 'The system cannot find the path specified.' };
    }

    delete srcInfo.parent.children[srcInfo.key];
    destInfo.parent.children[destInfo.key] = nodeToMove;
    return { success: true };
  }
}
