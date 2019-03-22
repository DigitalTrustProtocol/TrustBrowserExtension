const path = require('path');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin')
module.exports = {
  entry: {
    main: './js/main.ts',
    popup: './js/Extensionpopup.ts',
    trustgraph: './js/TrustGraph.ts'
  },
  mode: 'development',
  devtool: 'cheap-module-source-map',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      // {
      //   test: /\.css$/,
      //   use: [ 'style-loader', 'css-loader' ]
      // },
      {
        test: /\.(png|jpg|gif|ttf|woff2|woff|eot|svg)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 8192
            }
          }
        ]
      },
      {
        test: /\.(html)$/,
        use: {
          loader: 'html-loader',
          options: {
            attrs: [':data-src']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: [ '.ts', '.js' ]
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new CleanWebpackPlugin(['dist']),
    new HtmlWebpackPlugin({  // Also generate a test.html
      filename: './trustgraph.html',
      template: './trustgraph.html',
      chunks: ['trustgraph'],
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true
      }
    }),
    new HtmlWebpackPlugin({  // Also generate a test.html
      filename: './extensionpopup.html',
      template: './extensionpopup.html',
      chunks: ['popup'],
      minify   : {
        html5                          : true,
        collapseWhitespace             : true,
        minifyCSS                      : true,
        minifyJS                       : true,
        minifyURLs                     : false,
        removeAttributeQuotes          : true,
        removeComments                 : true,
        removeEmptyAttributes          : true,
        removeOptionalTags             : true,
        removeRedundantAttributes      : true,
        removeScriptTypeAttributes     : true,
        useShortDoctype                : true
      }
    }),
    new CopyWebpackPlugin([
      {from:'css',to:'./css'},
      {from:'img',to:'./img'},
      {from:'fonts',to:'./fonts'},
      {from:'lib',to:'./lib'},
      {from:'js/background.js',to:'./js/'},
      {from:'js/common.js',to:'./js/'},
      {from:'typings',to:'./typings'},
      {from:'manifest.json',to:'./manifest.json'}
  ]),
  ]
};