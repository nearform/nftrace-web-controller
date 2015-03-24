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
	$('button#stopTracing').click(function(){
		var sess = $(this).attr("data");
		$.ajax({
    		url: "/stopTracing",
    		data: {session: 'nftraceSession' + sess},
    		success: function(data){
    			console.log(data);
    			if(data){
    				$('div#session'+sess).remove();
    			}
    		}
    	});
	});

	$('button#viewTrace').click(function(){
		var div = $('div#viewevents');
		div.append();
		var socket = io();
		socket.on('data', function(data){
			console.log(data);
			div.append(data.name+"\n<br>");
		});
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