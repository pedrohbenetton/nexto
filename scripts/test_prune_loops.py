import json, math

def remove_spikes_and_loops(polyline):
    if len(polyline) < 3:
        return polyline

    cleaned = []
    i = 0
    n = len(polyline)
    
    while i < n:
        pt = polyline[i]
        
        # Look ahead for a point that returns very close to the current point
        # (a loop or self-reversal spike)
        found_loop = False
        # check lookaheads from 2 to 50 points
        for j in range(min(n - 1, i + 50), i + 2, -1):
            target = polyline[j]
            # distance between pt and target
            d = math.hypot(pt[0] - target[0], pt[1] - target[1])
            # If distance is less than 0.0003 (~30 meters) and we traveled more than 10 points
            if d < 0.0003 and (j - i) >= 4:
                # This segment from i to j is an extraneous loop/U-turn spike!
                cleaned.append(pt)
                i = j # skip the loop!
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
    print(f"Key: {k} | Raw: {len(raw)} -> Clean: {len(clean)} (removed {len(raw) - len(clean)} loop points)")
