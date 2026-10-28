import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

UFSCAR_BAIRRO_WAYPOINTS = [
  [-23.505427, -47.452724],
  [-23.501500, -47.459000],
  [-23.504718, -47.464810],
  [-23.503684, -47.470112],
  [-23.506513, -47.483076],
  [-23.518000, -47.488000],
  [-23.522293, -47.491307],
  [-23.527991, -47.491401],
  [-23.538500, -47.492500],
  [-23.548000, -47.493000],
  [-23.564848, -47.494614],
  [-23.575000, -47.508000],
  [-23.582868, -47.524073]
]

coords_str = ";".join([f"{lng},{lat}" for lat, lng in UFSCAR_BAIRRO_WAYPOINTS])
# Test with continue_straight=true
url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson&continue_straight=true"
req = urllib.request.Request(url, headers={'User-Agent': 'CittaZeroTester/1.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

route = data['routes'][0]
pts = route['geometry']['coordinates']
print(f"continue_straight=true Distance: {route['distance']/1000:.2f} km | Points: {len(pts)}")
