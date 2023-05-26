var VError = require('verror')
var config = {
  level: 'debug',
  // quiet: false,
  targets: [
    {type: 'stdout'},
    // {type: 'file', path: 'trace.log'},
    // {type: 'redis', host: '127.0.0.1:6379', key: 'test'}
    {
      type: 'datadog',
      service: 'apex-45',
      hostname: 'local-dev',
      secret: 'prd-datadog-wtb-api-key'
    }
  ]
}

const Logger = require('../index.js')

var logger = Logger.create('test1', config)
var logger2 = Logger.create('test2')

logger.ready.then(() => {
  console.log('logger ready')

  logger.info('pouet', {foo: 'bar', ts: 125})
  logger.info({foo: 'bar', ts: 125, msg:'json message'})
  logger2.warn('coin')
  logger2.debug('debug message')
  logger.error('argh')
  logger.error(new Error('error !'), {meta: 'baz'})
  logger.error(new VError('verror !'))
  
})

