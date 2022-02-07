# swaven-logger
Logging utility built over Winston

Provides a simple interface to log to stdout, file or redis.

## Usage

````
var mainLogger = require('swn-logger').create('my-project', config),
    logger2 = require('swn-logger').create('subsystem')

mainLogger.info('Error')
````

## API

### `create(system, [config])`

Instanciates a logger for the given system.

##### Parameters:

**system** `string`, mandatory. The name of the logger.

**config** `object`. Logger configuration. Only needed for the first logger created for the application.  
Properties:  
- `level`:
Possible values:`debug`, `info`, `warn`, `error`. Required level for events to be written. Events below this level are ignored. Defaults to `debug`.

- `targets`: Array of object. Defines log targets.  
Properties:  
  - `type`: Possible values: `stdout`, `file`, `redis`. Output destination,
  - `path`: for file logging, path to the log file relative to current folder,
  - `host`, `port`: for redis logging, connection details to the target redis instance. `port` is ignored if `host` contains both, separated by colon `:`,
  - `key`: for redis logging, which key is used to store the event.


- `colors`: object. Define alternate colors for stdout output. Each key is a log level, value is the associated color.
- `quiet`: boolean. Set to false to output system registration message. Default: true.

### `debug(msg, [data])`
### `warn(msg, [data])`
### `info(msg, [data])`

Logs an event with the appropriate level.

##### Parameters:

**msg** `string`. Event message

**data** `object`. Optional data, serialized and added to the event.

### `error(err, [data])`

Logs an error.

##### Parameters:

**err** `string`, `Error` or `VError`. Error to log. If is an instance of Error or VError, the stack trace is logged. See [VError](https://github.com/joyent/node-verror) for more details.

**data** `object`. Optional data, added to event if `msg` is a string.


### Configuration example

````javascript
var config = {
  level: 'debug',
  targets: [
    {
      type: 'stdout'
    },
    {
      type: 'file',
      path: 'trace.log'
      },
    {
      type: 'redis',
      host: '127.0.0.1:6379',
      key: 'test'
    }
  ]
}

var logger = require('swn-logger').create('test1', config)
````

# Notes

- the old redis dev dependency is necessary for winston-redis.

