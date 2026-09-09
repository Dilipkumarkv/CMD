import re

with open('src/engine/bash/bashEngine.ts', 'r') as f:
    content = f.read()

old_rm = """  rm: (pos, flags, switches, ctx) => {
    if (pos.length === 0) {
      return { error: true, text: 'rm: missing operand' };
    }
    try {
      const isRecursive = flags.includes('r') || flags.includes('R');
      const targetPath = pos[0];
      const result = ctx.vfs.getNodeResult(targetPath);
      if (!result) {
        return { error: true, text: `rm: cannot remove '${targetPath}': No such file or directory` };
      }
      if (result.node.type === 'dir' && !isRecursive) {
        return { error: true, text: `rm: cannot remove '${targetPath}': Is a directory` };
      }
      const parent = ctx.vfs.getNodeResult(result.parentPath);
      if (parent && parent.node.type === 'dir') {
        delete parent.node.children[result.name];
      }
      return { error: false, text: '' };
    } catch (e: any) {
      return { error: true, text: `rm: cannot remove '${pos[0]}': ${e.message}` };
    }
  },"""

new_rm = """  rm: (pos, flags, switches, ctx) => {
    if (pos.length === 0) {
      return { error: true, text: 'rm: missing operand' };
    }
    try {
      const isRecursive = flags['r'] || flags['R'];
      const targetPath = pos[0];
      const result = ctx.vfs.getNodeResult(targetPath);
      if (!result) {
        return { error: true, text: `rm: cannot remove '${targetPath}': No such file or directory` };
      }
      if (result.node.type === 'dir') {
        if (!isRecursive) {
          return { error: true, text: `rm: cannot remove '${targetPath}': Is a directory` };
        }
        const delRes = ctx.vfs.removeDirectory(targetPath, true);
        if (!delRes.success) throw new Error(delRes.error);
      } else {
        const delRes = ctx.vfs.deleteFile(targetPath);
        if (!delRes.success) throw new Error(delRes.error);
      }
      return { error: false, text: '' };
    } catch (e: any) {
      return { error: true, text: `rm: cannot remove '${pos[0]}': ${e.message}` };
    }
  },"""

content = content.replace(old_rm, new_rm)

with open('src/engine/bash/bashEngine.ts', 'w') as f:
    f.write(content)
