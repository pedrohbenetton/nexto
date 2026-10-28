with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('getHeader()')
while idx != -1:
    print(c[idx-50:idx+250])
    print('='*50)
    idx = c.find('getHeader()', idx + 10)
