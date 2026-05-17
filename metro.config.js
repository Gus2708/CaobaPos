const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Use custom transformer to polyfill import.meta during bundling
config.transformer.babelTransformerPath = path.resolve(__dirname, 'scripts/metro-transformer.js');

// Exclude Gradle plugin build output dirs that don't exist on Windows,
// causing Metro's FallbackWatcher to crash with ENOENT.
config.watchFolders = (config.watchFolders || []).filter(Boolean);
config.resolver.blockList = [
  /node_modules\/.*\/expo-module-gradle-plugin\/.*/,
  /node_modules\/.*\/expo-autolinking-plugin\/.*/,
  /node_modules\/.*\/gradle-plugin\/.*/,
  ...(config.resolver.blockList ? [config.resolver.blockList].flat() : []),
];

// Force CommonJS version of Zustand on Web/Desktop to bypass ESM import.meta.env SyntaxError
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'zustand') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'node_modules/zustand/index.js'),
    };
  }
  if (moduleName.startsWith('zustand/')) {
    const subpath = moduleName.replace('zustand/', '');
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, `node_modules/zustand/${subpath}.js`),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
