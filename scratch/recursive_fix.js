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
    let buf = fs.readFileSync(f);
    let success = false;
    let attempts = 0;
    
    while (!success && attempts < 100) {
        attempts++;
        try {
            const content = buf.toString('utf8');
            JSON.parse(content);
            fs.writeFileSync(f, JSON.stringify(JSON.parse(content), null, 2), 'utf8');
            console.log(f, "FIXED");
            success = true;
        } catch (e) {
            const m = e.message.match(/position (\d+)/);
            if (m) {
                const pos = parseInt(m[1]);
                // If it's a "Bad control character", it's likely a byte at that position
                // But position is in CHARACTERS.
                // We'll just replace the byte at that relative position.
                // This is a bit hacky but let's try.
                const content = buf.toString('utf8');
                const before = content.slice(0, pos);
                const after = content.slice(pos + 1);
                buf = Buffer.from(before + ' ' + after, 'utf8');
            } else {
                // Other error (braces etc)
                let content = buf.toString('utf8');
                content = content.replace(/}(?!\s*,)\s*"/g, '},\n  "');
                content = content.replace(/,\s*}/g, '\n  }');
                if (content.includes('"liability":') && !content.includes('},\n  "signup":')) {
                     content = content.replace('"signup":', '},\n  "signup":');
                }
                buf = Buffer.from(content, 'utf8');
                if (attempts > 10) break; // Avoid infinite loop
            }
        }
    }
    if (!success) console.error(f, "GAVE UP after", attempts, "attempts");
});
