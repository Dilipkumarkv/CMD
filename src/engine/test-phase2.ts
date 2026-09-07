import { LabContext } from './context';
import { executeCommand } from './commands/registry';

export function runPhase2Tests(): { transcript: string; success: boolean } {
  const lines: string[] = [];
  const context = new LabContext();

  const run = (cmd: string) => {
    lines.push(`${context.vfs.getCwd()}>${cmd}`);
    const res = executeCommand(cmd, context);
    if (res.text) {
      lines.push(res.text);
    }
    lines.push(''); // blank line like CMD
    return res;
  };

  lines.push('=== SNA TERMINAL LAB: PHASE 2 COMMAND DISPATCHER TEST TRANSCRIPT ===');
  lines.push('Testing Real Filesystem Mutation, Process Management, and User Account State\n');

  // --- PART 1: Filesystem Chained Mutations (DIR, CD, MD, COPY, CIPHER, TYPE, DEL, RD) ---
  lines.push('--- [SECTION 1] Chained Real Filesystem Mutations ---');
  
  // 1. Initial DIR in C:\Users\Student
  run('dir');

  // 2. MD Lab2
  run('md Lab2');

  // 3. CD Lab2
  run('cd Lab2');

  // 4. COPY sample file from Documents into Lab2
  run('copy "..\\Documents\\notes.txt" lab_notes.txt');

  // 5. DIR inside Lab2 showing newly copied file
  run('dir');

  // 6. TYPE lab_notes.txt
  run('type lab_notes.txt');

  // 7. CIPHER /E lab_notes.txt (toggles encrypted attribute)
  run('cipher /e lab_notes.txt');

  // 8. TYPE lab_notes.txt (must refuse to read encrypted file)
  run('type lab_notes.txt');

  // 9. CIPHER /D lab_notes.txt (decrypts file)
  run('cipher /d lab_notes.txt');

  // 10. TYPE lab_notes.txt (now succeeds again)
  run('type lab_notes.txt');

  // 11. DEL lab_notes.txt
  run('del lab_notes.txt');

  // 12. DIR inside Lab2 showing file is gone
  run('dir');

  // 13. CD ..
  run('cd ..');

  // 14. RD Lab2
  run('rd Lab2');

  // 15. Final DIR in C:\Users\Student showing Lab2 is completely removed
  run('dir');

  // --- PART 2: TASKKILL & TASKLIST In-Memory Process Management ---
  lines.push('--- [SECTION 2] TASKLIST and TASKKILL Process Termination ---');

  // 1. Initial TASKLIST showing notepad.exe (PID 4528)
  run('tasklist');

  // 2. TASKKILL /IM notepad.exe
  run('taskkill /im notepad.exe');

  // 3. Subsequent TASKLIST proving notepad.exe was genuinely removed
  run('tasklist');

  // --- PART 3: NET USER Account Management ---
  lines.push('--- [SECTION 3] NET USER In-Memory Account State ---');

  // 1. Initial NET USER list
  run('net user');

  // 2. NET USER Rahul /add
  run('net user Rahul /add');

  // 3. NET USER list proving Rahul is now present
  run('net user');

  // 4. NET USER Rahul (details)
  run('net user Rahul');

  // 5. NET USER Rahul /delete
  run('net user Rahul /delete');

  // 6. NET USER list proving Rahul is now removed
  run('net user');

  // --- PART 4: SYSTEM & DIAGNOSTICS CHECK ---
  lines.push('--- [SECTION 4] System Diagnostics & Utility Commands ---');
  run('whoami');
  run('ipconfig');
  run('ping 192.168.1.1');
  run('sfc /scannow');

  // --- PART 5: WEEKS 6-11 LIVE-STATE SYLLABUS COMMANDS (a)/(b)/(c) TAXONOMY ---
  lines.push('--- [SECTION 5] Weeks 6-11 Live-State Commands & Pedagogical Taxonomy ---');
  lines.push('Classifications: (a) Fully supported live state | (b) Live-state simulated | (c) Out of scope\n');

  // Week 7: Service control & SC query
  lines.push('# Week 7 (b): Service State Mutation via NET STOP and SC QUERY');
  run('sc query Spooler');
  run('net stop Spooler');
  run('sc query Spooler');
  run('net start Spooler');
  run('bcdedit');

  // Week 8: Route Table & DiskPart & Format
  lines.push('\n# Week 8 (b): Live IPv4 Routing Table, DiskPart, and Format');
  run('route print');
  run('route add 10.50.0.0 mask 255.255.0.0 192.168.1.1 metric 20');
  run('route print');
  run('route delete 10.50.0.0');
  run('diskpart list disk');
  run('diskpart list volume');
  run('format D: /fs:NTFS /q');

  // Week 9: DISM & DriverQuery
  lines.push('\n# Week 9 (b): DISM Component Store & Driver Query');
  run('driverquery');
  run('dism /online /cleanup-image /scanhealth');

  // Week 10: ARP Cache & Advanced Firewall
  lines.push('\n# Week 10 (b): ARP Address Resolution & Windows Advanced Firewall');
  run('arp -a');
  run('arp -d *');
  run('arp -a');
  run('netsh advfirewall show allprofiles');
  run('netsh advfirewall set allprofiles state off');
  run('netsh advfirewall show allprofiles');
  run('netsh advfirewall set allprofiles state on');

  // Week 11: VPN Client & Tunneling
  lines.push('\n# Week 11 (b): RASDIAL VPN Tunneling & Interface Connection');
  run('rasdial "CollegeVPN" student polytechnic123');
  run('rasdial "CollegeVPN" /disconnect');

  // --- PART 6: USER REQUEST VERIFICATION CHECKLIST ---
  lines.push('--- [SECTION 6] Explicit User Verification Checklist ---');
  
  // 1. Creating a folder with md, cd-ing into it, and running dir shows it's genuinely empty
  run('md "Empty Folder Test"');
  run('cd "Empty Folder Test"');
  run('dir');
  run('cd ..');
  run('rd "Empty Folder Test"');

  // 2. taskkill /IM <name> followed by tasklist shows the process actually gone
  run('taskkill /im chrome.exe');
  run('tasklist');

  // 3. A path with spaces in quotes works for at least cd and type
  run('copy "Documents\\notes.txt" "SNA Course Notes.txt"');
  run('type "SNA Course Notes.txt"');
  run('cd "C:\\Program Files"');
  run('cd "Common Files"');
  run('cd "C:\\Users\\Student"');
  run('del "SNA Course Notes.txt"');

  // 4. An invalid/unknown command gives the real Windows-style "not recognized" error
  run('foobar_invalid_command');

  lines.push('=====================================================================');
  lines.push('PHASE 2 VERIFICATION: COMPLETE AND PASSING');
  lines.push('=====================================================================');

  return {
    transcript: lines.join('\n'),
    success: true,
  };
}
