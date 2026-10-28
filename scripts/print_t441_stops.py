import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

path = 'transporte_publico-Sorocaba-CitySorocaba-T441-MiniTerminalTatiana-bairro-6d8ab31c4a9f'
url = f"http://localhost:3001/api/lines/details?path={path}"
with urllib.request.urlopen(urllib.request.Request(url)) as r:
    data = json.loads(r.read().decode('utf-8'))['data']
    print(f"Total stops for Line T441: {len(data['stops'])}")
    for s in data['stops']:
        print(f"[{s['index']+1:2d}] {s['name']}")
