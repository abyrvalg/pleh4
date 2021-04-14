const PATH = require("path");
const LOGPATH = PATH.resolve("logs");
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
  // Watch all files in LOGPATH
  // ignoreInitial suspends 'add' events on startup
  .watch(LOGPATH, { ignoreInitial: true })
  // When add event is called
  .on("add", (path, eventName) => {
    // Get filename of file which triggered the event
    let filename = path.match(/(?:.+\\)(.+)$/)[1];
    // Check if filename is a correct log filename
    if (!filename.match(/^(\w+)-(\d+)_(\d+)_(\d+)(?:\.\w{3})$/)) return;
    // ----- DEBUG -----
    LOGGER.debug(
      "Chokidar's add event fired! Added file with filename: " + filename
    );
    // ----- DEBUG -----
    if (
      // Check if indexer is empty
      cachedFileIndexes.length == 0 ||
      // Check if this file is not yet indexed
      !cachedFileIndexes.find((element, index, arr) => {
        return element.path == filename;
      })
    ) {
      // ----- DEBUG -----
      LOGGER.debug("Filename '" + filename + "' is not indexed yet!");
      // ----- DEBUG -----
      // Add new entry to index
      cachedFileIndexes.push({
        path: filename,
        index:
          cachedFileIndexes.length == 0
            ? 0
            : cachedFileIndexes[cachedFileIndexes.length - 1].index + 1,
      });
    }
    // ----- DEBUG -----
    else {
      LOGGER.debug("Filename '" + filename + "' is already indexed!");
    }
    // ----- DEBUG -----
  })
  // File delition event
  .on("unlink", (path) => {
    // ----- DEBUG -----
    LOGGER.debug(
      "Chokidar's unlink event fired! Removed file with next filename: " + path
    );
    // ----- DEBUG -----
    // Check if indexer is not empty
    if (cachedFileIndexes.length > 0) {
      // Get index of the unlinked file
      let index = cachedFileIndexes.findIndex((element, index, arr) => {
        return element.path == path;
      });
      // Remove entry
      if (index > 0) {
        cachedFileIndexes.splice(index, 1);
      }
    }
  });
// -----------------------------

function readLog(filename) {
  if (filename !== null) {
    // Find entry by index
    let indexEntry = cachedFileIndexes.find((value, i, arr) => {
      return filename == value.path;
    });
    // Creation of base return object
    var ret = {
      filename: "",
      lines: [],
    };
    // Check if file entry is invalid (i.e. file wasn't indexed)
    if (!indexEntry) {
      LOGGER.warn("Attempt to access not indexed file '" + filename + "'");
      return;
    }
    ret.filename = indexEntry.path;
    // ----- DEBUG -----
    LOGGER.debug(
      "Trying to read file: " + PATH.resolve(LOGPATH, indexEntry.path)
    );
    // ----- DEBUG -----
    var data;
    try {
      data = FS.readFileSync(PATH.resolve(LOGPATH, indexEntry.path), "utf-8");
    } catch (err) {
      LOGGER.error(err);
    }
    const lines = data.split(/\r?\n/);
    let buffer;
    let counter = 0;
    lines.forEach((line, index, arr) => {
      // Matches time and timezone, also checks if all symbols in the beggining belong to timestamp
      let time = line.match(/^(?:(?:\w{3}\s){2}(?:\d+\s){2}((?:\d+:?){3})\s(\w+\+\w+))/);
      // If this is a new line
      // In another words - line starts with timestamp
      if(time){
        buffer && ret.lines.push(buffer);
        buffer = {
          time: time[1],
          timezone: time[2],
          // This regex causes a bug. It treats "\t:" as an end of timestamp
          // That means if log contains that combination (which i don't think is very likely)
          // it will trim part of log before "\t:" combination
          text: [line.match(/^(?:.+\t:)(.+)/)[1]],
          index: counter++
        }
      }
      // If this is NOT a new line
      // In another words - no timestamp in line
      else{
        if(buffer) buffer.text.push(line);
        else buffer = {
          time: 'none',
          timezone: 'none',
          text: [line]
        }
      }
    });
  
    return ret;
  } else {
    LOGGER.warn("Attempt to read file with no filename provided");
    return;
  }
}

function readLogs(type) {
  var ret = {
    category: "",
    categoryCap: "",
    files: [],
  };
  ret.categoryCap = type.toUpperCase();
  ret.category = type;
  cachedFileIndexes.forEach((fileIndex, i, arr) => {
    let filename = fileIndex.path;
    let index = fileIndex.index;
    filename = filename.match(/^(\w+)-(\d+).(\d+).(\d+)(?:\.\w{3})$/);
    if (type == "all" || type == filename[1]) {
      let day = filename[2];
      let month = filename[3];
      let year = filename[4];
      ret.files.push({
        filename: filename[0],
        index: index,
        date: day + "/" + month + "/" + year,
      });
    }
  });
  return ret;
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
  log(filename) {
    return readLog(filename);
  },
  // ------------
  // Returns object with name of category and
  // an array of objects where each object represents a log file
  // Structure of return array:
  //  {
  //    category,
  //    files: [
  //        {
  //	  	      filename,
  //            index,
  //            date
  //        },
  //        ...
  //    ]
  //  }
  // ------------
  logsAll(type) {
    return readLogs(type, null);
  },
  // ------------
};
