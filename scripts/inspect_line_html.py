import re, json


with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

print("HTML size:", len(html))

# Look for data attributes
data_attrs = set(re.findall(r'data-[a-zA-Z0-9_\-]+="[^"]*"', html))
for da in sorted(data_attrs)[:30]:
    print(" ", da[:80])

# Look for script tags with JSON
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
print(f"Total script tags: {len(scripts)}")
for i, s in enumerate(scripts):
    s_strip = s.strip()
    if len(s_strip) > 0 and len(s_strip) < 500:
        print(f"Script {i}:", s_strip)
    elif len(s_strip) >= 500:
        print(f"Script {i} (len {len(s_strip)}):", s_strip[:150], "...")
