with open('extracted/route-line.js', 'r', encoding='utf-8', errors='ignore') as f:
    js = f.read()

print(f"route-line.js length: {len(js)}")
print(js[:1500])
