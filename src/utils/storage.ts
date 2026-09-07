import { LabContext } from '../engine/context';

export function saveLabState(ctx: LabContext) {
  try {
    const data = {
      ...ctx,
      users: Array.from(ctx.users.entries()),
      psVariables: Array.from(ctx.psVariables.entries()),
    };

    localStorage.setItem('lab_state', JSON.stringify(data, (key, value) => {
      if (key === 'parent') {
        return undefined; // Break circular reference in VFS
      }
      if (value instanceof HTMLElement || (value && value.nodeType)) {
        return undefined; // Filter out DOM nodes just in case
      }
      return value;
    }));
  } catch (e) {
    console.error('Failed to save lab state to localStorage', e);
  }
}

export function loadLabState(): LabContext | null {
  try {
    const raw = localStorage.getItem('lab_state');
    if (!raw) return null;

    const data = JSON.parse(raw);
    const ctx = new LabContext();

    const vfsData = data.vfs;
    delete data.vfs;

    // Primitive and simple object types
    Object.assign(ctx, data);

    // Maps
    if (data.users) ctx.users = new Map(data.users);
    if (data.psVariables) ctx.psVariables = new Map(data.psVariables);

    // VFS restoration
    if (vfsData && vfsData.drives) {
      const relink = (node: any, parent: any) => {
        if (node && node.type === 'dir') {
          node.parent = parent;
          if (node.children) {
            for (const key in node.children) {
              relink(node.children[key], node);
            }
          }
        }
      };

      for (const drive in vfsData.drives) {
        relink(vfsData.drives[drive], null);
      }

      Object.assign(ctx.vfs, vfsData);
      
      const drives = ctx.vfs.getDrives();
      if (!drives['D:']) drives['D:'] = { type: 'dir', children: {}, attrs: {} };
      if (!drives['E:']) drives['E:'] = { type: 'dir', children: {}, attrs: {} };
      if (!drives['F:']) drives['F:'] = { type: 'dir', children: {}, attrs: {} };
    }

    return ctx;
  } catch (e) {
    console.error('Failed to load lab state from localStorage', e);
    return null;
  }
}

export function clearLabState() {
  localStorage.removeItem('lab_state');
}
