import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

UFSCAR_BAIRRO_WAYPOINTS = [
  [-23.505427, -47.452724], # 0: TSP (Terminal São Paulo) / Leopoldo Machado
  [-23.501500, -47.459000], # 1: Av. Pres. Juscelino Kubitscheck
  [-23.504718, -47.464810], # 2: Av. Moreira César
  [-23.503684, -47.470112], # 3: Av. General Carneiro 140 (Início)
  [-23.506513, -47.483076], # 4: Av. General Carneiro 972 (Vila Lucy)
  [-23.518000, -47.488000], # 5: Av. General Carneiro / Praça Oxford (Junction Pannunzio)
  [-23.522293, -47.491307], # 6: Av. Dr. Armando Pannunzio 316
  [-23.527991, -47.491401], # 7: Av. Dr. Armando Pannunzio 765
  [-23.538500, -47.492500], # 8: Av. Dr. Armando Pannunzio / SP-264
  [-23.548000, -47.493000], # 9: Rod. João Leme dos Santos (SP-264 km 104)
  [-23.564848, -47.494614], # 10: Rod. João Leme dos Santos (SP-264 km 106)
  [-23.575000, -47.508000], # 11: Rod. João Leme dos Santos (SP-264 km 108)
  [-23.582868, -47.524073]  # 12: UFSCar Campus Sorocaba (Terminal Universitário)
]

# Query full OSRM route
coords_str = ";".join([f"{lng},{lat}" for lat, lng in UFSCAR_BAIRRO_WAYPOINTS])
url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
req = urllib.request.Request(url, headers={'User-Agent': 'CittaZeroTester/1.0'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

raw_pts = data['routes'][0]['geometry']['coordinates']
pts = [[lat, lng] for lng, lat in raw_pts]
print(f"Total OSRM Bairro pts: {len(pts)}")

# Look for Comunidade Tatiana (lng <= -47.500 and lat between -23.540 and -23.555)
tatiana = [p for p in pts if -23.555 <= p[0] <= -23.540 and p[1] <= -47.498]
print(f"Tatiana points: {len(tatiana)}")
if tatiana:
    print("Found Tatiana in Bairro OSRM:", tatiana[:5])

# Now test CENTRO (reversed)
coords_str_c = ";".join([f"{lng},{lat}" for lat, lng in reversed(UFSCAR_BAIRRO_WAYPOINTS)])
url_c = f"https://router.project-osrm.org/route/v1/driving/{coords_str_c}?overview=full&geometries=geojson"
req_c = urllib.request.Request(url_c, headers={'User-Agent': 'CittaZeroTester/1.0'})
with urllib.request.urlopen(req_c) as resp:
    data_c = json.loads(resp.read().decode('utf-8'))

raw_pts_c = data_c['routes'][0]['geometry']['coordinates']
pts_c = [[lat, lng] for lng, lat in raw_pts_c]
print(f"\nTotal OSRM Centro pts: {len(pts_c)}")

tatiana_c = [p for p in pts_c if -23.555 <= p[0] <= -23.540 and p[1] <= -47.498]
print(f"Tatiana points in Centro: {len(tatiana_c)}")
if tatiana_c:
    print("Found Tatiana in Centro OSRM:", tatiana_c[:5])
