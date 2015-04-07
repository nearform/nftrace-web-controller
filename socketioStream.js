var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var cont = require('nftrace-controller');
var Io = require('socket.io');

function SocketioStream(server){

  var io = Io.listen(server);

  io.on('connection', function(socket){
    console.log('connected');
    var activeSessions = [];
    var connEvents = new EventEmitter();

    socket.on('viewTrace', function(data){
      console.log(data.session);
      cont.useSession(data.session, function(err){
        if(err){
        
        }
        var pt = new stream.PassThrough({objectMode: true});
        cont.getEventStream(pt);
        activeSessions.push('nftraceSession' + data.session);

        pt.on('readable', function(){
          var chunk;
          while(null !== (chunk = pt.read())){
            socket.emit('traceData'+data.session, chunk);
          }
        });

        connEvents.once('stop'+data.session, function(){
          pt.destroy();
        })
      });
    
    });

    socket.on('stopTrace', function(data){
      connEvents.emit('stop'+data.session);
    });
  });
}

module.exports = SocketioStream;