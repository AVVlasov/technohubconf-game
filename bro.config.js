const pkg = require('./package')

module.exports = {
  apiPath: 'stubs/api',
  webpackConfig: {
    output: {
      publicPath: `/static/${pkg.name}/${process.env.VERSION || pkg.version}/`
    }
  },
  /* use https://admin.bro-js.ru/ to create config, navigations and features */
  navigations: {
    'technohubconf-game.main': '/technohubconf-game',
    'link.technohubconf-game.auth': '/auth'
  },
  features: {
    'technohubconf-game': {
      // add your features here in the format [featureName]: { value: string }
    },
  },
  config: {
    'technohubconf-game.api': '/api'
  },
  // Путь к кастомному HTML-шаблону prom-режима (оставьте undefined чтобы использовать дефолт)
  htmlTemplatePath: undefined
}
