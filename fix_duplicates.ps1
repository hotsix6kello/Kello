
$path = "c:\Users\KumA\Desktop\Kello\src\app\explore\page.tsx"
$lines = Get-Content -Path $path -Encoding UTF8

# Line 582 to 699 (1-indexed) was the previous corrupted/duplicated block
# Let's identify the start of DESIGNERS_BY_STORE duplication
$startIndex = 581 # 0-indexed for line 582
$endIndex = 698   # 0-indexed for line 699

# Construct target content
$result = $lines[0..($startIndex-1)] + $lines[($endIndex+1)..($lines.Length-1)]

Set-Content -Path $path -Value $result -Encoding UTF8
