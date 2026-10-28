import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/line_sample.html', 'extracted/route-line.js', 'extracted/main.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()

    print(f"=== {fname} ===")
    for kw in ['polyline', 'geojson', 'itinerary', 'map', 'stops', 'points', 'coordinates']:
        matches = list(re.finditer(re.escape(kw), c, re.IGNORECASE))
        if matches:
            print(f"  {kw}: {len(matches)} occurrences")

    # Look for geo coordinates or polylines in line_sample.html
    if fname == 'extracted/line_sample.html':
        geo_matches = re.findall(r'(-?\d+\.\d{4,})', c)
        print(f"  Float coordinates found: {len(geo_matches)} (samples: {geo_matches[:10]})")
