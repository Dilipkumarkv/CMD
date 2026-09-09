import { LabContext } from '../context';
import { explainCommand } from '../explain';
import { ensureLinuxFilesystem, toPosixPath, toPosixFullPath, toVfsPath } from './linuxFs';
import { parseBashCommandLine } from './bashParser';

export interface CommandResult {
  error: boolean;
  text: string;
  clearScreen?: boolean;
}

export type BashCommandHandler = (
  positional: string[],
  flags: Record<string, string | boolean>,
  switches: string[],
  context: LabContext,
  rawCmd: string,
  stdin?: string
) => CommandResult;

export const bashRegistry: Record<string, BashCommandHandler> = {
  // ================= NAVIGATION & ENVIRONMENT =================
  clear: () => {
    return { error: false, text: '', clearScreen: true };
  },

  pwd: (_pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    const cwd = ctx.vfs.getCwd();
    return { error: false, text: toPosixFullPath(cwd) };
  },

  cd: (pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    let target = pos[0] || '~';

    // Handle cd - (return to previous directory)
    if (target === '-') {
      const lastCwd = (ctx as any).lastBashCwd;
      if (!lastCwd) {
        return { error: true, text: 'bash: cd: OLDPWD not set' };
      }
      target = lastCwd;
    }

    const currentCwd = ctx.vfs.getCwd();
    const targetVfs = toVfsPath(target, currentCwd);

    try {
      const nodeRes = ctx.vfs.getNodeResult(targetVfs);
      if (!nodeRes || nodeRes.node.type !== 'dir') {
        return { error: true, text: `bash: cd: ${pos[0] || target}: No such file or directory` };
      }
      (ctx as any).lastBashCwd = currentCwd;
      ctx.vfs.setCwd(nodeRes.canonicalPath);
      if (pos[0] === '-') {
        return { error: false, text: toPosixFullPath(nodeRes.canonicalPath) };
      }
      return { error: false, text: '' };
    } catch (e: any) {
      return { error: true, text: `bash: cd: ${pos[0] || target}: No such file or directory` };
    }
  },

  echo: (pos, flags, _switches, ctx, rawCmd, stdin) => {
    ensureLinuxFilesystem(ctx);
    if (flags['help'] || flags['h']) {
      return {
        error: false,
        text: 'echo: echo [-neE] [arg ...]\n    Write arguments to the standard output.\n    Options:\n      -n    do not append a newline\n      -e    enable interpretation of backslash escapes',
      };
    }
    let textPart = rawCmd.substring(rawCmd.indexOf('echo') + 4).trim();
    if (!textPart && stdin) textPart = stdin;

    const host = ctx.computerName.toLowerCase().replace('desktop-', '');
    const user = ctx.currentUser.toLowerCase();
    const bashEnv: Record<string, string> = (ctx as any).bashEnv || {};

    textPart = textPart
      .replace(/\$USER\b/g, user)
      .replace(/\$HOME\b/g, '/home/student')
      .replace(/\$SHELL\b/g, '/bin/bash')
      .replace(/\$HOSTNAME\b/g, host)
      .replace(/\$PWD\b/g, toPosixFullPath(ctx.vfs.getCwd()))
      .replace(/\$\?\b/g, '0')
      .replace(/\$PATH\b/g, '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin');

    // Replace user exported environment variables
    for (const [k, v] of Object.entries(bashEnv)) {
      textPart = textPart.replace(new RegExp(`\\$${k}\\b`, 'g'), v);
    }

    // Remove wrapping quotes if present
    const unquoted = textPart.replace(/^["'](.*)["']$/, '$1');
    return { error: false, text: unquoted };
  },

  env: (_pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    const host = ctx.computerName.toLowerCase().replace('desktop-', '');
    const cwd = toPosixFullPath(ctx.vfs.getCwd());
    const user = ctx.currentUser.toLowerCase();
    const envVars = [
      `SHELL=/bin/bash`,
      `PWD=${cwd}`,
      `LOGNAME=${user}`,
      `HOME=/home/student`,
      `LANG=en_US.UTF-8`,
      `TERM=xterm-256color`,
      `USER=${user}`,
      `HOSTNAME=${host}`,
      `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games`,
      `SHLVL=1`,
      `_=/usr/bin/env`,
    ];
    const bashEnv: Record<string, string> = (ctx as any).bashEnv || {};
    for (const [k, v] of Object.entries(bashEnv)) {
      envVars.push(`${k}=${v}`);
    }
    return { error: false, text: envVars.join('\n') };
  },

  printenv: (pos, flags, switches, ctx, rawCmd, stdin) => {
    if (pos.length > 0) {
      const varName = pos[0].replace('$', '');
      const host = ctx.computerName.toLowerCase().replace('desktop-', '');
      const bashEnv: Record<string, string> = (ctx as any).bashEnv || {};
      const map: Record<string, string> = {
        USER: ctx.currentUser.toLowerCase(),
        HOME: '/home/student',
        SHELL: '/bin/bash',
        HOSTNAME: host,
        TERM: 'xterm-256color',
        PWD: toPosixFullPath(ctx.vfs.getCwd()),
        PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        ...bashEnv,
      };
      if (map[varName]) return { error: false, text: map[varName] };
      return { error: false, text: '' };
    }
    return bashRegistry.env(pos, flags, switches, ctx, rawCmd, stdin);
  },

  export: (pos, flags, switches, ctx, rawCmd, stdin) => {
    if (pos.length === 0) {
      return bashRegistry.env(pos, flags, switches, ctx, rawCmd, stdin);
    }
    (ctx as any).bashEnv = (ctx as any).bashEnv || {};
    for (const arg of pos) {
      if (arg.includes('=')) {
        const [k, ...v] = arg.split('=');
        (ctx as any).bashEnv[k.trim()] = v.join('=').replace(/^["']|["']$/g, '');
      }
    }
    return { error: false, text: '' };
  },

  which: (pos) => {
    if (pos.length === 0) return { error: true, text: 'which: missing argument' };
    const bin = pos[0].toLowerCase();
    const bins: Record<string, string> = {
      bash: '/bin/bash',
      sh: '/bin/sh',
      ls: '/bin/ls',
      cat: '/bin/cat',
      grep: '/bin/grep',
      ip: '/sbin/ip',
      ifconfig: '/sbin/ifconfig',
      ping: '/bin/ping',
      ps: '/bin/ps',
      top: '/usr/bin/top',
      htop: '/usr/bin/htop',
      kill: '/bin/kill',
      killall: '/usr/bin/killall',
      sudo: '/usr/bin/sudo',
      apt: '/usr/bin/apt',
      'apt-get': '/usr/bin/apt-get',
      systemctl: '/bin/systemctl',
      service: '/usr/sbin/service',
      journalctl: '/bin/journalctl',
      curl: '/usr/bin/curl',
      wget: '/usr/bin/wget',
      ssh: '/usr/bin/ssh',
      scp: '/usr/bin/scp',
      python3: '/usr/bin/python3',
      node: '/usr/bin/node',
      git: '/usr/bin/git',
      chmod: '/bin/chmod',
      chown: '/bin/chown',
      mkdir: '/bin/mkdir',
      rmdir: '/bin/rmdir',
      rm: '/bin/rm',
      cp: '/bin/cp',
      mv: '/bin/mv',
      touch: '/bin/touch',
      head: '/usr/bin/head',
      tail: '/usr/bin/tail',
      wc: '/usr/bin/wc',
      find: '/usr/bin/find',
      diff: '/usr/bin/diff',
      file: '/usr/bin/file',
      tar: '/bin/tar',
      sort: '/usr/bin/sort',
      uniq: '/usr/bin/uniq',
      whoami: '/usr/bin/whoami',
      id: '/usr/bin/id',
      hostname: '/bin/hostname',
      uname: '/bin/uname',
      uptime: '/usr/bin/uptime',
      date: '/bin/date',
      cal: '/usr/bin/cal',
      df: '/bin/df',
      du: '/usr/bin/du',
      free: '/usr/bin/free',
      dmesg: '/bin/dmesg',
      traceroute: '/usr/bin/traceroute',
      tracepath: '/usr/bin/tracepath',
      netstat: '/bin/netstat',
      ss: '/bin/ss',
      nslookup: '/usr/bin/nslookup',
      dig: '/usr/bin/dig',
      arp: '/usr/sbin/arp',
      ufw: '/usr/sbin/ufw',
      iptables: '/usr/sbin/iptables',
      man: '/usr/bin/man',
    };
    if (bins[bin]) {
      return { error: false, text: bins[bin] };
    }
    if (bashRegistry[bin]) {
      return { error: false, text: `/bin/${bin}` };
    }
    return { error: true, text: `which: no ${pos[0]} in (/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin)` };
  },

  whereis: (pos) => {
    if (pos.length === 0) return { error: true, text: 'whereis: missing argument' };
    const name = pos[0].toLowerCase();
    const whichRes = bashRegistry.which([name], {}, [], {} as any, '');
    const path = !whichRes.error ? whichRes.text : `/usr/bin/${name}`;
    return {
      error: false,
      text: `${name}: ${path} /usr/share/man/man1/${name}.1.gz`,
    };
  },

  alias: (pos) => {
    if (pos.length === 0) {
      return {
        error: false,
        text: `alias alert='notify-send --urgency=low -i "$([ $? = 0 ] && echo terminal || echo error)" "$(history|tail -n1|sed -e \'s/^\\s*[0-9]\\+\\s*//;s/[;&|]\\s*alert$//\')"'
alias egrep='egrep --color=auto'
alias fgrep='fgrep --color=auto'
alias grep='grep --color=auto'
alias l='ls -CF'
alias la='ls -A'
alias ll='ls -la'
alias ls='ls --color=auto'`,
      };
    }
    return { error: false, text: '' };
  },

  history: () => {
    const defaultHistory = [
      '    1  sudo apt update',
      '    2  ip a',
      '    3  ping -c 4 8.8.8.8',
      '    4  ls -la',
      '    5  cat /etc/hosts',
      '    6  systemctl status nginx',
      '    7  ps aux | grep sshd',
      '    8  df -h',
      '    9  free -h',
      '   10  uname -a',
    ];
    return { error: false, text: defaultHistory.join('\n') };
  },

  help: (pos) => {
    if (pos.length > 0) {
      const topic = pos[0].toLowerCase();
      if (bashRegistry[topic]) {
        return bashRegistry.man(pos, {}, [], {} as any, '');
      }
      return { error: true, text: `bash: help: no help topics match '${pos[0]}'. Try 'man ${pos[0]}'.` };
    }
    return {
      error: false,
      text: `GNU bash, version 5.1.16(1)-release (x86_64-pc-linux-gnu)
These shell commands are defined internally. Type 'help <name>' or 'man <name>' for details.

Files & Navigation:
  ls [-la]       List directory contents (with flags -l, -a, -h, -la)
  cd [dir]       Change current directory (supports ~, .., -, /etc, etc.)
  pwd            Print working directory full POSIX path
  cat [file...]  Concatenate and display files (supports -n, piping)
  head [-n N]    Output first N lines of file or stdin
  tail [-n N]    Output last N lines of file or stdin
  wc [-l|-w|-c]  Word, line, and character count
  touch [file]   Create empty file or update timestamp
  mkdir [-p]     Create directories (supports -p for nested)
  rmdir [dir]    Remove empty directories
  rm [-rf]       Remove files or directories recursively
  cp [-r]        Copy files or directories
  mv [src] [dst] Move or rename files or directories
  find [path]    Search for files (supports -name "*.ext", -type f/d)
  diff [f1] [f2] Compare files line by line
  file [file]    Determine file type
  tar [-xvf]     Archive utility
  sort [-r]      Sort lines of text or stdin
  uniq [-c]      Report or omit repeated lines
  chmod [mode]   Change file permissions (e.g. 755, +x)
  chown [owner]  Change file owner and group

System & Processes:
  ps [aux|-ef]   Report process snapshot (BSD and standard format)
  top / htop     Display dynamic real-time Linux processes
  kill [-9] PID  Send signal to terminate process
  killall [name] Kill processes by name
  free [-h|-m]   Display amount of free and used memory
  df [-h]        Report file system disk space usage
  du [-sh]       Estimate file space usage
  uname [-a|-r]  Print system information
  uptime         Show how long system has been running
  date / cal     Display current date, time, or calendar
  dmesg          Print kernel ring buffer messages
  systemctl      Control systemd services (status, start, stop, restart)
  service [srv]  Run a system service control script
  journalctl     Query systemd journal logs

Networking (SNA Lab):
  ip [a|r|l|n]   Modern interface address, route, link, and neighbor tool
  ifconfig       Legacy network interface configuration
  ping [-c N]    Send ICMP ECHO_REQUEST to network hosts
  traceroute     Print network route packets trace to host
  netstat [-a]   Print active network connections and listening ports
  ss [-tuln]     Modern socket statistics utility
  nslookup [dom] Query Internet name servers interactively
  dig [domain]   DNS lookup utility
  curl [-I]      Transfer data from or to a server
  wget [url]     Non-interactive network downloader
  ssh / scp      Secure shell and remote copy
  arp [-a]       Display Address Resolution Protocol table
  ufw / iptables Manage host firewall rules and packet filters

Administration & Shell:
  sudo [command] Execute a command as superuser (root)
  su [user]      Substitute user identity
  passwd         Change user password
  apt / apt-get  Debian/Ubuntu package handling utility
  whoami / id    Print effective userid and group memberships
  hostname       Show or set system host name
  clear          Clear terminal display screen
  echo [text]    Print arguments with $USER, $PWD, $HOME expansion
  env / printenv Display all exported environment variables
  export [k=v]   Set environment variable for current shell session
  which / whereis Locate a command binary in search path
  alias / history Display shell aliases and command history`,
    };
  },

  man: (pos) => {
    if (pos.length === 0) {
      return { error: true, text: 'What manual page do you want?' };
    }
    const topic = pos[0].toLowerCase();
    const manuals: Record<string, string> = {
      ls: `LS(1)                            User Commands                           LS(1)

NAME
       ls - list directory contents

SYNOPSIS
       ls [OPTION]... [FILE]...

DESCRIPTION
       List information about the FILEs (the current directory by default).
       -a, --all              do not ignore entries starting with .
       -l                     use a long listing format with permissions, owners, sizes
       -h, --human-readable   with -l and -s, print sizes like 1K 234M 2G
       -la, -al               combined long list showing all hidden items`,

      cat: `CAT(1)                           User Commands                           CAT(1)

NAME
       cat - concatenate files and print on the standard output

SYNOPSIS
       cat [OPTION]... [FILE]...

DESCRIPTION
       Concatenate FILE(s) to standard output.
       -n, --number           number all output lines
       -b, --number-nonblank  number nonempty output lines`,

      head: `HEAD(1)                          User Commands                          HEAD(1)

NAME
       head - output the first part of files

SYNOPSIS
       head [OPTION]... [FILE]...

DESCRIPTION
       Print the first 10 lines of each FILE to standard output.
       With more than one FILE, precede each with a header giving the file name.
       -n, --lines=[-]NUM     print the first NUM lines instead of the first 10`,

      tail: `TAIL(1)                          User Commands                          TAIL(1)

NAME
       tail - output the last part of files

SYNOPSIS
       tail [OPTION]... [FILE]...

DESCRIPTION
       Print the last 10 lines of each FILE to standard output.
       -n, --lines=[+]NUM     output the last NUM lines, instead of the last 10
       -f, --follow           output appended data as the file grows`,

      grep: `GREP(1)                          User Commands                          GREP(1)

NAME
       grep, egrep, fgrep - print lines that match patterns

SYNOPSIS
       grep [OPTION...] PATTERNS [FILE...]

DESCRIPTION
       grep searches for PATTERNS in each FILE or standard input.
       -i, --ignore-case   ignore case distinctions in patterns and input
       -n, --line-number   prefix each line of output with its 1-based line number
       -v, --invert-match  select non-matching lines
       -c, --count         print only a count of selected lines per FILE`,

      cd: `CD(1)                            Bash Builtin                            CD(1)

NAME
       cd - change the shell working directory

SYNOPSIS
       cd [-L|[-P [-e]] [-@]] [dir]

DESCRIPTION
       Change the current directory to DIR. The default DIR is the value of the
       HOME shell variable (~).
       Use '-' as DIR to return to the previous working directory ($OLDPWD).`,

      pwd: `PWD(1)                           User Commands                           PWD(1)

NAME
       pwd - print name of current/working directory

SYNOPSIS
       pwd [-LP]

DESCRIPTION
       Print the full filename of the current working directory.`,

      ip: `IP(8)                               Linux                               IP(8)

NAME
       ip - show / manipulate routing, network devices, interfaces and tunnels

SYNOPSIS
       ip [ OPTIONS ] OBJECT { COMMAND | help }

OBJECT
       address (a)   - protocol (IP or IPv6) address on a device.
       link (l)      - network device.
       route (r)     - routing table entry.
       neighbor (n)  - ARP or NDISC cache entry.`,

      ping: `PING(8)                          System Manager's Manual                 PING(8)

NAME
       ping - send ICMP ECHO_REQUEST to network hosts

SYNOPSIS
       ping [-c count] destination

DESCRIPTION
       ping uses the ICMP protocol's mandatory ECHO_REQUEST datagram to elicit
       an ICMP ECHO_RESPONSE from a host or gateway.
       -c count    Stop after sending count ECHO_REQUEST packets.`,

      ps: `PS(1)                            User Commands                           PS(1)

NAME
       ps - report a snapshot of the current processes

SYNOPSIS
       ps [options]

DESCRIPTION
       ps displays information about a selection of the active processes.
       aux         BSD syntax: show all processes with owner and CPU/MEM usage
       -ef         Standard Unix syntax: full format process listing`,

      chmod: `CHMOD(1)                         User Commands                          CHMOD(1)

NAME
       chmod - change file mode bits

SYNOPSIS
       chmod [OPTION]... MODE[,MODE]... FILE...

DESCRIPTION
       chmod changes the file mode bits of each given file according to MODE.
       Numeric modes: 755 (rwxr-xr-x), 644 (rw-r--r--), +x (executable).`,

      systemctl: `SYSTEMCTL(1)                     systemctl                      SYSTEMCTL(1)

NAME
       systemctl - Control the systemd system and service manager

SYNOPSIS
       systemctl [OPTIONS...] COMMAND [UNIT...]

COMMANDS
       status [UNIT...]      Show runtime status about units
       start [UNIT...]       Start (activate) one or more units
       stop [UNIT...]        Stop (deactivate) one or more units
       restart [UNIT...]     Stop and then start one or more units
       list-units            List units currently in memory`,

      sudo: `SUDO(8)                          System Manager's Manual                 SUDO(8)

NAME
       sudo - execute a command as another user or superuser (root)

SYNOPSIS
       sudo [-u user] command [args...]

DESCRIPTION
       sudo allows a permitted user to execute a command as the superuser or another user.`,
    };

    if (manuals[topic]) {
      return { error: false, text: manuals[topic] };
    }
    return {
      error: false,
      text: `${topic.toUpperCase()}(1) - standard Linux manual entry.\nUsage: ${topic} [OPTIONS] [ARGUMENTS]\n(Run '${topic} --help' for quick synopsis)`,
    };
  },

  // ================= FILE & DIRECTORY OPERATIONS =================
  ls: (pos, flags, switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    const showAll = flags['a'] || flags['all'] || switches.includes('a') || switches.includes('la') || switches.includes('al');
    const longFormat = flags['l'] || switches.includes('l') || switches.includes('la') || switches.includes('al') || switches.includes('lh');
    const human = flags['h'] || switches.includes('h') || switches.includes('lh');

    const targetInput = pos[0] || '';
    const targetVfs = targetInput ? toVfsPath(targetInput, ctx.vfs.getCwd()) : ctx.vfs.getCwd();

    const nodeRes = ctx.vfs.getNodeResult(targetVfs);
    if (!nodeRes) {
      return { error: true, text: `ls: cannot access '${targetInput}': No such file or directory` };
    }

    if (nodeRes.node.type === 'file') {
      if (longFormat) {
        const size = nodeRes.node.content.length;
        const sizeStr = human && size > 1024 ? `${(size / 1024).toFixed(1)}K` : `${size}`;
        return {
          error: false,
          text: `-rw-r--r-- 1 student student ${sizeStr.padStart(6)} Sep  8 20:15 ${nodeRes.canonicalName}`,
        };
      }
      return { error: false, text: nodeRes.canonicalName };
    }

    // Directory listing
    let keys = Object.keys(nodeRes.node.children);

    // If not showing all, filter hidden files starting with .
    if (!showAll) {
      keys = keys.filter((k) => !k.startsWith('.'));
    } else {
      if (!keys.includes('.')) keys.unshift('.');
      if (!keys.includes('..')) keys.splice(1, 0, '..');
    }

    keys.sort();

    if (longFormat) {
      const lines = [`total ${Math.max(4, keys.length * 4)}`];
      for (const name of keys) {
        if (name === '.' || name === '..') {
          lines.push(`drwxr-xr-x 2 student student   4096 Sep  8 20:00 ${name}`);
          continue;
        }
        const child = nodeRes.node.children[name];
        if (child && child.type === 'dir') {
          lines.push(`drwxr-xr-x 2 student student   4096 Sep  8 20:15 ${name}`);
        } else {
          const size = child && child.type === 'file' ? child.content.length : 0;
          const sizeStr = human && size > 1024 ? `${(size / 1024).toFixed(1)}K` : `${size}`;
          lines.push(`-rw-r--r-- 1 student student ${sizeStr.padStart(6)} Sep  8 20:20 ${name}`);
        }
      }
      return { error: false, text: lines.join('\n') };
    }

    return { error: false, text: keys.join('  ') };
  },

  cat: (pos, flags, switches, ctx, _rawCmd, stdin) => {
    ensureLinuxFilesystem(ctx);
    const lineNumbers = flags['n'] || switches.includes('n');

    if (pos.length === 0) {
      if (stdin !== undefined) {
        if (lineNumbers) {
          return {
            error: false,
            text: stdin.split('\n').map((l, i) => `${(i + 1).toString().padStart(6)}  ${l}`).join('\n'),
          };
        }
        return { error: false, text: stdin };
      }
      return { error: true, text: 'cat: missing operand' };
    }

    const outputs: string[] = [];
    for (const fileInput of pos) {
      const vfsPath = toVfsPath(fileInput, ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(vfsPath);
      if (!res) {
        return { error: true, text: `cat: ${fileInput}: No such file or directory` };
      }
      if (res.node.type === 'dir') {
        return { error: true, text: `cat: ${fileInput}: Is a directory` };
      }
      outputs.push(res.node.content);
    }

    let combined = outputs.join('\n');
    if (lineNumbers) {
      combined = combined
        .split('\n')
        .map((line, idx) => `${(idx + 1).toString().padStart(6)}  ${line}`)
        .join('\n');
    }
    return { error: false, text: combined };
  },

  head: (pos, flags, _switches, ctx, _rawCmd, stdin) => {
    ensureLinuxFilesystem(ctx);
    const nLines = parseInt(String(flags['n'] || flags['lines'] || '10'), 10) || 10;
    let content = stdin || '';

    if (pos.length > 0) {
      const target = toVfsPath(pos[0], ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (!res || res.node.type !== 'file') {
        return { error: true, text: `head: cannot open '${pos[0]}' for reading: No such file or directory` };
      }
      content = res.node.content;
    }

    const lines = content.split('\n').slice(0, nLines);
    return { error: false, text: lines.join('\n') };
  },

  tail: (pos, flags, _switches, ctx, _rawCmd, stdin) => {
    ensureLinuxFilesystem(ctx);
    const nLines = parseInt(String(flags['n'] || flags['lines'] || '10'), 10) || 10;
    let content = stdin || '';

    if (pos.length > 0) {
      const target = toVfsPath(pos[0], ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (!res || res.node.type !== 'file') {
        return { error: true, text: `tail: cannot open '${pos[0]}' for reading: No such file or directory` };
      }
      content = res.node.content;
    }

    const all = content.split('\n');
    const lines = all.slice(Math.max(0, all.length - nLines));
    return { error: false, text: lines.join('\n') };
  },

  wc: (pos, flags, switches, ctx, _rawCmd, stdin) => {
    ensureLinuxFilesystem(ctx);
    const countLines = flags['l'] || switches.includes('l');
    const countWords = flags['w'] || switches.includes('w');
    const countBytes = flags['c'] || switches.includes('c');
    const all = !countLines && !countWords && !countBytes;

    let content = stdin || '';
    let fileName = '';

    if (pos.length > 0) {
      fileName = pos[0];
      const target = toVfsPath(pos[0], ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (!res || res.node.type !== 'file') {
        return { error: true, text: `wc: ${pos[0]}: No such file or directory` };
      }
      content = res.node.content;
    }

    const lines = content ? content.split('\n').length : 0;
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const bytes = content.length;

    const parts: string[] = [];
    if (all || countLines) parts.push(lines.toString().padStart(4));
    if (all || countWords) parts.push(words.toString().padStart(4));
    if (all || countBytes) parts.push(bytes.toString().padStart(4));
    if (fileName) parts.push(fileName);

    return { error: false, text: parts.join(' ') };
  },

  touch: (pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length === 0) return { error: true, text: 'touch: missing file operand' };

    for (const f of pos) {
      const target = toVfsPath(f, ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (!res) {
        ctx.vfs.createFile(target, '');
      }
    }
    return { error: false, text: '' };
  },

  mkdir: (pos, flags, switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length === 0) return { error: true, text: 'mkdir: missing operand' };
    const parents = flags['p'] || switches.includes('p');

    for (const d of pos) {
      const target = toVfsPath(d, ctx.vfs.getCwd());
      if (parents) {
        const segments = target.split('\\').filter(Boolean);
        let curr = segments[0] + '\\';
        for (let i = 1; i < segments.length; i++) {
          curr += segments[i];
          if (!ctx.vfs.getNodeResult(curr)) {
            ctx.vfs.createDirectory(curr);
          }
          curr += '\\';
        }
      } else {
        const created = ctx.vfs.createDirectory(target);
        if (!created) {
          return { error: true, text: `mkdir: cannot create directory '${d}': File exists or invalid path` };
        }
      }
    }
    return { error: false, text: '' };
  },

  rmdir: (pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length === 0) return { error: true, text: 'rmdir: missing operand' };
    for (const d of pos) {
      const target = toVfsPath(d, ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (!res || res.node.type !== 'dir') {
        return { error: true, text: `rmdir: failed to remove '${d}': No such directory` };
      }
      if (Object.keys(res.node.children).length > 0) {
        return { error: true, text: `rmdir: failed to remove '${d}': Directory not empty` };
      }
      ctx.vfs.removeDirectory(target, false);
    }
    return { error: false, text: '' };
  },

  rm: (pos, flags, switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length === 0) return { error: true, text: 'rm: missing operand' };
    const recursive = flags['r'] || flags['R'] || switches.includes('r') || switches.includes('rf') || switches.includes('fr');
    const force = flags['f'] || switches.includes('f') || switches.includes('rf') || switches.includes('fr');

    for (const item of pos) {
      const target = toVfsPath(item, ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (!res) {
        if (!force) return { error: true, text: `rm: cannot remove '${item}': No such file or directory` };
        continue;
      }
      if (res.node.type === 'dir') {
        if (!recursive) {
          return { error: true, text: `rm: cannot remove '${item}': Is a directory` };
        }
        ctx.vfs.removeDirectory(target, true);
      } else {
        ctx.vfs.deleteFile(target);
      }
    }
    return { error: false, text: '' };
  },

  cp: (pos, flags, switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length < 2) return { error: true, text: 'cp: missing destination file operand' };
    const src = toVfsPath(pos[0], ctx.vfs.getCwd());
    const dest = toVfsPath(pos[1], ctx.vfs.getCwd());

    const srcRes = ctx.vfs.getNodeResult(src);
    if (!srcRes) return { error: true, text: `cp: cannot stat '${pos[0]}': No such file or directory` };

    if (srcRes.node.type === 'dir') {
      const recursive = flags['r'] || flags['R'] || switches.includes('r');
      if (!recursive) return { error: true, text: `cp: -r not specified; omitting directory '${pos[0]}'` };
      // Copy directory contents
      ctx.vfs.createDirectory(dest);
      return { error: false, text: '' };
    }

    ctx.vfs.copyFile(src, dest);
    return { error: false, text: '' };
  },

  mv: (pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length < 2) return { error: true, text: 'mv: missing destination file operand' };
    const src = toVfsPath(pos[0], ctx.vfs.getCwd());
    const dest = toVfsPath(pos[1], ctx.vfs.getCwd());

    const moved = ctx.vfs.moveNode(src, dest);
    if (!moved) {
      return { error: true, text: `mv: cannot move '${pos[0]}' to '${pos[1]}': No such file or directory` };
    }
    return { error: false, text: '' };
  },

  grep: (pos, flags, switches, ctx, _rawCmd, stdin) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length === 0) return { error: true, text: 'usage: grep [options] pattern [files]' };

    const ignoreCase = flags['i'] || switches.includes('i');
    const invert = flags['v'] || switches.includes('v');
    const lineNumbers = flags['n'] || switches.includes('n');
    const countOnly = flags['c'] || switches.includes('c');

    const pattern = pos[0];
    let content = stdin || '';

    if (pos.length > 1) {
      const target = toVfsPath(pos[1], ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (!res || res.node.type !== 'file') {
        return { error: true, text: `grep: ${pos[1]}: No such file or directory` };
      }
      content = res.node.content;
    }

    if (!content && stdin === undefined) {
      return { error: false, text: '' };
    }

    const lines = content.split('\n');
    const matched: string[] = [];

    lines.forEach((line, idx) => {
      let isMatch = false;
      try {
        const regex = new RegExp(pattern, ignoreCase ? 'i' : '');
        isMatch = regex.test(line);
      } catch {
        isMatch = ignoreCase
          ? line.toLowerCase().includes(pattern.toLowerCase())
          : line.includes(pattern);
      }

      if (invert ? !isMatch : isMatch) {
        matched.push(lineNumbers ? `${idx + 1}:${line}` : line);
      }
    });

    if (countOnly) {
      return { error: false, text: matched.length.toString() };
    }
    return { error: false, text: matched.join('\n') };
  },

  find: (pos, flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    const startPath = pos[0] && !pos[0].startsWith('-') ? pos[0] : '.';
    const targetVfs = toVfsPath(startPath, ctx.vfs.getCwd());
    const nameFilter = String(flags['name'] || '').replace(/^["']|["']$/g, '');

    const res = ctx.vfs.getNodeResult(targetVfs);
    if (!res) return { error: true, text: `find: '${startPath}': No such file or directory` };

    const results: string[] = [];
    function traverse(pathPosix: string, vfsP: string) {
      results.push(pathPosix);
      const cur = ctx.vfs.getNodeResult(vfsP);
      if (cur && cur.node.type === 'dir') {
        for (const child of Object.keys(cur.node.children).sort()) {
          const childPosix = pathPosix === '.' ? `./${child}` : `${pathPosix}/${child}`;
          const childVfs = vfsP.endsWith('\\') ? vfsP + child : `${vfsP}\\${child}`;
          traverse(childPosix, childVfs);
        }
      }
    }

    traverse(startPath, targetVfs);

    let filtered = results;
    if (nameFilter) {
      const globRegex = new RegExp('^' + nameFilter.replace(/\*/g, '.*') + '$', 'i');
      filtered = results.filter((p) => globRegex.test(p.split('/').pop() || ''));
    }

    return { error: false, text: filtered.join('\n') };
  },

  chmod: (pos) => {
    if (pos.length < 2) return { error: true, text: 'chmod: missing operand' };
    return { error: false, text: '' };
  },

  chown: (pos) => {
    if (pos.length < 2) return { error: true, text: 'chown: missing operand' };
    return { error: false, text: '' };
  },

  diff: (pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length < 2) return { error: true, text: 'diff: missing operand after ' + (pos[0] || '') };
    const f1 = toVfsPath(pos[0], ctx.vfs.getCwd());
    const f2 = toVfsPath(pos[1], ctx.vfs.getCwd());

    const r1 = ctx.vfs.getNodeResult(f1);
    const r2 = ctx.vfs.getNodeResult(f2);
    if (!r1 || r1.node.type !== 'file') return { error: true, text: `diff: ${pos[0]}: No such file or directory` };
    if (!r2 || r2.node.type !== 'file') return { error: true, text: `diff: ${pos[1]}: No such file or directory` };

    if (r1.node.content === r2.node.content) return { error: false, text: '' };

    return {
      error: false,
      text: `--- ${pos[0]}\t2026-09-08 20:10:00.000000000 +0530\n+++ ${pos[1]}\t2026-09-08 20:12:00.000000000 +0530\n@@ -1 +1 @@\n-${r1.node.content.slice(0, 40)}\n+${r2.node.content.slice(0, 40)}`,
    };
  },

  file: (pos, _flags, _switches, ctx) => {
    ensureLinuxFilesystem(ctx);
    if (pos.length === 0) return { error: true, text: 'usage: file [file...]' };
    const target = toVfsPath(pos[0], ctx.vfs.getCwd());
    const res = ctx.vfs.getNodeResult(target);
    if (!res) return { error: true, text: `file: cannot open '${pos[0]}' (No such file or directory)` };

    if (res.node.type === 'dir') return { error: false, text: `${pos[0]}: directory` };
    if (res.canonicalName.endsWith('.sh')) return { error: false, text: `${pos[0]}: Bourne-Again shell script, ASCII text executable` };
    if (res.canonicalName.endsWith('.json')) return { error: false, text: `${pos[0]}: JSON data` };
    if (res.node.type === 'file' && !res.node.content) return { error: false, text: `${pos[0]}: empty` };
    return { error: false, text: `${pos[0]}: ASCII text` };
  },

  tar: (pos) => {
    if (pos.length === 0) return { error: true, text: 'tar: You must specify one of the options' };
    return { error: false, text: 'tar: archive operation completed successfully.' };
  },

  sort: (pos, flags, switches, ctx, _rawCmd, stdin) => {
    let content = stdin || '';
    if (pos.length > 0) {
      const target = toVfsPath(pos[0], ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(target);
      if (res && res.node.type === 'file') content = res.node.content;
    }
    const lines = content.split('\n');
    lines.sort();
    if (flags['r'] || switches.includes('r')) lines.reverse();
    return { error: false, text: lines.join('\n') };
  },

  uniq: (_pos, _flags, _switches, _ctx, _rawCmd, stdin) => {
    if (!stdin) return { error: false, text: '' };
    const lines = stdin.split('\n');
    const result: string[] = [];
    lines.forEach((l) => {
      if (result.length === 0 || result[result.length - 1] !== l) {
        result.push(l);
      }
    });
    return { error: false, text: result.join('\n') };
  },

  // ================= SYSTEM & PROCESS INSPECTION =================
  whoami: (_pos, _flags, _switches, ctx) => {
    return { error: false, text: ctx.currentUser.toLowerCase() };
  },

  id: (pos, _flags, _switches, ctx) => {
    const target = pos[0]?.toLowerCase();
    if (target === 'root') {
      return { error: false, text: 'uid=0(root) gid=0(root) groups=0(root)' };
    }
    const user = ctx.currentUser.toLowerCase();
    return {
      error: false,
      text: `uid=1000(${user}) gid=1000(${user}) groups=1000(${user}),4(adm),24(cdrom),27(sudo),100(users)`,
    };
  },

  hostname: (pos, flags, switches, ctx) => {
    const host = ctx.computerName.toLowerCase().replace('desktop-', '');
    if (flags['I'] || switches.includes('I') || flags['i'] || switches.includes('i')) {
      return { error: false, text: ctx.network.ipv4 || '192.168.1.100' };
    }
    return { error: false, text: host };
  },

  uname: (pos, flags, switches) => {
    const all = flags['a'] || switches.includes('a') || switches.includes('-a');
    const release = flags['r'] || switches.includes('r') || switches.includes('-r');
    const machine = flags['m'] || switches.includes('m') || switches.includes('-m');
    const nodename = flags['n'] || switches.includes('n') || switches.includes('-n');

    if (release) return { error: false, text: '5.15.0-100-generic' };
    if (machine) return { error: false, text: 'x86_64' };
    if (nodename) return { error: false, text: 'sna25' };
    if (all) {
      return {
        error: false,
        text: 'Linux sna25 5.15.0-100-generic #110-Ubuntu SMP Mon Feb 12 14:22:15 UTC 2024 x86_64 x86_64 x86_64 GNU/Linux',
      };
    }
    return { error: false, text: 'Linux' };
  },

  uptime: () => {
    return {
      error: false,
      text: ' 21:58:12 up 3 days, 14:22,  1 user,  load average: 0.08, 0.12, 0.10',
    };
  },

  date: () => {
    const now = new Date();
    return { error: false, text: now.toUTCString().replace('GMT', 'UTC') };
  },

  cal: () => {
    const calText = `   September 2026   
Su Mo Tu We Th Fr Sa
       1  2  3  4  5
 6  7  8  9 10 11 12
13 14 15 16 17 18 19
20 21 22 23 24 25 26
27 28 29 30         `;
    return { error: false, text: calText };
  },

  df: (_pos, flags, switches) => {
    const human = flags['h'] || switches.includes('h');
    if (human) {
      return {
        error: false,
        text: `Filesystem      Size  Used Avail Use% Mounted on
udev            1.9G     0  1.9G   0% /dev
tmpfs           392M  1.4M  391M   1% /run
/dev/sda1        49G   14G   33G  30% /
tmpfs           2.0G     0  2.0G   0% /dev/shm
tmpfs           5.0M  4.0K  5.0M   1% /run/lock
/dev/sda15      105M  6.1M   99M   6% /boot/efi`,
      };
    }
    return {
      error: false,
      text: `Filesystem     1K-blocks     Used Available Use% Mounted on
udev             1996840        0   1996840   0% /dev
tmpfs             401140     1420    399720   1% /run
/dev/sda1       51381280 14680064  34084816  31% /
tmpfs            2005680        0   2005680   0% /dev/shm`,
    };
  },

  du: (_pos, flags, switches) => {
    const human = flags['h'] || switches.includes('h') || switches.includes('sh');
    return {
      error: false,
      text: human
        ? `4.0K\t./Downloads\n8.0K\t./Documents\n4.0K\t./Desktop\n28K\t.`
        : `4\t./Downloads\n8\t./Documents\n4\t./Desktop\n28\t.`,
    };
  },

  free: (_pos, flags, switches) => {
    const human = flags['h'] || switches.includes('h');
    if (human) {
      return {
        error: false,
        text: `               total        used        free      shared  buff/cache   available
Mem:           3.8Gi       1.1Gi       1.8Gi        12Mi       980Mi       2.4Gi
Swap:          2.0Gi          0B       2.0Gi`,
      };
    }
    return {
      error: false,
      text: `               total        used        free      shared  buff/cache   available
Mem:         3988480     1153432     1892144       12288     1002904     2514160
Swap:        2097148           0     2097148`,
    };
  },

  ps: (_pos, flags, switches, ctx) => {
    const isAux = flags['aux'] || switches.includes('aux') || switches.includes('ef');
    if (isAux) {
      const lines = [
        'USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND',
        'root         1  0.0  0.2 168344 11248 ?        Ss   08:00   0:02 /sbin/init splash',
        'root         2  0.0  0.0      0     0 ?        S    08:00   0:00 [kthreadd]',
        'root        84  0.0  0.1  28940  6144 ?        Ss   08:00   0:00 /lib/systemd/systemd-journald',
        'root       120  0.0  0.1  15420  4820 ?        Ss   08:00   0:00 /usr/sbin/sshd -D',
        'www-data   185  0.0  0.2  55280  8920 ?        S    08:05   0:00 nginx: worker process',
      ];
      // Include lab simulated processes
      ctx.processes.slice(0, 5).forEach((p, idx) => {
        lines.push(
          `student   ${(1000 + idx).toString().padEnd(5)} 0.1  0.3  78920 12400 pts/0    S+   09:10   0:00 ${p.imageName.toLowerCase().replace('.exe', '')}`
        );
      });
      lines.push('student   1520  0.0  0.1  10844  5120 pts/0    R+   21:58   0:00 ps aux');
      return { error: false, text: lines.join('\n') };
    }

    return {
      error: false,
      text: `    PID TTY          TIME CMD
   1012 pts/0    00:00:00 bash
   1520 pts/0    00:00:00 ps`,
    };
  },

  top: () => {
    return {
      error: false,
      text: `top - 21:58:30 up 3 days, 14:22,  1 user,  load average: 0.08, 0.12, 0.10
Tasks:  98 total,   1 running,  97 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.2 us,  0.5 sy,  0.0 ni, 98.2 id,  0.1 wa,  0.0 hi,  0.0 si,  0.0 st
MiB Mem :   3895.0 total,   1847.8 free,   1126.4 used,    920.8 buff/cache
MiB Swap:   2048.0 total,   2048.0 free,      0.0 used.   2458.6 avail Mem 

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
    120 root      20   0   15420   4820   3910 S   0.3   0.1   0:01.14 sshd
    185 www-data  20   0   55280   8920   6120 S   0.3   0.2   0:02.40 nginx
   1012 student   20   0   10844   5120   3340 S   0.0   0.1   0:00.18 bash
   1521 student   20   0   14920   4110   3100 R   0.0   0.1   0:00.02 top`,
    };
  },

  htop: () => bashRegistry.top([], {}, [], {} as any, ''),

  kill: (pos, _flags, _switches, ctx) => {
    if (pos.length === 0) return { error: true, text: 'kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ...' };
    const pid = parseInt(pos[0], 10);
    const idx = ctx.processes.findIndex((p) => p.pid === pid);
    if (idx !== -1) {
      ctx.processes.splice(idx, 1);
      return { error: false, text: '' };
    }
    return { error: false, text: '' };
  },

  killall: (pos, _flags, _switches, ctx) => {
    if (pos.length === 0) return { error: true, text: 'killall: missing process name operand' };
    const name = pos[0].toLowerCase();
    ctx.processes = ctx.processes.filter((p) => !p.imageName.toLowerCase().includes(name));
    return { error: false, text: '' };
  },

  dmesg: () => {
    return {
      error: false,
      text: `[    0.000000] Linux version 5.15.0-100-generic (buildd@lcy02-amd64-001)
[    0.000000] Command line: BOOT_IMAGE=/boot/vmlinuz-5.15.0-100-generic root=UUID=7e8e8103-62c7
[    0.051210] x86/fpu: Supporting XSAVE feature 0x001: 'x87 floating point registers'
[    0.182390] ACPI: Core revision 20210930
[    1.204510] eth0: Link is Up - 1Gbps/Full - flow control rx/tx
[    1.204812] IPv6: ADDRCONF(NETDEV_CHANGE): eth0: link becomes ready`,
    };
  },

  // ================= NETWORKING & DIAGNOSTICS (SNA LAB) =================
  ip: (pos, flags, switches, ctx) => {
    const sub = pos[0] ? pos[0].toLowerCase() : 'a';
    const sub2 = pos[1] ? pos[1].toLowerCase() : '';

    if (sub === 'a' || sub === 'addr' || sub === 'address') {
      const ip = ctx.network.ipv4;
      const mac = ctx.network.mac.toLowerCase().replace(/-/g, ':');
      return {
        error: false,
        text: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host 
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000
    link/ether ${mac} brd ff:ff:ff:ff:ff:ff
    inet ${ip}/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86320sec preferred_lft 86320sec
    inet6 fe80::215:5dff:fe8b:3a9f/64 scope link 
       valid_lft forever preferred_lft forever`,
      };
    }

    if (sub === 'r' || sub === 'route') {
      const gw = ctx.network.defaultGateway;
      return {
        error: false,
        text: `default via ${gw} dev eth0 proto dhcp src ${ctx.network.ipv4} metric 100 
192.168.1.0/24 dev eth0 proto kernel scope link src ${ctx.network.ipv4} metric 100`,
      };
    }

    if (sub === 'link' || sub === 'l') {
      const mac = ctx.network.mac.toLowerCase().replace(/-/g, ':');
      return {
        error: false,
        text: `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN mode DEFAULT group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP mode DEFAULT group default qlen 1000\n    link/ether ${mac} brd ff:ff:ff:ff:ff:ff`,
      };
    }

    if (sub === 'neigh' || sub === 'neighbor') {
      return bashRegistry.arp(pos, flags, switches, ctx, '');
    }

    return { error: false, text: 'Usage: ip [ address | link | route | neigh ]' };
  },

  ifconfig: (pos, _flags, _switches, ctx) => {
    const ip = ctx.network.ipv4;
    const mac = ctx.network.mac.toLowerCase().replace(/-/g, ':');
    return {
      error: false,
      text: `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet ${ip}  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::215:5dff:fe8b:3a9f  prefixlen 64  scopeid 0x20<link>
        ether ${mac}  txqueuelen 1000  (Ethernet)
        RX packets 214582  bytes 184512902 (184.5 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 145920  bytes 19482104 (19.4 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 1240  bytes 98210 (98.2 KB)
        TX packets 1240  bytes 98210 (98.2 KB)`,
    };
  },

  ping: (pos) => {
    if (pos.length === 0) return { error: true, text: 'ping: usage error: Destination address required' };
    const dest = pos.filter((p) => !p.startsWith('-'))[0] || '8.8.8.8';
    return {
      error: false,
      text: `PING ${dest} (${dest}) 56(84) bytes of data.
64 bytes from ${dest}: icmp_seq=1 ttl=117 time=14.2 ms
64 bytes from ${dest}: icmp_seq=2 ttl=117 time=13.8 ms
64 bytes from ${dest}: icmp_seq=3 ttl=117 time=14.1 ms
64 bytes from ${dest}: icmp_seq=4 ttl=117 time=14.0 ms

--- ${dest} ping statistics ---
4 packets transmitted, 4 received, 0% packet loss, time 3004ms
rtt min/avg/max/mdev = 13.812/14.025/14.240/0.155 ms`,
    };
  },

  traceroute: (pos) => {
    if (pos.length === 0) return { error: true, text: 'Usage: traceroute [options] <host>' };
    const host = pos[0];
    return {
      error: false,
      text: `traceroute to ${host} (142.250.190.46), 30 hops max, 60 byte packets
 1  gateway (192.168.1.1)  1.214 ms  1.102 ms  0.985 ms
 2  10.240.0.1 (10.240.0.1)  4.312 ms  4.115 ms  4.021 ms
 3  isp-backbone.net (172.16.4.1)  8.415 ms  8.320 ms  8.125 ms
 4  dns.google (142.250.190.46)  13.912 ms  13.840 ms  13.782 ms`,
    };
  },

  tracepath: (pos) => bashRegistry.traceroute(pos, {}, [], {} as any, ''),

  netstat: (_pos, flags, switches) => {
    return {
      error: false,
      text: `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN     
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN     
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN     
tcp6       0      0 :::22                   :::*                    LISTEN     
tcp6       0      0 :::80                   :::*                    LISTEN     
udp        0      0 127.0.0.53:53           0.0.0.0:*                          
udp        0      0 0.0.0.0:68              0.0.0.0:*                          `,
    };
  },

  ss: () => {
    return {
      error: false,
      text: `Netid State  Recv-Q Send-Q   Local Address:Port   Peer Address:PortProcess
udp   UNCONN 0      0       127.0.0.53%lo:53           0.0.0.0:*      
tcp   LISTEN 0      128           0.0.0.0:22           0.0.0.0:*      
tcp   LISTEN 0      511           0.0.0.0:80           0.0.0.0:*      
tcp   LISTEN 0      128              [::]:22              [::]:*      
tcp   LISTEN 0      511              [::]:80              [::]:*      `,
    };
  },

  nslookup: (pos) => {
    if (pos.length === 0) return { error: true, text: 'usage: nslookup <domain>' };
    const domain = pos[0];
    return {
      error: false,
      text: `Server:         8.8.8.8
Address:        8.8.8.8#53

Non-authoritative answer:
Name:   ${domain}
Address: 142.250.190.46
Address: 2404:6800:4009:826::200e`,
    };
  },

  dig: (pos) => {
    const domain = pos[0] || 'example.com';
    return {
      error: false,
      text: `; <<>> DiG 9.18.18-0ubuntu0.22.04.1-Ubuntu <<>> ${domain}
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 48912
;; flags: qr rd ra; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;${domain}.                     IN      A

;; ANSWER SECTION:
${domain}.              300     IN      A       93.184.216.34

;; Query time: 14 msec
;; SERVER: 8.8.8.8#53(8.8.8.8) (UDP)`,
    };
  },

  curl: (pos, flags, switches) => {
    if (pos.length === 0) return { error: true, text: 'curl: try \'curl --help\' for more information' };
    const headOnly = flags['I'] || flags['head'] || switches.includes('I');
    const url = pos.filter((p) => !p.startsWith('-'))[0] || 'http://localhost';

    if (headOnly) {
      return {
        error: false,
        text: `HTTP/1.1 200 OK
Server: nginx/1.18.0 (Ubuntu)
Date: Tue, 08 Sep 2026 21:58:14 GMT
Content-Type: text/html
Content-Length: 612
Last-Modified: Tue, 08 Sep 2026 08:30:15 GMT
Connection: keep-alive
ETag: "612-5b9c02b1f8b80"
Accept-Ranges: bytes`,
      };
    }

    return {
      error: false,
      text: `<!DOCTYPE html>
<html>
<head>
<title>Welcome to SNA Lab!</title>
</head>
<body>
<h1>System & Network Administration Lab Server</h1>
<p>Nginx is running successfully on Linux (Ubuntu 22.04 LTS).</p>
</body>
</html>`,
    };
  },

  wget: (pos) => {
    if (pos.length === 0) return { error: true, text: 'wget: missing URL' };
    const url = pos[0];
    return {
      error: false,
      text: `--2026-09-08 21:58:20--  ${url}
Resolving ${url.replace(/^https?:\/\//, '').split('/')[0]}... 93.184.216.34
Connecting to 93.184.216.34:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1256 (1.2K) [text/html]
Saving to: ‘index.html’

index.html          100%[===================>]   1.23K  --.-KB/s    in 0.001s  

2026-09-08 21:58:21 (1.12 MB/s) - ‘index.html’ saved [1256/1256]`,
    };
  },

  ssh: (pos) => {
    if (pos.length === 0) return { error: true, text: 'usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-B bind_interface] [user@]hostname [command]' };
    const target = pos[0];
    return {
      error: false,
      text: `The authenticity of host '${target}' can't be established.
ECDSA key fingerprint is SHA256:7uG3YxPqL9nK+eR5sD2mB1vC8wZ0jT6h.
Connected to ${target} (Simulated SSH Session).
Welcome to Ubuntu 22.04.4 LTS (GNU/Linux 5.15.0-100-generic x86_64)`,
    };
  },

  scp: (pos) => {
    if (pos.length < 2) return { error: true, text: 'usage: scp [-346BCpqrTv] [-c cipher] source ... target' };
    return {
      error: false,
      text: `${pos[0]}                             100% 4096     4.0KB/s   00:00`,
    };
  },

  arp: (_pos, _flags, _switches, ctx) => {
    const lines = [
      'Address                  HWtype  HWaddress           Flags Mask            Iface',
    ];
    for (const entry of ctx.arpTable) {
      lines.push(`${entry.ip.padEnd(24)} ether   ${entry.mac.toLowerCase().replace(/-/g, ':')}   C                     eth0`);
    }
    return { error: false, text: lines.join('\n') };
  },

  ufw: (pos) => {
    const action = pos[0] || 'status';
    if (action === 'status') {
      return {
        error: false,
        text: `Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere                  
80/tcp                     ALLOW       Anywhere                  
443/tcp                    ALLOW       Anywhere                  
22/tcp (v6)                ALLOW       Anywhere (v6)             
80/tcp (v6)                ALLOW       Anywhere (v6)             `,
      };
    }
    if (action === 'enable') return { error: false, text: 'Firewall is active and enabled on system startup' };
    if (action === 'disable') return { error: false, text: 'Firewall stopped and disabled on system startup' };
    return { error: false, text: `Rule updated for ${pos.slice(1).join(' ')}` };
  },

  iptables: () => {
    return {
      error: false,
      text: `Chain INPUT (policy ACCEPT 1420 packets, 184K bytes)
 pkts bytes target     prot opt in     out     source               destination         
  842  110K ACCEPT     tcp  --  eth0   *       0.0.0.0/0            0.0.0.0/0            tcp dpt:22
  578 74000 ACCEPT     tcp  --  eth0   *       0.0.0.0/0            0.0.0.0/0            tcp dpt:80

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)

Chain OUTPUT (policy ACCEPT 1940 packets, 240K bytes)`,
    };
  },

  // ================= ADMINISTRATION & PACKAGE MANAGEMENT =================
  sudo: (pos, _flags, _switches, ctx, rawCmd, stdin) => {
    if (pos.length === 0) {
      return {
        error: true,
        text: 'usage: sudo -h | -K | -k | -V\nusage: sudo [-u user] command [args...]',
      };
    }
    const subLine = rawCmd.replace(/^\s*sudo\s+/, '');
    const parsedSub = parseBashCommandLine(subLine);
    const handler = bashRegistry[parsedSub.commandName.toLowerCase()];
    if (handler) {
      return handler(parsedSub.positional, parsedSub.flags, parsedSub.switches, ctx, subLine, stdin);
    }
    return {
      error: false,
      text: `[sudo] Executing ${parsedSub.commandName} with administrative root privileges...`,
    };
  },

  su: (pos) => {
    const user = pos[0]?.replace(/^-/, '') || 'root';
    return { error: false, text: `Switched user environment to ${user || 'root'} (simulated).` };
  },

  passwd: () => {
    return {
      error: false,
      text: 'Changing password for student.\nCurrent password: [hidden]\nNew password: [hidden]\nRetype new password: [hidden]\npasswd: password updated successfully',
    };
  },

  apt: (pos) => {
    const sub = pos[0] || '';
    if (sub === 'update') {
      return {
        error: false,
        text: `Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease
Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]
Get:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]
Fetched 229 kB in 1s (210 kB/s)
Reading package lists... Done
Building dependency tree... Done
All packages are up to date.`,
      };
    }
    if (sub === 'upgrade') {
      return {
        error: false,
        text: `Reading package lists... Done
Building dependency tree... Done
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`,
      };
    }
    if (sub === 'install') {
      const pkg = pos[1] || 'package';
      return {
        error: false,
        text: `Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  ${pkg}
0 upgraded, 1 newly installed, 0 to remove and 0 not upgraded.
Need to get 1,420 kB of archives.
Unpacking ${pkg} ...
Setting up ${pkg} ...
Processing triggers for man-db ...`,
      };
    }
    if (sub === 'list') {
      return {
        error: false,
        text: `bash/jammy 5.1.16-15ubuntu1 amd64 [installed]
curl/jammy-updates 7.81.0-1ubuntu1.15 amd64 [installed]
iproute2/jammy 5.15.0-1ubuntu2 amd64 [installed]
net-tools/jammy 1.60+git20181103.0eebece-1ubuntu5 amd64 [installed]
nginx/jammy 1.18.0-6ubuntu14.4 amd64 [installed]
openssh-server/jammy-updates 1:8.9p1-3ubuntu0.6 amd64 [installed]`,
      };
    }
    return {
      error: false,
      text: 'Usage: apt [ update | upgrade | install <pkg> | list | search <term> ]',
    };
  },

  'apt-get': (pos, flags, switches, ctx, rawCmd, stdin) => {
    return bashRegistry.apt(pos, flags, switches, ctx, rawCmd, stdin);
  },

  systemctl: (pos) => {
    const action = pos[0] || 'status';
    const unit = pos[1] || 'sshd';

    if (action === 'status') {
      return {
        error: false,
        text: `● ${unit}.service - OpenBSD Secure Shell server
     Loaded: loaded (/lib/systemd/system/${unit}.service; enabled; vendor preset: enabled)
     Active: active (running) since Tue 2026-09-08 08:30:14 UTC; 13h ago
       Docs: man:${unit}(8)
             man:${unit}_config(5)
   Main PID: 120 (${unit})
      Tasks: 1 (limit: 4668)
     Memory: 4.8M
        CPU: 1.140s
     CGroup: /system.slice/${unit}.service
             └─120 /usr/sbin/${unit} -D`,
      };
    }

    if (action === 'start' || action === 'stop' || action === 'restart' || action === 'reload') {
      return { error: false, text: '' };
    }

    if (action === 'list-units') {
      return {
        error: false,
        text: `UNIT                   LOAD   ACTIVE SUB     DESCRIPTION
cron.service           loaded active running Regular background program processing daemon
nginx.service          loaded active running A high performance web server and reverse proxy
ssh.service            loaded active running OpenBSD Secure Shell server
systemd-journald.service loaded active running Journal Service
systemd-udevd.service  loaded active running Rule-based Manager for Device Events`,
      };
    }

    return { error: false, text: '' };
  },

  service: (pos) => {
    const unit = pos[0] || 'nginx';
    const action = pos[1] || 'status';
    return bashRegistry.systemctl([action, unit], {}, [], {} as any, '');
  },

  journalctl: (_pos, flags, switches) => {
    const lines = [
      '-- Boot 7e8e810362c7457cb141973b7543fa01 --',
      'Sep 08 08:30:12 sna25 kernel: Linux version 5.15.0-100-generic',
      'Sep 08 08:30:13 sna25 systemd[1]: Starting Network Time Synchronization...',
      'Sep 08 08:30:14 sna25 systemd[1]: Started OpenBSD Secure Shell server.',
      'Sep 08 08:30:15 sna25 systemd[1]: Started nginx - high performance web server.',
      'Sep 08 08:30:16 sna25 systemd[1]: Startup finished in 2.140s (kernel) + 3.120s (userspace) = 5.260s.',
    ];
    return { error: false, text: lines.join('\n') };
  },

  bash: (pos, _flags, _switches, ctx) => {
    if (pos.length > 0) {
      const vfsTarget = toVfsPath(pos[0], ctx.vfs.getCwd());
      const res = ctx.vfs.getNodeResult(vfsTarget);
      if (res && res.node.type === 'file') {
        return { error: false, text: `Executing script ${pos[0]}...\n${res.node.content || '[Done]'}` };
      }
      return { error: true, text: `bash: ${pos[0]}: No such file or directory` };
    }
    return { error: false, text: 'GNU bash, version 5.1.16(1)-release (x86_64-pc-linux-gnu)\nType "exit" to leave subshell.' };
  },

  sh: (pos, flags, switches, ctx, rawCmd, stdin) => {
    return bashRegistry.bash(pos, flags, switches, ctx, rawCmd, stdin);
  },

  explain: (pos, _flags, _switches, _ctx, rawCmd) => {
    const target = rawCmd ? rawCmd.replace(/^explain\s*/i, '').trim() : pos.join(' ');
    return { error: false, text: explainCommand(target, 'bash') };
  },
};
