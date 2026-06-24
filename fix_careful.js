const fs = require('fs');

function replace(p, replacer) {
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  let newC = replacer(c);
  if (c !== newC) { fs.writeFileSync(p, newC); console.log('Fixed', p); }
}

replace('src/components/dashboard/LiveOrdersTab.tsx', c => {
  let res = c;
  res = res.replace(/PREPARING:\s*\{[^}]+\},/g, '');
  res = res.replace(/READY:\s*\{[^}]+\},/g, '');
  res = res.replace(/DELIVERED:\s*\{[^}]+\},/g, '');
  res = res.replace(/CANCELLED:\s*\{[^}]+\},/g, '');
  res = res.replace(/\{ value: "PREPARING", label: "Preparing" \},/g, '');
  res = res.replace(/\{ value: "READY", label: "Ready" \},/g, '');
  res = res.replace(/\{ value: "DELIVERED", label: "Delivered" \},/g, '');
  res = res.replace(/\{ value: "CANCELLED", label: "Cancelled" \},/g, '');
  res = res.replace(/status === "PREPARING" \?/g, 'status === "ACCEPTED" ?');
  return res;
});

replace('src/components/dashboard/NotificationBell.tsx', c => {
  let res = c;
  res = res.replace(/PREPARING:\s*\{[^}]+\},/g, '');
  res = res.replace(/READY:\s*\{[^}]+\},/g, '');
  res = res.replace(/DELIVERED:\s*\{[^}]+\},/g, '');
  res = res.replace(/CANCELLED:\s*\{[^}]+\},/g, '');
  return res;
});

replace('src/components/shared/OrderStatus.tsx', c => {
  let res = c;
  res = res.replace(/const ORDER_STATUS_CONFIG: Record<OrderStatus, [^>]+> = \{[\s\S]*?\};/, 'const ORDER_STATUS_CONFIG: Record<OrderStatus, any> = { PENDING: { label: "Pending", bg: "bg-orange-100", text: "text-orange-700", icon: Clock }, ACCEPTED: { label: "Accepted", bg: "bg-blue-100", text: "text-blue-700", icon: CheckCircle2 }, REJECTED: { label: "Rejected", bg: "bg-red-100", text: "text-red-700", icon: XCircle } };');
  res = res.replace(/estimatedTime, /g, '');
  res = res.replace(/estimatedTime \?: number;/g, '');
  res = res.replace(/estimatedTime: estimatedTime,/g, '');
  res = res.replace(/estimatedTime,/g, '');
  return res;
});

