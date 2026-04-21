import re
import os

def resolve_file(filepath):
    print(f"Resolving {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Generic resolution: keep both sides, but try to fix JSON commas
    is_json = filepath.endswith('.json')
    
    def replacer(match):
        head = match.group(1).strip('\n')
        tail = match.group(2).strip('\n')
        
        if not head: return tail
        if not tail: return head
        
        if is_json:
            # Heuristic for JSON: if head doesn't end with comma and tail looks like another key, add comma
            if not head.rstrip().endswith(',') and not head.rstrip().endswith('{'):
                return head + ",\n" + tail
            return head + "\n" + tail
        else:
            # For TSX/other, just keep both
            return head + "\n" + tail

    # Conflict marker regex
    pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n?=======\n(.*?)\n?>>>>>>> origin/develop', re.DOTALL)
    
    new_content = pattern.sub(replacer, content)
    
    # Save back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

files = [
    "public/locales/ar/common.json",
    "public/locales/en/common.json",
    "public/locales/ja/common.json",
    "public/locales/ko/common.json",
    "public/locales/th/common.json",
    "public/locales/vi/common.json",
    "public/locales/zh-CN/common.json",
    "public/locales/zh-TW/common.json",
    "src/app/auth/signup/page.tsx",
    "src/app/privacy/page.tsx",
    "src/app/terms/page.tsx"
]

for f in files:
    if os.path.exists(f):
        resolve_file(f)
    else:
        print(f"File not found: {f}")
