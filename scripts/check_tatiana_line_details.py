import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

for path in [
    'transporte_publico-Sorocaba-CitySorocaba-44-JardimTatiana-7c042625dc2c',
    'transporte_publico-Sorocaba-CitySorocaba-T441-MiniTerminalTatiana-bairro-6d8ab31c4a9f',
    'transporte_publico-Sorocaba-CitySorocaba-A18-QuintaisdoImperadorMiniTerminalTatiana-255731ff433f'
]:
    url = f"http://localhost:3001/api/lines/details?path={path}"
    try:
        with urllib.request.urlopen(req := urllib.request.Request(url), timeout=5) as r:
            data = json.loads(r.read().decode('utf-8'))['data']
            print(f"\n==========================================")
            print(f"Path: {path}")
            print(f"ServiceId: {data.get('serviceId')} | Stops: {data.get('stopsCount')}")
            for s in data['stops'][:8]:
                print(f"   [{s['index']+1}] {s['name']}")
    except Exception as e:
        print(f"Err {path}: {e}")
