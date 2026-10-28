import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

url = "https://linhas.cittamobi.com.br/lines/seo-directory.json"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"Type: {type(data)}")
        if isinstance(data, list):
            print(f"List len: {len(data)}")
            print("First 3 items:", data[:3])
            # Check for Sorocaba
            sorocaba_items = [x for x in data if isinstance(x, dict) and 'sorocaba' in str(x).lower()]
            print(f"Sorocaba items: {len(sorocaba_items)}")
            if sorocaba_items:
                print("Sample Sorocaba item:", sorocaba_items[0])
        elif isinstance(data, dict):
            print(f"Dict keys: {list(data.keys())[:10]}")
except Exception as e:
    print("Err:", e)
