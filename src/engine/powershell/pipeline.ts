import { LabContext } from '../context';
import { defaultRegistry } from '../commands/registry';
import { ipconfigCommand } from '../commands/network-commands';
import { diskpartCommand } from '../commands/syllabus-commands';
import {
  addContentCmdlet,
  clearHostCmdlet,
  copyItemCmdlet,
  getChildItemCmdlet,
  getContentCmdlet,
  getDateCmdlet,
  getDiskCmdlet,
  getHelpCmdlet,
  getLocalUserCmdlet,
  getLocationCmdlet,
  getNetAdapterCmdlet,
  getNetIPAddressCmdlet,
  getProcessCmdlet,
  getServiceCmdlet,
  getVMCmdlet,
  getVMSwitchCmdlet,
  getVolumeCmdlet,
  getVpnConnectionCmdlet,
  moveItemCmdlet,
  newLocalUserCmdlet,
  newItemCmdlet,
  removeItemCmdlet,
  removeLocalUserCmdlet,
  renameItemCmdlet,
  selectObjectCmdlet,
  setContentCmdlet,
  setLocationCmdlet,
  sortObjectCmdlet,
  startServiceCmdlet,
  stopProcessCmdlet,
  stopServiceCmdlet,
  testConnectionCmdlet,
  testNetConnectionCmdlet,
  whereObjectCmdlet,
  writeHostCmdlet,
  writeOutputCmdlet,
} from './cmdlets';
import { formatPSOutput } from './format';
import { splitPipeline, substituteVariables, tokenizeStage } from './parser';
import { PSCmdletHandler, PSCommandResult } from './types';

export class PowerShellEngine {
  private registry: Map<string, PSCmdletHandler> = new Map();

  constructor() {
    this.registerDefaults();
  }

  public register(names: string[], handler: PSCmdletHandler): void {
    for (const name of names) {
      this.registry.set(name.toLowerCase(), handler);
    }
  }

  private registerDefaults(): void {
    this.register(['get-childitem', 'gci', 'ls', 'dir'], getChildItemCmdlet);
    this.register(['set-location', 'sl', 'cd', 'chdir'], setLocationCmdlet);
    this.register(['get-location', 'gl', 'pwd'], getLocationCmdlet);
    this.register(['new-item', 'ni'], newItemCmdlet);
    this.register(['remove-item', 'ri', 'rm', 'rmdir', 'del', 'erase', 'rd'], removeItemCmdlet);
    this.register(['copy-item', 'ci', 'cp', 'copy'], copyItemCmdlet);
    this.register(['move-item', 'mi', 'mv', 'move'], moveItemCmdlet);
    this.register(['rename-item', 'rni', 'ren'], renameItemCmdlet);
    this.register(['get-content', 'gc', 'cat', 'type'], getContentCmdlet);
    this.register(['set-content', 'sc'], setContentCmdlet);
    this.register(['add-content', 'ac'], addContentCmdlet);
    this.register(['clear-host', 'clear', 'cls'], clearHostCmdlet);
    this.register(['write-output', 'echo', 'write'], writeOutputCmdlet);
    this.register(['write-host'], writeHostCmdlet);
    this.register(['get-process', 'ps', 'gps'], getProcessCmdlet);
    this.register(['stop-process', 'spps', 'kill'], stopProcessCmdlet);
    this.register(['get-service', 'gsv'], getServiceCmdlet);
    this.register(['start-service', 'sasv'], startServiceCmdlet);
    this.register(['stop-service', 'spsv'], stopServiceCmdlet);
    this.register(['new-localuser'], newLocalUserCmdlet);
    this.register(['get-localuser'], getLocalUserCmdlet);
    this.register(['remove-localuser'], removeLocalUserCmdlet);
    this.register(['test-connection', 'ping'], testConnectionCmdlet);
    this.register(['get-date'], getDateCmdlet);
    this.register(['get-help', 'help'], getHelpCmdlet);

    // Week 8, 10, 11 PowerShell Cmdlets
    this.register(['get-netipaddress'], getNetIPAddressCmdlet);
    this.register(['get-netadapter'], getNetAdapterCmdlet);
    this.register(['test-netconnection', 'tnc'], testNetConnectionCmdlet);
    this.register(['get-vm'], getVMCmdlet);
    this.register(['get-vmswitch'], getVMSwitchCmdlet);
    this.register(['get-vpnconnection'], getVpnConnectionCmdlet);
    this.register(['get-disk', 'list-disk', 'gdisk'], getDiskCmdlet);
    this.register(['get-volume', 'list-volume', 'gvol'], getVolumeCmdlet);

    // Support "list disk", "list volume", "diskpart" in PowerShell
    const listCmdlet: PSCmdletHandler = (stage, { context }) => {
      const target = (stage.positional[0] || '').toLowerCase();
      if (target === 'disk' || target === 'disks') {
        return getDiskCmdlet(stage, { context });
      }
      if (target === 'volume' || target === 'volumes' || target === 'vol' || target === 'v') {
        return getVolumeCmdlet(stage, { context });
      }
      if (target === 'partition' || target === 'partitions' || target === 'part') {
        const cur = context.disks.find((d) => d.diskNum === context.selectedDiskIndex) || context.disks[0];
        return cur.partitions.map((p) => ({
          PartitionNumber: p.partNum,
          Type: p.type,
          Size: `${p.sizeGB} GB`,
          Offset: `${Math.round(p.offsetKB / 1024)} MB`,
          _type: 'Partition',
        }));
      }
      return [
        { Command: 'list disk', Description: 'Display a list of storage disks' },
        { Command: 'list volume', Description: 'Display a list of storage volumes' },
        { Command: 'list partition', Description: 'Display a list of disk partitions' },
      ];
    };
    this.register(['list'], listCmdlet);

    const diskpartCmdlet: PSCmdletHandler = (stage, { context }) => {
      const res = diskpartCommand(stage.positional, stage.named, [], context, stage.raw);
      return res.text;
    };
    this.register(['diskpart'], diskpartCmdlet);

    // ipconfig handler in PowerShell
    const ipconfigCmdlet: PSCmdletHandler = (stage, { context }) => {
      const allArgs = [
        ...stage.positional,
        ...Object.keys(stage.named),
        ...Object.entries(stage.named).map(([k, v]) => `-${k}:${v}`),
      ];
      const rawLower = allArgs.join(' ').toLowerCase();
      const isAll = Boolean(
        stage.named['all'] ||
        stage.named['a'] ||
        rawLower.includes('/all') ||
        rawLower.includes('-all') ||
        rawLower.includes('all')
      );
      const isFlush = Boolean(
        stage.named['flushdns'] ||
        stage.named['flush'] ||
        rawLower.includes('/flushdns') ||
        rawLower.includes('-flushdns') ||
        rawLower.includes('flushdns')
      );
      const isRelease = Boolean(
        stage.named['release'] ||
        rawLower.includes('/release') ||
        rawLower.includes('-release') ||
        rawLower.includes('release')
      );
      const isRenew = Boolean(
        stage.named['renew'] ||
        rawLower.includes('/renew') ||
        rawLower.includes('-renew') ||
        rawLower.includes('renew')
      );

      const flags: Record<string, string | boolean> = {};
      if (isAll) flags['all'] = true;
      if (isFlush) flags['flushdns'] = true;
      if (isRelease) flags['release'] = true;
      if (isRenew) flags['renew'] = true;

      const switches = [
        ...(isAll ? ['/all'] : []),
        ...(isFlush ? ['/flushdns'] : []),
        ...(isRelease ? ['/release'] : []),
        ...(isRenew ? ['/renew'] : []),
      ];

      const res = ipconfigCommand(stage.positional, flags, switches, context, stage.raw);
      return res.text;
    };
    this.register(['ipconfig', 'ipconfig.exe'], ipconfigCmdlet);

    // Generic pipeline stages
    this.register(['where-object', 'where', '?'], whereObjectCmdlet);
    this.register(['sort-object', 'sort'], sortObjectCmdlet);
    this.register(['select-object', 'select'], selectObjectCmdlet);
  }

  public execute(rawInput: string, context: LabContext): PSCommandResult {
    let line = rawInput.trim();
    if (!line) {
      if (context.inDiskPart === 'ps') {
        return { error: false, text: 'DISKPART>' }; // Will be intercepted by diskpartCommand if sent
      }
      return { error: false, text: '' };
    }

    if (context.inDiskPart === 'ps') {
      const tokens = tokenizeStage(line);
      try {
        const res = diskpartCommand(tokens.positional, tokens.named, [], context, tokens.raw);
        return {
          error: res.error,
          text: res.text,
        };
      } catch (e: any) {
        return { error: true, text: `Diskpart encountered an error: ${e.message}` };
      }
    }

    // 1. Handle variable assignment: $var = <expression / pipeline>
    const assignMatch = line.match(/^\$([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
    if (assignMatch) {
      const varName = assignMatch[1].toLowerCase();
      let rightSide = assignMatch[2].trim();

      // Check if string literal
      if (
        (rightSide.startsWith('"') && rightSide.endsWith('"')) ||
        (rightSide.startsWith("'") && rightSide.endsWith("'"))
      ) {
        context.psVariables.set(varName, rightSide.slice(1, -1));
        return { error: false, text: '' };
      }

      // Check if numeric literal
      if (!isNaN(Number(rightSide))) {
        context.psVariables.set(varName, Number(rightSide));
        return { error: false, text: '' };
      }

      // Otherwise execute rightSide as pipeline and capture the structured objects or output
      const evaluated = this.executePipeline(rightSide, context);
      if (evaluated.error) {
        return evaluated;
      }
      context.psVariables.set(varName, evaluated.objects ?? evaluated.text);
      return { error: false, text: '' };
    }

    // 2. Perform variable substitution for non-assignment lines
    line = substituteVariables(line, context.psVariables);

    // 3. Execute pipeline
    return this.executePipeline(line, context);
  }

  private executePipeline(line: string, context: LabContext): PSCommandResult {
    const stageStrings = splitPipeline(line);
    if (stageStrings.length === 0) {
      return { error: false, text: '' };
    }

    let pipelineData: any = undefined;
    let lastResultWasClearScreen = false;

    for (let i = 0; i < stageStrings.length; i++) {
      const stageStr = stageStrings[i];
      const parsedStage = tokenizeStage(stageStr);

      if (!parsedStage.cmdlet) {
        continue;
      }

      let handler = this.registry.get(parsedStage.cmdlet.toLowerCase());
      if (!handler) {
        // Fallback to defaultRegistry for standard Windows commands (e.g., ping, netstat, nslookup, tasklist, etc.)
        const cleanName = parsedStage.cmdlet.toLowerCase().replace(/\.exe$/i, '');
        const fallbackCmd = defaultRegistry[cleanName];
        if (fallbackCmd) {
          handler = (stage, { context: ctx }) => {
            const rawSwitches = stage.positional.filter((p) => p.startsWith('/') || p.startsWith('-'));
            const cleanPos = stage.positional.filter((p) => !p.startsWith('/') && !p.startsWith('-'));
            const res = fallbackCmd(cleanPos, stage.named, rawSwitches, ctx, stage.raw);
            return res.text;
          };
        }
      }

      if (!handler) {
        return {
          error: true,
          text: `${parsedStage.cmdlet} : The term '${parsedStage.cmdlet}' is not recognized as the name of a cmdlet, function, script file, or operable program.\nCheck the spelling of the name, or if a path was included, verify that the path is correct and try again.`,
        };
      }

      const stageResult = handler(parsedStage, {
        context,
        pipelineInput: Array.isArray(pipelineData) ? pipelineData : pipelineData !== undefined ? [pipelineData] : undefined,
      });

      // Check if error object returned
      if (
        stageResult &&
        typeof stageResult === 'object' &&
        !Array.isArray(stageResult) &&
        'error' in stageResult &&
        stageResult.error
      ) {
        return {
          error: true,
          text: stageResult.text || '',
        };
      }

      if (
        stageResult &&
        typeof stageResult === 'object' &&
        !Array.isArray(stageResult) &&
        'clearScreen' in stageResult &&
        stageResult.clearScreen
      ) {
        lastResultWasClearScreen = true;
      }

      pipelineData = stageResult;
    }

    if (lastResultWasClearScreen) {
      return { error: false, text: '', clearScreen: true };
    }

    // Format final output
    const isGCI = stageStrings[stageStrings.length - 1].toLowerCase().includes('get-childitem') ||
                 stageStrings[stageStrings.length - 1].toLowerCase().includes('gci') ||
                 stageStrings[stageStrings.length - 1].toLowerCase().includes('ls') ||
                 stageStrings[stageStrings.length - 1].toLowerCase().includes('dir');

    const dirHeader = isGCI ? context.vfs.getCwd() : undefined;
    const formattedText = formatPSOutput(pipelineData, dirHeader);

    return {
      error: false,
      text: formattedText,
      objects: Array.isArray(pipelineData) ? pipelineData : undefined,
    };
  }
}

export const defaultPSEngine = new PowerShellEngine();
