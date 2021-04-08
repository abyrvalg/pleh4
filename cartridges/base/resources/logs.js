module.exports = {
  debugList(query) {
    if (!query) {
      return require(APP_ROOT + "/modules/app")("logReader").debugAll();
    }
  },
  errorList(query) {
    if (!query) {
      return require(APP_ROOT + "/modules/app")("logReader").errorAll();
    }
  },
  warnList(query) {
    if (!query) {
      return require(APP_ROOT + "/modules/app")("logReader").warnAll();
    }
  },
  fatalList(query) {
    if (!query) {
      return require(APP_ROOT + "/modules/app")("logReader").fatalAll();
    }
  },
  // TODO: add returns for all possible requests
};
