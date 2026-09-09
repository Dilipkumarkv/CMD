import re

with open('src/components/TerminalScreen.tsx', 'r') as f:
    content = f.read()

# Make the form flex-wrap and allow input to shrink
old_form = '<form onSubmit={onSubmit} className="group flex items-center gap-1.5 px-0 py-1 mt-2 w-full cursor-text transition-colors" onClick={() => document.getElementById(\'terminal-input\')?.focus()}>'
new_form = '<form onSubmit={onSubmit} className="group flex items-baseline gap-1.5 flex-wrap px-0 py-1 mt-2 w-full cursor-text transition-colors" onClick={() => document.getElementById(\'terminal-input\')?.focus()}>'

old_input = 'className={`flex-1 bg-transparent border-none outline-none p-0 m-0 font-mono font-bold placeholder-white/20 focus:ring-0 text-xs sm:text-sm terminal-caret text-white`}'
new_input = 'className={`flex-1 min-w-[100px] bg-transparent border-none outline-none p-0 m-0 font-mono font-bold placeholder-white/20 focus:ring-0 text-xs sm:text-sm terminal-caret text-white`}'

content = content.replace(old_form, new_form)
content = content.replace(old_input, new_input)

with open('src/components/TerminalScreen.tsx', 'w') as f:
    f.write(content)
print("Updated TerminalScreen.tsx")
