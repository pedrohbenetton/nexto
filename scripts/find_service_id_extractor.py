import re

with open('extracted/route-line.js', 'r', encoding='utf-8', errors='ignore') as f:
    code = f.read()

idx = code.find('serviceId não encontrado')
if idx != -1:
    print("Found context in route-line.js:")
    print(code[max(0, idx-300):min(len(code), idx+300)])
