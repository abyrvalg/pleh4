function template(path, data){
    var template = require(APP_ROOT+"/modules/app")('template').get(path);
    return data ? template.then((tpl)=>{
        return require('handlebars').compile(tpl)(data);
    }): template
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