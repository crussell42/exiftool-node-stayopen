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
The hack of using ever expanding arrays to manage the data returned and the 
callbacks to make with said data are silly at best. This was only an initial test.
Ill probably fix the really blatent issues but this may give others some ideas..

___Test___
```
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
exif.sendCommands(['-HierarchicalSubject','-json',myFile],mycallback);

```




