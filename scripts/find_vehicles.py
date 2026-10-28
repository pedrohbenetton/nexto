import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/main.js', 'extracted/route-line.js', 'extracted/597.29e3e9782f1c08b9.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    for pattern in ['LineRoutesVehiclePredictionProto', 'ServicePredictionsProto', 'VehiclePrediction', 'vehicle', 'lat', 'lng', 'prediction']:
        matches = list(re.finditer(re.escape(pattern), content))
        if matches:
            print(f"[{fname}] Pattern '{pattern}' matched {len(matches)} times.")

    # Search specifically for protobuf field definitions in ServicePredictionsProto
    if 'ServicePredictionsProto' in content:
        for m in re.finditer(r'ServicePredictionsProto', content):
            s = max(0, m.start() - 100)
            e = min(len(content), m.end() + 400)
            print(f"[{fname}] ServicePredictionsProto excerpt:")
            print(content[s:e])
            print("=" * 50)
