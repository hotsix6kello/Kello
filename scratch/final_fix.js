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
    
    // Remove all conflict markers
    content = content.replace(/<<<<<<< HEAD|=======|>>>>>>> origin\/develop/g, '');
    
    // Find all independent JSON objects in the file (starting with { and ending with })
    // We'll search for }{ or } { or } \n {
    const parts = content.split(/}\s*\n?\s*{/);
    if (parts.length > 1) {
        console.log(`  Merging ${parts.length} objects in ${f}`);
        // We have multiple objects. Let's merge their keys.
        // The first part starts with { and ends with the split point. 
        // We'll add the closing brace back to the parts.
        
        let merged = {};
        parts.forEach((p, idx) => {
             let jsonStr = p;
             if (idx > 0) jsonStr = '{' + jsonStr;
             if (idx < parts.length - 1) jsonStr = jsonStr + '}';
             
             // Cleanup the string to be more parseable
             jsonStr = jsonStr.replace(/"day_label":\s*"Day {{day}},?\s*\n\s*"/g, '"day_label": "Day {{day}}"');
             
             try {
                 // Use a very lenient "eval" like approach if JSON.parse fails, 
                 // or just a simplified key-value extractor if it's too broken.
                 // For now, let's try a regex-based object merger if JSON.parse fails.
                 const obj = JSON.parse(jsonStr);
                 Object.assign(merged, obj);
             } catch (e) {
                 console.log(`    Sub-object ${idx} parse failed, attempting manual key extraction...`);
                 // Manual extraction of top-level keys
                 const keyRegex = /^\s*"([^"]+)"\s*:\s*/gm;
                 // This is too complex. 
                 // Let's just try to fix the common error: missing comma between objects
                 let fixed = jsonStr.replace(/}\s*"/g, '},\n  "');
                 try {
                     const obj = JSON.parse(fixed);
                     Object.assign(merged, obj);
                 } catch (e2) {
                     console.error(`    FAILED sub-object ${idx} in ${f}`);
                 }
             }
        });
        
        fs.writeFileSync(f, JSON.stringify(merged, null, 2), 'utf8');
        console.log(`  ${f} MERGED and VALIDATED.`);
    } else {
        // Only one object, but it might have internal errors
        console.log(`  Fixing single object in ${f}`);
        content = content.replace(/"day_label":\s*"Day {{day}},?\s*\n\s*"/g, '"day_label": "Day {{day}}"');
        content = content.replace(/}(?!\s*,)\s*"/g, '},\n  "');
        try {
            const obj = JSON.parse(content);
            fs.writeFileSync(f, JSON.stringify(obj, null, 2), 'utf8');
            console.log(`  ${f} FIXED.`);
        } catch (e) {
             console.error(`  FAIL for ${f}: ${e.message}`);
        }
    }
});
