const PATH = require('path');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');
const MAX_CACHE_FILE_COUNT = 10;
var props = {},
	fileNames = [];
function findProps(data, keys){
	var obj = {};	
	keys.forEach((key)=>{
		var msgs = data.match(new RegExp(key+'\=\.+$', 'gm'));
		msgs && msgs.forEach(msg=>{
			var keyVal = msg.split("=");
			obj[keyVal[0]] = keyVal[1];
		});
	});
	return obj;
}

module.exports = {
	msg(category, keys, locale){
		(typeof keys == "string") && (keys = [keys]);
		return new Promise((resolver)=>{
			var fileName = PATH.dirname(require.main.filename)+'/cartridges/base/properties/'+category.replace(/\./g, '/')+'_'+locale+'.prop';
			if(~fileNames.indexOf(fileName)){
				fileNames.sort((x, y)=>x==fileName ? -1 : y == fileName ? 1 : 0);
				resolver(findProps(props[fileName], keys));
				return;
			}			
			require('fs').readFile(fileName, function(err, data){
				if(err){
					LOGGER.error(err);
					return '';
				}
				data = data.toString();
				props[fileName] = data;
				fileNames.unshift(fileName);
				fileNames.length > MAX_CACHE_FILE_COUNT && delete props[fileNames.pop()];															
				resolver(findProps(data, keys));
			});
		});
	},
	localizeObj(obj, locale){
		var objStr = JSON.stringify(obj),
			reg = /msg\(\w+\_[\w\^\$]+\)/g,
			entities = objStr.match(reg),
			keys = {},
			promise = Promise.resolve(keys);		
		entities.forEach(entitie=>{
			let entArray = entitie.split("_"),
				category = entArray[0].substr(4, entArray[0].length - 1);
			keys[category] = keys[category] || [];
			keys[category].push(entArray[1].substr(0, entArray[1].length-1));
		});
		for(let key in keys) {
			promise = promise.then((keys)=>{
				var res = this.msg(key, keys[key].map(el=>"\^"+el+""), locale);
				return res;
			}).then(msgs=>{
				keys[key] = msgs;
				return keys;
			});
		}
		return promise.then(localized=>{
			objStr = objStr.replace(reg, (m)=>{
				var entArray = m.split("_");
				return localized[entArray[0].substr(4, entArray[0].length - 1)][entArray[1].substr(0, entArray[1].length-1)]
			});
			return JSON.parse(objStr);
		});
	}
}