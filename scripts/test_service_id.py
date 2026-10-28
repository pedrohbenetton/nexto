import re

with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

m = re.findall(r'<[^>]*id=["\']serviceId["\'][^>]*>', html)
print('serviceId tags:', m)

# Also check any other inputs
inputs = re.findall(r'<input[^>]*>', html)
for inp in inputs:
    print('Input:', inp)
