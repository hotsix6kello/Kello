import json
import os
from pathlib import Path

languages = ["jp", "cn", "tw", "ko", "en", "vi", "th", "id", "ms"]

# Revised JP
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
    "voice_not_supported_hint": "このブラウザは音声入力をサポートしていません。テキスト入力を使用してください。",
    "voice_recognizing": "音声を認識しています。",
    "voice_unrecognized_error": "音声を認識できませんでした。もう少しはっきり話してください。",
    "voice_failed_error": "音声認識に失敗しました。テキスト入力を使用できます。",
    "mic_permission_status": "マイクの権限を確認しています。",
    "recording_status": "録音中... 最大 {{seconds}}秒まで.",
    "mic_unsupported_error": "マイクにアクセスできません。権限を確認してください。",
    "input_required_customer": "観光客の文章を先に入力してください。",
    "input_required_staff": "スタッフの文章を先に入力してください。",
    "translating_status": "翻訳文を準備しています。",
    "translation_failed_error": "翻訳に失敗しました。再試行してください。",
    "empty_history_hint": "最初の文章を入力すると、ここに履歴が表示されます。",
    "customer_role": "観光客",
    "staff_role": "店舗/スタッフ",
    "replay_btn_label": "翻訳音声を再生",
    "replay_not_supported_hint": "音声再生がサポートされていません。",
    "play": "再生",
    "translated_status": "翻訳完了",
    "source_only_status": "原文のみ表示",
    "voice_too_short_error": "もう少し長く話してください。"
}

# Revised CN (Simplified)
cn_translations = {
    "back": "< 返回",
    "title": "实时翻译",
    "subtitle": "游客语言自动设置为当前应用语言，商店语言固定为韩语。",
    "onboarding": "游客输入的内容将翻译成韩语，店员输入的韩语将翻译成游客的语言。",
    "customer_lang": "游客语言",
    "staff_lang": "商店语言 (韩语)",
    "mic_preparing": "正在准备麦克风",
    "customer_transcribing": "正在识别游客语音",
    "customer_recording": "正在录制游客语音，再次点击以结束",
    "translating": "正在翻译",
    "customer_speak_btn": "游客语音输入",
    "staff_transcribing": "正在识别店员语音",
    "staff_recording": "正在录制店员语音，再次点击以结束",
    "staff_speak_btn": "店员语音输入",
    "customer_input_label": "游客输入",
    "customer_placeholder": "请输入游客说的话。",
    "send": "发送",
    "staff_input_label": "店员输入",
    "staff_placeholder": "请输入店员说的韩语内容。",
    "voice_supported_hint": "通过语音按钮录音或直接在下方输入文字。",
    "voice_not_supported_hint": "此浏览器不支持语音输入。请使用文字输入。",
    "voice_recognizing": "正在识别语音。",
    "voice_unrecognized_error": "无法识别语音。请说得更清晰一点。",
    "voice_failed_error": "语音识别失败。您可以继续使用文字输入。",
    "mic_permission_status": "正在确认麦克风权限。",
    "recording_status": "正在录音。最长可录制 {{seconds}} 秒。",
    "mic_unsupported_error": "无法使用麦克风。请检查权限或使用文字输入。",
    "input_required_customer": "请先输入游客的句子。",
    "input_required_staff": "请先输入店员的句子。",
    "translating_status": "正在准备翻译内容。",
    "translation_failed_error": "翻译失败。请尝试重新操作。",
    "empty_history_hint": "输入第一句话后，翻译记录将显示在这里。",
    "customer_role": "游客",
    "staff_role": "店员",
    "replay_btn_label": "重新播放翻译语音",
    "replay_not_supported_hint": "此浏览器不支持语音播放。",
    "play": "播放",
    "translated_status": "翻译完成",
    "source_only_status": "仅显示原文",
    "voice_too_short_error": "请多说一点，语音太短无法识别。"
}

# Add common lang keys
lang_translations_jp = {
    "lang_ko": "韓国語",
    "lang_en": "英語",
    "lang_ja": "日本語",
    "lang_zh_cn": "中国語 (簡体字)",
    "lang_zh_hk": "中国語 (繁体字)",
    "lang_vi": "ベトナム語",
    "lang_th": "タイ語",
    "lang_id": "インドネシア語",
    "lang_ms": "マレー語"
}

lang_translations_cn = {
    "lang_ko": "韩语",
    "lang_en": "英语",
    "lang_ja": "日语",
    "lang_zh_cn": "中文 (简体)",
    "lang_zh_hk": "中文 (繁体)",
    "lang_vi": "越南语",
    "lang_th": "泰语",
    "lang_id": "印尼语",
    "lang_ms": "马来语"
}

def update_locale_file(lang, translation, beauty_langs=None):
    base_dir = Path('c:/Users/USER/Desktop/kello/public/locales')
    path = base_dir / lang / 'common.json'
    if not path.exists(): return
    with path.open('r', encoding='utf-8') as f:
        data = json.load(f)
    data["interpreter_page"] = translation
    if beauty_langs:
        if "beauty_bookings" not in data:
            data["beauty_bookings"] = {}
        data["beauty_bookings"].update(beauty_langs)
    with path.open('w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

update_locale_file("jp", jp_translations, lang_translations_jp)
update_locale_file("cn", cn_translations, lang_translations_cn)

print("Updated JP and CN locales")
