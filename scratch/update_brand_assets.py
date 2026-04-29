import base64
import os

def get_base64_from_file(file_path):
    if not os.path.exists(file_path):
        return None
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return f"data:image/png;base64,{encoded_string}"

logo_path = r"g:\Projects\CaobaPOS\CaobaPOS\assets\caoba-logo.png"
base64_string = get_base64_from_file(logo_path)

if base64_string:
    content = f"""export const LOGO_BASE64 = '{base64_string}';

export const BRAND_COLORS = {{
  primary: '#5C3D2E', // Mahogany
  secondary: '#2D4032', // Sage
  background: '#FDFCFB', // Cream
  text: '#1A1A1A', // Dark
  muted: '#666666',
  border: '#E8E8E8',
  success: '#2D4032',
  warning: '#B87B5A',
  info: '#4A5568',
}};
"""
    with open(r"g:\Projects\CaobaPOS\CaobaPOS\lib\brandAssets.ts", "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated lib/brandAssets.ts successfully")
else:
    print("Logo file not found")
