import urllib.request, re

req = urllib.request.Request('https://linhas.cittamobi.com.br/lines/transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7.html', headers={'User-Agent': 'Mozilla/5.0'})
raw = urllib.request.urlopen(req).read()
text = raw.decode('latin-1')

m = re.findall(r'<p class="p-18 stop-name">(.*?)</p>', text)
print('Stop 5:', m[4])
print('Stop 12:', m[11])
print('Stop 23:', m[22])
