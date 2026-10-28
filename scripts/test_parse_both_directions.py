import urllib.request, re, json, sys
sys.stdout.reconfigure(encoding='utf-8')

def parse_line_stops(line_path):
    url = f"https://linhas.cittamobi.com.br/lines/{line_path}.html"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    raw = urllib.request.urlopen(req).read()
    text = raw.decode('latin-1')
    
    stop_cards = re.findall(r'<div class="stop-card"[^>]*data-stop-id=["\']([^"\']+)["\'].*?<p class="p-18 stop-name">(.*?)</p>', text, re.DOTALL)
    
    clean_stops = []
    for i, (stop_id, raw_name) in enumerate(stop_cards):
        name = re.sub(r'<[^>]+>', '', raw_name).strip()
        # Clean prefix numbers like "0169 - "
        name = re.sub(r'^\d+\s*-\s*', '', name)
        # Fix "Unnamed Road"
        if 'unnamed road' in name.lower():
            if 'ufscar' in line_path.lower():
                name = "UFSCar - Campus Sorocaba (Terminal Universitário)"
            else:
                name = f"Terminal de Linha #{i+1}"
        
        # Extract main street and neighborhood
        parts = [p.strip() for p in name.split(',')]
        street = parts[0]
        
        clean_stops.append({
            'index': i,
            'stopId': stop_id,
            'fullName': name,
            'street': street
        })
    return clean_stops

# Test Bairro and Centro directions of Line 80
bairro_stops = parse_line_stops("transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7")
print(f"Bairro stops count: {len(bairro_stops)}")
print("First 3 Bairro stops:")
for s in bairro_stops[:3]:
    print(f"  #{s['index']+1}: {s['fullName']}")
print("Last 2 Bairro stops:")
for s in bairro_stops[-2:]:
    print(f"  #{s['index']+1}: {s['fullName']}")

centro_stops = parse_line_stops("transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604")
print(f"\nCentro stops count: {len(centro_stops)}")
print("First 2 Centro stops:")
for s in centro_stops[:2]:
    print(f"  #{s['index']+1}: {s['fullName']}")
print("Last 2 Centro stops:")
for s in centro_stops[-2:]:
    print(f"  #{s['index']+1}: {s['fullName']}")
