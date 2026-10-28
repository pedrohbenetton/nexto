import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/main.js', 'extracted/597.29e3e9782f1c08b9.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print(f"=== {fname} ===")
    for m in re.finditer(r'getArrayBuffer\s*\(', content):
        s = max(0, m.start() - 250)
        e = min(len(content), m.end() + 250)
        print(content[s:e])
        print("~" * 40)

    for m in re.finditer(r'getPlanArrayBuffer\s*\(', content):
        s = max(0, m.start() - 250)
        e = min(len(content), m.end() + 250)
        print(content[s:e])
        print("~" * 40)
