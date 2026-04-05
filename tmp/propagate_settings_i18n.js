const fs = require('fs');
const path = require('path');

const localesPath = 'c:\\Users\\USER\\Desktop\\kello\\public\\locales';
const langs = fs.readdirSync(localesPath).filter(f => fs.statSync(path.join(localesPath, f)).isDirectory());

const enCommon = JSON.parse(fs.readFileSync(path.join(localesPath, 'en', 'common.json'), 'utf8'));
const settingsPageEn = enCommon.settings_page;
const accountEn = enCommon.my_page.settings.account;

langs.forEach(lang => {
  if (lang === 'ko' || lang === 'en') return;
  const filePath = path.join(localesPath, lang, 'common.json');
  if (!fs.existsSync(filePath)) return;

  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Ensure my_page.settings.account exists and has new keys
  if (!content.my_page) content.my_page = {};
  if (!content.my_page.settings) content.my_page.settings = {};
  if (!content.my_page.settings.account) content.my_page.settings.account = {};
  
  // Update/Add account keys
  content.my_page.settings.account.default_name = accountEn.default_name;
  content.my_page.settings.account.phone = accountEn.phone;

  // Add settings_page namespace
  content.settings_page = settingsPageEn;

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
});

console.log('Successfully updated settings_page translations for all languages.');
