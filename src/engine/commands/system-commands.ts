import { CommandHandler } from './types';

export const whoamiCommand: CommandHandler = (args, flags, switches, context) => {
  return {
    error: false,
    text: `${context.computerName.toLowerCase()}\\${context.currentUser.toLowerCase()}`,
  };
};

function stripQuotes(str: string): string {
  return str.replace(/^["']|["']$/g, '');
}

export const netCommand: CommandHandler = (args, flags, switches, context) => {
  const sub = (args[0] || '').toLowerCase();

  // Handle "net start" (list running services or start service)
  if (sub === 'start') {
    const targetService = stripQuotes(args.slice(1).join(' ').trim());
    if (!targetService) {
      const runningServices = context.services.filter((s) => s.status === 'Running').map((s) => s.displayName || s.name);
      const lines = [
        'These Windows services are started:',
        '',
        ...runningServices.map((s) => `   ${s}`),
        '',
        'The command completed successfully.',
      ];
      return { error: false, text: lines.join('\n') };
    }

    const res = context.setServiceStatus(targetService, 'Running');
    if (!res.success) {
      return { error: true, text: `The service name is invalid.\n\nMore help is available by typing NET HELPMSG 2185.` };
    }
    return {
      error: false,
      text: `The ${targetService} service is starting.\nThe ${targetService} service was started successfully.`,
    };
  }

  // Handle "net stop"
  if (sub === 'stop') {
    const targetService = stripQuotes(args.slice(1).join(' ').trim());
    if (!targetService) {
      return { error: true, text: 'The syntax of this command is:\n\nNET STOP service' };
    }
    const res = context.setServiceStatus(targetService, 'Stopped');
    if (!res.success) {
      return { error: true, text: `The service name is invalid.\n\nMore help is available by typing NET HELPMSG 2185.` };
    }
    return {
      error: false,
      text: `The ${targetService} service is stopping.\nThe ${targetService} service was stopped successfully.`,
    };
  }

  if (sub !== 'user') {
    return {
      error: true,
      text: 'The syntax of this command is:\n\nNET [ ACCOUNTS | COMPUTER | CONFIG | CONTINUE | FILE | GROUP | HELP |\n      HELPMSG | LOCALGROUP | PAUSE | SESSION | SHARE | START |\n      STATISTICS | STOP | TIME | USE | USER | VIEW ]',
    };
  }

  // Net user operations
  const userArgs = args.slice(1);
  const isAdd = Boolean(flags['add'] || switches.some((s) => s.toLowerCase() === '/add'));
  const isDelete = Boolean(flags['delete'] || switches.some((s) => s.toLowerCase() === '/delete'));

  // 1. Plain "net user" listing
  if (userArgs.length === 0 && !isAdd && !isDelete) {
    const allUsers = context.getAllUsers().map((u) => u.username);
    allUsers.sort((a, b) => a.localeCompare(b));

    const lines = [
      `User accounts for \\\\${context.computerName}`,
      ``,
      `-------------------------------------------------------------------------------`,
    ];

    // Format into 3 columns
    for (let i = 0; i < allUsers.length; i += 3) {
      const col1 = (allUsers[i] || '').padEnd(25, ' ');
      const col2 = (allUsers[i + 1] || '').padEnd(25, ' ');
      const col3 = allUsers[i + 2] || '';
      lines.push(`${col1}${col2}${col3}`);
    }

    lines.push(`The command completed successfully.`);
    return { error: false, text: lines.join('\n') };
  }

  const targetUsername = stripQuotes(userArgs[0] || '');

  // 2. Add user: "net user <name> [/add]"
  if (isAdd) {
    if (!targetUsername) {
      return { error: true, text: 'The syntax of this command is:\n\nNET USER [username [password | *] [options]] [/DOMAIN]' };
    }
    const res = context.addUser(targetUsername);
    if (!res.success) {
      return { error: true, text: res.error || 'System error 5 has occurred.\n\nAccess is denied.' };
    }
    return { error: false, text: 'The command completed successfully.' };
  }

  // 3. Delete user: "net user <name> /delete"
  if (isDelete) {
    if (!targetUsername) {
      return { error: true, text: 'The syntax of this command is:\n\nNET USER [username [password | *] [options]] [/DOMAIN]' };
    }
    const res = context.deleteUser(targetUsername);
    if (!res.success) {
      return { error: true, text: res.error || 'The user name could not be found.' };
    }
    return { error: false, text: 'The command completed successfully.' };
  }

  // 4. View user details: "net user <name>"
  const u = context.getUser(targetUsername);
  if (!u) {
    return { error: true, text: `The user name could not be found.` };
  }

  const lines = [
    `User name                    ${u.username}`,
    `Full Name                    ${u.fullName}`,
    `Comment                      ${u.comment}`,
    `User's comment               `,
    `Country/region code          000 (System Default)`,
    `Account active               ${u.active ? 'Yes' : 'No'}`,
    `Account expires              ${u.accountExpires}`,
    ``,
    `Password last set            ${u.passwordLastSet}`,
    `Password expires             Never`,
    `Password changeable          ${u.passwordLastSet}`,
    `Password required            Yes`,
    `User may change password     Yes`,
    ``,
    `Workstations allowed         All`,
    `Logon script                 `,
    `User profile                 `,
    `Home directory               `,
    `Last logon                   09/07/2026 09:12:00 AM`,
    ``,
    `Logon hours allowed          All`,
    ``,
    `Local Group Memberships      ${u.memberOf.map((m) => m.padEnd(22, ' ')).join('')}`,
    `Global Group memberships     *None                 `,
    `The command completed successfully.`,
  ];

  return { error: false, text: lines.join('\n') };
};

export const tasklistCommand: CommandHandler = (args, flags, switches, context) => {
  const lines = [
    `Image Name                     PID Session Name        Session#    Mem Usage`,
    `========================= ======== ================ =========== ============`,
  ];

  for (const proc of context.processes) {
    const colName = proc.imageName.padEnd(25, ' ');
    const colPid = proc.pid.toString().padStart(8, ' ');
    const colSession = proc.sessionName.padEnd(16, ' ');
    const colSessionNum = proc.sessionNum.toString().padStart(11, ' ');
    const colMem = `${proc.memUsage.toLocaleString('en-US')} K`.padStart(12, ' ');
    lines.push(`${colName} ${colPid} ${colSession} ${colSessionNum} ${colMem}`);
  }

  return { error: false, text: lines.join('\n') };
};

export const taskkillCommand: CommandHandler = (args, flags, switches, context) => {
  const imFlag = flags['im'] as string | undefined;
  const pidFlag = flags['pid'] as string | undefined;

  let nameQuery = imFlag;
  let pidQuery = pidFlag ? parseInt(pidFlag, 10) : undefined;

  // If flags were not parsed via /im or /pid, check positional args
  if (!nameQuery && pidQuery === undefined) {
    for (let i = 0; i < args.length; i++) {
      if (/^\d+$/.test(args[i])) {
        pidQuery = parseInt(args[i], 10);
        break;
      } else if (args[i].includes('.exe') || args[i].length > 2) {
        nameQuery = args[i];
        break;
      }
    }
  }

  if (!nameQuery && pidQuery === undefined) {
    return {
      error: true,
      text: 'ERROR: Invalid syntax. Value expected for \'/IM\' or \'/PID\'.\nType "TASKKILL /?" for usage.',
    };
  }

  const res = context.killProcess({ name: nameQuery, pid: pidQuery });
  if (res.error || res.killed.length === 0) {
    return { error: true, text: res.error || 'ERROR: The process not found.' };
  }

  const outLines = res.killed.map(
    (k) => `SUCCESS: Sent termination signal to process "${k.imageName}" with PID ${k.pid}.`
  );
  return { error: false, text: outLines.join('\n') };
};

export const systeminfoCommand: CommandHandler = (args, flags, switches, context) => {
  const lines = [
    `Host Name:                 ${context.computerName}`,
    `OS Name:                   Microsoft Windows 10 Pro`,
    `OS Version:                10.0.19045 N/A Build 19045`,
    `OS Manufacturer:           Microsoft Corporation`,
    `OS Configuration:          Standalone Workstation`,
    `OS Build Type:             Multiprocessor Free`,
    `Registered Owner:          SNA Student (25CS34I)`,
    `Registered Organization:   Dept of Technical Education, Govt of Karnataka`,
    `Product ID:                00330-80000-00000-AAOEM`,
    `Original Install Date:     01/15/2026, 09:00:00 AM`,
    `System Boot Time:          09/07/2026, 08:30:15 AM`,
    `System Manufacturer:       Dell Inc.`,
    `System Model:              OptiPlex 7090`,
    `System Type:               x64-based PC`,
    `Processor(s):              1 Processor(s) Installed.`,
    `                           [01]: Intel64 Family 6 Model 165 Stepping 3 GenuineIntel ~2900 Mhz`,
    `BIOS Version:              Dell Inc. 1.15.0, 11/10/2025`,
    `Windows Directory:         C:\\Windows`,
    `System Directory:          C:\\Windows\\system32`,
    `Boot Device:               \\Device\\HarddiskVolume1`,
    `System Locale:             en-in;English (India)`,
    `Input Locale:              en-us;English (United States)`,
    `Time Zone:                 (UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi`,
    `Total Physical Memory:     8,192 MB`,
    `Available Physical Memory: 5,420 MB`,
    `Virtual Memory: Max Size:  9,472 MB`,
    `Virtual Memory: Available: 6,120 MB`,
    `Virtual Memory: In Use:    3,352 MB`,
    `Page File Location(s):     C:\\pagefile.sys`,
    `Domain:                    WORKGROUP`,
    `Logon Server:              \\\\DESKTOP-SNA25`,
    `Hotfix(s):                 4 Hotfix(s) Installed.`,
    `                           [01]: KB5034441`,
    `                           [02]: KB5034122`,
    `Network Card(s):           1 NIC(s) Installed.`,
    `                           [01]: Intel(R) Ethernet Connection I219-LM`,
    `                                 Connection Name: Ethernet0`,
    `                                 DHCP Enabled:    Yes`,
    `                                 IP address(es)`,
    `                                 [01]: ${context.network.ipv4}`,
    `                                 [02]: fe80::5c3b:4e9a:218a:92d1%12`,
    `Hyper-V Requirements:      VM Monitor Mode Extensions: Yes`,
    `                           Virtualization Enabled In Firmware: Yes`,
  ];
  return { error: false, text: lines.join('\n') };
};

export const clsCommand: CommandHandler = () => {
  return { error: false, text: '', clearScreen: true };
};

export const echoCommand: CommandHandler = (args, flags, switches, context, rawLine) => {
  // Support "echo." for blank line
  if (rawLine.trim().toLowerCase() === 'echo.') {
    return { error: false, text: '' };
  }

  // Raw text following "echo "
  const match = rawLine.match(/^echo\s*(.*)$/i);
  if (!match || match[1] === '') {
    return { error: false, text: 'ECHO is on.' };
  }

  return { error: false, text: match[1] };
};

export const verCommand: CommandHandler = () => {
  return {
    error: false,
    text: '\nMicrosoft Windows [Version 10.0.19045.3803]',
  };
};

export const dateCommand: CommandHandler = () => {
  const d = new Date();
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dateStr = d.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
  return {
    error: false,
    text: `The current date is: ${dayName} ${dateStr}`,
  };
};

export const timeCommand: CommandHandler = () => {
  const d = new Date();
  const timeStr = d.toLocaleTimeString('en-US', { hour12: false }) + '.45';
  return {
    error: false,
    text: `The current time is: ${timeStr}`,
  };
};

export const diskpartCommand: CommandHandler = (args, flags, switches, context) => {
  return {
    error: false,
    text: `Microsoft DiskPart version 10.0.19041.3636

Copyright (C) Microsoft Corporation.
On computer: ${context.computerName}

DISKPART> (Simulator: Interactive DiskPart is not supported in this lab environment.)`,
  };
};

export const shutdownCommand: CommandHandler = (args, flags, switches) => {
  const isRestart = switches.some((s) => s.toLowerCase() === '/r');
  const isAbort = switches.some((s) => s.toLowerCase() === '/a');
  const isShutdown = switches.some((s) => s.toLowerCase() === '/s');

  if (isAbort) {
    return { error: false, text: 'The system shutdown has been aborted.' };
  }

  if (isRestart || isShutdown) {
    return {
      error: false,
      text: 'You are about to be signed out.\nWindows will shut down in less than a minute.',
    };
  }

  return {
    error: true,
    text: 'Usage: shutdown [/i | /l | /s | /sg | /r | /g | /a | /p | /h | /e | /o] [/f] [/m \\\\computer][/t xxx][/d [p|u:]xx:yy [/c "comment"]]',
  };
};

export const colorCommand: CommandHandler = (args, flags, switches, context) => {
  const helpText = `Sets the default console foreground and background colors.

COLOR [attr]

  attr        Specifies color attribute of console output

Color attributes are specified by TWO hex digits -- the first
corresponds to the background; the second the foreground.  Each digit
can be any of the following values:

    0 = Black       8 = Gray
    1 = Blue        9 = Light Blue
    2 = Green       A = Light Green
    3 = Aqua        B = Light Aqua
    4 = Red         C = Light Red
    5 = Purple      D = Light Purple
    6 = Yellow      E = Light Yellow
    7 = White       F = Bright White

If no argument is given, this command restores the color to what it was
when CMD.EXE started.`;

  if (switches.some((s) => s.toLowerCase() === '/?')) {
    return { error: false, text: helpText };
  }

  if (args.length === 0) {
    // Reset to default
    context.terminalColor = null;
    return { error: false, text: '' };
  }

  const hexPattern = /^[0-9a-fA-F]{1,2}$/;
  if (!hexPattern.test(args[0])) {
    return { error: true, text: helpText };
  }

  const val = args[0].toUpperCase();
  if (val.length === 2 && val[0] === val[1]) {
    // Cannot have same bg and fg
    return { error: true, text: '' };
  }
  
  context.terminalColor = val.length === 1 ? '0' + val : val;
  return { error: false, text: '' };
};

export const helpCommand: CommandHandler = () => {
  const lines = [
    'For more information on a specific command, type HELP command-name',
    'ATTRIB         Displays or changes file attributes (+h/-h/+r/-r).',
    'CD / CHDIR     Displays the name of or changes the current directory.',
    'CHKDSK         Checks a disk and displays a status report.',
    'CIPHER         Displays or alters the encryption of directories/files (/E /D).',
    'CLS            Clears the screen.',
    'COLOR          Sets the default console foreground and background colors.',
    'COPY           Copies one or more files to another location.',
    'DATE           Displays or sets the date.',
    'DEL / ERASE    Deletes one or more files.',
    'DIR            Displays a list of files and subdirectories in a directory.',
    'DISKPART       Displays or configures Disk Partition properties.',
    'ECHO           Displays messages, or turns command echoing on or off.',
    'HELP           Provides Help information for Windows commands.',
    'IPCONFIG       Displays all current TCP/IP network configuration values.',
    'MD / MKDIR     Creates a directory.',
    'MOVE           Moves one or more files from one directory to another directory.',
    'NET            Used to manage network resources and user accounts (NET USER).',
    'NETSTAT        Displays protocol statistics and current TCP/IP network connections.',
    'NSLOOKUP       Queries the DNS to obtain domain name or IP address mapping.',
    'PING           Verifies IP-level connectivity to another TCP/IP computer.',
    'RD / RMDIR     Removes a directory.',
    'REN / RENAME   Renames a file or files.',
    'SFC            Scans and verifies the integrity of all protected system files.',
    'SHUTDOWN       Allows proper local or remote shutdown of machine.',
    'SYSTEMINFO     Displays machine specific properties and configuration.',
    'TASKKILL       Terminates or kills a running process or application.',
    'TASKLIST       Displays all currently running tasks including services.',
    'TIME           Displays or sets the system time.',
    'TRACERT        Determines the path taken to a destination by sending ICMP packets.',
    'TREE           Graphically displays the folder structure of a drive or path.',
    'TYPE           Displays the contents of a text file (refuses encrypted files).',
    'VER            Displays the Windows version.',
    'WHOAMI         Displays user, group and privileges information for the current user.',
  ];
  return { error: false, text: lines.join('\n') };
};
