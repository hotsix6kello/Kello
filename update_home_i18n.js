const fs = require('fs');
const path = require('path');

const locales = ['ar', 'cn', 'de', 'en', 'es', 'fr', 'id', 'jp', 'ko', 'ms', 'pt', 'ru', 'th', 'tw', 'vi'];

const trans = {
    ko: {
        hero_title: "한국 여행, 일정부터 예약까지 한 번에",
        hero_subtitle: "여행 일정 추천부터 예약 지원까지 빠르게. 한국 여행 초보자도 쉽게 사용하는 파트너.",
        features: { booking: "예약까지 한 번에", ai_plan: "AI로 일정 완성", navi: "길찾기 걱정 없이" },
        input: {
            where: "어디로 갈까요?", where_placeholder: "서울, 부산, 제주...",
            when: "얼마나 머무르시나요?", days_suffix: "일",
            who: "누구와 함께 가나요?",
            who_options: { solo: "혼자서", couple: "커플", friends: "친구와", family: "가족과" },
            interests: "어떤 테마를 원하시나요?",
            interests_options: { food: "맛집 탐방", shopping: "쇼핑", beauty: "K-뷰티", sightseeing: "관광명소", night: "나이트라이프", experience: "이색 체험" }
        },
        cta_helper: "1분 안에 꼭 맞는 여행 코스 받기",
        cta_btn: "일정 생성 시작",
        trust: {
            title: "Kello와 함께하는 안심 여행",
            items: ["한국 여행 특화 전문 앱", "AI 맞춤형 일정 추천", "언어 장벽 없는 길찾기", "어려운 장소도 예약 지원"]
        }
    },
    en: {
        hero_title: "Korea Travel: Plans & Bookings All in One",
        hero_subtitle: "From itinerary recommendations to booking support. Your ultimate travel concierge for Korea.",
        features: { booking: "Seamless Bookings", ai_plan: "AI Itineraries", navi: "Easy Navigation" },
        input: {
            where: "Where to?", where_placeholder: "Seoul, Busan, Jeju...",
            when: "How long?", days_suffix: " Days",
            who: "Who are you traveling with?",
            who_options: { solo: "Solo", couple: "Couple", friends: "Friends", family: "Family" },
            interests: "What are your interests?",
            interests_options: { food: "Food", shopping: "Shopping", beauty: "K-Beauty", sightseeing: "Sightseeing", night: "Nightlife", experience: "Experiences" }
        },
        cta_helper: "Get your personalized plan in 1 minute",
        cta_btn: "Start Creating Itinerary",
        trust: {
            title: "Safe Travels with Kello",
            items: ["Korea Travel Specialized", "AI Personalized Plans", "Zero Language Barrier", "Hassle-free Bookings"]
        }
    },
    th: {
        hero_title: "เที่ยวเกาหลี วางแพลนและจองครบจบในที่เดียว",
        hero_subtitle: "รับคำแนะนำแผนเที่ยวและช่วยจอง ผู้ช่วยที่เปรียบเสมือนเพื่อนสำหรับนักเดินทางมือใหม่",
        features: { booking: "จัดการการจอง", ai_plan: "วางแผนด้วย AI", navi: "นำทางอย่างง่ายดาย" },
        input: {
            where: "ไปที่ไหน?", where_placeholder: "โซล, ปูซาน, เชจู...",
            when: "กี่วัน?", days_suffix: " วัน",
            who: "ไปกับใคร?",
            who_options: { solo: "คนเดียว", couple: "คู่รัก", friends: "เพื่อน", family: "ครอบครัว" },
            interests: "สนใจอะไรบ้าง?",
            interests_options: { food: "ร้านอร่อย", shopping: "ช้อปปิ้ง", beauty: "K-Beauty", sightseeing: "สถานที่ท่องเที่ยว", night: "เที่ยงคืน", experience: "ประสบการณ์" }
        },
        cta_helper: "รับแผนการเดินทางใน 1 นาที",
        cta_btn: "เริ่มสร้างแพลน",
        trust: {
            title: "เที่ยวอย่างปลอดภัยกับ Kello",
            items: ["แอปเฉพาะเกาหลี", "แผนจัดตามความชอบ", "ไม่มีอุปสรรคทางภาษา", "รองรับการจอง"]
        }
    },
    jp: {
        hero_title: "韓国旅行、プラン作成から予約まで一度に",
        hero_subtitle: "プランの推薦から予約サポートまで早く簡単に。初心者向け旅行アシスタント。",
        features: { booking: "予約も一度に", ai_plan: "AIで簡単プラン", navi: "迷わない道案内" },
        input: {
            where: "どこへ行きますか？", where_placeholder: "ソウル、釜山、済州...",
            when: "何日間ですか？", days_suffix: " 日間",
            who: "誰と行きますか？",
            who_options: { solo: "一人", couple: "カップル", friends: "友達", family: "家族" },
            interests: "どんなテーマがいいですか？",
            interests_options: { food: "グルメ", shopping: "ショッピング", beauty: "K-ビューティー", sightseeing: "観光名所", night: "ナイトライフ", experience: "特別体験" }
        },
        cta_helper: "1分でピッタリの旅行プランを作成",
        cta_btn: "プラン作成スタート",
        trust: {
            title: "Kelloと一緒の安心旅行",
            items: ["韓国旅行特化", "AIがおすすめプラン作成", "言語の壁がない道案内", "難しい予約もサポート"]
        }
    },
    cn: {
        hero_title: "韩国旅行，从行程规划到代订一站式服务",
        hero_subtitle: "快速获取行程推荐与预订支持，新手也能轻松使用的旅行助手。",
        features: { booking: "一站式代订", ai_plan: "AI智能规划", navi: "无忧导航" },
        input: {
            where: "去哪里？", where_placeholder: "首尔、釜山、济州...",
            when: "去几天？", days_suffix: " 天",
            who: "和谁一起？",
            who_options: { solo: "独自", couple: "情侣", friends: "朋友", family: "家庭" },
            interests: "您想体验什么？",
            interests_options: { food: "探店美食", shopping: "买买买", beauty: "K-美容", sightseeing: "地标打卡", night: "夜景夜生活", experience: "特色体验" }
        },
        cta_helper: "1分钟获取专属行程推荐",
        cta_btn: "开始定制行程",
        trust: {
            title: "与Kello同行的安心之旅",
            items: ["专注韩国旅行", "AI个性化推荐", "无语言障碍导航", "轻松搞定预订"]
        }
    },
    tw: {
        hero_title: "韓國旅行，從行程規劃到預訂一站搞定",
        hero_subtitle: "快速取得行程推薦與預訂支援，新手也能輕鬆使用的旅行助手。",
        features: { booking: "一站式預訂", ai_plan: "AI智慧規劃", navi: "無憂導航" },
        input: {
            where: "去哪裡？", where_placeholder: "首爾、釜山、濟州...",
            when: "去幾天？", days_suffix: " 天",
            who: "和誰一起？",
            who_options: { solo: "獨自", couple: "情侶", friends: "朋友", family: "家庭" },
            interests: "您想體驗什麼？",
            interests_options: { food: "美食", shopping: "購物", beauty: "K-美容", sightseeing: "觀光打卡", night: "夜景", experience: "特色體驗" }
        },
        cta_helper: "1分鐘獲取專屬行程推薦",
        cta_btn: "開始定制行程",
        trust: {
            title: "與Kello同行的安心之旅",
            items: ["專注韓國旅行", "AI個人化推薦", "無語言障礙導航", "輕鬆搞定預訂"]
        }
    }
};

locales.forEach(loc => {
    const file = path.join(__dirname, 'public/locales', loc, 'common.json');
    if (!fs.existsSync(file)) return;
    let data = JSON.parse(fs.readFileSync(file, 'utf8'));
    let mappedLoc = loc;
    if (!trans[loc]) mappedLoc = 'en'; // fallback

    data.home_new = trans[mappedLoc];
    fs.writeFileSync(file, JSON.stringify(data, null, 4));
});
