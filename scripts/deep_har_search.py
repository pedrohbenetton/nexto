import json, re

print("Searching cittamobi.har for response content...")

with open('cittamobi.har', 'r', encoding='utf-8', errors='ignore') as f:
    har = json.load(f)

entries = har.get('log', {}).get('entries', [])
print(f"Total entries in HAR: {len(entries)}")

for i, entry in enumerate(entries):
    req = entry.get('request', {})
    res = entry.get('response', {})
    url = req.get('url', '')
    
    # Check mimeType
    content = res.get('content', {})
    mime = content.get('mimeType', '')
    text = content.get('text', '')
    
    # Search for polyline, coordinates, lat/lon in text
    if text:
        if 'geometrypoints' in text.lower() or 'polyline' in text.lower() or 'coordinates' in text.lower() or 'shape' in text.lower():
            print(f"[{i}] MATCH in {url} ({mime}, len: {len(text)})")
            # print snippet
            for m in re.finditer(r'(geometrypoints|polyline|coordinates|shape)', text, re.IGNORECASE):
                start = max(0, m.start() - 50)
                end = min(len(text), m.end() + 100)
                print(f"    Snippet: {text[start:end]}")
                break
