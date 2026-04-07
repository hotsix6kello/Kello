const fs = require('fs');
const path = require('path');
const dict = require('./community_dict.js');

const dict2 = {
  "슬슬 인원이 모이고 있어요.": {en:"People are gathering slowly.", jp:"少しずつ人が集まっています。", cn:"人们正在慢慢聚集。", tw:"人們正在慢慢聚集。", vi:"Mọi người đang dần tập hợp.", th:"ผู้คนกำลังเริ่มมา", ar:"يتجمع الناس ببطء."},
  "{{region}}에 대해 {{count}}명과 소통 중": {en:"Chatting with {{count}} people about {{region}}", jp:"{{region}}について{{count}}人とコミュニケーション中", cn:"正在与{{count}}人交流关于{{region}}", tw:"正在與{{count}}人交流關於{{region}}", vi:"Đang trò chuyện với {{count}} người về {{region}}", th:"สนทนากับ {{count}} คนเกี่ยวกับ {{region}}", ar:"محادثة مع {{count}} حول {{region}}"},
  "아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!": {en:"No comments yet. Be the first!", jp:"まだコメントがありません。最初のコメントを残してください！", cn:"暂无评论。来抢沙发吧！", tw:"暫無評論。來搶頭香吧！", vi:"Chưa có bình luận. Hãy là người đầu tiên!", th:"ยังไม่มีความคิดเห็น. เป็นคนแรกเลย!", ar:"لا توجد تعليقات بعد. كن الأول!"},
  "이 댓글 숨기기": {en:"Hide this comment", jp:"このコメントを隠す", cn:"隐藏此评论", tw:"隱藏此評論", vi:"Ẩn bình luận này", th:"ซ่อนความคิดเห็นนี้", ar:"إخفاء هذا التعليق"},
  "댓글 쓰기": {en:"Write a comment", jp:"コメントを書く", cn:"写评论", tw:"寫評論", vi:"Viết bình luận", th:"เขียนความคิดเห็น", ar:"كتابة تعليق"},
  "서울": {en:"Seoul", jp:"ソウル", cn:"首尔", tw:"首爾", vi:"Seoul", th:"โซล", ar:"سيول"},
  "오른쪽 아래 버튼을 눌러 글을 써보세요.": {en:"Click bottom right to write.", jp:"右下のボタンを押して書いてみてください。", cn:"点击右下角发贴。", tw:"點擊右下角發貼。", vi:"Nhấp vào góc dưới bên phải để viết.", th:"คลิกขวาล่างเพื่อเขียน", ar:"انقر أسفل اليمين للكتابة."},
  "다른 키워드로 검색해 보세요.": {en:"Try another keyword.", jp:"他のキーワードで検索してみてください。", cn:"尝试其他关键字。", tw:"嘗試其他關鍵字。", vi:"Thử từ khóa khác.", th:"ลองใช้คำค้นอื่น", ar:"جرب كلمة أخرى."},
  "{{tab}}에서 뜨거운 반응을 얻는 중!": {en:"Getting hot reactions in {{tab}}!", jp:"{{tab}}で熱い反応を得ています！", cn:"在{{tab}}获得热烈反响！", tw:"在{{tab}}獲得熱烈反響！", vi:"Được quan tâm nhiều trong {{tab}}!", th:"ได้รับการตอบสนองดีใน {{tab}}", ar:"تفاعل حار في {{tab}}!"},
  "함께 할 동행을 구하시나요?": {en:"Looking for companions?", jp:"同行者をお探しですか？", cn:"找旅伴吗？", tw:"找旅伴嗎？", vi:"Tìm bạn đồng hành?", th:"หาเพื่อนร่วมทางไหม?", ar:"تبحث عن رفقاء؟"},
  "시술 후 만족도나 매장 서비스 등 솔직한 후기를 남겨보세요.": {en:"Share honest service review.", jp:"率直なレビューを残してみてください。", cn:"分享真实的评价。", tw:"分享真實的評價。", vi:"Chia sẻ đánh giá chân thực.", th:"แชร์รีวิวตรงๆ", ar:"شارك تقييمك بصدق."},
  "코스, 준비물, 이동 수단 등 유용한 팁을 알려주세요.": {en:"Share travel tips, courses, etc.", jp:"旅行のヒントを共有してください。", cn:"分享旅行提示。", tw:"分享旅行提示。", vi:"Chia sẻ mẹo du lịch.", th:"แบ่งปันเคล็ดลับ", ar:"شارك نصائح السفر."},
  "궁금한 내용이나 도움이 필요한 상황을 자세히 적어주세요.": {en:"Write question details.", jp:"質問の詳細を書いてください。", cn:"写下问题详情。", tw:"寫下問題詳情。", vi:"Viết chi tiết câu hỏi.", th:"เขียนรายละเอียดคำถาม", ar:"تحدث عن سؤالك بالتفصيل."},
  "제목": {en:"Title", jp:"タイトル", cn:"标题", tw:"標題", vi:"Tiêu đề", th:"หัวข้อ", ar:"العنوان"},
  "예: 강남역 레이어드 컷 후기": {en:"e.g. Gangnam haircut review", jp:"例：江南駅カットレビュー", cn:"例如：江南理发体验", tw:"例如：江南理髮體驗", vi:"VD: Đánh giá cắt tóc", th:"เช่น รีวิวตัดผม", ar:"مثل مراجعة حلاقة"},
  "모임에 대해 더 자세히 알려주세요.": {en:"Give more meetup details.", jp:"集まりについて詳細を教えてください。", cn:"提供聚会详情。", tw:"提供聚會詳情。", vi:"Chi tiết buổi gặp.", th:"รายละเอียดงานพบปะ", ar:"تفاصيل اللقاء."},
  "모임 장소나 활동 관련 사진을 추가해보세요 (최대 4장)": {en:"Add meetup photos (Max 4)", jp:"集まりの写真を追加してください（最大4枚）", cn:"添加聚会照片(最多4张)", tw:"添加聚會照片(最多4張)", vi:"Thêm ảnh nhóm (tối đa 4)", th:"เพิ่มภาพกิจกรรม (ไม่เกิน 4)", ar:"أضف صور اللقاء (4 كحد أقصى)"},
  "이미지는 최대 {{count}}개까지 업로드 가능합니다.": {en:"Max {{count}} images.", jp:"画像は最大{{count}}個までです。", cn:"最多{{count}}张图片。", tw:"最多{{count}}張圖片。", vi:"Tối đa {{count}} ảnh.", th:"สูงสุด {{count}} ภาพ", ar:"حد أقصى {{count}} صور."},
  "가볍게 만나서 즐길 모임을 만들어보세요.": {en:"Make a casual meetup.", jp:"気軽な集まりを作りましょう。", cn:"组织轻松的聚会。", tw:"組織輕鬆的聚會。", vi:"Tạo cuộc gặp thoải mái.", th:"จัดการนัดพบแบบสบายๆ", ar:"نظم لقاءً غير رسمي."},
  "여행 일정이 맞는 동행을 찾아보세요.": {en:"Find matching travel buddy.", jp:"日程が合う同行者を探しましょう。", cn:"找旅伴。", tw:"找旅伴。", vi:"Tìm bạn du lịch phù hợp.", th:"หาเพื่อนร่วมทาง", ar:"ابحث عن رفيق سفر."},
  "실시간 활성 중": {en:"Realtime Active", jp:"リアルタイム活性中", cn:"实时活跃中", tw:"實時活躍中", vi:"Đang hoạt động", th:"กำลังใช้งาน", ar:"نشط حاليا"},
  "정보 업데이트됨": {en:"Info Updated", jp:"情報更新済み", cn:"信息已更新", tw:"資訊已更新", vi:"Thông tin đã cập nhật", th:"อัปเดตข้อมูลแล้ว", ar:"تم تحديث المعلومات"},
  "활동적인 게시물": {en:"Active Post", jp:"活動的な投稿", cn:"活跃帖子", tw:"活躍貼文", vi:"Bài viết sôi nổi", th:"โพสต์ที่มีความเคลื่อนไหว", ar:"منشور نشط"},
  "조용한 게시물": {en:"Quiet Post", jp:"静かな投稿", cn:"安静的帖子", tw:"安靜的貼文", vi:"Bài viết yên tĩnh", th:"โพสต์เงียบ", ar:"منشور هادئ"},
  "게시물 강점": {en:"Post Strengths", jp:"投稿の強み", cn:"帖子亮点", tw:"貼文亮點", vi:"Điểm mạnh bài viết", th:"จุดเด่นของโพสต์", ar:"قوة المنشور"},
  "정리된 후기": {en:"Organized Review", jp:"整理されたレビュー", cn:"整理好的评价", tw:"整理好的評價", vi:"Đánh giá chi tiết", th:"รีวิวที่จัดระเบียบ", ar:"مراجعة منظمة"},
  "활발한 소통": {en:"Active Communication", jp:"活発なコミュニケーション", cn:"积极交流", tw:"積極交流", vi:"Giao tiếp tốt", th:"การสื่อสารที่แอคทีฟ", ar:"تواصل نشط"},
  "방문 팁 포함": {en:"Includes Visit Tips", jp:"訪問のヒントを含む", cn:"包含访问提示", tw:"包含訪問提示", vi:"Bao gồm mẹo", th:"รวมเคล็ดลับการไป", ar:"يتضمن نصائح"},
  "새로운 소식": {en:"New News", jp:"新しいニュース", cn:"新消息", tw:"新消息", vi:"Tin tức mới", th:"ข่าวใหม่", ar:"أخبار جديدة"},
  "의사 표현을 남겨보세요 (선택사항)": {en:"Leave your intent (Optional)", jp:"意思を残してください（オプション）", cn:"表达意向（可选）", tw:"表達意向（可選）", vi:"Để lại ý định (Tuỳ chọn)", th:"แสดงความจำนง (ตัวเลือก)", ar:"اترك نيتك (اختياري)"},
  "저도 가보고 싶어요": {en:"I want to go too", jp:"私も行ってみたいです", cn:"我也想去", tw:"我也想去", vi:"Tôi cũng muốn đi", th:"ฉันก็อยากไป", ar:"أريد الذهاب أيضا"},
  "이번 주 가능해요": {en:"Available this week", jp:"今週可能です", cn:"这周可行", tw:"這週可行", vi:"Có thể tuần này", th:"สัปดาห์นี้ว่าง", ar:"متاح هذا الأسبوع"},
  "날짜 맞으면 같이 가요": {en:"Let's go if days match", jp:"日程が合えば一緒に行きましょう", cn:"时间合适就一起去", tw:"時間合適就一起去", vi:"Cùng đi nếu hợp lịch", th:"ถ้าวันตรงกัน ไปด้วยกัน", ar:"لنذهب إذا اتفقت الأيام"},
  "{{count}}개": {en:"{{count}}", jp:"{{count}}個", cn:"{{count}}个", tw:"{{count}}個", vi:"{{count}}", th:"{{count}}", ar:"{{count}}"},
  "추가 팁 공유하기": {en:"Share extra tip", jp:"追加のヒントを共有する", cn:"分享更多提示", tw:"分享更多提示", vi:"Chia sẻ thêm mẹo", th:"แชร์ทิปสเพิ่มเติม", ar:"شارك نصيحة إضافية"},
  "여기에 한 가지 팁을 더 드릴게요!": {en:"Here's another tip!", jp:"ここでヒントをもう一つ！", cn:"再给你一个提示！", tw:"再給你一個提示！", vi:"Một mẹo nữa nhé!", th:"มีอีกหนึ่งเคล็ดลับให้คุณ!", ar:"إليك نصيحة أخرى!"},
  "모집을 완료하겠습니다. 참여하시는 분들 오픈채팅으로 들어와주세요!": {en:"Finished recruiting. Join open chat!", jp:"募集を完了します。オープンチャットへどうぞ！", cn:"招募完成。请进入聊天！", tw:"招募完成。請進入聊天！", vi:"Hoàn tất gọi nhóm. Vào chat nhé!", th:"เสร็จสิ้น ไปที่แชทกันเถอะ!", ar:"اكتمل الجمع. انضموا للمحادثة!"},
  "방문 결과 및 팁 작성": {en:"Write result & tip", jp:"結果とヒントの作成", cn:"写结果与提示", tw:"寫結果與提示", vi:"Ghi kết quả và mẹo", th:"เขียนผลและเคล็ดลับ", ar:"اكتب النتائج والنصائح"},
  "방문 완료 및 팁 저장": {en:"Save result & tip", jp:"結果とヒントの保存", cn:"保存结果与提示", tw:"保存結果與提示", vi:"Lưu kết quả", th:"บันทึกผลและทิปส์", ar:"حفظ"},
  "활발히 모집 중": {en:"Actively recruiting", jp:"活発に募集中", cn:"热招中", tw:"熱招中", vi:"Tích cực tuyển", th:"กำลังรับคนอย่างกระตือรือร้น", ar:"توظيف نشط"},
  "후기 공유": {en:"Share Review", jp:"レビュー共有", cn:"分享评价", tw:"分享評價", vi:"Chia sẻ Review", th:"แชร์รีวิว", ar:"شارك مراجعة"},
  "모임 참여": {en:"Join Meetup", jp:"集まりに参加", cn:"参加聚会", tw:"參加聚會", vi:"Tham gia Meetup", th:"เข้าร่วมนัดพบ", ar:"انضمام"},
  "선호하는 시간대 선택": {en:"Select preferred time", jp:"希望時間を選択", cn:"选择首选时间", tw:"選擇首選時間", vi:"Chọn thời gian", th:"เลือกเวลา", ar:"اختر الوقت المفضل"},
  "후기 남기기": {en:"Leave Review", jp:"レビューを残す", cn:"留评", tw:"留評", vi:"Để lại Text", th:"ทิ้งรีวิว", ar:"اترك تقييما"},
  "참여 의사 밝히기": {en:"Show intent to join", jp:"参加の意思を明らかにする", cn:"表达意向", tw:"表達意向", vi:"Thể hiện sự tham gia", th:"แสดงเจตนา", ar:"أظهر النية"},
  "저장됨": {en:"Saved", jp:"保存完了", cn:"已保存", tw:"已保存", vi:"Đã lưu", th:"บันทึกแล้ว", ar:"تم الحفظ"}
};

// Merge dictionaries
Object.assign(dict, dict2);

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
function getEnValue(currentPath) {
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
        
        if (typeof koNode === 'object' && koNode !== null && !Array.isArray(koNode)) {
            if (typeof langNode !== 'object' || langNode === null) {
                langNode = {};
                changed = true;
            }
            
            for (const key of Object.keys(koNode)) {
                if (langNode[key] === undefined) {
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
                    changed = true;
                }
                
                if (typeof koNode[key] === 'string') {
                    const koVal = koNode[key];
                    let currentLangVal = langNode[key];
                    const enVal = getEnValue(pathParts);

                    let needsReplace = false;

                    if (currentLangVal === undefined || currentLangVal === null || currentLangVal === "") {
                        needsReplace = true;
                    } 
                    else if (lang !== 'en' && currentLangVal === enVal && containsEnglishWordList(currentLangVal)) {
                        needsReplace = true;
                    }
                    else if (currentLangVal === koVal && containsHangul(currentLangVal)) {
                        needsReplace = true;
                    }

                    if (needsReplace) {
                        const dEntry = dict[koVal];
                        let transVal = null;
                        if (dEntry && dEntry[lang]) transVal = dEntry[lang];
                        else if (dEntry && dEntry['en'] && lang === 'en') transVal = dEntry['en'];

                        if (transVal !== null) {
                            langNode[key] = transVal;
                            replacedCounts[lang]++;
                            changed = true;
                        } else {
                            missingCounts[lang]++;
                        }
                    }
                }
            }
        }
        return changed; 
    }

    if (koData.community_page) {
        if (!langData.community_page) langData.community_page = {};
        const isChanged = processNode(koData.community_page, langData.community_page, ['community_page']);
        if (isChanged || replacedCounts[lang] > 0) {
            fs.writeFileSync(langPath, JSON.stringify(langData, null, 2) + '\n');
        }
    }
}

console.log(JSON.stringify({ replacedCounts, missingCounts }));
