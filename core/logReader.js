const PATH = require("path");
const LOGPATH = PATH.resolve("logs");
const readline = require("readline");
const chokidar = require("chokidar");
const LOGGER = require(APP_ROOT + "/modules/app")("logger");
const FS = require("fs");

var cachedFileIndexes = [];

// Index files on invoke
indexFiles();
// Used to watch over an addition or removal of the log files
// Chokidar fires "add" events on all files when watching is getting started
// -----------------------------
chokidar
  .watch(LOGPATH)
  .on("add", (path, eventName) => {
    let fileName = path.match(/(?:.+\\)(.+)$/)[1];
    if (!fileName.match(/^(\w+)-(\d+)_(\d+)_(\d+)(?:\.\w{3})$/)) return;
    // ----- DEBUG -----
    LOGGER.debug(
      "Chokidar's add event fired!" + "\n#####\n" + "fileName: " + fileName
    );
    // ----- DEBUG -----
    if (
      cachedFileIndexes.length == 0 ||
      !cachedFileIndexes.find((element, index, arr) => {
        return element.path == fileName;
      })
    ) {
      // ----- DEBUG -----
      LOGGER.debug("Filename '" + fileName + "' is not indexed yet!");
      // ----- DEBUG -----
      cachedFileIndexes.push({
        path: fileName,
        index:
          cachedFileIndexes.length == 0
            ? 0
            : cachedFileIndexes[cachedFileIndexes.length - 1].index + 1,
      });
    }
    // ----- DEBUG -----
    else {
      LOGGER.debug("Filename '" + fileName + "' is already indexed!");
    }
    // ----- DEBUG -----
  })
  .on("unlink", (path) => {
    // ----- DEBUG -----
    LOGGER.debug(
      "Chokidar's unlink event fired!" + "\n#####\n" + "path:" + path
    );
    // ----- DEBUG -----
    if (cachedFileIndexes.length > 0) {
      let index = cachedFileIndexes.findIndex((element, index, arr) => {
        return element.path == path;
      });
      if (index > 0) {
        cachedFileIndexes.splice(index, 1);
      }
    }
  });
// -----------------------------

function readLogs(type, index) {
  // If index is null -> returns list of logs
  // Else if index is set -> returns content of log file
  if (index !== null) {
    // Find entry by index
    let fileIndex = cachedFileIndexes.find((value, i, arr) => {
      return index == value.index;
    });
    // Check if file entry is invalid (file wasn't indexed)
    if (!fileIndex) {
      LOGGER.warn(
        "Attempt to access not indexed file with index '" + index + "'"
      );
      return null;
    }
    // Creation of base return object
    var ret = {
      filename: fileIndex.path,
      lines: [],
    };
    // ----- DEBUG -----
    LOGGER.debug(
      "Trying to start reading file: " + PATH.resolve(LOGPATH, fileIndex.path)
    );
    // ----- DEBUG -----
    

    return new Promise((resolve, reject)=>{
		const fileStream = FS.createReadStream(
			PATH.resolve(LOGPATH, fileIndex.path)
		  );
		  fileStream.on("error", (err)=>{
			reject(err);
		  });
		  const rl = readline.createInterface({
			input: fileStream,
			crlfDelay: Infinity,
		  });
		  let cache;
		  rl.on('line', (line) => {
			if (cache) {
			  let match = line.match(
				/^(?:(?:\w{3}\s){2}(?:\d+\s){2}((?:\d+:?){3})\s(\w+\+\w+))/
			  );
			  if (match) {
				ret.lines.push(cache);
				cache = line;
			  } else {
				cache += "\n" + line;
			  }
			} else cache = line;
		  });
		  rl.on('close', (input) => {
			  resolve(ret);
		  });
	});
  } else {
	// TODO: This thing is too easy... WHY DON'T I CONVERT IT INTO PROMISE????
	// (but i actually think that converting it to promise will make the code more consistant)
    var ret = [];
    cachedFileIndexes.forEach((fileIndex, i, arr) => {
      let fileName = fileIndex.path;
      let index = fileIndex.index;
      fileName = fileName.match(/^(\w+)-(\d+).(\d+).(\d+)(?:\.\w{3})$/);
      if (type == fileName[1]) {
        let day = fileName[2];
        let month = fileName[3];
        let year = fileName[4];
        ret.push({
          fileName: fileName[0],
          index: index,
          date: day + "-" + month + "-" + year,
        });
      }
    });
    return ret;
  }
}

function indexFiles() {
  !FS.existsSync(LOGPATH) && FS.mkdirSync(LOGPATH);
  let files = FS.readdirSync(LOGPATH);
  files.forEach((value, index, arr) => {
    if (value.match(/^(\w+)-(\d+)_(\d+)_(\d+)(?:\.\w{3})$/))
      cachedFileIndexes.push({
        path: value,
        index: index,
      });
    else LOGGER.warn("Found non-log file (or filename is incorrect): " + value);
  });
  // ----- DEBUG -----
  LOGGER.debug("Indexed " + cachedFileIndexes.length + " log files on invoke!");
  // ----- DEBUG -----
}

module.exports = {
  // Returns object with name of current file and array
  // of objects where each object represent a row
  // Structure of return array:
  //  {
  //  filename,
  //  lines:
  //  	[
  //      {
  //          time,
  //          text
  //      },
  //      ...
  //    ]
  //  }
  // ------------
  error(index) {
    return readLogs("error", index);
  },
  warn(index) {
    return readLogs("warn", index);
  },
  debug(index) {
    return readLogs("debug", index);
  },
  fatal(index) {
    return readLogs("fatal", index);
  },
  // ------------
  // Returns array of object where each object represents a log file
  // Structure of return array:
  //  [
  //      {
  //		  filename,
  //          index(number),
  //          date
  //      },
  //      ...
  //  ]
  // ------------
  errorAll() {
    return readLogs("error", null);
  },
  warnAll() {
    return readLogs("warn", null);
  },
  debugAll() {
    return readLogs("debug", null);
  },
  fatalAll() {
    return readLogs("fatal", null);
  },
  // ------------
};
