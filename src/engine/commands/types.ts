import { LabContext } from '../context';

export interface CommandResult {
  error: boolean;
  text: string;
  clearScreen?: boolean;
}

export type CommandHandler = (
  args: string[],
  flags: Record<string, string | boolean>,
  switches: string[],
  context: LabContext,
  rawLine: string
) => CommandResult;

export type CommandRegistry = Record<string, CommandHandler>;
