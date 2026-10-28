import urllib.request, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/line_sample.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

# Let's search all lines in Sorocaba via BFF
url = "http://localhost:3001/api/cities/35/lines"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))
lines = data['data']

print(f"Searching {len(lines)} lines...")

# Let's check line 80 services:
lines_80 = [l for l in lines if l.get('routeCode') == '80']
print(f"Lines with routeCode 80: {len(lines_80)}")
for l in lines_80:
    path = l.get('lineRoutesPath')
    try:
        url_det = f"http://localhost:3001/api/lines/details?path={path}"
        with urllib.request.urlopen(urllib.request.Request(url_det), timeout=5) as r:
            det = json.loads(r.read().decode('utf-8'))['data']
            stop_names = [s['name'] for s in det['stops']]
            has_tatiana = any('tatiana' in s.lower() or 'spazio' in s.lower() or 'julieta' in s.lower() for s in stop_names)
            print(f"Path: {path[:45]} | Mnemonic: {l.get('serviceMnemonic')} | Stops: {len(stop_names)} | Has Tatiana: {has_tatiana}")
            if has_tatiana:
                for s in stop_names:
                    if any(k in s.lower() for k in ['tatiana', 'spazio', 'julieta', 'romilda']):
                        print(f"   -> {s}")
    except Exception as e:
        print(f"Err {path[:30]}: {e}")
