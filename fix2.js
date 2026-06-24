const fs = require('fs');
const { execSync } = require('child_process');

function walk(dir, callback) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = dir + '/' + file;
    if (fs.statSync(p).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') walk(p, callback);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      callback(p);
    }
  }
}

walk('src', (p) => {
  let c = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Replace statuses in exact strings
  if (c.includes('"PREPARING"')) { c = c.replace(/"PREPARING"/g, '"ACCEPTED"'); changed = true; }
  if (c.includes('"READY"')) { c = c.replace(/"READY"/g, '"ACCEPTED"'); changed = true; }
  if (c.includes('"DELIVERED"')) { c = c.replace(/"DELIVERED"/g, '"ACCEPTED"'); changed = true; }
  if (c.includes('"CANCELLED"')) { c = c.replace(/"CANCELLED"/g, '"REJECTED"'); changed = true; }

  if (c.includes("'PREPARING'")) { c = c.replace(/'PREPARING'/g, "'ACCEPTED'"); changed = true; }
  if (c.includes("'READY'")) { c = c.replace(/'READY'/g, "'ACCEPTED'"); changed = true; }
  if (c.includes("'DELIVERED'")) { c = c.replace(/'DELIVERED'/g, "'ACCEPTED'"); changed = true; }
  if (c.includes("'CANCELLED'")) { c = c.replace(/'CANCELLED'/g, "'REJECTED'"); changed = true; }
  
  if (c.includes('estimatedTime: true,')) { c = c.replace(/estimatedTime:\s*true,/g, ''); changed = true; }
  if (c.includes('preparingAt: true,')) { c = c.replace(/preparingAt:\s*true,/g, ''); changed = true; }
  if (c.includes('readyAt: true,')) { c = c.replace(/readyAt:\s*true,/g, ''); changed = true; }
  if (c.includes('deliveredAt: true,')) { c = c.replace(/deliveredAt:\s*true,/g, ''); changed = true; }

  // Object property patterns
  if (c.includes('estimatedTime,')) { c = c.replace(/estimatedTime,/g, ''); changed = true; }
  if (c.includes('preparingAt,')) { c = c.replace(/preparingAt,/g, ''); changed = true; }
  if (c.includes('readyAt,')) { c = c.replace(/readyAt,/g, ''); changed = true; }
  if (c.includes('deliveredAt,')) { c = c.replace(/deliveredAt,/g, ''); changed = true; }

  if (changed) {
    fs.writeFileSync(p, c);
  }
});
console.log('Global regex replacements done.');
