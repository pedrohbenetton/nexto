import re, sys
sys.stdout.reconfigure(encoding='utf-8')

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

idx = content.find('processRTPredictions')
if idx != -1:
    print("Found processRTPredictions:")
    print(content[max(0, idx-200):min(len(content), idx+1200)])
