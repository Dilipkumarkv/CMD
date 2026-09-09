export function formatTerminalOutput(text: string, shell: 'cmd' | 'ps' | 'bash') {
  if (!text) return text;

  // Split into lines for parsing
  const lines = text.split('\n');
  
  return lines.map((line, idx) => {
    // Basic IP/Number highlighting
    const highlightNumbersAndIPs = (str: string) => {
      const ipRegex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
      return str.split(/( |\t)/).map((word, i) => {
        if (ipRegex.test(word)) {
          return <span key={i} className="text-amber-300">{word}</span>;
        }
        // Match numbers, but not if they are part of a larger string (basic heuristic)
        if (/^\d+$/.test(word.trim())) {
          return <span key={i} className="text-blue-300">{word}</span>;
        }
        return word;
      });
    };

    // Directory listing highlight (CMD)
    if (shell === 'cmd' && line.includes('<DIR>')) {
      const parts = line.split('<DIR>');
      return (
        <span key={idx}>
          {parts[0]}<span className="text-emerald-400 font-bold">{"<DIR>"}</span>
          <span className="text-sky-300 font-medium">{parts[1]}</span>
          {idx < lines.length - 1 && '\n'}
        </span>
      );
    }
    
    // Directory listing highlight (PS)
    if (shell === 'ps' && line.trim().startsWith('d')) {
      return (
        <span key={idx} className="text-sky-400 font-medium">
          {line}
          {idx < lines.length - 1 && '\n'}
        </span>
      );
    }
    
    // PS Table headers
    if (shell === 'ps' && (line.includes('----') || line.includes('Mode'))) {
      return (
        <span key={idx} className="text-neutral-500">
          {line}
          {idx < lines.length - 1 && '\n'}
        </span>
      );
    }

    // Directory listing highlight (Bash ls -l)
    if (shell === 'bash' && line.trim().startsWith('d')) {
      return (
        <span key={idx} className="text-sky-400 font-medium">
          {line}
          {idx < lines.length - 1 && '\n'}
        </span>
      );
    }

    // Success/Error generic hints
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes('success') || lowerLine.includes('completed successfully')) {
      return (
        <span key={idx} className="text-emerald-400">
          {line}
          {idx < lines.length - 1 && '\n'}
        </span>
      );
    }

    // Fallback: apply number highlighting
    return (
      <span key={idx}>
        {highlightNumbersAndIPs(line)}
        {idx < lines.length - 1 && '\n'}
      </span>
    );
  });
}
