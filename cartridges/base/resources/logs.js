module.exports = {
  list(type){
    if(!type){
      return require(APP_ROOT + "/modules/app")("logReader").logsAll("all");
    }
    return require(APP_ROOT + "/modules/app")("logReader").logsAll(type);
  },
  file(filename){
    if(filename){
      return require(APP_ROOT + "/modules/app")("logReader").log(filename);
    }
  }
};
