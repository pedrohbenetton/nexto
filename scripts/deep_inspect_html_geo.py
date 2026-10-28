import re, json

with open('scripts/sample_line.html', 'r', encoding='utf-8', errors='ignore') as f:
    html = f.read()

# Find all occurrences of latitude, longitude, coords, polyline, geojson, maps
keywords = ['coord', 'lat', 'lng', 'polyline', 'geojson', 'point', 'geometry', 'shape', 'path']
for kw in keywords:
    matches = list(re.finditer(re.escape(kw), html, re.IGNORECASE))
    print(f"Keyword '{kw}': {len(matches)} occurrences")

# Find all script contents
scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
print(f"Total <script> tags: {len(scripts)}")
for i, s in enumerate(scripts):
    s_clean = s.strip()
    if len(s_clean) > 0 and len(s_clean) < 1000:
        print(f"Script #{i+1} ({len(s_clean)} chars):")
        print(s_clean[:300])
        print("="*40)
    elif len(s_clean) >= 1000:
        print(f"Script #{i+1} LARGE ({len(s_clean)} chars):")
        # search for keywords inside large script
        for kw in keywords:
            m = re.search(re.escape(kw), s_clean, re.IGNORECASE)
            if m:
                print(f"  Found '{kw}' in script #{i+1} at {m.start()}: {s_clean[max(0, m.start()-50):m.end()+80]}")
