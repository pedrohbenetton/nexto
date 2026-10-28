with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('getHeader(c=!1)')
print(c[idx:idx+400])
