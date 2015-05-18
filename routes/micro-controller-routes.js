var app = require('express').Router();
var through = require('through');
var forwarders = {};

module.exports = function(wraparound, createForwarder){
  app.get('/createSession', function(req, res, next){
    wraparound.createSession(opts.query.session, function(success){
      res.send(success);
    });
  });

  app.get('/enableTracepoint', function(req, res, next){
    req.query.pid = req.query.pid || null;
  
    var opts = {
      session: req.query.session
    }
    
    switch(opts.tpType){
      case "userland":
      case "u":
        opts.userlandTps = [{
          name: req.query.name,
          pid: req.query.pid      
        }]
        wraparound.enableUserlandTracepoints(opts, function(success){
          res.send(success);
        });
        break;

      case "kernel":
      case "k":
        opts.kernelTps = [{
          name: req.query.name   
        }]
        wraparound.enableKernelTracepoints(opts, function(success){
          res.send(success);
        });
        break;

      default:
        res.send(false);
        break;
    } 
  });
  
  app.get('/startTracing', function(req, res, next) {
    wraparound.startTracing(req.query.session, function(success){
      res.send(success);
    });
  });

  app.get('/forwardTraceSession', function(req, res, next) {
    var pipe = new through(function write(data) {
              this.emit('data', data)
            },
            function end () { //optional 
              this.emit('end')
            });

    wraparound.viewTrace(req.query.session, pipe);
    forwarders[req.query.session + 'forwarder'] = createForwarder(pipe);
    res.send(true);
  });

  app.get('/stopForwardTraceSession', function(req, res, next) {
    forwarders[req.query.session + 'forwarder'] = null;
    wraparound.stopViewingTrace(req.query.session, function(status){
      res.send(status);
    });
  });
  
  app.get('/stopTracing', function(req, res, next) {
    wraparound.stopTracing(req.query.session, function(success){
      res.send(success);
    });
  });
  
  app.get('/destroySession', function(req, res, next) {
    wraparound.destroyTracingSession(req.query.session, function(success){
      res.send(success);
    });
  });
  
  return app;
}
