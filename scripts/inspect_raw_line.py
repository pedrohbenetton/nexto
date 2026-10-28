import urllib.request, re, json

url = 'https://linhas.cittamobi.com.br/lines/transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7.html'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
html = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')

with open('scripts/sample_line.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved sample_line.html, length:", len(html))

# Let's see what scripts and stop divs exist
stop_divs = re.findall(r'<div[^>]*data-stop-id=[^>]*>.*?</div>\s*</div>\s*</div>', html, re.DOTALL)
print("Stop divs found:", len(stop_divs))

for i, div in enumerate(stop_divs[:10]):
    print(f"--- STOP #{i+1} ---")
    print(div.strip()[:300])

# Also check for JSON or coordinates in the HTML!
for m in re.finditer(r'\{[^{}]*(?:lat|lng|latitude|longitude|coordinates|geometry)[^{}]*\}', html, re.IGNORECASE):
    print("Found geo JSON snippet:", m.group(0)[:200])

# Check for any inline JSON scripts
for m in re.finditer(r'<script[^>]*>(.*?)</script>', html, re.DOTALL):
    s = m.group(1).strip()
    if 'stop' in s.lower() or 'coord' in s.lower() or 'lat' in s.lower() or 'service' in s.lower():
        print("Script snippet:", s[:300])
