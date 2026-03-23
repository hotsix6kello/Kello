import json
import os

file_path = r'c:\Users\USER\Desktop\kello\public\locales\ko\common.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

data["interpreter_page"] = {
    "back": "< 뒤로",
    "title": "실시간 통역기",
    "subtitle": "여행자 언어는 현재 앱 설정 언어로 자동 설정되며, 상점 언어는 한국어로 고정됩니다.",
    "onboarding": "여행자가 입력한 내용은 한국어로 번역되고, 상점에서 입력한 한국어는 여행자 언어로 번역됩니다.",
    "customer_lang": "여행자 언어",
    "staff_lang": "상점 언어",
    "mic_preparing": "마이크 준비 중",
    "customer_transcribing": "여행자 음성 인식 중",
    "customer_recording": "여행자 음성 녹음 중, 다시 클릭하면 종료됩니다",
    "translating": "번역 중",
    "customer_speak_btn": "여행자 음성 입력",
    "staff_transcribing": "상점 음성 인식 중",
    "staff_recording": "상점 음성 녹음 중, 다시 클릭하면 종료됩니다",
    "staff_speak_btn": "상점 음성 입력",
    "customer_input_label": "여행자 입력",
    "customer_placeholder": "여행자가 한 말을 입력하세요.",
    "send": "전송",
    "staff_input_label": "상점 입력",
    "staff_placeholder": "상점이 한 한국어 내용을 입력하세요.",
    "voice_supported_hint": "음성 버튼으로 녹음하거나 아래에 텍스트를 직접 입력하세요.",
    "voice_not_supported_hint": "이 브라우저는 음성 입력을 지원하지 않습니다. 텍스트 입력을 사용해 주세요.",
    "voice_recognizing": "음성을 인식하고 있습니다.",
    "voice_unrecognized_error": "음성을 인식하지 못했습니다. 좀 더 명확하게 말씀해 주세요.",
    "voice_failed_error": "음성 인식에 실패했습니다. 텍스트 입력을 계속 사용할 수 있습니다.",
    "mic_permission_status": "마이크 권한을 확인하고 있습니다.",
    "recording_status": "녹음 중입니다. 최대 {{seconds}}초까지 가능합니다.",
    "mic_unsupported_error": "마이크를 사용할 수 없습니다. 브라우저 권한을 확인하거나 텍스트를 입력해 주세요.",
    "input_required_customer": "여행자의 문장을 먼저 입력해 주세요.",
    "input_required_staff": "상점의 문장을 먼저 입력해 주세요.",
    "translating_status": "번역을 준비하고 있습니다.",
    "translation_failed_error": "번역 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
    "empty_history_hint": "첫 문장을 입력하면 번역 기록이 여기에 표시됩니다.",
    "customer_role": "여행자",
    "staff_role": "상점/스태프",
    "replay_btn_label": "번역 음성 다시 듣기",
    "replay_not_supported_hint": "이 브라우저는 음성 재생을 지원하지 않습니다.",
    "play": "재생",
    "translated_status": "번역 완료",
    "source_only_status": "원본 표시",
    "voice_too_short_error": "좀 더 길게 말씀해 주세요. 음성이 너무 짧으면 인식이 어렵습니다."
}

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
