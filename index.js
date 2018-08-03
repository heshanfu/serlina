require('babel-polyfill')
const webpack = require('webpack')
const makeWebpackConfig = require('./config/webpack.config')
const fs = require('fs')
const ReactDOMServer = require('react-dom/server')
const path = require('path')
const React = require('react')
const WDS = require('webpack-dev-server')
const Document = require('./components/Document')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const DEV_SERVER_HOST = '127.0.0.1'
const DEV_SERVER_PORT = 3000

const noCacheRequire = (pkg) => {
  delete require.cache[pkg]
  return require(pkg)
}

class Serlina {

  constructor({
    baseDir = '',
    outputPath = path.resolve(baseDir, '.serlina'),
    publicPath = 'http://' + DEV_SERVER_HOST + ':' + DEV_SERVER_PORT + '/',
    serlinaConfig = fs.existsSync(path.resolve(baseDir, './serlina.config.js')) ? require(path.resolve(baseDir, './serlina.config.js')) : {},
    dev = true
  } = {}) {

    this.resolveApp = p => path.resolve(baseDir, p)
    this.resolveOutput = p => path.resolve(outputPath, p)

    this.options = {
      baseDir,
      dev,
      serlinaConfig,
      outputPath,
      publicPath
    }
  }

  prepare() {
    const pagesPath = path.resolve(this.options.baseDir, './page')
    const pageFileNames = fs.readdirSync(pagesPath)
    const pages = {}

    pageFileNames.forEach(filename => {
      // remove the extensions
      const pageName = filename.split('.').slice(0, -1).join('.')
      pages[pageName] = [path.resolve(this.options.baseDir, './page', filename)]
    })

    const webpackConfig = makeWebpackConfig({
      ...this.options,
      pages,
      customConfig: this.options.serlinaConfig.webpack ? this.options.serlinaConfig.webpack(webpack, {
        miniCSSLoader: MiniCssExtractPlugin.loader
      }) : {}
    })

    return new Promise((res, rej) => {
      webpack(webpackConfig, (err, stats) => {
        if (err || stats.hasErrors()) {
          // Handle errors here
          rej(err || stats.toString({
            colors: true
          }))
        }
        this.stats = stats.toJson({
          assets: true
        })

        if (this.options.dev === true) {

          const devServerOptions = {
            host: DEV_SERVER_HOST,
            port: DEV_SERVER_PORT,
            quiet: true,
            headers: {
              "Access-Control-Allow-Origin": "*"
            }
          }

          const compiler = webpack(webpackConfig)
          const devServer = new WDS(compiler, devServerOptions)

          devServer.listen(DEV_SERVER_PORT, DEV_SERVER_HOST, () => {
            res()
          })

        } else {
          return res()
        }
      })
    })
  }

  inject (payload) {
    this.injectedPayload = payload
  }

  async render(pageName) {
    if (pageName.startsWith('/')) pageName = pageName.replace('/', '')
    let page;

    try {
      page = noCacheRequire(this.resolveOutput(pageName + '.js'))
    } catch (e) {
      pageName = '_404'
      if (fs.existsSync(this.resolveOutput('./_404.js'))) {
        page = noCacheRequire(this.resolveOutput('./_404.js'))
      } else {
        page = {
          default: noCacheRequire('./components/_404')
        }
      }
    }

    const initialProps = page.default.getInitialProps ? await page.default.getInitialProps(this.injectedPayload) : {}

    const pageAssets = this.stats.children[0].assets

    const chunks = pageAssets.filter(asset => asset.chunkNames.indexOf(pageName) !== -1)

    const pageScripts = chunks.filter(asset => asset.name.split('.').pop() === 'js')
    const pageStyles = chunks.filter(asset => asset.name.split('.').pop() === 'css')

    const string = '<!DOCTYPE html>' + ReactDOMServer.renderToString(React.createElement(Document, {
      pageScripts,
      pageStyles,
      pageName,
      publicPath: this.options.publicPath,
      initialProps
    }, React.createElement('div', {
      id: 'app',
      'data-reactroot': ''
    }, React.createElement(page.default, initialProps))))

    return {
      string
    }
  }
}

module.exports = Serlina