import re

with open("extracted/main.js", "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

print("Searching context around token and hosts:")
token = "$2a$10$aGN1MBopPjiM/97AzcG28ugrkNejBLKz8sJ/.vJ3RNDRENgyUX1t6"
pos = content.find(token)
if pos != -1:
    print("Context around token:")
    start = max(0, pos - 300)
    end = min(len(content), pos + 300)
    print(content[start:end])
    print("-" * 50)

print("Searching for endpoint paths in main.js:")
paths = set(re.findall(r'["\'](/[a-zA-Z0-9_\-\.\/]+)["\']', content))
citta_paths = [p for p in paths if any(k in p for k in ["trip", "line", "route", "stop", "service", "predic", "proto", "bus", "auto"])]
for p in sorted(citta_paths):
    print(" ", p)

print("\nSearching for environments / config object in main.js:")
env_matches = re.findall(r'(\w+:\s*\{[^}]*core\.cittamobi\.com\.br[^}]*\})', content)
for m in env_matches:
    print(m)

# Find all occurrences of core.cittamobi.com.br
print("\nAll occurrences of core.cittamobi.com.br:")
for m in re.finditer(r'core\.cittamobi\.com\.br', content):
    s = max(0, m.start() - 100)
    e = min(len(content), m.end() + 150)
    print(content[s:e])
    print("=" * 40)
