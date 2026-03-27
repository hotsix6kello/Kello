const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'public', 'locales', 'en', 'common.json');
let obj = JSON.parse(fs.readFileSync(file, 'utf8'));

function traverse(node) {
  if (typeof node === 'string') {
    let res = node;
    // Replace exact "Real-time Interpreter"
    res = res.replace(/Real-time Interpreter/gi, 'Live Translation');
    // Replace "Interpreter" (standalone or within strings, preserving casing where reasonable)
    res = res.replace(/Interpreter/g, 'Translation');
    res = res.replace(/interpreter/g, 'translation');
    return res;
  } else if (Array.isArray(node)) {
    return node.map(traverse);
  } else if (typeof node === 'object' && node !== null) {
    const next = {};
    for (const [k, v] of Object.entries(node)) {
      // do not change keys
      next[k] = traverse(v);
    }
    return next;
  }
  return node;
}

obj = traverse(obj);

fs.writeFileSync(file, JSON.stringify(obj, null, 2));
console.log('Update en locales complete');
