import json
import os
from pathlib import Path

# 15 supported languages and their folder names
languages = ["ko", "en", "jp", "cn", "tw", "vi", "th", "id", "ms", "es", "fr", "de", "ar", "pt", "ru"]

# Core translation data for interpreter_page
translations = {
    "ko": {
        "back": "< 뒤로", "title": "실시간 통역기", "subtitle": "방문객 언어는 앱 언어로 자동 설정되며, 매장 언어는 한국어로 고정됩니다.",
        "onboarding": "방문객이 입력하면 한국어로, 직원이 입력한 한국어는 당신의 언어로 번역됩니다.",
        "customer_lang": "방문객 언어", "staff_lang": "매장 언어 (한국어)", "mic_preparing": "마이크 준비 중",
        "customer_transcribing": "방문객 음성 인식 중", "customer_recording": "방문객 음성 녹음 중... 다시 클릭하여 종료",
        "translating": "번역 중", "customer_speak_btn": "방문객 음성 입력", "staff_transcribing": "직원 음성 인식 중",
        "staff_recording": "직원 음성 녹음 중... 다시 클릭하여 종료", "staff_speak_btn": "직원 음성 입력",
        "customer_input_label": "방문객 입력", "customer_placeholder": "방문객이 말한 내용을 입력하세요.", "send": "전송",
        "staff_input_label": "직원 입력", "staff_placeholder": "직원이 말한 한국어 내용을 입력하세요.",
        "voice_supported_hint": "음성 버튼으로 녹음하거나 아래에 직접 텍스트를 입력하세요.", "voice_not_supported_hint": "이 브라우저는 음성 입력을 지원하지 않습니다.",
        "voice_recognizing": "음성을 인식하고 있습니다.", "voice_unrecognized_error": "음성을 인식하지 못했습니다.",
        "voice_failed_error": "음성 인식에 실패했습니다.", "mic_permission_status": "마이크 권한을 확인 중입니다.",
        "recording_status": "녹음 중... 최대 {{seconds}}초까지.", "mic_unsupported_error": "마이크에 액세스할 수 없습니다.",
        "input_required_customer": "방문객 문장을 먼저 입력해주세요.", "input_required_staff": "직원 문장을 먼저 입력해주세요.",
        "translating_status": "번역물을 준비하고 있습니다.", "translation_failed_error": "번역에 실패했습니다. 다시 시도해 주세요.",
        "empty_history_hint": "문장을 입력하면 이곳에 기록이 나타납니다.", "customer_role": "방문객", "staff_role": "직원",
        "replay_btn_label": "번역 음성 재생", "replay_not_supported_hint": "음성 재생이 지원되지 않습니다.",
        "play": "재생", "translated_status": "번역 완료", "source_only_status": "원문만 표시", "voice_too_short_error": "조금 더 길게 말씀해주세요."
    },
    "jp": {
        "back": "< 戻る", "title": "リアルタイム通訳", "subtitle": "観光客の言語は現在のアプリ言語に自動設定され、店舗の言語は韓国語に固定されます。",
        "onboarding": "観光客が入力した内容は韓国語に、店員が入力した韓国語は観光客の言語に翻訳されます。",
        "customer_lang": "観光客の言語", "staff_lang": "店舗の言語 (韓国語)", "mic_preparing": "マイクを準備中",
        "customer_transcribing": "観光客の音声を認識中", "customer_recording": "観光客の音声を録音中... 再度クリックして終了",
        "translating": "翻訳中", "customer_speak_btn": "観光客の音声入力", "staff_transcribing": "スタッフの音声を認識中",
        "staff_recording": "スタッフの音声を録音中... 再度クリックして終了", "staff_speak_btn": "スタッフの音声入力",
        "customer_input_label": "観光客の入力", "customer_placeholder": "観光客が話した内容を入力してください。", "send": "送信",
        "staff_input_label": "スタッフの入力", "staff_placeholder": "スタッフが話した韓国語の内容を入力してください。",
        "voice_supported_hint": "音声ボタンで録音するか、下にテキストを入力してください。", "voice_not_supported_hint": "このブラウザは音声入力をサポートしていません。",
        "voice_recognizing": "音声を認識しています。", "voice_unrecognized_error": "音声を認識できませんでした。",
        "voice_failed_error": "音声認識に失敗しました。", "mic_permission_status": "マイクの権限を確認しています。",
        "recording_status": "録音中... 最大 {{seconds}}秒まで.", "mic_unsupported_error": "マイクにアクセスできません。",
        "input_required_customer": "観光客の文章を先に入力してください。", "input_required_staff": "スタッフの文章を先に入力してください。",
        "translating_status": "翻訳文を準備しています。", "translation_failed_error": "翻訳に失敗しました。",
        "empty_history_hint": "履歴が表示されます。", "customer_role": "観光客", "staff_role": "スタッフ",
        "replay_btn_label": "翻訳音声を再生", "replay_not_supported_hint": "音声再生がサポートされていません。",
        "play": "再生", "translated_status": "翻訳完了", "source_only_status": "原文のみ表示", "voice_too_short_error": "もう少し長く話してください。"
    },
    "en": {
        "back": "< Back", "title": "Real-time Interpreter", "subtitle": "Customer language is set to app language; shop language is fixed to Korean.",
        "onboarding": "When the customer inputs, it translates to Korean; when the staff inputs Korean, it translates to your language.",
        "customer_lang": "Visitor Language", "staff_lang": "Store Language (Korean)", "mic_preparing": "Preparing Mic",
        "customer_transcribing": "Recognizing visitor...", "customer_recording": "Recording visitor... click again to finish",
        "translating": "Translating...", "customer_speak_btn": "Visitor Voice Input", "staff_transcribing": "Recognizing staff...",
        "staff_recording": "Recording staff... click again to finish", "staff_speak_btn": "Staff Voice Input",
        "customer_input_label": "Visitor Input", "customer_placeholder": "Type what the visitor said.", "send": "Send",
        "staff_input_label": "Staff Input", "staff_placeholder": "Type what the staff said in Korean.",
        "voice_supported_hint": "Record via mic or type text below.", "voice_not_supported_hint": "Voice input not supported. Use text.",
        "voice_recognizing": "Recognizing voice.", "voice_unrecognized_error": "Could not recognize voice.",
        "voice_failed_error": "Voice recognition failed.", "mic_permission_status": "Checking mic permission.",
        "recording_status": "Recording... max {{seconds}}s.", "mic_unsupported_error": "Mic not accessible.",
        "input_required_customer": "Input visitor sentence first.", "input_required_staff": "Input staff sentence first.",
        "translating_status": "Preparing translation.", "translation_failed_error": "Translation failed. Try again.",
        "empty_history_hint": "History will appear here.", "customer_role": "Visitor", "staff_role": "Staff",
        "replay_btn_label": "Replay translation", "replay_not_supported_hint": "Audio playback not supported.",
        "play": "Play", "translated_status": "Translated", "source_only_status": "Original Only", "voice_too_short_error": "Please speak longer."
    },
    "cn": {
        "back": "< 返回", "title": "实时翻译", "subtitle": "游客语言自动设置为当前应用语言，商店语言固定为韩语。",
        "onboarding": "游客输入的内容将翻译成韩语，店员输入的韩语将翻译成游客的语言。",
        "customer_lang": "游客语言", "staff_lang": "商店语言 (韩语)", "mic_preparing": "正在准备麦克风",
        "customer_transcribing": "正在识别游客语音", "customer_recording": "正在录制游客语音，再次点击以结束",
        "translating": "正在翻译", "customer_speak_btn": "游客语音输入", "staff_transcribing": "正在识别店员语音",
        "staff_recording": "正在录制店员语音，再次点击以结束", "staff_speak_btn": "店员语音输入",
        "customer_input_label": "游客输入", "customer_placeholder": "请输入游客说的话。", "send": "发送",
        "staff_input_label": "店员输入", "staff_placeholder": "请输入店员说的韩语内容。",
        "voice_supported_hint": "通过语音按钮录音或直接在下方输入文字。", "voice_not_supported_hint": "此浏览器不支持语音输入。请使用文字输入。",
        "voice_recognizing": "正在识别语音。", "voice_unrecognized_error": "无法识别语音。请说得更清晰一点。",
        "voice_failed_error": "语音识别失败。您可以继续使用文字输入。", "mic_permission_status": "正在确认麦克风权限。",
        "recording_status": "正在录音。最长可录制 {{seconds}} 秒。", "mic_unsupported_error": "无法使用麦克风。请检查权限或使用文字输入。",
        "input_required_customer": "请先输入游客的句子。", "input_required_staff": "请先输入店员的句子。",
        "translating_status": "正在准备翻译内容。", "translation_failed_error": "翻译失败。请尝试重新操作。",
        "empty_history_hint": "输入第一句话后，翻译记录将显示在这里。", "customer_role": "游客", "staff_role": "店员",
        "replay_btn_label": "重新播放翻译语音", "replay_not_supported_hint": "此浏览器不支持语音播放。",
        "play": "播放", "translated_status": "翻译完成", "source_only_status": "仅显示原文", "voice_too_short_error": "请多说一点，语音太短无法识别。"
    },
    "tw": {
        "back": "< 返回", "title": "即時翻譯", "subtitle": "遊客語言自動設置為當前應用語言，商店語言固定為韓語。",
        "onboarding": "遊客輸入的內容將翻譯成韓語，店员輸入的韓語將翻譯成遊客的語言。",
        "customer_lang": "遊客語言", "staff_lang": "商店語言 (韓語)", "mic_preparing": "正在準備麥克風",
        "customer_transcribing": "正在識別遊客語音", "customer_recording": "正在錄製遊客語音，再次點擊以結束",
        "translating": "正在翻譯", "customer_speak_btn": "遊客語音輸入", "staff_transcribing": "正在識別店員語音",
        "staff_recording": "正在錄製店員語音，再次點擊以結束", "staff_speak_btn": "店員語音輸入",
        "customer_input_label": "遊客輸入", "customer_placeholder": "請輸入遊客說的話。", "send": "發送",
        "staff_input_label": "店員輸入", "staff_placeholder": "請輸入店員說的韓語內容。",
        "voice_supported_hint": "通過語音按鈕錄音或直接在下方輸入文字。", "voice_not_supported_hint": "此瀏覽器不支援語音輸入。請使用文字輸入。",
        "voice_recognizing": "正在識別語音。", "voice_unrecognized_error": "無法識別語音。請說得更清晰一點。",
        "voice_failed_error": "語音識別失敗。您可以繼續使用文字輸入。", "mic_permission_status": "正在確認麥克風權限。",
        "recording_status": "正在錄音。最長可錄製 {{seconds}} 秒。", "mic_unsupported_error": "無法使用麥克風。請檢查權限或使用文字輸入。",
        "input_required_customer": "請先輸入遊客的句子。", "input_required_staff": "請先輸入店員的句子。",
        "translating_status": "正在準備翻譯內容。", "translation_failed_error": "翻譯失敗。請嘗試重新操作。",
        "empty_history_hint": "輸入第一句話後，翻譯記錄將顯示在這裡。", "customer_role": "遊客", "staff_role": "店員",
        "replay_btn_label": "重新播放翻譯語音", "replay_not_supported_hint": "此瀏覽器不支援語音播放。",
        "play": "播放", "translated_status": "翻譯完成", "source_only_status": "僅顯示原文", "voice_too_short_error": "請多說一點，語音太短無法識別。"
    },
    "vi": {
        "back": "< Quay lại", "title": "Thông dịch viên thời gian thực", "subtitle": "Ngôn ngữ khách được đặt theo ngôn ngữ ứng dụng; ngôn ngữ cửa hàng cố định là tiếng Hàn.",
        "onboarding": "Khi khách nhập, nó sẽ dịch sang tiếng Hàn; khi nhân viên nhập tiếng Hàn, nó sẽ dịch sang ngôn ngữ của bạn.",
        "customer_lang": "Ngôn ngữ khách", "staff_lang": "Ngôn ngữ cửa hàng (tiếng Hàn)", "mic_preparing": "Đang chuẩn bị micro",
        "customer_transcribing": "Đang nhận diện giọng khách...", "customer_recording": "Đang ghi âm khách... nhấp lại để kết thúc",
        "translating": "Đang dịch...", "customer_speak_btn": "Nhập giọng nói khách", "staff_transcribing": "Đang nhận diện giọng nhân viên...",
        "staff_recording": "Đang ghi âm nhân viên... nhấp lại để kết thúc", "staff_speak_btn": "Nhập giọng nói nhân viên",
        "customer_input_label": "Đầu vào khách", "customer_placeholder": "Nhập những gì khách đã nói.", "send": "Gửi",
        "staff_input_label": "Đầu vào nhân viên", "staff_placeholder": "Nhập những gì nhân viên nói bằng tiếng Hàn.",
        "voice_supported_hint": "Ghi âm qua micro hoặc nhập văn bản bên dưới.", "voice_not_supported_hint": "Trình duyệt này không hỗ trợ nhập bằng giọng nói. Sử dụng văn bản.",
        "voice_recognizing": "Đang nhận diện giọng nói.", "voice_unrecognized_error": "Không thể nhận diện giọng nói.",
        "voice_failed_error": "Nhận diện giọng nói thất bại.", "mic_permission_status": "Đang kiểm tra quyền truy cập micro.",
        "recording_status": "Đang ghi âm... tối đa {{seconds}} giây.", "mic_unsupported_error": "Không thể truy cập micro.",
        "input_required_customer": "Vui lòng nhập câu của khách trước.", "input_required_staff": "Vui lòng nhập câu của nhân viên trước.",
        "translating_status": "Đang chuẩn bị bản dịch.", "translation_failed_error": "Dịch thất bại. Vui lòng thử lại.",
        "empty_history_hint": "Lịch sử sẽ xuất hiện ở đây.", "customer_role": "Khách", "staff_role": "Nhân viên",
        "replay_btn_label": "Phát lại bản dịch", "replay_not_supported_hint": "Không hỗ trợ phát âm thanh.",
        "play": "Phát", "translated_status": "Đã dịch", "source_only_status": "Chỉ nguồn", "voice_too_short_error": "Vui lòng nói dài hơn một chút."
    },
    "th": {
        "back": "< กลับ", "title": "ล่ามแบบเรียลไทม์", "subtitle": "ภาษาของลูกค้าถูกตั้งตามภาษาของแอป ภาษาร้านค้าถูกกำหนดเป็นภาษาเกาหลี",
        "onboarding": "เมื่อลูกค้าป้อนข้อมูล ระบบจะแปลเป็นภาษาเกาหลี เมื่อพนักงานป้อนภาษาเกาหลี ระบบจะแปลเป็นภาษาของคุณ",
        "customer_lang": "ภาษาของผู้เยี่ยมชม", "staff_lang": "ภาษาร้านค้า (เกาหลี)", "mic_preparing": "กำลังเตรียมไมโครโฟน",
        "customer_transcribing": "กำลังจดจำเสียงของผู้เยี่ยมชม...", "customer_recording": "กำลังบันทึกเสียงผู้เยี่ยมชม... คลิกอีกครั้งเพื่อสิ้นสุด",
        "translating": "กำลังแปล...", "customer_speak_btn": "อินพุตเสียงผู้เยี่ยมชม", "staff_transcribing": "กำลังจดจำเสียงพนักงาน...",
        "staff_recording": "กำลังบันทึกเสียงพนักงาน... คลิกอีกครั้งเพื่อสิ้นสุด", "staff_speak_btn": "อินพุตเสียงพนักงาน",
        "customer_input_label": "อินพุตของผู้เยี่ยมชม", "customer_placeholder": "พิมพ์สิ่งที่ผู้เยี่ยมชมพูด", "send": "ส่ง",
        "staff_input_label": "อินพุตของพนักงาน", "staff_placeholder": "พิมพ์สิ่งที่พนักงานพูดเป็นภาษาเกาหลี",
        "voice_supported_hint": "บันทึกผ่านไมโครโฟนหรือพิมพ์ข้อความด้านล่าง", "voice_not_supported_hint": "เบราว์เซอร์นี้ไม่รองรับการป้อนข้อมูลด้วยเสียง ใช้ข้อความแทน",
        "voice_recognizing": "กำลังจดจำเสียง", "voice_unrecognized_error": "ไม่สามารถจดจำเสียงได้",
        "voice_failed_error": "การจดจำเสียงล้มเหลว", "mic_permission_status": "กำลังตรวจสอบสิทธิ์ไมโครโฟน",
        "recording_status": "กำลังบันทึก... สูงสุด {{seconds}} วินาที", "mic_unsupported_error": "ไม่สามารถเข้าถึงไมโครโฟนได้",
        "input_required_customer": "กรุณาป้อนประโยคของผู้เยี่ยมชมก่อน", "input_required_staff": "กรุณาป้อนประโยคของพนักงานก่อน",
        "translating_status": "กำลังเตรียมคำแปล", "translation_failed_error": "การแปลล้มเหลว โปรดลองอีกครั้ง",
        "empty_history_hint": "ประวัติจะปรากฏที่นี่", "customer_role": "ผู้เยี่ยมชม", "staff_role": "พนักงาน",
        "replay_btn_label": "เล่นเสียงแปลซ้ำ", "replay_not_supported_hint": "ไม่รองรับการเล่นเสียง",
        "play": "เล่น", "translated_status": "แปลแล้ว", "source_only_status": "ข้อความต้นฉบับเท่านั้น", "voice_too_short_error": "โปรดพูดให้ยาวกว่านี้อีกนิด"
    },
    "id": {
        "back": "< Kembali", "title": "Penerjemah Real-time", "subtitle": "Bahasa tamu diatur sesuai bahasa aplikasi; bahasa toko tetap bahasa Korea.",
        "onboarding": "Saat tamu menginput, akan diterjemahkan ke Korea; saat staf menginput bahasa Korea, akan diterjemahkan ke bahasa Anda.",
        "customer_lang": "Bahasa Pengunjung", "staff_lang": "Bahasa Toko (Korea)", "mic_preparing": "Menyiapkan Mikrofon",
        "customer_transcribing": "Mengenali suara pengunjung...", "customer_recording": "Merekam suara pengunjung... klik lagi untuk selesai",
        "translating": "Menerjemahkan...", "customer_speak_btn": "Input Suara Pengunjung", "staff_transcribing": "Mengenali suara staf...",
        "staff_recording": "Merekam suara staf... klik lagi untuk selesai", "staff_speak_btn": "Input Suara Staf",
        "customer_input_label": "Input Pengunjung", "customer_placeholder": "Ketik apa yang dikatakan pengunjung.", "send": "Kirim",
        "staff_input_label": "Input Staf", "staff_placeholder": "Ketik apa yang dikatakan staf dalam bahasa Korea.",
        "voice_supported_hint": "Rekam melalui mik atau ketik teks di bawah.", "voice_not_supported_hint": "Browser ini tidak hỗ trợ input suara. Gunakan teks.",
        "voice_recognizing": "Mengenali suara.", "voice_unrecognized_error": "Tidak dapat mengenali suara.",
        "voice_failed_error": "Pengenalan suara gagal.", "mic_permission_status": "Memeriksa izin mikrofon.",
        "recording_status": "Merekam... maks {{seconds}} dtk.", "mic_unsupported_error": "Mik tidak dapat diakses.",
        "input_required_customer": "Masukkan kalimat pengunjung terlebih dahulu.", "input_required_staff": "Masukkan kalimat staf terlebih dahulu.",
        "translating_status": "Menyiapkan terjemahan.", "translation_failed_error": "Terjemahan gagal. Coba lagi.",
        "empty_history_hint": "Riwayat akan muncul di sini.", "customer_role": "Pengunjung", "staff_role": "Staf",
        "replay_btn_label": "Putar ulang terjemahan", "replay_not_supported_hint": "Pemutaran audio tidak didukung.",
        "play": "Putar", "translated_status": "Diterjemahkan", "source_only_status": "Hanya Sumber", "voice_too_short_error": "Mohon bicara lebih lama."
    },
    "ms": {
        "back": "< Kembali", "title": "Penterjemah Masa Nyata", "subtitle": "Bahasa tetamu ditetapkan mengikut bahasa aplikasi; bahasa kedai tetap bahasa Korea.",
        "onboarding": "Apabila tetamu menginput, ia akan diterjemahkan ke Korea; apabila staf menginput bahasa Korea, ia akan diterjemahkan ke bahasa anda.",
        "customer_lang": "Bahasa Pelawat", "staff_lang": "Bahasa Kedai (Korea)", "mic_preparing": "Menyediakan Mikrofon",
        "customer_transcribing": "Mengenal pasti suara pelawat...", "customer_recording": "Merakam suara pelawat... klik lagi untuk tamat",
        "translating": "Menterjemah...", "customer_speak_btn": "Input Suara Pelawat", "staff_transcribing": "Mengenal pasti suara staf...",
        "staff_recording": "Merakam suara staf... klik lagi untuk tamat", "staff_speak_btn": "Input Suara Staf",
        "customer_input_label": "Input Pelawat", "customer_placeholder": "Taip apa yang dikatakan pelawat.", "send": "Hantar",
        "staff_input_label": "Input Staf", "staff_placeholder": "Taip apa yang dikatakan staf dalam bahasa Korea.",
        "voice_supported_hint": "Rakam melalui mik atau taip teks di bawah.", "voice_not_supported_hint": "Pelayar ini tidak menyokong input suara. Gunakan teks.",
        "voice_recognizing": "Mengenal pasti suara.", "voice_unrecognized_error": "Tidak dapat mengenal pasti suara.",
        "voice_failed_error": "Pengecaman suara gagal.", "mic_permission_status": "Memeriksa kebenaran mikrofon.",
        "recording_status": "Merakam... maks {{seconds}} saat.", "mic_unsupported_error": "Mik tidak boleh diakses.",
        "input_required_customer": "Sila masukkan ayat pelawat terlebih dahulu.", "input_required_staff": "Sila masukkan ayat staf terlebih dahulu.",
        "translating_status": "Menyediakan terjemahan.", "translation_failed_error": "Terjemahan gagal. Cuba lagi.",
        "empty_history_hint": "Sejarah akan muncul di sini.", "customer_role": "Pelawat", "staff_role": "Staf",
        "replay_btn_label": "Main semula terjemahan", "replay_not_supported_hint": "Main balik audio tidak disokong.",
        "play": "Main", "translated_status": "Diterjemah", "source_only_status": "Sumber Sahaja", "voice_too_short_error": "Sila bercakap lebih lama sedikit."
    },
    "es": {
        "back": "< Atrás", "title": "Traductor en tiempo real", "subtitle": "El idioma del cliente se establece según el idioma de la aplicación; el del negocio es coreano fijo.",
        "onboarding": "Cuando el cliente hable, se traducirá al coreano; cuando el personal hable en coreano, se traducirá a su idioma.",
        "customer_lang": "Idioma del visitante", "staff_lang": "Idioma del establecimiento (Coreano)", "mic_preparing": "Preparando micrófono",
        "customer_transcribing": "Reconociendo al visitante...", "customer_recording": "Grabando al visitante... haga clic de nuevo para terminar",
        "translating": "Traduciendo...", "customer_speak_btn": "Entrada de voz del visitante", "staff_transcribing": "Reconociendo al personal...",
        "staff_recording": "Grabando al personal... haga clic de nuevo para terminar", "staff_speak_btn": "Entrada de voz del personal",
        "customer_input_label": "Entrada del visitante", "customer_placeholder": "Escriba lo que dijo el visitante.", "send": "Enviar",
        "staff_input_label": "Entrada del personal", "staff_placeholder": "Escriba lo que dijo el personal en coreano.",
        "voice_supported_hint": "Grabe por micro o escriba el texto debajo.", "voice_not_supported_hint": "Este navegador no soporta entrada de voz. Use texto.",
        "voice_recognizing": "Reconociendo voz.", "voice_unrecognized_error": "No se pudo reconocer la voz.",
        "voice_failed_error": "Fallo en el reconocimiento de voz.", "mic_permission_status": "Comprobando permisos de micrófono.",
        "recording_status": "Grabando... máx. {{seconds}}s.", "mic_unsupported_error": "Micrófono no accesible.",
        "input_required_customer": "Introduzca primero la frase del visitante.", "input_required_staff": "Introduzca primero la frase del personal.",
        "translating_status": "Preparando traducción.", "translation_failed_error": "Error en la traducción. Inténtelo de nuevo.",
        "empty_history_hint": "El historial aparecerá aquí.", "customer_role": "Visitante", "staff_role": "Personal",
        "replay_btn_label": "Reproducir traducción", "replay_not_supported_hint": "Reproducción de audio no soportada.",
        "play": "Reproducir", "translated_status": "Traducido", "source_only_status": "Solo origen", "voice_too_short_error": "Por favor, hable un poco más."
    },
    "fr": {
        "back": "< Retour", "title": "Traducteur en temps réel", "subtitle": "Langue client : langue de l'app ; langue boutique : coréen (fixe).",
        "onboarding": "Ce que le client dit est traduit en coréen ; ce que le personnel dit en coréen est traduit dans votre langue.",
        "customer_lang": "Langue visiteur", "staff_lang": "Langue boutique (Coréen)", "mic_preparing": "Préparation du micro",
        "customer_transcribing": "Reconnaissance du visiteur...", "customer_recording": "Enregistrement du visiteur... cliquez pour arrêter",
        "translating": "Traduction...", "customer_speak_btn": "Entrée vocale visiteur", "staff_transcribing": "Reconnaissance du personnel...",
        "staff_recording": "Enregistrement du personnel... cliquez pour arrêter", "staff_speak_btn": "Entrée vocale personnel",
        "customer_input_label": "Entrée visiteur", "customer_placeholder": "Tapez ce que le visiteur a dit.", "send": "Envoyer",
        "staff_input_label": "Entrée personnel", "staff_placeholder": "Tapez ce que le personnel a dit en coréen.",
        "voice_supported_hint": "Enregistrez avec le micro ou tapez ci-dessous.", "voice_not_supported_hint": "Ce navigateur ne supporte pas l'entrée vocale.",
        "voice_recognizing": "Reconnaissance vocale en cours.", "voice_unrecognized_error": "Voix non reconnue.",
        "voice_failed_error": "Échec de la reconnaissance vocale.", "mic_permission_status": "Vérification des accès micro.",
        "recording_status": "Enregistrement... max {{seconds}}s.", "mic_unsupported_error": "Micro inaccessible.",
        "input_required_customer": "Saisissez d'abord la phrase du visiteur.", "input_required_staff": "Saisissez d'abord la phrase du personnel.",
        "translating_status": "Préparation de la traduction.", "translation_failed_error": "La traduction a échoué. Réessayez.",
        "empty_history_hint": "L'historique apparaîtra ici.", "customer_role": "Visiteur", "staff_role": "Personnel",
        "replay_btn_label": "Réécouter la traduction", "replay_not_supported_hint": "Lecture audio non supportée.",
        "play": "Lire", "translated_status": "Traduit", "source_only_status": "Source uniquement", "voice_too_short_error": "Parlez un peu plus longtemps s'il vous plaît."
    },
    "de": {
        "back": "< Zurück", "title": "Echtzeit-Übersetzer", "subtitle": "Besuchersprache ist App-Sprache; Ladensprache ist fest auf Koreanisch eingestellt.",
        "onboarding": "Eingaben des Besuchers werden ins Koreanische übersetzt; Koreanisch des Personals in Ihre Sprache.",
        "customer_lang": "Besuchersprache", "staff_lang": "Ladensprache (Koreanisch)", "mic_preparing": "Mikrofon wird vorbereitet",
        "customer_transcribing": "Besuchersprache wird erkannt...", "customer_recording": "Besucher wird aufgenommen... zum Beenden klicken",
        "translating": "Wird übersetzt...", "customer_speak_btn": "Spracheingabe Besucher", "staff_transcribing": "Personalstimme wird erkannt...",
        "staff_recording": "Personal wird aufgenommen... zum Beenden klicken", "staff_speak_btn": "Spracheingabe Personal",
        "customer_input_label": "Eingabe Besucher", "customer_placeholder": "Tippen Sie, was der Besucher gesagt hat.", "send": "Senden",
        "staff_input_label": "Eingabe Personal", "staff_placeholder": "Tippen Sie, was das Personal auf Koreanisch gesagt hat.",
        "voice_supported_hint": "Über Mik aufnehmen oder Text unten eingeben.", "voice_not_supported_hint": "Dieser Browser unterstützt keine Spracheingabe.",
        "voice_recognizing": "Spracherkennung läuft.", "voice_unrecognized_error": "Stimme konnte nicht erkannt werden.",
        "voice_failed_error": "Spracherkennung fehlgeschlagen.", "mic_permission_status": "Mikrofonberechtigung wird geprüft.",
        "recording_status": "Aufnahme... max. {{seconds}}s.", "mic_unsupported_error": "Mikrofon nicht zugänglich.",
        "input_required_customer": "Geben Sie zuerst den Satz des Besuchers ein.", "input_required_staff": "Geben Sie zuerst den Satz des Personals ein.",
        "translating_status": "Übersetzung wird vorbereitet.", "translation_failed_error": "Übersetzung fehlgeschlagen. Erneut versuchen.",
        "empty_history_hint": "Der Verlauf wird hier angezeigt.", "customer_role": "Besucher", "staff_role": "Personal",
        "replay_btn_label": "Übersetzung abspielen", "replay_not_supported_hint": "Audiowiedergabe nicht unterstützt.",
        "play": "Abspielen", "translated_status": "Übersetzt", "source_only_status": "Nur Quelle", "voice_too_short_error": "Bitte sprechen Sie etwas länger."
    },
    "ar": {
        "back": "< عودة", "title": "مترجم فوري", "subtitle": "لغة الزائر هي لغة التطبيق؛ لغة المتجر ثابتة على الكورية.",
        "onboarding": "عند إدخال الزائر، يترجم للكورية؛ وعند إدخال الموظف بالكورية، يترجم للغتك.",
        "customer_lang": "لغة الزائر", "staff_lang": "لغة المتجر (الكورية)", "mic_preparing": "جاري تحضير الميكروفون",
        "customer_transcribing": "جاري التعرف على صوت الزائر...", "customer_recording": "جاري تسجيل صوت الزائر... انقر مرة أخرى للإنهاء",
        "translating": "جاري الترجمة...", "customer_speak_btn": "إدخال صوتي للزائر", "staff_transcribing": "جاري التعرف على صوت الموظف...",
        "staff_recording": "جاري تسجيل صوت الموظف... انقر مرة أخرى للإنهاء", "staff_speak_btn": "إدخال صوتي للموظف",
        "customer_input_label": "مدخلات الزائر", "customer_placeholder": "اكتب ما قاله الزائر.", "send": "إرسال",
        "staff_input_label": "مدخلات الموظف", "staff_placeholder": "اكتب ما قاله الموظف بالكورية.",
        "voice_supported_hint": "سجل عبر الميكروفون أو اكتب النص أدناه.", "voice_not_supported_hint": "هذا المتصفح لا يدعم الإدخال الصوتي. استخدم النص.",
        "voice_recognizing": "جاري التعرف على الصوت.", "voice_unrecognized_error": "تعذر التعرف على الصوت.",
        "voice_failed_error": "فشل التعرف على الصوت.", "mic_permission_status": "جاري التحقق من أذونات الميكروفون.",
        "recording_status": "جاري التسجيل... الحد الأقصى {{seconds}} ثانية.", "mic_unsupported_error": "لا يمكن الوصول للميكروفون.",
        "input_required_customer": "يرجى إدخال جملة الزائر أولاً.", "input_required_staff": "يرجى إدخال جملة الموظف أولاً.",
        "translating_status": "جاري تجهيز الترجمة.", "translation_failed_error": "فشلت الترجمة. حاول مرة أخرى.",
        "empty_history_hint": "سجل المحادثات سيظهر هنا.", "customer_role": "الزائر", "staff_role": "الموظف",
        "replay_btn_label": "إعادة تشغيل الترجمة", "replay_not_supported_hint": "تشغيل الصوت غير مدعوم.",
        "play": "تشغيل", "translated_status": "تمت الترجمة", "source_only_status": "الأصل فقط", "voice_too_short_error": "يرجى التحدث لفترة أطول قليلاً."
    },
    "pt": {
        "back": "< Voltar", "title": "Intérprete em tempo real", "subtitle": "O idioma do cliente segue o idioma do app; o idioma da loja é fixo em coreano.",
        "onboarding": "Quando o cliente fala, traduz para coreano; quando o funcionário fala coreano, traduz para seu idioma.",
        "customer_lang": "Idioma do visitante", "staff_lang": "Idioma da loja (Coreano)", "mic_preparing": "Preparando microfone",
        "customer_transcribing": "Reconhecendo visitante...", "customer_recording": "Gravando visitante... clique de novo para terminar",
        "translating": "Traduzindo...", "customer_speak_btn": "Entrada de voz do visitante", "staff_transcribing": "Reconhecendo funcionário...",
        "staff_recording": "Gravando funcionário... clique de novo para terminar", "staff_speak_btn": "Entrada de voz do funcionário",
        "customer_input_label": "Entrada do visitante", "customer_placeholder": "Digite o que o visitante disse.", "send": "Enviar",
        "staff_input_label": "Entrada do funcionário", "staff_placeholder": "Digite o que o funcionário disse em coreano.",
        "voice_supported_hint": "Grave pelo micro ou digite o texto abaixo.", "voice_not_supported_hint": "Este navegador não suporta entrada de voz.",
        "voice_recognizing": "Reconhecendo voz.", "voice_unrecognized_error": "Voz não reconhecida.",
        "voice_failed_error": "Falha no reconhecimento de voz.", "mic_permission_status": "Verificando permissões do microfone.",
        "recording_status": "Gravando... máx. {{seconds}}s.", "mic_unsupported_error": "Microfone inacessível.",
        "input_required_customer": "Introduza primeiro a frase do visitante.", "input_required_staff": "Introduza primeiro a frase do funcionário.",
        "translating_status": "Preparando tradução.", "translation_failed_error": "A tradução falhou. Tente novamente.",
        "empty_history_hint": "O histórico aparecerá aqui.", "customer_role": "Visitante", "staff_role": "Funcionário",
        "replay_btn_label": "Reproduzir tradução", "replay_not_supported_hint": "Reprodução de áudio não suportada.",
        "play": "Reproduzir", "translated_status": "Traduzido", "source_only_status": "Apenas original", "voice_too_short_error": "Por favor, fale um pouco mais."
    },
    "ru": {
        "back": "< Назад", "title": "Синхронный переводчик", "subtitle": "Язык клиента соответствует языку приложения; язык магазина — корейский.",
        "onboarding": "Слова клиента переводятся на корейский; корейская речь персонала — на ваш язык.",
        "customer_lang": "Язык посетителя", "staff_lang": "Язык магазина (Корейский)", "mic_preparing": "Подготовка микрофона",
        "customer_transcribing": "Распознавание речи посетителя...", "customer_recording": "Запись посетителя... нажмите еще раз для завершения",
        "translating": "Перевод...", "customer_speak_btn": "Голосовой ввод посетителя", "staff_transcribing": "Распознавание речи персонала...",
        "staff_recording": "Запись персонала... нажмите еще раз для завершения", "staff_speak_btn": "Голосовой ввод персонала",
        "customer_input_label": "Ввод посетителя", "customer_placeholder": "Введите, что сказал посетитель.", "send": "Отправить",
        "staff_input_label": "Ввод персонала", "staff_placeholder": "Введите, что сказал персонал на корейском.",
        "voice_supported_hint": "Записывайте через микрофон или вводите текст ниже.", "voice_not_supported_hint": "Этот браузер не поддерживает голосовой ввод. Используйте текст.",
        "voice_recognizing": "Распознавание голоса.", "voice_unrecognized_error": "Не удалось распознать голос.",
        "voice_failed_error": "Ошибка распознавания голоса.", "mic_permission_status": "Проверка разрешений микрофона.",
        "recording_status": "Запись... макс. {{seconds}} сек.", "mic_unsupported_error": "Микрофон недоступен.",
        "input_required_customer": "Сначала введите фразу посетителя.", "input_required_staff": "Сначала введите фразу персонала.",
        "translating_status": "Подготовка перевода.", "translation_failed_error": "Ошибка перевода. Попробуйте еще раз.",
        "empty_history_hint": "История появится здесь.", "customer_role": "Посетитель", "staff_role": "Персонал",
        "replay_btn_label": "Воспроизвести перевод", "replay_not_supported_hint": "Воспроизведение аудио не поддерживается.",
        "play": "Пуск", "translated_status": "Переведено", "source_only_status": "Только оригинал", "voice_too_short_error": "Пожалуйста, говорите немного дольше."
    }
}

def update_locale_file(lang, translation):
    path = Path(f'c:/Users/USER/Desktop/kello/public/locales/{lang}/common.json')
    if not path.exists():
        print(f"Skipping {lang} - file not found: {path}")
        return
    
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update interpreter_page
    data["interpreter_page"] = translation
    
    # Also ensure basic navigation keys are native if needed (optional but good)
    # Most navigation seems OK from shared images, focusing on interpreter_page
    
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Successfully updated {lang}")

# Apply translations to all folders
for lang, content in translations.items():
    update_locale_file(lang, content)

print("\nAll 15 languages processed.")
