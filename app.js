var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var stream = require('stream');
var EventEmitter = require('events').EventEmitter;

var cont = require('nftrace-controller');
var routes = require('./routes/controller-routes.js')

var app = express();

var port = 3000;

app.set('port', port);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
require('./config/helper.js');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes)

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: err
  });
});

var server = http.createServer(app).listen(port);

var io = require('socket.io').listen(server);

io.on('connection', function(socket){
  console.log('connected');
  var activeSessions = [];
  var connEvents = new EventEmitter();

  socket.on('viewTrace', function(data){
    console.log(data.session);
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

  socket.on('stopTrace', function(data){
    connEvents.emit('stop'+data.session);
  });
});

console.log("Server listening on port " + port);