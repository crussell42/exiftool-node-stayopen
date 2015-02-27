# exiftool-node-stayopen
Node wrapper for exiftool in stay_open mode.

This little program makes use of 
Phil Harvey's excelent exiftool 
http://www.sno.phy.queensu.ca/~phil/exiftool/
to read tags or meta data from media files such as .jpg or .mov

The intent is to spawn exiftool using the -stay_open -@ - flags
then send some number of commands over time and get the results.
The load time on exiftool is a real bottleneck to spawning it everytime
you want to extract or write some tags.

This package is anything but stable or complete but seems to work fairly well.
The hack of using ever expanding arrays to manage the data returned, and the 
callbacks to use with that data are silly and dangerous at best. 
This has been corrected and I now use an object for data storage, an object for storage of the callbacks and promises to allow cleanup of data and callback after they are called.

As with any ipc dealing with stdin and stdout of a child process I have managed
to find some race conditions or io buffer not flushing properly issues.

In particular, if you run tests/test.js it does a quick smoke test then settles in to reading 
process.stdin. Each time you press Enter, if you didnt enter the string 'quit', sendCommands is called.
It works great as long as you dont hold down the enter key for too long.
If you do, either the node side or the exiftool side can get out of sync. If you slow down it may well correct itsself. All the commands and output seem to be there it is just as though exiftool gets 
behind on reading its stdin. Any help on this issue would be appreciated. Phil?

___Test___
```
npm install
node tests/test.js
```

___Usage___
```
var exif = require(process.cwd()+'/lib/exifstayopen.js');

exif.setPath('/usr/local/exiftool/exiftool');
exif.start();

myFile = process.cwd()+'/tests/resources/test.jpg';
function mycallback(str,index) {
  console.log('output',index,str);
  exif.stop();
}
exif.sendCommands(['-HierarchicalSubject',myFile],mycallback);
```
___Output___
```
output 0 { SourceFile: '/Users/chris/exiftool-node-stayopen/tests/resources/test.jpg',
  HierarchicalSubject: 
   [ 'Events|Photo Shoot',
     'People|Chris',
     'Places|Austin',
     'Places',
     'People',
     'Events',
     'TestTextEntry',
     'TestTextEntry|This is test text',
     'PorkChop',
     'PorkChop|OfLove',
     'PorkChop|OfLove|Girl' ] }

```
sendCommands returns the index of the execute statement sent to exiftool.
sendCommands maintains a incrementing count each time it is called.
This index is used to associate the appropriate callback call with the data returned
from exiftool.

e.g. if sendCommands sends 'execute42' to exiftool, sendCommands will return 42.
```
console.log('execute',sendCommands(['-MyTagToExtract',myJpg],myCallback));
==> execute 42
```
Note that output is an json object.
The -json argument is automatically added every time you call sendCommands.
It will contain a member 'ErrorString' if exiftool wrote anything to stderr during processing.
The output should always contain member SourceFile.





