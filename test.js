const PATH = require("path");
global.APP_ROOT = PATH.resolve(__dirname);
const LOGGER = require(APP_ROOT + "/modules/app")("logger");

LOGGER.debug("TEST STARTUP");
LOGGER.debug("######################################");
LOGGER.debug("Trying to require logReader...");
// Causes invokation
var logReader = require(APP_ROOT + "/modules/app")("logReader");
LOGGER.debug("logReader require successful");

LOGGER.debug("Trying to read logs 'debug'");
// Gets logs array object
let logs = logReader.debugAll();
logs
  .then((logs) => {
    LOGGER.debug("Success! Got logs object:" + JSON.stringify(logs));

    let i = 2;

    LOGGER.debug(
      "Trying to read file contents of file with index: " +
        logs[i].index +
        " and name: " +
        logs[i].fileName
    );
    let content = logReader.debug(logs[i].index);
    content
      .then((content) => {
        LOGGER.debug("Success! Got next content: " + content.filename);
      })
      .catch((err) => {
        LOGGER.warn(err);
      });

    i = 3;
    LOGGER.debug("Trying to read file contents of file with index: " + i);
    let content2 = logReader.debug(i);
    content2
      .then((content) => {
        LOGGER.debug("Success! Got next content: " + content.filename);
      })
      .catch((err) => {
        LOGGER.warn(err);
      });
  })
  .catch((err) => {
    LOGGER.error(err);
  });
