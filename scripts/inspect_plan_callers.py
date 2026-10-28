import re

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

for m in re.finditer(r'\.plan\s*\(', c):
    s = max(0, m.start() - 250)
    e = min(len(c), m.end() + 350)
    print("=== .plan( snippet ===")
    print(c[s:e])
    print()
