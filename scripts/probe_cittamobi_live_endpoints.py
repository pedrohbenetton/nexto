import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"
HEADERS = {
    "username": TOKEN,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
}

service_id = "ea17e96a-7d44-4ebd-8cc3-ee6159965b0d" # Route 80 Bairro
city_id = "35" # Sorocaba
route_code = "80"

test_paths = [
    f"https://core.cittamobi.com.br/linesroutes/service/vehicles?serviceId={service_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/vehicles/positions?serviceId={service_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/vehicles?cityId={city_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/vehicle/positions?cityId={city_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/positions?serviceId={service_id}",
    f"https://core.cittamobi.com.br/predigo/service/vehicles?serviceId={service_id}",
    f"https://core.cittamobi.com.br/predigo/vehicles?serviceId={service_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/route/shape?serviceId={service_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/shape?serviceId={service_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/itinerary?serviceId={service_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/itinerary/stops?serviceId={service_id}",
    f"https://core.cittamobi.com.br/linesroutes/service/stops?serviceId={service_id}",
    f"https://api.cittamobi.com.br/service/{service_id}/vehicles",
    f"https://api.cittamobi.com.br/city/{city_id}/service/{service_id}/vehicles",
    f"https://core.cittamobi.com.br/linesroutes/service/details?serviceId={service_id}"
]

for url in test_paths:
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = resp.read()
            print(f"✅ [HTTP {resp.status}] {url} (len: {len(data)})")
    except urllib.error.HTTPError as e:
        print(f"❌ [HTTP {e.code}] {url}")
    except Exception as e:
        print(f"⚠️ [ERR] {url}: {e}")
