with open('scripts/sample_line.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
stop_cards = re.findall(r'<div class="stop-card".*?</div>\s*</div>\s*</div>', html, re.DOTALL)
print("Total stop cards:", len(stop_cards))

for i in range(min(5, len(stop_cards))):
    print(f"\n================ STOP CARD {i+1} ================")
    print(stop_cards[i])
