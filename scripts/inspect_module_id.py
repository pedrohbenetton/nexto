import re

with open('extracted/main.js', 'r', encoding='utf-8', errors='ignore') as f:
    c = f.read()

# Let's find the module number around `autoCompleteData`
idx = c.find('autoCompleteData')
if idx != -1:
    sub = c[max(0, idx-400):idx+100]
    print("Around autoCompleteData:", sub)
