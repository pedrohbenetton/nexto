import os, re

for fname in os.listdir('extracted'):
    if fname.endswith('.js'):
        fpath = os.path.join('extracted', fname)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            text = f.read()
            m = set(re.findall(r'https?://[a-zA-Z0-9_\-\.]*(?:map|tile|geo|carto|osm|gtfs)[a-zA-Z0-9_\-\.]*', text, re.IGNORECASE))
            if m:
                print(f"In {fname}:")
                for u in m:
                    print("  ", u)
