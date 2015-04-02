var app = require('express').Router();
var cont = require('nftrace-controller');
var ps = require('ps-nodejs');

    cont.getCurrentSessions(function(err, out){
      if(err){
        sessionsError = 'no running sessions';
        return;
      }
      sessions = out.command.output[0].sessions[0].session;
      if(sessions){
        var i = 0;
        getBetterSessionInfo(i);

        function getBetterSessionInfo(i){
          if(i === sessions.length){
            return;
          }
          var thingy = sessions[i];
          cont.getSessionInfo(thingy.name[0], function(err, out){
            if(err){
              return;
            }
            //access events with
            // sessions[i].domains[0].domain[0].channels[0].channel[0].events[0].event
            sessions[i] = out.command.output[0].sessions[0].session[0];
            getBetterSessionInfo(++i);
          });
        }
      }
    });

/* GET home page. */
app.get('/', function(req, res, next) {
  var processes = false, 
      processesError = false, 
      kernel = false, 
      kernelError = false,
      sessions = false,
      sessionsError= false;
  getUserlandEvents();

  function getUserlandEvents(){
    cont.listUserlandEvents(function(err, out){
      if(err){
        processesError = 'Problem listing userland tracepoints';
        return;
      }

      if(out.command.output[0].domains[0].domain[0].pids[0] === ''){
        processesError = 'No running userland processes have tracepoints';
        getKernelEvents();
        return;
      }

      processes = out.command.output[0].domains[0].domain[0].pids[0].pid;
      getProcessInfo(0);
      function getProcessInfo(i){
        if(processes.length && i === processes.length){
          getKernelEvents();
          return;
        }
        var proc = processes[i];
        proc.events = proc.events[0].event;
        ps.lookup({name: proc.name[0], psargs: 'u'}, function(err, resultList){
          if (err) {
            processesError = 'Problem getting pids on running processes';
            getKernelEvents();
            return;
          }
          proc.args = resultList.filter(function(element){
            return element.pid == proc.id[0];
          })[0].arguments; //select the first element of the filtered array.
          processes[i] = proc;
          getProcessInfo(++i);
        });
      }
      return;
    });
  }

  function getKernelEvents(){
    cont.listKernelEvents(function(err, out){
      if(err){
        kernelError = 'Problem listing kernel tracepoints, ' +
                      'is lttng-sessiond running as root?';
        getCurrentSessions();
        return;
      }
      kernel = out.command.output[0].domains[0]
                            .domain[0].events[0].event;
      getCurrentSessions();
    });
    return;
  }

  function getCurrentSessions(){
    cont.getCurrentSessions(function(err, out){
      if(err){
        sessionsError = 'no running sessions';
        finish();
        return;
      }
      sessions = out.command.output[0].sessions[0].session;
      if(sessions){
        for(var i = 0; i < sessions.length; i++){
          var thingy = sessions[i];

        }
      }
      finish();
    });
  } 

  function finish(){
    var out =  {
      title: 'nftrace controller',
      processes: processes,
      processesError: processesError,
      kernelTracepoints: kernel,
      kernelError: kernelError,
      sessions: sessions,
      sessionsError: sessionsError
    };
    console.log(out);
    res.render('index', out);
  }
  
});

app.get('/startTracing', function(req, res, next) {
  var session = req.query.session;

  // create the session
  cont.createSession(session, function(err){
    if(err){
      return finishUnsuccessfully();
    }
    doKernelTps();
  });

  // the functions below enable events on the tracing session
  function doKernelTps(){
    if(req.query.kernelTps){
      var tps = req.query.kernelTps;
      var i = 0;
      doTp(0);

      function doTp(index){
        var tp = tps[index++];
        cont.enableKernelEvent(session, tp, function(err){
          if(err){
            return finishUnsuccessfully();
          }
          if(index === tps.length){
            doIndividualTps();
          } else {
            doTp(index);
          }
        });
      }
    } else {
      doIndividualTps();
    }
  }
  function doIndividualTps(){
    if(req.query.individualProcessTps){
      var tps = req.query.individualProcessTps;
      var i = 0;
      doTp(0);

      function doTp(index){
        var tp = tps[index++].split(';');
        cont.enableUserlandEvent(session, tp[0], tp[1], function(err){
          if(err){
            return finishUnsuccessfully();
          }
          if(index === tps.length){
            doEntireProcesses();
          } else {
            doTp(index);
          }
        });
      }
    } else {
      doEntireProcesses();
    }
  }
  function doEntireProcesses(){
    if(req.query.processes){
      var tps = req.query.processes;
      var i = 0;
      doTp(0);

      function doTp(index){
        var tp = tps[index++];
        cont.enableUserlandEvent(session, '-a', tp, function(err){
          if(err){
            return finishUnsuccessfully();
          }
          if(index === tps.length){
            doCustomTps();
          } else {
            doTp(index);
          }
        });
      }
    } else {
      doCustomTps();
    }
  }
  function doCustomTps(){
    if(req.query.customTracepoints){
      var tps = req.query.customTracepoints;
      var i = 0;
      doTp(0);

      function doTp(index){
        var tp = tps[index++];
        cont.enableUserlandEvent(session, tp, function(err){
          if(err){
            return finishUnsuccessfully();
          }
          if(index === tps.length){
            finishSuccessfully();
          } else {
            doTp(index);
          }
        });
      }
    } else {
      finishSuccessfully();
    }
  }

  // the following starts the session and returns true to the client
  function finishSuccessfully(){
    cont.start(session, function(err){
      if(err){
        return finishUnsuccessfully();
      }
      res.send(true);
    })
  }

  function finishUnsuccessfully(){
    res.send(false);
  }
});

app.get('/stopTracing', function(req, res, next) {
  var session = req.query.session;
  cont.stop(session, function(err){
    cont.destroy(session, function(err){
      if(err){
        return res.send(false);
      }
      res.send(true);
    })
  });
});

module.exports = app;
