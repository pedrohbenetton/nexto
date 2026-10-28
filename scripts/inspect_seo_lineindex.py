import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

url = "https://linhas.cittamobi.com.br/lines/seo-directory.json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))

print("Version:", data.get('version'))
print("GeneratedAt:", data.get('generatedAt'))
lineIndex = data.get('lineIndex', {})
print(f"Total lines in lineIndex: {len(lineIndex)}")

# Look at sample lineIndex items
keys = list(lineIndex.keys())[:5]
for k in keys:
    print(k, ":", lineIndex[k])

# Look for 80-UFSCAR in lineIndex
ufscar_keys = [k for k in lineIndex if '80' in k and 'ufscar' in k.lower()]
print(f"UFSCar lines found: {len(ufscar_keys)}")
for k in ufscar_keys:
    print(k, ":", lineIndex[k])
