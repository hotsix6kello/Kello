const fs = require('fs');
const path = require('path');

const locales = ['ja', 'zh-CN', 'zh-HK', 'vi', 'th', 'id', 'ms'];

const commonExtensions = {
  ja: {
    view_map: '場所を確認',
    view_map_desc: '地図で詳細位置を確認',
    taxi_call: 'タクシーを呼ぶ',
    route_nav: 'ルート案内',
    transit_nav_desc: '公共交通機関ルート',
    copy_address: '住所をコピー',
    copied: 'コピーしました！'
  },
  'zh-CN': {
    view_map: '查看位置',
    view_map_desc: '在地图上查看详细位置',
    taxi_call: '呼叫出租车',
    route_nav: '路径指引',
    transit_nav_desc: '公共交通导航',
    copy_address: '复制地址',
    copied: '已复制！'
  },
  'zh-HK': {
    view_map: '查看位置',
    view_map_desc: '在地圖上查看詳細位置',
    taxi_call: '呼叫的士',
    route_nav: '路徑指引',
    transit_nav_desc: '公共交通導航',
    copy_address: '複製地址',
    copied: '已複製！'
  },
  vi: {
    view_map: 'Xem vị trí',
    view_map_desc: 'Xem vị trí chi tiết trên bản đồ',
    taxi_call: 'Gọi taxi',
    route_nav: 'Chỉ đường',
    transit_nav_desc: 'Dẫn đường phương tiện công cộng',
    copy_address: 'Sao chép địa chỉ',
    copied: 'Đã sao chép!'
  },
  th: {
    view_map: 'ดูตำแหน่ง',
    view_map_desc: 'ตรวจสอบตำแหน่งโดยละเอียดบนแผนที่',
    taxi_call: 'เรียกแท็กซี่',
    route_nav: 'แนะนำเส้นทาง',
    transit_nav_desc: 'นำทางด้วยขนส่งสาธารณะ',
    copy_address: 'คัดลอกที่อยู่',
    copied: 'คัดลอกแล้ว!'
  },
  id: {
    view_map: 'Lihat Lokasi',
    view_map_desc: 'Lihat lokasi detail di peta',
    taxi_call: 'Panggil Taksi',
    route_nav: 'Panduan Rute',
    transit_nav_desc: 'Navigasi transportasi umum',
    copy_address: 'Salin Alamat',
    copied: 'Tersalin!'
  },
  ms: {
    view_map: 'Lihat Lokasi',
    view_map_desc: 'Lihat lokasi terperinci pada peta',
    taxi_call: 'Panggil Teksi',
    route_nav: 'Panduan Laluan',
    transit_nav_desc: 'Navigasi pengangkutan awam',
    copy_address: 'Salin Alamat',
    copied: 'Disalin!'
  }
};

const homeNew = {
  ja: {
    hero_title: '韓国旅行、プランから予約までこれ一つで',
    hero_subtitle: '旅行プランの提案から予約サポートまでスピーディーに。韓国旅行初心者でも安心의 파트너.',
    features: { booking: '予約まで一括で', ai_plan: 'AIでプラン完成', navi: '道に迷う心配なし' },
    input: {
      where: 'どこへ行きますか？',
      where_placeholder: 'ソウル、釜山、済州...',
      when: '何日間滞在しますか？',
      days_suffix: '日間',
      who: '誰と行きますか？',
      who_options: { solo: '一人で', couple: 'カップル', friends: '友達と', family: '家族と' },
      interests: 'どんなテーマをご希望ですか？',
      interests_options: { food: 'グルメ探検', shopping: 'ショッピング', beauty: 'K-ビューティー', sightseeing: '観光名所', night: 'ナイトライフ', experience: '特別な体験' }
    },
    cta_helper: '1分であなたにぴったりの旅行コースを提案',
    cta_btn: 'プラン作成を始める',
    trust: {
      title: 'Kelloと共にする安心の韓国旅行',
      items: ['韓国旅行特化の専門アプリ', 'AIによるパーソナライズされたプラン', '言語の壁がないルート案内', '予約困難な場所もサポート']
    }
  },
  'zh-CN': {
    hero_title: '韩国旅行，从行程到预订一站式完成',
    hero_subtitle: '从行程推荐到预订支持，快速开启。即使是韩国旅行初学者也能轻松使用的伙伴。',
    features: { booking: '一站式预订', ai_plan: 'AI完成行程', navi: '无需担心迷路' },
    input: {
      where: '去哪里？',
      where_placeholder: '首尔, 釜山, 济州...',
      when: '停留多久？',
      days_suffix: '天',
      who: '和谁一起去？',
      who_options: { solo: '独自一人', couple: '情侣', friends: '和朋友', family: '和家人' },
      interests: '想要什么样的主题？',
      interests_options: { food: '美食探访', shopping: '购物', beauty: 'K-美容', sightseeing: '观光景点', night: '夜生活', experience: '独特体验' }
    },
    cta_helper: '1分钟内获得专属旅行路线',
    cta_btn: '开始创建行程',
    trust: {
      title: '与 Kello 一起的安心旅行',
      items: ['韩国旅行专业应用', 'AI个性化方案', '无语言障碍导航', '协助预订困难地点']
    }
  },
  'zh-HK': {
    hero_title: '韓國旅行，從行程到預訂一站式完成',
    hero_subtitle: '從行程推薦到預訂支持，快速開啟。即使是韓國旅行初學者也能輕鬆使用的夥伴。',
    features: { booking: '一站式預訂', ai_plan: 'AI完成行程', navi: '無需擔心迷路' },
    input: {
      where: '去哪裡？',
      where_placeholder: '首爾, 釜山, 濟州...',
      when: '停留多久？',
      days_suffix: '天',
      who: '和誰一起去？',
      who_options: { solo: '獨自一人', couple: '情侶', friends: '和朋友', family: '和家人' },
      interests: '想要什麼樣的主題？',
      interests_options: { food: '美食探訪', shopping: '購物', beauty: 'K-美容', sightseeing: '觀光景點', night: '夜生活', experience: '獨特體驗' }
    },
    cta_helper: '1分鐘內獲得專屬旅行路線',
    cta_btn: '開始創建行程',
    trust: {
      title: '與 Kello 一起的安心旅行',
      items: ['韓國旅行專業應用', 'AI個性化方案', '無語言障礙導覽', '協助預訂困難地點']
    }
  },
  vi: {
    hero_title: 'Du lịch Hàn Quốc, từ lịch trình đến đặt chỗ tất cả trong một',
    hero_subtitle: 'Từ đề xuất lịch trình đến hỗ trợ đặt chỗ nhanh chóng. Đối tác dễ sử dụng ngay cả với người mới đến Hàn Quốc.',
    features: { booking: 'Đặt chỗ trọn gói', ai_plan: 'Hoàn thành lịch trình bằng AI', navi: 'Không lo lạc đường' },
    input: {
      where: 'Bạn đi đâu?',
      where_placeholder: 'Seoul, Busan, Jeju...',
      when: 'Bạn ở lại bao lâu?',
      days_suffix: ' Ngày',
      who: 'Bạn đi cùng ai?',
      who_options: { solo: 'Đi một mình', couple: 'Cặp đôi', friends: 'Cùng bạn bè', family: 'Cùng gia đình' },
      interests: 'Bạn muốn chủ đề gì?',
      interests_options: { food: 'Khám phá ẩm thực', shopping: 'Mua sắm', beauty: 'K-Beauty', sightseeing: 'Danh lam thắng cảnh', night: 'Đời sống về đêm', experience: 'Trải nghiệm độc đáo' }
    },
    cta_helper: 'Nhận lộ trình du lịch phù hợp trong 1 phút',
    cta_btn: 'Bắt đầu tạo lịch trình',
    trust: {
      title: 'Du lịch an tâm cùng Kello',
      items: ['Ứng dụng chuyên biệt cho du lịch Hàn Quốc', 'Đề xuất lịch trình AI cá nhân hóa', 'Chỉ đường không rào cản ngôn ngữ', 'Hỗ trợ đặt chỗ ở những nơi khó khăn']
    }
  },
  th: {
    hero_title: 'เที่ยวเกาหลี ครบจบในที่เดียวตั้งแต่แผนการเดินทางไปจนถึงการจอง',
    hero_subtitle: 'ตั้งแต่การแนะนำแผนการเดินทางไปจนถึงการสนับสนุนการจองอย่างรวดเร็ว คู่หูที่ใช้งานง่ายแม้สำหรับมือใหม่เที่ยวเกาหลี',
    features: { booking: 'จองครบในที่เดียว', ai_plan: 'สร้างแผนด้วย AI', navi: 'ไม่ต้องกังวลเรื่องหลงทาง' },
    input: {
      where: 'จะไปที่ไหน?',
      where_placeholder: 'โซล, ปูซาน, เชจู...',
      when: 'อยู่นานเท่าไหร่?',
      days_suffix: ' วัน',
      who: 'ไปกับใคร?',
      who_options: { solo: 'ไปคนเดียว', couple: 'คู่รัก', friends: 'กับเพื่อน', family: 'กับครอบครัว' },
      interests: 'ต้องการธีมแบบไหน?',
      interests_options: { food: 'ตะลุยของอร่อย', shopping: 'ช้อปปิ้ง', beauty: 'K-Beauty', sightseeing: 'สถานที่ท่องเที่ยว', night: 'ไนท์ไลฟ์', experience: 'ประสบการณ์พิเศษ' }
    },
    cta_helper: 'รับคอร์สเที่ยวที่ใช่ภายใน 1 นาที',
    cta_btn: 'เริ่มสร้างแผนการเดินทาง',
    trust: {
      title: 'เที่ยวอย่างสบายใจไปกับ Kello',
      items: ['แอปพลิเคชันสำหรับเที่ยวเกาหลีโดยเฉพาะ', 'แนะนำแผนการเดินทางเฉพาะบุคคลด้วย AI', 'นำทางแบบไร้อุปสรรคทางภาษา', 'สนับสนุนการจองในสถานที่ที่จองยาก']
    }
  },
  id: {
    hero_title: 'Wisata Korea, dari rencana hingga pemesanan dalam satu aplikasi',
    hero_subtitle: 'Dari rekomendasi rencana perjalanan hingga dukungan pemesanan dengan cepat. Mitra yang mudah digunakan bahkan bagi pemula di Korea.',
    features: { booking: 'Pemesanan sekaligus', ai_plan: 'Rencana selesai dengan AI', navi: 'Tanpa khawatir tersesat' },
    input: {
      where: 'Mau ke mana?',
      where_placeholder: 'Seoul, Busan, Jeju...',
      when: 'Berapa lama menginap?',
      days_suffix: ' Hari',
      who: 'Pergi dengan siapa?',
      who_options: { solo: 'Sendiri', couple: 'Pasangan', friends: 'Bersama teman', family: 'Bersama keluarga' },
      interests: 'Tema apa yang Anda inginkan?',
      interests_options: { food: 'Wisata Kuliner', shopping: 'Belanja', beauty: 'K-Beauty', sightseeing: 'Tempat Wisata', night: 'Kehidupan Malam', experience: 'Pengalaman Unik' }
    },
    cta_helper: 'Dapatkan rute wisata yang pas dalam 1 menit',
    cta_btn: 'Mulai buat rencana',
    trust: {
      title: 'Wisata Nyaman bersama Kello',
      items: ['Aplikasi khusus wisata Korea', 'Rekomendasi rencana AI yang dipersonalisasi', 'Panduan arah tanpa hambatan bahasa', 'Dukungan pemesanan di tempat yang sulit']
    }
  },
  ms: {
    hero_title: 'Percutian Korea, dari jadual hingga tempahan semua dalam satu',
    hero_subtitle: 'Dari cadangan jadual perjalanan hingga sokongan tempahan dengan pantas. Rakan kongsi yang mudah digunakan walaupun untuk pemula di Korea.',
    features: { booking: 'Tempahan serentak', ai_plan: 'Jadual siap dengan AI', navi: 'Tanpa risau sesat jalan' },
    input: {
      where: 'Hendak ke mana?',
      where_placeholder: 'Seoul, Busan, Jeju...',
      when: 'Berapa lama menginap?',
      days_suffix: ' Hari',
      who: 'Pergi dengan siapa?',
      who_options: { solo: 'Bersendirian', couple: 'Pasangan', friends: 'Bersama kawan', family: 'Bersama keluarga' },
      interests: 'Tema apa yang anda mahukan?',
      interests_options: { food: 'Jelajah Makanan', shopping: 'Membeli-belah', beauty: 'K-Beauty', sightseeing: 'Tempat Tarikan', night: 'Kehidupan Malam', experience: 'Pengalaman Unik' }
    },
    cta_helper: 'Dapatkan laluan pelancongan yang sesuai dalam 1 minit',
    cta_btn: 'Mula buat jadual',
    trust: {
      title: 'Percutian Tenang bersama Kello',
      items: ['Aplikasi khusus pelancongan Korea', 'Cadangan jadual AI yang diperibadikan', 'Panduan arah tanpa halangan bahasa', 'Sokongan tempahan di tempat yang sukar']
    }
  }
};

locales.forEach(loc => {
  const filePath = path.join('public', 'locales', loc, 'common.json');
  if (fs.existsSync(filePath)) {
    const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Extend common
    if (content.common) {
      Object.assign(content.common, commonExtensions[loc]);
    }
    
    // Add home_new
    content.home_new = homeNew[loc];
    
    fs.writeFileSync(filePath, JSON.stringify(content, null, 4), 'utf8');
    console.log(`Updated ${loc}`);
  }
});
