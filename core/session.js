const CONFIG = require(APP_ROOT+"/modules/app")('config');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');
// Depending on config, if storage is set to memory then new local session storage object is created
// Else then this sets to redis session storage
const SESSION_STORAGE_CLIENT = process.env.sessionStorage != 'memory' ? require('redis').createClient(process.env.REDISTOGO_URL) : (()=>{
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
			SESSION_STORAGE_CLIENT.expireat("session_"+sid, parseInt((+new Date)/1000) + 86400);
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
	auth(session) {
		return !!session.getVar("currentProfile");
	},
	hasPermission (session, permission) {
		var profile = session.getVar("currentProfile");
		if(!profile) return false;
		for (let i = 0; i < profile.permissions.length; i++) {
			if(profile.permissions[i].name == permission) {
				return true;
			}
		}
		return false
	},
	hasRole(session, roles) {
		var profile = session.getVar("currentProfile");
		roles = roles && roles.split("|");
		if(!profile) return false;
		for (let i = 0; i<roles.length; i++) {
			let role = roles[i];
			for (let j = 0; j < profile.roles.length; j++) { 
				if(role = profile.roles[j]) {
					return true;
				}
			}
		}
		return false;
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
			let methodNameParams = params[key].split(":");
			if(!ensureMethods[methodNameParams[0]](this, methodNameParams.length > 1 ? methodNameParams[1] : null)){
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
					SESSION_STORAGE_CLIENT.expireat("session_"+instance.sid, parseInt((+new Date)/1000) + 86400);
					instance.needsUpdate = false;
					resolve();
				});
			}
			else{
				resolve();
			}
		});		
	}
	getSID(){
		return this.sid;
	}
}

module.exports = {
	check(req, res, next){
		var sid = req.cookies && req.cookies['sid'] || (req.headers.authorization && req.headers.authorization.match(/^Bearer (\w+)$/)[1]);
		if(sid){
			SESSION_STORAGE_CLIENT.get('session_'+sid, (err, data)=>{			
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
	// Transforms cookie
	getSID(req){
		return req && (req.cookies && req.cookies['sid'] || (req.headers.Authorization && req.headers.authorization.match(/^Bearer (\w+)$/)[1]));
	},
	// Base input of module
	// Returns promise with session got from the storage or
	// with an error
	get(req){
		// Assigns SID based on wether request is a string (meaning it's an SID) 
		// or is it a cookie monster (meaning the getSID() method should be called)
		var sessionID = typeof req == "string" ? req : this.getSID(req)

		// New Promise generation
		return new Promise((resolve, reject)=>{
			// Request to the storage for session
			// resp is JSON
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
