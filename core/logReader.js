const PATH = require("path");
const LOGPATH = PATH.resolve("logs");
const CONFIG = require("./../config");
const chokidar = require("chokidar");
const LOGGER = require(APP_ROOT + "/modules/app")("logger");
const FS = require("fs");

var streams = {};
var cachedFileIndexes = [];

// Used to watch over an addition or removal of the log files
// Chokidar fires "add" events on ALL files when watching is getting started
// -----------------------------
chokidar
  .watch(LOGPATH)
  .on("add", (path, eventName) => {
    let fileName = path.match(/(?:.+\\)(.+)$/)[1];
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
  return index
    ? (type, index) => {
        //TODO: add returns for file and fileList
      }
    : null;
}

function indexFiles() {
  !FS.existsSync(LOGPATH) && FS.mkdirSync(LOGPATH);
  let files = FS.readdirSync(LOGPATH);
  files.forEach((value, index, arr) => {
    cachedFileIndexes.push({
      path: value,
      index: index,
    });
  });
  // ----- DEBUG -----
  LOGGER.debug(
    "Indexed " + cachedFileIndexes.length + " log files on startup!"
  );
  // ----- DEBUG -----
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
