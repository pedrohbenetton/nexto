import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

for kw in ['geometrypoints', 'geometryPoints', 'polyline', 'encodedPath', 'decodePath', 'getGeometrypoints']:
    matches = list(re.finditer(re.escape(kw), c))
    print(f"Keyword '{kw}': {len(matches)} matches")
    for m in matches[:5]:
        s = max(0, m.start() - 150)
        e = min(len(c), m.end() + 200)
        print(c[s:e])
        print("-" * 40)
