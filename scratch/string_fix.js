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
    let content = fs.readFileSync(f, 'utf8');
    
    // Fix literal control characters inside JSON strings
    // This regex looks for double-quoted strings and applies escapes to control chars inside them
    content = content.replace(/"((?:\\"|[^"])*)"/g, (match, p1) => {
        return '"' + p1.replace(/[\x00-\x1F]/g, (c) => {
            if (c === '\n') return '\\n';
            if (c === '\r') return '\\r';
            if (c === '\t') return '\\t';
            return '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0');
        }) + '"';
    });
    
    // Fix structural issues
    content = content.replace(/}(?!\s*,)\s*"/g, '},\n  "');
    content = content.replace(/,\s*}/g, '\n  }');
    
    // Fix terms_of_service closing brace
    if (content.includes('"liability":') && content.includes('"signup":')) {
        const parts = content.split('"signup":');
        const open = (parts[0].match(/{/g) || []).length;
        const close = (parts[0].match(/}/g) || []).length;
        if (open > close) {
             let before = parts[0].trimEnd();
             if (before.endsWith(',')) before = before.slice(0, -1).trimEnd();
             content = before + '\n  },\n  "signup":' + parts.slice(1).join('"signup":');
        }
    }

    try {
        const obj = JSON.parse(content);
        fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
        console.log(f, "FIXED");
    } catch (e) {
        console.error(f, "STILL FAILED:", e.message);
    }
});
