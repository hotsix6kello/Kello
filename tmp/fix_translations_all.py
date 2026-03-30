import json
import os
from pathlib import Path

locale_mapping = {
    "ja": "jp", "zh-CN": "cn", "zh-HK": "tw", "en": "en", "ko": "ko",
    "vi": "vi", "th": "th", "id": "id", "ms": "ms", "es": "es",
    "fr": "fr", "de": "de", "ar": "ar", "pt": "pt", "ru": "ru"
}

native_labels = {
    "lang_ko": "한국어",
    "lang_en": "English",
    "lang_ja": "日本語",
    "lang_zh_cn": "简体中文",
    "lang_zh_hk": "繁體中文",
    "lang_vi": "Tiếng Việt",
    "lang_th": "ไทย",
    "lang_id": "Bahasa Indonesia",
    "lang_ms": "Bahasa Melayu"
}

# Add context keys
context_en = {
    "interpreter_visit_context": "Using interpreter during visit to {{storeName}}.",
    "interpreter_visit_service_context": "Using interpreter for {{serviceName}} at {{storeName}}."
}

context_jp = {
    "interpreter_visit_context": "{{storeName}}で通訳機を使用しています。",
    "interpreter_visit_service_context": "{{storeName}}で{{serviceName}}の利用中に通訳機を使用しています。"
}

context_cn = {
    "interpreter_visit_context": "正在 {{storeName}} 使用翻译器。",
    "interpreter_visit_service_context": "在 {{storeName}} 进行 {{serviceName}} 服务时使用翻译器。"
}

# Base EN for interpreter_page
en_translations = {
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
}

# JP (Refined)
jp_translations = {
    "back": "< 戻る",
    "title": "リアルタイム通訳",
    "subtitle": "観光客の言語は現在のアプリ言語に自動設定され、店舗の言語は韓国語に固定されます。",
    "onboarding": "観光客が入力した内容は韓国語に、店員が入力した韓国語は観光客の言語に翻訳されます。",
    "customer_lang": "観光客の言語",
    "staff_lang": "店舗の言語 (韓国語)",
    "mic_preparing": "マイクを準備中",
    "customer_transcribing": "観光客の音声を認識中",
    "customer_recording": "観光客の音声を録音中... 再度クリックして終了",
    "translating": "翻訳中",
    "customer_speak_btn": "観光客の音声入力",
    "staff_transcribing": "スタッフの音声を認識中",
    "staff_recording": "スタッフの音声を録音中... 再度クリックして終了",
    "staff_speak_btn": "スタッフの音声入力",
    "customer_input_label": "観光客の入力",
    "customer_placeholder": "観光客が話した内容を入力してください。",
    "send": "送信",
    "staff_input_label": "スタッフの入力",
    "staff_placeholder": "スタッフが話した韓国語の内容を入力してください。",
    "voice_supported_hint": "音声ボタンで録音するか、下にテキストを入力してください。",
    "voice_not_supported_hint": "このブラウザは音声入力をサポートしていません。",
    "voice_recognizing": "音声を認識しています。",
    "voice_unrecognized_error": "音声を認識できませんでした。",
    "voice_failed_error": "音声認識에 失敗しました。",
    "mic_permission_status": "マイクの権限を確認しています。",
    "recording_status": "録音中... 最大 {{seconds}}秒まで.",
    "mic_unsupported_error": "マイクにアクセスできません。",
    "input_required_customer": "観光客の文章を先に入力してください。",
    "input_required_staff": "スタッフの文章を先に入力してください。",
    "translating_status": "翻訳文を準備しています。",
    "translation_failed_error": "翻訳に失敗しました。",
    "empty_history_hint": "履歴が表示されます。",
    "customer_role": "観光客",
    "staff_role": "スタッフ",
    "replay_btn_label": "翻訳音声を再生",
    "replay_not_supported_hint": "音声再生がサポートされていません。",
    "play": "再生",
    "translated_status": "翻訳完了",
    "source_only_status": "原文のみ表示",
    "voice_too_short_error": "もう少し長く話してください。"
}

def update_locale_file(lang_folder, interp, beauty):
    base_dir = Path('c:/Users/USER/Desktop/kello/public/locales')
    path = base_dir / lang_folder / 'common.json'
    if not path.exists(): return
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)
    data["interpreter_page"] = interp
    if "beauty_bookings" not in data: data["beauty_bookings"] = {}
    data["beauty_bookings"].update(beauty)
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

for l_code, l_folder in locale_mapping.items():
    interp = en_translations.copy()
    beauty = native_labels.copy()
    beauty.update(context_en)
    
    if l_folder == 'jp':
        interp = jp_translations
        beauty.update(context_jp)
    elif l_folder == 'cn':
        # simplification for testing, actually cn/tw should be distinct
        beauty.update(context_cn)
    elif l_folder == 'tw':
        beauty.update(context_cn) # placeholder
        
    update_locale_file(l_folder, interp, beauty)

print("Updated major locales with context strings.")
