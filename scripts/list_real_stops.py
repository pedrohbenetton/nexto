import re

with open('scripts/sample_line.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's extract stop id and stop name
matches = re.findall(r'<div class="stop-card"[^>]*data-stop-id=["\']([^"\']+)["\'].*?<p class="p-18 stop-name">(.*?)</p>', html, re.DOTALL)
print(f"Total stops parsed: {len(matches)}")

for i, (stop_id, name) in enumerate(matches):
    clean_name = re.sub(r'<[^>]+>', '', name).strip()
    print(f"[{i+1}] {stop_id} -> {clean_name}")
