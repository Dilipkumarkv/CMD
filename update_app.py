import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Re-add the vanishing state logic
old_switch = """  const handleSwitchMode = (newMode: ShellMode) => {
    if (newMode === shellMode) return;
    setShellMode(newMode);
    setCurrentPrompt(getPromptString(labContext, newMode));
    
    setEntries((prev) => [
      ...prev,
      {
        id: `switch-${Date.now()}`,
        type: 'system',
        shell: newMode,
        output: `[System]: Switched to ${newMode === 'ps' ? 'PowerShell' : newMode === 'bash' ? 'Bash' : 'CMD'}.`,
        timestamp: Date.now(),
      }
    ]);
  };"""

new_switch = """  const handleSwitchMode = (newMode: ShellMode) => {
    if (newMode === shellMode) return;
    setShellMode(newMode);
    setCurrentPrompt(getPromptString(labContext, newMode));
    setToastMessage(`Switched to ${newMode === 'ps' ? 'PowerShell' : newMode === 'bash' ? 'Bash' : 'CMD'}`);
  };"""

content = content.replace(old_switch, new_switch)

old_jsx_toast = """      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div className="bg-[#18181b] border border-white/10 text-white px-4 py-2 rounded-lg shadow-xl text-sm font-semibold tracking-wide flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {toastMessage}
          </div>
        </div>
      )}"""

new_jsx_toast = """      {/* Vanishing strip below terminal selection */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="w-full bg-[#1e293b]/80 border-b border-white/5 text-sky-200/90 text-xs font-mono px-3 py-1.5 flex items-center justify-center overflow-hidden shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              {toastMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>"""

content = content.replace(old_jsx_toast, new_jsx_toast)

# Check if AnimatePresence is imported
if "AnimatePresence" not in content:
    content = content.replace("import { motion } from 'framer-motion';", "import { motion, AnimatePresence } from 'framer-motion';")

with open('src/App.tsx', 'w') as f:
    f.write(content)
print("Updated App.tsx")
