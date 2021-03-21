

var Sqrl = require('squirrelly');
const partials =  require(APP_ROOT+"/modules/app")("route", "partials");
const LOGGER = require(APP_ROOT+"/modules/app")('logger');	

var initHelpers = (()=>{
    var initted = false;
    var helpers = [];
    var lastScope = null;
    return (scope)=>{
        lastScope = scope;
        if(initted) return;
        for(let key in partials){
            try{
                Sqrl.helpers.define(key, ()=>{
                    return partials[key](lastScope);
                });
                helpers.push(key);
            }
            catch(err){
                LOGGER.error("error during defining helper"+key+" helper:")
                LOGGER.error(err);
            }
        }
        initted = true;
        return helpers;
    }
})();

function template(path, data){
    var template = require(APP_ROOT+"/modules/app")('template').get(path),
        asyncHelpers = initHelpers(this.scope);
        return data ? template.then((tpl)=>{
                return Sqrl.render(tpl, data, { async: true, asyncHelpers: asyncHelpers}).catch(err=>{
                    LOGGER.error('error during processing "'+path+'" template:')
                    LOGGER.error(err);
                    return "";
                });
        }): template;
};

module.exports = {
	msg(category, msg){
		return require(APP_ROOT+"/modules/app")('configUtil').msg(category, msg, this.scope['locale']);
	},
	template:template,
    templates(){
        var paths = arguments, 
        	result = {},
            promise = template(paths[0]).then((resp)=>{
                result[paths[0]]=resp; 
                return result;
            });
        for(let i = 1; i < paths.length; i++) {
        	promise = promise.then((result)=>template(paths[i])).then((tmpl)=>{
            	result[paths[i]] = tmpl;  
            	return result;
            });
        }
        return promise;
    }
}