const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

const targetDir = path.join(__dirname, 'src', 'app', 'my');
walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx')) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // Find JSX text nodes like >Text<
      if (/>([^<{]+)</.test(line)) {
        const text = line.match(/>([^<]+)</)[1].trim();
        // Ignore simple symbolic stuff, just empty space, numbers
        if (text && !/^[\s\&0-9\-\+\*\.\,\/\|\(\)\[\]\:\;\=\!\%]+$/.test(text) && !text.includes('nbsp')) {
          console.log(`${filePath.replace(__dirname, '')}:${i + 1}: ${text}`);
        }
      }
    });
  }
});
