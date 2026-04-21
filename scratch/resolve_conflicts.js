const fs = require('fs');
const path = require('path');

const filesToResolve = [
    "public/locales/ar/common.json",
    "public/locales/en/common.json",
    "public/locales/ja/common.json",
    "public/locales/ko/common.json",
    "public/locales/th/common.json",
    "public/locales/vi/common.json",
    "public/locales/zh-CN/common.json",
    "public/locales/zh-TW/common.json",
    "src/app/auth/signup/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx"
];

function resolveFile(filepath) {
    console.log(`Resolving ${filepath}...`);
    if (!fs.existsSync(filepath)) {
        console.warn(`File not found: ${filepath}`);
        return;
    }

    let content = fs.readFileSync(filepath, 'utf8');
    const isJson = filepath.endsWith('.json');

    // Updated regex to be more robust with newlines
    const pattern = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> origin\/develop/g;

    const newContent = content.replace(pattern, (match, head, tail) => {
        console.log(`  Found conflict block in ${filepath}`);
        if (isJson) {
            const h = head.trim();
            const t = tail.trim();
            if (!h) return t;
            if (!t) return h;
            
            if (!h.endsWith(',') && !h.endsWith('{') && !t.startsWith('}')) {
                return h + ",\n  " + t;
            }
            return h + "\n  " + t;
        } else {
            // For TSX, in many cases we want both, but if it's a "add/add" conflict of entire file, 
            // the markers might wrap the whole code.
            // For privacy/terms, I want to prioritize the localized one (HEAD) 
            // OR keep both if they are distinct components.
            // In our case, they are BOTH 'Export default function' so we CANNOT keep both.
            
            if (filepath.includes('privacy') || filepath.includes('terms')) {
                // Return HEAD version for legal pages as it's localized
                return head;
            }
            
            return head + "\n" + tail;
        }
    });

    fs.writeFileSync(filepath, newContent, 'utf8');
}

filesToResolve.forEach(resolveFile);
console.log("Resolution complete.");
