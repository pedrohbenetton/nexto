import json, re

with open('cittamobi.har', 'r', encoding='utf-8', errors='ignore') as f:
    har = json.load(f)

for e in har.get('log', {}).get('entries', []):
    url = e.get('request', {}).get('url', '')
    res = e.get('response', {})
    text = res.get('content', {}).get('text', '')
    
    # check if stop-030... has coordinates anywhere
    if '0309ec1a-6609-11ed-98db-5adc55d213d0' in text:
        print(f"Found stop in: {url}")
        # Search around stopId in text
        for m in re.finditer(r'0309ec1a-6609-11ed-98db-5adc55d213d0', text):
            s = max(0, m.start() - 200)
            end = min(len(text), m.end() + 200)
            print("--- context ---")
            print(text[s:end])
            print()
