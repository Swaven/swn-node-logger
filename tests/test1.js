var VError = require('verror')
var config = {
  level: 'debug',
  targets: [
    {type: 'stdout'},
    {type: 'file', path: 'trace.log'},
    {type: 'redis', host: '127.0.0.1:6379', key: 'test'}
  ]
}

const Logger = require('../index.js')

var logger = Logger.create('test1', config)
var logger2 = Logger.create('test2')

logger.info('pouet')
logger2.info('coin')
logger.error('argh')
logger.error(new Error('error !'))
logger.error(new VError('verror !'))

