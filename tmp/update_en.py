import json
import os

file_path = r'c:\Users\USER\Desktop\kello\public\locales\en\common.json'

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

data["interpreter_page"] = {
    "back": "< Back",
    "title": "Real-time Interpreter",
    "subtitle": "Customer language is set to app language; shop language is fixed to Korean.",
    "onboarding": "Customer input is translated to Korean; shop input is translated to your language.",
    "customer_lang": "Customer Language",
    "staff_lang": "Shop Language",
    "mic_preparing": "Preparing microphone",
    "customer_transcribing": "Transcribing customer voice",
    "customer_recording": "Recording customer voice, click again to stop",
    "translating": "Translating",
    "customer_speak_btn": "Customer Voice Input",
    "staff_transcribing": "Transcribing staff voice",
    "staff_recording": "Recording staff voice, click again to stop",
    "staff_speak_btn": "Staff Voice Input",
    "customer_input_label": "Customer Input",
    "customer_placeholder": "Enter what the customer said.",
    "send": "Send",
    "staff_input_label": "Staff Input",
    "staff_placeholder": "Enter what the staff said in Korean.",
    "voice_supported_hint": "Record via voice button or enter text below.",
    "voice_not_supported_hint": "Voice input not supported in this browser. Please use text input.",
    "voice_recognizing": "Recognizing voice.",
    "voice_unrecognized_error": "Voice not recognized. Please speak clearly.",
    "voice_failed_error": "Voice recognition failed. You can continue with text input.",
    "mic_permission_status": "Checking microphone permission.",
    "recording_status": "Recording... Max {{seconds}}s.",
    "mic_unsupported_error": "Cannot access microphone. Check permissions or use text input.",
    "input_required_customer": "Please enter a customer sentence first.",
    "input_required_staff": "Please enter a staff sentence first.",
    "translating_status": "Preparing translation.",
    "translation_failed_error": "Translation failed. Please try again.",
    "empty_history_hint": "Translation history will appear here after the first sentence.",
    "customer_role": "Customer",
    "staff_role": "Staff",
    "replay_btn_label": "Replay translation",
    "replay_not_supported_hint": "Audio playback not supported in this browser.",
    "play": "Play",
    "translated_status": "Translated",
    "source_only_status": "Show original",
    "voice_too_short_error": "Please speak a bit longer. Too short to recognize."
}

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
