with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('sharedLinkForMobile')
print(c[idx-1200:idx])
