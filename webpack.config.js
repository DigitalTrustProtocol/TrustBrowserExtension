const path = require('path');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin')
module.exports = {
  entry: {main: './js/app.ts', extpopup: './js/extensionpopup.js', twitter: './js/Twitter.ts'},
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
      filename: './trustlist.html',
      template: './trustlist.html',
      chunks: ['main'],
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true
      }
    }),
    new HtmlWebpackPlugin({  // Also generate a test.html
      filename: './extensionpopup.html',
      template: './extensionpopup.html',
      chunks: ['extpopup'],
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
    new HtmlWebpackPlugin({  // Also generate a test.html
      filename: './redditmodal.html',
      template: './redditmodal.html',
      chunks: [''], // no chunk pushed to html
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true
      }
    }),
    new CopyWebpackPlugin([
      {from:'css',to:'./css'},
      {from:'img',to:'./img'},
      {from:'fonts',to:'./fonts'},
      {from:'lib',to:'./lib'},
      {from:'js',to:'./js'},
      {from:'typings',to:'./typings'},
      {from:'manifest.json',to:'./manifest.json'},
      {from:'data.json',to:'./data.json'}  
  ]),
  ],
  optimization: {
    minimize: false
  }
};