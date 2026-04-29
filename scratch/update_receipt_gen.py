import os

# Paths
receipt_gen_path = r'g:\Projects\CaobaPOS\CaobaPOS\lib\receiptGenerator.ts'
logo_base64_path = r'g:\Projects\CaobaPOS\CaobaPOS\scratch\logo_base64.txt'

# Read clean base64
with open(logo_base64_path, 'r') as f:
    clean_base64 = f.read().strip()

# Read original file
with open(receipt_gen_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Replace LOGO_BASE64 line
# It should be on line 5 (1-indexed) based on viewed output
new_lines = []
for line in lines:
    if line.strip().startswith('const LOGO_BASE64 ='):
        new_lines.append(f"const LOGO_BASE64 = '{clean_base64}';\n")
    else:
        new_lines.append(line)

# Write back
with open(receipt_gen_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully updated LOGO_BASE64 in receiptGenerator.ts")
