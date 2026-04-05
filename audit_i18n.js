const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src/app/community');
const localesDir = path.join(__dirname, 'public/locales');
const langs = ['ko', 'en', 'jp', 'cn', 'tw', 'vi', 'th', 'ar'];

function getFiles(dir, ext) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            files = files.concat(getFiles(fullPath, ext));
        } else if (fullPath.endsWith(ext)) {
            files.push(fullPath);
        }
    }
    return files;
}

function extractKeys() {
    const files = getFiles(srcDir, '.tsx').concat(getFiles(srcDir, '.ts'));
    const keys = new Set();
    const regex = /t\(\s*[`'"]([^`'"]+)[`'"]/g;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        let match;
        while ((match = regex.exec(content)) !== null) {
            keys.add(match[1]);
        }
    }
    return Array.from(keys);
}

const usedKeys = extractKeys();
const communityUsedKeys = usedKeys.filter(k => k.startsWith('community_page.') || k.startsWith('common.'));

function flattenObj(obj, prefix = '', res = {}) {
    for (const [key, value] of Object.entries(obj)) {
        const newPrefix = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            flattenObj(value, newPrefix, res);
        } else {
            res[newPrefix] = value;
        }
    }
    return res;
}

const localeData = {};
for (const lang of langs) {
    const commonPath = path.join(localesDir, lang, 'common.json');
    if (fs.existsSync(commonPath)) {
        const content = JSON.parse(fs.readFileSync(commonPath, 'utf8'));
        localeData[lang] = flattenObj(content);
    } else {
        localeData[lang] = {};
    }
}

const koKeys = Object.keys(localeData['ko']).filter(k => k.startsWith('community_page.'));

const results = {
    usedKeysCount: communityUsedKeys.length,
    koKeysCount: koKeys.length,
    missing: {},
    mismatch: {},
    empty: {},
    suspiciousCount: {},
    awkwardCount: {},
    examples: { suspicious: [], awkward: [] }
};

for (const lang of langs) {
    results.missing[lang] = 0;
    results.mismatch[lang] = 0;
    results.empty[lang] = 0;
    results.suspiciousCount[lang] = 0;
    results.awkwardCount[lang] = 0;
}

const checkList = [...new Set([...koKeys, ...communityUsedKeys])];
const containsHangul = (str) => /[가-힣]/.test(str);
const containsEnglishWordList = (str) => /[a-zA-Z]{3,}/.test(str);

// To avoid duplicate examples in report
let examplesAdded = 0;

for (const lang of langs) {
    if (lang === 'ko') continue;
    
    for (const key of checkList) {
        const valKo = localeData['ko'][key];
        const valLang = localeData[lang]?.[key];
        
        // Mismatch is implicitly checked since if it's an object instead of string it wouldn't match correctly or flattening handles it differently
        if (valLang === undefined) {
             results.missing[lang]++;
        } else if (valLang === null || String(valLang).trim() === '') {
             results.empty[lang]++;
        } else {
             if (valLang === valKo && valKo && valKo.trim() !== '' && !/^[\W_]+$/.test(valKo)) {
                 if (containsHangul(valLang)) {
                    results.suspiciousCount[lang]++;
                    if (examplesAdded < 10) {
                        results.examples.suspicious.push({ lang, key, type: 'Korean copied', val: valLang });
                        examplesAdded++;
                    }
                 }
             }
             if (lang !== 'en' && containsEnglishWordList(valLang) && valLang === localeData['en']?.[key]) {
                  results.suspiciousCount[lang]++;
                  if (examplesAdded < 10) {
                        results.examples.suspicious.push({ lang, key, type: 'English copied', val: valLang });
                        examplesAdded++;
                    }
             }
        }
    }
}

fs.writeFileSync(path.join(__dirname, 'audit_summary.json'), JSON.stringify(results, null, 2));
