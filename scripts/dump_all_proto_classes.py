import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Find all proto classes exported
proto_classes = re.findall(r'exportSymbol\("proto\.br\.com\.cittamobi\.core\.(\w+)"', content)
print(f"Exported Proto classes in main.js ({len(set(proto_classes))}):")
for c in sorted(set(proto_classes)):
    print(f"  {c}")

with open('extracted/597.29e3e9782f1c08b9.js', 'r', encoding='utf-8', errors='ignore') as f:
    content597 = f.read()

proto_597 = re.findall(r'Ht\.(\w+)', content597)
print(f"Proto classes in 597.js: {set(proto_597)}")
