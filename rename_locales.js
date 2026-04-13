const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'public', 'locales');

function renameDir(oldName, newName) {
  const oldPath = path.join(localesDir, oldName);
  const newPath = path.join(localesDir, newName);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed ${oldName} to ${newName}`);
  }
}

renameDir('jp', 'ja');
renameDir('cn', 'zh-CN');
renameDir('tw', 'zh-TW');

console.log("Done");
