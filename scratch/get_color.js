const sharp = require('sharp');
const path = require('path');

async function main() {
  const imgPath = path.join('c:', 'Users', 'admin', 'Desktop', 'Kello', 'public', 'images', 'home', 'media__1781241555167.png');
  
  try {
    // 10x10 크기로 리사이즈하여 평균적인 배경 색상을 구하거나 특정 구석 픽셀(좌상단 5,5) 추출
    const image = sharp(imgPath);
    const { data } = await image
      .raw()
      .toBuffer({ resolveWithObject: true });
      
    // 좌상단 (x: 5, y: 5) 좌표의 RGB 값 가져오기
    // 가로 너비는 405px이므로 1픽셀당 3또는 4채널(RGBA)
    const channels = data.length / (405 * 111); // 채널 수 (3: RGB, 4: RGBA)
    const x = 5;
    const y = 5;
    const idx = (y * 405 + x) * channels;
    
    const r = data[idx];
    const g = data[idx+1];
    const b = data[idx+2];
    
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('').toUpperCase();
    
    console.log(`Background pixel color (RGB): rgb(${r}, ${g}, ${b})`);
    console.log(`Background pixel color (HEX): ${rgbToHex(r, g, b)}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
