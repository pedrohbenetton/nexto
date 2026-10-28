import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/main.js', 'extracted/route-line.js', 'extracted/597.29e3e9782f1c08b9.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    
    print(f"=== {fname} ===")
    for pattern in ['currentLat', 'currentLng', 'getCurrentLat', 'getCurrentLng']:
        for m in re.finditer(re.escape(pattern), c):
            s = max(0, m.start() - 200)
            e = min(len(c), m.end() + 200)
            print(f"[{pattern}] Match:")
            print(c[s:e])
            print("-" * 40)
