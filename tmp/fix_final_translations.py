import json
import os
from pathlib import Path

# Mapping of community related translations for 15 languages
community_data = {
    "ko": {
        "nav": "커뮤니티",
        "title": "커뮤니티",
        "subtitle": "현지인 및 여행자들과 소통하세요",
        "filters": {"all": "전체", "meetup": "맛집 & 모임", "travel": "동행 찾기", "help": "현지 도움", "review": "후기"},
        "labels": {"comments": "댓글", "message": "메시지", "detail": "게시글 상세"}
    },
    "jp": {
        "nav": "コミュニティ",
        "title": "コミュニティ",
        "subtitle": "現地の日本人や旅行者と交流しましょう",
        "filters": {"all": "すべて", "meetup": "グルメ・オフ会", "travel": "同行者募集", "help": "現地サポート", "review": "レビュー"},
        "labels": {"comments": "コメント", "message": "メッセージ", "detail": "投稿詳細"}
    },
    "en": {
        "nav": "Community",
        "title": "Community",
        "subtitle": "Connect with locals & travelers",
        "filters": {"all": "All", "meetup": "Food & Meetup", "travel": "Travel Mate", "help": "Local Help", "review": "Reviews"},
        "labels": {"comments": "Comments", "message": "Message", "detail": "Post Detail"}
    },
    "cn": {
        "nav": "社区",
        "title": "社区",
        "subtitle": "与当地人及旅行者在线交流",
        "filters": {"all": "全部", "meetup": "美食与聚会", "travel": "寻找同伴", "help": "当地求助", "review": "评价"},
        "labels": {"comments": "评论", "message": "消息", "detail": "帖子详情"}
    },
    "tw": {
        "nav": "社區",
        "title": "社區",
        "subtitle": "與當地人及旅行者在線交流",
        "filters": {"all": "全部", "meetup": "美食與聚會", "travel": "尋找同伴", "help": "當地求助", "review": "評價"},
        "labels": {"comments": "評論", "message": "消息", "detail": "貼文詳情"}
    },
    "vi": {
        "nav": "Cộng đồng",
        "title": "Cộng đồng",
        "subtitle": "Kết nối với người bản địa và du khách",
        "filters": {"all": "Tất cả", "meetup": "Ẩm thực & Gặp gỡ", "travel": "Bạn đồng hành", "help": "Hỗ trợ địa phương", "review": "Đánh giá"},
        "labels": {"comments": "Bình luận", "message": "Tin nhắn", "detail": "Chi tiết bài viết"}
    },
    "th": {
        "nav": "ชุมชน",
        "title": "ชุมชน",
        "subtitle": "เชื่อมต่อกับคนท้องถิ่นและนักเดินทาง",
        "filters": {"all": "ทั้งหมด", "meetup": "อาหารและมิตติ้ง", "travel": "หาเพื่อนร่วมทาง", "help": "ความช่วยเหลือในพื้นที่", "review": "รีวิว"},
        "labels": {"comments": "ความคิดเห็น", "message": "ข้อความ", "detail": "รายละเอียดโพสต์"}
    },
    "id": {
        "nav": "Komunitas",
        "title": "Komunitas",
        "subtitle": "Terhubung dengan warga lokal & pelancong",
        "filters": {"all": "Semua", "meetup": "Kuliner & Pertemuan", "travel": "Teman Perjalanan", "help": "Bantuan Lokal", "review": "Ulasan"},
        "labels": {"comments": "Komentar", "message": "Pesan", "detail": "Detail Postingan"}
    },
    "ms": {
        "nav": "Komuniti",
        "title": "Komuniti",
        "subtitle": "Berhubung dengan penduduk tempatan & pelancong",
        "filters": {"all": "Semua", "meetup": "Makanan & Pertemuan", "travel": "Rakan Perjalanan", "help": "Bantuan Tempatan", "review": "Ulasan"},
        "labels": {"comments": "Komen", "message": "Mesej", "detail": "Butiran Siaran"}
    },
    "es": {
        "nav": "Comunidad",
        "title": "Comunidad",
        "subtitle": "Conecta con locales y viajeros",
        "filters": {"all": "Todo", "meetup": "Comida y Quedadas", "travel": "Compañero de Viaje", "help": "Ayuda Local", "review": "Reseñas"},
        "labels": {"comments": "Comentarios", "message": "Mensaje", "detail": "Detalle de publicación"}
    },
    "fr": {
        "nav": "Communauté",
        "title": "Communauté",
        "subtitle": "Connectez-vous avec les locaux et les voyageurs",
        "filters": {"all": "Tout", "meetup": "Gastronomie & Rencontres", "travel": "Compagnon de voyage", "help": "Aide locale", "review": "Avis"},
        "labels": {"comments": "Commentaires", "message": "Message", "detail": "Détails du post"}
    },
    "de": {
        "nav": "Community",
        "title": "Community",
        "subtitle": "Vernetzen Sie sich mit Einheimischen & Reisenden",
        "filters": {"all": "Alle", "meetup": "Essen & Treffen", "travel": "Reisepartner", "help": "Lokale Hilfe", "review": "Bewertungen"},
        "labels": {"comments": "Kommentare", "message": "Nachricht", "detail": "Beitragsdetails"}
    },
    "ar": {
        "nav": "المجتمع",
        "title": "المجتمع",
        "subtitle": "تواصل مع السكان المحليين والمسافرين",
        "filters": {"all": "الكل", "meetup": "طعام ولقاءات", "travel": "رفيق سفر", "help": "مساعدة محلية", "review": "تقييمات"},
        "labels": {"comments": "تعليقات", "message": "رسالة", "detail": "تفاصيل المنشور"}
    },
    "pt": {
        "nav": "Comunidade",
        "title": "Comunidade",
        "subtitle": "Conecte-se com locais e viajantes",
        "filters": {"all": "Tudo", "meetup": "Comida e Encontros", "travel": "Parceiro de Viagem", "help": "Ajuda Local", "review": "Avaliações"},
        "labels": {"comments": "Comentários", "message": "Mensagem", "detail": "Detalhes da postagem"}
    },
    "ru": {
        "nav": "Сообщество",
        "title": "Сообщество",
        "subtitle": "Общайтесь с местными и путешественниками",
        "filters": {"all": "Все", "meetup": "Еда и встречи", "travel": "Попутчик", "help": "Местная помощь", "review": "Отзывы"},
        "labels": {"comments": "Комментарии", "message": "Сообщение", "detail": "Детали поста"}
    }
}

# Vietnamese Corrupted String Correction Map
vi_fix_map = {
    "N?p l?i": "Nộp lại",
    "??ng k? ??i t?c": "Đăng ký đối tác",
    "H? tr? ??t ch?": "Hỗ trợ đặt chỗ",
    "G?i 112": "Gọi 112", "G?i 119": "Gọi 119", "G?i 1330": "Gọi 1330",
    "??ng": "Đóng", "Li?n h? h? tr?": "Liên hệ hỗ trợ", "?? sao ch?p": "Đã sao chép",
    "Sao ch?p": "Sao chép", "H? tr? kh?n c?p": "Hỗ trợ khẩn cấp", "Kh?m ph? ??a ?i?m": "Khám phá địa điểm",
    "H? tr? chung": "Hỗ trợ chung", "Nh?n h? tr?": "Nhận hỗ trợ", "?i t?i ??nh gi?": "Đi tới đánh giá",
    "H? tr? phi?n d?ch": "Hỗ trợ phiên dịch", "??t ch? c?a t?i": "Đặt chỗ của tôi", "c?a t?i": "của tôi",
    "Th?m v?o k? ho?ch": "Thêm vào kế hoạch", "Quay l?i": "Quay lại", "Xem c?ng ??ng": "Xem cộng đồng",
    "G?i ph?ng kh?m": "Gọi phòng khám", "Ti?p t?c ch?nh s?a": "Tiếp tục chỉnh sửa", "T?o k? ho?ch": "Tạo kế hoạch",
    "Qu?n l?": "Quản lý", "M?": "Mở", "Xem chi ti?t ??a ?i?m": "Xem chi tiết địa điểm", "Xem k? ho?ch": "Xem kế hoạch",
    "Vi?t ??nh gi?": "Viết đánh giá", "?ang ho?t ??ng": "Đang hoạt động", "?? duy?t": "Đã duyệt",
    "Y?u th?ch": "Yêu thích", "Th??ng d?ng": "Thường dùng", "C?n xem x?t": "Cần xem xét", "C?n c?p nh?t": "Cần cập nhật",
    "Ch?a kh? d?ng": "Chưa khả dụng", "Ch?a k?t n?i": "Chưa kết nối", "Ch?a tham gia": "Chưa tham gia",
    "Ch?a thi?t l?p": "Chưa thiết lập", "Ch?a x?c minh": "Chưa xác minh", "?ang ch? duy?t": "Đang chờ duyệt",
    "G?n ??y": "Gần đây", "C?n ??ng nh?p": "Cần đăng nhập", "?? x?c minh": "Đã xác minh", " Meetup": " Gặp gỡ",
    "?? l?u": "Đã lưu", "?? d?ng": "Đã dùng", "ng?y": "ngày", "chi ti?t": "chi tiết", "b?n d??i": "bên dưới",
    "y?u c?u": "yêu cầu", "phi?n d?ch": "phiên dịch", "c?u du l?ch": "câu du lịch", "y t?": "y tế",
    "an to?n": "an toàn", "ng?n ng?": "ngôn ngữ", "??a ?i?m": "địa điểm", "h?n ch?": "hạn chế",
    "h? s?": "hồ sơ", "th?ng b?o": "thông báo", "quy?n ri?ng t?": "quyền riêng tư"
}

def fix_vi_corruption(text):
    if not isinstance(text, str): return text
    for junk, good in vi_fix_map.items():
        text = text.replace(junk, good)
    return text

def fix_json_recursively(obj):
    if isinstance(obj, dict):
        return {k: fix_json_recursively(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [fix_json_recursively(v) for v in obj]
    else:
        return fix_vi_corruption(obj)

def update_comprehensive(lang_folder):
    path = Path(f'c:/Users/USER/Desktop/kello/public/locales/{lang_folder}/common.json')
    if not path.exists(): return
    
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)
    
    # 1. Fix Vietnamese corruption globally if lang is vi
    if lang_folder == 'vi':
        data = fix_json_recursively(data)
    
    # 2. Update common.community_nav
    lang_key = lang_folder
    if lang_key == 'jp': lang_key = 'ja'
    elif lang_key == 'cn': lang_key = 'zh-CN'
    elif lang_key == 'tw': lang_key = 'zh-HK'
    
    if lang_key in community_data:
        c_info = community_data[lang_key]
        if "common" in data:
            data["common"]["community_nav"] = c_info["nav"]
        
        # 3. Update community_page
        # Explicitly ensure it is a dict to satisfy type checkers
        if "community_page" not in data or not isinstance(data["community_page"], dict):
            data["community_page"] = {}
        
        target = data["community_page"]
        target["title"] = c_info["title"]
        target["subtitle"] = c_info["subtitle"]
        target["filter_all"] = c_info["filters"]["all"]
        target["filter_meetup"] = c_info["filters"]["meetup"]
        target["filter_travel"] = c_info["filters"]["travel"]
        target["filter_help"] = c_info["filters"]["help"]
        target["filter_review"] = c_info["filters"]["review"]
        target["comments"] = c_info["labels"]["comments"]
        target["message"] = c_info["labels"]["message"]
        target["detail"] = c_info["labels"]["detail"]

    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Comprehensive update for {lang_folder} completed.")

# Folders to process
folders = ["ar", "cn", "de", "en", "es", "fr", "id", "jp", "ko", "ms", "pt", "ru", "th", "tw", "vi"]
for folder in folders:
    update_comprehensive(folder)

print("\nAll languages improved and major English gaps filled.")
