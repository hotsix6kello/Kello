const fs = require('fs');

const files = [
    "public/locales/ar/common.json",
    "public/locales/en/common.json",
    "public/locales/ja/common.json",
    "public/locales/ko/common.json",
    "public/locales/th/common.json",
    "public/locales/vi/common.json",
    "public/locales/zh-CN/common.json",
    "public/locales/zh-TW/common.json"
];

files.forEach(f => {
    console.log(`Smart cleaning ${f}...`);
    const content = fs.readFileSync(f, 'utf8');
    
    let clean = "";
    let inString = false;
    for (let i = 0; i < content.length; i++) {
        const c = content[i];
        const code = content.charCodeAt(i);
        
        if (c === '"' && (i === 0 || content[i-1] !== '\\')) {
            inString = !inString;
        }
        
        if (inString) {
            // Inside string: escape all control chars and non-ASCII
            if (code < 32 || code > 126) {
                // Special case: if it's already an escaped char like \n (backslash and n), keep it
                // But we are looking at literal chars.
                clean += "\\u" + code.toString(16).padStart(4, '0');
            } else {
                clean += c;
            }
        } else {
            // Outside string: keep only whitespace and safe ASCII
            if (code === 10 || code === 13 || code === 32 || code === 9) {
                clean += c;
            } else if (code > 32 && code <= 126) {
                clean += c;
            } else {
                // Ignore other chars outside strings
            }
        }
    }
    
    // Fix structural issues
    clean = clean.replace(/}(?!\s*,)\s*"/g, '},\n  "');
    if (clean.includes('"liability":') && clean.includes('"signup":')) {
        const parts = clean.split('"signup":');
        const open = (parts[0].match(/{/g) || []).length;
        const close = (parts[0].match(/}/g) || []).length;
        if (open > close) {
             clean = parts[0] + '},\n  "signup":' + parts.slice(1).join('"signup":');
        }
    }

    try {
        const obj = JSON.parse(clean);
        fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
        console.log(`  ${f} RESOLVED!`);
    } catch (e) {
        console.error(`  Fail for ${f}: ${e.message}`);
    }
});
