import os
import re

files = [os.path.join('extracted', f) for f in os.listdir('extracted') if f.endswith('.js')]

print("Searching extracted JS files:")
for path in files:
    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Search for api paths
    matches = re.findall(r'["\'](/(?:tripplanner|linesroutes|stops|lines|services|vehicles|predictions|bus|search|v\d+)[^"\']*)["\']', content)
    if matches:
        print(f"\n[{path}] Matching API paths:")
        for m in sorted(set(matches)):
            print(f"  {m}")

    # Search for protobuf strings
    proto_matches = re.findall(r'([a-zA-Z0-9_\.]*Proto[a-zA-Z0-9_]*)', content)
    if proto_matches:
        print(f"\n[{path}] Protobuf mentions:")
        for pm in sorted(set(proto_matches))[:20]:
            print(f"  {pm}")

    # Search for http headers
    headers = re.findall(r'username\s*:\s*["\']([^"\']+)["\']', content)
    if headers:
        print(f"\n[{path}] Username header: {headers}")
