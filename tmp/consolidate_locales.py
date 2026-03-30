import json
import os
import glob
from typing import List, Sequence

def consolidate_json(filepath: str) -> None:
    print(f"Processing {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    try:
        json_lines: List[str] = content.splitlines()
        first_start = -1
        last_start = -1
        
        for i, line in enumerate(json_lines):
            stripped = line.strip()
            if '"interpreter_page": {' in stripped:
                if first_start == -1:
                    first_start = i
                last_start = i
        
        # Find ends
        def find_end(start_idx: int, lines: Sequence[str]) -> int:
            if start_idx == -1:
                return -1
            cnt = 0
            for j in range(start_idx, len(lines)):
                ln = lines[j]
                cnt += ln.count('{')
                cnt -= ln.count('}')
                if cnt == 0:
                    return j
            return -1

        first_end = find_end(first_start, json_lines)
        last_end = find_end(last_start, json_lines)
        
        if first_start != -1 and first_start != last_start and first_end != -1 and last_end != -1:
            print(f"  Consolidating duplicates in {filepath}")
            
            # satisfy Pyre2 by avoiding slicing [a:b]
            new_block_lines = [json_lines[k] for k in range(last_start, last_end + 1)]
            
            result_part1 = [json_lines[k] for k in range(0, first_start)]
            result_part2 = [json_lines[k] for k in range(first_end + 1, last_start)]
            result_part3 = [json_lines[k] for k in range(last_end + 1, len(json_lines))]
            
            temp_full = result_part1 + new_block_lines + result_part2 + result_part3
            
            final_lines: List[str] = []
            for i, line in enumerate(temp_full):
                # last line
                if i == len(temp_full) - 1:
                    final_lines.append(line)
                    break
                
                stripped = line.strip()
                # Remove trailing comma before final }
                if i < len(temp_full) - 1:
                     next_is_root_end = temp_full[i+1].strip() == "}" and i+1 == len(temp_full) - 1
                     if next_is_root_end and stripped.endswith(","):
                         final_lines.append(line.rstrip().rstrip(","))
                         continue
                
                final_lines.append(line)

            with open(filepath, 'w', encoding='utf-8') as f:
                f.write("\n".join(final_lines) + "\n")
                
    except Exception as e:
        print(f"  Error processing {filepath}: {e}")

# Target all common.json in public/locales/*/
base_path = r'c:\Users\USER\Desktop\kello\public\locales'
for locale_dir in glob.glob(os.path.join(base_path, '*')):
    if not os.path.isdir(locale_dir): continue
    json_path = os.path.join(locale_dir, 'common.json')
    if os.path.exists(json_path):
        consolidate_json(json_path)
