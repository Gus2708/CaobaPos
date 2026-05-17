const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withAgpVersion(config) {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    if (contents.includes("com.android.tools.build:gradle:8.7")) {
      return config;
    }

    // Replace AGP version (handles both single and double quotes)
    contents = contents.replace(
      /classpath\(['"]com\.android\.tools\.build:gradle:[\d.]+['"]\)/,
      "classpath('com.android.tools.build:gradle:8.7.2')"
    );

    // Add subprojects block to force build types on library modules
    const subprojectsBlock = `
subprojects {
  afterEvaluate { project ->
    if (project.plugins.hasPlugin('com.android.library')) {
      project.android {
        buildTypes {
          release {
            minifyEnabled false
          }
          debug {
            minifyEnabled false
          }
        }
      }
    }
  }
}
`;

    if (!contents.includes('hasPlugin')) {
      contents = contents.replace(
        /allprojects\s*\{/,
        (match) => `${subprojectsBlock}\n${match}`
      );
    }

    config.modResults.contents = contents;
    return config;
  });
};
