import re

with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's inspect stop elements
stops = re.findall(r'<div[^>]*data-stop-id="([^"]+)"[^>]*>(.*?)</div>\s*</div>\s*</div>', html, re.DOTALL)
print(f"Stops found: {len(stops)}")
if stops:
    print("Stop ID:", stops[0][0])
    # Look for text in first stop
    text_clean = re.sub(r'<[^>]+>', ' ', stops[0][1])
    text_clean = ' '.join(text_clean.split())
    print("Text in stop 0:", text_clean[:300])

# Also check schedule script
sched_match = re.search(r'<script[^>]*>\s*(\{"0":\[.*?\]\})\s*</script>', html, re.DOTALL)
if sched_match:
    print("\nSchedule JSON sample:")
    print(sched_match.group(1)[:200])
