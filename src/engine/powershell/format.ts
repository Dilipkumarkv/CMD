import { PSFileInfo, PSLocalUser, PSProcess, PSService } from './types';

export function formatPSOutput(data: any, customDirectoryHeader?: string): string {
  if (data === undefined || data === null) {
    return '';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  if (!Array.isArray(data)) {
    data = [data];
  }

  if (data.length === 0) {
    return '';
  }

  // If array of primitives / strings
  if (typeof data[0] !== 'object' || data[0] === null) {
    return data.map(String).join('\n');
  }

  const sample = data[0];

  // Specific format for PSProcess
  if (sample._type === 'Process' || ('ProcessName' in sample && 'CPU' in sample)) {
    return formatProcessTable(data as PSProcess[]);
  }

  // Specific format for PSFileInfo
  if (sample._type === 'FileInfo' || sample._type === 'DirectoryInfo' || ('Mode' in sample && 'LastWriteTime' in sample)) {
    return formatFileInfoTable(data as PSFileInfo[], customDirectoryHeader);
  }

  // Specific format for PSService
  if (sample._type === 'ServiceController' || ('Status' in sample && 'DisplayName' in sample)) {
    return formatServiceTable(data as PSService[]);
  }

  // Specific format for PSLocalUser
  if (sample._type === 'LocalUser' || ('Name' in sample && 'Enabled' in sample && 'Description' in sample)) {
    return formatLocalUserTable(data as PSLocalUser[]);
  }

  // Generic object table
  return formatGenericTable(data);
}

function formatProcessTable(procs: PSProcess[]): string {
  const lines: string[] = [
    `Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName`,
    `-------  ------    -----      -----     ------     --  -- -----------`,
  ];

  for (const p of procs) {
    const handles = String(p.Handles ?? 0).padStart(7, ' ');
    const npm = String(p.NPM ?? 0).padStart(7, ' ');
    const pm = String(p.PM ?? 0).padStart(8, ' ');
    const ws = String(p.WS ?? 0).padStart(10, ' ');
    const cpu = (p.CPU ?? 0).toFixed(2).padStart(10, ' ');
    const id = String(p.Id ?? 0).padStart(6, ' ');
    const si = String(p.SI ?? 0).padStart(3, ' ');
    const name = p.ProcessName || '';

    lines.push(`${handles} ${npm} ${pm} ${ws} ${cpu} ${id} ${si} ${name}`);
  }

  return lines.join('\n');
}

function formatFileInfoTable(items: PSFileInfo[], dirHeader?: string): string {
  const lines: string[] = [];
  if (dirHeader) {
    lines.push(`    Directory: ${dirHeader}\n`);
  }

  lines.push(`Mode     LastWriteTime          Length Name`);
  lines.push(`----     -------------          ------ ----`);

  for (const item of items) {
    const mode = (item.Mode || '------').padEnd(6, ' ');
    const time = (item.LastWriteTime || '').padEnd(20, ' ');
    const len = (item.Length !== '' && item.Length !== undefined ? String(item.Length) : '').padStart(8, ' ');
    const name = item.Name || '';

    lines.push(`${mode}   ${time}   ${len} ${name}`);
  }

  return lines.join('\n');
}

function formatServiceTable(services: PSService[]): string {
  const lines: string[] = [
    `Status   Name               DisplayName`,
    `------   ----               -----------`,
  ];

  for (const s of services) {
    const status = s.Status.padEnd(8, ' ');
    const name = s.Name.padEnd(18, ' ');
    lines.push(`${status} ${name} ${s.DisplayName}`);
  }

  return lines.join('\n');
}

function formatLocalUserTable(users: PSLocalUser[]): string {
  const lines: string[] = [
    `Name               Enabled Description`,
    `----               ------- -----------`,
  ];

  for (const u of users) {
    const name = u.Name.padEnd(18, ' ');
    const enabled = String(u.Enabled).padEnd(7, ' ');
    lines.push(`${name} ${enabled} ${u.Description}`);
  }

  return lines.join('\n');
}

function formatGenericTable(items: Record<string, any>[]): string {
  if (items.length === 0) return '';

  // Get keys excluding internal properties starting with _
  const allKeys = Array.from(
    new Set(
      items.flatMap((obj) => Object.keys(obj).filter((k) => !k.startsWith('_')))
    )
  );

  if (allKeys.length === 0) return '';

  // Calculate column widths
  const colWidths: Record<string, number> = {};
  for (const key of allKeys) {
    let max = key.length;
    for (const item of items) {
      const valStr = String(item[key] ?? '');
      if (valStr.length > max) max = valStr.length;
    }
    colWidths[key] = Math.max(max, 4);
  }

  const header = allKeys.map((k) => k.padEnd(colWidths[k], ' ')).join('  ');
  const divider = allKeys.map((k) => '-'.repeat(colWidths[k])).join('  ');

  const lines = [header, divider];
  for (const item of items) {
    const row = allKeys
      .map((k) => String(item[k] ?? '').padEnd(colWidths[k], ' '))
      .join('  ');
    lines.push(row);
  }

  return lines.join('\n');
}
