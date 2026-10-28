import re

with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Check for JSON-LD in script tag
jsonld = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.DOTALL)
print(f"JSON-LD scripts: {len(jsonld)}")
for i, j in enumerate(jsonld):
    print(f"\n--- JSON-LD {i} ---")
    print(j[:500])

# Check for geo coordinates or geojson or leaflet
m = re.findall(r'lat["\']?\s*:\s*(-?\d+\.\d+).*?lng["\']?\s*:\s*(-?\d+\.\d+)', html)
print(f"\nlat/lng pairs: {len(m)}")
if m:
    print(m[:5])
