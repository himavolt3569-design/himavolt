const fs = require('fs');

function replace(p, replacer) {
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  let newC = replacer(c);
  if (c !== newC) { fs.writeFileSync(p, newC); console.log('Fixed', p); }
}

replace('src/app/api/deliveries/[orderId]/route.ts', c => c.replace(/deliveredAt:\s*new Date\(\)/g, ''));
replace('src/app/api/restaurants/[id]/orders/[orderId]/route.ts', c => c.replace(/status === "REJECTED" \|\| status === "REJECTED"/g, 'status === "REJECTED"'));
replace('src/app/api/restaurants/[id]/orders/cleanup/route.ts', c => {
  return c.replace(/readyAt:\s*new Date\(\),?/g, '').replace(/deliveredAt:\s*new Date\(\),?/g, '');
});

replace('src/app/api/restaurants/[id]/reports/staff/[staffId]/route.ts', c => c.replace(/o\.status === "ACCEPTED" \|\| o\.status === "REJECTED"/g, 'o.status === "REJECTED"'));

replace('src/app/api/track/stream/route.ts', c => c.replace(/estimatedTime:\s*order\.estimatedTime,/g, ''));

replace('src/app/menu/[slug]/page.tsx', c => c.replace(/orderStatus === "REJECTED" \|\| orderStatus === "REJECTED"/g, 'orderStatus === "REJECTED"').replace(/=== "REJECTED"/g, '=== "REJECTED"')); // check logic

replace('src/app/track/[orderId]/page.tsx', c => c.replace(/estimatedTime: estimatedTime \?\? undefined,/g, '').replace(/estimatedTime,/g, ''));

replace('src/components/dashboard/features/QuickCounterTab.tsx', c => c.replace(/=== "REJECTED" \|\| [^\)]+ === "REJECTED"/g, '=== "REJECTED"').replace(/status === "ACCEPTED" \|\| status === "ACCEPTED"/g, 'status === "ACCEPTED"').replace(/status === "REJECTED" \|\| status === "REJECTED"/g, 'status === "REJECTED"'));

replace('src/components/dashboard/LiveOrdersTab.tsx', c => {
  return c.replace(/PREPARING:\s*\{[^}]*\},\s*READY:\s*\{[^}]*\},\s*ACCEPTED:\s*\{[^}]*\},\s*REJECTED:\s*\{[^}]*\}/g, 'ACCEPTED: { label: "Accepted", bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", icon: CheckCircle2 }, REJECTED: { label: "Rejected", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", icon: XCircle }')
          .replace(/PREPARING:\s*\{[^}]*\},\s*READY:\s*\{[^}]*\}/g, '')
          .replace(/status === "REJECTED" \|\| status === "REJECTED"/g, 'status === "REJECTED"')
          .replace(/status === "ACCEPTED" \|\| status === "ACCEPTED"/g, 'status === "ACCEPTED"');
});

replace('src/components/dashboard/NotificationBell.tsx', c => {
  return c.replace(/PREPARING:[^,]*,/g, '').replace(/READY:[^,]*,/g, '');
});

replace('src/components/shared/OrderStatus.tsx', c => c.replace(/estimatedTime,?/g, '').replace(/status === "REJECTED" \|\| status === "REJECTED"/g, 'status === "REJECTED"').replace(/status === "ACCEPTED" \|\| status === "ACCEPTED"/g, 'status === "ACCEPTED"').replace(/if \(estimatedTime\)[^}]+}/, ''));

replace('src/lib/billing.ts', c => c.replace(/status === "ACCEPTED" \|\| status === "REJECTED"/g, 'status === "REJECTED"'));

