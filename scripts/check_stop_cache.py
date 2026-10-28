import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

# Let's inspect stop_coords_cache.json if it exists
import os
cache_file = 'server/data/stop_coords_cache.json'
if os.path.exists(cache_file):
    with open(cache_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Total stops in stop_coords_cache.json: {len(data)}")
    for k in list(data.keys())[:5]:
        print(f"  {k} -> {data[k]}")
else:
    print("No stop_coords_cache.json yet.")
