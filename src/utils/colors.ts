export const cmdColorMap: Record<string, string> = {
  '0': '#0c0c0c',
  '1': '#0037DA',
  '2': '#13A10E',
  '3': '#3A96DD',
  '4': '#C50F1F',
  '5': '#881798',
  '6': '#C19C00',
  '7': '#CCCCCC',
  '8': '#767676',
  '9': '#3B78FF',
  'A': '#16C60C',
  'B': '#61D6D6',
  'C': '#E74856',
  'D': '#B4009E',
  'E': '#F9F1A5',
  'F': '#F2F2F2',
};

export function getTerminalColors(
  terminalColor: string | null,
  isPS: boolean
): { bg: string | undefined; fg: string | undefined } {
  if (terminalColor && terminalColor.length === 2) {
    const bgChar = terminalColor[0].toUpperCase();
    const fgChar = terminalColor[1].toUpperCase();
    return {
      bg: cmdColorMap[bgChar],
      fg: cmdColorMap[fgChar],
    };
  }

  return { bg: undefined, fg: undefined };
}
