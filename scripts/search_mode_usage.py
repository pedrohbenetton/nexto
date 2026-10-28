import re

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

for key in ['setModeList', 'addMode', 'arriveordepart', 'maxwalkdistance']:
    for m in re.finditer(re.escape(key), c):
        s = max(0, m.start() - 100)
        e = min(len(c), m.end() + 200)
        print(f"[{key}] {c[s:e]}\n")
