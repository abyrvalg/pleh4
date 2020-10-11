const PATH = './logs';
const CONFIG = require('./../config');

var streams = {},
	lastDate = new Date();

function writeLog(msg, level){
	if(!~CONFIG.logLevels.indexOf(level)){
		return;
	}
	if(CONFIG.logTarget == 'file'){
		let fs = require('fs'),
			date = new Date();
			if((date - lastDate)/(1000*60*60) > 24) {
				for(let key in streams){
					streams[key].end();
				}
				streams = {};
			}
		let currentDateStr = [date.getDate(), date.getMonth()+1, date.getFullYear()].join('_');
		!fs.existsSync(PATH) && fs.mkdirSync(PATH);
		if(!streams[level+'-'+currentDateStr]){
			let path = PATH+'/'+level+'-'+currentDateStr+'.log',
				pr = new Promise((resolve, reject)=>{
					fs.stat(path, (err, stats)=>{
						var stream = fs.createWriteStream(path, {
							flags : err ? 'w' : "r+",
							autoclose : false,
							start : err ? 0 : stats.size
						});
						resolve(stream);
					});
				});
			streams[level+'-'+currentDateStr] = {
				write(msg){					
					return new Promise((resolve)=>{
						pr.then((stream)=>{
							if(msg instanceof Error) {
								msg = msg.stack || msg.message;
							}
							stream.write(Date() + '	'+':'+msg+'\n', ()=>resolve(stream));
						})
					})
				},
				end(){
					pr.then((stream)=>{
						stream.end();
					})
				}
			}			
		}
		streams[level+'-'+currentDateStr].write(msg);
	}else if(CONFIG.logTarget == "console") {
		console.log(level.toUpperCase()+':'+msg);
	}
}
module.exports = {
	error(msg){writeLog(msg, 'error')},
	warn(msg){writeLog(msg, 'warn')},
	debug(msg){writeLog(msg, 'debug')},
	fatal(msg){writeLog(msg, 'fatal')}
}