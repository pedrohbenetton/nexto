import os, re

files = [
    'extracted/main.js',
    'extracted/597.29e3e9782f1c08b9.js',
    'extracted/235.d16c4d92d1855533.js',
    'extracted/827.92bef5503d79140e.js',
    'extracted/829.dcca473a465e8221.js'
]

endpoints = set()
for fpath in files:
    if os.path.exists(fpath):
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            # find all paths starting with /
            found = re.findall(r'["\'](/[a-zA-Z0-9_\-\./\?=&]+)["\']', content)
            for path in found:
                if any(x in path for x in ['service', 'predigo', 'tripplanner', 'lines', 'stops', 'route', 'proto', 'geo', 'shape']):
                    endpoints.add(path)

print(f"Total interesting endpoints found: {len(endpoints)}")
for ep in sorted(endpoints):
    print(ep)
