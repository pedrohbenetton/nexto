import urllib.request, json, sys
sys.stdout.reconfigure(encoding='utf-8')

# Waypoints from Centro to UFSCar via General Carneiro and Armando Pannunzio
waypoints = [
    (-23.505427, -47.452724), # Leopoldo Machado (Terminal São Paulo)
    (-23.501500, -47.459000), # Juscelino Kubitscheck
    (-23.504718, -47.464810), # Moreira César
    (-23.503684, -47.470112), # General Carneiro 140
    (-23.506513, -47.483076), # General Carneiro 972
    (-23.518000, -47.488000), # General Carneiro / Pannunzio junction
    (-23.522293, -47.491307), # Armando Pannunzio 316
    (-23.527991, -47.491401), # Armando Pannunzio 1700
    (-23.564848, -47.494614), # João Leme dos Santos (SP-264)
    (-23.582868, -47.524073)  # UFSCar Campus Sorocaba
]

coords_str = ";".join([f"{lon},{lat}" for lat, lon in waypoints])
url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"

print("Fetching OSRM multi-waypoint route...")
req = urllib.request.Request(url, headers={'User-Agent': 'CittaZeroRouteEngine/1.0'})
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read().decode('utf-8'))
    route = data['routes'][0]
    points = route['geometry']['coordinates']
    print(f"✅ Route generated! Distance: {route['distance']/1000:.2f}km, Points: {len(points)}")
    print(f"First point: {points[0]}, Last point: {points[-1]}")
    # Check if route goes through General Carneiro (longitude around -47.47 to -47.48)
    carneiro_pts = [p for p in points if -47.485 <= p[0] <= -47.470 and -23.515 <= p[1] <= -23.502]
    print(f"Points on General Carneiro corridor: {len(carneiro_pts)}")
