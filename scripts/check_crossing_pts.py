import json

with open('server/data/routes_geometry_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

for k in ['v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7', 'v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604']:
    pts = cache[k]
    print(f"\n==========================================")
    print(f"k = {k}")
    crossing = [(i, p) for i, p in enumerate(pts) if -23.550 <= p[0] <= -23.535]
    print(f"Points between -23.535 and -23.550: {len(crossing)}")
    for i, p in crossing:
        print(f"  pt {i}: {p}")
