const path = require('path');
const webpack = require("webpack");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin')
module.exports = {
  entry: {
    main: './src/js/content/main.ts',
    mastodon: './src/js/content/mastodon.ts',
    mastodonProfile: './src/js/content/mastodonProfile.ts',
    popup: './src/js/content/popup.ts',
    trustgraph: ['./src/js/content/TrustGraph.ts','./src/lib/Notify/notify.min.js', './src/lib/bootstrap/dist/js/bootstrap.min.js'],
    twitteridentity: ['./src/js/content/IdentityPopupController.ts'],
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
      filename: './twitteridentity.html',
      template: './src/public/twitteridentity.html',
      chunks: ['twitteridentity'],
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true
      }
    }),
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
    new CopyWebpackPlugin([
      {from:'src/css',to:'./css'},
      {from:'src/img',to:'./img'},
      {from:'src/fonts',to:'./fonts'},
      {from:'src/lib',to:'./lib'},
      //{from:'js/background.js',to:'./js/'},
      {from:'src/js/common.js',to:'./js/'},
      {from:'src/typings',to:'./typings'},
      {from:'manifest.json',to:'./manifest.json'}
  ]),
  ]
};