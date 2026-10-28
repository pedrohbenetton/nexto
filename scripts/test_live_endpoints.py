import urllib.request
import urllib.parse
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"

endpoints = [
    {
        "name": "Autocomplete / Tripplanner (Term: Paulista)",
        "url": "https://core.cittamobi.com.br/tripplanner/proto/autocomplete?term=Paulista"
    },
    {
        "name": "City Search (Sorocaba)",
        "url": "https://core.cittamobi.com.br/predigo/city/proto/search?name=" + urllib.parse.quote("Sorocaba")
    },
    {
        "name": "Realtime Predictions (Line 80 UFSCar Sorocaba)",
        "url": "https://core.cittamobi.com.br/linesroutes/service/predictions?serviceId=ea17e96a-7d44-4ebd-8cc3-ee6159965b0d&stopId=03029557-6609-11ed-98db-5adc55d213d0"
    },
    {
        "name": "City Services / Lines Search (Sorocaba cityId)",
        "url": "https://core.cittamobi.com.br/linesroutes/service/city?name=Sorocaba&cityId=1"
    }
]

ctx = ssl.create_default_context()

for ep in endpoints:
    print(f"\n--- Testing: {ep['name']} ---")
    print(f"URL: {ep['url']}")
    req = urllib.request.Request(ep['url'], headers={
        "username": TOKEN,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Referer": "https://linhas.cittamobi.com.br/"
    })

    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = resp.read()
            print(f"Status: {resp.status}")
            print(f"Content-Type: {resp.headers.get('Content-Type')}")
            print(f"Payload Size: {len(data)} bytes")
            print(f"First 50 bytes (hex): {data[:50].hex()}")
            # Check if there are protobuf headers
            for h in ['x-protobuf-schema', 'x-protobuf-message']:
                if h in resp.headers:
                    print(f"Header {h}: {resp.headers[h]}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} - {e.reason}")
        print(f"Response: {e.read().decode('utf-8', errors='ignore')[:300]}")
    except Exception as e:
        print(f"Error: {e}")
