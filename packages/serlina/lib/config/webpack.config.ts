import { SerlinaInstanceOptions } from "../serlina";
import 'push-if'
const path = require('path')
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const merge = require('webpack-merge')
const AssetsWebpackPlugin = require('assets-webpack-plugin')
const WebpackBar = require('webpackbar')
const WFP = require('write-file-webpack-plugin')

export interface MakeWebpackConfigOptions extends SerlinaInstanceOptions {
  customConfig?: object,
  baseDir: string,
  outputPath: string,
  publicPath: string,
  plugins: any[],
  dev: boolean,
  __testing?: boolean,
  pages: { [pageName: string]: string }
}

export default (options: MakeWebpackConfigOptions) => {

  const {
    customConfig = {},
    baseDir,
    outputPath,
    publicPath,
    dev,
    plugins,
    pages = {},
    __testing
  } = options

  const assetsWebpackPlugin = new AssetsWebpackPlugin({
    path: outputPath,
    filename: 'assetsmap.json',
    fullPath: false
  })

  const common = merge.smart({
    mode: dev ? 'development' : 'production',
    context: baseDir,
    resolve: {
      symlinks: false
    },
    resolveLoader: {
      modules: [
        path.resolve(__dirname, '../../node_modules'),
        'node_modules',
      ]
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [require.resolve('babel-preset-env'), require.resolve('babel-preset-react')],
              plugins: [require.resolve('babel-plugin-transform-regenerator')]
            }
          }
        },
        {
          test: /\.css$/,
          exclude: /(node_modules)/,
          use: [
            MiniCssExtractPlugin.loader,
            { loader: 'css-loader', options: { importLoaders: 1 } }
          ]
        }
      ]
    },
    plugins: [
      ...plugins,
      new MiniCssExtractPlugin({
        filename: dev ? '[name].css' : '[name]-[chunkhash].css'
      }),
    ]
      .pushIf(!__testing, new FriendlyErrorsWebpackPlugin())
      .pushIf(!dev, new WebpackBar())
      .pushIf(!dev, assetsWebpackPlugin)
  }, customConfig)

  const clientSide = merge.smart({
    entry: {
      ...pages,
      '_SERLINA_MAIN': path.resolve(__dirname, '../client/render')
    },
    externals: {
      react: 'React',
      'react-dom': 'ReactDOM'
    },
    target: 'web',
    output: {
      filename: dev ? '[name].js' : '[name]-[chunkhash].js',
      path: outputPath,
      publicPath,
      library: '__serlina',
      globalObject: 'this',
      libraryTarget: 'umd'
    },
  }, common)

  const serverSide = merge.smart({
    entry: pages,
    target: 'node',
    externals: /^[a-z\-0-9]+$/,
    output: {
      filename: '[name].cmd.js',
      path: outputPath,
      publicPath,
      libraryTarget: 'commonjs2'
    },
    plugins: [
      new WFP()
    ]
  }, common)

  const vendors = merge.smart({
    entry: {
      '_SERLINA_VENDOR': [
        require.resolve('babel-polyfill'),
        path.resolve(__dirname, '../client/common')
      ]
    },
    output: {
      filename: dev ? '[name].js' : '[name]-[chunkhash].js',
      path: outputPath,
      publicPath,
    },
  }, common)

  return [
    serverSide,
    clientSide,
    vendors
  ]
}