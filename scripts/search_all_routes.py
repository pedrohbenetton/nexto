import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/main.js', 'extracted/597.29e3e9782f1c08b9.js', 'extracted/vendor.71dd4ee48eb98152.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    matches = set(re.findall(r'["\'](/(?:linesroutes|tripplanner|predigo|session|lines|routes|services|vehicles)[^"\']*)["\']', content))
    print(f"=== {fname} ({len(matches)} endpoints) ===")
    for m in sorted(matches):
        print(f"  {m}")
