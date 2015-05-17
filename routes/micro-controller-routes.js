var app = require('express').Router();

module.exports = function(wraparound){
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
