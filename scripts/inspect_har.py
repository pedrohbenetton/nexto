import json

with open('cittamobi.har', 'r', encoding='utf-8', errors='ignore') as f:
    har = json.load(f)

entries = har.get('log', {}).get('entries', [])
print(f"Total entries in cittamobi.har: {len(entries)}")

urls = set()
for e in entries:
    req = e.get('request', {})
    url = req.get('url', '')
    method = req.get('method', '')
    status = e.get('response', {}).get('status', 0)
    mime = e.get('response', {}).get('content', {}).get('mimeType', '')
    size = e.get('response', {}).get('content', {}).get('size', 0)
    print(f"[{method}] {status} {mime} ({size}b) -> {url[:100]}")
