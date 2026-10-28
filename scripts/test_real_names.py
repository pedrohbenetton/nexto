import urllib.request, re

req = urllib.request.Request('https://linhas.cittamobi.com.br/lines/transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7.html', headers={'User-Agent': 'Mozilla/5.0'})
raw = urllib.request.urlopen(req).read()
text = raw.decode('utf-8', errors='replace')

matches = re.findall(r'<p class="p-18 stop-name">(.*?)</p>', text)
for i, m in enumerate(matches):
    print(f"[{i+1}] {m}")
