import json

with open('server/data/routes_geometry_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

print(f"Total cached routes: {len(cache)}")
for k, v in cache.items():
    print(f"Key: {k} | Points: {len(v)}")
    # Check if this route goes to Tatiana (lng between -47.495 and -47.515 and lat between -23.535 and -23.555)
    tatiana = [p for p in v if p[0] <= -23.535 and p[0] >= -23.555 and p[1] <= -47.495 and p[1] >= -47.515]
    if tatiana:
        print(f"  -> HAS {len(tatiana)} points in Tatiana!")
