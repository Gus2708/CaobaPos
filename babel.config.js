module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // React Compiler — automatic memoization (React 19+)
      ['babel-plugin-react-compiler', {}],
      function importMetaTransformPlugin({ types: t }) {
        return {
          visitor: {
            MetaProperty(path) {
              if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
                path.replaceWith(
                  t.objectExpression([
                    t.objectProperty(
                      t.identifier('env'),
                      t.objectExpression([
                        t.objectProperty(t.identifier('MODE'), t.stringLiteral('production'))
                      ])
                    )
                  ])
                );
              }
            }
          }
        };
      },
    ],
  };
};
