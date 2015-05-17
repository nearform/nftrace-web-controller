var processes = [], individualProcessTps = [], kernelTps = [];
var numSessions = 0;

$('button#createSession').click(function(){
    var customTracepoints = $('textarea#customTracepoints').val();
    customTracepoints = customTracepoints.replace(/ /g, '');
    if(customTracepoints !== ''){
    	customTracepoints = customTracepoints.split(',');
    	customTracepoints = customTracepoints.filter(function(elem){
    		return elem !== '';
    	});
    } else {
    	customTracepoints = [];
    }
    var session = "nftraceSession"+numSessions
    var ajaxData = {
    	session: session,
    	processes: processes,
    	individualProcessTps: individualProcessTps.filter(function(elem){
    		return processes.indexOf(elem.split(';')[1]) < 0;
    	}),
    	kernelTps: kernelTps,
    	customTracepoints: customTracepoints
    }

    $.ajax({
    	url: "/createSession",
    	data: ajaxData,
    	success: function(data){
    		console.log(data);
    		if(data){
    			var text = '<div id="session' + session +'">\n' +
    					'<div class="panel panel-default">\n'+
    						'<div class="panel-heading">\n'+
    							'<h5> Session ' + session + '</h5>'+
    						'</div>\n'+
    						'<div class="panel-body">\n'+
                                '<div class="well well-sm" id="'+session+'status">'+
                                    'Stopped'+
                                '</div>'+
    							'<p>'+
    								'additional info to be put in here later...'+
    							'</p>\n'+
                                '<button class="btn btn-danger" type="submit" id="destroySession" data="' + session + '">Destroy tracing session</button>' +
                                '<button class="btn btn-warning" type="submit" id="startTracing" data="' + session + '">Start tracing session</button>' +
    						'</div>\n'+
    					'</div>\n'+
    				'</div>\n';
    			$('div#activeTraceSessions').append(text);
    			numSessions++;
    		}
            if($('div#noSessions').text() === 'No running sessions'){
                $('div#noSessions').remove();
            }
    		initSessionDiv();
    	}
    });
});

var socket = io();

initSessionDiv();

function initSessionDiv(){

    $('button#startTracing').click(function(){
        var session = $(this).attr("data");
        $.ajax({
            url: "/startTracing",
            data: {session: session},
            success: function(data){
                if(data){
                    //delete startTracing button
                    $('button#startTracing').filter(function(){
                        return $(this).attr("data") === session;
                    }).remove();
                    //set status to started
                    $('div#'+session+'status').html('Started');
                    //add buttons to view and stop the tracing
                    $('div#session'+session).find('.panel-body').append('<button class="btn btn-warning" type="submit" id="stopTracing" data="' + session + 
                    '">Stop tracing session</button><button class="btn btn-info" type="submit" id="viewTrace" data="' + session + 
                    '">View live tracing session</button>');
                    if($('div#viewevents').find('#viewtracepanel'+session).length){
                        var div = $('div#viewevents').find('#viewtracepanel'+session).find('.panel-heading');
                        div.append('<button class="btn btn-warning" type="submit" id="stopTracing" data="' + session + '">Stop tracing session</button>');
                    }
                    initSessionDiv();
                }
            }
        });
    });    

	$('button#stopTracing').click(function(){
		var session = $(this).attr("data");
        socket.emit('stopTracing', {session: session});
		$.ajax({
    		url: "/stopTracing",
    		data: {session: session},
    		success: function(data){
    			if(data){
                    $('div#'+session+'status').html('Stopped');
                    $('button#stopTracing').filter(function(){
                        return $(this).attr("data") === session;
                    }).remove();
                    $('button#viewTrace').filter(function(){
                        return $(this).attr("data") === session;
                    }).remove();
                    if($('div#viewevents').find('#viewtracepanel'+session).length){
                        var div = $('div#viewevents').find('#viewtracepanel'+session).find('.panel-heading');
                        div.append('<button class="btn btn-warning" type="submit" id="startTracing" data="' + session + '">Start tracing session</button>');
                    }
                    $('div#session'+session).find('.panel-body').append('<button class="btn btn-warning" type="submit" id="startTracing" data="' + session + 
                    '">Start tracing session</button>');
                    initSessionDiv();
                }
    		}
    	});
	});

    $('button#destroySession').click(function(){
        var session = $(this).attr("data");
        socket.emit('stopTracing', {session: session});
        $.ajax({
            url: "/destroySession",
            data: {session: session},
            success: function(data){
                if(data){
                    $('div#session'+session).remove();
                    //keep the deletion below to delete any stopTracing buttons on a viewTrace session
                    $('button#startTracing').filter(function(){
                        return $(this).attr("data") === session;
                    }).remove();
                    $('button#stopTracing').filter(function(){
                        return $(this).attr("data") === session;
                    }).remove();
                    $('button#destroySession').filter(function(){
                        return $(this).attr("data") === session;
                    }).remove();
                    if($('div#activeTraceSessions').text().trim() === ''){
                        $('div#activeTraceSessions').html('<div id="noSessions">No running sessions</div>')
                    }
                }
            }
        });
    });

	$('button#viewTrace').click(function(){

        $('button#viewTrace').remove();
        var session = $(this).attr("data");
		var div = $('div#viewevents').find('#viewtracepanel'+session);
        if(!div.length){
            div = $('div#viewevents');
            div.append('<div class="panel panel-default" id="viewtracepanel'+session+'"><div class="panel-heading"><h5>Trace view for session '+
                    session+'</h5> <button class="btn btn-danger" type="submit" id="destroySession" data="' + session + 
                    '">Destroy tracing session</button><button class="btn btn-warning" type="submit" id="stopTracing" data="' + session + 
                    '">Stop tracing session</button></div><div class="panel-body fixed-panel" id="viewtrace' + session + '"></div></div>');
        }
		
        socket.emit('viewTrace', {session: session})

		socket.on('traceData'+session, function(data){
            console.log(data);
            var div = $('div#viewtrace' + session);
            var output = '<p><strong>Host</strong>: ' + data.host + '. <strong>Tracepoint</strong>: ' + data.tracepoint 
                        + '. <strong>CPU</strong>: ' + data.cpu_id + ' <strong>Time</strong>: ' + data.time 
                        + '. <p class="indent">';
            var info = Object.keys(data.eventData[0]);
            info.forEach(function(elem){
                output += '<strong>' + elem + '</strong>: ' + data.eventData[0][elem] + '. ';
            });
            output += '</p></p>'
			div.append(output);
            $('div#viewtrace' + session).scrollTop($('div#viewtrace' + session)[0].scrollHeight);
		});
        initSessionDiv();
	});
}


$('input#procCheck').change(function(){
	var data = $(this).attr("data");
	if($(this).is(":checked")){
		processes.push(data);
	} else {
		processes = processes.filter(function(elem){
			return elem !== data;
		});
	}
});

$('input#procTPCheck').change(function(){
	var data = $(this).attr("data");
	if($(this).is(":checked")){
		individualProcessTps.push(data);
	} else {
		individualProcessTps = individualProcessTps.filter(function(elem){
			return elem !== data;
		});
	}
});

$('input#kernelTP').change(function(){
	var data = $(this).attr("data");
	if($(this).is(":checked")){
		kernelTps.push(data);
	} else {
		kernelTps = kernelTps.filter(function(elem){
			return elem !== data;
		});
	}
});