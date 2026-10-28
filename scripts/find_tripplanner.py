import re, glob, os

files = glob.glob('extracted/*.js')
print("Checking files:", files)
for fname in files:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    matches = list(re.finditer(r'tripplanner[a-zA-Z0-9_\-/]*', content, re.IGNORECASE))
    if matches:
        print(f"\n=== Found in {fname} ===")
        for m in matches[:10]:
            s = max(0, m.start() - 60)
            e = min(len(content), m.end() + 100)
            print("MATCH:", content[s:e])
