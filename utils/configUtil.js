const PATH = require('path');
const LOGGER = require('app')('logger');

module.exports = {
	msg(category, keys){
		return new Promise((resolver)=>{
			require('fs').readFile(PATH.dirname(require.main.filename)+'/properties/'+category.replace(/\./g, '/')+'.prop', function(err, data){
				if(err){
					LOGGER.error(err);
				}
				data = data.toString();	
				var obj = {};
				keys = keys.split(',');
				keys.forEach((key)=>{
					var msg = data.match(new RegExp('\^'+key+'\=\(\.+\)$'), 'm');
					obj[key] = msg && msg[1];
				});				
				resolver(obj);
			});
		});
	}
}