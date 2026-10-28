with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

idx = c.find('TripPlanDataRequest.prototype.')
while idx != -1:
    end = c.find('}', idx)
    print(c[idx:end+1])
    idx = c.find('TripPlanDataRequest.prototype.', end)
