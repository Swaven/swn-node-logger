var VError = require('verror')
var config = {
  level: 'debug',
  targets: [
    {type: 'stdout'},
    {type: 'file', path: 'trace.log'},
    {type: 'redis', host: '127.0.0.1', port: 6381, key: 'test'}
  ]
}
var logger = require('swn-logger').create('test1', config)
var logger2 = require('swn-logger').create('test2')

logger.info('pouet')
logger2.info('coin')
logger.error('argh')
logger.error(new Error('error !'))
logger.error(new VError('verror !'))
logger.error('error', {w: 'world'})
