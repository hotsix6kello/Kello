const fs = require('fs');

const languages = {
    ar: {
        tab3: "دورة 3 أيام", tab5: "دورة 5 أيام",
        title3: "3 أيام: دورة تجميل سيول", intro3: "أظافر → شعر → عناية بالبشرة في 3 أيام",
        title5: "5 أيام: دورة التجميل الكاملة", intro5: "مجموعة كاملة مع جولات سياحية متكاملة",
        kw3: "أظافر, شعر, عناية, هونغ داي", kw5: "أظافر, مكياج, سياحة",
        d1: "الوصول وتسجيل الدخول",
        d2: "تجميل الأظافر والشعر والتسوق",
        d3: "العناية بالبشرة والمغادرة",
        d4: "إزالة الشعر والتسوق",
        d5: "المكياج وصور تذكارية والمغادرة",
        view: "عرض الجدول الكامل", close: "إغلاق الجدول"
    },
    cn: {
        tab3: "3日行程", tab5: "5日行程",
        title3: "3天：首尔美容速成班", intro3: "美甲 → 美发 → 护肤，3天压缩完成",
        title5: "5天：首尔美容全方位", intro5: "美甲/护肤/脱毛/化妆全套，完美结合观光",
        kw3: "美甲, 美发, 护肤, 弘大", kw5: "美甲, 化妆, 观光",
        d1: "抵达与入住，周边散步",
        d2: "上午弘大美甲，下午清潭洞美发，晚上观光",
        d3: "上午明洞护肤，下午购物与回国",
        d4: "江南脱毛与林荫道购物",
        d5: "韩国化妆体验与打卡，前往机场",
        view: "查看完整日程", close: "收起日程"
    },
    de: {
        tab3: "3-Tage-Kurs", tab5: "5-Tage-Kurs",
        title3: "3 Tage: Seoul Beauty Sprint", intro3: "Nägel → Haare → Gesichtsbehandlung, kompakt in 3 Tagen.",
        title5: "5 Tage: Beauty Komplettpaket", intro5: "Volles Programm inkl. Nägel/Haut/Wachsen/Make-up mit Sightseeing.",
        kw3: "Nägel, Haare, Hautpflege", kw5: "Nägel, Make-up, Sightseeing",
        d1: "Ankunft & Check-in",
        d2: "Vormittags Nägel, Nachmittags Haare, Abends Tour",
        d3: "Gesichtsbehandlung, Shopping & Abreise",
        d4: "Wachsen (Gangnam) & Shopping",
        d5: "Make-up Styling & Abreise",
        view: "Vollständigen Plan ansehen", close: "Plan schließen"
    },
    en: {
        tab3: "3-Day Course", tab5: "5-Day Course",
        title3: "3 Days: Seoul Beauty Sprint", intro3: "Nail → Hair → Facial, tightly packed in 3 days with booking help.",
        title5: "5 Days: Seoul Beauty Full Course", intro5: "Nail/Skincare/Waxing/Makeup full set. Sightseeing fits perfectly.",
        kw3: "Nail, Hair, Skincare, Hongdae", kw5: "Nail, Makeup, Sightseeing",
        d1: "Arrival & Check-in (Myeongdong/Hongdae), Night Walk",
        d2: "AM Nail Art, PM Hair Styling, Evening Tour",
        d3: "AM Facial, PM Shopping & Airport Departure",
        d4: "AM Waxing, PM Garosu-gil Shopping",
        d5: "AM Makeup/Hair Styling, Photo Spot & Departure",
        view: "View Full Schedule", close: "Close Schedule"
    },
    es: {
        tab3: "Curso 3 días", tab5: "Curso 5 días",
        title3: "3 Días: Curso de Belleza Exprés", intro3: "Uñas → Cabello → Facial en 3 días compactos.",
        title5: "5 Días: Curso de Belleza Completo", intro5: "Uñas/Cuidado de piel/Depilación/Maquillaje + Turismo.",
        kw3: "Uñas, Cabello, Cuidado piel", kw5: "Uñas, Maquillaje, Turismo",
        d1: "Llegada y Check-in",
        d2: "Mañana Uñas, Tarde Cabello, Noche Tour",
        d3: "Tratamiento facial, Compras y Salida",
        d4: "Depilación y Compras en Garosu-gil",
        d5: "Maquillaje Estilo K-pop y Salida",
        view: "Ver programa completo", close: "Cerrar programa"
    },
    fr: {
        tab3: "Cours 3 Jours", tab5: "Cours 5 Jours",
        title3: "3 Jours : Beauté Express", intro3: "Ongles → Cheveux → Soins du visage en 3 jours intenses.",
        title5: "5 Jours : Beauté Complète", intro5: "Ensemble complet : Ongles/Peau/Épilation/Maquillage avec tourisme.",
        kw3: "Ongles, Cheveux, Soin Peau", kw5: "Ongles, Maquillage, Tourisme",
        d1: "Arrivée et Check-in",
        d2: "Matin Ongles, Après-midi Cheveux, Soirée Tour",
        d3: "Soin visage, Shopping et Départ",
        d4: "Épilation (Gangnam) et Shopping",
        d5: "Maquillage et Départ",
        view: "Voir le programme complet", close: "Fermer le programme"
    },
    id: {
        tab3: "Kursus 3 Hari", tab5: "Kursus 5 Hari",
        title3: "3 Hari: Beauty Sprint Seoul", intro3: "Kuku → Rambut → Wajah dalam 3 hari singkat.",
        title5: "5 Hari: Kursus Beauty Lengkap", intro5: "Paket lengkap kuku/kulit/make-up ditambah jalan-jalan.",
        kw3: "Kuku, Rambut, Skincare", kw5: "Kuku, Make-up, Wisata",
        d1: "Kedatangan & Check-in",
        d2: "Pagi Kuku, Siang Rambut, Malam Jalan-jalan",
        d3: "Perawatan Wajah, Belanja & Pulang",
        d4: "Waxing (Gangnam) & Belanja",
        d5: "K-pop Make-up & Pulang",
        view: "Lihat Jadwal Lengkap", close: "Tutup Jadwal"
    },
    jp: {
        tab3: "3日間コース", tab5: "5日間コース",
        title3: "3日間：ソウル美容圧縮コース", intro3: "ネイル → ヘア → スキンケアまで、3日で効率よく！",
        title5: "5日間：ソウル美容フルコース", intro5: "ネイル/肌/ワックス/メイクのフルセット。観光も充実。",
        kw3: "ネイル, ヘア, スキンケア", kw5: "ネイル, メイク, 観光",
        d1: "入国＆チェックイン",
        d2: "午前：弘大ネイル、午後：清潭洞ヘア、夜：観光",
        d3: "午前：明洞スキンケア、午後：買い物＆帰国",
        d4: "午前：江南ワックス、午後：カロスキル買い物",
        d5: "午前：K-POPメイク体験、午後：空港へ",
        view: "全日程を見る", close: "閉じる"
    },
    ko: {
        tab3: "3일차 코스", tab5: "5일차 코스",
        title3: "3일: 서울 뷰티 압축 코스", intro3: "네일 → 헤어 → 페이셜까지, 예약대행으로 3일 압축 완성",
        title5: "5일: 서울 뷰티 풀코스", intro5: "네일/피부/왁싱/메이크업까지 풀세트. 관광은 동선에 맞춰 끼워넣기",
        kw3: "네일, 헤어, 스킨케어, 홍대", kw5: "네일, 헤어, 메이크업, 관광",
        d1: "입국 및 체크인 (명동/홍대/강남), 저녁 식사 및 야간 산책",
        d2: "오전 홍대 네일아트, 오후 청담 헤어 스타일링, 저녁 투어",
        d3: "오전 명동 페이셜 관리, 점심, 오후 쇼핑 및 출국",
        d4: "오전 강남 왁싱, 점심, 오후 가로수길 쇼핑, 저녁",
        d5: "오전 메이크업/헤어 스타일링, 오후 핫플 인증샷 및 출국",
        view: "전체 일정 열기", close: "일정 닫기"
    },
    ms: {
        tab3: "Kursus 3 Hari", tab5: "Kursus 5 Hari",
        title3: "3 Hari: K-Beauty Ekspres", intro3: "Kuku → Rambut → Wajah dalam 3 hari padat.",
        title5: "5 Hari: Set Lengkap K-Beauty", intro5: "Set lengkap kuku/penjagaan kulit/make-up dan bersiar-siar.",
        kw3: "Kuku, Rambut, Kulit", kw5: "Kuku, Make-up, Pelancongan",
        d1: "Ketibaan & Daftar masuk",
        d2: "Pagi Kuku, Petang Rambut, Malam Melawat",
        d3: "Rawatan Wajah, Beli-belah & Pulang",
        d4: "Waxing & Membeli-belah",
        d5: "Gaya Make-up & Pulang",
        view: "Lihat Jadual Penuh", close: "Tutup Jadual"
    },
    pt: {
        tab3: "Curso 3 Dias", tab5: "Curso 5 Dias",
        title3: "3 Dias: Sprint de Beleza", intro3: "Unhas → Cabelo → Facial em 3 dias compactados.",
        title5: "5 Dias: Curso Completo", intro5: "Conjunto completo com Unhas/Pele/Maquiagem e Turismo.",
        kw3: "Unhas, Cabelo, Pele", kw5: "Unhas, Maquiagem, Turismo",
        d1: "Chegada e Check-in",
        d2: "Manhã Unhas, Tarde Cabelo, Noite Turismo",
        d3: "Facial, Compras e Partida",
        d4: "Depilação e Compras",
        d5: "Maquiagem e Partida",
        view: "Ver Cronograma Completo", close: "Fechar Cronograma"
    },
    ru: {
        tab3: "3-дневный курс", tab5: "5-дневный курс",
        title3: "3 Дня: Экспресс Красота в Сеуле", intro3: "Ногти → Волосы → Лицо за 3 дня с бронированием.",
        title5: "5 Дней: Полный Курс Красоты", intro5: "Весь набор: Ногти/Кожа/Эпиляция/Макияж + Туризм.",
        kw3: "Ногти, Волосы, Уход за кожей", kw5: "Ногти, Макияж, Туризм",
        d1: "Прибытие и Заселение",
        d2: "Утром - Ногти, Днем - Прическа, Вечером - Прогулка",
        d3: "Утром - Уход за лицом, Покупки и Отъезд",
        d4: "Утром - Эпиляция, Днем - Шоппинг",
        d5: "Макияж, Фотосессия и Отъезд",
        view: "Показать полное расписание", close: "Скрыть расписание"
    },
    th: {
        tab3: "คอร์ส 3 วัน", tab5: "คอร์ส 5 วัน",
        title3: "3 วัน: ความงามโซลแบบเร่งรัด", intro3: "เล็บ → ทำผม → ผิวหน้า แน่นๆ ใน 3 วัน",
        title5: "5 วัน: ความงามโซลแบบครบเซ็ต", intro5: "ครบชุด: เล็บ/ผิวหน้า/แว็กซ์/แต่งหน้า รวมถึงการเที่ยว",
        kw3: "เล็บ, ทำผม, สกินแคร์", kw5: "เล็บ, แต่งหน้า, ท่องเที่ยว",
        d1: "เดินทางถึง & เช็คอิน",
        d2: "เช้า: ทำเล็บฮงแด, บ่าย: ทำผมชองดัม, กลางคืน: เที่ยว",
        d3: "เช้า: นวดหน้า, บ่าย: ช้อปปิ้ง & กลับ",
        d4: "เช้า: แว็กซ์ขน, บ่าย: ช้อปปิ้งคาโรซูกิล",
        d5: "เช้า: แต่งหน้าและผม, บ่าย: เดินเล่นซองซู & กลับ",
        view: "ดูรายละเอียดทั้งหมด", close: "ปิดดูรายละเอียด"
    },
    tw: {
        tab3: "3日行程", tab5: "5日行程",
        title3: "3天：首爾美容速成班", intro3: "美甲 → 美髮 → 護膚，3天壓縮完成",
        title5: "5天：首爾美容全方位", intro5: "美甲/護膚/脫毛/化妝全套，完美結合觀光",
        kw3: "美甲, 美髮, 護膚", kw5: "美甲, 化妝, 觀光",
        d1: "抵達與入住，周邊散步",
        d2: "上午弘大美甲，下午清潭洞美髮，晚上觀光",
        d3: "上午明洞護膚，下午購物與回國",
        d4: "江南脫毛與林蔭道購物",
        d5: "韓國化妝體驗與打卡，前往機場",
        view: "查看完整日程", close: "收起日程"
    },
    vi: {
        tab3: "Khóa 3 Ngày", tab5: "Khóa 5 Ngày",
        title3: "3 Ngày: Làm đẹp siêu tốc", intro3: "Nail → Tóc → Chăm sóc da trong 3 ngày gọn gàng.",
        title5: "5 Ngày: Khóa Làm đẹp Toàn diện", intro5: "Trọn bộ Nail/Da/Waxing/Trang điểm kết hợp du lịch.",
        kw3: "Nail, Tóc, Dưỡng da", kw5: "Nail, Make-up, Du lịch",
        d1: "Đến nơi & Nhận phòng",
        d2: "Sáng làm Nail, Chiều làm tóc, Tối dạo phố",
        d3: "Sáng chăm sóc da, Chiều mua sắm & Về nước",
        d4: "Sáng Waxing, Chiều mua sắm Garosu-gil",
        d5: "Sáng Make-up, Chụp ảnh check-in & Về nước",
        view: "Xem toàn bộ lịch trình", close: "Đóng lịch trình"
    }
};

let outputData = `export interface PlanTemplate {
  id: string;
  title: string;
  tabLabel: string;
  shortIntro: string;
  keywords: string[];
  itinerary: { day: number; label: string; desc: string }[];
  viewFull: string;
  closeFull: string;
}

export const TRAVEL_PLAN_TEMPLATES: Record<string, PlanTemplate[]> = {\n`;

for (const [lang, loc] of Object.entries(languages)) {
    outputData += `  "${lang}": [
    {
      id: 'plan-3days',
      title: \`${loc.title3}\`,
      tabLabel: \`${loc.tab3}\`,
      shortIntro: \`${loc.intro3}\`,
      keywords: \`${loc.kw3}\`.split(',').map(s=>s.trim()),
      viewFull: \`${loc.view}\`,
      closeFull: \`${loc.close}\`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: \`${loc.d1}\` },
        { day: 2, label: 'Day 2', desc: \`${loc.d2}\` },
        { day: 3, label: 'Day 3', desc: \`${loc.d3}\` }
      ]
    },
    {
      id: 'plan-5days',
      title: \`${loc.title5}\`,
      tabLabel: \`${loc.tab5}\`,
      shortIntro: \`${loc.intro5}\`,
      keywords: \`${loc.kw5}\`.split(',').map(s=>s.trim()),
      viewFull: \`${loc.view}\`,
      closeFull: \`${loc.close}\`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: \`${loc.d1}\` },
        { day: 2, label: 'Day 2', desc: \`${loc.d2}\` },
        { day: 3, label: 'Day 3', desc: \`${loc.d3}\` },
        { day: 4, label: 'Day 4', desc: \`${loc.d4}\` },
        { day: 5, label: 'Day 5', desc: \`${loc.d5}\` }
      ]
    }
  ],\n`;
}

outputData += `};

export const getTravelPlanTemplatesByLanguage = (lang: string = 'ko') => {
  const baseLang = lang.split('-')[0];
  return TRAVEL_PLAN_TEMPLATES[baseLang] || TRAVEL_PLAN_TEMPLATES['en'];
};
`;

fs.writeFileSync('src/app/components/travelPlanData.ts', outputData);
console.log('travelPlanData.ts generated with 15 languages!');
