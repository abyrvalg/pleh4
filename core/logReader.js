const PATH = "./logs";
const CONFIG = require("./../config");
const FS = require("fs");

var streams = {};
var cachedFileIndexes = [];
var oldFiles = FS.readdirSync(PATH);

// Used to watch over an addition or removal of the log files
// -----------------------------
const { watch } = require("fs");

const ac = new AbortController();
// If needed, ac.abort(); can be used to stop watching over
const { signal } = ac;

watch(PATH, { signal }, (event, filename)=>{
    if(event == "rename"){
        indexFiles();
    }
})
// -----------------------------

function readLogs(type, index) {
	!FS.existsSync(PATH) && FS.mkdirSync(PATH);
	return index ? (type, index) => { 
        //TODO: add returns for file and fileList
    } : null;
}

function indexFiles(){
    let files = FS.readdirSync(PATH);
    if(files != oldFiles){
        // TODO: finish the file indexer
    }
    return;
}

module.exports = {
	// Returns array of objects where each object represent a row from logs
	// Structure of return array:
	//  [
	//      {
	//          time,
	//          text
	//      },
	//      ...
	//  ]
	// ------------
	error(index) {
		readLogs("error", index);
	},
	warn(index) {
		readLogs("warn", index);
	},
	debug(index) {
		readLogs("debug", index);
	},
	fatal(index) {
		readLogs("fatal", index);
	},
	// ------------

	// Returns array of object where each object represents a log file
	// Structure of return array:
	//  [
	//      {
	//          index(number),
	//          date
	//      },
	//      ...
	//  ]
	// ------------
	errorAll() {
		readLogs("error", null);
	},
	warnAll() {
		readLogs("warn", null);
	},
	debugAll() {
		readLogs("debug", null);
	},
	fatalAll() {
		readLogs("fatal", null);
	},
	// ------------
};
