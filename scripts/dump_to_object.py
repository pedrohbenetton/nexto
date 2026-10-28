import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

def show_to_object(class_name):
    print(f"\n==================== {class_name}.toObject ====================")
    pattern = rf'proto\.br\.com\.cittamobi\.core\.{class_name}\.toObject=function\(t,o\)\{{(.*?)\}};'
    m = re.search(pattern, content)
    if m:
        print(m.group(0)[:1500])
    else:
        print("Not found via exact pattern, searching looser:")
        idx = content.find(f'{class_name}.toObject=function')
        if idx != -1:
            print(content[idx:idx+1000])

for c in ['LineRoutesVehiclePredictionProto', 'ServicePredictionsProto', 'PlacesLocationProto', 'CityProto', 'LineRoutesServiceSearchProto']:
    show_to_object(c)
