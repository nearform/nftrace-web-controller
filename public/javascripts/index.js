var processes = [], individualProcessTps = [], kernelTps = [];
var numSessions = 0;

$('button#startTracing').click(function(){
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
    	url: "/startTracing",
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
    							'<p>'+
    								'additional info to be put in here later...'+
    							'</p>\n'+
    							'<button class="btn btn-danger" type="submit" id="stopTracing" data="' + session + '">Stop tracing session</button>' +
    							'<button class="btn btn-info" type="submit" id="viewTrace" data="' + session + '">View tracing session</button>' +
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

var socket, socketInit = false;

initSessionDiv();

function initSessionDiv(){

    if(!socketInit){
        socket = io();
    }

	$('button#stopTracing').click(function(){
		var session = $(this).attr("data");
		$.ajax({
    		url: "/stopTracing",
    		data: {session: session},
    		success: function(data){
    			if(data){
    				$('div#session'+session).remove();
                    $('button#stopTracing').filter(function(){
                        return $(this).attr("data") === session;
                    }).remove();
                    if($('div#activeTraceSessions').text().trim() === ''){
                        $('div#activeTraceSessions').html('<div id="noSessions">No running sessions</div>')
                    }
                    socket.emit('stopTrace', {session: session});
                }
    		}
    	});
	});

	$('button#viewTrace').click(function(){

        $('button#viewTrace').remove();
        var session = $(this).attr("data");
		var div = $('div#viewevents');
		div.append('<div class="panel panel-default" id="viewtracepanel'+session+'"><div class="panel-heading"><h5>Trace view for session '+
                    session+'</h5> <button class="btn btn-danger" type="submit" id="stopTracing" data="' + session + 
                    '">Stop tracing session</button></div><div class="panel-body fixed-panel" id="viewtrace' + session + '"></div></div>');

        socket.emit('viewTrace', {session: session})

		socket.on('traceData'+session, function(data){
            var div = $('div#viewtrace' + session);
            var output = '<p>Host: ' + data.host + '. Tracepoint: ' + data.name + '. CPU: ' + data.cpuId + ' Time: ' + data.time + '. <p class="indent">';
            var info = Object.keys(data.eventData);
            info.forEach(function(elem){
                output += elem + ': ' + data.eventData[elem] + '. ';
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