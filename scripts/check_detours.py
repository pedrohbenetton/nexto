import json

with open('server/data/routes_geometry_cache.json', 'r', encoding='utf-8') as f:
    cache = json.load(f)

for key in ['v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Bairro-86ab26fd7fd7', 'v2:35:transporte_publico-Sorocaba-CitySorocaba-80-UFSCAR-Centro-0775a28e4604']:
    pts = cache[key]
    print(f"\n--- Checking {key} ({len(pts)} pts) ---")
    
    # Check Jardim Romilda (lat ~ -23.518 to -23.524, lng ~ -47.488 to -47.495)
    romilda = [p for p in pts if -23.525 <= p[0] <= -23.518 and -47.495 <= p[1] <= -47.486]
    print(f"Points in Romilda/Pannunzio area: {len(romilda)}")
    
    # Check Raposo / Tatiana detour (lat ~ -23.535 to -23.555, lng ~ -47.498 to -47.515)
    tatiana = [p for p in pts if -23.555 <= p[0] <= -23.535 and -47.515 <= p[1] <= -47.495]
    print(f"Points in Tatiana detour: {len(tatiana)}")
    if tatiana:
        print("Tatiana sample:", tatiana[:3])

    # Check Spazio Splendido (lat ~ -23.545 to -23.555, lng ~ -47.485 to -47.492)
    spazio = [p for p in pts if -23.555 <= p[0] <= -23.545 and -47.492 <= p[1] <= -47.485]
    print(f"Points in Spazio Splendido: {len(spazio)}")
    if spazio:
        print("Spazio sample:", spazio[:3])
