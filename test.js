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
LOGGER.debug("Success! Got logs object:" + JSON.stringify(logs));

let i = 2;

LOGGER.debug(
  "Trying to read file contents of file with index: " +
    logs.files[i].index +
    " and name: " +
    logs.files[i].filename
);
let content = logReader.debug(logs.files[i].index);
LOGGER.debug("Success! Got next content: " + content.filename);

i = 3;
LOGGER.debug("Trying to read file contents of file with index: " + i);
let content2 = logReader.debug(i);
LOGGER.debug("Success! Got next content: " + content.filename);
