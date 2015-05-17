var stream = require('stream');
var EventEmitter = require('events').EventEmitter;
var Io = require('socket.io');

function SocketioStream(server, wraparound){
  var io = Io.listen(server);

  io.on('connection', function(socket){
    var activeSessions = [];
    var connEvents = new EventEmitter();

    socket.on('viewTrace', function(data){
      var pt = new stream.PassThrough({objectMode: true});
      wraparound.viewTrace(data.session, pt);

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

    socket.on('stopTrace', function(data){
      connEvents.emit('stop'+data.session);
    });
  });
}

module.exports = SocketioStream;