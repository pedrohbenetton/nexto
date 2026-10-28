import re

with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

matches = re.findall(r'(\b[a-zA-Z0-9_\-]*service[a-zA-Z0-9_\-]*\b\s*[:=]\s*["\'][^"\']+["\'])', html, re.I)
for m in set(matches):
    print(m)

# Also check data attributes on container-paradas
m2 = re.search(r'<div[^>]*id="container-paradas"[^>]*>', html)
if m2:
    print("\ncontainer-paradas tag:")
    print(m2.group(0))

m3 = re.findall(r'data-[a-zA-Z0-9_\-]+="[^"]+"', html)
for da in set(m3):
    if 'service' in da.lower() or 'line' in da.lower() or 'route' in da.lower() or 'id' in da.lower():
        print("Attribute:", da)
