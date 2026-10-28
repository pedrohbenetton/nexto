import re, glob

for fname in glob.glob('extracted/*.js'):
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    for m in re.finditer(r'new\s+[a-zA-Z0-9_\.]*TripPlanDataRequest', c):
        s = max(0, m.start() - 100)
        e = min(len(c), m.end() + 200)
        print(f"=== {fname} ===")
        print(c[s:e])
        print()
