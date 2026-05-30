const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function processClasses(classStr) {
  let original = classStr;
  let tokens = classStr.split(/\s+/).filter(Boolean);
  
  // 1. A11y Focus Rings
  if (tokens.includes('focus:outline-none')) {
    const hasRing = tokens.some(t => t.includes('focus:ring') || t.includes('focus-visible:ring'));
    if (!hasRing) {
      tokens.push('focus-visible:ring-1', 'focus-visible:ring-teal-500/50');
    }
  }

  // 2. Anti-Slop: Eyebrow text removal
  const isEyebrow = tokens.some(t => t === 'uppercase') && 
                    tokens.some(t => t.startsWith('tracking-')) && 
                    tokens.some(t => /^text-\[\d+px\]$/.test(t) || t === 'text-xs');

  if (isEyebrow) {
    // Remove bad tokens
    tokens = tokens.filter(t => 
      !/^text-\[\d+px\]$/.test(t) &&
      t !== 'text-xs' &&
      !/^font-(black|bold|semibold)$/.test(t) &&
      !/^text-[a-z]+-\d+(\/\d+)?$/.test(t) && // e.g. text-slate-500
      !/^text-\[#.+\]/.test(t) &&
      t !== 'uppercase' &&
      !t.startsWith('tracking-')
    );
    // Add premium tokens
    tokens.push('text-sm', 'font-medium', 'text-slate-400');
  }

  // 3. Color Lock: Rainbow background icons to neutral
  // Target: bg-{color}-500/10 text-{color}-400 border border-{color}-500/10
  // Exclude explicit status colors if we want, but let's neutralize standard rainbow ones: 
  // rose, indigo, emerald, amber, blue (if they appear together in this pattern)
  // Actually, we'll let this be manual or do a simple replace if we find the exact combo.
  const hasRainbowBg = tokens.some(t => /^bg-(rose|indigo|emerald|amber|blue)-\d+\/10$/.test(t));
  const hasRainbowText = tokens.some(t => /^text-(rose|indigo|emerald|amber|blue)-\d+$/.test(t));
  
  // Only apply color lock if it's a wrapper div with p-2 or flex/items-center and no semantic intent
  // It's safer to leave this to a more targeted regex or manual edit.
  // We will skip color lock here to avoid breaking semantic status (like "Sincronizado" dot).

  const newStr = Array.from(new Set(tokens)).join(' ');
  return newStr;
}

function processFile(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;

  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Process className="..."
  content = content.replace(/className=(["'])(.*?)\1/g, (match, quote, classStr) => {
    return `className=${quote}${processClasses(classStr)}${quote}`;
  });

  // Process className={...}
  // This is a bit trickier because of template literals. We'll do a simple pass for template literals: `...`
  content = content.replace(/className=\{`([^`]+)`\}/g, (match, classStr) => {
    // We can just process the static parts by splitting on ${...}
    // But a simpler heuristic: just run processClasses on the whole thing and hope we don't mess up JS expressions.
    // Actually, it's safer to only process static strings.
    let parts = classStr.split(/(\$\{.*?\})/);
    let newParts = parts.map(p => p.startsWith('${') ? p : processClasses(p));
    return `className={\`${newParts.join('')}\`}`;
  });

  // Also replace simple '...' with '…' in placeholders and Loading states
  // But be careful not to replace JS spreads `...`
  content = content.replace(/placeholder=(["'])(.*?)\.\.\.\1/g, 'placeholder=$1$2…$1');
  content = content.replace(/title=(["'])(.*?)\.\.\.\1/g, 'title=$1$2…$1');
  content = content.replace(/"(Buscar.*?)\.\.\."/g, '"$1…"');
  content = content.replace(/'(Buscar.*?)\.\.\.'/g, "'$1…'");

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated: ${filePath}`);
  }
}

const targetDir = path.join(__dirname, '../src/react/features');
walkDir(targetDir, processFile);
console.log('Phase 1 script finished.');
