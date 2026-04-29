import base64
import os

logo_path = r'g:\Projects\CaobaPOS\CaobaPOS\assets\caoba-logo.png'
with open(logo_path, "rb") as image_file:
    encoded_string = base64.b64encode(image_file.read()).decode('utf-8')

print(f"data:image/png;base64,{encoded_string}")
