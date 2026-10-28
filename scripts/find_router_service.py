import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/main.js', 'extracted/597.29e3e9782f1c08b9.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    print(f"=== {fname} ===")
    for m in re.finditer(r'servicePredictions\s*\(', content):
        s = max(0, m.start() - 200)
        e = min(len(content), m.end() + 300)
        print(content[s:e])
        print("~" * 40)
    
    # Also find searchCities, searchAllServicesByCityId, searchServiceByNameAndCity
    for term in ['searchCities', 'searchAllServicesByCityId', 'searchServiceByNameAndCity']:
        for m in re.finditer(re.escape(term), content):
            s = max(0, m.start() - 150)
            e = min(len(content), m.end() + 250)
            print(f"Term '{term}':")
            print(content[s:e])
            print("-" * 40)
