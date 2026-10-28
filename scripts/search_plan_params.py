import re

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

# Let's find any occurrences of 'maxwalkdistance' or 'arriveordepart' or 'fromLat'
for key in ['maxwalkdistance', 'arriveordepart', 'fromLat', 'fromlat']:
    matches = list(re.finditer(re.escape(key), c))
    print(f"Key '{key}' matches: {len(matches)}")
    for m in matches[:5]:
        s = max(0, m.start() - 100)
        e = min(len(c), m.end() + 150)
        print("  Snippet:", c[s:e])
        print("  " + "-"*30)
