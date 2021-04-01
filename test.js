const PATH = require('path');
global.APP_ROOT = PATH.resolve(__dirname);
const LOGGER = require(APP_ROOT+"/modules/app")('logger');

LOGGER.debug("TEST STARTUP");
LOGGER.debug("######################################");
LOGGER.debug("Trying to require logReader...");
// Causes invokation
var logReader = require(APP_ROOT+"/modules/app")("logReader");
LOGGER.debug("logReader require successful");

LOGGER.debug("Trying to read logs 'debug'");
// Gets logs array object
let logs = logReader.debugAll();
LOGGER.debug("Success! Got logs object:" + JSON.stringify(logs));

LOGGER.debug("Trying to read file contents of file with index: " + logs[0].index + " and name: " + logs[0].fileName);
let content = logReader.debug(logs[0].index);
content.then((content) => {
    LOGGER.debug("Success! Got next content: " + JSON.stringify(content));
}).catch((err)=>{
    LOGGER.error(err);
});