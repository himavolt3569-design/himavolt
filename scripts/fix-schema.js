const fs = require('fs');
let content = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Strip out the UTF-16LE null bytes and the bad echo text
content = content.replace(/\x00/g, '');

const cutoff = content.indexOf('model SiteSetting { key String @id');
if (cutoff !== -1) {
  content = content.substring(0, cutoff);
}

// Append the clean model
content += `
model SiteSetting {
  key        String   @id
  value      String
  updated_at DateTime @updatedAt

  @@map("site_settings")
}
`;

fs.writeFileSync('prisma/schema.prisma', content);
console.log('Fixed schema');
