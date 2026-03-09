const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const outDir = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function createSvg(size) {
  const fontSize = Math.round(size * 0.32);
  const subFontSize = Math.round(size * 0.08);
  const radius = Math.round(size * 0.18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="#ff9933"/>
  <text x="50%" y="45%" text-anchor="middle" dominant-baseline="central"
    font-family="Arial,Helvetica,sans-serif" font-weight="700"
    font-size="${fontSize}" fill="white">H</text>
  <text x="50%" y="72%" text-anchor="middle" dominant-baseline="central"
    font-family="Arial,Helvetica,sans-serif" font-weight="500"
    font-size="${subFontSize}" fill="rgba(255,255,255,0.9)">HimaVolt</text>
</svg>`;
}

async function generate() {
  for (const size of sizes) {
    const svg = Buffer.from(createSvg(size));
    const outPath = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(svg).resize(size, size).png().toFile(outPath);
    console.log(`Created ${outPath}`);
  }

  const maskableSize = 512;
  const maskableSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${maskableSize}" height="${maskableSize}" viewBox="0 0 ${maskableSize} ${maskableSize}">
  <rect width="${maskableSize}" height="${maskableSize}" fill="#ff9933"/>
  <text x="50%" y="42%" text-anchor="middle" dominant-baseline="central"
    font-family="Arial,Helvetica,sans-serif" font-weight="700"
    font-size="140" fill="white">H</text>
  <text x="50%" y="62%" text-anchor="middle" dominant-baseline="central"
    font-family="Arial,Helvetica,sans-serif" font-weight="500"
    font-size="40" fill="rgba(255,255,255,0.9)">HimaVolt</text>
</svg>`);

  const maskPath = path.join(outDir, "maskable-icon-512x512.png");
  await sharp(maskableSvg).resize(maskableSize, maskableSize).png().toFile(maskPath);
  console.log(`Created ${maskPath}`);

  console.log("\nAll PWA icons generated successfully.");
}

generate().catch(console.error);
