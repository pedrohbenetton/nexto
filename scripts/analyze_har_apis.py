import json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

print("Reading cittamobi.har...")
with open('cittamobi.har', 'r', encoding='utf-8', errors='ignore') as f:
    har_text = f.read()

# Find all unique URLs requested in the HAR
urls = re.findall(r'"url":\s*"([^"]+)"', har_text)
unique_urls = sorted(list(set(urls)))

print(f"Total URLs in HAR: {len(urls)}, Unique: {len(unique_urls)}")

print("\n--- Cittamobi API URLs in HAR ---")
cittamobi_apis = [u for u in unique_urls if 'cittamobi' in u]
for u in cittamobi_apis:
    print(u)

print("\n--- URLs with keywords (shape, route, geo, map, vehicle, line, stop, trip) ---")
interesting = [u for u in unique_urls if any(k in u.lower() for k in ['shape', 'route', 'geo', 'map', 'vehicle', 'line', 'stop', 'trip', 'gps', 'track'])]
for u in interesting[:50]:
    print(u)
