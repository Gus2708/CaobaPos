import base64
import os

def get_base64_from_file(file_path):
    if not os.path.exists(file_path):
        return "File not found"
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return f"data:image/png;base64,{encoded_string}"

logo_path = r"g:\Projects\CaobaPOS\CaobaPOS\assets\caoba-logo.png"
base64_string = get_base64_from_file(logo_path)
print(base64_string)
