const PATH = require('path');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');

module.exports = {
	msg(category, keys, locale){
		return new Promise((resolver)=>{
			require('fs').readFile(PATH.dirname(require.main.filename)+'/cartridges/base/properties/'+category.replace(/\./g, '/')+'_'+locale+'.prop', function(err, data){
				if(err){
					LOGGER.error(err);
				}
				data = data.toString();	
				var obj = {};
				keys.forEach((key)=>{
					var msgs = data.match(new RegExp(key+'\=\.+$', 'gm'));
					msgs && msgs.forEach(msg=>{
						var keyVal = msg.split("=");
						obj[keyVal[0]] = keyVal[1];
					})
				});				
				resolver(obj);
			});
		});
	}
}