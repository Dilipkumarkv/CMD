import { CommandSuggestion } from '../types/terminal';

export const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  // Basics
  {
    category: 'basics',
    title: 'See Current Directory',
    description: 'Find out which folder you are currently standing in.',
    cmdCommand: 'cd',
    psCommand: 'Get-Location',
    tag: 'Start here',
  },
  {
    category: 'basics',
    title: 'Clear the Screen',
    description: 'Wipe all text and give yourself a clean slate.',
    cmdCommand: 'cls',
    psCommand: 'Clear-Host',
  },
  {
    category: 'basics',
    title: 'Who is Logged In?',
    description: 'Check the current active user account.',
    cmdCommand: 'whoami',
    psCommand: 'whoami',
  },
  {
    category: 'basics',
    title: 'Windows System Info',
    description: 'Display OS version, processor, and memory info.',
    cmdCommand: 'systeminfo',
    psCommand: 'systeminfo',
  },

  // Files & Folders
  {
    category: 'files',
    title: 'List Files & Folders',
    description: 'See all documents and subdirectories in this folder.',
    cmdCommand: 'dir',
    psCommand: 'Get-ChildItem',
    tag: 'Essential',
  },
  {
    category: 'files',
    title: 'Enter Documents Folder',
    description: 'Change directory to go inside the Documents folder.',
    cmdCommand: 'cd Documents',
    psCommand: 'Set-Location Documents',
  },
  {
    category: 'files',
    title: 'Create a New Folder',
    description: 'Make a directory named LabTest to store work.',
    cmdCommand: 'md LabTest',
    psCommand: 'New-Item -Path "LabTest" -ItemType Directory',
  },
  {
    category: 'files',
    title: 'Create a Text File',
    description: 'Save text into a new file called student-log.txt.',
    cmdCommand: 'echo Lab Session Started > student-log.txt',
    psCommand: 'Set-Content -Path "student-log.txt" -Value "Lab Session Started"',
  },
  {
    category: 'files',
    title: 'Read a File',
    description: 'Display the written contents of notes.txt.',
    cmdCommand: 'type notes.txt',
    psCommand: 'Get-Content notes.txt',
  },
  {
    category: 'files',
    title: 'Copy a File',
    description: 'Make a backup duplicate of a file.',
    cmdCommand: 'copy notes.txt notes.bak',
    psCommand: 'Copy-Item notes.txt notes.bak',
  },
  {
    category: 'files',
    title: 'Go Back to Parent Folder',
    description: 'Move one step up to the parent directory.',
    cmdCommand: 'cd ..',
    psCommand: 'cd ..',
  },

  // Processes
  {
    category: 'processes',
    title: 'List Running Tasks',
    description: 'View all programs and background services currently running.',
    cmdCommand: 'tasklist',
    psCommand: 'Get-Process',
    tag: 'System',
  },
  {
    category: 'processes',
    title: 'Terminate a Process',
    description: 'Forcefully stop the notepad.exe background task.',
    cmdCommand: 'taskkill /im notepad.exe',
    psCommand: 'Stop-Process -Name notepad',
    tag: 'Kill task',
  },
  {
    category: 'processes',
    title: 'Inspect Services',
    description: 'Check active Windows services like Spooler, DHCP.',
    cmdCommand: 'net start',
    psCommand: 'Get-Service',
  },

  // Network
  {
    category: 'network',
    title: 'Check IP Configuration',
    description: 'Display IPv4 address, Subnet Mask, and Gateway.',
    cmdCommand: 'ipconfig /all',
    psCommand: 'ipconfig /all',
    tag: 'Networking',
  },
  {
    category: 'network',
    title: 'Ping DNS Server',
    description: 'Send ICMP echo packets to test network connectivity.',
    cmdCommand: 'ping 8.8.8.8',
    psCommand: 'Test-Connection 8.8.8.8',
  },
  {
    category: 'network',
    title: 'View Active Connections',
    description: 'See listening ports and established connections.',
    cmdCommand: 'netstat -an',
    psCommand: 'netstat -an',
  },

  // Users
  {
    category: 'users',
    title: 'List Local User Accounts',
    description: 'Check Administrator, Student, and Guest accounts.',
    cmdCommand: 'net user',
    psCommand: 'Get-LocalUser',
    tag: 'Accounts',
  },
  {
    category: 'users',
    title: 'Add a New User Account',
    description: 'Provision a new student account named LabStudent2.',
    cmdCommand: 'net user LabStudent2 /add',
    psCommand: 'New-LocalUser -Name "LabStudent2" -Description "Polytechnic Student"',
  },

  // Pipelines (PowerShell exclusive)
  {
    category: 'pipeline',
    title: 'Filter High-CPU Processes',
    description: 'Use Where-Object to only find processes using > 1% CPU.',
    psCommand: 'Get-Process | Where-Object { $_.CPU -gt 1 }',
    tag: 'Pipeline',
  },
  {
    category: 'pipeline',
    title: 'Sort Processes by CPU',
    description: 'Sort all active programs in descending order of CPU usage.',
    psCommand: 'Get-Process | Sort-Object CPU -Descending',
    tag: 'Pipeline',
  },
  {
    category: 'pipeline',
    title: 'Find Running Services',
    description: 'Filter only services that currently have Status "Running".',
    psCommand: 'Get-Service | Where-Object { $_.Status -eq "Running" }',
    tag: 'Pipeline',
  },
  {
    category: 'pipeline',
    title: 'Store & Use Variables',
    description: 'Save text to a variable $myVar and output it.',
    psCommand: '$myVar = "Hello Polytechnic"; Write-Output $myVar',
    tag: 'Variables',
    week: 6,
    call: '(a)',
  },

  // ==========================================================================
  // Week 7: Startup & Performance Troubleshooting & BSOD
  // ==========================================================================
  {
    category: 'processes',
    title: 'Stop a Service (Spooler)',
    description: 'Stop the Windows Print Spooler service to test troubleshooting.',
    cmdCommand: 'net stop Spooler',
    psCommand: 'Stop-Service Spooler',
    tag: 'Week 7 (b)',
    week: 7,
    call: '(b)',
  },
  {
    category: 'processes',
    title: 'Restart a Stopped Service',
    description: 'Start the Spooler service back up and verify live state.',
    cmdCommand: 'net start Spooler',
    psCommand: 'Start-Service Spooler',
    tag: 'Week 7 (b)',
    week: 7,
    call: '(b)',
  },
  {
    category: 'diagnostics',
    title: 'Query Service Status via SC',
    description: 'Inspect service controller parameters, state, and exit codes.',
    cmdCommand: 'sc query Spooler',
    tag: 'Week 7 (b)',
    week: 7,
    call: '(b)',
  },
  {
    category: 'diagnostics',
    title: 'Inspect Boot Configuration Data',
    description: 'View Windows Boot Manager and Boot Loader configuration with bcdedit.',
    cmdCommand: 'bcdedit',
    tag: 'Week 7 (b)',
    week: 7,
    call: '(b)',
  },

  // ==========================================================================
  // Week 8: Partitioning, Data Recovery, File Systems & Routing
  // ==========================================================================
  {
    category: 'storage',
    title: 'Check Disk Integrity (Chkdsk)',
    description: 'Verify file system integrity and cluster metadata on volume C:.',
    cmdCommand: 'chkdsk C:',
    tag: 'Week 8 (a)',
    week: 8,
    call: '(a)',
  },
  {
    category: 'storage',
    title: 'Inspect Disks with DiskPart',
    description: 'Launch interactive or command-line disk partitioning query.',
    cmdCommand: 'diskpart list disk',
    psCommand: 'Get-Disk',
    tag: 'Week 8 (b)',
    week: 8,
    call: '(b)',
  },
  {
    category: 'storage',
    title: 'Format a Partition',
    description: 'Quick-format partition D: with the FAT32 or NTFS file system.',
    cmdCommand: 'format D: /fs:FAT32 /q',
    psCommand: 'Get-Volume',
    tag: 'Week 8 (b)',
    week: 8,
    call: '(b)',
  },
  {
    category: 'network',
    title: 'Static Route Table Management',
    description: 'Display active IPv4 routing table entries and network gateways.',
    cmdCommand: 'route print',
    tag: 'Week 8 (b)',
    week: 8,
    call: '(b)',
  },
  {
    category: 'network',
    title: 'Add a Static IPv4 Route',
    description: 'Add a static subnet route to 10.20.0.0 via the default gateway.',
    cmdCommand: 'route add 10.20.0.0 mask 255.255.0.0 192.168.1.1',
    tag: 'Week 8 (b)',
    week: 8,
    call: '(b)',
  },

  // ==========================================================================
  // Week 9: System File Repair, Driver Management & Monitoring
  // ==========================================================================
  {
    category: 'diagnostics',
    title: 'Scan Protected System Files (SFC)',
    description: 'Scan Windows system files for corruption and integrity.',
    cmdCommand: 'sfc /scannow',
    tag: 'Week 9 (a)',
    week: 9,
    call: '(a)',
  },
  {
    category: 'diagnostics',
    title: 'Repair Component Store (DISM)',
    description: 'Check and restore Windows system image health online.',
    cmdCommand: 'dism /online /cleanup-image /restorehealth',
    tag: 'Week 9 (b)',
    week: 9,
    call: '(b)',
  },
  {
    category: 'diagnostics',
    title: 'Query Installed Device Drivers',
    description: 'Enumerate kernel and filesystem drivers with driverquery.',
    cmdCommand: 'driverquery',
    tag: 'Week 9 (b)',
    week: 9,
    call: '(b)',
  },

  // ==========================================================================
  // Week 10: Network Configuration, Troubleshooting & Firewall
  // ==========================================================================
  {
    category: 'network',
    title: 'Flush DNS Resolver Cache',
    description: 'Purge DNS client lookup cache to resolve host resolution faults.',
    cmdCommand: 'ipconfig /flushdns',
    tag: 'Week 10 (a)',
    week: 10,
    call: '(a)',
  },
  {
    category: 'network',
    title: 'Inspect & Clear ARP Cache',
    description: 'Display ARP IPv4-to-MAC resolution table or clear dynamic cache.',
    cmdCommand: 'arp -a',
    tag: 'Week 10 (b)',
    week: 10,
    call: '(b)',
  },
  {
    category: 'security',
    title: 'Inspect Windows Firewall State',
    description: 'View active profiles for Domain, Private, and Public network firewall.',
    cmdCommand: 'netsh advfirewall show allprofiles',
    tag: 'Week 10 (b)',
    week: 10,
    call: '(b)',
  },
  {
    category: 'security',
    title: 'Disable Firewall for Troubleshooting',
    description: 'Temporarily switch all firewall profiles to OFF to test connectivity.',
    cmdCommand: 'netsh advfirewall set allprofiles state off',
    tag: 'Week 10 (b)',
    week: 10,
    call: '(b)',
  },
  {
    category: 'network',
    title: 'PowerShell Network Connection Test',
    description: 'Perform advanced ICMP and TCP port handshake telemetry.',
    psCommand: 'Test-NetConnection -ComputerName google.com',
    tag: 'Week 10 (b)',
    week: 10,
    call: '(b)',
  },

  // ==========================================================================
  // Week 11: Network Monitoring, Virtual Machines & VPN
  // ==========================================================================
  {
    category: 'network',
    title: 'Connect VPN Tunnel',
    description: 'Dial a remote virtual private network endpoint and install tunnel route.',
    cmdCommand: 'rasdial "CollegeVPN" student polytechnic123',
    psCommand: 'Get-VpnConnection',
    tag: 'Week 11 (b)',
    week: 11,
    call: '(b)',
  },
  {
    category: 'network',
    title: 'Disconnect VPN Tunnel',
    description: 'Tear down the VPN connection and restore default gateway.',
    cmdCommand: 'rasdial "CollegeVPN" /disconnect',
    tag: 'Week 11 (b)',
    week: 11,
    call: '(b)',
  },
  {
    category: 'diagnostics',
    title: 'Hyper-V Virtual Machines',
    description: 'List virtual machines, running states, and memory allocation.',
    psCommand: 'Get-VM',
    tag: 'Week 11 (b)',
    week: 11,
    call: '(b)',
  },
  {
    category: 'diagnostics',
    title: 'Hyper-V Virtual Switches',
    description: 'Display virtual switches bridging internal and external adapters.',
    psCommand: 'Get-VMSwitch',
    tag: 'Week 11 (b)',
    week: 11,
    call: '(b)',
  },
];
