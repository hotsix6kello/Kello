const fs = require('fs');
const path = require('path');

// Re-creating the objects roughly to produce English defaults.
const storeNames = {
  beauty_hair_1: "La Frappe Hair Gangnam", beauty_hair_2: "Atelier Seongsu Hair Room",
  beauty_nail_1: "Maison Nail Hongdae", beauty_nail_2: "Beige Nail Jamsil",
  beauty_esthetic_1: "Serin Skin Lounge Pangyo", beauty_esthetic_2: "Glow Formula Konkuk",
  beauty_waxing_1: "Bare Atelier Waxing Gangnam", beauty_waxing_2: "Soft Strip Hongdae",
  beauty_makeup_1: "Atelier Veil Makeup Seongsu", beauty_makeup_2: "Dear Muse Makeup Jamsil",
  beauty_lash_1: "Bloom Lash Boutique Gangnam", beauty_lash_2: "Feather Lash Konkuk"
};

const designerNames = {
  designer_hair_1_a: "Jia Designer", designer_hair_1_b: "Director Minseo",
  designer_hair_2_a: "Designer Harin", designer_hair_2_b: "Manager Yoona",
  designer_nail_1_a: "Artist Seoyoon", designer_nail_1_b: "Artist Chaerin",
  designer_nail_2_a: "Manager Nayeon", designer_nail_2_b: "Artist Dabin",
  designer_esthetic_1_a: "Therapist Yoojin", designer_esthetic_1_b: "Director Sohee",
  designer_esthetic_2_a: "Therapist Gayoung", designer_esthetic_2_b: "Manager Yerin",
  designer_waxing_1_a: "Manager Doyeon", designer_waxing_1_b: "Director Hyunah",
  designer_waxing_2_a: "Manager Sia", designer_waxing_2_b: "Manager Joohee",
  designer_makeup_1_a: "Artist Bora", designer_makeup_1_b: "Manager Sua",
  designer_makeup_2_a: "Artist Jimin", designer_makeup_2_b: "Director Hyewon",
  designer_lash_1_a: "Artist Sojung", designer_lash_1_b: "Manager Seah",
  designer_lash_2_a: "Artist Daeun", designer_lash_2_b: "Director Sieun"
};

const serviceNames = {
  hair_women_cut: "Women's Cut", hair_men_cut: "Men's Cut", hair_root_color: "Root Color", hair_clinic: "Hair Clinic",
  nail_gel: "Gel Nail", nail_care: "Nail Care", nail_pedi: "Gel Pedi",
  esthetic_calming: "Calming Care", esthetic_moisture: "Moisture Care", esthetic_lifting: "Lifting Care",
  waxing_brazilian: "Brazilian Waxing", waxing_arm: "Arm Waxing", waxing_leg: "Leg Waxing",
  makeup_daily: "Daily Makeup", makeup_interview: "Interview Makeup", makeup_guest: "Wedding Guest Makeup",
  lash_perm: "Lash Perm", lash_extension: "Lash Extension", lash_retouch: "Lash Retouch"
};

const addOnNames = {
  hair_add_scalp: "Scalp Scaling", hair_add_blowdry: "Blow Dry", hair_add_ampoule: "Ampoule Care",
  nail_add_removal: "Gel Removal", nail_add_art: "Point Art", nail_add_strength: "Strength Coating",
  esthetic_add_modeling: "Modeling Pack", esthetic_add_neck: "Neck Care", esthetic_add_led: "LED Care",
  waxing_add_care: "Soothing Care", waxing_add_pack: "Moisture Pack", waxing_add_trim: "Trimming Included",
  makeup_add_hair: "Hair Styling", makeup_add_lash: "Lash Attachment", makeup_add_touchup: "Touch-up Kit",
  lash_add_remove: "Lash Removal", lash_add_tinting: "Black Tinting", lash_add_coating: "Nutrition Coating"
};

const locales = ['ko', 'en', 'ja', 'zh-CN', 'zh-HK', 'vi', 'th', 'id', 'ms'];
const basePath = path.join(process.cwd(), 'public', 'locales');

for (const lang of locales) {
  const file = path.join(basePath, lang, 'beauty_explore.json');
  if (fs.existsSync(file)) {
    let raw = fs.readFileSync(file, 'utf8');
    let data = JSON.parse(raw);
    
    // Fall back non-KO to english stubs for all fields.
    const isKo = lang === 'ko';

    if (!data.stores) data.stores = {};
    for (const [id, enName] of Object.entries(storeNames)) {
      if (!data.stores[id]) data.stores[id] = {};
      data.stores[id].name = isKo ? data.stores[id].name || enName : enName;
      data.stores[id].shortDescription = isKo ? data.stores[id].shortDescription || "프리미엄 샵입니다." : "A premium studio.";
      data.stores[id].priceLabel = isKo ? data.stores[id].priceLabel || "55,000원~" : "From 55,000 KRW";
    }

    if (!data.designers) Object.assign(data, { designers: {} });
    for (const [id, enName] of Object.entries(designerNames)) {
      if (!data.designers[id]) data.designers[id] = {};
      data.designers[id].name = isKo ? data.designers[id].name || enName : enName;
      data.designers[id].specialty = isKo ? "전문 스타일" : "Specialty";
      data.designers[id].experienceLabel = isKo ? "경력자" : "Experienced";
      data.designers[id].shortNote = isKo ? "친절한 상담 제공" : "Friendly consultation available";
    }

    if (!data.services) data.services = {};
    for (const [id, enName] of Object.entries(serviceNames)) {
      if (!data.services[id]) data.services[id] = {};
      data.services[id].name = isKo ? data.services[id].name || enName : enName;
      data.services[id].desc = isKo ? "시술 설명입니다." : "Service Description";
    }

    for (const [id, enName] of Object.entries(addOnNames)) {
      if (!data.services[id]) data.services[id] = {};
      data.services[id].name = isKo ? data.services[id].name || enName : enName;
      data.services[id].desc = isKo ? "옵션 설명입니다." : "Option Description";
    }

    data.intent_booking_confirm = isKo ? '예약 확인' : 'Booking Confirmation';
    data.intent_service_request = isKo ? '시술 요청 전달' : 'Service Request';
    data.intent_allergy_notice = isKo ? '알레르기/민감 사항 전달' : 'Allergy/Sensitivity Notice';
    data.intent_style_consultation = isKo ? '스타일 상담 도움' : 'Style Consultation Help';

    // also some basic keys
    data.lang_ko = isKo ? '한국어' : 'Korean';
    data.lang_en = isKo ? '영어' : 'English';
    data.lang_ja = isKo ? '일본어' : 'Japanese';
    data.lang_zh_cn = isKo ? '중국어' : 'Chinese';

    data.form_request_placeholder = isKo ? '매장에 전달하실 내용을 적어주세요' : 'Please leave a request for the salon';

    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  }
}
console.log('Update dictionaries complete');
