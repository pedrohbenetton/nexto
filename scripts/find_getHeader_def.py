with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('getHeader(){')
if idx != -1:
    print(c[idx:idx+300])
else:
    # try regex
    import re
    m = re.search(r'getHeader\s*\(\)\s*\{', c)
    if m:
        print(c[m.start():m.start()+300])
