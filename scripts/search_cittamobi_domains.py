import re

for fname in ['extracted/main.js', 'extracted/vendor.71dd4ee48eb98152.js', 'extracted/597.29e3e9782f1c08b9.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        text = f.read()
    
    # search for api, http, predigo, linesroutes, etc.
    matches = set(re.findall(r'https?://[a-zA-Z0-9_\-\.]+', text))
    print(f"--- Domains in {fname} ---")
    for m in sorted(matches):
        if 'cittamobi' in m or 'api' in m or 'transporte' in m:
            print(" ", m)

    # Search for linesroutes or predigo or tripplanner occurrences
    for keyword in ['linesroutes', 'predigo', 'tripplanner', 'predictions', 'vehicle', 'gtfs']:
        matches_kw = re.findall(rf'([a-zA-Z0-9_/\.\-]*{keyword}[a-zA-Z0-9_/\.\-]*)', text, re.IGNORECASE)
        if matches_kw:
            print(f"Keyword '{keyword}' in {fname}: {len(matches_kw)} occurrences")
            for sample in list(set(matches_kw))[:5]:
                print(f"   {sample}")
