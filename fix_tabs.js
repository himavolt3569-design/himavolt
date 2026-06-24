const fs = require('fs');

function replace(p, replacer) {
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  let newC = replacer(c);
  if (c !== newC) { fs.writeFileSync(p, newC); console.log('Fixed', p); }
}

replace('src/components/dashboard/LiveOrdersTab.tsx', c => {
  let res = c;
  res = res.replace(/markPreparing,\n\s*markReady,\n\s*markDelivered,/g, '');
  res = res.replace(/onPreparing=\{[^\}]+\}/g, '');
  res = res.replace(/onReady=\{[^\}]+\}/g, '');
  res = res.replace(/onDelivered=\{[^\}]+\}/g, '');
  res = res.replace(/onPreparing:\s*\(\)\s*=>\s*void;/g, '');
  res = res.replace(/onReady:\s*\(\)\s*=>\s*void;/g, '');
  res = res.replace(/onDelivered:\s*\(\)\s*=>\s*void;/g, '');
  res = res.replace(/onPreparing,\n\s*onReady,\n\s*onDelivered,/g, '');
  res = res.replace(/<ActionButton[^>]+icon=\{ChefHat\}[^>]+>/g, '');
  res = res.replace(/<ActionButton[^>]+icon=\{PackageCheck\}[^>]+>/g, '');
  res = res.replace(/<ActionButton[^>]+icon=\{Truck\}[^>]+>/g, '');
  res = res.replace(/onAccept=\{\(et\) => acceptOrder\(order\.id, et\)\}/g, 'onAccept={() => acceptOrder(order.id)}');
  res = res.replace(/const \[showTimeInput, setShowTimeInput\] = useState\(false\);/g, '');
  res = res.replace(/const \[estTime, setEstTime\] = useState\(order\.estimatedTime \|\| 20\);/g, '');
  res = res.replace(/if \(showTimeInput\) \{[\s\S]*?\} else \{[\s\S]*?\}/g, 'return (\n<ActionButton onClick={(e) => stop(e, () => onAccept())} busy={busy} icon={CheckCircle2} label="Accept" className="bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]" />\n);');
  return res;
});

replace('src/components/dashboard/features/QuickCounterTab.tsx', c => {
  let res = c;
  res = res.replace(/markPreparing,\n\s*markReady,\n\s*markDelivered,/g, '');
  res = res.replace(/onPreparing=\{[^\}]+\}/g, '');
  res = res.replace(/onReady=\{[^\}]+\}/g, '');
  res = res.replace(/onDelivered=\{[^\}]+\}/g, '');
  res = res.replace(/onAccept=\{\(et\) => acceptOrder\(o\.id, et\)\}/g, 'onAccept={() => acceptOrder(o.id)}');
  res = res.replace(/estimatedTime/g, '');
  return res;
});

replace('src/components/modals/DineInRequestModal.tsx', c => {
  let res = c;
  res = res.replace(/estimatedTime/g, '');
  return res;
});

