import urllib.request
import ssl
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')
TOKEN = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"

ctx = ssl.create_default_context()

def check_line_stops(line_path):
    print(f"\n--- Checking Line: {line_path} ---")
    url = f"https://linhas.cittamobi.com.br/lines/{line_path}.html"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching html: {e}")
        return

    import re
    service_match = re.search(r'id=["\']serviceId["\'][^>]*value=["\']([^"\']+)["\']', html)
    if not service_match:
        print("No serviceId found")
        return
    service_id = service_match.group(1)
    stops = re.findall(r'data-stop-id=["\']([^"\']+)["\']', html)
    print(f"serviceId: {service_id}, stops count: {len(stops)}")

    # Check 5 stops for predictions
    for s_id in stops[:5]:
        pred_url = f"https://core.cittamobi.com.br/linesroutes/service/predictions?serviceId={service_id}&stopId={s_id}"
        req_pred = urllib.request.Request(pred_url, headers={"username": TOKEN, "User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req_pred, context=ctx, timeout=5) as p_resp:
                raw = p_resp.read()
                print(f"  Stop {s_id[:8]}... -> Size: {len(raw)} bytes")
        except Exception as e:
            print(f"  Stop {s_id[:8]}... -> Err: {e}")

check_line_stops("transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7")
check_line_stops("transporte_publico-Sorocaba-ConsorcioSorocaba-20-06-Carol-TERMINALSANTOANTONIO-8974c2ea609b")
check_line_stops("transporte_publico-Sorocaba-BRTSorocaba-E180-1-E180-CARANDA-af2e91ffa5be")
