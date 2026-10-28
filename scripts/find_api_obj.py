import os, re, sys

sys.stdout.reconfigure(encoding='utf-8')

files = [os.path.join('extracted', f) for f in os.listdir('extracted') if f.endswith('.js')]

for path in files:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if 'CittamobiAPI' in content:
        print(f"=== {path} ===")
        for m in re.finditer(r'CittamobiAPI', content):
            s = max(0, m.start() - 200)
            e = min(len(content), m.end() + 200)
            print(content[s:e])
            print("-" * 40)
