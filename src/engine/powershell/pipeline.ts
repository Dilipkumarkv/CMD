import { LabContext } from '../context';
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
    this.register(['get-disk'], getDiskCmdlet);
    this.register(['get-volume'], getVolumeCmdlet);

    // Generic pipeline stages
    this.register(['where-object', 'where', '?'], whereObjectCmdlet);
    this.register(['sort-object', 'sort'], sortObjectCmdlet);
    this.register(['select-object', 'select'], selectObjectCmdlet);
  }

  public execute(rawInput: string, context: LabContext): PSCommandResult {
    let line = rawInput.trim();
    if (!line) {
      return { error: false, text: '' };
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

      const handler = this.registry.get(parsedStage.cmdlet.toLowerCase());
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
