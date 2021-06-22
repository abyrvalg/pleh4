const CONFIG = require('./../config');
const LOGGER = require('./logger');
class AbstractModel{
	toJson(){
		return this.obj;
	}
};
module.exports = {
	get(modelName, arg, session){
        const app = require(APP_ROOT+"/modules/app");
        let promise = Promise.resolve([]);
        for(let key in CONFIG.cartridgePath){
            if(typeof window != "undefined" 
                && window.client_state 
                && window.client_state.models[modelName] 
                && !~window.client_state.models[modelName].indexOf(CONFIG.cartridgePath[key])) {
                    continue;
                }
            promise = promise.then((models)=>{			
                return app("model", CONFIG.cartridgePath[key]+"."+modelName).catch((e)=>{
                }).then((currentModel)=>{
                    if(currentModel){
                        models.push(currentModel);
                        if(models.length > 1){
                            Object.setPrototypeOf(models[length - 1], models[length - 2]);
                            Object.setPrototypeOf(models[length - 1].prototype, models[length - 1].prototype);
                        }
                    }
                    return models;
                })	
            })							
        }
        return promise.then((models)=>{
            Object.setPrototypeOf(models[models.length - 1], AbstractModel);
            Object.setPrototypeOf(models[models.length - 1].prototype, AbstractModel.prototype);
            return arg ? models[0].get(arg, session) : models[0];
        }).catch((e)=>{
            LOGGER.error(e);
        });			
	}
}