import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')
TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"

ctx = ssl.create_default_context()

for url in [
    "https://core.cittamobi.com.br/linesroutes/service/city/all?cityId=35",
    "https://core.cittamobi.com.br/linesroutes/service/city?name=Sorocaba&cityId=35"
]:
    print(f"\nTesting: {url}")
    req = urllib.request.Request(url, headers={
        "username": TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://linhas.cittamobi.com.br/"
    })
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            data = resp.read()
            print(f"Status: {resp.status}")
            print(f"Payload Size: {len(data)} bytes")
            print(f"Header x-protobuf-message: {resp.headers.get('x-protobuf-message')}")
            print(f"First 50 bytes hex: {data[:50].hex()}")
    except Exception as e:
        print(f"Error: {e}")
