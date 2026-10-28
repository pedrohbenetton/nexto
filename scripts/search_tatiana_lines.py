import json, urllib.request, re, sys
sys.stdout.reconfigure(encoding='utf-8')

# Search lines in Sorocaba (cityId = 35)


# Let's call the CittaZero BFF API on port 3001
url = "http://localhost:3001/api/cities/35/lines"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

lines = data['data']
print(f"Total lines in Sorocaba: {len(lines)}")

# Search for lines that have Tatiana, Romilda, Spazio, or UFSCar
for l in lines:
    name = (l.get('routeMnemonic') or '') + ' ' + (l.get('serviceMnemonic') or '') + ' ' + (l.get('lineRoutesPath') or '')
    if any(k in name.lower() for k in ['tatiana', 'spazio', 'romilda', 'ufscar', '80']):
        print(f"Code: {l.get('routeCode')} | Mnemonic: {l.get('routeMnemonic')} | Service: {l.get('serviceMnemonic')} | Path: {l.get('lineRoutesPath')}")
