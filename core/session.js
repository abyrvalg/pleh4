const CONFIG = require(APP_ROOT+"/modules/app")('config');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');
const SESSION_STORAGE_CLIENT = CONFIG.sessionStorage != 'memory' ? require('redis').createClient(process.env.REDISTOGO_URL) : (()=>{
	var sessionStorage = {};
	return{
		set(key, val, cb){
			sessionStorage[key] = val
			cb(null, {success : "ok"});
		},
		get(key, cb){
			cb(null, sessionStorage[key] || null);
		}
	}
})();
const SESSION_EXP_TIME = CONFIG.sessionExpirationTimeHours*60*60;

function setSession(req, res){
	return new Promise(resolve=>{
		let sid = getSid(32);
		res.cookie('sid', sid, {httpOnly : true, expires : new Date(Date.now() + SESSION_EXP_TIME*1000)});
		SESSION_STORAGE_CLIENT.set('session_'+sid, '{}', (err, status)=>{
			req.cookies['sid'] = sid;
			resolve(sid);
		});
	})
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

var ensureMethods = {
	auth(session){
		return !!session.getVar("currentProfile");
	}	
}
class Session {
	constructor(sid, obj){
		this.needsUpdate = false;
		this.sid = sid;
		this.json = JSON.stringify(obj);
		this.scope = obj;
	}
	setVar(key, val){
		try{
			JSON.stringify(val);
			this.scope[key] = val;
			this.needsUpdate = true;
		}
		catch(err){
			LOGGER.error("Cannot set "+key+"to session");
			LOGGER.error(err);
		}
	}
	getVar(key){
		return this.scope[key];
	}
	ensure(params){
		var params = typeof params == "string" ? [params] : params;
		for(let key in params){
			if(!ensureMethods[params[key]](this)){
				return false;
			}
		}
		return true;
	}
	updatePresistance(){
		var instance = this;
		return new Promise(resolve=>{
			if(instance.needsUpdate){
				SESSION_STORAGE_CLIENT.set("session_"+instance.sid, JSON.stringify(instance.scope), (err, status)=>{
					instance.needsUpdate = false;
					resolve();
				});
			}
			else{
				resolve();
			}
		});		
	}
}
module.exports = {
	check(req, res, next){
		if(req.cookies && req.cookies['sid']){
			SESSION_STORAGE_CLIENT.get('session_'+req.cookies['sid'], (err, data)=>{
				if(err){
					LOGGER.error("Error during gettitng session");
					LOGGER.error(err);
				}
				if(!data){
					setSession(req, res).then(()=>onSession(req, res, next));
				}
				else{
					next();
				}
			})
		}
		else{
			setSession(req, res).then(()=>onSession(req, res, next));
		}		
	},
	getSID(req){
		return req && req.cookies && req.cookies['sid'];
	},
	get(req){
		var sessionID = typeof req == "string" ? req : this.getSID(req)
		return new Promise((resolve, reject)=>{
			SESSION_STORAGE_CLIENT.get("session_"+sessionID, (err, resp)=>{
				if(err){
					reject(err);
					return;
				}
				resolve(new Session(sessionID, resp ? JSON.parse(resp) : {}));
			});
		});
	}
}
