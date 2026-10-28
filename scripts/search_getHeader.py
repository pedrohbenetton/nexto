import re

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('getHeader')
print("Occurrences of getHeader:")
for m in re.finditer(r'getHeader', c):
    print(c[m.start()-20:m.end()+60])
