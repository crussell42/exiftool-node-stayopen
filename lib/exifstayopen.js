//Very simple exiftool wrapper in node.
//load time is the bottleneck with exiftool
//So here is a very raw, very lame attempt at using the stay_open option of exiftool.

var fs = require('fs');
var Promise = require('bluebird');
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

    //Lame implementation that would grow massive over any significant time
    //As output comes in, the {readyNUM} is analyzed and output from exiftool
    //is placed in gobs[NUM] then gobCb[NUM](gobs[NUM],NUM) is called
    var outCount=0;
    var callCount = -1;    
    var gob = '';

    var childStderrStr = '';    

    //Objects used to store output and callback.
    //All properties of the form 'r'+count.
    //This is really a lame replacement for use of an array but 
    //I want to be able to search by name and not number.
    //Note the use of delete gobArray['r42']
    
    var gobArray = {};
    var cbArray = {};
    


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
		    ref = 'r'+readyNumStr;

		    var rawOut = gob.slice(0,ndx);		    
		    var rawObj = JSON.parse(rawOut)[0];
		    if (childStderrStr.length>0) {
			//Impregnate any error stuffs
			rawObj.ErrorString = childStderrStr;
			childStderrStr = '';
		    }
		    		    
		    if (gobArray.hasOwnProperty(ref)) {
			console.log('OVERWRITING EXISTING OUTPUT FOR REFERENCE ['+ref+']');
		    }
		    gobArray[ref] = rawObj;
		    
		    var tmpGob = gobArray[ref];
		    if (verbose) console.log('hasOwnProperty ['+ref+']='+cbArray.hasOwnProperty(ref));
		    if (cbArray.hasOwnProperty(ref)) {
			//found callback
			//Gotta create a Promise for this so we can perform cleanup after 
			//completion e.g. Promise.then
			//originally cbArray[ref](tmpGob,ref);

			//simpler promise version that in theory can do the cleanup
			resolveOutput(ref).then(function(ref) {
			    if (verbose) console.log('CLEANUP ['+ref+'] BEFORE',exports.stats());
			    if (gobArray.hasOwnProperty(ref)) {delete gobArray[ref];};
			    if (cbArray.hasOwnProperty(ref)) {delete cbArray[ref];};
			    if (verbose) console.log('CLEANUP ['+ref+'] AFTER',exports.stats());
			});
		    } else {
			console.log('UNABLE TO FIND CALLBACK FOR REFERENCE ['+ref+']');
		    }
		    gob = gob.substring(ndx+endNdx+2);

		    outCount++;
		} else break;
	    }
	});

    }

    function resolveOutput(ref) {
	return new Promise(function(fulfill,reject) {
	    try {
		tmpGob = gobArray[ref];
		cbArray[ref](tmpGob,ref);

		fulfill(ref);
	    } catch (ex) {
	       reject(ex);
	   }
	});
    }

    exports.stats = function() {
	gk = 'Output object keys:'+Object.keys(gobArray)+'\n';
	ck = 'Callback object keys:'+Object.keys(cbArray)+'\n';
	return(gk+ck);
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
	refStr = 'r'+''+callCount;
	if (verbose) console.log('sendCommands callback refStr ['+refStr+']');
	
	cbArray[refStr] = cb;
	if (verbose) console.log('sendCommands callback index ['+cbArray.hasOwnProperty(refStr)+']');
	
	cmds.unshift('-json'); //Really only makes sense....since we JSON.parse
	cmds.push(execString+'\n');
	if (verbose) console.log('Sending to exiftool:'+cmds[cmds.length-1].replace(/\n$/, ''));
	cmds.forEach(function(s) {
	    //File based version
	    //fs.appendFileSync('cmds.txt',s+'\n');

	    //Stdin version
	    child.stdin.write(s+'\n');	    
	});
	return(refStr);
	
    }




    
