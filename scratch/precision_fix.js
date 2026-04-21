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
    console.log(`Fixing ${f}...`);
    let content = fs.readFileSync(f, 'utf8');
    
    // 1. Fix missing comma before privacy_policy
    content = content.replace(/}\s*"(privacy_policy|signup_consent|terms_of_service)"/g, (match, key) => {
        return '},\n  "' + key + '"';
    });
    
    // 2. Fix missing closing brace for terms_of_service (the liability transition)
    content = content.replace(/"liability":\s*{[\s\S]*?}\s*\n\s*"signup":/g, (match) => {
        if (!match.includes('},\n  },\n  "signup":')) {
            return match.replace('"signup":', '},\n  "signup":');
        }
        return match;
    });

    try {
        const obj = JSON.parse(content);
        fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
        console.log(`  ${f} is now PERFECT.`);
    } catch (e) {
        console.error(`  Initial parse failed for ${f}: ${e.message}`);
        
        // Final attempt: fix common trailing commas or missing commas recursively
        let fixed = content.replace(/}(?!\s*,)\s*"/g, '},\n  "');
        fixed = fixed.replace(/,(?!\s*["{\[])\s*}/g, '\n}');
        
        try {
            const obj = JSON.parse(fixed);
            fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
            console.log(`  ${f} FIXED.`);
        } catch (e2) {
             console.error(`  STILL FAILED ${f}: ${e2.message}`);
             // Try to find where it fails
             const m = e2.message.match(/position (\d+)/);
             if (m) {
                 const pos = parseInt(m[1]);
                 console.log(`    Context at error: ${fixed.slice(pos-30, pos+30)}`);
             }
        }
    }
});
