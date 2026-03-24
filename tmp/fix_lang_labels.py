import json
from pathlib import Path

# Labels for all 15 languages in their native script
lang_labels = {
    "lang_ko": "한국어",
    "lang_en": "English",
    "lang_ja": "日本語",
    "lang_zh_cn": "简体中文",
    "lang_zh_hk": "繁體中文",
    "lang_vi": "Tiếng Việt",
    "lang_th": "ไทย",
    "lang_id": "Bahasa Indonesia",
    "lang_ms": "Bahasa Melayu",
    "lang_es": "Español",
    "lang_fr": "Français",
    "lang_de": "Deutsch",
    "lang_ar": "العربية",
    "lang_pt": "Português",
    "lang_ru": "Русский"
}

def update_lang_list(folder):
    path = Path(f'c:/Users/USER/Desktop/kello/public/locales/{folder}/common.json')
    if not path.exists(): return
    
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)
    
    if "beauty_bookings" not in data:
        data["beauty_bookings"] = {}
    
    # Update/Add all 15 language labels
    for key, label in lang_labels.items():
        data["beauty_bookings"][key] = label
        
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Updated language list in {folder}")

folders = ["ar", "cn", "de", "en", "es", "fr", "id", "jp", "ko", "ms", "pt", "ru", "th", "tw", "vi"]
for f in folders:
    update_lang_list(f)

print("\nAll 15 language labels updated across all locale files.")
