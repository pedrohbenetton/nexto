import json, math

def remove_spikes_and_loops(polyline):
    if len(polyline) < 3:
        return polyline

    cleaned = []
    i = 0
    n = len(polyline)
    
    while i < n:
        pt = polyline[i]
        found_loop = False
        for j in range(min(n - 1, i + 80), i + 2, -1):
            target = polyline[j]
            d = math.hypot(pt[0] - target[0], pt[1] - target[1])
            if d < 0.0004 and (j - i) >= 4:
                cleaned.append(pt)
                i = j
                found_loop = True
                break
                
        if not found_loop:
            cleaned.append(pt)
            i += 1
            
    return cleaned

with open('server/data/routes_geometry_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

for k in ['v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7', 'v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604']:
    raw = cache[k]
    clean = remove_spikes_and_loops(raw)
    
    # Check start and end
    print(f"\n[{k}]")
    print(f"Points: {len(clean)}")
    print(f"Start: {clean[0]} | End: {clean[-1]}")
    
    # Check General Carneiro (lat ~ -23.504 to -23.518, lng ~ -47.470 to -47.488)
    carneiro = [p for p in clean if -23.518 <= p[0] <= -23.503 and -47.488 <= p[1] <= -47.470]
    print(f"General Carneiro points: {len(carneiro)}")
    
    # Check Armando Pannunzio (lat ~ -23.518 to -23.538, lng ~ -47.488 to -47.493)
    pannunzio = [p for p in clean if -23.538 <= p[0] <= -23.518 and -47.493 <= p[1] <= -47.488]
    print(f"Armando Pannunzio points: {len(pannunzio)}")
    
    # Check SP-264 (lat ~ -23.538 to -23.582, lng ~ -47.493 to -47.525)
    sp264 = [p for p in clean if -23.582 <= p[0] <= -23.538 and -47.525 <= p[1] <= -47.492]
    print(f"SP-264 points: {len(sp264)}")
    
    # Check Tatiana
    tatiana = [p for p in clean if -23.555 <= p[0] <= -23.535 and p[1] <= -47.498]
    print(f"Tatiana points: {len(tatiana)}")
