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

- `targets`: Array of object. Defines log targets. Supported properties:  

  name | type | mandatory* | transport | description
  -|-|-|-|-
  type | string | ✓ | * | output destination: `stdout`, `file`, `redis`, `datadog`
  path | string| ✓ | file | path to file. folder must exist.
  host | string | ✓ | redis | redis host.
  port | string\|number | | redis | redis host port number. Can be ignored if `host` contains both, separated by colon `:`. 
  key | string | ✓ | redis | key used to store events.
  service | string | |  datadog | service name
  hostname | string || datadog | logger host name
  secret | string | ✓ | datadog | AWS secret id for datadog API key.

- `colors`: object. Define alternate colors for stdout output. Each key is a log level, value is the associated color.
- `quiet`: boolean. Set to false to output system registration message. Default: true.

(*) mandatory if using the relevant output target.

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
    },
    {
      type: 'datadog',
      hostname: 'test-instance', 
      service: 'foo',
      secret: 'aws-secret-id'
    }
  ]
}

var logger = require('swn-logger').create('test1', config)
````

# Notes

- Datadog apikey is retrieved asynchronously, and the transport is added async'ly too. Log messages before that will not be sent to datadog.
- the old redis dev dependency is necessary for winston-redis.

