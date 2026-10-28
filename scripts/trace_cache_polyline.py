import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('server/data/routes_geometry_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

for k in ['v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7', 'v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604']:
    if k not in cache:
        print(f"Key {k} not in cache!")
        continue
    pts = cache[k]
    print(f"\n==========================================")
    print(f"Inspecting {k} ({len(pts)} points)")
    print(f"==========================================")
    
    # Check bounding box
    lats = [p[0] for p in pts]
    lngs = [p[1] for p in pts]
    print(f"Lat range: {min(lats)} to {max(lats)}")
    print(f"Lng range: {min(lngs)} to {max(lngs)}")
    
    # Check any point west of -47.495 between lat -23.535 and -23.555 (Jardim Tatiana)
    tatiana = [(i, p) for i, p in enumerate(pts) if -23.555 <= p[0] <= -23.535 and p[1] <= -47.495]
    print(f"Points in Tatiana: {len(tatiana)}")
    if tatiana:
        print("First 3:", tatiana[:3])
        print("Last 3:", tatiana[-3:])
        
    # Check any point east of -47.488 between lat -23.518 and -23.524 (Jardim Romilda)
    romilda = [(i, p) for i, p in enumerate(pts) if -23.524 <= p[0] <= -23.518 and p[1] >= -47.488]
    print(f"Points in Romilda: {len(romilda)}")
    if romilda:
        print("First 3:", romilda[:3])
        print("Last 3:", romilda[-3:])
