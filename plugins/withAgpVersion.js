const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withAgpVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes("com.android.tools.build:gradle:8.7")) {
      return config;
    }

    config.modResults.contents = contents.replace(
      /classpath\('com\.android\.tools\.build:gradle:[\d.]+'\)/,
      "classpath('com.android.tools.build:gradle:8.7.2')"
    );

    return config;
  });
};
