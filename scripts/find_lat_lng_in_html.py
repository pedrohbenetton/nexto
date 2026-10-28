import re

with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's find any occurrences of -23. or -47. (Sorocaba coordinates!)
sorocaba_coords = re.findall(r'(-23\.\d+)[^\d\-]+(-47\.\d+)', html)
print(f"Sorocaba coords (-23.*, -47.*): {len(sorocaba_coords)}")
if sorocaba_coords:
    print("Found coords:", sorocaba_coords[:10])

# Also check any other negative float coordinates
neg_coords = re.findall(r'(-[1-3]\d\.\d{3,})', html)
print(f"Negative latitude/longitude coordinates in Brazil: {len(neg_coords)}")
if neg_coords:
    print("Samples:", neg_coords[:10])
