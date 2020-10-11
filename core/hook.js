const CONFIG = require('./../config');
module.exports = {
	getHooks(name){
		var result = [];
		for(let key in CONFIG.cartridgePath){
			try{
				result.push(require('./../cartridges/'+CONFIG.cartridgePath[key]+'/hooks/'+name));
			}
			catch(e) {}
		}
		return result;
	}
}