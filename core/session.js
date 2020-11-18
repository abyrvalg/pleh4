const CONFIG = require(APP_ROOT+"/modules/app")('config');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');
const SESSION_STORAGE_CLIENT = CONFIG.sessionStorage != 'memory' ? require('redis').createClient() : (()=>{
	var sessionStorage = {};
	return{
		set(key, val){
			sessionStorage[key] = val
		},
		get(key, cb){
			cb(null, sessionStorage[key]);
		}
	}
})();
const SESSION_EXP_TIME = CONFIG.sessionExpirationTimeHours*60*60;

var sessions = {}

function setSession(req, res){
	let sid = getSid(32);
	res.cookie('sid', sid, {httpOnly : true, expires : new Date(Date.now() + SESSION_EXP_TIME*1000)});
	SESSION_STORAGE_CLIENT.set('session_'+sid, '{}', 'EX', SESSION_EXP_TIME);
	req.cookies['sid'] = sid;
	return sid;
}

function onSession(req, res, next) {
	var onSessionHooks = require('./hook').getHooks('onSession');
	if(onSessionHooks.length){
		let promise;
		for(let key in onSessionHooks){
			promise ? promise.then(()=>onSessionHooks[key]()) : (promise = new Promise((resolver)=>resolver(onSessionHooks[key]())));
		}
		promise.then(()=>next());
	}
	else{
		next();
	}
}

function getSid(length) {
	var text = "",
		possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (var i = 0; i < length; i++)
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	return text;
}

class Session {
	constructor(sid){
		this.sid = sid;
		this.scope = new Map();
	}
	setVar(key, val){
		this.scope.set(key, val);
	}
	getVar(key){
		return this.scope.get(key);
	}
}
module.exports = {
	check(req, res, next){
		if(req.cookies && req.cookies['sid']){
			SESSION_STORAGE_CLIENT.get('session_'+req.cookies['sid'], (err, data)=>{
				if(err){
					LOGGER.error(err);
				}
				if(!data){
					let sid = setSession(req, res);
					sessions[sid] = new Session(sid);
					onSession(req, res, next);
				}
				else{
					next();
				}
			})
		}
		else{
			let sid = setSession(req, res);
			sessions[sid] = new Session(sid);
			onSession(req, res, next);
		}		
	},
	setVal(req, key, val) {
		var sid = req.cookies && req.cookies['sid'];
		if(!sid) {
			return;
		}
		sessions[sid].setVar(key, val);
		
		return val;
	},
	getVal(req, key){		
		var sid = typeof req == "string" ? req : (req && req.cookies && req.cookies['sid']);		
		if(!sid) {
			return;
		}
		return sessions[sid] && sessions[sid].getVar(key);
	},
	getSID(req){
		return req && req.cookies && req.cookies['sid'];
	},
	get(req){
		return sessions[typeof req == "string" ? req : this.getSID(req)];
	}
}
