'use strict'

var winston = require('winston'),
    VError = require('verror'),
    path = require('path'),
    fs = require('fs')

require('winston-redis').Redis

class Logger {
  constructor(system){
    this.system = system
    this.winston = null // underlying winston logger
    var targets = []

    // create a transport for each target defined in config
    for (let tgt of Logger.config.targets){
      let transport = this._setTransport(tgt)
      if (transport != null){
        transport.on('error', (err) => {return}) // suppress errors when there's an error with the transport
        targets.push(transport)
      }
    }

    if (Logger.config.colors != null)
      winston.addColors(Logger.config.colors)

    this.winston = new winston.Logger({
      level: Logger.config.level || 'info', // default level is info
      transports: targets
    })
    this._write('debug', `${targets.length} log targets registered`, {system: this.system})
  }

  // internal method
  _write(level, msg, data){
    data = data || {}
    data.system = this.system
    this.winston.log(level, msg, data)
  }

  // dedicated methods for each level
  info(msg, data){
    this._write('info', msg, data)
  }

  warn(msg, data){
    this._write('warn', msg, data)
  }

  debug(msg, data){
    this._write('debug', msg, data)
  }

  // Logs an error
  // @err: VError instance or string
  // @data: additional data when err is a string, interpolated using winston syntax
  error(err, data){
    if (err instanceof VError){
      let stack = err.stack.substr(8),
          currentErr = err

      while (currentErr != null && typeof currentErr.cause === 'function'){
        currentErr = currentErr.cause()
        if (currentErr != null)
          stack += '\n  ' + currentErr.stack
      }
      this._write('error', stack)
    }
    else
      this._write('error', err, data)
  }

  // creates a transport for the given target
  _setTransport(target){
    let transport = null
    switch (target.type) {
      case 'stdout':
        transport = new winston.transports.Console({colorize: true})
        break
      case 'file':
        try {
            // make sure the path is valid. File may not exist but parent directory must.
            let stat = fs.statSync(path.dirname(target.path))
            if (stat.isDirectory())
              transport = new winston.transports.File({filename: target.path})
            else
              throw new Error(`${path.dirname(target.path)} is not a directory.`)
        }
        catch(err){
          console.log(`Cannot use file ${target.path}: ${err.message}`)
        }
        break
      case 'redis':
        transport = new winston.transports.Redis({
          host: target.host,
          port: target.port,
          container: target.key
        })
        break
      default:
        console.log(`Unknown target ${target.path}`)
    }
    return transport
  }

  // Instanciates the logger class for the given system.
  // If no config is provided and internal config is not defined, default to sdtout.
  // @system: (string) the logger system, e.g. the module using the logger
  // @config: (object, optional) logger configuration. Must be provided by the first logger of the application.
  static create(system, config){
    if (Logger.config == null)
      Logger.config = config || {targets: [{type: 'stdout'}]}
    return new Logger(system)
  }
}
module.exports = exports = Logger
