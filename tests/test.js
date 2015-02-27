
    var exif = require(process.cwd()+'/lib/exifstayopen.js');

    function showOut(str,ndx) {
	console.log('output',ndx,'\n',str);
    }

    exif.start();

    var testFileName = process.cwd()+'/tests/resources/test.jpg';

    console.log('execute',exif.sendCommands(['-HierarchicalSubject',testFileName],showOut));

    
    //Smoke test.
    //These seem to always work fine.
    //Only if we hit enter in rapid succession does the exiftool 
    //hit the race condition. Often times after some number of tries
    //The buffering or race seem to catchup with the commands sent to exiftool.
    for (var i=0;i<10;i++) {
	console.log('execute',exif.sendCommands(['-HierarchicalSubject',testFileName],showOut));
    }
    //Error case
    console.log('execute',exif.sendCommands(['-HXXierarchicalSubject',testFileName],showOut));

    
    //Lets see how big our arrays are now
    console.log('STATS',exif.sendCommands(['-HierarchicalSubject',testFileName],function(str,ndx) {
	//ignore output of last command sent...just show remaining keys in objects
	//Note that cleanup of the currently executing callback wont complete until this is finished
	//so we will always see at least one key
	console.log(exif.stats());
    }));


    //Listen for keyboard activity. 
    //Fire off a request after each <Enter> pressed.
    //check for 'quit'
    process.stdin.setEncoding('utf8');    
    process.stdin.on('readable', function() {
	var chunk = process.stdin.read();
	if (chunk !== null) {
	    //process.stdout.write('data: ' + chunk);
	    if (chunk.indexOf('quit')>-1) {
		exif.stop();
		process.exit();
	    } else {
		console.log('execute',exif.sendCommands(['-HierarchicalSubject',testFileName],showOut));
	    }
	}
    });    
    process.stdin.on('end', function() {
	process.stdout.write('end received on stdin');
	exif.stop();
    });

