const fs = require('fs');
const path = require('path');

// Only the fonts the app actually renders are listed here.
// Parkinsans is NOT sourced from node_modules: it is vendored directly into
// assets/fonts and public/fonts, because no @expo-google-fonts package for it
// is installed. Do not expect this script to restore it.
// JetBrains Mono 500Medium is deliberately absent — no mono style in the app
// pairs with weight 500, so shipping it was dead weight.
const fontSources = [
  {
    src: 'node_modules/@expo-google-fonts/jetbrains-mono/400Regular/JetBrainsMono_400Regular.ttf',
    destAssets: 'assets/fonts/JetBrainsMono_400Regular.ttf',
    destPublic: 'public/fonts/JetBrainsMono_400Regular.ttf'
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

const total = fontSources.length;
console.log(`Fonts transfer completed.`);
console.log(`- Assets folder (Native): ${assetsSuccess}/${total} files copied.`);
console.log(`- Public folder (Web PWA): ${publicSuccess}/${total} files copied.`);
