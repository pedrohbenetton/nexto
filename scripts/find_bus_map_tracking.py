import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/main.js', 'extracted/route-line.js', 'extracted/597.29e3e9782f1c08b9.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    print(f"=== {fname} ===")
    
    # Search for vehicle endpoints or vehicle mapping
    for pattern in ['/vehicles', '/vehicle', 'vehicles', 'realtime_bus', 'bus_position', 'stopPredictions', 'getVehicle', 'vehicleLocation']:
        matches = list(re.finditer(re.escape(pattern), content, re.IGNORECASE))
        if matches:
            print(f"  Pattern '{pattern}': {len(matches)} matches")

    # Search for leaflet/google maps marker additions
    for marker_term in ['L.marker', 'Marker(', 'google.maps.Marker', 'new Marker', 'busMarker', 'vehicleMarker']:
        for m in re.finditer(re.escape(marker_term), content):
            s = max(0, m.start() - 150)
            e = min(len(content), m.end() + 200)
            print(f"  [Marker match: {marker_term}]")
            print(content[s:e])
            print("-" * 40)
