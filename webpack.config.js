const path = require('path');

module.exports = {
  entry: './dist/cjs/widget.cjs.js',
  target: "web",
  output: {
    filename: 'widget.js',
    path: path.resolve(__dirname, 'cdn'),
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    fallback: {
        "url": require.resolve("url"),
    }
  }
};