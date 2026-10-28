import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

url = "http://localhost:3001/api/lines/tracking?path=transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

data = data['data']
print(f"Stops count: {len(data['stops'])}")
print(f"Polyline count: {len(data['polyline'])}")
print(f"Vehicles count: {len(data['vehicles'])}")
for v in data['vehicles']:
    print(f"Vehicle: {v['vehicleId']} | Plate: {v['licensePlate']} | Lat: {v['lat']} | Lng: {v['lng']} | Status: {v['status']} | Next: {v['nextStopName']}")

# Check if polyline goes to Tatiana:
# Tatiana is around lat -23.535 to -23.550 and lng -47.495 to -47.510
tatiana_pts = [p for p in data['polyline'] if p[0] <= -23.535 and p[0] >= -23.555 and p[1] <= -47.495 and p[1] >= -47.515]
print(f"Points in Tatiana area: {len(tatiana_pts)}")
if tatiana_pts:
    print("Sample Tatiana pts:", tatiana_pts[:5])
