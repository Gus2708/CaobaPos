const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude Gradle plugin build output dirs that don't exist on Windows,
// causing Metro's FallbackWatcher to crash with ENOENT.
config.watchFolders = (config.watchFolders || []).filter(Boolean);
config.resolver.blockList = [
  /node_modules\/.*\/expo-module-gradle-plugin\/.*/,
  /node_modules\/.*\/expo-autolinking-plugin\/.*/,
  /node_modules\/.*\/gradle-plugin\/.*/,
  ...(config.resolver.blockList ? [config.resolver.blockList].flat() : []),
];

module.exports = config;
