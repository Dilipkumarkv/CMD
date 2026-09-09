import re

with open('src/components/ShellHeader.tsx', 'r') as f:
    content = f.read()

# Update title
content = content.replace('desktop-sna25', 'Omni-Term')

# Update icons import
old_imports = "import { BookOpen, HardDrive, RotateCcw, Terminal, WifiOff } from 'lucide-react';"
new_imports = "import { BookOpen, HardDrive, RotateCcw, Terminal, TerminalSquare, FileCode2, WifiOff } from 'lucide-react';"
content = content.replace(old_imports, new_imports)

old_segment = """      {/* Mode Switcher Segmented Control */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-4 border-b border-transparent w-full sm:w-auto relative px-1">
          <button
            type="button"
            onClick={() => onSwitchMode('cmd')}
            className={`relative pb-1.5 text-xs font-mono font-medium transition-colors duration-200 ${
              isCMD
                ? 'text-emerald-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {isCMD && (
              <motion.div
                layoutId="active-mode-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-1.5">
              <span>CMD</span>
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => onSwitchMode('ps')}
            className={`relative pb-1.5 text-xs font-mono font-medium transition-colors duration-200 ${
              isPS
                ? 'text-sky-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {isPS && (
              <motion.div
                layoutId="active-mode-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-1.5">
              <span>PowerShell</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSwitchMode('bash')}
            className={`relative pb-1.5 text-xs font-mono font-medium transition-colors duration-200 ${
              isBash
                ? 'text-fuchsia-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {isBash && (
              <motion.div
                layoutId="active-mode-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-1.5">
              <span>Bash</span>
            </span>
          </button>
        </div>"""

new_segment = """      {/* Mode Switcher Segmented Control */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center w-full relative px-1 mt-1">
          <button
            type="button"
            onClick={() => onSwitchMode('cmd')}
            className={`relative flex-1 flex justify-center pb-2 text-xs font-mono font-medium transition-colors duration-200 ${
              isCMD
                ? 'text-emerald-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {isCMD && (
              <motion.div
                layoutId="active-mode-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-2">
              <TerminalSquare className="w-3.5 h-3.5" />
              <span>CMD</span>
            </span>
          </button>
          
          <div className="w-px h-4 bg-white/10 shrink-0 self-center mb-1.5" />

          <button
            type="button"
            onClick={() => onSwitchMode('ps')}
            className={`relative flex-1 flex justify-center pb-2 text-xs font-mono font-medium transition-colors duration-200 ${
              isPS
                ? 'text-sky-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {isPS && (
              <motion.div
                layoutId="active-mode-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)]"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PowerShell</span>
              <span className="inline sm:hidden">PS</span>
            </span>
          </button>

          <div className="w-px h-4 bg-white/10 shrink-0 self-center mb-1.5" />

          <button
            type="button"
            onClick={() => onSwitchMode('bash')}
            className={`relative flex-1 flex justify-center pb-2 text-xs font-mono font-medium transition-colors duration-200 ${
              isBash
                ? 'text-fuchsia-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {isBash && (
              <motion.div
                layoutId="active-mode-underline"
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-fuchsia-500 shadow-[0_0_8px_rgba(217,70,239,0.8)]"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.2 }}
              />
            )}
            <span className="relative z-20 flex items-center gap-2">
              <FileCode2 className="w-3.5 h-3.5" />
              <span>Bash</span>
            </span>
          </button>
        </div>"""

content = content.replace(old_segment, new_segment)

with open('src/components/ShellHeader.tsx', 'w') as f:
    f.write(content)
print("Updated ShellHeader.tsx")
