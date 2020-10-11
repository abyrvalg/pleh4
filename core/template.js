const CONFIG = require('./../config');
const FS = require('fs');

var readFile = ((key)=> {
	return (path)=>{
		return new Promise((resolver)=>{
			FS.readFile('./cartridges/'+CONFIG.cartridgePath[key]+'/templates/'+path+'.hbs', (err, data)=>{
				if(key >= CONFIG.cartridgePath.length) {
					resolver(null);
					return;
				}
				if(err){
					resolver(readFile(++key)(path));
				}
				else {

					resolver(data.toString());
				}				
			});
		});
	}
});
module.exports = {
	get(path){	
		return readFile(0)(path);
	},
}