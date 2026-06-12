const fs = require('fs');
const path = require('path');

async function main() {
  const imgPath = path.join('c:', 'Users', 'admin', 'Desktop', 'Kello', 'public', 'images', 'home', 'media__1781241555167.png');
  const outPath = path.join('c:', 'Users', 'admin', 'Desktop', 'Kello', 'public', 'images', 'home', 'coupon_ticket.png');

  if (!fs.existsSync(imgPath)) {
    console.error(`Original image not found at ${imgPath}`);
    process.exit(1);
  }

  try {
    const sharp = require('sharp');
    const metadata = await sharp(imgPath).metadata();
    console.log(`Original size: ${metadata.width}x${metadata.height}`);

    // 가로 약 62% ~ 94% 영역, 세로 약 12% ~ 90% 영역 크롭
    const left = Math.floor(metadata.width * 0.61);
    const top = Math.floor(metadata.height * 0.1);
    const width = Math.floor(metadata.width * 0.34);
    const height = Math.floor(metadata.height * 0.82);

    await sharp(imgPath)
      .extract({ left, top, width, height })
      .toFile(outPath);

    console.log(`Successfully cropped and saved to ${outPath}`);
  } catch (err) {
    console.error('Sharp processing error:', err.message);
    process.exit(1);
  }
}

main();
