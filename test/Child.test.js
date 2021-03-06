'use strict';
var expect = require('chai').expect
var Child = require('../helpers/Child')

var getNodeVersion = function(){
  return process.version.replace(/[a-z]+/gi,'').split('.')
}

describe('helpers/Child',function(){
  this.timeout(10000)
  describe('construction',function(){
    it('should construct without options',function(done){
      var child = Child.parent('./assets/Child')
      expect(child).to.be.an.instanceOf(Child)
      done()
    })
    it('should construct with options',function(done){
      var child = Child.parent('./assets/Child',{
        fork: {
          env: {'NODE_ENV': 'production'}
        }
      })
      expect(child).to.be.an.instanceOf(Child)
      expect(child.options.fork.env.NODE_ENV).to.equal('production')
      done()
    })
  })
  describe('lifecycle',function(){
    var child
    beforeEach(function(done){
      child = Child.parent('./assets/child')
      done()
    })
    afterEach(function(done){
      if('ok' === child.status()){
        child.stop(function(err){
          done(err)
        })
      } else done()
    })
    it('should start/stop',function(done){
      child.start(function(err){
        if(err) return done(err)
        child.stop(function(err){
          done(err)
        })
      })
    })
    it('should respawn',function(done){
      child.start(function(err){
        if(err) return done(err)
        child.on('respawn',function(pid){
          expect(pid).to.be.a('number')
          done()
        })
        //issue a kill so it will respawn
        child.cp.kill('SIGKILL')
      })
    })
    it('should gracefully not send messages to children',function(done){
      child.send('foo')
      done()
    })
    it('should ignore stopping a not running child',function(done){
      child.once('status',function(status){
        expect(status).to.equal('ready')
        done()
      })
      child.stop(function(err){
        if(err) done(err)
      })
    })
  })
  describe('one time',function(){
    it('should run once and quit',function(done){
      Child.fork('./assets/childOnce',function(err){
        done(err)
      })
    })
    it('should run once and be killed with a timeout',function(done){
      Child.fork('./assets/childOnceForever',{timeout: 500},function(err){
        expect(err).to.equal('Process timeout reached, killed')
        done()
      })
    })
  })
  describe('status',function(){
    var child
    beforeEach(function(done){
      child = Child.parent('./assets/child')
      done()
    })
    afterEach(function(done){
      if('ok' === child.status()){
        child.stop(function(err){
          done(err)
        })
      } else done()
    })
    it('should be ready',function(done){
      expect(child.status()).to.equal('ready')
      done()
    })
    it('should be starting',function(done){
      child.once('status',function(status){
        expect(status).to.equal('starting')
        child.once('status',function(status){
          expect(status).to.equal('ok')
          done()
        })
      })
      child.start(function(err){
        if(err) done(err)
      })
    })
    it('should be respawning',function(done){
      child.start(function(err){
        if(err) return done(err)
        child.once('status',function(status){
          expect(status).to.equal('respawn')
          child.once('status',function(status){
            expect(status).to.equal('starting')
            child.once('status',function(status){
              expect(status).to.equal('ok')
              done()
            })
          })
        })
        child.kill('SIGKILL')
      })
    })
    it('should be stopping',function(done){
      child.start(function(err){
        if(err) return done(err)
        child.once('status',function(status){
          expect(status).to.equal('stopping')
          child.once('status',function(status){
            expect(status).to.equal('ready')
            done()
          })
        })
        child.stop(function(err){
          if(err) done(err)
        })
      })
    })
  })
  describe('complex error handling',function(){
    it('should handle complex errors',function(done){
      var child = Child.parent('./assets/childError',{respawn: false})
      child.start(function(err){
        var majorVersion = getNodeVersion()[0]
        if(majorVersion >= 6){
          expect(err).to.match(/Error: foo\n/)
        } else {
          expect(err).to.equal('[Error: foo]')
        }
        child.stop(done)
      })
    })
    it('should handle complex errors on once',function(done){
      var child = Child.fork('./assets/childOnceError')
      child.start(function(err){
        var majorVersion = getNodeVersion()[0]
        if(majorVersion >= 6){
          expect(err).to.match(/Error: baz\n/)
        } else {
          expect(err).to.equal('[Error: baz]')
        }
        done()
      })
    })
  })
  describe('events',function(){
    var child
    beforeEach(function(done){
      child = Child.parent('./assets/child')
      child.start(function(err){
        done(err)
      })
    })
    afterEach(function(done){
      if('ok' === child.status()){
        child.stop(function(err){
          done(err)
        })
      } else done()
    })
    it('should pong',function(done){
      child.once('message',function(msg){
        expect(msg).to.equal('pong')
        done()
      })
      child.send('ping')
    })
    it('should exit',function(done){
      child.once('exit',function(code){
        expect(code).to.equal(0)
        done()
      })
      child.stop(function(err){
        if(err) done(err)
      })
    })
    it('should close',function(done){
      child.once('close',function(){
        done()
      })
      child.stop(function(err){
        if(err) done(err)
      })
    })
    it('should respawn',function(done){
      child.once('respawn',function(pid){
        expect(pid).to.be.a('number')
        done()
      })
      child.kill('SIGKILL')
    })
    it('should error',function(done){
      child.send('error')
      child.once('error',function(msg){
        expect(msg).to.equal('failed')
        done()
      })
      child.stop(function(err){
        if(!err) done('did not exit erroneously')
      })
    })
  })
})
