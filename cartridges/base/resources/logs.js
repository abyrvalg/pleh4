
module.exports = {
    debugList(query){
        if(!query) {
			return require(APP_ROOT+"/modules/app")("logReader").debugAll();
		}
    },
    errorList(query){
        if(!query) {
			return require(APP_ROOT+"/modules/app")("logReader").errorAll();
		}
    }
    // TODO: add returns for all possible requests
}