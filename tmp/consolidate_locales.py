import json
import os
import glob
from typing import List

def consolidate_json(filepath):
    print(f"Processing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        # We need to find the two blocks. 
        # Since json.loads will fail with duplicates or pick the last one, 
        # let's try a manual approach to find the last occurrence.
        
        # Simple hack: find the last occurrence of "interpreter_page"
        # and replace the first one with it, then delete the last one.
        
        # Actually, let's just parse it with a custom hook or regex 
        # if the structure is known. 
        # Given the file structure: { "header": ..., "interpreter_page": { ... }, ..., "interpreter_page": { ... } }
        
        json_lines: List[str] = list(content.splitlines())
        first_start: int = -1
        last_start: int = -1
        
        for i, line in enumerate(json_lines):
            stripped: str = line.strip()
            if '"interpreter_page": {' in stripped:
                if first_start == -1:
                    first_start = i
                last_start = i
        
        # Find ends
        def find_end(start_idx: int) -> int:
            if start_idx == -1:
                return -1
            cnt: int = 0
            for j in range(start_idx, len(json_lines)):
                cnt += json_lines[j].count('{')
                cnt -= json_lines[j].count('}')
                if cnt == 0:
                    return j
            return -1

        first_end: int = find_end(first_start)
        last_end: int = find_end(last_start)
        
        if first_start != -1 and first_start != last_start and first_end != -1 and last_end != -1:
            print(f"  Consolidating duplicates in {filepath}")
            # Get the content of the last one
            new_block_lines: List[str] = [json_lines[k] for k in range(last_start, last_end + 1)]
            
            # Ensure the last line of the new block (}) is followed by a comma 
            if len(new_block_lines) > 0 and not new_block_lines[-1].strip().endswith(','):
                new_block_lines[-1] = new_block_lines[-1].rstrip() + ','
            
            # Reconstruct the file:
            # [Before first] + [New Block] + [Between first and last] + [After last]
            result_part1: List[str] = [json_lines[k] for k in range(0, first_start)]
            result_part2: List[str] = [json_lines[k] for k in range(first_end + 1, last_start)]
            result_part3: List[str] = [json_lines[k] for k in range(last_end + 1, len(json_lines))]
            
            full_result: List[str] = result_part1 + new_block_lines + result_part2 + result_part3
            
            # Remove trailing comma before final }
            for i in range(len(full_result)-1, -1, -1):
                stripped_res: str = full_result[i].strip()
                if stripped_res == '}': continue 
                if stripped_res.endswith(','):
                    full_result[i] = full_result[i].rstrip().rstrip(',')
                break
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write("\n".join(full_result))
                
    except Exception as e:
        print(f"  Error processing {filepath}: {e}")

# Target all common.json in public/locales/*/
base_path = r'c:\Users\USER\Desktop\kello\public\locales'
for locale_dir in glob.glob(os.path.join(base_path, '*')):
    json_path = os.path.join(locale_dir, 'common.json')
    if os.path.exists(json_path):
        consolidate_json(json_path)
