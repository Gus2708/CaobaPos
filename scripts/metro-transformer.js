const upstreamTransformer = require('@expo/metro-config/build/babel-transformer');

module.exports.transform = function({ src, filename, options }) {
  // Intercept and replace import.meta with a browser-safe fallback object
  // to avoid SyntaxError: Cannot use 'import.meta' outside a module in production.
  if (src.includes('import.meta')) {
    src = src.replace(/import\.meta/g, '({ env: { MODE: "production" } })');
  }
  return upstreamTransformer.transform({ src, filename, options });
};
