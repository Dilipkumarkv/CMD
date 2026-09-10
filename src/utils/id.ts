/**
 * High-precision, collision-free terminal entry ID generator.
 * Combines prefix, timestamp, monotonic sequence counter, and random entropy
 * to guarantee strict uniqueness even during rapid automated or pasted command bursts.
 */
let globalIdCounter = 0;

export function generateTerminalEntryId(
  prefix: 'in' | 'out' | 'err' | 'init' | 'reset' | 'info' = 'in'
): string {
  globalIdCounter = (globalIdCounter + 1) % 10000000;
  const rand = Math.random().toString(36).substring(2, 7);
  return `${prefix}-${Date.now()}-${globalIdCounter}-${rand}`;
}
