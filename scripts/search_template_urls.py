import re, sys
sys.stdout.reconfigure(encoding='utf-8')

for fname in ['extracted/main.js', 'extracted/597.29e3e9782f1c08b9.js']:
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    # Find backtick endpoints
    backtick_matches = set(re.findall(r'`(/[^`]+)`', content))
    print(f"=== {fname} Backtick endpoints ({len(backtick_matches)}) ===")
    for m in sorted(backtick_matches):
        print(f"  {m}")
