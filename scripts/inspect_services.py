import re

def inspect_methods(filepath):
    print(f"\n=================== {filepath} ===================")
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    patterns = [
        'getAllServicesByCityIdProto',
        'getCityProto',
        'getServiceByNameAndCityProto',
        'fetchStopPredictions',
        'predictions',
        'LineRoutes',
        'tripplanner',
        'apiPrimova',
        'apiCittamobi',
        'servicePredictionsProto',
        'deserializeBinary'
    ]

    for p in patterns:
        for m in re.finditer(re.escape(p), content):
            start = max(0, m.start() - 250)
            end = min(len(content), m.end() + 250)
            print(f"-- Match for '{p}':")
            print(content[start:end])
            print()

inspect_methods('extracted/597.29e3e9782f1c08b9.js')
inspect_methods('extracted/route-line.js')
