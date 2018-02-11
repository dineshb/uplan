const Promise = require('bluebird')

/* global wiki */

module.exports = Promise.join(
  wiki.db.onReady,
  wiki.configSvc.loadFromDb(['features', 'git', 'logging', 'site', 'uploads'])
).then(() => {
  const path = require('path')

  wiki.REPOPATH = path.resolve(wiki.ROOTPATH, wiki.config.paths.repo)
  wiki.DATAPATH = path.resolve(wiki.ROOTPATH, wiki.config.paths.data)
  wiki.UPLTEMPPATH = path.join(wiki.DATAPATH, 'temp-upload')

  // ----------------------------------------
  // Load global modules
  // ----------------------------------------

  wiki.lang = require('i18next')

  // ----------------------------------------
  // Localization Engine
  // ----------------------------------------

  const i18nBackend = require('i18next-node-fs-backend')
  wiki.lang.use(i18nBackend).init({
    load: 'languageOnly',
    ns: ['common', 'admin', 'auth', 'errors', 'git'],
    defaultNS: 'common',
    saveMissing: false,
    preload: [wiki.config.lang],
    lng: wiki.config.lang,
    fallbackLng: 'en',
    backend: {
      loadPath: path.join(wiki.SERVERPATH, 'locales/{{lng}}/{{ns}}.yml')
    }
  })

  // ----------------------------------------
  // Start Queues
  // ----------------------------------------

  const Bull = require('bull')
  const autoload = require('auto-load')

  let queues = autoload(path.join(wiki.SERVERPATH, 'queues'))

  for (let queueName in queues) {
    new Bull(queueName, {
      prefix: `q-${wiki.config.ha.nodeuid}`,
      redis: wiki.config.redis
    }).process(queues[queueName])
  }

  // ----------------------------------------
  // Shutdown gracefully
  // ----------------------------------------

  process.on('disconnect', () => {
    process.exit()
  })
})