/**
 * Babel configuration file for Jest
 */

module.exports = {
  presets: [
    ['@babel/preset-env', {targets: {node: 'current'}}]
  ],
};
