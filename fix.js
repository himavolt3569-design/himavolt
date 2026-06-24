const fs = require('fs');

function replaceFile(path, replacer) {
  let content = fs.readFileSync(path, 'utf8');
  content = replacer(content);
  fs.writeFileSync(path, content);
}

replaceFile('src/app/api/me/ratings/route.ts', c => c.replace('status: "DELIVERED"', 'status: "ACCEPTED"'));
replaceFile('src/app/api/me/reviews/route.ts', c => c.replace('status: "DELIVERED"', 'status: "ACCEPTED"'));
replaceFile('src/app/api/me/stats/route.ts', c => {
  c = c.replace('status: "DELIVERED"', 'status: "ACCEPTED"');
  c = c.replace('spentAgg._sum.total ?? 0', 'spentAgg._sum?.total ?? 0');
  return c;
});

// orders
replaceFile('src/app/api/orders/[orderId]/cancel/route.ts', c => {
  return c.replace('status: "CANCELLED"', 'status: "REJECTED", rejectReason: "User cancelled"');
});

replaceFile('src/app/api/orders/route.ts', c => {
  return c.replace('estimatedTime: true,\n', '');
});

replaceFile('src/app/api/restaurants/[id]/financials/route.ts', c => c.replace('status: "DELIVERED"', 'status: "ACCEPTED"'));
replaceFile('src/app/api/restaurants/[id]/menu/[itemId]/ratings/route.ts', c => c.replace('status: "DELIVERED"', 'status: "ACCEPTED"'));

console.log('Fixed simple replacements.');
