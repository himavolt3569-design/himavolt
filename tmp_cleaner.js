const fs = require('fs');

const file = 'd:/Official_Projects/himalhub/src/app/pos/[slug]/page.tsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
const newLines = [];
let removed = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  // 1. Structural ASCII headers
  if (trimmed.match(/^(?:\/\/|\/\*)\s*[\-─=]{1,}\s*[a-zA-Z0-9\s]*\s*[\-─=]{1,}\s*(?:\*\/)?$/)) {
    removed++;
    continue;
  }

  // 2. Short UI jsx markers: {/* Left: Menu Area */}
  if (trimmed.match(/^\{\/\*\s*[a-zA-Z0-9\s:]+\s*\*\/\}$/)) {
    removed++;
    continue;
  }
  
  // 3. Short TS structural labels: // Data, // UI state, // Cart operations (max 4 words)
  if (trimmed.match(/^\/\/\s+[A-Z][a-zA-Z0-9\s\(\)]{0,30}$/)) {
    const words = trimmed.replace('//', '').trim().split(' ');
    // Exclude valid sentences that have verbs? Just limit to 4 words.
    if (words.length <= 4 && !trimmed.includes('.')) {
      removed++;
      continue;
    }
  }

  // 4. Pure divider lines
  if (trimmed.match(/^\/\/\s*[\-─=]+$/)) {
      removed++;
      continue;
  }

  // 5. Commented out code
  if (trimmed.match(/^\/\/\s*(?:import\s|const\s|let\s|var\s|return\s|export\s|<[a-zA-Z]+|\})/)) {
    removed++;
    continue;
  }

  newLines.push(line);
}

fs.writeFileSync(file + '.out', newLines.join('\n'), 'utf8');
console.log(`Cleaned ${removed} lines in test.`);
