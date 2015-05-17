/*
 *  Wraparound.js
 *  
 *  This is a wraparound of the nftrace-controller, which
 *  will give and take better json for many common methods.
 *  Takes json objects, returns json objects into callbacks;
 *
 */

var cont = require('nftrace-controller');
var ps = require('ps-nodejs');
var through = require('through');
var async = require('async');
var pipesForActiveTraceSessions = {};

// getActiveUserlandTracepoints
// 
// Note: uses active in name because userland tracepoints only show up here if the 
// application they were compiled into is running on the host
//
// params: cb = callback
// this method runs the controller listUserlandEvents method
// and then returns the callback the output in more userfriendly
// format.
var getActiveUserlandTracepoints = function(cb){
  var activeUserlandTracepoints = false,
      processesError = false;

  // call the controller listUserlandEvents method, turn the return into a more user friendly
  // object
  cont.listUserlandEvents(function (err, out){
    if(err){
      processesError = 'Problem listing userland tracepoints';
      return cb(processesError, activeUserlandTracepoints);
    }

    // this will mean there is no running processess with active tracepoints.
    if(out.command.output[0].domains[0].domain[0].pids[0] === ''){
      processesError = 'No running userland processes have tracepoints';
      return cb(processesError, activeUserlandTracepoints);
    }

    activeUserlandTracepoints = out.command.output[0].domains[0].domain[0].pids[0].pid;

    if(activeUserlandTracepoints.length === 0){
      return cb(processesError, activeUserlandTracepoints);
    }

    // go through all the activeUserlandTracepoints, convert them to more user friendly
    // objects, and add extra information relevant to the process
    async.map(activeUserlandTracepoints, 
    function iterator(activeUserlandTracepoint, iteratorCb){
      activeUserlandTracepoint.events = activeUserlandTracepoint.events[0].event;

      // get extra relevant information for the object 
      // (helps when choosing the process to activate tracepoints on)
      ps.lookup({name: activeUserlandTracepoint.name[0], psargs: 'u'}, function psCb(err, resultList){
        if (err) {
          processesError = 'Problem getting pids on running processes';
          return iteratorCb(processesError, false);
        }
        // get the args that the process was initially run with.
        activeUserlandTracepoint.args = resultList.filter(function iterator(element){
          return element.pid == activeUserlandTracepoint.id[0];
        })[0].arguments; // select the first element of the filtered array.

        iteratorCb(processesError, activeUserlandTracepoint);
      });
    }, 
    cb);
  });
};

// getKernelTracepoints
//
// params: cb = callback
// this method runs the controller listKernelEvents method
// and then returns the callback the output in more userfriendly
// format.
var getKernelTracepoints = function(cb){
  var kernelTracepoints = false,
      kernelError = false;

  //fairly straightforward, just turning kernelTracepoints into a more user friendly object
    cont.listKernelEvents(function (err, out){
      if(err){
        kernelError = 'Problem listing kernel tracepoints, is lttng-sessiond running as root?';
        return cb(kernelError, kernelTracepoints);
      }

      kernelTracepoints = out.command.output[0].domains[0].domain[0].events[0].event;
      return cb(kernelError, kernelTracepoints);
    });
};

// getKernelTracepoints
//
// params: cb = callback
// this method runs the controller getCurrentLttngSessions method
// and then returns the callback the output in more userfriendly
// format.
var getCurrentLttngSessions = function(cb){
  var currentSessions = false,
      sessionsError = false;
  cont.getCurrentSessions(function (err, out){
      if(err){
        sessionsError = 'no running sessions';
        return cb(sessionsError, currentSessions);
      }      
      currentSessions = out.command.output[0].sessions[0].session;
      // Uhh... I swear I was planning on doing some cool stuff with the empty code block below!
      /*
      if(currentSessions){
        for(var i = 0; i < currentSessions.length; i++){
          var thingy = currentSessions[i];

        }
      }
      //*/
      return cb(sessionsError, currentSessions);
    });
};

var createSession = function(session, cb){
  cont.createSession(session, function (err, out){
    if(err){
      return cb(false);
    }
    return cb(true);
  });
};

var enableKernelTracepoints = function(opts, cb){
  if(!opts.kernelTps || opts.kernelTps.length === 0){
    return cb(true);
  }

  async.map(opts.kernelTps, 
    function iterator(kernelTp, cb){
      cont.enableKernelEvent(opts.session, kernelTp, cb);
    }, 
    function callback(err, results){
      if(err){ 
        return cb(false);
      }
      return cb(true);
    });
};

var enableUserlandTracepoints = function(opts, cb){
  if(!opts.userlandTps || opts.userlandTps.length === 0){
    return cb(true);
  }
  var tps = opts.userlandTps;
  async.map(tps, 
    function iterator(userlandTp, cb){
      cont.enableUserlandEvent(opts.session, userlandTp.name, userlandTp.pid, cb);
    }, 
    function callback(err, results){
      if(err){ 
        return cb(false);
      }
      return cb(true);
    });
};

var startTracing = function(session, cb){
  cont.start(session, function (err, out){
    if(err){
      return cb(false);
    }

    addPipeForSession(session);

    return cb(true);
  });
};

var stopTracing = function(session, cb){
  cont.stop(session, function (err, out){
    if(err){
      return cb(false);
    }
    pipesForActiveTraceSessions[session + 'pipe'] = null;
    return cb(true);
  });
};

var destroyTracingSession = function(session, cb){
  cont.destroy(session, function (err, out){
    if(err){
      return cb(false);
    }
    pipesForActiveTraceSessions[session + 'pipe'] = null;
    return cb(true);
  });
};

var viewTrace = function(session, ws){
  sessionIsActive(session, function(active){
    if(!active || !pipesForActiveTraceSessions[session + 'pipe']){
      // if session already exists & is active but there is no cached pipe for it, 
      // there may already be a viewer attached to it, 
      // and lttng only allows one viewer per active session,
      // therefore we must restart to get a clean new viewer, which we can cache.
      restartSession(session, doThePipe); 
    } else { // active && pipeExists
      doThePipe();
    }
  });

  // https://www.youtube.com/watch?v=wj23_nDFSfE
  var doThePipe = function(){
    //pipe cached pipe into writable stream
    pipesForActiveTraceSessions[session + 'pipe'].pipe(ws);
  }
}


module.exports = {
  getActiveUserlandTracepoints: getActiveUserlandTracepoints,
  getKernelTracepoints: getKernelTracepoints,
  getCurrentLttngSessions: getCurrentLttngSessions,
  createSession: createSession,
  enableKernelTracepoints: enableKernelTracepoints,
  enableUserlandTracepoints: enableUserlandTracepoints,
  startTracing: startTracing,
  stopTracing: stopTracing,
  destroyTracingSession: destroyTracingSession,
  viewTrace: viewTrace
};


// private utility methods
function addPipeForSession(session){
  // create a viewer and cache it... keep writing to it no matter who's listening.
    pipesForActiveTraceSessions[session + 'pipe'] = new through(function write(data) {
                                                                  this.emit('data', data);
                                                                },
                                                                function end() { //optional 
                                                                  this.emit('end');
                                                                });
    cont.getEventStream(pipesForActiveTraceSessions[session + 'pipe']);
    // I want the stream to keep streaming no matter what..  
    // no buffering - lower overhead - optimal for tracing
    pipesForActiveTraceSessions[session + 'pipe'].resume(); 
};

function restartSession(session, cb){
  stopTracing(session, function(status){
    startTracing(session, cb);
  });
};

function sessionIsActive(session, cb){
  getCurrentLttngSessions(function(err, currentSessions){
    var active = currentSessions.some(function(element){
        return (element.name[0] === session && element.enabled[0] === 'true');
    });
    console.log(active);
    cb(active);
  });
}
