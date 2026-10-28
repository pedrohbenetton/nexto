import re, glob

for fname in glob.glob('extracted/*.js'):
    with open(fname, 'r', encoding='utf-8', errors='ignore') as f:
        c = f.read()
    for m in re.finditer(r'\/linesroutes\/[a-zA-Z0-9_\-\/]+', c):
        print(f"{fname}: {m.group(0)}")
