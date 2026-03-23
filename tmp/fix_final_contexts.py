import json
from pathlib import Path

# Context translations for all 15 languages
context_translations = {
    "ko": {
        "visit": "{{storeName}} 방문 시 통역기 사용 중",
        "service": "{{storeName}}에서 {{serviceName}} 이용 시 통역기 사용 중"
    },
    "jp": {
        "visit": "{{storeName}} 訪問時に通訳機を使用中",
        "service": "{{storeName}}での {{serviceName}} 利用時に通訳機を使用中"
    },
    "en": {
        "visit": "Using interpreter during visit to {{storeName}}.",
        "service": "Using interpreter for {{serviceName}} at {{storeName}}."
    },
    "cn": {
        "visit": "访问 {{storeName}} 时正在使用翻译器",
        "service": "在 {{storeName}} 办理 {{serviceName}} 时正在使用翻译器"
    },
    "tw": {
        "visit": "訪問 {{storeName}} 時正在使用翻譯器",
        "service": "在 {{storeName}} 辦理 {{serviceName}} 時正在使用翻譯器"
    },
    "vi": {
        "visit": "Đang dùng phiên dịch khi ghé thăm {{storeName}}",
        "service": "Đang dùng phiên dịch cho dịch vụ {{serviceName}} tại {{storeName}}"
    },
    "th": {
        "visit": "กำลังใช้เครื่องแปลภาษาระหว่างเข้าชม {{storeName}}",
        "service": "กำลังใช้เครื่องแปลภาษาสำหรับ {{serviceName}} ที่ {{storeName}}"
    },
    "id": {
        "visit": "Menggunakan penerjemah saat mengunjungi {{storeName}}",
        "service": "Menggunakan penerjemah untuk {{serviceName}} di {{storeName}}"
    },
    "ms": {
        "visit": "Menggunakan penterjemah semasa melawat {{storeName}}",
        "service": "Menggunakan penterjemah untuk {{serviceName}} di {{storeName}}"
    },
    "es": {
        "visit": "Usando traductor durante la visita a {{storeName}}",
        "service": "Usando traductor para {{serviceName}} en {{storeName}}"
    },
    "fr": {
        "visit": "Utilisation d'un interprète lors de la visite du {{storeName}}",
        "service": "Utilisation d'un interprète pour {{serviceName}} au {{storeName}}"
    },
    "de": {
        "visit": "Dolmetscher wird beim Besuch von {{storeName}} verwendet",
        "service": "Dolmetscher wird für {{serviceName}} bei {{storeName}} verwendet"
    },
    "ar": {
        "visit": "استخدام المترجم أثناء زيارة {{storeName}}",
        "service": "استخدام المترجم لـ {{serviceName}} في {{storeName}}"
    },
    "pt": {
        "visit": "Usando intérprete durante a visita ao {{storeName}}",
        "service": "Usando intérprete para {{serviceName}} no {{storeName}}"
    },
    "ru": {
        "visit": "Используется переводчик во время посещения {{storeName}}",
        "service": "Используется переводчик для {{serviceName}} в {{storeName}}"
    }
}

def update_context_translations(folder):
    path = Path(f'c:/Users/USER/Desktop/kello/public/locales/{folder}/common.json')
    if not path.exists(): return
    
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)
    
    if "beauty_bookings" not in data:
        data["beauty_bookings"] = {}
    
    lang_key = folder
    if lang_key == 'jp': lang_key = 'ja'
    elif lang_key == 'cn': lang_key = 'zh-CN'
    elif lang_key == 'tw': lang_key = 'zh-HK'
    
    if lang_key in context_translations:
        data["beauty_bookings"]["interpreter_visit_context"] = context_translations[lang_key]["visit"]
        data["beauty_bookings"]["interpreter_visit_service_context"] = context_translations[lang_key]["service"]
    
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated context translations in {folder}")

folders = ["ar", "cn", "de", "en", "es", "fr", "id", "jp", "ko", "ms", "pt", "ru", "th", "tw", "vi"]
for f in folders:
    update_context_translations(f)

print("\nFinal comprehensive translation update complete.")
