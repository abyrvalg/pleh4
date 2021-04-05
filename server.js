const express = require('express');
const PATH = require('path');
global.APP_ROOT = PATH.resolve(__dirname);
const app = express();
const LiteQL = require('liteql');
const cors = require('cors');
try{
	require("dotenv").config();
}
catch(e){
	
}
global.ROOT_URL = process.env.ROOT_URL;
var	onStart = require(APP_ROOT+"/modules/app")('hook').getHooks('onServerStart'),
	onRequest = require(APP_ROOT+"/modules/app")('hook').getHooks('onRequest'),
  SESSION = require(APP_ROOT+"/modules/app")('session');
  
const CONFIG = require(APP_ROOT+"/modules/app")('config');
const LOGGER = require(APP_ROOT+"/modules/app")('logger');	
function start() {	
	const bodyParser = require('body-parser');
	app.use(require('cookie-parser')());;
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({ extended: true }));
	app.use(express.json());
	app.use(SESSION.check);
	app.use(express.static(CONFIG.staticFolder));

	app.use(function(req, res, next) {
		res.header('Access-Control-Allow-Origin', req.get('Origin') || '*');
		res.header('Access-Control-Allow-Credentials', 'true');
		res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
		res.header('Access-Control-Expose-Headers', 'Content-Length');
		res.header('Access-Control-Allow-Headers', 'Accept, Authorization, Content-Type, X-Requested-With, Range');
		if (req.method === 'OPTIONS') {
		  return res.send(200);
		} else {
		  return next();
		}
	});
	
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
			catch(e){
				LOGGER.debug(e);
			}
			if(func) {
				return func
			}
		}
		return ()=>{LOGGER.debug("resource:"+key+" is not found"); return null;}
	});

	app.all(/\w*\/data/, cors(), function(req, res){
		try{
			SESSION.get(req).catch(err=>{
				LOGGER.error("Session error");
				LOGGER.error(err);
				res.send({});
			}).then(session=>{
				var	$ = new LiteQL(),			
					query = req.query.query ? JSON.parse(req.query.query) : req.body;
					locale = req.url.match(/^\/(\w{2})\//);
				locale = locale && locale[1];
				locale = locale || CONFIG.defaultLocale;
				$.scope.session = session;
				$.scope.req = req;
				$.scope.res = res;
				$.scope.locale = locale;
				$.scope.$ = $;	
				$.call(query).then((result)=>{
					session.updatePresistance().then(()=>res.send(result));
				}).catch((e)=>{
					LOGGER.error(e);
				});
			});	
		}
		catch(e){
			LOGGER.debug(e);
			res.send({});
		}
	});

	app.get("/favicon.ico", function(req, res) {
		res.send();
	});

	app.get('*', function(req, res){
		SESSION.get(req).catch(err=>{
			LOGGER.error("Session error");
			LOGGER.error(err);
			res.send('404');
		}).then(session=>{
			var $ = new LiteQL(),
				// Removes any dots from path
				path = req.path.replace(/\./g, ''),
				// Splits the path in 2 parts:
				// 1: part before the last '/' symbol - any combination of '/', letters and/or numbers;
				// 2: last part of path without '/'. Only text symbols after it.
				match = path.match(/((?:\/\w+)+)?\/(\w+)$/),
				resultPromise,
				// Looks for language combination consisting 
				// of 2 letters (i.e. "ua" or "en") at the start of string
				// Should it really look for ANY combination of 2 letters?
				locale = req.url.match(/^\/(\w{2})\//);
			locale = locale && locale[1];
			locale = locale || CONFIG.defaultLocale;
			$.scope.session = session;
			$.scope.req = req;
			$.scope.res = res;
			$.scope.locale = locale;
			$.scope.$ = $;
			for(let key in CONFIG.cartridgePath) {
				try{
					var route = require('./cartridges/'+CONFIG.cartridgePath[key]+'/routes'+(match && match[1] || '/index'))[match && match[2] || 'index'];	
					LOGGER.debug("Path to route: " + ('./cartridges/'+CONFIG.cartridgePath[key]+'/routes'+(match && match[2] || '/index')));
					LOGGER.debug("AND trying to access " + (match && match[1] || 'index') + " from file above");
				}catch(e){
					LOGGER.debug(e);
					continue;
				}
				try{
					if(route){
						resultPromise = route({
							"req" : req,
							"res" : res,
							"session" : session,
							"$" : $
						});
						break;
					}
				}
				catch(e){
					LOGGER.error(e);
				}
			}
			if(resultPromise){
				resultPromise.then((result)=>{
					session.updatePresistance().then(()=>res.send(result));
				}).catch((e)=>{
					LOGGER.error(e);
					res.send('404');
				});
			} else {
				LOGGER.error("cannot process route: "+path);
				res.send('404');
			}
		});
			
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
require(APP_ROOT+"/modules/app")("utils", "msg").listen();
