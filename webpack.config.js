const path = require('path');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin')
module.exports = {
  entry: {
    main: './src/js/content/main.ts',
    popup: './src/js/content/popup.ts',
    trustgraph: ['./src/js/content/TrustGraph.ts'], // ,'./src/lib/Notify/notify.min.js'
    loginpopup: ['./src/js/content/LoginPopup.ts'], 
    loginpopupcallback: ['./src/js/content/LoginPopupCallback.ts'], 
    background: './src/js/background/background.ts',
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
      {
        test: /\.css$/,
        use: [ 'style-loader', 'css-loader' ]
      },
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
    extensions: [ '.ts', '.js' ],
    alias: {
      "webextension-polyfill-ts": path.resolve(path.join(__dirname, "node_modules", "webextension-polyfill-ts"))
    }
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new CleanWebpackPlugin(['dist']),

    new HtmlWebpackPlugin({  
      filename: './popup.html',
      template: './src/public/popup.html',
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
    new HtmlWebpackPlugin({  
      filename: './trustgraph.html',
      template: './src/public/trustgraph.html',
      chunks: ['trustgraph'],
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true
      }
    }),
    new HtmlWebpackPlugin({  
      filename: './loginpopup.html',
      template: './src/public/loginpopup.html',
      chunks: ['loginpopup'],
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true
      }
    }),
    new HtmlWebpackPlugin({  
      filename: './loginpopupcallback.html',
      template: './src/public/loginpopupcallback.html',
      chunks: ['loginpopupcallback'],
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true
      }
    }),

    new CopyWebpackPlugin([
      {from:'src/css',to:'./css'},
      {from:'src/img',to:'./img'},
      {from:'src/fonts',to:'./fonts'},
      {from:'src/lib',to:'./lib'},
      {from:'src/templates',to:'./templates'},
      //{from:'js/background.js',to:'./js/'},
      {from:'src/typings',to:'./typings'},
      {from:'manifest.json',to:'./manifest.json'}
  ]),
  ]
};