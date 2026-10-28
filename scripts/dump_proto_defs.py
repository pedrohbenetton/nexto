import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find LineRoutesVehiclePredictionProto
patterns = [
    r'proto\.br\.com\.cittamobi\.core\.LineRoutesVehiclePredictionProto\.prototype\.(\w+)',
    r'proto\.br\.com\.cittamobi\.core\.ServicePredictionsProto\.prototype\.(\w+)',
    r'proto\.br\.com\.cittamobi\.core\.LineRoutesStopPredictionsProto\.prototype\.(\w+)',
    r'proto\.br\.com\.cittamobi\.core\.PlacesLocationProto\.prototype\.(\w+)',
    r'proto\.br\.com\.cittamobi\.core\.CityProto\.prototype\.(\w+)'
]

for p in patterns:
    matches = set(re.findall(p, content))
    proto_name = p.split('.')[4]
    print(f"\n=== {proto_name} methods ({len(matches)}) ===")
    for m in sorted(matches):
        if m.startswith('get') or m.startswith('has'):
            print(f"  {m}")
