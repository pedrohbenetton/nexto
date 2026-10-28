with open('scripts/sample_line.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

import re
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
for i in [0, 2, 4]:
    if i < len(scripts):
        print(f"\n================ SCRIPT {i+1} ================")
        print(scripts[i].strip()[:1000])
