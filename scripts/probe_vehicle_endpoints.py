import urllib.request
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"
serviceId = "ea17e96a-7d44-4ebd-8cc3-ee6159965b0d" # Linha 80 UFSCAR
stopId = "03029557-6609-11ed-98db-5adc55d213d0"

endpoints = [
    # Core
    f"https://core.cittamobi.com.br/linesroutes/service/predictions?serviceId={serviceId}&stopId={stopId}",
    f"https://core.cittamobi.com.br/linesroutes/service/predictions?serviceId={serviceId}",
    f"https://core.cittamobi.com.br/linesroutes/service/vehicles?serviceId={serviceId}",
    f"https://core.cittamobi.com.br/linesroutes/service/stops?serviceId={serviceId}",
    f"https://core.cittamobi.com.br/linesroutes/service/itinerary?serviceId={serviceId}",
    f"https://core.cittamobi.com.br/linesroutes/service/route?serviceId={serviceId}",
    f"https://core.cittamobi.com.br/linesroutes/service?serviceId={serviceId}",
    f"https://core.cittamobi.com.br/linesroutes/vehicles?serviceId={serviceId}",
    f"https://core.cittamobi.com.br/linesroutes/service/{serviceId}/vehicles",
    # Api
    f"https://api.cittamobi.com.br/m/v1/services/{serviceId}/vehicles",
    f"https://api.cittamobi.com.br/m/v2/services/{serviceId}/vehicles",
    f"https://api.cittamobi.com.br/m/v1/services/{serviceId}",
    f"https://api.cittamobi.com.br/session/start?lat=-23.5015&lng=-47.4526"
]

ctx = ssl.create_default_context()

for url in endpoints:
    req = urllib.request.Request(url, headers={
        "username": TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://linhas.cittamobi.com.br/"
    })
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=4) as resp:
            data = resp.read()
            print(f"[{resp.status}] {url}")
            print(f"  CT: {resp.headers.get('Content-Type')}, Size: {len(data)}")
            if 'protobuf-message' in resp.headers:
                print(f"  Proto: {resp.headers.get('x-protobuf-message')}")
            if len(data) > 0 and len(data) < 300:
                print(f"  Content: {data}")
    except urllib.error.HTTPError as e:
        print(f"[{e.code}] {url}")
    except Exception as e:
        print(f"[ERR] {url}: {e}")
