var express = require('express');
var http = require('http');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var wraparound = require('./controller-wraparound/wraparound');

module.exports = function MicroController(controllerPort, forwarderPort){
	var app = express();
	
	app.set('port', controllerPort);
	
	// view engine setup
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'hbs');
	require('./config/helper.js');
	
	// uncomment after placing your favicon in /public
	//app.use(favicon(__dirname + '/public/favicon.ico'));
	app.use(logger('dev'));
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: false }));

	function createForwarder(stream){
		return new forwarder(forwarderPort, '0.0.0.0', stream);
	}

	var microControllerRoutes = require('./routes/micro-controller-routes.js')(wraparound, createForwarder);
	
	app.use('/', microControllerRoutes);
	
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

	return app;
}