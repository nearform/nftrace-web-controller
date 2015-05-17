var app = require('express').Router();

module.exports = function(wraparound){

  /* GET home page. */
  app.get('/', function(req, res, next) {
    var processesError, kernelError;
    wraparound.getActiveUserlandTracepoints(function(err, activeUserlandTracepoints){
      processesError = err;
      wraparound.getKernelTracepoints(function(err, kernelTracepoints){
        kernelError = err;
        wraparound.getCurrentLttngSessions(function(err, currentSessions){
          var out = {
            title: 'nftrace controller',
            processes: activeUserlandTracepoints,
            processesError: processesError,
            kernelTracepoints: kernelTracepoints,
            kernelError: kernelError,
            sessions: currentSessions,
            sessionsError: err
          }
  
          res.render('index', out);
        });
      });
    });
  });
  
  app.get('/createSession', function(req, res, next){
    req.query.individualProcessTps = req.query.individualProcessTps || [];
    req.query.processes = req.query.processes || [];
    req.query.customTracepoints = req.query.customTracepoints || [];
    req.query.kernelTps = req.query.kernelTps || [];
  
    var opts = {
        session: req.query.session,
        kernelTps: req.query.kernelTps,
        userlandTps: []
      };
  
    // setup userlandTps array
    req.query.individualProcessTps.forEach(function (element){
      // element is a string in the format 'name;pid'
      element = element.split(';');
      opts.userlandTps.push({name: element[0], pid: element[1]});
    });
    req.query.processes.forEach(function (element){
      // element is a pid of a process to enable all tracepoints on.
      opts.userlandTps.push({name: '-a', pid: element});
    });
    req.query.customTracepoints.forEach(function (element){
      // element is a tracepoint to enable, no pid.
      opts.userlandTps.push({name: element, pid: null});
    });

    wraparound.createSession(opts.session, function(success){
      if(!success){ 
        return finish(success);
      }
  
      doKernelTracepoints();
    });
  
    function doKernelTracepoints(){
      wraparound.enableKernelTracepoints(opts, function(success){
        if(!success){
          return finish(success);     
        }
  
        doUserlandTracepoints();
      });
    }
  
    function doUserlandTracepoints(){
       wraparound.enableUserlandTracepoints(opts, function(success){
        finish(success);
      });
    }
  
    function finish(success){
      if(!success){
        wraparound.destroyTracingSession(opts.session);
      }
      res.send(success);
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
