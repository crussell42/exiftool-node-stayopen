
    var exif = require(process.cwd()+'/lib/exifstayopen.js');

    function showOut(str,ndx) {
	console.log('output',ndx,'\n',str);
    }

    exif.start();

    var testFileName = process.cwd()+'/tests/resources/test.jpg';

    console.log('execute',exif.sendCommands(['-HierarchicalSubject','-json',testFileName],showOut));

    
    //Smoke test.
    //These seem to always work fine.
    //Only if we hit enter in rapid succession does the exiftool 
    //hit the race condition. Often times after some number of tries
    //The buffering or race seem to catchup with the commands sent to exiftool.
    for (var i=0;i<10;i++) {
	console.log('execute',exif.sendCommands(['-HierarchicalSubject','-json',testFileName],showOut));
    }
    //Error case
    console.log('execute',exif.sendCommands(['-HXXierarchicalSubject','-json',testFileName],showOut));


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
		console.log('execute',exif.sendCommands(['-HierarchicalSubject','-json',testFileName],showOut));
	    }
	}
    });    
    process.stdin.on('end', function() {
	process.stdout.write('end received on stdin');
	exif.stop();
    });

