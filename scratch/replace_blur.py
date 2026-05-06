import sys

file_path = r'g:\Projects\CaobaPOS\CaobaPOS\app\DashboardPanel.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import { BlurView } from '@sbaiahmed1/react-native-blur';",
    "import { BlurView } from 'expo-blur';"
)
content = content.replace('blurType="dark" blurAmount={30}', 'tint="dark" intensity={30}')
content = content.replace('blurType="dark" blurAmount={40}', 'tint="dark" intensity={40}')
content = content.replace(
    '''      <BlurView
        blurType="dark"
        blurAmount={30}
        style={StyleSheet.absoluteFill}
      />''',
    '''      <BlurView
        tint="dark"
        intensity={30}
        style={StyleSheet.absoluteFill}
      />'''
)
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('Replaced expo-blur in DashboardPanel.tsx')
