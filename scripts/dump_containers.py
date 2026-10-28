import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

def show_to_object(class_name):
    print(f"\n==================== {class_name}.toObject ====================")
    idx = content.find(f'{class_name}.toObject=function')
    if idx != -1:
        print(content[idx:idx+800])

for c in ['CitiesProto', 'LineRoutesServiceSearchesProto', 'PlacesSearchProto', 'TripPlanDataProto', 'ItineraryDataProto', 'LegDataProto']:
    show_to_object(c)
