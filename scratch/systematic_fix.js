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
    
    // Fix: Remove trailing comma before a closing brace
    content = content.replace(/,\s*}/g, '\n  }');
    
    // Fix: Missing comma between siblings
    content = content.replace(/}\s*"/g, '},\n  "');
    
    // Fix: Double comma
    content = content.replace(/,+/g, ',');
    
    // Fix: Day label literal newline
    content = content.replace(/"day_label":\s*"Day {{day}},?\s*\n\s*"/g, '"day_label": "Day {{day}}"');

    try {
        const obj = JSON.parse(content);
        fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
        console.log(f, "OK");
    } catch (e) {
        // If it still fails, it's likely a missing brace for terms_of_service
        // Count braces
        let open=0, close=0;
        for(let c of content) { if(c==='{') open++; if(c==='}') close++; }
        if (open > close) {
            // Append missing brace before signup
            content = content.replace('"signup":', '},\n  "signup":');
        } else if (close > open) {
            // Remove an extra brace at the very end
            content = content.trimEnd().replace(/}\s*$/, '');
        }
        
        try {
            const obj = JSON.parse(content);
            fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
            console.log(f, "RECOVERED");
        } catch (e2) {
             console.error(f, "FAILED:", e2.message);
        }
    }
});
