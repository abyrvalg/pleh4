const PATH = require('path');
global.APP_ROOT = PATH.resolve(__dirname);
const LOGGER = require(APP_ROOT+"/modules/app")('logger');

LOGGER.debug("TEST STARTUP");
LOGGER.debug("######################################");
LOGGER.debug("Trying to require logReader...");
// Causes invokation
var logReader = require(APP_ROOT+"/modules/app")("logReader");
LOGGER.debug("logReader require successful");


