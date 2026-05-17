const fs = require('fs');
const path = require('path');

const fontSources = [
  {
    src: 'node_modules/@expo-google-fonts/instrument-sans/400Regular/InstrumentSans_400Regular.ttf',
    destAssets: 'assets/fonts/InstrumentSans_400Regular.ttf',
    destPublic: 'public/fonts/InstrumentSans_400Regular.ttf'
  },
  {
    src: 'node_modules/@expo-google-fonts/instrument-sans/500Medium/InstrumentSans_500Medium.ttf',
    destAssets: 'assets/fonts/InstrumentSans_500Medium.ttf',
    destPublic: 'public/fonts/InstrumentSans_500Medium.ttf'
  },
  {
    src: 'node_modules/@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf',
    destAssets: 'assets/fonts/InstrumentSans_600SemiBold.ttf',
    destPublic: 'public/fonts/InstrumentSans_600SemiBold.ttf'
  },
  {
    src: 'node_modules/@expo-google-fonts/instrument-sans/700Bold/InstrumentSans_700Bold.ttf',
    destAssets: 'assets/fonts/InstrumentSans_700Bold.ttf',
    destPublic: 'public/fonts/InstrumentSans_700Bold.ttf'
  },
  {
    src: 'node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf',
    destAssets: 'assets/fonts/JetBrainsMono_400Regular.ttf',
    destPublic: 'public/fonts/JetBrainsMono_400Regular.ttf'
  },
  {
    src: 'node_modules/@expo-google-fonts/jetbrains-mono/500Medium/JetBrainsMono_500Medium.ttf',
    destAssets: 'assets/fonts/JetBrainsMono_500Medium.ttf',
    destPublic: 'public/fonts/JetBrainsMono_500Medium.ttf'
  },
  {
    src: 'node_modules/@expo-google-fonts/jetbrains-mono/600SemiBold/JetBrainsMono_600SemiBold.ttf',
    destAssets: 'assets/fonts/JetBrainsMono_600SemiBold.ttf',
    destPublic: 'public/fonts/JetBrainsMono_600SemiBold.ttf'
  },
  {
    src: 'node_modules/@expo-google-fonts/jetbrains-mono/700Bold/JetBrainsMono_700Bold.ttf',
    destAssets: 'assets/fonts/JetBrainsMono_700Bold.ttf',
    destPublic: 'public/fonts/JetBrainsMono_700Bold.ttf'
  }
];

const projectRoot = path.join(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets', 'fonts');
const publicDir = path.join(projectRoot, 'public', 'fonts');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Copying local font assets from node_modules...');

let assetsSuccess = 0;
let publicSuccess = 0;

for (const font of fontSources) {
  const srcPath = path.join(projectRoot, font.src);
  const destAssetsPath = path.join(projectRoot, font.destAssets);
  const destPublicPath = path.join(projectRoot, font.destPublic);

  if (fs.existsSync(srcPath)) {
    // Copy to Assets
    fs.copyFileSync(srcPath, destAssetsPath);
    assetsSuccess++;
    
    // Copy to Public
    fs.copyFileSync(srcPath, destPublicPath);
    publicSuccess++;
  } else {
    console.error(`Source font file not found: ${font.src}`);
  }
}

console.log(`Fonts transfer completed.`);
console.log(`- Assets folder (Native): ${assetsSuccess}/8 files copied.`);
console.log(`- Public folder (Web PWA): ${publicSuccess}/8 files copied.`);
