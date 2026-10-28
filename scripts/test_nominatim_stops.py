import urllib.request, json, urllib.parse, time, sys
sys.stdout.reconfigure(encoding='utf-8')

test_addresses = [
    "Rua Leopoldo Machado, 259, Sorocaba, SP, Brasil",
    "Av. Pres. Juscelino Kubitscheck de Oliveira, 500, Sorocaba, SP, Brasil",
    "Avenida Moreira Cesar, Sorocaba, SP, Brasil",
    "Av. General Carneiro, 140, Sorocaba, SP, Brasil",
    "Av. General Carneiro, 972, Sorocaba, SP, Brasil",
    "Av. General Carneiro, 2000, Sorocaba, SP, Brasil",
    "Av. Dr. Armando Pannunzio, 316, Sorocaba, SP, Brasil",
    "Av. Dr. Armando Pannunzio, 1700, Sorocaba, SP, Brasil",
    "Rodovia Joao Leme dos Santos, 300, Sorocaba, SP, Brasil",
    "Rodovia Joao Leme dos Santos, km 110, Sorocaba, SP, Brasil"
]

for addr in test_addresses:
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(addr)}&format=json&limit=1"
    req = urllib.request.Request(url, headers={'User-Agent': 'CittaZeroTransitValidator/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            if data and len(data) > 0:
                print(f"✅ {addr} -> ({data[0]['lat']}, {data[0]['lon']}) [{data[0]['display_name'][:50]}]")
            else:
                print(f"⚠️ Not found: {addr}")
        time.sleep(1) # Nominatim 1 req/s policy
    except Exception as e:
        print(f"❌ Err: {addr}: {e}")
