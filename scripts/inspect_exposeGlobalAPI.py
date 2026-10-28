with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('exposeGlobalAPI')
if idx != -1:
    print(c[idx-50:idx+800])
