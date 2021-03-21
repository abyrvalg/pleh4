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
				console.log(e);
			}
			return Promise.resolve(model);				
		}
		return params ? modelFactory.get(params) : modelFactory;
	}
	if(path == "utils"){  //TODO: those things should be extendable by cartridges
		return require("./../../cartridges/base/utils/"+params+"Utils");
	}
	if(path == "route"){
		return require("./../../cartridges/base/routes/"+params);
	}
	return require('./../../'+({
		'session' : 'core/session',
		'logger' : 'core/logger',
		'hook' : 'core/hook',
		'template' : 'core/template',
		'storage' : 'core/storage',		
		'configUtil' : 'core/utils/configUtil'
	}[path] || path));
}