import { LabContext } from '../context';

export interface PSProcess {
  Handles: number;
  NPM: number;
  PM: number;
  WS: number;
  CPU: number;
  Id: number;
  SI: number;
  ProcessName: string;
  _type: 'Process';
}

export interface PSFileInfo {
  Mode: string;
  LastWriteTime: string;
  Length: number | string;
  Name: string;
  FullName: string;
  Extension: string;
  _type: 'FileInfo' | 'DirectoryInfo';
}

export interface PSService {
  Status: string;
  Name: string;
  DisplayName: string;
  _type: 'ServiceController';
}

export interface PSLocalUser {
  Name: string;
  Enabled: boolean;
  Description: string;
  _type: 'LocalUser';
}

export interface ParsedStage {
  raw: string;
  cmdlet: string;
  positional: string[];
  named: Record<string, any>;
  scriptBlock?: string; // e.g. "$_.CPU -gt 1"
}

export interface PSCmdletContext {
  context: LabContext;
  pipelineInput?: any[];
}

export type PSCmdletHandler = (
  stage: ParsedStage,
  ctx: PSCmdletContext
) => any[] | string | { text: string; error?: boolean; clearScreen?: boolean };

export interface PSCommandResult {
  error: boolean;
  text: string;
  objects?: any[];
  clearScreen?: boolean;
}
