import { FSDirNode, FSNode } from '../types';
import { evaluateWhereCondition } from './evaluator';
import {
  PSCmdletContext,
  PSCmdletHandler,
  PSFileInfo,
  PSLocalUser,
  PSProcess,
  PSService,
  ParsedStage,
} from './types';

function formatPSDate(timestamp?: number): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  const dateStr = d.toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr}  ${timeStr}`;
}

// 1. Get-ChildItem
export const getChildItemCmdlet: PSCmdletHandler = (stage, { context }) => {
  const targetPath = stage.named['path'] || stage.positional[0] || context.vfs.getCwd();
  const lookup = context.vfs.getNodeResult(targetPath);

  if (!lookup) {
    return {
      text: `Get-ChildItem : Cannot find path '${targetPath}' because it does not exist.`,
      error: true,
    };
  }

  if (lookup.node.type === 'file') {
    const item: PSFileInfo = {
      Mode: `-a---${lookup.node.attrs.readonly ? 'r' : '-'}`,
      LastWriteTime: formatPSDate(lookup.node.modifiedAt),
      Length: lookup.node.content.length,
      Name: lookup.canonicalName,
      FullName: lookup.canonicalPath,
      Extension: lookup.canonicalName.includes('.')
        ? lookup.canonicalName.slice(lookup.canonicalName.lastIndexOf('.'))
        : '',
      _type: 'FileInfo',
    };
    return [item];
  }

  // Directory listing
  const dirNode = lookup.node as FSDirNode;
  const items: PSFileInfo[] = [];

  for (const name of Object.keys(dirNode.children)) {
    const child = dirNode.children[name];
    if (child.type === 'dir') {
      items.push({
        Mode: 'd-----',
        LastWriteTime: formatPSDate(child.modifiedAt),
        Length: '',
        Name: name,
        FullName: `${lookup.canonicalPath}\\${name}`,
        Extension: '',
        _type: 'DirectoryInfo',
      });
    } else {
      items.push({
        Mode: `-a---${child.attrs.readonly ? 'r' : '-'}`,
        LastWriteTime: formatPSDate(child.modifiedAt),
        Length: child.content.length,
        Name: name,
        FullName: `${lookup.canonicalPath}\\${name}`,
        Extension: name.includes('.') ? name.slice(name.lastIndexOf('.')) : '',
        _type: 'FileInfo',
      });
    }
  }

  return items;
};

// 2. Set-Location
export const setLocationCmdlet: PSCmdletHandler = (stage, { context }) => {
  const target = stage.named['path'] || stage.positional[0] || 'C:\\Users\\Student';
  const ok = context.vfs.setCwd(target);
  if (!ok) {
    return {
      text: `Set-Location : Cannot find path '${target}' because it does not exist.`,
      error: true,
    };
  }
  return '';
};

// 3. Get-Location
export const getLocationCmdlet: PSCmdletHandler = (_, { context }) => {
  return [
    {
      Path: context.vfs.getCwd(),
    },
  ];
};

// 4. New-Item
export const newItemCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  const itemType = (stage.named['itemtype'] || stage.positional[1] || 'File').toLowerCase();
  const value = stage.named['value'] ?? '';

  if (!path) {
    return { text: 'New-Item : Missing path parameter.', error: true };
  }

  if (itemType === 'directory' || itemType === 'dir') {
    const ok = context.vfs.createDirectory(path);
    if (!ok) {
      return { text: `New-Item : Failed to create directory '${path}'.`, error: true };
    }
    const lookup = context.vfs.getNodeResult(path);
    return [
      {
        Mode: 'd-----',
        LastWriteTime: formatPSDate(),
        Length: '',
        Name: lookup ? lookup.canonicalName : path,
        FullName: lookup ? lookup.canonicalPath : path,
        Extension: '',
        _type: 'DirectoryInfo',
      },
    ];
  } else {
    const ok = context.vfs.createFile(path, String(value));
    if (!ok) {
      return { text: `New-Item : Failed to create file '${path}'.`, error: true };
    }
    const lookup = context.vfs.getNodeResult(path);
    return [
      {
        Mode: '-a----',
        LastWriteTime: formatPSDate(),
        Length: String(value).length,
        Name: lookup ? lookup.canonicalName : path,
        FullName: lookup ? lookup.canonicalPath : path,
        Extension: path.includes('.') ? path.slice(path.lastIndexOf('.')) : '',
        _type: 'FileInfo',
      },
    ];
  }
};

// 5. Remove-Item
export const removeItemCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  const recurse = Boolean(stage.named['recurse'] || stage.named['r']);

  if (!path) {
    return { text: 'Remove-Item : Missing path parameter.', error: true };
  }

  const lookup = context.vfs.getNodeResult(path);
  if (!lookup) {
    return { text: `Remove-Item : Cannot find path '${path}' because it does not exist.`, error: true };
  }

  if (lookup.node.type === 'dir') {
    const res = context.vfs.removeDirectory(path, recurse);
    if (!res.success) {
      return { text: `Remove-Item : ${res.error}`, error: true };
    }
  } else {
    const res = context.vfs.deleteFile(path, true);
    if (!res.success) {
      return { text: `Remove-Item : ${res.error}`, error: true };
    }
  }

  return '';
};

// 6. Copy-Item
export const copyItemCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  const dest = stage.named['destination'] || stage.positional[1] || '.';

  if (!path) return { text: 'Copy-Item : Missing path parameter.', error: true };

  const res = context.vfs.copyFile(path, dest);
  if (!res.success) {
    return { text: `Copy-Item : ${res.error}`, error: true };
  }
  return '';
};

// 7. Move-Item
export const moveItemCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  const dest = stage.named['destination'] || stage.positional[1];

  if (!path || !dest) return { text: 'Move-Item : Missing parameters.', error: true };

  const res = context.vfs.moveNode(path, dest);
  if (!res.success) {
    return { text: `Move-Item : ${res.error}`, error: true };
  }
  return '';
};

// 8. Rename-Item
export const renameItemCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  const newName = stage.named['newname'] || stage.positional[1];

  if (!path || !newName) return { text: 'Rename-Item : Missing parameters.', error: true };

  const res = context.vfs.renameNode(path, newName);
  if (!res.success) {
    return { text: `Rename-Item : ${res.error}`, error: true };
  }
  return '';
};

// 9. Get-Content
export const getContentCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  if (!path) return { text: 'Get-Content : Missing path parameter.', error: true };

  const lookup = context.vfs.getNodeResult(path);
  if (!lookup) {
    return { text: `Get-Content : Cannot find path '${path}' because it does not exist.`, error: true };
  }

  if (lookup.node.type === 'dir') {
    return { text: `Get-Content : Cannot read directory as a file.`, error: true };
  }

  if (lookup.node.attrs.encrypted) {
    return {
      text: `Get-Content : Access is denied. (The file is encrypted with EFS).`,
      error: true,
    };
  }

  return lookup.node.content;
};

// 10. Set-Content
export const setContentCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  const value = stage.named['value'] !== undefined ? stage.named['value'] : stage.positional[1] ?? '';

  if (!path) return { text: 'Set-Content : Missing path parameter.', error: true };

  context.vfs.createFile(path, String(value));
  return '';
};

// 11. Add-Content
export const addContentCmdlet: PSCmdletHandler = (stage, { context }) => {
  const path = stage.named['path'] || stage.positional[0];
  const value = stage.named['value'] !== undefined ? stage.named['value'] : stage.positional[1] ?? '';

  if (!path) return { text: 'Add-Content : Missing path parameter.', error: true };

  const lookup = context.vfs.getNodeResult(path);
  if (lookup && lookup.node.type === 'file') {
    lookup.node.content += (lookup.node.content.length > 0 ? '\n' : '') + String(value);
    lookup.node.modifiedAt = Date.now();
  } else {
    context.vfs.createFile(path, String(value));
  }
  return '';
};

// 12. Clear-Host
export const clearHostCmdlet: PSCmdletHandler = () => {
  return { text: '', clearScreen: true };
};

// 13. Write-Output
export const writeOutputCmdlet: PSCmdletHandler = (stage) => {
  const val = stage.positional.join(' ');
  return val;
};

// 14. Write-Host
export const writeHostCmdlet: PSCmdletHandler = (stage) => {
  const val = stage.positional.join(' ');
  return val;
};

// 15. Get-Process
export const getProcessCmdlet: PSCmdletHandler = (stage, { context }) => {
  const nameQuery = (stage.named['name'] || stage.positional[0] || '').toLowerCase();
  const idQuery = stage.named['id'] ? parseInt(stage.named['id'], 10) : undefined;

  let procs = context.processes;

  if (idQuery !== undefined) {
    procs = procs.filter((p) => p.pid === idQuery);
  } else if (nameQuery) {
    procs = procs.filter((p) => {
      const pName = p.imageName.toLowerCase().replace(/\.exe$/, '');
      return pName.includes(nameQuery) || p.imageName.toLowerCase().includes(nameQuery);
    });
  }

  // Map to structured PSProcess objects
  const objects: PSProcess[] = procs.map((p) => {
    const cleanName = p.imageName.replace(/\.exe$/i, '');
    return {
      Handles: p.handles ?? Math.floor(p.memUsage / 10),
      NPM: 0,
      PM: p.pm ?? Math.floor(p.memUsage / 2),
      WS: p.ws ?? p.memUsage,
      CPU: p.cpu ?? Number((p.memUsage / 5000).toFixed(2)),
      Id: p.pid,
      SI: p.sessionNum,
      ProcessName: cleanName,
      _type: 'Process',
    };
  });

  return objects;
};

// 16. Stop-Process
export const stopProcessCmdlet: PSCmdletHandler = (stage, { context }) => {
  const idStr = stage.named['id'];
  const nameStr = stage.named['name'] || stage.positional[0];

  const pid = idStr ? parseInt(idStr, 10) : undefined;
  const name = nameStr ? String(nameStr) : undefined;

  if (pid === undefined && !name) {
    return { text: 'Stop-Process : Cannot stop process. Specify -Id or -Name.', error: true };
  }

  const res = context.killProcess({ name, pid });
  if (res.error || res.killed.length === 0) {
    return { text: `Stop-Process : Cannot find a process with ${name ? `name "${name}"` : `ID ${pid}`}.`, error: true };
  }

  return '';
};

// 17. Get-Service
export const getServiceCmdlet: PSCmdletHandler = (stage, { context }) => {
  const nameQuery = (stage.named['name'] || stage.positional[0] || '').toLowerCase();
  let list = context.services;

  if (nameQuery) {
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(nameQuery) ||
        s.displayName.toLowerCase().includes(nameQuery)
    );
  }

  const res: PSService[] = list.map((s) => ({
    Status: s.status,
    Name: s.name,
    DisplayName: s.displayName,
    _type: 'ServiceController',
  }));

  return res;
};

// 18. New-LocalUser
export const newLocalUserCmdlet: PSCmdletHandler = (stage, { context }) => {
  const name = stage.named['name'] || stage.positional[0];
  const desc = stage.named['description'] || 'Polytechnic Lab User';

  if (!name) return { text: 'New-LocalUser : Missing -Name parameter.', error: true };

  const res = context.addUser(name);
  if (!res.success) {
    return { text: `New-LocalUser : ${res.error}`, error: true };
  }

  const u = context.getUser(name);
  if (u) u.comment = desc;

  return [
    {
      Name: name,
      Enabled: true,
      Description: desc,
      _type: 'LocalUser',
    },
  ];
};

// 19. Get-LocalUser
export const getLocalUserCmdlet: PSCmdletHandler = (stage, { context }) => {
  const nameQuery = (stage.named['name'] || stage.positional[0] || '').toLowerCase();
  let users = context.getAllUsers();

  if (nameQuery) {
    users = users.filter((u) => u.username.toLowerCase().includes(nameQuery));
  }

  const res: PSLocalUser[] = users.map((u) => ({
    Name: u.username,
    Enabled: u.active,
    Description: u.comment,
    _type: 'LocalUser',
  }));

  return res;
};

// 20. Remove-LocalUser
export const removeLocalUserCmdlet: PSCmdletHandler = (stage, { context }) => {
  const name = stage.named['name'] || stage.positional[0];
  if (!name) return { text: 'Remove-LocalUser : Missing -Name parameter.', error: true };

  const res = context.deleteUser(name);
  if (!res.success) {
    return { text: `Remove-LocalUser : ${res.error}`, error: true };
  }
  return '';
};

// 21. Test-Connection
export const testConnectionCmdlet: PSCmdletHandler = (stage) => {
  const target = stage.named['computername'] || stage.named['targetname'] || stage.positional[0] || 'localhost';
  const count = parseInt(stage.named['count'] || '4', 10);
  const ip = target === 'localhost' ? '127.0.0.1' : target === 'google.com' ? '142.250.192.46' : '192.168.1.1';

  const rows = [];
  for (let i = 0; i < Math.min(count, 4); i++) {
    rows.push({
      Destination: target,
      IPV4Address: ip,
      Bytes: 32,
      Time: i % 2 === 0 ? '<1' : '1',
      Status: 'Success',
    });
  }
  return rows;
};

// 22. Get-Date
export const getDateCmdlet: PSCmdletHandler = () => {
  const d = new Date();
  const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = d.toLocaleDateString('en-US', { month: 'long' });
  const day = d.getDate();
  const year = d.getFullYear();
  const timeStr = d.toLocaleTimeString('en-US');
  return `${dayName}, ${monthName} ${day}, ${year} ${timeStr}`;
};

// --- GENERIC PIPELINE STAGES ---

// Where-Object / where / ?
export const whereObjectCmdlet: PSCmdletHandler = (stage, { pipelineInput }) => {
  if (!pipelineInput || !Array.isArray(pipelineInput)) {
    return [];
  }

  return pipelineInput.filter((item) =>
    evaluateWhereCondition(item, stage.scriptBlock, stage.positional, stage.named)
  );
};

// Sort-Object / sort
export const sortObjectCmdlet: PSCmdletHandler = (stage, { pipelineInput }) => {
  if (!pipelineInput || !Array.isArray(pipelineInput)) {
    return [];
  }

  const propName = stage.positional[0] || stage.named['property'] || '';
  const descending = Boolean(stage.named['descending'] || stage.named['desc']);

  const cloned = [...pipelineInput];

  if (!propName) {
    cloned.sort((a, b) => {
      const sa = String(a);
      const sb = String(b);
      return descending ? sb.localeCompare(sa) : sa.localeCompare(sb);
    });
    return cloned;
  }

  cloned.sort((a, b) => {
    let valA = a[propName];
    let valB = b[propName];

    // Case-insensitive key match if not found directly
    if (valA === undefined) {
      const k = Object.keys(a).find((x) => x.toLowerCase() === propName.toLowerCase());
      if (k) valA = a[k];
    }
    if (valB === undefined) {
      const k = Object.keys(b).find((x) => x.toLowerCase() === propName.toLowerCase());
      if (k) valB = b[k];
    }

    const numA = Number(valA);
    const numB = Number(valB);

    let diff = 0;
    if (!isNaN(numA) && !isNaN(numB) && typeof valA !== 'boolean' && typeof valB !== 'boolean') {
      diff = numA - numB;
    } else {
      diff = String(valA ?? '').localeCompare(String(valB ?? ''));
    }

    return descending ? -diff : diff;
  });

  return cloned;
};

// Select-Object / select
export const selectObjectCmdlet: PSCmdletHandler = (stage, { pipelineInput }) => {
  if (!pipelineInput || !Array.isArray(pipelineInput)) {
    return [];
  }

  let items = [...pipelineInput];

  if (stage.named['first'] !== undefined) {
    const n = parseInt(stage.named['first'], 10);
    items = items.slice(0, n);
  } else if (stage.named['last'] !== undefined) {
    const n = parseInt(stage.named['last'], 10);
    items = items.slice(-n);
  }

  const propArg = stage.named['property'] || stage.positional[0];
  if (propArg) {
    const props = String(propArg).split(',').map((p) => p.trim()).filter(Boolean);
    if (props.length > 0) {
      items = items.map((obj) => {
        const projection: Record<string, any> = {};
        for (const p of props) {
          const key = Object.keys(obj).find((k) => k.toLowerCase() === p.toLowerCase()) || p;
          projection[key] = obj[key];
        }
        return projection;
      });
    }
  }

  return items;
};

// Get-Help / help
export const getHelpCmdlet: PSCmdletHandler = (stage) => {
  const topic = stage.positional[0] || stage.named['name'];
  if (topic) {
    const t = String(topic).toLowerCase();
    if (t.includes('process')) {
      return {
        text: `NAME\n    Get-Process\n\nSYNOPSIS\n    Gets the processes that are running on the local computer.\n\nSYNTAX\n    Get-Process [[-Name] <String[]>] [-Id <Int32[]>]\n\nRELATED LINKS\n    Stop-Process\n    Where-Object\n    Sort-Object`,
        error: false,
      };
    }
    if (t.includes('service')) {
      return {
        text: `NAME\n    Get-Service\n\nSYNOPSIS\n    Gets the services on a local computer.\n\nSYNTAX\n    Get-Service [[-Name] <String[]>]\n\nRELATED LINKS\n    Where-Object`,
        error: false,
      };
    }
    if (t.includes('childitem') || t === 'dir' || t === 'ls') {
      return {
        text: `NAME\n    Get-ChildItem\n\nSYNOPSIS\n    Gets the files and folders in a file system drive.\n\nSYNTAX\n    Get-ChildItem [[-Path] <String>]\n\nRELATED LINKS\n    Set-Location\n    Get-Content`,
        error: false,
      };
    }
  }

  const lines = [
    'TOPIC',
    '    Windows PowerShell Help System',
    '',
    'SHORT DESCRIPTION',
    '    Displays help about Windows PowerShell cmdlets and concepts.',
    '',
    'COMMON CMDLETS IN THIS LAB:',
    '    Get-ChildItem (dir, ls)     Gets files and folders in the current directory.',
    '    Set-Location (cd)           Changes the current working location.',
    '    Get-Location (pwd)          Gets the current directory path.',
    '    Get-Content (cat, type)     Gets the content of the item at specified path.',
    '    Set-Content (sc)            Writes or replaces content in a file.',
    '    New-Item (ni)               Creates a new file or directory (-ItemType Directory|File).',
    '    Remove-Item (rm, del)       Deletes files and folders.',
    '    Copy-Item (cp, copy)        Copies an item from one location to another.',
    '    Move-Item (mv, move)        Moves an item from one location to another.',
    '    Get-Process (ps)            Gets the processes running on the local computer.',
    '    Stop-Process (kill)         Stops one or more running processes (-Name or -Id).',
    '    Get-Service (gsv)           Gets the services on a local computer.',
    '    Get-LocalUser               Gets local user accounts.',
    '    New-LocalUser               Creates a new local user account (-Name).',
    '    Clear-Host (cls, clear)     Clears the display in the host program.',
    '    Write-Output (echo)         Sends specified objects to output.',
    '    Test-Connection (ping)      Sends ICMP echo request packets to computers.',
    '',
    'PIPELINES & OBJECTS:',
    '    Where-Object { $_.Prop }    Filters objects by condition (e.g. $_.CPU -gt 1).',
    '    Sort-Object Property        Sorts objects by property (-Descending).',
    '    Select-Object -First N      Selects specified properties or number of objects.',
    '',
    'For details on a specific cmdlet, type: Get-Help <cmdlet-name>',
  ];

  return { text: lines.join('\n'), error: false };
};

// ============================================================================
// Week 7 & 9: Service Control (Start-Service, Stop-Service)
// ============================================================================
export const startServiceCmdlet: PSCmdletHandler = (stage, { context }) => {
  const name = stage.named['name'] || stage.positional[0];
  if (!name) {
    return { text: 'Start-Service : Cannot validate argument on parameter \'Name\'. The argument is null or empty.', error: true };
  }
  const res = context.setServiceStatus(name, 'Running');
  if (!res.success) {
    return { text: `Start-Service : Cannot find any service with service name '${name}'.`, error: true };
  }
  return '';
};

export const stopServiceCmdlet: PSCmdletHandler = (stage, { context }) => {
  const name = stage.named['name'] || stage.positional[0];
  if (!name) {
    return { text: 'Stop-Service : Cannot validate argument on parameter \'Name\'. The argument is null or empty.', error: true };
  }
  const res = context.setServiceStatus(name, 'Stopped');
  if (!res.success) {
    return { text: `Stop-Service : Cannot find any service with service name '${name}'.`, error: true };
  }
  return '';
};

// ============================================================================
// Week 10: Networking Cmdlets (Get-NetIPAddress, Get-NetAdapter, Test-NetConnection)
// ============================================================================
export const getNetIPAddressCmdlet: PSCmdletHandler = (stage, { context }) => {
  const list = [
    {
      IPAddress: context.network.ipv4,
      InterfaceAlias: 'Ethernet0',
      AddressFamily: 'IPv4',
      PrefixLength: 24,
      InterfaceIndex: 12,
      IPAddressState: 'Preferred',
      _type: 'NetIPAddress',
    },
    {
      IPAddress: '127.0.0.1',
      InterfaceAlias: 'Loopback Pseudo-Interface 1',
      AddressFamily: 'IPv4',
      PrefixLength: 8,
      InterfaceIndex: 1,
      IPAddressState: 'Preferred',
      _type: 'NetIPAddress',
    },
  ];

  if (context.vpn.connected && context.vpn.assignedIp) {
    list.push({
      IPAddress: context.vpn.assignedIp,
      InterfaceAlias: context.vpn.name,
      AddressFamily: 'IPv4',
      PrefixLength: 16,
      InterfaceIndex: 18,
      IPAddressState: 'Preferred',
      _type: 'NetIPAddress',
    });
  }

  return list;
};

export const getNetAdapterCmdlet: PSCmdletHandler = (stage, { context }) => {
  const list = [
    {
      Name: 'Ethernet0',
      InterfaceDescription: 'Intel(R) Ethernet Connection I219-LM',
      Status: 'Up',
      MacAddress: context.network.mac,
      LinkSpeed: '1 Gbps',
      _type: 'NetAdapter',
    },
  ];

  if (context.vpn.connected) {
    list.push({
      Name: context.vpn.name,
      InterfaceDescription: `WAN Miniport (${context.vpn.deviceType})`,
      Status: 'Up',
      MacAddress: '00-53-45-00-00-01',
      LinkSpeed: '100 Mbps',
      _type: 'NetAdapter',
    });
  }

  return list;
};

export const testNetConnectionCmdlet: PSCmdletHandler = (stage, { context }) => {
  const target = stage.named['computername'] || stage.positional[0] || '127.0.0.1';
  let remoteIp = target;
  if (target.toLowerCase() === 'localhost') remoteIp = '127.0.0.1';
  else if (target.toLowerCase() === 'google.com') remoteIp = '142.250.192.46';

  return [
    {
      ComputerName: target,
      RemoteAddress: remoteIp,
      InterfaceAlias: 'Ethernet0',
      SourceAddress: context.network.ipv4,
      PingSucceeded: true,
      RoundTripTime: '18 ms',
      _type: 'NetConnection',
    },
  ];
};

// ============================================================================
// Week 11: Virtual Machine & Hyper-V Cmdlets (Get-VM, Get-VMSwitch, Get-VpnConnection)
// ============================================================================
export const getVMCmdlet: PSCmdletHandler = (stage, { context }) => {
  return context.vms.map((vm) => ({
    Name: vm.name,
    State: vm.state,
    CPUUsage: `${vm.cpuUsage}%`,
    MemoryAssigned: `${vm.memoryAssignedMB}MB`,
    Uptime: vm.uptime,
    Status: vm.status,
    _type: 'VM',
  }));
};

export const getVMSwitchCmdlet: PSCmdletHandler = () => {
  return [
    {
      Name: 'Default Switch',
      SwitchType: 'Internal',
      NetAdapterInterfaceDescription: 'Hyper-V Virtual Ethernet Adapter',
      _type: 'VMSwitch',
    },
    {
      Name: 'SNA-Lab-ExternalBridge',
      SwitchType: 'External',
      NetAdapterInterfaceDescription: 'Intel(R) Ethernet Connection I219-LM',
      _type: 'VMSwitch',
    },
  ];
};

export const getVpnConnectionCmdlet: PSCmdletHandler = (stage, { context }) => {
  return [
    {
      Name: context.vpn.name,
      ServerAddress: context.vpn.serverAddress,
      ConnectionStatus: context.vpn.connected ? 'Connected' : 'Disconnected',
      SplitTunneling: false,
      TunnelType: context.vpn.deviceType,
      _type: 'VpnConnection',
    },
  ];
};

// ============================================================================
// Week 8: Storage Cmdlets (Get-Disk, Get-Volume)
// ============================================================================
export const getDiskCmdlet: PSCmdletHandler = (stage, { context }) => {
  return context.disks.map((d) => ({
    Number: d.diskNum,
    FriendlyName: d.diskNum === 0 ? 'NVMe SAMSUNG MZVLB256' : 'SanDisk Ultra USB 3.0',
    SerialNumber: d.diskNum === 0 ? 'S4GENF0MA01248' : '040182740184',
    HealthStatus: 'Healthy',
    OperationalStatus: d.status,
    TotalSize: `${d.sizeGB} GB`,
    PartitionStyle: d.gpt ? 'GPT' : 'MBR',
    _type: 'Disk',
  }));
};

export const getVolumeCmdlet: PSCmdletHandler = (stage, { context }) => {
  return context.volumes.map((v) => ({
    DriveLetter: v.letter || 'None',
    FileSystemLabel: v.label,
    FileSystem: v.fs,
    DriveType: 'Fixed',
    HealthStatus: v.status,
    SizeRemaining: `${Math.round(v.sizeGB * 0.75)} GB`,
    Size: `${v.sizeGB} GB`,
    _type: 'Volume',
  }));
};

