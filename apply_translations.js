const fs = require('fs');
const path = require('path');
const dict = require('./community_dict.js');

const localesDir = path.join(__dirname, 'public/locales');
const langs = ['en', 'jp', 'cn', 'tw', 'vi', 'th', 'ar'];
const koPath = path.join(localesDir, 'ko', 'common.json');
const koData = JSON.parse(fs.readFileSync(koPath, 'utf8'));

// Helper to check if string contains English words
const containsEnglishWordList = (str) => typeof str === 'string' && /[a-zA-Z]{3,}/.test(str);
// Helper to check if string contains Hangul
const containsHangul = (str) => typeof str === 'string' && /[가-힣]/.test(str);

let replacedCounts = {};
let missingCounts = {};

const enPath = path.join(localesDir, 'en', 'common.json');
const enData = fs.existsSync(enPath) ? JSON.parse(fs.readFileSync(enPath, 'utf8')) : {};
function getEnValue(keyPathObj, currentPath) {
    // simplified lookup
    let current = enData;
    for (const p of currentPath) {
        if (!current) return undefined;
        current = current[p];
    }
    return current;
}

for (const lang of langs) {
    replacedCounts[lang] = 0;
    missingCounts[lang] = 0;
    const langPath = path.join(localesDir, lang, 'common.json');
    if (!fs.existsSync(langPath)) continue;

    let langData = JSON.parse(fs.readFileSync(langPath, 'utf8'));

    function processNode(koNode, langNode, currentPath) {
        let changed = false;
        
        // initialize if undefined
        if (typeof koNode === 'object' && koNode !== null && !Array.isArray(koNode)) {
            if (typeof langNode !== 'object' || langNode === null) {
                // Should not happen structurally, but just in case
                langNode = {};
                changed = true;
            }
            
            for (const key of Object.keys(koNode)) {
                if (langNode[key] === undefined) {
                    // Create if missing
                    if (typeof koNode[key] === 'object' && koNode[key] !== null) {
                         langNode[key] = {};
                    } else {
                         langNode[key] = "";
                    }
                    changed = true;
                }
                
                const pathParts = [...currentPath, key];
                const nodeChanged = processNode(koNode[key], langNode[key], pathParts);
                if (nodeChanged) {
                    // Because Javascript objects are passed by reference, assigning it is redundant 
                    // unless we completely replaced a node, but processNode mutates.
                    // Except when langNode[key] was a primitive string that got updated.
                    if (typeof langNode[key] !== 'object') {
                        // The child call doesn't mutate primitive. We need to handle primitives at this level!
                    }
                    changed = true;
                }
                
                // primitive handling
                if (typeof koNode[key] === 'string') {
                    const koVal = koNode[key];
                    let currentLangVal = langNode[key];
                    const enVal = getEnValue({}, pathParts);

                    let needsReplace = false;

                    // 1. Missing or completely empty
                    if (currentLangVal === undefined || currentLangVal === null || currentLangVal === "") {
                        needsReplace = true;
                    } 
                    // 2. English copy-paste (fallback) in non-en
                    else if (lang !== 'en' && currentLangVal === enVal && containsEnglishWordList(currentLangVal)) {
                        needsReplace = true;
                    }
                    // 3. Korean copy-paste
                    else if (currentLangVal === koVal && containsHangul(currentLangVal)) {
                        needsReplace = true;
                    }

                    if (needsReplace) {
                        // Look up in dict
                        const dEntry = dict[koVal];
                        if (dEntry && dEntry[lang]) {
                            langNode[key] = dEntry[lang];
                            replacedCounts[lang]++;
                            changed = true;
                        } else {
                            if (dEntry && lang === 'en') {
                                // sometimes en is missing but we have it in dict
                                langNode[key] = dEntry['en'];
                                replacedCounts[lang]++;
                                changed = true;
                            } else {
                                // console.log('Missing dict for', koVal, lang);
                                missingCounts[lang]++;
                            }
                        }
                    }
                }
            }
        }
        return changed; // return if mutated
    }

    // We only process community_page
    if (koData.community_page) {
        if (!langData.community_page) langData.community_page = {};
        const isChanged = processNode(koData.community_page, langData.community_page, ['community_page']);
        if (isChanged || replacedCounts[lang] > 0) {
            fs.writeFileSync(langPath, JSON.stringify(langData, null, 2) + '\n');
        }
    }
}

console.log(JSON.stringify({ replacedCounts, missingCounts }));
