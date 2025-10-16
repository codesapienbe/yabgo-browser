const path = require('path');

module.exports = {
  mode: 'development',
  target: 'electron-renderer',
  entry: './src/renderer/renderer.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'renderer.bundle.js'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  devtool: 'source-map'
};

