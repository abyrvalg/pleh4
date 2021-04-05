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
    let filename = path.match(/(?:.+\\)(.+)$/)[1];
    if (!filename.match(/^(\w+)-(\d+)_(\d+)_(\d+)(?:\.\w{3})$/)) return;
    // ----- DEBUG -----
    LOGGER.debug(
      "Chokidar's add event fired! Added file with filename: " + filename
    );
    // ----- DEBUG -----
    if (
      cachedFileIndexes.length == 0 ||
      !cachedFileIndexes.find((element, index, arr) => {
        return element.path == filename;
      })
    ) {
      // ----- DEBUG -----
      LOGGER.debug("Filename '" + filename + "' is not indexed yet!");
      // ----- DEBUG -----
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
  .on("unlink", (path) => {
    // ----- DEBUG -----
    LOGGER.debug(
      "Chokidar's unlink event fired! Removed file with next filename: " + path
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
    // Creation of base return object
    var ret = {
      filename: "",
      lines: [],
    };

    return new Promise((resolve, reject) => {
      // Check if file entry is invalid (i.e. file wasn't indexed)
      LOGGER.debug(
        "fileIndex: " + JSON.stringify(fileIndex) + "; index: " + index
      );
      if (!fileIndex) {
        reject("Attempt to access not indexed file with index '" + index + "'");
        return;
      }
      ret.filename = fileIndex.path;
      // ----- DEBUG -----
      LOGGER.debug(
        "Trying to start reading file: " + PATH.resolve(LOGPATH, fileIndex.path)
      );
      // ----- DEBUG -----
      const fileStream = FS.createReadStream(
        PATH.resolve(LOGPATH, fileIndex.path)
      );
      fileStream.on("error", (err) => {
        reject(err);
      });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      let cache;
      rl.on("line", (line) => {
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
      rl.on("close", (input) => {
        resolve(ret);
      });
    });
  } else {
    return new Promise((resolve, reject) => {
      var ret = [];
      cachedFileIndexes.forEach((fileIndex, i, arr) => {
        try {
          let filename = fileIndex.path;
          let index = fileIndex.index;
          filename = filename.match(/^(\w+)-(\d+).(\d+).(\d+)(?:\.\w{3})$/);
          if (type == filename[1]) {
            let day = filename[2];
            let month = filename[3];
            let year = filename[4];
            ret.push({
              filename: filename[0],
              index: index,
              date: day + "/" + month + "/" + year,
            });
          }
        } catch (e) {
          reject(e);
          return;
        }
      });
      resolve(ret);
    });
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
  // Returns promise which returns object with name of current file and array
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
  // Returns promise which returns array of objects
  // where each object represents a log file
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
