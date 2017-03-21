'use strict'

var winston = require('winston'),
    VError = require('verror'),
    path = require('path'),
    fs = require('fs')

require('winston-redis').Redis

class Logger {
  constructor(system){
    this.system = system
    var targetCount = Object.keys(Logger._winston.transports).length
    this._write('debug', `${targetCount} targets OK`, {system: this.system})
  }

  // internal method
  _write(level, msg, data){
    data = data || {}
    data.system = this.system
    Logger._winston.log(level, msg, data)
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
  // @data: (object, optional) additional data when err is a string
  error(err, data){
    var isVError = err instanceof VError

    if (isVError || err instanceof Error){
      let stack = err.stack.substr(isVError ? 8: 7),
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
  static _setTransport(target){
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

  // creates underlying winston instance
  static _createWinston(config){
    var targets = []

    // creates a transport for each target defined in config
    for (let tgt of config.targets){
      let transport = Logger._setTransport(tgt)
      if (transport != null){
        transport.on('error', (err) => {return}) // suppress transport errors
        targets.push(transport)
      }
    }

    if (config.colors != null)
      winston.addColors(config.colors)

    Logger._winston = new winston.Logger({
      level: config.level,
      transports: targets
    })
  }

  // Instanciates the logger class for the given system.
  // If no config is provided and internal config is not defined, default to sdtout, debug level.
  // @system: (string) the logger system, e.g. the module using the logger
  // @config: (object, optional) logger configuration. Must be provided by the first logger of the application.
  static create(system, config){
    if (Logger._winston == null){
      // set default config if not provided
      config = config || {
        level: 'debug',
        targets: [{type: 'stdout'}]
      }
      Logger._createWinston(config)
    }

    return new Logger(system)
  }
}
module.exports = exports = Logger
