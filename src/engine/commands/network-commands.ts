import { CommandHandler } from './types';

export const ipconfigCommand: CommandHandler = (args, flags, switches, context) => {
  const allInputs = [...args, ...switches, ...Object.keys(flags)].map((s) => s.toLowerCase());

  const isHelp = Boolean(
    flags['?'] ||
    flags['help'] ||
    allInputs.some((s) => s === '/?' || s === '-?' || s === '/help' || s === 'help')
  );

  if (isHelp) {
    const helpLines = [
      'USAGE:',
      '    ipconfig [/allcompartments] [/? | /all |',
      '                                 /renew [adapter] | /release [adapter] |',
      '                                 /renew6 [adapter] | /release6 [adapter] |',
      '                                 /flushdns | /displaydns | /registerdns |',
      '                                 /showclassid adapter |',
      '                                 /setclassid adapter [classid] |',
      '                                 /showclassid6 adapter |',
      '                                 /setclassid6 adapter [classid] ]',
      '',
      'where',
      '    adapter             Connection name',
      '                       (wildcard characters * and ? allowed, see examples)',
      '',
      '    Options:',
      '       /?               Display this help message',
      '       /all             Display full configuration information.',
      '       /release         Release the IPv4 address for the specified adapter.',
      '       /renew           Renew the IPv4 address for the specified adapter.',
      '       /flushdns        Purges the DNS Resolver Cache.',
      '       /registerdns     Refreshes all DHCP leases and re-registers DNS names.',
      '       /displaydns      Display the contents of the DNS Resolver Cache.',
    ];
    return { error: false, text: helpLines.join('\n') };
  }

  const isAll = Boolean(
    flags['all'] ||
    flags['a'] ||
    allInputs.some((s) => s === '/all' || s === '-all' || s === 'all' || s === '/a' || s === '-a')
  );
  const isFlush = Boolean(
    flags['flushdns'] ||
    flags['flush'] ||
    allInputs.some((s) => s === '/flushdns' || s === '-flushdns' || s === 'flushdns')
  );
  const isRelease = Boolean(
    flags['release'] ||
    allInputs.some((s) => s === '/release' || s === '-release' || s === 'release')
  );
  const isRenew = Boolean(
    flags['renew'] ||
    allInputs.some((s) => s === '/renew' || s === '-renew' || s === 'renew')
  );

  if (isFlush) {
    context.network.dnsCacheFlushed = true;
    return {
      error: false,
      text: 'Windows IP Configuration\n\nSuccessfully flushed the DNS Resolver Cache.',
    };
  }

  if (isRelease) {
    context.network.ipv4 = '0.0.0.0';
    context.network.subnetMask = '0.0.0.0';
    context.network.defaultGateway = '';
    const lines = [
      'Windows IP Configuration',
      '',
      'Ethernet adapter Ethernet0:',
      '',
      '   Connection-specific DNS Suffix  . :',
      '   IPv4 Address. . . . . . . . . . . : 0.0.0.0',
      '   Subnet Mask . . . . . . . . . . . : 0.0.0.0',
      '   Default Gateway . . . . . . . . . : ',
    ];
    return { error: false, text: lines.join('\n') };
  }

  if (isRenew) {
    context.network.ipv4 = '192.168.1.105';
    context.network.subnetMask = '255.255.255.0';
    context.network.defaultGateway = '192.168.1.1';
  }

  const net = context.network;

  if (isAll) {
    const lines = [
      'Windows IP Configuration',
      '',
      `   Host Name . . . . . . . . . . . . : ${net.hostname}`,
      `   Primary Dns Suffix  . . . . . . . : ${net.primaryDnsSuffix}`,
      '   Node Type . . . . . . . . . . . . : Hybrid',
      '   IP Routing Enabled. . . . . . . . : No',
      '   WINS Proxy Enabled. . . . . . . . : No',
      '',
      'Ethernet adapter Ethernet0:',
      '',
      `   Connection-specific DNS Suffix  . : ${net.primaryDnsSuffix}`,
      '   Description . . . . . . . . . . . : Intel(R) Ethernet Connection I219-LM',
      `   Physical Address. . . . . . . . . : ${net.mac}`,
      `   DHCP Enabled. . . . . . . . . . . : ${net.dhcpEnabled ? 'Yes' : 'No'}`,
      '   Autoconfiguration Enabled . . . . : Yes',
      '   Link-local IPv6 Address . . . . . : fe80::5c3b:4e9a:218a:92d1%12(Preferred)',
      `   IPv4 Address. . . . . . . . . . . : ${net.ipv4}(Preferred)`,
      `   Subnet Mask . . . . . . . . . . . : ${net.subnetMask}`,
      '   Lease Obtained. . . . . . . . . . : Monday, September 7, 2026 8:30:15 AM',
      '   Lease Expires . . . . . . . . . . : Tuesday, September 8, 2026 8:30:15 AM',
      `   Default Gateway . . . . . . . . . : ${net.defaultGateway}`,
      `   DHCP Server . . . . . . . . . . . : ${net.defaultGateway || 'None'}`,
      `   DNS Servers . . . . . . . . . . . : ${net.dnsServers[0]}`,
      `                                       ${net.dnsServers[1] || ''}`,
      '   NetBIOS over Tcpip. . . . . . . . : Enabled',
    ];
    return { error: false, text: lines.join('\n') };
  }

  const lines = [
    'Windows IP Configuration',
    '',
    'Ethernet adapter Ethernet0:',
    '',
    `   Connection-specific DNS Suffix  . : ${net.primaryDnsSuffix}`,
    '   Link-local IPv6 Address . . . . . : fe80::5c3b:4e9a:218a:92d1%12',
    `   IPv4 Address. . . . . . . . . . . : ${net.ipv4}`,
    `   Subnet Mask . . . . . . . . . . . : ${net.subnetMask}`,
    `   Default Gateway . . . . . . . . . : ${net.defaultGateway}`,
  ];

  return { error: false, text: lines.join('\n') };
};

export const pingCommand: CommandHandler = (args) => {
  if (args.length === 0) {
    return {
      error: true,
      text: 'Usage: ping [-t] [-a] [-n count] [-l size] [-f] [-i TTL] [-v TOS] target_name',
    };
  }

  const target = args[0];
  let ip = target;

  if (target.toLowerCase() === 'localhost') ip = '127.0.0.1';
  else if (target.toLowerCase() === 'google.com') ip = '142.250.192.46';
  else if (target.toLowerCase() === 'dns.google') ip = '8.8.8.8';

  const isLocal = ip.startsWith('127.') || ip.startsWith('192.168.1.');
  const ms1 = isLocal ? '<1ms' : '14ms';
  const ms2 = isLocal ? '1ms' : '15ms';
  const ms3 = isLocal ? '<1ms' : '14ms';
  const ms4 = isLocal ? '1ms' : '16ms';
  const ttl = isLocal ? '64' : '118';
  const avg = isLocal ? '0ms' : '14ms';

  const lines = [
    ``,
    `Pinging ${target} [${ip}] with 32 bytes of data:`,
    `Reply from ${ip}: bytes=32 time=${ms1} TTL=${ttl}`,
    `Reply from ${ip}: bytes=32 time=${ms2} TTL=${ttl}`,
    `Reply from ${ip}: bytes=32 time=${ms3} TTL=${ttl}`,
    `Reply from ${ip}: bytes=32 time=${ms4} TTL=${ttl}`,
    ``,
    `Ping statistics for ${ip}:`,
    `    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),`,
    `Approximate round trip times in milli-seconds:`,
    `    Minimum = 0ms, Maximum = ${isLocal ? '1ms' : '16ms'}, Average = ${avg}`,
  ];

  return { error: false, text: lines.join('\n') };
};

export const tracertCommand: CommandHandler = (args) => {
  if (args.length === 0) {
    return {
      error: true,
      text: 'Usage: tracert [-d] [-h maximum_hops] [-j host-list] [-w timeout] target_name',
    };
  }

  const target = args[0];
  const destIp = target === 'google.com' ? '142.250.192.46' : target;

  const lines = [
    ``,
    `Tracing route to ${target} [${destIp}]`,
    `over a maximum of 30 hops:`,
    ``,
    `  1    <1 ms    <1 ms    <1 ms  192.168.1.1`,
    `  2     8 ms     7 ms     8 ms  10.240.16.1`,
    `  3    12 ms    11 ms    11 ms  172.16.100.1`,
    `  4    15 ms    14 ms    14 ms  ${destIp}`,
    ``,
    `Trace complete.`,
  ];

  return { error: false, text: lines.join('\n') };
};

export const netstatCommand: CommandHandler = () => {
  const lines = [
    ``,
    `Active Connections`,
    ``,
    `  Proto  Local Address          Foreign Address        State`,
    `  TCP    0.0.0.0:135            0.0.0.0:0              LISTENING`,
    `  TCP    0.0.0.0:445            0.0.0.0:0              LISTENING`,
    `  TCP    127.0.0.1:5040         0.0.0.0:0              LISTENING`,
    `  TCP    192.168.1.105:139      0.0.0.0:0              LISTENING`,
    `  TCP    192.168.1.105:49668    52.178.17.2:443        ESTABLISHED`,
    `  TCP    192.168.1.105:49670    142.250.192.46:443     ESTABLISHED`,
    `  TCP    192.168.1.105:49672    20.190.159.23:443      TIME_WAIT`,
    `  UDP    0.0.0.0:5353           *:*                    `,
    `  UDP    127.0.0.1:1900         *:*                    `,
    `  UDP    192.168.1.105:137      *:*                    `,
    `  UDP    192.168.1.105:138      *:*                    `,
  ];
  return { error: false, text: lines.join('\n') };
};

export const nslookupCommand: CommandHandler = (args, flags, switches, context) => {
  const dnsServer = context.network.dnsServers[0] || '8.8.8.8';
  const query = args[0];

  if (!query) {
    return {
      error: false,
      text: `Default Server:  dns.google\nAddress:  ${dnsServer}\n\n> `,
    };
  }

  let resolvedIp = '142.250.192.46';
  if (query.toLowerCase() === 'polytechnic.ac.in') resolvedIp = '182.72.195.42';
  else if (query.toLowerCase() === 'localhost') resolvedIp = '127.0.0.1';
  else if (query.toLowerCase() === 'gateway') resolvedIp = context.network.defaultGateway;

  const lines = [
    `Server:  dns.google`,
    `Address:  ${dnsServer}`,
    ``,
    `Non-authoritative answer:`,
    `Name:    ${query}`,
    `Address:  ${resolvedIp}`,
  ];
  return { error: false, text: lines.join('\n') };
};

export const chkdskCommand: CommandHandler = (args, flags, switches, context) => {
  const targetDrive = args[0] || 'C:';
  const lines = [
    `The type of the file system is NTFS.`,
    `Volume OS is healthy.`,
    `Volume Serial Number is 4C82-9B14`,
    ``,
    `Stage 1: Examining basic file system structure ...`,
    `  328448 file records processed.                                                        `,
    `File verification completed.`,
    ` Phase duration (File record verification): 85.32 milliseconds.`,
    `  7868 large file records processed.                                                    `,
    ` Phase duration (Bad file record detection): 0.35 milliseconds.`,
    ``,
    `Stage 2: Examining file name linkage ...`,
    `  38520 index entries processed.                                                        `,
    `Index verification completed.`,
    ` Phase duration (Index verification): 112.45 milliseconds.`,
    ``,
    `Stage 3: Examining security descriptors ...`,
    `Security descriptor verification completed.`,
    ` Phase duration (Security descriptor verification): 2.15 milliseconds.`,
    ``,
    `Windows has scanned the file system and found no problems.`,
    `No further action is required.`,
    ``,
    ` 249,710,591 KB total disk space.`,
    `  38,420,112 KB in 128,452 files.`,
    `      92,448 KB in 38,521 indexes.`,
    `     480,211 KB in use by the system.`,
    ` 210,717,820 KB available on disk.`,
  ];
  return { error: false, text: lines.join('\n') };
};

export const sfcCommand: CommandHandler = (args, flags, switches) => {
  const isScannow = Boolean(flags['scannow'] || switches.some((s) => s.toLowerCase() === '/scannow'));

  if (!isScannow) {
    const lines = [
      'Microsoft(R) Windows(R) Resource Checker Version 6.0',
      'Copyright (c) Microsoft Corporation. All rights reserved.',
      '',
      'Scans the integrity of all protected system files and replaces incorrect versions with',
      'correct Microsoft versions.',
      '',
      'SFC [/SCANNOW] [/VERIFYONLY] [/SCANFILE=<file>] [/VERIFYFILE=<file>]',
    ];
    return { error: true, text: lines.join('\n') };
  }

  const lines = [
    'Beginning system scan. This process will take some time.',
    '',
    'Beginning verification phase of system scan.',
    'Verification 100% complete.',
    '',
    'Windows Resource Protection did not find any integrity violations.',
  ];
  return { error: false, text: lines.join('\n') };
};
