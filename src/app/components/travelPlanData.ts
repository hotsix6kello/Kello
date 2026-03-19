export interface PlanTemplate {
  id: string;
  title: string;
  tabLabel: string;
  shortIntro: string;
  keywords: string[];
  itinerary: { day: number; label: string; desc: string }[];
  viewFull: string;
  closeFull: string;
}

export const TRAVEL_PLAN_TEMPLATES: Record<string, PlanTemplate[]> = {
  "ar": [
    {
      id: 'plan-3days',
      title: `3 أيام: دورة تجميل سيول`,
      tabLabel: `دورة 3 أيام`,
      shortIntro: `أظافر → شعر → عناية بالبشرة في 3 أيام`,
      keywords: `أظافر, شعر, عناية, هونغ داي`.split(',').map(s=>s.trim()),
      viewFull: `عرض الجدول الكامل`,
      closeFull: `إغلاق الجدول`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `الوصول وتسجيل الدخول` },
        { day: 2, label: 'Day 2', desc: `تجميل الأظافر والشعر والتسوق` },
        { day: 3, label: 'Day 3', desc: `العناية بالبشرة والمغادرة` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 أيام: دورة التجميل الكاملة`,
      tabLabel: `دورة 5 أيام`,
      shortIntro: `مجموعة كاملة مع جولات سياحية متكاملة`,
      keywords: `أظافر, مكياج, سياحة`.split(',').map(s=>s.trim()),
      viewFull: `عرض الجدول الكامل`,
      closeFull: `إغلاق الجدول`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `الوصول وتسجيل الدخول` },
        { day: 2, label: 'Day 2', desc: `تجميل الأظافر والشعر والتسوق` },
        { day: 3, label: 'Day 3', desc: `العناية بالبشرة والمغادرة` },
        { day: 4, label: 'Day 4', desc: `إزالة الشعر والتسوق` },
        { day: 5, label: 'Day 5', desc: `المكياج وصور تذكارية والمغادرة` }
      ]
    }
  ],
  "cn": [
    {
      id: 'plan-3days',
      title: `3天：首尔美容速成班`,
      tabLabel: `3日行程`,
      shortIntro: `美甲 → 美发 → 护肤，3天压缩完成`,
      keywords: `美甲, 美发, 护肤, 弘大`.split(',').map(s=>s.trim()),
      viewFull: `查看完整日程`,
      closeFull: `收起日程`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `抵达与入住，周边散步` },
        { day: 2, label: 'Day 2', desc: `上午弘大美甲，下午清潭洞美发，晚上观光` },
        { day: 3, label: 'Day 3', desc: `上午明洞护肤，下午购物与回国` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5天：首尔美容全方位`,
      tabLabel: `5日行程`,
      shortIntro: `美甲/护肤/脱毛/化妆全套，完美结合观光`,
      keywords: `美甲, 化妆, 观光`.split(',').map(s=>s.trim()),
      viewFull: `查看完整日程`,
      closeFull: `收起日程`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `抵达与入住，周边散步` },
        { day: 2, label: 'Day 2', desc: `上午弘大美甲，下午清潭洞美发，晚上观光` },
        { day: 3, label: 'Day 3', desc: `上午明洞护肤，下午购物与回国` },
        { day: 4, label: 'Day 4', desc: `江南脱毛与林荫道购物` },
        { day: 5, label: 'Day 5', desc: `韩国化妆体验与打卡，前往机场` }
      ]
    }
  ],
  "de": [
    {
      id: 'plan-3days',
      title: `3 Tage: Seoul Beauty Sprint`,
      tabLabel: `3-Tage-Kurs`,
      shortIntro: `Nägel → Haare → Gesichtsbehandlung, kompakt in 3 Tagen.`,
      keywords: `Nägel, Haare, Hautpflege`.split(',').map(s=>s.trim()),
      viewFull: `Vollständigen Plan ansehen`,
      closeFull: `Plan schließen`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Ankunft & Check-in` },
        { day: 2, label: 'Day 2', desc: `Vormittags Nägel, Nachmittags Haare, Abends Tour` },
        { day: 3, label: 'Day 3', desc: `Gesichtsbehandlung, Shopping & Abreise` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Tage: Beauty Komplettpaket`,
      tabLabel: `5-Tage-Kurs`,
      shortIntro: `Volles Programm inkl. Nägel/Haut/Wachsen/Make-up mit Sightseeing.`,
      keywords: `Nägel, Make-up, Sightseeing`.split(',').map(s=>s.trim()),
      viewFull: `Vollständigen Plan ansehen`,
      closeFull: `Plan schließen`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Ankunft & Check-in` },
        { day: 2, label: 'Day 2', desc: `Vormittags Nägel, Nachmittags Haare, Abends Tour` },
        { day: 3, label: 'Day 3', desc: `Gesichtsbehandlung, Shopping & Abreise` },
        { day: 4, label: 'Day 4', desc: `Wachsen (Gangnam) & Shopping` },
        { day: 5, label: 'Day 5', desc: `Make-up Styling & Abreise` }
      ]
    }
  ],
  "en": [
    {
      id: 'plan-3days',
      title: `3 Days: Seoul Beauty Sprint`,
      tabLabel: `3-Day Course`,
      shortIntro: `Nail → Hair → Facial, tightly packed in 3 days with booking help.`,
      keywords: `Nail, Hair, Skincare, Hongdae`.split(',').map(s=>s.trim()),
      viewFull: `View Full Schedule`,
      closeFull: `Close Schedule`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Arrival & Check-in (Myeongdong/Hongdae), Night Walk` },
        { day: 2, label: 'Day 2', desc: `AM Nail Art, PM Hair Styling, Evening Tour` },
        { day: 3, label: 'Day 3', desc: `AM Facial, PM Shopping & Airport Departure` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Days: Seoul Beauty Full Course`,
      tabLabel: `5-Day Course`,
      shortIntro: `Nail/Skincare/Waxing/Makeup full set. Sightseeing fits perfectly.`,
      keywords: `Nail, Makeup, Sightseeing`.split(',').map(s=>s.trim()),
      viewFull: `View Full Schedule`,
      closeFull: `Close Schedule`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Arrival & Check-in (Myeongdong/Hongdae), Night Walk` },
        { day: 2, label: 'Day 2', desc: `AM Nail Art, PM Hair Styling, Evening Tour` },
        { day: 3, label: 'Day 3', desc: `AM Facial, PM Shopping & Airport Departure` },
        { day: 4, label: 'Day 4', desc: `AM Waxing, PM Garosu-gil Shopping` },
        { day: 5, label: 'Day 5', desc: `AM Makeup/Hair Styling, Photo Spot & Departure` }
      ]
    }
  ],
  "es": [
    {
      id: 'plan-3days',
      title: `3 Días: Curso de Belleza Exprés`,
      tabLabel: `Curso 3 días`,
      shortIntro: `Uñas → Cabello → Facial en 3 días compactos.`,
      keywords: `Uñas, Cabello, Cuidado piel`.split(',').map(s=>s.trim()),
      viewFull: `Ver programa completo`,
      closeFull: `Cerrar programa`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Llegada y Check-in` },
        { day: 2, label: 'Day 2', desc: `Mañana Uñas, Tarde Cabello, Noche Tour` },
        { day: 3, label: 'Day 3', desc: `Tratamiento facial, Compras y Salida` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Días: Curso de Belleza Completo`,
      tabLabel: `Curso 5 días`,
      shortIntro: `Uñas/Cuidado de piel/Depilación/Maquillaje + Turismo.`,
      keywords: `Uñas, Maquillaje, Turismo`.split(',').map(s=>s.trim()),
      viewFull: `Ver programa completo`,
      closeFull: `Cerrar programa`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Llegada y Check-in` },
        { day: 2, label: 'Day 2', desc: `Mañana Uñas, Tarde Cabello, Noche Tour` },
        { day: 3, label: 'Day 3', desc: `Tratamiento facial, Compras y Salida` },
        { day: 4, label: 'Day 4', desc: `Depilación y Compras en Garosu-gil` },
        { day: 5, label: 'Day 5', desc: `Maquillaje Estilo K-pop y Salida` }
      ]
    }
  ],
  "fr": [
    {
      id: 'plan-3days',
      title: `3 Jours : Beauté Express`,
      tabLabel: `Cours 3 Jours`,
      shortIntro: `Ongles → Cheveux → Soins du visage en 3 jours intenses.`,
      keywords: `Ongles, Cheveux, Soin Peau`.split(',').map(s=>s.trim()),
      viewFull: `Voir le programme complet`,
      closeFull: `Fermer le programme`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Arrivée et Check-in` },
        { day: 2, label: 'Day 2', desc: `Matin Ongles, Après-midi Cheveux, Soirée Tour` },
        { day: 3, label: 'Day 3', desc: `Soin visage, Shopping et Départ` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Jours : Beauté Complète`,
      tabLabel: `Cours 5 Jours`,
      shortIntro: `Ensemble complet : Ongles/Peau/Épilation/Maquillage avec tourisme.`,
      keywords: `Ongles, Maquillage, Tourisme`.split(',').map(s=>s.trim()),
      viewFull: `Voir le programme complet`,
      closeFull: `Fermer le programme`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Arrivée et Check-in` },
        { day: 2, label: 'Day 2', desc: `Matin Ongles, Après-midi Cheveux, Soirée Tour` },
        { day: 3, label: 'Day 3', desc: `Soin visage, Shopping et Départ` },
        { day: 4, label: 'Day 4', desc: `Épilation (Gangnam) et Shopping` },
        { day: 5, label: 'Day 5', desc: `Maquillage et Départ` }
      ]
    }
  ],
  "id": [
    {
      id: 'plan-3days',
      title: `3 Hari: Beauty Sprint Seoul`,
      tabLabel: `Kursus 3 Hari`,
      shortIntro: `Kuku → Rambut → Wajah dalam 3 hari singkat.`,
      keywords: `Kuku, Rambut, Skincare`.split(',').map(s=>s.trim()),
      viewFull: `Lihat Jadwal Lengkap`,
      closeFull: `Tutup Jadwal`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Kedatangan & Check-in` },
        { day: 2, label: 'Day 2', desc: `Pagi Kuku, Siang Rambut, Malam Jalan-jalan` },
        { day: 3, label: 'Day 3', desc: `Perawatan Wajah, Belanja & Pulang` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Hari: Kursus Beauty Lengkap`,
      tabLabel: `Kursus 5 Hari`,
      shortIntro: `Paket lengkap kuku/kulit/make-up ditambah jalan-jalan.`,
      keywords: `Kuku, Make-up, Wisata`.split(',').map(s=>s.trim()),
      viewFull: `Lihat Jadwal Lengkap`,
      closeFull: `Tutup Jadwal`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Kedatangan & Check-in` },
        { day: 2, label: 'Day 2', desc: `Pagi Kuku, Siang Rambut, Malam Jalan-jalan` },
        { day: 3, label: 'Day 3', desc: `Perawatan Wajah, Belanja & Pulang` },
        { day: 4, label: 'Day 4', desc: `Waxing (Gangnam) & Belanja` },
        { day: 5, label: 'Day 5', desc: `K-pop Make-up & Pulang` }
      ]
    }
  ],
  "jp": [
    {
      id: 'plan-3days',
      title: `3日間：ソウル美容圧縮コース`,
      tabLabel: `3日間コース`,
      shortIntro: `ネイル → ヘア → スキンケアまで、3日で効率よく！`,
      keywords: `ネイル, ヘア, スキンケア`.split(',').map(s=>s.trim()),
      viewFull: `全日程を見る`,
      closeFull: `閉じる`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `入国＆チェックイン` },
        { day: 2, label: 'Day 2', desc: `午前：弘大ネイル、午後：清潭洞ヘア、夜：観光` },
        { day: 3, label: 'Day 3', desc: `午前：明洞スキンケア、午後：買い物＆帰国` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5日間：ソウル美容フルコース`,
      tabLabel: `5日間コース`,
      shortIntro: `ネイル/肌/ワックス/メイクのフルセット。観光も充実。`,
      keywords: `ネイル, メイク, 観光`.split(',').map(s=>s.trim()),
      viewFull: `全日程を見る`,
      closeFull: `閉じる`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `入国＆チェックイン` },
        { day: 2, label: 'Day 2', desc: `午前：弘大ネイル、午後：清潭洞ヘア、夜：観光` },
        { day: 3, label: 'Day 3', desc: `午前：明洞スキンケア、午後：買い物＆帰国` },
        { day: 4, label: 'Day 4', desc: `午前：江南ワックス、午後：カロスキル買い物` },
        { day: 5, label: 'Day 5', desc: `午前：K-POPメイク体験、午後：空港へ` }
      ]
    }
  ],
  "ko": [
    {
      id: 'plan-3days',
      title: `3일: 서울 뷰티 압축 코스`,
      tabLabel: `3일차 코스`,
      shortIntro: `네일 → 헤어 → 페이셜까지, 예약대행으로 3일 압축 완성`,
      keywords: `네일, 헤어, 스킨케어, 홍대`.split(',').map(s=>s.trim()),
      viewFull: `전체 일정 열기`,
      closeFull: `일정 닫기`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `입국 및 체크인 (명동/홍대/강남), 저녁 식사 및 야간 산책` },
        { day: 2, label: 'Day 2', desc: `오전 홍대 네일아트, 오후 청담 헤어 스타일링, 저녁 투어` },
        { day: 3, label: 'Day 3', desc: `오전 명동 페이셜 관리, 점심, 오후 쇼핑 및 출국` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5일: 서울 뷰티 풀코스`,
      tabLabel: `5일차 코스`,
      shortIntro: `네일/피부/왁싱/메이크업까지 풀세트. 관광은 동선에 맞춰 끼워넣기`,
      keywords: `네일, 헤어, 메이크업, 관광`.split(',').map(s=>s.trim()),
      viewFull: `전체 일정 열기`,
      closeFull: `일정 닫기`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `입국 및 체크인 (명동/홍대/강남), 저녁 식사 및 야간 산책` },
        { day: 2, label: 'Day 2', desc: `오전 홍대 네일아트, 오후 청담 헤어 스타일링, 저녁 투어` },
        { day: 3, label: 'Day 3', desc: `오전 명동 페이셜 관리, 점심, 오후 쇼핑 및 출국` },
        { day: 4, label: 'Day 4', desc: `오전 강남 왁싱, 점심, 오후 가로수길 쇼핑, 저녁` },
        { day: 5, label: 'Day 5', desc: `오전 메이크업/헤어 스타일링, 오후 핫플 인증샷 및 출국` }
      ]
    }
  ],
  "ms": [
    {
      id: 'plan-3days',
      title: `3 Hari: K-Beauty Ekspres`,
      tabLabel: `Kursus 3 Hari`,
      shortIntro: `Kuku → Rambut → Wajah dalam 3 hari padat.`,
      keywords: `Kuku, Rambut, Kulit`.split(',').map(s=>s.trim()),
      viewFull: `Lihat Jadual Penuh`,
      closeFull: `Tutup Jadual`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Ketibaan & Daftar masuk` },
        { day: 2, label: 'Day 2', desc: `Pagi Kuku, Petang Rambut, Malam Melawat` },
        { day: 3, label: 'Day 3', desc: `Rawatan Wajah, Beli-belah & Pulang` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Hari: Set Lengkap K-Beauty`,
      tabLabel: `Kursus 5 Hari`,
      shortIntro: `Set lengkap kuku/penjagaan kulit/make-up dan bersiar-siar.`,
      keywords: `Kuku, Make-up, Pelancongan`.split(',').map(s=>s.trim()),
      viewFull: `Lihat Jadual Penuh`,
      closeFull: `Tutup Jadual`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Ketibaan & Daftar masuk` },
        { day: 2, label: 'Day 2', desc: `Pagi Kuku, Petang Rambut, Malam Melawat` },
        { day: 3, label: 'Day 3', desc: `Rawatan Wajah, Beli-belah & Pulang` },
        { day: 4, label: 'Day 4', desc: `Waxing & Membeli-belah` },
        { day: 5, label: 'Day 5', desc: `Gaya Make-up & Pulang` }
      ]
    }
  ],
  "pt": [
    {
      id: 'plan-3days',
      title: `3 Dias: Sprint de Beleza`,
      tabLabel: `Curso 3 Dias`,
      shortIntro: `Unhas → Cabelo → Facial em 3 dias compactados.`,
      keywords: `Unhas, Cabelo, Pele`.split(',').map(s=>s.trim()),
      viewFull: `Ver Cronograma Completo`,
      closeFull: `Fechar Cronograma`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Chegada e Check-in` },
        { day: 2, label: 'Day 2', desc: `Manhã Unhas, Tarde Cabelo, Noite Turismo` },
        { day: 3, label: 'Day 3', desc: `Facial, Compras e Partida` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Dias: Curso Completo`,
      tabLabel: `Curso 5 Dias`,
      shortIntro: `Conjunto completo com Unhas/Pele/Maquiagem e Turismo.`,
      keywords: `Unhas, Maquiagem, Turismo`.split(',').map(s=>s.trim()),
      viewFull: `Ver Cronograma Completo`,
      closeFull: `Fechar Cronograma`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Chegada e Check-in` },
        { day: 2, label: 'Day 2', desc: `Manhã Unhas, Tarde Cabelo, Noite Turismo` },
        { day: 3, label: 'Day 3', desc: `Facial, Compras e Partida` },
        { day: 4, label: 'Day 4', desc: `Depilação e Compras` },
        { day: 5, label: 'Day 5', desc: `Maquiagem e Partida` }
      ]
    }
  ],
  "ru": [
    {
      id: 'plan-3days',
      title: `3 Дня: Экспресс Красота в Сеуле`,
      tabLabel: `3-дневный курс`,
      shortIntro: `Ногти → Волосы → Лицо за 3 дня с бронированием.`,
      keywords: `Ногти, Волосы, Уход за кожей`.split(',').map(s=>s.trim()),
      viewFull: `Показать полное расписание`,
      closeFull: `Скрыть расписание`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Прибытие и Заселение` },
        { day: 2, label: 'Day 2', desc: `Утром - Ногти, Днем - Прическа, Вечером - Прогулка` },
        { day: 3, label: 'Day 3', desc: `Утром - Уход за лицом, Покупки и Отъезд` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Дней: Полный Курс Красоты`,
      tabLabel: `5-дневный курс`,
      shortIntro: `Весь набор: Ногти/Кожа/Эпиляция/Макияж + Туризм.`,
      keywords: `Ногти, Макияж, Туризм`.split(',').map(s=>s.trim()),
      viewFull: `Показать полное расписание`,
      closeFull: `Скрыть расписание`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Прибытие и Заселение` },
        { day: 2, label: 'Day 2', desc: `Утром - Ногти, Днем - Прическа, Вечером - Прогулка` },
        { day: 3, label: 'Day 3', desc: `Утром - Уход за лицом, Покупки и Отъезд` },
        { day: 4, label: 'Day 4', desc: `Утром - Эпиляция, Днем - Шоппинг` },
        { day: 5, label: 'Day 5', desc: `Макияж, Фотосессия и Отъезд` }
      ]
    }
  ],
  "th": [
    {
      id: 'plan-3days',
      title: `3 วัน: ความงามโซลแบบเร่งรัด`,
      tabLabel: `คอร์ส 3 วัน`,
      shortIntro: `เล็บ → ทำผม → ผิวหน้า แน่นๆ ใน 3 วัน`,
      keywords: `เล็บ, ทำผม, สกินแคร์`.split(',').map(s=>s.trim()),
      viewFull: `ดูรายละเอียดทั้งหมด`,
      closeFull: `ปิดดูรายละเอียด`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `เดินทางถึง & เช็คอิน` },
        { day: 2, label: 'Day 2', desc: `เช้า: ทำเล็บฮงแด, บ่าย: ทำผมชองดัม, กลางคืน: เที่ยว` },
        { day: 3, label: 'Day 3', desc: `เช้า: นวดหน้า, บ่าย: ช้อปปิ้ง & กลับ` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 วัน: ความงามโซลแบบครบเซ็ต`,
      tabLabel: `คอร์ส 5 วัน`,
      shortIntro: `ครบชุด: เล็บ/ผิวหน้า/แว็กซ์/แต่งหน้า รวมถึงการเที่ยว`,
      keywords: `เล็บ, แต่งหน้า, ท่องเที่ยว`.split(',').map(s=>s.trim()),
      viewFull: `ดูรายละเอียดทั้งหมด`,
      closeFull: `ปิดดูรายละเอียด`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `เดินทางถึง & เช็คอิน` },
        { day: 2, label: 'Day 2', desc: `เช้า: ทำเล็บฮงแด, บ่าย: ทำผมชองดัม, กลางคืน: เที่ยว` },
        { day: 3, label: 'Day 3', desc: `เช้า: นวดหน้า, บ่าย: ช้อปปิ้ง & กลับ` },
        { day: 4, label: 'Day 4', desc: `เช้า: แว็กซ์ขน, บ่าย: ช้อปปิ้งคาโรซูกิล` },
        { day: 5, label: 'Day 5', desc: `เช้า: แต่งหน้าและผม, บ่าย: เดินเล่นซองซู & กลับ` }
      ]
    }
  ],
  "tw": [
    {
      id: 'plan-3days',
      title: `3天：首爾美容速成班`,
      tabLabel: `3日行程`,
      shortIntro: `美甲 → 美髮 → 護膚，3天壓縮完成`,
      keywords: `美甲, 美髮, 護膚`.split(',').map(s=>s.trim()),
      viewFull: `查看完整日程`,
      closeFull: `收起日程`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `抵達與入住，周邊散步` },
        { day: 2, label: 'Day 2', desc: `上午弘大美甲，下午清潭洞美髮，晚上觀光` },
        { day: 3, label: 'Day 3', desc: `上午明洞護膚，下午購物與回國` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5天：首爾美容全方位`,
      tabLabel: `5日行程`,
      shortIntro: `美甲/護膚/脫毛/化妝全套，完美結合觀光`,
      keywords: `美甲, 化妝, 觀光`.split(',').map(s=>s.trim()),
      viewFull: `查看完整日程`,
      closeFull: `收起日程`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `抵達與入住，周邊散步` },
        { day: 2, label: 'Day 2', desc: `上午弘大美甲，下午清潭洞美髮，晚上觀光` },
        { day: 3, label: 'Day 3', desc: `上午明洞護膚，下午購物與回國` },
        { day: 4, label: 'Day 4', desc: `江南脫毛與林蔭道購物` },
        { day: 5, label: 'Day 5', desc: `韓國化妝體驗與打卡，前往機場` }
      ]
    }
  ],
  "vi": [
    {
      id: 'plan-3days',
      title: `3 Ngày: Làm đẹp siêu tốc`,
      tabLabel: `Khóa 3 Ngày`,
      shortIntro: `Nail → Tóc → Chăm sóc da trong 3 ngày gọn gàng.`,
      keywords: `Nail, Tóc, Dưỡng da`.split(',').map(s=>s.trim()),
      viewFull: `Xem toàn bộ lịch trình`,
      closeFull: `Đóng lịch trình`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Đến nơi & Nhận phòng` },
        { day: 2, label: 'Day 2', desc: `Sáng làm Nail, Chiều làm tóc, Tối dạo phố` },
        { day: 3, label: 'Day 3', desc: `Sáng chăm sóc da, Chiều mua sắm & Về nước` }
      ]
    },
    {
      id: 'plan-5days',
      title: `5 Ngày: Khóa Làm đẹp Toàn diện`,
      tabLabel: `Khóa 5 Ngày`,
      shortIntro: `Trọn bộ Nail/Da/Waxing/Trang điểm kết hợp du lịch.`,
      keywords: `Nail, Make-up, Du lịch`.split(',').map(s=>s.trim()),
      viewFull: `Xem toàn bộ lịch trình`,
      closeFull: `Đóng lịch trình`,
      itinerary: [
        { day: 1, label: 'Day 1', desc: `Đến nơi & Nhận phòng` },
        { day: 2, label: 'Day 2', desc: `Sáng làm Nail, Chiều làm tóc, Tối dạo phố` },
        { day: 3, label: 'Day 3', desc: `Sáng chăm sóc da, Chiều mua sắm & Về nước` },
        { day: 4, label: 'Day 4', desc: `Sáng Waxing, Chiều mua sắm Garosu-gil` },
        { day: 5, label: 'Day 5', desc: `Sáng Make-up, Chụp ảnh check-in & Về nước` }
      ]
    }
  ],
};

export const getTravelPlanTemplatesByLanguage = (lang: string = 'ko') => {
  const baseLang = lang.split('-')[0];
  return TRAVEL_PLAN_TEMPLATES[baseLang] || TRAVEL_PLAN_TEMPLATES['en'];
};
