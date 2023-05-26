'use strict'

const winston = require('winston'),
    VError = require('verror'),
    path = require('path'),
    fs = require('fs'),
    redis = require('redis')

const secretMgr = require('./aws-secrets.js')
const redisTransport = require('winston-redis')
const DataDogTransport = require('datadog-winston')

let redisClient
let _config // winston config object
let _transportPromises // array of promises for each transport

class Logger {
  constructor(system){
    this.system = system
    
    if (!Logger.quiet){
      let targetCount = Object.keys(Logger._winston.transports).length
      this._write('debug', `${targetCount} targets OK`, {system: this.system})
    }
  }

  // Promise that resolves when all transports are ready
  get ready(){
    return _transportPromises ? Promise.all(_transportPromises) : null
  }

  // internal method
  _write(level, msg, data){
    data = data || {}
    data.system = this.system

    try{
      Logger._winston.log(level, msg, data)
    }
    catch(ex){
      console.error('Logging error', ex)
    }
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
  // @err: Error/VError instance or string
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
      this._write('error', stack, data)
    }
    else
      this._write('error', err, data)
  }

  // creates a transport for the given target
  static _setTransport(target){
    let transport = null

    switch (target.type) {
      case 'stdout':
        transport = new winston.transports.Console({
          format: winston.format.combine(
            winston.format.json(),
            winston.format.colorize({
              colors: {info: 'cyan', debug: 'grey', warning: 'orange', error: 'red'},
              all: true
            })
          )
        })
        _transportPromises.push(Promise.resolve())
        break
      case 'file':
        try {
          // make sure the path is valid. File may not exist but parent directory must.
          let stat = fs.statSync(path.dirname(target.path))
          if (stat.isDirectory()){
            transport = new winston.transports.File({
              filename: target.path,
              format: winston.format.json()
            })
          }
          else
            throw new Error(`${path.dirname(target.path)} is not a directory.`)
          _transportPromises.push(Promise.resolve())
        }
        catch(err){
          console.log(`Cannot use file ${target.path}: ${err.message}`)
          _transportPromises.push(Promise.reject())
        }
        break
      case 'redis':
        // create our own redis client, to handle disconnects
        if (!redisClient)
          redisClient = setRedisClient(target.host)

        transport = new redisTransport({
          redis: redisClient,
          container: target.key
        })
        _transportPromises.push(Promise.resolve())
        break
      case 'datadog':
        // transport is set asynchronously
        _transportPromises.push(setupDataDog(target))
        break
      default:
        console.log(`Unknown target ${target.type}`)
    }

    if (transport){
      // console output only for transport errors.
      transport.on('error', (err) => {console.error(err)})
    }

    return transport
  }

  // creates underlying winston instance
  static _createWinston(config){

    _config = {
      level: config.level,
      transports: []
    }
    _transportPromises = []

    // creates a transport for each target defined in config
    for(let tgt of config.targets){
      const transport = Logger._setTransport(tgt)
      
      if (transport != null){
        _config.transports.push(transport)
      }
    }
    
    
    

    if (config.colors != null)
      winston.addColors(config.colors)

    Logger._winston = winston.createLogger(_config)
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
      Logger.quiet = typeof config.quiet === 'boolean' ? config.quiet : true      
      Logger._createWinston(config)
    }

    return new Logger(system)
  }
}
module.exports = exports = Logger


function setRedisClient(host){
  const [hostName, port] = host.split(':')

  redisClient = redis.createClient({
    host: hostName,
    port: +port
  })

  redisClient.on('connect', () => {
    console.log('connect')
  })

  redisClient.on('reconnecting', e => {
    console.log('reconnecting', e)
  })

  redisClient.on('error', ex => {
    console.warn('Redis error', ex)
  })

  return redisClient
}

// datadog transport needs to retrieve the apikey first.
// Function updates winston instances when transport is ready.
function setupDataDog(target){
  const opts = {
    hostname: target.hostname,
    service: target.service,
    ddsource: 'nodejs',
    format: winston.format.json(),
  }

  return new Promise(async (resolve, reject) => {
    try{
      // retrieve api key from secret manager
      if (target.secret){
        const secret = await secretMgr.getSecret(target.secret)
          if (typeof secret === 'object')
            opts.apiKey = secret.key
          else
            opts.apiKey = secret
      }
      else{
        return reject('No secret provided for datadog transport')
      }

      const transport = new DataDogTransport(opts)
      transport.on('error', (err) => {console.error(err)})

      _config.transports.push(transport)

      // reconfigures existing instance, or creates a new one
      if (Logger._winston)
        Logger._winston.configure(_config)
      else
        Logger._winston = winston.createLogger(_config)

      resolve()
    }
    catch(ex){
      reject(ex)
    }
  })
}
