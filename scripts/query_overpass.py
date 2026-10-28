import urllib.request, json, urllib.parse

query = """
[out:json][timeout:25];
area["name"="Sorocaba"]->.searchArea;
(
  relation["type"="route"]["route"="bus"]["ref"="80"](area.searchArea);
  relation["type"="route"]["route"="bus"]["name"~"UFSCAR",i](area.searchArea);
);
out body;
>;
out skel qt;
"""

url = "https://overpass-api.de/api/interpreter"
data = urllib.parse.urlencode({'data': query}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'User-Agent': 'CittaZero/1.0'})

try:
    print("Querying Overpass API for route 80 in Sorocaba...")
    with urllib.request.urlopen(req, timeout=30) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("Elements count:", len(res.get('elements', [])))
        relations = [e for e in res.get('elements', []) if e.get('type') == 'relation']
        print(f"Relations found: {len(relations)}")
        for r in relations:
            print("Tags:", r.get('tags', {}))
            print("Members count:", len(r.get('members', [])))
        with open('scripts/overpass_80.json', 'w', encoding='utf-8') as out:
            json.dump(res, out, indent=2)
except Exception as e:
    print("Error querying overpass:", e)
