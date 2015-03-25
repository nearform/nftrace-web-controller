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

    var ajaxData = {
    	session: "nftraceSession"+numSessions,
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
    			var text = '<div id="session' + numSessions +'">\n' +
    					'<div class="panel panel-default">\n'+
    						'<div class="panel-heading">\n'+
    							'<h5> Session ' + numSessions + '</h5>'+
    						'</div>\n'+
    						'<div class="panel-body">\n'+
    							'<p>'+
    								'additional info to be put in here later...'+
    							'</p>\n'+
    							'<button class="btn btn-danger" type="submit" id="stopTracing" data="' + numSessions + '">Stop tracing session</button>' +
    							'<button class="btn btn-info" type="submit" id="viewTrace" data="' + numSessions + '">View tracing session</button>' +
    						'</div>\n'+
    					'</div>\n'+
    				'</div>\n';
    			$('div#activeTraceSessions').append(text);
    			numSessions++;
    		}
    		initSessionDiv();
    	}
    });
});

function initSessionDiv(){
    var socket;

	$('button#stopTracing').click(function(){
		var sess = $(this).attr("data");
		$.ajax({
    		url: "/stopTracing",
    		data: {session: 'nftraceSession' + sess},
    		success: function(data){
    			console.log(data);
    			if(data){
    				$('div#session'+sess).remove();
                    $('div#viewtracepanel'+sess).remove();
    			     if(socket){
                        socket.disconnect();
                     }
                }
    		}
    	});
	});

	$('button#viewTrace').click(function(){
        var sess = $(this).attr("data");
		var div = $('div#viewevents');
		div.append('<div class="panel panel-default" id="viewtracepanel'+sess+'"><div class="panel-heading"><h5>Trace view for session '+
                    sess+'</h5> <button class="btn btn-danger" type="submit" id="stopTracing" data="' + sess + 
                    '">Stop tracing session</button></div><div class="panel-body fixed-panel" id="viewtrace' + sess + '"></div></div>');
		socket = io({forceNew: true});
		socket.on('data', function(data){
            var div = $('div#viewtrace' + sess);
			console.log(data);
            var output = '<p>Host: ' + data.host + '. Tracepoint: ' + data.name + '. CPU: ' + data.cpuId + ' Time: ' + data.time + '. <p class="indent">';
            var info = Object.keys(data.eventData);
            info.forEach(function(elem){
                output += elem + ': ' + data.eventData[elem] + '. ';
            });
            output += '</p></p>'
			div.append(output);
             $('div#viewtrace' + sess).scrollTop($('div#viewtrace' + sess)[0].scrollHeight);
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