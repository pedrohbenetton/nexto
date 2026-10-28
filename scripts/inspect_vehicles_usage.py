import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

for m in re.finditer(r'\bvehicles\b', content, re.IGNORECASE):
    s = max(0, m.start() - 150)
    e = min(len(content), m.end() + 200)
    print("--- vehicles context ---")
    print(content[s:e])
    print()
