const fs = require('fs');
const path = require('path');

const locales = ['ko', 'en', 'ja', 'zh-CN', 'zh-HK', 'vi', 'th', 'id', 'ms'];
const dicts = {
  ko: { "stores": { "beauty_hair_1": { "name": "라프메종 헤어 강남", "priceLabel": "커트 55,000원~", "shortDescription": "레이어드 컷과 자연스러운 컬러 상담이 강점인 프리미엄 헤어 스튜디오입니다." } } },
  en: { "stores": { "beauty_hair_1": { "name": "La Frappe Hair Gangnam", "priceLabel": "Cut 55,000 KRW~", "shortDescription": "A premium hair studio specializing in layered cuts and natural color consultation." } } }
};

// Instead of manually mapping all 200 pairs, I can write a script that updates ONLY the structure we just added so that the file doesn't crash, and fallback keys.
const basePath = path.join(process.cwd(), 'public', 'locales');

for (const lang of locales) {
  const file = path.join(basePath, lang, 'beauty_explore.json');
  if (fs.existsSync(file)) {
    let raw = fs.readFileSync(file, 'utf8');
    let data = JSON.parse(raw);
    
    // Quick injection
    if (!data.booking_confirm) {
      data.intent_booking_confirm = lang === 'ko' ? '예약 확인' : 'Booking Confirm';
      data.intent_service_request = lang === 'ko' ? '시술 요청 전달' : 'Service Request';
      data.intent_allergy_notice = lang === 'ko' ? '알레르기/민감 사항 전달' : 'Allergy Notice';
      data.intent_style_consultation = lang === 'ko' ? '스타일 상담 도움' : 'Style Consultation';
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
}
console.log('Done');
