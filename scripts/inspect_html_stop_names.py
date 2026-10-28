import re

with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect stop cards
stops = re.findall(r'<div class="stop-card"[^>]*data-stop-id="([^"]+)"[^>]*>(.*?)</div>\s*</div>\s*</div>', html, re.DOTALL)
print(f"Stops count: {len(stops)}")
for i, (sid, content) in enumerate(stops[:10]):
    # find all texts in this stop card
    cleaned = re.sub(r'<[^>]+>', ' ', content)
    cleaned = ' '.join(cleaned.split())
    print(f"Stop #{i} ({sid[:8]}): {cleaned[:150]}")
