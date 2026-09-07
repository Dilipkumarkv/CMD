import { LabContext } from '../context';
import { CommandHandler } from './types';

// ============================================================================
// Week 8: Static Routing (route print / add / delete)
// ============================================================================
export const routeCommand: CommandHandler = (args, flags, switches, context) => {
  const sub = (args[0] || '').toLowerCase();

  if (!sub || sub === 'print' || flags['p'] || switches.includes('/p')) {
    const lines = [
      '===========================================================================',
      'Interface List',
      ` 12...${context.network.mac.replace(/-/g, ' ')} ......Intel(R) Ethernet Connection I219-LM`,
      '  1...........................Software Loopback Interface 1',
      ...(context.vpn.connected
        ? [` 18...00 53 45 00 00 01 ......WAN Miniport (SSTP) - ${context.vpn.name}`]
        : []),
      '===========================================================================',
      '',
      'IPv4 Route Table',
      '===========================================================================',
      'Active Routes:',
      'Network Destination        Netmask          Gateway       Interface  Metric',
    ];

    for (const r of context.routes) {
      const dest = r.networkDestination.padEnd(20, ' ');
      const mask = r.netmask.padEnd(17, ' ');
      const gw = r.gateway.padEnd(16, ' ');
      const iface = r.interfaceIp.padEnd(12, ' ');
      const metric = r.metric.toString().padStart(4, ' ');
      lines.push(`${dest}${mask}${gw}${iface}${metric}`);
    }

    lines.push('===========================================================================');
    lines.push('Persistent Routes:');
    lines.push('  None');
    return { error: false, text: lines.join('\n') };
  }

  if (sub === 'add') {
    // Syntax: route add <dest> [mask <mask>] <gateway> [metric <m>]
    const dest = args[1];
    if (!dest) {
      return { error: true, text: 'The route addition failed: the parameter is incorrect.\n\nUsage: route ADD destination [MASK netmask] [gateway] [METRIC metric]' };
    }

    let mask = '255.255.255.255';
    let gw = '';
    let metric = 25;

    for (let i = 2; i < args.length; i++) {
      const token = args[i].toLowerCase();
      if (token === 'mask' && args[i + 1]) {
        mask = args[i + 1];
        i++;
      } else if (token === 'metric' && args[i + 1]) {
        metric = parseInt(args[i + 1], 10) || 25;
        i++;
      } else if (!gw) {
        gw = args[i];
      }
    }

    if (!gw) {
      gw = context.network.defaultGateway;
    }

    context.addRoute(dest, mask, gw, metric);
    return { error: false, text: ' OK!' };
  }

  if (sub === 'delete') {
    const dest = args[1];
    if (!dest) {
      return { error: true, text: 'The route deletion failed: the parameter is incorrect.\n\nUsage: route DELETE destination' };
    }

    const res = context.deleteRoute(dest);
    if (!res.success) {
      return { error: true, text: `The route deletion failed: ${res.error}` };
    }
    return { error: false, text: ' OK!' };
  }

  return {
    error: true,
    text: 'Manipulates network routing tables.\n\nROUTE [-f] [-p] [-4|-6] command [destination] [MASK netmask] [gateway] [METRIC metric]\n\nCommands: PRINT, ADD, DELETE, CHANGE',
  };
};

// ============================================================================
// Week 10: ARP Cache Management (arp -a / -d / -s)
// ============================================================================
export const arpCommand: CommandHandler = (args, flags, switches, context) => {
  const isA = Boolean(flags['a'] || flags['g'] || switches.includes('/a') || switches.includes('-a') || args.includes('-a') || args.includes('/a'));
  const isD = Boolean(flags['d'] || switches.includes('/d') || switches.includes('-d') || args.includes('-d') || args.includes('/d'));

  if (isA || args.length === 0) {
    const lines = [
      `Interface: ${context.network.ipv4} --- 0xc`,
      '  Internet Address      Physical Address      Type',
    ];

    for (const entry of context.arpTable) {
      const ip = entry.ip.padEnd(22, ' ');
      const mac = entry.mac.padEnd(22, ' ');
      lines.push(`  ${ip}${mac}${entry.type}`);
    }

    return { error: false, text: lines.join('\n') };
  }

  if (isD) {
    context.clearDynamicArp();
    return { error: false, text: '' };
  }

  return {
    error: true,
    text: 'Displays and modifies the IP-to-Physical address translation tables used by\naddress resolution protocol (ARP).\n\nARP -s inet_addr eth_addr [if_addr]\nARP -d inet_addr [if_addr]\nARP -a [inet_addr] [-N if_addr] [-v]',
  };
};

// ============================================================================
// Week 10 & 11: Network Shell (netsh advfirewall / interface / wlan)
// ============================================================================
export const netshCommand: CommandHandler = (args, flags, switches, context) => {
  const fullCmd = args.map((a) => a.toLowerCase()).join(' ');

  // 1. netsh advfirewall show allprofiles
  if (fullCmd.includes('advfirewall') && fullCmd.includes('show')) {
    const pDomain = context.firewall.domain;
    const pPrivate = context.firewall.private;
    const pPublic = context.firewall.public;

    const lines = [
      'Domain Profile Settings:',
      '----------------------------------------------------------------------',
      `State                                 ${pDomain.state ? 'ON' : 'OFF'}`,
      'Firewall Policy                       BlockInbound,AllowOutbound',
      'LocalFirewallRules                    N/A (GPO-store only)',
      '',
      'Private Profile Settings:',
      '----------------------------------------------------------------------',
      `State                                 ${pPrivate.state ? 'ON' : 'OFF'}`,
      'Firewall Policy                       BlockInbound,AllowOutbound',
      '',
      'Public Profile Settings:',
      '----------------------------------------------------------------------',
      `State                                 ${pPublic.state ? 'ON' : 'OFF'}`,
      'Firewall Policy                       BlockInbound,AllowOutbound',
      '',
      'Ok.',
    ];
    return { error: false, text: lines.join('\n') };
  }

  // 2. netsh advfirewall set allprofiles state on/off
  if (fullCmd.includes('advfirewall') && fullCmd.includes('set')) {
    if (fullCmd.includes('state off')) {
      context.setFirewallState('all', false);
      return { error: false, text: 'Ok.' };
    }
    if (fullCmd.includes('state on')) {
      context.setFirewallState('all', true);
      return { error: false, text: 'Ok.' };
    }
    return { error: false, text: 'Ok.' };
  }

  // 3. netsh interface ipv4 show config
  if (fullCmd.includes('interface ipv4 show') || fullCmd.includes('int ip show')) {
    const lines = [
      'Configuration for interface "Ethernet0"',
      `    DHCP enabled:                         ${context.network.dhcpEnabled ? 'Yes' : 'No'}`,
      `    IP Address:                           ${context.network.ipv4}`,
      `    Subnet Prefix:                        ${context.network.subnetMask} (mask 255.255.255.0)`,
      `    Default Gateway:                      ${context.network.defaultGateway}`,
      '    Gateway Metric:                       0',
      '    InterfaceMetric:                      25',
      `    Statically Configured DNS Servers:    ${context.network.dnsServers.join(', ')}`,
      '    Register with which suffix:           Primary only',
    ];
    return { error: false, text: lines.join('\n') };
  }

  // 4. netsh interface show interface
  if (fullCmd.includes('interface show interface')) {
    const lines = [
      'Admin State    State          Type             Interface Name',
      '-------------------------------------------------------------------------',
      'Enabled        Connected      Dedicated        Ethernet0',
      ...(context.vpn.connected
        ? ['Enabled        Connected      VPN              ' + context.vpn.name]
        : ['Disabled       Disconnected   Dedicated        Wi-Fi']),
    ];
    return { error: false, text: lines.join('\n') };
  }

  // 5. netsh wlan show profiles
  if (fullCmd.includes('wlan show profiles')) {
    const lines = [
      'Profiles on interface Wi-Fi:',
      '',
      'Group policy profiles (read only)',
      '---------------------------------',
      '    <None>',
      '',
      'User profiles',
      '-------------',
      '    All User Profile     : Polytechnic-Lab-5G',
      '    All User Profile     : College-Staff-Secure',
      '    All User Profile     : AndroidAP_7824',
    ];
    return { error: false, text: lines.join('\n') };
  }

  return {
    error: false,
    text: 'netsh> The following commands are available:\n\nadvfirewall    - Changes to the `netsh advfirewall` context.\ninterface      - Changes to the `netsh interface` context.\nwlan           - Changes to the `netsh wlan` context.',
  };
};

// ============================================================================
// Week 8: Disk Partitioning (diskpart)
// ============================================================================
export const diskpartCommand: CommandHandler = (args, flags, switches, context) => {
  const line = args.join(' ').toLowerCase();

  // If called interactively or with sub-commands
  if (line.includes('list disk')) {
    const lines = [
      '  Disk ###  Status         Size     Free     Dyn  Gpt',
      '  --------  -------------  -------  -------  ---  ---',
    ];
    for (const d of context.disks) {
      const num = d.diskNum.toString().padStart(8, ' ');
      const stat = d.status.padEnd(13, ' ');
      const sz = `${d.sizeGB} GB`.padStart(7, ' ');
      const fr = `${d.freeGB} GB`.padStart(7, ' ');
      const dyn = d.dyn ? ' * ' : '   ';
      const gpt = d.gpt ? ' * ' : '   ';
      const sel = d.diskNum === context.selectedDiskIndex ? '*' : ' ';
      lines.push(`${sel} Disk ${num}  ${stat}  ${sz}  ${fr}  ${dyn}  ${gpt}`);
    }
    return { error: false, text: lines.join('\n') };
  }

  if (line.includes('list volume') || line.includes('list vol')) {
    const lines = [
      '  Volume ###  Ltr  Label        Fs     Type        Size     Status     Info',
      '  ----------  ---  -----------  -----  ----------  -------  ---------  --------',
    ];
    for (const v of context.volumes) {
      const num = v.volNum.toString().padStart(10, ' ');
      const ltr = (v.letter ? `${v.letter} ` : '   ').padEnd(3, ' ');
      const lbl = v.label.padEnd(11, ' ');
      const fs = v.fs.padEnd(5, ' ');
      const typ = v.type.padEnd(10, ' ');
      const sz = `${v.sizeGB} GB`.padStart(7, ' ');
      const st = v.status.padEnd(9, ' ');
      const inf = v.info;
      lines.push(`  Volume ${num}  ${ltr}  ${lbl}  ${fs}  ${typ}  ${sz}  ${st}  ${inf}`);
    }
    return { error: false, text: lines.join('\n') };
  }

  if (line.includes('select disk')) {
    const match = line.match(/select disk\s+(\d+)/);
    const targetDisk = match ? parseInt(match[1], 10) : 0;
    if (context.disks.some((d) => d.diskNum === targetDisk)) {
      context.selectedDiskIndex = targetDisk;
      return { error: false, text: `Disk ${targetDisk} is now the selected disk.` };
    }
    return { error: true, text: 'The disk you specified is not valid.' };
  }

  if (line.includes('detail disk')) {
    const cur = context.disks.find((d) => d.diskNum === context.selectedDiskIndex) || context.disks[0];
    const lines = [
      `SAMSUNG MZVLB256HAHQ-00000`,
      `Disk ID: {8E1A43F1-2B44-4A2B-8C21-7A39820B1D4F}`,
      `Type   : NVMe`,
      `Status : ${cur.status}`,
      `Path   : 0`,
      `Target : 0`,
      `LUN ID : 0`,
      `Location Path : PCIROOT(0)#PCI(0E00)#NVME(0001)`,
      `Current Read-only State : No`,
      `Read-only  : No`,
      `Boot Disk  : ${cur.diskNum === 0 ? 'Yes' : 'No'}`,
      `Pagefile Disk : ${cur.diskNum === 0 ? 'Yes' : 'No'}`,
      '',
      '  Volume ###  Ltr  Label        Fs     Type        Size     Status     Info',
      '  ----------  ---  -----------  -----  ----------  -------  ---------  --------',
    ];
    for (const v of context.volumes) {
      const num = v.volNum.toString().padStart(10, ' ');
      const ltr = (v.letter ? `${v.letter} ` : '   ').padEnd(3, ' ');
      const lbl = v.label.padEnd(11, ' ');
      const fs = v.fs.padEnd(5, ' ');
      const typ = v.type.padEnd(10, ' ');
      const sz = `${v.sizeGB} GB`.padStart(7, ' ');
      const st = v.status.padEnd(9, ' ');
      lines.push(`  Volume ${num}  ${ltr}  ${lbl}  ${fs}  ${typ}  ${sz}  ${st}  ${v.info}`);
    }
    return { error: false, text: lines.join('\n') };
  }

  if (line.includes('list partition') || line.includes('list part')) {
    const cur = context.disks.find((d) => d.diskNum === context.selectedDiskIndex) || context.disks[0];
    const lines = [
      '  Partition ###  Type              Size     Offset',
      '  -------------  ----------------  -------  -------',
    ];
    for (const p of cur.partitions) {
      const num = p.partNum.toString().padStart(13, ' ');
      const typ = p.type.padEnd(16, ' ');
      const sz = `${p.sizeGB} GB`.padStart(7, ' ');
      const off = `${Math.round(p.offsetKB / 1024)} MB`.padStart(7, ' ');
      lines.push(`  Partition ${num}  ${typ}  ${sz}  ${off}`);
    }
    return { error: false, text: lines.join('\n') };
  }

  // Default interactive banner
  const banner = [
    'Microsoft DiskPart version 10.0.19041.3636',
    '',
    'Copyright (C) Microsoft Corporation.',
    'On computer: ' + context.computerName,
    '',
    'DISKPART> Type "list disk" or "list volume" to view storage geometry.',
    'DISKPART> Type "select disk <n>" or "detail disk" to examine partitions.',
    'DISKPART> Use "exit" to leave DiskPart.',
  ];
  return { error: false, text: banner.join('\n') };
};

// ============================================================================
// Week 8: Volume Format (format D: /fs:NTFS /q)
// ============================================================================
export const formatCommand: CommandHandler = (args, flags, switches, context) => {
  const targetDrive = args[0];
  if (!targetDrive) {
    return { error: true, text: 'Required parameter missing - \n\nUsage: FORMAT volume [/FS:file-system] [/V:label] [/Q] [/A:size]' };
  }

  const cleanLetter = targetDrive.replace(':', '').toUpperCase();
  if (cleanLetter === 'C') {
    return { error: true, text: 'System partition cannot be formatted while the operating system is running.' };
  }

  let fs: 'NTFS' | 'FAT32' = 'NTFS';
  const fsSwitch = switches.find((s) => s.toLowerCase().startsWith('/fs:'));
  if (fsSwitch && fsSwitch.toLowerCase().includes('fat32')) {
    fs = 'FAT32';
  }

  const res = context.formatVolume(cleanLetter, fs);
  if (!res.success) {
    return { error: true, text: res.error || 'The specified drive letter is invalid.' };
  }

  const lines = [
    `The type of the file system is ${fs}.`,
    `QuickFormatting ${cleanLetter}:`,
    `Creating file system structures.`,
    `Format complete.`,
    `   67,108,864 KB total disk space.`,
    `   67,043,328 KB available on disk.`,
    ``,
    `        4,096 bytes in each allocation unit.`,
    `   16,384,000 allocation units available on disk.`,
    ``,
    `Volume Serial Number is 7B3E-2A11`,
  ];
  return { error: false, text: lines.join('\n') };
};

// ============================================================================
// Week 9: Driver Management (driverquery /v)
// ============================================================================
export const driverqueryCommand: CommandHandler = (args, flags, switches, context) => {
  const isVerbose = Boolean(flags['v'] || switches.includes('/v'));

  const lines = [
    'Module Name  Display Name           Driver Type   Link Date',
    '============ ====================== ============= =====================',
  ];

  for (const d of context.drivers) {
    const mod = d.moduleName.padEnd(12, ' ');
    const disp = d.displayName.slice(0, 22).padEnd(22, ' ');
    const typ = d.driverType.padEnd(13, ' ');
    const dt = d.linkDate;
    lines.push(`${mod} ${disp} ${typ} ${dt}`);
  }

  return { error: false, text: lines.join('\n') };
};

// ============================================================================
// Week 7 & 9: Service Control (sc query / start / stop)
// ============================================================================
export const scCommand: CommandHandler = (args, flags, switches, context) => {
  const sub = (args[0] || '').toLowerCase();
  const serviceName = args[1];

  if (!sub || sub === 'query') {
    if (serviceName) {
      const svc = context.getService(serviceName);
      if (!svc) {
        return { error: true, text: `[SC] EnumQueryServicesStatus:OpenService FAILED 1060:\n\nThe specified service does not exist as an installed service.` };
      }
      const isRunning = svc.status === 'Running';
      const lines = [
        `SERVICE_NAME: ${svc.name}`,
        '        TYPE               : 20  WIN32_SHARE_PROCESS ',
        `        STATE              : ${isRunning ? '4  RUNNING' : '1  STOPPED'} `,
        '                                (STOPPABLE, NOT_PAUSABLE, ACCEPTS_SHUTDOWN)',
        '        WIN32_EXIT_CODE    : 0  (0x0)',
        '        SERVICE_EXIT_CODE  : 0  (0x0)',
        '        CHECKPOINT         : 0x0',
        '        WAIT_HINT          : 0x0',
      ];
      return { error: false, text: lines.join('\n') };
    }

    const lines = [
      'SERVICE_NAME: Spooler',
      'DISPLAY_NAME: Print Spooler',
      '        TYPE               : 20  WIN32_SHARE_PROCESS ',
      `        STATE              : ${context.getService('Spooler')?.status === 'Running' ? '4  RUNNING' : '1  STOPPED'}`,
      '        WIN32_EXIT_CODE    : 0  (0x0)',
      '',
      'SERVICE_NAME: wuauserv',
      'DISPLAY_NAME: Windows Update',
      '        TYPE               : 20  WIN32_SHARE_PROCESS ',
      `        STATE              : ${context.getService('wuauserv')?.status === 'Running' ? '4  RUNNING' : '1  STOPPED'}`,
      '        WIN32_EXIT_CODE    : 0  (0x0)',
      '',
      'SERVICE_NAME: EventLog',
      'DISPLAY_NAME: Windows Event Log',
      '        TYPE               : 20  WIN32_SHARE_PROCESS ',
      `        STATE              : ${context.getService('EventLog')?.status === 'Running' ? '4  RUNNING' : '1  STOPPED'}`,
      '        WIN32_EXIT_CODE    : 0  (0x0)',
    ];
    return { error: false, text: lines.join('\n') };
  }

  if (sub === 'start') {
    if (!serviceName) {
      return { error: true, text: 'DESCRIPTION:\n        Starts a service running.\nUSAGE:\n        sc <server> start [service name] <arg1> <arg2> ...' };
    }
    const res = context.setServiceStatus(serviceName, 'Running');
    if (!res.success) {
      return { error: true, text: `[SC] StartService FAILED 1060:\n\n${res.error}` };
    }
    const lines = [
      `SERVICE_NAME: ${serviceName}`,
      '        TYPE               : 20  WIN32_SHARE_PROCESS ',
      '        STATE              : 4  RUNNING ',
      '        WIN32_EXIT_CODE    : 0  (0x0)',
    ];
    return { error: false, text: lines.join('\n') };
  }

  if (sub === 'stop') {
    if (!serviceName) {
      return { error: true, text: 'DESCRIPTION:\n        Sends a STOP control request to a service.\nUSAGE:\n        sc <server> stop [service name]' };
    }
    const res = context.setServiceStatus(serviceName, 'Stopped');
    if (!res.success) {
      return { error: true, text: `[SC] ControlService FAILED 1060:\n\n${res.error}` };
    }
    const lines = [
      `SERVICE_NAME: ${serviceName}`,
      '        TYPE               : 20  WIN32_SHARE_PROCESS ',
      '        STATE              : 1  STOPPED ',
      '        WIN32_EXIT_CODE    : 0  (0x0)',
    ];
    return { error: false, text: lines.join('\n') };
  }

  return {
    error: true,
    text: 'DESCRIPTION:\n        SC is a command line program used for communicating with the\n        Service Control Manager and services.\nUSAGE:\n        sc <server> [command] [service name] <option1> <option2>...',
  };
};

// ============================================================================
// Week 7: Boot Configuration Data (bcdedit)
// ============================================================================
export const bcdeditCommand: CommandHandler = (args, flags, switches, context) => {
  const lines = [
    'Windows Boot Manager',
    '--------------------',
    'identifier              {bootmgr}',
    'device                  partition=\\Device\\HarddiskVolume1',
    'path                    \\EFI\\MICROSOFT\\BOOT\\BOOTMGFW.EFI',
    'description             Windows Boot Manager',
    'locale                  en-US',
    'inherit                 {globalsettings}',
    'default                 {current}',
    'resumeobject            {d2847291-5a02-11ec-981a-00155d8b3a9f}',
    'displayorder            {current}',
    'toolsdisplayorder       {memdiag}',
    'timeout                 30',
    '',
    'Windows Boot Loader',
    '-------------------',
    `identifier              ${context.bcdConfig.identifier}`,
    `device                  ${context.bcdConfig.device}`,
    `path                    ${context.bcdConfig.path}`,
    `description             ${context.bcdConfig.description}`,
    `locale                  ${context.bcdConfig.locale}`,
    'inherit                 {bootloadersettings}',
    'recoverysequence        {d2847293-5a02-11ec-981a-00155d8b3a9f}',
    'recoveryenabled         Yes',
    'isolatedcontext         Yes',
    'allowedinmemorysettings 0x15000075',
    `osdevice                ${context.bcdConfig.osdevice}`,
    `systemroot              ${context.bcdConfig.systemroot}`,
    `resumeobject            ${context.bcdConfig.resumeobject}`,
    `nx                      ${context.bcdConfig.nx}`,
    `bootmenupolicy          ${context.bcdConfig.bootmenupolicy}`,
  ];
  return { error: false, text: lines.join('\n') };
};

// ============================================================================
// Week 9: Deployment Image Servicing and Management (dism)
// ============================================================================
export const dismCommand: CommandHandler = (args, flags, switches, context) => {
  const line = args.join(' ').toLowerCase();

  if (line.includes('cleanup-image') && (line.includes('scanhealth') || line.includes('restorehealth'))) {
    const lines = [
      'Deployment Image Servicing and Management tool',
      'Version: 10.0.19041.3636',
      '',
      'Image Version: 10.0.19045.3803',
      '',
      '[==========================100.0%==========================]',
      'The component store corruption was detected and repaired.',
      'The operation completed successfully.',
    ];
    return { error: false, text: lines.join('\n') };
  }

  const lines = [
    'Deployment Image Servicing and Management tool',
    'Version: 10.0.19041.3636',
    '',
    'DISM.exe [dism_options] {install_options | sfc_options}',
    '  /Online                   - Targets the running operating system.',
    '  /Cleanup-Image            - Performs cleanup and recovery operations on an image.',
    '  /ScanHealth               - Scans the image for component store corruption.',
    '  /RestoreHealth            - Scans for corruption and performs repair operations.',
  ];
  return { error: false, text: lines.join('\n') };
};

// ============================================================================
// Week 11: VPN Connection (rasdial)
// ============================================================================
export const rasdialCommand: CommandHandler = (args, flags, switches, context) => {
  if (args.length === 0) {
    if (context.vpn.connected) {
      return { error: false, text: `Connected to\n${context.vpn.name}\nCommand completed successfully.` };
    }
    return { error: false, text: 'No connections\nCommand completed successfully.' };
  }

  const connName = args[0].replace(/"/g, '');
  const isDisconnect = switches.includes('/disconnect') || switches.includes('/d') || args.includes('/disconnect');

  if (isDisconnect) {
    const res = context.disconnectVpn(connName);
    return { error: false, text: res.message };
  }

  const username = args[1] || 'student';
  const res = context.connectVpn(connName, username);
  return { error: false, text: res.message };
};
