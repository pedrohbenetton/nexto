import re

with open('extracted/route-line.js', 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

for m in re.finditer(r'map', js, re.IGNORECASE):
    s = max(0, m.start() - 60)
    e = min(len(js), m.end() + 100)
    print(js[s:e])
    print("-" * 40)
