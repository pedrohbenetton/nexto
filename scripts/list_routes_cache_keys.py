import json

with open('server/data/routes_geometry_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

print("Keys in routes_geometry_cache.json:")
for k in cache:
    print(f"  {k} -> {len(cache[k])} pts")
