const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'public/locales');
const langs = ['en', 'jp', 'cn', 'tw', 'vi', 'th', 'ar'];

const koPath = path.join(localesDir, 'ko', 'common.json');
const koData = JSON.parse(fs.readFileSync(koPath, 'utf8'));
const enPath = path.join(localesDir, 'en', 'common.json');
let enData = {};
if(fs.existsSync(enPath)) enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

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

const koFlat = flattenObj(koData.community_page || {});
const enFlat = flattenObj(enData.community_page || {});

const toTranslate = {};

for (const lang of langs) {
    const langPath = path.join(localesDir, lang, 'common.json');
    const langData = fs.existsSync(langPath) ? JSON.parse(fs.readFileSync(langPath, 'utf8')) : {};
    const langFlat = flattenObj(langData.community_page || {});

    for (const [key, koVal] of Object.entries(koFlat)) {
        const langVal = langFlat[key];
        const enVal = enFlat[key];
        
        // condition: missing OR fallback
        // fallback condition: langVal matches English (and lang is not en) OR langVal matches Korean. 
        // to be strict, let's just say if it's missing or equals enVal (for vi, th, ar, jp, cn, tw if not en).
        let needsTranslation = false;
        
        if (langVal === undefined || String(langVal).trim() === '') {
            needsTranslation = true;
        } else if (lang !== 'en' && typeof langVal === 'string') {
            if (langVal === enVal && /[a-zA-Z]{3,}/.test(langVal)) needsTranslation = true;
            if (langVal === koVal && /[가-힣]/.test(langVal)) needsTranslation = true;
        }

        if (needsTranslation) {
            if (!toTranslate[koVal]) toTranslate[koVal] = {};
            if (!toTranslate[koVal].keys) toTranslate[koVal].keys = [];
            toTranslate[koVal].keys.push(key);
            if (!toTranslate[koVal].langs) toTranslate[koVal].langs = [];
            if (!toTranslate[koVal].langs.includes(lang)) toTranslate[koVal].langs.push(lang);
        }
    }
}

fs.writeFileSync(path.join(__dirname, 'to_translate.json'), JSON.stringify(toTranslate, null, 2));
console.log(`Unique Korean phrases to translate: ${Object.keys(toTranslate).length}`);
