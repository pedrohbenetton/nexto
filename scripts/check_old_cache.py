import json

with open('server/data/routes_geometry_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

for k in ['35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7', '35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604']:
    pts = cache.get(k, [])
    print(f"\n==========================================")
    print(f"Inspecting {k} ({len(pts)} points)")
    print(f"==========================================")
    
    # Check Tatiana
    tatiana = [(i, p) for i, p in enumerate(pts) if -23.555 <= p[0] <= -23.535 and p[1] <= -47.495]
    print(f"Points in Tatiana: {len(tatiana)}")
    if tatiana:
        print("First 3:", tatiana[:3])
        print("Last 3:", tatiana[-3:])
