import json

with open('cittamobi.har', 'r', encoding='utf-8', errors='ignore') as f:
    har = json.load(f)

for e in har.get('log', {}).get('entries', []):
    url = e.get('request', {}).get('url', '')
    if 'seo-directory.json' in url:
        data = json.loads(e.get('response', {}).get('content', {}).get('text', ''))
        print("Generated At:", data.get('generatedAt'))
        print("Total regions:", len(data.get('regions', [])))
        print("Total states:", len(data.get('states', [])))
        print("Total cities:", len(data.get('cities', [])))
        print("Total agencies:", len(data.get('agencies', [])))
        line_index = data.get('lineIndex', {})
        print("Total lines in index:", len(line_index))
        
        # Sample city
        cities = data.get('cities', [])
        sorocaba = [c for c in cities if 'sorocaba' in c.get('slug', '')]
        if sorocaba:
            print("\nSorocaba city metadata:")
            print(json.dumps(sorocaba[0], indent=2))
        
        # Sample lines from lineIndex
        keys = list(line_index.keys())[:3]
        print("\nSample lines in lineIndex:")
        for k in keys:
            print(f"Key {k}:", line_index[k])
        break
