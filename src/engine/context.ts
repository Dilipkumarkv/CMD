import { VirtualFileSystem } from './vfs';

export interface SimulatedUser {
  username: string;
  fullName: string;
  comment: string;
  active: boolean;
  passwordLastSet: string;
  accountExpires: string;
  memberOf: string[];
}

export interface SimulatedProcess {
  imageName: string;
  pid: number;
  sessionName: string;
  sessionNum: number;
  memUsage: number; // in KB
  handles?: number;
  cpu?: number;
  ws?: number;
  pm?: number;
}

export interface SimulatedService {
  name: string;
  displayName: string;
  status: 'Running' | 'Stopped' | 'Paused';
}

export interface SimulatedRoute {
  networkDestination: string;
  netmask: string;
  gateway: string;
  interfaceIp: string;
  metric: number;
}

export interface SimulatedArpEntry {
  ip: string;
  mac: string;
  type: 'dynamic' | 'static';
}

export interface SimulatedDisk {
  diskNum: number;
  status: string;
  sizeGB: number;
  freeGB: number;
  dyn: boolean;
  gpt: boolean;
  partitions: { partNum: number; type: string; sizeGB: number; offsetKB: number }[];
}

export interface SimulatedVolume {
  volNum: number;
  letter: string;
  label: string;
  fs: 'NTFS' | 'FAT32' | 'RAW';
  type: 'Partition' | 'Removable';
  sizeGB: number;
  status: 'Healthy' | 'Degraded';
  info: string;
}

export interface SimulatedDriver {
  moduleName: string;
  displayName: string;
  driverType: 'Kernel' | 'File System';
  linkDate: string;
}

export interface SimulatedVM {
  name: string;
  state: 'Running' | 'Off';
  cpuUsage: number;
  memoryAssignedMB: number;
  uptime: string;
  status: string;
}

export interface FirewallProfile {
  name: string;
  state: boolean;
  inboundAction: 'Block' | 'Allow';
  outboundAction: 'Block' | 'Allow';
}

export interface VpnState {
  name: string;
  serverAddress: string;
  connected: boolean;
  assignedIp?: string;
  deviceType: string;
}

export interface NetworkState {
  hostname: string;
  primaryDnsSuffix: string;
  mac: string;
  dhcpEnabled: boolean;
  ipv4: string;
  subnetMask: string;
  defaultGateway: string;
  dnsServers: string[];
  dnsCacheFlushed: boolean;
}

export class LabContext {
  public vfs: VirtualFileSystem;
  public users: Map<string, SimulatedUser> = new Map();
  public processes: SimulatedProcess[] = [];
  public services: SimulatedService[] = [];
  public network: NetworkState;
  public routes: SimulatedRoute[] = [];
  public arpTable: SimulatedArpEntry[] = [];
  public disks: SimulatedDisk[] = [];
  public volumes: SimulatedVolume[] = [];
  public drivers: SimulatedDriver[] = [];
  public vms: SimulatedVM[] = [];
  public firewall: Record<'domain' | 'private' | 'public', FirewallProfile> = {
    domain: { name: 'Domain', state: true, inboundAction: 'Block', outboundAction: 'Allow' },
    private: { name: 'Private', state: true, inboundAction: 'Block', outboundAction: 'Allow' },
    public: { name: 'Public', state: true, inboundAction: 'Block', outboundAction: 'Allow' },
  };
  public vpn: VpnState = {
    name: 'CollegeVPN',
    serverAddress: 'vpn.polytechnic.ac.in',
    connected: false,
    deviceType: 'SSTP',
  };
  public bcdConfig = {
    identifier: '{current}',
    device: 'partition=C:',
    path: '\\Windows\\system32\\winload.efi',
    description: 'Windows 10 Pro (25CS34I SNA Lab)',
    locale: 'en-US',
    osdevice: 'partition=C:',
    systemroot: '\\Windows',
    resumeobject: '{d2847291-5a02-11ec-981a-00155d8b3a9f}',
    nx: 'OptIn',
    bootmenupolicy: 'Standard',
  };
  public selectedDiskIndex: number = 0;
  public currentUser: string = 'Student';
  public computerName: string = 'DESKTOP-SNA25';
  public clsTriggered: boolean = false;
  public psVariables: Map<string, any> = new Map();
  public terminalColor: string | null = null; // Stored as 'XX' (e.g. '0A')

  constructor(vfsInstance?: VirtualFileSystem) {
    this.vfs = vfsInstance || new VirtualFileSystem();
    this.initDefaultUsers();
    this.initDefaultProcesses();
    this.initDefaultServices();
    this.initDefaultNetwork();
    this.initDefaultDisks();
    this.initDefaultDrivers();
    this.initDefaultVMs();
  }

  private initDefaultNetwork(): void {
    this.network = {
      hostname: this.computerName,
      primaryDnsSuffix: 'lab.polytechnic.ac.in',
      mac: '00-15-5D-8B-3A-9F',
      dhcpEnabled: true,
      ipv4: '192.168.1.105',
      subnetMask: '255.255.255.0',
      defaultGateway: '192.168.1.1',
      dnsServers: ['8.8.8.8', '8.8.4.4'],
      dnsCacheFlushed: false,
    };

    // Live Routing Table
    this.routes = [
      { networkDestination: '0.0.0.0', netmask: '0.0.0.0', gateway: '192.168.1.1', interfaceIp: '192.168.1.105', metric: 25 },
      { networkDestination: '127.0.0.0', netmask: '255.0.0.0', gateway: 'On-link', interfaceIp: '127.0.0.1', metric: 331 },
      { networkDestination: '127.0.0.1', netmask: '255.255.255.255', gateway: 'On-link', interfaceIp: '127.0.0.1', metric: 331 },
      { networkDestination: '192.168.1.0', netmask: '255.255.255.0', gateway: 'On-link', interfaceIp: '192.168.1.105', metric: 281 },
      { networkDestination: '192.168.1.105', netmask: '255.255.255.255', gateway: 'On-link', interfaceIp: '192.168.1.105', metric: 281 },
      { networkDestination: '192.168.1.255', netmask: '255.255.255.255', gateway: 'On-link', interfaceIp: '192.168.1.105', metric: 281 },
      { networkDestination: '224.0.0.0', netmask: '240.0.0.0', gateway: 'On-link', interfaceIp: '192.168.1.105', metric: 281 },
      { networkDestination: '255.255.255.255', netmask: '255.255.255.255', gateway: 'On-link', interfaceIp: '192.168.1.105', metric: 281 },
    ];

    // Live ARP Table
    this.arpTable = [
      { ip: '192.168.1.1', mac: '00-11-32-4f-8a-12', type: 'dynamic' },
      { ip: '192.168.1.254', mac: '00-11-32-4f-8a-fe', type: 'dynamic' },
      { ip: '192.168.1.255', mac: 'ff-ff-ff-ff-ff-ff', type: 'static' },
      { ip: '224.0.0.22', mac: '01-00-5e-00-00-16', type: 'static' },
      { ip: '239.255.255.250', mac: '01-00-5e-7f-ff-fa', type: 'static' },
    ];
  }

  private initDefaultDisks(): void {
    this.disks = [
      {
        diskNum: 0,
        status: 'Online',
        sizeGB: 256,
        freeGB: 12,
        dyn: false,
        gpt: true,
        partitions: [
          { partNum: 1, type: 'System (EFI)', sizeGB: 1, offsetKB: 1024 },
          { partNum: 2, type: 'Reserved (MSR)', sizeGB: 1, offsetKB: 1049600 },
          { partNum: 3, type: 'Primary', sizeGB: 242, offsetKB: 2098176 },
          { partNum: 4, type: 'Recovery', sizeGB: 12, offsetKB: 255852544 },
        ],
      },
      {
        diskNum: 1,
        status: 'Online',
        sizeGB: 64,
        freeGB: 0,
        dyn: false,
        gpt: false,
        partitions: [
          { partNum: 1, type: 'Primary (USB Lab Drive)', sizeGB: 64, offsetKB: 1024 },
        ],
      },
    ];

    this.volumes = [
      { volNum: 0, letter: 'C', label: 'Windows', fs: 'NTFS', type: 'Partition', sizeGB: 242, status: 'Healthy', info: 'Boot' },
      { volNum: 1, letter: 'D', label: 'SNA_DATA', fs: 'NTFS', type: 'Partition', sizeGB: 64, status: 'Healthy', info: 'Pagefile' },
      { volNum: 2, letter: '', label: 'Recovery', fs: 'NTFS', type: 'Partition', sizeGB: 12, status: 'Healthy', info: 'Hidden' },
    ];
  }

  private initDefaultDrivers(): void {
    this.drivers = [
      { moduleName: 'e1d68x64', displayName: 'Intel(R) Gigabit Network Adapter', driverType: 'Kernel', linkDate: '03/12/2025 04:12:10 AM' },
      { moduleName: 'iaStorVD', displayName: 'Intel(R) RST VMD Managed Controller', driverType: 'Kernel', linkDate: '01/08/2025 08:34:00 PM' },
      { moduleName: 'nvlddmkm', displayName: 'NVIDIA Windows Kernel Display Driver', driverType: 'Kernel', linkDate: '02/20/2026 11:22:45 AM' },
      { moduleName: 'Ntfs', displayName: 'NTFS File System Driver', driverType: 'File System', linkDate: '11/04/2024 07:15:30 PM' },
      { moduleName: 'tcpip', displayName: 'TCP/IP Protocol Driver', driverType: 'Kernel', linkDate: '10/18/2024 06:12:00 PM' },
      { moduleName: 'FLTMGR', displayName: 'Microsoft File System Filter Manager', driverType: 'File System', linkDate: '09/01/2024 02:45:10 PM' },
      { moduleName: 'volmgr', displayName: 'Volume Manager Driver', driverType: 'Kernel', linkDate: '08/14/2024 03:00:22 AM' },
      { moduleName: 'Netwtw10', displayName: 'Intel(R) Wi-Fi 6 AX201 160MHz Driver', driverType: 'Kernel', linkDate: '04/05/2025 10:14:02 PM' },
    ];
  }

  private initDefaultVMs(): void {
    this.vms = [
      { name: 'SNA-Server2022', state: 'Running', cpuUsage: 4, memoryAssignedMB: 4096, uptime: '02:18:44', status: 'Operating normally' },
      { name: 'Ubuntu-Server24', state: 'Running', cpuUsage: 2, memoryAssignedMB: 2048, uptime: '05:42:10', status: 'Operating normally' },
      { name: 'Win10-LabClient', state: 'Off', cpuUsage: 0, memoryAssignedMB: 2048, uptime: '00:00:00', status: 'Operating normally' },
    ];
  }

  private initDefaultUsers(): void {
    const defaultList: SimulatedUser[] = [
      {
        username: 'Administrator',
        fullName: '',
        comment: 'Built-in account for administering the computer/domain',
        active: false,
        passwordLastSet: '01/15/2026 09:30:15 AM',
        accountExpires: 'Never',
        memberOf: ['*Administrators'],
      },
      {
        username: 'DefaultAccount',
        fullName: '',
        comment: 'A user account managed by the system.',
        active: false,
        passwordLastSet: '01/15/2026 09:30:15 AM',
        accountExpires: 'Never',
        memberOf: ['*System Managed Accounts Group'],
      },
      {
        username: 'Guest',
        fullName: '',
        comment: 'Built-in account for guest access to the computer/domain',
        active: false,
        passwordLastSet: 'Never',
        accountExpires: 'Never',
        memberOf: ['*Guests'],
      },
      {
        username: 'Student',
        fullName: 'Lab Student (25CS34I)',
        comment: 'Standard Polytechnic Student Account',
        active: true,
        passwordLastSet: '08/20/2026 10:14:22 AM',
        accountExpires: 'Never',
        memberOf: ['*Users', '*Remote Desktop Users'],
      },
      {
        username: 'WDAGUtilityAccount',
        fullName: '',
        comment: 'A user account managed and used by the system for Windows Defender Application Guard.',
        active: false,
        passwordLastSet: '01/15/2026 09:30:15 AM',
        accountExpires: 'Never',
        memberOf: ['*Users'],
      },
    ];

    for (const u of defaultList) {
      this.users.set(u.username.toLowerCase(), u);
    }
  }

  private initDefaultProcesses(): void {
    this.processes = [
      { imageName: 'System Idle Process', pid: 0, sessionName: 'Services', sessionNum: 0, memUsage: 8, handles: 0, cpu: 0.0, ws: 4, pm: 0 },
      { imageName: 'System', pid: 4, sessionName: 'Services', sessionNum: 0, memUsage: 144, handles: 2450, cpu: 15.4, ws: 140, pm: 120 },
      { imageName: 'smss.exe', pid: 384, sessionName: 'Services', sessionNum: 0, memUsage: 1220, handles: 48, cpu: 0.02, ws: 1100, pm: 420 },
      { imageName: 'csrss.exe', pid: 512, sessionName: 'Services', sessionNum: 0, memUsage: 4892, handles: 580, cpu: 0.65, ws: 4200, pm: 1850 },
      { imageName: 'wininit.exe', pid: 588, sessionName: 'Services', sessionNum: 0, memUsage: 4116, handles: 180, cpu: 0.05, ws: 3900, pm: 1600 },
      { imageName: 'services.exe', pid: 672, sessionName: 'Services', sessionNum: 0, memUsage: 11480, handles: 640, cpu: 1.85, ws: 9800, pm: 5400 },
      { imageName: 'lsass.exe', pid: 696, sessionName: 'Services', sessionNum: 0, memUsage: 18240, handles: 1250, cpu: 2.1, ws: 16400, pm: 7800 },
      { imageName: 'svchost.exe', pid: 884, sessionName: 'Services', sessionNum: 0, memUsage: 22600, handles: 1420, cpu: 4.3, ws: 20100, pm: 12400 },
      { imageName: 'explorer.exe', pid: 3120, sessionName: 'Console', sessionNum: 1, memUsage: 85420, handles: 3200, cpu: 8.7, ws: 74200, pm: 46200 },
      { imageName: 'cmd.exe', pid: 4104, sessionName: 'Console', sessionNum: 1, memUsage: 5124, handles: 165, cpu: 0.08, ws: 4800, pm: 2400 },
      { imageName: 'notepad.exe', pid: 4528, sessionName: 'Console', sessionNum: 1, memUsage: 14880, handles: 240, cpu: 0.12, ws: 13200, pm: 6500 },
      { imageName: 'chrome.exe', pid: 5216, sessionName: 'Console', sessionNum: 1, memUsage: 112400, handles: 4120, cpu: 12.8, ws: 98400, pm: 68900 },
    ];
  }

  private initDefaultServices(): void {
    this.services = [
      { name: 'Spooler', displayName: 'Print Spooler', status: 'Running' },
      { name: 'wuauserv', displayName: 'Windows Update', status: 'Running' },
      { name: 'EventLog', displayName: 'Windows Event Log', status: 'Running' },
      { name: 'Dhcp', displayName: 'DHCP Client', status: 'Running' },
      { name: 'Dnscache', displayName: 'DNS Client', status: 'Running' },
      { name: 'LanmanServer', displayName: 'Server', status: 'Running' },
      { name: 'LanmanWorkstation', displayName: 'Workstation', status: 'Running' },
      { name: 'W32Time', displayName: 'Windows Time', status: 'Stopped' },
      { name: 'RemoteRegistry', displayName: 'Remote Registry', status: 'Stopped' },
    ];
  }

  public addUser(username: string): { success: boolean; error?: string } {
    const key = username.toLowerCase();
    if (this.users.has(key)) {
      return { success: false, error: `The account already exists.` };
    }
    const newUser: SimulatedUser = {
      username,
      fullName: username,
      comment: 'Polytechnic Lab User',
      active: true,
      passwordLastSet: new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      }) + ' ' + new Date().toLocaleTimeString('en-US'),
      accountExpires: 'Never',
      memberOf: ['*Users'],
    };
    this.users.set(key, newUser);
    return { success: true };
  }

  public deleteUser(username: string): { success: boolean; error?: string } {
    const key = username.toLowerCase();
    if (!this.users.has(key)) {
      return { success: false, error: `The user name could not be found.` };
    }
    if (key === 'administrator' || key === 'student') {
      return { success: false, error: `Cannot delete core system user account: ${username}` };
    }
    this.users.delete(key);
    return { success: true };
  }

  public getUser(username: string): SimulatedUser | undefined {
    return this.users.get(username.toLowerCase());
  }

  public getAllUsers(): SimulatedUser[] {
    return Array.from(this.users.values());
  }

  public killProcess(
    by: { name?: string; pid?: number }
  ): { killed: SimulatedProcess[]; error?: string } {
    const initialLen = this.processes.length;
    let matches: SimulatedProcess[] = [];

    if (by.name) {
      const query = by.name.toLowerCase();
      matches = this.processes.filter(
        (p) =>
          p.imageName.toLowerCase() === query ||
          p.imageName.toLowerCase() === `${query}.exe`
      );
    } else if (by.pid !== undefined) {
      matches = this.processes.filter((p) => p.pid === by.pid);
    }

    if (matches.length === 0) {
      return {
        killed: [],
        error: `ERROR: The process ${by.name ? `"${by.name}"` : `with PID ${by.pid}`} not found.`,
      };
    }

    // Filter out matched processes
    const pidsToKill = new Set(matches.map((p) => p.pid));
    this.processes = this.processes.filter((p) => !pidsToKill.has(p.pid));

    return { killed: matches };
  }

  // --- Network Routing State Mutations (Week 8/10) ---
  public addRoute(destination: string, netmask: string, gateway: string, metric: number = 25): { success: boolean; error?: string } {
    const existingIdx = this.routes.findIndex((r) => r.networkDestination === destination && r.netmask === netmask);
    const newRoute: SimulatedRoute = {
      networkDestination: destination,
      netmask,
      gateway,
      interfaceIp: this.network.ipv4,
      metric,
    };

    if (existingIdx >= 0) {
      this.routes[existingIdx] = newRoute;
    } else {
      this.routes.push(newRoute);
    }
    return { success: true };
  }

  public deleteRoute(destination: string): { success: boolean; error?: string } {
    const initialLen = this.routes.length;
    this.routes = this.routes.filter((r) => r.networkDestination !== destination);
    if (this.routes.length === initialLen) {
      return { success: false, error: `The route specified was not found.` };
    }
    return { success: true };
  }

  // --- ARP Table State Mutations (Week 10) ---
  public clearDynamicArp(): void {
    this.arpTable = this.arpTable.filter((e) => e.type === 'static');
  }

  public addArpEntry(ip: string, mac: string, type: 'dynamic' | 'static' = 'dynamic'): void {
    const idx = this.arpTable.findIndex((e) => e.ip === ip);
    if (idx >= 0) {
      this.arpTable[idx] = { ip, mac, type };
    } else {
      this.arpTable.push({ ip, mac, type });
    }
  }

  // --- Service State Mutations (Week 7/9) ---
  public setServiceStatus(name: string, status: 'Running' | 'Stopped'): { success: boolean; error?: string } {
    const svc = this.services.find((s) => s.name.toLowerCase() === name.toLowerCase());
    if (!svc) {
      return { success: false, error: `The service name is invalid.` };
    }
    svc.status = status;
    return { success: true };
  }

  public getService(name: string): SimulatedService | undefined {
    return this.services.find((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  // --- Firewall State Mutations (Week 10) ---
  public setFirewallState(profile: 'all' | 'domain' | 'private' | 'public', state: boolean): void {
    if (profile === 'all') {
      this.firewall.domain.state = state;
      this.firewall.private.state = state;
      this.firewall.public.state = state;
    } else {
      this.firewall[profile].state = state;
    }
  }

  // --- VPN State Mutations (Week 11) ---
  public connectVpn(name: string, username: string): { success: boolean; message: string } {
    this.vpn.connected = true;
    this.vpn.assignedIp = '10.8.0.45';
    // Add corporate VPN route
    this.addRoute('10.8.0.0', '255.255.0.0', '10.8.0.1', 10);
    return {
      success: true,
      message: `Connecting to ${name}...\nVerifying username and password...\nRegistering your computer on the network...\nSuccessfully connected to ${name}.`,
    };
  }

  public disconnectVpn(name: string): { success: boolean; message: string } {
    this.vpn.connected = false;
    this.vpn.assignedIp = undefined;
    this.deleteRoute('10.8.0.0');
    return {
      success: true,
      message: `Disconnected from ${name}.`,
    };
  }

  // --- Disk & Volume Formatting (Week 8) ---
  public formatVolume(letter: string, fs: 'NTFS' | 'FAT32' = 'NTFS'): { success: boolean; error?: string } {
    const cleanLetter = letter.replace(':', '').toUpperCase();
    const vol = this.volumes.find((v) => v.letter.toUpperCase() === cleanLetter);
    if (!vol) {
      return { success: false, error: `The volume ${cleanLetter}: could not be found.` };
    }
    vol.fs = fs;
    vol.status = 'Healthy';
    return { success: true };
  }
}
