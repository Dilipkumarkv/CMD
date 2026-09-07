import { VirtualFileSystem } from './vfs';

export interface TestResult {
  step: string;
  command: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: any;
}

export function runVfsFoundationTests(): { transcript: string; results: TestResult[] } {
  const lines: string[] = [];
  const results: TestResult[] = [];

  const log = (msg: string = '') => {
    lines.push(msg);
  };

  log('=== SNA TERMINAL LAB: PHASE 1 FOUNDATION TEST SUITE ===');
  log(`Timestamp: ${new Date().toISOString()}`);
  log('Testing Virtual Filesystem (VFS) Tree, Path Resolution, and Node Lookup\n');

  const vfs = new VirtualFileSystem();

  // Test 1: Initial State & CWD
  log('[TEST 1] Initial Working Directory & Seed Layout Check');
  const initialCwd = vfs.getCwd();
  log(`Current Working Directory: ${initialCwd}`);
  const pass1 = initialCwd === 'C:\\Users\\Student';
  results.push({
    step: '1. Initial CWD',
    command: 'vfs.getCwd()',
    expected: 'C:\\Users\\Student',
    actual: initialCwd,
    passed: pass1,
  });
  log(`Result: ${pass1 ? 'PASS' : 'FAIL'}\n`);

  // Test 2: Seed Verification
  log('[TEST 2] Verifying Seeded Nodes');
  const seedPaths = [
    'C:\\Windows\\System32',
    'C:\\Windows\\System32\\cmd.exe',
    'C:\\Windows\\System32\\drivers\\etc\\hosts',
    'C:\\Program Files',
    'C:\\Users\\Student\\Desktop',
    'C:\\Users\\Student\\Documents\\notes.txt',
    'C:\\Users\\Student\\Downloads',
  ];

  for (const p of seedPaths) {
    const res = vfs.getNodeResult(p);
    const ok = res !== null;
    log(`Lookup '${p}' -> ${ok ? `FOUND [${res?.node.type}] (Canonical: ${res?.canonicalPath})` : 'NOT FOUND'}`);
    results.push({
      step: `2. Seed Check: ${p}`,
      command: `vfs.getNodeResult("${p}")`,
      expected: 'Found',
      actual: ok ? `${res?.node.type}: ${res?.canonicalPath}` : 'null',
      passed: ok,
    });
  }
  log('');

  // Test 3: Tree Manipulation (Creating nested folders and files)
  log('[TEST 3] Directly Manipulating Tree (Creating Nested Directories & Files)');
  log('1. Creating directory: "LabProjects\\Module1" relative to CWD (C:\\Users\\Student)');
  const d1 = vfs.createDirectory('LabProjects');
  const d2 = vfs.createDirectory('LabProjects\\Module1');
  log(`   Created LabProjects: ${d1}, LabProjects\\Module1: ${d2}`);

  log('2. Creating file: "LabProjects\\Module1\\net_config.ini"');
  const f1 = vfs.createFile(
    'LabProjects\\Module1\\net_config.ini',
    '[Interface]\nIPAddress=192.168.10.15\nGateway=192.168.10.1\nDNS=8.8.8.8',
    { readonly: false, archive: true }
  );
  log(`   Created net_config.ini: ${f1}`);

  log('3. Creating root folder & file: "C:\\SharedData\\Submissions\\exam.docx"');
  vfs.createDirectory('C:\\SharedData');
  vfs.createDirectory('C:\\SharedData\\Submissions');
  const f2 = vfs.createFile(
    'C:\\SharedData\\Submissions\\exam.docx',
    '[Document Data: 25CS34I Exam Paper]',
    { readonly: true, encrypted: true }
  );
  log(`   Created exam.docx with attributes: readonly=true, encrypted=true`);

  log('4. Creating Desktop shortcut file: "Desktop\\LabInstructions.txt"');
  vfs.createFile('Desktop\\LabInstructions.txt', 'Lab Exercise 1: Basic CLI & File Management');
  log('');

  // Test 4: Path Resolution & Case-Insensitive Node Lookup
  log('[TEST 4] Path Resolution & Case-Insensitive Node Fetching');

  const testCases = [
    {
      label: 'Relative file under current directory',
      input: 'Documents\\notes.txt',
      expectedPath: 'C:\\Users\\Student\\Documents\\notes.txt',
      expectFound: true,
    },
    {
      label: 'Mixed forward-slashes and inverted casing',
      input: 'documents/NOTES.TXT',
      expectedPath: 'C:\\Users\\Student\\Documents\\notes.txt',
      expectFound: true,
    },
    {
      label: 'Relative dot traversal (self . and parent ..)',
      input: '.\\LabProjects\\..\\LabProjects/Module1/./net_config.ini',
      expectedPath: 'C:\\Users\\Student\\LabProjects\\Module1\\net_config.ini',
      expectFound: true,
    },
    {
      label: 'Parent traversal exiting Student and Users to Windows System32',
      input: '..\\..\\Windows\\System32\\cmd.exe',
      expectedPath: 'C:\\Windows\\System32\\cmd.exe',
      expectFound: true,
    },
    {
      label: 'Deep parent traversal mixed with lowercase and forward slashes',
      input: '../../windows/system32/drivers/etc/hosts',
      expectedPath: 'C:\\Windows\\System32\\drivers\\etc\\hosts',
      expectFound: true,
    },
    {
      label: 'Bare drive-rooted path (starts with backslash)',
      input: '\\SharedData\\Submissions\\exam.docx',
      expectedPath: 'C:\\SharedData\\Submissions\\exam.docx',
      expectFound: true,
    },
    {
      label: 'Bare drive-rooted path with forward slash',
      input: '/Program Files/Common Files',
      expectedPath: 'C:\\Program Files\\Common Files',
      expectFound: true,
    },
    {
      label: 'Fully qualified path with lowercase drive letter and mixed slashes',
      input: 'c:/shareddata/submissions/exam.docx',
      expectedPath: 'C:\\SharedData\\Submissions\\exam.docx',
      expectFound: true,
    },
    {
      label: 'Parent traversal at root limit (cannot escape drive root)',
      input: '..\\..\\..\\..\\..\\..\\Windows',
      expectedPath: 'C:\\Windows',
      expectFound: true,
    },
    {
      label: 'Drive root path alone (\\)',
      input: '\\',
      expectedPath: 'C:\\',
      expectFound: true,
    },
    {
      label: 'Non-existent target path',
      input: 'Documents\\DoesNotExist.log',
      expectedPath: 'C:\\Users\\Student\\Documents\\DoesNotExist.log',
      expectFound: false,
    },
  ];

  for (const tc of testCases) {
    const resolved = vfs.resolve(tc.input);
    const lookup = vfs.getNodeResult(tc.input);
    const found = lookup !== null;
    const pathMatch = resolved.toLowerCase() === tc.expectedPath.toLowerCase();
    const passed = pathMatch && found === tc.expectFound;

    log(`Scenario: ${tc.label}`);
    log(`  Input:         "${tc.input}"`);
    log(`  Resolved Path: ${resolved}`);
    if (found && lookup) {
      log(`  Canonical:     ${lookup.canonicalPath} [${lookup.node.type}]`);
      if (lookup.node.type === 'file') {
        const preview = lookup.node.content.replace(/\n/g, ' ').slice(0, 45);
        log(`  Content:       "${preview}..."`);
        log(`  Attributes:    ${JSON.stringify(lookup.node.attrs)}`);
      }
    } else {
      log(`  Node:          null (as expected for missing node: ${!tc.expectFound})`);
    }
    log(`  Status:        ${passed ? 'PASS' : 'FAIL'}\n`);

    results.push({
      step: tc.label,
      command: `vfs.getNodeResult("${tc.input}")`,
      expected: `${tc.expectedPath} (Found: ${tc.expectFound})`,
      actual: `${resolved} (Found: ${found}${lookup ? `, Canonical: ${lookup.canonicalPath}` : ''})`,
      passed,
    });
  }

  // Test 5: CWD State Change & Relative Traversal
  log('[TEST 5] Updating CWD State & Re-evaluating Relative Navigation');
  log('Action: Changing directory to "C:\\Windows\\System32"');
  const cdOk = vfs.setCwd('C:\\Windows\\System32');
  log(`vfs.setCwd("C:\\Windows\\System32") -> ${cdOk}`);
  log(`New CWD: ${vfs.getCwd()}`);

  const relFromWin = vfs.getNodeResult('drivers\\etc\\hosts');
  log(`Lookup relative "drivers\\etc\\hosts" from new CWD:`);
  log(`  Resolved: ${vfs.resolve('drivers\\etc\\hosts')}`);
  log(`  Node found: ${relFromWin !== null} (${relFromWin?.canonicalPath})`);
  const pass5 = vfs.getCwd() === 'C:\\Windows\\System32' && relFromWin !== null;
  results.push({
    step: '5. CWD Navigation State',
    command: 'vfs.setCwd("C:\\Windows\\System32") && vfs.getNodeResult("drivers\\etc\\hosts")',
    expected: 'C:\\Windows\\System32\\drivers\\etc\\hosts found',
    actual: `${vfs.getCwd()} -> ${relFromWin?.canonicalPath}`,
    passed: pass5,
  });
  log(`Status: ${pass5 ? 'PASS' : 'FAIL'}\n`);

  const allPassed = results.every((r) => r.passed);
  log('=======================================================');
  log(`SUMMARY: ${results.filter((r) => r.passed).length} / ${results.length} tests passed.`);
  log(`FINAL STATUS: ${allPassed ? 'ALL TESTS PASSED SUCCESSFULLY' : 'SOME TESTS FAILED'}`);
  log('=======================================================');

  return {
    transcript: lines.join('\n'),
    results,
  };
}
