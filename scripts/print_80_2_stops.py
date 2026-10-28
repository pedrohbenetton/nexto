import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

path = 'transporte_publico-Sorocaba-CitySorocaba-80-2-Cond.AnaMaria-Centro-0789139e0c00'
url = f"http://localhost:3001/api/lines/details?path={path}"
with urllib.request.urlopen(urllib.request.Request(url)) as r:
    data = json.loads(r.read().decode('utf-8'))['data']
    print(f"Total stops for Line 80-2: {len(data['stops'])}")
    for s in data['stops']:
        print(f"[{s['index']+1:2d}] {s['name']}")
