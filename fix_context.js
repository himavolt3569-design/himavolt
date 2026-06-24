const fs = require('fs');

function replace(p, replacer) {
  if (!fs.existsSync(p)) return;
  let c = fs.readFileSync(p, 'utf8');
  let newC = replacer(c);
  if (c !== newC) { fs.writeFileSync(p, newC); console.log('Fixed', p); }
}

replace('src/context/LiveOrdersContext.tsx', c => {
  let res = c;
  res = res.replace(/export type LiveOrderStatus =[\s\S]*?\| "REJECTED";/, 'export type LiveOrderStatus =\n  | "PENDING"\n  | "ACCEPTED"\n  | "REJECTED";');
  res = res.replace(/export type LiveOrderStatus =\n  \| "PENDING"\n  \| "ACCEPTED"\n  \| "PREPARING"\n  \| "READY"\n  \| "DELIVERED"\n  \| "CANCELLED"\n  \| "REJECTED";/g, 'export type LiveOrderStatus =\n  | "PENDING"\n  | "ACCEPTED"\n  | "REJECTED";');
  res = res.replace(/estimatedTime\?: number;/g, '');
  res = res.replace(/acceptOrder: \(id: string, estimatedTime\?: number, print\?: boolean\) => Promise<void>;/g, 'acceptOrder: (id: string, print?: boolean) => Promise<void>;');
  res = res.replace(/acceptOrder: async \(id, estimatedTime, print = false\) => \{/g, 'acceptOrder: async (id, print = false) => {');
  res = res.replace(/body: JSON\.stringify\(\{ status: "ACCEPTED", estimatedTime \}\),/g, 'body: JSON.stringify({ status: "ACCEPTED" }),');
  res = res.replace(/const acceptOrder = async \(id: string, estimatedTime\?: number, print = false\) => \{/g, 'const acceptOrder = async (id: string, print = false) => {');
  
  res = res.replace(/markPreparing: \(id: string\) => Promise<void>;\n  markReady: \(id: string\) => Promise<void>;\n  markDelivered: \(id: string\) => Promise<void>;\n/g, '');
  res = res.replace(/const markPreparing = async \(id: string\) => \{[\s\S]*?\};\n/g, '');
  res = res.replace(/const markReady = async \(id: string\) => \{[\s\S]*?\};\n/g, '');
  res = res.replace(/const markDelivered = async \(id: string\) => \{[\s\S]*?\};\n/g, '');
  
  res = res.replace(/markPreparing,\n    markReady,\n    markDelivered,\n/g, '');
  res = res.replace(/markPreparing,\n        markReady,\n        markDelivered,\n/g, '');
  return res;
});

