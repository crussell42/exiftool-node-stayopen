//Very simple exiftool wrapper in node.
//load time is the bottleneck with exiftool
//So here is a very raw, very lame attempt at using the stay_open option of exiftool.

var fs = require('fs');

// Know Issues:
// When using the test program and waiting for stdin in parent process,
// if you hit enter key too fast the processes get out of sync.
// Not sure if it is a race or io buffering issue but it seems like
// exiftool is not always waiting on data on stdin.
//
// Tried sending commands to a file to see if that would fix the 
// race condition/stin/stdout buffering issue but I am leaning more toward exiftools ReadStayOpen method
// as the culprit.


//Uncomment to send commands to file. Stdout otherwise
//File based version
//    fs.unlinkSync('cmds.txt');
//    fs.appendFileSync('cmds.txt','\n');
//    var args = ['-stay_open','True','-@','cmds.txt'];

//Stdout version
    var args = ['-stay_open','True','-@','-'];

    var spawn = require('child_process').spawn;
    var childPath = '/usr/local/exiftool/exiftool';
    var child;
    var stopped = true;
    var verbose = false;

    //TODO refactor as stack or associative array. Get rid of globals.
    //ERROR Handling. associate child.stderr data with execute number.
    //Lame implementation that would grow massive over any significant time
    //As output comes in, the {readyNUM} is analyzed and output from exiftool
    //is placed in gobs[NUM] then gobCb[NUM](gobs[NUM],NUM) is called
    var outCount=0;
    var gobs = [];

    //each call to sendCommands will increment this and set up a callback for that number
    var callCount = -1;    
    var gob = '';
    var gobCb = [];

    var childStderrStr = '';    
    
    exports.setPath = function(str) {
	childPath = str;
    }
    exports.start = function() {
	if (!stopped) return;
	child = spawn(childPath,args);
	stopped=false;

	//Set up events
	child.on('exit',function(code,signal) {
	    if (verbose) console.log('Child process exited ['+code+'] ['+signal+']');
	    stopped = true;
	});
	child.stderr.on('data',function(chunk) {
	    if (verbose) console.log('\nEXIFTOOL STDERR:',chunk.toString());
	    childStderrStr +=chunk.toString();
	    //process.exit(2);
	});


	child.stdout.on('data',function(chunk) {
	    //console.log('OUTPUT:'+chunk);
	    gob += chunk;

	    //output ends with {ready42}
	    //May have multiple...to go through

	    while (true) {
		ndx = gob.indexOf("{ready");
		if (ndx>-1) {
		    
		    remain = gob.substring(ndx);
		    //console.log('remain:'+remain);
		    
		    endNdx = remain.indexOf("}\n");
		    //dont do anything until we get the closing }
		    if (endNdx<0) {
			//console.log('NO END');
			return;
		    }
		    readyNumStr = remain.substring(6,endNdx);
		    if (verbose) console.log('readyNumStr:'+readyNumStr);

		    var rawOut = gob.slice(0,ndx);		    
		    var rawObj = JSON.parse(rawOut)[0];
		    if (childStderrStr.length>0) {
			//Impregnate any error stuffs
			rawObj.ErrorString = childStderrStr;
			childStderrStr = '';
		    }
		    
		    gobs[outCount] = rawObj;
		    
		    var tmpGob = gobs[outCount];
		    gobCb[readyNumStr](tmpGob,readyNumStr);
		    gob = gob.substring(ndx+endNdx+2);
		    //2 here may be a problem because we cant actually guarantee that we got the '}\n'
		    
		    //console.log('NEW GOB:'+gob);
		    gobs[outCount] = '';
		    outCount++;
		} else break;
	    }
	});

    }

    exports.stop = function() {
	exports.sendCommands(['-stay_open','False'],function(str,ndx) {
	    //this callback never called
	    if (verbose) console.log('Stopping exiftool:',ndx,str);
	});
	//Not really stopped until last cb called which could be some time away if
	//the queue of requests is loaded up.
	//TODO manage stopped based on outCount and callCount
	stopped=true;
    }
    //Exit if child dies

    exports.isStoped = function() {
	return(stopped);
    }


    //Send an array of commands to exiftool. 
    //cb takes string  returned from exiftool stdout and index (or execute number) 
    //e.g. -execute42 sent in 
    //cb(buff,42) will get called when {ready42} comes accross exiftool stdout.
    exports.sendCommands = function(cmds,cb) {
	if (stopped) return;

	callCount++;
	execString = '-execute'+callCount;
	gobCb.push(cb);

	cmds.push(execString+'\n');
	if (verbose) console.log('Sending to exiftool:'+cmds);
	cmds.forEach(function(s) {
	    //File based version
	    //fs.appendFileSync('cmds.txt',s+'\n');

	    //Stdin version
	    child.stdin.write(s+'\n');	    
	});
	return(callCount);
	
    }




    
