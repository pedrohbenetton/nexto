import json

with open('server/data/stop_coords_cache.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for k, v in data.items():
    print(f"{k} => {v}")
