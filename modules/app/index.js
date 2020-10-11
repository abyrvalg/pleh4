module.exports = (path, params)=>{
	if(path == "QL") {
		return require('./../../core/session').getVal(params, 'liteql')
	}
	if(path == 'model') {
		let modelFactory = require("./../../core/model");
		if(params && ~params.indexOf(".")){
			let cartridgeModel = params.split(".");
			try{
				var model = require("./../../cartridges/"+cartridgeModel[0]+"/models/"+cartridgeModel[1].charAt(0).toUpperCase() + cartridgeModel[1].slice(1)
				+'Model.js')
			}
			catch(e){
			}
			return Promise.resolve(model && model(require("app")));				
		}
		return params ? modelFactory.get(params) : modelFactory;
	}
	return require('./../../'+({
		'session' : 'core/session',
		'logger' : 'core/logger',
		'hook' : 'core/hook',
		'template' : 'core/template',
		'storage' : 'core/storage',		
		'configUtil' : 'core/utils/configUtil',
		'utils' : 'core/utils',
	}[path] || path));
}