import re

with open('extracted/line_sample.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Look for SVG paths, Leaflet/Mapbox maps, or stop elements
stop_elements = re.findall(r'<[^>]*class="[^"]*parada[^"]*"[^>]*>', html)
print(f"Parada elements found: {len(stop_elements)}")
if stop_elements:
    print(stop_elements[:5])

# Find how stops are defined in HTML
stops_divs = re.findall(r'<div[^>]*data-stop-id="([^"]+)"[^>]*>(.*?)</div>', html, re.DOTALL)
print(f"Stops divs with data-stop-id: {len(stops_divs)}")
if stops_divs:
    print("Sample stop div:")
    print(stops_divs[0][1][:400])

# Look for static map image or interactive map
map_elements = re.findall(r'<[^>]*id="[^"]*map[^"]*"[^>]*>', html)
print(f"Map elements by id: {map_elements}")

img_maps = re.findall(r'<img[^>]*src="[^"]*map[^"]*"[^>]*>', html)
print(f"Map images: {img_maps}")
