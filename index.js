const express = require('express');
const PATH = require('path');
global.APP_ROOT = PATH.resolve(__dirname);
const app = express();
const LiteQL = require('liteql');

var	onStart = require(APP_ROOT+"/modules/app")('hook').getHooks('onServerStart'),
	onRequest = require(APP_ROOT+"/modules/app")('hook').getHooks('onRequest'),
  session = require(APP_ROOT+"/modules/app")('session');
  
const CONFIG = require(APP_ROOT+"/modules/app")('config');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');	
function start() {	
	app.use(require('cookie-parser')());;
	app.use(express.json());
	app.use(session.check);
	app.use(express.static(CONFIG.staticFolder));
	
	for (let key in onRequest) {
		app.use(onRequest[key]);
	}
	
	LiteQL.setResourceMethod((key)=>{
		var match = key.match(/((?:[^_])+)??(?:\_(\w+))?$/);
		for(let i = 0; i < CONFIG.cartridgePath.length; i++){
			let func;
			try{				
				func = require('./cartridges/'+CONFIG.cartridgePath[i]+'/resources/'+(match && match[1].replace(/\./g, '/') || '/index'))[match && match[2] || 'index'];
			}
			catch(e){}
			if(func) {
				return func
			}
		}
		return ()=>{LOGGER.debug("resource:"+key+" is not found"); return null;}
	});

	app.all('/data', function(req, resp){
		try{
			var $ = session.getVal(req, 'liteql'),			
				query = req.query.query ? JSON.parse(req.query.query) : req.body,
				promise;
			if(!$) {
				$ = session.setVal(req, 'liteql', new LiteQL());
			}
			promise = $.call({'@set' : ['SID', session.getSID(req)]}).then(()=>$.call(JSON.parse(req.query.query)));
			promise.then((result)=>{
				resp.send(result)
			}).catch((e)=>{
				LOGGER.error(e);
			});
		}
		catch(e){
			LOGGER.debug(e);
			resp.send({});
		}
	});

	app.get("/favicon.ico", function(req, res) {
		res.send();
	});

	app.get('*', function(req, res){
			var $ = session.getVal(req, 'liteql') || session.setVal(req, 'liteql', new LiteQL()),
				path = req.path.replace(/\./g, ''),
				match = path.match(/((?:\/\w+)+)?\/(\w+)$/),
				resultPromise = $.call({'@set': ['SID',session.getSID(req)]});
			for(let key in CONFIG.cartridgePath) {
				try{
					var route = require('./cartridges/'+CONFIG.cartridgePath[key]+'/routes'+(match && match[1] || '/index'))[match && match[2] || 'index'];	
				}catch(e){
					LOGGER.debug(e);
					continue;
				}
				try{
					resultPromise = resultPromise.then(()=>route($, req.query, req));
					break;
				}
				catch(e){
					LOGGER.error(e);
				}
			}
			if(resultPromise){
				resultPromise.then((result)=>{
					res.send(result);
				}).catch((e)=>{
					LOGGER.error(e);
				});
			} else {
				LOGGER.error("cannot process route: "+path);
				res.send('404');
			}
	});
	app.listen(process.env.PORT || 80);
	console.log("run!");
}

if(onStart.length){
	let promise;
	for(let key in onStart){
		promise ? promise.then(()=>onStart[key]()) : (promise = new Promise((resolver)=>resolver(onStart[key]())));
	}
	promise.then(start);
}
else {
	start();
}