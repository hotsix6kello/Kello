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
const dict = {};

walkDir(targetDir, (filePath) => {
  if (filePath.endsWith('.tsx')) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Using a regex to extract t("key", { defaultValue: "value" })
    const regex = /t\([`"']([^`"']+)[`"'],\s*\{\s*defaultValue:\s*[`"']([^`"']+)[`"']/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      dict[match[1]] = match[2];
    }
  }
});

fs.writeFileSync('extracted_keys.json', JSON.stringify(dict, null, 2));
console.log("Extracted " + Object.keys(dict).length + " keys.");
