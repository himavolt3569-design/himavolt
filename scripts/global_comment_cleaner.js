const fs = require('fs');
const path = require('path');

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        walk(path.join(dir, file), fileList);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(path.join(dir, file));
      }
    }
  }
  return fileList;
}

const files = walk(path.join(__dirname, '../src'));
let totalRemovedLines = 0;
let modifiedFiles = 0;

for (const file of files) {
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
    if (trimmed.match(/^\{\/\*\s*[a-zA-Z0-9\s:-_]+\s*\*\/\}$/)) {
      removed++;
      continue;
    }
    
    // 3. Short TS structural labels: // Data, // UI state, // Cart operations (max 4 words)
    // Only if they don't look like actual sentences with punctuation.
    if (trimmed.match(/^\/\/\s+[A-Z][a-zA-Z0-9\s\(\)]{0,40}$/)) {
      const words = trimmed.replace('//', '').trim().split(' ');
      if (words.length <= 4 && !trimmed.includes('.') && !trimmed.includes('?')) {
        removed++;
        continue;
      }
    }

    // 4. Pure divider lines
    if (trimmed.match(/^\/\/\s*[\-─=]+$/)) {
        removed++;
        continue;
    }

    // 5. Commented out code lines starting with common keywords
    // Exclude basic "// import" sentences like "// important" -> we need space after
    if (trimmed.match(/^\/\/\s*(?:import\s|const\s|let\s|var\s|return\s|export\s|<[A-Z][a-zA-Z]+|\})/)) {
      removed++;
      continue;
    }

    // 6. Generic // TODO without actual content
    if (trimmed.match(/^\/\/\s*TODO:?\s*$/i)) {
      removed++;
      continue;
    }

    newLines.push(line);
  }
  
  if (removed > 0) {
    fs.writeFileSync(file, newLines.join('\n'), 'utf8');
    totalRemovedLines += removed;
    modifiedFiles++;
    console.log(`Cleaned ${removed} lines in ${path.relative(__dirname, file)}`);
  }
}

console.log(`\nDONE! Total removed lines: ${totalRemovedLines} across ${modifiedFiles} files.`);
