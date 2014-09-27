Infant [![Build Status](https://travis-ci.org/snailjs/infant.png?branch=master)](https://travis-ci.org/snailjs/infant)
============

Infant is a helper package that wraps some of the core node modules that are
used to provide child process and cluster support.

This package comes with two main helpers **Child** and **Cluster** which provide
enhanced functionality over the basic functionality that the core packages
provide.

Furthermore, Infant fixes some of the inherit problems with graceful startups
and shutdowns that are introduced using the raw node modules.

Finally, Infant can be used as a drop in replacement for `child_process` and
for `cluster`. Additionally there are simple helpers included to enhance
children to communicate with the master and provide in features such as:

* **Graceful Startup**
* **Graceful Shutdown**
* **Automatic Respawn**
* **Worker Recycling**

## Usage

### Child

#### Calling a child process that runs forever

**Parent**
```js
'use strict';
var parent = require('infant').parent

var errorHandler = function(err){
  console.error(err)
  process.exit()
}

//instantiate the child (same as require('x'))
var child = parent('./myscript')

//start the child
child.start(function(err){
  if(err) return errorHandler(err)
  console.log('Child started successfully')
  //stop the child
  child.stop(function(err){
    if(err) return errorHandler(err)
    console.log('Child stopped successfully')
  })
})
```
**Child**

```js
'use strict';
var child = require('infant').child

if(require.main === module){
  child(
    'mychild', //child process title
    function(done){
      //startup operations
      done()
    },
    function(done){
      //shutdown operations
      done()
    }
  )
}
```

#### Calling a child process that runs once

**Parent**
```js
'use strict';
var parent = require('infant').fork

var errorHandler = function(err){
  console.error(err)
  process.exit()
}

//run the child
parent('./myscript',function(err){
  if(err) return errorHandler(err)
  console.log('Child completed successfully')
})
```
**Child**

```js
'use strict';
var child = require('infant').childOnce

if(require.main === module){
  child(
    'mychild', //child process title
    function(done){
      //script operations
      done()
    }
  )
}
```

### Cluster

#### Cluster with basic workers

**Parent**

```js
'use strict';
var cluster = require('infant').cluster

var master = cluster('./mychild')

var errorHandler = function(err){
  console.error(err)
  process.exit()
}

master.start(function(err){
  if(err) return errorHandler(err)
  console.log('cluster started')
  master.stop(function(err){
   if(err) return erroHandler(err)
   console.log('cluster stopped')
  })
})
```

**Child**

```js
'use strict';
var http = require('http')

var server = http.createServer(req,res){
  res.end('foo')
})

server.listen(3000)
```

#### Cluster with enhanced workers

**Parent**

```js
'use strict';
var cluster = require('infant').cluster

var master = cluster('./mychild',{count: 4, enhanced: true})

var errorHandler = function(err){
  console.error(err)
  process.exit()
}

master.start(function(err){
  if(err) return errorHandler(err)
  console.log('cluster started')
  master.stop(function(err){
   if(err) return erroHandler(err)
   console.log('cluster stopped')
  })
})
```

**Child**

```js
'use strict';
var http = require('http')
var worker = require('infant').worker

var server = http.createServer(req,res){
  res.end('foo')
})

//setup the worker with advanced features
worker(server)

server.listen(3000)
```

## API Reference

### Child

#### Constructor

* module - Takes an argument similar to require
* options - Object of options
 * respawn - (boolean) defaults to true (restart the process on exit)

#### Child.prototype.status()

This function takes no arguments and returns the current status

**Status definitions**
* dead - Nothing running
* starting - Startup procedures
* stopping - Shutdown procedures
* ready - Process is ready to start
* ok - Process is running

#### Child.prototype.start(cb)

Takes only one argument, callback which is called `cb(err)` on process
startup completion. Errors bubble from the children.

#### Child.prototype.stop([timeout],cb)

Takes either a callback as the only parameter or a timeout in ms and a callback
which will shutdown the process without a kill timeout.

If timeout is omitted the process has an unlimited amount of time to shutdown.

#### Child.prototype.kill()

This function is sync and forecfully kills the child with no shutdown operations.

This is also called automatically on any running process during
`process.on('exit')`

#### Child.prototype.send(msg)

Send the child a message through the IPC. Takes any data type for msg
that can be serialized and passed to the child. The child receives the messagew
through the `process.on('message')` event.

#### Child.fork(module,options,cb)

This static function will execute a child that dies on completion of execution.
It is considered a one time child.

* module - file name to use (similar to require('x'))
* options - optional object of options
(Takes the same options as the constructor)
* cb - callback that is called when the child has completed `cb(err)`

#### Child.parent(module,options)

Shortcut for the main constructor

#### Child.child(title,start,stop)

This is a wrapper function for children to setup IPC communication for
graceful startup and shutdown.

* title - String that defines the process title
* start - Function that is called with a single parameter `done` which is a
callback that should be fired when started is complete, can be passed an error
as the only argument
* stop - Same as the start function, only used for shutdown.

#### Child.childOnce(title,exec)

This wrapper is similar to `Child.child` but is used to run processed that
run and exit (childOnce)

* title - String that defines the process title
* exec - Same as the `start` function in `Child.child`

#### Child Events

* status - emitted when the status changes, args: `status` the new status
* exit - emitted when the child exits, args: `code` the exit code of the child
* close - emitted when the child closes
* error - emitted during an error, args: `err` the error
* respawn - emitted when the process respawns, args: `pid` the pid of the
new process
* message - emitted when the child process sends a message, args: `msg` the
message sent by the child

### Cluster

#### Constructor

The constructor only arms the instance, it should also be noted that this
class must be a singleton since a master can only maintain a single instance
of the cluster module.

That is why it is not exposed as the default operator, use
`require('infant').cluster` instead which takes the same parameters as this
constructor.

* module - File name to execute for workers (same as require('x'))
defaults to `process.argv[1]`
* options - optional bbject of options defined below

**Options**
* enhanced - (boolean) default false, enable enhanced worker mode
* count - (number) number of workers to start, defaults to `os.cpus().length`
* maxConnections - (number) only available in enhanced mode, but will cause
a worker to be shutdown and a new one started (recycled) when the worker
achieves maxConnections.
* stopTimeout - (number) Timeout in `ms` to wait for workers to stop, defaults
to no timeout when in enhanced mode, however it defaults to `5000` in normal
mode.
* recycleTimeout - (number) Timeout in `ms` to wait for a worker to stop when
it is being recycled, similar to stopTimeout, defaults to `5000` and must be 
defined
* execArgv - (array) passed through to `cluster.setupMaster()` see the node
documentation
* silent - (boolean) passed through to `cluster.setupMaster()` see the node
documentation
* args - (array) passed through to `cluster.setupMaster()` see the node
documentation

#### Cluster.prototype.each(cb)

Execute a callback on each worker that are currently running.

* cb - This callback is executed `cb(worker)`

#### Cluster.prototype.send(msg)

Send each worker in the cluster the msg defined as `msg`

#### Cluster.prototype.fork()

Start a new worker which will be bootstraped with advanced features in
enhanced mode

#### Cluster.prototype.setupWorker(worker)

This is an internal function that is used to add enhanced functionality to
workers such as recycling.

#### Cluster.prototype.start(cb)

Start the cluster and call `cb(err)` when the cluster is online.


#### Cluster.prototype.respawn(worker,code,signal)

This is an internal function used to respawn workers on exit

#### Cluster.prototype.stop(db)

Stop the cluster and call `cb(err)` when the cluster if offline.

#### Cluster.prototype.kill(signal)

Kill all the workers with the given `signal` defaults to `SIGTERM`

#### Cluster.prototype.restart(cb)

Restart the cluster and call `cb(err)` when complete.

#### Cluster.setup(server)

Take an instance of the node HTTP server and wire to use enhanched features
with the master, this should only be called in the child.

It is aliased as `require('infant').worker`

## Changelog

### 0.5.0

* Initial release after extraction from oose.io
